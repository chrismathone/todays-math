/** Independent exact checks: parse the displayed numbers, compare unreduced BigInt
 * cross products, and enumerate integers. No production arithmetic is imported. */
import { describe, expect, it } from "vitest";
import katex from "katex";
import { createRng } from "../../lib/elementary/rng";
import { M1_TEXTBOOK_ORDER } from "../../lib/middle/m1TextbookOrder";
import { M1_NUM } from "../../lib/middle/m1Num";
import type { MidProblem } from "../../lib/middle/types";

type F = { n: bigint; d: bigint };
const abs = (n: bigint) => (n < BigInt(0) ? -n : n);
function read(s: string): F {
  const t = s.replace(/\\(?:left|right|,|!)/g, "").replace(/\s/g, "");
  if (t.startsWith("|") && t.endsWith("|")) {
    const q = read(t.slice(1, -1));
    return { n: abs(q.n), d: q.d };
  }
  if (t.startsWith("-|") && t.endsWith("|")) {
    const q = read(t.slice(2, -1));
    return { n: -abs(q.n), d: q.d };
  }
  const power = t.match(/^(-?)(\d+)\^\{(\d+)\}$/);
  if (power)
    return {
      n:
        (power[1] ? -BigInt(1) : BigInt(1)) *
        BigInt(power[2]!) ** BigInt(power[3]!),
      d: BigInt(1),
    };
  const fraction = t.match(/^([+-]?)(\d+)?\\d?frac\{(\d+)\}\{(\d+)\}$/);
  if (fraction) {
    const d = BigInt(fraction[4]!);
    return {
      n:
        (fraction[1] === "-" ? -BigInt(1) : BigInt(1)) *
        (BigInt(fraction[2] ?? 0) * d + BigInt(fraction[3]!)),
      d,
    };
  }
  const decimal = t.match(/^([+-]?)(\d+)\.(\d+)$/);
  if (decimal) {
    const d = BigInt(10) ** BigInt(decimal[3]!.length);
    return {
      n:
        (decimal[1] === "-" ? -BigInt(1) : BigInt(1)) *
        (BigInt(decimal[2]!) * d + BigInt(decimal[3]!)),
      d,
    };
  }
  if (/^[+-]?\d+$/.test(t)) return { n: BigInt(t), d: BigInt(1) };
  throw new Error(`Not a rational display: ${s}`);
}
function cmp(a: F, b: F): number {
  const v = a.n * b.d - b.n * a.d;
  return v < BigInt(0) ? -1 : v > BigInt(0) ? 1 : 0;
}
function eq(a: F, b: F) {
  expect(a.n * b.d).toBe(b.n * a.d);
}
function math(s: string): string[] {
  return [...s.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);
}
function generate(type: string, seed: number): MidProblem {
  return M1_TEXTBOOK_ORDER.find((t) => t.rpmType === type)!.handler(
    createRng(seed),
  );
}
function rationalFacts(p: MidProblem, i: number): F {
  return { n: BigInt(p.facts[`n${i}`]!), d: BigInt(p.facts[`d${i}`]!) };
}
function answers(p: MidProblem): F[] {
  return math(p.answer).map(read);
}
function integral(q: F) {
  return q.n % q.d === BigInt(0);
}
function matches(q: F, category: number): boolean {
  switch (category) {
    case 0:
      return q.n > BigInt(0) && integral(q);
    case 1:
      return q.n < BigInt(0) && integral(q);
    case 2:
      return !integral(q);
    case 3:
      return q.n > BigInt(0);
    case 4:
      return q.n < BigInt(0);
    case 5:
      return integral(q) && q.n >= BigInt(0);
    case 6:
      return integral(q) && q.n <= BigInt(0);
    default:
      throw new Error(`unknown category ${category}`);
  }
}
function list(p: MidProblem): F[] {
  return math(p.content.split("\n")[1]!).map(read);
}

describe("textbook T1 classification and order", () => {
  it("has exactly six separately registered identities", () => {
    expect(M1_TEXTBOOK_ORDER.map((t) => t.rpmType)).toEqual([
      "O01",
      "O02",
      "O03",
      "O04",
      "O05",
      "O06",
    ]);
    expect(new Set(M1_TEXTBOOK_ORDER.map((t) => t.key)).size).toBe(6);
  });
  for (const id of ["O01", "O02", "O03", "O04", "O05", "O06"]) {
    it(`${id}: deterministic, bounded exact data and varied content`, () => {
      const seen = new Set<string>();
      for (let seed = 0; seed < 160; seed++) {
        const p = generate(id, seed);
        expect(generate(id, seed)).toEqual(p);
        seen.add(p.content);
        for (const [k, v] of Object.entries(p.facts)) {
          expect(Number.isSafeInteger(v), k).toBe(true);
          expect(Math.abs(v)).toBeLessThan(1000);
        }
        expect(p.content + p.answer + p.solution).not.toMatch(
          /undefined|NaN|Infinity|\+\-|\-\-|\\(?:d?frac)\{[^}]*\}\{[01]\}/,
        );
        for (const text of [p.content, p.answer, p.solution])
          for (const expression of math(text))
            expect(() =>
              katex.renderToString(expression, { throwOnError: true }),
            ).not.toThrow();
        expect(p.answer).not.toBe("");
        expect(p.figureSpec).toBeUndefined();
      }
      // A single absolute value has fewer possible displays than a list or batch.
      expect(seen.size).toBeGreaterThan(id === "O05" ? 95 : 120);
    });
  }
  it("O01: classification lists, counts and sums agree with displayed rationals", () => {
    const modes = new Set<number>(),
      cats = new Set<number>();
    for (let seed = 0; seed < 240; seed++) {
      const p = generate("O01", seed),
        f = p.facts,
        ns = list(p);
      modes.add(f.mode!);
      cats.add(f.category!);
      expect(ns.length).toBe(f.count);
      ns.forEach((q, i) => eq(q, rationalFacts(p, i)));
      const selected = ns.filter((q) => matches(q, f.category!));
      if (f.mode === 0) {
        const out = answers(p);
        expect(out.length).toBe(selected.length);
        out.forEach((q, i) => eq(q, selected[i]!));
      }
      if (f.mode === 1)
        eq(answers(p)[0]!, { n: BigInt(selected.length), d: BigInt(1) });
      if (f.mode === 2) {
        const other = ns.filter((q) => matches(q, f.otherCategory!));
        const out = answers(p);
        expect(out.length).toBe(selected.length + other.length);
        [...selected, ...other].forEach((q, i) => eq(q, out[i]!));
      }
      if (f.mode === 3) {
        const a = ns.filter((q) => q.n > BigInt(0)).length,
          b = ns.filter((q) => q.n < BigInt(0)).length;
        expect(answers(p).map((q) => Number(q.n / q.d))).toEqual([a, b]);
      }
      if (f.mode === 4)
        eq(answers(p)[0]!, {
          n: BigInt(selected.length + ns.filter((q) => !integral(q)).length),
          d: BigInt(1),
        });
    }
    expect([...modes].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(cats.size).toBe(7);
  });
  it("O02: every strict/closed endpoint and each batch answer matches its written condition", () => {
    const kinds = new Set<number>(),
      sizes = new Set<number>();
    for (let seed = 0; seed < 220; seed++) {
      const p = generate("O02", seed),
        f = p.facts;
      sizes.add(f.count!);
      const lines = p.content.split("\n").slice(1),
        out = math(p.answer);
      expect(lines.length).toBe(f.count);
      expect(out.length).toBe(f.count);
      lines.forEach((line, i) => {
        const values = math(line),
          kind = f[`kind${i}`]!;
        kinds.add(kind);
        const variable = String.fromCharCode(97 + i);
        expect(values[0]).toBe(variable);
        const lo = read(values[1]!);
        eq(lo, { n: BigInt(f[`loN${i}`]!), d: BigInt(f[`loD${i}`]!) });
        const loClosed = line.includes("이상"),
          hiClosed = line.includes("이하");
        if (kind === 0) {
          const hi = read(values[2]!);
          expect(cmp(lo, hi)).toBe(-1);
          expect(out[i]).toBe(
            `${values[1]}${loClosed ? "\\le " : "<"}${variable}${hiClosed ? "\\le" : "<"}${values[2]}`,
          );
        } else if (kind === 1)
          expect(out[i]).toBe(
            `${variable}${loClosed ? "\\ge" : ">"}${values[1]}`,
          );
        else if (kind === 2)
          expect(out[i]).toBe(
            `${variable}${hiClosed ? "\\le" : "<"}${values[1]}`,
          );
        else
          expect(out[i]).toBe(
            `|${variable}|${hiClosed ? "\\le" : "<"}${values[1]}`,
          );
      });
    }
    expect(kinds.size).toBe(4);
    expect(sizes.size).toBe(4);
  });
  it("O03: exact cross-product ordering, maximum/minimum and source representations", () => {
    const modes = new Set<number>(),
      forms = new Set<number>();
    for (let seed = 0; seed < 200; seed++) {
      const p = generate("O03", seed),
        f = p.facts,
        ns = list(p),
        out = answers(p);
      modes.add(f.mode!);
      ns.forEach((q, i) => {
        eq(q, rationalFacts(p, i));
        forms.add(f[`form${i}`]!);
      });
      const sorted = [...ns].sort(cmp);
      expect(
        new Set(ns.map((q) => ns.findIndex((x) => cmp(x, q) === 0))).size,
      ).toBe(ns.length);
      if (f.mode === 0 || f.mode === 1) {
        if (f.mode === 1) sorted.reverse();
        expect(out.length).toBe(ns.length);
        out.forEach((q, i) => eq(q, sorted[i]!));
      } else if (f.mode === 2) {
        expect(out.length).toBe(2);
        eq(out[0]!, sorted.at(-1)!);
        eq(out[1]!, sorted[0]!);
      } else {
        expect(out.length).toBe(1);
        eq(out[0]!, sorted.at(-1)!);
      }
      for (const s of math(p.answer)) expect(math(p.content)).toContain(s);
    }
    expect(modes.size).toBe(4);
    expect(forms.has(4)).toBe(true);
    expect(forms.has(5)).toBe(true);
    expect(forms.has(6)).toBe(true);
  });
  it("O04: independently enumerates negative integers, zero and endpoint equality", () => {
    const modes = new Set<number>(),
      closures = new Set<string>();
    for (let seed = 0; seed < 260; seed++) {
      const p = generate("O04", seed),
        f = p.facts,
        values = math(p.content);
      if (f.mode! > 1) continue;
      const lo = read(values[0]!),
        hi = read(values[1]!);
      modes.add(f.mode!);
      closures.add(`${f.loClosed}${f.hiClosed}`);
      let expected = 0;
      for (let x = -50; x <= 50; x++) {
        const value = {
          n: BigInt(f.mode === 1 ? Math.abs(x) : x),
          d: BigInt(1),
        };
        if (
          (cmp(value, lo) > 0 || (f.loClosed === 1 && cmp(value, lo) === 0)) &&
          (cmp(value, hi) < 0 || (f.hiClosed === 1 && cmp(value, hi) === 0))
        )
          expected++;
      }
      eq(answers(p)[0]!, { n: BigInt(expected), d: BigInt(1) });
      const shown = math(p.solution.split("\n")[0]!).map(read);
      expect(shown.length).toBe(expected);
    }
    expect(modes.size).toBe(2);
    expect(closures.size).toBe(4);
  });
  it("O04: derived intervals, two populations and greatest absolute value", () => {
    const modes = new Set<number>();
    for (let seed = 0; seed < 320; seed++) {
      const p = generate("O04", seed),
        f = p.facts,
        xs = math(p.content);
      modes.add(f.mode!);
      let expected: number | undefined;
      if (f.mode === 2) {
        const u = read(xs[0]!),
          v = read(xs[2]!);
        let a = 0,
          b = 0;
        for (let x = -50; x <= 50; x++)
          if (cmp({ n: BigInt(Math.abs(x)), d: BigInt(1) }, u) <= 0) a++;
        for (let x = 1; x <= 50; x++)
          if (cmp({ n: BigInt(x), d: BigInt(1) }, v) < 0) b++;
        expected = a - b;
      } else if (f.mode === 3) {
        const lo = read(xs[0]!),
          hi = read(xs[1]!),
          allowed: number[] = [];
        for (let x = -50; x <= 50; x++)
          if (
            cmp({ n: BigInt(x), d: BigInt(1) }, lo) > 0 &&
            cmp({ n: BigInt(x), d: BigInt(1) }, hi) < 0
          )
            allowed.push(x);
        const biggest = Math.max(...allowed.map(Math.abs)),
          matches = allowed.filter((x) => Math.abs(x) === biggest);
        expect(matches.length).toBe(1);
        expected = matches[0];
      } else if (f.mode === 4) {
        const u = read(xs[0]!),
          v = read(xs[1]!);
        let total = 0;
        for (let x = -50; x <= 50; x++)
          if (
            BigInt(x) * u.d + u.n > BigInt(0) &&
            BigInt(x) * v.d - v.n < BigInt(0)
          )
            total++;
        expected = total;
      } else if (f.mode === 5) {
        const limit = read(xs[2]!),
          lo = read(xs[4]!),
          hi = read(xs[5]!);
        let total = 0;
        for (let x = -50; x <= 50; x++) {
          const q = { n: BigInt(x), d: BigInt(1) };
          if (
            cmp(q, lo) > 0 &&
            cmp(q, hi) <= 0 &&
            !(x >= 1 && cmp(q, limit) <= 0)
          )
            total++;
        }
        expected = total;
      }
      if (expected !== undefined)
        eq(answers(p)[0]!, { n: BigInt(expected), d: BigInt(1) });
    }
    expect([...modes].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it("O05: direct absolute value and every number at a given distance from zero", () => {
    const modes = new Set<number>();
    for (let seed = 0; seed < 180; seed++) {
      const p = generate("O05", seed),
        f = p.facts,
        input = read(math(p.content)[0]!),
        out = answers(p);
      modes.add(f.mode!);
      const positive = { n: abs(input.n), d: input.d };
      if (f.mode === 2) {
        const values = math(p.content).map(read);
        expect(out.length).toBe(values.length);
        values.forEach((q, i) => eq(out[i]!, { n: abs(q.n), d: q.d }));
      } else if (f.mode === 0) {
        expect(out.length).toBe(1);
        eq(out[0]!, positive);
      } else if (input.n === BigInt(0)) {
        expect(out.length).toBe(1);
        eq(out[0]!, { n: BigInt(0), d: BigInt(1) });
      } else {
        expect(out.length).toBe(2);
        eq(out[0]!, { n: -positive.n, d: positive.d });
        eq(out[1]!, positive);
      }
    }
    expect(modes.size).toBe(3);
  });
  it("O06: each numbered reciprocal has product one; no zero and all answers reduced", () => {
    const sizes = new Set<number>(),
      signs = new Set<boolean>(),
      dens = new Set<bigint>();
    for (let seed = 0; seed < 200; seed++) {
      const p = generate("O06", seed),
        input = math(p.content).map(read),
        out = answers(p);
      sizes.add(input.length);
      expect(out.length).toBe(input.length);
      input.forEach((q, i) => {
        expect(q.n).not.toBe(BigInt(0));
        signs.add(q.n < BigInt(0));
        dens.add(q.d);
        const r = out[i]!;
        expect(q.n * r.n).toBe(q.d * r.d);
        expect(r.d).toBeGreaterThan(BigInt(0));
        for (let factor = BigInt(2); factor <= r.d; factor++)
          expect(
            abs(r.n) % factor === BigInt(0) && r.d % factor === BigInt(0),
          ).toBe(false);
      });
      const inLabels = p.content.match(/\([1-5]\)/g);
      expect(p.answer.match(/\([1-5]\)/g)).toEqual(inLabels);
    }
    expect(sizes.size).toBe(3);
    expect(signs.size).toBe(2);
    expect(dens.size).toBeGreaterThan(4);
  });
  it("reused count, rank, range and absolute-maximum generators remain independently checkable", () => {
    for (const id of ["02", "11", "12", "13", "20"])
      for (let seed = 0; seed < 80; seed++) {
        const p = M1_NUM.find(
            (t) => t.key === `1-1|정수와 유리수|${id}`,
          )!.handler(createRng(seed)),
          f = p.facts;
        if (id === "02") {
          const ns = list(p),
            kind = f.kind!;
          const selected = ns.filter((q) =>
            kind === 0
              ? q.n > BigInt(0) && integral(q)
              : kind === 1
                ? q.n < BigInt(0) && integral(q)
                : kind === 2
                  ? integral(q)
                  : !integral(q),
          );
          eq(answers(p)[0]!, { n: BigInt(selected.length), d: BigInt(1) });
        } else if (id === "11") {
          const ns = list(p).sort(cmp);
          eq(answers(p)[0]!, ns[f.kind === 0 ? f.k! - 1 : ns.length - f.k!]!);
        } else if (id === "12")
          expect(p.answer).toBe(
            `$${f.a}${f.loStrict === 0 ? "\\le" : "<"} x${f.hiStrict === 0 ? "\\le" : "<"}${f.b}$`,
          );
        else if (id === "13") {
          const [lo, hi] = math(p.content).slice(0, 2).map(read),
            allowed = [];
          for (let n = -30; n <= 30; n++)
            if (
              cmp({ n: BigInt(n), d: BigInt(1) }, lo!) > 0 &&
              cmp({ n: BigInt(n), d: BigInt(1) }, hi!) < 0
            )
              allowed.push(n);
          const result =
            f.kind === 0
              ? allowed.length
              : f.kind === 1
                ? allowed.at(-1)!
                : allowed.reduce((a, b) => a + b, 0);
          eq(answers(p)[0]!, { n: BigInt(result), d: BigInt(1) });
        } else {
          const ns = list(p),
            out = answers(p)[0]!;
          expect(ns.every((q) => abs(out.n) * q.d >= abs(q.n) * out.d)).toBe(
            true,
          );
        }
      }
  });
});
