import type { UnitSeed } from "../../../prisma/seed-data/units";

import type { ElemTierMap } from "./difficulty";
import { expr, n as num, polyName, sino, unitNum } from "./format";
import { fig, make, makeDeep } from "./make";
import { divFrac, fmtFrac, gcd, lcm, mulFrac } from "./math";
import { intBetween, pick } from "./rng";
import type { ChapterHandler, ElemProblem, Rng } from "./types";

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
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
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
      `학생들의 ${subject}을 조사하여 나타낸 ${kindName}입니다. 비율이 가장 높은 항목과 가장 낮은 항목의 비율의 차는 몇 %인가?`,
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
      `학생들의 ${subject}을 조사하여 나타낸 원그래프입니다. ` +
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
      `학생들의 ${subject}을 조사한 결과입니다. 이 자료를 전체 길이가 ${unitNum(width, "cm")} 인 띠그래프로 나타낼 때, ` +
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
        `${expr(`${decStr(c.a, 1)}\\div${c.b}`)} 로 계산합니다. ${expr(`${a}\\div${b}=${q}`)}`,
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

const CYL_NET_LAYOUTS = [
  "opp",
  "oppFlip",
  "oppMid",
  "sameTop",
  "sameBot",
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

/** 수 뒤의 「로/으로」. **ㄹ 받침은 「로」**다(일로·칠로·팔로) — 받침 유무만으로는 못 가른다. */
function numRo(value: number): string {
  const last = Math.abs(Math.trunc(value)) % 10;
  if (last === 0) return "으로";
  return last === 3 || last === 6 ? "으로" : "로";
}

/**
 * `fmtFrac` 이 낸 글자에서 **마지막으로 읽히는 수**.
 * `11\frac{1}{4}` 는 「십일과 사분의 일」이라 끝소리가 **분자** 다.
 */
function lastSpokenNumber(latex: string): number {
  const frac = latex.match(/\\frac\{(\d+)\}\{(\d+)\}/);
  if (frac) return Number(frac[1]);
  const nums = latex.match(/\d+/g);
  return nums ? Number(nums[nums.length - 1]) : 0;
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
 * 심화 — 역산·조건.
 * ⓐ 옆면 전체의 넓이에서 **높이를 거꾸로** 구한다. ⓑ 옆면의 수에서 **밑면의 모양**을 되짚는다.
 */
function prismFaceDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const n = pick(rng, TIER_SIDES);
  if (intBetween(rng, 0, 1) === 0) {
    const a = intBetween(rng, 3, 9);
    const h = intBetween(rng, 4, 12);
    return make(
      unit,
      `밑면이 ${polyName(n)}인 각기둥의 옆면 전체의 넓이가 ${num(n * a * h)} cm²입니다. ` +
        `밑면의 변의 길이가 모두 ${unitNum(a, "cm")} 로 같을 때, 이 각기둥의 높이는 몇 cm입니까?`,
      num(h),
      `옆면이 ${num(n)}개이므로 옆면 하나의 넓이는 ${expr(`${n * a * h}\\div${n}=${a * h}`)} 입니다. ` +
        `옆면은 가로가 ${unitNum(a, "cm")} 인 직사각형이므로 높이는 ${expr(`${a * h}\\div${a}=${h}`)} 입니다.`,
    );
  }
  return make(
    unit,
    `어떤 각기둥의 옆면이 ${num(n)}개입니다. 이 각기둥의 밑면은 몇 각형입니까?`,
    polyName(n),
    `옆면의 수는 밑면의 변의 수와 같습니다. 옆면이 ${num(n)}개이므로 밑면은 변이 ${num(n)}개인 ${polyName(n)}입니다.`,
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
    `「${num(a)} 대 ${num(b)}」는 기호 ${expr(":")} 을 써서 ${expr(`${a}:${b}`)} 로 나타냅니다.`,
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
    `학생들의 ${subject}을 조사하여 나타낸 띠그래프입니다. ${one.label}의 비율은 몇 %입니까?`,
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
    `학생들의 ${d.subject}을 조사하여 나타낸 띠그래프입니다. 가장 많은 학생이 고른 항목을 쓰시오.`,
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
    `학생들의 ${d.subject}을 조사하여 나타낸 띠그래프입니다. ${one.label}${josa(one.label, "을", "를")} 고른 학생이 ${num(n)}명일 때, ` +
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
    `학생들의 ${subject}을 조사하여 나타낸 원그래프입니다. ${one.label}의 비율은 몇 %입니까?`,
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
    `학생들의 ${d.subject}을 조사하여 나타낸 원그래프입니다. ` +
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
    `학생들의 ${theme.subject}을 조사하여 나타낸 원그래프입니다. ` +
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
    `학생들의 ${d.subject}을 조사하여 나타낸 원그래프입니다. ${x.label}${josa(x.label, "을", "를")} 고른 학생이 ${num(nX)}명일 때, ` +
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
    `학생들의 ${d.subject}을 조사하여 나타낸 ${kindName}입니다. 비율이 가장 높은 항목의 비율은 몇 %입니까?`,
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
    `학생들의 ${d.subject}을 조사하여 나타낸 ${kindName}입니다. ` +
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
    `학생들의 ${d.subject}을 조사하여 나타낸 ${kindName}입니다. ` +
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
    `학생들의 ${d.subject}을 조사하여 나타낸 ${kindName}입니다. ` +
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
  throw new Error("2-1-2 심화: 조건을 만족하는 짝을 못 만들었습니다");
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
  throw new Error("2-1-5 심화: 조건을 만족하는 짝을 못 만들었습니다");
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
      `${expr(`${decStr(c.a, 1)}\\div${c.b}`)} 로 계산합니다. ${expr(`${a}\\div${b}=${q}`)}`,
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
    "2-2-4 심화: 두 자리 모두 반올림이 뜻을 갖는 짝을 못 만들었습니다",
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
  { big: "m", small: "cm", per: 100, ro: "로", thing: "게시판" }, // 센티미터로
  { big: "kg", small: "g", per: 1000, ro: "으로", thing: "상자" }, // 그램으로
  { big: "L", small: "mL", per: 1000, ro: "로", thing: "물통" }, // 밀리리터로
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

/** 심화 — 단위 맞추기·소수 없애기·약분 세 걸음이 겹친다. */
function simpleRatioDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const u = pick(rng, UNIT_MIX);
  // 큰 단위 쪽은 늘 소수 한 자리다 — 10 의 배수는 뺀다(빼지 않으면 «소수» 걸음이 사라진다).
  const big10 = pick(rng, [12, 14, 15, 16, 18, 24, 25] as const);
  let small10 = pick(rng, [4, 5, 6, 8, 9, 12, 15] as const);
  for (let i = 0; i < 20 && small10 === big10; i += 1) {
    small10 = pick(rng, [4, 5, 6, 8, 9, 12, 15] as const);
  }
  const step = u.per / 10;
  const A = big10 * step;
  const B = small10 * step;
  const g = gcd(A, B);
  return make(
    unit,
    `${u.thing}에 담은 두 양을 재었더니 각각 ${unitNum(decStr(big10, 1), u.big)}, ${unitNum(B, u.small)} 이었습니다. ` +
      `앞의 양과 뒤의 양의 비를 가장 간단한 자연수의 비로 나타내시오.`,
    expr(`${A / g}:${B / g}`),
    `${expr(`1\\,\\mathrm{${u.big}}=${u.per}\\,\\mathrm{${u.small}}`)} 이므로 ` +
      `${expr(`${decStr(big10, 1)}\\times${u.per}=${A}`)} 입니다. 단위를 ${u.small}${u.ro} 맞추면 ` +
      `${expr(`${A}:${B}`)} 입니다. ${simplifySentence(A, B)}`,
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
  return make(
    unit,
    `똑같은 모양 ${num(copies)}개를 만드는 데 쌓기나무를 모두 ${num(one * copies)}개 사용했습니다. ` +
      `한 모양에 사용한 쌓기나무는 몇 개인가?`,
    num(one),
    `모양 ${num(copies)}개에 쓴 쌓기나무를 똑같이 나눕니다. ` +
      `${expr(`${one * copies}\\div${copies}=${one}`)} 개입니다.`,
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
  const first = second + intBetween(rng, 1, 4);
  const total = first + second + third;
  return make(
    unit,
    `쌓기나무로 만든 모양의 ${num(1)}층에는 ${num(first)}개, ${num(2)}층에는 ${num(second)}개, ` +
      `${num(3)}층에는 ${num(third)}개가 놓여 있습니다. 사용한 쌓기나무는 모두 몇 개인가?`,
    num(total),
    `층마다 놓인 쌓기나무를 모두 더합니다. ${expr(`${first}+${second}+${third}=${total}`)}`,
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

/** 연산 — 옆면인 직사각형의 가로(= 밑면의 둘레). 표준은 반지름을 주므로 여기서는 **지름**을 준다. */
function cylNetCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 12);
  const h = intBetween(rng, 3, 15);
  const d = 2 * r;
  return make(
    unit,
    `밑면의 지름이 ${unitNum(d, "cm")} 인 원기둥의 전개도입니다. ` +
      `옆면인 직사각형의 가로는 몇 cm인가? (원주율: ${num(3)})`,
    num(d * 3),
    `옆면의 가로는 밑면의 둘레와 같습니다. ${expr(`${d}\\times3=${d * 3}`)}`,
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

/** 응용 — 두 걸음. 가로를 구한 뒤 옆면의 넓이. 원주율 `$3.1$`. */
function cylNetApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 10);
  const h = intBetween(rng, 3, 12);
  // 십분의 일 단위 정수로만 셈해 부동소수점을 안 거친다(R2).
  const latT = 2 * r * 31;
  const areaT = latT * h;
  return make(
    unit,
    `밑면의 반지름이 ${unitNum(r, "cm")} 이고 높이가 ${unitNum(h, "cm")} 인 원기둥의 전개도에서 ` +
      `옆면의 넓이는 몇 cm²인가? (원주율: ${num("3.1")})`,
    num(fromTenths(areaT)),
    `옆면의 가로는 밑면의 둘레와 같으므로 ${expr(`2\\times${r}\\times3.1=${fromTenths(latT)}`)} 이고, ` +
      `세로는 높이인 ${num(h)} 입니다. ` +
      `${expr(`${fromTenths(latT)}\\times${h}=${fromTenths(areaT)}`)}`,
    fig("netCylinder", { r, h, pi: 3.1, layout: pick(rng, CYL_NET_LAYOUTS) }),
  );
}

/** 심화 — 역산. 옆면의 넓이와 높이에서 밑면의 반지름(그림 없음). 원주율 `$3.14$`. */
function cylNetDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  const h = intBetween(rng, 3, 12);
  // 백분의 일 단위 정수. 답(반지름)에서 거꾸로 지어 나눗셈이 딱 떨어지게 한다.
  const circC = 2 * r * 314;
  const areaC = circC * h;
  return make(
    unit,
    `어떤 원기둥의 전개도에서 옆면의 넓이가 ${num(fromCents(areaC))} cm²이고 ` +
      `이 원기둥의 높이가 ${unitNum(h, "cm")} 입니다. 밑면의 반지름은 몇 cm인가? (원주율: ${num("3.14")})`,
    num(r),
    `옆면의 가로는 ${expr(`${fromCents(areaC)}\\div${h}=${fromCents(circC)}`)} 이고, 이것이 밑면의 둘레입니다. ` +
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

/**
 * 난이도 갈래 (D-72 확대) — 키는 `tierKey` 형식(`"초6|1-1-1"`), 값은 넷 전부.
 * `TierVariants` 가 넷을 컴파일로 강제한다 — 일부만 채우면 프리셋 비율이 조용히 못 선다.
 */
export const G6_TIERS: ElemTierMap = {
  "초6|1-1-1": {
    연산: natDivCalc,
    기본: natDivWord,
    응용: natDivApply,
    심화: natDivDeep,
  },
  "초6|1-1-2": {
    연산: fracNatCalc,
    기본: fracNatWord,
    응용: fracNatApply,
    심화: fracNatDeep,
  },
  "초6|1-1-3": {
    연산: mixedNatCalc,
    기본: mixedNatWord,
    응용: mixedNatApply,
    심화: mixedNatDeep,
  },
  "초6|1-2-1": {
    연산: prismFaceCalc,
    기본: prismFaceRead,
    응용: prismFaceApply,
    심화: prismFaceDeep,
  },
  "초6|1-2-2": {
    연산: prismPartCalc,
    기본: prismPartRead,
    응용: prismPartApply,
    심화: prismPartDeep,
  },
  "초6|1-2-3": {
    연산: netCalc,
    기본: netRead,
    응용: netApply,
    심화: netDeep,
  },
  "초6|1-2-4": {
    연산: pyrFaceCalc,
    기본: pyrFaceRead,
    응용: pyrFaceApply,
    심화: pyrFaceDeep,
  },
  "초6|1-2-5": {
    연산: pyrPartCalc,
    기본: pyrPartRead,
    응용: pyrPartApply,
    심화: pyrPartDeep,
  },
  "초6|1-3-1": {
    연산: decNatCalc,
    기본: decNatWord,
    응용: decNatApply,
    심화: decNatDeep,
  },
  "초6|1-3-2": {
    연산: decUnderCalc,
    기본: decUnderWord,
    응용: decUnderApply,
    심화: decUnderDeep,
  },
  "초6|1-3-3": {
    연산: decBringCalc,
    기본: decBringWord,
    응용: decBringApply,
    심화: decBringDeep,
  },
  "초6|1-3-4": {
    연산: decZeroCalc,
    기본: decZeroWord,
    응용: decZeroApply,
    심화: decZeroDeep,
  },
  "초6|1-3-5": {
    연산: natDecCalc,
    기본: natDecWord,
    응용: natDecApply,
    심화: natDecDeep,
  },
  "초6|1-4-1": {
    연산: cmpCalc,
    기본: cmpWord,
    응용: cmpApply,
    심화: cmpDeep,
  },
  "초6|1-4-2": {
    연산: biCalc,
    기본: biWord,
    응용: biApply,
    심화: biDeep,
  },
  "초6|1-4-3": {
    연산: rateCalc,
    기본: rateWord,
    응용: rateApply,
    심화: rateDeep,
  },
  "초6|1-4-4": {
    연산: rateUseCalc,
    기본: rateUseWord,
    응용: rateUseApply,
    심화: rateUseDeep,
  },
  "초6|1-4-5": {
    연산: pctCalc,
    기본: pctWord,
    응용: pctApply,
    심화: pctDeep,
  },
  "초6|1-4-6": {
    연산: pctUseCalc,
    기본: pctUseWord,
    응용: pctUseApply,
    심화: pctUseDeep,
  },
  "초6|1-5-1": {
    연산: stripReadCalc,
    기본: stripReadWord,
    응용: stripReadApply,
    심화: stripReadDeep,
  },
  "초6|1-5-2": {
    연산: stripDrawCalc,
    기본: stripDrawWord,
    응용: stripDrawApply,
    심화: stripDrawDeep,
  },
  "초6|1-5-3": {
    연산: pieReadCalc,
    기본: pieReadWord,
    응용: pieReadApply,
    심화: pieReadDeep,
  },
  "초6|1-5-4": {
    연산: pieDrawCalc,
    기본: pieDrawWord,
    응용: pieDrawApply,
    심화: pieDrawDeep,
  },
  "초6|1-5-5": {
    연산: cmpChartCalc,
    기본: cmpChartWord,
    응용: cmpChartApply,
    심화: cmpChartDeep,
  },
  "초6|1-6-1": {
    연산: surfCalc,
    기본: surfWord,
    응용: surfApply,
    심화: surfDeep,
  },
  "초6|1-6-2": {
    연산: volCalc,
    기본: volWord,
    응용: volApply,
    심화: volDeep,
  },
  "초6|1-6-3": {
    연산: cubicCalc,
    기본: cubicWord,
    응용: cubicApply,
    심화: cubicDeep,
  },
  "초6|2-1-1": {
    연산: sameDenCalc,
    기본: sameDenWord,
    응용: sameDenApply,
    심화: sameDenDeep,
  },
  "초6|2-1-2": {
    연산: diffDenCalc,
    기본: diffDenWord,
    응용: diffDenApply,
    심화: diffDenDeep,
  },
  "초6|2-1-3": {
    연산: natFracCalc,
    기본: natFracWord,
    응용: natFracApply,
    심화: natFracDeep,
  },
  "초6|2-1-4": {
    연산: flipCalc,
    기본: flipWord,
    응용: flipApply,
    심화: flipDeep,
  },
  "초6|2-1-5": {
    연산: mixedFracCalc,
    기본: mixedFracWord,
    응용: mixedFracApply,
    심화: mixedFracDeep,
  },
  "초6|2-2-1": {
    연산: sameDpCalc,
    기본: sameDpWord,
    응용: sameDpApply,
    심화: sameDpDeep,
  },
  "초6|2-2-2": {
    연산: diffDpCalc,
    기본: diffDpWord,
    응용: diffDpApply,
    심화: diffDpDeep,
  },
  "초6|2-2-3": {
    연산: natDpCalc,
    기본: natDpWord,
    응용: natDpApply,
    심화: natDpDeep,
  },
  "초6|2-2-4": {
    연산: roundCalc,
    기본: roundWord,
    응용: roundApply,
    심화: roundDeep,
  },
  "초6|2-2-5": {
    연산: remCalc,
    기본: remWord,
    응용: remApply,
    심화: remDeep,
  },
  "초6|2-4-1": {
    연산: ratioPropCalc,
    기본: ratioPropWord,
    응용: ratioPropApply,
    심화: ratioPropDeep,
  },
  "초6|2-4-2": {
    연산: simpleRatioCalc,
    기본: simpleRatioWord,
    응용: simpleRatioApply,
    심화: simpleRatioDeep,
  },
  "초6|2-4-3": {
    연산: propEqCalc,
    기본: propEqWord,
    응용: propEqApply,
    심화: propEqDeep,
  },
  "초6|2-4-4": {
    연산: propRuleCalc,
    기본: propRuleWord,
    응용: propRuleApply,
    심화: propRuleDeep,
  },
  "초6|2-4-5": {
    연산: shareCalc,
    기본: shareWord,
    응용: shareApply,
    심화: shareDeep,
  },
  "초6|2-5-1": {
    연산: circPiCalc,
    기본: circPiWord,
    응용: circPiApply,
    심화: circPiDeep,
  },
  "초6|2-5-2": {
    연산: circLenCalc,
    기본: circLenWord,
    응용: circLenApply,
    심화: circLenDeep,
  },
  "초6|2-5-3": {
    연산: circAppCalc,
    기본: circAppWord,
    응용: circAppApply,
    심화: circAppDeep,
  },
  "초6|2-5-4": {
    연산: circAreaCalc,
    기본: circAreaWord,
    응용: circAreaApply,
    심화: circAreaDeep,
  },
  "초6|2-3-1": {
    연산: viewCalc,
    기본: viewWord,
    응용: viewApply,
    심화: viewDeep,
  },
  "초6|2-3-2": {
    연산: cubeOneCalc,
    기본: cubeOneWord,
    응용: cubeOneApply,
    심화: cubeOneDeep,
  },
  "초6|2-3-3": {
    연산: cubeTwoCalc,
    기본: cubeTwoWord,
    응용: cubeTwoApply,
    심화: cubeTwoDeep,
  },
  "초6|2-3-4": {
    연산: cubeLayerCalc,
    기본: cubeLayerWord,
    응용: cubeLayerApply,
    심화: cubeLayerDeep,
  },
  "초6|2-3-5": {
    연산: cubeBoxCalc,
    기본: cubeBoxWord,
    응용: cubeBoxApply,
    심화: cubeBoxDeep,
  },
  "초6|2-3-6": {
    연산: cubeMakeCalc,
    기본: cubeMakeWord,
    응용: cubeMakeApply,
    심화: cubeMakeDeep,
  },
  "초6|2-6-1": {
    연산: cylKnowCalc,
    기본: cylKnowWord,
    응용: cylKnowApply,
    심화: cylKnowDeep,
  },
  "초6|2-6-2": {
    연산: cylNetCalc,
    기본: cylNetWord,
    응용: cylNetApply,
    심화: cylNetDeep,
  },
  "초6|2-6-3": {
    연산: coneKnowCalc,
    기본: coneKnowWord,
    응용: coneKnowApply,
    심화: coneKnowDeep,
  },
  "초6|2-6-4": {
    연산: ballKnowCalc,
    기본: ballKnowWord,
    응용: ballKnowApply,
    심화: ballKnowDeep,
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
