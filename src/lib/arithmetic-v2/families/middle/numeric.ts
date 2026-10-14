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

const operations = [
  { id: "add", name: "덧셈", text: "+", latex: "+" },
  { id: "subtract", name: "뺄셈", text: "-", latex: "-" },
  { id: "multiply", name: "곱셈", text: "×", latex: "\\times" },
  { id: "divide", name: "나눗셈", text: "÷", latex: "\\div" },
] as const;
const divisionDomain: Domain = {
  size: 20 * 21,
  at(index) {
    const [b, q] = cartesian(nonzero(10), range(-10, 10)).at(index);
    return [b * q || 0, b];
  },
  contains: (p) =>
    p.length === 2 &&
    p[1] !== 0 &&
    Math.abs(p[1]) <= 10 &&
    p[0] % p[1] === 0 &&
    Math.abs(p[0] / p[1]) <= 10,
};
const integers = operations.map((operation): ArithmeticV2Definition =>
  family({
    id: `m1-integer-${operation.id}`,
    grade: "중1",
    strand: "정수·유리수",
    title: `정수 ${operation.name}`,
    description:
      operation.id === "divide"
        ? "0이 아닌 정수로 나누어떨어지는 계산입니다. 몫은 -10부터 10까지입니다."
        : `양수·0·음수를 포함한 정수 ${operation.name}입니다.`,
    labels: ["정수", operation.name],
    rankGroup: "m1-integer-four-ops",
    domain:
      operation.id === "divide"
        ? divisionDomain
        : cartesian(
            range(
              operation.id === "multiply" ? -12 : -20,
              operation.id === "multiply" ? 12 : 20,
            ),
            range(
              operation.id === "multiply" ? -12 : -20,
              operation.id === "multiply" ? 12 : 20,
            ),
          ),
    prompt: ([a, b]) =>
      math(
        `${paren(a)} ${operation.text} ${paren(b)}`,
        `${paren(a)} ${operation.latex} ${paren(b)}`,
      ),
    solve: ([a, b]) => {
      const x = BigInt(a),
        y = BigInt(b);
      const n =
        operation.id === "add"
          ? x + y
          : operation.id === "subtract"
            ? x - y
            : operation.id === "multiply"
              ? x * y
              : x / y;
      return numericAnswer(rational(n), "integer");
    },
    check: ([a, b], answer) => {
      const value = readNumeric(answer, "integer");
      if (!value) return false;
      const [z] = value,
        x = BigInt(a),
        y = BigInt(b);
      // Inverse identities, not the generation arithmetic.
      if (operation.id === "add") return z - x === y;
      if (operation.id === "subtract") return z + y === x;
      if (operation.id === "divide") return z * y === x;
      return x === BigInt(0)
        ? z === BigInt(0)
        : z % x === BigInt(0) && z / x === y;
    },
  }),
);

// Reduced, noninteger inputs. No equivalent fractions inflate the domain.
const fractions: number[][] = [];
for (const n of nonzero(12))
  for (const d of range(2, 12))
    if (gcd(BigInt(n), BigInt(d)) === BigInt(1)) fractions.push([n, d]);
const fractionDomain: Domain = {
  size: fractions.length ** 2,
  at(index) {
    const [a, b] = decode(index, [fractions.length, fractions.length]);
    return [...fractions[a], ...fractions[b]];
  },
  contains: (p) =>
    p.length === 4 &&
    [0, 2].every(
      (i) =>
        p[i] !== 0 &&
        Math.abs(p[i]) <= 12 &&
        p[i + 1] >= 2 &&
        p[i + 1] <= 12 &&
        gcd(BigInt(p[i]), BigInt(p[i + 1])) === BigInt(1),
    ),
};
const rationals = operations.map((operation): ArithmeticV2Definition =>
  family({
    id: `m1-rational-${operation.id}`,
    grade: "중1",
    strand: "정수·유리수",
    title: `유리수 ${operation.name}`,
    description: `분모 2~12인 양수·음수 기약분수의 ${operation.name}입니다. 답은 기약분수 또는 정수로 씁니다.`,
    labels: ["유리수", operation.name],
    rankGroup: "m1-rational-four-ops",
    domain: fractionDomain,
    prompt: ([a, b, c, d]) => {
      const left = rational(a, b),
        right = rational(c, d);
      return math(
        `(${fractionText(left)}) ${operation.text} (${fractionText(right)})`,
        `\\left(${fractionText(left, true)}\\right) ${operation.latex} \\left(${fractionText(right, true)}\\right)`,
      );
    },
    solve: ([a, b, c, d]) => {
      const left = rational(a, b),
        right = rational(c, d);
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
    check: ([a, b, c, d], answer) => {
      const value = readNumeric(answer, "rational");
      if (!value) return false;
      const [n, q] = value,
        [A, B, C, D] = [a, b, c, d].map(BigInt);
      if (operation.id === "add") return n * B * D - A * q * D === C * q * B;
      if (operation.id === "subtract")
        return n * B * D + C * q * B === A * q * D;
      if (operation.id === "multiply") return n * B * D === A * C * q;
      return n * C * B === A * D * q;
    },
  }),
);

export const NUMERIC_DEFINITIONS: readonly ArithmeticV2Definition[] = [
  ...integers,
  ...rationals,
  family({
    id: "m1-integer-power",
    grade: "중1",
    strand: "정수·유리수",
    title: "부호 있는 정수의 거듭제곱",
    description:
      "밑 -8~8(0 제외), 지수 2~4의 거듭제곱입니다. 음수인 밑은 괄호로 묶습니다.",
    labels: ["정수", "거듭제곱"],
    rankGroup: "m1-numeric-expression",
    domain: cartesian(nonzero(8), range(2, 4)),
    prompt: ([a, e]) => math(`(${a})^${e}`, `(${a})^{${e}}`),
    solve: ([a, e]) =>
      numericAnswer(rational(BigInt(a) ** BigInt(e)), "integer"),
    check: ([a, e], answer) => {
      const value = readNumeric(answer, "integer");
      if (!value) return false;
      let n = value[0];
      const base = BigInt(a);
      for (let i = 0; i < e; i++) {
        if (n % base !== BigInt(0)) return false;
        n /= base;
      }
      return n === BigInt(1);
    },
  }),
  family({
    id: "m1-numeric-expression",
    grade: "중1",
    strand: "정수·유리수",
    title: "괄호가 있는 정수 혼합 계산",
    description:
      "두 정수의 합에 0이 아닌 정수를 곱합니다. 괄호 안을 먼저 계산합니다.",
    labels: ["정수", "혼합 계산"],
    rankGroup: "m1-numeric-expression",
    domain: cartesian(range(-12, 12), range(-12, 12), nonzero(6)),
    prompt: ([a, b, c]) =>
      math(
        `(${a} + ${paren(b)}) × ${paren(c)}`,
        `\\left(${a} + ${paren(b)}\\right) \\times ${paren(c)}`,
      ),
    solve: ([a, b, c]) =>
      numericAnswer(rational((BigInt(a) + BigInt(b)) * BigInt(c)), "integer"),
    check: ([a, b, c], answer) => {
      const value = readNumeric(answer, "integer");
      return (
        !!value &&
        value[0] % BigInt(c) === BigInt(0) &&
        value[0] / BigInt(c) - BigInt(a) === BigInt(b)
      );
    },
  }),
];
