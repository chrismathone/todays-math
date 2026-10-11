/** Explicit independent-reasoning qualification; old deterministic qualification remains separate. */
import { Prisma, PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import type {
  DbRetryCandidate,
  DbRetryOrigin,
} from "../../../src/lib/import/schoolTextbook/dbRetry.types";
import type { CodexDbRetryBatchReview } from "../../../src/lib/import/schoolTextbook/codexRetryBatch.types";

import { loadDbRetryFigures } from "../../../src/lib/import/schoolTextbook/dbRetryFigures";

import { prepareCodexRetryBatchQualification } from "../../../src/lib/import/schoolTextbook/codexRetryBatchQualification";
import { reviewDigest } from "../../../src/lib/import/schoolTextbook/qualification";
import type { TextbookVariantSource } from "../../../src/lib/import/schoolTextbook/variants";

const args = process.argv.slice(2);
const value = (flag: string) => args[args.indexOf(flag) + 1];
const values = (flag: string) =>
  args.flatMap((arg, index) =>
    arg === flag && args[index + 1] ? [args[index + 1]!] : [],
  );
const read = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const hash = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");
const prisma = new PrismaClient();
type Raw = Record<string, unknown>;
async function main() {
  const packetFile = value("--packet"),
    reviewsFile = value("--reviews"),
    renderFile = value("--render"),
    output = value("--out");
  if (
    !["--packet", "--reviews", "--render", "--out"].every((flag) =>
      args.includes(flag),
    ) ||
    !packetFile ||
    !reviewsFile ||
    !renderFile ||
    !output ||
    !values("--owner-receipt").length
  )
    throw new Error(
      "--packet --reviews --render --out --owner-receipt required",
    );
  const apply = args.includes("--apply"),
    out = resolve(output);
  if (apply && process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error("ALLOW_SHARED_IMPORT=1 required");
  if (apply && existsSync(join(out, "receipt.json")))
    throw new Error("Existing receipt protected");
  const candidates = read(packetFile).candidates as DbRetryCandidate[];
  const reviewPacket = read(reviewsFile);
  const reviews = (
    Array.isArray(reviewPacket) ? reviewPacket : reviewPacket.batches
  ) as CodexDbRetryBatchReview[];
  const render = read(renderFile);
  if (
    !Array.isArray(candidates) ||
    !Array.isArray(reviews) ||
    !candidates.length
  )
    throw new Error("Empty or malformed packet");
  if (!args.includes("--receipt-root") || !value("--receipt-root"))
    throw new Error("--receipt-root required");
  const receiptRoot = resolve(value("--receipt-root"));
  if (!args.includes("--generation-dir") || !value("--generation-dir"))
    throw new Error("--generation-dir required");
  const generationRoot = resolve(value("--generation-dir"));
  const ownedIds = new Set<string>();
  for (const file of values("--owner-receipt")) {
    const receipt = read(file);
    if (receipt.state === "inserted" && receipt.receipt?.ownedIds)
      for (const id of receipt.receipt.ownedIds) ownedIds.add(id);
    for (const outcome of receipt.outcomes ?? [])
      if (outcome.state === "inserted")
        for (const id of outcome.ids ?? []) ownedIds.add(id);
  }
  const sourceIds = [
    ...new Set(
      reviews.flatMap((review) =>
        review.inputBindings.map((binding) => binding.sourceId),
      ),
    ),
  ];
  const sources = await prisma.$queryRaw<
    {
      problem: TextbookVariantSource;
      grade: string;
      chapter: string;
      section: string;
    }[]
  >(Prisma.sql`
    SELECT to_jsonb(p) AS problem,u.grade,u.chapter,u.section FROM problem p JOIN unit u ON u.id=p.unit_id
    WHERE p.id IN (${Prisma.join(sourceIds.map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY p.id`);
  const allOrigins: DbRetryOrigin[] = sources.map((row) => ({
    problem: row.problem,
    grade: row.grade,
    chapter: row.chapter,
    section: row.section,
  }));
  const stored = (
    await prisma.$queryRaw<{ row: Raw }[]>(Prisma.sql`
    SELECT to_jsonb(p) AS row FROM problem p WHERE p.external_id IN (${Prisma.join(candidates.map((candidate) => candidate.externalId))}) AND p.source='transformed' ORDER BY p.id`)
  ).map(({ row }) => row);
  const selectedSources = new Set(candidates.map((c) => c.sourceId));
  const origins = allOrigins.filter((origin) =>
    selectedSources.has(origin.problem.id),
  );
  const batches = [];
  for (const review of reviews) {
    const inputs = [];
    for (const binding of review.inputBindings) {
      const origin = allOrigins.find((o) => o.problem.id === binding.sourceId);
      if (!origin) throw new Error("Batch original missing");
      const checkpoint = read(
        join(generationRoot, "sources", binding.sourceId + ".json"),
      );
      const pair = checkpoint.pair?.candidates as DbRetryCandidate[];
      if (!Array.isArray(pair) || pair.length !== 2)
        throw new Error("Batch pair missing");
      inputs.push({
        origin,
        candidates: pair,
        sourceFigures: await loadDbRetryFigures(origin.problem),
        candidateFigures: await Promise.all(
          pair.map((c) => loadDbRetryFigures(c)),
        ),
      });
    }
    batches.push({ review, inputs, artifactRoot: receiptRoot });
  }
  const plan = prepareCodexRetryBatchQualification({
    origins,
    candidates,
    batches,
    stored,
    ownedIds,
    render,
  });
  mkdirSync(out, { recursive: true });
  const manifest = {
    ...plan,
    checkedAt: new Date().toISOString(),
    humanLogsCreated: 0,
    packetFileHash: hash(packetFile),
    reviewsFileHash: hash(reviewsFile),
    renderFileHash: hash(renderFile),
    ownerReceipts: values("--owner-receipt").map((file) => ({
      file,
      hash: hash(file),
    })),
  };
  writeFileSync(
    join(out, "plan.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      pairs: plan.pairs,
      rows: plan.ids.length,
      apply,
      proofKind: plan.proofKind,
    }),
  );
  if (!apply) return;
  const after = await prisma.$transaction(
    async (tx) => {
      const parents = await tx.$queryRaw<{ row: Raw }[]>(Prisma.sql`
      SELECT to_jsonb(p) AS row FROM problem p WHERE p.id IN (${Prisma.join(sourceIds.map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY p.id FOR SHARE`);
      const current = await tx.$queryRaw<{ row: Raw }[]>(Prisma.sql`
      SELECT to_jsonb(p) AS row FROM problem p WHERE p.id IN (${Prisma.join(plan.ids.map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY p.id FOR UPDATE`);
      const bySource = new Map(
        allOrigins.map((origin) => [origin.problem.id, origin.problem]),
      );
      const byId = new Map(plan.before.map((row) => [row.id, row]));
      if (
        parents.length !== allOrigins.length ||
        parents.some(
          ({ row }) =>
            reviewDigest(row) !== reviewDigest(bySource.get(String(row.id))),
        ) ||
        current.length !== plan.ids.length ||
        current.some(
          ({ row }) => reviewDigest(row) !== reviewDigest(byId.get(row.id)),
        )
      )
        throw new Error("Source or stored row changed after verification");
      const logs = await tx.problemReviewLog.count({
        where: { problemId: { in: plan.ids } },
      });
      if (logs) throw new Error("Human review history protected");
      const changed = await tx.problem.updateMany({
        where: {
          id: { in: plan.ids },
          pool: "shared",
          reviewStatus: "pending",
          directUseAllowed: false,
        },
        data: { reviewStatus: "approved", directUseAllowed: true },
      });
      if (changed.count !== plan.ids.length)
        throw new Error("Atomic qualification mismatch");
      return tx.problem.findMany({
        where: { id: { in: plan.ids } },
        select: {
          id: true,
          externalId: true,
          reviewStatus: true,
          directUseAllowed: true,
        },
      });
    },
    { timeout: 120000 },
  );
  if (
    after.some(
      (row) => row.reviewStatus !== "approved" || !row.directUseAllowed,
    )
  )
    throw new Error("Qualification reread mismatch");
  writeFileSync(
    join(out, "receipt.json"),
    JSON.stringify(
      { ...manifest, appliedAt: new Date().toISOString(), after },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      qualified: after.length,
      proofKind: plan.proofKind,
      humanLogsCreated: 0,
    }),
  );
}
main()
  .catch((error: unknown) => {
    console.error(
      JSON.stringify({
        status: "failed",
        name: error instanceof Error ? error.name : "unknown",
        reason:
          error instanceof Error &&
          !/postgres|api_key|base64|https?:\/\//i.test(error.message)
            ? error.message
            : "qualification failed",
      }),
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
