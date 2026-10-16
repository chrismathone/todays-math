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

// ---- 중1 expansion (2026-10-16): chains, powers, reciprocals, decimal·fraction mixes.
// Additive only: every earlier definition keeps its id, domain and indexes.
const ZERO = BigInt(0),
  ONE = BigInt(1);
const minus = (bit: number): string => (bit ? "-" : "+");
/** Factors for displayed × and ÷: 0 and 1 are trivial, -1 stays as a sign drill. */
const factors = nonzero(6).filter((n) => n !== 1);
const powerText = (base: number, exponent: number, latex = false): string =>
  latex ? `${paren(base)}^{${exponent}}` : `${paren(base)}^${exponent}`;
/** n === base^exponent, by repeated exact division (never by multiplying). */
function isPower(n: bigint, base: number, exponent: number): boolean {
  const b = BigInt(base);
  for (let i = 0; i < exponent; i++) {
    if (n % b !== ZERO) return false;
    n /= b;
  }
  return n === ONE;
}
function powerOf(base: number, exponent: number): bigint {
  let result = ONE;
  for (let i = 0; i < exponent; i++) result *= BigInt(base);
  return result;
}

// Decimals in value order, as [coefficient, scale] with the sign in the coefficient:
// -2.5 ... -0.1, 0.1 ... 2.5 (one place, plus 0.25 / 0.75 and 1.2 / 1.5 / 2.5).
const decimalMagnitudes: readonly (readonly [number, number])[] = [
  [1, 1],
  [2, 1],
  [25, 2],
  [3, 1],
  [4, 1],
  [5, 1],
  [6, 1],
  [7, 1],
  [75, 2],
  [8, 1],
  [9, 1],
  [12, 1],
  [15, 1],
  [25, 1],
];
const decimals: number[][] = [
  ...decimalMagnitudes.map(([c, s]) => [-c, s]).reverse(),
  ...decimalMagnitudes.map(([c, s]) => [c, s]),
];
const decimalKeys = new Set(decimals.map(([c, s]) => `${c}/${s}`));
const isDecimal = (coefficient: number, scale: number): boolean =>
  decimalKeys.has(`${coefficient}/${scale}`);
function decimalText(coefficient: number, scale: number): string {
  const digits = String(Math.abs(coefficient)).padStart(scale + 1, "0");
  return `${coefficient < 0 ? "-" : ""}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}
const decimalValue = (coefficient: number, scale: number) =>
  rational(coefficient, BigInt(10) ** BigInt(scale));
function group(text: string, latex: boolean, grouped: boolean): string {
  if (!grouped) return text;
  return latex ? `\\left(${text}\\right)` : `(${text})`;
}

// Reduced noninteger fractions, numerator outer, denominator inner.
function reducedFractions(bound: number, maxDenominator: number): number[][] {
  const result: number[][] = [];
  for (const n of nonzero(bound))
    for (const d of range(2, maxDenominator))
      if (gcd(BigInt(n), BigInt(d)) === ONE) result.push([n, d]);
  return result;
}
const isReducedFraction = (
  n: number,
  d: number,
  bound: number,
  maxDenominator: number,
): boolean =>
  Number.isInteger(n) &&
  n !== 0 &&
  Math.abs(n) <= bound &&
  Number.isInteger(d) &&
  d >= 2 &&
  d <= maxDenominator &&
  gcd(BigInt(n), BigInt(d)) === ONE;

// [t, a, b, q, d] displays a × b ± (q·d) ÷ d (t = 0, 1) or (q·d) ÷ d ± a × b (t = 2, 3).
// Neither factor of the product is 1; the quotient q may be ±1 (a ÷ a drill).
const mixedChainDomain = cartesian(
  range(0, 3),
  factors,
  factors,
  nonzero(6),
  factors,
);
// [t, a, e, b, c] displays a^e ± b × c (t = 0, 1) or b × c ± a^e (t = 2, 3).
const powerMixedDomain = cartesian(
  range(0, 3),
  nonzero(5).filter((n) => n !== 1),
  range(2, 3),
  factors,
  factors,
);
// [code, a, e, b, f]: bit 0 = left form (-a^e or (-a)^e), bit 1 = right form
// (b^f or (-b)^f), bit 2 = operator (+ or -).
const negativeSquareDomain = cartesian(
  range(0, 7),
  range(1, 5),
  range(2, 3),
  range(1, 5),
  range(2, 3),
);

// [form, n, d]: integer (form 0, |n| ≥ 2), reduced fraction n/d (form 1) or decimal n·10^-d (form 2).
const reciprocalInputs: number[][] = [
  ...nonzero(12)
    .filter((n) => Math.abs(n) !== 1)
    .map((n) => [0, n, 1]),
  ...reducedFractions(9, 9).map(([n, d]) => [1, n, d]),
  ...decimals.map(([c, s]) => [2, c, s]),
];
const reciprocalDomain: Domain = {
  size: reciprocalInputs.length,
  at: (index) => [...reciprocalInputs[index]],
  contains: (p) =>
    p.length === 3 &&
    (p[0] === 0
      ? Number.isInteger(p[1]) &&
        Math.abs(p[1]) >= 2 &&
        Math.abs(p[1]) <= 12 &&
        p[2] === 1
      : p[0] === 1
        ? isReducedFraction(p[1], p[2], 9, 9)
        : p[0] === 2 && isDecimal(p[1], p[2])),
};
function reciprocalDisplay([form, n, d]: number[], latex: boolean): string {
  if (form === 0) return String(n);
  if (form === 1) return fractionText(rational(n, d), latex);
  return decimalText(n, d);
}

// [op, coefficient, scale, n, d, order]: decimal and fraction in both orders for
// subtraction and division only; addition and multiplication show the decimal first.
const mixedShapes = [
  [0, 0],
  [1, 0],
  [1, 1],
  [2, 0],
  [3, 0],
  [3, 1],
] as const;
const smallFractions = reducedFractions(6, 6);
const decimalFractionDomain: Domain = {
  size: mixedShapes.length * decimals.length * smallFractions.length,
  at(index) {
    const [s, i, f] = decode(index, [
      mixedShapes.length,
      decimals.length,
      smallFractions.length,
    ]);
    return [
      mixedShapes[s][0],
      ...decimals[i],
      ...smallFractions[f],
      mixedShapes[s][1],
    ];
  },
  contains: (p) =>
    p.length === 6 &&
    mixedShapes.some(([op, order]) => op === p[0] && order === p[5]) &&
    isDecimal(p[1], p[2]) &&
    isReducedFraction(p[3], p[4], 6, 6),
};

const expansion: readonly ArithmeticV2Definition[] = [
  family({
    id: "m1-integer-add-chain",
    grade: "중1",
    strand: "정수·유리수",
    title: "세 정수의 덧셈과 뺄셈",
    description:
      "0이 아닌 정수 세 개를 덧셈과 뺄셈으로 잇습니다. 절댓값은 9 이하이고 음수는 괄호로 묶습니다.",
    labels: ["정수", "덧셈", "뺄셈", "혼합 계산"],
    rankGroup: "m1-integer-chain",
    domain: cartesian(nonzero(9), nonzero(9), nonzero(9), range(0, 3)),
    prompt: ([a, b, c, ops]) => {
      const text = `${paren(a)} ${minus(ops >> 1)} ${paren(b)} ${minus(ops & 1)} ${paren(c)}`;
      return math(text, text);
    },
    solve: ([a, b, c, ops]) => {
      const first = ops >> 1 ? BigInt(a) - BigInt(b) : BigInt(a) + BigInt(b);
      return numericAnswer(
        rational(ops & 1 ? first - BigInt(c) : first + BigInt(c)),
        "integer",
      );
    },
    check: ([a, b, c, ops], answer) => {
      const value = readNumeric(answer, "integer");
      if (!value) return false;
      // Undo the chain from the right; the remainder must be the first operand.
      let n = value[0];
      n = ops & 1 ? n + BigInt(c) : n - BigInt(c);
      n = ops >> 1 ? n + BigInt(b) : n - BigInt(b);
      return n === BigInt(a);
    },
  }),
  family({
    id: "m1-integer-add-chain-four",
    grade: "중1",
    strand: "정수·유리수",
    title: "네 정수의 덧셈과 뺄셈",
    description:
      "0이 아닌 정수 네 개를 덧셈과 뺄셈으로 잇습니다. 절댓값은 5 이하이고 음수는 괄호로 묶습니다.",
    labels: ["정수", "덧셈", "뺄셈", "혼합 계산"],
    rankGroup: "m1-integer-chain",
    domain: cartesian(
      nonzero(5),
      nonzero(5),
      nonzero(5),
      nonzero(5),
      range(0, 7),
    ),
    prompt: ([a, b, c, d, ops]) => {
      const text = `${paren(a)} ${minus(ops >> 2)} ${paren(b)} ${minus((ops >> 1) & 1)} ${paren(c)} ${minus(ops & 1)} ${paren(d)}`;
      return math(text, text);
    },
    solve: ([a, b, c, d, ops]) => {
      let n = BigInt(a);
      n = ops >> 2 ? n - BigInt(b) : n + BigInt(b);
      n = (ops >> 1) & 1 ? n - BigInt(c) : n + BigInt(c);
      n = ops & 1 ? n - BigInt(d) : n + BigInt(d);
      return numericAnswer(rational(n), "integer");
    },
    check: ([a, b, c, d, ops], answer) => {
      const value = readNumeric(answer, "integer");
      if (!value) return false;
      let n = value[0];
      n = ops & 1 ? n + BigInt(d) : n - BigInt(d);
      n = (ops >> 1) & 1 ? n + BigInt(c) : n - BigInt(c);
      n = ops >> 2 ? n + BigInt(b) : n - BigInt(b);
      return n === BigInt(a);
    },
  }),
  family({
    id: "m1-integer-mixed-chain",
    grade: "중1",
    strand: "정수·유리수",
    title: "사칙이 섞인 네 정수의 계산",
    description:
      "곱셈 한 번과 나누어떨어지는 나눗셈 한 번을 덧셈 또는 뺄셈으로 잇습니다. 곱하는 두 수와 나누는 수는 0, 1이 아니며 곱셈·나눗셈부터 계산합니다.",
    labels: ["정수", "사칙 혼합", "계산 순서"],
    rankGroup: "m1-integer-chain",
    domain: mixedChainDomain,
    prompt: ([t, a, b, q, d]) => {
      const product = [
        `${paren(a)} × ${paren(b)}`,
        `${paren(a)} \\times ${paren(b)}`,
      ];
      const quotient = [
        `${paren(q * d)} ÷ ${paren(d)}`,
        `${paren(q * d)} \\div ${paren(d)}`,
      ];
      const [left, right] = t < 2 ? [product, quotient] : [quotient, product];
      const sign = minus(t & 1);
      return math(
        `${left[0]} ${sign} ${right[0]}`,
        `${left[1]} ${sign} ${right[1]}`,
      );
    },
    solve: ([t, a, b, q]) => {
      const product = BigInt(a) * BigInt(b),
        quotient = BigInt(q);
      const n =
        t === 0
          ? product + quotient
          : t === 1
            ? product - quotient
            : t === 2
              ? quotient + product
              : quotient - product;
      return numericAnswer(rational(n), "integer");
    },
    check: ([t, a, b, q], answer) => {
      const value = readNumeric(answer, "integer");
      if (!value) return false;
      const [z] = value,
        Q = BigInt(q);
      // The displayed dividend is q·d, so the quotient is q. Peel it off, then
      // the rest must divide into a × b without running the product.
      const rest = t === 0 ? z - Q : t === 1 ? z + Q : t === 2 ? z - Q : Q - z;
      return rest % BigInt(a) === ZERO && rest / BigInt(a) === BigInt(b);
    },
  }),
  family({
    id: "m1-integer-power-mixed",
    grade: "중1",
    strand: "정수·유리수",
    title: "거듭제곱이 섞인 정수 혼합 계산",
    description:
      "밑 -5~5(0, 1 제외), 지수 2~3의 거듭제곱과 두 정수의 곱을 더하거나 뺍니다. 거듭제곱과 곱셈부터 계산합니다.",
    labels: ["정수", "거듭제곱", "혼합 계산"],
    rankGroup: "m1-numeric-expression",
    domain: powerMixedDomain,
    prompt: ([t, a, e, b, c]) => {
      const power = [powerText(a, e), powerText(a, e, true)];
      const product = [
        `${paren(b)} × ${paren(c)}`,
        `${paren(b)} \\times ${paren(c)}`,
      ];
      const [left, right] = t < 2 ? [power, product] : [product, power];
      const sign = minus(t & 1);
      return math(
        `${left[0]} ${sign} ${right[0]}`,
        `${left[1]} ${sign} ${right[1]}`,
      );
    },
    solve: ([t, a, e, b, c]) => {
      const power = powerOf(a, e),
        product = BigInt(b) * BigInt(c);
      const n =
        t === 0
          ? power + product
          : t === 1
            ? power - product
            : t === 2
              ? product + power
              : product - power;
      return numericAnswer(rational(n), "integer");
    },
    check: ([t, a, e, b, c], answer) => {
      const value = readNumeric(answer, "integer");
      if (!value) return false;
      const [z] = value,
        product = BigInt(b) * BigInt(c);
      // Remove the product; what remains must be the power, checked by division.
      const rest =
        t === 0
          ? z - product
          : t === 1
            ? z + product
            : t === 2
              ? z - product
              : product - z;
      return isPower(rest, a, e);
    },
  }),
  family({
    id: "m1-negative-square",
    grade: "중1",
    strand: "정수·유리수",
    title: "-a²과 (-a)²의 구별",
    description:
      "괄호가 없는 -a²과 괄호로 묶은 (-a)²을 섞어 두 거듭제곱을 더하거나 뺍니다. 밑은 1~5, 지수는 2~3입니다.",
    labels: ["정수", "거듭제곱", "부호"],
    rankGroup: "m1-numeric-expression",
    domain: negativeSquareDomain,
    prompt: ([code, a, e, b, f]) => {
      const left = code & 1 ? powerText(-a, e) : `-${powerText(a, e)}`;
      const leftLatex =
        code & 1 ? powerText(-a, e, true) : `-${powerText(a, e, true)}`;
      const right = code & 2 ? powerText(-b, f) : powerText(b, f);
      const rightLatex =
        code & 2 ? powerText(-b, f, true) : powerText(b, f, true);
      const sign = minus(code >> 2);
      return math(
        `${left} ${sign} ${right}`,
        `${leftLatex} ${sign} ${rightLatex}`,
      );
    },
    solve: ([code, a, e, b, f]) => {
      const left = code & 1 ? powerOf(-a, e) : -powerOf(a, e);
      const right = code & 2 ? powerOf(-b, f) : powerOf(b, f);
      return numericAnswer(
        rational(code >> 2 ? left - right : left + right),
        "integer",
      );
    },
    check: ([code, a, e, b, f], answer) => {
      const value = readNumeric(answer, "integer");
      if (!value) return false;
      const right = code & 2 ? powerOf(-b, f) : powerOf(b, f);
      const left = code >> 2 ? value[0] + right : value[0] - right;
      // -a^e is the negative of a power of a; (-a)^e is a power of -a.
      return code & 1 ? isPower(left, -a, e) : isPower(-left, a, e);
    },
  }),
  family({
    id: "m1-reciprocal",
    grade: "중1",
    strand: "정수·유리수",
    title: "역수",
    description:
      "정수, 기약분수, 소수의 역수를 구합니다. 1과 -1은 제외하고 답은 기약분수 또는 정수로 씁니다.",
    labels: ["유리수", "역수"],
    rankGroup: "m1-rational-notation",
    domain: reciprocalDomain,
    prompt: (p) =>
      math(
        reciprocalDisplay(p, false),
        reciprocalDisplay(p, true),
        "역수를 구하시오.",
      ),
    solve: ([form, n, d]) =>
      numericAnswer(
        divide(rational(1), form === 2 ? decimalValue(n, d) : rational(n, d)),
        "rational",
      ),
    check: ([form, n, d], answer) => {
      const value = readNumeric(answer, "rational");
      if (!value) return false;
      const [z, q] = value;
      const [N, D] =
        form === 2
          ? [BigInt(n), BigInt(10) ** BigInt(d)]
          : [BigInt(n), BigInt(d)];
      // z/q × N/D = 1 without reducing or running the solver.
      return z * N === q * D;
    },
  }),
  family({
    id: "m1-decimal-fraction-mixed",
    grade: "중1",
    strand: "정수·유리수",
    title: "소수와 분수가 섞인 유리수 계산",
    description:
      "소수 하나와 분모 2~6인 기약분수 하나의 사칙계산입니다. 답은 기약분수 또는 정수로 씁니다.",
    labels: ["유리수", "소수", "분수", "사칙 혼합"],
    rankGroup: "m1-rational-notation",
    domain: decimalFractionDomain,
    prompt: ([op, coefficient, scale, n, d, order]) => {
      const symbol = operations[op];
      const decimal = decimalText(coefficient, scale);
      const divisorFraction = op === 3 && order === 0;
      const parts = (latex: boolean) => {
        const left = group(decimal, latex, coefficient < 0);
        const right = group(
          fractionText(rational(n, d), latex),
          latex,
          n < 0 || divisorFraction,
        );
        return order ? [right, left] : [left, right];
      };
      return math(
        parts(false).join(` ${symbol.text} `),
        parts(true).join(` ${symbol.latex} `),
      );
    },
    solve: ([op, coefficient, scale, n, d, order]) => {
      const decimal = decimalValue(coefficient, scale),
        fraction = rational(n, d);
      const [left, right] = order ? [fraction, decimal] : [decimal, fraction];
      return numericAnswer(
        op === 0
          ? add(left, right)
          : op === 1
            ? add(left, negate(right))
            : op === 2
              ? multiply(left, right)
              : divide(left, right),
        "rational",
      );
    },
    check: ([op, coefficient, scale, n, d, order], answer) => {
      const value = readNumeric(answer, "rational");
      if (!value) return false;
      const [z, q] = value;
      const decimal = [BigInt(coefficient), BigInt(10) ** BigInt(scale)];
      const fraction = [BigInt(n), BigInt(d)];
      const [[A, B], [C, D]] = order
        ? [fraction, decimal]
        : [decimal, fraction];
      // Cross-multiplied inverse identities, as in the integer·fraction families.
      if (op === 0) return z * B * D - A * q * D === C * q * B;
      if (op === 1) return z * B * D + C * q * B === A * q * D;
      if (op === 2) return z * B * D === A * C * q;
      return z * B * C === A * D * q;
    },
  }),
];

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
  ...expansion,
];
