// 탐험 개념 카드(학년 7·8)를 JSON 으로 꺼낸다 — 트랙 mida(개념원리 중1-1 · 1-2 · 2-1) 짝 맞추기용.
// ① 무엇을 하나: definitionUnits/definitionSourceCards 에서 id · name · definition 만 뽑아 stdout 으로 낸다.
// ② 왜: 카드 목록을 손으로 옮겨 적으면 세는 쪽과 대조하는 쪽이 같이 눈이 먼다(18 §2-4) — 제품 모듈을 직접 읽는다.
// ③ 무엇을 안 바꾸나: 아무것도 안 쓴다. 실행: npx tsx scripts/qa/concept-terms/dump-explorer-cards-mida.ts > out.json
// 🔴 보정 전 원본 카드(definitionSourceCards)를 내보낸다 — 누출 검사기가 카드 글을 «우리 글»로 허용하므로, 보정을 입은 카드면 보정 문장이 검사를 비껴간다(D-143 ⑦ · 리드 검토 ④).
import {
  definitionUnits,
  definitionSourceCards,
} from "../../../src/lib/math-explorers/definition-cards";

const grades = process.argv.slice(2).map(Number).filter(Boolean);
const want = grades.length ? grades : [7, 8];
const out = definitionUnits
  .filter((u) => want.includes(u.grade))
  .map((u) => ({
    id: u.id,
    grade: u.grade,
    title: u.title,
    cards: definitionSourceCards
      .filter((c) => c.unit === u.id)
      .map((c) => ({ id: c.id, name: c.name, definition: c.definition })),
  }));
process.stdout.write(JSON.stringify(out, null, 1) + "\n");
