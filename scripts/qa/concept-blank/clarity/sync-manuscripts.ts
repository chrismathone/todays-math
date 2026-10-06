/** Offline sync of reviewed definition changes into the static teaching scripts.
 * Records each changed turn while keeping the first-manuscript baseline intact.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CONCEPT_BLANK_GRADES } from "@/lib/concept-blank/sections";
import {
  materializeGrade,
  serializeScripts,
} from "@/lib/textbook/scripts/materialize";
import type { StaticCorrection } from "@/lib/textbook/scripts/corrections";
import type { ConceptTeachingScript } from "@/lib/textbook/scripts/types";

const reportDirectory = resolve(
  "docs/planning/tracks/reports/concept-cloze-fix-all-20261006",
);
const directory = resolve("src/lib/textbook/scripts");
const read = <T>(file: string): T =>
  JSON.parse(readFileSync(file, "utf8")) as T;
const applied = read<{ changes: { id: string; reason: string }[] }>(
  resolve(reportDirectory, "applied-changes.json"),
);
const changed = new Map(applied.changes.map((row) => [row.id, row]));
assert.ok(changed.size > 0, "No reviewed changes to sync");
const ledgerPath = resolve(directory, "static-corrections.json");
const ledger = read<{
  reviewedOn: string;
  review: string;
  authority: string;
  corrections: StaticCorrection[];
}>(ledgerPath);
const codeFor: Record<string, string> = {
  초3: "e3",
  초4: "e4",
  초5: "e5",
  초6: "e6",
  중1: "m1",
  중2: "m2",
  중3: "m3",
};
const pending: { file: string; content: string }[] = [];
const turnChanges: {
  grade: string;
  sectionKey: string;
  turnIndex: number;
  entryId: string;
  correctionId: string;
  old: string;
  new: string;
}[] = [];
for (const grade of CONCEPT_BLANK_GRADES) {
  const file = resolve(directory, `${codeFor[grade]}.json`);
  const old = read<ConceptTeachingScript[]>(file);
  const next = materializeGrade(grade);
  const withoutText = (scripts: ConceptTeachingScript[]) =>
    scripts.map((script) => ({
      ...script,
      dialogue: script.dialogue.map((turn) => ({ ...turn, markdown: "" })),
    }));
  assert.deepEqual(
    withoutText(next),
    withoutText(old),
    `${grade}: non-text script change`,
  );
  for (let s = 0; s < next.length; s++) {
    const script = next[s]!;
    for (let t = 0; t < script.dialogue.length; t++) {
      const before = old[s]!.dialogue[t]!;
      const after = script.dialogue[t]!;
      if (before.markdown === after.markdown) continue;
      assert.equal(after.source.kind, "bank-concept");
      if (after.source.kind !== "bank-concept")
        throw new Error("Unexpected source");
      const entryId = after.source.entryId;
      assert.ok(
        changed.has(entryId),
        `Unreviewed manuscript change: ${entryId}`,
      );
      const existing = ledger.corrections.find(
        (c) => c.sectionKey === script.sectionKey && c.turnIndex === t,
      );
      let correctionId: string;
      if (existing) {
        assert.equal(existing.kind, "bank-definition");
        assert.equal(existing.new, before.markdown);
        assert.deepEqual(existing.source, after.source);
        existing.new = after.markdown;
        existing.reason += ` 전 학년 명료성 교정으로 다시 동기화했다: ${changed.get(entryId)!.reason}`;
        correctionId = existing.id;
      } else {
        correctionId = `SC-${String(ledger.corrections.length + 1).padStart(3, "0")}`;
        ledger.corrections.push({
          id: correctionId,
          sectionKey: script.sectionKey,
          turnIndex: t,
          source: after.source,
          kind: "bank-definition",
          old: before.markdown,
          new: after.markdown,
          reason: `Codex·Claude가 교정한 공용 은행 정의를 교재 대본에 동기화했다: ${changed.get(entryId)!.reason}`,
        });
      }
      turnChanges.push({
        grade,
        sectionKey: script.sectionKey,
        turnIndex: t,
        entryId,
        correctionId,
        old: before.markdown,
        new: after.markdown,
      });
    }
  }
  pending.push({ file, content: serializeScripts(next) });
}
const reportPath = resolve(reportDirectory, "manuscript-changes.json");
const previous = existsSync(reportPath)
  ? read<{ turnChanges: typeof turnChanges }>(reportPath).turnChanges
  : [];
const history = new Map(
  previous.map((row) => [`${row.sectionKey}|${row.turnIndex}`, row]),
);
for (const row of turnChanges) {
  const key = `${row.sectionKey}|${row.turnIndex}`;
  const prior = history.get(key);
  if (prior) {
    assert.equal(prior.new, row.old, "Manuscript history chain mismatch");
    history.set(key, { ...row, old: prior.old });
  } else {
    history.set(key, row);
  }
}
if (turnChanges.length > 0) {
  ledger.reviewedOn = "2026-10-06";
  ledger.review =
    "AI 편집 검수 — 기존 교정을 보존하고 전 학년 공용 은행의 문항별 Codex·Claude 교차 검토에 맞춰 설명·예제 속 정의·확인 답을 동기화했다. 사람이 읽은 검수가 아니다.";
  const authority =
    " · 2026-10-06 run_82506ef814c5: 사용자 전 학년 완전 교정·적용 지시.";
  if (!ledger.authority.includes(authority)) ledger.authority += authority;
}
pending.push({
  file: ledgerPath,
  content: JSON.stringify(ledger, null, 2) + "\n",
});
const written = process.argv.includes("--write") && turnChanges.length > 0;
if (written) {
  for (const item of pending) writeFileSync(item.file, item.content, "utf8");
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        turnChanges: [...history.values()],
        correctionCount: ledger.corrections.length,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
}
console.log(
  JSON.stringify(
    {
      changedTurns: turnChanges.length,
      correctionCount: ledger.corrections.length,
      byGrade: CONCEPT_BLANK_GRADES.map((grade) => ({
        grade,
        changedTurns: turnChanges.filter((row) => row.grade === grade).length,
      })),
      written,
    },
    null,
    2,
  ),
);
