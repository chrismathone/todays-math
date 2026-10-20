import type { UnitSeed } from "../../../prisma/seed-data/units";

import type { ElemTierMap } from "./difficulty";
import { expr, n as num, polyName, sino, unitNum } from "./format";
import { fig, make, makeDeep } from "./make";
import { addFrac, divFrac, fmtFrac, gcd, lcm, mulFrac, subFrac } from "./math";
import {
  answerPrintedOnPage,
  forwardReachable,
  pageNumbers,
  pmOneStepReachable,
  rat,
  type Rat,
} from "./forwardReach";
import { intBetween, pick } from "./rng";
// 🔴 「로/으로」는 **판정기가 쓰는 그 표**(`JOSA_FINAL`)에서 온다 — 두 벌로 적지 않는다.
import { lastSpokenNumber, numRo } from "./rules";
import type { ChapterHandler, ElemForm, ElemProblem, Rng } from "./types";
import { lazyTable } from "./lazyTable";

/**
 * 초6 생성기.
 *
 * 원장님 육안 검수(2026-08-22, `docs/planning/tracks/elem-engine-review-20260822.md`)로 다시 짰다.
 * 규칙은 `rules.ts` 가 전량에 대고, 여기서는 그 규칙이 **지면에서 뜻이 통하는 모양**으로 나오게 한다.
 *
 * - R1 모든 수는 KaTeX (`num`·`expr`·`unitNum`). **수 하나가 답이면 답은 `$수$` 한 덩어리**로 —
 *   단위·「개」·「명」을 붙이지 않는다(발문이 「몇 개인가?」로 이미 말한다).
 *   `elementaryEngine.test.ts` 의 `answerNumber` 가 그 모양을 요구한다(D-66).
 * - R2 분수 답은 대분수 (`fmtFrac`) — 소수는 **정수 배율로** 만들어 부동소수점을 안 거친다
 * - R4 도형 이름은 한자 수사 (`polyName`·`sino`)
 * - R5 소단원이 다르면 **묻는 것**이 다르다 (같은 대단원 안에서 발문이 겹치지 않는다)
 * - R6 묻는 값을 그림이 그대로 적어 주지 않는다
 *   (원기둥·구는 **발문이** 반지름을 주므로 지름을 묻는다. 그림은 치수를 **안 적는다** —
 *    원장님 확정 2026-08-22 「문제에 굳이 있는데 라벨로 이중표기」. 09 §4-20-b.
 *    ⚠️ 예전 주석은 「그림이 치수를 적으므로」라고 적어 두었는데, 그걸 이 문항이 성립하는
 *    **근거**로 읽으면 라벨을 되살리게 된다. 근거는 그림이 아니라 **발문**이다.)
 * - R9 씨앗을 바꾸면 수·소재·도형이 바뀐다
 */

/**
 * 받침에 따라 조사를 고른다 — 지면에 「사과을」·「겨울를」이 나가지 않게.
 *
 * 수식 뒤에는 쓰지 않는다. `$4:7$` 은 「사 대 칠」로 읽혀 글자만 봐서는 받침을 알 수 없다 —
 * 그런 자리는 「다음 …\n\n$식$」 처럼 조사가 필요 없는 문장으로 쓴다.
 */
function josa(word: string, withFinal: string, withoutFinal: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const final = code >= 0 && code <= 11171 ? code % 28 : 0;
  // «(으)로» 는 ㄹ 받침(8)도 «로» 다(«꿀로») — `format.ts` `josa` 와 같은 규칙.
  const hasFinal = final !== 0 && !(final === 8 && withFinal === "으로");
  return hasFinal ? withFinal : withoutFinal;
}

/** 정수 배율로 들고 다닌 소수를 글자로. **부동소수점을 거치지 않는다**(R2). */
function decStr(scaled: number, digits: number): string {
  if (digits <= 0) return String(scaled);
  const p = 10 ** digits;
  return `${Math.trunc(scaled / p)}.${String(scaled % p).padStart(digits, "0")}`;
}

/**
 * 분모와 서로소인 분자를 고른다 — **발문의 분수는 기약분수로 쓴다.**
 *
 * `2\frac{2}{6}\div\frac{6}{5}` 처럼 약분이 남은 분수는 초등 교재에 안 나온다.
 * `lo` 를 `den+1` 로 주면 가분수가 되는데, `gcd(den+1, den)=1` 이라 폴백도 늘 안전하다.
 */
function coprimeTop(rng: Rng, den: number, lo = 1, hi = den - 1): number {
  const pool: number[] = [];
  for (let i = lo; i <= hi; i += 1) if (gcd(i, den) === 1) pool.push(i);
  return pool.length > 0 ? pick(rng, pool) : lo;
}

/** ×100 으로 들고 다닌 수를 **필요한 자릿수만큼** 적는다. `630` → `6.3`, `2700` → `27`. */
function fromCents(cents: number): string {
  if (cents % 100 === 0) return String(cents / 100);
  if (cents % 10 === 0) return decStr(cents / 10, 1);
  return decStr(cents, 2);
}

// ───────────────────────── 1-1 분수의 나눗셈 ─────────────────────────

function fracDiv61(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;

  if (s.includes("(자연수)÷(자연수)")) {
    const b = intBetween(rng, 3, 9);
    const a = intBetween(rng, 2, b - 1);
    const done = fmtFrac(a, b);
    const raw = `\\frac{${a}}{${b}}`;
    const chain =
      gcd(a, b) === 1 ? `${a}\\div${b}=${raw}` : `${a}\\div${b}=${raw}=${done}`;
    return make(
      unit,
      `${expr(`${a}\\div${b}`)} 의 몫을 분수로 나타내시오.`,
      expr(done),
      `나누어지는 수를 분자, 나누는 수를 분모로 씁니다. ${expr(chain)}`,
    );
  }

  if (s.includes("(대분수)")) {
    const k = intBetween(rng, 2, 6);
    const d = intBetween(rng, 2, 8);
    const top = coprimeTop(rng, d);
    const w = intBetween(rng, 1, 4);
    const imp = w * d + top;
    const [p, q] = divFrac(imp, d, k, 1);
    return make(
      unit,
      `다음을 계산하시오.\n\n${expr(`${w}\\frac{${top}}{${d}}\\div${k}=\\square`)}`,
      expr(fmtFrac(p, q)),
      `대분수를 가분수로 고칩니다. ${expr(`${w}\\frac{${top}}{${d}}=\\frac{${imp}}{${d}}`)}` +
        ` 이므로 분자는 그대로 두고 분모에 나누는 수를 곱합니다. ` +
        `${expr(`\\frac{${imp}}{${d}\\times${k}}=${fmtFrac(p, q)}`)}`,
    );
  }

  // 1-1-2 (분수)÷(자연수) — 원장님이 잡으신 자리다.
  // 「분자에 1/k 를 곱합니다」 라고 써 놓고 식은 분모에 곱하고 있었다. 초등은 **분모에 곱한다**.
  const k = intBetween(rng, 2, 7);
  const d = intBetween(rng, 2, 9);
  const top = coprimeTop(rng, d);
  const [p, q] = divFrac(top, d, k, 1);
  return make(
    unit,
    `다음을 계산하시오.\n\n${expr(`\\frac{${top}}{${d}}\\div${k}=\\square`)}`,
    expr(fmtFrac(p, q)),
    `분자는 그대로 두고 분모에 나누는 수를 곱합니다. ` +
      `${expr(`\\frac{${top}}{${d}}\\div${k}=\\frac{${top}}{${d}\\times${k}}=${fmtFrac(p, q)}`)}`,
  );
}

// ───────────────────────── 1-2 각기둥과 각뿔 ─────────────────────────

function prismPyr(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  const sides = intBetween(rng, 3, 8);
  const base = polyName(sides);
  const prismName = `${sino(sides)}각기둥`;
  const pyrName = `${sino(sides)}각뿔`;
  const prismFig = fig("prism", { sides, h: 3 });
  const pyrFig = fig("pyramid", { sides, h: 3 });

  if (s.includes("각뿔의 이름")) {
    const which = pick(rng, ["이름", "꼭짓점", "모서리", "면"]);
    if (which === "이름") {
      return make(
        unit,
        `밑면이 ${base}인 각뿔의 이름을 쓰시오.`,
        pyrName,
        `각뿔의 이름은 밑면의 모양으로 정합니다. 밑면이 ${base}이므로 ${pyrName}입니다.`,
        pyrFig,
      );
    }
    if (which === "꼭짓점") {
      return make(
        unit,
        `${pyrName}의 꼭짓점은 모두 몇 개인가?`,
        num(sides + 1),
        `밑면의 꼭짓점 ${num(sides)}개에 각뿔의 꼭짓점 ${num(1)}개를 더합니다. ` +
          `${expr(`${sides}+1=${sides + 1}`)}`,
        pyrFig,
      );
    }
    if (which === "모서리") {
      return make(
        unit,
        `${pyrName}의 모서리는 모두 몇 개인가?`,
        num(2 * sides),
        `밑면의 모서리 ${num(sides)}개와 옆면의 모서리 ${num(sides)}개를 더합니다. ` +
          `${expr(`${sides}+${sides}=${2 * sides}`)}`,
        pyrFig,
      );
    }
    return make(
      unit,
      `${pyrName}의 면은 모두 몇 개인가?`,
      num(sides + 1),
      `밑면 ${num(1)}개와 옆면 ${num(sides)}개를 더합니다. ${expr(`1+${sides}=${sides + 1}`)}`,
      pyrFig,
    );
  }

  if (s.includes("각뿔")) {
    if (rng() < 0.5) {
      return make(
        unit,
        `각뿔의 옆면은 어떤 도형인가?`,
        "삼각형",
        `각뿔의 옆면은 밑면의 한 변과 각뿔의 꼭짓점을 이은 삼각형입니다.`,
        pyrFig,
      );
    }
    return make(
      unit,
      `밑면이 ${base}인 각뿔의 옆면은 모두 몇 개인가?`,
      num(sides),
      `옆면의 수는 밑면의 변의 수와 같습니다. ${base}의 변은 ${num(sides)}개이므로 옆면도 ${num(sides)}개입니다.`,
      pyrFig,
    );
  }

  if (s.includes("전개도")) {
    if (rng() < 0.5) {
      return make(
        unit,
        `밑면이 ${base}인 각기둥의 전개도입니다. 이 전개도를 접으면 어떤 입체도형이 되는가?`,
        prismName,
        `두 밑면이 ${base}이고 옆면이 직사각형이므로 ${prismName}이 됩니다.`,
        fig("prism", { sides, h: 3, net: true }),
      );
    }
    return make(
      unit,
      `밑면이 ${base}인 각기둥의 전개도에서 옆면인 직사각형은 모두 몇 개인가?`,
      num(sides),
      `옆면의 수는 밑면의 변의 수와 같습니다. ${base}의 변이 ${num(sides)}개이므로 직사각형도 ${num(sides)}개입니다.`,
      fig("prism", { sides, h: 3, net: true }),
    );
  }

  if (s.includes("이름") || s.includes("구성")) {
    const which = pick(rng, ["이름", "꼭짓점", "모서리", "면"]);
    if (which === "이름") {
      return make(
        unit,
        `밑면이 ${base}인 각기둥의 이름을 쓰시오.`,
        prismName,
        `각기둥의 이름은 밑면의 모양으로 정합니다. 밑면이 ${base}이므로 ${prismName}입니다.`,
        prismFig,
      );
    }
    if (which === "꼭짓점") {
      return make(
        unit,
        `${prismName}의 꼭짓점은 모두 몇 개인가?`,
        num(2 * sides),
        `두 밑면의 꼭짓점을 더합니다. ${expr(`${sides}\\times2=${2 * sides}`)}`,
        prismFig,
      );
    }
    if (which === "모서리") {
      return make(
        unit,
        `${prismName}의 모서리는 모두 몇 개인가?`,
        num(3 * sides),
        `두 밑면의 모서리 ${num(2 * sides)}개와 옆면의 모서리 ${num(sides)}개를 더합니다. ` +
          `${expr(`${2 * sides}+${sides}=${3 * sides}`)}`,
        prismFig,
      );
    }
    return make(
      unit,
      `${prismName}의 면은 모두 몇 개인가?`,
      num(sides + 2),
      `밑면 ${num(2)}개와 옆면 ${num(sides)}개를 더합니다. ${expr(`2+${sides}=${sides + 2}`)}`,
      prismFig,
    );
  }

  // 1-2-1 각기둥 알아보기와 밑면·옆면
  if (rng() < 0.4) {
    return make(
      unit,
      `각기둥에서 서로 평행하고 합동인 두 면을 무엇이라고 하는가?`,
      "밑면",
      `각기둥의 두 밑면은 서로 평행하고 합동입니다. 나머지 면은 옆면입니다.`,
      prismFig,
    );
  }
  return make(
    unit,
    `밑면이 ${base}인 각기둥의 옆면은 모두 몇 개인가?`,
    num(sides),
    `옆면의 수는 밑면의 변의 수와 같습니다. ${base}의 변이 ${num(sides)}개이므로 옆면도 ${num(sides)}개입니다.`,
    prismFig,
  );
}

// ───────────────────────── 1-3 소수의 나눗셈 ─────────────────────────

/** `a`·`q` 는 **×100 정수**. 부동소수점으로 몫을 만들지 않는다(R2). */
type DecCase = { a: number; b: number; q: number };

function decDivPool(keep: (c: DecCase) => boolean): DecCase[] {
  const out: DecCase[] = [];
  for (let b = 2; b <= 9; b += 1) {
    for (let q = 5; q <= 900; q += 1) {
      const a = b * q;
      if (a > 9900) break;
      const c = { a, b, q };
      if (keep(c)) out.push(c);
    }
  }
  return out;
}

/** 나누어지는 수가 **소수 한 자리**. */
const oneDecDividend = (c: DecCase) => c.a % 10 === 0 && c.a % 100 !== 0;

const DEC_DIV = {
  plain: decDivPool((c) => c.q > 100 && c.q % 10 === 0 && oneDecDividend(c)),
  underOne: decDivPool(
    (c) => c.q >= 20 && c.q < 100 && c.q % 10 === 0 && oneDecDividend(c),
  ),
  bringZero: decDivPool(
    (c) => c.q > 100 && c.q % 10 !== 0 && oneDecDividend(c),
  ),
  zeroTenth: decDivPool(
    (c) =>
      c.q > 100 &&
      c.q % 10 !== 0 &&
      Math.floor(c.q / 10) % 10 === 0 &&
      oneDecDividend(c),
  ),
  wholes: decDivPool((c) => c.a % 100 === 0 && c.a >= 1000 && c.q % 100 !== 0),
} as const;

function decDiv61(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;

  if (s.includes("어림셈")) {
    const c = pick(rng, DEC_DIV.wholes);
    const a = String(c.a / 100);
    const q = fromCents(c.q);
    return make(
      unit,
      `몫을 소수로 나타내시오.\n\n${expr(`${a}\\div${c.b}=\\square`)}`,
      expr(q),
      `자연수처럼 나눈 뒤 어림한 값으로 소수점의 위치를 확인합니다. ${expr(`${a}\\div${c.b}=${q}`)}`,
    );
  }

  if (s.includes("몫이 1보다 작은")) {
    const c = pick(rng, DEC_DIV.underOne);
    const a = fromCents(c.a);
    const q = fromCents(c.q);
    return make(
      unit,
      `몫을 구하시오.\n\n${expr(`${a}\\div${c.b}=\\square`)}`,
      expr(q),
      `나누어지는 수가 나누는 수보다 작으므로 몫의 자연수 부분에 ${num(0)}을 씁니다. ` +
        `${expr(`${a}\\div${c.b}=${q}`)}`,
    );
  }

  if (s.includes("소수 첫째 자리에 0")) {
    const c = pick(rng, DEC_DIV.zeroTenth);
    const a = fromCents(c.a);
    const q = fromCents(c.q);
    return make(
      unit,
      `몫을 구하시오.\n\n${expr(`${a}\\div${c.b}=\\square`)}`,
      expr(q),
      `나누어야 할 수가 나누는 수보다 작은 자리에는 몫에 ${num(0)}을 씁니다. ` +
        `${expr(`${a}\\div${c.b}=${q}`)}`,
    );
  }

  if (s.includes("0을 내려")) {
    const c = pick(rng, DEC_DIV.bringZero);
    const a = fromCents(c.a);
    const q = fromCents(c.q);
    return make(
      unit,
      `몫을 구하시오.\n\n${expr(`${a}\\div${c.b}=\\square`)}`,
      expr(q),
      `나누어떨어지지 않으면 소수점 아래에 ${num(0)}을 내려 계속 나눕니다. ${expr(`${a}\\div${c.b}=${q}`)}`,
    );
  }

  const c = pick(rng, DEC_DIV.plain);
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  return make(
    unit,
    `몫을 구하시오.\n\n${expr(`${a}\\div${c.b}=\\square`)}`,
    expr(q),
    `자연수의 나눗셈처럼 계산한 뒤, 나누어지는 수의 소수점 자리에 맞추어 몫에 소수점을 찍습니다. ` +
      `${expr(`${a}\\div${c.b}=${q}`)}`,
  );
}

// ───────────────────────── 1-4 비와 비율 ─────────────────────────

const PAIR_ITEMS = [
  ["사과", "귤"],
  ["딸기", "포도"],
  ["빨간 구슬", "파란 구슬"],
  ["초콜릿", "사탕"],
  ["도넛", "빵"],
  ["풍선", "공"],
] as const;

/** 백분율이 자연수로 떨어지는 기준량. */
const PCT_DENOMS = [4, 5, 10, 20, 25, 50] as const;

function ratio(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  const [x, y] = pick(rng, PAIR_ITEMS);

  if (s.includes("백분율이 사용되는")) {
    const kind = pick(rng, ["할인율", "찬성률", "성공률"]);
    if (kind === "할인율") {
      const before = pick(rng, [4000, 5000, 8000, 10000, 20000]);
      const rate = pick(rng, [10, 20, 25, 40]);
      const cut = (before * rate) / 100;
      return make(
        unit,
        `${num(before)}원짜리 물건을 ${num(before - cut)}원에 샀습니다. 할인율은 몇 %인가?`,
        num(rate),
        `할인 금액은 ${expr(`${before}-${before - cut}=${cut}`)} 원입니다. ` +
          `${expr(`\\frac{${cut}}{${before}}\\times100=${rate}`)} 이므로 ${expr(`${rate}\\%`)} 입니다.`,
      );
    }
    if (kind === "찬성률") {
      const total = pick(rng, [200, 250, 400, 500]);
      const rate = pick(rng, [15, 30, 45, 60]);
      const yes = (total * rate) / 100;
      return make(
        unit,
        `전체 ${num(total)}명 중 ${num(yes)}명이 찬성했습니다. 찬성률은 몇 %인가?`,
        num(rate),
        `${expr(`\\frac{${yes}}{${total}}\\times100=${rate}`)} 이므로 ${expr(`${rate}\\%`)} 입니다.`,
      );
    }
    const tries = pick(rng, [20, 25, 40, 50]);
    const rate = pick(rng, [20, 40, 60, 80]);
    const hit = (tries * rate) / 100;
    return make(
      unit,
      `공을 ${num(tries)}번 던져 ${num(hit)}번 성공했습니다. 성공률은 몇 %인가?`,
      num(rate),
      `${expr(`\\frac{${hit}}{${tries}}\\times100=${rate}`)} 이므로 ${expr(`${rate}\\%`)} 입니다.`,
    );
  }

  if (s.includes("백분율")) {
    const den = pick(rng, PCT_DENOMS);
    const top = coprimeTop(rng, den);
    const pct = (top * 100) / den;
    return make(
      unit,
      `다음 비율을 백분율로 나타내시오.\n\n${expr(`\\frac{${top}}{${den}}`)}`,
      num(pct),
      `비율에 ${num(100)}을 곱하고 기호 ${expr("\\%")} 를 붙입니다. ` +
        `${expr(`\\frac{${top}}{${den}}\\times100=${pct}`)}`,
    );
  }

  if (s.includes("비율이 사용되는")) {
    const kind = pick(rng, ["속력", "인구밀도", "진하기"]);
    if (kind === "속력") {
      const hours = intBetween(rng, 2, 6);
      const speed = pick(rng, [40, 50, 60, 70, 80]);
      return make(
        unit,
        `자동차가 ${num(speed * hours)} km를 가는 데 ${num(hours)}시간이 걸렸습니다. 걸린 시간에 대한 간 거리의 비율을 구하시오.`,
        num(speed),
        `기준량은 걸린 시간입니다. ${expr(`\\frac{${speed * hours}}{${hours}}=${speed}`)}`,
      );
    }
    if (kind === "인구밀도") {
      const area = intBetween(rng, 2, 8);
      const per = pick(rng, [150, 200, 300, 400]);
      return make(
        unit,
        `넓이가 ${num(area)} km²인 마을에 ${num(area * per)}명이 삽니다. 넓이에 대한 인구의 비율을 구하시오.`,
        num(per),
        `기준량은 넓이입니다. ${expr(`\\frac{${area * per}}{${area}}=${per}`)}`,
      );
    }
    const salt = pick(rng, [20, 30, 40, 50]);
    const water = pick(rng, [200, 250, 400, 500]);
    return make(
      unit,
      `소금 ${num(salt)} g을 녹여 소금물 ${num(water)} g을 만들었습니다. 소금물 양에 대한 소금 양의 비율을 분수로 나타내시오.`,
      expr(fmtFrac(salt, water)),
      `기준량은 소금물의 양입니다. ${expr(`\\frac{${salt}}{${water}}=${fmtFrac(salt, water)}`)}`,
    );
  }

  if (s.includes("비율")) {
    let a = intBetween(rng, 2, 9);
    let b = intBetween(rng, 3, 12);
    for (let t = 0; t < 20 && (gcd(a, b) !== 1 || a === b); t += 1) {
      a = intBetween(rng, 2, 9);
      b = intBetween(rng, 3, 12);
    }
    return make(
      unit,
      `비 ${expr(`${a}:${b}`)} 의 비율을 분수로 나타내시오.`,
      expr(`\\frac{${a}}{${b}}`),
      `${expr(`${a}:${b}`)} 에서 비교하는 양은 ${num(a)}, 기준량은 ${num(b)}입니다. ` +
        `(비율)=(비교하는 양)÷(기준량)이므로 ${expr(`\\frac{${a}}{${b}}`)} 입니다.`,
    );
  }

  if (s.includes("두 수 비교")) {
    const k = intBetween(rng, 2, 6);
    const b = intBetween(rng, 3, 9);
    return make(
      unit,
      `${x} ${num(b * k)}개와 ${y} ${num(b)}개가 있습니다. ${x} 수는 ${y} 수의 몇 배인지 나눗셈으로 비교하시오.`,
      num(k),
      `나눗셈으로 비교합니다. ${expr(`${b * k}\\div${b}=${k}`)}`,
    );
  }

  // 1-4-2 비
  const a = intBetween(rng, 2, 9);
  const b = intBetween(rng, 2, 9);
  return make(
    unit,
    `${x} ${num(a)}개와 ${y} ${num(b)}개가 있습니다. ${x} 수에 대한 ${y} 수의 비를 쓰시오.`,
    expr(`${b}:${a}`),
    `「에 대한」 앞에 있는 것이 기준량이므로 기준량은 ${x} 수 ${num(a)}입니다. ` +
      `비는 (비교하는 양):(기준량)으로 쓰므로 ${expr(`${b}:${a}`)} 입니다.`,
  );
}

// ───────────────────────── 1-5 여러 가지 그래프 ─────────────────────────

const GRAPH_THEMES = [
  { subject: "좋아하는 과일", items: ["사과", "배", "포도"] },
  { subject: "좋아하는 운동", items: ["축구", "농구", "배구", "야구"] },
  { subject: "학교에 오는 방법", items: ["버스", "지하철", "도보"] },
  { subject: "좋아하는 과목", items: ["국어", "수학", "영어", "과학"] },
  { subject: "즐겨 읽는 책", items: ["동화", "과학", "역사", "만화"] },
  { subject: "좋아하는 계절", items: ["봄", "여름", "가을", "겨울"] },
] as const;

function split100(rng: Rng, k: number): number[] {
  const min = 15;
  const step = 5;
  for (let t = 0; t < 40; t += 1) {
    const out: number[] = [];
    let left = 100;
    let ok = true;
    for (let i = 0; i < k - 1; i += 1) {
      const remain = k - 1 - i;
      const cap = Math.min(55, Math.floor((left - min * remain) / step) * step);
      if (cap < min) {
        ok = false;
        break;
      }
      const n = intBetween(rng, min / step, cap / step) * step;
      out.push(n);
      left -= n;
    }
    if (!ok || left < min || left > 60 || left % step !== 0) continue;
    out.push(left);
    return out;
  }
  return k === 4 ? [15, 20, 25, 40] : [20, 30, 50];
}

type ChartData = { subject: string; items: { label: string; pct: number }[] };

/** 백분율이 다 같으면 「가장 큰 것과 가장 작은 것의 차」가 $0$ 이 된다 — `spread` 로 막는다. */
function chartData(rng: Rng, spread = false): ChartData {
  let last: ChartData | null = null;
  for (let t = 0; t < 12; t += 1) {
    const theme = pick(rng, GRAPH_THEMES);
    const k = Math.min(theme.items.length, pick(rng, [3, 4]));
    const pcts = split100(rng, k);
    const items = theme.items
      .slice(0, k)
      .map((label, i) => ({ label, pct: pcts[i]! }));
    last = { subject: theme.subject, items };
    if (!spread || Math.max(...pcts) > Math.min(...pcts)) return last;
  }
  const fallback = last!;
  fallback.items[0]!.pct += 5;
  fallback.items[1]!.pct -= 5;
  return fallback;
}

/** 전체 수량. 백분율이 $5$ 의 배수이므로 $20$ 의 배수면 항목 수량이 자연수로 떨어진다. */
const CHART_TOTALS = [100, 200, 300, 400] as const;

/**
 * 「**그 항목**을 고른 학생이 몇 명인가」를 되짚는 갈래가 쓰는 «전체 인원».
 *
 * ⚠️ **$100$ 을 뺀다.** 전체가 $100$명이면 배율이 $1$ 이라 답이 곧 **그 항목의 %**가
 * 되는데, 원그래프·띠그래프는 그 %를 지면에 찍는다 — `_pie_chart`
 * (`scripts/figure/elem_advanced.py:804`)가 부채꼴 안과 범례 **두 곳**에 쓴다.
 * 그러면 학생은 비례식을 세우지 않고 **그 부채꼴을 읽으면** 맞는다.
 *
 * 답 $=$ 전체 $\times$ %$\div100$ 이므로 **답 $=$ % $\iff$ 전체 $=100$** — 정확히
 * 동치다. 그래서 이 한 줄이 그 부류를 **전부** 막고, 넘치게 막지도 않는다.
 * (다른 전체에서도 답이 «다른» 항목의 %와 우연히 같을 수 있지만, 학생은 그 수가
 * 어느 항목의 것인지 알 길이 없어 읽어서 맞힐 수 없다. 그것까지 막으면 거짓 경보다.)
 *
 * 반대로 «전체 인원»을 묻는 갈래(1-5-1 심화)는 답이 늘 어느 %보다 커서
 * **구조적으로 안전**하므로 $100$ 을 그대로 쓴다(실측: 배율1 128자리 · 겹침 0).
 *
 * 2026-08-24 실측(고치기 전): 1-5-3 심화 113/400 · 1-5-5 심화 115/400 이 샜다.
 */
const REVERSE_CHART_TOTALS = CHART_TOTALS.filter((t) => t !== 100);

function twoLabels(rng: Rng, items: { label: string; pct: number }[]) {
  const i = intBetween(rng, 0, items.length - 1);
  const j = (i + intBetween(rng, 1, items.length - 1)) % items.length;
  return [items[i]!, items[j]!] as const;
}

function graphs61(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;

  if (s.includes("비교하기")) {
    const { subject, items } = chartData(rng, true);
    const usePie = rng() < 0.5;
    const kindName = usePie ? "원그래프" : "띠그래프";
    const pcts = items.map((it) => it.pct);
    const max = Math.max(...pcts);
    const min = Math.min(...pcts);
    return make(
      unit,
      `학생들이 ${subject}을 조사하여 나타낸 ${kindName}입니다. 비율이 가장 높은 항목과 가장 낮은 항목의 비율의 차는 몇 %인가?`,
      num(max - min),
      `가장 높은 비율은 ${expr(`${max}\\%`)}, 가장 낮은 비율은 ${expr(`${min}\\%`)} 입니다. ` +
        `${expr(`${max}-${min}=${max - min}`)}`,
      usePie
        ? fig("pieChart", { slices: items })
        : fig("stripChart", { segments: items }),
    );
  }

  if (s.includes("원그래프로 나타내기")) {
    const { subject, items } = chartData(rng);
    const total = pick(rng, CHART_TOTALS);
    const [one, two] = twoLabels(rng, items);
    const sum = one.pct + two.pct;
    const people = (total * sum) / 100;
    return make(
      unit,
      `학생 ${num(total)}명의 ${subject}을 조사하여 나타낸 원그래프입니다. ` +
        `${one.label}${josa(one.label, "과", "와")} ${two.label}${josa(two.label, "을", "를")} 고른 학생은 모두 몇 명인가?`,
      num(people),
      `두 항목의 비율은 ${expr(`${one.pct}+${two.pct}=${sum}`)} 이므로 ${expr(`${sum}\\%`)} 입니다. ` +
        `${expr(`${total}\\times\\frac{${sum}}{100}=${people}`)}`,
      fig("pieChart", { slices: items }),
    );
  }

  if (s.includes("원그래프")) {
    const { subject, items } = chartData(rng);
    const [one, two] = twoLabels(rng, items);
    const sum = one.pct + two.pct;
    return make(
      unit,
      `학생들이 ${subject}을 조사하여 나타낸 원그래프입니다. ` +
        `${one.label}${josa(one.label, "과", "와")} ${two.label}의 비율의 합은 몇 %인가?`,
      num(sum),
      `${one.label}${josa(one.label, "은", "는")} ${expr(`${one.pct}\\%`)}, ` +
        `${two.label}${josa(two.label, "은", "는")} ${expr(`${two.pct}\\%`)} 이므로 ` +
        `${expr(`${one.pct}+${two.pct}=${sum}`)} 입니다.`,
      fig("pieChart", { slices: items }),
    );
  }

  if (s.includes("띠그래프로 나타내기")) {
    const { subject, items } = chartData(rng);
    const width = pick(rng, [20, 40]);
    const one = items[intBetween(rng, 0, items.length - 1)]!;
    const len = (width * one.pct) / 100;
    return make(
      unit,
      `학생들이 ${subject}을 조사한 결과입니다. 이 자료를 전체 길이가 ${unitNum(width, "cm")} 인 띠그래프로 나타낼 때, ` +
        `${one.label}${josa(one.label, "이", "가")} 차지하는 부분의 길이는 몇 cm인가?`,
      num(len),
      `${one.label}${josa(one.label, "은", "는")} 전체의 ${expr(`${one.pct}\\%`)} 입니다. ` +
        `${expr(`${width}\\times\\frac{${one.pct}}{100}=${len}`)}`,
      fig("stripChart", { segments: items }),
    );
  }

  const { subject, items } = chartData(rng);
  const total = pick(rng, CHART_TOTALS);
  const one = items[intBetween(rng, 0, items.length - 1)]!;
  const people = (total * one.pct) / 100;
  return make(
    unit,
    `학생 ${num(total)}명의 ${subject}을 조사하여 나타낸 띠그래프입니다. ` +
      `${one.label}${josa(one.label, "을", "를")} 고른 학생은 몇 명인가?`,
    num(people),
    `${one.label}${josa(one.label, "은", "는")} 전체의 ${expr(`${one.pct}\\%`)} 입니다. ` +
      `${expr(`${total}\\times\\frac{${one.pct}}{100}=${people}`)}`,
    fig("stripChart", { segments: items }),
  );
}

// ───────────────────── 1-6 직육면체의 겉넓이와 부피 ─────────────────────

function volume(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;

  if (s.includes("㎥") || s.includes("m³")) {
    const which = pick(rng, ["toCm", "toM", "box"]);
    if (which === "toCm") {
      const k = intBetween(rng, 1, 9);
      return make(
        unit,
        `${expr("\\square")} 안에 알맞은 수를 써넣으시오.\n\n${expr(`${k}\\,\\mathrm{m}^3=\\square\\,\\mathrm{cm}^3`)}`,
        num(k * 1000000),
        `${expr("1\\,\\mathrm{m}=100\\,\\mathrm{cm}")} 이므로 ${expr("1\\,\\mathrm{m}^3=1000000\\,\\mathrm{cm}^3")} 입니다. ` +
          `${expr(`${k}\\times1000000=${k * 1000000}`)}`,
      );
    }
    if (which === "toM") {
      const k = intBetween(rng, 2, 9);
      return make(
        unit,
        `${expr("\\square")} 안에 알맞은 수를 써넣으시오.\n\n${expr(`${k * 1000000}\\,\\mathrm{cm}^3=\\square\\,\\mathrm{m}^3`)}`,
        num(k),
        `${expr("1000000\\,\\mathrm{cm}^3=1\\,\\mathrm{m}^3")} 이므로 ${expr(`${k * 1000000}\\div1000000=${k}`)} 입니다.`,
      );
    }
    const w = intBetween(rng, 2, 6);
    const d = intBetween(rng, 2, 5);
    const h = intBetween(rng, 2, 4);
    return make(
      unit,
      `가로 ${unitNum(w, "m")}, 세로 ${unitNum(d, "m")}, 높이 ${unitNum(h, "m")} 인 직육면체의 부피는 몇 m³인가?`,
      num(w * d * h),
      `${expr(`${w}\\times${d}\\times${h}=${w * d * h}`)}`,
      fig("cuboid", { w, d, h }),
    );
  }

  if (s.includes("겉넓이")) {
    if (rng() < 0.35) {
      const a = intBetween(rng, 2, 8);
      return make(
        unit,
        `한 모서리의 길이가 ${unitNum(a, "cm")} 인 정육면체의 겉넓이는 몇 cm²인가?`,
        num(6 * a * a),
        `정육면체의 면은 모두 합동인 정사각형 ${num(6)}개입니다. ${expr(`${a}\\times${a}\\times6=${6 * a * a}`)}`,
        fig("cuboid", { w: a, d: a, h: a }),
      );
    }
    const w = intBetween(rng, 2, 8);
    const d = intBetween(rng, 2, 6);
    const h = intBetween(rng, 2, 7);
    const area = 2 * (w * d + d * h + h * w);
    return make(
      unit,
      `가로 ${unitNum(w, "cm")}, 세로 ${unitNum(d, "cm")}, 높이 ${unitNum(h, "cm")} 인 직육면체의 겉넓이는 몇 cm²인가?`,
      num(area),
      `마주 보는 면끼리 합동이므로 세 종류의 면을 더해 ${num(2)}배 합니다. ` +
        `${expr(`(${w}\\times${d}+${d}\\times${h}+${h}\\times${w})\\times2=${area}`)}`,
      fig("cuboid", { w, d, h }),
    );
  }

  const w = intBetween(rng, 2, 8);
  const d = intBetween(rng, 2, 6);
  const h = intBetween(rng, 2, 7);
  return make(
    unit,
    `가로 ${unitNum(w, "cm")}, 세로 ${unitNum(d, "cm")}, 높이 ${unitNum(h, "cm")} 인 직육면체의 부피는 몇 cm³인가?`,
    num(w * d * h),
    `(직육면체의 부피)=(가로)×(세로)×(높이)입니다. ${expr(`${w}\\times${d}\\times${h}=${w * d * h}`)}`,
    fig("cuboid", { w, d, h }),
  );
}

// ───────────────────────── 2-1 분수의 나눗셈 ─────────────────────────

function fracDiv62(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;

  if (s.includes("(자연수)÷(분수)")) {
    const k = intBetween(rng, 2, 8);
    const d = intBetween(rng, 3, 9);
    const top = coprimeTop(rng, d, 2);
    const [p, q] = divFrac(k, 1, top, d);
    return make(
      unit,
      `다음을 계산하시오.\n\n${expr(`${k}\\div\\frac{${top}}{${d}}=\\square`)}`,
      expr(fmtFrac(p, q)),
      `나누는 수의 분모와 분자를 바꾸어 곱합니다. ` +
        `${expr(`${k}\\div\\frac{${top}}{${d}}=${k}\\times\\frac{${d}}{${top}}=${fmtFrac(p, q)}`)}`,
    );
  }

  if (s.includes("(분수)×(분수)로")) {
    const d1 = intBetween(rng, 3, 9);
    const n1 = coprimeTop(rng, d1);
    const d2 = intBetween(rng, 3, 8);
    const n2 = coprimeTop(rng, d2, 2);
    return make(
      unit,
      `다음 나눗셈식을 곱셈식으로 나타내시오.\n\n${expr(`\\frac{${n1}}{${d1}}\\div\\frac{${n2}}{${d2}}`)}`,
      expr(`\\frac{${n1}}{${d1}}\\times\\frac{${d2}}{${n2}}`),
      `나누는 수 ${expr(`\\frac{${n2}}{${d2}}`)} 의 분모와 분자를 바꾼 수를 곱합니다.`,
    );
  }

  if (s.includes("(가분수)") || s.includes("(대분수)")) {
    const d1 = intBetween(rng, 2, 6);
    const w = intBetween(rng, 1, 3);
    const t1 = coprimeTop(rng, d1);
    const imp = w * d1 + t1; // `w >= 1`·`t1 >= 1` 이므로 `imp > d1` — 반드시 가분수다.
    const d2 = intBetween(rng, 3, 8);
    // 소단원 이름이 **가분수와 대분수 둘 다** 내걸었다. 씨앗마다 갈라 내되,
    // 대분수 쪽은 **나누는 수를 가분수**로 두어 어느 씨앗에서도 가분수가 지면에 선다.
    const dividendImproper = rng() < 0.5;
    const n2 = dividendImproper
      ? coprimeTop(rng, d2, 2)
      : coprimeTop(rng, d2, d2 + 1, d2 + 6);
    const [p, q] = mulFrac(imp, d1, d2, n2);
    const flip = expr(
      `\\frac{${imp}}{${d1}}\\times\\frac{${d2}}{${n2}}=${fmtFrac(p, q)}`,
    );
    if (dividendImproper) {
      return make(
        unit,
        `다음을 계산하시오.\n\n${expr(`\\frac{${imp}}{${d1}}\\div\\frac{${n2}}{${d2}}=\\square`)}`,
        expr(fmtFrac(p, q)),
        `가분수는 그대로 두고 나누는 수의 분모와 분자를 바꾸어 곱합니다. ${flip}`,
      );
    }
    return make(
      unit,
      `다음을 계산하시오.\n\n${expr(`${w}\\frac{${t1}}{${d1}}\\div\\frac{${n2}}{${d2}}=\\square`)}`,
      expr(fmtFrac(p, q)),
      `대분수를 가분수로 고칩니다. ${expr(`${w}\\frac{${t1}}{${d1}}=\\frac{${imp}}{${d1}}`)} 이므로 ` +
        `나누는 수의 분모와 분자를 바꾸어 곱합니다. ${flip}`,
    );
  }

  if (s.includes("분모가 다른")) {
    const d1 = intBetween(rng, 2, 7);
    // 소단원 이름이 「분모가 **다른**」이다 — 같아지면 그 소단원이 아니다.
    // 이 조건은 `probe-elem-section-conditions.ts` 가 «미판정» 으로 흘리므로 여기서 못 박는다.
    let d2 = intBetween(rng, 2, 9);
    for (let t = 0; t < 20 && d2 === d1; t += 1) d2 = intBetween(rng, 2, 9);
    if (d2 === d1) d2 = d1 === 9 ? 8 : d1 + 1;
    const n1 = coprimeTop(rng, d1);
    const n2 = coprimeTop(rng, d2);
    const L = lcm(d1, d2);
    const x = (n1 * L) / d1;
    const y = (n2 * L) / d2;
    const [p, q] = divFrac(n1, d1, n2, d2);
    return make(
      unit,
      `다음을 계산하시오.\n\n${expr(`\\frac{${n1}}{${d1}}\\div\\frac{${n2}}{${d2}}=\\square`)}`,
      expr(fmtFrac(p, q)),
      `분모를 같게 통분한 뒤 분자끼리 나눕니다. ` +
        `${expr(`\\frac{${x}}{${L}}\\div\\frac{${y}}{${L}}=${x}\\div${y}=${fmtFrac(p, q)}`)}`,
    );
  }

  // 2-1-1 분모가 같은 (분수)÷(분수)
  const d = intBetween(rng, 3, 9);
  let a = coprimeTop(rng, d);
  let b = coprimeTop(rng, d);
  for (let t = 0; t < 20 && a === b; t += 1) b = coprimeTop(rng, d);
  if (a === b) a = ((a % (d - 1)) + 1) % d || 1;
  return make(
    unit,
    `다음을 계산하시오.\n\n${expr(`\\frac{${a}}{${d}}\\div\\frac{${b}}{${d}}=\\square`)}`,
    expr(fmtFrac(a, b)),
    `분모가 같으면 분자끼리 나눕니다. ` +
      `${expr(`\\frac{${a}}{${d}}\\div\\frac{${b}}{${d}}=${a}\\div${b}=${fmtFrac(a, b)}`)}`,
  );
}

// ───────────────────────── 2-2 소수의 나눗셈 ─────────────────────────

/** 자릿수가 **같은** (소수)÷(소수). `a`·`b` 는 ×10, `q` 는 자연수. */
const SAME_DIGIT: { a: number; b: number; q: number }[] = [];
/** 자릿수가 **다른** (소수)÷(소수). `a`·`q` 는 ×100, `b` 는 ×10. */
const DIFF_DIGIT: { a: number; b: number; q: number }[] = [];
/** (자연수)÷(소수). `a` 는 자연수, `b` 는 ×10, `q` 는 자연수. */
const NAT_BY_DEC: { a: number; b: number; q: number }[] = [];
for (let b = 11; b <= 49; b += 1) {
  if (b % 10 === 0) continue;
  for (let q = 2; q <= 9; q += 1) {
    const a = b * q;
    if (a <= 900 && a % 10 !== 0) SAME_DIGIT.push({ a, b, q });
  }
  for (let q = 105; q <= 900; q += 1) {
    const prod = b * q;
    if (prod % 10 !== 0) continue;
    const a = prod / 10;
    if (a % 10 === 0 || a > 5000) continue;
    DIFF_DIGIT.push({ a, b, q });
  }
  for (let q = 2; q <= 12; q += 1) {
    const prod = b * q;
    if (prod % 10 === 0) NAT_BY_DEC.push({ a: prod / 10, b, q });
  }
}

/** 반올림 문항의 나누는 수 — 몫이 딱 떨어지지 않아야 「반올림」이 뜻을 가진다. */
/**
 * 단위 기호 뒤의 조사. **소리로 정한다** — `kg` 은 「킬로그램」이라 받침이 있고
 * `m` 은 「미터」라 없다. 글자만 봐서는 못 고른다.
 *
 * 2026-08-23 실측: 초6 전량(표준+갈래, 씨앗 200)에서 «단위+조사» 자리가 열일곱인데
 * 틀린 것은 **한 자리**였다 — 2-2-5 「몇 kg**가** 남습니까?」(킬로그램가).
 * 나머지 열여섯은 **우연히** 맞았다. 소재 풀에 `kg` 하나가 끼는 순간 틀리므로
 * 손으로 적지 말고 여기를 부른다. 모르는 단위는 **던진다**(조용히 통과 금지).
 */
const UNIT_HAS_FINAL: Record<string, boolean> = {
  m: false, // 미터
  cm: false, // 센티미터
  km: false, // 킬로미터
  L: false, // 리터
  mL: false, // 밀리리터
  g: true, // 그램
  kg: true, // 킬로그램
};

function unitJosa(
  unitSymbol: string,
  withFinal: string,
  withoutFinal: string,
): string {
  const has = UNIT_HAS_FINAL[unitSymbol];
  if (has === undefined) {
    throw new Error(`단위 조사 표에 없는 단위입니다: ${unitSymbol}`);
  }
  return has ? withFinal : withoutFinal;
}

const ROUND_DIVISORS = [3, 6, 7, 9, 11, 12, 13] as const;

const SHARE_THEMES = [
  { item: "끈", unit: "m", measure: "길이" },
  { item: "철사", unit: "m", measure: "길이" },
  { item: "리본", unit: "m", measure: "길이" },
  { item: "주스", unit: "L", measure: "양" },
  { item: "물", unit: "L", measure: "양" },
] as const;

function decDiv62(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;

  if (s.includes("남는")) {
    const t = pick(rng, SHARE_THEMES);
    const per = intBetween(rng, 2, 6);
    const people = intBetween(rng, 3, 7);
    const rem10 = intBetween(rng, 0, per - 1) * 10 + intBetween(rng, 1, 9);
    const total10 = people * per * 10 + rem10;
    const total = decStr(total10, 1);
    const rem = decStr(rem10, 1);
    return make(
      unit,
      `${t.measure}가 ${unitNum(total, t.unit)} 인 ${t.item}${josa(t.item, "을", "를")} 한 사람에게 ${unitNum(per, t.unit)} 씩 나누어 주려고 합니다. ` +
        `몇 명에게 나누어 줄 수 있고 몇 ${t.unit}${unitJosa(t.unit, "이", "가")} 남는지 구하시오.`,
      `${num(people)}명, ${unitNum(rem, t.unit)}`,
      `${expr(`${per}\\times${people}=${per * people}`)} 이므로 ${num(people)}명에게 나누어 줄 수 있고, ` +
        `${expr(`${total}-${per * people}=${rem}`)} 만큼 남습니다.`,
    );
  }

  if (s.includes("반올림")) {
    const place = pick(rng, [1, 2]);
    const b = pick(rng, ROUND_DIVISORS);
    const shownOf = (x: number) => Math.floor((x * 10 ** (place + 1)) / b);
    const cutOf = (x: number) => {
      const scale = x * 10 ** place;
      return Math.floor(scale / b) + ((scale % b) * 2 >= b ? 1 : 0);
    };
    /**
     * 쓸 수 있는 나누어지는 수인가.
     * ㉠ 딱 떨어지면 「반올림」이 뜻이 없다. ㉡ 해설에 보일 자리에서 끝나도 `\ldots` 가 거짓말이 된다.
     * ㉢·㉣ **꼬리 $0$** 이면 `8.090\ldots`·`3.0` 이 되는데 초등 지면에 그렇게 쓰지 않는다.
     */
    const usable = (x: number) =>
      x % b !== 0 &&
      (x * 10 ** (place + 1)) % b !== 0 &&
      shownOf(x) % 10 !== 0 &&
      cutOf(x) % 10 !== 0;
    let a = intBetween(rng, 11, 99);
    for (let t = 0; t < 40 && !usable(a); t += 1) a = intBetween(rng, 11, 99);
    if (!usable(a)) {
      // 무작위로 못 찾으면 훑어서 고른다. 하나도 없으면 **던진다** — 조용히 나쁜 값을 내지 않는다.
      const found = Array.from({ length: 89 }, (_, i) => i + 11).find(usable);
      if (found === undefined) {
        throw new Error(
          `반올림 문항을 만들 수 없습니다: 나누는 수 ${b}, 소수 ${place}자리`,
        );
      }
      a = found;
    }
    const shown = shownOf(a);
    const cut = cutOf(a);
    const placeName = place === 1 ? "첫" : "둘";
    const nextName = place === 1 ? "둘" : "셋";
    return make(
      unit,
      `${expr(`${a}\\div${b}`)} 의 몫을 반올림하여 소수 ${placeName}째 자리까지 나타내시오.`,
      expr(decStr(cut, place)),
      `몫은 ${expr(`${decStr(shown, place + 1)}\\ldots`)} 입니다. 소수 ${nextName}째 자리에서 반올림하면 ` +
        `${expr(decStr(cut, place))} 입니다.`,
    );
  }

  if (s.includes("(자연수)÷(소수)")) {
    const c = pick(rng, NAT_BY_DEC);
    const b = decStr(c.b, 1);
    return make(
      unit,
      `몫을 구하시오.\n\n${expr(`${c.a}\\div${b}=\\square`)}`,
      num(c.q),
      `나누는 수와 나누어지는 수의 소수점을 각각 오른쪽으로 한 자리씩 옮겨 계산합니다. ` +
        `${expr(`${c.a * 10}\\div${c.b}=${c.q}`)}`,
    );
  }

  if (s.includes("자릿수가 다른")) {
    const c = pick(rng, DIFF_DIGIT);
    const a = decStr(c.a, 2);
    const b = decStr(c.b, 1);
    const q = fromCents(c.q);
    return make(
      unit,
      `몫을 구하시오.\n\n${expr(`${a}\\div${b}=\\square`)}`,
      expr(q),
      `나누는 수가 자연수가 되도록 두 수의 소수점을 함께 한 자리씩 옮겨 ` +
        `${expr(`${decStr(c.a, 1)}\\div${c.b}`)}${numRo(c.b)} 계산합니다. ${expr(`${a}\\div${b}=${q}`)}`,
    );
  }

  const c = pick(rng, SAME_DIGIT);
  const a = decStr(c.a, 1);
  const b = decStr(c.b, 1);
  return make(
    unit,
    `몫을 구하시오.\n\n${expr(`${a}\\div${b}=\\square`)}`,
    num(c.q),
    `두 수의 소수점을 함께 오른쪽으로 한 자리씩 옮기면 ${expr(`${c.a}\\div${c.b}=${c.q}`)} 이므로 몫은 ${num(c.q)}입니다.`,
  );
}

// ───────────────────────── 2-3 공간과 입체 ─────────────────────────

function heightGrid(rng: Rng, cols: number, rows: number): number[][] {
  const h: number[][] = [];
  for (let y = 0; y < rows; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < cols; x += 1) row.push(intBetween(rng, 0, 3));
    h.push(row);
  }
  // 발문이 격자 크기를 말하므로 **가장자리 줄이 비면 안 된다** — 그림이 작아져 말과 어긋난다.
  for (let y = 0; y < rows; y += 1) {
    if (h[y]!.every((v) => v === 0))
      h[y]![intBetween(rng, 0, cols - 1)] = intBetween(rng, 1, 3);
  }
  for (let x = 0; x < cols; x += 1) {
    if (h.every((row) => row[x] === 0))
      h[intBetween(rng, 0, rows - 1)]![x] = intBetween(rng, 1, 3);
  }
  // 「2층에 놓인 개수」가 늘 $0$ 이 되지 않게 적어도 한 자리는 두 층 이상.
  if (Math.max(...h.flat()) < 2) {
    h[intBetween(rng, 0, rows - 1)]![intBetween(rng, 0, cols - 1)] = intBetween(
      rng,
      2,
      3,
    );
  }
  return h;
}

function heightsToVoxels(h: number[][]): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let y = 0; y < h.length; y += 1) {
    const row = h[y]!;
    for (let x = 0; x < row.length; x += 1) {
      for (let z = 0; z < row[x]!; z += 1) out.push([x, y, z]);
    }
  }
  return out;
}

function stacking(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  // 바닥이 넓을수록 발문·그림이 갈린다. `4\times4` 는 최대 $48$ 개로 엔진 한도에 딱 붙어 뺀다.
  const cols = intBetween(rng, 2, 4);
  const rows = cols === 4 ? intBetween(rng, 2, 3) : intBetween(rng, 2, 4);
  const h = heightGrid(rng, cols, rows);
  const flat = h.flat();
  const voxels = heightsToVoxels(h);
  const total = voxels.length;
  const floorCells = flat.filter((v) => v > 0).length;
  const maxH = Math.max(...flat);
  const grid = `가로 ${num(cols)}칸, 세로 ${num(rows)}칸`;

  if (s.includes("어느 방향")) {
    return make(
      unit,
      `${grid} 바닥에 쌓기나무를 쌓은 모양입니다. 이 모양을 위에서 보면 몇 칸이 보이는가?`,
      num(floorCells),
      `위에서 보면 쌓기나무가 놓인 자리가 한 칸씩 보입니다. 놓인 자리가 ${num(floorCells)}곳이므로 ${num(floorCells)}칸입니다.`,
      fig("stackCubes", { voxels, views: ["iso"] }),
    );
  }

  if (s.includes("(1)")) {
    return make(
      unit,
      `${grid} 바닥에 쌓은 모양과 위에서 본 모양입니다. 사용한 쌓기나무는 모두 몇 개인가?`,
      num(total),
      `위에서 본 모양의 각 칸에 적힌 층수를 모두 더합니다. ${expr(`${flat.filter((v) => v > 0).join("+")}=${total}`)}`,
      fig("stackCubes", { voxels, views: ["iso", "top"] }),
    );
  }

  if (s.includes("(2)")) {
    return make(
      unit,
      `${grid} 바닥에 쌓은 모양을 위에서 본 것입니다. 각 칸의 수는 그 자리에 쌓은 층수입니다. 사용한 쌓기나무는 모두 몇 개인가?`,
      num(total),
      `칸에 적힌 수가 그 자리에 쌓은 쌓기나무의 개수입니다. ${expr(`${flat.filter((v) => v > 0).join("+")}=${total}`)}`,
      fig("stackCubes", { voxels, views: ["top"] }),
    );
  }

  if (s.includes("(3)")) {
    const layer = maxH >= 3 ? pick(rng, [2, 3]) : 2;
    const count = flat.filter((v) => v >= layer).length;
    return make(
      unit,
      `${grid} 바닥에 쌓은 모양입니다. ${num(layer)}층에 놓인 쌓기나무는 몇 개인가?`,
      num(count),
      `${num(layer)}층에 쌓기나무가 있으려면 그 자리가 ${num(layer)}층 이상이어야 합니다. 그런 자리는 ${num(count)}곳입니다.`,
      fig("stackCubes", { voxels, views: ["iso", "top"] }),
    );
  }

  if (s.includes("(4)")) {
    const box = cols * rows * maxH;
    const target = box === total ? maxH + 1 : maxH;
    const need = cols * rows * target - total;
    return make(
      unit,
      `${grid} 바닥에 쌓은 모양입니다. 여기에 쌓기나무를 더 쌓아 ${grid}, 높이 ${num(target)}층인 직육면체 모양을 만들려면 쌓기나무가 몇 개 더 필요한가?`,
      num(need),
      `직육면체 모양에 필요한 쌓기나무는 ${expr(`${cols}\\times${rows}\\times${target}=${cols * rows * target}`)} 개입니다. ` +
        `지금 ${num(total)}개를 썼으므로 ${expr(`${cols * rows * target}-${total}=${need}`)} 개가 더 필요합니다.`,
      fig("stackCubes", { voxels, views: ["iso", "top"] }),
    );
  }

  const copies = pick(rng, [2, 3]);
  return make(
    unit,
    `${grid} 바닥에 쌓기나무로 만든 모양입니다. 이와 똑같은 모양 ${num(copies)}개를 붙여 새로운 모양을 만들었습니다. 새로 만든 모양에 사용한 쌓기나무는 모두 몇 개인가?`,
    num(copies * total),
    `한 모양에 쓴 쌓기나무는 ${num(total)}개입니다. ${expr(`${total}\\times${copies}=${copies * total}`)}`,
    fig("stackCubes", { voxels, views: ["iso", "top"] }),
  );
}

// ───────────────────── 2-4 비례식과 비례배분 ─────────────────────

const SHARE_PAIRS = [
  { one: "형", two: "동생" },
  { one: "언니", two: "동생" },
  { one: "지호", two: "서연" },
  { one: "민준", two: "수아" },
] as const;

const SHARE_GOODS = ["사탕", "구슬", "딱지", "초콜릿"] as const;

function proportion(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;

  if (s.includes("비례배분")) {
    const pair = pick(rng, SHARE_PAIRS);
    const goods = pick(rng, SHARE_GOODS);
    const a = intBetween(rng, 2, 5);
    let b = intBetween(rng, 2, 5);
    // 비례배분의 비는 이미 «가장 간단한 자연수의 비»여야 한다 — `2:4` 는 교재에 안 쓴다.
    for (let t = 0; t < 20 && (b === a || gcd(a, b) !== 1); t += 1)
      b = intBetween(rng, 2, 5);
    if (gcd(a, b) !== 1) b = a === 2 ? 3 : 2;
    const k = intBetween(rng, 3, 9);
    const total = (a + b) * k;
    const mine = a * k;
    return make(
      unit,
      `${goods} ${num(total)}개를 ${pair.one}${josa(pair.one, "과", "와")} ${pair.two}${josa(pair.two, "이", "가")} ` +
        `${expr(`${a}:${b}`)} 의 비로 나누어 가지려고 합니다. ${pair.one}${josa(pair.one, "이", "가")} 갖는 ${goods}${josa(goods, "은", "는")} 몇 개인가?`,
      num(mine),
      `전체를 ${expr(`${a}+${b}=${a + b}`)} 묶음으로 나누면 한 묶음은 ${expr(`${total}\\div${a + b}=${k}`)} 개입니다. ` +
        `${pair.one}${josa(pair.one, "은", "는")} ${num(a)}묶음이므로 ${expr(`${k}\\times${a}=${mine}`)} 개입니다.`,
    );
  }

  if (s.includes("비례식의 성질")) {
    const a = intBetween(rng, 2, 9);
    const b = intBetween(rng, 2, 9);
    const k = intBetween(rng, 2, 6);
    return make(
      unit,
      `${expr("\\square")} 안에 알맞은 수를 구하시오.\n\n${expr(`${a}:${b}=${a * k}:\\square`)}`,
      num(b * k),
      `비례식에서 외항의 곱과 내항의 곱은 같습니다. ` +
        `${expr(`${a}\\times\\square=${b}\\times${a * k}=${b * a * k}`)} 이므로 ` +
        `${expr(`\\square=${b * a * k}\\div${a}=${b * k}`)} 입니다.`,
    );
  }

  if (s.includes("비례식")) {
    const a = intBetween(rng, 2, 9);
    const b = intBetween(rng, 2, 9);
    const k = intBetween(rng, 2, 5);
    const outer = rng() < 0.5;
    return make(
      unit,
      `비례식 ${expr(`${a}:${b}=${a * k}:${b * k}`)} 에서 ${outer ? "외항" : "내항"}을 모두 쓰시오.`,
      outer ? expr(`${a},\\ ${b * k}`) : expr(`${b},\\ ${a * k}`),
      outer
        ? `비례식의 바깥쪽에 있는 두 수가 외항입니다. ${expr(`${a},\\ ${b * k}`)} 입니다.`
        : `비례식의 안쪽에 있는 두 수가 내항입니다. ${expr(`${b},\\ ${a * k}`)} 입니다.`,
    );
  }

  if (s.includes("간단한 자연수의 비")) {
    const kind = pick(rng, ["자연수", "소수", "분수"]);
    if (kind === "소수") {
      const a = intBetween(rng, 2, 9);
      const b = intBetween(rng, 2, 9);
      const g = gcd(a, b);
      return make(
        unit,
        `다음 비를 가장 간단한 자연수의 비로 나타내시오.\n\n${expr(`0.${a}:0.${b}`)}`,
        expr(`${a / g}:${b / g}`),
        `소수 첫째 자리까지 있으므로 두 항에 ${num(10)}배를 하면 ${expr(`${a}:${b}`)} 입니다. ` +
          `두 항을 최대공약수로 나누면 ${expr(`${a / g}:${b / g}`)} 입니다.`,
      );
    }
    if (kind === "분수") {
      const d1 = intBetween(rng, 2, 6);
      const d2 = intBetween(rng, 2, 6);
      const L = lcm(d1, d2);
      const x = L / d1;
      const y = L / d2;
      const g = gcd(x, y);
      return make(
        unit,
        `다음 비를 가장 간단한 자연수의 비로 나타내시오.\n\n${expr(`\\frac{1}{${d1}}:\\frac{1}{${d2}}`)}`,
        expr(`${x / g}:${y / g}`),
        `두 항에 분모의 최소공배수를 곱하면 ${expr(`${x}:${y}`)} 입니다. ` +
          `두 항을 최대공약수로 나누면 ${expr(`${x / g}:${y / g}`)} 입니다.`,
      );
    }
    const g = intBetween(rng, 2, 9);
    const a = intBetween(rng, 2, 9);
    let b = intBetween(rng, 2, 9);
    for (let t = 0; t < 20 && (b === a || gcd(a, b) !== 1); t += 1)
      b = intBetween(rng, 2, 9);
    return make(
      unit,
      `다음 비를 가장 간단한 자연수의 비로 나타내시오.\n\n${expr(`${a * g}:${b * g}`)}`,
      expr(`${a}:${b}`),
      `두 항을 최대공약수로 나눕니다. ${expr(`${a * g}\\div${g}:${b * g}\\div${g}=${a}:${b}`)}`,
    );
  }

  // 2-4-1 비의 성질
  const a = intBetween(rng, 2, 9);
  const b = intBetween(rng, 2, 9);
  if (rng() < 0.5) {
    const g = gcd(a, b);
    const k = intBetween(rng, 2, 6);
    return make(
      unit,
      `다음 비와 비율이 같은 비 중에서 후항이 ${num(b / g)} 인 비를 쓰시오.\n\n${expr(`${a * k}:${b * k}`)}`,
      expr(`${a / g}:${b / g}`),
      `비의 전항과 후항을 ${num(0)}이 아닌 같은 수로 나누어도 비율은 같습니다. ` +
        `${expr(`${a * k}:${b * k}`)} 의 두 항을 ${expr(`${g * k}`)} 로 나누면 ${expr(`${a / g}:${b / g}`)} 입니다.`,
    );
  }
  const k = intBetween(rng, 2, 7);
  return make(
    unit,
    `비 ${expr(`${a}:${b}`)} 의 전항과 후항에 각각 ${num(k)}배를 하면 어떤 비가 되는가?`,
    expr(`${a * k}:${b * k}`),
    `비의 전항과 후항에 ${num(0)}이 아닌 같은 수를 곱해도 비율은 같습니다. ` +
      `${expr(`${a}\\times${k}:${b}\\times${k}=${a * k}:${b * k}`)}`,
  );
}

// ───────────────────── 2-5 원의 둘레와 넓이 ─────────────────────

function circle62(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;

  if (s.includes("원주율")) {
    const which = pick(rng, ["이름", "나눗셈", "일정", "계산"]);
    if (which === "이름") {
      return make(
        unit,
        "원의 둘레를 무엇이라고 하는가?",
        "원주",
        "원의 둘레를 원주라고 합니다.",
      );
    }
    if (which === "나눗셈") {
      return make(
        unit,
        "원주율은 원주를 무엇으로 나눈 값인가?",
        "지름",
        "(원주율)=(원주)÷(지름)입니다.",
      );
    }
    if (which === "일정") {
      return make(
        unit,
        "원의 크기가 달라지면 (원주)÷(지름)의 값은 어떻게 되는가?",
        "항상 일정하다",
        "원의 크기와 상관없이 (원주)÷(지름)의 값은 항상 일정하며, 이 값을 원주율이라고 합니다.",
      );
    }
    const d = pick(rng, [5, 10, 20, 50]);
    const c = fromCents(314 * d);
    return make(
      unit,
      `지름이 ${unitNum(d, "cm")} 인 원의 원주가 ${unitNum(c, "cm")} 입니다. (원주)÷(지름)의 값을 구하시오.`,
      num("3.14"),
      `${expr(`${c}\\div${d}=3.14`)}`,
    );
  }

  if (s.includes("원주와 지름")) {
    const which = pick(rng, ["원주지름", "원주반지름", "지름"]);
    if (which === "원주지름") {
      const d = intBetween(rng, 3, 12);
      return make(
        unit,
        `지름이 ${unitNum(d, "cm")} 인 원의 원주는 몇 cm인가? (원주율: ${num("3.14")})`,
        num(fromCents(314 * d)),
        `(원주)=(지름)×(원주율)입니다. ${expr(`${d}\\times3.14=${fromCents(314 * d)}`)}`,
      );
    }
    if (which === "원주반지름") {
      const r = intBetween(rng, 2, 9);
      return make(
        unit,
        `반지름이 ${unitNum(r, "cm")} 인 원의 원주는 몇 cm인가? (원주율: ${num(3)})`,
        num(2 * r * 3),
        `지름은 ${expr(`${r}\\times2=${2 * r}`)} 이므로 원주는 ${expr(`${2 * r}\\times3=${2 * r * 3}`)} 입니다.`,
      );
    }
    const d = intBetween(rng, 4, 15);
    return make(
      unit,
      `원주가 ${unitNum(3 * d, "cm")} 인 원의 지름은 몇 cm인가? (원주율: ${num(3)})`,
      num(d),
      `(지름)=(원주)÷(원주율)입니다. ${expr(`${3 * d}\\div3=${d}`)}`,
    );
  }

  // 2-5-3 원의 넓이 어림하기.
  //
  // ⚠️ **한정어를 빼면 답이 하나로 안 정해진다.** 예전 발문은 「원 안에 그린 마름모」
  // 였는데 그런 마름모는 무수히 많다 — 교과서는 **그림이** 내접·외접을 정해 주지만
  // 우리 지면에는 그림이 없다. 답(넓이 $2r^2$·$4r^2$)은 교과서 규약대로 맞으니
  // **값 검산으로는 구조적으로 안 잡힌다**(2026-08-18 기출 1,420건과 같은 부류).
  // 그림을 기다리지 않고 발문으로 세운다 — 리드 승인 2026-08-23, D-07 대상 아님.
  //
  // 「단, …」 절이 답을 하나로 못 박는 조건이다. 내접 마름모는 네 꼭짓점이 원 위에
  // 있으면 정사각형뿐이라 두 대각선이 지름이고, 외접 정사각형은 네 변이 원에 닿으면
  // 한 변이 지름이다. 해설도 **그 조건을 근거로** 적는다(발문만 고치고 해설이 예전
  // 말을 되풀이하면 같은 자리가 남는다).
  if (s.includes("어림")) {
    const r = intBetween(rng, 3, 10);
    if (rng() < 0.5) {
      return make(
        unit,
        `반지름이 ${unitNum(r, "cm")} 인 원의 넓이를 어림하려고 합니다. ` +
          `원 밖에 꼭 맞게 그린 정사각형의 넓이는 몇 cm²인가? ` +
          `단, 정사각형의 네 변은 모두 원에 닿습니다.`,
        num(4 * r * r),
        `네 변이 모두 원에 닿으므로 정사각형의 한 변은 원의 지름과 같은 ${unitNum(2 * r, "cm")} 입니다. ` +
          `${expr(`${2 * r}\\times${2 * r}=${4 * r * r}`)}`,
      );
    }
    return make(
      unit,
      `반지름이 ${unitNum(r, "cm")} 인 원의 넓이를 어림하려고 합니다. ` +
        `원 안에 꼭 맞게 그린 마름모의 넓이는 몇 cm²인가? ` +
        `단, 마름모의 네 꼭짓점은 모두 원 위에 있습니다.`,
      num(2 * r * r),
      `네 꼭짓점이 모두 원 위에 있으므로 마름모의 두 대각선은 모두 원의 지름과 같은 ${unitNum(2 * r, "cm")} 입니다. ` +
        `${expr(`${2 * r}\\times${2 * r}\\div2=${2 * r * r}`)}`,
    );
  }

  if (rng() < 0.5) {
    const r = intBetween(rng, 2, 9);
    return make(
      unit,
      `반지름이 ${unitNum(r, "cm")} 인 원의 넓이는 몇 cm²인가? (원주율: ${num(3)})`,
      num(r * r * 3),
      `(원의 넓이)=(반지름)×(반지름)×(원주율)입니다. ${expr(`${r}\\times${r}\\times3=${r * r * 3}`)}`,
    );
  }
  const r = intBetween(rng, 2, 8);
  return make(
    unit,
    `지름이 ${unitNum(2 * r, "cm")} 인 원의 넓이는 몇 cm²인가? (원주율: ${num("3.14")})`,
    num(fromCents(314 * r * r)),
    `반지름은 ${expr(`${2 * r}\\div2=${r}`)} 입니다. ${expr(`${r}\\times${r}\\times3.14=${fromCents(314 * r * r)}`)}`,
  );
}

// ───────────────────── 2-6 원기둥, 원뿔, 구 ─────────────────────

// 풀의 크기와 고르는 횟수를 유지해 같은 씨앗의 수치는 바꾸지 않는다.
// 두 밑면은 반드시 옆면의 서로 마주 보는 변에 하나씩 붙인다.
const CYL_NET_LAYOUTS = [
  "opp",
  "oppFlip",
  "oppMid",
  "opp",
  "oppFlip",
  "ends",
] as const;

function cylCone(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  const r = intBetween(rng, 2, 6);
  const h = intBetween(rng, 3, 9);

  if (s.includes("전개도")) {
    const layout = pick(rng, CYL_NET_LAYOUTS);
    const net = fig("netCylinder", { r, h, pi: 3, layout });
    const which = pick(rng, ["가로", "넓이", "모양"]);
    if (which === "모양") {
      return make(
        unit,
        "원기둥의 전개도에서 옆면은 어떤 도형인가?",
        "직사각형",
        "원기둥의 옆면을 잘라 펼치면 직사각형이 됩니다. 두 밑면은 원입니다.",
        net,
      );
    }
    if (which === "넓이") {
      return make(
        unit,
        `밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원기둥의 전개도에서 옆면의 넓이는 몇 cm²인가? (원주율: ${num(3)})`,
        num(2 * r * 3 * h),
        `옆면의 가로는 밑면의 둘레와 같은 ${expr(`2\\times${r}\\times3=${2 * r * 3}`)} 이고, 세로는 높이와 같습니다. ` +
          `${expr(`${2 * r * 3}\\times${h}=${2 * r * 3 * h}`)}`,
        net,
      );
    }
    return make(
      unit,
      `밑면의 반지름이 ${unitNum(r, "cm")} 인 원기둥의 전개도에서 옆면인 직사각형의 가로는 몇 cm인가? (원주율: ${num(3)})`,
      num(2 * r * 3),
      `옆면의 가로는 밑면의 둘레와 같습니다. ${expr(`2\\times${r}\\times3=${2 * r * 3}`)}`,
      net,
    );
  }

  if (s.includes("원뿔")) {
    const cone = fig("cone", { r, h });
    const which = pick(rng, ["밑면", "꼭짓점", "앞", "모선", "반지름"]);
    if (which === "밑면") {
      return make(
        unit,
        "원뿔의 밑면은 어떤 도형인가?",
        "원",
        "원뿔의 밑면은 원 하나입니다.",
        cone,
      );
    }
    if (which === "꼭짓점") {
      return make(
        unit,
        "원뿔에서 뾰족한 부분의 점을 무엇이라고 하는가?",
        "원뿔의 꼭짓점",
        "원뿔에서 뾰족한 부분의 점을 원뿔의 꼭짓점이라고 합니다.",
        cone,
      );
    }
    if (which === "앞") {
      return make(
        unit,
        "원뿔을 앞에서 본 모양은 어떤 도형인가?",
        "삼각형",
        "원뿔을 앞에서 보면 삼각형으로 보이고, 위에서 보면 원으로 보입니다.",
        cone,
      );
    }
    if (which === "모선") {
      return make(
        unit,
        "원뿔의 꼭짓점과 밑면인 원의 둘레의 한 점을 이은 선분을 무엇이라고 하는가?",
        "모선",
        "원뿔의 꼭짓점과 밑면인 원의 둘레의 한 점을 이은 선분을 모선이라고 합니다.",
        cone,
      );
    }
    return make(
      unit,
      `밑면의 지름이 ${unitNum(2 * r, "cm")} 인 원뿔의 밑면의 반지름은 몇 cm인가?`,
      num(r),
      `반지름은 지름의 반입니다. ${expr(`${2 * r}\\div2=${r}`)}`,
      cone,
    );
  }

  if (s.includes("구")) {
    const ball = fig("sphere", { r });
    const which = pick(rng, ["단면", "위", "지름", "이름"]);
    if (which === "단면") {
      return make(
        unit,
        "구를 어느 방향에서 잘라도 잘린 면은 어떤 도형인가?",
        "원",
        "구는 어느 방향에서 잘라도 잘린 면이 원입니다.",
        ball,
      );
    }
    if (which === "위") {
      return make(
        unit,
        "구를 위에서 본 모양과 앞에서 본 모양은 어떤 도형인가?",
        "원",
        "구는 어느 방향에서 보아도 원으로 보입니다.",
        ball,
      );
    }
    if (which === "이름") {
      return make(
        unit,
        "구에서 가장 안쪽에 있는 점을 무엇이라고 하는가?",
        "구의 중심",
        "구에서 가장 안쪽에 있는 점을 구의 중심, 구의 중심에서 겉면의 한 점을 이은 선분을 구의 반지름이라고 합니다.",
        ball,
      );
    }
    return make(
      unit,
      `반지름이 ${unitNum(r, "cm")} 인 구의 지름은 몇 cm인가?`,
      num(2 * r),
      `지름은 반지름의 ${num(2)}배입니다. ${expr(`${r}\\times2=${2 * r}`)}`,
      ball,
    );
  }

  // 2-6-1 원기둥 알아보기 — 그림이 높이·반지름을 적어 주므로 그 둘은 묻지 않는다(R6).
  const cyl = fig("cylinder", { r, h });
  const which = pick(rng, ["밑면", "옆", "높이", "지름", "옆면"]);
  if (which === "밑면") {
    return make(
      unit,
      "원기둥에서 서로 평행하고 합동인 두 면을 무엇이라고 하는가?",
      "밑면",
      "원기둥의 두 밑면은 서로 평행하고 합동인 원입니다.",
      cyl,
    );
  }
  if (which === "옆") {
    return make(
      unit,
      "원기둥을 앞에서 본 모양은 어떤 도형인가?",
      "직사각형",
      "원기둥을 앞에서 보면 직사각형으로, 위에서 보면 원으로 보입니다.",
      cyl,
    );
  }
  if (which === "높이") {
    return make(
      unit,
      "원기둥에서 두 밑면에 수직인 선분의 길이를 무엇이라고 하는가?",
      "높이",
      "두 밑면에 수직인 선분의 길이를 원기둥의 높이라고 합니다.",
      cyl,
    );
  }
  if (which === "옆면") {
    return make(
      unit,
      "원기둥에서 두 밑면과 만나는 굽은 면을 무엇이라고 하는가?",
      "옆면",
      "원기둥에서 두 밑면과 만나는 굽은 면을 옆면이라고 합니다.",
      cyl,
    );
  }
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 인 원기둥의 밑면의 지름은 몇 cm인가?`,
    num(2 * r),
    `지름은 반지름의 ${num(2)}배입니다. ${expr(`${r}\\times2=${2 * r}`)}`,
    cyl,
  );
}

// ── 난이도 갈래 (D-71 축 · D-72 확대) — 초6 `1-1 분수의 나눗셈` ──────────────
//
// 축은 D-72 그대로다. 소단원이 달라도 같은 잣대다.
//   연산 절차 한 번(식·값이 그대로) · 기본 식을 스스로 세움(문장 한 겹)
//   응용 두 단계(중간값·다른 개념 결합) · 심화 역산·조건 조합
//
// 유형 재료는 `tracks/cube-concept-catalog.md` 초6 1-1 에서 채집했다 —
// 실력 6-1 의 「곱셈과 나눗셈의 관계 활용」·「몫이 가장 작은(큰) 나눗셈식 만들기」·
// 「정다각형에서 변의 길이 구하기」·「도형의 넓이를 이용하여 길이 구하기」,
// 응용 6-1 의 「몫이 가장 큰(작은) 분수의 나눗셈식 만들기」가 **심화가 거꾸로 묻는 것**이다.
//
// ⚠️ 소단원 조건은 갈래 넷이 **전부** 지켜야 한다. 그런데 `probe-elem-section-conditions`
// 의 `opShape` 는 발문에 **리터럴 `\div` 식**을 요구한다(식이 없으면 위반). 1-1-1·1-1-2 의
// 기본·응용·심화는 축이 정한 대로 **문장형**이라 그 추출기에 걸린다 — 그쪽 주석이
// 「문장형이 생기면 그때 이 추출기를 넓힌다」고 예고한 자리다. 축을 굽혀 식을 끼워 넣지
// 않는다(발문이 식을 주면 그건 1단이다). 넓히는 일은 판정기 몫으로 보고했다.

/**
 * 수 뒤의 조사는 **읽는 소리**가 정한다 — `84`(팔십사)는 받침이 없고 `13`(십삼)은 있다.
 * `josa()` 는 한글 낱말용이라 숫자에는 쓸 수 없다(`$84$` 의 마지막 글자는 `4` 다).
 */
function numHasFinal(value: number): boolean {
  const last = Math.abs(Math.trunc(value)) % 10;
  if (last === 0) return true; // 십·백·천·만 — 모두 받침이 있다
  return [1, 3, 6, 7, 8].includes(last); // 일·삼·육·칠·팔
}

function numJosa(
  value: number,
  withFinal: string,
  withoutFinal: string,
): string {
  return numHasFinal(value) ? withFinal : withoutFinal;
}

/**
 * 「똑같이 나누어 담는」 소재. 나눗셈이 자연스러운 것만 — 단위와 **그 단위의 조사**까지 묶는다.
 * `kg` 는 「킬로그램」이라 「을」, `L` 은 「리터」라 「를」다 — 라틴 글자로는 못 가른다.
 */
const SHARE_STUFF = [
  { thing: "우유", unit: "L", unitJosa: "를", verb: "나누어 마시려고" },
  { thing: "주스", unit: "L", unitJosa: "를", verb: "나누어 마시려고" },
  { thing: "밀가루", unit: "kg", unitJosa: "을", verb: "나누어 담으려고" },
  { thing: "쌀", unit: "kg", unitJosa: "을", verb: "나누어 담으려고" },
  { thing: "물", unit: "L", unitJosa: "를", verb: "나누어 담으려고" },
  { thing: "설탕", unit: "kg", unitJosa: "을", verb: "나누어 담으려고" },
] as const;

/** 「자르는」 소재 — 길이라 `m` 로 잰다. */
const CUT_STUFF = ["끈", "리본", "철사", "색 테이프", "노끈"] as const;

/** 정다각형 결합에 쓰는 변의 수. `polyName` 표 안이고, 초6 이 이름을 아는 범위다. */
const POLY_SIDES = [3, 4, 5, 6, 8] as const;

/**
 * 「어떤 수」 역산의 재료 — 잘못하여 **곱한** 결과에서 어떤 수를 되짚는다.
 *
 * 구성이 보장하는 것: `wrong = some * k` 라 되짚는 나눗셈이 **딱 떨어진다**.
 * 그리고 `k` 가 `some` 을 안 나누게 골라 **바른 값이 분수**로 남는다 —
 * 자연수로 떨어지면 「몫을 분수로」라는 이 대단원의 알맹이가 사라진다.
 */
function wrongTimes(rng: Rng): { some: number; k: number; wrong: number } {
  for (let t = 0; t < 200; t += 1) {
    const k = intBetween(rng, 3, 9);
    const some = intBetween(rng, 2, 20);
    if (some % k === 0) continue; // 바른 값이 자연수가 되면 분수 문항이 아니다
    return { some, k, wrong: some * k };
  }
  throw new Error("역산 재료를 못 만들었습니다");
}

// ── 1-1-1 (자연수)÷(자연수)의 몫을 분수로 나타내기 ──

/** 연산 — 식이 그대로 주어진다. 절차 한 번. */
function natDivCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 3, 9);
  const a = intBetween(rng, 2, b - 1);
  const done = fmtFrac(a, b);
  const chain =
    gcd(a, b) === 1
      ? `${a}\\div${b}=\\frac{${a}}{${b}}`
      : `${a}\\div${b}=\\frac{${a}}{${b}}=${done}`;
  return make(
    unit,
    `${expr(`${a}\\div${b}`)} 의 몫을 분수로 나타내시오.`,
    expr(done),
    `나누어지는 수를 분자, 나누는 수를 분모로 씁니다. ${expr(chain)}`,
  );
}

/** 기본 — 문장 한 겹. 「똑같이 나눈 한 부분의 양」이라 식을 학생이 세운다. */
function natDivWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, SHARE_STUFF);
  const people = intBetween(rng, 3, 9);
  const amount = intBetween(rng, 2, people - 1);
  return make(
    unit,
    `${s.thing} ${unitNum(amount, s.unit)}${s.unitJosa} ${num(people)}명이 똑같이 ${s.verb} 합니다. ` +
      `한 사람이 갖는 ${s.thing}${josa(s.thing, "은", "는")} 몇 ${s.unit}입니까?`,
    expr(fmtFrac(amount, people)),
    `전체를 사람 수로 나눕니다. ${expr(`${amount}\\div${people}=${fmtFrac(amount, people)}`)}`,
  );
}

/**
 * 응용 — 두 단계. 중간값을 만들거나 도형과 결합한다.
 *
 * ⓐ 남은 양을 먼저 구하고(뺄셈) 나눈다. ⓑ 정다각형의 변의 수를 떠올려(다른 개념) 나눈다.
 * 둘 다 몫이 자연수로 떨어지면 이 대단원이 아니게 되므로 **구성이 분수를 보장한다.**
 */
function natDivApply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const sides = pick(rng, POLY_SIDES);
    // 둘레가 변의 수로 나누어떨어지면 한 변이 자연수가 된다 — 분수 몫을 강제한다.
    const per = pick(
      rng,
      Array.from({ length: 20 }, (_, i) => i + 5).filter(
        (v) => v % sides !== 0,
      ),
    );
    return make(
      unit,
      `둘레가 ${unitNum(per, "m")} 인 ${polyName(sides, true)} 모양 화단이 있습니다. 한 변의 길이는 몇 m입니까?`,
      expr(fmtFrac(per, sides)),
      `${polyName(sides, true)}은 변의 길이가 모두 같으므로 둘레를 변의 수 ${num(sides)}${numRo(sides)} 나눕니다. ` +
        `${expr(`${per}\\div${sides}=${fmtFrac(per, sides)}`)}`,
    );
  }
  const thing = pick(rng, CUT_STUFF);
  const people = intBetween(rng, 3, 8);
  const used = intBetween(rng, 1, 5);
  // 남은 양이 사람 수로 나누어떨어지지 않게 골라 몫이 분수로 남는다.
  const left = pick(
    rng,
    Array.from({ length: 16 }, (_, i) => i + 2).filter((v) => v % people !== 0),
  );
  const total = left + used;
  return make(
    unit,
    `${thing} ${unitNum(total, "m")} 중에서 ${unitNum(used, "m")}${josa("m", "을", "를")} 쓰고, ` +
      `남은 ${thing}${josa(thing, "을", "를")} ${num(people)}명이 똑같이 나누어 가졌습니다. ` +
      `한 사람이 가진 ${thing}${josa(thing, "은", "는")} 몇 m입니까?`,
    expr(fmtFrac(left, people)),
    `먼저 남은 ${thing}의 길이를 구합니다. ${expr(`${total}-${used}=${left}`)} 이므로 ${num(left)} m입니다. ` +
      `이것을 ${num(people)}명이 나누면 ${expr(`${left}\\div${people}=${fmtFrac(left, people)}`)} 입니다.`,
  );
}

/**
 * 심화 — 역산·조건 조합.
 *
 * ⓐ 「잘못하여 곱했더니」 — 곱셈과 나눗셈의 관계로 어떤 수를 되짚고 다시 나눈다(D-72 예시 그대로).
 * ⓑ 수 카드로 **몫이 가장 큰** 나눗셈식 만들기 — 「가장 큰 ÷ 가장 작은」을 스스로 고른다.
 */
function natDivDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const r = wrongTimes(rng);
    return make(
      unit,
      `어떤 수를 ${num(r.k)}${numRo(r.k)} 나누어야 할 것을 잘못하여 ${num(r.k)}${numJosa(r.k, "을", "를")} 곱했더니 ${num(r.wrong)}${numJosa(r.wrong, "이", "가")} 되었습니다. ` +
        `바르게 계산한 값을 분수로 나타내시오.`,
      expr(fmtFrac(r.some, r.k)),
      `잘못 계산한 식에서 어떤 수를 먼저 구합니다. ${expr(`${r.wrong}\\div${r.k}=${r.some}`)} 이므로 어떤 수는 ${num(r.some)}입니다. ` +
        `바르게 계산하면 ${expr(`${r.some}\\div${r.k}=${fmtFrac(r.some, r.k)}`)} 입니다.`,
    );
  }
  // 수 카드 셋 — 서로 달라야 「가장 큰·가장 작은」이 하나로 정해진다.
  const cards: number[] = [];
  while (cards.length < 3) {
    const v = intBetween(rng, 2, 9);
    if (!cards.includes(v)) cards.push(v);
  }
  const hi = Math.max(...cards);
  const lo = Math.min(...cards);
  return make(
    unit,
    `수 카드 ${num(cards[0]!)}, ${num(cards[1]!)}, ${num(cards[2]!)} 중에서 두 장을 골라 (자연수)÷(자연수)를 만들려고 합니다. ` +
      `몫이 가장 큰 나눗셈식을 만들고 그 몫을 분수로 나타내시오.`,
    expr(fmtFrac(hi, lo)),
    `몫이 가장 크려면 나누어지는 수는 가장 크고 나누는 수는 가장 작아야 합니다. ` +
      `가장 큰 수는 ${num(hi)}, 가장 작은 수는 ${num(lo)}이므로 ${expr(`${hi}\\div${lo}=${fmtFrac(hi, lo)}`)} 입니다.`,
  );
}

// ── 1-1-2 (분수)÷(자연수) 알아보기 ──

/** 연산 — 식 그대로. 분모에 나누는 수를 곱하면 끝난다. */
function fracNatCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 7);
  const d = intBetween(rng, 2, 9);
  const top = coprimeTop(rng, d);
  const [p, q] = divFrac(top, d, k, 1);
  return make(
    unit,
    `다음을 계산하시오.\n\n${expr(`\\frac{${top}}{${d}}\\div${k}=\\square`)}`,
    expr(fmtFrac(p, q)),
    `분자는 그대로 두고 분모에 나누는 수를 곱합니다. ` +
      `${expr(`\\frac{${top}}{${d}}\\div${k}=\\frac{${top}}{${d}\\times${k}}=${fmtFrac(p, q)}`)}`,
  );
}

/** 기본 — 문장 한 겹. 나눌 양이 분수라는 것만 다르다. */
function fracNatWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, SHARE_STUFF);
  const d = intBetween(rng, 3, 9);
  const top = coprimeTop(rng, d);
  const people = intBetween(rng, 2, 6);
  const [p, q] = divFrac(top, d, people, 1);
  return make(
    unit,
    `${s.thing} ${expr(`\\frac{${top}}{${d}}`)} ${s.unit}${s.unitJosa} ${num(people)}명이 똑같이 ${s.verb} 합니다. ` +
      `한 사람이 갖는 ${s.thing}${josa(s.thing, "은", "는")} 몇 ${s.unit}입니까?`,
    expr(fmtFrac(p, q)),
    `전체를 사람 수로 나눕니다. 분자는 그대로 두고 분모에 ${num(people)}${numJosa(people, "을", "를")} 곱하면 ` +
      `${expr(`\\frac{${top}}{${d}}\\div${people}=\\frac{${top}}{${d}\\times${people}}=${fmtFrac(p, q)}`)} 입니다.`,
  );
}

/**
 * 응용 — 두 단계.
 *
 * ⓐ 두 번 자른다(나눗셈 두 번). ⓑ 직사각형의 넓이와 가로에서 세로를 구한다
 * (카탈로그 「도형의 넓이를 이용하여 길이 구하기」 — 넓이는 곱이라는 것을 먼저 떠올려야 한다).
 */
function fracNatApply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const thing = pick(rng, CUT_STUFF);
    const d = intBetween(rng, 2, 7);
    const top = coprimeTop(rng, d);
    const first = intBetween(rng, 2, 5);
    const second = intBetween(rng, 2, 4);
    const [m1, n1] = divFrac(top, d, first, 1);
    const [p, q] = divFrac(m1, n1, second, 1);
    return make(
      unit,
      `길이가 ${expr(`\\frac{${top}}{${d}}`)} m인 ${thing}${josa(thing, "을", "를")} 똑같이 ${num(first)}도막으로 자른 뒤, ` +
        `그중 한 도막을 다시 똑같이 ${num(second)}도막으로 잘랐습니다. 가장 짧은 도막의 길이는 몇 m입니까?`,
      expr(fmtFrac(p, q)),
      `먼저 ${num(first)}도막으로 자르면 한 도막은 ${expr(`\\frac{${top}}{${d}}\\div${first}=${fmtFrac(m1, n1)}`)} m입니다. ` +
        `이것을 다시 ${num(second)}도막으로 자르면 ${expr(`${fmtFrac(m1, n1)}\\div${second}=${fmtFrac(p, q)}`)} m입니다.`,
    );
  }
  const width = intBetween(rng, 2, 5);
  const parts = intBetween(rng, 2, 4);
  const d = intBetween(rng, 3, 9);
  const top = coprimeTop(rng, d);
  const [hn, hd] = divFrac(top, d, width, 1); // 세로
  const [p, q] = divFrac(hn, hd, parts, 1); // 한 도막
  return make(
    unit,
    `넓이가 ${expr(`\\frac{${top}}{${d}}`)} m²이고 가로가 ${unitNum(width, "m")} 인 직사각형 모양 종이가 있습니다. ` +
      `이 종이의 세로를 똑같이 ${num(parts)}도막으로 나누면 한 도막의 길이는 몇 m입니까?`,
    expr(fmtFrac(p, q)),
    `(직사각형의 넓이)=(가로)×(세로)이므로 세로는 ${expr(`\\frac{${top}}{${d}}\\div${width}=${fmtFrac(hn, hd)}`)} m입니다. ` +
      `이것을 ${num(parts)}도막으로 나누면 ${expr(`${fmtFrac(hn, hd)}\\div${parts}=${fmtFrac(p, q)}`)} m입니다.`,
  );
}

/**
 * 심화 — 역산.
 *
 * ⓐ 몫에서 **어떤 수를 되짚어** 다른 수로 다시 나눈다. ⓑ 「$\square$ 에 알맞은 수」.
 *
 * ⚠️ 「**잘못하여 곱했더니**」 꼴은 이 소단원에 못 쓴다. 잘못 계산한 결과 `(어떤 수)×k` 는
 * $1$ 을 넘어(때로는 자연수라) 발문에 **진분수가 사라진다** — 소단원 이름이 내건
 * 「(분수)÷(자연수)」가 깨진다. 실제로 씨앗 104 에서 「곱했더니 $3$이 되었습니다」가 나왔다.
 * 되짚는 방향을 «나눈 몫»으로 바꾸면 발문의 분수가 늘 진분수로 남는다 —
 * **구성이 조건을 보장**하고, 시험이 그것을 씨앗 16개에서 확인한다.
 */
function fracNatDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 2, 7);
  const top = coprimeTop(rng, d);
  const k = intBetween(rng, 2, 6);
  if (intBetween(rng, 0, 1) === 0) {
    const other = intBetween(rng, 2, 6);
    const [qn, qd] = divFrac(top, d, k, 1); // 나눈 몫 — 진분수보다 더 작다
    const [p, q] = divFrac(top, d, other, 1);
    return make(
      unit,
      `어떤 수를 ${num(k)}${numRo(k)} 나누었더니 ${expr(fmtFrac(qn, qd))}${numJosa(lastSpokenNumber(fmtFrac(qn, qd)), "이", "가")} 되었습니다. ` +
        `어떤 수를 ${num(other)}${numRo(other)} 나눈 몫은 얼마입니까?`,
      expr(fmtFrac(p, q)),
      `나눗셈을 거꾸로 하면 어떤 수를 구할 수 있습니다. ` +
        `${expr(`${fmtFrac(qn, qd)}\\times${k}=${fmtFrac(top, d)}`)} 이므로 어떤 수는 ${expr(fmtFrac(top, d))} 입니다. ` +
        `이것을 ${num(other)}${numRo(other)} 나누면 ${expr(`${fmtFrac(top, d)}\\div${other}=${fmtFrac(p, q)}`)} 입니다.`,
    );
  }
  const [p, q] = divFrac(top, d, k, 1);
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 자연수를 구하시오.\n\n${expr(`\\frac{${top}}{${d}}\\div\\square=${fmtFrac(p, q)}`)}`,
    num(k),
    `분자는 그대로 두고 분모에 ${expr("\\square")}를 곱한 것이므로, ` +
      `분모끼리 견주면 ${expr(`${d}\\times\\square=${d * k}`)} 입니다. ` +
      `따라서 ${expr(`\\square=${d * k}\\div${d}=${k}`)} 입니다.`,
  );
}

// ── 1-1-3 (대분수)÷(자연수) 알아보기 ──

/** 대분수 재료 — 분수 부분은 기약분수로, 가분수로 고친 분자도 함께 돌려준다. */
function mixedParts(
  rng: Rng,
  maxWhole = 4,
): { w: number; t: number; d: number; imp: number } {
  const d = intBetween(rng, 2, 8);
  const t = coprimeTop(rng, d);
  const w = intBetween(rng, 1, maxWhole);
  return { w, t, d, imp: w * d + t };
}

/** 연산 — 식 그대로. 대분수를 가분수로 고치는 절차 한 번. */
function mixedNatCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = mixedParts(rng);
  const k = intBetween(rng, 2, 6);
  const [p, q] = divFrac(m.imp, m.d, k, 1);
  return make(
    unit,
    `다음을 계산하시오.\n\n${expr(`${m.w}\\frac{${m.t}}{${m.d}}\\div${k}=\\square`)}`,
    expr(fmtFrac(p, q)),
    `대분수를 가분수로 고칩니다. ${expr(`${m.w}\\frac{${m.t}}{${m.d}}=\\frac{${m.imp}}{${m.d}}`)} 이므로 ` +
      `분자는 그대로 두고 분모에 나누는 수를 곱하면 ${expr(`\\frac{${m.imp}}{${m.d}\\times${k}}=${fmtFrac(p, q)}`)} 입니다.`,
  );
}

/** 기본 — 문장 한 겹. 나눌 양이 대분수다. */
function mixedNatWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, SHARE_STUFF);
  const m = mixedParts(rng, 5);
  const people = intBetween(rng, 2, 6);
  const [p, q] = divFrac(m.imp, m.d, people, 1);
  return make(
    unit,
    `${s.thing} ${expr(`${m.w}\\frac{${m.t}}{${m.d}}`)} ${s.unit}${s.unitJosa} ${num(people)}명이 똑같이 ${s.verb} 합니다. ` +
      `한 사람이 갖는 ${s.thing}${josa(s.thing, "은", "는")} 몇 ${s.unit}입니까?`,
    expr(fmtFrac(p, q)),
    `대분수를 가분수로 고치면 ${expr(`${m.w}\\frac{${m.t}}{${m.d}}=\\frac{${m.imp}}{${m.d}}`)} 입니다. ` +
      `사람 수로 나누면 ${expr(`\\frac{${m.imp}}{${m.d}\\times${people}}=${fmtFrac(p, q)}`)} 입니다.`,
  );
}

/**
 * 응용 — 두 단계. 정다각형의 둘레에서 한 변을 구한다(다른 개념 결합).
 * ⓑ 는 「빠르기」 — 간 거리와 걸린 시간에서 한 시간에 간 거리를 구한다(응용 6-1 유형).
 */
function mixedNatApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = mixedParts(rng, 5);
  if (intBetween(rng, 0, 1) === 0) {
    const sides = pick(rng, POLY_SIDES);
    const [p, q] = divFrac(m.imp, m.d, sides, 1);
    return make(
      unit,
      `둘레가 ${expr(`${m.w}\\frac{${m.t}}{${m.d}}`)} m인 ${polyName(sides, true)} 모양 액자가 있습니다. 한 변의 길이는 몇 m입니까?`,
      expr(fmtFrac(p, q)),
      `${polyName(sides, true)}은 변의 길이가 모두 같으므로 둘레를 변의 수 ${num(sides)}${numRo(sides)} 나눕니다. ` +
        `${expr(`${m.w}\\frac{${m.t}}{${m.d}}=\\frac{${m.imp}}{${m.d}}`)} 이므로 ` +
        `${expr(`\\frac{${m.imp}}{${m.d}\\times${sides}}=${fmtFrac(p, q)}`)} 입니다.`,
    );
  }
  const hours = intBetween(rng, 2, 6);
  const [hn, hd] = divFrac(m.imp, m.d, hours, 1); // 한 시간 동안 간 거리
  const [p, q] = divFrac(hn, hd, 2, 1); // 그 절반 = 30분
  return make(
    unit,
    `자전거를 타고 ${expr(`${m.w}\\frac{${m.t}}{${m.d}}`)} km를 가는 데 ${num(hours)}시간이 걸렸습니다. ` +
      `같은 빠르기로 갈 때 ${num(30)}분 동안 간 거리는 몇 km입니까?`,
    expr(fmtFrac(p, q)),
    `먼저 한 시간 동안 간 거리를 구합니다. ` +
      `${expr(`${m.w}\\frac{${m.t}}{${m.d}}\\div${hours}=${fmtFrac(hn, hd)}`)} km입니다. ` +
      `${num(30)}분은 한 시간의 절반이므로 ${expr(`${fmtFrac(hn, hd)}\\div2=${fmtFrac(p, q)}`)} km입니다.`,
  );
}

/**
 * 심화 — 역산. 「잘못하여 곱했더니」의 결과가 대분수라, 되짚은 어떤 수도 대분수다.
 *
 * ⚠️ 발문에 **대분수가 있어야** 이 소단원이다(조건 판정기가 `\d+\frac{` 를 본다).
 * 처음엔 「어떤 수가 대분수면 결과도 대분수」라고 적어 두었는데 **그것이 거짓이었다** —
 * `d | imp\times k` 면 결과가 **자연수**가 되어 발문에서 대분수가 사라진다
 * (실측: 씨앗 135 에서 「곱했더니 $7$이 되었습니다」). `gcd(t,d)=1` 이므로
 * `d | imp\times k \iff d | k` 다 — **`k` 가 `d` 의 배수가 아니게** 골라 구성이 조건을 보장한다.
 */
function mixedNatDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = mixedParts(rng, 4);
  let k = intBetween(rng, 2, 5);
  for (let t = 0; t < 20 && k % m.d === 0; t += 1) k = intBetween(rng, 2, 5);
  if (k % m.d === 0) k = m.d === 2 ? 3 : 2;
  const [wn, wd] = mulFrac(m.imp, m.d, k, 1);
  const [p, q] = divFrac(m.imp, m.d, k, 1);
  return make(
    unit,
    `어떤 수를 ${num(k)}${numRo(k)} 나누어야 할 것을 잘못하여 ${num(k)}${numJosa(k, "을", "를")} 곱했더니 ` +
      `${expr(fmtFrac(wn, wd))}${numJosa(lastSpokenNumber(fmtFrac(wn, wd)), "이", "가")} 되었습니다. 바르게 계산한 값은 얼마입니까?`,
    expr(fmtFrac(p, q)),
    `잘못 계산한 식에서 어떤 수를 먼저 구합니다. ` +
      `${expr(`${fmtFrac(wn, wd)}\\div${k}=${m.w}\\frac{${m.t}}{${m.d}}`)} 이므로 어떤 수는 ` +
      `${expr(`${m.w}\\frac{${m.t}}{${m.d}}`)} 입니다. 바르게 계산하면 ` +
      `${expr(`\\frac{${m.imp}}{${m.d}\\times${k}}=${fmtFrac(p, q)}`)} 입니다.`,
  );
}

// ── 난이도 갈래 (D-72 확대 2차분) — 초6 `1-2 각기둥과 각뿔` ────────────────
//
// 도형 대단원이라 1-1 과 두 가지가 다르다.
//
// ⑴ **수가 `sides` 하나뿐이다**(3~8, 여섯 값). 그대로면 갈래당 변형이 6가지라 모자란다 —
//    g5 파일럿의 `AREA_THINGS` 처럼 **소재 풀**을 달아 소재 × sides × 묻는 요소로 벌린다.
// ⑵ **R5 발문중복이 표준 문항까지 견준다**(`probe-elem-rules.ts` 가 표준+4단을 한 사전에 넣는다).
//    수 공간이 좁아 표준 문형을 그대로 쓰면 바로 충돌한다. 그래서 표준이 쓰는
//    「…은 모두 몇 개인가?」·「…의 이름을 쓰시오.」·「…을 무엇이라고 하는가?」를 **피하고**
//    갈래는 「…의 수를 구하시오.」·「다음 … 몇 개입니까?」로 적는다.
//
// 유형 재료는 `cube-concept-catalog.md` 초6 1-2 에서 채집했다 — 실력 6-1 「조건을 만족하는
// 입체도형 알아보기」·「모든 모서리의 길이의 합 구하기」, 응용 6-1 「각기둥(각뿔)의 구성 요소
// 사이의 관계」·「밑면의 모양이 같은 각기둥과 각뿔」이 **심화가 거꾸로 묻는 것**이다.
//
// 그림은 겨냥도(`prism`·`pyramid`)를 붙인다. 원장님 ⑪(숨은 모서리 점선)이 고쳐져
// 시험으로 잠겼으므로 **「그림을 보고 세기」를 물을 수 있다.** 겨냥도는 치수를 안 적어 R6 도 안전하다.

/** 각기둥 모양 소재 — 「기둥처럼 곧은」 것만. */
const PRISM_THINGS = [
  "상자",
  "필통",
  "사물함",
  "케이크 상자",
  "연필꽂이",
  "포장 상자",
] as const;

/** 각뿔 모양 소재 — 「뿔처럼 뾰족한」 것만. */
const PYRAMID_THINGS = [
  "텐트",
  "지붕",
  "모형 탑",
  "종이 고깔",
  "피라미드 모형",
] as const;

/** 갈래가 쓰는 밑면 변의 수. `polyName`·`sino` 표 안이고 겨냥도 엔진이 받는 범위(3~8)다. */
const TIER_SIDES = [3, 4, 5, 6, 7, 8] as const;

/** 각기둥·각뿔의 구성 요소 수 — **공식을 한곳에** 둔다(갈래 넷이 같은 것을 봐야 한다). */
const prismParts = (n: number) => ({ 꼭짓점: 2 * n, 모서리: 3 * n, 면: n + 2 });
const pyramidParts = (n: number) => ({
  꼭짓점: n + 1,
  모서리: 2 * n,
  면: n + 1,
});

/** 구성 요소 이름 — 조사가 낱말마다 달라 함께 든다. */
const PART_KEYS = ["꼭짓점", "모서리", "면"] as const;
type PartKey = (typeof PART_KEYS)[number];

// ── 1-2-1 각기둥 알아보기와 각기둥의 밑면과 옆면 ──

/** 연산 — 이름이 주어진다. 「옆면의 수 = 밑면의 변의 수」를 한 번 쓰면 끝난다. */
function prismFaceCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const byName = intBetween(rng, 0, 1) === 0;
  const subject = byName
    ? `${sino(n)}각기둥`
    : `밑면이 ${polyName(n)}인 각기둥`;
  return make(
    unit,
    `${subject}의 옆면의 수를 구하시오.`,
    num(n),
    `각기둥의 옆면은 밑면의 변 하나마다 하나씩 생깁니다. ` +
      `밑면이 ${polyName(n)}이므로 옆면은 ${num(n)}개입니다.`,
    fig("prism", { sides: n, h: 3 }),
  );
}

/** 기본 — 그림 한 겹. 발문이 밑면 모양을 **안 알려 준다** — 겨냥도에서 읽어야 한다. */
function prismFaceRead(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const thing = pick(rng, PRISM_THINGS);
  return make(
    unit,
    `다음은 각기둥 모양 ${thing}입니다. 옆면은 몇 개입니까?`,
    num(n),
    `겨냥도에서 밑면이 ${polyName(n)}임을 읽습니다. 옆면의 수는 밑면의 변의 수와 같으므로 ${num(n)}개입니다.`,
    fig("prism", { sides: n, h: 3 }),
  );
}

/**
 * 응용 — 두 걸음. 옆면 하나의 넓이를 만든 뒤 옆면 수만큼 곱한다(직사각형 넓이와 결합).
 *
 * ⚠️ 「**정사각형** … **한 변이** … **넓이는 몇**」으로 쓰면 `probe-elem-arithmetic` 의
 * 정사각형 넓이 규칙(⑧)이 밑면 넓이 `a\times a` 를 참값으로 읽어 **거짓 경보**가 난다.
 * 여기서 묻는 것은 밑면이 아니라 **옆면 전체**다. 판정기 규칙 자체는 옳으므로 이쪽 문구를
 * 「변의 길이가 모두 같은」으로 바꿔 어긋남을 없앴다 — 뜻은 그대로고 오히려 더 일반적이다.
 */
function prismFaceApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const a = intBetween(rng, 3, 9);
  const h = intBetween(rng, 4, 12);
  return make(
    unit,
    `밑면이 ${polyName(n)}이고 밑면의 변의 길이가 모두 ${unitNum(a, "cm")} 로 같은 각기둥이 있습니다. ` +
      `이 각기둥의 높이가 ${unitNum(h, "cm")} 일 때 옆면 전체의 넓이는 몇 cm²입니까?`,
    num(n * a * h),
    `옆면 하나는 가로 ${unitNum(a, "cm")}, 세로 ${unitNum(h, "cm")} 인 직사각형이므로 넓이는 ` +
      `${expr(`${a}\\times${h}=${a * h}`)} 입니다. 옆면이 ${num(n)}개이므로 ` +
      `${expr(`${a * h}\\times${n}=${n * a * h}`)} 입니다.`,
  );
}

/**
 * 심화 — 역산 **두 걸음**. 둘 다 응용(넓이를 구한다)을 거꾸로 돌린 것이다.
 * ⓐ 옆면 전체의 넓이에서 **높이**를 되짚는다. ⓑ 같은 넓이에서 **밑면의 모양**을 되짚는다.
 *
 * ⚠️ ⓑ 는 예전에 「옆면이 $n$개 → 밑면은 몇 각형」이었다 — 「옆면 수 = 밑면 변의 수」를
 *    **이름만 바꿔 답하는 한 걸음**이라 연산·기본과 같은 무게였다.
 */
function prismFaceDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const a = intBetween(rng, 3, 9);
  const h = intBetween(rng, 4, 12);
  const area = n * a * h;
  if (intBetween(rng, 0, 1) === 0) {
    return makeDeep(
      unit,
      `밑면이 ${polyName(n)}인 각기둥의 옆면 전체의 넓이가 ${num(area)} cm²입니다. ` +
        `밑면의 변의 길이가 모두 ${unitNum(a, "cm")} 로 같을 때, 이 각기둥의 높이는 몇 cm입니까?`,
      num(h),
      [
        `옆면이 ${num(n)}개이므로 옆면 하나의 넓이는 ${expr(`${area}\\div${n}=${a * h}`)} 입니다.`,
        `옆면은 가로가 ${unitNum(a, "cm")} 인 직사각형이므로 높이는 ${expr(`${a * h}\\div${a}=${h}`)} 입니다.`,
      ],
    );
  }
  return makeDeep(
    unit,
    `밑면의 변의 길이가 모두 ${unitNum(a, "cm")} 로 같고 높이가 ${unitNum(h, "cm")} 인 각기둥이 있습니다. ` +
      `옆면 전체의 넓이가 ${num(area)} cm²일 때 밑면은 몇 각형입니까?`,
    polyName(n),
    [
      `옆면 하나는 가로 ${unitNum(a, "cm")}, 세로 ${unitNum(h, "cm")} 인 직사각형이므로 넓이는 ` +
        `${expr(`${a}\\times${h}=${a * h}`)} 입니다.`,
      `옆면의 수는 ${expr(`${area}\\div${a * h}=${n}`)} 이고, 옆면의 수는 밑면의 변의 수와 같으므로 ` +
        `밑면은 ${polyName(n)}입니다.`,
    ],
  );
}

// ── 1-2-2 각기둥의 이름과 구성 요소 ──

/** 연산 — 이름이 주어진다. 구성 요소 공식을 한 번 쓴다. */
function prismPartCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const key: PartKey = pick(rng, PART_KEYS);
  const parts = prismParts(n);
  const how: Record<PartKey, string> = {
    꼭짓점: `두 밑면의 꼭짓점을 더합니다. ${expr(`${n}\\times2=${parts.꼭짓점}`)}`,
    모서리: `두 밑면의 모서리 ${num(2 * n)}개와 옆면의 모서리 ${num(n)}개를 더합니다. ${expr(`${2 * n}+${n}=${parts.모서리}`)}`,
    면: `밑면 ${num(2)}개와 옆면 ${num(n)}개를 더합니다. ${expr(`2+${n}=${parts.면}`)}`,
  };
  return make(
    unit,
    `${sino(n)}각기둥의 ${key}의 수를 구하시오.`,
    num(parts[key]),
    how[key],
    fig("prism", { sides: n, h: 3 }),
  );
}

/** 기본 — 그림 한 겹. 밑면 모양을 겨냥도에서 읽고 구성 요소를 센다. */
function prismPartRead(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const key: PartKey = pick(rng, PART_KEYS);
  const thing = pick(rng, PRISM_THINGS);
  const parts = prismParts(n);
  return make(
    unit,
    `다음은 각기둥 모양 ${thing}입니다. ${key}${josa(key, "은", "는")} 몇 개입니까?`,
    num(parts[key]),
    `겨냥도에서 밑면이 ${polyName(n)}임을 읽습니다. ${sino(n)}각기둥의 ${key}${josa(key, "은", "는")} ${num(parts[key])}개입니다.`,
    fig("prism", { sides: n, h: 3 }),
  );
}

/** 응용 — 두 걸음. 두 구성 요소를 각각 구한 뒤 견준다(카탈로그 「구성 요소 사이의 관계」). */
function prismPartApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const parts = prismParts(n);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `밑면이 ${polyName(n)}인 각기둥의 모서리의 수는 꼭짓점의 수보다 몇 개 더 많습니까?`,
      num(parts.모서리 - parts.꼭짓점),
      `모서리는 ${expr(`${n}\\times3=${parts.모서리}`)} 개이고 꼭짓점은 ${expr(`${n}\\times2=${parts.꼭짓점}`)} 개입니다. ` +
        `${expr(`${parts.모서리}-${parts.꼭짓점}=${parts.모서리 - parts.꼭짓점}`)} 이므로 ${num(parts.모서리 - parts.꼭짓점)}개 더 많습니다.`,
    );
  }
  return make(
    unit,
    `밑면이 ${polyName(n)}인 각기둥의 꼭짓점의 수와 면의 수를 더하면 얼마입니까?`,
    num(parts.꼭짓점 + parts.면),
    `꼭짓점은 ${expr(`${n}\\times2=${parts.꼭짓점}`)} 개이고 면은 ${expr(`${n}+2=${parts.면}`)} 개입니다. ` +
      `${expr(`${parts.꼭짓점}+${parts.면}=${parts.꼭짓점 + parts.면}`)} 입니다.`,
  );
}

/** 심화 — 역산. 구성 요소 하나에서 밑면의 변의 수를 되짚고 **다른 구성 요소**를 구한다. */
function prismPartDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const parts = prismParts(n);
  const given: PartKey = pick(rng, ["모서리", "꼭짓점"] as const);
  const asked: PartKey = given === "모서리" ? "면" : "모서리";
  const back =
    given === "모서리"
      ? `모서리는 밑면의 변의 수의 ${num(3)}배이므로 ${expr(`${parts.모서리}\\div3=${n}`)} 에서 밑면은 ${polyName(n)}입니다.`
      : `꼭짓점은 밑면의 변의 수의 ${num(2)}배이므로 ${expr(`${parts.꼭짓점}\\div2=${n}`)} 에서 밑면은 ${polyName(n)}입니다.`;
  const forward =
    asked === "면"
      ? `${sino(n)}각기둥의 면은 밑면 ${num(2)}개와 옆면 ${num(n)}개를 더한 ${expr(`2+${n}=${parts.면}`)} 개입니다.`
      : `${sino(n)}각기둥의 모서리는 ${expr(`${n}\\times3=${parts.모서리}`)} 개입니다.`;
  return make(
    unit,
    `${given}${josa(given, "이", "가")} ${num(parts[given])}개인 각기둥이 있습니다. 이 각기둥의 ${asked}${josa(asked, "은", "는")} 몇 개입니까?`,
    num(parts[asked]),
    `${back} ${forward}`,
  );
}

// ── 1-2-3 각기둥의 전개도 ──

/**
 * 연산 — 이름이 주어진다. 전개도의 옆면 수를 한 번에 센다.
 *
 * 밑면을 «입체 이름»으로도 «밑면 모양»으로도 적는다 — `sides` 가 여섯 값뿐이라
 * 한 문형만 쓰면 변형이 6가지에 그친다(시험이 갈래당 8가지를 요구한다).
 */
function netCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const byName = intBetween(rng, 0, 1) === 0;
  const subject = byName
    ? `${sino(n)}각기둥`
    : `밑면이 ${polyName(n)}인 각기둥`;
  return make(
    unit,
    `${subject}의 전개도에서 옆면의 수를 구하시오.`,
    num(n),
    `전개도의 옆면은 밑면의 변 하나마다 직사각형 하나입니다. 밑면이 ${polyName(n)}이므로 ${num(n)}개입니다.`,
    fig("prism", { sides: n, h: 3, net: true }),
  );
}

/** 기본 — 그림 한 겹. 전개도만 보고 접었을 때의 입체를 알아낸다. */
function netRead(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const thing = pick(rng, PRISM_THINGS);
  return make(
    unit,
    `다음은 ${thing}${josa(thing, "을", "를")} 펼친 그림입니다. 이 전개도를 접으면 만들어지는 입체도형은 무엇입니까?`,
    `${sino(n)}각기둥`,
    `밑면이 ${polyName(n)} 둘이고 옆면이 직사각형 ${num(n)}개이므로 접으면 ${sino(n)}각기둥이 됩니다.`,
    fig("prism", { sides: n, h: 3, net: true }),
  );
}

/** 응용 — 두 걸음. 옆면이 이어 붙은 전체 가로가 **밑면의 둘레**와 같다는 것을 쓴다. */
function netApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const a = intBetween(rng, 3, 9);
  return make(
    unit,
    `밑면이 ${polyName(n)}이고 밑면의 변의 길이가 모두 ${unitNum(a, "cm")} 로 같은 각기둥의 전개도입니다. ` +
      `옆면 전체의 가로 길이는 몇 cm입니까?`,
    num(n * a),
    `옆면 ${num(n)}개가 나란히 붙어 있으므로 가로 전체는 밑면의 둘레와 같습니다. ` +
      `${expr(`${a}\\times${n}=${n * a}`)} 입니다.`,
    fig("prism", { sides: n, h: 3, net: true }),
  );
}

/** 심화 — 역산. 전개도의 옆면 수에서 밑면을 되짚고 겨냥도의 구성 요소를 구한다. */
function netDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const parts = prismParts(n);
  const asked: PartKey = pick(rng, ["꼭짓점", "모서리"] as const);
  return make(
    unit,
    `어떤 각기둥의 전개도에서 옆면인 직사각형이 ${num(n)}개입니다. ` +
      `이 전개도를 접어 만든 각기둥의 ${asked}${josa(asked, "은", "는")} 몇 개입니까?`,
    num(parts[asked]),
    `옆면이 ${num(n)}개이므로 밑면은 ${polyName(n)}이고, 접으면 ${sino(n)}각기둥이 됩니다. ` +
      (asked === "꼭짓점"
        ? `꼭짓점은 ${expr(`${n}\\times2=${parts.꼭짓점}`)} 개입니다.`
        : `모서리는 ${expr(`${n}\\times3=${parts.모서리}`)} 개입니다.`),
  );
}

// ── 1-2-4 각뿔 알아보기와 각뿔의 밑면과 옆면 ──

/** 연산 — 이름이 주어진다. 옆면의 수를 한 번에 센다. */
function pyrFaceCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const byName = intBetween(rng, 0, 1) === 0;
  const subject = byName ? `${sino(n)}각뿔` : `밑면이 ${polyName(n)}인 각뿔`;
  return make(
    unit,
    `${subject}의 옆면의 수를 구하시오.`,
    num(n),
    `각뿔의 옆면은 밑면의 변 하나와 각뿔의 꼭짓점을 이은 삼각형입니다. ` +
      `밑면이 ${polyName(n)}이므로 옆면은 ${num(n)}개입니다.`,
    fig("pyramid", { sides: n, h: 3 }),
  );
}

/** 기본 — 그림 한 겹. 밑면 모양을 겨냥도에서 읽는다. */
function pyrFaceRead(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const thing = pick(rng, PYRAMID_THINGS);
  return make(
    unit,
    `다음은 각뿔 모양 ${thing}입니다. 옆면은 몇 개입니까?`,
    num(n),
    `겨냥도에서 밑면이 ${polyName(n)}임을 읽습니다. 옆면인 삼각형은 밑면의 변마다 하나씩이므로 ${num(n)}개입니다.`,
    fig("pyramid", { sides: n, h: 3 }),
  );
}

/**
 * 응용 — 두 걸음. 옆면인 **삼각형** 하나의 넓이를 만든 뒤 옆면 수만큼 곱한다.
 * `a\times h` 를 짝수로 골라 삼각형 넓이가 자연수로 떨어지는 것을 **구성이** 보장한다.
 */
function pyrFaceApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const a = intBetween(rng, 3, 9);
  const h = pick(
    rng,
    Array.from({ length: 9 }, (_, i) => i + 4).filter((v) => (a * v) % 2 === 0),
  );
  const one = (a * h) / 2;
  return make(
    unit,
    `밑면이 ${polyName(n)}이고 밑면의 변의 길이가 모두 ${unitNum(a, "cm")} 로 같은 각뿔이 있습니다. ` +
      `옆면인 삼각형의 높이가 ${unitNum(h, "cm")} 일 때 옆면 전체의 넓이는 몇 cm²입니까?`,
    num(n * one),
    `옆면 하나는 밑변 ${unitNum(a, "cm")}, 높이 ${unitNum(h, "cm")} 인 삼각형이므로 넓이는 ` +
      `${expr(`${a}\\times${h}\\div2=${one}`)} 입니다. 옆면이 ${num(n)}개이므로 ` +
      `${expr(`${one}\\times${n}=${n * one}`)} 입니다.`,
  );
}

/** 심화 — 조건 조합. 밑면이 같은 각기둥과 각뿔을 오간다(카탈로그 유형 그대로). */
function pyrFaceDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const pyr = pyramidParts(n);
  const prism = prismParts(n);
  if (intBetween(rng, 0, 1) === 0) {
    // 묻는 요소를 셋으로 벌린다 — 「모양 둘 × 밑면 여섯」만으로는 씨앗 16개에서
    // 변형이 요구선(8가지)에 딱 붙어 여유가 없다(실측 8).
    const asked: PartKey = pick(rng, PART_KEYS);
    const how: Record<PartKey, string> = {
      면: `밑면 ${num(1)}개와 옆면 ${num(n)}개를 더한 ${expr(`1+${n}=${pyr.면}`)} 개입니다.`,
      꼭짓점: `밑면의 꼭짓점 ${num(n)}개에 각뿔의 꼭짓점 ${num(1)}개를 더한 ${expr(`${n}+1=${pyr.꼭짓점}`)} 개입니다.`,
      모서리: `밑면의 모서리 ${num(n)}개와 옆면의 모서리 ${num(n)}개를 더한 ${expr(`${n}+${n}=${pyr.모서리}`)} 개입니다.`,
    };
    return make(
      unit,
      `밑면의 모양이 같은 각기둥과 각뿔이 있습니다. 각기둥의 옆면이 ${num(n)}개일 때, ` +
        `각뿔의 ${asked}${josa(asked, "은", "는")} 몇 개입니까?`,
      num(pyr[asked]),
      `각기둥의 옆면이 ${num(n)}개이므로 밑면은 ${polyName(n)}입니다. ` +
        `밑면이 같은 각뿔의 ${asked}${josa(asked, "은", "는")} ${how[asked]}`,
    );
  }
  // 견주는 요소를 면 하나로 고정하면 답이 늘 $1$ 이다((n+2)-(n+1) — n 과 무관).
  // 심화 답이 상수면 외워서 맞힌다 — 요소를 셋으로 벌려 답이 $1$·$n-1$·$n$ 으로 갈리게 한다.
  const key: PartKey = pick(rng, PART_KEYS);
  const diff = prism[key] - pyr[key];
  const howOf: Record<PartKey, string> = {
    면: `각기둥의 면은 ${expr(`2+${n}=${prism.면}`)} 개, 각뿔의 면은 ${expr(`1+${n}=${pyr.면}`)} 개이므로 `,
    꼭짓점: `각기둥의 꼭짓점은 ${expr(`${n}\\times2=${prism.꼭짓점}`)} 개, 각뿔의 꼭짓점은 ${expr(`${n}+1=${pyr.꼭짓점}`)} 개이므로 `,
    모서리: `각기둥의 모서리는 ${expr(`${n}\\times3=${prism.모서리}`)} 개, 각뿔의 모서리는 ${expr(`${n}\\times2=${pyr.모서리}`)} 개이므로 `,
  };
  return make(
    unit,
    `밑면의 모양이 같은 각기둥과 각뿔이 있습니다. 각뿔의 옆면이 ${num(n)}개일 때, ` +
      `각기둥의 ${key}${josa(key, "은", "는")} 각뿔의 ${key}보다 몇 개 더 많습니까?`,
    num(diff),
    `각뿔의 옆면이 ${num(n)}개이므로 밑면은 ${polyName(n)}입니다. ` +
      howOf[key] +
      `${expr(`${prism[key]}-${pyr[key]}=${diff}`)} 개 더 많습니다.`,
  );
}

// ── 1-2-5 각뿔의 이름과 구성 요소 ──

/** 연산 — 이름이 주어진다. 구성 요소 공식을 한 번 쓴다. */
function pyrPartCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const key: PartKey = pick(rng, PART_KEYS);
  const parts = pyramidParts(n);
  const how: Record<PartKey, string> = {
    꼭짓점: `밑면의 꼭짓점 ${num(n)}개에 각뿔의 꼭짓점 ${num(1)}개를 더합니다. ${expr(`${n}+1=${parts.꼭짓점}`)}`,
    모서리: `밑면의 모서리 ${num(n)}개와 옆면의 모서리 ${num(n)}개를 더합니다. ${expr(`${n}+${n}=${parts.모서리}`)}`,
    면: `밑면 ${num(1)}개와 옆면 ${num(n)}개를 더합니다. ${expr(`1+${n}=${parts.면}`)}`,
  };
  return make(
    unit,
    `${sino(n)}각뿔의 ${key}의 수를 구하시오.`,
    num(parts[key]),
    how[key],
    fig("pyramid", { sides: n, h: 3 }),
  );
}

/** 기본 — 그림 한 겹. */
function pyrPartRead(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const key: PartKey = pick(rng, PART_KEYS);
  const thing = pick(rng, PYRAMID_THINGS);
  const parts = pyramidParts(n);
  return make(
    unit,
    `다음은 각뿔 모양 ${thing}입니다. ${key}${josa(key, "은", "는")} 몇 개입니까?`,
    num(parts[key]),
    `겨냥도에서 밑면이 ${polyName(n)}임을 읽습니다. ${sino(n)}각뿔의 ${key}${josa(key, "은", "는")} ${num(parts[key])}개입니다.`,
    fig("pyramid", { sides: n, h: 3 }),
  );
}

/** 응용 — 두 걸음. 두 구성 요소를 각각 구한 뒤 견준다. */
function pyrPartApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const parts = pyramidParts(n);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `밑면이 ${polyName(n)}인 각뿔의 모서리의 수는 면의 수보다 몇 개 더 많습니까?`,
      num(parts.모서리 - parts.면),
      `모서리는 ${expr(`${n}\\times2=${parts.모서리}`)} 개이고 면은 ${expr(`1+${n}=${parts.면}`)} 개입니다. ` +
        `${expr(`${parts.모서리}-${parts.면}=${parts.모서리 - parts.면}`)} 이므로 ${num(parts.모서리 - parts.면)}개 더 많습니다.`,
    );
  }
  return make(
    unit,
    `밑면이 ${polyName(n)}인 각뿔의 꼭짓점의 수와 모서리의 수를 더하면 얼마입니까?`,
    num(parts.꼭짓점 + parts.모서리),
    `꼭짓점은 ${expr(`${n}+1=${parts.꼭짓점}`)} 개이고 모서리는 ${expr(`${n}\\times2=${parts.모서리}`)} 개입니다. ` +
      `${expr(`${parts.꼭짓점}+${parts.모서리}=${parts.꼭짓점 + parts.모서리}`)} 입니다.`,
  );
}

/**
 * 심화 — 역산. 구성 요소 하나에서 밑면을 되짚고 다른 구성 요소를 구한다.
 *
 * ⚠️ 각뿔은 **꼭짓점과 면의 수가 같다**(둘 다 `n+1`). 그 둘을 짝지으면
 * 「면이 $7$개인 각뿔의 꼭짓점은?」 → $7$ 이라 되짚을 것이 없는 문항이 된다 — 짝에서 뺀다.
 */
const PYR_DEEP_PAIRS = [
  ["모서리", "꼭짓점"],
  ["모서리", "면"],
  ["면", "모서리"],
  ["꼭짓점", "모서리"],
] as const;

function pyrPartDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const parts = pyramidParts(n);
  const [given, asked] = pick(rng, PYR_DEEP_PAIRS);
  const backOf: Record<PartKey, string> = {
    모서리: `모서리는 밑면의 변의 수의 ${num(2)}배이므로 ${expr(`${parts.모서리}\\div2=${n}`)} 에서 밑면은 ${polyName(n)}입니다.`,
    면: `면은 밑면 ${num(1)}개와 옆면을 더한 것이므로 ${expr(`${parts.면}-1=${n}`)} 에서 밑면은 ${polyName(n)}입니다.`,
    꼭짓점: `꼭짓점은 밑면의 꼭짓점에 각뿔의 꼭짓점 ${num(1)}개를 더한 것이므로 ${expr(`${parts.꼭짓점}-1=${n}`)} 에서 밑면은 ${polyName(n)}입니다.`,
  };
  const forwardOf: Record<PartKey, string> = {
    꼭짓점: `${sino(n)}각뿔의 꼭짓점은 ${expr(`${n}+1=${parts.꼭짓점}`)} 개입니다.`,
    모서리: `${sino(n)}각뿔의 모서리는 ${expr(`${n}\\times2=${parts.모서리}`)} 개입니다.`,
    면: `${sino(n)}각뿔의 면은 밑면 ${num(1)}개와 옆면 ${num(n)}개를 더한 ${expr(`1+${n}=${parts.면}`)} 개입니다.`,
  };
  const back = backOf[given];
  const forward = forwardOf[asked];
  return make(
    unit,
    `${given}${josa(given, "이", "가")} ${num(parts[given])}개인 각뿔이 있습니다. 이 각뿔의 ${asked}${josa(asked, "은", "는")} 몇 개입니까?`,
    num(parts[asked]),
    `${back} ${forward}`,
  );
}

// ── 난이도 갈래 (D-72 확대 3차분) — 초6 `1-3 소수의 나눗셈` ────────────────
//
// 수는 전부 **×100 정수(센트)** 로 들고 다닌다(R2) — 지면에 적을 때만 `fromCents`/`decStr`.
// 표준 풀(`DEC_DIV`)을 나눠 쓴다: plain(몫>1·한 자리)·underOne(몫<1)·zeroTenth(3.05꼴).
//
// ⑴ 소단원 조건이 **몫의 성질**이라 발문만 보는 판정기(`probe-elem-section-conditions`)는
//    문장형 갈래에서 그것을 못 잰다 — loose(종류 규칙)로 떨어뜨리고, 몫<1·0내림·첫째자리0 은
//    `elemTiersG6.test.ts` 가 **정답에 대고** 잠근다(연산·기본·응용 전 씨앗).
// ⑵ 1-3-5 «(자연수)÷(자연수)» 는 kindsPresent ⑵ 때문에 발문에 소수·분수가 **하나도** 못 온다 —
//    몫만 소수다. 그래서 발문 끝을 「…소수로 나타내시오」로 못 박는다(1-1-1 의 분수 몫과도 가른다).
// ⑶ 연산은 「다음 나눗셈의 몫을 구하시오.\n\n$…=\square$」 — 표준의 「몫을 구하시오.」와
//    문장을 갈라 R5 를 피하면서, `probe-elem-arithmetic` 의 `=\square` 독립 검산은 그대로 탄다.
// ⑷ 발문 문형은 소단원마다 가른다(R5): 담기(1-3-1)·도막 자르기(1-3-2)·매일 같은 거리(1-3-3)·
//    선물 묶기(1-3-4)·정다각형/수 카드(1-3-5).

/** 1-3-3 갈래용 — 표준 bringZero 에서 «첫째 자리 0»(1-3-4 몫)을 뺀 순수 부분집합.
 *  표준끼리는 겹쳐도 제 조건을 지키지만, 갈래는 1-3-4 연산과 같은 식이 나올 자리를 없앤다. */
const DEC_BRING_PURE = DEC_DIV.bringZero.filter(
  (c) => Math.floor(c.q / 10) % 10 !== 0,
);

/** 병·봉지·통에 «담는» 소재 — 1-1 의 «명이 나누어» 와 문장을 가른다. */
const POUR_STUFF = [
  { thing: "물", unit: "L", unitJosa: "를", into: "병" },
  { thing: "주스", unit: "L", unitJosa: "를", into: "병" },
  { thing: "식용유", unit: "L", unitJosa: "를", into: "통" },
  { thing: "쌀", unit: "kg", unitJosa: "을", into: "봉지" },
  { thing: "설탕", unit: "kg", unitJosa: "을", into: "봉지" },
  { thing: "밀가루", unit: "kg", unitJosa: "을", into: "봉지" },
] as const;

/** 무게가 같은 낱개 물건 — 상자 무게를 빼고 나누는 응용 재료. 세는 말이 물건마다 다르다. */
const BOX_ITEMS = [
  { item: "책", counter: "권" },
  { item: "사전", counter: "권" },
  { item: "벽돌", counter: "장" },
  { item: "블록", counter: "개" },
] as const;

/** 마시는 것 — 1-3-2 응용(마시고 남은 것을 나누기). */
const DRINKS = ["물", "주스", "우유"] as const;

/** 묶는 것 — 1-3-4 기본. */
const TIE_STUFF = ["리본", "끈", "노끈"] as const;

/**
 * 수(센트 표기) 뒤의 조사 — **마지막으로 소리 나는 숫자**가 정한다.
 * `19.2` 는 「십구 점 이」라 「가」, `21.6` 은 「…육」이라 「이」. 꼬리 0 은 읽히지 않는다.
 * `numJosa` 는 정수 전용이라(소수를 trunc 한다) 여기서는 못 쓴다.
 */
function centsJosa(
  cents: number,
  withFinal: string,
  withoutFinal: string,
): string {
  let d = cents;
  while (d % 10 === 0 && d !== 0) d /= 10;
  return [1, 3, 6, 7, 8].includes(d % 10) ? withFinal : withoutFinal;
}

// ── 1-3-1 (소수)÷(자연수) 알아보기 ──

/** 연산 — 식 그대로. 자연수처럼 나누고 소수점 자리만 맞춘다. */
function decNatCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_DIV.plain);
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  return make(
    unit,
    `다음 나눗셈의 몫을 구하시오.\n\n${expr(`${a}\\div${c.b}=\\square`)}`,
    expr(q),
    `자연수의 나눗셈처럼 계산한 뒤 나누어지는 수의 소수점 자리에 맞추어 몫에 소수점을 찍습니다. ` +
      `${expr(`${a}\\div${c.b}=${q}`)}`,
  );
}

/** 기본 — 문장 한 겹. 그릇 수로 나누는 식을 학생이 세운다. */
function decNatWord(unit: UnitSeed, rng: Rng): ElemProblem {
  // 지면 실감을 위해 전체 양을 20 이하로 줄인다 — 병 하나에 45 L 가 나오면 안 된다.
  const c = pick(
    rng,
    DEC_DIV.plain.filter((x) => x.a <= 2000),
  );
  const s = pick(rng, POUR_STUFF);
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  return make(
    unit,
    `${s.thing} ${unitNum(a, s.unit)}${s.unitJosa} ${s.into} ${num(c.b)}개에 똑같이 나누어 담으려고 합니다. ` +
      `${s.into} 한 개에 담는 ${s.thing}${josa(s.thing, "은", "는")} 몇 ${s.unit}입니까?`,
    expr(q),
    `전체를 ${s.into}의 수로 나눕니다. ${expr(`${a}\\div${c.b}=${q}`)}`,
  );
}

/** 응용 — 두 걸음. 전체 무게에서 빈 상자를 빼고 개수로 나눈다. */
function decNatApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = pick(rng, BOX_ITEMS);
  const k = intBetween(rng, 2, 5);
  // 낱개 무게는 십분위 정수(1.1~2.9). 중간값(k·q)이나 전체가 자연수로 접히면
  // 지면에 «7.0» 이 나온다 — 초등 지면에 그렇게 쓰지 않으므로 거른다.
  const q10 = pick(
    rng,
    Array.from({ length: 19 }, (_, i) => i + 11).filter(
      (v) => v % 10 !== 0 && (k * v) % 10 !== 0,
    ),
  );
  const w10 = pick(
    rng,
    Array.from({ length: 7 }, (_, i) => i + 3).filter(
      (v) => (k * q10 + v) % 10 !== 0,
    ),
  );
  const cont10 = k * q10;
  const total10 = cont10 + w10;
  return make(
    unit,
    `무게가 같은 ${b.item} ${num(k)}${b.counter}${josa(b.counter, "을", "를")} 상자에 담아 무게를 재었더니 ` +
      `${unitNum(decStr(total10, 1), "kg")} 이었습니다. 빈 상자의 무게가 ${unitNum(decStr(w10, 1), "kg")} 일 때, ` +
      `${b.item} 한 ${b.counter}의 무게는 몇 kg입니까?`,
    expr(decStr(q10, 1)),
    `${b.item}만의 무게를 먼저 구합니다. ${expr(`${decStr(total10, 1)}-${decStr(w10, 1)}=${decStr(cont10, 1)}`)} 이므로 ` +
      `${b.item} ${num(k)}${b.counter}의 무게는 ${unitNum(decStr(cont10, 1), "kg")} 입니다. ` +
      `${expr(`${decStr(cont10, 1)}\\div${k}=${decStr(q10, 1)}`)} 입니다.`,
  );
}

/** 심화 — 역산. ⓐ 잘못하여 곱한 결과에서 되짚는다. ⓑ `\square` 가 나누어지는 수다. */
function decNatDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  // 잘못 곱한 결과(=a·b)가 자연수로 접히면 발문에서 소수가 사라진다 — 십의 자리 곱으로 거른다.
  const c = pick(
    rng,
    DEC_DIV.plain.filter((x) => ((Math.floor(x.a / 10) % 10) * x.b) % 10 !== 0),
  );
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  if (intBetween(rng, 0, 1) === 0) {
    const wrong = fromCents(c.a * c.b);
    return make(
      unit,
      `어떤 수를 ${num(c.b)}${numRo(c.b)} 나누어야 할 것을 잘못하여 ${num(c.b)}${numJosa(c.b, "을", "를")} 곱했더니 ` +
        `${num(wrong)}${centsJosa(c.a * c.b, "이", "가")} 되었습니다. 바르게 계산한 값을 소수로 나타내시오.`,
      expr(q),
      `잘못 계산한 식에서 어떤 수를 먼저 구합니다. ${expr(`${wrong}\\div${c.b}=${a}`)} 이므로 어떤 수는 ${num(a)}입니다. ` +
        `바르게 계산하면 ${expr(`${a}\\div${c.b}=${q}`)} 입니다.`,
    );
  }
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 구하시오.\n\n${expr(`\\square\\div${c.b}=${q}`)}`,
    expr(a),
    `나눗셈을 곱셈으로 되돌립니다. ${expr(`${q}\\times${c.b}=${a}`)} 이므로 ${expr("\\square")} 는 ${num(a)}입니다.`,
  );
}

// ── 1-3-2 몫이 1보다 작은 (소수)÷(자연수) ──

/** 연산 — 식 그대로. 나누어지는 수가 더 작아 몫의 일의 자리에 0 을 쓴다. */
function decUnderCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_DIV.underOne);
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  return make(
    unit,
    `다음 나눗셈의 몫을 구하시오.\n\n${expr(`${a}\\div${c.b}=\\square`)}`,
    expr(q),
    `나누어지는 수 ${num(a)}${centsJosa(c.a, "이", "가")} 나누는 수 ${num(c.b)}보다 작으므로 ` +
      `몫의 자연수 부분에 ${num(0)}을 씁니다. ${expr(`${a}\\div${c.b}=${q}`)}`,
  );
}

/** 기본 — 문장 한 겹. 도막으로 자른다. */
function decUnderWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_DIV.underOne);
  const thing = pick(rng, CUT_STUFF);
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  return make(
    unit,
    `${thing} ${unitNum(a, "m")}를 똑같이 ${num(c.b)}도막으로 자르려고 합니다. ` +
      `한 도막의 길이는 몇 m입니까?`,
    expr(q),
    `전체 길이를 도막의 수로 나눕니다. ${expr(`${a}\\div${c.b}=${q}`)}`,
  );
}

/** 응용 — 두 걸음. 마시고 남은 것을 나누어 마신다. */
function decUnderApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, DRINKS);
  const k = intBetween(rng, 2, 6);
  const q10 = pick(
    rng,
    Array.from({ length: 8 }, (_, i) => i + 2).filter(
      (v) => (k * v) % 10 !== 0,
    ),
  );
  const left10 = k * q10;
  const u = intBetween(rng, 1, 2);
  const total10 = left10 + u * 10;
  return make(
    unit,
    `${thing} ${unitNum(decStr(total10, 1), "L")} 중에서 ${unitNum(u, "L")}를 마시고, ` +
      `남은 ${thing}${josa(thing, "을", "를")} ${num(k)}명이 똑같이 나누어 마셨습니다. ` +
      `한 사람이 마신 ${thing}${josa(thing, "은", "는")} 몇 L입니까?`,
    expr(decStr(q10, 1)),
    `남은 ${thing}${josa(thing, "은", "는")} ${expr(`${decStr(total10, 1)}-${u}=${decStr(left10, 1)}`)} 입니다. ` +
      `${expr(`${decStr(left10, 1)}\\div${k}=${decStr(q10, 1)}`)} 입니다.`,
  );
}

/** 심화 — 역산. ⓐ 나눈 몫에서 어떤 수를 되짚어 다른 수로 나눈다. ⓑ `\square` 가 나누어지는 수다. */
function decUnderDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const k = intBetween(rng, 2, 4);
    const m10 = pick(
      rng,
      Array.from({ length: 8 }, (_, i) => i + 2).filter(
        (v) => (v * k) % 10 !== 0,
      ),
    );
    const x10 = m10 * k; // 어떤 수 — 십분위 정수. x10 ≤ 36 이므로 j=5 는 늘 후보다(풀이 안 빈다).
    const j = pick(
      rng,
      Array.from({ length: 8 }, (_, i) => i + 2).filter(
        (v) => v !== k && v * 10 > x10 && (x10 * 10) % v === 0,
      ),
    );
    const ans100 = (x10 * 10) / j; // 몫<1 — j·10 > x10 을 위에서 강제했다
    return make(
      unit,
      `어떤 수를 ${num(k)}${numRo(k)} 나누었더니 ${num(decStr(m10, 1))}${centsJosa(m10 * 10, "이", "가")} 되었습니다. ` +
        `어떤 수를 ${num(j)}${numRo(j)} 나눈 몫은 얼마입니까?`,
      expr(fromCents(ans100)),
      `나눗셈을 거꾸로 하면 어떤 수를 구할 수 있습니다. ${expr(`${decStr(m10, 1)}\\times${k}=${decStr(x10, 1)}`)} 이므로 ` +
        `어떤 수는 ${num(decStr(x10, 1))}입니다. ${expr(`${decStr(x10, 1)}\\div${j}=${fromCents(ans100)}`)} 입니다.`,
    );
  }
  const c = pick(rng, DEC_DIV.underOne);
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 구하시오.\n\n${expr(`\\square\\div${c.b}=${q}`)}`,
    expr(a),
    `나눗셈을 곱셈으로 되돌립니다. ${expr(`${q}\\times${c.b}=${a}`)} 이므로 ${expr("\\square")} 는 ${num(a)}입니다.`,
  );
}

// ── 1-3-3 소수점 아래 0을 내려 계산하는 (소수)÷(자연수) ──

/** 연산 — 식 그대로. 나누어떨어질 때까지 0 을 내린다. */
function decBringCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_BRING_PURE);
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  return make(
    unit,
    `다음 나눗셈의 몫을 구하시오.\n\n${expr(`${a}\\div${c.b}=\\square`)}`,
    expr(q),
    `소수점 아래에서 나누어떨어지지 않으면 ${num(0)}을 내려 계산을 계속합니다. ${expr(`${a}\\div${c.b}=${q}`)}`,
  );
}

/** 기본 — 문장 한 겹. 매일 같은 거리씩 간다. */
function decBringWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const how = pick(rng, ["자전거로", "걸어서"] as const);
  const c = pick(
    rng,
    DEC_BRING_PURE.filter((x) => x.a <= 3000),
  );
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  return make(
    unit,
    `${how} ${unitNum(a, "km")}를 ${num(c.b)}일 동안 매일 같은 거리씩 가려고 합니다. ` +
      `하루에 가는 거리는 몇 km입니까?`,
    expr(q),
    `전체 거리를 날수로 나눕니다. ${expr(`${a}\\div${c.b}=${q}`)}`,
  );
}

/** 응용 — 두 걸음. 쓰고 남은 것을 도막으로 자른다. */
function decBringApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, CUT_STUFF);
  const c = pick(
    rng,
    DEC_BRING_PURE.filter((x) => x.a <= 2000),
  );
  const u = intBetween(rng, 1, 3);
  const total100 = c.a + u * 100;
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  return make(
    unit,
    `${thing} ${unitNum(fromCents(total100), "m")} 중에서 ${unitNum(u, "m")}를 사용하고, ` +
      `남은 ${thing}${josa(thing, "을", "를")} 똑같이 ${num(c.b)}도막으로 잘랐습니다. 한 도막의 길이는 몇 m입니까?`,
    expr(q),
    `남은 ${thing}${josa(thing, "은", "는")} ${expr(`${fromCents(total100)}-${u}=${a}`)} 입니다. ` +
      `${expr(`${a}\\div${c.b}=${q}`)} 입니다.`,
  );
}

/** 심화 — 역산. ⓐ 잘못하여 곱한 결과에서 되짚는다. ⓑ `\square` 가 나누어지는 수다. */
function decBringDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(
    rng,
    DEC_BRING_PURE.filter(
      (x) => ((Math.floor(x.a / 10) % 10) * x.b) % 10 !== 0,
    ),
  );
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  if (intBetween(rng, 0, 1) === 0) {
    const wrong = fromCents(c.a * c.b);
    return make(
      unit,
      `어떤 수를 ${num(c.b)}${numRo(c.b)} 나누어야 할 것을 잘못하여 ${num(c.b)}${numJosa(c.b, "을", "를")} 곱했더니 ` +
        `${num(wrong)}${centsJosa(c.a * c.b, "이", "가")} 되었습니다. 바르게 계산한 값은 얼마입니까?`,
      expr(q),
      `잘못 계산한 식에서 어떤 수를 먼저 구합니다. ${expr(`${wrong}\\div${c.b}=${a}`)} 이므로 어떤 수는 ${num(a)}입니다. ` +
        `바르게 계산하면 ${expr(`${a}\\div${c.b}=${q}`)} 입니다.`,
    );
  }
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 구하시오.\n\n${expr(`\\square\\div${c.b}=${q}`)}`,
    expr(a),
    `나눗셈을 곱셈으로 되돌립니다. ${expr(`${q}\\times${c.b}=${a}`)} 이므로 ${expr("\\square")} 는 ${num(a)}입니다.`,
  );
}

// ── 1-3-4 몫의 소수 첫째 자리에 0이 있는 (소수)÷(자연수) ──

/** 연산 — 식 그대로. 나눌 수 없는 자리에 0 을 쓴다. */
function decZeroCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_DIV.zeroTenth);
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  return make(
    unit,
    `다음 나눗셈의 몫을 구하시오.\n\n${expr(`${a}\\div${c.b}=\\square`)}`,
    expr(q),
    `나누어야 할 수가 나누는 수보다 작은 자리에는 몫에 ${num(0)}을 씁니다. ${expr(`${a}\\div${c.b}=${q}`)}`,
  );
}

/** 기본 — 문장 한 겹. 선물 상자를 똑같이 묶는다. */
function decZeroWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, TIE_STUFF);
  const c = pick(
    rng,
    DEC_DIV.zeroTenth.filter((x) => x.a <= 3000),
  );
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  return make(
    unit,
    `${thing} ${unitNum(a, "m")}를 모두 사용하여 크기가 같은 선물 상자 ${num(c.b)}개를 묶었습니다. ` +
      `상자 한 개를 묶는 데 쓴 ${thing}${josa(thing, "은", "는")} 몇 m입니까?`,
    expr(q),
    `전체 길이를 상자의 수로 나눕니다. ${expr(`${a}\\div${c.b}=${q}`)}`,
  );
}

/** 응용 — 두 걸음. 나누어 가진 뒤 다시 도막으로 자른다. */
function decZeroApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const j = intBetween(rng, 2, 3);
  // 전체(=a·j)가 자연수로 접히면 지면에 «24.0» 이 나온다 — 십의 자리 곱으로 거른다.
  const c = pick(
    rng,
    DEC_DIV.zeroTenth.filter(
      (x) => x.a * j <= 4000 && ((Math.floor(x.a / 10) % 10) * j) % 10 !== 0,
    ),
  );
  const total = fromCents(c.a * j);
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  return make(
    unit,
    `색 테이프 ${unitNum(total, "m")}를 ${num(j)}명이 똑같이 나누어 가진 뒤, ` +
      `한 사람이 가진 색 테이프를 다시 똑같이 ${num(c.b)}도막으로 잘랐습니다. 한 도막의 길이는 몇 m입니까?`,
    expr(q),
    `한 사람이 가진 색 테이프는 ${expr(`${total}\\div${j}=${a}`)} 입니다. ` +
      `이것을 다시 자르면 ${expr(`${a}\\div${c.b}=${q}`)} 입니다.`,
  );
}

/** 심화 — 역산. ⓐ 잘못하여 곱한 결과에서 되짚는다. ⓑ `\square` 가 **나누는 수**다(다른 소단원과 방향을 가른다). */
function decZeroDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(
    rng,
    DEC_DIV.zeroTenth.filter(
      (x) => ((Math.floor(x.a / 10) % 10) * x.b) % 10 !== 0,
    ),
  );
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  if (intBetween(rng, 0, 1) === 0) {
    const wrong = fromCents(c.a * c.b);
    return make(
      unit,
      `어떤 수를 ${num(c.b)}${numRo(c.b)} 나누어야 할 것을 잘못하여 ${num(c.b)}${numJosa(c.b, "을", "를")} 곱했더니 ` +
        `${num(wrong)}${centsJosa(c.a * c.b, "이", "가")} 되었습니다. 바르게 계산한 몫을 구하시오.`,
      expr(q),
      `잘못 계산한 식에서 어떤 수를 먼저 구합니다. ${expr(`${wrong}\\div${c.b}=${a}`)} 이므로 어떤 수는 ${num(a)}입니다. ` +
        `바르게 계산하면 ${expr(`${a}\\div${c.b}=${q}`)} 입니다.`,
    );
  }
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 구하시오.\n\n${expr(`${a}\\div\\square=${q}`)}`,
    num(c.b),
    `나누어지는 수를 몫으로 나누면 나누는 수가 나옵니다. ${expr(`${a}\\div${q}=${c.b}`)} 이므로 ` +
      `${expr("\\square")} 는 ${num(c.b)}입니다.`,
  );
}

// ── 1-3-5 (자연수)÷(자연수), 어림셈하여 몫의 소수점 위치 확인하기 ──

/** (자연수)÷(자연수)인데 몫이 소수 두 자리 안에서 떨어지는 짝. `q` 는 ×100. */
const NAT_DEC: { n: number; b: number; q: number }[] = [];
for (let b = 2; b <= 9; b += 1) {
  for (let n = 3; n <= 60; n += 1) {
    if (n % b !== 0 && (n * 100) % b === 0) {
      NAT_DEC.push({ n, b, q: (n * 100) / b });
    }
  }
}

/** 심화 수 카드 — 서로 다른 세 장. «가장 작은 몫»(최소÷최대)이 소수 두 자리 안에서 떨어진다. */
const CARD_TRIPLES: [number, number, number][] = [];
for (let lo = 2; lo <= 7; lo += 1) {
  for (let hi = lo + 2; hi <= 9; hi += 1) {
    if ((lo * 100) % hi !== 0) continue;
    for (let mid = lo + 1; mid < hi; mid += 1) {
      CARD_TRIPLES.push([lo, mid, hi]);
    }
  }
}

/** 연산 — 식 그대로. 자연수처럼 계산하고 어림으로 소수점 위치를 확인한다. */
function natDecCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, NAT_DEC);
  const q = fromCents(c.q);
  return make(
    unit,
    `다음 나눗셈의 몫을 소수로 나타내시오.\n\n${expr(`${c.n}\\div${c.b}=\\square`)}`,
    expr(q),
    `자연수처럼 계산한 뒤 어림한 값과 견주어 몫의 소수점 위치를 확인합니다. ${expr(`${c.n}\\div${c.b}=${q}`)}`,
  );
}

/** 기본 — 문장 한 겹. 발문의 수는 자연수뿐이고 몫만 소수다. */
function natDecWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, SHARE_STUFF);
  const c = pick(
    rng,
    NAT_DEC.filter((x) => x.n <= 20 && x.n > x.b),
  );
  const q = fromCents(c.q);
  return make(
    unit,
    `${s.thing} ${unitNum(c.n, s.unit)}${s.unitJosa} ${num(c.b)}명이 똑같이 ${s.verb} 합니다. ` +
      `한 사람이 갖는 ${s.thing}${josa(s.thing, "은", "는")} 몇 ${s.unit}인지 소수로 나타내시오.`,
    expr(q),
    `전체를 사람 수로 나눕니다. ${expr(`${c.n}\\div${c.b}=${q}`)}`,
  );
}

/** 응용 — ⓐ 정다각형의 둘레에서 한 변(다른 개념 결합). ⓑ 쓰고 남은 것을 나눈다(두 걸음). */
function natDecApply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    // 몫이 소수 두 자리 안에서 떨어지는 변의 수만 — 3·6·7 은 순환소수가 된다.
    const sides = pick(rng, [4, 5, 8] as const);
    const per = pick(
      rng,
      Array.from({ length: 26 }, (_, i) => i + 5).filter(
        (v) => v % sides !== 0 && (v * 100) % sides === 0,
      ),
    );
    const q = fromCents((per * 100) / sides);
    return make(
      unit,
      `둘레가 ${unitNum(per, "m")} 인 ${polyName(sides, true)} 모양 잔디밭이 있습니다. ` +
        `한 변의 길이는 몇 m인지 소수로 나타내시오.`,
      expr(q),
      `${polyName(sides, true)}은 변의 길이가 모두 같으므로 둘레를 변의 수 ${num(sides)}${numRo(sides)} 나눕니다. ` +
        `${expr(`${per}\\div${sides}=${q}`)}`,
    );
  }
  const s = pick(
    rng,
    SHARE_STUFF.filter((x) => x.unit === "kg"),
  );
  const c = pick(
    rng,
    NAT_DEC.filter((x) => x.n <= 20 && x.n > x.b),
  );
  const u = intBetween(rng, 1, 4);
  const q = fromCents(c.q);
  return make(
    unit,
    `${s.thing} ${unitNum(c.n + u, s.unit)} 중에서 ${unitNum(u, s.unit)}${s.unitJosa} 사용하고, ` +
      `남은 ${s.thing}${josa(s.thing, "을", "를")} ${num(c.b)}명이 똑같이 나누어 가지려고 합니다. ` +
      `한 사람이 갖는 ${s.thing}${josa(s.thing, "은", "는")} 몇 ${s.unit}인지 소수로 나타내시오.`,
    expr(q),
    `남은 ${s.thing}${josa(s.thing, "은", "는")} ${expr(`${c.n + u}-${u}=${c.n}`)} 이므로 ` +
      `${expr(`${c.n}\\div${c.b}=${q}`)} 입니다.`,
  );
}

/** 심화 — ⓐ 수 카드로 몫이 **가장 작은** 나눗셈식(1-1-1 심화의 «가장 큰»과 가른다). ⓑ 잘못하여 곱했더니. */
function natDecDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const [lo, mid, hi] = pick(rng, CARD_TRIPLES);
    const cards = [mid, lo, hi]; // 늘 정렬돼 보이지 않게 가운데 것을 앞에 적는다
    const q = fromCents((lo * 100) / hi);
    return make(
      unit,
      `수 카드 ${num(cards[0]!)}, ${num(cards[1]!)}, ${num(cards[2]!)} 중에서 두 장을 골라 (자연수)÷(자연수)를 만들려고 합니다. ` +
        `몫이 가장 작은 나눗셈식을 만들고 그 몫을 소수로 나타내시오.`,
      expr(q),
      `몫이 가장 작으려면 나누어지는 수는 가장 작고 나누는 수는 가장 커야 합니다. ` +
        `가장 작은 수는 ${num(lo)}, 가장 큰 수는 ${num(hi)}이므로 ${expr(`${lo}\\div${hi}=${q}`)} 입니다.`,
    );
  }
  const c = pick(
    rng,
    NAT_DEC.filter((x) => x.n <= 30),
  );
  const q = fromCents(c.q);
  return make(
    unit,
    `어떤 수를 ${num(c.b)}${numRo(c.b)} 나누어야 할 것을 잘못하여 ${num(c.b)}${numJosa(c.b, "을", "를")} 곱했더니 ` +
      `${num(c.n * c.b)}${numJosa(c.n * c.b, "이", "가")} 되었습니다. 바르게 계산한 값을 소수로 나타내시오.`,
    expr(q),
    `잘못 계산한 식에서 어떤 수를 먼저 구합니다. ${expr(`${c.n * c.b}\\div${c.b}=${c.n}`)} 이므로 어떤 수는 ${num(c.n)}입니다. ` +
      `바르게 계산하면 ${expr(`${c.n}\\div${c.b}=${q}`)} 입니다.`,
  );
}

// ── 난이도 갈래 (D-72 확대 4차분) — 초6 `1-4 비와 비율` (소단원 여섯 · 24갈래) ────
//
// 이 대단원은 앞 셋과 또 다르다.
// ⑴ 답 모양이 넷이다 — 자연수(배·백분율)·비(`$a:b$`)·기약분수·소수. 검산은
//    `elemTiersG6.test.ts` 가 전담한다(산술 판정기의 리더에 안 걸리는 문형들이다).
// ⑵ «사용되는 경우»(1-4-4·1-4-6)는 상징식이 없어 「\div+\square」 축이 못 선다 —
//    연산은 **이름표가 붙은 값**(「걸린 시간이 $3$시간이고 간 거리가 …일 때」)으로 못 박고,
//    기본은 상황문에서 기준량·비교하는 양을 스스로 추리게 한다.
// ⑶ 심화는 카탈로그 「비율을 이용하여 기준량(비교하는 양) 구하기」·「이자율」이 뼈대다 —
//    비율·백분율을 **주고** 반대쪽을 되짚는다. 상수답이 없게 방향·요소를 벌린다(F1 선례).
// ⑷ 비는 6-1 에서 약분하지 않는다(가장 간단한 자연수의 비는 6-2 2-4) — `$9:6$` 그대로 적는다.

/** 1-4-1 기본 — 두 물건. 세는 말이 물건마다 다르다. */
const CMP_PAIRS = [
  { x: "연필", cx: "자루", y: "지우개", cy: "개" },
  { x: "공책", cx: "권", y: "풀", cy: "개" },
  { x: "색연필", cx: "자루", y: "가위", cy: "개" },
  { x: "구슬", cx: "개", y: "주사위", cy: "개" },
] as const;

/** 1-4-1 응용 — 색으로 가르는 낱장 물건(전부 「장」·모음 끝이라 조사가 한 벌이다). */
const CMP_SHEETS = ["색종이", "딱지", "카드"] as const;

/** 1-4-1 심화 ⓐ — 배수 관계로 견주는 과일. */
const CMP_FRUITS = [
  { big: "귤", small: "사과" },
  { big: "방울토마토", small: "참외" },
  { big: "딸기", small: "키위" },
] as const;

/** 1-4-2 — 두 무리와 그 전체를 부르는 말. */
const BI_PAIRS = [
  { x: "남학생", y: "여학생", c: "명", whole: "학생" },
  { x: "흰 바둑돌", y: "검은 바둑돌", c: "개", whole: "바둑돌" },
  { x: "튤립", y: "장미", c: "송이", whole: "꽃" },
  { x: "동화책", y: "위인전", c: "권", whole: "책" },
] as const;

/** 1-4-3 기본 — 「…인 학생」 무리. */
const RATE_GROUPS = [
  "안경을 쓴",
  "운동을 좋아하는",
  "강아지를 기르는",
] as const;

/** 1-4-4 — 시속으로 쓸 수 있는 비율(60~90). 몫이 자연수로 서게 곱으로 만든다. */
const SPEED_RATES = [60, 70, 80, 90] as const;
const VEHICLES = ["기차", "버스", "트럭"] as const;

/** 1-4-5 기본 — 꽃 무리. 기준량은 백분율이 자연수로 떨어지는 수만. */
const FLOWERS = ["장미", "튤립", "국화"] as const;
const PCT_TOTALS = [10, 20, 25, 50] as const;

/** 1-4-6 — 돈 단위 풀. 백분율 곱이 늘 자연수가 되게 1000 의 배수만 쓴다. */
const MONEY = [2000, 5000, 8000, 10000, 20000] as const;

/**
 * 1-4-5 심화 ⓑ — **백분율을 두 겹으로** 쓰는 수 짝. 「전체의 $p\%$ 의 $q\%$」다.
 *
 * ⚠️ 손으로 고른 값이 아니라 **두 곱이 모두 자연수로 떨어지는 것만 걸러 낸 것**이다.
 *    사람이 고르면 $200\times25\%=50$, $50\times25\%=12.5$ 처럼 둘째 걸음에서 소수가
 *    나오는 짝을 놓친다(초등 지면에 소수 인원이 나갈 수는 없다).
 */
const PCT_TWICE = (() => {
  const rows: {
    total: number;
    p: number;
    q: number;
    mid: number;
    last: number;
  }[] = [];
  for (const total of [40, 60, 80, 100, 120, 200, 240, 300]) {
    for (const p of [20, 25, 50]) {
      for (const q of [20, 25, 50]) {
        const mid = (total * p) / 100;
        const last = (mid * q) / 100;
        if (Number.isInteger(mid) && Number.isInteger(last) && last >= 2) {
          rows.push({ total, p, q, mid, last });
        }
      }
    }
  }
  return rows;
})();

// ── 1-4-1 두 수 비교하기 ──

/** 연산 — 수 둘만 준다. 나눗셈 한 번. */
function cmpCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 2, 9);
  const k = intBetween(rng, 2, 9);
  return make(
    unit,
    `${num(b * k)}${numJosa(b * k, "은", "는")} ${num(b)}의 몇 배입니까?`,
    num(k),
    `큰 수를 작은 수로 나눕니다. ${expr(`${b * k}\\div${b}=${k}`)}`,
  );
}

/** 기본 — 문장 한 겹. 두 물건의 수를 나눗셈으로 견준다. */
function cmpWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const p = pick(rng, CMP_PAIRS);
  const b = intBetween(rng, 2, 6);
  const k = intBetween(rng, 2, 6);
  return make(
    unit,
    `${p.x} ${num(b * k)}${p.cx}${josa(p.cx, "과", "와")} ${p.y} ${num(b)}${p.cy}${josa(p.cy, "이", "가")} 있습니다. ` +
      `${p.x} 수는 ${p.y} 수의 몇 배입니까?`,
    num(k),
    `${p.x} 수를 ${p.y} 수로 나눕니다. ${expr(`${b * k}\\div${b}=${k}`)}`,
  );
}

/** 응용 — 두 걸음. 다른 쪽 수를 차에서 먼저 구하고 나눈다. */
function cmpApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, CMP_SHEETS);
  const b0 = intBetween(rng, 2, 6);
  const k = intBetween(rng, 2, 5);
  const red = b0 * k;
  const d = red - b0;
  return make(
    unit,
    `빨간 ${thing} ${num(red)}장과 파란 ${thing}${josa(thing, "이", "가")} 있습니다. ` +
      `파란 ${thing}${josa(thing, "은", "는")} 빨간 ${thing}보다 ${num(d)}장 적습니다. ` +
      `빨간 ${thing} 수는 파란 ${thing} 수의 몇 배입니까?`,
    num(k),
    `파란 ${thing}${josa(thing, "은", "는")} ${expr(`${red}-${d}=${b0}`)} 장입니다. ${expr(`${red}\\div${b0}=${k}`)} 이므로 ${num(k)}배입니다.`,
  );
}

/**
 * 심화 — 되짚기 **두 걸음**(D-72 4단). ⓐ 배수 조건과 **전체** 조건을 겹쳐 한쪽을 구한다.
 * ⓑ 어떤 수를 되짚어 다른 배를 구한다.
 *
 * ⚠️ ⓐ 는 예전에 「귤이 사과의 $k$배, 귤이 $bk$개 → 사과」였다 — $bk\div k$ **한 걸음**이라
 *    같은 소단원 응용(차를 구하고 나누는 두 걸음)보다 쉬웠다. 사다리가 뒤집혀 있었다.
 */
function cmpDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const f = pick(rng, CMP_FRUITS);
    const base = intBetween(rng, 3, 9);
    const k = intBetween(rng, 2, 6);
    const total = base * (k + 1);
    return makeDeep(
      unit,
      `${f.big} 수는 ${f.small} 수의 ${num(k)}배입니다. ` +
        `${f.big}${josa(f.big, "과", "와")} ${f.small} 전체가 ${num(total)}개일 때 ` +
        `${f.small}${josa(f.small, "은", "는")} 몇 개입니까?`,
      num(base),
      [
        `${f.small} 수를 ${expr("\\square")} 라 하면 ${f.big} 수는 ${expr(`\\square\\times${k}`)} 이므로 ` +
          `전체는 ${expr("\\square")} 가 ${expr(`${k}+1=${k + 1}`)} 묶음입니다.`,
        `${expr(`${total}\\div${k + 1}=${base}`)} 이므로 ${num(base)}개입니다.`,
      ],
    );
  }
  const k1 = intBetween(rng, 2, 5);
  const some = intBetween(rng, 2, 8);
  const k2 = pick(
    rng,
    Array.from({ length: 8 }, (_, i) => i + 2).filter((v) => v !== k1),
  );
  return makeDeep(
    unit,
    `어떤 수의 ${num(k1)}배는 ${num(some * k1)}입니다. 어떤 수의 ${num(k2)}배는 얼마입니까?`,
    num(some * k2),
    [
      `어떤 수는 ${expr(`${some * k1}\\div${k1}=${some}`)} 입니다.`,
      `${expr(`${some}\\times${k2}=${some * k2}`)} 입니다.`,
    ],
  );
}

// ── 1-4-2 비 ──

/** 연산 — 「대」를 기호로. 절차 한 번. */
function biCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 9);
  let b = intBetween(rng, 2, 9);
  for (let t = 0; t < 20 && b === a; t += 1) b = intBetween(rng, 2, 9);
  if (b === a) b = a === 9 ? 8 : a + 1;
  return make(
    unit,
    `${num(a)} 대 ${num(b)}${numJosa(b, "을", "를")} 비로 나타내시오.`,
    expr(`${a}:${b}`),
    `「${num(a)} 대 ${num(b)}」는 기호 ${expr(":")} 을 써서 ${expr(`${a}:${b}`)}${numRo(b)} 나타냅니다.`,
  );
}

/** 기본 — 문장 한 겹. 「…와 …의 비」는 차례 그대로다. */
function biWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const p = pick(rng, BI_PAIRS);
  const a = intBetween(rng, 2, 9);
  let b = intBetween(rng, 2, 9);
  for (let t = 0; t < 20 && b === a; t += 1) b = intBetween(rng, 2, 9);
  if (b === a) b = a === 9 ? 8 : a + 1;
  return make(
    unit,
    `${p.x} ${num(a)}${p.c}${josa(p.c, "과", "와")} ${p.y} ${num(b)}${p.c}${josa(p.c, "이", "가")} 있습니다. ` +
      `${p.x} 수와 ${p.y} 수의 비를 쓰시오.`,
    expr(`${a}:${b}`),
    `「${p.x} 수와 ${p.y} 수의 비」는 두 수를 차례대로 적습니다. ${expr(`${a}:${b}`)} 입니다.`,
  );
}

/** 응용 — 두 걸음. 전체를 먼저 만든 뒤 「전체에 대한」 비를 쓴다. */
function biApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const p = pick(rng, BI_PAIRS);
  const a = intBetween(rng, 2, 9);
  const b = intBetween(rng, 2, 9);
  return make(
    unit,
    `${p.x} ${num(a)}${p.c}${josa(p.c, "과", "와")} ${p.y} ${num(b)}${p.c}${josa(p.c, "이", "가")} 있습니다. ` +
      `전체 ${p.whole} 수에 대한 ${p.x} 수의 비를 쓰시오.`,
    expr(`${a}:${a + b}`),
    `전체 ${p.whole}${josa(p.whole, "은", "는")} ${expr(`${a}+${b}=${a + b}`)} 입니다. ` +
      `「에 대한」 뒤가 비교하는 양이므로 ${expr(`${a}:${a + b}`)} 입니다.`,
  );
}

/**
 * 심화 — 조건 **둘을 함께** 푼다(합과 차). 기준량이 안 주어지므로 먼저 되짚어야 한다.
 *
 * ⚠️ 예전에는 기준량을 **주고** 「기준량보다 $d$ 큰 비」를 물었다 — $b_0+d$ **한 걸음**이라
 *    같은 소단원 응용(전체를 만든 뒤 비를 쓰는 두 걸음)보다도 쉬웠다.
 */
function biDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const b0 = intBetween(rng, 3, 9);
  const d = intBetween(rng, 1, b0 - 1);
  const bigger = intBetween(rng, 0, 1) === 0;
  const first = bigger ? b0 + d : b0 - d;
  const sum = first + b0;
  return makeDeep(
    unit,
    `어떤 비의 두 항의 합이 ${num(sum)}이고, 비교하는 양이 기준량보다 ${num(d)}만큼 ` +
      `${bigger ? "큽니다" : "작습니다"}. 이 비를 쓰시오.`,
    expr(`${first}:${b0}`),
    [
      `합에서 차를 ${bigger ? "빼면" : "더하면"} 기준량의 ${num(2)}배입니다. ` +
        `${expr(`${sum}${bigger ? "-" : "+"}${d}=${2 * b0}`)} 이고 ${expr(`${2 * b0}\\div2=${b0}`)} 이므로 기준량은 ${num(b0)}입니다.`,
      `비교하는 양은 ${expr(`${b0}${bigger ? "+" : "-"}${d}=${first}`)} 입니다.`,
      `비는 (비교하는 양):(기준량)이므로 ${expr(`${first}:${b0}`)} 입니다.`,
    ],
  );
}

// ── 1-4-3 비율 ──

/** 연산 — 비를 비율로. 소수로 나타낸다(표준의 «분수로»와 가른다). */
function rateCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = pick(rng, [2, 4, 5, 8] as const);
  // ⚠️ (a·100)%b==0 을 직접 요구한다 — b=8 에 홀수 a 를 주면 1/8=0.125 처럼
  //    소수 세 자리가 되어 센트 표기(fromCents)가 깨진다(검산이 실측으로 잡았다).
  const a = pick(
    rng,
    Array.from({ length: 9 }, (_, i) => i + 1).filter(
      (v) => v % b !== 0 && (v * 100) % b === 0,
    ),
  );
  const q = fromCents((a * 100) / b);
  return make(
    unit,
    `비 ${expr(`${a}:${b}`)} 의 비율을 소수로 나타내시오.`,
    expr(q),
    `(비율)=(비교하는 양)÷(기준량)입니다. ${expr(`${a}\\div${b}=${q}`)}`,
  );
}

/** 기본 — 문장 한 겹. 기준량·비교하는 양을 문장에서 추린다. */
function rateWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const who = pick(rng, RATE_GROUPS);
  const b = intBetween(rng, 4, 9);
  const a = coprimeTop(rng, b);
  return make(
    unit,
    `어느 모둠 학생 ${num(b)}명 중 ${who} 학생이 ${num(a)}명입니다. ` +
      `모둠 학생 수에 대한 ${who} 학생 수의 비율을 분수로 나타내시오.`,
    expr(fmtFrac(a, b)),
    `기준량은 모둠 학생 수, 비교하는 양은 ${who} 학생 수입니다. 비율은 ${expr(fmtFrac(a, b))} 입니다.`,
  );
}

/** 응용 — 두 걸음. 나머지 쪽 수를 먼저 구해 전체에 대한 비율을 만든다. */
function rateApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 6, 12);
  const a = intBetween(rng, 1, r - 1);
  return make(
    unit,
    `바구니에 구슬이 ${num(r)}개 있고 그중 빨간 구슬이 ${num(a)}개, 나머지는 파란 구슬입니다. ` +
      `전체 구슬 수에 대한 파란 구슬 수의 비율을 분수로 나타내시오.`,
    expr(fmtFrac(r - a, r)),
    `파란 구슬은 ${expr(`${r}-${a}=${r - a}`)} 개입니다. 전체에 대한 비율은 ${expr(`\\frac{${r - a}}{${r}}=${fmtFrac(r - a, r)}`)} 입니다.`,
  );
}

/**
 * 심화 — 비율과 **합**을 겹쳐 비례배분한다(두 걸음). 묻는 쪽만 ⓐ 비교하는 양 ⓑ 기준량으로 벌린다.
 *
 * ⚠️ 예전에는 한쪽 양을 **주고** 반대쪽을 물었다 — 곱 하나(또는 나눗셈 하나) **한 걸음**이라
 *    같은 소단원 응용(나머지를 구하고 비율을 만드는 두 걸음)보다 쉬웠다. 게다가 해설 첫 줄이
 *    「(비교하는 양)=(기준량)×(비율)입니다」라는 **공식 문장**이라 두 줄처럼 보였을 뿐이다.
 */
function rateDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const fd = intBetween(rng, 2, 9);
  const fn = coprimeTop(rng, fd);
  const m = intBetween(rng, 2, 6);
  const parts = fn + fd;
  const wantTop = intBetween(rng, 0, 1) === 0;
  const want = wantTop ? fn * m : fd * m;
  const name = wantTop ? "비교하는 양" : "기준량";
  return makeDeep(
    unit,
    `비율이 ${expr(`\\frac{${fn}}{${fd}}`)} 인 비가 있습니다. ` +
      `기준량과 비교하는 양의 합이 ${num(parts * m)}일 때 ${name}은 얼마입니까?`,
    num(want),
    [
      `비율이 ${expr(`\\frac{${fn}}{${fd}}`)} 이므로 비교하는 양은 ${num(fn)}묶음, 기준량은 ${num(fd)}묶음이고 ` +
        `합은 ${expr(`${fn}+${fd}=${parts}`)} 묶음입니다.`,
      `한 묶음은 ${expr(`${parts * m}\\div${parts}=${m}`)} 입니다.`,
      `${name}은 ${expr(`${m}\\times${wantTop ? fn : fd}=${want}`)} 입니다.`,
    ],
  );
}

// ── 1-4-4 비율이 사용되는 경우 ──

/** 연산 — 값에 이름표가 붙어 있다. 나눗셈 한 번. */
function rateUseCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const rate = pick(rng, SPEED_RATES);
  const h = intBetween(rng, 2, 4);
  return make(
    unit,
    `걸린 시간이 ${num(h)}시간이고 간 거리가 ${unitNum(rate * h, "km")} 일 때, ` +
      `걸린 시간에 대한 간 거리의 비율을 구하시오.`,
    num(rate),
    `기준량은 걸린 시간입니다. ${expr(`${rate * h}\\div${h}=${rate}`)}`,
  );
}

/** 기본 — 상황문에서 기준량·비교하는 양을 추린다. ⓐ 탈것의 빠르기 ⓑ 마을의 인구. */
function rateUseWord(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const v = pick(rng, VEHICLES);
    const rate = pick(rng, SPEED_RATES);
    const h = intBetween(rng, 2, 4);
    return make(
      unit,
      `${v}${josa(v, "이", "가")} ${num(h)}시간 동안 ${unitNum(rate * h, "km")}를 갔습니다. ` +
        `걸린 시간에 대한 간 거리의 비율을 구하시오.`,
      num(rate),
      `기준량은 걸린 시간, 비교하는 양은 간 거리입니다. ${expr(`${rate * h}\\div${h}=${rate}`)}`,
    );
  }
  const a = intBetween(rng, 2, 8);
  const per = pick(rng, [120, 150, 200, 250, 300] as const);
  return make(
    unit,
    `어느 마을의 넓이는 ${num(a)} km²이고 인구는 ${num(a * per)}명입니다. 넓이에 대한 인구의 비율을 구하시오.`,
    num(per),
    `기준량은 넓이, 비교하는 양은 인구입니다. ${expr(`${a * per}\\div${a}=${per}`)}`,
  );
}

/** 응용 — 두 걸음. 소금물 전체를 먼저 만들어야 기준량이 선다. */
function rateUseApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const total = pick(rng, [200, 250, 400, 500] as const);
  const salt = pick(
    rng,
    ([20, 30, 40, 50] as const).filter((s) => s < total),
  );
  const water = total - salt;
  return make(
    unit,
    `물 ${num(water)} g에 소금 ${num(salt)} g을 모두 녹여 소금물을 만들었습니다. ` +
      `소금물 양에 대한 소금 양의 비율을 분수로 나타내시오.`,
    expr(fmtFrac(salt, total)),
    `소금물은 ${expr(`${water}+${salt}=${total}`)} 입니다. ` +
      `비율은 ${expr(`\\frac{${salt}}{${total}}=${fmtFrac(salt, total)}`)} 입니다.`,
  );
}

/**
 * 심화 — 빠르기를 **주지 않는다**. 먼저 비율을 되짚고, 그것으로 ⓐ 거리 ⓑ 시간을 다시 구한다(두 걸음).
 *
 * ⚠️ 예전에는 비율을 **발문이 그대로 줬다** — 곱 하나 또는 나눗셈 하나 **한 걸음**이라
 *    같은 소단원 응용(소금물 전체를 만든 뒤 비율을 내는 두 걸음)보다 쉬웠다.
 */
function rateUseDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const v = pick(rng, VEHICLES);
  const rate = pick(rng, SPEED_RATES);
  const h = intBetween(rng, 2, 5);
  const h2 = pick(
    rng,
    Array.from({ length: 5 }, (_, i) => i + 2).filter((x) => x !== h),
  );
  const dist = rate * h;
  const 되짚기 =
    `걸린 시간에 대한 간 거리의 비율을 먼저 구합니다. ${expr(`${dist}\\div${h}=${rate}`)} 이므로 ` +
    `한 시간에 ${unitNum(rate, "km")}를 갑니다.`;
  const 상황 = `${v}${josa(v, "이", "가")} ${num(h)}시간 동안 ${unitNum(dist, "km")}를 갔습니다. 같은 빠르기로 `;
  if (intBetween(rng, 0, 1) === 0) {
    return makeDeep(
      unit,
      `${상황}${num(h2)}시간 동안 가는 거리는 몇 km입니까?`,
      num(rate * h2),
      [
        되짚기,
        `${expr(`${rate}\\times${h2}=${rate * h2}`)} 이므로 ${unitNum(rate * h2, "km")}입니다.`,
      ],
    );
  }
  return makeDeep(
    unit,
    `${상황}${unitNum(rate * h2, "km")}를 가려면 몇 시간이 걸립니까?`,
    num(h2),
    [
      되짚기,
      `${expr(`${rate * h2}\\div${rate}=${h2}`)} 이므로 ${num(h2)}시간입니다.`,
    ],
  );
}

// ── 1-4-5 백분율 ──

/** 연산 — 소수 비율을 백분율로. 절차 한 번(표준의 «분수 비율»과 가른다). */
function pctCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = intBetween(rng, 1, 99);
  return make(
    unit,
    `비율 ${expr(fromCents(c))}${centsJosa(c, "을", "를")} 백분율로 나타내시오.`,
    num(c),
    `비율에 ${num(100)}을 곱하고 기호 ${expr("\\%")} 를 붙입니다. ${expr(`${fromCents(c)}\\times100=${c}`)}`,
  );
}

/** 기본 — 문장 한 겹. 전체에 대한 부분을 백분율로. */
function pctWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const flower = pick(rng, FLOWERS);
  const total = pick(rng, PCT_TOTALS);
  const a = intBetween(rng, 1, Math.min(total - 1, 19));
  const pct = (a * 100) / total;
  return make(
    unit,
    `화단에 꽃이 ${num(total)}송이 피어 있고 그중 ${flower}${josa(flower, "이", "가")} ${num(a)}송이입니다. ` +
      `전체 꽃 수에 대한 ${flower} 수의 비율은 몇 %입니까?`,
    num(pct),
    `전체에 대한 ${flower}의 비율에 ${num(100)}을 곱합니다. ${expr(`\\frac{${a}}{${total}}\\times100=${pct}`)}`,
  );
}

/** 응용 — 두 걸음. 분수·소수 비율을 각각 백분율로 바꾼 뒤 견준다(비율의 크기 비교). */
function pctApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const fd = pick(rng, [2, 4, 5, 10, 20, 25] as const);
  const fn = coprimeTop(rng, fd);
  const pf = (fn * 100) / fd;
  const d10 = pick(
    rng,
    Array.from({ length: 9 }, (_, i) => i + 1).filter((v) => v * 10 !== pf),
  );
  const pd = d10 * 10;
  const bigger = intBetween(rng, 0, 1) === 0;
  const want = bigger ? Math.max(pf, pd) : Math.min(pf, pd);
  return make(
    unit,
    `두 비율 ${expr(`\\frac{${fn}}{${fd}}`)}${numJosa(fn, "과", "와")} ${expr(fromCents(d10 * 10))} 중 ` +
      `더 ${bigger ? "큰" : "작은"} 것을 백분율로 나타내시오.`,
    num(want),
    `${expr(`\\frac{${fn}}{${fd}}\\times100=${pf}`)} 이고 ${expr(`${fromCents(d10 * 10)}\\times100=${pd}`)} 이므로 ` +
      `더 ${bigger ? "큰" : "작은"} 것은 ${expr(`${want}\\%`)} 입니다.`,
  );
}

/**
 * 심화 — ⓐ 어떤 수를 되짚어 **다른 백분율**을 다시 구한다. ⓑ 백분율을 **두 번 겹쳐** 쓴다.
 *
 * ⚠️ 예전 ⓐ 는 「$19\%$ 를 기약분수로」였다 — 한 걸음인 데다 **답의 수가 발문에 그대로**
 *    있었다($19\%\to\frac{19}{100}$). ⓑ 도 기준량을 주어 곱 한 번이었다.
 */
function pctDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    // 어떤 수는 $20$의 배수, 백분율은 $5$의 배수 — 두 곱이 늘 자연수로 떨어진다.
    const base = intBetween(rng, 1, 10) * 20;
    const p = intBetween(rng, 1, 19) * 5;
    const q = pick(
      rng,
      Array.from({ length: 19 }, (_, i) => (i + 1) * 5).filter((x) => x !== p),
    );
    return makeDeep(
      unit,
      `어떤 수의 ${expr(`${p}\\%`)} 는 ${num((base * p) / 100)}입니다. ` +
        `어떤 수의 ${expr(`${q}\\%`)} 는 얼마입니까?`,
      num((base * q) / 100),
      [
        `어떤 수를 ${expr("\\square")} 라 하면 ${expr(`\\square\\times\\frac{${p}}{100}=${(base * p) / 100}`)} 이므로 ` +
          `${expr(`${(base * p) / 100}\\div\\frac{${p}}{100}=${base}`)} 입니다.`,
        `${expr(`${base}\\times\\frac{${q}}{100}=${(base * q) / 100}`)} 입니다.`,
      ],
    );
  }
  // 두 백분율을 겹친다 — 뒤엣것은 **앞에서 구한 수**에 대한 백분율이다.
  const c = pick(rng, PCT_TWICE);
  const who = pick(rng, RATE_GROUPS);
  return makeDeep(
    unit,
    `어느 학교 학생 ${num(c.total)}명 중 ${who} 학생이 ${expr(`${c.p}\\%`)} 이고, ` +
      `그중 ${expr(`${c.q}\\%`)} 가 남학생입니다. ${who} 남학생은 몇 명입니까?`,
    num(c.last),
    [
      `${who} 학생은 ${expr(`${c.total}\\times\\frac{${c.p}}{100}=${c.mid}`)} 명입니다.`,
      `그중 남학생은 ${expr(`${c.mid}\\times\\frac{${c.q}}{100}=${c.last}`)} 명입니다.`,
    ],
  );
}

// ── 1-4-6 백분율이 사용되는 경우 ──

/** 연산 — 값에 이름표가 붙어 있다. 이자율 한 번(카탈로그 「이자율 구하기」). */
function pctUseCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const pr = pick(rng, [10000, 20000, 50000] as const);
  const r = pick(rng, [4, 5, 6, 8, 10] as const);
  return make(
    unit,
    `예금한 돈이 ${num(pr)}원이고 받은 이자가 ${num((pr * r) / 100)}원일 때, ` +
      `예금한 돈에 대한 이자의 비율은 몇 %입니까?`,
    num(r),
    `${expr(`\\frac{${(pr * r) / 100}}{${pr}}\\times100=${r}`)} 이므로 ${expr(`${r}\\%`)} 입니다.`,
  );
}

/** 기본 — 상황문에서 기준량을 추린다. 소금물의 진하기를 백분율로. */
function pctUseWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const total = pick(rng, [200, 250, 400, 500] as const);
  const salt = pick(
    rng,
    ([20, 40, 50, 100] as const).filter(
      (s) => s < total && (s * 100) % total === 0,
    ),
  );
  const pct = (salt * 100) / total;
  return make(
    unit,
    `소금물 ${num(total)} g에 소금 ${num(salt)} g이 녹아 있습니다. ` +
      `소금물 양에 대한 소금 양의 비율은 몇 %입니까?`,
    num(pct),
    `${expr(`\\frac{${salt}}{${total}}\\times100=${pct}`)} 이므로 ${expr(`${pct}\\%`)} 입니다.`,
  );
}

/** 응용 — 두 걸음. 할인 금액을 먼저 구해 지불한 금액을 만든다(백분율의 활용). */
function pctUseApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const p = pick(rng, MONEY);
  const r = pick(rng, [10, 20, 25, 30, 40] as const);
  const cut = (p * r) / 100;
  return make(
    unit,
    `정가가 ${num(p)}원인 물건을 ${expr(`${r}\\%`)} 할인하여 샀습니다. 지불한 금액은 얼마입니까?`,
    num(p - cut),
    `할인 금액은 ${expr(`${p}\\times\\frac{${r}}{100}=${cut}`)} 원입니다. ` +
      `${expr(`${p}-${cut}=${p - cut}`)} 이므로 ${num(p - cut)}원입니다.`,
  );
}

/** 심화 — 역산. ⓐ 할인가에서 원래 가격을 되짚는다. ⓑ 찬성률과 찬성 수에서 전체를 되짚는다. */
function pctUseDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const orig = pick(rng, MONEY);
    const r = pick(rng, [10, 20, 25, 50] as const);
    const paid = (orig * (100 - r)) / 100;
    return make(
      unit,
      `어떤 물건을 ${expr(`${r}\\%`)} 할인하여 ${num(paid)}원에 샀습니다. 이 물건의 원래 가격은 얼마입니까?`,
      num(orig),
      `${expr(`${r}\\%`)} 를 할인했으므로 지불한 금액은 원래 가격의 ${expr(`${100 - r}\\%`)} 입니다. ` +
        `${expr(`${paid}\\div\\frac{${100 - r}}{100}=${orig}`)} 이므로 ${num(orig)}원입니다.`,
    );
  }
  const rate = pick(rng, [40, 50, 60, 80] as const);
  const total = pick(rng, [200, 250, 400, 500] as const);
  const yes = (total * rate) / 100;
  return make(
    unit,
    `어느 학교 투표에서 찬성률이 ${expr(`${rate}\\%`)} 이고 찬성한 학생이 ${num(yes)}명입니다. ` +
      `투표한 학생은 모두 몇 명입니까?`,
    num(total),
    `전체의 ${expr(`${rate}\\%`)} 가 ${num(yes)}명입니다. ${expr(`${yes}\\div\\frac{${rate}}{100}=${total}`)} 이므로 ${num(total)}명입니다.`,
  );
}

// ── 난이도 갈래 (D-72 확대 5차분) — 초6 `1-5 여러 가지 그래프` (소단원 다섯 · 20갈래) ──
//
// ⑴ **참이 처음으로 그림 스펙에 있다** — 읽기 소단원(1-5-1·3·5)의 자료는 `figureSpec`
//    의 {label, pct} 가 SSOT 다. 시험 검산은 스펙에서 비율을 되뽑아 재계산한다.
// ⑵ **새 kind 0** — pieChart·stripChart 만 쓴다. unknown 계약(6a19b9b8)은 barChart
//    전용이므로 원·띠에 «지워진 값»을 만들지 않는다 — 역산의 되짚을 값은 **발문**에 있다
//    (「X를 고른 학생이 $70$명 → 전체는?」). 그리기 소단원(1-5-2·4)은 자료를 발문 글로
//    주고 그림을 안 붙인다(그래프를 «그리기 전» 단계라 그림이 없는 것이 자연스럽다).
// ⑶ 백분율은 전부 5 의 배수, 전체 수는 CHART_TOTALS(100~400) — 명수·길이가 늘 자연수다.
// ⑷ 표준 문형(1-5-1 명수 · 1-5-2 길이 · 1-5-3 비율 합 · 1-5-4 두 항목 명수 합 ·
//    1-5-5 최고최저 차)과 묻는 것을 전부 가른다(R5).

/** 전 항목 비율이 서로 다른 자료 — «가장 큰»·«…보다 높은» 이 유일하게 서야 하는 갈래용. */
function chartDataDistinct(rng: Rng): ChartData {
  for (let t = 0; t < 30; t += 1) {
    const d = chartData(rng, true);
    const ps = d.items.map((i) => i.pct);
    if (new Set(ps).size === ps.length) return d;
  }
  return {
    subject: GRAPH_THEMES[0].subject,
    items: GRAPH_THEMES[0].items.slice(0, 3).map((label, i) => ({
      label,
      pct: [20, 30, 50][i]!,
    })),
  };
}

/** 서로 다른 5 의 배수 셋(내림차순)로 100 을 가르는 분할 — 1-5-2 응용(누적 위치)용. */
const STRIP_TRIPLES: [number, number, number][] = [];
for (let p3 = 15; p3 <= 30; p3 += 5) {
  for (let p2 = p3 + 5; p2 <= 45; p2 += 5) {
    const p1 = 100 - p2 - p3;
    if (p1 > p2) STRIP_TRIPLES.push([p1, p2, p3]);
  }
}

/** 항목이 넷인 주제만 — 1-5-4 기본(나머지 항목)이 네 항목을 쓴다. */
const FOUR_ITEM_THEMES = GRAPH_THEMES.filter((t) => t.items.length >= 4);

/** 띠·원 그리기 갈래가 쓰는 비율(5 의 배수). */
const DRAW_PCTS = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60] as const;

// ── 1-5-1 띠그래프 (읽기) ──

/** 연산 — 띠그래프에서 항목의 비율을 읽는다(명수는 표준 몫 — R5 분리). */
function stripReadCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { subject, items } = chartData(rng);
  const one = items[intBetween(rng, 0, items.length - 1)]!;
  return make(
    unit,
    `학생들이 ${subject}을 조사하여 나타낸 띠그래프입니다. ${one.label}의 비율은 몇 %입니까?`,
    num(one.pct),
    `띠그래프에서 ${one.label} 부분에 적힌 비율을 읽으면 ${expr(`${one.pct}\\%`)} 입니다.`,
    fig("stripChart", { segments: items }),
  );
}

/** 기본 — 가장 넓은 부분을 찾는다. 비율이 전부 달라야 답이 하나로 선다. */
function stripReadWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const top = d.items.reduce((a, b) => (a.pct > b.pct ? a : b));
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 띠그래프입니다. 가장 많은 학생이 고른 항목을 쓰시오.`,
    top.label,
    `띠그래프에서 가장 넓은 부분을 찾습니다. 비율이 ${expr(`${top.pct}\\%`)} 로 가장 큰 ${top.label}입니다.`,
    fig("stripChart", { segments: d.items }),
  );
}

/** 응용 — 두 항목의 비율을 읽어 명수 차로 바꾼다(두 걸음). */
function stripReadApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const total = pick(rng, CHART_TOTALS);
  const [p, q] = twoLabels(rng, d.items);
  const [big, small] = p.pct > q.pct ? [p, q] : [q, p];
  const nBig = (total * big.pct) / 100;
  const nSmall = (total * small.pct) / 100;
  return make(
    unit,
    `학생 ${num(total)}명의 ${d.subject}을 조사하여 나타낸 띠그래프입니다. ` +
      `${big.label}${josa(big.label, "을", "를")} 고른 학생은 ${small.label}${josa(small.label, "을", "를")} 고른 학생보다 몇 명 더 많습니까?`,
    num(nBig - nSmall),
    `${big.label}${josa(big.label, "은", "는")} ${expr(`${total}\\times\\frac{${big.pct}}{100}=${nBig}`)} 명이고 ` +
      `${small.label}${josa(small.label, "은", "는")} ${expr(`${total}\\times\\frac{${small.pct}}{100}=${nSmall}`)} 명입니다. ` +
      `${expr(`${nBig}-${nSmall}=${nBig - nSmall}`)} 이므로 ${num(nBig - nSmall)}명 더 많습니다.`,
    fig("stripChart", { segments: d.items }),
  );
}

/** 심화 — 역산. 한 항목의 명수에서 전체를 되짚는다(되짚을 값은 발문에 있다). */
function stripReadDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartData(rng);
  const total = pick(rng, CHART_TOTALS);
  const one = d.items[intBetween(rng, 0, d.items.length - 1)]!;
  const n = (total * one.pct) / 100;
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 띠그래프입니다. ${one.label}${josa(one.label, "을", "를")} 고른 학생이 ${num(n)}명일 때, ` +
      `조사한 전체 학생은 몇 명입니까?`,
    num(total),
    // 「백분의 (pct)」 — 분수는 **분자를 마지막에 읽으므로** 조사는 pct 가 정한다(R-조사).
    `띠그래프에서 ${one.label}의 비율은 ${expr(`${one.pct}\\%`)} 입니다. 전체의 ${expr(`\\frac{${one.pct}}{100}`)}${numJosa(one.pct, "이", "가")} ${num(n)}명이므로 ` +
      `${expr(`${n}\\div\\frac{${one.pct}}{100}=${total}`)} 입니다.`,
    fig("stripChart", { segments: d.items }),
  );
}

// ── 1-5-2 띠그래프로 나타내기 (그리기 — 자료를 발문이 주므로 그림 없음) ──

/** 연산 — 명수를 비율로. 절차 한 번. */
function stripDrawCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const item = pick(rng, theme.items);
  const total = pick(rng, CHART_TOTALS);
  const p = pick(rng, DRAW_PCTS);
  const n = (total * p) / 100;
  return make(
    unit,
    `학생 ${num(total)}명의 ${theme.subject}을 조사하였더니 ${item}${josa(item, "을", "를")} 고른 학생이 ${num(n)}명이었습니다. ` +
      `이 자료를 띠그래프로 나타낼 때 ${item}의 비율은 몇 %입니까?`,
    num(p),
    `${expr(`\\frac{${n}}{${total}}\\times100=${p}`)} 이므로 ${expr(`${p}\\%`)} 입니다.`,
  );
}

/** 기본 — 비율을 띠의 길이로. */
function stripDrawWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const item = pick(rng, theme.items);
  const p = pick(rng, DRAW_PCTS);
  const w = pick(rng, [20, 40] as const);
  const len = (w * p) / 100;
  return make(
    unit,
    `${theme.subject} 조사에서 ${item}의 비율이 ${expr(`${p}\\%`)} 입니다. ` +
      `전체 길이가 ${unitNum(w, "cm")} 인 띠그래프로 나타낼 때 ${item}${josa(item, "이", "가")} 차지하는 길이는 몇 cm입니까?`,
    num(len),
    `전체 길이에 비율을 곱합니다. ${expr(`${w}\\times\\frac{${p}}{100}=${len}`)}`,
  );
}

/** 응용 — 비율이 큰 항목부터 차례로 그릴 때 마지막 항목이 시작되는 자리(누적). */
function stripDrawApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const [p1, p2, p3] = pick(rng, STRIP_TRIPLES);
  const labels = theme.items.slice(0, 3);
  // 지면에는 비율 차례를 섞어 적는다 — 차례 정하기가 이 갈래의 걸음이다.
  const order = pick(rng, [
    [0, 1, 2],
    [1, 2, 0],
    [2, 0, 1],
    [1, 0, 2],
  ] as const);
  const pairs = [
    { label: labels[0]!, pct: p1 },
    { label: labels[1]!, pct: p2 },
    { label: labels[2]!, pct: p3 },
  ];
  const shown = order.map((i) => pairs[i]!);
  const last = pairs[2]!; // 가장 작은 항목 — 시작 자리는 나머지 둘의 합이다
  const w = pick(rng, [20, 40] as const);
  const start = (w * (p1 + p2)) / 100;
  return make(
    unit,
    `${theme.subject} 조사에서 ${shown.map((s) => `${s.label}${josa(s.label, "은", "는")} ${expr(`${s.pct}\\%`)}`).join(", ")} 입니다. ` +
      `비율이 큰 항목부터 왼쪽에서 차례로 전체 길이 ${unitNum(w, "cm")} 인 띠그래프에 나타낼 때, ` +
      `${last.label}${josa(last.label, "이", "가")} 시작되는 곳은 왼쪽 끝에서 몇 cm입니까?`,
    num(start),
    `${last.label}보다 비율이 큰 두 항목이 먼저 오므로 그 합만큼 지나서 시작됩니다. ` +
      `${expr(`${p1}+${p2}=${p1 + p2}`)} 이고 ${expr(`${w}\\times\\frac{${p1 + p2}}{100}=${start}`)} 입니다.`,
  );
}

/** 심화 — 역산. 차지한 길이에서 비율을 되짚어 명수로 잇는다. */
function stripDrawDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const item = pick(rng, theme.items);
  const p = pick(rng, DRAW_PCTS);
  const w = pick(rng, [20, 40] as const);
  const len = (w * p) / 100;
  const total = pick(rng, CHART_TOTALS);
  const n = (total * p) / 100;
  return make(
    unit,
    `${theme.subject}을 조사하여 전체 길이가 ${unitNum(w, "cm")} 인 띠그래프로 나타내었더니 ` +
      `${item}${josa(item, "이", "가")} ${unitNum(len, "cm")}를 차지합니다. 조사한 전체 학생이 ${num(total)}명일 때 ` +
      `${item}${josa(item, "을", "를")} 고른 학생은 몇 명입니까?`,
    num(n),
    `${item}의 비율은 ${expr(`\\frac{${len}}{${w}}\\times100=${p}`)} 이므로 ${expr(`${p}\\%`)} 입니다. ` +
      `${expr(`${total}\\times\\frac{${p}}{100}=${n}`)} 이므로 ${num(n)}명입니다.`,
  );
}

// ── 1-5-3 원그래프 (읽기) ──

/** 연산 — 원그래프에서 항목의 비율을 읽는다. */
function pieReadCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { subject, items } = chartData(rng);
  const one = items[intBetween(rng, 0, items.length - 1)]!;
  return make(
    unit,
    `학생들이 ${subject}을 조사하여 나타낸 원그래프입니다. ${one.label}의 비율은 몇 %입니까?`,
    num(one.pct),
    `원그래프에서 ${one.label} 부분에 적힌 비율을 읽으면 ${expr(`${one.pct}\\%`)} 입니다.`,
    fig("pieChart", { slices: items }),
  );
}

/** 기본 — 두 항목의 비율 차. */
function pieReadWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const [p, q] = twoLabels(rng, d.items);
  const [big, small] = p.pct > q.pct ? [p, q] : [q, p];
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 원그래프입니다. ` +
      `${big.label}의 비율은 ${small.label}의 비율보다 몇 % 더 높습니까?`,
    num(big.pct - small.pct),
    `${big.label}${josa(big.label, "은", "는")} ${expr(`${big.pct}\\%`)}, ${small.label}${josa(small.label, "은", "는")} ${expr(`${small.pct}\\%`)} 입니다. ` +
      `${expr(`${big.pct}-${small.pct}=${big.pct - small.pct}`)} 이므로 ${expr(`${big.pct - small.pct}\\%`)} 더 높습니다.`,
    fig("pieChart", { slices: d.items }),
  );
}

/** 응용 — «몇 배». 구성이 정수배를 보장한다. */
function pieReadApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const yPct = pick(rng, [10, 15, 20] as const);
  const k = pick(
    rng,
    ([2, 3] as const).filter((v) => 100 - yPct - v * yPct >= 10),
  );
  const xPct = k * yPct;
  const rest = 100 - xPct - yPct;
  const labels = theme.items.slice(0, 3);
  const items = [
    { label: labels[0]!, pct: xPct },
    { label: labels[1]!, pct: yPct },
    { label: labels[2]!, pct: rest },
  ];
  return make(
    unit,
    `학생들이 ${theme.subject}을 조사하여 나타낸 원그래프입니다. ` +
      `${labels[0]}의 비율은 ${labels[1]}의 비율의 몇 배입니까?`,
    num(k),
    `${labels[0]}${josa(labels[0]!, "은", "는")} ${expr(`${xPct}\\%`)}, ${labels[1]}${josa(labels[1]!, "은", "는")} ${expr(`${yPct}\\%`)} 입니다. ` +
      `${expr(`${xPct}\\div${yPct}=${k}`)} 이므로 ${num(k)}배입니다.`,
    fig("pieChart", { slices: items }),
  );
}

/** 심화 — 역산 두 번. X 의 명수에서 전체를 되짚어 Y 의 명수를 구한다. */
function pieReadDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const total = pick(rng, REVERSE_CHART_TOTALS);
  const [x, y] = twoLabels(rng, d.items);
  const nX = (total * x.pct) / 100;
  const nY = (total * y.pct) / 100;
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 원그래프입니다. ${x.label}${josa(x.label, "을", "를")} 고른 학생이 ${num(nX)}명일 때, ` +
      `${y.label}${josa(y.label, "을", "를")} 고른 학생은 몇 명입니까?`,
    num(nY),
    `${x.label}의 비율이 ${expr(`${x.pct}\\%`)} 이므로 전체는 ${expr(`${nX}\\div\\frac{${x.pct}}{100}=${total}`)} 명입니다. ` +
      `${y.label}${josa(y.label, "은", "는")} ${expr(`${total}\\times\\frac{${y.pct}}{100}=${nY}`)} 명입니다.`,
    fig("pieChart", { slices: d.items }),
  );
}

// ── 1-5-4 원그래프로 나타내기 (그리기 — 그림 없음) ──

/** 연산 — 명수를 비율로. */
function pieDrawCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const item = pick(rng, theme.items);
  const total = pick(rng, CHART_TOTALS);
  const p = pick(rng, DRAW_PCTS);
  const n = (total * p) / 100;
  return make(
    unit,
    `학생 ${num(total)}명의 ${theme.subject}을 조사하였더니 ${item}${josa(item, "을", "를")} 고른 학생이 ${num(n)}명이었습니다. ` +
      `이 자료를 원그래프로 나타낼 때 ${item}의 비율은 몇 %입니까?`,
    num(p),
    `${expr(`\\frac{${n}}{${total}}\\times100=${p}`)} 이므로 ${expr(`${p}\\%`)} 입니다.`,
  );
}

/** 기본 — 나머지 항목의 비율(전체가 100% 라는 것을 쓴다). */
function pieDrawWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, FOUR_ITEM_THEMES);
  const [a, b, c, dLabel] = theme.items;
  for (let t = 0; t < 40; t += 1) {
    const pa = pick(rng, DRAW_PCTS);
    const pb = pick(rng, DRAW_PCTS);
    const pc = pick(rng, DRAW_PCTS);
    const pd = 100 - pa - pb - pc;
    if (pd < 10) continue;
    return make(
      unit,
      `${theme.subject}을 조사하여 원그래프로 나타내려고 합니다. ${a}${josa(a!, "은", "는")} ${expr(`${pa}\\%`)}, ` +
        `${b}${josa(b!, "은", "는")} ${expr(`${pb}\\%`)}, ${c}${josa(c!, "은", "는")} ${expr(`${pc}\\%`)} 이고 나머지는 모두 ${dLabel}입니다. ` +
        `${dLabel}의 비율은 몇 %입니까?`,
      num(pd),
      `전체는 ${expr(`100\\%`)} 입니다. ${expr(`100-(${pa}+${pb}+${pc})=${pd}`)} 이므로 ${expr(`${pd}\\%`)} 입니다.`,
    );
  }
  // 40번 안에 못 찾을 수 없는 구성이지만, 조용히 나쁜 값을 내느니 던진다.
  throw new Error("1-5-4 기본: 비율 조합을 만들지 못했습니다");
}

/** 응용 — 두 항목의 명수를 비율로 바꿔 합한다(표준의 «비율 합→명수»와 방향이 반대다). */
function pieDrawApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const [a, b] = theme.items;
  const total = pick(rng, CHART_TOTALS);
  const pa = pick(rng, DRAW_PCTS);
  const pb = pick(
    rng,
    DRAW_PCTS.filter((v) => v + pa <= 85),
  );
  const nA = (total * pa) / 100;
  const nB = (total * pb) / 100;
  return make(
    unit,
    `학생 ${num(total)}명의 ${theme.subject} 조사에서 ${a}${josa(a!, "이", "가")} ${num(nA)}명, ${b}${josa(b!, "이", "가")} ${num(nB)}명입니다. ` +
      `원그래프로 나타낼 때 ${a}${josa(a!, "과", "와")} ${b}의 비율의 합은 몇 %입니까?`,
    num(pa + pb),
    `${a}${josa(a!, "은", "는")} ${expr(`\\frac{${nA}}{${total}}\\times100=${pa}`)} 이고 ` +
      `${b}${josa(b!, "은", "는")} ${expr(`\\frac{${nB}}{${total}}\\times100=${pb}`)} 입니다. ` +
      `${expr(`${pa}+${pb}=${pa + pb}`)} 이므로 ${expr(`${pa + pb}\\%`)} 입니다.`,
  );
}

/** 심화 — 관계 단서(«…의 k배») + 전체 100% 를 겹쳐 명수까지 잇는다. */
function pieDrawDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const [a, b, c] = theme.items;
  const pb = pick(rng, [10, 15, 20, 25] as const);
  const k = pick(
    rng,
    ([2, 3] as const).filter((v) => 100 - pb - v * pb >= 10),
  );
  const pa = k * pb;
  const pc = 100 - pa - pb;
  const total = pick(rng, CHART_TOTALS);
  const n = (total * pc) / 100;
  return make(
    unit,
    `${theme.subject}을 조사하여 원그래프로 나타내려고 합니다. ${a}의 비율은 ${b}의 비율의 ${num(k)}배이고, ` +
      `${b}${josa(b!, "은", "는")} ${expr(`${pb}\\%`)} 입니다. 나머지는 모두 ${c}입니다. ` +
      `전체 학생이 ${num(total)}명일 때 ${c}${josa(c!, "을", "를")} 고른 학생은 몇 명입니까?`,
    num(n),
    `${a}${josa(a!, "은", "는")} ${expr(`${pb}\\times${k}=${pa}`)} 이므로 ${expr(`${pa}\\%`)} 입니다. ` +
      `${c}${josa(c!, "은", "는")} ${expr(`100-${pa}-${pb}=${pc}`)} 이므로 ${expr(`${pc}\\%`)} 이고, ` +
      `${expr(`${total}\\times\\frac{${pc}}{100}=${n}`)} 이므로 ${num(n)}명입니다.`,
  );
}

// ── 1-5-5 여러 가지 그래프 비교하기 (띠·원을 섞어 낸다) ──

/** 이 소단원은 그래프 종류가 씨앗마다 갈린다 — 그림과 발문의 이름이 같이 움직인다. */
function cmpChartFig(rng: Rng, items: ChartData["items"]) {
  const usePie = rng() < 0.5;
  return {
    kindName: usePie ? "원그래프" : "띠그래프",
    figure: usePie
      ? fig("pieChart", { slices: items })
      : fig("stripChart", { segments: items }),
  };
}

/** 연산 — 가장 높은 항목의 비율 읽기(최고최저 차는 표준 몫 — R5 분리). */
function cmpChartCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const { kindName, figure } = cmpChartFig(rng, d.items);
  const top = d.items.reduce((a, b) => (a.pct > b.pct ? a : b));
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 ${kindName}입니다. 비율이 가장 높은 항목의 비율은 몇 %입니까?`,
    num(top.pct),
    `${kindName}에서 가장 넓은 부분은 ${top.label}입니다. 비율은 ${expr(`${top.pct}\\%`)} 입니다.`,
    figure,
  );
}

/** 기본 — 한 항목보다 비율이 높은 항목 세기. */
function cmpChartWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const { kindName, figure } = cmpChartFig(rng, d.items);
  const sorted = [...d.items].sort((a, b) => b.pct - a.pct);
  // 가장 높은 항목을 고르면 답이 0 이 된다 — 그 아래에서 고른다.
  const base = sorted[intBetween(rng, 1, sorted.length - 1)]!;
  const count = d.items.filter((i) => i.pct > base.pct).length;
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 ${kindName}입니다. ` +
      `${base.label}보다 비율이 높은 항목은 모두 몇 개입니까?`,
    num(count),
    `${base.label}의 비율은 ${expr(`${base.pct}\\%`)} 입니다. 이보다 비율이 높은 항목은 ` +
      `${sorted
        .filter((i) => i.pct > base.pct)
        .map((i) => i.label)
        .join(
          ", ",
        )}${josa(sorted[count - 1]!.label, "으로", "로")} 모두 ${num(count)}개입니다.`,
    figure,
  );
}

/** 응용 — 상위 두 항목의 합이 절반을 얼마나 넘는가(두 걸음). */
function cmpChartApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const { kindName, figure } = cmpChartFig(rng, d.items);
  const sorted = [...d.items].sort((a, b) => b.pct - a.pct);
  const sum = sorted[0]!.pct + sorted[1]!.pct;
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 ${kindName}입니다. ` +
      `비율이 가장 높은 항목과 두 번째로 높은 항목의 비율의 합은 전체의 절반보다 몇 % 더 많습니까?`,
    num(sum - 50),
    `두 항목은 ${sorted[0]!.label}${josa(sorted[0]!.label, "과", "와")} ${sorted[1]!.label}이고 비율의 합은 ` +
      `${expr(`${sorted[0]!.pct}+${sorted[1]!.pct}=${sum}`)} 입니다. 절반은 ${expr(`50\\%`)} 이므로 ` +
      `${expr(`${sum}-50=${sum - 50}`)} 입니다.`,
    figure,
  );
}

/** 심화 — 역산 두 번. 최고 항목의 명수에서 전체를 되짚어 최저 항목의 명수를 구한다. */
function cmpChartDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const { kindName, figure } = cmpChartFig(rng, d.items);
  const sorted = [...d.items].sort((a, b) => b.pct - a.pct);
  const top = sorted[0]!;
  const low = sorted[sorted.length - 1]!;
  const total = pick(rng, REVERSE_CHART_TOTALS);
  const nTop = (total * top.pct) / 100;
  const nLow = (total * low.pct) / 100;
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 ${kindName}입니다. ` +
      `비율이 가장 높은 항목을 고른 학생이 ${num(nTop)}명일 때, 비율이 가장 낮은 항목을 고른 학생은 몇 명입니까?`,
    num(nLow),
    `가장 높은 ${top.label}의 비율이 ${expr(`${top.pct}\\%`)} 이므로 전체는 ${expr(`${nTop}\\div\\frac{${top.pct}}{100}=${total}`)} 명입니다. ` +
      `가장 낮은 ${low.label}${josa(low.label, "은", "는")} ${expr(`${total}\\times\\frac{${low.pct}}{100}=${nLow}`)} 명입니다.`,
    figure,
  );
}

// ── 난이도 갈래 (D-72 확대 6차분) — 초6 `1-6 직육면체의 겉넓이와 부피` (3소단원 · 12갈래) ──
//
// 초6 1학기 마지막 대단원. 그림은 기존 `cuboid` 만 쓴다(새 kind 0 · 전개도 불필요 설계).
// 연산·기본은 치수를 **가로/세로/높이 이름표**로 적는다 — `probe-elem-arithmetic` ⑧이
// 그 이름표로 직육면체 부피·겉넓이를 독립 재계산하므로 검산이 한 겹 공짜로 는다.
// 단위 혼합(1-6-3 응용)은 그 판정기의 lengthUnits 가드가 **일부러 안 읽는** 자리다 —
// 시험(elemTiersG6)이 전담한다. 심화의 역산은 제곱근·세제곱근이 필요 없는 꼴만 고른다
// (두 변+겉넓이→나머지 변 · 겉넓이→한 면 · 부피+두 변→높이 · 쌓기나무 층수).

/** 정육면체 모양 물건 — 1-6-1 기본(겉넓이)과 1-6-2 기본(부피)이 서로 다른 풀을 쓴다. */
const CUBE_THINGS_AREA = ["주사위", "각설탕", "선물 상자"] as const;
const CUBE_THINGS_VOL = ["블록", "두부", "상자"] as const;

/** m³ 로 재는 큰 물건 — 1-6-3. */
const BIG_THINGS = ["컨테이너", "창고", "물탱크"] as const;

// ── 1-6-1 직육면체의 겉넓이 구하는 방법 ──

/** 연산 — 세 치수가 이름표로 주어진다. 공식 한 번. */
function surfCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 2, 9);
  const d = intBetween(rng, 2, 6);
  const h = intBetween(rng, 2, 7);
  const area = 2 * (w * d + d * h + h * w);
  return make(
    unit,
    `가로가 ${unitNum(w, "cm")}, 세로가 ${unitNum(d, "cm")}, 높이가 ${unitNum(h, "cm")} 인 직육면체가 있습니다. ` +
      `겉넓이는 몇 cm²입니까?`,
    num(area),
    `세 종류의 면을 더해 ${num(2)}배 합니다. ${expr(`(${w}\\times${d}+${d}\\times${h}+${h}\\times${w})\\times2=${area}`)}`,
    fig("cuboid", { w, d, h }),
  );
}

/** 기본 — 정육면체 모양 물건. 한 모서리에서 여섯 면을 센다. */
function surfWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, CUBE_THINGS_AREA);
  const a = intBetween(rng, 2, 9);
  return make(
    unit,
    `한 모서리의 길이가 ${unitNum(a, "cm")} 인 정육면체 모양 ${thing}${josa(thing, "이", "가")} 있습니다. ` +
      `이 ${thing}의 겉넓이는 몇 cm²입니까?`,
    num(6 * a * a),
    `정육면체의 여섯 면은 모두 합동입니다. ${expr(`${a}\\times${a}\\times6=${6 * a * a}`)}`,
    fig("cuboid", { w: a, d: a, h: a }),
  );
}

/** 응용 — 뚜껑 없는 상자. 겉넓이에서 윗면을 빼는 걸음이 하나 더 있다. */
function surfApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 3, 9);
  const d = intBetween(rng, 2, 6);
  const h = intBetween(rng, 2, 7);
  const five = w * d + 2 * (d * h + h * w);
  return make(
    unit,
    `뚜껑이 없는 직육면체 모양 상자가 있습니다. 가로가 ${unitNum(w, "cm")}, 세로가 ${unitNum(d, "cm")}, ` +
      `높이가 ${unitNum(h, "cm")} 일 때, 상자의 바깥쪽 다섯 면에 색종이를 빈틈없이 붙이려면 ` +
      `색종이는 모두 몇 cm²가 필요합니까?`,
    num(five),
    `뚜껑이 없으므로 바닥 한 면과 옆면 네 면을 더합니다. ` +
      `${expr(`${w}\\times${d}=${w * d}`)} 이고 옆면은 ${expr(`(${d}\\times${h}+${h}\\times${w})\\times2=${2 * (d * h + h * w)}`)} 이므로 ` +
      `${expr(`${w * d}+${2 * (d * h + h * w)}=${five}`)} 입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 심화 — 역산. ⓐ 두 변과 겉넓이에서 나머지 변을 되짚는다. ⓑ 정육면체 겉넓이에서 한 면을. */
function surfDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const w = intBetween(rng, 2, 7);
    const d = intBetween(rng, 2, 6);
    const h = intBetween(rng, 2, 9);
    const area = 2 * (w * d + d * h + h * w);
    return make(
      unit,
      `가로가 ${unitNum(w, "cm")}, 세로가 ${unitNum(d, "cm")} 인 직육면체의 겉넓이가 ${num(area)} cm²입니다. ` +
        `이 직육면체의 높이는 몇 cm입니까?`,
      num(h),
      `두 밑면의 넓이는 ${expr(`${w}\\times${d}\\times2=${2 * w * d}`)} 이므로 옆면 네 면의 넓이는 ` +
        `${expr(`${area}-${2 * w * d}=${area - 2 * w * d}`)} 입니다. 옆면의 가로 합은 둘레 ${expr(`(${w}+${d})\\times2=${2 * (w + d)}`)} 이므로 ` +
        `높이는 ${expr(`${area - 2 * w * d}\\div${2 * (w + d)}=${h}`)} 입니다.`,
    );
  }
  const a = intBetween(rng, 2, 9);
  return make(
    unit,
    `겉넓이가 ${num(6 * a * a)} cm²인 정육면체가 있습니다. 이 정육면체의 한 면의 넓이는 몇 cm²입니까?`,
    num(a * a),
    `정육면체의 여섯 면은 모두 합동이므로 겉넓이를 ${num(6)}으로 나눕니다. ${expr(`${6 * a * a}\\div6=${a * a}`)}`,
  );
}

// ── 1-6-2 직육면체의 부피 비교와 부피 구하는 방법 ──

/** 연산 — 세 치수가 이름표로 주어진다. 공식 한 번. */
function volCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 2, 9);
  const d = intBetween(rng, 2, 6);
  const h = intBetween(rng, 2, 7);
  return make(
    unit,
    `가로가 ${unitNum(w, "cm")}, 세로가 ${unitNum(d, "cm")}, 높이가 ${unitNum(h, "cm")} 인 직육면체가 있습니다. ` +
      `부피는 몇 cm³입니까?`,
    num(w * d * h),
    `(부피)=(가로)×(세로)×(높이)입니다. ${expr(`${w}\\times${d}\\times${h}=${w * d * h}`)}`,
    fig("cuboid", { w, d, h }),
  );
}

/** 기본 — 정육면체 모양 물건의 부피. */
function volWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, CUBE_THINGS_VOL);
  const a = intBetween(rng, 2, 9);
  return make(
    unit,
    `한 모서리의 길이가 ${unitNum(a, "cm")} 인 정육면체 모양 ${thing}${josa(thing, "이", "가")} 있습니다. ` +
      `이 ${thing}의 부피는 몇 cm³입니까?`,
    num(a * a * a),
    `정육면체의 세 모서리는 길이가 같습니다. ${expr(`${a}\\times${a}\\times${a}=${a * a * a}`)}`,
    fig("cuboid", { w: a, d: a, h: a }),
  );
}

/** 응용 — 부피 «비교»(소단원 이름의 그 축). 두 변을 늘이면 부피가 몇 배가 되는가. */
function volApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const dims = pick(rng, [
    ["가로", "세로"],
    ["가로", "높이"],
    ["세로", "높이"],
  ] as const);
  const k1 = intBetween(rng, 2, 4);
  const k2 = intBetween(rng, 2, 4);
  return make(
    unit,
    `직육면체의 ${dims[0]}${josa(dims[0], "을", "를")} ${num(k1)}배, ${dims[1]}${josa(dims[1], "을", "를")} ${num(k2)}배로 늘이면 ` +
      `부피는 처음의 몇 배가 됩니까?`,
    num(k1 * k2),
    `부피는 세 모서리 길이의 곱이므로 늘인 배수끼리 곱합니다. ${expr(`${k1}\\times${k2}=${k1 * k2}`)}`,
  );
}

/** 심화 — 역산. ⓐ 부피와 두 변에서 높이를 되짚는다. ⓑ 쌓기나무 층수. */
function volDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 2, 6);
  const d = intBetween(rng, 2, 5);
  const h = intBetween(rng, 2, 9);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `부피가 ${num(w * d * h)} cm³이고 가로가 ${unitNum(w, "cm")}, 세로가 ${unitNum(d, "cm")} 인 직육면체가 있습니다. ` +
        `이 직육면체의 높이는 몇 cm입니까?`,
      num(h),
      `밑면의 넓이는 ${expr(`${w}\\times${d}=${w * d}`)} 입니다. 높이는 ${expr(`${w * d * h}\\div${w * d}=${h}`)} 입니다.`,
    );
  }
  return make(
    unit,
    `한 모서리의 길이가 ${unitNum(1, "cm")} 인 쌓기나무 ${num(w * d * h)}개를 가로로 ${num(w)}개, 세로로 ${num(d)}개씩 놓아 ` +
      `직육면체 모양으로 빈틈없이 쌓았습니다. 몇 층으로 쌓았습니까?`,
    num(h),
    `한 층에 놓이는 쌓기나무는 ${expr(`${w}\\times${d}=${w * d}`)} 개입니다. ${expr(`${w * d * h}\\div${w * d}=${h}`)} 이므로 ${num(h)}층입니다.`,
  );
}

// ── 1-6-3 ㎥ 알아보기 ──

/** 연산 — 문장형 환산(표준의 «□ 안에 알맞은 수» 꼴과 가른다). */
function cubicCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `${num(k)} m³는 몇 cm³입니까?`,
      num(k * 1000000),
      `${expr("1\\,\\mathrm{m}^3=1000000\\,\\mathrm{cm}^3")} 이므로 ${expr(`${k}\\times1000000=${k * 1000000}`)} 입니다.`,
    );
  }
  return make(
    unit,
    `${num(k * 1000000)} cm³는 몇 m³입니까?`,
    num(k),
    `${expr("1000000\\,\\mathrm{cm}^3=1\\,\\mathrm{m}^3")} 이므로 ${expr(`${k * 1000000}\\div1000000=${k}`)} 입니다.`,
  );
}

/** 기본 — m 단위 직육면체의 부피. */
function cubicWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, BIG_THINGS);
  const w = intBetween(rng, 2, 6);
  const d = intBetween(rng, 2, 5);
  const h = intBetween(rng, 2, 4);
  return make(
    unit,
    `가로가 ${unitNum(w, "m")}, 세로가 ${unitNum(d, "m")}, 높이가 ${unitNum(h, "m")} 인 직육면체 모양 ${thing}${josa(thing, "이", "가")} 있습니다. ` +
      `이 ${thing}의 부피는 몇 m³입니까?`,
    num(w * d * h),
    `(부피)=(가로)×(세로)×(높이)입니다. ${expr(`${w}\\times${d}\\times${h}=${w * d * h}`)}`,
    fig("cuboid", { w, d, h }),
  );
}

/** 응용 — 단위 혼합. cm 로 준 변을 m 로 바꿔야 부피가 선다(산술 판정기가 일부러 안 읽는 자리). */
function cubicApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const wCm = intBetween(rng, 2, 5) * 100;
  const d = intBetween(rng, 2, 5);
  const h = intBetween(rng, 2, 4);
  const wM = wCm / 100;
  return make(
    unit,
    `가로가 ${unitNum(wCm, "cm")}, 세로가 ${unitNum(d, "m")}, 높이가 ${unitNum(h, "m")} 인 직육면체가 있습니다. ` +
      `이 직육면체의 부피는 몇 m³입니까?`,
    num(wM * d * h),
    `단위를 m 로 맞춥니다. ${expr(`${wCm}\\,\\mathrm{cm}=${wM}\\,\\mathrm{m}`)} 이므로 ` +
      `${expr(`${wM}\\times${d}\\times${h}=${wM * d * h}`)} 입니다.`,
  );
}

/** 심화 — 환산 + 역산. cm³ 부피와 m 단위 두 변에서 높이를 m 로 되짚는다. */
function cubicDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, BIG_THINGS);
  const w = intBetween(rng, 2, 4);
  const d = intBetween(rng, 2, 3);
  const h = intBetween(rng, 2, 4);
  const vCm = w * d * h * 1000000;
  return make(
    unit,
    `부피가 ${num(vCm)} cm³인 직육면체 모양 ${thing}${josa(thing, "이", "가")} 있습니다. ` +
      `가로가 ${unitNum(w, "m")}, 세로가 ${unitNum(d, "m")} 일 때, 이 ${thing}의 높이는 몇 m입니까?`,
    num(h),
    `${expr(`${vCm}\\,\\mathrm{cm}^3=${w * d * h}\\,\\mathrm{m}^3`)} 입니다. 밑면의 넓이가 ` +
      `${expr(`${w}\\times${d}=${w * d}`)} 이므로 높이는 ${expr(`${w * d * h}\\div${w * d}=${h}`)} 입니다.`,
  );
}

// ── 난이도 갈래 (D-72 확대 7차분) — 초6 `2-1 분수의 나눗셈` (5소단원 · 20갈래) ────
//
// ⑴ 답 분수는 표준과 같은 규약 — `fmtFrac`(기약, 가분수는 대분수로). 시험이 gcd 로
//    독립 검산한다(발문 분수 기약 · 대분수 정본 꼴 포함).
// ⑵ 「분모가 같은/다른」 판정기 검사는 loose 가 없다 — **문장형 갈래도 발문에 분수
//    두 개가 실제로 보이는 문형**만 쓴다(심화 = 「어떤 수에 $\frac{b}{d}$ 를 곱했더니
//    $\frac{a}{d}$」 — 곱을 나눗셈으로 되돌리는 역산이면서 같은 분모 둘이 지면에 선다).
// ⑶ 2-1-4 는 답이 **식**인 갈래가 있다(곱셈식으로 나타내기) — 검산은 값이 아니라
//    「뒤 분수가 뒤집혔는가」 구조로 본다. 뒤집기 누락이 이 단원의 고전 오류다.

/** 분모 `d` 와 서로소이고 서로 다른 진분수 분자 둘. */
function twoCoprimeTops(rng: Rng, d: number): [number, number] {
  const a = coprimeTop(rng, d);
  let b = coprimeTop(rng, d);
  for (let t = 0; t < 20 && b === a; t += 1) b = coprimeTop(rng, d);
  if (b === a) b = a === 1 ? (d > 2 ? d - 1 : 1) : 1;
  return [a, b];
}

/** 같은 분모 나눗셈 소재 — 「…씩 …에 나누어」. */
const FRAC_CUT = [
  { thing: "철사", unit: "m", how: "도막으로 자르면", count: "도막" },
  { thing: "리본", unit: "m", how: "도막으로 자르면", count: "도막" },
  { thing: "끈", unit: "m", how: "도막으로 자르면", count: "도막" },
] as const;

/** 2-1-2 기본 — 두 양을 견주는 짝(단위가 같아야 배가 선다). */
const CMP_DRINKS = [
  { x: "주스", y: "우유" },
  { x: "물", y: "식혜" },
  { x: "우유", y: "주스" },
] as const;

/** 2-1-5 기본 — 무게 짝. */
const CMP_WEIGHTS = [
  { x: "감자", y: "양파" },
  { x: "쌀", y: "콩" },
  { x: "고구마", y: "당근" },
] as const;

// ── 2-1-1 분모가 같은 (분수)÷(분수) ──

/** 연산 — 식 그대로. 분자끼리 나누면 끝난다. */
function sameDenCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 4, 9);
  const [a, b] = twoCoprimeTops(rng, d);
  return make(
    unit,
    `다음 나눗셈의 몫을 구하시오.\n\n${expr(`\\frac{${a}}{${d}}\\div\\frac{${b}}{${d}}=\\square`)}`,
    expr(fmtFrac(a, b)),
    `분모가 같으면 분자끼리 나눕니다. ${expr(`\\frac{${a}}{${d}}\\div\\frac{${b}}{${d}}=${a}\\div${b}=${fmtFrac(a, b)}`)}`,
  );
}

/** 기본 — 문장 한 겹. 「…씩 자르면 몇 도막」 — 구성이 자연수 몫을 보장한다. */
function sameDenWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, FRAC_CUT);
  // a = k·b 이고 a·b 둘 다 d 와 서로소여야 발문 분수가 기약이다 — 훑어서 고른다.
  for (let t = 0; t < 200; t += 1) {
    const d = intBetween(rng, 5, 9);
    const b = intBetween(rng, 1, 3);
    const k = intBetween(rng, 2, 4);
    const a = k * b;
    if (a >= d || gcd(a, d) !== 1 || gcd(b, d) !== 1) continue;
    return make(
      unit,
      `${s.thing} ${expr(`\\frac{${a}}{${d}}`)} ${s.unit}${unitJosa(s.unit, "을", "를")} ${expr(`\\frac{${b}}{${d}}`)} ${s.unit}씩 ${s.how} 몇 ${s.count}이 됩니까?`,
      num(k),
      `분모가 같으므로 분자끼리 나눕니다. ${expr(`\\frac{${a}}{${d}}\\div\\frac{${b}}{${d}}=${a}\\div${b}=${k}`)}`,
    );
  }
  throw new Error("2-1-1 기본: 기약 조건을 만족하는 짝을 못 만들었습니다");
}

/** 응용 — 두 걸음. 쓰고 남은 양을 같은 분모 분수로 나눈다. */
function sameDenApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, FRAC_CUT);
  for (let t = 0; t < 200; t += 1) {
    const d = intBetween(rng, 7, 9);
    const b = intBetween(rng, 1, 2);
    const k = intBetween(rng, 2, 3);
    const u = intBetween(rng, 1, 2);
    const a = k * b + u;
    if (a >= d) continue;
    if (gcd(a, d) !== 1 || gcd(u, d) !== 1 || gcd(b, d) !== 1) continue;
    return make(
      unit,
      `${s.thing} ${expr(`\\frac{${a}}{${d}}`)} ${s.unit} 중에서 ${expr(`\\frac{${u}}{${d}}`)} ${s.unit}${unitJosa(s.unit, "을", "를")} 사용하고, ` +
        `남은 ${s.thing}${josa(s.thing, "을", "를")} ${expr(`\\frac{${b}}{${d}}`)} ${s.unit}씩 ${s.how} 몇 ${s.count}이 됩니까?`,
      num(k),
      `남은 ${s.thing}${josa(s.thing, "은", "는")} ${expr(`\\frac{${a}}{${d}}-\\frac{${u}}{${d}}=\\frac{${k * b}}{${d}}`)} 입니다. ` +
        `${expr(`\\frac{${k * b}}{${d}}\\div\\frac{${b}}{${d}}=${k * b}\\div${b}=${k}`)} 입니다.`,
    );
  }
  throw new Error("2-1-1 응용: 기약 조건을 만족하는 짝을 못 만들었습니다");
}

/** 심화 — 역산. 곱을 나눗셈으로 되돌린다 — 같은 분모 둘이 지면에 선다. */
function sameDenDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 4, 9);
  const [a, b] = twoCoprimeTops(rng, d);
  const [p, q] = divFrac(a, d, b, d);
  return make(
    unit,
    `어떤 수에 ${expr(`\\frac{${b}}{${d}}`)}${numJosa(b, "을", "를")} 곱했더니 ${expr(`\\frac{${a}}{${d}}`)}${numJosa(a, "이", "가")} 되었습니다. 어떤 수는 얼마입니까?`,
    expr(fmtFrac(p, q)),
    `곱셈을 나눗셈으로 되돌립니다. ${expr(`\\frac{${a}}{${d}}\\div\\frac{${b}}{${d}}=${a}\\div${b}=${fmtFrac(p, q)}`)} 입니다.`,
  );
}

// ── 2-1-2 분모가 다른 (분수)÷(분수) ──

/** 서로 다른 분모 둘과 기약 분자 — 발문 분수가 늘 기약·다른 분모다. */
function twoDiffFracs(rng: Rng): {
  n1: number;
  d1: number;
  n2: number;
  d2: number;
} {
  const d1 = intBetween(rng, 2, 7);
  let d2 = intBetween(rng, 3, 9);
  for (let t = 0; t < 20 && d2 === d1; t += 1) d2 = intBetween(rng, 3, 9);
  if (d2 === d1) d2 = d1 === 9 ? 8 : d1 + 1;
  // 나누는 수의 분자는 2 이상 — 1 이면 역수가 `\frac{d}{1}` 로 서서 지면에 분모 1 이 나온다
  // (표본 육안 실측: $\frac{3}{4}\times\frac{6}{1}$).
  return { n1: coprimeTop(rng, d1), d1, n2: coprimeTop(rng, d2, 2), d2 };
}

/** 연산 — 식 그대로. 통분하거나 곱셈으로 바꾸어 계산한다. */
function diffDenCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = twoDiffFracs(rng);
  const [p, q] = divFrac(f.n1, f.d1, f.n2, f.d2);
  return make(
    unit,
    `다음 나눗셈의 몫을 구하시오.\n\n${expr(`\\frac{${f.n1}}{${f.d1}}\\div\\frac{${f.n2}}{${f.d2}}=\\square`)}`,
    expr(fmtFrac(p, q)),
    `나누는 수의 분모와 분자를 바꾸어 곱합니다. ` +
      `${expr(`\\frac{${f.n1}}{${f.d1}}\\times\\frac{${f.d2}}{${f.n2}}=${fmtFrac(p, q)}`)}`,
  );
}

/** 기본 — 문장 한 겹. 「…의 몇 배」 — 나눗셈의 뜻을 문장에서 세운다. */
function diffDenWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const p = pick(rng, CMP_DRINKS);
  const f = twoDiffFracs(rng);
  const [pn, pd] = divFrac(f.n1, f.d1, f.n2, f.d2);
  return make(
    unit,
    `${p.x}${josa(p.x, "이", "가")} ${expr(`\\frac{${f.n1}}{${f.d1}}`)} L, ${p.y}${josa(p.y, "이", "가")} ${expr(`\\frac{${f.n2}}{${f.d2}}`)} L 있습니다. ` +
      `${p.x} 양은 ${p.y} 양의 몇 배입니까?`,
    expr(fmtFrac(pn, pd)),
    `${p.x} 양을 ${p.y} 양으로 나눕니다. ${expr(`\\frac{${f.n1}}{${f.d1}}\\div\\frac{${f.n2}}{${f.d2}}=\\frac{${f.n1}}{${f.d1}}\\times\\frac{${f.d2}}{${f.n2}}=${fmtFrac(pn, pd)}`)}`,
  );
}

/** 응용 — 결합. 직사각형의 넓이와 가로에서 세로를 구한다. */
function diffDenApply(unit: UnitSeed, rng: Rng): ElemProblem {
  for (let t = 0; t < 200; t += 1) {
    const wd = intBetween(rng, 2, 5);
    const wn = coprimeTop(rng, wd);
    const hd = intBetween(rng, 3, 7);
    const hn = coprimeTop(rng, hd);
    const [an, ad] = mulFrac(wn, wd, hn, hd);
    // 넓이가 진분수이고 가로와 분모가 달라야 「분모가 다른」 이 지면에 선다.
    if (an >= ad || ad === wd) continue;
    return make(
      unit,
      `넓이가 ${expr(`\\frac{${an}}{${ad}}`)} m²이고 가로가 ${expr(`\\frac{${wn}}{${wd}}`)} m인 직사각형이 있습니다. ` +
        `이 직사각형의 세로는 몇 m입니까?`,
      expr(fmtFrac(hn, hd)),
      `(세로)=(넓이)÷(가로)입니다. ${expr(`\\frac{${an}}{${ad}}\\div\\frac{${wn}}{${wd}}=\\frac{${an}}{${ad}}\\times\\frac{${wd}}{${wn}}=${fmtFrac(hn, hd)}`)}`,
    );
  }
  throw new Error("2-1-2 응용: 조건을 만족하는 짝을 못 만들었습니다");
}

/** 심화 — 역산. 나눈 몫에서 어떤 수를 되짚는다(몫과 나누는 수의 분모가 다르다). */
function diffDenDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  for (let t = 0; t < 200; t += 1) {
    const dd = intBetween(rng, 2, 6);
    const dn = coprimeTop(rng, dd);
    const qd = intBetween(rng, 3, 8);
    if (qd === dd) continue;
    const qn = coprimeTop(rng, qd);
    const [xn, xd] = mulFrac(qn, qd, dn, dd);
    if (xn >= xd) continue; // 어떤 수가 진분수로 남아야 대분수 표기가 안 끼어든다
    return make(
      unit,
      `어떤 수를 ${expr(`\\frac{${dn}}{${dd}}`)}${numRo(dn)} 나누었더니 ${expr(`\\frac{${qn}}{${qd}}`)}${numJosa(qn, "이", "가")} 되었습니다. 어떤 수는 얼마입니까?`,
      expr(fmtFrac(xn, xd)),
      `나눗셈을 곱셈으로 되돌립니다. ${expr(`\\frac{${qn}}{${qd}}\\times\\frac{${dn}}{${dd}}=${fmtFrac(xn, xd)}`)} 입니다.`,
    );
  }
  throw new Error("2-1-2 심화하: 조건을 만족하는 짝을 못 만들었습니다");
}

// ── 2-1-3 (자연수)÷(분수) ──

/** 연산 — 식 그대로. */
function natFracCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 8);
  const d = intBetween(rng, 3, 9);
  const n = coprimeTop(rng, d, 2);
  const [p, q] = divFrac(k, 1, n, d);
  return make(
    unit,
    `다음 나눗셈의 몫을 구하시오.\n\n${expr(`${k}\\div\\frac{${n}}{${d}}=\\square`)}`,
    expr(fmtFrac(p, q)),
    `나누는 수의 분모와 분자를 바꾸어 곱합니다. ${expr(`${k}\\times\\frac{${d}}{${n}}=${fmtFrac(p, q)}`)}`,
  );
}

/** 기본 — 문장 한 겹. 「…씩 자르면 몇 도막」 — 구성이 자연수 몫을 보장한다. */
function natFracWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, FRAC_CUT);
  const d = intBetween(rng, 3, 9);
  const n = coprimeTop(rng, d, 2);
  const m = intBetween(rng, 1, 2);
  const k = m * n;
  return make(
    unit,
    `${s.thing} ${num(k)} ${s.unit}${unitJosa(s.unit, "을", "를")} ${expr(`\\frac{${n}}{${d}}`)} ${s.unit}씩 ${s.how} 몇 ${s.count}이 됩니까?`,
    num(m * d),
    `${expr(`${k}\\div\\frac{${n}}{${d}}=${k}\\times\\frac{${d}}{${n}}=${m * d}`)} 이므로 ${num(m * d)}${s.count}입니다.`,
  );
}

/** 응용 — 두 걸음. 쓰고 남은 자연수 양을 분수로 나눈다. */
function natFracApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 3, 9);
  const n = coprimeTop(rng, d, 2);
  const m = intBetween(rng, 1, 2);
  const left = m * n;
  const u = intBetween(rng, 1, 3);
  return make(
    unit,
    `설탕 ${num(left + u)} kg 중에서 ${num(u)} kg을 사용하고, 남은 설탕을 ${expr(`\\frac{${n}}{${d}}`)} kg씩 봉지에 나누어 담으면 ` +
      `몇 봉지가 됩니까?`,
    num(m * d),
    `남은 설탕은 ${expr(`${left + u}-${u}=${left}`)} 이므로 ${num(left)} kg입니다. ` +
      `${expr(`${left}\\div\\frac{${n}}{${d}}=${left}\\times\\frac{${d}}{${n}}=${m * d}`)} 이므로 ${num(m * d)}봉지입니다.`,
  );
}

/** 심화 — 역산. ⓐ 나눈 몫에서 어떤 수를 되짚는다. ⓑ `\square` 가 나누어지는 수다. */
function natFracDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 3, 9);
  const n = coprimeTop(rng, d, 2);
  const m = intBetween(rng, 1, 3);
  const q = m * d;
  const x = m * n;
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `어떤 수를 ${expr(`\\frac{${n}}{${d}}`)}${numRo(n)} 나누었더니 ${num(q)}${numJosa(q, "이", "가")} 되었습니다. 어떤 수는 얼마입니까?`,
      num(x),
      `나눗셈을 곱셈으로 되돌립니다. ${expr(`${q}\\times\\frac{${n}}{${d}}=${x}`)} 입니다.`,
    );
  }
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 구하시오.\n\n${expr(`\\square\\div\\frac{${n}}{${d}}=${q}`)}`,
    num(x),
    `나눗셈을 곱셈으로 되돌립니다. ${expr(`${q}\\times\\frac{${n}}{${d}}=${x}`)} 이므로 ${expr("\\square")} 는 ${num(x)}입니다.`,
  );
}

// ── 2-1-4 (분수)÷(분수)를 (분수)×(분수)로 나타내기 ──

/** 연산 — 식 변환만. 답이 곱셈식이다(값이 아니다). */
function flipCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = twoDiffFracs(rng);
  return make(
    unit,
    `${expr(`\\frac{${f.n1}}{${f.d1}}\\div\\frac{${f.n2}}{${f.d2}}`)}${numJosa(f.n2, "을", "를")} 곱셈식으로 나타내시오.`,
    expr(`\\frac{${f.n1}}{${f.d1}}\\times\\frac{${f.d2}}{${f.n2}}`),
    `나누는 수 ${expr(`\\frac{${f.n2}}{${f.d2}}`)} 의 분모와 분자를 바꾼 수를 곱합니다.`,
  );
}

/** 기본 — 변환한 뒤 계산까지. */
function flipWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = twoDiffFracs(rng);
  const [p, q] = divFrac(f.n1, f.d1, f.n2, f.d2);
  return make(
    unit,
    `${expr(`\\frac{${f.n1}}{${f.d1}}\\div\\frac{${f.n2}}{${f.d2}}`)}${numJosa(f.n2, "을", "를")} 곱셈식으로 나타내어 계산하시오.`,
    expr(fmtFrac(p, q)),
    `${expr(`\\frac{${f.n1}}{${f.d1}}\\div\\frac{${f.n2}}{${f.d2}}=\\frac{${f.n1}}{${f.d1}}\\times\\frac{${f.d2}}{${f.n2}}=${fmtFrac(p, q)}`)}`,
  );
}

/**
 * 응용 — 문장 상황에서 나눗셈을 세우고 곱셈으로 바꾸어 계산한다.
 *
 * ⚠️ 「$1$ m²당」류 단위량 문형은 못 쓴다 — 발문의 $1$ 이 «(분수)÷(분수)» 종류 규칙
 * (요구 밖 자연수 금지)에 걸린다(실측 40/40). 「한 개」처럼 수사 없는 문장으로 세운다.
 */
function flipApply(unit: UnitSeed, rng: Rng): ElemProblem {
  for (let t = 0; t < 200; t += 1) {
    const cd = intBetween(rng, 5, 9);
    const cn = coprimeTop(rng, cd);
    const k = intBetween(rng, 2, 4);
    const an = k * cn;
    if (an >= cd || gcd(an, cd) !== 1) continue; // 전체 양도 기약 진분수로 서야 한다
    return make(
      unit,
      `팔찌 한 개를 만드는 데 털실 ${expr(`\\frac{${cn}}{${cd}}`)} m가 필요합니다. ` +
        `털실 ${expr(`\\frac{${an}}{${cd}}`)} m로는 팔찌를 몇 개 만들 수 있습니까?`,
      num(k),
      `전체 털실을 한 개 몫으로 나눕니다. ` +
        `${expr(`\\frac{${an}}{${cd}}\\div\\frac{${cn}}{${cd}}=\\frac{${an}}{${cd}}\\times\\frac{${cd}}{${cn}}=${k}`)} 이므로 ${num(k)}개입니다.`,
    );
  }
  throw new Error("2-1-4 응용: 조건을 만족하는 짝을 못 만들었습니다");
}

/** 심화 — 역산. ⓐ 「…를 곱하는 것」에서 어떤 분수로 나누는지 되짚는다. ⓑ 곱셈식에서 나눗셈식을 쓴다. */
function flipDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = twoDiffFracs(rng);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `어떤 분수로 나누는 것은 ${expr(`\\frac{${f.d2}}{${f.n2}}`)}${numJosa(f.d2, "을", "를")} 곱하는 것과 같습니다. 어떤 분수는 무엇입니까?`,
      expr(`\\frac{${f.n2}}{${f.d2}}`),
      `나누는 수의 분모와 분자를 바꾼 수를 곱하는 것이므로, 어떤 분수는 그것을 되돌린 ${expr(`\\frac{${f.n2}}{${f.d2}}`)} 입니다.`,
    );
  }
  return make(
    unit,
    // ⚠️ 지면의 마지막 수식은 **뒤집힌** `\frac{d2}{n2}` 라 분자가 `d2` 다 — 조사는 그것이
    //    정한다. `n2` 로 골라 「$\frac{3}{5}\times\frac{3}{2}$가」가 나갔다(R-조사가 잡았다).
    `곱셈식이 ${expr(`\\frac{${f.n1}}{${f.d1}}\\times\\frac{${f.d2}}{${f.n2}}`)}${numJosa(f.d2, "이", "가")} 되는 나눗셈식을 쓰시오.`,
    expr(`\\frac{${f.n1}}{${f.d1}}\\div\\frac{${f.n2}}{${f.d2}}`),
    `곱한 수 ${expr(`\\frac{${f.d2}}{${f.n2}}`)} 의 분모와 분자를 되돌리면 나누는 수 ${expr(`\\frac{${f.n2}}{${f.d2}}`)} 입니다.`,
  );
}

// ── 2-1-5 (가분수)÷(분수), (대분수)÷(분수) ──

/** 연산 — 식 그대로. ⓐ 가분수 ⓑ 대분수 — 소단원 이름이 내건 둘을 씨앗이 가른다. */
function mixedFracCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const d1 = intBetween(rng, 2, 6);
  const t1 = coprimeTop(rng, d1);
  const w = intBetween(rng, 1, 3);
  const imp = w * d1 + t1;
  const d2 = intBetween(rng, 3, 8);
  const n2 = coprimeTop(rng, d2, 2);
  const [p, q] = divFrac(imp, d1, n2, d2);
  const flip = expr(
    `\\frac{${imp}}{${d1}}\\times\\frac{${d2}}{${n2}}=${fmtFrac(p, q)}`,
  );
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `다음 나눗셈의 몫을 구하시오.\n\n${expr(`\\frac{${imp}}{${d1}}\\div\\frac{${n2}}{${d2}}=\\square`)}`,
      expr(fmtFrac(p, q)),
      `가분수는 그대로 두고 나누는 수의 분모와 분자를 바꾸어 곱합니다. ${flip}`,
    );
  }
  return make(
    unit,
    `다음 나눗셈의 몫을 구하시오.\n\n${expr(`${w}\\frac{${t1}}{${d1}}\\div\\frac{${n2}}{${d2}}=\\square`)}`,
    expr(fmtFrac(p, q)),
    `대분수를 가분수로 고칩니다. ${expr(`${w}\\frac{${t1}}{${d1}}=\\frac{${imp}}{${d1}}`)} 이므로 ` +
      `나누는 수의 분모와 분자를 바꾸어 곱합니다. ${flip}`,
  );
}

/** 기본 — 문장 한 겹. 대분수 양을 분수 양으로 견준다(몇 배). */
function mixedFracWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const p = pick(rng, CMP_WEIGHTS);
  const d1 = intBetween(rng, 2, 6);
  const t1 = coprimeTop(rng, d1);
  const w = intBetween(rng, 1, 3);
  const imp = w * d1 + t1;
  const d2 = intBetween(rng, 3, 8);
  const n2 = coprimeTop(rng, d2, 2);
  const [pn, pd] = divFrac(imp, d1, n2, d2);
  return make(
    unit,
    `${p.x} ${expr(`${w}\\frac{${t1}}{${d1}}`)} kg과 ${p.y} ${expr(`\\frac{${n2}}{${d2}}`)} kg이 있습니다. ` +
      `${p.x} 무게는 ${p.y} 무게의 몇 배입니까?`,
    expr(fmtFrac(pn, pd)),
    `대분수를 가분수로 고쳐 나눕니다. ${expr(`\\frac{${imp}}{${d1}}\\times\\frac{${d2}}{${n2}}=${fmtFrac(pn, pd)}`)}`,
  );
}

/** 응용 — 결합. 평행사변형의 넓이와 밑변에서 높이를 구한다. */
function mixedFracApply(unit: UnitSeed, rng: Rng): ElemProblem {
  for (let t = 0; t < 200; t += 1) {
    // ⚠️ coprimeTop(bd, 2) 는 bd=2 에서 풀이 비어 폴백 2 를 낸다 — \frac{2}{2} 가
    //    지면에 섰다(시험 실측). 분자 하한을 1 로 두면 늘 안전하다.
    const bd = intBetween(rng, 2, 6);
    const bn = coprimeTop(rng, bd);
    const hd = intBetween(rng, 2, 6);
    const hn = coprimeTop(rng, hd, hd + 1, hd + 5); // 높이는 가분수 — 넓이가 1을 넘게
    const [an, ad] = mulFrac(bn, bd, hn, hd);
    if (an <= ad || ad === 1) continue; // 넓이가 **대분수**로 서야 한다 — 정수로 접히면 안 된다
    const [rn, rd] = divFrac(an, ad, bn, bd); // 기약으로 접힌 높이 — 값은 hn/hd 와 같다
    return make(
      unit,
      `넓이가 ${expr(fmtFrac(an, ad))} m²이고 밑변의 길이가 ${expr(`\\frac{${bn}}{${bd}}`)} m인 평행사변형이 있습니다. ` +
        `이 평행사변형의 높이는 몇 m입니까?`,
      expr(fmtFrac(rn, rd)),
      `(높이)=(넓이)÷(밑변의 길이)입니다. ${expr(`${fmtFrac(an, ad)}\\div\\frac{${bn}}{${bd}}=${fmtFrac(rn, rd)}`)}`,
    );
  }
  throw new Error("2-1-5 응용: 조건을 만족하는 짝을 못 만들었습니다");
}

/** 심화 — 역산. 곱을 나눗셈으로 되돌린다 — 결과가 대분수다. */
function mixedFracDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  for (let t = 0; t < 200; t += 1) {
    const d2 = intBetween(rng, 3, 8);
    const n2 = coprimeTop(rng, d2, 2);
    const xd = intBetween(rng, 2, 6);
    const xn = coprimeTop(rng, xd, xd + 1, xd + 6); // 어떤 수는 가분수
    const [wn, wd] = mulFrac(xn, xd, n2, d2);
    if (wn <= wd || wd === 1) continue; // 곱한 결과가 **대분수**로 서야 발문에 대분수가 남는다
    return make(
      unit,
      `어떤 수에 ${expr(`\\frac{${n2}}{${d2}}`)}${numJosa(n2, "을", "를")} 곱했더니 ${expr(fmtFrac(wn, wd))}${numJosa(lastSpokenNumber(fmtFrac(wn, wd)), "이", "가")} 되었습니다. 어떤 수는 얼마입니까?`,
      expr(fmtFrac(xn, xd)),
      `곱셈을 나눗셈으로 되돌립니다. ${expr(`${fmtFrac(wn, wd)}\\div\\frac{${n2}}{${d2}}=${fmtFrac(wn, wd)}\\times\\frac{${d2}}{${n2}}=${fmtFrac(xn, xd)}`)} 입니다.`,
    );
  }
  throw new Error("2-1-5 심화하: 조건을 만족하는 짝을 못 만들었습니다");
}

// ── 난이도 갈래 (D-72 확대 8차분) — 초6 `2-2 소수의 나눗셈` (5소단원 · 20갈래) ────
//
// ⑴ 수는 전량 **×10/×100 정수**로 들고 다니고 지면에 적을 때만 `fromCents`·`decStr` —
//    부동소수점이 지면에 새지 않는다. 꼬리 0(`7.0`)은 시험이 전 필드에서 막는다.
// ⑵ 2-2-5 «남는 양»의 초등 규약: **몫은 자연수, 나머지는 나누어지는 수와 같은 소수 자리.**
//    나머지를 몫의 자리로 적으면 뜻이 달라진다 — 시험이 자리까지 대조한다.
// ⑶ 2-2-4 는 이 트랜치에서 내가 판정기에 얹은 검사(몫이 그 자리에서 딱 떨어지면 위반)에
//    **스스로 걸리지 않게** 구성이 보장한다. 문장형 갈래는 해설에 식을 남겨 폴백이 읽는다.
// ⑷ 2-1(분수)과 낱말·종류를 가른다 — 이 대단원에 분수가 나오면 시험이 빨개진다.
//
// 「자릿수가 같은/다른」 조건은 판정기가 **식**으로만 재던 축이라 문장형 갈래가 전량
// 위반이었다. 발문의 소수들에서 직접 잴 수 있으므로 그쪽에 loose 를 얹었다(같은 커밋).

/** 소수 나눗셈 소재 — 담기·자르기. 2-1 의 「도막」과 겹치지 않게 그릇·모양을 쓴다. */
const DEC_POUR = [
  { thing: "간장", unit: "L", into: "병" },
  { thing: "참기름", unit: "L", into: "병" },
  { thing: "꿀", unit: "kg", into: "통" },
] as const;

/** 2-2-3 소재 — 자연수 양을 소수씩 나눈다. */
const DEC_PACK = [
  { thing: "밀가루", unit: "kg", into: "봉지" },
  { thing: "소금", unit: "kg", into: "봉지" },
  { thing: "보리쌀", unit: "kg", into: "자루" },
] as const;

/** 2-2-4 반올림 갈래의 소재 — 「몇 배인지 반올림하여」. */
/**
 * 2-2-4 응용의 두 물건.
 *
 * `ordered` 는 **낱말이 값의 순서를 주장하는가**다 — 「긴 막대·짧은 막대」는 앞이 더
 * 길다고 말하므로 `a > b` 일 때만 쓸 수 있다. 색으로만 가르는 짝은 순서를 주장하지
 * 않으므로 「몇 배」가 1보다 작아도 옳다(0.9배는 초6 에 맞는 값이다).
 */
const ROUND_PAIRS = [
  { x: "노란 끈", y: "파란 끈", ordered: false },
  { x: "빨간 테이프", y: "초록 테이프", ordered: false },
  { x: "긴 막대", y: "짧은 막대", ordered: true },
] as const;

// ── 2-2-1 자릿수가 같은 (소수)÷(소수) ──

/** 연산 — 식 그대로. 소수점을 함께 옮겨 자연수 나눗셈으로 만든다. */
function sameDpCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, SAME_DIGIT);
  const a = decStr(c.a, 1);
  const b = decStr(c.b, 1);
  return make(
    unit,
    `다음 나눗셈의 몫을 구하시오.\n\n${expr(`${a}\\div${b}=\\square`)}`,
    num(c.q),
    `두 수의 소수점을 오른쪽으로 한 자리씩 옮기면 ${expr(`${c.a}\\div${c.b}=${c.q}`)} 이므로 몫은 ${num(c.q)}입니다.`,
  );
}

/** 기본 — 문장 한 겹. 소수 두 개가 지면에 서서 「자릿수가 같은」이 판정기에도 보인다. */
function sameDpWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, DEC_POUR);
  const c = pick(
    rng,
    SAME_DIGIT.filter((x) => x.a <= 300 && x.q <= 9),
  );
  const a = decStr(c.a, 1);
  const b = decStr(c.b, 1);
  return make(
    unit,
    `${s.thing} ${unitNum(a, s.unit)}${unitJosa(s.unit, "을", "를")} 한 ${s.into}에 ${unitNum(b, s.unit)}씩 나누어 담으려고 합니다. ` +
      `${s.into}${josa(s.into, "은", "는")} 몇 개 필요합니까?`,
    num(c.q),
    `전체를 한 ${s.into}에 담는 양으로 나눕니다. ${expr(`${a}\\div${b}=${c.q}`)} 이므로 ${num(c.q)}개입니다.`,
  );
}

/** 응용 — 두 걸음. 쓰고 남은 양을 나눈다(중간값이 소수 한 자리로 남게 구성이 보장). */
function sameDpApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, DEC_POUR);
  const c = pick(
    rng,
    SAME_DIGIT.filter((x) => x.a <= 300 && x.q <= 9),
  );
  // ⚠️ 쓴 양을 **자연수**로 두면 «(소수)÷(소수)» 종류 규칙(요구 밖 자연수 금지)에 걸린다
  //    — 판정기가 40/40 으로 잡았다. 쓴 양도 소수 한 자리로 두면 세 수의 자릿수가 모두
  //    같아 「자릿수가 같은」까지 지면에서 선다(규칙이 옳고 내 문형이 틀렸던 자리).
  // 합계의 끝자리가 0 이면 지면에 «17.0» 이 나간다 — 구성이 막는다(시험이 잡았다).
  const u10 = pick(
    rng,
    Array.from({ length: 39 }, (_, i) => i + 11).filter(
      (v) => v % 10 !== 0 && (c.a + v) % 10 !== 0,
    ),
  );
  const total = c.a + u10;
  const a = decStr(c.a, 1);
  const b = decStr(c.b, 1);
  return make(
    unit,
    `${s.thing} ${unitNum(decStr(total, 1), s.unit)} 중에서 ${unitNum(decStr(u10, 1), s.unit)}${unitJosa(s.unit, "을", "를")} 쓰고, ` +
      `남은 ${s.thing}${josa(s.thing, "을", "를")} 한 ${s.into}에 ${unitNum(b, s.unit)}씩 나누어 담았습니다. ` +
      `${s.into}${josa(s.into, "은", "는")} 몇 개 필요합니까?`,
    num(c.q),
    `남은 ${s.thing}${josa(s.thing, "은", "는")} ${expr(`${decStr(total, 1)}-${decStr(u10, 1)}=${a}`)} 입니다. ` +
      `${expr(`${a}\\div${b}=${c.q}`)} 이므로 ${num(c.q)}개입니다.`,
  );
}

/** 심화 — 역산. 곱을 나눗셈으로 되돌린다(발문에 소수 둘, 자릿수도 같다). */
function sameDpDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(
    rng,
    SAME_DIGIT.filter((x) => x.a <= 500),
  );
  const a = decStr(c.a, 1);
  const b = decStr(c.b, 1);
  return make(
    unit,
    // ⚠️ `unitNum(b, "")` 은 `\mathrm{}` 빈 단위를 지면에 내보낸다(시험이 잡았다) — 맨 수는 `num`.
    `어떤 수에 ${num(b)}${centsJosa(c.b, "을", "를")} 곱했더니 ${num(a)}${centsJosa(c.a, "이", "가")} 되었습니다. ` +
      `어떤 수는 얼마입니까?`,
    num(c.q),
    `곱셈을 나눗셈으로 되돌립니다. ${expr(`${a}\\div${b}=${c.q}`)} 입니다.`,
  );
}

// ── 2-2-2 자릿수가 다른 (소수)÷(소수) ──

/** 연산 — 식 그대로. 나누는 수가 자연수가 되도록 함께 옮긴다. */
function diffDpCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DIFF_DIGIT);
  const a = decStr(c.a, 2);
  const b = decStr(c.b, 1);
  const q = fromCents(c.q);
  return make(
    unit,
    `다음 나눗셈의 몫을 구하시오.\n\n${expr(`${a}\\div${b}=\\square`)}`,
    expr(q),
    `나누는 수가 자연수가 되도록 두 수의 소수점을 함께 한 자리씩 옮겨 ` +
      `${expr(`${decStr(c.a, 1)}\\div${c.b}`)}${numRo(c.b)} 계산합니다. ${expr(`${a}\\div${b}=${q}`)}`,
  );
}

/** 기본 — 문장 한 겹. 넓이를 가로로 나눠 세로를 구한다(소수 자릿수가 다르다). */
function diffDpWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(
    rng,
    DIFF_DIGIT.filter((x) => x.a <= 2000 && x.q % 10 === 0),
  );
  const a = decStr(c.a, 2);
  const b = decStr(c.b, 1);
  const q = fromCents(c.q);
  return make(
    unit,
    // ⚠️ `unitNum(a, "m")}²` 는 지면에 `$4.83\,\mathrm{m}$²` 로 나가 위첨자가 수식 밖에 선다
    //    (표본 육안이 잡았다). 넓이 단위는 다른 대단원처럼 **글자로** 적는다.
    `넓이가 ${num(a)} m²이고 가로가 ${unitNum(b, "m")} 인 직사각형 모양 화단이 있습니다. ` +
      `이 화단의 세로는 몇 m입니까?`,
    expr(q),
    `(세로)=(넓이)÷(가로)입니다. ${expr(`${a}\\div${b}=${q}`)}`,
  );
}

/**
 * 응용 — 두 걸음. 전체 넓이에서 한 부분을 빼고, 남은 직사각형의 세로를 구한다.
 *
 * ⚠️ 처음에는 「…씩 나누어 담으면 몇 개」로 썼는데 **몫이 소수라 「2.3개」가 나왔다**
 * (표본 육안이 잡았다 — 값 검산은 통과한다). 이 소단원의 몫은 소수이므로 **개수를 묻는
 * 문형 자체를 쓸 수 없다.** `DIFF_DIGIT` 에는 몫이 자연수인 짝이 아예 없다(`a%10!==0`
 * 조건과 상충). 그래서 세로처럼 **소수로 답하는 것이 자연스러운 양**을 묻는다.
 */
function diffDpApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(
    rng,
    DIFF_DIGIT.filter((x) => x.a <= 1500 && x.q % 10 === 0),
  );
  // 쓴 양도 소수로 — 위 2-2-1 응용과 같은 까닭(요구 밖 자연수 금지). 여기서는 두 자리로
  // 두어 나누는 수(한 자리)와 **자릿수가 다른** 것이 발문에 그대로 선다.
  const u100 = pick(
    rng,
    Array.from({ length: 289 }, (_, i) => i + 111).filter(
      (v) => v % 10 !== 0 && (c.a + v) % 10 !== 0,
    ),
  );
  const total = c.a + u100;
  const a = decStr(c.a, 2);
  const b = decStr(c.b, 1);
  const q = fromCents(c.q);
  return make(
    unit,
    `넓이가 ${num(decStr(total, 2))} m²인 밭 중에서 ${num(decStr(u100, 2))} m²에 창고를 세우고, ` +
      `남은 부분은 가로가 ${unitNum(b, "m")} 인 직사각형 모양으로 두었습니다. ` +
      `남은 부분의 세로는 몇 m입니까?`,
    expr(q),
    `남은 부분의 넓이는 ${expr(`${decStr(total, 2)}-${decStr(u100, 2)}=${a}`)} 입니다. ` +
      `(세로)=(넓이)÷(가로)이므로 ${expr(`${a}\\div${b}=${q}`)} 입니다.`,
  );
}

/**
 * 심화 — 역산. `\square` 가 **나누는 수**다.
 *
 * ⚠️ 처음에는 `\square` 를 나누어지는 수로 두었는데(`\square\div1.5=5.7`), 그러면
 * 지면에 보이는 두 소수의 자릿수가 **같아져** 「자릿수가 다른」 소단원이 아니게 된다
 * (판정기가 40/40 으로 잡았다 — 답 8.55 는 두 자리지만 학생은 그것을 못 본다).
 * 나누는 수를 묻게 뒤집으면 `8.55\div\square=5.7` 이라 자릿수 차이가 발문에 선다.
 */
function diffDpDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(
    rng,
    DIFF_DIGIT.filter((x) => x.a <= 2000 && x.q % 10 === 0),
  );
  const a = decStr(c.a, 2);
  const b = decStr(c.b, 1);
  const q = fromCents(c.q);
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 구하시오.\n\n${expr(`${a}\\div\\square=${q}`)}`,
    expr(b),
    `나누어지는 수를 몫으로 나누면 나누는 수가 나옵니다. ` +
      `${expr(`${a}\\div${q}=${b}`)} 이므로 ${expr("\\square")} 는 ${num(b)}입니다.`,
  );
}

// ── 2-2-3 (자연수)÷(소수) ──

/** 연산 — 식 그대로. */
function natDpCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, NAT_BY_DEC);
  const b = decStr(c.b, 1);
  return make(
    unit,
    `다음 나눗셈의 몫을 구하시오.\n\n${expr(`${c.a}\\div${b}=\\square`)}`,
    num(c.q),
    `두 수의 소수점을 오른쪽으로 한 자리씩 옮기면 ${expr(`${c.a * 10}\\div${c.b}=${c.q}`)} 이므로 몫은 ${num(c.q)}입니다.`,
  );
}

/** 기본 — 문장 한 겹. 자연수 양을 소수씩 나눈다. */
function natDpWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, DEC_PACK);
  const c = pick(
    rng,
    NAT_BY_DEC.filter((x) => x.a <= 60 && x.q <= 12),
  );
  const b = decStr(c.b, 1);
  return make(
    unit,
    `${s.thing} ${unitNum(c.a, s.unit)}${unitJosa(s.unit, "을", "를")} 한 ${s.into}에 ${unitNum(b, s.unit)}씩 나누어 담으려고 합니다. ` +
      `${s.into}${josa(s.into, "은", "는")} 몇 개 필요합니까?`,
    num(c.q),
    `전체를 한 ${s.into}에 담는 양으로 나눕니다. ${expr(`${c.a}\\div${b}=${c.q}`)} 이므로 ${num(c.q)}개입니다.`,
  );
}

/** 응용 — 두 걸음. 쓰고 남은 자연수 양을 소수로 나눈다. */
function natDpApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, DEC_PACK);
  const c = pick(
    rng,
    NAT_BY_DEC.filter((x) => x.a <= 40 && x.q <= 12),
  );
  const u = intBetween(rng, 1, 5);
  const b = decStr(c.b, 1);
  return make(
    unit,
    `${s.thing} ${unitNum(c.a + u, s.unit)}${unitJosa(s.unit, "을", "를")} 사서 ${unitNum(u, s.unit)}${unitJosa(s.unit, "을", "를")} 쓰고, ` +
      `남은 ${s.thing}${josa(s.thing, "을", "를")} 한 ${s.into}에 ${unitNum(b, s.unit)}씩 나누어 담았습니다. ` +
      `${s.into}${josa(s.into, "은", "는")} 몇 개 필요합니까?`,
    num(c.q),
    `남은 ${s.thing}${josa(s.thing, "은", "는")} ${expr(`${c.a + u}-${u}=${c.a}`)} 입니다. ` +
      `${expr(`${c.a}\\div${b}=${c.q}`)} 이므로 ${num(c.q)}개입니다.`,
  );
}

/**
 * 심화 — 역산. `\square` 가 **나누어지는 자연수**다.
 *
 * ⚠️ 처음에는 나누는 수를 물었는데(`17\div\square=10`), 그러면 지면에 소수가 **하나도**
 * 없어 「(자연수)÷(소수)」가 사라진다(표본 육안이 잡았다 — 판정기는 □ 를 와일드카드로
 * 세어 통과시킨다). 2-2-2 심화와 **반대 방향**의 같은 결함이다:
 * 조건이 되는 종류가 □ 뒤에 숨으면 학생은 그 성질을 못 본다.
 */
function natDpDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, NAT_BY_DEC);
  const b = decStr(c.b, 1);
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 구하시오.\n\n${expr(`\\square\\div${b}=${c.q}`)}`,
    num(c.a),
    `나눗셈을 곱셈으로 되돌립니다. ${expr(`${c.q}\\times${b}=${c.a}`)} 이므로 ` +
      `${expr("\\square")} 는 ${num(c.a)}입니다.`,
  );
}

// ── 2-2-4 몫을 반올림하여 나타내기 ──

/**
 * 반올림 재료 — `place` 자리까지 나타낼 때 **그 자리에서 딱 떨어지지 않는** 짝.
 *
 * 판정기(이 커밋에서 내가 얹은 「몫을 반올림하여」 검사)가 «딱 떨어지면 위반»으로 보므로
 * 구성이 그 조건을 보장한다 — 표준 `decDiv62` 의 `usable()` 과 같은 뜻을 풀로 만든 것이다.
 * `shown` 은 해설에 적을 «한 자리 더» 값(×10^(place+1) 내림), `cut` 은 반올림한 값.
 */
function roundCase(
  rng: Rng,
  place: number,
): { a: number; b: number; shown: number; cut: number } {
  const pool: { a: number; b: number; shown: number; cut: number }[] = [];
  for (const b of ROUND_DIVISORS) {
    for (let a = 11; a <= 99; a += 1) {
      const scale = a * 10 ** place;
      const shown = Math.floor((a * 10 ** (place + 1)) / b);
      const cut = Math.floor(scale / b) + ((scale % b) * 2 >= b ? 1 : 0);
      // ㉠ 딱 떨어지면 반올림이 뜻이 없다 ㉡ 보일 자리에서 끝나도 `\ldots` 가 거짓말이 된다
      // ㉢·㉣ 꼬리 0 은 초등 지면에 안 쓴다
      if (a % b === 0) continue;
      if ((a * 10 ** (place + 1)) % b === 0) continue;
      if (shown % 10 === 0 || cut % 10 === 0) continue;
      pool.push({ a, b, shown, cut });
    }
  }
  return pick(rng, pool);
}

/** 연산 — 식이 주어진다. 반올림 절차 한 번. */
function roundCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, [1, 2] as const);
  const c = roundCase(rng, place);
  const placeName = place === 1 ? "첫" : "둘";
  const nextName = place === 1 ? "둘" : "셋";
  return make(
    unit,
    `다음 나눗셈의 몫을 반올림하여 소수 ${placeName}째 자리까지 나타내시오.\n\n${expr(`${c.a}\\div${c.b}`)}`,
    expr(decStr(c.cut, place)),
    `몫은 ${expr(`${decStr(c.shown, place + 1)}\\ldots`)} 입니다. 소수 ${nextName}째 자리에서 반올림하면 ` +
      `${expr(decStr(c.cut, place))} 입니다.`,
  );
}

/** 기본 — 문장 한 겹. 나눗셈을 세운 뒤 반올림한다(해설에 식이 남아 판정기가 읽는다). */
function roundWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, DEC_PACK);
  const place = pick(rng, [1, 2] as const);
  const c = roundCase(rng, place);
  const placeName = place === 1 ? "첫" : "둘";
  const nextName = place === 1 ? "둘" : "셋";
  return make(
    unit,
    `${s.thing} ${unitNum(c.a, s.unit)}${unitJosa(s.unit, "을", "를")} ${num(c.b)}개의 ${s.into}에 똑같이 나누어 담으려고 합니다. ` +
      // 단위는 소재에서 가져온다 — `kg` 를 박아 두면 L 소재가 하나 들어오는 날 조용히 틀린다.
      `한 ${s.into}에 담기는 ${s.thing}${josa(s.thing, "은", "는")} 몇 ${s.unit}인지 반올림하여 소수 ${placeName}째 자리까지 나타내시오.`,
    expr(decStr(c.cut, place)),
    `전체를 ${s.into} 수로 나눕니다. ${expr(`${c.a}\\div${c.b}`)} 의 몫은 ${expr(`${decStr(c.shown, place + 1)}\\ldots`)} 이므로 ` +
      `소수 ${nextName}째 자리에서 반올림하면 ${expr(decStr(c.cut, place))} 입니다.`,
  );
}

/**
 * 응용 — 두 걸음. 두 길이의 «몇 배»를 구해 반올림한다(다른 개념 결합).
 *
 * ⚠️ **소재를 값보다 먼저 뽑으면 낱말이 거짓말을 한다.** 처음에는 그렇게 짜서
 * 「긴 막대가 $11$ cm, 짧은 막대가 $13$ cm」가 나왔다(씨앗 0~1999 중 7건 · 0.35%).
 * 값·판정기·시험·변이가 **전부 통과**하는 부류다 — 값은 옳고 낱말만 틀리기 때문이다.
 * 그래서 **값을 정한 뒤에** 소재를 고르고, 순서를 주장하는 짝은 `a > b` 일 때만 쓴다.
 * (걸러 내는 쪽 — `a > b` 인 짝만 만들기 — 은 「몇 배가 1보다 작은」 문항을 통째로
 *  없애므로 안 쓴다. 그 값 자체는 옳다.)
 */
function roundApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, [1, 2] as const);
  const c = roundCase(rng, place);
  const p = pick(
    rng,
    ROUND_PAIRS.filter((pair) => !pair.ordered || c.a > c.b),
  );
  const placeName = place === 1 ? "첫" : "둘";
  const nextName = place === 1 ? "둘" : "셋";
  return make(
    unit,
    `${p.x}${josa(p.x, "이", "가")} ${unitNum(c.a, "cm")}, ${p.y}${josa(p.y, "이", "가")} ${unitNum(c.b, "cm")} 입니다. ` +
      `${p.x} 길이는 ${p.y} 길이의 몇 배인지 반올림하여 소수 ${placeName}째 자리까지 나타내시오.`,
    expr(decStr(c.cut, place)),
    `${p.x} 길이를 ${p.y} 길이로 나눕니다. ${expr(`${c.a}\\div${c.b}`)} 의 몫은 ` +
      `${expr(`${decStr(c.shown, place + 1)}\\ldots`)} 이므로 소수 ${nextName}째 자리에서 반올림하면 ` +
      `${expr(decStr(c.cut, place))} 입니다.`,
  );
}

/** 심화 — 두 자리로 각각 반올림해 견준다(같은 몫을 다른 자리로 보는 눈). */
function roundDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  // 두 자리 모두 조건을 만족해야 한다 — 한쪽만 보면 다른 쪽이 딱 떨어질 수 있다.
  for (let t = 0; t < 200; t += 1) {
    const c = roundCase(rng, 1);
    const scale2 = c.a * 100;
    const shown2 = Math.floor((c.a * 1000) / c.b);
    const cut2 = Math.floor(scale2 / c.b) + ((scale2 % c.b) * 2 >= c.b ? 1 : 0);
    if (c.a % c.b === 0 || (c.a * 1000) % c.b === 0) continue;
    if (shown2 % 10 === 0 || cut2 % 10 === 0) continue;
    const diff = cut2 - c.cut * 10; // ×100 자리에서의 차 — 정수로 남는다
    if (diff === 0) continue; // 두 값이 같으면 「어느 쪽이 큰가」가 뜻을 잃는다
    return make(
      unit,
      `${expr(`${c.a}\\div${c.b}`)} 의 몫을 반올림하여 소수 첫째 자리까지 나타낸 값과 ` +
        `소수 둘째 자리까지 나타낸 값의 차를 구하시오.`,
      expr(decStr(Math.abs(diff), 2)),
      // ⚠️ 뺄셈식의 두 항은 **각자의 자리**로 적는다 — 첫째 자리 값을 두 자리로 적으면
      //    `6.70` 같은 꼬리 0 이 지면에 나간다(시험이 잡았다).
      `소수 첫째 자리까지 나타내면 ${expr(decStr(c.cut, 1))}, 소수 둘째 자리까지 나타내면 ` +
        `${expr(decStr(cut2, 2))} 입니다. ` +
        `${expr(
          diff > 0
            ? `${decStr(cut2, 2)}-${decStr(c.cut, 1)}=${decStr(diff, 2)}`
            : `${decStr(c.cut, 1)}-${decStr(cut2, 2)}=${decStr(-diff, 2)}`,
        )}`,
    );
  }
  throw new Error(
    "2-2-4 심화하: 두 자리 모두 반올림이 뜻을 갖는 짝을 못 만들었습니다",
  );
}

// ── 2-2-5 나누어 주고 남는 양 알아보기 ──

/**
 * 남는 양 재료 — **몫은 자연수, 나머지는 나누어지는 수와 같은 소수 한 자리.**
 * `total10`·`rem10` 은 ×10 정수. 나머지가 0 이면 「남는 양」이 뜻을 잃으므로 1 이상이다.
 */
function shareRemainder(
  rng: Rng,
  perMax = 6,
): { per: number; people: number; total10: number; rem10: number } {
  const per = intBetween(rng, 2, perMax);
  const people = intBetween(rng, 3, 7);
  const rem10 = intBetween(rng, 0, per - 1) * 10 + intBetween(rng, 1, 9);
  return { per, people, total10: people * per * 10 + rem10, rem10 };
}

/** 연산 — 식이 주어진다. 몫과 나머지를 함께 답한다. */
function remCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = shareRemainder(rng);
  const total = decStr(r.total10, 1);
  const rem = decStr(r.rem10, 1);
  return make(
    unit,
    `${expr(`${total}\\div${r.per}`)} 에서 몫을 자연수까지 구할 때 몫과 남는 수를 구하시오.`,
    `몫 ${num(r.people)}, 남는 수 ${num(rem)}`,
    `${expr(`${r.per}\\times${r.people}=${r.per * r.people}`)} 이므로 몫은 ${num(r.people)}이고, ` +
      `${expr(`${total}-${r.per * r.people}=${rem}`)} 이므로 남는 수는 ${num(rem)}입니다.`,
  );
}

/** 기본 — 문장 한 겹. 몇 사람에게 주고 몇이 남는가. */
function remWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, DEC_POUR);
  const r = shareRemainder(rng);
  const total = decStr(r.total10, 1);
  const rem = decStr(r.rem10, 1);
  return make(
    unit,
    `${s.thing} ${unitNum(total, s.unit)}${unitJosa(s.unit, "을", "를")} 한 사람에게 ${unitNum(r.per, s.unit)}씩 나누어 주려고 합니다. ` +
      `몇 명에게 나누어 줄 수 있고 몇 ${s.unit}${unitJosa(s.unit, "이", "가")} 남습니까?`,
    `${num(r.people)}명, ${unitNum(rem, s.unit)}`,
    `${expr(`${r.per}\\times${r.people}=${r.per * r.people}`)} 이므로 ${num(r.people)}명에게 줄 수 있고, ` +
      `${expr(`${total}-${r.per * r.people}=${rem}`)} 이므로 ${unitNum(rem, s.unit)} ${unitJosa(s.unit, "이", "가")} 남습니다.`,
  );
}

/** 응용 — 두 걸음. 남는 양을 채우려면 얼마가 더 필요한가(뺄셈 한 겹 더). */
function remApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, DEC_POUR);
  const r = shareRemainder(rng);
  const total = decStr(r.total10, 1);
  const rem = decStr(r.rem10, 1);
  const need10 = r.per * 10 - r.rem10; // 한 사람 몫을 채우는 데 모자란 양
  return make(
    unit,
    `${s.thing} ${unitNum(total, s.unit)}${unitJosa(s.unit, "을", "를")} 한 사람에게 ${unitNum(r.per, s.unit)}씩 나누어 주었더니 조금 남았습니다. ` +
      `남은 ${s.thing}${josa(s.thing, "으로", "로")} 한 사람에게 더 주려면 ${s.thing}${josa(s.thing, "이", "가")} 몇 ${s.unit} 더 필요합니까?`,
    expr(decStr(need10, 1)),
    `${expr(`${r.per}\\times${r.people}=${r.per * r.people}`)} 이므로 ${num(r.people)}명에게 주고 ` +
      `${expr(`${total}-${r.per * r.people}=${rem}`)} 만큼 남습니다. ` +
      `${expr(`${r.per}-${rem}=${decStr(need10, 1)}`)} 이므로 ${num(decStr(need10, 1))} ${s.unit} 더 필요합니다.`,
  );
}

/** 심화 — 역산. 몫과 남는 수에서 처음 양을 되짚는다. */
function remDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, DEC_POUR);
  const r = shareRemainder(rng);
  const total = decStr(r.total10, 1);
  const rem = decStr(r.rem10, 1);
  return make(
    unit,
    `${s.thing}${josa(s.thing, "을", "를")} 한 사람에게 ${unitNum(r.per, s.unit)}씩 나누어 주었더니 ` +
      `${num(r.people)}명에게 줄 수 있고 ${unitNum(rem, s.unit)} ${unitJosa(s.unit, "이", "가")} 남았습니다. 처음에 있던 ${s.thing}${josa(s.thing, "은", "는")} 몇 ${s.unit}입니까?`,
    expr(total),
    `나누어 준 양은 ${expr(`${r.per}\\times${r.people}=${r.per * r.people}`)} 입니다. ` +
      `남은 양을 더하면 ${expr(`${r.per * r.people}+${rem}=${total}`)} 입니다.`,
  );
}

// ══════ 2-2 소수의 나눗셈 — **확대 갈래** 심화중·심화상 (D-113, 잣대 확정 2026-08-30) ══════
//
// 이 대단원을 파일럿으로 고른 근거는 `docs/planning/tracks/reports/tier-bench-g6.md` §5 다:
// 초6 에서 사다리가 뒤집힌 11소단원 중 **2-2-1·2-2-2·2-2-3 은 12씨앗 전부**가 그렇고,
// 그러면서 이 대단원은 **계산 단원**이라 「숫자를 안 키우고 구조로 올린다」가 가장 어렵다.
//
// ## 🔴 잣대 — **되짚기 사슬의 «굳지 않는 마디»** (리드 확정 2026-08-30)
//
// 처음에는 **열거**(「모두 구하시오」·「몇 가지」)를 축으로 썼는데 **기각됐다.**
// 문형 전량 6,900행 실측에서 열거는 갈래를 1.5~2배밖에 안 가르고(초4 는 기본>응용으로
// 이미 뒤집혀 있다), 심화하 **안에서** 걸음 수를 재니 열거형 76건이 평균 0.39걸음으로
// **그 소단원의 «연산»(0.79)보다도 얕았다.** 되짚기 축은 22~40배 가른다.
//
//   심화하 (안 건드림) — 되짚기 사슬의 **마디마다 값이 하나로 굳는다**
//   심화중            — 굳지 않는 마디가 **하나** 있고, **그 소단원의 성질**과 발문의
//                       조건이 그 마디를 굳혀 주어야 답이 선다
//   심화상            — 그 마디를 성질만으로는 못 굳혀, **되짚기가 만든 후보**를 실제로
//                       계산해 견주어야 하나가 남는다 (후보를 발문이 주지 않는다)
//
// 이 대단원에서 마디를 굳히는 **소단원 성질**은 하나뿐이다 —
// **「소수점을 함께 옮기면 (소수)÷(소수) 가 자연수의 나눗셈이 된다」.**
// 그래서 「몫이 자연수/소수 한 자리 수」가 어떤 수를 **배수열**로 묶고, 범위가 하나를 고른다.
// 2-2-4 는 **반올림한 값 하나가 구간을 가리킨다**는 것이 그 성질이고,
// 2-2-5 는 **몫이 자연수·남는 양이 한 사람 몫보다 적다**가 그것이다.
//
// ## 반증문 — 하나라도 참이면 그 배정이 틀렸다 (지면에서 확인한 것)
//
// ① 모든 마디가 굳으면 심화하다 → 새 갈래는 **전부** 굳지 않는 마디를 하나 갖는다.
// ⑤ 「모두 구하시오」를 지워도 답이 그대로면 그 열거는 근거가 아니다 →
//    **새 갈래의 답은 전부 «하나»** 다. 열거 문형은 통째로 버렸다.
// ⑥ 발문이 준 수에 소단원 연산을 **순방향으로만** 적용해 답이 나오면 중·상이 아니다 →
//    2-2-4 는 그것을 **구성이 막는다**(`ROUND_BACK` 의 `naive` 가드).
//
// 🔴 **지면에 쓸 수 있는 수의 종류가 소단원마다 잠겨 있다** — 설계를 두 번 되돌렸다.
//    `kindsPresent` 가 «요구 안 한 종류»를 금지하므로 2-2-1·2-2-2 발문에는 **자연수를
//    한 개도** 못 쓴다. 그래서 범위의 두 끝도 소수로 낸다.

/**
 * 소수 뒤의 「로/으로」 — **ㄹ 받침은 「로」**다(일로·칠로·팔로).
 *
 * `numRo` 는 정수 전용이라(`Math.trunc` 로 소수를 깎는다) 여기서는 못 쓴다.
 * `centsJosa` 와 같이 **꼬리 0 을 떼고 마지막으로 소리 나는 숫자**로 정하므로
 * ×10 이든 ×100 이든 같은 함수로 답한다.
 */
function scaledRo(scaled: number): string {
  let d = scaled;
  while (d % 10 === 0 && d !== 0) d /= 10;
  const last = d % 10;
  return last === 3 || last === 6 ? "으로" : "로";
}

/**
 * 2-2-1 심화중 재료 — 「$A$ 로 나눈 몫이 자연수」가 어떤 수를 **$A$ 의 배수열**로 묶고,
 * 범위가 그중 하나를 고른다. 범위 안에 배수가 **정확히 하나**여야 답이 선다.
 */
/**
 * 🔴 **반증 ⑥ 가드** — 발문에 실린 수 둘을 **한 번 곱하거나 나눠서** 답이 나오면
 * 그 문항은 되짚기가 아니라 한 걸음이다. 배수·구간으로 지은 문항에서도 **우연히**
 * 그렇게 되는 짝이 있다(실측: `2.4\times3.6=8.64` · `72\div1.2=60` — 시험이 잡았다).
 *
 * 값은 `[정수 배율, 소수 자릿수]` 로 받아 **정수 곱으로만** 견준다(부동소수를 안 거친다).
 */
function oneStepHits(
  page: readonly (readonly [number, number])[],
  ans: readonly [number, number],
): boolean {
  const [as, ad] = ans;
  const p10 = (e: number) => 10 ** e;
  for (const [us, ud] of page)
    for (const [vs, vd] of page) {
      if (us === vs && ud === vd) continue;
      if (us * vs * p10(ad) === as * p10(ud + vd)) return true;
      if (vs !== 0 && us * p10(vd + ad) === as * vs * p10(ud)) return true;
    }
  return false;
}

const SAME_MULT = lazyTable("g6.SAME_MULT", () => {
  const table: { a10: number; k: number; lo10: number; up10: number }[] = [];
  for (let a10 = 11; a10 <= 39; a10 += 1) {
    if (a10 % 10 === 0) continue;
    for (let k = 3; k <= 9; k += 1) {
      const x10 = a10 * k;
      if (x10 % 10 === 0 || x10 > 900) continue;
      for (const pad of [5, 7, 9, 11]) {
        const lo10 = x10 - pad;
        const up10 = x10 + pad;
        if (lo10 <= 0 || lo10 % 10 === 0 || up10 % 10 === 0) continue;
        let hits = 0;
        for (let m = 1; m * a10 < up10; m += 1) if (m * a10 > lo10) hits += 1;
        if (hits !== 1) continue;
        if (
          oneStepHits(
            [
              [a10, 1],
              [lo10, 1],
              [up10, 1],
            ],
            [x10, 1],
          )
        )
          continue;
        table.push({ a10, k, lo10, up10 });
      }
    }
  }
  return table;
});

/**
 * 2-2-1 심화상 재료 — 첫 조건이 후보를 **셋 이상** 만들고, 둘째 나눗셈을 각 후보에
 * 실제로 해 봐야 **하나**가 남는다. 후보를 발문이 주지 않는다는 것이 이 갈래의 알맹이다.
 */
const SAME_TWO = lazyTable("g6.SAME_TWO", () => {
  const table: {
    a10: number;
    b10: number;
    lo10: number;
    up10: number;
    x10: number;
  }[] = [];
  for (let a10 = 11; a10 <= 29; a10 += 1) {
    if (a10 % 10 === 0) continue;
    for (let b10 = 11; b10 <= 39; b10 += 1) {
      if (b10 % 10 === 0 || b10 === a10) continue;
      for (let lo10 = 21; lo10 <= 160; lo10 += 1) {
        if (lo10 % 10 === 0) continue;
        for (const width of [30, 40, 50]) {
          const up10 = lo10 + width;
          if (up10 % 10 === 0 || up10 > 220) continue;
          const list: number[] = [];
          for (let m = 1; m * a10 < up10; m += 1)
            if (m * a10 > lo10) list.push(m * a10);
          if (list.length < 3 || list.length > 6) continue;
          const win = list.filter((v) => v % b10 === 0);
          if (win.length !== 1 || win[0]! % 10 === 0) continue;
          if (
            oneStepHits(
              [
                [a10, 1],
                [b10, 1],
                [lo10, 1],
                [up10, 1],
              ],
              [win[0]!, 1],
            )
          )
            continue;
          table.push({ a10, b10, lo10, up10, x10: win[0]! });
        }
      }
    }
  }
  return table;
});

/**
 * 2-2-2 심화중 재료 — 어떤 수가 **소수 두 자리**, 몫이 **소수 한 자리**다.
 * 그러면 「자릿수가 다른 (소수)÷(소수)」가 발문에 그대로 선다(범위의 두 끝이 두 자리).
 */
const DIFF_MULT = lazyTable("g6.DIFF_MULT", () => {
  const table: { a10: number; m: number; lo100: number; up100: number }[] = [];
  for (let a10 = 11; a10 <= 39; a10 += 1) {
    if (a10 % 10 === 0) continue;
    for (let m = 21; m <= 90; m += 1) {
      if (m % 10 === 0) continue;
      const x100 = a10 * m;
      if (x100 % 10 === 0 || x100 > 2500) continue;
      for (const pad of [8, 11, 14, 17]) {
        const lo100 = x100 - pad;
        const up100 = x100 + pad;
        if (lo100 <= 0 || lo100 % 10 === 0 || up100 % 10 === 0) continue;
        let hits = 0;
        for (let t = 1; t * a10 < up100; t += 1) {
          const v = t * a10;
          if (v > lo100 && v % 10 !== 0) hits += 1;
        }
        if (hits !== 1) continue;
        if (
          oneStepHits(
            [
              [a10, 1],
              [lo100, 2],
              [up100, 2],
            ],
            [x100, 2],
          )
        )
          continue;
        table.push({ a10, m, lo100, up100 });
      }
    }
  }
  return table;
});

/** 2-2-2 심화상 재료 — 위와 같은 구조를 두 자리 소수로. */
const DIFF_TWO = lazyTable("g6.DIFF_TWO", () => {
  const table: {
    a10: number;
    b10: number;
    lo100: number;
    up100: number;
    x100: number;
  }[] = [];
  for (let a10 = 11; a10 <= 29; a10 += 1) {
    if (a10 % 10 === 0) continue;
    for (let b10 = 11; b10 <= 39; b10 += 1) {
      if (b10 % 10 === 0 || b10 === a10) continue;
      for (let lo100 = 201; lo100 <= 900; lo100 += 1) {
        if (lo100 % 10 === 0) continue;
        for (const width of [60, 90]) {
          const up100 = lo100 + width;
          if (up100 % 10 === 0 || up100 > 1200) continue;
          const list: number[] = [];
          for (let t = 1; t * a10 < up100; t += 1) {
            const v = t * a10;
            if (v > lo100 && v % 10 !== 0) list.push(v);
          }
          if (list.length < 3 || list.length > 6) continue;
          const win = list.filter((v) => v % b10 === 0);
          if (win.length !== 1) continue;
          if (
            oneStepHits(
              [
                [a10, 1],
                [b10, 1],
                [lo100, 2],
                [up100, 2],
              ],
              [win[0]!, 2],
            )
          )
            continue;
          table.push({ a10, b10, lo100, up100, x100: win[0]! });
        }
      }
    }
  }
  return table;
});

/** 2-2-3 심화중 재료 — 되짚은 어떤 수가 **자연수**다((자연수)÷(소수) 소단원). */
const NAT_MULT = lazyTable("g6.NAT_MULT", () => {
  const table: { a10: number; lo: number; up: number; x: number }[] = [];
  for (let a10 = 11; a10 <= 49; a10 += 1) {
    if (a10 % 10 === 0) continue;
    for (let k = 4; k <= 40; k += 1) {
      const x10 = a10 * k;
      if (x10 % 10 !== 0) continue;
      const x = x10 / 10;
      if (x < 12 || x > 99) continue;
      for (const pad of [3, 4, 5, 6]) {
        const lo = x - pad;
        const up = x + pad;
        if (lo < 2) continue;
        let hits = 0;
        for (let n = lo + 1; n < up; n += 1)
          if ((n * 10) % a10 === 0) hits += 1;
        if (hits !== 1) continue;
        if (
          oneStepHits(
            [
              [a10, 1],
              [lo, 0],
              [up, 0],
            ],
            [x, 0],
          )
        )
          continue;
        table.push({ a10, lo, up, x });
      }
    }
  }
  return table;
});

/** 2-2-3 심화상 재료 — 후보를 만든 뒤 둘째 소수로 각각 나눠 봐야 하나가 남는다. */
const NAT_TWO = lazyTable("g6.NAT_TWO", () => {
  const table: {
    a10: number;
    b10: number;
    lo: number;
    up: number;
    x: number;
  }[] = [];
  for (let a10 = 11; a10 <= 39; a10 += 1) {
    if (a10 % 10 === 0) continue;
    for (let b10 = 11; b10 <= 49; b10 += 1) {
      if (b10 % 10 === 0 || b10 === a10) continue;
      for (let lo = 8; lo <= 80; lo += 1) {
        for (const width of [12, 16, 20, 24]) {
          const up = lo + width;
          if (up > 99) continue;
          const list: number[] = [];
          for (let n = lo + 1; n < up; n += 1)
            if ((n * 10) % a10 === 0) list.push(n);
          if (list.length < 3 || list.length > 6) continue;
          const win = list.filter((n) => (n * 10) % b10 === 0);
          if (win.length !== 1) continue;
          if (
            oneStepHits(
              [
                [a10, 1],
                [b10, 1],
                [lo, 0],
                [up, 0],
              ],
              [win[0]!, 0],
            )
          )
            continue;
          table.push({ a10, b10, lo, up, x: win[0]! });
        }
      }
    }
  }
  return table;
});

/** 정수 나눗셈으로 **소수 첫째 자리까지 반올림** — 부동소수를 안 거친다. */
function round1(n: number, b: number): number {
  const s = n * 10;
  return Math.floor(s / b) + ((s % b) * 2 >= b ? 1 : 0);
}

/**
 * 2-2-4 재료 — **반올림한 값 하나가 구간을 가리킨다**는 것이 이 소단원의 성질이다.
 * 몫이 `r` 로 반올림되려면 몫이 `[r-0.05, r+0.05)` 안에 있어야 하고, 그러면 나누어지는
 * 자연수는 그 구간에 `b` 를 곱한 범위의 정수다 — **마디가 구간이라 안 굳는다.**
 *
 * 🔴 `naive` 가드가 **반증 ⑥** 이다 — 「몫 × 나누는 수」 한 번으로 답이 나오면 그 문항은
 *    되짚기가 아니라 한 걸음이다. 실제로 좁은 구간에서는 늘 그렇게 되므로 걸러 낸다.
 */
const ROUND_BACK: { b: number; r10: number; ns: number[] }[] = [];
for (let b = 17; b <= 39; b += 1) {
  for (let r10 = 21; r10 <= 95; r10 += 1) {
    if (r10 % 10 === 0) continue;
    const lo100 = (r10 * 10 - 5) * b;
    const hi100 = (r10 * 10 + 5) * b;
    if (lo100 % 100 === 0 || hi100 % 100 === 0) continue;
    const ns: number[] = [];
    for (
      let n = Math.floor(lo100 / 100) + 1;
      n <= Math.floor(hi100 / 100);
      n += 1
    )
      ns.push(n);
    if (ns.length < 2 || ns.length > 4) continue;
    // 해설이 「$…\ldots$」라 적으므로 그 몫이 두 자리에서 끝나면 안 된다.
    if (ns.some((n) => (n * 100) % b === 0)) continue;
    const naive = (r10 * b) / 10;
    const big = ns[ns.length - 1]!;
    if (
      big === Math.round(naive) ||
      big === Math.floor(naive) ||
      big === Math.ceil(naive)
    )
      continue;
    ROUND_BACK.push({ b, r10, ns });
  }
}

/** 2-2-4 심화상 재료 — 두 반올림 조건이 교차해 **하나**만 남는다. */
const ROUND_CROSS = lazyTable("g6.ROUND_CROSS", () => {
  const table: {
    b1: number;
    r1: number;
    b2: number;
    r2: number;
    ns: number[];
    x: number;
  }[] = [];
  for (const g of ROUND_BACK) {
    for (let b2 = 11; b2 <= 39; b2 += 1) {
      if (b2 === g.b) continue;
      const byValue = new Map<number, number[]>();
      for (const n of g.ns) {
        const r = round1(n, b2);
        byValue.set(r, [...(byValue.get(r) ?? []), n]);
      }
      for (const [r2, members] of byValue) {
        if (members.length !== 1 || r2 % 10 === 0) continue;
        const x = members[0]!;
        if ((x * 100) % b2 === 0) continue;
        const naive2 = (r2 * b2) / 10;
        if (
          x === Math.round(naive2) ||
          x === Math.floor(naive2) ||
          x === Math.ceil(naive2)
        )
          continue;
        // 해설이 후보마다 «두 자리 + \ldots» 를 적는다 — 자름이 꼬리 0 이면
        // 지면에 `9.70\ldots` 가 나간다(초등 지면에 안 쓴다).
        if (g.ns.some((n) => Math.floor((n * 100) / b2) % 10 === 0)) continue;
        table.push({ b1: g.b, r1: g.r10, b2, r2, ns: g.ns, x });
      }
    }
  }
  return table;
});

/**
 * 2-2-5 심화중 재료 — 「$per$ 씩 주면 $k$ 명에게 주고 조금 남는다」가 처음 양을
 * **구간** `(per·k, per·k+per)` 으로만 묶는다(굳지 않는 마디). 남는 양의 하한이
 * 그 구간을 좁히고, 「소수 첫째 자리까지의 수 중 가장 적은」이 하나를 고른다.
 *
 * ⚠️ 하한을 **처음 양**에 걸면 안 된다 — 그러면 「$k$ 명」이 아무 일도 안 하고
 *    답이 「하한 다음 수」로 바로 나온다(반증 ⑥). **남는 양**에 걸어야 되짚기가 산다.
 */
const REM_RANGE: { per: number; k: number; rmin: number; total10: number }[] =
  [];
for (let per = 3; per <= 8; per += 1)
  for (let k = 4; k <= 9; k += 1)
    for (let rmin = 1; rmin < per - 1; rmin += 1) {
      const total10 = per * k * 10 + rmin * 10 + 1;
      if (total10 > 900) continue;
      REM_RANGE.push({ per, k, rmin, total10 });
    }

/**
 * 2-2-5 심화상 재료 — 「$a$ 씩 주면 $ra$ 남는다」가 후보를 **배수열**로 만들고,
 * 각 후보를 실제로 $b$ 로 나눠 남는 양을 견주어야 하나가 남는다.
 */
const REM_CROSS = lazyTable("g6.REM_CROSS", () => {
  const table: {
    a: number;
    ra10: number;
    b: number;
    rb10: number;
    cap10: number;
    x10: number;
  }[] = [];
  for (let a = 3; a <= 7; a += 1)
    for (let b = a + 1; b <= 9; b += 1)
      for (let ra10 = 1; ra10 < a * 10; ra10 += 1) {
        if (ra10 % 10 === 0) continue;
        for (let rb10 = 1; rb10 < b * 10; rb10 += 1) {
          if (rb10 % 10 === 0 || rb10 === ra10) continue;
          if (ra10 % 10 !== rb10 % 10) continue; // 같은 양이므로 소수 첫째 자리가 같다
          const list: number[] = [];
          for (let ka = 1; ka <= 14; ka += 1) {
            const t = a * 10 * ka + ra10;
            if (t > 700) break;
            list.push(t);
          }
          if (list.length < 5) continue;
          const fits = (t: number) =>
            t > b * 10 && (t - rb10) % (b * 10) === 0 && t - rb10 > 0;
          const win = list.filter(fits);
          if (win.length !== 1) continue;
          const x10 = win[0]!;
          const cap10 = x10 + a * 10 * 3 + 5;
          if (cap10 % 10 === 0) continue; // `46.0` 은 초등 지면에 안 쓴다
          const under = list.filter((t) => t < cap10);
          if (under.length < 4 || under.filter(fits).length !== 1) continue;
          table.push({ a, ra10, b, rb10, cap10, x10 });
        }
      }
  return table;
});

// ── 2-2-1 자릿수가 같은 (소수)÷(소수) ──

/**
 * 심화중 — **굳지 않는 마디 하나.** 「$A$ 로 나눈 몫이 자연수」는 어떤 수를 $A$ 의
 * 배수열로만 묶는다(마디가 안 굳는다). 소단원 성질(소수점을 옮기면 자연수의 나눗셈)로
 * 배수열을 만들고, 범위가 그중 하나를 고른다.
 */
function sameDpMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, SAME_MULT());
  const a = decStr(c.a10, 1);
  const x10 = c.a10 * c.k;
  const near = [c.k - 1, c.k, c.k + 1];
  return makeDeep(
    unit,
    `어떤 수를 ${num(a)}${scaledRo(c.a10)} 나눈 몫이 자연수입니다. ` +
      `어떤 수가 ${num(decStr(c.lo10, 1))}보다 크고 ${num(decStr(c.up10, 1))}보다 작을 때, ` +
      `어떤 수를 구하시오.`,
    num(decStr(x10, 1)),
    [
      `몫이 자연수이므로 어떤 수는 ${num(a)}의 배수입니다. ` +
        `두 수의 소수점을 오른쪽으로 한 자리씩 옮기면 ${num(c.a10)}의 배수를 찾는 것과 같습니다.`,
      `${near
        .map((m) => expr(`${a}\\times${m}=${fromTenths(c.a10 * m)}`))
        .join(", ")} 중에서 ` +
        `${num(decStr(c.lo10, 1))}보다 크고 ${num(decStr(c.up10, 1))}보다 작은 것은 ` +
        `${num(decStr(x10, 1))} 뿐입니다.`,
    ],
  );
}

/**
 * 심화상 — 성질만으로는 **못 굳힌다.** 첫 조건이 후보를 셋 이상 만들고, 그 후보를
 * 발문이 주지 않으므로 **직접 만들어** 둘째 나눗셈을 각각 해 봐야 하나가 남는다.
 */
function sameDpTop(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, SAME_TWO());
  const a = decStr(c.a10, 1);
  const b = decStr(c.b10, 1);
  const cands: number[] = [];
  for (let m = 1; m * c.a10 < c.up10; m += 1)
    if (m * c.a10 > c.lo10) cands.push(m * c.a10);
  const miss = cands.filter((v) => v !== c.x10);
  return makeDeep(
    unit,
    `어떤 수를 ${num(a)}${scaledRo(c.a10)} 나눈 몫도 자연수이고, ` +
      `${num(b)}${scaledRo(c.b10)} 나눈 몫도 자연수입니다. ` +
      `어떤 수가 ${num(decStr(c.lo10, 1))}보다 크고 ${num(decStr(c.up10, 1))}보다 작을 때, ` +
      `어떤 수를 구하시오.`,
    num(decStr(c.x10, 1)),
    [
      `먼저 ${num(a)}의 배수를 찾습니다. ` +
        `${cands
          .map((v) => expr(`${a}\\times${v / c.a10}=${fromTenths(v)}`))
          .join(", ")} 입니다.`,
      `이 중 ${num(b)}${scaledRo(c.b10)} 나누어떨어지는 것을 찾습니다. ` +
        `${miss.map((v) => expr(`${fromTenths(v)}\\div${b}`)).join(", ")} ` +
        `${numJosa(c.b10, "은", "는")} 나누어떨어지지 않고, ` +
        `${expr(`${decStr(c.x10, 1)}\\div${b}=${c.x10 / c.b10}`)} 만 나누어떨어집니다.`,
    ],
  );
}

// ── 2-2-2 자릿수가 다른 (소수)÷(소수) ──

/**
 * 심화중 — 2-2-1 과 같은 사슬이되 **몫이 소수 한 자리 수**라 어떤 수가 두 자리다.
 * 그래서 「자릿수가 다른 (소수)÷(소수)」가 지면에 그대로 선다.
 */
function diffDpMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DIFF_MULT());
  const a = decStr(c.a10, 1);
  const x100 = c.a10 * c.m;
  // ⚠️ **이웃을 «앞뒤 하나»로 잡으면 안 된다.** 곱하는 수는 소수 한 자리라 `3.0` 처럼
  //    꼬리 0 이 되는 것을 빼야 하는데, 그러면 남는 것이 **하나뿐**일 때가 있다 —
  //    그때 `makeDeep` 이 「계산식이 둘 미만」으로 던진다(판정기가 실제로 잡았다).
  //    가까운 쪽부터 살아 있는 것을 **셋** 모은다.
  const near = [c.m];
  for (let d = 1; d <= 4 && near.length < 3; d += 1) {
    for (const m of [c.m - d, c.m + d]) {
      if (near.length >= 3 || m < 11 || m % 10 === 0) continue;
      near.push(m);
    }
  }
  near.sort((p1, p2) => p1 - p2);
  return makeDeep(
    unit,
    `어떤 수를 ${num(a)}${scaledRo(c.a10)} 나눈 몫이 소수 한 자리 수입니다. ` +
      `어떤 수가 소수 두 자리 수이고 ${num(decStr(c.lo100, 2))}보다 크고 ` +
      `${num(decStr(c.up100, 2))}보다 작을 때, 어떤 수를 구하시오.`,
    num(decStr(x100, 2)),
    [
      `몫이 소수 한 자리 수이므로 어떤 수는 ${num(a)}에 소수 한 자리 수를 곱한 값입니다.`,
      `${near
        .map((m) => expr(`${a}\\times${decStr(m, 1)}=${fromCents(c.a10 * m)}`))
        .join(", ")} 중에서 ` +
        `${num(decStr(c.lo100, 2))}보다 크고 ${num(decStr(c.up100, 2))}보다 작은 소수 두 자리 수는 ` +
        `${num(decStr(x100, 2))} 뿐입니다.`,
    ],
  );
}

/** 심화상 — 후보를 만든 뒤 둘째 나눗셈을 각각 해 봐야 하나가 남는다. */
function diffDpTop(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DIFF_TWO());
  const a = decStr(c.a10, 1);
  const b = decStr(c.b10, 1);
  const cands: number[] = [];
  for (let t = 1; t * c.a10 < c.up100; t += 1) {
    const v = t * c.a10;
    if (v > c.lo100 && v % 10 !== 0) cands.push(v);
  }
  const miss = cands.filter((v) => v !== c.x100);
  return makeDeep(
    unit,
    `어떤 수를 ${num(a)}${scaledRo(c.a10)} 나눈 몫도 소수 한 자리 수이고, ` +
      `${num(b)}${scaledRo(c.b10)} 나눈 몫도 소수 한 자리 수입니다. ` +
      `어떤 수가 소수 두 자리 수이고 ${num(decStr(c.lo100, 2))}보다 크고 ` +
      `${num(decStr(c.up100, 2))}보다 작을 때, 어떤 수를 구하시오.`,
    num(decStr(c.x100, 2)),
    [
      `먼저 ${num(a)}에 소수 한 자리 수를 곱해 소수 두 자리 수가 되는 것을 찾습니다. ` +
        `${cands
          .map((v) =>
            expr(`${a}\\times${decStr(v / c.a10, 1)}=${decStr(v, 2)}`),
          )
          .join(", ")} 입니다.`,
      `이 중 ${num(b)}${scaledRo(c.b10)} 나눈 몫도 소수 한 자리 수인 것을 찾습니다. ` +
        `${miss.map((v) => expr(`${decStr(v, 2)}\\div${b}`)).join(", ")} ` +
        `${numJosa(c.b10, "은", "는")} 소수 한 자리 수가 아니고, ` +
        `${expr(`${decStr(c.x100, 2)}\\div${b}=${decStr(c.x100 / c.b10, 1)}`)} 입니다.`,
    ],
  );
}

// ── 2-2-3 (자연수)÷(소수) ──

/** 심화중 — 되짚은 어떤 수가 **자연수**라 배수열이 성기다(그만큼 범위가 넓어도 된다). */
function natDpMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, NAT_MULT());
  const a = decStr(c.a10, 1);
  const near = [c.x - c.a10, c.x, c.x + c.a10].filter((v) => v > 0);
  return makeDeep(
    unit,
    `어떤 자연수를 ${num(a)}${scaledRo(c.a10)} 나눈 몫이 자연수입니다. ` +
      `어떤 수가 ${num(c.lo)}보다 크고 ${num(c.up)}보다 작을 때, 어떤 수를 구하시오.`,
    num(c.x),
    [
      `몫이 자연수이므로 어떤 수는 ${num(a)}의 배수이고, 자연수이므로 ` +
        `${num(c.a10)}의 배수이기도 합니다.`,
      `${near.map((v) => expr(`${v}\\div${a}=${(v * 10) / c.a10}`)).join(", ")} ` +
        `중에서 ${num(c.lo)}보다 크고 ${num(c.up)}보다 작은 것은 ${num(c.x)} 뿐입니다.`,
    ],
  );
}

/** 심화상 — 후보를 만든 뒤 둘째 소수로 각각 나눠 봐야 하나가 남는다. */
function natDpTop(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, NAT_TWO());
  const a = decStr(c.a10, 1);
  const b = decStr(c.b10, 1);
  const cands: number[] = [];
  for (let n = c.lo + 1; n < c.up; n += 1)
    if ((n * 10) % c.a10 === 0) cands.push(n);
  const miss = cands.filter((v) => v !== c.x);
  return makeDeep(
    unit,
    `어떤 자연수를 ${num(a)}${scaledRo(c.a10)} 나눈 몫도 자연수이고, ` +
      `${num(b)}${scaledRo(c.b10)} 나눈 몫도 자연수입니다. ` +
      `어떤 수가 ${num(c.lo)}보다 크고 ${num(c.up)}보다 작을 때, 어떤 수를 구하시오.`,
    num(c.x),
    [
      `먼저 ${num(a)}${scaledRo(c.a10)} 나누어떨어지는 자연수를 찾습니다. ` +
        `${cands
          .map((v) => expr(`${v}\\div${a}=${(v * 10) / c.a10}`))
          .join(", ")} 입니다.`,
      `이 중 ${num(b)}${scaledRo(c.b10)} 나누어떨어지는 것을 찾습니다. ` +
        `${miss.map((v) => expr(`${v}\\div${b}`)).join(", ")} ` +
        `${numJosa(c.b10, "은", "는")} 나누어떨어지지 않고, ` +
        `${expr(`${c.x}\\div${b}=${(c.x * 10) / c.b10}`)} 만 나누어떨어집니다.`,
    ],
  );
}

// ── 2-2-4 몫을 반올림하여 나타내기 ──

/**
 * 심화중 — **반올림한 값 하나가 구간을 가리킨다.** 그 구간이 굳지 않는 마디이고,
 * 「자연수 중 가장 큰 것」이 하나를 고른다. 구성이 「몫 × 나누는 수」 한 번으로
 * 답이 나오는 짝을 걸러 내므로(반증 ⑥) 되짚기를 안 하면 못 푼다.
 */
function roundMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, ROUND_BACK);
  const r = decStr(c.r10, 1);
  const lo = decStr(c.r10 * 10 - 5, 2);
  const hi = decStr(c.r10 * 10 + 5, 2);
  const loP = fromCents((c.r10 * 10 - 5) * c.b);
  const hiP = fromCents((c.r10 * 10 + 5) * c.b);
  const big = c.ns[c.ns.length - 1]!;
  const shown = Math.floor((big * 100) / c.b);
  return makeDeep(
    unit,
    `${expr(`\\square\\div${c.b}`)} 의 몫을 반올림하여 소수 첫째 자리까지 나타내면 ` +
      `${num(r)}입니다. ${expr("\\square")} 안에 들어갈 수 있는 가장 큰 자연수를 구하시오.`,
    num(big),
    [
      `반올림하여 ${num(r)}${centsJosa(c.r10, "이", "가")} 되려면 몫은 ` +
        `${num(lo)}보다 크거나 같고 ${num(hi)}보다 작아야 합니다.`,
      `${expr(`${lo}\\times${c.b}=${loP}`)}, ${expr(`${hi}\\times${c.b}=${hiP}`)} 이므로 ` +
        `${expr("\\square")} 는 ${num(loP)}보다 크거나 같고 ${num(hiP)}보다 작은 자연수입니다. ` +
        `그중 가장 큰 수는 ${num(big)}입니다.`,
      `${expr(`${big}\\div${c.b}`)} 의 몫이 ${expr(`${decStr(shown, 2)}\\ldots`)} 인 것으로 확인할 수 있습니다.`,
    ],
  );
}

/**
 * 심화상 — 구간이 자연수 여럿을 남기고, **그 후보를 발문이 주지 않는다.**
 * 둘째 반올림을 각 후보에 실제로 해 봐야 하나가 남는다.
 */
function roundTop(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, ROUND_CROSS());
  const r1 = decStr(c.r1, 1);
  const r2 = decStr(c.r2, 1);
  const lo = decStr(c.r1 * 10 - 5, 2);
  const hi = decStr(c.r1 * 10 + 5, 2);
  const loP = fromCents((c.r1 * 10 - 5) * c.b1);
  const hiP = fromCents((c.r1 * 10 + 5) * c.b1);
  return makeDeep(
    unit,
    `어떤 자연수를 ${num(c.b1)}${numRo(c.b1)} 나눈 몫을 반올림하여 소수 첫째 자리까지 ` +
      `나타내면 ${num(r1)}이고, ${num(c.b2)}${numRo(c.b2)} 나눈 몫을 반올림하여 ` +
      `소수 첫째 자리까지 나타내면 ${num(r2)}입니다. 어떤 수를 구하시오.`,
    num(c.x),
    [
      `${num(c.b1)}${numRo(c.b1)} 나눈 몫이 ${num(r1)}${centsJosa(c.r1, "이", "가")} 되려면 ` +
        `몫이 ${num(lo)}보다 크거나 같고 ${num(hi)}보다 작아야 하므로, ` +
        `${expr(`${lo}\\times${c.b1}=${loP}`)}, ${expr(`${hi}\\times${c.b1}=${hiP}`)} 에서 ` +
        `어떤 수는 ${c.ns.map((v) => num(v)).join(", ")} 중 하나입니다.`,
      `각각 ${num(c.b2)}${numRo(c.b2)} 나누어 반올림해 봅니다. ` +
        `${c.ns
          .map((v) =>
            expr(
              `${v}\\div${c.b2}=${decStr(Math.floor((v * 100) / c.b2), 2)}\\ldots`,
            ),
          )
          .join(", ")} 이므로 ` +
        `${c.ns.map((v) => num(decStr(round1(v, c.b2), 1))).join(", ")} 입니다.`,
      // ⚠️ 해설에 **`$a\div b$` 한 덩어리**를 반드시 남긴다. 발문은 「$37$로 나눈」처럼
      //    말로 쓰므로 `probe-elem-section-conditions` 의 「몫을 반올림하여」 검사가
      //    읽을 식이 **어디에도 없어** 40/40 위반이 났다(실제로 잡혔다).
      `${expr(`${c.x}\\div${c.b2}`)} 의 몫만 ${num(r2)}${centsJosa(c.r2, "이", "가")} 되므로 ` +
        `어떤 수는 ${num(c.x)}입니다.`,
    ],
  );
}

// ── 2-2-5 나누어 주고 남는 양 알아보기 ──

/**
 * 심화중 — 「$k$ 명에게 주고 조금 남는다」가 처음 양을 **구간**으로만 묶는다(굳지 않는
 * 마디). 남는 양의 하한이 그 구간을 좁히고, 「가장 적은 소수 첫째 자리 수」가 하나를 고른다.
 */
function remMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, DEC_POUR);
  const c = pick(rng, REM_RANGE);
  const given = c.per * c.k;
  const total = decStr(c.total10, 1);
  return makeDeep(
    unit,
    `${s.thing}${josa(s.thing, "을", "를")} 한 사람에게 ${unitNum(c.per, s.unit)}씩 ` +
      `나누어 주었더니 ${num(c.k)}명에게 줄 수 있고 조금 남았습니다. ` +
      `남는 ${s.thing}${josa(s.thing, "이", "가")} ${unitNum(c.rmin, s.unit)}보다 많고 ` +
      `${s.thing}의 양이 소수 첫째 자리까지의 수일 때, ${s.thing}${josa(s.thing, "은", "는")} ` +
      `가장 적어야 몇 ${s.unit}입니까?`,
    expr(total),
    [
      `${num(c.k)}명에게 준 양은 ${expr(`${c.per}\\times${c.k}=${given}`)} 입니다.`,
      `남는 양이 ${unitNum(c.rmin, s.unit)}보다 많아야 하므로 ` +
        `${s.thing}${josa(s.thing, "은", "는")} ${expr(`${given}+${c.rmin}=${given + c.rmin}`)} ` +
        `보다 많습니다. 소수 첫째 자리까지의 수 중 가장 적은 것은 ${expr(total)} 입니다.`,
      `${expr(`${total}-${given}=${decStr(c.total10 - given * 10, 1)}`)} 이므로 남는 양도 조건에 맞습니다.`,
    ],
  );
}

/**
 * 심화상 — 「$a$ 씩 주면 $ra$ 남는다」가 후보를 **배수열**로 만들고, 그 후보를 발문이
 * 주지 않는다. 각 후보를 실제로 $b$ 로 나눠 남는 양을 견주어야 하나가 남는다.
 */
function remTop(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, DEC_POUR);
  const c = pick(rng, REM_CROSS());
  const cands: number[] = [];
  for (let k = 1; ; k += 1) {
    const t = c.a * 10 * k + c.ra10;
    if (t >= c.cap10) break;
    cands.push(t);
  }
  const ra = decStr(c.ra10, 1);
  const rb = decStr(c.rb10, 1);
  return makeDeep(
    unit,
    `${s.thing}${josa(s.thing, "을", "를")} 한 사람에게 ${unitNum(c.a, s.unit)}씩 나누어 주면 ` +
      `${unitNum(ra, s.unit)}${unitJosa(s.unit, "이", "가")} 남고, ${unitNum(c.b, s.unit)}씩 ` +
      `나누어 주면 ${unitNum(rb, s.unit)}${unitJosa(s.unit, "이", "가")} 남습니다. ` +
      `${s.thing}${josa(s.thing, "이", "가")} ${unitNum(decStr(c.cap10, 1), s.unit)}보다 적을 때, ` +
      `${s.thing}${josa(s.thing, "은", "는")} 몇 ${s.unit}입니까?`,
    expr(decStr(c.x10, 1)),
    [
      `${unitNum(c.a, s.unit)}씩 주고 ${unitNum(ra, s.unit)}${unitJosa(s.unit, "이", "가")} 남으므로 ` +
        `${s.thing}의 양은 ${cands.map((t) => expr(decStr(t, 1))).join(", ")} 중 하나입니다.`,
      `각각 ${unitNum(c.b, s.unit)}씩 나누어 봅니다. ` +
        `${cands
          .map((t) => {
            const q = Math.floor(t / (c.b * 10));
            return expr(
              `${decStr(t, 1)}-${c.b * q}=${decStr(t - c.b * q * 10, 1)}`,
            );
          })
          .join(", ")} 입니다.`,
      `남는 양이 ${unitNum(rb, s.unit)}${unitJosa(s.unit, "이", "가")} 되는 것은 ` +
        `${expr(decStr(c.x10, 1))} 뿐입니다.`,
    ],
  );
}

// ── 난이도 갈래 (D-72 확대 9차분) — 초6 `2-4 비례식과 비례배분` (5소단원 · 20갈래) ──
//
// 앞 여덟 차분과 다른 점 하나가 이 대단원 전체를 지배한다 — **답이 «순서 있는 짝»** 이다.
// ⑴ `$3:4$` 와 `$4:3$` 은 **다른 답**이다. 그런데 값 검산이 흔히 쓰는 잣대(두 항의 곱·합,
//    비율을 약분한 값)는 그 둘을 **구조적으로 못 가른다** — 곱도 합도 같다. 그래서 시험은
//    비를 **왼쪽·오른쪽 따로** 대조한다. 2-4-1 응용은 오답 후보를 일부러 **뒤집은 비**로
//    놓았다: 그 대조가 죽으면 문항의 답이 둘이 되어 지면 자체가 틀린다.
// ⑵ 2-4-2 는 소단원이 「**간단한** 자연수의 비로 나타내기」라고 약속한다 — 답의 두 항이
//    서로소가 아니면 **값은 맞는데 답이 아니다**. 시험은 답의 최대공약수를 재고,
//    `probe-elem-section-conditions.ts` 는 반대편(지면에 «간단히 할 것»이 남았는가)을 잰다.
// ⑶ 비례배분의 몫은 **자연수로 떨어져야** 한다. 「떨어지면 좋고」가 아니라 전체를
//    `(a+b)\times k` 로 **지어서** 보장한다. 시험이 그 나눗셈을 다시 해 본다.
// ⑷ 「$X$ 가 $Y$ 보다 더 많이」처럼 **낱말이 값을 주장하는** 자리는 값을 먼저 정하고
//    낱말을 뒤에 고른다 — 2-2-4 반려 선례(소재를 먼저 골라 「긴 막대」가 더 짧았다,
//    2000 씨앗 중 7건). 씨앗 전량으로 잠근다.
// ⑸ 비 뒤에 조사를 붙일 때는 **뒤 항**의 소리로 고른다(`numJosa`) — `$3:4$` 는
//    「삼 대 사」다. 파일 머리 `josa` 주석이 「쓰지 말라」고 한 자리이므로, 쓰는 곳은
//    이 규칙을 지킨 곳뿐이다.

/**
 * 서로소인 두 항. 지면의 비는 **가장 간단한 자연수의 비**로만 세운다
 * (`2:4` 는 교재에 안 쓴다 — 표준 `proportion` 이 이미 그렇게 한다).
 *
 * 폴백은 **이웃한 두 수**다 — `gcd(n, n±1)=1` 이라 늘 서로소이고 범위도 안 벗어난다.
 * (예전 폴백 후보 `[a, lo]` 는 `a=4, lo=2` 에서 서로소가 아니다.)
 */
function coprimePair(rng: Rng, lo: number, hi: number): [number, number] {
  const a = intBetween(rng, lo, hi);
  for (let t = 0; t < 30; t += 1) {
    const b = intBetween(rng, lo, hi);
    if (b !== a && gcd(a, b) === 1) return [a, b];
  }
  return [a, a > lo ? a - 1 : a + 1];
}

/** 「두 항을 최대공약수로 나눈다」 한 문장. 이미 서로소면 **그 사실을** 대신 적는다. */
function simplifySentence(a: number, b: number): string {
  const g = gcd(a, b);
  return g === 1
    ? `두 항의 최대공약수가 ${num(1)}이므로 ${expr(`${a}:${b}`)}${numJosa(b, "이", "가")} 가장 간단한 자연수의 비입니다.`
    : `두 항을 최대공약수 ${num(g)}${numRo(g)} 나누면 ${expr(`${a / g}:${b / g}`)} 입니다.`;
}

// ── 2-4-1 비의 성질 알아보기 ──

/** 2-4-1 기본 — 한 상자에 같이 담는 두 물건. 세는 말이 물건마다 다르다. */
const BOX_GOODS = [
  { x: "사과", cx: "개", y: "배", cy: "개" },
  { x: "연필", cx: "자루", y: "공책", cy: "권" },
  { x: "장미", cx: "송이", y: "국화", cy: "송이" },
  { x: "붕어빵", cx: "개", y: "우유", cy: "병" },
] as const;

/** 연산 — 비의 성질 한 번. 전항·후항에 같은 수를 곱하거나 나눈다. */
function ratioPropCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  if (rng() < 0.5) {
    const k = intBetween(rng, 2, 7);
    return make(
      unit,
      `다음 비의 전항과 후항에 각각 ${num(k)}${numJosa(k, "을", "를")} 곱한 비를 쓰시오.\n\n${expr(`${a}:${b}`)}`,
      expr(`${a * k}:${b * k}`),
      `비의 전항과 후항에 ${num(0)}이 아닌 같은 수를 곱해도 비율은 같습니다. ` +
        `${expr(`${a}\\times${k}:${b}\\times${k}=${a * k}:${b * k}`)}`,
    );
  }
  const g = intBetween(rng, 2, 7);
  return make(
    unit,
    `다음 비의 전항과 후항을 각각 ${num(g)}${numRo(g)} 나눈 비를 쓰시오.\n\n${expr(`${a * g}:${b * g}`)}`,
    expr(`${a}:${b}`),
    `비의 전항과 후항을 ${num(0)}이 아닌 같은 수로 나누어도 비율은 같습니다. ` +
      `${expr(`${a * g}\\div${g}:${b * g}\\div${g}=${a}:${b}`)}`,
  );
}

/** 기본 — 한 겹 문장제. 상자 수만큼 두 물건이 같이 늘어난다(비의 성질이 상황에 서 있다). */
function ratioPropWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const g = pick(rng, BOX_GOODS);
  const [a, b] = coprimePair(rng, 2, 6);
  const k = intBetween(rng, 2, 6);
  return make(
    unit,
    `한 상자에 ${g.x} ${num(a)}${g.cx}${josa(g.cx, "과", "와")} ${g.y} ${num(b)}${g.cy}${josa(g.cy, "을", "를")} 담습니다. ` +
      `이런 상자 ${num(k)}개에 담긴 ${g.x} 수와 ${g.y} 수의 비를 쓰시오.`,
    expr(`${a * k}:${b * k}`),
    `상자 ${num(k)}개에는 ${g.x}${josa(g.x, "이", "가")} ${expr(`${a}\\times${k}=${a * k}`)} ${g.cx}, ` +
      `${g.y}${josa(g.y, "이", "가")} ${expr(`${b}\\times${k}=${b * k}`)} ${g.cy} 있습니다. ` +
      `${g.x} 수와 ${g.y} 수의 비는 ${expr(`${a * k}:${b * k}`)} 입니다.`,
  );
}

/**
 * 응용 — 두 걸음. 두 비의 비율을 각각 따져 같은 것을 고른다.
 *
 * ⚠️ 오답 후보를 일부러 **전항과 후항을 뒤집은 비**로 놓았다. 두 항의 곱도 합도 같아서
 * 「값이 맞나」만 보는 검산으로는 정답과 오답이 **구별되지 않는다** — 왼쪽·오른쪽을
 * 따로 봐야 하는 이유가 지면에 서 있는 자리다.
 */
function ratioPropApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 6);
  const right = `${a * k}:${b * k}`;
  const wrong = `${b * k}:${a * k}`;
  const rightFirst = rng() < 0.5;
  return make(
    unit,
    `다음 두 비 중에서 ${expr(`${a}:${b}`)}${numJosa(b, "과", "와")} 비율이 같은 비를 찾아 쓰시오.\n\n` +
      (rightFirst
        ? `${expr(right)}, ${expr(wrong)}`
        : `${expr(wrong)}, ${expr(right)}`),
    expr(right),
    `${expr(right)}${numJosa(b * k, "은", "는")} ${expr(`${a}:${b}`)} 의 전항과 후항에 각각 ` +
      `${num(k)}${numJosa(k, "을", "를")} 곱한 비이므로 비율이 같습니다. ` +
      `${expr(wrong)}${numJosa(a * k, "은", "는")} 전항과 후항이 바뀌어 비율이 다릅니다.`,
  );
}

/** 심화 — ⓐ 두 항의 «합» 조건과 결합 ⓑ 곱하기 전 비를 되짚어 합을 구한다(역산). */
function ratioPropDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 7);
  if (intBetween(rng, 0, 1) === 0) {
    const sum = (a + b) * k;
    return make(
      unit,
      `${expr(`${a}:${b}`)}${numJosa(b, "과", "와")} 비율이 같은 비 중에서 ` +
        `전항과 후항의 합이 ${num(sum)}인 비를 쓰시오.`,
      expr(`${a * k}:${b * k}`),
      `${expr(`${a}:${b}`)} 의 두 항의 합은 ${expr(`${a}+${b}=${a + b}`)} 입니다. ` +
        `${expr(`${sum}\\div${a + b}=${k}`)} 이므로 두 항에 각각 ${num(k)}${numJosa(k, "을", "를")} 곱합니다. ` +
        `${expr(`${a * k}:${b * k}`)} 입니다.`,
    );
  }
  return make(
    unit,
    `어떤 비의 전항과 후항에 각각 ${num(k)}${numJosa(k, "을", "를")} 곱했더니 ` +
      `${expr(`${a * k}:${b * k}`)}${numJosa(b * k, "이", "가")} 되었습니다. ` +
      `처음 비의 전항과 후항의 합은 얼마입니까?`,
    num(a + b),
    `처음 비는 두 항을 각각 ${num(k)}${numRo(k)} 나눈 ${expr(`${a}:${b}`)} 입니다. ` +
      `두 항의 합은 ${expr(`${a}+${b}=${a + b}`)} 입니다.`,
  );
}

// ── 2-4-2 간단한 자연수의 비로 나타내기 ──

/** 2-4-2 기본 — 소수 한 자리로 재는 두 재료. */
const MIX_STUFF = [
  { x: "주스", y: "우유", u: "L" },
  { x: "물", y: "식초", u: "L" },
  { x: "밀가루", y: "설탕", u: "kg" },
  { x: "간장", y: "참기름", u: "L" },
] as const;

/** 2-4-2 응용 — 한쪽은 분수, 한쪽은 소수로 잰 두 끈. */
const MIX_STRINGS = [
  { x: "빨간 끈", y: "파란 끈" },
  { x: "노란 리본", y: "초록 리본" },
  { x: "굵은 철사", y: "가는 철사" },
] as const;

/**
 * 2-4-2 심화 — **단위가 서로 다른** 두 양. `per` 는 큰 단위 한 개가 작은 단위 몇인가.
 *
 * 조사는 단위를 **소리 내어 읽은** 끝소리가 정한다(킬로그램**과** · 미터**와**) —
 * 글자 `kg` 만 봐서는 못 고른다. 그래서 손으로 적는다.
 */
const UNIT_MIX = [
  // ⚠️ 소재(`names`)는 **그 단위로 잴 수 있는 것**이어야 한다 — 길이 단위에 「물통에 담은」을
  //    쓰면 지면이 말이 안 된다. 그래서 소재를 단위와 한 줄에 묶어 둔다.
  //    `names` 는 셋이다 — 심화가 「A:B 와 B, C 에서 A:C」로 **양 셋을 엮기** 때문이다.
  {
    big: "m",
    small: "cm",
    per: 100,
    ro: "로",
    noun: "길이",
    names: ["빨간 끈", "파란 끈", "노란 끈"],
  },
  {
    big: "kg",
    small: "g",
    per: 1000,
    ro: "으로",
    noun: "무게",
    names: ["밀가루", "설탕", "소금"],
  },
  {
    big: "L",
    small: "mL",
    per: 1000,
    ro: "로",
    noun: "양",
    names: ["물", "주스", "우유"],
  },
] as const;

/** 연산 — 자연수 비 하나. 최대공약수로 나눈다. */
function simpleRatioCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const g = intBetween(rng, 2, 9);
  return make(
    unit,
    `다음 비를 가장 간단한 자연수의 비로 나타내시오.\n\n${expr(`${a * g}:${b * g}`)}`,
    expr(`${a}:${b}`),
    `두 항을 최대공약수 ${num(g)}${numRo(g)} 나눕니다. ` +
      `${expr(`${a * g}\\div${g}:${b * g}\\div${g}=${a}:${b}`)}`,
  );
}

/** 기본 — 한 겹 문장제. 소수 한 자리로 잰 두 양을 자연수 비로 고친다. */
function simpleRatioWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, MIX_STUFF);
  const p = intBetween(rng, 2, 9);
  let q = intBetween(rng, 2, 9);
  for (let t = 0; t < 20 && q === p; t += 1) q = intBetween(rng, 2, 9);
  if (q === p) q = p === 9 ? 8 : p + 1;
  const g = gcd(p, q);
  return make(
    unit,
    `${s.x}의 양은 ${unitNum(decStr(p, 1), s.u)} 이고 ${s.y}의 양은 ${unitNum(decStr(q, 1), s.u)} 입니다. ` +
      `${s.x}의 양과 ${s.y}의 양의 비를 가장 간단한 자연수의 비로 나타내시오.`,
    expr(`${p / g}:${q / g}`),
    `소수 첫째 자리까지 있으므로 두 항에 각각 ${num(10)}${numJosa(10, "을", "를")} 곱하면 ` +
      `${expr(`${p}:${q}`)} 입니다. ${simplifySentence(p, q)}`,
  );
}

/** 응용 — 두 걸음. 분수는 소수로 고치고, 그 다음 자연수 비로 만든다. */
function simpleRatioApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, MIX_STRINGS);
  const d = pick(rng, [2, 4, 5] as const);
  const t = coprimeTop(rng, d, 1, d - 1);
  const a100 = (t * 100) / d;
  let c10 = intBetween(rng, 2, 9);
  for (let i = 0; i < 20 && c10 * 10 === a100; i += 1)
    c10 = intBetween(rng, 2, 9);
  const b100 = c10 * 10;
  // 두 항이 모두 소수 첫째 자리까지면 `10`배로 족하다 — 해설이 하는 말이 참이어야 한다.
  const mult = a100 % 10 === 0 && b100 % 10 === 0 ? 10 : 100;
  const shrink = 100 / mult;
  const A = a100 / shrink;
  const B = b100 / shrink;
  const g = gcd(A, B);
  return make(
    unit,
    `${s.x}의 길이는 ${unitNum(`\\frac{${t}}{${d}}`, "m")} 이고 ${s.y}의 길이는 ${unitNum(decStr(c10, 1), "m")} 입니다. ` +
      `${s.x}의 길이와 ${s.y}의 길이의 비를 가장 간단한 자연수의 비로 나타내시오.`,
    expr(`${A / g}:${B / g}`),
    `${expr(`\\frac{${t}}{${d}}`)}${numJosa(t, "을", "를")} 소수로 고치면 ` +
      `${expr(`${t}\\div${d}=${fromCents(a100)}`)} 입니다. 두 항에 각각 ${num(mult)}${numJosa(mult, "을", "를")} 곱하면 ` +
      `${expr(`${A}:${B}`)} 입니다. ${simplifySentence(A, B)}`,
  );
}

/**
 * 심화 — **양 셋을 엮는다.** ㉠ 단위를 맞추고 ㉡ 주어진 비로 첫째 양을 되짚은 뒤
 * ㉢ 셋째 양과의 비를 간단히 한다.
 *
 * ⚠️ 예전에는 「$1.6$ L 와 $800$ mL 의 비」였다 — 단위 맞추기 + 약분 **두 걸음**인데
 *    같은 소단원 응용도 소수 고치기 + 약분 두 걸음이라 **무게가 같았다.** 사다리가 안 올랐다.
 *    그래서 문턱을 「걸음 수」가 아니라 **엮는 양의 수**로 올렸다 — 둘에서 셋으로.
 */
function simpleRatioDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const u = pick(rng, UNIT_MIX);
  const [x, y, z] = u.names;
  const [a, b] = coprimePair(rng, 2, 9);
  const step = u.per / 10;
  // 가운데 양은 큰 단위로 적는다 — 소수 한 자리가 늘 남게 10 의 배수인 짝은 뺀다(`2.0` 방지).
  const k = pick(
    rng,
    [2, 3, 4, 5, 6, 8].filter((v) => (b * v) % 10 !== 0),
  );
  const mid = b * k * step; // 가운데 양 (작은 단위)
  const first = a * k * step; // 되짚어 얻는 첫째 양
  // ⚠️ 답이 **주어진 비와 같아지는** 셋째 양은 뺀다 — 되짚을 까닭이 사라져서
  //    「그대로 옮겨 적으면 맞는」 문항이 된다(값은 맞으므로 검산으로는 안 잡힌다).
  const third =
    pick(
      rng,
      [2, 3, 4, 5, 6, 7, 8, 9].filter((c) => {
        const gg = gcd(a * k, c);
        return !((a * k) / gg === a && c / gg === b);
      }),
    ) * step;
  const g = gcd(first, third);
  return makeDeep(
    unit,
    `${x}의 ${u.noun}${josa(u.noun, "과", "와")} ${y}의 ${u.noun}의 비는 ${expr(`${a}:${b}`)} 입니다. ` +
      `${y}${josa(y, "이", "가")} ${unitNum(decStr(b * k, 1), u.big)} 이고 ` +
      `${z}${josa(z, "이", "가")} ${unitNum(third, u.small)} 일 때, ` +
      `${x}의 ${u.noun}${josa(u.noun, "과", "와")} ${z}의 ${u.noun}의 비를 가장 간단한 자연수의 비로 나타내시오.`,
    expr(`${first / g}:${third / g}`),
    [
      `${expr(`1\\,\\mathrm{${u.big}}=${u.per}\\,\\mathrm{${u.small}}`)} 이므로 ${y}${josa(y, "은", "는")} ` +
        `${expr(`${decStr(b * k, 1)}\\times${u.per}=${mid}`)} 입니다.`,
      `비가 ${expr(`${a}:${b}`)} 이므로 한 몫은 ${expr(`${mid}\\div${b}=${k * step}`)} 이고, ` +
        `${x}${josa(x, "은", "는")} ${expr(`${k * step}\\times${a}=${first}`)} 입니다.`,
      `${expr(`${first}:${third}`)} 입니다. ${simplifySentence(first, third)}`,
    ],
  );
}

// ── 2-4-3 비례식 알아보기 ──

/** 2-4-3 기본 — 닮은 직사각형 두 개를 놓는 소재. */
const RECT_THINGS = ["액자", "깃발", "게시판", "카드"] as const;

/** 연산 — 외항·내항의 «자리»를 아는가만 묻는다. */
function propEqCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 6);
  const inner = rng() < 0.5;
  return make(
    unit,
    `다음 비례식에서 ${inner ? "내항" : "외항"}을 모두 쓰시오.\n\n${expr(`${a}:${b}=${a * k}:${b * k}`)}`,
    inner ? expr(`${b},\\ ${a * k}`) : expr(`${a},\\ ${b * k}`),
    inner
      ? `비례식의 안쪽에 있는 두 수가 내항입니다. ${expr(`${b},\\ ${a * k}`)} 입니다.`
      : `비례식의 바깥쪽에 있는 두 수가 외항입니다. ${expr(`${a},\\ ${b * k}`)} 입니다.`,
  );
}

/**
 * 기본 — 한 겹 문장제. 두 직사각형의 «가로:세로» 가 같음을 비례식으로 적는다.
 *
 * 「작은·큰」은 낱말이 값을 주장하는 자리다. 여기서는 `k >= 2` 라 **구성으로** 참이다
 * (2-4-5 심화처럼 값에 따라 갈리는 자리는 낱말을 값 뒤에 고른다).
 * 답이 하나로 정해지도록 「작은 것을 앞에」를 발문이 못 박는다.
 */
function propEqWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, RECT_THINGS);
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 5);
  return make(
    unit,
    `작은 ${thing}의 가로와 세로는 각각 ${unitNum(a, "cm")}, ${unitNum(b, "cm")} 이고, ` +
      `큰 ${thing}의 가로와 세로는 각각 ${unitNum(a * k, "cm")}, ${unitNum(b * k, "cm")} 입니다. ` +
      `두 ${thing}의 가로와 세로의 비는 비율이 같습니다. 이것을 비례식으로 나타내시오. ` +
      `단, 작은 ${thing}의 비를 앞에 쓰시오.`,
    expr(`${a}:${b}=${a * k}:${b * k}`),
    `작은 ${thing}의 가로와 세로의 비는 ${expr(`${a}:${b}`)}, 큰 ${thing}의 가로와 세로의 비는 ` +
      `${expr(`${a * k}:${b * k}`)} 입니다. 비율이 같으므로 ${expr(`${a}:${b}=${a * k}:${b * k}`)} 입니다.`,
  );
}

/** 응용 — 두 걸음. 두 식의 비율을 각각 따져 «비례식인 것»을 고른다. */
function propEqApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 5);
  const m = intBetween(rng, 1, 4);
  const right = `${a}:${b}=${a * k}:${b * k}`;
  // 오답은 「두 항에 같은 수를 **더한**」 흔한 오개념이다 — 비율이 지켜지지 않는다.
  const wrong = `${a}:${b}=${a + m}:${b + m}`;
  // 지면의 분수는 기약으로 적는다 — 약분되는 것만 «약분해 보이는 등식»으로 쓴다.
  const wg = gcd(a + m, b + m);
  const wrongRatio =
    wg === 1
      ? `\\frac{${a + m}}{${b + m}}`
      : `\\frac{${a + m}}{${b + m}}=\\frac{${(a + m) / wg}}{${(b + m) / wg}}`;
  const rightFirst = rng() < 0.5;
  return make(
    unit,
    `다음 두 식 중에서 비례식을 찾아 쓰시오.\n\n` +
      (rightFirst
        ? `${expr(right)}, ${expr(wrong)}`
        : `${expr(wrong)}, ${expr(right)}`),
    expr(right),
    `${expr(`\\frac{${a * k}}{${b * k}}=\\frac{${a}}{${b}}`)} 이므로 ${expr(right)} 의 두 비는 비율이 같습니다. ` +
      // 분수 뒤 조사는 **분자**가 정한다(「팔분의 구」) — R-조사가 이 자리를 잡았다.
      // 등식으로 적을 때는 **마지막에 읽히는** 분자, 곧 약분한 쪽이 조사를 정한다.
      `두 항에 같은 수를 더하면 비율이 달라지므로 ${expr(wrongRatio)}${numJosa((a + m) / wg, "은", "는")} ` +
      `${expr(`\\frac{${a}}{${b}}`)}${numJosa(a, "과", "와")} 다릅니다.`,
  );
}

/** 심화 — 두 항의 «차» 조건으로 두 번째 비를 되짚어 비례식을 완성한다. */
function propEqDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 7);
  const gap = Math.abs(a - b);
  const diff = gap * k;
  return make(
    unit,
    `비례식 ${expr(`${a}:${b}=\\square:\\square`)} 에서 두 번째 비의 전항과 후항의 차가 ${num(diff)}입니다. ` +
      `이 비례식을 완성하여 쓰시오.`,
    expr(`${a}:${b}=${a * k}:${b * k}`),
    `두 번째 비는 ${expr(`${a}:${b}`)} 의 두 항에 같은 수를 곱한 비입니다. ` +
      `${expr(`${a}:${b}`)} 의 두 항의 차는 ${num(gap)}이고 ${expr(`${diff}\\div${gap}=${k}`)} 이므로 ` +
      `두 항에 각각 ${num(k)}${numJosa(k, "을", "를")} 곱합니다. ${expr(`${a}:${b}=${a * k}:${b * k}`)} 입니다.`,
  );
}

// ── 2-4-4 비례식의 성질 알아보기 ──

/** 2-4-4 기본 — 개수와 값이 함께 늘어나는 물건. */
const PRICE_GOODS = [
  { name: "연필", c: "자루" },
  { name: "공책", c: "권" },
  { name: "지우개", c: "개" },
  { name: "색종이", c: "장" },
] as const;

/** 연산 — □ 를 네 자리 중 하나에 놓는다. 외항의 곱 = 내항의 곱 한 번. */
function propRuleCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 6);
  const full: number[] = [a, b, a * k, b * k];
  const pos = intBetween(rng, 0, 3);
  const cell = (i: number) => (i === pos ? "\\square" : String(full[i]));
  const outer = pos === 0 || pos === 3;
  const otherIdx = pos === 0 ? 3 : pos === 3 ? 0 : pos === 1 ? 2 : 1;
  // □ 가 외항이면 **내항**의 곱이, 내항이면 **외항**의 곱이 «아는 쪽»이다.
  const kx = outer ? full[1] : full[0];
  const ky = outer ? full[2] : full[3];
  const known = kx * ky;
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 구하시오.\n\n${expr(`${cell(0)}:${cell(1)}=${cell(2)}:${cell(3)}`)}`,
    num(full[pos]),
    `비례식에서 외항의 곱과 내항의 곱은 같습니다. ` +
      `${outer ? "내항" : "외항"}의 곱은 ${expr(`${kx}\\times${ky}=${known}`)} 입니다. ` +
      `${expr(`\\square=${known}\\div${full[otherIdx]}=${full[pos]}`)} 입니다.`,
  );
}

/** 기본 — 한 겹 문장제. 개수와 값의 비례식을 세워 한 번 푼다. */
function propRuleWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const g = pick(rng, PRICE_GOODS);
  const a = intBetween(rng, 2, 6);
  const per = pick(rng, [200, 300, 500, 700] as const);
  const c = a * per;
  const k = intBetween(rng, 2, 5);
  return make(
    unit,
    `${g.name} ${num(a)}${g.c}의 값이 ${num(c)}원입니다. 같은 ${g.name} ${num(a * k)}${g.c}의 값은 몇 원입니까?`,
    num(c * k),
    `${g.name} 수와 값의 비가 같으므로 ${expr(`${a}:${c}=${a * k}:\\square`)} 입니다. ` +
      `외항의 곱과 내항의 곱이 같으므로 ${expr(`${c}\\times${a * k}\\div${a}=${c * k}`)} 입니다.`,
  );
}

/** 응용 — 두 걸음. 비례식으로 필요한 양을 구하고, 가진 양을 뺀다. */
function propRuleApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = pick(rng, [8, 10, 12, 15] as const);
  const a = intBetween(rng, 2, 5);
  const d = a * r;
  const need = a + intBetween(rng, 2, 8);
  const far = need * r;
  const have = intBetween(rng, 1, need - 1);
  return make(
    unit,
    `휘발유 ${unitNum(a, "L")} 로 ${unitNum(d, "km")} 를 가는 자동차가 있습니다. ` +
      `이 자동차로 ${unitNum(far, "km")} 를 가려고 합니다. 지금 휘발유가 ${unitNum(have, "L")} 있다면 ` +
      `휘발유를 몇 L 더 넣어야 합니까?`,
    num(need - have),
    `필요한 휘발유를 ${expr("\\square")} 라 하면 ${expr(`${a}:${d}=\\square:${far}`)} 입니다. ` +
      `외항의 곱과 내항의 곱이 같으므로 ${expr(`${a}\\times${far}\\div${d}=${need}`)} 입니다. ` +
      `${expr(`${need}-${have}=${need - have}`)} 이므로 ${unitNum(need - have, "L")} 를 더 넣어야 합니다.`,
  );
}

/** 심화 — 역산. ⓐ 외항의 곱에서 내항을 ⓑ 내항 둘에서 나머지 외항을 되짚는다. */
function propRuleDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 7);
  if (intBetween(rng, 0, 1) === 0) {
    const prod = a * b * k;
    const useB = rng() < 0.5;
    const known = useB ? b : a * k;
    const want = useB ? a * k : b;
    return make(
      unit,
      `어떤 비례식에서 외항의 곱이 ${num(prod)}입니다. 내항 중 하나가 ${num(known)}일 때 다른 내항을 구하시오.`,
      num(want),
      `비례식에서 외항의 곱과 내항의 곱은 같으므로 내항의 곱도 ${num(prod)}입니다. ` +
        `${expr(`${prod}\\div${known}=${want}`)} 입니다.`,
    );
  }
  const prod = b * (a * k);
  return make(
    unit,
    `어떤 비례식에서 내항은 ${num(b)}${numJosa(b, "과", "와")} ${num(a * k)} 입니다. ` +
      `외항 중 하나가 ${num(a)}일 때 나머지 외항을 구하시오.`,
    num(b * k),
    `내항의 곱은 ${expr(`${b}\\times${a * k}=${prod}`)} 입니다. 외항의 곱도 ${num(prod)}이므로 ` +
      `${expr(`${prod}\\div${a}=${b * k}`)} 입니다.`,
  );
}

// ── 2-4-5 비례배분 ──

/** 두 사람 — **이름은 값을 주장하지 않는다.** 누가 더 많은지는 비가 정한다. */
const SHARE_KIDS = [
  { one: "준서", two: "하윤" },
  { one: "도현", two: "채원" },
  { one: "은우", two: "소율" },
  { one: "지안", two: "예준" },
] as const;

/** 세 사람 — 응용의 세 항 비례배분. */
const SHARE_TRIOS = [
  ["민서", "하준", "예린"],
  ["시우", "다은", "건우"],
  ["아윤", "서진", "태호"],
] as const;

/** 세 항 비는 **전체의 최대공약수가 1**인 것만 쓴다(가장 간단한 자연수의 비). */
const SHARE_TRIPLES = [
  [1, 2, 3],
  [2, 3, 4],
  [1, 2, 2],
  [2, 3, 5],
  [1, 3, 4],
  [3, 4, 5],
  [1, 1, 2],
  [2, 2, 3],
] as const;

const SHARE_ITEMS = [
  { name: "색종이", c: "장" },
  { name: "구슬", c: "개" },
  { name: "젤리", c: "개" },
  { name: "스티커", c: "장" },
] as const;

/** 연산 — 수 하나를 두 몫으로 가른다. 전체는 `(a+b)*k` 라 늘 나누어떨어진다. */
function shareCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 5);
  const k = intBetween(rng, 3, 9);
  const total = (a + b) * k;
  return make(
    unit,
    `${num(total)}${numJosa(total, "을", "를")} ${expr(`${a}:${b}`)}${numRo(b)} 비례배분하면 두 수는 각각 얼마입니까?`,
    expr(`${a * k},\\ ${b * k}`),
    `전체를 ${expr(`${a}+${b}=${a + b}`)} 묶음으로 나누면 한 묶음은 ${expr(`${total}\\div${a + b}=${k}`)} 입니다. ` +
      `각각 ${expr(`${k}\\times${a}=${a * k}`)}, ${expr(`${k}\\times${b}=${b * k}`)} 입니다.`,
  );
}

/** 기본 — 한 겹 문장제. **누구의 몫을 묻는지**가 씨앗마다 바뀐다(자리가 뜻이다). */
function shareWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const kid = pick(rng, SHARE_KIDS);
  const item = pick(rng, SHARE_ITEMS);
  const [a, b] = coprimePair(rng, 2, 5);
  const k = intBetween(rng, 3, 9);
  const total = (a + b) * k;
  const first = rng() < 0.5;
  const who = first ? kid.one : kid.two;
  const part = first ? a : b;
  return make(
    unit,
    `${item.name} ${num(total)}${item.c}${josa(item.c, "을", "를")} ${kid.one}${josa(kid.one, "과", "와")} ` +
      `${kid.two}${josa(kid.two, "이", "가")} ${expr(`${a}:${b}`)}${numRo(b)} 나누어 가지려고 합니다. ` +
      `${who}${josa(who, "이", "가")} 갖는 ${item.name}${josa(item.name, "은", "는")} 몇 ${item.c}입니까?`,
    num(part * k),
    `전체를 ${expr(`${a}+${b}=${a + b}`)} 묶음으로 나누면 한 묶음은 ${expr(`${total}\\div${a + b}=${k}`)} ${item.c}입니다. ` +
      `${who}${josa(who, "은", "는")} ${num(part)}묶음이므로 ${expr(`${k}\\times${part}=${part * k}`)} ${item.c}입니다.`,
  );
}

/** 응용 — ⓐ 세 항 비례배분(자리가 셋) ⓑ 둘레를 가로·세로로 갈라 넓이까지 간다. */
function shareApply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const trio = pick(rng, SHARE_TRIOS);
    const item = pick(rng, SHARE_ITEMS);
    const t = pick(rng, SHARE_TRIPLES);
    const k = intBetween(rng, 3, 8);
    const sum = t[0] + t[1] + t[2];
    const total = sum * k;
    const idx = intBetween(rng, 0, 2);
    const who = trio[idx];
    return make(
      unit,
      `${item.name} ${num(total)}${item.c}${josa(item.c, "을", "를")} ${trio[0]}, ${trio[1]}, ` +
        `${trio[2]}${josa(trio[2], "이", "가")} ${expr(`${t[0]}:${t[1]}:${t[2]}`)}${numRo(t[2])} 나누어 가지려고 합니다. ` +
        `${who}${josa(who, "이", "가")} 갖는 ${item.name}${josa(item.name, "은", "는")} 몇 ${item.c}입니까?`,
      num(t[idx] * k),
      `전체를 ${expr(`${t[0]}+${t[1]}+${t[2]}=${sum}`)} 묶음으로 나누면 한 묶음은 ` +
        `${expr(`${total}\\div${sum}=${k}`)} ${item.c}입니다. ` +
        `${who}${josa(who, "은", "는")} ${num(t[idx])}묶음이므로 ${expr(`${k}\\times${t[idx]}=${t[idx] * k}`)} ${item.c}입니다.`,
    );
  }
  const [a, b] = coprimePair(rng, 2, 5);
  const k = intBetween(rng, 2, 8);
  const w = a * k;
  const h = b * k;
  const around = 2 * (w + h);
  return make(
    unit,
    `둘레가 ${unitNum(around, "cm")} 이고 가로와 세로의 길이의 비가 ${expr(`${a}:${b}`)} 인 직사각형이 있습니다. ` +
      `이 직사각형의 넓이는 몇 ${expr("\\mathrm{cm}^2")} 입니까?`,
    num(w * h),
    `가로와 세로의 합은 ${expr(`${around}\\div2=${w + h}`)} 입니다. 이것을 ${expr(`${a}:${b}`)}${numRo(b)} ` +
      `비례배분하면 가로는 ${unitNum(w, "cm")}, 세로는 ${unitNum(h, "cm")} 입니다. ` +
      `넓이는 ${expr(`${w}\\times${h}=${w * h}`)} 입니다.`,
  );
}

/**
 * 심화 — 역산. ⓐ 한 사람의 몫에서 ⓑ 두 몫의 «차» 에서 전체를 되짚는다.
 *
 * ⚠️ ⓑ 의 「$X$ 가 $Y$ 보다 더 많이」는 **낱말이 값을 주장하는** 자리다. 소재를 먼저
 * 고르면 값이 그 말을 배신한다(2-2-4 반려: 「긴 막대 $11$ cm, 짧은 막대 $13$ cm」,
 * 2000 씨앗 중 7건이라 표본으로는 안 보인다). 그래서 **비를 먼저 정하고** 누가
 * «더 많은 쪽»인지 그 값에서 고른다.
 */
function shareDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const kid = pick(rng, SHARE_KIDS);
  const item = pick(rng, SHARE_ITEMS);
  const [a, b] = coprimePair(rng, 2, 5);
  const k = intBetween(rng, 3, 9);
  const total = (a + b) * k;
  if (intBetween(rng, 0, 1) === 0) {
    const first = rng() < 0.5;
    const who = first ? kid.one : kid.two;
    const part = first ? a : b;
    return make(
      unit,
      `${item.name}${josa(item.name, "을", "를")} ${kid.one}${josa(kid.one, "과", "와")} ` +
        `${kid.two}${josa(kid.two, "이", "가")} ${expr(`${a}:${b}`)}${numRo(b)} 나누어 가졌더니 ` +
        `${who}${josa(who, "이", "가")} ${num(part * k)}${item.c}${josa(item.c, "을", "를")} 가졌습니다. ` +
        `처음 ${item.name}${josa(item.name, "은", "는")} 모두 몇 ${item.c}입니까?`,
      num(total),
      `${who}${josa(who, "은", "는")} ${num(part)}묶음을 가졌으므로 한 묶음은 ` +
        `${expr(`${part * k}\\div${part}=${k}`)} ${item.c}입니다. 전체는 ` +
        `${expr(`${a}+${b}=${a + b}`)} 묶음이므로 ${expr(`${k}\\times${a + b}=${total}`)} ${item.c}입니다.`,
    );
  }
  // 값이 먼저다 — 누가 «더 많은 쪽»인지는 비가 정한다.
  const more = a > b ? kid.one : kid.two;
  const less = a > b ? kid.two : kid.one;
  const gap = Math.abs(a - b);
  return make(
    unit,
    `${item.name}${josa(item.name, "을", "를")} ${kid.one}${josa(kid.one, "과", "와")} ` +
      `${kid.two}${josa(kid.two, "이", "가")} ${expr(`${a}:${b}`)}${numRo(b)} 나누어 가졌습니다. ` +
      `${more}${josa(more, "이", "가")} ${less}보다 ${num(gap * k)}${item.c} 더 많이 가졌다면 ` +
      `처음 ${item.name}${josa(item.name, "은", "는")} 모두 몇 ${item.c}입니까?`,
    num(total),
    `두 사람의 몫은 ${expr(`${a}:${b}`)} 이므로 차는 ${num(gap)}묶음입니다. 한 묶음은 ` +
      `${expr(`${gap * k}\\div${gap}=${k}`)} ${item.c}입니다. 전체는 ${expr(`${a}+${b}=${a + b}`)} 묶음이므로 ` +
      `${expr(`${k}\\times${a + b}=${total}`)} ${item.c}입니다.`,
  );
}

// ── 난이도 갈래 (D-72 확대 10차분) — 초6 `2-5 원의 둘레와 넓이` (4소단원 · 16갈래) ──
//
// ⑴ **한정어 규약을 물려받는다.** 2-5-3 표준을 고치며 세운 것과 같다 — 「원 안에 그린
//    마름모」는 무수히 많고, 교과서는 **그림이** 내접·외접을 정해 주는데 우리 지면에는
//    그림이 없다. 그래서 「**꼭 맞게**」 + 「**단, …**」로 답을 하나로 못 박는다.
//    2-5-1 의 정육각형·정사각형도 같은 부류라 같은 규약을 쓴다
//    (`probe-elem-section-conditions.ts` 의 needle 「원의 넓이 어림」이 2-5-3 을 잰다).
// ⑵ **원주율은 발문이 늘 적는다.** 표준이 이미 `$3$` 과 `$3.14$` 를 **둘 다** 쓴다 —
//    적지 않으면 「$3$ 으로 풀까 $3.14$ 로 풀까」가 지면에서 안 갈린다. 갈래도 늘 적는다.
// ⑶ `$3.14$` 를 쓰는 자리는 **정수 배율**(`fromCents`)로만 만든다 — 부동소수점을
//    지면에 흘리지 않는다(R2). `314 * n` 을 센트로 들고 다니다 마지막에 글자로 바꾼다.
// ⑷ 답이 «두 수 사이»인 갈래가 둘 있다(2-5-1 응용 · 2-5-3 응용). **새 답 모양을 안 만든다** —
//    이미 있는 «쌍»(`$a,\ b$`, 외항·비례배분이 쓰는 것)으로 선다. 세어 보고 정했다.

/**
 * 십분의 일 자리까지의 소수를 글자로. **꼬리 0 을 안 남긴다** — `31.0` 은 초등 지면에
 * 안 쓴다(`fromCents` 와 같은 태도). 정수 배율로만 다루므로 부동소수점을 안 거친다(R2).
 */
function fromTenths(tenths: number): string {
  return tenths % 10 === 0 ? String(tenths / 10) : decStr(tenths, 1);
}

/** 2-5-1·2-5-3 — 원 안팎에 «꼭 맞게» 그리는 도형의 조건절. 도형마다 조건이 다르다.
 *
 * ⚠️ 조건이 **둘** 필요한 갈래에서는 「단, …」을 두 번 쓰지 않는다(지면에서 어색하다).
 * 안쪽 도형을 「단, 」으로 먼저, 바깥 도형을 「또, 」로 뒤에 둔다. 순서를 뒤집지 말 것 —
 * `probe-elem-section-conditions.ts` 의 2-5-3 검사가 「단, 마름모…」 꼴을 본다.
 */
const FIT_HEX = "단, 정육각형의 여섯 꼭짓점은 모두 원 위에 있습니다.";
const FIT_RHOMBUS = "단, 마름모의 네 꼭짓점은 모두 원 위에 있습니다.";
const FIT_SQUARE = "단, 정사각형의 네 변은 모두 원에 닿습니다.";
const ALSO_SQUARE = "또, 정사각형의 네 변은 모두 원에 닿습니다.";
const ALSO_HEX = "또, 정육각형의 여섯 꼭짓점은 모두 원 위에 있습니다.";

/** 원 모양 물건 — 굴리지 않는 것. */
const ROUND_THINGS = ["접시", "시계", "쟁반", "거울"] as const;
/** 굴릴 수 있는 원 모양 물건. */
const ROLLERS = ["굴렁쇠", "자전거 바퀴", "훌라후프"] as const;

// ── 2-5-1 원주와 원주율 알아보기 ──

/** 연산 — 안팎에 꼭 맞게 그린 도형의 둘레. 지름의 몇 배인지가 이 소단원의 뼈대다. */
function circPiCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  const d = 2 * r;
  // ⚠️ 정육각형 가지는 예전에 **지름**을 줘서 `÷2` 가 붙었다 — 절차가 둘이라
  // D-72 의 「연산 = 절차 한 번」에 어긋나고, 실제로 **기본(한 걸음)보다 무거웠다.**
  // 한 변이 곧 반지름이므로 반지름을 준다. 정사각형 가지는 한 변이 지름이라 지름을 준다.
  if (rng() < 0.5) {
    return make(
      unit,
      `반지름이 ${unitNum(r, "cm")} 인 원 안에 꼭 맞게 그린 정육각형의 둘레는 몇 cm인가? ${FIT_HEX}`,
      num(6 * r),
      `여섯 꼭짓점이 모두 원 위에 있으므로 정육각형의 한 변은 반지름과 같은 ${unitNum(r, "cm")} 입니다. ` +
        `${expr(`${r}\\times6=${6 * r}`)}`,
    );
  }
  return make(
    unit,
    `지름이 ${unitNum(d, "cm")} 인 원 밖에 꼭 맞게 그린 정사각형의 둘레는 몇 cm인가? ${FIT_SQUARE}`,
    num(4 * d),
    `네 변이 모두 원에 닿으므로 정사각형의 한 변은 원의 지름과 같은 ${unitNum(d, "cm")} 입니다. ` +
      `${expr(`${d}\\times4=${4 * d}`)}`,
  );
}

/** 기본 — 한 겹 문장제. 「원주는 지름의 $3$배보다 길다」를 상황에 대 본다. */
function circPiWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, ROUND_THINGS);
  const d = intBetween(rng, 4, 20);
  return make(
    unit,
    `원 모양 ${thing}의 지름이 ${unitNum(d, "cm")} 입니다. 원주는 지름의 ${num(3)}배보다 길고 ` +
      `${num(4)}배보다 짧습니다. 이 ${thing}의 원주는 몇 cm보다 깁니까?`,
    num(3 * d),
    `원주는 지름의 ${num(3)}배보다 길므로 ${expr(`${d}\\times3=${3 * d}`)} 보다 깁니다.`,
  );
}

/** 응용 — 두 걸음. 굴러간 거리에서 지름의 **범위**를 되짚는다(답은 «쌍»). */
function circPiApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const roller = pick(rng, ROLLERS);
  const k = intBetween(rng, 2, 9);
  const c = 12 * k; // 12 의 배수라 ÷3·÷4 가 둘 다 자연수로 떨어진다
  return make(
    unit,
    `${roller}${josa(roller, "을", "를")} 한 바퀴 굴렸더니 ${unitNum(c, "cm")} 를 갔습니다. ` +
      `원주는 지름의 ${num(3)}배보다 길고 ${num(4)}배보다 짧습니다. ` +
      `이 ${roller}의 지름은 몇 cm보다 길고 몇 cm보다 짧은지 차례로 쓰시오.`,
    expr(`${c / 4},\\ ${c / 3}`),
    `한 바퀴 굴러간 거리가 원주입니다. 원주가 지름의 ${num(4)}배보다 짧으므로 지름은 ` +
      `${expr(`${c}\\div4=${c / 4}`)} 보다 길고, 원주가 지름의 ${num(3)}배보다 길므로 지름은 ` +
      `${expr(`${c}\\div3=${c / 3}`)} 보다 짧습니다.`,
  );
}

/**
 * 심화 — 역산+조건 결합. 한 도형의 둘레에서 **반대쪽** 도형의 둘레로 건너간다.
 *
 * 방향을 둘 다 낸다. 한 방향뿐이면 답이 반지름 하나로 정해져 씨앗 16개에서 가짓수가
 * 여덟을 못 채운다(실측 7) — 다양성이 모자라는 것도 갈래가 덜 선 것이다.
 */
function circPiDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `어떤 원 안에 꼭 맞게 그린 정육각형의 둘레가 ${unitNum(6 * r, "cm")} 입니다. ` +
        `같은 원 밖에 꼭 맞게 그린 정사각형의 둘레는 몇 cm인가? ${FIT_HEX} ${ALSO_SQUARE}`,
      num(8 * r),
      `정육각형의 한 변은 원의 반지름이므로 반지름은 ${expr(`${6 * r}\\div6=${r}`)} 이고 ` +
        `지름은 ${expr(`${r}\\times2=${2 * r}`)} 입니다. 정사각형의 한 변은 지름과 같으므로 ` +
        `둘레는 ${expr(`${2 * r}\\times4=${8 * r}`)} 입니다.`,
    );
  }
  return make(
    unit,
    `어떤 원 밖에 꼭 맞게 그린 정사각형의 둘레가 ${unitNum(8 * r, "cm")} 입니다. ` +
      `같은 원 안에 꼭 맞게 그린 정육각형의 둘레는 몇 cm인가? ${FIT_SQUARE} ${ALSO_HEX}`,
    num(6 * r),
    `정사각형의 한 변은 원의 지름이므로 지름은 ${expr(`${8 * r}\\div4=${2 * r}`)} 이고 ` +
      `반지름은 ${expr(`${2 * r}\\div2=${r}`)} 입니다. 정육각형의 한 변은 반지름과 같으므로 ` +
      `둘레는 ${expr(`${r}\\times6=${6 * r}`)} 입니다.`,
  );
}

// ── 2-5-2 원주와 지름 구하기 ──

/**
 * 연산 — 지름에서 원주 한 번.
 *
 * ⚠️ **원주율은 난이도 축에 건다 — D-74**(원장님 확정 2026-08-23:
 * 「원주율은 소수의 계산이 필요한 혼합문제에서 3.14까지 확장. 단순 계산 필요없이
 * 단순하게 하려면 3이나 3.1로. **난이도에 따라 문제 복잡도에 따라**」).
 *
 *   연산 `$3$` · 기본 `$3$` · 응용 `$3.1$` · 심화 `$3.14$`
 *
 * 연산·기본은 절차와 식 세우기가 과제라 원주율 자릿수가 짐이 되면 안 되고,
 * 심화가 원장님이 말한 「소수의 계산이 필요한 혼합문제」다.
 * **표준 세 자리(2-5-1 계산 · 2-5-2 원주지름 · 2-5-4 지름)는 그대로 둔다** —
 * 「확장」이지 「통일」이 아니고, 표준은 교과서를 비추는 자리다.
 *
 * 그래서 **한 시험지에 두 값이 선다.** 그러면 「$3$ 이라 적고 $3.14$ 로 계산」이
 * 지면에서만 틀리고 값 검산으로는 안 잡힌다 — 시험이 **발문에 적힌 값과 해설이
 * 실제로 곱한 값이 같은가**를 잰다(`elemTiersG6.test.ts`).
 * 표준 지름 갈래가 `$3.14$` 를 쓰므로 「지름+$3$」은 겹치지 않는다.
 */
function circLenCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  // 폭이 좁으면 씨앗 16개에서 가짓수가 여덟을 못 채운다(3~14 로는 실측 7).
  const d = intBetween(rng, 3, 24);
  return make(
    unit,
    `지름이 ${unitNum(d, "cm")} 인 원의 원주는 몇 cm인가? (원주율: ${num(3)})`,
    num(3 * d),
    `(원주)=(지름)×(원주율)입니다. ${expr(`${d}\\times3=${3 * d}`)}`,
  );
}

/** 기본 — 한 겹 문장제. 지름을 주고 테두리 길이를 묻는다. */
function circLenWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, ROUND_THINGS);
  const d = intBetween(rng, 3, 14);
  return make(
    unit,
    `지름이 ${unitNum(d, "cm")} 인 원 모양 ${thing}의 둘레에 테두리를 두르려고 합니다. ` +
      `테두리는 몇 cm가 필요한가? (원주율: ${num(3)})`,
    num(3 * d),
    `필요한 테두리의 길이는 원주와 같습니다. ${expr(`${d}\\times3=${3 * d}`)}`,
  );
}

/** 응용 — 두 걸음. 반지름에서 원주를 구하고 바퀴 수만큼 곱한다. */
function circLenApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const roller = pick(rng, ROLLERS);
  const r = intBetween(rng, 2, 9);
  const turns = intBetween(rng, 3, 12);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 ${roller}${josa(roller, "을", "를")} ${num(turns)}바퀴 굴렸습니다. ` +
      `굴러간 거리는 몇 cm인가? (원주율: ${num("3.1")})`,
    num(fromTenths(62 * r * turns)),
    `지름은 ${expr(`${r}\\times2=${2 * r}`)} 이고 원주는 ` +
      `${expr(`${2 * r}\\times3.1=${fromTenths(62 * r)}`)} 입니다. ` +
      `${expr(`${fromTenths(62 * r)}\\times${turns}=${fromTenths(62 * r * turns)}`)} 이므로 ` +
      `${unitNum(fromTenths(62 * r * turns), "cm")} 를 갔습니다.`,
  );
}

/** 심화 — 역산. 굴러간 거리와 바퀴 수에서 반지름을 되짚는다. */
function circLenDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const roller = pick(rng, ROLLERS);
  const r = intBetween(rng, 2, 9);
  const turns = intBetween(rng, 3, 12);
  // 역산이 $3.14$ 로 나누므로 **답에서 거꾸로 짓는다** — 앞에서 뽑아 나누면
  // 딱 안 떨어진다(D-74 ㉠). 반지름을 먼저 정하고 굴러간 거리를 만든다.
  const perTurn = 628 * r; // 원주(센트) = 지름 × 3.14
  const total = perTurn * turns;
  return make(
    unit,
    `${roller}${josa(roller, "을", "를")} ${num(turns)}바퀴 굴렸더니 ${unitNum(fromCents(total), "cm")} 를 갔습니다. ` +
      `이 ${roller}의 반지름은 몇 cm인가? (원주율: ${num("3.14")})`,
    num(r),
    `원주는 ${expr(`${fromCents(total)}\\div${turns}=${fromCents(perTurn)}`)} 입니다. ` +
      `지름은 ${expr(`${fromCents(perTurn)}\\div3.14=${2 * r}`)} 이고 ` +
      `반지름은 ${expr(`${2 * r}\\div2=${r}`)} 입니다.`,
  );
}

// ── 2-5-3 원의 넓이 어림하기 ──

/** 연산 — 지름을 주고 안팎 도형의 넓이 하나. (표준은 **반지름**을 준다 — 묻는 자리가 다르다.) */
function circAppCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 3, 16);
  const d = 2 * r;
  if (rng() < 0.5) {
    return make(
      unit,
      `지름이 ${unitNum(d, "cm")} 인 원 안에 꼭 맞게 그린 마름모의 넓이는 몇 cm²인가? ${FIT_RHOMBUS}`,
      num(2 * r * r),
      `네 꼭짓점이 모두 원 위에 있으므로 두 대각선은 모두 지름과 같은 ${unitNum(d, "cm")} 입니다. ` +
        `${expr(`${d}\\times${d}\\div2=${2 * r * r}`)}`,
    );
  }
  return make(
    unit,
    `지름이 ${unitNum(d, "cm")} 인 원 밖에 꼭 맞게 그린 정사각형의 넓이는 몇 cm²인가? ${FIT_SQUARE}`,
    num(4 * r * r),
    `네 변이 모두 원에 닿으므로 한 변은 지름과 같은 ${unitNum(d, "cm")} 입니다. ` +
      `${expr(`${d}\\times${d}=${4 * r * r}`)}`,
  );
}

/** 기본 — 한 겹 문장제. 원 모양 종이에서 마름모를 오려 낸다. */
function circAppWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 3, 22);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원 모양 색종이 안에 꼭 맞게 마름모를 그려 오렸습니다. ` +
      `오려 낸 마름모의 넓이는 몇 cm²인가? ${FIT_RHOMBUS}`,
    num(2 * r * r),
    `네 꼭짓점이 모두 원 위에 있으므로 두 대각선은 모두 지름과 같은 ${unitNum(2 * r, "cm")} 입니다. ` +
      `${expr(`${2 * r}\\times${2 * r}\\div2=${2 * r * r}`)}`,
  );
}

/** 응용 — 두 걸음. 안팎 둘을 다 구해 원의 넓이가 **사이에 있음**을 말한다(답은 «쌍»). */
function circAppApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 3, 16);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원의 넓이를 어림하려고 합니다. 원 안에 꼭 맞게 그린 마름모와 ` +
      `원 밖에 꼭 맞게 그린 정사각형으로 어림하면, 원의 넓이는 몇 cm²보다 크고 몇 cm²보다 작은지 ` +
      `차례로 쓰시오. ${FIT_RHOMBUS} ${ALSO_SQUARE}`,
    expr(`${2 * r * r},\\ ${4 * r * r}`),
    `마름모의 두 대각선은 지름과 같으므로 넓이는 ${expr(`${2 * r}\\times${2 * r}\\div2=${2 * r * r}`)} 입니다. ` +
      `정사각형의 한 변도 지름과 같으므로 넓이는 ${expr(`${2 * r}\\times${2 * r}=${4 * r * r}`)} 입니다. ` +
      `원의 넓이는 그 사이에 있습니다.`,
  );
}

/** 심화 — 역산. 바깥 넓이에서 안쪽 넓이로 건너간다(반지름을 거치지 않아도 절반이다). */
function circAppDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 3, 16);
  // ⚠️ 예전 판은 「정사각형 넓이 → 마름모 넓이」라 **반으로 나누는 한 걸음**이었다.
  // 응용(안팎 둘을 다 구하는 두 걸음)보다 **얕아서 사다리가 거꾸로 섰다** —
  // 값·판정기·시험이 다 통과하고 「네 갈래를 나란히 놓고 봐야」 보이는 자리다.
  // 넓이에서 **지름**을 되짚게 해 두 걸음 역산으로 올린다.
  return make(
    unit,
    `어떤 원 안에 꼭 맞게 그린 마름모의 넓이가 ${num(2 * r * r)} cm²입니다. ` +
      `이 원의 지름은 몇 cm인가? ${FIT_RHOMBUS}`,
    num(2 * r),
    `마름모의 두 대각선은 모두 지름과 같으므로 (지름)×(지름)은 ` +
      `${expr(`${2 * r * r}\\times2=${4 * r * r}`)} 입니다. ` +
      `${expr(`${2 * r}\\times${2 * r}=${4 * r * r}`)} 이므로 지름은 ${unitNum(2 * r, "cm")} 입니다.`,
  );
}

// ── 2-5-4 원의 넓이 구하는 방법 알아보기 ──

/** 연산 — 지름에서 넓이 한 번. 표준의 지름 갈래는 `$3.14$` 라 「지름+$3$」은 겹치지 않는다. */
function circAreaCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 16);
  // ⚠️ 예전 판은 **지름**을 줘서 `÷2` 가 붙었고, 그래서 **기본보다 걸음이 많았다**.
  // 연산은 절차 한 번이어야 한다 — 반지름을 준다. 표준이 같은 문장을 쓰므로
  // 두 문장으로 갈라 R5(발문 중복)를 피한다.
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원이 있습니다. 이 원의 넓이는 몇 cm²인가? (원주율: ${num(3)})`,
    num(3 * r * r),
    `(원의 넓이)=(반지름)×(반지름)×(원주율)입니다. ` +
      `${expr(`${r}\\times${r}\\times3=${3 * r * r}`)}`,
  );
}

/** 기본 — 한 겹 문장제. 원 모양 화단의 넓이. */
function circAreaWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, ["화단", "연못", "무대", "잔디밭"] as const);
  const r = intBetween(rng, 2, 9);
  // 기본은 연산보다 한 겹 위다 — **지름**을 줘서 반지름을 먼저 구하게 한다.
  return make(
    unit,
    `지름이 ${unitNum(2 * r, "m")} 인 원 모양 ${place}${josa(place, "이", "가")} 있습니다. ` +
      `이 ${place}의 넓이는 몇 m²인가? ` +
      `(원주율: ${num(3)})`,
    num(3 * r * r),
    `반지름은 ${expr(`${2 * r}\\div2=${r}`)} 입니다. ` +
      `(원의 넓이)=(반지름)×(반지름)×(원주율)이므로 ` +
      `${expr(`${r}\\times${r}\\times3=${3 * r * r}`)} 입니다.`,
  );
}

/** 응용 — 두 걸음. 원주에서 반지름을 되찾은 뒤 넓이를 구한다. */
function circAreaApply(unit: UnitSeed, rng: Rng): ElemProblem {
  // ⚠️ 폭을 넉넉히 둔다. 이 시험의 씨앗 열여섯은 **첫 뽑기가 몰린다** — 폭 14 에서
  // 가짓수가 딱 8(문턱)이었다. 문턱에 걸친 값은 다음 손질에 조용히 무너진다.
  const r = intBetween(rng, 2, 24);
  const c = 62 * r; // 원주(십분의 일) = 지름 × 3.1
  return make(
    unit,
    `원주가 ${unitNum(fromTenths(c), "cm")} 인 원의 넓이는 몇 cm²인가? (원주율: ${num("3.1")})`,
    num(fromTenths(31 * r * r)),
    `지름은 ${expr(`${fromTenths(c)}\\div3.1=${2 * r}`)} 이고 반지름은 ${expr(`${2 * r}\\div2=${r}`)} 입니다. ` +
      `넓이는 ${expr(`${r}\\times${r}\\times3.1=${fromTenths(31 * r * r)}`)} 입니다.`,
  );
}

/** 심화 — 역산. 넓이에서 ⓐ 반지름 ⓑ 지름을 되짚는다. */
function circAreaDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 13);
  // 넓이를 **답에서 거꾸로** 짓는다 — $3.14$ 로 나눠 떨어져야 한다(D-74 ㉠).
  const area = fromCents(314 * r * r);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `넓이가 ${num(area)} cm²인 원이 있습니다. 이 원의 반지름은 몇 cm인가? (원주율: ${num("3.14")})`,
      num(r),
      `(반지름)×(반지름)은 ${expr(`${area}\\div3.14=${r * r}`)} 입니다. ` +
        `${expr(`${r}\\times${r}=${r * r}`)} 이므로 반지름은 ${unitNum(r, "cm")} 입니다.`,
    );
  }
  return make(
    unit,
    `넓이가 ${num(area)} cm²인 원이 있습니다. 이 원의 지름은 몇 cm인가? (원주율: ${num("3.14")})`,
    num(2 * r),
    `(반지름)×(반지름)은 ${expr(`${area}\\div3.14=${r * r}`)} 이므로 반지름은 ${unitNum(r, "cm")} 입니다. ` +
      `지름은 ${expr(`${r}\\times2=${2 * r}`)} 입니다.`,
  );
}

// ── 난이도 갈래 (D-72 확대 11차분) — 초6 `2-3 공간과 입체` (6소단원 · 24갈래) ──
//
// ⑴ **그림은 `iso`·`top` 만 쓴다.** `views` 는 iso·top·front·side 넷을 받지만
//    앞·옆은 **렌더로 확인하지 못했다**(elem-figures 세션이 그 파일에 변이 중이었다).
//    「스펙 모양을 아는 것」과 「도는 것을 본 것」은 다르다 — 표준이 이미 쓰는 둘만 쓴다.
//    앞·옆을 쓰려면 **먼저 한 장 렌더해 보고** 그때 넓힌다.
// ⑵ **도형에 수를 적지 않는다.** `markedShape` 에 값을 넣으면 그린 모양이 라벨과
//    무관하게 고정이라 **그림이 값을 배반한다**(elem-figures 실측). `stackCubes` 의
//    `top` 이 칸마다 층수를 찍는 것은 엔진이 스펙에서 **직접** 그리는 것이라 안전하다.
// ⑶ 소단원 여섯이 **같은 물건**을 본다. 그래서 갈래를 가르는 것은 소재가 아니라
//    **묻는 값**이다 — 빈 칸 · 총 개수 · 층별 · 직육면체 채우기 · 이어 붙이기.
// ⑷ 역산 갈래는 **그림 없이 말로** 조건을 준다. 그림이 답을 그대로 보여 주면
//    되짚을 것이 없어진다(R6 과 같은 태도).

/** 위에서 본 모양에 **빈 칸이 하나는 있게** 만든다 — 「빈 칸 수」가 늘 $0$ 이면 축이 죽는다. */
function withHole(h: number[][]): number[][] {
  const rows = h.length;
  const cols = h[0]!.length;
  if (h.flat().some((v) => v === 0)) return h;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      // 그 줄·칸에 다른 쌓기나무가 남아야 격자 크기가 발문과 어긋나지 않는다.
      const rowLeft = h[y]!.filter((v, i) => i !== x && v > 0).length;
      const colLeft = h.filter((r, j) => j !== y && r[x]! > 0).length;
      if (rowLeft > 0 && colLeft > 0) {
        const out = h.map((r) => [...r]);
        out[y]![x] = 0;
        return out;
      }
    }
  }
  return h;
}

/** 2-3 갈래가 함께 쓰는 바닥·높이. 표준과 같은 규칙(4×4 는 엔진 한도에 붙어 뺀다). */
function stackBase(rng: Rng): {
  cols: number;
  rows: number;
  h: number[][];
  grid: string;
} {
  const cols = intBetween(rng, 2, 4);
  const rows = cols === 4 ? intBetween(rng, 2, 3) : intBetween(rng, 2, 4);
  const h = heightGrid(rng, cols, rows);
  return { cols, rows, h, grid: `가로 ${num(cols)}칸, 세로 ${num(rows)}칸` };
}

function stackBits(h: number[][]): {
  empty: number;
  ones: number;
  atMax: number;
} {
  const flat = h.flat();
  const mx = Math.max(...flat, 0);
  return {
    empty: flat.filter((v) => v === 0).length,
    ones: flat.filter((v) => v === 1).length,
    atMax: mx > 0 ? flat.filter((v) => v === mx).length : 0,
  };
}

/** 2-3 기본 갈래의 실생활 소재. */
const STACK_PLACES = ["창고", "전시대", "놀이방", "미술실"] as const;

// ── 2-3-1 어느 방향에서 보았는지 알아보기 ──

/** 연산 — 위에서 본 모양의 **빈 칸**을 센다. 절차 한 번. */
function viewCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const h = withHole(b.h);
  const filled = h.flat().filter((v) => v > 0).length;
  const empty = b.cols * b.rows - filled;
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓은 모양입니다. 이 모양을 위에서 보았을 때 ` +
      `쌓기나무가 놓이지 않은 칸은 몇 칸인가?`,
    num(empty),
    `바닥은 모두 ${expr(`${b.cols}\\times${b.rows}=${b.cols * b.rows}`)} 칸입니다. ` +
      `쌓기나무가 놓인 칸이 ${num(filled)}칸이므로 ` +
      `${expr(`${b.cols * b.rows}-${filled}=${empty}`)} 칸이 비어 있습니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(h), views: ["iso", "top"] }),
  );
}

/** 기본 — 한 겹 문장제. 위에서 본 칸 수를 그림에서 읽는다. */
function viewWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, STACK_PLACES);
  const b = stackBase(rng);
  const filled = b.h.flat().filter((v) => v > 0).length;
  return make(
    unit,
    `${place}에 상자를 ${b.grid} 바닥 위에 쌓아 두었습니다. 쌓은 모양이 다음과 같을 때 ` +
      `위에서 내려다보면 상자가 보이는 칸은 몇 칸인가?`,
    num(filled),
    `위에서 내려다보면 상자가 놓인 자리마다 한 칸씩 보입니다. ` +
      `놓인 자리가 ${num(filled)}곳이므로 ${num(filled)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso"] }),
  );
}

/** 응용 — 두 걸음. 「두 층 이상인 칸」과 「한 층뿐인 칸」을 따로 세어 뺀다. */
function viewApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const flat = b.h.flat();
  const tall = flat.filter((v) => v >= 2).length;
  const one = flat.filter((v) => v === 1).length;
  const gap = Math.abs(tall - one);
  return make(
    unit,
    `${b.grid} 바닥에 쌓은 모양을 위에서 본 것입니다. 각 칸의 수는 그 자리에 쌓은 층수입니다. ` +
      `두 층 이상인 칸의 수와 한 층뿐인 칸의 수의 차는 몇 칸인가?`,
    num(gap),
    `두 층 이상인 칸은 ${num(tall)}칸, 한 층뿐인 칸은 ${num(one)}칸입니다. ` +
      `${expr(`${Math.max(tall, one)}-${Math.min(tall, one)}=${gap}`)} 칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}

/**
 * 심화 — 역산·조건 결합. **그림 없이** 말로 조건을 준다.
 * 그림이 답을 그대로 보여 주면 되짚을 것이 없어진다.
 */
function viewDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const cells = intBetween(rng, 4, 9);
  const tall = intBetween(rng, 1, cells - 1);
  return make(
    unit,
    `쌓기나무로 만든 모양을 위에서 보니 쌓기나무가 놓인 칸이 ${num(cells)}칸이고, ` +
      `그중 ${num(tall)}칸은 두 층 이상입니다. 이 모양에 쓴 쌓기나무는 적어도 몇 개인가?`,
    num(cells + tall),
    `놓인 칸은 적어도 한 층씩이므로 ${num(cells)}개가 필요합니다. ` +
      `두 층 이상인 ${num(tall)}칸에는 한 개씩 더 있어야 하므로 ` +
      `${expr(`${cells}+${tall}=${cells + tall}`)} 개입니다.`,
  );
}

// ── 2-3-2 쌓은 모양과 쌓기나무의 개수 알아보기 (1) ──

/** 연산 — 겨냥도와 위에서 본 모양을 보고 센다. */
function cubeOneCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const flat = b.h.flat().filter((v) => v > 0);
  const total = flat.reduce((s, v) => s + v, 0);
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓은 모양입니다. 쌓기나무를 모두 몇 개 사용했는가?`,
    num(total),
    `자리마다 쌓은 층수를 모두 더합니다. ${expr(`${flat.join("+")}=${total}`)}`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}

/** 기본 — 한 겹 문장제. 상자를 쌓아 두고 개수를 묻는다. */
function cubeOneWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, STACK_PLACES);
  const b = stackBase(rng);
  const flat = b.h.flat().filter((v) => v > 0);
  const total = flat.reduce((s, v) => s + v, 0);
  return make(
    unit,
    `${place}에 똑같은 상자를 ${b.grid} 바닥 위에 다음과 같이 쌓았습니다. ` +
      `쌓아 둔 상자는 모두 몇 개인가?`,
    num(total),
    `위에서 본 모양의 각 칸에 적힌 층수를 모두 더합니다. ${expr(`${flat.join("+")}=${total}`)}`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}

/**
 * 응용 — 두 걸음. 쓴 개수를 **더해서** 구하고 가진 것에서 **뺀다**(쌍).
 *
 * ⚠️ 처음엔 「가장 높은 층수와 그 층에 놓인 개수」였다. 그것은 **읽기 둘**이지
 * 걸음 둘이 아니다 — 해설에 등식이 하나도 없어 **같은 소단원의 기본(합)보다
 * 가벼웠다.** 값 검산도 관문도 전부 초록이었고, 갈래 넷을 나란히 놓고 «걸음»을
 * 세어서야 보였다. 「한 문항 안」만 보는 판정기는 이 부류를 구조적으로 못 본다.
 */
function cubeOneApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const flat = b.h.flat().filter((v) => v > 0);
  const total = flat.reduce((s, v) => s + v, 0);
  const have = total + intBetween(rng, 2, 9);
  return make(
    unit,
    `${b.grid} 바닥에 쌓은 모양을 위에서 본 것입니다. 각 칸의 수는 그 자리에 쌓은 층수입니다. ` +
      `쌓기나무 ${num(have)}개로 이 모양을 만들었다면, 쓴 쌓기나무의 수와 남은 쌓기나무의 수를 ` +
      `차례로 쓰시오.`,
    expr(`${total},\\ ${have - total}`),
    `칸에 적힌 수를 모두 더하면 ${expr(`${flat.join("+")}=${total}`)} 개를 썼습니다. ` +
      `${expr(`${have}-${total}=${have - total}`)} 개가 남습니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}

/** 심화 — 역산. 붙여 만든 전체에서 **한 모양의 개수**를 되짚는다(그림 없음). */
function cubeOneDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const one = intBetween(rng, 5, 14);
  const copies = intBetween(rng, 3, 6);
  const left = intBetween(rng, 2, 9);
  const used = one * copies;
  return makeDeep(
    unit,
    `쌓기나무 ${num(used + left)}개로 똑같은 모양 ${num(copies)}개를 만들었더니 ${num(left)}개가 남았습니다. ` +
      `한 모양에 사용한 쌓기나무는 몇 개인가?`,
    num(one),
    [
      `쓴 쌓기나무는 ${expr(`${used + left}-${left}=${used}`)} 개입니다.`,
      `모양 ${num(copies)}개에 똑같이 나누면 ${expr(`${used}\\div${copies}=${one}`)} 개입니다.`,
    ],
  );
}

// ── 2-3-3 쌓은 모양과 쌓기나무의 개수 알아보기 (2) ──

/** 연산 — 위에서 본 모양의 수만 보고 센다. */
function cubeTwoCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const flat = b.h.flat().filter((v) => v > 0);
  const total = flat.reduce((s, v) => s + v, 0);
  return make(
    unit,
    `${b.grid} 바닥에 쌓은 모양을 위에서 보고 각 칸에 쌓은 층수를 적었습니다. ` +
      `쌓기나무는 모두 몇 개인가?`,
    num(total),
    `칸에 적힌 수가 그 자리에 쌓은 쌓기나무의 개수입니다. ${expr(`${flat.join("+")}=${total}`)}`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}

/** 기본 — 한 겹 문장제. 가장 높이 쌓은 자리의 층수를 읽는다. */
/**
 * 「가장 높은 층수」를 묻는 갈래 전용 격자 — **최댓값을 먼저 뽑는다.**
 *
 * ⚠️ `heightGrid` 는 칸마다 $0$~$3$ 을 **따로** 뽑는다. 그러면 칸이 넷만 넘어도
 * **최댓값이 거의 늘 $3$** 이다 — 실측 **90.3%**($3$ 361 / $2$ 39, 씨앗 400).
 * 「최댓값을 묻는 문항」에서 그것은 답이 사실상 하나로 굳었다는 뜻이고,
 * 학생이 안 풀고 «$3$» 이라 써도 열에 아홉 맞는다.
 *
 * **값 검산은 이 부류를 구조적으로 못 본다** — 답은 언제나 옳기 때문이다.
 * 「한 가지뿐인가」 축에도 안 걸린다(답이 두 가지는 된다). **쏠림**을 봐야 보인다.
 *
 * ⚠️ **범위를 넓히는 것은 고침이 아니다.** $0$~$4$ 로 넓히면 쏠림이 $3$ 에서 $4$ 로
 * 옮겨 갈 뿐이다. 최댓값이 여러 칸의 최댓값이라는 **구조**가 원인이므로,
 * 최댓값을 먼저 정하고 격자를 거기에 맞춘다.
 *
 * 쌓기나무 수는 최대 $11	imes3+4=37$ 개라 엔진 한도($48$)에 안 닿는다.
 */
function stackBaseTopped(rng: Rng): {
  cols: number;
  rows: number;
  h: number[][];
  grid: string;
  top: number;
} {
  const b = stackBase(rng);
  const top = intBetween(rng, 2, 4);
  const h = b.h.map((row) => row.map((v) => Math.min(v, top)));
  // 최댓값이 실제로 `top` 이 되게 — 쌓기나무가 놓인 칸 하나를 그 높이로 올린다.
  // (자르기는 $0$ 을 안 만들고 올리기도 $0$ 을 안 만들어 가장자리 줄이 안 빈다.)
  const filled: [number, number][] = [];
  for (let y = 0; y < h.length; y += 1)
    for (let x = 0; x < h[y]!.length; x += 1)
      if (h[y]![x]! > 0) filled.push([x, y]);
  const [px, py] = filled[intBetween(rng, 0, filled.length - 1)]!;
  h[py]![px] = top;
  return { cols: b.cols, rows: b.rows, h, grid: b.grid, top };
}

function cubeTwoWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, STACK_PLACES);
  const b = stackBaseTopped(rng);
  const maxH = b.top;
  return make(
    unit,
    `${place}에 상자를 ${b.grid} 바닥 위에 쌓고, 위에서 보고 각 칸에 쌓은 층수를 적었습니다. ` +
      `가장 높이 쌓은 자리는 몇 층인가?`,
    num(maxH),
    `칸에 적힌 수 중 가장 큰 수가 가장 높이 쌓은 층수입니다. ${num(maxH)}층입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}

/** 응용 — 두 걸음. **두 층 이상인 자리에만** 놓인 쌓기나무를 센다. */
function cubeTwoApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const tallCells = b.h.flat().filter((v) => v >= 2);
  const sum = tallCells.reduce((s, v) => s + v, 0);
  return make(
    unit,
    `${b.grid} 바닥에 쌓은 모양을 위에서 보고 각 칸에 쌓은 층수를 적었습니다. ` +
      `두 층 이상 쌓은 자리에 놓인 쌓기나무는 모두 몇 개인가?`,
    num(sum),
    `두 층 이상인 자리는 ${num(tallCells.length)}곳입니다. ` +
      `그 자리에 놓인 쌓기나무를 모두 더하면 ${expr(`${tallCells.join("+")}=${sum}`)} 개입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}

/** 심화 — 역산·조건 결합. 합과 칸 수만으로 **두 층 이상인 칸의 최대 수**를 되짚는다. */
function cubeTwoDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const cells = intBetween(rng, 4, 8);
  const extra = intBetween(rng, 1, cells - 1);
  return make(
    unit,
    `위에서 본 모양의 칸이 ${num(cells)}칸이고, 칸에 적힌 수를 모두 더하니 ` +
      `${num(cells + extra)}이었습니다. 두 층 이상인 칸은 많아야 몇 칸인가?`,
    num(extra),
    `모든 칸이 적어도 한 층이므로 ${num(cells)}개는 반드시 쓰입니다. ` +
      `남는 것은 ${expr(`${cells + extra}-${cells}=${extra}`)} 개이고, ` +
      `한 칸에 하나씩만 더 얹을 때 두 층 이상인 칸이 가장 많아지므로 ${num(extra)}칸입니다.`,
  );
}

// ── 2-3-4 쌓은 모양과 쌓기나무의 개수 알아보기 (3) ──

/** 연산 — **1층**에 놓인 쌓기나무를 센다(표준은 2·3층을 묻는다). */
function cubeLayerCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const first = b.h.flat().filter((v) => v >= 1).length;
  return make(
    unit,
    `${b.grid} 바닥에 쌓은 모양입니다. ${num(1)}층에 놓인 쌓기나무는 몇 개인가?`,
    num(first),
    `${num(1)}층에는 쌓기나무가 놓인 자리마다 하나씩 있습니다. ` +
      `놓인 자리가 ${num(first)}곳이므로 ${num(first)}개입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}

/** 기본 — 한 겹 문장제. 2층에 놓인 개수를 센다. */
function cubeLayerWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, STACK_PLACES);
  const b = stackBase(rng);
  const second = b.h.flat().filter((v) => v >= 2).length;
  return make(
    unit,
    `${place}에 상자를 쌓았습니다. 쌓은 모양이 다음과 같을 때 ${num(2)}층에 놓인 상자는 몇 개인가?`,
    num(second),
    `${num(2)}층에 상자가 있으려면 그 자리가 ${num(2)}층 이상이어야 합니다. ` +
      `그런 자리가 ${num(second)}곳이므로 ${num(second)}개입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}

/** 응용 — 두 걸음. 1층과 2층의 개수를 따로 세어 뺀다. */
function cubeLayerApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const flat = b.h.flat();
  const first = flat.filter((v) => v >= 1).length;
  const second = flat.filter((v) => v >= 2).length;
  return make(
    unit,
    `${b.grid} 바닥에 쌓은 모양입니다. ${num(1)}층에 놓인 쌓기나무는 ` +
      `${num(2)}층에 놓인 쌓기나무보다 몇 개 더 많은가?`,
    num(first - second),
    `${num(1)}층은 ${num(first)}개, ${num(2)}층은 ${num(second)}개입니다. ` +
      `${expr(`${first}-${second}=${first - second}`)} 개 더 많습니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}

/** 심화 — 역산. 층별 개수만 주고 전체를 되짚는다(그림 없음). */
function cubeLayerDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const third = intBetween(rng, 1, 3);
  const second = third + intBetween(rng, 1, 4);
  const gap = intBetween(rng, 1, 4);
  const first = second + gap;
  const total = first + second + third;
  return makeDeep(
    unit,
    `쌓기나무로 만든 모양의 ${num(1)}층에는 ${num(first)}개가 놓여 있고, ` +
      `${num(2)}층은 ${num(1)}층보다 ${num(gap)}개 적습니다. ` +
      `사용한 쌓기나무가 모두 ${num(total)}개일 때 ${num(3)}층에 놓인 쌓기나무는 몇 개인가?`,
    num(third),
    [
      `${num(2)}층은 ${expr(`${first}-${gap}=${second}`)} 개입니다.`,
      `${num(1)}층과 ${num(2)}층을 더하면 ${expr(`${first}+${second}=${first + second}`)} 개이므로 ` +
        `${num(3)}층은 ${expr(`${total}-${first + second}=${third}`)} 개입니다.`,
    ],
  );
}

// ── 2-3-5 쌓은 모양과 쌓기나무의 개수 알아보기 (4) ──

/** 연산 — 직육면체 모양에 드는 쌓기나무. 세 수를 곱한다(그림 없음). */
function cubeBoxCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = intBetween(rng, 2, 5);
  const r = intBetween(rng, 2, 5);
  const t = intBetween(rng, 2, 4);
  return make(
    unit,
    `쌓기나무를 쌓아 가로 ${num(c)}칸, 세로 ${num(r)}칸, 높이 ${num(t)}층인 ` +
      `직육면체 모양을 만들려고 합니다. 쌓기나무는 모두 몇 개 필요한가?`,
    num(c * r * t),
    `가로·세로·높이의 칸 수를 모두 곱합니다. ${expr(`${c}\\times${r}\\times${t}=${c * r * t}`)}`,
  );
}

/** 기본 — 한 겹 문장제. 지금 쌓은 것에서 **더 필요한** 개수를 구한다. */
function cubeBoxWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, STACK_PLACES);
  const b = stackBase(rng);
  const flat = b.h.flat();
  const total = flat.reduce((s, v) => s + v, 0);
  const maxH = Math.max(...flat);
  const target = b.cols * b.rows * maxH === total ? maxH + 1 : maxH;
  const box = b.cols * b.rows * target;
  return make(
    unit,
    `${place}에 상자를 ${b.grid} 바닥 위에 쌓았습니다. 여기에 상자를 더 쌓아 ` +
      `${b.grid}, 높이 ${num(target)}층인 직육면체 모양을 만들려면 상자가 몇 개 더 필요한가?`,
    num(box - total),
    `직육면체 모양에는 ${expr(`${b.cols}\\times${b.rows}\\times${target}=${box}`)} 개가 듭니다. ` +
      `지금 ${num(total)}개를 썼으므로 ${expr(`${box}-${total}=${box - total}`)} 개가 더 필요합니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}

/** 응용 — 두 걸음. 더 필요한 개수와 **다 만든 뒤의 전체**를 차례로 답한다(쌍). */
function cubeBoxApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const flat = b.h.flat();
  const total = flat.reduce((s, v) => s + v, 0);
  const maxH = Math.max(...flat);
  const target = b.cols * b.rows * maxH === total ? maxH + 1 : maxH;
  const box = b.cols * b.rows * target;
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓았습니다. ${b.grid}, 높이 ${num(target)}층인 직육면체 모양을 ` +
      `만들려고 합니다. 더 필요한 쌓기나무의 수와 다 만들었을 때 쓴 쌓기나무의 수를 차례로 쓰시오.`,
    expr(`${box - total},\\ ${box}`),
    `직육면체 모양에는 ${expr(`${b.cols}\\times${b.rows}\\times${target}=${box}`)} 개가 듭니다. ` +
      `지금 ${num(total)}개를 썼으므로 ${expr(`${box}-${total}=${box - total}`)} 개가 더 필요하고, ` +
      `다 만들면 ${num(box)}개를 쓴 것입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}

/** 심화 — 역산. 다 만든 직육면체와 더 넣은 개수에서 **처음 개수**를 되짚는다(그림 없음). */
function cubeBoxDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = intBetween(rng, 2, 5);
  const r = intBetween(rng, 2, 5);
  const t = intBetween(rng, 2, 4);
  const box = c * r * t;
  const added = intBetween(rng, 2, box - 2);
  return make(
    unit,
    `쌓기나무를 ${num(added)}개 더 쌓았더니 가로 ${num(c)}칸, 세로 ${num(r)}칸, ` +
      `높이 ${num(t)}층인 직육면체 모양이 되었습니다. 처음에 쌓여 있던 쌓기나무는 몇 개인가?`,
    num(box - added),
    `직육면체 모양에는 ${expr(`${c}\\times${r}\\times${t}=${box}`)} 개가 듭니다. ` +
      `그중 ${num(added)}개를 나중에 넣었으므로 처음에는 ` +
      `${expr(`${box}-${added}=${box - added}`)} 개였습니다.`,
  );
}

// ── 2-3-6 여러 가지 모양 만들기 ──

/** 연산 — 한 모양의 개수와 만들 개수를 주고 곱한다(그림 없음). */
function cubeMakeCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const one = intBetween(rng, 4, 12);
  const copies = intBetween(rng, 2, 6);
  return make(
    unit,
    `쌓기나무 ${num(one)}개로 만든 모양이 있습니다. 똑같은 모양 ${num(copies)}개를 만들려면 ` +
      `쌓기나무는 모두 몇 개 필요한가?`,
    num(one * copies),
    `한 모양에 드는 쌓기나무에 모양의 수를 곱합니다. ` +
      `${expr(`${one}\\times${copies}=${one * copies}`)}`,
  );
}

/** 기본 — 한 겹 문장제. 그림에서 한 모양의 개수를 먼저 읽는다. */
function cubeMakeWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, STACK_PLACES);
  const b = stackBase(rng);
  const total = b.h.flat().reduce((s, v) => s + v, 0);
  const copies = intBetween(rng, 2, 4);
  return make(
    unit,
    `${place}에서 ${b.grid} 바닥 위에 상자를 쌓아 만든 모양입니다. ` +
      `이와 똑같은 모양을 ${num(copies)}개 만들려면 상자는 모두 몇 개 필요한가?`,
    num(total * copies),
    `한 모양에 쓴 쌓기나무는 ${num(total)}개입니다. ` +
      `${expr(`${total}\\times${copies}=${total * copies}`)}`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}

/** 응용 — 두 걸음. 필요한 전체를 구하고 가진 것을 뺀다. */
function cubeMakeApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const total = b.h.flat().reduce((s, v) => s + v, 0);
  const copies = intBetween(rng, 2, 4);
  const need = total * copies;
  const have = intBetween(rng, 1, need - 1);
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무로 만든 모양입니다. 이와 똑같은 모양을 ${num(copies)}개 만들려고 하는데 ` +
      `쌓기나무가 ${num(have)}개 있습니다. 쌓기나무는 몇 개 더 필요한가?`,
    num(need - have),
    `한 모양에 ${num(total)}개가 드므로 ${num(copies)}개에는 ` +
      `${expr(`${total}\\times${copies}=${need}`)} 개가 필요합니다. ` +
      `${expr(`${need}-${have}=${need - have}`)} 개가 더 필요합니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}

/** 심화 — 역산. 남은 것을 빼고 **몇 개를 만들었는지** 되짚는다(그림 없음). */
function cubeMakeDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const one = intBetween(rng, 4, 12);
  const copies = intBetween(rng, 3, 7);
  const rest = intBetween(rng, 1, one - 1);
  return make(
    unit,
    `쌓기나무 ${num(one)}개로 만드는 모양을 여러 개 만들었더니 쌓기나무 ` +
      `${num(one * copies + rest)}개 중 ${num(rest)}개가 남았습니다. 만든 모양은 몇 개인가?`,
    num(copies),
    `모양을 만드는 데 쓴 쌓기나무는 ${expr(`${one * copies + rest}-${rest}=${one * copies}`)} 개입니다. ` +
      `한 모양에 ${num(one)}개가 드므로 ${expr(`${one * copies}\\div${one}=${copies}`)} 개를 만들었습니다.`,
  );
}

// ── 난이도 갈래 (D-72 확대 12차분) — 초6 `2-6 원기둥, 원뿔, 구` (4소단원 · 16갈래) ──
//
// ⑴ **그림이 값을 적는 자리는 하나뿐이다 — 렌더러를 열어 확인했다.**
//    ⚠️ **`_text` 를 grep 해서 세지 마라.** 넷 다 `_text` 호출은 **0건**인데
//    `_cylinder` 는 높이를 `_length_mark(…, f"{_n(h)} cm")` 로 **찍는다.** 글자를
//    지면에 내보내는 길이 여럿이라 낱말 하나로 세면 세는 쪽이 눈이 먼다.
//    실제로는 `_cylinder` 만 찍고(높이 하나) `_cone`·`_sphere`·`_net_cylinder`
//    (`scripts/figure/elem_advanced.py`)는 하나도 안 찍는다. `netCylinder` 가 `pi` 를
//    받지만 옆면 **가로의 길이를 정하는 데만** 쓰고 지면에 적지는 않는다.
//    그래서 1-5 원그래프에서 난 「그림이 역산의 답을 알려 준다」는 이 단원에 없다
//    (그 단원은 `pct` 를 부채꼴과 범례 두 곳에 찍었다). 다만 그 높이 하나 때문에
//    **2-6-1·2-6-2 발문은 높이를 반드시 말해야 한다** — 시험이 그것을 잠근다.
// ⑵ 그래도 **`netCylinder` 의 `pi` 는 발문에 적은 값과 맞춘다.** 안 맞추면 그린
//    직사각형의 가로 비율이 발문과 어긋난다 — 값은 맞고 **그림만 틀리는** 부류다.
// ⑶ **모선은 안 쓴다.** 모선·높이·반지름은 피타고라스로 얽히는데 초6 과정 밖이다.
//    쓸 수 있는 것은 「앞에서 본 모양」이다 — 원기둥은 직사각형, 원뿔은 이등변삼각형.
// ⑷ D-74 원주율 — 연산 `$3$` · 기본 `$3$` · 응용 `$3.1$` · 심화 `$3.14$`.
//    원주율이 필요 없는 소단원(2-6-1 · 2-6-3)은 **아예 안 적는다** — 안 쓰는 값을
//    적으면 학생이 그 값을 어디에 쓰는지 찾게 된다.
// ⑸ 심화 넷은 **그림이 없다**(역산이라 그림이 답을 보이면 되짚을 것이 없어진다).
//    그리고 원장님 지시대로 **여러 입체를 한 장면에 두지 않는다** — 갈래마다 입체 하나다.

/** 원기둥 모양 물건 — 2-6-1·2-6-2 기본. */
const CYL_THINGS = ["통조림 통", "물통", "연필꽂이", "북"] as const;
/** 원뿔 모양 물건 — 2-6-3 기본. */
const CONE_THINGS = ["고깔모자", "아이스크림콘", "깔때기"] as const;
/** 구 모양 물건 — 2-6-4 기본. */
const BALL_THINGS = ["농구공", "지구본", "구슬", "수박"] as const;

// ── 2-6-1 원기둥 알아보기 ──

/** 연산 — 밑면의 반지름에서 지름. 절차 한 번. */
function cylKnowCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  return make(
    unit,
    // ⚠️ 높이를 안 쓰는 발문이지만 **적는다.** `cylinder` 렌더러는 높이를 「$9$ cm」
    // 처럼 **글자로 찍는다**(실제로 그려 보고 알았다 — 원문 grep 으로는 안 보였다).
    // 발문이 그 값을 말하지 않으면 지면에 **본문에 없는 수**가 하나 떠 있게 된다.
    `밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원기둥입니다. ` +
      `이 원기둥의 밑면의 지름은 몇 cm인가?`,
    num(2 * r),
    `지름은 반지름의 두 배입니다. ${expr(`${r}\\times2=${2 * r}`)}`,
    fig("cylinder", { r, h }),
  );
}

/** 기본 — 한 겹 문장제. 앞에서 본 직사각형의 넓이. */
function cylKnowWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, CYL_THINGS);
  const r = intBetween(rng, 2, 10);
  const h = intBetween(rng, 3, 15);
  const d = 2 * r;
  return make(
    unit,
    `밑면의 지름이 ${unitNum(d, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원기둥 모양 ${thing}${josa(thing, "이", "가")} 있습니다. ` +
      `이 ${thing}${josa(thing, "을", "를")} 앞에서 본 모양의 넓이는 몇 cm²인가?`,
    num(d * h),
    `원기둥을 앞에서 보면 가로가 밑면의 지름과 같고 세로가 높이와 같은 직사각형입니다. ` +
      `${expr(`${d}\\times${h}=${d * h}`)}`,
    fig("cylinder", { r, h }),
  );
}

/** 응용 — 두 걸음. 반지름에서 지름을 구한 뒤 앞에서 본 직사각형의 둘레. */
function cylKnowApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 18);
  const d = 2 * r;
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원기둥을 ` +
      `앞에서 본 모양의 둘레는 몇 cm인가?`,
    num(2 * (d + h)),
    `앞에서 본 모양은 직사각형입니다. 가로는 밑면의 지름이므로 ${expr(`${r}\\times2=${d}`)} 이고 ` +
      `세로는 높이인 ${num(h)} 입니다. 둘레는 ${expr(`(${d}+${h})\\times2=${2 * (d + h)}`)} 입니다.`,
    fig("cylinder", { r, h }),
  );
}

/** 심화 — 역산. 앞에서 본 직사각형의 둘레와 높이에서 밑면의 반지름을 되짚는다(그림 없음). */
function cylKnowDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 18);
  const half = 2 * r + h;
  return make(
    unit,
    `어떤 원기둥을 앞에서 본 모양은 둘레가 ${unitNum(2 * half, "cm")} 인 직사각형입니다. ` +
      `이 원기둥의 높이가 ${unitNum(h, "cm")} 일 때 밑면의 반지름은 몇 cm인가?`,
    num(r),
    `직사각형의 가로와 세로의 합은 ${expr(`${2 * half}\\div2=${half}`)} 입니다. ` +
      `세로가 높이 ${num(h)} 이므로 가로는 ${expr(`${half}-${h}=${2 * r}`)} 이고, 이것이 밑면의 지름입니다. ` +
      `반지름은 ${expr(`${2 * r}\\div2=${r}`)} 입니다.`,
  );
}

// ── 2-6-2 원기둥의 전개도 알아보기 ──

/**
 * 🔴 **2-5-2 와 첫 걸음이 달라야 한다** (적대 검토 ⑷).
 *
 * 예전 세 갈래는 2-5-2 와 **계산이 글자 그대로 같았다** — 실측 연산 11/11 · 응용 59/59 ·
 * 심화하 80/80 이 «풀이가 합쳐지는» 자리였다:
 *
 * ```
 * [2-5-2 연산]  지름 12cm 원의 원주는?              12×3=36
 * [2-6-2 연산]  밑면 지름 12cm 원기둥 옆면 가로는?   12×3=36   ← 같은 식
 * [2-5-2 심화하] 굴렁쇠 9바퀴에 508.68cm → 반지름    ÷9 · ÷3.14 · ÷2
 * [2-6-2 심화하] 옆넓이 508.68cm², 높이 9 → 반지름   ÷9 · ÷3.14 · ÷2   ← 같은 사슬
 * ```
 *
 * 두 소단원은 **2학기 5·6단원**이라 한 확인테스트에 실린다. 학생은 같은 문항을 두 번 푼다.
 *
 * 그래서 이 셋을 **전개도에만 있는 값** — 옆면(직사각형)의 **둘레** — 로 옮긴다.
 * 원에는 «둘레와 높이를 더하는» 자리가 없으므로 사슬에 **덧셈/뺄셈이 하나 낀다**.
 * 기본(색종이 가로)은 겹치지 않아 그대로 둔다.
 */
function cylNetCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  const d = 2 * r;
  const side = d * 3;
  return make(
    unit,
    `밑면의 지름이 ${unitNum(d, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원기둥의 전개도입니다. ` +
      `옆면인 직사각형의 둘레는 몇 cm인가? (원주율: ${num(3)})`,
    num(2 * (side + h)),
    `옆면의 가로는 밑면의 둘레와 같으므로 ${expr(`${d}\\times3=${side}`)} 이고, 세로는 높이인 ${num(h)} 입니다. ` +
      `직사각형의 둘레는 ${expr(`(${side}+${h})\\times2=${2 * (side + h)}`)} 입니다.`,
    fig("netCylinder", { r, h, pi: 3, layout: pick(rng, CYL_NET_LAYOUTS) }),
  );
}

/** 기본 — 한 겹 문장제. 옆면에 두를 색종이의 가로. */
function cylNetWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, CYL_THINGS);
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 4, 18);
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 인 원기둥 모양 ${thing}의 옆면에 색종이를 빈틈없이 두르려고 합니다. ` +
      `색종이의 가로는 몇 cm여야 하는가? (원주율: ${num(3)})`,
    num(2 * r * 3),
    `옆면을 펼치면 직사각형이고, 그 가로는 밑면의 둘레와 같습니다. ` +
      `${expr(`2\\times${r}\\times3=${2 * r * 3}`)}`,
    fig("netCylinder", { r, h, pi: 3, layout: pick(rng, CYL_NET_LAYOUTS) }),
  );
}

/** 응용 — 세 걸음. 반지름 → 가로 → 둘레. 원주율 `$3.1$`. */
function cylNetApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 10);
  const h = intBetween(rng, 3, 12);
  // 십분의 일 단위 정수로만 셈해 부동소수점을 안 거친다(R2).
  const latT = 2 * r * 31;
  const perimT = 2 * (latT + h * 10);
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원기둥의 전개도에서 ` +
      `옆면의 둘레는 몇 cm인가? (원주율: ${num("3.1")})`,
    num(fromTenths(perimT)),
    `옆면의 가로는 밑면의 둘레와 같으므로 ${expr(`2\\times${r}\\times3.1=${fromTenths(latT)}`)} 이고, ` +
      `세로는 높이인 ${num(h)} 입니다. ` +
      `${expr(`(${fromTenths(latT)}+${h})\\times2=${fromTenths(perimT)}`)}`,
    fig("netCylinder", { r, h, pi: 3.1, layout: pick(rng, CYL_NET_LAYOUTS) }),
  );
}

/**
 * 심화 — 역산. 옆면의 **둘레**와 높이에서 밑면의 반지름(그림 없음). 원주율 `$3.14$`.
 *
 * 첫 걸음이 «÷ 높이» 가 아니라 **«÷2 뒤 − 높이»** 라, 2-5-2 심화하(거리 ÷ 바퀴 수)와
 * 사슬이 갈린다.
 */
function cylNetDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  const h = intBetween(rng, 3, 12);
  // 백분의 일 단위 정수. 답(반지름)에서 거꾸로 지어 나눗셈이 딱 떨어지게 한다.
  const circC = 2 * r * 314;
  const halfC = circC + h * 100;
  const perimC = 2 * halfC;
  return make(
    unit,
    `어떤 원기둥의 전개도에서 옆면의 둘레가 ${num(fromCents(perimC))} cm이고 ` +
      `이 원기둥의 높이가 ${unitNum(h, "cm")} 입니다. 밑면의 반지름은 몇 cm인가? (원주율: ${num("3.14")})`,
    num(r),
    `직사각형의 둘레는 (가로)+(세로)의 두 배이므로 가로와 세로의 합은 ` +
      `${expr(`${fromCents(perimC)}\\div2=${fromCents(halfC)}`)} 입니다. ` +
      `세로가 높이 ${num(h)} 이므로 가로는 ${expr(`${fromCents(halfC)}-${h}=${fromCents(circC)}`)} 이고, ` +
      `이것이 밑면의 둘레입니다. ` +
      `밑면의 지름은 ${expr(`${fromCents(circC)}\\div3.14=${2 * r}`)} 이므로 ` +
      `반지름은 ${expr(`${2 * r}\\div2=${r}`)} 입니다.`,
  );
}

// ── 2-6-3 원뿔 알아보기 ──

/** 연산 — 앞에서 본 이등변삼각형의 밑변(= 밑면의 지름). 절차 한 번. */
function coneKnowCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 인 원뿔입니다. ` +
      `이 원뿔을 앞에서 본 모양은 삼각형인데, 그 삼각형의 밑변은 몇 cm인가?`,
    num(2 * r),
    `원뿔을 앞에서 보면 이등변삼각형이고, 그 밑변은 밑면의 지름과 같습니다. ` +
      `${expr(`${r}\\times2=${2 * r}`)}`,
    fig("cone", { r, h }),
  );
}

/** 기본 — 한 겹 문장제. 지름과 높이를 주고 앞에서 본 삼각형의 넓이. */
function coneKnowWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, CONE_THINGS);
  const r = intBetween(rng, 2, 10);
  const h = intBetween(rng, 3, 15);
  const d = 2 * r;
  return make(
    unit,
    `밑면의 지름이 ${unitNum(d, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원뿔 모양 ${thing}${josa(thing, "이", "가")} 있습니다. ` +
      `이 ${thing}${josa(thing, "을", "를")} 앞에서 본 모양의 넓이는 몇 cm²인가?`,
    num(r * h),
    `앞에서 본 모양은 밑변이 ${num(d)} 이고 높이가 ${num(h)} 인 삼각형입니다. ` +
      `${expr(`${d}\\times${h}\\div2=${r * h}`)}`,
    fig("cone", { r, h }),
  );
}

/** 응용 — 두 걸음. 반지름에서 밑변을 구한 뒤 앞에서 본 삼각형의 넓이. */
function coneKnowApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 16);
  const d = 2 * r;
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원뿔을 ` +
      `앞에서 본 모양의 넓이는 몇 cm²인가?`,
    num(r * h),
    `앞에서 본 모양은 이등변삼각형이고 밑변은 밑면의 지름이므로 ${expr(`${r}\\times2=${d}`)} 입니다. ` +
      `넓이는 ${expr(`${d}\\times${h}\\div2=${r * h}`)} 입니다.`,
    fig("cone", { r, h }),
  );
}

/** 심화 — 역산. 앞에서 본 삼각형의 넓이와 높이에서 밑면의 반지름(그림 없음). */
function coneKnowDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 16);
  const area = r * h;
  return make(
    unit,
    `어떤 원뿔을 앞에서 본 모양은 넓이가 ${num(area)} cm²인 삼각형이고, ` +
      `이 원뿔의 높이는 ${unitNum(h, "cm")} 입니다. 밑면의 반지름은 몇 cm인가?`,
    num(r),
    `삼각형의 밑변은 ${expr(`${area}\\times2\\div${h}=${2 * r}`)} 이고, 이것이 밑면의 지름입니다. ` +
      `반지름은 ${expr(`${2 * r}\\div2=${r}`)} 입니다.`,
  );
}

// ── 2-6-4 구 알아보기와 여러 가지 모양 만들기 ──

/** 연산 — 구의 지름에서 반지름. 절차 한 번. */
function ballKnowCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  // ⚠️ 그림이 붙는 갈래는 **$20$ 까지** — `_sphere` 가 `r` 을 $0.4$~$20$ 으로 받는다.
  //    갈래 시험은 그림을 **안 그려 보므로** 넘겨도 초록이다(실측 5건이 그렇게 샜다).
  const r = intBetween(rng, 2, 20);
  return make(
    unit,
    `지름이 ${unitNum(2 * r, "cm")} 인 구입니다. 이 구의 반지름은 몇 cm인가?`,
    num(r),
    `반지름은 지름의 반입니다. ${expr(`${2 * r}\\div2=${r}`)}`,
    fig("sphere", { r }),
  );
}

/** 기본 — 한 겹 문장제. 반지름에서 지름. */
function ballKnowWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, BALL_THINGS);
  const r = intBetween(rng, 3, 18);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 구 모양 ${thing}${josa(thing, "이", "가")} 있습니다. ` +
      `이 ${thing}의 지름은 몇 cm인가?`,
    num(2 * r),
    `지름은 반지름의 두 배입니다. ${expr(`${r}\\times2=${2 * r}`)}`,
    fig("sphere", { r }),
  );
}

/** 응용 — 두 걸음. 구의 중심을 지나게 자른 단면의 둘레. 원주율 `$3.1$`. */
function ballKnowApply(unit: UnitSeed, rng: Rng): ElemProblem {
  // ⚠️ 그림이 붙는 갈래는 **$20$ 까지** — `_sphere` 가 `r` 을 $0.4$~$20$ 으로 받는다.
  //    갈래 시험은 그림을 **안 그려 보므로** 넘겨도 초록이다(실측 5건이 그렇게 샜다).
  const r = intBetween(rng, 2, 20);
  const d = 2 * r;
  const circT = d * 31;
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 구를 중심을 지나게 잘랐습니다. ` +
      `잘린 면의 둘레는 몇 cm인가? (원주율: ${num("3.1")})`,
    num(fromTenths(circT)),
    `구를 중심을 지나게 자르면 잘린 면은 구와 반지름이 같은 원입니다. ` +
      `지름은 ${expr(`${r}\\times2=${d}`)} 이므로 둘레는 ${expr(`${d}\\times3.1=${fromTenths(circT)}`)} 입니다.`,
    fig("sphere", { r }),
  );
}

/** 심화 — 역산. 단면의 둘레에서 구의 반지름(그림 없음). 원주율 `$3.14$`. */
function ballKnowDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 25);
  const circC = 2 * r * 314;
  return make(
    unit,
    `어떤 구를 중심을 지나게 잘랐더니 잘린 면의 둘레가 ${unitNum(fromCents(circC), "cm")} 였습니다. ` +
      `이 구의 반지름은 몇 cm인가? (원주율: ${num("3.14")})`,
    num(r),
    `잘린 면은 구와 반지름이 같은 원입니다. 그 원의 지름은 ` +
      `${expr(`${fromCents(circC)}\\div3.14=${2 * r}`)} 이므로 ` +
      `반지름은 ${expr(`${2 * r}\\div2=${r}`)} 입니다.`,
  );
}

// ══════ 확대 갈래 2차분 — `1-2` · `1-6` · `2-4` (D-113 · D-115, 2026-08-31) ══════
//
// 파일럿(`2-2 소수의 나눗셈`, 위)에 이어 **세 대단원**을 세운다. 고른 근거와 각 대단원이
// 예약한 «굳힘 축» 은 `docs/planning/tracks/reports/tier-fill-g6-w2.md` §1 에 있다.
// 여기 적는 것은 **코드가 지켜야 하는 약속**이다.
//
// ## 🔴 반증 ⑥ 가드는 **규칙 한 곳**에서 온다 — `forwardReach.ts`
//
// 파일럿은 `oneStepHits`(한 걸음 정수 곱)를 손으로 다시 썼고, 적대 검토가 그 때문에
// 「잣대와 가드가 두 벌」이 되어 80자리 중 **10자리**가 새는 것을 실측으로 잡았다
// (`17-elem-backsolve-dossier.md` §2.4-2.1). 그래서 이 차분은 판정기가 쓰는 바로 그
// 함수(`forwardReachable`)를 **후보를 만들 때** 부른다. 입력만 다르다 —
// 여기서는 「지면에 찍힐 수」를 예측하고, 판정기는 **찍힌 지면을 읽는다.** 갈리면 판정기가 옳다.
//
// ## 세 대단원이 «굳히는 성질» — 서로 겹치지 않게 하나씩 예약했다
//
//   1-2  성분이 밑면 변의 수 $n$ 의 **일차식**이다 — 모서리 $3n$·꼭짓점 $2n$·면 $n+2$
//        (각뿔은 $2n$·$n+1$·$n+1$). 그래서 성분을 **범위**로만 주면 「$3$의 배수」·
//        「면 수 = 꼭짓점 수」 같은 **세는 성질**이 하나를 고른다.
//   1-6  **세 모서리의 곱**(부피)과 **겉넓이의 구조**. 곱만 알면 두 모서리가 동시에 안 굳는다.
//   2-4  **한 묶음 $k$**. 비만 알면 실제 값이 안 굳고, 「가장 간단한 자연수의 비」(서로소)나
//        「그 몫이 자연수」가 굳힌다.
//
// 🔴 **1-2 에서 「옆면 넓이 $=n\times s\times h$ 인수 짝」을 쓰지 않는다.** 그것은 1-6 의
//    삼조 축과 같은 모양이고(적대 검토 §1.4 가 1-6 에 예약했다), 게다가 $n$ 후보가
//    $3\sim8$ **여섯**뿐이라 «만들어 견주기»가 **기각된 열거 축**과 구별되지 않는다(§3-③).
//    그래서 1-2 의 심화상은 «입체의 종류를 안 말한다» 하나뿐이고 나머지 넷은 **비웠다.**
//
// ## 그림을 안 붙인다
//
// `prism`·`pyramid` 겨냥도는 **밑면의 변의 수를 그대로 보여 준다** — 이 갈래들이 안 굳게
// 두려는 바로 그 값이다. `cuboid` 는 세 모서리를 글자로 찍는다(09 §4). 그래서 확대 갈래는
// 심화하와 같이 **그림 없이 말로만** 낸다.

/**
 * **반증 ⑥ + 「답을 발문에 두지 않는다」 가드** — 규칙은 `forwardReach.ts` 한 곳이다.
 *
 * `page` 는 발문의 `$…$` 안에 찍힐 수 전부(정수), `answer` 는 답이다.
 * 순방향으로 닿거나 답이 지면에 그대로 있으면 **후보에서 뺀다.**
 */
/**
 * 🔴 **`pad` 는 반드시 $1$ 부터 돈다.** 아래 풀들은 구간을 `값 ± pad` 로 만드는데,
 * `pad` 를 $3$ 부터 돌리면 「구간 안에 후보가 둘 이상인가」 가드가 **죽은 코드**가 된다
 * (구간 폭이 늘 $6$ 이상이라 조건이 참일 수가 없다). 실제로 그렇게 짰다가 변이 시험이
 * 「⛔ 산출물이 그대로다」로 잡아냈다 — 가드는 있는데 **아무것도 안 거르고 있었다.**
 * 좁은 `pad` 를 **들여보내고 가드가 거르게** 두어야 그 가드를 망가뜨려 볼 수 있다.
 */
function backsolveSafe(page: readonly number[], answer: number): boolean {
  const nums = page.map((v) => rat(v));
  const ans = rat(answer);
  return !forwardReachable(nums, ans) && !answerPrintedOnPage(nums, ans);
}

/** 구간 $(lo, up)$ 안의 `m` 의 배수를 모두. 끝점은 **넣지 않는다**(「보다 크고/작고」). */
function multiplesBetween(lo: number, up: number, m: number): number[] {
  const out: number[] = [];
  for (let v = Math.floor(lo / m) * m; v < up; v += m) if (v > lo) out.push(v);
  return out;
}

// ── 1-2-1 각기둥 알아보기와 밑면·옆면 — 심화중 ──────────────────────────────
//
// 안 굳는 마디: **옆면 전체의 넓이**(구간으로만 준다).
// 굳히는 성질: 「각기둥의 옆면은 모두 합동인 직사각형이고 그 수는 밑면의 변의 수와 같다」
//            → 전체 넓이는 **옆면 하나 넓이의 배수**다. 구간 안에 그 배수가 하나뿐이다.
// 심화하와 겹치지 않는다 — 심화하는 밑면을 **이름으로 주고**($n$ 이 굳어 있다) 높이를 되짚는다.

const PRISM_AREA_MID = lazyTable("g6.PRISM_AREA_MID", () => {
  const table: {
    s: number;
    h: number;
    lo: number;
    up: number;
    n: number;
  }[] = [];
  for (let s = 3; s <= 8; s += 1)
    for (let h = 3; h <= 9; h += 1) {
      const one = s * h;
      for (const n of TIER_SIDES) {
        const area = one * n;
        if (area > 400) continue; // 규모는 축이 아니다 (D-115 ⑽③)
        for (let pad = 1; pad < one; pad += 1) {
          const lo = area - pad;
          const up = area + pad;
          if (lo <= 0) continue;
          // 구간 안에 «다른 후보»가 적어도 하나 더 있어야 성질이 일한다.
          if (up - lo < 5) continue;
          if (multiplesBetween(lo, up, one).length !== 1) continue;
          if (!backsolveSafe([s, h, lo, up], n)) continue;
          table.push({ s, h, lo, up, n });
        }
      }
    }
  return table;
});

function prismAreaMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, PRISM_AREA_MID());
  const one = c.s * c.h;
  const area = one * c.n;
  return makeDeep(
    unit,
    `밑면의 변의 길이가 모두 ${unitNum(c.s, "cm")} 로 같고 높이가 ${unitNum(c.h, "cm")} 인 각기둥이 있습니다. ` +
      `옆면 전체의 넓이가 ${num(c.lo)} cm²보다 넓고 ${num(c.up)} cm²보다 좁을 때, ` +
      `이 각기둥의 옆면은 몇 개입니까?`,
    num(c.n),
    [
      `각기둥의 옆면은 모두 가로가 ${unitNum(c.s, "cm")}, 세로가 ${unitNum(c.h, "cm")} 인 직사각형이므로 ` +
        `옆면 하나의 넓이는 ${expr(`${c.s}\\times${c.h}=${one}`)} cm²입니다.`,
      `옆면 전체의 넓이는 옆면 하나의 넓이의 배수입니다. ` +
        `${num(c.lo)}보다 크고 ${num(c.up)}보다 작은 ${num(one)}의 배수는 ` +
        `${expr(`${one}\\times${c.n}=${area}`)} 뿐이므로 옆면은 ${num(c.n)}개이고, ` +
        `이 각기둥은 ${sino(c.n)}각기둥입니다.`,
    ],
  );
}

// ── 1-2-2 각기둥의 이름과 구성 요소 — 심화중 ────────────────────────────────
//
// 안 굳는 마디: **모서리의 수**(구간). 굳히는 성질: 「각기둥의 모서리는 밑면 변의 수의 $3$배」.

const PRISM_EDGE_MID = lazyTable("g6.PRISM_EDGE_MID", () => {
  const table: {
    lo: number;
    up: number;
    n: number;
    ask: "면" | "꼭짓점";
  }[] = [];
  for (const n of TIER_SIDES) {
    const e = 3 * n;
    for (let lo = e - 4; lo <= e - 1; lo += 1)
      for (let up = e + 1; up <= e + 4; up += 1) {
        if (lo < 5 || up - lo < 3) continue; // 구간 안에 후보가 둘 이상이어야 성질이 일한다
        if (multiplesBetween(lo, up, 3).length !== 1) continue;
        for (const ask of ["면", "꼭짓점"] as const) {
          const ans = ask === "면" ? n + 2 : 2 * n;
          if (!backsolveSafe([lo, up], ans)) continue;
          table.push({ lo, up, n, ask });
        }
      }
  }
  return table;
});

function prismEdgeMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, PRISM_EDGE_MID());
  const e = 3 * c.n;
  const ans = c.ask === "면" ? c.n + 2 : 2 * c.n;
  const calc =
    c.ask === "면" ? `${c.n}+2=${c.n + 2}` : `${c.n}\\times2=${2 * c.n}`;
  return makeDeep(
    unit,
    `어떤 각기둥의 모서리가 ${num(c.lo)}개보다 많고 ${num(c.up)}개보다 적습니다. ` +
      `이 각기둥의 ${c.ask}은 몇 개입니까?`,
    num(ans),
    [
      `각기둥의 모서리의 수는 밑면의 변의 수의 ${num(3)}배이므로 ${num(3)}의 배수입니다. ` +
        `${num(c.lo)}보다 크고 ${num(c.up)}보다 작은 ${num(3)}의 배수는 ${num(e)} 하나입니다.`,
      `${expr(`${e}\\div3=${c.n}`)} 이므로 밑면은 ${polyName(c.n)}이고 ${sino(c.n)}각기둥입니다. ` +
        `${c.ask}의 수는 ${expr(calc)} 입니다.`,
    ],
  );
}

// ── 1-2-3 각기둥의 전개도 — 심화중 ──────────────────────────────────────────
//
// 안 굳는 마디: **옆면을 이어 붙인 가로 길이**(구간).
// 굳히는 성질: 「전개도에서 그 가로는 **밑면의 둘레**와 같다」 → 한 변 길이의 배수.

const PRISM_NET_MID = lazyTable("g6.PRISM_NET_MID", () => {
  const table: { s: number; lo: number; up: number; n: number }[] = [];
  for (let s = 4; s <= 9; s += 1)
    for (const n of TIER_SIDES) {
      const per = s * n;
      for (let pad = 1; pad < s; pad += 1) {
        const lo = per - pad;
        const up = per + pad;
        if (lo <= 0 || up - lo < 4) continue;
        if (multiplesBetween(lo, up, s).length !== 1) continue;
        if (!backsolveSafe([s, lo, up], n)) continue;
        table.push({ s, lo, up, n });
      }
    }
  return table;
});

function prismNetMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, PRISM_NET_MID());
  const per = c.s * c.n;
  return makeDeep(
    unit,
    `밑면의 변의 길이가 모두 ${unitNum(c.s, "cm")} 로 같은 각기둥의 전개도가 있습니다. ` +
      `전개도에서 옆면을 이어 붙인 부분의 가로 길이가 ${unitNum(c.lo, "cm")} 보다 길고 ` +
      `${unitNum(c.up, "cm")} 보다 짧을 때, 이 각기둥의 옆면은 몇 개입니까?`,
    num(c.n),
    [
      `전개도에서 옆면을 이어 붙인 부분의 가로 길이는 밑면의 둘레와 같습니다. ` +
        `밑면의 변의 길이가 모두 ${num(c.s)} cm이므로 그 길이는 ${num(c.s)}의 배수입니다.`,
      `${num(c.lo)}보다 크고 ${num(c.up)}보다 작은 ${num(c.s)}의 배수는 ` +
        `${expr(`${c.s}\\times${c.n}=${per}`)} 뿐입니다. 따라서 밑면은 ${polyName(c.n)}이고 ` +
        `옆면은 ${expr(`${per}\\div${c.s}=${c.n}`)} 개입니다.`,
    ],
  );
}

// ── 1-2-4 각뿔 알아보기와 밑면·옆면 — 심화중 ────────────────────────────────
//
// 1-2-1 의 짝이되 **옆면이 삼각형**이라 굳히는 성질이 다르다(넓이에 $\div2$ 가 붙는다).
// 묻는 것도 다르다 — 1-2-1 은 «옆면의 수», 여기는 «밑면의 이름»(R5).

const PYR_AREA_MID = lazyTable("g6.PYR_AREA_MID", () => {
  const table: {
    s: number;
    h: number;
    lo: number;
    up: number;
    n: number;
  }[] = [];
  for (let s = 4; s <= 10; s += 1)
    for (let h = 4; h <= 12; h += 1) {
      if ((s * h) % 2 !== 0) continue; // 옆면 하나의 넓이가 자연수라야 한다
      const one = (s * h) / 2;
      for (const n of TIER_SIDES) {
        const area = one * n;
        if (area > 400) continue;
        for (let pad = 1; pad < one; pad += 1) {
          const lo = area - pad;
          const up = area + pad;
          if (lo <= 0 || up - lo < 5) continue;
          if (multiplesBetween(lo, up, one).length !== 1) continue;
          if (!backsolveSafe([s, h, lo, up], n)) continue;
          table.push({ s, h, lo, up, n });
        }
      }
    }
  return table;
});

function pyrAreaMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, PYR_AREA_MID());
  const one = (c.s * c.h) / 2;
  const area = one * c.n;
  return makeDeep(
    unit,
    `밑면의 변의 길이가 모두 ${unitNum(c.s, "cm")} 로 같은 각뿔이 있습니다. ` +
      `옆면인 삼각형의 높이가 ${unitNum(c.h, "cm")} 이고 옆면 전체의 넓이가 ` +
      `${num(c.lo)} cm²보다 넓고 ${num(c.up)} cm²보다 좁을 때, 이 각뿔의 밑면은 어떤 도형입니까?`,
    polyName(c.n),
    [
      `각뿔의 옆면은 모두 밑변이 ${unitNum(c.s, "cm")}, 높이가 ${unitNum(c.h, "cm")} 인 삼각형이므로 ` +
        `옆면 하나의 넓이는 ${expr(`${c.s}\\times${c.h}\\div2=${one}`)} cm²입니다.`,
      `옆면 전체의 넓이는 옆면 하나의 넓이의 배수입니다. ` +
        `${num(c.lo)}보다 크고 ${num(c.up)}보다 작은 ${num(one)}의 배수는 ` +
        `${expr(`${one}\\times${c.n}=${area}`)} 뿐이므로 옆면은 ${num(c.n)}개이고 ` +
        `밑면은 ${polyName(c.n)}입니다.`,
    ],
  );
}

// ── 1-2-4 각뿔 알아보기 — 심화상 ────────────────────────────────────────────
//
// 🔴 후보의 범위는 각기둥·각뿔로 발문에 밝힌다. 어느 쪽인지는 말하지 않아
//    성질만으로는 못 고른다 — 각각의 꼭짓점을 **실제로
//    계산해** 조건에 대 봐야 하나가 남는다(D-115 ⑾: 끝까지 계산해야 하면 «상»).
//    이 소단원의 이름이 「각뿔 **알아보기**」이고, 각뿔을 각기둥과 가르는 것이 바로
//    「밑면이 하나·옆면이 삼각형」이라 반증 ③ 도 안 건드린다.

const SOLID_KIND_TOP = lazyTable("g6.SOLID_KIND_TOP", () => {
  const table: { f: number; cap: number }[] = [];
  for (let f = 5; f <= 9; f += 1) {
    const nPrism = f - 2;
    const nPyr = f - 1;
    const vPrism = 2 * nPrism;
    const vPyr = nPyr + 1;
    // 각뿔만 남는 상한 — 각뿔의 꼭짓점보다 크고 각기둥의 꼭짓점 이하.
    for (let cap = vPyr + 1; cap <= vPrism; cap += 1) {
      if (!backsolveSafe([f, cap], 2 * nPyr)) continue;
      table.push({ f, cap });
    }
  }
  return table;
});

function solidKindTop(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, SOLID_KIND_TOP());
  const nPrism = c.f - 2;
  const nPyr = c.f - 1;
  return makeDeep(
    unit,
    `각기둥이나 각뿔 가운데 하나인 입체도형의 면이 ${num(c.f)}개입니다. 이 입체도형의 꼭짓점이 ${num(c.cap)}개보다 적을 때, ` +
      `모서리는 몇 개입니까?`,
    num(2 * nPyr),
    [
      `옆면이 직사각형이면 각기둥이고 옆면이 삼각형이면 각뿔입니다. ` +
        `면이 ${num(c.f)}개인 입체도형은 둘 다 될 수 있으므로 각각 따져 봅니다.`,
      `각기둥이라면 밑면 ${num(2)}개를 뺀 ${expr(`${c.f}-2=${nPrism}`)} 개가 옆면이므로 ` +
        `밑면은 ${polyName(nPrism)}이고 꼭짓점은 ${expr(`${nPrism}\\times2=${2 * nPrism}`)} 개인데, ` +
        `이것은 ${num(c.cap)}개보다 적지 않습니다.`,
      `각뿔이라면 밑면 ${num(1)}개를 뺀 ${expr(`${c.f}-1=${nPyr}`)} 개가 옆면이므로 ` +
        `밑면은 ${polyName(nPyr)}이고 꼭짓점은 ${expr(`${nPyr}+1=${nPyr + 1}`)} 개로 ` +
        `${num(c.cap)}개보다 적습니다. 따라서 모서리는 ${expr(`${nPyr}\\times2=${2 * nPyr}`)} 개입니다.`,
    ],
  );
}

// ── 1-2-5 각뿔의 이름과 구성 요소 — 심화중 ──────────────────────────────────
//
// 굳히는 성질이 1-2-2 와 다르다 — 「각뿔은 **면의 수와 꼭짓점의 수가 같다**」.
// (토대 문서가 「그 성질 때문에 심화하 둘이 같은 문항이 됐다」고 적은 자리를,
//  중복을 만드는 대신 **마디를 굳히는 데** 쓴다.)

const PYR_SUM_MID = lazyTable("g6.PYR_SUM_MID", () => {
  const table: {
    lo: number;
    up: number;
    n: number;
    kind: "꼭짓점" | "모서리";
  }[] = [];
  for (const n of TIER_SIDES) {
    // ㉠ 면 + 꼭짓점 — 각뿔은 둘이 같으므로 합이 **짝수**다.
    const even = 2 * (n + 1);
    for (let lo = even - 3; lo <= even - 1; lo += 1)
      for (let up = even + 1; up <= even + 3; up += 1) {
        if (lo < 5 || up - lo < 3) continue;
        let evens = 0;
        for (let v = lo + 1; v < up; v += 1) if (v % 2 === 0) evens += 1;
        if (evens !== 1) continue;
        if (!backsolveSafe([lo, up], 2 * n)) continue;
        table.push({ lo, up, n, kind: "꼭짓점" });
      }
    // ㉡ 면 + 모서리 — $(n+1)+2n=3n+1$ 이라 **$1$ 을 빼면 $3$ 의 배수**다.
    const tri = 3 * n + 1;
    for (let lo = tri - 3; lo <= tri - 1; lo += 1) {
      const up = lo + 4;
      if (lo < 5) continue;
      let hits = 0;
      for (let v = lo + 1; v < up; v += 1) if ((v - 1) % 3 === 0) hits += 1;
      if (hits !== 1) continue;
      if (!backsolveSafe([lo, up], n + 1)) continue;
      table.push({ lo, up, n, kind: "모서리" });
    }
  }
  return table;
});

function pyrSumMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, PYR_SUM_MID());
  if (c.kind === "꼭짓점") {
    const sum = 2 * (c.n + 1);
    return makeDeep(
      unit,
      `어떤 각뿔의 면의 개수와 꼭짓점의 개수를 합하면 ${num(c.lo)}개보다 많고 ${num(c.up)}개보다 적습니다. ` +
        `이 각뿔의 모서리는 몇 개입니까?`,
      num(2 * c.n),
      [
        `각뿔은 면의 개수와 꼭짓점의 개수가 같습니다. 그러므로 두 개수의 합은 ` +
          `면의 개수의 ${num(2)}배, 곧 짝수입니다.`,
        `${num(c.lo)}보다 크고 ${num(c.up)}보다 작은 짝수는 ${num(sum)} 하나이므로 ` +
          `면은 ${expr(`${sum}\\div2=${c.n + 1}`)} 개입니다. 면은 밑면 ${num(1)}개와 옆면을 더한 것이므로 ` +
          `밑면은 ${polyName(c.n)}이고, 모서리는 ${expr(`${c.n}\\times2=${2 * c.n}`)} 개입니다.`,
      ],
    );
  }
  const sum = 3 * c.n + 1;
  return makeDeep(
    unit,
    `어떤 각뿔의 면의 개수와 모서리의 개수를 합하면 ${num(c.lo)}개보다 많고 ${num(c.up)}개보다 적습니다. ` +
      `이 각뿔의 꼭짓점은 몇 개입니까?`,
    num(c.n + 1),
    [
      `밑면의 변이 ${expr("\\square")} 개인 각뿔은 면이 ${expr("\\square+1")} 개, ` +
        `모서리가 ${expr("\\square\\times2")} 개이므로 두 개수의 합은 ${expr("\\square\\times3+1")} 입니다. ` +
        `그러므로 합에서 ${num(1)}을 빼면 ${num(3)}의 배수입니다.`,
      `${num(c.lo)}보다 크고 ${num(c.up)}보다 작은 수 가운데 ${num(1)}을 뺐을 때 ${num(3)}의 배수가 되는 것은 ` +
        `${num(sum)} 하나입니다. ${expr(`(${sum}-1)\\div3=${c.n}`)} 이므로 밑면은 ${polyName(c.n)}이고, ` +
        `꼭짓점은 ${expr(`${c.n}+1=${c.n + 1}`)} 개입니다.`,
    ],
  );
}

// ── 1-6-1 직육면체의 겉넓이 — 심화중 ────────────────────────────────────────
//
// 안 굳는 마디: **겉넓이**(구간). 굳히는 성질: 「겉넓이 = 두 밑면 + 옆면 네 면」이고
// 옆면의 넓이는 **밑면의 둘레의 배수**다. 심화하는 겉넓이를 값으로 주어 높이가 곧바로 굳는다.

const SURF_RANGE_MID = lazyTable("g6.SURF_RANGE_MID", () => {
  const table: {
    w: number;
    d: number;
    lo: number;
    up: number;
    h: number;
  }[] = [];
  for (let w = 2; w <= 8; w += 1)
    for (let d = w + 1; d <= 9; d += 1) {
      const base = 2 * w * d;
      const per = 2 * (w + d);
      for (let h = 3; h <= 9; h += 1) {
        const s = base + per * h;
        if (s > 500) continue;
        for (let pad = 1; pad < per; pad += 1) {
          const lo = s - pad;
          const up = s + pad;
          if (lo <= base || up - lo < 6) continue;
          if (multiplesBetween(lo - base, up - base, per).length !== 1)
            continue;
          if (!backsolveSafe([w, d, lo, up], h)) continue;
          table.push({ w, d, lo, up, h });
        }
      }
    }
  return table;
});

function surfRangeMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, SURF_RANGE_MID());
  const base = 2 * c.w * c.d;
  const per = 2 * (c.w + c.d);
  return makeDeep(
    unit,
    `가로가 ${unitNum(c.w, "cm")}, 세로가 ${unitNum(c.d, "cm")} 인 직육면체의 겉넓이가 ` +
      `${num(c.lo)} cm²보다 넓고 ${num(c.up)} cm²보다 좁습니다. ` +
      `높이가 자연수 cm일 때, 이 직육면체의 높이는 몇 cm입니까?`,
    num(c.h),
    [
      `두 밑면의 넓이는 ${expr(`${c.w}\\times${c.d}\\times2=${base}`)} cm²입니다.`,
      `옆면 네 면의 가로를 이으면 밑면의 둘레와 같으므로 그 길이는 ` +
        `${expr(`(${c.w}+${c.d})\\times2=${per}`)} cm이고, 옆면의 넓이는 ${num(per)}의 배수입니다.`,
      `겉넓이에서 두 밑면을 빼면 옆면의 넓이이므로 옆면의 넓이는 ${num(c.lo - base)}보다 크고 ` +
        `${num(c.up - base)}보다 작습니다. 그런 ${num(per)}의 배수는 ${num(per * c.h)} 하나이므로 ` +
        `높이는 ${expr(`${per * c.h}\\div${per}=${c.h}`)} cm입니다.`,
    ],
  );
}

// ── 1-6-1 직육면체의 겉넓이 — 심화상 ────────────────────────────────────────
//
// 🔴 후보를 되짚기가 만든다 — 「밑면이 정사각형」이라 겉넓이가 한 변의 **두 번 곱**을
//    품고, 초등 과정에는 그것을 되짚는 규칙이 없다. 한 변을 하나씩 늘려 **겉넓이를 실제로
//    만들어 견주어야** 하나가 남는다. 한 변이 커지면 겉넓이도 반드시 커지므로 **답은 하나**다
//    (토대 함정 ㉣ 「겉넓이 방정식은 답이 여럿이기 쉽다」를 이 단조성으로 막는다).

const SURF_SQUARE_TOP = lazyTable("g6.SURF_SQUARE_TOP", () => {
  const table: { a: number; h: number; s: number }[] = [];
  for (let a = 2; a <= 9; a += 1)
    for (let h = 3; h <= 12; h += 1) {
      if (h === a) continue;
      const s = 2 * a * a + 4 * a * h;
      if (s > 600) continue;
      if (!backsolveSafe([h, s], a)) continue;
      table.push({ a, h, s });
    }
  return table;
});

function surfSquareTop(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, SURF_SQUARE_TOP());
  const area = (t: number) => 2 * t * t + 4 * t * c.h;
  const line = (t: number) =>
    expr(`${t}\\times${t}\\times2+${t}\\times4\\times${c.h}=${area(t)}`);
  return makeDeep(
    unit,
    `밑면이 정사각형인 직육면체의 높이가 ${unitNum(c.h, "cm")} 이고 겉넓이가 ${num(c.s)} cm²입니다. ` +
      `밑면의 한 변의 길이가 자연수 cm일 때, 밑면의 한 변은 몇 cm입니까?`,
    num(c.a),
    [
      `밑면이 정사각형이므로 겉넓이는 밑면 두 개의 넓이에 옆면 네 개의 넓이를 더한 것입니다. ` +
        `밑면의 한 변을 하나씩 늘려 가며 겉넓이를 만들어 견줍니다.`,
      `한 변이 ${num(c.a - 1)} cm이면 ${line(c.a - 1)} 이고, ` +
        `한 변이 ${num(c.a)} cm이면 ${line(c.a)} 이며, ` +
        `한 변이 ${num(c.a + 1)} cm이면 ${line(c.a + 1)} 입니다.`,
      `한 변이 길어지면 겉넓이도 커지므로 겉넓이가 ${num(c.s)} cm²인 것은 ` +
        `한 변이 ${num(c.a)} cm일 때뿐입니다.`,
    ],
  );
}

// ── 1-6-2 직육면체의 부피 — 심화중 ──────────────────────────────────────────
//
// 안 굳는 마디: **세로와 높이가 동시에 미지**다(곱만 안다). 굳히는 조건: 두 모서리의 «차».
// 심화하는 세 모서리 중 **둘을 발문이 주어** 마디가 하나도 안 남는다.

const VOL_PAIR_MID = lazyTable("g6.VOL_PAIR_MID", () => {
  const table: {
    v: number;
    w: number;
    gap: number;
    d: number;
    h: number;
  }[] = [];
  for (let w = 2; w <= 9; w += 1)
    for (let h = 2; h <= 9; h += 1)
      for (let gap = 1; gap <= 6; gap += 1) {
        const d = h + gap;
        const p = d * h;
        const v = w * p;
        if (v > 400) continue;
        // 🔴 **답이 하나인 것은 가드가 아니라 대수가 보장한다.** 곱이 $p$ 이고 차가
        //    `gap` 인 자연수 짝은 $x(x+gap)=p$ 의 해라 **많아야 하나**다. 그래서 여기
        //    「짝이 정확히 하나인가」를 세는 코드를 두었다가 지웠다 — 늘 참이라
        //    **아무것도 안 거르는 장식**이었고, 변이 시험이 「산출물이 그대로」로 잡았다.
        //    이 자리에서 실제로 일하는 가드는 아래 반증 ⑥ 하나다(실측 61/279 를 거른다).
        if (!backsolveSafe([v, w, gap], d)) continue;
        table.push({ v, w, gap, d, h });
      }
  return table;
});

function volPairMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, VOL_PAIR_MID());
  const p = c.d * c.h;
  return makeDeep(
    unit,
    `부피가 ${num(c.v)} cm³이고 가로가 ${unitNum(c.w, "cm")} 인 직육면체가 있습니다. ` +
      `세로와 높이가 모두 자연수 cm이고 세로가 높이보다 ${unitNum(c.gap, "cm")} 더 깁니다. ` +
      `이 직육면체의 세로는 몇 cm입니까?`,
    num(c.d),
    [
      `부피는 세 모서리의 길이의 곱이므로 세로와 높이의 곱은 ` +
        `${expr(`${c.v}\\div${c.w}=${p}`)} 입니다.`,
      `곱이 ${num(p)}이면서 차가 ${num(c.gap)}인 두 자연수를 찾으면 ` +
        `${expr(`${c.d}\\times${c.h}=${p}`)} 이고 ${expr(`${c.d}-${c.h}=${c.gap}`)} 이므로 ` +
        `세로는 ${unitNum(c.d, "cm")}, 높이는 ${unitNum(c.h, "cm")} 입니다.`,
    ],
  );
}

// ── 1-6-2 직육면체의 부피 — 심화상 ──────────────────────────────────────────
//
// 🔴 후보를 되짚기가 만든다 — 부피 값이 **서로 다른 세 자연수의 곱**으로 갈라지는 방법이
//    셋 이상이고, 발문은 그 삼조를 하나도 주지 않는다. 각 삼조의 **가장 긴 모서리를 실제로
//    보아야** 하나가 남는다.

/** 곱이 `v` 인 **서로 다른** 세 자연수 삼조를 오름차순으로 전부. */
function volumeTriples(v: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let a = 1; a * a * a < v; a += 1) {
    if (v % a !== 0) continue;
    const rest = v / a;
    for (let b = a + 1; b * b < rest; b += 1) {
      if (rest % b !== 0) continue;
      const c = rest / b;
      if (c > b) out.push([a, b, c]);
    }
  }
  return out;
}

const VOL_TRIPLE_TOP = lazyTable("g6.VOL_TRIPLE_TOP", () => {
  const table: { v: number; cap: number }[] = [];
  for (let v = 24; v <= 240; v += 1) {
    const triples = volumeTriples(v);
    if (triples.length < 3 || triples.length > 6) continue;
    const longest = triples.map((t) => t[2]).sort((x, y) => x - y);
    for (let cap = longest[0]! + 1; cap <= longest[1]!; cap += 1) {
      const kept = triples.filter((t) => t[2] < cap);
      if (kept.length !== 1) continue;
      const sum = kept[0]![0] + kept[0]![1] + kept[0]![2];
      if (!backsolveSafe([v, cap], sum)) continue;
      table.push({ v, cap });
    }
  }
  return table;
});

function volTripleTop(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, VOL_TRIPLE_TOP());
  const triples = volumeTriples(c.v);
  const win = triples.find((t) => t[2] < c.cap)!;
  const sum = win[0] + win[1] + win[2];
  return makeDeep(
    unit,
    `부피가 ${num(c.v)} cm³인 직육면체가 있습니다. 세 모서리의 길이는 모두 다른 자연수 cm이고, ` +
      `가장 긴 모서리가 ${unitNum(c.cap, "cm")} 보다 짧습니다. ` +
      `이 직육면체의 세 모서리의 길이의 합은 몇 cm입니까?`,
    num(sum),
    [
      `부피는 세 모서리의 길이의 곱입니다. ${num(c.v)}${numJosa(c.v, "을", "를")} ` +
        `서로 다른 세 자연수의 곱으로 나타내는 방법을 모두 찾습니다.`,
      `${triples
        .map((t) => expr(`${t[0]}\\times${t[1]}\\times${t[2]}=${c.v}`))
        .join(", ")} 입니다.`,
      `이 중 가장 긴 모서리가 ${num(c.cap)}보다 짧은 것은 ` +
        `${expr(`${win[0]}\\times${win[1]}\\times${win[2]}=${c.v}`)} 뿐입니다. ` +
        `세 모서리의 길이의 합은 ${expr(`${win[0]}+${win[1]}+${win[2]}=${sum}`)} cm입니다.`,
    ],
  );
}

// ── 1-6-3 ㎥ 알아보기 — 심화중 ──────────────────────────────────────────────
//
// 이 소단원이 더하는 것은 **환산**이다. 부피를 $\mathrm{cm}^3$ 구간으로 주면 먼저
// $\mathrm{m}^3$ 로 옮겨야 밑면 넓이의 배수라는 성질을 쓸 수 있다.
//
// 🔴 **심화상은 비웠다** — 여기서 후보를 만드는 축은 1-6-2 의 «세 모서리 삼조» 하나뿐이고,
//    그것을 m 단위로 옮기면 «단위만 다른 같은 문항»이 된다. 걸음을 하나 늘리는 것은
//    마디를 늘리는 것이 아니다(D-115 ⑶ · 토대 함정 ㉡).

const CUBIC_RANGE_MID = lazyTable("g6.CUBIC_RANGE_MID", () => {
  const table: {
    w: number;
    d: number;
    lo: number;
    up: number;
    h: number;
  }[] = [];
  for (let w = 2; w <= 6; w += 1)
    for (let d = w; d <= 6; d += 1) {
      const base = w * d;
      for (let h = 2; h <= 9; h += 1) {
        const v = base * h;
        for (let pad = 1; pad < base; pad += 1) {
          const lo = v - pad;
          const up = v + pad;
          if (lo <= 0 || up - lo < 3) continue;
          if (multiplesBetween(lo, up, base).length !== 1) continue;
          if (!backsolveSafe([w, d, lo * 1000000, up * 1000000], h)) continue;
          table.push({ w, d, lo, up, h });
        }
      }
    }
  return table;
});

function cubicRangeMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, CUBIC_RANGE_MID());
  const base = c.w * c.d;
  const v = base * c.h;
  return makeDeep(
    unit,
    `가로가 ${unitNum(c.w, "m")}, 세로가 ${unitNum(c.d, "m")} 인 직육면체 모양 창고가 있습니다. ` +
      `이 창고의 부피가 ${num(c.lo * 1000000)} cm³보다 크고 ${num(c.up * 1000000)} cm³보다 작습니다. ` +
      `높이가 자연수 m일 때, 이 창고의 높이는 몇 m입니까?`,
    num(c.h),
    [
      `${expr("1\\,\\mathrm{m}^3=1000000\\,\\mathrm{cm}^3")} 이므로 부피는 ` +
        `${expr(`${c.lo * 1000000}\\div1000000=${c.lo}`)} m³보다 크고 ` +
        `${expr(`${c.up * 1000000}\\div1000000=${c.up}`)} m³보다 작습니다.`,
      `밑면의 넓이는 ${expr(`${c.w}\\times${c.d}=${base}`)} m²이므로 부피는 ${num(base)}의 배수입니다. ` +
        `${num(c.lo)}보다 크고 ${num(c.up)}보다 작은 ${num(base)}의 배수는 ` +
        `${expr(`${base}\\times${c.h}=${v}`)} 뿐이므로 높이는 ${num(c.h)} m입니다.`,
    ],
  );
}

// ── 2-4-1 비의 성질 — 심화중 ────────────────────────────────────────────────
//
// 안 굳는 마디: **곱한 수**(= 한 묶음의 크기). 심화하는 그 수를 **발문이 준다.**
// 굳히는 성질: 「가장 간단한 자연수의 비는 두 항의 공약수가 $1$ 뿐이다」 — 이 대단원이
// 예약한 축이다(토대 §1.4).

const RATIO_PROP_MID = lazyTable("g6.RATIO_PROP_MID", () => {
  const table: { pa: number; pb: number; g: number }[] = [];
  for (let a = 1; a <= 9; a += 1)
    for (let b = a + 1; b <= 12; b += 1) {
      if (gcd(a, b) !== 1) continue;
      for (let g = 2; g <= 9; g += 1) {
        const pa = a * g;
        const pb = b * g;
        if (pb > 96) continue;
        if (!backsolveSafe([pa, pb], b - a)) continue;
        table.push({ pa, pb, g });
      }
    }
  return table;
});

function ratioPropMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, RATIO_PROP_MID());
  const a = c.pa / c.g;
  const b = c.pb / c.g;
  return makeDeep(
    unit,
    `어떤 비의 전항과 후항에 각각 같은 수를 곱했더니 ${expr(`${c.pa}:${c.pb}`)}${numJosa(c.pb, "이", "가")} 되었습니다. ` +
      `처음 비가 가장 간단한 자연수의 비일 때, 처음 비의 전항과 후항의 차는 얼마입니까?`,
    num(b - a),
    [
      `가장 간단한 자연수의 비는 두 항의 공약수가 ${num(1)} 뿐인 비입니다. ` +
        `${num(c.pa)}${numJosa(c.pa, "과", "와")} ${num(c.pb)}의 최대공약수는 ${num(c.g)}입니다.`,
      `전항과 후항을 각각 ${num(c.g)}${numRo(c.g)} 나누면 ` +
        `${expr(`${c.pa}\\div${c.g}:${c.pb}\\div${c.g}=${a}:${b}`)} 입니다. ` +
        `두 항의 차는 ${expr(`${b}-${a}=${b - a}`)} 입니다.`,
    ],
  );
}

// ── 2-4-2 간단한 자연수의 비로 나타내기 — 심화중 ────────────────────────────
//
// 안 굳는 마디: **실제 두 길이**(비만 알면 $ak:bk$ 로 흩어진다).
// 굳히는 성질: 지면의 비를 **가장 간단한 자연수의 비로 고쳐야** 「가로가 $a$의 배수」를 안다.
// ⚠️ 이 소단원은 지면에 «아직 간단히 할 것»이 남아 있어야 성립한다
//    (`probe-elem-section-conditions` 의 `간단한 자연수의 비`). 그래서 비를 **일부러
//    서로소가 아니게** 싣는다.

const SIMPLE_RATIO_MID = lazyTable("g6.SIMPLE_RATIO_MID", () => {
  const table: {
    am: number;
    lo: number;
    up: number;
    x: number;
    b: number;
  }[] = [];
  for (let am = 1; am <= 3; am += 1) {
    const w = am * 100;
    for (let b = 3; b <= 9; b += 1)
      for (let x = 6; x <= 240; x += 1) {
        if (x % b !== 0) continue;
        const g = gcd(w, x);
        if (x / g !== b) continue; // 간단히 하면 후항이 b 가 되는 세로만
        const a = w / g;
        if (a < 2 || a > 60) continue;
        for (let pad = 1; pad < b; pad += 1) {
          const lo = x - pad;
          const up = x + pad;
          if (lo <= 0 || up - lo < 4) continue;
          if (multiplesBetween(lo, up, b).length !== 1) continue;
          if (!backsolveSafe([am, lo, up, b], x)) continue;
          table.push({ am, lo, up, x, b });
        }
      }
  }
  return table;
});

function simpleRatioMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, SIMPLE_RATIO_MID());
  const w = c.am * 100;
  const g = gcd(w, c.x);
  const a = w / g;
  return makeDeep(
    unit,
    `어떤 직사각형 모양 게시판의 가로는 ${unitNum(c.am, "m")} 이고, 세로는 ` +
      `${unitNum(c.lo, "cm")} 보다 길고 ${unitNum(c.up, "cm")} 보다 짧은 자연수 cm입니다. ` +
      `가로와 세로의 길이의 비를 가장 간단한 자연수의 비로 나타내면 후항이 ${num(c.b)} 입니다. ` +
      `이 비를 쓰시오.`,
    expr(`${a}:${c.b}`),
    [
      `두 길이의 단위를 맞춥니다. ${expr("1\\,\\mathrm{m}=100\\,\\mathrm{cm}")} 이므로 ` +
        `가로는 ${expr(`${c.am}\\times100=${w}`)} cm입니다.`,
      `가장 간단한 자연수의 비의 후항이 ${num(c.b)}이므로 세로는 ${num(c.b)}의 배수입니다. ` +
        `${num(c.lo)}보다 크고 ${num(c.up)}보다 작은 ${num(c.b)}의 배수는 ${num(c.x)} 하나입니다.`,
      `${num(w)}${numJosa(w, "과", "와")} ${num(c.x)}의 최대공약수 ${num(g)}${numRo(g)} ` +
        `두 항을 나누면 ${expr(`${w}\\div${g}:${c.x}\\div${g}=${a}:${c.b}`)} 입니다.`,
    ],
  );
}

// ── 2-4-3 비례식 알아보기 — 심화중 ──────────────────────────────────────────
//
// 안 굳는 마디: **두 번째 비의 한 묶음**. 심화하는 「두 항의 차」를 값으로 주어 한 번에 굳는다.
// 여기서는 **합의 구간**만 주고, 「두 항의 합은 $(a+b)$ 의 배수」라는 비례식의 성질이 고른다.

const PROP_EQ_MID = lazyTable("g6.PROP_EQ_MID", () => {
  const table: {
    a: number;
    b: number;
    lo: number;
    up: number;
    k: number;
  }[] = [];
  for (let a = 2; a <= 8; a += 1)
    for (let b = a + 1; b <= 9; b += 1) {
      if (gcd(a, b) !== 1) continue;
      const s = a + b;
      for (let k = 3; k <= 12; k += 1) {
        const sum = s * k;
        if (sum > 130) continue;
        for (let pad = 1; pad < s; pad += 1) {
          const lo = sum - pad;
          const up = sum + pad;
          if (lo <= 0 || up - lo < 4) continue;
          if (multiplesBetween(lo, up, s).length !== 1) continue;
          if (!backsolveSafe([a, b, lo, up], a * k)) continue;
          if (!backsolveSafe([a, b, lo, up], b * k)) continue;
          table.push({ a, b, lo, up, k });
        }
      }
    }
  return table;
});

function propEqMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, PROP_EQ_MID());
  const s = c.a + c.b;
  return makeDeep(
    unit,
    `비례식 ${expr(`${c.a}:${c.b}=\\square:\\square`)} 에서 두 번째 비의 전항과 후항이 모두 자연수이고, ` +
      `두 항의 합이 ${num(c.lo)}보다 크고 ${num(c.up)}보다 작습니다. 이 비례식을 완성하여 쓰시오.`,
    expr(`${c.a}:${c.b}=${c.a * c.k}:${c.b * c.k}`),
    [
      `두 번째 비는 ${expr(`${c.a}:${c.b}`)} 의 두 항에 같은 수를 곱한 비이므로 ` +
        `두 항의 합은 ${expr(`${c.a}+${c.b}=${s}`)} 의 배수입니다.`,
      `${num(c.lo)}보다 크고 ${num(c.up)}보다 작은 ${num(s)}의 배수는 ` +
        `${expr(`${s}\\times${c.k}=${s * c.k}`)} 뿐입니다. 두 항에 각각 ${num(c.k)}${numJosa(c.k, "을", "를")} 곱하면 ` +
        `${expr(`${c.a}:${c.b}=${c.a * c.k}:${c.b * c.k}`)} 입니다.`,
    ],
  );
}

// ── 2-4-4 비례식의 성질 — 심화중 ────────────────────────────────────────────
//
// 안 굳는 마디: **두 내항**(곱만 안다). 굳히는 조건: 「두 내항이 같은 수」.
// 심화하는 내항 둘을 발문이 주어 한 번의 나눗셈으로 끝난다.

const PROP_RULE_MID = lazyTable("g6.PROP_RULE_MID", () => {
  const table: { a: number; b: number; x: number }[] = [];
  for (let a = 2; a <= 24; a += 1)
    for (let b = 2; b <= 48; b += 1) {
      if (a === b) continue;
      const p = a * b;
      const x = Math.round(Math.sqrt(p));
      if (x * x !== p || x < 3 || x > 20) continue;
      if (!backsolveSafe([a, b], x)) continue;
      table.push({ a, b, x });
    }
  return table;
});

function propRuleMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, PROP_RULE_MID());
  const p = c.a * c.b;
  return makeDeep(
    unit,
    `비례식 ${expr(`${c.a}:\\square=\\square:${c.b}`)} 에서 두 ${expr("\\square")} 에 똑같은 자연수가 들어갑니다. ` +
      `이 자연수는 얼마입니까?`,
    num(c.x),
    [
      `비례식에서 외항의 곱과 내항의 곱은 같습니다. 외항의 곱은 ` +
        `${expr(`${c.a}\\times${c.b}=${p}`)} 입니다.`,
      `내항의 곱도 ${num(p)}이고 두 내항이 같으므로, 같은 수를 두 번 곱해 ${num(p)}${numJosa(p, "이", "가")} ` +
        `되는 수를 찾습니다. ${expr(`${c.x}\\times${c.x}=${p}`)} 이므로 ` +
        `${expr("\\square")} 는 ${num(c.x)}입니다.`,
    ],
  );
}

// ── 2-4-5 비례배분 — 심화중 ─────────────────────────────────────────────────
//
// 안 굳는 마디: **한 묶음의 크기**. 굳히는 성질: 「한 사람의 몫은 그 사람의 묶음 수의 배수」
// + 발문의 구간. 심화하는 «차»를 값으로 주어 한 번에 굳는다.

const SHARE_RANGE_MID = lazyTable("g6.SHARE_RANGE_MID", () => {
  const table: {
    a: number;
    b: number;
    lo: number;
    up: number;
    k: number;
  }[] = [];
  for (let a = 2; a <= 6; a += 1)
    for (let b = 2; b <= 7; b += 1) {
      if (a === b || gcd(a, b) !== 1) continue;
      for (let k = 3; k <= 12; k += 1) {
        const part = b * k;
        const total = (a + b) * k;
        if (total > 140) continue;
        for (let pad = 1; pad < b; pad += 1) {
          const lo = part - pad;
          const up = part + pad;
          if (lo <= 0 || up - lo < 4) continue;
          if (multiplesBetween(lo, up, b).length !== 1) continue;
          if (!backsolveSafe([a, b, lo, up], total)) continue;
          table.push({ a, b, lo, up, k });
        }
      }
    }
  return table;
});

function shareRangeMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, SHARE_RANGE_MID());
  const kid = pick(rng, SHARE_KIDS);
  const item = pick(rng, SHARE_ITEMS);
  const s = c.a + c.b;
  const total = s * c.k;
  return makeDeep(
    unit,
    `${item.name}${josa(item.name, "을", "를")} ${kid.one}${josa(kid.one, "과", "와")} ` +
      `${kid.two}${josa(kid.two, "이", "가")} ${expr(`${c.a}:${c.b}`)}${numRo(c.b)} 나누어 가지려고 합니다. ` +
      `두 사람이 갖는 ${item.name} 수가 모두 자연수이고 ${kid.two}${josa(kid.two, "이", "가")} 갖는 ` +
      `${item.name}${josa(item.name, "이", "가")} ${num(c.lo)}${item.c}보다 많고 ${num(c.up)}${item.c}보다 적을 때, ` +
      `${item.name}${josa(item.name, "은", "는")} 모두 몇 ${item.c}입니까?`,
    num(total),
    [
      `${kid.two}${josa(kid.two, "은", "는")} ${num(c.b)}묶음이므로 ${kid.two}${josa(kid.two, "이", "가")} 갖는 ` +
        `${item.name} 수는 ${num(c.b)}의 배수입니다.`,
      `${num(c.lo)}보다 크고 ${num(c.up)}보다 작은 ${num(c.b)}의 배수는 ` +
        `${expr(`${c.b}\\times${c.k}=${c.b * c.k}`)} 뿐이므로 한 묶음은 ${num(c.k)}${item.c}입니다. ` +
        `전체는 ${expr(`${c.a}+${c.b}=${s}`)} 묶음이므로 ` +
        `${expr(`${c.k}\\times${s}=${total}`)}${item.c}입니다.`,
    ],
  );
}

// ── 2-4-5 비례배분 — 심화상 ─────────────────────────────────────────────────
//
// 🔴 성질만으로 못 굳힌다 — 구간이 한 묶음 후보를 **셋 이상** 남기고, 발문은 그 후보를
//    주지 않는다. 각 후보로 **한 사람의 몫을 실제로 만들어** 「그것을 다시 나눌 수 있는가」에
//    대 봐야 하나가 남는다(D-115 ⑾: 끝까지 계산해야 하면 «상»).

const SHARE_SPLIT_TOP = lazyTable("g6.SHARE_SPLIT_TOP", () => {
  const table: {
    a: number;
    b: number;
    c2: number;
    d2: number;
    lo: number;
    up: number;
    k: number;
  }[] = [];
  for (let a = 2; a <= 6; a += 1)
    for (let b = 2; b <= 6; b += 1) {
      if (a === b || gcd(a, b) !== 1) continue;
      const s = a + b;
      for (let c2 = 1; c2 <= 4; c2 += 1)
        for (let d2 = c2 + 1; d2 <= 6; d2 += 1) {
          if (gcd(c2, d2) !== 1) continue;
          const t = c2 + d2;
          if (t < 3 || a % t === 0) continue; // 늘 나누어떨어지면 조건이 아무 일도 안 한다
          for (let lo = 20; lo <= 160; lo += 1)
            for (const width of [3 * s + 2, 4 * s + 2]) {
              const up = lo + width;
              if (up > 200) continue;
              const cands = multiplesBetween(lo, up, s);
              // ⚠️ 창 너비가 $3s+2$·$4s+2$ 라 후보 수는 **늘 3~4** 다 — 이 줄은 그 사실을
              //    적어 둔 것이지 거르는 가드가 아니다(변이가 「산출물이 그대로」로 잡았다).
              //    이 자리에서 실제로 일하는 것은 바로 아래 「둘째 비가 하나로 남기는가」다.
              if (cands.length < 3 || cands.length > 5) continue;
              const win = cands.filter((v) => ((v / s) * a) % t === 0);
              if (win.length !== 1) continue;
              const k = win[0]! / s;
              if (!backsolveSafe([a, b, lo, up, c2, d2], win[0]!)) continue;
              table.push({ a, b, c2, d2, lo, up, k });
            }
        }
    }
  return table;
});

function shareSplitTop(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, SHARE_SPLIT_TOP());
  const kid = pick(rng, SHARE_KIDS);
  const item = pick(rng, SHARE_ITEMS);
  const s = c.a + c.b;
  const t = c.c2 + c.d2;
  const total = s * c.k;
  const cands = multiplesBetween(c.lo, c.up, s);
  const share = (v: number) => (v / s) * c.a;
  return makeDeep(
    unit,
    `${item.name}${josa(item.name, "을", "를")} ${kid.one}${josa(kid.one, "과", "와")} ` +
      `${kid.two}${josa(kid.two, "이", "가")} ${expr(`${c.a}:${c.b}`)}${numRo(c.b)} 나누어 가졌습니다. ` +
      `두 사람이 가진 ${item.name} 수는 모두 자연수이고, ${item.name}${josa(item.name, "은", "는")} 모두 ` +
      `${num(c.lo)}${item.c}보다 많고 ${num(c.up)}${item.c}보다 적습니다. ` +
      `${kid.one}${josa(kid.one, "이", "가")} 가진 ${item.name}${josa(item.name, "을", "를")} 다시 ` +
      `${expr(`${c.c2}:${c.d2}`)}${numRo(c.d2)} 나누면 두 몫이 모두 자연수가 될 때, ` +
      `${item.name}${josa(item.name, "은", "는")} 모두 몇 ${item.c}입니까?`,
    num(total),
    [
      `전체를 ${expr(`${c.a}+${c.b}=${s}`)} 묶음으로 나누므로 전체는 ${num(s)}의 배수입니다. ` +
        `${num(c.lo)}보다 크고 ${num(c.up)}보다 작은 ${num(s)}의 배수는 ` +
        `${cands.map((v) => expr(`${s}\\times${v / s}=${v}`)).join(", ")} 입니다.`,
      `${kid.one}${josa(kid.one, "은", "는")} ${num(c.a)}묶음이므로 각 경우에 ` +
        `${kid.one}${josa(kid.one, "이", "가")} 가진 ${item.name} 수는 차례로 ` +
        `${cands.map((v) => expr(`${v / s}\\times${c.a}=${share(v)}`)).join(", ")} ${item.c}입니다.`,
      `이것을 다시 ${expr(`${c.c2}:${c.d2}`)}${numRo(c.d2)} 나누려면 ` +
        `${expr(`${c.c2}+${c.d2}=${t}`)} 묶음으로 나누어떨어져야 합니다. ` +
        `${cands
          .filter((v) => v !== total)
          .map((v) => num(share(v)))
          .join(
            ", ",
          )}${numJosa(share(cands.filter((v) => v !== total).at(-1)!), "은", "는")} ` +
        `${num(t)}${numRo(t)} 나누어떨어지지 않고 ` +
        `${expr(`${share(total)}\\div${t}=${share(total) / t}`)} 만 나누어떨어지므로 ` +
        `${item.name}${josa(item.name, "은", "는")} 모두 ${num(total)}${item.c}입니다.`,
    ],
  );
}

// ══════ 확대 갈래 3차분 — `1-1` · `2-5` · `2-6` (D-113 · D-115, 2026-08-31) ══════
//
// 고른 근거와 각 대단원이 예약한 «굳힘 축» 은
// `docs/planning/tracks/reports/tier-fill-g6-w3.md` §1 에 있다. 여기 적는 것은
// **코드가 지켜야 하는 약속**과, 이 회차가 **재서** 알게 된 것이다.
//
// ## 세 대단원이 «굳히는 성질» — 서로 겹치지 않게 하나씩 예약했다
//
//   1-1  **약분** — 몫을 기약분수로 적는 순간 분모가 되돌아온다. 1-1-1 은 「몫의 기약
//        분모」가 어떤 수를 배수열로 흩뜨리고 **몫의 크기**(㉠ $1$ 보다 작다/크다)가 창의
//        위쪽을 준다(발문이 두 끝을 다 주지 않는다 — 2-2 파일럿의 뼈대를 안 물려받는다).
//        1-1-2·1-1-3 은 「분모에 나누는 수를 곱한 뒤 약분한다」가 **나누는 수**를 감춘다.
//   2-5  **부등식이 구간을 만든다** — 원주는 지름의 $3$ 배보다 길고 $4$ 배보다 짧다.
//        🔴 그런데 이 축은 **심화중에서 못 선다**(아래 비움 ㉠ — 재서 알았다).
//   2-6  **모양 성질이 두 미지수를 하나로 묶는다** — 앞에서 본 모양이 정사각형이면
//        밑면의 지름과 높이가 같고, 전개도의 옆면이 정사각형이면 밑면의 둘레와
//        높이가 같다. 둘 다 이 대단원의 **진짜 성질**이라 반증 ③ 을 안 건드린다.
//
// ## 🔴 비움 — 재서 비웠다 (읽고 적은 것이 아니다)
//
//   ㉠ **2-5 심화중 넷.** 「원주가 $c$ 이고 지름이 자연수」 꼴은 구간 $(c/4,\ c/3)$ 이
//      자연수를 **하나만** 남겨야 하는데, 그 자연수가 **진짜 그 원의 지름**이려면
//      $c \approx 3.14d$ 여야 한다. 둘을 같이 요구하면 남는 자리가 **2개**다
//      (내접 정육각형·외접 정사각형 판은 6개, 2-5-3 어림 판은 8개).
//      창의 배율이 $4/3$(또는 $2$)이라 값이 조금만 커지면 이웃 자연수가 같이 들어온다 —
//      **구조적인 한계이지 재료 부족이 아니다.** 세는 판은 보고서 §3 에 있다.
//   ㉡ **2-6-2 심화상.** 「옆면이 정사각형」이 두 미지수를 **하나**로 묶는 순간
//      옆면 둘레·넓이·높이가 전부 반지름의 **단조 함수**가 된다. 그러면 어떤 부등식을
//      더 걸어도 후보 중 «가장 작은(큰) 것»이 답이라 **끝까지 계산하지 않고 걸러진다** —
//      D-115 ⑾ 이 그것을 «중»이라 못 박았다. 마디를 여는 성질이 곧 상을 닫는다.
//   ㉢ **1-1 심화중 하나(1-1-3)·심화상 둘.** 토대(`17-…-dossier.md` §3 초6 1-1)가 든 실물
//      「$\frac49\div\square$ 의 몫의 **분모가 $27$**」 은 **후보 셋이 전부 답**이다
//      (돌려서 확인: $k=3\to\frac4{27}$ · $k=6\to\frac2{27}$ · $k=12\to\frac1{27}$).
//      「분자 후보 셋 이상 → 어떤 분수가 기약인 것 하나」 판은 전수로 세니 **0자리**다.
//      남는 길은 「$A$ 로도 $B$ 로도」(= 2-2 심화상 그대로)와 수 카드(= 심화하·1-3-5 와
//      셋째 사본)뿐이라 1-1-1·1-1-2 의 심화상을 **비운다**.
//   ㉣ **2-6-3 심화중 · 2-6-1 심화상 · 2-6-4 둘.** 앞의 둘은 «곱과 차» 또는 «인수 짝»이라
//      w2 가 1-6 에 세운 것과 같은 모양이고(토대 §1.4 가 1-6 에 예약했다), 2-6-4(구)는
//      미지수가 반지름 **하나**뿐이라 마디가 늘 굳는다.
//
// ## 🔴 반증 ⑥ 가드는 지면을 **예측하지 않고 지어서 읽는다**
//
// 첫 판은 「찍힐 수」를 손으로 나열해 넘겼다가 `\frac{p}{q}` 를 **두 값**(분자·분모)으로
// 세었다. 판정기는 그것을 **한 값** $p/q$ 로 읽는다(`pageNumbers` 주석이 그렇게 못 박았다).
// 그래서 1-1-2 심화중 8건이 생성기 가드를 통과하고 판정기에서 «순방향으로 닿는다»로
// 잡혔다 — 실제로 답 $\square = \frac{p}{q}\times m$ 이라 **곱 한 번이면 나온다.**
// 그 갈래는 통째로 다시 지었고, 가드는 이제 **발문 문자열을 만들어 `pageNumbers` 로 읽는다.**
// 지면을 만드는 함수가 한 곳이라 발문과 가드가 갈릴 자리가 없다.
//
// ## 그림을 안 붙인다
//
// 확대 갈래는 전부 역산이다. `cylinder` 는 높이를 글자로 찍고 `cone`·`netCylinder` 는
// 밑면을 그대로 보여 준다 — 되짚을 값을 그림이 알려 주면 마디가 안 열린다.
// 기존 시험이 「심화하만 그림 없음」이라 적어 두었던 자리를 «심화 계열 전부»로 넓혔다.

/**
 * 반증 ⑥ + 「답이 지면에 그대로 있다」 — **발문을 지어서 판정기와 같은 눈으로 읽는다.**
 *
 * `pageNumbers` 는 판정기가 쓰는 그 함수다. 규칙도 입력도 한 벌이 된다.
 */
/*
 * 🔴 **± 한 걸음 자는 이제 공용판을 물린다** — 이 파일에 사본을 두지 마라.
 *
 * 물결이 돌 때는 공용 `pmOneStepReachable` 이 main 에 없어 여기서 재고 있었다.
 * 그것이 착지해서 사본을 지우고 `forwardReach.ts` 의 것을 import 한다
 * (리드 실측: 두 판이 129,000 판정에서 갈림 0). 규칙을 두 벌 두면 한쪽만 고쳐도
 * 아무도 모른다 — 이 저장소가 여러 번 적은 그 자리다.
 */

function backsolveSafeStem(content: string, answer: Rat): boolean {
  const nums = pageNumbers(content);
  return (
    !forwardReachable(nums, answer) &&
    !answerPrintedOnPage(nums, answer) &&
    !pmOneStepReachable(nums, answer)
  );
}

// ── 1-1-1 (자연수)÷(자연수)의 몫을 분수로 — 심화중 ──────────────────────────
//
// 안 굳는 마디: **어떤 수.** 몫의 기약 분모가 $m$ 이라는 것만으로는 어떤 수가
// $g=b\div m$ 의 배수열로 흩어진다.
// 굳히는 성질 둘 — 둘 다 이 소단원의 것이다:
//   ㉠ **약분** — 약분한 뒤 분모가 $m$ 이 되려면 $b$ 와의 공통인 수가 **정확히** $g$ 여야 한다.
//   ㉡ **몫의 크기** — 「몫이 $1$ 보다 작다」 ⟺ 어떤 수 < $b$ (창의 위쪽을 **발문이 안 준다**).
// 발문이 주는 것은 **아래쪽 한 끝뿐**이다.
//
// ⚠️ 이 소단원은 발문에 **분수·소수를 한 개도 못 쓴다**(`kindsPresent("자연수","자연수")`).
//    그래서 몫을 값으로 주지 못하고 «분모»와 «크기»로만 말한다.

// ⚠️ **답을 열의 «마지막»에 고정하지 않는다.** 첫 판은 `a = set[len-1]` ·
//    `lo = set[len-2]` 라, 학생이 하한을 **안 읽고** 후보 중 가장 큰 것만 골라도
//    100% 맞았다(적대 검토 A·B·C 축 실측 23/23 · 1200/1200 — 정의역 23은
//    포화가 증명된 전수다). 창의 하한이 **한 비트도** 정보를 안 실었다.
//
//    이제 답을 열 **안에서** 고르고 창을 그 둘레(이웃과 이웃 사이)로 잡는다.
//    그러면 답의 자리가 흩어지고, 「가장 큰 것」·「가장 작은 것」 어느 쪽도 안 통한다.
//
// ⚠️ 그리고 **조건 하나를 지웠다.** 예전 발문은 「몫이 $1$보다 작다」와 「$lo$보다 크다」를
//    둘 다 걸었는데, 창을 양쪽으로 닫으면 앞엣것이 뒤엣것에 **완전히 먹힌다**
//    (M-6: 「어느 하나만 읽어도 나머지가 필요 없다」). 안 읽어도 되는 조건을 지면에
//    남기면 학생에게 거짓말을 하는 것이다.
// ── 2-5-4 원의 넓이 구하는 방법 — 심화중 ────────────────────────────────────
//
// 🔴 이 자리는 3차분이 **비웠다가 적대 검토가 되살린** 자리다. 비움의 근거가
//    「원의 넓이는 구간으로 못 굳힌다」였는데, **main 에 이미 같은 꼴이 서 있다** —
//    `surfRangeMid`(초6 1-6-1 심화중, 물결 2 착지분)가 「겉넓이가 $lo$ 보다 넓고
//    $up$ 보다 좁고, 높이가 자연수」다. 같은 잣대를 두 자리에 다르게 대면 안 된다.
//
// 마디: 반지름은 구간만으로 안 굳는다(실수는 얼마든지 있다).
// 굳힘: 이 소단원의 성질 — (넓이)=(반지름)×(반지름)×(원주율) 이고 **반지름이 자연수**라,
//       (반지름)×(반지름) 은 «같은 수를 두 번 곱한 수»여야 한다. 구간 안에 그런 수가 하나다.
//       후보를 **끝까지 계산하지 않고** 걸러 내므로 D-115 ⑾ 로 «중» 이다.
type AreaRangeCase = { lo: number; up: number; r: number };

const areaRangeStem = (c: AreaRangeCase): string =>
  `어떤 원의 넓이가 ${num(fromCents(c.lo * 314))} cm²보다 넓고 ` +
  `${num(fromCents(c.up * 314))} cm²보다 좁습니다. ` +
  `반지름이 자연수 cm일 때, 이 원의 반지름은 몇 cm인가? (원주율: ${num("3.14")})`;

const AREA_RANGE_MID = lazyTable("g6.AREA_RANGE_MID", () => {
  const table: AreaRangeCase[] = [];
  for (let lo = 1; lo <= 200; lo += 1)
    for (let up = lo + 4; up <= Math.min(lo + 40, 240); up += 1) {
      const sq: number[] = [];
      for (let r = 1; r * r < up; r += 1) if (r * r > lo) sq.push(r);
      if (sq.length !== 1) continue; // 구간 안의 «제곱수»가 하나여야 답이 선다
      const r = sq[0]!;
      if (r < 2 || r > 15) continue; // 지면에 얹히는 크기
      // 구간 안에 **답이 아닌 자연수**가 둘은 있어야 성질이 일을 한다.
      let others = 0;
      for (let v = lo + 1; v < up; v += 1) if (v !== r * r) others += 1;
      if (others < 3) continue;
      const c: AreaRangeCase = { lo, up, r };
      if (!backsolveSafeStem(areaRangeStem(c), rat(r))) continue;
      table.push(c);
    }
  return table;
});

/**
 * 🔴 **답을 먼저 고른다.** 그냥 균등하게 뽑으면 작은 반지름을 담는 구간이 훨씬 많아
 * 「무조건 $2$」류가 나온다(1-1-2·2-6-3 과 같은 처방).
 */
const AREA_RANGE_BY_ANS = lazyTable("g6.AREA_RANGE_BY_ANS", () => {
  const table = new Map<number, AreaRangeCase[]>();
  for (const c of AREA_RANGE_MID()) {
    const l = table.get(c.r);
    if (l) l.push(c);
    else table.set(c.r, [c]);
  }
  return table;
});
const AREA_RANGE_ANSWERS = lazyTable("g6.AREA_RANGE_ANSWERS", () =>
  [...AREA_RANGE_BY_ANS().keys()].sort((x, y) => x - y),
);

function areaRangeMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(
    rng,
    AREA_RANGE_BY_ANS().get(pick(rng, AREA_RANGE_ANSWERS()))!,
  );
  return makeDeep(unit, areaRangeStem(c), num(c.r), [
    `(원의 넓이)=(반지름)×(반지름)×(원주율)이므로, 넓이를 ${num("3.14")}${numRo(314)} 나누면 ` +
      `(반지름)×(반지름)이 됩니다.`,
    `${expr(`${fromCents(c.lo * 314)}\\div3.14=${c.lo}`)}, ` +
      `${expr(`${fromCents(c.up * 314)}\\div3.14=${c.up}`)} 이므로 ` +
      `(반지름)×(반지름)은 ${num(c.lo)}보다 크고 ${num(c.up)}보다 작습니다.`,
    `그 사이에서 같은 수를 두 번 곱해 나오는 수는 ` +
      `${expr(`${c.r}\\times${c.r}=${c.r * c.r}`)} 하나이므로 ` +
      `반지름은 ${unitNum(c.r, "cm")} 입니다.`,
  ]);
}

type NatDivReduceCase = {
  b: number;
  m: number;
  g: number;
  lo: number;
  hi: number;
  a: number;
  win: number[];
  band: 0 | 1;
};

const natDivReduceStem = (c: NatDivReduceCase): string =>
  `어떤 자연수를 ${num(c.b)}${numRo(c.b)} 나눈 몫을 기약분수로 나타냈더니 분모가 ${num(c.m)}${numJosa(c.m, "이", "가")} 되었습니다. ` +
  `어떤 수가 ${num(c.lo)}보다 크고 ${num(c.hi)}보다 작을 때, 어떤 수를 구하시오.`;

const NAT_DIV_REDUCE_MID = lazyTable("g6.NAT_DIV_REDUCE_MID", () => {
  const table: NatDivReduceCase[] = [];
  for (let b = 6; b <= 30; b += 1)
    for (let g = 2; g < b; g += 1) {
      if (b % g !== 0) continue;
      const m = b / g;
      if (m < 2) continue; // 분모가 1 이면 몫이 자연수라 이 소단원이 아니다
      const base: number[] = [];
      for (let x = 1; x < b; x += 1) if (gcd(x, b) === g) base.push(x);
      // 후보가 셋 이상이어야 «성질이 만든 배수열»이 지면에서 보인다.
      if (base.length < 3) continue;
      for (const band of [0, 1] as const) {
        const set = base.map((x) => x + band * b);
        for (let k = 0; k < set.length; k += 1) {
          // 창은 **이웃과 이웃 사이** 어디든 — 답만 담되 그 자리는 창마다 달라진다.
          //
          // ⚠️ 이웃과 이웃을 **꽉 채워** 잡으면(lo = 앞이웃 · hi = 뒷이웃) 배수열이
          //    고르게 놓인 자리에서 답이 **늘 창의 한가운데**가 된다 — 실측 76.6%.
          //    「가장 큰 것」을 깨고 「가운데」를 새로 만든 셈이라, 양쪽을 **따로**
          //    좁혀 답의 자리를 흩뜨린다.
          const prev = k > 0 ? set[k - 1]! : band * b;
          const next = k + 1 < set.length ? set[k + 1]! : (band + 1) * b;
          const a = set[k]!;
          for (let lo = Math.max(1, prev); lo < a; lo += 1)
            for (let hi = a + 1; hi <= next; hi += 1) {
              const win: number[] = [];
              for (let v = lo + 1; v < hi; v += 1) win.push(v);
              // 창 안에 «답이 아닌 수»가 둘은 있어야 성질이 일을 한다.
              // 여덟을 넘으면 해설이 늘어놓기에 길다.
              if (win.length < 3 || win.length > 8) continue;
              const c: NatDivReduceCase = { b, m, g, lo, hi, a, win, band };
              if (!backsolveSafeStem(natDivReduceStem(c), rat(a))) continue;
              table.push(c);
            }
        }
      }
    }
  return table;
});

function natDivReduceMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, NAT_DIV_REDUCE_MID());
  return makeDeep(unit, natDivReduceStem(c), num(c.a), [
    `몫은 어떤 수를 분자로, ${num(c.b)}${numJosa(c.b, "을", "를")} 분모로 하는 분수입니다. ` +
      `기약분수의 분모가 ${num(c.m)}${numJosa(c.m, "이", "가")} 되었으므로 분자와 분모를 ` +
      `${expr(`${c.b}\\div${c.m}=${c.g}`)}${numRo(c.g)} 약분한 것입니다. ` +
      `곧 어떤 수는 ${num(c.b)}${numJosa(c.b, "과", "와")}의 최대공약수가 ${num(c.g)}인 수입니다.`,
    `${num(c.lo)}보다 크고 ${num(c.hi)}보다 작은 수는 ` +
      `${c.win.map((v) => num(v)).join(", ")} 입니다. ` +
      `이 중 ${num(c.b)}${numJosa(c.b, "과", "와")}의 최대공약수가 ${num(c.g)}인 것은 ${num(c.a)} 뿐입니다.`,
    `${expr(`${c.a}\\div${c.b}=\\frac{${c.a}}{${c.b}}=${fmtFrac(c.a, c.b)}`)}` +
      `${numRo(lastSpokenNumber(fmtFrac(c.a, c.b)))} 분모가 ${num(c.m)}입니다.`,
  ]);
}

// ── 1-1-2 (분수)÷(자연수) — 심화중 ──────────────────────────────────────────
//
// 안 굳는 마디: **나누는 수.** (분수)÷(자연수)는 분모에 나누는 수를 곱하므로 몫의 분모는
// $q\times\square$ 인데, 분자와 약분이 되면 그보다 작아진다.
// 굳히는 성질: 「**몫의 분모가 처음과 같아졌다**」 — 이 대단원이 되짚기 재료로 삼는 바로
// 그 현상이다($\frac67\div6=\frac17$ — 분모가 $7$ 로 되돌아왔다). 그러려면 곱한 만큼을
// 도로 약분해야 하므로 **분자가 나누는 수로 나누어떨어져야** 한다.
//
// 🔴 **앞판을 버리고 다시 지었다.** 처음엔 「몫의 기약 분모가 $m$」 을 주었는데,
//    그러면 답이 $\square = \frac pq \times m$ 이라 **곱 한 번이면 나온다**(반증 ⑥).
//    판정기가 8건을 잡아 줬다 — 생성기 가드가 지면을 **예측**하다 분수를 두 값으로 센 탓이다.

type FracReturnCase = {
  p: number;
  q: number;
  k: number;
  lo: number;
  up: number;
};

const fracReturnStem = (c: FracReturnCase): string =>
  `${expr(`\\frac{${c.p}}{${c.q}}`)}${numJosa(c.p, "을", "를")} 어떤 자연수로 나누었더니 ` +
  `몫의 분모가 처음과 같은 ${num(c.q)}${numJosa(c.q, "이", "가")} 되었습니다. ` +
  `어떤 자연수가 ${num(c.lo)}보다 크고 ${num(c.up)}보다 작을 때, 어떤 자연수를 구하시오.`;

/**
 * ⚠️ **두 단계로 뽑는다.** 창 조합을 한 줄로 펴서 균등하게 뽑으면, 조합이 많은
 * 유형(예 $p=14$)이 그만큼 무겁게 나와 「무조건 $7$」이 26.9% 가 된다.
 * 유형을 먼저 고르고 그 안에서 창을 고르면 답이 고르게 흩어진다.
 */
type FracReturnGroup = {
  p: number;
  q: number;
  k: number;
  wins: [number, number][];
};

const FRAC_RETURN_MID = lazyTable("g6.FRAC_RETURN_MID", () => {
  const table: FracReturnGroup[] = [];
  for (let q = 4; q <= 25; q += 1)
    for (let p = 2; p < q; p += 1) {
      if (gcd(p, q) !== 1) continue;
      const divs: number[] = [];
      for (let k = 2; k <= p; k += 1) if (p % k === 0) divs.push(k);
      if (divs.length < 2) continue; // 후보가 하나면 마디가 안 열린다
      // ⚠️ **`i = 0` 을 뺀다.** 가장 작은 약수는 거의 늘 $2$ 이고, 그 자리는 `lo = 1` 이라
      //    창이 $2$ 부터 시작한다 — 그래서 「무조건 $2$」가 44.8% 였다(적대 검토 C 축,
      //    대조군의 10배). 답이 «가장 작은 약수»가 아니게 만들면 그 전략이 죽는다.
      for (let i = 1; i < divs.length; i += 1) {
        const k = divs[i]!;
        const prev = divs[i - 1]!;
        const next = i + 1 < divs.length ? divs[i + 1]! : k + 3;
        const wins: [number, number][] = [];
        // 창을 **양쪽으로 따로** 좁혀 답의 자리를 흩뜨린다(1-1-1 과 같은 처방).
        for (let lo = prev; lo < k; lo += 1)
          for (let up = k + 1; up <= next; up += 1) {
            const win: number[] = [];
            for (let v = lo + 1; v < up; v += 1) win.push(v);
            if (win.length < 3 || win.length > 8) continue;
            // 창 안에 **답보다 작은 수**가 하나는 있어야 「가장 작은 것」이 안 통한다.
            if (win[0]! >= k) continue;
            // 🔴 창의 **두 끝이 나뉘어 답이 되는** 자리는 안 낸다 — 실측으로 이 갈래에서만
            //    7.0% 가 그랬고(전부 「$2$ 보다 크고 $8$ 보다 작다」→ $8\div2=4$),
            //    같은 자의 **답+1 음성 대조는 0.0%** 였다(잡음이 아니다).
            //    ⚠️ 공용 `forwardReach` 에 ÷ 축을 넣는 길은 **리드가 취소**했다 —
            //    갈래를 안 가르고 심화상의 28% 를 거짓으로 문다. 그래서 **여기서만** 막는다.
            if (up % lo === 0 && up / lo === k) continue;
            if (!backsolveSafeStem(fracReturnStem({ p, q, k, lo, up }), rat(k)))
              continue;
            wins.push([lo, up]);
          }
        if (wins.length > 0) table.push({ p, q, k, wins });
      }
    }
  return table;
});

/**
 * 🔴 **답을 먼저 고른다.** 유형만 고르게 뽑아도 「무조건 $4$」가 26.9% 였다 —
 * $4$ 를 답으로 갖는 유형($p = 4, 8, 12, 16, 20, 24$)이 그만큼 많기 때문이다.
 * 답 값으로 한 겹 묶으면 그 쏠림이 사라진다.
 *
 * ⚠️ 대신 «$q$ 를 키워 큰 약수를 만드는» 길은 안 갔다 — D-115 ⑽③ 이
 * 「규모는 축이 아니다」로 못 박은 자리이고, 분모만 커진 문항은 더 어렵지 않다.
 */
const FRAC_RETURN_BY_ANS = lazyTable("g6.FRAC_RETURN_BY_ANS", () => {
  const table = new Map<number, FracReturnGroup[]>();
  for (const g of FRAC_RETURN_MID()) {
    const list = table.get(g.k);
    if (list) list.push(g);
    else table.set(g.k, [g]);
  }
  return table;
});
const FRAC_RETURN_ANSWERS = lazyTable("g6.FRAC_RETURN_ANSWERS", () =>
  [...FRAC_RETURN_BY_ANS().keys()].sort((x, y) => x - y),
);

function fracReturnMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const ansPick = pick(rng, FRAC_RETURN_ANSWERS());
  const grp = pick(rng, FRAC_RETURN_BY_ANS().get(ansPick)!);
  const [lo, up] = pick(rng, grp.wins);
  const c: FracReturnCase = { p: grp.p, q: grp.q, k: grp.k, lo, up };
  const inWindow: number[] = [];
  for (let v = c.lo + 1; v < c.up; v += 1) inWindow.push(v);
  return makeDeep(unit, fracReturnStem(c), num(c.k), [
    `(분수)÷(자연수)는 분자는 그대로 두고 분모에 나누는 수를 곱하므로 몫은 ` +
      `${expr(`\\frac{${c.p}}{${c.q}\\times\\square}`)} 입니다.`,
    `몫의 분모가 다시 ${num(c.q)}${numJosa(c.q, "이", "가")} 되려면 곱한 만큼을 도로 약분해야 하고, ` +
      `그러려면 분자 ${num(c.p)}${numJosa(c.p, "이", "가")} ${expr("\\square")} 로 나누어떨어져야 합니다. ` +
      `${num(c.lo)}보다 크고 ${num(c.up)}보다 작은 수 ${inWindow.map((v) => num(v)).join(", ")} 중에서 ` +
      `${num(c.p)}${numJosa(c.p, "을", "를")} 나누어떨어지게 하는 것은 ${num(c.k)} 뿐입니다.`,
    `${expr(`${c.q}\\times${c.k}=${c.q * c.k}`)} 이므로 ` +
      `${expr(`\\frac{${c.p}}{${c.q}}\\div${c.k}=\\frac{${c.p}}{${c.q * c.k}}=${fmtFrac(c.p / c.k, c.q)}`)}` +
      `${numRo(lastSpokenNumber(fmtFrac(c.p / c.k, c.q)))} 분모가 ${num(c.q)}입니다.`,
  ]);
}

// ── 1-1-3 (대분수)÷(자연수) — 심화상 ────────────────────────────────────────
//
// 🔴 **처음엔 여기에 심화중을 세웠다가 «상»으로 옮겼다 — 해설이 그렇게 시켰다.**
//    가분수의 분자 $imp$ 는 분모 $d$ 와 서로소이므로 약분되는 것은 **나누는 수 쪽**이고,
//    그래서 $m=d\times\square\div\gcd(imp,\square)$ 다. 학생이 $\gcd$ 를 미리 알 길이 없으니
//    해설이 「나누는 수를 하나씩 넣어 본다」로 갈 수밖에 없다 — D-115 ⑾ 은 그것을
//    **«상»** 이라 못 박았다(끝까지 계산해 견주어야 한다). 1-1-2 는 굳히는 성질이
//    「나누어떨어지는가」 하나라 **계산하지 않고** 걸러지므로 «중»이다.
//
// 🔴 후보를 **되짚기가 만든다** — 몫의 분모가 $m$ 이려면 $d\times\square$ 가 $m$ 의 배수여야
//    하므로 $\square$ 는 $m\div d$ 의 **배수**다. 발문은 창의 한쪽 끝만 말할 뿐 후보를 안 준다.
//
// ⚠️ 이 자리는 토대(§3 초6 1-1)가 든 실물 「$\frac49\div\square$ 의 몫의 분모가 $27$」 이
//    **답이 셋**이던 바로 그 부류다($k=3,6,12$ 가 전부 분모 $27$). 그래서 창 안의 배수열
//    후보 가운데 **정확히 하나**만 분모 $m$ 을 내는 것을 구성이 세어서 보장한다.

type MixedDivisorCase = {
  w: number;
  t: number;
  d: number;
  k: number;
  m: number;
  cap: number;
  cands: number[];
};

const mixedDivisorStem = (c: MixedDivisorCase): string =>
  `${expr(`${c.w}\\frac{${c.t}}{${c.d}}`)}${numJosa(c.t, "을", "를")} ${num(c.cap)}보다 작은 어떤 자연수로 ` +
  `나누었더니 몫을 기약분수로 나타낸 분모가 ${num(c.m)}${numJosa(c.m, "이", "가")} 되었습니다. ` +
  `어떤 자연수를 구하시오.`;

const MIXED_NAT_DIVISOR_TOP = lazyTable("g6.MIXED_NAT_DIVISOR_TOP", () => {
  const table: MixedDivisorCase[] = [];
  for (let d = 2; d <= 9; d += 1)
    for (let t = 1; t < d; t += 1) {
      if (gcd(t, d) !== 1) continue;
      for (let w = 1; w <= 5; w += 1) {
        const imp = w * d + t;
        for (let k = 2; k <= 30; k += 1) {
          const g = gcd(imp, k);
          if (g < 2) continue; // 약분이 일어나야 배수열이 «답이 아닌 후보»를 만든다
          const m = (d * k) / g;
          if (m % d !== 0) continue; // 배수열의 걸음이 자연수여야 한다
          if (m > 72) continue; // 규모는 축이 아니다 (D-115 ⑽③ · 원장님)
          const step = m / d;
          if (step < 2) continue; // 걸음이 1 이면 후보가 «모든 자연수»라 창이 뜻을 잃는다
          for (let cap = k + 1; cap <= Math.min(k + 3 * step, 40); cap += 1) {
            const cands: number[] = [];
            for (let v = step; v < cap; v += step) if (v >= 2) cands.push(v);
            if (cands.length < 3 || cands.length > 5) continue;
            const hit = cands.filter((v) => (d * v) / gcd(imp, v) === m);
            if (hit.length !== 1 || hit[0] !== k) continue;
            const c: MixedDivisorCase = { w, t, d, k, m, cap, cands };
            if (!backsolveSafeStem(mixedDivisorStem(c), rat(k))) continue;
            table.push(c);
          }
        }
      }
    }
  return table;
});

function mixedNatDivisorTop(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, MIXED_NAT_DIVISOR_TOP());
  const imp = c.w * c.d + c.t;
  const step = c.m / c.d;
  const shown = (v: number) => {
    const den = c.d * v;
    const g = gcd(imp, den);
    return expr(`\\frac{${imp}}{${den}}=${fmtFrac(imp / g, den / g)}`);
  };
  return makeDeep(unit, mixedDivisorStem(c), num(c.k), [
    `대분수를 가분수로 고치면 ${expr(`${c.w}\\frac{${c.t}}{${c.d}}=\\frac{${imp}}{${c.d}}`)} 이고, ` +
      `분모에 나누는 수를 곱하므로 몫은 ${expr(`\\frac{${imp}}{${c.d}\\times\\square}`)} 입니다.`,
    `약분한 뒤 분모가 ${num(c.m)}${numJosa(c.m, "이", "가")} 되려면 ${expr(`${c.d}\\times\\square`)} ` +
      `${numJosa(c.d, "이", "가")} ${num(c.m)}의 배수여야 하므로 ${expr("\\square")} 는 ` +
      `${expr(`${c.m}\\div${c.d}=${step}`)} 의 배수입니다. ` +
      `${num(c.cap)}보다 작은 것은 ${c.cands.map((v) => num(v)).join(", ")} 입니다.`,
    `각각 나누어 몫을 기약분수로 나타내면 ${c.cands.map((v) => shown(v)).join(", ")} 이므로, ` +
      `분모가 ${num(c.m)}${numJosa(c.m, "이", "가")} 되는 것은 ${num(c.k)}${numRo(c.k)} 나눌 때뿐입니다.`,
  ]);
}

// ── 2-5-2 원주와 지름 구하기 — 심화상 ───────────────────────────────────────
//
// 🔴 후보를 되짚기가 만든다 — 「굴러간 거리 = (원주)×(바퀴 수)」를 되짚으면
//    **(지름)×(바퀴 수)** 라는 곱 하나만 남고, 지름과 바퀴 수 어느 쪽도 안 굳는다.
//    발문은 지름이 놓일 **창**만 말할 뿐 후보를 주지 않으므로, 창 안의 자연수를
//    **하나씩 실제로 나누어** 딱 떨어지는 것을 찾아야 한다.
//
// 이 대단원에서 후보가 생기는 자리는 여기 하나뿐이다(사슬이 한 방향이라 성질을
// 두 번 걸어도 같은 구간이 다시 나온다) — 그래서 2-5 의 나머지 일곱 자리는 비웠다.

type RollCase = {
  d: number;
  turns: number;
  prod: number;
  lo: number;
  up: number;
};

const rollTurnsStem = (c: RollCase, roller: string): string =>
  `${roller}${josa(roller, "을", "를")} 몇 바퀴 굴렸더니 ${unitNum(fromCents(c.prod * 314), "cm")} 를 갔습니다. ` +
  `이 ${roller}의 지름이 ${num(c.lo)} cm보다 길고 ${num(c.up)} cm보다 짧은 자연수 cm이고, ` +
  `굴린 바퀴 수도 자연수일 때, 몇 바퀴 굴렸습니까? (원주율: ${num("3.14")})`;

const ROLL_TOP = lazyTable("g6.ROLL_TOP", () => {
  const table: RollCase[] = [];
  for (let d = 6; d <= 24; d += 1)
    for (let turns = 3; turns <= 15; turns += 1) {
      const prod = d * turns;
      if (prod > 260) continue;
      for (let lo = 3; lo < d; lo += 1) {
        const up = lo + 6;
        if (up <= d) continue;
        // 🔴 **발문이 말하는 조건만으로** 센다 — 예전엔 «바퀴 수 2~30» 까지
        // 걸었는데, 그 상한은 지면에 없다. 지면이 안 말하는 조건으로 걸러내면
        // «답이 하나»가 **우리만 아는 사실**이 된다(학생은 둘로 본다).
        const hit: number[] = [];
        for (let dd = lo + 1; dd < up; dd += 1)
          if (prod % dd === 0) hit.push(dd);
        if (hit.length !== 1 || hit[0] !== d) continue;
        const c: RollCase = { d, turns, prod, lo, up };
        if (!backsolveSafeStem(rollTurnsStem(c, ROLLERS[0]), rat(turns)))
          continue;
        table.push(c);
      }
    }
  return table;
});

function rollTurnsTop(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, ROLL_TOP());
  const roller = pick(rng, ROLLERS);
  const cands: number[] = [];
  for (let dd = c.lo + 1; dd < c.up; dd += 1) cands.push(dd);
  const miss = cands.filter((v) => v !== c.d);
  return makeDeep(unit, rollTurnsStem(c, roller), num(c.turns), [
    `굴러간 거리는 (원주)×(바퀴 수)이고 원주는 (지름)×(원주율)입니다. ` +
      `그러므로 (지름)×(바퀴 수)는 ${expr(`${fromCents(c.prod * 314)}\\div3.14=${c.prod}`)} 입니다.`,
    `지름이 될 수 있는 수는 ${cands.map((v) => num(v)).join(", ")} 입니다. ` +
      `${num(c.prod)}${numJosa(c.prod, "을", "를")} 각각 나누어 보면 ` +
      `${miss.map((v) => expr(`${c.prod}\\div${v}`)).join(", ")}` +
      `${numJosa(miss.at(-1)!, "은", "는")} 나누어떨어지지 않아 바퀴 수가 자연수가 아니고 ` +
      `${expr(`${c.prod}\\div${c.d}=${c.turns}`)} 만 나누어떨어집니다.`,
    `지름은 ${unitNum(c.d, "cm")} 이고 ${num(c.turns)}바퀴 굴렸습니다.`,
  ]);
}

// ── 2-6-1 원기둥 알아보기 — 심화중 ──────────────────────────────────────────
//
// 안 굳는 마디: **밑면의 지름과 높이가 동시에 미지**다(앞에서 본 직사각형의 넓이만 안다).
// 굳히는 성질: 「앞에서 본 모양이 **정사각형**」 — 이 소단원이 가르치는 «앞에서 본 모양»
// 그 자체다(원기둥은 직사각형). 정사각형이면 밑면의 지름과 높이가 같다.
// 심화하는 **둘레와 높이를 둘 다** 주어 마디가 하나도 안 남는다.

type CylSquareCase = { r: number; area: number };

const cylSquareStem = (c: CylSquareCase, thing: string): string =>
  `원기둥 모양 ${thing}${josa(thing, "을", "를")} 앞에서 본 모양이 정사각형이고 ` +
  `그 넓이가 ${num(c.area)} cm²입니다. 이 ${thing}의 밑면의 반지름은 몇 cm인가?`;

const CYL_SQUARE_MID = lazyTable("g6.CYL_SQUARE_MID", () => {
  const table: CylSquareCase[] = [];
  for (let r = 2; r <= 13; r += 1) {
    // 규모는 축이 아니다 — 반지름 13 이면 앞에서 본 정사각형이 이미 $26$ cm다.
    const c: CylSquareCase = { r, area: 4 * r * r };
    if (!backsolveSafeStem(cylSquareStem(c, CYL_THINGS[0]), rat(r))) continue;
    table.push(c);
  }
  return table;
});

function cylSquareMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, CYL_SQUARE_MID());
  const thing = pick(rng, CYL_THINGS);
  const d = 2 * c.r;
  return makeDeep(unit, cylSquareStem(c, thing), num(c.r), [
    `원기둥을 앞에서 보면 가로가 밑면의 지름이고 세로가 높이인 직사각형입니다. ` +
      `그것이 정사각형이므로 밑면의 지름과 높이가 같습니다.`,
    `같은 수를 두 번 곱해 ${num(c.area)}${numJosa(c.area, "이", "가")} 되는 수를 찾으면 ` +
      `${expr(`${d}\\times${d}=${c.area}`)} 이므로 한 변은 ${unitNum(d, "cm")} 이고, 이것이 밑면의 지름입니다.`,
    `반지름은 ${expr(`${d}\\div2=${c.r}`)} 입니다.`,
  ]);
}

// ── 2-6-2 원기둥의 전개도 — 심화중 ──────────────────────────────────────────
//
// 안 굳는 마디: **밑면의 둘레와 높이가 동시에 미지**다(옆면의 둘레만 안다).
// 굳히는 성질: 「전개도의 옆면이 **정사각형**」 — 옆면의 가로는 밑면의 둘레이고 세로는
// 높이이므로, 정사각형이면 **밑면의 둘레와 높이가 같다.** 2-6-1 과 묶는 값이 다르다
// (거기는 «지름과 높이», 여기는 «둘레와 높이»)이고 원주율을 쓰는 것도 여기뿐이다.
//
// ⚠️ `probe-elem-tier-enumeration` 이 이 갈래를 「심화중인데 늘어놓는다」로 세운다.
//    **거짓이다** — 늘어놓은 것이 아니라 한 사슬의 걸음이 셋(÷4 · ÷3.14 · ÷2)이라
//    같은 연산이 셋 찍힌 것뿐이다. 그 자의 머리말이 「못 보는 것」 둘째로 적어 둔 자리다.

type NetSquareCase = { r: number; side: number; perim: number };

const netSquareStem = (c: NetSquareCase): string =>
  `어떤 원기둥의 전개도에서 옆면이 정사각형이고 그 둘레가 ${unitNum(fromCents(c.perim), "cm")} 입니다. ` +
  `이 원기둥의 밑면의 반지름은 몇 cm인가? (원주율: ${num("3.14")})`;

const NET_SQUARE_MID = lazyTable("g6.NET_SQUARE_MID", () => {
  const table: NetSquareCase[] = [];
  for (let r = 2; r <= 13; r += 1) {
    // 규모는 축이 아니다 — 반지름 13 이면 옆면 둘레가 이미 $326.56$ cm다.
    const side = 2 * r * 314; // 밑면의 둘레(백분의 일)
    const c: NetSquareCase = { r, side, perim: 4 * side };
    if (!backsolveSafeStem(netSquareStem(c), rat(r))) continue;
    table.push(c);
  }
  return table;
});

function netSquareMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, NET_SQUARE_MID());
  return makeDeep(unit, netSquareStem(c), num(c.r), [
    `옆면은 가로가 밑면의 둘레이고 세로가 높이인 직사각형입니다. ` +
      `그것이 정사각형이므로 밑면의 둘레와 높이가 같습니다.`,
    `정사각형의 한 변은 ${expr(`${fromCents(c.perim)}\\div4=${fromCents(c.side)}`)} 이고, ` +
      `이것이 밑면의 둘레입니다.`,
    `밑면의 지름은 ${expr(`${fromCents(c.side)}\\div3.14=${2 * c.r}`)} 이므로 ` +
      `반지름은 그 반인 ${unitNum(c.r, "cm")} 입니다.`,
  ]);
}

// ── 2-6-3 원뿔 알아보기 — 심화상 ────────────────────────────────────────────
//
// 🔴 후보를 되짚기가 만든다 — 앞에서 본 이등변삼각형의 넓이는
//    (밑변)×(높이)÷2 = (지름)×(높이)÷2 = **(반지름)×(높이)** 다. 넓이 하나로는
//    두 값이 안 굳고, 그 곱을 두 자연수로 가르는 방법이 **셋 이상** 나온다.
//    발문은 그 짝을 하나도 주지 않으므로 짝을 **만들어** 조건에 대 봐야 한다.
//
// 토대 §3-② 가 「2-6-3 심화상은 뒤집을 수 있다」고 적은 자리다. 같은 모양이 되는
// 2-6-1 심화상은 그래서 **비웠다** — 둘 중 하나만 세운다.

/**
 * 2-6-3 심화상 — 앞모양 넓이에서 (반지름, 높이) 짝을 **만들어 견준다**.
 *
 * 🔴 첫 판은 굳힘이 「높이가 $cap$ cm보다 짧을 때」였는데, `cap` 의 범위가
 * 「가장 작은 높이 초과 ~ 둘째로 작은 높이 이하」라 **살아남는 짝이 정의상 하나**였다.
 * 그러면 그 조건은 지면에서 아무 일도 안 하고(적대 검토 실측 **0/1200**), 답은 늘
 * 「$\sqrt{넓이}$ 아래 가장 큰 약수」다(**672/672 · 1200/1200 — 전수**).
 * D-115 ⑾ 로 재면 그것은 «상»이 아니라 **«중»** 이다 — 만들고 **마지막을 집는** 것이라
 * 「끝까지 계산해 견주는」 일이 없다.
 *
 * ⚠️ §9.9 가 이 함수에서 죽은 검사(`kept.length !== 1`)를 지웠지만, **그 검사를 죽게
 * 만든 구조는 그대로 남아 있었다.** 코드를 지우는 것과 구조를 고치는 것은 다른 일이다.
 *
 * 이제 굳힘을 **비단조**로 바꾼다 — 「높이와 반지름의 **차**가 $d$ cm」.
 * 짝마다 차를 **실제로 계산해** 견주어야 하나가 남으므로 ⑾ 의 «상» 이고,
 * $d$ 를 짝마다 다르게 고르므로 답의 자리가 극단에 고정되지 않는다.
 */
type ConePairCase = {
  area: number;
  diff: number;
  r: number;
  h: number;
  pairs: [number, number][];
};

const conePairStem = (c: ConePairCase): string =>
  `어떤 원뿔을 앞에서 본 모양은 넓이가 ${num(c.area)} cm²인 삼각형입니다. ` +
  `이 원뿔의 밑면의 반지름과 높이가 모두 자연수 cm이고 높이가 밑면의 반지름보다 길며, ` +
  `높이와 반지름의 차가 ${num(c.diff)} cm일 때, 밑면의 반지름은 몇 cm인가?`;

const CONE_PAIR_TOP = lazyTable("g6.CONE_PAIR_TOP", () => {
  const table: ConePairCase[] = [];
  for (let area = 12; area <= 160; area += 1) {
    const pairs: [number, number][] = [];
    for (let r = 1; r * r < area; r += 1)
      if (area % r === 0) pairs.push([r, area / r]);
    // 짝이 셋은 있어야 «만들어 견주기»가 한눈에 안 끝난다.
    if (pairs.length < 3 || pairs.length > 6) continue;
    for (const [r, h] of pairs) {
      const diff = h - r;
      // 차는 짝마다 다르다(`r` 이 커지면 `h` 는 작아지므로 `h - r` 은 **엄격히 줄어든다**).
      // 그래도 그 사실에 기대지 않고 **세어서** 확인한다 — 하나가 아니면 안 쓴다.
      //
      // 🔴 **이 줄은 변이로 잴 수 없다 — 격자 전체에서 한 번도 안 물기 때문이다.**
      //    2026-08-31 실측: `area` 12~160 · 짝 3~6개인 넓이의 **짝 252개 전부**에서
      //    「차가 같은 짝이 둘 이상」인 자리가 **0** 이다. 그래서 이 줄을 지워도
      //    산출물이 한 글자도 안 바뀌고, 하네스는 `??`(판정 안 함)를 낸다.
      //    변이를 걷어 냈다 — **늘 `??` 인 항목은 종료 코드를 영영 1로 만들고,
      //    그러면 다음 사람이 하네스를 안 본다**(2026-08-20 「거짓 경보는 가드를 끈다」).
      //    ⚠️ 그렇다고 **지우지는 마라.** 위 단조성은 「`area` 의 약수 짝」이라는
      //    지금 구성에서만 참이다 — 구성이 바뀌면 이 줄이 유일한 방어가 된다.
      if (pairs.filter(([x, y]) => y - x === diff).length !== 1) continue;
      if (h > 40 || r > 20) continue; // 지면에 얹히는 크기
      const c: ConePairCase = { area, diff, r, h, pairs };
      if (!backsolveSafeStem(conePairStem(c), rat(r))) continue;
      table.push(c);
    }
  }
  return table;
});

/**
 * 🔴 **답의 «자리»를 먼저 고른다.** 차 조건만 넣어도 「가장 큰 반지름」이 38.5% 였다 —
 * 짝이 셋인 넓이가 많고 그 안에서 마지막 자리가 흔하기 때문이다. 지름길이 **자리**에
 * 붙어 있으므로 자리로 묶어 고르게 뽑는다(1-1-2 는 같은 이유로 **답 값**으로 묶었다).
 */
const CONE_BY_POS = lazyTable("g6.CONE_BY_POS", () => {
  const table = new Map<string, ConePairCase[]>();
  for (const c of CONE_PAIR_TOP()) {
    // ⚠️ **절대 자리로 묶으면 안 된다.** 「다섯째」는 짝이 여섯인 넓이에서만 나오므로
    //    그 묶음을 고르면 그대로 «마지막에서 둘째»가 된다 — 실제로 그렇게 했다가
    //    「가장 큰 반지름」이 38.5% → **42.8%** 로 **올랐다.** 묶음은 «몇 개 중 몇째»다.
    const at = c.pairs.findIndex(([r]) => r === c.r);
    const key = `${at}/${c.pairs.length}`;
    const list = table.get(key);
    if (list) list.push(c);
    else table.set(key, [c]);
  }
  return table;
});
const CONE_POSITIONS = lazyTable("g6.CONE_POSITIONS", () =>
  [...CONE_BY_POS().keys()].sort(),
);

function conePairTop(unit: UnitSeed, rng: Rng): ElemProblem {
  // 자리를 고르게 뽑고, **그 안에서 답 값도** 고르게 뽑는다 — 둘이 상충해서
  // (자리만 고르면 「무조건 $2$」가 26.0%, 답 값을 키에 넣으면 「가장 큰 것」이
  //  46.8% 로 되레 오른다) 두 겹으로 나눈다.
  const bucket = CONE_BY_POS().get(pick(rng, CONE_POSITIONS()))!;
  const byAns = new Map<number, ConePairCase[]>();
  for (const x of bucket) {
    const l = byAns.get(x.r);
    if (l) l.push(x);
    else byAns.set(x.r, [x]);
  }
  const c = pick(
    rng,
    byAns.get(
      pick(
        rng,
        [...byAns.keys()].sort((x, y) => x - y),
      ),
    )!,
  );
  return makeDeep(unit, conePairStem(c), num(c.r), [
    // ⚠️ 「(지름)×(높이)÷2」 처럼 **KaTeX 밖에 맨 숫자**를 쓰면 D-66 표기 검사가 문다.
    //    말로 적는다 — 지면에서도 그 편이 읽힌다.
    `원뿔을 앞에서 보면 밑변이 밑면의 지름이고 높이가 원뿔의 높이인 이등변삼각형입니다. ` +
      `삼각형의 넓이는 (밑변)×(높이)를 반으로 나눈 것이고 밑변은 반지름의 두 배이므로, ` +
      `넓이는 (반지름)×(높이)와 같습니다.`,
    `곱이 ${num(c.area)}이고 높이가 반지름보다 긴 두 자연수 짝을 모두 찾으면 ` +
      `${c.pairs.map((p) => expr(`${p[0]}\\times${p[1]}=${c.area}`)).join(", ")} 입니다.`,
    `짝마다 높이와 반지름의 차를 구하면 ` +
      `${c.pairs.map((p) => expr(`${p[1]}-${p[0]}=${p[1] - p[0]}`)).join(", ")} 이므로, ` +
      `차가 ${num(c.diff)}인 것은 ${expr(`${c.r}\\times${c.h}=${c.area}`)} 뿐입니다. ` +
      `밑면의 반지름은 ${unitNum(c.r, "cm")} 입니다.`,
  ]);
}

// ══════════ 4차분(물결 4) — 초6 `1-3 소수의 나눗셈` ══════════
//
// ## 예약한 굳힘 축 — **「나누는 수를 감춘다 + 몫의 «자리»」**
//
// 토대 §1.4 는 1-3 에 「몫의 **자리**」($1$보다 작다 · $0$을 내린다 · 첫째 자리 $0$)를
// 예약하고 「몫이 소수 한 자리」(= 2-2-2 심화중의 열쇠)를 **금지**했다. 그런데 «자리»
// 성질만 지켜도 **문장 뼈대가 2-2 와 같아진다** — 2-2 의 확대 갈래 다섯이 전부
// 「어떤 수를 $d$ 로 나누었더니 <성질>. 어떤 수가 $lo$ 보다 크고 $hi$ 보다 작을 때…」이고,
// 그 뼈대의 알맹이는 **나누어지는 수를 감추는 것**이다. 그래서 감추는 자리를 옮겼다:
//
//     2-2 (이미 착지)   **나누어지는 수**를 감춘다 → 배수열 + 수치 범위
//     1-3 (여기)        **나누는 수**를 감춘다   → 자리 성질이 후보를 가른다
//
// 겹침을 막는 것은 이 한 줄이다. 그래서 시험(`elemTiersG6DeepW4.test.ts`)이 그것을
// **잠근다** — 이 갈래의 발문에 「어떤 수가 … 보다 크고 … 보다 작을 때」가 나오면 빨개진다.
//
// ## 왜 1-3-1·1-3-5 는 비웠나 (보고서 §2.1 에 수와 함께)
//
// 예약된 «자리» 성질 셋은 **1-3-2·1-3-3·1-3-4 의 이름 그 자체**다. 1-3-1 에 남는 자리
// 성질은 「몫이 소수 한 자리」 하나뿐이고 그것은 토대가 2-2 에 예약했다(반증 ③).
// 1-3-5 는 `kindsPresent("자연수","자연수")` 가 **발문에 소수를 한 개도 못 쓰게** 해서
// «자리» 조건을 지면에 적을 방법이 없고, 「어림셈」은 값을 굳히는 성질이 아니라
// **확인 절차**라 마디를 열지 못한다.
//
// ## 1-3-2 는 «상»을 비웠다 — 부등식은 후보를 «만들어 견주게» 못 한다
//
// 「몫이 $1$보다 작다」는 부등식 하나이고, 부등식 둘로 창을 닫아 자연수를 하나만 남기면
// **두 끝 중 하나가 반드시 잉여**가 된다(창 안 자연수가 하나면 위 끝은 아래 끝이 정한
// 값을 못 바꾼다 — 실측 100%). 안 읽어도 되는 조건을 지면에 남기는 것은 학생에게 하는
// 거짓말이라(M-6) 그 판을 버리고, 대신 **가장 작은 수**로 마디를 굳혔다.

/** 소수(×100 정수)를 자연수로 나눈 몫의 **소수 자릿수**. 여덟 자리 안에 안 끝나면 `null`. */
function centsQuotientDp(xc: number, d: number): number | null {
  for (let k = 0; k <= 8; k += 1) {
    if ((xc * 10 ** k) % (100 * d) === 0) return k;
  }
  return null;
}

/**
 * 그 몫을 지면 글자로. 안 끝나면 `null` — 부르는 쪽이 **값을 안 적고 말로** 적는다.
 *
 * ⚠️ 소수 **세** 자리부터는 값을 적으면 안 된다. 1-3 시험이 `\d+\.\d{3,}` 를
 *    「샌 소수」로 문다(그 대단원의 몫은 두 자리까지다). 그래서 `dp >= 3` 은
 *    끝나더라도 «안 적는» 쪽으로 돌린다 — 잘라 적으면 값이 틀린 글이 된다.
 */
function centsQuotientText(xc: number, d: number): string | null {
  const k = centsQuotientDp(xc, d);
  if (k === null || k > 2) return null;
  return decStr((xc * 10 ** k) / (100 * d), k);
}

/** 몫의 **소수 첫째 자리 숫자** — 안 끝나도 잰다(한 자리만 내리면 된다). */
function centsQuotientTenth(xc: number, d: number): number {
  return Math.floor((xc * 10) / (100 * d)) % 10;
}

/**
 * **답을 먼저, 그다음 «창 안에서 답이 몇째인가»를 고른다** — 두 겹 뽑기.
 *
 * 실측(씨앗 6,000 표본)으로 정한 순서다. 자리를 먼저 고르면 답이 쏠리고
 * (1-3-3 은 「무조건 $5$」가 **90%**), 답을 먼저 고르면 자리 지름길이 남는다.
 * 둘을 견주어 **답 먼저**를 골랐다 — 답 쏠림은 지면에서 바로 통하는 지름길이고,
 * 자리 지름길은 우연 확률과의 차가 훨씬 작았다:
 *
 * ```
 *              답 분포                 가장 큼 / 가장 작음 / 가운데   (우연)
 * 1-3-3 자리먼저  5 가 48%              13.3 / 26.7 / 26.7           23.1
 * 1-3-3 답먼저    다섯 값 20% 씩        32.9 / 27.6 / 25.7           27.1
 * 1-3-4 자리먼저  5 가 33% · 6 이 31%   22.2 / 22.3 / 22.2           22.2
 * 1-3-4 답먼저    다섯 값 20% 씩        18.8 / 33.8 / 21.4           23.7
 * ```
 */
function pickByAnswerThenSlot<T extends { ans: number; slot: string }>(
  rng: Rng,
  bins: Map<number, Map<string, T[]>>,
  answers: readonly number[],
): T {
  const bySlot = bins.get(pick(rng, answers))!;
  const slots = [...bySlot.keys()].sort();
  return pick(rng, bySlot.get(pick(rng, slots))!);
}

/** 답 → 자리 → 사례. 위 뽑기가 읽는 모양으로 묶는다. */
function binByAnswerThenSlot<T extends { ans: number; slot: string }>(
  rows: readonly T[],
): { bins: Map<number, Map<string, T[]>>; answers: number[] } {
  const bins = new Map<number, Map<string, T[]>>();
  for (const r of rows) {
    let bySlot = bins.get(r.ans);
    if (!bySlot) {
      bySlot = new Map();
      bins.set(r.ans, bySlot);
    }
    const list = bySlot.get(r.slot);
    if (list) list.push(r);
    else bySlot.set(r.slot, [r]);
  }
  return { bins, answers: [...bins.keys()].sort((a, b) => a - b) };
}

// ── 1-3-2 몫이 $1$보다 작은 (소수)÷(자연수) — 심화중 ────────────────────────
//
// 안 굳는 마디: **나누는 수.** 「몫이 $1$보다 작다」는 그것을 «$A$ 보다 큰 자연수» 라는
// 열린 집합으로만 준다.
// 굳히는 성질: 이 소단원 그 자체 — 「몫이 $1$보다 작다 ⟺ 나누어지는 수가 나누는 수보다
// 작다」. 그 집합에서 **가장 작은 수**가 하나를 고른다. 후보를 **끝까지 나눠 보지 않고**
// 비교만으로 걸러 내므로 D-115 ⑾ 로 «중» 이다.
//
// ⚠️ 심화하(「어떤 수를 $2$로 나누었더니 $0.6$ → $6$으로 나눈 몫」)는 나누는 수를 **둘 다**
//    발문이 준다. 여기서는 그중 하나를 부등식 뒤로 숨겼다 — 사다리가 정확히 한 칸 오른다.
type UnderOneSmallestCase = {
  /** 나누는 수(중간값). 답이 아니다. */
  d: number;
  /** 부등식이 걸리는 소수(×100) — $d-1 < A < d$ 라 「가장 작은 자연수」가 $d$ 다. */
  ac: number;
  /** 몫(×100) — $1$보다 작다(이 소단원). */
  qc: number;
  /** 답: 어떤 소수(×100). */
  xc: number;
  ans: number;
  slot: string;
};

const underOneSmallestStem = (c: UnderOneSmallestCase): string =>
  `어떤 소수를 자연수로 나누었더니 몫이 ${num(fromCents(c.qc))}${centsJosa(c.qc, "이", "가")} 되었습니다. ` +
  `나누는 수가 ${num(fromCents(c.ac))}${centsJosa(c.ac, "을", "를")} 나누면 몫이 ${num(1)}보다 작아지는 ` +
  `자연수 중에서 가장 작은 수일 때, 어떤 소수를 구하시오.`;

const UNDER_ONE_SMALLEST = lazyTable("g6.UNDER_ONE_SMALLEST", () => {
  const table: UnderOneSmallestCase[] = [];
  for (let d = 2; d <= 9; d += 1)
    for (let ac = (d - 1) * 100 + 10; ac < d * 100; ac += 10) {
      if (ac % 100 === 0) continue; // 자연수면 「가장 작은」이 $A$ 자신이 되어 뜻이 흔들린다
      // 확인 줄에 $A\div d$ 를 적으려면 그 몫도 지면에 적을 수 있어야 한다.
      const aq = centsQuotientText(ac, d);
      if (aq === null) continue;
      for (let qc = 10; qc <= 90; qc += 10) {
        const xc = qc * d;
        if (xc % 100 === 0) continue; // 답이 자연수면 「어떤 소수」가 아니다
        if (xc === ac) continue;
        const c: UnderOneSmallestCase = {
          d,
          ac,
          qc,
          xc,
          ans: xc,
          slot: `q${qc}`,
        };
        // 반증 ⑥ + 답이 지면에 그대로 + ±한 걸음. 실측으로 $A-1$ 이 답과 같아지는
        // 자리가 3.2% 있었고 이 자가 그것을 뺀다.
        if (!backsolveSafeStem(underOneSmallestStem(c), rat(xc, 100))) continue;
        table.push(c);
      }
    }
  return table;
});

const UNDER_ONE_SMALLEST_BINS = lazyTable("g6.UNDER_ONE_SMALLEST_BINS", () =>
  binByAnswerThenSlot(UNDER_ONE_SMALLEST()),
);

function underOneSmallestMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pickByAnswerThenSlot(
    rng,
    UNDER_ONE_SMALLEST_BINS().bins,
    UNDER_ONE_SMALLEST_BINS().answers,
  );
  const a = fromCents(c.ac);
  const q = fromCents(c.qc);
  const x = fromCents(c.xc);
  const aq = centsQuotientText(c.ac, c.d)!;
  return makeDeep(unit, underOneSmallestStem(c), num(x), [
    `몫이 ${num(1)}보다 작으려면 나누어지는 수가 나누는 수보다 작아야 합니다. ` +
      `${num(a)}${centsJosa(c.ac, "을", "를")} 나누어 몫이 ${num(1)}보다 작아지는 자연수는 ` +
      `${num(a)}보다 큰 수이므로, 그중 가장 작은 수는 ${num(c.d)}입니다.`,
    `어떤 소수를 ${num(c.d)}${numRo(c.d)} 나눈 몫이 ${num(q)}이므로, 어떤 소수는 ` +
      `${expr(`${q}\\times${c.d}=${x}`)} 입니다.`,
    // ⚠️ 「로/으로」는 **끝소리**가 정한다 — 손으로 「로」라 적었다가 판정기가 물었다
    //    (`$4.3\div5=0.86$ 로` → 「팔육」은 받침이 있어 «으로»다). 그 표를 쓰는
    //    `numRo`·`lastSpokenNumber` 에 맡긴다.
    `${expr(`${x}\\div${c.d}=${q}`)} 이고, ${expr(`${a}\\div${c.d}=${aq}`)}` +
      `${numRo(lastSpokenNumber(`${a}\\div${c.d}=${aq}`))} ` +
      `몫이 ${num(1)}보다 작은 것도 확인됩니다.`,
  ]);
}

// ── 1-3-3 소수점 아래 $0$을 내려 계산하는 (소수)÷(자연수) — 심화상 ──────────
// ── 1-3-4 몫의 소수 첫째 자리에 $0$이 있는 (소수)÷(자연수) — 심화상 ────────
//
// 안 굳는 마디: **나누는 수.** 창이 자연수 후보를 서넛 만들고, 그 소단원의 자리 성질이
// 하나만 남긴다 — 그런데 **그 성질은 미리 계산할 규칙이 없다.** 「$0$을 내려야 하는가」도
// 「첫째 자리가 $0$인가」도 실제로 나눠 보아야 안다. 후보를 **다 계산해 견주므로**
// D-115 ⑾ 로 «상» 이다(그래서 이 둘은 «중»을 비운다 — 같은 성질로 «중»을 지으면
// 해설이 똑같이 늘어놓는다).
//
// ⚠️ 후보 몫 중 **소수 세 자리 이상**이거나 안 끝나는 것은 값을 **안 적는다** —
//    잘라 적으면 틀린 글이 되고, 그대로 적으면 1-3 시험의 「샌 소수」에 걸린다.
//    대신 「소수 두 자리 수가 아닙니다」로 적는다(참이고, 학생이 두 자리까지만
//    내려 보면 확인된다). 값이 적히는 후보가 **둘 이상**일 때만 자리를 만든다.
type DivisorSlotCase = {
  /** 나누어지는 소수(×100). */
  xc: number;
  lo: number;
  hi: number;
  /** 조건을 지키는 유일한 나누는 수. */
  d: number;
  cands: number[];
  ans: number;
  slot: string;
};

function buildDivisorSlot(
  keep: (xc: number, d: number) => boolean,
  bounds: { xlo: number; xhi: number; winMin: number; winMax: number },
  stemOf: (c: DivisorSlotCase) => string,
  answerOf: (c: DivisorSlotCase) => Rat,
): DivisorSlotCase[] {
  const rows: DivisorSlotCase[] = [];
  for (let xc = bounds.xlo; xc <= bounds.xhi; xc += 10) {
    if (xc % 100 === 0) continue; // 나누어지는 수는 소수 한 자리 수다
    for (let lo = 1; lo <= 9; lo += 1)
      for (
        let hi = lo + bounds.winMin + 1;
        hi <= lo + bounds.winMax + 1;
        hi += 1
      ) {
        const cands: number[] = [];
        for (let d = lo + 1; d < hi; d += 1) cands.push(d);
        if (cands.length < bounds.winMin || cands.length > bounds.winMax)
          continue;
        if (cands[0]! < 2 || cands[cands.length - 1]! > 9) continue;
        // 값이 적히는 후보가 둘은 있어야 해설이 «견주는» 글이 된다.
        if (cands.filter((d) => centsQuotientText(xc, d) !== null).length < 2)
          continue;
        const hit = cands.filter((d) => keep(xc, d));
        if (hit.length !== 1) continue;
        const d = hit[0]!;
        const c: DivisorSlotCase = {
          xc,
          lo,
          hi,
          d,
          cands,
          ans: d,
          slot: `${cands.indexOf(d)}/${cands.length}`,
        };
        if (!backsolveSafeStem(stemOf(c), answerOf(c))) continue;
        rows.push(c);
      }
  }
  return rows;
}

/** 후보를 하나씩 나눠 본 결과를 지면 글로. 값이 안 적히는 것은 **말로** 적는다. */
function divisorTrialLine(c: DivisorSlotCase): string {
  const shown: string[] = [];
  const unshown: number[] = [];
  const x = fromCents(c.xc);
  for (const d of c.cands) {
    const q = centsQuotientText(c.xc, d);
    if (q === null) unshown.push(d);
    else shown.push(expr(`${x}\\div${d}=${q}`));
  }
  const tail =
    unshown.length === 0
      ? ""
      : ` 그리고 ${unshown.map((d) => expr(`${x}\\div${d}`)).join(", ")} 의 몫은 소수 두 자리 수가 아닙니다.`;
  return `나누는 수가 될 수 있는 수를 하나씩 나누어 봅니다. ${shown.join(", ")} 입니다.${tail}`;
}

const bringZeroSlotStem = (c: DivisorSlotCase): string =>
  `${num(fromCents(c.xc))}${centsJosa(c.xc, "을", "를")} 어떤 자연수로 나누었더니 ` +
  `소수점 아래 ${num(0)}을 내려 계산하게 되어 몫이 소수 두 자리 수가 되었습니다. ` +
  `나누는 수가 ${num(c.lo)}보다 크고 ${num(c.hi)}보다 작을 때, 나누는 수를 구하시오.`;

const BRING_ZERO_SLOT = lazyTable("g6.BRING_ZERO_SLOT", () =>
  buildDivisorSlot(
    (xc, d) => centsQuotientDp(xc, d) === 2,
    { xlo: 110, xhi: 4990, winMin: 3, winMax: 6 },
    bringZeroSlotStem,
    (c) => rat(c.d),
  ),
);
const BRING_ZERO_BINS = lazyTable("g6.BRING_ZERO_BINS", () =>
  binByAnswerThenSlot(BRING_ZERO_SLOT()),
);

function bringZeroDivisorTop(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pickByAnswerThenSlot(
    rng,
    BRING_ZERO_BINS().bins,
    BRING_ZERO_BINS().answers,
  );
  const x = fromCents(c.xc);
  const q = centsQuotientText(c.xc, c.d)!;
  return makeDeep(unit, bringZeroSlotStem(c), num(c.d), [
    `나누는 수가 될 수 있는 자연수는 ${c.cands.map((d) => num(d)).join(", ")} 입니다.`,
    divisorTrialLine(c),
    `나누어지는 수는 소수 한 자리 수인데 몫이 소수 두 자리 수이므로, 소수점 아래 ` +
      `${num(0)}을 내려 계산한 것은 ${expr(`${x}\\div${c.d}=${q}`)} 뿐입니다. ` +
      `나누는 수는 ${num(c.d)}입니다.`,
  ]);
}

const zeroTenthSlotStem = (c: DivisorSlotCase): string =>
  `${num(fromCents(c.xc))}${centsJosa(c.xc, "을", "를")} 어떤 자연수로 나누었더니 ` +
  `몫이 소수 첫째 자리에 ${num(0)}이 있는 소수 두 자리 수가 되었습니다. ` +
  `나누는 수가 ${num(c.lo)}보다 크고 ${num(c.hi)}보다 작을 때, 그 몫을 구하시오.`;

/**
 * ⚠️ 1-3-3 과 **묻는 것을 갈랐다**(R5) — 저쪽은 나누는 수를, 여기는 **몫**을 묻는다.
 * 답이 몫이면 「무조건 $5$로 나눠라」가 답을 바로 주지 못하고, 지면에서도 이 소단원의
 * 이름(첫째 자리에 $0$이 있는 몫)이 **답 자체**로 보인다.
 */
const ZERO_TENTH_SLOT = lazyTable("g6.ZERO_TENTH_SLOT", () =>
  buildDivisorSlot(
    (xc, d) => centsQuotientDp(xc, d) === 2 && centsQuotientTenth(xc, d) === 0,
    { xlo: 210, xhi: 4990, winMin: 3, winMax: 6 },
    zeroTenthSlotStem,
    (c) => rat(c.xc, 100 * c.d),
  ),
);
const ZERO_TENTH_BINS = lazyTable("g6.ZERO_TENTH_BINS", () =>
  binByAnswerThenSlot(ZERO_TENTH_SLOT()),
);

function zeroTenthQuotientTop(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pickByAnswerThenSlot(
    rng,
    ZERO_TENTH_BINS().bins,
    ZERO_TENTH_BINS().answers,
  );
  const x = fromCents(c.xc);
  const q = centsQuotientText(c.xc, c.d)!;
  return makeDeep(unit, zeroTenthSlotStem(c), num(q), [
    `나누는 수가 될 수 있는 자연수는 ${c.cands.map((d) => num(d)).join(", ")} 입니다.`,
    divisorTrialLine(c),
    `이 중 몫의 소수 첫째 자리에 ${num(0)}이 있는 것은 ` +
      `${expr(`${x}\\div${c.d}=${q}`)} 뿐이므로, 몫은 ${num(q)}입니다.`,
  ]);
}

// ══════════ 4차분(물결 4) — 초6 `1-4 비와 비율` ══════════
//
// ## 예약한 굳힘 축 — **「비율은 두 수를 하나로 뭉갠다 + 항·사람은 자연수」**
//
// 토대 §1.4 는 1-4 에 「기준량이 바뀐다」를 예약하고 「전체가 $q$의 배수」는 1-5 로
// 넘기라고 적었다. 그런데 **같은 표의 1-5 칸은 「사람 수가 자연수(=1-4)」를 쓰지 말라**고
// 적는다 — 두 칸이 서로를 가리킨다. 살릴 수 있는 읽기는 하나뿐이다:
// **정수성의 «운반체»를 가른다.** 1-4 는 **사람·항**, 1-5 는 **눈금 cm** 다.
// 토대 §3 의 1-5 항이 그것을 뒷받침한다 — 「「사람 수가 자연수」는 그래프 개념이 아니라
// 수 개념으로 읽힐 수 있다. **그리기 소단원에서만** 안전하게 통과한다」.
//
// ## 🔴 심화상은 **비웠다** — 조건 둘이 접히거나, 안 접히면 창이 잉여가 된다
//
// 토대의 심화상 꼴은 「백분율 두 겹(그중 $\%$) → 후보를 각각 계산해 자연수인지 견주기」다.
// 그런데 사슬이 **선형**이라 조건 둘은 늘 한 줄로 접힌다(전체가 $b_1$ 의 배수 ∧ $b_2$ 의
// 배수 ⇒ 최소공배수의 배수 — 해설 한 줄). 접히지 않게 둘째를 **값 비교**로 두면
// 그 비교 하나가 답을 정해 **첫 창이 잉여**가 된다(M-6 — 안 읽어도 되는 조건).
// 곧 이 축에는 «후보를 만들어 견주는» 자리가 구조적으로 없다. 1-5 심화상을 비운
// 토대 §3 의 논거와 **같은 모양**이고, 이 회차의 1-3-2 심화상 비움과도 같다.
//
// ## 겹침 — 심화하가 이미 쓴 것을 피한다
//
// 1-4 는 토대가 「기존 심화하와 겹치기 가장 쉬운 대단원」이라 찍은 자리다. 실물을 뽑아
// 보니 심화하 여섯이 전부 **한 걸음 역산**이고, 그 여섯이 값을 **전부 준다**:
// 「어떤 수의 $5$배는 $15$」·「합 $10$·차 $2$」·「비율 $\frac35$·합 $24$」·「$4$시간 $240$km」·
// 「$40$명 중 $20\%$ 의 $25\%$」·「찬성률 $60\%$·찬성 $150$명」. 새 칸은 그 «주는 값»을
// **하나 빼고 정수성으로 대신**한다 — 그것이 이 회차가 오르는 한 칸이다.
//
// ## 세 소단원이 **묻는 것을 다르게** 한다 (R5)
//
//     1-4-3  기준량 창 → **비교하는 양**
//     1-4-5  전체 창   → **그 $p\%$ 인 학생 수**
//     1-4-6  전체 창   → **반대한 학생 수**(여집합)

/** 백분율을 기약분수로 — `36` → `[9, 25]`. 배수열의 모듈러스는 그 분모다. */
function pctFraction(p: number): [number, number] {
  const g = gcd(p, 100);
  return [p / g, 100 / g];
}

/**
 * 「$lo$ 보다 크고 $hi$ 보다 작은 자연수 중 $m$ 의 배수」가 **정확히 하나**인가.
 * 하나가 아니면 답이 안 서거나(둘 이상) 못 선다(0).
 */
function loneMultiple(lo: number, hi: number, m: number): number | null {
  let hit: number | null = null;
  for (let v = lo + 1; v < hi; v += 1) {
    if (v % m !== 0) continue;
    if (hit !== null) return null;
    hit = v;
  }
  return hit;
}

/** 창 안 자연수 가운데 답이 몇째인가 — 「가운데·끝」 지름길을 흩뜨리는 묶음 열쇠. */
const slotOf = (lo: number, hi: number, v: number) =>
  `${v - lo - 1}/${hi - lo - 1}`;

// ── 1-4-3 비율 — 심화중 ─────────────────────────────────────────────────────
//
// 안 굳는 마디: **한 묶음의 크기.** 비율 $\frac pq$ 는 실제 두 양을 $(pk,\ qk)$ 배수열로만 준다.
// 굳히는 성질: 이 소단원의 것 — 「두 항이 자연수」가 기준량을 $q$ 의 배수로 묶고,
// 창이 그중 하나를 고른다. 후보를 **끝까지 계산하지 않고** 걸러 내므로 «중» 이다.
//
// ⚠️ 심화하는 **합**을 준다(「합이 $24$」) — 그러면 한 묶음이 한 줄로 굳는다.
//    여기서는 그 값을 빼고 정수성으로 대신했다. 사다리가 정확히 한 칸 오른다.
// ⚠️ 토대 함정 ⑶ — 이 꼴은 반증 ⑥ 이 자주 문다(답 $pk$ 가 $p\times q$ 와 우연히 같아진다).
//    실측으로 후보의 **21.9%** 가 그렇게 깎였다.
type RateWindowCase = {
  p: number;
  q: number;
  lo: number;
  hi: number;
  base: number;
  ans: number;
  slot: string;
};

const rateWindowStem = (c: RateWindowCase): string =>
  `비율이 ${expr(`\\frac{${c.p}}{${c.q}}`)} 인 비가 있습니다. 두 항이 모두 자연수이고 ` +
  `기준량이 ${num(c.lo)}보다 크고 ${num(c.hi)}보다 작을 때, 비교하는 양은 얼마입니까?`;

const RATE_WINDOW_MID = lazyTable("g6.RATE_WINDOW_MID", () => {
  const table: RateWindowCase[] = [];
  for (let q = 4; q <= 15; q += 1)
    for (let p = 2; p < q; p += 1) {
      if (gcd(p, q) !== 1) continue;
      for (let k = 2; k <= 8; k += 1) {
        const base = q * k;
        const ans = p * k;
        if (ans < 3 || base > 120) continue;
        for (let lo = Math.max(1, base - 8); lo < base; lo += 1)
          for (let hi = base + 1; hi <= base + 8; hi += 1) {
            const span = hi - lo - 1;
            // 🔴 **창을 일곱 이상으로 잡는다** — 이 갈래에서는 공용 반증 ⑥ 자가
            //    창의 **두 끝**을 구조적으로 걷어내기 때문이다(측정: 자리 0 이 1,428 → 0).
            //    답이 $rac pq	imes$(기준량)인데 기준량이 $lo+1$ 이면
            //    $rac pq	imes lo+rac pq$ 가 되어 `a	imes b+c` 꼴에 걸린다(끝도 대칭).
            //    막을 수는 없으니 **창을 넓혀 그 누수의 몫을 줄인다**(2/5 → 2/7 아래).
            if (span < 7 || span > 12) continue;
            if (loneMultiple(lo, hi, q) !== base) continue;
            const c: RateWindowCase = {
              p,
              q,
              lo,
              hi,
              base,
              ans,
              slot: slotOf(lo, hi, base),
            };
            if (!backsolveSafeStem(rateWindowStem(c), rat(ans))) continue;
            table.push(c);
          }
      }
    }
  return table;
});
const RATE_WINDOW_BINS = lazyTable("g6.RATE_WINDOW_BINS", () =>
  binByAnswerThenSlot(RATE_WINDOW_MID()),
);

function rateWindowMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pickByAnswerThenSlot(
    rng,
    RATE_WINDOW_BINS().bins,
    RATE_WINDOW_BINS().answers,
  );
  return makeDeep(unit, rateWindowStem(c), num(c.ans), [
    `비율이 ${expr(`\\frac{${c.p}}{${c.q}}`)} 이므로 비교하는 양은 ${num(c.p)}묶음, ` +
      `기준량은 ${num(c.q)}묶음입니다. 두 항이 자연수이려면 기준량이 ${num(c.q)}의 배수여야 합니다.`,
    `${num(c.lo)}보다 크고 ${num(c.hi)}보다 작은 ${num(c.q)}의 배수는 ` +
      `${expr(`${c.q}\\times${c.base / c.q}=${c.base}`)} 하나이므로 기준량은 ${num(c.base)}입니다.`,
    `한 묶음은 ${expr(`${c.base}\\div${c.q}=${c.base / c.q}`)} 이므로 비교하는 양은 ` +
      `${expr(`${c.base / c.q}\\times${c.p}=${c.ans}`)} 입니다.`,
  ]);
}

// ── 1-4-5 백분율 — 심화중 ───────────────────────────────────────────────────
//
// 안 굳는 마디: **전체.** 백분율만으로는 실제 인원이 배수열로만 묶인다.
// 굳히는 성질: 「사람 수는 자연수」 — 백분율을 기약분수로 고치면 전체가 그 분모의
// 배수여야 한다. 창이 그중 하나를 고른다.
//
// ⚠️ 토대 실측: 이 꼴(「전체의 $p\%$ 가 자연수 + 전체가 범위 안」)은 반증 ⑥ 이
//    **0/80** 이라 1-4 에서 가장 안전한 축이다. 우리 판에서도 깎임이 12.5% 로 낮다.
// ⚠️ 심화하 ⓐ 는 「어떤 수의 $p\%$ 가 $V$」로 **값을 준다.** 여기서는 안 준다.
type PctWindowCase = {
  p: number;
  b: number;
  lo: number;
  hi: number;
  total: number;
  ans: number;
  slot: string;
};

/** 백분율 갈래가 쓰는 소재 — 「무엇의 몇 %인가」가 소단원마다 달라야 한다(R5). */
/**
 * 백분율 갈래가 쓰는 소재. **소재마다 그럴듯한 백분율의 폭이 다르다** —
 * 「$94\%$ 가 안경을 쓴 학생」은 값이 맞아도 지면에서 거짓말이다(첫 판이 그랬다).
 * 그래서 소재에 폭을 묶고, 그 폭 안에 드는 소재가 하나도 없으면 그 자리를 안 만든다.
 */
const PCT_GROUPS = [
  { who: "안경을 쓴", unit: "학생", lo: 8, hi: 45 },
  // «여학생인 학생» 은 같은 말이 겹친다(2026-10-20 교차 검수 — 세 모델 중 둘) — 지면에는 «여학생».
  { who: "여학생인", unit: "학생", lo: 35, hi: 65, phrase: "여학생" },
  { who: "버스로 통학하는", unit: "학생", lo: 10, hi: 60 },
  { who: "강아지를 기르는", unit: "학생", lo: 5, hi: 40 },
] as const;

/** 지면에 찍는 소재 이름 — «안경을 쓴 학생» · «여학생». */
const pctPhrase = (g: (typeof PCT_GROUPS)[number]): string =>
  "phrase" in g ? g.phrase : `${g.who} ${g.unit}`;

/** 그 백분율에 어울리는 소재들. 없으면 그 자리는 안 만든다. */
const pctGroupsFor = (p: number) =>
  PCT_GROUPS.filter((g) => p >= g.lo && p <= g.hi);

const pctWindowStem = (c: PctWindowCase, g: (typeof PCT_GROUPS)[number]) =>
  `어느 학교 전체 학생의 ${expr(`${c.p}\\%`)} 가 ${pctPhrase(g)}입니다. ` +
  `${pctPhrase(g)} 수가 자연수이고 전체 ${g.unit}이 ${num(c.lo)}명보다 많고 ` +
  `${num(c.hi)}명보다 적을 때, ${pctPhrase(g)}은 몇 명입니까?`;

const PCT_WINDOW_MID = lazyTable("g6.PCT_WINDOW_MID", () => {
  const table: PctWindowCase[] = [];
  for (let p = 4; p <= 96; p += 1) {
    const [a, b] = pctFraction(p);
    if (b < 5 || b > 50) continue; // 배수열이 너무 촘촘하거나 너무 성기면 창이 안 선다
    for (let k = 1; k <= 10; k += 1) {
      const total = b * k;
      const ans = a * k;
      if (total < 20 || total > 300 || ans < 2) continue;
      for (let lo = Math.max(1, total - b + 1); lo < total; lo += 1)
        for (let hi = total + 1; hi <= total + b - 1; hi += 1) {
          const span = hi - lo - 1;
          if (span < 5 || span > 14) continue;
          if (loneMultiple(lo, hi, b) !== total) continue;
          const c: PctWindowCase = {
            p,
            b,
            lo,
            hi,
            total,
            ans,
            slot: slotOf(lo, hi, total),
          };
          const fit = pctGroupsFor(p);
          if (fit.length === 0) continue; // 그럴듯한 소재가 없는 백분율
          // 소재는 지면 글자만 바꾸므로 첫 소재로 대표해 가드를 건다(수는 같다).
          if (!backsolveSafeStem(pctWindowStem(c, fit[0]!), rat(ans))) continue;
          table.push(c);
        }
    }
  }
  return table;
});
const PCT_WINDOW_BINS = lazyTable("g6.PCT_WINDOW_BINS", () =>
  binByAnswerThenSlot(PCT_WINDOW_MID()),
);

function pctWindowMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pickByAnswerThenSlot(
    rng,
    PCT_WINDOW_BINS().bins,
    PCT_WINDOW_BINS().answers,
  );
  const g = pick(rng, pctGroupsFor(c.p));
  const [a, b] = pctFraction(c.p);
  return makeDeep(unit, pctWindowStem(c, g), num(c.ans), [
    `${expr(`${c.p}\\%`)} 를 기약분수로 고치면 ` +
      `${expr(`\\frac{${c.p}}{100}=\\frac{${a}}{${b}}`)} 입니다. ` +
      `${pctPhrase(g)} 수가 자연수이려면 전체 ${g.unit} 수가 ${num(b)}의 배수여야 합니다.`,
    `${num(c.lo)}보다 크고 ${num(c.hi)}보다 작은 ${num(b)}의 배수는 ` +
      `${expr(`${b}\\times${c.total / b}=${c.total}`)} 하나이므로 전체 ${g.unit}은 ${num(c.total)}명입니다.`,
    `${expr(`${c.total}\\times\\frac{${a}}{${b}}=${c.ans}`)} 이므로 ` +
      `${pctPhrase(g)}은 ${num(c.ans)}명입니다.`,
  ]);
}

// ── 1-4-6 백분율이 사용되는 경우 — 심화중 ───────────────────────────────────
//
// 같은 굳힘 성질이지만 **묻는 것이 다르다**(R5) — 여기서는 여집합(반대한 학생)을 묻는다.
// 그래서 전체를 굳힌 뒤 한 걸음이 더 든다.
//
// ⚠️ 심화하 ⓑ 는 「찬성률 $60\%$·찬성한 학생 $150$명」으로 **인원을 준다.**
//    여기서는 그 값을 빼고 정수성으로 대신한다.
type VoteWindowCase = {
  p: number;
  b: number;
  lo: number;
  hi: number;
  total: number;
  yes: number;
  ans: number;
  slot: string;
};

const voteWindowStem = (c: VoteWindowCase): string =>
  `어느 학교 투표에서 찬성률이 ${expr(`${c.p}\\%`)} 였습니다. 찬성한 학생 수가 자연수이고 ` +
  `투표한 학생이 ${num(c.lo)}명보다 많고 ${num(c.hi)}명보다 적을 때, 반대한 학생은 몇 명입니까? ` +
  `(모든 학생이 찬성이나 반대 가운데 하나를 골랐습니다.)`;

const VOTE_WINDOW_MID = lazyTable("g6.VOTE_WINDOW_MID", () => {
  const table: VoteWindowCase[] = [];
  // 찬성률이 $5\%$ 나 $95\%$ 인 투표는 지면에서 거짓말이다 — 폭을 좁힌다.
  for (let p = 30; p <= 90; p += 1) {
    const [a, b] = pctFraction(p);
    if (b < 5 || b > 50) continue;
    for (let k = 1; k <= 10; k += 1) {
      const total = b * k;
      const yes = a * k;
      const ans = total - yes;
      if (total < 20 || total > 300 || yes < 2 || ans < 2) continue;
      for (let lo = Math.max(1, total - b + 1); lo < total; lo += 1)
        for (let hi = total + 1; hi <= total + b - 1; hi += 1) {
          const span = hi - lo - 1;
          if (span < 5 || span > 14) continue;
          if (loneMultiple(lo, hi, b) !== total) continue;
          const c: VoteWindowCase = {
            p,
            b,
            lo,
            hi,
            total,
            yes,
            ans,
            slot: slotOf(lo, hi, total),
          };
          if (!backsolveSafeStem(voteWindowStem(c), rat(ans))) continue;
          table.push(c);
        }
    }
  }
  return table;
});
const VOTE_WINDOW_BINS = lazyTable("g6.VOTE_WINDOW_BINS", () =>
  binByAnswerThenSlot(VOTE_WINDOW_MID()),
);

function voteWindowMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pickByAnswerThenSlot(
    rng,
    VOTE_WINDOW_BINS().bins,
    VOTE_WINDOW_BINS().answers,
  );
  const [a, b] = pctFraction(c.p);
  return makeDeep(unit, voteWindowStem(c), num(c.ans), [
    `찬성률 ${expr(`${c.p}\\%`)} 를 기약분수로 고치면 ` +
      `${expr(`\\frac{${c.p}}{100}=\\frac{${a}}{${b}}`)} 입니다. 찬성한 학생 수가 자연수이려면 ` +
      `투표한 학생 수가 ${num(b)}의 배수여야 합니다.`,
    `${num(c.lo)}보다 크고 ${num(c.hi)}보다 작은 ${num(b)}의 배수는 ` +
      `${expr(`${b}\\times${c.total / b}=${c.total}`)} 하나이므로 투표한 학생은 ${num(c.total)}명입니다.`,
    `찬성한 학생은 ${expr(`${c.total}\\times\\frac{${a}}{${b}}=${c.yes}`)} 명이므로 ` +
      `반대한 학생은 ${expr(`${c.total}-${c.yes}=${c.ans}`)} 명입니다.`,
  ]);
}

// ══════════ 4차분(물결 4) — 초6 `2-1 분수의 나눗셈` · `1-5 여러 가지 그래프` ══════════
//
// ## 2-1 의 예약 축 — **「소단원 약속이 창을 공짜로 준다」**
//
// 토대 §1.4 가 2-1 에 예약한 것이다: 「진분수라 «분자 < 분모»라는 범위를 소단원이
// 공짜로 준다 — **수치 범위를 발문에 안 적는다**」. 그리고 🔴 로 금지한 것이 둘이다:
// 「몫이 자연수 + 수치 범위」(= 2-2-3 심화중 **그대로**, 게다가 2-1 과 2-2 는 **같은 학기
// 인접 대단원**이라 한 확인테스트에 실린다)와 「어떤 수에 곱했더니」(= 심화하·2-2-1).
//
// 그래서 이 갈래의 발문에는 **「… 보다 크고 … 보다 작은」이 없다.** 창은 진분수 약속이
// 준다. 시험 축 ㉧″ 가 그것을 잠근다(양성 대조는 2-2 심화중이 그 문장을 **쓴다**는 것).
//
// ## 1-5 의 예약 축 — **눈금**
//
// 1-4 와 1-5 는 정수성의 **운반체**로 갈린다(§1-4 블록 머리말). 여기서는 **띠의 눈금 cm** 다 —
// 「눈금에 그리려면 길이가 자연수여야 한다」는 것이 **그리기 소단원의 진짜 요구**이고,
// 토대 §3 이 「사람 수가 자연수」를 1-5 에서 반증 ③ 경계로 찍은 그 자리를 피한다.
// 읽기 소단원(1-5-1·3·5)은 자료가 `figureSpec` 에 있어 발문에 수가 없다 — 비운다.

// ── 2-1-1 분모가 같은 (분수)÷(분수) — 🔴 **중·상 둘 다 비운다** ────────────────
//
// 두 근거는 서로 다르고, 둘 다 **재서** 나왔다.
//
// ⑴ **심화중** — 창을 「$square$ 가 두 자리 수」로 주면, 후보가 $a$ 의 배수열이라
//    두 자리 수는 **언제나 꼬리**다. 곧 답이 늘 «가장 큰 후보»가 되어 그 한 줄이
//    100% 통한다(구성상 참이다 — 씨앗을 볼 것도 없다). 이 대단원에서 꼬리를 안
//    만드는 다른 선택자는 전부 밖에 있다 — 기약(=1-1 예약축) · 약수(초5) ·
//    짝홀(분수 개념이 아니다).
//
// ⑵ **심화상** — 「후보를 만들어 **견주는**」 조건(차·합·크기)을 지면에 적으려면
//    **자연수 하나**가 발문에 들어가야 한다. 그런데 이 소단원의 조건 검사는
//    `kindsPresent("분수","분수")` 라 **요구하지 않은 종류(자연수)를 금지**한다
//    (`probe-elem-section-conditions`). 실제로 「그 몫보다 $15$만큼 클 때」로 지어
//    돌렸더니 그 판정기가 **위반**을 냈다. 기존 갈래 넷도 전부 자연수가 없다
//    (연산 `$rac38divrac18=square$` · 심화하 「어떤 수에 $rac45$ 를 곱했더니」).
//    곧 이 소단원은 **지면에 견줄 값을 적을 수 없다.**
//
// 그래서 2-1 은 **2-1-5(대분수)** 한 자리만 세운다 — 거기서는 대분수의 정수부가
// 자연수 자리를 정당하게 차지하고, 진분수부가 꼬리 없이 흩어진다.

// ── 2-1-5 (가분수)÷(분수), (대분수)÷(분수) — 심화중 ─────────────────────────
//
// 안 굳는 마디: **대분수의 진분수 부분.** 대분수를 가분수로 고치면 분자가
// $(정수부\times분모+\square)$ 인데, 그 $\square$ 를 발문이 안 준다.
// 굳히는 성질: 「몫이 자연수」 — 그 분자가 나누는 분수의 분자의 배수여야 한다.
// 창은 **소단원 약속이 공짜로 준다**($\square$ 는 분모보다 작다) — 수치 범위를 안 적는다.
//
// 🔴 **꼬리 쏠림이 없다.** 2-1-1 의 「두 자리 수」와 달리 여기서 남는 $\square$ 는
//    나머지가 정하는 **한 자리**라, 정수부와 나누는 분자를 바꾸면 $1$ 부터 $분모-1$ 까지
//    고르게 흩어진다(시험 ㉨″ 가 그것을 잰다).
type MixedTopCase = {
  /** 대분수의 정수부. */
  w: number;
  /** 분모(둘이 같다). */
  d: number;
  /** 나누는 분수의 분자. */
  a: number;
  /** 답: 진분수 부분의 분자. */
  ans: number;
  slot: string;
};

const mixedTopStem = (c: MixedTopCase): string =>
  `${expr(`${c.w}\\frac{\\square}{${c.d}}\\div\\frac{${c.a}}{${c.d}}`)} 의 몫이 자연수입니다. ` +
  `${expr(`\\frac{\\square}{${c.d}}`)} 가 진분수일 때, ${expr("\\square")} 안에 알맞은 수를 구하시오.`;

const MIXED_TOP_MID = lazyTable("g6.MIXED_TOP_MID", () => {
  const table: MixedTopCase[] = [];
  // 🔴 분모 상한이 $15$ 였을 때 자리가 **24개**뿐이라 답이 창 가운데로 쏠렸다
  //    (설계 공간에서 $29.2\%$ · 우연 $9.5\%$). $20$ 으로 넓히니 자리 **64개** ·
  //    가운데 $18.8\%$ 로 내려갔다 — 시험 ㉨″ 가 그것을 잰다. 심화하가 이미
  //    $1\frac1{24}$ 를 쓰므로 이 범위는 소단원 밖으로 안 나간다.
  for (let d = 5; d <= 20; d += 1)
    for (let a = 2; a < d; a += 1) {
      if (gcd(a, d) !== 1) continue; // 발문의 분수는 기약이다
      for (let w = 1; w <= 5; w += 1) {
        // 🔴 **유일성은 «기약» 을 빼고 따진다.** 발문은 「진분수」라고만 하지
        //    「기약분수」라고 하지 않는다 — 기약을 조건으로 세어 유일하다고 하면
        //    지면에는 답이 **둘인 문항**이 나간다($3\frac{2}{14}$ 도 진분수다).
        //    실제로 시험이 그것을 잡았다(2-1-5 심화중, 씨앗 8자리).
        //    ⚠️ 「기약분수다」를 발문에 얹는 길은 안 간다 — 약분은 토대 §1.4 가
        //       **1-1 에 예약**한 축이고 초5 개념이다(반증 ③).
        const hit: number[] = [];
        for (let s = 1; s < d; s += 1) if ((w * d + s) % a === 0) hit.push(s);
        if (hit.length !== 1) continue; // 답이 둘이면 값 검산이 구조적으로 못 본다
        // 답 자체는 기약이어야 해설의 대분수가 정본 꼴로 선다.
        if (gcd(hit[0]!, d) !== 1) continue;
        const ans = hit[0]!;
        const c: MixedTopCase = { w, d, a, ans, slot: `${ans}/${d}` };
        if (!backsolveSafeStem(mixedTopStem(c), rat(ans))) continue;
        table.push(c);
      }
    }
  return table;
});
const MIXED_TOP_BINS = lazyTable("g6.MIXED_TOP_BINS", () =>
  binByAnswerThenSlot(MIXED_TOP_MID()),
);

function mixedTopMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pickByAnswerThenSlot(
    rng,
    MIXED_TOP_BINS().bins,
    MIXED_TOP_BINS().answers,
  );
  const imp = c.w * c.d + c.ans;
  const q = imp / c.a;
  return makeDeep(unit, mixedTopStem(c), num(c.ans), [
    `대분수를 가분수로 고치면 분자는 ` +
      `${expr(`${c.w}\\times${c.d}+\\square=${c.w * c.d}+\\square`)} 입니다. ` +
      `분모가 같으므로 몫은 그 분자를 ${num(c.a)}${numRo(c.a)} 나눈 것입니다.`,
    `${expr(`\\frac{\\square}{${c.d}}`)} 가 진분수이므로 ${expr("\\square")} 는 ` +
      `${num(1)}부터 ${num(c.d - 1)}까지입니다. 그 가운데 ` +
      `${expr(`${c.w * c.d}+\\square`)} 가 ${num(c.a)}의 배수가 되는 것은 ` +
      `${expr(`${c.w * c.d}+${c.ans}=${imp}`)} 뿐입니다.`,
    // ⚠️ 「로/으로」는 끝소리가 정한다 — 손으로 적으면 판정기가 문다(1-3-2 에서 한 번 물렸다).
    `${expr(`${c.w}\\frac{${c.ans}}{${c.d}}\\div\\frac{${c.a}}{${c.d}}=${imp}\\div${c.a}=${q}`)}` +
      `${numRo(q)} 몫이 자연수인 것을 확인할 수 있습니다.`,
  ]);
}

// ── 1-5-2 띠그래프로 나타내기 — 심화중 ──────────────────────────────────────
//
// 안 굳는 마디: **띠의 전체 길이.** 비율만으로는 항목의 길이가 배수열로만 묶인다.
// 굳히는 성질: **눈금** — 띠에 그리려면 그 항목의 길이가 자연수 cm 여야 하므로
// 전체 길이가 기약분모의 배수다. 창이 그중 하나를 고른다.
//
// ⚠️ 심화하는 전체 길이와 항목 길이를 **둘 다** 준다(「$40$ cm 띠에서 만화 $18$ cm」).
//    여기서는 둘 다 감추고 비율만 준다 — 사다리가 한 칸 오른다.
// ⚠️ 이 갈래는 **그림이 없다.** 띠를 그리면 길이가 지면에 나와 마디가 안 열린다.
type BandLenCase = {
  p: number;
  b: number;
  lo: number;
  hi: number;
  total: number;
  ans: number;
  slot: string;
};

/** 띠그래프 소재 — 「무엇을 조사했나」. 1-4 의 «사람 수» 소재와 겹치지 않게 고른다. */
const BAND_TOPICS = [
  { survey: "즐겨 읽는 책", item: "만화" },
  { survey: "좋아하는 과목", item: "수학" },
  { survey: "학교에 오는 방법", item: "도보" },
  { survey: "좋아하는 계절", item: "여름" },
] as const;

const bandLenStem = (c: BandLenCase, t: (typeof BAND_TOPICS)[number]) =>
  `${t.survey}${josa(t.survey, "을", "를")} 조사해 띠그래프로 나타내려고 합니다. ` +
  `${t.item}의 비율이 ${expr(`${c.p}\\%`)} 이고, 띠의 전체 길이와 ` +
  `${t.item}${josa(t.item, "이", "가")} 차지하는 길이가 모두 자연수 cm 입니다. ` +
  `띠의 전체 길이가 ${num(c.lo)} cm 보다 길고 ${num(c.hi)} cm 보다 짧을 때, ` +
  `${t.item}${josa(t.item, "이", "가")} 차지하는 길이는 몇 cm 입니까?`;

const BAND_LEN_MID = lazyTable("g6.BAND_LEN_MID", () => {
  const table: BandLenCase[] = [];
  for (let p = 5; p <= 95; p += 5) {
    // 띠그래프의 비율은 $5$의 배수다 — `split100` 이 만드는 풀과 결을 맞춘다.
    const [a, b] = pctFraction(p);
    if (b < 4 || b > 20) continue;
    for (let k = 1; k <= 6; k += 1) {
      const total = b * k;
      const ans = a * k;
      if (total < 10 || total > 60 || ans < 2) continue; // 지면에 그릴 수 있는 띠 길이
      for (let lo = Math.max(1, total - b + 1); lo < total; lo += 1)
        for (let hi = total + 1; hi <= total + b - 1; hi += 1) {
          const span = hi - lo - 1;
          if (span < 5 || span > 12) continue;
          if (loneMultiple(lo, hi, b) !== total) continue;
          const c: BandLenCase = {
            p,
            b,
            lo,
            hi,
            total,
            ans,
            slot: slotOf(lo, hi, total),
          };
          if (!backsolveSafeStem(bandLenStem(c, BAND_TOPICS[0]), rat(ans)))
            continue;
          table.push(c);
        }
    }
  }
  return table;
});
const BAND_LEN_BINS = lazyTable("g6.BAND_LEN_BINS", () =>
  binByAnswerThenSlot(BAND_LEN_MID()),
);

function bandLenMid(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pickByAnswerThenSlot(
    rng,
    BAND_LEN_BINS().bins,
    BAND_LEN_BINS().answers,
  );
  const t = pick(rng, BAND_TOPICS);
  const [a, b] = pctFraction(c.p);
  return makeDeep(unit, bandLenStem(c, t), num(c.ans), [
    `${expr(`${c.p}\\%`)} 를 기약분수로 고치면 ` +
      `${expr(`\\frac{${c.p}}{100}=\\frac{${a}}{${b}}`)} 입니다. ${t.item}의 길이가 ` +
      `자연수 cm 이고 띠의 전체 길이도 자연수 cm 이므로 전체 길이가 ${num(b)}의 배수여야 합니다.`,
    `${num(c.lo)}보다 크고 ${num(c.hi)}보다 작은 ${num(b)}의 배수는 ` +
      `${expr(`${b}\\times${c.total / b}=${c.total}`)} 하나이므로 전체 길이는 ` +
      `${unitNum(c.total, "cm")} 입니다.`,
    `${expr(`${c.total}\\times\\frac{${a}}{${b}}=${c.ans}`)} 이므로 ` +
      `${t.item}${josa(t.item, "이", "가")} 차지하는 길이는 ${unitNum(c.ans, "cm")} 입니다.`,
  ]);
}

/**
 * 난이도 갈래 (D-72 확대) — 키는 `tierKey` 형식(`"초6|1-1-1"`), 값은 넷 전부.
 * `TierVariants` 가 넷을 컴파일로 강제한다 — 일부만 채우면 프리셋 비율이 조용히 못 선다.
 */
export const G6_TIERS: ElemTierMap = {
  "초6|1-1-1": {
    연산: natDivCalc,
    기본: natDivWord,
    응용: natDivApply,
    심화하: natDivDeep,
    심화중: natDivReduceMid,
  },
  "초6|1-1-2": {
    연산: fracNatCalc,
    기본: fracNatWord,
    응용: fracNatApply,
    심화하: fracNatDeep,
    심화중: fracReturnMid,
  },
  "초6|1-1-3": {
    연산: mixedNatCalc,
    기본: mixedNatWord,
    응용: mixedNatApply,
    심화하: mixedNatDeep,
    심화상: mixedNatDivisorTop,
  },
  "초6|1-2-1": {
    연산: prismFaceCalc,
    기본: prismFaceRead,
    응용: prismFaceApply,
    심화하: prismFaceDeep,
    심화중: prismAreaMid,
  },
  "초6|1-2-2": {
    연산: prismPartCalc,
    기본: prismPartRead,
    응용: prismPartApply,
    심화하: prismPartDeep,
    심화중: prismEdgeMid,
  },
  "초6|1-2-3": {
    연산: netCalc,
    기본: netRead,
    응용: netApply,
    심화하: netDeep,
    심화중: prismNetMid,
  },
  "초6|1-2-4": {
    연산: pyrFaceCalc,
    기본: pyrFaceRead,
    응용: pyrFaceApply,
    심화하: pyrFaceDeep,
    심화중: pyrAreaMid,
    심화상: solidKindTop,
  },
  "초6|1-2-5": {
    연산: pyrPartCalc,
    기본: pyrPartRead,
    응용: pyrPartApply,
    심화하: pyrPartDeep,
    심화중: pyrSumMid,
  },
  "초6|1-3-1": {
    연산: decNatCalc,
    기본: decNatWord,
    응용: decNatApply,
    심화하: decNatDeep,
  },
  "초6|1-3-2": {
    연산: decUnderCalc,
    기본: decUnderWord,
    응용: decUnderApply,
    심화하: decUnderDeep,
    심화중: underOneSmallestMid,
  },
  "초6|1-3-3": {
    연산: decBringCalc,
    기본: decBringWord,
    응용: decBringApply,
    심화하: decBringDeep,
    심화상: bringZeroDivisorTop,
  },
  "초6|1-3-4": {
    연산: decZeroCalc,
    기본: decZeroWord,
    응용: decZeroApply,
    심화하: decZeroDeep,
    심화상: zeroTenthQuotientTop,
  },
  "초6|1-3-5": {
    연산: natDecCalc,
    기본: natDecWord,
    응용: natDecApply,
    심화하: natDecDeep,
  },
  "초6|1-4-1": {
    연산: cmpCalc,
    기본: cmpWord,
    응용: cmpApply,
    심화하: cmpDeep,
  },
  "초6|1-4-2": {
    연산: biCalc,
    기본: biWord,
    응용: biApply,
    심화하: biDeep,
  },
  "초6|1-4-3": {
    연산: rateCalc,
    기본: rateWord,
    응용: rateApply,
    심화하: rateDeep,
    심화중: rateWindowMid,
  },
  "초6|1-4-4": {
    연산: rateUseCalc,
    기본: rateUseWord,
    응용: rateUseApply,
    심화하: rateUseDeep,
  },
  "초6|1-4-5": {
    연산: pctCalc,
    기본: pctWord,
    응용: pctApply,
    심화하: pctDeep,
    심화중: pctWindowMid,
  },
  "초6|1-4-6": {
    연산: pctUseCalc,
    기본: pctUseWord,
    응용: pctUseApply,
    심화하: pctUseDeep,
    심화중: voteWindowMid,
  },
  "초6|1-5-1": {
    연산: stripReadCalc,
    기본: stripReadWord,
    응용: stripReadApply,
    심화하: stripReadDeep,
  },
  "초6|1-5-2": {
    연산: stripDrawCalc,
    기본: stripDrawWord,
    응용: stripDrawApply,
    심화하: stripDrawDeep,
    심화중: bandLenMid,
  },
  "초6|1-5-3": {
    연산: pieReadCalc,
    기본: pieReadWord,
    응용: pieReadApply,
    심화하: pieReadDeep,
  },
  "초6|1-5-4": {
    연산: pieDrawCalc,
    기본: pieDrawWord,
    응용: pieDrawApply,
    심화하: pieDrawDeep,
  },
  "초6|1-5-5": {
    연산: cmpChartCalc,
    기본: cmpChartWord,
    응용: cmpChartApply,
    심화하: cmpChartDeep,
  },
  "초6|1-6-1": {
    연산: surfCalc,
    기본: surfWord,
    응용: surfApply,
    심화하: surfDeep,
    심화중: surfRangeMid,
    심화상: surfSquareTop,
  },
  "초6|1-6-2": {
    연산: volCalc,
    기본: volWord,
    응용: volApply,
    심화하: volDeep,
    심화중: volPairMid,
    심화상: volTripleTop,
  },
  "초6|1-6-3": {
    연산: cubicCalc,
    기본: cubicWord,
    응용: cubicApply,
    심화하: cubicDeep,
    심화중: cubicRangeMid,
  },
  "초6|2-1-1": {
    연산: sameDenCalc,
    기본: sameDenWord,
    응용: sameDenApply,
    심화하: sameDenDeep,
    // 확대 갈래 둘 다 비움 — 근거는 위 «2-1-1 … 비운다» 주석.
  },
  "초6|2-1-2": {
    연산: diffDenCalc,
    기본: diffDenWord,
    응용: diffDenApply,
    심화하: diffDenDeep,
  },
  "초6|2-1-3": {
    연산: natFracCalc,
    기본: natFracWord,
    응용: natFracApply,
    심화하: natFracDeep,
  },
  "초6|2-1-4": {
    연산: flipCalc,
    기본: flipWord,
    응용: flipApply,
    심화하: flipDeep,
  },
  "초6|2-1-5": {
    연산: mixedFracCalc,
    기본: mixedFracWord,
    응용: mixedFracApply,
    심화하: mixedFracDeep,
    심화중: mixedTopMid,
  },
  "초6|2-2-1": {
    연산: sameDpCalc,
    기본: sameDpWord,
    응용: sameDpApply,
    심화하: sameDpDeep,
    심화중: sameDpMid,
    심화상: sameDpTop,
  },
  "초6|2-2-2": {
    연산: diffDpCalc,
    기본: diffDpWord,
    응용: diffDpApply,
    심화하: diffDpDeep,
    심화중: diffDpMid,
    심화상: diffDpTop,
  },
  "초6|2-2-3": {
    연산: natDpCalc,
    기본: natDpWord,
    응용: natDpApply,
    심화하: natDpDeep,
    심화중: natDpMid,
    심화상: natDpTop,
  },
  "초6|2-2-4": {
    연산: roundCalc,
    기본: roundWord,
    응용: roundApply,
    심화하: roundDeep,
    심화중: roundMid,
    심화상: roundTop,
  },
  "초6|2-2-5": {
    연산: remCalc,
    기본: remWord,
    응용: remApply,
    심화하: remDeep,
    심화중: remMid,
    심화상: remTop,
  },
  "초6|2-4-1": {
    연산: ratioPropCalc,
    기본: ratioPropWord,
    응용: ratioPropApply,
    심화하: ratioPropDeep,
    심화중: ratioPropMid,
  },
  "초6|2-4-2": {
    연산: simpleRatioCalc,
    기본: simpleRatioWord,
    응용: simpleRatioApply,
    심화하: simpleRatioDeep,
    심화중: simpleRatioMid,
  },
  "초6|2-4-3": {
    연산: propEqCalc,
    기본: propEqWord,
    응용: propEqApply,
    심화하: propEqDeep,
    심화중: propEqMid,
  },
  "초6|2-4-4": {
    연산: propRuleCalc,
    기본: propRuleWord,
    응용: propRuleApply,
    심화하: propRuleDeep,
    심화중: propRuleMid,
  },
  "초6|2-4-5": {
    연산: shareCalc,
    기본: shareWord,
    응용: shareApply,
    심화하: shareDeep,
    심화중: shareRangeMid,
    심화상: shareSplitTop,
  },
  "초6|2-5-1": {
    연산: circPiCalc,
    기본: circPiWord,
    응용: circPiApply,
    심화하: circPiDeep,
  },
  "초6|2-5-2": {
    연산: circLenCalc,
    기본: circLenWord,
    응용: circLenApply,
    심화하: circLenDeep,
    심화상: rollTurnsTop,
  },
  "초6|2-5-3": {
    연산: circAppCalc,
    기본: circAppWord,
    응용: circAppApply,
    심화하: circAppDeep,
  },
  "초6|2-5-4": {
    연산: circAreaCalc,
    기본: circAreaWord,
    응용: circAreaApply,
    심화하: circAreaDeep,
    심화중: areaRangeMid,
  },
  "초6|2-3-1": {
    연산: viewCalc,
    기본: viewWord,
    응용: viewApply,
    심화하: viewDeep,
  },
  "초6|2-3-2": {
    연산: cubeOneCalc,
    기본: cubeOneWord,
    응용: cubeOneApply,
    심화하: cubeOneDeep,
  },
  "초6|2-3-3": {
    연산: cubeTwoCalc,
    기본: cubeTwoWord,
    응용: cubeTwoApply,
    심화하: cubeTwoDeep,
  },
  "초6|2-3-4": {
    연산: cubeLayerCalc,
    기본: cubeLayerWord,
    응용: cubeLayerApply,
    심화하: cubeLayerDeep,
  },
  "초6|2-3-5": {
    연산: cubeBoxCalc,
    기본: cubeBoxWord,
    응용: cubeBoxApply,
    심화하: cubeBoxDeep,
  },
  "초6|2-3-6": {
    연산: cubeMakeCalc,
    기본: cubeMakeWord,
    응용: cubeMakeApply,
    심화하: cubeMakeDeep,
  },
  "초6|2-6-1": {
    연산: cylKnowCalc,
    기본: cylKnowWord,
    응용: cylKnowApply,
    심화하: cylKnowDeep,
    심화중: cylSquareMid,
  },
  "초6|2-6-2": {
    연산: cylNetCalc,
    기본: cylNetWord,
    응용: cylNetApply,
    심화하: cylNetDeep,
    심화중: netSquareMid,
  },
  "초6|2-6-3": {
    연산: coneKnowCalc,
    기본: coneKnowWord,
    응용: coneKnowApply,
    심화하: coneKnowDeep,
    심화상: conePairTop,
  },
  "초6|2-6-4": {
    연산: ballKnowCalc,
    기본: ballKnowWord,
    응용: ballKnowApply,
    심화하: ballKnowDeep,
  },
};

export const G6: Record<string, ChapterHandler> = {
  "초6|1-1 분수의 나눗셈": fracDiv61,
  "초6|1-2 각기둥과 각뿔": prismPyr,
  "초6|1-3 소수의 나눗셈": decDiv61,
  "초6|1-4 비와 비율": ratio,
  "초6|1-5 여러 가지 그래프": graphs61,
  "초6|1-6 직육면체의 겉넓이와 부피": volume,
  "초6|2-1 분수의 나눗셈": fracDiv62,
  "초6|2-2 소수의 나눗셈": decDiv62,
  "초6|2-3 공간과 입체": stacking,
  "초6|2-4 비례식과 비례배분": proportion,
  "초6|2-5 원의 둘레와 넓이": circle62,
  "초6|2-6 원기둥, 원뿔, 구": cylCone,
};

/**
 * 초6 문형 등록부. 소단원마다 문형 10개 (원장님 확정 2026-08-26 안 3 최고안).
 * 진척은 `npx tsx scripts/qa/probe-elem-forms.ts --grade 초6` 이 센다.
 *
 * 배분은 제품 `defaultRatioFor(10)` = 연산1·기본4·응용4·심화1.
 * 01–04 는 기존 4단 핸들러를 **감싸기만** 한다(고치면 적재분이 달라진다).
 */
function forms10(
  calc: ChapterHandler,
  basic: ChapterHandler,
  apply: ChapterHandler,
  deep: ChapterHandler,
  extra: {
    b5: ChapterHandler;
    b6: ChapterHandler;
    b7: ChapterHandler;
    a8: ChapterHandler;
    a9: ChapterHandler;
    a10: ChapterHandler;
  },
): readonly ElemForm[] {
  return [
    { id: "01", tier: "연산", generate: calc },
    { id: "02", tier: "기본", generate: basic },
    { id: "03", tier: "응용", generate: apply },
    { id: "04", tier: "심화하", generate: deep },
    { id: "05", tier: "기본", generate: extra.b5 },
    { id: "06", tier: "기본", generate: extra.b6 },
    { id: "07", tier: "기본", generate: extra.b7 },
    { id: "08", tier: "응용", generate: extra.a8 },
    { id: "09", tier: "응용", generate: extra.a9 },
    { id: "10", tier: "응용", generate: extra.a10 },
  ];
}

/** 1-1-1 재료 — 몫이 진분수가 되게 `a < b`. */
function natPair(rng: Rng): { a: number; b: number } {
  const b = intBetween(rng, 3, 9);
  return { a: intBetween(rng, 2, b - 1), b };
}

/** 문형 05 — 몫이 아니라 **분모**(나누는 수)를 묻는다. */
function natDivFormDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = natPair(rng);
  return make(
    unit,
    `${expr(`${a}\\div${b}`)} 를 분수로 나타낼 때 분모는 얼마입니까?`,
    num(b),
    `나누는 수가 분모입니다. ${expr(`${a}\\div${b}=\\frac{${a}}{${b}}`)} 이므로 분모는 ${num(b)}입니다.`,
  );
}

/** 문형 06 — **분자**(나누어지는 수). 05 와 한 낱말만 바꾸면 안 되므로 식의 자리를 다르게 적는다. */
function natDivFormNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = natPair(rng);
  return make(
    unit,
    `나누어지는 수가 ${num(a)}, 나누는 수가 ${num(b)}인 나눗셈의 몫을 분수로 나타낼 때, 분자는 얼마입니까?`,
    num(a),
    `나누어지는 수가 분자입니다. ${expr(`${a}\\div${b}=\\frac{${a}}{${b}}`)} 이므로 분자는 ${num(a)}입니다.`,
  );
}

/**
 * 문형 07 — 흔한 거꾸로 표기(`b/a`)가 **틀렸다**는 참·거짓.
 * 수가 바뀌어도 답은 「아니요」다 — 묻는 것은 표기 규칙이지 값이 아니다.
 */
function natDivFormReciprocalTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = natPair(rng);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`${a}\\div${b}=\\frac{${b}}{${a}}`)}`,
    "아니요",
    `나누어지는 수가 분자, 나누는 수가 분모이므로 ${expr(`${a}\\div${b}=\\frac{${a}}{${b}}`)} 입니다. ` +
      `${expr(`\\frac{${b}}{${a}}`)} 는 나누는 수와 나누어지는 수를 바꾼 것입니다.`,
  );
}

/** 문형 08 — 분모가 같은 두 나눗셈 몫의 **합**(두 걸음). */
function natDivFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 4, 9);
  const a = intBetween(rng, 1, b - 1);
  const c = intBetween(rng, 1, b - 1);
  return make(
    unit,
    `다음 두 나눗셈의 몫의 합을 구하시오.\n\n${expr(`${a}\\div${b}`)}, ${expr(`${c}\\div${b}`)}`,
    expr(fmtFrac(a + c, b)),
    `몫은 ${expr(`\\frac{${a}}{${b}}`)} 와 ${expr(`\\frac{${c}}{${b}}`)} 입니다. ` +
      `분모가 같으므로 ${expr(`\\frac{${a}+${c}}{${b}}=${fmtFrac(a + c, b)}`)} 입니다.`,
  );
}

/**
 * 문형 09 — 나누고 **그 몫의 절반**을 남긴다.
 * 03 은 「빼고 나눈다」. 여기는 순서가 반대다.
 */
function natDivFormHalfShare(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, SHARE_STUFF);
  const people = intBetween(rng, 3, 8);
  const amount = intBetween(rng, 2, people - 1);
  const [p, q] = divFrac(amount, people, 2, 1);
  return make(
    unit,
    `${s.thing} ${unitNum(amount, s.unit)}${s.unitJosa} ${num(people)}명이 똑같이 ${s.verb} 합니다. ` +
      `한 사람이 자기 몫의 절반만 가졌습니다. 그 사람이 가진 양은 몇 ${s.unit}입니까?`,
    expr(fmtFrac(p, q)),
    `한 사람의 몫은 ${expr(`${amount}\\div${people}=${fmtFrac(amount, people)}`)} ${s.unit}입니다. ` +
      `절반은 ${expr(`${fmtFrac(amount, people)}\\div2=${fmtFrac(p, q)}`)} 입니다.`,
  );
}

/** 문형 10 — 두 나눗셈 중 **큰 몫**. 답이 식 번호가 아니라 그 몫이다. */
function natDivFormLarger(unit: UnitSeed, rng: Rng): ElemProblem {
  const p1 = natPair(rng);
  let p2 = natPair(rng);
  for (let t = 0; t < 24 && p1.a * p2.b === p2.a * p1.b; t += 1)
    p2 = natPair(rng);
  if (p1.a * p2.b === p2.a * p1.b) {
    p2 = { a: p1.a, b: p1.b + 1 <= 9 ? p1.b + 1 : p1.b - 1 };
  }
  const leftBigger = p1.a * p2.b > p2.a * p1.b;
  const win = leftBigger ? p1 : p2;
  return make(
    unit,
    `다음 두 나눗셈 가운데 몫이 더 큰 쪽의 몫을 분수로 나타내시오.\n\n${expr(`${p1.a}\\div${p1.b}`)}\n${expr(`${p2.a}\\div${p2.b}`)}`,
    expr(fmtFrac(win.a, win.b)),
    `${expr(`${p1.a}\\div${p1.b}=${fmtFrac(p1.a, p1.b)}`)}, ` +
      `${expr(`${p2.a}\\div${p2.b}=${fmtFrac(p2.a, p2.b)}`)} 입니다. ` +
      `더 큰 몫은 ${expr(fmtFrac(win.a, win.b))} 입니다.`,
  );
}

/** 1-1-2 재료 — 진분수 ÷ 자연수. */
function fracNatPair(rng: Rng): { top: number; d: number; k: number } {
  const d = intBetween(rng, 2, 9);
  return { top: coprimeTop(rng, d), d, k: intBetween(rng, 2, 7) };
}

/** 문형 05 — 분모에 **곱하는 수**(나누는 수). 몫이 아니다. */
function fracNatFormMulDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const { top, d, k } = fracNatPair(rng);
  return make(
    unit,
    `다음 나눗셈에서 분모에 곱하는 자연수는 얼마입니까?\n\n${expr(`\\frac{${top}}{${d}}\\div${k}`)}`,
    num(k),
    `분수는 자연수로 나눌 때 분자는 그대로 두고 분모에 나누는 수를 곱합니다. 나누는 수는 ${num(k)}입니다.`,
  );
}

/** 문형 06 — 그대로 두는 **분자**. */
function fracNatFormKeepNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const { top, d, k } = fracNatPair(rng);
  return make(
    unit,
    `${expr(`\\frac{${top}}{${d}}`)} 를 ${num(k)}${numRo(k)} 나눌 때 그대로 두는 분자의 값은 얼마입니까?`,
    num(top),
    `분자는 그대로 두고 분모에만 곱합니다. 분자는 ${num(top)}입니다.`,
  );
}

/**
 * 문형 07 — 초등 규칙의 반대(분자에 곱한다)가 **틀렸다**.
 * 원장님이 잡으신 자리(해설은 분자에 곱한다, 식은 분모에 곱한다)를 학생이 고른다.
 */
function fracNatFormWrongRuleTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const { top, d, k } = fracNatPair(rng);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`\\frac{${top}}{${d}}\\div${k}=\\frac{${top}\\times${k}}{${d}}`)}`,
    "아니요",
    `분자는 그대로 두고 분모에 곱합니다. ${expr(`\\frac{${top}}{${d}}\\div${k}=\\frac{${top}}{${d}\\times${k}}`)} 입니다.`,
  );
}

/** 문형 08 — 같은 분수 구조 두 몫의 **합**. */
function fracNatFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 3, 8);
  const k = intBetween(rng, 2, 5);
  const a = coprimeTop(rng, d);
  const c = coprimeTop(rng, d);
  const [p, q] = addFrac(a, d * k, c, d * k);
  return make(
    unit,
    `다음 두 나눗셈의 몫의 합을 구하시오.\n\n${expr(`\\frac{${a}}{${d}}\\div${k}`)}, ${expr(`\\frac{${c}}{${d}}\\div${k}`)}`,
    expr(fmtFrac(p, q)),
    `몫은 ${expr(`\\frac{${a}}{${d}\\times${k}}`)} 와 ${expr(`\\frac{${c}}{${d}\\times${k}}`)} 입니다. ` +
      `합은 ${expr(`\\frac{${a}+${c}}{${d * k}}=${fmtFrac(p, q)}`)} 입니다.`,
  );
}

/** 문형 09 — 한 도막을 구한 뒤 **몇 배를 이어 붙인다**(두 걸음). 03 은 두 번 자른다. */
function fracNatFormTimesPiece(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, CUT_STUFF);
  const { top, d, k } = fracNatPair(rng);
  const times = pick(
    rng,
    [2, 3, 4].filter((t) => t !== k).length > 0
      ? [2, 3, 4].filter((t) => t !== k)
      : ([3] as const),
  );
  const [oneN, oneD] = divFrac(top, d, k, 1);
  const [p, q] = mulFrac(oneN, oneD, times, 1);
  return make(
    unit,
    `길이가 ${expr(`\\frac{${top}}{${d}}`)} m인 ${thing}${josa(thing, "을", "를")} 똑같이 ${num(k)}도막으로 잘랐습니다. ` +
      `그중 ${num(times)}도막을 이어 붙이면 몇 m입니까?`,
    expr(fmtFrac(p, q)),
    `한 도막은 ${expr(`\\frac{${top}}{${d}}\\div${k}=${fmtFrac(oneN, oneD)}`)} m입니다. ` +
      `${num(times)}도막은 ${expr(`${fmtFrac(oneN, oneD)}\\times${times}=${fmtFrac(p, q)}`)} m입니다.`,
  );
}

/** 문형 10 — 같은 분수를 다른 수로 나눈 두 몫의 **차**. 1-1-1 의 「큰 몫」과 가른다. */
function fracNatFormDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 2, 8);
  const top = coprimeTop(rng, d);
  const k = intBetween(rng, 2, 4);
  const m = intBetween(rng, k + 1, 7);
  const [p, q] = subFrac(top, d * k, top, d * m);
  return make(
    unit,
    `${expr(`\\frac{${top}}{${d}}`)} 를 ${num(k)}${numRo(k)} 나눈 몫에서 ${num(m)}${numRo(m)} 나눈 몫을 뺀 값은 얼마입니까?`,
    expr(fmtFrac(p, q)),
    `${expr(`\\frac{${top}}{${d}}\\div${k}=${fmtFrac(top, d * k)}`)}, ` +
      `${expr(`\\frac{${top}}{${d}}\\div${m}=${fmtFrac(top, d * m)}`)} 입니다. ` +
      `차는 ${expr(`${fmtFrac(top, d * k)}-${fmtFrac(top, d * m)}=${fmtFrac(p, q)}`)} 입니다.`,
  );
}

function mixedLatex(m: { w: number; t: number; d: number }): string {
  return `${m.w}\\frac{${m.t}}{${m.d}}`;
}

/** 문형 05 — 가분수로 고친 **분자**. 몫이 아니다. */
function mixedNatFormImpNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = mixedParts(rng);
  return make(
    unit,
    `${expr(mixedLatex(m))} 를 가분수로 고칠 때 분자는 얼마입니까?`,
    num(m.imp),
    `자연수 부분에 분모를 곱하고 분자를 더합니다. ${expr(`${m.w}\\times${m.d}+${m.t}=${m.imp}`)} 이므로 분자는 ${num(m.imp)}입니다.`,
  );
}

/** 문형 06 — 대분수의 **자연수 부분**. */
function mixedNatFormWhole(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = mixedParts(rng);
  return make(
    unit,
    `대분수 ${expr(mixedLatex(m))} 에서 자연수 부분은 얼마입니까?`,
    num(m.w),
    `대분수 ${expr(mixedLatex(m))} 의 자연수 부분은 ${num(m.w)}입니다.`,
  );
}

/**
 * 문형 07 — 자연수 부분은 그대로 두고 분수 부분만 나눈 식이 **틀렸다**.
 */
function mixedNatFormHalfConvertTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = mixedParts(rng);
  const k = intBetween(rng, 2, 6);
  const [p, q] = divFrac(m.imp, m.d, k, 1);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`${mixedLatex(m)}\\div${k}=${m.w}\\frac{${m.t}}{${m.d}\\times${k}}`)}`,
    "아니요",
    `대분수는 먼저 가분수로 고칩니다. ${expr(`${mixedLatex(m)}=\\frac{${m.imp}}{${m.d}}`)} 이므로 ` +
      `${expr(`\\frac{${m.imp}}{${m.d}\\times${k}}=${fmtFrac(p, q)}`)} 입니다.`,
  );
}

/** 문형 08 — 두 대분수÷같은 수의 몫의 **합**. */
function mixedNatFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = mixedParts(rng, 3);
  const b = mixedParts(rng, 3);
  const k = intBetween(rng, 2, 5);
  const [p1, q1] = divFrac(a.imp, a.d, k, 1);
  const [p2, q2] = divFrac(b.imp, b.d, k, 1);
  const [p, q] = addFrac(p1, q1, p2, q2);
  return make(
    unit,
    `다음 두 나눗셈의 몫의 합을 구하시오.\n\n${expr(`${mixedLatex(a)}\\div${k}`)}, ${expr(`${mixedLatex(b)}\\div${k}`)}`,
    expr(fmtFrac(p, q)),
    `각각 가분수로 고쳐 나누면 ${expr(fmtFrac(p1, q1))} 와 ${expr(fmtFrac(p2, q2))} 입니다. ` +
      `합은 ${expr(`${fmtFrac(p1, q1)}+${fmtFrac(p2, q2)}=${fmtFrac(p, q)}`)} 입니다.`,
  );
}

/**
 * 문형 09 — 한 도막이 정다각형의 한 변이 될 때 **둘레**(두 걸음).
 * 03 은 둘레에서 한 변을 구한다. 여기는 반대다.
 */
function mixedNatFormPolyPerim(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = mixedParts(rng, 3);
  const k = intBetween(rng, 2, 5);
  const sides = pick(rng, POLY_SIDES);
  const [oneN, oneD] = divFrac(m.imp, m.d, k, 1);
  const [p, q] = mulFrac(oneN, oneD, sides, 1);
  return make(
    unit,
    `길이가 ${expr(mixedLatex(m))} m인 색 끈을 똑같이 ${num(k)}도막으로 잘라 ` +
      `${polyName(sides, true)}의 한 변으로 썼습니다. 이 도형의 둘레는 몇 m입니까?`,
    expr(fmtFrac(p, q)),
    `한 변은 ${expr(`${mixedLatex(m)}\\div${k}=${fmtFrac(oneN, oneD)}`)} m입니다. ` +
      `변의 수가 ${num(sides)}이므로 둘레는 ${expr(`${fmtFrac(oneN, oneD)}\\times${sides}=${fmtFrac(p, q)}`)} m입니다.`,
  );
}

/** 문형 10 — 같은 대분수를 다른 수로 나눈 몫의 **차**. */
function mixedNatFormDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = mixedParts(rng, 3);
  const k = intBetween(rng, 2, 4);
  const n2 = intBetween(rng, k + 1, 7);
  const [p1, q1] = divFrac(m.imp, m.d, k, 1);
  const [p2, q2] = divFrac(m.imp, m.d, n2, 1);
  const [p, q] = subFrac(p1, q1, p2, q2);
  return make(
    unit,
    `${expr(mixedLatex(m))} 를 ${num(k)}${numRo(k)} 나눈 몫에서 ${num(n2)}${numRo(n2)} 나눈 몫을 뺀 값은 얼마입니까?`,
    expr(fmtFrac(p, q)),
    `${expr(`${mixedLatex(m)}\\div${k}=${fmtFrac(p1, q1)}`)}, ` +
      `${expr(`${mixedLatex(m)}\\div${n2}=${fmtFrac(p2, q2)}`)} 입니다. ` +
      `차는 ${expr(`${fmtFrac(p1, q1)}-${fmtFrac(p2, q2)}=${fmtFrac(p, q)}`)} 입니다.`,
  );
}

function prismFigOf(n: number) {
  return fig("prism", { sides: n, h: 3 });
}

/** 문형 05 — 밑면은 **둘**. 02 는 옆면 수. */
function prismFaceFormBaseCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const thing = pick(rng, PRISM_THINGS);
  return make(
    unit,
    `다음은 각기둥 모양 ${thing}입니다. 밑면은 몇 개입니까?`,
    num(2),
    `각기둥의 밑면은 서로 평행하고 합동인 두 면입니다. 밑면은 ${num(2)}개입니다.`,
    prismFigOf(n),
  );
}

/** 문형 06 — 옆면의 **모양**. 개수가 아니다. */
function prismFaceFormSideShape(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const thing = pick(rng, PRISM_THINGS);
  return make(
    unit,
    `다음은 각기둥 모양 ${thing}입니다. 옆면은 어떤 도형입니까?`,
    "직사각형",
    `각기둥의 옆면은 밑면의 한 변을 높이로 세운 직사각형입니다.`,
    prismFigOf(n),
  );
}

/** 문형 07 — 이름에서 **밑면의 모양**. 01 은 옆면의 수. */
function prismFaceFormBaseShape(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  return make(
    unit,
    `${sino(n)}각기둥의 밑면은 어떤 도형입니까?`,
    polyName(n),
    `각기둥의 이름은 밑면의 모양으로 정합니다. ${sino(n)}각기둥이므로 밑면은 ${polyName(n)}입니다.`,
    prismFigOf(n),
  );
}

/** 문형 08 — 옆면 **하나**의 넓이. 03 은 옆면 전체. */
function prismFaceFormOneArea(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const a = intBetween(rng, 3, 9);
  const h = intBetween(rng, 4, 12);
  return make(
    unit,
    `밑면이 ${polyName(n)}이고 밑면의 한 변의 길이가 ${unitNum(a, "cm")}, 높이가 ${unitNum(h, "cm")} 인 각기둥이 있습니다. ` +
      `옆면 하나의 넓이는 몇 cm²입니까?`,
    num(a * h),
    `옆면 하나는 가로 ${unitNum(a, "cm")}, 세로 ${unitNum(h, "cm")} 인 직사각형이므로 ` +
      `${expr(`${a}\\times${h}=${a * h}`)} 입니다.`,
    prismFigOf(n),
  );
}

/** 문형 09 — 밑면의 **둘레**. */
function prismFaceFormBasePerim(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const a = intBetween(rng, 3, 9);
  return make(
    unit,
    `밑면이 ${polyName(n)}이고 밑면의 변의 길이가 모두 ${unitNum(a, "cm")} 로 같은 각기둥이 있습니다. ` +
      `밑면 하나의 둘레는 몇 cm입니까?`,
    num(n * a),
    `밑면은 ${polyName(n)}이므로 둘레는 ${expr(`${a}\\times${n}=${n * a}`)} 입니다.`,
    prismFigOf(n),
  );
}

/** 문형 10 — 옆면 수에서 밑면 수를 뺀 값. */
function prismFaceFormSideMinusBase(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  return make(
    unit,
    `${sino(n)}각기둥의 옆면의 수는 밑면의 수보다 몇 개 더 많습니까?`,
    num(n - 2),
    `옆면은 ${num(n)}개, 밑면은 ${num(2)}개이므로 ${expr(`${n}-2=${n - 2}`)} 개 더 많습니다.`,
    prismFigOf(n),
  );
}

/** 문형 05 — 이름에서 밑면의 **변의 수**. 1-2-1 07 은 밑면의 도형 이름. */
function prismPartFormBaseSides(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  return make(
    unit,
    `각기둥의 이름이 ${sino(n)}각기둥이려면 밑면의 변은 몇 개여야 합니까?`,
    num(n),
    `각기둥의 이름 앞의 수는 밑면의 변의 수입니다. ${sino(n)}각기둥이므로 변은 ${num(n)}개입니다.`,
    prismFigOf(n),
  );
}

/** 문형 06 — 꼭짓점+면−모서리 = 2 (오일러). 답이 상수여도 묻는 관계가 다르다. */
function prismPartFormEuler(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const p = prismParts(n);
  return make(
    unit,
    `${sino(n)}각기둥에서 꼭짓점의 수와 면의 수를 더한 값에서 모서리의 수를 빼면 얼마입니까?`,
    num(2),
    `꼭짓점 ${num(p.꼭짓점)}개와 면 ${num(p.면)}개를 더하면 ${num(p.꼭짓점 + p.면)}이고, ` +
      `모서리 ${num(p.모서리)}개를 빼면 ${expr(`${p.꼭짓점}+${p.면}-${p.모서리}=2`)} 입니다.`,
    prismFigOf(n),
  );
}

/** 문형 07 — 한 밑면에 있는 꼭짓점. 전체 꼭짓점(2n)이 아니다. */
function prismPartFormBaseVerts(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  return make(
    unit,
    `${sino(n)}각기둥의 한 밑면에 있는 꼭짓점은 몇 개입니까?`,
    num(n),
    `한 밑면은 ${polyName(n)}이므로 꼭짓점은 ${num(n)}개입니다.`,
    prismFigOf(n),
  );
}

/** 문형 08 — 두 밑면을 잇는 옆모서리. */
function prismPartFormVertical(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  return make(
    unit,
    `${sino(n)}각기둥에서 두 밑면을 잇는 모서리는 몇 개입니까?`,
    num(n),
    `밑면의 꼭짓점마다 옆모서리가 하나씩 있으므로 ${num(n)}개입니다.`,
    prismFigOf(n),
  );
}

/** 문형 09 — 두 밑면에 있는 모서리만 (옆모서리 제외). */
function prismPartFormBaseEdges(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  return make(
    unit,
    `${sino(n)}각기둥에서 밑면에 있는 모서리는 모두 몇 개입니까?`,
    num(2 * n),
    `밑면이 ${num(2)}개이고 각 밑면의 모서리는 ${num(n)}개이므로 ${expr(`${n}\\times2=${2 * n}`)} 입니다.`,
    prismFigOf(n),
  );
}

/** 문형 10 — 한 꼭짓점에서 만나는 모서리. 답이 늘 3. */
function prismPartFormMeet(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const thing = pick(rng, PRISM_THINGS);
  return make(
    unit,
    `다음은 각기둥 모양 ${thing}입니다. 한 꼭짓점에서 만나는 모서리는 몇 개입니까?`,
    num(3),
    `각기둥의 한 꼭짓점에는 밑면의 모서리 ${num(2)}개와 옆모서리 ${num(1)}개가 모이므로 ${num(3)}개입니다.`,
    prismFigOf(n),
  );
}

function netFigOf(n: number) {
  return fig("prism", { sides: n, h: 3, net: true });
}

/** 문형 05 — 전개도에서 밑면은 **둘**. */
function netFormBaseCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const thing = pick(rng, PRISM_THINGS);
  return make(
    unit,
    `다음은 ${thing}${josa(thing, "을", "를")} 펼친 전개도입니다. 밑면이 되는 면은 몇 개입니까?`,
    num(2),
    `각기둥의 전개도에는 밑면이 ${num(2)}개 있습니다.`,
    netFigOf(n),
  );
}

/** 문형 06 — 전개도의 옆면 모양. */
function netFormSideShape(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const thing = pick(rng, PRISM_THINGS);
  return make(
    unit,
    `다음은 ${thing}${josa(thing, "을", "를")} 펼친 전개도입니다. 옆면이 되는 면은 어떤 도형입니까?`,
    "직사각형",
    `각기둥 전개도의 옆면은 직사각형입니다.`,
    netFigOf(n),
  );
}

/** 문형 07 — 전개도의 면 전체 수 = n+2. */
function netFormFaceTotal(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  return make(
    unit,
    `${sino(n)}각기둥의 전개도에서 면은 모두 몇 개입니까?`,
    num(n + 2),
    `밑면 ${num(2)}개와 옆면 ${num(n)}개를 더하면 ${expr(`2+${n}=${n + 2}`)} 입니다.`,
    netFigOf(n),
  );
}

/** 문형 08 — 전개도에서 밑면 둘의 둘레 합. 03 은 옆면 가로(밑면 하나 둘레). */
function netFormTwoBasePerim(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const a = intBetween(rng, 3, 9);
  return make(
    unit,
    `밑면이 ${polyName(n)}이고 밑면의 변의 길이가 모두 ${unitNum(a, "cm")} 로 같은 각기둥의 전개도입니다. ` +
      `밑면이 되는 두 면의 둘레의 합은 몇 cm입니까?`,
    num(2 * n * a),
    `밑면 하나의 둘레는 ${expr(`${a}\\times${n}=${n * a}`)} cm이고, 밑면이 ${num(2)}개이므로 ` +
      `${expr(`${n * a}\\times2=${2 * n * a}`)} 입니다.`,
    netFigOf(n),
  );
}

/** 문형 09 — 접으면 밑면은 몇 각형. 02 는 입체 이름. */
function netFormFoldedBase(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const thing = pick(rng, PRISM_THINGS);
  return make(
    unit,
    `다음은 ${thing}${josa(thing, "을", "를")} 펼친 전개도입니다. 이 전개도를 접으면 밑면은 몇 각형입니까?`,
    polyName(n),
    `옆면인 직사각형이 ${num(n)}개이므로 밑면은 ${polyName(n)}입니다.`,
    netFigOf(n),
  );
}

/** 문형 10 — 전개도의 옆면 수에서 밑면 수를 뺀 값. */
function netFormSideMinusBase(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  return make(
    unit,
    `${sino(n)}각기둥의 전개도에서 옆면의 수는 밑면의 수보다 몇 개 더 많습니까?`,
    num(n - 2),
    `옆면 ${num(n)}개, 밑면 ${num(2)}개이므로 ${expr(`${n}-2=${n - 2}`)} 개 더 많습니다.`,
    netFigOf(n),
  );
}

function pyrFigOf(n: number) {
  return fig("pyramid", { sides: n, h: 3 });
}

/** 문형 05 — 각뿔의 밑면은 **하나**. 각기둥(2)과 답이 다르다. */
function pyrFaceFormBaseCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const thing = pick(rng, PYRAMID_THINGS);
  return make(
    unit,
    `다음은 각뿔 모양 ${thing}입니다. 밑면은 몇 개입니까?`,
    num(1),
    `각뿔의 밑면은 ${num(1)}개입니다.`,
    pyrFigOf(n),
  );
}

/** 문형 06 — 옆면은 **삼각형**. 각기둥의 직사각형과 답이 다르다. */
function pyrFaceFormSideShape(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const thing = pick(rng, PYRAMID_THINGS);
  return make(
    unit,
    `다음은 각뿔 모양 ${thing}입니다. 옆면은 어떤 도형입니까?`,
    "삼각형",
    `각뿔의 옆면은 밑면의 한 변과 각뿔의 꼭짓점을 이은 삼각형입니다.`,
    pyrFigOf(n),
  );
}

/** 문형 07 — 이름에서 밑면의 모양. */
function pyrFaceFormBaseShape(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  return make(
    unit,
    `${sino(n)}각뿔의 밑면은 어떤 도형입니까?`,
    polyName(n),
    `각뿔의 이름은 밑면의 모양으로 정합니다. ${sino(n)}각뿔이므로 밑면은 ${polyName(n)}입니다.`,
    pyrFigOf(n),
  );
}

/** 문형 08 — 옆면 **하나**의 넓이(삼각형). 03 은 옆면 전체. */
function pyrFaceFormOneArea(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const a = intBetween(rng, 3, 9);
  const h = pick(
    rng,
    Array.from({ length: 9 }, (_, i) => i + 4).filter((v) => (a * v) % 2 === 0),
  );
  const one = (a * h) / 2;
  return make(
    unit,
    `밑면이 ${polyName(n)}이고 밑면의 한 변의 길이가 ${unitNum(a, "cm")}, ` +
      `옆면인 삼각형의 높이가 ${unitNum(h, "cm")} 인 각뿔이 있습니다. 옆면 하나의 넓이는 몇 cm²입니까?`,
    num(one),
    `옆면 하나는 밑변 ${unitNum(a, "cm")}, 높이 ${unitNum(h, "cm")} 인 삼각형이므로 ` +
      `${expr(`${a}\\times${h}\\div2=${one}`)} 입니다.`,
    pyrFigOf(n),
  );
}

/** 문형 09 — 밑면의 둘레. */
function pyrFaceFormBasePerim(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const a = intBetween(rng, 3, 9);
  return make(
    unit,
    `밑면이 ${polyName(n)}이고 밑면의 변의 길이가 모두 ${unitNum(a, "cm")} 로 같은 각뿔이 있습니다. ` +
      `밑면의 둘레는 몇 cm입니까?`,
    num(n * a),
    `밑면은 ${polyName(n)}이므로 둘레는 ${expr(`${a}\\times${n}=${n * a}`)} 입니다.`,
    pyrFigOf(n),
  );
}

/** 문형 10 — 옆면 수에서 밑면 수를 뺀 값 = n−1. 각기둥은 n−2. */
function pyrFaceFormSideMinusBase(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  return make(
    unit,
    `${sino(n)}각뿔의 옆면의 수는 밑면의 수보다 몇 개 더 많습니까?`,
    num(n - 1),
    `옆면은 ${num(n)}개, 밑면은 ${num(1)}개이므로 ${expr(`${n}-1=${n - 1}`)} 개 더 많습니다.`,
    pyrFigOf(n),
  );
}

/** 문형 05 — 이름에서 밑면의 변의 수. 1-2-4 07 은 도형 이름. */
function pyrPartFormBaseSides(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  return make(
    unit,
    `각뿔의 이름이 ${sino(n)}각뿔이려면 밑면의 변은 몇 개여야 합니까?`,
    num(n),
    `각뿔의 이름 앞의 수는 밑면의 변의 수입니다. ${sino(n)}각뿔이므로 변은 ${num(n)}개입니다.`,
    pyrFigOf(n),
  );
}

/** 문형 06 — 꼭짓점+면−모서리 = 2. */
function pyrPartFormEuler(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const p = pyramidParts(n);
  return make(
    unit,
    `${sino(n)}각뿔에서 꼭짓점의 수와 면의 수를 더한 값에서 모서리의 수를 빼면 얼마입니까?`,
    num(2),
    `꼭짓점 ${num(p.꼭짓점)}개와 면 ${num(p.면)}개를 더하면 ${num(p.꼭짓점 + p.면)}이고, ` +
      `모서리 ${num(p.모서리)}개를 빼면 ${expr(`${p.꼭짓점}+${p.면}-${p.모서리}=2`)} 입니다.`,
    pyrFigOf(n),
  );
}

/** 문형 07 — 밑면에 있는 꼭짓점(각뿔의 꼭짓점 제외). */
function pyrPartFormBaseVerts(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  return make(
    unit,
    `${sino(n)}각뿔에서 밑면 위에 놓인 꼭짓점은 몇 개입니까?`,
    num(n),
    `밑면은 ${polyName(n)}이므로 밑면의 꼭짓점은 ${num(n)}개입니다.`,
    pyrFigOf(n),
  );
}

/** 문형 08 — 각뿔의 꼭짓점에서 만나는 모서리 = n. */
function pyrPartFormApexEdges(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  return make(
    unit,
    `${sino(n)}각뿔에서 각뿔의 꼭짓점과 밑면을 잇는 모서리는 몇 개입니까?`,
    num(n),
    `각뿔의 꼭짓점과 밑면의 각 꼭짓점을 잇는 옆모서리가 ${num(n)}개입니다.`,
    pyrFigOf(n),
  );
}

/** 문형 09 — 밑면에 있는 모서리. */
function pyrPartFormBaseEdges(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  return make(
    unit,
    `${sino(n)}각뿔의 밑면을 이루는 모서리는 몇 개입니까?`,
    num(n),
    `밑면은 ${polyName(n)}이므로 모서리는 ${num(n)}개입니다.`,
    pyrFigOf(n),
  );
}

/** 문형 10 — 밑면에 있지 않은 꼭짓점(각뿔의 꼭짓점)은 하나. */
function pyrPartFormApex(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  const thing = pick(rng, PYRAMID_THINGS);
  return make(
    unit,
    `다음은 각뿔 모양 ${thing}입니다. 밑면에 있지 않은 꼭짓점은 몇 개입니까?`,
    num(1),
    `각뿔의 꼭짓점은 밑면 위에 있지 않습니다. 그런 꼭짓점은 ${num(1)}개입니다.`,
    pyrFigOf(n),
  );
}

/** 문형 05 — 나누는 수. 몫이 아니다. */
function decNatFormDivisor(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_DIV.plain);
  const a = fromCents(c.a);
  return make(
    unit,
    `다음 나눗셈에서 나누는 수는 얼마입니까?\n\n${expr(`${a}\\div${c.b}`)}`,
    num(c.b),
    `나누는 수는 ${expr(`${a}\\div${c.b}`)} 의 오른쪽 수 ${num(c.b)}입니다.`,
  );
}

/** 문형 06 — 몫의 **정수 부분**. */
function decNatFormWhole(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_DIV.plain);
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  const whole = Math.floor(c.q / 100);
  return make(
    unit,
    `다음 나눗셈의 몫에서 정수 부분은 얼마입니까?\n\n${expr(`${a}\\div${c.b}`)}`,
    num(whole),
    `몫은 ${num(q)}이므로 정수 부분은 ${num(whole)}입니다.`,
  );
}

/** 문형 07 — 이 소단원의 몫은 1보다 크다. 「작다」는 틀렸다. */
function decNatFormUnderTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_DIV.plain);
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`${a}\\div${c.b}=${q}`)} 의 몫은 ${num(1)}보다 작다.`,
    "아니요",
    `몫 ${num(q)}${centsJosa(c.q, "은", "는")} ${num(1)}보다 큽니다.`,
  );
}

/** 문형 08 — 두 나눗셈 몫의 합. 센트 정수로 더한다. */
function decNatFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC_DIV.plain);
  const y = pick(rng, DEC_DIV.plain);
  return make(
    unit,
    `다음 두 나눗셈의 몫의 합을 구하시오.\n\n${expr(`${fromCents(x.a)}\\div${x.b}`)}, ${expr(`${fromCents(y.a)}\\div${y.b}`)}`,
    expr(fromCents(x.q + y.q)),
    `몫은 ${num(fromCents(x.q))} 와 ${num(fromCents(y.q))} 입니다. ` +
      `합은 ${expr(`${fromCents(x.q)}+${fromCents(y.q)}=${fromCents(x.q + y.q)}`)} 입니다.`,
  );
}

/** 문형 09 — 나눈 한 몫에서 일부를 쓰고 남은 양(두 걸음). 03 은 빼고 나눈다. */
function decNatFormAfterShare(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(
    rng,
    DEC_DIV.plain.filter((x) => x.q >= 40 && x.a <= 2000),
  );
  const s = pick(rng, POUR_STUFF);
  const used = pick(
    rng,
    [10, 20, 30].filter((u) => u < c.q),
  );
  const left = c.q - used;
  return make(
    unit,
    `${s.thing} ${unitNum(fromCents(c.a), s.unit)}${s.unitJosa} ${s.into} ${num(c.b)}개에 똑같이 나누어 담았습니다. ` +
      `${s.into} 한 개에서 ${unitNum(fromCents(used), s.unit)}${s.unitJosa} 썼습니다. 남은 ${s.thing}${josa(s.thing, "은", "는")} 몇 ${s.unit}입니까?`,
    expr(fromCents(left)),
    `한 ${s.into}에 담은 양은 ${expr(`${fromCents(c.a)}\\div${c.b}=${fromCents(c.q)}`)} ${s.unit}입니다. ` +
      `남은 양은 ${expr(`${fromCents(c.q)}-${fromCents(used)}=${fromCents(left)}`)} 입니다.`,
  );
}

/** 문형 10 — 두 몫의 차. 큰 쪽에서 작은 쪽을 뺀다. */
function decNatFormDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC_DIV.plain);
  let y = pick(rng, DEC_DIV.plain);
  for (let t = 0; t < 20 && y.q === x.q; t += 1) y = pick(rng, DEC_DIV.plain);
  const hi = x.q >= y.q ? x : y;
  const lo = x.q >= y.q ? y : x;
  return make(
    unit,
    `다음 두 나눗셈의 몫의 차를 구하시오.\n\n${expr(`${fromCents(x.a)}\\div${x.b}`)}, ${expr(`${fromCents(y.a)}\\div${y.b}`)}`,
    expr(fromCents(hi.q - lo.q)),
    `몫은 ${num(fromCents(x.q))} 와 ${num(fromCents(y.q))} 입니다. ` +
      `차는 ${expr(`${fromCents(hi.q)}-${fromCents(lo.q)}=${fromCents(hi.q - lo.q)}`)} 입니다.`,
  );
}

/** 문형 05 — 몫<1 이므로 자연수 부분은 0. 1-3-1 06 은 정수 부분이 1 이상. */
function decUnderFormWholeZero(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_DIV.underOne);
  const a = fromCents(c.a);
  return make(
    unit,
    `다음 나눗셈의 몫에서 자연수 부분은 얼마입니까?\n\n${expr(`${a}\\div${c.b}=\\square`)}`,
    num(0),
    `나누어지는 수 ${num(a)}${centsJosa(c.a, "이", "가")} 나누는 수 ${num(c.b)}보다 작으므로 ` +
      `몫의 자연수 부분은 ${num(0)}입니다.`,
  );
}

/** 문형 06 — 나누어지는 수가 더 작다는 규칙이 **맞다**. */
function decUnderFormSmallerTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_DIV.underOne);
  const a = fromCents(c.a);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${num(a)}${centsJosa(c.a, "은", "는")} ${num(c.b)}보다 작으므로 몫의 자연수 부분에 ${num(0)}을 쓴다.`,
    "예",
    `나누어지는 수가 더 작으면 몫의 자연수 부분에 ${num(0)}을 씁니다.`,
  );
}

/** 문형 07 — 이 소단원의 몫은 1보다 작다. 「크다」는 틀렸다. */
function decUnderFormOverTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_DIV.underOne);
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`${a}\\div${c.b}=${q}`)} 의 몫은 ${num(1)}보다 크다.`,
    "아니요",
    `몫 ${num(q)}${centsJosa(c.q, "은", "는")} ${num(1)}보다 작습니다.`,
  );
}

/** 문형 08 — 몫이 1보다 작은 두 나눗셈의 합. */
function decUnderFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC_DIV.underOne);
  const y = pick(rng, DEC_DIV.underOne);
  return make(
    unit,
    `다음 두 나눗셈의 몫의 합을 구하시오. 두 몫은 모두 ${num(1)}보다 작습니다.\n\n${expr(`${fromCents(x.a)}\\div${x.b}`)}, ${expr(`${fromCents(y.a)}\\div${y.b}`)}`,
    expr(fromCents(x.q + y.q)),
    `몫은 ${num(fromCents(x.q))} 와 ${num(fromCents(y.q))} 입니다. ` +
      `합은 ${expr(`${fromCents(x.q)}+${fromCents(y.q)}=${fromCents(x.q + y.q)}`)} 입니다.`,
  );
}

/** 문형 09 — 한 도막을 구한 뒤 몇 배를 이어 붙인다. 02 는 한 도막만. */
function decUnderFormTimesPiece(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_DIV.underOne);
  const thing = pick(rng, CUT_STUFF);
  const times = intBetween(rng, 2, 4);
  return make(
    unit,
    `${thing} ${unitNum(fromCents(c.a), "m")}를 똑같이 ${num(c.b)}도막으로 잘랐습니다. ` +
      `그중 ${num(times)}도막을 이어 붙이면 몇 m입니까?`,
    expr(fromCents(c.q * times)),
    `한 도막은 ${expr(`${fromCents(c.a)}\\div${c.b}=${fromCents(c.q)}`)} m입니다. ` +
      `${num(times)}도막은 ${expr(`${fromCents(c.q)}\\times${times}=${fromCents(c.q * times)}`)} m입니다.`,
  );
}

/** 문형 10 — 몫이 1보다 작은 두 나눗셈의 차. */
function decUnderFormDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC_DIV.underOne);
  let y = pick(rng, DEC_DIV.underOne);
  for (let t = 0; t < 20 && y.q === x.q; t += 1)
    y = pick(rng, DEC_DIV.underOne);
  const hi = x.q >= y.q ? x : y;
  const lo = x.q >= y.q ? y : x;
  return make(
    unit,
    `다음 두 나눗셈의 몫의 차를 구하시오. 두 몫은 모두 ${num(1)}보다 작습니다.\n\n${expr(`${fromCents(x.a)}\\div${x.b}`)}, ${expr(`${fromCents(y.a)}\\div${y.b}`)}`,
    expr(fromCents(hi.q - lo.q)),
    `몫은 ${num(fromCents(x.q))} 와 ${num(fromCents(y.q))} 입니다. ` +
      `차는 ${expr(`${fromCents(hi.q)}-${fromCents(lo.q)}=${fromCents(hi.q - lo.q)}`)} 입니다.`,
  );
}

/** 문형 05 — 0을 내려 계산하는 나눗셈의 나누는 수. */
function decBringFormDivisor(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_BRING_PURE);
  const a = fromCents(c.a);
  return make(
    unit,
    `소수점 아래 ${num(0)}을 내려 계산하는 다음 나눗셈에서 나누는 수는 얼마입니까?\n\n${expr(`${a}\\div${c.b}`)}`,
    num(c.b),
    `나누는 수는 ${num(c.b)}입니다.`,
  );
}

/** 문형 06 — 몫의 소수 둘째 자리 숫자. */
function decBringFormHundredth(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_BRING_PURE);
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  return make(
    unit,
    `다음 나눗셈의 몫에서 소수점 아래 둘째 자리 숫자는 얼마입니까?\n\n${expr(`${a}\\div${c.b}=${q}`)}`,
    num(c.q % 10),
    `몫 ${num(q)}의 소수점 아래 둘째 자리 숫자는 ${num(c.q % 10)}입니다.`,
  );
}

/** 문형 07 — 나누어떨어지지 않으면 0을 내린다. 맞다. */
function decBringFormZeroTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_BRING_PURE);
  const a = fromCents(c.a);
  const q = fromCents(c.q);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`${a}\\div${c.b}=${q}`)} 를 계산할 때 나누어떨어지지 않으면 소수점 아래에 ${num(0)}을 내려 계속 나눈다.`,
    "예",
    `소수점 아래에서 나누어떨어지지 않으면 ${num(0)}을 내려 계산을 계속합니다.`,
  );
}

/** 문형 08 — 두 몫의 합. */
function decBringFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC_BRING_PURE);
  const y = pick(rng, DEC_BRING_PURE);
  return make(
    unit,
    `다음 두 나눗셈의 몫의 합을 구하시오. 둘 다 소수점 아래 ${num(0)}을 내려 계산합니다.\n\n${expr(`${fromCents(x.a)}\\div${x.b}`)}, ${expr(`${fromCents(y.a)}\\div${y.b}`)}`,
    expr(fromCents(x.q + y.q)),
    `몫은 ${num(fromCents(x.q))} 와 ${num(fromCents(y.q))} 입니다. ` +
      `합은 ${expr(`${fromCents(x.q)}+${fromCents(y.q)}=${fromCents(x.q + y.q)}`)} 입니다.`,
  );
}

/** 문형 09 — 하루에 가는 거리를 구한 뒤 이틀치. 02 는 하루만. */
function decBringFormTwoDays(unit: UnitSeed, rng: Rng): ElemProblem {
  const how = pick(rng, ["자전거로", "걸어서"] as const);
  const c = pick(
    rng,
    DEC_BRING_PURE.filter((x) => x.a <= 3000),
  );
  return make(
    unit,
    `${how} ${unitNum(fromCents(c.a), "km")}를 ${num(c.b)}일 동안 매일 같은 거리씩 가려고 합니다. ` +
      `${num(2)}일 동안 가는 거리는 몇 km입니까?`,
    expr(fromCents(c.q * 2)),
    `하루에 가는 거리는 ${expr(`${fromCents(c.a)}\\div${c.b}=${fromCents(c.q)}`)} km입니다. ` +
      `${num(2)}일 동안은 ${expr(`${fromCents(c.q)}\\times2=${fromCents(c.q * 2)}`)} km입니다.`,
  );
}

/** 문형 10 — 두 몫의 차. */
function decBringFormDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC_BRING_PURE);
  let y = pick(rng, DEC_BRING_PURE);
  for (let t = 0; t < 20 && y.q === x.q; t += 1) y = pick(rng, DEC_BRING_PURE);
  const hi = x.q >= y.q ? x : y;
  const lo = x.q >= y.q ? y : x;
  return make(
    unit,
    `다음 두 나눗셈의 몫의 차를 구하시오. 둘 다 소수점 아래 ${num(0)}을 내려 계산합니다.\n\n${expr(`${fromCents(x.a)}\\div${x.b}`)}, ${expr(`${fromCents(y.a)}\\div${y.b}`)}`,
    expr(fromCents(hi.q - lo.q)),
    `몫은 ${num(fromCents(x.q))} 와 ${num(fromCents(y.q))} 입니다. ` +
      `차는 ${expr(`${fromCents(hi.q)}-${fromCents(lo.q)}=${fromCents(hi.q - lo.q)}`)} 입니다.`,
  );
}

/** 문형 05 — 소수 첫째 자리에 0이 있는 나눗셈의 나누는 수. */
function decZeroFormDivisor(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_DIV.zeroTenth);
  return make(
    unit,
    `몫의 소수 첫째 자리에 ${num(0)}이 있는 다음 나눗셈에서 나누는 수는 얼마입니까?\n\n${expr(`${fromCents(c.a)}\\div${c.b}`)}`,
    num(c.b),
    `나누는 수는 ${num(c.b)}입니다.`,
  );
}

/** 문형 06 — 몫의 소수 첫째 자리 숫자는 0. */
function decZeroFormTenthZero(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_DIV.zeroTenth);
  const q = fromCents(c.q);
  return make(
    unit,
    `다음 나눗셈의 몫에서 소수점 아래 첫째 자리 숫자는 얼마입니까?\n\n${expr(`${fromCents(c.a)}\\div${c.b}=${q}`)}`,
    num(0),
    `몫 ${num(q)}의 소수점 아래 첫째 자리 숫자는 ${num(0)}입니다.`,
  );
}

/** 문형 07 — 나눌 수 없는 자리에 0을 쓴다. 맞다. */
function decZeroFormPlaceTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DEC_DIV.zeroTenth);
  const q = fromCents(c.q);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`${fromCents(c.a)}\\div${c.b}=${q}`)} 에서 나누어야 할 수가 나누는 수보다 작은 자리의 몫에는 ${num(0)}을 쓴다.`,
    "예",
    `나누어야 할 수가 더 작은 자리에는 몫에 ${num(0)}을 씁니다.`,
  );
}

/** 문형 08 — 두 몫의 합. */
function decZeroFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC_DIV.zeroTenth);
  const y = pick(rng, DEC_DIV.zeroTenth);
  return make(
    unit,
    `다음 두 나눗셈의 몫의 합을 구하시오. 두 몫의 소수 첫째 자리는 ${num(0)}입니다.\n\n${expr(`${fromCents(x.a)}\\div${x.b}`)}, ${expr(`${fromCents(y.a)}\\div${y.b}`)}`,
    expr(fromCents(x.q + y.q)),
    `몫은 ${num(fromCents(x.q))} 와 ${num(fromCents(y.q))} 입니다. ` +
      `합은 ${expr(`${fromCents(x.q)}+${fromCents(y.q)}=${fromCents(x.q + y.q)}`)} 입니다.`,
  );
}

/** 문형 09 — 상자 하나 길이 × 상자 수 검산. 02 는 한 상자만. */
function decZeroFormCheck(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, TIE_STUFF);
  const c = pick(
    rng,
    DEC_DIV.zeroTenth.filter((x) => x.a <= 3000),
  );
  return make(
    unit,
    `${thing} ${unitNum(fromCents(c.a), "m")}를 모두 사용하여 크기가 같은 선물 상자 ${num(c.b)}개를 묶었습니다. ` +
      `상자 ${num(2)}개를 묶는 데 쓴 ${thing}의 길이는 몇 m입니까?`,
    expr(fromCents(c.q * 2)),
    `한 상자에 쓴 길이는 ${expr(`${fromCents(c.a)}\\div${c.b}=${fromCents(c.q)}`)} m이므로 ` +
      `상자 ${num(2)}개에는 ${expr(`${fromCents(c.q)}\\times2=${fromCents(c.q * 2)}`)} m입니다.`,
  );
}

/** 문형 10 — 두 몫의 차. */
function decZeroFormDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC_DIV.zeroTenth);
  let y = pick(rng, DEC_DIV.zeroTenth);
  for (let t = 0; t < 20 && y.q === x.q; t += 1)
    y = pick(rng, DEC_DIV.zeroTenth);
  const hi = x.q >= y.q ? x : y;
  const lo = x.q >= y.q ? y : x;
  return make(
    unit,
    `다음 두 나눗셈의 몫의 차를 구하시오. 두 몫의 소수 첫째 자리는 ${num(0)}입니다.\n\n${expr(`${fromCents(x.a)}\\div${x.b}`)}, ${expr(`${fromCents(y.a)}\\div${y.b}`)}`,
    expr(fromCents(hi.q - lo.q)),
    `몫은 ${num(fromCents(x.q))} 와 ${num(fromCents(y.q))} 입니다. ` +
      `차는 ${expr(`${fromCents(hi.q)}-${fromCents(lo.q)}=${fromCents(hi.q - lo.q)}`)} 입니다.`,
  );
}

/** 문형 05 — (자연수)÷(자연수)의 나누는 수. */
function natDecFormDivisor(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, NAT_DEC);
  return make(
    unit,
    `다음 나눗셈에서 나누는 수는 얼마입니까? 몫은 소수로 나타냅니다.\n\n${expr(`${c.n}\\div${c.b}`)}`,
    num(c.b),
    `나누는 수는 ${num(c.b)}입니다.`,
  );
}

/** 문형 06 — 나누어지는 수는 자연수. */
function natDecFormNaturalTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, NAT_DEC);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`${c.n}\\div${c.b}`)} 에서 나누어지는 수는 자연수이다.`,
    "예",
    `나누어지는 수 ${num(c.n)}${numJosa(c.n, "은", "는")} 자연수입니다. 몫만 소수입니다.`,
  );
}

/** 문형 07 — 몫은 자연수가 아니다. */
function natDecFormQuotientNatTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, NAT_DEC);
  const q = fromCents(c.q);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`${c.n}\\div${c.b}=${q}`)} 의 몫은 자연수이다.`,
    "아니요",
    `몫 ${num(q)}${centsJosa(c.q, "은", "는")} 소수입니다. 나누어떨어지지 않습니다.`,
  );
}

/** 문형 08 — 두 몫의 합. */
function natDecFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, NAT_DEC);
  const y = pick(rng, NAT_DEC);
  return make(
    unit,
    `다음 두 나눗셈의 몫의 합을 소수로 나타내시오.\n\n${expr(`${x.n}\\div${x.b}`)}, ${expr(`${y.n}\\div${y.b}`)}`,
    expr(fromCents(x.q + y.q)),
    `몫은 ${num(fromCents(x.q))} 와 ${num(fromCents(y.q))} 입니다. ` +
      `합은 ${expr(`${fromCents(x.q)}+${fromCents(y.q)}=${fromCents(x.q + y.q)}`)} 입니다.`,
  );
}

/** 문형 09 — 한 사람 몫의 두 배. 02 는 한 사람만. */
function natDecFormDoubleShare(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, SHARE_STUFF);
  const c = pick(
    rng,
    NAT_DEC.filter((x) => x.n <= 20 && x.n > x.b),
  );
  return make(
    unit,
    `${s.thing} ${unitNum(c.n, s.unit)}${s.unitJosa} ${num(c.b)}명이 똑같이 ${s.verb} 합니다. ` +
      `두 사람이 갖는 ${s.thing}의 합은 몇 ${s.unit}인지 소수로 나타내시오.`,
    expr(fromCents(c.q * 2)),
    `한 사람은 ${expr(`${c.n}\\div${c.b}=${fromCents(c.q)}`)} ${s.unit}입니다. ` +
      `두 사람은 ${expr(`${fromCents(c.q)}\\times2=${fromCents(c.q * 2)}`)} ${s.unit}입니다.`,
  );
}

/** 문형 10 — 두 몫의 차. */
function natDecFormDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, NAT_DEC);
  let y = pick(rng, NAT_DEC);
  for (let t = 0; t < 20 && y.q === x.q; t += 1) y = pick(rng, NAT_DEC);
  const hi = x.q >= y.q ? x : y;
  const lo = x.q >= y.q ? y : x;
  return make(
    unit,
    `다음 두 나눗셈의 몫의 차를 소수로 나타내시오.\n\n${expr(`${x.n}\\div${x.b}`)}, ${expr(`${y.n}\\div${y.b}`)}`,
    expr(fromCents(hi.q - lo.q)),
    `몫은 ${num(fromCents(x.q))} 와 ${num(fromCents(y.q))} 입니다. ` +
      `차는 ${expr(`${fromCents(hi.q)}-${fromCents(lo.q)}=${fromCents(hi.q - lo.q)}`)} 입니다.`,
  );
}

function cmpPair(rng: Rng): { b: number; k: number; big: number } {
  const b = intBetween(rng, 2, 9);
  const k = intBetween(rng, 2, 9);
  return { b, k, big: b * k };
}

/** 1-4-1 05 — 몇 배가 아니라 **작은 수**(역산). */
function cmpFormSmall(unit: UnitSeed, rng: Rng): ElemProblem {
  const { b, k, big } = cmpPair(rng);
  return make(
    unit,
    `${num(big)}${numJosa(big, "은", "는")} 어떤 수의 ${num(k)}배입니다. 어떤 수는 얼마입니까?`,
    num(b),
    `${expr(`${big}\\div${k}=${b}`)} 이므로 어떤 수는 ${num(b)}입니다.`,
  );
}

/** 1-4-1 06 — 두 수의 **곱**. */
function cmpFormProduct(unit: UnitSeed, rng: Rng): ElemProblem {
  const { b, k, big } = cmpPair(rng);
  return make(
    unit,
    `${num(b)}의 ${num(k)}배는 얼마입니까?`,
    num(big),
    `${expr(`${b}\\times${k}=${big}`)} 입니다.`,
  );
}

/** 1-4-1 07 — 작은 수가 큰 수의 몇 배라는 말은 **틀렸다**. */
function cmpFormReverseTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const { b, k, big } = cmpPair(rng);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${num(b)}${numJosa(b, "은", "는")} ${num(big)}의 ${num(k)}배이다.`,
    "아니요",
    `큰 수를 작은 수로 나눕니다. ${expr(`${big}\\div${b}=${k}`)} 이므로 ${num(big)}이 ${num(b)}의 ${num(k)}배입니다.`,
  );
}

/** 1-4-1 08 — 두 번 몇 배를 겹친 배수. */
function cmpFormChain(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 5);
  const m = intBetween(rng, 2, 5);
  const c = intBetween(rng, 2, 6);
  return make(
    unit,
    `가 수는 나 수의 ${num(k)}배이고, 나 수는 다 수의 ${num(m)}배입니다. 다 수가 ${num(c)}일 때 가 수는 얼마입니까?`,
    num(c * m * k),
    `나 수는 ${expr(`${c}\\times${m}=${c * m}`)} 이고, 가 수는 ${expr(`${c * m}\\times${k}=${c * m * k}`)} 입니다.`,
  );
}

/** 1-4-1 09 — 합과 배수에서 **큰 수**. 04 심화는 작은 쪽을 묻는다. */
function cmpFormLargerFromSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 3, 9);
  const k = intBetween(rng, 2, 6);
  const total = b * (k + 1);
  return make(
    unit,
    `두 수의 합이 ${num(total)}이고 큰 수는 작은 수의 ${num(k)}배입니다. 큰 수는 얼마입니까?`,
    num(b * k),
    `작은 수를 ${expr("\\square")} 라 하면 합은 ${expr(`\\square\\times${k + 1}=${total}`)} 이므로 ` +
      `작은 수는 ${expr(`${total}\\div${k + 1}=${b}`)}, 큰 수는 ${expr(`${b}\\times${k}=${b * k}`)} 입니다.`,
  );
}

/** 1-4-1 10 — 두 비교의 몇 배를 **더한다**. */
function cmpFormTwoKSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const k1 = intBetween(rng, 2, 6);
  const k2 = intBetween(rng, 2, 6);
  const b1 = intBetween(rng, 2, 8);
  const b2 = intBetween(rng, 2, 8);
  return make(
    unit,
    `${num(b1 * k1)}는 ${num(b1)}의 몇 배이고, ${num(b2 * k2)}는 ${num(b2)}의 몇 배입니까? 그 두 배수를 더하시오.`,
    num(k1 + k2),
    `${expr(`${b1 * k1}\\div${b1}=${k1}`)}, ${expr(`${b2 * k2}\\div${b2}=${k2}`)} 이므로 합은 ${expr(`${k1}+${k2}=${k1 + k2}`)} 입니다.`,
  );
}

function biPair(rng: Rng): { a: number; b: number } {
  const a = intBetween(rng, 2, 9);
  let b = intBetween(rng, 2, 9);
  for (let t = 0; t < 20 && b === a; t += 1) b = intBetween(rng, 2, 9);
  if (b === a) b = a === 9 ? 8 : a + 1;
  return { a, b };
}

/** 1-4-2 05 — **역비**. 02 는 차례 그대로. */
function biFormInverse(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = biPair(rng);
  const p = pick(rng, BI_PAIRS);
  return make(
    unit,
    `${p.x} ${num(a)}${p.c}${josa(p.c, "과", "와")} ${p.y} ${num(b)}${p.c}${josa(p.c, "이", "가")} 있습니다. ` +
      `${p.y} 수에 대한 ${p.x} 수의 비를 쓰시오.`,
    expr(`${a}:${b}`),
    `「에 대한」 앞이 비교하는 양, 뒤가 기준량이므로 ${expr(`${a}:${b}`)} 입니다.`,
  );
}

/** 1-4-2 06 — 비의 **앞항**. */
function biFormFront(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = biPair(rng);
  return make(
    unit,
    `비 ${expr(`${a}:${b}`)} 에서 비교하는 양(앞항)은 얼마입니까?`,
    num(a),
    `비는 (비교하는 양):(기준량)이므로 앞항은 ${num(a)}입니다.`,
  );
}

/** 1-4-2 07 — 비의 **뒷항**. */
function biFormBack(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = biPair(rng);
  return make(
    unit,
    `비 ${expr(`${a}:${b}`)} 에서 기준량(뒷항)은 얼마입니까?`,
    num(b),
    `비는 (비교하는 양):(기준량)이므로 뒷항은 ${num(b)}입니다.`,
  );
}

/** 1-4-2 08 — 두 항의 합. */
function biFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = biPair(rng);
  return make(
    unit,
    `비 ${expr(`${a}:${b}`)} 의 두 항의 합은 얼마입니까?`,
    num(a + b),
    `${expr(`${a}+${b}=${a + b}`)} 입니다.`,
  );
}

/** 1-4-2 09 — 두 항의 차. */
function biFormDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = biPair(rng);
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return make(
    unit,
    `비 ${expr(`${a}:${b}`)} 의 두 항의 차는 얼마입니까?`,
    num(hi - lo),
    `${expr(`${hi}-${lo}=${hi - lo}`)} 입니다.`,
  );
}

/** 1-4-2 10 — 전체에 대한 **둘째** 무리의 비. 03 은 첫째 무리. */
function biFormWholeSecond(unit: UnitSeed, rng: Rng): ElemProblem {
  const p = pick(rng, BI_PAIRS);
  const a = intBetween(rng, 2, 9);
  const b = intBetween(rng, 2, 9);
  return make(
    unit,
    `${p.x} ${num(a)}${p.c}${josa(p.c, "과", "와")} ${p.y} ${num(b)}${p.c}${josa(p.c, "이", "가")} 있습니다. ` +
      `전체 ${p.whole} 수에 대한 ${p.y} 수의 비를 쓰시오.`,
    expr(`${b}:${a + b}`),
    `전체는 ${expr(`${a}+${b}=${a + b}`)} 입니다. ${expr(`${b}:${a + b}`)} 입니다.`,
  );
}

/** 1-4-3 05 — 비를 **분수** 비율로. 01 은 소수. */
function rateFormFrac(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 3, 9);
  const a = coprimeTop(rng, b);
  return make(
    unit,
    `비 ${expr(`${a}:${b}`)} 의 비율을 분수로 나타내시오.`,
    expr(`\\frac{${a}}{${b}}`),
    `(비율)=(비교하는 양)÷(기준량)이므로 ${expr(`\\frac{${a}}{${b}}`)} 입니다.`,
  );
}

/** 1-4-3 06 — 기준량. */
function rateFormBase(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 3, 9);
  const a = coprimeTop(rng, b);
  return make(
    unit,
    `비 ${expr(`${a}:${b}`)} 에서 기준량은 얼마입니까?`,
    num(b),
    `비의 뒷항이 기준량이므로 ${num(b)}입니다.`,
  );
}

/** 1-4-3 07 — 비교하는 양. */
function rateFormCompare(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 3, 9);
  const a = coprimeTop(rng, b);
  return make(
    unit,
    `비 ${expr(`${a}:${b}`)} 에서 비교하는 양은 얼마입니까?`,
    num(a),
    `비의 앞항이 비교하는 양이므로 ${num(a)}입니다.`,
  );
}

/** 1-4-3 08 — 비율×기준량 = 비교하는 양. */
function rateFormTimes(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = pick(rng, [2, 4, 5] as const);
  const m = intBetween(rng, 2, 6);
  const a = coprimeTop(rng, b);
  return make(
    unit,
    `비율이 ${expr(`\\frac{${a}}{${b}}`)} 이고 기준량이 ${num(b * m)}일 때 비교하는 양은 얼마입니까?`,
    num(a * m),
    `${expr(`${b * m}\\times\\frac{${a}}{${b}}=${a * m}`)} 입니다.`,
  );
}

/** 1-4-3 09 — 나머지 부분의 비율. */
function rateFormRest(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 6, 12);
  const a = intBetween(rng, 1, r - 1);
  return make(
    unit,
    `바구니에 구슬이 ${num(r)}개 있고 그중 빨간 구슬이 ${num(a)}개입니다. ` +
      `전체 구슬 수에 대한 빨간 구슬 수의 비율을 분수로 나타내시오.`,
    expr(fmtFrac(a, r)),
    `비율은 ${expr(`\\frac{${a}}{${r}}=${fmtFrac(a, r)}`)} 입니다.`,
  );
}

/** 1-4-3 10 — 두 비율 중 **큰** 쪽을 분수로. */
function rateFormLarger(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 4, 9);
  const a = coprimeTop(rng, b);
  let d = intBetween(rng, 4, 9);
  let c = coprimeTop(rng, d);
  for (let t = 0; t < 16 && a * d === c * b; t += 1) {
    d = intBetween(rng, 4, 9);
    c = coprimeTop(rng, d);
  }
  const left = a * d > c * b;
  const win = left ? [a, b] : [c, d];
  return make(
    unit,
    `두 비율 ${expr(`\\frac{${a}}{${b}}`)} 와 ${expr(`\\frac{${c}}{${d}}`)} 중 더 큰 것을 기약분수로 쓰시오.`,
    expr(fmtFrac(win[0]!, win[1]!)),
    `더 큰 비율은 ${expr(fmtFrac(win[0]!, win[1]!))} 입니다.`,
  );
}

/** 1-4-4 05 — 빠르기와 거리에서 **시간**. */
function rateUseFormTime(unit: UnitSeed, rng: Rng): ElemProblem {
  const rate = pick(rng, SPEED_RATES);
  const h = intBetween(rng, 2, 4);
  return make(
    unit,
    `한 시간에 ${unitNum(rate, "km")}를 가는 기차가 ${unitNum(rate * h, "km")}를 가려면 몇 시간이 걸립니까?`,
    num(h),
    `${expr(`${rate * h}\\div${rate}=${h}`)} 이므로 ${num(h)}시간입니다.`,
  );
}

/** 1-4-4 06 — 기준량은 걸린 시간. */
function rateUseFormBaseTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const v = pick(rng, VEHICLES);
  const rate = pick(rng, SPEED_RATES);
  const h = intBetween(rng, 2, 4);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${v}${josa(v, "이", "가")} ${num(h)}시간 동안 ${unitNum(rate * h, "km")}를 갔을 때, ` +
      `걸린 시간에 대한 간 거리의 비율에서 기준량은 걸린 시간이다.`,
    "예",
    `「에 대한」 앞에 있는 걸린 시간이 기준량입니다.`,
  );
}

/** 1-4-4 07 — 인구밀도에서 **넓이**. */
function rateUseFormArea(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 8);
  const per = pick(rng, [120, 150, 200, 250] as const);
  return make(
    unit,
    `인구가 ${num(a * per)}명이고 넓이에 대한 인구의 비율이 ${num(per)}일 때, 이 마을의 넓이는 몇 km²입니까?`,
    num(a),
    `${expr(`${a * per}\\div${per}=${a}`)} 이므로 ${num(a)} km²입니다.`,
  );
}

/** 1-4-4 08 — 소금물에 대한 **물**의 비율. 03 은 소금. */
function rateUseFormWater(unit: UnitSeed, rng: Rng): ElemProblem {
  const total = pick(rng, [200, 250, 400, 500] as const);
  const salt = pick(
    rng,
    ([20, 30, 40, 50] as const).filter((s) => s < total),
  );
  const water = total - salt;
  return make(
    unit,
    `물 ${num(water)} g에 소금 ${num(salt)} g을 모두 녹여 소금물을 만들었습니다. ` +
      `소금물 양에 대한 물 양의 비율을 분수로 나타내시오.`,
    expr(fmtFrac(water, total)),
    `소금물은 ${expr(`${water}+${salt}=${total}`)} 입니다. 비율은 ${expr(`\\frac{${water}}{${total}}=${fmtFrac(water, total)}`)} 입니다.`,
  );
}

/** 1-4-4 09 — 같은 빠르기로 두 번 간 거리의 **합**. */
function rateUseFormTwoLegs(unit: UnitSeed, rng: Rng): ElemProblem {
  const v = pick(rng, VEHICLES);
  const rate = pick(rng, SPEED_RATES);
  const h1 = intBetween(rng, 2, 4);
  const h2 = intBetween(rng, 2, 4);
  return make(
    unit,
    `${v}${josa(v, "이", "가")} 한 시간에 ${unitNum(rate, "km")}를 갑니다. ` +
      `${num(h1)}시간 가고, 이어서 ${num(h2)}시간 더 가면 간 거리는 모두 몇 km입니까?`,
    num(rate * (h1 + h2)),
    `${expr(`${rate}\\times${h1}=${rate * h1}`)}, ${expr(`${rate}\\times${h2}=${rate * h2}`)} 이므로 ` +
      `합은 ${expr(`${rate * h1}+${rate * h2}=${rate * (h1 + h2)}`)} 입니다.`,
  );
}

/** 1-4-4 10 — 두 빠르기의 **차**. */
function rateUseFormSpeedDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const r1 = pick(rng, SPEED_RATES);
  let r2 = pick(rng, SPEED_RATES);
  for (let t = 0; t < 8 && r2 === r1; t += 1) r2 = pick(rng, SPEED_RATES);
  if (r2 === r1) r2 = r1 === 90 ? 60 : 90;
  const h = intBetween(rng, 2, 3);
  return make(
    unit,
    `한 기차는 ${num(h)}시간에 ${unitNum(r1 * h, "km")}, 다른 기차는 ${num(h)}시간에 ${unitNum(r2 * h, "km")}를 갔습니다. ` +
      `두 기차의 빠르기의 차는 얼마입니까?`,
    num(Math.abs(r1 - r2)),
    `빠르기는 ${num(r1)} 와 ${num(r2)} 이므로 차는 ${expr(`${Math.max(r1, r2)}-${Math.min(r1, r2)}=${Math.abs(r1 - r2)}`)} 입니다.`,
  );
}

/** 1-4-5 05 — 분수를 백분율로. 01 은 소수 비율. */
function pctFormFromFrac(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, PCT_DENOMS);
  const top = coprimeTop(rng, den);
  const pct = (top * 100) / den;
  return make(
    unit,
    `비율 ${expr(`\\frac{${top}}{${den}}`)} 를 백분율로 나타내시오.`,
    num(pct),
    `${expr(`\\frac{${top}}{${den}}\\times100=${pct}`)} 이므로 ${expr(`${pct}\\%`)} 입니다.`,
  );
}

/** 1-4-5 06 — 백분율을 기약분수로. */
function pctFormToFrac(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, PCT_DENOMS);
  const top = coprimeTop(rng, den);
  const pct = (top * 100) / den;
  return make(
    unit,
    `${expr(`${pct}\\%`)} 를 기약분수로 나타내시오.`,
    expr(fmtFrac(top, den)),
    `${expr(`\\frac{${pct}}{100}=${fmtFrac(top, den)}`)} 입니다.`,
  );
}

/** 1-4-5 07 — 백분율을 소수로. */
function pctFormToDec(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = intBetween(rng, 1, 99);
  return make(
    unit,
    `${expr(`${c}\\%`)} 를 소수로 나타내시오.`,
    expr(fromCents(c)),
    `${expr(`\\frac{${c}}{100}=${fromCents(c)}`)} 입니다.`,
  );
}

/** 1-4-5 08 — 두 백분율의 합. */
function pctFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const p = intBetween(rng, 10, 40);
  const q = intBetween(rng, 10, 40);
  return make(
    unit,
    `${expr(`${p}\\%`)} 와 ${expr(`${q}\\%`)} 의 합은 몇 %입니까?`,
    num(p + q),
    `${expr(`${p}+${q}=${p + q}`)} 이므로 ${expr(`${p + q}\\%`)} 입니다.`,
  );
}

/** 1-4-5 09 — 전체에 대한 나머지 %. */
function pctFormRest(unit: UnitSeed, rng: Rng): ElemProblem {
  const p = pick(rng, [10, 20, 25, 30, 40, 50] as const);
  return make(
    unit,
    `어떤 양의 ${expr(`${p}\\%`)} 를 사용했습니다. 남은 양은 전체의 몇 %입니까?`,
    num(100 - p),
    `${expr(`100-${p}=${100 - p}`)} 이므로 ${expr(`${100 - p}\\%`)} 입니다.`,
  );
}

/** 1-4-5 10 — 두 백분율 중 큰 것. */
function pctFormLarger(unit: UnitSeed, rng: Rng): ElemProblem {
  const p = pick(rng, [20, 25, 40, 50] as const);
  const q = pick(
    rng,
    ([20, 25, 40, 50, 60] as const).filter((v) => v !== p),
  );
  return make(
    unit,
    `${expr(`${p}\\%`)} 와 ${expr(`${q}\\%`)} 중 더 큰 것은 몇 %입니까?`,
    num(Math.max(p, q)),
    `더 큰 것은 ${expr(`${Math.max(p, q)}\\%`)} 입니다.`,
  );
}

/** 1-4-6 05 — 정가와 할인가에서 **할인율**. */
function pctUseFormRate(unit: UnitSeed, rng: Rng): ElemProblem {
  const p = pick(rng, MONEY);
  const r = pick(rng, [10, 20, 25, 40] as const);
  const paid = p - (p * r) / 100;
  return make(
    unit,
    `정가 ${num(p)}원짜리 물건을 ${num(paid)}원에 샀습니다. 할인율은 몇 %입니까?`,
    num(r),
    `할인 금액은 ${expr(`${p}-${paid}=${(p * r) / 100}`)} 원입니다. ` +
      `${expr(`\\frac{${(p * r) / 100}}{${p}}\\times100=${r}`)} 이므로 ${expr(`${r}\\%`)} 입니다.`,
  );
}

/** 1-4-6 06 — 할인 **금액**. */
function pctUseFormCut(unit: UnitSeed, rng: Rng): ElemProblem {
  const p = pick(rng, MONEY);
  const r = pick(rng, [10, 20, 25, 30] as const);
  const cut = (p * r) / 100;
  return make(
    unit,
    `정가가 ${num(p)}원인 물건을 ${expr(`${r}\\%`)} 할인합니다. 할인 금액은 얼마입니까?`,
    num(cut),
    `${expr(`${p}\\times\\frac{${r}}{100}=${cut}`)} 이므로 ${num(cut)}원입니다.`,
  );
}

/** 1-4-6 07 — **이자** 금액. 01 은 이자율. */
function pctUseFormInterest(unit: UnitSeed, rng: Rng): ElemProblem {
  const pr = pick(rng, [10000, 20000, 50000] as const);
  const r = pick(rng, [4, 5, 6, 8, 10] as const);
  return make(
    unit,
    `예금한 돈 ${num(pr)}원에 대한 이자율이 ${expr(`${r}\\%`)} 일 때, 이자는 얼마입니까?`,
    num((pr * r) / 100),
    `${expr(`${pr}\\times\\frac{${r}}{100}=${(pr * r) / 100}`)} 이므로 ${num((pr * r) / 100)}원입니다.`,
  );
}

/** 1-4-6 08 — 원금과 이자의 **합**. */
function pctUseFormPrincipalPlus(unit: UnitSeed, rng: Rng): ElemProblem {
  const pr = pick(rng, [10000, 20000, 50000] as const);
  const r = pick(rng, [4, 5, 10] as const);
  const interest = (pr * r) / 100;
  return make(
    unit,
    `예금한 돈 ${num(pr)}원에 이자율 ${expr(`${r}\\%`)} 로 이자를 받았습니다. 원금과 이자의 합은 얼마입니까?`,
    num(pr + interest),
    `이자는 ${expr(`${pr}\\times\\frac{${r}}{100}=${interest}`)} 원이므로 합은 ${expr(`${pr}+${interest}=${pr + interest}`)} 원입니다.`,
  );
}

/** 1-4-6 09 — 반대 의견 비율. */
function pctUseFormNo(unit: UnitSeed, rng: Rng): ElemProblem {
  const rate = pick(rng, [40, 50, 60, 80] as const);
  const total = pick(rng, [200, 250, 400] as const);
  const yes = (total * rate) / 100;
  return make(
    unit,
    `투표한 학생 ${num(total)}명 중 ${num(yes)}명이 찬성했습니다. 찬성하지 않은 학생의 비율은 몇 %입니까?`,
    num(100 - rate),
    `찬성률은 ${expr(`\\frac{${yes}}{${total}}\\times100=${rate}`)} 이므로 ` +
      `찬성하지 않은 비율은 ${expr(`100-${rate}=${100 - rate}`)} 입니다.`,
  );
}

/** 1-4-6 10 — 두 할인가의 차. */
function pctUseFormPaidDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const p = pick(rng, MONEY);
  const r1 = pick(rng, [10, 20] as const);
  const r2 = pick(rng, [25, 40] as const);
  const paid1 = p - (p * r1) / 100;
  const paid2 = p - (p * r2) / 100;
  return make(
    unit,
    `정가 ${num(p)}원짜리 물건을 ${expr(`${r1}\\%`)} 할인할 때와 ${expr(`${r2}\\%`)} 할인할 때, 지불 금액의 차는 얼마입니까?`,
    num(Math.abs(paid1 - paid2)),
    `지불액은 ${num(paid1)}원과 ${num(paid2)}원이므로 차는 ${num(Math.abs(paid1 - paid2))}원입니다.`,
  );
}

function stripFig(items: { label: string; pct: number }[]) {
  return fig("stripChart", { segments: items });
}
function pieFig(items: { label: string; pct: number }[]) {
  return fig("pieChart", { slices: items });
}

/** 1-5-1 05 — 항목 수. */
function stripReadFormCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const { subject, items } = chartData(rng);
  return make(
    unit,
    `학생들이 ${subject}을 조사하여 나타낸 띠그래프입니다. 항목은 모두 몇 개입니까?`,
    num(items.length),
    `띠그래프에 나타난 부분은 ${num(items.length)}개입니다.`,
    stripFig(items),
  );
}

/** 1-5-1 06 — 가장 적은 항목. 02 는 가장 많은 항목. */
function stripReadFormLeast(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const low = d.items.reduce((a, b) => (a.pct < b.pct ? a : b));
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 띠그래프입니다. 가장 적은 학생이 고른 항목을 쓰시오.`,
    low.label,
    `가장 좁은 부분은 비율 ${expr(`${low.pct}\\%`)} 인 ${low.label}입니다.`,
    stripFig(d.items),
  );
}

/** 1-5-1 07 — 모든 비율의 합은 100. */
function stripReadFormAll100(unit: UnitSeed, rng: Rng): ElemProblem {
  const { subject, items } = chartData(rng);
  return make(
    unit,
    `학생들이 ${subject}을 조사하여 나타낸 띠그래프입니다. 모든 항목의 비율을 더하면 몇 %입니까?`,
    num(100),
    `띠그래프 전체는 ${expr(`100\\%`)} 입니다.`,
    stripFig(items),
  );
}

/** 1-5-1 08 — 두 항목 비율의 합. */
function stripReadFormTwoSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const [a, b] = twoLabels(rng, d.items);
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 띠그래프입니다. ${a.label}${josa(a.label, "과", "와")} ${b.label}의 비율의 합은 몇 %입니까?`,
    num(a.pct + b.pct),
    `${expr(`${a.pct}+${b.pct}=${a.pct + b.pct}`)} 이므로 ${expr(`${a.pct + b.pct}\\%`)} 입니다.`,
    stripFig(d.items),
  );
}

/** 1-5-1 09 — 가장 큰 비율(숫자). 02 는 항목 이름. */
function stripReadFormMaxPct(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const top = d.items.reduce((a, b) => (a.pct > b.pct ? a : b));
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 띠그래프입니다. 가장 높은 비율은 몇 %입니까?`,
    num(top.pct),
    `${top.label}의 비율이 ${expr(`${top.pct}\\%`)} 로 가장 높습니다.`,
    stripFig(d.items),
  );
}

/** 1-5-1 10 — 한 항목을 뺀 나머지 비율. */
function stripReadFormRest(unit: UnitSeed, rng: Rng): ElemProblem {
  const { subject, items } = chartData(rng);
  const one = items[intBetween(rng, 0, items.length - 1)]!;
  return make(
    unit,
    `학생들이 ${subject}을 조사하여 나타낸 띠그래프입니다. ${one.label}${josa(one.label, "을", "를")} 고르지 않은 학생의 비율은 몇 %입니까?`,
    num(100 - one.pct),
    `${expr(`100-${one.pct}=${100 - one.pct}`)} 이므로 ${expr(`${100 - one.pct}\\%`)} 입니다.`,
    stripFig(items),
  );
}

/** 1-5-2 05 — 나머지 비율. */
function stripDrawFormRest(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const item = pick(rng, theme.items);
  const p = pick(rng, DRAW_PCTS);
  return make(
    unit,
    `학생들이 ${theme.subject} 조사에서 ${item}의 비율이 ${expr(`${p}\\%`)} 입니다. ` +
      `띠그래프로 나타낼 때 ${item}${josa(item, "이", "가")} 아닌 나머지 항목의 비율의 합은 몇 %입니까?`,
    num(100 - p),
    `${expr(`100-${p}=${100 - p}`)} 이므로 ${expr(`${100 - p}\\%`)} 입니다.`,
  );
}

/** 1-5-2 06 — 두 명수의 합. */
function stripDrawFormTwoCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const [a, b] = theme.items;
  const total = pick(rng, CHART_TOTALS);
  const pa = pick(rng, DRAW_PCTS);
  const pb = pick(
    rng,
    DRAW_PCTS.filter((v) => v + pa <= 80),
  );
  return make(
    unit,
    `학생 ${num(total)}명의 ${theme.subject} 조사에서 ${a}${josa(a!, "은", "는")} ${expr(`${pa}\\%`)}, ${b}${josa(b!, "은", "는")} ${expr(`${pb}\\%`)} 입니다. ` +
      `두 항목을 고른 학생은 모두 몇 명입니까?`,
    num((total * (pa + pb)) / 100),
    `${expr(`${total}\\times\\frac{${pa + pb}}{100}=${(total * (pa + pb)) / 100}`)} 이므로 ${num((total * (pa + pb)) / 100)}명입니다.`,
  );
}

/** 1-5-2 07 — 전체 띠 길이에서 한 항목 길이를 뺀 나머지. */
function stripDrawFormLenRest(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const item = pick(rng, theme.items);
  const p = pick(rng, DRAW_PCTS);
  const w = pick(rng, [20, 40] as const);
  const len = (w * p) / 100;
  return make(
    unit,
    `${theme.subject} 조사에서 ${item}의 비율이 ${expr(`${p}\\%`)} 입니다. ` +
      `전체 길이가 ${unitNum(w, "cm")} 인 띠그래프에서 ${item}${josa(item, "이", "가")} 아닌 부분이 차지하는 길이는 몇 cm입니까?`,
    num(w - len),
    `${item}${josa(item, "은", "는")} ${expr(`${w}\\times\\frac{${p}}{100}=${len}`)} cm이므로 나머지는 ${expr(`${w}-${len}=${w - len}`)} cm입니다.`,
  );
}

/** 1-5-2 08 — 두 비율의 차. */
function stripDrawFormPctDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const [a, b] = theme.items;
  const pa = pick(rng, DRAW_PCTS);
  const pb = pick(
    rng,
    DRAW_PCTS.filter((v) => v !== pa),
  );
  return make(
    unit,
    `띠그래프로 나타낼 ${theme.subject} 조사에서 ${a}${josa(a!, "은", "는")} ${expr(`${pa}\\%`)}, ${b}${josa(b!, "은", "는")} ${expr(`${pb}\\%`)} 입니다. ` +
      `두 비율의 차는 몇 %입니까?`,
    num(Math.abs(pa - pb)),
    `${expr(`${Math.max(pa, pb)}-${Math.min(pa, pb)}=${Math.abs(pa - pb)}`)} 이므로 ${expr(`${Math.abs(pa - pb)}\\%`)} 입니다.`,
  );
}

/** 1-5-2 09 — 비율에서 명수. */
function stripDrawFormCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const item = pick(rng, theme.items);
  const total = pick(rng, CHART_TOTALS);
  const p = pick(rng, DRAW_PCTS);
  return make(
    unit,
    `학생 ${num(total)}명의 ${theme.subject}을 띠그래프로 나타낼 때 ${item}의 비율이 ${expr(`${p}\\%`)} 입니다. ` +
      `${item}${josa(item, "을", "를")} 고른 학생은 몇 명입니까?`,
    num((total * p) / 100),
    `${expr(`${total}\\times\\frac{${p}}{100}=${(total * p) / 100}`)} 이므로 ${num((total * p) / 100)}명입니다.`,
  );
}

/** 1-5-2 10 — 두 띠 길이의 합. */
function stripDrawFormTwoLen(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const [a, b] = theme.items;
  const pa = pick(rng, DRAW_PCTS);
  const pb = pick(
    rng,
    DRAW_PCTS.filter((v) => v + pa <= 90),
  );
  const w = pick(rng, [20, 40] as const);
  return make(
    unit,
    `전체 길이 ${unitNum(w, "cm")} 인 띠그래프에서 ${a}${josa(a!, "은", "는")} ${expr(`${pa}\\%`)}, ${b}${josa(b!, "은", "는")} ${expr(`${pb}\\%`)} 입니다. ` +
      `두 항목이 차지하는 길이의 합은 몇 cm입니까?`,
    num((w * (pa + pb)) / 100),
    `${expr(`${w}\\times\\frac{${pa + pb}}{100}=${(w * (pa + pb)) / 100}`)} 입니다.`,
  );
}

/** 1-5-3 05 — 항목 수. */
function pieReadFormCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const { subject, items } = chartData(rng);
  return make(
    unit,
    `학생들이 ${subject}을 조사하여 나타낸 원그래프입니다. 항목은 모두 몇 개입니까?`,
    num(items.length),
    `원그래프에 나타난 부분은 ${num(items.length)}개입니다.`,
    pieFig(items),
  );
}

/** 1-5-3 06 — 가장 적은 항목. */
function pieReadFormLeast(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const low = d.items.reduce((a, b) => (a.pct < b.pct ? a : b));
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 원그래프입니다. 비율이 가장 낮은 항목을 쓰시오.`,
    low.label,
    `가장 좁은 부채꼴은 ${low.label}입니다.`,
    pieFig(d.items),
  );
}

/** 1-5-3 07 — 합 100. */
function pieReadFormAll100(unit: UnitSeed, rng: Rng): ElemProblem {
  const { subject, items } = chartData(rng);
  return make(
    unit,
    `학생들이 ${subject}을 조사하여 나타낸 원그래프입니다. 모든 항목의 비율을 더하면 몇 %입니까?`,
    num(100),
    `원그래프 전체는 ${expr(`100\\%`)} 입니다.`,
    pieFig(items),
  );
}

/** 1-5-3 08 — 두 항목 비율 합. 02 는 차. */
function pieReadFormTwoSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const [a, b] = twoLabels(rng, d.items);
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 원그래프입니다. ${a.label}${josa(a.label, "과", "와")} ${b.label}의 비율의 합은 몇 %입니까?`,
    num(a.pct + b.pct),
    `${expr(`${a.pct}+${b.pct}=${a.pct + b.pct}`)} 이므로 ${expr(`${a.pct + b.pct}\\%`)} 입니다.`,
    pieFig(d.items),
  );
}

/** 1-5-3 09 — 가장 큰 비율. */
function pieReadFormMaxPct(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const top = d.items.reduce((a, b) => (a.pct > b.pct ? a : b));
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 원그래프입니다. 가장 높은 비율은 몇 %입니까?`,
    num(top.pct),
    `${top.label}의 비율이 ${expr(`${top.pct}\\%`)} 로 가장 높습니다.`,
    pieFig(d.items),
  );
}

/** 1-5-3 10 — 나머지 비율. */
function pieReadFormRest(unit: UnitSeed, rng: Rng): ElemProblem {
  const { subject, items } = chartData(rng);
  const one = items[intBetween(rng, 0, items.length - 1)]!;
  return make(
    unit,
    `학생들이 ${subject}을 조사하여 나타낸 원그래프입니다. ${one.label}${josa(one.label, "이", "가")} 아닌 나머지 부분의 비율은 몇 %입니까?`,
    num(100 - one.pct),
    `${expr(`100-${one.pct}=${100 - one.pct}`)} 이므로 ${expr(`${100 - one.pct}\\%`)} 입니다.`,
    pieFig(items),
  );
}

/** 1-5-4 05 — 나머지 한 항목 비율(두 항목만 주고). */
function pieDrawFormRest(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const [a, b] = theme.items;
  const pa = pick(rng, DRAW_PCTS);
  const pb = pick(
    rng,
    DRAW_PCTS.filter((v) => v + pa <= 80),
  );
  return make(
    unit,
    `${theme.subject}을 원그래프로 나타낼 때 ${a}${josa(a!, "은", "는")} ${expr(`${pa}\\%`)}, ${b}${josa(b!, "은", "는")} ${expr(`${pb}\\%`)} 이고 나머지는 한 항목입니다. ` +
      `나머지 항목의 비율은 몇 %입니까?`,
    num(100 - pa - pb),
    `${expr(`100-${pa}-${pb}=${100 - pa - pb}`)} 이므로 ${expr(`${100 - pa - pb}\\%`)} 입니다.`,
  );
}

/** 1-5-4 06 — 중심각. 원 전체 360°. */
function pieDrawFormAngle(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const item = pick(rng, theme.items);
  const p = pick(rng, [20, 25, 50] as const);
  return make(
    unit,
    `${theme.subject}을 원그래프로 나타낼 때 ${item}의 비율이 ${expr(`${p}\\%`)} 입니다. ` +
      `${item} 부분의 중심각은 몇 도입니까?`,
    num((360 * p) / 100),
    `원 전체는 ${num(360)}°이므로 ${expr(`360\\times\\frac{${p}}{100}=${(360 * p) / 100}`)} 입니다.`,
  );
}

/** 1-5-4 07 — 두 비율의 차. */
function pieDrawFormDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const [a, b] = theme.items;
  const pa = pick(rng, DRAW_PCTS);
  const pb = pick(
    rng,
    DRAW_PCTS.filter((v) => v !== pa),
  );
  return make(
    unit,
    `원그래프로 나타낼 ${theme.subject} 조사에서 ${a}${josa(a!, "은", "는")} ${expr(`${pa}\\%`)}, ${b}${josa(b!, "은", "는")} ${expr(`${pb}\\%`)} 입니다. ` +
      `두 비율의 차는 몇 %입니까?`,
    num(Math.abs(pa - pb)),
    `${expr(`${Math.max(pa, pb)}-${Math.min(pa, pb)}=${Math.abs(pa - pb)}`)} 입니다.`,
  );
}

/** 1-5-4 08 — 비율에서 명수. */
function pieDrawFormCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const item = pick(rng, theme.items);
  const total = pick(rng, CHART_TOTALS);
  const p = pick(rng, DRAW_PCTS);
  return make(
    unit,
    `학생 ${num(total)}명의 ${theme.subject}을 원그래프로 나타낼 때 ${item}의 비율이 ${expr(`${p}\\%`)} 입니다. ` +
      `${item}${josa(item, "을", "를")} 고른 학생은 몇 명입니까?`,
    num((total * p) / 100),
    `${expr(`${total}\\times\\frac{${p}}{100}=${(total * p) / 100}`)} 입니다.`,
  );
}

/** 1-5-4 09 — 두 중심각의 합. */
function pieDrawFormTwoAngles(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const [a, b] = theme.items;
  const pa = pick(rng, [20, 25, 30] as const);
  const pb = pick(rng, [10, 20, 25] as const);
  return make(
    unit,
    `원그래프에서 ${a}의 비율이 ${expr(`${pa}\\%`)}, ${b}의 비율이 ${expr(`${pb}\\%`)} 입니다. ` +
      `두 부분의 중심각의 합은 몇 도입니까?`,
    num((360 * (pa + pb)) / 100),
    `${expr(`360\\times\\frac{${pa + pb}}{100}=${(360 * (pa + pb)) / 100}`)} 입니다.`,
  );
}

/** 1-5-4 10 — 명수 두 개의 합. */
function pieDrawFormTwoPeople(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, GRAPH_THEMES);
  const [a, b] = theme.items;
  const total = pick(rng, CHART_TOTALS);
  const pa = pick(rng, DRAW_PCTS);
  const pb = pick(
    rng,
    DRAW_PCTS.filter((v) => v + pa <= 80),
  );
  return make(
    unit,
    `학생 ${num(total)}명의 ${theme.subject}을 원그래프로 나타낼 때 ${a}${josa(a!, "은", "는")} ${expr(`${pa}\\%`)}, ${b}${josa(b!, "은", "는")} ${expr(`${pb}\\%`)} 입니다. ` +
      `두 항목을 고른 학생은 모두 몇 명입니까?`,
    num((total * (pa + pb)) / 100),
    `${expr(`${total}\\times\\frac{${pa + pb}}{100}=${(total * (pa + pb)) / 100}`)} 입니다.`,
  );
}

/** 1-5-5 05 — 가장 낮은 비율. 01 은 가장 높은 비율. */
function cmpChartFormLowPct(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const { kindName, figure } = cmpChartFig(rng, d.items);
  const low = d.items.reduce((a, b) => (a.pct < b.pct ? a : b));
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 ${kindName}입니다. 비율이 가장 낮은 항목의 비율은 몇 %입니까?`,
    num(low.pct),
    `가장 좁은 부분은 ${low.label}이고 비율은 ${expr(`${low.pct}\\%`)} 입니다.`,
    figure,
  );
}

/** 1-5-5 06 — 항목 수. */
function cmpChartFormCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartData(rng);
  const { kindName, figure } = cmpChartFig(rng, d.items);
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 ${kindName}입니다. 항목은 모두 몇 개입니까?`,
    num(d.items.length),
    `나타난 항목은 ${num(d.items.length)}개입니다.`,
    figure,
  );
}

/** 1-5-5 07 — 합 100. */
function cmpChartFormAll100(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartData(rng);
  const { kindName, figure } = cmpChartFig(rng, d.items);
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 ${kindName}입니다. 모든 항목의 비율을 더하면 몇 %입니까?`,
    num(100),
    `그래프 전체는 ${expr(`100\\%`)} 입니다.`,
    figure,
  );
}

/** 1-5-5 08 — 가장 높은 항목 이름. 01 은 그 비율. */
function cmpChartFormTopName(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const { kindName, figure } = cmpChartFig(rng, d.items);
  const top = d.items.reduce((a, b) => (a.pct > b.pct ? a : b));
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 ${kindName}입니다. 비율이 가장 높은 항목을 쓰시오.`,
    top.label,
    `가장 넓은 부분은 ${top.label}입니다.`,
    figure,
  );
}

/** 1-5-5 09 — 최고와 최저의 차. */
function cmpChartFormSpread(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const { kindName, figure } = cmpChartFig(rng, d.items);
  const top = d.items.reduce((a, b) => (a.pct > b.pct ? a : b));
  const low = d.items.reduce((a, b) => (a.pct < b.pct ? a : b));
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 ${kindName}입니다. 가장 높은 비율과 가장 낮은 비율의 차는 몇 %입니까?`,
    num(top.pct - low.pct),
    `${expr(`${top.pct}-${low.pct}=${top.pct - low.pct}`)} 이므로 ${expr(`${top.pct - low.pct}\\%`)} 입니다.`,
    figure,
  );
}

/** 1-5-5 10 — 두 번째로 높은 비율. */
function cmpChartFormSecond(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = chartDataDistinct(rng);
  const { kindName, figure } = cmpChartFig(rng, d.items);
  const sorted = [...d.items].sort((a, b) => b.pct - a.pct);
  const second = sorted[1]!;
  return make(
    unit,
    `학생들이 ${d.subject}을 조사하여 나타낸 ${kindName}입니다. 두 번째로 높은 비율은 몇 %입니까?`,
    num(second.pct),
    `두 번째로 넓은 부분은 ${second.label}이고 비율은 ${expr(`${second.pct}\\%`)} 입니다.`,
    figure,
  );
}

function cuboid3(rng: Rng): { w: number; d: number; h: number } {
  return {
    w: intBetween(rng, 3, 9),
    d: intBetween(rng, 2, 6),
    h: intBetween(rng, 2, 7),
  };
}

/** 1-6-1 05 — 밑면 한 면의 넓이. */
function surfFormBase(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = cuboid3(rng);
  return make(
    unit,
    `가로가 ${unitNum(w, "cm")}, 세로가 ${unitNum(d, "cm")}, 높이가 ${unitNum(h, "cm")} 인 직육면체가 있습니다. ` +
      `밑면 한 면의 넓이는 몇 cm²입니까?`,
    num(w * d),
    `${expr(`${w}\\times${d}=${w * d}`)} 입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 1-6-1 06 — 면의 수 6. */
function surfFormFaces(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = cuboid3(rng);
  return make(
    unit,
    `가로가 ${unitNum(w, "cm")}, 세로가 ${unitNum(d, "cm")}, 높이가 ${unitNum(h, "cm")} 인 직육면체의 면은 몇 개입니까?`,
    num(6),
    `직육면체의 면은 ${num(6)}개입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 1-6-1 07 — 옆면 네 면의 넓이. */
function surfFormLateral(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = cuboid3(rng);
  const lat = 2 * h * (w + d);
  return make(
    unit,
    `가로가 ${unitNum(w, "cm")}, 세로가 ${unitNum(d, "cm")}, 높이가 ${unitNum(h, "cm")} 인 직육면체의 옆면 네 면의 넓이의 합은 몇 cm²입니까?`,
    num(lat),
    `${expr(`(${w}+${d})\\times2\\times${h}=${lat}`)} 입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 1-6-1 08 — 밑면 두 면. */
function surfFormTwoBases(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = cuboid3(rng);
  return make(
    unit,
    `가로가 ${unitNum(w, "cm")}, 세로가 ${unitNum(d, "cm")}, 높이가 ${unitNum(h, "cm")} 인 직육면체에서 밑면 두 면의 넓이의 합은 몇 cm²입니까?`,
    num(2 * w * d),
    `${expr(`${w}\\times${d}\\times2=${2 * w * d}`)} 입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 1-6-1 09 — 겉넓이에서 밑면 하나를 뺀 값(뚜껑 없는 상자). 03 은 치수로 다섯 면. */
function surfFormMinusLid(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = cuboid3(rng);
  const full = 2 * (w * d + d * h + h * w);
  return make(
    unit,
    `가로가 ${unitNum(w, "cm")}, 세로가 ${unitNum(d, "cm")}, 높이가 ${unitNum(h, "cm")} 인 직육면체의 겉넓이가 ${num(full)} cm²입니다. ` +
      `윗면 한 면을 빼면 몇 cm²입니까?`,
    num(full - w * d),
    `윗면은 ${expr(`${w}\\times${d}=${w * d}`)} 이므로 ${expr(`${full}-${w * d}=${full - w * d}`)} 입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 1-6-1 10 — 정육면체 한 모서리(겉넓이에서). 04 는 한 면의 넓이. */
function surfFormEdgeFromArea(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 9);
  return make(
    unit,
    `겉넓이가 ${num(6 * a * a)} cm²인 정육면체가 있습니다. 한 모서리의 길이는 몇 cm입니까?`,
    num(a),
    `한 면은 ${expr(`${6 * a * a}\\div6=${a * a}`)} 이므로 한 모서리는 ${num(a)} cm입니다.`,
    fig("cuboid", { w: a, d: a, h: a, showDimensions: false }),
  );
}

/** 1-6-2 05 — 밑면의 넓이. */
function volFormBase(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = cuboid3(rng);
  return make(
    unit,
    `가로가 ${unitNum(w, "cm")}, 세로가 ${unitNum(d, "cm")}, 높이가 ${unitNum(h, "cm")} 인 직육면체의 밑면의 넓이는 몇 cm²입니까?`,
    num(w * d),
    `${expr(`${w}\\times${d}=${w * d}`)} 입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 1-6-2 06 — 부피와 밑면의 넓이에서 높이를 한 번에 구한다. 04 심화(두 변)와 가른다. */
function volFormWd(unit: UnitSeed, rng: Rng): ElemProblem {
  let a = intBetween(rng, 6, 18);
  let h = intBetween(rng, 3, 9);
  for (let t = 0; t < 20 && h === a; t += 1) h = intBetween(rng, 3, 9);
  if (h === a) a = h + 2;
  const v = a * h;
  return make(
    unit,
    `부피가 ${num(v)} cm³이고 밑면의 넓이가 ${num(a)} cm²인 직육면체가 있습니다. 이 직육면체의 높이는 몇 cm입니까?`,
    num(h),
    `높이는 ${expr(`${v}\\div${a}=${h}`)} 입니다.`,
  );
}

/** 1-6-2 07 — 두 직육면체 부피의 합. */
function volFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = cuboid3(rng);
  const b = cuboid3(rng);
  return make(
    unit,
    `부피가 ${num(a.w * a.d * a.h)} cm³인 직육면체와 부피가 ${num(b.w * b.d * b.h)} cm³인 직육면체가 있습니다. 두 부피의 합은 몇 cm³입니까?`,
    num(a.w * a.d * a.h + b.w * b.d * b.h),
    `${expr(`${a.w * a.d * a.h}+${b.w * b.d * b.h}=${a.w * a.d * a.h + b.w * b.d * b.h}`)} 입니다.`,
  );
}

/** 1-6-2 08 — 두 부피의 차. */
function volFormDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 3, 8);
  const d = intBetween(rng, 2, 5);
  const h1 = intBetween(rng, 4, 9);
  const h2 = intBetween(rng, 2, h1 - 1);
  return make(
    unit,
    `밑면의 가로가 ${unitNum(w, "cm")}, 세로가 ${unitNum(d, "cm")} 로 같고 높이가 ${unitNum(h1, "cm")} 와 ${unitNum(h2, "cm")} 인 두 직육면체가 있습니다. 부피의 차는 몇 cm³입니까?`,
    num(w * d * (h1 - h2)),
    `${expr(`${w}\\times${d}\\times${h1 - h2}=${w * d * (h1 - h2)}`)} 입니다.`,
  );
}

/** 1-6-2 09 — 1 cm 쌓기나무 개수 = 부피. */
function volFormCubes(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = cuboid3(rng);
  return make(
    unit,
    `가로 ${unitNum(w, "cm")}, 세로 ${unitNum(d, "cm")}, 높이 ${unitNum(h, "cm")} 인 직육면체를 한 모서리의 길이가 ${unitNum(1, "cm")} 인 쌓기나무로 빈틈없이 채우면 쌓기나무는 몇 개 필요합니까?`,
    num(w * d * h),
    `${expr(`${w}\\times${d}\\times${h}=${w * d * h}`)} 개입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 1-6-2 10 — 세 모서리를 같이 늘인다. 답은 세제곱이라 발문에 없다. */
function volFormDoubleOne(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 4);
  return make(
    unit,
    `직육면체의 가로·세로·높이를 모두 ${num(k)}배로 늘이면 부피는 처음의 몇 배가 됩니까?`,
    num(k * k * k),
    `부피는 세 모서리의 곱이므로 ${expr(`${k}\\times${k}\\times${k}=${k * k * k}`)} 배가 됩니다.`,
  );
}

/** 1-6-3 05 — 1 m³ = 1000000 cm³ 예. */
function cubicFormFactTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${num(1)} m³는 ${num(1000000)} cm³이다. (참고: ${num(k)} m³를 바꾸어 확인하여도 된다.)`,
    "예",
    `${expr("1\\,\\mathrm{m}^3=1000000\\,\\mathrm{cm}^3")} 입니다.`,
  );
}

/** 1-6-3 06 — cm³를 m³로. */
function cubicFormToM(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  return make(
    unit,
    `${num(k * 1000000)} cm³는 몇 m³입니까?`,
    num(k),
    `${expr(`${k * 1000000}\\div1000000=${k}`)} 입니다.`,
  );
}

/** 1-6-3 07 — 두 m³의 합을 cm³로. */
function cubicFormSumCm(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 5);
  const b = intBetween(rng, 2, 5);
  return make(
    unit,
    `${num(a)} m³와 ${num(b)} m³의 합은 몇 cm³입니까?`,
    num((a + b) * 1000000),
    `${expr(`${a}+${b}=${a + b}`)} m³이므로 ${expr(`${a + b}\\times1000000=${(a + b) * 1000000}`)} cm³입니다.`,
  );
}

/** 1-6-3 08 — m 단위 직육면체 부피. */
function cubicFormBoxM(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, BIG_THINGS);
  const w = intBetween(rng, 2, 6);
  const d = intBetween(rng, 2, 5);
  const h = intBetween(rng, 2, 4);
  return make(
    unit,
    `가로 ${num(w)} m, 세로 ${num(d)} m, 높이 ${num(h)} m인 ${thing}의 부피는 몇 m³입니까?`,
    num(w * d * h),
    `${expr(`${w}\\times${d}\\times${h}=${w * d * h}`)} 입니다.`,
  );
}

/** 1-6-3 09 — 그 부피를 cm³로. */
function cubicFormBoxToCm(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 2, 4);
  const d = intBetween(rng, 2, 3);
  const h = intBetween(rng, 1, 3);
  const m3 = w * d * h;
  return make(
    unit,
    `가로 ${num(w)} m, 세로 ${num(d)} m, 높이 ${num(h)} m인 창고의 부피는 몇 cm³입니까?`,
    num(m3 * 1000000),
    `부피는 ${expr(`${w}\\times${d}\\times${h}=${m3}`)} m³이고, ${expr(`${m3}\\times1000000=${m3 * 1000000}`)} cm³입니다.`,
  );
}

/** 1-6-3 10 — 두 창고 부피의 차(m³). */
function cubicFormDiffM(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 5, 12);
  const b = intBetween(rng, 2, a - 1);
  const thing = pick(rng, BIG_THINGS);
  return make(
    unit,
    `부피가 ${num(a)} m³인 ${thing}${josa(thing, "과", "와")} 부피가 ${num(b)} m³인 ${thing}의 부피의 차는 몇 m³입니까?`,
    num(a - b),
    `${expr(`${a}-${b}=${a - b}`)} 입니다.`,
  );
}

/** 2-1-1 05 — 나누어지는 분수의 분자. */
function sameDenFormTop(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 4, 9);
  const [a, b] = twoCoprimeTops(rng, d);
  return make(
    unit,
    `다음 나눗셈에서 나누어지는 분수의 분자는 얼마입니까?\n\n${expr(`\\frac{${a}}{${d}}\\div\\frac{${b}}{${d}}`)}`,
    num(a),
    `나누어지는 분수는 ${expr(`\\frac{${a}}{${d}}`)} 이므로 분자는 ${num(a)}입니다.`,
  );
}

/** 2-1-1 06 — 나누는 분수의 분자. */
function sameDenFormDivTop(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 4, 9);
  const [a, b] = twoCoprimeTops(rng, d);
  return make(
    unit,
    `${expr(`\\frac{${a}}{${d}}`)} 를 ${expr(`\\frac{${b}}{${d}}`)} 로 나눌 때, 나누는 분수의 분자는 얼마입니까?`,
    num(b),
    `나누는 분수는 ${expr(`\\frac{${b}}{${d}}`)} 이므로 분자는 ${num(b)}입니다.`,
  );
}

/** 2-1-1 07 — 공통 분모. */
function sameDenFormDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 4, 9);
  const [a, b] = twoCoprimeTops(rng, d);
  return make(
    unit,
    `다음 나눗셈의 두 분수의 분모는 얼마입니까?\n\n${expr(`\\frac{${a}}{${d}}\\div\\frac{${b}}{${d}}`)}`,
    num(d),
    `두 분수의 분모가 모두 ${num(d)}입니다.`,
  );
}

/** 2-1-1 08 — 분모가 같다 예. */
function sameDenFormSameTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 4, 9);
  const [a, b] = twoCoprimeTops(rng, d);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`\\frac{${a}}{${d}}\\div\\frac{${b}}{${d}}`)} 에서 두 분수의 분모는 같다.`,
    "예",
    `두 분모가 모두 ${num(d)}로 같습니다. 분자끼리 나눕니다.`,
  );
}

/** 2-1-1 09 — 두 같은 분모 나눗셈 몫의 합. */
function sameDenFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 5, 9);
  const [a, b] = twoCoprimeTops(rng, d);
  const [c, e] = twoCoprimeTops(rng, d);
  const [p, q] = addFrac(a, b, c, e);
  return make(
    unit,
    `다음 두 나눗셈의 몫의 합을 구하시오.\n\n${expr(`\\frac{${a}}{${d}}\\div\\frac{${b}}{${d}}`)}, ${expr(`\\frac{${c}}{${d}}\\div\\frac{${e}}{${d}}`)}`,
    expr(fmtFrac(p, q)),
    `몫은 ${expr(fmtFrac(a, b))} 와 ${expr(fmtFrac(c, e))} 이므로 합은 ${expr(fmtFrac(p, q))} 입니다.`,
  );
}

/** 2-1-1 10 — 몫 × 나누는 분자 = 나누어지는 분자. */
function sameDenFormCheck(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 4, 9);
  const [a, b] = twoCoprimeTops(rng, d);
  return make(
    unit,
    `${expr(`\\frac{${a}}{${d}}\\div\\frac{${b}}{${d}}`)} 의 몫에 ${num(b)}${numJosa(b, "을", "를")} 곱하면 얼마입니까?`,
    num(a),
    `몫은 ${expr(`${a}\\div${b}`)} 이므로 ${expr(`${a}\\div${b}\\times${b}=${a}`)} 입니다.`,
  );
}

/** 2-1-2 05 — 나누어지는 분수의 분모. */
function diffDenFormDen1(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = twoDiffFracs(rng);
  return make(
    unit,
    `다음 나눗셈에서 나누어지는 분수의 분모는 얼마입니까?\n\n${expr(`\\frac{${f.n1}}{${f.d1}}\\div\\frac{${f.n2}}{${f.d2}}`)}`,
    num(f.d1),
    `나누어지는 분수는 ${expr(`\\frac{${f.n1}}{${f.d1}}`)} 이므로 분모는 ${num(f.d1)}입니다.`,
  );
}

/** 2-1-2 06 — 나누는 분수의 분모. */
function diffDenFormDen2(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = twoDiffFracs(rng);
  return make(
    unit,
    `${expr(`\\frac{${f.n1}}{${f.d1}}`)} 를 ${expr(`\\frac{${f.n2}}{${f.d2}}`)} 로 나눕니다. 나누는 분수의 분모는 얼마입니까?`,
    num(f.d2),
    `나누는 분수의 분모는 ${num(f.d2)}입니다.`,
  );
}

/** 2-1-2 07 — 분모가 다르다 예. */
function diffDenFormDiffTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = twoDiffFracs(rng);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`\\frac{${f.n1}}{${f.d1}}\\div\\frac{${f.n2}}{${f.d2}}`)} 에서 두 분수의 분모는 다르다.`,
    "예",
    `분모가 ${num(f.d1)}과 ${num(f.d2)}로 다릅니다.`,
  );
}

/** 2-1-2 08 — 역수의 분자. */
function diffDenFormRecipNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = twoDiffFracs(rng);
  return make(
    unit,
    `${expr(`\\frac{${f.n2}}{${f.d2}}`)} 의 분모와 분자를 바꾼 수의 분자는 얼마입니까?`,
    num(f.d2),
    `분모와 분자를 바꾸면 ${expr(`\\frac{${f.d2}}{${f.n2}}`)} 이므로 분자는 ${num(f.d2)}입니다.`,
  );
}

/** 2-1-2 09 — 두 분모의 곱. */
function diffDenFormDenProd(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = twoDiffFracs(rng);
  return make(
    unit,
    `다음 나눗셈의 두 분모의 곱은 얼마입니까?\n\n${expr(`\\frac{${f.n1}}{${f.d1}}\\div\\frac{${f.n2}}{${f.d2}}`)}`,
    num(f.d1 * f.d2),
    `${expr(`${f.d1}\\times${f.d2}=${f.d1 * f.d2}`)} 입니다.`,
  );
}

/** 2-1-2 10 — 몫. */
function diffDenFormQuot(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = twoDiffFracs(rng);
  const [p, q] = divFrac(f.n1, f.d1, f.n2, f.d2);
  return make(
    unit,
    `${expr(`\\frac{${f.n1}}{${f.d1}}\\div\\frac{${f.n2}}{${f.d2}}`)} 의 몫을 구하시오.`,
    expr(fmtFrac(p, q)),
    `${expr(`\\frac{${f.n1}}{${f.d1}}\\times\\frac{${f.d2}}{${f.n2}}=${fmtFrac(p, q)}`)} 입니다.`,
  );
}

/** 2-1-3 05 — 나누어지는 자연수. */
function natFracFormNat(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 8);
  const d = intBetween(rng, 3, 9);
  const n = coprimeTop(rng, d, 2);
  return make(
    unit,
    `다음 나눗셈에서 나누어지는 수는 얼마입니까?\n\n${expr(`${k}\\div\\frac{${n}}{${d}}`)}`,
    num(k),
    `나누어지는 수는 ${num(k)}입니다.`,
  );
}

/** 2-1-3 06 — 나누는 분수의 분모. */
function natFracFormDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 8);
  const d = intBetween(rng, 3, 9);
  const n = coprimeTop(rng, d, 2);
  return make(
    unit,
    `${num(k)}${numRo(k)} ${expr(`\\frac{${n}}{${d}}`)} 를 나눕니다. 나누는 분수의 분모는 얼마입니까?`,
    num(d),
    `나누는 분수의 분모는 ${num(d)}입니다.`,
  );
}

/** 2-1-3 07 — 곱하는 역수의 분자·분모 합. 06(=n2)와 10(=n1)과 셈을 가른다. */
function natFracFormRecipNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 8);
  const d = intBetween(rng, 3, 9);
  const n = coprimeTop(rng, d, 2);
  return make(
    unit,
    `${expr(`${k}\\div\\frac{${n}}{${d}}`)} 를 곱셈으로 바꿀 때 곱하는 분수의 분자와 분모의 합은 얼마입니까?`,
    num(d + n),
    `곱하는 분수는 ${expr(`\\frac{${d}}{${n}}`)} 이므로 합은 ${expr(`${d}+${n}=${d + n}`)} 입니다.`,
  );
}

/** 2-1-3 08 — 자연수×분모. */
function natFracFormTimesDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 8);
  const d = intBetween(rng, 3, 9);
  const n = coprimeTop(rng, d, 2);
  return make(
    unit,
    `${expr(`${k}\\div\\frac{${n}}{${d}}`)} 를 계산할 때 먼저 ${num(k)}${numJosa(k, "과", "와")} ${num(d)}를 곱합니다. 그 곱은 얼마입니까?`,
    num(k * d),
    `${expr(`${k}\\times${d}=${k * d}`)} 입니다.`,
  );
}

/** 2-1-3 09 — 두 나눗셈 몫의 합. */
function natFracFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 5);
  const d = intBetween(rng, 3, 8);
  const n = coprimeTop(rng, d, 2);
  const k2 = intBetween(rng, 2, 5);
  const [p1, q1] = divFrac(k, 1, n, d);
  const [p2, q2] = divFrac(k2, 1, n, d);
  const [p, q] = addFrac(p1, q1, p2, q2);
  return make(
    unit,
    `다음 두 나눗셈의 몫의 합을 구하시오.\n\n${expr(`${k}\\div\\frac{${n}}{${d}}`)}, ${expr(`${k2}\\div\\frac{${n}}{${d}}`)}`,
    expr(fmtFrac(p, q)),
    `몫은 ${expr(fmtFrac(p1, q1))} 와 ${expr(fmtFrac(p2, q2))} 이므로 합은 ${expr(fmtFrac(p, q))} 입니다.`,
  );
}

/** 2-1-3 10 — 나누는 분수의 분자. */
function natFracFormNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 8);
  const d = intBetween(rng, 3, 9);
  const n = coprimeTop(rng, d, 2);
  return make(
    unit,
    `${num(k)}${numRo(k)} 나누는 분수가 ${expr(`\\frac{${n}}{${d}}`)} 입니다. 이 분수의 분자는 얼마입니까?`,
    num(n),
    `분자는 ${num(n)}입니다.`,
  );
}

/** 2-1-4 05 — 역수의 분자. */
function flipFormRecipNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = twoDiffFracs(rng);
  return make(
    unit,
    `${expr(`\\frac{${f.n1}}{${f.d1}}\\div\\frac{${f.n2}}{${f.d2}}`)} 를 곱셈으로 바꿀 때, 곱하는 분수의 분자는 얼마입니까?`,
    num(f.d2),
    `나누는 수 ${expr(`\\frac{${f.n2}}{${f.d2}}`)} 의 분모와 분자를 바꾸면 분자는 ${num(f.d2)}입니다.`,
  );
}

/** 2-1-4 06 — 역수의 분모. */
function flipFormRecipDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = twoDiffFracs(rng);
  return make(
    unit,
    `${expr(`\\frac{${f.n2}}{${f.d2}}`)} 의 분모와 분자를 바꾼 수의 분모는 얼마입니까?`,
    num(f.n2),
    `분모와 분자를 바꾸면 분모는 ${num(f.n2)}입니다.`,
  );
}

/** 2-1-4 07 — 곱셈으로 바꾸는 것이 맞다. */
function flipFormRuleTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = twoDiffFracs(rng);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`\\frac{${f.n1}}{${f.d1}}\\div\\frac{${f.n2}}{${f.d2}}=\\frac{${f.n1}}{${f.d1}}\\times\\frac{${f.d2}}{${f.n2}}`)}`,
    "예",
    `나누는 수의 분모와 분자를 바꾸어 곱합니다.`,
  );
}

/** 2-1-4 08 — 나누는 분수의 분자. */
function flipFormDivNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = twoDiffFracs(rng);
  return make(
    unit,
    `곱셈식 ${expr(`\\frac{${f.n1}}{${f.d1}}\\times\\frac{${f.d2}}{${f.n2}}`)} 로 나타낸 나눗셈에서 나누는 분수의 분자는 얼마입니까?`,
    num(f.n2),
    `곱하는 둘째 분수는 나누는 수의 역수이므로 원래 나누는 분수의 분자는 ${num(f.n2)}입니다.`,
  );
}

/** 2-1-4 09 — 두 변환 식의 나누는 분수 분모의 합. */
function flipFormDenSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = twoDiffFracs(rng);
  const g = twoDiffFracs(rng);
  return make(
    unit,
    `${expr(`\\frac{${f.n1}}{${f.d1}}\\div\\frac{${f.n2}}{${f.d2}}`)} 와 ${expr(`\\frac{${g.n1}}{${g.d1}}\\div\\frac{${g.n2}}{${g.d2}}`)} 에서 나누는 두 분수의 분모의 합은 얼마입니까?`,
    num(f.d2 + g.d2),
    `${expr(`${f.d2}+${g.d2}=${f.d2 + g.d2}`)} 입니다.`,
  );
}

/** 2-1-4 10 — 계산한 몫. */
function flipFormValue(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = twoDiffFracs(rng);
  const [p, q] = divFrac(f.n1, f.d1, f.n2, f.d2);
  return make(
    unit,
    `${expr(`\\frac{${f.n1}}{${f.d1}}\\times\\frac{${f.d2}}{${f.n2}}`)} 를 계산하시오.`,
    expr(fmtFrac(p, q)),
    `${expr(`\\frac{${f.n1}\\times${f.d2}}{${f.d1}\\times${f.n2}}=${fmtFrac(p, q)}`)} 입니다.`,
  );
}

/** 2-1-5 05 — 대분수의 자연수 부분. */
function mixedFracFormWhole(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = mixedParts(rng, 4);
  const d = intBetween(rng, 2, 7);
  const n = coprimeTop(rng, d);
  return make(
    unit,
    `${expr(`${mixedLatex(m)}\\div\\frac{${n}}{${d}}`)} 에서 대분수의 자연수 부분은 얼마입니까?`,
    num(m.w),
    `대분수 ${expr(mixedLatex(m))} 의 자연수 부분은 ${num(m.w)}입니다.`,
  );
}

/** 2-1-5 06 — 가분수 분자. */
function mixedFracFormImp(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = mixedParts(rng, 4);
  const d = intBetween(rng, 2, 7);
  const n = coprimeTop(rng, d);
  return make(
    unit,
    `${expr(mixedLatex(m))} 를 ${expr(`\\frac{${n}}{${d}}`)} 로 나누려고 합니다. 대분수를 가분수로 고친 분자는 얼마입니까?`,
    num(m.imp),
    `${expr(`${m.w}\\times${m.d}+${m.t}=${m.imp}`)} 이므로 분자는 ${num(m.imp)}입니다.`,
  );
}

/** 2-1-5 07 — 나누는 분수의 분모. */
function mixedFracFormDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = mixedParts(rng, 4);
  const d = intBetween(rng, 2, 7);
  const n = coprimeTop(rng, d);
  return make(
    unit,
    `${expr(`${mixedLatex(m)}\\div\\frac{${n}}{${d}}`)} 에서 나누는 분수의 분모는 얼마입니까?`,
    num(d),
    `나누는 분수의 분모는 ${num(d)}입니다.`,
  );
}

/** 2-1-5 08 — 가분수 분모. */
function mixedFracFormImpDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = mixedParts(rng, 4);
  const d = intBetween(rng, 2, 7);
  const n = coprimeTop(rng, d);
  return make(
    unit,
    `${expr(mixedLatex(m))} 를 가분수로 고칠 때 분모는 얼마입니까? (나누는 수는 ${expr(`\\frac{${n}}{${d}}`)} 입니다.)`,
    num(m.d),
    `가분수의 분모는 원래 분모 ${num(m.d)}입니다.`,
  );
}

/** 2-1-5 09 — 몫. */
function mixedFracFormQuot(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = mixedParts(rng, 3);
  const d = intBetween(rng, 2, 6);
  const n = coprimeTop(rng, d);
  const [p, q] = divFrac(m.imp, m.d, n, d);
  return make(
    unit,
    `${expr(`${mixedLatex(m)}\\div\\frac{${n}}{${d}}`)} 의 몫을 구하시오.`,
    expr(fmtFrac(p, q)),
    `${expr(`${mixedLatex(m)}=\\frac{${m.imp}}{${m.d}}`)} 이므로 ${expr(`\\frac{${m.imp}}{${m.d}}\\times\\frac{${d}}{${n}}=${fmtFrac(p, q)}`)} 입니다.`,
  );
}

/** 2-1-5 10 — 자연수 부분과 나누는 분모의 합. */
function mixedFracFormWholePlusDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = mixedParts(rng, 4);
  const d = intBetween(rng, 2, 7);
  const n = coprimeTop(rng, d);
  return make(
    unit,
    `${expr(`${mixedLatex(m)}\\div\\frac{${n}}{${d}}`)} 에서 대분수의 자연수 부분과 나누는 분수의 분모를 더하면 얼마입니까?`,
    num(m.w + d),
    `${expr(`${m.w}+${d}=${m.w + d}`)} 입니다.`,
  );
}

function sameDpFormDivisor(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, SAME_DIGIT);
  return make(
    unit,
    `자릿수가 같은 다음 나눗셈에서 나누는 수는 얼마입니까?\n\n${expr(`${decStr(c.a, 1)}\\div${decStr(c.b, 1)}`)}`,
    expr(decStr(c.b, 1)),
    `나누는 수는 ${num(decStr(c.b, 1))}입니다.`,
  );
}
function sameDpFormDividend(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, SAME_DIGIT);
  return make(
    unit,
    `${expr(`${decStr(c.a, 1)}\\div${decStr(c.b, 1)}`)} 에서 나누어지는 수는 얼마입니까?`,
    expr(decStr(c.a, 1)),
    `나누어지는 수는 ${num(decStr(c.a, 1))}입니다.`,
  );
}
function sameDpFormSameTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, SAME_DIGIT);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`${decStr(c.a, 1)}\\div${decStr(c.b, 1)}`)} 에서 두 수의 소수 자릿수는 같다.`,
    "예",
    `두 수 모두 소수 한 자리입니다.`,
  );
}
function sameDpFormQuot(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, SAME_DIGIT);
  return make(
    unit,
    `${expr(`${decStr(c.a, 1)}\\div${decStr(c.b, 1)}`)} 의 몫을 구하시오.`,
    num(c.q),
    `소수점을 한 자리씩 옮기면 ${expr(`${c.a}\\div${c.b}=${c.q}`)} 입니다.`,
  );
}
function sameDpFormProd(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, SAME_DIGIT);
  return make(
    unit,
    `${expr(`${decStr(c.a, 1)}\\div${decStr(c.b, 1)}`)} 의 몫에 나누는 수를 곱하면 얼마입니까?`,
    expr(decStr(c.a, 1)),
    `${expr(`${c.q}\\times${decStr(c.b, 1)}=${decStr(c.a, 1)}`)} 입니다.`,
  );
}
function sameDpFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, SAME_DIGIT);
  const y = pick(rng, SAME_DIGIT);
  return make(
    unit,
    `다음 두 나눗셈의 몫의 합을 구하시오. 두 나눗셈 모두 소수 자릿수가 같습니다.\n\n${expr(`${decStr(x.a, 1)}\\div${decStr(x.b, 1)}`)}, ${expr(`${decStr(y.a, 1)}\\div${decStr(y.b, 1)}`)}`,
    num(x.q + y.q),
    `${expr(`${x.q}+${y.q}=${x.q + y.q}`)} 입니다.`,
  );
}

function diffDpFormDivisor(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DIFF_DIGIT);
  return make(
    unit,
    `자릿수가 다른 다음 나눗셈에서 나누는 수는 얼마입니까?\n\n${expr(`${fromCents(c.a)}\\div${decStr(c.b, 1)}`)}`,
    expr(decStr(c.b, 1)),
    `나누는 수는 ${num(decStr(c.b, 1))}입니다.`,
  );
}
function diffDpFormDividend(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DIFF_DIGIT);
  return make(
    unit,
    `${expr(`${fromCents(c.a)}\\div${decStr(c.b, 1)}`)} 에서 나누어지는 수는 얼마입니까?`,
    expr(fromCents(c.a)),
    `나누어지는 수는 ${num(fromCents(c.a))}입니다.`,
  );
}
function diffDpFormDiffTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DIFF_DIGIT);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`${fromCents(c.a)}\\div${decStr(c.b, 1)}`)} 에서 두 수의 소수 자릿수는 다르다.`,
    "예",
    `나누어지는 수는 소수 두 자리, 나누는 수는 소수 한 자리입니다.`,
  );
}
function diffDpFormQuot(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DIFF_DIGIT);
  return make(
    unit,
    `${expr(`${fromCents(c.a)}\\div${decStr(c.b, 1)}`)} 의 몫을 구하시오.`,
    expr(fromCents(c.q)),
    `소수점을 옮겨 계산하면 몫은 ${num(fromCents(c.q))}입니다.`,
  );
}
function diffDpFormShift(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DIFF_DIGIT);
  return make(
    unit,
    `${expr(`${fromCents(c.a)}\\div${decStr(c.b, 1)}`)} 를 계산할 때 나누는 수의 소수점을 오른쪽으로 한 자리 옮기면 나누는 수는 얼마가 됩니까?`,
    num(c.b),
    `소수점을 한 자리 옮기면 ${num(c.b)}입니다.`,
  );
}
function diffDpFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DIFF_DIGIT);
  const y = pick(rng, DIFF_DIGIT);
  return make(
    unit,
    `다음 두 나눗셈의 몫의 합을 구하시오. 둘 다 자릿수가 다른 (소수)÷(소수)입니다.\n\n${expr(`${fromCents(x.a)}\\div${decStr(x.b, 1)}`)}, ${expr(`${fromCents(y.a)}\\div${decStr(y.b, 1)}`)}`,
    expr(fromCents(x.q + y.q)),
    `몫의 합은 ${num(fromCents(x.q + y.q))}입니다.`,
  );
}

function natDpFormNat(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, NAT_BY_DEC);
  return make(
    unit,
    `다음 나눗셈에서 나누어지는 수는 얼마입니까?\n\n${expr(`${c.a}\\div${decStr(c.b, 1)}`)}`,
    num(c.a),
    `나누어지는 수는 자연수 ${num(c.a)}입니다.`,
  );
}
function natDpFormDivisor(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, NAT_BY_DEC);
  return make(
    unit,
    `${expr(`${c.a}\\div${decStr(c.b, 1)}`)} 에서 나누는 수는 얼마입니까?`,
    expr(decStr(c.b, 1)),
    `나누는 수는 ${num(decStr(c.b, 1))}입니다.`,
  );
}
function natDpFormNatTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, NAT_BY_DEC);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`${c.a}\\div${decStr(c.b, 1)}`)} 에서 나누어지는 수는 자연수이다.`,
    "예",
    `나누어지는 수 ${num(c.a)}는 자연수입니다.`,
  );
}
function natDpFormQuot(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, NAT_BY_DEC);
  return make(
    unit,
    `${expr(`${c.a}\\div${decStr(c.b, 1)}`)} 의 몫을 구하시오.`,
    num(c.q),
    `소수점을 옮겨 계산하면 몫은 ${num(c.q)}입니다.`,
  );
}
function natDpFormTimes(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, NAT_BY_DEC);
  return make(
    unit,
    `${expr(`${c.a}\\div${decStr(c.b, 1)}`)} 의 몫에 나누는 수를 곱하면 얼마입니까?`,
    num(c.a),
    `${expr(`${c.q}\\times${decStr(c.b, 1)}=${c.a}`)} 입니다.`,
  );
}
function natDpFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, NAT_BY_DEC);
  const y = pick(rng, NAT_BY_DEC);
  return make(
    unit,
    `다음 두 나눗셈의 몫의 합을 구하시오. 둘 다 (자연수)÷(소수)입니다.\n\n${expr(`${x.a}\\div${decStr(x.b, 1)}`)}, ${expr(`${y.a}\\div${decStr(y.b, 1)}`)}`,
    num(x.q + y.q),
    `${expr(`${x.q}+${y.q}=${x.q + y.q}`)} 입니다.`,
  );
}

function roundFormPlace(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, [1, 2] as const);
  const c = roundCase(rng, place);
  return make(
    unit,
    `다음 나눗셈의 몫을 반올림하여 소수 ${place === 1 ? "첫" : "둘"}째 자리까지 나타낼 때, 반올림하는 자리는 소수 몇째 자리입니까?\n\n${expr(`${c.a}\\div${c.b}`)}`,
    num(place),
    `소수 ${place === 1 ? "첫" : "둘"}째 자리까지이므로 ${num(place)}째 자리입니다.`,
  );
}
function roundFormNextDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, [1, 2] as const);
  const c = roundCase(rng, place);
  return make(
    unit,
    `${expr(`${c.a}\\div${c.b}`)} 의 몫을 소수 ${place === 1 ? "첫" : "둘"}째 자리까지 반올림할 때 보는 다음 자리의 숫자는 얼마입니까?`,
    num(c.shown % 10),
    `몫은 ${expr(`${decStr(c.shown, place + 1)}\\ldots`)} 이므로 다음 자리 숫자는 ${num(c.shown % 10)}입니다.`,
  );
}
function roundFormDoesTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, [1, 2] as const);
  const c = roundCase(rng, place);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`${c.a}\\div${c.b}`)} 의 몫은 나누어떨어지지 않으므로 반올림하여 나타낸다.`,
    "예",
    `나누어떨어지지 않으므로 반올림합니다.`,
  );
}
function roundFormResult(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, [1, 2] as const);
  const c = roundCase(rng, place);
  return make(
    unit,
    `${expr(`${c.a}\\div${c.b}`)} 의 몫을 반올림하여 소수 ${place === 1 ? "첫" : "둘"}째 자리까지 나타내시오.`,
    expr(decStr(c.cut, place)),
    `반올림하면 ${expr(decStr(c.cut, place))} 입니다.`,
  );
}
function roundFormShown(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, [1, 2] as const);
  const c = roundCase(rng, place);
  return make(
    unit,
    `${expr(`${c.a}\\div${c.b}`)} 의 몫을 반올림하기 전, 소수 ${place === 1 ? "둘" : "셋"}째 자리까지 쓴 수는 얼마입니까?`,
    expr(decStr(c.shown, place + 1)),
    `${expr(decStr(c.shown, place + 1))} 입니다.`,
  );
}
function roundFormDivisor(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, [1, 2] as const);
  const c = roundCase(rng, place);
  return make(
    unit,
    `몫을 반올림하는 다음 나눗셈에서 나누는 수는 얼마입니까?\n\n${expr(`${c.a}\\div${c.b}`)}`,
    num(c.b),
    `나누는 수는 ${num(c.b)}입니다.`,
  );
}

function remFormQuot(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = shareRemainder(rng);
  return make(
    unit,
    `${expr(`${decStr(r.total10, 1)}\\div${r.per}`)} 에서 몫을 자연수까지 구할 때 몫은 얼마입니까?`,
    num(r.people),
    `몫은 ${num(r.people)}입니다.`,
  );
}
function remFormRem(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = shareRemainder(rng);
  return make(
    unit,
    `${expr(`${decStr(r.total10, 1)}\\div${r.per}`)} 에서 몫을 자연수까지 구할 때 남는 수는 얼마입니까?`,
    expr(decStr(r.rem10, 1)),
    `남는 수는 ${num(decStr(r.rem10, 1))}입니다.`,
  );
}
function remFormDivisor(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = shareRemainder(rng);
  return make(
    unit,
    `${expr(`${decStr(r.total10, 1)}\\div${r.per}`)} 에서 나누는 수는 얼마입니까?`,
    num(r.per),
    `나누는 수는 ${num(r.per)}입니다.`,
  );
}
function remFormUsed(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = shareRemainder(rng);
  return make(
    unit,
    `${expr(`${decStr(r.total10, 1)}\\div${r.per}`)} 에서 몫만큼 나누어 준 양은 얼마입니까?`,
    num(r.per * r.people),
    `${expr(`${r.per}\\times${r.people}=${r.per * r.people}`)} 입니다.`,
  );
}
function remFormTotal(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = shareRemainder(rng);
  return make(
    unit,
    `${expr(`${decStr(r.total10, 1)}\\div${r.per}`)} 에서 나누어지는 수는 얼마입니까?`,
    expr(decStr(r.total10, 1)),
    `나누어지는 수는 ${num(decStr(r.total10, 1))}입니다.`,
  );
}
function remFormSmallerTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = shareRemainder(rng);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`${decStr(r.total10, 1)}\\div${r.per}`)} 에서 남는 수는 나누는 수보다 작다.`,
    "예",
    `남는 수 ${num(decStr(r.rem10, 1))}는 나누는 수 ${num(r.per)}보다 작습니다.`,
  );
}

function viewFormCols(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const ones = stackBits(b.h).ones;
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓은 모양입니다. 한 층만 쌓인 칸은 몇 칸입니까?`,
    num(ones),
    `한 층만 쌓인 칸은 ${num(ones)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}
function viewFormRows(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const atMax = stackBits(b.h).atMax;
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓은 모양입니다. 가장 높은 층과 같은 높이인 칸은 몇 칸입니까?`,
    num(atMax),
    `가장 높은 층과 같은 칸은 ${num(atMax)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso"] }),
  );
}
function viewFormFloor(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓은 모양입니다. 바닥 칸은 모두 몇 칸입니까?`,
    num(b.cols * b.rows),
    `${expr(`${b.cols}\\times${b.rows}=${b.cols * b.rows}`)} 칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}
function viewFormFilled(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const filled = b.h.flat().filter((v) => v > 0).length;
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓은 모양입니다. 위에서 볼 때 쌓기나무가 놓인 칸은 몇 칸입니까?`,
    num(filled),
    `놓인 칸은 ${num(filled)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}
function viewFormMax(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const mx = Math.max(...b.h.flat());
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓은 모양입니다. 가장 높이 쌓인 곳은 몇 층입니까?`,
    num(mx),
    `가장 높은 곳은 ${num(mx)}층입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso"] }),
  );
}
function viewFormSumFloorFilled(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const filled = b.h.flat().filter((v) => v > 0).length;
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓은 모양입니다. 바닥 칸 수와 위에서 보이는 칸 수를 더하면 얼마입니까?`,
    num(b.cols * b.rows + filled),
    `${expr(`${b.cols * b.rows}+${filled}=${b.cols * b.rows + filled}`)} 입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}

function cubeOneFormCols(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const empty = stackBits(b.h).empty;
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓았습니다. 쌓기나무가 하나도 없는 칸은 몇 칸입니까?`,
    num(empty),
    `빈 칸은 ${num(empty)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}
function cubeOneFormRows(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const ones = stackBits(b.h).ones;
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓았습니다. 쌓기나무가 한 개만 놓인 칸은 몇 칸입니까?`,
    num(ones),
    `한 개만 놓인 칸은 ${num(ones)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}
function cubeOneFormFilled(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const filled = b.h.flat().filter((v) => v > 0).length;
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓은 모양입니다. 쌓기나무가 한 개 이상 놓인 바닥 칸은 몇 칸입니까?`,
    num(filled),
    `${num(filled)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}
function cubeOneFormMax(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓았습니다. 가장 높은 층의 수는 얼마입니까?`,
    num(Math.max(...b.h.flat())),
    `가장 높은 층은 ${num(Math.max(...b.h.flat()))}입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso"] }),
  );
}
function cubeOneFormFloor(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓았습니다. 바닥은 모두 몇 칸입니까?`,
    num(b.cols * b.rows),
    `${expr(`${b.cols}\\times${b.rows}=${b.cols * b.rows}`)} 칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}
function cubeOneFormExtra(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const total = b.h.flat().reduce((s, v) => s + v, 0);
  const filled = b.h.flat().filter((v) => v > 0).length;
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓았습니다. 쌓기나무 전체 개수에서 놓인 바닥 칸 수를 빼면 얼마입니까?`,
    num(total - filled),
    `전체 ${num(total)}개에서 놓인 칸 ${num(filled)}칸을 빼면 ${num(total - filled)}입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}

function cubeTwoFormMax(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBaseTopped(rng);
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓았습니다. 가장 높은 곳은 몇 층입니까?`,
    num(b.top),
    `가장 높은 곳은 ${num(b.top)}층입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso"] }),
  );
}
function cubeTwoFormCols(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBaseTopped(rng);
  const empty = stackBits(b.h).empty;
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓았습니다. 비어 있는 바닥 칸은 몇 칸입니까?`,
    num(empty),
    `빈 칸은 ${num(empty)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}
function cubeTwoFormRows(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBaseTopped(rng);
  const ones = stackBits(b.h).ones;
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓았습니다. 한 층만 있는 칸은 몇 칸입니까?`,
    num(ones),
    `한 층만 있는 칸은 ${num(ones)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}
function cubeTwoFormTotal(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBaseTopped(rng);
  const total = b.h.flat().reduce((s, v) => s + v, 0);
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓았습니다. 쌓기나무는 모두 몇 개입니까?`,
    num(total),
    `층수를 모두 더하면 ${num(total)}개입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}
function cubeTwoFormFilled(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBaseTopped(rng);
  const filled = b.h.flat().filter((v) => v > 0).length;
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓았습니다. 쌓기나무가 놓인 바닥 칸은 몇 칸입니까?`,
    num(filled),
    `${num(filled)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}
function cubeTwoFormFloor(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBaseTopped(rng);
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 쌓았습니다. 바닥 칸은 모두 몇 칸입니까?`,
    num(b.cols * b.rows),
    `${expr(`${b.cols}\\times${b.rows}=${b.cols * b.rows}`)} 칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}

function cubeLayerFormMax(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 층층이 쌓았습니다. 가장 높은 층은 몇 층입니까?`,
    num(Math.max(...b.h.flat())),
    `가장 높은 층은 ${num(Math.max(...b.h.flat()))}입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso"] }),
  );
}
function cubeLayerFormCols(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const empty = stackBits(b.h).empty;
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 층층이 쌓았습니다. 쌓이지 않은 칸은 몇 칸입니까?`,
    num(empty),
    `쌓이지 않은 칸은 ${num(empty)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}
function cubeLayerFormRows(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const ones = stackBits(b.h).ones;
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 층층이 쌓았습니다. 1층에만 있고 2층이 없는 칸은 몇 칸입니까?`,
    num(ones),
    `1층만 있는 칸은 ${num(ones)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}
function cubeLayerFormTotal(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const total = b.h.flat().reduce((s, v) => s + v, 0);
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 층층이 쌓았습니다. 쌓기나무는 모두 몇 개입니까?`,
    num(total),
    `모두 ${num(total)}개입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}
function cubeLayerFormFilled(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const filled = b.h.flat().filter((v) => v > 0).length;
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 층층이 쌓았습니다. 한 층 이상 쌓인 칸은 몇 칸입니까?`,
    num(filled),
    `${num(filled)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}
function cubeLayerFormFloor(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  return make(
    unit,
    `${b.grid} 바닥에 쌓기나무를 층층이 쌓았습니다. 바닥은 모두 몇 칸입니까?`,
    num(b.cols * b.rows),
    `${expr(`${b.cols}\\times${b.rows}=${b.cols * b.rows}`)} 칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}

function cubeBoxFormCols(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const empty = stackBits(b.h).empty;
  return make(
    unit,
    `${b.grid} 상자에 쌓기나무를 담았습니다. 비어 있는 칸은 몇 칸입니까?`,
    num(empty),
    `빈 칸은 ${num(empty)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}
function cubeBoxFormRows(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const ones = stackBits(b.h).ones;
  return make(
    unit,
    `${b.grid} 상자에 쌓기나무를 담았습니다. 한 개만 담긴 칸은 몇 칸입니까?`,
    num(ones),
    `한 개만 담긴 칸은 ${num(ones)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}
function cubeBoxFormMax(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  return make(
    unit,
    `${b.grid} 상자에 쌓기나무를 담았습니다. 가장 높이 담긴 곳은 몇 층입니까?`,
    num(Math.max(...b.h.flat())),
    `가장 높은 곳은 ${num(Math.max(...b.h.flat()))}층입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso"] }),
  );
}
function cubeBoxFormTotal(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const total = b.h.flat().reduce((s, v) => s + v, 0);
  return make(
    unit,
    `${b.grid} 상자에 쌓기나무를 담았습니다. 담긴 쌓기나무는 모두 몇 개입니까?`,
    num(total),
    `모두 ${num(total)}개입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}
function cubeBoxFormFilled(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const filled = b.h.flat().filter((v) => v > 0).length;
  return make(
    unit,
    `${b.grid} 상자에 쌓기나무를 담았습니다. 쌓기나무가 담긴 바닥 칸은 몇 칸입니까?`,
    num(filled),
    `${num(filled)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}
function cubeBoxFormFloor(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  return make(
    unit,
    `${b.grid} 상자에 쌓기나무를 담았습니다. 바닥 칸은 모두 몇 칸입니까?`,
    num(b.cols * b.rows),
    `${expr(`${b.cols}\\times${b.rows}=${b.cols * b.rows}`)} 칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}

function cubeMakeFormCols(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const empty = stackBits(b.h).empty;
  return make(
    unit,
    `${b.grid} 바닥에 여러 가지 모양으로 쌓기나무를 쌓았습니다. 나무가 없는 칸은 몇 칸입니까?`,
    num(empty),
    `없는 칸은 ${num(empty)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}
function cubeMakeFormRows(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const ones = stackBits(b.h).ones;
  return make(
    unit,
    `${b.grid} 바닥에 여러 가지 모양으로 쌓기나무를 쌓았습니다. 한 개짜리 칸은 몇 칸입니까?`,
    num(ones),
    `한 개짜리 칸은 ${num(ones)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}
function cubeMakeFormMax(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  return make(
    unit,
    `${b.grid} 바닥에 여러 가지 모양으로 쌓기나무를 쌓았습니다. 가장 높은 곳은 몇 층입니까?`,
    num(Math.max(...b.h.flat())),
    `가장 높은 곳은 ${num(Math.max(...b.h.flat()))}층입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso"] }),
  );
}
function cubeMakeFormTotal(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const total = b.h.flat().reduce((s, v) => s + v, 0);
  return make(
    unit,
    `${b.grid} 바닥에 여러 가지 모양으로 쌓기나무를 쌓았습니다. 사용한 쌓기나무는 모두 몇 개입니까?`,
    num(total),
    `모두 ${num(total)}개입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["iso", "top"] }),
  );
}
function cubeMakeFormFilled(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  const filled = b.h.flat().filter((v) => v > 0).length;
  return make(
    unit,
    `${b.grid} 바닥에 여러 가지 모양으로 쌓기나무를 쌓았습니다. 나무가 놓인 바닥 칸은 몇 칸입니까?`,
    num(filled),
    `${num(filled)}칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}
function cubeMakeFormFloor(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = stackBase(rng);
  return make(
    unit,
    `${b.grid} 바닥에 여러 가지 모양으로 쌓기나무를 쌓았습니다. 바닥은 모두 몇 칸입니까?`,
    num(b.cols * b.rows),
    `${expr(`${b.cols}\\times${b.rows}=${b.cols * b.rows}`)} 칸입니다.`,
    fig("stackCubes", { voxels: heightsToVoxels(b.h), views: ["top"] }),
  );
}

function ratioPropFormK(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 7);
  return make(
    unit,
    `비 ${expr(`${a}:${b}`)} 의 전항과 후항에 각각 ${num(k)}${numJosa(k, "을", "를")} 곱한 뒤 두 항의 차는 얼마입니까?`,
    num(k * Math.abs(a - b)),
    `${expr(`${Math.max(a, b) * k}-${Math.min(a, b) * k}=${k * Math.abs(a - b)}`)} 입니다.`,
  );
}
function ratioPropFormFront(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 7);
  return make(
    unit,
    `비 ${expr(`${a}:${b}`)} 의 전항과 후항에 각각 ${num(k)}${numJosa(k, "을", "를")} 곱한 비에서 전항은 얼마입니까?`,
    num(a * k),
    `${expr(`${a}\\times${k}=${a * k}`)} 입니다.`,
  );
}
function ratioPropFormBack(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 7);
  return make(
    unit,
    `비 ${expr(`${a}:${b}`)} 의 전항과 후항에 각각 ${num(k)}${numJosa(k, "을", "를")} 곱한 비에서 후항은 얼마입니까?`,
    num(b * k),
    `${expr(`${b}\\times${k}=${b * k}`)} 입니다.`,
  );
}
function ratioPropFormSameTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 7);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`${a}:${b}`)} 와 ${expr(`${a * k}:${b * k}`)} 의 비율은 같다.`,
    "예",
    `같은 수를 곱해도 비율은 같습니다.`,
  );
}
function ratioPropFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 7);
  return make(
    unit,
    `비 ${expr(`${a}:${b}`)} 의 전항과 후항에 ${num(k)}${numJosa(k, "을", "를")} 곱한 뒤 두 항의 합은 얼마입니까?`,
    num((a + b) * k),
    `${expr(`(${a}+${b})\\times${k}=${(a + b) * k}`)} 입니다.`,
  );
}
function ratioPropFormQuotFront(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const g = intBetween(rng, 2, 7);
  return make(
    unit,
    `비 ${expr(`${a * g}:${b * g}`)} 의 전항과 후항을 각각 ${num(g)}${numRo(g)} 나눈 비에서 전항은 얼마입니까?`,
    num(a),
    `${expr(`${a * g}\\div${g}=${a}`)} 입니다.`,
  );
}

function simpleRatioFormGcd(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const g = intBetween(rng, 2, 9);
  return make(
    unit,
    `${expr(`${a * g}:${b * g}`)} 를 가장 간단한 자연수의 비로 나타낼 때, 두 항을 나누는 수는 얼마입니까?`,
    num(g),
    `최대공약수는 ${num(g)}입니다.`,
  );
}
function simpleRatioFormFront(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const g = intBetween(rng, 2, 9);
  return make(
    unit,
    `${expr(`${a * g}:${b * g}`)} 를 가장 간단한 자연수의 비로 나타낼 때 전항은 얼마입니까?`,
    num(a),
    `${expr(`${a * g}\\div${g}=${a}`)} 입니다.`,
  );
}
function simpleRatioFormBack(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const g = intBetween(rng, 2, 9);
  return make(
    unit,
    `${expr(`${a * g}:${b * g}`)} 를 가장 간단한 자연수의 비로 나타낼 때 후항은 얼마입니까?`,
    num(b),
    `${expr(`${b * g}\\div${g}=${b}`)} 입니다.`,
  );
}
function simpleRatioFormSimple(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const g = intBetween(rng, 2, 9);
  return make(
    unit,
    `${expr(`${a * g}:${b * g}`)} 를 가장 간단한 자연수의 비로 나타내시오.`,
    expr(`${a}:${b}`),
    `${expr(`${a}:${b}`)} 입니다.`,
  );
}
function simpleRatioFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const g = intBetween(rng, 2, 9);
  return make(
    unit,
    `${expr(`${a * g}:${b * g}`)} 를 가장 간단한 자연수의 비로 나타낸 뒤 두 항의 합은 얼마입니까?`,
    num(a + b),
    `${expr(`${a}+${b}=${a + b}`)} 입니다.`,
  );
}
function simpleRatioFormProd(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const g = intBetween(rng, 2, 9);
  return make(
    unit,
    `${expr(`${a * g}:${b * g}`)} 를 가장 간단한 자연수의 비로 나타낸 뒤 두 항의 곱은 얼마입니까?`,
    num(a * b),
    `${expr(`${a}\\times${b}=${a * b}`)} 입니다.`,
  );
}

function propEqFormInner(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 6);
  return make(
    unit,
    `비례식 ${expr(`${a}:${b}=${a * k}:${b * k}`)} 에서 내항의 두 수를 차례로 쓰시오.`,
    expr(`${b},\\ ${a * k}`),
    `내항은 ${expr(`${b},\\ ${a * k}`)} 입니다.`,
  );
}
function propEqFormOuter(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 6);
  return make(
    unit,
    `비례식 ${expr(`${a}:${b}=${a * k}:${b * k}`)} 에서 외항의 두 수를 차례로 쓰시오.`,
    expr(`${a},\\ ${b * k}`),
    `외항은 ${expr(`${a},\\ ${b * k}`)} 입니다.`,
  );
}
function propEqFormIsTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 6);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`${a}:${b}=${a * k}:${b * k}`)} 는 비례식이다.`,
    "예",
    `두 비의 비율이 같으므로 비례식입니다.`,
  );
}
function propEqFormInnerProd(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 6);
  return make(
    unit,
    `비례식 ${expr(`${a}:${b}=${a * k}:${b * k}`)} 에서 내항의 곱은 얼마입니까?`,
    num(b * a * k),
    `${expr(`${b}\\times${a * k}=${b * a * k}`)} 입니다.`,
  );
}
function propEqFormOuterProd(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 6);
  return make(
    unit,
    `비례식 ${expr(`${a}:${b}=${a * k}:${b * k}`)} 에서 외항의 곱은 얼마입니까?`,
    num(a * b * k),
    `${expr(`${a}\\times${b * k}=${a * b * k}`)} 입니다.`,
  );
}
function propEqFormEqualTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 6);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n비례식 ${expr(`${a}:${b}=${a * k}:${b * k}`)} 에서 내항의 곱과 외항의 곱은 같다.`,
    "예",
    `둘 다 ${num(a * b * k)}입니다.`,
  );
}

function propRuleFormKnown(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 6);
  return make(
    unit,
    `${expr(`${a}:${b}=${a * k}:\\square`)} 에서 내항의 합은 얼마입니까?`,
    num(b + a * k),
    `내항은 ${num(b)}와 ${num(a * k)}이므로 합은 ${expr(`${b}+${a * k}=${b + a * k}`)} 입니다.`,
  );
}
function propRuleFormInnerFirst(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 6);
  return make(
    unit,
    `비례식 ${expr(`${a}:${b}=${a * k}:${b * k}`)} 에서 왼쪽 내항은 얼마입니까?`,
    num(b),
    `왼쪽 내항은 ${num(b)}입니다.`,
  );
}
function propRuleFormProdEqTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 6);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n${expr(`${a}:${b}=${a * k}:${b * k}`)} 에서 외항의 곱은 내항의 곱과 같다.`,
    "예",
    `비례식의 성질입니다.`,
  );
}
function propRuleFormMissing(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 6);
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 구하시오.\n\n${expr(`${a}:${b}=${a * k}:\\square`)}`,
    num(b * k),
    `${expr(`${a}\\times\\square=${b}\\times${a * k}`)} 이므로 ${expr(`\\square=${b * k}`)} 입니다.`,
  );
}
function propRuleFormInnerProd(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 6);
  return make(
    unit,
    `${expr(`${a}:${b}=${a * k}:${b * k}`)} 에서 내항의 곱은 얼마입니까?`,
    num(b * a * k),
    `${expr(`${b}\\times${a * k}=${a * b * k}`)} 입니다.`,
  );
}
function propRuleFormOuterProd(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 9);
  const k = intBetween(rng, 2, 6);
  return make(
    unit,
    `${expr(`${a}:${b}=${a * k}:${b * k}`)} 에서 외항의 곱은 얼마입니까?`,
    num(a * b * k),
    `${expr(`${a}\\times${b * k}=${a * b * k}`)} 입니다.`,
  );
}

function shareFormParts(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 5);
  const k = intBetween(rng, 3, 9);
  return make(
    unit,
    `${num((a + b) * k)}${numJosa((a + b) * k, "을", "를")} ${expr(`${a}:${b}`)} 로 비례배분할 때, 전체를 몇 묶음으로 나눕니까?`,
    num(a + b),
    `${expr(`${a}+${b}=${a + b}`)} 묶음입니다.`,
  );
}
function shareFormUnit(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 5);
  const k = intBetween(rng, 3, 9);
  const total = (a + b) * k;
  return make(
    unit,
    `${num(total)}${numJosa(total, "을", "를")} ${expr(`${a}:${b}`)} 로 비례배분할 때, 한 묶음의 크기는 얼마입니까?`,
    num(k),
    `${expr(`${total}\\div${a + b}=${k}`)} 입니다.`,
  );
}
function shareFormFirst(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 5);
  const k = intBetween(rng, 3, 9);
  const total = (a + b) * k;
  return make(
    unit,
    `${num(total)}${numJosa(total, "을", "를")} ${expr(`${a}:${b}`)} 로 비례배분할 때, 앞의 수는 얼마입니까?`,
    num(a * k),
    `${expr(`${k}\\times${a}=${a * k}`)} 입니다.`,
  );
}
function shareFormSecond(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 5);
  const k = intBetween(rng, 3, 9);
  const total = (a + b) * k;
  return make(
    unit,
    `${num(total)}${numJosa(total, "을", "를")} ${expr(`${a}:${b}`)} 로 비례배분할 때, 뒤의 수는 얼마입니까?`,
    num(b * k),
    `${expr(`${k}\\times${b}=${b * k}`)} 입니다.`,
  );
}
function shareFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 5);
  const k = intBetween(rng, 3, 9);
  const total = (a + b) * k;
  return make(
    unit,
    `${num(total)}${numJosa(total, "을", "를")} ${expr(`${a}:${b}`)} 로 비례배분한 두 수의 차는 얼마입니까?`,
    num(k * Math.abs(a - b)),
    `${expr(`${Math.max(a, b) * k}-${Math.min(a, b) * k}=${k * Math.abs(a - b)}`)} 입니다.`,
  );
}
function shareFormFront(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = coprimePair(rng, 2, 5);
  const k = intBetween(rng, 3, 9);
  return make(
    unit,
    `${num((a + b) * k)}${numJosa((a + b) * k, "을", "를")} ${expr(`${a}:${b}`)} 로 비례배분할 때, 비의 전항은 얼마입니까?`,
    num(a),
    `전항은 ${num(a)}입니다.`,
  );
}

/** 원 그림 — 치수는 안 적는다(R6). 선분만 보여 준다. */
function circShow(which: "radius" | "diameter") {
  return fig("circleParts", { show: which });
}

function circPiFormHexSide(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원 안에 꼭 맞게 정육각형을 그렸습니다. 이 정육각형의 한 변은 몇 cm입니까? ${FIT_HEX}`,
    num(r),
    `한 변은 반지름과 같은 ${unitNum(r, "cm")} 입니다.`,
    circShow("radius"),
  );
}
function circPiFormDiam(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  return make(
    unit,
    `원의 반지름이 ${unitNum(r, "cm")} 입니다. 이 원의 지름은 몇 cm입니까?`,
    num(2 * r),
    `${expr(`${r}\\times2=${2 * r}`)}`,
    circShow("radius"),
  );
}
function circPiFormShorter(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 4, 20);
  return make(
    unit,
    `지름이 ${unitNum(d, "cm")} 인 원의 원주는 지름의 ${num(4)}배보다 짧습니다. 원주는 몇 cm보다 짧습니까?`,
    num(4 * d),
    `${expr(`${d}\\times4=${4 * d}`)} 보다 짧습니다.`,
  );
}
function circPiFormHexPerim(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원 안에 꼭 맞게 그린 정육각형의 둘레는 몇 cm입니까? ${FIT_HEX}`,
    num(6 * r),
    `${expr(`${r}\\times6=${6 * r}`)}`,
  );
}
function circPiFormBothSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원 안에 꼭 맞게 정육각형을 그리고, 같은 원 밖에 꼭 맞게 정사각형을 그렸습니다. 두 도형의 둘레의 합은 몇 cm입니까? ${FIT_HEX} ${ALSO_SQUARE}`,
    num(14 * r),
    `정육각형 둘레 ${expr(`${r}\\times6=${6 * r}`)}, 정사각형 둘레 ${expr(`${2 * r}\\times4=${8 * r}`)} 이므로 합은 ${expr(`${6 * r}+${8 * r}=${14 * r}`)} 입니다.`,
  );
}
function circPiFormLongerTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 4, 18);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n지름이 ${unitNum(d, "cm")} 인 원의 원주는 지름의 ${num(3)}배보다 길다.`,
    "예",
    `원주는 지름의 ${num(3)}배보다 깁니다.`,
  );
}

function circLenFormDiam(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 16);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원이 있습니다. 원주를 구하기 전에 먼저 지름을 구하면 몇 cm입니까?`,
    num(2 * r),
    `${expr(`${r}\\times2=${2 * r}`)}`,
    circShow("radius"),
  );
}
function circLenFormPi(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 3, 24);
  return make(
    unit,
    `지름이 ${unitNum(d, "cm")} 인 원의 원주에서 지름을 빼면 몇 cm입니까? (원주율: ${num(3)})`,
    num(2 * d),
    `원주는 ${expr(`${d}\\times3=${3 * d}`)} 이므로 ${expr(`${3 * d}-${d}=${2 * d}`)} 입니다.`,
  );
}
function circLenFormDiamFromC(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 3, 24);
  return make(
    unit,
    `원주가 ${unitNum(3 * d, "cm")} 인 원의 지름은 몇 cm입니까? (원주율: ${num(3)})`,
    num(d),
    `${expr(`${3 * d}\\div3=${d}`)}`,
  );
}
function circLenFormFromR(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 16);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원의 원주는 몇 cm입니까? (원주율: ${num(3)})`,
    num(6 * r),
    `지름은 ${expr(`${r}\\times2=${2 * r}`)} 이므로 ${expr(`${2 * r}\\times3=${6 * r}`)}`,
    circShow("radius"),
  );
}
function circLenFormTwoTurns(unit: UnitSeed, rng: Rng): ElemProblem {
  const roller = pick(rng, ROLLERS);
  const d = intBetween(rng, 3, 14);
  return make(
    unit,
    `지름이 ${unitNum(d, "cm")} 인 ${roller}${josa(roller, "을", "를")} ${num(2)}바퀴 굴렸습니다. 굴러간 거리는 몇 cm입니까? (원주율: ${num(3)})`,
    num(6 * d),
    `한 바퀴는 ${expr(`${d}\\times3=${3 * d}`)} 이므로 두 바퀴는 ${expr(`${3 * d}\\times2=${6 * d}`)} 입니다.`,
  );
}
function circLenFormCircPlusD(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 3, 20);
  return make(
    unit,
    `지름이 ${unitNum(d, "cm")} 인 원의 원주와 지름의 합은 몇 cm입니까? (원주율: ${num(3)})`,
    num(4 * d),
    `${expr(`${d}\\times3+${d}=${4 * d}`)}`,
  );
}

function circAppFormSqSide(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 3, 16);
  const d = 2 * r;
  return make(
    unit,
    `지름이 ${unitNum(d, "cm")} 인 원 밖에 꼭 맞게 정사각형을 그렸습니다. 이 정사각형의 한 변은 몇 cm입니까? ${FIT_SQUARE}`,
    num(d),
    `한 변은 지름과 같은 ${unitNum(d, "cm")} 입니다.`,
    circShow("diameter"),
  );
}
function circAppFormDiag(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 3, 16);
  const d = 2 * r;
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원 안에 꼭 맞게 마름모를 그렸습니다. 이 마름모의 한 대각선은 몇 cm입니까? ${FIT_RHOMBUS}`,
    num(d),
    `대각선은 지름과 같은 ${unitNum(d, "cm")} 입니다.`,
    circShow("diameter"),
  );
}
function circAppFormSqArea(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 3, 16);
  const d = 2 * r;
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원 밖에 꼭 맞게 그린 정사각형의 넓이는 몇 cm²입니까? ${FIT_SQUARE}`,
    num(4 * r * r),
    `${expr(`${d}\\times${d}=${4 * r * r}`)}`,
  );
}
function circAppFormDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 3, 16);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원 밖에 꼭 맞게 그린 정사각형의 넓이에서, 같은 원 안에 꼭 맞게 그린 마름모의 넓이를 빼면 몇 cm²입니까? ${FIT_RHOMBUS} ${ALSO_SQUARE}`,
    num(2 * r * r),
    `정사각형 ${expr(`${2 * r}\\times${2 * r}=${4 * r * r}`)}, 마름모 ${expr(`${2 * r}\\times${2 * r}\\div2=${2 * r * r}`)} 이므로 차는 ${expr(`${4 * r * r}-${2 * r * r}=${2 * r * r}`)} 입니다.`,
  );
}
function circAppFormSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 3, 16);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원 안의 마름모와 원 밖의 정사각형의 넓이의 합은 몇 cm²입니까? ${FIT_RHOMBUS} ${ALSO_SQUARE}`,
    num(6 * r * r),
    `${expr(`${2 * r * r}+${4 * r * r}=${6 * r * r}`)}`,
  );
}
function circAppFormBetweenTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 3, 14);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n반지름이 ${unitNum(r, "cm")} 인 원의 넓이는 그 원 안에 꼭 맞게 그린 마름모의 넓이보다 크다. ${FIT_RHOMBUS}`,
    "예",
    `원의 넓이는 안쪽 마름모보다 크고 바깥 정사각형보다 작습니다.`,
  );
}

function circAreaFormR2(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 16);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원의 넓이를 구할 때, (반지름)×(반지름)의 값은 얼마입니까?`,
    num(r * r),
    `${expr(`${r}\\times${r}=${r * r}`)}`,
  );
}
function circAreaFormDiam(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 16);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원이 있습니다. 이 원의 지름은 몇 cm입니까?`,
    num(2 * r),
    `${expr(`${r}\\times2=${2 * r}`)}`,
    circShow("radius"),
  );
}
function circAreaFormPi(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 16);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원의 넓이를 반지름으로 나누면 몇 cm입니까? (원주율: ${num(3)})`,
    num(3 * r),
    `넓이는 ${expr(`${r}\\times${r}\\times3=${3 * r * r}`)} 이므로 ${expr(`${3 * r * r}\\div${r}=${3 * r}`)} 입니다.`,
  );
}
function circAreaFormTwoSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  const s = r + intBetween(rng, 1, 5);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원과 반지름이 ${unitNum(s, "cm")} 인 원의 넓이의 합은 몇 cm²입니까? (원주율: ${num(3)})`,
    num(3 * r * r + 3 * s * s),
    `${expr(`${r}\\times${r}\\times3+${s}\\times${s}\\times3=${3 * r * r + 3 * s * s}`)}`,
  );
}
function circAreaFormR2FromA(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 16);
  return make(
    unit,
    `넓이가 ${num(3 * r * r)} cm²인 원이 있습니다. (반지름)×(반지름)의 값은 얼마입니까? (원주율: ${num(3)})`,
    num(r * r),
    `${expr(`${3 * r * r}\\div3=${r * r}`)}`,
  );
}
function circAreaFormScale(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원이 있습니다. 반지름을 ${num(2)}배로 늘리면 넓이는 몇 배가 됩니까? (원주율: ${num(3)})`,
    num(4),
    `처음 넓이는 ${expr(`${r}\\times${r}\\times3=${3 * r * r}`)}, 늘린 뒤는 ${expr(`${2 * r}\\times${2 * r}\\times3=${12 * r * r}`)} 이므로 ${expr(`${12 * r * r}\\div${3 * r * r}=4`)} 배입니다.`,
  );
}

function cylKnowFormBases(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원기둥입니다. 밑면인 원은 모두 몇 개입니까?`,
    num(2),
    `원기둥의 밑면은 위와 아래 두 원입니다.`,
    fig("cylinder", { r, h }),
  );
}
function cylKnowFormSide(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원기둥입니다. 옆면은 몇 개입니까?`,
    num(1),
    `원기둥의 옆면은 굽은 면 하나입니다.`,
    fig("cylinder", { r, h }),
  );
}
function cylKnowFormFrontTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원기둥을 앞에서 본 모양은 직사각형이다.`,
    "예",
    `앞에서 보면 가로가 지름, 세로가 높이인 직사각형입니다.`,
    fig("cylinder", { r, h }),
  );
}
function cylKnowFormFrontW(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  const d = 2 * r;
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원기둥을 앞에서 본 직사각형의 가로와 세로의 합은 몇 cm입니까?`,
    num(d + h),
    `가로는 지름 ${expr(`${r}\\times2=${d}`)}, 세로는 높이 ${num(h)} 이므로 합은 ${expr(`${d}+${h}=${d + h}`)} 입니다.`,
    fig("cylinder", { r, h }),
  );
}
function cylKnowFormRPlusH(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원기둥입니다. 밑면의 반지름과 높이의 합은 몇 cm입니까?`,
    num(r + h),
    `${expr(`${r}+${h}=${r + h}`)}`,
    fig("cylinder", { r, h }),
  );
}
function cylKnowFormR(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  const d = 2 * r;
  return make(
    unit,
    `밑면의 지름이 ${unitNum(d, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원기둥입니다. 밑면의 반지름은 몇 cm입니까?`,
    num(r),
    `${expr(`${d}\\div2=${r}`)}`,
    fig("cylinder", { r, h }),
  );
}

function cylNetFormBases(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  return make(
    unit,
    `밑면의 지름이 ${unitNum(2 * r, "cm")} 인 원기둥의 전개도에서 밑면인 원은 모두 몇 개입니까?`,
    num(2),
    `전개도의 밑면은 원 두 개입니다.`,
    fig("netCylinder", { r, h, pi: 3, layout: pick(rng, CYL_NET_LAYOUTS) }),
  );
}
function cylNetFormSideCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 인 원기둥의 전개도에서 옆면인 직사각형은 몇 개입니까?`,
    num(1),
    `옆면을 펼치면 직사각형 하나입니다.`,
    fig("netCylinder", { r, h, pi: 3, layout: pick(rng, CYL_NET_LAYOUTS) }),
  );
}
function cylNetFormFaces(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원기둥의 전개도를 그렸습니다. 전개도를 이루는 면은 모두 몇 개입니까?`,
    num(3),
    `밑면 원 둘과 옆면 직사각형 하나, 모두 ${num(3)}개입니다.`,
    fig("netCylinder", { r, h, pi: 3, layout: pick(rng, CYL_NET_LAYOUTS) }),
  );
}
function cylNetFormHeight(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 4, 18);
  const d = 2 * r;
  const w = 3 * d;
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원기둥의 전개도에서 옆면인 직사각형의 둘레는 몇 cm입니까? (원주율: ${num(3)})`,
    num(2 * (w + h)),
    `가로는 ${expr(`${d}\\times3=${w}`)}, 세로는 ${num(h)} 이므로 둘레는 ${expr(`(${w}+${h})\\times2=${2 * (w + h)}`)} 입니다.`,
    fig("netCylinder", { r, h, pi: 3, layout: pick(rng, CYL_NET_LAYOUTS) }),
  );
}
function cylNetFormDiam(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 인 원기둥의 전개도입니다. 밑면인 원의 지름은 몇 cm입니까?`,
    num(2 * r),
    `${expr(`${r}\\times2=${2 * r}`)}`,
    fig("netCylinder", { r, h, pi: 3, layout: pick(rng, CYL_NET_LAYOUTS) }),
  );
}
function cylNetFormRectSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 10);
  const h = intBetween(rng, 3, 12);
  const d = 2 * r;
  const w = d * 3;
  return make(
    unit,
    `밑면의 지름이 ${unitNum(d, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원기둥의 전개도에서 옆면인 직사각형의 가로와 세로의 합은 몇 cm입니까? (원주율: ${num(3)})`,
    num(w + h),
    `가로는 ${expr(`${d}\\times3=${w}`)}, 세로는 ${num(h)} 이므로 합은 ${expr(`${w}+${h}=${w + h}`)} 입니다.`,
    fig("netCylinder", { r, h, pi: 3, layout: pick(rng, CYL_NET_LAYOUTS) }),
  );
}

function coneKnowFormBases(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 인 원뿔입니다. 밑면인 원은 몇 개입니까?`,
    num(1),
    `원뿔의 밑면은 원 하나입니다.`,
    fig("cone", { r, h }),
  );
}
function coneKnowFormApex(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원뿔입니다. 뿔의 꼭짓점은 몇 개입니까?`,
    num(1),
    `원뿔의 꼭짓점은 하나뿐입니다.`,
    fig("cone", { r, h }),
  );
}
function coneKnowFormDiam(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원뿔입니다. 밑면의 반지름과 높이의 합은 몇 cm입니까?`,
    num(r + h),
    `${expr(`${r}+${h}=${r + h}`)}`,
    fig("cone", { r, h }),
  );
}
function coneKnowFormFrontBase(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  const d = 2 * r;
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원뿔을 앞에서 본 삼각형의 밑변과 높이의 합은 몇 cm입니까?`,
    num(d + h),
    `밑변은 지름 ${expr(`${r}\\times2=${d}`)} 이고 높이는 ${num(h)} 이므로 합은 ${expr(`${d}+${h}=${d + h}`)} 입니다.`,
    fig("cone", { r, h }),
  );
}
function coneKnowFormFrontH(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 16);
  const d = 2 * r;
  return make(
    unit,
    `밑면의 지름이 ${unitNum(d, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원뿔을 앞에서 본 삼각형의 넓이는 몇 cm²입니까?`,
    num(r * h),
    `밑변 ${num(d)}, 높이 ${num(h)} 인 삼각형이므로 ${expr(`${d}\\times${h}\\div2=${r * h}`)}`,
    fig("cone", { r, h }),
  );
}
function coneKnowFormSide(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원뿔입니다. 옆면은 몇 개입니까?`,
    num(1),
    `원뿔의 옆면은 굽은 면 하나입니다.`,
    fig("cone", { r, h }),
  );
}

function ballKnowFormCutTf(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 20);
  return make(
    unit,
    `다음이 맞으면 예, 틀리면 아니요를 쓰시오.\n\n반지름이 ${unitNum(r, "cm")} 인 구를 중심을 지나게 자르면 잘린 면은 원이다.`,
    "예",
    `구를 중심을 지나게 자르면 잘린 면은 구와 반지름이 같은 원입니다.`,
    fig("sphere", { r }),
  );
}
function ballKnowFormD(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 3, 18);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 구가 있습니다. 이 구의 반지름과 지름의 합은 몇 cm입니까?`,
    num(3 * r),
    `지름은 ${expr(`${r}\\times2=${2 * r}`)} 이므로 합은 ${expr(`${r}+${2 * r}=${3 * r}`)} 입니다.`,
    fig("sphere", { r }),
  );
}
function ballKnowFormCutR(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 20);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 구를 중심을 지나게 잘랐습니다. 잘린 면인 원의 지름은 몇 cm입니까?`,
    num(2 * r),
    `잘린 면의 지름은 ${expr(`${r}\\times2=${2 * r}`)} 입니다.`,
    fig("sphere", { r }),
  );
}
function ballKnowFormCutD(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 20);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 구를 중심을 지나게 잘랐습니다. 잘린 면인 원의 지름을 두 배로 하면 몇 cm입니까?`,
    num(4 * r),
    `지름은 ${expr(`${r}\\times2=${2 * r}`)} 이므로 두 배는 ${expr(`${2 * r}\\times2=${4 * r}`)} 입니다.`,
    fig("sphere", { r }),
  );
}
function ballKnowFormCutArea(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 구를 중심을 지나게 잘랐습니다. 잘린 면의 넓이는 몇 cm²입니까? (원주율: ${num(3)})`,
    num(3 * r * r),
    `잘린 면은 반지름이 ${unitNum(r, "cm")} 인 원이므로 ${expr(`${r}\\times${r}\\times3=${3 * r * r}`)}`,
    fig("sphere", { r }),
  );
}
function ballKnowFormCutC(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 16);
  const d = 2 * r;
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 구를 중심을 지나게 잘랐습니다. 잘린 면의 둘레는 몇 cm입니까? (원주율: ${num(3)})`,
    num(3 * d),
    `지름은 ${expr(`${r}\\times2=${d}`)} 이므로 둘레는 ${expr(`${d}\\times3=${3 * d}`)} 입니다.`,
    fig("sphere", { r }),
  );
}

export const G6_FORMS: Record<string, readonly ElemForm[]> = {
  "초6|1-1-1": forms10(natDivCalc, natDivWord, natDivApply, natDivDeep, {
    b5: natDivFormDen,
    b6: natDivFormNum,
    b7: natDivFormReciprocalTf,
    a8: natDivFormSum,
    a9: natDivFormHalfShare,
    a10: natDivFormLarger,
  }),
  "초6|1-1-2": forms10(fracNatCalc, fracNatWord, fracNatApply, fracNatDeep, {
    b5: fracNatFormMulDen,
    b6: fracNatFormKeepNum,
    b7: fracNatFormWrongRuleTf,
    a8: fracNatFormSum,
    a9: fracNatFormTimesPiece,
    a10: fracNatFormDiff,
  }),
  "초6|1-1-3": forms10(
    mixedNatCalc,
    mixedNatWord,
    mixedNatApply,
    mixedNatDeep,
    {
      b5: mixedNatFormImpNum,
      b6: mixedNatFormWhole,
      b7: mixedNatFormHalfConvertTf,
      a8: mixedNatFormSum,
      a9: mixedNatFormPolyPerim,
      a10: mixedNatFormDiff,
    },
  ),
  "초6|1-2-1": forms10(
    prismFaceCalc,
    prismFaceRead,
    prismFaceApply,
    prismFaceDeep,
    {
      b5: prismFaceFormBaseCount,
      b6: prismFaceFormSideShape,
      b7: prismFaceFormBaseShape,
      a8: prismFaceFormOneArea,
      a9: prismFaceFormBasePerim,
      a10: prismFaceFormSideMinusBase,
    },
  ),
  "초6|1-2-2": forms10(
    prismPartCalc,
    prismPartRead,
    prismPartApply,
    prismPartDeep,
    {
      b5: prismPartFormBaseSides,
      b6: prismPartFormEuler,
      b7: prismPartFormBaseVerts,
      a8: prismPartFormVertical,
      a9: prismPartFormBaseEdges,
      a10: prismPartFormMeet,
    },
  ),
  "초6|1-2-3": forms10(netCalc, netRead, netApply, netDeep, {
    b5: netFormBaseCount,
    b6: netFormSideShape,
    b7: netFormFaceTotal,
    a8: netFormTwoBasePerim,
    a9: netFormFoldedBase,
    a10: netFormSideMinusBase,
  }),
  "초6|1-2-4": forms10(pyrFaceCalc, pyrFaceRead, pyrFaceApply, pyrFaceDeep, {
    b5: pyrFaceFormBaseCount,
    b6: pyrFaceFormSideShape,
    b7: pyrFaceFormBaseShape,
    a8: pyrFaceFormOneArea,
    a9: pyrFaceFormBasePerim,
    a10: pyrFaceFormSideMinusBase,
  }),
  "초6|1-2-5": forms10(pyrPartCalc, pyrPartRead, pyrPartApply, pyrPartDeep, {
    b5: pyrPartFormBaseSides,
    b6: pyrPartFormEuler,
    b7: pyrPartFormBaseVerts,
    a8: pyrPartFormApexEdges,
    a9: pyrPartFormBaseEdges,
    a10: pyrPartFormApex,
  }),
  "초6|1-3-1": forms10(decNatCalc, decNatWord, decNatApply, decNatDeep, {
    b5: decNatFormDivisor,
    b6: decNatFormWhole,
    b7: decNatFormUnderTf,
    a8: decNatFormSum,
    a9: decNatFormAfterShare,
    a10: decNatFormDiff,
  }),
  "초6|1-3-2": forms10(
    decUnderCalc,
    decUnderWord,
    decUnderApply,
    decUnderDeep,
    {
      b5: decUnderFormWholeZero,
      b6: decUnderFormSmallerTf,
      b7: decUnderFormOverTf,
      a8: decUnderFormSum,
      a9: decUnderFormTimesPiece,
      a10: decUnderFormDiff,
    },
  ),
  "초6|1-3-3": forms10(
    decBringCalc,
    decBringWord,
    decBringApply,
    decBringDeep,
    {
      b5: decBringFormDivisor,
      b6: decBringFormHundredth,
      b7: decBringFormZeroTf,
      a8: decBringFormSum,
      a9: decBringFormTwoDays,
      a10: decBringFormDiff,
    },
  ),
  "초6|1-3-4": forms10(decZeroCalc, decZeroWord, decZeroApply, decZeroDeep, {
    b5: decZeroFormDivisor,
    b6: decZeroFormTenthZero,
    b7: decZeroFormPlaceTf,
    a8: decZeroFormSum,
    a9: decZeroFormCheck,
    a10: decZeroFormDiff,
  }),
  "초6|1-3-5": forms10(natDecCalc, natDecWord, natDecApply, natDecDeep, {
    b5: natDecFormDivisor,
    b6: natDecFormNaturalTf,
    b7: natDecFormQuotientNatTf,
    a8: natDecFormSum,
    a9: natDecFormDoubleShare,
    a10: natDecFormDiff,
  }),
  "초6|1-4-1": forms10(cmpCalc, cmpWord, cmpApply, cmpDeep, {
    b5: cmpFormSmall,
    b6: cmpFormProduct,
    b7: cmpFormReverseTf,
    a8: cmpFormChain,
    a9: cmpFormLargerFromSum,
    a10: cmpFormTwoKSum,
  }),
  "초6|1-4-2": forms10(biCalc, biWord, biApply, biDeep, {
    b5: biFormInverse,
    b6: biFormFront,
    b7: biFormBack,
    a8: biFormSum,
    a9: biFormDiff,
    a10: biFormWholeSecond,
  }),
  "초6|1-4-3": forms10(rateCalc, rateWord, rateApply, rateDeep, {
    b5: rateFormFrac,
    b6: rateFormBase,
    b7: rateFormCompare,
    a8: rateFormTimes,
    a9: rateFormRest,
    a10: rateFormLarger,
  }),
  "초6|1-4-4": forms10(rateUseCalc, rateUseWord, rateUseApply, rateUseDeep, {
    b5: rateUseFormTime,
    b6: rateUseFormBaseTf,
    b7: rateUseFormArea,
    a8: rateUseFormWater,
    a9: rateUseFormTwoLegs,
    a10: rateUseFormSpeedDiff,
  }),
  "초6|1-4-5": forms10(pctCalc, pctWord, pctApply, pctDeep, {
    b5: pctFormFromFrac,
    b6: pctFormToFrac,
    b7: pctFormToDec,
    a8: pctFormSum,
    a9: pctFormRest,
    a10: pctFormLarger,
  }),
  "초6|1-4-6": forms10(pctUseCalc, pctUseWord, pctUseApply, pctUseDeep, {
    b5: pctUseFormRate,
    b6: pctUseFormCut,
    b7: pctUseFormInterest,
    a8: pctUseFormPrincipalPlus,
    a9: pctUseFormNo,
    a10: pctUseFormPaidDiff,
  }),
  "초6|1-5-1": forms10(
    stripReadCalc,
    stripReadWord,
    stripReadApply,
    stripReadDeep,
    {
      b5: stripReadFormCount,
      b6: stripReadFormLeast,
      b7: stripReadFormAll100,
      a8: stripReadFormTwoSum,
      a9: stripReadFormMaxPct,
      a10: stripReadFormRest,
    },
  ),
  "초6|1-5-2": forms10(
    stripDrawCalc,
    stripDrawWord,
    stripDrawApply,
    stripDrawDeep,
    {
      b5: stripDrawFormRest,
      b6: stripDrawFormTwoCount,
      b7: stripDrawFormLenRest,
      a8: stripDrawFormPctDiff,
      a9: stripDrawFormCount,
      a10: stripDrawFormTwoLen,
    },
  ),
  "초6|1-5-3": forms10(pieReadCalc, pieReadWord, pieReadApply, pieReadDeep, {
    b5: pieReadFormCount,
    b6: pieReadFormLeast,
    b7: pieReadFormAll100,
    a8: pieReadFormTwoSum,
    a9: pieReadFormMaxPct,
    a10: pieReadFormRest,
  }),
  "초6|1-5-4": forms10(pieDrawCalc, pieDrawWord, pieDrawApply, pieDrawDeep, {
    b5: pieDrawFormRest,
    b6: pieDrawFormAngle,
    b7: pieDrawFormDiff,
    a8: pieDrawFormCount,
    a9: pieDrawFormTwoAngles,
    a10: pieDrawFormTwoPeople,
  }),
  "초6|1-5-5": forms10(
    cmpChartCalc,
    cmpChartWord,
    cmpChartApply,
    cmpChartDeep,
    {
      b5: cmpChartFormLowPct,
      b6: cmpChartFormCount,
      b7: cmpChartFormAll100,
      a8: cmpChartFormTopName,
      a9: cmpChartFormSpread,
      a10: cmpChartFormSecond,
    },
  ),
  "초6|1-6-1": forms10(surfCalc, surfWord, surfApply, surfDeep, {
    b5: surfFormBase,
    b6: surfFormFaces,
    b7: surfFormLateral,
    a8: surfFormTwoBases,
    a9: surfFormMinusLid,
    a10: surfFormEdgeFromArea,
  }),
  "초6|1-6-2": forms10(volCalc, volWord, volApply, volDeep, {
    b5: volFormBase,
    b6: volFormWd,
    b7: volFormSum,
    a8: volFormDiff,
    a9: volFormCubes,
    a10: volFormDoubleOne,
  }),
  "초6|1-6-3": forms10(cubicCalc, cubicWord, cubicApply, cubicDeep, {
    b5: cubicFormFactTf,
    b6: cubicFormToM,
    b7: cubicFormSumCm,
    a8: cubicFormBoxM,
    a9: cubicFormBoxToCm,
    a10: cubicFormDiffM,
  }),
  "초6|2-1-1": forms10(sameDenCalc, sameDenWord, sameDenApply, sameDenDeep, {
    b5: sameDenFormTop,
    b6: sameDenFormDivTop,
    b7: sameDenFormDen,
    a8: sameDenFormSameTf,
    a9: sameDenFormSum,
    a10: sameDenFormCheck,
  }),
  "초6|2-1-2": forms10(diffDenCalc, diffDenWord, diffDenApply, diffDenDeep, {
    b5: diffDenFormDen1,
    b6: diffDenFormDen2,
    b7: diffDenFormDiffTf,
    a8: diffDenFormRecipNum,
    a9: diffDenFormDenProd,
    a10: diffDenFormQuot,
  }),
  "초6|2-1-3": forms10(natFracCalc, natFracWord, natFracApply, natFracDeep, {
    b5: natFracFormNat,
    b6: natFracFormDen,
    b7: natFracFormRecipNum,
    a8: natFracFormTimesDen,
    a9: natFracFormSum,
    a10: natFracFormNum,
  }),
  "초6|2-1-4": forms10(flipCalc, flipWord, flipApply, flipDeep, {
    b5: flipFormRecipNum,
    b6: flipFormRecipDen,
    b7: flipFormRuleTf,
    a8: flipFormDivNum,
    a9: flipFormDenSum,
    a10: flipFormValue,
  }),
  "초6|2-1-5": forms10(
    mixedFracCalc,
    mixedFracWord,
    mixedFracApply,
    mixedFracDeep,
    {
      b5: mixedFracFormWhole,
      b6: mixedFracFormImp,
      b7: mixedFracFormDen,
      a8: mixedFracFormImpDen,
      a9: mixedFracFormQuot,
      a10: mixedFracFormWholePlusDen,
    },
  ),
  "초6|2-2-1": forms10(sameDpCalc, sameDpWord, sameDpApply, sameDpDeep, {
    b5: sameDpFormDivisor,
    b6: sameDpFormDividend,
    b7: sameDpFormSameTf,
    a8: sameDpFormQuot,
    a9: sameDpFormProd,
    a10: sameDpFormSum,
  }),
  "초6|2-2-2": forms10(diffDpCalc, diffDpWord, diffDpApply, diffDpDeep, {
    b5: diffDpFormDivisor,
    b6: diffDpFormDividend,
    b7: diffDpFormDiffTf,
    a8: diffDpFormQuot,
    a9: diffDpFormShift,
    a10: diffDpFormSum,
  }),
  "초6|2-2-3": forms10(natDpCalc, natDpWord, natDpApply, natDpDeep, {
    b5: natDpFormNat,
    b6: natDpFormDivisor,
    b7: natDpFormNatTf,
    a8: natDpFormQuot,
    a9: natDpFormTimes,
    a10: natDpFormSum,
  }),
  "초6|2-2-4": forms10(roundCalc, roundWord, roundApply, roundDeep, {
    b5: roundFormPlace,
    b6: roundFormNextDigit,
    b7: roundFormDoesTf,
    a8: roundFormResult,
    a9: roundFormShown,
    a10: roundFormDivisor,
  }),
  "초6|2-2-5": forms10(remCalc, remWord, remApply, remDeep, {
    b5: remFormQuot,
    b6: remFormRem,
    b7: remFormDivisor,
    a8: remFormUsed,
    a9: remFormTotal,
    a10: remFormSmallerTf,
  }),
  "초6|2-3-1": forms10(viewCalc, viewWord, viewApply, viewDeep, {
    b5: viewFormCols,
    b6: viewFormRows,
    b7: viewFormFloor,
    a8: viewFormFilled,
    a9: viewFormMax,
    a10: viewFormSumFloorFilled,
  }),
  "초6|2-3-2": forms10(cubeOneCalc, cubeOneWord, cubeOneApply, cubeOneDeep, {
    b5: cubeOneFormCols,
    b6: cubeOneFormRows,
    b7: cubeOneFormFilled,
    a8: cubeOneFormMax,
    a9: cubeOneFormFloor,
    a10: cubeOneFormExtra,
  }),
  "초6|2-3-3": forms10(cubeTwoCalc, cubeTwoWord, cubeTwoApply, cubeTwoDeep, {
    b5: cubeTwoFormMax,
    b6: cubeTwoFormCols,
    b7: cubeTwoFormRows,
    a8: cubeTwoFormTotal,
    a9: cubeTwoFormFilled,
    a10: cubeTwoFormFloor,
  }),
  "초6|2-3-4": forms10(
    cubeLayerCalc,
    cubeLayerWord,
    cubeLayerApply,
    cubeLayerDeep,
    {
      b5: cubeLayerFormMax,
      b6: cubeLayerFormCols,
      b7: cubeLayerFormRows,
      a8: cubeLayerFormTotal,
      a9: cubeLayerFormFilled,
      a10: cubeLayerFormFloor,
    },
  ),
  "초6|2-3-5": forms10(cubeBoxCalc, cubeBoxWord, cubeBoxApply, cubeBoxDeep, {
    b5: cubeBoxFormCols,
    b6: cubeBoxFormRows,
    b7: cubeBoxFormMax,
    a8: cubeBoxFormTotal,
    a9: cubeBoxFormFilled,
    a10: cubeBoxFormFloor,
  }),
  "초6|2-3-6": forms10(
    cubeMakeCalc,
    cubeMakeWord,
    cubeMakeApply,
    cubeMakeDeep,
    {
      b5: cubeMakeFormCols,
      b6: cubeMakeFormRows,
      b7: cubeMakeFormMax,
      a8: cubeMakeFormTotal,
      a9: cubeMakeFormFilled,
      a10: cubeMakeFormFloor,
    },
  ),
  "초6|2-4-1": forms10(
    ratioPropCalc,
    ratioPropWord,
    ratioPropApply,
    ratioPropDeep,
    {
      b5: ratioPropFormK,
      b6: ratioPropFormFront,
      b7: ratioPropFormBack,
      a8: ratioPropFormSameTf,
      a9: ratioPropFormSum,
      a10: ratioPropFormQuotFront,
    },
  ),
  "초6|2-4-2": forms10(
    simpleRatioCalc,
    simpleRatioWord,
    simpleRatioApply,
    simpleRatioDeep,
    {
      b5: simpleRatioFormGcd,
      b6: simpleRatioFormFront,
      b7: simpleRatioFormBack,
      a8: simpleRatioFormSimple,
      a9: simpleRatioFormSum,
      a10: simpleRatioFormProd,
    },
  ),
  "초6|2-4-3": forms10(propEqCalc, propEqWord, propEqApply, propEqDeep, {
    b5: propEqFormInner,
    b6: propEqFormOuter,
    b7: propEqFormIsTf,
    a8: propEqFormInnerProd,
    a9: propEqFormOuterProd,
    a10: propEqFormEqualTf,
  }),
  "초6|2-4-4": forms10(
    propRuleCalc,
    propRuleWord,
    propRuleApply,
    propRuleDeep,
    {
      b5: propRuleFormKnown,
      b6: propRuleFormInnerFirst,
      b7: propRuleFormProdEqTf,
      a8: propRuleFormMissing,
      a9: propRuleFormInnerProd,
      a10: propRuleFormOuterProd,
    },
  ),
  "초6|2-4-5": forms10(shareCalc, shareWord, shareApply, shareDeep, {
    b5: shareFormParts,
    b6: shareFormUnit,
    b7: shareFormFirst,
    a8: shareFormSecond,
    a9: shareFormSum,
    a10: shareFormFront,
  }),
  "초6|2-5-1": forms10(circPiCalc, circPiWord, circPiApply, circPiDeep, {
    b5: circPiFormHexSide,
    b6: circPiFormDiam,
    b7: circPiFormShorter,
    a8: circPiFormHexPerim,
    a9: circPiFormBothSum,
    a10: circPiFormLongerTf,
  }),
  "초6|2-5-2": forms10(circLenCalc, circLenWord, circLenApply, circLenDeep, {
    b5: circLenFormDiam,
    b6: circLenFormPi,
    b7: circLenFormDiamFromC,
    a8: circLenFormFromR,
    a9: circLenFormTwoTurns,
    a10: circLenFormCircPlusD,
  }),
  "초6|2-5-3": forms10(circAppCalc, circAppWord, circAppApply, circAppDeep, {
    b5: circAppFormSqSide,
    b6: circAppFormDiag,
    b7: circAppFormSqArea,
    a8: circAppFormDiff,
    a9: circAppFormSum,
    a10: circAppFormBetweenTf,
  }),
  "초6|2-5-4": forms10(
    circAreaCalc,
    circAreaWord,
    circAreaApply,
    circAreaDeep,
    {
      b5: circAreaFormR2,
      b6: circAreaFormDiam,
      b7: circAreaFormPi,
      a8: circAreaFormTwoSum,
      a9: circAreaFormR2FromA,
      a10: circAreaFormScale,
    },
  ),
  "초6|2-6-1": forms10(cylKnowCalc, cylKnowWord, cylKnowApply, cylKnowDeep, {
    b5: cylKnowFormBases,
    b6: cylKnowFormSide,
    b7: cylKnowFormFrontTf,
    a8: cylKnowFormFrontW,
    a9: cylKnowFormRPlusH,
    a10: cylKnowFormR,
  }),
  "초6|2-6-2": forms10(cylNetCalc, cylNetWord, cylNetApply, cylNetDeep, {
    b5: cylNetFormBases,
    b6: cylNetFormSideCount,
    b7: cylNetFormFaces,
    a8: cylNetFormHeight,
    a9: cylNetFormDiam,
    a10: cylNetFormRectSum,
  }),
  "초6|2-6-3": forms10(
    coneKnowCalc,
    coneKnowWord,
    coneKnowApply,
    coneKnowDeep,
    {
      b5: coneKnowFormBases,
      b6: coneKnowFormApex,
      b7: coneKnowFormDiam,
      a8: coneKnowFormFrontBase,
      a9: coneKnowFormFrontH,
      a10: coneKnowFormSide,
    },
  ),
  "초6|2-6-4": forms10(
    ballKnowCalc,
    ballKnowWord,
    ballKnowApply,
    ballKnowDeep,
    {
      b5: ballKnowFormCutTf,
      b6: ballKnowFormD,
      b7: ballKnowFormCutR,
      a8: ballKnowFormCutD,
      a9: ballKnowFormCutArea,
      a10: ballKnowFormCutC,
    },
  ),
};
