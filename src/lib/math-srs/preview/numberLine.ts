/**
 * Exact number lines for preview cards (plan §3.4 · §8.25 «수학 그림»).
 *
 * Every mark is placed by one rule, x(n) = left + (n - min) / (max - min) × width, with a
 * tick at every whole number — no hand-placed coordinates (D-61 · 09-figure-engine-guide §4).
 * The output is a self-contained SVG string from code data (no user input).
 */

export const NUMBER_LINE_GEOMETRY = {
  viewWidth: 420,
  viewHeight: 190,
  left: 44,
  width: 330,
  axisY: 96,
  /** At most this many unit ticks — beyond it the ticks crowd the labels. */
  maxTicks: 21,
} as const;

const INK = "#172b4d";
const ACCENT = "#3159df";

export type NumberLineSpec = {
  min: number;
  max: number;
  /** Whole numbers printed under their ticks. */
  labels: number[];
  /** Closed = included (filled), open = not included (ring). */
  points?: { value: number; closed: boolean }[];
  /** A thick range; "left" · "right" run off the line with an arrow. */
  ranges?: { from: number | "left"; to: number | "right" }[];
  /** A rounding move drawn as an arc above the line. */
  jumps?: { from: number; to: number }[];
  /** Read by screen readers (`<title>`). */
  title: string;
};

export function numberLineSvg(spec: NumberLineSpec): string {
  const G = NUMBER_LINE_GEOMETRY;
  const { min, max } = spec;
  if (
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    max <= min ||
    max - min + 1 > G.maxTicks
  )
    throw new Error("수직선의 범위를 그릴 수 없어요.");
  const inside = (n: number) => Number.isFinite(n) && n >= min && n <= max;
  const values = [
    ...spec.labels,
    ...(spec.points ?? []).map((p) => p.value),
    ...(spec.ranges ?? []).flatMap((r) =>
      [r.from, r.to].filter((v): v is number => typeof v === "number"),
    ),
    ...(spec.jumps ?? []).flatMap((j) => [j.from, j.to]),
  ];
  if (values.some((n) => !inside(n)))
    throw new Error("수직선 밖의 수가 있어요.");
  const x = (n: number) => G.left + ((n - min) / (max - min)) * G.width;
  const y = G.axisY;
  const end = G.left + G.width;
  const parts: string[] = [];
  parts.push(
    `<path d="M ${G.left - 16} ${y} H ${end + 16} M ${end + 9} ${y - 5} L ${end + 16} ${y} L ${end + 9} ${y + 5}" fill="none" stroke="${INK}" stroke-width="2"/>`,
  );
  const ticks: string[] = [];
  for (let n = min; n <= max; n++)
    ticks.push(`<path data-value="${n}" d="M ${x(n)} ${y - 8} V ${y + 8}"/>`);
  parts.push(`<g stroke="${INK}" stroke-width="1.5">${ticks.join("")}</g>`);
  (spec.ranges ?? []).forEach((r, i) => {
    const from = r.from === "left" ? G.left - 16 : x(r.from);
    const to = r.to === "right" ? end + 16 : x(r.to);
    const arrows = [
      r.from === "left"
        ? `M ${from + 10} ${y - 8} L ${from} ${y} L ${from + 10} ${y + 8}`
        : "",
      r.to === "right"
        ? `M ${to - 10} ${y - 8} L ${to} ${y} L ${to - 10} ${y + 8}`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    parts.push(
      `<path id="range-${i}" d="M ${from} ${y} H ${to}" stroke="${ACCENT}" stroke-width="5" stroke-linecap="round"/>`,
    );
    if (arrows)
      parts.push(
        `<path d="${arrows}" fill="none" stroke="${ACCENT}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`,
      );
  });
  (spec.jumps ?? []).forEach((j, i) => {
    const from = x(j.from);
    const to = x(j.to);
    const mid = (from + to) / 2;
    const top = y - 46;
    const dir = to >= from ? 1 : -1;
    parts.push(
      `<path id="jump-${i}" d="M ${from} ${y - 12} Q ${mid} ${top} ${to} ${y - 12}" fill="none" stroke="${ACCENT}" stroke-width="2.5"/>`,
      `<path d="M ${to - dir * 9} ${y - 20} L ${to} ${y - 12} L ${to - dir * 2} ${y - 23}" fill="none" stroke="${ACCENT}" stroke-width="2.5" stroke-linejoin="round"/>`,
    );
  });
  for (const p of spec.points ?? [])
    parts.push(
      `<circle id="point-${p.value}" cx="${x(p.value)}" cy="${y}" r="7" fill="${p.closed ? ACCENT : "#ffffff"}" stroke="${ACCENT}" stroke-width="3"/>`,
    );
  for (const label of [...new Set(spec.labels)].sort((a, b) => a - b))
    parts.push(
      `<text id="label-${label}" x="${x(label)}" y="${y + 36}" text-anchor="middle">${label}</text>`,
    );
  const title = spec.title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${G.viewWidth} ${G.viewHeight}" role="img"><title>${title}</title><g font-family="Pretendard, 'Malgun Gothic', sans-serif" font-size="18" fill="${INK}">${parts.join("")}</g></svg>`;
}
