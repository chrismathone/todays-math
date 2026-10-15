/** Offline bounded layout search; output contains no layout code. */
import { curveMidpoint } from "../../src/components/unified/figure-editor/figureHandles";
import { lineHitsBox } from "../../src/lib/arithmetic-v2/families/geometryTriangles/core";
import {
  escapeXml,
  rounded,
  type Point,
  type Segment,
  type SegmentPlan,
} from "./arithmetic-segment-presentation-model";

export interface Metric {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Label {
  key: string;
  text: string;
  at: Point;
  angle: number;
  box: Metric;
}
export interface Dimension {
  projected: Segment;
  offset: number;
  curve?: string;
}
export interface Layout {
  dimension: Dimension;
  labels: Label[];
  score: number;
}
const rotate = (p: Point, angle: number): Point => {
  const r = (angle * Math.PI) / 180;
  return [
    p[0] * Math.cos(r) - p[1] * Math.sin(r),
    p[0] * Math.sin(r) + p[1] * Math.cos(r),
  ];
};
const local = (p: Point, l: Label): Point =>
  rotate([p[0] - l.at[0], p[1] - l.at[1]], -l.angle);
export const corners = (l: Label, pad = 0): Point[] => {
  const b = l.box;
  return [
    [b.x - pad, b.y - pad],
    [b.x + b.width + pad, b.y - pad],
    [b.x + b.width + pad, b.y + b.height + pad],
    [b.x - pad, b.y + b.height + pad],
  ].map((p) => {
    const q = rotate(p as Point, l.angle);
    return [q[0] + l.at[0], q[1] + l.at[1]];
  });
};
function hit(segment: Segment, l: Label, pad = 2) {
  return lineHitsBox(local(segment[0], l), local(segment[1], l), {
    x: l.box.x - pad,
    y: l.box.y - pad,
    w: l.box.width + 2 * pad,
    h: l.box.height + 2 * pad,
  });
}
function overlap(a: Label, b: Label) {
  const A = corners(a, 2),
    B = corners(b, 2);
  return ![A, B].some((poly) =>
    poly.some((p, i) => {
      const q = poly[(i + 1) % 4],
        nx = p[1] - q[1],
        ny = q[0] - p[0],
        aa = A.map((v) => v[0] * nx + v[1] * ny),
        bb = B.map((v) => v[0] * nx + v[1] * ny);
      return (
        Math.max(...aa) <= Math.min(...bb) || Math.max(...bb) <= Math.min(...aa)
      );
    }),
  );
}
export function curveSegments(curve: string): Segment[] {
  const m = /d="M ([^Q]+) Q ([^"]+)"/.exec(curve)!;
  const n = (m[1] + " " + m[2]).trim().split(/\s+/).map(Number);
  const points = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40,
      u = 1 - t;
    return [
      u * u * n[0] + 2 * u * t * n[2] + t * t * n[4],
      u * u * n[1] + 2 * u * t * n[3] + t * t * n[5],
    ] as Point;
  });
  return points.slice(1).map((p, i) => [points[i], p]);
}
export function dimensions(plan: SegmentPlan): Dimension[] {
  const [a, b] = plan.given.endpoints,
    L = Math.hypot(b[0] - a[0], b[1] - a[1]),
    normal: Point = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L];
  const result: Dimension[] = [];
  const projections = Object.values(plan.points).map(
    (p) =>
      (p[0] - (a[0] + b[0]) / 2) * normal[0] +
      (p[1] - (a[1] + b[1]) / 2) * normal[1],
  );
  for (const shift of [
    0,
    24,
    -24,
    40,
    -40,
    60,
    -60,
    Math.max(...projections) + 20,
    Math.min(...projections) - 20,
  ])
    for (const off of shift === 0
      ? [14, -14, 20, -20, 28, -28, 38, -38, 50, -50]
      : [Math.sign(shift) * 12])
      result.push({
        projected: [a, b].map((p) => [
          rounded(p[0] + normal[0] * shift),
          rounded(p[1] + normal[1] * shift),
        ]) as Segment,
        offset: off,
      });
  return result;
}
function crosses([a, b]: Segment, [c, d]: Segment) {
  const cross = (p: Point, q: Point, r: Point) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return (
    cross(a, b, c) * cross(a, b, d) < -1e-8 &&
    cross(c, d, a) * cross(c, d, b) < -1e-8
  );
}
export function place(
  plan: SegmentPlan,
  geometry: Segment[],
  metrics: Record<string, Metric>,
  candidates: Dimension[],
): Layout {
  const [a, b] = plan.given.endpoints;
  let angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle <= -90) angle += 180;
  const centroid: Point = [
    Object.values(plan.points).reduce((n, p) => n + p[0], 0) /
      Object.keys(plan.points).length,
    Object.values(plan.points).reduce((n, p) => n + p[1], 0) /
      Object.keys(plan.points).length,
  ];
  let best: Layout | undefined;
  for (const dimension of candidates) {
    const mid = curveMidpoint(/d="([^"]+)"/.exec(dimension.curve!)![1])!;
    const numeric: Label = {
      key: `segment-${plan.given.key}`,
      text: plan.given.text,
      at: [mid.x, mid.y],
      angle,
      box: metrics[plan.given.text],
    };
    if (geometry.some((s) => hit(s, numeric, 2.5))) continue;
    const strokes = curveSegments(dimension.curve!);
    const witness: Segment[] = [];
    for (let i = 0; i < 2; i++)
      if (
        Math.hypot(
          dimension.projected[i][0] - plan.given.endpoints[i][0],
          dimension.projected[i][1] - plan.given.endpoints[i][1],
        ) > 0.01
      )
        witness.push([plan.given.endpoints[i], dimension.projected[i]]);
    const obstacles = [...geometry, ...strokes, ...witness];
    const labels: Label[] = [numeric];
    let displacement = 0,
      failed = false;
    // Interior/center labels have the fewest free directions and are placed first.
    const order = [...plan.labels].sort(
      (u, v) =>
        Math.hypot(
          plan.points[u.key][0] - centroid[0],
          plan.points[u.key][1] - centroid[1],
        ) -
        Math.hypot(
          plan.points[v.key][0] - centroid[0],
          plan.points[v.key][1] - centroid[1],
        ),
    );
    for (const l of order) {
      const point = plan.points[l.key];
      const outward = Math.atan2(
        point[1] - centroid[1],
        point[0] - centroid[0],
      );
      let selected: Label | undefined;
      for (const radius of [13, 16, 20, 24, 28, 34, 42]) {
        for (const direction of [
          outward,
          ...Array.from({ length: 24 }, (_, i) => (i * Math.PI) / 12),
        ]) {
          const label: Label = {
            ...l,
            at: [
              rounded(point[0] + radius * Math.cos(direction)),
              rounded(point[1] + radius * Math.sin(direction)),
            ],
            angle: 0,
            box: metrics[l.text],
          };
          if (
            labels.some((other) => overlap(other, label)) ||
            obstacles.some((s) => hit(s, label, 2.5))
          )
            continue;
          // An unlabelled neighbouring point must not be mistaken for this one.
          if (
            Object.entries(plan.points).some(
              ([key, p]) =>
                key !== l.key &&
                Math.hypot(p[0] - label.at[0], p[1] - label.at[1]) + 3 < radius,
            )
          )
            continue;
          selected = label;
          displacement += radius;
          break;
        }
        if (selected) break;
      }
      if (!selected) {
        failed = true;
        break;
      }
      labels.push(selected);
    }
    if (failed) continue;
    const all = [
      ...Object.values(plan.points),
      ...labels.flatMap((l) => corners(l)),
      ...strokes.flat(),
    ];
    const xs = all.map((p) => p[0]),
      ys = all.map((p) => p[1]);
    const extent = Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
    );
    const shifted = Math.hypot(
      dimension.projected[0][0] - a[0],
      dimension.projected[0][1] - a[1],
    );
    const crossing = strokes.filter(
      (s) =>
        geometry.some((g) => crosses(s, g)) &&
        !plan.given.endpoints.some(
          (p) => Math.hypot(p[0] - s[0][0], p[1] - s[0][1]) < 6,
        ),
    ).length;
    const score =
      extent +
      displacement * 0.16 +
      shifted * 0.15 +
      Math.abs(dimension.offset) * 0.06 +
      crossing * (/[OIG]/.test(plan.given.key) ? 0 : 35);
    if (!best || score < best.score) best = { dimension, labels, score };
  }
  if (!best) throw new Error(`No collision-free layout for ${plan.id}`);
  return best;
}
export function assemble(plan: SegmentPlan, layout: Layout) {
  const d = layout.dimension;
  const witness = d.projected
    .map((p, i) => {
      const a = plan.given.endpoints[i];
      return Math.hypot(a[0] - p[0], a[1] - p[1]) < 0.01
        ? ""
        : `<path data-segment-witness="${i}" d="M${a.join(" ")} L${p.join(" ")}" fill="none" stroke="#555" stroke-width=".7" stroke-dasharray="3 3"/>`;
    })
    .join("");
  const labels = layout.labels
    .map(
      (l) =>
        `<text data-drill-label="${l.key}"${l.key.startsWith("segment-") ? ' data-segment-number="true" data-line-gap="1"' : ` data-segment-point="${plan.points[l.key].join(" ")}"`} x="${rounded(l.at[0])}" y="${rounded(l.at[1])}"${l.angle ? ` transform="rotate(${rounded(l.angle)} ${rounded(l.at[0])} ${rounded(l.at[1])})"` : ""} text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="16" fill="black" stroke="none">${escapeXml(l.text)}</text>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-180 -180 360 360" width="280" height="280"><desc>arithmetic-geometry-drill-segments-v1</desc><g data-segment-content="true">${plan.geometry}<g data-segment-dimension="${plan.given.key}" data-endpoints="${plan.given.endpoints.flat().join(" ")}" data-projected="${d.projected.flat().join(" ")}">${witness}${d.curve!.replace("<path ", '<path data-segment-curve="true" ')}</g>${labels}</g></svg>`;
}
