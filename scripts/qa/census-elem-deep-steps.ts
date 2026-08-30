/**
 * census — **심화 해설의 «계산이 든 걸음» 수**를 세고 같은 소단원 응용과 견준다.
 *
 *   npx tsx scripts/qa/census-elem-deep-steps.ts
 *
 * ## 왜 이 축이 따로 필요한가
 *
 * `probe-elem-tier-4dan.ts` 는 **발문의 표지**를 본다. 그 축에는 사각지대가 둘 있다:
 *
 *   ㉠ 표지가 붙어도 한 걸음일 수 있다 — 「어떤 두 수의 공약수를 모두 쓰면 …
 *      최대공약수를 구하시오」는 「어떤 두 수」 표지를 갖지만 **가장 큰 수를 고르면 끝**이다.
 *      표지 축은 그런 갈래를 아예 사람 눈에 안 보낸다(«표지있음» 으로 통과시킨다).
 *   ㉡ 반대로 표지가 없어도 두 걸음일 수 있다(그건 원장이 사람 판정으로 받는다).
 *
 * 이 census 는 **발문이 아니라 해설**을 본다 — 표지와 겹치지 않는 다른 축이다.
 * 「계산이 든 걸음」의 잣대는 `src/lib/elementary/make.ts` 의 것과 **같은 것을 쓴다**
 * (`countCalcSteps`). 두 벌을 두면 한쪽만 고쳐도 아무도 모른다.
 *
 * ## 이것은 판정기가 아니다
 *
 * 수를 늘어놓기만 한다. 「걸음이 둘 미만이면 결함」이라고 **단정하지 않는다** —
 * 한 줄로 적은 두 걸음이 있고(초6 1-4-6 심화가 그렇다), 걸음이 둘이어도 응용보다
 * 쉬울 수 있다. 축을 관문에 세울지는 이 분포를 보고 정한다
 * (2026-08-23 「거짓 경보 6건 중 4건이 거짓이라 축을 버렸다」와 같은 자리).
 */
import { readFileSync } from "node:fs";

import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import { countCalcSteps } from "../../src/lib/elementary/make";

import { TIER4_LEDGER_PATH, type Tier4Ledger, marksOf } from "./tier4Rules";

const SEEDS = Array.from({ length: 12 }, (_, i) => i * 8117 + 3);
const ledger = JSON.parse(
  readFileSync(TIER4_LEDGER_PATH, "utf-8"),
) as Tier4Ledger;

type Row = {
  key: string;
  deepMin: number;
  deepMed: number;
  applyMed: number;
  sample: string;
  /** 표지 축이 이 갈래를 사람에게 보냈나 — «전부 표지있음» 이면 아무도 안 봤다. */
  전부표지: boolean;
};

const med = (v: number[]) =>
  [...v].sort((x, y) => x - y)[Math.floor(v.length / 2)]!;

const rows: Row[] = [];
for (const u of elementaryUnits()) {
  if (!supportedTiers(u).includes("심화하")) continue;
  const d: number[] = [];
  const a: number[] = [];
  let sample = "";
  let worst = Number.POSITIVE_INFINITY;
  let bare = 0;
  for (const s of SEEDS) {
    const deep = generateElementaryProblem(u, s, "심화하");
    const n = countCalcSteps(deep.solution);
    d.push(n);
    a.push(countCalcSteps(generateElementaryProblem(u, s, "응용").solution));
    if (marksOf(deep.content).length === 0) bare += 1;
    if (n < worst) {
      worst = n;
      sample = deep.content.replace(/\n+/g, " ").slice(0, 66);
    }
  }
  rows.push({
    key: `${u.grade}|${u.section.split(" ")[0]}`,
    deepMin: Math.min(...d),
    deepMed: med(d),
    applyMed: med(a),
    sample,
    전부표지: bare === 0,
  });
}

const 한걸음 = rows.filter((r) => r.deepMin < 2);
const 응용보다낮음 = rows.filter((r) => r.deepMed < r.applyMed);

console.log(`심화 갈래 ${rows.length}개 · 씨앗 ${SEEDS.length}개`);
console.log(`  · 어떤 씨앗에서 **계산 걸음이 2 미만**: ${한걸음.length}`);
console.log(`  · 심화 중앙값 < 응용 중앙값: ${응용보다낮음.length}`);

console.log(`\n── 계산 걸음 2 미만 (최솟값 오름차순) ──`);
for (const r of [...한걸음].sort((x, y) => x.deepMin - y.deepMin)) {
  console.log(
    `  ${r.key.padEnd(11)} 최소 ${r.deepMin} · 중앙 ${r.deepMed} (응용 ${r.applyMed})  ${r.sample}`,
  );
}

console.log(`\n── 심화 중앙값 < 응용 중앙값 ──`);
for (const r of 응용보다낮음) {
  console.log(
    `  ${r.key.padEnd(11)} 심화 ${r.deepMed} · 응용 ${r.applyMed}  ${r.sample}`,
  );
}

/* ── 표지 축의 사각지대 — **아무도 안 본 갈래** 중 걸음이 적은 것 ──
 *
 * 표지 축은 「씨앗 전부가 표지를 가진 갈래」를 사람에게 **안 보낸다.** 그 갈래가
 * 한 걸음이면 그 결함은 어느 축에도 안 걸린다. 여기서 그 교집합을 세어,
 * 「지금까지 센 잔고가 **하한**」이라는 것을 수로 남긴다.
 */
const 사각지대 = rows.filter((r) => r.전부표지 && r.deepMin < 2);
const 검토됨 = new Set(Object.keys(ledger.초등));
console.log(
  `\n── 표지 축이 사람에게 **안 보낸** 갈래(전 씨앗 표지있음) 중 계산 걸음 2 미만: ${사각지대.length} ──`,
);
console.log(
  `   (원장에 행이 있는 것은 ${사각지대.filter((r) => 검토됨.has(r.key)).length}개뿐이다 — 나머지는 아무도 안 봤다)`,
);
for (const r of [...사각지대]
  .sort((x, y) => x.deepMin - y.deepMin)
  .slice(0, 40)) {
  console.log(
    `  ${r.key.padEnd(11)} 최소 ${r.deepMin} · 중앙 ${r.deepMed} (응용 ${r.applyMed})  ${r.sample}`,
  );
}
