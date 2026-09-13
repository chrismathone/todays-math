import { describe, expect, it } from "vitest";
import { displayFractions } from "@/components/unified/fractionDisplay";

describe("unified elementary fraction display", () => {
  it("converts elementary improper fractions while preserving source", () => {
    const raw = "계산하세요. $\\frac{9}{4} + \\frac{6}{3}$";
    expect(displayFractions(raw, "초5")).toBe(
      "계산하세요. $2\\frac{1}{4} + 2$",
    );
    expect(raw).toContain("\\frac{9}{4}");
  });
  it("preserves secondary, proper fractions and conversion exercises", () => {
    for (const grade of ["중1", "고1", "secondary"])
      expect(displayFractions("$\\frac{9}{4}$", grade)).toBe("$\\frac{9}{4}$");
    expect(displayFractions("$\\frac{1}{4}$", "초5")).toBe("$\\frac{1}{4}$");
    const prompt = "가분수 $\\frac{9}{4}$를 대분수로 바꾸세요.";
    expect(displayFractions(prompt, "초5")).toBe(prompt);
  });
  it("does not change existing mixed numbers or nested fractions", () => {
    const raw = "$2\\frac{9}{4} + \\frac{\\frac{9}{4}}{3} + x^{\\frac{9}{4}}$";
    expect(displayFractions(raw, "초5")).toBe(raw);
    const converted = displayFractions("$\\frac{9}{4}$", "초5");
    expect(displayFractions(converted, "초5")).toBe(converted);
  });
});
