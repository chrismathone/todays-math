// 탐험 개념 카드(definitionUnits · definitionSourceCards)를 학년별 JSON 으로 내보낸다 — 교재 용어 짝 맞추기 입력.
// 실행: npx tsx scripts/qa/concept-terms/dump-explorer-cards-elem56.ts <출력.json> [학년...]
import { writeFileSync } from "node:fs";
// 🔴 보정 전 원본 카드(definitionSourceCards)를 내보낸다 — 누출 검사기가 카드 글을 «우리 글»로 허용하므로, 보정을 입은 카드면 보정 문장이 검사를 비껴간다(D-143 ⑦ · 리드 검토 ④).
import {
  definitionUnits,
  definitionSourceCards,
} from "../../../src/lib/math-explorers/definition-cards";

const [out, ...gradeArgs] = process.argv.slice(2);
const grades = gradeArgs.length ? gradeArgs.map(Number) : [5, 6];
const units = definitionUnits
  .filter((u) => grades.includes(u.grade))
  .map((u) => ({
    id: u.id,
    grade: u.grade,
    title: u.title,
    cards: definitionSourceCards
      .filter((c) => c.unit === u.id)
      .map((c) => ({ id: c.id, name: c.name, definition: c.definition })),
  }));
writeFileSync(out, JSON.stringify(units, null, 2) + "\n", "utf8");
console.log(
  units
    .map((u) => `${u.grade} ${u.id} ${u.title}: ${u.cards.length}`)
    .join("\n"),
);
