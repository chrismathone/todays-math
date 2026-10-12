/** Repair only unreviewed inserts we own, with exact before/after math and render evidence. */
import { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  reviewDigest,
  retryReviewPayloadDigest,
} from "../../../src/lib/import/schoolTextbook/qualification";
import { validateReviewedTextbookPair } from "../../../src/lib/import/schoolTextbook/variantPairGenerators";
import type {
  TextbookVariantCandidate,
  TextbookVariantSource,
} from "../../../src/lib/import/schoolTextbook/variants";

const args = process.argv.slice(2);
const option = (key: string) => args[args.indexOf(key) + 1];
const options = (key: string) =>
  args.flatMap((arg, i) => (arg === key && args[i + 1] ? [args[i + 1]!] : []));
const read = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const hash = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");
const prisma = new PrismaClient();
async function main() {
  for (const key of [
    "--before",
    "--after",
    "--snapshot",
    "--owner-receipt",
    "--proof",
    "--render",
    "--out",
  ])
    if (!args.includes(key) || !option(key)) throw new Error(`${key} required`);
  const apply = args.includes("--apply");
  if (apply && process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error("ALLOW_SHARED_IMPORT=1 required");
  const out = resolve(option("--out"));
  mkdirSync(out, { recursive: true });
  if (existsSync(join(out, "receipt.json")))
    throw new Error("Never overwrite a repair receipt");
  const before = read(option("--before"))
    .candidates as TextbookVariantCandidate[];
  const after = read(option("--after"))
    .candidates as TextbookVariantCandidate[];
  const snapshot = read(option("--snapshot")) as {
    rows: { problem: TextbookVariantSource }[];
    children: Record<string, unknown>[];
  };
  const proof = read(option("--proof")),
    render = read(option("--render"));
  if (
    proof.candidateFileSha256 !== hash(option("--after")) ||
    proof.failedCandidates !== 0 ||
    proof.failures?.length !== 0 ||
    proof.candidates !== after.length
  )
    throw new Error("Independent math proof differs from the exact new packet");
  if (
    render.passed !== true ||
    render.candidatePayloadSha256 !==
      retryReviewPayloadDigest(
        after.map((candidate) => Object.fromEntries(Object.entries(candidate))),
      ) ||
    !Array.isArray(render.checks) ||
    render.checks.length < 2 ||
    render.checks.some(
      (check: Record<string, unknown>) =>
        check.rows !== after.length ||
        check.mathErrors !== 0 ||
        check.documentOverflow !== false ||
        check.brokenImages !== 0 ||
        !Array.isArray(check.contentOverflow) ||
        check.contentOverflow.length,
    )
  )
    throw new Error("Exact new packet must pass production paper checks");
  const owned = new Set<string>(
    options("--owner-receipt")
      .flatMap((file) => read(file).outcomes)
      .filter((x: { state: string }) => x.state === "inserted")
      .flatMap((x: { ids: string[] }) => x.ids),
  );
  const originals = new Map(
    snapshot.rows.map(({ problem }) => [problem.id, problem]),
  );
  const old = new Map(
    before.map((candidate) => [candidate.externalId, candidate]),
  );
  if (
    old.size !== before.length ||
    before.length !== after.length ||
    new Set(after.map((x) => x.externalId)).size !== after.length
  )
    throw new Error("Packet identities must remain identical and unique");
  const repairs = after.flatMap((candidate) => {
    const prior = old.get(candidate.externalId);
    if (!prior)
      throw new Error("New candidate is not in the initial insert packet");
    if (reviewDigest(prior) === reviewDigest(candidate)) return [];
    const identity = (value: TextbookVariantCandidate) =>
      Object.fromEntries(
        Object.entries(value).filter(
          ([key]) => !["answer", "solution", "validation"].includes(key),
        ),
      );
    const priorIdentity = identity(prior),
      newIdentity = identity(candidate);
    if (reviewDigest(priorIdentity) !== reviewDigest(newIdentity))
      throw new Error(
        "Display repair may only change answer/solution and their proof",
      );
    const row = snapshot.children.find(
      (x) => x.external_id === candidate.externalId,
    );
    const parent = originals.get(candidate.sourceId);
    if (
      !row ||
      !parent ||
      !owned.has(String(row.id)) ||
      row.review_status !== "pending" ||
      row.direct_use_allowed !== false ||
      row.source !== "transformed" ||
      row.origin_problem_id !== parent.id ||
      row.content !== prior.content ||
      row.answer !== prior.answer ||
      row.solution !== prior.solution ||
      row.pool !== "shared" ||
      row.user_id !== null
    )
      throw new Error("Live row is not our unchanged pending insert");
    const pair = after.filter((x) => x.sourceId === candidate.sourceId);
    if (!validateReviewedTextbookPair(parent, pair).valid)
      throw new Error("New pair does not match its current source");
    return [{ row, parent, candidate }];
  });
  if (!repairs.length) throw new Error("No repairs requested");
  const plan = {
    mode: "owned-pending-display-repair",
    rows: repairs.length,
    beforePacketSha256: hash(option("--before")),
    afterPacketSha256: hash(option("--after")),
    proofSha256: hash(option("--proof")),
    renderSha256: hash(option("--render")),
    entries: repairs.map(({ row, candidate }) => ({
      before: row,
      answer: candidate.answer,
      solution: candidate.solution,
    })),
  };
  writeFileSync(join(out, "plan.json"), JSON.stringify(plan, null, 2) + "\n");
  if (!apply) {
    console.log(JSON.stringify({ rows: repairs.length, apply: false }));
    return;
  }
  await prisma.$transaction(
    async (tx) => {
      for (const { row, parent, candidate } of repairs) {
        const live = await tx.$queryRaw<{ row: Record<string, unknown> }[]>(
          Prisma.sql`SELECT to_jsonb(p) AS row FROM problem p WHERE id=${row.id}::uuid FOR UPDATE`,
        );
        const liveParent = await tx.$queryRaw<
          { row: Record<string, unknown> }[]
        >(
          Prisma.sql`SELECT to_jsonb(p) AS row FROM problem p WHERE id=${parent.id}::uuid FOR SHARE`,
        );
        if (
          reviewDigest(live[0]?.row) !== reviewDigest(row) ||
          reviewDigest(liveParent[0]?.row) !== reviewDigest(parent)
        )
          throw new Error("Concurrent row/source change; nothing overwritten");
        if (
          await tx.problemReviewLog.count({
            where: { problemId: String(row.id) },
          })
        )
          throw new Error("Human review exists; preserve it");
        await tx.problem.update({
          where: { id: String(row.id) },
          data: { answer: candidate.answer, solution: candidate.solution },
        });
        const result = await tx.problem.findUniqueOrThrow({
          where: { id: String(row.id) },
        });
        if (
          result.answer !== candidate.answer ||
          result.solution !== candidate.solution ||
          result.reviewStatus !== "pending" ||
          result.directUseAllowed
        )
          throw new Error("Repair readback mismatch");
      }
    },
    { timeout: 60000 },
  );
  writeFileSync(
    join(out, "receipt.json"),
    JSON.stringify(
      {
        ...plan,
        completedAt: new Date().toISOString(),
        humanReviewLogsCreated: 0,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ rows: repairs.length, apply: true }));
}
main()
  .catch((error) => {
    console.error(
      String(error.message).replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]"),
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
