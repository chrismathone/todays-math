/** Read-only: tsx coverage.ts <actual source snapshot> <output directory>. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  generateTextbookVariantPair,
  type TextbookVariantSource,
} from "../../../../src/lib/import/schoolTextbook/variants";
import {
  generateTextbookGeometryPair,
  validateTextbookGeometryPair,
  type TextbookGeometryCandidate,
} from "../../../../src/lib/import/schoolTextbook/variantsGeometry";

const [snapshotPath, outPath] = process.argv.slice(2);
if (!snapshotPath || !outPath)
  throw new Error("Usage: coverage.ts <snapshot> <out-directory>");
const bytes = readFileSync(resolve(snapshotPath));
const snapshot = JSON.parse(bytes.toString("utf8")) as {
  rows: { problem: TextbookVariantSource; book: { grade: string } }[];
  children: unknown[];
};
if (!Array.isArray(snapshot.rows) || !Array.isArray(snapshot.children))
  throw new Error("snapshot-shape");
if (
  new Set(snapshot.rows.map((r) => r.problem.id)).size !== snapshot.rows.length
)
  throw new Error("duplicate-source-id");
const candidates: TextbookGeometryCandidate[] = [];
const evidence: {
  source: TextbookVariantSource;
  candidates: TextbookGeometryCandidate[];
}[] = [];
const unresolved: unknown[] = [];
const byGrade: Record<
  string,
  { originals: number; matched: number; unresolved: number }
> = {};
const byRecipe: Record<string, number> = {},
  byReason: Record<string, number> = {};
let baseMatched = 0,
  overlap = 0;
for (const { problem, book } of snapshot.rows) {
  const grade = (byGrade[book.grade] ??= {
    originals: 0,
    matched: 0,
    unresolved: 0,
  });
  grade.originals++;
  const base = generateTextbookVariantPair(problem);
  if (base.status === "matched") baseMatched++;
  const result = generateTextbookGeometryPair(problem);
  if (result.status === "matched") {
    const check = validateTextbookGeometryPair(problem, result.candidates);
    if (!check.valid)
      throw new Error(`${problem.id}: ${check.issues.join(",")}`);
    if (base.status === "matched") overlap++;
    grade.matched++;
    byRecipe[result.candidates[0].recipe] =
      (byRecipe[result.candidates[0].recipe] ?? 0) + 1;
    candidates.push(...result.candidates);
    evidence.push({ source: problem, candidates: result.candidates });
  } else {
    grade.unresolved++;
    byReason[result.reason] = (byReason[result.reason] ?? 0) + 1;
    unresolved.push({
      sourceId: problem.id,
      sourceDigest: result.sourceDigest,
      grade: book.grade,
      reason: result.reason,
      problemCode: problem.problem_code,
    });
  }
}
const summary = {
  snapshotSha256: createHash("sha256").update(bytes).digest("hex"),
  originals: snapshot.rows.length,
  geometryMatched: candidates.length / 2,
  geometryCandidates: candidates.length,
  geometryUnresolved: unresolved.length,
  baseMatched,
  overlap,
  combinedMatched: baseMatched + candidates.length / 2 - overlap,
  combinedUnresolved:
    snapshot.rows.length - baseMatched - candidates.length / 2 + overlap,
  existingChildren: snapshot.children.length,
  byGrade,
  byRecipe,
  byReason,
};
mkdirSync(resolve(outPath), { recursive: true });
for (const [name, data] of [
  ["summary.json", summary],
  ["candidates.json", { snapshotSha256: summary.snapshotSha256, candidates }],
  ["unresolved.json", { snapshotSha256: summary.snapshotSha256, unresolved }],
  ["math-evidence.json", { snapshotSha256: summary.snapshotSha256, evidence }],
] as const)
  writeFileSync(
    resolve(outPath, name),
    JSON.stringify(data, null, 2) + "\n",
    "utf8",
  );
console.log(JSON.stringify(summary, null, 2));
