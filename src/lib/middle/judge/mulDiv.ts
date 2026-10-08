/**
 * ① 중1 «유리수의 곱셈» · «유리수의 나눗셈» — **계산 판정** 객관식 (2026-10-08 엔진 보강 2단계).
 *
 *   «다음 중 계산이 옳지 않은 것은?» · «다음 중 계산이 옳은 것은?»
 *   ① $\left(+\dfrac{2}{3}\right)\times\left(-\dfrac{9}{4}\right)=-\dfrac{3}{2}$  …
 *
 * 문형과 짓기는 1단계(덧셈 · 뺄셈)와 **같다** — `calcJudge.ts` 의 `buildTruthBody`. 여기 있는 것은 네 연산의
 * 사정뿐이다: 원천 유형에서 식을 읽는 어댑터 · 식의 글 · 풀이 · **그 연산의 실제 실수**.
 *
 * | 문항류 | 차시 | 원천(같은 유형 · 같은 꼴) |
 * |---|---|---|
 * | `calc-mul2` 두 유리수의 곱셈 | 유리수의 곱셈 | 12 유리수의 곱셈 |
 * | `calc-pow` 거듭제곱이 든 곱셈 | 유리수의 곱셈 | 15 거듭제곱의 계산 |
 * | `calc-div2` 두 유리수의 나눗셈 | 유리수의 나눗셈 | 19 유리수의 나눗셈 |
 * | `calc-muldiv` 곱셈과 나눗셈의 혼합 | 유리수의 나눗셈 | 20 곱셈과 나눗셈의 혼합 계산 |
 *
 * ## 재료는 원천 유형을 그대로 불러 얻는다
 *
 * 완성된 발문을 정규식으로 잘라 쓰지 않는다 — `facts` 에서 수를 읽어 식을 다시 세우고, 세운 식을 다시 계산해
 * `facts` 의 답과 다르면 던진다. 보기의 왼쪽 식은 원천 발문의 식과 **글자까지 같다**(시험이 맞댄다).
 *
 * ## 틀린 값 — 그 연산의 실제 실수에서
 *
 *   곱셈      약분할 때 한쪽만 나눔 · 정수를 분자 · 분모에 모두 곱함 · (분모가 같을 때) 분모는 안 곱하고 분자끼리만 곱함
 *   나눗셈    나누는 수를 역수로 바꾸지 않고 곱함 · 나누어지는 수의 역수를 곱함
 *   거듭제곱  분수의 분자만 거듭제곱함 · 밑과 지수를 곱함
 *   부호      결과의 부호를 반대로 씀 — 거듭제곱이 든 식에서는 까닭을 더 좁혀 적는다(음수의 거듭제곱의 부호를
 *             반대로 정함 · 거듭제곱 앞의 부호를 빠뜨림). 어느 것이든 한 문항에 하나까지이고, **음수가 하나도
 *             없는 식에는 붙이지 않는다**(양수끼리의 곱을 음수로 적은 보기는 계산 없이 지워진다)
 *   공용      공용 오답 자리(`numericMistakes`)
 *
 * 어느 것도 «거짓이다»의 보증이 아니다 — 후보는 교차곱으로 거르고, 지면은 등록부가 `equationTruth` 로 다시 잰다.
 */
import { intBetween } from "../../elementary/rng";
import type { Rng } from "../../elementary/types";
import { generateMiddleProblem } from "../generate";
import { m1Rational, type M1Q as Q } from "../m1Calc";

import {
  buildTruthBody,
  CALC_STYLE,
  sameValue,
  type Material,
  type MaterialDraw,
  type Mistake,
} from "./calcJudge";
import type { JudgeDefinition } from "./contract";
import { equationTruth } from "./texArith";

const { q, mulQ, divQ, negQ, powQ, texQ, absTex, texSigned } = m1Rational;

const GRADE = "중1";
const SEC = { 곱: "유리수의 곱셈", 나눗: "유리수의 나눗셈" } as const;
export const MUL_DIV_SRC = {
  곱셈: "1-1|정수와 유리수의 계산|12",
  거듭제곱: "1-1|정수와 유리수의 계산|15",
  나눗셈: "1-1|정수와 유리수의 계산|19",
  혼합: "1-1|정수와 유리수의 계산|20",
} as const;

const SIGN_FLIP = "결과의 부호를 반대로 씀";
/** 밑이 음수인 거듭제곱의 부호(지수의 홀짝)를 거꾸로 정했다 — 결과의 부호가 뒤집힌다. */
const POWER_SIGN = "음수의 거듭제곱의 부호를 반대로 정함";
/** 괄호 밖의 $-$ 를 빠뜨렸다 — 밑이 모두 양수일 때 결과의 부호가 뒤집히는 길은 이것뿐이다. */
const OUTER_SIGN = "거듭제곱 앞의 부호를 빠뜨림";
const NUMERATOR_ONLY = "분수의 분자만 거듭제곱함";
const BASE_TIMES_EXPONENT = "밑과 지수를 곱함";
const NO_RECIPROCAL = "나누는 수를 역수로 바꾸지 않고 곱함";

/**
 * 결과의 부호를 반대로 — **부호를 틀릴 자리가 있는 식에만** 붙인다(`reason` 이 null 이면 없다).
 * 음수가 하나도 없는 식의 결과를 음수로 적은 보기는 계산 없이 지워진다 — 틀린 보기가 아니라 빈 보기다.
 */
const signFlip = (value: Q, reason: string | null): Mistake[] =>
  reason === null ? [] : [{ value: negQ(value), reason, kind: "부호" }];
/** 두 수 가운데 음수가 있나 — 곱 · 몫의 부호 규칙을 틀릴 자리. */
const signRule = (...vs: Q[]) => (vs.some((v) => v.n < 0) ? SIGN_FLIP : null);
const slip = (value: Q, reason: string): Mistake => ({
  value,
  reason,
  kind: "실수",
});

const HALF_CANCEL = "약분할 때 분자와 분모 가운데 한쪽만 나눔";

const kindOf = (v: Q) => (v.d === 1 ? "정수" : "분수");
function gcdOf(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}
/** 음수는 괄호로 두른다 — 곱셈 기호 뒤에 맨 음수가 오지 않게. */
const wrapNeg = (v: Q) => (v.n < 0 ? `\\left(${texQ(v)}\\right)` : texQ(v));
/** 역수 — 부호는 그대로. */
const inv = (v: Q) => divQ(q(1), v);

// ── 식 하나 → 재료 ────────────────────────────────────────────────────────

/** 두 유리수의 곱 `(±A)×(±B)`. */
export function mul2Material(a: Q, b: Q): Material {
  const value = mulQ(a, b);
  return {
    left: `${texSigned(a)}\\times${texSigned(b)}`,
    value,
    shape: `${[a, b].filter((v) => v.d !== 1).length}/2|${kindOf(value)}`,
    // 부호를 먼저 정하고 절댓값을 곱한다 — 교과서의 풀이 차례 그대로.
    work: () =>
      `부호를 정하고 절댓값을 곱하면 $${value.n < 0 ? "-" : "+"}\\left(${absTex(a)}\\times${absTex(b)}\\right)=${texQ(value)}$`,
    mistakes: () => {
      const out: Mistake[] = [];
      // ⑴ 정수 × 분수에서 정수를 분자와 분모에 모두 곱했다 — 값은 그 분수 그대로가 된다.
      const ints = [a, b].filter((v) => v.d === 1);
      if (ints.length === 1 && Math.abs(ints[0]!.n) >= 2) {
        const frac = a.d === 1 ? b : a;
        const kept = q(Math.abs(frac.n), frac.d);
        out.push(
          slip(
            value.n < 0 ? negQ(kept) : kept,
            "정수를 분자와 분모에 모두 곱함",
          ),
        );
      }
      // ⑵ 분모가 같은 두 분수 — 덧셈처럼 분모는 두고 분자끼리만 곱했다.
      if (a.d !== 1 && a.d === b.d)
        out.push(slip(q(a.n * b.n, a.d), "분모는 곱하지 않고 분자끼리만 곱함"));
      // ⑶ 한 수의 분자와 다른 수의 분모를 약분하면서 한쪽만 나누었다 — 값이 그 공약수만큼 커지거나 작아진다.
      for (const [x, y] of [
        [a, b],
        [b, a],
      ] as const) {
        const g = gcdOf(x.n, y.d);
        if (g < 2) continue;
        out.push(slip(mulQ(value, q(g)), HALF_CANCEL));
        out.push(slip(divQ(value, q(g)), HALF_CANCEL));
      }
      out.push(...signFlip(value, signRule(a, b)));
      return out;
    },
    denominatorBound: a.d * b.d,
  };
}

/** 두 유리수의 나눗셈 `(±A)÷(±B)`. */
export function div2Material(a: Q, b: Q): Material {
  const value = divQ(a, b);
  return {
    left: `${texSigned(a)}\\div${texSigned(b)}`,
    value,
    shape: `${[a, b].filter((v) => v.d !== 1).length}/2|${kindOf(value)}`,
    work: () =>
      `나누는 수의 역수를 곱하면 $${texSigned(a)}\\times${texSigned(inv(b))}=${texQ(value)}$`,
    mistakes: () => [
      slip(mulQ(a, b), NO_RECIPROCAL),
      slip(divQ(b, a), "나누어지는 수의 역수를 곱함"),
      ...signFlip(value, signRule(a, b)),
    ],
    denominatorBound: a.d * Math.abs(b.n),
  };
}

/**
 * 거듭제곱이 든 곱셈 — `[-]\left(분수\right)^{e_1}\times 정수^{e_2}`(원천 15 의 꼴 그대로).
 * 밑이 양의 정수면 괄호를 두르지 않는다(원천이 `(5)^{2}` 를 안 찍는 것과 같다).
 */
export function powMaterial(
  base1: Q,
  e1: number,
  base2: Q,
  e2: number,
  outerMinus: boolean,
): Material {
  const p1 = powQ(base1, e1);
  const p2 = powQ(base2, e2);
  const outer = (v: Q) => (outerMinus ? negQ(v) : v);
  const value = outer(mulQ(p1, p2));
  const head = `\\left(${texQ(base1)}\\right)^{${e1}}`;
  const tail =
    base2.n < 0
      ? `\\left(${texQ(base2)}\\right)^{${e2}}`
      : `${texQ(base2)}^{${e2}}`;
  return {
    left: `${outerMinus ? "-" : ""}${head}\\times${tail}`,
    value,
    shape: kindOf(value),
    work: () =>
      `거듭제곱을 먼저 계산하면 $${outerMinus ? "-" : ""}${wrapNeg(p1)}\\times${wrapNeg(p2)}=${texQ(value)}$`,
    mistakes: () => [
      // ⑴ 괄호를 무시하고 분자만 거듭제곱했다 — $\left(\dfrac{2}{3}\right)^{2}$ 을 $\dfrac{4}{3}$ 으로.
      slip(outer(mulQ(q(base1.n ** e1, base1.d), p2)), NUMERATOR_ONLY),
      // ⑵ 거듭제곱을 «밑 × 지수»로 계산했다 — $3^{2}$ 을 $6$ 으로.
      slip(outer(mulQ(p1, q(base2.n * e2))), BASE_TIMES_EXPONENT),
      // ⑶ 부호 — 음수인 밑이 있으면 그 거듭제곱의 부호를, 없고 앞에 $-$ 가 있으면 그 부호를 틀린 것이다.
      //    둘 다 없으면(밑이 모두 양수 · 앞 부호 없음) 부호를 틀릴 자리가 없다.
      ...signFlip(
        value,
        base1.n < 0 || base2.n < 0
          ? POWER_SIGN
          : outerMinus
            ? OUTER_SIGN
            : null,
      ),
    ],
    denominatorBound: base1.d ** e1,
  };
}

/** 곱셈과 나눗셈의 혼합 — `\left(분수\right)^{e}\times(±M)\div(±V)`(원천 20 의 꼴 그대로). */
export function mulDivMaterial(base: Q, e: number, m: Q, v: Q): Material {
  const p = powQ(base, e);
  const value = divQ(mulQ(p, m), v);
  return {
    left: `\\left(${texQ(base)}\\right)^{${e}}\\times${texSigned(m)}\\div${texSigned(v)}`,
    value,
    shape: `${v.d === 1 ? "정수로" : "분수로"} 나눔|${kindOf(value)}`,
    work: () =>
      `거듭제곱을 계산하고 역수의 곱셈으로 고치면 $${wrapNeg(p)}\\times${texSigned(m)}\\times${texSigned(inv(v))}=${texQ(value)}$`,
    mistakes: () => [
      slip(mulQ(mulQ(p, m), v), NO_RECIPROCAL),
      slip(divQ(mulQ(q(base.n ** e, base.d), m), v), NUMERATOR_ONLY),
      ...signFlip(value, base.n < 0 ? POWER_SIGN : signRule(m, v)),
    ],
    denominatorBound: base.d ** e * Math.abs(v.n),
  };
}

// ── 원천 유형 → 재료 (어댑터) ────────────────────────────────────────────────

const fq = (f: Record<string, number>, p: string): Q => {
  const n = f[`${p}n`];
  const d = f[`${p}d`];
  if (n === undefined || d === undefined)
    throw new Error(`원천 유형의 facts 에 ${p}n · ${p}d 가 없다`);
  return q(n, d);
};
const fi = (f: Record<string, number>, name: string): number => {
  const v = f[name];
  if (v === undefined) throw new Error(`원천 유형의 facts 에 ${name} 이 없다`);
  return v;
};

/**
 * 원천 유형을 **그대로 불러** `facts` 에서 식을 세운다. 세운 식의 값이 `facts` 의 답(`answerPrefix`)과 다르면
 * 던진다 — 원천 생성기의 식과 어댑터의 식이 갈리면(인수 차례 · 부호 · 지수) 판정형이 엉뚱한 식을 지면에 찍는다.
 */
function fromSource(
  key: string,
  answerPrefix: string,
  build: (f: Record<string, number>) => Material,
): MaterialDraw {
  return (rng: Rng) => {
    const seed = intBetween(rng, 1, 2_000_000_000);
    const p = generateMiddleProblem(key, seed, 0);
    const m = build(p.facts);
    const answer = fq(p.facts, answerPrefix);
    if (!sameValue(m.value, answer))
      throw new Error(
        `원천 ${key} 의 facts 로 세운 식의 값(${texQ(m.value)})이 facts 의 답(${texQ(answer)})과 다르다`,
      );
    return m;
  };
}

export const drawMul2 = fromSource(MUL_DIV_SRC.곱셈, "p", (f) =>
  mul2Material(fq(f, "a"), fq(f, "b")),
);
export const drawPow = fromSource(MUL_DIV_SRC.거듭제곱, "p", (f) =>
  powMaterial(
    fq(f, "b1"),
    fi(f, "e1"),
    fq(f, "b2"),
    fi(f, "e2"),
    fi(f, "outerMinus") === 1,
  ),
);
export const drawDiv2 = fromSource(MUL_DIV_SRC.나눗셈, "s", (f) =>
  div2Material(fq(f, "a"), fq(f, "b")),
);
export const drawMulDiv = fromSource(MUL_DIV_SRC.혼합, "s", (f) =>
  mulDivMaterial(fq(f, "base"), fi(f, "e"), fq(f, "m"), fq(f, "v")),
);

const ASKS = ["옳지 않은 것", "옳은 것"] as const;
const truthOf: JudgeDefinition["truthOf"] = (text) => equationTruth(text);
const calc =
  (draw: MaterialDraw): JudgeDefinition["generate"] =>
  (rng, ask) =>
    buildTruthBody(rng, ask, draw, CALC_STYLE);

export const MUL_DIV_JUDGES: readonly JudgeDefinition[] = [
  {
    grade: GRADE,
    unitSection: SEC.곱,
    familyId: "calc-mul2",
    title: "계산이 옳지 않은 것 · 옳은 것 — 두 유리수의 곱셈",
    asks: ASKS,
    sources: [MUL_DIV_SRC.곱셈],
    difficulty: "기본",
    difficultyBasis:
      "보기마다 두 유리수의 곱셈 하나(부호를 정하고 절댓값을 곱하기)를 계산해 적힌 값과 견준다. " +
      "계산은 원천 12 와 같은 크기이고 판단 단계가 하나뿐이라 기본(판정형 기본값). 원천의 칸을 옮긴 것이 아니다.",
    ruleVersion: 1,
    generate: calc(drawMul2),
    truthOf,
  },
  {
    grade: GRADE,
    unitSection: SEC.곱,
    familyId: "calc-pow",
    title: "계산이 옳지 않은 것 · 옳은 것 — 거듭제곱이 든 곱셈",
    asks: ASKS,
    sources: [MUL_DIV_SRC.거듭제곱],
    difficulty: "응용",
    difficultyBasis:
      "보기마다 분수의 거듭제곱과 정수의 거듭제곱을 따로 계산하고(음수의 거듭제곱 부호 · 괄호 밖의 부호를 가려) " +
      "곱하는 두 단계 계산을 다섯 번 해야 한다. 한 단계 곱셈 판정보다 단계가 하나 많아 응용으로 정했다" +
      "(원천 15 의 칸을 옮긴 것이 아니다 — 원장님 확인 대상).",
    ruleVersion: 1,
    generate: calc(drawPow),
    truthOf,
  },
  {
    grade: GRADE,
    unitSection: SEC.나눗,
    familyId: "calc-div2",
    title: "계산이 옳지 않은 것 · 옳은 것 — 두 유리수의 나눗셈",
    asks: ASKS,
    sources: [MUL_DIV_SRC.나눗셈],
    difficulty: "기본",
    difficultyBasis:
      "보기마다 두 유리수의 나눗셈 하나(나누는 수의 역수를 곱하기)를 계산해 적힌 값과 견준다. " +
      "판단 단계가 하나뿐이라 기본(판정형 기본값).",
    ruleVersion: 1,
    generate: calc(drawDiv2),
    truthOf,
  },
  {
    grade: GRADE,
    unitSection: SEC.나눗,
    familyId: "calc-muldiv",
    title: "계산이 옳지 않은 것 · 옳은 것 — 곱셈과 나눗셈의 혼합 계산",
    asks: ASKS,
    sources: [MUL_DIV_SRC.혼합],
    difficulty: "응용",
    difficultyBasis:
      "보기마다 거듭제곱을 먼저 계산하고 나눗셈을 역수의 곱셈으로 고친 뒤 세 수를 곱하는 혼합 계산을 다섯 번 " +
      "해야 한다. 계산 단계가 두 수 나눗셈 판정의 세 배라 응용으로 정했다(원천 20 의 칸을 옮긴 것이 아니다 — " +
      "원장님 확인 대상).",
    ruleVersion: 1,
    generate: calc(drawMulDiv),
    truthOf,
  },
];
