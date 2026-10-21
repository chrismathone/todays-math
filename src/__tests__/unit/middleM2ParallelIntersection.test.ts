/** M14 named O is an actual intersection, with old values/RNG/09 preserved. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateMiddleProblem } from "@/lib/middle/generate";
import { M2_GEO_SIM } from "@/lib/middle/m2GeoSim";
import type { MidProblem } from "@/lib/middle/types";

const key = "2-2|평행선 사이의 선분의 길이의 비|10";
const handler = M2_GEO_SIM.find((entry) => entry.key === key)!.handler;
const baseline = JSON.parse(readFileSync("src/__tests__/fixtures/m2Parallel-before-intersection-20261021.json", "utf8")) as {
  old09: { seed: number; output: unknown }[];
  modes10: { mode: number; index: number; output: unknown }[];
};
type Point = readonly [number, number];
function distanceToLine(o: Point, a: Point, b: Point) {
  return Math.abs((b[0] - a[0]) * (o[1] - a[1]) - (b[1] - a[1]) * (o[0] - a[0])) / Math.hypot(b[0] - a[0], b[1] - a[1]);
}
function checkIntersection(problem: MidProblem) {
  const spec = problem.figureSpec!;
  const points = spec.points as Record<string, Point>;
  expect(points.O).toBeDefined();
  const { A, B, C, D, E, F, O } = points;
  for (const [a, b] of [[A!, C!], [B!, D!], [E!, F!]]) {
    // Existing fitPts rounds every coordinate to 0.01 SVG units.
    expect(distanceToLine(O!, a!, b!)).toBeLessThanOrEqual(0.015);
    const t = ((O![0] - a![0]) * (b![0] - a![0]) + (O![1] - a![1]) * (b![1] - a![1])) / ((b![0] - a![0]) ** 2 + (b![1] - a![1]) ** 2);
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(1);
  }
  expect(spec.labels).toMatchObject({ O: "O" });
  expect(Object.entries(spec.labels!).filter(([, label]) => label === "O")).toHaveLength(1);
  expect(spec.segments).toMatchObject({ AC: ["A", "C"], BD: ["B", "D"], EF: ["E", "F"] });
  const withoutO = structuredClone(problem);
  delete (withoutO.figureSpec!.points as Record<string, unknown>).O;
  delete (withoutO.figureSpec!.labels as Record<string, unknown>).O;
  return withoutO;
}

describe("M14 actual type10 both modes keep the named construction point", () => {
  for (const row of baseline.modes10) {
    it(`mode ${row.mode}, original pair ${row.index}: O lies inside AC, BD and EF`, () => {
      const values = [(row.mode + 0.5) / 2, (row.index + 0.5) / 10];
      let used = 0;
      const problem = handler(() => { if (used >= 2) throw Error("unexpected RNG"); return values[used++]!; });
      expect(used).toBe(2);
      expect(checkIntersection(problem)).toEqual(row.output);
    });
  }
  it("keeps every byte of the shared helper's non-diagonal09 API outputs", () => {
    for (const row of baseline.old09)
      expect(JSON.stringify(generateMiddleProblem("2-2|평행선 사이의 선분의 길이의 비|09", row.seed, 0))).toBe(JSON.stringify(row.output));
  });
  it("represents O for100 actual API seeds without adding a target-length label", () => {
    const modes = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const problem = generateMiddleProblem(key, 20261021 + i * 7919, 0);
      checkIntersection(problem);
      modes.add(problem.facts.mode!);
      expect(Object.values(problem.figureSpec!.labels!)).toEqual(["A", "B", "C", "D", "E", "F", "O"]);
    }
    expect([...modes].sort()).toEqual([0, 1]);
  });
});
