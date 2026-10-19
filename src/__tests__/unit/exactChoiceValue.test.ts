import { describe, expect, it } from "vitest";
import {
  exactChoiceValue,
  sameValueChoicePairs,
} from "@/lib/math/exactChoiceValue";

const key = (t: string) => exactChoiceValue(t)?.key ?? null;

describe("exactChoiceValue — 보기 글의 정확값", () => {
  it("같은 값 다른 글자를 같은 열쇠로 읽는다", () => {
    expect(key("$\\sqrt{8}$")).toBe(key("$2\\sqrt{2}$"));
    expect(key("$\\frac{2}{4}$")).toBe(key("$\\frac{1}{2}$"));
    expect(key("$0.5$")).toBe(key("$\\frac{1}{2}$"));
    expect(key("$\\frac{1}{\\sqrt{2}}$")).toBe(key("$\\frac{\\sqrt{2}}{2}$"));
    expect(key("$\\frac{\\sqrt{4}}{2}$")).toBe(key("$1$"));
    expect(key("$\\frac{9}{\\sqrt{10}}$")).toBe(
      key("$\\frac{9\\sqrt{10}}{10}$"),
    );
    expect(key("$-\\frac{3}{4}$")).toBe(key("$\\frac{-3}{4}$"));
    expect(key("$\\dfrac{3}{4}$")).toBe(key("$\\frac{3}{4}$"));
  });

  it("값이 다르면 다른 열쇠 — 단위도 값의 일부다", () => {
    expect(key("$2\\sqrt{3}$")).not.toBe(key("$3\\sqrt{2}$"));
    expect(key("$3\\,\\mathrm{cm}$")).not.toBe(key("$3\\,\\mathrm{m}$"));
    expect(key("$3\\,\\mathrm{cm}$")).toBe(key("$3 \\,\\mathrm{cm}$"));
    expect(key("$3\\,\\mathrm{cm}^2$")).not.toBe(key("$3\\,\\mathrm{cm}$"));
    expect(key("$-2$")).not.toBe(key("$2$"));
    expect(exactChoiceValue("$30^\\circ$")?.unit).toBe("^\\circ");
    expect(exactChoiceValue("$12$개")?.unit).toBe("개");
  });

  it("문자·π·식은 읽지 않는다(판정하지 않음)", () => {
    expect(exactChoiceValue("$x+1$")).toBeNull();
    expect(exactChoiceValue("$\\pi$")).toBeNull();
    expect(exactChoiceValue("$2\\sqrt{3}+1$")).toBeNull();
    expect(exactChoiceValue("$\\frac{x}{2}$")).toBeNull();
  });

  it("정리되지 않은 꼴을 따로 알린다", () => {
    expect(exactChoiceValue("$\\sqrt{8}$")?.unsimplified).toContain(
      "sqrt-square-factor",
    );
    expect(exactChoiceValue("$\\frac{\\sqrt{4}}{2}$")?.unsimplified).toContain(
      "sqrt-of-square",
    );
    expect(exactChoiceValue("$\\frac{\\sqrt{1}}{2}$")?.unsimplified).toContain(
      "sqrt-of-square",
    );
    expect(exactChoiceValue("$1\\sqrt{3}$")?.unsimplified).toContain(
      "coefficient-one",
    );
    expect(exactChoiceValue("$\\frac{2\\sqrt{3}}{4}$")?.unsimplified).toContain(
      "fraction-not-reduced",
    );
    expect(exactChoiceValue("$\\frac{1}{\\sqrt{2}}$")?.unsimplified).toContain(
      "surd-denominator",
    );
    expect(exactChoiceValue("$\\frac{3}{1}$")?.unsimplified).toContain(
      "denominator-one",
    );
    expect(exactChoiceValue("$\\frac{9\\sqrt{10}}{10}$")?.unsimplified).toEqual(
      [],
    );
    expect(exactChoiceValue("$2\\sqrt{3}$")?.unsimplified).toEqual([]);
  });

  it("보기 다섯에서 같은 값 짝을 찾는다", () => {
    expect(
      sameValueChoicePairs([
        "$\\sqrt{12}$",
        "$3$",
        "$2\\sqrt{3}$",
        "$4$",
        "$x$",
      ]),
    ).toEqual([[0, 2]]);
    expect(
      sameValueChoicePairs([
        "$\\frac{\\sqrt{10}}{30}$",
        "$\\frac{\\sqrt{10}}{10}$",
        "$\\frac{3\\sqrt{10}}{10}$",
        "$\\frac{9\\sqrt{10}}{10}$",
        "$3\\sqrt{10}$",
      ]),
    ).toEqual([]);
  });

  it("정밀도를 잃거나 인수분해 범위를 넘는 입력은 동치라고 승인하지 않는다", () => {
    for (const text of [
      "$9007199254740992$",
      "$9007199254740993$",
      "$0.00000000000000001$",
      "$\\sqrt{1000000001}$",
      "$\\sqrt{" + "9".repeat(400) + "}$",
      "$\\frac{9007199254740991}{0.1}$",
      "$9007199254740991\\sqrt{4}$",
      "$\\frac{1}{0}$",
    ])
      expect(exactChoiceValue(text), text).toBeNull();
    expect(
      sameValueChoicePairs(["$9007199254740992$", "$9007199254740993$"]),
    ).toEqual([]);
  });

  it("영·부호·차원은 구별하고 단위 지수의 괄호 차이는 정규화한다", () => {
    expect(key("$-0$")).toBe(key("$0$"));
    expect(key("$3\\,\\mathrm{cm}^{2}$")).toBe(key("$3\\,\\mathrm{cm}^2$"));
    expect(key("$30^{\\circ}$")).toBe(key("$30^\\circ$"));
    expect(key("$3\\,\\mathrm{cm}^{2}$")).not.toBe(
      key("$3\\,\\mathrm{cm}^{3}$"),
    );
  });

  it("독립 정수 관계 k√(s²r)=ks√r를 여러 부호·분모·단위로 대조한다", () => {
    for (const r of [2, 3, 5, 7])
      for (const s of [2, 3, 5]) {
        for (const k of [1, 2, 7])
          for (const d of [1, 3, 11])
            for (const sign of ["", "-"]) {
              const left = `$${sign}\\frac{${k}\\sqrt{${s * s * r}}}{${d}}\\,\\mathrm{cm}$`;
              const right = `$${sign}\\frac{${k * s}\\sqrt{${r}}}{${d}}\\,\\mathrm{cm}$`;
              expect(key(left)).not.toBeNull();
              expect(key(left)).toBe(key(right));
            }
      }
  });
});
