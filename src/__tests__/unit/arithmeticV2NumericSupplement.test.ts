import { describe, expect, it, vi } from "vitest";
import katex from "katex";
import { NUMERIC_SUPPLEMENT_DEFINITIONS as definitions } from "@/lib/arithmetic-v2/families/middle/numericSupplement";
import { NUMERIC_DEFINITIONS } from "@/lib/arithmetic-v2/families/middle/numeric";
import type {
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
} from "@/lib/arithmetic-v2/types";

// Independent oracle: parse the displayed arithmetic, use bounded safe integer
// pairs, and reduce by trial divisors. No production arithmetic helpers or eval.
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
function evaluate(text: string): Q {
  const compact = text.replaceAll(" ", "");
  const tokens = compact.match(/\d+|[()+\-×÷/]/g) ?? [];
  if (tokens.join("") !== compact) throw new Error(`Bad oracle input: ${text}`);
  let position = 0;
  function atom(): Q {
    const token = tokens[position++];
    if (token === "-") {
      const [n, d] = atom();
      return [-n, d];
    }
    if (token === "(") {
      const value = sum();
      if (tokens[position++] !== ")")
        throw new Error("Missing closing parenthesis");
      return value;
    }
    if (!/^\d+$/.test(token ?? "")) throw new Error("Missing numeric operand");
    return [Number(token), 1];
  }
  function product(): Q {
    let value = atom();
    while (["×", "÷", "/"].includes(tokens[position])) {
      const op = tokens[position++],
        right = atom();
      value =
        op === "×"
          ? reduced(value[0] * right[0], value[1] * right[1])
          : reduced(value[0] * right[1], value[1] * right[0]);
    }
    return value;
  }
  function sum(): Q {
    let value = product();
    while (["+", "-"].includes(tokens[position])) {
      const op = tokens[position++],
        right = product();
      value = reduced(
        value[0] * right[1] + (op === "+" ? 1 : -1) * right[0] * value[1],
        value[1] * right[1],
      );
    }
    return value;
  }
  const value = sum();
  if (position !== tokens.length) throw new Error("Trailing oracle input");
  return reduced(...value);
}
function answerFor([n, d]: Q): ArithmeticV2Answer {
  return {
    kind: "rational",
    exact: [String(n), String(d)],
    text: d === 1 ? String(n) : `${n}/${d}`,
    latex:
      d === 1 ? String(n) : `${n < 0 ? "-" : ""}\\frac{${Math.abs(n)}}{${d}}`,
  };
}
function plainLatex(latex: string): string {
  return latex
    .replace(/\\left|\\right/g, "")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "$1/$2");
}
function member(id: string, p: number[]): boolean {
  const integer = (n: number, bound: number, nonzero = false) =>
    Number.isSafeInteger(n) &&
    !Object.is(n, -0) &&
    Math.abs(n) <= bound &&
    (!nonzero || n !== 0);
  const fraction = (n: number, d: number) =>
    integer(n, 6, true) &&
    Number.isInteger(d) &&
    d >= 2 &&
    d <= 6 &&
    reduced(n, d)[1] === d;
  if (id === "m1-integer-rational-quotient")
    return (
      p.length === 2 &&
      integer(p[0], 12) &&
      integer(p[1], 12, true) &&
      p[0] % p[1] !== 0
    );
  if (id === "m1-numeric-precedence")
    return (
      p.length === 4 &&
      [0, 1, 2, 3].includes(p[0]) &&
      integer(p[1], 9) &&
      integer(p[2], 9, true) &&
      integer(p[3], 9, true)
    );
  if (id === "m1-rational-grouped-expression")
    return (
      p.length === 6 &&
      [0, 1, 2, 3].includes(p[0]) &&
      fraction(p[1], p[2]) &&
      fraction(p[3], p[4]) &&
      integer(p[5], 6, true)
    );
  return (
    p.length === 4 &&
    integer(p[0], 9, id.endsWith("divide")) &&
    fraction(p[1], p[2]) &&
    (id.endsWith("subtract") || id.endsWith("divide")
      ? [0, 1].includes(p[3])
      : p[3] === 0)
  );
}

const expectedDomains: Record<string, [number, number[], number[]]> = {
  "m1-integer-rational-quotient": [436, [-12, -11], [12, 11]],
  "m1-integer-fraction-add": [646, [-9, -6, 5, 0], [9, 6, 5, 0]],
  "m1-integer-fraction-subtract": [1292, [-9, -6, 5, 0], [9, 6, 5, 1]],
  "m1-integer-fraction-multiply": [646, [-9, -6, 5, 0], [9, 6, 5, 0]],
  "m1-integer-fraction-divide": [1224, [-9, -6, 5, 0], [9, 6, 5, 1]],
  "m1-numeric-precedence": [24624, [0, -9, -9, -9], [3, 9, 9, 9]],
  "m1-rational-grouped-expression": [
    55488,
    [0, -6, 5, -6, 5, -6],
    [3, 6, 5, 6, 5, 6],
  ],
};
function definitionFor(id: string) {
  const definition = definitions.find((d) => d.id === id);
  if (!definition) throw new Error(`Missing definition ${id}`);
  return definition;
}
function find(id: string, parameters: number[]): ArithmeticV2Candidate {
  const definition = definitionFor(id);
  for (let i = 0; i < definition.domainSize; i++) {
    const candidate = definition.problemAt(i);
    if (candidate.parameters.join(",") === parameters.join(","))
      return candidate;
  }
  throw new Error(`Missing parameters in ${id}: ${parameters}`);
}

describe("numeric supplements: exact finite domains and independent displayed oracle", () => {
  it("adds seven distinct task shapes without replacing original numeric IDs", () => {
    expect(definitions.map((d) => d.id)).toEqual(Object.keys(expectedDomains));
    expect(definitions.reduce((count, d) => count + d.domainSize, 0)).toBe(
      84356,
    );
    const oldIds = new Set(NUMERIC_DEFINITIONS.map((d) => d.id));
    for (const definition of definitions) {
      expect(oldIds.has(definition.id)).toBe(false);
      expect(definition.grade).toBe("중1");
      expect(definition.strand).toBe("정수·유리수");
    }
  });

  for (const definition of definitions) {
    it(`${definition.id}: exhausts the domain, checks membership, exact answers and unique text/LaTeX`, () => {
      const [count, first, last] = expectedDomains[definition.id];
      expect(definition.domainSize).toBe(count);
      expect(Number.isSafeInteger(count)).toBe(true);
      expect(definition.problemAt(0).parameters).toEqual(first);
      expect(definition.problemAt(count - 1).parameters).toEqual(last);
      const keys = new Set<string>(),
        texts = new Set<string>(),
        latex = new Set<string>();
      for (let index = 0; index < count; index++) {
        const candidate = definition.problemAt(index);
        if (!member(definition.id, candidate.parameters))
          throw new Error(`Invalid member ${index}`);
        if (!definition.verify(candidate))
          throw new Error(`Verification rejected ${index}`);
        if (candidate.prompt.layout !== "math")
          throw new Error("Non-math prompt");
        const expected = answerFor(evaluate(candidate.prompt.text));
        if (JSON.stringify(expected) !== JSON.stringify(candidate.answer))
          throw new Error(`Wrong answer at ${index}`);
        if (plainLatex(candidate.prompt.latex) !== candidate.prompt.text)
          throw new Error(`Text/LaTeX mismatch at ${index}`);
        keys.add(candidate.parameters.join(","));
        texts.add(candidate.prompt.text);
        latex.add(candidate.prompt.latex);
      }
      expect([keys.size, texts.size, latex.size]).toEqual([
        count,
        count,
        count,
      ]);
    });

    it(`${definition.id}: deterministic indices, independent verification, valid KaTeX`, () => {
      const indexes = [
        0,
        1,
        Math.floor(definition.domainSize / 4),
        Math.floor(definition.domainSize / 2),
        definition.domainSize - 1,
      ];
      for (const index of indexes) {
        const candidate = definition.problemAt(index);
        expect(definition.problemAt(index)).toEqual(candidate);
        if (candidate.prompt.layout !== "math")
          throw new Error("Non-math prompt");
        const latex = candidate.prompt.latex;
        expect(() =>
          katex.renderToString(latex, { throwOnError: true }),
        ).not.toThrow();
        expect(() =>
          katex.renderToString(candidate.answer.latex, { throwOnError: true }),
        ).not.toThrow();
        const generator = vi
          .spyOn(definition, "problemAt")
          .mockImplementation(() => {
            throw new Error("Verification called generator");
          });
        try {
          expect(definition.verify(candidate)).toBe(true);
        } finally {
          generator.mockRestore();
        }
      }
      for (const index of [
        -1,
        0.25,
        NaN,
        Infinity,
        -Infinity,
        definition.domainSize,
        Number.MAX_SAFE_INTEGER,
      ])
        expect(() => definition.problemAt(index)).toThrow(RangeError);
      const original = definition.problemAt(0);
      const changed = definition.problemAt(0);
      changed.parameters.fill(999);
      changed.answer.exact.fill("999");
      expect(definition.problemAt(0)).toEqual(original);
    });
  }
});

describe("hand-checked numeric gaps and all operation templates", () => {
  it.each([
    ["m1-integer-rational-quotient", [-3, 2], "(-3) ÷ 2", [-3, 2]],
    ["m1-integer-rational-quotient", [-3, -2], "(-3) ÷ (-2)", [3, 2]],
    ["m1-integer-fraction-add", [-2, 1, 3, 0], "(-2) + 1/3", [-5, 3]],
    ["m1-integer-fraction-add", [0, -1, 2, 0], "0 + (-1/2)", [-1, 2]],
    ["m1-integer-fraction-subtract", [-2, 1, 3, 0], "(-2) - 1/3", [-7, 3]],
    ["m1-integer-fraction-subtract", [-2, 1, 3, 1], "1/3 - (-2)", [7, 3]],
    ["m1-integer-fraction-multiply", [-2, 3, 2, 0], "(-2) × 3/2", [-3, 1]],
    ["m1-integer-fraction-multiply", [0, -1, 2, 0], "0 × (-1/2)", [0, 1]],
    ["m1-integer-fraction-divide", [-2, 1, 3, 0], "(-2) ÷ (1/3)", [-6, 1]],
    ["m1-integer-fraction-divide", [-2, 1, 3, 1], "1/3 ÷ (-2)", [-1, 6]],
    ["m1-numeric-precedence", [0, -3, 2, -4], "(-3) + 2 × (-4)", [-11, 1]],
    ["m1-numeric-precedence", [1, -3, 2, -4], "(-3) - 2 × (-4)", [5, 1]],
    ["m1-numeric-precedence", [2, -3, 2, -4], "(-3) + 2 ÷ (-4)", [-7, 2]],
    ["m1-numeric-precedence", [3, -3, 2, -4], "(-3) - 2 ÷ (-4)", [-5, 2]],
    ["m1-numeric-precedence", [0, -6, 2, 3], "(-6) + 2 × 3", [0, 1]],
    [
      "m1-rational-grouped-expression",
      [0, -1, 2, 3, 4, -2],
      "((-1/2) + 3/4) × (-2)",
      [-1, 2],
    ],
    [
      "m1-rational-grouped-expression",
      [1, -1, 2, 3, 4, -2],
      "((-1/2) - 3/4) × (-2)",
      [5, 2],
    ],
    [
      "m1-rational-grouped-expression",
      [2, -1, 2, 3, 4, -2],
      "((-1/2) + 3/4) ÷ (-2)",
      [-1, 8],
    ],
    [
      "m1-rational-grouped-expression",
      [3, -1, 2, 3, 4, -2],
      "((-1/2) - 3/4) ÷ (-2)",
      [5, 8],
    ],
    [
      "m1-rational-grouped-expression",
      [2, -1, 2, 1, 2, -2],
      "((-1/2) + 1/2) ÷ (-2)",
      [0, 1],
    ],
  ] as [string, number[], string, Q][])(
    "%s %j",
    (id, parameters, text, value) => {
      const candidate = find(id, parameters);
      expect(candidate.prompt).toMatchObject({
        text,
        instruction: "계산하시오.",
      });
      expect(candidate.answer).toEqual(answerFor(value));
      expect(definitionFor(id).verify(candidate)).toBe(true);
    },
  );

  it("keeps rightmost-axis indexing stable across template boundaries", () => {
    const group = definitionFor("m1-rational-grouped-expression");
    expect(group.problemAt(1).parameters).toEqual([0, -6, 5, -6, 5, -5]);
    expect(group.problemAt(12).parameters).toEqual([0, -6, 5, -5, 2, -6]);
    expect(group.problemAt(34 * 12).parameters).toEqual([0, -5, 2, -6, 5, -6]);
    expect(group.problemAt(34 * 34 * 12).parameters).toEqual([
      1, -6, 5, -6, 5, -6,
    ]);
    const precedence = definitionFor("m1-numeric-precedence");
    expect(precedence.problemAt(19 * 18 * 18).parameters).toEqual([
      1, -9, -9, -9,
    ]);
  });
});

describe("rejects malformed candidates, zero divisors and tampered display", () => {
  for (const definition of definitions) {
    it(`${definition.id}: hostile answer and prompt shapes fail closed`, () => {
      const candidate = definition.problemAt(
        Math.floor(definition.domainSize / 3),
      );
      if (candidate.prompt.layout !== "math")
        throw new Error("Non-math prompt");
      const [n, d] = candidate.answer.exact.map(Number);
      const invalidAnswers: unknown[] = [
        null,
        {},
        { ...candidate.answer, kind: "integer" },
        { ...candidate.answer, exact: null },
        { ...candidate.answer, exact: "1" },
        { ...candidate.answer, exact: [] },
        { ...candidate.answer, exact: new Array(2) },
        { ...candidate.answer, exact: [String(n), "0"] },
        { ...candidate.answer, exact: [String(-n), String(-d)] },
        { ...candidate.answer, exact: [String(n * 2), String(d * 2)] },
        { ...candidate.answer, exact: ["01", String(d)] },
        { ...candidate.answer, exact: ["-0", "1"] },
        { ...candidate.answer, exact: ["1.0", "1"] },
        { ...candidate.answer, exact: ["1e2", "1"] },
        { ...candidate.answer, exact: ["+1", "1"] },
        { ...candidate.answer, exact: [" 1", "1"] },
        { ...candidate.answer, exact: ["9".repeat(41), "1"] },
        { ...candidate.answer, exact: [1, 1] },
        { ...candidate.answer, exact: [String(n), String(d), "1"] },
        { ...candidate.answer, text: "wrong" },
        { ...candidate.answer, latex: "wrong" },
        answerFor(reduced(n + d, d)),
      ];
      for (const answer of invalidAnswers)
        expect(
          definition.verify({ ...candidate, answer } as ArithmeticV2Candidate),
        ).toBe(false);
      const invalidPrompts: unknown[] = [
        null,
        {},
        { ...candidate.prompt, text: "1 + 1" },
        { ...candidate.prompt, latex: "1+1" },
        { ...candidate.prompt, instruction: "다른 문제" },
        { ...candidate.prompt, layout: "vertical" },
        { ...candidate.prompt, extra: "hidden" },
      ];
      for (const prompt of invalidPrompts)
        expect(
          definition.verify({ ...candidate, prompt } as ArithmeticV2Candidate),
        ).toBe(false);
      const invalidParameters: unknown[] = [
        null,
        "bad",
        [],
        new Array(candidate.parameters.length),
        new Array(1000),
        [...candidate.parameters, 1],
        ...[
          NaN,
          Infinity,
          -Infinity,
          -0,
          0.5,
          Number.MAX_SAFE_INTEGER + 1,
          "1",
        ].map((n) => [n, ...candidate.parameters.slice(1)]),
      ];
      for (const parameters of invalidParameters)
        expect(
          definition.verify({
            ...candidate,
            parameters,
          } as ArithmeticV2Candidate),
        ).toBe(false);
      for (const value of [null, undefined, {}, { parameters: [] }])
        expect(
          definition.verify(value as unknown as ArithmeticV2Candidate),
        ).toBe(false);
    });
  }

  it.each([
    ["m1-integer-rational-quotient", [-3, 0]],
    ["m1-integer-rational-quotient", [6, 3]],
    ["m1-integer-rational-quotient", [13, 2]],
    ["m1-integer-fraction-add", [-2, 1, 0, 0]],
    ["m1-integer-fraction-add", [-2, 1, -3, 0]],
    ["m1-integer-fraction-add", [-2, 2, 4, 0]],
    ["m1-integer-fraction-add", [-2, 0, 3, 0]],
    ["m1-integer-fraction-add", [-2, 1, 3, 1]],
    ["m1-integer-fraction-subtract", [-2, 1, 7, 0]],
    ["m1-integer-fraction-subtract", [-2, 1, 3, 2]],
    ["m1-integer-fraction-multiply", [-2, 1, 1, 0]],
    ["m1-integer-fraction-multiply", [10, 1, 3, 0]],
    ["m1-integer-fraction-divide", [0, 1, 3, 1]],
    ["m1-integer-fraction-divide", [-2, 0, 3, 0]],
    ["m1-integer-fraction-divide", [-2, 1, 0, 0]],
    ["m1-numeric-precedence", [2, -3, 2, 0]],
    ["m1-numeric-precedence", [4, -3, 2, -4]],
    ["m1-numeric-precedence", [0, -10, 2, -4]],
    ["m1-rational-grouped-expression", [2, -1, 0, 3, 4, -2]],
    ["m1-rational-grouped-expression", [2, -1, 2, 3, 0, -2]],
    ["m1-rational-grouped-expression", [2, -1, 2, 3, 4, 0]],
    ["m1-rational-grouped-expression", [2, -1, 2, 3, 4, 7]],
    ["m1-rational-grouped-expression", [2, -2, 4, 3, 4, -2]],
    ["m1-rational-grouped-expression", [2, -1, 2, 2, 4, -2]],
  ] as [string, number[]][])(
    "%s rejects out-of-domain %j",
    (id, parameters) => {
      const definition = definitionFor(id);
      expect(
        definition.verify({ ...definition.problemAt(0), parameters }),
      ).toBe(false);
    },
  );
});
