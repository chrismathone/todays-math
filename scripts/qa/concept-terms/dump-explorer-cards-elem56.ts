// 탐험 개념 카드(definitionUnits · definitionCards)를 학년별 JSON 으로 내보낸다 — 교재 용어 짝 맞추기 입력.
// 실행: npx tsx scripts/qa/concept-terms/dump-explorer-cards-elem56.ts <출력.json> [학년...]
import { writeFileSync } from "node:fs";
import {
  definitionUnits,
  definitionCards,
} from "../../../src/lib/math-explorers/definition-cards";

const [out, ...gradeArgs] = process.argv.slice(2);
const grades = gradeArgs.length ? gradeArgs.map(Number) : [5, 6];
const units = definitionUnits
  .filter((u) => grades.includes(u.grade))
  .map((u) => ({
    id: u.id,
    grade: u.grade,
    title: u.title,
    cards: definitionCards
      .filter((c) => c.unit === u.id)
      .map((c) => ({ id: c.id, name: c.name, definition: c.definition })),
  }));
writeFileSync(out, JSON.stringify(units, null, 2) + "\n", "utf8");
console.log(
  units
    .map((u) => `${u.grade} ${u.id} ${u.title}: ${u.cards.length}`)
    .join("\n"),
);
