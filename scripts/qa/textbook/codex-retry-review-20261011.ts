/** Review existing drafts with the saved ChatGPT account; never writes to the database. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { readDbRetrySnapshot } from "../../import/textbook/db-retry-20261011/checkpoint";
import { runCodexJson } from "../../import/textbook/codex-retry-20261011/transport";
import { reviewCodexDbRetryPair } from "../../../src/lib/import/schoolTextbook/codexRetryReview";
import { loadDbRetryFigures } from "../../../src/lib/import/schoolTextbook/dbRetryFigures";
import { dbRetryReviewBinding } from "../../../src/lib/import/schoolTextbook/dbRetryReviewBinding";
import { reviewDigest } from "../../../src/lib/import/schoolTextbook/qualification";
import type { CodexDbRetryPairReview } from "../../../src/lib/import/schoolTextbook/codexRetry.types";
import type { DbRetryCheckpoint } from "../../import/textbook/db-retry-20261011/checkpoint";
const args = process.argv.slice(2);
const arg = (name: string) => args[args.indexOf(name) + 1];
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
async function main() {
  for (const flag of ["--snapshot", "--generation", "--source-ids", "--out"])
    if (!args.includes(flag) || !arg(flag)) throw new Error(`missing-${flag}`);
  const snapshot = readDbRetrySnapshot(readFileSync(arg("--snapshot")));
  const ids = read(arg("--source-ids")) as string[];
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    ids.length > 100 ||
    new Set(ids).size !== ids.length
  )
    throw new Error("bounded-unique-source-ids-required");
  const out = resolve(arg("--out")),
    generation = resolve(arg("--generation"));
  const concurrency = args.includes("--concurrency")
    ? Number(arg("--concurrency"))
    : 1;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4)
    throw new Error("invalid-concurrency");
  mkdirSync(join(out, "reviews"), { recursive: true });
  let next = 0;
  const reviews: CodexDbRetryPairReview[] = [];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < ids.length) {
        const id = ids[next++]!;
        const origin = snapshot.origins.find((o) => o.problem.id === id);
        const checkpoint = read(
          join(generation, "sources", `${id}.json`),
        ) as DbRetryCheckpoint;
        if (
          !origin ||
          !checkpoint.pair ||
          checkpoint.pair.candidates.length !== 2
        )
          throw new Error("missing-origin-or-pair");
        const candidates = checkpoint.pair.candidates;
        const sourceFigures = await loadDbRetryFigures(origin.problem);
        const candidateFigures = await Promise.all(
          candidates.map((candidate) => loadDbRetryFigures(candidate)),
        );
        const binding = dbRetryReviewBinding(
          origin,
          candidates,
          sourceFigures,
          candidateFigures,
        );
        const file = join(out, "reviews", `${id}.json`);
        let review;
        if (existsSync(file)) {
          review = read(file);
          if (review.bindingDigest !== binding.bindingDigest)
            throw new Error("existing-review-content-drift");
        } else {
          review = await reviewCodexDbRetryPair(
            origin,
            candidates,
            sourceFigures,
            candidateFigures,
            {
              runCodexJson,
              outDir: join(out, "receipts"),
              cwd: process.cwd(),
              timeoutMs: 600000,
            },
          );
          writeFileSync(file, JSON.stringify(review, null, 2) + "\n", {
            flag: "wx",
          });
        }
        reviews.push(review);
        writeFileSync(
          join(out, "progress.json"),
          JSON.stringify(
            {
              checkedAt: new Date().toISOString(),
              requested: ids.length,
              completed: reviews.length,
              passed: reviews.filter((r) => r.passed).length,
              paidCalls: 0,
            },
            null,
            2,
          ),
        );
        console.log(
          JSON.stringify({
            sourceId: id,
            passed: review.passed,
            issues: review.issues,
          }),
        );
      }
    }),
  );
  const accepted = reviews.filter((r) => r.passed);
  const candidates = accepted.flatMap(
    (r) =>
      read(join(generation, "sources", `${r.sourceId}.json`)).pair.candidates,
  );
  writeFileSync(
    join(out, "reviews.json"),
    JSON.stringify({ reviews }, null, 2) + "\n",
  );
  writeFileSync(
    join(out, "accepted-reviews.json"),
    JSON.stringify({ reviews: accepted }, null, 2) + "\n",
  );
  writeFileSync(
    join(out, "accepted-packet.json"),
    JSON.stringify(
      { candidates, candidateDigest: reviewDigest(candidates) },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(
    join(out, "accepted-source-ids.json"),
    JSON.stringify(
      accepted.map((r) => r.sourceId),
      null,
      2,
    ) + "\n",
  );
}
main().catch(() => {
  console.error("Codex review stopped; checkpoints preserved.");
  process.exitCode = 1;
});
