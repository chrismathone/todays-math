/** Full read-only corpus census plus the acquired twenty; no loader or database calls. */
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  generateTextbookVariantPair,
  type TextbookVariantSource,
} from "../../../../src/lib/import/schoolTextbook/variants";
import {
  generateTextbookCalculusPair,
  validateTextbookCalculusPair,
  type TextbookCalculusCandidate,
} from "../../../../src/lib/import/schoolTextbook/variantsCalculus";

const [snapshotPath, recoveredPath, outputDirectory] = process.argv.slice(2);
if (!snapshotPath || !recoveredPath || !outputDirectory)
  throw new Error(
    "census.ts source-snapshot.json recovered-sources.json output-directory",
  );
const snapshotBytes = readFileSync(snapshotPath),
  recoveredBytes = readFileSync(recoveredPath);
const snapshot = JSON.parse(snapshotBytes.toString("utf8")) as {
  rows: { problem: TextbookVariantSource; book: { grade: string } }[];
};
const recovered = JSON.parse(
  recoveredBytes.toString("utf8"),
) as TextbookVariantSource[];
const acquiredIds = new Set(recovered.map((source) => source.external_id));
const loadedExternalIds = new Set(
  snapshot.rows.map((row) => row.problem.external_id),
);
const offlineOnly = recovered.filter(
  (source) => !loadedExternalIds.has(source.external_id),
);
if (
  snapshot.rows.length !==
  new Set(snapshot.rows.map((row) => row.problem.id)).size
)
  throw new Error("Duplicate original IDs");
const candidates: TextbookCalculusCandidate[] = [],
  covered: Record<string, unknown>[] = [],
  unresolved: Record<string, unknown>[] = [];
const sources: TextbookVariantSource[] = [],
  recipes: Record<string, number> = {},
  reasons: Record<string, number> = {};
let existingBaseMatched = 0;
for (const row of [
  ...snapshot.rows.map((row) => ({
    ...row,
    acquisition: acquiredIds.has(row.problem.external_id)
      ? "acquired-db"
      : "actual-db-snapshot",
  })),
  ...offlineOnly.map((problem) => ({
    problem,
    book: { grade: "미적분1" },
    acquisition: "acquired-pending-offline",
  })),
]) {
  const base = generateTextbookVariantPair(row.problem);
  if (base.status === "matched") {
    existingBaseMatched++;
    continue;
  }
  const result = generateTextbookCalculusPair(row.problem);
  if (result.status === "matched") {
    const validation = validateTextbookCalculusPair(
      row.problem,
      result.candidates,
    );
    if (!validation.valid)
      throw new Error(`${row.problem.id}: ${validation.issues}`);
    candidates.push(...result.candidates);
    sources.push(row.problem);
    recipes[result.candidates[0].recipe] =
      (recipes[result.candidates[0].recipe] ?? 0) + 1;
    covered.push({
      sourceId: row.problem.id,
      sourceExternalId: row.problem.external_id,
      sourceDigest: result.sourceDigest,
      grade: row.book.grade,
      acquisition: row.acquisition,
      questionType: row.problem.question_type,
      directUseAllowed: row.problem.direct_use_allowed,
      reviewStatus: row.problem.review_status,
      recipe: result.candidates[0].recipe,
      candidates: 2,
    });
  } else {
    reasons[result.reason] = (reasons[result.reason] ?? 0) + 1;
    unresolved.push({
      sourceId: row.problem.id,
      sourceExternalId: row.problem.external_id,
      grade: row.book.grade,
      acquisition: row.acquisition,
      reason: result.reason,
    });
  }
}
const summary = {
  snapshotSha256: createHash("sha256").update(snapshotBytes).digest("hex"),
  recoveredSourcesSha256: createHash("sha256")
    .update(recoveredBytes)
    .digest("hex"),
  actualDbOriginals: snapshot.rows.length,
  acquiredOriginals: recovered.length,
  acquiredCurrentPending: snapshot.rows.filter(
    (row) =>
      acquiredIds.has(row.problem.external_id) &&
      row.problem.review_status === "pending",
  ).length,
  acquiredOfflineOnly: offlineOnly.length,
  existingBaseMatched,
  existingBaseCandidatesUnchanged: existingBaseMatched * 2,
  newMatchedOriginals: covered.length,
  newCandidates: candidates.length,
  newActualDbMatched: covered.filter(
    (row) => row.acquisition === "actual-db-snapshot",
  ).length,
  newAcquiredMatched: covered.filter((row) =>
    String(row.acquisition).startsWith("acquired-"),
  ).length,
  unresolved: unresolved.length,
  recipes,
  reasons,
};
if (
  existingBaseMatched + covered.length + unresolved.length !==
  snapshot.rows.length + offlineOnly.length
)
  throw new Error("Census denominator mismatch");
mkdirSync(resolve(outputDirectory), { recursive: true });
for (const [name, data] of Object.entries({
  "summary.json": summary,
  "covered.json": covered,
  "unresolved.json": unresolved,
  "candidates.json": { sources, candidates },
}))
  writeFileSync(
    join(resolve(outputDirectory), name),
    JSON.stringify(data, null, 2) + "\n",
  );
console.log(JSON.stringify(summary, null, 2));
