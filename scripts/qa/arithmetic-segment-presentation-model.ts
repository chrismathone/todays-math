/** Offline plans from frozen source labels and exact canonical model endpoints. */
import assert from "node:assert/strict";
import { TRIANGLE_GEOMETRY_FIGURES } from "../../src/lib/arithmetic-v2/families/geometryTriangles";
import { CENTER_SPECS } from "../../src/lib/arithmetic-v2/families/geometryTriangles/centers";
import { RELATIONSHIP_SPECS } from "../../src/lib/arithmetic-v2/families/geometryTriangles/relationships";
import { PYTHAGORAS_SPECS } from "../../src/lib/arithmetic-v2/families/geometryTriangles/pythagoras";
import { PROPORTION_SPECS } from "../../src/lib/arithmetic-v2/families/geometryTriangles/proportions";

export type Point = [number, number];
export type Segment = [Point, Point];
export interface SegmentPlan {
  id: string;
  family: string;
  tuple: string;
  source: string;
  geometry: string;
  points: Record<string, Point>;
  labels: { key: string; text: string }[];
  given: { key: string; text: string; endpoints: Segment };
  prompt: string;
  target: string;
}
export const scale = 1.5;
export const rounded = (n: number) => Number(n.toFixed(5));
export const scaled = (p: readonly number[]): Point => [
  rounded((p[0] - 120) * scale),
  rounded((p[1] - 116) * scale),
];
export const escapeXml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export const attr = (s: string, key: string) =>
  new RegExp(`\\b${key}="([^"]*)"`).exec(s)?.[1];

export function segmentPlans(): SegmentPlan[] {
  const result: SegmentPlan[] = [];
  for (const spec of [
    ...CENTER_SPECS,
    ...RELATIONSHIP_SPECS,
    ...PYTHAGORAS_SPECS,
    ...PROPORTION_SPECS,
  ])
    for (const params of spec.rows) {
      const family = `${spec.grade === "중3" ? "m3" : "m2"}-${spec.key}`,
        tuple = params.join("-"),
        id = `gt1-${family}-${tuple}`;
      const source = TRIANGLE_GEOMETRY_FIGURES[id];
      const matches = [...source.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)];
      const numeric = matches.filter((m) =>
        attr(m[1], "data-drill-label")?.startsWith("segment-"),
      );
      if (!numeric.length) continue;
      assert.equal(numeric.length, 1, id);
      const task = spec.task(params),
        model = task.model;
      const raw = Object.values(model.points),
        xs = raw.map((p) => p[0]),
        ys = raw.map((p) => p[1]);
      const minX = Math.min(...xs),
        maxX = Math.max(...xs),
        minY = Math.min(...ys),
        maxY = Math.max(...ys);
      const fit = Math.min(144 / (maxX - minX), 132 / (maxY - minY));
      const originalPoints = Object.fromEntries(
        Object.entries(model.points).map(([key, p]) => [
          key,
          [
            rounded(120 + (p[0] - (minX + maxX) / 2) * fit),
            rounded(116 - (p[1] - (minY + maxY) / 2) * fit),
          ] as Point,
        ]),
      );
      // Validate the coordinate transform against every frozen source edge.
      for (const m of source.matchAll(
        /<line\b[^>]*data-segment="([A-Z]{2})"[^>]*\/>/g,
      )) {
        const actual = [
          attr(m[0], "x1"),
          attr(m[0], "y1"),
          attr(m[0], "x2"),
          attr(m[0], "y2"),
        ].map(Number);
        assert.deepEqual(
          actual,
          [...originalPoints[m[1][0]], ...originalPoints[m[1][1]]],
          id,
        );
      }
      const points = Object.fromEntries(
        Object.entries(originalPoints).map(([key, p]) => [key, scaled(p)]),
      );
      const key = attr(numeric[0][1], "data-drill-label")!.slice(8),
        text = numeric[0][2];
      assert.match(text, /^\d+$/);
      assert.ok(
        task.text.includes(`${key}=${text} cm`),
        `${id}: only published numeric givens`,
      );
      const body = /<g\b[^>]*>([\s\S]*)<\/g><\/svg>/
        .exec(source)![1]
        .replace(/<text\b[^>]*>[\s\S]*?<\/text>/g, "")
        .replace(/<line\b[^>]*data-leader="[^"]*"[^>]*\/>/g, "");
      const labels = matches
        .filter((m) => !attr(m[1], "data-drill-label")?.startsWith("segment-"))
        .map((m) => ({ key: attr(m[1], "data-drill-label")!, text: m[2] }));
      assert.ok(
        labels.every((l) => /^[A-Z]$/.test(l.key)),
        id,
      );
      result.push({
        id,
        family,
        tuple,
        source,
        geometry: `<g data-segment-source="true" transform="matrix(1.5 0 0 1.5 -180 -174)" fill="none" stroke="black" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</g>`,
        points,
        labels,
        given: { key, text, endpoints: [points[key[0]], points[key[1]]] },
        prompt: task.text,
        target: task.target,
      });
    }
  assert.equal(result.length, 1827);
  assert.equal(new Set(result.map((p) => p.family)).size, 50);
  return result;
}
