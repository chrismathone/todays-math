/**
 * 중1 «문자의 사용과 식의 값» — **한 문자에 음의 정수를 대입하는 식**의 틀 (2026-10-08 엔진 보강 2단계).
 *
 * 식의 값 판정(`calc-value`)과 비교형 둘(`odd-value` · `max-value`)이 같은 틀을 쓴다. 틀은 원천 유형 둘이
 * 묻는 그것이다 — `1-1|문자의 사용과 식의 계산|05`(식의 값 구하기)의 일차 · 이차 낱말과 `-a^{2}` · `-a^{3}`,
 * `…|06`(분모에 대입하기)의 `\dfrac{m}{x}`. 거기에 05 가 가르는 «$-a^{n}$ 과 $(-a)^{n}$»의 다른 쪽
 * (`(-x)^{2}` · `(-x)^{3}` · `x^{3}`)을 더했다. 한 문항의 보기 다섯이 **같은 대입값**을 써야 해서 원천 생성기를
 * 그대로 부를 수 없다(원천은 문항마다 대입값을 따로 뽑는다) — 그래서 꼴만 따른다.
 *
 * ## 식 하나 = 알맹이 + 상수
 *
 *   알맹이  `kx` · `x^{2}` · `-x^{2}` · `(-x)^{2}` · `x^{3}` · `-x^{3}` · `(-x)^{3}` · `kx^{2}` · `\dfrac{m}{x}`
 *   상수    `+c` · `-c`(없을 수도) — 알맹이가 `-` 로 시작하고 상수가 양수면 `c-x^{2}` 로 앞에 쓴다
 *
 * 4+1(«나머지 넷과 다른 하나»)은 상수를 **역산**해 서로 다른 알맹이 넷이 같은 값이 되게 한다.
 *
 * ## 틀린 값 — 음수를 대입할 때의 실제 실수
 *
 * 실수는 «다른 규칙으로 계산한 값»으로 만든다 — 까닭 문장이 그 값에 대해 참이다.
 *
 *   괄호 없이 대입   $x^{2}$ 에 $x=-3$ 을 넣으며 $-3^{2}=-9$ 로 계산
 *   부호를 빼고 대입  $-3$ 대신 $3$ 을 넣음
 *   알맹이마다       `-x^{2}` 을 `(-x)^{2}` 으로 · `(-x)^{2}` 을 `-x^{2}` 으로 · `kx^{2}` 을 `(kx)^{2}` 으로
 */
import { intBetween, pick } from "../../elementary/rng";
import type { Rng } from "../../elementary/types";
import { m1Rational, type M1Q as Q } from "../m1Calc";

import type { Material, Mistake } from "./calcJudge";

const { q, addQ, mulQ, divQ, negQ, powQ, texQ } = m1Rational;

/** 문자 하나에 값을 넣는 **세 자리** — 실수는 이 가운데 하나를 틀리게 계산한 것이다. */
type Atoms = {
  /** 문자 자체의 값 */
  x: Q;
  /** `x^{e}` 의 값 */
  pow: (e: number) => Q;
  /** `(-x)^{e}` 의 값 */
  negPow: (e: number) => Q;
};

const correct = (x0: Q): Atoms => ({
  x: x0,
  pow: (e) => powQ(x0, e),
  negPow: (e) => powQ(negQ(x0), e),
});
const absQ = (v: Q) => q(Math.abs(v.n), v.d);
/** 괄호 없이 대입 — `x^{e}` 를 $-(|x|^{e})$ 로. */
const bare = (x0: Q): Atoms => ({
  ...correct(x0),
  pow: (e) => negQ(powQ(absQ(x0), e)),
});
/** 부호를 빼고 대입 — 음수 대신 그 절댓값을 넣는다. */
const dropped = (x0: Q): Atoms => correct(absQ(x0));

export const VALUE_REASON = {
  bare: "거듭제곱에 음수를 괄호 없이 대입함",
  dropped: "음수의 부호를 빼고 대입함",
  signIntoBase: "거듭제곱 앞의 부호를 밑에 넣어 계산함",
  signOutOfBase: "괄호 안의 부호를 거듭제곱 밖에 둠",
  coefficientIntoPower: "계수까지 거듭제곱함",
  signFlip: "결과의 부호를 반대로 씀",
} as const;

/** 알맹이 — 문자가 든 한 덩어리. */
type Core = {
  /** 틀 이름 — 한 문항에 같은 틀이 몰리지 않게 센다 */
  template: string;
  tex: (v: string) => string;
  /** 대입한 식 — 음수는 괄호로 */
  sub: (x0: Q) => string;
  eval: (a: Atoms) => Q;
  /** 이 알맹이에만 있는 실수 — 그 실수로 계산한 알맹이의 값 */
  own?: (x0: Q) => { value: Q; reason: string }[];
};

const paren = (x0: Q) => `\\left(${texQ(x0)}\\right)`;
const signed = (n: number) => (n < 0 ? `-${-n}` : `+${n}`);
/** 계수 — `2` · `-3` · `-`(−1). 1 은 안 쓴다. */
const coef = (k: number) => (k === -1 ? "-" : `${k}`);

const CORES = {
  lin: (k: number): Core => ({
    template: "일차",
    tex: (v) => `${coef(k)}${v}`,
    sub: (x0) => (k === -1 ? `-${paren(x0)}` : `${k}\\times${paren(x0)}`),
    eval: (a) => mulQ(q(k), a.x),
  }),
  pow: (e: 2 | 3): Core => ({
    template: e === 2 ? "제곱" : "세제곱",
    tex: (v) => `${v}^{${e}}`,
    sub: (x0) => `${paren(x0)}^{${e}}`,
    eval: (a) => a.pow(e),
  }),
  negPow: (e: 2 | 3): Core => ({
    template: e === 2 ? "제곱" : "세제곱",
    tex: (v) => `-${v}^{${e}}`,
    sub: (x0) => `-${paren(x0)}^{${e}}`,
    eval: (a) => negQ(a.pow(e)),
    // `-x^{2}` 을 `(-x)^{2}` 으로 계산했다.
    own: (x0) => [
      { value: powQ(negQ(x0), e), reason: VALUE_REASON.signIntoBase },
    ],
  }),
  parPow: (e: 2 | 3): Core => ({
    template: e === 2 ? "제곱" : "세제곱",
    tex: (v) => `\\left(-${v}\\right)^{${e}}`,
    sub: (x0) => `\\left\\{-${paren(x0)}\\right\\}^{${e}}`,
    eval: (a) => a.negPow(e),
    // `(-x)^{2}` 을 `-x^{2}` 으로 계산했다.
    own: (x0) => [
      { value: negQ(powQ(x0, e)), reason: VALUE_REASON.signOutOfBase },
    ],
  }),
  kSq: (k: number): Core => ({
    template: "계수 제곱",
    tex: (v) => `${coef(k)}${v}^{2}`,
    sub: (x0) =>
      k === -1 ? `-${paren(x0)}^{2}` : `${k}\\times${paren(x0)}^{2}`,
    eval: (a) => mulQ(q(k), a.pow(2)),
    // `kx^{2}` 을 `(kx)^{2}` 으로 계산했다.
    own: (x0) => [
      {
        value: powQ(mulQ(q(k), x0), 2),
        reason: VALUE_REASON.coefficientIntoPower,
      },
    ],
  }),
  recip: (m: number): Core => ({
    template: "분모",
    tex: (v) => (m < 0 ? `-\\dfrac{${-m}}{${v}}` : `\\dfrac{${m}}{${v}}`),
    sub: (x0) => `${m < 0 ? `-${-m}` : m}\\div${paren(x0)}`,
    eval: (a) => divQ(q(m), a.x),
  }),
} as const;

/** 식 하나 — 알맹이에 상수를 붙인 것. 값 · 글 · 대입한 식 · 실수 후보를 한데 든다. */
export type ValueForm = {
  template: string;
  /** 식의 글(문자 포함 · `$` 없이) */
  tex: string;
  value: Q;
  /** 대입해 계산하는 사슬 — `2\times\left(-3\right)+5=-6+5=-1` */
  chain: string;
  /** 음수를 대입할 때의 실수로 계산한 값들(참값과 같은 것은 빼고) · 부호 반대 */
  mistakes: readonly Mistake[];
  /** `rule` 로 잘못 계산하면 얼마가 되나 — 4+1 의 «함정» 식을 역산할 때 쓴다 */
  mistakenBy: (rule: "bare" | "dropped") => Q;
};

function form(core: Core, c: number, v: string, x0: Q): ValueForm {
  const withConst = (a: Atoms) => addQ(core.eval(a), q(c));
  const value = withConst(correct(x0));
  const coreValue = core.eval(correct(x0));
  // 알맹이가 `-` 로 시작하고 상수가 양수면 상수를 앞에 쓴다 — `7-x^{2}`.
  const front = c > 0 && core.tex(v).startsWith("-");
  const join = (body: string) =>
    c === 0 ? body : front ? `${c}${body}` : `${body}${signed(c)}`;
  // 가운데 단계 — 알맹이를 값으로 바꾼 것. 음수가 뒤에 오면 `7-9` 처럼 부호째 잇는다.
  const mid =
    c === 0
      ? texQ(coreValue)
      : front
        ? `${c}${coreValue.n < 0 ? texQ(coreValue) : `+${texQ(coreValue)}`}`
        : `${texQ(coreValue)}${signed(c)}`;
  const steps = [join(core.sub(x0)), mid, texQ(value)];
  const slips: Mistake[] = [
    { value: withConst(bare(x0)), reason: VALUE_REASON.bare, kind: "실수" },
    {
      value: withConst(dropped(x0)),
      reason: VALUE_REASON.dropped,
      kind: "실수",
    },
    ...(core.own?.(x0) ?? []).map((o): Mistake => ({
      value: addQ(o.value, q(c)),
      reason: o.reason,
      kind: "실수",
    })),
  ];
  return {
    template: core.template,
    tex: join(core.tex(v)),
    value,
    chain: steps.filter((s, i) => i === 0 || s !== steps[i - 1]).join("="),
    mistakes: [
      ...slips.filter((m) => m.value.n * value.d !== value.n * m.value.d),
      { value: negQ(value), reason: VALUE_REASON.signFlip, kind: "부호" },
    ],
    mistakenBy: (rule) => withConst(rule === "bare" ? bare(x0) : dropped(x0)),
  };
}

const nonzero = (rng: Rng, lo: number, hi: number): number => {
  for (;;) {
    const v = intBetween(rng, lo, hi);
    if (v !== 0) return v;
  }
};

/** 알맹이 하나를 무게대로 — 일차 · 계수 제곱 · 분모 꼴이 조금 더 자주 나온다. */
function drawCore(rng: Rng, x0: Q): Core {
  const roll = intBetween(rng, 1, 16);
  if (roll <= 4) {
    const k = nonzero(rng, -5, 5);
    return CORES.lin(k === 1 ? -1 : k);
  }
  if (roll <= 6) return CORES.pow(2);
  if (roll <= 8) return CORES.negPow(2);
  if (roll === 9) return CORES.parPow(2);
  if (roll === 10) return CORES.pow(3);
  if (roll === 11) return CORES.negPow(3);
  if (roll === 12) return CORES.parPow(3);
  if (roll <= 14) return CORES.kSq(pick(rng, [2, 3, -2, -3] as const));
  // 분자는 대입값의 배수 — 값이 정수로 떨어진다.
  return CORES.recip(x0.n * nonzero(rng, -6, 6));
}

/** 상수 없이 서는 알맹이인가 — 일차식은 상수가 있어야 식답다(`-x` 만 예외). */
function drawConst(rng: Rng, core: Core, v: string): number {
  if (core.template === "일차")
    return core.tex(v) === `-${v}` ? 0 : nonzero(rng, -9, 9);
  if (core.template === "제곱" && intBetween(rng, 1, 3) === 1)
    return nonzero(rng, -9, 9);
  return 0;
}

/** 식의 값 판정 · «가장 큰 것»이 쓰는 식 하나 — 값은 정수로 떨어진다. */
export function drawValueForm(rng: Rng, v: string, x0: Q): ValueForm {
  const core = drawCore(rng, x0);
  return form(core, drawConst(rng, core, v), v, x0);
}

/**
 * 값이 `target` 이 되게 상수를 **역산**한 식 하나 — 4+1 의 «같은 값 넷». 상수가 0 이거나 너무 크면 null.
 * `by` 를 주면 그 **실수로 계산했을 때** `target` 이 되게 역산한다 — 참값은 `target` 과 달라지는 «함정» 식이다.
 */
export function solveValueForm(
  rng: Rng,
  v: string,
  x0: Q,
  target: number,
  by?: "bare" | "dropped",
): ValueForm | null {
  const core = drawCore(rng, x0);
  const probe = form(core, 0, v, x0);
  const base = by ? probe.mistakenBy(by) : probe.value;
  if (base.d !== 1) return null;
  const c = target - base.n;
  if (c === 0 || Math.abs(c) > 30) return null;
  return form(core, c, v, x0);
}

/** 식 하나 → 계산 판정의 재료. 값이 정수라 공용 후보도 정수만 쓴다. */
export function valueMaterial(f: ValueForm): Material {
  return {
    left: f.tex,
    value: f.value,
    shape: "식의 값",
    work: () => `$${f.chain}$`,
    mistakes: () => f.mistakes,
    denominatorBound: 1,
    template: f.template,
  };
}

/** 한 문항에 같은 틀은 둘까지 — 다섯 다 일차식이면 대입만 다섯 번이다. */
export const MAX_PER_TEMPLATE = 2;
