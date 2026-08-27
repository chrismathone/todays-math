/**
 * 「날 글자」가 **제품 렌더러를 거친 뒤에도** 지면에 남는지 실물로 확인한다.
 *
 * 소스를 읽고 「템플릿 리터럴이 역슬래시를 버리니 깨질 것이다」로 끝내지 않는다 —
 * 중간에 전처리가 되살릴 수도 있기 때문이다. 그건 추론이지 측정이 아니다
 * (CLAUDE.md 2026-08-18 「분모를 먼저 검산하라」).
 */
import { renderMathHtml } from "../src/lib/math/renderMathHtml";
import { generateMiddleProblem } from "../src/lib/middle/generate";

const SEED = 20260827;
const KEYS = [
  "2-2|삼각형의 성질|08",
  "2-2|삼각형의 성질|07",
  "2-2|평행선 사이의 선분의 길이의 비|08",
];

for (const key of KEYS) {
  const p = generateMiddleProblem(key, SEED);
  const html = renderMathHtml(p.content);
  const plain = html.replace(/<[^>]+>/g, "");
  console.log(`\n== ${key}`);
  console.log(`  원문 : ${p.content.slice(0, 90)}`);
  console.log(`  지면 : ${plain.slice(0, 90)}`);
  for (const word of ["angle", "circ", "overline", "mathrm"]) {
    const bare = new RegExp(`(?<![\\\\a-zA-Z])${word}(?![a-zA-Z])`).test(plain);
    if (bare) console.log(`  🔴 지면에 «${word}» 가 날 글자로 남았다`);
  }
}
