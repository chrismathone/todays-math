/**
 * ① 중1 «유리수의 덧셈과 뺄셈» — **계산 판정** 객관식 (2026-10-08 엔진 보강 1단계).
 *
 *   «다음 중 계산이 옳지 않은 것은?» · «다음 중 계산이 옳은 것은?»
 *   ① $\left(+\dfrac{1}{2}\right)+\left(-\dfrac{3}{4}\right)=-\dfrac{1}{4}$  …
 *
 * ## 보기 다섯은 같은 유형 · 같은 꼴에서 (합의안 §2 Q2 — codex 안)
 *
 * 문항류 하나가 원천 RPM 유형 **하나**를 쓴다 — 01 덧셈 · 03 뺄셈 · 04 혼합 계산. 차시 안의 여러 유형을
 * 섞지 않는다(한 보기만 유난히 길어진다). 재료는 그 유형 생성기를 **그대로 불러** `facts` 에서 읽는다 —
 * 완성된 발문을 정규식으로 잘라 쓰지 않는다. 읽은 수로 식을 다시 세어 `facts` 의 답과 맞지 않으면 던진다.
 *
 * ## «틀린 등식» 만들기 — `numericMistakes` 는 **후보**일 뿐이다
 *
 * 틀린 값의 후보는 둘이다. ⑴ 이 계산에서 학생이 실제로 하는 실수(빼는 수의 부호를 안 바꿈 · 분자끼리
 * 분모끼리 더함 · 절댓값을 더함 · 결과 부호 반대) ⑵ 공용 오답 자리 `numericMistakes`(정답을 흔든 값).
 * 어느 쪽이든 «거짓이다»를 보증하지 않는다 — 후보는 교차곱으로 참값과 다른지 거르고, 최종 지면은
 * 등록부가 `signedSumTruth` 로 **다시 재서** «다른 하나가 정확히 하나»를 확인한다(`registry.ts`).
 *
 * ## 모양 단서를 지운다
 *
 * 보기 다섯이 **분수 항의 수 · 결과가 정수인가 분수인가**가 같게 재료를 고른다. 틀린 값도 참값과 같은 종류
 * (정수/분수)이고 자릿수가 비슷한 것만 쓴다. `numericMistakes` 의 값은 `\frac` 로 찍혀 나오므로 그대로 쓰지
 * 않고 수로 읽어 `\dfrac` 로 **다시 찍는다**(한 보기만 작은 분수가 되면 그것이 단서다).
 *
 * ## 재시도 상한
 *
 * 재료를 `MAX_DRAWS` 번 뽑아도 다섯을 못 채우면 **사유를 달고 던진다** — 모자란 문항을 조용히 내지 않는다.
 *
 * ## 2단계(2026-10-08) — 보기 다섯을 짓는 고리는 `calcJudge.ts` 로 갔다
 *
 * 곱셈 · 나눗셈 · 식의 값이 같은 문형을 쓰게 되어 짓기(같은 꼴 모으기 · 틀린 값의 세 갈래 · 부호 상한 · 오른쪽 값
 * 겹침 · 재시도 상한)를 한 벌로 뽑았다. 여기 남은 것은 **덧셈 · 뺄셈의 사정**이다 — 식의 글 · 풀이 · 이 계산의
 * 실제 실수 · 원천 어댑터. 🔴 산출물은 한 글자도 안 바뀐다(`judgeStep1Pin.test.ts` 가 실린 36행을 얼려 두었다).
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
  type Mistake,
} from "./calcJudge";
import type { JudgeBody, JudgeDefinition, TruthAsk } from "./contract";
import { signedSumTruth } from "./signedSum";

export { MAX_DRAWS } from "./calcJudge";

const { q, addQ, subQ, negQ, lcm, texQ, texSigned, texRawFrac } = m1Rational;

const GRADE = "중1";
const SECTION = "유리수의 덧셈과 뺄셈";
const SRC = {
  덧셈: "1-1|정수와 유리수의 계산|01",
  뺄셈: "1-1|정수와 유리수의 계산|03",
  혼합: "1-1|정수와 유리수의 계산|04",
} as const;

export type Term = { op: "+" | "-"; v: Q };
/** 보기 하나의 재료 — 왼쪽 식과 그 **정확한 값**. */
export type Expr = { terms: readonly Term[]; value: Q };

/** 재료 하나를 뽑는 함수 — 시험이 «늘 같은 재료»를 넣어 재시도 상한을 잰다. */
export type Draw = (rng: Rng) => Expr;

/** 같은 유형 · 같은 꼴의 기준 — 분수 항의 수 · 항 수 · 결과의 종류. */
function shapeOf(e: Expr): string {
  const fracs = e.terms.filter((t) => t.v.d !== 1).length;
  return `${fracs}/${e.terms.length}|${e.value.d === 1 ? "정수" : "분수"}`;
}

function evalTerms(terms: readonly Term[]): Q {
  return terms.reduce(
    (acc, t) => (t.op === "+" ? addQ(acc, t.v) : subQ(acc, t.v)),
    q(0),
  );
}

export function lhsTex(terms: readonly Term[]): string {
  return terms
    .map((t, i) => (i === 0 ? texSigned(t.v) : `${t.op}${texSigned(t.v)}`))
    .join("");
}

/**
 * 정답 보기의 풀이 — **보기 식을 다시 적지 않는다**(지면 바로 위에 있다). 뺄셈은 부호를 바꾼 덧셈으로,
 * 분수는 통분한 항으로 늘어놓고 모아 기약으로 끝낸다:
 *   «빼는 수의 부호를 바꾸어 통분하면 $-\dfrac{8}{12}+\dfrac{3}{12}=-\dfrac{5}{12}$»
 * 정답지 한 쪽(8문항 · 2단)에 들어가야 해서 짧게 쓴다(`JudgeBody` 머리말).
 * 앞 단계와 글자가 같은 단계는 빼고, 딱 떨어지는 모은 분수는 안 적는다(`=-8=-8` 이 찍힌 전례 — m1Calc `addSolution`).
 */
export function workTex(terms: readonly Term[], value: Q): string {
  const flipped = terms.some((t) => t.op === "-");
  const added = terms.map((t) => (t.op === "-" ? negQ(t.v) : t.v));
  const lcd = added.reduce((acc, v) => lcm(acc, v.d), 1);
  const scaled = added.map((v) => v.n * (lcd / v.d));
  const signed = (n: number, i: number) => {
    const body = texRawFrac(Math.abs(n), lcd);
    return n < 0 ? `-${body}` : i === 0 ? body : `+${body}`;
  };
  const steps = [scaled.map(signed).join("")];
  const num = scaled.reduce((acc, n) => acc + n, 0);
  if (lcd > 1 && num % lcd !== 0) steps.push(texRawFrac(num, lcd));
  steps.push(texQ(value));
  const chain = steps.filter((s, i) => i === 0 || s !== steps[i - 1]).join("=");
  const how =
    lcd > 1
      ? flipped
        ? "빼는 수의 부호를 바꾸어 통분하면"
        : "통분하면"
      : flipped
        ? "빼는 수의 부호를 바꾸어 계산하면"
        : "계산하면";
  return `${how} $${chain}$`;
}

// ── 틀린 값의 후보 ─────────────────────────────────────────────────────────

/**
 * 이 계산에서 학생이 실제로 하는 실수 — **그 실수로 계산한 값**이다(까닭 문장이 그 값에 대해 참이어야 한다).
 */
function domainMistakes(e: Expr): Mistake[] {
  const out: Mistake[] = [];
  // ⑴ 빼는 수의 부호를 바꾸지 않고 더했다 — 뺄셈 항마다 하나.
  e.terms.forEach((t, i) => {
    if (t.op !== "-") return;
    const wrong = e.terms.map((u, j) =>
      j === i ? { ...u, op: "+" as const } : u,
    );
    out.push({
      value: evalTerms(wrong),
      reason: "빼는 수의 부호를 바꾸지 않고 더함",
      kind: "실수",
    });
  });
  // ⑵ 두 분수의 덧셈(뺄셈)에서 분자는 분자끼리, 분모는 분모끼리 더했다(뺐다).
  if (e.terms.length === 2 && e.terms.every((t) => t.v.d !== 1)) {
    const [a, b] = e.terms as [Term, Term];
    const plus = b.op === "+";
    const den = plus ? a.v.d + b.v.d : a.v.d - b.v.d;
    if (den !== 0)
      out.push({
        value: q(plus ? a.v.n + b.v.n : a.v.n - b.v.n, den),
        reason: `분자끼리 분모끼리 ${plus ? "더함" : "뺌"}`,
        kind: "실수",
      });
  }
  // ⑶ 덧셈 두 항의 부호가 다를 때 절댓값을 빼지 않고 더했다(부호는 절댓값이 큰 쪽).
  if (e.terms.length === 2 && e.terms.every((t) => t.op === "+")) {
    const [a, b] = e.terms as [Term, Term];
    if (Math.sign(a.v.n) !== Math.sign(b.v.n)) {
      const absSum = addQ(q(Math.abs(a.v.n), a.v.d), q(Math.abs(b.v.n), b.v.d));
      const bigger =
        Math.abs(a.v.n) * b.v.d >= Math.abs(b.v.n) * a.v.d ? a.v : b.v;
      out.push({
        value: bigger.n < 0 ? negQ(absSum) : absSum,
        reason: "절댓값의 차가 아니라 합을 구함",
        kind: "실수",
      });
    }
  }
  // ⑷ 계산 결과의 부호를 반대로 적었다.
  out.push({
    value: negQ(e.value),
    reason: "결과의 부호를 반대로 씀",
    kind: "부호",
  });
  return out;
}

/** 덧셈 · 뺄셈 식 하나 → 공용 짓기의 재료. 공용 후보의 분모는 항들의 최소공배수의 약수일 때만 쓴다. */
export function addSubMaterial(e: Expr): Material {
  return {
    left: lhsTex(e.terms),
    value: e.value,
    shape: shapeOf(e),
    work: () => workTex(e.terms, e.value),
    mistakes: () => domainMistakes(e),
    denominatorBound: e.terms.reduce((acc, t) => lcm(acc, t.v.d), 1),
  };
}

/**
 * 보기 다섯을 짓는다 — 짓기 고리는 `calcJudge.ts` 의 `buildTruthBody` 다(첫째가 «다른 하나» · 차례는 등록부가 섞는다).
 * `draw` 를 밖에서 받는 까닭은 재시도 상한을 시험이 직접 재게 하려는 것이다.
 */
export function buildCalcJudgeBody(
  rng: Rng,
  ask: TruthAsk,
  draw: Draw,
): JudgeBody {
  return buildTruthBody(rng, ask, (r) => addSubMaterial(draw(r)), CALC_STYLE);
}

// ── 원천 유형 → 재료 (어댑터) ────────────────────────────────────────────────

const fq = (f: Record<string, number>, p: string): Q => {
  const n = f[`${p}n`];
  const d = f[`${p}d`];
  if (n === undefined || d === undefined)
    throw new Error(`원천 유형의 facts 에 ${p}n · ${p}d 가 없다`);
  return q(n, d);
};

/**
 * 원천 유형을 **그대로 불러** `facts` 에서 식을 세운다. 세운 식을 다시 계산해 `facts` 의 답과 다르면 던진다 —
 * 원천 생성기의 식과 어댑터의 식이 갈리면(항 차례 · 부호) 판정형이 엉뚱한 식을 지면에 찍는다.
 */
function fromSource(
  key: string,
  build: (f: Record<string, number>) => readonly Term[],
): Draw {
  return (rng) => {
    const seed = intBetween(rng, 1, 2_000_000_000);
    const p = generateMiddleProblem(key, seed, 0);
    const terms = build(p.facts);
    const value = fq(p.facts, "s");
    const again = evalTerms(terms);
    if (!sameValue(again, value))
      throw new Error(
        `원천 ${key} 의 facts 로 세운 식의 값(${texQ(again)})이 facts 의 답(${texQ(value)})과 다르다`,
      );
    return { terms, value };
  };
}

export const drawAdd2 = fromSource(SRC.덧셈, (f) => [
  { op: "+", v: fq(f, "a") },
  { op: "+", v: fq(f, "b") },
]);
export const drawSub2 = fromSource(SRC.뺄셈, (f) => [
  { op: "+", v: fq(f, "a") },
  { op: "-", v: fq(f, "b") },
]);
export const drawMix4 = fromSource(SRC.혼합, (f) => [
  { op: "+", v: fq(f, "a") },
  { op: "+", v: fq(f, "b") },
  { op: "-", v: fq(f, "c") },
  { op: "-", v: fq(f, "d") },
]);

const ASKS = ["옳지 않은 것", "옳은 것"] as const;

/**
 * 1단계 셋은 지면 관문(`paper.ts` — 2단계에서 생겼다)을 지나지 않는다 — **이미 실린 36행의 신분 보존**.
 * 관문을 걸면 접히는 묶음을 버리고 다시 뽑으므로 같은 씨앗이 다른 문제를 낸다(규칙판 `r1` 그대로인데).
 *
 * 🔴 그래서 이 셋에는 지면에서 접히는 문항이 있다(2026-10-08 실측 — 통합 시험지 2단: 네 항 혼합 85% ·
 *    두 항 3~5%). 고치려면 규칙판을 올려 **새 열쇠**로 다시 내고 옛 행을 잠근다 — 보고서
 *    `docs/planning/tracks/reports/engine-judge-step2.md` 의 «1단계 36행» 절.
 */
const STEP1_PAPER =
  "1단계 — 이미 실린 36행의 신분 보존(관문을 걸면 같은 씨앗이 다른 문제를 낸다)";

export const ADD_SUB_JUDGES: readonly JudgeDefinition[] = [
  {
    grade: GRADE,
    unitSection: SECTION,
    familyId: "calc-add2",
    title: "계산이 옳지 않은 것 · 옳은 것 — 두 유리수의 덧셈",
    asks: ASKS,
    sources: [SRC.덧셈],
    difficulty: "기본",
    difficultyBasis:
      "보기마다 두 유리수의 덧셈 하나를 계산해 적힌 값과 견준다. 계산은 원천 01 과 같은 크기이고 " +
      "판단 단계는 «적힌 값이 맞는가» 하나뿐이라 기본(판정형 기본값). 원천의 칸을 옮긴 것이 아니다.",
    ruleVersion: 1,
    paperExempt: STEP1_PAPER,
    generate: (rng, ask) => buildCalcJudgeBody(rng, ask, drawAdd2),
    truthOf: signedSumTruth,
  },
  {
    grade: GRADE,
    unitSection: SECTION,
    familyId: "calc-sub2",
    title: "계산이 옳지 않은 것 · 옳은 것 — 두 유리수의 뺄셈",
    asks: ASKS,
    sources: [SRC.뺄셈],
    difficulty: "기본",
    difficultyBasis:
      "보기마다 두 유리수의 뺄셈 하나(빼는 수의 부호를 바꾸어 더하기)를 계산해 적힌 값과 견준다. " +
      "판단 단계가 하나뿐이라 기본(판정형 기본값).",
    ruleVersion: 1,
    paperExempt: STEP1_PAPER,
    generate: (rng, ask) => buildCalcJudgeBody(rng, ask, drawSub2),
    truthOf: signedSumTruth,
  },
  {
    grade: GRADE,
    unitSection: SECTION,
    familyId: "calc-mix4",
    title: "계산이 옳지 않은 것 · 옳은 것 — 네 유리수의 덧셈과 뺄셈",
    asks: ASKS,
    sources: [SRC.혼합],
    difficulty: "응용",
    difficultyBasis:
      "보기마다 뺄셈 둘을 덧셈으로 바꾸고 네 항을 통분해 모으는 혼합 계산을 다섯 번 해야 한다. " +
      "계산량이 두 항 판정의 두 배를 넘어 응용으로 정했다(원천 04 의 칸을 옮긴 것이 아니다 — 원장님 확인 대상).",
    ruleVersion: 1,
    paperExempt: STEP1_PAPER,
    generate: (rng, ask) => buildCalcJudgeBody(rng, ask, drawMix4),
    truthOf: signedSumTruth,
  },
];
