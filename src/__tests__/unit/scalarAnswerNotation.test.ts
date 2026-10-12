// @vitest-environment node
import { describe, expect, it } from "vitest";
import { compareScalarAnswerNotation as compare } from "../../lib/import/schoolTextbook/scalarAnswerNotation";

const SCALAR = "실수 a, b, c, f, x, y에 대한 식의 값을 구하시오.";
const LOGS = String.raw`$\log_2 3=a$, $\log_2 5=b$일 때, 주어진 값을 a, b로 나타내시오.`;

describe("compareScalarAnswerNotation", () => {
  it.each([
    [String.raw`\frac{4a+b}{2b+4}`, "(4a+b)/(2b+4)"],
    [String.raw`\frac{2\sqrt{3}}{3}`, "2√3/3"],
    ["a-2b+2", "a+2-2b"],
    [String.raw`\frac{a+2b-2}{4}`, "(a+2b-2)/4"],
    [String.raw`2^{\frac{17}{7}}`, "2^{17/7}"],
    [String.raw`a^{2}b^{\frac{5}{2}}`, "a²b^(5/2)"],
  ])("accepts a held scalar answer: %s", (left, right) => {
    expect(compare(left, right, LOGS)).toBe(true);
    expect(compare(right, left, LOGS)).toBe(true);
  });

  it.each([
    ["1/3+1/6", "0.5"],
    ["0.1+0.2", "3/10"],
    ["9007199254740993+2", "9007199254740995"],
    ["2*(3+4)/5", "14/5"],
    ["-1/-2", "1/2"],
    ["−.25", String.raw`-\frac{1}{4}`],
    ["{(3)}", "3"],
    ["(4)/(3)", "4/3"],
    ["2×3÷4", "1.5"],
    [String.raw`\frac{\frac{1}{2}}{3}`, "1/6"],
    ["a+b+c", "c+(b+a)"],
    ["a*b*c", "c*(b*a)"],
    ["2*a*3*b", "6*b*a"],
    ["a b", "b*a"],
    ["2(a+b)", "(b+a)*2"],
    ["(a+b)(a-b)", "(a-b)*(b+a)"],
    ["a+0", "a"],
    ["1*a", "a"],
    ["a/(b+c)", "a/(c+b)"],
    [String.raw`$$\dfrac{4a+b}{2b+4}$$`, "(b+4*a)/(4+2*b)"],
    [String.raw`\(\tfrac{2\,\sqrt{3}}{3}\)`, "2√3/3"],
    [String.raw`$\left(a+2\right)$`, "{2+a}"],
    [String.raw`\[a\cdot b\]`, "b*a"],
    [String.raw`\sqrt[2]{3}`, "√3"],
    [String.raw`\sqrt[3]{8}`, "∛8"],
    [String.raw`\sqrt[4]{16}`, "∜16"],
    [String.raw`\sqrt[3]{8}`, "³√8"],
    [String.raw`\sqrt[4]{16}`, "⁴√16"],
    [String.raw`\sqrt{a+b}`, "√(b+a)"],
    [String.raw`\sqrt[3]{-8}`, "∛(-8)"],
    ["sqrt(3)", String.raw`\sqrt{3}`],
    ["a²", "a^{2}"],
    ["a⁻²", "a^(-2)"],
    ["a¹²", "a^{12}"],
    ["a^(b+2)", "a^{2+b}"],
    ["2^(.5)", String.raw`2^{\frac{1}{2}}`],
    ["a^(2/4)", "a^(1/2)"],
  ])("proves exact supported notation: %s = %s", (left, right) => {
    expect(compare(left, right, SCALAR)).toBe(true);
    expect(compare(right, left, SCALAR)).toBe(true);
  });

  it.each([
    ["x/y", "y/x"],
    ["2x+y", "2y+x"],
    [String.raw`\frac{4a+b}{2b+4}`, "(4a-b)/(2b+4)"],
    [String.raw`\frac{4a+b}{2b+4}`, "(4a+b)/(2a+4)"],
    [String.raw`\frac{4a+b}{2b+4}`, "(2b+4)/(4a+b)"],
    [String.raw`\frac{2\sqrt{3}}{3}`, "2∛3/3"],
    [String.raw`\sqrt[3]{8}`, "∜8"],
    [String.raw`2^{\frac{17}{7}}`, "2^(17/8)"],
    [String.raw`a^{2}b^{\frac{5}{2}}`, "b²a^(5/2)"],
    ["2^(17/7)", "2^17/7"],
    ["a-2b+2", "a+2b+2"],
    ["0.1+0.2", "0.30000000000000004"],
    ["9007199254740993", "9007199254740992"],
    ["-a^2", "(-a)^2"],
    ["a/b/c", "a/(b/c)"],
    ["a/(b*c)", "a/b*c"],
  ])(
    "keeps signs, order-sensitive operations and identities: %s / %s",
    (left, right) => {
      expect(compare(left, right, SCALAR)).toBe(false);
      expect(compare(right, left, SCALAR)).toBe(false);
    },
  );

  it.each([
    ["x/x", "1"],
    ["(x^2-1)/(x-1)", "x+1"],
    ["0*(1/x)", "0"],
    ["0*x", "0*y"],
    ["x-x", "0"],
    ["a^0", "1"],
    ["(x/x)^0", "1"],
    ["(a^2)^(1/2)", "a"],
    ["√(a^2)", "a"],
    ["√4", "2"],
    ["∛8", "2"],
    ["2^3", "8"],
    ["a^(1/2)", "√a"],
    ["a+a", "2a"],
    ["2*(a+b)", "2a+2b"],
    ["√a*√b", "√(a*b)"],
  ])(
    "does not perform general algebra or lose domains: %s / %s",
    (left, right) => {
      expect(compare(left, right, SCALAR)).not.toBe(true);
    },
  );

  it.each([
    "±2",
    String.raw`\pm 2`,
    "2, -2",
    "(1,2)",
    "[1,2]",
    "{1,2}",
    "x=2",
    "x=2,y=3",
    "(x,y)=(2,3)",
    "(1)2 (2)3",
    "(1)a",
    "① 2",
    "2cm",
    "2 mm",
    "2kg",
    "2W",
    "2 cm²",
    String.raw`2\mathrm{cm}`,
    String.raw`2\text{kg}`,
    "2미터",
    "정답은 2",
    "답: 2",
    "2 개",
    "log(a)",
    String.raw`\log a`,
    "sin(a)",
    "ln(a)",
    "pi",
    "cm",
    "ab",
    "f(a)",
    "-f(a)",
    "-f^2(a)",
    "2*-f(a)",
    "2f(a)",
    "2*f(a)",
    "f^2(a)",
    "sin a",
    "Infinity",
    "NaN",
    "a_1",
    "|a|",
    "a!",
    "a%",
    "a≤2",
    "a→b",
    "a+b;",
    "a&b",
    "__proto__",
    "constructor",
    "globalThis",
    "alert(1)",
    "process.env",
    String.raw`\constructor{2}`,
    String.raw`\begin{matrix}1\end{matrix}`,
  ])("fails closed on unsupported answer content: %s", (answer) => {
    expect(compare(answer, answer, SCALAR)).toBeNull();
    expect(compare(answer, "2", SCALAR)).toBeNull();
  });

  it.each([
    "행렬 a와 b에 대하여 구하시오.",
    "벡터 a와 b의 합",
    "점의 좌표를 구하시오.",
    "순서쌍 a, b",
    "튜플의 성분 a, b",
    "각각 a, b로 나타내시오.",
    "(1) a의 값 (2) b의 값",
    "① a ② b",
    "(가) a, (나) b",
    "(a) x의 값 (b) y의 값",
    "Find (a,b).",
    "Find [a,b].",
    String.raw`a=\pmatrix{1&2}, b=\pmatrix{3&4}일 때 a+b`,
    String.raw`\langle a,b\rangle를 구하시오.`,
    "Find the product of matrices a and b.",
    "Find the tensor a*b.",
    "Calculate the vector a+b.",
    "Find the ordered pair a,b.",
    "Find the coordinates.",
    "Give a,b respectively.",
    "길이의 단위는 cm이다. a, b의 값",
    "길이가 2m인 선분에서 m을 구하시오.",
    "Calculate the mass in kg.",
    "Find length in m.",
    "The power is in W units.",
  ])("rejects non-scalar, unit and multi-part questions: %s", (question) => {
    expect(compare("2+3", "3+2", question)).toBeNull();
  });

  it("requires context for variable/unit ambiguity without solving the question", () => {
    expect(compare("2m", "m*2", "수를 계산하시오.")).toBeNull();
    for (const unit of ["m", "g", "s", "l", "h", "t"]) {
      expect(compare(`2${unit}`, `${unit}*2`, `Find 2 ${unit}.`)).toBeNull();
      expect(compare(`2${unit}`, "2", `Find 2 ${unit}.`)).toBeNull();
    }
    expect(compare("m+2", "2+m", "실수 m에 대하여 계산하시오.")).toBe(true);
    expect(compare("x+1", "2", "x=1일 때 계산하시오.")).toBe(false);
    expect(compare("1", "1", "")).toBeNull();
  });

  it.each([
    "",
    " ",
    "(",
    "(2",
    "2)",
    "{2)",
    "[]",
    "{}",
    "()",
    "1+",
    "*2",
    "2/",
    "1/0",
    "1/(2-2)",
    String.raw`\frac{1}{0}`,
    "0^0",
    "0^-1",
    "(-2)^(.5)",
    String.raw`\sqrt{-1}`,
    "∜(-1)",
    "sqrt3",
    "√",
    "√-1",
    String.raw`\frac{1}`,
    String.raw`\frac12`,
    String.raw`\sqrt[3]{`,
    String.raw`\sqrt[0]{2}`,
    String.raw`\sqrt[-2]{2}`,
    String.raw`\sqrt[1/2]{2}`,
    String.raw`\sqrt[a]{2}`,
    String.raw`\sqrt[65]{2}`,
    "√a²",
    "√3a",
    "2³√8",
    "a/2b",
    "a/b(c+1)",
    "2 3",
    "1e3",
    "1.2.3",
    "2^3^4",
    "a²³⁻",
    "a^^2",
    "$$2$",
    "$2$+$2$",
    String.raw`\left(2)`,
    String.raw`(2\right)`,
    String.raw`\left(2\right}`,
    "2//3",
    "2**3",
    "2\\",
    "2\u0000",
    "2🙂",
  ])("rejects malformed, undefined and ambiguous syntax: %s", (answer) => {
    expect(compare(answer, answer, SCALAR)).toBeNull();
  });

  it("bounds source, token count, nesting, number size and arithmetic growth", () => {
    for (const answer of [
      "1".repeat(2049),
      "1+".repeat(260) + "1",
      "(".repeat(40) + "1" + ")".repeat(40),
      "-".repeat(40) + "1",
      "9".repeat(97),
      "0." + "0".repeat(96) + "1",
      "9".repeat(60) + "*" + "9".repeat(60),
      String.raw`\sqrt{`.repeat(40) + "2" + "}".repeat(40),
    ])
      expect(compare(answer, answer, SCALAR)).toBeNull();
    expect(compare("1", "1", "a".repeat(16001))).toBeNull();
    expect(compare("9".repeat(96), "9".repeat(96), SCALAR)).toBe(true);
  });

  it("is deterministic and symmetric over independently injected perturbations", () => {
    for (let n = 1; n <= 15; n++) {
      const original = String.raw`\frac{${n}a+b}{2b+4}`;
      const same = `(b+${n}*a)/(4+b*2)`;
      const changed = `(b+${n + 1}*a)/(4+b*2)`;
      expect(compare(original, same, LOGS)).toBe(true);
      expect(compare(same, original, LOGS)).toBe(true);
      expect(compare(original, changed, LOGS)).toBe(false);
      expect(compare(original, same, LOGS)).toBe(true);
    }
  });
});
