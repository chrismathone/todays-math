/** Read-only DB review with durable per-source model evidence; default invocation makes no model call. */
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type {
  DbRetryCandidate,
  DbRetryPairReview,
} from "../../../src/lib/import/schoolTextbook/dbRetry.types";
import { loadDbRetryFigures } from "../../../src/lib/import/schoolTextbook/dbRetryFigures";
import {
  DB_RETRY_REVIEW_VERSION,
  dbRetryReviewBinding,
  reviewDbRetryPair,
} from "../../../src/lib/import/schoolTextbook/dbRetryReview";
import { reviewDigest } from "../../../src/lib/import/schoolTextbook/qualification";
import {
  atomicDbRetryJson,
  runDbRetryBounded,
} from "../../import/textbook/db-retry-20261011/checkpoint";
import { readLiveDbRetryOrigin } from "../../import/textbook/db-retry-20261011/insert";
const args = process.argv.slice(2);
const value = (flag: string) =>
  args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const prisma = new PrismaClient();
async function main() {
  const input = value("--packet"),
    output = value("--out");
  if (!input || !output)
    throw new Error("--packet --out [--review --concurrency 1..8] required");
  const candidates = JSON.parse(readFileSync(input, "utf8"))
    .candidates as DbRetryCandidate[];
  if (!Array.isArray(candidates) || !candidates.length)
    throw new Error("Empty candidate packet");
  const groups = new Map<string, DbRetryCandidate[]>();
  for (const candidate of candidates) {
    const group = groups.get(candidate.sourceId) ?? [];
    group.push(candidate);
    groups.set(candidate.sourceId, group);
  }
  if (
    [...groups.values()].some(
      (pair) =>
        pair.length !== 2 ||
        ![1, 2].every((slot) => pair.some((c) => c.slot === slot)),
    )
  )
    throw new Error("Incomplete candidate pair");
  const concurrency = Number(value("--concurrency") ?? "2");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8)
    throw new Error("Invalid concurrency");
  console.log(
    JSON.stringify({
      pairs: groups.size,
      candidates: candidates.length,
      review: args.includes("--review"),
      databaseWrites: false,
      concurrency,
    }),
  );
  if (!args.includes("--review")) return;
  const out = resolve(output);
  mkdirSync(join(out, "sources"), { recursive: true });
  const reviews: DbRetryPairReview[] = [];
  const failures: { sourceId: string; reason: string }[] = [];
  let providerBlocked = false;
  await runDbRetryBounded(
    [...groups],
    concurrency,
    async ([sourceId, unsorted]) => {
      if (providerBlocked) {
        failures.push({ sourceId, reason: "not-reviewed-provider-balance" });
        return;
      }
      const pair = [...unsorted].sort((a, b) => a.slot - b.slot) as [
        DbRetryCandidate,
        DbRetryCandidate,
      ];
      try {
        const origin = await readLiveDbRetryOrigin(prisma, sourceId);
        const sourceFigures = await loadDbRetryFigures(origin.problem);
        const candidateFigures = await Promise.all(
          pair.map((candidate) => loadDbRetryFigures(candidate)),
        );
        const binding = dbRetryReviewBinding(
          origin,
          pair,
          sourceFigures,
          candidateFigures,
        );
        const path = join(out, "sources", `${sourceId}.json`);
        let review: DbRetryPairReview;
        if (existsSync(path)) {
          review = JSON.parse(readFileSync(path, "utf8"));
          if (
            review.version !== DB_RETRY_REVIEW_VERSION ||
            review.bindingDigest !== binding.bindingDigest ||
            review.candidatePayloadDigest !== reviewDigest(pair)
          )
            throw new Error("cached-review-changed");
        } else {
          review = await reviewDbRetryPair(
            origin,
            pair,
            sourceFigures,
            candidateFigures,
          );
          atomicDbRetryJson(path, review);
        }
        reviews.push(review);
        if (review.communications.some((call) => call.httpStatus === 402))
          providerBlocked = true;
        console.log(
          JSON.stringify({
            sourceId,
            passed: review.passed,
            issues: review.issues,
            calls: review.communications.length,
            tokens: review.communications.reduce(
              (sum, call) =>
                sum + (call.inputTokens ?? 0) + (call.outputTokens ?? 0),
              0,
            ),
            databaseWrites: false,
          }),
        );
      } catch (error) {
        const reason =
          error instanceof Error && /^[a-z][a-z-]{1,100}$/.test(error.message)
            ? error.message
            : "review-operation-failed";
        failures.push({ sourceId, reason });
        console.log(
          JSON.stringify({
            sourceId,
            passed: false,
            reason,
            databaseWrites: false,
          }),
        );
      }
    },
  );
  reviews.sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const accepted = reviews.filter((review) => review.passed);
  const acceptedIds = new Set(accepted.map((review) => review.sourceId));
  atomicDbRetryJson(join(out, "reviews.json"), { reviews, failures });
  atomicDbRetryJson(join(out, "accepted-reviews.json"), { reviews: accepted });
  atomicDbRetryJson(join(out, "accepted-packet.json"), {
    candidates: candidates.filter((candidate) =>
      acceptedIds.has(candidate.sourceId),
    ),
  });
  atomicDbRetryJson(join(out, "accepted-source-ids.json"), [...acceptedIds]);
  const summary = {
    checkedAt: new Date().toISOString(),
    pairs: groups.size,
    passedPairs: accepted.length,
    rejectedPairs: reviews.length - accepted.length,
    operationFailures: failures.length,
    providerBlocked,
    databaseWrites: false,
  };
  atomicDbRetryJson(join(out, "summary.json"), summary);
  console.log(JSON.stringify(summary));
  if (failures.length) process.exitCode = 1;
}
main()
  .catch((error: unknown) => {
    console.error(
      JSON.stringify({
        name: error instanceof Error ? error.name : "unknown",
        status: "review-failed",
      }),
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
