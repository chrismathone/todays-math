/** Verify audit coverage and citations against a fresh, read-only bank export.
 * Usage: node --import tsx scripts/qa/concept-blank/clarity/verify.ts <export-dir>
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Row = {
  id: string;
  grade: string;
  student: string;
  expected: string[];
  sourceHash: string;
};
type Finding = {
  id: string;
  status: "confirmed" | "needs_review";
  category: string;
  student: string;
  expected: string[];
  reason: string;
  proposal: string;
};
type Review = {
  sourceCommit: string;
  grades: string[];
  reviewedIds: string[];
  packetsRead: string[];
  findings: Finding[];
};
type Inventory = {
  sourceCommit: string;
  contentHash: string;
  total: number;
  blanks: number;
  groups: {
    grade: string;
    count: number;
    packets: { file: string; ids: string[] }[];
  }[];
};
const exported = resolve(process.argv[2] ?? "tmp/concept-cloze-all-20261006");
const reports = resolve(
  "docs/planning/tracks/reports/concept-cloze-all-20261006",
);
const read = <T>(directory: string, name: string): T =>
  JSON.parse(readFileSync(resolve(directory, name), "utf8")) as T;
const baseline = read<Inventory>(reports, "inventory.json");
const current = read<Inventory>(exported, "inventory.json");
assert.equal(
  current.contentHash,
  baseline.contentHash,
  "Audit source content changed; re-review changed items",
);
assert.equal(current.total, baseline.total);
assert.equal(current.blanks, baseline.blanks);
assert.deepEqual(current.groups, baseline.groups);
const rows = current.groups.flatMap((g) =>
  read<Row[]>(exported, `${g.grade}.json`),
);
const byId = new Map(rows.map((r) => [r.id, r]));
assert.equal(byId.size, baseline.total);
const unique = (ids: string[], label: string) => {
  assert.equal(new Set(ids).size, ids.length, `${label}: duplicates`);
  return [...ids].sort();
};
const reviews = ["e3e4", "e5e6", "m1m2", "m3"].map((group) =>
  read<Review>(reports, `${group}.json`),
);
const allReviewed: string[] = [];
const allFindings: Finding[] = [];
const categories = new Set([
  "hidden-condition",
  "open-answer",
  "long-phrase",
  "grammar-blank",
  "missing-referent",
  "math-error",
  "answer-leak",
]);
for (const review of reviews) {
  assert.equal(review.sourceCommit, baseline.sourceCommit);
  const expectedRows = rows.filter((row) => review.grades.includes(row.grade));
  assert.deepEqual(
    unique(review.reviewedIds, "reviewedIds"),
    expectedRows.map((r) => r.id).sort(),
  );
  const packets = baseline.groups
    .filter((g) => review.grades.includes(g.grade))
    .flatMap((g) => g.packets);
  assert.deepEqual(
    unique(review.packetsRead, "packetsRead"),
    packets.map((p) => p.file).sort(),
  );
  for (const finding of review.findings) {
    const row = byId.get(finding.id);
    assert.ok(
      row && review.reviewedIds.includes(finding.id),
      `unreviewed finding: ${finding.id}`,
    );
    assert.equal(finding.student, row.student, `student quote: ${finding.id}`);
    assert.deepEqual(
      finding.expected,
      row.expected,
      `expected answer: ${finding.id}`,
    );
    assert.ok(["confirmed", "needs_review"].includes(finding.status));
    assert.ok(categories.has(finding.category));
    assert.ok(finding.reason.trim() && finding.proposal.trim());
  }
  allReviewed.push(...review.reviewedIds);
  allFindings.push(...review.findings);
}
assert.deepEqual(
  unique(allReviewed, "all reviewed IDs"),
  [...byId.keys()].sort(),
);
unique(
  allFindings.map((f) => f.id),
  "finding IDs",
);
type Status = "confirmed" | "needs_review" | "not_issue";
type ClaudeCase = {
  id: string;
  verdict: Status;
  reason: string;
  proposal: string;
};
type CrossCase = {
  id: string;
  initialStatus: Status | null;
  finalStatus: Status;
  finalCategory: string | null;
  claude: ClaudeCase;
};
const cross = read<{
  sourceCommit: string;
  batches: { ids: string[]; rawReport: string }[];
  cases: CrossCase[];
}>(reports, "cross-review.json");
assert.equal(cross.sourceCommit, baseline.sourceCommit);
const crossById = new Map(cross.cases.map((c) => [c.id, c]));
unique(
  cross.cases.map((c) => c.id),
  "cross-review IDs",
);
const initialById = new Map(allFindings.map((f) => [f.id, f]));
for (const finding of allFindings)
  assert.ok(
    crossById.has(finding.id),
    `Missing independent review: ${finding.id}`,
  );
for (const c of cross.cases) {
  assert.ok(byId.has(c.id));
  assert.equal(c.initialStatus, initialById.get(c.id)?.status ?? null);
  assert.ok(["confirmed", "needs_review", "not_issue"].includes(c.finalStatus));
}
assert.deepEqual(
  unique(
    cross.batches.flatMap((b) => b.ids),
    "batch IDs",
  ),
  [...crossById.keys()].sort(),
);
for (const batch of cross.batches) {
  const raw = readFileSync(resolve(reports, batch.rawReport), "utf8");
  const parsed = JSON.parse(
    raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1),
  ) as { cases: ClaudeCase[] };
  assert.deepEqual(
    unique(
      parsed.cases.map((c) => c.id),
      "raw review IDs",
    ),
    [...batch.ids].sort(),
  );
  for (const c of parsed.cases)
    assert.deepEqual(c, crossById.get(c.id)?.claude);
}
const finalized = read<{
  sourceCommit: string;
  findings: (Omit<Finding, "status"> & {
    status: Status;
    sourceHash: string;
    grade: string;
  })[];
}>(reports, "findings.json");
assert.equal(finalized.sourceCommit, baseline.sourceCommit);
const expectedFinalIds = cross.cases
  .filter((c) => initialById.has(c.id) || c.finalStatus !== "not_issue")
  .map((c) => c.id);
assert.deepEqual(
  unique(
    finalized.findings.map((f) => f.id),
    "final finding IDs",
  ),
  expectedFinalIds.sort(),
);
for (const f of finalized.findings) {
  const source = byId.get(f.id)!;
  assert.equal(f.sourceHash, source.sourceHash, `source hash: ${f.id}`);
  assert.equal(f.student, source.student, `final quote: ${f.id}`);
  assert.deepEqual(f.expected, source.expected, `final answer: ${f.id}`);
  assert.equal(f.grade, source.grade);
  assert.equal(f.status, crossById.get(f.id)?.finalStatus);
  assert.equal(f.category, crossById.get(f.id)?.finalCategory);
  assert.ok(categories.has(f.category));
  assert.ok(f.reason.trim());
}
const counts = (grade?: string) => {
  const selected = finalized.findings.filter(
    (f) => !grade || f.grade === grade,
  );
  return {
    confirmed: selected.filter((f) => f.status === "confirmed").length,
    needsReview: selected.filter((f) => f.status === "needs_review").length,
    cleared: selected.filter((f) => f.status === "not_issue").length,
  };
};
const summary = read<{
  sourceCommit: string;
  contentHash: string;
  reviewed: number;
  blanks: number;
  primaryFindingCount: number;
  claudeReviewed: number;
  controlSamples: number;
  categories: { category: string; confirmed: number; needsReview: number }[];
  final: ReturnType<typeof counts>;
  grades: {
    grade: string;
    reviewed: number;
    blanks: number;
    confirmed: number;
    needsReview: number;
    cleared: number;
  }[];
}>(reports, "summary.json");
assert.equal(summary.sourceCommit, baseline.sourceCommit);
assert.equal(summary.contentHash, baseline.contentHash);
assert.equal(summary.reviewed, baseline.total);
assert.equal(summary.blanks, baseline.blanks);
assert.equal(summary.primaryFindingCount, allFindings.length);
assert.equal(summary.claudeReviewed, cross.cases.length);
assert.equal(
  summary.controlSamples,
  cross.cases.filter((c) => c.initialStatus === null).length,
);
assert.deepEqual(summary.final, counts());
assert.deepEqual(
  unique(
    summary.grades.map((g) => g.grade),
    "summary grades",
  ),
  baseline.groups.map((g) => g.grade).sort(),
);
assert.deepEqual(
  summary.categories,
  [...new Set(finalized.findings.map((f) => f.category))].map((category) => ({
    category,
    confirmed: finalized.findings.filter(
      (f) => f.category === category && f.status === "confirmed",
    ).length,
    needsReview: finalized.findings.filter(
      (f) => f.category === category && f.status === "needs_review",
    ).length,
  })),
);
for (const grade of summary.grades) {
  assert.equal(
    grade.reviewed,
    rows.filter((r) => r.grade === grade.grade).length,
  );
  assert.equal(
    grade.blanks,
    rows
      .filter((r) => r.grade === grade.grade)
      .reduce((n, r) => n + r.expected.length, 0),
  );
  assert.deepEqual(
    {
      confirmed: grade.confirmed,
      needsReview: grade.needsReview,
      cleared: grade.cleared,
    },
    counts(grade.grade),
  );
}
console.log(
  JSON.stringify(
    {
      sourceCommit: baseline.sourceCommit,
      contentHash: baseline.contentHash,
      reviewed: allReviewed.length,
      blanks: baseline.blanks,
      primaryFindings: allFindings.length,
      crossReviewed: cross.cases.length,
      crossReviewedPrimaryFindings: allFindings.length,
      final: counts(),
      missingIds: 0,
      duplicateIds: 0,
      mismatchedQuotes: 0,
      contentChanged: false,
      grades: summary.grades,
    },
    null,
    2,
  ),
);
