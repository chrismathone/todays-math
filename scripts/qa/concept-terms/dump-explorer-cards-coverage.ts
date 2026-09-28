// 탐험 개념 카드 230장을 활동 재료 칸까지 통째로 JSON 으로 내보낸다 — 교재 용어 포함률 · 대체 판단(트랙 coverage) 입력.
// 실행: npx tsx scripts/qa/concept-terms/dump-explorer-cards-coverage.ts <출력.json>
// 원본 definition-content.ts 는 읽기만 한다(PROVENANCE SHA).
import { writeFileSync } from "node:fs";
// 🔴 보정 전 원본 카드(definitionSourceCards)를 내보낸다 — 누출 검사기가 카드 글을 «우리 글»로 허용하므로, 보정을 입은 카드면 보정 문장이 검사를 비껴간다(D-143 ⑦ · 리드 검토 ④).
import {
  definitionUnits,
  definitionSourceCards,
} from "../../../src/lib/math-explorers/definition-cards";

const [out] = process.argv.slice(2);
if (!out) throw new Error("출력 경로가 필요합니다.");
const units = definitionUnits.map((u) => ({
  id: u.id,
  grade: u.grade,
  title: u.title,
  cards: definitionSourceCards
    .filter((c) => c.unit === u.id)
    .map((c) => ({
      id: c.id,
      name: c.name,
      definition: c.definition,
      pieces: c.pieces,
      words: c.words,
      exampleTitle: c.exampleTitle,
      examples: c.examples,
      trap: c.trap,
      truth: c.truth,
      explanation: c.explanation,
      note: c.note,
      prerequisites: c.prerequisites ?? [],
    })),
}));
writeFileSync(out, JSON.stringify(units, null, 2) + "\n", "utf8");
const n = units.reduce((s, u) => s + u.cards.length, 0);
console.log(`단원 ${units.length} · 카드 ${n}`);
