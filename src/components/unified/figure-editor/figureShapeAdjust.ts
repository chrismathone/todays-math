/**
 * 노란 조절점(도형 변형) — 파워포인트처럼 노란 점을 끌면 도형 모양이 바뀐다(트랙 4).
 * 원장님 2026-09-19 «사각형 자체를 각을 기울여서 평행사변형 만들 수 있게» · «요런 노란 점 이동시키면 도형 변화하는 것» ·
 * «여기(위 도구 줄)에 삼각형도 추가해 주고».
 *
 * - 사각형·평행사변형: 점 넷 [A 왼쪽 위, B 오른쪽 위, C 오른쪽 아래, D 왼쪽 아래]. 밑변 D→C 가 기준.
 *   노란 점은 윗변 A–B 가운데 — 밑변 방향으로 끌면 윗변만 밀려 기운다(마주 보는 변 평행 유지, 제자리 근처면 직사각형으로 붙는다).
 *   모서리 조절점은 꼭짓점 — 맞은편 꼭짓점을 두고 두 변의 방향(기울기)을 지킨 채 길이만 바꾼다.
 * - 삼각형: 점 셋 [P 꼭짓점, R 밑변 오른쪽, L 밑변 왼쪽] = 상자(밑변 × 높이) 안의 삼각형. 끌어서 그리면 이등변.
 *   노란 점은 꼭짓점 — 윗변을 따라서만 움직여(높이 그대로) 이등변·직각·일반 삼각형. 밑변 한 길이만큼 상자 밖(둔각)도 된다.
 *   모서리 조절점은 상자 모서리 넷 — 꼭짓점이 윗변의 몇 할에 있는지를 지킨 채 크기만 바꾼다.
 * - 옛 `<rect>`(엔진 그림 포함)는 그대로 열리고 노란 점이 붙는다. 처음 기울일 때 `<polygon data-shape="parallelogram">` 으로 바뀐다.
 *
 * 모양을 더 넣으려면(사다리꼴 등) RULES 에 한 칸 — 이름·판정·조절점·끌기 — 을 더한다. 화면과 무관한 순수 계산이다.
 */
import type { Point } from "./figureFaceGeometry";

/** 노란 점으로 바꿀 수 있는 다각형의 표지 — 값은 모양 이름(parallelogram · triangle). */
export const SHAPE_ATTR = "data-shape";
export const ADJUST_KEY = "adjust";

export interface ShapeHandle {
  key: string;
  x: number;
  y: number;
  label: string;
  /** 노란 점(모양 조절) */
  adjust?: boolean;
}

export type AdjustKind = "rect" | "parallelogram" | "triangle";

export interface AdjustableShape {
  kind: AdjustKind;
  /** 요소 목록 이름 */
  name: string;
  points: Point[];
}

const add = (a: Point, b: Point) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Point, b: Point) => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Point, k: number) => ({ x: a.x * k, y: a.y * k });
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const length = (a: Point) => Math.hypot(a.x, a.y);
const copy = (p: Point) => ({ x: p.x, y: p.y });
const round = (value: number) => String(Math.round(value * 100) / 100);

/** points 칸 읽기 — 공백·쉼표 모두. */
export const parsePoints = (value = "") => {
  const values = (
    value.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) ?? []
  ).map(Number);
  return values.flatMap((x, i) =>
    i % 2 || i + 1 >= values.length ? [] : [{ x, y: values[i + 1] }],
  );
};
/** points 칸 쓰기 — 소수 둘째 자리(편집기의 다른 좌표와 같다). */
export const formatPoints = (points: readonly Point[]) =>
  points.flatMap((p) => [round(p.x), round(p.y)]).join(" ");

const cornerHandles = (points: readonly Point[]): ShapeHandle[] =>
  points.map((p, i) => ({
    key: `corner-${i}`,
    x: p.x,
    y: p.y,
    label: `모서리 ${i + 1}`,
  }));
const adjustHandle = (p: Point): ShapeHandle => ({
  key: ADJUST_KEY,
  x: p.x,
  y: p.y,
  label: "모양 조절",
  adjust: true,
});

// ── 평행사변형 ──────────────────────────────────────────────

export const parallelogramFromRect = (
  x: number,
  y: number,
  width: number,
  height: number,
): Point[] => [
  { x, y },
  { x: x + width, y },
  { x: x + width, y: y + height },
  { x, y: y + height },
];

/** 마주 보는 꼭짓점의 합이 같고(A+C = B+D) 납작하지 않다. 오차는 긴 변의 1%. */
export function isParallelogram(points: readonly Point[], tolerance = 0.01) {
  if (points.length !== 4) return false;
  const [a, b, c, d] = points;
  const size = Math.max(length(sub(b, a)), length(sub(d, a)), 1e-9);
  return (
    length(sub(add(a, c), add(b, d))) <= tolerance * size &&
    Math.abs(cross(sub(b, a), sub(d, a))) > 1e-9 * size * size
  );
}

/** 꼭짓점 넷(모서리) + 윗변 가운데 노란 점 */
export const parallelogramHandles = (points: readonly Point[]) => [
  ...cornerHandles(points),
  adjustHandle(scale(add(points[0], points[1]), 0.5)),
];

/** 노란 점을 to 로 — 윗변만 밑변 방향으로 민다. 기운 정도가 snap 안이면 직사각형으로 붙는다. */
export function skewParallelogram(
  points: readonly Point[],
  to: Point,
  snap = 0,
): Point[] {
  const [a, b, c, d] = points;
  const base = sub(c, d);
  const u = scale(base, 1 / length(base));
  const side = sub(a, d);
  const along = dot(side, u);
  const across = sub(side, scale(u, along));
  let skew = along + dot(sub(to, scale(add(a, b), 0.5)), u);
  if (Math.abs(skew) <= snap) skew = 0;
  const top = add(add(d, scale(u, skew)), across);
  return [top, add(top, base), copy(c), copy(d)];
}

/** 모서리 index 를 to 로 — 맞은편을 두고 두 변 방향을 지킨 채 길이만. 맞은편 너머로는 min 까지만(뒤집지 않는다). */
export function resizeParallelogram(
  points: readonly Point[],
  index: number,
  to: Point,
  min = 1,
): Point[] {
  const o = points[(index + 2) % 4];
  const first = (index + 1) % 4,
    second = (index + 3) % 4;
  const e1 = sub(points[first], o),
    e2 = sub(points[second], o);
  const f1 = scale(e1, 1 / length(e1)),
    f2 = scale(e2, 1 / length(e2));
  const det = cross(f1, f2);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return points.map(copy);
  const v = sub(to, o);
  const a = cross(v, f2) / det,
    b = cross(f1, v) / det;
  const next = points.map(copy);
  next[first] = add(o, scale(f1, Math.max(min, a)));
  next[second] = add(o, scale(f2, Math.max(min, b)));
  next[index] =
    a < min || b < min
      ? add(next[first], scale(f2, Math.max(min, b)))
      : copy(to);
  return next;
}

/** 옛 `<rect>` 의 속성 → 기울일 수 있는 `<polygon>` 의 속성. 서식·변환·묶음·번호는 그대로, 자리 칸만 바꾼다. */
export function rectToPolygonAttrs(
  attrs: Record<string, string>,
  points: readonly Point[],
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs))
    if (!["x", "y", "width", "height", "rx", "ry"].includes(key))
      next[key] = value;
  next.points = formatPoints(points);
  next[SHAPE_ATTR] = "parallelogram";
  return next;
}

// ── 삼각형 ──────────────────────────────────────────────────

/** 상자 안의 삼각형 — 밑변 왼쪽 끝 left, 밑변 방향 u, 꼭짓점 쪽 n(u 에 수직), 밑변 길이, 높이, 꼭짓점의 윗변 비율 t. */
export interface TriangleFrame {
  left: Point;
  u: Point;
  n: Point;
  width: number;
  height: number;
  t: number;
}

const frameAt = (f: TriangleFrame, along: number, up: number) => ({
  x: f.left.x + f.u.x * along + f.n.x * up,
  y: f.left.y + f.u.y * along + f.n.y * up,
});

/** 끌어서 그린 상자 → 이등변삼각형 [꼭짓점, 밑변 오른쪽, 밑변 왼쪽]. 거꾸로 끌어도 같다. */
export function triangleFromBox(from: Point, to: Point): Point[] {
  const x = Math.min(from.x, to.x),
    y = Math.min(from.y, to.y);
  const w = Math.max(1, Math.abs(to.x - from.x)),
    h = Math.max(1, Math.abs(to.y - from.y));
  return [
    { x: x + w / 2, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

/** 점 셋 → 상자 매개변수. 납작하면 null. */
export function triangleFrame(points: readonly Point[]): TriangleFrame | null {
  if (points.length !== 3) return null;
  const [apex, right, left] = points;
  const base = sub(right, left),
    width = length(base);
  if (width < 1e-9) return null;
  const u = scale(base, 1 / width);
  let n = { x: u.y, y: -u.x };
  let height = dot(sub(apex, left), n);
  if (height < 0) {
    n = scale(n, -1);
    height = -height;
  }
  if (height < 1e-9 * width) return null;
  return {
    left: copy(left),
    u,
    n,
    width,
    height,
    t: dot(sub(apex, left), u) / width,
  };
}

export const triangleFromFrame = (f: TriangleFrame): Point[] => [
  frameAt(f, f.t * f.width, f.height),
  frameAt(f, f.width, 0),
  frameAt(f, 0, 0),
];

/** 상자 모서리 [왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래] — 사각형 모서리와 같은 차례. */
const triangleBox = (f: TriangleFrame) => [
  frameAt(f, 0, f.height),
  frameAt(f, f.width, f.height),
  frameAt(f, f.width, 0),
  frameAt(f, 0, 0),
];

/** 상자 모서리 넷 + 꼭짓점의 노란 점 */
export function triangleHandles(points: readonly Point[]): ShapeHandle[] {
  const f = triangleFrame(points);
  return f ? [...cornerHandles(triangleBox(f)), adjustHandle(points[0])] : [];
}

/** 노란 점(꼭짓점)을 to 로 — 윗변을 따라서만. 이등변(0.5)·직각(0·1) 근처 snap 안이면 붙는다. 밑변 한 길이 밖까지. */
export function moveTriangleApex(
  points: readonly Point[],
  to: Point,
  snap = 0,
): Point[] {
  const f = triangleFrame(points);
  if (!f) return points.map(copy);
  let t = Math.min(2, Math.max(-1, dot(sub(to, f.left), f.u) / f.width));
  const nearest = [0.5, 0, 1].reduce((best, k) =>
    Math.abs(t - k) < Math.abs(t - best) ? k : best,
  );
  if (Math.abs(t - nearest) * f.width <= snap) t = nearest;
  return [frameAt(f, t * f.width, f.height), copy(points[1]), copy(points[2])];
}

/** 상자 모서리 index 를 to 로 — 맞은편 모서리를 두고, 꼭짓점 비율 t 는 그대로. 넘기면 사각형처럼 상자가 정리된다(꼭짓점은 늘 위). */
export function resizeTriangle(
  points: readonly Point[],
  index: number,
  to: Point,
  min = 1,
): Point[] {
  const f = triangleFrame(points);
  if (!f) return points.map(copy);
  const corners = [
    [0, f.height],
    [f.width, f.height],
    [f.width, 0],
    [0, 0],
  ];
  const [oppositeAlong, oppositeUp] = corners[(index + 2) % 4];
  const along = dot(sub(to, f.left), f.u),
    up = dot(sub(to, f.left), f.n);
  return triangleFromFrame({
    ...f,
    left: frameAt(f, Math.min(oppositeAlong, along), Math.min(oppositeUp, up)),
    width: Math.max(min, Math.abs(along - oppositeAlong)),
    height: Math.max(min, Math.abs(up - oppositeUp)),
  });
}

// ── 모양 표 ─────────────────────────────────────────────────

interface ShapeRule {
  name: string;
  accepts: (points: readonly Point[]) => boolean;
  handles: (points: readonly Point[]) => ShapeHandle[];
  /** 모서리 조절점 끌기 */
  resize: (
    points: readonly Point[],
    index: number,
    to: Point,
    min: number,
  ) => Point[];
  /** 노란 점 끌기 */
  adjust: (points: readonly Point[], to: Point, snap: number) => Point[];
}

const RULES: Record<AdjustKind, ShapeRule> = {
  rect: {
    name: "사각형",
    accepts: isParallelogram,
    handles: parallelogramHandles,
    resize: resizeParallelogram,
    adjust: skewParallelogram,
  },
  parallelogram: {
    name: "평행사변형",
    accepts: isParallelogram,
    handles: parallelogramHandles,
    resize: resizeParallelogram,
    adjust: skewParallelogram,
  },
  triangle: {
    name: "삼각형",
    accepts: (points) => triangleFrame(points) !== null,
    handles: triangleHandles,
    resize: resizeTriangle,
    adjust: moveTriangleApex,
  },
};

/**
 * 요소에서 노란 점을 달 모양을 읽는다. 둥근 사각형(모양이 바뀌면 둥근 모서리를 잃는다)·크기 0 사각형·표지 없는 다각형·
 * 점을 따로 고쳐 모양이 어긋난 다각형은 null(예전처럼 꼭짓점을 하나씩 끈다).
 */
export function adjustableShape(o: {
  type: string;
  attrs: Record<string, string>;
}): AdjustableShape | null {
  if (o.type === "rect") {
    const n = (key: string) => Number.parseFloat(o.attrs[key] ?? "") || 0;
    const width = n("width"),
      height = n("height");
    if (width <= 0 || height <= 0 || n("rx") > 0 || n("ry") > 0) return null;
    return {
      kind: "rect",
      name: RULES.rect.name,
      points: parallelogramFromRect(n("x"), n("y"), width, height),
    };
  }
  const kind = o.attrs[SHAPE_ATTR];
  if (o.type !== "polygon" || (kind !== "parallelogram" && kind !== "triangle"))
    return null;
  const points = parsePoints(o.attrs.points);
  return RULES[kind].accepts(points)
    ? { kind, name: RULES[kind].name, points }
    : null;
}

export const adjustHandles = (shape: AdjustableShape) =>
  RULES[shape.kind].handles(shape.points);

/**
 * 조절점을 끈 뒤의 점들. `<rect>` 의 노란 점은 평행사변형 점을 낸다(부르는 쪽이 rectToPolygonAttrs 로 바꾼다).
 * `<rect>` 의 모서리는 예전 사각형 끌기(moveFigureHandle)를 그대로 쓴다 — 여기로 보내도 같은 모양이지만 뒤집히지 않는다.
 */
export function moveAdjustHandle(
  shape: AdjustableShape,
  key: string,
  to: Point,
  options: { snap?: number; min?: number } = {},
): Point[] {
  const rule = RULES[shape.kind];
  if (key === ADJUST_KEY)
    return rule.adjust(shape.points, to, options.snap ?? 0);
  const corner = /^corner-([0-3])$/.exec(key);
  return corner
    ? rule.resize(shape.points, Number(corner[1]), to, options.min ?? 1)
    : shape.points.map(copy);
}
