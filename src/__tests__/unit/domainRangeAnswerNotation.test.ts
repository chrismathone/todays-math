// @vitest-environment node
import { describe, expect, it } from "vitest";
import { compareDomainRangeAnswerNotation as compare } from "../../lib/import/schoolTextbook/domainRangeAnswerNotation";

const QUESTION =
  "다음 함수의 정의역과 치역을 구하시오\n(1) y=(1/2)^x-1\n(2) y=log_2(1-3x)+1";
const SINGLE = "다음 함수의 정의역과 치역을 구하시오. y=2^x";
const STORED = String.raw`⑴ 정의역: 실수 전체의 집합, 치역: $\{y\mid y>-1\}$ ⑵ 정의역: $\left\{x\mid x<\frac{1}{3}\right\}$, 치역: 실수 전체의 집합`;
const BLIND = "(1) 정의역: ℝ, 치역: (-1, ∞) (2) 정의역: (-∞, 1/3), 치역: ℝ";
const fields = (domain: string, range = "ℝ") =>
  `정의역: ${domain}, 치역: ${range}`;
const expectPair = (
  left: string,
  right: string,
  result: boolean | null,
  question = SINGLE,
) => {
  expect(compare(left, right, question)).toBe(result);
  expect(compare(right, left, question)).toBe(result);
};

describe("compareDomainRangeAnswerNotation", () => {
  it("recognizes the complete actual captured stored/blind pair", () => {
    expectPair(STORED, BLIND, true, QUESTION);
  });

  it("recognizes the same complete question with LaTeX functions and circled parts", () => {
    const question = String.raw`다음 함수의 정의역과 치역을 구하시오.
⑴ $y=\left(\frac{1}{2}\right)^{x}-1$
⑵ $y=\log_{2}\left(1-3x\right)+1$`;
    expectPair(STORED, BLIND, true, question);
    expectPair(
      STORED.replace("⑴", "①").replace("⑵", "②"),
      BLIND,
      true,
      question,
    );
  });

  it.each([
    ["-2", "2/5", String.raw`\frac{2}{5}`, "(1/2)^x-2", "log_2(2-5x)+1"],
    ["3", "2", "2", "(1/2)^x+3", "log_2(2-x)+1"],
  ])(
    "recognizes captured-form variants with bound %s",
    (range, domain, latexDomain, exponential, log) => {
      const stored = STORED.replace("y>-1", `y>${range}`).replace(
        String.raw`\frac{1}{3}`,
        latexDomain,
      );
      const blind = BLIND.replace("(-1,", `(${range},`).replace("1/3", domain);
      expectPair(
        stored,
        blind,
        true,
        `다음 함수의 정의역과 치역을 구하시오\n(1) y=${exponential}\n(2) y=${log}`,
      );
    },
  );

  it.each([
    ["ℝ", "(-∞,∞)"],
    [String.raw`$\mathbb{R}$`, "실수 전체의 집합"],
    [String.raw`\mathbb R`, String.raw`\left(-\infty,+\infty\right)`],
    ["{x|x<1/3}", "(-∞,2/6)"],
    [
      String.raw`$\left\{x\mid x<\frac{1}{3}\right\}$`,
      String.raw`\left(-\infty,\dfrac{1}{3}\right)`,
    ],
    ["{x : -1<x<=2/5}", "(-1,0.4]"],
    [String.raw`\{x\mid -1\le x<2\}`, "[-1,2)"],
    [String.raw`\{x\mid 2\geq x\geq -1\}`, "[-1,2]"],
    ["{x|3>x}", "(-∞,3)"],
    ["{x|x>-1,x!=0}", "(-1,0)∪(0,∞)"],
    ["{x|x!=0}", "(-∞,0)∪(0,∞)"],
    ["{x|x!=1,x!=2}", "(-∞,1)∪(1,2)∪(2,∞)"],
    ["{x|x>0,x!=1,x!=2}", "(0,1)∪(1,2)∪(2,∞)"],
    [String.raw`{x|x<0\lor x>1}`, String.raw`(-∞,0)\cup(1,∞)`],
    ["x<0 또는 x>=0", "ℝ"],
    ["{x|x<9007199254740993}", "(-∞,9007199254740993)"],
    ["{x|x<1/-3}", "(-∞,-2/6)"],
    ["{x|x<-.25}", "(-∞,-1/4)"],
    ["{x|x<+0.5}", "(-∞,1/2)"],
    [String.raw`$$\{x\mid x<\tfrac{2}{5}\}$$`, String.raw`\((-\infty,0.4)\)`],
  ])("accepts exact real range spellings %s", (left, right) => {
    expectPair(fields(left), fields(right), true);
    expectPair(
      fields("ℝ", left.replaceAll("x", "y")),
      fields("ℝ", right.replaceAll("x", "y")),
      true,
    );
  });

  it.each([
    ["(-∞,1/3)", "(-∞,2/5)"],
    ["(-∞,1/3)", "(-∞,0.3333333333333333)"],
    ["(-∞,9007199254740993)", "(-∞,9007199254740992)"],
    ["(-1,∞)", "[-1,∞)"],
    ["(-1,∞)", "(-2,∞)"],
    ["(-1,∞)", "(3,∞)"],
    ["(-∞,1)", "(1,∞)"],
    ["[0,1)", "(0,1]"],
    ["{x|x>0,x!=1}", "(0,∞)"],
    ["{x|x!=1}", "{x|x!=2}"],
    ["{x|x!=0}", "ℝ"],
  ])(
    "preserves every rational bound, endpoint, direction and exclusion: %s",
    (left, right) => {
      expectPair(fields(left), fields(right), false);
    },
  );

  it("preserves domain/range roles and numbered-part order", () => {
    expectPair(fields("ℝ", "(-1,∞)"), fields("(-1,∞)", "ℝ"), false);
    expectPair(
      BLIND,
      "(1) 정의역: (-∞,1/3), 치역: ℝ (2) 정의역: ℝ, 치역: (-1,∞)",
      false,
      QUESTION,
    );
  });

  it.each([
    BLIND.replace("(-1,", "[-1,"),
    BLIND.replace("1/3", "2/5"),
    BLIND.replace("1/3", "2"),
    BLIND.replace("(-1,", "(-2,"),
    BLIND.replace("(-1,", "(3,"),
    BLIND.replace("(-∞, 1/3)", "(1/3, ∞)"),
  ])("rejects captured-pair bound perturbation: %s", (changed) => {
    expectPair(STORED, changed, false, QUESTION);
  });

  it.each([
    "{y|y<1}",
    "{x|y<1}",
    "{y|x<1}",
    "{t|t<1}",
    "{u|u<1}",
    "x<1,y>0",
    "{x|t<1}",
    "{x|x<y}",
    "{x|x<a}",
    "t<1",
    "u<1",
  ])("does not rename wrong/undeclared domain variables: %s", (value) => {
    expectPair(fields(value), fields("(-∞,1)"), null);
    expect(compare(fields(value), fields(value), SINGLE)).toBeNull();
  });

  it.each(["{x|x<1}", "{y|x<1}", "{x|y<1}", "{t|t<1}", "{u|u<1}"])(
    "does not rename wrong range variables: %s",
    (value) => {
      expectPair(fields("ℝ", value), fields("ℝ", "(-∞,1)"), null);
    },
  );

  it.each([
    "(1) 정의역: ℝ, 치역: (-1,∞)",
    "(2) 정의역: (-∞,1/3), 치역: ℝ",
    BLIND.replace("(2)", "(1)"),
    BLIND.replace("(2)", "(3)"),
    BLIND.replace("(1)", "(2)").replace(/\(2\)(?= 정의역: \(-∞)/, "(1)"),
    BLIND.replace("(1)", ""),
    BLIND.replace("(2)", ""),
    BLIND.replace("(1)", "(01)"),
    BLIND.replace("치역: (-1, ∞)", "(-1, ∞)"),
    `${BLIND} (3) 정의역: ℝ, 치역: ℝ`,
    `${BLIND} 따라서 정답이다`,
  ])(
    "fails closed for missing, duplicate or reordered subparts/fields: %s",
    (value) => {
      expectPair(STORED, value, null, QUESTION);
    },
  );

  it("allows a single unnumbered answer only when both labels are complete", () => {
    expectPair(
      fields("ℝ", "(0,∞)"),
      fields("실수 전체의 집합", "{y|y>0}"),
      true,
    );
    expectPair(
      fields("ℝ", "(0,∞)"),
      fields("ℝ", "{y|y>0}"),
      true,
      "다음 함수의 정의역과 치역을 구하시오\n(1) y=2^x",
    );
    expectPair("ℝ, (0,∞)", fields("ℝ", "(0,∞)"), null);
    expectPair("정의역: ℝ", fields("ℝ", "(0,∞)"), null);
    expectPair("치역: (0,∞), 정의역: ℝ", fields("ℝ", "(0,∞)"), null);
    expectPair("정의역: ℝ, 정의역: ℝ, 치역: (0,∞)", fields("ℝ", "(0,∞)"), null);
  });

  it.each([
    "(0,1)cm",
    "(0,1 cm)",
    "{x|x<1cm}",
    "{x|x<1 m}",
    "{x|x<1초}",
    String.raw`(0,1)\mathrm{cm}`,
    String.raw`{x|x<1\text{m}}`,
    "ℝ (단위: m)",
    "모든 실수",
    "실수",
    "R",
    "정수 전체의 집합",
    "{1,2}",
    "{x|x=1}",
    "[1,1]",
    "(1,1)",
    "{x|x>=1,x<=1}",
    "{x|x>=1,x<=1 또는 x>2}",
    "{x|x>2,x<1 또는 x>5}",
    "∅",
    "(2,1)",
    "{x|x<sqrt(2)}",
    "{x|sin(x)<1}",
    "[0;1]",
    "]0,1[",
    "(0,1,2)",
    "(0,1)",
  ])("does not erase units or accept unsupported sets/prose: %s", (value) => {
    // (0,1) is supported as a range, but never equivalent to all real numbers.
    const expected = value === "(0,1)" ? false : null;
    expectPair(fields(value), fields("ℝ"), expected);
  });

  it.each([
    "(+∞,1)",
    "(∞,1)",
    "(-∞,-∞)",
    "(1,-∞)",
    "[-∞,1)",
    "(1,∞]",
    "[−∞,+∞]",
    "(0,NaN)",
    "(0,Infinity)",
    "(0,1e309)",
    "(0,1/0)",
    "{x|x<1/0}",
    "(0,1//2)",
    "(0,1/(2))",
    "(0,1/2/3)",
    "(0,1 2)",
    "{x|x<1.2.3}",
    "{x|x<1",
    "{x||x<1}",
    "{x|}",
    "{x|x<1,}",
    "{x|x<1 또는}",
    "(0,1",
    "((0,1))",
    "(0,1}",
    "{x|x<>1}",
    "{x|1<x>2}",
    String.raw`$\{x|x<1\}`,
    String.raw`$\{x|x<1\}$$`,
    String.raw`\left(0,1)`,
    String.raw`(0,1\right)`,
    String.raw`\left(0,1\right}`,
    String.raw`\foo(0,1)`,
  ])(
    "fails closed for malformed bounds, infinity and brackets: %s",
    (value) => {
      expectPair(fields(value), fields("ℝ"), null);
      expect(compare(fields(value), fields(value), SINGLE)).toBeNull();
    },
  );

  it.each([
    "",
    "정의역과 치역",
    "다음 함수의 정의역을 구하시오. y=2^x",
    "다음 함수의 치역과 정의역을 구하시오. y=2^x",
    "다음 함수의 정의역과 치역을 구하시오. y=f(x)",
    "다음 함수의 정의역과 치역을 구하시오. y=sin(x)",
    "다음 함수의 정의역과 치역을 구하시오. y=sqrt(x)",
    "다음 함수의 정의역과 치역을 구하시오. y=x^2",
    "다음 함수의 정의역과 치역을 구하시오. y=1/x",
    "다음 함수의 정의역과 치역을 구하시오. y=2^t",
    "다음 함수의 정의역과 치역을 구하시오. u=2^x",
    "다음 함수의 정의역과 치역을 구하시오. x=2^y",
    "다음 함수의 정의역과 치역을 구하시오. y=2^x (단위: cm)",
    "다음 함수의 정의역과 치역을 구하시오. y=2^x, x는 정수",
    "다음 함수의 정의역과 치역을 구하시오. y=2^x, x∈ℂ",
    "다음 함수의 정의역과 치역을 구하시오. y=(-2)^x",
    "다음 함수의 정의역과 치역을 구하시오. y=0^x",
    "다음 함수의 정의역과 치역을 구하시오. y=1^x",
    "다음 함수의 정의역과 치역을 구하시오. y=(1/0)^x",
    "다음 함수의 정의역과 치역을 구하시오. y=log_1(x)",
    "다음 함수의 정의역과 치역을 구하시오. y=log_0(x)",
    "다음 함수의 정의역과 치역을 구하시오. y=log_2(t)",
    "다음 함수의 정의역과 치역을 구하시오. y=log_2(0x+1)",
    "다음 함수의 정의역과 치역을 구하시오. y=log_2(x*x)",
    QUESTION.replace("(2)", "(1)"),
    QUESTION.replace("(2)", "(3)"),
    QUESTION.replace("y=log_2(1-3x)+1", "y=unknown(x)"),
  ])("requires the complete supported real y(x) question: %s", (question) => {
    expect(compare(STORED, BLIND, question)).toBeNull();
    expect(compare(fields("ℝ"), fields("ℝ"), question)).toBeNull();
  });

  it.each([
    "y=x",
    "y=-x+1",
    "y=3-2x",
    "y=2*x-3/5",
    "y=(1/2)^{x}-1",
    "y=log_{2}(1-3x)+1",
    String.raw`$y=\left(\frac{1}{2}\right)^{x}-1$`,
    String.raw`$y=\log_{2}\left(1-3x\right)+1$`,
  ])("accepts explicit supported function spelling: %s", (expression) => {
    expectPair(
      fields("ℝ"),
      fields("(-∞,∞)"),
      true,
      `다음 실수 함수의 정의역과 치역을 구하시오. ${expression}`,
    );
  });

  it("does not solve the source function or validate answer correctness", () => {
    expectPair(
      fields("(100,200)", "(-200,-100)"),
      fields("{x|100<x<200}", "{y|-200<y<-100}"),
      true,
    );
  });

  it.each([
    String.raw`(-∞,\frac{1}{2}3)`,
    String.raw`(-∞,1\frac{2}{3})`,
    String.raw`(-∞,\frac{1}{2}/3)`,
    String.raw`{x|x<\frac{1}{2}3}`,
    String.raw`{x|x<1\frac{2}{3}}`,
    "{x|x<0∪x>1}",
    "x<0∪x>1",
    String.raw`{x|x<0\cup x>1}`,
    String.raw`(-∞,0)\lor(1,∞)`,
    "(-∞,0) 또는 (1,∞)",
    "ℝ∪x>1",
  ])(
    "rejects fraction concatenation and mixed set/condition syntax: %s",
    (value) => {
      expectPair(fields(value), fields("ℝ"), null);
      expect(compare(fields(value), fields(value), SINGLE)).toBeNull();
    },
  );

  it.each(["y=1/2^x", "y=log_1/2(x)", "y=1/2x", "y=log_2(1/2x)"])(
    "rejects ambiguous solidus function spelling: %s",
    (expression) => {
      expect(
        compare(
          fields("ℝ"),
          fields("ℝ"),
          `다음 함수의 정의역과 치역을 구하시오. ${expression}`,
        ),
      ).toBeNull();
    },
  );

  it("checks every part through the maximum supported count", () => {
    const question = `다음 함수의 정의역과 치역을 구하시오\n${Array.from({ length: 16 }, (_, i) => `(${i + 1}) y=2^x`).join("\n")}`;
    const answer = Array.from(
      { length: 16 },
      (_, i) => `(${i + 1}) ${fields("ℝ", "(0,∞)")}`,
    ).join("\n");
    const alternate = answer.replaceAll("(0,∞)", "{y|y>0}");
    expectPair(answer, alternate, true, question);
    expectPair(
      answer,
      alternate.replace(
        "(16) 정의역: ℝ, 치역: {y|y>0}",
        "(16) 정의역: ℝ, 치역: {y|y>=0}",
      ),
      false,
      question,
    );
  });

  it("bounds answer/question size, literal size, nesting, branches and terms", () => {
    const overflows = [
      fields(`(-∞,${"9".repeat(65)})`),
      fields(`(-∞,1/${"9".repeat(65)})`),
      fields(`(-∞,${"9".repeat(2000)})`),
      fields(`${"{".repeat(40)}x|x<1${"}".repeat(40)}`),
      fields(Array.from({ length: 9 }, () => "(0,1)").join("∪")),
      fields(`{x|${Array.from({ length: 17 }, () => "x>1").join(",")}}`),
      `${fields("ℝ")}${" ".repeat(8001)}`,
    ];
    for (const value of overflows) expectPair(value, fields("ℝ"), null);
    expect(
      compare(fields("ℝ"), fields("ℝ"), `${SINGLE}${" ".repeat(16001)}`),
    ).toBeNull();
    expect(
      compare(
        fields("ℝ"),
        fields("ℝ"),
        `다음 함수의 정의역과 치역을 구하시오. y=(${"9".repeat(65)})^x`,
      ),
    ).toBeNull();
    const many = Array.from({ length: 17 }, (_, i) => `(${i + 1}) y=2^x`).join(
      "\n",
    );
    expect(
      compare(
        fields("ℝ"),
        fields("ℝ"),
        `다음 함수의 정의역과 치역을 구하시오\n${many}`,
      ),
    ).toBeNull();
  });
});
