export type Point = [number, number];
export const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
const n = (x: number) => Number(x.toFixed(5));
export const xy = (p: Point) => `${n(p[0])},${n(p[1])}`;
export const polar = (c: Point, r: number, degrees: number): Point => [
  c[0] + r * Math.cos((degrees * Math.PI) / 180),
  c[1] - r * Math.sin((degrees * Math.PI) / 180),
];
export const line = (a: Point, b: Point, attrs = "") =>
  `<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}" ${attrs}/>`;
export const path = (d: string, attrs = "") => `<path d="${d}" ${attrs}/>`;
export const poly = (ps: Point[], attrs = "") =>
  `<polygon points="${ps.map(xy).join(" ")}" ${attrs}/>`;
export const label = (p: Point, text: string, role = "given") =>
  text
    ? `<text x="${n(p[0])}" y="${n(p[1])}" data-drill-label="${role}" text-anchor="middle" dominant-baseline="central" fill="black" stroke="none">${esc(text)}</text>`
    : "";
export const circle = (c: Point, r: number) =>
  `<circle cx="${n(c[0])}" cy="${n(c[1])}" r="${n(r)}"/>`;
export const ellipse = (c: Point, rx: number, ry: number) =>
  `<ellipse cx="${c[0]}" cy="${c[1]}" rx="${rx}" ry="${ry}"/>`;
export function arc(
  c: Point,
  radius: number,
  from: number,
  to: number,
  target = false,
) {
  return path(
    `M${xy(polar(c, radius, from))} A${radius},${radius} 0 ${to - from > 180 ? 1 : 0} 0 ${xy(polar(c, radius, to))}`,
    `data-drill-arc="${target ? "target" : "given"}"`,
  );
}
export function angle(
  a: Point,
  o: Point,
  b: Point,
  given?: number,
  radius = 16,
) {
  let start = (Math.atan2(o[1] - a[1], a[0] - o[0]) * 180) / Math.PI;
  let end = (Math.atan2(o[1] - b[1], b[0] - o[0]) * 180) / Math.PI;
  while (end < start) end += 360;
  if (end - start > 180) {
    const s = start;
    start = end;
    end = s + 360;
  }
  return `<g data-drill-angle="${given === undefined ? "target" : "given"}" data-points="${[a, o, b].map(xy).join(" ")}"${given === undefined ? "" : ` data-given="${given}"`}>${arc(o, radius, start, end, given === undefined)}</g>`;
}
export function right(o: Point, a: Point, b: Point) {
  const unit = (p: Point): Point => {
    const d = Math.hypot(p[0] - o[0], p[1] - o[1]);
    return [((p[0] - o[0]) * 10) / d, ((p[1] - o[1]) * 10) / d];
  };
  const u = unit(a),
    v = unit(b);
  return path(
    `M${xy([o[0] + u[0], o[1] + u[1]])} L${xy([o[0] + u[0] + v[0], o[1] + u[1] + v[1]])} L${xy([o[0] + v[0], o[1] + v[1]])}`,
    `data-drill-right="true" data-points="${[a, o, b].map(xy).join(" ")}"`,
  );
}
export const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><desc>arithmetic-geometry-drill-v1</desc><rect width="240" height="240" fill="white"/><g fill="none" stroke="black" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" font-family="Arial, sans-serif" font-size="20">${body}</g></svg>`;
export const dash = 'stroke-dasharray="4 4"';
