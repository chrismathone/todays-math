/**
 * 중등 **전 유형** — 계수 $1$ 을 지면에 적지 않는다(`$1x+47$` 이 아니라 `$x+47$`).
 *
 * 값은 맞고 보기만 흉한 것이라 값 검산은 이 부류를 구조적으로 못 본다. 판정은 둘이다.
 *  ⑴ 공용 가드 `pageSmells`(`../helpers/midPage.ts`)의 계수 $1$ 규칙 셋 — 「계수 1 을 적었다」(`1x`)·
 *     「괄호 앞에 계수 1 을 적었다」(`1\left(`)·「π·√ 앞에 계수 1 을 적었다」(`1\pi`).
 *  ⑵ 그 가드가 못 보는 **맨 괄호 앞** 계수 $1$ — `$1(a+b)=-8$`·`\{5x-1(20-x)\}`. 공용 가드는
 *     `\dfrac{1(3-\sqrt{3})}{6}`(유리화의 옳은 풀이 줄) 때문에 `1(` 를 일부러 뺐다. 여기서는 `{` 바로
 *     뒤의 `1(` 만 빼고 본다. 공용 가드는 리드 소유라 이 시험에 둔다 — 고등 `highQuadEq`·
 *     `highComplex` 가 같은 까닭으로 제 시험에 둔 자와 같은 모양이다(공용 후보).
 *
 * 2026-09-27 전수(1,505유형 × 씨앗 200): ⑴ 29유형 — 원과 부채꼴 04·06 을 먼저 고친 뒤 남은 것
 * (기본 도형·위치 관계·다각형 / 단항식·연립 19A~26A·일차부등식·일차함수·평행사변형·평행선 사이의
 * 선분의 길이의 비 / 이차방정식의 풀이·활용·이차함수의 그래프), ⑵ 2유형(연립 12, 일차부등식의 활용 72).
 * 전부 진짜 계수 $1$ 이었다(단위 `1m` 같은 거짓 경보 0).
 *
 * ⚠️ 공용 가드의 다른 냄새(「지수 1」·「상수 0」 …)는 여기서 보지 않는다 — 이 시험은 계수 $1$ 만 잠근다.
 */
import { describe, expect, it } from "vitest";

import {
  generateMiddleProblem,
  registeredTypes,
} from "../../lib/middle/generate";
import { pageSmells } from "../helpers/midPage";

/**
 * 씨앗 수 — 고치기 전 가장 드문 것이 `3-1|이차방정식의 활용|20` 으로 씨앗 200 에서 10번(5%)이었다.
 * 200번이면 놓칠 확률이 $(1-0.05)^{200}\approx4\times10^{-5}$ 이다.
 */
const SEEDS = 200;

/** ⑵ 수식 안의 맨 괄호 앞 계수 1 — 앞이 수·소수점·`{` 이면 아니다. */
const BARE_PAREN_ONE = /(?<![\d.{])1\(/;

/** 계수 1 을 적은 자리의 이름들 — 없으면 빈 배열. */
function coefOneFaults(text: string): string[] {
  const out = pageSmells(text).filter((l) => l.includes("계수 1 을 적었다"));
  for (const m of text.matchAll(/\$[^$]*\$/g)) {
    if (BARE_PAREN_ONE.test(m[0])) {
      out.push("맨 괄호 앞에 계수 1 을 적었다");
      break;
    }
  }
  return out;
}

describe("계수 1 판정 눈금 — 양성은 잡고 음성은 안 잡는다", () => {
  it("계수 1 은 결함이다 — 문자·괄호·π 앞, 지수 안에서도", () => {
    for (const t of [
      "$1x+47$",
      "$-1x=-8$",
      "$\\begin{cases}1x+3y=5\\\\2x+ay=1\\end{cases}$",
      "$x^{ab}y^{1b}$",
      "$y=1\\left(x-\\dfrac{a}{2}\\right)^2$",
      "$1\\pi$",
      "$1(a+b)=-8$",
      "$\\{5x-1(20-x)\\}$점",
      "$3(x-6)>1(x+1)$",
    ]) {
      expect(coefOneFaults(t), t).not.toEqual([]);
    }
  });

  it("계수 없음·두 자리 수의 끝 1·소수·유리화 분자는 결함이 아니다", () => {
    for (const t of [
      "$x+47$",
      "$11x$",
      "$21y=5$",
      "$0.1x$",
      "$(x-1)^2$",
      "$x=1$",
      "$(x-1)(x+2)=0$",
      "$f(1)=3$",
      "$21(x+1)$",
      "$\\dfrac{1(3-\\sqrt{3})}{6}$",
      "문제 1(가)", // 수식 밖
    ]) {
      expect(coefOneFaults(t), t).toEqual([]);
    }
  });
});

const TYPES = registeredTypes().map((e) => ({ key: e.key }));

describe(`중등 전 유형(${TYPES.length}) × 씨앗 ${SEEDS} — 계수 1 을 적지 않는다`, () => {
  it.each(TYPES)("$key", ({ key }) => {
    const bad: string[] = [];
    for (let s = 0; s < SEEDS && bad.length < 4; s += 1) {
      const p = generateMiddleProblem(key, 20260927 + s);
      for (const [field, text] of [
        ["발문", p.content],
        ["정답", p.answer],
        ["해설", p.solution],
      ] as const) {
        for (const label of coefOneFaults(text)) {
          if (bad.length < 4) bad.push(`씨앗 ${s} [${field}] ${label}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
