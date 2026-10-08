/**
 * ① 중1 «문자의 사용과 식의 값» — **식의 값 판정** 객관식 (2026-10-08 엔진 보강 2단계).
 *
 *   «$x=-3$일 때, 다음 중 식의 값이 옳지 않은 것은?» · «… 옳은 것은?»
 *   ① $x^{2}=9$  ② $-x^{2}=9$  ③ $2x+5=-1$  …
 *
 * 문형과 짓기는 계산 판정과 같다(`calcJudge.ts`). 다른 것은 둘이다.
 *
 *  ⑴ **대입값이 발문에 선다.** 보기 글만으로는 참거짓을 못 잰다 — 등록부가 지면의 발문 줄을 다시 읽어
 *     넘기고(`JudgeReadContext`), `truthOf` 가 거기서 «$x=-3$»을 읽어 식에 **값으로** 넣는다.
 *  ⑵ **보기 다섯이 같은 대입값을 쓴다.** 원천 유형 05 · 06 은 문항마다 대입값을 따로 뽑으므로 그대로 부를
 *     수 없다 — 식의 **꼴**만 따른다(`valueForms.ts`). 꼴이 그 유형의 것인지는 시험이 잰다.
 *
 * 대입값은 음의 정수다 — 이 판정이 묻는 것이 «음수를 대입할 때 괄호»이기 때문이다. 틀린 값은 그 실수로
 * 계산한 값(괄호 없이 대입 · 부호를 빼고 대입 · `-x^{2}` 을 `(-x)^{2}` 으로 …)에서 온다.
 */
import { pick } from "../../elementary/rng";
import type { Rng } from "../../elementary/types";
import { m1Rational, type M1Q as Q } from "../m1Calc";
import { eulReul } from "../m2Josa";

import { buildTruthBody, type CalcStyle } from "./calcJudge";
import type { JudgeDefinition, TruthAsk } from "./contract";
import { equationTruth, readEnv } from "./texArith";
import { drawValueForm, MAX_PER_TEMPLATE, valueMaterial } from "./valueForms";

const { q } = m1Rational;

/**
 * 허용 원천 — 식의 **꼴**이 온 유형 둘(`valueForms.ts` 머리말).
 *   05 식의 값 구하기                    일차 · 이차 낱말(`kx` · `kx^{2}` · 상수) · `-a^{2}` · `-a^{3}`
 *   06 식의 값 구하기 분모에 분수 대입하기  분모에 문자가 오는 `\dfrac{m}{x}` — 여기서는 정수를 넣는다
 */
export const VALUE_SOURCES = [
  "1-1|문자의 사용과 식의 계산|05",
  "1-1|문자의 사용과 식의 계산|06",
] as const;
export const VALUE_SECTION = "문자의 사용과 식의 값";

/** 대입값 — 음의 정수. $-1$ 은 거듭제곱이 싱겁고 $-5$ 는 세제곱이 크다. */
export const VALUE_POINTS = [-2, -3, -4] as const;
/** 문자 — 원천 05 가 쓰는 둘($x$ · $a$). */
export const VALUE_LETTERS = ["x", "a"] as const;

/** 문항 하나의 대입 — 문자와 값. 발문 · 해설 머리 · 보기 다섯이 같이 쓴다. */
export type Substitution = { letter: string; x0: Q };

export function drawSubstitution(rng: Rng): Substitution {
  return { letter: pick(rng, VALUE_LETTERS), x0: q(pick(rng, VALUE_POINTS)) };
}

/** «$x=-3$일 때, » — 발문의 머리. */
export const whenText = (s: Substitution) => `$${s.letter}=${s.x0.n}$일 때, `;
/** «$x=-3$을 대입하면» — 해설 첫 줄의 머리. */
export const substituteText = (s: Substitution) =>
  `$${s.letter}=${s.x0.n}$${eulReul(s.x0.n)} 대입하면`;

const style = (s: Substitution): CalcStyle => ({
  lead: (ask: TruthAsk) =>
    `${whenText(s)}다음 중 식의 값이 ${ask === "옳지 않은 것" ? "옳지 않은" : "옳은"} 것은?`,
  briefLead: substituteText(s),
  maxPerTemplate: MAX_PER_TEMPLATE,
});

export const VALUE_JUDGES: readonly JudgeDefinition[] = [
  {
    grade: "중1",
    unitSection: VALUE_SECTION,
    familyId: "calc-value",
    title: "식의 값이 옳지 않은 것 · 옳은 것 — 한 문자에 음의 정수 대입",
    asks: ["옳지 않은 것", "옳은 것"],
    sources: VALUE_SOURCES,
    difficulty: "기본",
    difficultyBasis:
      "보기마다 한 문자에 음의 정수를 대입하는 한두 항짜리 식 하나의 값을 구해 적힌 값과 견준다. " +
      "식의 크기는 원천 05 와 같고 판단 단계가 하나뿐이라 기본(판정형 기본값). 원천의 칸을 옮긴 것이 아니다.",
    ruleVersion: 1,
    generate: (rng, ask) => {
      const s = drawSubstitution(rng);
      return buildTruthBody(
        rng,
        ask,
        (r) => valueMaterial(drawValueForm(r, s.letter, s.x0)),
        style(s),
      );
    },
    truthOf: (text, ctx) => equationTruth(text, readEnv(ctx.lead)),
  },
];
