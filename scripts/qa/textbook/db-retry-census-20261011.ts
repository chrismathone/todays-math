/** Read-only immutable-source audit and real retry-planner exercise for the DB-source run. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import {
  planRetry,
  type RetryCandidate,
} from "../../../src/lib/generator/planRetry";
import { reviewDigest } from "../../../src/lib/import/schoolTextbook/qualification";
type Raw = Record<string, unknown> & {
  id: string;
  source: string;
  external_id: string;
  origin_problem_id: string | null;
  content: string;
  direct_use_allowed: boolean;
  review_status: string;
};
type Snapshot = {
  rows: { problem: Raw; [key: string]: unknown }[];
  children: Raw[];
};
const [baselineFile, currentFile, outputFile] = process.argv.slice(2);
if (!baselineFile || !currentFile || !outputFile)
  throw new Error("baseline current output required");
const read = (file: string): Snapshot => JSON.parse(readFileSync(file, "utf8"));
const hash = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");
const baseline = read(baselineFile),
  current = read(currentFile);
const bySource = new Map(current.rows.map((row) => [row.problem.id, row]));
const byChild = new Map(current.children.map((row) => [row.id, row]));
for (const row of baseline.rows)
  if (reviewDigest(row) !== reviewDigest(bySource.get(row.problem.id)))
    throw new Error(
      `Existing original/unit/material/book changed: ${row.problem.id}`,
    );
for (const row of baseline.children)
  if (reviewDigest(row) !== reviewDigest(byChild.get(row.id)))
    throw new Error(`Existing variant changed: ${row.id}`);
if (baseline.rows.length !== current.rows.length)
  throw new Error("DB-source variant run changed original population");
const oldChildren = new Set(baseline.children.map((row) => row.id));
const added = current.children.filter((row) => !oldChildren.has(row.id));
for (const child of added) {
  const parent = bySource.get(child.origin_problem_id!)?.problem;
  if (
    !parent ||
    !parent.direct_use_allowed ||
    parent.review_status !== "approved" ||
    child.source !== "transformed" ||
    child.pool !== "shared" ||
    child.user_id !== null ||
    child.unit_id !== parent.unit_id ||
    child.family_key !== parent.family_key ||
    child.source_material_id !== parent.source_material_id ||
    ![1, 2].some(
      (slot) => child.external_id === `tb-retry-v1:${parent.id}:${slot}`,
    )
  )
    throw new Error(`New child provenance/parent mismatch: ${child.id}`);
}
const candidate = (row: Raw): RetryCandidate => ({
  id: row.id,
  unitId: String(row.unit_id),
  familyKey: String(row.family_key),
  originProblemId: row.origin_problem_id,
  externalId: row.external_id,
  source: row.source as RetryCandidate["source"],
  difficulty: row.difficulty as RetryCandidate["difficulty"],
  pool: String(row.pool),
  reviewStatus: row.review_status,
  directUseAllowed: row.direct_use_allowed,
  answer: String(row.answer),
});
const usable = current.rows.filter(
  ({ problem }) =>
    problem.direct_use_allowed && problem.review_status === "approved",
);
const reviewed = current.children.filter(
  (row) =>
    row.direct_use_allowed &&
    row.review_status === "approved" &&
    row.external_id?.startsWith("tb-retry-v1:"),
);
const pool = reviewed.map(candidate);
const pairs = new Map<string, Raw[]>();
for (const row of reviewed) {
  const group = pairs.get(row.origin_problem_id!) ?? [];
  group.push(row);
  pairs.set(row.origin_problem_id!, group);
}
for (const [sourceId, rows] of pairs) {
  const source = bySource.get(sourceId)?.problem;
  if (
    !source ||
    rows.length !== 2 ||
    new Set(rows.map((row) => row.external_id)).size !== 2 ||
    ![1, 2].every((slot) =>
      rows.some((row) => row.external_id === `tb-retry-v1:${sourceId}:${slot}`),
    ) ||
    new Set(rows.map((row) => row.content.replace(/\s+/g, ""))).size !== 2 ||
    rows.some(
      (row) =>
        row.content.replace(/\s+/g, "") === source.content.replace(/\s+/g, ""),
    )
  )
    throw new Error(`Reviewed pair malformed: ${sourceId}`);
  const result = planRetry({
    wrong: [candidate(source)],
    pool,
    seed: `db-census:${sourceId}`,
  });
  if (
    result.requestedCount !== 2 ||
    result.picked.length !== 2 ||
    result.shortfall ||
    result.textbookShortfalls.length ||
    result.picked.some(
      (seat) =>
        seat.wrongProblemId !== sourceId ||
        !rows.some((row) => row.id === seat.problem.id),
    )
  )
    throw new Error(`Actual two-review planner failed: ${sourceId}`);
}
const remaining = usable.filter(({ problem }) => !pairs.has(problem.id));
const uncovered = remaining[0];
if (uncovered) {
  const result = planRetry({
    wrong: [candidate(uncovered.problem)],
    pool,
    seed: "db-census-shortfall",
  });
  if (
    result.picked.length ||
    result.shortfall !== 2 ||
    result.textbookShortfalls[0]?.available !== 0
  )
    throw new Error("Missing source silently filled with unrelated questions");
}
const report = {
  passed: true,
  checkedAt: new Date().toISOString(),
  baselineSha256: hash(baselineFile),
  currentSha256: hash(currentFile),
  originals: current.rows.length,
  usableOriginals: usable.length,
  heldOriginals: current.rows.length - usable.length,
  preservedOriginalsAndMetadata: baseline.rows.length,
  preservedExistingVariants: baseline.children.length,
  newVariants: added.length,
  newReviewedVariants: added.filter(
    (row) => row.direct_use_allowed && row.review_status === "approved",
  ).length,
  pendingNewVariants: added.filter((row) => !row.direct_use_allowed).length,
  completePairs: pairs.size,
  actualPlannerPairsChecked: pairs.size,
  remainingUsableOriginals: remaining.length,
  complete: remaining.length === 0,
  issues: [],
};
writeFileSync(outputFile, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
