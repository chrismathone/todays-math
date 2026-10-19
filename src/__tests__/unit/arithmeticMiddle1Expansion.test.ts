import { describe, expect, it, vi } from "vitest";
import katex from "katex";
import { NUMERIC_DEFINITIONS } from "@/lib/arithmetic-v2/families/middle/numeric";
import { POLYNOMIAL_DEFINITIONS } from "@/lib/arithmetic-v2/families/middle/polynomial";
import type {
  ArithmeticV2Candidate,
  ArithmeticV2Definition,
} from "@/lib/arithmetic-v2/types";

// 중1 expansion (Track D, 2026-10-16). Independent oracles only: the displayed
// prompt text is parsed and evaluated with bounded safe integers; no production
// arithmetic, normal-form or generator helpers are imported.
//
// Trivial-item screen (documented per type below; asserted in "screens out"):
// - no zero operand in any chain, power, reciprocal or mixed calculation;
// - no displayed "× 1" / "÷ 1" factor and no base 1 in a power (−1 stays: sign drill);
// - reciprocal input is never ±1 (its own reciprocal);
// - distribute: no "1(" coefficient is printed, the two brackets are never the
//   same linear expression, and the plain "(ax+b) ± (cx+d)" shape stays in
//   m1-linear-add/subtract (k = 1 with |m| = 1 is excluded);
// - fraction combine: the two fractions are never identical.

type Q = [number, number];
function reduced(n: number, d = 1): Q {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0)
    throw new Error("Oracle input outside exact safe integers");
  if (n === 0) return [0, 1];
  if (d < 0) {
    n = -n;
    d = -d;
  }
  let divisor = Math.min(Math.abs(n), d);
  while (n % divisor || d % divisor) divisor--;
  return [n / divisor, d / divisor];
}
const qAdd = (a: Q, b: Q): Q => reduced(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const qMul = (a: Q, b: Q): Q => reduced(a[0] * b[0], a[1] * b[1]);
const qDiv = (a: Q, b: Q): Q => reduced(a[0] * b[1], a[1] * b[0]);
const qNeg = (a: Q): Q => [-a[0], a[1]];

/** Evaluates the displayed text: parentheses, unary minus, ^ (binds tighter
 * than unary minus, so -2^2 = -4), × ÷ and the fraction slash, + -. */
function evaluate(text: string): Q {
  const compact = text.replaceAll(" ", "");
  const tokens = compact.match(/\d+\.\d+|\d+|[()+\-×÷/^]/g) ?? [];
  if (tokens.join("") !== compact) throw new Error(`Bad oracle input: ${text}`);
  let position = 0;
  function primary(): Q {
    const token = tokens[position++];
    if (token === "(") {
      const value = sum();
      if (tokens[position++] !== ")") throw new Error("Missing )");
      return value;
    }
    if (token === undefined || !/^\d/.test(token))
      throw new Error(`Missing operand in ${text}`);
    if (token.includes(".")) {
      const [whole, fraction] = token.split(".");
      return reduced(Number(whole + fraction), 10 ** fraction.length);
    }
    return [Number(token), 1];
  }
  function power(): Q {
    let value = primary();
    while (tokens[position] === "^") {
      position++;
      const exponent = tokens[position++];
      if (!/^\d+$/.test(exponent ?? "")) throw new Error("Bad exponent");
      let result: Q = [1, 1];
      for (let i = 0; i < Number(exponent); i++) result = qMul(result, value);
      value = result;
    }
    return value;
  }
  function unary(): Q {
    if (tokens[position] === "-") {
      position++;
      return qNeg(unary());
    }
    return power();
  }
  function product(): Q {
    let value = unary();
    while (["×", "÷", "/"].includes(tokens[position])) {
      const op = tokens[position++],
        right = unary();
      value = op === "×" ? qMul(value, right) : qDiv(value, right);
    }
    return value;
  }
  function sum(): Q {
    let value = product();
    while (["+", "-"].includes(tokens[position])) {
      const op = tokens[position++],
        right = product();
      value = qAdd(value, op === "+" ? right : qNeg(right));
    }
    return value;
  }
  const value = sum();
  if (position !== tokens.length) throw new Error(`Trailing input: ${text}`);
  return value;
}
function fractionDisplay([n, d]: Q, latex: boolean): string {
  if (d === 1) return String(n);
  return latex
    ? `${n < 0 ? "-" : ""}\\frac{${Math.abs(n)}}{${d}}`
    : `${n}/${d}`;
}
function plainLatex(latex: string): string {
  return latex
    .replace(/\\left|\\right/g, "")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\^\{(\d+)\}/g, "^$1")
    .replace(/\\frac\{(-?\d+)\}\{(\d+)\}/g, "$1/$2")
    .replace(/\\frac\{([^{}]+)\}\{(\d+)\}/g, "($1)/$2");
}

// Polynomial normal form (documented in polynomial.ts): exact = [degree, n, d]
// triples in strictly descending degree, zero coefficients omitted, reduced
// rationals; text/latex rendered from that list; "0" for the zero polynomial.
type Term = [number, Q];
function normalForm(coefficients: Q[]): {
  exact: string[];
  text: string;
  latex: string;
} {
  const terms: Term[] = coefficients
    .map((c, degree): Term => [degree, c])
    .filter(([, [n]]) => n !== 0)
    .sort((a, b) => b[0] - a[0]);
  const render = (latex: boolean) => {
    let text = "";
    for (const [degree, [n, d]] of terms) {
      let magnitude = fractionDisplay([Math.abs(n), d], latex);
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
    return text || "0";
  };
  return {
    exact: terms.flatMap(([degree, q]) => [String(degree), ...q.map(String)]),
    text: render(false),
    latex: render(true),
  };
}
/** Parses an integer linear expression such as "x - 3", "-2x + 1", "3x". */
function parseLinear(text: string): [number, number] {
  const result: [number, number] = [0, 0];
  let seen = 0;
  for (const term of text.replaceAll(" ", "").match(/[+-]?[^+-]+/g) ?? []) {
    const match = /^([+-]?)(\d*)(x)?$/.exec(term);
    if (!match) throw new Error(`Bad linear term: ${term}`);
    const value = (match[1] === "-" ? -1 : 1) * Number(match[2] || 1);
    if (match[3]) result[1] = value;
    else result[0] = value;
    seen++;
  }
  if (seen !== 2) throw new Error(`Not a two-term linear expression: ${text}`);
  return result;
}

const numeric = (id: string): ArithmeticV2Definition => {
  const definition = NUMERIC_DEFINITIONS.find((d) => d.id === id);
  if (!definition) throw new Error(`Missing numeric definition ${id}`);
  return definition;
};
const polynomial = (id: string): ArithmeticV2Definition => {
  const definition = POLYNOMIAL_DEFINITIONS.find((d) => d.id === id);
  if (!definition) throw new Error(`Missing polynomial definition ${id}`);
  return definition;
};
const nz = (limit: number, n: number) =>
  Number.isSafeInteger(n) &&
  !Object.is(n, -0) &&
  n !== 0 &&
  Math.abs(n) <= limit;
const factor = (n: number) => nz(6, n) && n !== 1;
const DECIMALS = new Set<string>([
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 15, 25].flatMap((c) => [
    `${c}/1`,
    `${-c}/1`,
  ]),
  ...[25, 75].flatMap((c) => [`${c}/2`, `${-c}/2`]),
]);
const isDecimal = (coefficient: number, scale: number) =>
  DECIMALS.has(`${coefficient}/${scale}`);
const isReducedFraction = (n: number, d: number, bound: number, maxD: number) =>
  nz(bound, n) &&
  Number.isInteger(d) &&
  d >= 2 &&
  d <= maxD &&
  reduced(n, d)[1] === d;

type Expectation = {
  definition: ArithmeticV2Definition;
  size: number;
  first: number[];
  last: number[];
  member(p: number[]): boolean;
  /** Returns the exact answer the displayed prompt must have. */
  oracle(candidate: ArithmeticV2Candidate, text: string): string[];
  display(exact: string[], latex: boolean): string;
  screen(candidate: ArithmeticV2Candidate, text: string): void;
};
const integerDisplay = (exact: string[]) => exact[0];
const rationalDisplay = (exact: string[], latex: boolean) =>
  fractionDisplay([Number(exact[0]), Number(exact[1])], latex);
// "× 1", "÷ 1" and "1 ×" are trivial factors; a dividend of 1 ("1 ÷ (-1)") and
// the fraction 1/2 are not.
const chainScreen = (text: string) => {
  if (/(^|[^\d.])0([^\d.]|$)/.test(text))
    throw new Error(`Zero operand: ${text}`);
  if (/[×÷] 1(?![\d/.])|(?<![\d./])1 ×/.test(text))
    throw new Error(`×1: ${text}`);
};

const expectations: Expectation[] = [
  {
    definition: numeric("m1-integer-add-chain"),
    size: 18 ** 3 * 4,
    first: [-9, -9, -9, 0],
    last: [9, 9, 9, 3],
    member: (p) =>
      p.length === 4 &&
      p.slice(0, 3).every((n) => nz(9, n)) &&
      p[3] >= 0 &&
      p[3] <= 3,
    oracle: (c, text) => {
      const [a, b, s1, s2] = [
        c.parameters[0],
        c.parameters[1],
        c.parameters[3] >> 1,
        c.parameters[3] & 1,
      ];
      const expectedText = `${a < 0 ? `(${a})` : a} ${s1 ? "-" : "+"} ${b < 0 ? `(${b})` : b} ${s2 ? "-" : "+"} ${c.parameters[2] < 0 ? `(${c.parameters[2]})` : c.parameters[2]}`;
      if (text !== expectedText) throw new Error(`Display: ${text}`);
      return [String(evaluate(text)[0])];
    },
    display: integerDisplay,
    screen: (_, text) => chainScreen(text),
  },
  {
    definition: numeric("m1-integer-add-chain-four"),
    size: 10 ** 4 * 8,
    first: [-5, -5, -5, -5, 0],
    last: [5, 5, 5, 5, 7],
    member: (p) =>
      p.length === 5 &&
      p.slice(0, 4).every((n) => nz(5, n)) &&
      p[4] >= 0 &&
      p[4] <= 7,
    oracle: (c, text) => {
      const [a, b, d, e, ops] = c.parameters;
      const sign = (bit: number) => ((ops >> bit) & 1 ? "-" : "+");
      const w = (n: number) => (n < 0 ? `(${n})` : String(n));
      const expectedText = `${w(a)} ${sign(2)} ${w(b)} ${sign(1)} ${w(d)} ${sign(0)} ${w(e)}`;
      if (text !== expectedText) throw new Error(`Display: ${text}`);
      return [String(evaluate(text)[0])];
    },
    display: integerDisplay,
    screen: (_, text) => chainScreen(text),
  },
  {
    definition: numeric("m1-integer-mixed-chain"),
    size: 4 * 11 * 11 * 12 * 11,
    first: [0, -6, -6, -6, -6],
    last: [3, 6, 6, 6, 6],
    member: (p) =>
      p.length === 5 &&
      p[0] >= 0 &&
      p[0] <= 3 &&
      factor(p[1]) &&
      factor(p[2]) &&
      nz(6, p[3]) &&
      factor(p[4]),
    oracle: (c, text) => {
      const [t, a, b, q, d] = c.parameters;
      const w = (n: number) => (n < 0 ? `(${n})` : String(n));
      const product = `${w(a)} × ${w(b)}`,
        quotient = `${w(q * d)} ÷ ${w(d)}`;
      const expectedText =
        t === 0
          ? `${product} + ${quotient}`
          : t === 1
            ? `${product} - ${quotient}`
            : t === 2
              ? `${quotient} + ${product}`
              : `${quotient} - ${product}`;
      if (text !== expectedText) throw new Error(`Display: ${text}`);
      const value = evaluate(text);
      if (value[1] !== 1) throw new Error("Non-integer mixed chain");
      return [String(value[0])];
    },
    display: integerDisplay,
    screen: (_, text) => chainScreen(text),
  },
  {
    definition: numeric("m1-integer-power-mixed"),
    size: 4 * 9 * 2 * 11 * 11,
    first: [0, -5, 2, -6, -6],
    last: [3, 5, 3, 6, 6],
    member: (p) =>
      p.length === 5 &&
      p[0] >= 0 &&
      p[0] <= 3 &&
      nz(5, p[1]) &&
      p[1] !== 1 &&
      (p[2] === 2 || p[2] === 3) &&
      factor(p[3]) &&
      factor(p[4]),
    oracle: (c, text) => {
      const [t, a, e, b, d] = c.parameters;
      const w = (n: number) => (n < 0 ? `(${n})` : String(n));
      const power = `${w(a)}^${e}`,
        product = `${w(b)} × ${w(d)}`;
      const expectedText =
        t === 0
          ? `${power} + ${product}`
          : t === 1
            ? `${power} - ${product}`
            : t === 2
              ? `${product} + ${power}`
              : `${product} - ${power}`;
      if (text !== expectedText) throw new Error(`Display: ${text}`);
      return [String(evaluate(text)[0])];
    },
    display: integerDisplay,
    screen: (_, text) => {
      chainScreen(text);
      if (/(^|[^\d])1\^/.test(text)) throw new Error(`Base 1: ${text}`);
    },
  },
  {
    definition: numeric("m1-negative-square"),
    size: 8 * 5 * 2 * 5 * 2,
    first: [0, 1, 2, 1, 2],
    last: [7, 5, 3, 5, 3],
    member: (p) =>
      p.length === 5 &&
      p[0] >= 0 &&
      p[0] <= 7 &&
      p[1] >= 1 &&
      p[1] <= 5 &&
      (p[2] === 2 || p[2] === 3) &&
      p[3] >= 1 &&
      p[3] <= 5 &&
      (p[4] === 2 || p[4] === 3),
    oracle: (c, text) => {
      const [code, a, e, b, f] = c.parameters;
      const left = code & 1 ? `(-${a})^${e}` : `-${a}^${e}`;
      const right = code & 2 ? `(-${b})^${f}` : `${b}^${f}`;
      const expectedText = `${left} ${code & 4 ? "-" : "+"} ${right}`;
      if (text !== expectedText) throw new Error(`Display: ${text}`);
      return [String(evaluate(text)[0])];
    },
    display: integerDisplay,
    screen: (_, text) => chainScreen(text),
  },
  {
    definition: numeric("m1-reciprocal"),
    size: 22 + 92 + 28,
    first: [0, -12, 1],
    last: [2, 25, 1],
    member: (p) =>
      p.length === 3 &&
      (p[0] === 0
        ? nz(12, p[1]) && Math.abs(p[1]) !== 1 && p[2] === 1
        : p[0] === 1
          ? isReducedFraction(p[1], p[2], 9, 9)
          : p[0] === 2 && isDecimal(p[1], p[2])),
    oracle: (c, text) => {
      const [form, n, d] = c.parameters;
      const expectedText =
        form === 0
          ? String(n)
          : form === 1
            ? `${n}/${d}`
            : `${n < 0 ? "-" : ""}${String(Math.abs(n))
                .padStart(d + 1, "0")
                .replace(new RegExp(`(\\d{${d}})$`), ".$1")}`;
      if (text !== expectedText) throw new Error(`Display: ${text}`);
      if (
        c.prompt.layout !== "math" ||
        c.prompt.instruction !== "역수를 구하시오."
      )
        throw new Error("Reciprocal instruction");
      return qDiv([1, 1], evaluate(text)).map(String);
    },
    display: rationalDisplay,
    screen: (_, text) => {
      if (["1", "-1", "0"].includes(text)) throw new Error(`Trivial: ${text}`);
    },
  },
  {
    definition: numeric("m1-decimal-fraction-mixed"),
    size: 28 * 34 * 6,
    first: [0, -25, 1, -6, 5, 0],
    last: [3, 25, 1, 6, 5, 1],
    member: (p) =>
      p.length === 6 &&
      p[0] >= 0 &&
      p[0] <= 3 &&
      isDecimal(p[1], p[2]) &&
      isReducedFraction(p[3], p[4], 6, 6) &&
      (p[0] === 1 || p[0] === 3 ? p[5] === 0 || p[5] === 1 : p[5] === 0),
    oracle: (c, text) => {
      const [op, coefficient, scale, n, d, order] = c.parameters;
      const decimal = `${coefficient < 0 ? "-" : ""}${String(
        Math.abs(coefficient),
      )
        .padStart(scale + 1, "0")
        .replace(new RegExp(`(\\d{${scale}})$`), ".$1")}`;
      const symbol = ["+", "-", "×", "÷"][op];
      const decimalShown = coefficient < 0 ? `(${decimal})` : decimal;
      const fractionShown =
        n < 0 || (op === 3 && order === 0) ? `(${n}/${d})` : `${n}/${d}`;
      const expectedText = order
        ? `${fractionShown} ${symbol} ${decimalShown}`
        : `${decimalShown} ${symbol} ${fractionShown}`;
      if (text !== expectedText) throw new Error(`Display: ${text}`);
      return evaluate(text).map(String);
    },
    display: rationalDisplay,
    screen: (_, text) => chainScreen(text),
  },
  {
    definition: polynomial("m1-linear-distribute-combine"),
    size: (8 * 8 - 2) * (60 * 60 - 60),
    first: [-4, -3, -5, -4, -3, -4],
    last: [4, 3, 5, 4, 3, 4],
    member: ([k, a, b, m, c, d, ...rest]) =>
      rest.length === 0 &&
      nz(4, k) &&
      nz(4, m) &&
      !(k === 1 && Math.abs(m) === 1) &&
      nz(3, a) &&
      nz(3, c) &&
      nz(5, b) &&
      nz(5, d) &&
      !(a === c && b === d),
    oracle: (c, text) => {
      const [k, a, b, m, cc, d] = c.parameters;
      const parts = /^(-?\d*)\((.*)\) ([+-]) (\d*)\((.*)\)$/.exec(text);
      if (!parts) throw new Error(`Bad distribute prompt: ${text}`);
      const shownK =
        parts[1] === "" ? 1 : parts[1] === "-" ? -1 : Number(parts[1]);
      const shownM =
        (parts[3] === "-" ? -1 : 1) * (parts[4] === "" ? 1 : Number(parts[4]));
      const [b1, a1] = parseLinear(parts[2]),
        [d1, c1] = parseLinear(parts[5]);
      if (
        [shownK, a1, b1, shownM, c1, d1].join() !== [k, a, b, m, cc, d].join()
      )
        throw new Error(`Display: ${text}`);
      return normalForm([reduced(k * b + m * d), reduced(k * a + m * cc)])
        .exact;
    },
    display: (exact, latex) => {
      const q: Q[] = [];
      for (let i = 0; i < exact.length; i += 3)
        q[Number(exact[i])] = [Number(exact[i + 1]), Number(exact[i + 2])];
      const nf = normalForm(
        Array.from({ length: q.length }, (_, i) => q[i] ?? [0, 1]),
      );
      return latex ? nf.latex : nf.text;
    },
    screen: (_, text) => {
      if (/(^|[^\d])1\(/.test(text)) throw new Error(`1( shown: ${text}`);
      const parts = /^(-?\d*)\((.*)\) ([+-]) (\d*)\((.*)\)$/.exec(text)!;
      if (parts[2] === parts[5]) throw new Error(`Identical brackets: ${text}`);
      if (parts[1] === "" && parts[4] === "")
        throw new Error(`Plain linear add/subtract shape: ${text}`);
      if (/(^|[^\d])0(x|$|[^\d.x])/.test(text))
        throw new Error(`Zero: ${text}`);
    },
  },
  {
    definition: polynomial("m1-linear-fraction-combine"),
    size: 300 * 299 * 2,
    first: [-3, -5, 2, -3, -5, 3],
    last: [3, 5, 6, 3, 5, -5],
    member: ([a, b, p, c, d, q, ...rest]) =>
      rest.length === 0 &&
      nz(3, a) &&
      nz(3, c) &&
      nz(5, b) &&
      nz(5, d) &&
      Number.isInteger(p) &&
      p >= 2 &&
      p <= 6 &&
      Number.isInteger(q) &&
      Math.abs(q) >= 2 &&
      Math.abs(q) <= 6 &&
      !(a === c && b === d && p === Math.abs(q)),
    oracle: (c, text) => {
      const [a, b, p, cc, d, q] = c.parameters;
      const parts = /^\((.*)\)\/(\d+) ([+-]) \((.*)\)\/(\d+)$/.exec(text);
      if (!parts) throw new Error(`Bad fraction prompt: ${text}`);
      const [b1, a1] = parseLinear(parts[1]),
        [d1, c1] = parseLinear(parts[4]);
      const shownQ = (parts[3] === "-" ? -1 : 1) * Number(parts[5]);
      if (
        [a1, b1, Number(parts[2]), c1, d1, shownQ].join() !==
        [a, b, p, cc, d, q].join()
      )
        throw new Error(`Display: ${text}`);
      const sign = q < 0 ? -1 : 1,
        qq = Math.abs(q);
      return normalForm([
        reduced(b * qq + sign * d * p, p * qq),
        reduced(a * qq + sign * cc * p, p * qq),
      ]).exact;
    },
    display: (exact, latex) => {
      const q: Q[] = [];
      for (let i = 0; i < exact.length; i += 3)
        q[Number(exact[i])] = [Number(exact[i + 1]), Number(exact[i + 2])];
      const nf = normalForm(
        Array.from({ length: q.length }, (_, i) => q[i] ?? [0, 1]),
      );
      return latex ? nf.latex : nf.text;
    },
    screen: (_, text) => {
      const parts = /^\((.*)\)\/(\d+) ([+-]) \((.*)\)\/(\d+)$/.exec(text)!;
      if (parts[1] === parts[4] && parts[2] === parts[5])
        throw new Error(`Identical fractions: ${text}`);
      if (/(^|[^\d])0(x|$|[^\d.x])/.test(text))
        throw new Error(`Zero: ${text}`);
    },
  },
];

describe("중1 expansion: ids, placement and exact domain sizes", () => {
  it("registers the nine new types with 중1 placement and distinct ids", () => {
    const ids = expectations.map((e) => e.definition.id);
    expect(ids).toEqual([
      "m1-integer-add-chain",
      "m1-integer-add-chain-four",
      "m1-integer-mixed-chain",
      "m1-integer-power-mixed",
      "m1-negative-square",
      "m1-reciprocal",
      "m1-decimal-fraction-mixed",
      "m1-linear-distribute-combine",
      "m1-linear-fraction-combine",
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { definition, size } of expectations) {
      expect(definition.grade).toBe("중1");
      expect(definition.domainSize).toBe(size);
      expect(definition.strand).toBe(
        definition.id.startsWith("m1-linear-") ? "문자식" : "정수·유리수",
      );
      expect(definition.rankGroup.trim()).not.toBe("");
      expect(definition.title.length).toBeGreaterThan(0);
      expect(definition.description.length).toBeGreaterThan(0);
    }
  });
});

for (const expectation of expectations) {
  const { definition, size, first, last } = expectation;
  describe(definition.id, () => {
    it("round-trips the whole domain: unique parameters/prompts, membership, displayed oracle, verify true", () => {
      expect(definition.problemAt(0).parameters).toEqual(first);
      expect(definition.problemAt(size - 1).parameters).toEqual(last);
      const keys = new Set<string>(),
        texts = new Set<string>();
      for (let index = 0; index < size; index++) {
        const candidate = definition.problemAt(index);
        if (candidate.prompt.layout !== "math")
          throw new Error("Non-math prompt");
        const text = candidate.prompt.text;
        if (!expectation.member(candidate.parameters))
          throw new Error(`Invalid member ${index}: ${candidate.parameters}`);
        const exact = expectation.oracle(candidate, text);
        if (JSON.stringify(exact) !== JSON.stringify(candidate.answer.exact))
          throw new Error(
            `Wrong answer at ${index}: ${text} → ${candidate.answer.exact} (expected ${exact})`,
          );
        if (
          candidate.answer.text !== expectation.display(exact, false) ||
          candidate.answer.latex !== expectation.display(exact, true)
        )
          throw new Error(
            `Answer display at ${index}: ${candidate.answer.text}`,
          );
        if (plainLatex(candidate.prompt.latex) !== text)
          throw new Error(
            `Text/LaTeX mismatch at ${index}: ${candidate.prompt.latex}`,
          );
        if (!definition.verify(candidate))
          throw new Error(`Verification rejected ${index}: ${text}`);
        expectation.screen(candidate, text);
        const key = candidate.parameters.join(",");
        if (keys.has(key) || texts.has(text))
          throw new Error(`Duplicate at ${index}: ${text}`);
        keys.add(key);
        texts.add(text);
      }
      expect(keys.size).toBe(size);
    }, 180_000);

    it("is deterministic, rejects bad indexes, verifies without the generator and renders in KaTeX", () => {
      for (const index of [
        0,
        1,
        Math.floor(size / 3),
        Math.floor(size / 2),
        size - 1,
      ]) {
        const candidate = definition.problemAt(index);
        expect(definition.problemAt(index)).toEqual(candidate);
        if (candidate.prompt.layout !== "math")
          throw new Error("Non-math prompt");
        for (const latex of [candidate.prompt.latex, candidate.answer.latex])
          expect(() =>
            katex.renderToString(latex, {
              throwOnError: true,
              strict: "error",
            }),
          ).not.toThrow();
        const generator = vi
          .spyOn(definition, "problemAt")
          .mockImplementation(() => {
            throw new Error("Verification called generator");
          });
        try {
          expect(definition.verify(JSON.parse(JSON.stringify(candidate)))).toBe(
            true,
          );
          expect(generator).not.toHaveBeenCalled();
        } finally {
          generator.mockRestore();
        }
      }
      for (const index of [
        -1,
        0.5,
        NaN,
        Infinity,
        -Infinity,
        size,
        Number.MAX_SAFE_INTEGER,
      ])
        expect(() => definition.problemAt(index)).toThrow(RangeError);
    });

    it("rejects tampered answers, prompts and parameters", () => {
      for (const index of [0, Math.floor(size / 2), size - 1]) {
        const candidate = definition.problemAt(index);
        if (candidate.prompt.layout !== "math")
          throw new Error("Non-math prompt");
        const { answer, prompt } = candidate;
        const bumped = [...answer.exact];
        const position = answer.kind === "polynomial" ? 1 : 0;
        if (bumped.length)
          bumped[position] = String(Number(bumped[position]) + 1);
        else bumped.push("1", "1", "1");
        const wrongExact = {
          kind: answer.kind,
          exact: bumped,
          text: expectation.display(bumped, false),
          latex: expectation.display(bumped, true),
        };
        const badAnswers: unknown[] = [
          null,
          {},
          wrongExact,
          {
            ...answer,
            kind: answer.kind === "integer" ? "rational" : "integer",
          },
          { ...answer, kind: "decimal" },
          { ...answer, exact: [] },
          { ...answer, exact: [...answer.exact, "1"] },
          { ...answer, exact: answer.exact.map((x) => `${x}0`) },
          { ...answer, exact: answer.exact.map(() => "-0") },
          { ...answer, exact: answer.exact.map((x) => `+${x}`) },
          { ...answer, text: `${answer.text} ` },
          { ...answer, text: "0" },
          { ...answer, latex: `${answer.latex}1` },
        ];
        // A mutation that leaves the saved value unchanged (e.g. "0" for a
        // zero answer) is not a tamper; every other one must be rejected.
        const differs = (bad: unknown, original: unknown) =>
          JSON.stringify(bad) !== JSON.stringify(original);
        for (const bad of badAnswers)
          if (differs(bad, answer))
            expect(
              definition.verify({
                ...candidate,
                answer: bad,
              } as ArithmeticV2Candidate),
            ).toBe(false);
        const badPrompts: unknown[] = [
          null,
          { ...prompt, text: `${prompt.text} + 1` },
          {
            ...prompt,
            text: prompt.text.replace(/\d/, (d) =>
              String((Number(d) + 1) % 10),
            ),
          },
          { ...prompt, latex: `${prompt.latex}+1` },
          { ...prompt, instruction: "다른 지시" },
          { ...prompt, layout: "vertical" },
          { ...prompt, figureId: "hidden" },
        ];
        for (const bad of badPrompts)
          if (differs(bad, prompt))
            expect(
              definition.verify({
                ...candidate,
                prompt: bad,
              } as ArithmeticV2Candidate),
            ).toBe(false);
        const other = definition.problemAt((index + 1) % size).parameters;
        const badParameters: unknown[] = [
          null,
          [],
          other,
          [...candidate.parameters, 1],
          candidate.parameters.slice(1),
          [0.5, ...candidate.parameters.slice(1)],
          [NaN, ...candidate.parameters.slice(1)],
          [-0, ...candidate.parameters.slice(1)],
          candidate.parameters.map(() => 0),
          candidate.parameters.map(() => 999),
        ];
        for (const bad of badParameters)
          if (differs(bad, candidate.parameters))
            expect(
              definition.verify({
                ...candidate,
                parameters: bad,
              } as ArithmeticV2Candidate),
            ).toBe(false);
      }
    });
  });
}

describe("polynomial normal form of the new 문자식 types", () => {
  it("emits descending [degree, n, d] triples with reduced nonzero coefficients and matching text", () => {
    for (const id of [
      "m1-linear-distribute-combine",
      "m1-linear-fraction-combine",
    ]) {
      const definition = polynomial(id);
      for (const index of [
        0,
        7,
        1234,
        Math.floor(definition.domainSize / 2),
        definition.domainSize - 1,
      ]) {
        const { answer } = definition.problemAt(index);
        expect(answer.kind).toBe("polynomial");
        expect(answer.exact.length % 3).toBe(0);
        let previous = Infinity;
        const q: Q[] = [];
        for (let i = 0; i < answer.exact.length; i += 3) {
          const degree = Number(answer.exact[i]);
          const [n, d] = [
            Number(answer.exact[i + 1]),
            Number(answer.exact[i + 2]),
          ];
          expect(degree).toBeLessThan(previous);
          expect(n).not.toBe(0);
          expect(d).toBeGreaterThan(0);
          expect(reduced(n, d)).toEqual([n, d]);
          previous = degree;
          q[degree] = [n, d];
        }
        const nf = normalForm(
          Array.from({ length: q.length }, (_, i) => q[i] ?? [0, 1]),
        );
        expect(answer.text).toBe(nf.text);
        expect(answer.latex).toBe(nf.latex);
      }
    }
  });

  it("accepts any candidate whose answer is the ordered normal form, not a string copy of problemAt", () => {
    const definition = polynomial("m1-linear-distribute-combine");
    const candidate = definition.problemAt(0);
    const reordered = {
      ...candidate.answer,
      exact: [
        ...candidate.answer.exact.slice(3),
        ...candidate.answer.exact.slice(0, 3),
      ],
    };
    // Same coefficients, wrong order: the documented normal form is ordered.
    expect(definition.verify({ ...candidate, answer: reordered })).toBe(false);
  });
});

describe("hand-checked 중1 expansion cases", () => {
  const find = (definition: ArithmeticV2Definition, parameters: number[]) => {
    for (let i = 0; i < definition.domainSize; i++) {
      const candidate = definition.problemAt(i);
      if (candidate.parameters.join(",") === parameters.join(","))
        return candidate;
    }
    throw new Error(`Missing ${definition.id} ${parameters}`);
  };
  it.each([
    ["m1-integer-add-chain", [-3, 5, -7, 1], "(-3) + 5 - (-7)", ["9"]],
    ["m1-integer-add-chain", [2, -4, 6, 3], "2 - (-4) - 6", ["0"]],
    [
      "m1-integer-add-chain-four",
      [-3, 4, -5, 2, 5],
      "(-3) - 4 + (-5) - 2",
      ["-14"],
    ],
    [
      "m1-integer-mixed-chain",
      [1, -3, 4, 6, -2],
      "(-3) × 4 - (-12) ÷ (-2)",
      ["-18"],
    ],
    [
      "m1-integer-mixed-chain",
      [2, -3, 4, 6, -2],
      "(-12) ÷ (-2) + (-3) × 4",
      ["-6"],
    ],
    ["m1-integer-power-mixed", [1, -2, 3, 3, -4], "(-2)^3 - 3 × (-4)", ["4"]],
    ["m1-integer-power-mixed", [3, -2, 3, 3, -4], "3 × (-4) - (-2)^3", ["-4"]],
    ["m1-negative-square", [2, 2, 2, 3, 2], "-2^2 + (-3)^2", ["5"]],
    ["m1-negative-square", [5, 2, 2, 3, 2], "(-2)^2 - 3^2", ["-5"]],
    ["m1-negative-square", [0, 1, 2, 1, 3], "-1^2 + 1^3", ["0"]],
    ["m1-reciprocal", [1, -2, 3], "-2/3", ["-3", "2"]],
    ["m1-reciprocal", [2, 25, 2], "0.25", ["4", "1"]],
    ["m1-reciprocal", [2, -15, 1], "-1.5", ["-2", "3"]],
    ["m1-reciprocal", [0, 7, 1], "7", ["1", "7"]],
    [
      "m1-decimal-fraction-mixed",
      [2, -5, 1, 4, 3, 0],
      "(-0.5) × 4/3",
      ["-2", "3"],
    ],
    [
      "m1-decimal-fraction-mixed",
      [3, 25, 2, -1, 2, 0],
      "0.25 ÷ (-1/2)",
      ["-1", "2"],
    ],
    [
      "m1-decimal-fraction-mixed",
      [1, 25, 2, 3, 4, 1],
      "3/4 - 0.25",
      ["1", "2"],
    ],
    [
      "m1-decimal-fraction-mixed",
      [0, -15, 1, 1, 2, 0],
      "(-1.5) + 1/2",
      ["-1", "1"],
    ],
  ] as [string, number[], string, string[]][])(
    "%s %j",
    (id, parameters, text, exact) => {
      const definition = numeric(id);
      const candidate = find(definition, parameters);
      expect(candidate.prompt).toMatchObject({ text });
      expect(candidate.answer.exact).toEqual(exact);
      expect(definition.verify(candidate)).toBe(true);
    },
  );
  it.each([
    [
      "m1-linear-distribute-combine",
      [2, 1, -3, -3, 2, 1],
      "2(x - 3) - 3(2x + 1)",
      "2\\left(x - 3\\right) - 3\\left(2x + 1\\right)",
      ["1", "-4", "1", "0", "-9", "1"],
      "-4x - 9",
    ],
    [
      "m1-linear-distribute-combine",
      [-1, 2, 1, 1, -1, 2],
      "-(2x + 1) + (-x + 2)",
      "-\\left(2x + 1\\right) + \\left(-x + 2\\right)",
      ["1", "-3", "1", "0", "1", "1"],
      "-3x + 1",
    ],
    [
      "m1-linear-fraction-combine",
      [1, 1, 2, 2, -1, -3],
      "(x + 1)/2 - (2x - 1)/3",
      "\\frac{x + 1}{2} - \\frac{2x - 1}{3}",
      ["1", "-1", "6", "0", "5", "6"],
      "-(1/6)x + 5/6",
    ],
    [
      "m1-linear-fraction-combine",
      [3, -1, 4, 1, 1, 4],
      "(3x - 1)/4 + (x + 1)/4",
      "\\frac{3x - 1}{4} + \\frac{x + 1}{4}",
      ["1", "1", "1"],
      "x",
    ],
  ] as [string, number[], string, string, string[], string][])(
    "%s %j",
    (id, parameters, text, latex, exact, answerText) => {
      const definition = polynomial(id);
      const candidate = find(definition, parameters);
      expect(candidate.prompt).toMatchObject({
        text,
        latex,
        instruction: "식을 간단히 하시오.",
      });
      expect(candidate.answer.exact).toEqual(exact);
      expect(candidate.answer.text).toBe(answerText);
      expect(definition.verify(candidate)).toBe(true);
    },
  );
});
