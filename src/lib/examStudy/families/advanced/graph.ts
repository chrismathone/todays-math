import type {
  CanonicalParams,
  ExamStudyDraft,
} from "@/contracts/examStudy.contract";
import { typesetLabel } from "@/lib/figure/mathjaxLabel";
import {
  BASIC_CHECKS,
  assert,
  assertAnswer,
  authoredFamily,
  checked,
  draft,
  listText,
  requireMatch,
} from "./shared";

const FIGURE_CHECKS = [...BASIC_CHECKS, "visual-information"] as const;
export type Point = readonly [number, number];
export interface GraphFigure {
  version: "graph-1";
  xRange: [number, number];
  yRange: [number, number];
  width: number;
  height: number;
  axes: boolean;
  curves: { coefficients: number[]; domain: [number, number] }[];
  points: { at: Point; radius?: number }[];
  labels: {
    at: Point;
    text: string;
    dx?: number;
    dy?: number;
    anchor?: string;
  }[];
  segments?: { from: Point; to: Point; dashed?: boolean }[];
  polygons?: { points: Point[] }[];
}

export function graphFigure(item: ExamStudyDraft): GraphFigure {
  assert(item.figureSpec?.version === "graph-1", "필수 그래프가 없습니다.");
  return item.figureSpec as unknown as GraphFigure;
}

function coordinateLabel(spec: GraphFigure, name: string): Point {
  assert(Array.isArray(spec.labels), "그래프 라벨이 없습니다.");
  const labels = spec.labels.filter((x) => x.text.startsWith(`${name}(`));
  assert(labels.length === 1, `그림의 ${name} 좌표 라벨이 유일하지 않습니다.`);
  const m = requireMatch(
    labels[0]!.text,
    new RegExp(`^${name}\\((-?\\d+), (-?\\d+)\\)$`),
  );
  const point = [+m[1]!, +m[2]!] as const;
  assert(
    labels[0]!.at[0] === point[0] && labels[0]!.at[1] === point[1],
    "라벨 좌표와 그려진 위치 불일치",
  );
  assert(
    spec.points.some((x) => x.at[0] === point[0] && x.at[1] === point[1]),
    "라벨에 해당하는 점이 없습니다.",
  );
  return point;
}

export interface ParabolaProblem {
  vertex: Point;
  given: Point;
  multiplier: number;
}
export function readParabola(item: ExamStudyDraft): ParabolaProblem {
  requireMatch(
    item.content,
    /그림의 V는 포물선의 꼭짓점이고 A는 그 포물선 위의 점/,
  );
  requireMatch(item.content, /A를 지나고 기울기가/);
  requireMatch(item.content, /A 이외의 점 B/);
  const m = requireMatch(item.content, /기울기가 \((-?\d+)\)a/);
  const spec = graphFigure(item),
    vertex = coordinateLabel(spec, "V"),
    given = coordinateLabel(spec, "A");
  assert(given[0] !== vertex[0], "주어진 점이 대칭축 위에 있습니다.");
  // Core numeric givens occur only in the figure, not duplicated in body text.
  assert(
    !/V\(-?\d|A\(-?\d/.test(item.content),
    "필수 시각 정보가 본문에 모두 주어졌습니다.",
  );
  return { vertex, given, multiplier: +m[1]! };
}

/** Expands the reconstructed parabola and divides its line-difference
 * polynomial by the KNOWN root x_A (synthetic division). No generated a/B. */
export function solveParabola(p: ParabolaProblem) {
  const [h, k] = p.vertex,
    [x, y] = p.given;
  const a = (y - k) / (x - h) ** 2;
  assert(a !== 0, "포물선이 아닙니다.");
  const slope = p.multiplier * a,
    intercept = y - slope * x;
  const coefficients = [a, -2 * a * h - slope, a * h * h + k - intercept];
  const quotientConstant = coefficients[1]! + a * x;
  const remainder = coefficients[2]! + quotientConstant * x;
  assert(Math.abs(remainder) < 1e-10, "A가 공통 교점이 아닙니다.");
  const otherX = -quotientConstant / a,
    otherY = slope * otherX + intercept;
  assert(otherX !== x && otherX !== h, "중근 또는 핵심 계수에 무관한 출력");
  assert(
    Math.abs(otherY - (a * (otherX - h) ** 2 + k)) < 1e-10,
    "두 번째 교점 원식 검산 실패",
  );
  return { a, slope, intercept, other: [otherX, otherY] as Point };
}

const parabolaDomain: CanonicalParams[] = [];
for (const h of [-2, 0, 2])
  for (const k of [-2, 1])
    for (const a of [-2, 1, 2])
      for (const s of [1, 2])
        for (const r of [-2, -1, 3])
          if (s !== r && s + r !== 0)
            parabolaDomain.push({ h, k, a, s, multiplier: s + r });

/** graph-1 accepts explicit labels but deliberately has no automatic placement.
 * Keep annotations off axes/curves and inside its viewBox without changing the
 * actual mathematical data or inventing an SVG path. Pixel tests are layout
 * only; independent mathematical verification remains entirely algebraic. */
export function placeGraphLabels(spec: GraphFigure): void {
  type Box = readonly [number, number, number, number];
  const screen = ([x, y]: Point): Point => [
    48 +
      ((x - spec.xRange[0]) / (spec.xRange[1] - spec.xRange[0])) *
        (spec.width - 96),
    spec.height -
      48 -
      ((y - spec.yRange[0]) / (spec.yRange[1] - spec.yRange[0])) *
        (spec.height - 96),
  ];
  const occupied: Box[] = [];
  const xAxis =
    spec.axes && spec.yRange[0] <= 0 && spec.yRange[1] >= 0
      ? screen([0, 0])[1]
      : null;
  const yAxis =
    spec.axes && spec.xRange[0] <= 0 && spec.xRange[1] >= 0
      ? screen([0, 0])[0]
      : null;
  if (xAxis !== null)
    occupied.push([spec.width - 61, xAxis + 2, spec.width - 28, xAxis + 29]);
  if (yAxis !== null) occupied.push([yAxis - 30, 13, yAxis + 5, 48]);
  const strokes: (readonly [Point, Point])[] = [];
  const addPolyline = (points: readonly Point[]) => {
    for (let i = 1; i < points.length; i++)
      strokes.push([points[i - 1]!, points[i]!]);
  };
  for (const curve of spec.curves)
    addPolyline(
      Array.from({ length: 401 }, (_, n) => {
        const x =
          curve.domain[0] + ((curve.domain[1] - curve.domain[0]) * n) / 400;
        return screen([x, curve.coefficients.reduce((y, c) => y * x + c, 0)]);
      }),
    );
  for (const segment of spec.segments ?? [])
    strokes.push([screen(segment.from), screen(segment.to)]);
  for (const polygon of spec.polygons ?? [])
    addPolyline([...polygon.points, polygon.points[0]!].map(screen));
  const dots = spec.points.map((point) => ({
    at: screen(point.at),
    radius: point.radius ?? 3,
  }));
  const crosses = ([a, b]: readonly [Point, Point], box: Box) => {
    let low = 0,
      high = 1;
    for (let axis = 0; axis < 2; axis++) {
      const delta = b[axis]! - a[axis]!;
      if (Math.abs(delta) < 1e-10) {
        if (a[axis]! <= box[axis]! || a[axis]! >= box[axis + 2]!) return false;
      } else {
        const enter = (box[axis]! - a[axis]!) / delta;
        const leave = (box[axis + 2]! - a[axis]!) / delta;
        low = Math.max(low, Math.min(enter, leave));
        high = Math.min(high, Math.max(enter, leave));
        if (low >= high) return false;
      }
    }
    return true;
  };
  const overlap = (a: Box, b: Box) =>
    a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  for (const label of spec.labels) {
    const [px, py] = screen(label.at);
    // Reuse the renderer's glyph metrics: character-count estimates reject
    // usable space on the 400-unit canvas and miss minus signs/descenders.
    const metrics = typesetLabel(label.text);
    assert(metrics, "그래프 좌표 라벨을 조판할 수 없습니다.");
    const width = metrics.widthEm * 20;
    const centerY = ((metrics.ascentEm - metrics.descentEm) * 20) / 2;
    const candidates: { dx: number; dy: number; anchor: string }[] = [
      {
        dx: label.dx ?? 0,
        dy: label.dy ?? 0,
        anchor: label.anchor ?? "middle",
      },
    ];
    for (const distance of [18, 24, 32, 42, 56, 74, 96, 120])
      for (let direction = 0; direction < 16; direction++) {
        const angle = (direction * Math.PI) / 8;
        candidates.push({
          dx: distance * Math.cos(angle),
          dy: centerY + distance * Math.sin(angle),
          anchor: "middle",
        });
      }
    let chosen: (typeof candidates)[number] | undefined;
    for (const candidate of candidates) {
      const x = px + candidate.dx,
        y = py + candidate.dy;
      const left =
        x -
        (candidate.anchor === "end"
          ? width
          : candidate.anchor === "middle"
            ? width / 2
            : 0);
      const box: Box = [
        left - 3,
        y - metrics.ascentEm * 20 - 3,
        left + width + 3,
        y + metrics.descentEm * 20 + 3,
      ];
      if (
        box[0] < 5 ||
        box[2] > spec.width - 5 ||
        box[1] < 5 ||
        box[3] > spec.height - 5
      )
        continue;
      if (occupied.some((other) => overlap(box, other))) continue;
      // Point-name labels must remain closest to their own named point. In
      // particular E/I and O/I may be close: clearing a stroke must not swap
      // their visual roles. Coordinate labels already identify their owner.
      if (/^[A-Z]$/.test(label.text)) {
        const cx = left + width / 2,
          cy = y - centerY;
        const ownDistance = Math.hypot(cx - px, cy - py);
        if (
          dots.some(
            ({ at: [x, y] }) =>
              Math.hypot(x - px, y - py) > 1e-6 &&
              Math.hypot(cx - x, cy - y) < ownDistance - 1e-6,
          )
        )
          continue;
      }
      if (
        xAxis !== null &&
        box[1] <= xAxis + 2 &&
        box[3] >= xAxis - 2 &&
        box[2] >= 48 &&
        box[0] <= spec.width - 48
      )
        continue;
      if (
        yAxis !== null &&
        box[0] <= yAxis + 2 &&
        box[2] >= yAxis - 2 &&
        box[3] >= 48 &&
        box[1] <= spec.height - 48
      )
        continue;
      if (strokes.some((stroke) => crosses(stroke, box))) continue;
      if (
        dots.some(
          ({ at: [x, y], radius }) =>
            Math.hypot(
              x - Math.max(box[0], Math.min(box[2], x)),
              y - Math.max(box[1], Math.min(box[3], y)),
            ) <
            radius + 1,
        )
      )
        continue;
      chosen = candidate;
      occupied.push(box);
      break;
    }
    assert(chosen, "그래프 좌표 라벨을 겹치지 않게 놓을 수 없습니다.");
    Object.assign(label, chosen);
  }
}

function buildParabola(p: CanonicalParams): ExamStudyDraft {
  const h = p.h as number,
    k = p.k as number,
    a = p.a as number,
    s = p.s as number,
    c = p.multiplier as number;
  const r = c - s,
    vx: Point = [h, k],
    ax: Point = [h + s, k + a * s * s],
    bx: Point = [h + r, k + a * r * r];
  const xlo = Math.min(h, ax[0], bx[0]) - 0.8,
    xhi = Math.max(h, ax[0], bx[0]) + 0.8;
  const lineB = ax[1] - a * c * ax[0];
  const yValues = [
    0,
    k,
    a * (xlo - h) ** 2 + k,
    a * (xhi - h) ** 2 + k,
    a * c * xlo + lineB,
    a * c * xhi + lineB,
  ];
  const ylo = Math.min(...yValues) - 1.5,
    yhi = Math.max(...yValues) + 1.5;
  const figure: GraphFigure = {
    // Keep a right margin beyond the curve domain for coordinate labels and
    // the x-axis name; graph-1 deliberately does not auto-place graph labels.
    version: "graph-1",
    xRange: [xlo, xhi + 1.3],
    yRange: [ylo, yhi],
    // graph-1's 20-unit labels become 13.23px at the shared 70mm print width.
    // A larger canvas silently shrinks both the givens and the axis names.
    width: 400,
    height: 400,
    axes: true,
    curves: [
      { coefficients: [a, -2 * a * h, a * h * h + k], domain: [xlo, xhi] },
      { coefficients: [a * c, lineB], domain: [xlo, xhi] },
    ],
    points: [vx, ax, bx].map((at) => ({ at })),
    labels: [
      {
        at: vx,
        text: `V(${h}, ${k})`,
        dx: -12,
        dy: a > 0 ? 22 : -14,
        anchor: "end",
      },
      {
        at: ax,
        text: `A(${ax[0]}, ${ax[1]})`,
        dx: 12,
        dy: a > 0 ? 35 : -32,
        anchor: "start",
      },
      { at: bx, text: "B", dx: -20, dy: 0, anchor: "end" },
    ],
  };
  placeGraphLabels(figure);
  return draft(
    p,
    `그림의 V는 포물선의 꼭짓점이고 A는 그 포물선 위의 점이다. 포물선의 식을 y=a(x-h)²+k라 하자. ` +
      `A를 지나고 기울기가 (${c})a인 직선이 포물선과 A 이외의 점 B에서 만난다. B의 좌표를 구하시오.`,
    listText(bx),
    `그림의 꼭짓점으로 h=${h}, k=${k}이고 A를 대입하면 a=${a}이다. ` +
      `따라서 직선은 y=${a * c}x+(${lineB})이다. t=x-${h}로 놓고 두 식을 같게 하면 ` +
      `${a}(t-${s})(t-${r})=0이다. 이미 주어진 A는 t=${s}이므로 나머지 교점은 t=${r}이다. ` +
      `원래 포물선과 직선 모두에 대입하면 B=${listText(bx)}이다.`,
    [
      "그림의 꼭짓점·점 좌표로 포물선 계수 복원",
      "복원한 계수를 직선의 기울기에 재사용",
      "주어진 교점을 제외한 근을 골라 두 식에 검산",
    ],
    { figureSpec: figure as unknown as Record<string, unknown> },
  );
}

export const parabolaLineChainFamily = authoredFamily({
  id: "exam-advanced:parabola-line-chain",
  title: "포물선 계수에서 직선과 다른 교점까지",
  requirement: "graph.parabola-line-chain",
  course: "중3",
  unit: "이차함수와 그래프",
  domain: parabolaDomain,
  figure: true,
  checks: FIGURE_CHECKS,
  boundaries: [
    "위/아래로 열린 포물선",
    "음수·양수 기울기",
    "축 양쪽 교점",
    "알려진 근 배제",
    "핵심 수치는 그림에만 표기",
  ],
  build: buildParabola,
  verify: (item) =>
    checked(FIGURE_CHECKS, () => {
      const p = readParabola(item),
        solved = solveParabola(p),
        spec = graphFigure(item);
      assertAnswer(item, listText(solved.other));
      assert(spec.curves.length === 2, "포물선과 직선이 모두 필요합니다.");
      const actual = spec.curves[0]!.coefficients,
        line = spec.curves[1]!.coefficients;
      const [h, k] = p.vertex;
      assert(
        JSON.stringify(actual) ===
          JSON.stringify([solved.a, -2 * solved.a * h, solved.a * h * h + k]),
        "그림의 포물선과 좌표 조건 불일치",
      );
      assert(
        JSON.stringify(line) ===
          JSON.stringify([solved.slope, solved.intercept]),
        "그림의 직선과 기울기 조건 불일치",
      );
      for (const curve of spec.curves) {
        assert(
          curve.domain[0] < curve.domain[1] &&
            [p.vertex[0], p.given[0], solved.other[0]].every(
              (x) => x >= curve.domain[0] && x <= curve.domain[1],
            ),
          "핵심 교점/꼭짓점이 그려진 곡선 구간 밖에 있습니다.",
        );
      }
      // Each dependency changes a coordinate of the requested pair. In
      // particular a does NOT cancel from the y-coordinate (a common false chain).
      const changedA = solveParabola({
        ...p,
        given: [p.given[0], p.given[1] + (p.given[0] - h) ** 2],
      });
      assert(
        changedA.other[1] !== solved.other[1],
        "포물선 계수 복원이 불필요합니다.",
      );
      const changedLine = solveParabola({ ...p, multiplier: p.multiplier + 7 });
      assert(
        changedLine.other[0] !== solved.other[0],
        "직선의 계수 재사용이 불필요합니다.",
      );
      for (const point of spec.points)
        assert(
          point.at[0] >= spec.xRange[0] &&
            point.at[0] <= spec.xRange[1] &&
            point.at[1] >= spec.yRange[0] &&
            point.at[1] <= spec.yRange[1],
          "필수 점이 그림 밖에 있습니다.",
        );
    }),
});
