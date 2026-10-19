/**
 * 475 held textbook rows: explicit drafts -> checked plan -> guarded application.
 * Default is a local dry-run. --apply requires ALLOW_SHARED_IMPORT=1.
 * Corrections keep the hold; rewrites become pending transformed rows.
 * A correction also locks the source's open designated retry slots (`tb-retry-v1:…`) in the
 * same transaction — they were verified against the pre-correction text (`designatedSlotLocks.ts`).
 * Never writes ProblemReviewLog or fabricates a person's approval.
 */
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";
import {
  matchesRecoveredRow,
  prepareRecovery,
  recoveryCandidateSchema,
  recoveryFingerprint,
  type PreparedRecovery,
  type RecoveryAsset,
  type RecoverySnapshot,
} from "../../../src/lib/import/schoolTextbook/recovery";
import {
  findDesignatedSlotRows,
  lockDesignatedSlotsArgs,
  planDesignatedSlotLocks,
  slotBreakingReason,
} from "../../../src/lib/import/schoolTextbook/designatedSlotLocks";
import { readImageDimensions } from "../../../src/lib/printImageDimensions";

const root = process.cwd();
const args = process.argv.slice(2);
const flag = (key: string, fallback: string) => {
  const at = args.indexOf(key);
  return at < 0 ? fallback : (args[at + 1] ?? fallback);
};
const draftDir = path.resolve(
  root,
  flag("--drafts", "scripts/import/textbook/recovery-20261009"),
);
const out = path.resolve(
  root,
  flag("--out", ".qa-artifacts/textbook-recovery-apply-20261009"),
);
const snapshotFile = path.resolve(
  root,
  flag("--snapshot", ".qa-artifacts/textbook-recovery-live-20261009.json"),
);
const only = flag("--batch", "");
const apply = args.includes("--apply");

function json(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}
function save(name: string, value: unknown) {
  writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + "\n");
}

function inspectAsset(url: string): RecoveryAsset {
  if (
    !/^\/figures\/[a-zA-Z0-9_./-]+\.(png|jpe?g|svg)$/.test(url) ||
    url.includes("..")
  )
    throw new Error(`허용되지 않은 그림 경로: ${url}`);
  const publicRoot = path.resolve(root, "public");
  const file = path.resolve(publicRoot, `.${url}`);
  if (!file.startsWith(publicRoot + path.sep))
    throw new Error("그림 경로가 public 밖이다");
  const bytes = readFileSync(file);
  let dimensions = readImageDimensions(bytes);
  if (url.endsWith(".svg")) {
    const svg = bytes.toString("utf8");
    if (
      /<(?:script|foreignObject)\b|\bon[a-z]+\s*=|(?:href|src)\s*=\s*["'](?:https?:|data:|javascript:)/i.test(
        svg,
      )
    )
      throw new Error(`활성 또는 외부 SVG 내용: ${url}`);
    const tag = svg.match(/<svg\b[^>]*>/i)?.[0] ?? "";
    const width = Number(tag.match(/\bwidth=["']([0-9.]+)(?:px)?["']/)?.[1]);
    const height = Number(tag.match(/\bheight=["']([0-9.]+)(?:px)?["']/)?.[1]);
    if (
      Number.isInteger(width) &&
      Number.isInteger(height) &&
      width > 0 &&
      height > 0
    )
      dimensions = { width, height };
  }
  if (!dimensions) throw new Error(`그림 치수를 읽을 수 없다: ${url}`);
  return {
    ...dimensions,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function main() {
  mkdirSync(out, { recursive: true });
  const snapshot = json(snapshotFile) as {
    capturedAt: string;
    rows: RecoverySnapshot[];
  };
  const expected = (
    json(
      path.join(
        root,
        "docs/planning/tracks/reports/textbook-recovery-review-20261009/triage.json",
      ),
    ) as { entries: { problemCode: string }[] }
  ).entries;
  if (
    snapshot.rows.length !== 475 ||
    new Set(snapshot.rows.map((row) => row.problemCode)).size !== 475
  )
    throw new Error("475개 고유 원본 스냅샷이 필요하다");
  const source = new Map(snapshot.rows.map((row) => [row.problemCode, row]));
  if (expected.some((entry) => !source.has(entry.problemCode)))
    throw new Error("검토 목록과 원본 스냅샷 불일치");
  const files = only
    ? [only]
    : ["corrections-a.json", "corrections-b.json", "rewrites.json"];
  const candidates = files.flatMap((file) => {
    const batch = json(path.join(draftDir, file)) as {
      version: number;
      entries: unknown[];
    };
    if (batch.version !== 1 || !Array.isArray(batch.entries))
      throw new Error(`잘못된 복구 묶음: ${file}`);
    return batch.entries.map((entry) => recoveryCandidateSchema.parse(entry));
  });
  if (
    new Set(candidates.map((entry) => entry.problemCode)).size !==
    candidates.length
  )
    throw new Error("문항이 두 복구 묶음에 중복되어 있다");
  if (
    !only &&
    (candidates.length !== 475 ||
      expected.some(
        (entry) =>
          !candidates.some(
            (candidate) => candidate.problemCode === entry.problemCode,
          ),
      ))
  )
    throw new Error("475문항 전부의 처리 결과가 필요하다");
  const assets = new Map<string, RecoveryAsset>();
  const patches: PreparedRecovery[] = [];
  const held: { problemCode: string; reason: string }[] = [];
  for (const candidate of candidates) {
    const before = source.get(candidate.problemCode);
    if (!before) throw new Error(`검토 범위 밖 문항: ${candidate.problemCode}`);
    if (candidate.kind === "blocked") {
      held.push({
        problemCode: candidate.problemCode,
        reason: candidate.remainingIssues.join(" / ") || candidate.notes,
      });
      continue;
    }
    try {
      for (const url of candidate.figureUrls)
        if (!assets.has(url)) assets.set(url, inspectAsset(url));
      patches.push(prepareRecovery(before, candidate, assets));
    } catch (error) {
      held.push({
        problemCode: candidate.problemCode,
        reason: error instanceof Error ? error.message : "복구본 검사 실패",
      });
    }
  }
  const plan = {
    version: 1,
    capturedAt: snapshot.capturedAt,
    createdAt: new Date().toISOString(),
    total: candidates.length,
    patches,
    held,
  };
  const summary = {
    total: candidates.length,
    correction: patches.filter((p) => p.kind === "correction").length,
    rewrite: patches.filter((p) => p.kind === "rewrite").length,
    unchanged: patches.filter((p) => p.kind === "unchanged").length,
    held: held.length,
  };
  save("plan.json", plan);
  save("summary.json", summary);
  console.log(JSON.stringify(summary));
  if (!apply) {
    console.log("드라이런: DB 변경 없음");
    return;
  }
  if (process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error("공유 DB 변경에는 ALLOW_SHARED_IMPORT=1이 필요하다");
  if (only) throw new Error("실제 적용은 전체475문항 계획으로만 실행한다");
  // A local image is not evidence that the shared database can use its URL.
  // Verify every intended public byte before opening a write transaction.
  if (assets.size) {
    const manifestFile = path.join(
      root,
      "src/config/shared-figures.manifest.json",
    );
    const manifest = json(manifestFile) as {
      entries: Record<string, { objectPath: string; sha256: string }>;
    };
    const receipt = json(
      path.join(root, "src/config/shared-figures.receipt.json"),
    ) as { publicBaseUrl: string; status: string; manifestSha256: string };
    if (
      receipt.status !== "verified" ||
      receipt.manifestSha256 !==
        createHash("sha256")
          .update(readFileSync(manifestFile, "utf8").replace(/\r\n/g, "\n"))
          .digest("hex")
    )
      throw new Error("공유 그림 배포 목록과 검증 기록이 일치하지 않는다");
    const origin = new URL(receipt.publicBaseUrl + "/");
    if (
      origin.protocol !== "https:" ||
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash
    )
      throw new Error(
        "그림 검증에는 자격 증명이 없는 HTTPS 서비스 origin이 필요하다",
      );
    const pendingAssets = [...assets.entries()];
    const publicChecks: { url: string; matches: boolean; status?: number }[] =
      [];
    await Promise.all(
      Array.from({ length: Math.min(6, pendingAssets.length) }, async () => {
        for (;;) {
          const next = pendingAssets.pop();
          if (!next) return;
          const [url, asset] = next;
          const published = manifest.entries[url];
          if (!published || published.sha256 !== asset.sha256) {
            publicChecks.push({ url, matches: false });
            continue;
          }
          try {
            const response = await fetch(
              new URL(published.objectPath, origin),
              {
                signal: AbortSignal.timeout(15000),
                redirect: "error",
              },
            );
            const matches =
              response.ok &&
              createHash("sha256")
                .update(Buffer.from(await response.arrayBuffer()))
                .digest("hex") === asset.sha256;
            publicChecks.push({ url, matches, status: response.status });
          } catch {
            publicChecks.push({ url, matches: false });
          }
        }
      }),
    );
    save("public-assets.json", {
      checkedAt: new Date().toISOString(),
      publicBaseUrl: receipt.publicBaseUrl,
      checks: publicChecks,
    });
    const missing = new Set(
      publicChecks.filter((check) => !check.matches).map((check) => check.url),
    );
    for (let index = patches.length - 1; index >= 0; index--) {
      const patch = patches[index]!;
      if (patch.after.figureUrls.some((url) => missing.has(url))) {
        held.push({
          problemCode: patch.problemCode,
          reason: "운영 주소의 그림 바이트를 확인하지 못해 DB 적용 보류",
        });
        patches.splice(index, 1);
      }
    }
    save("plan.json", plan);
    save("summary.json", {
      ...summary,
      applicableAfterAssetCheck: patches.length,
      held: held.length,
    });
  }
  if (held.length && !args.includes("--allow-unresolved"))
    throw new Error(
      "미해결 문항이 있다. 해결된 문항만 적용하려면 --allow-unresolved를 명시한다",
    );
  const receiptFile = path.join(out, "receipt.json");
  if (existsSync(receiptFile) && !args.includes("--resume"))
    throw new Error("기존 적용 기록이 있다. 새 out 또는 --resume이 필요하다");
  // Save the complete before image before the first write; never replace it on retry.
  if (!existsSync(path.join(out, "before.json"))) save("before.json", snapshot);
  const ledger = (
    existsSync(receiptFile)
      ? json(receiptFile)
      : { startedAt: new Date().toISOString(), outcomes: [] }
  ) as {
    startedAt: string;
    outcomes: {
      problemCode: string;
      id?: string;
      result: string;
      note?: string;
    }[];
  };
  const prisma = new PrismaClient({ log: [] });
  try {
    for (const patch of patches) {
      const original = source.get(patch.problemCode)!;
      if (patch.kind === "unchanged") continue;
      // A local asset may have changed since plan preparation.
      for (const [url, asset] of Object.entries(patch.assets))
        if (inspectAsset(url).sha256 !== asset.sha256)
          throw new Error(`계획 뒤 그림이 바뀌었다: ${url}`);
      const outcome = await prisma.$transaction(
        async (tx) => {
          // A row lock closes the gap between fingerprint comparison and mutation.
          await tx.$queryRaw`SELECT id FROM problem WHERE id = ${original.id}::uuid FOR UPDATE`;
          const now = await tx.problem.findUniqueOrThrow({
            where: { id: original.id },
          });
          if (patch.kind === "correction" && matchesRecoveredRow(now, patch))
            return {
              problemCode: patch.problemCode,
              id: now.id,
              result: "already-applied",
            };
          if (recoveryFingerprint(now) !== patch.beforeFingerprint)
            return {
              problemCode: patch.problemCode,
              result: "conflict",
              note: "검토 이후 내용 또는 상태가 바뀌어 보존했다",
            };
          if (patch.kind === "correction") {
            const corrected = await tx.problem.update({
              where: { id: now.id },
              data: patch.after,
            });
            // 원문을 고치면 그 원문의 열린 지정 두 슬롯(복습 변형)도 같은 트랜잭션에서 잠근다 — 변형은 고치기 전 원문으로
            // 검산됐다. 다시 여는 것은 대응을 다시 검증한 뒤다(`designatedSlotLocks.ts` · 문제은행 P0 2026-10-14).
            const reason = slotBreakingReason(now, corrected);
            const locks = reason
              ? planDesignatedSlotLocks(
                  new Map([[now.id, reason]]),
                  await findDesignatedSlotRows(tx, [now.id]),
                )
              : [];
            const lockedSlots = locks.length
              ? (await tx.problem.updateMany(lockDesignatedSlotsArgs(locks)))
                  .count
              : 0;
            return {
              problemCode: patch.problemCode,
              id: now.id,
              result: "corrected-held",
              ...(lockedSlots
                ? { note: `지정 변형 ${lockedSlots}개를 함께 잠갔다` }
                : {}),
            };
          }
          const existing = await tx.problem.findUnique({
            where: { externalId: patch.externalId },
          });
          if (existing) {
            if (
              existing.originProblemId !== now.id ||
              existing.source !== "transformed" ||
              !matchesRecoveredRow(existing, patch)
            )
              throw new Error(
                `기존 변형본과 복구 계획이 다르다: ${patch.problemCode}`,
              );
            return {
              problemCode: patch.problemCode,
              id: existing.id,
              result: "already-created",
            };
          }
          const data: Prisma.ProblemUncheckedCreateInput = {
            ...patch.after,
            id: randomUUID(),
            unitId: now.unitId,
            source: "transformed",
            originProblemId: now.id,
            familyKey: now.familyKey,
            externalId: patch.externalId,
            difficulty: now.difficulty,
            problemType: now.problemType,
            pool: "shared",
          };
          // exam-wiring: 기출아님 — 잠긴 교과서 문항의 변형(source=transformed)만 넣는다.
          const created = await tx.problem.create({ data });
          return {
            problemCode: patch.problemCode,
            id: created.id,
            result: "created-pending",
          };
        },
        { timeout: 15000 },
      );
      ledger.outcomes.push(outcome);
      save("receipt.json", ledger);
    }
    const rows = await prisma.problem.findMany({
      where: {
        OR: [
          { id: { in: snapshot.rows.map((r) => r.id) } },
          {
            externalId: {
              in: patches
                .filter((p) => p.kind === "rewrite")
                .map((p) => p.externalId),
            },
          },
        ],
      },
    });
    save("after.json", { checkedAt: new Date().toISOString(), rows });
    const actual = new Map(rows.map((row) => [row.id, row]));
    const latest = new Map(
      ledger.outcomes.map((outcome) => [outcome.problemCode, outcome]),
    );
    const readbackErrors: string[] = [];
    for (const patch of patches) {
      const outcome = latest.get(patch.problemCode);
      if (!outcome?.id || outcome.result === "conflict") continue;
      const row = actual.get(outcome.id);
      if (!row || !matchesRecoveredRow(row, patch))
        readbackErrors.push(patch.problemCode);
    }
    save("verification.json", {
      checkedAt: new Date().toISOString(),
      readbackErrors,
      originalsStillHeld: snapshot.rows.every(
        (row) => actual.get(row.id)?.directUseAllowed === false,
      ),
    });
    if (readbackErrors.length)
      throw new Error(`저장 후 내용 불일치: ${readbackErrors.join(", ")}`);
    const counts: Record<string, number> = {};
    for (const outcome of latest.values())
      counts[outcome.result] = (counts[outcome.result] ?? 0) + 1;
    console.log(
      JSON.stringify({
        applied: counts,
        originalsStillHeld: rows.filter(
          (r) => source.has(r.problemCode) && !r.directUseAllowed,
        ).length,
        pendingVariants: rows.filter(
          (r) =>
            r.source === "transformed" &&
            r.reviewStatus === "pending" &&
            !r.directUseAllowed,
        ).length,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Database errors can contain connection details; only our validation messages are printed.
  const name = error instanceof Error ? error.name : "Error";
  console.error(
    name.startsWith("Prisma")
      ? `${name}: 데이터베이스 작업 실패`
      : error instanceof Error
        ? error.message
        : "복구 작업 실패",
  );
  process.exitCode = 1;
});
