/** Read-only full census. Usage: tsx coverage.ts <snapshot.json> <output-directory> */
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  generateTextbookVariantPair,
  validateTextbookVariantPair,
  TEXTBOOK_VARIANT_VERSION,
  type TextbookVariantSource,
  type TextbookVariantCandidate,
} from "../../../../src/lib/import/schoolTextbook/variants";

const [snapshotPath, outputDirectory] = process.argv.slice(2);
if (!snapshotPath || !outputDirectory)
  throw new Error("Usage: coverage.ts <snapshot.json> <output-directory>");
const bytes = readFileSync(resolve(snapshotPath));
const snapshot = JSON.parse(bytes.toString("utf8")) as {
  rows: {
    problem: TextbookVariantSource;
    book: { grade: string };
    unit: { section?: string };
  }[];
  children: TextbookVariantSource[];
};
if (!Array.isArray(snapshot.rows) || !Array.isArray(snapshot.children))
  throw new Error("Invalid snapshot shape");
const ids = new Set(snapshot.rows.map((row) => row.problem.id));
if (ids.size !== snapshot.rows.length)
  throw new Error("Duplicate original IDs in snapshot");
const candidates: TextbookVariantCandidate[] = [];
const unresolved: {
  sourceId: string;
  sourceDigest: string;
  grade: string;
  questionType: string;
  problemCode?: string;
  reason: string;
  detail: string;
}[] = [];
const byRecipe: Record<string, number> = {},
  byGrade: Record<
    string,
    { originals: number; matched: number; unresolved: number }
  > = {},
  byReason: Record<string, number> = {};
for (const row of snapshot.rows) {
  const { problem, book } = row;
  const group = (byGrade[book.grade] ??= {
    originals: 0,
    matched: 0,
    unresolved: 0,
  });
  group.originals++;
  const result = generateTextbookVariantPair(problem);
  if (result.status === "matched") {
    const check = validateTextbookVariantPair(problem, result.candidates);
    if (!check.valid)
      throw new Error(`${problem.id}: ${check.issues.join(", ")}`);
    candidates.push(...result.candidates);
    group.matched++;
    const recipe = result.candidates[0].recipe;
    byRecipe[recipe] = (byRecipe[recipe] ?? 0) + 1;
  } else {
    group.unresolved++;
    byReason[result.reason] = (byReason[result.reason] ?? 0) + 1;
    unresolved.push({
      sourceId: result.sourceId,
      sourceDigest: result.sourceDigest,
      grade: book.grade,
      questionType: problem.question_type,
      problemCode: problem.problem_code,
      reason: result.reason,
      detail: result.detail,
    });
  }
}
const summary = {
  version: TEXTBOOK_VARIANT_VERSION,
  snapshotPath: resolve(snapshotPath),
  snapshotSha256: createHash("sha256").update(bytes).digest("hex"),
  originals: snapshot.rows.length,
  usableOriginals: snapshot.rows.filter(
    (r) =>
      r.problem.direct_use_allowed && r.problem.review_status === "approved",
  ).length,
  heldOriginals: snapshot.rows.filter(
    (r) =>
      !r.problem.direct_use_allowed || r.problem.review_status !== "approved",
  ).length,
  matchedOriginals: candidates.length / 2,
  generatedCandidates: candidates.length,
  unresolvedOriginals: unresolved.length,
  existingChildren: snapshot.children.length,
  existingChildrenClaimedAsVerifiedPairs: 0,
  complete: unresolved.length === 0,
  byRecipe,
  byGrade,
  byReason,
};
if (
  summary.matchedOriginals + summary.unresolvedOriginals !==
  summary.originals
)
  throw new Error("Census does not reconcile");
mkdirSync(resolve(outputDirectory), { recursive: true });
for (const [name, data] of [
  ["summary.json", summary],
  [
    "candidates.json",
    {
      version: TEXTBOOK_VARIANT_VERSION,
      snapshotSha256: summary.snapshotSha256,
      candidates,
    },
  ],
  ["unresolved.json", { snapshotSha256: summary.snapshotSha256, unresolved }],
] as const)
  writeFileSync(
    resolve(outputDirectory, name),
    JSON.stringify(data, null, 2) + "\n",
    "utf8",
  );
console.log(JSON.stringify(summary, null, 2));
