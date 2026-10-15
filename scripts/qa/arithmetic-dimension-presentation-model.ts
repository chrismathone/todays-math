/** Offline display plan, derived from the immutable published SVG coordinates.
 * No answer, parameter, registry or snapshot data is changed by this module.
 */
import assert from "node:assert/strict";
import { planeSpecs } from "../../src/lib/arithmetic-v2/families/geometryElementary/plane";
import { solidCircleSpecs } from "../../src/lib/arithmetic-v2/families/geometryElementary/solidsCircle";
import { measurementSpecs } from "../../src/lib/arithmetic-v2/families/geometryElementary/measurement";
import { netSpecs } from "../../src/lib/arithmetic-v2/families/geometryElementary/net";
import { angleMarkPath } from "../../src/components/unified/figure-editor/figureAngleMark";

export type Point = [number, number];
export type Dimension = {
  name: string;
  label: string;
  /** Actual measured endpoints; projection endpoints only position the mark. */
  endpoints: [Point, Point];
  projected: [Point, Point];
  offset: number;
};
export type Plan = {
  id: string;
  family: string;
  source: string;
  geometry: string;
  shape: Point[];
  dimensions: Dimension[];
  notes: string[];
};
export const dimensionSpecs = [
  ...planeSpecs,
  ...measurementSpecs.filter((s) => s.id.startsWith("e3-circle-")),
  ...solidCircleSpecs,
  ...netSpecs,
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
const unescapeXml = (s: string) =>
  s.replace(
    /&(amp|lt|gt|quot|apos);/g,
    (_, c: string) =>
      ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[c]!,
  );
const coords = (path: string): Point[] => {
  const values = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  return Array.from({ length: values.length / 2 }, (_, i) => [
    values[2 * i],
    values[2 * i + 1],
  ]);
};
const scalePoint = ([x, y]: Point): Point => [
  Number(((x - 120) * 1.6).toFixed(5)),
  Number(((y - 125) * 1.6).toFixed(5)),
];
const mark = (at: Point, from: Point, to: Point) => {
  const result = angleMarkPath({
    at: scalePoint(at),
    from: scalePoint(from),
    to: scalePoint(to),
    right: true,
    radius: 17,
  });
  assert.ok("d" in result, "source right angle must be geometrically right");
  return `<path data-dimension-right="true" d="${result.d}" fill="none" stroke="#111" stroke-width=".72"/>`;
};

export function dimensionPlans(): Plan[] {
  return dimensionSpecs.flatMap((spec) =>
    spec.domain.map((p) => {
      const source = spec.present(p).svg();
      const labels = [...source.matchAll(/<text\b([^>]*)>(.*?)<\/text>/g)].map(
        (m) => ({
          x: Number(/\bx="([^"]+)"/.exec(m[1])![1]),
          y: Number(/\by="([^"]+)"/.exec(m[1])![1]),
          text: unescapeXml(m[2]),
        }),
      );
      const at = (x: number, y: number) =>
        labels.find((l) => l.x === x && l.y === y)?.text ?? "";
      const paths = [
        ...source.matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*\/>/g),
      ].map((m) => ({ svg: m[0], points: coords(m[1]) }));
      const shape = paths[0]?.points ?? [];
      const dimensions: Dimension[] = [];
      const notes: string[] = [];
      let geometry = "";
      let marks = "";
      const add = (
        name: string,
        a: Point,
        b: Point,
        label: string,
        offset = 23,
        projection?: [Point, Point],
      ) => {
        assert.ok(label, `${spec.id}: missing ${name}`);
        dimensions.push({
          name,
          label,
          endpoints: [scalePoint(a), scalePoint(b)],
          projected: (projection ?? [a, b]).map(scalePoint) as [Point, Point],
          offset,
        });
      };
      const head = at(120, 25) || at(120, 22);
      if (head) notes.push(head);
      if (spec.id.includes("cylinder-net")) {
        const [A, B, C] = shape;
        const circles = [
          ...source.matchAll(
            /<circle\b[^>]*data-drill-net-base="true"[^>]*\/>/g,
          ),
        ];
        assert.equal(
          circles.length,
          2,
          `${spec.id}: both circular bases remain visible`,
        );
        const radius = Number(/\br="([^"]+)"/.exec(circles[0][0])![1]);
        const cy = Number(/\bcy="([^"]+)"/.exec(circles[0][0])![1]);
        const baseLabel = at(120, 215);
        const diameter = baseLabel.startsWith("밑면 지름");
        const a: Point = [diameter ? 120 - radius : 120, cy];
        const b: Point = [120 + radius, cy];
        geometry =
          paths[0].svg +
          circles.map((c) => c[0]).join("") +
          `<path d="M${a.join(",")} L${b.join(",")}"/><circle cx="120" cy="${cy}" r="1.6" fill="#111"/>`;
        marks = mark(A, B, shape[3]);
        add("height", B, C, at(220, 125).replace(/^높이 (?=\d)/, ""), -20, [
          [B[0] + 12, B[1]],
          [C[0] + 12, C[1]],
        ]);
        add(
          diameter ? "diameter" : "radius",
          a,
          b,
          baseLabel
            .replace(/^밑면 (반지름|지름) (?=\d)/, "")
            .replace(/^밑면 /, ""),
          -20,
          [
            [a[0], cy - radius - 12],
            [b[0], cy - radius - 12],
          ],
        );
        for (const circle of circles) {
          const centerY = Number(/\bcy="([^"]+)"/.exec(circle[0])![1]);
          shape.push(
            [120 - radius, centerY],
            [120 + radius, centerY],
            [120, centerY - radius],
            [120, centerY + radius],
          );
        }
      } else if (spec.id.includes("circle")) {
        geometry = [...source.matchAll(/<circle\b[^>]*\/>/g)]
          .map((m) => m[0])
          .join("");
        // Forward tasks already draw this exact radius/diameter. Inverse tasks
        // gain only the requested segment name, never a computed numerical value.
        const forward = paths.length > 0;
        const label = at(120, 215);
        const radius = forward
          ? label.startsWith("반지름")
          : spec.id.includes("-radius-");
        const a: Point = radius ? [120, 125] : [54, 125];
        const b: Point = [186, 125];
        geometry += `<path d="M${a.join(",")} L${b.join(",")}"/>`;
        if (!forward) notes.unshift(label);
        add(
          radius ? "radius" : "diameter",
          a,
          b,
          forward
            ? label.replace(/^(반지름|지름) /, "")
            : radius
              ? "반지름"
              : "지름",
          25,
        );
        // Circle extrema are also used by the full-domain fit audit.
        shape.splice(
          0,
          shape.length,
          [54, 125],
          [120, 59],
          [186, 125],
          [120, 191],
        );
      } else if (spec.id.includes("cuboid") || spec.id.includes("cube-")) {
        const [A, B, , E] = shape;
        const backB = paths[2].points[1];
        geometry = paths
          .slice(0, 6)
          .map((x) => x.svg)
          .join("");
        const width = at(120, 215);
        if (width.startsWith("밑넓이")) notes.push(width);
        else add("width", A, B, width.replace(/^가로 /, ""));
        if (at(25, 125))
          add("height", E, A, at(25, 125).replace(/^높이 (?=\d)/, ""));
        if (at(220, 125))
          add("depth", B, backB, at(220, 125).replace(/^세로 /, ""));
        notes.push("겨냥도");
        shape.push(...paths[1].points, ...paths[2].points);
      } else if (spec.id.includes("rectangle") || spec.id.includes("square")) {
        const [A, B, C, D] = shape;
        geometry = paths
          .filter((_, i) => i !== 1)
          .map((x) => x.svg)
          .join("");
        marks = mark(A, B, D);
        add("base", D, C, at(120, 215));
        if (at(220, 125)) add("side", B, C, at(220, 125), -23);
      } else if (spec.id.includes("rhombus-area")) {
        const [L, T, R, B] = shape;
        geometry = paths
          .slice(0, 3)
          .map((x) => x.svg)
          .join("");
        marks = mark([120, 125], R, T);
        add("horizontal-diagonal", L, R, at(120, 215), 13, [
          [L[0], B[1] + 9],
          [R[0], B[1] + 9],
        ]);
        add("vertical-diagonal", T, B, at(220, 125), -13, [
          [R[0] + 9, T[1]],
          [R[0] + 9, B[1]],
        ]);
      } else if (/-area/.test(spec.id)) {
        const [L, R] = shape;
        const [peak, foot] = paths[1].points;
        geometry = paths
          .slice(0, 2)
          .map((x) => x.svg)
          .join("");
        marks = mark(foot, peak, R);
        add("base", L, R, at(120, 215));
        // A witness from each real endpoint makes height distinct from the side.
        const x = Math.min(...shape.map((v) => v[0])) - 11;
        add("height", peak, foot, at(23, 120), 13, [
          [x, peak[1]],
          [x, foot[1]],
        ]);
        if (shape.length === 4 && spec.id.includes("trapezoid"))
          add("top", shape[3], shape[2], at(120, 45), -23);
      } else if (spec.id.includes("triangle-perimeter")) {
        const [L, R, T] = shape;
        geometry = paths[0].svg;
        add("base", L, R, at(120, 215));
        add("left", T, L, at(23, 125));
        add("right", R, T, at(220, 125));
      } else if (spec.id.includes("parallelogram")) {
        geometry = paths[0].svg;
        add("base", shape[0], shape[1], at(120, 215));
        add("side", shape[1], shape[2], at(220, 125));
      } else {
        geometry = paths.map((x) => x.svg).join("");
        // Select the lowest edge, preserving the source polygon rotation.
        const edges = shape.map(
          (a, i) => [a, shape[(i + 1) % shape.length]] as [Point, Point],
        );
        const [a, b] = edges.sort(
          (e, f) => f[0][1] + f[1][1] - (e[0][1] + e[1][1]),
        )[0];
        const winding = shape.reduce((sum, v, i) => {
          const q = shape[(i + 1) % shape.length];
          return sum + v[0] * q[1] - q[0] * v[1];
        }, 0);
        add(
          "side",
          a,
          b,
          at(120, 215).replace(/^한 변 /, ""),
          winding > 0 ? -23 : 23,
        );
      }
      return {
        id: `age-${spec.id}-v1-${p.join("-")}`,
        family: spec.id,
        source,
        geometry: `<g data-dimension-source="true" transform="matrix(1.6 0 0 1.6 -192 -200)" fill="none" stroke="#111" stroke-width="1.0625" stroke-linecap="round" stroke-linejoin="round">${geometry}</g>${marks}`,
        shape: shape.map(scalePoint),
        dimensions,
        notes,
      };
    }),
  );
}
