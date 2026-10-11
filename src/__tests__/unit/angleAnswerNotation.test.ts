import { describe, expect, it } from "vitest";
import { compareAngleAnswerNotation as compare } from "@/lib/import/schoolTextbook/angleAnswerNotation";
import { dbRetryAnswersAgree as agree } from "@/lib/import/schoolTextbook/dbRetryReviewBinding";

const triplet = String.raw`원점과 점 $P(-2,-3)$을 지나는 동경의 각을 $\theta$라 할 때, $\sin\theta$, $\cos\theta$, $\tan\theta$의 값을 구하시오.`;
const named = String.raw`$\sin\theta=-\frac{3\sqrt{13}}{13},~\cos\theta=-\frac{2\sqrt{13}}{13},~\tan\theta=\frac{3}{2}$`;
const numbered = "(1) -3√13/13; (2) -2√13/13; (3) 3/2";
const conversion = String.raw`다음에서 육십분법으로 나타낸 각은 호도법으로, 호도법으로 나타낸 각은 육십분법으로 나타내시오.
(1) $120^\circ$ (2) $200^\circ$ (3) $300^\circ$ (4) $\frac{\pi}{3}$ (5) $\frac{5}{4}\pi$ (6) $\frac{11}{6}\pi$`;
const converted = String.raw`⑴ $\frac{2}{3}\pi$ ⑵ $\frac{10}{9}\pi$ ⑶ $\frac{5}{3}\pi$ ⑷ $60^\circ$ ⑸ $225^\circ$ ⑹ $330^\circ$`;
const convertedBlind =
  "(1) 2π/3 rad; (2) 10π/9 rad; (3) 5π/3 rad; (4) 60°; (5) 225°; (6) 330°";

describe("bounded angle and numeric notation", () => {
  it("binds named trig answers to the exact requested order", () => {
    expect(agree(named, numbered, "단답형", triplet)).toBe(true);
    expect(agree(numbered, named, "단답형", triplet)).toBe(true);
  });
  it("checks both the numbering and function names when both are supplied", () => {
    const both = "(1) sinθ = -3√13/13 (2) cosθ = -2√13/13 (3) tanθ = 3/2";
    expect(agree(named, both, "단답형", triplet)).toBe(true);
    expect(agree(both, named, "단답형", triplet)).toBe(true);
    for (const wrong of [
      both.replace("sinθ", "cosθ"),
      both.replace("cosθ", "cosx"),
      both.replace("tanθ = ", ""),
      both.replace("(2)", "(3)"),
    ])
      expect(agree(named, wrong, "단답형", triplet)).toBe(false);
  });
  it.each([
    numbered.replace("-3√13/13", "3√13/13"),
    numbered.replace("-3√13/13; (2) -2√13/13", "-2√13/13; (2) -3√13/13"),
    numbered.replace("(3) 3/2", "(3) 2/3"),
    numbered.replace("; (3) 3/2", ""),
    numbered + "; (4) 0",
    numbered.replace("(2)", "(3)"),
    numbered.replace("-3√13/13", "sin x=-3√13/13"),
    numbered.replace("3/2", "3/2 rad"),
  ])("rejects an altered triplet %s", (wrong) => {
    expect(agree(named, wrong, "단답형", triplet)).toBe(false);
  });
  it("retains function labels and every argument", () => {
    expect(compare(named, numbered, triplet.replace("\\sin", "arcsin"))).toBe(
      false,
    );
    expect(
      agree(named.replace("cos", "sin"), numbered, "단답형", triplet),
    ).toBe(false);
    expect(
      agree(named.replaceAll("theta", "alpha"), numbered, "단답형", triplet),
    ).toBe(false);
    expect(compare(named, numbered, "삼각함수의 값을 구하시오.")).toBe(false);
    expect(compare(named, numbered, triplet.replace("sin", "cos"))).toBe(false);
  });
  it("preserves conversion subparts and infers rad only from a degree input", () => {
    expect(agree(converted, convertedBlind, "단답형", conversion)).toBe(true);
    expect(agree(convertedBlind, converted, "단답형", conversion)).toBe(true);
  });
  it.each([
    convertedBlind.replace("2π/3 rad", "2π/3°"),
    convertedBlind.replace("2π/3 rad", "120°"),
    convertedBlind.replace("60°", "60 rad"),
    convertedBlind.replace("60°", "60"),
    convertedBlind.replace("10π/9", "-10π/9"),
    convertedBlind.replace("(6) 330°", ""),
    convertedBlind.replace("(2)", "(3)"),
  ])("rejects changed conversion values or units %s", (wrong) => {
    expect(agree(converted, wrong, "단답형", conversion)).toBe(false);
  });
  it.each([
    [String.raw`\frac{2}{3}\pi`, "2π/3"],
    [String.raw`-\frac{5\pi}{6}`, "-5π/6"],
    ["(2/3)π", "4π/6"],
    [String.raw`135^{\circ}`, "135°"],
    [String.raw`-\frac{3\sqrt{10}}{10}`, "-3√10/10"],
    [String.raw`\frac{5\sqrt{2}-3}{2}`, "(5√2-3)/2"],
    [String.raw`100\sqrt{10}+25`, "25+100√10"],
    [String.raw`\cos\theta+2\sin\theta`, "cos θ+2 sin θ"],
    [String.raw`-2\cos\theta-2\sin\theta`, "−2cos θ−2sin θ"],
  ])("accepts exact formatting %s / %s", (a, b) => {
    expect(
      agree(a, b, "단답형", "그림과 조건 (가), (나)를 이용하여 값을 구하시오."),
    ).toBe(true);
  });
  it.each([
    ["2π/3", "2/(3π)"],
    ["π", "3.141592653589793"],
    ["π", "π°"],
    ["2π/3", "2π/3 rad"],
    ["135°", "135"],
    ["2π", "2π cm"],
    ["12 cm", "12 m"],
    ["12 cm", "12"],
    ["sin θ", "cos θ"],
    ["sin θ", "sin x"],
    ["sin θ", "sin 2θ"],
    ["cos θ+2sin θ", "cos θ-2sin θ"],
    ["2+tan²θ", "1+1/cos²θ"],
    ["x/x", "1"],
    ["0*(1/x)", "0"],
    ["√(x²)", "x"],
    ["√2", "-√2"],
    ["√2", "±√2"],
    ["1, -1", "1"],
    ["1/0", "0"],
    ["2π/0", "2π"],
    ["2π+π", "3π"],
  ])("does not infer equivalence for %s / %s", (a, b) => {
    expect(compare(a, b, "실수 x의 값을 구하시오.")).toBe(false);
  });
  it("uses explicit radian requests but refuses an unstated unit", () => {
    const q = "부채꼴의 중심각의 크기를 호도법으로 나타내시오.";
    expect(agree(String.raw`\frac{2}{3}`, "2/3 rad", "단답형", q)).toBe(true);
    expect(
      agree(
        String.raw`\frac{2}{3}`,
        "2/3 rad",
        "단답형",
        "중심각의 크기를 구하시오.",
      ),
    ).toBe(false);
    expect(agree("2/3", "2/3°", "단답형", q)).toBe(false);
  });
  it("does not apply an angle instruction to radius or area subparts", () => {
    const q = String.raw`부채꼴에서 반지름의 길이를 $r$, 중심각의 크기를 $\theta$, 넓이를 $S$라 할 때, 다음을 구하시오. (단, 구하는 중심각은 호도법으로 나타내시오.)
(1) $r=3$일 때, $S$ (2) $r=4$일 때, $\theta$ (3) $S=5$일 때, $r$`;
    const a = "(1) 12 (2) π/4 (3) 3π";
    expect(agree(a, "(1) 12 (2) π/4 rad (3) 3π", "단답형", q)).toBe(true);
    expect(agree(a, "(1) 12 rad (2) π/4 rad (3) 3π", "단답형", q)).toBe(false);
    expect(agree(a, "(1) 12 (2) π/4 rad (3) 3π rad", "단답형", q)).toBe(false);
  });
  it("keeps the order in a two-clause conversion", () => {
    const q = String.raw`$144^\circ$를 호도법으로, $\frac{\pi}{45}$를 육십분법으로 나타내시오.`;
    expect(
      agree(
        String.raw`$\frac{4}{5}\pi$, $4^\circ$`,
        "(1) 4π/5 rad (2) 4°",
        "단답형",
        q,
      ),
    ).toBe(true);
    expect(agree("4π/5, 4°", "(1) 4° (2) 4π/5 rad", "단답형", q)).toBe(false);
  });
  it("retains period and both extremum labels", () => {
    const q = "다음 함수의 주기, 최댓값, 최솟값을 각각 구하시오.";
    expect(
      compare(
        String.raw`주기 $\frac{2}{3}\pi$, 최댓값 $\sqrt{2}-1$, 최솟값 $-\sqrt{2}-1$`,
        "주기 2π/3, 최댓값 √2−1, 최솟값 −√2−1",
        q,
      ),
    ).toBe(true);
    expect(
      compare("주기 π, 최댓값 2, 최솟값 -2", "주기 π, 최솟값 2, 최댓값 -2", q),
    ).toBe(false);
  });
  it("leaves the genuine original MC disagreement held", () => {
    expect(
      agree(
        "③",
        "④",
        "객관식",
        "식을 간단히 한 것은?\n① -2\n② -1\n③ 0\n④ 1\n⑤ 2",
      ),
    ).toBe(false);
  });
  it("fails closed on large or unsupported input", () => {
    expect(compare("2 3π", "23π", "값")).toBe(false);
    expect(compare("s inθ", "sinθ", "값")).toBe(false);
    expect(compare("9".repeat(2049), "1", "값")).toBe(false);
    expect(compare("π", "π", "각".repeat(16001))).toBe(false);
    expect(compare("9".repeat(41) + "π", "π", "값")).toBe(false);
    expect(compare("(1) 1 (3) 2", "(1) 1 (2) 2", "값")).toBe(false);
    expect(compare("\\unknown{2}", "2", "값")).toBe(false);
  });
});
