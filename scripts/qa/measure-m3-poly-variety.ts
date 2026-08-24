/**
 * 4C 다항식 40유형의 **발문 변형 폭** 실측 — 시험의 하한을 손으로 짚지 않기 위해.
 *
 *   npx tsx scripts/qa/measure-m3-poly-variety.ts
 *
 * 시험이 쓰는 하한(`MIN_CONTENTS`)은 여기서 잰 값에서 온다. 「40변형에서 몇 가지
 * 발문이 나오나」를 세고, 그 값보다 한 단계 낮은 수를 하한으로 쓴다.
 */
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M3_POLY } from "../../src/lib/middle/m3Poly";

function main(): void {
  const rows: [string, number][] = [];
  for (const e of M3_POLY) {
    const seen = new Set<string>();
    for (let v = 0; v < 40; v += 1) {
      seen.add(generateMiddleProblem(e.key, 20260824, v).content);
    }
    rows.push([e.key, seen.size]);
  }
  for (const [key, n] of rows) console.log(`${String(n).padStart(3)}  ${key}`);
  console.log(`\n최저 ${Math.min(...rows.map((r) => r[1]))}`);
}

main();
