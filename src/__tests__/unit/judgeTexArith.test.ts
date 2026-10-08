/**
 * **지면에 찍힌 식을 다시 계산하는 계산기** (`src/lib/middle/judge/texArith.ts` — 2026-10-08 엔진 보강 2단계).
 *
 * 2단계 판정형(곱셈 · 나눗셈 · 거듭제곱 · 식의 값 · 비교형)의 `truthOf` · `valueOf` 가 전부 이것을 탄다.
 * 여기가 틀리면 등록부 관문이 «거짓 보기를 참으로» 읽는다 — 그래서 손으로 센 값으로 못 박는다.
 *
 * ```
 * ㉠ 차례 — 거듭제곱 → 곱셈 · 나눗셈 → 덧셈 · 뺄셈, 맨 앞 부호는 항 전체에 걸린다($-2^{2}=-4$)
 * ㉡ 우리 엔진이 찍는 꼴 — 부호 붙은 괄호 · `\dfrac` · 계수와 문자 · 문자 대입
 * ㉢ 못 읽는 것은 null — 넓게 읽으려 애쓰지 않는다
 * ㉣ 등식 판정 · 대입값 읽기 · 크기 비교
 * ```
 */
import { describe, expect, it } from "vitest";

import {
  compareFrac,
  equationTruth,
  evalTex,
  expressionValue,
  fracText,
  readEnv,
  sameFrac,
  type Frac,
} from "@/lib/middle/judge/texArith";

const F = (n: number, d = 1): Frac => ({ n: BigInt(n), d: BigInt(d) });
/** 값을 `n/d` 기약 글로 — 기대값을 눈으로 읽게. */
const val = (tex: string, env: Record<string, Frac> = {}) => {
  const v = evalTex(tex, env);
  return v === null ? null : fracText(v);
};

describe("㉠ 연산 차례", () => {
  it("맨 앞 부호는 거듭제곱 **뒤에** 걸린다 — $-2^{2}$ 은 $-4$, $(-2)^{2}$ 은 $4$", () => {
    expect(val("-2^{2}")).toBe("-4");
    expect(val("\\left(-2\\right)^{2}")).toBe("4");
    expect(val("-\\left(-2\\right)^{3}")).toBe("8");
    expect(val("-\\left(-2\\right)^{2}")).toBe("-4");
    expect(val("-2^{3}")).toBe("-8");
  });

  it("거듭제곱 → 곱셈 · 나눗셈 → 덧셈 · 뺄셈", () => {
    expect(val("-2^{2}\\times 2")).toBe("-8");
    expect(val("\\left(-2\\right)^{2}\\times 2")).toBe("8");
    expect(val("-2^{2}\\times\\left(-2\\right)")).toBe("8");
    expect(val("2+3\\times 4")).toBe("14");
    expect(val("12\\div 4\\times 3")).toBe("9"); // 왼쪽부터
    expect(val("10-4-3")).toBe("3"); // 왼쪽부터
    expect(val("5-2^{2}")).toBe("1");
  });
});

describe("㉡ 우리 엔진이 찍는 꼴", () => {
  it("부호 붙은 괄호 · 분수 — 덧셈 · 뺄셈 · 곱셈 · 나눗셈", () => {
    expect(
      val("\\left(+\\dfrac{1}{2}\\right)+\\left(-\\dfrac{3}{4}\\right)"),
    ).toBe("-1/4");
    expect(val("\\left(-\\dfrac{2}{3}\\right)-\\left(-3\\right)")).toBe("7/3");
    expect(
      val("\\left(+\\dfrac{2}{3}\\right)\\times\\left(-\\dfrac{9}{4}\\right)"),
    ).toBe("-3/2");
    expect(
      val("\\left(-\\dfrac{3}{4}\\right)\\div\\left(-\\dfrac{9}{8}\\right)"),
    ).toBe("2/3");
  });

  it("거듭제곱이 든 곱셈 · 혼합 계산(원천 15 · 20 의 꼴)", () => {
    expect(
      val("-\\left(\\dfrac{2}{3}\\right)^{2}\\times\\left(-3\\right)^{3}"),
    ).toBe("12");
    expect(val("\\left(-\\dfrac{1}{2}\\right)^{3}\\times 4^{2}")).toBe("-2");
    expect(
      val(
        "\\left(\\dfrac{2}{3}\\right)^{2}\\times\\left(-6\\right)\\div\\left(+\\dfrac{4}{3}\\right)",
      ),
    ).toBe("-2");
  });

  it("문자 대입 — 음수는 **값으로** 들어간다(괄호 없이 글자를 바꿔 끼우지 않는다)", () => {
    const x = { x: F(-3) };
    expect(val("x^{2}", x)).toBe("9");
    expect(val("-x^{2}", x)).toBe("-9");
    expect(val("\\left(-x\\right)^{2}", x)).toBe("9");
    expect(val("\\left(-x\\right)^{3}", x)).toBe("27");
    expect(val("-x^{3}", x)).toBe("27");
    expect(val("2x+5", x)).toBe("-1");
    expect(val("-2x^{2}+1", x)).toBe("-17");
    expect(val("7-x^{2}", x)).toBe("-2");
    expect(val("\\dfrac{6}{x}", x)).toBe("-2");
    expect(val("-\\dfrac{12}{x}+1", x)).toBe("5");
    expect(val("3a", { a: F(-1, 2) })).toBe("-3/2");
  });

  it("공백은 뜻이 없다", () => {
    expect(val(" 2 + 3 \\times 4 ")).toBe("14");
  });
});

describe("㉢ 못 읽는 것은 null", () => {
  it("모르는 글 · 덜 닫힌 괄호 · 남는 글 · 대입값 없는 문자 · 0 으로 나누기", () => {
    for (const tex of [
      "",
      "넷 더하기 넷",
      "\\left(2+3",
      "2+3\\right)",
      "2+",
      "2\\times",
      "2^{x}",
      "2^{}",
      "\\frac{1}{2}", // `\dfrac` 만 읽는다 — 공용 오답의 `\frac` 이 그대로 새면 못 읽게
      "\\dfrac{1}{0}",
      "3\\div 0",
      "x+1", // 대입값 없음
      "2\\sqrt{3}",
      "1.5+2", // 소수는 우리 꼴이 아니다
      "2=2",
    ])
      expect(evalTex(tex), tex).toBeNull();
  });

  it("문자 뒤에 문자 · 괄호 앞의 계수 같은 «찍지 않는 꼴»은 읽지 않는다", () => {
    const env = { x: F(2), y: F(3) };
    expect(evalTex("xy", env)).toBeNull();
    expect(evalTex("2\\left(x+1\\right)", env)).toBeNull();
    expect(evalTex("x2", env)).toBeNull();
  });
});

describe("㉣ 등식 · 식의 값 · 대입값 · 비교", () => {
  it("equationTruth — 왼쪽은 식, 오른쪽은 값 하나", () => {
    expect(
      equationTruth(
        "$\\left(+\\dfrac{2}{3}\\right)\\times\\left(-\\dfrac{9}{4}\\right)=-\\dfrac{3}{2}$",
      ),
    ).toBe(true);
    expect(
      equationTruth(
        "$\\left(+\\dfrac{2}{3}\\right)\\times\\left(-\\dfrac{9}{4}\\right)=\\dfrac{3}{2}$",
      ),
    ).toBe(false);
    // 약분 안 된 값도 값으로는 같다(교차곱) — 기약인가는 다른 축이다.
    expect(equationTruth("$2\\times 3=\\dfrac{12}{2}$")).toBe(true);
    expect(equationTruth("$-x^{2}=-9$", { x: F(-3) })).toBe(true);
    expect(equationTruth("$-x^{2}=9$", { x: F(-3) })).toBe(false);
  });

  it("equationTruth — 이 꼴이 아니면 null", () => {
    for (const text of [
      "2\\times 3=6", // `$` 없음
      "$2\\times 3$", // 등호 없음
      "$2\\times 3=6=6$",
      "$2\\times 3=2+4$", // 오른쪽이 식
      "$2\\times 3=+6$",
      "$=6$",
      "$x^{2}=9$", // 대입값 없음
    ])
      expect(equationTruth(text), text).toBeNull();
  });

  it("expressionValue — `$식$` 의 값", () => {
    expect(fracText(expressionValue("$-2^{2}\\times 2$")!)).toBe("-8");
    expect(expressionValue("$-2^{2}\\times 2=8$")).toBeNull();
    expect(expressionValue("-2^{2}")).toBeNull();
  });

  it("readEnv — 발문의 «$x=-3$일 때»를 읽는다", () => {
    const env = readEnv("$x=-3$일 때, 다음 중 식의 값이 옳지 않은 것은?");
    expect(Object.keys(env)).toEqual(["x"]);
    expect(fracText(env.x!)).toBe("-3");
    expect(fracText(readEnv("$a=-\\dfrac{1}{2}$일 때, 다음 중 …")["a"]!)).toBe(
      "-1/2",
    );
    expect(readEnv("다음 중 계산이 옳지 않은 것은?")).toEqual({});
  });

  it("sameFrac · compareFrac — 약분 · 분모 부호와 무관하다", () => {
    expect(sameFrac(F(2, 4), F(1, 2))).toBe(true);
    expect(sameFrac(F(-1, 2), F(1, -2))).toBe(true);
    expect(sameFrac(F(1, 2), F(1, 3))).toBe(false);
    expect(compareFrac(F(1, 3), F(1, 2))).toBe(-1);
    expect(compareFrac(F(-1, 2), F(1, -3))).toBe(-1);
    expect(compareFrac(F(3, -4), F(-3, 4))).toBe(0);
    expect(compareFrac(F(5), F(9, 2))).toBe(1);
  });

  it("fracText — 기약 · 분모 양수 · 정수는 분모 없이", () => {
    expect(fracText(F(6, -4))).toBe("-3/2");
    expect(fracText(F(8, 2))).toBe("4");
    expect(fracText(F(0, 7))).toBe("0");
  });
});
