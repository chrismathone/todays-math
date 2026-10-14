import type { ArithmeticV2Definition } from "../../types";
import {
  add,
  cartesian,
  decode,
  divide,
  family,
  fractionText,
  gcd,
  math,
  multiply,
  negate,
  nonzero,
  numericAnswer,
  paren,
  range,
  rational,
  readNumeric,
  type Domain,
} from "./exact";

// Additive domains only: the original numeric families keep every old index.
// F has 34 reduced, noninteger fractions, in numerator/denominator order.
// Signs live in the numerator; equivalent fraction spellings are not new tasks.
const fractions: number[][] = [];
for (const n of nonzero(6))
  for (const d of range(2, 6))
    if (gcd(BigInt(n), BigInt(d)) === BigInt(1)) fractions.push([n, d]);
const fractionKeys = new Set(fractions.map(([n, d]) => `${n}/${d}`));
const isFraction = (n: number, d: number): boolean =>
  fractionKeys.has(`${n}/${d}`);
function operand(n: number, d: number, latex = false, group = false): string {
  const text = fractionText(rational(n, d), latex);
  return group || n < 0
    ? latex
      ? `\\left(${text}\\right)`
      : `(${text})`
    : text;
}

// Each ordered pair is a distinct displayed division. Excluding exact integer
// quotients fills the old divide family's gap without copying its exercises.
const nonintegralDivisions: number[][] = [];
for (const a of range(-12, 12))
  for (const b of nonzero(12))
    if (a % b !== 0) nonintegralDivisions.push([a, b]);
const nonintegralDivisionDomain: Domain = {
  size: nonintegralDivisions.length,
  at: (index) => [...nonintegralDivisions[index]],
  contains: (p) =>
    p.length === 2 &&
    Math.abs(p[0]) <= 12 &&
    Math.abs(p[1]) <= 12 &&
    p[1] !== 0 &&
    p[0] % p[1] !== 0,
};

const operations = [
  { id: "add", name: "덧셈", text: "+", latex: "+" },
  { id: "subtract", name: "뺄셈", text: "-", latex: "-" },
  { id: "multiply", name: "곱셈", text: "×", latex: "\\times" },
  { id: "divide", name: "나눗셈", text: "÷", latex: "\\div" },
] as const;

const mixedOperands = operations.map((operation): ArithmeticV2Definition => {
  const integers = operation.id === "divide" ? nonzero(9) : range(-9, 9);
  // Both orders matter for subtraction/division; commutative operations need
  // only integer-first exercises. Parameters are [integer, n, d, reverse].
  const orders =
    operation.id === "subtract" || operation.id === "divide" ? [0, 1] : [0];
  const domain: Domain = {
    size: integers.length * fractions.length * orders.length,
    at(index) {
      const [i, f, o] = decode(index, [
        integers.length,
        fractions.length,
        orders.length,
      ]);
      return [integers[i], ...fractions[f], orders[o]];
    },
    contains: (p) =>
      p.length === 4 &&
      integers.includes(p[0]) &&
      isFraction(p[1], p[2]) &&
      orders.includes(p[3]),
  };
  return family({
    id: `m1-integer-fraction-${operation.id}`,
    grade: "중1",
    strand: "정수·유리수",
    title: `정수와 분수의 ${operation.name}`,
    description: `정수 -9~9와 분모 2~6인 기약분수의 ${operation.name}입니다.${operation.id === "divide" ? " 정수 0은 제외합니다." : ""} 답은 기약분수 또는 정수로 씁니다.`,
    labels: ["정수", "유리수", operation.name],
    rankGroup: "m1-integer-fraction-four-ops",
    domain,
    prompt: ([i, n, d, reverse]) => {
      // A fractional divisor must be grouped in plain text: a ÷ (n/d).
      const divisor = operation.id === "divide" && reverse === 0;
      const text = [paren(i), operand(n, d, false, divisor)];
      const latex = [paren(i), operand(n, d, true, divisor)];
      if (reverse) {
        text.reverse();
        latex.reverse();
      }
      return math(
        text.join(` ${operation.text} `),
        latex.join(` ${operation.latex} `),
      );
    },
    solve: ([i, n, d, reverse]) => {
      const integer = rational(i),
        fraction = rational(n, d);
      const [left, right] = reverse ? [fraction, integer] : [integer, fraction];
      return numericAnswer(
        operation.id === "add"
          ? add(left, right)
          : operation.id === "subtract"
            ? add(left, negate(right))
            : operation.id === "multiply"
              ? multiply(left, right)
              : divide(left, right),
        "rational",
      );
    },
    check: ([i, n, d, reverse], answer) => {
      const value = readNumeric(answer, "rational");
      if (!value) return false;
      const [z, q] = value;
      const [A, B, C, D] = (reverse ? [n, d, i, 1] : [i, 1, n, d]).map(BigInt);
      // Independent cross-multiplied inverse identities; never run solve.
      if (operation.id === "add") return z * B * D - A * q * D === C * q * B;
      if (operation.id === "subtract")
        return z * B * D + C * q * B === A * q * D;
      if (operation.id === "multiply") return z * B * D === A * C * q;
      return z * B * C === A * D * q;
    },
  });
});

// Four precedence templates: a+b×c, a-b×c, a+b÷c, a-b÷c.
// All answers use rational normal form, including integers and zero.
const precedenceDomain = cartesian(
  range(0, 3),
  range(-9, 9),
  nonzero(9),
  nonzero(9),
);

// [template, a, b, c, d, k] displays (a/b ± c/d) × k or ÷ k.
// Rightmost axis varies fastest. No full Cartesian product is materialized.
const factors = nonzero(6);
const groupedDomain: Domain = {
  size: 4 * fractions.length ** 2 * factors.length,
  at(index) {
    const [t, left, right, k] = decode(index, [
      4,
      fractions.length,
      fractions.length,
      factors.length,
    ]);
    return [t, ...fractions[left], ...fractions[right], factors[k]];
  },
  contains: (p) =>
    p.length === 6 &&
    p[0] >= 0 &&
    p[0] <= 3 &&
    isFraction(p[1], p[2]) &&
    isFraction(p[3], p[4]) &&
    factors.includes(p[5]),
};

/** Seven missing numeric task shapes; recommended grade placement only. */
export const NUMERIC_SUPPLEMENT_DEFINITIONS: readonly ArithmeticV2Definition[] =
  [
    family({
      id: "m1-integer-rational-quotient",
      grade: "중1",
      strand: "정수·유리수",
      title: "정수 나눗셈의 분수 몫",
      description:
        "절댓값 12 이하인 정수를 나누어 정수가 아닌 몫을 구합니다. 답은 기약분수로 씁니다.",
      labels: ["정수", "유리수", "나눗셈"],
      rankGroup: "m1-integer-rational-quotient",
      domain: nonintegralDivisionDomain,
      prompt: ([a, b]) =>
        math(`${paren(a)} ÷ ${paren(b)}`, `${paren(a)} \\div ${paren(b)}`),
      solve: ([a, b]) =>
        numericAnswer(divide(rational(a), rational(b)), "rational"),
      check: ([a, b], answer) => {
        const value = readNumeric(answer, "rational");
        return !!value && value[0] * BigInt(b) === BigInt(a) * value[1];
      },
    }),
    ...mixedOperands,
    family({
      id: "m1-numeric-precedence",
      grade: "중1",
      strand: "정수·유리수",
      title: "곱셈·나눗셈을 먼저 하는 혼합 계산",
      description:
        "정수의 덧셈·뺄셈과 곱셈·나눗셈이 섞인 식입니다. 곱셈·나눗셈부터 계산하고 답은 기약분수 또는 정수로 씁니다.",
      labels: ["정수", "유리수", "계산 순서"],
      rankGroup: "m1-numeric-precedence",
      domain: precedenceDomain,
      prompt: ([t, a, b, c]) => {
        const sign = t % 2 === 0 ? "+" : "-";
        return math(
          `${paren(a)} ${sign} ${paren(b)} ${t < 2 ? "×" : "÷"} ${paren(c)}`,
          `${paren(a)} ${sign} ${paren(b)} ${t < 2 ? "\\times" : "\\div"} ${paren(c)}`,
        );
      },
      solve: ([t, a, b, c]) => {
        const term =
          t < 2
            ? multiply(rational(b), rational(c))
            : divide(rational(b), rational(c));
        return numericAnswer(
          add(rational(a), t % 2 === 0 ? term : negate(term)),
          "rational",
        );
      },
      check: ([t, a, b, c], answer) => {
        const value = readNumeric(answer, "rational");
        if (!value) return false;
        const [z, q] = value,
          [A, B, C] = [a, b, c].map(BigInt);
        const sign = t % 2 === 0 ? BigInt(1) : BigInt(-1);
        return t < 2
          ? z - A * q === sign * B * C * q
          : (z - A * q) * C === sign * B * q;
      },
    }),
    family({
      id: "m1-rational-grouped-expression",
      grade: "중1",
      strand: "정수·유리수",
      title: "괄호가 있는 유리수 혼합 계산",
      description:
        "두 기약분수의 합·차를 구한 뒤 0이 아닌 정수를 곱하거나 나눕니다. 답은 기약분수 또는 정수로 씁니다.",
      labels: ["유리수", "혼합 계산", "괄호"],
      rankGroup: "m1-rational-grouped-expression",
      domain: groupedDomain,
      prompt: ([t, a, b, c, d, k]) => {
        const sign = t % 2 === 0 ? "+" : "-";
        return math(
          `(${operand(a, b)} ${sign} ${operand(c, d)}) ${t < 2 ? "×" : "÷"} ${paren(k)}`,
          `\\left(${operand(a, b, true)} ${sign} ${operand(c, d, true)}\\right) ${t < 2 ? "\\times" : "\\div"} ${paren(k)}`,
        );
      },
      solve: ([t, a, b, c, d, k]) => {
        const right = rational(c, d);
        const inside = add(rational(a, b), t % 2 === 0 ? right : negate(right));
        return numericAnswer(
          t < 2 ? multiply(inside, rational(k)) : divide(inside, rational(k)),
          "rational",
        );
      },
      check: ([t, a, b, c, d, k], answer) => {
        const value = readNumeric(answer, "rational");
        if (!value) return false;
        const [z, q] = value,
          [A, B, C, D, K] = [a, b, c, d, k].map(BigInt);
        const sign = t % 2 === 0 ? BigInt(1) : BigInt(-1);
        // Undo the outer operation, then subtract the first fraction.
        return t < 2
          ? z * B * D - A * D * K * q === sign * C * B * K * q
          : z * K * B * D - A * D * q === sign * C * B * q;
      },
    }),
  ];
