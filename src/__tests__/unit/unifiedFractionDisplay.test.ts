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
  it("preserves a fraction raised to a power so grouping cannot change", () => {
    expect(displayFractions("$\\frac{9}{4}^{2}$", "초5")).toBe(
      "$\\frac{9}{4}^{2}$",
    );
  });

  // 초등 엔진 1,380문항에 대어 본 결과(2026-09-19)에서 나온 자리들이다. 바꿔서 뜻이 깨지면
  // 원문을 둔다 — 대분수는 «같은 수를 초등 표기로» 보이는 것이지 문제를 고치는 것이 아니다.
  it("keeps a calculation step that would read the same on both sides of =", () => {
    // 초6 비와 비율 해설 — 접히면 «300=300» 이 되어 계산 단계가 사라진다(08-24 와 같은 결함).
    const step = String.raw`기준량은 넓이입니다. $\frac{1500}{5}=300$`;
    expect(displayFractions(step, "초6")).toBe(step);
    const convert = String.raw`$\frac{7}{3}=2\frac{1}{3}$`;
    expect(displayFractions(convert, "초5")).toBe(convert);
    const back = String.raw`$2\frac{1}{3}=\frac{7}{3}$`;
    expect(displayFractions(back, "초5")).toBe(back);
    // 다른 값과 이어진 등식은 그대로 바꾼다.
    expect(
      displayFractions(String.raw`$\frac{1}{3}+2=\frac{7}{3}$`, "초5"),
    ).toBe(String.raw`$\frac{1}{3}+2=2\frac{1}{3}$`);
    expect(displayFractions(String.raw`$\frac{10}{3}=3000$`, "초5")).toBe(
      String.raw`$3\frac{1}{3}=3000$`,
    );
    expect(
      displayFractions(String.raw`$\frac{6}{2}=3\frac{1}{2}$`, "초5"),
    ).toBe(String.raw`$3=3\frac{1}{2}$`);
    const spaced = String.raw`$\frac{80}{2} = 40\,\mathrm{km}$`;
    expect(displayFractions(spaced, "초6")).toBe(spaced);
  });

  it("keeps the fraction a question names by its kind", () => {
    // 초3 분수 — 묻는 분수를 1⅕ 로 바꾸면 «진분수와 가분수 중 무엇»이 성립하지 않는다.
    const classify = String.raw`다음 분수는 진분수와 가분수 중 무엇인지 쓰시오.

$\frac{6}{5}$`;
    expect(displayFractions(classify, "초3")).toBe(classify);
    // «나타낸» 은 «나타내» 와 다른 음절이다 — 동사 목록으로는 못 잡았다.
    const shown = String.raw`$\frac{7}{3}$ 을 대분수로 나타낸 수를 쓰시오.`;
    expect(displayFractions(shown, "초4")).toBe(shown);
    // 초6 분수의 나눗셈 해설 — 가분수로 고친 식을 다시 대분수로 보이면 단계가 거꾸로 선다.
    const solution = String.raw`대분수를 가분수로 고칩니다. $3\frac{1}{5}=\frac{16}{5}$ 이므로 나누는 수의 분모와 분자를 바꾸어 곱합니다. $\frac{16}{5}\times\frac{6}{11}=1\frac{41}{55}$`;
    expect(
      displayFractions(
        solution,
        "초6",
        String.raw`$3\frac{1}{5}\div1\frac{5}{6}$ 을 계산하시오.`,
      ),
    ).toBe(solution);
    // 정답·해설은 본문을 «묻는 말»로 받아 같은 판정을 한다.
    expect(
      displayFractions(
        String.raw`$\frac{7}{3}$`,
        "초4",
        String.raw`대분수 $2\frac{1}{3}$ 을 가분수로 쓰시오.`,
      ),
    ).toBe(String.raw`$\frac{7}{3}$`);
  });
});
