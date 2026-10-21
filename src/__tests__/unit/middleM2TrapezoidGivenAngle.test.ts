/** M4 changes the displayed angle role, preserving all old math and dimensions. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateMiddleProblem } from "@/lib/middle/generate";
import { M2_GEO_QUAD } from "@/lib/middle/m2GeoQuad";
import type { MidProblem } from "@/lib/middle/types";

const key = "2-2|여러 가지 사각형|08";
const handler = M2_GEO_QUAD.find((entry) => entry.key === key)!.handler;
type Row = { p: number; c?: number; values: number[]; output: MidProblem };
const before = JSON.parse(readFileSync("src/__tests__/fixtures/m2Trapezoid-before-given-angle-20261021.json", "utf8")) as {
  mode0: Row[]; mode1: Row[]; actualAPI: { seed: number; output: MidProblem }[];
  shared: { key: string; seed: number; output: MidProblem }[];
};
type Point = readonly [number, number];
const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function angle(v: Point, a: Point, b: Point) {
  const u = [a[0] - v[0], a[1] - v[1]], w = [b[0] - v[0], b[1] - v[1]];
  return Math.atan2(Math.abs(u[0]! * w[1]! - u[1]! * w[0]!), u[0]! * w[0]! + u[1]! * w[1]!) * 180 / Math.PI;
}
function checkGiven(problem: MidProblem) {
  const c = Number(problem.content.match(/\\overline\{AB\}=(\d+)/)![1]);
  const p = Number(problem.content.match(/\\overline\{AD\}=(\d+)/)![1]);
  expect(problem.content).toContain("\\angle A=120^\\circ");
  expect(problem.answer).toBe(`$${p + c}\\,\\mathrm{cm}$`);
  const spec = problem.figureSpec!;
  const points = spec.points as Record<string, Point>;
  const { A, B, C, D } = points;
  expect(Math.abs(angle(A!, B!, D!) - 120)).toBeLessThan(0.02);
  expect(Math.abs(angle(B!, A!, C!) - 60)).toBeLessThan(0.02);
  expect(Math.abs(dist(A!, B!) - dist(D!, C!))).toBeLessThan(0.02);
  expect(Math.abs((dist(B!, C!) - dist(A!, D!)) / dist(A!, B!) - 1)).toBeLessThan(0.001);
  const marks = spec.angles as Record<string, { vertex: string; points: string[]; label: string; radius: number; label_distance: number }>;
  expect(Object.keys(marks)).toEqual(["angA"]);
  expect(marks.angA).toMatchObject({ vertex: "A", points: ["B", "D"], label: "120°" });
  expect(marks.angA!.radius).toBeGreaterThan(0);
  expect(marks.angA!.label_distance - marks.angA!.radius).toBeGreaterThan(10);
  expect(spec.dimensions).toEqual({
    d_AD: { points: ["A", "D"], label: `${p} cm`, side: "auto" },
    d_AB: { points: ["A", "B"], label: `${c} cm`, side: "auto" },
  });
  expect(spec.style).toBeUndefined();
}
function compareOld(problem: MidProblem, previous: MidProblem) {
  const copy = structuredClone(problem);
  copy.figureSpec!.angles = structuredClone(previous.figureSpec!.angles);
  expect(copy).toEqual(previous);
}

describe("M4 displays the given A angle without the calculated B angle", () => {
  for (const row of before.mode1) it(`p=${row.p}, c=${row.c}: only the given angle changes`, () => {
    let used = 0;
    const problem = handler(() => { if (used >= 3) throw Error("unexpected RNG"); return row.values[used++]!; });
    expect(used).toBe(3); checkGiven(problem); compareOld(problem, row.output);
  });
  it("preserves all49 valid mode0 combinations and their three RNG calls", () => {
    for (const row of before.mode0) {
      let used = 0;
      const problem = handler(() => { if (used >= 3) throw Error("unexpected RNG"); return row.values[used++]!; });
      expect(used).toBe(3); expect(JSON.stringify(problem)).toBe(JSON.stringify(row.output));
    }
  });
  it("preserves the other27 shared-module callers at their captured API seed", () => {
    for (const row of before.shared) expect(JSON.stringify(generateMiddleProblem(row.key, row.seed, 0))).toBe(JSON.stringify(row.output));
  });
  it("preserves32 API results apart from the declared mode1 angle entry", () => {
    for (const row of before.actualAPI) {
      const problem = generateMiddleProblem(key, row.seed, 0);
      if (problem.facts.mode === 0) expect(JSON.stringify(problem)).toBe(JSON.stringify(row.output));
      else { checkGiven(problem); compareOld(problem, row.output); }
    }
  });
  it("checks100 actual API seeds with both original modes", () => {
    const modes = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const problem = generateMiddleProblem(key, 20261021 + i * 7919, 0);
      modes.add(problem.facts.mode!); if (problem.facts.mode === 1) checkGiven(problem);
    }
    expect([...modes].sort()).toEqual([0, 1]);
  });
});
