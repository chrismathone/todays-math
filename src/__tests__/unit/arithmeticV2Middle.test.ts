import { describe, expect, it, vi } from "vitest";
import katex from "katex";
import { MIDDLE_ARITHMETIC_DEFINITIONS as definitions } from "@/lib/arithmetic-v2/families/middle";
import type {
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
} from "@/lib/arithmetic-v2/types";

// Independent small-integer oracles. All intermediates in these bounded domains
// are exact safe integers. They import no production arithmetic/normal-form helpers.
type Q = [number, number];
type Term = [number, number, number];
function reduce(n: number, d = 1): Q {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  let divisor = Math.min(Math.abs(n), d);
  if (n === 0) return [0, 1];
  while (n % divisor !== 0 || d % divisor !== 0) divisor--;
  return [n / divisor, d / divisor];
}
function square(n: number): Q {
  if (!n) return [0, 1];
  // Search downward for the greatest square divisor (not prime extraction).
  for (let outside = n; outside >= 1; outside--)
    if (n % (outside * outside) === 0)
      return [outside, n / (outside * outside)];
  throw new Error("unreachable");
}
function terms(items: Term[]): string[] {
  return items
    .filter(([, n]) => n !== 0)
    .sort((a, b) => b[0] - a[0])
    .flatMap(([e, n, d]) => [String(e), ...reduce(n, d).map(String)]);
}
// ---- 2026-10-16 중1 expansion (track D): nine ids with their own shapes.
// Each helper is keyed by id and mirrors the published description, not the
// family code: the "expected" value is recomputed from the parameters here.
const EXPANSION_IDS = [
  "m1-integer-add-chain",
  "m1-integer-add-chain-four",
  "m1-integer-mixed-chain",
  "m1-integer-power-mixed",
  "m1-negative-square",
  "m1-reciprocal",
  "m1-decimal-fraction-mixed",
  "m1-linear-distribute-combine",
  "m1-linear-fraction-combine",
] as const;
const isExpansion = (id: string) =>
  (EXPANSION_IDS as readonly string[]).includes(id);
/** Decimals the reciprocal / mixed drills may show, as [coefficient, scale]. */
const DECIMAL_MAGNITUDES: readonly [number, number][] = [
  [1, 1],
  [2, 1],
  [3, 1],
  [4, 1],
  [5, 1],
  [6, 1],
  [7, 1],
  [8, 1],
  [9, 1],
  [25, 2],
  [75, 2],
  [12, 1],
  [15, 1],
  [25, 1],
];
const isDecimalInput = (c: number, s: number) =>
  DECIMAL_MAGNITUDES.some(([m, scale]) => Math.abs(c) === m && s === scale) &&
  c !== 0;
const powerValue = (base: number, exponent: number) => {
  let value = 1;
  for (let i = 0; i < exponent; i++) value *= base;
  return value;
};
function expansionOracle(id: string, p: number[]): string[] {
  const [a, b, c, d, e] = p;
  if (id === "m1-integer-add-chain") {
    const ops = d;
    const first = ops & 2 ? a - b : a + b;
    return [String(ops & 1 ? first - c : first + c)];
  }
  if (id === "m1-integer-add-chain-four") {
    const ops = e;
    let n = a;
    n += ops & 4 ? -b : b;
    n += ops & 2 ? -c : c;
    n += ops & 1 ? -d : d;
    return [String(n)];
  }
  if (id === "m1-integer-mixed-chain") {
    const [t, x, y, q] = p;
    const product = x * y;
    return [
      String(
        t === 0
          ? product + q
          : t === 1
            ? product - q
            : t === 2
              ? q + product
              : q - product,
      ),
    ];
  }
  if (id === "m1-integer-power-mixed") {
    const [t, base, exponent, x, y] = p;
    const power = powerValue(base, exponent),
      product = x * y;
    return [
      String(
        t === 0
          ? power + product
          : t === 1
            ? power - product
            : t === 2
              ? product + power
              : product - power,
      ),
    ];
  }
  if (id === "m1-negative-square") {
    const [code, base, exponent, other, otherExponent] = p;
    const left =
      code & 1 ? powerValue(-base, exponent) : -powerValue(base, exponent);
    const right =
      code & 2
        ? powerValue(-other, otherExponent)
        : powerValue(other, otherExponent);
    return [String(code & 4 ? left - right : left + right)];
  }
  if (id === "m1-reciprocal") {
    const [form, n, k] = p;
    if (form === 0) return reduce(1, n).map(String);
    if (form === 1) return reduce(k, n).map(String);
    return reduce(10 ** k, n).map(String);
  }
  if (id === "m1-decimal-fraction-mixed") {
    const [op, coefficient, scale, n, den, order] = p;
    const decimal: Q = [coefficient, 10 ** scale],
      fraction: Q = [n, den];
    const [[ln, ld], [rn, rd]] = order
      ? [fraction, decimal]
      : [decimal, fraction];
    return (
      op === 0
        ? reduce(ln * rd + rn * ld, ld * rd)
        : op === 1
          ? reduce(ln * rd - rn * ld, ld * rd)
          : op === 2
            ? reduce(ln * rn, ld * rd)
            : reduce(ln * rd, ld * rn)
    ).map(String);
  }
  if (id === "m1-linear-distribute-combine") {
    const [k, x, y, m, u, v] = p;
    return terms([
      [1, k * x + m * u, 1],
      [0, k * y + m * v, 1],
    ]);
  }
  // m1-linear-fraction-combine: (ax+b)/p ± (cx+d)/|q| with the sign in q.
  const [x, y, pDen, u, v, q] = p;
  const sign = q < 0 ? -1 : 1,
    qAbs = Math.abs(q);
  return terms([
    [1, x * qAbs + sign * u * pDen, pDen * qAbs],
    [0, y * qAbs + sign * v * pDen, pDen * qAbs],
  ]);
}
function expansionMember(id: string, p: number[]): boolean {
  const within = (n: number, limit: number) =>
    Number.isInteger(n) && n !== 0 && Math.abs(n) <= limit;
  const factor = (n: number) => within(n, 6) && n !== 1;
  const [a, b, c, d, e, f] = p;
  if (id === "m1-integer-add-chain")
    return (
      p.length === 4 && [a, b, c].every((n) => within(n, 9)) && d >= 0 && d <= 3
    );
  if (id === "m1-integer-add-chain-four")
    return (
      p.length === 5 &&
      [a, b, c, d].every((n) => within(n, 5)) &&
      e >= 0 &&
      e <= 7
    );
  if (id === "m1-integer-mixed-chain")
    return (
      p.length === 5 &&
      a >= 0 &&
      a <= 3 &&
      factor(b) &&
      factor(c) &&
      within(d, 6) &&
      factor(e)
    );
  if (id === "m1-integer-power-mixed")
    return (
      p.length === 5 &&
      a >= 0 &&
      a <= 3 &&
      within(b, 5) &&
      b !== 1 &&
      (c === 2 || c === 3) &&
      factor(d) &&
      factor(e)
    );
  if (id === "m1-negative-square")
    return (
      p.length === 5 &&
      a >= 0 &&
      a <= 7 &&
      b >= 1 &&
      b <= 5 &&
      (c === 2 || c === 3) &&
      d >= 1 &&
      d <= 5 &&
      (e === 2 || e === 3)
    );
  if (id === "m1-reciprocal") {
    if (p.length !== 3) return false;
    if (a === 0) return within(b, 12) && Math.abs(b) !== 1 && c === 1;
    if (a === 1)
      return within(b, 9) && c >= 2 && c <= 9 && reduce(b, c)[1] === c;
    return a === 2 && isDecimalInput(b, c);
  }
  if (id === "m1-decimal-fraction-mixed")
    return (
      p.length === 6 &&
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 0],
        [3, 0],
        [3, 1],
      ].some(([op, order]) => op === a && order === f) &&
      isDecimalInput(b, c) &&
      within(d, 6) &&
      e >= 2 &&
      e <= 6 &&
      reduce(d, e)[1] === e
    );
  if (id === "m1-linear-distribute-combine")
    return (
      p.length === 6 &&
      within(a, 4) &&
      within(d, 4) &&
      !(a === 1 && Math.abs(d) === 1) &&
      within(b, 3) &&
      within(e, 3) &&
      within(c, 5) &&
      within(f, 5) &&
      !(b === e && c === f)
    );
  return (
    p.length === 6 &&
    within(a, 3) &&
    within(d, 3) &&
    within(b, 5) &&
    within(e, 5) &&
    c >= 2 &&
    c <= 6 &&
    Math.abs(f) >= 2 &&
    Math.abs(f) <= 6 &&
    !(a === d && b === e && c === Math.abs(f))
  );
}
/** Read the displayed expression back into parameters, token by token. */
function readExpansionPrompt(id: string, text: string): number[] {
  const int = (s: string) => {
    const m = /^\(?(-?\d+)\)?$/.exec(s);
    if (!m) throw new Error(`bad integer token: ${s}`);
    if (s.startsWith("(") !== s.startsWith("(-"))
      throw new Error(`stray parentheses: ${s}`);
    return Number(m[1]);
  };
  const signBit = (s: string) => (s === "-" ? 1 : 0);
  const linear = (s: string): [number, number] => {
    const m = /^(-?\d*)x ([+-]) (\d+)$/.exec(s);
    if (!m) throw new Error(`bad linear expression: ${s}`);
    const slope = m[1] === "" ? 1 : m[1] === "-" ? -1 : Number(m[1]);
    return [slope, (m[2] === "-" ? -1 : 1) * Number(m[3])];
  };
  const power = (s: string): [number, number, number] => {
    // Returns [parenthesized?, base magnitude, exponent] for "-3^2" | "(-3)^2" | "3^2".
    const m = /^(-?)(\(-\d+\)|\d+)\^(\d)$/.exec(s);
    if (!m) throw new Error(`bad power token: ${s}`);
    if (m[1] === "-" && m[2].startsWith("("))
      throw new Error(`double sign: ${s}`);
    const base = int(m[2]);
    return [
      m[2].startsWith("(") ? 1 : 0,
      m[1] === "-" ? -base : base,
      Number(m[3]),
    ];
  };
  const token = "(?:\\(-\\d+\\)|\\d+)";
  let m: RegExpExecArray | null;
  if (id === "m1-integer-add-chain") {
    m = new RegExp(`^(${token}) ([+-]) (${token}) ([+-]) (${token})$`).exec(
      text,
    );
    if (!m) throw new Error(`bad chain: ${text}`);
    return [int(m[1]), int(m[3]), int(m[5]), signBit(m[2]) * 2 + signBit(m[4])];
  }
  if (id === "m1-integer-add-chain-four") {
    m = new RegExp(
      `^(${token}) ([+-]) (${token}) ([+-]) (${token}) ([+-]) (${token})$`,
    ).exec(text);
    if (!m) throw new Error(`bad chain: ${text}`);
    return [
      int(m[1]),
      int(m[3]),
      int(m[5]),
      int(m[7]),
      signBit(m[2]) * 4 + signBit(m[4]) * 2 + signBit(m[6]),
    ];
  }
  if (id === "m1-integer-mixed-chain") {
    m = new RegExp(
      `^(${token}) × (${token}) ([+-]) (${token}) ÷ (${token})$`,
    ).exec(text);
    if (m) {
      const divisor = int(m[5]),
        dividend = int(m[4]);
      if (dividend % divisor !== 0) throw new Error("inexact division shown");
      return [signBit(m[3]), int(m[1]), int(m[2]), dividend / divisor, divisor];
    }
    m = new RegExp(
      `^(${token}) ÷ (${token}) ([+-]) (${token}) × (${token})$`,
    ).exec(text);
    if (!m) throw new Error(`bad mixed chain: ${text}`);
    const divisor = int(m[2]),
      dividend = int(m[1]);
    if (dividend % divisor !== 0) throw new Error("inexact division shown");
    return [
      2 + signBit(m[3]),
      int(m[4]),
      int(m[5]),
      dividend / divisor,
      divisor,
    ];
  }
  if (id === "m1-integer-power-mixed") {
    const powerToken = `(?:\\(-\\d+\\)|\\d+)\\^\\d`;
    m = new RegExp(`^(${powerToken}) ([+-]) (${token}) × (${token})$`).exec(
      text,
    );
    if (m) {
      const [, base, exponent] = power(m[1]);
      return [signBit(m[2]), base, exponent, int(m[3]), int(m[4])];
    }
    m = new RegExp(`^(${token}) × (${token}) ([+-]) (${powerToken})$`).exec(
      text,
    );
    if (!m) throw new Error(`bad power chain: ${text}`);
    const [, base, exponent] = power(m[4]);
    return [2 + signBit(m[3]), base, exponent, int(m[1]), int(m[2])];
  }
  if (id === "m1-negative-square") {
    m = /^(-?(?:\(-\d+\)|\d+)\^\d) ([+-]) ((?:\(-\d+\)|\d+)\^\d)$/.exec(text);
    if (!m) throw new Error(`bad negative square: ${text}`);
    const [leftParen, leftBase, leftExponent] = power(m[1]);
    const [rightParen, rightBase, rightExponent] = power(m[3]);
    // Left is "-a^e" (bit 0 clear) or "(-a)^e" (bit 0 set); right is "b^f" or "(-b)^f".
    if (leftBase >= 0)
      throw new Error(`left term is not negative-based: ${text}`);
    if (rightParen ? rightBase >= 0 : rightBase <= 0)
      throw new Error(`right term sign/parentheses disagree: ${text}`);
    return [
      leftParen + rightParen * 2 + signBit(m[2]) * 4,
      Math.abs(leftBase),
      leftExponent,
      Math.abs(rightBase),
      rightExponent,
    ];
  }
  const readDecimal = (s: string): [number, number] => {
    const match = /^(-?)(\d+)\.(\d+)$/.exec(s);
    if (!match) throw new Error(`bad decimal: ${s}`);
    const coefficient = Number(match[2] + match[3]) * (match[1] ? -1 : 1);
    return [coefficient, match[3].length];
  };
  if (id === "m1-reciprocal") {
    if (text.includes("/")) {
      m = /^(-?\d+)\/(\d+)$/.exec(text);
      if (!m) throw new Error(`bad fraction: ${text}`);
      return [1, Number(m[1]), Number(m[2])];
    }
    if (text.includes(".")) return [2, ...readDecimal(text)];
    return [0, int(text), 1];
  }
  if (id === "m1-decimal-fraction-mixed") {
    m = /^(\S+) ([+\-×÷]) (\S+)$/.exec(text);
    if (!m) throw new Error(`bad mixed prompt: ${text}`);
    const op = ["+", "-", "×", "÷"].indexOf(m[2]);
    const strip = (s: string) =>
      s.startsWith("(") && s.endsWith(")") ? s.slice(1, -1) : s;
    const operands = [m[1], m[3]];
    const order = operands[0].includes(".") ? 0 : 1;
    const decimalText = strip(operands[order]),
      fractionText = strip(operands[1 - order]);
    // Negative operands and a fraction divisor are the only parenthesized ones.
    if ((operands[order] !== decimalText) !== decimalText.startsWith("-"))
      throw new Error(`decimal grouping: ${text}`);
    const fm = /^(-?\d+)\/(\d+)$/.exec(fractionText);
    if (!fm) throw new Error(`bad fraction operand: ${text}`);
    const grouped = operands[1 - order] !== fractionText;
    if (grouped !== (fm[1].startsWith("-") || (op === 3 && order === 0)))
      throw new Error(`fraction grouping: ${text}`);
    return [
      op,
      ...readDecimal(decimalText),
      Number(fm[1]),
      Number(fm[2]),
      order,
    ];
  }
  if (id === "m1-linear-distribute-combine") {
    m = /^(-?\d*)\((.+?)\) ([+-]) (\d*)\((.+?)\)$/.exec(text);
    if (!m) throw new Error(`bad distribution: ${text}`);
    const k = m[1] === "" ? 1 : m[1] === "-" ? -1 : Number(m[1]);
    const mm = (m[4] === "" ? 1 : Number(m[4])) * (m[3] === "-" ? -1 : 1);
    return [k, ...linear(m[2]), mm, ...linear(m[5])];
  }
  m = /^\((.+?)\)\/(\d+) ([+-]) \((.+?)\)\/(\d+)$/.exec(text);
  if (!m) throw new Error(`bad fraction-form sum: ${text}`);
  return [
    ...linear(m[1]),
    Number(m[2]),
    ...linear(m[4]),
    Number(m[5]) * (m[3] === "-" ? -1 : 1),
  ];
}

function oracle(id: string, p: number[]): string[] {
  const [a, b, c, d, e, f] = p;
  const op = id.split("-").at(-1);
  if (isExpansion(id)) return expansionOracle(id, p);
  if (id === "m1-integer-power") return [String(a ** b)];
  if (id === "m1-numeric-expression") return [String((a + b) * c)];
  if (id.startsWith("m1-integer-"))
    return [
      String(
        op === "add"
          ? a + b
          : op === "subtract"
            ? a - b
            : op === "multiply"
              ? a * b
              : a / b,
      ),
    ];
  if (id.startsWith("m1-rational-"))
    return (
      op === "add"
        ? reduce(a * d + c * b, b * d)
        : op === "subtract"
          ? reduce(a * d - c * b, b * d)
          : op === "multiply"
            ? reduce(a * c, b * d)
            : reduce(a * d, b * c)
    ).map(String);
  if (id === "m1-like-terms") return terms([[1, a + b, 1]]);
  if (id.startsWith("m1-linear-"))
    return terms([
      [1, a + (op === "add" ? c : -c), 1],
      [0, b + (op === "add" ? d : -d), 1],
    ]);
  if (id === "m2-monomial-multiply") return terms([[b + d, a * c, 1]]);
  if (id === "m2-monomial-divide") return terms([[b - d, a, c]]);
  if (id === "m2-polynomial-add" || id === "m2-polynomial-subtract") {
    const sign = op === "add" ? 1 : -1;
    return terms([
      [2, a + sign * d, 1],
      [1, b + sign * e, 1],
      [0, c + sign * f, 1],
    ]);
  }
  if (id === "m2-polynomial-monomial-multiply")
    return terms([
      [e + 2, a * d, 1],
      [e + 1, b * d, 1],
      [e, c * d, 1],
    ]);
  if (id === "m2-polynomial-monomial-divide")
    return terms([
      [2, a, d],
      [1, b, d],
      [0, c, d],
    ]);
  if (id === "m3-polynomial-multiply")
    return terms([
      [2, a * c, 1],
      [1, a * d + b * c, 1],
      [0, b * d, 1],
    ]);
  let coefficient: Q, radicand: number;
  if (op === "simplify") {
    const [s, r] = square(a);
    coefficient = [s, 1];
    radicand = r;
  } else if (op === "rationalize") {
    coefficient = reduce(a, b * c);
    radicand = c;
  } else if (op === "add" || op === "subtract") {
    const [s, r] = square(b),
      [t, other] = square(d);
    if (r !== other) throw new Error("unlike radical input");
    coefficient = [a * s + (op === "add" ? c : -c) * t, 1];
    radicand = r;
  } else {
    const [s, r] = square(b * d);
    coefficient = op === "multiply" ? reduce(a * c * s) : reduce(a * s, c * d);
    radicand = r;
  }
  return coefficient[0] === 0
    ? []
    : [String(radicand), ...coefficient.map(String)];
}

function fraction([n, d]: Q, latex: boolean): string {
  if (d === 1) return String(n);
  return latex
    ? `${n < 0 ? "-" : ""}\\frac{${Math.abs(n)}}{${d}}`
    : `${n}/${d}`;
}
function display(
  kind: ArithmeticV2Answer["kind"],
  exact: string[],
  latex: boolean,
): string {
  const p = exact.map(Number);
  if (kind === "integer") return exact[0];
  if (kind === "rational") return fraction([p[0], p[1]], latex);
  if (!p.length) return "0";
  if (kind === "surd") {
    const [r, n, d] = p;
    if (r === 1) return fraction([n, d], latex);
    const numerator = `${Math.abs(n) === 1 ? "" : Math.abs(n)}${latex ? `\\sqrt{${r}}` : `√${r}`}`;
    return `${n < 0 ? "-" : ""}${d === 1 ? numerator : latex ? `\\frac{${numerator}}{${d}}` : `${numerator}/${d}`}`;
  }
  let text = "";
  for (let i = 0; i < p.length; i += 3) {
    const [degree, n, d] = p.slice(i, i + 3);
    let magnitude = fraction([Math.abs(n), d], latex);
    if (degree && Math.abs(n) === d) magnitude = "";
    else if (degree && d !== 1 && !latex) magnitude = `(${magnitude})`;
    const power =
      degree === 0
        ? ""
        : degree === 1
          ? "x"
          : latex
            ? `x^{${degree}}`
            : `x^${degree}`;
    text += `${text ? (n < 0 ? " - " : " + ") : n < 0 ? "-" : ""}${magnitude}${power}`;
  }
  return text;
}
function replaceExact(
  candidate: ArithmeticV2Candidate,
  exact: string[],
): ArithmeticV2Candidate {
  return {
    ...candidate,
    answer: {
      ...candidate.answer,
      exact,
      text: display(candidate.answer.kind, exact, false),
      latex: display(candidate.answer.kind, exact, true),
    },
  };
}

const countById: Record<string, number> = {
  "m1-integer-add": 41 ** 2,
  "m1-integer-subtract": 41 ** 2,
  "m1-integer-multiply": 25 ** 2,
  "m1-integer-divide": 20 * 21,
  "m1-rational-add": 158 ** 2,
  "m1-rational-subtract": 158 ** 2,
  "m1-rational-multiply": 158 ** 2,
  "m1-rational-divide": 158 ** 2,
  "m1-integer-power": 16 * 3,
  "m1-numeric-expression": 25 ** 2 * 12,
  "m1-like-terms": 18 ** 2,
  "m1-linear-add": 10 ** 2 * 11 ** 2,
  "m1-linear-subtract": 10 ** 2 * 11 ** 2,
  "m2-monomial-multiply": 18 ** 2 * 3 ** 2,
  "m2-monomial-divide": 18 ** 2 * 4 * 3,
  "m2-polynomial-add": 6 ** 2 * 7 ** 4,
  "m2-polynomial-subtract": 6 ** 2 * 7 ** 4,
  "m2-polynomial-monomial-multiply": 6 * 7 ** 2 * 10 * 2,
  "m2-polynomial-monomial-divide": 6 * 7 ** 2 * 10 * 2,
  "m3-polynomial-multiply": 10 ** 2 * 11 ** 2,
  "m3-radical-simplify": 201,
  "m3-radical-add": 6 ** 2 * 4 ** 2 * 7,
  "m3-radical-subtract": 6 ** 2 * 4 ** 2 * 7,
  "m3-radical-multiply": 8 ** 2 * 29 ** 2,
  "m3-radical-divide": 8 ** 2 * 29 ** 2,
  "m3-radical-rationalize": 12 * 6 * 8,
  // 2026-10-16 track D. Sizes are products of the axes in each description.
  "m1-integer-add-chain": 18 ** 3 * 4,
  "m1-integer-add-chain-four": 10 ** 4 * 8,
  "m1-integer-mixed-chain": 4 * 11 * 11 * 12 * 11,
  "m1-integer-power-mixed": 4 * 9 * 2 * 11 * 11,
  "m1-negative-square": 8 * 5 * 2 * 5 * 2,
  // 22 integers (±2..±12) + 92 reduced fractions (|n| ≤ 9, d 2..9) + 28 decimals.
  "m1-reciprocal": 22 + 92 + 28,
  // 6 operation/order shapes × 28 decimals × 34 reduced fractions (|n| ≤ 6, d 2..6).
  "m1-decimal-fraction-mixed": 6 * 28 * 34,
  // 62 scalar pairs (8² minus k = 1 with |m| = 1) × 60 × 59 ordered distinct brackets.
  "m1-linear-distribute-combine": 62 * 60 * 59,
  // 300 (ax+b)/p triples, ordered distinct pairs, two operators.
  "m1-linear-fraction-combine": 300 * 299 * 2,
};
function member(id: string, p: number[]): boolean {
  const within = (n: number, limit: number, nonzero = false) =>
    Math.abs(n) <= limit && (!nonzero || n !== 0);
  const [a, b, c, d, e, f] = p;
  if (isExpansion(id)) return expansionMember(id, p);
  if (id === "m1-integer-divide")
    return (
      p.length === 2 && within(b, 10, true) && a % b === 0 && within(a / b, 10)
    );
  if (id === "m1-integer-power")
    return p.length === 2 && within(a, 8, true) && b >= 2 && b <= 4;
  if (id === "m1-numeric-expression")
    return (
      p.length === 3 && within(a, 12) && within(b, 12) && within(c, 6, true)
    );
  if (id.startsWith("m1-integer-"))
    return (
      p.length === 2 &&
      p.every((n) => within(n, id.endsWith("multiply") ? 12 : 20))
    );
  if (id.startsWith("m1-rational-"))
    return (
      p.length === 4 &&
      [0, 2].every(
        (i) =>
          within(p[i], 12, true) &&
          p[i + 1] >= 2 &&
          p[i + 1] <= 12 &&
          reduce(p[i], p[i + 1])[1] === p[i + 1],
      )
    );
  if (id === "m1-like-terms")
    return p.length === 2 && p.every((n) => within(n, 9, true));
  if (id.startsWith("m1-linear-") || id === "m3-polynomial-multiply")
    return (
      p.length === 4 &&
      within(a, 5, true) &&
      within(b, 5) &&
      within(c, 5, true) &&
      within(d, 5)
    );
  if (id.startsWith("m2-monomial-"))
    return (
      p.length === 4 &&
      within(a, 9, true) &&
      within(c, 9, true) &&
      d >= 1 &&
      d <= 3 &&
      (id.endsWith("multiply") ? b >= 1 && b <= 3 : b - d >= 0 && b - d <= 3)
    );
  if (id.startsWith("m2-polynomial-monomial-"))
    return (
      p.length === 5 &&
      within(a, 3, true) &&
      within(b, 3) &&
      within(c, 3) &&
      within(d, 5, true) &&
      e >= 1 &&
      e <= 2
    );
  if (id.startsWith("m2-polynomial-"))
    return (
      p.length === 6 &&
      within(a, 3, true) &&
      within(d, 3, true) &&
      [b, c, e, f].every((n) => within(n, 3))
    );
  if (id.endsWith("simplify")) return p.length === 1 && a >= 0 && a <= 200;
  if (id.endsWith("rationalize"))
    return (
      p.length === 3 &&
      within(a, 6, true) &&
      b >= 1 &&
      b <= 6 &&
      [2, 3, 5, 6, 7, 10, 11, 13].includes(c)
    );
  if (id.endsWith("add") || id.endsWith("subtract")) {
    const [s, r] = square(b),
      [t, r2] = square(d);
    return (
      p.length === 4 &&
      within(a, 3, true) &&
      within(c, 3, true) &&
      s >= 1 &&
      s <= 4 &&
      t >= 1 &&
      t <= 4 &&
      r === r2 &&
      [2, 3, 5, 6, 7, 10, 11].includes(r)
    );
  }
  return (
    p.length === 4 &&
    within(a, 4, true) &&
    within(c, 4, true) &&
    b >= 2 &&
    b <= 30 &&
    d >= 2 &&
    d <= 30
  );
}

// Parse the actual displayed polynomial operands, independently of the renderer.
function parseIntegerPolynomial(text: string): number[] {
  const result: number[] = [];
  for (const term of text.replaceAll(" ", "").match(/[+-]?[^+-]+/g) ?? []) {
    const match = /^([+-]?)(\d*)(x(?:\^(\d+))?)?$/.exec(term);
    if (!match) throw new Error(`Bad term: ${term}`);
    const degree = match[3] ? Number(match[4] ?? 1) : 0;
    result[degree] = (match[1] === "-" ? -1 : 1) * Number(match[2] || 1);
  }
  return Array.from({ length: result.length }, (_, i) => result[i] ?? 0);
}
function promptOperands(id: string, p: number[]): number[][] {
  const [a, b, c, d, e, f] = p;
  const mono = (n: number, degree: number) => [
    ...new Array<number>(degree).fill(0),
    n,
  ];
  if (id === "m1-like-terms") return [mono(a, 1), mono(b, 1)];
  if (id.startsWith("m1-linear-") || id === "m3-polynomial-multiply")
    return [
      [b, a],
      [d, c],
    ];
  if (id.startsWith("m2-monomial-")) return [mono(a, b), mono(c, d)];
  if (id.startsWith("m2-polynomial-monomial-"))
    return [
      id.endsWith("divide")
        ? [...new Array<number>(e).fill(0), c, b, a]
        : [c, b, a],
      mono(d, e),
    ];
  return [
    [c, b, a],
    [f, e, d],
  ];
}
function assertPrompt(id: string, candidate: ArithmeticV2Candidate): void {
  if (candidate.prompt.layout !== "math") throw new Error("unexpected layout");
  const decodedLatex = candidate.prompt.latex
    .replace(/\\left|\\right/g, "")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\sqrt\{(\d+)\}/g, "√$1")
    .replace(/\^\{(\d+)\}/g, "^$1")
    .replace(/\\frac\{(-?\d+)\}\{(\d+)\}/g, "$1/$2")
    .replace(/\\frac\{(-?\d+)\}\{([^}]+)\}/g, "$1/($2)")
    // Fraction-form linear expressions: \frac{2x - 3}{4} is shown as (2x - 3)/4.
    .replace(/\\frac\{([^{}]+)\}\{(\d+)\}/g, "($1)/$2");
  if (decodedLatex !== candidate.prompt.text)
    throw new Error("text/latex disagreement");
  if (isExpansion(id)) {
    const actual = readExpansionPrompt(id, candidate.prompt.text);
    if (JSON.stringify(actual) !== JSON.stringify(candidate.parameters))
      throw new Error(
        `${id} prompt/parameter mismatch: ${candidate.prompt.text} → ${actual} vs ${candidate.parameters}`,
      );
    return;
  }
  const operation = id.split("-").at(-1)!;
  const symbol = (
    {
      add: "+",
      subtract: "-",
      multiply: "×",
      divide: "÷",
      terms: "+",
    } as Record<string, string>
  )[operation];
  if (symbol && !candidate.prompt.text.includes(` ${symbol} `))
    throw new Error("wrong displayed operation");
  if (candidate.answer.kind === "polynomial") {
    const parts = /^\((.*)\) ([+×÷-]) \((.*)\)$/.exec(candidate.prompt.text);
    if (!parts) throw new Error("bad polynomial prompt");
    const actual = [
      parseIntegerPolynomial(parts[1]),
      parseIntegerPolynomial(parts[3]),
    ];
    if (
      JSON.stringify(actual) !==
      JSON.stringify(promptOperands(id, candidate.parameters))
    )
      throw new Error("prompt/parameter mismatch");
  } else if (id.startsWith("m3-radical-")) {
    const parseRadical = (text: string): number[] => {
      const match = /^(-?\d*)√(\d+)$/.exec(text);
      if (!match) throw new Error("bad radical operand");
      return [
        match[1] === "" ? 1 : match[1] === "-" ? -1 : Number(match[1]),
        Number(match[2]),
      ];
    };
    let actual: number[];
    if (operation === "simplify")
      actual = [parseRadical(candidate.prompt.text)[1]];
    else if (operation === "rationalize") {
      const match = /^(-?\d+)\/\((.*)\)$/.exec(candidate.prompt.text);
      if (!match) throw new Error("bad rationalization prompt");
      actual = [Number(match[1]), ...parseRadical(match[2])];
    } else {
      const match = /^\((.*)\) [+×÷-] \((.*)\)$/.exec(candidate.prompt.text);
      if (!match) throw new Error("bad radical operation");
      actual = [...parseRadical(match[1]), ...parseRadical(match[2])];
    }
    if (JSON.stringify(actual) !== JSON.stringify(candidate.parameters))
      throw new Error("radical prompt/parameter mismatch");
  } else {
    const actual = candidate.prompt.text.match(/-?\d+/g)?.map(Number);
    if (JSON.stringify(actual) !== JSON.stringify(candidate.parameters))
      throw new Error("numeric prompt/parameter mismatch");
  }
}

describe("middle arithmetic v2 finite exact families", () => {
  it("publishes exactly the scoped IDs, grades and explicit peer groups", () => {
    expect(definitions.map((d) => d.id).sort()).toEqual(
      Object.keys(countById).sort(),
    );
    // 중1: 13 original + 9 (2026-10-16 track D).
    expect(definitions.filter((d) => d.grade === "중1")).toHaveLength(22);
    expect(definitions.filter((d) => d.grade === "중2")).toHaveLength(6);
    expect(definitions.filter((d) => d.grade === "중3")).toHaveLength(7);
    expect(new Set(definitions.map((d) => d.rankGroup))).toEqual(
      new Set([
        "m1-integer-four-ops",
        "m1-rational-four-ops",
        "m1-numeric-expression",
        "m1-linear-expression",
        "m2-monomial",
        "m2-polynomial",
        "m3-polynomial-multiply",
        "m3-radical",
        "m1-integer-chain",
        "m1-rational-notation",
      ]),
    );
    for (const id of EXPANSION_IDS)
      expect(definitions.find((d) => d.id === id)?.grade).toBe("중1");
    let rationalInputs = 0;
    for (let n = -12; n <= 12; n++)
      for (let d = 2; d <= 12; d++)
        if (n && reduce(n, d)[1] === d) rationalInputs++;
    expect(rationalInputs).toBe(158);
  });

  for (const definition of definitions) {
    it(`${definition.id}: exhausts its exact unique domain with independent oracle and membership`, () => {
      expect(definition.domainSize).toBe(countById[definition.id]);
      const parameters = new Set<string>(),
        prompts = new Set<string>(),
        latexPrompts = new Set<string>();
      for (let index = 0; index < definition.domainSize; index++) {
        const candidate = definition.problemAt(index);
        const key = candidate.parameters.join(",");
        if (parameters.has(key))
          throw new Error(`${definition.id}[${index}] duplicate parameters`);
        parameters.add(key);
        if (candidate.prompt.layout !== "math")
          throw new Error("unexpected layout");
        if (
          prompts.has(candidate.prompt.text) ||
          latexPrompts.has(candidate.prompt.latex)
        )
          throw new Error(
            `${definition.id}[${index}] duplicate displayed prompt`,
          );
        prompts.add(candidate.prompt.text);
        latexPrompts.add(candidate.prompt.latex);
        if (!member(definition.id, candidate.parameters))
          throw new Error(
            `${definition.id}[${index}] outside independent domain`,
          );
        const expected = oracle(definition.id, candidate.parameters);
        if (JSON.stringify(candidate.answer.exact) !== JSON.stringify(expected))
          throw new Error(`${definition.id}[${index}] exact oracle mismatch`);
        if (
          candidate.answer.text !==
            display(candidate.answer.kind, expected, false) ||
          candidate.answer.latex !==
            display(candidate.answer.kind, expected, true)
        )
          throw new Error(`${definition.id}[${index}] answer display mismatch`);
        if (!definition.verify(candidate))
          throw new Error(`${definition.id}[${index}] verification failed`);
        assertPrompt(definition.id, candidate);
      }
      expect(parameters.size).toBe(definition.domainSize);
    }, 120000);

    it(`${definition.id}: deterministic boundaries, prompt/answer tampering, generator-independent verifier`, () => {
      for (const bad of [
        -1,
        definition.domainSize,
        definition.domainSize + 1,
        0.5,
        NaN,
        Infinity,
        -Infinity,
        Number.MAX_SAFE_INTEGER,
        "0",
        null,
        undefined,
      ])
        expect(() => definition.problemAt(bad as number)).toThrow(RangeError);
      for (const index of [
        0,
        1,
        Math.floor(definition.domainSize / 2),
        definition.domainSize - 1,
      ]) {
        const candidate = definition.problemAt(index);
        expect(definition.problemAt(index)).toEqual(candidate);
        expect(definition.verify(JSON.parse(JSON.stringify(candidate)))).toBe(
          true,
        );
        if (candidate.prompt.layout !== "math")
          throw new Error("unexpected layout");
        for (const field of ["text", "latex", "instruction"] as const)
          expect(
            definition.verify({
              ...candidate,
              prompt: {
                ...candidate.prompt,
                [field]: `${candidate.prompt[field]} changed`,
              },
            }),
          ).toBe(false);
        for (const field of ["text", "latex"] as const)
          expect(
            definition.verify({
              ...candidate,
              answer: {
                ...candidate.answer,
                [field]: `${candidate.answer[field]} changed`,
              },
            }),
          ).toBe(false);
        for (const bad of [NaN, Infinity, 0.5, -0, 999999])
          expect(
            definition.verify({
              ...candidate,
              parameters: [bad, ...candidate.parameters.slice(1)],
            }),
          ).toBe(false);
        expect(
          definition.verify({
            ...candidate,
            parameters: [...candidate.parameters, 1],
          }),
        ).toBe(false);
        expect(
          definition.verify({
            ...candidate,
            parameters: definition.problemAt(
              (index + 1) % definition.domainSize,
            ).parameters,
          }),
        ).toBe(false);
        expect(
          definition.verify({
            ...candidate,
            answer: { ...candidate.answer, kind: "decimal" },
          }),
        ).toBe(false);
        const wrong = [...candidate.answer.exact];
        const position =
          candidate.answer.kind === "surd" ||
          candidate.answer.kind === "polynomial"
            ? 1
            : 0;
        if (wrong.length) wrong[position] = String(Number(wrong[position]) + 1);
        else wrong.push("1", "1", "1");
        expect(definition.verify(replaceExact(candidate, wrong))).toBe(false);
        const promptLatex = candidate.prompt.latex;
        expect(() =>
          katex.renderToString(promptLatex, {
            throwOnError: true,
            strict: "error",
          }),
        ).not.toThrow();
        expect(() =>
          katex.renderToString(candidate.answer.latex, {
            throwOnError: true,
            strict: "error",
          }),
        ).not.toThrow();
      }
      const saved = definition.problemAt(0),
        spy = vi.spyOn(definition, "problemAt").mockImplementation(() => {
          throw new Error("verify regenerated");
        });
      try {
        expect(definition.verify(saved)).toBe(true);
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
      for (const bad of [
        null,
        undefined,
        {},
        { parameters: [] },
        { parameters: "bad" },
      ])
        expect(definition.verify(bad as unknown as ArithmeticV2Candidate)).toBe(
          false,
        );
    });
  }
});

function find(id: string, parameters: number[]): ArithmeticV2Candidate {
  const definition = definitions.find((d) => d.id === id)!;
  for (let i = 0; i < definition.domainSize; i++) {
    const candidate = definition.problemAt(i);
    if (JSON.stringify(candidate.parameters) === JSON.stringify(parameters))
      return candidate;
  }
  throw new Error(`missing ${id}: ${parameters}`);
}
describe("middle arithmetic hand-checked exact cases and noncanonical attacks", () => {
  it("rejects sparse and oversized parameter arrays before mathematical verification", () => {
    const definition = definitions.find((d) => d.id === "m1-integer-power")!;
    const parameters = new Array<number>(2);
    parameters[0] = -8;
    const candidate: ArithmeticV2Candidate = {
      parameters,
      prompt: {
        layout: "math",
        text: "(-8)^undefined",
        latex: "(-8)^{undefined}",
        instruction: "계산하시오.",
      },
      answer: { kind: "integer", exact: ["1"], text: "1", latex: "1" },
    };
    expect(definition.verify(candidate)).toBe(false);
    expect(
      definition.verify({
        ...candidate,
        parameters: new Array<number>(1000000),
      }),
    ).toBe(false);
  });
  it.each([
    ["m1-integer-divide", [-100, -10], ["10"], "10"],
    ["m1-integer-power", [-2, 3], ["-8"], "-8"],
    ["m1-rational-add", [-3, 4, 5, 6], ["1", "12"], "1/12"],
    ["m1-rational-divide", [-3, 4, -2, 5], ["15", "8"], "15/8"],
    ["m1-like-terms", [3, -3], [], "0"],
    [
      "m1-linear-subtract",
      [2, -3, -1, 5],
      ["1", "3", "1", "0", "-8", "1"],
      "3x - 8",
    ],
    ["m2-monomial-divide", [3, 4, -6, 2], ["2", "-1", "2"], "-(1/2)x^2"],
    [
      "m2-polynomial-monomial-divide",
      [2, -3, 1, 2, 2],
      ["2", "1", "1", "1", "-3", "2", "0", "1", "2"],
      "x^2 - (3/2)x + 1/2",
    ],
    [
      "m3-polynomial-multiply",
      [2, 3, -1, 4],
      ["2", "-2", "1", "1", "5", "1", "0", "12", "1"],
      "-2x^2 + 5x + 12",
    ],
    ["m3-radical-simplify", [72], ["2", "6", "1"], "6√2"],
    ["m3-radical-simplify", [0], [], "0"],
    ["m3-radical-simplify", [9], ["1", "3", "1"], "3"],
    ["m3-radical-add", [1, 8, 1, 18], ["2", "5", "1"], "5√2"],
    ["m3-radical-subtract", [1, 8, 2, 2], [], "0"],
    ["m3-radical-multiply", [-2, 6, 3, 10], ["15", "-12", "1"], "-12√15"],
    ["m3-radical-divide", [1, 6, -2, 3], ["2", "-1", "2"], "-√2/2"],
    ["m3-radical-rationalize", [3, 1, 3], ["3", "1", "1"], "√3"],
  ] as [string, number[], string[], string][])(
    "%s %j",
    (id, p, exact, text) => {
      const candidate = find(id, p);
      expect(candidate.answer.exact).toEqual(exact);
      expect(candidate.answer.text).toBe(text);
    },
  );

  it("rejects value-equivalent but unreduced, unsorted, zero or non-squarefree forms", () => {
    const cases: [string, number[], string[][]][] = [
      [
        "m1-rational-add",
        [-3, 4, 5, 6],
        [
          ["2", "24"],
          ["-1", "-12"],
          ["01", "12"],
          ["1", "0"],
        ],
      ],
      ["m1-integer-subtract", [1, 1], [["-0"], ["00"], ["0.0"]]],
      [
        "m2-monomial-divide",
        [3, 4, -6, 2],
        [
          ["2", "-2", "4"],
          ["2", "-1", "2", "0", "0", "1"],
          ["2", "-1", "2", "2", "1", "2"],
          ["-2", "-1", "2"],
        ],
      ],
      [
        "m3-radical-simplify",
        [8],
        [
          ["8", "1", "1"],
          ["2", "4", "2"],
          ["2", "-2", "1"],
          ["2", "2", "1", "1", "0", "1"],
        ],
      ],
    ];
    for (const [id, p, attacks] of cases) {
      const definition = definitions.find((d) => d.id === id)!,
        candidate = find(id, p);
      for (const exact of attacks)
        expect(definition.verify(replaceExact(candidate, exact))).toBe(false);
    }
    const definition = definitions.find(
        (d) => d.id === "m3-polynomial-multiply",
      )!,
      candidate = find(definition.id, [2, 3, -1, 4]);
    expect(
      definition.verify(
        replaceExact(candidate, [
          "0",
          "12",
          "1",
          "1",
          "5",
          "1",
          "2",
          "-2",
          "1",
        ]),
      ),
    ).toBe(false);
  });
});
