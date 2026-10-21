/**
 * 초5 생성기.
 *
 * 표기는 `format.ts` 한 곳을 거친다 — R1(모든 수는 KaTeX) · R2(분수 답은 대분수) ·
 * R4(도형 이름은 한자 수사). 소재·도형은 씨앗으로 갈린다(R9).
 *
 * 그리고 **소단원 이름이 내건 조건을 생성기가 실제로 지킨다.** 「(자연수)×(1보다 작은 소수)」가
 * `7×2.0` 을 내던 자리가 그것이다(2026-08-22 원장님 검수). 이름이 조건인 소단원은
 * 갈래가 하나도 안 맞으면 **던진다** — 조용히 엉뚱한 꼴을 내면 아무도 모른다.
 */
import type { UnitSeed } from "../../../prisma/seed-data/units";

import type { ElemTierMap } from "./difficulty";

import { decLatex, expr, fracLatex, josa, n, polyName } from "./format";
import { fracSpec } from "./fracFig";
import {
  answerPrintedOnPage,
  forwardReachable,
  pageNumbers,
  rat,
  ratOfScaled,
  type Rat,
} from "./forwardReach";
import { fig, make, makeDeep } from "./make";
import { addFrac, divisors, gcd, lcm, simplify, subFrac } from "./math";
import { intBetween, pick } from "./rng";
import type { ChapterHandler, ElemForm, ElemProblem, Rng } from "./types";

/* ────────────────────────────── 지역 헬퍼 ────────────────────────────── */

/**
 * 정수 스케일로 계산한 소수를 표기로. 부동소수점을 지면에 흘리지 않는다 —
 * `dec(42, 1)` → `"4.2"`, `dec(360, 1)` → `"36"`. 딱 떨어지지 않으면 `decLatex` 가 던진다.
 */
function dec(scaled: number, digits: number): string {
  let value = scaled;
  let d = digits;
  while (d > 0 && value % 10 === 0) {
    value /= 10;
    d -= 1;
  }
  return decLatex(value / 10 ** d, d);
}

/** 수 여러 개를 **한 덩어리** KaTeX 로. 숫자마다 따로 감싸면 지면에서 띄어쓰기가 깨진다. */
function nums(values: readonly (number | string)[]): string {
  return expr(values.join(",\\ "));
}

/** 씨앗으로 섞는다. 「늘 같은 도형」을 막는 것은 취향이 아니라 제품 요구다(원장님, 2026-08-22). */
function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = intBetween(rng, 0, i);
    const swap = out[i]!;
    out[i] = out[j]!;
    out[j] = swap;
  }
  return out;
}

/** 서로 다른 것 `count` 개. */
function pickSome<T>(rng: Rng, items: readonly T[], count: number): T[] {
  return shuffled(rng, items).slice(0, count);
}

/**
 * 양자택일 문형의 갈래. 변형 셋이 한 답만 내지 않게 첫 뽑기로 고른다.
 * `rng() < 0.5` 는 초5 걸린 18곳 중 15곳이 갈린다.
 */
function altCase(rng: Rng): boolean {
  return rng() < 0.5;
}

/** `0..3` 홀짝 — `altCase` 가 검사 씨앗 셋에서 한쪽으로 몰리는 문형용. */
function altCase4(rng: Rng): boolean {
  return intBetween(rng, 0, 3) % 2 === 1;
}

/** `0..5` 홀짝 — 초5 1-2-6 전용. */
function altCase6(rng: Rng): boolean {
  return intBetween(rng, 0, 5) % 2 === 1;
}

/** 대분수 표기 — `2\frac{1}{3}`. 자연수부는 `1` 이상만 넘긴다. */
function mixedLatex(whole: number, num: number, den: number): string {
  return `${whole}\\frac{${num}}{${den}}`;
}

/**
 * **기약** 진분수 하나. 발문에 `\frac{3}{6}` 같은 약분 안 된 분수를 내면 교재답지 않고,
 * 두 분수를 뽑을 때 값이 우연히 같아진다(`\frac12` 과 `\frac24` 를 통분하라는 문항이 나왔다).
 * 분모가 다르고 둘 다 기약이면 두 값은 절대 같지 않다.
 */
function properFrac(rng: Rng, dens: readonly number[]): [number, number] {
  const den = pick(rng, dens);
  const tops: number[] = [];
  for (let i = 1; i < den; i += 1) if (gcd(i, den) === 1) tops.push(i);
  return [pick(rng, tops), den];
}

const LABELS = ["가", "나", "다", "라", "마"] as const;

/* ── 조사 ──
 * 수 뒤 조사는 **그 수를 읽은 소리**가 정한다. `11` 은 「일」이라 받침이 있어 `11은` 이고
 * `55` 는 「오」라 `55는` 이다. 손으로 「는」을 박아 두면 지면에 「11는」·「8를」·「28와」가
 * 그대로 나간다 — 원장님이 종이에서 보실 자리다. 마지막 자리 숫자 하나면 정해진다.
 */

/** 영·일·삼·육·칠·팔 은 받침이 있다. `0` 으로 끝나면 십·백·천·만 이라 역시 받침이 있다. */
const FINAL_DIGITS = new Set([0, 1, 3, 6, 7, 8]);
/** 일·칠·팔 은 **ㄹ 받침**이라 `으로` 가 아니라 `로` 를 쓴다. */
const RIEUL_DIGITS = new Set([1, 7, 8]);

function lastDigit(value: number | string): number {
  const digits = String(value).replace(/\D/g, "");
  return Number(digits[digits.length - 1] ?? "0");
}

/** KaTeX 로 감싼 수 + 알맞은 조사. `nj(11, "은", "는")` → `$11$은`. */
function nj(value: number, withFinal: string, without: string): string {
  return `${n(value)}${FINAL_DIGITS.has(lastDigit(value)) ? withFinal : without}`;
}

/** `(으)로`. `nro(10)` → `$10$으로`, `nro(8)` → `$8$로`(ㄹ 받침). */
function nro(value: number): string {
  const d = lastDigit(value);
  return `${n(value)}${FINAL_DIGITS.has(d) && !RIEUL_DIGITS.has(d) ? "으로" : "로"}`;
}

/** 낱말 뒤 조사. `wj("손가락", "이", "가")` → `손가락이`. */
function wj(word: string, withFinal: string, without: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${word}${hasFinal ? withFinal : without}`;
}

/* ── 수식 덩어리 뒤 조사 ──
 * 조사는 **그 덩어리를 소리 내어 읽은 마지막 소리**가 정한다. 분수는 «분모분의 분자» 라
 * **분자로 끝나고**(대분수 `2\frac{1}{3}` 도 «이와 삼분의 일»), 그 밖에는 마지막 수를 읽는다.
 * 그래서 `$\frac{2}{3}$과` 는 틀렸다 — 「이」로 끝나니 «와» 다.
 *
 * ⚠️ 이 규칙을 **여기 한 곳**에만 둔다. 손으로 「과」를 박으면 분자가 바뀌는 순간 틀리고,
 *    그 틀림은 에러가 아니라 **그럴듯한 문장**으로 지면에 나간다(2026-08-23 실측: 표준·갈래
 *    합쳐 24자리). 규칙이 두 벌이 되면 한쪽만 고쳐도 아무도 모른다.
 */

/** 분수 한 덩어리. `fr(3, 4)` → `$\frac{3}{4}$`. */
const fr = (num: number, den: number): string => expr(`\\frac{${num}}{${den}}`);

/**
 * LaTeX 덩어리를 읽었을 때 **마지막에 오는 수**. 분수로 끝나면 분자, 아니면 끝의 수.
 * 못 찾으면 던진다 — 조용히 틀린 조사를 붙이는 것이 이 수리가 막으려는 바로 그 결함이다.
 */
function lastSpoken(latex: string): number {
  const frac = /\\frac\{(\d+)\}\{\d+\}[^0-9]*$/.exec(latex);
  if (frac) return Number(frac[1]);
  const tail = /(\d+)[^0-9]*$/.exec(latex);
  if (tail) return Number(tail[1]);
  throw new Error(`조사를 정할 수 없습니다 — 읽을 수가 없는 덩어리: ${latex}`);
}

/** 분수 뒤 조사. `frj(2, 3, "과", "와")` → `$\frac{2}{3}$와`. */
function frj(
  num: number,
  den: number,
  withFinal: string,
  without: string,
): string {
  return `${fr(num, den)}${FINAL_DIGITS.has(lastDigit(num)) ? withFinal : without}`;
}

/** 분수 뒤 `(으)로`. `fro(20, 7)` → `$\frac{20}{7}$으로`(이십 — ㅂ받침). */
function fro(num: number, den: number): string {
  const d = lastDigit(num);
  return `${fr(num, den)}${FINAL_DIGITS.has(d) && !RIEUL_DIGITS.has(d) ? "으로" : "로"}`;
}

/** 임의의 LaTeX 덩어리 뒤 조사 — 대분수·정수로 접히는 `fracLatex` 결과에 쓴다. */
function lj(latex: string, withFinal: string, without: string): string {
  return `${expr(latex)}${FINAL_DIGITS.has(lastDigit(lastSpoken(latex))) ? withFinal : without}`;
}

/** 임의의 LaTeX 덩어리 뒤 `(으)로`. */
function lro(latex: string): string {
  const d = lastDigit(lastSpoken(latex));
  return `${expr(latex)}${FINAL_DIGITS.has(d) && !RIEUL_DIGITS.has(d) ? "으로" : "로"}`;
}

/** 수 나열(`nums`) 뒤 `(으)로` — 읽는 소리는 **마지막 수**로 끝난다. */
function numsRo(values: readonly (number | string)[]): string {
  const d = lastDigit(String(values[values.length - 1] ?? 0));
  return `${nums(values)}${FINAL_DIGITS.has(d) && !RIEUL_DIGITS.has(d) ? "으로" : "로"}`;
}

/** 소수 표기 뒤 조사 — 마지막 숫자 소리로 정한다(«영 점 오오»). */
function dj(decText: string, withFinal: string, without: string): string {
  return `${expr(decText)}${FINAL_DIGITS.has(lastDigit(decText)) ? withFinal : without}`;
}

/** 소수 표기 뒤 `(으)로` — 일·칠·팔은 ㄹ받침이라 «로»다(«0.7로»). */
function dro(decText: string): string {
  const d = lastDigit(decText);
  return FINAL_DIGITS.has(d) && !RIEUL_DIGITS.has(d) ? "으로" : "로";
}

/* ────────────────────────────── 1-1 자연수의 혼합 계산 ────────────────────────────── */

function mixedCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;

  // 1-1-1 「덧셈과 뺄셈」 또는 「곱셈과 나눗셈」 — 두 갈래를 씨앗으로 고른다.
  if (s.includes("덧셈과 뺄셈 /")) {
    if (intBetween(rng, 0, 1) === 0) {
      const a = intBetween(rng, 40, 90);
      const b = intBetween(rng, 10, 25);
      const c = intBetween(rng, 5, 20);
      return make(
        unit,
        expr(`${a}-(${b}+${c})=\\square`),
        n(a - b - c),
        `괄호 안을 먼저 계산합니다. ${expr(`${b}+${c}=${b + c}`)}이므로 ${expr(`${a}-${b + c}=${a - b - c}`)}입니다.`,
      );
    }
    const a = intBetween(rng, 3, 9);
    const b = intBetween(rng, 4, 9);
    // `a` 자신이 언제나 후보라 비지 않는다(`b >= 4` 이므로 `a !== a*b`).
    const c = pick(
      rng,
      [2, 3, 4, 5, 6, 7, 8, 9].filter((k) => k !== a * b && (a * b) % k === 0),
    );
    return make(
      unit,
      expr(`${a}\\times${b}\\div${c}=\\square`),
      n((a * b) / c),
      `곱셈과 나눗셈만 있으면 앞에서부터 계산합니다. ${expr(`${a}\\times${b}=${a * b}`)}, ${expr(`${a * b}\\div${c}=${(a * b) / c}`)}입니다.`,
    );
  }

  // 1-1-2 「덧셈, 뺄셈, 곱셈(나눗셈)」 — +, -, 그리고 ×(또는 ÷)가 **모두** 있어야 한다.
  if (s.includes("곱셈(나눗셈)")) {
    if (intBetween(rng, 0, 1) === 0) {
      const a = intBetween(rng, 20, 50);
      const b = intBetween(rng, 3, 9);
      const c = intBetween(rng, 2, 6);
      const d = intBetween(rng, 4, 15);
      return make(
        unit,
        expr(`${a}+${b}\\times${c}-${d}=\\square`),
        n(a + b * c - d),
        `곱셈을 먼저 계산합니다. ${expr(`${b}\\times${c}=${b * c}`)}이므로 ${expr(`${a}+${b * c}-${d}=${a + b * c - d}`)}입니다.`,
      );
    }
    const c = intBetween(rng, 2, 9);
    const q = intBetween(rng, 2, 9);
    const b = c * q;
    const a = intBetween(rng, 30, 70);
    const d = intBetween(rng, 5, 20);
    return make(
      unit,
      expr(`${a}-${b}\\div${c}+${d}=\\square`),
      n(a - q + d),
      `나눗셈을 먼저 계산합니다. ${expr(`${b}\\div${c}=${q}`)}이므로 ${expr(`${a}-${q}+${d}=${a - q + d}`)}입니다.`,
    );
  }

  // 1-1-3 「덧셈, 뺄셈, 곱셈, 나눗셈」 — 네 연산이 **모두** 있어야 한다.
  const b = intBetween(rng, 3, 9);
  const c = intBetween(rng, 2, 6);
  const e = intBetween(rng, 2, 6);
  const q = intBetween(rng, 2, 8);
  const d = e * q;
  const a = intBetween(rng, 20, 60);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      expr(`${a}+${b}\\times${c}-${d}\\div${e}=\\square`),
      n(a + b * c - q),
      `곱셈과 나눗셈을 먼저 계산합니다. ${expr(`${b}\\times${c}=${b * c}`)}, ${expr(`${d}\\div${e}=${q}`)}이므로 ${expr(`${a}+${b * c}-${q}=${a + b * c - q}`)}입니다.`,
    );
  }
  // 괄호가 있으면 괄호 안을 먼저. 나누어떨어지게 `a-f` 를 `e` 의 배수로 만든다.
  // `a` 는 `20` 이상이고 `e` 는 `6` 이하라 몫의 최댓값은 언제나 `3` 이상이다.
  const p = intBetween(rng, 2, Math.floor((a - 1) / e));
  const inner = e * p;
  const f = a - inner;
  return make(
    unit,
    expr(`(${a}-${f})\\div${e}+${b}\\times${c}=\\square`),
    n(inner / e + b * c),
    `괄호 안을 먼저 계산합니다. ${expr(`${a}-${f}=${inner}`)}, ${expr(`${inner}\\div${e}=${inner / e}`)}, ${expr(`${b}\\times${c}=${b * c}`)}이므로 ${expr(`${inner / e}+${b * c}=${inner / e + b * c}`)}입니다.`,
  );
}

/* ────────────────────────────── 1-2 약수와 배수 ────────────────────────────── */

const FACTOR_NUMBERS = [
  12, 16, 18, 20, 24, 28, 30, 32, 36, 40, 42, 45,
] as const;

function factor(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;

  // 1-2-2 약수와 배수의 관계 — 곱셈식 하나에서 「배수」와 「약수」를 함께 읽는다.
  if (s.includes("관계")) {
    const a = intBetween(rng, 3, 12);
    const b = intBetween(rng, 3, 9);
    const c = a * b;
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        `${expr(`${a}\\times${b}=${c}`)}입니다. ${nj(c, "은", "는")} ${n(a)}의 □이고, ${nj(a, "은", "는")} ${n(c)}의 □입니다. □에 알맞은 말을 차례로 쓰시오.`,
        "배수, 약수",
        `${expr(`${a}\\times${b}=${c}`)}이므로 ${nj(c, "은", "는")} ${n(a)}의 배수이고, ${nj(a, "은", "는")} ${nj(c, "을", "를")} 나누어떨어지게 하므로 ${n(c)}의 약수입니다.`,
      );
    }
    return make(
      unit,
      `${nj(a, "은", "는")} ${n(c)}의 약수입니다. 그러면 ${nj(c, "은", "는")} ${n(a)}의 무엇인지 쓰시오.`,
      "배수",
      `${nj(c, "은", "는")} ${nro(a)} 나누어떨어집니다. ${expr(`${c}\\div${a}=${b}`)}이므로 ${nj(a, "이", "가")} ${n(c)}의 약수이면 ${nj(c, "은", "는")} ${n(a)}의 배수입니다.`,
    );
  }

  // 1-2-3 공약수와 최대공약수 — 공약수를 **모두** 본다(최대공약수만 묻는 1-2-4 와 다르다).
  if (s.includes("공약수와 최대공약수")) {
    const a = pick(rng, FACTOR_NUMBERS);
    // 공약수가 `1` 뿐이면 물을 것이 없다 — 서로소인 짝은 뺀다.
    const b = pick(
      rng,
      FACTOR_NUMBERS.filter((x) => x !== a && gcd(a, x) > 1),
    );
    const common = divisors(gcd(a, b));
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        `${nj(a, "과", "와")} ${n(b)}의 공약수를 모두 구하시오.`,
        nums(common),
        `${nj(gcd(a, b), "이", "가")} 두 수의 최대공약수이고, 공약수는 최대공약수의 약수인 ${nums(common)}입니다.`,
      );
    }
    return make(
      unit,
      `${nj(a, "과", "와")} ${n(b)}의 공약수는 모두 몇 개입니까?`,
      n(common.length),
      `공약수는 ${nums(common)}이므로 ${n(common.length)}개입니다.`,
    );
  }

  // 1-2-4 최대공약수 구하는 방법
  if (s.includes("최대공약수")) {
    const a = pick(rng, FACTOR_NUMBERS);
    const b = pick(
      rng,
      FACTOR_NUMBERS.filter((x) => x !== a && gcd(a, x) > 1),
    );
    const g = gcd(a, b);
    return make(
      unit,
      `${nj(a, "과", "와")} ${n(b)}의 최대공약수를 구하시오.`,
      n(g),
      `${n(a)}의 약수는 ${nums(divisors(a))}입니다. ${n(b)}의 약수는 ${nums(divisors(b))}입니다. 두 수의 공약수 중 가장 큰 수는 ${n(g)}입니다.`,
    );
  }

  // 1-2-5 공배수와 최소공배수 — 공배수를 **여러 개** 본다(최소공배수만 묻는 1-2-6 과 다르다).
  if (s.includes("공배수와 최소공배수")) {
    const a = intBetween(rng, 3, 9);
    const b = pick(
      rng,
      [4, 6, 8, 9, 10, 12].filter((x) => x !== a),
    );
    const m = lcm(a, b);
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        `${nj(a, "과", "와")} ${n(b)}의 공배수 중에서 두 번째로 작은 수를 구하시오.`,
        n(2 * m),
        `공배수는 최소공배수 ${n(m)}의 배수이므로 ${nums([m, 2 * m, 3 * m])}입니다. 두 번째로 작은 수는 ${n(2 * m)}입니다.`,
      );
    }
    return make(
      unit,
      `${nj(a, "과", "와")} ${n(b)}의 공배수를 가장 작은 수부터 ${n(3)}개 쓰시오.`,
      nums([m, 2 * m, 3 * m]),
      `최소공배수가 ${n(m)}이므로 공배수는 ${n(m)}의 배수인 ${nums([m, 2 * m, 3 * m])}입니다.`,
    );
  }

  // 1-2-6 최소공배수 구하는 방법
  if (s.includes("최소공배수")) {
    // 서로소면 해설이 「최대공약수가 $1$이므로 … ÷1」이 되어 방법을 보여 주지 못한다.
    // `a` 도 짝이 반드시 남는 수에서만 뽑는다 — `11` 은 뒤 목록 전부와 서로소라 후보가 빈다.
    const a = pick(rng, [4, 6, 8, 9, 10, 12]);
    const b = pick(
      rng,
      [6, 8, 9, 10, 14, 15, 18].filter((x) => x !== a && gcd(a, x) > 1),
    );
    const m = lcm(a, b);
    return make(
      unit,
      `${nj(a, "과", "와")} ${n(b)}의 최소공배수를 구하시오.`,
      n(m),
      `최대공약수가 ${n(gcd(a, b))}이므로 최소공배수는 ${expr(`${a}\\times${b}\\div${gcd(a, b)}=${m}`)}입니다.`,
    );
  }

  // 1-2-1 약수와 배수
  const num = pick(rng, FACTOR_NUMBERS);
  const roll = intBetween(rng, 0, 2);
  if (roll === 0) {
    return make(
      unit,
      `${n(num)}의 약수를 모두 구하시오.`,
      nums(divisors(num)),
      `${nj(num, "을", "를")} 나누어떨어지게 하는 수는 ${nums(divisors(num))}입니다.`,
    );
  }
  if (roll === 1) {
    return make(
      unit,
      `${n(num)}의 약수는 모두 몇 개입니까?`,
      n(divisors(num).length),
      `약수는 ${nums(divisors(num))}이므로 ${n(divisors(num).length)}개입니다.`,
    );
  }
  const base = intBetween(rng, 3, 12);
  return make(
    unit,
    `${n(base)}의 배수를 가장 작은 수부터 ${n(4)}개 쓰시오.`,
    nums([base, base * 2, base * 3, base * 4]),
    `${n(base)}에 ${nums([1, 2, 3, 4])}를 차례로 곱하면 ${nums([base, base * 2, base * 3, base * 4])}입니다.`,
  );
}

/* ────────────────────────────── 1-3 대응 관계 ────────────────────────────── */

/** 생활 속 대응 — (물건, 딸린 것, 한 개당 수). 소재가 하나로 굳지 않게 풀에서 뽑는다. */
const LIFE_PAIRS = [
  ["자동차", "바퀴", 4],
  ["세발자전거", "바퀴", 3],
  ["오리", "다리", 2],
  ["의자", "다리", 4],
  ["삼각형", "변", 3],
  ["문어", "다리", 8],
  ["장갑", "손가락", 5],
  ["상자", "사탕", 6],
] as const;

function correspond(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  const k = intBetween(rng, 2, 8);

  // 1-3-3 생활 속에서 찾아 **식으로** 나타내기
  // 기호는 □(독립량)·△(종속량) — 5-1 교과는 x·y 문자를 쓰지 않는다 (2026-08-23 리드 확정).
  if (s.includes("생활 속")) {
    const [thing, part, per] = pick(rng, LIFE_PAIRS);
    return make(
      unit,
      `${thing} ${n(1)}개에 ${wj(part, "이", "가")} ${n(per)}개 있습니다. ${thing}의 수를 □, ${part}의 수를 △라고 할 때 두 양 사이의 대응 관계를 식으로 나타내시오.`,
      expr(`\\triangle=\\square\\times${per}`),
      `${wj(thing, "이", "가")} ${n(1)}개 늘어날 때마다 ${wj(part, "은", "는")} ${n(per)}개씩 늘어나므로 ${expr(`\\triangle=\\square\\times${per}`)}입니다.`,
    );
  }

  // 1-3-2 대응 관계를 **식으로** 나타내기 — 표를 읽고 식을 쓴다.
  // 표가 어디서 시작하는지를 발문이 말하므로 씨앗마다 발문이 갈린다(R9).
  if (s.includes("식으로")) {
    const from = intBetween(rng, 1, 9);
    const xs = [from, from + 1, from + 2];
    const ask = `표는 □가 ${n(from)}부터 ${n(1)}씩 커질 때의 △를 나타낸 것입니다. □와 △ 사이의 대응 관계를 식으로 나타내시오.`;
    if (intBetween(rng, 0, 1) === 0) {
      const c = intBetween(rng, 3, 12);
      return make(
        unit,
        ask,
        expr(`\\triangle=\\square+${c}`),
        `△는 언제나 □보다 ${n(c)}만큼 큽니다.`,
        fig("table", {
          headers: ["□", "△"],
          rows: xs.map((x) => [String(x), String(x + c)]),
        }),
      );
    }
    return make(
      unit,
      ask,
      expr(`\\triangle=\\square\\times${k}`),
      `△는 언제나 □의 ${n(k)}배입니다.`,
      fig("table", {
        headers: ["□", "△"],
        rows: xs.map((x) => [String(x), String(x * k)]),
      }),
    );
  }

  // 1-3-1 두 양 사이의 대응 관계 — 표에서 빈칸의 값을 찾는다.
  const x = intBetween(rng, 5, 12);
  return make(
    unit,
    `표를 보고 □가 ${n(x)}일 때 △의 값을 구하시오.`,
    n(k * x),
    `△는 □의 ${n(k)}배이므로 ${expr(`${k}\\times${x}=${k * x}`)}입니다.`,
    fig("table", {
      headers: ["□", "△"],
      rows: [
        ["1", String(k)],
        ["2", String(2 * k)],
        ["3", String(3 * k)],
        [String(x), ""],
      ],
    }),
  );
}

/* ────────────────────────────── 1-4 약분과 통분 ────────────────────────────── */

const EQ_FRAC_PAIRS = [
  [1, 2],
  [1, 3],
  [2, 3],
  [1, 4],
  [3, 4],
  [1, 5],
  [2, 5],
  [3, 5],
  [4, 5],
] as const;

/** 소수로 딱 떨어지는 분수 — 「분수와 소수의 크기 비교」에 쓴다. 값은 천분의 일 정수로 잰다. */
const FRAC_DEC_PAIRS = [
  [1, 2, 500],
  [1, 4, 250],
  [3, 4, 750],
  [1, 5, 200],
  [2, 5, 400],
  [3, 5, 600],
  [4, 5, 800],
  [1, 8, 125],
  [3, 8, 375],
  [7, 10, 700],
  [3, 20, 150],
] as const;

function reduce(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;

  // 1-4-5 분수와 소수의 크기 비교
  if (s.includes("소수")) {
    const [fn, fd, milli] = pick(rng, FRAC_DEC_PAIRS);
    const decMilli = pick(
      rng,
      [
        100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 650, 700, 750, 800,
        850,
      ].filter((v) => v !== milli),
    );
    const decText = dec(decMilli, 3);
    const fracText = expr(`\\frac{${fn}}{${fd}}`);
    const bigger = milli > decMilli ? fracText : expr(decText);
    return make(
      unit,
      `${frj(fn, fd, "과", "와")} ${expr(decText)} 중 더 큰 수를 쓰시오.`,
      bigger,
      `${expr(`\\frac{${fn}}{${fd}}=${dec(milli, 3)}`)}이고 ${expr(`${dec(milli, 3)}${milli > decMilli ? ">" : "<"}${decText}`)}입니다.`,
    );
  }

  // 1-4-1 크기가 같은 분수 — 분모와 분자에 **같은 수를 곱한다**.
  if (s.includes("크기가 같은")) {
    const [sn, sd] = pick(rng, EQ_FRAC_PAIRS);
    const g = pick(
      rng,
      [2, 3, 4].filter((x) => sd * x <= 12),
    );
    return make(
      unit,
      `그림에서 색칠한 부분은 ${expr(`\\frac{${sn}}{${sd}}`)}입니다. 분모와 분자에 각각 ${nj(g, "을", "를")} 곱하여 크기가 같은 분수를 구하시오.`,
      expr(`\\frac{${sn * g}}{${sd * g}}`),
      `분모와 분자에 같은 수를 곱해도 크기는 변하지 않습니다. ${expr(`\\frac{${sn}}{${sd}}=\\frac{${sn * g}}{${sd * g}}`)}입니다.`,
      fracSpec(rng, sd, sn),
    );
  }

  // 1-4-2 분수를 간단하게 나타내기 — 그림 없이 약분한다.
  if (s.includes("간단하게")) {
    const g = pick(rng, [2, 3, 4, 5, 6]);
    const sn = intBetween(rng, 2, 5);
    const sd = intBetween(rng, sn + 1, 9);
    const [rn, rd] = simplify(sn * g, sd * g);
    return make(
      unit,
      `${frj(sn * g, sd * g, "을", "를")} 기약분수로 나타내시오.`,
      expr(`\\frac{${rn}}{${rd}}`),
      `${nj(sn * g, "과", "와")} ${n(sd * g)}의 최대공약수 ${nro(gcd(sn * g, sd * g))} 분모와 분자를 나눕니다.`,
    );
  }

  // 1-4-3 통분 — 답은 **통분된 두 분수**다.
  // 분모가 다르고 둘 다 기약이면 두 분수는 절대 같아질 수 없다. 그냥 뽑으면
  // `1/2` 과 `2/4` 처럼 **같은 수 둘을 통분하라**는 문항이 나온다.
  if (s.includes("통분")) {
    const [a, d1] = properFrac(rng, [2, 3, 4, 6]);
    const [b, d2] = properFrac(
      rng,
      [3, 4, 5, 6, 8, 9].filter((x) => x !== d1),
    );
    const L = lcm(d1, d2);
    return make(
      unit,
      `${frj(a, d1, "과", "와")} ${frj(b, d2, "을", "를")} 통분하시오.`,
      nums([`\\frac{${(a * L) / d1}}{${L}}`, `\\frac{${(b * L) / d2}}{${L}}`]),
      `두 분모의 최소공배수 ${nj(L, "을", "를")} 공통분모로 삼습니다. ${expr(`\\frac{${a}}{${d1}}=\\frac{${(a * L) / d1}}{${L}}`)}, ${expr(`\\frac{${b}}{${d2}}=\\frac{${(b * L) / d2}}{${L}}`)}입니다.`,
    );
  }

  // 1-4-4 분수의 크기 비교
  const [a, d1] = properFrac(rng, [3, 4, 5, 6]);
  const [b, d2] = properFrac(
    rng,
    [4, 6, 8, 9, 10].filter((x) => x !== d1),
  );
  const L = lcm(d1, d2);
  const leftBig = a * d2 > b * d1;
  return make(
    unit,
    `${frj(a, d1, "과", "와")} ${fr(b, d2)} 중 더 큰 분수를 쓰시오.`,
    leftBig ? fr(a, d1) : fr(b, d2),
    `${nro(L)} 통분하면 ${frj((a * L) / d1, L, "과", "와")} ${fr((b * L) / d2, L)}이므로 분자가 큰 쪽이 더 큽니다.`,
  );
}

/* ────────────────────────────── 1-5 분수의 덧셈과 뺄셈 ────────────────────────────── */

const FRAC_DENS = [3, 4, 5, 6, 8, 9, 10] as const;

function fracAddSub(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const L = lcm(d1, d2);
  const a2 = (a * L) / d1;
  const b2 = (b * L) / d2;

  // 1-5-2 대분수의 덧셈
  if (s.includes("대분수의 덧셈")) {
    const w1 = intBetween(rng, 1, 4);
    const w2 = intBetween(rng, 1, 4);
    const [num, den] = addFrac(w1 * d1 + a, d1, w2 * d2 + b, d2);
    return make(
      unit,
      expr(`${mixedLatex(w1, a, d1)}+${mixedLatex(w2, b, d2)}=\\square`),
      expr(fracLatex(num, den)),
      `자연수는 자연수끼리, 분수는 ${nro(L)} 통분해 더합니다. ${expr(`${w1}+${w2}=${w1 + w2}`)}이고 ${expr(`\\frac{${a2}}{${L}}+\\frac{${b2}}{${L}}=\\frac{${a2 + b2}}{${L}}`)}이므로 답은 ${expr(fracLatex(num, den))}입니다.`,
    );
  }

  // 1-5-4 대분수의 뺄셈 — 자연수부를 벌려 두어 결과가 반드시 양수다.
  if (s.includes("대분수의 뺄셈")) {
    const w1 = intBetween(rng, 3, 6);
    const w2 = intBetween(rng, 1, w1 - 2);
    const [num, den] = subFrac(w1 * d1 + a, d1, w2 * d2 + b, d2);
    return make(
      unit,
      expr(`${mixedLatex(w1, a, d1)}-${mixedLatex(w2, b, d2)}=\\square`),
      expr(fracLatex(num, den)),
      `${nro(L)} 통분한 뒤 자연수는 자연수끼리, 분수는 분수끼리 뺍니다. 분수 부분을 뺄 수 없으면 자연수에서 ${n(1)}을 받아내립니다. 답은 ${expr(fracLatex(num, den))}입니다.`,
    );
  }

  // 1-5-3 진분수의 뺄셈 — 두 분수 **모두 진분수**이고 큰 것에서 작은 것을 뺀다.
  // 분모가 다르고 둘 다 기약이라 두 값이 같아지는 일은 없다 — 자리만 바꾸면 결과가 양수다.
  if (s.includes("뺄셈")) {
    const bigLeft = a * d2 > b * d1;
    const [pn, pd, p2] = bigLeft ? [a, d1, a2] : [b, d2, b2];
    const [qn, qd, q2] = bigLeft ? [b, d2, b2] : [a, d1, a2];
    const [num, den] = subFrac(pn, pd, qn, qd);
    return make(
      unit,
      expr(`\\frac{${pn}}{${pd}}-\\frac{${qn}}{${qd}}=\\square`),
      expr(fracLatex(num, den)),
      `${nro(L)} 통분하면 ${expr(`\\frac{${p2}}{${L}}-\\frac{${q2}}{${L}}=\\frac{${p2 - q2}}{${L}}`)}입니다.`,
    );
  }

  // 1-5-1 진분수의 덧셈
  const [num, den] = addFrac(a, d1, b, d2);
  return make(
    unit,
    expr(`\\frac{${a}}{${d1}}+\\frac{${b}}{${d2}}=\\square`),
    expr(fracLatex(num, den)),
    `${nro(L)} 통분하면 ${expr(`\\frac{${a2}}{${L}}+\\frac{${b2}}{${L}}=\\frac{${a2 + b2}}{${L}}`)}입니다.`,
  );
}

/* ────────────────────────────── 1-6 다각형의 둘레와 넓이 ────────────────────────────── */

function area(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;

  // 1-6-1 정다각형과 사각형의 둘레 — 도형 이름은 한자 수사(R4).
  if (s.includes("둘레")) {
    const roll = intBetween(rng, 0, 3);
    if (roll === 0) {
      const sides = intBetween(rng, 3, 8);
      const side = intBetween(rng, 4, 14);
      return make(
        unit,
        `한 변의 길이가 ${n(side)} cm인 ${polyName(sides, true)}의 둘레는 몇 cm입니까?`,
        n(sides * side),
        `${wj(polyName(sides, true), "은", "는")} 변이 ${n(sides)}개이고 길이가 모두 같으므로 ${expr(`${side}\\times${sides}=${sides * side}`)}입니다.`,
      );
    }
    if (roll === 1) {
      const w = intBetween(rng, 7, 18);
      const h = intBetween(rng, 3, w - 1);
      return make(
        unit,
        `가로가 ${n(w)} cm, 세로가 ${n(h)} cm인 직사각형의 둘레는 몇 cm입니까?`,
        n(2 * (w + h)),
        `${expr(`(${w}+${h})\\times2=${2 * (w + h)}`)}입니다.`,
        fig("areaPoly", { shape: "rect", base: w, height: h }),
      );
    }
    if (roll === 2) {
      const side = intBetween(rng, 4, 15);
      return make(
        unit,
        `한 변의 길이가 ${n(side)} cm인 마름모의 둘레는 몇 cm입니까?`,
        n(4 * side),
        `마름모는 네 변의 길이가 모두 같으므로 ${expr(`${side}\\times4=${4 * side}`)}입니다.`,
      );
    }
    const p = intBetween(rng, 5, 16);
    const q = intBetween(rng, 3, 12);
    return make(
      unit,
      `이웃한 두 변의 길이가 ${n(p)} cm, ${n(q)} cm인 평행사변형의 둘레는 몇 cm입니까?`,
      n(2 * (p + q)),
      `평행사변형은 마주 보는 두 변의 길이가 같으므로 ${expr(`(${p}+${q})\\times2=${2 * (p + q)}`)}입니다.`,
    );
  }

  // 1-6-3 1cm²보다 더 큰 넓이의 단위 — **단위 사이의 관계**를 묻는다.
  if (s.includes("보다 더 큰 넓이의 단위")) {
    const roll = intBetween(rng, 0, 2);
    if (roll === 0) {
      const k = intBetween(rng, 2, 9);
      return make(
        unit,
        `${expr(`${k}\\,\\mathrm{m}^2`)}는 몇 ${expr("\\mathrm{cm}^2")}입니까?`,
        n(k * 10000),
        `${expr("1\\,\\mathrm{m}=100\\,\\mathrm{cm}")}이므로 ${expr("1\\,\\mathrm{m}^2=10000\\,\\mathrm{cm}^2")}입니다. 따라서 ${expr(`${k}\\times10000=${k * 10000}`)}입니다.`,
      );
    }
    if (roll === 1) {
      const k = intBetween(rng, 2, 9);
      return make(
        unit,
        `${expr(`${k}\\,\\mathrm{km}^2`)}는 몇 ${expr("\\mathrm{m}^2")}입니까?`,
        n(k * 1000000),
        `${expr("1\\,\\mathrm{km}=1000\\,\\mathrm{m}")}이므로 ${expr("1\\,\\mathrm{km}^2=1000000\\,\\mathrm{m}^2")}입니다. 따라서 ${expr(`${k}\\times1000000=${k * 1000000}`)}입니다.`,
      );
    }
    const w = intBetween(rng, 6, 25);
    const h = intBetween(rng, 4, 20);
    return make(
      unit,
      `가로가 ${n(w)} m, 세로가 ${n(h)} m인 직사각형 모양 텃밭의 넓이는 몇 ${expr("\\mathrm{m}^2")}입니까?`,
      n(w * h),
      `직사각형의 넓이는 가로와 세로의 곱이므로 ${expr(`${w}\\times${h}=${w * h}`)}입니다.`,
    );
  }

  // 1-6-2 1cm², 직사각형과 정사각형의 넓이
  if (s.includes("직사각형과 정사각형")) {
    if (intBetween(rng, 0, 1) === 0) {
      const side = intBetween(rng, 4, 14);
      return make(
        unit,
        `한 변의 길이가 ${n(side)} cm인 정사각형의 넓이는 몇 cm²입니까?`,
        n(side * side),
        `${expr(`${side}\\times${side}=${side * side}`)}입니다.`,
        fig("areaPoly", { shape: "rect", base: side, height: side }),
      );
    }
    // 가로와 세로가 같으면 그건 정사각형이다 — 앞 갈래와 겹치지 않게 벌린다.
    const w = intBetween(rng, 7, 16);
    const h = intBetween(rng, 3, w - 1);
    return make(
      unit,
      `가로가 ${n(w)} cm, 세로가 ${n(h)} cm인 직사각형의 넓이는 몇 cm²입니까?`,
      n(w * h),
      `${expr(`${w}\\times${h}=${w * h}`)}입니다.`,
      fig("areaPoly", { shape: "rect", base: w, height: h }),
    );
  }

  // 1-6-4 평행사변형과 삼각형의 넓이
  if (s.includes("평행사변형과 삼각형")) {
    const b = intBetween(rng, 3, 9) * 2;
    const h = intBetween(rng, 3, 11);
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        `밑변의 길이가 ${n(b)} cm, 높이가 ${n(h)} cm인 삼각형의 넓이는 몇 cm²입니까?`,
        n((b * h) / 2),
        `삼각형의 넓이는 밑변과 높이를 곱한 뒤 ${n(2)}로 나눕니다. ${expr(`${b}\\times${h}\\div2=${(b * h) / 2}`)}입니다.`,
        fig("areaPoly", { shape: "tri", base: b, height: h }),
      );
    }
    return make(
      unit,
      `밑변의 길이가 ${n(b)} cm, 높이가 ${n(h)} cm인 평행사변형의 넓이는 몇 cm²입니까?`,
      n(b * h),
      `평행사변형의 넓이는 밑변과 높이의 곱이므로 ${expr(`${b}\\times${h}=${b * h}`)}입니다.`,
      fig("areaPoly", { shape: "para", base: b, height: h }),
    );
  }

  // 1-6-5 마름모와 사다리꼴의 넓이
  if (intBetween(rng, 0, 1) === 0) {
    // 두 대각선이 같으면 그건 **정사각형**이다 — 그려 놓고 「마름모」라 부르면 안 된다.
    // 실측 4/200 이 그렇게 나왔다(1-6-2 가로=세로 「직사각형」과 같은 부류).
    const d1 = intBetween(rng, 3, 9) * 2;
    const d2 = pick(
      rng,
      [4, 5, 6, 7, 8, 9, 10, 11].filter((v) => v !== d1),
    );
    return make(
      unit,
      `두 대각선의 길이가 ${n(d1)} cm, ${n(d2)} cm인 마름모의 넓이는 몇 cm²입니까?`,
      n((d1 * d2) / 2),
      `마름모의 넓이는 두 대각선을 곱한 뒤 ${n(2)}로 나눕니다. ${expr(`${d1}\\times${d2}\\div2=${(d1 * d2) / 2}`)}입니다.`,
      fig("areaPoly", { shape: "rhombus", base: d1, height: d2, d2 }),
    );
  }
  // 사다리꼴로 **보여야** 한다. 윗변과 아랫변이 비슷하고 키가 크면(7·9·12) 지면에서
  // 직사각형과 구분이 안 된다 — 두 변을 충분히 벌리고 높이가 아랫변을 넘지 않게 한다.
  // 높이를 짝수로 두면 `(윗변+아랫변)×높이÷2` 가 늘 자연수다.
  const top = intBetween(rng, 3, 8);
  const bot = top + intBetween(rng, 3, 7);
  const h = 2 * intBetween(rng, 2, Math.min(5, Math.floor(bot / 2)));
  return make(
    unit,
    `윗변의 길이가 ${n(top)} cm, 아랫변의 길이가 ${n(bot)} cm, 높이가 ${n(h)} cm인 사다리꼴의 넓이는 몇 cm²입니까?`,
    n(((top + bot) * h) / 2),
    `사다리꼴의 넓이는 두 변의 길이를 더해 높이를 곱한 뒤 ${n(2)}로 나눕니다. ${expr(`(${top}+${bot})\\times${h}\\div2=${((top + bot) * h) / 2}`)}입니다.`,
    fig("areaPoly", { shape: "trap", base: bot, height: h, top }),
  );
}

/* ────────────────────────────── 2-1 수의 범위와 어림하기 ────────────────────────────── */

const RANGE_RIDES = [
  ["놀이기구", "키", "cm"],
  ["회전목마", "키", "cm"],
  ["범퍼카", "키", "cm"],
  ["바이킹", "키", "cm"],
] as const;

function estimate(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;

  // 2-1-1 이상과 이하 — 양 끝을 **포함**한다.
  if (s.includes("이상과 이하")) {
    const a = intBetween(rng, 12, 480);
    const gap = intBetween(rng, 5, 20);
    return make(
      unit,
      `${n(a)} 이상 ${n(a + gap)} 이하인 자연수는 모두 몇 개입니까?`,
      n(gap + 1),
      `${nj(a, "과", "와")} ${nj(a + gap, "을", "를")} 모두 포함하므로 ${expr(`${a + gap}-${a}+1=${gap + 1}`)}개입니다.`,
    );
  }

  // 2-1-2 초과와 미만 — 양 끝을 **포함하지 않는다**.
  if (s.includes("초과와 미만")) {
    const a = intBetween(rng, 12, 480);
    const gap = intBetween(rng, 5, 20);
    return make(
      unit,
      `${n(a)} 초과 ${n(a + gap)} 미만인 자연수는 모두 몇 개입니까?`,
      n(gap - 1),
      `${nj(a, "과", "와")} ${nj(a + gap, "을", "를")} 모두 빼야 하므로 ${expr(`${a + gap}-${a}-1=${gap - 1}`)}개입니다.`,
    );
  }

  // 2-1-3 수의 범위를 알고 문제 해결하기 — 범위를 **생활 장면**에 대 본다.
  if (s.includes("문제 해결")) {
    const [place, what, unitName] = pick(rng, RANGE_RIDES);
    const limit = intBetween(rng, 110, 140);
    // 다섯 중 넷을 고르므로 기준 이상인 것(치우침 `0`·`4`·`11`)이 적어도 둘 남는다 —
    // 답이 `0` 이 되어 해설의 나열이 비는 일이 없다.
    const offsets = shuffled(rng, [-8, -3, 0, 4, 11]).slice(0, 4);
    const values = offsets.map((d) => limit + d);
    const ok = values.filter((v) => v >= limit).length;
    return make(
      unit,
      `${wj(place, "을", "를")} 타려면 ${wj(what, "이", "가")} ${n(limit)} ${unitName} 이상이어야 합니다. 네 사람의 ${wj(what, "이", "가")} ${nums(values)} ${unitName}일 때 탈 수 있는 사람은 몇 명입니까?`,
      n(ok),
      `${n(limit)} ${unitName} 이상인 ${wj(what, "을", "를")} 셉니다. ${nums(values.filter((v) => v >= limit))} ${unitName}이므로 ${n(ok)}명입니다.`,
    );
  }

  const x = intBetween(rng, 1234, 8765);
  const toHundred = intBetween(rng, 0, 1) === 0;
  const place = toHundred ? 100 : 10;
  const placeName = toHundred ? "백" : "십";

  // ⚠️ **「반올림」을 「올림」보다 먼저 본다.** 「반올림 알아보기와 어림의 활용」은
  // `includes("올림")` 에 걸린다 — 그대로 두면 2-1-6 이 올림 문항을 낸다(정답은 맞으니
  // 가드가 조용하다). 2026-08-22 변이 시험으로 잡은 자리다.
  if (s.includes("반올림")) {
    const roll = intBetween(rng, 0, 2);
    if (roll <= 1) {
      const digit = Math.floor((x % place) / (place / 10));
      const rounded =
        digit >= 5
          ? Math.ceil(x / place) * place
          : Math.floor(x / place) * place;
      return make(
        unit,
        `${nj(x, "을", "를")} 반올림하여 ${placeName}의 자리까지 나타내시오.`,
        n(rounded),
        `바로 아래 자리 숫자가 ${n(digit)}이므로 ${digit >= 5 ? "올립니다" : "버립니다"}. 답은 ${n(rounded)}입니다.`,
      );
    }
    // 어림의 활용 — 남는 것을 팔 수 없으니 버림한다.
    const boxes = intBetween(rng, 12, 48);
    const per = pick(rng, [10, 20, 50]);
    const left = intBetween(rng, 1, per - 1);
    const total = boxes * per + left;
    return make(
      unit,
      `사탕 ${n(total)}개를 한 상자에 ${n(per)}개씩 담아 팔려고 합니다. 팔 수 있는 사탕은 모두 몇 개입니까?`,
      n(boxes * per),
      `${n(per)}개씩 ${n(boxes)}상자를 담으면 ${n(left)}개가 남습니다. 남은 것은 팔 수 없으므로 버림하면 ${expr(`${boxes}\\times${per}=${boxes * per}`)}개입니다.`,
    );
  }

  // 2-1-4 올림
  if (s.includes("올림")) {
    const up = Math.ceil(x / place) * place;
    return make(
      unit,
      `${nj(x, "을", "를")} 올림하여 ${placeName}의 자리까지 나타내시오.`,
      n(up),
      `${placeName}의 자리 아래 수가 ${nj(0, "이", "가")} 아니면 올립니다. ${nj(x, "을", "를")} 올리면 ${n(up)}입니다.`,
    );
  }

  // 2-1-5 버림
  const down = Math.floor(x / place) * place;
  return make(
    unit,
    `${nj(x, "을", "를")} 버림하여 ${placeName}의 자리까지 나타내시오.`,
    n(down),
    `${placeName}의 자리 아래 수를 모두 버립니다. ${nj(x, "을", "를")} 버리면 ${n(down)}입니다.`,
  );
}

/* ────────────────────────────── 2-2 분수의 곱셈 ────────────────────────────── */

function fracMul(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  const k = intBetween(rng, 2, 8);
  // 발문의 분수는 기약으로 낸다 — `\frac{3}{6}\times8` 은 교재 발문이 아니다.
  const [a, d] = properFrac(rng, [3, 4, 5, 6, 7, 8]);

  // 2-2-1 (분수)×(자연수) — 분수가 앞, 자연수가 뒤.
  if (s.includes("(분수)×(자연수)")) {
    const [num, den] = simplify(a * k, d);
    return make(
      unit,
      expr(`\\frac{${a}}{${d}}\\times${k}=\\square`),
      expr(fracLatex(num, den)),
      `분모는 그대로 두고 분자에 ${nj(k, "을", "를")} 곱합니다. ${expr(`\\frac{${a}\\times${k}}{${d}}=${fracLatex(num, den)}`)}입니다.`,
      fig("fracBars", { cols: d, rows: 1, filled: a, fill: "#7eb89a" }),
    );
  }

  // 2-2-2 (자연수)×(분수) — 자연수가 앞, 분수가 뒤.
  if (s.includes("(자연수)×(분수)")) {
    const [num, den] = simplify(k * a, d);
    return make(
      unit,
      expr(`${k}\\times\\frac{${a}}{${d}}=\\square`),
      expr(fracLatex(num, den)),
      `자연수를 분자에 곱합니다. ${expr(`\\frac{${k}\\times${a}}{${d}}=${fracLatex(num, den)}`)}입니다.`,
    );
  }

  // 2-2-3 진분수의 곱셈 — 두 분수가 **모두 진분수**다.
  if (s.includes("진분수의 곱셈")) {
    const [b, d2] = properFrac(rng, [3, 4, 5, 6, 7, 8, 9]);
    const [num, den] = simplify(a * b, d * d2);
    return make(
      unit,
      expr(`\\frac{${a}}{${d}}\\times\\frac{${b}}{${d2}}=\\square`),
      expr(fracLatex(num, den)),
      // 이미 기약이면 `\frac{7}{27}=\frac{7}{27}` 이라는 동어반복이 나온다 — 약분이 있을 때만 덧붙인다.
      `분자끼리, 분모끼리 곱합니다. ${expr(`\\frac{${a}\\times${b}}{${d}\\times${d2}}=\\frac{${a * b}}{${d * d2}}${a * b === num && d * d2 === den ? "" : `=${fracLatex(num, den)}`}`)}입니다.`,
    );
  }

  // 2-2-4 여러 가지 분수의 곱셈 — **대분수**가 들어간다.
  if (s.includes("여러 가지")) {
    const w = intBetween(rng, 1, 4);
    if (intBetween(rng, 0, 1) === 0) {
      const [num, den] = simplify((w * d + a) * k, d);
      return make(
        unit,
        expr(`${mixedLatex(w, a, d)}\\times${k}=\\square`),
        expr(fracLatex(num, den)),
        `대분수를 가분수 ${fro(w * d + a, d)} 고친 뒤 분자에 ${nj(k, "을", "를")} 곱합니다.`,
      );
    }
    const [b, d2] = properFrac(rng, [3, 4, 5, 6, 7, 8, 9]);
    const [num, den] = simplify((w * d + a) * b, d * d2);
    return make(
      unit,
      expr(`${mixedLatex(w, a, d)}\\times\\frac{${b}}{${d2}}=\\square`),
      expr(fracLatex(num, den)),
      `대분수를 가분수 ${fro(w * d + a, d)} 고친 뒤 분자끼리, 분모끼리 곱합니다.`,
    );
  }

  throw new Error(`분수의 곱셈 소단원 이름이 바뀌었습니다: ${s}`);
}

/* ────────────────────────────── 2-3 합동과 대칭 ────────────────────────────── */

/**
 * 합동 판정에 쓰는 도형 풀. `namedShapes` 는 같은 kind 를 같은 크기로 그리므로 kind 가 곧 합동이다.
 *
 * 이 풀은 **두 가지**를 만족해야 문항이 성립한다. 둘은 다른 축이라 하나로 갈음할 수 없다.
 *
 * ㉠ **어느 두 kind 도 합동이 아니다.** 「포개면 겹치는가」는 돌리고 뒤집어도 되므로
 *    자리가 아니라 **변 길이 다중집합**으로 봐야 한다. 11종 55쌍 실측 — 겹치는 짝 없음.
 *    (`eqTri` 44·44·44 vs `square` 44·44·44·44 는 꼭짓점 수부터 다르다.)
 * ㉡ **합동이 아닌 둘이 같아 보이지도 않는다.** 그려진 자리의 윤곽 거리 최소 **7.92px**
 *    (`square↔rect`). 6px 미만이면 학생이 눈으로 못 고른다.
 *
 * ⚠️ 2026-08-22 에 ㉡ 가 실제로 깨졌었다. 등변 tick 이 `marks` 옵트인으로 바뀌자(원장님
 * 결함 ⑤ 수리) `eqTri` 가 `isoTri` 와 **3.93px** 까지 붙어 잠시 뺐다. 엔진이 `isoTri`
 * 밑변을 좁혀 고쳤고(9.45px), 되돌린 뒤 55쌍을 다시 재어 위 두 값을 확인했다.
 * **도형 좌표가 바뀌면 한 짝을 벌릴 때 다른 짝이 좁아진다 — 전 쌍을 다시 재라.**
 *
 * 여기 문항들은 등변·직각을 **묻지 않으므로** `marks` 는 켜지 않는다(기본이 안전한 쪽이다).
 */
const CONG_SHAPES = [
  "square",
  "rect",
  "rightTri",
  "isoTri",
  "wideTri",
  "eqTri",
  "diamond",
  "tallDiamond",
  "trap",
  "para",
  "irregQuad",
] as const;

const LINE_MOTIFS = [
  "kite",
  "eqTri",
  "isoTrap",
  "arrow",
  "house",
  "rhombus",
  "hex",
  "heart",
] as const;
const POINT_MOTIFS = ["para", "hourglass", "z", "hex", "rhombus"] as const;

function congSym(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;

  // 2-3-3 선대칭도형과 그 성질
  if (s.includes("선대칭")) {
    const motif = pick(rng, LINE_MOTIFS);
    const upright =
      motif === "heart" ||
      motif === "house" ||
      motif === "arrow" ||
      motif === "eqTri" ||
      motif === "kite";
    const axis = upright ? "v" : pick(rng, ["v", "h"] as const);
    const figure = fig("symmetry", { axis, motif });
    const roll = intBetween(rng, 0, 3);
    if (roll === 0) {
      return make(
        unit,
        "점선을 따라 접었을 때 완전히 겹치는 이런 도형을 무엇이라고 합니까?",
        "선대칭도형",
        "한 직선을 따라 접어서 완전히 겹치는 도형을 선대칭도형이라고 하고, 그 직선을 대칭축이라고 합니다.",
        figure,
      );
    }
    if (roll === 1) {
      const len = intBetween(rng, 3, 14);
      return make(
        unit,
        `점선을 대칭축으로 하는 선대칭도형입니다. 한 변의 길이가 ${n(len)} cm일 때 이와 대응하는 변의 길이는 몇 cm입니까?`,
        n(len),
        `선대칭도형에서 대응하는 변의 길이는 서로 같으므로 ${n(len)} cm입니다.`,
        figure,
      );
    }
    if (roll === 2) {
      const deg = intBetween(rng, 35, 140);
      return make(
        unit,
        `점선을 대칭축으로 하는 선대칭도형입니다. 한 각의 크기가 ${expr(`${deg}^\\circ`)}일 때 이와 대응하는 각의 크기는 몇 도입니까?`,
        expr(`${deg}^\\circ`),
        `선대칭도형에서 대응하는 각의 크기는 서로 같으므로 ${expr(`${deg}^\\circ`)}입니다.`,
        figure,
      );
    }
    const gap = intBetween(rng, 2, 12);
    return make(
      unit,
      `점선을 대칭축으로 하는 선대칭도형입니다. 대칭축에서 ${n(gap)} cm 떨어진 점의 대응점은 대칭축에서 몇 cm 떨어져 있습니까?`,
      n(gap),
      `대응하는 두 점을 이은 선분은 대칭축과 수직으로 만나고 대칭축이 그 선분을 반으로 나누므로 ${n(gap)} cm입니다.`,
      figure,
    );
  }

  // 2-3-4 점대칭도형과 그 성질
  if (s.includes("점대칭")) {
    const motif = pick(rng, POINT_MOTIFS);
    const figure = fig("symmetry", { axis: "point", motif });
    const roll = intBetween(rng, 0, 3);
    if (roll === 0) {
      return make(
        unit,
        `가운데 점을 중심으로 ${expr("180^\\circ")} 돌렸을 때 처음 도형과 완전히 겹치는 이런 도형을 무엇이라고 합니까?`,
        "점대칭도형",
        `한 점을 중심으로 ${expr("180^\\circ")} 돌렸을 때 처음 도형과 완전히 겹치면 점대칭도형이고, 그 점을 대칭의 중심이라고 합니다.`,
        figure,
      );
    }
    if (roll === 1) {
      return make(
        unit,
        "점대칭도형에서 대응하는 두 점을 이은 선분은 모두 어느 점을 지납니까?",
        "대칭의 중심",
        "대응점을 이은 선분은 모두 대칭의 중심을 지나고, 대칭의 중심이 그 선분을 반으로 나눕니다.",
        figure,
      );
    }
    if (roll === 2) {
      const len = intBetween(rng, 3, 14);
      return make(
        unit,
        `점대칭도형입니다. 한 변의 길이가 ${n(len)} cm일 때 이와 대응하는 변의 길이는 몇 cm입니까?`,
        n(len),
        `점대칭도형에서 대응하는 변의 길이는 서로 같으므로 ${n(len)} cm입니다.`,
        figure,
      );
    }
    const gap = intBetween(rng, 2, 12);
    return make(
      unit,
      `점대칭도형입니다. 대칭의 중심에서 한 점까지의 거리가 ${n(gap)} cm일 때, 그 점의 대응점까지의 거리는 몇 cm입니까?`,
      n(gap),
      `대칭의 중심은 대응점을 이은 선분을 반으로 나누므로 ${n(gap)} cm입니다.`,
      figure,
    );
  }

  // 2-3-2 합동인 도형의 성질 — 대응변·대응각을 묻는다(2-3-1 과 다른 문항이다).
  if (s.includes("성질")) {
    const shape = pick(rng, CONG_SHAPES);
    const figure = fig("namedShapes", {
      items: [
        { shape, label: "가" },
        { shape, label: "나" },
      ],
    });
    if (intBetween(rng, 0, 1) === 0) {
      const len = intBetween(rng, 4, 15);
      return make(
        unit,
        `두 도형은 서로 합동입니다. 도형 가의 어떤 변의 길이가 ${n(len)} cm일 때, 도형 나에서 이와 대응하는 변의 길이는 몇 cm입니까?`,
        n(len),
        `합동인 두 도형에서 대응하는 변의 길이는 서로 같으므로 ${n(len)} cm입니다.`,
        figure,
      );
    }
    const deg = intBetween(rng, 35, 145);
    return make(
      unit,
      `두 도형은 서로 합동입니다. 도형 가의 어떤 각의 크기가 ${expr(`${deg}^\\circ`)}일 때, 도형 나에서 이와 대응하는 각의 크기는 몇 도입니까?`,
      expr(`${deg}^\\circ`),
      `합동인 두 도형에서 대응하는 각의 크기는 서로 같으므로 ${expr(`${deg}^\\circ`)}입니다.`,
      figure,
    );
  }

  // 2-3-1 도형의 합동 알아보기 — **여러 도형 중** 포개어지는 둘을 고른다.
  // `namedShapes` 는 같은 kind 를 같은 크기로 그린다. 그래서 「같은 kind 한 쌍」이 곧 합동이고,
  // 다른 kind 끼리는 어느 짝도 합동이 아니다 — 답이 하나로 정해진다.
  const total = intBetween(rng, 4, 5);
  const kinds = pickSome(rng, CONG_SHAPES, total - 1);
  const twin = kinds[intBetween(rng, 0, kinds.length - 1)]!;
  const items = shuffled(rng, [...kinds, twin]).map((shape, i) => ({
    shape,
    label: LABELS[i]!,
  }));
  const hits = items.filter((it) => it.shape === twin).map((it) => it.label);
  const answer = `${hits[0]}와 ${hits[1]}`;
  const ask = pick(rng, [
    "포개었을 때 완전히 겹치는 두 도형",
    "모양과 크기가 같아 서로 합동인 두 도형",
    "서로 합동인 두 도형",
  ]);
  return make(
    unit,
    `도형 ${n(total)}개 중에서 ${ask}의 기호를 쓰시오.`,
    answer,
    `모양과 크기가 같아서 포개면 완전히 겹치는 두 도형을 서로 합동이라고 합니다. ${answer}가 서로 합동입니다.`,
    fig("namedShapes", { items }),
  );
}

/* ────────────────────────────── 2-4 소수의 곱셈 ────────────────────────────── */

/** `1`보다 **작은** 소수 한 자리 — `0.2` ~ `0.9`. 십분의 일 정수로 잰다. */
function underOne(
  rng: Rng,
  forbid: (t: number) => boolean = () => false,
): number {
  const cands = [2, 3, 4, 5, 6, 7, 8, 9].filter((t) => !forbid(t));
  return pick(rng, cands.length > 0 ? cands : [3]);
}

/** `1`보다 **큰** 소수 한 자리 — `1.1` ~ `4.9`. 십분의 일 정수로 잰다. */
function overOne(rng: Rng): number {
  return intBetween(rng, 1, 4) * 10 + intBetween(rng, 1, 9);
}

function decMul(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;

  // 2-4-7 곱의 소수점의 위치 — `10`·`100` 과 `0.1`·`0.01` 을 곱해 소수점이 어디로 가는지 본다.
  if (s.includes("곱의 소수점")) {
    if (intBetween(rng, 0, 1) === 0) {
      const base = intBetween(rng, 105, 989);
      const mul = pick(rng, [10, 100]);
      return make(
        unit,
        expr(`${dec(base, 2)}\\times${mul}=\\square`),
        expr(dec(base * mul, 2)),
        `${nj(mul, "을", "를")} 곱하면 소수점이 오른쪽으로 ${n(mul === 10 ? 1 : 2)}칸 옮겨집니다. 답은 ${expr(dec(base * mul, 2))}입니다.`,
      );
    }
    const whole = intBetween(rng, 12, 987);
    const mul = pick(rng, [1, 2]);
    return make(
      unit,
      expr(`${whole}\\times${dec(1, mul)}=\\square`),
      expr(dec(whole, mul)),
      `${expr(dec(1, mul))}을 곱하면 소수점이 왼쪽으로 ${n(mul)}칸 옮겨집니다. 답은 ${expr(dec(whole, mul))}입니다.`,
    );
  }

  // 2-4-1 (1보다 작은 소수)×(자연수)
  if (s.includes("(1보다 작은 소수)×(자연수)")) {
    const k = intBetween(rng, 2, 9);
    const t = underOne(rng, (x) => (x * k) % 10 === 0);
    return make(
      unit,
      expr(`${dec(t, 1)}\\times${k}=\\square`),
      expr(dec(t * k, 1)),
      `${nj(t, "과", "와")} ${nj(k, "을", "를")} 곱한 ${n(t * k)}에 소수 한 자리를 찍으면 ${expr(dec(t * k, 1))}입니다.`,
    );
  }

  // 2-4-2 (1보다 큰 소수)×(자연수)
  if (s.includes("(1보다 큰 소수)×(자연수)")) {
    const k = intBetween(rng, 2, 9);
    const a = overOne(rng);
    return make(
      unit,
      expr(`${dec(a, 1)}\\times${k}=\\square`),
      expr(dec(a * k, 1)),
      `${nj(a, "과", "와")} ${nj(k, "을", "를")} 곱한 ${n(a * k)}에 소수 한 자리를 찍으면 ${expr(dec(a * k, 1))}입니다.`,
    );
  }

  // 2-4-3 (자연수)×(1보다 작은 소수)
  if (s.includes("(자연수)×(1보다 작은 소수)")) {
    const k = intBetween(rng, 2, 9);
    const t = underOne(rng, (x) => (x * k) % 10 === 0);
    return make(
      unit,
      expr(`${k}\\times${dec(t, 1)}=\\square`),
      expr(dec(k * t, 1)),
      `${nj(k, "과", "와")} ${nj(t, "을", "를")} 곱한 ${n(k * t)}에 소수 한 자리를 찍으면 ${expr(dec(k * t, 1))}입니다.`,
    );
  }

  // 2-4-4 (자연수)×(1보다 큰 소수)
  if (s.includes("(자연수)×(1보다 큰 소수)")) {
    const k = intBetween(rng, 2, 9);
    const a = overOne(rng);
    return make(
      unit,
      expr(`${k}\\times${dec(a, 1)}=\\square`),
      expr(dec(k * a, 1)),
      `${nj(k, "과", "와")} ${nj(a, "을", "를")} 곱한 ${n(k * a)}에 소수 한 자리를 찍으면 ${expr(dec(k * a, 1))}입니다.`,
    );
  }

  // 2-4-5 (1보다 작은 소수)×(1보다 작은 소수)
  if (s.includes("(1보다 작은 소수)×(1보다 작은 소수)")) {
    const t1 = underOne(rng);
    const t2 = underOne(rng, (x) => (x * t1) % 10 === 0);
    return make(
      unit,
      expr(`${dec(t1, 1)}\\times${dec(t2, 1)}=\\square`),
      expr(dec(t1 * t2, 2)),
      `${nj(t1, "과", "와")} ${nj(t2, "을", "를")} 곱한 ${n(t1 * t2)}에 소수 두 자리를 찍으면 ${expr(dec(t1 * t2, 2))}입니다.`,
    );
  }

  // 2-4-6 (1보다 큰 소수)×(1보다 큰 소수)
  if (s.includes("(1보다 큰 소수)×(1보다 큰 소수)")) {
    const a = overOne(rng);
    const b = overOne(rng);
    return make(
      unit,
      expr(`${dec(a, 1)}\\times${dec(b, 1)}=\\square`),
      expr(dec(a * b, 2)),
      `${nj(a, "과", "와")} ${nj(b, "을", "를")} 곱한 ${n(a * b)}에 소수 두 자리를 찍으면 ${expr(dec(a * b, 2))}입니다.`,
    );
  }

  throw new Error(`소수의 곱셈 소단원 이름이 바뀌었습니다: ${s}`);
}

/* ────────────────────────────── 2-5 직육면체 ────────────────────────────── */

function cuboid(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  // 「가장 넓은 면」이 하나로 정해지도록 `w > d > h` 로 잡는다.
  const w = intBetween(rng, 5, 12);
  const d = intBetween(rng, 3, w - 1);
  const h = intBetween(rng, 2, d - 1);

  // 2-5-2 정사각형 6개로 둘러싸인 도형 — 「면이 6개」는 발문이 이미 말했으므로 묻지 않는다.
  if (s.includes("정사각형 6개")) {
    const e = intBetween(rng, 3, 12);
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        `한 모서리의 길이가 ${n(e)} cm인 정사각형 ${n(6)}개로 둘러싸인 입체도형의 이름을 쓰시오.`,
        "정육면체",
        "여섯 면이 모두 합동인 정사각형인 입체도형을 정육면체라고 합니다.",
        fig("cuboid", { w: e, d: e, h: e }),
      );
    }
    return make(
      unit,
      `한 모서리의 길이가 ${n(e)} cm인 정육면체의 모든 모서리 길이의 합은 몇 cm입니까?`,
      n(12 * e),
      `정육면체의 모서리는 ${n(12)}개이고 길이가 모두 같으므로 ${expr(`${e}\\times12=${12 * e}`)}입니다.`,
      fig("cuboid", { w: e, d: e, h: e }),
    );
  }

  // 2-5-1 직사각형 6개로 둘러싸인 도형
  if (s.includes("직사각형 6개")) {
    const roll = intBetween(rng, 0, 2);
    const figure = fig("cuboid", { w, d, h });
    const given = `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직사각형 ${n(6)}개로 둘러싸인 입체도형입니다.`;
    if (roll === 0) {
      return make(
        unit,
        `${given} 이 입체도형의 이름을 쓰시오.`,
        "직육면체",
        "직사각형 여섯 개로 둘러싸인 입체도형을 직육면체라고 합니다.",
        figure,
      );
    }
    if (roll === 1) {
      return make(
        unit,
        `${given} 모서리는 모두 몇 개입니까?`,
        n(12),
        `직육면체의 모서리는 길이가 같은 것끼리 ${n(4)}개씩 세 묶음이므로 ${expr("4\\times3=12")}개입니다.`,
        figure,
      );
    }
    return make(
      unit,
      `${given} 꼭짓점은 모두 몇 개입니까?`,
      n(8),
      `밑면에 ${n(4)}개, 윗면에 ${n(4)}개이므로 ${expr("4+4=8")}개입니다.`,
      figure,
    );
  }

  // 2-5-3 직육면체의 성질
  if (s.includes("성질")) {
    const roll = intBetween(rng, 0, 2);
    const figure = fig("cuboid", { w, d, h });
    const given = `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체입니다.`;
    if (roll === 0) {
      return make(
        unit,
        `${given} 서로 평행한 면은 모두 몇 쌍입니까?`,
        n(3),
        `마주 보는 두 면끼리 평행하고 그런 쌍이 ${n(3)}개 있습니다.`,
        figure,
      );
    }
    if (roll === 1) {
      return make(
        unit,
        `${given} 한 면과 수직인 면은 모두 몇 개입니까?`,
        n(4),
        `한 면과 마주 보는 면만 평행하고 나머지 ${n(4)}개는 모두 수직입니다.`,
        figure,
      );
    }
    return make(
      unit,
      `${given} 한 모서리와 평행한 모서리는 모두 몇 개입니까?`,
      n(3),
      `길이가 같은 모서리가 ${n(4)}개씩 있고 그중 자기 자신을 뺀 ${n(3)}개가 평행합니다.`,
      figure,
    );
  }

  // 2-5-4 직육면체의 겨냥도 — 겨냥도가 **실제로 보여 주는 것**만 묻는다.
  if (s.includes("겨냥도")) {
    const roll = intBetween(rng, 0, 2);
    const figure = fig("cuboid", { w, d, h });
    const given = `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 겨냥도입니다.`;
    if (roll === 0) {
      return make(
        unit,
        `${given} 겨냥도에서 보이는 면은 모두 몇 개입니까?`,
        n(3),
        `여섯 면 중 앞·옆·위의 ${n(3)}개가 보입니다.`,
        figure,
      );
    }
    if (roll === 1) {
      return make(
        unit,
        `${given} 겨냥도에서 보이는 모서리는 모두 몇 개입니까?`,
        n(9),
        `모서리 ${n(12)}개 중 보이지 않는 ${n(3)}개를 빼면 ${expr("12-3=9")}개입니다.`,
        figure,
      );
    }
    return make(
      unit,
      `${given} 겨냥도에서 보이는 꼭짓점은 모두 몇 개입니까?`,
      n(7),
      `꼭짓점 ${n(8)}개 중 뒤쪽에 가려진 ${n(1)}개를 빼면 ${expr("8-1=7")}개입니다.`,
      figure,
    );
  }

  // 2-5-5 정육면체의 전개도
  if (s.includes("정육면체의 전개도")) {
    const e = intBetween(rng, 3, 12);
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        `한 모서리의 길이가 ${n(e)} cm인 정육면체의 전개도입니다. 이 전개도를 접었을 때 서로 마주 보는 면은 모두 몇 쌍입니까?`,
        n(3),
        `정육면체는 면이 ${n(6)}개이고 마주 보는 면끼리 짝을 이루므로 ${expr("6\\div2=3")}쌍입니다.`,
        fig("netCuboid", { w: e, d: e, h: e }),
      );
    }
    return make(
      unit,
      `한 모서리의 길이가 ${n(e)} cm인 정육면체의 전개도입니다. 이 전개도를 접어 만든 정육면체의 모든 모서리 길이의 합은 몇 cm입니까?`,
      n(12 * e),
      `정육면체의 모서리는 ${n(12)}개이므로 ${expr(`${e}\\times12=${12 * e}`)}입니다.`,
      fig("netCuboid", { w: e, d: e, h: e }),
    );
  }

  // 2-5-6 직육면체의 전개도
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 전개도입니다. 이 전개도를 접어 만든 직육면체의 모든 모서리 길이의 합은 몇 cm입니까?`,
      n(4 * (w + d + h)),
      `가로·세로·높이가 각각 ${n(4)}개씩이므로 ${expr(`(${w}+${d}+${h})\\times4=${4 * (w + d + h)}`)}입니다.`,
      fig("netCuboid", { w, d, h }),
    );
  }
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 전개도입니다. 이 전개도에서 가장 넓은 면의 넓이는 몇 cm²입니까?`,
    n(w * d),
    `면의 넓이는 ${expr(`${w}\\times${d}=${w * d}`)}, ${expr(`${w}\\times${h}=${w * h}`)}, ${expr(`${d}\\times${h}=${d * h}`)}이므로 가장 넓은 면은 ${n(w * d)}입니다.`,
    fig("netCuboid", { w, d, h }),
  );
}

/* ────────────────────────────── 2-6 평균과 가능성 ────────────────────────────── */

/**
 * 평균 문항의 소재 — (누구, 무엇, 단위, **그럴듯한 값의 범위**).
 *
 * ⚠️ 범위를 소재마다 두지 않으면 「선수 $5$명의 **키**를 조사했더니 평균이 $33$ cm」가
 * 나온다(실측 51/200). 산술도 표기도 소단원 조건도 전부 맞아서 **어느 가드도 못 본다** —
 * 수가 그 낱말과 어울리는지는 코드가 아니라 세상이 정하기 때문이다.
 */
const AVG_TOPICS = [
  ["학생", "몸무게", "kg", 28, 45],
  ["선수", "키", "cm", 150, 180],
  ["친구", "줄넘기 횟수", "번", 20, 60],
  ["학생", "수학 점수", "점", 60, 95],
  ["친구", "하루 운동 시간", "분", 20, 60],
] as const;

/** `lo`~`hi` 에서 `count` 로 나눈 나머지가 `want` 인 수. 범위가 `count` 보다 넓으면 안 빈다. */
function withResidue(
  lo: number,
  hi: number,
  count: number,
  want: number,
): number[] {
  const out: number[] = [];
  for (let v = lo; v <= hi; v += 1) if (v % count === want) out.push(v);
  return out;
}

function average(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;

  // 2-6-3 일이 일어날 가능성
  if (s.includes("가능성")) {
    if (intBetween(rng, 0, 1) === 0) {
      const k = intBetween(rng, 1, 5);
      const [num, den] = simplify(k, 6);
      return make(
        unit,
        `주사위를 한 번 굴릴 때 눈의 수가 ${n(k)} 이하일 가능성을 분수로 나타내시오.`,
        expr(`\\frac{${num}}{${den}}`),
        `나올 수 있는 눈은 ${n(6)}가지이고, 그중 ${n(k)} 이하인 것은 ${nums(Array.from({ length: k }, (_, i) => i + 1))}의 ${n(k)}가지입니다. 따라서 ${expr(`\\frac{${k}}{6}${k === num && den === 6 ? "" : `=\\frac{${num}}{${den}}`}`)}입니다.`,
      );
    }
    const total = pick(rng, [10, 12, 20]);
    const k = intBetween(rng, 2, total - 2);
    const [num, den] = simplify(k, total);
    return make(
      unit,
      `${n(1)}부터 ${n(total)}까지의 수가 하나씩 적힌 카드 ${n(total)}장 중에서 한 장을 뽑을 때, ${n(k)} 이하의 수가 적힌 카드를 뽑을 가능성을 분수로 나타내시오.`,
      expr(`\\frac{${num}}{${den}}`),
      `${n(total)}장 중 ${n(k)}장이므로 ${expr(`\\frac{${k}}{${total}}=\\frac{${num}}{${den}}`)}입니다.`,
    );
  }

  // 2-6-2 평균을 이용하여 문제해결하기 — 갈래 **둘**. 원장님 확정(2026-08-22, 「초5는 넣도록 해」).
  //  ㉠ 평균에서 **합**을 되찾는다
  //  ㉡ 자료 하나가 빠졌을 때 그 **값**을 되찾는다 (교과서에 있는데 우리가 안 내던 것)
  //
  // ⚠️ ㉡ 의 발문에는 「$5$명의 평균은」이 들어간다. `elementaryEngine.test.ts` 의 평균 검사가
  //    「의 평균」을 보고 **앞의 수들로 직접 검산**하는데, 여기 나열된 수는 **한 명이 빠진 것**이라
  //    그대로 두면 거짓 빨강이 난다. 그 검사는 team-lead 담당이라 발문 형태를 넘겨 맞추기로 했다
  //    (검사를 피하려고 발문을 비틀지 않는다 — 제품을 시험에 맞추는 것이다).
  if (s.includes("이용하여")) {
    const [who, what, unitName, lo, hi] = pick(rng, AVG_TOPICS);
    // `cm`·`kg` 은 수와 띄고, 한글 단위(`번`·`점`·`분`)는 붙여 쓴다.
    const sp = /^[a-z]/i.test(unitName) ? " " : "";

    // ㉠ 합 구하기
    if (intBetween(rng, 0, 1) === 0) {
      const count = intBetween(rng, 4, 8);
      const avg = intBetween(rng, lo, hi);
      return make(
        unit,
        `${who} ${n(count)}명의 ${wj(what, "을", "를")} 조사했더니 평균이 ${n(avg)}${sp}${unitName}입니다. ${who} ${n(count)}명의 ${wj(what, "을", "를")} 모두 더하면 몇 ${unitName}입니까?`,
        n(count * avg),
        `합은 평균에 자료의 수를 곱한 값이므로 ${expr(`${avg}\\times${count}=${count * avg}`)}입니다.`,
      );
    }

    // ㉡ 빠진 자료 값 구하기.
    // **자료를 먼저 정하고 평균을 유도한다.** 평균을 먼저 뽑으면 빠진 값이 범위를 벗어나
    // 「몸무게 $71$ kg 인 초등학생」이 나온다. 이렇게 하면 모든 값이 범위 안이고
    // 평균이 자연수인 것이 **구성으로** 보장된다.
    const count = intBetween(rng, 4, 6);
    const head: number[] = [];
    for (let i = 0; i < count - 1; i += 1) head.push(intBetween(rng, lo, hi));
    const partial = head.reduce((x, y) => x + y, 0);
    // 마지막 값은 합이 `count` 로 나누어떨어지게 고른다. 나머지가 같은 수는 `count` 마다
    // 하나씩 있으므로 범위가 `count` 보다 넓으면(모든 소재가 그렇다) 반드시 있다.
    const want = ((-partial % count) + count) % count;
    head.push(pick(rng, withResidue(lo, hi, count, want)));
    const total = head.reduce((x, y) => x + y, 0);
    const avg = total / count;

    // 가리는 자리를 씨앗마다 옮긴다 — 늘 마지막이 빠지면 자리가 단조롭다.
    const ordered = shuffled(rng, head);
    const missing = ordered[0]!;
    const shown = ordered.slice(1);
    const shownSum = shown.reduce((x, y) => x + y, 0);
    return make(
      unit,
      `${who} ${n(count)}명의 ${wj(what, "을", "를")} 조사했습니다. 그중 ${n(count - 1)}명의 ${wj(what, "은", "는")} ${nums(shown)}${sp}${unitName}이고, ${n(count)}명의 평균은 ${n(avg)}${sp}${unitName}입니다. 나머지 한 명의 ${wj(what, "은", "는")} 몇 ${unitName}입니까?`,
      n(missing),
      `${n(count)}명의 합은 ${expr(`${avg}\\times${count}=${total}`)}입니다. 여기에서 ${n(count - 1)}명의 합 ${nj(shownSum, "을", "를")} 빼면 ${expr(`${total}-${shownSum}=${missing}`)}입니다.`,
    );
  }

  // 2-6-1 평균 알아보기 — 세 수 또는 네 수의 평균.
  // 치우침의 합이 `0` 이므로 평균은 정확히 `avg` 다. 가장 큰 치우침(±18)보다 `avg` 를 크게 잡아
  // 자료에 음수가 생기지 않게 한다.
  const size = intBetween(rng, 3, 4);
  const avg = intBetween(rng, 20, 45);
  const offsets: number[] = [];
  let acc = 0;
  for (let i = 0; i < size - 1; i += 1) {
    const off = intBetween(rng, -6, 6);
    offsets.push(off);
    acc += off;
  }
  offsets.push(-acc);
  const values = shuffled(rng, offsets).map((off) => avg + off);
  return make(
    unit,
    `${nums(values)}의 평균을 구하시오.`,
    n(avg),
    `모두 더하면 ${n(values.reduce((x, y) => x + y, 0))}이고, 자료가 ${n(size)}개이므로 ${expr(`${values.reduce((x, y) => x + y, 0)}\\div${size}=${avg}`)}입니다.`,
  );
}

export const G5: Record<string, ChapterHandler> = {
  "초5|1-1 자연수의 혼합 계산": mixedCalc,
  "초5|1-2 약수와 배수": factor,
  "초5|1-3 대응 관계": correspond,
  "초5|1-4 약분과 통분": reduce,
  "초5|1-5 분수의 덧셈과 뺄셈": fracAddSub,
  "초5|1-6 다각형의 둘레와 넓이": area,
  "초5|2-1 수의 범위와 어림하기": estimate,
  "초5|2-2 분수의 곱셈": fracMul,
  "초5|2-3 합동과 대칭": congSym,
  "초5|2-4 소수의 곱셈": decMul,
  "초5|2-5 직육면체": cuboid,
  "초5|2-6 평균과 가능성": average,
};

/* ────────── 난이도 갈래 (D-71) — 초5 `1-6-2` 파일럿 ────────── */

/** 넓이 문항의 소재. 「직사각형」한 낱말만 되풀이하면 단조롭다(원장님 「유형은 다양할수록 환영」). */
const AREA_THINGS = [
  "색종이",
  "액자",
  "타일",
  "손수건",
  "스케치북",
  "게시판",
  "방석",
] as const;

/** 연산 — 치수가 **글로** 주어진다. 공식을 한 번 쓰면 끝난다. 그림 없음. */
function area62Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const side = intBetween(rng, 4, 15);
    return make(
      unit,
      `한 변의 길이가 ${n(side)} cm인 정사각형의 넓이는 몇 cm²입니까?`,
      n(side * side),
      `정사각형의 넓이는 한 변을 두 번 곱합니다. ${expr(`${side}\\times${side}=${side * side}`)}입니다.`,
    );
  }
  const w = intBetween(rng, 6, 18);
  const h = intBetween(rng, 3, w - 1);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(h)} cm인 직사각형의 넓이는 몇 cm²입니까?`,
    n(w * h),
    `직사각형의 넓이는 가로와 세로의 곱입니다. ${expr(`${w}\\times${h}=${w * h}`)}입니다.`,
  );
}

/**
 * 기본 — 치수를 **그림에서 읽는다**. 그래서 발문에 수가 없다.
 *
 * 그림이 주는 것은 «묻는 값(넓이)»이 아니라 «재료(가로·세로)»다 — 답을 알려 주지 않는다(R6).
 * 치수는 `areaPoly` 가 `measured()` 규칙으로 두 변에 적는다.
 */
function area62Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, AREA_THINGS);
  if (intBetween(rng, 0, 1) === 0) {
    const side = intBetween(rng, 4, 14);
    return make(
      unit,
      `다음 정사각형 모양 ${thing}의 넓이는 몇 cm²입니까?`,
      n(side * side),
      `그림에서 한 변이 ${n(side)} cm임을 읽습니다. ${expr(`${side}\\times${side}=${side * side}`)}입니다.`,
      fig("areaPoly", { shape: "rect", base: side, height: side }),
    );
  }
  const w = intBetween(rng, 7, 16);
  const h = intBetween(rng, 3, w - 1);
  return make(
    unit,
    `다음 직사각형 모양 ${thing}의 넓이는 몇 cm²입니까?`,
    n(w * h),
    `그림에서 가로가 ${n(w)} cm, 세로가 ${n(h)} cm임을 읽습니다. ${expr(`${w}\\times${h}=${w * h}`)}입니다.`,
    fig("areaPoly", { shape: "rect", base: w, height: h }),
  );
}

/**
 * 응용 — 둘레와 넓이를 **잇는다**. 한 걸음 더 가야 공식에 넣을 수를 얻는다.
 * 둘레는 언제나 짝수(`2(가로+세로)`)이고 나눗셈이 딱 떨어지는 것을 **구성이** 보장한다.
 */
function area62Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const side = intBetween(rng, 4, 15);
    const per = side * 4;
    return make(
      unit,
      `둘레가 ${n(per)} cm인 정사각형의 넓이는 몇 cm²입니까?`,
      n(side * side),
      `정사각형은 네 변의 길이가 같으므로 한 변은 ${expr(`${per}\\div4=${side}`)} cm입니다. 넓이는 ${expr(`${side}\\times${side}=${side * side}`)}입니다.`,
    );
  }
  const w = intBetween(rng, 5, 16);
  // 세로가 가로와 같으면 정사각형이라 「직사각형」이라 부르기 어색하다.
  const h = pick(
    rng,
    [3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((v) => v !== w),
  );
  const per = 2 * (w + h);
  return make(
    unit,
    `둘레가 ${n(per)} cm인 직사각형의 가로가 ${n(w)} cm입니다. 이 직사각형의 넓이는 몇 cm²입니까?`,
    n(w * h),
    `둘레의 절반이 가로와 세로의 합이므로 ${expr(`${per}\\div2=${w + h}`)} cm입니다. 세로는 ${expr(`${w + h}-${w}=${h}`)} cm이고, 넓이는 ${expr(`${w}\\times${h}=${w * h}`)}입니다.`,
  );
}

/**
 * 심화 — 넓이 → 한 변 → 둘레 → 세로 → 넓이. **네 걸음**이다.
 *
 * ⚠️ 「넓이 → 한 변」 역산은 **완전제곱수만** 쓴다. 초5 는 제곱근을 안 배웠고,
 * 곱셈구구로 `8\times8=64` 를 떠올려야 서는 문항이다. 그래서 한 변을 **먼저** 뽑고
 * 넓이를 유도한다 — 넓이를 먼저 뽑으면 제곱근이 없는 수가 나온다.
 */
function area62Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  // ⚠️ 한 변이 `4` 면 넓이와 둘레가 **둘 다 16** 이라, 해설에 `4×4=16` 이 뜻이 다른 채로
  //    두 번 나온다(넓이 한 번, 둘레 한 번). 초5 가 읽으면 헷갈린다 — 그래서 `5` 부터다.
  const side = intBetween(rng, 5, 12);
  const area = side * side;
  const half = side * 2; // 둘레가 같은 직사각형의 (가로+세로)
  // 양쪽 변을 `4` 이상으로 두어 지나치게 납작한 직사각형(`19×3`)을 피한다.
  const cands: number[] = [];
  for (let v = 4; v <= half - 4; v += 1) if (v !== side) cands.push(v);
  const w = pick(rng, cands);
  const h = half - w;
  const chain =
    `정사각형의 넓이가 ${n(area)} cm²이고 ${expr(`${side}\\times${side}=${area}`)}이므로 한 변은 ${n(side)} cm입니다. ` +
    `둘레는 ${expr(`${side}\\times4=${side * 4}`)} cm이고, 직사각형도 둘레가 같으므로 가로와 세로의 합은 ${expr(`${side * 4}\\div2=${half}`)} cm입니다. `;
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `넓이가 ${n(area)} cm²인 정사각형과 둘레가 같은 직사각형이 있습니다. 이 직사각형의 가로가 ${n(w)} cm일 때, 넓이는 몇 cm²입니까?`,
      n(w * h),
      `${chain}세로는 ${expr(`${half}-${w}=${h}`)} cm이므로 넓이는 ${expr(`${w}\\times${h}=${w * h}`)}입니다.`,
    );
  }
  return make(
    unit,
    `넓이가 ${n(area)} cm²인 정사각형과 둘레가 같은 직사각형이 있습니다. 이 직사각형의 세로가 ${n(h)} cm일 때, 넓이는 몇 cm²입니까?`,
    n(w * h),
    `${chain}가로는 ${expr(`${half}-${h}=${w}`)} cm이므로 넓이는 ${expr(`${w}\\times${h}=${w * h}`)}입니다.`,
  );
}

/** 문형 05 — 넓이에서 세로. */
function area62Height(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 6, 18);
  const h = intBetween(rng, 3, w - 1);
  return make(
    unit,
    `넓이가 ${n(w * h)} cm²인 직사각형의 가로가 ${n(w)} cm입니다. 세로는 몇 cm입니까?`,
    n(h),
    `${expr(`${w * h}\\div${w}=${h}`)}입니다.`,
  );
}

/** 문형 06 — 1 cm² 타일로 덮는 장 수. */
function area62Tiles(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 5, 12);
  const h = intBetween(rng, 3, w - 1);
  return make(
    unit,
    `가로 ${n(w)} cm, 세로 ${n(h)} cm인 직사각형을 ${expr("1\\,\\mathrm{cm}^2")} 타일로 빈틈없이 덮으면 타일은 몇 장입니까?`,
    n(w * h),
    `넓이가 ${n(w * h)} cm²이므로 타일은 ${n(w * h)}장입니다.`,
  );
}

/** 문형 07 — 큰 정사각형에서 작은 정사각형을 뺀 넓이. */
function area62Frame(unit: UnitSeed, rng: Rng): ElemProblem {
  const outer = intBetween(rng, 8, 16);
  const inner = intBetween(rng, 3, outer - 3);
  return make(
    unit,
    `한 변이 ${n(outer)} cm인 정사각형 안에 한 변이 ${n(inner)} cm인 정사각형이 있습니다. 두 넓이 차는 몇 cm²입니까?`,
    n(outer * outer - inner * inner),
    `${expr(`${outer}\\times${outer}=${outer * outer}`)}, ${expr(`${inner}\\times${inner}=${inner * inner}`)}이므로 차는 ${n(outer * outer - inner * inner)}입니다.`,
  );
}

/** 문형 08 — 가로와 세로의 합. */
function area62Sum(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 6, 16);
  const h = intBetween(rng, 3, w - 1);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(h)} cm인 직사각형의 가로와 세로의 합은 몇 cm입니까?`,
    n(w + h),
    `${expr(`${w}+${h}=${w + h}`)}입니다.`,
  );
}

/** 문형 09 — 두 직사각형 넓이의 합. */
function area62TwoSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const w1 = intBetween(rng, 5, 12);
  const h1 = intBetween(rng, 3, w1 - 1);
  const w2 = intBetween(rng, 5, 12);
  const h2 = intBetween(rng, 3, w2 - 1);
  return make(
    unit,
    `가로 ${n(w1)} cm·세로 ${n(h1)} cm인 직사각형과 가로 ${n(w2)} cm·세로 ${n(h2)} cm인 직사각형의 넓이의 합은 몇 cm²입니까?`,
    n(w1 * h1 + w2 * h2),
    `${expr(`${w1}\\times${h1}=${w1 * h1}`)}, ${expr(`${w2}\\times${h2}=${w2 * h2}`)}이므로 합은 ${n(w1 * h1 + w2 * h2)}입니다.`,
  );
}

/** 문형 10 — 정사각형 넓이에서 한 변. */
function area62Side(unit: UnitSeed, rng: Rng): ElemProblem {
  const side = intBetween(rng, 5, 12);
  return make(
    unit,
    `넓이가 ${n(side * side)} cm²인 정사각형의 한 변의 길이는 몇 cm입니까?`,
    n(side),
    `${expr(`${side}\\times${side}=${side * side}`)}이므로 한 변은 ${n(side)} cm입니다.`,
  );
}

/* ────────── 1-6-1 정다각형과 사각형의 둘레 ────────── */

/** 둘레 문항의 생활 소재 — (무엇, 둘레에 두르는 것). */
const RIM_THINGS = [
  ["화단", "울타리"],
  ["게시판", "테두리 띠"],
  ["운동장", "흰 선"],
  ["텃밭", "그물"],
  ["사진", "액자 테"],
] as const;

/** 연산 — 공식 한 번. 도형 이름은 한자 수사(R4). */
function per61Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const sides = intBetween(rng, 3, 8);
    const side = intBetween(rng, 4, 16);
    return make(
      unit,
      `한 변의 길이가 ${n(side)} cm인 ${polyName(sides, true)}의 둘레는 몇 cm입니까?`,
      n(sides * side),
      `${wj(polyName(sides, true), "은", "는")} 변이 ${n(sides)}개이고 길이가 모두 같으므로 ${expr(`${side}\\times${sides}=${sides * side}`)}입니다.`,
    );
  }
  const w = intBetween(rng, 7, 18);
  const h = intBetween(rng, 3, w - 1);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(h)} cm인 직사각형의 둘레는 몇 cm입니까?`,
    n(2 * (w + h)),
    `직사각형은 마주 보는 변의 길이가 같으므로 ${expr(`(${w}+${h})\\times2=${2 * (w + h)}`)}입니다.`,
  );
}

/**
 * 기본 — **생활 문장 한 겹**. 식을 스스로 세운다.
 *
 * ⚠️ 1-6-2 기본이 「그림에서 치수 읽기」라 여기까지 그림으로 하면 두 소단원이 닮는다
 * (D-66 ⑸). 같은 2단이라도 **한 겹의 종류를 달리** 한다 — 여기는 문장, 저기는 그림.
 */
function per61Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const [place, rim] = pick(rng, RIM_THINGS);
  if (intBetween(rng, 0, 1) === 0) {
    const side = intBetween(rng, 5, 15);
    return make(
      unit,
      `한 변의 길이가 ${n(side)} m인 정사각형 모양 ${place} 둘레에 ${wj(rim, "을", "를")} 두르려고 합니다. ${wj(rim, "은", "는")} 몇 m 필요합니까?`,
      n(4 * side),
      `정사각형은 네 변의 길이가 같으므로 ${expr(`${side}\\times4=${4 * side}`)} m가 필요합니다.`,
    );
  }
  const w = intBetween(rng, 6, 16);
  const h = intBetween(rng, 3, w - 1);
  return make(
    unit,
    `가로가 ${n(w)} m, 세로가 ${n(h)} m인 직사각형 모양 ${place} 둘레에 ${wj(rim, "을", "를")} 두르려고 합니다. ${wj(rim, "은", "는")} 몇 m 필요합니까?`,
    n(2 * (w + h)),
    `둘레를 구하면 되므로 ${expr(`(${w}+${h})\\times2=${2 * (w + h)}`)} m가 필요합니다.`,
  );
}

/**
 * 응용 — 둘레에서 **길이**를 되찾는다. 두 단계(반둘레 → 합과 차).
 *
 * 1-6-2 응용은 둘레에서 **넓이**로 간다. 답의 종류가 달라 두 소단원이 안 닮는다.
 */
function per61Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const sides = intBetween(rng, 3, 8);
    const side = intBetween(rng, 4, 15);
    return make(
      unit,
      `둘레가 ${n(sides * side)} cm인 ${polyName(sides, true)}이 있습니다. 한 변의 길이는 몇 cm입니까?`,
      n(side),
      `${wj(polyName(sides, true), "은", "는")} 변이 ${n(sides)}개이고 길이가 모두 같으므로 ${expr(`${sides * side}\\div${sides}=${side}`)}입니다.`,
    );
  }
  // 합과 차 — 가로·세로로 만들어 두면 나누어떨어짐이 구성으로 보장된다.
  const h = intBetween(rng, 3, 12);
  const d = intBetween(rng, 2, 9);
  const w = h + d;
  return make(
    unit,
    `둘레가 ${n(2 * (w + h))} cm인 직사각형이 있습니다. 가로가 세로보다 ${n(d)} cm 더 길 때, 가로는 몇 cm입니까?`,
    n(w),
    `둘레의 절반이 가로와 세로의 합이므로 ${expr(`${2 * (w + h)}\\div2=${w + h}`)} cm입니다. 여기에 차 ${nj(d, "을", "를")} 더해 반으로 나누면 ${expr(`(${w + h}+${d})\\div2=${w}`)}입니다.`,
  );
}

/**
 * 심화 — **귀퉁이를 잘라도 둘레는 그대로**다. 잘린 두 변이 남은 두 변으로 옮겨 가기 때문.
 *
 * 카탈로그의 「직각으로 이루어진 도형의 둘레 구하기」 유형이다. 1-6-2 심화(넓이→변→둘레→넓이)와
 * 걸음도 답도 겹치지 않는다.
 */
function per61Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 9, 18);
  const h = intBetween(rng, 6, w - 2);
  const cw = intBetween(rng, 2, w - 4);
  const ch = intBetween(rng, 2, h - 3);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(h)} cm인 직사각형 모양 종이의 한 귀퉁이에서 가로가 ${n(cw)} cm, 세로가 ${n(ch)} cm인 직사각형을 잘라 냈습니다. 남은 도형의 둘레는 몇 cm입니까?`,
    n(2 * (w + h)),
    `잘라 낸 자리에서 없어진 두 변의 길이는 안쪽에 새로 생긴 두 변의 길이와 같습니다. 가로끼리 더하면 ${n(w)} cm, 세로끼리 더하면 ${n(h)} cm 그대로이므로 둘레는 처음 직사각형과 같은 ${expr(`(${w}+${h})\\times2=${2 * (w + h)}`)}입니다.`,
  );
}

/** 문형 05 — 정다각형의 변의 개수. */
function per61Sides(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 3, 8);
  const side = intBetween(rng, 4, 16);
  return make(
    unit,
    `한 변의 길이가 ${n(side)} cm이고 둘레가 ${n(sides * side)} cm인 정다각형의 변은 몇 개입니까?`,
    n(sides),
    `${expr(`${sides * side}\\div${side}=${sides}`)}이므로 변은 ${n(sides)}개입니다.`,
  );
}

/** 문형 06 — 반둘레(가로+세로). */
function per61Half(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 7, 18);
  const h = intBetween(rng, 3, w - 1);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(h)} cm인 직사각형의 가로와 세로의 합은 몇 cm입니까?`,
    n(w + h),
    `${expr(`${w}+${h}=${w + h}`)}입니다.`,
  );
}

/** 문형 07 — 세 변만 두를 때. */
function per61ThreeSides(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 7, 16);
  const h = intBetween(rng, 3, w - 1);
  return make(
    unit,
    `가로 ${n(w)} cm, 세로 ${n(h)} cm인 직사각형 화단의 한 가로변은 담에 붙어 있어 울타리를 안 칩니다. 울타리는 몇 cm 필요합니까?`,
    n(w + 2 * h),
    `두 세로와 한 가로이므로 ${expr(`${w}+${h}\\times2=${w + 2 * h}`)}입니다.`,
  );
}

/** 문형 08 — 정사각형과 직사각형 둘레의 차. */
function per61PerDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const side = intBetween(rng, 6, 14);
  const w = intBetween(rng, 7, 16);
  const h = intBetween(rng, 3, w - 1);
  const sq = 4 * side;
  const rect = 2 * (w + h);
  return make(
    unit,
    `한 변이 ${n(side)} cm인 정사각형의 둘레와 가로 ${n(w)} cm·세로 ${n(h)} cm인 직사각형의 둘레의 차는 몇 cm입니까?`,
    n(Math.abs(sq - rect)),
    `정사각형 둘레는 ${n(sq)} cm, 직사각형 둘레는 ${n(rect)} cm이므로 차는 ${n(Math.abs(sq - rect))}입니다.`,
  );
}

/** 문형 09 — 정다각형 한 변. */
function per61PolySide(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 5, 8);
  const side = intBetween(rng, 4, 12);
  return make(
    unit,
    `변이 ${n(sides)}개인 정다각형의 둘레가 ${n(sides * side)} cm입니다. 한 변의 길이는 몇 cm입니까?`,
    n(side),
    `${expr(`${sides * side}\\div${sides}=${side}`)}입니다.`,
  );
}

/** 문형 10 — 가로만 늘린 둘레 증가. */
function per61Grow(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 6, 14);
  const h = intBetween(rng, 3, w - 1);
  const dw = intBetween(rng, 2, 8);
  return make(
    unit,
    `가로 ${n(w)} cm, 세로 ${n(h)} cm인 직사각형의 가로만 ${n(dw)} cm 늘이면 둘레는 몇 cm 늘어납니까?`,
    n(2 * dw),
    `가로가 양쪽에 있으므로 둘레는 ${expr(`${dw}\\times2=${2 * dw}`)} cm 늘어납니다.`,
  );
}

/* ────────── 1-6-3 1cm²보다 더 큰 넓이의 단위 ────────── */

const ROOM_THINGS = [
  "교실 바닥",
  "강당 무대",
  "주차장",
  "체육관 바닥",
  "옥상 정원",
] as const;

/** 연산 — 단위 사이의 관계를 한 번 쓴다. */
function unit63Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `${expr(`${k}\\,\\mathrm{m}^2`)}는 몇 ${expr("\\mathrm{cm}^2")}입니까?`,
      n(k * 10000),
      `${expr("1\\,\\mathrm{m}=100\\,\\mathrm{cm}")}이므로 ${expr("1\\,\\mathrm{m}^2=10000\\,\\mathrm{cm}^2")}입니다. 따라서 ${expr(`${k}\\times10000=${k * 10000}`)}입니다.`,
    );
  }
  return make(
    unit,
    `${expr(`${k}\\,\\mathrm{km}^2`)}는 몇 ${expr("\\mathrm{m}^2")}입니까?`,
    n(k * 1000000),
    `${expr("1\\,\\mathrm{km}=1000\\,\\mathrm{m}")}이므로 ${expr("1\\,\\mathrm{km}^2=1000000\\,\\mathrm{m}^2")}입니다. 따라서 ${expr(`${k}\\times1000000=${k * 1000000}`)}입니다.`,
  );
}

/** 기본 — 문장에서 식을 세워 **큰 단위**로 답한다. */
function unit63Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, ROOM_THINGS);
  const w = intBetween(rng, 5, 20);
  const h = intBetween(rng, 4, 15);
  return make(
    unit,
    `가로가 ${n(w)} m, 세로가 ${n(h)} m인 직사각형 모양 ${place}의 넓이는 몇 ${expr("\\mathrm{m}^2")}입니까?`,
    n(w * h),
    `직사각형의 넓이는 가로와 세로의 곱이므로 ${expr(`${w}\\times${h}=${w * h}`)}입니다.`,
  );
}

/** 응용 — **작은 단위로 주고 큰 단위로 묻는다.** 환산 뒤 넓이(두 단계). */
function unit63Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, ROOM_THINGS);
  const w = intBetween(rng, 2, 9);
  const h = intBetween(rng, 2, 9);
  return make(
    unit,
    `가로가 ${n(w * 100)} cm, 세로가 ${n(h * 100)} cm인 직사각형 모양 ${wj(place, "이", "가")} 있습니다. 넓이는 몇 ${expr("\\mathrm{m}^2")}입니까?`,
    n(w * h),
    `${expr("100\\,\\mathrm{cm}=1\\,\\mathrm{m}")}이므로 가로는 ${n(w)} m, 세로는 ${n(h)} m입니다. 넓이는 ${expr(`${w}\\times${h}=${w * h}`)}입니다.`,
  );
}

/** 심화 — 단위가 섞인 **역산**. 넓이와 한 변에서 다른 변을 되찾는다. */
function unit63Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = pick(rng, ROOM_THINGS);
  const w = intBetween(rng, 2, 9);
  const h = intBetween(rng, 2, 9);
  return make(
    unit,
    `넓이가 ${expr(`${w * h}\\,\\mathrm{m}^2`)}인 직사각형 모양 ${wj(place, "이", "가")} 있습니다. 가로가 ${n(w * 100)} cm일 때 세로는 몇 m입니까?`,
    n(h),
    `가로 ${n(w * 100)} cm는 ${expr("100\\,\\mathrm{cm}=1\\,\\mathrm{m}")}이므로 ${n(w)} m입니다. 넓이는 가로와 세로의 곱이므로 세로는 ${expr(`${w * h}\\div${w}=${h}`)}입니다.`,
  );
}

/** 문형 05 — cm²를 m²로. */
function unit63Down(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  return make(
    unit,
    `${expr(`${k * 10000}\\,\\mathrm{cm}^2`)}는 몇 ${expr("\\mathrm{m}^2")}입니까?`,
    n(k),
    `${expr("10000\\,\\mathrm{cm}^2=1\\,\\mathrm{m}^2")}이므로 ${expr(`${k * 10000}\\div10000=${k}`)}입니다.`,
  );
}

/** 문형 06 — m² → cm² 값이 맞는지 판정. */
function unit63Fact(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const ok = intBetween(rng, 0, 1) === 0;
  const shown = ok ? k * 10000 : k * 1000;
  return make(
    unit,
    `${expr(`${k}\\,\\mathrm{m}^2`)}는 ${n(shown)} ${expr("\\mathrm{cm}^2")}입니까? (예, 아니요)`,
    ok ? "예" : "아니요",
    `${expr("1\\,\\mathrm{m}^2=10000\\,\\mathrm{cm}^2")}이므로 ${expr(`${k}\\times10000=${k * 10000}`)}입니다. 따라서 ${ok ? "맞습니다" : "틀렸습니다"}.`,
  );
}

/** 문형 07 — m 치수 넓이를 cm²로. */
function unit63ToCm2(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 2, 6);
  const h = intBetween(rng, 2, 6);
  return make(
    unit,
    `가로 ${n(w)} m, 세로 ${n(h)} m인 직사각형의 넓이는 몇 ${expr("\\mathrm{cm}^2")}입니까?`,
    n(w * h * 10000),
    `넓이는 ${n(w * h)} m²이고 ${expr("1\\,\\mathrm{m}^2=10000\\,\\mathrm{cm}^2")}이므로 ${expr(`${w * h}\\times10000=${w * h * 10000}`)}입니다.`,
  );
}

/** 문형 08 — km² → m² 역산. */
function unit63KmDown(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 8);
  return make(
    unit,
    `${expr(`${k * 1000000}\\,\\mathrm{m}^2`)}는 몇 ${expr("\\mathrm{km}^2")}입니까?`,
    n(k),
    `${expr("1\\,\\mathrm{km}^2=1000000\\,\\mathrm{m}^2")}이므로 ${expr(`${k * 1000000}\\div1000000=${k}`)}입니다.`,
  );
}

/** 문형 09 — 가로 cm, 세로 m 섞인 넓이 m². */
function unit63Mixed(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 2, 8);
  const h = intBetween(rng, 3, 9);
  return make(
    unit,
    `가로가 ${n(w * 100)} cm, 세로가 ${n(h)} m인 직사각형의 넓이는 몇 ${expr("\\mathrm{m}^2")}입니까?`,
    n(w * h),
    `가로 ${n(w * 100)} cm는 ${n(w)} m이므로 넓이는 ${expr(`${w}\\times${h}=${w * h}`)}입니다.`,
  );
}

/** 문형 10 — m²와 cm²를 견준다. */
function unit63Bigger(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 6);
  const b = intBetweenExcept(rng, 2, 8, a);
  const cm = b * 10000;
  const m2Bigger = a > b;
  const firstIsM2 = intBetween(rng, 0, 1) === 0;
  const p1 = firstIsM2
    ? expr(`${a}\\,\\mathrm{m}^2`)
    : expr(`${cm}\\,\\mathrm{cm}^2`);
  const p2 = firstIsM2
    ? expr(`${cm}\\,\\mathrm{cm}^2`)
    : expr(`${a}\\,\\mathrm{m}^2`);
  const ans = firstIsM2 === m2Bigger ? "㉠" : "㉡";
  return make(
    unit,
    `더 넓은 쪽을 찾아 기호를 쓰시오.  ㉠\u00a0${p1}\u3000\u3000㉡\u00a0${p2}`,
    ans,
    `${expr(`${cm}\\,\\mathrm{cm}^2=${b}\\,\\mathrm{m}^2`)}이므로 더 넓은 쪽은 ${ans}입니다.`,
  );
}

/* ────────── 1-6-4 평행사변형과 삼각형의 넓이 ────────── */

/** 1-6-4·1-6-5 기본의 소재. 1-6-2 기본(`AREA_THINGS`)과 **다른 풀**이라 두 소단원이 안 닮는다. */
const SHAPE_THINGS = [
  "표지판",
  "깃발",
  "연",
  "붙임딱지",
  "쿠키",
  "나무 조각",
  "받침",
] as const;

/** 연산 — 밑변·높이가 글로 주어진다. 그림 없음. */
function area64Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 3, 10) * 2;
  const h = intBetween(rng, 3, 12);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `밑변의 길이가 ${n(b)} cm, 높이가 ${n(h)} cm인 삼각형의 넓이는 몇 cm²입니까?`,
      n((b * h) / 2),
      `삼각형의 넓이는 밑변과 높이를 곱한 뒤 ${n(2)}로 나눕니다. ${expr(`${b}\\times${h}\\div2=${(b * h) / 2}`)}입니다.`,
    );
  }
  return make(
    unit,
    `밑변의 길이가 ${n(b)} cm, 높이가 ${n(h)} cm인 평행사변형의 넓이는 몇 cm²입니까?`,
    n(b * h),
    `평행사변형의 넓이는 밑변과 높이의 곱이므로 ${expr(`${b}\\times${h}=${b * h}`)}입니다.`,
  );
}

/** 기본 — 그림에서 밑변·높이를 읽는다. 발문에 수가 없다. */
function area64Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, SHAPE_THINGS);
  const b = intBetween(rng, 3, 9) * 2;
  const h = intBetween(rng, 3, 11);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `다음 삼각형 모양 ${thing}의 넓이는 몇 cm²입니까?`,
      n((b * h) / 2),
      `그림에서 밑변이 ${n(b)} cm, 높이가 ${n(h)} cm임을 읽습니다. ${expr(`${b}\\times${h}\\div2=${(b * h) / 2}`)}입니다.`,
      fig("areaPoly", { shape: "tri", base: b, height: h }),
    );
  }
  return make(
    unit,
    `다음 평행사변형 모양 ${thing}의 넓이는 몇 cm²입니까?`,
    n(b * h),
    `그림에서 밑변이 ${n(b)} cm, 높이가 ${n(h)} cm임을 읽습니다. ${expr(`${b}\\times${h}=${b * h}`)}입니다.`,
    fig("areaPoly", { shape: "para", base: b, height: h }),
  );
}

/** 응용 — 넓이에서 **높이**를 되찾는다. 삼각형은 두 단계(×2 뒤 ÷). */
function area64Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 3, 10) * 2;
  const h = intBetween(rng, 3, 12);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `넓이가 ${n((b * h) / 2)} cm²인 삼각형의 밑변이 ${n(b)} cm입니다. 높이는 몇 cm입니까?`,
      n(h),
      `삼각형의 넓이는 밑변과 높이를 곱한 뒤 ${n(2)}로 나눈 것이므로, 넓이에 ${n(2)}를 곱하면 밑변과 높이의 곱입니다. ${expr(`${(b * h) / 2}\\times2=${b * h}`)}이고 ${expr(`${b * h}\\div${b}=${h}`)}입니다.`,
    );
  }
  return make(
    unit,
    `넓이가 ${n(b * h)} cm²인 평행사변형의 밑변이 ${n(b)} cm입니다. 높이는 몇 cm입니까?`,
    n(h),
    `평행사변형의 넓이는 밑변과 높이의 곱이므로 높이는 ${expr(`${b * h}\\div${b}=${h}`)}입니다.`,
  );
}

/** 심화 — **넓이가 같은 두 도형**을 잇는다. 평행사변형 넓이 → 삼각형 높이(네 걸음). */
function area64Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const pb = intBetween(rng, 4, 12);
  const ph = intBetween(rng, 3, 10);
  const area = pb * ph;
  // 삼각형 밑변은 `2×넓이` 의 약수여야 높이가 자연수다.
  //
  // ⚠️ 후보를 **손 목록**으로 두면 빈 배열이 되어 던진다 — `pb=7,ph=7` 이면
  //    `2×넓이=98` 이고 옛 목록 `[4,5,6,8,10,12,15,16,20]` 의 어느 수로도 안 나뉜다
  //    (씨앗 1,000개 쓸기에서 30회 실측, 씨앗 16개로는 안 보인다).
  //    그래서 **실제 약수에서 유도**한다. 이러면 `pb` 자신이 언제나 후보에 있다 —
  //    `pb ∈ [4,12] ⊂ [4,20]` 이고 `2×넓이 ÷ pb = 2×ph ≤ 20 ≤ 30` 이므로
  //    두 조건을 다 통과한다. 즉 **구성상 절대 비지 않는다.**
  const tbCands = divisors(2 * area).filter(
    (v) => v >= 4 && v <= 20 && (2 * area) / v <= 30,
  );
  const tb = pick(rng, tbCands);
  const th = (2 * area) / tb;
  return make(
    unit,
    `밑변이 ${n(pb)} cm, 높이가 ${n(ph)} cm인 평행사변형과 넓이가 같은 삼각형이 있습니다. 이 삼각형의 밑변이 ${n(tb)} cm일 때 높이는 몇 cm입니까?`,
    n(th),
    `평행사변형의 넓이는 ${expr(`${pb}\\times${ph}=${area}`)}입니다. 삼각형도 넓이가 ${n(area)} cm²이고 넓이에 ${n(2)}를 곱하면 밑변과 높이의 곱이므로 ${expr(`${area}\\times2=${2 * area}`)}이고, 높이는 ${expr(`${2 * area}\\div${tb}=${th}`)}입니다.`,
  );
}

/** 문형 05 — 같은 밑변·높이에서 삼각형 넓이는 평행사변형의 반. */
function area64Half(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 3, 10) * 2;
  const h = intBetween(rng, 3, 12);
  return make(
    unit,
    `밑변 ${n(b)} cm, 높이 ${n(h)} cm인 평행사변형의 넓이는 몇 cm²이고, 같은 밑변과 높이를 가진 삼각형의 넓이는 몇 cm²입니까? 두 답을 차례로 쓰시오.`,
    `${n(b * h)}, ${n((b * h) / 2)}`,
    `평행사변형은 ${expr(`${b}\\times${h}=${b * h}`)}, 삼각형은 그 절반 ${n((b * h) / 2)}입니다.`,
  );
}

/** 문형 06 — 삼각형 밑변 역산. */
function area64TriBase(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 3, 10) * 2;
  const h = intBetween(rng, 3, 12);
  return make(
    unit,
    `넓이가 ${n((b * h) / 2)} cm²인 삼각형의 높이가 ${n(h)} cm입니다. 밑변은 몇 cm입니까?`,
    n(b),
    `${expr(`${(b * h) / 2}\\times2=${b * h}`)}, ${expr(`${b * h}\\div${h}=${b}`)}입니다.`,
  );
}

/** 문형 07 — 평행사변형 밑변. */
function area64ParaBase(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 4, 16);
  const h = intBetween(rng, 3, 12);
  return make(
    unit,
    `넓이가 ${n(b * h)} cm²인 평행사변형의 높이가 ${n(h)} cm입니다. 밑변은 몇 cm입니까?`,
    n(b),
    `${expr(`${b * h}\\div${h}=${b}`)}입니다.`,
  );
}

/** 문형 08 — 두 삼각형 넓이 합. */
function area64TwoTri(unit: UnitSeed, rng: Rng): ElemProblem {
  const b1 = intBetween(rng, 3, 8) * 2;
  const h1 = intBetween(rng, 3, 10);
  const b2 = intBetween(rng, 3, 8) * 2;
  const h2 = intBetween(rng, 3, 10);
  return make(
    unit,
    `밑변 ${n(b1)} cm·높이 ${n(h1)} cm인 삼각형과 밑변 ${n(b2)} cm·높이 ${n(h2)} cm인 삼각형의 넓이 합은 몇 cm²입니까?`,
    n((b1 * h1) / 2 + (b2 * h2) / 2),
    `${expr(`${b1}\\times${h1}\\div2=${(b1 * h1) / 2}`)}, ${expr(`${b2}\\times${h2}\\div2=${(b2 * h2) / 2}`)}이므로 합은 ${n((b1 * h1) / 2 + (b2 * h2) / 2)}입니다.`,
  );
}

/** 문형 09 — 평행사변형 넓이에서 삼각형 넓이(같은 치수). */
function area64ParaToTri(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 3, 10) * 2;
  const h = intBetween(rng, 3, 12);
  return make(
    unit,
    `밑변 ${n(b)} cm, 높이 ${n(h)} cm인 평행사변형과 밑변·높이가 같은 삼각형이 있습니다. 삼각형의 넓이는 몇 cm²입니까?`,
    n((b * h) / 2),
    `평행사변형 넓이의 반이므로 ${expr(`${b}\\times${h}\\div2=${(b * h) / 2}`)}입니다.`,
  );
}

/** 문형 10 — 높이만 두 배인 평행사변형. */
function area64DoubleH(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 4, 12);
  const h = intBetween(rng, 3, 8);
  return make(
    unit,
    `밑변 ${n(b)} cm, 높이 ${n(h)} cm인 평행사변형의 높이만 ${n(2)}배로 늘이면 넓이는 몇 cm²입니까?`,
    n(b * h * 2),
    `새 높이는 ${n(2 * h)} cm이므로 ${expr(`${b}\\times${2 * h}=${b * 2 * h}`)}입니다.`,
  );
}

/* ────────── 1-6-5 마름모와 사다리꼴의 넓이 ────────── */

/** 연산 — 치수가 글로. */
function area65Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const d1 = intBetween(rng, 3, 9) * 2;
    const d2 = pick(
      rng,
      [4, 5, 6, 7, 8, 9, 10, 11].filter((v) => v !== d1),
    );
    return make(
      unit,
      `두 대각선의 길이가 ${n(d1)} cm, ${n(d2)} cm인 마름모의 넓이는 몇 cm²입니까?`,
      n((d1 * d2) / 2),
      `마름모의 넓이는 두 대각선을 곱한 뒤 ${n(2)}로 나눕니다. ${expr(`${d1}\\times${d2}\\div2=${(d1 * d2) / 2}`)}입니다.`,
    );
  }
  const top = intBetween(rng, 3, 8);
  const bot = top + intBetween(rng, 3, 7);
  const h = 2 * intBetween(rng, 2, Math.min(5, Math.floor(bot / 2)));
  return make(
    unit,
    `윗변의 길이가 ${n(top)} cm, 아랫변의 길이가 ${n(bot)} cm, 높이가 ${n(h)} cm인 사다리꼴의 넓이는 몇 cm²입니까?`,
    n(((top + bot) * h) / 2),
    `사다리꼴의 넓이는 두 변의 길이를 더해 높이를 곱한 뒤 ${n(2)}로 나눕니다. ${expr(`(${top}+${bot})\\times${h}\\div2=${((top + bot) * h) / 2}`)}입니다.`,
  );
}

/** 기본 — 그림에서 읽는다. */
function area65Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, SHAPE_THINGS);
  if (intBetween(rng, 0, 1) === 0) {
    const d1 = intBetween(rng, 3, 9) * 2;
    const d2 = pick(
      rng,
      [4, 5, 6, 7, 8, 9, 10, 11].filter((v) => v !== d1),
    );
    return make(
      unit,
      `다음 마름모 모양 ${thing}의 넓이는 몇 cm²입니까?`,
      n((d1 * d2) / 2),
      `그림에서 두 대각선이 ${n(d1)} cm, ${n(d2)} cm임을 읽습니다. ${expr(`${d1}\\times${d2}\\div2=${(d1 * d2) / 2}`)}입니다.`,
      fig("areaPoly", { shape: "rhombus", base: d1, height: d2, d2 }),
    );
  }
  const top = intBetween(rng, 3, 8);
  const bot = top + intBetween(rng, 3, 7);
  const h = 2 * intBetween(rng, 2, Math.min(5, Math.floor(bot / 2)));
  return make(
    unit,
    `다음 사다리꼴 모양 ${thing}의 넓이는 몇 cm²입니까?`,
    n(((top + bot) * h) / 2),
    `그림에서 윗변 ${n(top)} cm, 아랫변 ${n(bot)} cm, 높이 ${n(h)} cm를 읽습니다. ${expr(`(${top}+${bot})\\times${h}\\div2=${((top + bot) * h) / 2}`)}입니다.`,
    fig("areaPoly", { shape: "trap", base: bot, height: h, top }),
  );
}

/** 응용 — 넓이에서 **모르는 대각선·윗변**을 되찾는다(두 단계). */
function area65Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const d1 = intBetween(rng, 3, 9) * 2;
    const d2 = pick(
      rng,
      [4, 5, 6, 7, 8, 9, 10, 11].filter((v) => v !== d1),
    );
    const area = (d1 * d2) / 2;
    return make(
      unit,
      `넓이가 ${n(area)} cm²인 마름모의 한 대각선이 ${n(d1)} cm입니다. 다른 대각선은 몇 cm입니까?`,
      n(d2),
      `마름모의 넓이에 ${n(2)}를 곱하면 두 대각선의 곱이므로 ${expr(`${area}\\times2=${d1 * d2}`)}이고, ${expr(`${d1 * d2}\\div${d1}=${d2}`)}입니다.`,
    );
  }
  const top = intBetween(rng, 3, 8);
  const bot = top + intBetween(rng, 3, 7);
  const h = 2 * intBetween(rng, 2, Math.min(5, Math.floor(bot / 2)));
  const area = ((top + bot) * h) / 2;
  return make(
    unit,
    `넓이가 ${n(area)} cm²인 사다리꼴의 아랫변이 ${n(bot)} cm, 높이가 ${n(h)} cm입니다. 윗변은 몇 cm입니까?`,
    n(top),
    `넓이에 ${n(2)}를 곱하고 높이로 나누면 두 변의 합이므로 ${expr(`${area}\\times2\\div${h}=${top + bot}`)} cm입니다. 여기에서 아랫변을 빼면 ${expr(`${top + bot}-${bot}=${top}`)}입니다.`,
  );
}

/** 심화 — 조건을 **조합**한다. 윗변과 아랫변의 차가 주어진 사다리꼴(네 걸음). */
function area65Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const top = intBetween(rng, 3, 9);
  const d = intBetween(rng, 2, 8);
  const bot = top + d;
  const h = 2 * intBetween(rng, 2, Math.min(5, Math.floor(bot / 2)));
  const area = ((top + bot) * h) / 2;
  return make(
    unit,
    `넓이가 ${n(area)} cm²이고 높이가 ${n(h)} cm인 사다리꼴이 있습니다. 아랫변이 윗변보다 ${n(d)} cm 더 길 때, 윗변은 몇 cm입니까?`,
    n(top),
    `넓이에 ${n(2)}를 곱하고 높이로 나누면 두 변의 합이므로 ${expr(`${area}\\times2\\div${h}=${top + bot}`)} cm입니다. 합에서 차를 빼고 반으로 나누면 짧은 변이므로 ${expr(`(${top + bot}-${d})\\div2=${top}`)}입니다.`,
  );
}

/** 문형 05 — 두 대각선의 곱. */
function area65DiagProd(unit: UnitSeed, rng: Rng): ElemProblem {
  const d1 = intBetween(rng, 3, 9) * 2;
  const d2 = pick(
    rng,
    [4, 5, 6, 7, 8, 9, 10, 11].filter((v) => v !== d1),
  );
  return make(
    unit,
    `두 대각선이 ${n(d1)} cm, ${n(d2)} cm인 마름모에서 두 대각선의 곱은 얼마입니까?`,
    n(d1 * d2),
    `${expr(`${d1}\\times${d2}=${d1 * d2}`)}입니다.`,
  );
}

/** 문형 06 — 사다리꼴 윗변+아랫변. */
function area65Bases(unit: UnitSeed, rng: Rng): ElemProblem {
  const top = intBetween(rng, 3, 8);
  const bot = top + intBetween(rng, 3, 7);
  const h = 2 * intBetween(rng, 2, Math.min(5, Math.floor(bot / 2)));
  return make(
    unit,
    `윗변 ${n(top)} cm, 아랫변 ${n(bot)} cm, 높이 ${n(h)} cm인 사다리꼴에서 윗변과 아랫변의 합은 몇 cm입니까?`,
    n(top + bot),
    `${expr(`${top}+${bot}=${top + bot}`)}입니다.`,
  );
}

/** 문형 07 — 마름모 넓이에서 ×2 (대각선 곱). */
function area65Twice(unit: UnitSeed, rng: Rng): ElemProblem {
  const d1 = intBetween(rng, 3, 9) * 2;
  const d2 = pick(
    rng,
    [4, 5, 6, 7, 8, 9, 10, 11].filter((v) => v !== d1),
  );
  const area = (d1 * d2) / 2;
  return make(
    unit,
    `넓이가 ${n(area)} cm²인 마름모의 넓이에 ${n(2)}를 곱하면 얼마입니까?`,
    n(d1 * d2),
    `두 대각선의 곱과 같으므로 ${n(d1 * d2)}입니다.`,
  );
}

/** 문형 08 — 사다리꼴 높이. */
function area65TrapH(unit: UnitSeed, rng: Rng): ElemProblem {
  const top = intBetween(rng, 3, 8);
  const bot = top + intBetween(rng, 3, 7);
  const h = 2 * intBetween(rng, 2, Math.min(5, Math.floor(bot / 2)));
  const area = ((top + bot) * h) / 2;
  return make(
    unit,
    `넓이가 ${n(area)} cm²인 사다리꼴의 윗변이 ${n(top)} cm, 아랫변이 ${n(bot)} cm입니다. 높이는 몇 cm입니까?`,
    n(h),
    `${expr(`${area}\\times2=${(top + bot) * h}`)}, ${expr(`${(top + bot) * h}\\div${top + bot}=${h}`)}입니다.`,
  );
}

/** 문형 09 — 두 마름모 넓이 합. */
function area65TwoRhomb(unit: UnitSeed, rng: Rng): ElemProblem {
  const a1 = intBetween(rng, 3, 6) * 2;
  const a2 = pick(
    rng,
    [4, 6, 8, 10].filter((v) => v !== a1),
  );
  const b1 = intBetween(rng, 3, 6) * 2;
  const b2 = pick(
    rng,
    [5, 7, 9, 11].filter((v) => v !== b1),
  );
  return make(
    unit,
    `대각선이 ${n(a1)} cm·${n(a2)} cm인 마름모와 대각선이 ${n(b1)} cm·${n(b2)} cm인 마름모의 넓이 합은 몇 cm²입니까?`,
    n((a1 * a2) / 2 + (b1 * b2) / 2),
    `${expr(`${a1}\\times${a2}\\div2=${(a1 * a2) / 2}`)}, ${expr(`${b1}\\times${b2}\\div2=${(b1 * b2) / 2}`)}이므로 합은 ${n((a1 * a2) / 2 + (b1 * b2) / 2)}입니다.`,
  );
}

/** 문형 10 — 사다리꼴에서 아랫변. */
function area65TrapBot(unit: UnitSeed, rng: Rng): ElemProblem {
  const top = intBetween(rng, 3, 8);
  const bot = top + intBetween(rng, 3, 7);
  const h = 2 * intBetween(rng, 2, Math.min(5, Math.floor(bot / 2)));
  const area = ((top + bot) * h) / 2;
  return make(
    unit,
    `넓이가 ${n(area)} cm²인 사다리꼴의 윗변이 ${n(top)} cm, 높이가 ${n(h)} cm입니다. 아랫변은 몇 cm입니까?`,
    n(bot),
    `${expr(`${area}\\times2\\div${h}=${top + bot}`)}, ${expr(`${top + bot}-${top}=${bot}`)}입니다.`,
  );
}

/* ────────── 1-1 자연수의 혼합 계산 — 난이도 4단 (D-72 확대 2차) ──────────
 *
 * 이 대단원은 **소단원 이름이 연산 집합을 내건다**(D-66 ⑼) — 1-1-1 은 (+·−) 또는 (×·÷)만,
 * 1-1-2 는 +·− 에 ×(또는 ÷) 하나, 1-1-3 은 네 연산 전부. 갈래 넷이 **모두** 그 집합을
 * 지킨다(발문·해설의 수식까지). units.ts 에 「괄호」 소단원은 없으므로(2026-08-23 확인)
 * 괄호는 소단원 축이 아니라 **갈래 축의 재료**다.
 *
 * 리드 지시(2026-08-23) 둘을 구성으로 보장한다:
 *  ① **순서가 답을 가른다** — 잘못된 순서(같은 층은 뒤부터, 층이 섞이면 왼쪽부터 그냥)로
 *    접은 값이 정답과 반드시 다르게 수를 뽑는다. 곱하는·나누는 수를 2 이상으로 두면
 *    대수적으로 언제나 갈린다(예: `a+b×c-d` 의 왼쪽부터 값과의 차는 `a(c-1)`).
 *  ② **모든 중간값이 자연수** — 나눗셈은 몫을 먼저 뽑아 나누어떨어짐을 구성으로 만든다.
 *    가드로 거르지 않는다(거르면 변형 공간이 씨앗에 따라 조용히 좁아진다).
 *
 * 기본과 응용을 가르는 한 겹: **기본은 직선형**(이야기 순서 그대로 왼쪽에서 오른쪽으로
 * 한 식이 선다), **응용은 묶음**(중간 덩어리를 먼저 계산해야 식이 선다 — 괄호가 생긴다).
 * 소재 풀은 소단원마다 서로 다르다(D-66 ⑸).
 */

/**
 * `lo..hi` 에서 `not` 을 뺀 수 하나.
 *
 * 혼합 계산은 「더했다 도로 빼기」(`+9-9`)·「나눴다 도로 곱하기」(`÷7×7`)가 나오면
 * 답이 발문의 수 그대로가 된다 — 계산을 안 해도 맞는 문항이다. 표본 눈검사에서 실제로
 * 나왔고(2026-08-23), 가드로 거르지 않고 **뽑는 범위에서 뺀다**.
 */
function intBetweenExcept(
  rng: Rng,
  lo: number,
  hi: number,
  not: number,
): number {
  const cands: number[] = [];
  for (let v = lo; v <= hi; v += 1) if (v !== not) cands.push(v);
  return pick(rng, cands);
}

/** 1-1-1 기본 ㉮ 타고 내리는 것. 이웃 소단원 풀과 겹치지 않는다(D-66 ⑸). */
const RIDE_THINGS = ["버스", "지하철", "기차"] as const;
/** 1-1-1 기본 ㉯ 잘라 잇는 것 (cm). */
const CUT_THINGS = ["리본", "끈", "철사"] as const;
/** 1-1-1 응용 ㉮ 모으는 것 — (무엇, 만들었다는 말). */
const FOLD_THINGS = [
  ["종이학", "접었습니다"],
  ["카드", "모았습니다"],
] as const;
/** 1-1-1 응용 ㉯ 봉지에 든 것. */
const BAG_THINGS = ["초콜릿", "젤리"] as const;

/** 연산 — 같은 층 두 연산을 왼쪽부터. 뒤를 먼저 접으면 값이 갈라진다(순서가 답을 가른다). */
function mix111Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    // `a-b+c` — 뒤(b+c)를 먼저 접으면 정답과 `2c` 만큼 어긋난다. `c ≥ 5` 라 언제나 갈린다.
    // `c ≠ b` — 같으면 뺐다 도로 더해 답이 `a` 그대로다.
    const a = intBetween(rng, 25, 80);
    const b = intBetween(rng, 7, a - 6);
    const c = intBetweenExcept(rng, 5, 20, b);
    return make(
      unit,
      expr(`${a}-${b}+${c}=\\square`),
      n(a - b + c),
      `덧셈과 뺄셈만 있으면 앞에서부터 차례로 계산합니다. ${expr(`${a}-${b}=${a - b}`)}이므로 ${expr(`${a - b}+${c}=${a - b + c}`)}입니다.`,
    );
  }
  // `a÷b×c` — 뒤(b×c)를 먼저 접으면 `a÷(b×c)` 가 되어 갈라진다(`c ≥ 2`).
  // `c ≠ b` — 같으면 나눴다 도로 곱해 답이 `a` 그대로다.
  const b = intBetween(rng, 2, 9);
  const q = intBetween(rng, 2, 9);
  const a = b * q;
  const c = intBetweenExcept(rng, 2, 9, b);
  return make(
    unit,
    expr(`${a}\\div${b}\\times${c}=\\square`),
    n(q * c),
    `곱셈과 나눗셈만 있으면 앞에서부터 차례로 계산합니다. ${expr(`${a}\\div${b}=${q}`)}이므로 ${expr(`${q}\\times${c}=${q * c}`)}입니다.`,
  );
}

/** 기본 — 직선형 문장 한 겹. 이야기 순서 그대로 한 식이 선다. */
function mix111Read(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const ride = pick(rng, RIDE_THINGS);
    const a = intBetween(rng, 20, 45);
    const b = intBetween(rng, 5, a - 8);
    const c = intBetweenExcept(rng, 3, 15, b); // 내린 수와 같으면 답이 처음 그대로다
    return make(
      unit,
      `${ride}에 ${n(a)}명이 타고 있었습니다. 이번 정거장에서 ${n(b)}명이 내리고 ${n(c)}명이 탔습니다. 지금 ${ride}에 타고 있는 사람은 몇 명입니까?`,
      n(a - b + c),
      `하나의 식으로 나타내면 ${expr(`${a}-${b}+${c}`)}입니다. 앞에서부터 계산하면 ${expr(`${a}-${b}=${a - b}`)}, ${expr(`${a - b}+${c}=${a - b + c}`)}입니다.`,
    );
  }
  // 자른 도막 «중» `c` 개를 잇는다 — 도막은 `b` 개뿐이므로 `c < b` 여야 이야기가 선다.
  const thing = pick(rng, CUT_THINGS);
  const b = intBetween(rng, 3, 9);
  const len = intBetween(rng, 3, 20);
  const a = b * len;
  const c = intBetween(rng, 2, b - 1);
  return make(
    unit,
    `길이가 ${n(a)} cm인 ${wj(thing, "을", "를")} 똑같이 ${n(b)}도막으로 잘랐습니다. 자른 도막 중 ${n(c)}개를 겹치지 않게 이어 붙이면 전체 길이는 몇 cm입니까?`,
    n(len * c),
    `하나의 식으로 나타내면 ${expr(`${a}\\div${b}\\times${c}`)}입니다. 앞에서부터 계산하면 ${expr(`${a}\\div${b}=${len}`)}, ${expr(`${len}\\times${c}=${len * c}`)}입니다.`,
  );
}

/** 응용 — 묶음 두 단계: 덜어 낼 것을 먼저 묶거나(㉮ 합), 전체를 먼저 만든다(㉯ 곱). */
function mix111Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const [thing, made] = pick(rng, FOLD_THINGS);
    const b = intBetween(rng, 6, 25);
    const c = intBetween(rng, 5, 20);
    const rest = intBetween(rng, 4, 30);
    const a = b + c + rest;
    return make(
      unit,
      `${wj(thing, "을", "를")} ${n(a)}개 ${made}. 동생에게 ${n(b)}개, 친구에게 ${n(c)}개를 주었습니다. 남은 ${wj(thing, "은", "는")} 몇 개입니까?`,
      n(rest),
      `준 것을 먼저 묶으면 ${expr(`${b}+${c}=${b + c}`)}입니다. 하나의 식으로 나타내면 ${expr(`${a}-(${b}+${c})`)}이므로 ${expr(`${a}-${b + c}=${rest}`)}입니다.`,
    );
  }
  const thing = pick(rng, BAG_THINGS);
  // `c ∉ {a, b}` — 겹치면 `×a÷a` 꼴로 접혀 답이 발문의 수 그대로다. 후보가 반드시
  // 남게 봉지 수를 4~6 으로 두고, `b=5` 일 때만 홀수 소수 곱을 피한다(5×5·7×5 는
  // 2~9 안의 «딴» 약수가 없다). 그러면 짝수 `a` 는 `2`, `a=9` 는 `3` 이 언제나 남는다.
  const b = intBetween(rng, 4, 6);
  const a = b === 5 ? pick(rng, [4, 6, 8, 9]) : intBetween(rng, 3, 9);
  const c = pick(
    rng,
    [2, 3, 4, 5, 6, 7, 8, 9].filter(
      (v) => (a * b) % v === 0 && v !== a * b && v !== a && v !== b,
    ),
  );
  return make(
    unit,
    `${wj(thing, "이", "가")} 한 봉지에 ${n(a)}개씩 ${n(b)}봉지 있습니다. 이 ${wj(thing, "을", "를")} ${n(c)}명이 남김없이 똑같이 나누어 가지면 한 사람이 몇 개씩 가지게 됩니까?`,
    n((a * b) / c),
    `전체를 먼저 구하면 ${expr(`${a}\\times${b}=${a * b}`)}입니다. 하나의 식으로 나타내면 ${expr(`${a}\\times${b}\\div${c}`)}이므로 ${expr(`${a * b}\\div${c}=${(a * b) / c}`)}입니다.`,
  );
}

/**
 * 심화 — 「잘못 계산했더니」(D-72 ⑵ 명시 유형). 어떤 수를 먼저 되찾고 바르게 계산한다.
 * 소단원의 두 얼굴대로 ㉮는 덧셈↔뺄셈, ㉯는 곱셈↔나눗셈을 바꿔 낸다.
 */
function mix111Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const b = intBetween(rng, 5, 25);
    const c = intBetween(rng, 10, 60);
    return make(
      unit,
      `어떤 수에 ${nj(b, "을", "를")} 더해야 할 것을 잘못하여 뺐더니 ${nj(c, "이", "가")} 되었습니다. 바르게 계산한 값은 얼마입니까?`,
      n(c + 2 * b),
      `어떤 수를 구하면 ${expr(`${c}+${b}=${c + b}`)}입니다. 바르게 계산하면 ${expr(`${c + b}+${b}=${c + 2 * b}`)}입니다.`,
    );
  }
  const b = intBetween(rng, 2, 6);
  const c = intBetween(rng, 2, 9);
  return make(
    unit,
    `어떤 수에 ${nj(b, "을", "를")} 곱해야 할 것을 잘못하여 ${nro(b)} 나누었더니 ${nj(c, "이", "가")} 되었습니다. 바르게 계산한 값은 얼마입니까?`,
    n(b * b * c),
    `어떤 수를 구하면 ${expr(`${c}\\times${b}=${b * c}`)}입니다. 바르게 계산하면 ${expr(`${b * c}\\times${b}=${b * b * c}`)}입니다.`,
  );
}

/** 문형 05 — 괄호를 치면 값이 갈린다. 묻는 것은 괄호 친 값(앞에서부터와 다름). */
function mix111Paren(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const b = intBetween(rng, 6, 20);
    const c = intBetweenExcept(rng, 5, 20, b);
    const a = b + c + intBetween(rng, 8, 40);
    return make(
      unit,
      `${expr(`${a}-${b}+${c}`)}에서 덧셈을 먼저 하려고 괄호를 치면 ${expr(`${a}-(${b}+${c})`)}가 됩니다. 괄호를 친 식의 값은 얼마입니까?`,
      n(a - b - c),
      `괄호 안을 먼저 계산합니다. ${expr(`${b}+${c}=${b + c}`)}이므로 ${expr(`${a}-${b + c}=${a - b - c}`)}입니다.`,
    );
  }
  const b = intBetween(rng, 2, 6);
  const c = intBetweenExcept(rng, 2, 6, b);
  const q = intBetween(rng, 2, 8);
  const a = b * c * q;
  return make(
    unit,
    `${expr(`${a}\\div${b}\\times${c}`)}에서 곱셈을 먼저 하려고 괄호를 치면 ${expr(`${a}\\div(${b}\\times${c})`)}가 됩니다. 괄호를 친 식의 값은 얼마입니까?`,
    n(q),
    `괄호 안을 먼저 계산합니다. ${expr(`${b}\\times${c}=${b * c}`)}이므로 ${expr(`${a}\\div${b * c}=${q}`)}입니다.`,
  );
}

/** 문형 06 — 앞에서부터 첫 걸음의 결과(최종값이 아님). */
function mix111FirstStep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const a = intBetween(rng, 25, 80);
    const b = intBetween(rng, 7, a - 6);
    const c = intBetweenExcept(rng, 5, 20, b);
    return make(
      unit,
      `${lj(`${a}-${b}+${c}`, "을", "를")} 앞에서부터 계산할 때, 첫 번째 계산의 결과는 얼마입니까?`,
      n(a - b),
      `덧셈과 뺄셈은 앞에서부터 계산합니다. 첫 번째는 ${expr(`${a}-${b}=${a - b}`)}입니다.`,
    );
  }
  const b = intBetween(rng, 2, 9);
  const q = intBetween(rng, 2, 9);
  const a = b * q;
  const c = intBetweenExcept(rng, 2, 9, b);
  return make(
    unit,
    `${lj(`${a}\\div${b}\\times${c}`, "을", "를")} 앞에서부터 계산할 때, 첫 번째 계산의 결과는 얼마입니까?`,
    n(q),
    `곱셈과 나눗셈은 앞에서부터 계산합니다. 첫 번째는 ${expr(`${a}\\div${b}=${q}`)}입니다.`,
  );
}

/** 문형 07 — 주어진 값이 바른지 판정(참·거짓). */
function mix111Judge(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const a = intBetween(rng, 25, 80);
    const b = intBetween(rng, 7, a - 6);
    const c = intBetweenExcept(rng, 5, 20, b);
    const right = a - b + c;
    const wrong = right + c;
    const ok = intBetween(rng, 0, 1) === 0;
    const shown = ok ? right : wrong;
    return make(
      unit,
      `${expr(`${a}-${b}+${c}=${shown}`)} 계산이 맞습니까? (예, 아니요)`,
      ok ? "예" : "아니요",
      `앞에서부터 계산하면 ${expr(`${a}-${b}=${a - b}`)}, ${expr(`${a - b}+${c}=${right}`)}입니다. 따라서 ${ok ? "맞습니다" : "틀렸습니다"}.`,
    );
  }
  const b = intBetween(rng, 2, 9);
  const q = intBetween(rng, 2, 9);
  const a = b * q;
  const c = intBetweenExcept(rng, 2, 9, b);
  const right = q * c;
  const wrong = q * b;
  const ok = intBetween(rng, 0, 1) === 0;
  const shown = ok ? right : wrong;
  return make(
    unit,
    `${expr(`${a}\\div${b}\\times${c}=${shown}`)} 계산이 맞습니까? (예, 아니요)`,
    ok ? "예" : "아니요",
    `앞에서부터 계산하면 ${expr(`${a}\\div${b}=${q}`)}, ${expr(`${q}\\times${c}=${right}`)}입니다. 따라서 ${ok ? "맞습니다" : "틀렸습니다"}.`,
  );
}

/** 문형 08 — 앞에서부터 계산한 값과 괄호를 친 값의 차. */
function mix111OrderDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const b = intBetween(rng, 6, 20);
    const c = intBetweenExcept(rng, 5, 20, b);
    const a = b + c + intBetween(rng, 8, 40);
    const left = a - b + c;
    const paren = a - b - c;
    return make(
      unit,
      `${lj(`${a}-${b}+${c}`, "을", "를")} 앞에서부터 계산한 값과 ${expr(`${a}-(${b}+${c})`)}의 값은 얼마만큼 다릅니까?`,
      n(left - paren),
      `앞에서부터 계산하면 ${expr(`${a}-${b}+${c}=${left}`)}이고, 괄호를 치면 ${expr(`${a}-(${b}+${c})=${paren}`)}입니다. 차는 ${expr(`${left}-${paren}=${left - paren}`)}입니다.`,
    );
  }
  const b = intBetween(rng, 2, 6);
  const c = intBetweenExcept(rng, 2, 6, b);
  const q = intBetween(rng, 2, 8);
  const a = b * c * q;
  const left = (a / b) * c;
  const paren = a / (b * c);
  return make(
    unit,
    `${lj(`${a}\\div${b}\\times${c}`, "을", "를")} 앞에서부터 계산한 값과 ${expr(`${a}\\div(${b}\\times${c})`)}의 값은 얼마만큼 다릅니까?`,
    n(left - paren),
    `앞에서부터 계산하면 ${expr(`${a}\\div${b}\\times${c}=${left}`)}이고, 괄호를 치면 ${expr(`${a}\\div(${b}\\times${c})=${paren}`)}입니다. 차는 ${expr(`${left}-${paren}=${left - paren}`)}입니다.`,
  );
}

/** 문형 09 — 빠진 수(역산). 심화의 「잘못 계산」과 각도가 다르다. */
function mix111Missing(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const a = intBetween(rng, 25, 80);
    const b = intBetween(rng, 7, a - 6);
    const c = intBetweenExcept(rng, 5, 20, b);
    const r = a - b + c;
    return make(
      unit,
      `□ 안에 알맞은 수를 구하시오.  ${expr(`${a}-\\square+${c}=${r}`)}`,
      n(b),
      `앞에서부터 계산하면 ${expr(`${a}-\\square`)}에 ${nj(c, "을", "를")} 더해 ${nj(r, "이", "가")} 됩니다. 따라서 ${expr(`${a}-\\square=${r}-${c}`)}, ${expr(`\\square=${a}-(${r}-${c})=${b}`)}입니다.`,
    );
  }
  const b = intBetween(rng, 2, 9);
  const q = intBetween(rng, 2, 9);
  const a = b * q;
  const c = intBetweenExcept(rng, 2, 9, b);
  const r = q * c;
  return make(
    unit,
    `□ 안에 알맞은 수를 구하시오.  ${expr(`${a}\\div\\square\\times${c}=${r}`)}`,
    n(b),
    `${expr(`${a}\\div\\square=${r}\\div${c}`)}이므로 ${expr(`\\square=${a}\\div${q}=${b}`)}입니다.`,
  );
}

/** 문형 10 — 두 식 중 값이 큰 것을 고른다. */
function mix111Bigger(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const b = intBetween(rng, 6, 20);
    const c = intBetweenExcept(rng, 5, 20, b);
    const a = b + c + intBetween(rng, 8, 40);
    const left = a - b + c;
    const paren = a - b - c;
    const firstIsLeft = intBetween(rng, 0, 1) === 0;
    const [p1, p2] = firstIsLeft
      ? [`${a}-${b}+${c}`, `${a}-(${b}+${c})`]
      : [`${a}-(${b}+${c})`, `${a}-${b}+${c}`];
    const ans = firstIsLeft ? "㉠" : "㉡";
    return make(
      unit,
      `값이 더 큰 식을 찾아 기호를 쓰시오.  ㉠\u00a0${expr(p1)}\u3000\u3000㉡\u00a0${expr(p2)}`,
      ans,
      `${expr(`${a}-${b}+${c}=${left}`)}, ${expr(`${a}-(${b}+${c})=${paren}`)}이므로 더 큰 것은 ${ans}입니다.`,
    );
  }
  const b = intBetween(rng, 2, 6);
  const c = intBetweenExcept(rng, 2, 6, b);
  const q = intBetween(rng, 2, 8);
  const a = b * c * q;
  const left = (a / b) * c;
  const paren = a / (b * c);
  const firstIsLeft = intBetween(rng, 0, 1) === 0;
  const [p1, p2] = firstIsLeft
    ? [`${a}\\div${b}\\times${c}`, `${a}\\div(${b}\\times${c})`]
    : [`${a}\\div(${b}\\times${c})`, `${a}\\div${b}\\times${c}`];
  const ans = firstIsLeft ? "㉠" : "㉡";
  return make(
    unit,
    `값이 더 큰 식을 찾아 기호를 쓰시오.  ㉠\u00a0${expr(p1)}\u3000\u3000㉡\u00a0${expr(p2)}`,
    ans,
    `${expr(`${a}\\div${b}\\times${c}=${left}`)}, ${expr(`${a}\\div(${b}\\times${c})=${paren}`)}이므로 더 큰 것은 ${ans}입니다.`,
  );
}

/* ── 1-1-2 덧셈, 뺄셈, 곱셈(나눗셈) — ×와 ÷ 중 **하나만** 낀다(둘 다면 1-1-3 이다) ── */

/** 1-1-2 기본 ㉮ 주고받는 것. */
const GIVE_THINGS = ["사탕", "과자"] as const;
/** 1-1-2 기본 ㉯ 나누어 갖는 것 (장). */
const PAPER_THINGS = ["색종이", "도화지"] as const;
/** 1-1-2 응용 ㉮ 문구점 물건 두 가지 — (물건1, 세는 말1, 물건2, 세는 말2). */
const STORE_PAIRS = [
  ["연필", "자루", "지우개", "개"],
  ["공책", "권", "볼펜", "자루"],
] as const;
/** 1-1-2 응용 ㉯ 상자에 덜어 두는 것. */
const MARBLE_THINGS = ["구슬", "바둑돌"] as const;

/** 연산 — 세 연산이 한 식에. 왼쪽부터 그냥 접으면 `a(c-1)` 만큼 어긋난다(`c ≥ 2`). */
function mix112Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const b = intBetween(rng, 3, 9);
    const c = intBetween(rng, 2, 6);
    const a = b * c + intBetween(rng, 5, 40);
    const d = intBetweenExcept(rng, 4, 15, b * c); // 뺀 만큼 도로 더하면 답이 a 다
    return make(
      unit,
      expr(`${a}-${b}\\times${c}+${d}=\\square`),
      n(a - b * c + d),
      `곱셈을 먼저 계산합니다. ${expr(`${b}\\times${c}=${b * c}`)}이므로 ${expr(`${a}-${b * c}+${d}=${a - b * c + d}`)}입니다.`,
    );
  }
  const c = intBetween(rng, 2, 9);
  const q = intBetween(rng, 2, 9);
  const b = c * q;
  const a = intBetween(rng, 10, 50);
  // 더한 몫만큼 도로 빼면 답이 `a` 다 — `d ≠ q`.
  const d = intBetweenExcept(rng, 2, Math.min(15, a + q - 2), q);
  return make(
    unit,
    expr(`${a}+${b}\\div${c}-${d}=\\square`),
    n(a + q - d),
    `나눗셈을 먼저 계산합니다. ${expr(`${b}\\div${c}=${q}`)}이므로 ${expr(`${a}+${q}-${d}=${a + q - d}`)}입니다.`,
  );
}

/** 기본 — 직선형 문장 한 겹(㉮ 곱셈이 낌 · ㉯ 나눗셈이 낌). */
function mix112Read(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const thing = pick(rng, GIVE_THINGS);
    const b = intBetween(rng, 2, 6);
    const c = intBetween(rng, 2, 6);
    const a = b * c + intBetween(rng, 3, 25);
    const d = intBetweenExcept(rng, 3, 15, b * c); // 준 만큼 도로 받으면 답이 a 다
    return make(
      unit,
      `${wj(thing, "을", "를")} ${n(a)}개 가지고 있습니다. 친구 ${n(b)}명에게 ${n(c)}개씩 나누어 주고, 어머니께 ${wj(thing, "을", "를")} ${n(d)}개 받았습니다. 지금 가지고 있는 ${wj(thing, "은", "는")} 몇 개입니까?`,
      n(a - b * c + d),
      `하나의 식으로 나타내면 ${expr(`${a}-${b}\\times${c}+${d}`)}입니다. 곱셈을 먼저 계산하면 ${expr(`${b}\\times${c}=${b * c}`)}이므로 ${expr(`${a}-${b * c}+${d}=${a - b * c + d}`)}입니다.`,
    );
  }
  const thing = pick(rng, PAPER_THINGS);
  const b = intBetween(rng, 2, 9);
  const q = intBetween(rng, 3, 12);
  const a = b * q;
  const c = intBetween(rng, 2, 9);
  const d = intBetweenExcept(rng, 2, q + c - 2, c); // 받은 만큼 도로 쓰면 답이 몫 그대로다
  return make(
    unit,
    `${wj(thing, "을", "를")} ${n(a)}장 준비해 모둠 ${n(b)}개에 똑같이 나누어 주었습니다. 우리 모둠은 받은 ${thing}에 ${n(c)}장을 더 받고 ${n(d)}장을 사용했습니다. 우리 모둠에 남은 ${wj(thing, "은", "는")} 몇 장입니까?`,
    n(q + c - d),
    `하나의 식으로 나타내면 ${expr(`${a}\\div${b}+${c}-${d}`)}입니다. 나눗셈을 먼저 계산하면 ${expr(`${a}\\div${b}=${q}`)}이므로 ${expr(`${q}+${c}-${d}=${q + c - d}`)}입니다.`,
  );
}

/** 응용 — 묶음 두 단계: 물건값을 먼저 묶거나(㉮), 남은 것을 먼저 묶는다(㉯). */
function mix112Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const [item1, cnt1, item2, cnt2] = pick(rng, STORE_PAIRS);
    const b = 100 * intBetween(rng, 3, 9);
    const c = intBetween(rng, 2, 6);
    const d = 100 * intBetween(rng, 2, 8);
    const e = intBetween(rng, 2, 6);
    const change = 100 * intBetween(rng, 1, 9);
    const cost = b * c + d * e;
    const a = cost + change;
    return make(
      unit,
      `문구점에서 한 ${cnt1}에 ${n(b)}원인 ${item1} ${n(c)}${wj(cnt1, "과", "와")} 한 ${cnt2}에 ${n(d)}원인 ${item2} ${n(e)}${wj(cnt2, "을", "를")} 사고 ${n(a)}원을 냈습니다. 거스름돈은 얼마입니까?`,
      n(change),
      `물건값을 먼저 묶으면 ${expr(`${b}\\times${c}+${d}\\times${e}=${cost}`)}입니다. 하나의 식으로 나타내면 ${expr(`${a}-(${b}\\times${c}+${d}\\times${e})`)}이므로 ${expr(`${a}-${cost}=${change}`)}입니다.`,
    );
  }
  const thing = pick(rng, MARBLE_THINGS);
  const q = intBetween(rng, 3, 9);
  const c = intBetween(rng, 2, 9);
  const b = intBetween(rng, 4, 20);
  const a = b + c * q;
  const d = intBetween(rng, 2, 9);
  return make(
    unit,
    `${wj(thing, "이", "가")} ${n(a)}개 있습니다. 그중 ${n(b)}개를 상자에 넣고, 남은 ${wj(thing, "을", "를")} ${n(c)}명이 똑같이 나누어 가졌습니다. 한 사람이 ${wj(thing, "을", "를")} ${n(d)}개씩 더 받으면 한 사람이 가진 ${wj(thing, "은", "는")} 몇 개가 됩니까?`,
    n(q + d),
    `남은 것을 먼저 묶으면 ${expr(`${a}-${b}=${c * q}`)}입니다. 하나의 식으로 나타내면 ${expr(`(${a}-${b})\\div${c}+${d}`)}이므로 ${expr(`${c * q}\\div${c}=${q}`)}, ${expr(`${q}+${d}=${q + d}`)}입니다.`,
  );
}

/**
 * 심화 — □ 역산. 갈래 둘은 □의 자리가 다르다(㉮ 곱해지는 수 · ㉯ 나누어지는 수).
 * 식이 □에 대해 일차라 답은 하나뿐이다.
 */
function mix112Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const m = intBetween(rng, 3, 9);
    const c = intBetween(rng, 2, 6);
    const a = intBetween(rng, 10, 40);
    const d = intBetween(rng, 2, Math.min(15, a + m * c - 2));
    const r = a + m * c - d;
    return make(
      unit,
      `□ 안에 알맞은 수를 구하시오.  ${expr(`${a}+\\square\\times${c}-${d}=${r}`)}`,
      n(m),
      // 수 뒤 조사는 소리가 정한다 — 「$\square\times6$는」이 나오는 자리라 «의 값은» 으로 피한다.
      `거꾸로 계산합니다. ${expr(`\\square\\times${c}`)}의 값은 ${expr(`${r}+${d}-${a}=${m * c}`)}이므로 ${expr(`\\square=${m * c}\\div${c}=${m}`)}입니다.`,
    );
  }
  const k = intBetween(rng, 2, 9);
  const c = intBetween(rng, 2, 6);
  const box = c * k;
  const a = k + intBetween(rng, 3, 40);
  const d = intBetween(rng, 2, 15);
  const r = a - k + d;
  return make(
    unit,
    `□ 안에 알맞은 수를 구하시오.  ${expr(`${a}-\\square\\div${c}+${d}=${r}`)}`,
    n(box),
    `거꾸로 계산합니다. ${expr(`\\square\\div${c}`)}의 값은 ${expr(`${a}+${d}-${r}=${k}`)}이므로 ${expr(`\\square=${k}\\times${c}=${box}`)}입니다.`,
  );
}

/** 문형 05 — 앞에서부터 그냥 접은 값(곱·나눗셈을 나중에). */
function mix112Ltr(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const b = intBetween(rng, 3, 9);
    const c = intBetween(rng, 2, 6);
    const d = intBetweenExcept(rng, 4, 15, b * c);
    const a = b * c + intBetween(rng, 5, 40);
    const ltr = (a - b) * c + d;
    return make(
      unit,
      `${lj(`${a}-${b}\\times${c}+${d}`, "을", "를")} 앞에서부터 차례로 계산하면 값은 얼마입니까?`,
      n(ltr),
      `앞에서부터 계산하면 ${expr(`${a}-${b}=${a - b}`)}, ${expr(`${a - b}\\times${c}=${(a - b) * c}`)}, ${expr(`${(a - b) * c}+${d}=${ltr}`)}입니다.`,
    );
  }
  const c = intBetween(rng, 2, 9);
  const q = intBetween(rng, 2, 9);
  const b = c * q;
  const k = intBetween(rng, 2, 8);
  const a = c * k;
  const d = intBetweenExcept(rng, 2, Math.min(15, k + q - 1), q);
  const ltr = (a + b) / c - d;
  return make(
    unit,
    `${lj(`${a}+${b}\\div${c}-${d}`, "을", "를")} 앞에서부터 차례로 계산하면 값은 얼마입니까?`,
    n(ltr),
    `앞에서부터 계산하면 ${expr(`${a}+${b}=${a + b}`)}, ${expr(`${a + b}\\div${c}=${(a + b) / c}`)}, ${expr(`${(a + b) / c}-${d}=${ltr}`)}입니다.`,
  );
}

/** 문형 06 — 곱셈·나눗셈을 먼저 한 첫 걸음. */
function mix112FirstOp(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const b = intBetween(rng, 3, 9);
    const c = intBetween(rng, 2, 6);
    const d = intBetweenExcept(rng, 4, 15, b * c);
    const a = b * c + intBetween(rng, 5, 40);
    return make(
      unit,
      `${lj(`${a}-${b}\\times${c}+${d}`, "을", "를")} 바르게 계산할 때, 가장 먼저 하는 계산의 결과는 얼마입니까?`,
      n(b * c),
      `곱셈을 먼저 계산합니다. ${expr(`${b}\\times${c}=${b * c}`)}입니다.`,
    );
  }
  const c = intBetween(rng, 2, 9);
  const q = intBetween(rng, 2, 9);
  const b = c * q;
  const a = intBetween(rng, 10, 50);
  const d = intBetweenExcept(rng, 2, Math.min(15, a + q - 2), q);
  return make(
    unit,
    `${lj(`${a}+${b}\\div${c}-${d}`, "을", "를")} 바르게 계산할 때, 가장 먼저 하는 계산의 결과는 얼마입니까?`,
    n(q),
    `나눗셈을 먼저 계산합니다. ${expr(`${b}\\div${c}=${q}`)}입니다.`,
  );
}

/** 문형 07 — 주어진 값이 바른지 판정. */
function mix112Judge(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const b = intBetween(rng, 3, 9);
    const c = intBetween(rng, 2, 6);
    const d = intBetweenExcept(rng, 4, 15, b * c);
    const a = b * c + intBetween(rng, 5, 40);
    const right = a - b * c + d;
    const wrong = (a - b) * c + d;
    const ok = intBetween(rng, 0, 1) === 0;
    const shown = ok ? right : wrong;
    return make(
      unit,
      `${expr(`${a}-${b}\\times${c}+${d}=${shown}`)} 계산이 맞습니까? (예, 아니요)`,
      ok ? "예" : "아니요",
      `곱셈을 먼저 계산하면 ${expr(`${b}\\times${c}=${b * c}`)}이므로 ${expr(`${a}-${b * c}+${d}=${right}`)}입니다. 따라서 ${ok ? "맞습니다" : "틀렸습니다"}.`,
    );
  }
  const c = intBetween(rng, 2, 9);
  const q = intBetween(rng, 2, 9);
  const b = c * q;
  const a = intBetween(rng, 10, 50);
  const d = intBetweenExcept(rng, 2, Math.min(15, a + q - 2), q);
  const right = a + q - d;
  const wrong = right + c;
  const ok = intBetween(rng, 0, 1) === 0;
  const shown = ok ? right : wrong;
  return make(
    unit,
    `${expr(`${a}+${b}\\div${c}-${d}=${shown}`)} 계산이 맞습니까? (예, 아니요)`,
    ok ? "예" : "아니요",
    `나눗셈을 먼저 계산하면 ${expr(`${b}\\div${c}=${q}`)}이므로 ${expr(`${a}+${q}-${d}=${right}`)}입니다. 따라서 ${ok ? "맞습니다" : "틀렸습니다"}.`,
  );
}

/** 문형 08 — 앞에서부터 접은 값과 바른 값의 차. */
function mix112OrderDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const b = intBetween(rng, 3, 9);
    const c = intBetween(rng, 2, 6);
    const d = intBetweenExcept(rng, 4, 15, b * c);
    const a = b * c + intBetween(rng, 5, 40);
    const right = a - b * c + d;
    const ltr = (a - b) * c + d;
    const diff = Math.abs(ltr - right);
    return make(
      unit,
      `${lj(`${a}-${b}\\times${c}+${d}`, "을", "를")} 앞에서부터 계산한 값과 바르게 계산한 값의 차는 얼마입니까?`,
      n(diff),
      `앞에서부터 계산하면 ${n(ltr)}이고, 곱셈을 먼저 하면 ${n(right)}입니다. 차는 ${n(diff)}입니다.`,
    );
  }
  const c = intBetween(rng, 2, 9);
  const q = intBetween(rng, 2, 9);
  const b = c * q;
  const k = intBetween(rng, 2, 8);
  const a = c * k;
  const d = intBetweenExcept(rng, 2, Math.min(15, k + q - 1), q);
  const right = a + q - d;
  const ltr = (a + b) / c - d;
  const diff = Math.abs(ltr - right);
  return make(
    unit,
    `${lj(`${a}+${b}\\div${c}-${d}`, "을", "를")} 앞에서부터 계산한 값과 바르게 계산한 값의 차는 얼마입니까?`,
    n(diff),
    `앞에서부터 계산하면 ${n(ltr)}이고, 나눗셈을 먼저 하면 ${n(right)}입니다. 차는 ${n(diff)}입니다.`,
  );
}

/** 문형 09 — 바른 값을 구한 뒤 더한다(두 단계). 심화 □ 역산과 지문이 겹치지 않게. */
function mix112ThenAdd(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 20);
  if (intBetween(rng, 0, 1) === 0) {
    const b = intBetween(rng, 3, 9);
    const c = intBetween(rng, 2, 6);
    const d = intBetweenExcept(rng, 4, 15, b * c);
    const a = b * c + intBetween(rng, 5, 40);
    const r = a - b * c + d;
    return make(
      unit,
      `${expr(`${a}-${b}\\times${c}+${d}`)}의 값에 ${nj(k, "을", "를")} 더하면 얼마입니까?`,
      n(r + k),
      `곱셈을 먼저 하면 ${expr(`${b}\\times${c}=${b * c}`)}, ${expr(`${a}-${b * c}+${d}=${r}`)}입니다. 더하면 ${expr(`${r}+${k}=${r + k}`)}입니다.`,
    );
  }
  const c = intBetween(rng, 2, 9);
  const q = intBetween(rng, 2, 9);
  const b = c * q;
  const a = intBetween(rng, 10, 50);
  const d = intBetweenExcept(rng, 2, Math.min(15, a + q - 2), q);
  const r = a + q - d;
  return make(
    unit,
    `${expr(`${a}+${b}\\div${c}-${d}`)}의 값에 ${nj(k, "을", "를")} 더하면 얼마입니까?`,
    n(r + k),
    `나눗셈을 먼저 하면 ${expr(`${b}\\div${c}=${q}`)}, ${expr(`${a}+${q}-${d}=${r}`)}입니다. 더하면 ${expr(`${r}+${k}=${r + k}`)}입니다.`,
  );
}

/** 문형 10 — 앞에서부터 접은 식과 바른 식 중 값이 큰 것. */
function mix112Bigger(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const b = intBetween(rng, 3, 9);
    const c = intBetween(rng, 2, 6);
    const d = intBetweenExcept(rng, 4, 15, b * c);
    const a = b * c + intBetween(rng, 5, 40);
    const right = a - b * c + d;
    const ltr = (a - b) * c + d;
    const rightExpr = `${a}-(${b}\\times${c})+${d}`;
    const ltrExpr = `(${a}-${b})\\times${c}+${d}`;
    const firstIsLtr = intBetween(rng, 0, 1) === 0;
    const [p1, p2] = firstIsLtr ? [ltrExpr, rightExpr] : [rightExpr, ltrExpr];
    const ans = firstIsLtr ? "㉠" : "㉡";
    return make(
      unit,
      `값이 더 큰 식을 찾아 기호를 쓰시오.  ㉠\u00a0${expr(p1)}\u3000\u3000㉡\u00a0${expr(p2)}`,
      ans,
      `${expr(`${ltrExpr}=${ltr}`)}, ${expr(`${rightExpr}=${right}`)}이므로 더 큰 것은 ${ans}입니다.`,
    );
  }
  const c = intBetween(rng, 2, 9);
  const q = intBetween(rng, 2, 9);
  const b = c * q;
  const k = intBetween(rng, 2, 8);
  const a = c * k;
  const d = intBetweenExcept(rng, 2, Math.min(15, k + q - 1), q);
  const right = a + q - d;
  const ltr = (a + b) / c - d;
  const rightExpr = `${a}+(${b}\\div${c})-${d}`;
  const ltrExpr = `(${a}+${b})\\div${c}-${d}`;
  const firstIsRight = intBetween(rng, 0, 1) === 0;
  const [p1, p2] = firstIsRight ? [rightExpr, ltrExpr] : [ltrExpr, rightExpr];
  const ans = firstIsRight ? "㉠" : "㉡";
  return make(
    unit,
    `값이 더 큰 식을 찾아 기호를 쓰시오.  ㉠\u00a0${expr(p1)}\u3000\u3000㉡\u00a0${expr(p2)}`,
    ans,
    `${expr(`${rightExpr}=${right}`)}, ${expr(`${ltrExpr}=${ltr}`)}이므로 더 큰 것은 ${ans}입니다.`,
  );
}

/* ── 1-1-3 덧셈, 뺄셈, 곱셈, 나눗셈 — 네 연산이 전부 든다 ── */

/** 1-1-3 기본 ㉮ 통에 나누어 담는 것 (L). */
const POUR_THINGS = ["물", "주스"] as const;
/** 1-1-3 기본 ㉯ 모아서 나누는 것 (장). */
const STICKER_THINGS = ["붙임딱지", "우표"] as const;
/** 1-1-3 응용 ㉮ 상자에 든 것. */
const BOX_SNACKS = ["쿠키", "빵"] as const;
/** 1-1-3 응용 ㉯ 바구니에 담는 것. */
const BASKET_THINGS = ["달걀", "감자"] as const;

/** 연산 — 네 연산 한 식(㉯는 괄호 포함). 왼쪽부터 그냥 접으면 갈라진다(`e ≥ 2`). */
function mix113Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 6);
  const q = intBetween(rng, 2, 9);
  const d = e * q;
  if (intBetween(rng, 0, 1) === 0) {
    const a = intBetween(rng, 3, 9);
    const b = intBetween(rng, 3, 9);
    const c = intBetweenExcept(rng, 5, 30, q); // 더한 만큼 몫으로 도로 빼면 답이 a×b 다
    return make(
      unit,
      expr(`${a}\\times${b}+${c}-${d}\\div${e}=\\square`),
      n(a * b + c - q),
      `곱셈과 나눗셈을 먼저 계산합니다. ${expr(`${a}\\times${b}=${a * b}`)}, ${expr(`${d}\\div${e}=${q}`)}이므로 ${expr(`${a * b}+${c}-${q}=${a * b + c - q}`)}입니다.`,
    );
  }
  const b = intBetween(rng, 3, 12);
  const a = b + intBetween(rng, 2, 12);
  const c = intBetween(rng, 2, 6);
  return make(
    unit,
    expr(`(${a}-${b})\\times${c}+${d}\\div${e}=\\square`),
    n((a - b) * c + q),
    `괄호 안을 먼저 계산합니다. ${expr(`${a}-${b}=${a - b}`)}, ${expr(`${a - b}\\times${c}=${(a - b) * c}`)}, ${expr(`${d}\\div${e}=${q}`)}이므로 ${expr(`${(a - b) * c}+${q}=${(a - b) * c + q}`)}입니다.`,
  );
}

/** 기본 — 직선형 문장 한 겹. 네 연산이 이야기 순서 그대로 선다. */
function mix113Read(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const thing = pick(rng, POUR_THINGS);
    const b = intBetween(rng, 2, 9);
    const base = intBetween(rng, 2, 9);
    const a = b * base;
    const c = intBetween(rng, 2, 5);
    const d = intBetween(rng, 2, 5);
    // 부은 만큼 도로 덜면 답이 처음 몫 그대로다 — `e ≠ c×d`.
    const e = intBetweenExcept(rng, 2, base + c * d - 2, c * d);
    return make(
      unit,
      `${wj(thing, "이", "가")} ${n(a)} L 있습니다. 이 ${wj(thing, "을", "를")} 통 ${n(b)}개에 똑같이 나누어 담은 뒤, 그중 한 통에 ${wj(thing, "을", "를")} ${n(c)} L씩 ${n(d)}번 더 부었습니다. 이 통에서 ${n(e)} L를 덜어 내면 이 통에 남는 ${wj(thing, "은", "는")} 몇 L입니까?`,
      n(base + c * d - e),
      `하나의 식으로 나타내면 ${expr(`${a}\\div${b}+${c}\\times${d}-${e}`)}입니다. 나눗셈과 곱셈을 먼저 계산하면 ${expr(`${a}\\div${b}=${base}`)}, ${expr(`${c}\\times${d}=${c * d}`)}이므로 ${expr(`${base}+${c * d}-${e}=${base + c * d - e}`)}입니다.`,
    );
  }
  const thing = pick(rng, STICKER_THINGS);
  const b = intBetween(rng, 2, 6);
  const c = intBetween(rng, 2, 6);
  const a = b * c + intBetween(rng, 5, 30);
  const e = intBetween(rng, 2, 9);
  const k = intBetweenExcept(rng, 2, 9, b * c); // 준 만큼 몫으로 도로 받으면 답이 a 다
  const d = e * k;
  return make(
    unit,
    `${wj(thing, "을", "를")} ${n(a)}장 모았습니다. 친구 ${n(b)}명에게 ${n(c)}장씩 나누어 주었습니다. 선생님께서 ${wj(thing, "을", "를")} ${n(d)}장 가져와 학생 ${n(e)}명에게 똑같이 나누어 주셔서 나도 한 사람 몫을 받았습니다. 지금 가지고 있는 ${wj(thing, "은", "는")} 몇 장입니까?`,
    n(a - b * c + k),
    `하나의 식으로 나타내면 ${expr(`${a}-${b}\\times${c}+${d}\\div${e}`)}입니다. 곱셈과 나눗셈을 먼저 계산하면 ${expr(`${b}\\times${c}=${b * c}`)}, ${expr(`${d}\\div${e}=${k}`)}이므로 ${expr(`${a}-${b * c}+${k}=${a - b * c + k}`)}입니다.`,
  );
}

/** 응용 — 묶음 두 단계: 전체를 먼저 묶어 나누거나(㉮), 남은 것을 먼저 묶어 나눈다(㉯). */
function mix113Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const thing = pick(rng, BOX_SNACKS);
    const people = intBetween(rng, 2, 9);
    const q = intBetween(rng, 4, 9);
    const total = people * q;
    // 상자 수를 정하고 상자에 최대한 담으면 낱개가 `1~d` 로 남는다 — 나머지가 아니라 구성이다.
    const d = intBetween(rng, 2, Math.min(6, Math.floor((total - 1) / 3)));
    const c = Math.floor((total - 1) / d);
    const g = total - c * d;
    const e = intBetween(rng, 1, q - 1);
    return make(
      unit,
      `${wj(thing, "이", "가")} 한 상자에 ${n(c)}개씩 ${n(d)}상자와 낱개 ${n(g)}개가 있습니다. 이 ${wj(thing, "을", "를")} ${n(people)}명이 남김없이 똑같이 나누어 가진 뒤, 한 사람이 ${n(e)}개를 먹었습니다. 이 사람에게 남은 ${wj(thing, "은", "는")} 몇 개입니까?`,
      n(q - e),
      `전체를 먼저 묶으면 ${expr(`${c}\\times${d}+${g}=${total}`)}입니다. 하나의 식으로 나타내면 ${expr(`(${c}\\times${d}+${g})\\div${people}-${e}`)}이므로 ${expr(`${total}\\div${people}=${q}`)}, ${expr(`${q}-${e}=${q - e}`)}입니다.`,
    );
  }
  const thing = pick(rng, BASKET_THINGS);
  const b = intBetween(rng, 2, 6);
  const c = intBetween(rng, 2, 6);
  const q = intBetween(rng, 2, 9);
  const d = intBetween(rng, 2, 9);
  const a = b * c + d * q;
  const e = intBetween(rng, 2, 9);
  return make(
    unit,
    `${wj(thing, "이", "가")} ${n(a)}개 있습니다. 하루에 ${n(b)}개씩 ${n(c)}일 동안 사용했습니다. 남은 ${wj(thing, "을", "를")} 바구니 ${n(d)}개에 남김없이 똑같이 나누어 담고, 바구니 한 개에 ${wj(thing, "을", "를")} ${n(e)}개 더 담았습니다. 이 바구니에 담긴 ${wj(thing, "은", "는")} 몇 개입니까?`,
    n(q + e),
    `사용한 것을 먼저 묶으면 ${expr(`${b}\\times${c}=${b * c}`)}입니다. 하나의 식으로 나타내면 ${expr(`(${a}-${b}\\times${c})\\div${d}+${e}`)}이므로 ${expr(`${a}-${b * c}=${d * q}`)}, ${expr(`${d * q}\\div${d}=${q}`)}, ${expr(`${q}+${e}=${q + e}`)}입니다.`,
  );
}

/**
 * 심화 — 조건 조합·역산. ㉮ 괄호를 빠뜨린 「잘못 계산」의 차(두 값의 차는 `a(c-1)` 로
 * 언제나 양수다) · ㉯ 괄호 속 □ 역산(네 걸음 거꾸로).
 */
function mix113Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 6);
  const q = intBetween(rng, 2, 9);
  const d = e * q;
  if (intBetween(rng, 0, 1) === 0) {
    const b = intBetween(rng, 3, 9);
    const c = intBetween(rng, 2, 5);
    // 잘못 계산한 값(`a-b×c+d÷e`)도 자연수여야 이야기가 선다 — `a ≥ b×c+2`.
    const a = b * c + intBetween(rng, 2, 40);
    const right = (a - b) * c + q;
    const wrong = a - b * c + q;
    return make(
      unit,
      `${lj(`(${a}-${b})\\times${c}+${d}\\div${e}`, "을", "를")} 계산해야 하는데, 잘못하여 괄호를 빠뜨리고 ${lro(`${a}-${b}\\times${c}+${d}\\div${e}`)} 계산했습니다. 바르게 계산한 값과 잘못 계산한 값의 차는 얼마입니까?`,
      n(right - wrong),
      `바르게 계산하면 ${expr(`${a}-${b}=${a - b}`)}, ${expr(`${a - b}\\times${c}=${(a - b) * c}`)}, ${expr(`${d}\\div${e}=${q}`)}이므로 ${expr(`${(a - b) * c}+${q}=${right}`)}입니다. 잘못 계산하면 ${expr(`${b}\\times${c}=${b * c}`)}이므로 ${expr(`${a}-${b * c}+${q}=${wrong}`)}입니다. 차는 ${expr(`${right}-${wrong}=${right - wrong}`)}입니다.`,
    );
  }
  const b = intBetween(rng, 3, 20);
  const c = intBetween(rng, 2, 6);
  const k = intBetween(rng, 2, 9);
  const x = b + c * k;
  const m1 = intBetween(rng, 2, 6);
  const m2 = intBetween(rng, 2, 6);
  const r = k + m1 * m2;
  return make(
    unit,
    `□ 안에 알맞은 수를 구하시오.  ${expr(`(\\square-${b})\\div${c}+${m1}\\times${m2}=${r}`)}`,
    n(x),
    `거꾸로 계산합니다. ${expr(`${m1}\\times${m2}=${m1 * m2}`)}이므로 ${expr(`(\\square-${b})\\div${c}`)}의 값은 ${expr(`${r}-${m1 * m2}=${k}`)}입니다. ${expr(`\\square-${b}`)}의 값은 ${expr(`${k}\\times${c}=${c * k}`)}이므로 ${expr(`\\square=${c * k}+${b}=${x}`)}입니다.`,
  );
}

/** 문형 05 — 곱셈만 먼저 한 결과. */
function mix113MulFirst(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 6);
  const q = intBetween(rng, 2, 9);
  const d = e * q;
  const a = intBetween(rng, 3, 9);
  const b = intBetween(rng, 3, 9);
  const c = intBetweenExcept(rng, 5, 30, q);
  return make(
    unit,
    `${lj(`${a}\\times${b}+${c}-${d}\\div${e}`, "을", "를")} 바르게 계산할 때, 곱셈의 결과는 얼마입니까?`,
    n(a * b),
    `곱셈과 나눗셈을 먼저 합니다. 곱셈은 ${expr(`${a}\\times${b}=${a * b}`)}입니다.`,
  );
}

/** 문형 06 — 주어진 값이 바른지 판정. */
function mix113Judge(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 6);
  const q = intBetween(rng, 2, 9);
  const d = e * q;
  const a = intBetween(rng, 3, 9);
  const b = intBetween(rng, 3, 9);
  const c = intBetweenExcept(rng, 5, 30, q);
  const right = a * b + c - q;
  const wrong = right + e;
  const ok = intBetween(rng, 0, 1) === 0;
  const shown = ok ? right : wrong;
  return make(
    unit,
    `${expr(`${a}\\times${b}+${c}-${d}\\div${e}=${shown}`)} 계산이 맞습니까? (예, 아니요)`,
    ok ? "예" : "아니요",
    `곱셈과 나눗셈을 먼저 하면 ${expr(`${a}\\times${b}=${a * b}`)}, ${expr(`${d}\\div${e}=${q}`)}이므로 ${expr(`${a * b}+${c}-${q}=${right}`)}입니다. 따라서 ${ok ? "맞습니다" : "틀렸습니다"}.`,
  );
}

/** 문형 07 — 앞에서부터 차례로 접은 값. 나눗셈이 딱 떨어지게 a×b+c-d 를 e의 배수로 잡는다. */
function mix113Ltr(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 6);
  const b = intBetween(rng, 3, 9);
  const c = intBetween(rng, 2, 6);
  const inner = intBetween(rng, 2, 9);
  const a = b + inner;
  const d = intBetween(rng, 2, 20);
  const acc = (a - b) * c + d;
  const pad = (e - (acc % e)) % e;
  const d2 = d + pad;
  const ltr = ((a - b) * c + d2) / e;
  return make(
    unit,
    `${lj(`(${a}-${b})\\times${c}+${d2}\\div${e}`, "을", "를")} 앞에서부터 괄호 다음을 차례로 계산하면 값은 얼마입니까?`,
    n(ltr),
    `괄호 안은 ${expr(`${a}-${b}=${a - b}`)}입니다. 앞에서부터 이으면 ${expr(`${a - b}\\times${c}=${(a - b) * c}`)}, ${expr(`${(a - b) * c}+${d2}=${(a - b) * c + d2}`)}, ${expr(`${(a - b) * c + d2}\\div${e}=${ltr}`)}입니다.`,
  );
}

/** 문형 08 — 곱셈 결과와 나눗셈 결과의 합(두 단계). */
function mix113MulDivSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 6);
  const q = intBetween(rng, 2, 9);
  const d = e * q;
  const a = intBetween(rng, 3, 9);
  const b = intBetween(rng, 3, 9);
  const c = intBetweenExcept(rng, 5, 30, q);
  return make(
    unit,
    `${expr(`${a}\\times${b}+${c}-${d}\\div${e}`)}에서 곱셈의 결과와 나눗셈의 결과를 더하면 얼마입니까?`,
    n(a * b + q),
    `곱셈은 ${expr(`${a}\\times${b}=${a * b}`)}, 나눗셈은 ${expr(`${d}\\div${e}=${q}`)}입니다. 합은 ${expr(`${a * b}+${q}=${a * b + q}`)}입니다.`,
  );
}

/** 문형 09 — 바른 값에 더한다. */
function mix113ThenAdd(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 6);
  const q = intBetween(rng, 2, 9);
  const d = e * q;
  const a = intBetween(rng, 3, 9);
  const b = intBetween(rng, 3, 9);
  const c = intBetweenExcept(rng, 5, 30, q);
  const r = a * b + c - q;
  const k = intBetween(rng, 2, 20);
  return make(
    unit,
    `${expr(`${a}\\times${b}+${c}-${d}\\div${e}`)}의 값에 ${nj(k, "을", "를")} 더하면 얼마입니까?`,
    n(r + k),
    `곱셈과 나눗셈을 먼저 하면 ${expr(`${a}\\times${b}=${a * b}`)}, ${expr(`${d}\\div${e}=${q}`)}이므로 ${expr(`${a * b}+${c}-${q}=${r}`)}입니다. 더하면 ${expr(`${r}+${k}=${r + k}`)}입니다.`,
  );
}

/** 문형 10 — 괄호 있는 식과 없는 식 중 값이 큰 것. */
function mix113Bigger(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 6);
  const q = intBetween(rng, 2, 9);
  const d = e * q;
  const b = intBetween(rng, 3, 9);
  const c = intBetween(rng, 2, 5);
  const a = b * c + intBetween(rng, 2, 40);
  const withParen = (a - b) * c + q;
  const noParen = a - b * c + q;
  const pExpr = `(${a}-${b})\\times${c}+${d}\\div${e}`;
  const nExpr = `${a}-${b}\\times${c}+${d}\\div${e}`;
  const firstIsParen = intBetween(rng, 0, 1) === 0;
  const [p1, p2] = firstIsParen ? [pExpr, nExpr] : [nExpr, pExpr];
  const ans = firstIsParen ? "㉠" : "㉡";
  return make(
    unit,
    `값이 더 큰 식을 찾아 기호를 쓰시오.  ㉠\u00a0${expr(p1)}\u3000\u3000㉡\u00a0${expr(p2)}`,
    ans,
    `${expr(`${pExpr}=${withParen}`)}, ${expr(`${nExpr}=${noParen}`)}이므로 더 큰 것은 ${ans}입니다.`,
  );
}

/* ────────── 1-2 약수와 배수 — 난이도 4단 (D-72 확대 3차) ──────────
 *
 * «수 규모 키우기 ≠ 다양성»(원장님 원칙) — 수는 FACTOR_NUMBERS(12~45)·최소공배수 ≤ 72
 * 급으로 묶고, 어려움은 전부 **유형 축**에서 온다(판별 · 범위 결합 · 지워진 약수 복원 ·
 * 나머지 조건 · 역산). 수 개념 소단원이라 2단(기본)은 「식 세우기」 대신 **판별·성질
 * 적용 한 겹**이다(D-72 ⑶ 유형별 변주와 같은 자리).
 *
 * 이웃 분리(D-66 ⑸)는 **낱말 수준**까지 간다 — 시험이 잠근다:
 *  · 1-2-1(한 수)·1-2-2(관계) 발문에는 공약수·공배수 계열 낱말이 없다.
 *  · 1-2-3(공약수 집합) 발문에는 «공배수»가, 1-2-5(공배수 집합) 발문에는 «공약수»가 없다.
 *  · 나눗셈·나누기 문장은 1-2-4(최대공약수 활용)만 쓴다. 시간·바둑판 활용은 1-2-6 만.
 *
 * 나머지 조건 문항의 정의역(리드 지시 2026-08-23): **나누는 수 > 나머지**를 뽑는
 * 범위로 보장한다(1-2-4 심화 r < g · 1-2-6 심화 r < min(a,b)) — 경계 위반은 에러가
 * 아니라 «그럴듯한 오답»으로 나가는 부류다. 시험이 그 경계를 다시 잰다.
 */

/** 두 수 뽑기 — 공약수가 «셋 이상»인 짝(최대공약수가 합성수). 1-2-3 이 쓴다. */
function pairWithRichGcd(rng: Rng): [number, number] {
  const a = pick(rng, FACTOR_NUMBERS);
  const b = pick(
    rng,
    FACTOR_NUMBERS.filter((x) => x !== a && divisors(gcd(a, x)).length >= 3),
  );
  return [a, b];
}

/** 1-2-4 활용 짝 — 최대공약수 ≥ 4 이고 (a/g)×(b/g) ≤ 20 라 «장수» 답도 작다. */
const GCD_PAIRS = [
  [18, 24],
  [24, 36],
  [16, 20],
  [27, 45],
  [20, 30],
  [28, 42],
  [30, 45],
  [32, 40],
  [24, 40],
  [36, 45],
] as const;

/** 1-2-5·1-2-6 짝 — 최대공약수 > 1 이고 최소공배수 ≤ 40. */
const LCM_PAIRS = [
  [4, 6],
  [6, 8],
  [6, 9],
  [8, 12],
  [4, 10],
  [9, 12],
  [6, 15],
  [8, 10],
  [10, 15],
  [12, 18],
] as const;

/** 서로소 — 최소공배수 = 두 수의 곱. 1-2-6 문형 09 의 «예» 갈래. */
const COPRIME_PAIRS = [
  [4, 9],
  [5, 8],
  [5, 9],
  [7, 10],
  [8, 9],
  [4, 5],
  [3, 8],
  [7, 8],
  [5, 6],
  [7, 9],
] as const;

/** «어떤 두 수의 최대공약수/최소공배수가 …» 꼴이 쓰는 값 풀. */
const GCD_GIVEN = [8, 12, 16, 18, 20, 24] as const;
const LCM_GIVEN = [8, 12, 14, 15, 16, 20] as const;

/* ── 1-2-1 약수와 배수 — «한 수»의 약수·배수만 다룬다 ── */

/** 연산 — k번째 약수·배수 하나를 짚는다(절차 한 번). */
function fac121Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    // FACTOR_NUMBERS 는 모두 합성수라 «두 번째로 작은 약수»(가장 작은 소인수)가 늘 있다.
    const num = pick(rng, FACTOR_NUMBERS);
    const d = divisors(num);
    return make(
      unit,
      `${n(num)}의 약수 중에서 두 번째로 작은 수를 구하시오.`,
      n(d[1]!),
      `${n(num)}의 약수는 ${nums(d)}입니다. 작은 수부터 두 번째는 ${n(d[1]!)}입니다.`,
    );
  }
  const b = intBetween(rng, 3, 12);
  const k = intBetween(rng, 5, 9);
  return make(
    unit,
    `${n(b)}의 배수 중에서 ${n(k)}번째로 작은 수를 구하시오.`,
    n(b * k),
    `${n(b)}의 배수를 작은 수부터 세면 ${n(k)}번째는 ${expr(`${b}\\times${k}=${b * k}`)}입니다.`,
  );
}

/** 기본 — 판별 한 겹: 약수가 아닌 것 / 배수인 것을 골라낸다. */
function fac121Read(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const num = pick(rng, FACTOR_NUMBERS);
    const d = divisors(num);
    const three = pickSome(rng, d.slice(1), 3);
    const notDiv: number[] = [];
    for (let v = 2; v < num; v += 1) if (num % v !== 0) notDiv.push(v);
    const bad = pick(rng, notDiv);
    return make(
      unit,
      `다음 수 중에서 ${n(num)}의 약수가 아닌 수를 찾아 쓰시오.  ${nums(shuffled(rng, [...three, bad]))}`,
      n(bad),
      `${n(num)}의 약수는 ${nums(d)}입니다. ${nj(bad, "은", "는")} ${nj(num, "을", "를")} 나누어떨어지게 하지 못하므로 약수가 아닙니다.`,
    );
  }
  const b = intBetween(rng, 4, 9);
  const mult = b * intBetween(rng, 3, 8);
  const notMul: number[] = [];
  for (let v = mult - b + 1; v <= mult + b - 1; v += 1)
    if (v % b !== 0 && v !== mult) notMul.push(v);
  const others = pickSome(rng, notMul, 3);
  return make(
    unit,
    `다음 수 중에서 ${n(b)}의 배수를 찾아 쓰시오.  ${nums(shuffled(rng, [mult, ...others]))}`,
    n(mult),
    `${expr(`${b}\\times${mult / b}=${mult}`)}이므로 ${nj(mult, "은", "는")} ${n(b)}의 배수입니다. 나머지는 ${nro(b)} 나누어떨어지지 않습니다.`,
  );
}

/** 응용 — 범위와 결합한다(두 단계): 1~M 의 배수 개수 · K보다 큰 약수 개수. */
function fac121Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const b = intBetween(rng, 4, 9);
    const k = intBetween(rng, 4, 8);
    const M = b * k + intBetween(rng, 1, b - 1);
    return make(
      unit,
      `${n(1)}부터 ${n(M)}까지의 수 중에서 ${n(b)}의 배수는 모두 몇 개입니까?`,
      n(k),
      `${n(M)}까지에 들어 있는 ${n(b)}의 배수 중 가장 큰 수는 ${expr(`${b}\\times${k}=${b * k}`)}입니다. 따라서 ${n(b)}의 배수는 모두 ${n(k)}개입니다.`,
    );
  }
  const num = pick(rng, FACTOR_NUMBERS);
  const d = divisors(num);
  const i = intBetween(rng, 1, d.length - 3);
  const K = d[i]!;
  const count = d.length - 1 - i;
  return make(
    unit,
    `${n(num)}의 약수 중에서 ${n(K)}보다 큰 수는 모두 몇 개입니까?`,
    n(count),
    `${n(num)}의 약수는 ${nums(d)}입니다. 이 중 ${n(K)}보다 큰 수는 ${nums(d.slice(i + 1))}의 ${n(count)}개입니다.`,
  );
}

/** 심화 — 지워진 약수 복원(가장 큰 약수가 곧 그 수다) · 약수∧배수 조건 조합. */
function fac121Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    // 약수가 5~6개인 수만 — 목록이 길면 지면이 늘어지고, 짧으면 복원이 시시하다.
    const num = pick(rng, [12, 16, 18, 20, 28, 32, 45]);
    const d = divisors(num);
    const hide = intBetween(rng, 1, d.length - 2);
    const shown = d
      .map((v, idx) => (idx === hide ? "\\square" : String(v)))
      .join(",\\ ");
    return make(
      unit,
      `어떤 수의 약수를 모두 작은 수부터 쓴 것입니다. □ 안에 알맞은 수를 구하시오.  ${expr(shown)}`,
      n(d[hide]!),
      `약수 중 가장 큰 수가 어떤 수 자신이므로 어떤 수는 ${n(num)}입니다. ${n(num)}의 약수는 ${nums(d)}이므로 □는 ${n(d[hide]!)}입니다.`,
    );
  }
  // ⚠️ 예전에는 「$30$의 약수 중에서 $5$의 배수를 모두」였다 — 나열하고 거르는 두 단계인데
  //    같은 소단원 응용(「$20$의 약수 중 $5$보다 큰 수는 몇 개」)이 **똑같이** 나열하고
  //    거른다. 걸음 수가 아니라 **하는 일**이 같아서 사다리가 안 올랐다.
  //    그래서 약수에서 어떤 수를 **되짚은 뒤 배수 쪽으로 건너가게** 바꿨다 —
  //    한 소단원의 두 낱말(약수·배수)을 한 문항에서 잇는다.
  const num = pick(rng, [12, 16, 18, 20, 28, 32, 45]);
  const cnt = intBetween(rng, 3, 6);
  const limit = num * cnt + intBetween(rng, 1, num - 1);
  return makeDeep(
    unit,
    `어떤 수의 약수를 모두 쓰면 ${nums(divisors(num))}입니다. ` +
      `어떤 수의 배수 중에서 ${n(limit)}보다 작은 수는 모두 몇 개입니까?`,
    n(cnt),
    [
      `약수 중 가장 큰 수가 어떤 수 자신이므로 어떤 수는 ${n(num)}입니다.`,
      `${expr(`${num}\\times${cnt}=${num * cnt}`)} 까지가 ${n(limit)}보다 작고 ` +
        `${expr(`${num}\\times${cnt + 1}=${num * (cnt + 1)}`)} 부터는 크므로 모두 ${n(cnt)}개입니다.`,
    ],
  );
}

/** 문형 05 — 약수의 개수. */
function fac121Count(unit: UnitSeed, rng: Rng): ElemProblem {
  const num = pick(rng, FACTOR_NUMBERS);
  const d = divisors(num);
  return make(
    unit,
    `${n(num)}의 약수는 모두 몇 개입니까?`,
    n(d.length),
    `${n(num)}의 약수는 ${nums(d)}이므로 ${n(d.length)}개입니다.`,
  );
}

/** 문형 06 — 가장 큰 약수는 그 수 자신(정의). */
function fac121Largest(unit: UnitSeed, rng: Rng): ElemProblem {
  const num = pick(rng, FACTOR_NUMBERS);
  return make(
    unit,
    `${n(num)}의 약수 중에서 가장 큰 수를 구하시오.`,
    n(num),
    `약수 중 가장 큰 수는 그 수 자신이므로 ${n(num)}입니다.`,
  );
}

/** 문형 07 — 약수의 합. */
function fac121Sum(unit: UnitSeed, rng: Rng): ElemProblem {
  const num = pick(rng, FACTOR_NUMBERS);
  const d = divisors(num);
  const sum = d.reduce((x, y) => x + y, 0);
  return make(
    unit,
    `${n(num)}의 약수를 모두 더하면 얼마입니까?`,
    n(sum),
    `${n(num)}의 약수는 ${nums(d)}입니다. 모두 더하면 ${n(sum)}입니다.`,
  );
}

/** 문형 08 — 짝수인 약수의 개수. */
function fac121EvenCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const num = pick(
    rng,
    FACTOR_NUMBERS.filter((x) => x % 2 === 0),
  );
  const evens = divisors(num).filter((v) => v % 2 === 0);
  return make(
    unit,
    `${n(num)}의 약수 중에서 짝수는 모두 몇 개입니까?`,
    n(evens.length),
    `${n(num)}의 약수는 ${nums(divisors(num))}입니다. 이 중 짝수는 ${nums(evens)}이므로 ${n(evens.length)}개입니다.`,
  );
}

/** 문형 09 — 1과 자기 자신을 뺀 약수 개수. */
function fac121InnerCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const num = pick(rng, FACTOR_NUMBERS);
  const inner = divisors(num).filter((v) => v !== 1 && v !== num);
  return make(
    unit,
    `${n(num)}의 약수 중에서 ${n(1)}과 자기 자신을 제외한 수는 모두 몇 개입니까?`,
    n(inner.length),
    `${n(num)}의 약수는 ${nums(divisors(num))}입니다. ${n(1)}과 ${nj(num, "을", "를")} 빼면 ${nums(inner)}이므로 ${n(inner.length)}개입니다.`,
  );
}

/** 문형 10 — M보다 작은 배수 중 가장 큰 수. */
function fac121LargestBelow(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 4, 9);
  const k = intBetween(rng, 4, 8);
  const M = b * k + intBetween(rng, 1, b - 1);
  return make(
    unit,
    `${n(b)}의 배수 중에서 ${n(M)}보다 작은 수 중 가장 큰 수를 구하시오.`,
    n(b * k),
    `${expr(`${b}\\times${k}=${b * k}`)}은 ${n(M)}보다 작고 ${expr(`${b}\\times${k + 1}=${b * (k + 1)}`)}부터는 ${n(M)} 이상이므로 ${n(b * k)}입니다.`,
  );
}

/* ── 1-2-2 약수와 배수의 관계 — 곱셈식 하나가 맺는 «관계»만 다룬다(목록 나열 없음) ── */

/** 연산 — 관계를 말하는 곱셈식의 □ 하나(절차 한 번). */
function rel122Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 3, 12);
  const b = intBetween(rng, 3, 9);
  const c = a * b;
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `${nj(c, "은", "는")} ${n(a)}의 배수입니다. □ 안에 알맞은 수를 구하시오.  ${expr(`${a}\\times\\square=${c}`)}`,
      n(b),
      `${expr(`${c}\\div${a}=${b}`)}이므로 □는 ${n(b)}입니다.`,
    );
  }
  return make(
    unit,
    `${nj(a, "은", "는")} ${n(c)}의 약수입니다. □ 안에 알맞은 수를 구하시오.  ${expr(`\\square\\times${a}=${c}`)}`,
    n(b),
    `${expr(`${c}\\div${a}=${b}`)}이므로 □는 ${n(b)}입니다.`,
  );
}

/** 기본 — 관계인 짝을 판별하거나(㉮), 관계의 이름을 답한다(㉯). */
function rel122Read(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const a = intBetween(rng, 3, 9);
    const k = intBetween(rng, 2, 6);
    const related: [number, number] = [a, a * k];
    const x = intBetween(rng, 4, 9);
    const y = x * intBetween(rng, 2, 4) + intBetween(rng, 1, x - 1);
    const unrelated: [number, number] = [x, y];
    const firstIsRelated = intBetween(rng, 0, 1) === 0;
    const [p1, p2] = firstIsRelated
      ? [related, unrelated]
      : [unrelated, related];
    return make(
      unit,
      `두 수가 약수와 배수의 관계인 것을 찾아 기호를 쓰시오.  ㉠\u00a0${n(p1[0])}, ${n(p1[1])}\u3000\u3000㉡\u00a0${n(p2[0])}, ${n(p2[1])}`,
      firstIsRelated ? "㉠" : "㉡",
      `${expr(`${a}\\times${k}=${a * k}`)}이므로 ${nj(a * k, "은", "는")} ${n(a)}의 배수이고 두 수는 약수와 배수의 관계입니다. ${nj(y, "은", "는")} ${nro(x)} 나누어떨어지지 않습니다.`,
    );
  }
  const a = intBetween(rng, 3, 12);
  const b = intBetween(rng, 3, 9);
  const c = a * b;
  return make(
    unit,
    `${nj(c, "은", "는")} ${n(a)}의 배수입니다. 그러면 ${nj(a, "은", "는")} ${n(c)}의 무엇인지 쓰시오.`,
    "약수",
    `${nj(c, "이", "가")} ${n(a)}의 배수이면 ${nj(a, "은", "는")} ${nj(c, "을", "를")} 나누어떨어지게 하므로 ${n(c)}의 약수입니다.`,
  );
}

/** 응용 — 관계인 수를 **모두** 찾거나(양방향 판별), 곱셈식이 주는 약수 넷을 읽는다. */
function rel122Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const a = pick(rng, [8, 9, 12, 15, 16, 18, 20]);
    const d = pick(
      rng,
      divisors(a).filter((v) => v >= 2 && v < a),
    );
    const m = a * intBetween(rng, 2, 4);
    // a<u<2a 라 u 는 a 의 배수도 약수도 아니다. w 는 a 를 나누지 못하는 작은 수.
    const u = a + intBetween(rng, 1, a - 1);
    const smalls: number[] = [];
    for (let v = 2; v < a; v += 1) if (a % v !== 0) smalls.push(v);
    const w = pick(rng, smalls);
    return make(
      unit,
      `다음 수 중에서 ${nj(a, "과", "와")} 약수와 배수의 관계인 수를 모두 찾아 쓰시오.  ${nums(shuffled(rng, [d, m, u, w]))}`,
      nums([d, m]),
      `${nj(d, "은", "는")} ${n(a)}의 약수이고 ${nj(m, "은", "는")} ${n(a)}의 배수입니다. 나머지 두 수는 ${nj(a, "과", "와")} 약수와 배수의 관계가 아닙니다.`,
    );
  }
  const p = intBetween(rng, 2, 8);
  const q = pick(
    rng,
    [2, 3, 4, 5, 6, 7, 8].filter((v) => v !== p),
  );
  const c = p * q;
  const lo = Math.min(p, q);
  const hi = Math.max(p, q);
  return make(
    unit,
    `다음 두 곱셈식에 나타난 수 중에서 ${n(c)}의 약수를 모두 쓰시오.  ${expr(`1\\times${c}=${c}`)}, ${expr(`${p}\\times${q}=${c}`)}`,
    nums([1, lo, hi, c]),
    `${expr(`1\\times${c}=${c}`)}, ${expr(`${p}\\times${q}=${c}`)}이므로 이 식에서 알 수 있는 약수는 ${nums([1, lo, hi, c])}입니다.`,
  );
}

/** 심화 — «어떤 수와 N 이 관계» 를 크기 조건과 조합해 양방향으로 되찾는다. */
function rel122Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const num = pick(rng, [12, 16, 18, 20, 28]);
    const d = divisors(num).slice(0, -1);
    return make(
      unit,
      `어떤 수와 ${nj(num, "은", "는")} 약수와 배수의 관계입니다. 어떤 수가 ${n(num)}보다 작을 때, 어떤 수가 될 수 있는 수를 모두 구하시오.`,
      nums(d),
      `${n(num)}보다 작으면서 관계인 수는 ${n(num)}의 약수입니다. ${n(num)}의 약수 중 ${n(num)}보다 작은 수는 ${nums(d)}입니다.`,
    );
  }
  const b = intBetween(rng, 6, 9);
  const L = 4 * b - 1;
  return make(
    unit,
    `어떤 수와 ${nj(b, "은", "는")} 약수와 배수의 관계입니다. 어떤 수가 ${n(b)}보다 크고 ${n(L)}보다 작을 때, 어떤 수가 될 수 있는 수를 모두 구하시오.`,
    nums([2 * b, 3 * b]),
    `${n(b)}보다 크면서 관계인 수는 ${n(b)}의 배수입니다. ${n(b)}보다 크고 ${n(L)}보다 작은 ${n(b)}의 배수는 ${nums([2 * b, 3 * b])}입니다.`,
  );
}

/** 문형 05 — 배수인지 판정. */
function rel122IsMultiple(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 3, 9);
  const ok = intBetween(rng, 0, 1) === 0;
  const c = ok
    ? a * intBetween(rng, 2, 6)
    : a * intBetween(rng, 2, 6) + intBetween(rng, 1, a - 1);
  return make(
    unit,
    `${nj(c, "은", "는")} ${n(a)}의 배수입니까? (예, 아니요)`,
    ok ? "예" : "아니요",
    ok
      ? `${expr(`${c}\\div${a}=${c / a}`)}이므로 ${nj(c, "은", "는")} ${n(a)}의 배수입니다.`
      : `${nj(c, "은", "는")} ${nro(a)} 나누어떨어지지 않으므로 배수가 아닙니다.`,
  );
}

/** 문형 06 — 나누어떨어질 때의 몫. */
function rel122Quotient(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 3, 12);
  const b = intBetween(rng, 3, 9);
  const c = a * b;
  return make(
    unit,
    `${nj(c, "은", "는")} ${n(a)}의 배수입니다. ${nj(c, "을", "를")} ${nro(a)} 나누면 몫은 얼마입니까?`,
    n(b),
    `${expr(`${c}\\div${a}=${b}`)}이므로 몫은 ${n(b)}입니다.`,
  );
}

/** 문형 07 — 관계인 두 수의 곱. */
function rel122Product(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 3, 12);
  const b = intBetween(rng, 3, 9);
  const c = a * b;
  return make(
    unit,
    `${nj(a, "은", "는")} ${n(c)}의 약수입니다. 두 수 ${nj(a, "과", "와")} ${n(c)}의 곱은 얼마입니까?`,
    n(a * c),
    `${expr(`${a}\\times${c}=${a * c}`)}입니다.`,
  );
}

/** 문형 08 — L보다 큰 가장 작은 배수. */
function rel122NextMultiple(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 4, 9);
  const k = intBetween(rng, 3, 7);
  const L = a * k + intBetween(rng, 1, a - 1);
  return make(
    unit,
    `${n(a)}의 배수 중에서 ${n(L)}보다 큰 수 중 가장 작은 수를 구하시오.`,
    n(a * (k + 1)),
    `${expr(`${a}\\times${k}=${a * k}`)}은 ${n(L)} 이하이고, 바로 다음 배수는 ${expr(`${a}\\times${k + 1}=${a * (k + 1)}`)}입니다.`,
  );
}

/** 문형 09 — 나눗셈의 나머지(05는 배수 판정). */
function rel122Remainder(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 3, 9);
  const ok = intBetween(rng, 0, 1) === 0;
  const c = a * intBetween(rng, 3, 8);
  const x = ok ? a : a + intBetween(rng, 1, Math.min(4, a - 1));
  const rem = c % x;
  return make(
    unit,
    `${nj(c, "을", "를")} ${nro(x)} 나누면 나머지는 얼마입니까?`,
    n(rem),
    `${expr(`${c}\\div${x}`)}의 몫은 ${n(Math.floor(c / x))}이고 나머지는 ${n(rem)}입니다.`,
  );
}

/** 문형 10 — 곱셈식에서 알 수 있는 약수의 개수. */
function rel122FactorCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const p = intBetween(rng, 2, 8);
  const q = pick(
    rng,
    [2, 3, 4, 5, 6, 7, 8].filter((v) => v !== p),
  );
  const c = p * q;
  const uniq = [...new Set([1, Math.min(p, q), Math.max(p, q), c])];
  return make(
    unit,
    `다음 두 곱셈식에 나타난 수 중에서 ${n(c)}의 약수는 모두 몇 개입니까?  ${expr(`1\\times${c}=${c}`)}, ${expr(`${p}\\times${q}=${c}`)}`,
    n(uniq.length),
    `${expr(`1\\times${c}=${c}`)}, ${expr(`${p}\\times${q}=${c}`)}이므로 약수는 ${nums(uniq)}의 ${n(uniq.length)}개입니다.`,
  );
}

/* ── 1-2-3 공약수와 최대공약수 — 공약수를 «집합»으로 다룬다(공약수 = 최대공약수의 약수) ── */

/** 연산 — 두 번째로 큰 공약수를 짚거나, 최대공약수에서 공약수 전부를 편다. */
function comdiv123Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const [a, b] = pairWithRichGcd(rng);
    const cd = divisors(gcd(a, b));
    const second = cd[cd.length - 2]!;
    return make(
      unit,
      `${nj(a, "과", "와")} ${n(b)}의 공약수 중에서 두 번째로 큰 수를 구하시오.`,
      n(second),
      `두 수의 최대공약수는 ${n(gcd(a, b))}이고, 공약수는 최대공약수의 약수인 ${nums(cd)}입니다. 큰 수부터 두 번째는 ${n(second)}입니다.`,
    );
  }
  const g = pick(rng, GCD_GIVEN);
  return make(
    unit,
    `어떤 두 수의 최대공약수가 ${n(g)}입니다. 두 수의 공약수를 모두 구하시오.`,
    nums(divisors(g)),
    `공약수는 최대공약수의 약수입니다. ${n(g)}의 약수는 ${nums(divisors(g))}입니다.`,
  );
}

/** 기본 — 공약수 판별 · 최대공약수에서 공약수의 «개수»를 읽는다. */
function comdiv123Read(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const [a, b] = pairWithRichGcd(rng);
    const cd = divisors(gcd(a, b));
    const three = pickSome(rng, cd, 3);
    // 한쪽만 나누는 수 — 그럴듯한 미끼다. 두 수가 다르므로 반드시 있다.
    // 주어진 두 수 자신은 미끼로 어색하니 다른 후보가 있으면 피한다((16,32) 같은
    // 짝은 32 뿐이라 그때만 쓴다).
    const oneSided = [...divisors(a), ...divisors(b)].filter(
      (v) => !(a % v === 0 && b % v === 0),
    );
    const strangers = oneSided.filter((v) => v !== a && v !== b);
    const bad = pick(rng, strangers.length > 0 ? strangers : oneSided);
    return make(
      unit,
      `다음 수 중에서 ${nj(a, "과", "와")} ${n(b)}의 공약수가 아닌 수를 찾아 쓰시오.  ${nums(shuffled(rng, [...three, bad]))}`,
      n(bad),
      `두 수의 공약수는 ${nums(cd)}입니다. ${nj(bad, "은", "는")} 두 수 중 한쪽만 나누어떨어지게 하므로 공약수가 아닙니다.`,
    );
  }
  const g = pick(rng, GCD_GIVEN);
  return make(
    unit,
    `어떤 두 수의 최대공약수가 ${n(g)}입니다. 두 수의 공약수는 모두 몇 개입니까?`,
    n(divisors(g).length),
    `공약수는 최대공약수 ${n(g)}의 약수인 ${nums(divisors(g))}이므로 ${n(divisors(g).length)}개입니다.`,
  );
}

/** 응용 — 목록을 넘어 한 걸음: 공약수의 합 · 조건(K보다 큰)에 맞는 공약수. */
function comdiv123Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pairWithRichGcd(rng);
  const cd = divisors(gcd(a, b));
  if (intBetween(rng, 0, 1) === 0) {
    const sum = cd.reduce((x, y) => x + y, 0);
    return make(
      unit,
      `${nj(a, "과", "와")} ${n(b)}의 공약수를 모두 더하면 얼마입니까?`,
      n(sum),
      `공약수는 최대공약수 ${n(gcd(a, b))}의 약수인 ${nums(cd)}입니다. 모두 더하면 ${n(sum)}입니다.`,
    );
  }
  const i = intBetween(rng, 0, cd.length - 2);
  const K = cd[i]!;
  const rest = cd.slice(i + 1);
  return make(
    unit,
    `${nj(a, "과", "와")} ${n(b)}의 공약수 중에서 ${n(K)}보다 큰 수를 모두 구하시오.`,
    nums(rest),
    `공약수는 ${nums(cd)}입니다. 이 중 ${n(K)}보다 큰 수는 ${nums(rest)}입니다.`,
  );
}

/** 심화 — 공약수 목록에서 최대공약수를 «되찾고», 수를 셋으로 늘려 조합한다. */
function comdiv123Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  // ⚠️ 예전 두 갈래가 다 3단이었다.
  //    ㉠ 「공약수를 모두 쓰면 … 최대공약수는?」 — **가장 큰 수를 고르면 끝**(한 걸음).
  //       표지(「어떤 두 수」)가 붙어 사람 눈에도 안 왔다 — census 가 찾아냈다.
  //    ㉡ 「세 수의 최대공약수」 — 응용에 **수를 하나 더한 것**이라 계산량만 늘었다.
  //    이 소단원의 응용은 이미 「공약수를 모두 더하면」이므로, 심화는 그것을 **거꾸로**
  //    돌리거나(㉠) 공약수 안에서 **조건을 하나 더 겹친다**(㉡).
  //
  //    ⚠️ `makeDeep` 을 안 쓴다 — 이 부류는 «나열하고 따지기»라 해설에 계산식이 하나뿐이다.
  //       계산 걸음으로 4단을 재는 자는 여기서 거짓 경보를 낸다(census 머리말 참조).
  //       그래서 판정은 사람이 하고 `scripts/qa/reports/tier4-review.json` 에 남는다.
  const g = pick(rng, GCD_GIVEN);
  const ds = divisors(g);
  if (intBetween(rng, 0, 1) === 0) {
    const sum = ds.reduce((s, v) => s + v, 0);
    // ⚠️ **합만으로는 답이 하나가 아니다** — $42$ 는 $20$·$26$·$41$ 셋의 약수의 합이다.
    //    개수 조건을 같이 줘야 하나로 정해진다(그리고 그래야 «조건 겹침»이 된다).
    //    이 어긋남은 시험이 잡았다(「약수의 합이 같은 수가 둘이다」).
    return make(
      unit,
      `어떤 두 수의 공약수는 모두 ${n(ds.length)}개이고, 그 공약수를 모두 더하면 ` +
        `${nj(sum, "이", "가")} 됩니다. 두 수의 최대공약수를 구하시오.`,
      n(g),
      `공약수는 최대공약수의 약수입니다. 약수가 ${n(ds.length)}개이면서 그 합이 ` +
        `${nj(sum, "이", "가")} 되는 수를 찾으면 ${n(g)}입니다. ` +
        `${n(g)}의 약수는 ${nums(ds)}이고 ${expr(`${ds.join("+")}=${sum}`)} 입니다.`,
    );
  }
  const evens = ds.filter((v) => v % 2 === 0);
  return make(
    unit,
    `어떤 두 수의 최대공약수가 ${n(g)}입니다. 두 수의 공약수 중에서 짝수는 모두 몇 개입니까?`,
    n(evens.length),
    `공약수는 최대공약수의 약수이므로 ${n(g)}의 약수인 ${nums(ds)}입니다. ` +
      `이 중 짝수는 ${nums(evens)}이므로 모두 ${n(evens.length)}개입니다.`,
  );
}

/** 문형 05 — 최대공약수 값. */
function comdiv123Gcd(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pairWithRichGcd(rng);
  const g = gcd(a, b);
  return make(
    unit,
    `${nj(a, "과", "와")} ${n(b)}의 최대공약수를 구하시오.`,
    n(g),
    `공약수는 ${nums(divisors(g))}이고, 이 중 가장 큰 수가 최대공약수이므로 ${n(g)}입니다.`,
  );
}

/** 문형 06 — 가장 작은 공약수는 1(정의). */
function comdiv123Smallest(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pairWithRichGcd(rng);
  return make(
    unit,
    `${nj(a, "과", "와")} ${n(b)}의 공약수 중에서 가장 작은 수를 구하시오.`,
    n(1),
    `모든 자연수의 공약수에는 ${n(1)}이 들어 있으므로 가장 작은 공약수는 ${n(1)}입니다.`,
  );
}

/** 문형 07 — 홀수인 공약수 개수. */
function comdiv123OddCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pairWithRichGcd(rng);
  const odds = divisors(gcd(a, b)).filter((v) => v % 2 === 1);
  return make(
    unit,
    `${nj(a, "과", "와")} ${n(b)}의 공약수 중에서 홀수는 모두 몇 개입니까?`,
    n(odds.length),
    `공약수는 ${nums(divisors(gcd(a, b)))}입니다. 이 중 홀수는 ${nums(odds)}이므로 ${n(odds.length)}개입니다.`,
  );
}

/** 문형 08 — 두 수를 최대공약수로 나눈 몫의 합. */
function comdiv123QuotientSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pairWithRichGcd(rng);
  const g = gcd(a, b);
  return make(
    unit,
    `${nj(a, "과", "와")} ${n(b)}를 최대공약수로 각각 나누면 몫이 나옵니다. 두 몫의 합은 얼마입니까?`,
    n(a / g + b / g),
    `최대공약수는 ${n(g)}이므로 몫은 ${n(a / g)}, ${n(b / g)}입니다. 합은 ${expr(`${a / g}+${b / g}=${a / g + b / g}`)}입니다.`,
  );
}

/** 문형 09 — 공약수 중 짝수의 합. */
function comdiv123EvenSum(unit: UnitSeed, rng: Rng): ElemProblem {
  let a = 0;
  let b = 0;
  for (let i = 0; i < 20; i += 1) {
    const pair = pairWithRichGcd(rng);
    if (gcd(pair[0], pair[1]) % 2 === 0) {
      [a, b] = pair;
      break;
    }
  }
  if (a === 0) [a, b] = [24, 36];
  const evens = divisors(gcd(a, b)).filter((v) => v % 2 === 0);
  const sum = evens.reduce((x, y) => x + y, 0);
  return make(
    unit,
    `${nj(a, "과", "와")} ${n(b)}의 공약수 중에서 짝수를 모두 더하면 얼마입니까?`,
    n(sum),
    `공약수 중 짝수는 ${evens.length === 0 ? "없습니다" : nums(evens)}입니다. 합은 ${n(sum)}입니다.`,
  );
}

/** 문형 10 — 가장 큰 공약수와 가장 작은 공약수의 합. */
function comdiv123MinMaxSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pairWithRichGcd(rng);
  const g = gcd(a, b);
  return make(
    unit,
    `${nj(a, "과", "와")} ${n(b)}의 공약수 중에서 가장 큰 수와 가장 작은 수의 합은 얼마입니까?`,
    n(g + 1),
    `가장 큰 공약수는 최대공약수 ${n(g)}이고 가장 작은 공약수는 ${n(1)}이므로 합은 ${expr(`${g}+1=${g + 1}`)}입니다.`,
  );
}

/* ── 1-2-4 최대공약수 구하는 방법 — 나누기·자르기 문장은 이 소단원만 쓴다 ── */

/** 연산 — 최대공약수 값을 구한다(해설이 나눗셈법을 보인다 — 표준의 약수 나열과 다른 길). */
function gcd124Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, GCD_PAIRS);
  const g = gcd(a, b);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `두 수 ${n(a)}, ${n(b)}의 최대공약수를 구하시오.`,
      n(g),
      `두 수를 ${nro(g)} 나누면 몫이 ${n(a / g)}, ${n(b / g)}이고 두 몫의 공약수는 ${n(1)}뿐입니다. 따라서 최대공약수는 ${n(g)}입니다.`,
    );
  }
  return make(
    unit,
    `두 수 ${n(a)}, ${n(b)}의 공약수 중에서 가장 큰 수를 구하시오.`,
    n(g),
    `공약수 중 가장 큰 수가 최대공약수입니다. 두 수를 ${nro(g)} 나누면 몫 ${n(a / g)}, ${nj(b / g, "은", "는")} 공약수가 ${n(1)}뿐이므로 답은 ${n(g)}입니다.`,
  );
}

/** 기본 — 활용 문장 한 겹: 똑같이 나누기(사람 수) · 가장 큰 정사각형(한 변). 답이 곧 G 다. */
function gcd124Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, GCD_PAIRS);
  const g = gcd(a, b);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `사과 ${n(a)}개와 배 ${n(b)}개를 최대한 많은 학생에게 남김없이 똑같이 나누어 주려고 합니다. 학생은 최대 몇 명입니까?`,
      n(g),
      `학생 수는 ${nj(a, "과", "와")} ${nj(b, "을", "를")} 모두 나누어떨어지게 해야 하므로 두 수의 공약수입니다. 최대한 많은 학생은 최대공약수인 ${n(g)}명입니다.`,
    );
  }
  return make(
    unit,
    `가로가 ${n(a)} cm, 세로가 ${n(b)} cm인 직사각형 모양 종이를 남는 부분 없이 크기가 같은 가장 큰 정사각형으로 자르려고 합니다. 정사각형의 한 변은 몇 cm입니까?`,
    n(g),
    `정사각형의 한 변은 가로와 세로를 모두 나누어떨어지게 해야 하므로 두 수의 공약수입니다. 가장 큰 정사각형의 한 변은 최대공약수인 ${n(g)} cm입니다.`,
  );
}

/** 응용 — 두 단계: 최대공약수를 구한 «다음» 몫·장수를 묻는다. */
function gcd124Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, GCD_PAIRS);
  const g = gcd(a, b);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `밤 ${n(a)}개와 호두 ${n(b)}개를 최대한 많은 접시에 남김없이 똑같이 나누어 담으려고 합니다. 접시 한 개에 담는 밤은 몇 개입니까?`,
      n(a / g),
      `접시 수는 두 수의 최대공약수인 ${n(g)}개입니다. 접시 한 개에 담는 밤은 ${expr(`${a}\\div${g}=${a / g}`)}입니다.`,
    );
  }
  return make(
    unit,
    `가로가 ${n(a)} cm, 세로가 ${n(b)} cm인 직사각형 모양 게시판을 크기가 같은 가장 큰 정사각형 종이로 빈틈없이 덮으려고 합니다. 정사각형 종이는 모두 몇 장 필요합니까?`,
    n((a / g) * (b / g)),
    `가장 큰 정사각형의 한 변은 최대공약수인 ${n(g)} cm입니다. 가로로 ${expr(`${a}\\div${g}=${a / g}`)}장, 세로로 ${expr(`${b}\\div${g}=${b / g}`)}장이므로 모두 ${expr(`${a / g}\\times${b / g}=${(a / g) * (b / g)}`)}장입니다.`,
  );
}

/**
 * 심화 — 나머지 조건 역산. **나누는 수 > 나머지**를 뽑는 범위로 보장한다
 * (`r ≤ g-1`) — 경계를 어긴 문항은 에러가 아니라 «그럴듯한 오답»으로 나간다.
 */
function gcd124Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const g = pick(rng, [5, 6, 7, 8, 9]);
    const r1 = intBetween(rng, 1, g - 1);
    const r2 = intBetweenExcept(rng, 1, g - 1, r1);
    // 몫이 서로소여야 «가장 큰 어떤 수»가 정확히 g 다.
    const [p, q] = pick(rng, [
      [2, 3],
      [3, 4],
      [2, 5],
      [3, 5],
      [4, 5],
      [5, 6],
      [2, 7],
    ] as const);
    const a = g * p + r1;
    const b = g * q + r2;
    return make(
      unit,
      `${nj(a, "을", "를")} 어떤 수로 나누면 나머지가 ${n(r1)}이고, ${nj(b, "을", "를")} 어떤 수로 나누면 나머지가 ${n(r2)}입니다. 어떤 수 중에서 가장 큰 수를 구하시오.`,
      n(g),
      // 수 뒤 조사는 소리가 정한다 — expr 뒤에 «과/는» 을 박으면 「$14$과」가 나온다.
      `나머지를 빼면 ${expr(`${a}-${r1}=${g * p}`)}, ${expr(`${b}-${r2}=${g * q}`)}입니다. 이 두 수는 어떤 수로 나누어떨어지므로 어떤 수는 두 수의 공약수입니다. 최대공약수는 ${n(g)}이고, ${nj(g, "은", "는")} 나머지 ${nj(r1, "과", "와")} ${n(r2)}보다 크므로 어떤 수 중 가장 큰 수는 ${n(g)}입니다.`,
    );
  }
  const [a, b] = pick(rng, GCD_PAIRS);
  const g = gcd(a, b);
  return make(
    unit,
    `${nj(a, "과", "와")} ${nj(b, "을", "를")} 어떤 수로 나누면 두 수 모두 나누어떨어집니다. 어떤 수가 될 수 있는 수는 모두 몇 개입니까?`,
    n(divisors(g).length),
    `어떤 수는 두 수의 공약수입니다. 최대공약수 ${n(g)}의 약수인 ${nums(divisors(g))}이므로 모두 ${n(divisors(g).length)}개입니다.`,
  );
}

/** 문형 05 — 두 몫 중 더 큰 수. */
function gcd124BiggerQuot(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, GCD_PAIRS);
  const g = gcd(a, b);
  const hi = Math.max(a / g, b / g);
  return make(
    unit,
    `두 수 ${n(a)}, ${n(b)}를 최대공약수로 나누면 몫이 둘 나옵니다. 더 큰 몫은 얼마입니까?`,
    n(hi),
    `최대공약수는 ${n(g)}이므로 몫은 ${n(a / g)}, ${n(b / g)}입니다. 더 큰 몫은 ${n(hi)}입니다.`,
  );
}

/** 문형 06 — 최대공약수를 구한 뒤 한 수의 몫을 구한다. */
function gcd124Remainder(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, GCD_PAIRS);
  const g = gcd(a, b);
  const x = intBetween(rng, 0, 1) === 0 ? a : b;
  return make(
    unit,
    `두 수 ${n(a)}, ${n(b)}의 최대공약수로 ${nj(x, "을", "를")} 나눈 몫은 얼마입니까?`,
    n(x / g),
    `최대공약수는 ${n(g)}이고 ${expr(`${x}\\div${g}=${x / g}`)}이므로 몫은 ${n(x / g)}입니다.`,
  );
}

/** 문형 07 — 세 수의 최대공약수. */
function gcd124Three(unit: UnitSeed, rng: Rng): ElemProblem {
  const g = pick(rng, [4, 6, 8, 9]);
  const p = pick(rng, [2, 3, 4, 5]);
  const q = pick(
    rng,
    [2, 3, 4, 5, 7].filter((v) => v !== p),
  );
  const r = pick(
    rng,
    [2, 3, 5, 7].filter((v) => v !== p && v !== q),
  );
  const a = g * p;
  const b = g * q;
  const c = g * r;
  return make(
    unit,
    `세 수 ${n(a)}, ${n(b)}, ${n(c)}의 최대공약수를 구하시오.`,
    n(g),
    `세 수를 ${nro(g)} 나누면 몫이 ${n(p)}, ${n(q)}, ${n(r)}이고 이 몫들의 공약수는 ${n(1)}뿐입니다. 따라서 최대공약수는 ${n(g)}입니다.`,
  );
}

/** 문형 08 — 어떤 수가 두 수를 모두 나누는가. */
function gcd124DividesBoth(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantYes = altCase(rng);
  const [a, b] = pick(rng, GCD_PAIRS);
  const g = gcd(a, b);
  let d = wantYes ? g : g + 1;
  if (!wantYes) {
    while (a % d === 0 && b % d === 0) d += 1;
  }
  const yes = a % d === 0 && b % d === 0;
  return make(
    unit,
    `${nj(d, "은", "는")} ${n(a)}와 ${n(b)}를 모두 나누어떨어지게 합니까? (예, 아니요)`,
    yes ? "예" : "아니요",
    yes
      ? `${nj(d, "은", "는")} 두 수의 공약수입니다.`
      : `${nj(d, "은", "는")} 두 수를 모두 나누지 못합니다.`,
  );
}

/** 문형 09 — 두 몫의 차. */
function gcd124QuotDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, GCD_PAIRS);
  const g = gcd(a, b);
  const diff = Math.abs(a / g - b / g);
  return make(
    unit,
    `두 수 ${n(a)}, ${n(b)}를 최대공약수로 나눈 두 몫의 차는 얼마입니까?`,
    n(diff),
    `몫은 ${n(a / g)}, ${n(b / g)}이므로 차는 ${n(diff)}입니다.`,
  );
}

/** 문형 10 — 최대공약수로 나눈 두 몫의 곱. */
function gcd124Recover(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, GCD_PAIRS);
  const g = gcd(a, b);
  return make(
    unit,
    `두 수 ${n(a)}, ${n(b)}를 각각 최대공약수로 나눈 두 몫을 곱하면 얼마입니까?`,
    n((a / g) * (b / g)),
    `최대공약수는 ${n(g)}, 두 몫은 ${n(a / g)}, ${n(b / g)}이므로 곱은 ${n((a / g) * (b / g))}입니다.`,
  );
}

/* ── 1-2-5 공배수와 최소공배수 — 공배수를 «집합»으로 다룬다(공배수 = 최소공배수의 배수) ── */

/** 연산 — 공배수 중 가장 작은 수 · 최소공배수에서 공배수 셋을 편다. */
function commul125Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const [a, b] = pick(rng, LCM_PAIRS);
    const m = lcm(a, b);
    return make(
      unit,
      `${nj(a, "과", "와")} ${n(b)}의 공배수 중에서 가장 작은 수를 구하시오.`,
      n(m),
      `두 수의 공배수 중 가장 작은 수가 최소공배수입니다. ${nj(a, "과", "와")} ${n(b)}의 최소공배수는 ${n(m)}입니다.`,
    );
  }
  const m = pick(rng, LCM_GIVEN);
  return make(
    unit,
    `어떤 두 수의 최소공배수가 ${n(m)}입니다. 두 수의 공배수를 가장 작은 수부터 ${n(3)}개 쓰시오.`,
    nums([m, 2 * m, 3 * m]),
    `공배수는 최소공배수의 배수입니다. ${n(m)}의 배수를 작은 수부터 쓰면 ${nums([m, 2 * m, 3 * m])}입니다.`,
  );
}

/** 기본 — 공배수 판별 · 최소공배수에서 k번째 공배수. */
function commul125Read(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const [a, b] = pick(rng, LCM_PAIRS);
    const m = lcm(a, b);
    const good = m * intBetween(rng, 1, 3);
    // 한쪽만의 배수 — 그럴듯한 미끼. 공배수가 되어 버린 값은 거른다.
    const decoys: number[] = [];
    for (const k of [1, 2, 3, 4, 5]) {
      if ((a * k) % m !== 0 && a * k !== good) decoys.push(a * k);
      if ((b * k) % m !== 0 && b * k !== good) decoys.push(b * k);
    }
    const shown = shuffled(rng, [good, ...pickSome(rng, decoys, 3)]);
    return make(
      unit,
      `다음 수 중에서 ${nj(a, "과", "와")} ${n(b)}의 공배수를 찾아 쓰시오.  ${nums(shown)}`,
      n(good),
      `두 수의 최소공배수는 ${n(m)}이고 공배수는 ${n(m)}의 배수입니다. ${nj(good, "은", "는")} ${n(m)}의 배수이므로 공배수입니다.`,
    );
  }
  const m = pick(rng, LCM_GIVEN);
  const k = intBetween(rng, 4, 5);
  return make(
    unit,
    `어떤 두 수의 최소공배수가 ${n(m)}일 때, 두 수의 공배수 중에서 ${n(k)}번째로 작은 수를 구하시오.`,
    n(k * m),
    `공배수는 최소공배수의 배수이므로 ${n(k)}번째로 작은 수는 ${expr(`${m}\\times${k}=${k * m}`)}입니다.`,
  );
}

/** 응용 — 범위와 결합: 1~L 의 공배수 개수 · K 에 가장 가까운 공배수. */
function commul125Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, LCM_PAIRS);
  const m = lcm(a, b);
  if (intBetween(rng, 0, 1) === 0) {
    // 범위 상한을 100 아래로 묶는다 — 수 규모를 키우는 것은 다양성 축이 아니다(원장님).
    const k = intBetween(rng, 2, Math.max(2, Math.min(4, Math.floor(95 / m))));
    const L = m * k + intBetween(rng, 1, Math.min(m - 1, 100 - m * k));
    return make(
      unit,
      `${n(1)}부터 ${n(L)}까지의 수 중에서 ${nj(a, "과", "와")} ${n(b)}의 공배수는 모두 몇 개입니까?`,
      n(k),
      `두 수의 최소공배수는 ${n(m)}이고 공배수는 ${n(m)}의 배수입니다. ${n(L)}까지에는 ${expr(`${m}\\times${k}=${m * k}`)}까지 들어 있으므로 모두 ${n(k)}개입니다.`,
    );
  }
  const j = intBetween(rng, 2, 3);
  const o = intBetween(rng, 1, Math.floor((m - 1) / 2));
  const K = intBetween(rng, 0, 1) === 0 ? j * m + o : j * m - o;
  return make(
    unit,
    `${nj(a, "과", "와")} ${n(b)}의 공배수 중에서 ${n(K)}에 가장 가까운 수를 구하시오.`,
    n(j * m),
    `두 수의 공배수는 최소공배수 ${n(m)}의 배수인 ${nums([m, 2 * m, 3 * m])}, … 입니다. ${nj(K, "과", "와")}의 차가 가장 작은 수는 ${n(j * m)}입니다.`,
  );
}

/** 심화 — 집합에서 최소공배수를 «되찾고», 수를 셋으로 늘려 조합한다. */
function commul125Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  // ⚠️ 예전 두 갈래가 다 3단이었다.
  //    ㉠ 「공배수 중 세 번째로 작은 수 → 최소공배수」 = $3m\div3$ **한 걸음**.
  //    ㉡ 「세 수의 최소공배수」 — 응용에 수를 하나 더한 것.
  //    이 소단원의 응용은 이미 「$1$~$N$ 중 두 수의 공배수는 몇 개」이므로, 심화는
  //    최소공배수를 **되짚은 뒤** 세거나(㉠), 나머지 조건을 겹친다(㉡).
  if (intBetween(rng, 0, 1) === 0) {
    const m = pick(rng, LCM_GIVEN);
    const k = intBetween(rng, 2, 4);
    const cnt = intBetween(rng, 3, 7);
    const limit = m * cnt + intBetween(rng, 1, m - 1);
    return makeDeep(
      unit,
      `어떤 두 수의 공배수 중에서 ${n(k)}번째로 작은 수가 ${n(k * m)}입니다. ` +
        `두 수의 공배수 중에서 ${n(limit)}보다 작은 수는 모두 몇 개입니까?`,
      n(cnt),
      [
        `공배수는 최소공배수의 배수이므로 ${n(k)}번째로 작은 수는 최소공배수의 ${n(k)}배입니다. ` +
          `최소공배수는 ${expr(`${k * m}\\div${k}=${m}`)} 입니다.`,
        `${expr(`${m}\\times${cnt}=${m * cnt}`)} 까지가 ${n(limit)}보다 작고 ` +
          `${expr(`${m}\\times${cnt + 1}=${m * (cnt + 1)}`)} 부터는 크므로 모두 ${n(cnt)}개입니다.`,
      ],
    );
  }
  // ⚠️ 「나머지가 같은 수」는 **1-2-6 이 이미 쓴다** — 여기 넣으면 두 소단원이 같은 것을
  //    묻는다(R5). 그래서 같은 되짚기로 열되 **합**을 묻는다(A는 개수).
  const m = pick(rng, LCM_GIVEN);
  const k = intBetween(rng, 2, 4);
  const cnt = intBetween(rng, 3, 5);
  const limit = m * cnt + intBetween(rng, 1, m - 1);
  const vals = Array.from({ length: cnt }, (_, i) => m * (i + 1));
  const sum = vals.reduce((s, v) => s + v, 0);
  return makeDeep(
    unit,
    `어떤 두 수의 공배수 중에서 ${n(k)}번째로 작은 수가 ${n(k * m)}입니다. ` +
      `두 수의 공배수 중에서 ${n(limit)}보다 작은 수를 모두 더하면 얼마입니까?`,
    n(sum),
    [
      `공배수는 최소공배수의 배수이므로 ${n(k)}번째로 작은 수는 최소공배수의 ${n(k)}배입니다. ` +
        `최소공배수는 ${expr(`${k * m}\\div${k}=${m}`)} 입니다.`,
      `${n(limit)}보다 작은 공배수는 ${nums(vals)}이므로 ` +
        `${expr(`${vals.join("+")}=${sum}`)} 입니다.`,
    ],
  );
}

/** 문형 05 — 세 번째로 작은 공배수. */
function commul125Third(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, LCM_PAIRS);
  const m = lcm(a, b);
  return make(
    unit,
    `${nj(a, "과", "와")} ${n(b)}의 공배수 중에서 세 번째로 작은 수를 구하시오.`,
    n(3 * m),
    `최소공배수는 ${n(m)}이므로 세 번째로 작은 공배수는 ${expr(`${m}\\times3=${3 * m}`)}입니다.`,
  );
}

/** 문형 06 — 첫 세 공배수의 합. */
function commul125FirstThreeSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, LCM_PAIRS);
  const m = lcm(a, b);
  return make(
    unit,
    `${nj(a, "과", "와")} ${n(b)}의 공배수를 작은 수부터 세 개 더하면 얼마입니까?`,
    n(6 * m),
    `작은 수부터 ${nums([m, 2 * m, 3 * m])}이므로 합은 ${expr(`${m}+${2 * m}+${3 * m}=${6 * m}`)}입니다.`,
  );
}

/** 문형 07 — 짝수인 공배수 중 가장 작은 수. */
function commul125SmallestEven(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, LCM_PAIRS);
  const m = lcm(a, b);
  const ans = m % 2 === 0 ? m : 2 * m;
  return make(
    unit,
    m % 2 === 0
      ? `${nj(a, "과", "와")} ${n(b)}의 공배수 중 가장 작은 수를 구하시오.`
      : `${nj(a, "과", "와")} ${n(b)}의 짝수인 공배수 중 가장 작은 수를 구하시오.`,
    n(ans),
    `최소공배수는 ${n(m)}입니다. 짝수인 공배수 중 가장 작은 수는 ${n(ans)}입니다.`,
  );
}

/** 문형 08 — L보다 큰 가장 작은 공배수. */
function commul125NextAbove(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, LCM_PAIRS);
  const m = lcm(a, b);
  const k = intBetween(rng, 2, 4);
  const L = k * m + intBetween(rng, 1, Math.max(1, m - 1));
  return make(
    unit,
    `${nj(a, "과", "와")} ${n(b)}의 공배수 중에서 ${n(L)}보다 큰 수 중 가장 작은 수를 구하시오.`,
    n((k + 1) * m),
    `공배수는 ${n(m)}의 배수입니다. ${n(L)}보다 큰 가장 작은 공배수는 ${n((k + 1) * m)}입니다.`,
  );
}

/** 문형 09 — 어떤 수가 공배수인지 판정. */
function commul125IsCommon(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantYes = altCase(rng);
  const [a, b] = pick(rng, LCM_PAIRS);
  const m = lcm(a, b);
  let x = wantYes ? m * intBetween(rng, 1, 3) : m * intBetween(rng, 1, 3) + 1;
  if (!wantYes) {
    while (x % a === 0 && x % b === 0) x += 1;
  }
  const yes = x % a === 0 && x % b === 0;
  return make(
    unit,
    `${nj(x, "은", "는")} ${n(a)}와 ${n(b)}의 공배수입니까? (예, 아니요)`,
    yes ? "예" : "아니요",
    yes
      ? `${nj(x, "은", "는")} 두 수의 공배수입니다.`
      : `${nj(x, "은", "는")} 두 수의 공배수가 아닙니다.`,
  );
}

/** 문형 10 — 최소공배수의 몇 배인지. */
function commul125HowManyTimes(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, LCM_PAIRS);
  const m = lcm(a, b);
  const k = intBetween(rng, 2, 5);
  return make(
    unit,
    `${nj(a, "과", "와")} ${n(b)}의 공배수 ${n(k * m)}은 최소공배수의 몇 배입니까?`,
    n(k),
    `최소공배수는 ${n(m)}이므로 ${expr(`${k * m}\\div${m}=${k}`)}배입니다.`,
  );
}

/* ── 1-2-6 최소공배수 구하는 방법 — 시간표·바둑판 활용은 이 소단원만 쓴다 ── */

/** 연산 — 최소공배수 값 · 나눗셈법의 구조(공약수로 나눈 몫이 서로 나눠지지 않을 때). */
function lcm126Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const [a, b] = pick(rng, LCM_PAIRS);
    const g = gcd(a, b);
    const m = lcm(a, b);
    return make(
      unit,
      `두 수 ${n(a)}, ${n(b)}의 최소공배수를 구하시오.`,
      n(m),
      `두 수를 공약수 ${nro(g)} 나누면 몫이 ${n(a / g)}, ${n(b / g)}입니다. 최소공배수는 ${expr(`${g}\\times${a / g}\\times${b / g}=${m}`)}입니다.`,
    );
  }
  const g = intBetween(rng, 2, 4);
  const [p, q] = pick(rng, [
    [2, 3],
    [3, 4],
    [2, 5],
    [3, 5],
    [4, 5],
    [2, 7],
  ] as const);
  const m = g * p * q;
  return make(
    unit,
    `어떤 두 수를 공약수 ${nro(g)} 나누었더니 몫이 ${nj(p, "과", "와")} ${nj(q, "이", "가")} 되었습니다. 두 몫의 공약수는 ${n(1)}뿐입니다. 처음 두 수의 최소공배수를 구하시오.`,
    n(m),
    `최소공배수는 나눈 공약수와 두 몫의 곱입니다. ${expr(`${g}\\times${p}\\times${q}=${m}`)}입니다.`,
  );
}

/** 기본 — 활용 문장 한 겹: 함께 가는 날 · 가장 작은 정사각형의 한 변. 답이 곧 최소공배수다. */
function lcm126Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, LCM_PAIRS);
  const m = lcm(a, b);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `형은 ${n(a)}일마다, 동생은 ${n(b)}일마다 수영장에 갑니다. 오늘 두 사람이 함께 갔다면, 바로 다음에 함께 가는 날은 며칠 후입니까?`,
      n(m),
      `함께 가는 날은 ${nj(a, "과", "와")} ${n(b)}의 공배수입니다. 바로 다음은 최소공배수인 ${n(m)}일 후입니다.`,
    );
  }
  return make(
    unit,
    `가로가 ${n(a)} cm, 세로가 ${n(b)} cm인 직사각형 모양 카드를 겹치지 않게 빈틈없이 늘어놓아 가장 작은 정사각형을 만들려고 합니다. 정사각형의 한 변은 몇 cm입니까?`,
    n(m),
    `정사각형의 한 변은 ${nj(a, "과", "와")} ${n(b)}의 공배수여야 합니다. 가장 작은 정사각형의 한 변은 최소공배수인 ${n(m)} cm입니다.`,
  );
}

/** 응용 — 두 단계: 최소공배수를 구한 «다음» 횟수·장수를 묻는다. */
function lcm126Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, LCM_PAIRS);
  const m = lcm(a, b);
  if (intBetween(rng, 0, 1) === 0) {
    // 시간 상한을 100초 아래로 묶는다(수 규모 원칙). T 가 공배수에 딱 앉지 않아 경계가 없다.
    const k = intBetween(rng, 2, Math.max(2, Math.min(4, Math.floor(95 / m))));
    const T = m * k + intBetween(rng, 1, Math.min(m - 1, 100 - m * k));
    return make(
      unit,
      `빨간 전등은 ${n(a)}초마다, 파란 전등은 ${n(b)}초마다 깜빡입니다. 두 전등이 동시에 깜빡인 뒤 ${n(T)}초 동안 다시 동시에 깜빡이는 것은 모두 몇 번입니까?`,
      n(k),
      `동시에 깜빡이는 것은 최소공배수인 ${n(m)}초마다입니다. ${n(T)}초 동안에는 ${expr(`${m}\\times${k}=${m * k}`)}초까지 ${n(k)}번 있습니다.`,
    );
  }
  return make(
    unit,
    `가로가 ${n(a)} cm, 세로가 ${n(b)} cm인 직사각형 모양 색 카드를 겹치지 않게 빈틈없이 늘어놓아 가장 작은 정사각형을 만들었습니다. 사용한 색 카드는 모두 몇 장입니까?`,
    n((m / a) * (m / b)),
    `가장 작은 정사각형의 한 변은 최소공배수인 ${n(m)} cm입니다. 가로로 ${expr(`${m}\\div${a}=${m / a}`)}장, 세로로 ${expr(`${m}\\div${b}=${m / b}`)}장이므로 모두 ${expr(`${m / a}\\times${m / b}=${(m / a) * (m / b)}`)}장입니다.`,
  );
}

/**
 * 심화 — 나머지·역산. **나누는 수 > 나머지**(`r < min(a,b)`)를 뽑는 범위로 보장한다.
 * ㉯의 «다른 수» 후보는 M 의 약수 중 최소공배수를 되만드는 수만이다 — 목록을 실제로
 * 세어 최솟값을 낸다(공식으로 흉내 내면 (a,M) 짝이 바뀔 때 조용히 틀린다).
 */
function lcm126Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const [a, b] = pick(rng, LCM_PAIRS);
    const m = lcm(a, b);
    const r = intBetween(rng, 1, Math.min(a, b) - 1);
    return make(
      unit,
      `어떤 수를 ${nro(a)} 나누어도 ${nro(b)} 나누어도 나머지가 ${n(r)}입니다. 어떤 수 중에서 가장 작은 수를 구하시오. 단, 어떤 수는 나누는 두 수보다 큽니다.`,
      n(m + r),
      `나머지 ${nj(r, "을", "를")} 빼면 ${nj(a, "과", "와")} ${nro(b)} 모두 나누어떨어지므로 두 수의 공배수입니다. 가장 작은 공배수는 최소공배수 ${n(m)}이므로 어떤 수는 ${expr(`${m}+${r}=${m + r}`)}입니다.`,
    );
  }
  const [a, M] = pick(rng, [
    [6, 24],
    [8, 24],
    [10, 20],
    [12, 36],
    [9, 18],
    [6, 30],
  ] as const);
  const cands = divisors(M).filter((d) => lcm(a, d) === M);
  const ans = cands[0]!;
  return make(
    unit,
    `두 수의 최소공배수가 ${n(M)}입니다. 한 수가 ${n(a)}일 때, 다른 수가 될 수 있는 수 중에서 가장 작은 수를 구하시오.`,
    n(ans),
    `다른 수는 ${n(M)}의 약수 중에서 ${nj(a, "과", "와")}의 최소공배수가 ${nj(M, "이", "가")} 되는 수입니다. 될 수 있는 수는 ${nums(cands)}이고, 가장 작은 수는 ${n(ans)}입니다.`,
  );
}

/** 문형 05 — 최소공배수를 한 수로 나눈 값. */
function lcm126DivOne(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, LCM_PAIRS);
  const m = lcm(a, b);
  return make(
    unit,
    `두 수 ${n(a)}, ${n(b)}의 최소공배수를 ${nro(a)} 나누면 얼마입니까?`,
    n(m / a),
    `최소공배수는 ${n(m)}이므로 ${expr(`${m}\\div${a}=${m / a}`)}입니다.`,
  );
}

/** 문형 06 — 나눗셈법의 곱. */
function lcm126MethodProduct(unit: UnitSeed, rng: Rng): ElemProblem {
  const g = intBetween(rng, 2, 4);
  const [p, q] = pick(rng, [
    [2, 3],
    [3, 4],
    [2, 5],
    [3, 5],
    [4, 5],
    [2, 7],
  ] as const);
  return make(
    unit,
    `어떤 두 수를 공약수 ${nro(g)} 나누었더니 몫이 ${nj(p, "과", "와")} ${nj(q, "이", "가")} 되었고 두 몫의 공약수는 ${n(1)}뿐입니다. 공약수와 두 몫을 모두 곱하면 얼마입니까?`,
    n(g * p * q),
    `${expr(`${g}\\times${p}\\times${q}=${g * p * q}`)}입니다. 이 값이 최소공배수입니다.`,
  );
}

/** 문형 07 — 세 수의 최소공배수. */
function lcm126Three(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, [4, 6, 8]);
  const b = pick(
    rng,
    [6, 9, 10].filter((v) => v !== a),
  );
  const c = pick(
    rng,
    [8, 10, 12].filter((v) => v !== a && v !== b),
  );
  const m = lcm(lcm(a, b), c);
  return make(
    unit,
    `세 수 ${n(a)}, ${n(b)}, ${n(c)}의 최소공배수를 구하시오.`,
    n(m),
    `${nj(a, "과", "와")} ${n(b)}의 최소공배수는 ${n(lcm(a, b))}이고, 이와 ${n(c)}의 최소공배수는 ${n(m)}입니다.`,
  );
}

/** 문형 08 — 정사각형을 만들 때 가로로 놓는 카드 수. */
function lcm126Across(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, LCM_PAIRS);
  const m = lcm(a, b);
  return make(
    unit,
    `가로가 ${n(a)} cm, 세로가 ${n(b)} cm인 직사각형 카드를 겹치지 않게 늘어놓아 가장 작은 정사각형을 만들었습니다. 가로 방향으로 놓은 카드는 몇 장입니까?`,
    n(m / a),
    `정사각형의 한 변은 최소공배수 ${n(m)} cm이므로 가로로는 ${expr(`${m}\\div${a}=${m / a}`)}장입니다.`,
  );
}

/** 문형 09 — 최소공배수가 두 수의 곱과 같은지 판정. */
function lcm126EqualsProduct(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantYes = altCase6(rng);
  const [a, b] = wantYes ? pick(rng, COPRIME_PAIRS) : pick(rng, LCM_PAIRS);
  const m = lcm(a, b);
  const prod = a * b;
  return make(
    unit,
    `두 수 ${n(a)}, ${n(b)}의 최소공배수는 두 수의 곱 ${n(prod)}과 같습니까? (예, 아니요)`,
    m === prod ? "예" : "아니요",
    `최소공배수는 ${n(m)}이고 두 수의 곱은 ${n(prod)}입니다. 따라서 ${m === prod ? "같습니다" : "다릅니다"}.`,
  );
}

/** 문형 10 — 동시에 만나는 간격. */
function lcm126Interval(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, LCM_PAIRS);
  const m = lcm(a, b);
  return make(
    unit,
    `버스는 ${n(a)}분마다, 지하철은 ${n(b)}분마다 출발합니다. 두 편이 동시에 출발한 뒤 다시 동시에 출발하는 간격은 몇 분입니까?`,
    n(m),
    `동시에 출발하는 간격은 최소공배수인 ${n(m)}분입니다.`,
  );
}

/* ────────── 1-3 대응 관계 — 난이도 4단 (D-72 확대 4차) ──────────
 *
 * 기호 규약(2026-08-23 리드 확정): 독립량 □ · 종속량 △ — 5-1 교과는 x·y 를 안 쓴다.
 * 답이 식인 갈래의 정본 꼴은 «△=□×k · △=□+c · △=□−c» 하나뿐이다 — 종속량 왼쪽 ·
 * □ 먼저 · 상수 뒤. 시험이 표의 (□,△) 전 행 대입으로 재검산한다.
 *
 * 이웃 축(D-66⑸): 1-3-1 은 「식으로 나타내」 금지(값·규칙 읽기만) · 1-3-2 는 추상 표만
 * (생활 소재 낱말 금지) · 1-3-3 은 생활 장면만(표 없음). 표는 1-3-1·1-3-2 에만 붙는다.
 *
 * 수 규모는 축이 아니다(원장님 원칙): 독립량 □≤30 · 배 k∈[2,8] · 상수 c∈[2,15]
 * (자르기 관계만 +1 — 도막=횟수+1 이 그 관계의 사실이다).
 * 어려움은 유형에서 온다 — 판별·먼 항·역산·양방향 빈칸·off-by-one(자르기 +1).
 */

/** 대응식 정본 꼴 — 종속량 왼쪽 · □ 먼저 · 상수 뒤. 다른 꼴을 내면 시험이 빨갛다. */
const relMulLatex = (k: number): string => `\\triangle=\\square\\times${k}`;
const relAddLatex = (c: number): string => `\\triangle=\\square+${c}`;
const relSubLatex = (c: number): string => `\\triangle=\\square-${c}`;

/** 대응표(가로꼴) — 윗줄이 □, 아랫줄이 △. 빈칸("")·㉠·㉡ 은 문자열로 넘긴다. */
function corrTable(
  tops: readonly (number | string)[],
  bottoms: readonly (number | string)[],
): Record<string, unknown> {
  return fig("table", {
    headers: ["□", ...tops.map(String)],
    rows: [["△", ...bottoms.map(String)]],
  });
}

/* ── 1-3-1 두 양 사이의 대응 관계 — 표를 **읽는다**. 「식으로 나타내」는 여기 없다 ── */

/** 연산 — 규칙이 표에서 바로 보이고, 빈칸 하나를 채운다. 빈칸 자리는 씨앗이 정한다. */
function corr131Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const from = intBetween(rng, 1, 9);
  const xs = [from, from + 1, from + 2, from + 3];
  const intro = `표는 □가 ${n(from)}부터 ${n(1)}씩 커질 때의 △를 나타낸 것입니다.`;
  // 첫 칸은 남긴다 — 남은 세 짝으로 규칙이 서야 빈칸이 «읽기»가 된다.
  const bp = intBetween(rng, 1, 3);
  const bx = xs[bp]!;
  if (intBetween(rng, 0, 1) === 0) {
    const k = intBetween(rng, 2, 8);
    const blankVal = bx * k;
    return make(
      unit,
      `${intro} □가 ${n(bx)}일 때의 빈칸에 알맞은 수를 구하시오.`,
      n(blankVal),
      `△는 □의 ${n(k)}배입니다. 빈칸은 □가 ${n(bx)}일 때이므로 ${expr(`${bx}\\times${k}=${blankVal}`)}입니다.`,
      corrTable(
        xs,
        xs.map((x, i) => (i === bp ? "" : x * k)),
      ),
    );
  }
  const c = intBetween(rng, 2, 9);
  const blankVal = bx + c;
  return make(
    unit,
    `${intro} □가 ${n(bx)}일 때의 빈칸에 알맞은 수를 구하시오.`,
    n(blankVal),
    `△는 □보다 ${n(c)}만큼 큽니다. 빈칸은 □가 ${n(bx)}일 때이므로 ${expr(`${bx}+${c}=${blankVal}`)}입니다.`,
    corrTable(
      xs,
      xs.map((x, i) => (i === bp ? "" : x + c)),
    ),
  );
}

/** 기본 — 관계를 **판별**해서 말한다(몇 배인가 · 몇만큼 큰가). */
function corr131Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const from = intBetween(rng, 1, 9);
  const xs = [from, from + 1, from + 2, from + 3];
  const intro = `표는 □가 ${n(from)}부터 ${n(1)}씩 커질 때의 △를 나타낸 것입니다.`;
  if (intBetween(rng, 0, 1) === 0) {
    const k = intBetween(rng, 2, 8);
    return make(
      unit,
      `${intro} △는 □의 몇 배입니까?`,
      n(k),
      `어느 칸에서나 △를 □로 나누면 ${n(k)}입니다. △는 □의 ${n(k)}배입니다.`,
      corrTable(
        xs,
        xs.map((x) => x * k),
      ),
    );
  }
  const c = intBetween(rng, 2, 9);
  return make(
    unit,
    `${intro} △는 □보다 몇만큼 큰 수입니까?`,
    n(c),
    `어느 칸에서나 △에서 □를 빼면 ${n(c)}입니다. △는 □보다 ${n(c)}만큼 큽니다.`,
    corrTable(
      xs,
      xs.map((x) => x + c),
    ),
  );
}

/** 응용 — 규칙을 찾고 표 **밖의** 먼 값에 적용한다(두 단계). */
function corr131Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const from = intBetween(rng, 1, 9);
  const xs = [from, from + 1, from + 2, from + 3];
  const intro = `표는 □가 ${n(from)}부터 ${n(1)}씩 커질 때의 △를 나타낸 것입니다.`;
  if (intBetween(rng, 0, 1) === 0) {
    const k = intBetween(rng, 2, 6);
    const m = intBetween(rng, 13, 25);
    return make(
      unit,
      `${intro} □가 ${n(m)}일 때 △의 값을 구하시오.`,
      n(k * m),
      `△는 □의 ${n(k)}배이므로 ${expr(`${m}\\times${k}=${k * m}`)}입니다.`,
      corrTable(
        xs,
        xs.map((x) => x * k),
      ),
    );
  }
  const c = intBetween(rng, 2, 15);
  const m = intBetween(rng, 13, 30);
  return make(
    unit,
    `${intro} □가 ${n(m)}일 때 △의 값을 구하시오.`,
    n(m + c),
    `△는 □보다 ${n(c)}만큼 크므로 ${expr(`${m}+${c}=${m + c}`)}입니다.`,
    corrTable(
      xs,
      xs.map((x) => x + c),
    ),
  );
}

/** 심화 — **역산**: 표 밖의 △ 값에서 □를 거슬러 구한다. △ 값은 규칙 위에 정확히 놓는다. */
function corr131Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const from = intBetween(rng, 1, 9);
  const xs = [from, from + 1, from + 2, from + 3];
  const intro = `표는 □가 ${n(from)}부터 ${n(1)}씩 커질 때의 △를 나타낸 것입니다.`;
  if (intBetween(rng, 0, 1) === 0) {
    const k = intBetween(rng, 2, 8);
    const m = intBetween(rng, 13, 25);
    const v = k * m;
    return make(
      unit,
      `${intro} △가 ${n(v)}일 때 □의 값을 구하시오.`,
      n(m),
      `△는 □의 ${n(k)}배이므로 □는 △를 ${nro(k)} 나눈 수입니다. ${expr(`${v}\\div${k}=${m}`)}입니다.`,
      corrTable(
        xs,
        xs.map((x) => x * k),
      ),
    );
  }
  const c = intBetween(rng, 2, 15);
  const m = intBetween(rng, 13, 30);
  const v = m + c;
  return make(
    unit,
    `${intro} △가 ${n(v)}일 때 □의 값을 구하시오.`,
    n(m),
    `△는 □보다 ${n(c)}만큼 크므로 □는 △에서 ${nj(c, "을", "를")} 뺀 수입니다. ${expr(`${v}-${c}=${m}`)}입니다.`,
    corrTable(
      xs,
      xs.map((x) => x + c),
    ),
  );
}

function corr131Pair(rng: Rng): {
  from: number;
  xs: number[];
  ys: number[];
  intro: string;
} {
  const from = intBetween(rng, 1, 9);
  const xs = [from, from + 1, from + 2, from + 3];
  const intro = `표는 □가 ${n(from)}부터 ${n(1)}씩 커질 때의 △를 나타낸 것입니다.`;
  if (intBetween(rng, 0, 1) === 0) {
    const k = intBetween(rng, 2, 8);
    return { from, xs, ys: xs.map((x) => x * k), intro };
  }
  const c = intBetween(rng, 2, 9);
  return { from, xs, ys: xs.map((x) => x + c), intro };
}

/** 문형 05 — 표에서 가장 큰 △. */
function corr131MaxTri(unit: UnitSeed, rng: Rng): ElemProblem {
  const { xs, ys, intro } = corr131Pair(rng);
  return make(
    unit,
    `${intro} 표에 있는 △ 중 가장 큰 값을 구하시오.`,
    n(ys[ys.length - 1]!),
    `표의 △는 ${nums(ys)}이므로 가장 큰 값은 ${n(ys[ys.length - 1]!)}입니다.`,
    corrTable(xs, ys),
  );
}

/** 문형 06 — 표의 △를 모두 더한 값. */
function corr131SumTri(unit: UnitSeed, rng: Rng): ElemProblem {
  const { xs, ys, intro } = corr131Pair(rng);
  const sum = ys.reduce((a, b) => a + b, 0);
  return make(
    unit,
    `${intro} 표에 있는 △를 모두 더하면 얼마입니까?`,
    n(sum),
    `△는 ${nums(ys)}이므로 합은 ${n(sum)}입니다.`,
    corrTable(xs, ys),
  );
}

/** 문형 07 — 첫 △와 끝 △의 차. */
function corr131Span(unit: UnitSeed, rng: Rng): ElemProblem {
  const { xs, ys, intro } = corr131Pair(rng);
  const span = ys[ys.length - 1]! - ys[0]!;
  return make(
    unit,
    `${intro} 표에서 가장 큰 △와 가장 작은 △의 차는 얼마입니까?`,
    n(span),
    `가장 큰 △는 ${n(ys[ys.length - 1]!)}, 가장 작은 △는 ${n(ys[0]!)}이므로 차는 ${expr(`${ys[ys.length - 1]}-${ys[0]}=${span}`)}입니다.`,
    corrTable(xs, ys),
  );
}

/** 문형 08 — 표에서 가장 작은 △. */
function corr131MinTri(unit: UnitSeed, rng: Rng): ElemProblem {
  const { xs, ys, intro } = corr131Pair(rng);
  return make(
    unit,
    `${intro} 표에 있는 △ 중 가장 작은 값을 구하시오.`,
    n(ys[0]!),
    `표의 △는 ${nums(ys)}이므로 가장 작은 값은 ${n(ys[0]!)}입니다.`,
    corrTable(xs, ys),
  );
}

/** 문형 09 — 이웃한 두 △의 차(첫째와 둘째). */
function corr131Step(unit: UnitSeed, rng: Rng): ElemProblem {
  const { xs, ys, intro } = corr131Pair(rng);
  const step = ys[1]! - ys[0]!;
  return make(
    unit,
    `${intro} □가 ${n(1)} 커질 때 △는 얼마만큼 커집니까?`,
    n(step),
    `첫째 △는 ${n(ys[0]!)}, 둘째 △는 ${n(ys[1]!)}이므로 ${expr(`${ys[1]}-${ys[0]}=${step}`)}만큼 커집니다.`,
    corrTable(xs, ys),
  );
}

/** 문형 10 — △의 합에서 가장 큰 △를 뺀 값. */
function corr131SumMinusMax(unit: UnitSeed, rng: Rng): ElemProblem {
  const { xs, ys, intro } = corr131Pair(rng);
  const sum = ys.reduce((a, b) => a + b, 0);
  const rest = sum - ys[ys.length - 1]!;
  return make(
    unit,
    `${intro} 표에 있는 △를 모두 더한 뒤 가장 큰 △를 빼면 얼마입니까?`,
    n(rest),
    `합은 ${n(sum)}이고 가장 큰 △는 ${n(ys[ys.length - 1]!)}이므로 ${expr(`${sum}-${ys[ys.length - 1]}=${rest}`)}입니다.`,
    corrTable(xs, ys),
  );
}

/* ── 1-3-2 대응 관계를 식으로 나타내기 — 추상 표 → **정본 꼴 식**. 생활 소재는 여기 없다 ── */

/** 연산 — 곱 관계 표를 읽고 식으로(절차 한 번). */
function corr132Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const from = intBetween(rng, 1, 9);
  const xs = [from, from + 1, from + 2, from + 3];
  const k = intBetween(rng, 2, 8);
  return make(
    unit,
    `표는 □가 ${n(from)}부터 ${n(1)}씩 커질 때의 △를 나타낸 것입니다. □가 ${n(from)}일 때 △는 ${n(from * k)}입니다. □와 △ 사이의 대응 관계를 식으로 나타내시오.`,
    expr(relMulLatex(k)),
    `△는 언제나 □의 ${n(k)}배이므로 ${expr(relMulLatex(k))}입니다.`,
    corrTable(
      xs,
      xs.map((x) => x * k),
    ),
  );
}

/** 기본 — 더한 관계인지 뺀 관계인지 **판별**한 뒤 식으로(한 겹). */
function corr132Read(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const from = intBetween(rng, 1, 9);
    const xs = [from, from + 1, from + 2, from + 3];
    const c = intBetween(rng, 2, 15);
    return make(
      unit,
      `표는 □가 ${n(from)}부터 ${n(1)}씩 커질 때의 △를 나타낸 것입니다. □와 △ 사이의 대응 관계를 식으로 나타내시오.`,
      expr(relAddLatex(c)),
      `△는 언제나 □보다 ${n(c)}만큼 크므로 ${expr(relAddLatex(c))}입니다.`,
      corrTable(
        xs,
        xs.map((x) => x + c),
      ),
    );
  }
  // 차 관계 — □가 상수보다 커야 △가 자연수다. 뽑는 범위로 보장한다(10 > 최대 c 9).
  // 시작 수 10~15 는 합 갈래(1~9)와 겹치지 않는다 — 두 갈래 발문이 같은 글이 되면
  // 변형 수가 겉보기보다 준다.
  const from = intBetween(rng, 10, 15);
  const c = intBetween(rng, 2, 9);
  const xs = [from, from + 1, from + 2, from + 3];
  return make(
    unit,
    `표는 □가 ${n(from)}부터 ${n(1)}씩 커질 때의 △를 나타낸 것입니다. □와 △ 사이의 대응 관계를 식으로 나타내시오.`,
    expr(relSubLatex(c)),
    `△는 언제나 □보다 ${n(c)}만큼 작으므로 ${expr(relSubLatex(c))}입니다.`,
    corrTable(
      xs,
      xs.map((x) => x - c),
    ),
  );
}

/**
 * 응용·심화의 □ 열 — «1씩 커진다» 발판을 없앤다. 간격 하나는 반드시 2 이상이어야
 * 뛰엄뛰엄이 **보장**된다 — pickSome 은 연속 4개(2,3,4,5)도 뽑는다.
 */
function corrSparseXs(rng: Rng): number[] {
  const gaps = pick(rng, [
    [1, 1, 2],
    [1, 2, 1],
    [2, 1, 1],
    [1, 2, 2],
    [2, 1, 2],
    [2, 2, 1],
    [2, 2, 2],
  ] as const);
  const span = gaps[0] + gaps[1] + gaps[2];
  const base = intBetween(rng, 2, 9 - span);
  return [base, base + gaps[0], base + gaps[0] + gaps[1], base + span];
}

/** 응용 — □가 뛰엄뛰엄이라(구성 보장) 이웃 차 발판이 없다. 칸마다 관계 가설을 맞대야 한다(두 단계). */
function corr132Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const xs = corrSparseXs(rng);
  if (intBetween(rng, 0, 1) === 0) {
    const k = intBetween(rng, 2, 8);
    return make(
      unit,
      `표는 두 양 □와 △ 사이의 대응 관계를 나타낸 것입니다. □가 ${n(xs[0]!)}일 때 △는 ${n(xs[0]! * k)}입니다. 대응 관계를 식으로 나타내시오.`,
      expr(relMulLatex(k)),
      `어느 칸에서나 △를 □로 나누면 ${n(k)}입니다. △는 언제나 □의 ${n(k)}배이므로 ${expr(relMulLatex(k))}입니다.`,
      corrTable(
        xs,
        xs.map((x) => x * k),
      ),
    );
  }
  const c = intBetween(rng, 2, 15);
  return make(
    unit,
    `표는 두 양 □와 △ 사이의 대응 관계를 나타낸 것입니다. □가 ${n(xs[0]!)}일 때 △는 ${n(xs[0]! + c)}입니다. 대응 관계를 식으로 나타내시오.`,
    expr(relAddLatex(c)),
    `어느 칸에서나 △에서 □를 빼면 ${n(c)}입니다. △는 언제나 □보다 ${n(c)}만큼 크므로 ${expr(relAddLatex(c))}입니다.`,
    corrTable(
      xs,
      xs.map((x) => x + c),
    ),
  );
}

/**
 * 심화 — 빈칸이 **양방향**이다. ㉠은 △ 자리(정방향), ㉡은 □ 자리(역방향) — 답은 둘의 합.
 * ㉡ 자리는 이웃 □ 사이가 3 이상 벌어진 곳만 고른다 — 사이가 2뿐이면 «그 사이의 수»가
 * 하나뿐이라 역산 없이 답이 나온다. 마지막 자리는 위가 열려 있어 늘 된다.
 */
function corr132Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const xs = corrSparseXs(rng);
  const p2cands = [1, 2, 3].filter(
    (i) => i === 3 || xs[i + 1]! - xs[i - 1]! >= 3,
  );
  const p2 = pick(rng, p2cands);
  const p1 = pick(
    rng,
    [1, 2, 3].filter((i) => i !== p2),
  );
  const mul = intBetween(rng, 0, 1) === 0;
  const k = intBetween(rng, 2, 8);
  const c = intBetween(rng, 2, 15);
  const f = (x: number): number => (mul ? x * k : x + c);
  const tick1 = f(xs[p1]!);
  const tick2 = xs[p2]!;
  const rel = mul ? relMulLatex(k) : relAddLatex(c);
  return make(
    unit,
    `표는 두 양 □와 △ 사이의 대응 관계를 나타낸 것입니다. □가 ${n(xs[0]!)}일 때 △는 ${n(f(xs[0]!))}입니다. 대응 관계를 식으로 나타내고, ㉠과 ㉡에 알맞은 수의 합을 구하시오.`,
    n(tick1 + tick2),
    `${mul ? `△는 언제나 □의 ${n(k)}배` : `△는 언제나 □보다 ${n(c)}만큼 큰 수`}이므로 ${expr(rel)}입니다. ㉠은 □가 ${n(xs[p1]!)}인 칸이므로 ${n(tick1)}이고, ㉡은 △가 ${n(f(xs[p2]!))}인 칸이므로 ${mul ? expr(`${f(xs[p2]!)}\\div${k}=${tick2}`) : expr(`${f(xs[p2]!)}-${c}=${tick2}`)}입니다. 합은 ${expr(`${tick1}+${tick2}=${tick1 + tick2}`)}입니다.`,
    corrTable(
      xs.map((x, i) => (i === p2 ? "㉡" : String(x))),
      xs.map((x, i) => (i === p1 ? "㉠" : String(f(x)))),
    ),
  );
}

/** 문형 05 — 주어진 식에서 곱해지는 수. */
function corr132Factor(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 8);
  const x = intBetween(rng, 3, 12);
  return make(
    unit,
    `□와 △ 사이의 대응 관계가 ${expr(relMulLatex(k))}일 때, □가 ${n(x)}이면 △는 얼마입니까?`,
    n(k * x),
    `${expr(`\\triangle=${x}\\times${k}=${k * x}`)}입니다.`,
  );
}

/** 문형 06 — 덧셈 관계 식에서 △. */
function corr132AddValue(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = intBetween(rng, 2, 15);
  const x = intBetween(rng, 3, 20);
  return make(
    unit,
    `□와 △ 사이의 대응 관계가 ${expr(relAddLatex(c))}일 때, □가 ${n(x)}이면 △는 얼마입니까?`,
    n(x + c),
    `${expr(`\\triangle=${x}+${c}=${x + c}`)}입니다.`,
  );
}

/** 문형 07 — 식에서 □를 거슬러 구한다. */
function corr132SolveBox(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 8);
  const x = intBetween(rng, 3, 12);
  return make(
    unit,
    `□와 △ 사이의 대응 관계가 ${expr(relMulLatex(k))}일 때, △가 ${n(k * x)}이면 □는 얼마입니까?`,
    n(x),
    `${expr(`${k * x}\\div${k}=${x}`)}이므로 □는 ${n(x)}입니다.`,
  );
}

/** 문형 08 — 주어진 식이 표를 맞는지 판정. */
function corr132Judge(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantYes = altCase(rng);
  const from = intBetween(rng, 1, 9);
  const xs = [from, from + 1, from + 2, from + 3];
  const k = intBetween(rng, 2, 8);
  const shown = wantYes ? k : k === 2 ? 3 : k - 1;
  return make(
    unit,
    `표는 □가 ${n(from)}부터 ${n(1)}씩 커질 때의 △를 나타낸 것입니다. 대응 관계를 식으로 나타내면 ${expr(relMulLatex(shown))}입니까? (예, 아니요)`,
    shown === k ? "예" : "아니요",
    `△는 □의 ${n(k)}배이므로 ${expr(relMulLatex(k))}입니다. 따라서 ${shown === k ? "맞습니다" : "틀렸습니다"}.`,
    corrTable(
      xs,
      xs.map((x) => x * k),
    ),
  );
}

/** 문형 09 — 두 식 중 표를 나타내는 것. */
function corr132PickRel(unit: UnitSeed, rng: Rng): ElemProblem {
  const from = intBetween(rng, 1, 9);
  const xs = [from, from + 1, from + 2, from + 3];
  const k = intBetween(rng, 2, 8);
  const c = intBetween(rng, 2, 9);
  const firstIsMul = intBetween(rng, 0, 1) === 0;
  const [p1, p2] = firstIsMul
    ? [relMulLatex(k), relAddLatex(c)]
    : [relAddLatex(c), relMulLatex(k)];
  const ans = firstIsMul ? "㉠" : "㉡";
  return make(
    unit,
    `표는 □가 ${n(from)}부터 ${n(1)}씩 커질 때의 △를 나타낸 것입니다. 이 표를 나타내는 식을 찾아 기호를 쓰시오.  ㉠\u00a0${expr(p1)}\u3000\u3000㉡\u00a0${expr(p2)}`,
    ans,
    `△는 언제나 □의 ${n(k)}배이므로 ${expr(relMulLatex(k))}입니다. 답은 ${ans}입니다.`,
    corrTable(
      xs,
      xs.map((x) => x * k),
    ),
  );
}

/** 문형 10 — 뺄셈 관계에서 △. */
function corr132SubValue(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = intBetween(rng, 2, 9);
  const x = intBetween(rng, c + 3, 25);
  return make(
    unit,
    `□와 △ 사이의 대응 관계가 ${expr(relSubLatex(c))}일 때, □가 ${n(x)}이면 △는 얼마입니까?`,
    n(x - c),
    `${expr(`\\triangle=${x}-${c}=${x - c}`)}입니다.`,
  );
}

/* ── 1-3-3 생활 속에서 찾아 식으로 — **장면**이 관계를 준다. 표는 여기 없다 ── */

/** 배 관계가 **사실인** 것들 — [것, 세는 말, 딸린 것, 세는 말, 한 개당 수]. */
const CORR_FIXED = [
  ["자동차", "대", "바퀴", "개", 4],
  ["세발자전거", "대", "바퀴", "개", 3],
  ["오리", "마리", "다리", "개", 2],
  ["거미", "마리", "다리", "개", 8],
  ["곤충", "마리", "다리", "개", 6],
] as const;

/** 담는 것들 — 한 개당 수는 씨앗이 정한다(3~8). [것, 세는 말, 담는 것, 세는 말, 동사]. */
const CORR_PACKS = [
  ["봉지", "개", "사탕", "개", "담았습니다"],
  ["접시", "개", "귤", "개", "담았습니다"],
  ["화분", "개", "꽃", "송이", "심었습니다"],
  ["상자", "개", "지우개", "개", "담았습니다"],
] as const;

/** 자를 것들 — 곧은 것 하나를 자르면 도막은 «횟수+1»이다. */
const CORR_CUT_THINGS = [
  "통나무",
  "리본",
  "철사",
  "빨랫줄",
  "색 테이프",
  "나무 막대",
] as const;

const CORR_ELDERS = ["형", "언니", "누나"] as const;

/** 배 관계 생활 장면 한 줄 + □·△ 지정(«할 때»로 끝난다). 세는 말(tc·pc)도 해설이 쓴다. */
function corrLifeMul(rng: Rng): {
  setup: string;
  thing: string;
  tc: string;
  part: string;
  pc: string;
  per: number;
} {
  if (intBetween(rng, 0, 1) === 0) {
    const [thing, tc, part, pc, per] = pick(rng, CORR_FIXED);
    return {
      setup: `${thing} ${n(1)}${tc}에 ${wj(part, "이", "가")} ${n(per)}${pc}씩 있습니다. ${thing}의 수를 □, ${part}의 수를 △라고 할 때`,
      thing,
      tc,
      part,
      pc,
      per,
    };
  }
  const [thing, tc, part, pc, verb] = pick(rng, CORR_PACKS);
  const per = intBetween(rng, 3, 8);
  return {
    setup: `${thing} ${n(1)}${tc}에 ${wj(part, "을", "를")} ${n(per)}${pc}씩 ${verb}. ${thing}의 수를 □, ${part}의 수를 △라고 할 때`,
    thing,
    tc,
    part,
    pc,
    per,
  };
}

/** 자르기 장면 한 줄 + □·△ 지정(«할 때»로 끝난다). 도막 = 자른 횟수 + 1. */
function corrLifeCut(rng: Rng): { setup: string; thing: string } {
  const thing = pick(rng, CORR_CUT_THINGS);
  return {
    setup: `${wj(thing, "을", "를")} 한 번 자르면 ${n(2)}도막이 됩니다. 자른 횟수를 □, 도막의 수를 △라고 할 때`,
    thing,
  };
}

/** 연산 — 배 관계 장면을 그대로 식으로(절차 한 번). */
function corr133Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { setup, thing, tc, part, pc, per } = corrLifeMul(rng);
  return make(
    unit,
    `${setup}, 두 양 사이의 대응 관계를 식으로 나타내시오.`,
    expr(relMulLatex(per)),
    `${wj(thing, "이", "가")} ${n(1)}${tc} 늘어날 때마다 ${wj(part, "은", "는")} ${n(per)}${pc}씩 늘어나므로 ${expr(relMulLatex(per))}입니다.`,
  );
}

/** 기본 — 배가 아닌 관계를 **판별**한다: 자르기(+1) · 나이 차(±c). */
function corr133Read(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const { setup } = corrLifeCut(rng);
    return make(
      unit,
      `${setup}, 두 양 사이의 대응 관계를 식으로 나타내시오.`,
      expr(relAddLatex(1)),
      `자르기 전에는 ${n(1)}도막이고 한 번 자를 때마다 도막이 ${n(1)}개씩 늘어나므로, 도막의 수는 자른 횟수보다 ${n(1)}만큼 큽니다. ${expr(relAddLatex(1))}입니다.`,
    );
  }
  const elder = pick(rng, CORR_ELDERS);
  const c = intBetween(rng, 2, 6);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `${wj(elder, "은", "는")} 동생보다 ${n(c)}살 많습니다. 동생의 나이를 □, ${elder}의 나이를 △라고 할 때, 두 양 사이의 대응 관계를 식으로 나타내시오.`,
      expr(relAddLatex(c)),
      `${elder}의 나이는 언제나 동생의 나이보다 ${n(c)}만큼 크므로 ${expr(relAddLatex(c))}입니다.`,
    );
  }
  return make(
    unit,
    `동생은 ${elder}보다 ${n(c)}살 적습니다. ${elder}의 나이를 □, 동생의 나이를 △라고 할 때, 두 양 사이의 대응 관계를 식으로 나타내시오.`,
    expr(relSubLatex(c)),
    `동생의 나이는 언제나 ${elder}의 나이보다 ${n(c)}만큼 작으므로 ${expr(relSubLatex(c))}입니다.`,
  );
}

/** 응용 — 관계를 세우고 먼 값에 **적용**한다(두 단계). 자르기 갈래는 +1 이 함정이다. */
function corr133Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const { setup, thing, part, per } = corrLifeMul(rng);
    const m = intBetween(rng, 12, 25);
    return make(
      unit,
      `${setup}, □가 ${n(m)}일 때 △의 값을 구하시오.`,
      n(per * m),
      `${part}의 수는 ${thing} 수의 ${n(per)}배이므로 ${expr(relMulLatex(per))}입니다. ${expr(`${m}\\times${per}=${per * m}`)}입니다.`,
    );
  }
  const { setup } = corrLifeCut(rng);
  const m = intBetween(rng, 12, 30);
  return make(
    unit,
    `${setup}, □가 ${n(m)}일 때 △의 값을 구하시오.`,
    n(m + 1),
    `도막의 수는 자른 횟수보다 ${n(1)}만큼 크므로 ${expr(relAddLatex(1))}입니다. ${expr(`${m}+1=${m + 1}`)}입니다.`,
  );
}

/** 심화 — **역산**: △에서 □를 거슬러 구한다. 자르기 갈래는 off-by-one 을 거꾸로 탄다. */
function corr133Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const { setup, thing, part, per } = corrLifeMul(rng);
    const m = intBetween(rng, 9, 20);
    const v = per * m;
    return make(
      unit,
      `${setup}, △가 ${n(v)}일 때 □의 값을 구하시오.`,
      n(m),
      `${part}의 수는 ${thing} 수의 ${n(per)}배이므로(${expr(relMulLatex(per))}) □는 △를 ${nro(per)} 나눈 수입니다. ${expr(`${v}\\div${per}=${m}`)}입니다.`,
    );
  }
  const { setup } = corrLifeCut(rng);
  const m = intBetween(rng, 12, 30);
  const v = m + 1;
  return make(
    unit,
    `${setup}, △가 ${n(v)}일 때 □의 값을 구하시오.`,
    n(m),
    `도막의 수는 자른 횟수보다 ${n(1)}만큼 크므로(${expr(relAddLatex(1))}) □는 △보다 ${n(1)}만큼 작습니다. ${expr(`${v}-1=${m}`)}입니다.`,
  );
}

/** 문형 05 — 한 개에 딸린 수(배). 장면에 답을 적지 않는다. */
function corr133Per(unit: UnitSeed, rng: Rng): ElemProblem {
  const [thing, tc, part, pc, per] = pick(rng, CORR_FIXED);
  return make(
    unit,
    `${thing} 한 ${tc}의 ${part}는 몇 ${pc}입니까?`,
    n(per),
    `${thing} 한 ${tc}의 ${part}는 ${n(per)}${pc}입니다.`,
  );
}

/** 문형 06 — 여러 개의 딸린 수(식을 쓰지 않고 곱). */
function corr133Many(unit: UnitSeed, rng: Rng): ElemProblem {
  const { thing, tc, part, pc, per } = corrLifeMul(rng);
  const m = intBetween(rng, 3, 9);
  return make(
    unit,
    `${thing} ${n(m)}${tc}에 ${wj(part, "이", "가")} 모두 몇 ${pc}입니까?`,
    n(per * m),
    `${expr(`${per}\\times${m}=${per * m}`)}이므로 ${n(per * m)}${pc}입니다.`,
  );
}

/** 문형 07 — 주어진 식이 맞는지. */
function corr133Judge(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantYes = altCase(rng);
  const { setup, per } = corrLifeMul(rng);
  const shown = wantYes ? per : per === 2 ? 3 : per - 1;
  return make(
    unit,
    `${setup}, 대응 관계를 식으로 나타내면 ${expr(relMulLatex(shown))}입니까? (예, 아니요)`,
    shown === per ? "예" : "아니요",
    `옳은 식은 ${expr(relMulLatex(per))}입니다. 따라서 ${shown === per ? "맞습니다" : "틀렸습니다"}.`,
  );
}

/** 문형 08 — 나이 차. */
function corr133AgeGap(unit: UnitSeed, rng: Rng): ElemProblem {
  const elder = pick(rng, CORR_ELDERS);
  const c = intBetween(rng, 2, 6);
  const young = intBetween(rng, 8, 15);
  return make(
    unit,
    `${wj(elder, "은", "는")} 동생보다 ${n(c)}살 많습니다. 동생이 ${n(young)}살일 때 ${wj(elder, "은", "는")} 몇 살입니까?`,
    n(young + c),
    `${expr(`${young}+${c}=${young + c}`)}이므로 ${n(young + c)}살입니다.`,
  );
}

/** 문형 09 — 도막에서 자른 횟수. */
function corr133Cuts(unit: UnitSeed, rng: Rng): ElemProblem {
  const { thing } = corrLifeCut(rng);
  const pieces = intBetween(rng, 4, 12);
  return make(
    unit,
    `${wj(thing, "을", "를")} 잘라 ${n(pieces)}도막으로 만들었습니다. 자른 횟수는 몇 번입니까?`,
    n(pieces - 1),
    `도막의 수는 자른 횟수보다 ${n(1)}만큼 크므로 자른 횟수는 ${expr(`${pieces}-1=${pieces - 1}`)}번입니다.`,
  );
}

/** 문형 10 — 두 장면의 배 비교. */
function corr133PerDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, CORR_FIXED);
  const b = pick(
    rng,
    CORR_FIXED.filter((x) => x[0] !== a[0]),
  );
  const diff = Math.abs(a[4] - b[4]);
  return make(
    unit,
    `${a[0]} ${n(1)}${a[1]}의 ${a[2]} 수와 ${b[0]} ${n(1)}${b[1]}의 ${b[2]} 수의 차는 얼마입니까?`,
    n(diff),
    `${a[0]}는 ${n(a[4])}, ${b[0]}는 ${n(b[4])}이므로 차는 ${n(diff)}입니다.`,
  );
}

/* ────────── 1-4 약분과 통분 — 난이도 4단 (D-72 확대 5차) ──────────
 *
 * 이웃 축(D-66⑸, 발문 낱말): «크기가 같은»은 1-4-1 만 · «약분»·«기약»은 1-4-2 만 ·
 * «통분»·«공통분모»는 1-4-3 만 · «소수»는 1-4-5 만. 1-4-4 는 분수끼리의 비교만 한다.
 * 옛 표준(reduce)의 발문과도 다르게 짰다(R5 — 표준↔갈래 중복도 결함).
 *
 * 수 규모는 축이 아니다: 답 분수는 전부 진분수(R2 자동 충족)·답 분모 ≤ 24 ·
 * 발문 분모 ≤ 48. 크기 비교는 기약+다른 분모(또는 같은 분모+다른 분자)로 뽑아
 * **동률이 구성상 불가능**하다. 통분은 두 정본 방식(분모의 곱·최소공배수)을 발문이
 * 명시하고, 최소공배수 방식 갈래는 gcd(d1,d2)>1 로 뽑아 두 방식이 실제로 갈린다.
 */

/* 분수·소수 뒤 조사 헬퍼(fr·frj·fro·lj·dj·dro)는 파일 맨 위 «수식 덩어리 뒤 조사» 한 곳에 있다. */

/** 분모와 서로소인 분자 하나(min 이상) — 기약 진분수를 분모 고정으로 뽑는다. */
function coprimeTop(rng: Rng, den: number, min = 1): number {
  const tops: number[] = [];
  for (let t = min; t < den; t += 1) if (gcd(t, den) === 1) tops.push(t);
  return pick(rng, tops);
}

/* ── 1-4-1 크기가 같은 분수 — 분모·분자에 같은 수를 곱하고 나눈다 ── */

/** 연산 — 크기가 같은 두 분수의 빈칸 하나(절차 한 번). */
function eq141Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 6, 7]);
  const g = pick(
    rng,
    [2, 3, 4, 5, 6].filter((x) => sd * x <= 24),
  );
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `크기가 같은 두 분수입니다. □ 안에 알맞은 수를 구하시오.  ${expr(`\\frac{${sn}}{${sd}}=\\frac{\\square}{${sd * g}}`)}`,
      n(sn * g),
      `분모가 ${n(sd)}에서 ${nro(sd * g)} ${n(g)}배가 되었으므로 분자도 ${n(g)}배가 됩니다. ${expr(`${sn}\\times${g}=${sn * g}`)}입니다.`,
    );
  }
  return make(
    unit,
    `크기가 같은 두 분수입니다. □ 안에 알맞은 수를 구하시오.  ${expr(`\\frac{${sn}}{${sd}}=\\frac{${sn * g}}{\\square}`)}`,
    n(sd * g),
    `분자가 ${n(sn)}에서 ${nro(sn * g)} ${n(g)}배가 되었으므로 분모도 ${n(g)}배가 됩니다. ${expr(`${sd}\\times${g}=${sd * g}`)}입니다.`,
  );
}

/** 기본 — 무엇으로 나누었는지·지정 분모의 분자를 **판별**한다(한 겹). */
function eq141Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 6, 7]);
  const g = pick(
    rng,
    [2, 3, 4, 5, 6].filter((x) => sd * x <= 24),
  );
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `${fr(sn * g, sd * g)}의 분모와 분자를 각각 같은 수로 나누어 ${frj(sn, sd, "을", "를")} 만들었습니다. 나눈 수를 구하시오.`,
      n(g),
      `분모 ${nj(sd * g, "을", "를")} ${nro(g)} 나누면 ${n(sd)}이고 분자 ${nj(sn * g, "을", "를")} ${nro(g)} 나누면 ${n(sn)}이므로, 나눈 수는 ${n(g)}입니다.`,
    );
  }
  return make(
    unit,
    `${frj(sn, sd, "과", "와")} 크기가 같은 분수 중에서 분모가 ${n(sd * g)}인 분수의 분자를 구하시오.`,
    n(sn * g),
    `분모가 ${n(g)}배가 되었으므로 분자도 ${n(g)}배가 됩니다. ${expr(`${sn}\\times${g}=${sn * g}`)}입니다.`,
  );
}

/** 응용 — 합·차 조건에서 몇 배인지 먼저 찾아야 한다(두 단계). */
function eq141Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 6, 7]);
  const g = pick(
    rng,
    [2, 3, 4, 5, 6].filter((x) => sd * x <= 24),
  );
  if (intBetween(rng, 0, 1) === 0) {
    const sum = (sn + sd) * g;
    return make(
      unit,
      `${frj(sn, sd, "과", "와")} 크기가 같은 분수 중에서 분모와 분자의 합이 ${n(sum)}인 분수를 구하시오.`,
      fr(sn * g, sd * g),
      `${fr(sn, sd)}의 분모와 분자의 합은 ${n(sn + sd)}이고 ${expr(`${sum}\\div${sn + sd}=${g}`)}이므로, 분모와 분자에 각각 ${nj(g, "을", "를")} 곱한 ${fr(sn * g, sd * g)}입니다.`,
    );
  }
  const diff = (sd - sn) * g;
  return make(
    unit,
    `${frj(sn, sd, "과", "와")} 크기가 같은 분수 중에서 분모와 분자의 차가 ${n(diff)}인 분수를 구하시오.`,
    fr(sn * g, sd * g),
    `${fr(sn, sd)}의 분모와 분자의 차는 ${n(sd - sn)}이고 ${expr(`${diff}\\div${sd - sn}=${g}`)}이므로, 분모와 분자에 각각 ${nj(g, "을", "를")} 곱한 ${fr(sn * g, sd * g)}입니다.`,
  );
}

/** 심화 — 분모에 더한 수에서 배를 **역산**하거나, 범위 조건으로 분모를 하나로 좁힌다. */
function eq141Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 6, 7]);
  const g = pick(
    rng,
    [2, 3, 4, 5].filter((x) => sd * x <= 24),
  );
  if (intBetween(rng, 0, 1) === 0) {
    const addDen = sd * (g - 1);
    const addNum = sn * (g - 1);
    return make(
      unit,
      `${fr(sn, sd)}의 분모에 ${nj(addDen, "을", "를")} 더했습니다. 분수의 크기가 변하지 않게 하려면 분자에 얼마를 더해야 합니까?`,
      n(addNum),
      `분모가 ${lro(`${sd}+${addDen}=${sd * g}`)} ${n(g)}배가 되었으므로 분자도 ${n(g)}배인 ${nj(sn * g, "이", "가")} 되어야 합니다. 더할 수는 ${expr(`${sn * g}-${sn}=${addNum}`)}입니다.`,
    );
  }
  // 범위 (lo, lo+sd) 안의 sd 배수는 정확히 하나(sd·g)다 — 답이 하나로 좁혀진다.
  const r1 = intBetween(rng, 1, sd - 1);
  const lo = sd * g - r1;
  const hi = lo + sd;
  return make(
    unit,
    `${frj(sn, sd, "과", "와")} 크기가 같은 분수 중에서 분모가 ${n(lo)}보다 크고 ${n(hi)}보다 작은 분수를 구하시오.`,
    fr(sn * g, sd * g),
    `분모는 ${n(sd)}의 배수 중 ${n(lo)}보다 크고 ${n(hi)}보다 작은 수인 ${n(sd * g)}뿐입니다. 분모와 분자에 각각 ${nj(g, "을", "를")} 곱한 ${fr(sn * g, sd * g)}입니다.`,
  );
}

/** 문형 05 — 분모가 g배가 된 분수의 분자. */
function eq141NewNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 6, 7]);
  const g = pick(
    rng,
    [2, 3, 4, 5, 6].filter((x) => sd * x <= 24),
  );
  return make(
    unit,
    `${frj(sn, sd, "과", "와")} 크기가 같은 분수를 만들려고 분모에 ${nj(g, "을", "를")} 곱했습니다. 분자에 곱해야 할 수는 얼마입니까?`,
    n(g),
    `크기가 같으려면 분자에도 같은 수 ${n(g)}를 곱합니다.`,
  );
}

/** 문형 06 — 두 분수가 몇 배 관계인지. */
function eq141Scale(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 6, 7]);
  const g = pick(
    rng,
    [2, 3, 4, 5, 6].filter((x) => sd * x <= 24),
  );
  return make(
    unit,
    `${frj(sn, sd, "과", "와")} ${fr(sn * g, sd * g)}은 크기가 같습니다. 분모는 몇 배가 되었습니까?`,
    n(g),
    `${expr(`${sd * g}\\div${sd}=${g}`)}이므로 ${n(g)}배입니다.`,
  );
}

/** 문형 07 — 크기가 같은지 판정. */
function eq141Judge(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantYes = altCase4(rng);
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 6]);
  const g = pick(
    rng,
    [2, 3, 4, 5].filter((x) => sd * x <= 24),
  );
  const n2 = wantYes ? sn * g : sn * g + 1;
  return make(
    unit,
    `${frj(sn, sd, "과", "와")} ${fr(n2, sd * g)}은 크기가 같습니까? (예, 아니요)`,
    wantYes ? "예" : "아니요",
    wantYes
      ? `분모와 분자가 모두 ${n(g)}배가 되었으므로 크기가 같습니다.`
      : `분모는 ${n(g)}배가 되었는데 분자는 그렇지 않으므로 크기가 다릅니다.`,
  );
}

/** 문형 08 — 크기가 같은 분수의 분자와 분모의 곱. */
function eq141NumDenProd(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 6]);
  const g = pick(
    rng,
    [2, 3, 4].filter((x) => sd * x <= 24),
  );
  return make(
    unit,
    `${frj(sn, sd, "과", "와")} 크기가 같은 분수 중에서 분모가 ${n(sd * g)}인 분수의 분자와 분모의 곱은 얼마입니까?`,
    n(sn * g * sd * g),
    `분자는 ${n(sn * g)}이므로 곱은 ${expr(`${sn * g}\\times${sd * g}=${sn * g * sd * g}`)}입니다.`,
  );
}

/** 문형 09 — 분모가 지정된 크기가 같은 분수(분수 답). */
function eq141Write(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 6, 7]);
  const g = pick(
    rng,
    [2, 3, 4, 5, 6].filter((x) => sd * x <= 24),
  );
  return make(
    unit,
    `${frj(sn, sd, "과", "와")} 크기가 같은 분수 중에서 분모가 ${n(sd * g)}인 분수를 쓰시오.`,
    fr(sn * g, sd * g),
    `분모가 ${n(g)}배가 되었으므로 분자도 ${n(g)}배입니다. ${fr(sn * g, sd * g)}입니다.`,
  );
}

/** 문형 10 — 분자가 지정된 크기가 같은 분수의 분모. */
function eq141DenFromNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 6, 7]);
  const g = pick(
    rng,
    [2, 3, 4, 5, 6].filter((x) => sd * x <= 24),
  );
  return make(
    unit,
    `${frj(sn, sd, "과", "와")} 크기가 같은 분수 중에서 분자가 ${n(sn * g)}인 분수의 분모를 구하시오.`,
    n(sd * g),
    `분자가 ${n(g)}배가 되었으므로 분모도 ${n(g)}배입니다. ${expr(`${sd}\\times${g}=${sd * g}`)}입니다.`,
  );
}

/* ── 1-4-2 분수를 간단하게 나타내기 — 약분·기약분수는 여기서만 말한다 ── */

/** 연산 — 지정한 수로 한 번 약분한다(절차 한 번). */
function sim142Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5]);
  const t = pick(rng, [2, 3, 4]);
  const u = pick(
    rng,
    [1, 2, 3].filter((x) => sd * t * x <= 48),
  );
  const g = t * u;
  return make(
    unit,
    `${frj(sn * g, sd * g, "을", "를")} ${nro(t)} 약분하시오.`,
    fr((sn * g) / t, (sd * g) / t),
    `분모와 분자를 각각 ${nro(t)} 나눕니다. ${expr(`\\frac{${sn * g}}{${sd * g}}=\\frac{${(sn * g) / t}}{${(sd * g) / t}}`)}입니다.`,
  );
}

/** 기본 — 약분할 수 있는 가장 큰 수·만들 수 있는 분수의 개수를 **판별**한다. */
function sim142Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 7]);
  if (intBetween(rng, 0, 1) === 0) {
    const g = pick(
      rng,
      [4, 6, 8, 9, 10, 12].filter((x) => sd * x <= 48),
    );
    return make(
      unit,
      `${fr(sn * g, sd * g)}의 분모와 분자를 나누어 약분할 수 있는 수 중에서 가장 큰 수를 구하시오.`,
      n(g),
      `분모 ${nj(sd * g, "과", "와")} 분자 ${nj(sn * g, "을", "를")} 함께 나눌 수 있는 가장 큰 수는 ${n(g)}입니다.`,
    );
  }
  const g = pick(
    rng,
    [4, 6, 8, 9, 10, 12].filter((x) => sd * x <= 48),
  );
  const count = divisors(g).length - 1;
  return make(
    unit,
    `${frj(sn * g, sd * g, "을", "를")} 약분하여 만들 수 있는 분수는 모두 몇 개입니까?`,
    n(count),
    `분모와 분자를 함께 나눌 수 있는 ${n(1)}보다 큰 수는 ${numsRo(divisors(g).filter((d) => d > 1))} ${n(count)}개이고, 각각으로 약분하면 서로 다른 분수가 ${n(count)}개 나옵니다.`,
  );
}

/** 응용 — 기약분수로 만든 뒤 그 합을 묻거나, 약분 결과에서 원래 분수를 찾는다(두 단계). */
function sim142Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [3, 4, 5, 6, 7, 8]);
  const g = pick(
    rng,
    [2, 3, 4, 5, 6].filter((x) => sd * x <= 48),
  );
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `${frj(sn * g, sd * g, "을", "를")} 기약분수로 나타냈을 때, 분모와 분자의 합을 구하시오.`,
      n(sn + sd),
      `분모와 분자의 최대공약수 ${nro(g)} 나누면 기약분수 ${fr(sn, sd)}입니다. 합은 ${expr(`${sd}+${sn}=${sn + sd}`)}입니다.`,
    );
  }
  return make(
    unit,
    `분모가 ${n(sd * g)}인 분수 중에서 약분하면 ${frj(sn, sd, "이", "가")} 되는 분수를 구하시오.`,
    fr(sn * g, sd * g),
    `분모가 ${n(sd)}의 ${n(g)}배이므로 분자도 ${n(sn)}의 ${n(g)}배입니다. ${fr(sn * g, sd * g)}입니다.`,
  );
}

/** 심화 — 약분 결과에서 원래를 **역산**하거나, 약분되는 분수를 전수로 센다. */
function sim142Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const [sn, sd] = properFrac(rng, [3, 4, 5, 6, 7, 8]);
    const t = pick(
      rng,
      [2, 3, 4, 5, 6].filter((x) => sd * x <= 48),
    );
    return make(
      unit,
      `어떤 분수의 분모와 분자를 각각 ${nro(t)} 나누어 약분했더니 ${frj(sn, sd, "이", "가")} 되었습니다. 어떤 분수의 분모와 분자의 합을 구하시오.`,
      n(t * (sn + sd)),
      `어떤 분수는 ${fr(sn, sd)}의 분모와 분자에 각각 ${nj(t, "을", "를")} 곱한 ${fr(sn * t, sd * t)}입니다. 합은 ${expr(`${sd * t}+${sn * t}=${t * (sn + sd)}`)}입니다.`,
    );
  }
  const den = pick(rng, [8, 9, 10, 12, 14, 15, 16, 18]);
  let count = 0;
  for (let m = 1; m < den; m += 1) if (gcd(m, den) > 1) count += 1;
  return make(
    unit,
    `분모가 ${n(den)}인 진분수 중에서 약분할 수 있는 분수는 모두 몇 개입니까?`,
    n(count),
    `분자가 ${nj(den, "과", "와")} ${n(1)}이 아닌 공통 약수를 가지면 약분할 수 있습니다. 분자 ${n(1)}부터 ${n(den - 1)}까지 중 그런 수는 ${n(count)}개입니다.`,
  );
}

/** 문형 05 — 기약분수로. */
function sim142Lowest(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 7]);
  const g = pick(
    rng,
    [2, 3, 4, 5, 6].filter((x) => sd * x <= 48),
  );
  return make(
    unit,
    `${frj(sn * g, sd * g, "을", "를")} 기약분수로 나타내시오.`,
    fr(sn, sd),
    `분모와 분자의 최대공약수 ${nro(g)} 나누면 ${fr(sn, sd)}입니다.`,
  );
}

/** 문형 06 — 기약분수의 분자. */
function sim142LowestNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 7]);
  const g = pick(
    rng,
    [2, 3, 4, 5, 6].filter((x) => sd * x <= 48),
  );
  return make(
    unit,
    `${frj(sn * g, sd * g, "을", "를")} 기약분수로 나타냈을 때 분자를 구하시오.`,
    n(sn),
    `최대공약수 ${nro(g)} 나누면 분자는 ${n(sn)}입니다.`,
  );
}

/** 문형 07 — 기약분수의 분모. */
function sim142LowestDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 7]);
  const g = pick(
    rng,
    [2, 3, 4, 5, 6].filter((x) => sd * x <= 48),
  );
  return make(
    unit,
    `${frj(sn * g, sd * g, "을", "를")} 기약분수로 나타냈을 때 분모를 구하시오.`,
    n(sd),
    `최대공약수 ${nro(g)} 나누면 분모는 ${n(sd)}입니다.`,
  );
}

/** 문형 08 — 기약분수인지 판정. */
function sim142IsLowest(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 7]);
  const ok = intBetween(rng, 0, 1) === 0;
  const g = ok ? 1 : pick(rng, [2, 3, 4]);
  return make(
    unit,
    `${fr(sn * g, sd * g)}은 기약분수입니까? (예, 아니요)`,
    g === 1 ? "예" : "아니요",
    g === 1
      ? `분모와 분자의 공약수가 ${n(1)}뿐이므로 기약분수입니다.`
      : `분모와 분자를 ${nro(g)} 더 나눌 수 있으므로 기약분수가 아닙니다.`,
  );
}

/** 문형 09 — 약분한 분수의 분모와 분자의 차. */
function sim142LowestDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 7]);
  const g = pick(
    rng,
    [2, 3, 4, 5, 6].filter((x) => sd * x <= 48),
  );
  return make(
    unit,
    `${frj(sn * g, sd * g, "을", "를")} 기약분수로 나타냈을 때 분모와 분자의 차를 구하시오.`,
    n(sd - sn),
    `기약분수는 ${fr(sn, sd)}이므로 차는 ${expr(`${sd}-${sn}=${sd - sn}`)}입니다.`,
  );
}

/** 문형 10 — 약분할 수 있는지 판정. */
function sim142CanReduce(unit: UnitSeed, rng: Rng): ElemProblem {
  const [sn, sd] = properFrac(rng, [2, 3, 4, 5, 7]);
  const ok = intBetween(rng, 0, 1) === 0;
  const g = ok ? pick(rng, [2, 3, 4]) : 1;
  return make(
    unit,
    `${fr(sn * g, sd * g)}은 약분할 수 있습니까? (예, 아니요)`,
    g > 1 ? "예" : "아니요",
    g > 1
      ? `분모와 분자를 ${nro(g)} 나눌 수 있으므로 약분할 수 있습니다.`
      : `분모와 분자의 공약수가 ${n(1)}뿐이므로 약분할 수 없습니다.`,
  );
}

/* ── 1-4-3 통분 — 두 정본 방식(분모의 곱·최소공배수)을 발문이 명시한다 ── */

/** 곱 방식용 분모 짝 — 곱이 48 이하. */
const PROD_PAIRS = [
  [2, 3],
  [3, 4],
  [2, 5],
  [3, 5],
  [4, 5],
  [2, 7],
  [5, 6],
  [3, 8],
  [4, 6],
  [2, 9],
] as const;

/** 최소공배수 방식용 분모 짝 — gcd>1 이라 두 방식이 실제로 갈린다. L ≤ 36. */
const COM_PAIRS = [
  [4, 6],
  [6, 8],
  [6, 9],
  [8, 12],
  [4, 10],
  [9, 12],
  [10, 15],
  [6, 10],
  [12, 18],
] as const;

/** 연산 — 두 분모의 **곱**을 공통분모로(절차 한 번). */
function com143Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [d1, d2] = pick(rng, PROD_PAIRS);
  const a = coprimeTop(rng, d1);
  const b = coprimeTop(rng, d2);
  const p = d1 * d2;
  return make(
    unit,
    `${frj(a, d1, "과", "와")} ${frj(b, d2, "을", "를")} 두 분모의 곱을 공통분모로 하여 통분하시오.`,
    nums([`\\frac{${a * d2}}{${p}}`, `\\frac{${b * d1}}{${p}}`]),
    `공통분모는 ${expr(`${d1}\\times${d2}=${p}`)}입니다. ${expr(`\\frac{${a}}{${d1}}=\\frac{${a * d2}}{${p}}`)}, ${expr(`\\frac{${b}}{${d2}}=\\frac{${b * d1}}{${p}}`)}입니다.`,
  );
}

/** 기본 — 두 분모의 **최소공배수**를 공통분모로(최소공배수 구하기가 한 겹 낀다). */
function com143Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const [d1, d2] = pick(rng, COM_PAIRS);
  const a = coprimeTop(rng, d1);
  const b = coprimeTop(rng, d2);
  const L = lcm(d1, d2);
  return make(
    unit,
    `${frj(a, d1, "과", "와")} ${frj(b, d2, "을", "를")} 두 분모의 최소공배수를 공통분모로 하여 통분하시오.`,
    nums([`\\frac{${(a * L) / d1}}{${L}}`, `\\frac{${(b * L) / d2}}{${L}}`]),
    `두 분모의 최소공배수는 ${n(L)}입니다. ${expr(`\\frac{${a}}{${d1}}=\\frac{${(a * L) / d1}}{${L}}`)}, ${expr(`\\frac{${b}}{${d2}}=\\frac{${(b * L) / d2}}{${L}}`)}입니다.`,
  );
}

/** 응용 — 통분한 두 분자의 합·차(통분 뒤 셈이 한 단계 더 온다). */
function com143Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [d1, d2] = pick(rng, COM_PAIRS);
  const a = coprimeTop(rng, d1);
  const b = coprimeTop(rng, d2);
  const L = lcm(d1, d2);
  const p = (a * L) / d1;
  const q = (b * L) / d2;
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `${frj(a, d1, "과", "와")} ${frj(b, d2, "을", "를")} 두 분모의 최소공배수를 공통분모로 하여 통분했을 때, 두 분자의 합을 구하시오.`,
      n(p + q),
      `공통분모는 ${n(L)}이고 통분하면 ${frj(p, L, "과", "와")} ${fr(q, L)}입니다. 분자의 합은 ${expr(`${p}+${q}=${p + q}`)}입니다.`,
    );
  }
  const big = Math.max(p, q);
  const small = Math.min(p, q);
  return make(
    unit,
    `${frj(a, d1, "과", "와")} ${frj(b, d2, "을", "를")} 두 분모의 최소공배수를 공통분모로 하여 통분했을 때, 두 분자의 차를 구하시오.`,
    n(big - small),
    `공통분모는 ${n(L)}이고 통분하면 ${frj(p, L, "과", "와")} ${fr(q, L)}입니다. 분자의 차는 ${expr(`${big}-${small}=${big - small}`)}입니다.`,
  );
}

/** 심화 — 통분 결과에서 원래 분수를 **역산**하거나, 공통분모가 될 수 있는 수를 센다. */
function com143Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [d1, d2] = pick(rng, COM_PAIRS);
  const a = coprimeTop(rng, d1);
  const b = coprimeTop(rng, d2);
  const L = lcm(d1, d2);
  if (intBetween(rng, 0, 1) === 0) {
    const q = (b * L) / d2;
    return make(
      unit,
      `${frj(a, d1, "과", "와")} 분모가 ${n(d2)}인 어떤 분수를 두 분모의 최소공배수를 공통분모로 하여 통분했더니 분자가 각각 ${nj((a * L) / d1, "과", "와")} ${nj(q, "이", "가")} 되었습니다. 어떤 분수를 구하시오.`,
      fr(b, d2),
      `공통분모는 ${n(L)}이므로 어떤 분수를 통분한 결과는 ${fr(q, L)}입니다. 분모를 ${nro(d2)} 되돌리면 ${expr(`\\frac{${q}}{${L}}=\\frac{${b}}{${d2}}`)}입니다.`,
    );
  }
  const count = Math.floor(99 / L);
  return make(
    unit,
    `${frj(a, d1, "과", "와")} ${frj(b, d2, "을", "를")} 통분할 때 공통분모가 될 수 있는 수 중에서 ${n(100)}보다 작은 수는 모두 몇 개입니까?`,
    n(count),
    `공통분모는 두 분모의 공배수, 곧 최소공배수 ${n(L)}의 배수입니다. ${n(100)}보다 작은 ${n(L)}의 배수는 ${n(count)}개입니다.`,
  );
}

/** 문형 05 — 공통분모(곱). */
function com143CommonDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const [d1, d2] = pick(rng, PROD_PAIRS);
  return make(
    unit,
    `분모가 ${n(d1)}인 분수와 분모가 ${n(d2)}인 분수를 두 분모의 곱을 공통분모로 하여 통분할 때, 공통분모는 얼마입니까?`,
    n(d1 * d2),
    `${expr(`${d1}\\times${d2}=${d1 * d2}`)}입니다.`,
  );
}

/** 문형 06 — 최소공배수를 공통분모로. */
function com143LcmDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const [d1, d2] = pick(rng, COM_PAIRS);
  const L = lcm(d1, d2);
  return make(
    unit,
    `분모가 ${n(d1)}인 분수와 분모가 ${n(d2)}인 분수를 두 분모의 최소공배수를 공통분모로 하여 통분할 때, 공통분모는 얼마입니까?`,
    n(L),
    `두 분모의 최소공배수는 ${n(L)}입니다.`,
  );
}

/** 문형 07 — 통분한 첫째 분수의 분자. */
function com143FirstNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [d1, d2] = pick(rng, COM_PAIRS);
  const a = coprimeTop(rng, d1);
  const b = coprimeTop(rng, d2);
  const L = lcm(d1, d2);
  return make(
    unit,
    `${frj(a, d1, "과", "와")} ${fr(b, d2)}를 두 분모의 최소공배수를 공통분모로 하여 통분할 때, ${fr(a, d1)}을 통분한 분수의 분자를 구하시오.`,
    n((a * L) / d1),
    `공통분모는 ${n(L)}이므로 분자는 ${expr(`${a}\\times${L / d1}=${(a * L) / d1}`)}입니다.`,
  );
}

/** 문형 08 — 통분한 두 분자의 곱. */
function com143NumProd(unit: UnitSeed, rng: Rng): ElemProblem {
  const [d1, d2] = pick(rng, COM_PAIRS);
  const a = coprimeTop(rng, d1);
  const b = coprimeTop(rng, d2);
  const L = lcm(d1, d2);
  const p = (a * L) / d1;
  const q = (b * L) / d2;
  return make(
    unit,
    `${frj(a, d1, "과", "와")} ${frj(b, d2, "을", "를")} 두 분모의 최소공배수를 공통분모로 하여 통분했을 때, 두 분자의 곱을 구하시오.`,
    n(p * q),
    `통분한 분자는 ${n(p)}, ${n(q)}이므로 곱은 ${expr(`${p}\\times${q}=${p * q}`)}입니다.`,
  );
}

/** 문형 09 — 공통분모인지 판정. */
function com143IsCommon(unit: UnitSeed, rng: Rng): ElemProblem {
  const [d1, d2] = pick(rng, COM_PAIRS);
  const L = lcm(d1, d2);
  const ok = intBetween(rng, 0, 1) === 0;
  const x = ok ? L * intBetween(rng, 1, 3) : L + 1;
  return make(
    unit,
    `분모가 ${n(d1)}인 분수와 분모가 ${n(d2)}인 분수를 통분할 때 ${nj(x, "은", "는")} 공통분모가 될 수 있습니까? (예, 아니요)`,
    x % L === 0 ? "예" : "아니요",
    x % L === 0
      ? `${nj(x, "은", "는")} 최소공배수 ${n(L)}의 배수이므로 공통분모가 될 수 있습니다.`
      : `${nj(x, "은", "는")} 두 분모의 공배수가 아니므로 공통분모가 될 수 없습니다.`,
  );
}

/** 문형 10 — 곱 공통분모와 최소공배수 공통분모의 차. */
function com143DenGap(unit: UnitSeed, rng: Rng): ElemProblem {
  const [d1, d2] = pick(rng, COM_PAIRS);
  const L = lcm(d1, d2);
  const p = d1 * d2;
  return make(
    unit,
    `분모가 ${n(d1)}인 분수와 분모가 ${n(d2)}인 분수를 통분할 때, 두 분모의 곱과 두 분모의 최소공배수의 차는 얼마입니까?`,
    n(p - L),
    `곱은 ${n(p)}, 최소공배수는 ${n(L)}이므로 차는 ${expr(`${p}-${L}=${p - L}`)}입니다.`,
  );
}

/* ── 1-4-4 분수의 크기 비교 — 동률은 구성상 나오지 않는다 ── */

/** 연산 — 같은 분모·단위분수(절차 한 번). */
function cmp144Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const den = intBetween(rng, 5, 12);
    const tops = pickSome(
      rng,
      Array.from({ length: den - 1 }, (_, i) => i + 1),
      2,
    );
    const big = Math.max(tops[0]!, tops[1]!);
    return make(
      unit,
      `${frj(tops[0]!, den, "과", "와")} ${fr(tops[1]!, den)} 중 더 큰 분수를 쓰시오.`,
      fr(big, den),
      `분모가 같으므로 분자가 큰 쪽이 더 큽니다. ${expr(`\\frac{${big}}{${den}}`)}입니다.`,
    );
  }
  const dens = pickSome(rng, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 2);
  const small = Math.max(dens[0]!, dens[1]!);
  return make(
    unit,
    `${frj(1, dens[0]!, "과", "와")} ${fr(1, dens[1]!)} 중 더 작은 분수를 쓰시오.`,
    fr(1, small),
    `분자가 ${n(1)}로 같으므로 분모가 큰 쪽이 더 작습니다. ${expr(`\\frac{1}{${small}}`)}입니다.`,
  );
}

/** 기본 — 분모가 다른 두 분수(통분 판단이 한 겹). 옛 표준과 반대로 «더 작은» 쪽을 묻는다. */
function cmp144Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const dens = pickSome(rng, [4, 5, 6, 7, 8, 9, 10], 2);
  const a = coprimeTop(rng, dens[0]!, 2);
  const b = coprimeTop(rng, dens[1]!, 2);
  const leftSmall = a * dens[1]! < b * dens[0]!;
  return make(
    unit,
    `${frj(a, dens[0]!, "과", "와")} ${fr(b, dens[1]!)} 중 더 작은 분수를 쓰시오.`,
    leftSmall ? fr(a, dens[0]!) : fr(b, dens[1]!),
    `통분하면 ${frj(a * dens[1]!, dens[0]! * dens[1]!, "과", "와")} ${fr(b * dens[0]!, dens[0]! * dens[1]!)}이므로 분자가 작은 쪽이 더 작습니다.`,
  );
}

/** 응용 — 세 분수의 비교(두 번 견줘야 한다). */
function cmp144Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const dens = pickSome(rng, [3, 4, 5, 6, 7, 8, 9, 10], 3);
  const fracs = dens.map((d) => [coprimeTop(rng, d), d] as const);
  const byValue = [...fracs].sort((x, y) => x[0] * y[1] - y[0] * x[1]);
  const list = `${fr(fracs[0]![0], fracs[0]![1])}, ${fr(fracs[1]![0], fracs[1]![1])}, ${fr(fracs[2]![0], fracs[2]![1])}`;
  if (intBetween(rng, 0, 1) === 0) {
    const top = byValue[2]!;
    return make(
      unit,
      `${list} 중에서 가장 큰 분수를 쓰시오.`,
      fr(top[0], top[1]),
      `세 분수를 두 개씩 통분하여 견주면 ${frj(top[0], top[1], "이", "가")} 가장 큽니다.`,
    );
  }
  const bottom = byValue[0]!;
  return make(
    unit,
    `${list} 중에서 가장 작은 분수를 쓰시오.`,
    fr(bottom[0], bottom[1]),
    `세 분수를 두 개씩 통분하여 견주면 ${frj(bottom[0], bottom[1], "이", "가")} 가장 작습니다.`,
  );
}

/** 심화 — 두 분수 사이의 □ 자연수 개수(범위가 비지 않게 구성). */
function cmp144Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = pick(rng, [8, 9, 10, 12]);
  // 아래 경계는 약분되는 자리만 — 두 경계가 다 /e 그대로면 통분 한 겹이 사라져 심화가 아니다.
  const lows: number[] = [];
  for (let v = 1; v <= e - 4; v += 1) if (gcd(v, e) > 1) lows.push(v);
  const lo = pick(rng, lows);
  const gap = intBetween(rng, 2, Math.min(4, e - 1 - lo));
  const hi = lo + gap;
  const [la, ld] = simplify(lo, e);
  const [ha, hd] = simplify(hi, e);
  const count = gap - 1;
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `□ 안에 들어갈 수 있는 자연수는 모두 몇 개입니까?  ${expr(`\\frac{${la}}{${ld}}<\\frac{\\square}{${e}}<\\frac{${ha}}{${hd}}`)}`,
      n(count),
      `분모를 ${nro(e)} 맞추면 ${expr(`\\frac{${lo}}{${e}}<\\frac{\\square}{${e}}<\\frac{${hi}}{${e}}`)}이므로 □는 ${n(lo)}보다 크고 ${n(hi)}보다 작은 자연수입니다. 모두 ${n(count)}개입니다.`,
    );
  }
  return make(
    unit,
    `${frj(la, ld, "보다", "보다")} 크고 ${fr(ha, hd)}보다 작은 분수 중에서 분모가 ${n(e)}인 분수는 모두 몇 개입니까?`,
    n(count),
    `분모를 ${nro(e)} 맞추면 분자는 ${n(lo)}보다 크고 ${n(hi)}보다 작은 자연수이므로 모두 ${n(count)}개입니다.`,
  );
}

/** 문형 05 — 분모가 다른 두 분수 중 더 큰 것(기호). */
function cmp144Bigger(unit: UnitSeed, rng: Rng): ElemProblem {
  const dens = pickSome(rng, [4, 5, 6, 7, 8, 9, 10], 2);
  const a = coprimeTop(rng, dens[0]!, 2);
  const b = coprimeTop(rng, dens[1]!, 2);
  const leftBig = a * dens[1]! > b * dens[0]!;
  const firstIsLeft = intBetween(rng, 0, 1) === 0;
  const [p1, p2] = firstIsLeft
    ? [fr(a, dens[0]!), fr(b, dens[1]!)]
    : [fr(b, dens[1]!), fr(a, dens[0]!)];
  const ans = leftBig === firstIsLeft ? "㉠" : "㉡";
  return make(
    unit,
    `값이 더 큰 분수를 찾아 기호를 쓰시오.  ㉠\u00a0${p1}\u3000\u3000㉡\u00a0${p2}`,
    ans,
    `통분하면 분자가 큰 쪽이 더 큽니다. 답은 ${ans}입니다.`,
  );
}

/** 문형 06 — 같은 분모에서 더 작은 분수의 분자. */
function cmp144SameDenSmall(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 12);
  const tops = pickSome(
    rng,
    Array.from({ length: den - 1 }, (_, i) => i + 1),
    2,
  );
  const small = Math.min(tops[0]!, tops[1]!);
  return make(
    unit,
    `분모가 ${n(den)}으로 같은 ${frj(tops[0]!, den, "과", "와")} ${fr(tops[1]!, den)} 중에서 더 작은 분수의 분자를 구하시오.`,
    n(small),
    `분모가 같으므로 분자가 작은 ${n(small)} 쪽이 더 작습니다.`,
  );
}

/** 문형 07 — 왼쪽이 더 큰지 판정. */
function cmp144Judge(unit: UnitSeed, rng: Rng): ElemProblem {
  const dens = pickSome(rng, [4, 5, 6, 7, 8, 9, 10], 2);
  const a = coprimeTop(rng, dens[0]!, 2);
  const b = coprimeTop(rng, dens[1]!, 2);
  const leftBig = a * dens[1]! > b * dens[0]!;
  return make(
    unit,
    `${frj(a, dens[0]!, "이", "가")} ${fr(b, dens[1]!)}보다 큽니까? (예, 아니요)`,
    leftBig ? "예" : "아니요",
    `통분한 분자는 ${n(a * dens[1]!)}, ${n(b * dens[0]!)}입니다. 따라서 ${leftBig ? "맞습니다" : "아닙니다"}.`,
  );
}

/** 문형 08 — 통분한 두 분자의 차. */
function cmp144CrossDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const dens = pickSome(rng, [4, 5, 6, 7, 8, 9, 10], 2);
  const a = coprimeTop(rng, dens[0]!, 2);
  const b = coprimeTop(rng, dens[1]!, 2);
  const diff = Math.abs(a * dens[1]! - b * dens[0]!);
  return make(
    unit,
    `${frj(a, dens[0]!, "과", "와")} ${fr(b, dens[1]!)}을 두 분모의 곱으로 통분했을 때, 두 분자의 차는 얼마입니까?`,
    n(diff),
    `통분한 분자는 ${n(a * dens[1]!)}, ${n(b * dens[0]!)}이므로 차는 ${n(diff)}입니다.`,
  );
}

/** 문형 09 — 세 분수 중 가운데. */
function cmp144Middle(unit: UnitSeed, rng: Rng): ElemProblem {
  const dens = pickSome(rng, [3, 4, 5, 6, 7, 8, 9, 10], 3);
  const fracs = dens.map((d) => [coprimeTop(rng, d), d] as const);
  const byValue = [...fracs].sort((x, y) => x[0] * y[1] - y[0] * x[1]);
  const mid = byValue[1]!;
  const list = `${fr(fracs[0]![0], fracs[0]![1])}, ${fr(fracs[1]![0], fracs[1]![1])}, ${fr(fracs[2]![0], fracs[2]![1])}`;
  return make(
    unit,
    `${list} 중에서 크기가 가운데인 분수를 쓰시오.`,
    fr(mid[0], mid[1]),
    `세 분수를 견주면 가운데는 ${fr(mid[0], mid[1])}입니다.`,
  );
}

/** 문형 10 — 단위분수에서 분모가 작은 쪽(더 크다). */
function cmp144UnitBig(unit: UnitSeed, rng: Rng): ElemProblem {
  const dens = pickSome(rng, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 2);
  const smallDen = Math.min(dens[0]!, dens[1]!);
  return make(
    unit,
    `분자가 ${n(1)}인 ${frj(1, dens[0]!, "과", "와")} ${fr(1, dens[1]!)} 중에서 더 큰 분수의 분모를 구하시오.`,
    n(smallDen),
    `분자가 같으면 분모가 작은 쪽이 더 큽니다. 더 작은 분모는 ${n(smallDen)}입니다.`,
  );
}

/* ── 1-4-5 분수와 소수의 크기 비교 — «소수»는 여기서만 말한다 ── */

/** 소수로 딱 떨어지는 분수(천분의 일 정수) — 옛 표준 풀에 분모 10·20·25 를 더했다. */
const FD145_PAIRS = [
  ...FRAC_DEC_PAIRS,
  [1, 10, 100],
  [3, 10, 300],
  [9, 10, 900],
  [7, 20, 350],
  [1, 25, 40],
  [3, 25, 120],
] as const;

/** 소수 쪽 값 풀(천분의 일 정수). */
const DEC_MILLIS = [
  100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800,
  850, 900,
] as const;

/** 연산 — 분수를 소수로 나타낸다(절차 한 번). */
function fd145Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [fn, fd, milli] = pick(rng, FD145_PAIRS);
  return make(
    unit,
    `${frj(fn, fd, "을", "를")} 소수로 나타내시오.`,
    expr(dec(milli, 3)),
    `${expr(`\\frac{${fn}}{${fd}}=${dec(milli, 3)}`)}입니다.`,
  );
}

/** 기본 — 분수와 소수를 견준다(한 겹). 옛 표준과 반대로 «더 작은» 쪽·소수 먼저. */
function fd145Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const [fn, fd, milli] = pick(rng, FD145_PAIRS);
  const decMilli = pick(
    rng,
    DEC_MILLIS.filter((v) => v !== milli),
  );
  const decText = dec(decMilli, 3);
  const smaller = milli < decMilli ? fr(fn, fd) : expr(decText);
  return make(
    unit,
    `${dj(decText, "과", "와")} ${fr(fn, fd)} 중 더 작은 수를 쓰시오.`,
    smaller,
    `${expr(`\\frac{${fn}}{${fd}}=${dec(milli, 3)}`)}이고 ${expr(`${dec(Math.min(milli, decMilli), 3)}<${dec(Math.max(milli, decMilli), 3)}`)}이므로 ${smaller}입니다.`,
  );
}

/** 응용 — 분수·소수 섞인 세 수의 비교(변환 뒤 두 번 견준다). */
function fd145Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [fn, fd, milli] = pick(rng, FD145_PAIRS);
  const decs = pickSome(
    rng,
    DEC_MILLIS.filter((v) => v !== milli),
    2,
  );
  const items: [number, string][] = [
    [milli, fr(fn, fd)],
    [decs[0]!, expr(dec(decs[0]!, 3))],
    [decs[1]!, expr(dec(decs[1]!, 3))],
  ];
  const list = `${items[0]![1]}, ${items[1]![1]}, ${items[2]![1]}`;
  const sorted = [...items].sort((x, y) => x[0] - y[0]);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `${list} 중에서 가장 큰 수를 쓰시오.`,
      sorted[2]![1],
      `${expr(`\\frac{${fn}}{${fd}}=${dec(milli, 3)}`)}${dro(dec(milli, 3))} 고쳐 견주면 가장 큰 수는 ${sorted[2]![1]}입니다.`,
    );
  }
  return make(
    unit,
    `${list} 중에서 가장 작은 수를 쓰시오.`,
    sorted[0]![1],
    `${expr(`\\frac{${fn}}{${fd}}=${dec(milli, 3)}`)}${dro(dec(milli, 3))} 고쳐 견주면 가장 작은 수는 ${sorted[0]![1]}입니다.`,
  );
}

/** 심화 — 소수 사이의 □/d 자연수 개수(범위가 비지 않게 구성·개수는 전수로 센다). */
function fd145Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, [4, 5, 8, 10, 20]);
  const minGap = Math.ceil(20 / den);
  const h = intBetween(rng, 1, 9 - minGap);
  const k = h + intBetween(rng, minGap, Math.min(9 - h, minGap + 3));
  let count = 0;
  for (let m = 1; m <= den; m += 1) {
    if (m * 10 > h * den && m * 10 < k * den) count += 1;
  }
  return make(
    unit,
    `□ 안에 들어갈 수 있는 자연수는 모두 몇 개입니까?  ${expr(`0.${h}<\\frac{\\square}{${den}}<0.${k}`)}`,
    n(count),
    `${expr(`0.${h}=\\frac{${h * den}}{${den * 10}}`)}, ${expr(`0.${k}=\\frac{${k * den}}{${den * 10}}`)}이므로 □가 ${n(10)}배가 된 ${expr(`\\square\\times10`)}은 ${n(h * den)}보다 크고 ${n(k * den)}보다 작아야 합니다. 그런 자연수 □는 모두 ${n(count)}개입니다.`,
  );
}

/** 문형 05 — 소수를 분수로. */
function fd145DecToFrac(unit: UnitSeed, rng: Rng): ElemProblem {
  const [fn, fd, milli] = pick(rng, FD145_PAIRS);
  return make(
    unit,
    `소수 ${expr(dec(milli, 3))}을 분수로 나타내시오.`,
    fr(fn, fd),
    `${expr(`${dec(milli, 3)}=\\frac{${fn}}{${fd}}`)}입니다.`,
  );
}

/** 문형 06 — 분수와 소수 중 더 큰 수. */
function fd145Bigger(unit: UnitSeed, rng: Rng): ElemProblem {
  const [fn, fd, milli] = pick(rng, FD145_PAIRS);
  const decMilli = pick(
    rng,
    DEC_MILLIS.filter((v) => v !== milli),
  );
  const decText = dec(decMilli, 3);
  const bigger = milli > decMilli ? fr(fn, fd) : expr(decText);
  return make(
    unit,
    `${dj(decText, "과", "와")} ${fr(fn, fd)} 중 더 큰 수를 쓰시오.`,
    bigger,
    `${expr(`\\frac{${fn}}{${fd}}=${dec(milli, 3)}`)}이므로 더 큰 수는 ${bigger}입니다.`,
  );
}

/** 문형 07 — 같은 값인지 판정. */
function fd145Equal(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantYes = altCase(rng);
  const [fn, fd, milli] = pick(rng, FD145_PAIRS);
  const shown = wantYes
    ? milli
    : pick(
        rng,
        DEC_MILLIS.filter((v) => v !== milli),
      );
  const decText = dec(shown, 3);
  return make(
    unit,
    `${frj(fn, fd, "과", "와")} 소수 ${expr(decText)}은 크기가 같습니까? (예, 아니요)`,
    wantYes ? "예" : "아니요",
    `${expr(`\\frac{${fn}}{${fd}}=${dec(milli, 3)}`)}이므로 ${wantYes ? "같습니다" : "다릅니다"}.`,
  );
}

/** 문형 08 — 분수를 소수로 나타낸 값에서 1을 뺀 차(1보다 작은 소수). */
function fd145ToOne(unit: UnitSeed, rng: Rng): ElemProblem {
  const [fn, fd, milli] = pick(rng, FD145_PAIRS);
  const rest = 1000 - milli;
  return make(
    unit,
    `${frj(fn, fd, "을", "를")} 소수로 나타낸 뒤 ${n(1)}에서 빼면 얼마입니까?`,
    expr(dec(rest, 3)),
    `${expr(`\\frac{${fn}}{${fd}}=${dec(milli, 3)}`)}, ${expr(`1-${dec(milli, 3)}=${dec(rest, 3)}`)}입니다.`,
  );
}

/** 문형 09 — 소수와 분수를 견준 차(천분의 일). */
function fd145MilliDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const [fn, fd, milli] = pick(rng, FD145_PAIRS);
  const decMilli = pick(
    rng,
    DEC_MILLIS.filter((v) => v !== milli),
  );
  const decText = dec(decMilli, 3);
  const diff = Math.abs(milli - decMilli);
  return make(
    unit,
    `${frj(fn, fd, "과", "와")} 소수 ${expr(decText)}의 차는 얼마입니까?`,
    expr(dec(diff, 3)),
    `${expr(`\\frac{${fn}}{${fd}}=${dec(milli, 3)}`)}이므로 차는 ${expr(dec(diff, 3))}입니다.`,
  );
}

/** 문형 10 — 세 수 중 가운데. */
function fd145Middle(unit: UnitSeed, rng: Rng): ElemProblem {
  const [fn, fd, milli] = pick(rng, FD145_PAIRS);
  const decs = pickSome(
    rng,
    DEC_MILLIS.filter((v) => v !== milli),
    2,
  );
  const items: [number, string][] = [
    [milli, fr(fn, fd)],
    [decs[0]!, expr(dec(decs[0]!, 3))],
    [decs[1]!, expr(dec(decs[1]!, 3))],
  ];
  const list = `${items[0]![1]}, ${items[1]![1]}, ${items[2]![1]}`;
  const sorted = [...items].sort((x, y) => x[0] - y[0]);
  return make(
    unit,
    `${list} 중에서 크기가 가운데인 수를 쓰시오.`,
    sorted[1]![1],
    `분수 ${fr(fn, fd)}을 소수 ${expr(dec(milli, 3))}로 고쳐 견주면 가운데는 ${sorted[1]![1]}입니다.`,
  );
}

/* ────────── 1-5 분수의 덧셈과 뺄셈 — 난이도 4단 (D-72 확대 6차) ──────────
 *
 * 소단원 이름이 곧 조건이다(D-66⑼): **1-5-1 진분수의 덧셈 · 1-5-2 대분수의 덧셈 ·
 * 1-5-3 진분수의 뺄셈 · 1-5-4 대분수의 뺄셈.** 그래서 이름 약속을 자기 시험이 잠근다 —
 * 「진분수」소단원의 **피연산자**는 진분수뿐이고, 「대분수」소단원은 대분수가 낀다.
 * (답은 이름이 걸지 않는다 — 진분수끼리 더하면 답이 대분수가 될 수 있다.)
 *
 * 뺄셈은 **구성으로** 결과가 양수임을 보장한다(⑶) — 음수로 접히면 초등 지면이 아니다.
 * 진분수 뺄셈은 큰 쪽에서 작은 쪽을 빼도록 자리를 바꾸고, 대분수 뺄셈은 자연수부를
 * 벌려 둔다. 답은 언제나 기약(R2 대분수 정본 꼴)이고 시험이 gcd 로 따로 검산한다(⑴).
 *
 * 표기 규약(⑷): 분수는 `fracLatex` 한 곳을 거친다 — 가분수는 대분수로 접히고,
 * 분모가 1이면 자연수로, 나머지가 0이면 자연수로 떨어진다. 손으로 `\frac` 을 쓰지 않는다.
 */

/** 진분수 뺄셈용 분모 짝 — 통분이 살아 있게 gcd 로 안 접히는 것도 섞는다. */
const SUB_DENS = [3, 4, 5, 6, 8, 9, 10, 12] as const;

/**
 * 단위 낱말을 **읽은 소리**의 받침 — `m`=미터·`L`=리터는 없고 `kg`=킬로그램은 있다.
 * 글자(m·L·kg)를 보고 정하면 틀린다. 조사는 언제나 소리가 정한다.
 */
const UNIT_SOUND: Record<string, readonly [boolean, boolean]> = {
  // [받침이 있나, ㄹ받침인가] — ㄹ받침은 «으로» 가 아니라 «로» 다(«살로»).
  m: [false, false],
  L: [false, false],
  kg: [true, false],
  살: [true, true],
  명: [true, false],
  개: [false, false],
  원: [true, false],
  장: [true, false],
  칸: [true, false],
};

/** 단위 뒤 조사. `uj("kg", "을", "를")` → `kg을`. 모르는 단위는 받침 없음으로 본다. */
const uj = (unitWord: string, withFinal: string, without: string): string =>
  `${unitWord}${(UNIT_SOUND[unitWord] ?? [false, false])[0] ? withFinal : without}`;

/** 단위 뒤 `(으)로`. `uro("kg")` → `kg으로`, `uro("살")` → `살로`. */
const uro = (unitWord: string): string => {
  const [final, rieul] = UNIT_SOUND[unitWord] ?? [false, false];
  return `${unitWord}${final && !rieul ? "으로" : "로"}`;
};

/** 문장 소재 — [것, 단위]. 사람 이름은 따로 뽑는다. */
const FRAC_STUFF = [
  ["물", "L"],
  ["주스", "L"],
  ["끈", "m"],
  ["철사", "m"],
  ["밀가루", "kg"],
  ["설탕", "kg"],
] as const;

const FRAC_NAMES = ["지호", "예린", "민준", "서아", "도윤"] as const;

/** 두 진분수를 뽑되 **값이 다르고** 분모도 다르게. 큰 쪽·작은 쪽을 갈라 돌려준다. */
function twoProperFracs(
  rng: Rng,
  dens: readonly number[],
): { big: [number, number]; small: [number, number] } {
  const [a, d1] = properFrac(rng, dens);
  const [b, d2] = properFrac(
    rng,
    dens.filter((x) => x !== d1),
  );
  // 분모가 다르고 둘 다 기약이면 두 값은 절대 같지 않다 — 동률이 구성상 불가능하다.
  return a * d2 > b * d1
    ? { big: [a, d1], small: [b, d2] }
    : { big: [b, d2], small: [a, d1] };
}

/** 대분수 한 덩어리 — 자연수부는 1 이상. */
const mx = (whole: number, num: number, den: number): string =>
  expr(mixedLatex(whole, num, den));

/** 대분수 뒤 조사 — 읽은 소리는 **분자**로 끝난다(«이와 삼분의 일»). */
const mxj = (
  whole: number,
  num: number,
  den: number,
  withFinal: string,
  without: string,
): string =>
  `${mx(whole, num, den)}${FINAL_DIGITS.has(lastDigit(num)) ? withFinal : without}`;

/* ── 1-5-1 진분수의 덧셈 ── */

/** 연산 — 식이 그대로 주어진다(절차 한 번). */
function add151Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const L = lcm(d1, d2);
  const [num, den] = addFrac(a, d1, b, d2);
  return make(
    unit,
    `계산하시오.  ${expr(`\\frac{${a}}{${d1}}+\\frac{${b}}{${d2}}`)}`,
    expr(fracLatex(num, den)),
    `${nro(L)} 통분하면 ${expr(`\\frac{${(a * L) / d1}}{${L}}+\\frac{${(b * L) / d2}}{${L}}=\\frac{${(a * L) / d1 + (b * L) / d2}}{${L}}`)}이고, 약분하여 ${expr(fracLatex(num, den))}입니다.`,
  );
}

/** 기본 — 문장에서 식을 **스스로** 세운다(한 겹). */
function add151Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const [num, den] = addFrac(a, d1, b, d2);
  const [thing, unitWord] = pick(rng, FRAC_STUFF);
  const [who1, who2] = pickSome(rng, FRAC_NAMES, 2);
  return make(
    unit,
    `${wj(who1, "은", "는")} ${thing} ${fr(a, d1)} ${uj(unitWord, "을", "를")}, ${wj(who2, "은", "는")} ${fr(b, d2)} ${uj(unitWord, "을", "를")} 가지고 있습니다. 두 사람이 가진 ${wj(thing, "은", "는")} 모두 몇 ${unitWord}입니까?`,
    expr(fracLatex(num, den)),
    `두 양을 더합니다. ${expr(`\\frac{${a}}{${d1}}+\\frac{${b}}{${d2}}=${fracLatex(num, den)}`)}이므로 ${expr(fracLatex(num, den))} ${unitWord}입니다.`,
  );
}

/** 응용 — 세 분수를 더하거나(두 걸음), 남은 양을 묻는다. */
function add151Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const dens = pickSome(rng, [3, 4, 5, 6, 8, 12], 3);
  const fracs = dens.map((d) => [coprimeTop(rng, d), d] as const);
  const [n1, d1] = fracs[0]!;
  const [n2, d2] = fracs[1]!;
  const [n3, d3] = fracs[2]!;
  const [s1, sd1] = addFrac(n1, d1, n2, d2);
  const [num, den] = addFrac(s1, sd1, n3, d3);
  return make(
    unit,
    `계산하시오.  ${expr(`\\frac{${n1}}{${d1}}+\\frac{${n2}}{${d2}}+\\frac{${n3}}{${d3}}`)}`,
    expr(fracLatex(num, den)),
    `앞의 두 분수를 먼저 더하면 ${expr(`\\frac{${n1}}{${d1}}+\\frac{${n2}}{${d2}}=${fracLatex(s1, sd1)}`)}이고, 여기에 ${frj(n3, d3, "을", "를")} 더하면 ${expr(fracLatex(num, den))}입니다.`,
  );
}

/** 심화 — **역산**: 더해서 주어진 합이 되는 수를 거슬러 구한다. */
function add151Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const { big, small } = twoProperFracs(rng, [3, 4, 5, 6, 8, 12]);
  const [sn, sd] = addFrac(big[0], big[1], small[0], small[1]);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `□ 안에 알맞은 수를 구하시오.  ${expr(`\\frac{${small[0]}}{${small[1]}}+\\square=${fracLatex(sn, sd)}`)}`,
      expr(fracLatex(big[0], big[1])),
      `□는 합에서 앞의 수를 뺀 것입니다. ${expr(`${fracLatex(sn, sd)}-\\frac{${small[0]}}{${small[1]}}=${fracLatex(big[0], big[1])}`)}입니다.`,
    );
  }
  return make(
    unit,
    `어떤 수에 ${frj(small[0], small[1], "을", "를")} 더했더니 ${lj(fracLatex(sn, sd), "이", "가")} 되었습니다. 어떤 수를 구하시오.`,
    expr(fracLatex(big[0], big[1])),
    `어떤 수는 ${lj(fracLatex(sn, sd), "에서", "에서")} ${frj(small[0], small[1], "을", "를")} 뺀 것입니다. ${expr(`${fracLatex(sn, sd)}-\\frac{${small[0]}}{${small[1]}}=${fracLatex(big[0], big[1])}`)}입니다.`,
  );
}

/** 문형 05 — 통분한 공통분모. */
function add151CommonDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const L = lcm(d1, d2);
  return make(
    unit,
    `${frj(a, d1, "과", "와")} ${fr(b, d2)}를 더할 때 공통분모는 얼마입니까?`,
    n(L),
    `두 분모의 최소공배수는 ${n(L)}입니다.`,
  );
}

/** 문형 06 — 통분한 두 분자의 합(약분 전). */
function add151NumSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const L = lcm(d1, d2);
  const s = (a * L) / d1 + (b * L) / d2;
  return make(
    unit,
    `${frj(a, d1, "과", "와")} ${fr(b, d2)}를 최소공배수로 통분하여 더할 때, 약분하기 전 분자의 합은 얼마입니까?`,
    n(s),
    `통분한 분자는 ${n((a * L) / d1)}, ${n((b * L) / d2)}이므로 합은 ${n(s)}입니다.`,
  );
}

/** 문형 07 — 합이 1보다 큰지 판정. */
function add151OverOne(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const [num, den] = addFrac(a, d1, b, d2);
  const over = num > den;
  return make(
    unit,
    `${frj(a, d1, "과", "와")} ${fr(b, d2)}의 합은 ${n(1)}보다 큽니까? (예, 아니요)`,
    over ? "예" : "아니요",
    `합은 ${expr(fracLatex(num, den))}이므로 ${over ? "1보다 큽니다" : "1보다 크지 않습니다"}.`,
  );
}

/** 문형 08 — 합의 자연수 부분(대분수로 접었을 때). */
function add151Whole(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, [2, 3, 4, 5]);
  const [b, d2] = properFrac(
    rng,
    [2, 3, 4, 5].filter((x) => x !== d1),
  );
  const [num, den] = addFrac(a, d1, b, d2);
  const whole = Math.floor(num / den);
  return make(
    unit,
    `${frj(a, d1, "과", "와")} ${fr(b, d2)}의 합을 대분수로 나타낼 때 자연수 부분은 얼마입니까?`,
    n(whole),
    `합은 ${expr(fracLatex(num, den))}이므로 자연수 부분은 ${n(whole)}입니다.`,
  );
}

/** 문형 09 — 두 분수를 더한 값에서 작은 쪽을 다시 뺀 값(큰 쪽). */
function add151ThenSub(unit: UnitSeed, rng: Rng): ElemProblem {
  const { big, small } = twoProperFracs(rng, [3, 4, 5, 6, 8]);
  return make(
    unit,
    `${frj(big[0], big[1], "과", "와")} ${fr(small[0], small[1])}를 더한 뒤 ${fr(small[0], small[1])}를 빼면 얼마입니까?`,
    expr(fracLatex(big[0], big[1])),
    `더했다가 같은 수를 빼면 처음 큰 쪽 ${expr(fracLatex(big[0], big[1]))}이 됩니다.`,
  );
}

/** 문형 10 — 합이 1이 되려면 더해야 할 수. 합이 1 미만이 되게 뽑는다. */
function add151ToOne(unit: UnitSeed, rng: Rng): ElemProblem {
  let a = 1;
  let d1 = 3;
  let b = 1;
  let d2 = 4;
  let num = 7;
  let den = 12;
  for (let i = 0; i < 24; i += 1) {
    const x = properFrac(rng, [5, 6, 8, 10, 12]);
    const y = properFrac(
      rng,
      [5, 6, 8, 10, 12].filter((v) => v !== x[1]),
    );
    const s = addFrac(x[0], x[1], y[0], y[1]);
    if (s[0] < s[1]) {
      [a, d1] = x;
      [b, d2] = y;
      [num, den] = s;
      break;
    }
  }
  const [rn, rd] = subFrac(1, 1, num, den);
  return make(
    unit,
    `${frj(a, d1, "과", "와")} ${fr(b, d2)}의 합에 얼마를 더해야 ${n(1)}이 됩니까?`,
    expr(fracLatex(rn, rd)),
    `합은 ${expr(fracLatex(num, den))}이므로 ${n(1)}이 되려면 ${expr(fracLatex(rn, rd))}를 더합니다.`,
  );
}

/* ── 1-5-2 대분수의 덧셈 ── */

/** 연산 — 대분수 둘을 더한다(절차 한 번). */
function add152Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const w1 = intBetween(rng, 1, 4);
  const w2 = intBetween(rng, 1, 4);
  const L = lcm(d1, d2);
  const [num, den] = addFrac(w1 * d1 + a, d1, w2 * d2 + b, d2);
  return make(
    unit,
    `계산하시오.  ${expr(`${mixedLatex(w1, a, d1)}+${mixedLatex(w2, b, d2)}`)}`,
    expr(fracLatex(num, den)),
    `자연수는 자연수끼리, 분수는 ${nro(L)} 통분해 더합니다. ${expr(`${w1}+${w2}=${w1 + w2}`)}이고 ${expr(`\\frac{${(a * L) / d1}}{${L}}+\\frac{${(b * L) / d2}}{${L}}=${fracLatex((a * L) / d1 + (b * L) / d2, L)}`)}이므로 답은 ${expr(fracLatex(num, den))}입니다.`,
  );
}

/** 기본 — 대분수와 진분수를 더한다. 문장에서 식을 세운다(한 겹). */
function add152Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const w1 = intBetween(rng, 1, 5);
  const [num, den] = addFrac(w1 * d1 + a, d1, b, d2);
  const [thing, unitWord] = pick(rng, [
    ["색 테이프", "m"],
    ["리본", "m"],
    ["우유", "L"],
    ["모래", "kg"],
  ] as const);
  return make(
    unit,
    `${thing} ${mx(w1, a, d1)} ${unitWord}에 ${fr(b, d2)} ${uj(unitWord, "을", "를")} 더 이었습니다. ${wj(thing, "은", "는")} 모두 몇 ${unitWord}입니까?`,
    expr(fracLatex(num, den)),
    `${mxj(w1, a, d1, "과", "와")} ${frj(b, d2, "을", "를")} 더합니다. ${expr(`${mixedLatex(w1, a, d1)}+\\frac{${b}}{${d2}}=${fracLatex(num, den)}`)}이므로 ${expr(fracLatex(num, den))} ${unitWord}입니다.`,
  );
}

/** 응용 — 대분수 셋을 더한다(두 걸음). */
function add152Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const dens = pickSome(rng, [3, 4, 5, 6, 8, 12], 3);
  const parts = dens.map(
    (d) => [intBetween(rng, 1, 3), coprimeTop(rng, d), d] as const,
  );
  const asImproper = parts.map(([w, t, d]) => [w * d + t, d] as const);
  const [s1, sd1] = addFrac(
    asImproper[0]![0],
    asImproper[0]![1],
    asImproper[1]![0],
    asImproper[1]![1],
  );
  const [num, den] = addFrac(s1, sd1, asImproper[2]![0], asImproper[2]![1]);
  const shown = parts.map(([w, t, d]) => mixedLatex(w, t, d)).join("+");
  return make(
    unit,
    `계산하시오.  ${expr(shown)}`,
    expr(fracLatex(num, den)),
    `앞의 두 대분수를 먼저 더하면 ${expr(`${mixedLatex(parts[0]![0], parts[0]![1], parts[0]![2])}+${mixedLatex(parts[1]![0], parts[1]![1], parts[1]![2])}=${fracLatex(s1, sd1)}`)}이고, 여기에 ${mxj(parts[2]![0], parts[2]![1], parts[2]![2], "을", "를")} 더하면 ${expr(fracLatex(num, den))}입니다.`,
  );
}

/** 심화 — **역산**: 합에서 거슬러 대분수를 구한다. */
function add152Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const w1 = intBetween(rng, 1, 4);
  const w2 = intBetween(rng, 1, 4);
  const [sn, sd] = addFrac(w1 * d1 + a, d1, w2 * d2 + b, d2);
  return make(
    unit,
    `어떤 수에 ${mxj(w2, b, d2, "을", "를")} 더했더니 ${lj(fracLatex(sn, sd), "이", "가")} 되었습니다. 어떤 수를 구하시오.`,
    expr(fracLatex(w1 * d1 + a, d1)),
    `어떤 수는 합에서 ${mxj(w2, b, d2, "을", "를")} 뺀 것입니다. ${expr(`${fracLatex(sn, sd)}-${mixedLatex(w2, b, d2)}=${fracLatex(w1 * d1 + a, d1)}`)}입니다.`,
  );
}

/** 문형 05 — 자연수부만 더한 값. */
function add152WholeSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const w1 = intBetween(rng, 1, 4);
  const w2 = intBetween(rng, 1, 4);
  return make(
    unit,
    `${mxj(w1, a, d1, "과", "와")} ${mx(w2, b, d2)}를 더할 때, 자연수부끼리 더한 값은 얼마입니까?`,
    n(w1 + w2),
    `${expr(`${w1}+${w2}=${w1 + w2}`)}입니다.`,
  );
}

/** 문형 06 — 분수부만 더한 값. */
function add152FracSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const w1 = intBetween(rng, 1, 4);
  const w2 = intBetween(rng, 1, 4);
  const [num, den] = addFrac(a, d1, b, d2);
  return make(
    unit,
    `${mxj(w1, a, d1, "과", "와")} ${mx(w2, b, d2)}를 더할 때, 분수부끼리 더한 값은 얼마입니까?`,
    expr(fracLatex(num, den)),
    `${expr(`\\frac{${a}}{${d1}}+\\frac{${b}}{${d2}}=${fracLatex(num, den)}`)}입니다.`,
  );
}

/** 문형 07 — 합의 자연수 부분. */
function add152ResultWhole(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const w1 = intBetween(rng, 1, 4);
  const w2 = intBetween(rng, 1, 4);
  const [num, den] = addFrac(w1 * d1 + a, d1, w2 * d2 + b, d2);
  return make(
    unit,
    `${mxj(w1, a, d1, "과", "와")} ${mx(w2, b, d2)}의 합을 대분수로 나타낼 때 자연수 부분은 얼마입니까?`,
    n(Math.floor(num / den)),
    `합은 ${expr(fracLatex(num, den))}이므로 자연수 부분은 ${n(Math.floor(num / den))}입니다.`,
  );
}

/** 문형 08 — 분수부의 합이 1 이상인지(받아올림). */
function add152Carry(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantCarry = altCase(rng);
  let a = 2;
  let d1 = 3;
  let b = 3;
  let d2 = 4;
  let fn = 17;
  let fd = 12;
  for (let k = 0; k < 40; k += 1) {
    [a, d1] = properFrac(rng, FRAC_DENS);
    [b, d2] = properFrac(
      rng,
      FRAC_DENS.filter((x) => x !== d1),
    );
    [fn, fd] = addFrac(a, d1, b, d2);
    if (fn >= fd === wantCarry) break;
  }
  if (fn >= fd !== wantCarry) {
    if (wantCarry) {
      a = 2;
      d1 = 3;
      b = 3;
      d2 = 4;
    } else {
      a = 1;
      d1 = 5;
      b = 1;
      d2 = 8;
    }
    [fn, fd] = addFrac(a, d1, b, d2);
  }
  const w1 = intBetween(rng, 1, 4);
  const w2 = intBetween(rng, 1, 4);
  const carry = fn >= fd;
  return make(
    unit,
    `${mxj(w1, a, d1, "과", "와")} ${mx(w2, b, d2)}를 더할 때 분수부의 합이 ${n(1)} 이상입니까? (예, 아니요)`,
    carry ? "예" : "아니요",
    `분수부의 합은 ${expr(fracLatex(fn, fd))}이므로 ${carry ? "1 이상입니다" : "1보다 작습니다"}.`,
  );
}

/** 문형 09 — 대분수 하나를 가분수로. */
function add152Improper(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const w1 = intBetween(rng, 1, 5);
  return make(
    unit,
    `${mxj(w1, a, d1, "을", "를")} 가분수로 나타내면 분자는 얼마입니까?`,
    n(w1 * d1 + a),
    `${expr(`${w1}\\times${d1}+${a}=${w1 * d1 + a}`)}이므로 분자는 ${n(w1 * d1 + a)}입니다.`,
  );
}

/** 문형 10 — 두 대분수를 가분수로 바꾼 분자 합. */
function add152ImpNumSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const w1 = intBetween(rng, 1, 4);
  const w2 = intBetween(rng, 1, 4);
  return make(
    unit,
    `${mxj(w1, a, d1, "과", "와")} ${mx(w2, b, d2)}를 각각 가분수로 바꿀 때, 두 분자의 합은 얼마입니까?`,
    n(w1 * d1 + a + w2 * d2 + b),
    `분자는 ${n(w1 * d1 + a)}, ${n(w2 * d2 + b)}이므로 합은 ${n(w1 * d1 + a + w2 * d2 + b)}입니다.`,
  );
}

/* ── 1-5-3 진분수의 뺄셈 — 결과가 양수임을 구성이 보장한다 ── */

/** 연산 — 식이 그대로 주어진다(절차 한 번). */
function sub153Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { big, small } = twoProperFracs(rng, SUB_DENS);
  const L = lcm(big[1], small[1]);
  const [num, den] = subFrac(big[0], big[1], small[0], small[1]);
  return make(
    unit,
    `계산하시오.  ${expr(`\\frac{${big[0]}}{${big[1]}}-\\frac{${small[0]}}{${small[1]}}`)}`,
    expr(fracLatex(num, den)),
    `${nro(L)} 통분하면 ${expr(`\\frac{${(big[0] * L) / big[1]}}{${L}}-\\frac{${(small[0] * L) / small[1]}}{${L}}=\\frac{${(big[0] * L) / big[1] - (small[0] * L) / small[1]}}{${L}}`)}이고, 약분하여 ${expr(fracLatex(num, den))}입니다.`,
  );
}

/** 기본 — 문장에서 식을 세운다(한 겹). «얼마나 더»·«남은 것». */
function sub153Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const { big, small } = twoProperFracs(rng, SUB_DENS);
  const [num, den] = subFrac(big[0], big[1], small[0], small[1]);
  const [thing, unitWord] = pick(rng, FRAC_STUFF);
  const [who1, who2] = pickSome(rng, FRAC_NAMES, 2);
  return make(
    unit,
    `${wj(who1, "은", "는")} ${thing} ${fr(big[0], big[1])} ${uj(unitWord, "을", "를")}, ${wj(who2, "은", "는")} ${fr(small[0], small[1])} ${uj(unitWord, "을", "를")} 가지고 있습니다. ${wj(who1, "은", "는")} ${who2}보다 몇 ${unitWord} 더 많이 가지고 있습니까?`,
    expr(fracLatex(num, den)),
    `많은 쪽에서 적은 쪽을 뺍니다. ${expr(`\\frac{${big[0]}}{${big[1]}}-\\frac{${small[0]}}{${small[1]}}=${fracLatex(num, den)}`)}이므로 ${expr(fracLatex(num, den))} ${unitWord}입니다.`,
  );
}

/** 응용 — 1 에서 두 번 덜어 낸다(두 걸음). 남는 양은 반드시 양수다. */
function sub153Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  // 같은 분모로 두 조각을 뽑되 합이 분모보다 작게 — 1 − (조각1+조각2) > 0.
  const den0 = pick(rng, [5, 6, 7, 8, 9, 10, 12]);
  const p1 = intBetween(rng, 1, den0 - 2);
  // 두 조각이 같은 수면 「같은 말을 두 번」이라 지면이 심심하다. 다른 값이 있으면 그쪽을
  // 고르되, 없으면(분모가 작아 후보가 하나뿐이면) 그냥 쓴다 — 범위를 비우지 않는다.
  const p2Cands: number[] = [];
  for (let v = 1; v <= den0 - p1 - 1; v += 1) if (v !== p1) p2Cands.push(v);
  const p2 = p2Cands.length
    ? pick(rng, p2Cands)
    : intBetween(rng, 1, den0 - p1 - 1);
  const [num, den] = subFrac(den0 - p1, den0, p2, den0);
  // ⚠️ 소재와 동사를 따로 뽑으면 「색종이를 **먹는다**」가 나온다(2026-08-23 g4 적발,
  //    씨앗 2,000개 중 670회). 동사는 소재에 **딸린 값**이어야 한다 — 소재를 늘려도
  //    짝이 자동으로 따라오고, 시험이 그 짝을 잠근다.
  const [thing, whole, verbPast, verbPerf, verbNoun] = pick(rng, [
    ["피자", "한 판", "먹고", "먹었습니다", "먹은"],
    ["케이크", "한 개", "먹고", "먹었습니다", "먹은"],
    ["색종이", "한 장", "쓰고", "썼습니다", "쓴"],
    ["도화지", "한 장", "쓰고", "썼습니다", "쓴"],
    ["끈", "한 개", "쓰고", "썼습니다", "쓴"],
  ] as const);
  return make(
    unit,
    `${thing} ${whole}의 ${frj(p1, den0, "을", "를")} 어제 ${verbPast}, ${frj(p2, den0, "을", "를")} 오늘 ${verbPerf}. 남은 ${wj(thing, "은", "는")} 전체의 얼마입니까?`,
    expr(fracLatex(num, den)),
    `전체 ${n(1)}에서 ${verbNoun} 만큼을 뺍니다. ${expr(`1-\\frac{${p1}}{${den0}}=\\frac{${den0 - p1}}{${den0}}`)}이고, 여기서 ${frj(p2, den0, "을", "를")} 더 빼면 ${expr(fracLatex(num, den))}입니다.`,
  );
}

/** 심화 — **역산**: 뺀 결과에서 거슬러 구한다. */
function sub153Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const { big, small } = twoProperFracs(rng, SUB_DENS);
  const [rn, rd] = subFrac(big[0], big[1], small[0], small[1]);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `□ 안에 알맞은 수를 구하시오.  ${expr(`\\frac{${big[0]}}{${big[1]}}-\\square=${fracLatex(rn, rd)}`)}`,
      expr(fracLatex(small[0], small[1])),
      `□는 앞의 수에서 결과를 뺀 것입니다. ${expr(`\\frac{${big[0]}}{${big[1]}}-${fracLatex(rn, rd)}=${fracLatex(small[0], small[1])}`)}입니다.`,
    );
  }
  return make(
    unit,
    `어떤 수에서 ${frj(small[0], small[1], "을", "를")} 뺐더니 ${lj(fracLatex(rn, rd), "이", "가")} 되었습니다. 어떤 수를 구하시오.`,
    expr(fracLatex(big[0], big[1])),
    `어떤 수는 결과에 뺀 수를 도로 더한 것입니다. ${expr(`${fracLatex(rn, rd)}+\\frac{${small[0]}}{${small[1]}}=${fracLatex(big[0], big[1])}`)}입니다.`,
  );
}

/** 문형 05 — 통분한 공통분모. */
function sub153CommonDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const { big, small } = twoProperFracs(rng, SUB_DENS);
  const L = lcm(big[1], small[1]);
  return make(
    unit,
    `${frj(big[0], big[1], "에서", "에서")} ${fr(small[0], small[1])}를 뺄 때 공통분모는 얼마입니까?`,
    n(L),
    `두 분모의 최소공배수는 ${n(L)}입니다.`,
  );
}

/** 문형 06 — 통분한 두 분자의 차. */
function sub153NumDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const { big, small } = twoProperFracs(rng, SUB_DENS);
  const L = lcm(big[1], small[1]);
  const diff = (big[0] * L) / big[1] - (small[0] * L) / small[1];
  return make(
    unit,
    `${frj(big[0], big[1], "에서", "에서")} ${fr(small[0], small[1])}를 최소공배수로 통분하여 뺄 때, 약분하기 전 분자의 차는 얼마입니까?`,
    n(diff),
    `통분한 분자는 ${n((big[0] * L) / big[1])}, ${n((small[0] * L) / small[1])}이므로 차는 ${n(diff)}입니다.`,
  );
}

/** 문형 07 — 차가 1/2보다 큰지 판정. */
function sub153VsHalf(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantBigger = altCase(rng);
  let big: [number, number] = [8, 9];
  let small: [number, number] = [1, 10];
  let num = 71;
  let den = 90;
  for (let k = 0; k < 40; k += 1) {
    const pair = twoProperFracs(rng, SUB_DENS);
    big = pair.big;
    small = pair.small;
    [num, den] = subFrac(big[0], big[1], small[0], small[1]);
    if (num * 2 > den === wantBigger) break;
  }
  if (num * 2 > den !== wantBigger) {
    if (wantBigger) {
      big = [8, 9];
      small = [1, 10];
    } else {
      big = [2, 9];
      small = [1, 8];
    }
    [num, den] = subFrac(big[0], big[1], small[0], small[1]);
  }
  const bigger = num * 2 > den;
  return make(
    unit,
    `${frj(big[0], big[1], "에서", "에서")} ${fr(small[0], small[1])}를 뺀 값은 ${fr(1, 2)}보다 큽니까? (예, 아니요)`,
    bigger ? "예" : "아니요",
    `차는 ${expr(fracLatex(num, den))}이므로 ${bigger ? "1/2보다 큽니다" : "1/2보다 크지 않습니다"}.`,
  );
}

/** 문형 08 — 1에서 진분수를 뺀 값. */
function sub153FromOne(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d] = properFrac(rng, SUB_DENS);
  const [num, den] = subFrac(1, 1, a, d);
  return make(
    unit,
    `${n(1)}에서 ${frj(a, d, "을", "를")} 빼면 얼마입니까?`,
    expr(fracLatex(num, den)),
    `${expr(`1-\\frac{${a}}{${d}}=${fracLatex(num, den)}`)}입니다.`,
  );
}

/** 문형 09 — 큰 쪽 분자의 통분값. */
function sub153BigNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const { big, small } = twoProperFracs(rng, SUB_DENS);
  const L = lcm(big[1], small[1]);
  return make(
    unit,
    `${frj(big[0], big[1], "에서", "에서")} ${fr(small[0], small[1])}를 뺄 때, 큰 쪽을 통분한 분자는 얼마입니까?`,
    n((big[0] * L) / big[1]),
    `공통분모는 ${n(L)}이므로 큰 쪽 분자는 ${n((big[0] * L) / big[1])}입니다.`,
  );
}

/** 문형 10 — 빼는 순서를 바꾸면 안 되는 이유 대신, 차 + 작은 쪽 = 큰 쪽 검산의 합. */
function sub153CheckSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const { big, small } = twoProperFracs(rng, SUB_DENS);
  return make(
    unit,
    `${frj(big[0], big[1], "에서", "에서")} ${fr(small[0], small[1])}를 뺀 값에 ${fr(small[0], small[1])}를 다시 더하면 얼마입니까?`,
    expr(fracLatex(big[0], big[1])),
    `뺀 값을 도로 더하면 처음 큰 쪽 ${expr(fracLatex(big[0], big[1]))}입니다.`,
  );
}

/* ── 1-5-4 대분수의 뺄셈 — 자연수부를 벌려 결과가 양수다 ── */

/** 연산 — 대분수끼리 뺀다(절차 한 번). */
function sub154Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const w1 = intBetween(rng, 3, 6);
  const w2 = intBetween(rng, 1, w1 - 2);
  const L = lcm(d1, d2);
  const [num, den] = subFrac(w1 * d1 + a, d1, w2 * d2 + b, d2);
  return make(
    unit,
    `계산하시오.  ${expr(`${mixedLatex(w1, a, d1)}-${mixedLatex(w2, b, d2)}`)}`,
    expr(fracLatex(num, den)),
    `${nro(L)} 통분한 뒤 자연수는 자연수끼리, 분수는 분수끼리 뺍니다. 분수 부분을 뺄 수 없으면 자연수에서 ${n(1)}을 받아내립니다. 답은 ${expr(fracLatex(num, den))}입니다.`,
  );
}

/** 기본 — 문장에서 식을 세운다(한 겹). 대분수에서 진분수를 뺀다. */
function sub154Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const w1 = intBetween(rng, 2, 5);
  const [num, den] = subFrac(w1 * d1 + a, d1, b, d2);
  const [thing, unitWord] = pick(rng, [
    ["철사", "m"],
    ["색 테이프", "m"],
    ["물", "L"],
    ["밀가루", "kg"],
  ] as const);
  return make(
    unit,
    `${thing} ${mx(w1, a, d1)} ${unitWord} 중에서 ${fr(b, d2)} ${uj(unitWord, "을", "를")} 썼습니다. 남은 ${wj(thing, "은", "는")} 몇 ${unitWord}입니까?`,
    expr(fracLatex(num, den)),
    `가진 양에서 쓴 양을 뺍니다. ${expr(`${mixedLatex(w1, a, d1)}-\\frac{${b}}{${d2}}=${fracLatex(num, den)}`)}이므로 ${expr(fracLatex(num, den))} ${unitWord}입니다.`,
  );
}

/** 응용 — 자연수에서 대분수를 뺀다(받아내림이 반드시 인다). */
function sub154Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [b, d2] = properFrac(rng, FRAC_DENS);
  const w2 = intBetween(rng, 1, 3);
  const whole = intBetween(rng, w2 + 1, w2 + 4);
  const [num, den] = subFrac(whole, 1, w2 * d2 + b, d2);
  return make(
    unit,
    `계산하시오.  ${expr(`${whole}-${mixedLatex(w2, b, d2)}`)}`,
    expr(fracLatex(num, den)),
    `자연수 ${nj(whole, "을", "를")} ${lro(`${whole - 1}\\frac{${d2}}{${d2}}`)} 바꾸어 뺍니다. ${expr(`${whole - 1}\\frac{${d2}}{${d2}}-${mixedLatex(w2, b, d2)}=${fracLatex(num, den)}`)}입니다.`,
  );
}

/** 심화 — **역산**: 뺀 결과에서 처음 양을 거슬러 구한다. */
function sub154Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const w1 = intBetween(rng, 3, 6);
  const w2 = intBetween(rng, 1, w1 - 2);
  const [rn, rd] = subFrac(w1 * d1 + a, d1, w2 * d2 + b, d2);
  return make(
    unit,
    `어떤 수에서 ${mxj(w2, b, d2, "을", "를")} 뺐더니 ${lj(fracLatex(rn, rd), "이", "가")} 되었습니다. 어떤 수를 구하시오.`,
    expr(fracLatex(w1 * d1 + a, d1)),
    `어떤 수는 결과에 뺀 수를 도로 더한 것입니다. ${expr(`${fracLatex(rn, rd)}+${mixedLatex(w2, b, d2)}=${fracLatex(w1 * d1 + a, d1)}`)}입니다.`,
  );
}

/** 문형 05 — 자연수부의 차. */
function sub154WholeDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const w1 = intBetween(rng, 3, 6);
  const w2 = intBetween(rng, 1, w1 - 2);
  return make(
    unit,
    `${mxj(w1, a, d1, "에서", "에서")} ${mxj(w2, b, d2, "을", "를")} 뺄 때, 받아내림을 하기 전 두 대분수의 자연수부끼리 뺀 값은 얼마입니까?`,
    n(w1 - w2),
    `${expr(`${w1}-${w2}=${w1 - w2}`)}입니다.`,
  );
}

/** 문형 06 — 가분수로 바꾼 두 분자의 차. */
function sub154ImpDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const w1 = intBetween(rng, 3, 6);
  const w2 = intBetween(rng, 1, w1 - 2);
  return make(
    unit,
    `${mxj(w1, a, d1, "과", "와")} ${mx(w2, b, d2)}를 각각 가분수로 바꿀 때, 두 분자의 차는 얼마입니까?`,
    n(w1 * d1 + a - (w2 * d2 + b)),
    `분자는 ${n(w1 * d1 + a)}, ${n(w2 * d2 + b)}이므로 차는 ${n(w1 * d1 + a - (w2 * d2 + b))}입니다.`,
  );
}

/** 문형 07 — 차의 자연수 부분. */
function sub154ResultWhole(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const w1 = intBetween(rng, 3, 6);
  const w2 = intBetween(rng, 1, w1 - 2);
  const [num, den] = subFrac(w1 * d1 + a, d1, w2 * d2 + b, d2);
  return make(
    unit,
    `${mxj(w1, a, d1, "에서", "에서")} ${mx(w2, b, d2)}를 뺀 값을 대분수로 나타낼 때 자연수 부분은 얼마입니까?`,
    n(Math.floor(num / den)),
    `차는 ${expr(fracLatex(num, den))}이므로 자연수 부분은 ${n(Math.floor(num / den))}입니다.`,
  );
}

/** 문형 08 — 받아내림이 필요한지. */
function sub154Borrow(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantBorrow = altCase(rng);
  let a = 1;
  let d1 = 5;
  let b = 3;
  let d2 = 4;
  for (let k = 0; k < 40; k += 1) {
    [a, d1] = properFrac(rng, FRAC_DENS);
    [b, d2] = properFrac(
      rng,
      FRAC_DENS.filter((x) => x !== d1),
    );
    const Ltry = lcm(d1, d2);
    if ((a * Ltry) / d1 < (b * Ltry) / d2 === wantBorrow) break;
  }
  const L = lcm(d1, d2);
  if ((a * L) / d1 < (b * L) / d2 !== wantBorrow) {
    if (wantBorrow) {
      a = 1;
      d1 = 5;
      b = 3;
      d2 = 4;
    } else {
      a = 3;
      d1 = 4;
      b = 1;
      d2 = 5;
    }
  }
  const w1 = intBetween(rng, 3, 6);
  const w2 = intBetween(rng, 1, w1 - 2);
  const L2 = lcm(d1, d2);
  const need = (a * L2) / d1 < (b * L2) / d2;
  return make(
    unit,
    `${mxj(w1, a, d1, "에서", "에서")} ${mx(w2, b, d2)}를 뺄 때 자연수에서 ${n(1)}을 받아내려야 합니까? (예, 아니요)`,
    need ? "예" : "아니요",
    `분수부를 통분하면 ${need ? "빼는 쪽이 더 커서 받아내립니다" : "그대로 뺄 수 있습니다"}.`,
  );
}

/** 문형 09 — 대분수를 가분수로 바꾼 분자. */
function sub154Improper(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const w1 = intBetween(rng, 2, 6);
  return make(
    unit,
    `${mxj(w1, a, d1, "을", "를")} 가분수로 나타내면 분자는 얼마입니까?`,
    n(w1 * d1 + a),
    `${expr(`${w1}\\times${d1}+${a}=${w1 * d1 + a}`)}입니다.`,
  );
}

/** 문형 10 — 차 + 빼는 수 = 처음 수. */
function sub154Check(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, d1] = properFrac(rng, FRAC_DENS);
  const [b, d2] = properFrac(
    rng,
    FRAC_DENS.filter((x) => x !== d1),
  );
  const w1 = intBetween(rng, 3, 6);
  const w2 = intBetween(rng, 1, w1 - 2);
  return make(
    unit,
    `${mxj(w1, a, d1, "에서", "에서")} ${mx(w2, b, d2)}를 뺀 값에 ${mx(w2, b, d2)}를 다시 더하면 얼마입니까?`,
    expr(fracLatex(w1 * d1 + a, d1)),
    `뺀 값을 도로 더하면 처음 수 ${expr(fracLatex(w1 * d1 + a, d1))}입니다.`,
  );
}

/* ────────── 2-1 수의 범위와 어림하기 — 난이도 4단 (D-72 확대 7차) ──────────
 *
 * **이 대단원의 알맹이는 «경계»다.** 두 자리가 조용히 틀린다:
 *
 * ㉠ **경계 포함/제외** — 「이상·이하」는 끝을 넣고 「초과·미만」은 뺀다. 후보에 경계값
 *    자신이 없으면 두 낱말이 **같은 답**을 내고, 낱말을 바꿔치기해도 아무도 모른다.
 *    그래서 2-1-1·2-1-2 는 **경계값을 반드시 목록에 넣는다**(구성 보장).
 *
 * ㉡ **뜻 없는 어림** — 어림할 수의 아래 자리가 이미 0이면 올림·버림·반올림이 전부
 *    그 수 자신이다. 정답은 «맞으니» 검산 가드가 조용하다(g6 의 「딱 떨어지면 반올림이
 *    뜻 없다」와 같은 자리). 그래서 어림 세 소단원은 **아래 자리가 0이 아님을 뽑는
 *    범위로 보장**하고, 반올림은 판정 자리가 4 이하·5 이상 **양쪽을 다 밟게** 한다.
 *
 * 역산 갈래는 어림값에서 **원래 수의 범위**를 되짚는다. 그때 ㉡ 의 구성 보장을
 * **정답 범위에는 절대 걸지 않는다** — 세 소단원의 끝 규칙이 다르고 둘은 끝값 자신이
 * 「어림이 뜻 없는 수」다. 올림 3500 → 3401~**3500**(위끝이 백의 배수) · 버림 3500 →
 * **3500**~3599(아래끝) · 반올림 3500 → 3450~3549. ㉡ 을 답에 걸면 3499 가 되어 **틀린다.**
 * 그래서 ㉡ 은 **낼 수를 뽑을 때만** 건다(2026-08-23 리드 지적).
 *
 * 소수 어림은 2-1-6 한 갈래뿐이다 — 근거는 구현 위험이 아니라 **소단원 이름**이다.
 * 2-1-6 이 「반올림 알아보기와 **어림의 활용**」이고 교과서의 소수 어림이 실리는 자리가
 * 거기다(값은 정수 스케일 `dec()` 를 거치므로 부동소수점 위험은 어차피 없다 —
 * 없는 위험을 근거로 적으면 다음 사람이 틀린 근거를 물려받는다).
 */

/** 자리 이름 — 어림 문항이 내거는 자리. */
const PLACES = [
  [10, "십"],
  [100, "백"],
  [1000, "천"],
] as const;

/**
 * 어림할 수 하나 — **그 자리 아래가 0이 아님**을 보장한다.
 * 아래가 0이면 올림·버림·반올림이 전부 제자리라 문항이 뜻을 잃는다.
 */
function roundTarget(rng: Rng, place: number): number {
  const high = intBetween(
    rng,
    place === 1000 ? 2 : 12,
    place === 1000 ? 9 : 87,
  );
  const below = intBetween(rng, 1, place - 1); // 1 이상 — 절대 0이 아니다
  return high * place + below;
}

/** 올림·버림·반올림 — 시험도 같은 뜻을 쓰지만 **제 손으로** 다시 센다. */
const ceilTo = (x: number, place: number): number =>
  Math.ceil(x / place) * place;
const floorTo = (x: number, place: number): number =>
  Math.floor(x / place) * place;
const roundTo = (x: number, place: number): number => {
  const digit = Math.floor((x % place) / (place / 10));
  return digit >= 5 ? ceilTo(x, place) : floorTo(x, place);
};

/**
 * 범위 문항의 생활 장면 — 표준(놀이기구·키)과 겹치지 않게 잡았다(R5).
 *
 * ⚠️ **주체·세는 말·값 범위를 장면에 딸린 값으로 묶는다.** 따로 뽑으면
 *    「**택배**에서 … **네 사람이** $18$ kg」처럼 사람 무게가 18kg 이 된다
 *    (2026-08-23 눈검사에서 실측 — g4 가 회송한 「색종이를 먹는다」와 같은 자리).
 *    `[장면, 조건 문구, 재는 것, 단위, 주체, 세는 말, 기준 하한, 기준 상한]`
 */
const RANGE_SCENES = [
  // 나이 장면의 주체는 «사람» — 위쪽 값이 기준 + 20 까지 열려 «어린이 $31$ 살» 이 나왔다(2026-10-20 교차 검수 2회차).
  ["박물관", "관람료를 할인받으려면", "나이", "살", "사람", "명", 8, 13],
  ["수영장", "어린이 요금을 내려면", "나이", "살", "사람", "명", 8, 13],
  ["택배 회사", "보통 요금으로 부치려면", "무게", "kg", "상자", "개", 5, 25],
  ["승강기", "한 번에 실으려면", "무게", "kg", "짐", "개", 5, 25],
] as const;

/* ── 2-1-1 이상과 이하 — 경계를 **포함**한다 ── */

/** 후보 목록 — 경계값 자신을 **반드시** 넣는다. 안 넣으면 이상↔초과가 같은 답을 낸다. */
function boundaryPool(rng: Rng, a: number, b: number): number[] {
  const inner = intBetween(rng, a + 1, b - 1);
  const below = a - intBetween(rng, 1, 4);
  const above = b + intBetween(rng, 1, 4);
  return shuffled(rng, [a, b, inner, below, above]);
}

/** 연산 — 목록에서 「a 이상」인 수를 고른다(경계 하나가 반드시 걸린다). */
function rng211Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 12, 60);
  const b = a + intBetween(rng, 6, 20);
  const pool = boundaryPool(rng, a, b);
  const hit = pool.filter((v) => v >= a);
  return make(
    unit,
    `${nums(pool)} 중에서 ${n(a)} 이상인 수를 모두 쓰시오.`,
    nums([...hit].sort((p, q) => p - q)),
    `${n(a)} 이상은 ${nj(a, "과", "와")} 같거나 큰 수이므로 ${n(a)} 자신도 들어갑니다.`,
  );
}

/** 기본 — 두 끝을 다 건다(이상이면서 이하). 경계 둘이 다 목록에 있다. */
function rng211Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 12, 60);
  const b = a + intBetween(rng, 6, 20);
  const pool = boundaryPool(rng, a, b);
  const hit = pool.filter((v) => v >= a && v <= b);
  return make(
    unit,
    `${nums(pool)} 중에서 ${n(a)} 이상 ${n(b)} 이하인 수를 모두 쓰시오.`,
    nums([...hit].sort((p, q) => p - q)),
    `양 끝인 ${nj(a, "과", "와")} ${nj(b, "이", "가")} 모두 들어갑니다.`,
  );
}

/** 응용 — 범위 안에서 조건을 하나 더 건다(두 단계). */
function rng211Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 10, 40) * 2; // 짝수 경계 — 경계가 조건에 실제로 걸린다
  const b = a + intBetween(rng, 8, 20);
  const evens: number[] = [];
  for (let v = a; v <= b; v += 1) if (v % 2 === 0) evens.push(v);
  return make(
    unit,
    `${n(a)} 이상 ${n(b)} 이하인 자연수 중에서 짝수는 모두 몇 개입니까?`,
    n(evens.length),
    `${n(a)} 이상 ${n(b)} 이하에는 양 끝이 다 들어가고, 그중 짝수는 ${nums(evens.slice(0, 3))} … 로 ${n(evens.length)}개입니다.`,
  );
}

/** 심화 — **역산**: 개수에서 끝 값을 거슬러 구한다. 경계를 포함하므로 b=a+개수−1 이다. */
function rng211Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 15, 70);
  const count = intBetween(rng, 5, 15);
  const b = a + count - 1;
  return make(
    unit,
    `${n(a)} 이상 □ 이하인 자연수가 모두 ${n(count)}개입니다. □에 알맞은 수를 구하시오.`,
    n(b),
    `양 끝을 모두 포함하므로 개수는 ${expr(`\\square-${a}+1`)}입니다. ${expr(`\\square-${a}+1=${count}`)}이므로 □는 ${n(b)}입니다.`,
  );
}

/** 문형 05 — 이하인 수의 개수. */
function rng211BelowCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 12, 60);
  const b = a + intBetween(rng, 6, 20);
  const pool = boundaryPool(rng, a, b);
  const hit = pool.filter((v) => v <= b);
  return make(
    unit,
    `${nums(pool)} 중에서 ${n(b)} 이하인 수는 모두 몇 개입니까?`,
    n(hit.length),
    `${n(b)} 이하는 ${nj(b, "과", "와")} 같거나 작은 수이므로 ${n(b)} 자신도 셉니다. ${n(hit.length)}개입니다.`,
  );
}

/** 문형 06 — 이상인 수 중 가장 작은 수(경계). */
function rng211MinAbove(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 12, 60);
  return make(
    unit,
    `${n(a)} 이상인 자연수 중에서 가장 작은 수는 얼마입니까?`,
    n(a),
    `이상은 그 수를 포함하므로 가장 작은 수는 ${n(a)}입니다.`,
  );
}

/** 문형 07 — 이상인 수 중 가장 큰 수. */
function rng211MaxAbove(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 12, 60);
  const b = a + intBetween(rng, 6, 20);
  const pool = boundaryPool(rng, a, b);
  const hit = pool.filter((v) => v >= a);
  const mx = Math.max(...hit);
  return make(
    unit,
    `${nums(pool)} 중에서 ${n(a)} 이상인 수 중 가장 큰 수를 구하시오.`,
    n(mx),
    `${n(a)} 이상인 수 가운데 가장 큰 수는 ${n(mx)}입니다.`,
  );
}

/** 문형 08 — 경계가 포함되는지 판정. */
function rng211Includes(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantYes = altCase(rng);
  const a = intBetween(rng, 12, 60);
  const k = wantYes ? a : a - 1;
  const yes = k >= a;
  return make(
    unit,
    `${n(a)} 이상인 자연수에 ${nj(k, "이", "가")} 들어갑니까? (예, 아니요)`,
    yes ? "예" : "아니요",
    yes
      ? `이상은 그 수를 포함하므로 들어갑니다.`
      : `${n(k)}은 ${n(a)}보다 작으므로 들어가지 않습니다.`,
  );
}

/** 문형 09 — 이상·이하 구간의 자연수 개수. */
function rng211RangeCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 10, 40);
  const b = a + intBetween(rng, 5, 15);
  return make(
    unit,
    `${n(a)} 이상 ${n(b)} 이하인 자연수는 모두 몇 개입니까?`,
    n(b - a + 1),
    `양 끝을 포함하므로 ${expr(`${b}-${a}+1=${b - a + 1}`)}개입니다.`,
  );
}

/** 문형 10 — 이상·이하 구간에서 3의 배수 개수. */
function rng211Mult3(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 10, 40);
  const b = a + intBetween(rng, 8, 18);
  let c = 0;
  for (let v = a; v <= b; v += 1) if (v % 3 === 0) c += 1;
  return make(
    unit,
    `${n(a)} 이상 ${n(b)} 이하인 자연수 중에서 ${n(3)}의 배수는 모두 몇 개입니까?`,
    n(c),
    `${n(a)}부터 ${n(b)}까지 ${n(3)}의 배수를 세면 ${n(c)}개입니다.`,
  );
}

/* ── 2-1-2 초과와 미만 — 경계를 **뺀다**. 2-1-1 과 같은 목록으로 답이 갈린다 ── */

/** 연산 — 목록에서 「a 초과」인 수를 고른다(경계 a 는 빠진다). */
function rng212Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 12, 60);
  const b = a + intBetween(rng, 6, 20);
  const pool = boundaryPool(rng, a, b);
  const hit = pool.filter((v) => v > a);
  return make(
    unit,
    `${nums(pool)} 중에서 ${n(a)} 초과인 수를 모두 쓰시오.`,
    nums([...hit].sort((p, q) => p - q)),
    `${n(a)} 초과는 ${nj(a, "보다", "보다")} 큰 수이므로 ${n(a)} 자신은 들어가지 않습니다.`,
  );
}

/** 기본 — 두 끝을 다 뺀다(초과이면서 미만). */
function rng212Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 12, 60);
  const b = a + intBetween(rng, 6, 20);
  const pool = boundaryPool(rng, a, b);
  const hit = pool.filter((v) => v > a && v < b);
  return make(
    unit,
    `${nums(pool)} 중에서 ${n(a)} 초과 ${n(b)} 미만인 수를 모두 쓰시오.`,
    nums([...hit].sort((p, q) => p - q)),
    `양 끝인 ${nj(a, "과", "와")} ${nj(b, "은", "는")} 들어가지 않습니다.`,
  );
}

/** 응용 — 같은 두 수를 «이상·이하»로도 «초과·미만»으로도 세어 **차이**를 묻는다. */
function rng212Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 15, 60);
  const b = a + intBetween(rng, 8, 20);
  const openCount = b - a - 1;
  return make(
    unit,
    `${n(a)} 초과 ${n(b)} 미만인 자연수는 모두 몇 개입니까?`,
    n(openCount),
    `${nj(a, "과", "와")} ${nj(b, "을", "를")} 빼야 하므로 ${expr(`${b}-${a}-1=${openCount}`)}개입니다.`,
  );
}

/** 심화 — **역산** + 두 표현 바꿔 쓰기. 자연수에서 「a 초과」는 「a+1 이상」이다. */
function rng212Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 15, 70);
  const count = intBetween(rng, 5, 15);
  const b = a + count + 1;
  return make(
    unit,
    `${n(a)} 초과 □ 미만인 자연수가 모두 ${n(count)}개입니다. □에 알맞은 수를 구하시오.`,
    n(b),
    `양 끝을 빼므로 개수는 ${expr(`\\square-${a}-1`)}입니다. ${expr(`\\square-${a}-1=${count}`)}이므로 □는 ${n(b)}입니다.`,
  );
}

/** 문형 05 — 초과인 수 중 가장 작은 수. */
function rng212MinOver(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 12, 60);
  return make(
    unit,
    `${n(a)} 초과인 자연수 중에서 가장 작은 수는 얼마입니까?`,
    n(a + 1),
    `초과는 그 수를 빼므로 가장 작은 수는 ${n(a + 1)}입니다.`,
  );
}

/** 문형 06 — 미만인 수 중 가장 큰 수. */
function rng212MaxUnder(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 20, 80);
  return make(
    unit,
    `${n(b)} 미만인 자연수 중에서 가장 큰 수는 얼마입니까?`,
    n(b - 1),
    `미만은 그 수를 빼므로 가장 큰 수는 ${n(b - 1)}입니다.`,
  );
}

/** 문형 07 — 경계가 빠지는지 판정. */
function rng212Excludes(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantYes = altCase4(rng);
  const a = intBetween(rng, 12, 60);
  const k = wantYes ? a + 1 : a;
  const yes = k > a;
  return make(
    unit,
    `${n(a)} 초과인 자연수에 ${nj(k, "이", "가")} 들어갑니까? (예, 아니요)`,
    yes ? "예" : "아니요",
    yes
      ? `${n(k)}은 ${n(a)}보다 크므로 들어갑니다.`
      : `초과는 그 수를 빼므로 들어가지 않습니다.`,
  );
}

/** 문형 08 — 이상·이하 개수와 초과·미만 개수의 차(늘 2). */
function rng212Gap(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 15, 50);
  const b = a + intBetween(rng, 8, 20);
  return make(
    unit,
    `${n(a)} 이상 ${n(b)} 이하인 자연수의 개수와 ${n(a)} 초과 ${n(b)} 미만인 자연수의 개수의 차는 얼마입니까?`,
    n(2),
    `양 끝 두 개가 빠지므로 차는 ${n(2)}입니다.`,
  );
}

/** 문형 09 — 목록에서 미만인 수의 개수. */
function rng212UnderCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 12, 60);
  const b = a + intBetween(rng, 6, 20);
  const pool = boundaryPool(rng, a, b);
  const hit = pool.filter((v) => v < b);
  return make(
    unit,
    `${nums(pool)} 중에서 ${n(b)} 미만인 수는 모두 몇 개입니까?`,
    n(hit.length),
    `${n(b)} 자신은 빼고 세면 ${n(hit.length)}개입니다.`,
  );
}

/** 문형 10 — 초과·미만 구간에서 짝수 개수. */
function rng212EvenOpen(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 10, 40) * 2;
  const b = a + intBetween(rng, 8, 20);
  let c = 0;
  for (let v = a + 1; v < b; v += 1) if (v % 2 === 0) c += 1;
  return make(
    unit,
    `${n(a)} 초과 ${n(b)} 미만인 자연수 중에서 짝수는 모두 몇 개입니까?`,
    n(c),
    `양 끝을 빼고 짝수를 세면 ${n(c)}개입니다.`,
  );
}

/* ── 2-1-3 수의 범위를 알고 문제 해결하기 — 생활 장면(표준의 놀이기구와 다르다) ── */

/** 장면 하나 + 값 넷 — 경계값 자신이 **반드시** 목록에 든다(이상↔초과가 갈리게). */
function rangeScene(rng: Rng): {
  head: string;
  what: string;
  unitName: string;
  who: string;
  countUnit: string;
  limit: number;
  values: number[];
} {
  const [place, cond, what, unitName, who, countUnit, lo, hi] = pick(
    rng,
    RANGE_SCENES,
  );
  const limit = intBetween(rng, lo, hi);
  // 답의 폭은 **후보 수**가 정한다. 수를 넷으로 고정하고 아래 개수만 1~2 로 가르면
  // 답이 «2종»뿐이다(이상 = 4−below → {2,3} · 초과 = 3−below → {1,2}) — 학생이
  // 보기도 전에 둘 중 하나다. 게다가 「상수답이 아니다」 시험은 그것을 **통과시킨다**
  // (2026-08-23 리드 검수 실측 최빈 51.4%). 그래서 **후보 수 자체를 갈랐다.**
  const total = intBetween(rng, 4, 6);
  const below = intBetween(rng, 1, total - 2); // 경계값 위가 적어도 하나 남는다
  // ⚠️ 아래 값은 **1 이상**이어야 한다 — 나이도 무게도 0이나 음수일 수 없다.
  //    기준에서 빼 나가면 기준이 작을 때 「무게 $-7$ kg」이 나온다(2026-08-23 실측).
  //    그래서 [1, 기준−1] 에서 **서로 다른 값**을 골라 온다. 기준 하한(5·8)이
  //    `below` 상한(4)보다 크므로 고를 것이 언제나 넉넉하다.
  const lowPool: number[] = [];
  for (let v = Math.max(1, limit - 12); v < limit; v += 1) lowPool.push(v);
  const highPool: number[] = [];
  for (let v = limit + 1; v <= limit + 20; v += 1) highPool.push(v);
  const rest = [
    ...pickSome(rng, lowPool, below),
    ...pickSome(rng, highPool, total - 1 - below),
  ];
  const values = shuffled(rng, [
    limit, // 경계값 자신 — 이 하나가 두 낱말의 답을 가른다
    ...rest,
  ]);
  return {
    head: `${place}에서 ${cond} ${wj(what, "이", "가")}`,
    what,
    unitName,
    who,
    countUnit,
    limit,
    values,
  };
}

/** 연산 — 기준 «이상»인 것을 센다. 경계값이 반드시 하나 있어 이상/초과가 갈린다. */
function rng213Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = rangeScene(rng);
  const ok = s.values.filter((v) => v >= s.limit);
  return make(
    unit,
    `${s.head} ${n(s.limit)} ${s.unitName} 이상이어야 합니다. ${s.who} ${n(s.values.length)}${s.countUnit}의 ${wj(s.what, "이", "가")} ${nums(s.values)} ${s.unitName}일 때 조건에 맞는 ${wj(s.who, "은", "는")} 몇 ${s.countUnit}입니까?`,
    n(ok.length),
    `${n(s.limit)} ${s.unitName}인 것도 «이상»에 들어갑니다. 맞는 것은 ${nums([...ok].sort((p, q) => p - q))} ${uro(s.unitName)} ${n(ok.length)}${s.countUnit}입니다.`,
  );
}

/** 기본 — «초과» 로 물어 경계값 하나가 빠진다(연산과 답이 갈린다). */
function rng213Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = rangeScene(rng);
  const ok = s.values.filter((v) => v > s.limit);
  return make(
    unit,
    `${s.head} ${n(s.limit)} ${s.unitName} 초과여야 합니다. ${s.who} ${n(s.values.length)}${s.countUnit}의 ${wj(s.what, "이", "가")} ${nums(s.values)} ${s.unitName}일 때 조건에 맞는 ${wj(s.who, "은", "는")} 몇 ${s.countUnit}입니까?`,
    n(ok.length),
    `${n(s.limit)} ${s.unitName}인 것은 «초과»에 들어가지 않습니다. 맞는 것은 ${nums([...ok].sort((p, q) => p - q))} ${uro(s.unitName)} ${n(ok.length)}${s.countUnit}입니다.`,
  );
}

/** 응용 — 요금 구간표를 읽는다(두 단계: 구간 찾기 → 값 읽기). */
function rng213Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const edge1 = intBetween(rng, 3, 6);
  const edge2 = edge1 + intBetween(rng, 3, 6);
  const fee1 = intBetween(rng, 2, 4) * 1000;
  const fee2 = fee1 + intBetween(rng, 1, 3) * 1000;
  const fee3 = fee2 + intBetween(rng, 1, 3) * 1000;
  // 무게를 **경계값 자신**으로 두어 「이하」가 실제로 갈라 준다.
  const w = pick(rng, [edge1, edge2, intBetween(rng, edge2 + 1, edge2 + 5)]);
  const fee = w <= edge1 ? fee1 : w <= edge2 ? fee2 : fee3;
  return make(
    unit,
    `택배 요금은 무게가 ${n(edge1)} kg 이하이면 ${n(fee1)}원, ${n(edge1)} kg 초과 ${n(edge2)} kg 이하이면 ${n(fee2)}원, ${n(edge2)} kg 초과이면 ${n(fee3)}원입니다. 무게가 ${n(w)} kg인 물건의 요금은 얼마입니까?`,
    n(fee),
    `${n(w)} kg은 ${w <= edge1 ? `${n(edge1)} kg 이하` : w <= edge2 ? `${n(edge1)} kg 초과 ${n(edge2)} kg 이하` : `${n(edge2)} kg 초과`} 구간이므로 ${n(fee)}원입니다.`,
  );
}

/** 심화 — **역산**: 요금에서 무게의 범위를 거슬러 말한다. */
function rng213Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const edge1 = intBetween(rng, 3, 6);
  const edge2 = edge1 + intBetween(rng, 3, 6);
  const fee1 = intBetween(rng, 2, 4) * 1000;
  const fee2 = fee1 + intBetween(rng, 1, 3) * 1000;
  return make(
    unit,
    `택배 요금은 무게가 ${n(edge1)} kg 이하이면 ${n(fee1)}원, ${n(edge1)} kg 초과 ${n(edge2)} kg 이하이면 ${n(fee2)}원입니다. 요금이 ${n(fee2)}원이었을 때, 무게가 될 수 있는 가장 큰 자연수는 몇 kg입니까?`,
    n(edge2),
    `${n(fee2)}원 구간은 ${n(edge1)} kg 초과 ${n(edge2)} kg 이하이고, «이하»는 끝을 포함하므로 가장 큰 자연수는 ${n(edge2)} kg입니다.`,
  );
}

/** 문형 05 — 조건에 안 맞는 사람 수. */
function rng213Fail(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = rangeScene(rng);
  const fail = s.values.filter((v) => v < s.limit);
  return make(
    unit,
    `${s.head} ${n(s.limit)} ${s.unitName} 이상이어야 합니다. ${s.who} ${n(s.values.length)}${s.countUnit}의 ${wj(s.what, "이", "가")} ${nums(s.values)} ${s.unitName}일 때 조건에 맞지 않는 ${wj(s.who, "은", "는")} 몇 ${s.countUnit}입니까?`,
    n(fail.length),
    `${n(s.limit)} ${s.unitName}보다 작은 것을 세면 ${n(fail.length)}${s.countUnit}입니다.`,
  );
}

/** 문형 06 — 이상과 초과의 개수 차(경계 하나). */
function rng213Diff(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = rangeScene(rng);
  const ge = s.values.filter((v) => v >= s.limit).length;
  const gt = s.values.filter((v) => v > s.limit).length;
  return make(
    unit,
    `${s.head} ${n(s.limit)} ${s.unitName} 이상인 ${s.who}의 수와 ${n(s.limit)} ${s.unitName} 초과인 ${s.who}의 수의 차는 얼마입니까?`,
    n(ge - gt),
    `경계값 ${n(s.limit)}이 이상에만 들어가므로 차는 ${n(ge - gt)}입니다.`,
  );
}

/** 문형 07 — 가장 작은 합격 값. */
function rng213MinPass(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = rangeScene(rng);
  const ok = s.values.filter((v) => v >= s.limit);
  const mn = Math.min(...ok);
  return make(
    unit,
    `${s.head} ${n(s.limit)} ${s.unitName} 이상이어야 합니다. ${s.who}의 ${wj(s.what, "이", "가")} ${nums(s.values)} ${s.unitName}일 때, 조건에 맞는 ${s.what} 중 가장 작은 값은 얼마입니까?`,
    n(mn),
    `${n(s.limit)} 이상인 값 중 가장 작은 것은 ${n(mn)}입니다.`,
  );
}

/** 문형 08 — 무게가 첫 경계일 때 요금. */
function rng213EdgeFee(unit: UnitSeed, rng: Rng): ElemProblem {
  const edge1 = intBetween(rng, 3, 6);
  const edge2 = edge1 + intBetween(rng, 3, 6);
  const fee1 = intBetween(rng, 2, 4) * 1000;
  const fee2 = fee1 + intBetween(rng, 1, 3) * 1000;
  const fee3 = fee2 + 1000;
  return make(
    unit,
    `택배 요금은 무게가 ${n(edge1)} kg 이하이면 ${n(fee1)}원, ${n(edge1)} kg 초과 ${n(edge2)} kg 이하이면 ${n(fee2)}원, ${n(edge2)} kg 초과이면 ${n(fee3)}원입니다. 무게가 정확히 ${n(edge1)} kg일 때 요금은 얼마입니까?`,
    n(fee1),
    `${n(edge1)} kg은 «이하»에 들어가므로 ${n(fee1)}원입니다.`,
  );
}

/** 문형 09 — 가장 비싼 구간이 되는 가장 작은 무게. */
function rng213MinHeavy(unit: UnitSeed, rng: Rng): ElemProblem {
  const edge1 = intBetween(rng, 3, 6);
  const edge2 = edge1 + intBetween(rng, 3, 6);
  const fee1 = 2000;
  const fee2 = 3000;
  const fee3 = 4000;
  return make(
    unit,
    `택배 요금은 ${n(edge1)} kg 이하 ${n(fee1)}원, ${n(edge1)} kg 초과 ${n(edge2)} kg 이하 ${n(fee2)}원, ${n(edge2)} kg 초과 ${n(fee3)}원입니다. 가장 비싼 요금이 되려면 무게는 적어도 몇 kg이어야 합니까?`,
    n(edge2 + 1),
    `${n(edge2)} kg 초과부터 ${n(fee3)}원이므로 가장 작은 자연수는 ${n(edge2 + 1)} kg입니다.`,
  );
}

/** 문형 10 — 목록에서 가장 큰 값. */
function rng213MaxVal(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = rangeScene(rng);
  const mx = Math.max(...s.values);
  return make(
    unit,
    `${s.who} ${n(s.values.length)}${s.countUnit}의 ${wj(s.what, "이", "가")} ${nums(s.values)} ${s.unitName}입니다. 이 중 가장 큰 값은 얼마입니까?`,
    n(mx),
    `가장 큰 값은 ${n(mx)}입니다.`,
  );
}

/* ── 2-1-4 올림 — 아래 자리가 0이 아님을 구성이 보장한다 ── */

/** 연산 — 지정 자리까지 올림(절차 한 번). */
function up214Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [place, placeName] = pick(rng, PLACES);
  const x = roundTarget(rng, place);
  const up = ceilTo(x, place);
  return make(
    unit,
    `${nj(x, "을", "를")} 올림하여 ${placeName}의 자리까지 나타내시오.`,
    n(up),
    `${placeName}의 자리 아래가 ${nj(0, "이", "가")} 아니므로 올립니다. 답은 ${n(up)}입니다.`,
  );
}

/** 기본 — 생활 장면에서 스스로 «올림»을 고른다(남으면 하나 더 필요하다). */
function up214Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const per = pick(rng, [10, 100]);
  const boxes = intBetween(rng, 12, 48);
  const left = intBetween(rng, 1, per - 1); // 반드시 남는다 — 올림이 뜻을 가진다
  const total = boxes * per + left;
  // 세는 말(개·장)을 소재에 **딸린 값**으로 묶는다 — 따로 두면 「사탕 2540장」이 나온다.
  const [thing, counter, box] = pick(rng, [
    ["귤", "개", "상자"],
    ["공책", "권", "묶음"],
    ["빵", "개", "봉지"],
    ["색종이", "장", "묶음"],
  ] as const);
  return make(
    unit,
    // ⚠️ **세는 말 뒤 조사도 계산해야 한다.** 소재에 딸린 값이라 씨앗마다 바뀌는데
    //    조사를 손으로 박아 두면 「색종이 $278$장**를**」·「$8$장**가**」가 그대로
    //    지면에 나간다(장 ㅇ받침 · 권 ㄴ받침 → 을/이). 실측 92자리가 어긋나 있었다
    //    (2026-08-23 g3 적발). `wj` 가 한글에서 받침을 **계산**한다 — 손 표를 쓰지 말 것.
    `${thing} ${n(total)}${wj(counter, "을", "를")} 한 ${box}에 ${n(per)}${counter}씩 담으려고 합니다. ${wj(thing, "을", "를")} 모두 담으려면 ${wj(box, "은", "는")} 적어도 몇 개 필요합니까?`,
    n(boxes + 1),
    `${n(per)}${counter}씩 ${n(boxes)}${box}에 담으면 ${n(left)}${wj(counter, "이", "가")} 남고, 남은 것도 담아야 하므로 ${wj(box, "이", "가")} 하나 더 필요합니다. 올림하여 ${n(boxes + 1)}${box}입니다.`,
  );
}

/** 응용 — 올림한 값과 원래 수의 **차**를 묻는다(두 걸음). */
function up214Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [place, placeName] = pick(rng, PLACES);
  const x = roundTarget(rng, place);
  const up = ceilTo(x, place);
  return make(
    unit,
    `${nj(x, "을", "를")} 올림하여 ${placeName}의 자리까지 나타낸 수와 원래 수의 차를 구하시오.`,
    n(up - x),
    `올림하면 ${n(up)}이므로 차는 ${expr(`${up}-${x}=${up - x}`)}입니다.`,
  );
}

/** 심화 — **역산**: 올림값에서 원래 수의 범위를 되짚는다. */
function up214Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [place, placeName] = pick(rng, PLACES);
  const up =
    intBetween(rng, place === 1000 ? 3 : 13, place === 1000 ? 9 : 87) * place;
  return make(
    unit,
    `어떤 자연수를 올림하여 ${placeName}의 자리까지 나타냈더니 ${nj(up, "이", "가")} 되었습니다. 어떤 수가 될 수 있는 가장 작은 수와 가장 큰 수를 차례로 쓰시오.`,
    nums([up - place + 1, up]),
    `올림하여 ${n(up)}이 되려면 ${n(up - place)}보다 크고 ${n(up)}보다 작거나 같아야 합니다. 가장 작은 수는 ${n(up - place + 1)}, 가장 큰 수는 ${n(up)}입니다.`,
  );
}

/** 문형 05 — 천의 자리까지 올림. */
function up214Thousands(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = roundTarget(rng, 1000);
  const up = ceilTo(x, 1000);
  return make(
    unit,
    `${nj(x, "을", "를")} 올림하여 천의 자리까지 나타내시오.`,
    n(up),
    `천의 자리 아래가 0이 아니므로 올리면 ${n(up)}입니다.`,
  );
}

/** 문형 06 — 올림값에서 원래 수를 뺀 차(응용과 같지만 백의 자리만). */
function up214HundredDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = roundTarget(rng, 100);
  const up = ceilTo(x, 100);
  return make(
    unit,
    `${nj(x, "을", "를")} 올림하여 백의 자리까지 나타낸 수와 처음 수의 차는 얼마입니까?`,
    n(up - x),
    `올림하면 ${n(up)}이므로 ${expr(`${up}-${x}=${up - x}`)}만큼 더해집니다.`,
  );
}

/** 문형 07 — 일의 자리 숫자. */
function up214Ones(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = roundTarget(rng, 10);
  return make(
    unit,
    `${nj(x, "을", "를")} 올림하여 십의 자리까지 나타내려면, 일의 자리 숫자를 먼저 봅니다. 일의 자리 숫자는 얼마입니까?`,
    n(x % 10),
    `${n(x)}의 일의 자리 숫자는 ${n(x % 10)}입니다.`,
  );
}

/** 문형 08 — 가장 작은 원래 수. */
function up214MinOrig(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = 100;
  const up = intBetween(rng, 13, 87) * place;
  return make(
    unit,
    `어떤 자연수를 올림하여 백의 자리까지 나타냈더니 ${nj(up, "이", "가")} 되었습니다. 어떤 수가 될 수 있는 가장 작은 수는 얼마입니까?`,
    n(up - place + 1),
    `${n(up - 100)}보다 커야 하므로 가장 작은 수는 ${n(up - 99)}입니다.`,
  );
}

/** 문형 09 — 가장 큰 원래 수. */
function up214MaxOrig(unit: UnitSeed, rng: Rng): ElemProblem {
  const place = 100;
  const up = intBetween(rng, 13, 87) * place;
  return make(
    unit,
    `어떤 자연수를 올림하여 백의 자리까지 나타냈더니 ${nj(up, "이", "가")} 되었습니다. 어떤 수가 될 수 있는 가장 큰 수는 얼마입니까?`,
    n(up),
    `올림하여 ${n(up)}이 되는 가장 큰 수는 ${n(up)} 자신입니다.`,
  );
}

/** 문형 10 — 올림한 뒤 천의 자리 숫자. */
function up214ThouDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = roundTarget(rng, 100);
  const up = ceilTo(x, 100);
  const digit = Math.floor(up / 1000) % 10;
  return make(
    unit,
    `${nj(x, "을", "를")} 올림하여 백의 자리까지 나타낸 수의 천의 자리 숫자는 얼마입니까?`,
    n(digit),
    `올림하면 ${n(up)}이고 천의 자리 숫자는 ${n(digit)}입니다.`,
  );
}

/* ── 2-1-5 버림 ── */

/** 연산 — 지정 자리까지 버림(절차 한 번). */
function down215Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [place, placeName] = pick(rng, PLACES);
  const x = roundTarget(rng, place);
  const down = floorTo(x, place);
  return make(
    unit,
    `${nj(x, "을", "를")} 버림하여 ${placeName}의 자리까지 나타내시오.`,
    n(down),
    `${placeName}의 자리 아래 수를 모두 버립니다. 답은 ${n(down)}입니다.`,
  );
}

/** 기본 — 생활 장면에서 스스로 «버림»을 고른다(남는 것은 못 쓴다). */
function down215Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const per = pick(rng, [10, 100]);
  const bundles = intBetween(rng, 12, 48);
  const left = intBetween(rng, 1, per - 1);
  const total = bundles * per + left;
  const [thing, counter, box] = pick(rng, [
    ["색종이", "장", "묶음"],
    ["구슬", "개", "봉지"],
    ["사탕", "개", "봉지"],
    ["연필", "자루", "묶음"],
  ] as const);
  return make(
    unit,
    // ⚠️ 세는 말(`counter`)도 담는 말(`box`)도 씨앗마다 받침이 갈린다 — 조사를 손으로
    //    박으면 「$278$장**를**」·「$14$봉지**을**」·「$8$장**가**」가 나간다. 전부 계산한다.
    `${thing} ${n(total)}${wj(counter, "을", "를")} 한 ${box}에 ${n(per)}${counter}씩 담아 팔려고 합니다. 팔 수 있는 ${wj(thing, "은", "는")} 모두 몇 ${counter}입니까?`,
    n(bundles * per),
    `${n(per)}${counter}씩 ${n(bundles)}${wj(box, "을", "를")} 담으면 ${n(left)}${wj(counter, "이", "가")} 남고, 남은 것은 팔 수 없습니다. 버림하여 ${expr(`${bundles}\\times${per}=${bundles * per}`)}${counter}입니다.`,
  );
}

/** 응용 — 버린 만큼을 묻는다(두 걸음). */
function down215Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [place, placeName] = pick(rng, PLACES);
  const x = roundTarget(rng, place);
  const down = floorTo(x, place);
  return make(
    unit,
    `${nj(x, "을", "를")} 버림하여 ${placeName}의 자리까지 나타낼 때 버려지는 수는 얼마입니까?`,
    n(x - down),
    `버림하면 ${n(down)}이므로 버려지는 수는 ${expr(`${x}-${down}=${x - down}`)}입니다.`,
  );
}

/**
 * 심화 — **조건 조합**. 2-1-4·2-1-6 심화가 이미 역산이라 셋이 같은 모양이 되지 않게
 * 여기만 두 어림을 겹친다(원장님 다양성 원칙, 2026-08-23 리드 지적).
 *
 * 올림 결과 `u` = 버림 결과 `d` + place 인 짝만 쓴다 — 그래야 **두 조건이 둘 다 답을
 * 깎는다**(올림 조건: d+1 이상 u 이하 · 버림 조건: d 이상 u−1 이하 → 겹치면 d+1 ~ u−1).
 * 조건 하나가 놀면 그 자리를 지우는 변이가 안 잡힌다.
 */
function down215Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [place, placeName] = pick(rng, PLACES);
  const d =
    intBetween(rng, place === 1000 ? 3 : 13, place === 1000 ? 8 : 86) * place;
  const u = d + place;
  return make(
    unit,
    `어떤 자연수를 올림하여 ${placeName}의 자리까지 나타내면 ${nj(u, "이", "가")} 되고, 버림하여 ${placeName}의 자리까지 나타내면 ${nj(d, "이", "가")} 됩니다. 어떤 수가 될 수 있는 가장 작은 수와 가장 큰 수를 차례로 쓰시오.`,
    nums([d + 1, u - 1]),
    `올림하여 ${n(u)}이 되려면 ${n(d)}보다 크고 ${n(u)}보다 작거나 같아야 하고, 버림하여 ${n(d)}이 되려면 ${n(d)}보다 크거나 같고 ${n(u)}보다 작아야 합니다. 두 조건을 함께 만족하는 수는 ${n(d + 1)}부터 ${n(u - 1)}까지입니다.`,
  );
}

/** 문형 05 — 천의 자리까지 버림. */
function down215Thousands(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = roundTarget(rng, 1000);
  const down = floorTo(x, 1000);
  return make(
    unit,
    `${nj(x, "을", "를")} 버림하여 천의 자리까지 나타내시오.`,
    n(down),
    `천의 자리 아래를 버리면 ${n(down)}입니다.`,
  );
}

/** 문형 06 — 백의 자리까지 버릴 때 버려지는 수. */
function down215HundredDrop(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = roundTarget(rng, 100);
  const down = floorTo(x, 100);
  return make(
    unit,
    `${nj(x, "을", "를")} 버림하여 백의 자리까지 나타낼 때 버려지는 수는 얼마입니까?`,
    n(x - down),
    `버림하면 ${n(down)}이므로 버려지는 수는 ${n(x - down)}입니다.`,
  );
}

/** 문형 07 — 일의 자리 숫자. */
function down215Ones(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = roundTarget(rng, 10);
  return make(
    unit,
    `${n(x)}의 일의 자리 숫자는 얼마입니까?`,
    n(x % 10),
    `${n(x)}의 일의 자리 숫자는 ${n(x % 10)}입니다.`,
  );
}

/** 문형 08 — 버림하여 백의 자리까지 한 값. */
function down215Hundreds(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = roundTarget(rng, 100);
  const down = floorTo(x, 100);
  return make(
    unit,
    `${nj(x, "을", "를")} 버림하여 백의 자리까지 나타내시오.`,
    n(down),
    `백의 자리 아래를 버리면 ${n(down)}입니다.`,
  );
}

/** 문형 09 — 가장 작은 원래 수(버림값 d). */
function down215MinOrig(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 13, 86) * 100;
  return make(
    unit,
    `어떤 자연수를 버림하여 백의 자리까지 나타냈더니 ${nj(d, "이", "가")} 되었습니다. 어떤 수가 될 수 있는 가장 작은 수는 얼마입니까?`,
    n(d),
    `버림하여 ${n(d)}이 되는 가장 작은 수는 ${n(d)} 자신입니다.`,
  );
}

/** 문형 10 — 가장 큰 원래 수. */
function down215MaxOrig(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 13, 86) * 100;
  return make(
    unit,
    `어떤 자연수를 버림하여 백의 자리까지 나타냈더니 ${nj(d, "이", "가")} 되었습니다. 어떤 수가 될 수 있는 가장 큰 수는 얼마입니까?`,
    n(d + 99),
    `${n(d + 100)} 직전까지이므로 가장 큰 수는 ${n(d + 99)}입니다.`,
  );
}

/* ── 2-1-6 반올림 — 판정 자리가 4 이하·5 이상 양쪽을 다 밟는다 ── */

/** 연산 — 지정 자리까지 반올림(절차 한 번). */
function round216Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [place, placeName] = pick(rng, PLACES);
  const x = roundTarget(rng, place);
  const digit = Math.floor((x % place) / (place / 10));
  const r = roundTo(x, place);
  return make(
    unit,
    `${nj(x, "을", "를")} 반올림하여 ${placeName}의 자리까지 나타내시오.`,
    n(r),
    `바로 아래 자리 숫자가 ${n(digit)}이므로 ${digit >= 5 ? "올립니다" : "버립니다"}. 답은 ${n(r)}입니다.`,
  );
}

/** 기본 — 소수 첫째 자리까지 반올림. 값은 **정수 스케일**로만 다룬다(부동소수점 금지). */
function round216Read(unit: UnitSeed, rng: Rng): ElemProblem {
  // 백분의 일 정수로 잰다. 둘째 자리가 0이면 반올림이 뜻을 잃으므로 1 이상만 뽑는다.
  const whole = intBetween(rng, 1, 9);
  const hundredth = intBetween(rng, 1, 9);
  // ⚠️ **답의 소수 첫째 자리가 0이 되면 안 된다.** `dec` 가 꼬리 0 을 잘라 내므로
  //    「소수 첫째 자리까지」라고 물어 놓고 답이 정수로 나온다(`1.02` → `1`).
  //    「$1.0$」이라 쓸 수도 없다(꼬리 0 금지 규약). 그러니 **구성으로 안 뽑는다** —
  //    올릴 때 9(→10)와 버릴 때 0 을 빼면 첫째 자리가 언제나 1~9 다.
  //    (2026-08-23 리드 검수 실측 10.1%. g6 이 초6 2-2-4 에서 막은 그 자리와 같다.)
  const tenth = hundredth >= 5 ? intBetween(rng, 0, 8) : intBetween(rng, 1, 9);
  const centi = whole * 100 + tenth * 10 + hundredth;
  const roundedTenth = hundredth >= 5 ? tenth + 1 : tenth;
  const rounded = whole * 100 + roundedTenth * 10;
  return make(
    unit,
    `${dj(dec(centi, 2), "을", "를")} 반올림하여 소수 첫째 자리까지 나타내시오.`,
    expr(dec(rounded, 2)),
    `소수 둘째 자리 숫자가 ${n(hundredth)}이므로 ${hundredth >= 5 ? "올립니다" : "버립니다"}. 답은 ${expr(dec(rounded, 2))}입니다.`,
  );
}

/**
 * 응용 — 같은 수를 두 자리로 반올림해 견준다(두 걸음).
 *
 * ⚠️ 두 어림이 **같은 값**을 가리키면 답이 0 이 되고, 「두 자리로 보는 눈」이라는
 *    이 갈래의 정체가 사라진다(값은 옳으니 검산 가드는 조용하다 — 2026-08-23 리드
 *    검수 실측 9.9%). 아래 두 자리가 1~4 이거나 95~99 일 때 그렇게 되므로
 *    **그 구간을 안 뽑는다.** 문턱을 옮기는 게 아니라 못 뽑게 하는 쪽이다.
 */
function round216Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const high = intBetween(rng, 12, 87);
  // 아래 두 자리는 ⑴ 1~4·95~99 가 아니어야 두 어림이 갈리고,
  //             ⑵ **10의 배수가 아니어야** 십의 자리 반올림이 제자리가 아니다.
  // 두 조건을 뽑는 방식으로 함께 보장한다(일의 자리를 0에서 빼고, 십의 자리가 0이면 5부터).
  const tens = intBetween(rng, 0, 8);
  const ones = tens === 0 ? intBetween(rng, 5, 9) : intBetween(rng, 1, 9);
  const below = tens * 10 + ones;
  const x = high * 100 + below;
  const toTen = roundTo(x, 10);
  const toHundred = roundTo(x, 100);
  return make(
    unit,
    `${nj(x, "을", "를")} 반올림하여 십의 자리까지 나타낸 수와 백의 자리까지 나타낸 수의 차를 구하시오.`,
    n(Math.abs(toTen - toHundred)),
    `십의 자리까지는 ${n(toTen)}, 백의 자리까지는 ${n(toHundred)}이므로 차는 ${n(Math.abs(toTen - toHundred))}입니다.`,
  );
}

/** 심화 — **역산**: 반올림값에서 원래 수의 범위를 되짚는다(양 끝이 서로 다른 규칙이다). */
function round216Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [place, placeName] = pick(rng, PLACES);
  const r =
    intBetween(rng, place === 1000 ? 3 : 13, place === 1000 ? 9 : 87) * place;
  const lo = r - place / 2;
  const hi = r + place / 2 - 1;
  return make(
    unit,
    `어떤 자연수를 반올림하여 ${placeName}의 자리까지 나타냈더니 ${nj(r, "이", "가")} 되었습니다. 어떤 수가 될 수 있는 가장 작은 수와 가장 큰 수를 차례로 쓰시오.`,
    nums([lo, hi]),
    `반올림하여 ${n(r)}이 되려면 ${n(lo)} 이상 ${n(hi + 1)} 미만이어야 합니다. 가장 작은 수는 ${n(lo)}, 가장 큰 수는 ${n(hi)}입니다.`,
  );
}

/** 문형 05 — 천의 자리까지 반올림. */
function round216Thousands(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = roundTarget(rng, 1000);
  const r = roundTo(x, 1000);
  return make(
    unit,
    `${nj(x, "을", "를")} 반올림하여 천의 자리까지 나타내시오.`,
    n(r),
    `백의 자리 숫자를 보고 반올림하면 ${n(r)}입니다.`,
  );
}

/** 문형 06 — 백의 자리까지 반올림. */
function round216Hundreds(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = roundTarget(rng, 100);
  const r = roundTo(x, 100);
  return make(
    unit,
    `${nj(x, "을", "를")} 반올림하여 백의 자리까지 나타내시오.`,
    n(r),
    `십의 자리 숫자를 보고 반올림하면 ${n(r)}입니다.`,
  );
}

/** 문형 07 — 판정 자리 숫자. */
function round216Digit(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = roundTarget(rng, 10);
  const digit = x % 10;
  return make(
    unit,
    `${nj(x, "을", "를")} 반올림하여 십의 자리까지 나타낼 때, 바로 아래 자리 숫자는 얼마입니까?`,
    n(digit),
    `일의 자리 숫자가 ${n(digit)}입니다.`,
  );
}

/** 문형 08 — 5 이상이면 올리기 판정. */
function round216NeedUp(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = roundTarget(rng, 10);
  const digit = x % 10;
  return make(
    unit,
    `${nj(x, "을", "를")} 반올림하여 십의 자리까지 나타낼 때 올려야 합니까? (예, 아니요)`,
    digit >= 5 ? "예" : "아니요",
    `일의 자리 숫자가 ${n(digit)}이므로 ${digit >= 5 ? "올립니다" : "버립니다"}.`,
  );
}

/** 문형 09 — 가장 작은 원래 수. */
function round216MinOrig(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 13, 87) * 100;
  return make(
    unit,
    `어떤 자연수를 반올림하여 백의 자리까지 나타냈더니 ${nj(r, "이", "가")} 되었습니다. 어떤 수가 될 수 있는 가장 작은 수는 얼마입니까?`,
    n(r - 50),
    `반올림하여 ${n(r)}이 되려면 ${n(r - 50)} 이상이어야 합니다.`,
  );
}

/** 문형 10 — 가장 큰 원래 수. */
function round216MaxOrig(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 13, 87) * 100;
  return make(
    unit,
    `어떤 자연수를 반올림하여 백의 자리까지 나타냈더니 ${nj(r, "이", "가")} 되었습니다. 어떤 수가 될 수 있는 가장 큰 수는 얼마입니까?`,
    n(r + 49),
    `반올림하여 ${n(r)}이 되려면 ${n(r + 50)} 미만이므로 가장 큰 수는 ${n(r + 49)}입니다.`,
  );
}

/* ────────── 2-2 분수의 곱셈 — 난이도 4단 (D-72 확대 8차) ──────────
 *
 * **이 대단원은 «차례»가 이름의 약속이다.** 2-2-1 은 `(분수)×(자연수)`, 2-2-2 는
 * `(자연수)×(분수)` — 값은 같아도 **쓰는 차례가 다르고**, 그 차례가 곧 소단원이다.
 * 그래서 두 소단원은 서로의 **음성 대조**다: 2-2-1 발문에 자연수가 앞선 식이 있으면
 * 그 자체로 결함이고, 시험이 정규식으로 차례를 잠근다(2026-08-23 리드 지시 ②).
 *
 * 기약은 **답의 꼴로만** 건다 — 「약분」은 이 소단원 이름이 아니므로 발문이 그것을
 * 요구하지 않는다(①). 대신 약분이 **실제로 일어나는 짝**을 섞어 해설에 그 과정이
 * 서게 하고, 시험이 「약분이 일어난 문항이 일정 비율 이상」인지도 센다 — 안 그러면
 * 「약분 과정이 선다」는 문장이 늘 빈 말이 된다.
 *
 * 2-2-4 의 오개념은 **자연수부만 곱하는 것**이다(③). 응용이 그 함정을 실제로 밟게
 * 하고(잘못 계산한 값과 바른 값의 차), 시험이 두 값을 따로 재계산해 견준다.
 */

/** 곱해서 약분이 반드시 일어나는 (분자, 분모, 자연수) — 해설의 약분 과정이 빈 말이 안 되게. */
function reducibleTriple(rng: Rng): { a: number; d: number; k: number } {
  const d = pick(rng, [4, 6, 8, 9, 10, 12]);
  const divs = divisors(d).filter((v) => v > 1 && v < d);
  const k = pick(rng, divs) * intBetween(rng, 1, 2); // d 와 공약수를 반드시 가진다
  const a = coprimeTop(rng, d);
  return { a, d, k: Math.max(2, k) };
}

/**
 * 곱셈 문장의 소재 — `[것, 단위, 담는 것, 있음말]`.
 * ⚠️ 「담는 것」과 「있음말」을 따로 두면 「한 **도막**에 끈이 **들어 있습니다**」가 된다.
 *    소재에 딸린 값으로 묶는다(g4 가 회송한 「색종이를 먹는다」와 같은 자리).
 */
const MUL_STUFF = [
  ["물", "L", "병", "들어 있습니다"],
  ["주스", "L", "병", "들어 있습니다"],
  ["밀가루", "kg", "봉지", "들어 있습니다"],
  ["끈", "m", "도막", "있습니다"],
  ["리본", "m", "개", "있습니다"],
] as const;

/* ── 2-2-1 (분수)×(자연수) — 식은 언제나 «분수 먼저» ── */

/** 연산 — 식이 그대로 주어진다(절차 한 번). 약분이 실제로 일어난다. */
function fm221Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const [num, den] = simplify(a * k, d);
  return make(
    unit,
    `계산하시오.  ${expr(`\\frac{${a}}{${d}}\\times${k}`)}`,
    expr(fracLatex(num, den)),
    `분모는 그대로 두고 분자에 ${nj(k, "을", "를")} 곱합니다. ${expr(`\\frac{${a}\\times${k}}{${d}}=\\frac{${a * k}}{${d}}=${fracLatex(num, den)}`)}입니다.`,
  );
}

/** 기본 — 문장에서 식을 **스스로** 세운다(한 겹). «한 개에 얼마씩 몇 개». */
function fm221Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const [num, den] = simplify(a * k, d);
  const [thing, unitWord, box, have] = pick(rng, MUL_STUFF);
  return make(
    unit,
    `한 ${box}에 ${thing} ${fr(a, d)} ${unitWord}씩 ${have}. ${n(k)}${box}의 ${wj(thing, "은", "는")} 모두 몇 ${unitWord}입니까?`,
    expr(fracLatex(num, den)),
    `한 ${box}의 양에 ${box} 수를 곱합니다. ${expr(`\\frac{${a}}{${d}}\\times${k}=${fracLatex(num, den)}`)}이므로 ${expr(fracLatex(num, den))} ${unitWord}입니다.`,
  );
}

/** 응용 — 곱한 뒤 쓴 만큼을 덜어 낸다(두 단계). 남는 양은 구성상 양수다. */
function fm221Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const [tn, td] = simplify(a * k, d);
  // ⚠️ 쓴 양은 **원래 분모 `d`** 로 잰다. 약분된 분모(`td`)로 재면 `td` 가 1 이 될 때
  //    「$\frac{1}{1}$ 을 썼다」가 되고 남은 양이 **0** 이 된다(2026-08-23 눈검사 실측).
  //    전체가 `a·k/d` 이므로 분자를 `1 … a·k−1` 에서 고르면 남는 양이 반드시 양수다.
  const usedNum = intBetween(rng, 1, a * k - 1);
  const [un, ud] = simplify(usedNum, d);
  const [rn, rd] = subFrac(a * k, d, usedNum, d);
  const [thing, unitWord, box, have] = pick(rng, MUL_STUFF);
  return make(
    unit,
    `한 ${box}에 ${thing} ${fr(a, d)} ${unitWord}씩 ${have}. 이런 것이 ${n(k)}${box} 있을 때 그중 ${expr(fracLatex(un, ud))} ${uj(unitWord, "을", "를")} 썼다면 남은 ${wj(thing, "은", "는")} 몇 ${unitWord}입니까?`,
    expr(fracLatex(rn, rd)),
    `전체는 ${expr(`\\frac{${a}}{${d}}\\times${k}=${fracLatex(tn, td)}`)}입니다. 여기서 쓴 만큼을 빼면 ${expr(`${fracLatex(tn, td)}-${fracLatex(un, ud)}=${fracLatex(rn, rd)}`)}입니다.`,
  );
}

/**
 * 심화 — **역산**: 곱한 결과에서 처음 분수를 거슬러 구한다.
 *
 * ⚠️ **이 갈래가 판정기에 안 걸리는 것은 안전해서가 아니다.** 발문에 `(분수)×(자연수)`
 *    식이 없는 것은 2-2-2 심화와 똑같은데, 저쪽만 위반으로 잡혔다 — 이쪽 발문에는
 *    분수(`3\frac13`)와 자연수(`8`)가 **둘 다 글자로 있어** `section-conditions` 의
 *    느슨한 판정(kindsPresent)을 통과했을 뿐이다. **엄밀 판정(차례까지 보는 opShape)은
 *    둘 다 못 넘는다.** 그러니 「2-2-1 은 괜찮더라」로 읽지 말 것 — 판정기가 조여지면
 *    여기가 먼저 걸린다. 그때는 2-2-2 심화처럼 `\square\times…` 를 발문에 세우면 된다
 *    (2026-08-23 리드 검수에서 이 비대칭을 기록으로 남기라는 지시).
 */
function fm221Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const [num, den] = simplify(a * k, d);
  return make(
    unit,
    `어떤 수에 ${nj(k, "을", "를")} 곱했더니 ${lj(fracLatex(num, den), "이", "가")} 되었습니다. 어떤 수를 구하시오.`,
    fr(a, d),
    `어떤 수는 곱한 결과를 ${nro(k)} 나눈 수입니다. ${expr(`\\frac{${a}}{${d}}\\times${k}=${fracLatex(num, den)}`)}이므로 어떤 수는 ${fr(a, d)}입니다.`,
  );
}

/* ── 2-2-2 (자연수)×(분수) — 식은 언제나 «자연수 먼저». «전체의 얼마만큼»이 그 뜻이다 ── */

/** 연산 — 식이 그대로 주어진다(차례가 2-2-1 과 반대다). */
function fm222Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const [num, den] = simplify(k * a, d);
  return make(
    unit,
    `계산하시오.  ${expr(`${k}\\times\\frac{${a}}{${d}}`)}`,
    expr(fracLatex(num, den)),
    `자연수를 분자에 곱합니다. ${expr(`\\frac{${k}\\times${a}}{${d}}=\\frac{${k * a}}{${d}}=${fracLatex(num, den)}`)}입니다.`,
  );
}

/** 기본 — «전체의 얼마만큼» 문장(한 겹). 자연수가 앞서는 그 뜻 그대로다. */
function fm222Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const [num, den] = simplify(k * a, d);
  const [thing, unitWord] = pick(rng, [
    ["끈", "m"],
    ["철사", "m"],
    ["물", "L"],
    ["밀가루", "kg"],
  ] as const);
  return make(
    unit,
    `${thing} ${n(k)} ${unitWord}의 ${frj(a, d, "은", "는")} 몇 ${unitWord}입니까?`,
    expr(fracLatex(num, den)),
    `전체의 얼마만큼인지는 곱셈으로 구합니다. ${expr(`${k}\\times\\frac{${a}}{${d}}=${fracLatex(num, den)}`)}이므로 ${expr(fracLatex(num, den))} ${unitWord}입니다.`,
  );
}

/** 응용 — 부분을 구하고 **남은 것**을 묻는다(두 단계). */
function fm222Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const [pn, pd] = simplify(k * a, d);
  const [rn, rd] = subFrac(k, 1, pn, pd);
  const [thing, unitWord] = pick(rng, [
    ["끈", "m"],
    ["철사", "m"],
    ["물", "L"],
  ] as const);
  return make(
    unit,
    `${thing} ${n(k)} ${unitWord} 중에서 전체의 ${frj(a, d, "을", "를")} 썼습니다. 남은 ${wj(thing, "은", "는")} 몇 ${unitWord}입니까?`,
    expr(fracLatex(rn, rd)),
    `쓴 양은 ${expr(`${k}\\times\\frac{${a}}{${d}}=${fracLatex(pn, pd)}`)}입니다. 남은 양은 ${expr(`${k}-${fracLatex(pn, pd)}=${fracLatex(rn, rd)}`)}입니다.`,
  );
}

/** 심화 — **역산**: 「어떤 수의 몇 분의 몇이 …」에서 어떤 수를 구한다. */
function fm222Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const [num, den] = simplify(k * a, d);
  return make(
    unit,
    // ⚠️ 역산이라도 **소단원 이름의 꼴**(자연수 × 분수)이 지면에 서야 한다.
    //    처음엔 말로만 「어떤 자연수의 …은 …입니다」로 냈는데, 발문에 자연수가
    //    하나도 없어 판정기가 조건 위반으로 잡았다(2026-08-23 실측 32/40).
    //    □ 가 그 자연수 자리를 지키므로 차례도 그대로 보인다.
    `□ 안에 알맞은 자연수를 구하시오.  ${expr(`\\square\\times\\frac{${a}}{${d}}=${fracLatex(num, den)}`)}`,
    n(k),
    `□는 결과를 ${fro(a, d)} 나눈 수입니다. ${expr(`${k}\\times\\frac{${a}}{${d}}=${fracLatex(num, den)}`)}이므로 □는 ${n(k)}입니다.`,
  );
}

/* ── 2-2-3 진분수의 곱셈 — 두 분수가 **모두 진분수**다 ── */

/** 진분수 두 개 — 곱하면 약분이 일어나게 (분자, 분모) 짝을 맞물린다. */
function twoReducible(rng: Rng): {
  a: number;
  d: number;
  b: number;
  e: number;
} {
  const d = pick(rng, [4, 6, 8, 9, 10]);
  const e = pick(
    rng,
    [4, 6, 8, 9, 10].filter((v) => v !== d),
  );
  const a = coprimeTop(rng, d);
  // 분자 `b` 가 분모 `d` 와 공약수를 가지면 엇갈려 약분된다.
  const cands: number[] = [];
  for (let v = 1; v < e; v += 1)
    if (gcd(v, e) === 1 && gcd(v, d) > 1) cands.push(v);
  const b = cands.length ? pick(rng, cands) : coprimeTop(rng, e);
  return { a, d, b, e };
}

/** 연산 — 식이 그대로 주어진다. */
function fm223Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, b, e } = twoReducible(rng);
  const [num, den] = simplify(a * b, d * e);
  const same = a * b === num && d * e === den;
  return make(
    unit,
    `계산하시오.  ${expr(`\\frac{${a}}{${d}}\\times\\frac{${b}}{${e}}`)}`,
    expr(fracLatex(num, den)),
    `분자끼리, 분모끼리 곱합니다. ${expr(`\\frac{${a}\\times${b}}{${d}\\times${e}}=\\frac{${a * b}}{${d * e}}${same ? "" : `=${fracLatex(num, den)}`}`)}입니다.`,
  );
}

/** 기본 — «얼마의 얼마만큼» 문장(한 겹). */
function fm223Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, b, e } = twoReducible(rng);
  const [num, den] = simplify(a * b, d * e);
  const [thing, unitWord] = pick(rng, [
    ["끈", "m"],
    ["리본", "m"],
    ["주스", "L"],
  ] as const);
  return make(
    unit,
    `${thing} ${fr(a, d)} ${unitWord} 중에서 ${frj(b, e, "을", "를")} 썼습니다. 쓴 ${wj(thing, "은", "는")} 몇 ${unitWord}입니까?`,
    expr(fracLatex(num, den)),
    `전체의 얼마만큼인지는 곱셈입니다. ${expr(`\\frac{${a}}{${d}}\\times\\frac{${b}}{${e}}=${fracLatex(num, den)}`)}이므로 ${expr(fracLatex(num, den))} ${unitWord}입니다.`,
  );
}

/** 응용 — 진분수 셋을 곱한다(두 걸음). */
function fm223Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, b, e } = twoReducible(rng);
  const f = pick(rng, [2, 3, 4, 5]);
  const g2 = coprimeTop(rng, f);
  const [s1, sd1] = simplify(a * b, d * e);
  const [num, den] = simplify(s1 * g2, sd1 * f);
  return make(
    unit,
    `계산하시오.  ${expr(`\\frac{${a}}{${d}}\\times\\frac{${b}}{${e}}\\times\\frac{${g2}}{${f}}`)}`,
    expr(fracLatex(num, den)),
    `앞의 두 분수를 먼저 곱하면 ${expr(`\\frac{${a}}{${d}}\\times\\frac{${b}}{${e}}=${fracLatex(s1, sd1)}`)}이고, 여기에 ${frj(g2, f, "을", "를")} 곱하면 ${expr(fracLatex(num, den))}입니다.`,
  );
}

/** 심화 — **역산**: 곱한 결과에서 한쪽 분수를 거슬러 구한다. */
function fm223Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, b, e } = twoReducible(rng);
  const [num, den] = simplify(a * b, d * e);
  return make(
    unit,
    `□ 안에 알맞은 수를 구하시오.  ${expr(`\\frac{${a}}{${d}}\\times\\square=${fracLatex(num, den)}`)}`,
    fr(b, e),
    `□는 결과를 ${fro(a, d)} 나눈 수입니다. ${expr(`\\frac{${a}}{${d}}\\times\\frac{${b}}{${e}}=${fracLatex(num, den)}`)}이므로 □는 ${fr(b, e)}입니다.`,
  );
}

/* ── 2-2-4 여러 가지 분수의 곱셈 — 대분수. 오개념은 «자연수부만 곱하기» ── */

/** 연산 — 대분수 × 자연수. 가분수로 고치는 과정이 해설에 선다. */
function fm224Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const w = intBetween(rng, 1, 4);
  const imp = w * d + a;
  const [num, den] = simplify(imp * k, d);
  return make(
    unit,
    `계산하시오.  ${expr(`${mixedLatex(w, a, d)}\\times${k}`)}`,
    expr(fracLatex(num, den)),
    `대분수를 가분수 ${fro(imp, d)} 고친 뒤 분자에 ${nj(k, "을", "를")} 곱합니다. ${expr(`\\frac{${imp}}{${d}}\\times${k}=\\frac{${imp * k}}{${d}}=${fracLatex(num, den)}`)}입니다.`,
  );
}

/**
 * 기본 — 문장에서 식을 **스스로** 세운다(한 겹). 대분수 × 진분수를 «빠르기»로 낸다.
 *
 * ⚠️ 옛 판은 여기도 「계산하시오」였다 — **연산의 복제**다. 네 갈래를 나란히 놓으면
 *    1단과 2단이 같은 모양이라 사다리가 오르지 않는다(2026-08-23 리드 검수).
 *    갈래 하나만 보면 「대분수×진분수라 연산과 다르다」로 읽히는데, **다른 것은
 *    수이고 요구하는 일은 같다.** D-72 의 축은 수가 아니라 «식을 누가 세우나»다.
 *
 * 소재를 «빠르기»로 고른 이유: 2-2-1·2-2-2·2-2-3 기본이 전부 «담긴 양/전체의
 * 얼마만큼»이라 문형이 겹친다(D-66 ⑸). 이웃 셋 어디에도 없는 틀로 갈랐다.
 */
function fm224Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, b, e } = twoReducible(rng);
  const w = intBetween(rng, 1, 3);
  const imp = w * d + a;
  const [num, den] = simplify(imp * b, d * e);
  return make(
    unit,
    `한 시간에 ${mx(w, a, d)} km를 걷는 사람이 있습니다. 이 사람이 ${fr(b, e)} 시간 동안 걸은 거리는 몇 km입니까?`,
    expr(fracLatex(num, den)),
    `걸은 거리는 «한 시간에 걷는 거리»에 «걸은 시간»을 곱해 구합니다. 대분수를 가분수 ${fro(imp, d)} 고치면 ${expr(`\\frac{${imp}}{${d}}\\times\\frac{${b}}{${e}}=${fracLatex(num, den)}`)}이므로 ${expr(fracLatex(num, den))} km입니다.`,
  );
}

/**
 * 응용 — **두 단계**: 봉지 수만큼 곱해 전체를 구한 뒤, 그중 얼마만큼을 다시 곱한다.
 * 대분수·자연수·진분수가 한 문항에 다 선다 — 「여러 가지」가 이 소단원의 이름이다.
 */
function fm224Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, b, e } = twoReducible(rng);
  const w = intBetween(rng, 1, 3);
  const k = intBetween(rng, 2, 5);
  const imp = w * d + a;
  const [tn, td] = simplify(imp * k, d);
  const [num, den] = simplify(tn * b, td * e);
  // ⚠️ 「썼다/마셨다」를 소재와 **따로** 두면 「주스를 사용했다」가 나온다.
  //    소재에 딸린 값으로 묶는다(MUL_STUFF 와 같은 자리 — g4 가 회송한 「색종이를 먹는다」).
  const [thing, unitWord, bag, didPast, didAdn] = pick(rng, [
    ["밀가루", "kg", "봉지", "사용했다면", "사용한"],
    ["설탕", "kg", "봉지", "사용했다면", "사용한"],
    ["주스", "L", "병", "마셨다면", "마신"],
  ] as const);
  return make(
    unit,
    `${thing} ${mx(w, a, d)} ${uj(unitWord, "이", "가")} 든 ${wj(bag, "이", "가")} ${n(k)}개 있습니다. 이 ${thing} 전체의 ${frj(b, e, "을", "를")} ${didPast} ${didAdn} ${wj(thing, "은", "는")} 몇 ${unitWord}입니까?`,
    expr(fracLatex(num, den)),
    `대분수를 가분수 ${fro(imp, d)} 고치면 전체는 ${expr(`\\frac{${imp}}{${d}}\\times${k}=${fracLatex(tn, td)}`)}입니다. 그중 ${frj(b, e, "을", "를")} ${didAdn} 것이므로 ${expr(`${fracLatex(tn, td)}\\times\\frac{${b}}{${e}}=${fracLatex(num, den)}`)}입니다.`,
  );
}

/**
 * 심화 — **오개념을 실제로 밟게 한다**: 자연수 부분만 곱하는 잘못.
 * 바른 값 `(w·d+a)/d × k` 와 잘못 값 `w×k` 의 차를 묻는다. 바른 값이 언제나
 * 더 크므로(분수부가 0이 아니다) 차는 반드시 양수다.
 *
 * ⚠️ **이 갈래는 옛 판에서 «응용» 자리에 있었다.** D-72 가 4단 예시로 글자 그대로
 *    드는 문형(「잘못 계산했더니」)이 3단에 서 있었고, 그 대신 심화는 대분수끼리의
 *    맨 「계산하시오」였다 — **3단과 4단이 뒤집혀 있었다.** 등록 갈래 180개 전량에서
 *    「심화가 4단 표지 없는 맨 계산」인 것은 **둘뿐**이었고 둘 다 이 트랙 것이었다
 *    (2026-08-23 리드 실측). 분모가 그렇게 갈리면 해석 차이가 아니라 결함이다.
 *    `scripts/qa/probe-elem-tier-ladder.ts` 가 이 축을 이제 상시로 지킨다.
 */
function fm224Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const w = intBetween(rng, 1, 4);
  const imp = w * d + a;
  const [rn, rd] = simplify(imp * k, d);
  const [dn, dd] = subFrac(rn, rd, w * k, 1);
  return make(
    unit,
    `${lj(`${mixedLatex(w, a, d)}\\times${k}`, "을", "를")} 계산해야 하는데, 잘못하여 자연수 부분만 곱해 ${nj(w * k, "이라고", "라고")} 답했습니다. 바르게 계산한 값과 잘못 계산한 값의 차를 구하시오.`,
    expr(fracLatex(dn, dd)),
    `바르게 계산하면 대분수를 가분수 ${fro(imp, d)} 고쳐 ${expr(`\\frac{${imp}}{${d}}\\times${k}=${fracLatex(rn, rd)}`)}입니다. 잘못 계산한 값은 ${expr(`${w}\\times${k}=${w * k}`)}이므로 차는 ${expr(`${fracLatex(rn, rd)}-${w * k}=${fracLatex(dn, dd)}`)}입니다.`,
  );
}

/** 문형 05 — 약분하기 전 분자. 식은 분수×자연수. */
function fm221BeforeNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  return make(
    unit,
    `${frj(a, d, "과", "와")} ${nj(k, "을", "를")} 곱할 때, 약분하기 전 분자는 얼마입니까?`,
    n(a * k),
    `분모는 그대로 두고 분자에 ${nj(k, "을", "를")} 곱하므로 약분하기 전 분자는 ${expr(`${a}\\times${k}=${a * k}`)}입니다.`,
    d <= 12 ? fracSpec(rng, d, a) : undefined,
  );
}

/** 문형 06 — 약분한 뒤 분모. */
function fm221AfterDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const [, den] = simplify(a * k, d);
  return make(
    unit,
    `${expr(`\\frac{${a}}{${d}}\\times${k}`)}를 계산하여 기약분수로 나타낼 때 분모는 얼마입니까?`,
    n(den),
    `${expr(`\\frac{${a}\\times${k}}{${d}}=\\frac{${a * k}}{${d}}=${fracLatex(...simplify(a * k, d))}`)}이므로 분모는 ${n(den)}입니다.`,
  );
}

/** 문형 07 — 대분수로 접었을 때 자연수 부분. */
function fm221WholePart(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const [num, den] = simplify(a * k, d);
  const whole = Math.floor(num / den);
  return make(
    unit,
    `${expr(`\\frac{${a}}{${d}}\\times${k}`)}의 값을 대분수로 나타낼 때 자연수 부분은 얼마입니까?`,
    n(whole),
    `값은 ${expr(fracLatex(num, den))}이므로 자연수 부분은 ${n(whole)}입니다.`,
  );
}

/** 문형 08 — 자연수 쪽을 거슬러 구한다. 심화는 분수 쪽이다. */
function fm221FindK(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const [num, den] = simplify(a * k, d);
  return make(
    unit,
    `□ 안에 알맞은 자연수를 구하시오.  ${expr(`\\frac{${a}}{${d}}\\times\\square=${fracLatex(num, den)}`)}`,
    n(k),
    `□는 결과를 ${fro(a, d)} 나눈 수입니다. ${expr(`\\frac{${a}}{${d}}\\times${k}=${fracLatex(num, den)}`)}이므로 □는 ${n(k)}입니다.`,
  );
}

/** 문형 09 — 곱한 값에서 처음 분수를 뺀다. */
function fm221ThenSub(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const [pn, pd] = simplify(a * k, d);
  const [rn, rd] = subFrac(a * k, d, a, d);
  return make(
    unit,
    `${frj(a, d, "과", "와")} ${nj(k, "을", "를")} 곱한 값에서 ${fr(a, d)}를 빼면 얼마입니까?`,
    expr(fracLatex(rn, rd)),
    `곱은 ${expr(fracLatex(pn, pd))}입니다. 여기서 ${fr(a, d)}를 빼면 ${expr(`${fracLatex(pn, pd)}-\\frac{${a}}{${d}}=${fracLatex(rn, rd)}`)}입니다.`,
  );
}

/** 문형 10 — 곱이 1보다 큰지 판정. */
function fm221OverOne(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantOver = altCase(rng);
  let a = 5;
  let d = 6;
  let k = 2;
  for (let i = 0; i < 40; i += 1) {
    const t = reducibleTriple(rng);
    if (t.a * t.k > t.d === wantOver) {
      ({ a, d, k } = t);
      break;
    }
  }
  if (a * k > d !== wantOver) {
    if (wantOver) {
      a = 5;
      d = 6;
      k = 2;
    } else {
      a = 1;
      d = 12;
      k = 2;
    }
  }
  const [num, den] = simplify(a * k, d);
  const over = num > den;
  return make(
    unit,
    `${expr(`\\frac{${a}}{${d}}\\times${k}`)}의 값은 ${n(1)}보다 큽니까? (예, 아니요)`,
    over ? "예" : "아니요",
    `값은 ${expr(fracLatex(num, den))}이므로 ${over ? "1보다 큽니다" : "1보다 크지 않습니다"}.`,
  );
}

/** 문형 05 — 약분하기 전 분자. 식은 자연수×분수. */
function fm222BeforeNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  return make(
    unit,
    `${nj(k, "과", "와")} ${fr(a, d)}를 곱할 때, 약분하기 전 분자는 얼마입니까?`,
    n(k * a),
    `자연수를 분자에 곱하므로 약분하기 전 분자는 ${expr(`${k}\\times${a}=${k * a}`)}입니다.`,
  );
}

/** 문형 06 — 약분한 뒤 분모. */
function fm222AfterDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const [, den] = simplify(k * a, d);
  return make(
    unit,
    `${lj(`${k}\\times\\frac{${a}}{${d}}`, "을", "를")} 계산하여 기약분수로 나타낼 때 분모는 얼마입니까?`,
    n(den),
    `${expr(`\\frac{${k}\\times${a}}{${d}}=${fracLatex(...simplify(k * a, d))}`)}이므로 분모는 ${n(den)}입니다.`,
  );
}

/** 문형 07 — 쓰지 않은 부분은 전체의 얼마. */
function fm222UnusedFrac(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d } = reducibleTriple(rng);
  const [rn, rd] = subFrac(1, 1, a, d);
  return make(
    unit,
    `어떤 양의 ${frj(a, d, "을", "를")} 썼습니다. 쓰지 않은 부분은 전체의 얼마입니까?`,
    expr(fracLatex(rn, rd)),
    `전체에서 쓴 만큼을 빼면 ${expr(`1-\\frac{${a}}{${d}}=${fracLatex(rn, rd)}`)}입니다.`,
  );
}

/** 문형 08 — 분수 쪽을 거슬러 구한다. 심화는 자연수 쪽이다. */
function fm222FindFrac(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const [num, den] = simplify(k * a, d);
  return make(
    unit,
    `□ 안에 알맞은 분수를 구하시오.  ${expr(`${k}\\times\\square=${fracLatex(num, den)}`)}`,
    fr(a, d),
    `□는 결과를 ${nro(k)} 나눈 수입니다. ${expr(`${k}\\times\\frac{${a}}{${d}}=${fracLatex(num, den)}`)}이므로 □는 ${fr(a, d)}입니다.`,
  );
}

/** 문형 09 — 곱에 같은 분수를 한 번 더 곱한다. */
function fm222TimesAgain(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const [s1, sd1] = simplify(k * a, d);
  const [num, den] = simplify(s1 * a, sd1 * d);
  return make(
    unit,
    `${expr(`${k}\\times\\frac{${a}}{${d}}`)}의 값에 ${fr(a, d)}를 한 번 더 곱하면 얼마입니까?`,
    expr(fracLatex(num, den)),
    `먼저 ${expr(`${k}\\times\\frac{${a}}{${d}}=${fracLatex(s1, sd1)}`)}이고, 여기에 ${fr(a, d)}를 곱하면 ${expr(fracLatex(num, den))}입니다.`,
  );
}

/** 문형 10 — 곱이 1보다 큰지 판정. */
function fm222OverOne(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const [num, den] = simplify(k * a, d);
  const over = num > den;
  return make(
    unit,
    `${expr(`${k}\\times\\frac{${a}}{${d}}`)}의 값은 ${n(1)}보다 큽니까? (예, 아니요)`,
    over ? "예" : "아니요",
    `값은 ${expr(fracLatex(num, den))}이므로 ${over ? "1보다 큽니다" : "1보다 크지 않습니다"}.`,
  );
}

/** 문형 05 — 진분수 두 개의 분자끼리 곱. */
function fm223NumProduct(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, b, e } = twoReducible(rng);
  return make(
    unit,
    `${frj(a, d, "과", "와")} ${fr(b, e)}를 곱할 때, 약분하기 전 분자는 얼마입니까?`,
    n(a * b),
    `분자끼리 곱하므로 ${expr(`${a}\\times${b}=${a * b}`)}입니다.`,
    d <= 12 ? fracSpec(rng, d, a) : undefined,
  );
}

/** 문형 06 — 분모끼리 곱. */
function fm223DenProduct(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, b, e } = twoReducible(rng);
  return make(
    unit,
    `${frj(a, d, "과", "와")} ${fr(b, e)}를 곱할 때, 약분하기 전 분모는 얼마입니까?`,
    n(d * e),
    `분모끼리 곱하므로 ${expr(`${d}\\times${e}=${d * e}`)}입니다.`,
  );
}

/** 문형 07 — 약분한 뒤 분모. */
function fm223AfterDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, b, e } = twoReducible(rng);
  const [, den] = simplify(a * b, d * e);
  return make(
    unit,
    `${expr(`\\frac{${a}}{${d}}\\times\\frac{${b}}{${e}}`)}를 기약분수로 나타낼 때 분모는 얼마입니까?`,
    n(den),
    `곱은 ${expr(fracLatex(...simplify(a * b, d * e)))}이므로 분모는 ${n(den)}입니다.`,
  );
}

/** 문형 08 — 곱을 기약분수로 나타낸 뒤 분자와 분모의 합. */
function fm223FindFirst(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, b, e } = twoReducible(rng);
  const [num, den] = simplify(a * b, d * e);
  return make(
    unit,
    `${expr(`\\frac{${a}}{${d}}\\times\\frac{${b}}{${e}}`)}의 값을 기약분수로 나타낼 때, 분자와 분모의 합은 얼마입니까?`,
    n(num + den),
    `분자끼리, 분모끼리 곱한 뒤 약분하면 ${expr(fracLatex(num, den))}입니다. 분자와 분모의 합은 ${expr(`${num}+${den}=${num + den}`)}입니다.`,
  );
}

/** 문형 09 — 곱을 1에서 뺀 값. 두 진분수의 곱은 1보다 작다. */
function fm223FromOne(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, b, e } = twoReducible(rng);
  const [pn, pd] = simplify(a * b, d * e);
  const [rn, rd] = subFrac(1, 1, pn, pd);
  return make(
    unit,
    `${frj(a, d, "과", "와")} ${fr(b, e)}를 곱한 값을 ${n(1)}에서 빼면 얼마입니까?`,
    expr(fracLatex(rn, rd)),
    `곱은 ${expr(fracLatex(pn, pd))}입니다. ${expr(`1-${fracLatex(pn, pd)}=${fracLatex(rn, rd)}`)}입니다.`,
  );
}

/** 문형 10 — 세 진분수를 곱한 값의 약분 전 분자. */
function fm223ThreeNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, b, e } = twoReducible(rng);
  const f = pick(rng, [2, 3, 4, 5]);
  const g2 = coprimeTop(rng, f);
  return make(
    unit,
    `${expr(`\\frac{${a}}{${d}}\\times\\frac{${b}}{${e}}\\times\\frac{${g2}}{${f}}`)}를 계산할 때, 약분하기 전 분자는 얼마입니까?`,
    n(a * b * g2),
    `분자끼리 곱하면 ${expr(`${a}\\times${b}\\times${g2}=${a * b * g2}`)}입니다.`,
  );
}

/** 문형 05 — 대분수를 가분수로 고친 분자. */
function fm224ImproperNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const w = intBetween(rng, 1, 4);
  const imp = w * d + a;
  return make(
    unit,
    `${mxj(w, a, d, "과", "와")} ${nj(k, "을", "를")} 곱하려고 대분수를 가분수로 고칠 때, 가분수의 분자는 얼마입니까?`,
    n(imp),
    `자연수부 ${nj(w, "과", "와")} 분모 ${nj(d, "을", "를")} 곱한 뒤 분자를 더합니다. ${expr(`${w}\\times${d}+${a}=${imp}`)}입니다.`,
  );
}

/** 문형 06 — 자연수 부분만 곱한 잘못된 값. 심화는 그 차다. */
function fm224WrongOnly(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const w = intBetween(rng, 1, 4);
  return make(
    unit,
    `${mx(w, a, d)}에서 분수 부분을 빼고 자연수 부분에만 ${nj(k, "을", "를")} 곱한 값은 얼마입니까?`,
    n(w * k),
    `자연수 부분만 곱하면 ${expr(`${w}\\times${k}=${w * k}`)}입니다.`,
  );
}

/** 문형 07 — 분수부만 자연수에 곱한 값. */
function fm224FracPartOnly(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const w = intBetween(rng, 1, 4);
  const [num, den] = simplify(a * k, d);
  return make(
    unit,
    `${mx(w, a, d)}의 분수부에 ${nj(k, "을", "를")} 곱하면 얼마입니까?`,
    expr(fracLatex(num, den)),
    `분수부는 ${fr(a, d)}이므로 ${expr(`\\frac{${a}}{${d}}\\times${k}=${fracLatex(num, den)}`)}입니다.`,
  );
}

/** 문형 08 — 대분수×□에서 자연수를 거슬러 구한다. */
function fm224FindK(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const w = intBetween(rng, 1, 4);
  const imp = w * d + a;
  const [num, den] = simplify(imp * k, d);
  return make(
    unit,
    `□ 안에 알맞은 자연수를 구하시오.  ${expr(`${mixedLatex(w, a, d)}\\times\\square=${fracLatex(num, den)}`)}`,
    n(k),
    `대분수를 가분수 ${fro(imp, d)} 고치면 □는 결과를 그 가분수로 나눈 수입니다. ${expr(`\\frac{${imp}}{${d}}\\times${k}=${fracLatex(num, den)}`)}이므로 □는 ${n(k)}입니다.`,
  );
}

/** 문형 09 — 두 대분수를 곱한다. */
function fm224TwoMixed(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, b, e } = twoReducible(rng);
  const w1 = intBetween(rng, 1, 3);
  const w2 = intBetween(rng, 1, 3);
  const imp1 = w1 * d + a;
  const imp2 = w2 * e + b;
  const [num, den] = simplify(imp1 * imp2, d * e);
  return make(
    unit,
    `${mxj(w1, a, d, "과", "와")} ${mx(w2, b, e)}를 곱하면 얼마입니까?`,
    expr(fracLatex(num, den)),
    `가분수로 고치면 ${expr(`\\frac{${imp1}}{${d}}\\times\\frac{${imp2}}{${e}}=${fracLatex(num, den)}`)}입니다.`,
  );
}

/** 문형 10 — 곱을 대분수로 나타낼 때 자연수 부분. */
function fm224WholePart(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, d, k } = reducibleTriple(rng);
  const w = intBetween(rng, 1, 4);
  const imp = w * d + a;
  const [num, den] = simplify(imp * k, d);
  const whole = Math.floor(num / den);
  return make(
    unit,
    `${expr(`${mixedLatex(w, a, d)}\\times${k}`)}의 값을 대분수로 나타낼 때 자연수 부분은 얼마입니까?`,
    n(whole),
    `값은 ${expr(fracLatex(num, den))}이므로 자연수 부분은 ${n(whole)}입니다.`,
  );
}

/* ────────── 2-4 소수의 곱셈 — 난이도 4단 (D-72 확대 9차) ──────────
 *
 * **조건이 두 축이다.** 소단원 이름이 «차례»(자연수가 앞이냐 뒤냐)와 «크기»(1보다
 * 작은/큰)를 **각각** 내걸고, 2-4-1~4 가 그 2×2 다. 값은 같아도 차례가 다르면 다른
 * 소단원이므로(2-2 와 같은 자리) 시험이 차례와 크기를 **따로** 잠근다.
 *
 * ⚠️ **자리가 접히면 이 대단원이 가르치려는 것이 지면에서 사라진다.**
 *    `dec()` 가 꼬리 0 을 접으므로 「$0.20$」은 안 나가지만, 그때 답이 한 자리(또는
 *    정수)가 되어 「소수끼리 곱하면 자리가 더해진다」가 안 보인다 — 2-1-6 의
 *    「소수 첫째 자리까지인데 답이 정수」와 같은 부류다. 그래서 **곱이 10의 배수가
 *    되는 짝을 뽑는 데서 뺀다.** 옛 표준은 이 가드를 2-4-1·2-4-3 에만 걸었는데,
 *    여기서는 여섯 소단원 전부에 건다. 구성이 100% 를 보장하므로 시험도 **전량**으로 잰다.
 *
 * 피연산자는 **소수 한 자리**로 묶는다 — 곱이 최대 두 자리라 초5 범위 안이다
 * (2-4-7 만 10·100 을 곱해 자리를 옮기는 쪽이라 따로 잰다).
 *
 * 이웃 초4 2-3(소수의 덧셈과 뺄셈)과의 판별자는 **측정으로** 골랐다(2026-08-23):
 *   초4 2-3 모집단 448행에서 발문·해설의 `\times` 는 **0.0%** · 「곱」 0.0% ·
 *   「합·차·+·−」 42.9%. 그래서 «곱셈이 있다»가 여기서는 **강한** 판별자다
 *   (초6 2-1 나눗셈에서는 37.5% 라 약했다 — **같은 열쇠가 이웃에 따라 다르다**).
 *   「배」는 쓰지 않는다 — 초4 2-3-2 의 «**배추**의 무게» 가 그 글자에 걸린다.
 */

/** 1보다 **작은** 소수 한 자리 — 십분의 일 정수 2~9(`0.2`~`0.9`). */
function underOneT(rng: Rng, ok: (t: number) => boolean = () => true): number {
  const cands = [2, 3, 4, 5, 6, 7, 8, 9].filter(ok);
  return pick(rng, cands.length ? cands : [3]);
}

/** 1보다 **큰** 소수 한 자리 — 십분의 일 정수 11~49(`1.1`~`4.9`). 정수부만인 것은 뺀다. */
function overOneT(rng: Rng, ok: (t: number) => boolean = () => true): number {
  const cands: number[] = [];
  for (let w = 1; w <= 4; w += 1)
    for (let f = 1; f <= 9; f += 1) {
      const t = w * 10 + f;
      if (ok(t)) cands.push(t);
    }
  return pick(rng, cands.length ? cands : [13]);
}

/**
 * 「두 곱의 합」 갈래용 — `head × k1 + b × k2` 가 **10의 배수가 되지 않는** 짝.
 *
 * ⚠️ 조건을 `overOneT` 의 걸개로만 주면 후보가 **빌 수 있고**, 그때 폴백(`13`)이
 *    조건을 깬다 — 그래서 실측이 6.5%·2.6% 남아 있었다(2026-08-23). 걸개를 하나만
 *    움직이면 못 푸는 짝이 있으니(`b`·`k2` 를 함께 봐야 한다) **짝을 통째로** 뽑는다.
 *    `b=11` 로 두면 `b×k2 ≡ k2` 라 `k2∈[2,9]` 중 많아야 하나만 막히므로 **반드시 있다.**
 */
function sumPairOverOne(
  rng: Rng,
  head: number,
  k1: number,
): { b: number; k2: number } {
  const pairs: [number, number][] = [];
  for (let k2 = 2; k2 <= 9; k2 += 1)
    for (let w = 1; w <= 4; w += 1)
      for (let f = 1; f <= 9; f += 1) {
        const b = w * 10 + f;
        if (b === head) continue;
        if ((b * k2) % 10 === 0) continue;
        if ((head * k1 + b * k2) % 10 === 0) continue;
        pairs.push([b, k2]);
      }
  const [b, k2] = pick(rng, pairs);
  return { b, k2 };
}

/** 소수 문장의 소재 — `[것, 단위, 담는 것, 있음말]`(2-2 와 같은 묶음 규칙). */
const DEC_STUFF = [
  ["물", "L", "병", "들어 있습니다"],
  ["우유", "L", "병", "들어 있습니다"],
  ["소금", "kg", "봉지", "들어 있습니다"],
  ["모래", "kg", "자루", "들어 있습니다"],
] as const;

/* ── 2-4-1 (1보다 작은 소수)×(자연수) ── */

/** 연산 — 식이 그대로. 곱이 자리를 안 잃는다. */
function dm241Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const t = underOneT(rng, (x) => (x * k) % 10 !== 0);
  return make(
    unit,
    `계산하시오.  ${expr(`${dec(t, 1)}\\times${k}`)}`,
    expr(dec(t * k, 1)),
    `${nj(t, "과", "와")} ${nj(k, "을", "를")} 곱한 ${n(t * k)}에 소수 한 자리를 찍으면 ${expr(dec(t * k, 1))}입니다.`,
  );
}

/** 기본 — 문장에서 식을 스스로 세운다. */
function dm241Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const t = underOneT(rng, (x) => (x * k) % 10 !== 0);
  const [thing, unitWord, box, have] = pick(rng, DEC_STUFF);
  return make(
    unit,
    `한 ${box}에 ${thing} ${expr(dec(t, 1))} ${unitWord}씩 ${have}. ${n(k)}${box}의 ${wj(thing, "은", "는")} 모두 몇 ${unitWord}입니까?`,
    expr(dec(t * k, 1)),
    `한 ${box}의 양에 ${box} 수를 곱합니다. ${expr(`${dec(t, 1)}\\times${k}=${dec(t * k, 1)}`)}이므로 ${expr(dec(t * k, 1))} ${unitWord}입니다.`,
  );
}

/** 응용 — 곱한 뒤 덜어 낸다(두 단계). 남는 양은 구성상 양수다. */
function dm241Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 3, 9);
  const t = underOneT(rng, (x) => (x * k) % 10 !== 0);
  const total = t * k;
  // 남는 양이 10의 배수면 답이 정수로 접혀 「소수」가 지면에서 사라진다.
  const usedPool: number[] = [];
  for (let v = 1; v < total; v += 1)
    if ((total - v) % 10 !== 0) usedPool.push(v);
  const used = pick(rng, usedPool);
  const [thing, unitWord, box, have] = pick(rng, DEC_STUFF);
  return make(
    unit,
    `한 ${box}에 ${thing} ${expr(dec(t, 1))} ${unitWord}씩 ${have}. 이런 것이 ${n(k)}${box} 있을 때 그중 ${expr(dec(used, 1))} ${uj(unitWord, "을", "를")} 썼다면 남은 ${wj(thing, "은", "는")} 몇 ${unitWord}입니까?`,
    expr(dec(total - used, 1)),
    `전체는 ${expr(`${dec(t, 1)}\\times${k}=${dec(total, 1)}`)}입니다. 여기서 쓴 만큼을 빼면 ${expr(`${dec(total, 1)}-${dec(used, 1)}=${dec(total - used, 1)}`)}입니다.`,
  );
}

/** 심화 — **역산**: 곱한 결과에서 처음 소수를 거슬러 구한다. */
function dm241Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const t = underOneT(rng, (x) => (x * k) % 10 !== 0);
  return make(
    unit,
    `□ 안에 알맞은 자연수를 구하시오.  ${expr(`${dec(t, 1)}\\times\\square=${dec(t * k, 1)}`)}`,
    n(k),
    `□는 결과를 ${expr(dec(t, 1))}${dro(dec(t, 1))} 나눈 수입니다. ${expr(`${dec(t, 1)}\\times${k}=${dec(t * k, 1)}`)}이므로 □는 ${n(k)}입니다.`,
  );
}

/* ── 2-4-2 (1보다 큰 소수)×(자연수) ── */

/** 연산 — 1보다 큰 소수가 앞에 선다. */
function dm242Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const a = overOneT(rng, (x) => (x * k) % 10 !== 0);
  return make(
    unit,
    `계산하시오.  ${expr(`${dec(a, 1)}\\times${k}`)}`,
    expr(dec(a * k, 1)),
    `${nj(a, "과", "와")} ${nj(k, "을", "를")} 곱한 ${n(a * k)}에 소수 한 자리를 찍으면 ${expr(dec(a * k, 1))}입니다.`,
  );
}

/** 기본 — 길이 문장(2-4-1 의 «담는 것»과 다른 문형). */
function dm242Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const a = overOneT(rng, (x) => (x * k) % 10 !== 0);
  const [thing, piece] = pick(rng, [
    ["색 테이프", "도막"],
    ["철사", "도막"],
    ["리본", "개"],
  ] as const);
  return make(
    unit,
    `길이가 ${expr(dec(a, 1))} m인 ${thing} ${n(k)}${wj(piece, "을", "를")} 겹치지 않게 이어 붙였습니다. 이어 붙인 ${wj(thing, "은", "는")} 몇 m입니까?`,
    expr(dec(a * k, 1)),
    `한 ${piece}의 길이에 ${piece} 수를 곱합니다. ${expr(`${dec(a, 1)}\\times${k}=${dec(a * k, 1)}`)}이므로 ${expr(dec(a * k, 1))} m입니다.`,
  );
}

/** 응용 — 두 종류를 각각 곱해 합한다(두 단계). */
function dm242Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const k1 = intBetween(rng, 2, 5);
  const a = overOneT(rng, (x) => (x * k1) % 10 !== 0);
  // 합까지 10의 배수가 아니어야 답이 한 자리로 남는다 — 짝을 통째로 뽑는다.
  const { b, k2 } = sumPairOverOne(rng, a, k1);
  const total = a * k1 + b * k2;
  return make(
    unit,
    `길이가 ${expr(dec(a, 1))} m인 막대 ${n(k1)}개와 ${expr(dec(b, 1))} m인 막대 ${n(k2)}개가 있습니다. 막대의 길이는 모두 몇 m입니까?`,
    expr(dec(total, 1)),
    `${expr(`${dec(a, 1)}\\times${k1}=${dec(a * k1, 1)}`)}, ${expr(`${dec(b, 1)}\\times${k2}=${dec(b * k2, 1)}`)}이므로 모두 ${expr(`${dec(a * k1, 1)}+${dec(b * k2, 1)}=${dec(total, 1)}`)} m입니다.`,
  );
}

/** 심화 — **역산**: 자연수 쪽을 거슬러 구한다(2-4-1 은 소수 쪽이었다). */
function dm242Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const a = overOneT(rng, (x) => (x * k) % 10 !== 0);
  return make(
    unit,
    `□ 안에 알맞은 자연수를 구하시오.  ${expr(`${dec(a, 1)}\\times\\square=${dec(a * k, 1)}`)}`,
    n(k),
    `□는 결과를 ${expr(dec(a, 1))}${dro(dec(a, 1))} 나눈 수입니다. ${expr(`${dec(a, 1)}\\times${k}=${dec(a * k, 1)}`)}이므로 □는 ${n(k)}입니다.`,
  );
}

/* ── 2-4-3 (자연수)×(1보다 작은 소수) — 차례가 2-4-1 과 반대다 ── */

/** 연산 — 자연수가 앞에 선다. */
function dm243Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const t = underOneT(rng, (x) => (x * k) % 10 !== 0);
  return make(
    unit,
    `계산하시오.  ${expr(`${k}\\times${dec(t, 1)}`)}`,
    expr(dec(k * t, 1)),
    `${nj(k, "과", "와")} ${nj(t, "을", "를")} 곱한 ${n(k * t)}에 소수 한 자리를 찍으면 ${expr(dec(k * t, 1))}입니다.`,
  );
}

/** 기본 — «전체의 얼마만큼»(자연수가 앞서는 그 뜻). 1보다 작으니 결과가 줄어든다. */
function dm243Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const t = underOneT(rng, (x) => (x * k) % 10 !== 0);
  const [thing, unitWord] = pick(rng, [
    ["끈", "m"],
    ["철사", "m"],
    ["물", "L"],
  ] as const);
  return make(
    unit,
    `${thing} ${n(k)} ${unitWord} 중에서 전체의 ${expr(dec(t, 1))}만큼을 썼습니다. 쓴 ${wj(thing, "은", "는")} 몇 ${unitWord}입니까?`,
    expr(dec(k * t, 1)),
    `전체의 얼마만큼인지는 곱셈으로 구합니다. ${expr(`${k}\\times${dec(t, 1)}=${dec(k * t, 1)}`)}이므로 ${expr(dec(k * t, 1))} ${unitWord}입니다.`,
  );
}

/** 응용 — 쓴 뒤 **남은** 양을 묻는다(두 단계). */
function dm243Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const t = underOneT(rng, (x) => (x * k) % 10 !== 0);
  const used = k * t;
  const rest = k * 10 - used;
  const [thing, unitWord] = pick(rng, [
    ["끈", "m"],
    ["철사", "m"],
    ["물", "L"],
  ] as const);
  return make(
    unit,
    `${thing} ${n(k)} ${unitWord} 중에서 전체의 ${expr(dec(t, 1))}만큼을 썼습니다. 남은 ${wj(thing, "은", "는")} 몇 ${unitWord}입니까?`,
    expr(dec(rest, 1)),
    `쓴 양은 ${expr(`${k}\\times${dec(t, 1)}=${dec(used, 1)}`)}입니다. 남은 양은 ${expr(`${k}-${dec(used, 1)}=${dec(rest, 1)}`)} ${unitWord}입니다.`,
  );
}

/** 심화 — **역산**: 1보다 작은 소수 쪽을 거슬러 구한다. */
function dm243Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const t = underOneT(rng, (x) => (x * k) % 10 !== 0);
  return make(
    unit,
    `□ 안에 알맞은 자연수를 구하시오.  ${expr(`\\square\\times${dec(t, 1)}=${dec(k * t, 1)}`)}`,
    n(k),
    `□는 결과를 ${expr(dec(t, 1))}${dro(dec(t, 1))} 나눈 수입니다. ${expr(`${k}\\times${dec(t, 1)}=${dec(k * t, 1)}`)}이므로 □는 ${n(k)}입니다.`,
  );
}

/* ── 2-4-4 (자연수)×(1보다 큰 소수) ── */

/** 연산 — 자연수 뒤에 1보다 큰 소수. */
function dm244Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const a = overOneT(rng, (x) => (x * k) % 10 !== 0);
  return make(
    unit,
    `계산하시오.  ${expr(`${k}\\times${dec(a, 1)}`)}`,
    expr(dec(k * a, 1)),
    `${nj(k, "과", "와")} ${nj(a, "을", "를")} 곱한 ${n(k * a)}에 소수 한 자리를 찍으면 ${expr(dec(k * a, 1))}입니다.`,
  );
}

/**
 * 기본 — «…의 …배». 1보다 **큰** 소수를 곱하니 결과가 **늘어난다** —
 * 1보다 작은 소수를 곱해 줄어드는 2-4-3 기본(«전체의 …만큼»)과 짝을 이룬다.
 * (초4 2-3-3 이 «A는 B의 몇 배입니까»를 쓰지만 그건 **배수를 묻는** 문형이고
 *  이쪽은 배수를 주고 **값을 묻는다** — 골격 대조 시험이 그 둘을 갈라 준다.)
 */
function dm244Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const a = overOneT(rng, (x) => (x * k) % 10 !== 0);
  const [thing, unitWord] = pick(rng, [
    ["끈", "m"],
    ["철사", "m"],
    ["밀가루", "kg"],
    ["물", "L"],
  ] as const);
  return make(
    unit,
    `${thing} ${n(k)} ${unitWord}의 ${expr(dec(a, 1))}배는 몇 ${unitWord}입니까?`,
    expr(dec(k * a, 1)),
    `몇 배인지는 곱셈으로 구합니다. ${expr(`${k}\\times${dec(a, 1)}=${dec(k * a, 1)}`)}이므로 ${expr(dec(k * a, 1))} ${unitWord}입니다.`,
  );
}

/** 응용 — 두 사람 몫을 더한다(두 단계). */
function dm244Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const k1 = intBetween(rng, 2, 6);
  const a = overOneT(rng, (x) => (x * k1) % 10 !== 0);
  const { b, k2 } = sumPairOverOne(rng, a, k1);
  const total = k1 * a + k2 * b;
  return make(
    unit,
    `길이가 ${n(k1)} m인 끈의 ${expr(dec(a, 1))}배와 ${n(k2)} m인 끈의 ${expr(dec(b, 1))}배를 이어 붙였습니다. 이어 붙인 끈은 모두 몇 m입니까?`,
    expr(dec(total, 1)),
    `${expr(`${k1}\\times${dec(a, 1)}=${dec(k1 * a, 1)}`)}, ${expr(`${k2}\\times${dec(b, 1)}=${dec(k2 * b, 1)}`)}이므로 모두 ${expr(`${dec(k1 * a, 1)}+${dec(k2 * b, 1)}=${dec(total, 1)}`)} m입니다.`,
  );
}

/** 심화 — **역산**: 1보다 큰 소수 쪽을 거슬러 구한다. */
function dm244Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const a = overOneT(rng, (x) => (x * k) % 10 !== 0);
  return make(
    unit,
    `□ 안에 알맞은 자연수를 구하시오.  ${expr(`\\square\\times${dec(a, 1)}=${dec(k * a, 1)}`)}`,
    n(k),
    `□는 결과를 ${expr(dec(a, 1))}${dro(dec(a, 1))} 나눈 수입니다. ${expr(`${k}\\times${dec(a, 1)}=${dec(k * a, 1)}`)}이므로 □는 ${n(k)}입니다.`,
  );
}

/* ── 2-4-5 (1보다 작은 소수)×(1보다 작은 소수) — 자리가 **두 자리**로 깊어진다 ── */

/** 연산 — 두 소수가 모두 1보다 작다. 곱은 소수 두 자리다. */
function dm245Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = underOneT(rng);
  const b = underOneT(rng, (x) => (a * x) % 10 !== 0);
  return make(
    unit,
    `계산하시오.  ${expr(`${dec(a, 1)}\\times${dec(b, 1)}`)}`,
    expr(dec(a * b, 2)),
    `${nj(a, "과", "와")} ${nj(b, "을", "를")} 곱한 ${n(a * b)}에 소수 두 자리를 찍으면 ${expr(dec(a * b, 2))}입니다. 소수 한 자리끼리 곱하면 자리가 둘이 됩니다.`,
  );
}

/** 기본 — 직사각형 넓이(2-4-6 의 단위량 문형과 다르다). */
function dm245Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = underOneT(rng);
  const b = underOneT(rng, (x) => (a * x) % 10 !== 0 && x !== a);
  const thing = pick(rng, ["화단", "게시판", "책상", "돗자리"] as const);
  return make(
    unit,
    `가로가 ${expr(dec(a, 1))} m, 세로가 ${expr(dec(b, 1))} m인 직사각형 모양 ${wj(thing, "이", "가")} 있습니다. 이 ${thing}의 넓이는 몇 m²입니까?`,
    expr(dec(a * b, 2)),
    `직사각형의 넓이는 가로와 세로를 곱합니다. ${expr(`${dec(a, 1)}\\times${dec(b, 1)}=${dec(a * b, 2)}`)}이므로 ${expr(dec(a * b, 2))} m²입니다.`,
  );
}

/** 응용 — 넓이를 구한 뒤 그 일부를 다시 묻는다(두 단계). */
function dm245Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = underOneT(rng);
  const b = underOneT(rng, (x) => (a * x) % 10 !== 0 && x !== a);
  const area = a * b; // 백분의 일 정수
  // 넓이×개수가 10의 배수면 소수 **두 자리**가 한 자리로 접힌다.
  const k = pick(
    rng,
    [2, 3, 4, 5].filter((v) => (area * v) % 10 !== 0),
  );
  return make(
    unit,
    `가로가 ${expr(dec(a, 1))} m, 세로가 ${expr(dec(b, 1))} m인 직사각형 모양 화단이 ${n(k)}개 있습니다. 화단의 넓이는 모두 몇 m²입니까?`,
    expr(dec(area * k, 2)),
    `화단 하나의 넓이는 ${expr(`${dec(a, 1)}\\times${dec(b, 1)}=${dec(area, 2)}`)}입니다. ${n(k)}개이므로 ${expr(`${dec(area, 2)}\\times${k}=${dec(area * k, 2)}`)} m²입니다.`,
  );
}

/** 심화 — **역산**: 소수 두 자리 결과에서 한쪽 소수를 거슬러 구한다. */
function dm245Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = underOneT(rng);
  const b = underOneT(rng, (x) => (a * x) % 10 !== 0);
  return make(
    unit,
    `□ 안에 알맞은 소수를 구하시오.  ${expr(`${dec(a, 1)}\\times\\square=${dec(a * b, 2)}`)}`,
    expr(dec(b, 1)),
    `□는 결과를 ${expr(dec(a, 1))}${dro(dec(a, 1))} 나눈 수입니다. ${expr(`${dec(a, 1)}\\times${dec(b, 1)}=${dec(a * b, 2)}`)}이므로 □는 ${expr(dec(b, 1))}입니다.`,
  );
}

/* ── 2-4-6 (1보다 큰 소수)×(1보다 큰 소수) ── */

/** 연산 — 두 소수가 모두 1보다 크다. */
function dm246Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = overOneT(rng);
  const b = overOneT(rng, (x) => (a * x) % 10 !== 0);
  return make(
    unit,
    `계산하시오.  ${expr(`${dec(a, 1)}\\times${dec(b, 1)}`)}`,
    expr(dec(a * b, 2)),
    `${nj(a, "과", "와")} ${nj(b, "을", "를")} 곱한 ${n(a * b)}에 소수 두 자리를 찍으면 ${expr(dec(a * b, 2))}입니다.`,
  );
}

/** 기본 — 단위량 문장(1 m 무게). 2-4-5 의 넓이 문형과 다르다. */
function dm246Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = overOneT(rng);
  const b = overOneT(rng, (x) => (a * x) % 10 !== 0);
  const thing = pick(rng, ["철사", "밧줄", "쇠막대"] as const);
  return make(
    unit,
    `${n(1)} m의 무게가 ${expr(dec(a, 1))} kg인 ${wj(thing, "이", "가")} 있습니다. 이 ${thing} ${expr(dec(b, 1))} m의 무게는 몇 kg입니까?`,
    expr(dec(a * b, 2)),
    `${n(1)} m의 무게에 길이를 곱합니다. ${expr(`${dec(a, 1)}\\times${dec(b, 1)}=${dec(a * b, 2)}`)}이므로 ${expr(dec(a * b, 2))} kg입니다.`,
  );
}

/** 응용 — 넓이를 구하되 **1보다 큰** 두 소수로(두 단계: 넓이 뒤 덜어 내기). */
function dm246Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = overOneT(rng);
  const b = overOneT(rng, (x) => (a * x) % 10 !== 0);
  const area = a * b;
  // 남은 넓이가 10의 배수면 소수 두 자리가 접힌다.
  const cutPool: number[] = [];
  for (let v = 1; v <= Math.floor(area / 2); v += 1)
    if ((area - v) % 10 !== 0) cutPool.push(v);
  const cut = pick(rng, cutPool);
  return make(
    unit,
    `가로가 ${expr(dec(a, 1))} m, 세로가 ${expr(dec(b, 1))} m인 직사각형 모양 밭에서 ${expr(dec(cut, 2))} m²에 고추를 심었습니다. 고추를 심지 않은 곳은 몇 m²입니까?`,
    expr(dec(area - cut, 2)),
    `밭 전체의 넓이는 ${expr(`${dec(a, 1)}\\times${dec(b, 1)}=${dec(area, 2)}`)}입니다. 심은 곳을 빼면 ${expr(`${dec(area, 2)}-${dec(cut, 2)}=${dec(area - cut, 2)}`)} m²입니다.`,
  );
}

/** 심화 — **역산**: 두 자리 결과에서 1보다 큰 소수를 거슬러 구한다. */
function dm246Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = overOneT(rng);
  const b = overOneT(rng, (x) => (a * x) % 10 !== 0);
  return make(
    unit,
    `□ 안에 알맞은 소수를 구하시오.  ${expr(`\\square\\times${dec(b, 1)}=${dec(a * b, 2)}`)}`,
    expr(dec(a, 1)),
    `□는 결과를 ${expr(dec(b, 1))}${dro(dec(b, 1))} 나눈 수입니다. ${expr(`${dec(a, 1)}\\times${dec(b, 1)}=${dec(a * b, 2)}`)}이므로 □는 ${expr(dec(a, 1))}입니다.`,
  );
}

/* ── 2-4-7 곱의 소수점의 위치 — 자리가 «옮겨지는» 것을 본다 ──
 *
 * ⚠️ **옛 판은 사다리가 거꾸로였다** (2026-08-23 리드 검수). 연산 `5.56×1000` ·
 *    기본 `193×0.01` 로 **1단이 두 번** 서고, 응용이 `40.9×□=4.09`(역산 = D-72 **4단**
 *    표지), 심화가 `9.18×100×0.1`(두 단계 = **3단** 표지)이었다. 곧 **2단이 1단의
 *    복제이고 3·4단이 뒤집힌** 것이다. 값도 조사도 판정기도 전부 초록이었다 —
 *    「네 갈래를 나란히 렌더해 사다리가 오르는가」를 아무도 안 물었기 때문이다.
 *
 *    이제: 연산 = 한 번 옮긴다(양방향) · 기본 = 문장에서 스스로 세운다 ·
 *    응용 = **두 번** 옮긴다(문장) · 심화 = **거슬러 찾은 뒤 한 번 더** 옮긴다.
 *    양방향을 연산으로 내렸으므로 기본이 왼쪽 이동을 떠맡지 않아도 된다.
 */

/** 백분의 일 정수. 끝자리가 0이면 지면에서 자리가 접히므로 밀어 낸다. */
function hundredthT(rng: Rng, lo = 105, hi = 989): number {
  const v = intBetween(rng, lo, hi);
  return v % 10 === 0 ? v + 1 : v;
}

/** 연산 — 한 번 옮긴다. **양쪽 다** 낸다(10·100·1000 과 0.1·0.01). */
function dm247Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const b = hundredthT(rng);
    const mul = pick(rng, [10, 100, 1000]);
    const steps = mul === 10 ? 1 : mul === 100 ? 2 : 3;
    return make(
      unit,
      `계산하시오.  ${expr(`${dec(b, 2)}\\times${mul}`)}`,
      expr(dec(b * mul, 2)),
      `${nj(mul, "을", "를")} 곱하면 소수점이 오른쪽으로 ${n(steps)}칸 옮겨집니다. 답은 ${expr(dec(b * mul, 2))}입니다.`,
    );
  }
  const whole = intBetween(rng, 12, 987);
  const w = whole % 10 === 0 ? whole + 1 : whole;
  const steps = pick(rng, [1, 2]);
  return make(
    unit,
    `계산하시오.  ${expr(`${w}\\times${dec(1, steps)}`)}`,
    expr(dec(w, steps)),
    `${dj(dec(1, steps), "을", "를")} 곱하면 소수점이 왼쪽으로 ${n(steps)}칸 옮겨집니다. 답은 ${expr(dec(w, steps))}입니다.`,
  );
}

/**
 * 기본 — 문장에서 식을 **스스로** 세운다(한 겹). 「몇 개분의 무게」가 곧 ×10·100·1000 이다.
 *
 * 소재를 «~짜리»로 고른 이유: 2-2-1 기본의 「한 병에 …씩 들어 있습니다」와
 * 2-4-2 기본의 「이어 붙였습니다」가 이미 자리를 잡고 있어 문형이 겹친다(D-66 ⑸).
 */
function dm247Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = hundredthT(rng);
  const mul = pick(rng, [10, 100, 1000]);
  const steps = mul === 10 ? 1 : mul === 100 ? 2 : 3;
  const thing = pick(rng, ["상자", "봉지", "벽돌", "통"] as const);
  return make(
    unit,
    `${expr(dec(b, 2))} kg짜리 ${thing} ${n(mul)}개의 무게는 모두 몇 kg입니까?`,
    expr(dec(b * mul, 2)),
    `한 개의 무게에 개수를 곱합니다. ${nj(mul, "을", "를")} 곱하면 소수점이 오른쪽으로 ${n(steps)}칸 옮겨지므로 ${expr(`${dec(b, 2)}\\times${mul}=${dec(b * mul, 2)}`)}입니다.`,
  );
}

/** 응용 — **두 단계**: 개수만큼 곱해 전체를 구한 뒤, 그 전체의 얼마만큼을 다시 곱한다. */
function dm247Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = hundredthT(rng);
  // ⚠️ 오른쪽 2칸 뒤 왼쪽 2칸이면 **제자리로 돌아온다** — 두 단계가 뜻을 잃는다
  //    (2-1-6 응용의 「차가 0」과 같은 부류다). 옮긴 칸이 남도록 짝을 뽑는다.
  const up = pick(rng, [100, 1000]);
  const upSteps = up === 100 ? 2 : 3;
  const downSteps = pick(
    rng,
    [1, 2].filter((d) => d !== upSteps),
  );
  const after = (b * up) / 10 ** downSteps;
  const thing = pick(rng, ["상자", "봉지", "벽돌", "통"] as const);
  return make(
    unit,
    `${expr(dec(b, 2))} kg짜리 ${wj(thing, "이", "가")} ${n(up)}개 있습니다. 이 ${thing} 전체 무게의 ${expr(dec(1, downSteps))}만큼은 몇 kg입니까?`,
    expr(dec(after, 2)),
    `전체 무게는 ${nj(up, "을", "를")} 곱해 소수점이 오른쪽으로 ${n(upSteps)}칸 옮겨진 ${expr(dec(b * up, 2))} kg입니다. 여기에 ${dj(dec(1, downSteps), "을", "를")} 곱하면 소수점이 왼쪽으로 ${n(downSteps)}칸 옮겨지므로 ${expr(`${dec(b * up, 2)}\\times${dec(1, downSteps)}=${dec(after, 2)}`)}입니다.`,
  );
}

/**
 * 심화 — **역산 + 조건 조합**: 곱한 결과에서 어떤 수를 거슬러 찾고, 그 수에 **다른 수**를
 * 곱한 값을 묻는다. 자리를 왼쪽으로 되돌린 뒤 다시 오른쪽으로 보내야 한다.
 *
 * ⚠️ 두 곱하는 수를 **같은 방향에서 서로 다르게** 뽑는다. 방향을 섞으면 초5 범위 밖의
 *    소수 자리가 나오고(백분의 일에 `0.01` 을 곱하면 넷째 자리), 같은 수를 두 번 뽑으면
 *    답이 곧 주어진 값이 되어 역산이 뜻을 잃는다.
 */
function dm247Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const b = hundredthT(rng);
    const mulA = pick(rng, [10, 100, 1000]);
    const mulB = pick(
      rng,
      [10, 100, 1000].filter((v) => v !== mulA),
    );
    const stepsA = mulA === 10 ? 1 : mulA === 100 ? 2 : 3;
    return make(
      unit,
      `어떤 수에 ${nj(mulA, "을", "를")} 곱했더니 ${dj(dec(b * mulA, 2), "이", "가")} 되었습니다. 어떤 수에 ${nj(mulB, "을", "를")} 곱하면 얼마입니까?`,
      expr(dec(b * mulB, 2)),
      `${nj(mulA, "을", "를")} 곱해 소수점이 오른쪽으로 ${n(stepsA)}칸 옮겨졌으므로, 어떤 수는 소수점을 왼쪽으로 ${n(stepsA)}칸 되돌린 ${expr(dec(b, 2))}입니다. 여기에 ${nj(mulB, "을", "를")} 곱하면 ${expr(`${dec(b, 2)}\\times${mulB}=${dec(b * mulB, 2)}`)}입니다.`,
    );
  }
  const whole = intBetween(rng, 12, 987);
  const w = whole % 10 === 0 ? whole + 1 : whole;
  const stepsA = pick(rng, [1, 2]);
  const stepsB = stepsA === 1 ? 2 : 1;
  return make(
    unit,
    `어떤 수에 ${dj(dec(1, stepsA), "을", "를")} 곱했더니 ${dj(dec(w, stepsA), "이", "가")} 되었습니다. 어떤 수에 ${dj(dec(1, stepsB), "을", "를")} 곱하면 얼마입니까?`,
    expr(dec(w, stepsB)),
    `${dj(dec(1, stepsA), "을", "를")} 곱해 소수점이 왼쪽으로 ${n(stepsA)}칸 옮겨졌으므로, 어떤 수는 소수점을 오른쪽으로 ${n(stepsA)}칸 되돌린 ${n(w)}입니다. 여기에 ${dj(dec(1, stepsB), "을", "를")} 곱하면 ${expr(`${w}\\times${dec(1, stepsB)}=${dec(w, stepsB)}`)}입니다.`,
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2-4 확대 갈래 «심화중»·«심화상» — D-113 파일럿 (2026-08-30, **되짚기 축**)
 *
 * 🔴 **첫 판은 «열거 축»이었고 기각됐다.** 리드가 문형 경로 전량(6,900행)에 두 축을
 *    나란히 대 보니 열거는 갈래를 **1.5~2배**밖에 안 가르는데 되짚기는 **22~40배**
 *    가른다. 게다가 심화하 **안에서** 열거형은 평균 0.39걸음으로 **그 소단원의 연산
 *    (0.79)보다도 얕았다** — 열거를 위 두 칸의 정의로 쓰면 가장 얕은 것을 꼭대기로
 *    올리는 셈이다. 그래서 이 블록을 통째로 다시 짰다.
 *
 * ## 확정 잣대 — 되짚기 사슬의 «마디»가 굳는가
 *
 *   심화하  마디마다 값이 **하나로 굳는다**  `0.4×□=2.8` → □=7   (기존, 안 건드림)
 *   심화중  **굳지 않는 마디가 하나** 있고, **그 소단원의 성질**이 한 번에 굳혀 준다
 *   심화상  성질만으로는 못 굳혀서, 그 소단원의 계산으로 나올 수 있는 값들을
 *           **실제로 만들어 견주어야** 하나가 남는다. 그리고 그 후보를
 *           **발문이 주지 않고 되짚기가 만든다.**
 *
 * ## 이 파일이 쓰는 두 뼈대
 *
 * **㉠ 심화중 — 소수점을 한 자리 «잘못» 옮겼다** (`misplacedMid`)
 *    되짚기로 «잘못 쓴 수»까지는 하나로 굳는다. 그런데 **어느 쪽으로 옮겼는지를
 *    발문이 말하지 않는다** — 원래 수 후보가 둘이다. 그 마디를 **소단원의 이름**
 *    (「1보다 작은 소수 한 자리 수」…)이 한 번에 굳힌다.
 *    ⚠️ 방향을 발문에 적으면 마디가 굳어 **심화하가 된다.** 안 적는 것이 이 갈래다.
 *
 * **㉡ 심화상 — 곱만 알고 두 인수를 모른다** (`factorTop`)
 *    인수분해는 하나로 안 굳고, 소단원의 성질로도 여러 짝이 남는다. 그래서
 *    **짝마다 둘째 곱셈을 실제로 해 보고** 조건에 맞는 것을 골라야 한다.
 *
 *    🔴 **둘째 걸음만으로 풀리면 안 된다.** 조건 창에 드는 후보가 **둘 이상**이도록
 *    잡아, 「그중 어느 것이 곱을 만드는가」를 **인수 되짚기로** 갈라야만 답이 나오게
 *    했다(예: 창이 $6$·$7$ 을 남기고 $2.4$ 를 만드는 것은 $6$ 뿐이다). 이 조건이
 *    없으면 학생이 창만 보고 답을 얻어 되짚기가 장식이 된다.
 *
 * ## 반증문 ⑥ 을 **생성기가 스스로 막는다**
 *
 * 「발문이 준 수에 순방향 곱셈만으로 답이 나오면 중·상이 아니다」 — `forwardReach`
 * 가 그것을 세고, 걸리는 후보는 **애초에 안 만든다.** 판정기
 * (`scripts/qa/probe-elem-tier-backsolve.ts`)가 ④ 와 함께 밖에서 다시 잰다.
 *
 * 🔴 **숫자를 안 키웠다**(원장님). 소수는 한 자리, 자연수는 한 자리, 곱은 소수 두 자리
 *    안에 머문다(2-4-7 만 세 자리 — 그 소단원이 자리를 옮기는 단원이라서다).
 *
 * ⚠️ **갈래만 채운다 — 문형(`G5_FORMS`)은 안 건드린다**(D-113·D-114, 순서는 잣대 →
 *    갈래 → 문형 12 → 적재다). 그래서 적재본에는 한 건도 안 들어간다.
 * ──────────────────────────────────────────────────────────────────────────── */

/** 정수 스케일 수 — `[값, 소수점 아래 자릿수]`. 견주기·곱하기를 부동소수 없이 한다. */
type Sc = readonly [number, number];

/** 자릿수가 다른 둘을 견주기 위한 공통 분모(십만분의 일). */
const SC_Q = 100000;
const scQ = (s: Sc): number => s[0] * (SC_Q / 10 ** s[1]);
const scMul = (a: Sc, b: Sc): Sc => [a[0] * b[0], a[1] + b[1]];
/** 지면 표기 — `dec` 가 꼬리 0 을 접는다. */
const scText = (s: Sc): string => dec(s[0], s[1]);

/** 꼬리 0 을 접은 뒤 남는 소수 자릿수. 0 이면 자연수다. */
function scPlaces(s: Sc): number {
  let v = s[0];
  let d = s[1];
  while (d > 0 && v % 10 === 0) {
    v /= 10;
    d -= 1;
  }
  return d;
}

/** 소수점을 오른쪽(`+1`)·왼쪽(`-1`)으로 한 자리 옮긴 수. 자릿수는 정규화한다. */
function scShift(s: Sc, dir: 1 | -1): Sc {
  let v = s[0];
  let d = s[1] - dir;
  while (d < 0) {
    v *= 10;
    d += 1;
  }
  return [v, d];
}

/** `$6$, $7$로는` — 나열 뒤 «(으)로» 를 마지막 수의 소리에 맞춘다. */
function listRo(values: readonly Sc[]): string {
  const last = values[values.length - 1]!;
  return `${values.map((v) => n(scText(v))).join(", ")}${dro(scText(last))}는`;
}

/** 지면에 나갈 수를 유리수로 — 규칙은 `forwardReach.ts` **한 곳**에 있다. */
const scRat = (v: Sc): Rat => ratOfScaled(v[0], v[1]);

/**
 * 반증 ⑥ — 후보를 만들 때 **미리** 거른다.
 *
 * ⚠️ 여기서 넘기는 목록은 **지면에 찍힐 수를 «예측»한 것**이다. 예측이 새면
 *    순방향으로 풀리는 문항이 통과한다 — 2026-08-30 에 「$1$보다 작은 소수」의 `$1$`
 *    과 창의 경계를 빠뜨려 **14건**이 그렇게 샜다. 그래서 **판정기가 지면을 직접 읽어
 *    다시 잰다**(`probe-elem-tier-backsolve.ts`). 둘이 갈리면 판정기가 옳다.
 */
const forwardReach = (content: string, answer: Sc): boolean =>
  forwardReachable(pageNumbers(content), scRat(answer));

/* ── ㉠ 심화중 — 「소수점을 한 자리 잘못 옮긴 수로 계산했다」 ─────────────── */

type MisTask = { a: Sc; k: Sc; wrong: Sc; product: Sc; right: Sc };

const MIS_CACHE = new Map<string, MisTask[]>();

type MisSpec = {
  key: string;
  /** 참값 소수 후보 — 그 소단원의 성질을 만족하는 것만. */
  aPool: readonly Sc[];
  /** 곱하는 수 후보. */
  kPool: readonly Sc[];
  /** 어느 쪽으로 잘못 옮겼나 — **발문에는 안 적는다**(그래야 마디가 안 굳는다). */
  dir: 1 | -1;
  /** 소단원의 성질. 되짚기가 만든 두 후보 중 **하나만** 이걸 만족해야 한다. */
  holds: (v: Sc) => boolean;
  /** 지면에 나가는 수의 소수 자릿수 상한. */
  maxPlaces: number;
  /** 발문에 소단원 이름이 내건 크기의 소수가 있어야 한다. */
  shows: "under" | "over" | "any";
  /** 바른 값이 «소수»로 남아야 하나 (2-4-7 만 정수 답이 정상이다). */
  answerDecimal: boolean;
};

/** 발문에 보이는 수가 소단원 이름의 크기를 갖췄나. */
function showsOk(shown: readonly Sc[], want: MisSpec["shows"]): boolean {
  if (want === "any") return true;
  return shown.some(
    (s) =>
      scPlaces(s) >= 1 &&
      (want === "under" ? scQ(s) > 0 && scQ(s) < SC_Q : scQ(s) > SC_Q),
  );
}

function misTasks(spec: MisSpec, render: (t: MisTask) => string): MisTask[] {
  const cached = MIS_CACHE.get(spec.key);
  if (cached) return cached;
  const out: MisTask[] = [];
  for (const a of spec.aPool) {
    if (!spec.holds(a)) continue;
    const wrong = scShift(a, spec.dir);
    // 되짚기가 만드는 **다른 후보** — 발문이 방향을 안 말하므로 이것도 살아 있다.
    const other = scShift(wrong, spec.dir === 1 ? 1 : -1);
    // 🔴 마디가 «굳지 않아야» 한다. 다른 후보도 성질을 만족하면 답이 둘이 된다.
    // ⚠️ **오늘 이 줄은 0자리를 깎는다**(변이가 «산출물 그대로»로 거부된다) —
    //    지금 `holds` 가 전부 **자릿수**를 걸어서 반대쪽 후보가 늘 탈락하기 때문이다.
    //    회귀 가드로 남긴다: 자릿수를 안 거는 성질을 쓰는 날 처음 일한다.
    //    그 «굳음» 자체는 시험이 따로 센다(`elemTiersG5DecTop` ⑴).
    if (spec.holds(other)) continue;
    for (const k of spec.kPool) {
      const product = scMul(wrong, k);
      const right = scMul(a, k);
      if (
        [product, right, a, wrong, k].some((s) => scPlaces(s) > spec.maxPlaces)
      )
        continue;
      if (scQ(product) === scQ(right)) continue;
      // 🔴 어떤 수와 곱하는 수가 **같으면** 바른 값이 지면에 보이는 `k×k` 라,
      //    학생이 되짚지 않고 두 수를 곱해 맞힌다(판정기가 실측으로 잡았다).
      if (scQ(a) === scQ(k)) continue;
      // 답이 정수로 접히면 「소수의 곱셈」이 지면에서 사라진다(2-4-7 은 자리를
      // 옮기는 소단원이라 정수 답이 정상이므로 부르는 쪽이 끈다).
      if (spec.answerDecimal && scPlaces(right) < 1) continue;
      const task: MisTask = { a, k, wrong, product, right };
      if (!showsOk([product, k], spec.shows)) continue;
      // 🔴 **지면을 예측하지 않고 읽는다** — 예측하던 판이 14건을 흘렸다.
      if (forwardReach(render(task), right)) continue;
      out.push(task);
    }
  }
  MIS_CACHE.set(spec.key, out);
  return out;
}

/**
 * 심화중 문항 하나.
 *
 * `order` 는 그 소단원이 약속한 **차례**다 — 2-4-1·2 는 소수가 앞, 2-4-3·4 는 자연수가
 * 앞이다. 발문과 해설의 식이 그 차례를 지켜야 소단원 이름이 거짓말이 되지 않는다(반증 ③).
 */
function misplacedMid(
  unit: UnitSeed,
  rng: Rng,
  spec: MisSpec,
  property: string,
  order: "dec" | "whole",
): ElemProblem {
  // 🔴 **발문을 여기서 만들어 걸개에 넘긴다.** 걸개가 「지면에 무엇이 찍힐까」를
  //    예측하면 반드시 샌다 — 성질 문구의 `$1$` 과 되풀이되는 곱하는 수를 빠뜨려
  //    순방향으로 풀리는 문항 14건이 그렇게 통과했다(2026-08-30 실측).
  const content = (task: MisTask) => {
    const kt = scText(task.k);
    const lead =
      order === "dec"
        ? `어떤 수에 ${dj(kt, "을", "를")} 곱해야 할 것을, 어떤 수의 소수점을 한 자리 잘못 옮긴 수에 ${dj(kt, "을", "를")} 곱했더니`
        : `${n(kt)}에 어떤 수를 곱해야 할 것을, ${n(kt)}에 어떤 수의 소수점을 한 자리 잘못 옮긴 수를 곱했더니`;
    return (
      `${lead} ${dj(scText(task.product), "이", "가")} 되었습니다. ` +
      `어떤 수가 ${property}일 때 바르게 계산한 값을 구하시오.`
    );
  };
  const tasks = misTasks(spec, content);
  if (tasks.length === 0) {
    throw new Error(
      `«심화중» 후보가 하나도 없습니다: ${unit.grade} ${unit.section}`,
    );
  }
  const t = pick(rng, tasks);
  const times = (x: Sc, y: Sc) =>
    order === "dec"
      ? `${scText(x)}\\times${scText(y)}`
      : `${scText(y)}\\times${scText(x)}`;
  return makeDeep(unit, content(t), expr(scText(t.right)), [
    `잘못 쓴 수부터 되짚습니다. ${expr(`${times(t.wrong, t.k)}=${scText(t.product)}`)}이므로 잘못 쓴 수는 ${expr(scText(t.wrong))}입니다.`,
    `소수점을 한쪽으로 옮기면 ${dj(scText(t.a), "이", "가")} 되고 반대쪽으로 옮기면 ${property}가 아니므로, 어떤 수는 ${expr(scText(t.a))}입니다.`,
    `바르게 계산하면 ${expr(`${times(t.a, t.k)}=${scText(t.right)}`)}입니다.`,
  ]);
}

/* ── ㉡ 심화상 — 「곱만 알고 두 인수를 모른다 → 짝마다 계산해 견준다」 ────── */

type TopTask = {
  product: Sc;
  /** 답 — 되짚기로만 갈라지는 인수. */
  dec: Sc;
  /** 창 조건이 걸리는 인수. */
  other: Sc;
  probe: Sc;
  lo: Sc;
  hi: Sc;
  /** 창에는 들지만 곱을 못 만드는 «미끼» — 되짚기를 강제하는 근거다. */
  decoys: Sc[];
};

const TOP_CACHE = new Map<string, TopTask[]>();

type TopSpec = {
  key: string;
  /** 답이 되는 인수의 후보(그 소단원의 성질). */
  decPool: readonly Sc[];
  /** 창 조건이 걸리는 인수의 후보. */
  otherPool: readonly Sc[];
  probePool: readonly Sc[];
  boundPool: readonly Sc[];
  maxPlaces: number;
  shows: "under" | "over" | "any";
};

function topTasks(spec: TopSpec, render: (t: TopTask) => string): TopTask[] {
  const cached = TOP_CACHE.get(spec.key);
  if (cached) return cached;
  const out: TopTask[] = [];
  for (const probe of spec.probePool) {
    for (let i = 0; i < spec.boundPool.length; i += 1) {
      const lo = spec.boundPool[i]!;
      for (let j = i + 1; j < spec.boundPool.length; j += 1) {
        const hi = spec.boundPool[j]!;
        const inWindow = spec.otherPool.filter((o) => {
          const v = scQ(scMul(probe, o));
          return v > scQ(lo) && v < scQ(hi);
        });
        // 🔴 창이 하나만 남기면 학생이 창만 보고 답을 얻는다 — 되짚기가 장식이 된다.
        // 🔴 **이 한 줄이 이 갈래의 정의다.** 창이 후보를 하나만 남기면 학생이 창만
        //    보고 답을 얻어 되짚기가 장식이 된다. 상한은 해설이 읽히게 두는 몫이다.
        //
        // ⚠️ 예전에는 아래에 `decoys.length === 0` 도 있었는데, **둘이 서로를 가려**
        //    어느 쪽을 변이시켜도 산출물이 안 바뀌었다(하네스가 «판정 거부»로 알려 줬다).
        //    같은 것을 두 번 막으면 **둘 다 시험할 수 없게 된다** — 하나로 줄였다.
        if (inWindow.length < 2 || inWindow.length > 4) continue;
        if (inWindow.some((o) => scPlaces(scMul(probe, o)) > spec.maxPlaces))
          continue;
        for (const other of inWindow) {
          for (const decv of spec.decPool) {
            if (scPlaces(decv) < 1) continue;
            // 「두 소수 중 하나」와 「나머지」가 같은 값이면 발문이 뜻을 잃는다.
            if (scQ(decv) === scQ(other)) continue;
            const product = scMul(decv, other);
            if (scPlaces(product) > spec.maxPlaces) continue;
            // 창 안의 다른 후보가 같은 곱을 만들면 답이 둘이다.
            const rival = inWindow.some(
              (o) =>
                scQ(o) !== scQ(other) &&
                spec.decPool.some(
                  (d) => scPlaces(d) >= 1 && scQ(scMul(d, o)) === scQ(product),
                ),
            );
            if (rival) continue;
            const decoys = inWindow.filter((o) => scQ(o) !== scQ(other));
            const task: TopTask = {
              product,
              dec: decv,
              other,
              probe,
              lo,
              hi,
              decoys,
            };
            if (!showsOk([product, probe, lo, hi], spec.shows)) continue;
            if (forwardReach(render(task), decv)) continue;
            out.push(task);
          }
        }
      }
    }
  }
  TOP_CACHE.set(spec.key, out);
  return out;
}

function factorTop(
  unit: UnitSeed,
  rng: Rng,
  spec: TopSpec,
  words: { pair: string; other: string; ask: string },
  order: "dec" | "whole",
): ElemProblem {
  // 발문을 여기서 만들어 걸개에 넘긴다 — 「무엇이 찍힐까」를 예측하지 않는다.
  const content = (task: TopTask) => {
    const pt = scText(task.probe);
    const cond =
      order === "dec"
        ? `${dj(pt, "과", "와")} ${words.other}를 곱한 값`
        : `${words.other}와 ${dj(pt, "을", "를")} 곱한 값`;
    return (
      `${words.pair}${josa(words.pair, "을", "를")} 곱했더니 ${dj(scText(task.product), "이", "가")} 되었습니다. ` +
      `${cond}이 ${n(scText(task.lo))}보다 크고 ${n(scText(task.hi))}보다 작을 때, ${words.ask}를 구하시오.`
    );
  };
  const tasks = topTasks(spec, content);
  if (tasks.length === 0) {
    throw new Error(
      `«심화상» 후보가 하나도 없습니다: ${unit.grade} ${unit.section}`,
    );
  }
  const t = pick(rng, tasks);
  const times = (x: Sc, y: Sc) =>
    order === "dec"
      ? `${scText(x)}\\times${scText(y)}`
      : `${scText(y)}\\times${scText(x)}`;
  const probeOf = (o: Sc) =>
    `${times(t.probe, o)}=${scText(scMul(t.probe, o))}`;
  const window = [t.other, ...t.decoys].sort((a, b) => scQ(a) - scQ(b));
  const listed = window
    .map((o, i) =>
      i === window.length - 1 ? lj(probeOf(o), "이", "가") : expr(probeOf(o)),
    )
    .join(", ");
  return makeDeep(unit, content(t), expr(scText(t.dec)), [
    `먼저 조건에 맞는 ${words.other}를 찾습니다. ${listed} 그 사이에 듭니다.`,
    `그중 어느 것이 ${dj(scText(t.product), "을", "를")} 만드는지 봅니다. ${listRo(t.decoys)} 짝을 만들 수 없습니다.`,
    `${expr(`${times(t.dec, t.other)}=${scText(t.product)}`)}이므로 ${words.ask}는 ${expr(scText(t.dec))}입니다.`,
  ]);
}

/* ── 후보 묶음 — 소단원 이름이 그대로 조건이다 ─────────────────────────────── */

/** `0.1`~`0.9` — 1보다 작은 소수 한 자리 수. */
const P_UNDER1: Sc[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => [t, 1] as Sc);

/** 심화상의 «답» 후보에서는 `0.1` 을 뺀다 — 「$0.1$ 을 곱한다」는 2-4-7 의
 *  개념(자리 옮기기)이라, 이 소단원의 답으로 두면 무엇을 물었는지가 흐려진다. */
const P_UNDER1_ANS: Sc[] = P_UNDER1.filter((s) => s[0] >= 2);

/** `1.1`~`4.9` — 1보다 큰 소수 한 자리 수(`overOneT` 와 같은 범위). */
const P_OVER1: Sc[] = (() => {
  const out: Sc[] = [];
  for (let w = 1; w <= 4; w += 1)
    for (let f = 1; f <= 9; f += 1) out.push([w * 10 + f, 1]);
  return out;
})();

/** 둘째 걸음의 곱하는 수로 쓰는 `1.1`~`2.9` — 곱이 두 자리를 안 넘게 좁혔다. */
const P_OVER1_SMALL: Sc[] = P_OVER1.filter((s) => s[0] <= 29);

/** 한 자리 자연수 `2`~`9`. */
const P_NAT: Sc[] = [2, 3, 4, 5, 6, 7, 8, 9].map((k) => [k, 0] as Sc);

/** 소수 두 자리 `0.11`~`0.99`(끝자리 0 은 지면에서 접히므로 뺀다) — 2-4-7 참값. */
const P_HUND: Sc[] = (() => {
  const out: Sc[] = [];
  for (let v = 11; v <= 99; v += 1) if (v % 10 !== 0) out.push([v, 2]);
  return out;
})();

/** 자리를 옮기는 수. */
const P_POWERS: Sc[] = [
  [10, 0],
  [100, 0],
  [1000, 0],
];

const isUnder1Digit = (v: Sc) =>
  scPlaces(v) === 1 && scQ(v) > 0 && scQ(v) < SC_Q;
const isOver1Digit = (v: Sc) => scPlaces(v) === 1 && scQ(v) > SC_Q;
const isTwoPlaces = (v: Sc) => scPlaces(v) === 2;

/** 경계로 쓸 «반듯한 수»들. */
function scSteps(lo: number, hi: number, step: number, places: number): Sc[] {
  const out: Sc[] = [];
  for (let v = lo; v <= hi; v += step) out.push([v, places]);
  return out;
}

const UNDER_ONE_WORD = `${n(1)}보다 작은 소수 한 자리 수`;
const OVER_ONE_WORD = `${n(1)}보다 큰 소수 한 자리 수`;

/* ── 심화중 일곱 ──────────────────────────────────────────────────────────── */

function dm241Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return misplacedMid(
    unit,
    rng,
    {
      key: "g5-241-mid",
      aPool: P_UNDER1,
      kPool: P_NAT,
      dir: -1,
      holds: isUnder1Digit,
      maxPlaces: 2,
      shows: "under",
      answerDecimal: true,
    },
    UNDER_ONE_WORD,
    "dec",
  );
}

function dm242Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return misplacedMid(
    unit,
    rng,
    {
      key: "g5-242-mid",
      aPool: P_OVER1,
      kPool: P_NAT,
      dir: -1,
      holds: isOver1Digit,
      maxPlaces: 2,
      shows: "over",
      answerDecimal: true,
    },
    OVER_ONE_WORD,
    "dec",
  );
}

function dm243Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return misplacedMid(
    unit,
    rng,
    {
      key: "g5-243-mid",
      aPool: P_UNDER1,
      kPool: P_NAT,
      dir: -1,
      holds: isUnder1Digit,
      maxPlaces: 2,
      shows: "under",
      answerDecimal: true,
    },
    UNDER_ONE_WORD,
    "whole",
  );
}

function dm244Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return misplacedMid(
    unit,
    rng,
    {
      key: "g5-244-mid",
      aPool: P_OVER1,
      kPool: P_NAT,
      dir: -1,
      holds: isOver1Digit,
      maxPlaces: 2,
      shows: "over",
      answerDecimal: true,
    },
    OVER_ONE_WORD,
    "whole",
  );
}

function dm245Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return misplacedMid(
    unit,
    rng,
    {
      key: "g5-245-mid",
      aPool: P_UNDER1,
      kPool: P_UNDER1,
      dir: 1,
      holds: isUnder1Digit,
      maxPlaces: 2,
      shows: "under",
      answerDecimal: true,
    },
    UNDER_ONE_WORD,
    "dec",
  );
}

function dm246Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return misplacedMid(
    unit,
    rng,
    {
      key: "g5-246-mid",
      aPool: P_OVER1,
      kPool: P_OVER1,
      dir: 1,
      holds: isOver1Digit,
      maxPlaces: 2,
      shows: "over",
      answerDecimal: true,
    },
    OVER_ONE_WORD,
    "dec",
  );
}

/** 2-4-7 은 굳히는 성질이 **자릿수**다 — 그 소단원이 묻는 것이 곧 자리이기 때문. */
function dm247Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return misplacedMid(
    unit,
    rng,
    {
      key: "g5-247-mid",
      aPool: P_HUND,
      kPool: P_POWERS,
      dir: 1,
      holds: isTwoPlaces,
      maxPlaces: 3,
      shows: "any",
      answerDecimal: false,
    },
    "소수 두 자리 수",
    "dec",
  );
}

/* ── 심화상 여섯 + 2-4-7 ─────────────────────────────────────────────────── */

function dm241Top(unit: UnitSeed, rng: Rng): ElemProblem {
  return factorTop(
    unit,
    rng,
    {
      key: "g5-241-top",
      decPool: P_UNDER1_ANS,
      otherPool: P_NAT,
      probePool: P_UNDER1,
      boundPool: scSteps(1, 9, 1, 0),
      maxPlaces: 2,
      shows: "under",
    },
    {
      pair: `어떤 ${UNDER_ONE_WORD}와 어떤 한 자리 자연수`,
      other: "그 자연수",
      ask: "처음의 소수",
    },
    "dec",
  );
}

function dm242Top(unit: UnitSeed, rng: Rng): ElemProblem {
  return factorTop(
    unit,
    rng,
    {
      key: "g5-242-top",
      decPool: P_OVER1,
      otherPool: P_NAT,
      probePool: P_OVER1_SMALL,
      boundPool: scSteps(2, 26, 2, 0),
      maxPlaces: 2,
      shows: "over",
    },
    {
      pair: `어떤 ${OVER_ONE_WORD}와 어떤 한 자리 자연수`,
      other: "그 자연수",
      ask: "처음의 소수",
    },
    "dec",
  );
}

function dm243Top(unit: UnitSeed, rng: Rng): ElemProblem {
  return factorTop(
    unit,
    rng,
    {
      key: "g5-243-top",
      decPool: P_UNDER1_ANS,
      otherPool: P_NAT,
      probePool: P_UNDER1,
      boundPool: scSteps(1, 9, 1, 0),
      maxPlaces: 2,
      shows: "under",
    },
    {
      pair: `어떤 한 자리 자연수와 어떤 ${UNDER_ONE_WORD}`,
      other: "그 자연수",
      ask: "처음의 소수",
    },
    "whole",
  );
}

function dm244Top(unit: UnitSeed, rng: Rng): ElemProblem {
  return factorTop(
    unit,
    rng,
    {
      key: "g5-244-top",
      decPool: P_OVER1,
      otherPool: P_NAT,
      probePool: P_OVER1_SMALL,
      boundPool: scSteps(2, 26, 2, 0),
      maxPlaces: 2,
      shows: "over",
    },
    {
      pair: `어떤 한 자리 자연수와 어떤 ${OVER_ONE_WORD}`,
      other: "그 자연수",
      ask: "처음의 소수",
    },
    "whole",
  );
}

function dm245Top(unit: UnitSeed, rng: Rng): ElemProblem {
  return factorTop(
    unit,
    rng,
    {
      key: "g5-245-top",
      decPool: P_UNDER1_ANS,
      otherPool: P_UNDER1,
      probePool: P_UNDER1,
      boundPool: scSteps(5, 90, 5, 2),
      maxPlaces: 2,
      shows: "under",
    },
    {
      pair: `${UNDER_ONE_WORD} 둘`,
      other: "두 소수 중 하나",
      ask: "나머지 한 소수",
    },
    "dec",
  );
}

function dm246Top(unit: UnitSeed, rng: Rng): ElemProblem {
  return factorTop(
    unit,
    rng,
    {
      key: "g5-246-top",
      decPool: P_OVER1,
      otherPool: P_OVER1,
      probePool: P_OVER1_SMALL,
      boundPool: scSteps(10, 140, 5, 1),
      maxPlaces: 2,
      shows: "over",
    },
    {
      pair: `${OVER_ONE_WORD} 둘`,
      other: "두 소수 중 하나",
      ask: "나머지 한 소수",
    },
    "dec",
  );
}

/* ── 2-4-7 심화상 — 「어느 수를 곱했는지 모른다」 ──────────────────────────── */

type PointTask = {
  product: Sc;
  powers: [Sc, Sc];
  answer: Sc;
  otherCand: Sc;
  probe: Sc;
  /** 후보 둘을 가르는 **하나뿐인** 경계. */
  cut: Sc;
  side: "less" | "greater";
};

const POINT_CACHE = new Map<string, PointTask[]>();

/**
 * 되짚기가 **두 후보**를 만든다(어느 수를 곱했는지 모르므로). 둘 다 소수라
 * 「소수다」라는 성질로는 안 굳고, **각각에 다시 곱해 봐야** 하나가 남는다.
 */
function pointTasks(): PointTask[] {
  const cached = POINT_CACHE.get("g5-247-top");
  if (cached) return cached;
  const out: PointTask[] = [];
  const probes: Sc[] = [
    [1, 1],
    [1, 2],
    [10, 0],
    [100, 0],
  ];
  const bounds: Sc[] = [
    [1, 3],
    [5, 3],
    [1, 2],
    [5, 2],
    [1, 1],
    [5, 1],
    [1, 0],
    [5, 0],
    [10, 0],
    [50, 0],
    [100, 0],
    [500, 0],
  ];
  for (let i = 0; i < P_POWERS.length; i += 1) {
    for (let j = i + 1; j < P_POWERS.length; j += 1) {
      const a = P_POWERS[i]!;
      const b = P_POWERS[j]!;
      for (const base of P_HUND) {
        // 곱은 둘 중 **한쪽**으로 만든다 — 어느 쪽인지는 발문이 말하지 않는다.
        for (const [used, unused] of [
          [a, b],
          [b, a],
        ] as const) {
          const product = scMul(base, used);
          if (scPlaces(product) > 3) continue;
          // 다른 후보 — 곱을 반대쪽 수로 되짚은 값.
          const ratio = scQ(unused) / scQ(used);
          const otherCand: Sc = [
            base[0],
            base[1] + Math.round(Math.log10(ratio)),
          ];
          if (otherCand[1] < 1 || otherCand[1] > 3) continue;
          if (scPlaces(otherCand) < 1 || scPlaces(base) < 1) continue;
          for (const probe of probes) {
            // 🔴 둘째 걸음의 곱하는 수가 발문이 준 두 수 중 하나면, 조건이 앞 문장을
            //    되풀이하는 꼴이 되어 되짚기가 겉돈다(실측으로 걸렸다).
            if (scQ(probe) === scQ(used) || scQ(probe) === scQ(unused))
              continue;
            const v1 = scMul(base, probe);
            const v2 = scMul(otherCand, probe);
            if (scPlaces(v1) > 3 || scPlaces(v2) > 3) continue;
            if (scQ(v1) === scQ(v2)) continue;
            // 🔴 **경계는 하나만 쓴다.** 후보가 둘뿐이라 한쪽만 잘라도 갈리는데,
            //    양쪽을 쓰면 한쪽이 «$0.005$보다 크고» 처럼 아무것도 안 하는 말이
            //    된다(첫 판에서 실제로 그렇게 나갔다). 학생이 읽는 조건은 실제로
            //    일하는 것만 남긴다.
            for (const cut of bounds) {
              const side: "less" | "greater" | null =
                scQ(v1) < scQ(cut) && scQ(v2) > scQ(cut)
                  ? "less"
                  : scQ(v1) > scQ(cut) && scQ(v2) < scQ(cut)
                    ? "greater"
                    : null;
              if (side === null) continue;
              const task: PointTask = {
                product,
                powers: [a, b],
                answer: base,
                otherCand,
                probe,
                cut,
                side,
              };
              // 여기서도 «찍힌 지면»을 읽는다 — 예측하지 않는다.
              if (forwardReach(pointContent(task), base)) continue;
              out.push(task);
            }
          }
        }
      }
    }
  }
  POINT_CACHE.set("g5-247-top", out);
  return out;
}

/** 2-4-7 심화상의 발문 — **걸개와 지면이 같은 글을 본다**(예측 금지). */
function pointContent(t: PointTask): string {
  const [p1, p2] = t.powers;
  return (
    `어떤 소수에 ${n(scText(p1))} 또는 ${dj(scText(p2), "을", "를")} 곱했더니 ` +
    `${dj(scText(t.product), "이", "가")} 되었습니다. ` +
    `어떤 소수에 ${dj(scText(t.probe), "을", "를")} 곱한 값이 ` +
    `${n(scText(t.cut))}보다 ${t.side === "less" ? "작을" : "클"} 때, 어떤 소수를 구하시오.`
  );
}

function dm247Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const tasks = pointTasks();
  if (tasks.length === 0) {
    throw new Error(
      `«심화상» 후보가 하나도 없습니다: ${unit.grade} ${unit.section}`,
    );
  }
  const t = pick(rng, tasks);
  const say = (v: Sc) =>
    `${scText(v)}\\times${scText(t.probe)}=${scText(scMul(v, t.probe))}`;
  return makeDeep(unit, pointContent(t), expr(scText(t.answer)), [
    `소수점을 되돌리면 어떤 소수는 ${expr(scText(t.answer))} 또는 ${expr(scText(t.otherCand))}입니다. 둘 다 소수라 이것만으로는 못 정합니다.`,
    `${dj(scText(t.probe), "을", "를")} 각각 곱해 봅니다. ${expr(say(t.answer))}, ${expr(say(t.otherCand))}입니다.`,
    `${n(scText(t.cut))}보다 ${t.side === "less" ? "작은" : "큰"} 것은 ${expr(scText(scMul(t.answer, t.probe)))}이므로 어떤 소수는 ${expr(scText(t.answer))}입니다.`,
  ]);
}

/** 문형 05 — 소수점을 잠시 무시하고 곱한 수. 1보다 작은 소수×자연수. */
function dm241IgnorePoint(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const t = underOneT(rng, (x) => (x * k) % 10 !== 0);
  return make(
    unit,
    `${dj(dec(t, 1), "과", "와")} ${nj(k, "을", "를")} 곱할 때, 소수점을 잠시 무시하고 자연수끼리 곱하면 얼마입니까?`,
    n(t * k),
    `${nj(t, "과", "와")} ${nj(k, "을", "를")} 곱하면 ${n(t * k)}입니다.`,
  );
}

/** 문형 06 — 곱의 소수 첫째 자리 숫자. */
function dm241FirstDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const t = underOneT(rng, (x) => (x * k) % 10 !== 0);
  const prod = t * k;
  const digit = prod % 10;
  return make(
    unit,
    `${expr(`${dec(t, 1)}\\times${k}`)}의 값에서 소수 첫째 자리 숫자는 무엇입니까?`,
    n(digit),
    `값은 ${expr(dec(prod, 1))}이므로 소수 첫째 자리 숫자는 ${n(digit)}입니다.`,
  );
}

/** 문형 07 — 처음 소수를 거슬러 구한다. 심화는 자연수 쪽이다. */
function dm241FindDec(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const t = underOneT(rng, (x) => (x * k) % 10 !== 0);
  return make(
    unit,
    `□ 안에 알맞은 소수를 구하시오.  ${expr(`\\square\\times${k}=${dec(t * k, 1)}`)}`,
    expr(dec(t, 1)),
    `□는 결과를 ${nro(k)} 나눈 수입니다. ${expr(`${dec(t, 1)}\\times${k}=${dec(t * k, 1)}`)}이므로 □는 ${expr(dec(t, 1))}입니다.`,
  );
}

/** 문형 08 — 곱에서 처음 소수를 뺀다. */
function dm241ThenSub(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 3, 9);
  const t = underOneT(rng, (x) => (x * k) % 10 !== 0 && (x * k - x) % 10 !== 0);
  const prod = t * k;
  return make(
    unit,
    `${dj(dec(t, 1), "과", "와")} ${nj(k, "을", "를")} 곱한 값에서 ${expr(dec(t, 1))}를 빼면 얼마입니까?`,
    expr(dec(prod - t, 1)),
    `곱은 ${expr(dec(prod, 1))}입니다. ${expr(`${dec(prod, 1)}-${dec(t, 1)}=${dec(prod - t, 1)}`)}입니다.`,
  );
}

/** 문형 09 — 곱이 1보다 큰지 판정. */
function dm241OverOne(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantOver = altCase(rng);
  const k = wantOver ? intBetween(rng, 2, 9) : intBetween(rng, 2, 4);
  const cands = [2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x * k > 10 === wantOver);
  const t = pick(rng, cands.length ? cands : wantOver ? [9] : [2]);
  const over = t * k > 10;
  return make(
    unit,
    `${expr(`${dec(t, 1)}\\times${k}`)}의 값은 ${n(1)}보다 큽니까? (예, 아니요)`,
    over ? "예" : "아니요",
    `값은 ${expr(dec(t * k, 1))}이므로 ${over ? "1보다 큽니다" : "1보다 크지 않습니다"}.`,
  );
}

/** 문형 10 — 곱에 다른 자연수를 한 번 더 곱한다. */
function dm241TimesMore(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 6);
  const m = pick(
    rng,
    [2, 3, 4, 5].filter((v) => v !== k),
  );
  const t = underOneT(rng, (x) => (x * k * m) % 10 !== 0);
  return make(
    unit,
    `${expr(`${dec(t, 1)}\\times${k}`)}의 값에 ${nj(m, "을", "를")} 곱하면 얼마입니까?`,
    expr(dec(t * k * m, 1)),
    `먼저 ${expr(`${dec(t, 1)}\\times${k}=${dec(t * k, 1)}`)}이고, 여기에 ${nj(m, "을", "를")} 곱하면 ${expr(dec(t * k * m, 1))}입니다.`,
  );
}

/** 문형 05 — 소수점을 무시하고 곱한 수. 1보다 큰 소수×자연수. */
function dm242IgnorePoint(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const a = overOneT(rng, (x) => (x * k) % 10 !== 0);
  return make(
    unit,
    `${dj(dec(a, 1), "과", "와")} ${nj(k, "을", "를")} 곱할 때, 소수점을 잠시 무시하고 자연수끼리 곱하면 얼마입니까?`,
    n(a * k),
    `${nj(a, "과", "와")} ${nj(k, "을", "를")} 곱하면 ${n(a * k)}입니다.`,
  );
}

/** 문형 06 — 곱의 소수 첫째 자리 숫자. */
function dm242FirstDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const a = overOneT(rng, (x) => (x * k) % 10 !== 0);
  const digit = (a * k) % 10;
  return make(
    unit,
    `${expr(`${dec(a, 1)}\\times${k}`)}의 값에서 소수 첫째 자리 숫자는 무엇입니까?`,
    n(digit),
    `값은 ${expr(dec(a * k, 1))}이므로 소수 첫째 자리 숫자는 ${n(digit)}입니다.`,
  );
}

/** 문형 07 — 처음 소수를 거슬러 구한다. */
function dm242FindDec(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const a = overOneT(rng, (x) => (x * k) % 10 !== 0);
  return make(
    unit,
    `□ 안에 알맞은 소수를 구하시오.  ${expr(`\\square\\times${k}=${dec(a * k, 1)}`)}`,
    expr(dec(a, 1)),
    `□는 결과를 ${nro(k)} 나눈 수입니다. ${expr(`${dec(a, 1)}\\times${k}=${dec(a * k, 1)}`)}이므로 □는 ${expr(dec(a, 1))}입니다.`,
  );
}

/** 문형 08 — 곱에서 처음 소수를 뺀다. */
function dm242ThenSub(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const a = overOneT(rng, (x) => (x * k) % 10 !== 0 && (x * k - x) % 10 !== 0);
  return make(
    unit,
    `${dj(dec(a, 1), "과", "와")} ${nj(k, "을", "를")} 곱한 값에서 ${expr(dec(a, 1))}를 빼면 얼마입니까?`,
    expr(dec(a * k - a, 1)),
    `곱은 ${expr(dec(a * k, 1))}입니다. ${expr(`${dec(a * k, 1)}-${dec(a, 1)}=${dec(a * k - a, 1)}`)}입니다.`,
  );
}

/** 문형 09 — 곱이 어떤 수보다 큰지. 비교 대상을 씨앗이 고른다(1보다 큰 소수×자연수는 항상 k보다 크다). */
function dm242VsNatural(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantOver = altCase(rng);
  const k = intBetween(rng, 2, 9);
  const a = overOneT(rng, (x) => (x * k) % 10 !== 0);
  const prodTenths = a * k;
  const target = wantOver
    ? k
    : Math.floor(prodTenths / 10) + intBetween(rng, 2, 8);
  const over = prodTenths > target * 10;
  return make(
    unit,
    `${expr(`${dec(a, 1)}\\times${k}`)}의 값은 ${nj(target, "보다", "보다")} 큽니까? (예, 아니요)`,
    over ? "예" : "아니요",
    `값은 ${expr(dec(prodTenths, 1))}이고 ${n(target)}과 견주면 ${over ? "더 큽니다" : "더 크지 않습니다"}.`,
  );
}

/** 문형 10 — 두 종류의 길이 차. 응용은 합이다. */
function dm242DiffTwo(unit: UnitSeed, rng: Rng): ElemProblem {
  const k1 = intBetween(rng, 2, 5);
  const a = overOneT(rng, (x) => (x * k1) % 10 !== 0);
  const { b, k2 } = sumPairOverOne(rng, a, k1);
  const left = a * k1;
  const right = b * k2;
  const big = Math.max(left, right);
  const small = Math.min(left, right);
  const gap = big - small;
  const ok = gap % 10 !== 0 && gap > 0;
  const gapOut = ok ? gap : big;
  return make(
    unit,
    `길이가 ${expr(dec(a, 1))} m인 막대 ${n(k1)}개의 길이와 ${expr(dec(b, 1))} m인 막대 ${n(k2)}개의 길이의 ${ok ? "차는" : "중 더 긴 쪽은"} 몇 m입니까?`,
    expr(dec(gapOut, 1)),
    `${expr(`${dec(a, 1)}\\times${k1}=${dec(left, 1)}`)}, ${expr(`${dec(b, 1)}\\times${k2}=${dec(right, 1)}`)}이므로 ${ok ? `차는 ${expr(dec(gap, 1))}` : `더 긴 쪽은 ${expr(dec(big, 1))}`} m입니다.`,
  );
}

/** 문형 05 — 소수점을 무시하고 곱한 수. 자연수×1보다 작은 소수. */
function dm243IgnorePoint(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const t = underOneT(rng, (x) => (x * k) % 10 !== 0);
  return make(
    unit,
    `${nj(k, "과", "와")} ${dj(dec(t, 1), "을", "를")} 곱할 때, 소수점을 잠시 무시하고 자연수끼리 곱하면 얼마입니까?`,
    n(k * t),
    `${nj(k, "과", "와")} ${nj(t, "을", "를")} 곱하면 ${n(k * t)}입니다.`,
  );
}

/** 문형 06 — 소수 첫째 자리 숫자. */
function dm243FirstDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const t = underOneT(rng, (x) => (x * k) % 10 !== 0);
  const digit = (k * t) % 10;
  return make(
    unit,
    `${expr(`${k}\\times${dec(t, 1)}`)}의 값에서 소수 첫째 자리 숫자는 무엇입니까?`,
    n(digit),
    `값은 ${expr(dec(k * t, 1))}이므로 소수 첫째 자리 숫자는 ${n(digit)}입니다.`,
  );
}

/** 문형 07 — 소수 쪽을 거슬러 구한다. 심화는 자연수 쪽이다. */
function dm243FindDec(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const t = underOneT(rng, (x) => (x * k) % 10 !== 0);
  return make(
    unit,
    `□ 안에 알맞은 소수를 구하시오.  ${expr(`${k}\\times\\square=${dec(k * t, 1)}`)}`,
    expr(dec(t, 1)),
    `□는 결과를 ${nro(k)} 나눈 수입니다. ${expr(`${k}\\times${dec(t, 1)}=${dec(k * t, 1)}`)}이므로 □는 ${expr(dec(t, 1))}입니다.`,
  );
}

/** 문형 08 — 곱이 1보다 큰지. 비교를 1과 한다. */
function dm243OverOne(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantOver = altCase(rng);
  const k = wantOver ? intBetween(rng, 2, 9) : intBetween(rng, 2, 4);
  const cands = [2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x * k > 10 === wantOver);
  const t = pick(rng, cands.length ? cands : wantOver ? [9] : [2]);
  const over = k * t > 10;
  return make(
    unit,
    `${expr(`${k}\\times${dec(t, 1)}`)}의 값은 ${n(1)}보다 큽니까? (예, 아니요)`,
    over ? "예" : "아니요",
    `값은 ${expr(dec(k * t, 1))}이므로 ${over ? "1보다 큽니다" : "1보다 크지 않습니다"}.`,
  );
}

/** 문형 09 — 곱에 같은 소수를 한 번 더 곱한다. */
function dm243TimesAgain(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const t = underOneT(rng, (x) => (x * k * x) % 10 !== 0);
  return make(
    unit,
    `${expr(`${k}\\times${dec(t, 1)}`)}의 값에 ${expr(dec(t, 1))}를 한 번 더 곱하면 얼마입니까?`,
    expr(dec(k * t * t, 2)),
    `먼저 ${expr(`${k}\\times${dec(t, 1)}=${dec(k * t, 1)}`)}이고, 여기에 ${expr(dec(t, 1))}를 곱하면 ${expr(dec(k * t * t, 2))}입니다.`,
  );
}

/** 문형 10 — 쓰지 않은 비율에 해당하는 양. 응용은 남은 양(k − 곱)이다. 여기서는 (1 − 소수)×k와 같으므로 응용과 답이 같다. 대신 소수끼리의 차 × 자연수. */
function dm243TwoParts(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const t = underOneT(rng, (x) => x <= 6);
  const u = underOneT(
    rng,
    (x) => x !== t && x + t < 10 && (k * Math.abs(x - t)) % 10 !== 0,
  );
  const gap = Math.abs(t - u);
  return make(
    unit,
    `${n(k)}의 ${expr(dec(t, 1))}배와 ${n(k)}의 ${expr(dec(u, 1))}배의 차는 얼마입니까?`,
    expr(dec(k * gap, 1)),
    `${expr(`${k}\\times${dec(t, 1)}=${dec(k * t, 1)}`)}, ${expr(`${k}\\times${dec(u, 1)}=${dec(k * u, 1)}`)}이므로 차는 ${expr(dec(k * gap, 1))}입니다.`,
  );
}

/** 문형 05 — 소수점을 무시하고 곱한 수. 자연수×1보다 큰 소수. */
function dm244IgnorePoint(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const a = overOneT(rng, (x) => (x * k) % 10 !== 0);
  return make(
    unit,
    `${nj(k, "과", "와")} ${dj(dec(a, 1), "을", "를")} 곱할 때, 소수점을 잠시 무시하고 자연수끼리 곱하면 얼마입니까?`,
    n(k * a),
    `${nj(k, "과", "와")} ${nj(a, "을", "를")} 곱하면 ${n(k * a)}입니다.`,
  );
}

/** 문형 06 — 소수 첫째 자리 숫자. */
function dm244FirstDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const a = overOneT(rng, (x) => (x * k) % 10 !== 0);
  const digit = (k * a) % 10;
  return make(
    unit,
    `${expr(`${k}\\times${dec(a, 1)}`)}의 값에서 소수 첫째 자리 숫자는 무엇입니까?`,
    n(digit),
    `값은 ${expr(dec(k * a, 1))}이므로 소수 첫째 자리 숫자는 ${n(digit)}입니다.`,
  );
}

/** 문형 07 — 소수 쪽을 거슬러 구한다. */
function dm244FindDec(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const a = overOneT(rng, (x) => (x * k) % 10 !== 0);
  return make(
    unit,
    `□ 안에 알맞은 소수를 구하시오.  ${expr(`${k}\\times\\square=${dec(k * a, 1)}`)}`,
    expr(dec(a, 1)),
    `□는 결과를 ${nro(k)} 나눈 수입니다. ${expr(`${k}\\times${dec(a, 1)}=${dec(k * a, 1)}`)}이므로 □는 ${expr(dec(a, 1))}입니다.`,
  );
}

/** 문형 08 — 곱에서 처음 자연수를 뺀다. */
function dm244ThenSub(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const a = overOneT(
    rng,
    (x) => (x * k) % 10 !== 0 && (x * k - k * 10) % 10 !== 0,
  );
  return make(
    unit,
    `${nj(k, "과", "와")} ${dj(dec(a, 1), "을", "를")} 곱한 값에서 ${nj(k, "을", "를")} 빼면 얼마입니까?`,
    expr(dec(k * a - k * 10, 1)),
    `곱은 ${expr(dec(k * a, 1))}입니다. ${expr(`${dec(k * a, 1)}-${k}=${dec(k * a - k * 10, 1)}`)}입니다.`,
  );
}

/** 문형 09 — 곱이 1보다 큰지. 1보다 큰 소수×2 이상이므로 거의 예. 비교를 10과 한다. */
function dm244OverTen(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 9);
  const a = overOneT(rng, (x) => (x * k) % 10 !== 0);
  const over = k * a > 100;
  return make(
    unit,
    `${expr(`${k}\\times${dec(a, 1)}`)}의 값은 ${n(10)}보다 큽니까? (예, 아니요)`,
    over ? "예" : "아니요",
    `값은 ${expr(dec(k * a, 1))}이므로 ${over ? "10보다 큽니다" : "10보다 크지 않습니다"}.`,
  );
}

/** 문형 10 — 두 배의 차. 응용은 합이다. */
function dm244DiffTwo(unit: UnitSeed, rng: Rng): ElemProblem {
  const k1 = intBetween(rng, 2, 6);
  const a = overOneT(rng, (x) => (x * k1) % 10 !== 0);
  const { b, k2 } = sumPairOverOne(rng, a, k1);
  const left = k1 * a;
  const right = k2 * b;
  const big = Math.max(left, right);
  const small = Math.min(left, right);
  const gap = big - small;
  const ok = gap % 10 !== 0 && gap > 0;
  return make(
    unit,
    `${n(k1)} m인 끈의 ${expr(dec(a, 1))}배와 ${n(k2)} m인 끈의 ${expr(dec(b, 1))}배의 ${ok ? "차는" : "중 더 긴 쪽은"} 몇 m입니까?`,
    expr(dec(ok ? gap : big, 1)),
    `${expr(`${k1}\\times${dec(a, 1)}=${dec(left, 1)}`)}, ${expr(`${k2}\\times${dec(b, 1)}=${dec(right, 1)}`)}이므로 ${ok ? `차는 ${expr(dec(gap, 1))}` : `더 긴 쪽은 ${expr(dec(big, 1))}`} m입니다.`,
  );
}

/** 문형 05 — 십분의 일 정수끼리 곱. 1보다 작은 소수×1보다 작은 소수. */
function dm245IgnorePoint(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = underOneT(rng);
  const b = underOneT(rng, (x) => (a * x) % 10 !== 0);
  return make(
    unit,
    `${dj(dec(a, 1), "과", "와")} ${dj(dec(b, 1), "을", "를")} 곱할 때, 소수점을 잠시 무시하고 자연수끼리 곱하면 얼마입니까?`,
    n(a * b),
    `${nj(a, "과", "와")} ${nj(b, "을", "를")} 곱하면 ${n(a * b)}입니다.`,
  );
}

/** 문형 06 — 곱은 소수 몇 자리인가. 발문에 두 소수가 서서 변형이 갈린다. */
function dm245Places(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = underOneT(rng);
  const b = underOneT(rng, (x) => (a * x) % 10 !== 0);
  return make(
    unit,
    `${dj(dec(a, 1), "과", "와")} ${dj(dec(b, 1), "을", "를")} 곱하면 소수 몇 자리의 수가 됩니까?`,
    n(2),
    `소수 한 자리끼리 곱하면 소수 두 자리가 됩니다. 값은 ${expr(dec(a * b, 2))}입니다.`,
  );
}

/** 문형 07 — 한쪽 소수를 거슬러 구한다. 심화와 빈칸 자리가 반대. */
function dm245FindOther(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = underOneT(rng);
  const b = underOneT(rng, (x) => (a * x) % 10 !== 0);
  return make(
    unit,
    `□ 안에 알맞은 소수를 구하시오.  ${expr(`\\square\\times${dec(b, 1)}=${dec(a * b, 2)}`)}`,
    expr(dec(a, 1)),
    `□는 결과를 ${expr(dec(b, 1))}${dro(dec(b, 1))} 나눈 수입니다. ${expr(`${dec(a, 1)}\\times${dec(b, 1)}=${dec(a * b, 2)}`)}이므로 □는 ${expr(dec(a, 1))}입니다.`,
  );
}

/** 문형 08 — 곱이 0.1보다 큰지. */
function dm245OverTenth(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantOver = altCase(rng);
  const a = wantOver ? intBetween(rng, 4, 9) : intBetween(rng, 2, 3);
  const cands = [2, 3, 4, 5, 6, 7, 8, 9].filter((x) => a * x > 10 === wantOver);
  const b = pick(rng, cands.length ? cands : wantOver ? [9] : [2]);
  const over = a * b > 10;
  return make(
    unit,
    `${expr(`${dec(a, 1)}\\times${dec(b, 1)}`)}의 값은 ${expr("0.1")}보다 큽니까? (예, 아니요)`,
    over ? "예" : "아니요",
    `값은 ${expr(dec(a * b, 2))}이므로 ${over ? "0.1보다 큽니다" : "0.1보다 크지 않습니다"}.`,
  );
}

/** 문형 09 — 곱에 0.1을 더한다. 응용은 화단 k개의 넓이 합이라 지문이 겹친다. */
function dm245TwoAreas(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = underOneT(rng);
  const b = underOneT(rng, (x) => (a * x) % 10 !== 0);
  return make(
    unit,
    `${expr(`${dec(a, 1)}\\times${dec(b, 1)}`)}의 값에 ${expr("0.1")}을 더하면 얼마입니까?`,
    expr(dec(a * b + 10, 2)),
    `곱은 ${expr(dec(a * b, 2))}이므로 ${expr(`${dec(a * b, 2)}+0.1=${dec(a * b + 10, 2)}`)}입니다.`,
  );
}

/** 문형 10 — 두 소수 중 더 큰 수. */
function dm245Bigger(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = underOneT(rng);
  const b = underOneT(rng, (x) => x !== a);
  const big = Math.max(a, b);
  return make(
    unit,
    `${dj(dec(a, 1), "과", "와")} ${dj(dec(b, 1), "중", "중")} 더 큰 수는 무엇입니까?`,
    expr(dec(big, 1)),
    `${a > b ? expr(dec(a, 1)) : expr(dec(b, 1))}이 더 큽니다.`,
  );
}

/** 문형 05 — 소수점을 무시하고 곱한 수. 1보다 큰 소수×1보다 큰 소수. */
function dm246IgnorePoint(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = overOneT(rng);
  const b = overOneT(rng, (x) => (a * x) % 10 !== 0);
  return make(
    unit,
    `${dj(dec(a, 1), "과", "와")} ${dj(dec(b, 1), "을", "를")} 곱할 때, 소수점을 잠시 무시하고 자연수끼리 곱하면 얼마입니까?`,
    n(a * b),
    `${nj(a, "과", "와")} ${nj(b, "을", "를")} 곱하면 ${n(a * b)}입니다.`,
  );
}

/** 문형 06 — 곱은 소수 몇 자리인가. */
function dm246Places(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = overOneT(rng);
  const b = overOneT(rng, (x) => (a * x) % 10 !== 0);
  return make(
    unit,
    `${dj(dec(a, 1), "과", "와")} ${dj(dec(b, 1), "을", "를")} 곱하면 소수 몇 자리의 수가 됩니까?`,
    n(2),
    `소수 한 자리끼리 곱하면 소수 두 자리가 됩니다. 값은 ${expr(dec(a * b, 2))}입니다.`,
  );
}

/** 문형 07 — 한쪽 소수를 거슬러 구한다. 심화와 빈칸 자리가 반대. */
function dm246FindOther(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = overOneT(rng);
  const b = overOneT(rng, (x) => (a * x) % 10 !== 0);
  return make(
    unit,
    `□ 안에 알맞은 소수를 구하시오.  ${expr(`${dec(a, 1)}\\times\\square=${dec(a * b, 2)}`)}`,
    expr(dec(b, 1)),
    `□는 결과를 ${expr(dec(a, 1))}${dro(dec(a, 1))} 나눈 수입니다. ${expr(`${dec(a, 1)}\\times${dec(b, 1)}=${dec(a * b, 2)}`)}이므로 □는 ${expr(dec(b, 1))}입니다.`,
  );
}

/** 문형 08 — 곱이 10보다 큰지. */
function dm246OverTen(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantOver = altCase(rng);
  const band: number[] = [];
  for (let w = 1; w <= 4; w += 1)
    for (let f = 1; f <= 9; f += 1) {
      const t = w * 10 + f;
      if (wantOver ? t >= 32 : t <= 24) band.push(t);
    }
  const a = pick(rng, band);
  const bCands = band.filter((x) => (a * x) % 10 !== 0);
  const b = pick(rng, bCands.length ? bCands : band);
  const over = a * b > 1000;
  return make(
    unit,
    `${expr(`${dec(a, 1)}\\times${dec(b, 1)}`)}의 값은 ${n(10)}보다 큽니까? (예, 아니요)`,
    over ? "예" : "아니요",
    `값은 ${expr(dec(a * b, 2))}이므로 ${over ? "10보다 큽니다" : "10보다 크지 않습니다"}.`,
  );
}

/** 문형 09 — 같은 넓이가 두 장. */
function dm246TwoAreas(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = overOneT(rng);
  const b = overOneT(rng, (x) => (a * x * 2) % 10 !== 0);
  return make(
    unit,
    `가로가 ${expr(dec(a, 1))} m, 세로가 ${expr(dec(b, 1))} m인 직사각형 모양 밭이 ${n(2)}개 있습니다. 밭의 넓이는 모두 몇 m²입니까?`,
    expr(dec(a * b * 2, 2)),
    `하나 넓이는 ${expr(`${dec(a, 1)}\\times${dec(b, 1)}=${dec(a * b, 2)}`)}이고, ${n(2)}개이므로 ${expr(`${dec(a * b, 2)}\\times2=${dec(a * b * 2, 2)}`)} m²입니다.`,
  );
}

/** 문형 10 — 두 소수 중 더 큰 수. */
function dm246Bigger(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = overOneT(rng);
  const b = overOneT(rng, (x) => x !== a);
  const big = Math.max(a, b);
  return make(
    unit,
    `${dj(dec(a, 1), "과", "와")} ${dj(dec(b, 1), "중", "중")} 더 큰 수는 무엇입니까?`,
    expr(dec(big, 1)),
    `${a > b ? expr(dec(a, 1)) : expr(dec(b, 1))}이 더 큽니다.`,
  );
}

/** 문형 05 — 소수점이 오른쪽으로 옮겨지는 칸 수. */
function dm247RightSteps(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = hundredthT(rng);
  const mul = pick(rng, [10, 100, 1000]);
  const steps = mul === 10 ? 1 : mul === 100 ? 2 : 3;
  return make(
    unit,
    `${dj(dec(b, 2), "에", "에")} ${nj(mul, "을", "를")} 곱하면 소수점이 오른쪽으로 몇 칸 옮겨집니까?`,
    n(steps),
    `${nj(mul, "을", "를")} 곱하면 소수점이 오른쪽으로 ${n(steps)}칸 옮겨져 ${expr(dec(b * mul, 2))}이 됩니다.`,
  );
}

/** 문형 06 — 소수점을 오른쪽으로 한 칸. */
function dm247TimesTen(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = hundredthT(rng);
  return make(
    unit,
    `${dj(dec(b, 2), "의", "의")} 소수점을 오른쪽으로 한 칸 옮기면 얼마입니까?`,
    expr(dec(b * 10, 2)),
    `소수점이 오른쪽으로 ${n(1)}칸 옮겨지므로 ${expr(dec(b * 10, 2))}입니다.`,
  );
}

/** 문형 07 — 소수점을 오른쪽으로 두 칸. */
function dm247TimesHundred(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = hundredthT(rng);
  return make(
    unit,
    `${dj(dec(b, 2), "의", "의")} 소수점을 오른쪽으로 두 칸 옮기면 얼마입니까?`,
    expr(dec(b * 100, 2)),
    `소수점이 오른쪽으로 ${n(2)}칸 옮겨지므로 ${expr(dec(b * 100, 2))}입니다.`,
  );
}

/** 문형 08 — 소수점을 왼쪽으로 한 칸. */
function dm247TimesTenth(unit: UnitSeed, rng: Rng): ElemProblem {
  const whole = intBetween(rng, 12, 987);
  const w = whole % 10 === 0 ? whole + 1 : whole;
  return make(
    unit,
    `${nj(w, "의", "의")} 소수점을 왼쪽으로 한 칸 옮기면 얼마입니까?`,
    expr(dec(w, 1)),
    `소수점이 왼쪽으로 ${n(1)}칸 옮겨지므로 ${expr(dec(w, 1))}입니다.`,
  );
}

/** 문형 09 — 소수점을 왼쪽으로 두 칸. */
function dm247TimesHundredth(unit: UnitSeed, rng: Rng): ElemProblem {
  const whole = intBetween(rng, 12, 987);
  const w = whole % 10 === 0 ? whole + 1 : whole;
  return make(
    unit,
    `${nj(w, "의", "의")} 소수점을 왼쪽으로 두 칸 옮기면 얼마입니까?`,
    expr(dec(w, 2)),
    `소수점이 왼쪽으로 ${n(2)}칸 옮겨지므로 ${expr(dec(w, 2))}입니다.`,
  );
}

/** 문형 10 — 곱이 처음 수보다 큰지. ×10·100·1000 은 예, ×0.1·0.01 은 아니요가 되게 양쪽을 섞는다. */
function dm247Grew(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const b = hundredthT(rng);
    const mul = pick(rng, [10, 100, 1000]);
    return make(
      unit,
      `${expr(`${dec(b, 2)}\\times${mul}`)}의 값은 ${dj(dec(b, 2), "보다", "보다")} 큽니까? (예, 아니요)`,
      "예",
      `${nj(mul, "을", "를")} 곱하면 값이 커져 ${expr(dec(b * mul, 2))}이 됩니다.`,
    );
  }
  const whole = intBetween(rng, 12, 987);
  const w = whole % 10 === 0 ? whole + 1 : whole;
  const steps = pick(rng, [1, 2]);
  return make(
    unit,
    `${expr(`${w}\\times${dec(1, steps)}`)}의 값은 ${nj(w, "보다", "보다")} 큽니까? (예, 아니요)`,
    "아니요",
    `${dj(dec(1, steps), "을", "를")} 곱하면 값이 작아져 ${expr(dec(w, steps))}이 됩니다.`,
  );
}

/* ────────── 2-6 평균과 가능성 — 난이도 4단 (D-72 확대 10차) ──────────
 *
 * ⚠️ **이 대단원은 소단원 이름이 갈래 축과 겹친다.** 2-6-2 가 「평균을 **이용하여**
 *    문제해결」 — 곧 **역산**이다. 그래서 2-6-1 의 심화를 역산으로 짜면 그것이 통째로
 *    2-6-2 가 된다(D-66 ⑼). D-72 의 4단은 「역산 **또는** 조건 조합」이므로 2-6-1 은
 *    **조건 조합**(두 모둠을 합친 평균)으로 오르고, 2-6-2 는 자기 본령인 역산의
 *    **깊이**로 오른다(맨 식 → 문장 → 평균이 바뀐다 → 목표 평균). 2026-08-23 리드 승인.
 *
 * ⚠️ **역산 갈래는 «답에서 거꾸로» 짓는다.** 앞에서 뽑고 「답이 정수인가」로 거르면
 *    후보가 비고, 폴백이 조건을 깨고, 그 깨짐은 **값 검산으로 안 잡힌다**(2-4 의
 *    `sumPairOverOne` 이 그 자리였다). 2-6-3 심화는 답 `x` 를 **먼저** 잡고 파랑 개수를
 *    유도하므로 「정수인가」를 물을 자리가 아예 없다.
 *
 * ⚠️ `AVG_TOPICS` 의 교훈을 그대로 물려받는다 — 「선수 $5$명의 **키**가 평균 $33$ cm」는
 *    산술·표기·조건이 다 맞아서 **어느 가드도 못 본다.** 수가 그 낱말과 어울리는지는
 *    코드가 아니라 세상이 정하므로, 소재마다 그럴듯한 범위를 딸려 둔다.
 */

/**
 * 평균이 **정확히** `avg` 인 자료 — 치우침의 합을 0으로 만든다.
 * `high` 가 참이면 **적어도 하나는 평균보다 크다**(그 축을 묻는 갈래가 있다).
 */
function aroundMean(
  rng: Rng,
  avg: number,
  size: number,
  spread: number,
  high = false,
): number[] {
  const offsets: number[] = [];
  let acc = 0;
  if (high) {
    // ⚠️ 「평균보다 많은 날」을 묻는 갈래는 **하나도 없으면 묻는 것이 사라진다.**
    //    뽑고 거르지 않고, 양수 치우침 하나를 **먼저 박아** 구성으로 보장한다.
    const up = intBetween(rng, 1, spread);
    offsets.push(up);
    acc += up;
  }
  for (let i = offsets.length; i < size - 1; i += 1) {
    const off = intBetween(rng, -spread, spread);
    offsets.push(off);
    acc += off;
  }
  offsets.push(-acc);
  return shuffled(rng, offsets).map((o) => avg + o);
}

/* ── 2-6-1 평균 알아보기 — 평균을 «구한다» ── */

/** 연산 — 합과 개수가 그대로 주어진다(나눗셈 한 번). */
function avg261Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const size = intBetween(rng, 4, 8);
  const avg = intBetween(rng, 12, 40);
  const sum = size * avg;
  return make(
    unit,
    `${n(size)}개의 수의 합이 ${n(sum)}입니다. 이 수들의 평균을 구하시오.`,
    n(avg),
    `평균은 자료의 합을 자료의 수로 나눈 값입니다. ${expr(`${sum}\\div${size}=${avg}`)}이므로 평균은 ${n(avg)}입니다.`,
  );
}

/** 기본 — 문장에서 자료를 읽어 **스스로** 식을 세운다(한 겹). */
function avg261Read(unit: UnitSeed, rng: Rng): ElemProblem {
  // ⚠️ 마지막 치우침은 «나머지의 합에 음수를 붙인 것」이라 크기가 `spread·(size−1)`
  //    까지 간다. `avg` 가 그보다 작으면 **쪽수가 음수**가 된다 — 표준이 주석으로
  //    막아 둔 자리인데(「가장 큰 치우침보다 avg 를 크게 잡아」) 갈래가 안 물려받았다.
  //    여기서는 `3·4=12` 보다 `avg` 하한이 크다.
  const avg = intBetween(rng, 20, 35);
  const values = aroundMean(rng, avg, 5, 3);
  const sum = values.reduce((a, b) => a + b, 0);
  return make(
    unit,
    `월요일부터 금요일까지 읽은 쪽수가 차례로 ${nums(values)} 쪽입니다. 하루 평균 몇 쪽을 읽었습니까?`,
    n(avg),
    `모두 더하면 ${n(sum)} 쪽이고 날수가 ${n(5)}일이므로 ${expr(`${sum}\\div5=${avg}`)}입니다.`,
  );
}

/** 응용 — 평균을 구한 **뒤** 그것과 견준다(두 단계). */
function avg261Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const size = intBetween(rng, 4, 6);
  // ⚠️ 치우침 최대 `3·(6−1)=15` 보다 `avg` 하한을 크게 잡아 **음수 쪽수를 막는다.**
  const avg = intBetween(rng, 20, 35);
  const values = aroundMean(rng, avg, size, 3, true);
  const sum = values.reduce((a, b) => a + b, 0);
  const overs = values.filter((v) => v > avg);
  return make(
    unit,
    `${n(size)}일 동안 읽은 쪽수가 차례로 ${nums(values)} 쪽입니다. 하루 평균보다 많이 읽은 날은 며칠입니까?`,
    n(overs.length),
    `먼저 평균을 구하면 ${expr(`${sum}\\div${size}=${avg}`)} 쪽입니다. ${n(avg)} 쪽보다 많이 읽은 날은 ${nums(overs)} 쪽인 ${n(overs.length)}일입니다.`,
  );
}

/**
 * 심화 — **조건 조합**: 두 모둠을 합친 평균.
 *
 * ⚠️ **두 모둠의 인원이 다르다(`n1 !== n2`)** — 같으면 「평균의 평균」이 그대로 정답이
 *    되어 이 갈래의 알맹이가 사라진다. 그게 이 소단원에서 가장 흔한 오개념이라,
 *    인원이 갈리는 것이 **구성 불변식**이다.
 *
 * 전체 평균은 `A` 로 **구성해서** 정확히 떨어진다:
 *   `a1 = A − n2·t` · `a2 = A + n1·t`  →  `n1·a1 + n2·a2 = A(n1+n2)`
 */
function avg261Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const A = intBetween(rng, 75, 85);
  const n1 = intBetween(rng, 2, 5);
  const n2 = pick(
    rng,
    [2, 3, 4, 5].filter((v) => v !== n1),
  );
  const t = intBetween(rng, 1, 2);
  const a1 = A - n2 * t;
  const a2 = A + n1 * t;
  const sum = n1 * a1 + n2 * a2;
  return make(
    unit,
    // 🔴 모둠 이름을 «가·나» 로 적는다 (2026-08-31). `$1$모둠`·`$2$모둠` 으로 적으면
    //    그 `1`·`2` 가 **지면 수**가 되어 반증 ⑥ 이 오작동한다 — 실측으로 씨앗 여덟 중
    //    넷이 «순방향으로 닿는다»로 잡혔고 전부 산술 우연이었다(토대 초5 §7).
    //    난이도는 한 글자도 안 바뀐다. 같은 소단원의 확대 갈래도 «가·나» 를 쓴다.
    `가 모둠 ${n(n1)}명의 수학 점수 평균은 ${n(a1)}점이고, 나 모둠 ${n(n2)}명의 평균은 ${n(a2)}점입니다. 두 모둠 전체의 평균은 몇 점입니까?`,
    n(A),
    `모둠마다 인원이 다르므로 두 평균을 더해 ${n(2)}로 나누면 안 됩니다. 점수의 합을 구해 전체 인원으로 나눕니다. ${expr(`${n1}\\times${a1}=${n1 * a1}`)}, ${expr(`${n2}\\times${a2}=${n2 * a2}`)}이므로 합은 ${n(sum)}점이고, 전체 인원이 ${n(n1 + n2)}명이므로 ${expr(`${sum}\\div${n1 + n2}=${A}`)}입니다.`,
  );
}

// 쪽수 표(`dayTable`)는 걷었다 — 발문이 «차례로 $34, 32, …$ 쪽» 으로 값을 다 적어 표가 같은 자료를 한 번 더 보였다(2026-10-20 교차 검수).

/** 문형 05 — 자료의 합. 연산은 합이 이미 주어진다. */
function avg261Sum(unit: UnitSeed, rng: Rng): ElemProblem {
  const avg = intBetween(rng, 20, 35);
  const values = aroundMean(rng, avg, 5, 3);
  const sum = values.reduce((a, b) => a + b, 0);
  return make(
    unit,
    `다섯 날 읽은 쪽수가 차례로 ${nums(values)} 쪽입니다. 쪽수의 합은 얼마입니까?`,
    n(sum),
    `모두 더하면 ${n(sum)} 쪽입니다.`,
  );
}

/** 문형 06 — 자료의 개수. */
function avg261Count(unit: UnitSeed, rng: Rng): ElemProblem {
  const size = intBetween(rng, 4, 8);
  const avg = intBetween(rng, 12, 40);
  const sum = size * avg;
  return make(
    unit,
    `어떤 수들의 합이 ${n(sum)}이고 평균이 ${n(avg)}입니다. 자료는 몇 개입니까?`,
    n(size),
    `합을 평균으로 나누면 ${expr(`${sum}\\div${avg}=${size}`)}이므로 ${n(size)}개입니다.`,
  );
}

/** 문형 07 — 평균보다 적게 읽은 날. 응용은 많이 읽은 날이다. */
function avg261Below(unit: UnitSeed, rng: Rng): ElemProblem {
  const size = intBetween(rng, 4, 6);
  const avg = intBetween(rng, 20, 35);
  const values = aroundMean(rng, avg, size, 3, true);
  const sum = values.reduce((a, b) => a + b, 0);
  const unders = values.filter((v) => v < avg);
  return make(
    unit,
    `${n(size)}일 동안 읽은 쪽수가 차례로 ${nums(values)} 쪽입니다. 하루 평균보다 적게 읽은 날은 며칠입니까?`,
    n(unders.length),
    `평균은 ${expr(`${sum}\\div${size}=${avg}`)} 쪽입니다. ${n(avg)} 쪽보다 적게 읽은 날은 ${n(unders.length)}일입니다.`,
  );
}

/** 문형 08 — 가장 큰 값과 평균의 차. */
function avg261MaxGap(unit: UnitSeed, rng: Rng): ElemProblem {
  const avg = intBetween(rng, 20, 35);
  const values = aroundMean(rng, avg, 5, 3, true);
  const maxv = Math.max(...values);
  return make(
    unit,
    `다섯 날 읽은 쪽수가 차례로 ${nums(values)} 쪽입니다. 가장 많이 읽은 날의 쪽수와 평균의 차는 몇 쪽입니까?`,
    n(maxv - avg),
    `평균은 ${n(avg)} 쪽이고 가장 많은 날은 ${n(maxv)} 쪽이므로 차는 ${expr(`${maxv}-${avg}=${maxv - avg}`)} 쪽입니다.`,
  );
}

/** 문형 09 — 가장 작은 값. */
function avg261Min(unit: UnitSeed, rng: Rng): ElemProblem {
  const avg = intBetween(rng, 20, 35);
  const values = aroundMean(rng, avg, 5, 3);
  const minv = Math.min(...values);
  return make(
    unit,
    `다섯 날 읽은 쪽수가 차례로 ${nums(values)} 쪽입니다. 가장 적게 읽은 날은 몇 쪽입니까?`,
    n(minv),
    `가장 작은 수는 ${n(minv)}입니다.`,
  );
}

/** 문형 10 — 평균과 같은 날 수. */
function avg261EqualDays(unit: UnitSeed, rng: Rng): ElemProblem {
  const avg = intBetween(rng, 20, 35);
  // 평균과 같은 날이 하루는 있게 박는다 — 없으면 «며칠입니까?» 의 답이 $0$ 이 된다(2026-10-20 교차 검수 2회차).
  const four = aroundMean(rng, avg, 4, 3);
  const at = intBetween(rng, 0, 4);
  const values = [...four.slice(0, at), avg, ...four.slice(at)];
  const eqs = values.filter((v) => v === avg).length;
  return make(
    unit,
    `다섯 날 읽은 쪽수가 차례로 ${nums(values)} 쪽입니다. 하루 평균과 같은 쪽수를 읽은 날은 며칠입니까?`,
    n(eqs),
    `평균은 ${n(avg)} 쪽이므로 그와 같은 날은 ${n(eqs)}일입니다.`,
  );
}

/* ── 2-6-2 평균을 이용하여 문제해결 — 이 소단원의 본령이 «역산»이다 ── */

/** 연산 — 평균과 개수에서 합을 되찾는다(곱셈 한 번). */
function avg262Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 4, 9);
  const avg = intBetween(rng, 6, 20);
  return make(
    unit,
    `평균이 ${n(avg)}인 자료가 ${n(count)}개 있습니다. 자료의 합을 구하시오.`,
    n(avg * count),
    `자료의 합은 평균에 자료의 수를 곱해 구합니다. ${expr(`${avg}\\times${count}=${avg * count}`)}입니다.`,
  );
}

/** 기본 — 문장에서 **스스로** 세운다(한 겹). 소재는 표준(«조사했더니»)과 갈랐다. */
function avg262Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const games = intBetween(rng, 4, 7);
  const avg = intBetween(rng, 5, 12);
  const who = pick(rng, FRAC_NAMES);
  return make(
    unit,
    `${wj(who, "이", "가")} ${n(games)}경기에서 평균 ${n(avg)}점을 얻었습니다. 얻은 점수는 모두 몇 점입니까?`,
    n(avg * games),
    `전체 점수는 평균에 경기 수를 곱한 값입니다. ${expr(`${avg}\\times${games}=${avg * games}`)}이므로 ${n(avg * games)}점입니다.`,
  );
}

/**
 * 응용 — **평균이 바뀐다**(두 단계): 한 경기를 더 치른 뒤 평균이 올랐다.
 * 마지막 경기 점수 `= t·(k+1) − a·k` — 넷이 다 정수라 **답도 정수다**(거르지 않는다).
 */
function avg262Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 3, 6);
  const a = intBetween(rng, 5, 10);
  const t = a + intBetween(rng, 1, 3);
  const score = t * (k + 1) - a * k;
  const who = pick(rng, FRAC_NAMES);
  return make(
    unit,
    `${wj(who, "은", "는")} ${n(k)}경기까지 평균 ${n(a)}점이었는데, ${n(k + 1)}경기째를 마치고 나니 평균이 ${n(t)}점이 되었습니다. ${n(k + 1)}경기째에 얻은 점수는 몇 점입니까?`,
    n(score),
    `${n(k + 1)}경기 전체 점수는 ${expr(`${t}\\times${k + 1}=${t * (k + 1)}`)}점이고, ${n(k)}경기까지의 점수는 ${expr(`${a}\\times${k}=${a * k}`)}점입니다. 그 차가 마지막 경기 점수이므로 ${expr(`${t * (k + 1)}-${a * k}=${score}`)}점입니다.`,
  );
}

/**
 * 심화 — **역산 + «이상» 조건**: 목표 평균에 닿으려면 남은 경기에서 최소 몇 점인가.
 *
 * ⚠️ 「최소 몇 점」은 **답이 자연수라야** 뜻이 선다. `t·(k+m) − a·k` 는 넷이 다 정수라
 *    언제나 정수이고, `t > a` 이므로 언제나 양수다 — **구성이 보장한다.** 평균을 먼저
 *    뽑고 「정수인가」로 거르지 않는다(거르면 후보가 비는 씨앗이 생긴다).
 */
function avg262Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 3, 5);
  const a = intBetween(rng, 5, 9);
  const m = intBetween(rng, 2, 3);
  const t = a + intBetween(rng, 1, 3);
  const need = t * (k + m) - a * k;
  const who = pick(rng, FRAC_NAMES);
  return make(
    unit,
    `${wj(who, "은", "는")} ${n(k)}경기까지 평균 ${n(a)}점을 얻었습니다. 남은 ${n(m)}경기를 마쳤을 때 ${n(k + m)}경기 전체 평균이 ${n(t)}점 이상이 되려면, 남은 ${n(m)}경기에서 적어도 몇 점을 더 얻어야 합니까?`,
    n(need),
    `${n(k + m)}경기 평균이 ${n(t)}점이 되려면 전체 점수가 ${expr(`${t}\\times${k + m}=${t * (k + m)}`)}점이어야 합니다. 지금까지 얻은 점수가 ${expr(`${a}\\times${k}=${a * k}`)}점이므로 적어도 ${expr(`${t * (k + m)}-${a * k}=${need}`)}점이 더 필요합니다.`,
  );
}

/** 문형 02 — 합과 평균에서 경기 수를 거슬러 구한다. 기본(Read)은 연산과 같은 n0*n1이라 안 감싼다. */
function avg262HowManyGames(unit: UnitSeed, rng: Rng): ElemProblem {
  const games = intBetween(rng, 4, 7);
  const avg = intBetween(rng, 5, 12);
  const who = pick(rng, FRAC_NAMES);
  return make(
    unit,
    `${wj(who, "이", "가")} 여러 경기에서 모두 ${n(avg * games)}점을 얻었고 경기당 평균은 ${n(avg)}점이었습니다. 경기는 몇 경기입니까?`,
    n(games),
    `경기 수는 전체 점수를 평균으로 나눈 값입니다. ${expr(`${avg * games}\\div${avg}=${games}`)}이므로 ${n(games)}경기입니다.`,
  );
}

/** 문형 05 — 합과 평균에서 개수를 거슬러 구한다. */
function avg262Count(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 4, 9);
  const avg = intBetween(rng, 6, 20);
  return make(
    unit,
    `평균이 ${n(avg)}인 자료의 합이 ${n(avg * count)}입니다. 자료는 몇 개입니까?`,
    n(count),
    `합을 평균으로 나누면 ${expr(`${avg * count}\\div${avg}=${count}`)}이므로 ${n(count)}개입니다.`,
  );
}

/** 문형 06 — 한 경기를 더하기 전 전체 점수. */
function avg262BeforeLast(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 3, 6);
  const a = intBetween(rng, 5, 10);
  const who = pick(rng, FRAC_NAMES);
  return make(
    unit,
    `${wj(who, "은", "는")} ${n(k)}경기까지 평균 ${n(a)}점이었습니다. ${n(k)}경기까지의 점수는 모두 몇 점입니까?`,
    n(a * k),
    `${expr(`${a}\\times${k}=${a * k}`)}이므로 ${n(a * k)}점입니다.`,
  );
}

/** 문형 07 — 한 경기를 더한 뒤의 전체 점수. */
function avg262AfterLast(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 3, 6);
  const a = intBetween(rng, 5, 10);
  const t = a + intBetween(rng, 1, 3);
  const who = pick(rng, FRAC_NAMES);
  return make(
    unit,
    `${wj(who, "은", "는")} ${n(k)}경기까지 평균 ${n(a)}점이었는데, ${n(k + 1)}경기째를 마치고 나니 평균이 ${n(t)}점이 되었습니다. ${n(k + 1)}경기 전체 점수는 몇 점입니까?`,
    n(t * (k + 1)),
    `${n(k + 1)}경기 평균이 ${n(t)}점이므로 전체는 ${expr(`${t}\\times${k + 1}=${t * (k + 1)}`)}점입니다.`,
  );
}

/** 문형 08 — 목표 평균을 위한 전체 점수. */
function avg262TargetSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 3, 5);
  const a = intBetween(rng, 5, 9);
  const m = intBetween(rng, 2, 3);
  const t = a + intBetween(rng, 1, 3);
  const who = pick(rng, FRAC_NAMES);
  return make(
    unit,
    `${wj(who, "은", "는")} ${n(k)}경기까지 평균 ${n(a)}점을 얻었습니다. ${n(k + m)}경기 전체 평균을 ${n(t)}점으로 만들려면 전체 점수는 몇 점이어야 합니까?`,
    n(t * (k + m)),
    `전체 평균 ${n(t)}점에 경기 수 ${n(k + m)}을 곱하면 ${expr(`${t}\\times${k + m}=${t * (k + m)}`)}점입니다.`,
  );
}

/** 문형 09 — 남은 경기에서 경기당 평균. */
function avg262NeedPer(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = pick(rng, [2, 3]);
  const k = m * intBetween(rng, 1, 2);
  const a = intBetween(rng, 5, 9);
  const t = a + intBetween(rng, 1, 3);
  const need = t * (k + m) - a * k;
  const who = pick(rng, FRAC_NAMES);
  return make(
    unit,
    `${wj(who, "은", "는")} ${n(k)}경기까지 평균 ${n(a)}점을 얻었습니다. 남은 ${n(m)}경기의 평균이 ${n(t)}점이 되게 하려면, 남은 경기에서 경기당 평균 몇 점을 얻어야 합니까?`,
    n(need / m),
    `남은 ${n(m)}경기에서 더 얻을 점수는 ${expr(`${t}\\times${k + m}-${a}\\times${k}=${need}`)}점이고, 경기당 ${expr(`${need}\\div${m}=${need / m}`)}점입니다.`,
  );
}

/** 문형 10 — 자료를 하나 빼기 전 합에서 평균. 하나 뺀 뒤의 합이 주어진다. */
function avg262RemoveOne(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 4, 7);
  const avg = intBetween(rng, 6, 16);
  const one = intBetween(rng, 2, avg + 4);
  const who = pick(rng, FRAC_NAMES);
  return make(
    unit,
    `${wj(who, "이", "가")} 기록한 ${n(count)}개의 점수의 평균은 ${n(avg)}점입니다. 그중 ${n(one)}점인 기록을 빼면 남은 점수의 합은 몇 점입니까?`,
    n(avg * count - one),
    `전체 합은 ${expr(`${avg}\\times${count}=${avg * count}`)}점이고, ${n(one)}점을 빼면 ${expr(`${avg * count}-${one}=${avg * count - one}`)}점입니다.`,
  );
}

/* ── 2-6-3 일이 일어날 가능성 — 표준이 쓰는 주사위·카드를 피해 «주머니»로 간다 ── */

/** 연산 — 교육과정의 다섯 낱말로 **말하게** 한다(판정 한 번). */
function pos263Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const total = pick(rng, [6, 8, 10]);
  const half = total / 2;
  const kind = intBetween(rng, 0, 4);
  if (kind === 0)
    return make(
      unit,
      `파란 구슬만 ${n(total)}개 든 주머니에서 구슬 한 개를 꺼낼 때, 꺼낸 구슬이 빨간색일 가능성을 말로 표현하시오.`,
      "불가능하다",
      `주머니에 빨간 구슬이 하나도 없으므로 빨간 구슬을 꺼내는 일은 일어날 수 없습니다.`,
    );
  if (kind === 4)
    return make(
      unit,
      `빨간 구슬만 ${n(total)}개 든 주머니에서 구슬 한 개를 꺼낼 때, 꺼낸 구슬이 빨간색일 가능성을 말로 표현하시오.`,
      "확실하다",
      `주머니에 든 구슬이 모두 빨간색이므로 어느 것을 꺼내도 빨간색입니다.`,
    );
  const red =
    kind === 2
      ? half
      : kind === 1
        ? intBetween(rng, 1, half - 1)
        : intBetween(rng, half + 1, total - 1);
  const answer =
    kind === 2
      ? "반반이다"
      : kind === 1
        ? "빨간색이 아닐 것 같다"
        : "빨간색일 것 같다";
  const why =
    kind === 2
      ? `빨간 구슬과 파란 구슬이 ${n(half)}개로 같습니다.`
      : kind === 1
        ? `빨간 구슬 ${n(red)}개가 파란 구슬 ${n(total - red)}개보다 적습니다.`
        : `빨간 구슬 ${n(red)}개가 파란 구슬 ${n(total - red)}개보다 많습니다.`;
  return make(
    unit,
    `빨간 구슬 ${n(red)}개와 파란 구슬 ${n(total - red)}개가 든 주머니에서 구슬 한 개를 꺼낼 때, 꺼낸 구슬이 빨간색일 가능성을 말로 표현하시오.`,
    answer,
    why,
  );
}

/** 기본 — 문장의 상황을 분수로 옮긴다(한 겹). */
function pos263Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const red = intBetween(rng, 2, 7);
  const blue = intBetween(rng, 2, 9);
  const total = red + blue;
  const [num, den] = simplify(red, total);
  const same = red === num && total === den;
  return make(
    unit,
    `빨간 구슬 ${n(red)}개와 파란 구슬 ${n(blue)}개가 든 주머니에서 구슬 한 개를 꺼낼 때, 꺼낸 구슬이 빨간색일 가능성을 분수로 나타내시오.`,
    fr(num, den),
    `구슬은 모두 ${n(total)}개이고 그중 빨간 구슬이 ${n(red)}개이므로 ${expr(`\\frac{${red}}{${total}}${same ? "" : `=\\frac{${num}}{${den}}`}`)}입니다.`,
  );
}

/** 응용 — **아닐** 가능성(두 단계): 두 색을 합치고 나머지를 센다. */
function pos263Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const red = intBetween(rng, 1, 5);
  const blue = intBetween(rng, 1, 5);
  const yellow = intBetween(rng, 2, 8);
  const total = red + blue + yellow;
  const [num, den] = simplify(yellow, total);
  const same = yellow === num && total === den;
  return make(
    unit,
    `빨간 구슬 ${n(red)}개, 파란 구슬 ${n(blue)}개, 노란 구슬 ${n(yellow)}개가 든 주머니에서 구슬 한 개를 꺼낼 때, 꺼낸 구슬이 빨간색도 파란색도 아닐 가능성을 분수로 나타내시오.`,
    fr(num, den),
    `빨간색과 파란색이 모두 ${expr(`${red}+${blue}=${red + blue}`)}개이므로 둘 다 아닌 것은 노란 구슬 ${n(yellow)}개입니다. 구슬이 모두 ${n(total)}개이므로 ${expr(`\\frac{${yellow}}{${total}}${same ? "" : `=\\frac{${num}}{${den}}`}`)}입니다.`,
  );
}

/**
 * 심화 — **역산**: 목표 가능성이 되게 몇 개를 더 넣어야 하는가.
 *
 * ⚠️ **발문이 «무엇을 더하는지» 못 박는다**(「빨간 구슬만 더 넣어」). 안 그러면 빨강을
 *    넣는 것과 전체를 늘리는 것이 갈리지 않아 **답이 둘**이 된다(2026-08-23 리드 지적).
 *
 * ⚠️ **답 `add` 를 먼저 잡고 파랑 개수를 유도한다** — `blue = (add+red)(q−1)` 이면
 *    전체가 `(red+add)·q` 라 가능성이 정확히 `1/q` 다. 가능성을 먼저 잡고 `add` 를 풀면
 *    정수가 아닐 수 있고, 그때 거르면 후보가 비는 씨앗이 생긴다.
 *
 * ⚠️ 그래서 이 갈래의 가능성은 **언제나 `1/q` 꼴**(분자 1)이다 — 초5 교육과정의 표준
 *    표기라 문제는 없지만, 「왜 $\frac23$ 은 안 나오나」의 답은 «구성이 그렇다»다.
 *    그리고 `blue` 가 곱으로 커지므로 상한을 뒤에 걸어 거르지 말고 **뽑는 범위에서**
 *    갈라 둔다(`q=3` 이면 `red`·`add` 를 좁게).
 */
function pos263Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const q = pick(rng, [2, 3]);
  const red = q === 2 ? intBetween(rng, 2, 6) : intBetween(rng, 2, 4);
  const add = q === 2 ? intBetween(rng, 2, 8) : intBetween(rng, 2, 5);
  const blue = (red + add) * (q - 1);
  const total = (red + add) * q;
  return make(
    unit,
    `빨간 구슬 ${n(red)}개와 파란 구슬 ${n(blue)}개가 든 주머니가 있습니다. 이 주머니에 빨간 구슬만 더 넣어, 구슬 한 개를 꺼낼 때 빨간색일 가능성이 ${frj(1, q, "이", "가")} 되게 하려고 합니다. 빨간 구슬을 몇 개 더 넣어야 합니까?`,
    n(add),
    `빨간 구슬을 ${n(add)}개 더 넣으면 빨간 구슬은 ${expr(`${red}+${add}=${red + add}`)}개, 전체는 ${expr(`${red + add}+${blue}=${total}`)}개가 되어 ${expr(`\\frac{${red + add}}{${total}}=\\frac{1}{${q}}`)}입니다.`,
  );
}

/** 문형 05 — 주머니에 든 구슬의 수. */
function pos263Total(unit: UnitSeed, rng: Rng): ElemProblem {
  const red = intBetween(rng, 2, 7);
  const blue = intBetween(rng, 2, 9);
  return make(
    unit,
    // «구슬 한 개를 꺼냅니다» 는 묻는 것(모두 몇 개)과 상관없이 «남은 구슬» 로 읽혔다(2026-10-20 교차 검수 2회차).
    `빨간 구슬 ${n(red)}개와 파란 구슬 ${n(blue)}개가 든 주머니가 있습니다. 주머니에 든 구슬은 모두 몇 개입니까?`,
    n(red + blue),
    `${expr(`${red}+${blue}=${red + blue}`)}이므로 ${n(red + blue)}개입니다.`,
  );
}

/** 문형 06 — 파란 구슬일 가능성. 기본은 빨간 구슬이다. */
function pos263BlueFrac(unit: UnitSeed, rng: Rng): ElemProblem {
  const red = intBetween(rng, 2, 7);
  const blue = intBetween(rng, 2, 9);
  const total = red + blue;
  const [num, den] = simplify(blue, total);
  return make(
    unit,
    `빨간 구슬 ${n(red)}개와 파란 구슬 ${n(blue)}개가 든 주머니에서 구슬 한 개를 꺼낼 때, 꺼낸 구슬이 파란색일 가능성을 분수로 나타내시오.`,
    fr(num, den),
    `구슬은 모두 ${n(total)}개이고 그중 파란 구슬이 ${n(blue)}개이므로 ${fr(num, den)}입니다.`,
  );
}

/** 문형 07 — 빨간 구슬이 더 많은지 판정. */
function pos263RedMore(unit: UnitSeed, rng: Rng): ElemProblem {
  const red = intBetween(rng, 2, 8);
  const blue = intBetween(rng, 2, 8);
  return make(
    unit,
    `빨간 구슬 ${n(red)}개와 파란 구슬 ${n(blue)}개가 든 주머니에서 구슬 한 개를 꺼낼 때, 꺼낸 구슬이 빨간색일 가능성이 파란색일 가능성보다 큽니까? (예, 아니요)`,
    red > blue ? "예" : "아니요",
    `빨간 구슬 ${n(red)}개와 파란 구슬 ${n(blue)}개를 견줍니다.`,
  );
}

/** 문형 08 — 세 색일 때 빨간 가능성. 응용은 «둘 다 아닐». */
function pos263RedAmongThree(unit: UnitSeed, rng: Rng): ElemProblem {
  const red = intBetween(rng, 1, 5);
  const blue = intBetween(rng, 1, 5);
  const yellow = intBetween(rng, 2, 8);
  const total = red + blue + yellow;
  const [num, den] = simplify(red, total);
  return make(
    unit,
    `빨간 구슬 ${n(red)}개, 파란 구슬 ${n(blue)}개, 노란 구슬 ${n(yellow)}개가 든 주머니에서 구슬 한 개를 꺼낼 때, 꺼낸 구슬이 빨간색일 가능성을 분수로 나타내시오.`,
    fr(num, den),
    `구슬은 모두 ${n(total)}개이고 빨간 구슬이 ${n(red)}개이므로 ${fr(num, den)}입니다.`,
  );
}

/** 문형 09 — 빨간 구슬이 아닐 가능성. */
function pos263NotRed(unit: UnitSeed, rng: Rng): ElemProblem {
  const red = intBetween(rng, 2, 7);
  const blue = intBetween(rng, 2, 9);
  const total = red + blue;
  const [num, den] = simplify(blue, total);
  return make(
    unit,
    `빨간 구슬 ${n(red)}개와 파란 구슬 ${n(blue)}개가 든 주머니에서 구슬 한 개를 꺼낼 때, 꺼낸 구슬이 빨간색이 아닐 가능성을 분수로 나타내시오.`,
    fr(num, den),
    `빨간색이 아닌 것은 파란 구슬 ${n(blue)}개이고 전체는 ${n(total)}개이므로 ${fr(num, den)}입니다.`,
  );
}

/** 문형 10 — 불가능한 일의 구슬 수(0). 발문의 전체 수가 씨앗마다 달라 변형이 선다. */
function pos263ImpossibleCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const total = pick(rng, [6, 8, 10]);
  return make(
    unit,
    `파란 구슬만 ${n(total)}개 든 주머니에서 구슬 한 개를 꺼낼 때, 빨간 구슬은 몇 개입니까?`,
    n(0),
    `주머니에 빨간 구슬이 없으므로 ${n(0)}개입니다.`,
  );
}

/* ────────── 2-3 합동과 대칭 — 난이도 4단 (D-72 확대 12차) ──────────
 *
 * ⚠️ **그림도 R5 다.** 지금까지 「표준과 겹치나」는 발문만 봤는데, 그림 문항은 지면에서
 *    겹치는 것이 발문보다 **그림**이다. 표준 2-3-3·2-3-4 는 `symmetry` 를 `motif` 로만
 *    쓰므로, 갈래는 **격자 모드**(`n`·`cells`)로 간다 — 발문도 그림도 갈린다.
 *    (2026-08-23 리드가 팀 규약으로 돌리기로 한 관찰.)
 *
 * ⚠️ **스펙은 지어내지 말고 돌려 봤다.** 실측(`render_spec` 경로 · `vendor/figure-engine`
 *    을 `sys.path` 에 넣어야 한다):
 *      `markedShape` + `sides` → **`rightTri`·`isoTri`·`eqTri`·`para` 만** 값을 그림에
 *      반영한다. `square`·`rect`·`pentagon` 은 **의도적으로 던진다** — 네 변만으로는
 *      사각형 모양이 안 정해지기 때문이다. 그래서 사각형 갈래는 수를 **발문에** 적는다.
 *      `markedShape` 는 도형을 **하나만** 담는다(`KIND_FIELDS` 가 `{"shape"}`) — 「가·나
 *      중 합동인 것」류는 `namedShapes` 몫이고 거기엔 값을 안 적는다.
 *
 * ⚠️ **말투 묶음은 가드가 아니라 «다양성»이 이유다.** 이 대단원은 수가 **그림에만**
 *    있는 갈래가 여럿이라(2-3-2 연산·2-3-3 기본/응용·2-3-4 연산) 발문이 한 문장으로
 *    굳는다. 처음엔 R9(고정문항)가 발문 글자만 봐서 말투를 넣었는데, R9 가 그림
 *    스펙까지 보게 넓어진 뒤 재 보니 **원래 발문 하나로도 통과**한다(그림이 씨앗
 *    8개에서 7~8가지 — 2026-08-23 g3 실측). 그러니 **지워도 초록이다.** 그래도 남기는
 *    이유는 원장님 원칙 「너무 단조로우면 재미도 학습의욕도 떨어진다」(D-66 ⑹) 하나다.
 *
 * ⚠️ **2-3-1 은 이 대단원에서 가장 얇다.** 묻는 것이 「합동인가 아닌가」 하나뿐이라
 *    1단이 예/아니오로 흐르고 4단은 거슬러 갈 값이 없다. 그래서 **개수 축**으로 세우되,
 *    4단만은 세기가 아니라 **조건 조합**(「정확히 두 쌍이 되게」)으로 만들었다 —
 *    거기가 이 소단원의 알맹이다(2026-08-23 리드 지시).
 */

/**
 * 이 소단원 전용 기호 — 공용 `LABELS` 는 **다섯(가~마)뿐**이라 여섯째부터 라벨이
 * `undefined` 로 새어 그림에 빈 이름이 찍혔다(2026-08-23 실측 28/40 씨앗).
 * `namedShapes` 는 여덟까지 그린다(실측 7·8개에서 두 줄로 접힌다).
 */
const CONG_LABELS = ["가", "나", "다", "라", "마", "바", "사", "아"] as const;

/** 같은 kind 는 같은 크기로 그려지므로 «같은 kind 한 쌍» 이 곧 합동이다. */
function congSet(
  rng: Rng,
  pairs: number,
  singles: number,
): { shape: string; label: string }[] {
  const kinds = pickSome(rng, CONG_SHAPES, pairs + singles);
  const twins = kinds.slice(0, pairs);
  const alone = kinds.slice(pairs);
  const all = [...twins, ...twins, ...alone];
  if (all.length > CONG_LABELS.length)
    throw new Error(`도형이 기호보다 많습니다: ${all.length}`);
  return shuffled(rng, all).map((shape, i) => ({
    shape,
    label: CONG_LABELS[i]!,
  }));
}

/* ── 2-3-1 도형의 합동 알아보기 ── */

/** 연산 — 합동인 짝이 **몇 쌍**인지 센다(절차 한 번). */
function cong231Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const pairs = intBetween(rng, 1, 4);
  // 여덟 칸을 넘기지 않게 홑의 수를 **뽑는 범위에서** 가른다(뒤에 걸어 거르지 않는다).
  const singles = intBetween(rng, 0, Math.min(2, 8 - pairs * 2));
  const items = congSet(rng, pairs, singles);
  // 말투 묶음 — 왜 남기는지는 이 대단원 머리말 참조(가드가 아니라 다양성).
  const ask = pick(rng, [
    "서로 합동인 두 도형은 모두 몇 쌍입니까?",
    "포개었을 때 완전히 겹치는 두 도형은 모두 몇 쌍입니까?",
    "모양과 크기가 같은 두 도형은 모두 몇 쌍입니까?",
  ]);
  return make(
    unit,
    `도형 ${n(items.length)}개 중에서 ${ask}`,
    n(pairs),
    `모양과 크기가 같아 포개면 완전히 겹치는 두 도형이 합동입니다. 같은 모양끼리 짝을 지으면 ${n(pairs)}쌍이고, 짝이 없는 도형이 ${n(singles)}개 남습니다.`,
    fig("namedShapes", { items }),
  );
}

/** 기본 — 지정한 도형의 짝을 **스스로** 찾는다(한 겹). */
function cong231Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const singles = intBetween(rng, 2, Math.min(4, 8 - 2));
  const items = congSet(rng, 1, singles);
  const twinKind = items.find(
    (it, i) => items.findIndex((o) => o.shape === it.shape) !== i,
  )!.shape;
  const [first, second] = items.filter((it) => it.shape === twinKind);
  // 말투 묶음 — 왜 남기는지는 이 대단원 머리말 참조(가드가 아니라 다양성).
  const ask = pick(rng, [
    "어느 도형과 서로 합동입니까? 기호를 쓰시오.",
    "어느 도형과 포개면 완전히 겹칩니까? 기호를 쓰시오.",
    "어느 도형과 모양·크기가 같습니까? 기호를 쓰시오.",
  ]);
  return make(
    unit,
    `도형 ${wj(first!.label, "은", "는")} ${ask}`,
    second!.label,
    `도형 ${first!.label}와 모양·크기가 같아 포개면 완전히 겹치는 것은 도형 ${second!.label}입니다.`,
    fig("namedShapes", { items }),
  );
}

/** 응용 — 짝을 지은 **뒤** 남는 것을 센다(두 단계). */
function cong231Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const pairs = intBetween(rng, 1, 3);
  const singles = intBetween(rng, 1, Math.min(4, 8 - pairs * 2));
  const items = congSet(rng, pairs, singles);
  const ask = pick(rng, [
    "자기와 합동인 도형이 하나도 없는 도형은 몇 개입니까?",
    "합동인 짝을 지을 수 없는 도형은 몇 개입니까?",
    "포개어 겹칠 도형이 없는 도형은 몇 개입니까?",
  ]);
  return make(
    unit,
    `도형 ${n(items.length)}개 중에서 ${ask}`,
    n(singles),
    `먼저 같은 모양끼리 짝을 지으면 ${n(pairs)}쌍, 곧 ${n(pairs * 2)}개가 짝을 이룹니다. 전체 ${n(items.length)}개에서 빼면 ${expr(`${items.length}-${pairs * 2}=${singles}`)}이므로 ${n(singles)}개입니다.`,
    fig("namedShapes", { items }),
  );
}

/**
 * 심화 — **조건 조합**: 「정확히 두 쌍」이 되게 하려면 무엇과 같아야 하는가.
 *
 * ⚠️ **답이 유일한지 구성이 보장한다**(D-66 ⒂). 도형은 «한 쌍 + 홑 하나 + 바꿀 것»
 *    셋뿐이다. 바꿀 것을 **홑**과 같게 하면 두 쌍이고, **이미 쌍인 것**과 같게 하면
 *    같은 모양이 셋이 되어 짝이 **세 쌍**(셋 중 둘을 고르는 경우의 수)이라 조건을 깬다.
 *    홑이 둘 이상이면 답이 여럿이 되므로 **홑은 정확히 하나**다.
 */
function cong231Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const kinds = pickSome(rng, CONG_SHAPES, 3);
  const [twin, lone, target] = kinds;
  const items = shuffled(rng, [
    { shape: twin!, tag: "twin" },
    { shape: twin!, tag: "twin" },
    { shape: lone!, tag: "lone" },
    { shape: target!, tag: "target" },
  ]).map((it, i) => ({ ...it, label: CONG_LABELS[i]! }));
  const targetLabel = items.find((it) => it.tag === "target")!.label;
  const loneLabel = items.find((it) => it.tag === "lone")!.label;
  const twinLabels = items
    .filter((it) => it.tag === "twin")
    .map((it) => it.label);
  return make(
    unit,
    `도형 ${n(4)}개 중 서로 합동인 것은 한 쌍뿐입니다. 도형 ${wj(targetLabel, "을", "를")} ${pick(rng, ["다른 도형 하나와 같은 모양으로 바꾸어", "다른 도형 하나와 포개면 겹치도록 바꾸어", "다른 도형 하나와 모양·크기가 같도록 바꾸어"])} 합동인 두 도형이 정확히 두 쌍이 되게 하려고 합니다. 어느 도형과 같은 모양으로 바꾸어야 합니까? 기호를 쓰시오.`,
    loneLabel,
    `지금 합동인 것은 ${twinLabels[0]}와 ${twinLabels[1]}뿐입니다. 도형 ${wj(targetLabel, "을", "를")} 짝이 없는 도형 ${loneLabel}와 같게 하면 새 짝이 하나 생겨 정확히 두 쌍이 됩니다. ${twinLabels[0]}와 같게 하면 같은 모양이 셋이 되어 그중 둘을 고르는 짝이 세 쌍이 되므로 조건에 맞지 않습니다.`,
    fig("namedShapes", {
      items: items.map(({ shape, label }) => ({ shape, label })),
    }),
  );
}

/** 문형 05 — 합동인 도형은 몇 개인가. 연산은 쌍의 수다. */
function cong231TwinCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const pairs = intBetween(rng, 1, 3);
  const singles = intBetween(rng, 0, Math.min(2, 8 - pairs * 2));
  const items = congSet(rng, pairs, singles);
  return make(
    unit,
    `도형 ${n(items.length)}개 중에서 자기와 합동인 도형이 따로 있는 도형은 모두 몇 개입니까?`,
    n(pairs * 2),
    `합동인 짝이 ${n(pairs)}쌍이므로 합동인 도형은 ${expr(`${pairs}\\times2=${pairs * 2}`)}개입니다.`,
    fig("namedShapes", { items }),
  );
}

/** 문형 06 — 도형은 모두 몇 개인가. */
function cong231AllCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const pairs = intBetween(rng, 1, 3);
  const singles = intBetween(rng, 1, Math.min(3, 8 - pairs * 2));
  const items = congSet(rng, pairs, singles);
  return make(
    unit,
    `그림에 있는 도형은 모두 몇 개입니까?`,
    n(items.length),
    `그림의 도형을 세면 ${n(items.length)}개입니다.`,
    fig("namedShapes", { items }),
  );
}

/** 문형 07 — 모양의 종류 수. */
function cong231KindCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const pairs = intBetween(rng, 1, 3);
  const singles = intBetween(rng, 1, Math.min(3, 8 - pairs * 2));
  const items = congSet(rng, pairs, singles);
  return make(
    unit,
    `그림에서 서로 다른 모양은 몇 종류입니까?`,
    n(pairs + singles),
    `합동인 짝 ${n(pairs)}종류와 홑 ${n(singles)}종류이므로 ${n(pairs + singles)}종류입니다.`,
    fig("namedShapes", { items }),
  );
}

/** 문형 08 — 합동인 짝이 없는 도형의 기호. 홑은 하나. */
function cong231LoneLabel(unit: UnitSeed, rng: Rng): ElemProblem {
  const items = congSet(rng, 1, 1);
  const counts = new Map<string, string[]>();
  for (const it of items) {
    const list = counts.get(it.shape) ?? [];
    list.push(it.label);
    counts.set(it.shape, list);
  }
  const lone = [...counts.values()].find((v) => v.length === 1)![0]!;
  return make(
    unit,
    `도형 ${n(items.length)}개 중에서 자기와 합동인 도형이 없는 도형의 기호를 쓰시오.`,
    lone,
    `짝이 없는 도형은 ${lone}입니다.`,
    fig("namedShapes", { items }),
  );
}

/** 문형 09 — 합동인 두 기호. */
function cong231PairLabels(unit: UnitSeed, rng: Rng): ElemProblem {
  const items = congSet(rng, 1, intBetween(rng, 1, 3));
  const counts = new Map<string, string[]>();
  for (const it of items) {
    const list = counts.get(it.shape) ?? [];
    list.push(it.label);
    counts.set(it.shape, list);
  }
  const pair = [...counts.values()].find((v) => v.length === 2)!;
  const ordered = [...pair].sort((a, b) => a.localeCompare(b, "ko"));
  return make(
    unit,
    `도형 ${n(items.length)}개 중에서 서로 합동인 두 도형의 기호를 쓰시오.`,
    `${ordered[0]}와 ${ordered[1]}`,
    `서로 합동인 도형은 ${ordered[0]}와 ${ordered[1]}입니다.`,
    fig("namedShapes", { items }),
  );
}

/** 문형 10 — 지정한 모양은 몇 개인가(쌍둥이 2). */
function cong231HowManyOf(unit: UnitSeed, rng: Rng): ElemProblem {
  const singles = intBetween(rng, 1, 3);
  const items = congSet(rng, 1, singles);
  const twinKind = items.find(
    (it, i) => items.findIndex((o) => o.shape === it.shape) !== i,
  )!.shape;
  const label = items.find((it) => it.shape === twinKind)!.label;
  return make(
    unit,
    `도형 ${wj(label, "과", "와")} 같은 모양인 도형은 모두 몇 개입니까?`,
    n(2),
    `도형 ${label}와 같은 모양은 합동인 짝이므로 ${n(2)}개입니다.`,
    fig("namedShapes", { items }),
  );
}

/* ── 2-3-2 합동인 도형의 성질 — 삼각형은 `sides` 가 그림에 반영된다 ── */

/** 세 변이 삼각부등식을 만족하는 삼각형 — 그림이 그려질 수 있어야 한다. */
function triSides(rng: Rng): [number, number, number] {
  const a = intBetween(rng, 5, 12);
  const b = intBetween(rng, 5, 12);
  // 두 변의 합 · 차에 바짝 붙은 셋째 변은 납작한 삼각형이 된다 — 양 끝 두 칸씩 띄운다(구간이 비면 가운데).
  const lo = Math.abs(a - b) + 2, hi = a + b - 3;
  const c = lo <= hi ? intBetween(rng, lo, hi) : Math.round((a + b + Math.abs(a - b)) / 2);
  return [a, b, c];
}

/** 연산 — 합동이면 둘레도 같다(절차 한 번: 합). */
function cong232Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  // ⚠️ `isoTri` 에 부등변 세 변을 주면 **이름과 그림이 어긋난다** — 비율을 반영하는
  //    엔진이라 이등변으로 안 그려진다. 두 변을 같게 지어 그림과 수를 맞춘다.
  const leg = intBetween(rng, 6, 13);
  // 밑변이 두 변의 합에 가까우면 납작해져 변 라벨이 치수 점선과 붙는다(«21 · 11 · 11» — 2026-10-20 3차 교차 검수).
  //   꼭지각이 100° 남짓까지(밑변 ≤ 1.5 × 빗변)만 낸다.
  const base = intBetween(rng, 3, Math.floor(leg * 1.5));
  const [a, b, c] = [base, leg, leg];
  return make(
    unit,
    `그림의 삼각형과 서로 합동인 삼각형이 있습니다. ${pick(rng, [
      "그 삼각형의 둘레는 몇 cm입니까?",
      "합동인 삼각형의 세 변의 길이의 합은 몇 cm입니까?",
      "포개면 겹치는 그 삼각형의 둘레를 구하시오.",
    ])}`,
    n(a + b + c),
    `합동인 두 도형에서 대응하는 변의 길이는 서로 같으므로 둘레도 같습니다. ${expr(`${a}+${b}+${c}=${a + b + c}`)}이므로 ${n(a + b + c)} cm입니다.`,
    fig("markedShape", {
      shape: "isoTri",
      sides: [`${a} cm`, `${b} cm`, `${c} cm`],
    }),
  );
}

/** 기본 — 대응각을 옮긴 뒤 내각의 합으로 나머지를 구한다(한 겹). */
function cong232Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 35, 80);
  const y = intBetween(rng, 35, 180 - x - 20);
  const z = 180 - x - y;
  return make(
    unit,
    `두 삼각형은 서로 합동입니다. 한 삼각형의 두 각이 ${expr(`${x}^\\circ`)}, ${expr(`${y}^\\circ`)}일 때, 다른 삼각형의 나머지 한 각의 크기는 몇 도입니까?`,
    expr(`${z}^\\circ`),
    `합동인 두 도형에서 대응하는 각의 크기는 서로 같습니다. 삼각형의 세 각의 합은 ${expr("180^\\circ")}이므로 ${expr(`180-${x}-${y}=${z}`)}, 곧 ${expr(`${z}^\\circ`)}입니다.`,
  );
}

/** 응용 — 두 도형의 둘레의 합에서 한 변을 되찾는다(두 단계). */
function cong232Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, c] = triSides(rng);
  const both = (a + b + c) * 2;
  return make(
    unit,
    `서로 합동인 두 삼각형이 있습니다. 두 삼각형의 둘레의 합이 ${n(both)} cm이고, 한 삼각형의 두 변이 ${n(a)} cm, ${n(b)} cm일 때 나머지 한 변은 몇 cm입니까?`,
    n(c),
    `두 삼각형이 합동이므로 둘레가 서로 같습니다. 한 삼각형의 둘레는 ${expr(`${both}\\div2=${a + b + c}`)} cm입니다. 여기서 두 변을 빼면 ${expr(`${a + b + c}-${a}-${b}=${c}`)}이므로 ${n(c)} cm입니다.`,
  );
}

/**
 * 심화 — **역산 + 조건**: 이등변삼각형이라는 조건이 답을 하나로 만든다.
 *
 * ⚠️ **답에서 거꾸로 짓는다**(D-66 ⒂) — 같은 두 변 `leg` 를 먼저 잡고 둘레를 만든다.
 *    둘레를 먼저 뽑아 `(둘레−밑변)/2` 를 구하면 홀짝이 어긋나 답이 정수가 아닐 수 있고,
 *    그때 거르면 후보가 비는 씨앗이 생긴다.
 */
function cong232Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const leg = intBetween(rng, 6, 14);
  // 삼각부등식: 밑변 < 두 변의 합. 밑변을 `2·leg` 미만으로 잡으면 언제나 그려진다.
  const base = intBetween(rng, 3, 2 * leg - 1);
  const total = leg * 2 + base;
  return make(
    unit,
    `어떤 이등변삼각형과 합동인 삼각형의 둘레가 ${n(total)} cm입니다. 이 이등변삼각형의 밑변이 ${n(base)} cm일 때, 길이가 같은 두 변은 각각 몇 cm입니까?`,
    n(leg),
    `합동인 두 도형은 둘레가 같으므로 이 이등변삼각형의 둘레도 ${n(total)} cm입니다. 밑변을 빼면 ${expr(`${total}-${base}=${2 * leg}`)} cm이고, 이것이 길이가 같은 두 변의 합이므로 ${expr(`${2 * leg}\\div2=${leg}`)}, 곧 ${n(leg)} cm입니다.`,
    fig("markedShape", {
      shape: "isoTri",
      // 같은 두 변은 표지(equal)만 — 길이를 적으면 그림이 정답을 보여 준다(2026-10-20 지면 전수 검사).
      // 라벨이 하나면 기본 좌표의 변 차례(0 왼쪽 · 1 오른쪽 · 2 밑변)를 탄다 — 밑변은 2번(Codex 검토, 렌더로 확인).
      sides: [null, null, `${base} cm`],
      equal: [[0, 1]],
    }),
  );
}

/** 문형 05 — 대응하는 변의 길이. 그림은 수를 발문에만 둔다. */
function cong232MatchSide(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 5, 16);
  return make(
    unit,
    `두 삼각형은 서로 합동입니다. 한 삼각형의 한 변이 ${n(a)} cm일 때, 다른 삼각형에서 이와 대응하는 변의 길이는 몇 cm입니까?`,
    n(a),
    `합동인 두 도형에서 대응하는 변의 길이는 서로 같으므로 ${n(a)} cm입니다.`,
  );
}

/** 문형 06 — 가장 긴 변. */
function cong232Longest(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, c] = triSides(rng);
  const long = Math.max(a, b, c);
  return make(
    unit,
    `서로 합동인 두 삼각형이 있습니다. 한 삼각형의 세 변이 ${n(a)} cm, ${n(b)} cm, ${n(c)} cm일 때, 다른 삼각형의 가장 긴 변은 몇 cm입니까?`,
    n(long),
    `합동이면 대응하는 변의 길이가 같으므로 가장 긴 변도 ${n(long)} cm입니다.`,
  );
}

/** 문형 07 — 가장 짧은 변. */
function cong232Shortest(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, c] = triSides(rng);
  const short = Math.min(a, b, c);
  return make(
    unit,
    `서로 합동인 두 삼각형이 있습니다. 한 삼각형의 세 변이 ${n(a)} cm, ${n(b)} cm, ${n(c)} cm일 때, 다른 삼각형의 가장 짧은 변은 몇 cm입니까?`,
    n(short),
    `합동이면 대응하는 변의 길이가 같으므로 가장 짧은 변도 ${n(short)} cm입니다.`,
  );
}

/** 문형 08 — 두 삼각형 둘레의 합. 연산은 한 둘레다. */
function cong232BothPer(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, c] = triSides(rng);
  return make(
    unit,
    `서로 합동인 두 삼각형이 있습니다. 한 삼각형의 세 변이 ${n(a)} cm, ${n(b)} cm, ${n(c)} cm일 때, 두 삼각형의 둘레의 합은 몇 cm입니까?`,
    n((a + b + c) * 2),
    `한 둘레는 ${expr(`${a}+${b}+${c}=${a + b + c}`)} cm이고 두 삼각형이 합동이므로 합은 ${expr(`${a + b + c}\\times2=${(a + b + c) * 2}`)} cm입니다.`,
  );
}

/** 문형 09 — 두 삼각형에서 대응각의 합. 05가 대응변 항등(=n0)이라 각을 복사하면 같은 셈이다. */
function cong232MatchAngle(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 35, 80);
  return make(
    unit,
    `두 삼각형은 서로 합동입니다. 한 삼각형의 한 각이 ${expr(`${x}^\\circ`)}일 때, 두 삼각형에서 이와 대응하는 각의 합은 몇 도입니까?`,
    expr(`${2 * x}^\\circ`),
    `대응하는 각의 크기는 서로 같으므로 합은 ${expr(`${x}+${x}=${2 * x}`)}, 곧 ${expr(`${2 * x}^\\circ`)}입니다.`,
  );
}

/** 문형 10 — 이등변의 밑각. */
function cong232BaseAngle(unit: UnitSeed, rng: Rng): ElemProblem {
  const vertex = pick(rng, [40, 50, 60, 70, 80]);
  const base = (180 - vertex) / 2;
  return make(
    unit,
    `어떤 이등변삼각형과 합동인 삼각형의 꼭지각이 ${expr(`${vertex}^\\circ`)}입니다. 밑각의 크기는 몇 도입니까?`,
    expr(`${base}^\\circ`),
    `합동이면 각의 크기도 같습니다. 밑각은 ${expr(`(180-${vertex})\\div2=${base}`)}이므로 ${expr(`${base}^\\circ`)}입니다.`,
  );
}

/* ── 2-3-3 선대칭도형과 그 성질 — 격자 모드(표준은 motif 만 쓴다) ── */

/** 대칭축 개수가 알려진 도형들 — 답이 2~6 으로 갈린다. */
const AXIS_COUNTS = [
  ["isoTri", "이등변삼각형", 1],
  ["rect", "직사각형", 2],
  ["eqTri", "정삼각형", 3],
  ["square", "정사각형", 4],
  ["pentagon", "정오각형", 5],
  ["hexagon", "정육각형", 6],
  ["octagon", "정팔각형", 8],
] as const;

/** 연산 — 대칭축이 몇 개인지 센다(절차 한 번). */
function sym233Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [shape, name, count] = pick(rng, AXIS_COUNTS);
  const ask = pick(rng, [
    "대칭축은 모두 몇 개입니까?",
    "접었을 때 완전히 겹치는 직선은 모두 몇 개입니까?",
  ]);
  return make(
    unit,
    `${name}${shape === "isoTri" ? "(정삼각형이 아닌)" : shape === "rect" ? "(정사각형이 아닌)" : ""}의 ${ask}`,
    n(count),
    `${name}은 접었을 때 완전히 겹치는 직선이 ${n(count)}개 있으므로 대칭축은 ${n(count)}개입니다.`,
    fig("markedShape", { shape }),
  );
}

/** 왼쪽 절반에만 칸을 찍는다 — 대칭축은 세로 가운데. */
function halfCells(
  rng: Rng,
  n: number,
): { cells: [number, number][]; off: number; on: number } {
  const mid = (n - 1) / 2;
  const cells: [number, number][] = [];
  let off = 0;
  let on = 0;
  const rows = shuffled(rng, [...Array(n).keys()]).slice(
    0,
    intBetween(rng, 3, Math.min(5, n)),
  );
  for (const [i, row] of rows.entries()) {
    // ⚠️ 전부 대칭축 위에 앉으면 「몇 칸 더 색칠하나」가 **0**이 되어 묻는 것이 사라진다.
    //    첫 칸은 축 **밖**으로 박아 구성으로 막는다(뽑고 거르지 않는다).
    const col =
      i === 0
        ? intBetween(rng, 0, Math.floor(mid) - 1)
        : intBetween(rng, 0, Math.floor(mid));
    cells.push([col, row]);
    if (col === mid) on += 1;
    else off += 1;
  }
  return { cells, off, on };
}

/** 기본 — 선대칭이 되려면 **몇 칸 더** 색칠해야 하는가(한 겹). */
function sym233Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const size = 5;
  const { cells, off } = halfCells(rng, size);
  return make(
    unit,
    `점선을 대칭축으로 하는 선대칭인 무늬를 만들려고 합니다. ${pick(rng, [
      "몇 칸을 더 색칠해야 합니까?",
      "색칠해야 할 칸은 몇 칸입니까?",
      "더 칠할 칸의 수를 구하시오.",
    ])}`,
    n(off),
    `대칭축 위에 있는 칸은 그대로 겹치지만, 대칭축에서 떨어진 칸은 반대쪽에도 하나씩 있어야 합니다. 떨어진 칸이 ${n(off)}칸이므로 ${n(off)}칸을 더 색칠해야 합니다.`,
    fig("symmetry", { axis: "v", n: size, cells }),
  );
}

/** 응용 — 더 칠한 **뒤** 전체가 몇 칸인지(두 단계). */
function sym233Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const size = 5;
  const { cells, off, on } = halfCells(rng, size);
  const now = off + on;
  const done = off * 2 + on;
  return make(
    unit,
    `점선을 대칭축으로 하는 선대칭인 무늬를 완성하려고 합니다. ${pick(rng, [
      "완성했을 때 색칠된 칸은 모두 몇 칸입니까?",
      "완성한 무늬의 색칠된 칸 수를 구하시오.",
      "다 칠하고 나면 색칠된 칸은 모두 몇 칸입니까?",
    ])}`,
    n(done),
    `지금 색칠된 칸은 ${n(now)}칸이고, 그중 대칭축에서 떨어진 ${n(off)}칸은 반대쪽에도 하나씩 필요합니다. 따라서 ${expr(`${now}+${off}=${done}`)}이므로 ${n(done)}칸입니다.`,
    fig("symmetry", { axis: "v", n: size, cells }),
  );
}

/**
 * 심화 — **역산**: 완성본에서 처음을 거슬러 구한다.
 * 완성 칸 `= 2·off + on` 이므로 `off = (done − on) / 2` — `done − on` 이 짝수인 것이
 * **구성으로** 보장된다(`off`·`on` 을 먼저 잡는다).
 */
function sym233Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const off = intBetween(rng, 2, 6);
  const on = intBetween(rng, 1, 3);
  const done = off * 2 + on;
  return make(
    unit,
    `선대칭인 무늬를 완성했더니 색칠된 칸이 모두 ${n(done)}칸이었고, 그중 대칭축 위에 있는 칸이 ${n(on)}칸이었습니다. 완성하기 전에 색칠되어 있던 칸은 몇 칸입니까?`,
    n(off + on),
    `대칭축 위의 ${n(on)}칸을 빼면 ${expr(`${done}-${on}=${off * 2}`)}칸이 남고, 이 칸들은 대칭축 양쪽에 똑같이 나뉘므로 한쪽에 ${expr(`${off * 2}\\div2=${off}`)}칸입니다. 완성 전에는 한쪽 ${n(off)}칸과 대칭축 위 ${n(on)}칸이 색칠되어 있었으므로 ${expr(`${off}+${on}=${off + on}`)}칸입니다.`,
  );
}

/** 문형 05 — 두 도형의 대칭축 개수의 합. */
function sym233AxisSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const two = pickSome(rng, AXIS_COUNTS, 2);
  const sum = two[0]![2] + two[1]![2];
  return make(
    unit,
    `${two[0]![1]}의 대칭축 개수와 ${two[1]![1]}의 대칭축 개수의 합은 얼마입니까?`,
    n(sum),
    `${two[0]![1]}은 ${n(two[0]![2])}개, ${two[1]![1]}은 ${n(two[1]![2])}개이므로 합은 ${n(sum)}입니다.`,
    fig("markedShape", { shape: two[0]![0] }),
  );
}

/** 문형 06 — 두 도형의 대칭축 개수의 차. */
function sym233AxisDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const two = pickSome(rng, AXIS_COUNTS, 2);
  const gap = Math.abs(two[0]![2] - two[1]![2]);
  return make(
    unit,
    `${two[0]![1]}의 대칭축 개수와 ${two[1]![1]}의 대칭축 개수의 차는 얼마입니까?`,
    n(gap),
    `${two[0]![1]}은 ${n(two[0]![2])}개, ${two[1]![1]}은 ${n(two[1]![2])}개이므로 차는 ${n(gap)}입니다.`,
  );
}

/** 문형 07 — 대칭축 위에 있는 칸. */
function sym233OnAxis(unit: UnitSeed, rng: Rng): ElemProblem {
  const size = 5;
  const { cells, on } = halfCells(rng, size);
  return make(
    unit,
    `점선을 대칭축으로 하는 선대칭인 무늬를 만들려고 합니다. 지금 색칠된 칸 중 대칭축 위에 있는 칸은 몇 칸입니까?`,
    n(on),
    `대칭축 위에 있는 칸은 ${n(on)}칸입니다.`,
    fig("symmetry", { axis: "v", n: size, cells }),
  );
}

/** 문형 08 — 완성한 뒤 축에서 떨어진 칸. 기본은 더 칠할 칸(=떨어진 칸)이다. */
function sym233OffAfter(unit: UnitSeed, rng: Rng): ElemProblem {
  const size = 5;
  const { cells, off } = halfCells(rng, size);
  return make(
    unit,
    `점선을 대칭축으로 하는 선대칭인 무늬를 완성했을 때, 대칭축에서 떨어진 색칠된 칸은 모두 몇 칸입니까?`,
    n(off * 2),
    `떨어진 칸은 양쪽에 ${n(off)}칸씩이므로 ${expr(`${off}\\times2=${off * 2}`)}칸입니다.`,
    fig("symmetry", { axis: "v", n: size, cells }),
  );
}

/** 문형 09 — 대칭축 개수가 주어진 도형의 이름. */
function sym233NameOf(unit: UnitSeed, rng: Rng): ElemProblem {
  const [shape, name, count] = pick(rng, AXIS_COUNTS);
  return make(
    unit,
    `대칭축이 ${n(count)}개인 도형의 이름을 쓰시오. (정다각형 또는 이등변삼각형, 직사각형)`,
    name,
    `대칭축이 ${n(count)}개인 도형은 ${name}입니다.`,
    fig("markedShape", { shape }),
  );
}

/** 문형 10 — 격자 한 줄의 칸 수. size는 5로 고정이라 변형이 안 선다. 색칠된 칸 수(지금)를 묻는다. */
function sym233NowCells(unit: UnitSeed, rng: Rng): ElemProblem {
  const size = 5;
  const { cells, off, on } = halfCells(rng, size);
  return make(
    unit,
    `점선을 대칭축으로 하는 선대칭인 무늬를 만들려고 합니다. 지금 색칠된 칸은 몇 칸입니까?`,
    n(off + on),
    `지금 색칠된 칸은 ${n(off + on)}칸입니다.`,
    fig("symmetry", { axis: "v", n: size, cells }),
  );
}

/* ── 2-3-4 점대칭도형과 그 성질 — 표준이 «한 변 ↔ 대응변» 하나만 쓰므로 «둘레» 축으로 ── */

/** 연산 — 점대칭 격자를 완성하는 데 몇 칸 더(절차 한 번). 표준에 없는 그림이다. */
function sym234Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const size = 5;
  // ⚠️ 가운데 칸은 ${"180"}도 돌려도 제자리라 **제 짝**이다. 그 칸이 끼면
  //    「칸 수 = 더 칠할 칸 수」가 깨진다. 위쪽 절반(행 < 가운데)에만 두어
  //    그 예외를 **구성으로** 없앤다 — 그러면 답이 언제나 칸 수와 같다.
  const rows = shuffled(rng, [0, 1]).slice(0, 2);
  const cells: [number, number][] = [];
  for (const row of rows)
    for (const col of shuffled(rng, [0, 1, 2, 3, 4]).slice(
      0,
      intBetween(rng, 1, 3),
    ))
      cells.push([col, row]);
  return make(
    unit,
    `가운데 점을 대칭의 중심으로 하는 점대칭도형을 만들려고 합니다. ${pick(
      rng,
      [
        "몇 칸을 더 색칠해야 합니까?",
        "색칠해야 할 칸은 몇 칸입니까?",
        "더 칠할 칸의 수를 구하시오.",
      ],
    )}`,
    n(cells.length),
    `점대칭도형은 가운데 점을 중심으로 ${expr("180^\\circ")} 돌렸을 때 처음과 겹칩니다. 색칠된 ${n(cells.length)}칸마다 마주 보는 자리에 하나씩 필요하므로 ${n(cells.length)}칸을 더 색칠해야 합니다.`,
    fig("symmetry", { axis: "point", n: size, cells }),
  );
}

/** 기본 — 마주 보는 변이 서로 같으므로 절반만 알면 둘레가 선다(한 겹). */
function sym234Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, c] = triSides(rng);
  return make(
    unit,
    `점대칭인 육각형의 마주 보는 변은 서로 길이가 같습니다. 이웃한 세 변이 ${n(a)} cm, ${n(b)} cm, ${n(c)} cm일 때 이 육각형의 둘레는 몇 cm입니까?`,
    n((a + b + c) * 2),
    `점대칭도형에서 대응하는 변의 길이는 서로 같으므로 나머지 세 변도 ${n(a)} cm, ${n(b)} cm, ${n(c)} cm입니다. 둘레는 ${expr(`(${a}+${b}+${c})\\times2=${(a + b + c) * 2}`)}이므로 ${n((a + b + c) * 2)} cm입니다.`,
  );
}

/** 응용 — 둘레에서 나머지 한 변을 되찾는다(두 단계). */
function sym234Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, c] = triSides(rng);
  const round = (a + b + c) * 2;
  return make(
    unit,
    `둘레가 ${n(round)} cm인 점대칭 육각형이 있습니다. 마주 보는 변은 서로 같고 이웃한 세 변 중 둘이 ${n(a)} cm, ${n(b)} cm일 때, 나머지 한 변은 몇 cm입니까?`,
    n(c),
    `마주 보는 변끼리 같으므로 이웃한 세 변의 합은 둘레의 절반인 ${expr(`${round}\\div2=${a + b + c}`)} cm입니다. 여기서 두 변을 빼면 ${expr(`${a + b + c}-${a}-${b}=${c}`)}이므로 ${n(c)} cm입니다.`,
  );
}

/**
 * 심화 — **역산 + 조건**: 둘레와 「연속한 자연수」 조건이 세 변을 하나로 정한다.
 *
 * ⚠️ 표준 2-3-4 가 이미 「대칭의 중심에서 대응점까지의 거리」를 쓴다(R5) — 그래서
 *    거리 축은 피하고 **둘레 + 연속 조건**으로 간다.
 * ⚠️ **답에서 거꾸로 짓는다**(D-66 ⒂): 가장 짧은 변 `k` 를 먼저 잡고 둘레를 만든다.
 *    둘레를 먼저 뽑으면 `둘레/2` 가 3의 배수가 아닐 수 있어 답이 정수가 아니게 된다.
 */
function sym234Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 3, 12);
  const half = k + (k + 1) + (k + 2);
  const round = half * 2;
  return make(
    unit,
    `둘레가 ${n(round)} cm인 점대칭 육각형이 있습니다. 마주 보는 변은 서로 길이가 같고, 이웃한 세 변의 길이가 연속한 세 자연수일 때 가장 짧은 변은 몇 cm입니까?`,
    n(k),
    // ⚠️ 여기 두 자리가 **홑 역슬래시**라 지면에 `$60div2=30$` 이 날 글자로 나갔다
    //    (토대 17 §7 · 물결 2 보고서 §7-4 가 「다음 회차가 반드시 고칠 것」으로 넘긴 자리).
    //    초등 엔진 전량에서 이 한 자리뿐이었다 — 난이도는 한 글자도 안 바뀐다.
    `마주 보는 변끼리 같으므로 이웃한 세 변의 합은 둘레의 절반인 ${expr(`${round}\\div2=${half}`)} cm입니다. 연속한 세 자연수의 합이 ${n(half)}이므로 가운데 수는 ${expr(`${half}\\div3=${k + 1}`)}이고, 가장 짧은 변은 ${expr(`${k + 1}-1=${k}`)}, 곧 ${n(k)} cm입니다.`,
  );
}

/** 문형 05 — 점대칭으로 돌리는 각도. 발문에 칸 수가 서서 변형이 갈린다. */
function sym234TurnDeg(unit: UnitSeed, rng: Rng): ElemProblem {
  const size = 5;
  const rows = shuffled(rng, [0, 1]).slice(0, 2);
  const cells: [number, number][] = [];
  for (const row of rows)
    for (const col of shuffled(rng, [0, 1, 2, 3, 4]).slice(
      0,
      intBetween(rng, 1, 3),
    ))
      cells.push([col, row]);
  return make(
    unit,
    `가운데 점을 대칭의 중심으로 하는 점대칭도형에서, 색칠된 ${n(cells.length)}칸이 처음과 겹치려면 몇 도 돌려야 합니까?`,
    expr("180^\\circ"),
    `점대칭도형은 가운데 점을 중심으로 ${expr("180^\\circ")} 돌렸을 때 처음과 겹칩니다.`,
    fig("symmetry", { axis: "point", n: size, cells }),
  );
}

/** 문형 06 — 완성한 뒤 색칠된 칸. */
function sym234DoneCells(unit: UnitSeed, rng: Rng): ElemProblem {
  const size = 5;
  const rows = shuffled(rng, [0, 1]).slice(0, 2);
  const cells: [number, number][] = [];
  for (const row of rows)
    for (const col of shuffled(rng, [0, 1, 2, 3, 4]).slice(
      0,
      intBetween(rng, 1, 3),
    ))
      cells.push([col, row]);
  return make(
    unit,
    `가운데 점을 대칭의 중심으로 하는 점대칭도형을 완성했을 때 색칠된 칸은 모두 몇 칸입니까?`,
    n(cells.length * 2),
    `지금 ${n(cells.length)}칸이고 마주 보는 자리에 ${n(cells.length)}칸을 더 칠하므로 ${expr(`${cells.length}\\times2=${cells.length * 2}`)}칸입니다.`,
    fig("symmetry", { axis: "point", n: size, cells }),
  );
}

/** 문형 07 — 마주 보는 변의 길이. */
function sym234OppSide(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 3, 14);
  return make(
    unit,
    `점대칭인 육각형의 한 변이 ${n(a)} cm입니다. 이 변과 마주 보는 변의 길이는 몇 cm입니까?`,
    n(a),
    `점대칭도형에서 대응하는 변의 길이는 서로 같으므로 ${n(a)} cm입니다.`,
  );
}

/** 문형 08 — 둘레의 절반. */
function sym234HalfPer(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, c] = triSides(rng);
  return make(
    unit,
    `점대칭인 육각형의 이웃한 세 변이 ${n(a)} cm, ${n(b)} cm, ${n(c)} cm일 때, 둘레의 절반은 몇 cm입니까?`,
    n(a + b + c),
    `마주 보는 변이 같으므로 둘레의 절반은 ${expr(`${a}+${b}+${c}=${a + b + c}`)} cm입니다.`,
  );
}

/** 문형 09 — 이웃한 세 변 중 가장 긴 변. */
function sym234Longest(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, c] = triSides(rng);
  const long = Math.max(a, b, c);
  return make(
    unit,
    `점대칭인 육각형의 이웃한 세 변이 ${n(a)} cm, ${n(b)} cm, ${n(c)} cm일 때, 가장 긴 변은 몇 cm입니까?`,
    n(long),
    `이웃한 세 변 중 가장 긴 변은 ${n(long)} cm이고, 마주 보는 변도 같습니다.`,
  );
}

/** 문형 10 — 점대칭인 육각형의 둘레. */
function sym234Shortest(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, c] = triSides(rng);
  const perimeter = 2 * (a + b + c);
  return make(
    unit,
    `점대칭인 육각형의 이웃한 세 변이 ${n(a)} cm, ${n(b)} cm, ${n(c)} cm일 때, 둘레는 몇 cm입니까?`,
    n(perimeter),
    `점대칭인 육각형은 마주 보는 변의 길이가 같으므로 둘레는 ${expr(`(${a}+${b}+${c})\\times2=${perimeter}`)} cm입니다.`,
  );
}

/* ────────── 2-5 직육면체 — 난이도 4단 (D-72 확대 13차) ──────────
 *
 * ⚠️ **쓸 수 있는 «양»이 이 대단원만 유난히 좁다.** 세 방향에서 막힌다:
 *    ㉠ **겉넓이·부피는 초6** (1-6-1·1-6-2, g6 가 이미 갈래를 썼다) — D-66 ⑶ 위반이자
 *       남의 학년과 겹친다. **쓰지 않는다.**
 *    ㉡ **한 면의 넓이·둘레는 초5 1-6** — 실측으로 정면 충돌을 확인했다:
 *         1-6-2 연산 「한 변이 $15$ cm인 정사각형의 **넓이**는?」
 *         1-6-1 연산 「가로 $18$, 세로 $10$ 인 직사각형의 **둘레**는?」
 *       그래서 2-5-1 에서 «한 면의 넓이·둘레»를 통째로 뺐다(D-66 ⒃ 형제 소단원).
 *    ㉢ 표준이 이미 쓰는 것 — 모서리 합(2-5-1·2-5-5) · 마주 보는 면(2-5-5) ·
 *       구성요소 개수(2-5-2·2-5-3·2-5-4).
 *
 * ⚠️ **개수를 물으면 답이 상수다.** 「평행한 면은 몇 쌍?」은 어느 씨앗에서도 3이라
 *    「답 가짓수」를 못 넘는다. **가드를 푸는 대신 문형을 바꿨다**(2026-08-23 리드) —
 *    «몇 개인가»가 아니라 **«어느 것인가»**를 묻는다:
 *
 *      ✗ 평행한 면은 몇 쌍입니까?              → 늘 3
 *      ✓ 가로 $8$·세로 $5$ 인 면과 **평행한 면의 넓이**는?  → 치수마다 갈린다
 *
 *    소단원이 가르치는 것(평행한 면은 합동 · 숨은 모서리는 세 방향 하나씩)이 **답을
 *    내는 근거 그 자체**라, 곱셈을 억지로 얹은 것이 아니다. **2-5-3 의 «넓이»는
 *    목적이 아니라 수단이다** — 묻는 것은 «어느 면인가»이고 넓이는 그 답을 적는 방법일
 *    뿐이다(1-6 은 넓이가 목적이다. 이 문장을 지우면 다음 사람이 「1-6 과 겹치네」로
 *    읽고 이 갈래를 지운다).
 *
 * ⚠️ **꼭짓점 이름(ㄱㄴㄷㄹ)은 엔진에 없다.** 실측: `cuboid`·`netCuboid` 의 허용 키는
 *    `{w,d,h}` 뿐이고, `validate_elementary` 가 다른 키를 막는다(「허용되지 않은 키」).
 *    그려지는 글자는 치수 셋뿐이다. 그래서 면·모서리를 **치수로** 지목한다 — 기호로
 *    지목하면 «가리킬 데가 없어 못 푸는 문항»이 된다.
 */

/** 세 모서리 — 서로 달라야 「가로 w·세로 d 인 면」이 하나로 정해진다. */
function boxDims(rng: Rng): { w: number; d: number; h: number } {
  const w = intBetween(rng, 5, 12);
  const d = pick(
    rng,
    [2, 3, 4, 6, 7, 8, 9].filter((v) => v !== w),
  );
  const h = pick(
    rng,
    [2, 3, 4, 5, 6, 7, 9].filter((v) => v !== w && v !== d),
  );
  return { w, d, h };
}

/* ── 2-5-2 정사각형 6개로 둘러싸인 도형(정육면체) — **모서리만** 쓴다 ──
 * ⚠️ 번호를 조심하라 — **2-5-1 이 «직사각형 6개»(직육면체)**, 2-5-2 가 정육면체다.
 *    이름과 번호가 짐작과 반대라 처음에 거꾸로 등록했다(2026-08-23, 렌더해서 찾았다).
 */

/** 연산 — 모서리 합에서 한 모서리를 되찾는다(나눗셈 한 번). 표준은 정방향을 쓴다. */
function boxCubeCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 3, 15);
  return make(
    unit,
    `정육면체의 모든 모서리 길이의 합이 ${n(12 * e)} cm입니다. 한 모서리의 길이는 몇 cm입니까?`,
    n(e),
    `정육면체의 모서리는 ${n(12)}개이고 길이가 모두 같습니다. ${expr(`${12 * e}\\div12=${e}`)}이므로 ${n(e)} cm입니다.`,
    fig("cuboid", { w: e, d: e, h: e, showDimensions: false }),
  );
}

/** 기본 — 문장에서 «모서리 열둘»을 스스로 떠올린다(한 겹). */
function boxCubeRead(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 3, 15);
  const thing = pick(rng, [
    "상자",
    "주사위 모양 나무토막",
    "선물 상자",
  ] as const);
  return make(
    unit,
    `한 모서리의 길이가 ${n(e)} cm인 정육면체 모양 ${thing}의 모든 모서리에 테이프를 붙이려고 합니다. 테이프는 몇 cm 필요합니까?`,
    n(12 * e),
    `정육면체의 모서리는 ${n(12)}개이고 길이가 모두 같으므로 ${expr(`${e}\\times12=${12 * e}`)}입니다. 테이프는 ${n(12 * e)} cm 필요합니다.`,
    fig("cuboid", { w: e, d: e, h: e }),
  );
}

/** 응용 — 두르고 **남는 길이**를 묻는다(두 단계). 남는 양은 구성상 양수다. */
function boxCubeApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 3, 12);
  const left = intBetween(rng, 4, 40);
  const tape = 12 * e + left;
  return make(
    unit,
    `길이가 ${n(tape)} cm인 테이프로 한 모서리가 ${n(e)} cm인 정육면체 모양 상자의 모든 모서리를 붙였습니다. 남는 테이프는 몇 cm입니까?`,
    n(left),
    `모서리에 쓴 테이프는 ${expr(`${e}\\times12=${12 * e}`)} cm입니다. 남는 것은 ${expr(`${tape}-${12 * e}=${left}`)}이므로 ${n(left)} cm입니다.`,
    fig("cuboid", { w: e, d: e, h: e }),
  );
}

/**
 * 심화 — **조건 조합**: 모서리 합이 같은 정육면체와 직육면체.
 *
 * ⚠️ **답에서 거꾸로 짓는다**(D-66 ⒂) — 정육면체의 모서리 `e` 를 먼저 잡아 합을 만들고,
 *    직육면체의 두 모서리를 그 안에서 고른다. 합을 먼저 뽑으면 `4` 로 안 나뉘거나
 *    남은 모서리가 0 이하가 되고, 그때 거르면 후보가 비는 씨앗이 생긴다.
 */
function boxCubeDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 5, 12);
  const total = 12 * e; // = 4·(w+d+h) 이므로 w+d+h = 3e
  const w = intBetween(rng, 2, 3 * e - 3);
  const d = intBetween(rng, 1, 3 * e - w - 1);
  const h = 3 * e - w - d;
  return make(
    unit,
    `한 모서리가 ${n(e)} cm인 정육면체와 모든 모서리 길이의 합이 같은 직육면체가 있습니다. 이 직육면체의 가로가 ${n(w)} cm, 세로가 ${n(d)} cm일 때 높이는 몇 cm입니까?`,
    n(h),
    `정육면체의 모서리 길이의 합은 ${expr(`${e}\\times12=${total}`)} cm입니다. 직육면체는 가로·세로·높이가 각각 ${n(4)}개씩이므로 세 모서리의 합은 ${expr(`${total}\\div4=${3 * e}`)} cm입니다. 따라서 높이는 ${expr(`${3 * e}-${w}-${d}=${h}`)}이므로 ${n(h)} cm입니다.`,
  );
}

/** 문형 05 — 면의 개수. */
function boxCubeFaces(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 3, 15);
  return make(
    unit,
    `한 모서리의 길이가 ${n(e)} cm인 정육면체의 면은 몇 개입니까?`,
    n(6),
    `정육면체는 정사각형 ${n(6)}개로 둘러싸여 있으므로 면은 ${n(6)}개입니다.`,
    fig("cuboid", { w: e, d: e, h: e }),
  );
}

/** 문형 06 — 꼭짓점 개수. */
function boxCubeVertices(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 3, 15);
  return make(
    unit,
    `한 모서리의 길이가 ${n(e)} cm인 정육면체의 꼭짓점은 몇 개입니까?`,
    n(8),
    `정육면체의 꼭짓점은 ${n(8)}개입니다.`,
    fig("cuboid", { w: e, d: e, h: e }),
  );
}

/** 문형 07 — 모서리 개수. */
function boxCubeEdgeCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 3, 15);
  return make(
    unit,
    `한 모서리의 길이가 ${n(e)} cm인 정육면체의 모서리는 몇 개입니까?`,
    n(12),
    `정육면체의 모서리는 ${n(12)}개입니다.`,
    fig("cuboid", { w: e, d: e, h: e }),
  );
}

/** 문형 08 — 한 꼭짓점에 모이는 모서리. */
function boxCubeVertexEdges(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 3, 15);
  return make(
    unit,
    `한 모서리의 길이가 ${n(e)} cm인 정육면체에서 한 꼭짓점에 모이는 모서리는 몇 개입니까?`,
    n(3),
    `한 꼭짓점에 모서리가 ${n(3)}개 모입니다.`,
    fig("cuboid", { w: e, d: e, h: e }),
  );
}

/** 문형 09 — 한 면에 있는 모서리. */
function boxCubeFaceEdges(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 3, 15);
  return make(
    unit,
    `한 모서리의 길이가 ${n(e)} cm인 정육면체에서 한 면에 있는 모서리는 몇 개입니까?`,
    n(4),
    `한 면은 정사각형이므로 모서리는 ${n(4)}개입니다.`,
    fig("cuboid", { w: e, d: e, h: e }),
  );
}

/** 문형 10 — 모서리 합이 같은 직육면체의 세 모서리 합. */
function boxCubeThreeSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 3, 15);
  return make(
    unit,
    `한 모서리가 ${n(e)} cm인 정육면체와 모든 모서리 길이의 합이 같은 직육면체가 있습니다. 그 직육면체의 가로·세로·높이의 합은 몇 cm입니까?`,
    n(3 * e),
    `정육면체의 모서리 합은 ${expr(`${e}\\times12=${12 * e}`)} cm이고, 직육면체는 세 모서리가 각각 ${n(4)}개이므로 ${expr(`${12 * e}\\div4=${3 * e}`)} cm입니다.`,
    fig("cuboid", { w: e, d: e, h: e }),
  );
}

/* ── 2-5-1 직사각형 6개로 둘러싸인 도형(직육면체) ── */

/** 연산 — 세 모서리에서 모든 모서리 길이의 합(절차 한 번). */
function boxRectCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 모든 모서리 길이의 합은 몇 cm입니까?`,
    n(4 * (w + d + h)),
    `직육면체는 길이가 같은 모서리가 ${n(4)}개씩 세 무리 있습니다. ${expr(`(${w}+${d}+${h})\\times4=${4 * (w + d + h)}`)}이므로 ${n(4 * (w + d + h))} cm입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 기본 — 문장에서 스스로 세운다(한 겹). */
function boxRectRead(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로 ${n(w)} cm, 세로 ${n(d)} cm, 높이 ${n(h)} cm인 직육면체 모양 상자의 모든 모서리에 색 끈을 두르려고 합니다. 색 끈은 몇 cm 필요합니까?`,
    n(4 * (w + d + h)),
    `가로·세로·높이가 각각 ${n(4)}개씩이므로 ${expr(`(${w}+${d}+${h})\\times4=${4 * (w + d + h)}`)}입니다. 색 끈은 ${n(4 * (w + d + h))} cm 필요합니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 응용 — 모서리 합에서 남은 한 모서리를 되찾는다(두 단계). */
function boxRectApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  const total = 4 * (w + d + h);
  return make(
    unit,
    `직육면체의 모든 모서리 길이의 합이 ${n(total)} cm입니다. 가로가 ${n(w)} cm, 세로가 ${n(d)} cm일 때 높이는 몇 cm입니까?`,
    n(h),
    `가로·세로·높이가 각각 ${n(4)}개씩이므로 세 모서리의 합은 ${expr(`${total}\\div4=${w + d + h}`)} cm입니다. 높이는 ${expr(`${w + d + h}-${w}-${d}=${h}`)}이므로 ${n(h)} cm입니다.`,
  );
}

/**
 * 심화 — **역산 + 조건**: 「가로가 세로의 몇 배」가 답을 하나로 만든다.
 * `d` 와 배수 `k` 를 먼저 잡아 합을 만든다 — 나눗셈이 딱 떨어지는 것이 구성 보장이다.
 */
function boxRectDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 2, 7);
  const k = intBetween(rng, 2, 4);
  const w = d * k;
  const h = intBetween(rng, 2, 9);
  const total = 4 * (w + d + h);
  return make(
    unit,
    `모든 모서리 길이의 합이 ${n(total)} cm인 직육면체가 있습니다. 가로는 세로의 ${n(k)}배이고 높이가 ${n(h)} cm일 때, 세로는 몇 cm입니까?`,
    n(d),
    `세 모서리의 합은 ${expr(`${total}\\div4=${w + d + h}`)} cm이고, 높이를 빼면 ${expr(`${w + d + h}-${h}=${w + d}`)} cm가 가로와 세로의 합입니다. 가로가 세로의 ${n(k)}배이므로 세로의 ${expr(`${k}+1=${k + 1}`)}배가 ${n(w + d)} cm입니다. 따라서 ${expr(`${w + d}\\div${k + 1}=${d}`)}이므로 세로는 ${n(d)} cm입니다.`,
  );
}

/** 문형 02 — 면의 개수. 색 끈 문장은 모서리 합과 같은 물음이라 새 틀이 아니다. */
function boxRectFaces(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 면은 몇 개입니까?`,
    n(6),
    `직육면체는 직사각형 ${n(6)}개로 둘러싸여 있으므로 면은 ${n(6)}개입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 문형 05 — 꼭짓점 개수. */
function boxRectVertices(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 꼭짓점은 몇 개입니까?`,
    n(8),
    `직육면체의 꼭짓점은 ${n(8)}개입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 문형 06 — 모서리 개수(길이가 아니라 개수). */
function boxRectEdgeCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 모서리는 몇 개입니까?`,
    n(12),
    `직육면체의 모서리는 ${n(12)}개입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 문형 07 — 합동인 면 쌍. */
function boxRectFacePairs(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체에서 서로 합동인 면은 몇 쌍입니까?`,
    n(3),
    `마주 보는 면이 합동이므로 ${n(3)}쌍입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 문형 08 — 한 꼭짓점에서 만나는 모서리. */
function boxRectVertexEdges(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체에서 한 꼭짓점에 모이는 모서리는 몇 개입니까?`,
    n(3),
    `한 꼭짓점에 가로·세로·높이 모서리가 하나씩 모이므로 ${n(3)}개입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 문형 09 — 서로 다른 모양의 면 종류. */
function boxRectFaceKinds(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체에서 서로 다른 모양의 면은 몇 종류입니까?`,
    n(3),
    `가로·세로·높이가 모두 다르므로 면의 모양은 ${n(3)}종류입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 문형 10 — 가로·세로인 면은 몇 개. */
function boxRectGivenFaceCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체에서 가로 ${n(w)} cm, 세로 ${n(d)} cm인 면은 몇 개입니까?`,
    n(2),
    `마주 보는 면이 합동이므로 그런 면은 ${n(2)}개입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

export const G5_FORMS: Record<string, readonly ElemForm[]> = {
  "초5|1-1-1": [
    { id: "01", tier: "연산", generate: mix111Calc },
    { id: "02", tier: "기본", generate: mix111Read },
    { id: "03", tier: "응용", generate: mix111Apply },
    { id: "04", tier: "심화하", generate: mix111Deep },
    { id: "05", tier: "기본", generate: mix111Paren },
    { id: "06", tier: "기본", generate: mix111FirstStep },
    { id: "07", tier: "기본", generate: mix111Judge },
    { id: "08", tier: "응용", generate: mix111OrderDiff },
    { id: "09", tier: "응용", generate: mix111Missing },
    { id: "10", tier: "응용", generate: mix111Bigger },
  ],
  "초5|1-1-2": [
    { id: "01", tier: "연산", generate: mix112Calc },
    { id: "02", tier: "기본", generate: mix112Read },
    { id: "03", tier: "응용", generate: mix112Apply },
    { id: "04", tier: "심화하", generate: mix112Deep },
    { id: "05", tier: "기본", generate: mix112Ltr },
    { id: "06", tier: "기본", generate: mix112FirstOp },
    { id: "07", tier: "기본", generate: mix112Judge },
    { id: "08", tier: "응용", generate: mix112OrderDiff },
    { id: "09", tier: "응용", generate: mix112ThenAdd },
    { id: "10", tier: "응용", generate: mix112Bigger },
  ],
  "초5|1-1-3": [
    { id: "01", tier: "연산", generate: mix113Calc },
    { id: "02", tier: "기본", generate: mix113Read },
    { id: "03", tier: "응용", generate: mix113Apply },
    { id: "04", tier: "심화하", generate: mix113Deep },
    { id: "05", tier: "기본", generate: mix113MulFirst },
    { id: "06", tier: "기본", generate: mix113Judge },
    { id: "07", tier: "기본", generate: mix113Ltr },
    { id: "08", tier: "응용", generate: mix113MulDivSum },
    { id: "09", tier: "응용", generate: mix113ThenAdd },
    { id: "10", tier: "응용", generate: mix113Bigger },
  ],
  "초5|1-2-3": [
    { id: "01", tier: "연산", generate: comdiv123Calc },
    { id: "02", tier: "기본", generate: comdiv123Read },
    { id: "03", tier: "응용", generate: comdiv123Apply },
    { id: "04", tier: "심화하", generate: comdiv123Deep },
    { id: "05", tier: "기본", generate: comdiv123Gcd },
    { id: "06", tier: "기본", generate: comdiv123Smallest },
    { id: "07", tier: "기본", generate: comdiv123OddCount },
    { id: "08", tier: "응용", generate: comdiv123QuotientSum },
    { id: "09", tier: "응용", generate: comdiv123EvenSum },
    { id: "10", tier: "응용", generate: comdiv123MinMaxSum },
  ],
  "초5|1-2-4": [
    { id: "01", tier: "연산", generate: gcd124Calc },
    { id: "02", tier: "기본", generate: gcd124Read },
    { id: "03", tier: "응용", generate: gcd124Apply },
    { id: "04", tier: "심화하", generate: gcd124Deep },
    { id: "05", tier: "기본", generate: gcd124BiggerQuot },
    { id: "06", tier: "기본", generate: gcd124Remainder },
    { id: "07", tier: "기본", generate: gcd124Three },
    { id: "08", tier: "응용", generate: gcd124DividesBoth },
    { id: "09", tier: "응용", generate: gcd124QuotDiff },
    { id: "10", tier: "응용", generate: gcd124Recover },
  ],
  "초5|1-2-5": [
    { id: "01", tier: "연산", generate: commul125Calc },
    { id: "02", tier: "기본", generate: commul125Read },
    { id: "03", tier: "응용", generate: commul125Apply },
    { id: "04", tier: "심화하", generate: commul125Deep },
    { id: "05", tier: "기본", generate: commul125Third },
    { id: "06", tier: "기본", generate: commul125FirstThreeSum },
    { id: "07", tier: "기본", generate: commul125SmallestEven },
    { id: "08", tier: "응용", generate: commul125NextAbove },
    { id: "09", tier: "응용", generate: commul125IsCommon },
    { id: "10", tier: "응용", generate: commul125HowManyTimes },
  ],
  "초5|1-2-6": [
    { id: "01", tier: "연산", generate: lcm126Calc },
    { id: "02", tier: "기본", generate: lcm126Read },
    { id: "03", tier: "응용", generate: lcm126Apply },
    { id: "04", tier: "심화하", generate: lcm126Deep },
    { id: "05", tier: "기본", generate: lcm126DivOne },
    { id: "06", tier: "기본", generate: lcm126MethodProduct },
    { id: "07", tier: "기본", generate: lcm126Three },
    { id: "08", tier: "응용", generate: lcm126Across },
    { id: "09", tier: "응용", generate: lcm126EqualsProduct },
    { id: "10", tier: "응용", generate: lcm126Interval },
  ],
  "초5|1-3-1": [
    { id: "01", tier: "연산", generate: corr131Calc },
    { id: "02", tier: "기본", generate: corr131Read },
    { id: "03", tier: "응용", generate: corr131Apply },
    { id: "04", tier: "심화하", generate: corr131Deep },
    { id: "05", tier: "기본", generate: corr131MaxTri },
    { id: "06", tier: "기본", generate: corr131SumTri },
    { id: "07", tier: "기본", generate: corr131Span },
    { id: "08", tier: "응용", generate: corr131MinTri },
    { id: "09", tier: "응용", generate: corr131Step },
    { id: "10", tier: "응용", generate: corr131SumMinusMax },
  ],
  "초5|1-3-2": [
    { id: "01", tier: "연산", generate: corr132Calc },
    { id: "02", tier: "기본", generate: corr132Read },
    { id: "03", tier: "응용", generate: corr132Apply },
    { id: "04", tier: "심화하", generate: corr132Deep },
    { id: "05", tier: "기본", generate: corr132Factor },
    { id: "06", tier: "기본", generate: corr132AddValue },
    { id: "07", tier: "기본", generate: corr132SolveBox },
    { id: "08", tier: "응용", generate: corr132Judge },
    { id: "09", tier: "응용", generate: corr132PickRel },
    { id: "10", tier: "응용", generate: corr132SubValue },
  ],
  "초5|1-3-3": [
    { id: "01", tier: "연산", generate: corr133Calc },
    { id: "02", tier: "기본", generate: corr133Read },
    { id: "03", tier: "응용", generate: corr133Apply },
    { id: "04", tier: "심화하", generate: corr133Deep },
    { id: "05", tier: "기본", generate: corr133Per },
    { id: "06", tier: "기본", generate: corr133Many },
    { id: "07", tier: "기본", generate: corr133Judge },
    { id: "08", tier: "응용", generate: corr133AgeGap },
    { id: "09", tier: "응용", generate: corr133Cuts },
    { id: "10", tier: "응용", generate: corr133PerDiff },
  ],
  "초5|1-4-1": [
    { id: "01", tier: "연산", generate: eq141Calc },
    { id: "02", tier: "기본", generate: eq141Read },
    { id: "03", tier: "응용", generate: eq141Apply },
    { id: "04", tier: "심화하", generate: eq141Deep },
    { id: "05", tier: "기본", generate: eq141NewNum },
    { id: "06", tier: "기본", generate: eq141Scale },
    { id: "07", tier: "기본", generate: eq141Judge },
    { id: "08", tier: "응용", generate: eq141NumDenProd },
    { id: "09", tier: "응용", generate: eq141Write },
    { id: "10", tier: "응용", generate: eq141DenFromNum },
  ],
  "초5|1-4-2": [
    { id: "01", tier: "연산", generate: sim142Calc },
    { id: "02", tier: "기본", generate: sim142Read },
    { id: "03", tier: "응용", generate: sim142Apply },
    { id: "04", tier: "심화하", generate: sim142Deep },
    { id: "05", tier: "기본", generate: sim142Lowest },
    { id: "06", tier: "기본", generate: sim142LowestNum },
    { id: "07", tier: "기본", generate: sim142LowestDen },
    { id: "08", tier: "응용", generate: sim142IsLowest },
    { id: "09", tier: "응용", generate: sim142LowestDiff },
    { id: "10", tier: "응용", generate: sim142CanReduce },
  ],
  "초5|1-4-3": [
    { id: "01", tier: "연산", generate: com143Calc },
    { id: "02", tier: "기본", generate: com143Read },
    { id: "03", tier: "응용", generate: com143Apply },
    { id: "04", tier: "심화하", generate: com143Deep },
    { id: "05", tier: "기본", generate: com143CommonDen },
    { id: "06", tier: "기본", generate: com143LcmDen },
    { id: "07", tier: "기본", generate: com143FirstNum },
    { id: "08", tier: "응용", generate: com143NumProd },
    { id: "09", tier: "응용", generate: com143IsCommon },
    { id: "10", tier: "응용", generate: com143DenGap },
  ],
  "초5|1-4-4": [
    { id: "01", tier: "연산", generate: cmp144Calc },
    { id: "02", tier: "기본", generate: cmp144Read },
    { id: "03", tier: "응용", generate: cmp144Apply },
    { id: "04", tier: "심화하", generate: cmp144Deep },
    { id: "05", tier: "기본", generate: cmp144Bigger },
    { id: "06", tier: "기본", generate: cmp144SameDenSmall },
    { id: "07", tier: "기본", generate: cmp144Judge },
    { id: "08", tier: "응용", generate: cmp144CrossDiff },
    { id: "09", tier: "응용", generate: cmp144Middle },
    { id: "10", tier: "응용", generate: cmp144UnitBig },
  ],
  "초5|1-4-5": [
    { id: "01", tier: "연산", generate: fd145Calc },
    { id: "02", tier: "기본", generate: fd145Read },
    { id: "03", tier: "응용", generate: fd145Apply },
    { id: "04", tier: "심화하", generate: fd145Deep },
    { id: "05", tier: "기본", generate: fd145DecToFrac },
    { id: "06", tier: "기본", generate: fd145Bigger },
    { id: "07", tier: "기본", generate: fd145Equal },
    { id: "08", tier: "응용", generate: fd145ToOne },
    { id: "09", tier: "응용", generate: fd145MilliDiff },
    { id: "10", tier: "응용", generate: fd145Middle },
  ],
  "초5|1-5-1": [
    { id: "01", tier: "연산", generate: add151Calc },
    { id: "02", tier: "기본", generate: add151Read },
    { id: "03", tier: "응용", generate: add151Apply },
    { id: "04", tier: "심화하", generate: add151Deep },
    { id: "05", tier: "기본", generate: add151CommonDen },
    { id: "06", tier: "기본", generate: add151NumSum },
    { id: "07", tier: "기본", generate: add151OverOne },
    { id: "08", tier: "응용", generate: add151Whole },
    { id: "09", tier: "응용", generate: add151ThenSub },
    { id: "10", tier: "응용", generate: add151ToOne },
  ],
  "초5|1-5-2": [
    { id: "01", tier: "연산", generate: add152Calc },
    { id: "02", tier: "기본", generate: add152Read },
    { id: "03", tier: "응용", generate: add152Apply },
    { id: "04", tier: "심화하", generate: add152Deep },
    { id: "05", tier: "기본", generate: add152WholeSum },
    { id: "06", tier: "기본", generate: add152FracSum },
    { id: "07", tier: "기본", generate: add152ResultWhole },
    { id: "08", tier: "응용", generate: add152Carry },
    { id: "09", tier: "응용", generate: add152Improper },
    { id: "10", tier: "응용", generate: add152ImpNumSum },
  ],
  "초5|1-5-3": [
    { id: "01", tier: "연산", generate: sub153Calc },
    { id: "02", tier: "기본", generate: sub153Read },
    { id: "03", tier: "응용", generate: sub153Apply },
    { id: "04", tier: "심화하", generate: sub153Deep },
    { id: "05", tier: "기본", generate: sub153CommonDen },
    { id: "06", tier: "기본", generate: sub153NumDiff },
    { id: "07", tier: "기본", generate: sub153VsHalf },
    { id: "08", tier: "응용", generate: sub153FromOne },
    { id: "09", tier: "응용", generate: sub153BigNum },
    { id: "10", tier: "응용", generate: sub153CheckSum },
  ],
  "초5|1-5-4": [
    { id: "01", tier: "연산", generate: sub154Calc },
    { id: "02", tier: "기본", generate: sub154Read },
    { id: "03", tier: "응용", generate: sub154Apply },
    { id: "04", tier: "심화하", generate: sub154Deep },
    { id: "05", tier: "기본", generate: sub154WholeDiff },
    { id: "06", tier: "기본", generate: sub154ImpDiff },
    { id: "07", tier: "기본", generate: sub154ResultWhole },
    { id: "08", tier: "응용", generate: sub154Borrow },
    { id: "09", tier: "응용", generate: sub154Improper },
    { id: "10", tier: "응용", generate: sub154Check },
  ],
  "초5|1-6-1": [
    { id: "01", tier: "연산", generate: per61Calc },
    { id: "02", tier: "기본", generate: per61Read },
    { id: "03", tier: "응용", generate: per61Apply },
    { id: "04", tier: "심화하", generate: per61Deep },
    { id: "05", tier: "기본", generate: per61Sides },
    { id: "06", tier: "기본", generate: per61Half },
    { id: "07", tier: "기본", generate: per61ThreeSides },
    { id: "08", tier: "응용", generate: per61PerDiff },
    { id: "09", tier: "응용", generate: per61PolySide },
    { id: "10", tier: "응용", generate: per61Grow },
  ],
  "초5|1-6-2": [
    { id: "01", tier: "연산", generate: area62Calc },
    { id: "02", tier: "기본", generate: area62Read },
    { id: "03", tier: "응용", generate: area62Apply },
    { id: "04", tier: "심화하", generate: area62Deep },
    { id: "05", tier: "기본", generate: area62Height },
    { id: "06", tier: "기본", generate: area62Tiles },
    { id: "07", tier: "기본", generate: area62Frame },
    { id: "08", tier: "응용", generate: area62Sum },
    { id: "09", tier: "응용", generate: area62TwoSum },
    { id: "10", tier: "응용", generate: area62Side },
  ],
  "초5|1-6-3": [
    { id: "01", tier: "연산", generate: unit63Calc },
    { id: "02", tier: "기본", generate: unit63Read },
    { id: "03", tier: "응용", generate: unit63Apply },
    { id: "04", tier: "심화하", generate: unit63Deep },
    { id: "05", tier: "기본", generate: unit63Down },
    { id: "06", tier: "기본", generate: unit63Fact },
    { id: "07", tier: "기본", generate: unit63ToCm2 },
    { id: "08", tier: "응용", generate: unit63KmDown },
    { id: "09", tier: "응용", generate: unit63Mixed },
    { id: "10", tier: "응용", generate: unit63Bigger },
  ],
  "초5|1-6-4": [
    { id: "01", tier: "연산", generate: area64Calc },
    { id: "02", tier: "기본", generate: area64Read },
    { id: "03", tier: "응용", generate: area64Apply },
    { id: "04", tier: "심화하", generate: area64Deep },
    { id: "05", tier: "기본", generate: area64Half },
    { id: "06", tier: "기본", generate: area64TriBase },
    { id: "07", tier: "기본", generate: area64ParaBase },
    { id: "08", tier: "응용", generate: area64TwoTri },
    { id: "09", tier: "응용", generate: area64ParaToTri },
    { id: "10", tier: "응용", generate: area64DoubleH },
  ],
  "초5|1-6-5": [
    { id: "01", tier: "연산", generate: area65Calc },
    { id: "02", tier: "기본", generate: area65Read },
    { id: "03", tier: "응용", generate: area65Apply },
    { id: "04", tier: "심화하", generate: area65Deep },
    { id: "05", tier: "기본", generate: area65DiagProd },
    { id: "06", tier: "기본", generate: area65Bases },
    { id: "07", tier: "기본", generate: area65Twice },
    { id: "08", tier: "응용", generate: area65TrapH },
    { id: "09", tier: "응용", generate: area65TwoRhomb },
    { id: "10", tier: "응용", generate: area65TrapBot },
  ],
  "초5|2-1-1": [
    { id: "01", tier: "연산", generate: rng211Calc },
    { id: "02", tier: "기본", generate: rng211Read },
    { id: "03", tier: "응용", generate: rng211Apply },
    { id: "04", tier: "심화하", generate: rng211Deep },
    { id: "05", tier: "기본", generate: rng211BelowCount },
    { id: "06", tier: "기본", generate: rng211MinAbove },
    { id: "07", tier: "기본", generate: rng211MaxAbove },
    { id: "08", tier: "응용", generate: rng211Includes },
    { id: "09", tier: "응용", generate: rng211RangeCount },
    { id: "10", tier: "응용", generate: rng211Mult3 },
  ],
  "초5|2-1-2": [
    { id: "01", tier: "연산", generate: rng212Calc },
    { id: "02", tier: "기본", generate: rng212Read },
    { id: "03", tier: "응용", generate: rng212Apply },
    { id: "04", tier: "심화하", generate: rng212Deep },
    { id: "05", tier: "기본", generate: rng212MinOver },
    { id: "06", tier: "기본", generate: rng212MaxUnder },
    { id: "07", tier: "기본", generate: rng212Excludes },
    { id: "08", tier: "응용", generate: rng212Gap },
    { id: "09", tier: "응용", generate: rng212UnderCount },
    { id: "10", tier: "응용", generate: rng212EvenOpen },
  ],
  "초5|2-1-3": [
    { id: "01", tier: "연산", generate: rng213Calc },
    { id: "02", tier: "기본", generate: rng213Read },
    { id: "03", tier: "응용", generate: rng213Apply },
    { id: "04", tier: "심화하", generate: rng213Deep },
    { id: "05", tier: "기본", generate: rng213Fail },
    { id: "06", tier: "기본", generate: rng213Diff },
    { id: "07", tier: "기본", generate: rng213MinPass },
    { id: "08", tier: "응용", generate: rng213EdgeFee },
    { id: "09", tier: "응용", generate: rng213MinHeavy },
    { id: "10", tier: "응용", generate: rng213MaxVal },
  ],
  "초5|2-1-4": [
    { id: "01", tier: "연산", generate: up214Calc },
    { id: "02", tier: "기본", generate: up214Read },
    { id: "03", tier: "응용", generate: up214Apply },
    { id: "04", tier: "심화하", generate: up214Deep },
    { id: "05", tier: "기본", generate: up214Thousands },
    { id: "06", tier: "기본", generate: up214HundredDiff },
    { id: "07", tier: "기본", generate: up214Ones },
    { id: "08", tier: "응용", generate: up214MinOrig },
    { id: "09", tier: "응용", generate: up214MaxOrig },
    { id: "10", tier: "응용", generate: up214ThouDigit },
  ],
  "초5|2-1-5": [
    { id: "01", tier: "연산", generate: down215Calc },
    { id: "02", tier: "기본", generate: down215Read },
    { id: "03", tier: "응용", generate: down215Apply },
    { id: "04", tier: "심화하", generate: down215Deep },
    { id: "05", tier: "기본", generate: down215Thousands },
    { id: "06", tier: "기본", generate: down215HundredDrop },
    { id: "07", tier: "기본", generate: down215Ones },
    { id: "08", tier: "응용", generate: down215Hundreds },
    { id: "09", tier: "응용", generate: down215MinOrig },
    { id: "10", tier: "응용", generate: down215MaxOrig },
  ],
  "초5|2-1-6": [
    { id: "01", tier: "연산", generate: round216Calc },
    { id: "02", tier: "기본", generate: round216Read },
    { id: "03", tier: "응용", generate: round216Apply },
    { id: "04", tier: "심화하", generate: round216Deep },
    { id: "05", tier: "기본", generate: round216Thousands },
    { id: "06", tier: "기본", generate: round216Hundreds },
    { id: "07", tier: "기본", generate: round216Digit },
    { id: "08", tier: "응용", generate: round216NeedUp },
    { id: "09", tier: "응용", generate: round216MinOrig },
    { id: "10", tier: "응용", generate: round216MaxOrig },
  ],
  "초5|1-2-2": [
    { id: "01", tier: "연산", generate: rel122Calc },
    { id: "02", tier: "기본", generate: rel122Read },
    { id: "03", tier: "응용", generate: rel122Apply },
    { id: "04", tier: "심화하", generate: rel122Deep },
    { id: "05", tier: "기본", generate: rel122IsMultiple },
    { id: "06", tier: "기본", generate: rel122Quotient },
    { id: "07", tier: "기본", generate: rel122Product },
    { id: "08", tier: "응용", generate: rel122NextMultiple },
    { id: "09", tier: "응용", generate: rel122Remainder },
    { id: "10", tier: "응용", generate: rel122FactorCount },
  ],
  "초5|1-2-1": [
    { id: "01", tier: "연산", generate: fac121Calc },
    { id: "02", tier: "기본", generate: fac121Read },
    { id: "03", tier: "응용", generate: fac121Apply },
    { id: "04", tier: "심화하", generate: fac121Deep },
    { id: "05", tier: "기본", generate: fac121Count },
    { id: "06", tier: "기본", generate: fac121Largest },
    { id: "07", tier: "기본", generate: fac121Sum },
    { id: "08", tier: "응용", generate: fac121EvenCount },
    { id: "09", tier: "응용", generate: fac121InnerCount },
    { id: "10", tier: "응용", generate: fac121LargestBelow },
  ],
  "초5|2-5-1": [
    { id: "01", tier: "연산", generate: boxRectCalc },
    { id: "02", tier: "기본", generate: boxRectFaces },
    { id: "03", tier: "응용", generate: boxRectApply },
    { id: "04", tier: "심화하", generate: boxRectDeep },
    { id: "05", tier: "기본", generate: boxRectVertices },
    { id: "06", tier: "기본", generate: boxRectEdgeCount },
    { id: "07", tier: "기본", generate: boxRectFacePairs },
    { id: "08", tier: "응용", generate: boxRectVertexEdges },
    { id: "09", tier: "응용", generate: boxRectFaceKinds },
    { id: "10", tier: "응용", generate: boxRectGivenFaceCount },
  ],
  "초5|2-2-1": [
    { id: "01", tier: "연산", generate: fm221Calc },
    { id: "02", tier: "기본", generate: fm221Read },
    { id: "03", tier: "응용", generate: fm221Apply },
    { id: "04", tier: "심화하", generate: fm221Deep },
    { id: "05", tier: "기본", generate: fm221BeforeNum },
    { id: "06", tier: "기본", generate: fm221AfterDen },
    { id: "07", tier: "기본", generate: fm221WholePart },
    { id: "08", tier: "응용", generate: fm221FindK },
    { id: "09", tier: "응용", generate: fm221ThenSub },
    { id: "10", tier: "응용", generate: fm221OverOne },
  ],
  "초5|2-2-2": [
    { id: "01", tier: "연산", generate: fm222Calc },
    { id: "02", tier: "기본", generate: fm222Read },
    { id: "03", tier: "응용", generate: fm222Apply },
    { id: "04", tier: "심화하", generate: fm222Deep },
    { id: "05", tier: "기본", generate: fm222BeforeNum },
    { id: "06", tier: "기본", generate: fm222AfterDen },
    { id: "07", tier: "기본", generate: fm222UnusedFrac },
    { id: "08", tier: "응용", generate: fm222FindFrac },
    { id: "09", tier: "응용", generate: fm222TimesAgain },
    { id: "10", tier: "응용", generate: fm222OverOne },
  ],
  "초5|2-2-3": [
    { id: "01", tier: "연산", generate: fm223Calc },
    { id: "02", tier: "기본", generate: fm223Read },
    { id: "03", tier: "응용", generate: fm223Apply },
    { id: "04", tier: "심화하", generate: fm223Deep },
    { id: "05", tier: "기본", generate: fm223NumProduct },
    { id: "06", tier: "기본", generate: fm223DenProduct },
    { id: "07", tier: "기본", generate: fm223AfterDen },
    { id: "08", tier: "응용", generate: fm223FindFirst },
    { id: "09", tier: "응용", generate: fm223FromOne },
    { id: "10", tier: "응용", generate: fm223ThreeNum },
  ],
  "초5|2-2-4": [
    { id: "01", tier: "연산", generate: fm224Calc },
    { id: "02", tier: "기본", generate: fm224Read },
    { id: "03", tier: "응용", generate: fm224Apply },
    { id: "04", tier: "심화하", generate: fm224Deep },
    { id: "05", tier: "기본", generate: fm224ImproperNum },
    { id: "06", tier: "기본", generate: fm224WrongOnly },
    { id: "07", tier: "기본", generate: fm224FracPartOnly },
    { id: "08", tier: "응용", generate: fm224FindK },
    { id: "09", tier: "응용", generate: fm224TwoMixed },
    { id: "10", tier: "응용", generate: fm224WholePart },
  ],
  "초5|2-3-1": [
    { id: "01", tier: "연산", generate: cong231Calc },
    { id: "02", tier: "기본", generate: cong231Read },
    { id: "03", tier: "응용", generate: cong231Apply },
    { id: "04", tier: "심화하", generate: cong231Deep },
    { id: "05", tier: "기본", generate: cong231TwinCount },
    { id: "06", tier: "기본", generate: cong231AllCount },
    { id: "07", tier: "기본", generate: cong231KindCount },
    { id: "08", tier: "응용", generate: cong231LoneLabel },
    { id: "09", tier: "응용", generate: cong231PairLabels },
    { id: "10", tier: "응용", generate: cong231HowManyOf },
  ],
  "초5|2-3-2": [
    { id: "01", tier: "연산", generate: cong232Calc },
    { id: "02", tier: "기본", generate: cong232Read },
    { id: "03", tier: "응용", generate: cong232Apply },
    { id: "04", tier: "심화하", generate: cong232Deep },
    { id: "05", tier: "기본", generate: cong232MatchSide },
    { id: "06", tier: "기본", generate: cong232Longest },
    { id: "07", tier: "기본", generate: cong232Shortest },
    { id: "08", tier: "응용", generate: cong232BothPer },
    { id: "09", tier: "응용", generate: cong232MatchAngle },
    { id: "10", tier: "응용", generate: cong232BaseAngle },
  ],
  "초5|2-3-3": [
    { id: "01", tier: "연산", generate: sym233Calc },
    { id: "02", tier: "기본", generate: sym233Read },
    { id: "03", tier: "응용", generate: sym233Apply },
    { id: "04", tier: "심화하", generate: sym233Deep },
    { id: "05", tier: "기본", generate: sym233AxisSum },
    { id: "06", tier: "기본", generate: sym233AxisDiff },
    { id: "07", tier: "기본", generate: sym233OnAxis },
    { id: "08", tier: "응용", generate: sym233OffAfter },
    { id: "09", tier: "응용", generate: sym233NameOf },
    { id: "10", tier: "응용", generate: sym233NowCells },
  ],
  "초5|2-3-4": [
    { id: "01", tier: "연산", generate: sym234Calc },
    { id: "02", tier: "기본", generate: sym234Read },
    { id: "03", tier: "응용", generate: sym234Apply },
    { id: "04", tier: "심화하", generate: sym234Deep },
    { id: "05", tier: "기본", generate: sym234TurnDeg },
    { id: "06", tier: "기본", generate: sym234DoneCells },
    { id: "07", tier: "기본", generate: sym234OppSide },
    { id: "08", tier: "응용", generate: sym234HalfPer },
    { id: "09", tier: "응용", generate: sym234Longest },
    { id: "10", tier: "응용", generate: sym234Shortest },
  ],
  "초5|2-4-1": [
    { id: "01", tier: "연산", generate: dm241Calc },
    { id: "02", tier: "기본", generate: dm241Read },
    { id: "03", tier: "응용", generate: dm241Apply },
    { id: "04", tier: "심화하", generate: dm241Deep },
    { id: "05", tier: "기본", generate: dm241IgnorePoint },
    { id: "06", tier: "기본", generate: dm241FirstDigit },
    { id: "07", tier: "기본", generate: dm241FindDec },
    { id: "08", tier: "응용", generate: dm241ThenSub },
    { id: "09", tier: "응용", generate: dm241OverOne },
    { id: "10", tier: "응용", generate: dm241TimesMore },
  ],
  "초5|2-4-2": [
    { id: "01", tier: "연산", generate: dm242Calc },
    { id: "02", tier: "기본", generate: dm242Read },
    { id: "03", tier: "응용", generate: dm242Apply },
    { id: "04", tier: "심화하", generate: dm242Deep },
    { id: "05", tier: "기본", generate: dm242IgnorePoint },
    { id: "06", tier: "기본", generate: dm242FirstDigit },
    { id: "07", tier: "기본", generate: dm242FindDec },
    { id: "08", tier: "응용", generate: dm242ThenSub },
    { id: "09", tier: "응용", generate: dm242VsNatural },
    { id: "10", tier: "응용", generate: dm242DiffTwo },
  ],
  "초5|2-4-3": [
    { id: "01", tier: "연산", generate: dm243Calc },
    { id: "02", tier: "기본", generate: dm243Read },
    { id: "03", tier: "응용", generate: dm243Apply },
    { id: "04", tier: "심화하", generate: dm243Deep },
    { id: "05", tier: "기본", generate: dm243IgnorePoint },
    { id: "06", tier: "기본", generate: dm243FirstDigit },
    { id: "07", tier: "기본", generate: dm243FindDec },
    { id: "08", tier: "응용", generate: dm243OverOne },
    { id: "09", tier: "응용", generate: dm243TimesAgain },
    { id: "10", tier: "응용", generate: dm243TwoParts },
  ],
  "초5|2-4-4": [
    { id: "01", tier: "연산", generate: dm244Calc },
    { id: "02", tier: "기본", generate: dm244Read },
    { id: "03", tier: "응용", generate: dm244Apply },
    { id: "04", tier: "심화하", generate: dm244Deep },
    { id: "05", tier: "기본", generate: dm244IgnorePoint },
    { id: "06", tier: "기본", generate: dm244FirstDigit },
    { id: "07", tier: "기본", generate: dm244FindDec },
    { id: "08", tier: "응용", generate: dm244ThenSub },
    { id: "09", tier: "응용", generate: dm244OverTen },
    { id: "10", tier: "응용", generate: dm244DiffTwo },
  ],
  "초5|2-4-5": [
    { id: "01", tier: "연산", generate: dm245Calc },
    { id: "02", tier: "기본", generate: dm245Read },
    { id: "03", tier: "응용", generate: dm245Apply },
    { id: "04", tier: "심화하", generate: dm245Deep },
    { id: "05", tier: "기본", generate: dm245IgnorePoint },
    { id: "06", tier: "기본", generate: dm245Places },
    { id: "07", tier: "기본", generate: dm245FindOther },
    { id: "08", tier: "응용", generate: dm245OverTenth },
    { id: "09", tier: "응용", generate: dm245TwoAreas },
    { id: "10", tier: "응용", generate: dm245Bigger },
  ],
  "초5|2-4-6": [
    { id: "01", tier: "연산", generate: dm246Calc },
    { id: "02", tier: "기본", generate: dm246Read },
    { id: "03", tier: "응용", generate: dm246Apply },
    { id: "04", tier: "심화하", generate: dm246Deep },
    { id: "05", tier: "기본", generate: dm246IgnorePoint },
    { id: "06", tier: "기본", generate: dm246Places },
    { id: "07", tier: "기본", generate: dm246FindOther },
    { id: "08", tier: "응용", generate: dm246OverTen },
    { id: "09", tier: "응용", generate: dm246TwoAreas },
    { id: "10", tier: "응용", generate: dm246Bigger },
  ],
  "초5|2-4-7": [
    { id: "01", tier: "연산", generate: dm247Calc },
    { id: "02", tier: "기본", generate: dm247Read },
    { id: "03", tier: "응용", generate: dm247Apply },
    { id: "04", tier: "심화하", generate: dm247Deep },
    { id: "05", tier: "기본", generate: dm247RightSteps },
    { id: "06", tier: "기본", generate: dm247TimesTen },
    { id: "07", tier: "기본", generate: dm247TimesHundred },
    { id: "08", tier: "응용", generate: dm247TimesTenth },
    { id: "09", tier: "응용", generate: dm247TimesHundredth },
    { id: "10", tier: "응용", generate: dm247Grew },
  ],
  "초5|2-5-2": [
    { id: "01", tier: "연산", generate: boxCubeCalc },
    { id: "02", tier: "기본", generate: boxCubeRead },
    { id: "03", tier: "응용", generate: boxCubeApply },
    { id: "04", tier: "심화하", generate: boxCubeDeep },
    { id: "05", tier: "기본", generate: boxCubeFaces },
    { id: "06", tier: "기본", generate: boxCubeVertices },
    { id: "07", tier: "기본", generate: boxCubeEdgeCount },
    { id: "08", tier: "응용", generate: boxCubeVertexEdges },
    { id: "09", tier: "응용", generate: boxCubeFaceEdges },
    { id: "10", tier: "응용", generate: boxCubeThreeSum },
  ],
  "초5|2-5-3": [
    { id: "01", tier: "연산", generate: box253Calc },
    { id: "02", tier: "기본", generate: box253Read },
    { id: "03", tier: "응용", generate: box253Apply },
    { id: "04", tier: "심화하", generate: box253Deep },
    { id: "05", tier: "기본", generate: box253WHParallel },
    { id: "06", tier: "기본", generate: box253MaxFace },
    { id: "07", tier: "기본", generate: box253MinFace },
    { id: "08", tier: "응용", generate: box253ThreeSum },
    { id: "09", tier: "응용", generate: box253WidthFaces },
    { id: "10", tier: "응용", generate: box253ParallelPairs },
  ],
  "초5|2-5-4": [
    { id: "01", tier: "연산", generate: box254Calc },
    { id: "02", tier: "기본", generate: box254Read },
    { id: "03", tier: "응용", generate: box254Apply },
    { id: "04", tier: "심화하", generate: box254Deep },
    { id: "05", tier: "기본", generate: box254HiddenCount },
    { id: "06", tier: "기본", generate: box254VisibleCount },
    { id: "07", tier: "기본", generate: box254HiddenWidth },
    { id: "08", tier: "응용", generate: box254VisibleWidthCount },
    { id: "09", tier: "응용", generate: box254AllEdges },
    { id: "10", tier: "응용", generate: box254HiddenHeight },
  ],
  "초5|2-5-5": [
    { id: "01", tier: "연산", generate: net255Calc },
    { id: "02", tier: "기본", generate: net255FaceCount },
    { id: "03", tier: "응용", generate: net255Apply },
    { id: "04", tier: "심화하", generate: net255Deep },
    { id: "05", tier: "기본", generate: net255Vertices },
    { id: "06", tier: "기본", generate: net255Edges },
    { id: "07", tier: "기본", generate: net255FaceSide },
    { id: "08", tier: "응용", generate: net255OneEdge },
    { id: "09", tier: "응용", generate: net255Gap },
    { id: "10", tier: "응용", generate: net255VertexFaces },
  ],
  "초5|2-5-6": [
    { id: "01", tier: "연산", generate: net256Calc },
    { id: "02", tier: "기본", generate: net256Read },
    { id: "03", tier: "응용", generate: net256Apply },
    { id: "04", tier: "심화하", generate: net256Deep },
    { id: "05", tier: "기본", generate: net256WdCount },
    { id: "06", tier: "기본", generate: net256FaceCount },
    { id: "07", tier: "기본", generate: net256WHArea },
    { id: "08", tier: "응용", generate: net256DHArea },
    { id: "09", tier: "응용", generate: net256ThreeSum },
    { id: "10", tier: "응용", generate: net256Perim },
  ],
  "초5|2-6-1": [
    { id: "01", tier: "연산", generate: avg261Calc },
    { id: "02", tier: "기본", generate: avg261Read },
    { id: "03", tier: "응용", generate: avg261Apply },
    { id: "04", tier: "심화하", generate: avg261Deep },
    { id: "05", tier: "기본", generate: avg261Sum },
    { id: "06", tier: "기본", generate: avg261Count },
    { id: "07", tier: "기본", generate: avg261Min },
    { id: "08", tier: "응용", generate: avg261Below },
    { id: "09", tier: "응용", generate: avg261MaxGap },
    { id: "10", tier: "응용", generate: avg261EqualDays },
  ],
  "초5|2-6-2": [
    { id: "01", tier: "연산", generate: avg262Calc },
    { id: "02", tier: "기본", generate: avg262HowManyGames },
    { id: "03", tier: "응용", generate: avg262Apply },
    { id: "04", tier: "심화하", generate: avg262Deep },
    { id: "05", tier: "기본", generate: avg262Count },
    { id: "06", tier: "기본", generate: avg262BeforeLast },
    { id: "07", tier: "기본", generate: avg262AfterLast },
    { id: "08", tier: "응용", generate: avg262TargetSum },
    { id: "09", tier: "응용", generate: avg262NeedPer },
    { id: "10", tier: "응용", generate: avg262RemoveOne },
  ],
  "초5|2-6-3": [
    { id: "01", tier: "연산", generate: pos263Calc },
    { id: "02", tier: "기본", generate: pos263Read },
    { id: "03", tier: "응용", generate: pos263Apply },
    { id: "04", tier: "심화하", generate: pos263Deep },
    { id: "05", tier: "기본", generate: pos263Total },
    { id: "06", tier: "기본", generate: pos263BlueFrac },
    { id: "07", tier: "기본", generate: pos263RedMore },
    { id: "08", tier: "응용", generate: pos263RedAmongThree },
    { id: "09", tier: "응용", generate: pos263NotRed },
    { id: "10", tier: "응용", generate: pos263ImpossibleCount },
  ],
};

/* ── 2-5-3 직육면체의 성질 — «몇 개인가»가 아니라 «어느 면인가»를 묻는다 ── */

/** 연산 — 평행한 면은 **합동**이다(성질 한 번). */
function box253Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm인 면과 서로 평행한 면의 넓이는 몇 cm²입니까?`,
    n(w * d),
    `직육면체에서 서로 평행한 두 면은 모양과 크기가 같습니다. 따라서 넓이도 같아 ${expr(`${w}\\times${d}=${w * d}`)}이므로 ${n(w * d)} cm²입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 기본 — 수직인 면은 **넷**이고, 그중 어느 것이 가장 넓은지 스스로 골라야 한다(한 겹). */
function box253Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  const big = Math.max(w, d);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm인 면과 수직인 면은 ${n(4)}개입니다. 그중 가장 넓은 면의 넓이는 몇 cm²입니까?`,
    n(big * h),
    `이 면과 수직인 네 면은 가로가 ${n(w)} cm 또는 ${n(d)} cm이고 세로가 모두 높이 ${n(h)} cm입니다. 더 긴 ${n(big)} cm 쪽이 가장 넓으므로 ${expr(`${big}\\times${h}=${big * h}`)}, 곧 ${n(big * h)} cm²입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 응용 — 수직인 면 **넷의 넓이의 합**(두 단계: 어느 넷인지 고르고 더한다). */
function box253Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  const sum = 2 * h * (w + d);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm인 면과 수직인 면 ${n(4)}개의 넓이의 합은 몇 cm²입니까?`,
    n(sum),
    `수직인 네 면은 ${expr(`${w}\\times${h}`)}인 면 ${n(2)}개와 ${expr(`${d}\\times${h}`)}인 면 ${n(2)}개입니다. 합은 ${expr(`(${w}\\times${h}+${d}\\times${h})\\times2=${sum}`)}이므로 ${n(sum)} cm²입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/**
 * 심화 — **역산**: 옆면 넷의 넓이의 합에서 높이를 거슬러 구한다.
 * `2(w+d)·h` 이므로 `h` 를 먼저 잡으면 나눗셈이 딱 떨어진다.
 */
function box253Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  const sum = 2 * h * (w + d);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm인 면과 수직인 면 ${n(4)}개의 넓이의 합이 ${n(sum)} cm²입니다. 이 직육면체의 높이는 몇 cm입니까?`,
    n(h),
    `수직인 네 면의 가로를 모두 더하면 ${expr(`(${w}+${d})\\times2=${2 * (w + d)}`)} cm이고, 세로는 모두 높이입니다. 따라서 높이는 ${expr(`${sum}\\div${2 * (w + d)}=${h}`)}이므로 ${n(h)} cm입니다.`,
  );
}

/** 문형 05 — 한 면과 수직인 모서리(높이) 넷의 합. 01은 평행한 면의 넓이라 면 이름만 바꾸면 같은 물음이다. */
function box253WHParallel(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체에서, 가로와 세로로 이루어진 면과 수직인 모서리의 길이의 합은 몇 cm입니까?`,
    n(4 * h),
    `그 면과 수직인 모서리는 높이 모서리이고 ${n(4)}개입니다. 합은 ${expr(`${h}\\times4=${4 * h}`)}이므로 ${n(4 * h)} cm입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 문형 06 — 가장 넓은 면의 넓이. */
function box253MaxFace(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  const mxA = Math.max(w * d, d * h, h * w);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체에서 가장 넓은 면의 넓이는 몇 cm²입니까?`,
    n(mxA),
    `세 가지 면의 넓이는 ${n(w * d)}, ${n(d * h)}, ${n(h * w)}이므로 가장 넓은 면은 ${n(mxA)} cm²입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 문형 07 — 가장 좁은 면의 넓이. */
function box253MinFace(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  const mn = Math.min(w * d, d * h, h * w);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체에서 가장 좁은 면의 넓이는 몇 cm²입니까?`,
    n(mn),
    `세 가지 면의 넓이는 ${n(w * d)}, ${n(d * h)}, ${n(h * w)}이므로 가장 좁은 면은 ${n(mn)} cm²입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 문형 08 — 서로 다른 세 면의 넓이 합. */
function box253ThreeSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  const s = w * d + d * h + h * w;
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체에서 서로 다른 모양의 면 한 개씩의 넓이 합은 몇 cm²입니까?`,
    n(s),
    `${expr(`${w}\\times${d}+${d}\\times${h}+${h}\\times${w}=${s}`)}이므로 ${n(s)} cm²입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 문형 09 — 가로가 w인 모서리를 포함한 면의 수. */
function box253WidthFaces(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체에서 길이가 ${n(w)} cm인 모서리를 포함한 면은 몇 개입니까?`,
    n(4),
    `가로 모서리는 네 면에 걸쳐 있으므로 ${n(4)}개입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 문형 10 — 서로 평행한 면은 몇 쌍. */
function box253ParallelPairs(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체에서 서로 평행한 면은 몇 쌍입니까?`,
    n(3),
    `마주 보는 면이 평행하므로 ${n(3)}쌍입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/* ── 2-5-4 직육면체의 겨냥도 — 보이는 것과 보이지 않는 것 ── */

/** 연산 — 보이지 않는 모서리는 **세 방향 하나씩**이다(성질 한 번). */
function box254Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 겨냥도에서 보이지 않는 모서리 ${n(3)}개의 길이의 합은 몇 cm입니까?`,
    n(w + d + h),
    `겨냥도에서 보이지 않는 모서리는 가로·세로·높이 방향으로 하나씩 ${n(3)}개입니다. ${expr(`${w}+${d}+${h}=${w + d + h}`)}이므로 ${n(w + d + h)} cm입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 기본 — 보이는 아홉은 전체에서 숨은 셋을 뺀 것이다(한 겹). */
function box254Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  const s = w + d + h;
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 겨냥도에서 보이는 모서리 ${n(9)}개의 길이의 합은 몇 cm입니까?`,
    n(3 * s),
    `모든 모서리의 길이의 합은 ${expr(`(${w}+${d}+${h})\\times4=${4 * s}`)} cm이고, 보이지 않는 ${n(3)}개의 합은 ${expr(`${w}+${d}+${h}=${s}`)} cm입니다. 따라서 ${expr(`${4 * s}-${s}=${3 * s}`)}이므로 ${n(3 * s)} cm입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 응용 — 보이는 것과 보이지 않는 것의 **차**(두 단계). */
function box254Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  const s = w + d + h;
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 겨냥도에서, 보이는 모서리 길이의 합과 보이지 않는 모서리 길이의 합의 차는 몇 cm입니까?`,
    n(2 * s),
    `보이는 ${n(9)}개의 합은 ${expr(`${s}\\times3=${3 * s}`)} cm, 보이지 않는 ${n(3)}개의 합은 ${n(s)} cm입니다. 차는 ${expr(`${3 * s}-${s}=${2 * s}`)}이므로 ${n(2 * s)} cm입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/**
 * 심화 — **역산**: 보이는 모서리 합에서 모든 모서리 합을 거슬러 구한다.
 * 보이는 것이 `3(w+d+h)`, 전체가 `4(w+d+h)` 이므로 전체 `= 보이는 것 ÷ 3 × 4` 다.
 * `w+d+h` 를 먼저 잡으므로 나눗셈이 **언제나** 딱 떨어진다.
 */
function box254Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  const s = w + d + h;
  return make(
    unit,
    `어떤 직육면체의 겨냥도에서 보이는 모서리 ${n(9)}개의 길이의 합이 ${n(3 * s)} cm입니다. 이 직육면체의 모든 모서리 길이의 합은 몇 cm입니까?`,
    n(4 * s),
    `보이는 ${n(9)}개는 가로·세로·높이가 각각 ${n(3)}개씩이므로 세 모서리의 합은 ${expr(`${3 * s}\\div3=${s}`)} cm입니다. 모든 모서리는 각각 ${n(4)}개씩이므로 ${expr(`${s}\\times4=${4 * s}`)}, 곧 ${n(4 * s)} cm입니다.`,
  );
}

/** 문형 05 — 보이지 않는 모서리 개수. */
function box254HiddenCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 겨냥도에서 보이지 않는 모서리는 몇 개입니까?`,
    n(3),
    `가로·세로·높이 방향으로 하나씩 ${n(3)}개입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 문형 06 — 보이는 모서리 개수. */
function box254VisibleCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 겨냥도에서 보이는 모서리는 몇 개입니까?`,
    n(9),
    `모서리 ${n(12)}개 중 보이지 않는 ${n(3)}개를 빼면 ${n(9)}개입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 문형 07 — 보이지 않는 가로 모서리의 길이. */
function box254HiddenWidth(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 겨냥도에서 보이지 않는 가로 모서리의 길이는 몇 cm입니까?`,
    n(w),
    `보이지 않는 가로 모서리도 가로는 ${n(w)} cm입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 문형 08 — 보이는 가로 모서리 개수. */
function box254VisibleWidthCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 겨냥도에서 보이는 가로 모서리는 몇 개입니까?`,
    n(3),
    `가로 모서리 ${n(4)}개 중 하나가 숨으므로 보이는 것은 ${n(3)}개입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 문형 09 — 모든 모서리 길이의 합. */
function box254AllEdges(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  const s = w + d + h;
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 모든 모서리 길이의 합은 몇 cm입니까?`,
    n(4 * s),
    `${expr(`(${w}+${d}+${h})\\times4=${4 * s}`)}이므로 ${n(4 * s)} cm입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/** 문형 10 — 보이지 않는 높이 모서리의 길이. */
function box254HiddenHeight(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 겨냥도에서 보이지 않는 높이 모서리의 길이는 몇 cm입니까?`,
    n(h),
    `보이지 않는 높이 모서리도 높이는 ${n(h)} cm입니다.`,
    fig("cuboid", { w, d, h }),
  );
}

/* ── 2-5-5 정육면체의 전개도 — **둘레** 축(표준은 «마주 보는 면»과 «모서리 합»을 쓴다) ──
 *
 * ⚠️ **전개도의 둘레는 «어떻게 펼쳤나»에 매인다.** 이 엔진의 배치는 아래 십자꼴이고
 *    (`elem_advanced.py` `_net_cuboid` 의 주석), 그때 둘레는 `2w + 8d + 4h` 다.
 *        [top] / [L][front][R] / [bot] / [back]
 *    **믿고 쓰지 않고 실제로 재서 확인했다** — 그려진 `<rect>` 여섯을 잘게 쪼개
 *    덮인 칸의 외곽을 세니 세 모양에서 식과 정확히 같았다(2026-08-23 실측):
 *        w=4 d=4 h=4 → 56 (= 14e) · w=8 d=5 h=3 → 68 · w=6 d=2 h=7 → 56
 *    ⚠️ **배치를 바꾸면 이 값이 바뀐다.** 그림 세션이 `_net_cuboid` 를 손보면 여기도
 *       같이 봐야 한다 — 이 의존은 시험으로 못 잡는다(시험이 같은 식을 다시 쓸 뿐이다).
 */

/** 연산 — 전개도의 둘레(정육면체는 `14e`). */
function net255Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 13);
  return make(
    unit,
    `한 모서리의 길이가 ${n(e)} cm인 정육면체의 전개도입니다. 이 전개도의 둘레는 몇 cm입니까?`,
    n(14 * e),
    `전개도의 테두리는 한 모서리의 ${n(14)}배입니다. ${expr(`${e}\\times14=${14 * e}`)}이므로 ${n(14 * e)} cm입니다.`,
    fig("netCuboid", { w: e, d: e, h: e }),
  );
}

/** 기본 — 문장에서 스스로(한 겹): 테두리를 오리는 길이. */
function net255Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 13);
  return make(
    unit,
    `한 모서리의 길이가 ${n(e)} cm인 정육면체의 전개도입니다. 접는 선은 그대로 두고 테두리만 가위로 오릴 때, 오리는 길이는 모두 몇 cm입니까?`,
    n(14 * e),
    `접는 선은 오리지 않으므로 오리는 곳은 테두리뿐입니다. 테두리는 한 모서리의 ${n(14)}배이므로 ${expr(`${e}\\times14=${14 * e}`)}이므로 ${n(14 * e)} cm입니다.`,
    fig("netCuboid", { w: e, d: e, h: e }),
  );
}

/** 응용 — 두 단계: 테두리를 오리고 남는 끈. */
function net255Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 8);
  const left = intBetween(rng, 3, 30);
  const tape = 14 * e + left;
  return make(
    unit,
    `길이가 ${n(tape)} cm인 색 끈으로 한 모서리가 ${n(e)} cm인 정육면체 전개도의 테두리를 둘렀습니다. 남는 색 끈은 몇 cm입니까?`,
    n(left),
    `테두리의 길이는 ${expr(`${e}\\times14=${14 * e}`)} cm입니다. 남는 것은 ${expr(`${tape}-${14 * e}=${left}`)}이므로 ${n(left)} cm입니다.`,
    fig("netCuboid", { w: e, d: e, h: e }),
  );
}

/**
 * 심화 — **역산**: 둘레에서 한 모서리를 거슬러 구한 뒤 **모서리 합**까지 간다(두 걸음).
 * `e` 를 먼저 잡으므로 `14` 로 나누어떨어지는 것이 구성 보장이다.
 */
function net255Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 13);
  return make(
    unit,
    `어떤 정육면체의 전개도의 둘레가 ${n(14 * e)} cm입니다. 이 전개도를 접어 만든 정육면체의 모든 모서리 길이의 합은 몇 cm입니까?`,
    n(12 * e),
    `전개도의 둘레는 한 모서리의 ${n(14)}배이므로 한 모서리는 ${expr(`${14 * e}\\div14=${e}`)} cm입니다. 정육면체의 모서리는 ${n(12)}개이므로 ${expr(`${e}\\times12=${12 * e}`)}, 곧 ${n(12 * e)} cm입니다.`,
  );
}

/** 문형 05 — 둘레에서 한 모서리를 거슬러 구한다. 심화는 모서리 합까지 간다. */
function net255OneEdge(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 13);
  return make(
    unit,
    `어떤 정육면체의 전개도의 둘레가 ${n(14 * e)} cm입니다. 한 모서리의 길이는 몇 cm입니까?`,
    n(e),
    `전개도의 둘레는 한 모서리의 ${n(14)}배이므로 ${expr(`${14 * e}\\div14=${e}`)} cm입니다.`,
  );
}

/** 문형 06 — 전개도의 면 개수. */
function net255FaceCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 13);
  return make(
    unit,
    `한 모서리의 길이가 ${n(e)} cm인 정육면체의 전개도에서 면은 몇 개입니까?`,
    n(6),
    `정육면체의 전개도는 정사각형 ${n(6)}개입니다.`,
    fig("netCuboid", { w: e, d: e, h: e }),
  );
}

/** 문형 07 — 접으면 꼭짓점 개수. */
function net255Vertices(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 13);
  return make(
    unit,
    `한 모서리의 길이가 ${n(e)} cm인 정육면체의 전개도를 접으면 꼭짓점은 몇 개입니까?`,
    n(8),
    `접어 만든 정육면체의 꼭짓점은 ${n(8)}개입니다.`,
    fig("netCuboid", { w: e, d: e, h: e }),
  );
}

/** 문형 08 — 접으면 모서리 개수. */
function net255Edges(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 13);
  return make(
    unit,
    `한 모서리의 길이가 ${n(e)} cm인 정육면체의 전개도를 접으면 모서리는 몇 개입니까?`,
    n(12),
    `접어 만든 정육면체의 모서리는 ${n(12)}개입니다.`,
    fig("netCuboid", { w: e, d: e, h: e }),
  );
}

/** 문형 09 — 전개도 둘레와 모서리 합의 차. */
function net255Gap(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 13);
  return make(
    unit,
    `한 모서리의 길이가 ${n(e)} cm인 정육면체의 전개도 둘레와, 접어 만든 정육면체의 모든 모서리 길이의 합의 차는 몇 cm입니까?`,
    n(2 * e),
    `둘레는 ${expr(`${e}\\times14=${14 * e}`)} cm, 모서리 합은 ${expr(`${e}\\times12=${12 * e}`)} cm이므로 차는 ${expr(`${14 * e}-${12 * e}=${2 * e}`)} cm입니다.`,
    fig("netCuboid", { w: e, d: e, h: e }),
  );
}

/** 문형 10 — 한 면의 한 변. */
function net255FaceSide(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 13);
  return make(
    unit,
    `한 모서리의 길이가 ${n(e)} cm인 정육면체의 전개도에서 한 면의 한 변의 길이는 몇 cm입니까?`,
    n(e),
    `정육면체의 모든 모서리가 ${n(e)} cm이므로 한 면의 한 변도 ${n(e)} cm입니다.`,
    fig("netCuboid", { w: e, d: e, h: e }),
  );
}

/** 문형 — 한 꼭짓점에 모이는 면. */
function net255VertexFaces(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 13);
  return make(
    unit,
    `한 모서리의 길이가 ${n(e)} cm인 정육면체의 전개도를 접으면 한 꼭짓점에 모이는 면은 몇 개입니까?`,
    n(3),
    `정육면체의 한 꼭짓점에는 면이 ${n(3)}개 모입니다.`,
    fig("netCuboid", { w: e, d: e, h: e }),
  );
}

/* ── 2-5-6 직육면체의 전개도 — **접었을 때 어느 면과 만나나**를 치수로 묻는다 ── */

/** 연산 — 접으면 마주 보는 면은 합동이다(성질 한 번). */
function net256Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 전개도입니다. 이 전개도를 접었을 때 가로 ${n(w)} cm, 세로 ${n(d)} cm인 면과 마주 보는 면의 넓이는 몇 cm²입니까?`,
    n(w * d),
    `접었을 때 마주 보는 두 면은 모양과 크기가 같습니다. 따라서 넓이도 같아 ${expr(`${w}\\times${d}=${w * d}`)}이므로 ${n(w * d)} cm²입니다.`,
    fig("netCuboid", { w, d, h }),
  );
}

/** 기본 — 전개도에서 **같은 넓이의 면이 둘씩**임을 스스로 쓴다(한 겹). */
function net256Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 전개도입니다. 접었을 때 서로 마주 보는 두 면 중 가로가 ${n(w)} cm, 세로가 ${n(h)} cm인 면 두 개의 넓이의 합은 몇 cm²입니까?`,
    n(2 * w * h),
    `가로 ${n(w)} cm, 세로 ${n(h)} cm인 면은 접었을 때 서로 마주 보는 ${n(2)}개입니다. 합은 ${expr(`${w}\\times${h}\\times2=${2 * w * h}`)}이므로 ${n(2 * w * h)} cm²입니다.`,
    fig("netCuboid", { w, d, h }),
  );
}

/** 응용 — 두 단계: 서로 다른 두 종류의 면을 골라 합한다. */
function net256Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  const sum = w * d + w * h;
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 전개도입니다. 가로 ${n(w)} cm·세로 ${n(d)} cm인 면 한 개와 가로 ${n(w)} cm·세로 ${n(h)} cm인 면 한 개의 넓이의 합은 몇 cm²입니까?`,
    n(sum),
    `두 면의 넓이는 각각 ${expr(`${w}\\times${d}=${w * d}`)} cm², ${expr(`${w}\\times${h}=${w * h}`)} cm²입니다. 합은 ${expr(`${w * d}+${w * h}=${sum}`)}이므로 ${n(sum)} cm²입니다.`,
    fig("netCuboid", { w, d, h }),
  );
}

/**
 * 심화 — **역산 + 조건 조합**: 두 면의 넓이에서 **두 모서리**를 거슬러 구하고,
 * 거기서 모든 모서리 길이의 합까지 간다(세 걸음).
 *
 * ⚠️ `w`·`d`·`h` 를 먼저 잡으므로 두 나눗셈이 **언제나** 딱 떨어진다 — 넓이를 먼저
 *    뽑아 나누면 정수가 아닐 수 있고, 그때 거르면 후보가 빈다(D-66 ⒂).
 *
 * ⚠️ **그림을 붙이지 않는다.** 붙였다가 뺐다(2026-08-24). `netCuboid` 는
 *    `w !== d !== h` 면 세 치수를 **변 밖에 글자로** 찍는데(`elem_advanced.py`
 *    `_net_cuboid` 1726행), `boxDims` 가 셋이 서로 다른 것을 보장하므로
 *    **언제나** 찍힌다. 그러면 역산으로 구하라는 세로·높이가 지면에 적혀 있어
 *    학생이 두 나눗셈을 건너뛴다 — **심화가 실질 연산으로 주저앉는다.**
 *    값·조사·등식·사다리 판정기가 전부 초록이었다. 그 축이 없었다.
 *    2-5-5 심화가 같은 꼴(그림 없이 「전개도」를 낱말로만)로 이미 서 있다.
 */
function net256Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  const total = 4 * (w + d + h);
  return make(
    unit,
    `어떤 직육면체의 전개도에서 가로가 ${n(w)} cm인 면 두 개의 넓이가 각각 ${n(w * d)} cm², ${n(w * h)} cm²였습니다. 이 전개도를 접어 만든 직육면체의 모든 모서리 길이의 합은 몇 cm입니까?`,
    n(total),
    `넓이를 가로로 나누면 나머지 두 모서리를 알 수 있습니다. ${expr(`${w * d}\\div${w}=${d}`)}, ${expr(`${w * h}\\div${w}=${h}`)}이므로 세로는 ${n(d)} cm, 높이는 ${n(h)} cm입니다. 가로·세로·높이가 각각 ${n(4)}개씩이므로 ${expr(`(${w}+${d}+${h})\\times4=${total}`)}, 곧 ${n(total)} cm입니다.`,
  );
}

/** 문형 05 — 가로·세로 면은 전개도에 몇 개. */
function net256WdCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 전개도에서 가로 ${n(w)} cm, 세로 ${n(d)} cm인 면은 몇 개입니까?`,
    n(2),
    `마주 보는 면이 합동이므로 그런 면은 ${n(2)}개입니다.`,
    fig("netCuboid", { w, d, h }),
  );
}

/** 문형 06 — 전개도의 면 개수. */
function net256FaceCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 전개도에서 면은 몇 개입니까?`,
    n(6),
    `직육면체의 전개도는 면 ${n(6)}개입니다.`,
    fig("netCuboid", { w, d, h }),
  );
}

/** 문형 07 — 가로·높이 면의 넓이. 연산은 가로·세로 면이다. */
function net256WHArea(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 전개도에서 가로 ${n(w)} cm, 세로 ${n(h)} cm인 면의 넓이는 몇 cm²입니까?`,
    n(w * h),
    `${expr(`${w}\\times${h}=${w * h}`)}이므로 ${n(w * h)} cm²입니다.`,
    fig("netCuboid", { w, d, h }),
  );
}

/** 문형 08 — 세로·높이 면의 넓이. 07과 «가로·세로인 면» 틀이 겹치지 않게 높이를 쓴다. */
function net256DHArea(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 전개도에서 세로 ${n(d)} cm, 높이 ${n(h)} cm인 면의 넓이는 몇 cm²입니까?`,
    n(d * h),
    `${expr(`${d}\\times${h}=${d * h}`)}이므로 ${n(d * h)} cm²입니다.`,
    fig("netCuboid", { w, d, h }),
  );
}

/** 문형 09 — 서로 다른 세 면의 넓이 합. */
function net256ThreeSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  const s = w * d + w * h + d * h;
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 전개도에서 서로 다른 모양의 면 한 개씩의 넓이 합은 몇 cm²입니까?`,
    n(s),
    `${expr(`${w * d}+${w * h}+${d * h}=${s}`)}이므로 ${n(s)} cm²입니다.`,
    fig("netCuboid", { w, d, h }),
  );
}

/** 문형 10 — 이 엔진 십자 전개도의 둘레. */
function net256Perim(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, d, h } = boxDims(rng);
  const per = 2 * w + 8 * d + 4 * h;
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(d)} cm, 높이가 ${n(h)} cm인 직육면체의 전개도입니다. 이 전개도의 둘레는 몇 cm입니까?`,
    n(per),
    `이 전개도의 테두리는 ${expr(`2\\times${w}+8\\times${d}+4\\times${h}=${per}`)}이므로 ${n(per)} cm입니다.`,
    fig("netCuboid", { w, d, h }),
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * 확대 갈래 «심화중»·«심화상» — 물결 2: 1-5 · 1-6 · 2-6 (D-113 · D-115, 2026-08-31)
 *
 * 잣대는 D-115 ⑶·⑷·⑾ 그대로다.
 *
 * ```
 * 심화하  되짚기 사슬의 마디마다 값이 **하나로 굳는다**            (안 건드렸다)
 * 심화중  굳지 않는 마디가 **하나** 있고 **그 소단원의 성질**이 굳힌다.
 *         굳히는 성질이 후보를 «끝까지 계산하지 않고» 걸러 낸다 (⑾)
 * 심화상  성질로 못 굳혀 후보를 **실제로 다 만들어 견주어야** 하나가 남고,
 *         그 후보를 **발문이 주지 않고 되짚기가 만든다**
 * ```
 *
 * 🔴 **비운 자리가 있다.** 1-5-2(둘) · 1-6-2 심화중 · 1-6-3(둘) · 1-5-1 심화상 ·
 *    2-6-1 심화상 · 2-6-2 심화상. 까닭은 `tier-fill-g5-w2.md` §3 에 한 줄씩 적었다 —
 *    억지로 세우면 그것이 결함이다(D-115 ⑹).
 *
 * ## 이 회차가 지키는 규약 셋
 *
 * ⑴ **지면을 예측하지 않고 읽는다.** 후보를 고를 때 발문을 실제로 만들어
 *    `pageNumbers` 로 읽고 `forwardReachable` 에 댄다(반증 ⑥). 파일럿이
 *    「지면에 무엇이 찍힐까」를 예측하다 14건을 흘린 자리다(2026-08-30).
 * ⑵ **답이 발문에 그대로 있으면 버린다** — 반증 ⑥ 과는 **다른 축**이고
 *    (`forwardReach.ts` 의 `answerPrintedOnPage` 머리말), 여기서는 둘 다 건다.
 * ⑶ **개수는 한글로 적는다.** 「$4$명」의 `4` 는 자료가 아니라 낱말인데 지면 수가 되어
 *    ⑥ 이 오작동한다(초5 2-5 함정 ⑷ 실측). 그래서 「네 명」·「세 경기」로 적는다.
 */

/** 세는 수 — 한글. ⑶ 참조. */
const W2_COUNT: Record<number, string> = {
  2: "두",
  3: "세",
  4: "네",
  5: "다섯",
  6: "여섯",
  7: "일곱",
  8: "여덟",
  9: "아홉",
};

/** 정수 하나를 유리수로. */
const w2int = (v: number): Rat => rat(v, 1);

/**
 * 반증 ⑥ + 「답이 지면에 그대로」. **참은 찍힌 발문에서 온다** — 규칙은
 * `forwardReach.ts` 한 곳이고 여기서는 입력만 만든다.
 */
function w2Bad(content: string, answer: Rat): boolean {
  const nums = pageNumbers(content);
  return answerPrintedOnPage(nums, answer) || forwardReachable(nums, answer);
}

/** 후보 줄은 한 번만 만든다 — 씨앗마다 다시 훑으면 시험이 느려진다. */
const W2_POOLS = new Map<string, unknown[]>();
function w2Pool<T>(key: string, build: () => T[]): T[] {
  const hit = W2_POOLS.get(key);
  if (hit) return hit as T[];
  const made = build();
  W2_POOLS.set(key, made as unknown[]);
  return made;
}

/** 후보가 하나도 없으면 **던진다** — 조용히 다른 꼴을 내면 아무도 모른다. */
function w2Pick<T>(
  unit: UnitSeed,
  tier: string,
  rng: Rng,
  pool: readonly T[],
): T {
  if (pool.length === 0) {
    throw new Error(
      `«${tier}» 후보가 하나도 없습니다: ${unit.grade} ${unit.section}`,
    );
  }
  return pick(rng, pool);
}

/** `[분자, 분모]` — 늘 기약이고 양수다. */
type W2Fr = readonly [number, number];

const w2add = (x: W2Fr, y: W2Fr): W2Fr => addFrac(x[0], x[1], y[0], y[1]);
const w2sub = (x: W2Fr, y: W2Fr): W2Fr => subFrac(x[0], x[1], y[0], y[1]);
/** `x < y` 인가 — 부동소수를 판정에 쓰지 않는다. */
const w2lt = (x: W2Fr, y: W2Fr): boolean => x[0] * y[1] < y[0] * x[1];
const w2eq = (x: W2Fr, y: W2Fr): boolean => x[0] === y[0] && x[1] === y[1];
const w2rat = (x: W2Fr): Rat => rat(x[0], x[1]);
/** 진분수인가 — `0 < x < 1`. 이 대단원에서 **굳히는 성질**이다. */
const w2proper = (x: W2Fr): boolean => x[0] > 0 && x[0] < x[1];
/** 대분수인가 — `1` 보다 크고 자연수가 아니다. */
const w2mixed = (x: W2Fr): boolean => x[0] > x[1] && x[1] !== 1;

/** 기약 진분수 전부 (분모가 `dens` 안). */
function w2ProperAll(dens: readonly number[]): W2Fr[] {
  const out: W2Fr[] = [];
  for (const d of dens)
    for (let i = 1; i < d; i += 1) if (gcd(i, d) === 1) out.push([i, d]);
  return out;
}

/** 곱이 `p` 인 자연수 짝 `[작은, 큰]` — 같은 짝은 뺀다. */
function w2Pairs(p: number): [number, number][] {
  const out: [number, number][] = [];
  for (const d of divisors(p)) {
    const e = p / d;
    if (d < e) out.push([d, e]);
  }
  return out;
}

/* ────────── 1-5 분수의 덧셈과 뺄셈 — 확대 갈래 ──────────
 *
 * 굳히는 성질은 **소단원 이름**이다(D-113 반증 ③): 1-5-1·1-5-3 은 «진분수»,
 * 1-5-2·1-5-4 는 «대분수». ⚠️ 후보를 지우는 근거가 «음수라서»면 그것은 학년 제약이지
 * 소단원 성질이 아니다(토대 초5 1-5 함정 ⑴) — 그래서 아래 셋은 **버려지는 후보가
 * 양수인데도 그 소단원의 수가 아니어서** 지워지도록 구성으로 잡았다.
 *
 * 🔴 **1-5-2 는 심화중도 비웠다.** 1-5-1 에서 마디를 여는 것은 «진분수+진분수는 $2$보다
 *    작다»인데 **대분수 덧셈에는 그런 상한이 없다** — 자연수 부분 후보가 무한해
 *    창(범위)이나 발문 조건을 붙여야 하고, 그러면 굳히는 근거가 소단원 성질이 아니게 된다.
 * 🔴 **덧셈 둘의 심화상도 비웠다.** 덧셈은 역이 유일해 «되짚기가 만드는 후보»가
 *    구조적으로 안 생긴다. 조건을 둘 붙이면 그것은 1-5-3 판과 같은 문항이 된다.
 */

const W2_FRAC_DENS = [3, 4, 5, 6, 8, 9, 10, 12] as const;

/* ── 1-5-1 심화중 — 「합의 **자연수 부분**을 안 말한다」 ── */

type W2SumTask = { b: W2Fr; f: W2Fr; a: W2Fr; hi: W2Fr };

function w2Sum151(): W2SumTask[] {
  const out: W2SumTask[] = [];
  const all = w2ProperAll(W2_FRAC_DENS);
  for (const b of all) {
    for (const f of all) {
      if (b[1] === f[1]) continue; // 통분이 살아 있어야 이 대단원 계산이다
      if (!w2lt(b, f)) continue; // f > b 라야 «$1$을 더한 쪽»이 진분수를 벗어난다
      const a = w2sub(f, b);
      if (!w2proper(a)) continue;
      if (w2eq(a, b) || w2eq(a, f)) continue;
      if (a[1] > 24) continue;
      // 되짚기가 만드는 **다른 후보** — 합이 `1\frac{f}` 인 쪽. 이것이 진분수면
      // 마디가 안 굳어 답이 둘이 된다.
      const other = w2add(a, [1, 1]);
      if (w2proper(other)) continue;
      out.push({ b, f, a, hi: other });
    }
  }
  return out;
}

function add151Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W2SumTask) =>
    `어떤 진분수에 ${frj(t.b[0], t.b[1], "을", "를")} 더한 값의 분수 부분이 ${frj(t.f[0], t.f[1], "이", "가")} 되었습니다. 어떤 수를 구하시오.`;
  const pool = w2Pool("151mid", () =>
    w2Sum151().filter((t) => !w2Bad(content(t), w2rat(t.a))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  const [an, ad] = t.a;
  const [bn, bd] = t.b;
  const [fn, fd] = t.f;
  return makeDeep(unit, content(t), expr(fracLatex(an, ad)), [
    `진분수에 진분수를 더하면 ${n(2)}보다 작으므로, 합은 ${fr(fn, fd)} 또는 ${mx(1, fn, fd)}입니다.`,
    `합이 ${mx(1, fn, fd)}이면 어떤 수는 합이 ${fr(fn, fd)}일 때보다 ${n(1)}만큼 크므로 ${n(1)}보다 커서 진분수가 아닙니다. 그러므로 합은 ${fr(fn, fd)}입니다.`,
    `어떤 수는 ${expr(`\\frac{${fn}}{${fd}}-\\frac{${bn}}{${bd}}=${fracLatex(an, ad)}`)}입니다. 검산하면 ${expr(`${fracLatex(an, ad)}+\\frac{${bn}}{${bd}}=${fracLatex(fn, fd)}`)}입니다.`,
  ]);
}

/* ── 1-5-3 심화중 — 「차의 **방향**을 안 말한다」 ── */

type W2DiffTask = { p: W2Fr; q: W2Fr; lo: W2Fr; hi: W2Fr };

function w2Diff153(): W2DiffTask[] {
  const out: W2DiffTask[] = [];
  const all = w2ProperAll(W2_FRAC_DENS);
  for (const p of all) {
    for (const q of all) {
      if (p[1] === q[1]) continue;
      if (!w2lt(q, p)) continue; // 뺀 쪽이 양수여야 한다
      const lo = w2sub(p, q);
      const hi = w2add(p, q);
      if (!w2proper(lo)) continue;
      if (w2proper(hi)) continue; // 더한 쪽도 진분수면 마디가 안 굳는다
      if (w2eq(lo, p) || w2eq(lo, q)) continue;
      if (lo[1] > 24 || hi[1] > 24) continue;
      out.push({ p, q, lo, hi });
    }
  }
  return out;
}

function sub153Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W2DiffTask) =>
    `어떤 진분수와 ${fr(t.p[0], t.p[1])}의 차가 ${fr(t.q[0], t.q[1])}입니다. 어떤 수를 구하시오.`;
  const pool = w2Pool("153mid", () =>
    w2Diff153().filter((t) => !w2Bad(content(t), w2rat(t.lo))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  const [pn, pd] = t.p;
  const [qn, qd] = t.q;
  return makeDeep(unit, content(t), expr(fracLatex(t.lo[0], t.lo[1])), [
    `차가 ${fr(qn, qd)}이므로 어떤 수는 ${fr(pn, pd)}보다 ${fr(qn, qd)}만큼 크거나 작습니다.`,
    `더한 쪽은 ${expr(`\\frac{${pn}}{${pd}}+\\frac{${qn}}{${qd}}=${fracLatex(t.hi[0], t.hi[1])}`)}입니다. 이 값은 ${n(1)}보다 크므로 진분수가 아닙니다.`,
    `그러므로 어떤 수는 ${expr(`\\frac{${pn}}{${pd}}-\\frac{${qn}}{${qd}}=${fracLatex(t.lo[0], t.lo[1])}`)}입니다.`,
  ]);
}

/* ── 1-5-4 심화중 — 같은 축, 굳히는 성질이 «대분수» ── */

type W2MixTask = { p: W2Fr; q: W2Fr; lo: W2Fr; hi: W2Fr };

function w2Diff154(): W2MixTask[] {
  const out: W2MixTask[] = [];
  const props = w2ProperAll(W2_FRAC_DENS);
  const bases: W2Fr[] = [];
  for (const f of props)
    for (const w of [1, 2, 3]) bases.push([w * f[1] + f[0], f[1]]);
  for (const p of bases) {
    for (const q of props) {
      if (p[1] === q[1]) continue;
      const lo = w2sub(p, q);
      const hi = w2add(p, q);
      if (lo[0] <= 0) continue;
      if (w2mixed(lo)) continue; // 뺀 쪽도 대분수면 마디가 안 굳는다
      if (!w2mixed(hi)) continue;
      if (hi[1] > 24 || lo[1] > 24) continue;
      out.push({ p, q, lo, hi });
    }
  }
  return out;
}

function sub154Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W2MixTask) =>
    `어떤 대분수와 ${expr(fracLatex(t.p[0], t.p[1]))}의 차가 ${fr(t.q[0], t.q[1])}입니다. 어떤 수를 구하시오.`;
  const pool = w2Pool("154mid", () =>
    w2Diff154().filter((t) => !w2Bad(content(t), w2rat(t.hi))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  const P = fracLatex(t.p[0], t.p[1]);
  const [qn, qd] = t.q;
  return makeDeep(unit, content(t), expr(fracLatex(t.hi[0], t.hi[1])), [
    `차가 ${fr(qn, qd)}이므로 어떤 수는 ${expr(P)}보다 ${fr(qn, qd)}만큼 크거나 작습니다.`,
    `뺀 쪽은 ${expr(`${P}-\\frac{${qn}}{${qd}}=${fracLatex(t.lo[0], t.lo[1])}`)}입니다. 이 값은 ${n(1)}보다 작으므로 대분수가 아닙니다.`,
    `그러므로 어떤 수는 ${expr(`${P}+\\frac{${qn}}{${qd}}=${fracLatex(t.hi[0], t.hi[1])}`)}입니다.`,
  ]);
}

/* ── 1-5-3 · 1-5-4 심화상 — 「조건 둘, 어느 쪽도 성질로 안 갈린다」 ──
 *
 * 조건 하나마다 후보가 **둘**인데 **둘 다 그 소단원의 수**라 성질이 아무것도 안 지운다.
 * 네 값을 실제로 만들어 견주어야 겹치는 하나가 남는다(D-115 ⑾ 의 «상»).
 */

type W2TwoTask = {
  a: W2Fr;
  p1: W2Fr;
  d1: W2Fr;
  o1: W2Fr;
  p2: W2Fr;
  d2: W2Fr;
  o2: W2Fr;
};

function w2Two(kind: "proper" | "mixed"): W2TwoTask[] {
  const out: W2TwoTask[] = [];
  const props = w2ProperAll([3, 4, 5, 6, 8, 10, 12]);
  const holds = kind === "proper" ? w2proper : w2mixed;
  const answers: W2Fr[] =
    kind === "proper" ? props : props.map((f): W2Fr => [2 * f[1] + f[0], f[1]]);
  for (const a of answers) {
    for (const d1 of props) {
      const p1 = w2add(a, d1);
      const o1 = w2add(p1, d1);
      if (!holds(p1) || !holds(o1)) continue;
      if (p1[1] > 24 || o1[1] > 24) continue;
      for (const d2 of props) {
        if (d2[1] === d1[1]) continue;
        const p2 = w2sub(a, d2);
        const o2 = w2sub(p2, d2);
        if (p2[0] <= 0 || o2[0] <= 0) continue;
        if (!holds(p2) || !holds(o2)) continue;
        if (p2[1] > 24 || o2[1] > 24) continue;
        // 🔴 **「다른 후보 둘이 겹치면 버린다」는 안 건다 — 걸 수 없다.**
        //    변이가 그것을 「산출물이 그대로다」로 되돌려 줬고, 재 보니 참이다:
        //    `o1 = a + 2d1 > a > a - 2d2 = o2` 라 **겹칠 수가 없다.**
        //    죽은 줄을 남겨 두면 다음 사람이 「여기가 답의 유일성을 지킨다」고 읽는다.
        //    유일성을 실제로 지키는 것은 이 부등식이고, 시험이 `both.length === 1` 로
        //    **산출물에서** 다시 센다(`elemTiersG5W2` ⑵).
        if (w2eq(p1, p2) || w2eq(d1, d2)) continue;
        if (w2eq(a, p1) || w2eq(a, p2) || w2eq(a, d1) || w2eq(a, d2)) continue;
        out.push({ a, p1, d1, o1, p2, d2, o2 });
      }
    }
  }
  return out;
}

function w2TwoProblem(
  unit: UnitSeed,
  rng: Rng,
  key: string,
  kindWord: "진분수" | "대분수",
): ElemProblem {
  const content = (t: W2TwoTask) =>
    `어떤 ${kindWord}가 있습니다. 이 수와 ${expr(fracLatex(t.p1[0], t.p1[1]))}의 차는 ${expr(fracLatex(t.d1[0], t.d1[1]))}이고, 이 수와 ${expr(fracLatex(t.p2[0], t.p2[1]))}의 차는 ${expr(fracLatex(t.d2[0], t.d2[1]))}입니다. 어떤 수를 구하시오.`;
  const pool = w2Pool(key, () =>
    w2Two(kindWord === "진분수" ? "proper" : "mixed").filter(
      (t) => !w2Bad(content(t), w2rat(t.a)),
    ),
  );
  const t = w2Pick(unit, "심화상", rng, pool);
  const L = (x: W2Fr) => fracLatex(x[0], x[1]);
  return makeDeep(unit, content(t), expr(L(t.a)), [
    `첫째 조건에서 어떤 수는 ${expr(`${L(t.p1)}+${L(t.d1)}=${L(t.o1)}`)} 또는 ${expr(`${L(t.p1)}-${L(t.d1)}=${L(t.a)}`)}입니다. 둘 다 ${kindWord}라 여기서는 갈리지 않습니다.`,
    `둘째 조건에서 어떤 수는 ${expr(`${L(t.p2)}+${L(t.d2)}=${L(t.a)}`)} 또는 ${expr(`${L(t.p2)}-${L(t.d2)}=${L(t.o2)}`)}입니다.`,
    `두 조건을 모두 만족하는 것은 ${lj(L(t.a), "이므로", "이므로")} 어떤 수는 ${expr(L(t.a))}입니다.`,
  ]);
}

const sub153Top = (unit: UnitSeed, rng: Rng): ElemProblem =>
  w2TwoProblem(unit, rng, "153top", "진분수");

const sub154Top = (unit: UnitSeed, rng: Rng): ElemProblem =>
  w2TwoProblem(unit, rng, "154top", "대분수");

/* ────────── 1-6 다각형의 둘레와 넓이 — 확대 갈래 ──────────
 *
 * 되짚을 값은 **공식의 곱(또는 합)** 이고, 굳히는 것은 그 소단원의 도형 성질이다.
 *
 * 🔴 **창(범위)을 쓰지 않는다.** 「곱 → 인수 짝 → 창으로 둘 남김 → 곱해 견줌」은
 *    파일럿 2-4 가 이미 가져갔고, 토대 §2.1 §1 ㉠ 이 「1-6 은 범위가 아니라 **둘레**로
 *    짝을 고르라」고 못 박았다. 그래서 1-6-2 는 **둘레**로, 1-6-4 는 **차**로,
 *    1-6-5 는 **합**으로 고른다 — 형제끼리도 고르는 축이 다르다(D-66 ⑸).
 * 🔴 **1-6-2 심화중과 1-6-3 둘은 비웠다.** 까닭은 보고서 §3.
 */

/* ── 1-6-1 심화중 — 「어느 변끼리 이어 붙였는지 안 말한다」 ── */

type W2JoinTask = {
  w: number;
  h: number;
  joined: number;
  per: number;
  ans: number;
};

function w2Join(): W2JoinTask[] {
  const out: W2JoinTask[] = [];
  for (let h = 2; h <= 12; h += 1) {
    for (let w = h + 1; w <= 15; w += 1) {
      for (const joined of [w, h]) {
        const other = joined === w ? h : w;
        const per = 2 * (joined + 2 * other);
        const ans = Math.max(joined, 2 * other);
        if (ans === joined) continue; // 정사각형이거나 긴 변이 발문의 수다
        if (ans === w || ans === h || ans === per) continue;
        out.push({ w, h, joined, per, ans });
      }
    }
  }
  return out;
}

function per61Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W2JoinTask) =>
    `가로가 ${n(t.w)} cm, 세로가 ${n(t.h)} cm인 직사각형 모양 종이 두 장을 변끼리 꼭 맞게 이어 붙여 하나의 큰 직사각형을 만들었습니다. 만든 직사각형의 둘레가 ${n(t.per)} cm일 때, 만든 직사각형의 긴 변은 몇 cm입니까?`;
  const pool = w2Pool("161mid", () =>
    w2Join().filter((t) => !w2Bad(content(t), w2int(t.ans))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  const one = 2 * (t.w + t.h);
  const both = 2 * one;
  const gap = both - t.per;
  const other = t.joined === t.w ? t.h : t.w;
  return makeDeep(unit, content(t), n(t.ans), [
    `종이 한 장의 둘레는 ${expr(`(${t.w}+${t.h})\\times2=${one}`)} cm이므로 두 장의 둘레의 합은 ${expr(`${one}\\times2=${both}`)} cm입니다.`,
    `이어 붙이면 붙인 자리의 두 변이 둘레에서 빠집니다. 빠진 길이는 ${expr(`${both}-${t.per}=${gap}`)} cm이므로 붙인 변은 ${expr(`${gap}\\div2=${t.joined}`)} cm입니다.`,
    `곧 ${n(t.joined)} cm인 변끼리 붙였으므로 만든 직사각형은 한 변이 ${n(t.joined)} cm, 다른 한 변이 ${expr(`${other}+${other}=${2 * other}`)} cm입니다. 긴 변은 ${n(t.ans)} cm입니다.`,
  ]);
}

/* ── 1-6-1 심화상 — 「둘레가 같은 두 정다각형」 ── */

type W2PolyStep = { per: number; n1: number; n2: number; ok: boolean };
type W2PolyTask = {
  s1: number;
  s2: number;
  diff: number;
  per: number;
  steps: W2PolyStep[];
};

function w2Poly(): W2PolyTask[] {
  const out: W2PolyTask[] = [];
  for (let s1 = 2; s1 <= 12; s1 += 1) {
    for (let s2 = s1 + 1; s2 <= 15; s2 += 1) {
      const base = lcm(s1, s2);
      for (let k = 2; k <= 4; k += 1) {
        const per = base * k;
        // 규모로 어렵게 만들지 않는다(토대 1-6 함정 ⑹) — 나눗셈은 곱셈구구 안이다.
        if (per > 120) continue;
        const n1 = per / s1;
        const n2 = per / s2;
        if (n2 < 3 || n1 > 15) continue;
        const steps: W2PolyStep[] = [];
        for (let j = 1; j <= k; j += 1) {
          const p = base * j;
          steps.push({ per: p, n1: p / s1, n2: p / s2, ok: p / s2 >= 3 });
        }
        if (!steps.some((s) => !s.ok || s.n1 - s.n2 !== n1 - n2)) continue;
        out.push({ s1, s2, diff: n1 - n2, per, steps });
      }
    }
  }
  return out;
}

function per61Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W2PolyTask) =>
    `한 변의 길이가 ${n(t.s1)} cm인 정다각형과 한 변의 길이가 ${n(t.s2)} cm인 정다각형의 둘레가 같습니다. 두 정다각형의 변의 수의 차가 ${n(t.diff)}개일 때, 두 정다각형의 둘레는 몇 cm입니까?`;
  const pool = w2Pool("161top", () =>
    w2Poly().filter((t) => !w2Bad(content(t), w2int(t.per))),
  );
  const t = w2Pick(unit, "심화상", rng, pool);
  const 걸음: string[] = [
    `두 정다각형의 둘레는 같으므로 ${nro(t.s1)}도 ${nro(t.s2)}도 나누어떨어져야 합니다.`,
  ];
  for (const s of t.steps) {
    const head = `둘레가 ${n(s.per)} cm이면 변의 수는 ${expr(`${s.per}\\div${t.s1}=${s.n1}`)}개와 ${expr(`${s.per}\\div${t.s2}=${s.n2}`)}개입니다.`;
    걸음.push(
      s.ok
        ? `${head} 차는 ${expr(`${s.n1}-${s.n2}=${s.n1 - s.n2}`)}개입니다.`
        : `${head} 변이 ${n(s.n2)}개인 다각형은 없으므로 될 수 없습니다.`,
    );
  }
  걸음.push(`차가 ${n(t.diff)}개인 것은 둘레가 ${n(t.per)} cm일 때입니다.`);
  return makeDeep(unit, content(t), n(t.per), 걸음);
}

/* ── 1-6-2 심화상 — 「넓이가 만드는 인수 짝을 **둘레**로 고른다」 ── */

type W2RectTask = {
  a: number;
  b: number;
  area: number;
  per: number;
  square: number;
  pairs: [number, number][];
};

function w2Rect(): W2RectTask[] {
  const out: W2RectTask[] = [];
  for (let b = 2; b <= 10; b += 1) {
    for (let a = b + 1; a <= 20; a += 1) {
      const area = a * b;
      if (area > 72) continue;
      const pairs = w2Pairs(area);
      if (pairs.length < 3 || pairs.length > 5) continue;
      // 🔴 **묻는 값이 «넓이»여야 한다.** 1-6-1 과 1-6-2 를 가르는 것은 답의 종류다
      //    (1-6-1 응용은 «길이», 1-6-2 응용은 «넓이» — g5.ts 1-6 머리말·
      //    `elementaryG5Tiers` 가 「넓이는 몇 cm²입니까?」로 못 박는다).
      //    첫 판은 가로(길이)를 물었다가 그 시험에 걸렸다 — 되짚은 가로를 **한 변으로
      //    하는 정사각형의 넓이**로 한 걸음 더 가서 소단원 안에 남는다.
      if (a > 12) continue; // 정사각형 넓이가 곱셈구구 밖으로 나가지 않게
      const per = 2 * (a + b);
      const square = a * a;
      if (square === area || square === per) continue;
      out.push({ a, b, area, per, square, pairs });
    }
  }
  return out;
}

function area62Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W2RectTask) =>
    `가로와 세로의 길이가 모두 자연수 cm이고 가로가 세로보다 긴 직사각형이 있습니다. 넓이가 ${n(t.area)} cm²이고 둘레가 ${n(t.per)} cm일 때, 이 직사각형의 가로를 한 변으로 하는 정사각형의 넓이는 몇 cm²입니까?`;
  const pool = w2Pool("162top", () =>
    w2Rect().filter((t) => !w2Bad(content(t), w2int(t.square))),
  );
  const t = w2Pick(unit, "심화상", rng, pool);
  const list = t.pairs
    .map(([x, y]) => `${nj(x, "과", "와")} ${n(y)}`)
    .join(", ");
  const pers = t.pairs
    .map(([x, y]) => expr(`(${x}+${y})\\times2=${2 * (x + y)}`))
    .join(", ");
  return makeDeep(unit, content(t), n(t.square), [
    `넓이가 ${n(t.area)} cm²이 되는 가로와 세로의 짝은 ${list}입니다.`,
    `둘레를 차례로 구하면 ${pers}입니다.`,
    `둘레가 ${n(t.per)} cm인 것은 ${n(t.b)} cm와 ${n(t.a)} cm이므로 가로는 ${n(t.a)} cm입니다.`,
    `정사각형의 넓이는 한 변을 두 번 곱한 ${expr(`${t.a}\\times${t.a}=${t.square}`)}이므로 ${n(t.square)} cm²입니다.`,
  ]);
}

/* ── 1-6-4 심화중 — 「넓이의 합을 어떻게 나누는지 안 굳는다」 ── */

type W2ParaTask = {
  base: number;
  height: number;
  sum: number;
  tri: number;
  para: number;
};

function w2Para(): W2ParaTask[] {
  const out: W2ParaTask[] = [];
  for (let base = 3; base <= 14; base += 1) {
    for (let height = 2; height <= 14; height += 1) {
      if (base === height) continue;
      const prod = base * height;
      if (prod % 2 !== 0) continue;
      const tri = prod / 2;
      const sum = tri * 3;
      if (sum > 240) continue;
      if (height === sum || height === base) continue;
      out.push({ base, height, sum, tri, para: prod });
    }
  }
  return out;
}

function area64Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W2ParaTask) =>
    `밑변의 길이가 같고 높이도 같은 평행사변형과 삼각형이 있습니다. 두 도형의 넓이의 합이 ${n(t.sum)} cm²이고 밑변이 ${n(t.base)} cm일 때, 높이는 몇 cm입니까?`;
  const pool = w2Pool("164mid", () =>
    w2Para().filter((t) => !w2Bad(content(t), w2int(t.height))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  return makeDeep(unit, content(t), n(t.height), [
    `밑변과 높이가 같으면 삼각형의 넓이는 평행사변형의 반입니다. 그러므로 두 넓이의 합은 삼각형 넓이의 ${n(3)}배입니다.`,
    `삼각형의 넓이는 ${expr(`${t.sum}\\div3=${t.tri}`)} cm²이고, 평행사변형의 넓이는 ${expr(`${t.tri}\\times2=${t.para}`)} cm²입니다.`,
    `평행사변형의 밑변이 ${n(t.base)} cm이므로 높이는 ${expr(`${t.para}\\div${t.base}=${t.height}`)} cm입니다.`,
  ]);
}

/* ── 1-6-4 심화상 — 「넓이의 $2$배가 만드는 짝을 **차**로 고른다」 ── */

type W2TriTask = {
  pb: number;
  ph: number;
  area: number;
  prod: number;
  pairs: [number, number][];
  x: number;
  y: number;
  diff: number;
};

function w2Tri(): W2TriTask[] {
  const out: W2TriTask[] = [];
  for (let pb = 2; pb <= 9; pb += 1) {
    for (let ph = 2; ph <= 9; ph += 1) {
      const area = pb * ph;
      const prod = area * 2;
      const pairs = w2Pairs(prod);
      if (pairs.length < 3 || pairs.length > 5) continue;
      for (const [x, y] of pairs) {
        const diff = y - x;
        if (pairs.filter(([u, v]) => v - u === diff).length !== 1) continue;
        if (y === pb || y === ph || y === diff || y === area) continue;
        out.push({ pb, ph, area, prod, pairs, x, y, diff });
      }
    }
  }
  return out;
}

function area64Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W2TriTask) =>
    `밑변이 ${n(t.pb)} cm, 높이가 ${n(t.ph)} cm인 평행사변형과 넓이가 같은 삼각형이 있습니다. 이 삼각형의 밑변과 높이가 모두 자연수 cm이고 밑변이 높이보다 ${n(t.diff)} cm 길 때, 삼각형의 밑변은 몇 cm입니까?`;
  const pool = w2Pool("164top", () =>
    w2Tri().filter((t) => !w2Bad(content(t), w2int(t.y))),
  );
  const t = w2Pick(unit, "심화상", rng, pool);
  const list = t.pairs
    .map(([x, y]) => `${nj(x, "과", "와")} ${n(y)}`)
    .join(", ");
  const diffs = t.pairs.map(([x, y]) => expr(`${y}-${x}=${y - x}`)).join(", ");
  return makeDeep(unit, content(t), n(t.y), [
    `평행사변형의 넓이는 ${expr(`${t.pb}\\times${t.ph}=${t.area}`)} cm²이고 삼각형도 넓이가 같습니다. 삼각형은 넓이에 ${n(2)}를 곱하면 밑변과 높이의 곱이므로 ${expr(`${t.area}\\times2=${t.prod}`)}입니다.`,
    `곱이 ${n(t.prod)}인 자연수 짝은 ${list}입니다. 차를 차례로 구하면 ${diffs}입니다.`,
    `차가 ${n(t.diff)} cm인 것은 ${n(t.x)} cm와 ${n(t.y)} cm이므로 밑변은 ${n(t.y)} cm입니다.`,
  ]);
}

/* ── 1-6-5 심화중 — 「대각선의 곱을 어떻게 가르는지 안 굳는다」 ── */

type W2RhombTask = {
  short: number;
  mult: number;
  area: number;
  prod: number;
  long: number;
};

function w2Rhomb(): W2RhombTask[] {
  const out: W2RhombTask[] = [];
  for (let short = 3; short <= 12; short += 1) {
    for (const mult of [2, 3]) {
      const prod = short * short * mult;
      if (prod % 2 !== 0) continue;
      const area = prod / 2;
      const long = short * mult;
      if (area > 100) continue;
      if (long === area || long === mult || long === short) continue;
      out.push({ short, mult, area, prod, long });
    }
  }
  return out;
}

function area65Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W2RhombTask) =>
    `어떤 마름모의 넓이가 ${n(t.area)} cm²입니다. 긴 대각선의 길이가 짧은 대각선의 길이의 ${n(t.mult)}배일 때, 긴 대각선은 몇 cm입니까?`;
  const pool = w2Pool("165mid", () =>
    w2Rhomb().filter((t) => !w2Bad(content(t), w2int(t.long))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  const sq = t.short * t.short;
  return makeDeep(unit, content(t), n(t.long), [
    `마름모의 넓이에 ${n(2)}를 곱하면 두 대각선의 길이의 곱이므로 ${expr(`${t.area}\\times2=${t.prod}`)}입니다.`,
    `긴 대각선이 짧은 대각선의 ${n(t.mult)}배이므로, 짧은 대각선을 두 번 곱한 값의 ${n(t.mult)}배가 ${n(t.prod)}입니다. ${expr(`${t.prod}\\div${t.mult}=${sq}`)}이고 곱셈구구에서 두 번 곱해 ${lj(String(sq), "이", "가")} 되는 수는 ${n(t.short)}입니다.`,
    `짧은 대각선이 ${n(t.short)} cm이므로 긴 대각선은 그 ${n(t.mult)}배인 ${n(t.long)} cm입니다.`,
  ]);
}

/* ── 1-6-5 심화상 — 「두 변의 곱이 만드는 짝을 **합**으로 고른다」 ── */

type W2TrapTask = {
  h: number;
  area: number;
  prod: number;
  pairs: [number, number][];
  x: number;
  y: number;
  sum: number;
};

function w2Trap(): W2TrapTask[] {
  const out: W2TrapTask[] = [];
  for (let x = 1; x <= 10; x += 1) {
    for (let y = x + 1; y <= 20; y += 1) {
      const prod = x * y;
      if (prod > 72) continue;
      const pairs = w2Pairs(prod);
      if (pairs.length < 3 || pairs.length > 5) continue;
      const sum = x + y;
      if (pairs.filter(([u, v]) => u + v === sum).length !== 1) continue;
      for (let h = 2; h <= 10; h += 1) {
        if ((sum * h) % 2 !== 0) continue;
        const area = (sum * h) / 2;
        if (area > 200) continue;
        if (y === h || y === area || y === prod) continue;
        out.push({ h, area, prod, pairs, x, y, sum });
      }
    }
  }
  return out;
}

function area65Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W2TrapTask) =>
    `높이가 ${n(t.h)} cm인 사다리꼴의 넓이가 ${n(t.area)} cm²입니다. 윗변과 아랫변의 길이가 모두 자연수 cm이고 두 변의 길이의 곱이 ${n(t.prod)}일 때, 아랫변은 몇 cm입니까? 단, 아랫변이 윗변보다 깁니다.`;
  const pool = w2Pool("165top", () =>
    w2Trap().filter((t) => !w2Bad(content(t), w2int(t.y))),
  );
  const t = w2Pick(unit, "심화상", rng, pool);
  const list = t.pairs
    .map(([x, y]) => `${nj(x, "과", "와")} ${n(y)}`)
    .join(", ");
  const sums = t.pairs.map(([x, y]) => expr(`${x}+${y}=${x + y}`)).join(", ");
  return makeDeep(unit, content(t), n(t.y), [
    `사다리꼴은 넓이에 ${n(2)}를 곱하고 높이로 나누면 두 변의 길이의 합이므로 ${expr(`${t.area}\\times2\\div${t.h}=${t.sum}`)} cm입니다.`,
    `곱이 ${n(t.prod)}인 자연수 짝은 ${list}입니다. 합을 차례로 구하면 ${sums}입니다.`,
    `합이 ${n(t.sum)} cm인 것은 ${n(t.x)} cm와 ${n(t.y)} cm이고 아랫변이 윗변보다 길므로 아랫변은 ${n(t.y)} cm입니다.`,
  ]);
}

/* ────────── 2-6 평균과 가능성 — 확대 갈래 ──────────
 *
 * 굳히는 재료는 소단원이 가르치는 것 그 자체다 — ㉠ 평균은 자료 사이에 있고
 * **인원이 많은 쪽으로 치우친다**(2-6-1) ㉡ 평균보다 많은 만큼과 모자란 만큼이
 * **맞물린다**(2-6-2) ㉢ 가능성 분수만으로는 **개수가 안 굳는다**(2-6-3).
 *
 * 🔴 **2-6-1·2-6-2 의 심화상은 비웠다.** 까닭은 보고서 §3 — 둘 다 후보를 만들려면
 *    인원(경기) 짝을 훑어야 하는데 그것이 곧 열거이고, 열거 축은 D-115 ⑵ 가 기각했다.
 */

/* ── 2-6-1 심화중 — 「어느 모둠이 어느 평균인지 안 말한다」 ── */

type W2AvgTask = {
  low: number;
  high: number;
  ga: number;
  na: number;
  naHigh: boolean;
  total: number;
  ans: number;
};

function w2Avg261(): W2AvgTask[] {
  const out: W2AvgTask[] = [];
  for (let low = 55; low <= 85; low += 5) {
    for (let high = low + 10; high <= 95; high += 5) {
      for (let ga = 3; ga <= 9; ga += 1) {
        for (let na = 3; na <= 9; na += 1) {
          if (ga === na) continue;
          for (const naHigh of [true, false]) {
            const naAvg = naHigh ? high : low;
            const gaAvg = naHigh ? low : high;
            const sum = naAvg * na + gaAvg * ga;
            if (sum % (ga + na) !== 0) continue;
            const total = sum / (ga + na);
            if (total === low || total === high) continue;
            const ans = naAvg * na;
            if (ans === low || ans === high || ans === total) continue;
            // 성질이 **실제로 일해야** 한다 — 인원이 많은 쪽의 평균에 더 가깝다.
            const bigAvg = na > ga ? naAvg : gaAvg;
            if (
              Math.abs(total - bigAvg) >=
              Math.abs(total - (na > ga ? gaAvg : naAvg))
            )
              continue;
            out.push({ low, high, ga, na, naHigh, total, ans });
          }
        }
      }
    }
  }
  return out;
}

function avg261Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W2AvgTask) =>
    `가 모둠과 나 모둠 중 한 모둠의 수학 점수 평균은 ${n(t.low)}점, 다른 모둠의 수학 점수 평균은 ${n(t.high)}점입니다. 가 모둠은 ${W2_COUNT[t.ga]} 명, 나 모둠은 ${W2_COUNT[t.na]} 명이고 두 모둠 전체의 평균은 ${n(t.total)}점입니다. 나 모둠 학생들의 점수의 합은 몇 점입니까?`;
  const pool = w2Pool("261mid", () =>
    w2Avg261().filter((t) => !w2Bad(content(t), w2int(t.ans))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  const naAvg = t.naHigh ? t.high : t.low;
  const bigLabel = t.na > t.ga ? "나" : "가";
  const bigAvg = t.na > t.ga ? naAvg : t.naHigh ? t.low : t.high;
  return makeDeep(unit, content(t), n(t.ans), [
    `전체 평균 ${n(t.total)}점은 ${n(t.low)}점보다 ${expr(`${t.total}-${t.low}=${t.total - t.low}`)}점 높고, ${n(t.high)}점보다 ${expr(`${t.high}-${t.total}=${t.high - t.total}`)}점 낮습니다.`,
    `평균은 학생 수가 많은 쪽으로 치우치므로, 학생 수가 더 많은 ${bigLabel} 모둠의 평균이 더 가까운 ${n(bigAvg)}점입니다.`,
    `그러므로 나 모둠의 평균은 ${n(naAvg)}점이고, 나 모둠 학생들의 점수의 합은 ${expr(`${naAvg}\\times${t.na}=${t.ans}`)}점입니다.`,
  ]);
}

/* ── 2-6-2 심화중 — 「앞의 경기 수를 안 말한다」 ── */

type W2GameTask = {
  low: number;
  high: number;
  total: number;
  back: number;
  front: number;
  ans: number;
  who: string;
};

function w2Avg262(): W2GameTask[] {
  const out: W2GameTask[] = [];
  for (let low = 4; low <= 12; low += 1) {
    for (let total = low + 1; total <= 18; total += 1) {
      for (let high = total + 1; high <= 22; high += 1) {
        for (let back = 2; back <= 4; back += 1) {
          const over = (high - total) * back;
          if (over % (total - low) !== 0) continue;
          const front = over / (total - low);
          if (front < 2 || front > 12) continue;
          const ans = front + back;
          if (ans === low || ans === high || ans === total) continue;
          out.push({ low, high, total, back, front, ans, who: "" });
        }
      }
    }
  }
  return out;
}

function avg262Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W2GameTask) =>
    `${wj(t.who, "은", "는")} 앞의 몇 경기에서 평균 ${n(t.low)}점을 얻었고, 뒤의 ${W2_COUNT[t.back]} 경기에서는 평균 ${n(t.high)}점을 얻었습니다. 전체 평균이 ${n(t.total)}점일 때 ${wj(t.who, "은", "는")} 모두 몇 경기를 했습니까?`;
  const pool = w2Pool("262mid", () =>
    w2Avg262()
      .flatMap((t) => FRAC_NAMES.map((who) => ({ ...t, who })))
      .filter((t) => !w2Bad(content(t), w2int(t.ans))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  const over = (t.high - t.total) * t.back;
  return makeDeep(unit, content(t), n(t.ans), [
    `뒤의 ${W2_COUNT[t.back]} 경기는 전체 평균보다 ${expr(`${t.high}-${t.total}=${t.high - t.total}`)}점씩 많으므로 모두 ${expr(`${t.high - t.total}\\times${t.back}=${over}`)}점이 남습니다.`,
    `앞의 경기들은 전체 평균보다 ${expr(`${t.total}-${t.low}=${t.total - t.low}`)}점씩 모자랍니다. 모자란 만큼이 남는 만큼과 같아야 하므로 앞의 경기는 ${expr(`${over}\\div${t.total - t.low}=${t.front}`)}경기입니다.`,
    `그러므로 모두 ${expr(`${t.front}+${t.back}=${t.ans}`)}경기입니다.`,
  ]);
}

/* ── 2-6-3 심화중 — 「가능성만으로는 개수가 안 굳는다」 ── */

type W2PosTask = {
  a: number;
  b: number;
  times: number;
  blue: number;
  red: number;
};

function w2Pos263(): W2PosTask[] {
  const out: W2PosTask[] = [];
  for (let b = 3; b <= 12; b += 1) {
    for (let a = 1; a < b; a += 1) {
      if (gcd(a, b) !== 1) continue;
      for (let times = 2; times <= 6; times += 1) {
        if (b * times > 60) continue;
        const blue = (b - a) * times;
        const red = a * times;
        if (red === blue || red === a || red === b) continue;
        out.push({ a, b, times, blue, red });
      }
    }
  }
  return out;
}

function pos263Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W2PosTask) =>
    `주머니에 빨간 구슬과 파란 구슬만 들어 있습니다. 구슬 한 개를 꺼낼 때 꺼낸 구슬이 빨간색일 가능성이 ${frj(t.a, t.b, "이고", "이고")} 파란 구슬이 ${n(t.blue)}개일 때, 빨간 구슬은 몇 개입니까?`;
  const pool = w2Pool("263mid", () =>
    w2Pos263().filter((t) => !w2Bad(content(t), w2int(t.red))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  return makeDeep(unit, content(t), n(t.red), [
    `빨간색일 가능성이 ${fr(t.a, t.b)}이므로 전체를 ${nj(t.b, "묶음으로", "묶음으로")} 똑같이 나누면 빨간 구슬이 ${n(t.a)}묶음, 파란 구슬이 ${expr(`${t.b}-${t.a}=${t.b - t.a}`)}묶음입니다.`,
    `파란 구슬이 ${n(t.blue)}개이므로 한 묶음은 ${expr(`${t.blue}\\div${t.b - t.a}=${t.times}`)}개입니다.`,
    `빨간 구슬은 ${n(t.a)}묶음이므로 ${expr(`${t.times}\\times${t.a}=${t.red}`)}개입니다.`,
  ]);
}

/* ── 2-6-3 심화상 — 「되짚기가 만든 줄에 한 번 더 계산해 견준다」 ── */

type W2PosTopTask = {
  a: number;
  b: number;
  k: number;
  add: number;
  red: number;
  blue: number;
};

function w2Pos263Top(): W2PosTopTask[] {
  const out: W2PosTopTask[] = [];
  for (let b = 3; b <= 12; b += 1) {
    for (let a = 1; a < b; a += 1) {
      if (gcd(a, b) !== 1) continue;
      if (b <= 2 * a) continue; // 반반이 되려면 지금 가능성이 반보다 작아야 한다
      for (let k = 2; k <= 4; k += 1) {
        const add = k * (b - 2 * a);
        if (add < 2 || add > 20) continue;
        if (b * k > 60) continue;
        const blue = (b - a) * k;
        const red = a * k;
        if (blue === add || blue === a || blue === b) continue;
        out.push({ a, b, k, add, red, blue });
      }
    }
  }
  return out;
}

function pos263Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W2PosTopTask) =>
    `주머니에 빨간 구슬과 파란 구슬만 들어 있습니다. 구슬 한 개를 꺼낼 때 꺼낸 구슬이 빨간색일 가능성은 ${fr(t.a, t.b)}입니다. 이 주머니에 빨간 구슬 ${n(t.add)}개를 더 넣었더니 빨간색일 가능성이 반반이 되었습니다. 파란 구슬은 몇 개입니까?`;
  const pool = w2Pool("263top", () =>
    w2Pos263Top().filter((t) => !w2Bad(content(t), w2int(t.blue))),
  );
  const t = w2Pick(unit, "심화상", rng, pool);
  const 걸음: string[] = [
    `반반이 되었다는 것은 더 넣은 뒤 빨간 구슬과 파란 구슬의 수가 같다는 뜻입니다. 파란 구슬은 늘지 않으므로, 파란 구슬의 수가 곧 더 넣은 뒤의 빨간 구슬의 수입니다.`,
    `가능성이 ${fr(t.a, t.b)}인 주머니는 빨간 구슬이 ${n(t.a)}개·파란 구슬이 ${nj(t.b - t.a, "개일", "개일")} 수도 있고, 그것을 똑같이 몇 배 한 것일 수도 있습니다.`,
  ];
  for (let j = 1; j <= t.k; j += 1) {
    const red = t.a * j;
    const blue = (t.b - t.a) * j;
    const after = red + t.add;
    걸음.push(
      after === blue
        ? `빨간 ${n(red)}개·파란 ${n(blue)}개이면 더 넣은 뒤 빨간 구슬은 ${expr(`${red}+${t.add}=${after}`)}개로 파란 구슬과 같습니다.`
        : `빨간 ${n(red)}개·파란 ${n(blue)}개이면 더 넣은 뒤 빨간 구슬은 ${expr(`${red}+${t.add}=${after}`)}개라 파란 구슬 ${n(blue)}개와 다릅니다.`,
    );
  }
  걸음.push(`그러므로 파란 구슬은 ${n(t.blue)}개입니다.`);
  return makeDeep(unit, content(t), n(t.blue), 걸음);
}

/* ══════════════════════════════════════════════════════════════════════════
 * 확대 갈래 «심화중»·«심화상» — 물결 3: 1-2 · 2-1 · 2-3 (D-113 · D-115, 2026-08-31)
 *
 * 잣대는 D-115 ⑶·⑷·⑾ 그대로다(물결 2 머리말 참조). 이 회차가 **예약한 굳힘 축**은
 * 대단원마다 하나씩이고, 앞 회차가 쓴 축(1-5 진분수/대분수 · 1-6 둘레 · 2-6 평균·가능성 ·
 * 파일럿 2-4 «창»)과 겹치지 않는다.
 *
 * ```
 * 1-2  약수와 배수        «약수는 짝을 이룬다» · «두 몫은 서로소» · «공배수는 최소공배수의 배수»
 * 2-1  수의 범위와 어림     «그 자리까지 어림하면 그 자리 아래는 0» · «세 어림의 끝 규칙이 서로 다르다»
 * 2-3  합동과 대칭         «점대칭도형은 마주 보는 변끼리 길이가 같다»
 * ```
 *
 * 🔴 **비운 자리가 스무 칸이다.** 1-2-2·1-2-3·1-2-5 여섯 · 2-1-1 상 · 2-1-2·2-1-3·2-1-5 여섯 ·
 *    2-3-1·2-3-2·2-3-3 여섯 · 2-3-4 상. 까닭은 `tier-fill-g5-w3.md` §3 에 한 줄씩 적었다 —
 *    억지로 세우면 그것이 결함이다(D-115 ⑹).
 *
 * ⚠️ 이 세 대단원은 **반증 ⑥ 자가 거의 못 본다**(`forwardReachable` 이 아는 길은 곱셈이
 *    든 네 모양뿐이라 «약수를 나열한다»·«어림한다»·«구간을 센다»가 통째로 없다).
 *    그래서 자를 **가드로는 쓰되**(아래 `w2Bad`) 「안 닿는다」를 근거로 삼지 않는다.
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * 🔴 **덧뺄셈 «한 걸음»으로 닿나** — 반증 ⑥ 자가 **구조적으로 못 보는** 축
 * (리드 지시 2026-08-31).
 *
 * `forwardReachable` 의 허용 꼴 넷은 **전부 곱을 문다**(`a×b` · `a×b×c` · `a×b±c` ·
 * `a×b±c×d`). 곱이 첫 걸음이 아니면 길이 아예 없으므로, 덧뺄셈만으로 푸는 자리에서
 * 그 「0건」은 «깨끗»이 아니라 **«못 셈»** 이다. 초3 이 `pmOneStepReachable` 를
 * `forwardReach.ts` 에 세웠으나 아직 main 에 없어 공용 판정기에 안 물렸다 —
 * **물리면 도는 물결의 관문이 흔들리므로** 그때까지 이 회차의 갈래는 여기서 막는다.
 *
 * 규칙: 지면의 두 수 `a`·`b` 에 대해 `a+b` 또는 `a-b` 가 답과 같고 그 값이 `a` 와도
 * `b` 와도 다르면 한 걸음이다(`0` 을 더하고 빼는 것은 걸음이 아니다).
 *
 * ⚠️ 「닿는다 = 결함」은 아니다 — 실제로 여기서 걸린 넷은 **산술 우연**이었다
 * (1-2-1 심화상에서 `약수의 합 − 배수의 개수`, 200씨앗 중 4). 그 소단원의 연산이
 * `+`·`-` 가 아니고 그 길에 뜻도 없다. 그래도 **못 가르는 것은 버리는 쪽**으로 둔다 —
 * 잃는 것이 2%뿐이고, 남기면 학생이 우연히 맞히는 자리가 지면에 나간다.
 */
function w3PmOneStep(content: string, answer: Rat): boolean {
  if (answer.d !== 1) return false;
  const nums = pageNumbers(content)
    .filter((r) => r.d === 1)
    .map((r) => r.n);
  for (const a of nums) {
    for (const b of nums) {
      if (a === b || a === 0 || b === 0) continue;
      for (const v of [a + b, a - b])
        if (v === answer.n && v !== a && v !== b) return true;
    }
  }
  return false;
}

/** 이 회차의 가드 — `w2Bad`(반증 ⑥ · 답이 지면에) 에 **덧뺄셈 한 걸음**을 더한다. */
function w3Bad(content: string, answer: Rat): boolean {
  return w2Bad(content, answer) || w3PmOneStep(content, answer);
}

/**
 * 🔴 **같은 발문·같은 답이면 한 번만 잰다** — 풀을 만드는 시간 때문이다.
 *
 * 후보 줄이 커지면 `w3Bad` 를 그 수만큼 돌게 되고, 그게 **관문의 20초 예산**을
 * 갉아먹는다(2026-09-01 물결 4 에서 `elementaryDifficulty` 가 실제로 시간 초과로
 * 떨어졌다 — 풀 만드는 데 8.1초였다). 발문이 몇 가지 값에만 달린 갈래는 열쇠를
 * 주고 결과를 되쓴다. ⚠️ **열쇠에 발문·답을 정하는 값이 다 들어가야 한다** —
 * 빠뜨리면 다른 문항의 판정을 되쓰게 된다.
 */
function w4BadMemo(
  seen: Map<string, boolean>,
  key: string,
  content: () => string,
  answer: number,
): boolean {
  const hit = seen.get(key);
  if (hit !== undefined) return hit;
  const bad = w3Bad(content(), w2int(answer));
  seen.set(key, bad);
  return bad;
}

/** 약수를 모두 더한 값. */
function w3DivSum(v: number): number {
  return divisors(v).reduce((s, d) => s + d, 0);
}

/**
 * 「두 번째로 큰 약수가 `m`」인 수를 **전부** 만든다.
 *
 * 약수는 짝을 이루므로 두 번째로 큰 약수는 «그 수 ÷ 두 번째로 작은 약수»다.
 * 곧 후보는 `m × p` 이고 `p` 가 그 수의 **두 번째로 작은 약수**여야 한다 —
 * 그 검사를 빼면 `m` 이 두 번째로 큰 약수가 아닌 수가 섞인다.
 */
function w3SecondLargestOwners(m: number): number[] {
  const out: number[] = [];
  for (let p = 2; p <= m; p += 1) {
    const v = m * p;
    const ds = divisors(v);
    if (ds[1] !== p) continue;
    if (ds[ds.length - 2] !== m) continue;
    out.push(v);
  }
  return out;
}

/* ── 1-2-1 심화중 — 「두 번째로 **작은** 약수가 무엇인지 안 말한다」 ── */

type W3SecondTask = { m: number; even: number; odd: number[] };

function w3Second121(): W3SecondTask[] {
  const out: W3SecondTask[] = [];
  // `m` 이 홀수라야 후보가 둘 이상 생긴다 — 짝수면 `p` 가 `2` 하나뿐이라 마디가 안 열린다.
  for (let m = 9; m <= 45; m += 2) {
    const owners = w3SecondLargestOwners(m);
    if (owners.length < 2) continue;
    const evens = owners.filter((v) => v % 2 === 0);
    if (evens.length !== 1) continue; // 「짝수」가 **하나만** 남겨야 굳는다
    if (evens[0]! > 90) continue; // 규모를 키우는 것은 축이 아니다(이 대단원은 두 자리다)
    if (owners.some((v) => v > 150)) continue; // 지우는 후보도 지면에 앉을 만해야 한다
    out.push({ m, even: evens[0]!, odd: owners.filter((v) => v % 2 !== 0) });
  }
  return out;
}

function fac121Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W3SecondTask) =>
    `어떤 수의 약수 중에서 두 번째로 큰 수가 ${n(t.m)}입니다. 어떤 수가 짝수일 때 어떤 수를 구하시오.`;
  const pool = w2Pool("w3-121mid", () =>
    w3Second121().filter((t) => !w3Bad(content(t), w2int(t.even))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  return makeDeep(unit, content(t), n(t.even), [
    `약수는 짝을 이루므로 두 번째로 작은 약수와 두 번째로 큰 약수를 곱하면 어떤 수가 됩니다.`,
    `어떤 수가 짝수이면 ${nj(2, "은", "는")} 약수이므로 두 번째로 작은 약수는 ${n(2)}입니다.`,
    `그러므로 어떤 수는 ${expr(`2\\times${t.m}=${t.even}`)}입니다. ${n(t.even)}의 약수는 ${nums(divisors(t.even))}이고, ${expr(`${t.even}\\div2=${t.m}`)}이므로 두 번째로 큰 수가 ${n(t.m)}인 것이 맞습니다.`,
  ]);
}

/* ── 1-2-1 심화상 — 「배수의 **개수**만 주어 후보를 여럿 만들고, 약수의 합으로 견준다」 ──
 *
 * 🔴 첫 판은 심화중과 **같은 첫 문장**(「두 번째로 큰 약수가 …」)이었다. 그러면 두 갈래가
 *    같은 `m` 을 뽑는 씨앗에서 **답까지 같아진다**(실측: 씨앗 20266955 에서 둘 다 $22$).
 *    시험의 「여섯 갈래 발문이 갈린다」는 글자가 달라 통과하는데, **지면에서는 한 문항**이다.
 *    넷을 실물로 뽑아 나란히 놓고서야 보였다 — 그래서 상은 **배수 쪽**에서 연다.
 *    심화하 ㉯ 는 「약수 → 어떤 수 → 배수 개수」로 **앞으로** 가고, 이 상은 그 길을
 *    **거꾸로** 간다(개수 → 어떤 수 후보 → 약수의 합).
 */

type W3CntTask = {
  N: number;
  c: number;
  sum: number;
  ans: number;
  cands: number[];
};

function w3Cnt121(): W3CntTask[] {
  const out: W3CntTask[] = [];
  for (let N = 30; N <= 90; N += 1) {
    for (let c = 2; c <= 5; c += 1) {
      const cands: number[] = [];
      for (let v = 2; v <= N; v += 1)
        if (Math.floor((N - 1) / v) === c) cands.push(v);
      // 마디가 열려야 하고(후보 둘 이상), 해설이 늘어놓을 만해야 한다.
      if (cands.length < 2 || cands.length > 5) continue;
      for (const v of cands) {
        const s = w3DivSum(v);
        // 약수의 합이 갈라야 «만들어 견주기»가 답을 하나로 만든다
        if (cands.some((o) => o !== v && w3DivSum(o) === s)) continue;
        out.push({ N, c, sum: s, ans: v, cands });
      }
    }
  }
  return out;
}

function fac121Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W3CntTask) =>
    `어떤 수의 배수 중에서 ${n(t.N)}보다 작은 수가 모두 ${n(t.c)}개입니다. 어떤 수의 약수를 모두 더하면 ${n(t.sum)}일 때, 어떤 수를 구하시오.`;
  const pool = w2Pool("w3-121top", () =>
    w3Cnt121().filter((t) => !w3Bad(content(t), w2int(t.ans))),
  );
  const t = w2Pick(unit, "심화상", rng, pool);
  const 걸음 = [
    `${n(t.c)}번째 배수는 ${n(t.N)}보다 작고 ${n(t.c + 1)}번째 배수는 ${n(t.N)}보다 크거나 같아야 합니다. 그런 수는 ${nums(t.cands)}입니다.`,
    ...t.cands.map(
      (v) =>
        `${n(v)}의 약수는 ${nums(divisors(v))}이고 모두 더하면 ${expr(`${divisors(v).join("+")}=${w3DivSum(v)}`)}입니다.`,
    ),
    `합이 ${n(t.sum)}인 것은 ${n(t.ans)}뿐이므로 어떤 수는 ${n(t.ans)}입니다.`,
  ];
  return makeDeep(unit, content(t), n(t.ans), 걸음);
}

/* ── 1-2-4 심화중 — 「두 몫이 무엇인지 안 말한다 / «두 몫은 서로소»가 굳힌다」 ── */

/** 합이 `T` 이면서 서로소이고 **둘 다 `1` 보다 큰** 짝. */
function w3CoprimeSumPairs(T: number): [number, number][] {
  const out: [number, number][] = [];
  for (let p = 2; p * 2 < T; p += 1) {
    if (gcd(p, T - p) === 1) out.push([p, T - p]);
  }
  return out;
}

type W3GcdSumTask = { g: number; S: number; T: number; p: number; q: number };

function w3GcdSum124(): W3GcdSumTask[] {
  const out: W3GcdSumTask[] = [];
  for (let g = 3; g <= 12; g += 1) {
    for (let T = 5; T <= 14; T += 1) {
      const pairs = w3CoprimeSumPairs(T);
      if (pairs.length !== 1) continue; // 성질이 **한 번에** 하나를 남겨야 «중»이다
      const [p, q] = pairs[0]!;
      if (g * q > 99) continue; // 규모를 키우는 것은 축이 아니다
      out.push({ g, S: g * T, T, p, q });
    }
  }
  return out;
}

function gcd124Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W3GcdSumTask) =>
    `어떤 두 수의 최대공약수가 ${n(t.g)}이고 두 수의 합이 ${n(t.S)}입니다. 두 수 중 어느 수도 다른 수의 약수가 아닐 때, 더 큰 수를 구하시오.`;
  const pool = w2Pool("w3-124mid", () =>
    w3GcdSum124().filter((t) => !w3Bad(content(t), w2int(t.g * t.q))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  return makeDeep(unit, content(t), n(t.g * t.q), [
    `두 수를 최대공약수로 나눈 두 몫의 합은 ${expr(`${t.S}\\div${t.g}=${t.T}`)}입니다.`,
    `두 몫을 모두 나누어떨어지게 하는 수는 ${n(1)}뿐이고, 어느 수도 다른 수의 약수가 아니므로 두 몫은 둘 다 ${n(1)}보다 큽니다. 합이 ${n(t.T)}이면서 그런 두 수는 ${nj(t.p, "과", "와")} ${n(t.q)}뿐입니다.`,
    `두 수는 ${expr(`${t.g}\\times${t.p}=${t.g * t.p}`)}, ${expr(`${t.g}\\times${t.q}=${t.g * t.q}`)}입니다. 더 큰 수는 ${n(t.g * t.q)}입니다.`,
  ]);
}

/* ── 1-2-4 심화상 — 「공약수마다 잘리는 장수를 실제로 세어 견준다」 ── */

type W3CutTask = {
  a: number;
  b: number;
  d: number;
  count: number;
  tried: number[];
};

function w3Cut124(): W3CutTask[] {
  const out: W3CutTask[] = [];
  for (const [a, b] of GCD_PAIRS) {
    const g = gcd(a, b);
    // 한 변이 길수록 장수가 적어진다 — 큰 공약수부터 차례로 대 본다(해설이 그 길을 밟는다).
    const desc = divisors(g).slice().reverse();
    for (let i = 1; i < desc.length; i += 1) {
      const d = desc[i]!;
      // `d = 최대공약수` 는 **기본**(가장 큰 정사각형)과 같은 문항이라 뺀다.
      if (d < 2) continue;
      const tried = desc.slice(0, i + 1);
      if (tried.length > 4) continue; // 해설이 늘어놓을 수 있는 만큼만
      out.push({ a, b, d, count: (a / d) * (b / d), tried });
    }
  }
  return out;
}

function gcd124Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W3CutTask) =>
    `가로가 ${n(t.a)} cm, 세로가 ${n(t.b)} cm인 직사각형 모양 색도화지를 남는 부분 없이 크기가 같은 정사각형으로 잘랐더니 정사각형이 모두 ${n(t.count)}장이 되었습니다. 정사각형 한 변의 길이는 몇 cm입니까?`;
  const pool = w2Pool("w3-124top", () =>
    w3Cut124().filter((t) => !w3Bad(content(t), w2int(t.d))),
  );
  const t = w2Pick(unit, "심화상", rng, pool);
  const 걸음 = [
    `정사각형의 한 변은 가로와 세로를 모두 나누어떨어지게 해야 하므로 두 수의 공약수입니다. 공약수는 ${nums(divisors(gcd(t.a, t.b)))}입니다. 한 변이 길수록 장수가 적어지므로 큰 공약수부터 차례로 대 봅니다.`,
    ...t.tried.map(
      (d) =>
        `한 변이 ${n(d)} cm이면 가로로 ${n(t.a / d)}장, 세로로 ${n(t.b / d)}장이므로 ${expr(`${t.a / d}\\times${t.b / d}=${(t.a / d) * (t.b / d)}`)}장입니다.`,
    ),
    `${n(t.count)}장이 되는 것은 한 변이 ${n(t.d)} cm일 때뿐입니다.`,
  ];
  return makeDeep(unit, content(t), n(t.d), 걸음);
}

/* ── 1-2-6 심화중 — 「두 수가 무엇인지 안 말한다 / «두 수는 최소공배수의 약수»가 굳힌다」 ── */

type W3LcmSumTask = { M: number; S: number; p: number; q: number };

function w3LcmSum126(): W3LcmSumTask[] {
  const out: W3LcmSumTask[] = [];
  // 이 대단원의 규모는 «최소공배수 ≤ 72» 로 묶여 있다(1-2 머리말) — 키우는 것은 축이 아니다.
  for (let M = 12; M <= 72; M += 1) {
    const ds = divisors(M);
    if (ds.length > 8) continue; // 해설이 약수를 늘어놓을 수 있는 만큼만
    for (let S = 6; S <= M; S += 1) {
      const pairs: [number, number][] = [];
      for (const p of ds) {
        const q = S - p;
        if (q <= p) continue;
        if (M % q !== 0) continue;
        pairs.push([p, q]);
      }
      // 성질(두 수는 최소공배수의 약수)이 **한 번에** 하나를 남겨야 «중»이다
      if (pairs.length !== 1) continue;
      const [p, q] = pairs[0]!;
      if (lcm(p, q) !== M) continue;
      // 🔴 해설이 「두 수를 모두 나누어떨어지게 하는 수가 $1$뿐이므로 최소공배수는
      //    $p\times q$」라고 **적는다.** 그 문장이 참이려면 두 수가 서로소여야 한다 —
      //    `lcm(p,q) === M` 만으로는 `8`·`28`(최소공배수 $56$, 곱 $224$)이 새어
      //    지면에 `$8\times28=56$` 이 찍혔다. `probe-elem-equations` 가 잡았다.
      //    **값이 맞아도 지면이 틀릴 수 있다** — 값 검산만으로는 이 부류를 못 본다.
      if (gcd(p, q) !== 1) continue;
      // 🔴 「작은 수가 `1` 이면 큰 수가 곧 최소공배수라 마디가 없다」는 가드를 **안 둔다.**
      //    두면 죽은 줄이다 — 변이 하네스가 「산출물이 그대로다」로 두 번 알려 줬고
      //    재 보니 참이다: 그런 판은 합이 `M + 1` 이라 위 범위(`S <= M`)에 애초에 안 들어오고,
      //    범위를 한 칸 넓혀 넣어 봐도 **답이 `M` 이라 지면에 그대로 있어서** `w2Bad` 가
      //    전량을 걸러 낸다(실측 69 → 69, 한 건도 안 늘었다).
      //    죽은 줄을 남기면 다음 사람이 「여기가 마디를 지킨다」고 읽는다 — 실제로 지키는 것은
      //    저 두 가지이고, **시험이 산출물에서 `작은 수 > 1` 을 다시 센다**(elemTiersG5W3 ⑴).
      out.push({ M, S, p, q });
    }
  }
  return out;
}

function lcm126Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W3LcmSumTask) =>
    `어떤 두 수의 최소공배수가 ${n(t.M)}이고 두 수의 합이 ${n(t.S)}입니다. 두 수 중 더 큰 수를 구하시오.`;
  const pool = w2Pool("w3-126mid", () =>
    w3LcmSum126().filter((t) => !w3Bad(content(t), w2int(t.q))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  return makeDeep(unit, content(t), n(t.q), [
    `공배수는 최소공배수의 배수이므로 두 수는 모두 ${n(t.M)}의 약수입니다. ${n(t.M)}의 약수는 ${nums(divisors(t.M))}입니다.`,
    `이 중 합이 ${n(t.S)}인 두 수는 ${nj(t.p, "과", "와")} ${n(t.q)}뿐입니다. ${expr(`${t.p}+${t.q}=${t.S}`)}입니다.`,
    `${nj(t.p, "과", "와")} ${nj(t.q, "을", "를")} 모두 나누어떨어지게 하는 수는 ${n(1)}뿐이므로 최소공배수는 ${expr(`${t.p}\\times${t.q}=${t.M}`)}입니다. 더 큰 수는 ${n(t.q)}입니다.`,
  ]);
}

/* ── 1-2-6 심화상 — 「몇 번째 공배수인지 안 말한다 — 후보를 차례로 대 봐야 갈린다」 ── */

type W3RemTask = {
  a: number;
  b: number;
  r: number;
  c: number;
  k: number;
  m: number;
};

function w3Rem126(): W3RemTask[] {
  const out: W3RemTask[] = [];
  for (const [a, b] of LCM_PAIRS) {
    const m = lcm(a, b);
    for (let r = 1; r < Math.min(a, b); r += 1) {
      for (let c = 3; c <= 9; c += 1) {
        let k = 0;
        for (let i = 1; i <= 8; i += 1) {
          if ((i * m + r) % c === 0) {
            k = i;
            break;
          }
        }
        // `k = 1` 이면 심화하 ㉮ 와 같은 답이고, `k` 가 없으면 문항이 안 선다.
        // ⚠️ **이 줄이 실제로 깎는 것은 `k = 1` 뿐이다** — `k = 2` 인 자리는 `w2Bad` 가
        //    이미 전량을 걸러 낸다(실측: 거른 뒤 `k>=1` 41건 · `k>=2` 36건 · `k>=3` 36건,
        //    곧 `k = 2` 는 **0건**이다). 그러니 「$3$ 이상」이라는 숫자를 근거로 읽지 마라.
        if (k < 3 || k > 6) continue;
        if (k * m + r > 300) continue;
        out.push({ a, b, r, c, k, m });
      }
    }
  }
  return out;
}

function lcm126Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W3RemTask) =>
    `어떤 수를 ${nro(t.a)} 나누어도 ${nro(t.b)} 나누어도 나머지가 ${n(t.r)}입니다. 어떤 수가 ${n(t.c)}의 배수일 때, 어떤 수 중에서 가장 작은 수를 구하시오. 단, 어떤 수는 나누는 두 수보다 큽니다.`;
  const pool = w2Pool("w3-126top", () =>
    w3Rem126().filter((t) => !w3Bad(content(t), w2int(t.k * t.m + t.r))),
  );
  const t = w2Pick(unit, "심화상", rng, pool);
  const 걸음: string[] = [
    `나머지 ${nj(t.r, "을", "를")} 빼면 ${nj(t.a, "과", "와")} ${nro(t.b)} 모두 나누어떨어지므로 그 수는 두 수의 공배수입니다. 공배수는 최소공배수 ${n(t.m)}의 배수이므로 어떤 수는 ${n(t.m)}씩 커집니다.`,
  ];
  for (let i = 1; i <= t.k; i += 1) {
    const v = i * t.m + t.r;
    걸음.push(
      v % t.c === 0
        ? `${expr(`${i * t.m}+${t.r}=${v}`)}이고, ${nj(v, "은", "는")} ${nro(t.c)} 나누어떨어집니다.`
        : `${expr(`${i * t.m}+${t.r}=${v}`)}이고, ${nj(v, "은", "는")} ${nro(t.c)} 나누면 ${nj(v % t.c, "이", "가")} 남습니다.`,
    );
  }
  걸음.push(`그러므로 가장 작은 수는 ${n(t.k * t.m + t.r)}입니다.`);
  return makeDeep(unit, content(t), n(t.k * t.m + t.r), 걸음);
}

/* ── 2-1-1 심화중 — 「끝이 어디인지 안 말한다 / «이하는 끝을 포함한다»가 굳힌다」 ── */

type W3RangeTask = {
  a: number;
  k: number;
  c: number;
  first: number;
  target: number;
};

function w3Range211(): W3RangeTask[] {
  const out: W3RangeTask[] = [];
  for (let a = 12; a <= 40; a += 1) {
    for (let k = 3; k <= 8; k += 1) {
      const first = Math.ceil(a / k) * k;
      for (let c = 3; c <= 6; c += 1) {
        const target = first + (c - 1) * k;
        if (target > 99) continue;
        out.push({ a, k, c, first, target });
      }
    }
  }
  return out;
}

function rng211Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W3RangeTask) =>
    `${n(t.a)} 이상 □ 이하인 자연수 중에서 ${n(t.k)}의 배수는 모두 ${n(t.c)}개입니다. □가 ${n(t.k)}의 배수일 때 □에 알맞은 수를 구하시오.`;
  const pool = w2Pool("w3-211mid", () =>
    w3Range211().filter((t) => !w3Bad(content(t), w2int(t.target))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  return makeDeep(unit, content(t), n(t.target), [
    `${n(t.a)} 이상인 ${n(t.k)}의 배수 중에서 가장 작은 수는 ${expr(`${t.k}\\times${t.first / t.k}=${t.first}`)}입니다.`,
    `${n(t.k)}의 배수가 ${n(t.c)}개 들어가려면 ${n(t.c)}번째인 ${expr(`${t.k}\\times${t.target / t.k}=${t.target}`)}까지 들어가야 합니다. «이하»는 □ 자신을 포함하므로 □가 ${n(t.target)}이면 ${n(t.target)}도 셈에 들어갑니다.`,
    `□가 ${n(t.target)}부터 ${n(t.target + t.k - 1)}까지 어느 수여도 ${n(t.k)}의 배수는 ${n(t.c)}개입니다. 그중 ${n(t.k)}의 배수는 ${n(t.target)}뿐이므로 □는 ${n(t.target)}입니다.`,
  ]);
}

/* ── 2-1-4 심화중 — 「어느 자리까지 올림했는지 안 말한다 / 자릿값 성질이 굳힌다」 ── */

type W3UpTask = { A: number };

function w3Up214(): W3UpTask[] {
  const out: W3UpTask[] = [];
  // 십의 자리 아래만 `0` 인 수 — 백·천의 자리까지 올림한 결과일 수 **없다**.
  for (let A = 1210; A <= 9990; A += 10) {
    if (A % 100 === 0) continue;
    out.push({ A });
  }
  return out;
}

function up214Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W3UpTask) =>
    `어떤 자연수를 올림하여 어느 자리까지 나타냈더니 ${n(t.A)}이 되었습니다. 어느 자리까지 올림했는지는 말해 주지 않았습니다. 어떤 수가 될 수 있는 수 중에서 가장 작은 수를 구하시오.`;
  const pool = w2Pool("w3-214mid", () =>
    w3Up214().filter((t) => !w3Bad(content(t), w2int(t.A - 9))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  const tens = Math.floor((t.A % 100) / 10);
  return makeDeep(unit, content(t), n(t.A - 9), [
    `어느 자리까지 올림하면 그 자리 아래는 모두 ${n(0)}이 됩니다. ${n(t.A)}은 십의 자리 숫자가 ${n(tens)}이므로 백의 자리나 천의 자리까지 올림한 것이 아닙니다. 곧 십의 자리까지 올림한 것입니다.`,
    `십의 자리까지 올림하여 ${nj(t.A, "이", "가")} 되는 수는 ${expr(`${t.A}-9=${t.A - 9}`)}부터 ${n(t.A)}까지입니다.`,
    `${expr(`${t.A}-10=${t.A - 10}`)}을 올림하면 ${nj(t.A - 10, "이", "가")} 되어 ${nj(t.A, "이", "가")} 아니므로, 가장 작은 수는 ${n(t.A - 9)}입니다.`,
  ]);
}

/* ── 2-1-4 심화상 — 「자리 후보 셋마다 범위를 실제로 만들어 개수를 세어 견준다」 ── */

type W3UpCountTask = { A: number; c: number };

function w3UpCount214(): W3UpCountTask[] {
  const out: W3UpCountTask[] = [];
  // 천의 자리 아래가 모두 `0` — 십·백·천 **셋 다** 후보다.
  for (let A = 2000; A <= 9000; A += 1000) {
    for (const c of [100, 1000]) out.push({ A, c });
  }
  return out;
}

function up214Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W3UpCountTask) =>
    `어떤 자연수를 올림하여 어느 자리까지 나타냈더니 ${n(t.A)}이 되었습니다. 어떤 수가 될 수 있는 자연수가 모두 ${n(t.c)}개일 때, 그중 가장 작은 수를 구하시오.`;
  const pool = w2Pool("w3-214top", () =>
    w3UpCount214().filter((t) => !w3Bad(content(t), w2int(t.A - t.c + 1))),
  );
  const t = w2Pick(unit, "심화상", rng, pool);
  const 자리 = t.c === 100 ? "백" : "천";
  return makeDeep(unit, content(t), n(t.A - t.c + 1), [
    `${nj(t.A, "은", "는")} 백의 자리·십의 자리·일의 자리가 모두 ${n(0)}이므로 십·백·천 중 어느 자리까지 올림한 것인지 알 수 없습니다. 자리마다 어떤 수의 범위를 만들어 봅니다.`,
    `십의 자리까지라면 ${expr(`${t.A}-9=${t.A - 9}`)}부터 ${n(t.A)}까지로 ${n(10)}개, 백의 자리까지라면 ${expr(`${t.A}-99=${t.A - 99}`)}부터 ${n(t.A)}까지로 ${n(100)}개, 천의 자리까지라면 ${expr(`${t.A}-999=${t.A - 999}`)}부터 ${n(t.A)}까지로 ${n(1000)}개입니다.`,
    `${n(t.c)}개인 것은 ${자리}의 자리까지 올림한 때이므로 가장 작은 수는 ${n(t.A - t.c + 1)}입니다.`,
  ]);
}

/* ── 2-1-6 심화중 — 「어떤 어림인지 안 말한다 / 끝 규칙이 «계산 없이» 둘을 지운다」 ── */

type W3RoundTask = { A: number; v: number; up: boolean };

function w3Round216(): W3RoundTask[] {
  const out: W3RoundTask[] = [];
  for (let A = 120; A <= 990; A += 10) {
    // 버림만 담는 자리 — 반올림 범위(`A+4` 까지)를 넘고 올림 범위(`A` 까지)도 넘는다.
    for (let v = A + 5; v <= A + 9; v += 1) out.push({ A, v, up: false });
    // 올림만 담는 자리 — 반올림 범위(`A-5` 부터)보다 작다.
    for (let v = A - 9; v <= A - 6; v += 1) out.push({ A, v, up: true });
  }
  return out;
}

function round216Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W3RoundTask) =>
    `어떤 자연수를 어림하여 십의 자리까지 나타냈더니 ${n(t.A)}이 되었습니다. 올림·버림·반올림 중 어느 것으로 어림했는지는 말해 주지 않았고, ${nj(t.v, "은", "는")} 어떤 수가 될 수 있습니다. 어떤 수가 될 수 있는 수 중에서 ${t.up ? "가장 작은" : "가장 큰"} 수를 구하시오.`;
  const answer = (t: W3RoundTask) => (t.up ? t.A - 9 : t.A + 9);
  const pool = w2Pool("w3-216mid", () =>
    w3Round216().filter((t) => !w3Bad(content(t), w2int(answer(t)))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  const 걸음 = t.up
    ? [
        `${nj(t.v, "은", "는")} ${n(t.A)}보다 작으므로 버림하여 ${nj(t.A, "이", "가")} 되는 수가 아닙니다. 버림하면 어림한 값이 원래 수보다 크지 않기 때문입니다.`,
        `반올림하여 ${nj(t.A, "이", "가")} 되는 수는 ${expr(`${t.A}-5=${t.A - 5}`)}부터이므로 ${nj(t.v, "은", "는")} 반올림한 것도 아닙니다. 곧 올림한 것입니다.`,
        `올림하여 ${nj(t.A, "이", "가")} 되는 수는 ${expr(`${t.A}-9=${t.A - 9}`)}부터 ${n(t.A)}까지이므로 가장 작은 수는 ${n(t.A - 9)}입니다.`,
      ]
    : [
        `${nj(t.v, "은", "는")} ${n(t.A)}보다 크므로 올림하여 ${nj(t.A, "이", "가")} 되는 수가 아닙니다. 올림하면 어림한 값이 원래 수보다 작지 않기 때문입니다.`,
        `반올림하여 ${nj(t.A, "이", "가")} 되는 수는 ${expr(`${t.A}+4=${t.A + 4}`)}까지이므로 ${nj(t.v, "은", "는")} 반올림한 것도 아닙니다. 곧 버림한 것입니다.`,
        `버림하여 ${nj(t.A, "이", "가")} 되는 수는 ${n(t.A)}부터 ${expr(`${t.A}+9=${t.A + 9}`)}까지이므로 가장 큰 수는 ${n(t.A + 9)}입니다.`,
      ];
  return makeDeep(unit, content(t), n(answer(t)), 걸음);
}

/* ── 2-1-6 심화상 — 「세 어림의 범위를 다 만들어 끝값으로 견준다」 ── */

type W3RoundTopTask = { A: number; up: boolean };

function w3RoundTop216(): W3RoundTopTask[] {
  const out: W3RoundTopTask[] = [];
  for (let A = 1200; A <= 9900; A += 100) {
    out.push({ A, up: true }); // 가장 큰 수가 `A` → 올림
    out.push({ A, up: false }); // 가장 큰 수가 `A+49` → 반올림
  }
  return out;
}

function round216Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const high = (t: W3RoundTopTask) => (t.up ? t.A : t.A + 49);
  const answer = (t: W3RoundTopTask) => (t.up ? t.A - 99 : t.A - 50);
  const content = (t: W3RoundTopTask) =>
    `어떤 자연수를 어림하여 백의 자리까지 나타냈더니 ${n(t.A)}이 되었습니다. 올림·버림·반올림 중 어느 것으로 어림했는지는 말해 주지 않았습니다. 어떤 수가 될 수 있는 수 중에서 가장 큰 수가 ${n(high(t))}일 때, 가장 작은 수를 구하시오.`;
  const pool = w2Pool("w3-216top", () =>
    w3RoundTop216().filter((t) => !w3Bad(content(t), w2int(answer(t)))),
  );
  const t = w2Pick(unit, "심화상", rng, pool);
  return makeDeep(unit, content(t), n(answer(t)), [
    `어림한 방법마다 어떤 수의 범위를 실제로 만들어 봅니다.`,
    `올림하여 ${nj(t.A, "이", "가")} 되는 수는 ${expr(`${t.A}-99=${t.A - 99}`)}부터 ${n(t.A)}까지, 버림하여 ${nj(t.A, "이", "가")} 되는 수는 ${n(t.A)}부터 ${expr(`${t.A}+99=${t.A + 99}`)}까지, 반올림하여 ${nj(t.A, "이", "가")} 되는 수는 ${expr(`${t.A}-50=${t.A - 50}`)}부터 ${expr(`${t.A}+49=${t.A + 49}`)}까지입니다.`,
    `가장 큰 수가 ${n(high(t))}인 것은 ${t.up ? "올림" : "반올림"}한 때뿐이므로 가장 작은 수는 ${n(answer(t))}입니다.`,
  ]);
}

/* ── 2-3-4 심화중 — 「두 변이 마주 보는 짝인지 안 말한다 / «마주 보는 변은 같다»가 굳힌다」 ── */

type W3PointTask = { P: number; x: number; y: number; z: number };

function w3Point234(): W3PointTask[] {
  const out: W3PointTask[] = [];
  for (let x = 4; x <= 20; x += 1) {
    for (let y = x + 1; y <= 20; y += 1) {
      for (let z = 4; z <= 20; z += 1) {
        // 세 길이가 모두 달라야 «가장 긴 변»과 «가장 짧은 변»이 하나로 정해진다.
        if (z === x || z === y) continue;
        // 🔴 되짚어 얻은 `z` 가 `x`·`y` **사이**면 답이 `y-x` 라 되짚기가 장식이 된다
        //    (반증 ⑤ 와 같은 자리 — 그 마디를 지워도 답이 그대로다).
        //    `z` 가 가장 길거나 가장 짧아야 그 마디가 답을 정한다.
        if (z > x && z < y) continue;
        // 육각형이 지면에서 그럴듯하려면 세 변의 길이가 지나치게 벌어지면 안 된다.
        const lo = Math.min(x, y, z);
        const hi = Math.max(x, y, z);
        if (hi > lo * 3) continue;
        out.push({ P: (x + y + z) * 2, x, y, z });
      }
    }
  }
  return out;
}

function sym234Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W3PointTask) =>
    `둘레가 ${n(t.P)} cm인 점대칭 육각형이 있습니다. 마주 보는 변끼리 길이가 같고, 이 육각형의 변 중에 길이가 ${n(t.x)} cm인 것과 ${n(t.y)} cm인 것이 있습니다. 이 육각형에서 가장 긴 변과 가장 짧은 변의 길이의 차는 몇 cm입니까?`;
  const gap = (t: W3PointTask) =>
    Math.max(t.x, t.y, t.z) - Math.min(t.x, t.y, t.z);
  const pool = w2Pool("w3-234mid", () =>
    w3Point234().filter((t) => !w3Bad(content(t), w2int(gap(t)))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  const hi = Math.max(t.x, t.y, t.z);
  const lo = Math.min(t.x, t.y, t.z);
  return makeDeep(unit, content(t), n(gap(t)), [
    `마주 보는 변끼리 길이가 같으므로, 길이가 서로 다른 ${n(t.x)} cm인 변과 ${n(t.y)} cm인 변은 마주 볼 수 없습니다. 곧 두 변은 이웃한 세 변 중 둘입니다.`,
    `마주 보는 변끼리 같으므로 이웃한 세 변의 합은 둘레의 절반인 ${expr(`${t.P}\\div2=${t.P / 2}`)} cm입니다.`,
    `나머지 한 변은 ${expr(`${t.P / 2}-${t.x}-${t.y}=${t.z}`)} cm입니다.`,
    `여섯 변의 길이는 ${n(t.x)} cm, ${n(t.y)} cm, ${n(t.z)} cm 세 가지뿐이므로 차는 ${expr(`${hi}-${lo}=${gap(t)}`)}, 곧 ${n(gap(t))} cm입니다.`,
  ]);
}

/* ══════════════════════════════════════════════════════════════════════════
 * 확대 갈래 «심화중»·«심화상» — 물결 4: 1-1 · 1-3 · 1-4 · 2-2 · 2-5
 * (D-113 · D-115, 2026-09-01)
 *
 * 잣대는 D-115 ⑶·⑷·⑾ 그대로다(물결 2·3 머리말 참조). 이 회차가 **예약한 굳힘 축**은
 * 대단원마다 하나씩이고, 앞 회차가 쓴 축과 겹치지 않는다.
 *
 * ```
 * 1-1  자연수의 혼합 계산   «모든 중간값이 자연수 — 나눗셈이 나누어떨어진다»
 *                          마디를 여는 것: **식의 구조를 안 말한다**(괄호 자리 · 기호)
 * 1-3  대응 관계           «대응 관계는 표의 어느 칸에서나 같아야 한다»
 *                          마디를 여는 것: **어느 칸이 규칙에서 벗어났는지 안 말한다**
 * 1-4  약분과 통분         «크기가 같은 분수는 같은 수를 곱한 것» · «기약분수는 서로소»
 *                          · «공통분모는 두 분모의 공배수»
 * 2-2  분수의 곱셈         «진분수다» · «한 자리 자연수다» · «대분수의 자연수 부분»
 *                          🔴 **창(범위)은 안 쓴다** — 파일럿 2-4 심화상이 가져간 축이다
 *                          (토대 17 §2.1 ㉠: 동형이 넷이라고 짚은 자리)
 * 2-5  직육면체            «평행한 두 면은 합동» · «보이지 않는 모서리는 세 방향 하나씩»
 * ```
 *
 * 🔴 **비운 자리가 스물셋이다.** 까닭은 `tier-fill-g5-w4.md` §3 에 한 줄씩 적었다 —
 *    억지로 세우면 그것이 결함이다(D-115 ⑹).
 *
 * ⚠️ 반증 ⑥ 자(`forwardReachable`)는 이 다섯 대단원에서 **많이 못 본다** — 답이 분수인
 *    1-4·2-2 는 `readRat` 이 행을 통째로 건너뛰고(실측 2-2 는 128행 중 122행), 1-3 은
 *    표 값이 `figure` 에 있어 지면 수가 헤더뿐이다. 그래서 자를 **가드로는 쓰되**
 *    (`w3Bad`) 「안 닿는다」를 근거로 삼지 않는다.
 * ══════════════════════════════════════════════════════════════════════════ */

/* ────────── 1-1 자연수의 혼합 계산 — 확대 갈래 ──────────
 *
 * 🔴 **1-1-1 은 둘 다 비웠다.** 이 소단원은 한 층((+,−) 또는 (×,÷))에 **수가 셋**이고,
 *    그러면 「값이 달라지는 괄호 자리」가 **최대 하나**다(`a-b+c` 는 `a-(b+c)` 하나,
 *    `a+b-c` 는 아예 없다 — `a+(b-c)` 가 같은 값이다). 후보가 하나면 마디가 애초에
 *    안 열리므로 심화중의 정의가 성립하지 않는다. 수를 넷으로 늘리는 것은 구조가
 *    아니라 규모다(이 소단원의 갈래 넷이 모두 수 셋이다).
 *    `scripts/qa/census-g5w4-empty.ts` 가 이것을 **전수로** 센다.
 *
 * 🔴 **1-1-2 심화상도 비웠다.** 이 소단원은 곱셈(나눗셈)이 **하나**뿐이라 괄호 자리
 *    후보가 늘 둘인데, 그 둘의 대소가 **구조로 정해진다**:
 *    `a+b\times c-d` 는 늘 `(a+b)\times c-d > a+b\times c-d > a+b\times(c-d)` 이고
 *    `a+b\div c-d` 는 늘 `(a+b)\div c-d < a+b\div c-d < a+b\div(c-d)` 다.
 *    「후보를 실제로 다 계산해 견주어야 하나가 남는다」가 성립하지 않는다(계산 없이
 *    안다). 같은 자를 전수로 돌린 값이 §3 에 있다.
 */

/** 혼합 계산 한 줄 — 짝수 자리는 수, 홀수 자리는 기호. */
type W4Tok = number | "+" | "-" | "*" | "/";

/**
 * 초5 규칙으로 계산한다 — ×÷ 를 앞에서부터, 그다음 +− 를 앞에서부터.
 *
 * **중간값이 자연수가 아니면 `null`** 을 돌려준다(나누어떨어지지 않거나 음수가 된다).
 * 그 `null` 이 이 대단원의 굳힘 축 **그 자체**라, 갈래도 시험도 이 함수 하나를 본다 —
 * 규칙을 두 벌 두면 한쪽만 고쳐도 아무도 모른다.
 */
function w4Eval(toks: readonly W4Tok[]): number | null {
  const vals: number[] = [toks[0] as number];
  const ops: ("+" | "-")[] = [];
  for (let i = 1; i < toks.length; i += 2) {
    const op = toks[i] as string;
    const v = toks[i + 1] as number;
    if (op === "*" || op === "/") {
      const prev = vals[vals.length - 1]!;
      if (op === "*") vals[vals.length - 1] = prev * v;
      else {
        if (v === 0 || prev % v !== 0) return null;
        vals[vals.length - 1] = prev / v;
      }
    } else {
      ops.push(op as "+" | "-");
      vals.push(v);
    }
  }
  let acc = vals[0]!;
  // 🔴 `0` 도 막는다 — 초등에서 «자연수»는 $1$ 부터다. 이걸 안 막으면 `(9-9)` 를 묶어
  //    `4\times0=0` 이 되는 자리가 「모두 자연수」로 통과해 지면에 나간다(실측으로 났다).
  if (acc < 1) return null;
  for (let i = 0; i < ops.length; i += 1) {
    acc = ops[i] === "+" ? acc + vals[i + 1]! : acc - vals[i + 1]!;
    if (acc < 1) return null;
  }
  return acc;
}

/** 수 자리 `i`~`j` 를 괄호로 묶어 계산한다. 괄호 **안**이 자연수가 아니어도 `null`. */
function w4Grouped(
  toks: readonly W4Tok[],
  i: number,
  j: number,
): number | null {
  const inner = w4Eval(toks.slice(2 * i, 2 * j + 1));
  if (inner === null) return null;
  return w4Eval([...toks.slice(0, 2 * i), inner, ...toks.slice(2 * j + 1)]);
}

const W4_SYM: Record<string, string> = {
  "+": "+",
  "-": "-",
  "*": "\\times",
  "/": "\\div",
};

/** LaTeX 로. 수 자리 `i`~`j` 를 괄호로 묶는다(`i < 0` 이면 안 묶는다). */
function w4Latex(toks: readonly W4Tok[], i = -1, j = -1): string {
  let out = "";
  for (let k = 0; k < toks.length; k += 1) {
    if (k % 2 === 0) {
      const idx = k / 2;
      if (idx === i) out += "(";
      out += String(toks[k]);
      if (idx === j) out += ")";
    } else out += W4_SYM[toks[k] as string]!;
  }
  return out;
}

/* ── 1-1-2 심화중 — 「$\bigcirc$ 가 $\times$ 인지 $\div$ 인지 안 말한다」 ──
 *
 * 마디: `a-b\bigcirc c+d` 의 기호가 안 굳는다(후보 둘).
 * 굳힘: **모든 계산 결과가 자연수** — 한쪽은 나누어떨어지지 않거나 음수가 되어 죽는다.
 *       후보를 «끝까지 계산하지 않고» 걸러 낸다(D-115 ⑾ → 심화중).
 */

type W4SymTask = { a: number; b: number; c: number; d: number; op: "*" | "/" };

function w4Sym112(): W4SymTask[] {
  const out: W4SymTask[] = [];
  for (let b = 3; b <= 12; b += 1)
    for (let c = 2; c <= 9; c += 1)
      // 범위는 «변형이 여덟 이상»을 지키는 선까지만 — 넓히면 풀 만드는 시간이 는다.
      for (let a = 10; a <= 70; a += 1)
        for (let d = 2; d <= 15; d += 1) {
          const mul = w4Eval([a, "-", b, "*", c, "+", d]);
          const div = w4Eval([a, "-", b, "/", c, "+", d]);
          if (mul === null && div === null) continue;
          if (mul !== null && div !== null) continue; // 마디가 안 굳는다
          out.push({ a, b, c, d, op: mul === null ? "/" : "*" });
        }
  return out;
}

function mix112Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  // 🔴 **기호를 낱말로 적는다.** 이 소단원은 「×·÷ 가 정확히 하나」가 규약이라
  //    (`elemTiersG5.test.ts` 가 발문과 해설을 함께 본다) 두 기호를 다 찍으면
  //    1-1-3 침범으로 잡힌다. 그래서 발문은 낱말로, 해설은 **살아남은 기호만** 쓴다.
  const content = (t: W4SymTask) =>
    `$\\bigcirc$ 안에 곱셈 기호와 나눗셈 기호 중 알맞은 것을 써넣어 계산하려고 합니다. 계산하는 동안 나오는 값이 모두 자연수가 되도록 써넣었을 때, 계산한 값은 얼마입니까?  ${expr(`${t.a}-${t.b}\\bigcirc ${t.c}+${t.d}`)}`;
  const pool = w2Pool("w4-112mid", () =>
    w4Sym112().filter((t) => {
      const v = w4Eval([t.a, "-", t.b, t.op, t.c, "+", t.d]);
      return v !== null && v > 0 && !w3Bad(content(t), w2int(v));
    }),
  );
  // 🔴 **답이 되는 기호를 먼저 뽑는다.** 그냥 뽑으면 `\div` 가 죽는 짝(=답이 `\times`)이
  //    훨씬 많다 — 실측 200씨앗에서 171 : 29 였다. 한쪽으로 몰리면 「늘 곱셈」이
  //    답을 대신한다.
  const wantOp: "*" | "/" = altCase(rng) ? "*" : "/";
  const half = pool.filter((x) => x.op === wantOp);
  const t = w2Pick(unit, "심화중", rng, half.length > 0 ? half : pool);
  const kept = w4Eval([t.a, "-", t.b, t.op, t.c, "+", t.d])!;
  // 죽는 쪽은 **기호를 안 찍고 낱말로** 설명한다(위 주석).
  const deadWhy =
    t.op === "*"
      ? `나눗셈 기호를 써넣으면 ${nj(t.b, "을", "를")} ${nro(t.c)} 나누는 것인데 나누어떨어지지 않습니다.`
      : `곱셈 기호를 써넣으면 ${nj(t.b, "과", "와")} ${n(t.c)}의 곱이 ${nj(t.b * t.c, "이라", "라")} ${n(t.a)}에서 뺄 수 없습니다.`;
  const first =
    t.op === "*"
      ? expr(`${t.b}\\times${t.c}=${t.b * t.c}`)
      : expr(`${t.b}\\div${t.c}=${t.b / t.c}`);
  const inner = t.op === "*" ? t.b * t.c : t.b / t.c;
  const mid = t.a - inner;
  return makeDeep(unit, content(t), n(kept), [
    `곱셈과 나눗셈을 먼저 계산하므로 $\\bigcirc$ 안의 기호가 정해지면 그 자리를 먼저 계산합니다.`,
    deadWhy,
    `${t.op === "*" ? "곱셈" : "나눗셈"} 기호를 써넣으면 ${first}이고, ${expr(`${t.a}-${inner}=${mid}`)}, ${expr(`${mid}+${t.d}=${kept}`)}입니다.`,
  ]);
}

/* ── 1-1-3 심화중 — 「괄호가 어디에 있었는지 안 말한다」 ──
 *
 * 마디: `a\div b+c\times d-e` 에서 **이웃한 두 수**를 괄호로 묶는 자리가 넷인데
 *       그중 값이 달라지는 자리가 둘이다(나머지 둘은 ×÷ 를 묶는 것이라 그대로다).
 * 굳힘: **모든 계산 결과가 자연수** — 한 자리는 나누어떨어지지 않거나 음수가 되어 죽는다.
 */

type W4ParenTask = {
  toks: W4Tok[];
  base: number;
  spot: 1 | 3; // 1 = `(b+c)`, 3 = `(d-e)`
  value: number;
};

function w4Paren113(): W4ParenTask[] {
  const out: W4ParenTask[] = [];
  for (let b = 2; b <= 9; b += 1)
    for (let q = 2; q <= 12; q += 1) {
      const a = b * q;
      if (a > 96) continue;
      for (let c = 2; c <= 9; c += 1)
        for (let d = 3; d <= 11; d += 1)
          for (let e = 2; e <= 10; e += 1) {
            const toks: W4Tok[] = [a, "/", b, "+", c, "*", d, "-", e];
            const base = w4Eval(toks);
            if (base === null || base === 0) continue;
            const g1 = w4Grouped(toks, 1, 2); // a÷(b+c)×d−e
            const g3 = w4Grouped(toks, 3, 4); // a÷b+c×(d−e)
            const alive: (1 | 3)[] = [];
            if (g1 !== null && g1 !== base) alive.push(1);
            if (g3 !== null && g3 !== base) alive.push(3);
            if (alive.length !== 1) continue;
            // 죽은 쪽이 «수가 모자라서»가 아니라 **나누어떨어지지 않아서** 죽어야
            // 학생이 실제로 나눗셈을 확인한다. `(d-e)` 쪽은 뺄셈이라 예외로 둔다.
            const spot = alive[0]!;
            const value = spot === 1 ? g1! : g3!;
            if (value <= 0) continue;
            out.push({ toks, base, spot, value });
          }
    }
  return out;
}

function mix113Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  // 🔴 묶는 자리를 «덧셈이나 뺄셈으로 이어진» 것으로 **발문이 좁힌다**. 안 좁히면
  //    `(a\div b)`·`(c\times d)` 를 묶는 두 자리가 «값이 그대로»라 「자연수인가」로는
  //    안 갈리고, 그걸 빼려면 처음 값을 지면에 적어야 한다(수가 하나 더 늘어난다).
  const content = (t: W4ParenTask) =>
    `괄호가 하나 있는 식에서 괄호가 지워져 ${lj(w4Latex(t.toks), "이", "가")} 되었습니다. 괄호는 덧셈이나 뺄셈으로 이어진 이웃한 두 수를 묶고 있었고, 괄호 안을 먼저 계산해도 계산하는 동안 나오는 값이 모두 자연수였습니다. 처음 식을 바르게 계산한 값은 얼마입니까?`;
  const pool = w2Pool("w4-113mid", () =>
    w4Paren113().filter((t) => !w3Bad(content(t), w2int(t.value))),
  );
  // 🔴 **살아남는 자리를 먼저 뽑는다.** 그냥 풀에서 뽑으면 `(b+c)` 가 사는 것은
  //    `b+c` 가 `a` 를 나누어야 해서 드물다 — 실측 200씨앗에서 20 : 180 이었다.
  //    한쪽으로 몰리면 「늘 뒤쪽을 묶으면 된다」가 답을 대신한다.
  const wantSpot = altCase(rng) ? 1 : 3;
  const half = pool.filter((t) => t.spot === wantSpot);
  const t = w2Pick(unit, "심화중", rng, half.length > 0 ? half : pool);
  const [a, , b, , c, , d, , e] = t.toks as [
    number,
    string,
    number,
    string,
    number,
    string,
    number,
    string,
    number,
  ];
  const g1 = w4Grouped(t.toks, 1, 2);
  const g3 = w4Grouped(t.toks, 3, 4);
  const why1 =
    g1 === null
      ? a % (b + c) !== 0
        ? `${expr(`${b}+${c}=${b + c}`)}인데 ${lj(`${a}\\div${b + c}`, "은", "는")} 나누어떨어지지 않습니다.`
        : `${expr(`${a}\\div${b + c}\\times${d}=${(a / (b + c)) * d}`)}인데 여기서 ${nro(e)} 빼면 자연수가 되지 않습니다.`
      : `${expr(`${b}+${c}=${b + c}`)}이고 ${expr(`${a}\\div${b + c}=${a / (b + c)}`)}, ${expr(`${a / (b + c)}\\times${d}=${(a / (b + c)) * d}`)}이므로 ${expr(`${(a / (b + c)) * d}-${e}=${g1}`)}입니다.`;
  const why3 =
    g3 === null
      ? `${lj(`${d}-${e}`, "은", "는")} 자연수가 되지 않습니다.`
      : `${expr(`${d}-${e}=${d - e}`)}이고 ${expr(`${c}\\times${d - e}=${c * (d - e)}`)}, ${expr(`${a}\\div${b}=${a / b}`)}이므로 ${expr(`${a / b}+${c * (d - e)}=${g3}`)}입니다.`;
  return makeDeep(unit, content(t), n(t.value), [
    `덧셈이나 뺄셈으로 이어진 이웃한 두 수는 ${lj(`${b}+${c}`, "과", "와")} ${expr(`${d}-${e}`)} 두 자리입니다.`,
    `${lj(`(${b}+${c})`, "을", "를")} 묶으면 ${why1}`,
    `${lj(`(${d}-${e})`, "을", "를")} 묶으면 ${why3}`,
    `계산하는 동안 나오는 값이 모두 자연수인 자리는 한 곳뿐이므로 처음 식의 값은 ${n(t.value)}입니다.`,
  ]);
}

/* ── 1-1-3 심화상 — 「$\times$ 와 $\div$ 를 하나씩, 어느 자리인지 안 말한다」 ──
 *
 * 마디: `a\bigcirc b+c\bigcirc d-e` 의 배치가 안 굳는다(후보 둘).
 * 🔴 **성질로 안 갈린다** — 두 배치가 **모두** 자연수다. 그래서 둘을 실제로 계산해
 *    견주어야 하나가 남는다(D-115 ⑾ → 심화상). 그리고 어느 쪽이 큰지는 구조로 안
 *    정해진다(`a\times b` 와 `c\times d` 중 어느 것이 큰가에 달렸다).
 */

type W4TopTask = { a: number; b: number; c: number; d: number; e: number };

const w4TopPair = (t: W4TopTask): [number, number] => [
  w4Eval([t.a, "*", t.b, "+", t.c, "/", t.d, "-", t.e])!,
  w4Eval([t.a, "/", t.b, "+", t.c, "*", t.d, "-", t.e])!,
];

function w4Top113(): W4TopTask[] {
  const out: W4TopTask[] = [];
  for (let b = 2; b <= 9; b += 1)
    for (let d = 2; d <= 9; d += 1)
      for (let ka = 2; ka <= 12; ka += 1)
        for (let kc = 2; kc <= 12; kc += 1) {
          const a = b * ka;
          const c = d * kc;
          if (a > 60 || c > 60) continue;
          for (let e = 2; e <= 20; e += 1) {
            const x = w4Eval([a, "*", b, "+", c, "/", d, "-", e]);
            const y = w4Eval([a, "/", b, "+", c, "*", d, "-", e]);
            if (x === null || y === null) continue;
            if (x === y) continue; // 견줄 것이 없으면 마디가 뜻이 없다
            // 🔴 **규모는 축이 아니다**(D-115 기각된 축). 이 소단원의 다른 갈래는
            //    답이 두 자리 언저리다 — 곱을 키워 어렵게 만들지 않는다.
            if (Math.max(x, y) > 150) continue;
            out.push({ a, b, c, d, e });
          }
        }
  return out;
}

function mix113Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W4TopTask) =>
    `두 $\\bigcirc$ 안에 $\\times$와 $\\div$를 하나씩 써넣으려고 합니다. 어느 쪽에 써넣어도 계산하는 동안 나오는 값이 모두 자연수일 때, 계산한 두 값 중 더 큰 값은 얼마입니까?  ${expr(`${t.a}\\bigcirc ${t.b}+${t.c}\\bigcirc ${t.d}-${t.e}`)}`;
  const pool = w2Pool("w4-113top", () =>
    w4Top113().filter((t) => {
      const [x, y] = w4TopPair(t);
      return !w3Bad(content(t), w2int(Math.max(x, y)));
    }),
  );
  const t = w2Pick(unit, "심화상", rng, pool);
  const [x, y] = w4TopPair(t);
  return makeDeep(unit, content(t), n(Math.max(x, y)), [
    `앞을 $\\times$, 뒤를 $\\div$로 하면 ${expr(`${t.a}\\times${t.b}=${t.a * t.b}`)}, ${expr(`${t.c}\\div${t.d}=${t.c / t.d}`)}이므로 ${expr(`${t.a * t.b}+${t.c / t.d}-${t.e}=${x}`)}입니다.`,
    `앞을 $\\div$, 뒤를 $\\times$로 하면 ${expr(`${t.a}\\div${t.b}=${t.a / t.b}`)}, ${expr(`${t.c}\\times${t.d}=${t.c * t.d}`)}이므로 ${expr(`${t.a / t.b}+${t.c * t.d}-${t.e}=${y}`)}입니다.`,
    `두 값을 견주면 ${nj(Math.max(x, y), "이", "가")} 더 큽니다.`,
  ]);
}

/* ────────── 1-3 대응 관계 — 확대 갈래 ──────────
 *
 * 굳힘 축(예약): **「대응 관계는 표의 어느 칸에서나 같아야 한다」** — 이 소단원이 가진
 * 유일한 성질이고 해설이 되풀이하는 문장이다.
 * 마디를 여는 것: **어느 칸이 규칙에서 벗어났는지 안 말한다**(중·상) ·
 *                 **짝을 하나만 주어 관계 후보가 둘 남는다**(1-3-2 중).
 *
 * ⚠️ **정본 관계 꼴 셋 밖으로 안 나간다** — `△=□×k` · `△=□+c` · `△=□-c`.
 *    두 계수 꼴(`△=□×k+c`)은 시험이 빨갛고 1-1 혼합 계산 침범이다.
 * ⚠️ 이웃 낱말 규약: **1-3-1 은 「식으로 나타내」를 안 쓴다**(값·규칙 읽기만).
 *
 * 🔴 **1-3-1 심화상과 1-3-3 둘을 비웠다.** 1-3-1 은 중과 같은 표를 쓰면 지면에서
 *    한 문항이 되고(상은 1-3-2 로 보냈다), **1-3-3 은 표가 없어** 「어느 칸이 안
 *    맞나」를 쓸 자리 자체가 없다 — 생활 장면은 관계가 한 문장으로 굳는다.
 */

/** 정본 관계 꼴 셋. */
type W4Rel =
  | { kind: "mul"; k: number }
  | { kind: "add"; c: number }
  | { kind: "sub"; c: number };

const w4RelAt = (r: W4Rel, x: number): number =>
  r.kind === "mul" ? x * r.k : r.kind === "add" ? x + r.c : x - r.c;

const w4RelLatex = (r: W4Rel): string =>
  r.kind === "mul"
    ? relMulLatex(r.k)
    : r.kind === "add"
      ? relAddLatex(r.c)
      : relSubLatex(r.c);

const w4RelWords = (r: W4Rel): string =>
  r.kind === "mul"
    ? `△는 언제나 □의 ${n(r.k)}배`
    : r.kind === "add"
      ? `△는 언제나 □보다 ${n(r.c)}만큼 큰 수`
      : `△는 언제나 □보다 ${n(r.c)}만큼 작은 수`;

/**
 * 한 짝에서 관계를 **확인**할 때 쓰는 셈 한 줄(거꾸로 — 배·차를 낸다).
 * 「…로/으로」가 뒤에 붙는 자리가 있어 **날 LaTeX** 도 함께 돌려준다 — 조사는
 * `format.ts` 규칙 하나(`lro`)를 거쳐야 한다(손으로 「로」를 박으면 지면에서 틀린다).
 */
const w4RelStepTex = (r: W4Rel, x: number, y: number): string =>
  r.kind === "mul"
    ? `${y}\\div${x}=${r.k}`
    : r.kind === "add"
      ? `${y}-${x}=${r.c}`
      : `${x}-${y}=${r.c}`;

const w4RelStep = (r: W4Rel, x: number, y: number): string =>
  expr(w4RelStepTex(r, x, y));

/** 관계를 **앞으로** 적용한 셈 한 줄 — `$19+4=23$`. */
const w4RelForward = (r: W4Rel, x: number): string =>
  r.kind === "mul"
    ? expr(`${x}\\times${r.k}=${x * r.k}`)
    : r.kind === "add"
      ? expr(`${x}+${r.c}=${x + r.c}`)
      : expr(`${x}-${r.c}=${x - r.c}`);

/** 「□가 $x$ 인 칸」 — 표의 칸을 가리키는 말은 한 곳에 둔다. */
const w4Cell = (x: number): string => `□가 ${n(x)}인 칸`;

/**
 * 짝 여럿에 **다 맞는** 정본 관계를 전부 만든다 — 이 소단원의 유일한 성질
 * (「어느 칸에서나 같아야 한다」)을 그대로 편 것이다. 규모는 토대 17 §3 이 적은
 * 대로 `k ∈ [2,8]` · `c ∈ [2,15]` 로 묶는다(수를 키우는 것은 축이 아니다).
 */
function w4RelsFitting(pairs: readonly (readonly [number, number])[]): W4Rel[] {
  const out: W4Rel[] = [];
  for (let k = 2; k <= 8; k += 1)
    if (pairs.every(([x, y]) => y === x * k)) out.push({ kind: "mul", k });
  for (let c = 2; c <= 15; c += 1) {
    if (pairs.every(([x, y]) => y === x + c)) out.push({ kind: "add", c });
    if (pairs.every(([x, y]) => y === x - c && y >= 1))
      out.push({ kind: "sub", c });
  }
  return out;
}

const W4_RELS: W4Rel[] = [
  ...Array.from({ length: 7 }, (_, i) => ({ kind: "mul", k: i + 2 }) as W4Rel),
  ...Array.from({ length: 14 }, (_, i) => ({ kind: "add", c: i + 2 }) as W4Rel),
  ...Array.from({ length: 14 }, (_, i) => ({ kind: "sub", c: i + 2 }) as W4Rel),
];

/* ── 1-3-1 심화중 — 「네 칸 중 한 칸이 대응 관계에 맞지 않는다」 ──
 *
 * 마디: **어느 칸인가**(후보 넷). 굳힘: 나머지 셋이 **같은 관계**를 만들어야 한다 —
 * 성질 한 번이고, 끝까지 계산하지 않고 걸러 낸다(D-115 ⑾ → 심화중).
 */

type W4OddTask = {
  xs: number[];
  ys: number[]; // 지면에 찍히는 줄(한 칸이 어긋나 있다)
  step: number;
  rel: W4Rel;
  bad: number; // 어긋난 칸의 자리
  right: number; // 그 칸의 바른 값
};

function w4Odd131(): W4OddTask[] {
  const out: W4OddTask[] = [];
  // 🔴 **커지는 폭도 씨앗이 정한다.** 폭을 $1$ 로 못 박으면 발문이 첫 수 하나로만
  //    갈려 씨앗 16개에서 변형이 여섯밖에 안 나온다(기존 시험이 「변형 8+」로 잡았다).
  for (let step = 1; step <= 3; step += 1)
    for (let from = 1; from <= 9; from += 1) {
      const xs = [from, from + step, from + 2 * step, from + 3 * step];
      for (const rel of W4_RELS) {
        const truth = xs.map((x) => w4RelAt(rel, x));
        if (truth.some((y) => y < 1)) continue;
        if (truth[3]! > 60) continue;
        for (let bad = 0; bad < 4; bad += 1)
          for (let off = -6; off <= 6; off += 1) {
            if (off === 0) continue;
            const w = truth[bad]! + off;
            if (w < 1) continue;
            const ys = truth.map((y, i) => (i === bad ? w : y));
            // 「그 칸을 빼면 관계가 하나로 선다」 · 「다른 칸을 빼면 아무 관계도 안 선다」
            const pairs = (skip: number) =>
              xs
                .map((x, i) => [x, ys[i]!] as const)
                .filter((_, i) => i !== skip);
            if (w4RelsFitting(pairs(bad)).length !== 1) continue;
            let ok = true;
            for (let j = 0; j < 4 && ok; j += 1)
              if (j !== bad && w4RelsFitting(pairs(j)).length > 0) ok = false;
            if (!ok) continue;
            out.push({ xs, ys, step, rel, bad, right: truth[bad]! });
          }
      }
    }
  return out;
}

function corr131Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W4OddTask) =>
    `표는 □가 ${n(t.xs[0]!)}부터 ${n(t.step)}씩 커질 때의 △를 나타낸 것입니다. 그런데 △ 줄에서 한 칸만 대응 관계에 맞지 않습니다. 그 칸의 수를 바르게 고치면 얼마입니까?`;
  const pool = w2Pool("w4-131mid", () => {
    const seen = new Map<string, boolean>();
    return w4Odd131().filter(
      (t) =>
        !w4BadMemo(
          seen,
          `${t.xs[0]}|${t.step}|${t.right}`,
          () => content(t),
          t.right,
        ),
    );
  });
  const t = w2Pick(unit, "심화중", rng, pool);
  const good = [0, 1, 2, 3].filter((i) => i !== t.bad);
  return makeDeep(
    unit,
    content(t),
    n(t.right),
    [
      `대응 관계는 어느 칸에서나 같아야 합니다. ${w4Cell(t.xs[good[0]!]!)}과 ${w4Cell(t.xs[good[1]!]!)}을 보면 ${w4RelStep(t.rel, t.xs[good[0]!]!, t.ys[good[0]!]!)}, ${lro(w4RelStepTex(t.rel, t.xs[good[1]!]!, t.ys[good[1]!]!))} 같습니다.`,
      `${w4Cell(t.xs[good[2]!]!)}도 ${lro(w4RelStepTex(t.rel, t.xs[good[2]!]!, t.ys[good[2]!]!))} 같으므로 ${w4RelWords(t.rel)}입니다.`,
      `${w4Cell(t.xs[t.bad]!)}만 △가 ${nj(t.ys[t.bad]!, "이라서", "라서")} 맞지 않습니다. 바르게 고치면 ${w4RelForward(t.rel, t.xs[t.bad]!)}입니다.`,
    ],
    corrTable(t.xs, t.ys),
  );
}

/* ── 1-3-2 심화중 — 「짝을 하나만 주어 관계 후보가 둘 남는다」 ──
 *
 * 마디: **관계가 `×k` 인지 `+c` 인지**(후보 둘 — 짝이 하나면 둘 다 정본 꼴로 선다).
 * 굳힘: 「대응 관계는 어느 칸에서나 같다」 + △가 그 값일 때 □도 **자연수**여야 한다 —
 * 한쪽은 나누어떨어지지 않아 죽는다(계산 끝까지 안 간다 → 심화중).
 */

type W4TwoRelTask = {
  a: number;
  b: number;
  T: number;
  x: number;
  mid: number[]; // 표의 가운데 두 칸(△ 는 비어 있다)
  keep: W4Rel;
  drop: W4Rel;
  ans: number;
};

function w4TwoRel132(): W4TwoRelTask[] {
  const out: W4TwoRelTask[] = [];
  for (let a = 2; a <= 12; a += 1)
    for (let k = 2; k <= 8; k += 1) {
      const b = a * k;
      const c = b - a;
      if (c < 2 || c > 15) continue; // 정본 꼴 밖이면 후보가 애초에 하나다
      const mul: W4Rel = { kind: "mul", k };
      const add: W4Rel = { kind: "add", c };
      // 🔴 `T` 를 작은 쪽까지 연다. `T ≥ 20` 으로 두면 `△-c` 가 늘 자연수라
      //    **살아남는 관계가 언제나 `+c`** 가 된다(실측: 씨앗 셋 다 그랬다).
      //    그러면 「늘 더하기」가 답을 대신한다.
      for (let T = 2; T <= 90; T += 1) {
        const mulOk = T % k === 0 && T / k >= 1;
        const addOk = T - c >= 1;
        if (mulOk === addOk) continue;
        const keep = mulOk ? mul : add;
        const drop = mulOk ? add : mul;
        // ⚠️ `x` 를 몇 개로 묶는다 — 후보 줄이 커지면 `w3Bad` 를 그 수만큼 돌게 되어
        //    풀을 처음 만드는 데 20초를 넘긴다(시험이 실제로 시간 초과로 떨어졌다).
        for (const x of [13, 17, 21, 25, 29]) {
          if (x === a) continue;
          const ans = w4RelAt(keep, x);
          if (ans < 1 || ans > 120) continue;
          if (ans === w4RelAt(drop, x)) continue; // 후보가 같은 답을 내면 마디가 뜻이 없다
          // 표는 네 칸이다(이 소단원의 대응표 규약). 가운데 두 칸은 △ 가 비어 있어
          // **짝이 하나뿐**이라는 것이 지면에서 그대로 보인다.
          const mid = [
            a + Math.floor((x - a) / 3),
            a + Math.floor((2 * (x - a)) / 3),
          ];
          if (mid[0]! <= a || mid[1]! <= mid[0]! || mid[1]! >= x) continue;
          // `T` 가 표에 찍힌 수와 같으면 지면에서 어느 값인지 헷갈린다.
          if ([a, b, x, ans, ...mid].includes(T)) continue;
          out.push({ a, b, T, x, mid, keep, drop, ans });
        }
      }
    }
  return out;
}

function corr132Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W4TwoRelTask) =>
    `표는 두 양 □와 △ 사이의 대응 관계를 나타낸 것인데, △ 줄은 한 칸만 적혀 있습니다. △가 ${n(t.T)}일 때에도 □는 자연수일 때, 대응 관계를 식으로 나타내고 ㉠에 알맞은 수를 구하시오.`;
  const pool = w2Pool("w4-132mid", () =>
    w4TwoRel132().filter((t) => !w3Bad(content(t), w2int(t.ans))),
  );
  // 살아남는 관계가 한쪽으로 몰리지 않게 **먼저 고른다**(위 주석 참조).
  const wantKind = altCase(rng) ? "mul" : "add";
  const half = pool.filter((x) => x.keep.kind === wantKind);
  const t = w2Pick(unit, "심화중", rng, half.length > 0 ? half : pool);
  const dropWhy =
    t.drop.kind === "mul"
      ? `${lj(`${t.T}\\div${t.drop.k}`, "은", "는")} 나누어떨어지지 않아 □가 자연수가 되지 않습니다.`
      : `□는 △에서 ${nj(t.drop.c, "을", "를")} 뺀 수인데 △가 ${nj(t.T, "이라", "라")} ${n(t.drop.c)}보다 크지 않으므로 □가 자연수가 되지 않습니다.`;
  return makeDeep(
    unit,
    content(t),
    n(t.ans),
    [
      `짝이 하나뿐이면 대응 관계로 ${lj(w4RelLatex(t.keep), "과", "와")} ${lj(w4RelLatex(t.drop), "이", "가")} 모두 가능합니다. ${w4RelStep({ kind: "mul", k: t.b / t.a }, t.a, t.b)}이고 ${w4RelStep({ kind: "add", c: t.b - t.a }, t.a, t.b)}이기 때문입니다.`,
      `${lj(w4RelLatex(t.drop), "은", "는")} 쓸 수 없습니다 — ${dropWhy}`,
      `그러므로 ${lj(w4RelLatex(t.keep), "이", "가")} 대응 관계이고, ㉠은 □가 ${nj(t.x, "일", "일")} 때이므로 ${w4RelForward(t.keep, t.x)}입니다.`,
    ],
    corrTable([t.a, t.mid[0]!, t.mid[1]!, t.x], [t.b, "", "", "㉠"]),
  );
}

/* ── 1-3-2 심화상 — 「네 칸 중 **두 칸**이 안 맞는데, 짝마다 관계를 세워 봐야 갈린다」 ──
 *
 * 🔴 심화중(1-3-1)과 갈리는 문장: 어긋난 칸이 **둘**이라 「나머지가 다 같다」가
 *    성립하지 않는다. 두 칸씩 짝지은 **여섯 짝을 각각 세워 봐야** 관계가 서는 짝이
 *    하나임을 알 수 있다(D-115 ⑾ → 심화상). 그리고 묻는 것은 고친 칸이 아니라 **먼 항**이다.
 *
 * ⚠️ 표는 이 소단원 규약대로 **네 칸**이다(`elemTiersG5.test.ts` 의 `tablePairs`).
 *    처음에 세 칸으로 짰다가 그 시험이 잡았다.
 */

type W4Odd2Task = {
  xs: number[];
  ys: number[];
  rel: W4Rel;
  keepPair: [number, number]; // 성한 두 칸
  far: number;
  ans: number;
};

/** 관계가 서는 짝 — 「정확히 하나」일 때만 참으로 센다. */
const w4OnePair = (
  xs: readonly number[],
  ys: readonly number[],
  i: number,
  j: number,
): W4Rel | null => {
  const fits = w4RelsFitting([
    [xs[i]!, ys[i]!],
    [xs[j]!, ys[j]!],
  ]);
  return fits.length === 1 ? fits[0]! : null;
};

const W4_PAIRS: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];

/**
 * 규모를 줄인 관계 목록 — 후보 줄이 폭발하지 않게 묶는다(풀 만드는 시간).
 * 🔴 `-c` 는 뺀다 — 그러면 △가 □보다 작아져 해설의 「차」가 음수가 되고, 초5 지면에
 *    음수는 못 나간다. 부호를 지우면 이번엔 「차가 다르다」가 거짓이 될 수 있다.
 */
const W4_RELS_SMALL: W4Rel[] = W4_RELS.filter((r) =>
  r.kind === "mul" ? r.k <= 5 : r.kind === "add" ? r.c <= 8 : false,
);

function w4Odd132(): W4Odd2Task[] {
  const out: W4Odd2Task[] = [];
  const offs = [-3, -2, 2];
  for (let x0 = 2; x0 <= 5; x0 += 1)
    for (const d1 of [2, 3])
      for (const d2 of [2, 3])
        for (const d3 of [2, 3]) {
          const xs = [x0, x0 + d1, x0 + d1 + d2, x0 + d1 + d2 + d3];
          for (const rel of W4_RELS_SMALL) {
            const truth = xs.map((x) => w4RelAt(rel, x));
            if (truth.some((y) => y < 1) || truth[3]! > 90) continue;
            for (const [ka, kb] of W4_PAIRS) {
              const badIdx = [0, 1, 2, 3].filter((i) => i !== ka && i !== kb);
              for (const o1 of offs)
                for (const o2 of offs) {
                  const ys = truth.slice();
                  ys[badIdx[0]!] = truth[badIdx[0]!]! + o1;
                  ys[badIdx[1]!] = truth[badIdx[1]!]! + o2;
                  if (ys.some((y) => y < 1)) continue;
                  // 성한 짝에서만 관계가 **하나** 서고, 나머지 다섯 짝에서는 안 선다.
                  const keep = w4OnePair(xs, ys, ka, kb);
                  if (!keep || w4RelLatex(keep) !== w4RelLatex(rel)) continue;
                  let ok = true;
                  for (const [i, j] of W4_PAIRS) {
                    if (i === ka && j === kb) continue;
                    if (
                      w4RelsFitting([
                        [xs[i]!, ys[i]!],
                        [xs[j]!, ys[j]!],
                      ]).length > 0
                    ) {
                      ok = false;
                      break;
                    }
                  }
                  if (!ok) continue;
                  // 🔴 해설이 「차가 다르고 배도 같지 않다」고 적는다 — 그 문장이
                  //    **참이어야** 한다. 정본 꼴 밖(차가 $16$ 이상 같다든가, 배가
                  //    자연수가 아닌 채로 같다든가)이면 `w4RelsFitting` 은 «안 선다»를
                  //    내지만 그 문장은 거짓이 된다.
                  for (const [i, j] of W4_PAIRS) {
                    if (i === ka && j === kb) continue;
                    const di = ys[i]! - xs[i]!;
                    const dj = ys[j]! - xs[j]!;
                    if (di <= 0 || dj <= 0 || di === dj) ok = false;
                    if (ys[i]! * xs[j]! === ys[j]! * xs[i]!) ok = false;
                    if (!ok) break;
                  }
                  if (!ok) continue;
                  // 🔴 먼 항이 **발문의 유일한 수**다 — 몇 개로 묶으면 씨앗 16개에서
                  //    발문 변형이 그 수만큼밖에 안 나온다(기존 시험의 「변형 8+」에
                  //    실제로 걸렸다: 둘). 대신 여기서만 넓히고 나머지는 묶어 둔다.
                  for (let far = 14; far <= 30; far += 1) {
                    if (xs.includes(far)) continue;
                    const ans = w4RelAt(rel, far);
                    if (ans < 1 || ans > 150) continue;
                    out.push({ xs, ys, rel, keepPair: [ka, kb], far, ans });
                  }
                }
            }
          }
        }
  return out;
}

function corr132Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W4Odd2Task) =>
    `표는 두 양 □와 △ 사이의 대응 관계를 나타낸 것인데, ${W2_COUNT[2]!} 칸이 대응 관계에 맞지 않습니다. 대응 관계를 식으로 나타내고, □가 ${nj(t.far, "일", "일")} 때 △를 구하시오.`;
  const pool = w2Pool("w4-132top", () => {
    const seen = new Map<string, boolean>();
    return w4Odd132().filter(
      (t) => !w4BadMemo(seen, `${t.far}|${t.ans}`, () => content(t), t.ans),
    );
  });
  const t = w2Pick(unit, "심화상", rng, pool);
  const [ka, kb] = t.keepPair;
  const dead = W4_PAIRS.filter(([i, j]) => !(i === ka && j === kb));
  const noFit = (i: number, j: number) =>
    `${nums([t.xs[i]!, t.xs[j]!])} 짝은 차가 ${nj(t.ys[i]! - t.xs[i]!, "과", "와")} ${nro(t.ys[j]! - t.xs[j]!)} 다르고 배도 같지 않습니다.`;
  return makeDeep(
    unit,
    content(t),
    n(t.ans),
    [
      `맞지 않는 칸이 둘이므로 「나머지가 다 같다」로는 고를 수 없습니다. 두 칸씩 짝지은 여섯 짝에서 대응 관계가 서는지 하나씩 세워 봅니다.`,
      dead.map(([i, j]) => noFit(i, j)).join(" "),
      `${w4Cell(t.xs[ka]!)}과 ${w4Cell(t.xs[kb]!)}만 ${w4RelStep(t.rel, t.xs[ka]!, t.ys[ka]!)}, ${lro(w4RelStepTex(t.rel, t.xs[kb]!, t.ys[kb]!))} 같아 ${lj(w4RelLatex(t.rel), "이", "가")} 섭니다.`,
      `□가 ${nj(t.far, "일", "일")} 때 △는 ${w4RelForward(t.rel, t.far)}입니다.`,
    ],
    corrTable(t.xs, t.ys),
  );
}

/* ────────── 1-4 약분과 통분 — 확대 갈래 ──────────
 *
 * 굳힘 축(예약): **「크기가 같은 분수는 분모와 분자에 같은 수를 곱한 것」**(1-4-1) ·
 * **「기약분수는 분모와 분자가 서로소」**(1-4-2) · **「공통분모는 두 분모의 공배수」**(1-4-3).
 * 마디를 여는 것: **어느 쪽 수인지 / 몇 배 했는지 / 어느 분수의 분자인지 안 말한다**.
 *
 * ⚠️ **이웃 낱말이 잠겨 있다**(D-66 ⑸ · 시험이 문다): «크기가 같은»은 1-4-1 만,
 *    «약분»·«기약»은 1-4-2 만, «통분»·«공통분모»는 1-4-3 만, «소수»는 1-4-5 만.
 *
 * 🔴 **여섯 칸을 비웠다.**
 *    · **1-4-1 심화상** — 「같은 수를 곱한다」가 **일대일**이라 배수 하나를 정하면 분수가
 *      통째로 정해진다. 후보를 여럿 남기려면 범위를 얹어야 하는데 그건 심화하가 이미
 *      쓴다(`eq141Deep` ㉯ 가 「분모가 $13$보다 크고 $19$보다 작은」이다).
 *    · **1-4-2 심화상** — 되짚기 값이 «몇으로 약분했나»(g) 하나뿐인데 분모·분자·합·차가
 *      **전부 $g$ 에 비례**한다. 어떤 조건을 주어도 나눗셈 한 번으로 굳으므로
 *      「후보를 다 만들어 견주어야」가 성립하지 않는다(`census-g5w4-empty.ts` 가 전수로 센다).
 *    · **1-4-4 둘** — 되짚을 값이 없고 심화하가 이미 열거다(`$\frac13<\frac{\square}9<\frac79$`).
 *    · **1-4-5 둘** — 분수↔소수가 한 걸음 일대일이라 견줄 둘째 걸음이 안 선다.
 */

/** 기약 진분수 짝 — 확대 갈래가 쓰는 재료. */
type W4Frac = { a: number; b: number };

const W4_PROPER: W4Frac[] = (() => {
  const out: W4Frac[] = [];
  for (let b = 3; b <= 12; b += 1)
    for (let a = 1; a < b; a += 1) if (gcd(a, b) === 1) out.push({ a, b });
  return out;
})();

/* ── 1-4-2 심화중 — 「무엇으로 약분했는지 안 말한다」 ──
 *
 * 마디: **몇으로 약분했는가**(후보가 배수만큼 여럿).
 * 굳힘: 「기약분수는 분모와 분자가 **서로소**」라 그 꼴이 유일하고, 발문이 준 **차**가
 *       배수를 하나로 남긴다. 끝까지 계산하지 않고 나눗셈 한 번으로 갈린다(→ 심화중).
 */

type W4RedTask = { a: number; b: number; k: number; D: number };

function w4Red142(): W4RedTask[] {
  const out: W4RedTask[] = [];
  for (const { a, b } of W4_PROPER)
    for (let k = 2; k <= 9; k += 1) {
      // 분모를 키우는 것은 축이 아니다(토대 17 §3 「발문 분모 ≤ 48」).
      if (a < 2 || b * k > 48) continue;
      out.push({ a, b, k, D: (b - a) * k });
    }
  return out;
}

function red142Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W4RedTask) =>
    `어떤 분수를 약분하여 기약분수 ${fro(t.a, t.b)} 나타냈습니다. 어떤 분수의 분모와 분자의 차가 ${nj(t.D, "일", "일")} 때, 어떤 분수의 분모를 구하시오.`;
  const pool = w2Pool("w4-142mid", () =>
    w4Red142().filter((t) => !w3Bad(content(t), w2int(t.b * t.k))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  return makeDeep(unit, content(t), n(t.b * t.k), [
    `약분은 분모와 분자를 같은 수로 나누는 것이므로, 어떤 분수는 ${frj(t.a, t.b, "과", "와")} 분모와 분자에 각각 같은 수를 곱한 분수입니다.`,
    `기약분수의 분모와 분자의 차는 ${expr(`${t.b}-${t.a}=${t.b - t.a}`)}이고, 같은 수를 곱하면 차도 그 수만큼 커집니다. 곱한 수는 ${expr(`${t.D}\\div${t.b - t.a}=${t.k}`)}입니다.`,
    `어떤 분수의 분모는 ${expr(`${t.b}\\times${t.k}=${t.b * t.k}`)}입니다.`,
  ]);
}

/* ── 1-4-3 심화중 — 「어느 분수의 분자인지 안 말한다」 ──
 *
 * 마디: 지면의 분자가 **어느 분수의 것인가**(후보 둘).
 * 굳힘: 「공통분모는 두 분모의 **공배수**」 → 한쪽으로 읽으면 공배수가 안 된다.
 * ⚠️ 심화하 ㉮ 는 분자를 **둘 다** 준다 — 그러면 마디가 안 열린다(토대 17 §3 함정).
 */

type W4ComTask = {
  a: number;
  b: number;
  c: number;
  d: number;
  m: number;
  N: number;
  fromFirst: boolean;
};

function w4Com143(): W4ComTask[] {
  const out: W4ComTask[] = [];
  for (const { a, b } of W4_PROPER)
    for (const { a: c, b: d } of W4_PROPER) {
      // 한쪽이 다른 쪽의 약수면 통분해도 한 분수가 그대로라 «통분»이 안 보인다.
      if (b === d || gcd(b, d) === 1) continue;
      if (b % d === 0 || d % b === 0) continue; // 곱과 최소공배수가 갈려야 이 소단원이다
      const L = lcm(b, d);
      if (L > 60) continue;
      for (let t = 1; t <= 2; t += 1) {
        const m = L * t;
        if (m > 90) continue;
        const p = a * (m / b);
        const q = c * (m / d);
        for (const [N, fromFirst] of [
          [p, true],
          [q, false],
        ] as const) {
          // 다른 쪽으로 읽어도 «공배수»가 되면 답이 둘이다 — 그때는 못 쓴다.
          const otherNum = fromFirst ? c : a;
          const otherDen = fromFirst ? d : b;
          if (N % otherNum === 0) {
            const m2 = otherDen * (N / otherNum);
            if (m2 !== m && m2 % b === 0 && m2 % d === 0) continue;
          }
          out.push({ a, b, c, d, m, N, fromFirst });
        }
      }
    }
  return out;
}

function com143Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W4ComTask) =>
    `${frj(t.a, t.b, "과", "와")} ${frj(t.c, t.d, "을", "를")} 통분했더니 한 분수의 분자가 ${nj(t.N, "이", "가")} 되었습니다. 공통분모를 구하시오.`;
  const pool = w2Pool("w4-143mid", () =>
    w4Com143().filter((t) => !w3Bad(content(t), w2int(t.m))),
  );
  const wantFirst = altCase(rng);
  const half = pool.filter((x) => x.fromFirst === wantFirst);
  const t = w2Pick(unit, "심화중", rng, half.length > 0 ? half : pool);
  const mine = t.fromFirst ? { p: t.a, q: t.b } : { p: t.c, q: t.d };
  const other = t.fromFirst ? { p: t.c, q: t.d } : { p: t.a, q: t.b };
  const deadWhy =
    t.N % other.p !== 0
      ? `${lj(`${t.N}\\div${other.p}`, "은", "는")} 나누어떨어지지 않아 분자가 될 수 없습니다.`
      : `공통분모가 ${lj(`${other.q}\\times${t.N / other.p}=${other.q * (t.N / other.p)}`, "이", "가")} 되는데, 이 수는 ${nj(t.b, "과", "와")} ${n(t.d)}의 공배수가 아닙니다.`;
  return makeDeep(unit, content(t), n(t.m), [
    `공통분모는 두 분모 ${nj(t.b, "과", "와")} ${n(t.d)}의 공배수여야 합니다.`,
    `${nj(t.N, "이", "가")} ${frj(other.p, other.q, "의", "의")} 분자라면 ${deadWhy}`,
    `그러므로 ${nj(t.N, "은", "는")} ${frj(mine.p, mine.q, "의", "의")} 분자입니다. ${expr(`${t.N}\\div${mine.p}=${t.N / mine.p}`)}이므로 공통분모는 ${expr(`${mine.q}\\times${t.N / mine.p}=${t.m}`)}입니다.`,
  ]);
}

/* ── 1-4-3 심화상 — 「한쪽 분수를 통째로 모르고, 분모 후보를 만들어 견준다」 ──
 *
 * 🔴 심화중과 갈리는 문장: 후보(어떤 진분수의 분모)를 **발문이 안 주고** 되짚기가
 *    만들며, 「공통분모가 될 수 있는 가장 작은 수가 $M$」 하나로는 **안 갈린다** —
 *    후보마다 「분모와 분자의 합이 $S$ 인 진분수를 만들 수 있는가」를 **실제로 따져
 *    봐야** 하나가 남는다(D-115 ⑾ → 심화상).
 */

type W4ComTopTask = { a: number; b: number; M: number; S: number; e: number };

/** `lcm(b, e) = M` 인 분모 후보 전부 — 되짚기가 만드는 줄. */
function w4DenCands(b: number, M: number): number[] {
  const out: number[] = [];
  for (let e = 2; e <= M; e += 1) if (lcm(b, e) === M) out.push(e);
  return out;
}

function w4ComTop143(): W4ComTopTask[] {
  const out: W4ComTopTask[] = [];
  for (let b = 4; b <= 12; b += 1)
    for (let t = 1; t <= 6; t += 1) {
      const M = b * t;
      if (M > 72 || M === b) continue;
      const cands = w4DenCands(b, M);
      if (cands.length < 3) continue; // 마디가 열려야 한다
      for (let S = 7; S <= 40; S += 1) {
        const hit = cands.filter((e) => {
          const c = S - e;
          return c > 0 && c < e;
        });
        if (hit.length !== 1) continue;
        // 해설에 셈이 둘 이상 남아야 한다(D-72 4단) — 모두 「미다」로
        // 끝나면 빼셈을 한 번도 안 적게 된다.
        if (cands.filter((e) => S - e > 0).length < 2) continue;
        const e = hit[0]!;
        if (e < 3) continue;
        out.push({ a: 1, b, M, S, e });
      }
    }
  return out;
}

function com143Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W4ComTopTask) =>
    `어떤 진분수와 분모가 ${nj(t.b, "인", "인")} 진분수를 통분하려고 합니다. 공통분모가 될 수 있는 수 중 가장 작은 수가 ${nj(t.M, "이고", "이고")} 어떤 진분수의 분모와 분자의 합이 ${nj(t.S, "일", "일")} 때, 어떤 진분수의 분모를 구하시오.`;
  const pool = w2Pool("w4-143top", () =>
    w4ComTop143().filter((t) => !w3Bad(content(t), w2int(t.e))),
  );
  const t = w2Pick(unit, "심화상", rng, pool);
  const cands = w4DenCands(t.b, t.M);
  // 🔴 **음수를 지면에 쓰지 않는다.** 합보다 큰 분모는 뺄셈 자체가 안 되므로
  //    「$34-36=-2$」 가 아니라 「뺄 수 없다」로 적는다(초5 는 음수를 안 배운다).
  const lines = cands.map((e) => {
    const c = t.S - e;
    if (c <= 0)
      return `분모가 ${nj(e, "이면", "이면")} ${n(t.S)}에서 ${nj(e, "을", "를")} 뺄 수 없어 분자를 만들지 못합니다.`;
    if (c >= e)
      return `분모가 ${nj(e, "이면", "이면")} 분자가 ${lj(`${t.S}-${e}=${c}`, "이라", "라")} 분모보다 작지 않아 진분수가 아닙니다.`;
    return `분모가 ${nj(e, "이면", "이면")} 분자가 ${lj(`${t.S}-${e}=${c}`, "이라", "라")} 진분수가 됩니다.`;
  });
  return makeDeep(unit, content(t), n(t.e), [
    `공통분모가 될 수 있는 수 중 가장 작은 수가 ${nj(t.M, "이므로", "이므로")}, 어떤 진분수의 분모는 ${nj(t.b, "과", "와")} 함께 그 수를 만드는 수여야 합니다. 그런 분모는 ${nums(cands)}입니다.`,
    `분모마다 분자를 만들어 봅니다. ${lines.join(" ")}`,
    `진분수가 되는 것은 분모가 ${nj(t.e, "일", "일")} 때뿐이므로 어떤 진분수의 분모는 ${n(t.e)}입니다.`,
  ]);
}

/* ────────── 2-2 분수의 곱셈 — 확대 갈래 ──────────
 *
 * 굳힘 축(예약): **「진분수다(분자<분모)」·「대분수다」·「한 자리 자연수다」** — 셋 다
 * **소단원 이름 그 자체**라 반증 ③ 을 안 건드린다.
 * 마디를 여는 것: **곱한 수(또는 분자)를 안 말하고 «분자끼리의 곱»까지만 굳힌다**.
 *
 * 🔴 **창(범위)은 안 쓴다.** 토대 17 §2.1 ㉠ 이 「곱만 알고 두 인수를 모른다 + 창」이
 *    파일럿 2-4 심화상과 **동형이 넷**이라고 짚었다. 여기서는 **분모 조건으로만** 가른다.
 *
 * ⚠️ 이 소단원의 시험이 잠근 규약 셋(`elemTiersG5.test.ts`):
 *    ㉠ **차례가 곧 소단원이다** — 2-2-1 은 `\frac{a}{b}\times n`, 2-2-2 는 `n\times\frac{a}{b}`.
 *       상대의 차례는 **발문에** 있으면 안 된다.
 *    ㉡ **발문이 「기약」을 요구하면 안 된다**(`/기약|약분하여 나타/`).
 *    ㉢ 2-2-4 는 **발문에 대분수**가 있어야 하고 **해설에 「가분수」** 가 있어야 한다.
 *
 * 🔴 **2-2-1·2-2-2·2-2-4 의 심화상은 비웠다.** 이 대단원에서 「성질로 못 갈라 실제로
 *    곱해 봐야」가 서는 자리는 **곱을 약분해 봐야 아는 조건** 하나뿐인데, 그것을 두
 *    소단원에 쓰면 지면에서 한 문항이 된다. 그래서 2-2-3 에만 두었다.
 */

/** `n/d` 를 지면 표기로 — 약분하고 대분수로 접는다(R2). */
const w4FracText = (num: number, den: number): string => {
  const [p, q] = simplify(num, den);
  return fracLatex(p, q);
};

/** 곱이 `P` 이고 **한 자리 자연수**가 끼는 짝 — 해설이 늘어놓는 줄. */
function w4OneDigitPairs(P: number): [number, number][] {
  return divisors(P)
    .map((d) => [d, P / d] as [number, number])
    .filter(([, e]) => e >= 2 && e <= 9);
}

const w4PairList = (pairs: readonly (readonly [number, number])[]): string =>
  pairs.map(([d, e]) => expr(`(${d},\\ ${e})`)).join(", ");

/* ── 2-2-1 심화중 — 「곱한 자연수를 안 말한다」 ── */

type W4MulTask = { b: number; a: number; k: number };

/** 곱이 `X` 인 짝 `(분자, 자연수)` 중 «진분수 · 한 자리 자연수»를 지키는 것. */
function w4MulPairs(P: number, b: number): [number, number][] {
  const out: [number, number][] = [];
  for (const d of divisors(P)) {
    const e = P / d;
    if (d < b && e >= 2 && e <= 9) out.push([d, e]);
  }
  return out;
}

function w4Mul221(): W4MulTask[] {
  const out: W4MulTask[] = [];
  for (let b = 4; b <= 12; b += 1)
    for (let a = 1; a < b; a += 1)
      for (let k = 2; k <= 9; k += 1) {
        if (gcd(a, b) !== 1) continue; // 처음 진분수는 기약이어야 지면이 깨끗하다
        if (a * k > 60) continue;
        // 곱한 결과가 자연수로 떨어지면 해설 첫 걸음이 「$16=\frac{112}{7}$」처럼
        // **등호 앞에 연산이 없는** 꼴이 되어 `countCalcSteps` 가 셈으로 안 센다
        // (D-72 4단 가드가 실제로 던졌다). 지면도 분수 꼴이 깔끔하다.
        if ((a * k) % b === 0) continue;
        // 굳힘이 실제로 일해야 한다 — 「한 자리 자연수」만으로 짝이 하나면 «진분수다»가
        // 아무것도 안 걸러 내서 마디가 안 열린다(첫 판에서 실제로 났다).
        if (w4OneDigitPairs(a * k).length < 2) continue;
        if (w4MulPairs(a * k, b).length !== 1) continue;
        out.push({ b, a, k });
      }
  return out;
}

function mul221Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W4MulTask) =>
    `분모가 ${nj(t.b, "인", "인")} 진분수에 한 자리 자연수를 곱했더니 ${lj(w4FracText(t.a * t.k, t.b), "이", "가")} 되었습니다. 처음 진분수의 분자를 구하시오.`;
  const pool = w2Pool("w4-221mid", () =>
    w4Mul221().filter((t) => !w3Bad(content(t), w2int(t.a))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  const P = t.a * t.k;
  const all = w4OneDigitPairs(P);
  // 수치 후보는 그대로 고르고, 짝 열거가 제외하는 1의 조건을 발문에도 옮긴다.
  const stem = content(t).replace(
    "한 자리 자연수",
    `${n(1)}보다 큰 한 자리 자연수`,
  );
  return makeDeep(unit, stem, n(t.a), [
    `분모는 그대로 두고 분자에 자연수를 곱하므로, 곱한 결과를 분모가 ${nj(t.b, "인", "인")} 분수로 고치면 ${expr(`${w4FracText(P, t.b)}=\\frac{${P}}{${t.b}}`)}입니다. 곧 분자와 곱한 자연수의 곱이 ${nj(P, "입니다", "입니다")}.`,
    `곱이 ${nj(P, "이고", "고")} 곱한 수가 ${n(1)}보다 큰 한 자리 자연수인 (분자, 곱한 수) 짝은 ${w4PairList(all)}입니다.`,
    `분자는 ${nj(t.b, "보다", "보다")} 작아야 하므로 짝은 하나뿐입니다. 검산하면 ${expr(`\\frac{${t.a}}{${t.b}}\\times${t.k}=${w4FracText(P, t.b)}`)}이므로 분자는 ${n(t.a)}입니다.`,
  ]);
}

/* ── 2-2-2 심화중 — 「곱한 진분수의 분자를 안 말한다」 ── */

function w4Mul222(): W4MulTask[] {
  const out: W4MulTask[] = [];
  for (let b = 4; b <= 12; b += 1)
    for (let a = 1; a < b; a += 1)
      for (let k = 2; k <= 9; k += 1) {
        if (gcd(a, b) !== 1) continue;
        if (a * k > 60) continue;
        // 곱한 결과가 자연수로 떨어지면 해설 첫 걸음이 「$16=\frac{112}{7}$」처럼
        // **등호 앞에 연산이 없는** 꼴이 되어 `countCalcSteps` 가 셈으로 안 센다
        // (D-72 4단 가드가 실제로 던졌다). 지면도 분수 꼴이 깔끔하다.
        if ((a * k) % b === 0) continue;
        // 2-2-1 과 같은 까닭 — 「한 자리 자연수」만으로 짝이 하나면 마디가 안 열린다.
        if (w4OneDigitPairs(a * k).length < 2) continue;
        if (w4MulPairs(a * k, b).length !== 1) continue;
        out.push({ b, a, k });
      }
  return out;
}

function mul222Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W4MulTask) =>
    `어떤 한 자리 자연수와 분모가 ${nj(t.b, "인", "인")} 진분수를 곱했더니 ${lj(w4FracText(t.a * t.k, t.b), "이", "가")} 되었습니다. 어떤 자연수를 구하시오.`;
  const pool = w2Pool("w4-222mid", () =>
    w4Mul222().filter((t) => !w3Bad(content(t), w2int(t.k))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  const P = t.a * t.k;
  const all = w4OneDigitPairs(P);
  // «어떤 한 자리 자연수» 의 «어떤» 앞으로 조건을 놓는다(«어떤 1보다 큰 …» 은 어순이 어색하다 — 4차 교차 검수)
  const stem = content(t).replace(
    "어떤 한 자리 자연수",
    `${n(1)}보다 큰 어떤 한 자리 자연수`,
  );
  return makeDeep(unit, stem, n(t.k), [
    `자연수를 분자에 곱하므로, 곱한 결과를 분모가 ${nj(t.b, "인", "인")} 분수로 고치면 ${expr(`${w4FracText(P, t.b)}=\\frac{${P}}{${t.b}}`)}입니다. 곧 자연수와 진분수의 분자의 곱이 ${nj(P, "입니다", "입니다")}.`,
    `곱이 ${nj(P, "이고", "고")} 자연수가 ${n(1)}보다 큰 한 자리 수인 (진분수의 분자, 자연수) 짝은 ${w4PairList(all)}입니다.`,
    `진분수의 분자는 ${nj(t.b, "보다", "보다")} 작아야 하므로 짝은 하나뿐입니다. 검산하면 ${expr(`${t.k}\\times\\frac{${t.a}}{${t.b}}=${w4FracText(P, t.b)}`)}이므로 어떤 자연수는 ${n(t.k)}입니다.`,
  ]);
}

/* ── 2-2-3 심화중 — 「두 분모만 주고 분자를 안 말한다」 ──
 *
 * 마디: 분자 짝(곱만 굳는다). 굳힘: **두 분수가 다 진분수**여야 한다 —
 * 계산 끝까지 안 가고 크기 비교만으로 걸러 낸다(→ 심화중).
 */

type W4Mul3Task = { d1: number; d2: number; a: number; b: number };

/** 곱이 `P` 인 짝 중 `a < d1` · `b < d2` 인 것. */
function w4ProperPairs(P: number, d1: number, d2: number): [number, number][] {
  const out: [number, number][] = [];
  for (const d of divisors(P)) {
    const e = P / d;
    if (d < d1 && e < d2) out.push([d, e]);
  }
  return out;
}

function w4Mul223(): W4Mul3Task[] {
  const out: W4Mul3Task[] = [];
  for (let d1 = 4; d1 <= 12; d1 += 1)
    for (let d2 = 4; d2 <= 12; d2 += 1) {
      if (d1 === d2) continue;
      for (let a = 2; a < d1; a += 1)
        for (let b = 2; b < d2; b += 1) {
          if (gcd(a, d1) !== 1 || gcd(b, d2) !== 1) continue;
          const P = a * b;
          const pairs = w4ProperPairs(P, d1, d2);
          if (pairs.length !== 1) continue; // 진분수 조건이 하나만 남겨야 한다
          // 곱이 약분돼야 「분모를 두 분모의 곱으로 고친다」는 걸음이 뜻을 갖는다.
          if (gcd(P, d1 * d2) === 1) continue;
          if (divisors(P).length < 4) continue; // 마디가 열려야 한다(짝이 여럿)
          out.push({ d1, d2, a, b });
        }
    }
  return out;
}

function mul223Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W4Mul3Task) =>
    `분모가 ${nj(t.d1, "인", "인")} 진분수와 분모가 ${nj(t.d2, "인", "인")} 진분수를 곱했더니 ${lj(w4FracText(t.a * t.b, t.d1 * t.d2), "이", "가")} 되었습니다. 두 진분수의 분자의 합을 구하시오.`;
  const pool = w2Pool("w4-223mid", () =>
    w4Mul223().filter((t) => !w3Bad(content(t), w2int(t.a + t.b))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  const P = t.a * t.b;
  const all = divisors(P).map((d) => [d, P / d] as [number, number]);
  return makeDeep(unit, content(t), n(t.a + t.b), [
    `분자끼리, 분모끼리 곱하므로 분모는 ${expr(`${t.d1}\\times${t.d2}=${t.d1 * t.d2}`)}이고, 곱을 그 분모로 고치면 ${lj(`\\frac{${P}}{${t.d1 * t.d2}}`, "이", "가")} 됩니다. 곧 두 분자의 곱이 ${nj(P, "입니다", "입니다")}.`,
    `곱이 ${nj(P, "인", "인")} 두 수의 짝은 ${w4PairList(all)}입니다.`,
    `앞의 분자는 ${nj(t.d1, "보다", "보다")}, 뒤의 분자는 ${nj(t.d2, "보다", "보다")} 작아야 하므로 짝은 ${expr(`\\frac{${t.a}}{${t.d1}}\\times\\frac{${t.b}}{${t.d2}}=${w4FracText(P, t.d1 * t.d2)}`)}뿐입니다. 분자의 합은 ${expr(`${t.a}+${t.b}=${t.a + t.b}`)}입니다.`,
  ]);
}

/* ── 2-2-3 심화상 — 「곱을 실제로 약분해 봐야 갈린다」 ──
 *
 * 🔴 심화중과 갈리는 문장: 진분수 조건만으로는 짝이 **둘 이상** 남고, 남은 짝마다
 *    **곱해서 간단히 해 봐야** 분모가 맞는 것 하나가 남는다(D-115 ⑾ → 심화상).
 *    발문은 곱한 값을 안 준다 — 준다면 심화중과 같은 문항이 된다.
 */

/**
 * 🔴 **한 진분수를 지면에 실어 준다.** 처음 판은 두 분모와 «간단히 한 분모»만 주고
 *    분수를 한 개도 안 실었는데, `probe-elem-section-conditions` 가 그것을 잡았다 —
 *    이 소단원의 이름이 「진분수의 곱셈」이라 **발문에 진분수가 있어야** 한다.
 *    한쪽을 실어도 답은 안 새어 나간다: 곱한 값을 안 주므로 나머지 분자는
 *    **짝마다 곱해서 간단히 해 봐야** 갈린다(D-115 ⑾ → 심화상).
 */
function w4MulTop223(): W4Mul3Task[] {
  const out: W4Mul3Task[] = [];
  for (let d1 = 6; d1 <= 12; d1 += 1)
    for (let d2 = 4; d2 <= 12; d2 += 1) {
      if (d1 === d2) continue;
      const D0 = d1 * d2;
      for (let a = 2; a < d1; a += 1)
        for (let b = 2; b < d2; b += 1) {
          if (gcd(a, d1) !== 1 || gcd(b, d2) !== 1) continue;
          const den = simplify(a * b, D0)[1];
          // 마디가 열려야 한다 — 지면이 준 진분수에 맞대어 볼 분자 후보가 넷 이상.
          if (d1 - 2 < 4) continue;
          // 그 후보 중 «간단히 한 분모»가 맞는 것이 하나여야 답이 선다.
          const live: number[] = [];
          for (let x = 2; x < d1; x += 1)
            if (simplify(x * b, D0)[1] === den) live.push(x);
          if (live.length !== 1) continue;
          out.push({ d1, d2, a, b });
        }
    }
  return out;
}

function mul223Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = (t: W4Mul3Task) => simplify(t.a * t.b, t.d1 * t.d2)[1];
  const content = (t: W4Mul3Task) =>
    `분모가 ${nj(t.d1, "인", "인")} 진분수와 ${frj(t.b, t.d2, "을", "를")} 곱했습니다. 곱한 값을 가장 간단한 분수로 나타내면 분모가 ${n(den(t))}입니다. 분모가 ${nj(t.d1, "인", "인")} 진분수의 분자를 구하시오. (분자는 ${nj(1, "보다", "보다")} 큽니다.)`;
  const pool = w2Pool("w4-223top", () =>
    w4MulTop223().filter((t) => !w3Bad(content(t), w2int(t.a))),
  );
  const t = w2Pick(unit, "심화상", rng, pool);
  const D0 = t.d1 * t.d2;
  // 표본은 **고루** 뽑는다 — 앞에서부터 자르면 늘 작은 분자만 보인다.
  const others: number[] = [];
  for (let x = 2; x < t.d1; x += 1) if (x !== t.a) others.push(x);
  const step = Math.max(1, Math.floor(others.length / 3));
  const some = others
    .filter((_, i) => i % step === 0)
    .slice(0, 3)
    .map((x) =>
      expr(
        `\\frac{${x}}{${t.d1}}\\times\\frac{${t.b}}{${t.d2}}=${w4FracText(x * t.b, D0)}`,
      ),
    );
  return makeDeep(unit, content(t), n(t.a), [
    `분자끼리, 분모끼리 곱하면 분모는 ${expr(`${t.d1}\\times${t.d2}=${D0}`)}입니다. 그런데 곱한 값을 간단히 하면 분모가 달라지므로, 분자를 하나씩 넣어 곱해 보아야 합니다.`,
    `${some.join(", ")} 처럼 간단히 한 분모가 ${nj(den(t), "이", "가")} 아닌 것은 답이 될 수 없습니다.`,
    `${expr(`\\frac{${t.a}}{${t.d1}}\\times\\frac{${t.b}}{${t.d2}}=${w4FracText(t.a * t.b, D0)}`)}만 분모가 ${nj(den(t), "이므로", "이므로")} 분모가 ${nj(t.d1, "인", "인")} 진분수의 분자는 ${n(t.a)}입니다.`,
  ]);
}

/* ── 2-2-4 심화중 — 「곱한 자연수를 안 말한다 / «대분수다»가 굳힌다」 ── */

type W4Mix4Task = { b: number; p: number; k: number };

/**
 * 곱이 `P` 인 짝 `(가분수 분자, 자연수)` 중 «대분수 · 한 자리 자연수»를 지키는 것.
 *
 * 🔴 굳히는 성질은 **「대분수를 가분수로 고치면 분자가 분모보다 크다」**다.
 *    처음엔 「분모의 배수면 자연수가 되니 못 쓴다」로 잡았는데, 처음 분수가 기약이면
 *    (`gcd(p,b)=1`) 그런 후보가 **구조적으로 하나도 안 생겨** 풀이 통째로 비었다 —
 *    분모의 배수인 분자가 있으려면 곱한 자연수가 분모의 배수여야 하고, 그러면
 *    곱한 결과가 자연수가 되어 이 소단원의 대분수 규약이 깨진다.
 */
function w4MixedPairs(P: number, b: number): [number, number][] {
  const out: [number, number][] = [];
  for (const d of divisors(P)) {
    const e = P / d;
    if (d > b && e >= 2 && e <= 9) out.push([d, e]);
  }
  return out;
}

function w4Mix224(): W4Mix4Task[] {
  const out: W4Mix4Task[] = [];
  for (let b = 3; b <= 9; b += 1)
    for (let p = b + 1; p <= 5 * b; p += 1) {
      if (p % b === 0) continue; // 대분수여야 한다
      if (gcd(p, b) !== 1) continue; // 분수부가 기약이어야 지면이 깨끗하다
      for (let k = 2; k <= 9; k += 1) {
        if (p * k > 200) continue;
        // 🔴 곱한 결과도 **대분수**여야 한다 — 이 소단원은 발문에 대분수가 있어야 하고
        //    (`elemTiersG5.test.ts`), 자연수로 떨어지면 그 규약이 깨진다.
        if ((p * k) % b === 0) continue;
        // 마디가 열려야 한다 — 한 자리 자연수인 짝이 둘 이상이어야 «대분수다»가
        // 실제로 하나를 지운다.
        if (w4OneDigitPairs(p * k).length < 2) continue;
        if (w4MixedPairs(p * k, b).length !== 1) continue;
        out.push({ b, p, k });
      }
    }
  return out;
}

function mix224Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W4Mix4Task) =>
    `분모가 ${nj(t.b, "인", "인")} 대분수에 한 자리 자연수를 곱했더니 ${lj(w4FracText(t.p * t.k, t.b), "이", "가")} 되었습니다. 처음 대분수를 가분수로 나타내면 분자는 얼마입니까?`;
  // 🔴 묻는 것을 «자연수 부분»에서 «가분수의 분자»로 바꿨다 — 답의 폭 때문이다.
  //    「한 자리 자연수인 짝 중 분자가 분모보다 큰 것이 하나」라는 조건이 곱을 작게
  //    묶어서, 자연수 부분이 실측 500씨앗에서 **두 가지(최빈 92.6%)** 밖에 안 나왔다.
  //    기존 시험 「답의 가짓수 ≥4 · 최빈 ≤45%」가 그것을 잡았다.
  const pool = w2Pool("w4-224mid", () =>
    w4Mix224().filter((t) => !w3Bad(content(t), w2int(t.p))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  const P = t.p * t.k;
  const all = w4OneDigitPairs(P);
  const stem = content(t).replace(
    "한 자리 자연수",
    `${n(1)}보다 큰 한 자리 자연수`,
  );
  return makeDeep(unit, stem, n(t.p), [
    `대분수를 가분수로 고쳐 분자에 자연수를 곱하므로, 곱한 결과를 분모가 ${nj(t.b, "인", "인")} 가분수로 고치면 ${expr(`${w4FracText(P, t.b)}=\\frac{${P}}{${t.b}}`)}입니다. 곧 처음 대분수를 고친 가분수의 분자와 곱한 자연수의 곱이 ${nj(P, "입니다", "입니다")}.`,
    `자연수가 ${n(1)}보다 큰 한 자리 수인 (가분수의 분자, 자연수) 짝은 ${w4PairList(all)}입니다. 처음 수가 대분수이므로 가분수로 고치면 분자가 분모 ${nj(t.b, "보다", "보다")} 커야 하고, 그런 짝은 하나뿐입니다.`,
    `그 짝은 ${lj(`\\frac{${t.p}}{${t.b}}`, "이", "가")} 되고, 대분수로 고치면 ${lj(fracLatex(t.p, t.b), "이", "가")} 됩니다. 검산하면 ${expr(`\\frac{${t.p}}{${t.b}}\\times${t.k}=${w4FracText(P, t.b)}`)}이므로 가분수의 분자는 ${n(t.p)}입니다.`,
  ]);
}

/* ────────── 2-5 직육면체 — 확대 갈래 ──────────
 *
 * 굳힘 축(예약): **「평행한 두 면은 합동」**(2-5-3) · **「겨냥도의 보이는 아홉은 세 모서리
 * 합의 $3$배, 모든 모서리는 $4$배」**(2-5-4). 마디를 여는 것: **넓이의 인수 짝** ·
 * **그 합이 어느 무리의 것인지 안 말한다**.
 *
 * ⚠️ 이 대단원의 규약(토대 17 §3 함정 · `elemTiersG5.test.ts`):
 *    ㉠ **겉넓이·부피는 초6** — 낱말도 못 쓴다.
 *    ㉡ **2-5-1·2-5-2 는 «한 면의 넓이·둘레»를 통째로 안 쓴다**(초5 1-6 과 겹친다).
 *       그래서 넓이를 재료로 쓰는 갈래는 2-5-3·2-5-6 에만 두었다.
 *    ㉢ **개수는 한글로 적는다** — 「$4$개」의 `4` 가 지면 수가 되어 반증 ⑥ 이 오작동한다.
 *    ㉣ 꼭짓점 이름이 없으므로 면·모서리는 **치수로** 지목한다.
 *
 * 🔴 **아홉 칸을 비웠다.** 2-5-1·2-5-2·2-5-5 여섯 · 2-5-3 상 · 2-5-4 상 · 2-5-6 중.
 *    · 2-5-2·2-5-5(정육면체)는 되짚을 값이 **한 모서리 하나**뿐이라 인수 짝이 안 생긴다
 *      (토대 17 §2.1 ⑶). 나눗수 $12$·$14$ 는 지면에 없어 자도 못 본다.
 *    · 2-5-1 은 위 ㉡ 때문에 넓이를 못 쓰고, 모서리만으로는 심화하(「가로는 세로의 $k$배」)와
 *      같은 자리에 선다.
 *    · 2-5-6 심화중은 심화하가 이미 「가로를 주고 두 넓이로 나눈다」를 쓴다 — 그 사이에
 *      설 자리가 없다(넓이를 둘만 주면 답이 넷까지 남고, 좁히는 것은 창뿐인데 그건 파일럿 축이다).
 */

/* ── 2-5-3 심화중 — 「어느 두 모서리가 같은지 안 말한다」 ──
 *
 * 마디: 넓이 $A$ 의 **인수 짝**(어느 것이 그 면의 가로·세로인가).
 * 굳힘: 「평행한 두 면은 합동」이라 넓이가 같은 면이 네 개면 **두 모서리가 같고**,
 *       나머지 두 면은 그 두 모서리로 된 **정사각형**이다 — 같은 수를 두 번 곱해
 *       $B$ 가 되는 수 하나가 곧바로 정해진다(계산 끝까지 안 간다 → 심화중).
 */

type W4CubTask = { w: number; x: number };

function w4Cub253(): W4CubTask[] {
  const out: W4CubTask[] = [];
  for (let x = 2; x <= 9; x += 1)
    for (let w = 2; w <= 12; w += 1) {
      if (w === x) continue; // 정육면체가 되면 「네 개」가 거짓이다
      if (w * x > 96 || x * x > 96) continue;
      if ((w + 2 * x) * 4 > 140) continue;
      out.push({ w, x });
    }
  return out;
}

function cub253Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W4CubTask) =>
    `직육면체에서 넓이가 ${n(t.w * t.x)} cm²인 면이 ${W2_COUNT[4]!} 개이고, 나머지 ${W2_COUNT[2]!} 면의 넓이는 ${n(t.x * t.x)} cm²입니다. 이 직육면체의 모든 모서리 길이의 합은 몇 cm입니까?`;
  const pool = w2Pool("w4-253mid", () =>
    w4Cub253().filter((t) => !w3Bad(content(t), w2int((t.w + 2 * t.x) * 4))),
  );
  const t = w2Pick(unit, "심화중", rng, pool);
  const sum3 = t.w + 2 * t.x;
  return makeDeep(unit, content(t), n(sum3 * 4), [
    `직육면체에서 평행한 두 면은 모양과 크기가 같으므로 넓이가 같은 면은 ${W2_COUNT[2]!} 개씩 세 쌍입니다. 넓이가 같은 면이 ${W2_COUNT[4]!} 개이면 세 모서리 중 ${W2_COUNT[2]!} 모서리의 길이가 같습니다.`,
    `나머지 ${W2_COUNT[2]!} 면은 그 같은 두 모서리로 이루어진 정사각형입니다. 같은 수를 두 번 곱해 ${nj(t.x * t.x, "이", "가")} 되는 수는 ${nj(t.x, "이므로", "이므로")} 같은 두 모서리는 ${expr(`${t.x}\\times${t.x}=${t.x * t.x}`)}에서 ${n(t.x)} cm입니다.`,
    `나머지 한 모서리는 ${expr(`${t.w * t.x}\\div${t.x}=${t.w}`)}에서 ${n(t.w)} cm입니다. 모든 모서리는 세 방향으로 ${W2_COUNT[4]!} 개씩이므로 ${expr(`(${t.w}+${t.x}+${t.x})\\times4=${sum3 * 4}`)}, 곧 ${n(sum3 * 4)} cm입니다.`,
  ]);
}

/* ── 2-5-4 심화중 — 「그 합이 어느 무리의 것인지 안 말한다」 ──
 *
 * 마디: 지면의 합이 **보이는 아홉 개**의 것인가 **모든 열두 개**의 것인가(후보 둘).
 * 굳힘: 보이는 아홉은 세 모서리 합의 $3$배, 모든 모서리는 $4$배다 —
 *       세 모서리의 합이 자연수여야 하므로 **나누어떨어지는 쪽**만 산다(→ 심화중).
 */

type W4SeeTask = { T: number; nine: boolean };

function w4See254(): W4SeeTask[] {
  const out: W4SeeTask[] = [];
  for (let T = 6; T <= 30; T += 1) {
    // 두 후보 중 **하나만** 나누어떨어져야 한다.
    for (const nine of [true, false]) {
      const S = nine ? T * 3 : T * 4;
      const byNine = S % 3 === 0;
      const byAll = S % 4 === 0;
      if (byNine === byAll) continue;
      out.push({ T, nine });
    }
  }
  return out;
}

function cub254Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const total = (t: W4SeeTask) => (t.nine ? t.T * 3 : t.T * 4);
  const content = (t: W4SeeTask) =>
    `어떤 직육면체의 겨냥도에서 보이는 모서리 아홉 개의 길이의 합과 이 직육면체의 모든 모서리 길이의 합 중 하나가 ${n(total(t))} cm입니다. 세 모서리의 길이가 모두 자연수 cm일 때, 보이지 않는 모서리 세 개의 길이의 합은 몇 cm입니까?`;
  const pool = w2Pool("w4-254mid", () =>
    w4See254().filter((t) => !w3Bad(content(t), w2int(t.T))),
  );
  const wantNine = altCase(rng);
  const half = pool.filter((x) => x.nine === wantNine);
  const t = w2Pick(unit, "심화중", rng, half.length > 0 ? half : pool);
  const S = total(t);
  const dead = t.nine
    ? `${nj(S, "이", "가")} 모든 모서리 길이의 합이라면 ${lj(`${S}\\div4`, "은", "는")} 나누어떨어지지 않으므로 쓸 수 없습니다.`
    : `${nj(S, "이", "가")} 보이는 아홉 개의 합이라면 ${lj(`${S}\\div3`, "은", "는")} 나누어떨어지지 않으므로 쓸 수 없습니다.`;
  return makeDeep(unit, content(t), n(t.T), [
    `보이지 않는 모서리 세 개는 가로·세로·높이 방향으로 하나씩이므로 그 합은 세 모서리의 합입니다. 보이는 아홉 개는 세 방향으로 ${W2_COUNT[3]!} 개씩이라 그 ${W2_COUNT[3]!} 배이고, 모든 모서리 열두 개는 ${W2_COUNT[4]!} 배입니다.`,
    dead,
    `그러므로 ${nj(S, "은", "는")} ${t.nine ? "보이는 아홉 개" : "모든 모서리"}의 합이고, 보이지 않는 세 모서리의 합은 ${expr(`${S}\\div${t.nine ? 3 : 4}=${t.T}`)}에서 ${n(t.T)} cm입니다. 검산하면 ${expr(`${t.T}\\times${t.nine ? 3 : 4}=${S}`)}입니다.`,
  ]);
}

/* ── 2-5-6 심화상 — 「세 넓이가 서로 얽힌다」 ──
 *
 * 🔴 토대 17 §2.1 이 「가장 튼튼한 자리 셋」으로 꼽은 자리다 — **3차원에만 있고**
 *    파일럿 2-4 의 «창»과 겹치지 않는다. 한 넓이의 인수 짝을 되짚기가 만들고,
 *    짝마다 **나머지 두 면의 넓이를 실제로 곱해 봐야** 하나가 남는다(→ 심화상).
 */

type W4NetTask = { w: number; d: number; h: number };

function w4Net256(): W4NetTask[] {
  const out: W4NetTask[] = [];
  for (let w = 2; w <= 9; w += 1)
    for (let d = w + 1; d <= 10; d += 1)
      for (let h = d + 1; h <= 12; h += 1) {
        if (w * d > 96 || w * h > 96 || d * h > 96) continue;
        if ((w + d + h) * 4 > 140) continue;
        // 마디가 열려야 한다 — 첫 넓이의 인수 짝이 여럿이어야 「만들어 견주기」가 산다.
        if (w2Pairs(w * d).length < 2) continue;
        out.push({ w, d, h });
      }
  return out;
}

function net256Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const content = (t: W4NetTask) =>
    `어떤 직육면체의 전개도에서 세 가지 면의 넓이가 ${nums([t.w * t.d, t.w * t.h, t.d * t.h])} cm²입니다. 이 전개도를 접어 만든 직육면체의 모든 모서리 길이의 합은 몇 cm입니까?`;
  const pool = w2Pool("w4-256top", () =>
    w4Net256().filter((t) => !w3Bad(content(t), w2int((t.w + t.d + t.h) * 4))),
  );
  const t = w2Pick(unit, "심화상", rng, pool);
  const A = t.w * t.d;
  const B = t.w * t.h;
  const C = t.d * t.h;
  const sum3 = t.w + t.d + t.h;
  // 표본은 **답에 가까운 짝부터** 둘만 보인다 — `(1, A)` 같은 짝을 그대로 보이면
  // 검산 곱이 네 자리로 커져 지면이 규모 축으로 읽힌다.
  const tried = w2Pairs(A)
    .filter(([p]) => p !== t.w)
    .sort((x, y) => Math.abs(x[0] - t.w) - Math.abs(y[0] - t.w))
    .slice(0, 2)
    .map(([p, q]) => {
      const hh = B % p === 0 ? B / p : null;
      return hh === null
        ? `모서리가 ${nums([p, q])}이면 ${lj(`${B}\\div${p}`, "은", "는")} 나누어떨어지지 않아 남은 모서리를 못 만듭니다.`
        : `모서리가 ${nums([p, q])}이면 남은 모서리는 ${expr(`${B}\\div${p}=${hh}`)}인데 ${lj(`${q}\\times${hh}=${q * hh}`, "이라", "라")} ${nj(C, "이", "가")} 되지 않습니다.`;
    });
  return makeDeep(unit, content(t), n(sum3 * 4), [
    `한 면의 넓이는 두 모서리의 곱입니다. 넓이가 ${nj(A, "인", "인")} 면의 두 모서리를 먼저 정해 보면 곱이 ${nj(A, "인", "인")} 짝은 ${w4PairList(w2Pairs(A))}입니다.`,
    `짝마다 나머지 두 면의 넓이를 만들어 봅니다. ${tried.join(" ")}`,
    `모서리가 ${nums([t.w, t.d])}이면 남은 모서리는 ${expr(`${B}\\div${t.w}=${t.h}`)}이고 ${lj(`${t.d}\\times${t.h}=${C}`, "이라", "라")} 세 넓이가 모두 맞습니다.`,
    `세 모서리는 ${nums([t.w, t.d, t.h])} cm이고 각각 ${W2_COUNT[4]!} 개씩이므로 ${expr(`(${t.w}+${t.d}+${t.h})\\times4=${sum3 * 4}`)}, 곧 ${n(sum3 * 4)} cm입니다.`,
  ]);
}

/**
 * 난이도 갈래 (D-71 파일럿 + D-72 확대) — 키는 `tierKey` 형식(`"초5|1-6-2"`), 값은 넷 전부.
 * 축은 D-72 확정판(연산=절차 한 번 · 기본=식을 스스로 · 응용=두 단계 · 심화=역산·조건 조합).
 *
 * ⚠️ **이웃 소단원과 닮지 않게** 짰다(D-66 ⑸). 1-6-1 응용은 둘레→**길이**, 1-6-2 응용은
 * 둘레→**넓이**다. 1-6-1 기본은 **문장** 한 겹, 1-6-2·1-6-4·1-6-5 기본은 **그림** 한 겹이다.
 */
export const G5_TIERS: ElemTierMap = {
  "초5|1-1-1": {
    연산: mix111Calc,
    기본: mix111Read,
    응용: mix111Apply,
    심화하: mix111Deep,
  },
  "초5|1-1-2": {
    연산: mix112Calc,
    기본: mix112Read,
    응용: mix112Apply,
    심화하: mix112Deep,
    심화중: mix112Mid,
  },
  "초5|1-1-3": {
    연산: mix113Calc,
    기본: mix113Read,
    응용: mix113Apply,
    심화하: mix113Deep,
    심화중: mix113Mid,
    심화상: mix113Top,
  },
  "초5|1-2-1": {
    연산: fac121Calc,
    기본: fac121Read,
    응용: fac121Apply,
    심화하: fac121Deep,
    심화중: fac121Mid,
    심화상: fac121Top,
  },
  "초5|1-2-2": {
    연산: rel122Calc,
    기본: rel122Read,
    응용: rel122Apply,
    심화하: rel122Deep,
  },
  "초5|1-2-3": {
    연산: comdiv123Calc,
    기본: comdiv123Read,
    응용: comdiv123Apply,
    심화하: comdiv123Deep,
  },
  "초5|1-2-4": {
    연산: gcd124Calc,
    기본: gcd124Read,
    응용: gcd124Apply,
    심화하: gcd124Deep,
    심화중: gcd124Mid,
    심화상: gcd124Top,
  },
  "초5|1-2-5": {
    연산: commul125Calc,
    기본: commul125Read,
    응용: commul125Apply,
    심화하: commul125Deep,
  },
  "초5|1-2-6": {
    연산: lcm126Calc,
    기본: lcm126Read,
    응용: lcm126Apply,
    심화하: lcm126Deep,
    심화중: lcm126Mid,
    심화상: lcm126Top,
  },
  "초5|1-3-1": {
    연산: corr131Calc,
    기본: corr131Read,
    응용: corr131Apply,
    심화하: corr131Deep,
    심화중: corr131Mid,
  },
  "초5|1-3-2": {
    연산: corr132Calc,
    기본: corr132Read,
    응용: corr132Apply,
    심화하: corr132Deep,
    심화중: corr132Mid,
    심화상: corr132Top,
  },
  "초5|1-3-3": {
    연산: corr133Calc,
    기본: corr133Read,
    응용: corr133Apply,
    심화하: corr133Deep,
  },
  "초5|1-4-1": {
    연산: eq141Calc,
    기본: eq141Read,
    응용: eq141Apply,
    심화하: eq141Deep,
  },
  "초5|1-4-2": {
    연산: sim142Calc,
    기본: sim142Read,
    응용: sim142Apply,
    심화하: sim142Deep,
    심화중: red142Mid,
  },
  "초5|1-4-3": {
    연산: com143Calc,
    기본: com143Read,
    응용: com143Apply,
    심화하: com143Deep,
    심화중: com143Mid,
    심화상: com143Top,
  },
  "초5|1-4-4": {
    연산: cmp144Calc,
    기본: cmp144Read,
    응용: cmp144Apply,
    심화하: cmp144Deep,
  },
  "초5|1-4-5": {
    연산: fd145Calc,
    기본: fd145Read,
    응용: fd145Apply,
    심화하: fd145Deep,
  },
  "초5|1-5-1": {
    연산: add151Calc,
    기본: add151Read,
    응용: add151Apply,
    심화하: add151Deep,
    심화중: add151Mid,
  },
  "초5|1-5-2": {
    연산: add152Calc,
    기본: add152Read,
    응용: add152Apply,
    심화하: add152Deep,
  },
  "초5|1-5-3": {
    연산: sub153Calc,
    기본: sub153Read,
    응용: sub153Apply,
    심화하: sub153Deep,
    심화중: sub153Mid,
    심화상: sub153Top,
  },
  "초5|1-5-4": {
    연산: sub154Calc,
    기본: sub154Read,
    응용: sub154Apply,
    심화하: sub154Deep,
    심화중: sub154Mid,
    심화상: sub154Top,
  },
  "초5|2-1-1": {
    연산: rng211Calc,
    기본: rng211Read,
    응용: rng211Apply,
    심화하: rng211Deep,
    심화중: rng211Mid,
  },
  "초5|2-1-2": {
    연산: rng212Calc,
    기본: rng212Read,
    응용: rng212Apply,
    심화하: rng212Deep,
  },
  "초5|2-1-3": {
    연산: rng213Calc,
    기본: rng213Read,
    응용: rng213Apply,
    심화하: rng213Deep,
  },
  "초5|2-1-4": {
    연산: up214Calc,
    기본: up214Read,
    응용: up214Apply,
    심화하: up214Deep,
    심화중: up214Mid,
    심화상: up214Top,
  },
  "초5|2-1-5": {
    연산: down215Calc,
    기본: down215Read,
    응용: down215Apply,
    심화하: down215Deep,
  },
  "초5|2-1-6": {
    연산: round216Calc,
    기본: round216Read,
    응용: round216Apply,
    심화하: round216Deep,
    심화중: round216Mid,
    심화상: round216Top,
  },
  "초5|2-2-1": {
    연산: fm221Calc,
    기본: fm221Read,
    응용: fm221Apply,
    심화하: fm221Deep,
    심화중: mul221Mid,
  },
  "초5|2-2-2": {
    연산: fm222Calc,
    기본: fm222Read,
    응용: fm222Apply,
    심화하: fm222Deep,
    심화중: mul222Mid,
  },
  "초5|2-2-3": {
    연산: fm223Calc,
    기본: fm223Read,
    응용: fm223Apply,
    심화하: fm223Deep,
    심화중: mul223Mid,
    심화상: mul223Top,
  },
  "초5|2-2-4": {
    연산: fm224Calc,
    기본: fm224Read,
    응용: fm224Apply,
    심화하: fm224Deep,
    심화중: mix224Mid,
  },
  // ⚠️ 이 일곱만 여섯 갈래다 — D-113 파일럿(2026-08-30). 나머지 초5 49개는 핵심 넷.
  //    원장님이 `/dev/tier-bench/g5` 에서 잣대를 확정하신 뒤에 나머지를 채운다.
  "초5|2-4-1": {
    연산: dm241Calc,
    기본: dm241Read,
    응용: dm241Apply,
    심화하: dm241Deep,
    심화중: dm241Mid,
    심화상: dm241Top,
  },
  "초5|2-4-2": {
    연산: dm242Calc,
    기본: dm242Read,
    응용: dm242Apply,
    심화하: dm242Deep,
    심화중: dm242Mid,
    심화상: dm242Top,
  },
  "초5|2-4-3": {
    연산: dm243Calc,
    기본: dm243Read,
    응용: dm243Apply,
    심화하: dm243Deep,
    심화중: dm243Mid,
    심화상: dm243Top,
  },
  "초5|2-4-4": {
    연산: dm244Calc,
    기본: dm244Read,
    응용: dm244Apply,
    심화하: dm244Deep,
    심화중: dm244Mid,
    심화상: dm244Top,
  },
  "초5|2-4-5": {
    연산: dm245Calc,
    기본: dm245Read,
    응용: dm245Apply,
    심화하: dm245Deep,
    심화중: dm245Mid,
    심화상: dm245Top,
  },
  "초5|2-4-6": {
    연산: dm246Calc,
    기본: dm246Read,
    응용: dm246Apply,
    심화하: dm246Deep,
    심화중: dm246Mid,
    심화상: dm246Top,
  },
  "초5|2-4-7": {
    연산: dm247Calc,
    기본: dm247Read,
    응용: dm247Apply,
    심화하: dm247Deep,
    심화중: dm247Mid,
    심화상: dm247Top,
  },
  "초5|2-6-1": {
    연산: avg261Calc,
    기본: avg261Read,
    응용: avg261Apply,
    심화하: avg261Deep,
    심화중: avg261Mid,
  },
  "초5|2-6-2": {
    연산: avg262Calc,
    기본: avg262Read,
    응용: avg262Apply,
    심화하: avg262Deep,
    심화중: avg262Mid,
  },
  "초5|2-6-3": {
    연산: pos263Calc,
    기본: pos263Read,
    응용: pos263Apply,
    심화하: pos263Deep,
    심화중: pos263Mid,
    심화상: pos263Top,
  },
  "초5|2-3-1": {
    연산: cong231Calc,
    기본: cong231Read,
    응용: cong231Apply,
    심화하: cong231Deep,
  },
  "초5|2-3-2": {
    연산: cong232Calc,
    기본: cong232Read,
    응용: cong232Apply,
    심화하: cong232Deep,
  },
  "초5|2-3-3": {
    연산: sym233Calc,
    기본: sym233Read,
    응용: sym233Apply,
    심화하: sym233Deep,
  },
  "초5|2-3-4": {
    연산: sym234Calc,
    기본: sym234Read,
    응용: sym234Apply,
    심화하: sym234Deep,
    심화중: sym234Mid,
  },
  "초5|2-5-1": {
    연산: boxRectCalc,
    기본: boxRectRead,
    응용: boxRectApply,
    심화하: boxRectDeep,
  },
  "초5|2-5-2": {
    연산: boxCubeCalc,
    기본: boxCubeRead,
    응용: boxCubeApply,
    심화하: boxCubeDeep,
  },
  "초5|2-5-3": {
    연산: box253Calc,
    기본: box253Read,
    응용: box253Apply,
    심화하: box253Deep,
    심화중: cub253Mid,
  },
  "초5|2-5-4": {
    연산: box254Calc,
    기본: box254Read,
    응용: box254Apply,
    심화하: box254Deep,
    심화중: cub254Mid,
  },
  "초5|2-5-5": {
    연산: net255Calc,
    기본: net255Read,
    응용: net255Apply,
    심화하: net255Deep,
  },
  "초5|2-5-6": {
    연산: net256Calc,
    기본: net256Read,
    응용: net256Apply,
    심화하: net256Deep,
    심화상: net256Top,
  },
  "초5|1-6-1": {
    연산: per61Calc,
    기본: per61Read,
    응용: per61Apply,
    심화하: per61Deep,
    심화중: per61Mid,
    심화상: per61Top,
  },
  "초5|1-6-3": {
    연산: unit63Calc,
    기본: unit63Read,
    응용: unit63Apply,
    심화하: unit63Deep,
  },
  "초5|1-6-4": {
    연산: area64Calc,
    기본: area64Read,
    응용: area64Apply,
    심화하: area64Deep,
    심화중: area64Mid,
    심화상: area64Top,
  },
  "초5|1-6-5": {
    연산: area65Calc,
    기본: area65Read,
    응용: area65Apply,
    심화하: area65Deep,
    심화중: area65Mid,
    심화상: area65Top,
  },
  "초5|1-6-2": {
    연산: area62Calc,
    기본: area62Read,
    응용: area62Apply,
    심화하: area62Deep,
    심화상: area62Top,
  },
};
