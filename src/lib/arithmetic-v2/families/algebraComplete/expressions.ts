import {
  cartesian,
  coefficients,
  convolution,
  define,
  expression,
  filtered,
  fractionText,
  gcd,
  integer,
  linear,
  math,
  nonzero,
  numericAnswer,
  paren,
  polynomial,
  power,
  range,
  rational,
  readNumeric,
  readPolynomial,
  readRational,
  sameCoefficients,
  sameDisplay,
  small,
  tuples,
  type Term,
} from "./shared";
import type { ArithmeticV2Answer } from "../../types";

const substitution = define({
  id: "m1-linear-substitution-value",
  grade: "중1",
  strand: "문자식",
  title: "일차식에 수 대입",
  unit: "문자와 식",
  domain: cartesian(nonzero(5), nonzero(6), range(-8, 8)),
  prompt: ([a, b, x]) =>
    math(
      `${linear(a, b)}, x = ${x}`,
      `${linear(a, b, true)},\\quad x=${x}`,
      "주어진 x에 대한 식의 값을 구하시오.",
    ),
  solve: ([a, b, x]) => integer(a * x + b),
  check: ([a, b, x], answer) => {
    const q = readNumeric(answer, "integer");
    return Boolean(q && q[0] - BigInt(b) === BigInt(a) * BigInt(x));
  },
});
const twoVariable = define({
  id: "m1-two-variable-substitution",
  grade: "중1",
  strand: "문자식",
  title: "두 문자에 수 대입",
  unit: "문자와 식",
  domain: cartesian(nonzero(3), nonzero(3), range(-4, 4), range(-4, 4)),
  prompt: ([a, b, x, y]) =>
    math(
      `${expression([
        [1, 0, a],
        [0, 1, b],
      ])}, x = ${x}, y = ${y}`,
      `${expression(
        [
          [1, 0, a],
          [0, 1, b],
        ],
        true,
      )},\\quad x=${x},\\ y=${y}`,
      "주어진 x, y에 대한 식의 값을 구하시오.",
    ),
  solve: ([a, b, x, y]) => integer(a * x + b * y),
  check: ([a, b, x, y], answer) => {
    const q = readNumeric(answer, "integer");
    return Boolean(q && q[0] - BigInt(a) * BigInt(x) === BigInt(b) * BigInt(y));
  },
});
const rationalSubstitution = define({
  id: "m1-rational-substitution",
  grade: "중1",
  strand: "문자식",
  title: "분수인 수 대입",
  unit: "문자와 식",
  domain: tuples(
    nonzero(4).flatMap((a) =>
      nonzero(4).flatMap((b) =>
        nonzero(5).flatMap((n) =>
          range(2, 5)
            .filter((d) => gcd(BigInt(n), BigInt(d)) === BigInt(1))
            .map((d) => [a, b, n, d]),
        ),
      ),
    ),
  ),
  prompt: ([a, b, n, d]) =>
    math(
      `${linear(a, b)}, x = ${n}/${d}`,
      `${linear(a, b, true)},\\quad x=${fractionText(rational(n, d), true)}`,
      "주어진 x에 대한 식의 값을 구하시오.",
    ),
  solve: ([a, b, n, d]) =>
    numericAnswer(rational(a * n + b * d, d), "rational"),
  check: ([a, b, n, d], answer) => {
    const q = readNumeric(answer, "rational");
    return Boolean(
      q && (q[0] - BigInt(b) * q[1]) * BigInt(d) === BigInt(a * n) * q[1],
    );
  },
});
function exponentLaw(operation: "product" | "quotient" | "power") {
  return define({
    id: `m2-exponent-${operation}-missing`,
    grade: "중2",
    strand: "문자식",
    title:
      operation === "product"
        ? "같은 밑의 곱 지수"
        : operation === "quotient"
          ? "같은 밑의 나눗셈 지수"
          : "거듭제곱의 거듭제곱 지수",
    unit: "식의 계산",
    domain: filtered(
      cartesian(range(2, 8), range(2, 6)),
      ([m, n]) => operation !== "quotient" || m > n,
    ),
    prompt: ([m, n]) =>
      math(
        operation === "product"
          ? `x^${m} × x^${n} = x^□`
          : operation === "quotient"
            ? `x^${m} ÷ x^${n} = x^□`
            : `(x^${m})^${n} = x^□`,
        operation === "product"
          ? `x^{${m}}\\times x^{${n}}=x^{\\square}`
          : operation === "quotient"
            ? `x^{${m}}\\div x^{${n}}=x^{\\square}`
            : `(x^{${m}})^{${n}}=x^{\\square}`,
        "x≠0일 때 □에 알맞은 자연수를 구하시오.",
      ),
    solve: ([m, n]) =>
      integer(
        operation === "product"
          ? m + n
          : operation === "quotient"
            ? m - n
            : m * n,
      ),
    check: ([m, n], a) => {
      const k = small(a.exact[0], 1, 48);
      if (k === null || !readNumeric(a, "integer")) return false;
      const lhs = BigInt(2) ** BigInt(k);
      return operation === "product"
        ? lhs === BigInt(2) ** BigInt(m) * BigInt(2) ** BigInt(n)
        : operation === "quotient"
          ? lhs * BigInt(2) ** BigInt(n) === BigInt(2) ** BigInt(m)
          : lhs === (BigInt(2) ** BigInt(m)) ** BigInt(n);
    },
  });
}
const productPower = define({
  id: "m2-product-power-two-variable",
  grade: "중2",
  strand: "문자식",
  title: "두 문자 단항식의 거듭제곱",
  unit: "식의 계산",
  domain: cartesian(nonzero(3), range(1, 3), range(1, 3), range(2, 3)),
  prompt: ([a, m, n, k]) =>
    math(
      `(${expression([[m, n, a]])})^${k}`,
      `\\left(${expression([[m, n, a]], true)}\\right)^{${k}}`,
      "식을 간단히 하시오.",
    ),
  solve: ([a, m, n, k]) => polynomial([[m * k, n * k, a ** k]]),
  check: ([a, m, n, k], answer) => {
    const terms = readPolynomial(answer);
    if (!terms || terms.length !== 1) return false;
    const [x, y, c] = terms[0];
    return (
      x % k === 0 &&
      x / k === m &&
      y % k === 0 &&
      y / k === n &&
      BigInt(c) === [...range(1, k)].reduce((v) => v * BigInt(a), BigInt(1))
    );
  },
});
/** Mixed monomial normal form [x degree,y degree,reduced numerator,positive denominator]. */
function mixedDisplay(
  x: number,
  y: number,
  n: bigint,
  d: bigint,
  latex = false,
) {
  const vars = power("x", x, latex) + power("y", y, latex);
  if (d === BigInt(1))
    return `${n === BigInt(1) && vars ? "" : n === BigInt(-1) && vars ? "-" : n}${vars}`;
  return latex
    ? `${n < BigInt(0) ? "-" : ""}\\frac{${(n < BigInt(0) ? -n : n) === BigInt(1) ? "" : n < BigInt(0) ? -n : n}${vars}}{${d}}`
    : `(${n}/${d})${vars}`;
}
function mixedAnswer(
  x: number,
  y: number,
  n: bigint,
  d: bigint,
): ArithmeticV2Answer {
  return {
    kind: "polynomial",
    exact: [String(x), String(y), String(n), String(d)],
    text: mixedDisplay(x, y, n, d),
    latex: mixedDisplay(x, y, n, d, true),
  };
}
const mixed = define({
  id: "m2-monomial-mixed-two-variable",
  grade: "중2",
  strand: "문자식",
  title: "두 문자 단항식의 곱셈과 나눗셈",
  unit: "식의 계산",
  domain: filtered(
    cartesian(
      nonzero(3),
      nonzero(3),
      nonzero(3),
      range(1, 2),
      range(1, 2),
      range(1, 3),
    ),
    ([, , , , n, k]) => k <= n + 1,
  ),
  prompt: ([a, b, c, m, n, k]) =>
    math(
      `(${expression([[m + 1, n, a]])}) × (${expression([[m, n + 1, b]])}) ÷ (${expression([[m, n + k, c]])})`,
      `(${expression([[m + 1, n, a]], true)})\\times(${expression([[m, n + 1, b]], true)})\\div(${expression([[m, n + k, c]], true)})`,
      "x≠0, y≠0일 때 식을 간단히 하시오.",
    ),
  solve: ([a, b, c, m, n, k]) => {
    const q = rational(a * b, c);
    return mixedAnswer(m + 1, n + 1 - k, ...q);
  },
  check: ([a, b, c, m, n, k], answer) => {
    if (answer.kind !== "polynomial" || answer.exact.length !== 4) return false;
    const x = small(answer.exact[0], 0, 9),
      y = small(answer.exact[1], 0, 9),
      q = readRational(answer.exact[2], answer.exact[3]);
    return Boolean(
      x !== null &&
      y !== null &&
      q &&
      x + m === m + 1 + m &&
      y + n + k === n + n + 1 &&
      q[0] * BigInt(c) === BigInt(a * b) * q[1] &&
      sameDisplay(
        answer,
        mixedDisplay(x, y, ...q),
        mixedDisplay(x, y, ...q, true),
      ),
    );
  },
});
function rootIdentity(squareInside: boolean) {
  return define({
    id: `m3-${squareInside ? "root-of-square" : "square-of-root"}-identity`,
    grade: "중3",
    strand: "근호",
    title: squareInside ? "제곱의 제곱근" : "제곱근의 제곱",
    unit: "제곱근과 실수",
    domain: cartesian(squareInside ? range(-30, 30) : range(0, 100)),
    prompt: ([n]) =>
      math(
        squareInside ? `√(${paren(n)}²)` : `(√${n})²`,
        squareInside ? `\\sqrt{${paren(n)}^{2}}` : `(\\sqrt{${n}})^2`,
      ),
    solve: ([n]) => integer(squareInside ? Math.abs(n) : n),
    check: ([n], a) => {
      const q = readNumeric(a, "integer");
      return Boolean(
        q &&
        q[0] >= BigInt(0) &&
        (squareInside
          ? q[0] * q[0] === BigInt(n) * BigInt(n)
          : q[0] === BigInt(n)),
      );
    },
  });
}
function formula(bivariate: boolean, conjugate: boolean) {
  return define({
    id: `m3-multiplication-${conjugate ? "bivariate-conjugate" : bivariate ? "bivariate-square" : "linear-square"}`,
    grade: "중3",
    strand: "문자식",
    title: conjugate
      ? "합과 차의 곱 공식"
      : bivariate
        ? "두 문자 완전제곱 전개"
        : "일차식의 제곱 전개",
    unit: "다항식의 곱셈과 인수분해",
    domain: cartesian(range(1, 6), nonzero(8)),
    prompt: ([a, b]) => {
      const first: Term[] = [[1, 0, a], bivariate ? [0, 1, b] : [0, 0, b]],
        second: Term[] = [
          [1, 0, a],
          [0, 1, -b],
        ];
      return math(
        conjugate
          ? `(${expression(first)})(${expression(second)})`
          : `(${expression(first)})²`,
        conjugate
          ? `(${expression(first, true)})(${expression(second, true)})`
          : `(${expression(first, true)})^2`,
        "전개하시오.",
      );
    },
    solve: ([a, b]) =>
      polynomial(
        conjugate
          ? [
              [2, 0, a * a],
              [0, 2, -b * b],
            ]
          : bivariate
            ? [
                [2, 0, a * a],
                [1, 1, 2 * a * b],
                [0, 2, b * b],
              ]
            : [
                [2, 0, a * a],
                [1, 0, 2 * a * b],
                [0, 0, b * b],
              ],
      ),
    check: ([a, b], answer) => {
      const terms = readPolynomial(answer);
      if (!terms) return false;
      const first = coefficients([
        [1, 0, a],
        bivariate ? [0, 1, b] : [0, 0, b],
      ]);
      const second = conjugate
        ? coefficients([
            [1, 0, a],
            [0, 1, -b],
          ])
        : first;
      return sameCoefficients(coefficients(terms), convolution(first, second));
    },
  });
}
const formulaValue = define({
  id: "m3-square-formula-substitution",
  grade: "중3",
  strand: "문자식",
  title: "곱셈 공식으로 식의 값",
  unit: "다항식의 곱셈과 인수분해",
  domain: cartesian(range(11, 30), range(1, 9), [-1, 1]),
  prompt: ([x, y, s]) =>
    math(
      `x² ${s < 0 ? "-" : "+"} 2xy + y², x = ${x}, y = ${y}`,
      `x^2${s < 0 ? "-" : "+"}2xy+y^2,\\quad x=${x},\\ y=${y}`,
      "식의 값을 구하시오.",
    ),
  solve: ([x, y, s]) => integer((x + s * y) ** 2),
  check: ([x, y, s], a) => {
    const q = readNumeric(a, "integer");
    return Boolean(
      q &&
      q[0] ===
        BigInt(x) * BigInt(x) + BigInt(2 * s * x * y) + BigInt(y) * BigInt(y),
    );
  },
});
export const EXPRESSION_DEFINITIONS = [
  substitution,
  twoVariable,
  rationalSubstitution,
  exponentLaw("product"),
  exponentLaw("quotient"),
  exponentLaw("power"),
  productPower,
  mixed,
  rootIdentity(true),
  rootIdentity(false),
  formula(false, false),
  formula(true, false),
  formula(true, true),
  formulaValue,
];
