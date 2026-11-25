import { describe, expect, it } from "vitest";

import { createRng } from "../../lib/elementary/rng";
import { M1_TEXTBOOK_FACTOR } from "../../lib/middle/m1TextbookFactor";
import { generateMiddleProblem } from "../../lib/middle/generate";
import { renderMathHtml } from "../../lib/math/renderMathHtml";
import { josaMismatches, pageSmells } from "../helpers/midPage";
import type { MidProblem } from "../../lib/middle/types";

// The generator constructs prime powers; this oracle divides the displayed integers.
function factor(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let d = 2; d <= n; d++) {
    let e = 0;
    while (n % d === 0) {
      n /= d;
      e++;
    }
    if (e) out.push([d, e]);
  }
  return out;
}
const prime = (n: number) =>
  n >= 2 && factor(n).length === 1 && factor(n)[0]![1] === 1;
const math = (s: string) => [...s.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
function evaluateProduct(s: string, vars: Record<string, number> = {}): bigint {
  return s.split(/\\times/).reduce((acc, term) => {
    const m = term.trim().match(/^(\d+|[abcd])(?:\^\{(\d+|[abcd])\})?$/);
    if (!m) throw new Error(`Unsupported displayed product: ${s}`);
    const val = (token: string) =>
      /^\d+$/.test(token) ? Number(token) : vars[token]!;
    return acc * BigInt(val(m[1]!)) ** BigInt(m[2] ? val(m[2]) : 1);
  }, BigInt(1));
}
function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return a;
}
const lcm = (a: bigint, b: bigint) => (a / gcd(a, b)) * b;

function check(p: MidProblem) {
  const f = p.facts;
  const ms = math(p.content);
  const answer = math(p.answer);
  switch (p.rpmType) {
    case "F01": {
      const inputs = ms.map(Number);
      expect(inputs.length).toBe(f.count);
      expect(new Set(inputs).size).toBe(inputs.length);
      expect(answer.length).toBe(inputs.length);
      expect(inputs.every((n) => !prime(n) && n >= 4 && n <= 900)).toBe(true);
      answer.forEach((a, i) => {
        expect(evaluateProduct(a)).toBe(BigInt(inputs[i]!));
        const terms = a
          .split(/\\times/)
          .map((s) => s.match(/^(\d+)(?:\^\{(\d+)\})?$/)!);
        expect(terms.every((t) => prime(Number(t[1])))).toBe(true);
        expect(terms.map((t) => Number(t[1]))).toEqual(
          factor(inputs[i]!).map(([d]) => d),
        );
      });
      break;
    }
    case "F02": {
      const givenFraction = ms[0]!.match(/^\\dfrac\{1\}\{(\d+)\}$/);
      const given = givenFraction
        ? [BigInt(1), BigInt(givenFraction[1]!)]
        : [BigInt(ms[0]!), BigInt(1)];
      expect(given).toEqual([BigInt(f.numerator!), BigInt(f.denominator!)]);
      const results = answer.map((a, i) => {
        const simple = a.match(/^(\d+)\^\{(\d+)\}$/);
        if (simple) {
          expect(simple[1]).toBe(ms[i + 1]);
          return [BigInt(simple[1]!) ** BigInt(simple[2]!), BigInt(1)];
        }
        const frac = a.match(
          /^\\left\(\\dfrac\{1\}\{(\d+)\}\\right\)\^\{(\d+)\}$/,
        )!;
        expect(frac).not.toBeNull();
        expect(ms[i + 1]).toBe(`\\dfrac{1}{${frac[1]}}`);
        return [BigInt(1), BigInt(frac[1]!) ** BigInt(frac[2]!)];
      });
      results.forEach(([n, d]) =>
        expect(n! * BigInt(f.denominator!)).toBe(BigInt(f.numerator!) * d!),
      );
      expect(results.length).toBe(f.count);
      break;
    }
    case "F03": {
      const ns = Array.from({ length: f.count! }, (_, i) => f[`n${i}`]!);
      ns.forEach((n) => expect(ms).toContain(String(n)));
      const scores = ns.map((n) =>
        f.metric === 0
          ? sum(factor(n).map(([v]) => v))
          : f.metric === 1
            ? factor(n).length
            : sum(factor(n).map(([, e]) => e)),
      );
      const expected =
        f.mode === 0 ? sum(scores) : ns[scores.indexOf(Math.max(...scores))];
      if (f.mode === 1)
        expect(scores.filter((s) => s === Math.max(...scores)).length).toBe(1);
      expect(answer).toEqual([String(expected)]);
      break;
    }
    case "F04": {
      expect(ms).toEqual([String(f.lo), String(f.hi), String(f.total)]);
      const candidates: number[] = [];
      for (let n = f.lo! + 1; n < f.hi!; n++) {
        const fs = factor(n);
        if (fs.length === 2 && sum(fs.map(([v]) => v)) === f.total)
          candidates.push(n);
      }
      expect(candidates.length).toBe(1);
      expect(answer).toEqual([String(candidates[0])]);
      break;
    }
    case "F05": {
      if (f.mode === 3) {
        expect(ms.slice(0, 2)).toEqual([String(f.n0), String(f.n1)]);
        const n = Number(lcm(BigInt(f.n0!), BigInt(f.n1!)));
        expect(answer).toEqual([
          String(
            sum(
              factor(n)
                .filter(([p]) => p !== f.fixedPrime)
                .map(([, e]) => e),
            ),
          ),
        ]);
      } else {
        const expressions = ms.slice(0, f.rows);
        if (f.hasGcd) expect(evaluateProduct(ms[f.rows!]!)).toBe(BigInt(f.G!));
        if (f.lcmExpressionIndex === -1)
          expect(evaluateProduct(ms[f.rows! + f.hasGcd!]!)).toBe(BigInt(f.L!));
        const candidates: number[] = [];
        const pools = Array.from({ length: f.unknowns! }, (_, i) =>
          f.primeUnknown === i ? [2, 3, 5, 7, 11] : [1, 2, 3, 4, 5],
        );
        const visit = (xs: number[]) => {
          if (xs.length < pools.length) {
            for (const x of pools[xs.length]!) visit([...xs, x]);
            return;
          }
          const vars = Object.fromEntries(xs.map((x, i) => ["abcd"[i]!, x]));
          const values = expressions.map((s) => evaluateProduct(s, vars));
          const G = values.reduce(gcd),
            L = values.reduce(lcm);
          const lcmMatches =
            f.lcmExpressionIndex! >= 0
              ? L === evaluateProduct(ms[f.lcmExpressionIndex!]!, vars)
              : L === BigInt(f.L!);
          if ((f.hasGcd === 0 || G === BigInt(f.G!)) && lcmMatches)
            candidates.push(sum(xs));
        };
        visit([]);
        expect(candidates, p.content).toHaveLength(1);
        expect(answer).toEqual([String(candidates[0])]);
      }
      break;
    }
    case "F06": {
      expect(ms[0]).toBe(String(f.bound));
      let above = f.bound! + 1,
        below = f.bound! - 1;
      while (!prime(above)) above++;
      while (below < 4 || prime(below)) below--;
      expect(answer).toEqual([String(above - below)]);
      break;
    }
    case "F07": {
      const inputs = ms.map(Number);
      const signatures = inputs.map((n) =>
        factor(n)
          .map(([v]) => v)
          .join(","),
      );
      const singleton = signatures.filter(
        (s) => signatures.filter((x) => x === s).length === 1,
      );
      expect(singleton).toHaveLength(1);
      expect(answer).toEqual([
        String(inputs[signatures.indexOf(singleton[0]!)]),
      ]);
      break;
    }
    default:
      throw new Error(`Unchecked type ${p.rpmType}`);
  }
}

describe("textbook T1 factor extensions", () => {
  it("registers seven distinct calculation families, without editing old handlers", () => {
    expect(M1_TEXTBOOK_FACTOR.map((t) => t.rpmType)).toEqual([
      "F01",
      "F02",
      "F03",
      "F04",
      "F05",
      "F06",
      "F07",
    ]);
  });
  for (const type of M1_TEXTBOOK_FACTOR) {
    it(`${type.rpmType}: independent answers, stable seeds and changing inputs`, () => {
      const seen = new Set<string>();
      for (let seed = 1; seed <= 90; seed++) {
        const p = type.handler(createRng(seed));
        expect(p).toEqual(type.handler(createRng(seed)));
        expect(Object.values(p.facts).every(Number.isSafeInteger)).toBe(true);
        check(p);
        for (const text of [p.content, p.answer, p.solution]) {
          expect(josaMismatches(text)).toEqual([]);
          expect(pageSmells(text)).toEqual([]);
          expect(text).not.toMatch(/\$\s+(?:의|을|를|은|는|이다)/);
        }
        seen.add(p.content);
      }
      expect(seen.size).toBeGreaterThan(30);
    });
    it(`${type.rpmType}: three complete displayed samples render`, () => {
      for (const seed of [20261125, 173, 9049]) {
        const p = generateMiddleProblem(type.key, seed);
        check(p);
        for (const text of [p.content, p.answer, p.solution])
          expect(renderMathHtml(text)).not.toContain("katex-error");
      }
    });
    it(`${type.rpmType}: the oracle rejects a corrupted answer`, () => {
      const p = type.handler(createRng(173));
      expect(() => check({ ...p, answer: "$0$" })).toThrow();
    });
  }
  it("existing square-completion handler already covers multiplication, division and root sum", () => {
    const kinds = new Set<number>();
    for (let seed = 1; seed <= 90; seed++) {
      const p = generateMiddleProblem("1-1|소인수분해|09", seed);
      const { N, kind } = p.facts;
      kinds.add(kind!);
      const squares = new Set(
        Array.from({ length: 1500 }, (_, i) => (i + 1) ** 2),
      );
      let x = 1;
      while (!squares.has(kind === 1 ? N! / x : N! * x)) x++;
      const squared = kind === 1 ? N! / x : N! * x;
      let root = 1;
      while (root * root !== squared) root++;
      expect(p.answer).toBe(`$${kind === 2 ? x + root : x}$`);
    }
    expect([...kinds].sort()).toEqual([0, 1, 2]);
  });
});
