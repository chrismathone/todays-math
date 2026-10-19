export type Point = readonly [number, number];
export const esc = (s: string) =>
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
export const fmt = (x: number) => Number(x.toFixed(5));
export const pt = (p: Point) => `${fmt(p[0])},${fmt(p[1])}`;
export const line = (a: Point, b: Point, dashed = false) =>
  `<path d="M${pt(a)} L${pt(b)}"${dashed ? ' stroke-dasharray="4 3"' : ""}/>`;
export const poly = (points: readonly Point[], close = true) =>
  `<path data-drill-shape="${close ? "polygon" : "line"}" d="M${points.map(pt).join(" L")}${close ? " Z" : ""}"/>`;
export const label = (x: number, y: number, text: string, rotate = 0) =>
  `<text data-drill-label="true" x="${fmt(x)}" y="${fmt(y)}"${rotate ? ` transform="rotate(${rotate} ${fmt(x)} ${fmt(y)})"` : ""}>${esc(text)}</text>`;
export const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240"><desc>arithmetic-geometry-drill-v1</desc><style>text{font:20px Arial,'Malgun Gothic',sans-serif;text-anchor:middle;dominant-baseline:middle;fill:#000;stroke:none}</style><rect width="240" height="240" fill="#fff"/><g fill="none" stroke="#000" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
export const polar = (o: Point, r: number, degrees: number): Point => [
  o[0] + r * Math.cos((degrees * Math.PI) / 180),
  o[1] - r * Math.sin((degrees * Math.PI) / 180),
];
export function arc(
  o: Point,
  r: number,
  from: number,
  to: number,
  known?: number,
): string {
  return `<path data-drill-angle="${known === undefined ? "target" : "given"}"${known === undefined ? "" : ` data-degrees="${known}"`} d="M${pt(polar(o, r, from))} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 0 ${pt(polar(o, r, to))}"/>`;
}
export function tick(a: Point, b: Point): string {
  const m: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dx = (4 * (b[1] - a[1])) / len,
    dy = (4 * (a[0] - b[0])) / len;
  return line([m[0] - dx, m[1] - dy], [m[0] + dx, m[1] + dy]);
}
export const right = (x: number, y: number, dx = 1, dy = -1) =>
  poly(
    [
      [x + dx * 8, y],
      [x + dx * 8, y + dy * 8],
      [x, y + dy * 8],
    ],
    false,
  );
export function rectangle(
  w: number,
  h: number,
  bottom: string,
  side: string,
  top = "",
  square = false,
): string {
  const scale = 130 / Math.max(w, h),
    W = w * scale,
    H = h * scale;
  const x = 120 - W / 2,
    y = 125 - H / 2;
  const points: Point[] = [
    [x, y],
    [x + W, y],
    [x + W, y + H],
    [x, y + H],
  ];
  return svg(
    poly(points) +
      right(x, y, 1, 1) +
      (square
        ? points.map((p, i) => tick(p, points[(i + 1) % 4])).join("")
        : "") +
      label(120, 215, bottom) +
      (side ? label(220, 125, side, -90) : "") +
      (top ? label(120, 25, top) : ""),
  );
}
export function baseHeight(
  kind: "triangle" | "parallelogram" | "trapezoid",
  b: number,
  h: number,
  bottom: string,
  height: string,
  topLength = 0,
  topLabel = "",
  area = "",
): string {
  const shift =
    kind === "parallelogram"
      ? b * 0.24
      : kind === "triangle"
        ? b * 0.38
        : (b - topLength) / 2;
  const scale = Math.min(
    132 / (b + (kind === "parallelogram" ? shift : 0)),
    120 / h,
  );
  const x = 120 - ((b + (kind === "parallelogram" ? shift : 0)) * scale) / 2,
    y = 180;
  const foot: Point = [x + shift * scale, y],
    peak: Point = [foot[0], y - h * scale];
  const points: Point[] =
    kind === "triangle"
      ? [[x, y], [x + b * scale, y], peak]
      : [
          [x, y],
          [x + b * scale, y],
          [
            x + (shift + (kind === "trapezoid" ? topLength : b)) * scale,
            peak[1],
          ],
          peak,
        ];
  return svg(
    poly(points) +
      line(peak, foot, true) +
      right(...foot) +
      label(120, 215, bottom) +
      // The leader terminates on the dashed perpendicular, never on a slanted side.
      line([35, 120], [foot[0], (peak[1] + y) / 2], true) +
      label(23, 120, height, -90) +
      (topLabel ? label(120, 45, topLabel) : "") +
      (area ? label(120, 22, area) : ""),
  );
}
export function rhombus(
  a: number,
  b: number,
  first: string,
  second: string,
  top = "",
): string {
  const s = 130 / Math.max(a, b);
  const x = (a * s) / 2,
    y = (b * s) / 2;
  const points: Point[] = [
    [120 - x, 125],
    [120, 125 - y],
    [120 + x, 125],
    [120, 125 + y],
  ];
  return svg(
    poly(points) +
      line(points[0], points[2], true) +
      line(points[1], points[3], true) +
      right(120, 125) +
      label(120, 215, first) +
      label(220, 125, second, -90) +
      (top ? label(120, 25, top) : ""),
  );
}
export function circle(
  kind: "radius" | "diameter" | "none",
  given: string,
  top = "",
): string {
  const o: Point = [120, 125];
  return svg(
    `<circle cx="120" cy="125" r="66"/><circle cx="120" cy="125" r="2.5" fill="#000"/>` +
      (kind === "none"
        ? ""
        : line(kind === "radius" ? o : [54, 125], [186, 125])) +
      (given ? label(120, 215, given) : "") +
      (top ? label(120, 25, top) : ""),
  );
}
export function solid(
  w: number,
  d: number,
  h: number,
  widthLabel: string,
  depthLabel: string,
  heightLabel: string,
  top = "",
): string {
  // Explicit oblique projection: a single scale is applied to all 3 coordinates;
  // depth is projected to (+.55,-.4). Paper angles are not physical face angles.
  const s = Math.min(130 / (w + 0.55 * d), 120 / (h + 0.4 * d));
  const W = w * s,
    H = h * s,
    X = 0.55 * d * s,
    Y = -0.4 * d * s;
  const left = 120 - (W + X) / 2,
    bottom = 180;
  const a: Point = [left, bottom],
    b: Point = [left + W, bottom],
    c: Point = [left + W, bottom - H],
    e: Point = [left, bottom - H];
  const shift = (p: Point): Point => [p[0] + X, p[1] + Y];
  const widthText =
    depthLabel && /^\d/.test(widthLabel) ? `가로 ${widthLabel}` : widthLabel;
  const heightText = /^\d/.test(heightLabel)
    ? `높이 ${heightLabel}`
    : heightLabel;
  const depthText = /^\d/.test(depthLabel) ? `세로 ${depthLabel}` : depthLabel;
  return svg(
    poly([a, b, c, e]) +
      poly([e, shift(e), shift(c), c], false) +
      poly([b, shift(b), shift(c)], false) +
      line(a, shift(a), true) +
      line(shift(a), shift(b), true) +
      line(shift(a), shift(e), true) +
      label(120, 215, widthText) +
      (heightText ? label(25, 125, heightText, -90) : "") +
      (depthText
        ? label(220, 125, depthText, -90) +
          line([205, 125], [b[0] + X / 2, b[1] + Y / 2], true)
        : "") +
      (top ? label(120, 22, top) : "") +
      label(120, 45, "겨냥도"),
  );
}
export function unitFigure(given: string, requested: string): string {
  return svg(
    label(120, 65, given) +
      line([120, 98], [120, 142]) +
      poly(
        [
          [112, 133],
          [120, 142],
          [128, 133],
        ],
        false,
      ) +
      label(120, 180, requested),
  );
}
export function regularPolygon(n: number, length: string, top = ""): string {
  const points = Array.from({ length: n }, (_, i) =>
    polar([120, 125], 65, 90 + (360 * i) / n),
  );
  return svg(
    poly(points) +
      points.map((p, i) => tick(p, points[(i + 1) % n])).join("") +
      label(120, 215, length) +
      (top ? label(120, 25, top) : ""),
  );
}
