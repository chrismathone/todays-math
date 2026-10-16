import {
  abs,
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
  type Rational,
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
/* ---- Track E (2026-10-16): 중2 식의 계산 expansion ----------------------
 * Polynomial answers use the file's bivariate normal form (`polynomial`):
 * [x degree, y degree, integer coefficient] triples in descending
 * lexicographic order, zero terms dropped. Every check below reads the
 * candidate with `readPolynomial` and compares coefficient maps built from
 * the prompt parameters, never from the solver.
 */
const twoVariableOperands = ([a, b, c, d, e, f]: number[]): [
  Term[],
  Term[],
] => [
  [
    [1, 0, a],
    [0, 1, b],
    [0, 0, c],
  ],
  [
    [1, 0, d],
    [0, 1, e],
    [0, 0, f],
  ],
];
/** (ax+by+c) ± (dx+ey+f); every one of the x, y and constant terms survives. */
function twoVariablePolynomial(operation: "add" | "subtract") {
  const sign = operation === "add" ? 1 : -1;
  return define({
    id: `m2-polynomial-two-variable-${operation}`,
    grade: "중2",
    strand: "문자식",
    title:
      operation === "add" ? "두 문자 다항식의 덧셈" : "두 문자 다항식의 뺄셈",
    unit: "식의 계산",
    domain: filtered(
      cartesian(
        nonzero(3),
        nonzero(3),
        nonzero(2),
        nonzero(3),
        nonzero(3),
        nonzero(2),
      ),
      ([a, b, c, d, e, f]) =>
        (a !== d || b !== e || c !== f) &&
        a + sign * d !== 0 &&
        b + sign * e !== 0 &&
        c + sign * f !== 0,
    ),
    prompt: (p) => {
      const [first, second] = twoVariableOperands(p);
      const operator = sign < 0 ? "-" : "+";
      return math(
        `(${expression(first)}) ${operator} (${expression(second)})`,
        `(${expression(first, true)})${operator}(${expression(second, true)})`,
        "식을 간단히 하시오.",
      );
    },
    solve: ([a, b, c, d, e, f]) =>
      polynomial([
        [1, 0, a + sign * d],
        [0, 1, b + sign * e],
        [0, 0, c + sign * f],
      ]),
    check: (p, answer) => {
      const terms = readPolynomial(answer);
      if (!terms) return false;
      const [first, second] = twoVariableOperands(p);
      const expected = coefficients(first);
      for (const [key, value] of coefficients(second))
        expected.set(
          key,
          (expected.get(key) ?? BigInt(0)) + BigInt(sign) * value,
        );
      return sameCoefficients(coefficients(terms), expected);
    },
  });
}
/** ax ∓ {bx ∓ (cx + d)}: s1 is the sign before the braces, s2 the sign inside. */
const nestedBraces = define({
  id: "m2-polynomial-nested-braces",
  grade: "중2",
  strand: "문자식",
  title: "중괄호가 있는 다항식의 계산",
  unit: "식의 계산",
  domain: filtered(
    cartesian(
      nonzero(3),
      range(1, 3),
      nonzero(3),
      nonzero(4),
      [-1, 1],
      [-1, 1],
    ),
    ([a, b, c, , s1, s2]) => a + s1 * b + s1 * s2 * c !== 0,
  ),
  prompt: ([a, b, c, d, s1, s2]) => {
    const operator = (s: number) => (s < 0 ? " - " : " + ");
    const head = expression([[1, 0, a]]),
      middle = expression([[1, 0, b]]);
    return math(
      `${head}${operator(s1)}{${middle}${operator(s2)}(${linear(c, d)})}`,
      `${head}${operator(s1)}\\{${middle}${operator(s2)}(${linear(c, d, true)})\\}`,
      "식을 간단히 하시오.",
    );
  },
  solve: ([a, b, c, d, s1, s2]) =>
    polynomial([
      [1, 0, a + s1 * b + s1 * s2 * c],
      [0, 0, s1 * s2 * d],
    ]),
  check: ([a, b, c, d, s1, s2], answer) => {
    const terms = readPolynomial(answer);
    if (!terms) return false;
    // Peel the braces from the outside: a x + s1·(b x + s2·(c x + d)).
    const inner = new Map<string, bigint>([
      ["1,0", BigInt(c)],
      ["0,0", BigInt(d)],
    ]);
    const braces = new Map<string, bigint>([["1,0", BigInt(b)]]);
    for (const [key, value] of inner)
      braces.set(key, (braces.get(key) ?? BigInt(0)) + BigInt(s2) * value);
    const expected = new Map<string, bigint>([["1,0", BigInt(a)]]);
    for (const [key, value] of braces)
      expected.set(key, (expected.get(key) ?? BigInt(0)) + BigInt(s1) * value);
    return sameCoefficients(coefficients(terms), expected);
  },
});
/** A = ax + by, B = cx + dy; simplify pA + qB (q signed). */
const substitute = define({
  id: "m2-expression-substitute",
  grade: "중2",
  strand: "문자식",
  title: "식의 대입",
  unit: "식의 계산",
  domain: filtered(
    cartesian(
      nonzero(3),
      nonzero(3),
      nonzero(3),
      nonzero(3),
      range(1, 3),
      nonzero(3),
    ),
    ([a, b, c, d, p, q]) =>
      (a !== c || b !== d) && p * a + q * c !== 0 && p * b + q * d !== 0,
  ),
  prompt: ([a, b, c, d, p, q]) => {
    const first: Term[] = [
        [1, 0, a],
        [0, 1, b],
      ],
      second: Term[] = [
        [1, 0, c],
        [0, 1, d],
      ];
    const combination = `${p === 1 ? "" : p}A ${q < 0 ? "-" : "+"} ${Math.abs(q) === 1 ? "" : Math.abs(q)}B`;
    return math(
      `A = ${expression(first)}, B = ${expression(second)}, ${combination}`,
      `A=${expression(first, true)},\\ B=${expression(second, true)},\\quad ${combination}`,
      "A, B를 대입하여 식을 간단히 하시오.",
    );
  },
  solve: ([a, b, c, d, p, q]) =>
    polynomial([
      [1, 0, p * a + q * c],
      [0, 1, p * b + q * d],
    ]),
  check: ([a, b, c, d, p, q], answer) => {
    const terms = readPolynomial(answer);
    if (!terms) return false;
    const expected = new Map<string, bigint>();
    for (const [key, value] of coefficients([
      [1, 0, a],
      [0, 1, b],
    ]))
      expected.set(key, (expected.get(key) ?? BigInt(0)) + BigInt(p) * value);
    for (const [key, value] of coefficients([
      [1, 0, c],
      [0, 1, d],
    ]))
      expected.set(key, (expected.get(key) ?? BigInt(0)) + BigInt(q) * value);
    return sameCoefficients(coefficients(terms), expected);
  },
});
/** Rearranged linear equation normal form: exact=[slope n, slope d, intercept n,
 * intercept d], both reduced with positive denominators. Display
 * `y = (-2/3)x + 2` / `y=-\frac{2}{3}x+2`; a ±1 slope shows no magnitude.
 */
function rearrangedDisplay(
  variable: number,
  slope: Rational,
  intercept: Rational,
  latex = false,
) {
  const [solved, other] = variable === 1 ? ["y", "x"] : ["x", "y"];
  const coefficient =
    slope[1] === BigInt(1)
      ? abs(slope[0]) === BigInt(1)
        ? slope[0] < BigInt(0)
          ? "-"
          : ""
        : String(slope[0])
      : latex
        ? fractionText(slope, true)
        : `(${fractionText(slope)})`;
  const tail = `${intercept[0] < BigInt(0) ? " - " : " + "}${fractionText([abs(intercept[0]), intercept[1]], latex)}`;
  return `${solved} = ${coefficient}${other}${tail}`;
}
function rearrangedAnswer(
  variable: number,
  slope: Rational,
  intercept: Rational,
): ArithmeticV2Answer {
  return {
    kind: "polynomial",
    exact: [...slope, ...intercept].map(String),
    text: rearrangedDisplay(variable, slope, intercept),
    latex: rearrangedDisplay(variable, slope, intercept, true),
  };
}
/** ax + by = c solved for x (v = 0) or y (v = 1). */
const rearrange = define({
  id: "m2-formula-rearrange",
  grade: "중2",
  strand: "문자식",
  title: "등식의 변형",
  unit: "식의 계산",
  domain: cartesian(nonzero(4), nonzero(4), nonzero(6), [0, 1]),
  prompt: ([a, b, c, v]) =>
    math(
      `${expression([
        [1, 0, a],
        [0, 1, b],
      ])} = ${c}`,
      `${expression(
        [
          [1, 0, a],
          [0, 1, b],
        ],
        true,
      )}=${c}`,
      `등식을 ${v === 1 ? "y" : "x"}에 대하여 푸시오.`,
    ),
  solve: ([a, b, c, v]) =>
    v === 1
      ? rearrangedAnswer(v, rational(-a, b), rational(c, b))
      : rearrangedAnswer(v, rational(-b, a), rational(c, a)),
  check: ([a, b, c, v], answer) => {
    if (answer.kind !== "polynomial" || answer.exact.length !== 4) return false;
    const slope = readRational(answer.exact[0], answer.exact[1]),
      intercept = readRational(answer.exact[2], answer.exact[3]);
    if (!slope || !intercept) return false;
    // solved·(s·other + t) + coefficient·other = c for every value of other.
    const solvedCoefficient = BigInt(v === 1 ? b : a),
      otherCoefficient = BigInt(v === 1 ? a : b);
    return (
      solvedCoefficient * slope[0] + otherCoefficient * slope[1] ===
        BigInt(0) &&
      solvedCoefficient * intercept[0] === BigInt(c) * intercept[1] &&
      sameDisplay(
        answer,
        rearrangedDisplay(v, slope, intercept),
        rearrangedDisplay(v, slope, intercept, true),
      )
    );
  },
});
/** (b^p)^m × or ÷ (b^q)^n = b^□, written with the bases b^p and b^q as numbers. */
const baseMatch = define({
  id: "m2-exponent-base-match",
  grade: "중2",
  strand: "문자식",
  title: "밑을 맞추는 지수 계산",
  unit: "식의 계산",
  domain: filtered(
    cartesian(
      [2, 3],
      range(1, 3),
      range(1, 3),
      range(1, 5),
      range(1, 4),
      [0, 1],
    ),
    ([, p, q, m, n, op]) =>
      (p !== 1 || q !== 1) &&
      (m !== 1 || n !== 1) &&
      (op === 0 || p * m > q * n),
  ),
  prompt: ([b, p, q, m, n, op]) =>
    math(
      `${power(String(b ** p), m)} ${op ? "÷" : "×"} ${power(String(b ** q), n)} = ${b}^□`,
      `${power(String(b ** p), m, true)}${op ? "\\div" : "\\times"}${power(String(b ** q), n, true)}=${b}^{\\square}`,
      "□에 알맞은 자연수를 구하시오.",
    ),
  solve: ([, p, q, m, n, op]) => integer(op ? p * m - q * n : p * m + q * n),
  check: ([b, p, q, m, n, op], a) => {
    const k = small(a.exact[0], 1, 60);
    if (k === null || !readNumeric(a, "integer")) return false;
    const left = BigInt(b ** p) ** BigInt(m),
      right = BigInt(b ** q) ** BigInt(n),
      result = BigInt(b) ** BigInt(k);
    return op ? left === right * result : left * right === result;
  },
});
/** b^(x+k) = b^n written as a number; x is a natural number. */
const exponentEquation = define({
  id: "m2-exponent-equation",
  grade: "중2",
  strand: "문자식",
  title: "지수가 미지수인 등식",
  unit: "식의 계산",
  domain: filtered(
    cartesian([2, 3, 5], range(-3, 3), range(1, 6)),
    ([, k, n]) => n - k >= 1,
  ),
  prompt: ([b, k, n]) => {
    const exponent = k === 0 ? "x" : `x ${k < 0 ? "-" : "+"} ${Math.abs(k)}`;
    return math(
      `${b}^${k === 0 ? "x" : `(${exponent})`} = ${b ** n}`,
      `${b}^{${exponent}}=${b ** n}`,
      "x의 값을 구하시오.",
    );
  },
  solve: ([, k, n]) => integer(n - k),
  check: ([b, k, n], a) => {
    const x = small(a.exact[0], -20, 60);
    return (
      x !== null &&
      Boolean(readNumeric(a, "integer")) &&
      x + k >= 0 &&
      BigInt(b) ** BigInt(x + k) === BigInt(b) ** BigInt(n)
    );
  },
});
/** Number of digits of 2^a × 5^b (× 1, 3 or 7). */
const digitCount = define({
  id: "m2-power-digit-count",
  grade: "중2",
  strand: "문자식",
  title: "거듭제곱의 자릿수",
  unit: "식의 계산",
  domain: cartesian(range(2, 12), range(2, 12), [1, 3, 7]),
  prompt: ([a, b, k]) =>
    math(
      `${power("2", a)} × ${power("5", b)}${k === 1 ? "" : ` × ${k}`}`,
      `${power("2", a, true)}\\times ${power("5", b, true)}${k === 1 ? "" : `\\times ${k}`}`,
      "몇 자리의 자연수인지 구하시오.",
    ),
  solve: ([a, b, k]) =>
    integer(
      String(BigInt(2) ** BigInt(a) * BigInt(5) ** BigInt(b) * BigInt(k))
        .length,
    ),
  check: ([a, b, k], answer) => {
    const digits = small(answer.exact[0], 1, 30);
    if (digits === null || !readNumeric(answer, "integer")) return false;
    const value = BigInt(2) ** BigInt(a) * BigInt(5) ** BigInt(b) * BigInt(k),
      low = BigInt(10) ** BigInt(digits - 1);
    return value >= low && value < low * BigInt(10);
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
  twoVariablePolynomial("add"),
  twoVariablePolynomial("subtract"),
  nestedBraces,
  substitute,
  rearrange,
  baseMatch,
  exponentEquation,
  digitCount,
  rootIdentity(true),
  rootIdentity(false),
  formula(false, false),
  formula(true, false),
  formula(true, true),
  formulaValue,
];
