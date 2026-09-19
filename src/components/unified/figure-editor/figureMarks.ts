import type {
  FigureEditCommand,
  FigureEditPointRef,
} from "@/lib/dev-ai/figure-edit-contract";
import {
  addFigureObject,
  editFigureObject,
  figureObjects,
  readFigureSvg,
} from "./figureSvgEditing";
import {
  applyPoint,
  elementMatrix,
  parentMatrix,
  type Affine,
  type Point,
} from "./figureEditGeometry";
import { sampleFigurePath } from "./figureFlip";
import { widenFrame } from "./figureFrame";
import { POINT_NAME } from "./figureEditElements";
import { figureAngleKinds } from "./figureObjectGroups";
import { ANGLE_MARK_WIDTH } from "./figureAngleMark";
import { figureLabelSummary } from "./FigureLabelInput";
import { objectName } from "./figureObjectNames";
import {
  recognizeSegmentMarks,
  SEGMENT_MARK_NAMES,
  straightInk,
  straightPathPieces,
  unitOf,
  type StraightInk,
} from "./figureSegmentMarks";

/**
 * 표시 더하기(원장님 2026-09-19 «추가할 수 있는 것 전부») — 치수 · 같은 길이 표시 · 평행 표시.
 * 도형 엔진 v2 가 그리는 것과 **같은 요소 모양**을 만든다(vendor/figure-engine/core/figure_scene.py):
 * - 같은 길이 표시: 선분을 가로지르는 눈금 한 줄마다 `<line>` 하나(`_segment_mark_lines` ticks) — 길이 8, 3 간격.
 * - 평행 표시: » 하나마다 `<line>` 둘(날개 → 촉, 촉 → 날개) — 한 획 6.5, 30°, 4 간격. 촉은 from → to 쪽.
 *   한 선분에 둘 다 있으면 눈금은 뒤, » 는 앞으로 6 씩 비켜 선다(`_BOTH_MARKS_SHIFT`).
 *   선분 위에 얹힌 점(중점 M 등)이 있으면 가장 넓은 빈 구간의 한복판에 선다(`_segment_mark_center`).
 * - 치수: 값 자리에 틈을 낸 두 조각 점선 Q 곡선(`_dimension_gapped_path`) + 값 글자(흰 테두리). 끝은 두 점에서 3 안쪽,
 *   꼭대기는 현에서 14. 값이 현에 비해 길면 틈 없이 곡선 너머에 선다.
 * 크기는 그림의 이웃 표시를, 없으면 꼭짓점 이름 글자 크기(엔진 16.8 = 1배)를 따른다 — 엔진 그림에서는 엔진 값 그대로다.
 */
const TICK_HALF = 4;
const MARK_GAP = 3;
const CHEVRON_ARM = 6.5;
const CHEVRON_HALF_ANGLE = (30 * Math.PI) / 180;
const CHEVRON_GAP = 4;
const BOTH_MARKS_SHIFT = 6;
/** 표시가 선분 끝에서 떨어져야 하는 거리 — 넘치면 엔진은 던진다. */
const END_ROOM = 2;
const DIMENSION_OFFSET = 14;
const DIMENSION_INSET = 3;
const DIMENSION_WIDTH = 0.72;
const DIMENSION_DASH = [5, 3];
const DIMENSION_FONT = 16.8;
const DIMENSION_MIN_FONT = 10;
const DIMENSION_HALO = 5.6;
const INK = "#111111";

export type FigureMarkCommand = Extract<
  FigureEditCommand,
  { op: "addDimension" | "addTick" | "addParallelMark" }
>;
export const isFigureMarkCommand = (
  command: FigureEditCommand,
): command is FigureMarkCommand =>
  command.op === "addDimension" ||
  command.op === "addTick" ||
  command.op === "addParallelMark";

/** 적용 목록의 한 줄 — «선분 AB 같은 길이 표시 추가(2겹)» · «선분 BC 치수 10 추가». 좌표로 준 끝이 있으면 «선분 AB» 없이. */
export function figureMarkLabel(command: FigureMarkCommand): string {
  const segment =
    typeof command.from === "string" && typeof command.to === "string"
      ? `선분 ${command.from}${command.to} `
      : "";
  if (command.op === "addDimension")
    return `${segment}치수 ${figureLabelSummary(command.text)} 추가`;
  const count = command.count ?? 1;
  return `${segment}${SEGMENT_MARK_NAMES[command.op === "addTick" ? "tick" : "parallel"]} 추가${
    count > 1 ? `(${count}겹)` : ""
  }`;
}

// ── 기하 ────────────────────────────────────────────────────────────────
const sub = (p: Point, q: Point): Point => [p[0] - q[0], p[1] - q[1]];
const dot = (p: Point, q: Point) => p[0] * q[0] + p[1] * q[1];
const cross = (u: Point, v: Point) => u[0] * v[1] - u[1] * v[0];
const at = (a: Point, u: Point, t: number): Point => [
  a[0] + t * u[0],
  a[1] + t * u[1],
];
const lerp = (p: Point, q: Point, t: number): Point => [
  p[0] + (q[0] - p[0]) * t,
  p[1] + (q[1] - p[1]) * t,
];
const length = (p: Point, q: Point) => Math.hypot(q[0] - p[0], q[1] - p[1]);
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
/** 엔진 `_fmt` — 소수 셋째 자리, 뒤 0 없이. */
const fmt = (value: number) => {
  const text = (Math.abs(value) < 5e-7 ? 0 : value)
    .toFixed(3)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
  return text === "-0" || !text ? "0" : text;
};
const round3 = (value: number) => Number(fmt(value));
type FigureObject = ReturnType<typeof figureObjects>[number];
const NUMBER = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi;
const numbers = (value = "") => (value.match(NUMBER) ?? []).map(Number);
const pairs = (values: number[]): Point[] =>
  values.flatMap((x, i) =>
    i % 2 || i + 1 >= values.length ? [] : [[x, values[i + 1]] as Point],
  );
const spread = (points: Point[]) =>
  points.length
    ? Math.hypot(
        Math.max(...points.map((p) => p[0])) -
          Math.min(...points.map((p) => p[0])),
        Math.max(...points.map((p) => p[1])) -
          Math.min(...points.map((p) => p[1])),
      )
    : 0;

/**
 * 도형 잉크의 점 — 치수의 «도형 밖»을 가르는 볼록 껍질 재료(엔진 `_shape_hull`: 보조점이 아니라 그려지는 잉크).
 * 선분 위 표시(짧은 획)·각 표시·치수(점선 곡선)·글자는 도형 몸통이 아니라 뺀다.
 */
function inkHull(
  objects: FigureObject[],
  matrices: Affine[],
  size: number,
  strokes: ReadonlySet<number>,
): Point[] {
  const hull: Point[] = [];
  objects.forEach((o, index) => {
    if (strokes.has(index)) return;
    const m = matrices[index];
    const n = (key: string) => Number.parseFloat(o.attrs[key] ?? "") || 0;
    const put = (points: Point[]) =>
      hull.push(...points.map((p) => applyPoint(m, p)));
    if (o.type === "line")
      put([
        [n("x1"), n("y1")],
        [n("x2"), n("y2")],
      ]);
    else if (o.type === "polyline" || o.type === "polygon")
      put(pairs(numbers(o.attrs.points)));
    else if (o.type === "rect")
      put([
        [n("x"), n("y")],
        [n("x") + n("width"), n("y") + n("height")],
        [n("x") + n("width"), n("y")],
        [n("x"), n("y") + n("height")],
      ]);
    else if (o.type === "circle" || o.type === "ellipse") {
      const rx = n(o.type === "circle" ? "r" : "rx"),
        ry = n(o.type === "circle" ? "r" : "ry");
      put(
        Array.from({ length: 16 }, (_, k): Point => [
          n("cx") + rx * Math.cos((k * Math.PI) / 8),
          n("cy") + ry * Math.sin((k * Math.PI) / 8),
        ]),
      );
    } else if (o.type === "path") {
      const dash = o.attrs["stroke-dasharray"] ?? "";
      if (dash && dash !== "none") return;
      const points = (sampleFigurePath(o.attrs.d ?? "", 8) ?? [])
        .flat()
        .map((p) => applyPoint(m, p));
      // ㄱ자·각의 호처럼 작은 경로는 도형 몸통이 아니다
      if (spread(points) > 0.12 * size) hull.push(...points);
    }
  });
  return hull;
}

const sizeOf = (viewBox: readonly number[]) =>
  Math.max(viewBox[2] || 480, viewBox[3] || 360);

// ── 적용 ────────────────────────────────────────────────────────────────
export interface FigureMarkContext {
  /** 점 이름·좌표 → 그림 좌표. 못 찾으면 적용 쪽의 거절로 던진다. */
  resolve: (ref: FigureEditPointRef) => { x: number; y: number };
  /** 요청 때 그림의 이름 붙은 점 — 선분 위에 얹힌 점을 피해 표시를 세운다. */
  names: readonly { x: number; y: number }[];
  /** 요청 때 그림의 요소 이름(«4번 선분») — 이번 요청에서 더한 요소면 undefined. */
  nameOf: (id: string) => string | undefined;
}

function readFigure(svg: string) {
  const doc = readFigureSvg(svg);
  const nodes = [...doc.querySelectorAll("[data-object-id]")];
  const objects = figureObjects(svg);
  const parsed = doc.documentElement
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const viewBox =
    parsed?.length === 4 && parsed.every(Number.isFinite) && parsed[2] > 0
      ? parsed
      : [0, 0, 480, 360];
  const size = sizeOf(viewBox);
  const matrices = nodes.map(elementMatrix);
  const ink = straightInk(objects, matrices, size);
  // 꼭짓점 이름 글자 크기 — 엔진 16.8 을 1배로 삼는다(치수 값 글자는 짧은 변에서 작아지므로 이름 글자를 본다)
  const texts = objects.filter((o) => o.type === "text");
  const pointNames = texts.filter((o) =>
    POINT_NAME.test((o.attrs["data-mj"] ?? o.text).replace(/[$\s]/g, "")),
  );
  const pool = pointNames.length ? pointNames : texts;
  const fonts = pool
    .map((o) => Number.parseFloat(o.attrs["font-size"] ?? ""))
    .filter((value) => value > 0);
  // 엔진 라벨이 적어 둔 제 점(`data-px`·`data-py`) — 선 끝이 아닌 점(중점 M 등)의 정확한 자리
  const anchors = objects.flatMap((o, i) => {
    const px = Number.parseFloat(o.attrs["data-px"] ?? ""),
      py = Number.parseFloat(o.attrs["data-py"] ?? "");
    return o.type === "text" && Number.isFinite(px) && Number.isFinite(py)
      ? [applyPoint(parentMatrix(nodes[i]), [px, py])]
      : [];
  });
  return {
    objects,
    matrices,
    anchors,
    viewBox,
    size,
    ink,
    hull: inkHull(
      objects,
      matrices,
      size,
      new Set(ink.strokes.map((stroke) => stroke.index)),
    ),
    marks: recognizeSegmentMarks(ink),
    font: fonts.length ? median(fonts) : undefined,
    family: pool.find((o) => o.attrs["font-family"])?.attrs["font-family"],
  };
}
type Figure = ReturnType<typeof readFigure>;

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));
/** 엔진 크기의 몇 배로 그릴까 — 이름 글자 크기로, 글자가 없으면 그림 크기로(엔진 그림은 250~310). */
const figureScale = (figure: Figure) =>
  figure.font
    ? clamp(figure.font / DIMENSION_FONT, 0.5, 3)
    : clamp(figure.size / 275, 0.5, 1);

/** 이웃 표시(선분 위 표시 · 각 표시)의 굵기·색 — 없으면 엔진 값. */
function markStyle(figure: Figure) {
  const angles = figureAngleKinds(figure.objects, figure.viewBox);
  const neighbours = [
    ...figure.marks.flatMap((mark) =>
      mark.indices.map((index) => figure.objects[index]),
    ),
    ...figure.objects.filter((o) => angles.has(o.id)),
  ];
  const widths = neighbours
    .map((o) => Number.parseFloat(o.attrs["stroke-width"] ?? ""))
    .filter((value) => value > 0);
  const color = neighbours
    .map((o) => o.attrs.stroke?.trim())
    .find((value) => value && /^#[\da-f]{3,6}$/i.test(value));
  return {
    width: widths.length ? median(widths) : ANGLE_MARK_WIDTH,
    color: color ?? INK,
  };
}

function describe(figure: Figure, index: number, context: FigureMarkContext) {
  const o = figure.objects[index];
  return (
    context.nameOf(o.id) ??
    objectName(o, figureAngleKinds(figure.objects, figure.viewBox))
  );
}

/**
 * «AI 요청대로 고치기»의 표시 명령 하나를 지금 그림에 더한다. 성공이면 새 그림과 적용 목록 한 줄, 아니면 이유.
 * 이름·좌표를 못 찾으면 context.resolve 가 던진다(적용 쪽 거절 이유 그대로).
 */
export function addFigureMark(
  svg: string,
  command: FigureMarkCommand,
  context: FigureMarkContext,
): { svg: string; text: string } | { reason: string } {
  const from = context.resolve(command.from),
    to = context.resolve(command.to);
  const figure = readFigure(svg);
  // 요소 목록은 점 이름 자리를 소수 첫째 자리로 싣는다 — 가까운(0.1 안) 꼭짓점·엔진 라벨의 점 자리가 있으면 그대로
  const vertices = [
    ...figure.ink.edges.flatMap((e) => [e.a, e.b]),
    ...figure.anchors,
  ];
  const snap = ({ x, y }: { x: number; y: number }): Point => {
    let best: Point = [x, y],
      distance = 0.1;
    for (const v of vertices) {
      const d = Math.hypot(v[0] - x, v[1] - y);
      if (d <= distance) [best, distance] = [v, d];
    }
    return best;
  };
  const a = snap(from),
    b = snap(to);
  if (length(a, b) < 1e-6) return { reason: "두 점이 같습니다" };
  context = {
    ...context,
    names: context.names.map((p) => {
      const [x, y] = snap(p);
      return { x, y };
    }),
  };
  const text = figureMarkLabel(command);
  const result =
    command.op === "addDimension"
      ? addDimension(
          svg,
          figure,
          a,
          b,
          command.text,
          command.side ?? "out",
          context,
        )
      : addSegmentMark(
          svg,
          figure,
          a,
          b,
          command.op === "addTick" ? "tick" : "parallel",
          command.count ?? 1,
          context,
        );
  return "reason" in result ? result : { svg: result.svg, text };
}

/** 선분 AB 가 그림에 그려져 있나 — 한 변이든 이어 붙은 변들이든(중점 M 으로 나뉜 AM·MB), 선분 위 다섯 자리가 다 변 위. */
function drawn(ink: StraightInk, a: Point, b: Point, tol: number) {
  const onSomeEdge = (p: Point) =>
    ink.edges.some((e) => {
      const E = length(e.a, e.b);
      if (!(E > 0)) return false;
      const u = unitOf(e);
      const t = dot(sub(p, e.a), u);
      return (
        Math.abs(cross(u, sub(p, e.a))) <= tol && t >= -tol && t <= E + tol
      );
    });
  return [0.02, 0.25, 0.5, 0.75, 0.98].every((t) => onSomeEdge(lerp(a, b, t)));
}

function addSegmentMark(
  svg: string,
  figure: Figure,
  a: Point,
  b: Point,
  kind: "tick" | "parallel",
  count: number,
  context: FigureMarkContext,
): { svg: string } | { reason: string } {
  const len = length(a, b);
  const u: Point = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const n: Point = [-u[1], u[0]];
  const tol = Math.max(1.5, 0.01 * figure.size);
  if (!drawn(figure.ink, a, b, tol))
    return { reason: "그림에 없는 선분입니다" };
  // 이 선분 위에 이미 선 표시
  const onSegment = figure.marks.flatMap((mark) => {
    const eu = unitOf(mark.edge);
    const center = at(mark.edge.a, eu, mark.center);
    const t = dot(sub(center, a), u);
    return Math.abs(cross(u, sub(center, a))) <= tol && t > 0 && t < len
      ? [{ mark, t, dir: (Math.sign(dot(eu, u)) * mark.dir) as number }]
      : [];
  });
  const same = onSegment.find(({ mark }) => mark.kind === kind);
  if (same)
    return {
      reason: `이미 ${SEGMENT_MARK_NAMES[kind]}가 있습니다(${describe(figure, same.mark.indices[0], context)})`,
    };
  const scale = figure.marks.length
    ? median(
        figure.marks.map(
          (mark) =>
            mark.stroke / (mark.kind === "tick" ? 2 * TICK_HALF : CHEVRON_ARM),
        ),
      )
    : figureScale(figure);
  const other = onSegment[0];
  let center: number;
  if (other)
    // 엔진은 한 선분의 눈금을 » 뒤(촉 반대쪽)에, » 를 앞에 6 씩 비켜 세운다 — 둘 사이 12
    center =
      kind === "tick"
        ? other.t - 2 * BOTH_MARKS_SHIFT * scale * other.dir
        : other.t + 2 * BOTH_MARKS_SHIFT * scale;
  else {
    // 선분 위에 얹힌 점을 피한 가장 넓은 빈 구간의 한복판(엔진 `_segment_mark_center`)
    const cuts = [0, len];
    for (const p of context.names) {
      const t = dot(sub([p.x, p.y], a), u);
      if (
        t > tol &&
        t < len - tol &&
        Math.abs(cross(u, sub([p.x, p.y], a))) <= 1
      )
        cuts.push(t);
    }
    cuts.sort((x, y) => x - y);
    let widest = -1;
    center = len / 2;
    // 너비가 같으면 앞 구간(엔진처럼) — 옮긴 좌표의 부동소수 오차가 차례를 뒤집지 않게
    for (let i = 1; i < cuts.length; i++)
      if (cuts[i] - cuts[i - 1] > widest + 1e-6) {
        widest = cuts[i] - cuts[i - 1];
        center = (cuts[i] + cuts[i - 1]) / 2;
      }
  }
  const lines: [Point, Point][] = [];
  if (kind === "tick") {
    const half = TICK_HALF * scale;
    for (let i = 0; i < count; i++) {
      const c = at(a, u, center + (i - (count - 1) / 2) * MARK_GAP * scale);
      lines.push([at(c, n, -half), at(c, n, half)]);
    }
  } else {
    const depth = CHEVRON_ARM * scale * Math.cos(CHEVRON_HALF_ANGLE);
    const wing = CHEVRON_ARM * scale * Math.sin(CHEVRON_HALF_ANGLE);
    for (let i = 0; i < count; i++) {
      const tip = at(
        a,
        u,
        center + depth / 2 + (i - (count - 1) / 2) * CHEVRON_GAP * scale,
      );
      const back = at(tip, u, -depth);
      lines.push([at(back, n, wing), tip], [tip, at(back, n, -wing)]);
    }
  }
  const spans = lines.flat().map((p) => dot(sub(p, a), u));
  if (
    Math.min(...spans) < END_ROOM * scale ||
    Math.max(...spans) > len - END_ROOM * scale
  )
    return { reason: "선분이 짧아 표시가 넘칩니다" };
  const style = markStyle(figure);
  let next = svg;
  for (const [p, q] of lines) {
    const added = addFigureObject(
      next,
      "line",
      { x: round3(p[0]), y: round3(p[1]) },
      { x: round3(q[0]), y: round3(q[1]) },
    );
    next = editFigureObject(added.svg, added.id, {
      stroke: style.color,
      "stroke-width": fmt(style.width),
      "stroke-linecap": "round",
      fill: "",
    });
  }
  return { svg: next };
}

// ── 치수 ────────────────────────────────────────────────────────────────
const DESCENDERS = /[gjpqy]/;
/** 엔진 `label_markup._TIMES_EM`(Times 실측, em) 가운데 치수 값에 나오는 글자 — 틈 폭을 엔진과 같게. */
const LOWER = [
  0.444, 0.5, 0.444, 0.5, 0.444, 0.333, 0.5, 0.5, 0.278, 0.278, 0.5, 0.278,
  0.778, 0.5, 0.5, 0.5, 0.5, 0.333, 0.389, 0.278, 0.5, 0.5, 0.722, 0.5, 0.5,
  0.444,
];
const UPPER = [
  0.722, 0.667, 0.667, 0.722, 0.611, 0.556, 0.722, 0.722, 0.333, 0.389, 0.722,
  0.611, 0.889, 0.722, 0.722, 0.556, 0.722, 0.667, 0.556, 0.611, 0.722, 0.722,
  0.944, 0.722, 0.722, 0.611,
];
const charEm = (ch: string) => {
  if (/\d/.test(ch)) return 0.5;
  if (/[a-z]/.test(ch)) return LOWER[ch.charCodeAt(0) - 97];
  if (/[A-Z]/.test(ch)) return UPPER[ch.charCodeAt(0) - 65];
  if (ch === " ") return 0.17;
  if (".,·".includes(ch)) return 0.25;
  if (":;/".includes(ch)) return 0.278;
  if ("()[]-′".includes(ch)) return 0.333;
  if ("+=<>±∓×÷−".includes(ch)) return 0.564;
  if (ch === "°") return 0.4;
  return ch.codePointAt(0)! > 0x2ff ? 1 : 0.5;
};
const labelWidthEm = (text: string) =>
  [...text].reduce((sum, ch) => sum + charEm(ch), 0);
/** 지면에 보이는 글 — `$…$`·명령어를 벗긴다(폭 어림용). */
const visibleText = (text: string) =>
  text
    .replace(/\$/g, "")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}^_]/g, "")
    .trim();

type Box = [number, number, number, number];
function segmentHitsBox(p: Point, q: Point, [x1, y1, x2, y2]: Box) {
  // Liang–Barsky
  let t0 = 0,
    t1 = 1;
  const dx = q[0] - p[0],
    dy = q[1] - p[1];
  for (const [pk, qk] of [
    [-dx, p[0] - x1],
    [dx, x2 - p[0]],
    [-dy, p[1] - y1],
    [dy, y2 - p[1]],
  ]) {
    if (pk === 0) {
      if (qk < 0) return false;
      continue;
    }
    const r = qk / pk;
    if (pk < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return true;
}

/** 볼록 껍질(단조 사슬). */
function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  if (sorted.length < 3) return sorted;
  const half = (list: Point[]) => {
    const chain: Point[] = [];
    for (const p of list) {
      while (
        chain.length >= 2 &&
        cross(
          sub(chain[chain.length - 1], chain[chain.length - 2]),
          sub(p, chain[chain.length - 2]),
        ) <= 0
      )
        chain.pop();
      chain.push(p);
    }
    chain.pop();
    return chain;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}
/** 껍질 경계에서 잰 부호 있는 거리 — 안이 양수(엔진 `_hull_depth`). */
function hullDepth(hull: Point[], p: Point) {
  if (hull.length < 3) return -Infinity;
  let best = Infinity,
    flipped = Infinity;
  hull.forEach((a, i) => {
    const b = hull[(i + 1) % hull.length];
    const e = sub(b, a);
    const side = cross(sub(p, a), e) / (Math.hypot(e[0], e[1]) || 1);
    best = Math.min(best, side);
    flipped = Math.min(flipped, -side);
  });
  return Math.max(best, flipped);
}

/** 곡선이 설 쪽 — 법선 n(= a→b 를 왼쪽으로 돌린 것) 쪽이면 1. */
function dimensionSign(
  side: NonNullable<Extract<FigureMarkCommand, { op: "addDimension" }>["side"]>,
  a: Point,
  b: Point,
  n: Point,
  figure: Figure,
): 1 | -1 | { reason: string } {
  if (side === "above" || side === "below") {
    if (Math.abs(n[1]) < 0.2)
      return { reason: "세로 선분이라 위·아래를 정할 수 없습니다" };
    return n[1] < 0 === (side === "above") ? 1 : -1;
  }
  if (side === "left" || side === "right") {
    if (Math.abs(n[0]) < 0.2)
      return { reason: "가로 선분이라 왼쪽·오른쪽을 정할 수 없습니다" };
    return n[0] < 0 === (side === "left") ? 1 : -1;
  }
  // 도형 밖 — 엔진처럼 현 가운데에서 2 비킨 자리가 잉크 껍질 밖인 쪽. 둘 다 같으면 덜 깊은 쪽, 그래도 같으면 n 쪽
  const hull = convexHull(figure.hull);
  const mid = lerp(a, b, 0.5);
  const left = hullDepth(hull, at(mid, n, 2)),
    right = hullDepth(hull, at(mid, n, -2));
  const outside: 1 | -1 =
    left > 0 !== right > 0 ? (left > 0 ? -1 : 1) : left <= right ? 1 : -1;
  return side === "in" ? (-outside as 1 | -1) : outside;
}

/** 이미 이 두 점을 잇는 치수(점선 곡선) — 끝이 두 점에서 인셋만큼 안쪽이거나 그 점에 닿는다. */
function existingDimension(figure: Figure, a: Point, b: Point, reach: number) {
  return figure.objects.findIndex((o, index) => {
    if (o.type !== "path" || straightPathPieces(o.attrs.d ?? "")) return false;
    const dash = o.attrs["stroke-dasharray"] ?? "";
    if (!dash || dash === "none") return false;
    const pieces = sampleFigurePath(o.attrs.d ?? "", 4);
    if (!pieces) return false;
    const m = figure.matrices[index];
    const ends = pieces
      .flatMap((piece) => [piece[0], piece[piece.length - 1]])
      .map((p) => applyPoint(m, p));
    const near = (p: Point) => ends.some((q) => length(p, q) <= reach);
    return near(a) && near(b);
  });
}

function addDimension(
  svg: string,
  figure: Figure,
  a: Point,
  b: Point,
  value: string,
  side: NonNullable<Extract<FigureMarkCommand, { op: "addDimension" }>["side"]>,
  context: FigureMarkContext,
): { svg: string } | { reason: string } {
  const len = length(a, b);
  const u: Point = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const n: Point = [-u[1], u[0]];
  const k = figureScale(figure);
  const inset = DIMENSION_INSET * k;
  if (2 * inset >= len) return { reason: "두 점이 너무 가깝습니다" };
  const twin = existingDimension(
    figure,
    a,
    b,
    inset + Math.max(1.5, 0.02 * len),
  );
  if (twin >= 0)
    return {
      reason: `이미 치수가 있습니다(${describe(figure, twin, context)})`,
    };
  const sign = dimensionSign(side, a, b, n, figure);
  if (typeof sign === "object") return sign;
  const start = at(a, u, inset),
    end = at(b, u, -inset);
  const visible = len - 2 * inset;
  const shown = visibleText(value) || value;
  // 값 글자 크기 — 이름 글자 크기, 짧은 변이면 줄인다(엔진: 0.82 × 현 ÷ 글자 수, 바닥 10)
  const base = figure.font ?? DIMENSION_FONT * k;
  const units = Math.max(
    0.62,
    [...shown].reduce(
      (sum, ch) => sum + (ch.codePointAt(0)! > 0x2ff ? 1 : 0.61),
      0,
    ),
  );
  const fs = Math.min(
    base,
    Math.max(DIMENSION_MIN_FONT * k, (0.82 * visible) / units),
  );
  const offset = DIMENSION_OFFSET * k;
  const mid = lerp(a, b, 0.5);
  const normal: Point = [n[0] * sign, n[1] * sign];
  const control = at(mid, normal, 2 * offset);
  const apex = at(mid, normal, offset);
  const halo = DIMENSION_HALO * k;
  const pad = halo / 2 + 0.5;
  const width = Math.max(0.62, labelWidthEm(shown)) * fs;
  const ascent = 0.75 * fs,
    descent = DESCENDERS.test(shown) ? 0.22 * fs : 0;
  const boxAt = (center: Point): Box => {
    const baseline = center[1] + 0.32 * fs;
    return [
      center[0] - width / 2 - pad,
      baseline - ascent - pad,
      center[0] + width / 2 + pad,
      baseline + descent + pad,
    ];
  };
  const samples = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24,
      s = 1 - t;
    return [
      s * s * start[0] + 2 * s * t * control[0] + t * t * end[0],
      s * s * start[1] + 2 * s * t * control[1] + t * t * end[1],
    ] as Point;
  });
  const hits = (box: Box) =>
    samples.some((p, i) => i > 0 && segmentHitsBox(samples[i - 1], p, box));
  let center = apex;
  let box = boxAt(center);
  const projected =
    Math.abs(u[0]) * (box[2] - box[0]) + Math.abs(u[1]) * (box[3] - box[1]);
  if (projected > 0.72 * visible)
    // 짧은 변의 긴 값 — 틈을 낼 곡선이 모자라 곡선 너머 꼭대기 바로 밖에 세운다
    for (const factor of [0.75, 1, 1.3, 1.65, 2, 2.5, 3.1, 3.8, 4.6]) {
      center = at(apex, normal, factor * fs + halo / 2);
      box = boxAt(center);
      if (!hits(box)) break;
    }
  let d: string;
  const p = (point: Point) => `${fmt(point[0])} ${fmt(point[1])}`;
  if (!hits(box)) d = `M ${p(start)} Q ${p(control)} ${p(end)}`;
  else {
    const delta = Math.min(
      0.42,
      Math.max(
        0.04,
        (Math.abs(u[0]) * (box[2] - box[0]) +
          Math.abs(u[1]) * (box[3] - box[1])) /
          2 /
          visible +
          0.015,
      ),
    );
    const left = 0.5 - delta,
      right = 0.5 + delta;
    const left01 = lerp(start, control, left),
      leftGap = lerp(left01, lerp(control, end, left), left);
    const right12 = lerp(control, end, right),
      rightGap = lerp(lerp(start, control, right), right12, right);
    d = `M ${p(leftGap)} Q ${p(left01)} ${p(start)} M ${p(rightGap)} Q ${p(right12)} ${p(end)}`;
  }
  // 이웃 치수(점선 곡선)의 굵기·점선·색을 따른다 — 없으면 엔진 값
  const neighbour = figure.objects.find(
    (o) =>
      o.type === "path" &&
      !straightPathPieces(o.attrs.d ?? "") &&
      (o.attrs["stroke-dasharray"] ?? "none") !== "none",
  );
  const curve = addFigureObject(svg, "curve", { x: 0, y: 0 }, { x: 1, y: 1 });
  let next = editFigureObject(curve.svg, curve.id, {
    d,
    stroke: neighbour?.attrs.stroke || INK,
    "stroke-width": neighbour?.attrs["stroke-width"] || fmt(DIMENSION_WIDTH),
    "stroke-dasharray":
      neighbour?.attrs["stroke-dasharray"] ||
      DIMENSION_DASH.map((v) => fmt(v * k)).join(" "),
    "stroke-linecap": "round",
  });
  const label = addFigureObject(
    next,
    "text",
    { x: round3(center[0]), y: round3(center[1] + 0.32 * fs) },
    { x: 0, y: 0 },
    value,
  );
  next = editFigureObject(label.svg, label.id, {
    "font-size": fmt(fs),
    ...(figure.family ? { "font-family": figure.family } : {}),
    "text-anchor": "middle",
    "paint-order": "stroke fill",
    stroke: "#ffffff",
    "stroke-width": fmt(halo),
    "stroke-linejoin": "round",
  });
  // 값·곡선이 그림 틀 밖이면 틀을 넓힌다 — 뒤집기·회전·도형 명령과 같은 한 함수(figureFrame.ts), 여백은 뒤집기의 값 글자처럼
  const [bx1, by1, bx2, by2] = boxAt(center);
  return {
    svg: widenFrame(
      next,
      [...samples, [bx1 + pad, by1 + pad], [bx2 - pad, by2 - pad]],
      0.6 * fs,
    ),
  };
}
