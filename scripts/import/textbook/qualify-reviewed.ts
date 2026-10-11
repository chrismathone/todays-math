/** Explicit machine qualification of newly owned inserts. No human review log is fabricated. */
import { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  reviewDigest,
  retryReviewPayloadDigest,
} from "../../../src/lib/import/schoolTextbook/qualification";

const args = process.argv.slice(2);
const value = (key: string) => {
  const at = args.indexOf(key);
  return at >= 0 ? args[at + 1] : undefined;
};
const values = (key: string) =>
  args.flatMap((arg, i) => (arg === key && args[i + 1] ? [args[i + 1]!] : []));
const kind = value("--kind"),
  packetFile = value("--packet"),
  proofFile = value("--proof"),
  renderFile = value("--render"),
  snapshotFile = value("--snapshot");
const out = resolve(
  value("--out") ?? ".qa-artifacts/textbook-qualification-20261011",
);
const apply = args.includes("--apply");
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const fileHash = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const textHash = (text: unknown) =>
  createHash("sha256").update(String(text)).digest("hex");
const save = (name: string, data: unknown) =>
  writeFileSync(join(out, name), JSON.stringify(data, null, 2) + "\n");
type Raw = Record<string, unknown> & {
  id: string;
  source: string;
  external_id: string;
  origin_problem_id: string | null;
  pool: string;
  review_status: string;
  direct_use_allowed: boolean;
};
const prisma = new PrismaClient();

async function main() {
  if (
    !["source", "retry"].includes(kind ?? "") ||
    !packetFile ||
    !proofFile ||
    !renderFile ||
    !snapshotFile ||
    !values("--owner-receipt").length
  )
    throw new Error(
      "--kind source|retry --packet --proof --render --snapshot --owner-receipt가 필요하다",
    );
  if (apply && process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error("ALLOW_SHARED_IMPORT=1이 필요하다");
  mkdirSync(out, { recursive: true });
  if (apply && existsSync(join(out, "receipt.json")))
    throw new Error("승격 영수증을 덮어쓰지 않는다. 새 --out 필요");
  const ownership = new Set<string>();
  for (const path of values("--owner-receipt")) {
    const receipt = read(path);
    for (const outcome of receipt.outcomes ?? [])
      if (outcome.state === "inserted")
        for (const id of outcome.ids ?? []) ownership.add(id);
  }
  const snapshot = read(snapshotFile) as {
    rows: { problem: Raw }[];
    children: Raw[];
  };
  const before = [
    ...snapshot.rows.map((row) => row.problem),
    ...snapshot.children,
  ];
  const packet = read(packetFile),
    proof = read(proofFile),
    render = read(renderFile);
  if (
    render.passed !== true ||
    !Array.isArray(render.checks) ||
    render.checks.length < 2 ||
    render.checks.some(
      (check: Record<string, unknown>) =>
        check.mathErrors !== 0 ||
        check.documentOverflow !== false ||
        Number(check.brokenImages) !== 0 ||
        !Array.isArray(check.contentOverflow) ||
        (check.contentOverflow as unknown[]).length,
    )
  )
    throw new Error("실제 지면 검사가 통과되지 않았다");
  let targets: Raw[];
  if (kind === "source") {
    if (
      !Array.isArray(packet.entries) ||
      !Array.isArray(proof.entries) ||
      proof.failures?.length !== 0 ||
      proof.checked !== packet.entries.length
    )
      throw new Error("원문 검산이 완료되지 않았다");
    if (
      render.checks.some(
        (check: Record<string, unknown>) =>
          check.rows !== packet.entries.length,
      )
    )
      throw new Error("원문 지면 검사 모집단 불일치");
    targets = packet.entries.map((entry: Record<string, unknown>) => {
      const row = before.find(
        (row) =>
          row.external_id === entry.id && row.source === "school_textbook",
      );
      const math = proof.entries.find(
        (item: Record<string, unknown>) => item.externalId === entry.id,
      );
      if (
        !row ||
        !ownership.has(row.id) ||
        !math?.matched ||
        math.questionSha256 !== textHash(row.content) ||
        math.answerSha256 !== textHash(row.answer) ||
        row.content !== entry.content ||
        row.answer !== entry.answer ||
        row.solution !== entry.solution
      )
        throw new Error(`${entry.id}: 원문 소유/풀이/검산 지문 불일치`);
      return row;
    });
  } else {
    const candidates = packet.candidates as Record<string, unknown>[];
    if (
      !Array.isArray(candidates) ||
      proof.candidates !== candidates.length ||
      proof.failedCandidates !== 0 ||
      proof.failures?.length !== 0 ||
      proof.candidateFileSha256 !== fileHash(packetFile)
    )
      throw new Error("변형 검산 또는 후보 파일 지문 불일치");
    if (
      render.candidatePayloadSha256 !== retryReviewPayloadDigest(candidates) ||
      render.checks.some(
        (check: Record<string, unknown>) => check.rows !== candidates.length,
      )
    )
      throw new Error("변형 지면 검사 후보/모집단 불일치");
    targets = candidates.map((candidate) => {
      const row = before.find(
        (row) =>
          row.external_id === candidate.externalId &&
          row.source === "transformed",
      );
      if (
        !row ||
        !ownership.has(row.id) ||
        row.origin_problem_id !== candidate.sourceId ||
        !/^tb-retry-v1:[a-f0-9-]+:[12]$/.test(row.external_id)
      )
        throw new Error(`${candidate.externalId}: 소유한 새 변형이 아니다`);
      for (const [camel, snake] of [
        ["content", "content"],
        ["answer", "answer"],
        ["solution", "solution"],
        ["figureSvg", "figure_svg"],
        ["figureUrls", "figure_urls"],
        ["figureDims", "figure_dims"],
        ["figureSourceMm", "figure_source_mm"],
        ["choiceFigureIndex", "choice_figure_index"],
      ])
        if (
          reviewDigest(row[snake!]) !==
          reviewDigest(candidate[camel!] ?? (camel === "figureSvg" ? null : []))
        )
          throw new Error(
            `${candidate.externalId}: 검산/지면과 저장 문안이 다르다`,
          );
      const parent = before.find(
        (original) => original.id === row.origin_problem_id,
      );
      if (
        !parent ||
        parent.source !== "school_textbook" ||
        parent.review_status !== "approved" ||
        !parent.direct_use_allowed ||
        row.unit_id !== parent.unit_id ||
        row.family_key !== parent.family_key ||
        row.source_material_id !== parent.source_material_id
      )
        throw new Error(
          `${candidate.externalId}: 원문 출제 자격 또는 연결 불일치`,
        );
      if (reviewDigest(parent) !== candidate.sourceDigest)
        throw new Error(
          `${candidate.externalId}: 검산 뒤 원문 지문이 바뀌었다`,
        );
      return row;
    });
    const groups = new Map<string, Raw[]>();
    for (const row of targets) {
      const group = groups.get(row.origin_problem_id!) ?? [];
      group.push(row);
      groups.set(row.origin_problem_id!, group);
    }
    if (
      [...groups.values()].some(
        (group) =>
          group.length !== 2 ||
          new Set(group.map((row) => row.external_id.slice(-1))).size !== 2,
      )
    )
      throw new Error("변형 두 자리가 모두 검증되지 않았다");
  }
  if (
    !targets.length ||
    new Set(targets.map((row) => row.id)).size !== targets.length ||
    targets.some(
      (row) =>
        row.pool !== "shared" ||
        row.review_status !== "pending" ||
        row.direct_use_allowed !== false,
    )
  )
    throw new Error("승격은 소유한 공유 대기 행에만 적용한다");
  const plan = {
    kind,
    mode: "machine-deterministic-review",
    checkedAt: new Date().toISOString(),
    rows: targets.length,
    packetSha256: fileHash(packetFile),
    proofSha256: fileHash(proofFile),
    renderSha256: fileHash(renderFile),
    snapshotSha256: fileHash(snapshotFile),
    ownerReceipts: values("--owner-receipt").map((path) => ({
      path,
      sha256: fileHash(path),
    })),
    entries: targets.map((row) => ({
      id: row.id,
      externalId: row.external_id,
      beforeDigest: reviewDigest(row),
    })),
  };
  save("plan.json", plan);
  console.log(
    JSON.stringify({ kind, qualifiable: targets.length, humanLogsCreated: 0 }),
  );
  if (!apply) {
    console.log("드라이런: DB 변경 없음");
    return;
  }
  const changed = await prisma.$transaction(
    async (tx) => {
      const ids = targets.map((row) => Prisma.sql`${row.id}::uuid`);
      const live = await tx.$queryRaw<{ row: Raw }[]>(
        Prisma.sql`SELECT to_jsonb(p) AS row FROM problem p WHERE p.id IN (${Prisma.join(ids)}) ORDER BY p.id FOR UPDATE`,
      );
      const byId = new Map(targets.map((row) => [row.id, row]));
      if (
        live.length !== targets.length ||
        live.some(
          ({ row }) => reviewDigest(row) !== reviewDigest(byId.get(row.id)),
        )
      )
        throw new Error(
          "문안 또는 상태가 바뀌었다. 이전 검증으로 승격하지 않는다",
        );
      if (kind === "retry") {
        const parentIds = [
          ...new Set(targets.map((row) => row.origin_problem_id!)),
        ];
        const parents = await tx.$queryRaw<{ row: Raw }[]>(
          Prisma.sql`SELECT to_jsonb(p) AS row FROM problem p WHERE p.id IN (${Prisma.join(parentIds.map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY p.id FOR SHARE`,
        );
        if (
          parents.length !== parentIds.length ||
          parents.some(
            ({ row }) =>
              reviewDigest(row) !==
              reviewDigest(before.find((parent) => parent.id === row.id)),
          )
        )
          throw new Error(
            "실제 원문이 검증 뒤 바뀌었다. 변형을 자동 승격하지 않는다",
          );
      }
      const logs = await tx.problemReviewLog.count({
        where: { problemId: { in: targets.map((row) => row.id) } },
      });
      if (logs)
        throw new Error("사람 검수 이력이 생겼다. 자동 승격하지 않는다");
      const result = await tx.problem.updateMany({
        where: {
          id: { in: targets.map((row) => row.id) },
          reviewStatus: "pending",
          directUseAllowed: false,
          pool: "shared",
        },
        data: { reviewStatus: "approved", directUseAllowed: true },
      });
      const after = await tx.problem.findMany({
        where: { id: { in: targets.map((row) => row.id) } },
      });
      if (
        result.count !== targets.length ||
        after.some(
          (row) => row.reviewStatus !== "approved" || !row.directUseAllowed,
        )
      )
        throw new Error("승격 재조회 불일치");
      return after.map((row) => ({
        id: row.id,
        externalId: row.externalId,
        reviewStatus: row.reviewStatus,
        directUseAllowed: row.directUseAllowed,
      }));
    },
    { timeout: 120000 },
  );
  save("receipt.json", {
    ...plan,
    appliedAt: new Date().toISOString(),
    before: targets,
    after: changed,
    humanLogsCreated: 0,
  });
  console.log(
    JSON.stringify({ qualified: changed.length, humanLogsCreated: 0 }),
  );
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error
        ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted]")
        : "검증 승격 실패",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
