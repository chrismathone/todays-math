import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import katex from "katex";
import { TRIGONOMETRY_COMPLETE_DEFINITIONS as definitions } from "../../lib/arithmetic-v2/families/trigonometryComplete";
import { TRIG_FAMILIES } from "../../lib/arithmetic-v2/families/geometryMeasure/trig";
import { buildFamily } from "../../lib/arithmetic-v2/families/geometryMeasure/core";
import {
  arithmeticV2CandidateSchema,
  arithmeticV2PromptIdentity,
} from "../../contracts/arithmeticV2.contract";
import type {
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
} from "../../lib/arithmetic-v2/types";

const abs = (n: bigint) => (n < BigInt(0) ? -n : n);
function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return abs(a);
}
function expected(
  n: bigint,
  d = BigInt(1),
  r = BigInt(1),
): { kind: string; exact: string[] } {
  // Largest square divisor, separate from production incremental extraction.
  let largest = BigInt(1);
  for (let f = BigInt(2); f * f <= r; f++)
    if (r % (f * f) === BigInt(0)) largest = f;
  n *= largest;
  r /= largest * largest;
  const g = gcd(n, d);
  n /= g;
  d /= g;
  if (!n) return { kind: "integer", exact: ["0"] };
  return r === BigInt(1)
    ? d === BigInt(1)
      ? { kind: "integer", exact: [String(n)] }
      : { kind: "rational", exact: [String(n), String(d)] }
    : { kind: "surd", exact: [n, r, d].map(String) };
}
function compare(
  answer: ArithmeticV2Answer,
  n: bigint,
  d = BigInt(1),
  r = BigInt(1),
) {
  assert.deepEqual(
    { kind: answer.kind, exact: answer.exact },
    expected(n, d, r),
  );
}
function oracle(id: string, p: number[], answer: ArithmeticV2Answer) {
  const [n, d, g, t] = p,
    [N, D, G, T] = p.map(BigInt);
  if (id === "m3-trig-endpoint-values") {
    compare(answer, BigInt(n === 0 ? (d === 1 ? 1 : 0) : d === 0 ? 1 : 0));
    return;
  }
  if (id === "m3-trig-inverse-special-angle") {
    compare(answer, N);
    return;
  }
  if (id === "m3-trig-complementary-ratio") {
    compare(answer, N, D);
    return;
  }
  if (id === "m3-trig-ratio-from-another") {
    // Triangle side squares (opposite, adjacent, hypotenuse), reconstructed
    // directly from the supplied side ratio, including tan greater than one.
    const squares =
      g === 0
        ? [N * N, D * D - N * N, D * D]
        : g === 1
          ? [D * D - N * N, N * N, D * D]
          : [N * N, D * D, N * N + D * D];
    const numerator = squares[t === 1 ? 1 : 0],
      denominator = squares[t === 2 ? 1 : 2];
    compare(answer, BigInt(1), denominator, numerator * denominator);
    return;
  }
  if (id === "m3-trig-length-given-ratio") {
    const roles = [
      ["hyp", "opp", "sin"],
      ["hyp", "adj", "cos"],
      ["opp", "hyp", "sin"],
      ["adj", "hyp", "cos"],
      ["adj", "opp", "tan"],
      ["opp", "adj", "tan"],
    ];
    const [given, , ratio] = roles[g],
      numerator = ratio === "cos" ? "adj" : "opp";
    compare(
      answer,
      given === numerator ? T * D : T * N,
      given === numerator ? N : D,
    );
    return;
  }
  if (id === "m3-trig-area-given-sine") {
    compare(answer, G * T * N, BigInt(2) * D);
    return;
  }
  if (id === "m3-trig-side-from-area-sine") {
    compare(answer, BigInt(2) * T * D, G * N);
    return;
  }
  if (id === "m3-trig-sine-from-area") {
    compare(answer, BigInt(2) * G, N * D);
    return;
  }
  if (id === "m3-trig-special-squared-arithmetic") {
    // Exact special-value squares, no transcendental evaluation or production helpers.
    const values: Record<number, number[][]> = {
      30: [
        [1, 4],
        [3, 4],
        [1, 3],
      ],
      45: [
        [1, 2],
        [1, 2],
        [1, 1],
      ],
      60: [
        [3, 4],
        [1, 4],
        [3, 1],
      ],
    };
    const [a, b] = values[n][d].map(BigInt),
      [c, e] = values[g][t].map(BigInt);
    compare(
      answer,
      a * e + (p[4] === 0 ? BigInt(1) : BigInt(-1)) * b * c,
      b * e,
    );
    return;
  }
  if (id === "m3-trig-special-expression") {
    // Term code t: angle [30, 45, 60][t ÷ 3], ratio [sin, cos, tan][t mod 3].
    // Exact special values as n√r/d, written out rather than looked up in code.
    const special: [number, number, number][] = [
      [1, 1, 2], // sin 30°
      [1, 3, 2], // cos 30°
      [1, 3, 3], // tan 30° = 1/√3 = √3/3
      [1, 2, 2], // sin 45°
      [1, 2, 2], // cos 45°
      [1, 1, 1], // tan 45°
      [1, 3, 2], // sin 60°
      [1, 1, 2], // cos 60°
      [1, 3, 1], // tan 60°
    ];
    const [t1, t2, t3, plus, divide] = p;
    const [n1, r1, d1] = special[t1],
      [n2, r2, d2] = special[t2],
      [n3, r3, d3] = special[t3];
    // Product n2 n3 √(r2 r3) / (d2 d3); quotient n2 d3 √(r2 r3) / (d2 n3 r3).
    const part =
      divide === 0
        ? [n2 * n3, r2 * r3, d2 * d3]
        : [n2 * d3, r2 * r3, d2 * n3 * r3];
    let np = part[0],
      rp = part[1];
    const dp = part[2];
    for (let k = 2; k * k <= rp; k++)
      while (rp % (k * k) === 0) {
        np *= k;
        rp /= k * k;
      }
    assert.equal(rp, r1, `${id}: unlike radicands are outside the domain`);
    const n = n1 * dp + (plus === 0 ? 1 : -1) * np * d1;
    compare(answer, BigInt(n), BigInt(d1 * dp), BigInt(r1));
    return;
  }
  if (id === "m3-trig-parallelogram-area-special-angle") {
    // S = AB·AD·sin A with sin 30° = 1/2, sin 45° = √2/2, sin 60° = √3/2.
    const [a, b, angle] = p;
    compare(
      answer,
      BigInt(a * b),
      BigInt(2),
      BigInt(angle === 30 ? 1 : angle === 45 ? 2 : 3),
    );
    return;
  }
  throw Error(id);
}
function renderedAnswer(
  kind: ArithmeticV2Answer["kind"],
  exact: string[],
  unit: string,
): ArithmeticV2Answer {
  const n = exact[0],
    r = kind === "surd" ? exact[1] : "1",
    d = kind === "surd" ? exact[2] : kind === "rational" ? exact[1] : "1";
  const coefficient = r !== "1" && n === "1" ? "" : n,
    symbol = r !== "1" ? `√${r}` : "",
    texSymbol = r !== "1" ? `\\sqrt{${r}}` : "";
  const textUnit = unit === "°" ? "°" : unit ? ` ${unit}` : "",
    texUnit =
      unit === "°"
        ? "^{\\circ}"
        : unit
          ? `\\,\\mathrm{cm}${unit === "cm²" ? "^{2}" : ""}`
          : "";
  return {
    kind,
    exact,
    text:
      (d === "1" ? `${coefficient}${symbol}` : `${coefficient}${symbol}/${d}`) +
      textUnit,
    latex:
      (d === "1"
        ? `${coefficient}${texSymbol}`
        : `\\frac{${coefficient}${texSymbol}}{${d}}`) + texUnit,
  };
}
const clone = (c: ArithmeticV2Candidate) =>
  JSON.parse(JSON.stringify(c)) as ArithmeticV2Candidate;

describe("middle 3 trigonometry completion", () => {
  it("exhausts independent exact oracles, public identities and canonical schemas", () => {
    const identities = new Set<string>();
    let total = 0;
    for (const definition of definitions) {
      assert.deepEqual(definition.curriculum, { semester: 2, unit: "삼각비" });
      assert.equal(definition.strand, "도형");
      const parameters = new Set<string>();
      for (let i = 0; i < definition.domainSize; i++) {
        const c = definition.problemAt(i);
        assert(definition.verify(c), `${definition.id}:${i}`);
        assert(arithmeticV2CandidateSchema.safeParse(c).success);
        oracle(definition.id, c.parameters, c.answer);
        assert(c.parameters.length <= 6);
        const identity = arithmeticV2PromptIdentity(c.prompt);
        assert(!identities.has(identity));
        identities.add(identity);
        const key = c.parameters.join(",");
        assert(!parameters.has(key));
        parameters.add(key);
        assert(c.prompt.layout === "math");
        assert(!c.prompt.figureId);
        assert(c.prompt.text.includes("$"));
        assert(!c.prompt.latex.includes("$"));
        assert(c.answer.exact.every((s) => s.length <= 40));
        total++;
      }
      assert.equal(parameters.size, definition.domainSize);
    }
    for (const family of TRIG_FAMILIES) {
      const old = buildFamily(family, {});
      assert(!definitions.some((d) => d.id === old.id));
      for (let i = 0; i < old.domainSize; i++)
        assert(
          !identities.has(arithmeticV2PromptIdentity(old.problemAt(i).prompt)),
        );
    }
    console.log(
      `Trig exhaustive: ${definitions.length} types, ${total} unique tasks`,
    );
  });
  it("renders every authored text math, identity and answer with KaTeX", () => {
    const expressions = new Set<string>();
    let occurrences = 0;
    for (const definition of definitions)
      for (let i = 0; i < definition.domainSize; i++) {
        const c = definition.problemAt(i);
        assert(c.prompt.layout === "math");
        expressions.add(c.prompt.latex);
        expressions.add(c.answer.latex);
        for (const text of [c.prompt.text, c.prompt.instruction ?? ""]) {
          const math = [...text.matchAll(/\$([^$]+)\$/g)];
          assert.equal(text.split("$").length - 1, math.length * 2);
          for (const match of math) expressions.add(match[1]);
          occurrences += math.length;
        }
        occurrences += 2;
      }
    for (const expression of expressions)
      assert(
        !katex
          .renderToString(expression, {
            throwOnError: true,
            strict: "error",
            trust: false,
          })
          .includes("katex-error"),
        expression,
      );
    console.log(
      `Trig KaTeX: ${expressions.size} distinct expressions / ${occurrences} occurrences`,
    );
  });
  it("rejects coherent exact-field changes and wrong-sign lengths/ratios throughout domains", () => {
    let mutations = 0;
    for (const definition of definitions)
      for (let i = 0; i < definition.domainSize; i++) {
        const c = definition.problemAt(i);
        assert(c.prompt.layout === "math");
        for (let k = 0; k < c.answer.exact.length; k++) {
          const exact = [...c.answer.exact];
          exact[k] = String(BigInt(exact[k]) + BigInt(1));
          assert(
            !definition.verify({
              ...c,
              answer: renderedAnswer(
                c.answer.kind,
                exact,
                c.prompt.answerUnit ?? "",
              ),
            }),
            `${definition.id}:${i}:${k}`,
          );
          mutations++;
        }
        if (
          !definition.id.includes("squared-arithmetic") &&
          c.answer.exact[0] !== "0"
        ) {
          const exact = [...c.answer.exact];
          exact[0] = String(-BigInt(exact[0]));
          assert(
            !definition.verify({
              ...c,
              answer: renderedAnswer(
                c.answer.kind,
                exact,
                c.prompt.answerUnit ?? "",
              ),
            }),
            `${definition.id}:negative`,
          );
        }
      }
    console.log(`Trig coherent exact-field mutations rejected: ${mutations}`);
  });
  it("rejects noncanonical equivalent radicals/rationals, malformed values and altered givens", () => {
    for (const definition of definitions) {
      for (const index of [-1, definition.domainSize, 1.5, NaN, Infinity])
        expect(() => definition.problemAt(index)).toThrow();
      for (const index of [
        0,
        Math.floor(definition.domainSize / 2),
        definition.domainSize - 1,
      ]) {
        const c = definition.problemAt(index);
        assert(c.prompt.layout === "math");
        assert.deepEqual(definition.problemAt(index), c);
        const reordered = {
          parameters: c.parameters,
          prompt: Object.fromEntries(Object.entries(c.prompt).reverse()),
          answer: Object.fromEntries(Object.entries(c.answer).reverse()),
        };
        assert(definition.verify(reordered as ArithmeticV2Candidate));
        const bad: unknown[] = [
          null,
          {},
          { ...c, parameters: [...c.parameters, 1] },
          { ...c, parameters: c.parameters.map((v, i) => (i === 0 ? -0 : v)) },
          { ...c, parameters: [NaN] },
          { ...c, parameters: [Infinity] },
          { ...c, parameters: new Array(c.parameters.length) },
          { ...c, answer: { ...c.answer, extra: 1 } },
          { ...c, prompt: { ...c.prompt, extra: 1 } },
        ];
        for (const field of ["text", "latex", "instruction", "answerUnit"])
          bad.push({ ...c, prompt: { ...c.prompt, [field]: "changed" } });
        for (const exact of [
          [],
          ["01"],
          ["-0"],
          ["1.5"],
          ["9".repeat(81)],
          new Array(c.answer.exact.length),
          ["1", "0"],
          ["1", "-2"],
        ])
          bad.push({ ...c, answer: { ...c.answer, exact } });
        for (const candidate of bad)
          assert(
            !definition.verify(candidate as ArithmeticV2Candidate),
            definition.id,
          );
        if (c.answer.kind === "rational" || c.answer.kind === "surd") {
          const exact = [...c.answer.exact],
            den = exact.length - 1;
          exact[0] = String(BigInt(exact[0]) * BigInt(2));
          exact[den] = String(BigInt(exact[den]) * BigInt(2));
          assert(
            !definition.verify({
              ...c,
              answer: renderedAnswer(
                c.answer.kind,
                exact,
                c.prompt.answerUnit ?? "",
              ),
            }),
          );
        }
      }
    }
    const conversion = definitions.find(
      (d) => d.id === "m3-trig-ratio-from-another",
    )!;
    const c = Array.from({ length: conversion.domainSize }, (_, i) =>
      conversion.problemAt(i),
    ).find((c) => c.answer.kind === "surd")!;
    assert(c.prompt.layout === "math");
    const [n, r, d] = c.answer.exact.map(BigInt),
      equivalent = [String(n), String(r * BigInt(4)), String(d * BigInt(2))];
    assert(
      !conversion.verify({
        ...c,
        answer: renderedAnswer("surd", equivalent, ""),
      }),
    );
    const missing = clone(c);
    delete (missing.prompt as Partial<typeof missing.prompt>).instruction;
    assert(!conversion.verify(missing));
  });
});
