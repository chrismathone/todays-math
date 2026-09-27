/**
 * 중등 **전 유형** — 값은 맞는데 지면 표기가 흉한 것 세 가지를 잠근다.
 *
 *  ㈀ 계수 $1$ 을 적지 않는다(`$1x+47$` 이 아니라 `$x+47$`).
 *  ㈁ 식에 상수 $0$ 을 붙이지 않는다(`$(5x+0)^\circ$`·`$y=2x+0$`·`$(x-0)^2$` 가 아니라 `$(5x)^\circ$`·`$y=2x$`·`$x^2$`).
 *  ㈂ **경우의 수·확률 단원**에서 지수 $1$ 을 적지 않는다(`$2^{1}\times6^{2}$` 이 아니라 `$2\times6^{2}$`).
 *     다른 단원의 지수 $1$ 은 일부러 쓴 것이 많아 보지 않는다 — 지수법칙 설명(「$3=3^{1}$ 이므로」·
 *     「$x^{2}\times x^{1}=x^{3}$」), 10의 거듭제곱 강조(「분모가 $10^{1}$이 된다」), 소인수(「$2^{1}$을 뺀 부분」).
 *     어느 것을 고칠지는 2026-09-27 이 세션에서 **경우의 수 공식만**으로 정해졌다.
 *
 * 값 검산은 이 부류를 구조적으로 못 본다. 판정:
 *  ㈀-⑴ 공용 가드 `pageSmells`(`../helpers/midPage.ts`)의 계수 $1$ 규칙 셋 — 「계수 1 을 적었다」(`1x`)·
 *       「괄호 앞에 계수 1 을 적었다」(`1\left(`)·「π·√ 앞에 계수 1 을 적었다」(`1\pi`).
 *  ㈀-⑵ 그 가드가 못 보는 **맨 괄호 앞** 계수 $1$ — `$1(a+b)=-8$`·`\{5x-1(20-x)\}`. 공용 가드는
 *       `\dfrac{1(3-\sqrt{3})}{6}`(유리화의 옳은 풀이 줄) 때문에 `1(` 를 일부러 뺐다. 여기서는 `{` 바로
 *       뒤의 `1(` 만 빼고 본다.
 *  ㈁ 공용 가드의 「상수 0 을 더했다」(`[+-]0`)는 **산술의 참 0** 까지 잡는다 — 2026-09-27 전수에서 걸린
 *     18유형 중 10유형이 그랬다(「두 좌표의 합은 $-6+0=-6$」·분산의 「$0^2$」·기울기 「$\dfrac{-3-0}{0-2}$」·
 *     근 $\beta=0$ 의 「$25-0=25$」·역원의 「$(+0)+(+2)$」 …). 그것은 결함이 아니라 풀이다. 그래서 여기서는
 *     **식에 붙은** $\pm0$ 만 본다 — 문자·닫는 괄호·지수 바로 뒤의 $\pm0$(뒤가 수·소수점·지수가 아닐 때).
 *     전수에서 이 규칙은 진짜 8유형만 잡았다.
 *  ㈀-⑵·㈁ 은 공용 가드가 리드 소유라 이 시험에 둔다 — 고등 `highQuadEq`·`highComplex` 가 「1(」 를 제 시험에
 *  둔 것과 같은 까닭이다(공용 후보).
 *
 * 2026-09-27 고친 것: ㈀ 31유형(원과 부채꼴 04·06 은 먼저) · ㈁ 8유형(기본 도형 07·10·11, 위치 관계 11,
 * 연립 23, 이차함수의 그래프 ⑵ 70·71, 정수와 유리수의 계산 21).
 * (이 파일은 처음에 `middleCoefOneAll.test.ts` 로 ㈀ 만 잠갔다.)
 */
import { describe, expect, it } from "vitest";

import {
  generateMiddleProblem,
  registeredTypes,
} from "../../lib/middle/generate";
import { pageSmells } from "../helpers/midPage";

/**
 * 씨앗 수 — 고치기 전 가장 드문 것이 ㈁ 기본 도형 10(씨앗 200 에서 1번, 다른 씨앗 400 에서 1번)이다.
 * 그 둘은 씨앗 200 으로는 못 잠근다 — 대신 아래 「드문 자리」 시험이 씨앗 2,000 으로 따로 본다.
 * ㈀ 의 가장 드문 것은 이차 활용 20(10/200) — 놓칠 확률 약 $4\times10^{-5}$.
 */
const SEEDS = 200;

/** ㈀-⑵ 수식 안의 맨 괄호 앞 계수 1 — 앞이 수·소수점·`{` 이면 아니다. */
const BARE_PAREN_ONE = /(?<![\d.{])1\(/;

/** ㈁ 식에 붙은 상수 0 — 문자·닫는 괄호·지수 바로 뒤, 뒤가 수·소수점·지수가 아닐 때. */
const ALGEBRAIC_ZERO = /(?:[a-zA-Z)}\]]|\^\{?\d+\}?)[+-]0(?![\d.^])/;

/** ㈂ 지수 1 을 보는 단원 — 경우의 수·확률. */
const EXP_ONE_UNITS = ["2-2|경우의 수|", "2-2|확률|"];

/** 흉한 표기의 이름들 — 없으면 빈 배열. `key` 가 ㈂ 단원이면 지수 1 도 본다. */
function notationFaults(text: string, key = ""): string[] {
  const out = pageSmells(text).filter(
    (l) =>
      l.includes("계수 1 을 적었다") ||
      (l === "지수 1 을 적었다" &&
        EXP_ONE_UNITS.some((u) => key.startsWith(u))),
  );
  const math = [...text.matchAll(/\$[^$]*\$/g)].map((m) => m[0]);
  if (math.some((m) => BARE_PAREN_ONE.test(m))) {
    out.push("맨 괄호 앞에 계수 1 을 적었다");
  }
  if (math.some((m) => ALGEBRAIC_ZERO.test(m))) {
    out.push("식에 상수 0 을 붙였다");
  }
  return out;
}

describe("표기 판정 눈금 — 양성은 잡고 음성은 안 잡는다", () => {
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
      expect(notationFaults(t), t).not.toEqual([]);
    }
  });

  it("경우의 수·확률 단원의 지수 1 은 결함이고, 다른 단원의 지수 1 은 보지 않는다", () => {
    const counting = "2-2|경우의 수|07";
    for (const t of ["$2^{1}\\times6^{2}=72$", "$2^{2}\\times6^{1}=24$"]) {
      expect(notationFaults(t, counting), t).toEqual(["지수 1 을 적었다"]);
    }
    for (const t of ["$2\\times6^{2}=72$", "$2^{2}\\times6=24$", "$6^{10}$"]) {
      expect(notationFaults(t, counting), t).toEqual([]);
    }
    // 지수법칙 설명·10의 거듭제곱 강조 — 일부러 쓴 지수 1
    for (const [t, key] of [
      ["$3=3^{1}$ 이므로 $3^{1}\\times 3^{16}=3^{17}$", "2-1|단항식의 계산|06"],
      ["$x^{2}\\times x^{1}=x^{3}$", "2-1|단항식의 계산|50"],
      ["분모가 이미 $10^{1}$이므로", "2-1|유리수와 순환소수|36"],
    ] as const) {
      expect(notationFaults(t, key), t).toEqual([]);
    }
  });

  it("식에 붙은 상수 0 은 결함이다", () => {
    for (const t of [
      "$\\angle AOB=(5x+0)^\\circ$",
      "$\\begin{cases}y=2x+0\\\\x+3y=21\\end{cases}$",
      "$y=-(x-0)^2+1$",
      "$y=(x-3)^2+0$",
      "$\\dfrac{1}{3}\\times\\left[14-\\left\\{16-2\\right\\}\\right]+0$",
      "$\\times\\left(+3\\right)+0=1$",
    ]) {
      expect(notationFaults(t), t).toEqual(["식에 상수 0 을 붙였다"]);
    }
  });

  it("계수 없음·두 자리 수·소수·유리화 분자·산술의 참 0 은 결함이 아니다", () => {
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
      // 산술의 참 0
      "두 좌표의 합은 $-6+0=-6$이다.",
      "$a=8-0=8$이므로 $a+b=8+0=8$",
      "$\\alpha^2-\\beta^2=25-0=25$",
      "$\\left(+0\\right)+\\left(+2\\right)=2$",
      "$\\dfrac{(-2)^2+0^2+1^2}{3}$",
      "$\\dfrac{-3-0}{0-(2)}$",
      "$x+0.5$",
      "$(x-3)^2+10$",
    ]) {
      expect(notationFaults(t), t).toEqual([]);
    }
  });
});

const TYPES = registeredTypes().map((e) => ({ key: e.key }));

function faultsOf(key: string, seeds: number, base: number): string[] {
  const bad: string[] = [];
  for (let s = 0; s < seeds && bad.length < 4; s += 1) {
    const p = generateMiddleProblem(key, base + s);
    for (const [field, text] of [
      ["발문", p.content],
      ["정답", p.answer],
      ["해설", p.solution],
    ] as const) {
      for (const label of notationFaults(text, key)) {
        if (bad.length < 4) bad.push(`씨앗 ${s} [${field}] ${label}`);
      }
    }
  }
  return bad;
}

describe(`중등 전 유형(${TYPES.length}) × 씨앗 ${SEEDS} — 계수 1·식의 상수 0 을 적지 않는다`, () => {
  it.each(TYPES)("$key", ({ key }) => {
    expect(faultsOf(key, SEEDS, 20260927)).toEqual([]);
  });
});

/**
 * 드문 자리 — 상수항이 $0$ 이 되는 일이 씨앗 수백에 한두 번뿐인 유형. 전 유형 씨앗 200 으로는
 * 못 잠그므로 이 유형들만 씨앗 2,000 으로 본다(고치기 전 각각 몇 번씩 걸리는 것을 확인했다).
 */
const RARE = [
  "1-2|기본 도형|07",
  "1-2|기본 도형|10",
  "1-2|기본 도형|11",
  "1-2|위치 관계|11",
  "2-1|연립일차방정식|23",
];

describe("드문 자리 — 씨앗 2,000", () => {
  it.each(RARE)("%s", (key) => {
    expect(faultsOf(key, 2000, 7_000_000)).toEqual([]);
  });
});
