/** Diagram givens only; this is not a whole-curriculum or publication review. */
import { describe, expect, it } from "vitest";

import { generateMiddleProblem } from "@/lib/middle/generate";
import { M2_PYTHA } from "@/lib/middle/m2Pytha";
import type { MidProblem } from "@/lib/middle/types";

type Point = [number, number];
const edge = (names: string[]) => [...names].sort().join("");
function check(p: MidProblem) {
  const given = new Map([...p.content.matchAll(/\\overline\{([A-Z]{2})\}=([0-9]+)\\,\\mathrm\{cm\}/g)]
    .map(m => [edge(m[1]!.split("")), Number(m[2])]));
  expect(given.size).toBe(2);
  const figure = p.figureSpec!;
  const dimensions = Object.values(figure.dimensions as Record<string, { points: string[]; label: string }>);
  const shown = new Map(dimensions.map(d => {
    const value = d.label.match(/^([0-9]+) cm$/);
    expect(value, d.label).not.toBeNull();
    return [edge(d.points), Number(value![1])] as const;
  }));
  expect(dimensions.length).toBe(given.size);
  expect([...shown].sort()).toEqual([...given].sort());
  const points = figure.points as Record<string, Point>;
  const vector = (a: Point, b: Point): Point => [b[0] - a[0], b[1] - a[1]];
  const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1];
  const ab = vector(points.A!, points.B!);
  const ad = vector(points.A!, points.D!);
  const dc = vector(points.D!, points.C!);
  const ca = vector(points.C!, points.A!);
  const cb = vector(points.C!, points.B!);
  expect(dot(ca, cb)).toBeCloseTo(0, 7);
  expect(dot(ab, dc)).toBeCloseTo(0, 7);
  expect(ab[0] * ad[1] - ab[1] * ad[0]).toBeCloseTo(0, 7);
  expect(dot(ab, ad)).toBeGreaterThan(0);
  expect(dot(ab, ad)).toBeLessThan(dot(ab, ab));
  // Read lengths from vector geometry, not figure pixels or generator facts.
  const unitScales = [...given].map(([names, length]) => {
    const v = vector(points[names[0]!]!, points[names[1]!]!);
    return Math.hypot(...v) / length;
  });
  expect(unitScales[0]).toBeCloseTo(unitScales[1]!, 7);
}
describe("M2 Pythagoras diagrams reveal only the two stated side lengths", () => {
  for (const type of ["09", "10"]) {
    const key = `2-2|피타고라스 정리|${type}`;
    it(`${type}: 100 actual API seeds`, () => {
      for (let s = 0; s < 100; s++) check(generateMiddleProblem(key, 20261020 + s * 7919, 0));
    });
    it(`${type}: all ten selectable right-triangle inputs`, () => {
      const entry = M2_PYTHA.find(e => e.key === key)!;
      expect(entry).toBeDefined();
      for (let i = 0; i < 10; i++) {
        let used = 0;
        check(entry.handler(() => {
          if (used++ !== 0) throw new Error("Unexpected random draw");
          return (i + .5) / 10;
        }));
      }
    });
  }
});
