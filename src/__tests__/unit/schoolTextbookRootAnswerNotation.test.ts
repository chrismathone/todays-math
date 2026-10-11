import { describe, expect, it } from "vitest";
import { dbRetryAnswersAgree } from "@/lib/import/schoolTextbook/dbRetryReviewBinding";
const roots = "다음 거듭제곱근 중 실수인 것을 모두 구하시오.";
describe("Exact imported root answer notation", () => {
  it("keeps numeric quantities and their units together", () => {
    const content = "수심은 몇 m인지 구하시오.";
    expect(
      dbRetryAnswersAgree("$12\\,\\mathrm{m}$", "12 m", "단답형", content),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree("$12\\,\\mathrm{m}$", "12 cm", "단답형", content),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree("$12\\,\\mathrm{m}$", "12", "단답형", content),
    ).toBe(false);
    const duration = "가격이 이하가 되는 것은 최소 몇 년 후인지 구하시오.";
    expect(dbRetryAnswersAgree("$4$년 후", "4년", "단답형", duration)).toBe(
      true,
    );
    expect(
      dbRetryAnswersAgree("$4$년 후", "4년", "단답형", "나이를 구하시오."),
    ).toBe(false);
  });
  it("maps both extremum values only in the explicitly requested order", () => {
    const content = "함수의 최댓값과 최솟값을 각각 구하시오.";
    expect(
      dbRetryAnswersAgree(
        "최댓값 $3$, 최솟값 $0$",
        "(1) 3, (2) 0",
        "단답형",
        content,
      ),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree(
        "최댓값 $3$, 최솟값 $0$",
        "(1) 0, (2) 3",
        "단답형",
        content,
      ),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree("최댓값 $3$, 최솟값 $0$", "(1) 3", "단답형", content),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree(
        "최댓값 $3$, 최솟값 $0$",
        "(1) 3, (2) 0",
        "단답형",
        "두 값의 차이를 구하시오.",
      ),
    ).toBe(false);
  });
  it("preserves domain and range roles through set and interval notation", () => {
    const content =
      "다음 함수의 정의역과 치역을 구하시오.\n⑴ $y=\\left( \\frac{1}{2}\\right) ^{x}-1$\n⑵ $y=\\log _{2}(1-3x)+1$";
    const stored =
      "⑴ 정의역: 실수 전체의 집합, 치역: $\\{y\\mid y>-1\\}$ ⑵ 정의역: $\\left\\{x\\mid x<\\frac{1}{3}\\right\\}$, 치역: 실수 전체의 집합";
    const blind =
      "(1) 정의역: ℝ, 치역: (-1, ∞)\n(2) 정의역: (-∞, 1/3), 치역: ℝ";
    expect(dbRetryAnswersAgree(stored, blind, "단답형", content)).toBe(true);
    expect(
      dbRetryAnswersAgree(
        stored,
        blind.replace("(-1, ∞)", "[-1, ∞)"),
        "단답형",
        content,
      ),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree(
        stored,
        blind.replace("1/3", "2/3"),
        "단답형",
        content,
      ),
    ).toBe(false);
  });
  it("accepts the count suffix only for a nonnegative integer count request", () => {
    const content =
      "방정식이 서로 다른 두 양의 실근을 갖도록 하는 모든 정수 k의 개수를 구하시오.";
    expect(dbRetryAnswersAgree("$48$개", "48", "서술형", content)).toBe(true);
    expect(dbRetryAnswersAgree("$48$개", "3", "서술형", content)).toBe(false);
    expect(dbRetryAnswersAgree("$48$cm", "48", "서술형", content)).toBe(false);
    expect(
      dbRetryAnswersAgree(
        "$48$개",
        "48",
        "서술형",
        "다음 실근의 값을 모두 구하시오.",
      ),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree(
        "(1) 48개 (2) 3개",
        "(1) 48 (2) 4",
        "서술형",
        content,
      ),
    ).toBe(false);
  });
  it("preserves logarithm base, argument and comparison direction across numeric subscripts", () => {
    const content =
      "다음 두 수의 크기를 비교하시오.\n⑴ $0.3^{3/4},0.3^{4/5}$\n⑵ $\\log_3 7,\\log_3 5$";
    const stored =
      "⑴ $0.3^{\\frac{3}{4}}>0.3^{\\frac{4}{5}}$ ⑵ $\\log_{3}7>\\log_{3}5$";
    expect(
      dbRetryAnswersAgree(
        stored,
        "(1) 0.3^(3/4)>0.3^(4/5) (2) log₃7>log₃5",
        "단답형",
        content,
      ),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree("$\\log_{49}7$", "log₄97", "단답형", content),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree("$\\log_{4}97$", "log₄₉7", "단답형", content),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree(
        stored,
        "(1) 0.3^(3/4)>0.3^(4/5) (2) log₃7<log₃5",
        "단답형",
        content,
      ),
    ).toBe(false);
  });
  it("compares a numerator sign without canceling its denominator", () => {
    const content =
      "log2 3=a, log2 5=b일 때 다음을 a,b로 나타내시오.\n(1) log2 45\n(2) log2 20\n(3) log(1/5) 60";
    const stored = "(1) $2a+b$ (2) $b+2$ (3) $-\\frac{a+b+2}{b}$";
    expect(
      dbRetryAnswersAgree(
        stored,
        "(1) 2a+b (2) 2+b (3) -(2+a+b)/b",
        "단답형",
        content,
      ),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree(
        stored,
        "(1) 2a+b (2) 2+b (3) -(2+a+b)/a",
        "단답형",
        content,
      ),
    ).toBe(false);
  });
  it("supports single numeric TeX arguments while preserving degree and every digit", () => {
    const content = "실수 a,b에 대하여 다음 값과 범위를 구하시오.";
    expect(
      dbRetryAnswersAgree(
        "$\\frac{2\\sqrt{3}}{3}$",
        "$\\frac{2\\sqrt3}{3}$",
        "단답형",
        content,
      ),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree("$\\sqrt{2}$", "$\\sqrt2$", "단답형", content),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree(
        "$0<a<1$ 또는 $1<a<\\frac{3}{2}$",
        "$0<a<1$ 또는 $1<a<\\frac32$",
        "단답형",
        content,
      ),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree("$\\frac{3}{2}$", "$\\frac23$", "단답형", content),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree("$\\sqrt{23}$", "$\\sqrt23$", "단답형", content),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree("$\\sqrt[3]{2}$", "$\\sqrt2$", "단답형", content),
    ).toBe(false);
  });
  it("compares ordered scalar subparts without losing terms or denominators", () => {
    const question =
      "$\\log_{10}3=a,\\log_{10}5=b$일 때 다음을 a,b에 대한 식으로 나타내시오.\n⑴ $\\log_{10}45$\n⑵ $\\log_{10}12$\n⑶ $\\log_{10}\\sqrt[4]{0.75}$";
    const stored = "⑴ $2a+b$ ⑵ $a-2b+2$ ⑶ $\\frac{a+2b-2}{4}$";
    expect(
      dbRetryAnswersAgree(
        stored,
        "(1) 2a+b (2) a+2-2b (3) (a+2b-2)/4",
        "단답형",
        question,
      ),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree(
        stored,
        "(1) 2a+b (2) a+2-2b (3) (a+2b-2)/5",
        "단답형",
        question,
      ),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree(
        stored,
        "(1) a+2-2b (2) 2a+b (3) (a+2b-2)/4",
        "단답형",
        question,
      ),
    ).toBe(false);
  });
  it("preserves an excluded log-base value in every domain subpart", () => {
    const question =
      "다음 로그가 정의되는 실수 x의 범위를 구하시오.\n(1) $\\log_x(2x-1)$\n(2) $\\log_{x-2}(x^2-2x-15)$";
    expect(
      dbRetryAnswersAgree(
        "(1) $\\frac{1}{2}<x<1$ 또는 $x>1$ (2) $x>5$",
        "(1) x>1/2,x!=1 (2) x>5",
        "단답형",
        question,
      ),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree(
        "(1) $\\frac{1}{2}<x<1$ 또는 $x>1$ (2) $x>5$",
        "(1) x>1/2 (2) x>5",
        "단답형",
        question,
      ),
    ).toBe(false);
  });
  it("preserves both units and endpoint inclusions in explicit numeric verbal ranges", () => {
    const content = "음향출력의 범위를 W 단위로 구하시오.";
    expect(
      dbRetryAnswersAgree(
        "$\\frac{1}{10}\\,\\mathrm{W}$ 이상 $100\\,\\mathrm{W}$ 이하",
        "0.1 W 이상 100 W 이하",
        "단답형",
        content,
      ),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree(
        "0.1 W 이상 100 W 이하",
        "0.1 이상 100 이하",
        "단답형",
        content,
      ),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree(
        "0.1 W 이상 100 W 이하",
        "0.1 dB 이상 100 dB 이하",
        "단답형",
        content,
      ),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree(
        "0.1 W 이상 100 W 이하",
        "0.1 W 초과 100 W 이하",
        "단답형",
        content,
      ),
    ).toBe(false);
    expect(
      dbRetryAnswersAgree(
        "0.1 W 이상 100 W 이하",
        "0.1 W 이상 100 W 미만",
        "단답형",
        content,
      ),
    ).toBe(false);
  });
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
