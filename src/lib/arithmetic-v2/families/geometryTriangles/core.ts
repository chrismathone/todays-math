import { ArithmeticV2EngineError } from "../../errors";
import type {
  ArithmeticGrade,
  ArithmeticV2Answer,
  ArithmeticV2Definition,
  ArithmeticV2Prompt,
} from "../../types";

export type Point = readonly [number, number];
export type Model = {
  points: Record<string, Point>;
  edges: string[];
  equal?: string[][];
  parallel?: string[][];
  right?: string[];
  arcs?: string[];
  circles?: { center: string; radius: number }[];
  givens?: { key: string; text: string; kind: "angle" | "segment" }[];
};
export type Scalar = { n: number; d?: number; root?: number };
export type Task = {
  text: string;
  target: string;
  value: Scalar;
  model: Model;
};
export type Spec = {
  key: string;
  title: string;
  topic: string;
  unit: string;
  grade?: ArithmeticGrade;
  rows: number[][];
  task(p: readonly number[]): Task;
  /** Checks the defining equation independently of task()/problemAt(). */
  relation(p: readonly number[], value: number): boolean;
};
export const range = (lo: number, hi: number, step = 1) =>
  Array.from(
    { length: Math.floor((hi - lo) / step) + 1 },
    (_, i) => lo + i * step,
  );
export const rows = (...axes: readonly number[][]): number[][] =>
  axes.reduce<number[][]>(
    (acc, axis) => acc.flatMap((p) => axis.map((x) => [...p, x])),
    [[]],
  );
export const near = (a: number, b: number) =>
  Math.abs(a - b) < 1e-8 * Math.max(1, Math.abs(a), Math.abs(b));
export const gcd = (a: number, b: number): number =>
  b ? gcd(b, a % b) : Math.abs(a);
export const dist = (a: Point, b: Point) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);
export const lerp = (a: Point, b: Point, t: number): Point => [
  a[0] + t * (b[0] - a[0]),
  a[1] + t * (b[1] - a[1]),
];
export const midpoint = (a: Point, b: Point) => lerp(a, b, 0.5);
export const rad = (a: number) => (a * Math.PI) / 180;

/** Coordinates are mathematical (y up). Every renderer transform is uniform. */
export function triangle(a = 60, b = (180 - a) / 2): Model {
  const c = 180 - a - b;
  const side = Math.sin(rad(c)) / Math.sin(rad(a));
  return {
    points: {
      A: [side * Math.cos(rad(b)), side * Math.sin(rad(b))],
      B: [0, 0],
      C: [1, 0],
    },
    edges: ["AB", "BC", "CA"],
  };
}
export function sides(ab: number, ac: number, bc: number): Model {
  const x = (ab * ab + bc * bc - ac * ac) / (2 * bc);
  return {
    points: { A: [x, Math.sqrt(ab * ab - x * x)], B: [0, 0], C: [bc, 0] },
    edges: ["AB", "BC", "CA"],
  };
}
export function center(m: Model, kind: "O" | "I"): Model {
  const { A, B, C } = m.points;
  if (kind === "O") {
    // B=(0,0), C=(c,0), so its perpendicular bisector is x=c/2.
    m.points.O = [C[0] / 2, (A[0] ** 2 + A[1] ** 2 - C[0] * A[0]) / (2 * A[1])];
    m.equal = [["OA", "OB", "OC"]];
  } else {
    const a = dist(B, C),
      b = dist(C, A),
      c = dist(A, B),
      p = a + b + c;
    m.points.I = [
      (a * A[0] + b * B[0] + c * C[0]) / p,
      (a * A[1] + b * B[1] + c * C[1]) / p,
    ];
  }
  m.edges.push(`${kind}A`, `${kind}B`, `${kind}C`);
  return m;
}
export function rightTriangle(a: number, b: number): Model {
  return {
    points: { A: [0, b], B: [0, 0], C: [a, 0] },
    edges: ["AB", "BC", "CA"],
    right: ["ABC"],
  };
}
export function median(): Model {
  const m = sides(13, 15, 14);
  const { A, B, C } = m.points;
  m.points.D = midpoint(B, C);
  m.points.G = lerp(A, m.points.D, 2 / 3);
  m.edges.push("AD", "BG", "CG");
  m.equal = [["BD", "DC"]];
  return m;
}
export function midline(t = 0.5): Model {
  const m = sides(13, 15, 14);
  m.points.D = lerp(m.points.A, m.points.B, t);
  m.points.E = lerp(m.points.A, m.points.C, t);
  m.edges.push("DE");
  m.parallel = [["DE", "BC"]];
  if (t === 0.5)
    m.equal = [
      ["AD", "DB"],
      ["AE", "EC"],
    ];
  return m;
}
export function trapezoid(top: number, bottom: number, t = 0.5): Model {
  const h = (top + bottom) / 2;
  const m: Model = {
    points: {
      A: [-top / 2, h],
      D: [top / 2, h],
      B: [-bottom / 2, 0],
      C: [bottom / 2, 0],
    },
    edges: ["AB", "BC", "CD", "DA"],
  };
  m.points.E = lerp(m.points.A, m.points.B, t);
  m.points.F = lerp(m.points.D, m.points.C, t);
  m.edges.push("EF");
  m.parallel = [["AD", "EF", "BC"]];
  return m;
}
export function canonical(s: Scalar, unit: string): ArithmeticV2Answer {
  let n = s.n,
    d = s.d ?? 1,
    r = s.root ?? 1;
  if (![n, d, r].every(Number.isSafeInteger) || n <= 0 || d <= 0 || r <= 0)
    throw new Error("Invalid exact positive scalar");
  for (let k = 2; k * k <= r; k++)
    while (r % (k * k) === 0) {
      n *= k;
      r /= k * k;
    }
  const g = gcd(n, d);
  n /= g;
  d /= g;
  const baseText = r === 1 ? String(n) : `${n === 1 ? "" : n}√${r}`;
  const baseTex = r === 1 ? String(n) : `${n === 1 ? "" : n}\\sqrt{${r}}`;
  const text = d === 1 ? baseText : `${baseText}/${d}`;
  const latex = d === 1 ? baseTex : `\\frac{${baseTex}}{${d}}`;
  const suffix =
    unit === "°"
      ? "^{\\circ}"
      : unit
        ? `\\,\\mathrm{${unit.replace("²", "^2").replace("³", "^3")}}`
        : "";
  return {
    kind: r !== 1 ? "surd" : d === 1 ? "integer" : "rational",
    exact:
      r !== 1
        ? [String(n), String(r), String(d)]
        : d === 1
          ? [String(n)]
          : [String(n), String(d)],
    text: text + (unit === "°" ? unit : unit ? ` ${unit}` : ""),
    latex: latex + suffix,
  };
}
function readAnswer(a: ArithmeticV2Answer, unit: string): number | null {
  if (!Array.isArray(a.exact) || !a.exact.every((s) => /^[1-9]\d*$/.test(s)))
    return null;
  const v = a.exact.map(Number);
  // All finite domains here are far below this ceiling; reject hostile huge
  // radicands before square-factor normalization can become expensive.
  if (!v.every((n) => Number.isSafeInteger(n) && n <= 1_000_000)) return null;
  const s =
    a.kind === "integer" && v.length === 1
      ? { n: v[0] }
      : a.kind === "rational" && v.length === 2
        ? { n: v[0], d: v[1] }
        : a.kind === "surd" && v.length === 3
          ? { n: v[0], root: v[1], d: v[2] }
          : null;
  if (!s) return null;
  const expected = canonical(s, unit);
  if (
    a.kind !== expected.kind ||
    a.text !== expected.text ||
    a.latex !== expected.latex ||
    a.exact.length !== expected.exact.length ||
    !a.exact.every((v, i) => v === expected.exact[i]) ||
    Object.keys(a).length !== 4
  )
    return null;
  return (s.n * Math.sqrt(s.root ?? 1)) / (s.d ?? 1);
}
const escape = (s: string) =>
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
const num = (n: number) => String(Math.round(n * 1e5) / 1e5);
type Box = { x: number; y: number; w: number; h: number };
function overlaps(a: Box, b: Box) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
export function lineHitsBox(a: Point, b: Point, box: Box): boolean {
  let low = 0,
    high = 1;
  for (let axis = 0; axis < 2; axis++) {
    const start = axis === 0 ? box.x : box.y,
      end = start + (axis === 0 ? box.w : box.h),
      delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-12) {
      if (a[axis] < start || a[axis] > end) return false;
    } else {
      const u = (start - a[axis]) / delta,
        v = (end - a[axis]) / delta;
      low = Math.max(low, Math.min(u, v));
      high = Math.min(high, Math.max(u, v));
      if (low > high) return false;
    }
  }
  return true;
}
/** Deterministic, safe SVG; no network, font outlines, scripts or foreignObject. */
export function render(
  model: Model,
  /** Display-only variants; defaults reproduce the frozen gt1 SVG bytes. */
  options: { angleLabelsInside?: boolean } = {},
): string {
  const raw = Object.values(model.points),
    xs = raw.map((p) => p[0]),
    ys = raw.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const scale = Math.min(144 / (maxX - minX), 132 / (maxY - minY));
  const points = Object.fromEntries(
    Object.entries(model.points).map(([k, p]) => [
      k,
      [
        120 + (p[0] - (minX + maxX) / 2) * scale,
        116 - (p[1] - (minY + maxY) / 2) * scale,
      ] as Point,
    ]),
  );
  const angleRadius = (key: string) => {
    const a = points[key[0]],
      b = points[key[1]],
      c = points[key[2]];
    const height =
      Math.abs((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) /
      dist(a, c);
    return Math.max(
      4,
      Math.min(14, height * 0.75, dist(a, b) * 0.4, dist(b, c) * 0.4),
    );
  };
  const lines: [Point, Point][] = model.edges.map((e) => [
    points[e[0]],
    points[e[1]],
  ]);
  const line = (a: Point, b: Point, extra = "") => {
    lines.push([a, b]);
    return `<line x1="${num(a[0])}" y1="${num(a[1])}" x2="${num(b[0])}" y2="${num(b[1])}"${extra}/>`;
  };
  let body = model.edges
    .map((e) =>
      line(points[e[0]], points[e[1]], ` data-segment="${escape(e)}"`),
    )
    .join("");
  for (const [group, segments] of (model.equal ?? []).entries())
    for (const e of segments) {
      const a = points[e[0]],
        b = points[e[1]],
        length = dist(a, b),
        dx = (b[0] - a[0]) / length,
        dy = (b[1] - a[1]) / length;
      for (let j = 0; j <= group; j++) {
        const c = lerp(a, b, 0.5),
          shift = (j - group / 2) * 5;
        body += line(
          [c[0] + dx * shift - dy * 4, c[1] + dy * shift + dx * 4],
          [c[0] + dx * shift + dy * 4, c[1] + dy * shift - dx * 4],
        );
      }
    }
  for (const segments of model.parallel ?? [])
    for (const e of segments) {
      const a = points[e[0]],
        b = points[e[1]],
        c = lerp(a, b, 0.65),
        length = dist(a, b),
        dx = (b[0] - a[0]) / length,
        dy = (b[1] - a[1]) / length;
      body +=
        line([c[0] - 4 * dx + 3 * dy, c[1] - 4 * dy - 3 * dx], c) +
        line(c, [c[0] - 4 * dx - 3 * dy, c[1] - 4 * dy + 3 * dx]);
    }
  for (const key of model.right ?? []) {
    const a = points[key[0]],
      b = points[key[1]],
      c = points[key[2]],
      u = lerp(b, a, 9 / dist(b, a)),
      v = lerp(b, c, 9 / dist(b, c)),
      w: Point = [u[0] + v[0] - b[0], u[1] + v[1] - b[1]];
    body += line(u, w) + line(w, v);
  }
  for (const key of model.arcs ?? []) {
    const radius = angleRadius(key);
    const a = points[key[0]],
      b = points[key[1]],
      c = points[key[2]],
      u = lerp(b, a, radius / dist(b, a)),
      v = lerp(b, c, radius / dist(b, c));
    const cross = (a[0] - b[0]) * (c[1] - b[1]) - (a[1] - b[1]) * (c[0] - b[0]);
    body += `<path d="M ${num(u[0])} ${num(u[1])} A ${num(radius)} ${num(radius)} 0 0 ${cross > 0 ? 1 : 0} ${num(v[0])} ${num(v[1])}"/>`;
    const start = Math.atan2(u[1] - b[1], u[0] - b[0]);
    let sweep = Math.atan2(v[1] - b[1], v[0] - b[0]) - start;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;
    const samples = range(0, 12).map(
      (i) =>
        [
          b[0] + radius * Math.cos(start + (sweep * i) / 12),
          b[1] + radius * Math.sin(start + (sweep * i) / 12),
        ] as Point,
    );
    for (let i = 1; i < samples.length; i++)
      lines.push([samples[i - 1], samples[i]]);
  }
  for (const circle of model.circles ?? []) {
    const p = points[circle.center],
      r = circle.radius * scale;
    body += `<circle cx="${num(p[0])}" cy="${num(p[1])}" r="${num(r)}"/>`;
    const samples = range(0, 72).map(
      (i) =>
        [
          p[0] + r * Math.cos((i * Math.PI) / 36),
          p[1] + r * Math.sin((i * Math.PI) / 36),
        ] as Point,
    );
    for (let i = 1; i < samples.length; i++)
      lines.push([samples[i - 1], samples[i]]);
  }
  const boxes: Box[] = [];
  type Label = {
    name: string;
    p: Point;
    text: string;
    /** Bisector placement: unit direction into the angle from its vertex. */
    inside?: { vertex: Point; dx: number; dy: number; from: number };
  };
  const labels: Label[] = Object.entries(points).map(([name, p]) => ({
    name,
    p,
    text: name,
  }));
  const givenLabels: Label[] = [];
  for (const given of model.givens ?? []) {
    const key = given.key;
    let p: Point;
    let inside: Label["inside"];
    if (given.kind === "segment") p = midpoint(points[key[0]], points[key[1]]);
    else {
      const a = points[key[0]],
        b = points[key[1]],
        c = points[key[2]],
        ba = dist(b, a),
        bc = dist(b, c);
      const dx = (a[0] - b[0]) / ba + (c[0] - b[0]) / bc,
        dy = (a[1] - b[1]) / ba + (c[1] - b[1]) / bc,
        length = Math.hypot(dx, dy);
      const radius = angleRadius(key);
      p = [b[0] + (radius * dx) / length, b[1] + (radius * dy) / length];
      if (options.angleLabelsInside)
        inside = { vertex: b, dx: dx / length, dy: dy / length, from: radius };
    }
    givenLabels.push({
      name: `${given.kind}-${key}`,
      p,
      text: given.text,
      inside,
    });
  }
  // Inside placement claims the angle openings before the center point's name;
  // vertex names keep their original first claim on the outer corners.
  const centerNames = new Set(["O", "I"]);
  const ordered = options.angleLabelsInside
    ? [
        ...labels.filter((l) => !centerNames.has(l.name)),
        ...givenLabels,
        ...labels.filter((l) => centerNames.has(l.name)),
      ]
    : [...labels, ...givenLabels];
  for (const { name, p, text, inside } of ordered) {
    let selected: Box | undefined;
    const width = Math.max(14, text.length * 10);
    // A center ray along the bisector (AI, AO) may run under the value; the
    // white halo keeps it legible. Any other crossing line still rejects.
    const alongBisector = ([a, b]: [Point, Point]) => {
      if (!inside) return false;
      const far =
        dist(a, inside.vertex) < 0.5
          ? b
          : dist(b, inside.vertex) < 0.5
            ? a
            : null;
      if (!far) return false;
      const d = dist(far, inside.vertex);
      return (
        ((far[0] - inside.vertex[0]) * inside.dx +
          (far[1] - inside.vertex[1]) * inside.dy) /
          d >
        Math.cos(rad(4))
      );
    };
    const offsets = [0, 0.18, -0.18, 0.36, -0.36];
    for (let step = 0; inside && !selected && step < 16; step++)
      for (const offset of offsets) {
        const r = inside.from + 11 + step * 3,
          ux = inside.dx * Math.cos(offset) - inside.dy * Math.sin(offset),
          uy = inside.dx * Math.sin(offset) + inside.dy * Math.cos(offset),
          x = inside.vertex[0] + ux * r,
          y = inside.vertex[1] + uy * r,
          box = { x: x - width / 2, y: y - 9, w: width, h: 18 };
        if (
          box.x < 7 ||
          box.y < 7 ||
          box.x + box.w > 233 ||
          box.y + box.h > 233 ||
          boxes.some((b) => overlaps(box, b)) ||
          lines.some(
            (l) => !alongBisector(l) && lineHitsBox(l[0], l[1], box),
          ) ||
          // Never closer to another point: a value must read as its own vertex's.
          Object.values(points).some(
            (q) => q !== inside.vertex && dist(q, [x, y]) < r,
          )
        )
          continue;
        selected = box;
        boxes.push(box);
        body += `<text data-drill-label="${escape(name)}" x="${num(x)}" y="${num(y + 6)}" text-anchor="middle" stroke="white" stroke-width="4" paint-order="stroke" fill="black" font-family="Arial, sans-serif" font-size="16">${escape(text)}</text>`;
        break;
      }
    // The center's name stays inside the triangle, next to the center.
    const corners = ["A", "B", "C"].map((k) => points[k]);
    const insideTriangle = ([x, y]: Point) => {
      const sides = corners.map((a, i) => {
        const b = corners[(i + 1) % 3];
        return (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
      });
      return sides.every((s) => s > 0) || sides.every((s) => s < 0);
    };
    if (
      options.angleLabelsInside &&
      centerNames.has(name) &&
      corners.every(Boolean) &&
      insideTriangle(p)
    )
      for (const radius of [13, 16, 20, 24, 28, 33]) {
        for (let i = 0; i < 16 && !selected; i++) {
          const angle =
              (-3 * Math.PI) / 4 +
              (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 8),
            x = p[0] + radius * Math.cos(angle),
            y = p[1] + radius * Math.sin(angle),
            box = { x: x - 8, y: y - 10, w: 16, h: 20 };
          if (
            !(
              [
                [box.x, box.y],
                [box.x + box.w, box.y],
                [box.x, box.y + box.h],
                [box.x + box.w, box.y + box.h],
              ] as Point[]
            ).every(insideTriangle) ||
            boxes.some((b) => overlaps(box, b)) ||
            lines.some(([a, b]) => lineHitsBox(a, b, box))
          )
            continue;
          selected = box;
          boxes.push(box);
          body += `<text data-drill-label="${escape(name)}" x="${num(x)}" y="${num(y + 7)}" text-anchor="middle" stroke="none" fill="black" font-family="Arial, sans-serif" font-size="20">${escape(text)}</text>`;
        }
        if (selected) break;
      }
    if (selected) continue;
    const outward = Math.atan2(p[1] - 116, p[0] - 120);
    const directions = [outward, ...range(0, 15).map((i) => (i * Math.PI) / 8)];
    for (const radius of [21, 27, 34, 43, 54, 66, 80, 100]) {
      for (const angle of directions) {
        const x = p[0] + radius * Math.cos(angle),
          y = p[1] + radius * Math.sin(angle),
          width = Math.max(18, text.length * 12),
          box = { x: x - width / 2, y: y - 12, w: width, h: 24 };
        const padded = {
          x: box.x - 3,
          y: box.y - 3,
          w: box.w + 6,
          h: box.h + 6,
        };
        if (
          box.x < 7 ||
          box.y < 7 ||
          box.x + box.w > 233 ||
          box.y + box.h > 233 ||
          boxes.some((b) => overlaps(padded, b)) ||
          lines.some(([a, b]) => lineHitsBox(a, b, padded))
        )
          continue;
        if (radius > 28 && boxes.some((b) => lineHitsBox(p, [x, y], b)))
          continue;
        selected = box;
        break;
      }
      if (selected) break;
    }
    if (!selected) throw new Error(`No legible label placement for ${name}`);
    boxes.push(selected);
    const labelCenter: Point = [selected.x + selected.w / 2, selected.y + 12];
    const labelDistance = dist(p, labelCenter),
      stop =
        Math.min(
          selected.w /
            2 /
            Math.max(0.001, Math.abs((p[0] - labelCenter[0]) / labelDistance)),
          12 /
            Math.max(0.001, Math.abs((p[1] - labelCenter[1]) / labelDistance)),
        ) + 3;
    if (labelDistance > 28 || name.includes("-"))
      body += line(
        lerp(p, labelCenter, 3 / labelDistance),
        lerp(labelCenter, p, stop / labelDistance),
        ` stroke-width="0.8" data-leader="${escape(name)}"`,
      );
    body += `<text data-drill-label="${escape(name)}" x="${num(labelCenter[0])}" y="${num(selected.y + 18)}" text-anchor="middle" stroke="none" fill="black" font-family="Arial, sans-serif" font-size="20">${escape(text)}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240"><desc>arithmetic-geometry-drill-v1</desc><rect width="240" height="240" fill="white"/><g fill="none" stroke="black" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
}

export function build(specs: readonly Spec[]) {
  const figures: Record<string, string> = {};
  const definitions: ArithmeticV2Definition[] = specs.map((spec) => {
    const id = `${spec.grade === "중3" ? "m3" : "m2"}-${spec.key}`;
    const parameterKeys = new Set(spec.rows.map((p) => p.join("_")));
    if (parameterKeys.size !== spec.rows.length)
      throw new Error(`Repeated domain: ${id}`);
    const figureId = (p: readonly number[]) => `gt1-${id}-${p.join("-")}`;
    const makePrompt = (p: readonly number[]): ArithmeticV2Prompt => {
      const t = spec.task(p);
      const target = t.target + (spec.unit === "°" ? "의 크기" : ""),
        last = target.charCodeAt(target.length - 1);
      const objectParticle =
        last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0
          ? "을"
          : "를";
      return {
        layout: "math",
        text: t.text,
        latex: `\\text{${id}:${p.join(",")}}`,
        instruction: `${target}${objectParticle} 구하세요.${spec.grade === "중3" ? " 근호는 가장 간단히 하세요." : ""}`,
        figureId: figureId(p),
        answerUnit: spec.unit,
      };
    };
    for (const p of spec.rows) {
      const fid = figureId(p);
      if (fid.length > 64 || Object.hasOwn(figures, fid))
        throw new Error(`Invalid figure identity: ${fid}`);
      let cached: string | undefined;
      Object.defineProperty(figures, fid, {
        enumerable: true,
        get() {
          if (cached) return cached;
          const task = spec.task(p),
            givens: NonNullable<Model["givens"]> = [];
          for (const m of task.text.matchAll(/∠([A-Z]{3})=(\d+)°/g))
            if (Number(m[2]) !== 90)
              givens.push({ key: m[1], text: `${m[2]}°`, kind: "angle" });
          for (const m of task.text.matchAll(/(?<![A-Z+])([A-Z]{2})=(\d+) cm/g))
            givens.push({ key: m[1], text: m[2], kind: "segment" });
          // The complete givens are always in prompt.text; one key value on a
          // crowded figure avoids shrinking labels or colliding with center rays.
          task.model.givens = givens.slice(0, 1);
          return (cached = render(task.model));
        },
      });
    }
    return {
      id,
      grade: spec.grade ?? "중2",
      strand: "도형",
      title: spec.title,
      description: `${spec.topic}의 주어진 수로 ${spec.title}을 계산합니다.`,
      labels: [spec.topic, "도형 연산"],
      rankGroup: spec.key,
      domainSize: spec.rows.length,
      problemAt(index) {
        if (
          !Number.isSafeInteger(index) ||
          index < 0 ||
          index >= spec.rows.length
        )
          throw new ArithmeticV2EngineError("operand");
        const p = [...spec.rows[index]];
        return {
          parameters: p,
          prompt: makePrompt(p),
          answer: canonical(spec.task(p).value, spec.unit),
        };
      },
      verify(candidate) {
        if (
          !Array.isArray(candidate.parameters) ||
          !candidate.parameters.every(Number.isSafeInteger) ||
          !parameterKeys.has(candidate.parameters.join("_"))
        )
          return false;
        const value = readAnswer(candidate.answer, spec.unit);
        const expected = makePrompt(candidate.parameters),
          actual = candidate.prompt;
        return (
          value !== null &&
          spec.relation(candidate.parameters, value) &&
          actual.layout === "math" &&
          expected.layout === "math" &&
          actual.text === expected.text &&
          actual.latex === expected.latex &&
          actual.instruction === expected.instruction &&
          actual.figureId === expected.figureId &&
          actual.answerUnit === expected.answerUnit &&
          Object.keys(actual).length === Object.keys(expected).length
        );
      },
    };
  });
  return {
    definitions: Object.freeze(definitions),
    figures: Object.freeze(figures),
  };
}
