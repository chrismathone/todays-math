/** Verify the item-by-item remediation ledger against the complete live bank.
 * Replacing ONLY declared definitions with their recorded old text must recover
 * the full original bank hash, including every ID, order, example and other form.
 * Usage: node --import tsx scripts/qa/concept-blank/clarity/verify-remediation.ts
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import katex from "katex";
import {
  blankSentenceSchema,
  splitBlankSentence,
} from "@/contracts/conceptBlank.contract";
import { BANK_PARTS } from "@/lib/concept-blank/bank";

type Change = { id: string; before: string; after: string; reason: string };
type Resolution = {
  id: string;
  disposition: "rewritten" | "kept";
  reason: string;
};
type Report = {
  sourceCommit: string;
  grades: string[];
  supplemental?: boolean;
  changes: Change[];
  resolutions: Resolution[];
};
const directory = resolve(
  "docs/planning/tracks/reports/concept-cloze-fix-all-20261006",
);
const read = <T>(file: string): T =>
  JSON.parse(readFileSync(resolve(directory, file), "utf8")) as T;
const manifest = read<{
  sourceCommit: string;
  baselineBankHash: string;
  reports: string[];
}>("manifest.json");
const audited = JSON.parse(
  readFileSync(
    resolve(
      "docs/planning/tracks/reports/concept-cloze-all-20261006/findings.json",
    ),
    "utf8",
  ),
) as { findings: { id: string; grade: string; sourceHash: string }[] };
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const rows = Object.entries(BANK_PARTS).flatMap(([part, bank]) =>
  bank.concepts.map((item) => ({ part, item })),
);
const byId = new Map(rows.map((row) => [row.item.id, row]));
assert.equal(byId.size, rows.length, "Duplicate bank concept IDs");
assert.equal(rows.length, 9119, "Concept count changed");
const unique = (ids: string[], label: string) => {
  assert.equal(new Set(ids).size, ids.length, `${label}: duplicates`);
  return [...ids].sort();
};
const reports = manifest.reports.map((file) => read<Report>(file));
const changes = reports.flatMap((report) => report.changes);
const resolutions = reports.flatMap((report) => report.resolutions);
unique(
  changes.map((c) => c.id),
  "changed IDs",
);
unique(
  resolutions.map((r) => r.id),
  "resolved IDs",
);
const changeById = new Map(changes.map((c) => [c.id, c]));
const resolutionById = new Map(resolutions.map((r) => [r.id, r]));
for (const report of reports) {
  assert.equal(report.sourceCommit, manifest.sourceCommit);
  if (report.supplemental) {
    assert.ok(
      report.resolutions.every(
        (row) => !audited.findings.some((finding) => finding.id === row.id),
      ),
      "Supplemental reports must contain only newly discovered IDs",
    );
  }
  const expectedIds = audited.findings
    .filter((f) => !report.supplemental && report.grades.includes(f.grade))
    .map((f) => f.id);
  const additionalIds = report.resolutions
    .filter((r) => !audited.findings.some((f) => f.id === r.id))
    .map((r) => r.id);
  assert.deepEqual(
    report.resolutions.map((r) => r.id).sort(),
    [...expectedIds, ...additionalIds].sort(),
    "Audit item resolution coverage",
  );
  for (const row of [...report.changes, ...report.resolutions]) {
    assert.ok(byId.has(row.id), `Unknown ID: ${row.id}`);
    assert.ok(
      report.grades.includes(byId.get(row.id)!.part.replace(/plus$/, "")),
    );
    assert.ok(row.reason.trim().length >= 4, `Reason missing: ${row.id}`);
  }
}
for (const resolution of resolutions) {
  assert.ok(["rewritten", "kept"].includes(resolution.disposition));
  assert.equal(
    changeById.has(resolution.id),
    resolution.disposition === "rewritten",
    `Disposition disagrees with change: ${resolution.id}`,
  );
}
for (const change of changes) {
  assert.ok(resolutionById.has(change.id), `Unresolved change: ${change.id}`);
  assert.notEqual(change.before, change.after);
  assert.equal(byId.get(change.id)!.item.definition, change.after);
  blankSentenceSchema.parse(change.after);
  const pieces = splitBlankSentence(change.after);
  assert.ok(
    pieces.some((piece) => piece.kind === "key"),
    `No key: ${change.id}`,
  );
  const completed = pieces.map((piece) => piece.text).join("");
  for (const token of completed.match(/\$[^$]+\$/g) ?? []) {
    katex.renderToString(token.slice(1, -1), {
      throwOnError: true,
      strict: "ignore",
    });
  }
}
const restored = Object.fromEntries(
  Object.entries(BANK_PARTS).map(([part, bank]) => [
    part,
    {
      ...bank,
      concepts: bank.concepts.map((item) => {
        const change = changeById.get(item.id);
        return change ? { ...item, definition: change.before } : item;
      }),
    },
  ]),
);
assert.equal(
  hash(restored),
  manifest.baselineBankHash,
  "Unexpected bank changes outside the declared definitions",
);
const restoredById = new Map(
  Object.values(restored).flatMap((bank) =>
    bank.concepts.map((item) => [item.id, item] as const),
  ),
);
for (const finding of audited.findings) {
  assert.ok(resolutionById.has(finding.id));
  assert.equal(hash(restoredById.get(finding.id)), finding.sourceHash);
}
const changedAnswers = changes.filter((change) => {
  const keys = (text: string) =>
    splitBlankSentence(text)
      .filter((p) => p.kind === "key")
      .map((p) => p.text);
  return (
    JSON.stringify(keys(change.before)) !== JSON.stringify(keys(change.after))
  );
});
console.log(
  JSON.stringify(
    {
      sourceCommit: manifest.sourceCommit,
      baselineBankHash: manifest.baselineBankHash,
      currentBankHash: hash(BANK_PARTS),
      concepts: rows.length,
      auditedResolved: audited.findings.length,
      totalResolved: resolutions.length,
      rewritten: changes.length,
      kept: resolutions.filter((r) => r.disposition === "kept").length,
      changedAnswerIds: changedAnswers.map((c) => c.id),
      missingResolutions: 0,
      unexpectedBankChanges: 0,
      grades: [...new Set(reports.flatMap((r) => r.grades))].map((grade) => ({
        grade,
        rewritten: changes.filter((c) => c.id.startsWith(`${grade}-`)).length,
        kept: resolutions.filter(
          (r) => r.id.startsWith(`${grade}-`) && r.disposition === "kept",
        ).length,
      })),
    },
    null,
    2,
  ),
);
