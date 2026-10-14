import type { ArithmeticV2Answer, ArithmeticV2Definition } from "../../types";
import {
  abs,
  add,
  cartesian,
  family,
  fractionText,
  math,
  multiply,
  negate,
  nonzero,
  range,
  rational,
  readInteger,
  readRational,
  type Domain,
  type Rational,
} from "./exact";

type Polynomial = Rational[]; // Ascending degrees internally; trailing zero coefficients allowed.
const zero = () => rational(0);
const coefficient = (p: Polynomial, degree: number): Rational =>
  p[degree] ?? zero();
const monomial = (n: number, e: number): Polynomial => [
  ...Array.from({ length: e }, zero),
  rational(n),
];
const poly = (coefficients: number[]): Polynomial =>
  coefficients.map((n) => rational(n));
function plus(a: Polynomial, b: Polynomial): Polynomial {
  return Array.from({ length: Math.max(a.length, b.length) }, (_, e) =>
    add(coefficient(a, e), coefficient(b, e)),
  );
}
function product(a: Polynomial, b: Polynomial): Polynomial {
  const result = Array.from({ length: a.length + b.length - 1 }, zero);
  a.forEach((x, i) =>
    b.forEach((y, j) => {
      result[i + j] = add(result[i + j], multiply(x, y));
    }),
  );
  return result;
}
function polynomialText(p: Polynomial, latex = false): string {
  let text = "";
  for (let e = p.length - 1; e >= 0; e--) {
    const [n, d] = p[e];
    if (n === BigInt(0)) continue;
    const sign = n < BigInt(0) ? "-" : "+";
    const magnitude = fractionText([abs(n), d], latex);
    const c =
      e > 0 && abs(n) === d
        ? ""
        : e > 0 && d !== BigInt(1) && !latex
          ? `(${magnitude})`
          : magnitude;
    const variable =
      e === 0 ? "" : e === 1 ? "x" : latex ? `x^{${e}}` : `x^${e}`;
    text += `${text ? ` ${sign} ` : sign === "-" ? "-" : ""}${c}${variable}`;
  }
  return text || "0";
}
function polynomialAnswer(p: Polynomial): ArithmeticV2Answer {
  const exact: string[] = [];
  for (let e = p.length - 1; e >= 0; e--)
    if (p[e][0] !== BigInt(0)) exact.push(String(e), ...p[e].map(String));
  return {
    kind: "polynomial",
    exact,
    text: polynomialText(p),
    latex: polynomialText(p, true),
  };
}
function readPolynomial(answer: ArithmeticV2Answer): Polynomial | null {
  if (answer.kind !== "polynomial" || answer.exact.length % 3 !== 0)
    return null;
  const result: Polynomial = [];
  let previous = 7;
  for (let i = 0; i < answer.exact.length; i += 3) {
    const rawDegree = readInteger(answer.exact[i]);
    const value = readRational(answer.exact[i + 1], answer.exact[i + 2]);
    if (
      rawDegree === null ||
      rawDegree < BigInt(0) ||
      rawDegree >= BigInt(previous) ||
      !value ||
      value[0] === BigInt(0)
    )
      return null;
    const degree = Number(rawDegree);
    while (result.length <= degree) result.push(zero());
    result[degree] = value;
    previous = degree;
  }
  if (
    polynomialText(result) !== answer.text ||
    polynomialText(result, true) !== answer.latex
  )
    return null;
  return result;
}

type Operation = "add" | "subtract" | "multiply" | "divide";
type AlgebraSpec = Pick<
  ArithmeticV2Definition,
  "id" | "grade" | "title" | "description" | "rankGroup"
> & {
  domain: Domain;
  operation: Operation;
  operands(p: number[]): [Polynomial, Polynomial];
};
const operators = {
  add: ["+", "+"],
  subtract: ["-", "-"],
  multiply: ["×", "\\times"],
  divide: ["÷", "\\div"],
} as const;
function algebra(spec: AlgebraSpec): ArithmeticV2Definition {
  return family({
    ...spec,
    strand: "문자식",
    labels: [
      "문자식",
      spec.operation === "divide" ? "단항식으로 나누기" : "식의 계산",
    ],
    prompt: (p) => {
      const [left, right] = spec.operands(p),
        [textOp, latexOp] = operators[spec.operation];
      return math(
        `(${polynomialText(left)}) ${textOp} (${polynomialText(right)})`,
        `\\left(${polynomialText(left, true)}\\right) ${latexOp} \\left(${polynomialText(right, true)}\\right)`,
        spec.operation === "divide"
          ? "식을 간단히 하시오. (단, x ≠ 0)"
          : "식을 간단히 하시오.",
      );
    },
    solve: (p) => {
      const [left, right] = spec.operands(p);
      if (spec.operation === "add") return polynomialAnswer(plus(left, right));
      if (spec.operation === "subtract")
        return polynomialAnswer(plus(left, right.map(negate)));
      if (spec.operation === "multiply")
        return polynomialAnswer(product(left, right));
      const degree = right.length - 1,
        divisor = right[degree];
      return polynomialAnswer(
        left
          .slice(degree)
          .map(([n, d]) => rational(n * divisor[1], d * divisor[0])),
      );
    },
    check: (p, answer) => {
      const result = readPolynomial(answer);
      if (!result) return false;
      const [left, right] = spec.operands(p);
      // Every formal coefficient is checked. No evaluation at a few x values.
      // Inputs have integer coefficients; candidate coefficients may be rational.
      if (spec.operation === "add" || spec.operation === "subtract") {
        for (
          let e = 0;
          e < Math.max(left.length, right.length, result.length);
          e++
        ) {
          const [n, d] = coefficient(result, e),
            a = coefficient(left, e)[0],
            b = coefficient(right, e)[0];
          if (
            spec.operation === "add" ? n - a * d !== b * d : n + b * d !== a * d
          )
            return false;
        }
        return true;
      }
      if (spec.operation === "divide") {
        const shift = right.length - 1,
          divisor = right[shift][0];
        for (let e = 0; e < Math.max(left.length, result.length + shift); e++) {
          const [n, d] = e < shift ? zero() : coefficient(result, e - shift);
          if (n * divisor !== coefficient(left, e)[0] * d) return false;
        }
        return true;
      }
      // Multiply via the coefficient identity for each degree, separately from product().
      for (
        let degree = 0;
        degree < Math.max(result.length, left.length + right.length - 1);
        degree++
      ) {
        let expected = BigInt(0);
        for (let i = 0; i <= degree; i++)
          expected +=
            coefficient(left, i)[0] * coefficient(right, degree - i)[0];
        const [n, d] = coefficient(result, degree);
        if (n !== expected * d) return false;
      }
      return true;
    },
  });
}

const linearDomain = cartesian(
  nonzero(5),
  range(-5, 5),
  nonzero(5),
  range(-5, 5),
);
const quadraticDomain = cartesian(
  nonzero(3),
  range(-3, 3),
  range(-3, 3),
  nonzero(3),
  range(-3, 3),
  range(-3, 3),
);
const polynomialMonomialDomain = cartesian(
  nonzero(3),
  range(-3, 3),
  range(-3, 3),
  nonzero(5),
  range(1, 2),
);
const monomialDivisionBase = cartesian(
  nonzero(9),
  range(0, 3),
  nonzero(9),
  range(1, 3),
);
const monomialDivisionDomain: Domain = {
  size: monomialDivisionBase.size,
  at(index) {
    const [a, difference, b, f] = monomialDivisionBase.at(index);
    return [a, difference + f, b, f];
  },
  contains: (p) =>
    p.length === 4 &&
    monomialDivisionBase.contains([p[0], p[1] - p[3], p[2], p[3]]),
};

export const POLYNOMIAL_DEFINITIONS: readonly ArithmeticV2Definition[] = [
  algebra({
    id: "m1-like-terms",
    grade: "중1",
    title: "동류항의 덧셈",
    description:
      "정수 계수를 가진 두 x항을 더합니다. 서로 지워져 0이 되는 경우도 포함합니다.",
    rankGroup: "m1-linear-expression",
    domain: cartesian(nonzero(9), nonzero(9)),
    operation: "add",
    operands: ([a, b]) => [monomial(a, 1), monomial(b, 1)],
  }),
  ...(["add", "subtract"] as const).map((operation) =>
    algebra({
      id: `m1-linear-${operation}`,
      grade: "중1",
      title: `일차식의 ${operation === "add" ? "덧셈" : "뺄셈"}`,
      description:
        "정수 계수인 두 일차식을 계산합니다. 괄호와 상수항을 포함합니다.",
      rankGroup: "m1-linear-expression",
      operation,
      domain: linearDomain,
      operands: ([a, b, c, d]) => [poly([b, a]), poly([d, c])],
    }),
  ),
  algebra({
    id: "m2-monomial-multiply",
    grade: "중2",
    title: "단항식의 곱셈",
    description: "정수 계수와 x의 자연수 지수를 가진 두 단항식을 곱합니다.",
    rankGroup: "m2-monomial",
    operation: "multiply",
    domain: cartesian(nonzero(9), range(1, 3), nonzero(9), range(1, 3)),
    operands: ([a, e, b, f]) => [monomial(a, e), monomial(b, f)],
  }),
  algebra({
    id: "m2-monomial-divide",
    grade: "중2",
    title: "단항식의 나눗셈",
    description:
      "x의 지수 차가 0~3인 단항식 나눗셈입니다. 계수는 기약분수로 정리합니다.",
    rankGroup: "m2-monomial",
    operation: "divide",
    domain: monomialDivisionDomain,
    operands: ([a, e, b, f]) => [monomial(a, e), monomial(b, f)],
  }),
  ...(["add", "subtract"] as const).map((operation) =>
    algebra({
      id: `m2-polynomial-${operation}`,
      grade: "중2",
      title: `다항식의 ${operation === "add" ? "덧셈" : "뺄셈"}`,
      description:
        "x의 이차항까지 있는 두 다항식을 계산합니다. 동류항을 모아 정리합니다.",
      rankGroup: "m2-polynomial",
      operation,
      domain: quadraticDomain,
      operands: ([a, b, c, d, e, f]) => [poly([c, b, a]), poly([f, e, d])],
    }),
  ),
  algebra({
    id: "m2-polynomial-monomial-multiply",
    grade: "중2",
    title: "다항식과 단항식의 곱셈",
    description: "이차식의 각 항에 단항식을 곱해 정리합니다.",
    rankGroup: "m2-polynomial",
    operation: "multiply",
    domain: polynomialMonomialDomain,
    operands: ([a, b, c, d, e]) => [poly([c, b, a]), monomial(d, e)],
  }),
  algebra({
    id: "m2-polynomial-monomial-divide",
    grade: "중2",
    title: "다항식을 단항식으로 나누기",
    description:
      "모든 항이 제수의 x 거듭제곱으로 나누어지는 계산입니다. 계수는 기약분수로 정리합니다.",
    rankGroup: "m2-polynomial",
    operation: "divide",
    domain: polynomialMonomialDomain,
    operands: ([a, b, c, d, e]) => [
      [...Array.from({ length: e }, zero), ...poly([c, b, a])],
      monomial(d, e),
    ],
  }),
  algebra({
    id: "m3-polynomial-multiply",
    grade: "중3",
    title: "두 일차식의 곱셈",
    description:
      "두 일차식을 곱해 이차식으로 전개합니다. 인수분해와 방정식 풀이는 포함하지 않습니다.",
    rankGroup: "m3-polynomial-multiply",
    operation: "multiply",
    domain: linearDomain,
    operands: ([a, b, c, d]) => [poly([b, a]), poly([d, c])],
  }),
];
