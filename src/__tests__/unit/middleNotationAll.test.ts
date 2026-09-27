/**
 * 중등 **전 유형** — 값은 맞는데 지면 표기가 흉한 것 세 가지를 잠근다.
 *
 *  ㈀ 계수 $1$ 을 적지 않는다(`$1x+47$` 이 아니라 `$x+47$`).
 *  ㈁ 식에 상수 $0$ 을 붙이지 않는다(`$(5x+0)^\circ$`·`$y=2x+0$`·`$(x-0)^2$` 가 아니라 `$(5x)^\circ$`·`$y=2x$`·`$x^2$`).
 *  ㈂ **경우의 수·확률 단원**에서 지수 $1$ 을 적지 않는다(`$2^{1}\times6^{2}$` 이 아니라 `$2\times6^{2}$`).
 *     다른 단원의 지수 $1$ 은 일부러 쓴 것이 많아 보지 않는다 — 지수법칙 설명(「$3=3^{1}$ 이므로」·
 *     「$x^{2}\times x^{1}=x^{3}$」), 10의 거듭제곱 강조(「분모가 $10^{1}$이 된다」), 소인수(「$2^{1}$을 뺀 부분」).
 *     어느 것을 고칠지는 2026-09-27 이 세션에서 **경우의 수 공식만**으로 정해졌다.
 *  ㈃ 뜻 없는 등식을 적지 않는다 — 등호 사슬에서 이웃한 두 변이 같다(`$5=5$ 이므로`·`$y=-3=-3$`·
 *     `$\sqrt{38}=\sqrt{38}$`·`$4:7=4:7$`). 소인수분해·약분·근호 정리가 할 일이 없을 때 생긴다.
 *  ㈄ 계수 $0$ 을 적지 않는다(`$0x+3y$` 가 아니라 `$3y$`) — 공용 가드 「계수 0 을 적었다」.
 *  ㈅ 분모 $1$ 인 분수를 **정답**에 적거나 **곱하지** 않는다(`$\dfrac{7}{1}$`·`$3\times\dfrac{3}{1}$`).
 *     대입을 보이는 줄(`$-6=\dfrac{a}{1}$`)·기울기 공식(`$\dfrac{-3}{1}=-3$`)은 풀이라 보지 않는다.
 *  ㈆ 「양변을 $1$로 나누면」을 적지 않는다 — 계수가 $1$ 이면 나눌 것이 없다.
 *
 * 값 검산은 이 부류를 구조적으로 못 본다. 판정:
 *  ㈀ 공용 가드 `pageSmells`(`../helpers/midPage.ts`)의 계수 $1$ 규칙 넷 — 「계수 1 을 적었다」(`1x`)·
 *     「괄호 앞에 계수 1 을 적었다」(`1\left(`)·「π·√ 앞에 계수 1 을 적었다」(`1\pi`)·「맨 괄호 앞에 계수
 *     1 을 적었다」(`$1(a+b)$`). 마지막 것은 처음에 이 파일이 들고 있던 자를 2026-09-27 리드 결정으로
 *     공용 가드에 올린 것이다(눈금은 `midPageGuards.test.ts`).
 *  ㈁ 공용 가드의 「상수 0 을 더했다」(`[+-]0`)는 **산술의 참 0** 까지 잡는다 — 2026-09-27 전수에서 걸린
 *     18유형 중 10유형이 그랬다(「두 좌표의 합은 $-6+0=-6$」·분산의 「$0^2$」·기울기 「$\dfrac{-3-0}{0-2}$」·
 *     근 $\beta=0$ 의 「$25-0=25$」·역원의 「$(+0)+(+2)$」 …). 그것은 결함이 아니라 풀이다. 그래서 여기서는
 *     **식에 붙은** $\pm0$ 만 본다 — 문자·닫는 괄호·지수 바로 뒤의 $\pm0$(뒤가 수·소수점·지수가 아닐 때).
 *     전수에서 이 규칙은 진짜 8유형만 잡았다.
 *     ⚠️ 이 좁은 자는 공용 가드로 **안 올렸다** — `middleM3Top2`(41U·42U 가 낸 `$-8+0=-8$`)·
 *     `middleM1Top5g`(`$3-0=3$`)가 공용의 넓은 규칙에 기대 잠그고 있어, 좁히면 그 잠금이 약해진다.
 *
 * 2026-09-27 고친 것: ㈀ 31유형(원과 부채꼴 04·06 은 먼저) · ㈁ 8유형(기본 도형 07·10·11, 위치 관계 11,
 * 연립 23, 이차함수의 그래프 ⑵ 70·71, 정수와 유리수의 계산 21) · ㈂ 경우의 수 07·71 ·
 * ㈃ 22유형(정비례와 반비례 02·05·07·09, 정수와 유리수의 계산 71, 최대공약수와 최소공배수 01~03,
 * 유리수와 순환소수 01·05·06·08·14·37, 평행선 53, 확률 01, 근호 06·19, 이차함수의 그래프 ⑵ 10·11,
 * 산포도 03, 삼각비 07) · ㈄ 다항식의 계산 50~52 · ㈅ 순환소수 44(정답)·닮음 02~07·평행선 01·19 ·
 * ㈆ 일차부등식 07·08·09·61, 일차함수와 일차방정식의 관계 74.
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

/** ㈁ 식에 붙은 상수 0 — 문자·닫는 괄호·지수 바로 뒤, 뒤가 수·소수점·지수가 아닐 때. */
const ALGEBRAIC_ZERO = /(?:[a-zA-Z)}\]]|\^\{?\d+\}?)[+-]0(?![\d.^])/;

/** ㈂ 지수 1 을 보는 단원 — 경우의 수·확률. */
const EXP_ONE_UNITS = ["2-2|경우의 수|", "2-2|확률|"];

/** ㈃ 등호 사슬에서 이웃한 두 변이 (빈칸을 빼고) 같은가. */
function trivialEquation(math: string): boolean {
  const sides = math
    .slice(1, -1)
    .split("=")
    .map((s) => s.replace(/\s+|\\[,;!]/g, ""));
  return sides.some((s, i) => i > 0 && s !== "" && s === sides[i - 1]);
}

/** ㈅ 분모가 $1$ 인 분수. */
const DENOM_ONE = /\\d?frac\{[^{}]*\}\{1\}/;
const TIMES_DENOM_ONE = /\\times\s*\\d?frac\{[^{}]*\}\{1\}/;

/** ㈆ 「$1$로 나누면」 */
const DIVIDE_BY_ONE = /\$1\$\s*(?:로|으로)\s*나누/;

/**
 * 흉한 표기의 이름들 — 없으면 빈 배열. `key` 가 ㈂ 단원이면 지수 1 도 본다.
 * `field` 가 「정답」이면 분모 $1$ 인 분수를 어디서든 본다(㈅).
 */
function notationFaults(text: string, key = "", field = ""): string[] {
  const out = pageSmells(text).filter(
    (l) =>
      l.includes("계수 1 을 적었다") ||
      l === "계수 0 을 적었다" ||
      (l === "지수 1 을 적었다" &&
        EXP_ONE_UNITS.some((u) => key.startsWith(u))),
  );
  const math = [...text.matchAll(/\$[^$]*\$/g)].map((m) => m[0]);
  if (math.some((m) => ALGEBRAIC_ZERO.test(m))) {
    out.push("식에 상수 0 을 붙였다");
  }
  if (math.some(trivialEquation)) out.push("뜻 없는 등식을 적었다");
  if (
    TIMES_DENOM_ONE.test(text) ||
    (field === "정답" && DENOM_ONE.test(text))
  ) {
    out.push("분모 1 인 분수를 적었다");
  }
  if (DIVIDE_BY_ONE.test(text)) out.push("1 로 나눴다");
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

  it("뜻 없는 등식은 결함이고, 무엇이 바뀌는 등식은 아니다", () => {
    for (const t of [
      "$5=5$ 이므로 분모와 분자에 $2$ 를 곱하면",
      "$y=-3=-3$이다.",
      "$\\sqrt{38}=\\sqrt{38}$(점)",
      "$\\overline{AB}:\\overline{AC}=4:7=4:7$",
      "$\\dfrac{5}{36}=\\dfrac{5}{36}$",
      "$y=2x^2+3=2x^2+3$",
      "$2 = 2$",
    ]) {
      expect(notationFaults(t), t).toEqual(["뜻 없는 등식을 적었다"]);
    }
    for (const t of [
      "$\\overline{AB}:\\overline{AC}=6:4=3:2$",
      "$\\dfrac{2}{4}=\\dfrac{1}{2}$",
      "$5\\sqrt{6}=\\sqrt{150}$",
      "$y=-(-3)=3$",
      "$10^{1}=2^{1}\\times5^{1}$",
      "$x=3$",
      "$=3$",
    ]) {
      expect(notationFaults(t), t).toEqual([]);
    }
  });

  it("계수 0 · 분모 1 · 「1로 나누면」 은 결함이고, 대입·기울기 공식의 분모 1 은 아니다", () => {
    expect(notationFaults("$0x+3y$")).toEqual(["계수 0 을 적었다"]);
    expect(notationFaults("$0x-2y$가 되었다")).toEqual(["계수 0 을 적었다"]);
    expect(notationFaults("$\\dfrac{7}{1}$", "", "정답")).toEqual([
      "분모 1 인 분수를 적었다",
    ]);
    expect(notationFaults("$3\\times\\dfrac{3}{1}=9$")).toEqual([
      "분모 1 인 분수를 적었다",
    ]);
    expect(notationFaults("양변을 $1$로 나누면 $x\\le -8$이다.")).toEqual([
      "1 로 나눴다",
    ]);
    for (const [t, field] of [
      ["$-6=\\dfrac{a}{1}$에서 $a=-6$", "해설"],
      ["$\\dfrac{f(1)-f(0)}{1-(0)}=\\dfrac{-3}{1}=-3$", "해설"],
      ["$3\\times\\dfrac{3}{10}$", "해설"],
      ["$\\dfrac{1}{7}$", "정답"],
      ["양변을 $-1$로 나누면", "해설"],
      ["양변을 $10$으로 나누면", "해설"],
      ["$10x+0.5y$", "해설"],
    ] as const) {
      expect(notationFaults(t, "", field), t).toEqual([]);
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
      for (const label of notationFaults(text, key, field)) {
        if (bad.length < 4) bad.push(`씨앗 ${s} [${field}] ${label}`);
      }
    }
  }
  return bad;
}

describe(`중등 전 유형(${TYPES.length}) × 씨앗 ${SEEDS} — 흉한 표기(㈀~㈆)를 적지 않는다`, () => {
  it.each(TYPES)("$key", ({ key }) => {
    expect(faultsOf(key, SEEDS, 20260927)).toEqual([]);
  });
});

/**
 * 드문 자리 — 걸리는 일이 씨앗 수백에 한두 번뿐인 유형. 전 유형 씨앗 200 으로는 못 잠그므로
 * 이 유형들만 씨앗 2,000 으로 본다(고치기 전 각각 몇 번씩 걸리는 것을 확인했다).
 * ㈁ 상수항이 $0$ — 기본 도형 07·10·11, 위치 관계 11, 연립 23.
 * ㈃ $a=-1$ 에 양수를 대입 — 정비례와 반비례 02(씨앗 200 중 2번)·07(1번).
 * ㈆ $x$ 의 계수가 $1$ — 일차부등식 09(3번).
 */
const RARE = [
  "1-1|정비례와 반비례|02",
  "1-1|정비례와 반비례|07",
  "1-2|기본 도형|07",
  "1-2|기본 도형|10",
  "1-2|기본 도형|11",
  "1-2|위치 관계|11",
  "2-1|연립일차방정식|23",
  "2-1|일차부등식|09",
];

describe("드문 자리 — 씨앗 2,000", () => {
  it.each(RARE)("%s", (key) => {
    expect(faultsOf(key, 2000, 7_000_000)).toEqual([]);
  });
});
