/** Read-only final DB-snapshot audit and actual retry-planner exercise. */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  planRetry,
  type RetryCandidate,
} from "../../../src/lib/generator/planRetry";
import { reviewDigest } from "../../../src/lib/import/schoolTextbook/qualification";

type Raw = Record<string, unknown> & {
  id: string;
  external_id: string;
  origin_problem_id: string | null;
  source: string;
  content: string;
  answer: string;
  solution: string;
  direct_use_allowed: boolean;
  review_status: string;
};
type Snapshot = {
  rows: { problem: Raw; [key: string]: unknown }[];
  children: Raw[];
};
const [baselinePath, finalPath, outputPath, ...packets] = process.argv.slice(2);
if (!baselinePath || !finalPath || !outputPath || packets.length !== 3)
  throw new Error(
    "baseline final output core geometry calculus packets required",
  );
const read = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const hash = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");
const baseline = read(baselinePath) as Snapshot,
  final = read(finalPath) as Snapshot;
const fail: (reason: string) => never = (reason) => {
  throw new Error(reason);
};
const finalRows = new Map(final.rows.map((row) => [row.problem.id, row]));
const baselineIds = new Set(baseline.rows.map((row) => row.problem.id));
for (const row of baseline.rows)
  if (reviewDigest(row) !== reviewDigest(finalRows.get(row.problem.id)))
    fail(`Existing original/book/unit/material changed: ${row.problem.id}`);
const childById = new Map(final.children.map((row) => [row.id, row]));
for (const row of baseline.children)
  if (reviewDigest(row) !== reviewDigest(childById.get(row.id)))
    fail(`Existing recovery child changed: ${row.id}`);
const oldChildIds = new Set(baseline.children.map((row) => row.id));
const additions = final.children.filter((row) => !oldChildIds.has(row.id));
const candidates = packets.flatMap(
  (file) => read(file).candidates as Record<string, unknown>[],
);
const byExternal = new Map(
  candidates.map((candidate) => [candidate.externalId, candidate]),
);
if (
  byExternal.size !== candidates.length ||
  additions.length !== candidates.length
)
  fail("Cohort/new-row populations differ");
const pairs = new Map<string, Raw[]>();
for (const row of additions) {
  const candidate = byExternal.get(row.external_id),
    parent = finalRows.get(row.origin_problem_id!)?.problem;
  if (
    !candidate ||
    !parent ||
    !parent.direct_use_allowed ||
    parent.review_status !== "approved" ||
    row.source !== "transformed" ||
    row.pool !== "shared" ||
    row.user_id !== null ||
    !row.direct_use_allowed ||
    row.review_status !== "approved" ||
    row.unit_id !== parent.unit_id ||
    row.family_key !== parent.family_key ||
    row.source_material_id !== parent.source_material_id ||
    candidate.sourceDigest !== reviewDigest(parent)
  )
    fail(`New variant eligibility/provenance failure: ${row.external_id}`);
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
    if (reviewDigest(row[snake!]) !== reviewDigest(candidate[camel!]))
      fail(
        `Stored payload differs from verified packet: ${row.external_id}:${camel}`,
      );
  const group = pairs.get(parent.id) ?? [];
  group.push(row);
  pairs.set(parent.id, group);
}
const retry = (row: Raw): RetryCandidate => ({
  id: row.id,
  unitId: String(row.unit_id),
  familyKey: String(row.family_key),
  difficulty: row.difficulty as RetryCandidate["difficulty"],
  source: row.source as RetryCandidate["source"],
  originProblemId: row.origin_problem_id,
  externalId: row.external_id,
  pool: String(row.pool),
  reviewStatus: row.review_status,
  directUseAllowed: row.direct_use_allowed,
  answer: row.answer,
});
const pool = final.children.map(retry);
for (const [id, rows] of pairs) {
  if (
    rows.length !== 2 ||
    ![1, 2].every((slot) =>
      rows.some((row) => row.external_id === `tb-retry-v1:${id}:${slot}`),
    )
  )
    fail(`Incomplete exact pair: ${id}`);
  const parent = finalRows.get(id)!.problem;
  if (
    new Set(rows.map((row) => row.content.replace(/\s+/g, ""))).size !== 2 ||
    rows.some(
      (row) =>
        row.content.replace(/\s+/g, "") === parent.content.replace(/\s+/g, ""),
    )
  )
    fail(`Repeated original/sibling: ${id}`);
  const result = planRetry({
    wrong: [retry(parent)],
    pool,
    seed: `final-audit:${id}`,
  });
  if (
    result.requestedCount !== 2 ||
    result.picked.length !== 2 ||
    result.shortfall !== 0 ||
    result.textbookShortfalls.length ||
    result.picked.some(
      (seat) =>
        seat.wrongProblemId !== id ||
        !rows.some((row) => row.id === seat.problem.id),
    )
  )
    fail(`Actual retry planner failed to return exact two slots: ${id}`);
}
const acquired = final.rows
  .filter((row) => !baselineIds.has(row.problem.id))
  .map((row) => row.problem);
if (
  acquired.length !== 20 ||
  acquired.some(
    (row) =>
      !pairs.has(row.id) ||
      !row.direct_use_allowed ||
      row.review_status !== "approved",
  )
)
  fail("Recovered twenty not all usable with exactly two variants");
const held = final.rows.filter(
  (row) =>
    !row.problem.direct_use_allowed || row.problem.review_status !== "approved",
);
const uncovered = final.rows.filter((row) => !pairs.has(row.problem.id));
for (const row of [
  held[0],
  uncovered.find((row) => row.problem.direct_use_allowed),
].filter(Boolean)) {
  const result = planRetry({
    wrong: [retry(row!.problem)],
    pool,
    seed: "final-shortfall-audit",
  });
  if (
    result.picked.length !== 0 ||
    result.shortfall !== 2 ||
    result.textbookShortfalls[0]?.available !== 0
  )
    fail("Uncovered original silently fell back to an unrelated question");
}
const report = {
  passed: true,
  checkedAt: new Date().toISOString(),
  baselineSha256: hash(baselinePath),
  finalSha256: hash(finalPath),
  packetSha256: packets.map(hash),
  originals: final.rows.length,
  usableOriginals: final.rows.length - held.length,
  heldOriginals: held.length,
  existingOriginalsUnchanged: baseline.rows.length,
  existingRecoveryChildrenUnchanged: baseline.children.length,
  newOriginals: acquired.length,
  newReviewedVariants: additions.length,
  completePairs: pairs.size,
  actualPlannerPairsChecked: pairs.size,
  newlyRecoveredCompletePairs: acquired.length,
  uncoveredOriginals: uncovered.length,
  uncoveredUsableOriginals: uncovered.filter(
    (row) =>
      row.problem.direct_use_allowed &&
      row.problem.review_status === "approved",
  ).length,
  complete: uncovered.length === 0,
  issues: [],
};
writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
