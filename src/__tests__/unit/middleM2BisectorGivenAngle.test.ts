/** M3 preserves the given whole angle without printing a calculated half. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateMiddleProblem } from "@/lib/middle/generate";
import { M2_GEO_TRI } from "@/lib/middle/m2GeoTri";
import type { MidProblem } from "@/lib/middle/types";

const key = "2-2|삼각형의 성질|09";
const handler = M2_GEO_TRI.find((entry) => entry.key === key)!.handler;
type Row = { w: number; values: number[]; output: MidProblem };
const before = JSON.parse(readFileSync("src/__tests__/fixtures/m2Bisector-before-given-angle-20261021.json", "utf8")) as {
  mode0: Row[]; mode1: Row[]; actualAPI: { seed: number; output: MidProblem }[];
};
type Point = readonly [number, number];
type Mark = { vertex: string; points: string[]; radius?: number; arcs?: number; label?: string };
type Spec = { points: Record<string, Point>; angles: Record<string, Mark>; style?: Record<string, unknown> };
function angle(v: Point, a: Point, b: Point) {
  const u = [a[0] - v[0], a[1] - v[1]], w = [b[0] - v[0], b[1] - v[1]];
  return Math.atan2(Math.abs(u[0]! * w[1]! - u[1]! * w[0]!), u[0]! * w[0]! + u[1]! * w[1]!) * 180 / Math.PI;
}
function checkGiven(problem: MidProblem) {
  const given = Number(problem.content.match(/\\angle AOB=(\d+)\^\\circ/)![1]);
  const spec = problem.figureSpec as unknown as Spec;
  expect(Object.keys(spec.angles).sort()).toEqual(["a1", "a2", "ax", "givenAOB"]);
  const { a1, a2, ax, givenAOB } = spec.angles;
  expect(a1).toMatchObject({ vertex: "O", points: ["A", "P"], arcs: 1 });
  expect(a2).toMatchObject({ vertex: "O", points: ["P", "B"], arcs: 1 });
  expect(a1!.label).toBeUndefined(); expect(a2!.label).toBeUndefined();
  expect(givenAOB).toMatchObject({ vertex: "O", points: ["A", "B"], label: `${given}°` });
  expect(ax).toEqual({ vertex: "P", points: ["C", "D"], label: "x" });
  expect(Object.values(spec.angles).flatMap((mark) => mark.label?.match(/^\d+°$/) ?? [])).toEqual([`${given}°`]);
  expect(givenAOB!.radius! - Math.max(a1!.radius!, a2!.radius!)).toBeGreaterThan(8);
  expect(a1!.radius).toBe(a2!.radius); expect(a1!.radius!).toBeGreaterThan(0);
  const { O, A, B, C, D, P } = spec.points;
  expect(Math.abs(angle(O!, A!, B!) - given)).toBeLessThan(0.02);
  expect(Math.abs(angle(C!, O!, P!) - 90)).toBeLessThan(0.02);
  expect(Math.abs(angle(D!, O!, P!) - 90)).toBeLessThan(0.02);
  expect(Math.abs(angle(P!, C!, D!) - (360 - 90 - 90 - given))).toBeLessThan(0.02);
  expect(problem.answer).toBe(`$${360 - 90 - 90 - given}^\\circ$`);
  expect(spec.style?.clear_angle_labels).toBe(true);
}
function compareOld(problem: MidProblem, previous: MidProblem) {
  const copy = structuredClone(problem);
  copy.figureSpec!.angles = structuredClone(previous.figureSpec!.angles);
  delete copy.figureSpec!.style;
  expect(copy).toEqual(previous);
}

describe("M3 given-only angle marks preserve every existing mathematical input", () => {
  for (const row of before.mode1) it(`whole angle ${row.w} with no numerical half-angle disclosure`, () => {
    let used = 0;
    const problem = handler(() => { if (used >= 2) throw Error("unexpected RNG"); return row.values[used++]!; });
    expect(used).toBe(2); checkGiven(problem); compareOld(problem, row.output);
  });
  it("keeps all147 length-only mode0 combinations byte for byte and three RNG calls", () => {
    for (const row of before.mode0) {
      let used = 0;
      const problem = handler(() => { if (used >= 3) throw Error("unexpected RNG"); return row.values[used++]!; });
      expect(used).toBe(3); expect(JSON.stringify(problem)).toBe(JSON.stringify(row.output));
    }
  });
  it("preserves32 actual API results apart from the declared mode1 mark layout", () => {
    for (const row of before.actualAPI) {
      const problem = generateMiddleProblem(key, row.seed, 0);
      if (problem.facts.mode === 0) expect(JSON.stringify(problem)).toBe(JSON.stringify(row.output));
      else { checkGiven(problem); compareOld(problem, row.output); }
    }
  });
  it("checks100 actual API seeds including both original modes", () => {
    const modes = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const problem = generateMiddleProblem(key, 20261021 + i * 7919, 0);
      modes.add(problem.facts.mode!); if (problem.facts.mode === 1) checkGiven(problem);
    }
    expect([...modes].sort()).toEqual([0, 1]);
  });
});
