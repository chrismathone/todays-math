/** Read printed angle conditions and actual vector geometry; no facts or pixels. */
import { describe, expect, it } from "vitest";
import { generateMiddleProblem } from "@/lib/middle/generate";
import { M2_QUAD } from "@/lib/middle/m2Quad";
import type { MidProblem } from "@/lib/middle/types";

type Point = [number, number];
const angle = (v: Point, a: Point, b: Point) => {
  const u = [a[0] - v[0], a[1] - v[1]];
  const w = [b[0] - v[0], b[1] - v[1]];
  return Math.atan2(Math.abs(u[0]! * w[1]! - u[1]! * w[0]!), u[0]! * w[0]! + u[1]! * w[1]!) * 180 / Math.PI;
};
const distanceToLine = (v: Point, a: Point, b: Point) =>
  Math.abs((b[0] - a[0]) * (a[1] - v[1]) - (a[0] - v[0]) * (b[1] - a[1])) / Math.hypot(b[0] - a[0], b[1] - a[1]);

function check(task: MidProblem) {
  const b = task.content.match(/\\angle B=\((\d+)x\+(\d+)\)/);
  const d = task.content.match(/\\angle D=\(x\+(\d+)\)/);
  expect(b).not.toBeNull();
  expect(d).not.toBeNull();
  const p = Number(b![1]), q = Number(b![2]), s = Number(d![1]);
  const x = (s - q) / (p - 1), beta = p * x + q;
  expect(Number.isInteger(x) && x > 0).toBe(true);
  expect(beta).toBeGreaterThan(0);
  expect(beta).toBeLessThan(180);
  expect(task.answer).toBe(`$${x}$`);
  const figure = task.figureSpec!;
  const { A, B, C, D } = figure.points as Record<string, Point>;
  expect(Math.abs(angle(B!, A!, C!) - beta)).toBeLessThan(0.01);
  expect(Math.abs(angle(D!, A!, C!) - beta)).toBeLessThan(0.01);
  expect(Math.abs(angle(A!, B!, D!) - (180 - beta))).toBeLessThan(0.01);
  expect(Math.abs(angle(C!, B!, D!) - (180 - beta))).toBeLessThan(0.01);
  expect(figure.segments).toEqual({ AB: ["A", "B"], DC: ["D", "C"], AD: ["A", "D"], BC: ["B", "C"] });
  expect(figure.labels).toEqual({ A: "A", B: "B", C: "C", D: "D" });
  const marks = figure.angles as Record<string, { vertex: string; points: string[]; arcs: number; radius: number; label?: string; serialized_inset?: boolean }>;
  expect(Object.keys(marks).sort()).toEqual(["angA", "angC"]);
  const clearance = Math.min(distanceToLine(A!, B!, C!), distanceToLine(A!, C!, D!),
    distanceToLine(C!, A!, B!), distanceToLine(C!, D!, A!));
  for (const [key, vertex] of [["angA", "A"], ["angC", "C"]]) {
    const mark = marks[key!]!;
    expect(mark.vertex).toBe(vertex);
    expect(mark.points).toEqual(["B", "D"]);
    expect(mark.arcs).toBe(1);
    expect(mark.serialized_inset).toBe(true);
    expect(mark.label).toBeUndefined();
    expect(mark.radius).toBeGreaterThan(0);
    expect(mark.radius + 1).toBeLessThan(clearance);
  }
}

describe("M28 keeps the printed angle relationships and the given A/C marks", () => {
  const key = "2-2|평행사변형|15A";
  it("100 actual API seeds including the handoff example", () => {
    for (const seed of [20403562, ...Array.from({ length: 99 }, (_, i) => 20261021 + i * 7919)]) {
      check(generateMiddleProblem(key, seed, 0));
    }
  });
  it("all 432 selectable parameter combinations", () => {
    const entry = M2_QUAD.find((e) => e.key === key)!;
    for (let x = 4; x <= 15; x++) for (let p = 2; p <= 4; p++) for (let q = 1; q <= 12; q++) {
      const values = [(x - 4 + 0.5) / 12, (p - 2 + 0.5) / 3, (q - 1 + 0.5) / 12];
      let used = 0;
      check(entry.handler(() => {
        if (used >= 3) throw new Error("Unexpected random draw");
        return values[used++]!;
      }));
      expect(used).toBe(3);
    }
  });
});
