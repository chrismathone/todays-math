/** Offline presentation recipes. Geometry is read from the immutable source SVG;
 * only a uniform scale/translation and annotation layout are changed. FigureSpec
 * v2 remains the renderer (including angle marks, equal-side ticks and MathJax).
 */
import { angleSpecs } from "../../src/lib/arithmetic-v2/families/geometryElementary/angles";
export type Point = [number, number];
export type Entry = ReturnType<typeof angleEntries>[number];
export function angleEntries() {
  return angleSpecs.flatMap((family) =>
    family.domain.map((params) => ({
      id: `age-${family.id}-v1-${params.join("-")}`,
      family: family.id,
      params,
      original: family.present(params).svg(),
      givens: family.present(params).givens,
      target: family.solve(params)[0] / family.solve(params)[1],
    })),
  );
}
const nums = (s: string) =>
  (s.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
export function sourceVertices(entry: Entry): Point[] {
  const polygon = /data-drill-shape="polygon" d="([^"]+)"/.exec(entry.original);
  if (polygon) {
    const n = nums(polygon[1]);
    return Array.from({ length: n.length / 2 }, (_, i) => [
      n[2 * i],
      n[2 * i + 1],
    ]);
  }
  const paths = [...entry.original.matchAll(/<path d="(M[^"A]+L[^"A]+)"\/>/g)];
  const count = entry.family.includes("turn") ? 2 : 3;
  const n = paths.slice(0, count).map((m) => nums(m[1]));
  return [[n[0][0], n[0][1]], ...n.map((v) => [v[2], v[3]] as Point)];
}
export function createAnglePresentationSpec(entry: Entry, wholeOffset = 0) {
  const original = sourceVertices(entry);
  const turn = entry.family.includes("turn");
  const xs = original.map((p) => p[0]),
    ys = original.map((p) => p[1]);
  const span = Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
  );
  const scale = turn ? 118 / 68 : 240 / span;
  const vertices = original.map(
    ([x, y]) =>
      [(x - original[0][0]) * scale, (y - original[0][1]) * scale] as Point,
  );
  const points: Record<string, Point> = Object.fromEntries(
    vertices.map((p, i) => [`P${i}`, p]),
  );
  const segments: Record<string, unknown> = {};
  const angles: Record<string, unknown> = {};
  const circles: Record<string, unknown> = {};
  const arcs: Record<string, unknown> = {};
  const labels: Record<string, unknown> = {};
  const angle = (
    name: string,
    vertex: number,
    a: number,
    b: number,
    value?: number,
    radius = 20,
    distance?: number,
  ) => {
    angles[name] = {
      vertex: `P${vertex}`,
      points: [`P${a}`, `P${b}`],
      label: value === undefined ? "" : `${value}°`,
      radius,
      ...(distance === undefined ? {} : { label_distance: distance }),
    };
  };
  if (
    entry.family.includes("quadrilateral") ||
    entry.family.includes("isosceles")
  ) {
    const count = vertices.length;
    for (let i = 0; i < count; i++)
      segments[`side${i}`] = {
        points: [`P${i}`, `P${(i + 1) % count}`],
        ...(count === 3 && i !== 1 ? { ticks: 1 } : {}),
      };
    if (count === 4) {
      const given = [...entry.original.matchAll(/data-degrees="([^"]+)"/g)].map(
        (m) => Number(m[1]),
      );
      for (let i = 0; i < 4; i++)
        angle(`corner${i}`, i, (i + 3) % 4, (i + 1) % 4, given[i]);
    } else {
      const base = entry.params[0],
        toBase = entry.family.includes("-base-");
      angle(
        "given",
        toBase ? 0 : 1,
        toBase ? 1 : 0,
        2,
        toBase ? 180 - 2 * base : base,
      );
      angle("target", toBase ? 1 : 0, toBase ? 0 : 1, 2);
    }
  } else {
    for (let i = 1; i < vertices.length; i++)
      segments[`ray${i}`] = ["P0", `P${i}`];
    const [a, b] = entry.params;
    const rayLength = Math.hypot(...vertices[1]);
    if (entry.family.endsWith("sum")) {
      angle("givenA", 0, 1, 2, a, 22);
      angle("givenB", 0, 2, 3, b, 22);
      angle("target", 0, 1, 3, undefined, rayLength * 0.78);
    } else if (entry.family.endsWith("difference")) {
      angle(
        "givenPart",
        0,
        1,
        2,
        b,
        22,
        b === 20 ? 84 : b === 25 ? 68 : undefined,
      );
      const outerRadius = Math.max(rayLength * 0.78, 110);
      angle("givenWhole", 0, 1, 3, undefined, outerRadius);
      // A nested whole-angle value belongs just beyond its outer arc. Keep it
      // within the whole sector; when its bisector coincides with the dividing
      // ray, move along that same arc instead of drawing a long crossed leader.
      // Point-label collision scoring does not include the full stroke width.
      // Reserve angular clearance before asking the engine to resolve the box.
      const nearDivider = Math.abs(a / 2 - b) < 10;
      const direction =
        a / 2 + (wholeOffset || (nearDivider ? (b < a / 2 ? 12 : -12) : 0));
      if (direction < 15 || direction > a - 15)
        throw new Error("whole label outside sector");
      const labelDistance = outerRadius + 21;
      points.wholeLabel = [
        labelDistance * Math.cos((direction * Math.PI) / 180),
        -labelDistance * Math.sin((direction * Math.PI) / 180),
      ];
      labels.wholeLabel = { text: `${a}°`, dx: 0, dy: 5.12, font_size: 16 };
      angle("target", 0, 2, 3, undefined, 38);
    } else if (turn) {
      // FigureSpec angle marks deliberately choose the minor angle. Directed
      // circle arcs preserve BOTH reflex cases without adding a new renderer.
      for (const [name, r, from, to] of [
        ["given", 85, 0, a],
        ["target", 105, a, 360],
      ] as const) {
        circles[name + "Circle"] = { center: "P0", radius: r, draw: false };
        for (const [suffix, t] of [
          ["Start", from],
          ["End", to],
        ] as const)
          points[name + suffix] = [
            r * Math.cos((t * Math.PI) / 180),
            -r * Math.sin((t * Math.PI) / 180),
          ];
        arcs[name] = {
          circle: name + "Circle",
          from: name + "Start",
          to: name + "End",
          dir: "ccw",
        };
      }
      points.givenLabel = [
        56 * Math.cos(((a / 2) * Math.PI) / 180),
        -56 * Math.sin(((a / 2) * Math.PI) / 180),
      ];
      labels.givenLabel = { text: `${a}°`, dx: 0, dy: 5.12, font_size: 16 };
    } else {
      angle("given", 0, 1, 2, a, 22);
      angle("target", 0, 2, 3, undefined, 38);
      if (entry.family.includes("right"))
        angles.whole = {
          vertex: "P0",
          points: ["P1", "P3"],
          right: true,
          label: "",
          radius: 16,
        };
    }
  }
  return {
    spec: {
      version: 2,
      points,
      segments,
      angles,
      circles,
      arcs,
      labels,
      style: {
        clear_angle_labels: true,
        padding: 4,
        angle_font_size: 16,
        font_size: 16,
        angle_radius: 20,
        angle_label_distance: entry.family.endsWith("sum") ? 44 : 32,
        segment_width: 1.7,
        mark_width: 0.85,
      },
    },
    vertices,
    scale,
  };
}
