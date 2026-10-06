/** Compile reviewed grade ledgers into the applied-content manifest. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { splitBlankSentence } from "@/contracts/conceptBlank.contract";
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
  changes: Change[];
  resolutions: Resolution[];
};
const directory = resolve(
  "docs/planning/tracks/reports/concept-cloze-fix-all-20261006",
);
const read = <T>(file: string): T =>
  JSON.parse(readFileSync(resolve(directory, file), "utf8")) as T;
const manifest = read<{ sourceCommit: string; reports: string[] }>(
  "manifest.json",
);
const reports = manifest.reports.map((file) => read<Report>(file));
const original = JSON.parse(
  readFileSync(
    resolve(
      "docs/planning/tracks/reports/concept-cloze-all-20261006/findings.json",
    ),
    "utf8",
  ),
) as {
  findings: { id: string; status: string }[];
};
const originalById = new Map(original.findings.map((row) => [row.id, row]));
const byId = new Map(
  Object.entries(BANK_PARTS).flatMap(([part, bank]) =>
    bank.concepts.map((item) => [item.id, { part, item }] as const),
  ),
);
const student = (definition: string) =>
  splitBlankSentence(definition)
    .map((piece) => (piece.kind === "key" ? "□" : piece.text))
    .join("");
const answers = (definition: string) =>
  splitBlankSentence(definition)
    .filter((piece) => piece.kind === "key")
    .map((piece) => piece.text);
const changes = reports
  .flatMap((report) => report.changes)
  .map((change) => {
    const { part, item } = byId.get(change.id)!;
    assert.equal(item.definition, change.after);
    const beforeAnswers = answers(change.before);
    const afterAnswers = answers(change.after);
    return {
      ...change,
      grade: part.replace(/plus$/, ""),
      part,
      section: item.section,
      term: item.term,
      beforeStudent: student(change.before),
      afterStudent: student(change.after),
      beforeAnswers,
      afterAnswers,
      answerTextChanged:
        JSON.stringify(beforeAnswers) !== JSON.stringify(afterAnswers),
    };
  });
const resolutions = reports
  .flatMap((report) => report.resolutions)
  .map((row) => ({
    ...row,
    grade: byId.get(row.id)!.part.replace(/plus$/, ""),
    initialStatus: originalById.get(row.id)?.status ?? "supplemental",
  }));
assert.equal(new Set(changes.map((row) => row.id)).size, changes.length);
assert.equal(
  new Set(resolutions.map((row) => row.id)).size,
  resolutions.length,
);
assert.ok(
  original.findings.every((row) => resolutions.some((r) => r.id === row.id)),
);
const summary = {
  sourceCommit: manifest.sourceCommit,
  originalAuditItems: original.findings.length,
  supplementalIds: resolutions
    .filter((row) => !originalById.has(row.id))
    .map((row) => row.id),
  resolved: resolutions.length,
  rewritten: changes.length,
  kept: resolutions.filter((row) => row.disposition === "kept").length,
  unresolved: 0,
  changedAnswerTextCount: changes.filter((row) => row.answerTextChanged).length,
  changedAnswerIds: changes
    .filter((row) => row.answerTextChanged)
    .map((row) => row.id),
  grades: ["e3", "e4", "e5", "e6", "m1", "m2", "m3"].map((grade) => ({
    grade,
    rewritten: changes.filter((row) => row.grade === grade).length,
    kept: resolutions.filter(
      (row) => row.grade === grade && row.disposition === "kept",
    ).length,
  })),
  scope:
    "초3~중3 C형 문장 교정; 1차 지적과 추가 대단원 충돌. 성취기준 전수 검증이 아니다.",
  studentRecordsChanged: false,
};
writeFileSync(
  resolve(directory, "applied-changes.json"),
  JSON.stringify(
    {
      sourceCommit: manifest.sourceCommit,
      changes,
      resolutions,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);
writeFileSync(
  resolve(directory, "summary.json"),
  JSON.stringify(summary, null, 2) + "\n",
  "utf8",
);
console.log(
  JSON.stringify(
    {
      ...summary,
      changedAnswerIds: `[${summary.changedAnswerIds.length} IDs recorded]`,
    },
    null,
    2,
  ),
);
