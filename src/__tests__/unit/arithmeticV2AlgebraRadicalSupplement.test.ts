import { describe, expect, it, vi } from "vitest";
import katex from "katex";
import { ALGEBRA_RADICAL_SUPPLEMENT_DEFINITIONS as definitions } from "@/lib/arithmetic-v2/families/middle/algebraRadicalSupplement";
import type {
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
} from "@/lib/arithmetic-v2/types";

// Independent bounded integer oracles: no production arithmetic helpers.
// All intermediates here are safe integers (largest power coefficient is 625).
type Triple = [number, number, number];
const counts: Record<string, number> = {
  "m1-linear-scalar-multiply": 1728,
  "m1-linear-scalar-divide": 1728,
  "m1-rational-like-terms": 1156,
  "m2-monomial-power": 72,
  "m3-radical-three-terms": 32768,
  "m3-radical-distribute": 3456,
  // 2026-10-16 중3 square-root drills; the explicit "between" rows are
  // re-enumerated in specification() and must agree with this literal.
  "m3-sqrt-natural-multiplier": 2 * 110,
  "m3-sqrt-integer-part": 110 * 4,
  "m3-sqrt-decimal-part": 110 * 4,
  "m3-sqrt-integers-between": 2332,
  "m3-radical-mixed": 7 * 7 * 12 * 4,
};
const INTEGER_KIND_IDS = [
  "m3-sqrt-natural-multiplier",
  "m3-sqrt-integer-part",
  "m3-sqrt-integers-between",
];
/** Non-square radicands 2..120, by direct squaring (no sqrt). */
const nonSquares = (): number[] => {
  const result: number[] = [];
  for (let n = 2; n <= 120; n++) {
    let square = false;
    for (let k = 1; k * k <= n; k++) if (k * k === n) square = true;
    if (!square) result.push(n);
  }
  return result;
};
/** Greatest k with k² < n, counting up (n is never a square here). */
const floorRoot = (n: number): number => {
  let k = 0;
  while ((k + 1) * (k + 1) < n) k++;
  return k;
};
function reduce(n: number, d: number): [number, number] {
  if (d === 0) throw new Error("invalid oracle denominator");
  if (n === 0) return [0, 1];
  if (d < 0) {
    n = -n;
    d = -d;
  }
  let divisor = Math.min(Math.abs(n), d);
  while (n % divisor || d % divisor) divisor--;
  return [n / divisor, d / divisor];
}
function squareParts(n: number): [number, number] {
  // Greatest square divisor searched downward, unlike both production methods.
  for (let outside = Math.floor(Math.sqrt(n)); outside >= 1; outside--)
    if (n % (outside * outside) === 0)
      return [outside, n / (outside * outside)];
  throw new Error("invalid oracle radicand");
}
function canonical(
  kind: ArithmeticV2Answer["kind"],
  triples: Triple[],
): string[] {
  return triples
    .filter(([, n]) => n !== 0)
    .sort(([a], [b]) => (kind === "surd" ? a - b : b - a))
    .flatMap(([key, n, d]) => [String(key), ...reduce(n, d).map(String)]);
}
function oracle(id: string, p: number[]): string[] {
  const [a, b, c, d, e, f] = p;
  if (id === "m1-linear-scalar-multiply")
    return canonical("polynomial", [
      [1, a * b, 1],
      [0, a * c, 1],
    ]);
  if (id === "m1-linear-scalar-divide")
    return canonical("polynomial", [
      [1, b, a],
      [0, c, a],
    ]);
  if (id === "m1-rational-like-terms")
    return canonical("polynomial", [[1, a * d + c * b, b * d]]);
  if (id === "m2-monomial-power")
    return canonical("polynomial", [[b * c, a ** c, 1]]);
  if (id === "m3-sqrt-natural-multiplier") {
    // Smallest x with a·x (mode 0) or a/x (mode 1) a perfect square, by trial.
    const [mode, radicand] = p;
    const square = (v: number) => {
      for (let k = 1; k * k <= v; k++) if (k * k === v) return true;
      return false;
    };
    for (let x = 1; x <= radicand; x++)
      if (
        mode === 0
          ? square(radicand * x)
          : radicand % x === 0 && square(radicand / x)
      )
        return [String(x)];
    throw new Error("no multiplier found");
  }
  if (id === "m3-sqrt-integer-part") return [String(floorRoot(a) + b)];
  if (id === "m3-sqrt-decimal-part") {
    // √n − ⌊√n⌋ as a surd sum: rational term first, then the simplified radical.
    const [outside, inside] = squareParts(a);
    return canonical("surd", [
      [1, -floorRoot(a), 1],
      [inside, outside, 1],
    ]);
  }
  if (id === "m3-sqrt-integers-between") {
    let count = 0;
    for (let n = 1; n * n < b; n++) if (n * n > a) count++;
    return [String(count)];
  }
  if (id === "m3-radical-mixed") {
    // √n·√m + c/√d = √(nm) + (c/d)√d; combine like radicands with exact rationals.
    const [n, m, c, den] = p;
    const sums = new Map<number, [number, number]>();
    const addTerm = (
      radicand: number,
      numerator: number,
      denominator: number,
    ) => {
      const [outside, inside] = squareParts(radicand);
      const [cn, cd] = sums.get(inside) ?? [0, 1];
      sums.set(inside, [
        cn * denominator + numerator * outside * cd,
        cd * denominator,
      ]);
    };
    addTerm(n * m, 1, 1);
    addTerm(den, c, den);
    return canonical(
      "surd",
      [...sums].map(([r, [cn, cd]]) => [r, cn, cd]),
    );
  }
  const raw =
    id === "m3-radical-three-terms"
      ? [
          [a, b],
          [c, d],
          [e, f],
        ]
      : [
          [a * c, b * d],
          [a * e, b],
        ];
  const coefficients: Record<number, number> = {};
  for (const [coefficient, radicand] of raw) {
    const [outside, inside] = squareParts(radicand);
    coefficients[inside] = (coefficients[inside] ?? 0) + coefficient * outside;
  }
  return canonical(
    "surd",
    Object.entries(coefficients).map(([r, n]) => [Number(r), n, 1]),
  );
}

function display(
  kind: ArithmeticV2Answer["kind"],
  exact: string[],
  latex: boolean,
): string {
  const terms: string[] = [];
  const fraction = (n: number, d: number) =>
    d === 1 ? String(n) : latex ? `\\frac{${n}}{${d}}` : `${n}/${d}`;
  // Integer answers (2026-10-16 square-root drills) show the number itself.
  if (kind === "integer") return exact.join(",");
  for (let i = 0; i < exact.length; i += 3) {
    const [key, n, d] = exact.slice(i, i + 3).map(Number);
    const magnitude = Math.abs(n);
    let content: string;
    if (kind === "polynomial") {
      const coefficient =
        key && magnitude === d
          ? ""
          : key && d > 1 && !latex
            ? `(${magnitude}/${d})`
            : fraction(magnitude, d);
      content =
        coefficient +
        (key === 0 ? "" : key === 1 ? "x" : latex ? `x^{${key}}` : `x^${key}`);
    } else if (key === 1) content = fraction(magnitude, d);
    else {
      const numerator = `${magnitude === 1 ? "" : magnitude}${latex ? `\\sqrt{${key}}` : `√${key}`}`;
      content =
        d === 1
          ? numerator
          : latex
            ? `\\frac{${numerator}}{${d}}`
            : `${numerator}/${d}`;
    }
    terms.push(`${i ? (n < 0 ? " - " : " + ") : n < 0 ? "-" : ""}${content}`);
  }
  return terms.join("") || "0";
}
function withExact(
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

// Independently read the displayed operands, so oracle equality cannot hide a
// prompt whose numbers/signs differ from its saved parameters.
function readPrompt(id: string, candidate: ArithmeticV2Candidate): number[] {
  if (candidate.prompt.layout !== "math")
    throw new Error("unexpected prompt layout");
  const text = candidate.prompt.text;
  const coefficient = (s: string) =>
    s === "" || s === "+" ? 1 : s === "-" ? -1 : Number(s);
  const linear = (s: string): number[] => {
    const match = /^(-?\d*)x ([+-]) (\d+)$/.exec(s);
    if (!match) throw new Error(`invalid linear expression: ${s}`);
    return [
      coefficient(match[1]),
      Number(match[3]) * (match[2] === "-" ? -1 : 1),
    ];
  };
  if (id === "m1-linear-scalar-multiply") {
    const match = /^(-?\d+)\((.+)\)$/.exec(text)!;
    return [Number(match[1]), ...linear(match[2])];
  }
  if (id === "m1-linear-scalar-divide") {
    const match = /^\((.+)\)\/\((-?\d+)\)$/.exec(text)!;
    return [Number(match[2]), ...linear(match[1])];
  }
  if (id === "m1-rational-like-terms") {
    const match = /^\((-?\d+)\/(\d+)\)x \+ \((-?\d+)\/(\d+)\)x$/.exec(text)!;
    return match.slice(1).map(Number);
  }
  if (id === "m2-monomial-power") {
    const match = /^\((-?\d*)x(?:\^(\d+))?\)\^(\d+)$/.exec(text)!;
    return [coefficient(match[1]), Number(match[2] ?? 1), Number(match[3])];
  }
  if (id === "m3-radical-three-terms") {
    const parts = text.replaceAll(" ", "").match(/[+-]?\d*√\d+/g)!;
    if (parts.join("") !== text.replaceAll(" ", "") || parts.length !== 3)
      throw new Error("invalid radical sum");
    return parts.flatMap((part) => {
      const [a, n] = part.split("√");
      return [coefficient(a), Number(n)];
    });
  }
  if (id === "m3-sqrt-natural-multiplier") {
    const match = /^√\((\d+)(x|\/x)\)$/.exec(text);
    if (!match) throw new Error(`invalid multiplier prompt: ${text}`);
    return [match[2] === "x" ? 0 : 1, Number(match[1])];
  }
  if (id === "m3-sqrt-integer-part" || id === "m3-sqrt-decimal-part") {
    const match = /^√(\d+)(?: \+ ([1-9]))?$/.exec(text);
    if (!match) throw new Error(`invalid root prompt: ${text}`);
    return [Number(match[1]), match[2] ? Number(match[2]) : 0];
  }
  if (id === "m3-sqrt-integers-between") {
    const match = /^√(\d+) ＜ n ＜ √(\d+)$/.exec(text);
    if (!match) throw new Error(`invalid between prompt: ${text}`);
    return [Number(match[1]), Number(match[2])];
  }
  if (id === "m3-radical-mixed") {
    const match = /^√(\d+) × √(\d+) ([+-]) (\d+)\/\(√(\d+)\)$/.exec(text);
    if (!match) throw new Error(`invalid mixed radical prompt: ${text}`);
    return [
      Number(match[1]),
      Number(match[2]),
      Number(match[4]) * (match[3] === "-" ? -1 : 1),
      Number(match[5]),
    ];
  }
  const match = /^(-?\d*)√(\d+)\((-?\d*)√(\d+) ([+-]) (\d+)\)$/.exec(text)!;
  return [
    coefficient(match[1]),
    Number(match[2]),
    coefficient(match[3]),
    Number(match[4]),
    Number(match[6]) * (match[5] === "-" ? -1 : 1),
  ];
}
function decodeLatex(id: string, latex: string): string {
  let text = latex
    .replace(/\\left|\\right/g, "")
    .replace(/\\sqrt\{(\d+)x\}/g, "√($1x)")
    .replace(/\\sqrt\{\\frac\{(\d+)\}\{x\}\}/g, "√($1/x)")
    .replace(/\\sqrt\{(\d+)\}/g, "√$1")
    .replace(/\^\{(\d+)\}/g, "^$1")
    .replace(/\\lt/g, "＜")
    .replace(/\\times/g, "×");
  if (id === "m1-linear-scalar-divide")
    text = text.replace(/\\frac\{([^}]+)\}\{(-?\d+)\}/g, "($1)/($2)");
  else if (id === "m3-radical-mixed")
    text = text.replace(/\\frac\{(\d+)\}\{(√\d+)\}/g, "$1/($2)");
  else text = text.replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "$1/$2");
  return text;
}

// Enumerate the specification independently to lock index order and exact counts.
function axesFor(id: string): number[][] {
  const signed = (n: number) =>
    Array.from({ length: n * 2 + 1 }, (_, i) => i - n).filter(Boolean);
  const scalars = [-5, -4, -3, -2, 2, 3, 4, 5];
  if (id.startsWith("m1-linear-scalar")) return [scalars, signed(6), signed(9)];
  if (id === "m2-monomial-power") return [scalars, [1, 2, 3], [2, 3, 4]];
  if (id === "m3-radical-three-terms")
    return [
      signed(2),
      [2, 3, 4, 5, 8, 12, 18, 20],
      signed(2),
      [2, 3, 4, 5, 8, 12, 18, 20],
      signed(2),
      [2, 3, 4, 5, 8, 12, 18, 20],
    ];
  if (id === "m3-sqrt-natural-multiplier") return [[0, 1], nonSquares()];
  if (id === "m3-sqrt-integer-part" || id === "m3-sqrt-decimal-part")
    return [nonSquares(), [0, 1, 2, 3]];
  if (id === "m3-radical-mixed")
    return [
      [2, 3, 5, 6, 8, 12, 18],
      [2, 3, 5, 6, 8, 12, 18],
      signed(6),
      [2, 3, 5, 6],
    ];
  return [
    signed(2),
    [2, 3, 5, 6, 8, 12],
    signed(2),
    [2, 3, 5, 6, 8, 12],
    signed(3),
  ];
}
function* specification(id: string): Generator<number[]> {
  if (id === "m1-rational-like-terms") {
    const fractions: number[][] = [];
    for (let n = -6; n <= 6; n++)
      for (let d = 2; d <= 6; d++)
        if (n && reduce(n, d)[1] === d) fractions.push([n, d]);
    for (const left of fractions)
      for (const right of fractions) yield [...left, ...right];
    return;
  }
  if (id === "m3-sqrt-integers-between") {
    // √a < n < √b with 2 ≤ a ≤ 40 < … b ≤ 100, neither a square, at least one n.
    const nonSquare = new Set(nonSquares());
    for (let a = 2; a <= 40; a++)
      for (let b = a + 1; b <= 100; b++) {
        if (!nonSquare.has(a) || !nonSquare.has(b)) continue;
        let any = false;
        for (let n = 1; n * n < b; n++) if (n * n > a) any = true;
        if (any) yield [a, b];
      }
    return;
  }
  const axes = axesFor(id);
  function* visit(prefix: number[]): Generator<number[]> {
    if (prefix.length === axes.length) {
      yield prefix;
      return;
    }
    for (const n of axes[prefix.length]) yield* visit([...prefix, n]);
  }
  yield* visit([]);
}
const definition = (id: string) => definitions.find((d) => d.id === id)!;
function example(id: string, parameters: number[]): ArithmeticV2Candidate {
  const d = definition(id);
  let index = 0;
  for (const p of specification(id)) {
    if (p.join(",") === parameters.join(",")) return d.problemAt(index);
    index++;
  }
  throw new Error("example outside domain");
}

describe("algebra/radical arithmetic gap supplement", () => {
  it("exports eleven genuine operation families with exact finite capacities", () => {
    expect(definitions.map((d) => d.id)).toEqual(Object.keys(counts));
    // 40,908 (six original) + 220 + 440 + 440 + 2,332 + 2,352 (2026-10-16 중3 drills).
    expect(definitions.reduce((sum, d) => sum + d.domainSize, 0)).toBe(46692);
    expect(definitions.map((d) => d.grade)).toEqual([
      "중1",
      "중1",
      "중1",
      "중2",
      "중3",
      "중3",
      "중3",
      "중3",
      "중3",
      "중3",
      "중3",
    ]);
    expect(new Set(definitions.map((d) => d.rankGroup))).toEqual(
      new Set([
        "m1-linear-expression",
        "m2-monomial",
        "m3-radical",
        "m3-square-root",
      ]),
    );
    for (const d of definitions)
      expect(d.problemAt(0).answer.kind).toBe(
        INTEGER_KIND_IDS.includes(d.id)
          ? "integer"
          : d.strand === "근호"
            ? "surd"
            : "polynomial",
      );
  });

  for (const d of definitions) {
    it(`${d.id}: exhausts every index, prompt and answer against independent oracles`, () => {
      expect(d.domainSize).toBe(counts[d.id]);
      const parameterKeys = new Set<string>(),
        texts = new Set<string>(),
        latex = new Set<string>();
      let index = 0;
      for (const expectedParameters of specification(d.id)) {
        const c = d.problemAt(index);
        const key = c.parameters.join(",");
        if (key !== expectedParameters.join(",") || parameterKeys.has(key))
          throw new Error(`index mapping ${d.id}[${index}]`);
        if (c.prompt.layout !== "math") throw new Error("unexpected layout");
        if (texts.has(c.prompt.text) || latex.has(c.prompt.latex))
          throw new Error(`duplicate display ${d.id}[${index}]`);
        if (readPrompt(d.id, c).join(",") !== key)
          throw new Error("prompt/parameters mismatch");
        if (decodeLatex(d.id, c.prompt.latex) !== c.prompt.text)
          throw new Error("latex/text mismatch");
        const exact = oracle(d.id, expectedParameters);
        if (JSON.stringify(c.answer.exact) !== JSON.stringify(exact))
          throw new Error(`wrong oracle answer ${d.id}[${index}]`);
        if (
          c.answer.text !== display(c.answer.kind, exact, false) ||
          c.answer.latex !== display(c.answer.kind, exact, true)
        )
          throw new Error("answer display mismatch");
        if (!d.verify(c))
          throw new Error(`verification failed ${d.id}[${index}]`);
        parameterKeys.add(key);
        texts.add(c.prompt.text);
        latex.add(c.prompt.latex);
        index++;
      }
      expect(index).toBe(d.domainSize);
      expect(texts.size).toBe(index);
      expect(latex.size).toBe(index);
    });

    it(`${d.id}: is deterministic, rejects boundary indexes and renders valid math`, () => {
      for (const i of [0, 1, Math.floor(d.domainSize / 2), d.domainSize - 1]) {
        const c = d.problemAt(i);
        expect(d.problemAt(i)).toEqual(c);
        expect(d.verify(JSON.parse(JSON.stringify(c)))).toBe(true);
        if (c.prompt.layout !== "math") throw new Error("unexpected layout");
        const promptLatex = c.prompt.latex;
        expect(() =>
          katex.renderToString(promptLatex, {
            throwOnError: true,
            strict: "error",
          }),
        ).not.toThrow();
        expect(() =>
          katex.renderToString(c.answer.latex, {
            throwOnError: true,
            strict: "error",
          }),
        ).not.toThrow();
      }
      for (const i of [
        -1,
        0.5,
        NaN,
        Infinity,
        -Infinity,
        d.domainSize,
        Number.MAX_SAFE_INTEGER,
      ])
        expect(() => d.problemAt(i)).toThrow(RangeError);
      const c = d.problemAt(0);
      const spy = vi.spyOn(d, "problemAt").mockImplementation(() => {
        throw new Error("generator called by verifier");
      });
      try {
        expect(d.verify(c)).toBe(true);
      } finally {
        spy.mockRestore();
      }
    });

    it(`${d.id}: rejects parameter, display, kind and mathematically coherent answer tampering`, () => {
      const c = d.problemAt(0);
      expect(d.verify({ ...c, parameters: d.problemAt(1).parameters })).toBe(
        false,
      );
      expect(d.verify({ ...c, parameters: c.parameters.map(() => 0) })).toBe(
        false,
      );
      expect(
        d.verify({ ...c, prompt: { ...c.prompt, instruction: "tampered" } }),
      ).toBe(false);
      expect(
        d.verify({
          ...c,
          prompt: { ...c.prompt, layout: "math", text: "0", latex: "0" },
        }),
      ).toBe(false);
      const integerKind = c.answer.kind === "integer";
      // A different kind with the same exact strings must not pass.
      for (const kind of integerKind
        ? (["rational", "surd", "polynomial", "decimal"] as const)
        : (["integer"] as const))
        expect(d.verify({ ...c, answer: { ...c.answer, kind } })).toBe(false);
      expect(
        d.verify({
          ...c,
          answer: { ...c.answer, text: `${c.answer.text} + 1` },
        }),
      ).toBe(false);
      expect(
        d.verify({
          ...c,
          answer: { ...c.answer, latex: `${c.answer.latex} + 1` },
        }),
      ).toBe(false);
      // Negate the coefficient (triple kinds) or the value itself (integer kinds):
      // mathematically coherent, consistently displayed, and wrong.
      const exact = [...c.answer.exact];
      const negated = integerKind ? 0 : 1;
      exact[negated] = String(-Number(exact[negated]));
      expect(d.verify(withExact(c, exact))).toBe(false);
      if (integerKind) {
        for (const value of [
          Number(c.answer.exact[0]) + 1,
          Number(c.answer.exact[0]) - 1,
          Number(c.answer.exact[0]) * 2,
        ])
          expect(d.verify(withExact(c, [String(value)]))).toBe(false);
      }
      expect(d.verify(withExact(c, []))).toBe(false);
      expect(d.verify(withExact(c, c.answer.exact.slice(3)))).toBe(false);
      const extra = integerKind
        ? [...c.answer.exact, "1"]
        : d.strand === "근호"
          ? [...c.answer.exact, "143", "1", "1"]
          : ["12", "1", "1", ...c.answer.exact];
      expect(d.verify(withExact(c, extra))).toBe(false);
    });

    it(`${d.id}: rejects invalid denominators, noncanonical triples and malformed payloads`, () => {
      const c = d.problemAt(0);
      for (const denominator of [
        "0",
        "-1",
        "1.5",
        "01",
        "1e0",
        "",
        "1".repeat(41),
      ]) {
        const exact = [...c.answer.exact];
        exact[2] = denominator;
        expect(d.verify({ ...c, answer: { ...c.answer, exact } })).toBe(false);
      }
      const unreduced = [...c.answer.exact];
      unreduced[1] = String(Number(unreduced[1]) * 2);
      unreduced[2] = String(Number(unreduced[2]) * 2);
      expect(d.verify(withExact(c, unreduced))).toBe(false);
      for (const numerator of ["0", "-0", "+1", "01", "1.1", "NaN"]) {
        const exact = [...c.answer.exact];
        exact[1] = numerator;
        expect(d.verify({ ...c, answer: { ...c.answer, exact } })).toBe(false);
      }
      for (const key of [
        "-1",
        "01",
        "1.5",
        d.strand === "근호" ? "0" : "13",
        "145",
        "9999999999999999999999999999",
      ]) {
        const exact = [...c.answer.exact];
        exact[0] = key;
        expect(d.verify({ ...c, answer: { ...c.answer, exact } })).toBe(false);
      }
      const duplicate = [...c.answer.exact, ...c.answer.exact.slice(0, 3)];
      expect(d.verify(withExact(c, duplicate))).toBe(false);
      // A single field is malformed for triple kinds; for integer kinds the
      // malformed shape is two fields (the answer at index 0 may itself be 1).
      expect(
        d.verify({
          ...c,
          answer: {
            ...c.answer,
            exact: c.answer.kind === "integer" ? ["1", "1"] : ["1"],
          },
        }),
      ).toBe(false);
      if (c.answer.kind === "integer")
        for (const value of ["-0", "+1", "01", "1.0", "1e0", "", " 1", "NaN"])
          expect(
            d.verify({ ...c, answer: { ...c.answer, exact: [value] } }),
          ).toBe(false);
      expect(
        d.verify({
          ...c,
          answer: { ...c.answer, exact: new Array<string>(3) },
        }),
      ).toBe(false);
      expect(
        d.verify({
          ...c,
          answer: { ...c.answer, exact: new Array<string>(1000000) },
        }),
      ).toBe(false);
      for (const parameters of [
        [],
        new Array<number>(c.parameters.length),
        new Array<number>(1000000),
        [NaN],
        [Infinity],
        [-0],
        [0.5],
      ])
        expect(d.verify({ ...c, parameters })).toBe(false);
      for (const bad of [
        null,
        {},
        { ...c, answer: null },
        { ...c, parameters: "0" },
      ])
        expect(d.verify(bad as ArithmeticV2Candidate)).toBe(false);
    });
  }

  it.each([
    [
      "m1-linear-scalar-multiply",
      [2, 3, -4],
      "2(3x - 4)",
      ["1", "6", "1", "0", "-8", "1"],
      "6x - 8",
    ],
    [
      "m1-linear-scalar-divide",
      [3, 6, -9],
      "(6x - 9)/(3)",
      ["1", "2", "1", "0", "-3", "1"],
      "2x - 3",
    ],
    [
      "m1-linear-scalar-divide",
      [-4, 3, -9],
      "(3x - 9)/(-4)",
      ["1", "-3", "4", "0", "9", "4"],
      "-(3/4)x + 9/4",
    ],
    [
      "m1-rational-like-terms",
      [1, 2, 1, 3],
      "(1/2)x + (1/3)x",
      ["1", "5", "6"],
      "(5/6)x",
    ],
    ["m1-rational-like-terms", [-1, 2, 1, 2], "(-1/2)x + (1/2)x", [], "0"],
    [
      "m1-rational-like-terms",
      [3, 2, 1, 2],
      "(3/2)x + (1/2)x",
      ["1", "2", "1"],
      "2x",
    ],
    ["m2-monomial-power", [-2, 2, 3], "(-2x^2)^3", ["6", "-8", "1"], "-8x^6"],
    [
      "m2-monomial-power",
      [-5, 3, 4],
      "(-5x^3)^4",
      ["12", "625", "1"],
      "625x^12",
    ],
    [
      "m3-radical-three-terms",
      [1, 8, 1, 3, -1, 2],
      "√8 + √3 - √2",
      ["2", "1", "1", "3", "1", "1"],
      "√2 + √3",
    ],
    [
      "m3-radical-three-terms",
      [1, 2, 1, 3, 1, 5],
      "√2 + √3 + √5",
      ["2", "1", "1", "3", "1", "1", "5", "1", "1"],
      "√2 + √3 + √5",
    ],
    ["m3-radical-three-terms", [1, 8, -1, 2, -1, 2], "√8 - √2 - √2", [], "0"],
    [
      "m3-radical-three-terms",
      [1, 4, -1, 8, 1, 2],
      "√4 - √8 + √2",
      ["1", "2", "1", "2", "-1", "1"],
      "2 - √2",
    ],
    [
      "m3-radical-distribute",
      [1, 2, 1, 3, 2],
      "√2(√3 + 2)",
      ["2", "2", "1", "6", "1", "1"],
      "2√2 + √6",
    ],
    [
      "m3-radical-distribute",
      [-1, 8, 2, 2, -3],
      "-√8(2√2 - 3)",
      ["1", "-8", "1", "2", "6", "1"],
      "-8 + 6√2",
    ],
    // 2026-10-16 중3 square-root drills, worked by hand.
    ["m3-sqrt-natural-multiplier", [0, 12], "√(12x)", ["3"], "3"],
    ["m3-sqrt-natural-multiplier", [1, 12], "√(12/x)", ["3"], "3"],
    ["m3-sqrt-natural-multiplier", [0, 2], "√(2x)", ["2"], "2"],
    ["m3-sqrt-natural-multiplier", [1, 120], "√(120/x)", ["30"], "30"],
    ["m3-sqrt-integer-part", [2, 0], "√2", ["1"], "1"],
    ["m3-sqrt-integer-part", [99, 3], "√99 + 3", ["12"], "12"],
    ["m3-sqrt-integer-part", [120, 0], "√120", ["10"], "10"],
    [
      "m3-sqrt-decimal-part",
      [2, 0],
      "√2",
      ["1", "-1", "1", "2", "1", "1"],
      "-1 + √2",
    ],
    [
      "m3-sqrt-decimal-part",
      [8, 2],
      "√8 + 2",
      ["1", "-2", "1", "2", "2", "1"],
      "-2 + 2√2",
    ],
    [
      "m3-sqrt-decimal-part",
      [120, 1],
      "√120 + 1",
      ["1", "-10", "1", "30", "2", "1"],
      "-10 + 2√30",
    ],
    ["m3-sqrt-integers-between", [2, 5], "√2 ＜ n ＜ √5", ["1"], "1"],
    ["m3-sqrt-integers-between", [3, 26], "√3 ＜ n ＜ √26", ["4"], "4"],
    ["m3-sqrt-integers-between", [40, 99], "√40 ＜ n ＜ √99", ["3"], "3"],
    [
      "m3-radical-mixed",
      [2, 3, 1, 2],
      "√2 × √3 + 1/(√2)",
      ["2", "1", "2", "6", "1", "1"],
      "√2/2 + √6",
    ],
    [
      "m3-radical-mixed",
      [2, 8, -3, 2],
      "√2 × √8 - 3/(√2)",
      ["1", "4", "1", "2", "-3", "2"],
      "4 - 3√2/2",
    ],
    [
      "m3-radical-mixed",
      [3, 6, 6, 2],
      "√3 × √6 + 6/(√2)",
      ["2", "6", "1"],
      "6√2",
    ],
  ] as [string, number[], string, string[], string][])(
    "hand-calculated gap: %s %j",
    (id, parameters, text, exact, answer) => {
      const c = example(id, parameters);
      expect(c.prompt).toMatchObject({ layout: "math", text });
      expect(c.answer.exact).toEqual(exact);
      expect(c.answer.text).toBe(answer);
      expect(definition(id).verify(c)).toBe(true);
    },
  );

  it("rejects non-squarefree, unsorted, missing, extra and wrong-sign multi-term surds", () => {
    const d = definition("m3-radical-three-terms");
    const c = example(d.id, [1, 8, 1, 3, -1, 2]);
    for (const exact of [
      ["8", "1", "2", "3", "1", "1"], // equivalent radical before normalization
      ["3", "1", "1", "2", "1", "1"], // reversed basis order
      ["2", "1", "1"],
      ["2", "1", "1", "3", "1", "1", "5", "1", "1"],
      ["2", "-1", "1", "3", "-1", "1"],
      ["2", "1", "1", "3", "1", "2"],
    ])
      expect(d.verify(withExact(c, exact))).toBe(false);
  });

  it("rejects out-of-domain coefficient denominators even with a matching forged prompt", () => {
    const d = definition("m1-rational-like-terms");
    const c = example(d.id, [1, 2, 1, 3]);
    for (const denominator of [0, -2, 1, 7, 2.5, NaN]) {
      const forged = {
        ...c,
        parameters: [1, denominator, 1, 3],
        prompt: {
          ...c.prompt,
          layout: "math" as const,
          text: `(1/${denominator})x + (1/3)x`,
          latex: `\\left(\\frac{1}{${denominator}}\\right)x + \\left(\\frac{1}{3}\\right)x`,
        },
      };
      expect(d.verify(forged)).toBe(false);
    }
    expect(
      definition("m1-linear-scalar-divide").verify({
        ...example("m1-linear-scalar-divide", [3, 6, -9]),
        parameters: [0, 6, -9],
      }),
    ).toBe(false);
  });
});
