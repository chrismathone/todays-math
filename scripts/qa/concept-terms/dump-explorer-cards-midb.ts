/**
 * 탐험 개념 카드(`definitionUnits` · `definitionCards`)를 JSON 으로 꺼낸다 — 트랙 midb(중2·중3).
 *
 *   npx tsx scripts/qa/concept-terms/dump-explorer-cards-midb.ts <출력.json>
 *
 * ① 무엇을 하나: 제품 모듈을 **불러서** 카드 목록을 그대로 쓴다(학년 · 단원 · 이름 · 정의).
 * ② 왜: 카드를 손으로 옮겨 적으면 대조하는 쪽이 원본과 어긋난다(18 §2-4). 제품 함수를 부른다.
 * ③ 안 바꾸는 것: `src/**` 는 읽기만 한다. 출력 파일 하나만 쓴다.
 */
import { writeFileSync } from "node:fs";
import {
  definitionCards,
  definitionUnits,
} from "../../../src/lib/math-explorers/definition-cards";

const out = process.argv[2];
if (!out) throw new Error("출력 경로를 주세요");
const units = definitionUnits.map((u) => ({
  id: u.id,
  grade: u.grade,
  title: u.title,
}));
const cards = definitionCards.map((c) => ({
  id: c.id,
  unit: c.unit,
  grade: definitionUnits.find((u) => u.id === c.unit)!.grade,
  name: c.name,
  definition: c.definition,
  note: c.note,
}));
writeFileSync(out, JSON.stringify({ units, cards }, null, 2), "utf8");
console.log(`units ${units.length} · cards ${cards.length} → ${out}`);
