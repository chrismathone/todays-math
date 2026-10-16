import { lineHitsBox } from "../families/geometryTriangles/core";
import { defineFigureFirst, type FigureFirstFamily } from "./figureFirstTypes";
import { typesetArithmeticGeometrySvg } from "./typography";

/** 초등 각도 · 둘레 · 넓이 drills presented figure-first (owner, 2026-10-16):
 * the frozen display layout of the canonical figure is kept exactly, and the
 * unknown is marked □ — not x, not ㉠ — in the place its number would take.
 *   · angle families (age-e4 pack, editor angle-v1/right-angle-v1): the one
 *     unmarked arc gets "□°" inside its opening, past the arc, like the
 *     pack's own given labels; a leader only when the opening is too narrow.
 *   · dimension families (age-e5/e6 pack): the target's word label (가로 ·
 *     밑변 · 한 변 · 높이 · 윗변 · 아랫변 · 가로 대각선) becomes "□ cm" at the
 *     same anchor; perimeter · area · 원주율 notes stay on the figure.
 *   · whole-quantity targets (둘레 · 넓이 · 원주) draw no □: the group
 *     instruction names them.
 * The □ is drawn (a square the height of the digits, the digits' stroke) so
 * that it prints the same on every machine; the unit beside it is typeset by
 * the same dictionary as the given numbers. Display only: canonical bytes,
 * saved packs, candidates and answers are untouched.
 */
type Point = readonly [number, number];
type Box = { x: number; y: number; w: number; h: number };
type Segment = readonly [Point, Point];
type Arc = {
  centre: Point;
  r: number;
  /** Start angle (degrees, mathematical: counter-clockwise on paper). */
  start: number;
  /** Signed span: positive counter-clockwise, negative clockwise. */
  span: number;
};
type Layout = {
  view: Box;
  segments: Segment[];
  arcs: Arc[];
  labels: Box[];
  /** Where the editor's leader curves start (on the arc they label). */
  leaders: Point[];
  fontSize: number;
};

const num = Number;
const attr = (tag: string, name: string): string | undefined =>
  new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const pad = (box: Box, by: number): Box => ({
  x: box.x - by,
  y: box.y - by,
  w: box.w + 2 * by,
  h: box.h + 2 * by,
});
const degrees = (centre: Point, p: Point) =>
  ((Math.atan2(centre[1] - p[1], p[0] - centre[0]) * 180) / Math.PI + 360) %
  360;
const direction = (angle: number): Point => [
  Math.cos((angle * Math.PI) / 180),
  -Math.sin((angle * Math.PI) / 180),
];

/** Centre of an SVG elliptical-arc command with equal radii (F.6.5). */
function arcFrom(
  p1: Point,
  p2: Point,
  r: number,
  large: boolean,
  sweep: boolean,
): Arc {
  const dx = p2[0] - p1[0],
    dy = p2[1] - p1[1],
    d = Math.hypot(dx, dy) || 1;
  const h = Math.sqrt(Math.max(0, r * r - (d * d) / 4));
  const sign = large !== sweep ? 1 : -1;
  const centre: Point = [
    (p1[0] + p2[0]) / 2 + (sign * h * -dy) / d,
    (p1[1] + p2[1]) / 2 + (sign * h * dx) / d,
  ];
  const start = degrees(centre, p1),
    end = degrees(centre, p2);
  // sweep-flag 0 turns counter-clockwise on paper (increasing angle).
  const span = sweep ? -((start - end + 360) % 360) : (end - start + 360) % 360;
  return { centre, r, start, span };
}
const arcMid = (arc: Arc) => (arc.start + arc.span / 2 + 360) % 360;
const inSpan = (arc: Arc, angle: number) => {
  const offset =
    arc.span >= 0
      ? (angle - arc.start + 360) % 360
      : (arc.start - angle + 360) % 360;
  return offset <= Math.abs(arc.span) + 1e-6;
};
const sameArc = (a: Arc, b: Arc) =>
  Math.abs(((arcMid(a) - arcMid(b) + 540) % 360) - 180) < 1.5 &&
  Math.abs(Math.abs(a.span) - Math.abs(b.span)) < 1.5;

function arcSegments(arc: Arc): Segment[] {
  const steps = Math.max(4, Math.ceil(Math.abs(arc.span) / 5));
  const out: Segment[] = [];
  let previous: Point | undefined;
  for (let i = 0; i <= steps; i++) {
    const [ux, uy] = direction(arc.start + (arc.span * i) / steps);
    const point: Point = [
      arc.centre[0] + arc.r * ux,
      arc.centre[1] + arc.r * uy,
    ];
    if (previous) out.push([previous, point]);
    previous = point;
  }
  return out;
}

const ARC =
  /^M\s*([\d.-]+)[ ,]+([\d.-]+)\s*A\s*([\d.-]+)[ ,]+[\d.-]+[ ,]+[\d.-]+[ ,]+([01])[ ,]+([01])[ ,]+([\d.-]+)[ ,]+([\d.-]+)\s*$/;
const QUAD =
  /^M\s*([\d.-]+)[ ,]+([\d.-]+)\s*Q\s*([\d.-]+)[ ,]+([\d.-]+)[ ,]+([\d.-]+)[ ,]+([\d.-]+)\s*$/;
function parseArc(d: string): Arc | undefined {
  const m = ARC.exec(d);
  if (!m) return undefined;
  return arcFrom(
    [num(m[1]), num(m[2])],
    [num(m[6]), num(m[7])],
    num(m[3]),
    m[4] === "1",
    m[5] === "1",
  );
}

/** Strokes, arcs and label boxes of a laid-out drill figure. */
export function elementaryFigureLayout(svg: string): Layout | undefined {
  const viewBox = /viewBox="([^"]+)"/
    .exec(svg)?.[1]
    .trim()
    .split(/[\s,]+/);
  if (!viewBox || viewBox.length !== 4) return undefined;
  const [vx, vy, vw, vh] = viewBox.map(num);
  const segments: Segment[] = [],
    arcs: Arc[] = [],
    labels: Box[] = [],
    leaders: Point[] = [];
  let fontSize = 0;
  for (const m of svg.matchAll(/<line\b[^>]*>/g))
    segments.push([
      [num(attr(m[0], "x1")), num(attr(m[0], "y1"))],
      [num(attr(m[0], "x2")), num(attr(m[0], "y2"))],
    ]);
  for (const m of svg.matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*>/g)) {
    const d = m[1].trim();
    const arc = parseArc(d);
    if (arc) {
      arcs.push(arc);
      segments.push(...arcSegments(arc));
      continue;
    }
    const q = QUAD.exec(d);
    if (q) {
      const [p0, p1, p2] = [
        [num(q[1]), num(q[2])],
        [num(q[3]), num(q[4])],
        [num(q[5]), num(q[6])],
      ] as Point[];
      leaders.push(p0);
      let previous = p0;
      for (let i = 1; i <= 8; i++) {
        const t = i / 8,
          s = 1 - t;
        const point: Point = [
          s * s * p0[0] + 2 * s * t * p1[0] + t * t * p2[0],
          s * s * p0[1] + 2 * s * t * p1[1] + t * t * p2[1],
        ];
        segments.push([previous, point]);
        previous = point;
      }
      continue;
    }
    // Polylines: right-angle marks "M L L", polygons "M L … Z".
    const points = [...d.matchAll(/([\d.-]+)[ ,]+([\d.-]+)/g)].map(
      (pair) => [num(pair[1]), num(pair[2])] as Point,
    );
    if (/^M[\d.\s,-]+(?:L[\d.\s,-]+)+Z?$/.test(d))
      for (let i = 1; i < points.length; i++)
        segments.push([points[i - 1], points[i]]);
    if (/Z$/.test(d) && points.length > 2)
      segments.push([points[points.length - 1], points[0]]);
  }
  for (const m of svg.matchAll(/<g data-label="[^"]*"[^>]*>/g)) {
    const tag = m[0];
    const x = num(attr(tag, "data-x")),
      base = num(attr(tag, "data-base")),
      w = num(attr(tag, "data-w")),
      a = num(attr(tag, "data-a")),
      d = num(attr(tag, "data-d")),
      fs = num(attr(tag, "data-fs"));
    if (![x, base, w, a, d].every(Number.isFinite)) return undefined;
    labels.push({ x: x - w / 2, y: base - a, w, h: a + d });
    if (Number.isFinite(fs)) fontSize = fontSize || fs;
  }
  for (const m of svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)) {
    const fs = num(attr(m[1], "font-size") ?? "16.8"),
      x = num(attr(m[1], "x")),
      y = num(attr(m[1], "y")),
      w = [...m[2]].length * fs * 0.6;
    labels.push({ x: x - w / 2, y: y - fs * 0.8, w, h: fs });
  }
  return {
    view: { x: vx, y: vy, w: vw, h: vh },
    segments,
    arcs,
    labels,
    leaders,
    fontSize: fontSize || 16.8,
  };
}

/* ---------- the □ mark ---------- */

/** Proportions in em of the label font: the square is the digits' height
 * (0.67em) with the digits' stroke; the degree ring copies MathJax's
 * superscript ∘ (0.707 scale, raised 0.404em); the unit follows after the
 * editor's thin space. */
const SQUARE = { size: 0.67, stroke: 0.07, bearing: 0.03 } as const;
const DEGREE = { advance: 0.354, raise: 0.581, radius: 0.123, stroke: 0.03 };
const THIN_SPACE = 1 / 6;
const HALO = 3.15;
const fixed = (value: number) => value.toFixed(2);

let unitWidthEm: Record<string, number> = {};
let centreShiftEm: number | undefined;
/** The typeset advance of a unit label, in em, measured once with the same
 * dictionary that lays out the given numbers. */
function measureUnit(unit: string): number {
  if (unitWidthEm[unit] === undefined) {
    const probe = typesetArithmeticGeometrySvg(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="0" y="50" dominant-baseline="central" font-size="100">${unit}</text></svg>`,
    );
    const w = num(attr(probe, "data-w")),
      base = num(attr(probe, "data-base"));
    if (!Number.isFinite(w) || !Number.isFinite(base))
      throw new Error(`figure-first: unit ${unit} is not in the dictionary`);
    unitWidthEm = { ...unitWidthEm, [unit]: w / 100 };
    centreShiftEm = (base - 50) / 100;
  }
  return unitWidthEm[unit];
}

type Mark = { unit: "°" | "cm" };
const markWidthEm = (mark: Mark) =>
  SQUARE.bearing * 2 +
  SQUARE.size +
  (mark.unit === "°" ? DEGREE.advance : THIN_SPACE + measureUnit("cm"));
/** Height of the mark above (ascent) and below (descent) its baseline, em. */
const markAscentEm = (mark: Mark) =>
  mark.unit === "°"
    ? Math.max(SQUARE.size + SQUARE.stroke / 2, DEGREE.raise + DEGREE.radius)
    : SQUARE.size + SQUARE.stroke / 2;
const markDescentEm = () => SQUARE.stroke / 2 + 0.03;

/** The mark drawn with its left outer edge at `left` on baseline `base`.
 * `textTemplate` carries the figure's own text attributes for the unit. */
function drawMark(
  mark: Mark,
  left: number,
  base: number,
  fs: number,
  label: string,
  textAttrs: string,
): string {
  const sw = SQUARE.stroke * fs,
    side = SQUARE.size * fs - sw,
    x = left + SQUARE.bearing * fs + sw / 2,
    y = base - SQUARE.size * fs + sw / 2;
  const square =
    `<rect x="${fixed(x)}" y="${fixed(y)}" width="${fixed(side)}" height="${fixed(side)}" fill="#ffffff" stroke="#ffffff" stroke-width="${fixed(sw + HALO)}" stroke-linejoin="round"/>` +
    `<rect x="${fixed(x)}" y="${fixed(y)}" width="${fixed(side)}" height="${fixed(side)}" fill="none" stroke="#111111" stroke-width="${fixed(sw)}" stroke-linejoin="round"/>`;
  const after = left + (SQUARE.bearing * 2 + SQUARE.size) * fs;
  let unit: string;
  if (mark.unit === "°") {
    const cx = after + (DEGREE.advance / 2) * fs,
      cy = base - DEGREE.raise * fs,
      r = DEGREE.radius * fs,
      ring = DEGREE.stroke * fs;
    unit =
      `<circle cx="${fixed(cx)}" cy="${fixed(cy)}" r="${fixed(r)}" fill="none" stroke="#ffffff" stroke-width="${fixed(ring + HALO)}"/>` +
      `<circle cx="${fixed(cx)}" cy="${fixed(cy)}" r="${fixed(r)}" fill="none" stroke="#111111" stroke-width="${fixed(ring)}"/>`;
  } else {
    unit = `<text${textAttrs} x="${fixed(after + THIN_SPACE * fs)}" y="${fixed(base)}" text-anchor="start" dominant-baseline="alphabetic" font-size="${fs}" data-mj="cm">cm</text>`;
  }
  return `<g data-drill-label="target" role="img" aria-label="${label}">${square}${unit}</g>`;
}

/* ---------- angles: "□°" past the unmarked arc ---------- */

function fits(layout: Layout, box: Box): boolean {
  const { view } = layout;
  return (
    box.x >= view.x + 2 &&
    box.y >= view.y + 2 &&
    box.x + box.w <= view.x + view.w - 2 &&
    box.y + box.h <= view.y + view.h - 2 &&
    !layout.labels.some((label) => overlaps(pad(box, 2), label)) &&
    !layout.segments.some(([a, b]) => lineHitsBox(a, b, pad(box, 5)))
  );
}

const DEGREE_MARK: Mark = { unit: "°" };
function markBox(mark: Mark, centre: Point, fs: number): Box {
  const w = markWidthEm(mark) * fs,
    h = (markAscentEm(mark) + markDescentEm()) * fs;
  return { x: centre[0] - w / 2, y: centre[1] - h / 2, w, h };
}
function markAt(
  mark: Mark,
  centre: Point,
  fs: number,
  label: string,
  textAttrs = "",
): string {
  const box = markBox(mark, centre, fs);
  return drawMark(
    mark,
    box.x,
    centre[1] + ((markAscentEm(mark) - markDescentEm()) / 2) * fs,
    fs,
    label,
    textAttrs,
  );
}

/** Half-extent of a box along a unit direction. */
const extent = (box: Box, [ux, uy]: Point) =>
  Math.abs((box.w / 2) * ux) + Math.abs((box.h / 2) * uy);

function placeDegreeMark(
  layout: Layout,
  target: Arc,
): { centre: Point; leaderFrom?: Point } | undefined {
  const fs = layout.fontSize;
  const base = markBox(DEGREE_MARK, [0, 0], fs);
  const mid = arcMid(target);
  // Labels of sub-angles inside this arc mean it is a whole angle: its own
  // label belongs outside the arc, never among them.
  const holdsSubLabels = layout.labels.some((label) => {
    const c: Point = [label.x + label.w / 2, label.y + label.h / 2];
    return (
      inSpan(target, degrees(target.centre, c)) &&
      Math.hypot(c[0] - target.centre[0], c[1] - target.centre[1]) < target.r
    );
  });
  const candidate = (angle: number, r: number): Point | undefined => {
    const dir = direction(angle);
    const centre: Point = [
      target.centre[0] + r * dir[0],
      target.centre[1] + r * dir[1],
    ];
    return fits(layout, markBox(DEGREE_MARK, centre, fs)) ? centre : undefined;
  };
  const outside = (angle: number) => {
    const ext = extent(base, direction(angle));
    return [0, 3, 6, 9, 12, 16, 20, 25, 30, 36, 42, 50].map(
      (step) => target.r + 6 + ext + step,
    );
  };
  const inside = (angle: number) => {
    const ext = extent(base, direction(angle));
    const limit = target.r - 6 - ext;
    return holdsSubLabels
      ? [0, 3, 6].map((step) => limit - step).filter((r) => r > 20)
      : [52, 58, 64, 70, 78, 86].filter((r) => r <= limit);
  };
  const turns = [0, 4, -4, 8, -8, 12, -12];
  const rings =
    target.r >= 60 && !holdsSubLabels ? [inside, outside] : [outside, inside];
  for (const ring of rings)
    for (const turn of turns)
      for (const r of ring(mid + turn)) {
        const centre = candidate(mid + turn, r);
        if (centre) return { centre };
      }
  // Too narrow: beside the figure with a thin leader to the arc's midpoint.
  const dir = direction(mid);
  const mark: Point = [
    target.centre[0] + target.r * dir[0],
    target.centre[1] + target.r * dir[1],
  ];
  for (const r of [40, 50, 60, 72, 86, 100])
    for (let i = 0; i < 16; i++) {
      const angle = mid + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 22.5;
      const centre = candidate(angle, target.r + r);
      if (
        centre &&
        !layout.labels.some((label) => lineHitsBox(mark, centre, label))
      )
        return { centre, leaderFrom: mark };
    }
  return undefined;
}

function leaderTo(box: Box, from: Point, to: Point): string {
  // Stop at the mark's box so the leader never runs through the glyph.
  const [cx, cy] = [box.x + box.w / 2, box.y + box.h / 2];
  const dx = to[0] - cx,
    dy = to[1] - cy,
    d = Math.hypot(dx, dy) || 1,
    ux = dx / d,
    uy = dy / d;
  const stop =
    Math.min(
      box.w / 2 / Math.max(0.001, Math.abs(ux)),
      box.h / 2 / Math.max(0.001, Math.abs(uy)),
    ) + 1.5;
  return `<line x1="${fixed(cx + ux * stop)}" y1="${fixed(cy + uy * stop)}" x2="${fixed(from[0])}" y2="${fixed(from[1])}" stroke="#111111" stroke-width="0.8" data-leader="target"/>`;
}

function append(svg: string, markup: string): string {
  const end = svg.lastIndexOf("</svg>");
  return end < 0 ? svg : `${svg.slice(0, end)}${markup}${svg.slice(end)}`;
}

/** The target arc of a laid-out angle figure: the canonical marks it for the
 * age-e4 pack; the editor's triangle figures leave it as the one arc with no
 * label in its opening. */
function targetArc(layout: Layout, canonical: string): Arc | undefined {
  const marked = /<path data-drill-angle="target" d="([^"]+)"/.exec(canonical);
  if (marked) {
    const wanted = parseArc(marked[1]);
    if (!wanted) return undefined;
    const matches = layout.arcs.filter((arc) => sameArc(arc, wanted));
    return matches.length === 1 ? matches[0] : undefined;
  }
  const near = (arc: Arc, p: Point, from: number, to: number) => {
    const distance = Math.hypot(p[0] - arc.centre[0], p[1] - arc.centre[1]);
    return (
      inSpan(arc, degrees(arc.centre, p)) && distance > from && distance < to
    );
  };
  // A label belongs to the vertex it is nearest to (a leader-placed label
  // may sit below the base, inside another corner's span).
  const nearest = (p: Point) =>
    layout.arcs.reduce(
      (best, arc) => {
        const d = Math.hypot(p[0] - arc.centre[0], p[1] - arc.centre[1]);
        return d < best.d ? { arc, d } : best;
      },
      { arc: undefined as Arc | undefined, d: Infinity },
    );
  const unlabelled = layout.arcs.filter(
    (arc) =>
      !layout.labels.some((label) => {
        const own = nearest([label.x + label.w / 2, label.y + label.h / 2]);
        return own.arc === arc && own.d < arc.r + 60;
      }) &&
      // A narrow given angle is labelled beside the figure through a leader
      // that starts on its arc.
      !layout.leaders.some((start) => near(arc, start, arc.r - 4, arc.r + 4)),
  );
  return unlabelled.length === 1 ? unlabelled[0] : undefined;
}

function annotateAngle(laidOut: string, canonical: string): string | undefined {
  const layout = elementaryFigureLayout(laidOut);
  if (!layout || layout.labels.length === 0) return undefined;
  const target = targetArc(layout, canonical);
  if (!target) return undefined;
  const placed = placeDegreeMark(layout, target);
  if (!placed) return undefined;
  const fs = layout.fontSize;
  const mark = markAt(DEGREE_MARK, placed.centre, fs, "□°");
  const leader = placed.leaderFrom
    ? leaderTo(
        markBox(DEGREE_MARK, placed.centre, fs),
        placed.leaderFrom,
        placed.centre,
      )
    : "";
  return append(laidOut, leader + mark);
}

/* ---------- dimensions: the word label becomes "□ cm" ---------- */

const CM_MARK: Mark = { unit: "cm" };
const TEXT_ATTRS = [
  "xmlns",
  "stroke",
  "stroke-width",
  "fill",
  "font-style",
  "font-family",
  "paint-order",
  "stroke-linejoin",
  "data-line-gap",
  "data-dimension-label",
] as const;

/** Replace the word label of the target dimension with "□ cm" on the same
 * anchor, and widen or narrow that label's gap in the shared line mask. */
function relabelDimension(laidOut: string, word: string): string | undefined {
  const pattern = new RegExp(
    `<text\\b([^>]*\\bdata-mj="${word}"[^>]*)>${word}</text>`,
    "g",
  );
  const found = [...laidOut.matchAll(pattern)];
  if (found.length !== 1) return undefined;
  const [whole, attrs] = found[0];
  let x = num(attr(attrs, "x"));
  const y = num(attr(attrs, "y")),
    fs = num(attr(attrs, "font-size") ?? "16.8");
  if (![x, y, fs].every(Number.isFinite)) return undefined;
  if ((attr(attrs, "text-anchor") ?? "middle") !== "middle") return undefined;
  const central = attr(attrs, "dominant-baseline") === "central";
  const width = markWidthEm(CM_MARK) * fs;
  const base = central ? y + centreShiftEm! * fs : y;
  // The word label could overlap the dashed segment it measures by a little
  // (its halo hid that); the square must not sit on that segment, so it
  // moves sideways by the few px needed and no further.
  const owner = [
    ...laidOut
      .slice(0, found[0].index)
      .matchAll(/<g data-dimension="[^"]*" data-endpoints="([^"]+)"/g),
  ].pop();
  const endpoints = owner?.[1].trim().split(/\s+/).map(num);
  if (endpoints?.length === 4 && endpoints.every(Number.isFinite)) {
    const [x1, y1, x2] = endpoints;
    const top = base - markAscentEm(CM_MARK) * fs,
      bottom = base + markDescentEm() * fs;
    const clear = 2;
    if (
      Math.abs(x1 - x2) < 1e-6 &&
      y1 !== endpoints[3] &&
      Math.max(y1, endpoints[3]) >= top &&
      Math.min(y1, endpoints[3]) <= bottom
    ) {
      const left = x - width / 2,
        right = x + width / 2;
      if (x >= x1 && left < x1 + clear) x += x1 + clear - left;
      else if (x < x1 && right > x1 - clear) x -= right - (x1 - clear);
    }
  }
  const kept = TEXT_ATTRS.map((name) => {
    const value = attr(attrs, name);
    return value === undefined ? "" : ` ${name}="${value}"`;
  }).join("");
  const mark = drawMark(CM_MARK, x - width / 2, base, fs, "□ cm", kept);
  let svg = laidOut.replace(whole, mark);
  // A label on a dimension curve (data-line-gap) sits in a hole cut by the
  // figure's mask; recut that hole to the new label's width.
  if (attr(attrs, "data-line-gap")) {
    const box: Box = {
      x: x - width / 2 - 2.5,
      y: base - markAscentEm(CM_MARK) * fs - 2,
      w: width + 5,
      h: (markAscentEm(CM_MARK) + markDescentEm()) * fs + 4,
    };
    let recut = 0;
    svg = svg.replace(
      /<polygon points="([^"]+)" fill="#000000"\/>/g,
      (polygon, points: string) => {
        const corners = points
          .trim()
          .split(/\s+/)
          .map((pair) => pair.split(",").map(num));
        const xs = corners.map((c) => c[0]),
          ys = corners.map((c) => c[1]);
        const hole: Box = {
          x: Math.min(...xs),
          y: Math.min(...ys),
          w: Math.max(...xs) - Math.min(...xs),
          h: Math.max(...ys) - Math.min(...ys),
        };
        const inside =
          x >= hole.x &&
          x <= hole.x + hole.w &&
          y >= hole.y &&
          y <= hole.y + hole.h;
        if (!inside) return polygon;
        recut++;
        return `<polygon points="${fixed(box.x)},${fixed(box.y)} ${fixed(box.x + box.w)},${fixed(box.y)} ${fixed(box.x + box.w)},${fixed(box.y + box.h)} ${fixed(box.x)},${fixed(box.y + box.h)}" fill="#000000"/>`;
      },
    );
    if (recut > 1) return undefined;
  }
  return svg;
}

/* ---------- families ---------- */

const angleFamily = (prefix: string, instruction: string) =>
  defineFigureFirst<Record<string, never>>({
    instruction,
    parse: (prompt) => (prompt.figureId?.startsWith(prefix) ? {} : undefined),
    draw: (_prompt, _parsed, laidOut, canonical) =>
      laidOut && canonical ? annotateAngle(laidOut, canonical) : undefined,
  });
const dimensionFamily = (typeId: string, instruction: string, word?: string) =>
  defineFigureFirst<Record<string, never>>({
    instruction,
    parse: (prompt) =>
      prompt.figureId?.startsWith(`age-${typeId}-v1-`) ? {} : undefined,
    draw: (_prompt, _parsed, laidOut) =>
      laidOut === undefined
        ? undefined
        : word === undefined
          ? laidOut
          : relabelDimension(laidOut, word),
  });

const SQUARE_VALUE = "□의 값을 구하세요.";
const inFigure = (figure: string) => `다음 ${figure}에서 ${SQUARE_VALUE}`;
const whole = (figure: string, quantity: string) =>
  `다음 ${figure}의 ${quantity}를 구하세요.`;

export const ELEMENTARY_FIGURE_FIRST: Readonly<
  Record<string, FigureFirstFamily>
> = {
  // 초4 각도 · 삼각형 — frozen age-e4 pack, "□°" at the unmarked arc.
  "e4-angle-sum": angleFamily("age-e4-angle-sum-v1-", inFigure("그림")),
  "e4-angle-difference": angleFamily(
    "age-e4-angle-difference-v1-",
    inFigure("그림"),
  ),
  "e4-angle-right-remainder": angleFamily(
    "age-e4-angle-right-remainder-v1-",
    inFigure("그림"),
  ),
  "e4-angle-straight-remainder": angleFamily(
    "age-e4-angle-straight-remainder-v1-",
    inFigure("그림"),
  ),
  "e4-angle-turn-remainder": angleFamily(
    "age-e4-angle-turn-remainder-v1-",
    inFigure("그림"),
  ),
  "e4-quadrilateral-missing-angle": angleFamily(
    "age-e4-quadrilateral-missing-angle-v1-",
    inFigure("사각형"),
  ),
  "e4-isosceles-base-angle": angleFamily(
    "age-e4-isosceles-base-angle-v1-",
    inFigure("이등변삼각형"),
  ),
  "e4-isosceles-apex-angle": angleFamily(
    "age-e4-isosceles-apex-angle-v1-",
    inFigure("이등변삼각형"),
  ),
  // Editor-laid triangle figures (no pack): the same annotation.
  "e4-triangle-missing-angle": angleFamily("angle-v1-", inFigure("삼각형")),
  "e4-right-triangle-missing-angle": angleFamily(
    "right-angle-v1-",
    inFigure("직각삼각형"),
  ),
  // 초5 다각형의 둘레와 넓이 — frozen age-e5 pack.
  "e5-rectangle-perimeter": dimensionFamily(
    "e5-rectangle-perimeter",
    whole("직사각형", "둘레"),
  ),
  "e5-rectangle-perimeter-side": dimensionFamily(
    "e5-rectangle-perimeter-side",
    inFigure("직사각형"),
    "가로",
  ),
  "e5-parallelogram-perimeter": dimensionFamily(
    "e5-parallelogram-perimeter",
    whole("평행사변형", "둘레"),
  ),
  "e5-parallelogram-perimeter-side": dimensionFamily(
    "e5-parallelogram-perimeter-side",
    inFigure("평행사변형"),
    "밑변",
  ),
  "e5-square-perimeter": dimensionFamily(
    "e5-square-perimeter",
    whole("정사각형", "둘레"),
  ),
  "e5-square-perimeter-side": dimensionFamily(
    "e5-square-perimeter-side",
    inFigure("정사각형"),
    "한 변",
  ),
  "e5-rhombus-perimeter": dimensionFamily(
    "e5-rhombus-perimeter",
    whole("마름모", "둘레"),
  ),
  "e5-rhombus-perimeter-side": dimensionFamily(
    "e5-rhombus-perimeter-side",
    inFigure("마름모"),
    "한 변",
  ),
  "e5-regular-polygon-perimeter": dimensionFamily(
    "e5-regular-polygon-perimeter",
    whole("정다각형", "둘레"),
  ),
  "e5-regular-polygon-perimeter-side": dimensionFamily(
    "e5-regular-polygon-perimeter-side",
    inFigure("정다각형"),
    "한 변",
  ),
  "e5-triangle-perimeter": dimensionFamily(
    "e5-triangle-perimeter",
    whole("삼각형", "둘레"),
  ),
  "e5-triangle-perimeter-side": dimensionFamily(
    "e5-triangle-perimeter-side",
    inFigure("삼각형"),
    "밑변",
  ),
  "e5-rectangle-area": dimensionFamily(
    "e5-rectangle-area",
    whole("직사각형", "넓이"),
  ),
  "e5-rectangle-area-side": dimensionFamily(
    "e5-rectangle-area-side",
    inFigure("직사각형"),
    "가로",
  ),
  "e5-square-area": dimensionFamily(
    "e5-square-area",
    whole("정사각형", "넓이"),
  ),
  "e5-square-area-side": dimensionFamily(
    "e5-square-area-side",
    inFigure("정사각형"),
    "한 변",
  ),
  "e5-triangle-area": dimensionFamily(
    "e5-triangle-area",
    whole("삼각형", "넓이"),
  ),
  "e5-triangle-area-base": dimensionFamily(
    "e5-triangle-area-base",
    inFigure("삼각형"),
    "밑변",
  ),
  "e5-triangle-area-height": dimensionFamily(
    "e5-triangle-area-height",
    inFigure("삼각형"),
    "높이",
  ),
  "e5-parallelogram-area": dimensionFamily(
    "e5-parallelogram-area",
    whole("평행사변형", "넓이"),
  ),
  "e5-parallelogram-area-base": dimensionFamily(
    "e5-parallelogram-area-base",
    inFigure("평행사변형"),
    "밑변",
  ),
  "e5-parallelogram-area-height": dimensionFamily(
    "e5-parallelogram-area-height",
    inFigure("평행사변형"),
    "높이",
  ),
  "e5-rhombus-area": dimensionFamily(
    "e5-rhombus-area",
    whole("마름모", "넓이"),
  ),
  "e5-rhombus-area-diagonal": dimensionFamily(
    "e5-rhombus-area-diagonal",
    inFigure("마름모"),
    "가로 대각선",
  ),
  "e5-trapezoid-area": dimensionFamily(
    "e5-trapezoid-area",
    whole("사다리꼴", "넓이"),
  ),
  "e5-trapezoid-area-height": dimensionFamily(
    "e5-trapezoid-area-height",
    inFigure("사다리꼴"),
    "높이",
  ),
  "e5-trapezoid-area-top": dimensionFamily(
    "e5-trapezoid-area-top",
    inFigure("사다리꼴"),
    "윗변",
  ),
  "e5-trapezoid-area-bottom": dimensionFamily(
    "e5-trapezoid-area-bottom",
    inFigure("사다리꼴"),
    "아랫변",
  ),
  // 초6 원의 둘레와 넓이 — the figure carries the radius/diameter and 원주율.
  // The inverse families (원주·넓이에서 반지름·지름) draw no radius to mark
  // and stay prose.
  "e6-circle-circumference-radius": dimensionFamily(
    "e6-circle-circumference-radius",
    whole("원", "원주"),
  ),
  "e6-circle-circumference-diameter": dimensionFamily(
    "e6-circle-circumference-diameter",
    whole("원", "원주"),
  ),
  "e6-circle-area-radius": dimensionFamily(
    "e6-circle-area-radius",
    whole("원", "넓이"),
  ),
  "e6-circle-area-diameter": dimensionFamily(
    "e6-circle-area-diameter",
    whole("원", "넓이"),
  ),
};
