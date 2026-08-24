/**
 * 4C 다항식 40유형의 **지면 냄새** 훑기 — 시험이 못 보는 「보기 흉한 글자」를 센다.
 *
 *   npx tsx scripts/qa/scan-m3-poly-smells.ts [씨앗수]
 *
 * 왜 따로 두나: 시험은 **값이 맞는가**를 잰다. `1x`·`+-`·`(x+0)` 같은 것은 값이
 * 맞아도 지면이 흉하고, 값 검사로는 구조적으로 안 잡힌다. 그리고 이 저장소가
 * 여러 번 적었듯 **표본을 눈으로 봐야** 보이는 부류라, 눈으로 볼 후보를 좁힌다.
 */
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M3_POLY } from "../../src/lib/middle/m3Poly";

/** 지면에 나오면 안 되는 모양 — 값이 맞아도 흉하다. */
const SMELLS: [string, RegExp][] = [
  ["+- 나 -- 가 붙었다", /\+-|--/],
  ["계수 1 을 적었다", /(?<![\d.])1[a-zA-Z](?![a-zA-Z0-9])/],
  ["계수 0 을 적었다", /(?<![\d.])0[a-zA-Z]/],
  ["지수 1 을 적었다", /\^1(?!\d)/],
  ["지수 0 을 적었다", /\^0/],
  ["상수 0 을 더했다", /[+-]0(?![\d.])/],
  ["빈 괄호·홑괄호", /\(\)|\((\w)\)(?!\^)/],
  ["연산자가 붙어 있다", /[+\-*/]\s*[*/]/],
  ["곱셈표 뒤가 비었다", /\\times\s*(?:\$|$)/],
];

function main(): void {
  const seedCount = Number(process.argv[2] ?? 200);
  const hits = new Map<string, { key: string; text: string }[]>();
  for (let s = 0; s < seedCount; s += 1) {
    for (const e of M3_POLY) {
      for (let v = 0; v < 3; v += 1) {
        const p = generateMiddleProblem(e.key, s * 977 + 13, v);
        for (const [name, text] of [
          ["발문", p.content],
          ["정답", p.answer],
          ["해설", p.solution],
        ] as const) {
          for (const [label, re] of SMELLS) {
            if (!re.test(text)) continue;
            const list = hits.get(label) ?? [];
            if (list.length < 4) {
              list.push({ key: `${e.key} ${name}`, text });
            }
            hits.set(label, list);
          }
        }
      }
    }
  }
  if (hits.size === 0) {
    console.log(`냄새 0 (씨앗 ${seedCount} × 3변형 × ${M3_POLY.length}유형)`);
    return;
  }
  for (const [label, list] of hits) {
    console.log(`\n── ${label}`);
    for (const h of list) console.log(`   ${h.key}\n     ${h.text}`);
  }
  process.exitCode = 1;
}

main();
