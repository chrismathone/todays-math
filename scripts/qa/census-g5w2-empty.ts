/**
 * **비운 자리의 근거를 «세어서» 남긴다** — 초5 물결 2 (1-5 · 1-6 · 2-6, 2026-08-31).
 *
 *     npx tsx scripts/qa/census-g5w2-empty.ts
 *
 * ## 왜 있나
 *
 * `tier-fill-g5-w2.md` §3 이 여덟 칸을 비웠다. 비움은 결정이므로 **무엇을 보고
 * 비웠는지**가 남아야 하고, 「읽고 적은 것」과 「돌려서 나온 것」이 갈려야 한다
 * (2026-08-25 「표에 판정을 적을 때는 그 값이 돌려서 나온 것인지 읽고 적은 것인지
 * 구분하라」). 이 자는 **판정하지 않는다** — 수를 찍을 뿐이다.
 *
 * ## 무엇을 세나
 *
 * ```
 * ㉠ 1-5-1 vs 1-5-2   「합의 «자연수 부분»을 안 말한다」 판에서 답 후보가 몇 개 남나
 *                     진분수 덧셈은 «진분수+진분수는 2보다 작다»가 후보를 둘로 묶고
 *                     «진분수»가 하나를 지운다. 대분수 덧셈에는 **그 상한이 없다.**
 * ㉡ 1-6-2 심화하     그 갈래가 「넓이 → 한 변(완전제곱)」을 **첫 마디로** 쓰나
 *                     — 쓰면 같은 마디로 심화중을 만들 수 없다(그것이 이미 심화하다)
 * ```
 *
 * ⚠️ **1-6-3(넓이의 단위)은 여기서 안 센다.** 그 자리는 세어서가 아니라 **구성으로**
 *    보였다 — 환산이 일대일 대응이라 어떤 마디도 후보를 둘 만들 수 없다. 세면
 *    「후보가 늘 1개」라는 동어반복이 나온다. 보고서에 그렇게 적었다.
 */
import { gcd, simplify } from "../../src/lib/elementary/math";
import {
  elementaryUnits,
  generateElementaryProblem,
} from "../../src/lib/elementary/generate";

import { isDirectScript } from "../import/isDirectScript";

type Fr = readonly [number, number];

const DENS = [3, 4, 5, 6, 8, 9, 10, 12];
/** 「자연수 부분을 안 말한다」에서 사람이 뒤져 볼 만한 자연수 부분의 위끝. */
const WHOLE_CAP = 9;

const add = (x: Fr, y: Fr): Fr =>
  simplify(x[0] * y[1] + y[0] * x[1], x[1] * y[1]);
const sub = (x: Fr, y: Fr): Fr =>
  simplify(x[0] * y[1] - y[0] * x[1], x[1] * y[1]);
const proper = (x: Fr) => x[0] > 0 && x[0] < x[1];
const mixed = (x: Fr) => x[0] > x[1] && x[1] !== 1;

function properAll(): Fr[] {
  const out: Fr[] = [];
  for (const d of DENS)
    for (let i = 1; i < d; i += 1) if (gcd(i, d) === 1) out.push([i, d]);
  return out;
}

/**
 * 「어떤 «kind» 에 `given` 을 더한 값의 **분수 부분**이 `part`」에서 답 후보가 몇 개인가.
 * 후보는 합의 자연수 부분 `k = 0..WHOLE_CAP` 이고, 답이 그 소단원의 수여야 산다.
 */
function candidates(kind: "proper" | "mixed", given: Fr, part: Fr): Fr[] {
  const holds = kind === "proper" ? proper : mixed;
  const out: Fr[] = [];
  for (let k = 0; k <= WHOLE_CAP; k += 1) {
    const sum = add(part, [k, 1]);
    const a = sub(sum, given);
    if (a[0] > 0 && holds(a)) out.push(a);
  }
  return out;
}

function censusSums(): void {
  const props = properAll();
  const bases: Fr[] = [];
  for (const f of props)
    for (const w of [1, 2, 3]) bases.push([w * f[1] + f[0], f[1]]);

  for (const [label, kind, givens] of [
    ["1-5-1 진분수의 덧셈", "proper", props],
    ["1-5-2 대분수의 덧셈", "mixed", [...props, ...bases]],
  ] as const) {
    const tally = new Map<number, number>();
    for (const given of givens) {
      for (const part of props) {
        if (given[1] === part[1]) continue; // 통분이 살아 있어야 이 대단원 계산이다
        const c = candidates(kind, given, part);
        tally.set(c.length, (tally.get(c.length) ?? 0) + 1);
      }
    }
    const total = [...tally.values()].reduce((a, b) => a + b, 0);
    const one = tally.get(1) ?? 0;
    const keys = [...tally.keys()].sort((a, b) => a - b);
    console.log(`\n  ${label} — 짝 ${total}개`);
    for (const k of keys)
      console.log(
        `     답 후보 ${k}개 : ${String(tally.get(k)).padStart(5)} 짝` +
          (k === 1 ? "   ← 소단원 성질이 **한 번에** 굳혔다" : ""),
      );
    console.log(
      `     → «성질 한 번으로 굳는» 짝의 비율 ${((one / total) * 100).toFixed(1)}%`,
    );
  }
}

/** 1-6-2 심화하가 「넓이 → 한 변」 완전제곱 되짚기를 첫 마디로 쓰나. */
function census162(): void {
  const unit = elementaryUnits().find(
    (u) => u.grade === "초5" && u.section.startsWith("1-6-2 "),
  )!;
  const seeds = [
    20260821, 7, 1234, 99991, 20260822, 555, 31337, 4242, 11, 202, 3003, 40404,
    5, 66, 777, 8888,
  ];
  let square = 0;
  for (const s of seeds) {
    const p = generateElementaryProblem(unit, s, "심화하");
    const sol = p.solution ?? "";
    // 「$9\times9=81$」 꼴 — 같은 수를 두 번 곱해 넓이를 되짚는 자리.
    if (/(\d+)\\times\1=/.test(sol)) square += 1;
  }
  console.log(
    `\n  1-6-2 심화하 — 「넓이 → 한 변(완전제곱)」을 첫 마디로 쓴 씨앗 ${square}/${seeds.length}`,
  );
  console.log(
    "     → 그 마디로 심화중을 만들면 **심화하의 첫 걸음**이 된다(토대 §2.1 §4⑵).",
  );
}

function main(): void {
  console.log("비운 자리의 근거 — 초5 물결 2 (판정하지 않는다, 세기만 한다)");
  censusSums();
  census162();
  console.log(
    "\n⚠️ 1-6-3(넓이의 단위)은 세지 않는다 — 환산이 일대일이라 어떤 마디도 후보를",
  );
  console.log(
    "   둘 만들 수 없다. 그것은 세어서가 아니라 **구성으로** 보인 것이다.",
  );
}

if (isDirectScript(import.meta.url)) main();
