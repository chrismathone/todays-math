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
function oracle(id: string, p: number[]): string[] {
  const [a, b, c, d, e, f] = p;
  const op = id.split("-").at(-1);
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
};
function member(id: string, p: number[]): boolean {
  const within = (n: number, limit: number, nonzero = false) =>
    Math.abs(n) <= limit && (!nonzero || n !== 0);
  const [a, b, c, d, e, f] = p;
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
  } else {
    const actual = candidate.prompt.text.match(/-?\d+/g)?.map(Number);
    // Unit radical coefficients are intentionally not printed.
    if (
      !id.startsWith("m3-radical-") &&
      JSON.stringify(actual) !== JSON.stringify(candidate.parameters)
    )
      throw new Error("numeric prompt/parameter mismatch");
  }
}

describe("middle arithmetic v2 finite exact families", () => {
  it("publishes exactly the scoped IDs, grades and explicit peer groups", () => {
    expect(definitions.map((d) => d.id).sort()).toEqual(
      Object.keys(countById).sort(),
    );
    expect(definitions.filter((d) => d.grade === "중1")).toHaveLength(13);
    expect(definitions.filter((d) => d.grade === "중2")).toHaveLength(6);
    expect(definitions.filter((d) => d.grade === "중3")).toHaveLength(7);
    expect(new Set(definitions.map((d) => d.rankGroup)).size).toBe(8);
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
        expect(() =>
          katex.renderToString(candidate.prompt.latex, {
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
        expect(definition.verify(bad as ArithmeticV2Candidate)).toBe(false);
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
