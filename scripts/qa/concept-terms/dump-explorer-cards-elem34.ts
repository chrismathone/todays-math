// 탐험 개념 카드(definition-cards.ts)를 학년별 JSON 으로 내보낸다 — 교재 용어 전수(elem34 트랙)의 짝 맞추기 입력.
// 카드를 옮겨 적지 않고 제품 모듈을 그대로 import 한다(18 §2-2: 규칙을 옮겨 적지 말 것).
// 사용: node node_modules/tsx/dist/cli.mjs scripts/qa/concept-terms/dump-explorer-cards-elem34.ts 3 4 > out.json
// 🔴 보정 전 원본 카드(definitionSourceCards)를 내보낸다 — 누출 검사기가 카드 글을 «우리 글»로 허용하므로, 보정을 입은 카드면 보정 문장이 검사를 비껴간다(D-143 ⑦ · 리드 검토 ④).
import {
  definitionSourceCards,
  definitionUnits,
} from "../../../src/lib/math-explorers/definition-cards";

const grades = process.argv.slice(2).map(Number);
const units = definitionUnits.filter((u) => grades.includes(u.grade));
const unitIds = new Set(units.map((u) => u.id));
const cards = definitionSourceCards
  .filter((c) => unitIds.has(c.unit))
  .map((c) => ({
    id: c.id,
    unit: c.unit,
    grade: units.find((u) => u.id === c.unit)!.grade,
    name: c.name,
    definition: c.definition,
  }));
process.stdout.write(
  JSON.stringify(
    {
      units: units.map((u) => ({ id: u.id, grade: u.grade, title: u.title })),
      cards,
    },
    null,
    1,
  ),
);
