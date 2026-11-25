import { describe, expect, it } from "vitest";
import { createRng } from "@/lib/elementary/rng";
import { evalTex, sameFrac } from "@/lib/middle/judge/texArith";
import { M1_TEXTBOOK_CALC } from "@/lib/middle/m1TextbookCalc";
import {
  q,
  evaluate,
  render,
  type Expr,
} from "@/lib/middle/textbookArithmetic";
import {
  assertChoiceCount,
  assertChoiceMarks,
} from "@/lib/problem/choiceCountRule";

// Independent oracle: read the printed expression, expand decimal/mixed notation
// lexically, then evaluate as UNREDUCED BigInt fractions in the existing judge.
// It never reads generator facts or imports the generator's arithmetic.
function printedValue(tex: string) {
  const expanded = tex
    .replace(/\\left\(-1\\right\)\^\{(\d+)\}/g, (_, exponent) => {
      let value = BigInt(1);
      for (let i = 0; i < Number(exponent); i++) value *= BigInt(-1);
      return `(${value})`;
    })
    .replace(
      /(\d+)\\dfrac\{(\d+)\}\{(\d+)\}/g,
      (_, w, n, d) => `\\dfrac{${BigInt(w) * BigInt(d) + BigInt(n)}}{${d}}`,
    )
    .replace(/\d+\.\d+/g, (v) => {
      const [w, f] = v.split(".");
      return `\\dfrac{${w}${f}}{${10 ** f!.length}}`;
    });
  const out = evalTex(expanded);
  if (!out) throw new Error(`Cannot read printed expression: ${tex}`);
  return out;
}
function math(s: string) {
  return [...s.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);
}
function gcd(a: bigint, b: bigint): bigint {
  a = a < BigInt(0) ? -a : a;
  while (b) [a, b] = [b, a % b];
  return a;
}

describe("textbook exact arithmetic", () => {
  it("rejects zero divisors and unsafe input; canonicalizes fractions", () => {
    expect(q(6, -8)).toEqual({ n: -3, d: 4 });
    expect(q(0, -3)).toEqual({ n: 0, d: 1 });
    expect(() => q(1, 0)).toThrow();
    expect(() => q(0.1, 1)).toThrow();
    expect(() => q(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    const zero: Expr = { kind: "value", value: q(0) };
    expect(() => evaluate({ kind: "div", left: zero, right: zero })).toThrow();
  });
  it("distinguishes minus outside a power, a negative base, and right division", () => {
    const v = (n: number): Expr => ({ kind: "value", value: q(n) });
    const fixtures: [Expr, string][] = [
      [{ kind: "neg", child: { kind: "pow", base: v(3), exponent: 2 } }, "-9"],
      [{ kind: "pow", base: v(-3), exponent: 2 }, "9"],
      [
        {
          kind: "div",
          left: v(8),
          right: { kind: "div", left: v(4), right: v(2) },
        },
        "4",
      ],
      [
        {
          kind: "sub",
          left: v(8),
          right: { kind: "sub", left: v(4), right: v(2) },
        },
        "6",
      ],
      [{ kind: "value", value: q(-7, 3), notation: "mixed" }, "-\\dfrac{7}{3}"],
      [
        { kind: "value", value: q(-7, 8), notation: "decimal" },
        "-\\dfrac{7}{8}",
      ],
      [
        {
          kind: "pow",
          base: {
            kind: "mul",
            left: { kind: "value", value: q(-2), signed: true },
            right: { kind: "value", value: q(3), signed: true },
          },
          exponent: 2,
        },
        "36",
      ],
      [
        {
          kind: "pow",
          base: { kind: "pow", base: v(-2), exponent: 2 },
          exponent: 3,
        },
        "64",
      ],
    ];
    for (const [expr, answer] of fixtures) {
      expect(sameFrac(printedValue(render(expr)), printedValue(answer))).toBe(
        true,
      );
      const got = evaluate(expr);
      expect(
        sameFrac({ n: BigInt(got.n), d: BigInt(got.d) }, printedValue(answer)),
      ).toBe(true);
    }
  });
  it("does not round an unsafe intermediate product back into a safe result", () => {
    const max = Number.MAX_SAFE_INTEGER;
    const value = evaluate({
      kind: "sub",
      left: { kind: "value", value: q(max, 3) },
      right: { kind: "value", value: q(max - 2, 3) },
    });
    expect(value).toEqual({ n: 2, d: 3 });
    expect(() =>
      evaluate({
        kind: "mul",
        left: { kind: "value", value: q(max) },
        right: { kind: "value", value: q(2) },
      }),
    ).toThrow();
  });
  it("handles large exponents of negative one without changing their parity", () => {
    const e: Expr = {
      kind: "pow",
      base: { kind: "value", value: q(-1) },
      exponent: 99,
    };
    expect(evaluate(e)).toEqual({ n: -1, d: 1 });
    expect(sameFrac(printedValue(render(e)), printedValue("-1"))).toBe(true);
  });
});

describe("T1 printed calculation questions", () => {
  it("contains eight fixed-difficulty families and no duplicated key", () => {
    expect(M1_TEXTBOOK_CALC).toHaveLength(8);
    expect(new Set(M1_TEXTBOOK_CALC.map((e) => e.key)).size).toBe(8);
  });
  for (let k = 1; k <= 8; k++) {
    it(`C${String(k).padStart(2, "0")}: seed, printed answer, reduction, order and variety`, () => {
      const entry = M1_TEXTBOOK_CALC.find(
        (e) => e.rpmType === `C${String(k).padStart(2, "0")}`,
      )!;
      const contents = new Set<string>();
      const counts = new Set<number>();
      const difficulties = new Set<string>();
      let decimals = 0,
        fractions = 0,
        negative = 0;
      for (let seed = 1; seed <= 160; seed++) {
        const p = entry.handler(createRng(seed));
        expect(p).toEqual(entry.handler(createRng(seed)));
        const expressions = math(p.content),
          answers = math(p.answer);
        expect(expressions.length).toBe(answers.length);
        expect(expressions.length).toBeGreaterThan(0);
        counts.add(expressions.length);
        difficulties.add(p.difficulty);
        const labels = (s: string) =>
          [...s.matchAll(/^\((\d+)\)/gm)].map((m) => +m[1]!);
        expect(labels(p.answer)).toEqual(labels(p.content));
        expect(labels(p.solution)).toEqual(labels(p.content));
        assertChoiceCount(p.content, entry.key);
        assertChoiceMarks(p.content, entry.key);
        for (let i = 0; i < expressions.length; i++) {
          const actual = printedValue(answers[i]!),
            expected = printedValue(expressions[i]!);
          expect(sameFrac(actual, expected), expressions[i]).toBe(true);
          expect(actual.d > BigInt(0)).toBe(true);
          expect(gcd(actual.n, actual.d)).toBe(BigInt(1));
          expect(actual.n < BigInt(2001) && actual.n > BigInt(-2001)).toBe(
            true,
          );
          expect(actual.d <= BigInt(240)).toBe(true);
        }
        // Every equality in the worked solution must mean the same value.
        for (const line of math(p.solution)) {
          const sides = line.split("=");
          for (let i = 1; i < sides.length; i++)
            expect(
              sameFrac(printedValue(sides[0]!), printedValue(sides[i]!)),
              line,
            ).toBe(true);
        }
        expect(p.content + p.answer + p.solution).not.toMatch(
          /NaN|Infinity|\\dfrac\{[^}]+\}\{[01]\}|\+\-|--/,
        );
        decimals += /\d\.\d/.test(p.content) ? 1 : 0;
        fractions += /\\dfrac/.test(p.content) ? 1 : 0;
        negative += /-/.test(p.content) ? 1 : 0;
        contents.add(p.content);
      }
      expect(contents.size).toBeGreaterThan(130);
      expect(counts.has(1)).toBe(true);
      expect(counts.size).toBeGreaterThan(2);
      expect(difficulties.size).toBe(1);
      expect(negative).toBeGreaterThan(80);
      if (k !== 8) {
        expect(decimals).toBeGreaterThan(5);
        expect(fractions).toBeGreaterThan(5);
      }
    });
  }
});
