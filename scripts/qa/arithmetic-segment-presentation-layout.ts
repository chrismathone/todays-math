/** Offline bounded layout search; output contains no layout code. */
import { sampleFigurePath } from "../../src/components/unified/figure-editor/figureFlip";
import {
  editorDimension,
  type EditorDimension,
} from "./arithmetic-segment-presentation-editor";
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
export type Dimension = EditorDimension;
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
  return sampleFigurePath(/\bd="([^"]+)"/.exec(curve)![1], 40)!.flatMap(
    (points) => points.slice(1).map((p, i) => [points[i], p] as Segment),
  );
}
export function dimensions(
  plan: SegmentPlan,
  bend?: number,
  labelFraction = 0.5,
): Dimension[] {
  const [a, b] = plan.given.endpoints,
    L = Math.hypot(b[0] - a[0], b[1] - a[1]),
    normal: Point = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L];
  const projections = Object.values(plan.points).map(
    (p) =>
      (p[0] - (a[0] + b[0]) / 2) * normal[0] +
      (p[1] - (a[1] + b[1]) / 2) * normal[1],
  );
  // A boundary dimension always uses the editor's outside command. Internal
  // segments may use its other supported side if outside collides with ink.
  const boundary =
    Math.min(...projections) >= -0.001 || Math.max(...projections) <= 0.001;
  return (["out", ...(boundary ? [] : ["in"])] as const).map((side) =>
    editorDimension(plan, side as "out" | "in", bend, labelFraction),
  );
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
  const centroid: Point = [
    Object.values(plan.points).reduce((n, p) => n + p[0], 0) /
      Object.keys(plan.points).length,
    Object.values(plan.points).reduce((n, p) => n + p[1], 0) /
      Object.keys(plan.points).length,
  ];
  let best: Layout | undefined;
  for (const dimension of candidates) {
    const numeric: Label = {
      key: `segment-${plan.given.key}`,
      text: plan.given.text,
      at: dimension.at,
      angle: 0,
      box: dimension.box!,
    };
    if (geometry.some((s) => hit(s, numeric, 1))) continue;
    const strokes = curveSegments(dimension.curve!);
    const obstacles = [...geometry, ...strokes];
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
      (dimension.bend === undefined ? 0 : 10000 + dimension.bend * 100) +
      (dimension.side === "in" ? 1000000 : 0) +
      crossing * (/[OIG]/.test(plan.given.key) ? 0 : 35);
    if (!best || score < best.score) best = { dimension, labels, score };
  }
  if (!best) throw new Error(`No collision-free layout for ${plan.id}`);
  return best;
}
export function assemble(plan: SegmentPlan, layout: Layout) {
  const d = layout.dimension;
  const numeric = d.label.replace(
    "<text ",
    `<text data-drill-label="segment-${plan.given.key}" data-segment-number="true" `,
  );
  const labels = layout.labels
    .slice(1)
    .map(
      (l) =>
        `<text data-drill-label="${l.key}"${l.key.startsWith("segment-") ? ' data-segment-number="true" data-line-gap="1"' : ` data-segment-point="${plan.points[l.key].join(" ")}"`} x="${rounded(l.at[0])}" y="${rounded(l.at[1])}"${l.angle ? ` transform="rotate(${rounded(l.angle)} ${rounded(l.at[0])} ${rounded(l.at[1])})"` : ""} text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="16" fill="black" stroke="none">${escapeXml(l.text)}</text>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-180 -180 360 360" width="280" height="280"><desc>arithmetic-geometry-drill-segments-v1</desc><g data-segment-content="true">${plan.geometry}<g data-segment-dimension="${plan.given.key}" data-editor-side="${d.side}"${d.bend === undefined ? "" : ` data-editor-bend="${d.bend}" data-editor-label-fraction="${d.labelFraction}"`} data-endpoints="${plan.given.endpoints.flat().join(" ")}">${d.curve.replace("<path ", '<path data-segment-curve="true" ')}</g>${numeric}${labels}</g></svg>`;
}
