import { describe, expect, it } from "vitest";
import { dbRetryAnswersAgree } from "@/lib/import/schoolTextbook/dbRetryReviewBinding";
const roots = "다음 거듭제곱근 중 실수인 것을 모두 구하시오.";
describe("Exact imported root answer notation", () => {
  it("preserves literal superscripts and rational exponent notation", () => {
    expect(
      dbRetryAnswersAgree(
        "a^{2}b^{\\frac{5}{2}}",
        "a²b^(5/2)",
        "단답형",
        "식을 간단히 하시오.",
      ),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree(
        "a^{\\frac{3}{2}}b",
        "a^(3/2)b",
        "단답형",
        "식을 간단히 하시오.",
      ),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree(
        "a^{-2}b^{20}",
        "a⁻²b²⁰",
        "단답형",
        "식을 간단히 하시오.",
      ),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree(
        "a^{2}b^{\\frac{5}{2}}",
        "a²b^(2/5)",
        "단답형",
        "식을 간단히 하시오.",
      ),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree(
        "a^{2}b^{\\frac{5}{2}}",
        "b²a^(5/2)",
        "단답형",
        "식을 간단히 하시오.",
      ),
    ).toBe(false);
  });
  it("keeps requested order and ordinary words containing 근 or 해", () => {
    expect(
      dbRetryAnswersAgree(
        "-4,4",
        "4,-4",
        "단답형",
        "거듭제곱근 중 실수인 것을 양수, 음수 순서로 구하시오.",
      ),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree(
        "1,2",
        "2,1",
        "단답형",
        "두 실수의 근삿값을 각각 구하시오.",
      ),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree(
        "1,2",
        "2,1",
        "단답형",
        "실수에 대한 해설의 빈칸을 각각 채우시오.",
      ),
    ).toBe(false);
  });
  it("preserves radical index when translating display glyphs", () => {
    expect(
      dbRetryAnswersAgree(
        "4\\sqrt[3]{3}",
        "4∛3",
        "단답형",
        "다음 값을 구하시오.",
      ),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree(
        "2\\sqrt[4]{5}",
        "2∜5",
        "단답형",
        "다음 값을 구하시오.",
      ),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree(
        "4\\sqrt[3]{3}",
        "4∜3",
        "단답형",
        "다음 값을 구하시오.",
      ),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree(
        "4\\sqrt[3]{3}",
        "∛12",
        "단답형",
        "다음 값을 구하시오.",
      ),
    ).toBe(false);
  });
  it("compares every real value requested by an explicit one-variable equation", () => {
    const content =
      "다음 방정식을 만족시키는 실수 $x$의 값을 모두 구하시오. (1) $x^4=625$";
    expect(dbRetryAnswersAgree("$5$, $-5$", "±5", "단답형", content)).toBe(
      true,
    );
    expect(dbRetryAnswersAgree("$5$, $-5$", "5", "단답형", content)).toBe(
      false,
    );
  });
  it("checks a combined choice label and value against the actual numbered choice", () => {
    const content =
      "값은?\n① $\\frac{1}{8}$\n② $\\frac{1}{4}$\n③ $\\frac{1}{2}$";
    expect(
      dbRetryAnswersAgree("① $\\frac{1}{8}$", "①", "객관식", content),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree("② $\\frac{1}{8}$", "①", "객관식", content),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree("① $\\frac{1}{4}$", "①", "객관식", content),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree("① $\\frac{1}{8}$", "②", "객관식", content),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree("① ($\\frac{1}{8}$)", "①", "객관식", content),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree("① ($\\frac{1}{4}$)", "①", "객관식", content),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree("② ($\\frac{1}{8}$)", "②", "객관식", content),
    ).toBe(false);
  });
  it.each([
    ["(1) $3$ (2) $-6$ (3) $\\pm 4$ (4) 없다", "(1) 3 (2) -6 (3) ±4 (4) 없다"],
    ["(1) $4$ (2) $3$, $-3$ (3) 없다", "(1) 4 (2) ±3 (3) 없다"],
    ["-4,4", "4,-4"],
    ["⑴ $3$ ⑵ $\\pm 4$", "\\text{(1) }3;\\quad\\text{(2) }±4"],
  ])("accepts complete equivalent root notation %s", (stored, blind) =>
    expect(dbRetryAnswersAgree(stored, blind, "단답형", roots)).toBe(true),
  );
  it.each([
    ["±4", "4", roots],
    ["-4,4", "4,5", roots],
    ["x=4,y=-4", "x=-4,y=4", roots],
    ["(1) 3 (2) ±4", "(1) ±4 (2) 3", roots],
    ["3,-5", "-5,3", "세제곱근의 개수와 실수인 근을 순서대로 구하시오."],
    ["(x,y)=(4,-4)", "(x,y)=(-4,4)", roots],
    ["4 cm", "4", roots],
    ["⑴ 3 ⑵ 4", "(1) 3", roots],
    ["3,-5", "-5,3", "순서쌍의 좌표를 구하시오."],
  ])(
    "preserves all roots, subparts, counts, units and variables %s",
    (stored, blind, content) =>
      expect(dbRetryAnswersAgree(stored, blind, "단답형", content)).toBe(false),
  );
});
