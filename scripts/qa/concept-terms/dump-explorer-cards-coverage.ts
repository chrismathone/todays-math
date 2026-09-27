// 탐험 개념 카드 230장을 활동 재료 칸까지 통째로 JSON 으로 내보낸다 — 교재 용어 포함률 · 대체 판단(트랙 coverage) 입력.
// 실행: npx tsx scripts/qa/concept-terms/dump-explorer-cards-coverage.ts <출력.json>
// 원본 definition-content.ts 는 읽기만 한다(PROVENANCE SHA).
import { writeFileSync } from "node:fs";
import {
  definitionUnits,
  definitionCards,
} from "../../../src/lib/math-explorers/definition-cards";

const [out] = process.argv.slice(2);
if (!out) throw new Error("출력 경로가 필요합니다.");
const units = definitionUnits.map((u) => ({
  id: u.id,
  grade: u.grade,
  title: u.title,
  cards: definitionCards
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
