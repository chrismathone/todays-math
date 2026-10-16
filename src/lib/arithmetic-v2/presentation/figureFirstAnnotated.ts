import { lineHitsBox } from "../families/geometryTriangles/core";
import { defineFigureFirst, type FigureFirstFamily } from "./figureFirstTypes";

/** gm families presented figure-first (owner, 2026-10-16). Their canonical
 * figures already print every given; the editor layout of that figure is kept
 * and the unmarked target (an arc or a thick segment) gets the label x at
 * display time. The canonical bytes and the saved packs are never changed.
 */
type Point = readonly [number, number];
type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const num = (value: string) => Number(value);
const unit = (from: Point, to: Point): Point => {
  const d = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
  return [(to[0] - from[0]) / d, (to[1] - from[1]) / d];
};

/** Lines and label boxes of the laid-out figure, for collision checks. */
export function figureFirstObstacles(svg: string) {
  const lines: [Point, Point][] = [];
  const boxes: Box[] = [];
  for (const m of svg.matchAll(
    /<line\b[^>]*\bx1="([^"]+)"[^>]*\by1="([^"]+)"[^>]*\bx2="([^"]+)"[^>]*\by2="([^"]+)"/g,
  ))
    lines.push([
      [num(m[1]), num(m[2])],
      [num(m[3]), num(m[4])],
    ]);
  for (const m of svg.matchAll(/<polygon\b[^>]*\bpoints="([^"]+)"/g)) {
    const points = m[1]
      .trim()
      .split(/\s+/)
      .map((pair) => pair.split(",").map(Number) as unknown as Point);
    for (let i = 0; i < points.length; i++)
      lines.push([points[i], points[(i + 1) % points.length]]);
  }
  for (const m of svg.matchAll(
    /<circle\b[^>]*\bcx="([^"]+)"[^>]*\bcy="([^"]+)"[^>]*\br="([^"]+)"/g,
  )) {
    const c: Point = [num(m[1]), num(m[2])],
      r = num(m[3]);
    for (let i = 0; i < 72; i++)
      lines.push([
        [
          c[0] + r * Math.cos((i * Math.PI) / 36),
          c[1] + r * Math.sin((i * Math.PI) / 36),
        ],
        [
          c[0] + r * Math.cos(((i + 1) * Math.PI) / 36),
          c[1] + r * Math.sin(((i + 1) * Math.PI) / 36),
        ],
      ]);
  }
  // Editor leaders are quadratic curves; measured arcs are small circles.
  for (const m of svg.matchAll(
    /<path\b[^>]*\bd="M\s*([\d.-]+)[ ,]([\d.-]+)\s*Q\s*([\d.-]+)[ ,]([\d.-]+)\s*([\d.-]+)[ ,]([\d.-]+)"/g,
  )) {
    const [p0, p1, p2] = [
      [num(m[1]), num(m[2])],
      [num(m[3]), num(m[4])],
      [num(m[5]), num(m[6])],
    ] as Point[];
    let previous = p0;
    for (let i = 1; i <= 8; i++) {
      const t = i / 8,
        s = 1 - t;
      const point: Point = [
        s * s * p0[0] + 2 * s * t * p1[0] + t * t * p2[0],
        s * s * p0[1] + 2 * s * t * p1[1] + t * t * p2[1],
      ];
      lines.push([previous, point]);
      previous = point;
    }
  }
  for (const m of svg.matchAll(
    /<path\b[^>]*\bd="M\s*([\d.-]+)[ ,]([\d.-]+)\s*L\s*([\d.-]+)[ ,]([\d.-]+)\s*L\s*([\d.-]+)[ ,]([\d.-]+)"/g,
  ))
    lines.push(
      [
        [num(m[1]), num(m[2])],
        [num(m[3]), num(m[4])],
      ],
      [
        [num(m[3]), num(m[4])],
        [num(m[5]), num(m[6])],
      ],
    );
  // Typeset labels record their exact box; plain text labels are estimated.
  for (const m of svg.matchAll(
    /<g data-label="[^"]*" data-anchor="middle" (?:data-halo="[^"]*" )?data-x="([^"]+)" data-y="[^"]+" data-base="([^"]+)" data-fs="[^"]+" data-w="([^"]+)" data-a="([^"]+)" data-d="([^"]+)"/g,
  ))
    boxes.push({
      x: num(m[1]) - num(m[3]) / 2,
      y: num(m[2]) - num(m[4]),
      w: num(m[3]),
      h: num(m[4]) + num(m[5]),
    });
  for (const m of svg.matchAll(
    /<text\b[^>]*\bx="([^"]+)"[^>]*\by="([^"]+)"[^>]*>([^<]*)<\/text>/g,
  ))
    boxes.push({
      x: num(m[1]) - (m[3].length * 10) / 2,
      y: num(m[2]) - 10,
      w: m[3].length * 10,
      h: 20,
    });
  return { lines, boxes };
}

const X_BOX = { w: 12, h: 16 };
type Obstacles = ReturnType<typeof figureFirstObstacles>;
function fits({ lines, boxes }: Obstacles, [x, y]: Point): boolean {
  const box = { x: x - X_BOX.w / 2, y: y - X_BOX.h / 2, ...X_BOX };
  const padded = { x: box.x - 2, y: box.y - 2, w: box.w + 4, h: box.h + 4 };
  return (
    box.x >= 4 &&
    box.y >= 4 &&
    box.x + box.w <= 236 &&
    box.y + box.h <= 236 &&
    !boxes.some((b) => overlaps(padded, b)) &&
    !lines.some(([a, b]) => lineHitsBox(a, b, padded))
  );
}

/** The label is inserted at the end of the drawing, haloed like the editor's
 * own labels so it stays legible over nearby strokes. When the opening is too
 * narrow for the label (a 35° angle, a crowded chord) it sits nearby with a
 * thin leader to the mark it names, as the editor does for given values. */
function withX(svg: string, [x, y]: Point, leaderFrom?: Point): string {
  let leader = "";
  if (leaderFrom) {
    const [ux, uy] = unit([x, y], leaderFrom);
    // Stop at the label box so the leader never runs through the glyph.
    const stop =
      Math.min(
        X_BOX.w / 2 / Math.max(0.001, Math.abs(ux)),
        X_BOX.h / 2 / Math.max(0.001, Math.abs(uy)),
      ) + 1.5;
    leader = `<line x1="${(x + ux * stop).toFixed(2)}" y1="${(y + uy * stop).toFixed(2)}" x2="${leaderFrom[0].toFixed(2)}" y2="${leaderFrom[1].toFixed(2)}" stroke="#111111" stroke-width="0.8" data-leader="target"/>`;
  }
  const label = `<text data-drill-label="target" x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="central" fill="black" stroke="white" stroke-width="3" paint-order="stroke" font-family="Arial, sans-serif" font-size="16.8">x</text>`;
  const end = svg.lastIndexOf("</svg>");
  return end < 0
    ? svg
    : `${svg.slice(0, end)}${leader}${label}${svg.slice(end)}`;
}

/** A free spot on rings around `centre`, nearest directions first, whose
 * straight leader back to `mark` crosses no label. */
function placeWithLeader(
  obstacles: Obstacles,
  centre: Point,
  mark: Point,
  preferred: Point,
): Point | undefined {
  const base = Math.atan2(preferred[1], preferred[0]);
  for (const r of [36, 44, 52, 60, 70, 82])
    for (let i = 0; i < 16; i++) {
      const angle = base + ((i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI) / 8;
      const at: Point = [
        centre[0] + r * Math.cos(angle),
        centre[1] + r * Math.sin(angle),
      ];
      if (
        fits(obstacles, at) &&
        !obstacles.boxes.some((box) => lineHitsBox(mark, at, box))
      )
        return at;
    }
  return undefined;
}

/** Target angle: along its bisector, past the editor's 22px arc. */
function annotateAngle(laidOut: string, canonical: string): string | undefined {
  const m = /<g data-drill-angle="target" data-points="([^"]+)"/.exec(
    canonical,
  );
  if (!m) return undefined;
  const [a, o, b] = m[1]
    .split(" ")
    .map((pair) => pair.split(",").map(Number) as unknown as Point);
  const ua = unit(o, a),
    ub = unit(o, b);
  let [dx, dy] = [ua[0] + ub[0], ua[1] + ub[1]];
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) [dx, dy] = [-ua[1], ua[0]];
  else [dx, dy] = [dx / length, dy / length];
  const obstacles = figureFirstObstacles(laidOut);
  for (const r of [34, 40, 46, 52, 60])
    for (const turn of [0, 0.2, -0.2, 0.4, -0.4]) {
      const at: Point = [
        o[0] + r * (dx * Math.cos(turn) - dy * Math.sin(turn)),
        o[1] + r * (dx * Math.sin(turn) + dy * Math.cos(turn)),
      ];
      if (fits(obstacles, at)) return withX(laidOut, at);
    }
  const mark: Point = [o[0] + dx * 25, o[1] + dy * 25];
  const at = placeWithLeader(obstacles, o, mark, [dx, dy]);
  return at && withX(laidOut, at, mark);
}

/** Target segment (drawn thick): beside its midpoint, away from the figure. */
function annotateSegment(
  laidOut: string,
  canonical: string,
): string | undefined {
  const m =
    /<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"[^>]*data-drill-segment="target"/.exec(
      canonical,
    );
  if (!m) return undefined;
  const a: Point = [num(m[1]), num(m[2])],
    b: Point = [num(m[3]), num(m[4])];
  const mid: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const [ux, uy] = unit(a, b);
  const normal: Point = [-uy, ux];
  // Prefer the side facing away from the drawing's centre.
  const away =
    (mid[0] - 120) * normal[0] + (mid[1] - 120) * normal[1] >= 0 ? 1 : -1;
  const obstacles = figureFirstObstacles(laidOut);
  for (const d of [14, 19, 24])
    for (const side of [away, -away])
      for (const along of [0, 12, -12, 24, -24, 36, -36]) {
        const at: Point = [
          mid[0] + side * d * normal[0] + along * ux,
          mid[1] + side * d * normal[1] + along * uy,
        ];
        if (fits(obstacles, at)) return withX(laidOut, at);
      }
  const at = placeWithLeader(obstacles, mid, mid, [
    away * normal[0],
    away * normal[1],
  ]);
  return at && withX(laidOut, at, mid);
}

const angleFamily = (prefix: string, instruction: string) =>
  defineFigureFirst<Record<string, never>>({
    instruction,
    parse: (prompt) => (prompt.figureId?.startsWith(prefix) ? {} : undefined),
    draw: (prompt, _parsed, laidOut, canonical) =>
      laidOut && canonical ? annotateAngle(laidOut, canonical) : undefined,
  });
const segmentFamily = (prefix: string, instruction: string) =>
  defineFigureFirst<Record<string, never>>({
    instruction,
    parse: (prompt) => (prompt.figureId?.startsWith(prefix) ? {} : undefined),
    draw: (prompt, _parsed, laidOut, canonical) =>
      laidOut && canonical ? annotateSegment(laidOut, canonical) : undefined,
  });

const ANGLE = "∠x의 크기를 구하세요.";
export const ANNOTATED_FIGURE_FIRST: Readonly<
  Record<string, FigureFirstFamily>
> = {
  "m1-parallel-angle": angleFamily(
    "gm-m1-parallel-angle-",
    `다음 그림에서 ℓ∥m일 때, ${ANGLE}`,
  ),
  "m1-triangle-exterior": angleFamily(
    "gm-m1-triangle-exterior-",
    `다음 그림에서 ${ANGLE}`,
  ),
  "m1-triangle-interior-exterior": angleFamily(
    "gm-m1-triangle-interior-exterior-",
    `다음 그림에서 ${ANGLE}`,
  ),
  "m1-polygon-interior": angleFamily(
    "gm-m1-polygon-interior-",
    `다음 그림의 정다각형에서 ${ANGLE}`,
  ),
  "m1-polygon-exterior": angleFamily(
    "gm-m1-polygon-exterior-",
    `다음 그림의 정다각형에서 ${ANGLE}`,
  ),
  "m3-circle-inscribed": angleFamily(
    "gm-m3-circle-inscribed-",
    `다음 그림에서 점 O가 원의 중심일 때, ${ANGLE}`,
  ),
  "m3-circle-central": angleFamily(
    "gm-m3-circle-central-",
    `다음 그림에서 점 O가 원의 중심일 때, ${ANGLE}`,
  ),
  "m3-circle-same-arc": angleFamily(
    "gm-m3-circle-same-arc-",
    `다음 그림에서 ${ANGLE}`,
  ),
  "m3-circle-cyclic-opposite": angleFamily(
    "gm-m3-circle-cyclic-opposite-",
    `다음 그림에서 □ABCD가 원에 내접할 때, ${ANGLE}`,
  ),
  "m3-circle-tangent-angle": angleFamily(
    "gm-m3-circle-tangent-angle-",
    `다음 그림에서 직선 TP가 점 T에서 원 O에 접할 때, ${ANGLE}`,
  ),
  "m3-circle-tangent-chord": angleFamily(
    "gm-m3-circle-tangent-chord-",
    `다음 그림에서 직선이 점 T에서 원에 접할 때, ${ANGLE}`,
  ),
  "m3-circle-chord-length": segmentFamily(
    "gm-m3-circle-chord-length-",
    "다음 그림의 원 O에서 OM⊥AB일 때, x의 값을 구하세요. 근호는 간단히 하세요.",
  ),
  "m3-circle-chord-distance": segmentFamily(
    "gm-m3-circle-chord-distance-",
    "다음 그림의 원 O에서 OM⊥AB일 때, x의 값을 구하세요. 근호는 간단히 하세요.",
  ),
  "m3-circle-equal-tangents": segmentFamily(
    "gm-m3-circle-equal-tangents-",
    "다음 그림에서 PA, PB가 원 O의 접선이고 점 A, B가 접점일 때, x의 값을 구하세요.",
  ),
};
