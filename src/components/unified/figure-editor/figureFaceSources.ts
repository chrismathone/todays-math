/**
 * 편집기 요소 → 면 찾기의 경계, 그리고 채우기 통·묶음 안쪽 채우기·다각형 도구가 쓸 판단(트랙 4 «면 만들기»).
 * 원장님 2026-09-19 «면을 쉽게 만들 수 있어야 색칠을 할 수가 있음» · «그룹화했을 때 내부에 색을 넣을 수 있는».
 *
 * 요소는 `figureObjects()` 모양({id, type, attrs}) 그대로 받는다. 편집기는 요소를 옮길 때 `transform="translate(…)"` 를
 * 붙이고(FigureEditor move), 붙여넣은 요소는 translate 묶음 안에 든다(figureClipboard) — 그래서 경계는 조상·자기 변환을
 * 적용한 자리에서 잰다(조상 변환·물려받은 stroke 는 부르는 쪽이 DOM 에서 모아 넘긴다).
 * 선분·꺾은선·다각형·사각형은 정확히, 원·타원·곡선·호·함수 그래프는 촘촘히 표본을 떠 근사한다.
 *
 * 면 요소(원문에 남는 모양)
 *  - `<path d="M…Z M…Z" fill="#d9d9d9" stroke="none" fill-rule="evenodd" data-face="열쇠…" [data-face-seed="x y"]>`
 *  - data-face: 따라갈 경계 요소의 열쇠(id) 목록. 빈 값이면 따라가지 않는 면(다각형 도구).
 *  - data-face-seed: 채우기 통으로 만든 면 — 그 칸 안의 한 점. 없으면 묶음 안쪽 채우기(경계들이 두른 바깥 테두리).
 * 화면·DOM 과 무관한 순수 계산이다.
 */
import {
  arrangeFaceCurves,
  boundedFaces,
  closedOutlines,
  faceAt,
  interiorPoint,
  pointInRegion,
  ringArea,
  type FaceCurve,
  type FaceRegion,
  type Point,
} from "./figureFaceGeometry";

export const FACE_ATTR = "data-face";
export const FACE_SEED_ATTR = "data-face-seed";
/**
 * 기본 채움 — 옅은 회색. 흑백 인쇄에서 약 15% 망점으로 보이고, 엔진 영역 채색 하한(휘도 0.78 —
 * vendor/figure-engine/core/figure_scene.py REGION_MIN_LUMINANCE)보다 밝아 위에 그린 선·글자가 또렷하다(0.851).
 */
export const DEFAULT_FACE_FILL = "#d9d9d9";
/** 열린 끝점을 붙일 거리(문서 단위) — 편집기는 확대율로 화면 몇 px 에 맞춰 넘긴다. */
export const FACE_TOLERANCE = 2;
/** 곡선을 펼 걸음(문서 단위) — 반지름 100 원이면 180점 남짓, 시위 오차 0.02 미만(선 굵기 1.8 이 덮는다). */
export const SAMPLE_STEP = 2;
export const FACE_REASONS = {
  open: "닫힌 영역이 아닙니다",
  empty: "선이 없습니다",
} as const;

/** SVG 행렬 [a b c d e f] — x' = a·x + c·y + e, y' = b·x + d·y + f */
export type Matrix = readonly [number, number, number, number, number, number];

export interface FaceSourceObject {
  id: string;
  type: string;
  attrs: Record<string, string>;
  /** 조상 <g> 들의 transform 을 합친 것 — 없으면 단위 행렬 */
  parentMatrix?: Matrix;
  /** 조상에게서 물려받는 stroke — 자기 칸이 없을 때만 쓴다 */
  inheritedStroke?: string;
}

interface Piece {
  points: Point[];
  closed: boolean;
  /** 달라붙기 후보 — 명령의 끝점·꼭짓점(곡선 표본은 아니다) */
  vertices: Point[];
  /** points 중 진짜 꼭짓점의 차례 — 없으면 모든 점(선분·꺾은선·다각형·사각형) */
  corners?: number[];
}

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const NUMBERS = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi;
const NUMBER = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/y;
const SHAPES = new Set([
  "line",
  "polyline",
  "polygon",
  "rect",
  "circle",
  "ellipse",
  "path",
]);

const numbers = (value = "") => (value.match(NUMBERS) ?? []).map(Number);
const pairs = (values: number[]) =>
  values.flatMap((x, i) =>
    i % 2 || i + 1 >= values.length ? [] : [{ x, y: values[i + 1] }],
  );
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const round = (value: number) => String(Math.round(value * 100) / 100);

export const multiplyMatrix = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
export const applyMatrix = (m: Matrix, p: Point): Point => ({
  x: m[0] * p.x + m[2] * p.y + m[4],
  y: m[1] * p.x + m[3] * p.y + m[5],
});
/** 역행렬 — 납작한(행렬식 0) 변환이면 null. */
export function invertMatrix(m: Matrix): Matrix | null {
  const det = m[0] * m[3] - m[1] * m[2];
  if (!det || !Number.isFinite(det)) return null;
  return [
    m[3] / det,
    -m[1] / det,
    -m[2] / det,
    m[0] / det,
    (m[2] * m[5] - m[3] * m[4]) / det,
    (m[1] * m[4] - m[0] * m[5]) / det,
  ];
}

/** transform 값 → 행렬. 적힌 차례대로 곱한다(뒤의 것이 먼저 적용된다). 모르는 함수는 건너뛴다. */
export function parseTransform(value?: string | null): Matrix {
  let matrix = IDENTITY;
  for (const [, name, args] of (value ?? "").matchAll(
    /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/gi,
  )) {
    const v = numbers(args);
    const radians = ((v[0] ?? 0) * Math.PI) / 180;
    let step: Matrix | null = null;
    switch (name.toLowerCase()) {
      case "matrix":
        if (v.length >= 6) step = [v[0], v[1], v[2], v[3], v[4], v[5]];
        break;
      case "translate":
        step = [1, 0, 0, 1, v[0] ?? 0, v[1] ?? 0];
        break;
      case "scale":
        step = [v[0] ?? 1, 0, 0, v[1] ?? v[0] ?? 1, 0, 0];
        break;
      case "rotate": {
        const c = Math.cos(radians),
          s = Math.sin(radians),
          cx = v[1] ?? 0,
          cy = v[2] ?? 0;
        step = [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy];
        break;
      }
      case "skewx":
        step = [1, 0, Math.tan(radians), 1, 0, 0];
        break;
      case "skewy":
        step = [1, Math.tan(radians), 0, 1, 0, 0];
        break;
    }
    if (step) matrix = multiplyMatrix(matrix, step);
  }
  return matrix;
}

/** style 이 속성을 이긴다(CSS 와 같다). */
function styleValue(attrs: Record<string, string>, name: string) {
  for (const part of (attrs.style ?? "").split(";")) {
    const colon = part.indexOf(":");
    if (colon > 0 && part.slice(0, colon).trim().toLowerCase() === name)
      return part.slice(colon + 1).trim();
  }
  return attrs[name];
}
const zero = (value?: string) =>
  value !== undefined && Number.parseFloat(value) <= 0;
const paints = (value?: string) => {
  const v = value?.trim().toLowerCase();
  return !!v && v !== "none" && v !== "transparent";
};
const hidden = (o: FaceSourceObject) =>
  styleValue(o.attrs, "display")?.trim() === "none" ||
  ["hidden", "collapse"].includes(
    styleValue(o.attrs, "visibility")?.trim() ?? "",
  ) ||
  zero(styleValue(o.attrs, "opacity"));

/** 면 요소인가 — 면은 경계가 아니다(색만 칠한다). */
export const isFaceObject = (o: FaceSourceObject) =>
  o.attrs[FACE_ATTR] !== undefined;

/** 면이 따라가는 경계 요소의 열쇠들 */
export const faceKeys = (o: FaceSourceObject) =>
  (o.attrs[FACE_ATTR] ?? "").split(/\s+/).filter(Boolean);

/** 경계인가 — 보이는 선을 긋는 도형만. 글자(외곽 흰 테 포함)·면·선 없는 채움·숨긴 것은 아니다. */
export function drawsBoundary(o: FaceSourceObject) {
  if (!SHAPES.has(o.type) || isFaceObject(o) || hidden(o)) return false;
  return (
    paints(styleValue(o.attrs, "stroke") ?? o.inheritedStroke) &&
    !zero(styleValue(o.attrs, "stroke-width")) &&
    !zero(styleValue(o.attrs, "stroke-opacity"))
  );
}

const sampleCount = (length: number, step: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.ceil(length / step)));

function cubic(p0: Point, p1: Point, p2: Point, p3: Point, step: number) {
  const n = sampleCount(
    distance(p0, p1) + distance(p1, p2) + distance(p2, p3),
    step,
    4,
    64,
  );
  return Array.from({ length: n - 1 }, (_, k) => {
    const t = (k + 1) / n,
      s = 1 - t;
    return {
      x:
        s * s * s * p0.x +
        3 * s * s * t * p1.x +
        3 * s * t * t * p2.x +
        t * t * t * p3.x,
      y:
        s * s * s * p0.y +
        3 * s * s * t * p1.y +
        3 * s * t * t * p2.y +
        t * t * t * p3.y,
    };
  });
}

function quadratic(p0: Point, p1: Point, p2: Point, step: number) {
  const n = sampleCount(distance(p0, p1) + distance(p1, p2), step, 4, 64);
  return Array.from({ length: n - 1 }, (_, k) => {
    const t = (k + 1) / n,
      s = 1 - t;
    return {
      x: s * s * p0.x + 2 * s * t * p1.x + t * t * p2.x,
      y: s * s * p0.y + 2 * s * t * p1.y + t * t * p2.y,
    };
  });
}

/** 호의 끝점 표기 → 중심 표기(SVG 1.1 부록 F.6.5) 로 바꿔 사이 표본을 낸다(끝점은 빼고). */
function arc(
  p0: Point,
  rxValue: number,
  ryValue: number,
  rotation: number,
  large: boolean,
  sweep: boolean,
  p1: Point,
  step: number,
): Point[] {
  let rx = Math.abs(rxValue),
    ry = Math.abs(ryValue);
  if (!rx || !ry || distance(p0, p1) === 0) return [];
  const phi = (rotation * Math.PI) / 180,
    cos = Math.cos(phi),
    sin = Math.sin(phi);
  const dx = (p0.x - p1.x) / 2,
    dy = (p0.y - p1.y) / 2;
  const x1 = cos * dx + sin * dy,
    y1 = -sin * dx + cos * dy;
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const numerator = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const denominator = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const coefficient =
    (large === sweep ? -1 : 1) *
    Math.sqrt(Math.max(0, numerator / denominator));
  const cx1 = (coefficient * rx * y1) / ry,
    cy1 = (-coefficient * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (p0.x + p1.x) / 2,
    cy = sin * cx1 + cos * cy1 + (p0.y + p1.y) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const start = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let delta = angle(
    (x1 - cx1) / rx,
    (y1 - cy1) / ry,
    (-x1 - cx1) / rx,
    (-y1 - cy1) / ry,
  );
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  else if (sweep && delta < 0) delta += 2 * Math.PI;
  const n = sampleCount(Math.abs(delta) * Math.max(rx, ry), step, 4, 128);
  return Array.from({ length: n - 1 }, (_, k) => {
    const theta = start + (delta * (k + 1)) / n;
    const x = rx * Math.cos(theta),
      y = ry * Math.sin(theta);
    return { x: cx + cos * x - sin * y, y: cy + sin * x + cos * y };
  });
}

/** path d → 조각들(표본 점·닫힘·명령 끝점). 읽을 수 없는 명령이 있으면 null. */
function pathPieces(d: string, step: number): Piece[] | null {
  let i = 0;
  const skip = () => {
    while (i < d.length && /[\s,]/.test(d[i])) i++;
  };
  const number = () => {
    skip();
    NUMBER.lastIndex = i;
    const match = NUMBER.exec(d);
    if (!match) return null;
    i = NUMBER.lastIndex;
    return Number(match[0]);
  };
  // 호의 플래그는 붙여 쓸 수 있다 — «0 01100 200» 은 0 · 0 · 1 · 100 · 200.
  const flag = () => {
    skip();
    const c = d[i];
    if (c !== "0" && c !== "1") return null;
    i++;
    return c === "1";
  };
  const read = (count: number) => {
    const values: number[] = [];
    for (let k = 0; k < count; k++) {
      const value = number();
      if (value === null) return null;
      values.push(value);
    }
    return values;
  };
  const pieces: Piece[] = [];
  let piece: Piece | null = null,
    current: Point = { x: 0, y: 0 },
    start: Point = current,
    control: Point | null = null,
    previous = "",
    command = "";
  const to = (end: Point, samples: Point[] = []) => {
    if (!piece) {
      piece = {
        points: [current],
        closed: false,
        vertices: [current],
        corners: [0],
      };
      pieces.push(piece);
    }
    piece.points.push(...samples, end);
    piece.vertices.push(end);
    piece.corners!.push(piece.points.length - 1);
    current = end;
  };
  const reflect = (c: Point) => ({
    x: 2 * current.x - c.x,
    y: 2 * current.y - c.y,
  });
  for (;;) {
    skip();
    if (i >= d.length) break;
    if (/[a-z]/i.test(d[i])) {
      command = d[i++];
      if (!/^[mlhvcsqtaz]$/i.test(command)) return null;
    } else if (!command || /z/i.test(command)) return null;
    const upper = command.toUpperCase(),
      relative = command !== upper;
    const at = (x: number, y: number): Point =>
      relative ? { x: current.x + x, y: current.y + y } : { x, y };
    if (upper === "Z") {
      const closing = piece as Piece | null;
      if (closing) {
        const last = closing.points.at(-1)!;
        if (
          closing.points.length > 1 &&
          distance(last, closing.points[0]) < 1e-9
        ) {
          closing.points.pop();
          closing.corners = closing.corners?.filter(
            (i) => i < closing.points.length,
          );
        }
        closing.closed = true;
      }
      piece = null;
      current = start;
      control = null;
      previous = "Z";
      continue;
    }
    if (upper === "M") {
      const v = read(2);
      if (!v) return null;
      current = at(v[0], v[1]);
      start = current;
      piece = {
        points: [current],
        closed: false,
        vertices: [current],
        corners: [0],
      };
      pieces.push(piece);
      command = relative ? "l" : "L";
      control = null;
      previous = "M";
      continue;
    }
    if (upper === "L" || upper === "H" || upper === "V") {
      const v = read(upper === "L" ? 2 : 1);
      if (!v) return null;
      to(
        upper === "L"
          ? at(v[0], v[1])
          : upper === "H"
            ? { x: relative ? current.x + v[0] : v[0], y: current.y }
            : { x: current.x, y: relative ? current.y + v[0] : v[0] },
      );
      control = null;
    } else if (upper === "C" || upper === "S") {
      const v = read(upper === "C" ? 6 : 4);
      if (!v) return null;
      const rest = upper === "C" ? v.slice(2) : v;
      const c1: Point =
        upper === "C"
          ? at(v[0], v[1])
          : control && /[CS]/.test(previous)
            ? reflect(control)
            : current;
      const c2 = at(rest[0], rest[1]),
        end = at(rest[2], rest[3]);
      to(end, cubic(current, c1, c2, end, step));
      control = c2;
    } else if (upper === "Q" || upper === "T") {
      const v = read(upper === "Q" ? 4 : 2);
      if (!v) return null;
      const q: Point =
        upper === "Q"
          ? at(v[0], v[1])
          : control && /[QT]/.test(previous)
            ? reflect(control)
            : current;
      const end = upper === "Q" ? at(v[2], v[3]) : at(v[0], v[1]);
      to(end, quadratic(current, q, end, step));
      control = q;
    } else {
      const radii = read(3);
      if (!radii) return null;
      const large = flag();
      if (large === null) return null;
      const sweep = flag();
      if (sweep === null) return null;
      const v = read(2);
      if (!v) return null;
      const end = at(v[0], v[1]);
      to(
        end,
        arc(current, radii[0], radii[1], radii[2], large, sweep, end, step),
      );
      control = null;
    }
    previous = upper;
  }
  return pieces.filter((p) => p.points.length >= 2);
}

function ellipsePoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  step: number,
) {
  const n = sampleCount(2 * Math.PI * Math.max(rx, ry), step, 24, 256);
  return Array.from({ length: n }, (_, k) => {
    const theta = (2 * Math.PI * k) / n;
    return { x: cx + rx * Math.cos(theta), y: cy + ry * Math.sin(theta) };
  });
}

/** 요소의 제 좌표계에서 조각들 */
function localPieces(o: FaceSourceObject, step: number): Piece[] {
  const n = (key: string) => Number.parseFloat(o.attrs[key] ?? "") || 0;
  if (o.type === "line") {
    const a = { x: n("x1"), y: n("y1") },
      b = { x: n("x2"), y: n("y2") };
    return [{ points: [a, b], closed: false, vertices: [a, b] }];
  }
  if (o.type === "polyline" || o.type === "polygon") {
    const points = pairs(numbers(o.attrs.points));
    return points.length < 2
      ? []
      : [{ points, closed: o.type === "polygon", vertices: points }];
  }
  if (o.type === "rect") {
    const x = n("x"),
      y = n("y"),
      w = n("width"),
      h = n("height");
    if (w <= 0 || h <= 0) return [];
    // 둥근 모서리: 한쪽만 적혔으면 다른 쪽도 같다. 변의 반을 넘지 않는다(SVG 규칙).
    const rxGiven = o.attrs.rx !== undefined ? n("rx") : undefined,
      ryGiven = o.attrs.ry !== undefined ? n("ry") : undefined;
    const rx = Math.min(w / 2, Math.max(0, rxGiven ?? ryGiven ?? 0)),
      ry = Math.min(h / 2, Math.max(0, ryGiven ?? rxGiven ?? 0));
    if (rx > 0 && ry > 0) {
      const corner = `A ${rx} ${ry} 0 0 1`;
      const [rounded] =
        pathPieces(
          `M ${x + rx} ${y} H ${x + w - rx} ${corner} ${x + w} ${y + ry} V ${y + h - ry} ` +
            `${corner} ${x + w - rx} ${y + h} H ${x + rx} ${corner} ${x} ${y + h - ry} ` +
            `V ${y + ry} ${corner} ${x + rx} ${y} Z`,
          step,
        ) ?? [];
      return rounded ? [{ ...rounded, vertices: [], corners: [] }] : [];
    }
    const corners = [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ];
    return [{ points: corners, closed: true, vertices: corners }];
  }
  if (o.type === "circle" || o.type === "ellipse") {
    const rx = n(o.type === "circle" ? "r" : "rx"),
      ry = n(o.type === "circle" ? "r" : "ry");
    if (rx <= 0 || ry <= 0) return [];
    return [
      {
        points: ellipsePoints(n("cx"), n("cy"), rx, ry, step),
        closed: true,
        vertices: [],
        corners: [],
      },
    ];
  }
  if (o.type === "path") return pathPieces(o.attrs.d ?? "", step) ?? [];
  return [];
}

const objectMatrix = (o: FaceSourceObject) =>
  multiplyMatrix(o.parentMatrix ?? IDENTITY, parseTransform(o.attrs.transform));

/** 요소 하나 → 경계 꺾은선들(문서 좌표). 표본 걸음은 요소의 확대에 맞춰 줄인다. */
export function objectCurves(
  o: FaceSourceObject,
  step = SAMPLE_STEP,
): FaceCurve[] {
  const matrix = objectMatrix(o);
  const scale =
    Math.sqrt(Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2])) || 1;
  return localPieces(o, step / scale).map((piece) => ({
    id: o.id,
    closed: piece.closed,
    points: piece.points.map((p) => applyMatrix(matrix, p)),
    ...(piece.corners ? { corners: piece.corners } : {}),
  }));
}

/**
 * 표시로 볼 굵기 — 선 굵기의 가운데 값(길이로 가중)의 85% 미만. 엔진은 표시를 도형 선보다 가늘게 긋는다
 * (figure_scene.py mark_width 0.72 · segment_width 1.9 = 38%, 서식 틀 1.0 · 1.25~1.35 = 74~80%). 편집기 선 1.8 은
 * 엔진 선 1.9 의 95% 라 경계로 남는다.
 */
const MARK_WIDTH_RATIO = 0.85;
/** 표시로 볼 크기 — 경계 전체 크기의 12% 이하(직각 표시 한 변 12 · 각의 호 반지름 15~25, 그림 300~500). */
const MARK_SIZE_RATIO = 0.12;

/**
 * 경계가 되는 요소와 그 꺾은선 — 보이는 선을 긋는 도형 중 표시(직각 표시·각의 호)를 뺀다.
 * 표시는 가늘고(MARK_WIDTH_RATIO) 작은(MARK_SIZE_RATIO) 열린 선이다. 표시를 경계로 치면 채운 삼각형의 직각 칸·호 안쪽이
 * 흰 구멍으로 남는다. 가늘어도 긴 선(사용자가 가늘게 그은 보조선)·도형 선만큼 굵은 작은 선·닫힌 도형은 경계로 남는다.
 */
function boundaryCurves(
  objects: readonly FaceSourceObject[],
  step = SAMPLE_STEP,
) {
  const candidates = objects.filter(drawsBoundary).map((o) => {
    const matrix = objectMatrix(o);
    const curves = objectCurves(o, step);
    const box = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };
    let length = 0;
    for (const curve of curves)
      curve.points.forEach((p, i) => {
        const q = curve.points[i + 1] ?? (curve.closed ? curve.points[0] : p);
        length += distance(p, q);
        box.minX = Math.min(box.minX, p.x);
        box.minY = Math.min(box.minY, p.y);
        box.maxX = Math.max(box.maxX, p.x);
        box.maxY = Math.max(box.maxY, p.y);
      });
    return {
      o,
      curves,
      length,
      box,
      open: curves.every((curve) => !curve.closed),
      width:
        (Number.parseFloat(styleValue(o.attrs, "stroke-width") ?? "") || 1) *
        Math.sqrt(Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2])),
    };
  });
  const total = candidates.reduce((sum, c) => sum + c.length, 0);
  let reference = 0,
    walked = 0;
  for (const c of [...candidates].sort((a, b) => a.width - b.width)) {
    walked += c.length;
    reference = c.width;
    if (walked >= total / 2) break;
  }
  const all = candidates.filter((c) => c.curves.length);
  const extent = Math.max(
    Math.max(...all.map((c) => c.box.maxX)) -
      Math.min(...all.map((c) => c.box.minX)),
    Math.max(...all.map((c) => c.box.maxY)) -
      Math.min(...all.map((c) => c.box.minY)),
  );
  return candidates.filter(
    (c) =>
      !(
        c.open &&
        c.width < MARK_WIDTH_RATIO * reference &&
        Math.hypot(c.box.maxX - c.box.minX, c.box.maxY - c.box.minY) <=
          MARK_SIZE_RATIO * extent
      ),
  );
}

/** 경계가 되는 요소들(표시 제외) */
export const boundaryObjects = (objects: readonly FaceSourceObject[]) =>
  boundaryCurves(objects).map((c) => c.o);

/** 경계가 되는 요소들만 펴서 모은다(표시 제외). */
export const faceCurves = (
  objects: readonly FaceSourceObject[],
  step = SAMPLE_STEP,
) => boundaryCurves(objects, step).flatMap((c) => c.curves);

/** 누른 점을 둘러싼 가장 작은 닫힌 영역(요소들에서). */
export const findFaceAt = (
  objects: readonly FaceSourceObject[],
  p: Point,
  tolerance = FACE_TOLERANCE,
) => faceAt(arrangeFaceCurves(faceCurves(objects), tolerance), p);

/** 면 요소의 고리들(문서 좌표) — 홀짝 규칙으로 안팎을 가른다. */
function faceRings(o: FaceSourceObject) {
  const matrix = objectMatrix(o);
  return localPieces(o, SAMPLE_STEP)
    .filter((piece) => piece.points.length >= 3)
    .map((piece) => piece.points.map((p) => applyMatrix(matrix, p)));
}

/** 고리들의 홀짝 넓이 — 다른 고리 속에 홀수 번 들면 구멍이다. */
function ringsArea(rings: Point[][]) {
  return rings.reduce((sum, ring, i) => {
    const depth = rings.filter(
      (other, j) => j !== i && pointInRegion(ring[0], other),
    ).length;
    return sum + (depth % 2 ? -1 : 1) * Math.abs(ringArea(ring));
  }, 0);
}

/** 같은 칸인가 — 넓이가 2% 안이고 칸 안쪽 점이 면 안에 든다. */
function sameRegion(rings: Point[][], region: FaceRegion) {
  const area = ringsArea(rings);
  return (
    Math.abs(area - region.area) <= 0.02 * Math.max(area, region.area) &&
    pointInRegion(
      interiorPoint(region.outer, region.holes),
      rings[0],
      rings.slice(1),
    )
  );
}

export type BucketAction =
  | { kind: "create"; region: FaceRegion }
  | { kind: "recolor"; id: string }
  | { kind: "none"; reason: string };

/**
 * 채우기 통 — 누른 곳에서 할 일.
 * - 선이 두른 칸이 있고, 그 칸과 같은 면이 이미 있으면 그 면의 색을 바꾼다(겹치면 위의 것).
 * - 칸은 있는데 같은 면이 없으면 새 면(큰 면 △ABC 안의 작은 칸 △ABD 를 누르면 큰 면을 바꾸지 않고 새로 만든다).
 * - 선이 두른 칸이 없는데 면(다각형 도구로 만든 것 등) 안이면 그 면의 색을 바꾼다.
 * - 아무것도 없으면 만들지 않고 이유를 준다.
 */
export function bucketAction(
  objects: readonly FaceSourceObject[],
  p: Point,
  tolerance = FACE_TOLERANCE,
): BucketAction {
  const region = findFaceAt(objects, p, tolerance);
  const faces = objects
    .filter((o) => isFaceObject(o) && !hidden(o))
    .map((o) => ({ id: o.id, rings: faceRings(o) }))
    .filter(
      (face) =>
        face.rings.length > 0 &&
        pointInRegion(p, face.rings[0], face.rings.slice(1)),
    )
    .reverse();
  if (region) {
    const same = faces.find((face) => sameRegion(face.rings, region));
    return same ? { kind: "recolor", id: same.id } : { kind: "create", region };
  }
  return faces.length
    ? { kind: "recolor", id: faces[0].id }
    : { kind: "none", reason: FACE_REASONS.open };
}

/** 묶음 안쪽 채우기 — 묶음의 선들이 닫힌 영역을 이루면 그 바깥 테두리들, 아니면 짧은 이유. */
export function closedGroupFill(
  members: readonly FaceSourceObject[],
  tolerance = FACE_TOLERANCE,
): { ok: true; regions: FaceRegion[] } | { ok: false; reason: string } {
  const curves = faceCurves(members);
  if (!curves.length) return { ok: false, reason: FACE_REASONS.empty };
  const regions = closedOutlines(arrangeFaceCurves(curves, tolerance));
  return regions.length
    ? { ok: true, regions }
    : { ok: false, reason: FACE_REASONS.open };
}

/** 면 경로 — 고리마다 M…Z, 소수 둘째 자리(편집기의 다른 좌표와 같다). */
export function facePathData(regions: readonly FaceRegion[]) {
  return regions
    .flatMap((region) => [region.outer, ...region.holes])
    .map(
      (ring) =>
        `M ${ring.map((p) => `${round(p.x)} ${round(p.y)}`).join(" L ")} Z`,
    )
    .join(" ");
}

/** 새 면 요소의 속성들 — 선 없는 채움, 홀짝 규칙, 경계 열쇠, 씨앗(채우기 통일 때만). */
export function faceAttrs(
  regions: readonly FaceRegion[],
  options: { fill?: string; edges?: readonly string[]; seed?: Point } = {},
): Record<string, string> {
  return {
    d: facePathData(regions),
    fill: options.fill ?? DEFAULT_FACE_FILL,
    stroke: "none",
    "fill-rule": "evenodd",
    [FACE_ATTR]: (options.edges ?? []).join(" "),
    ...(options.seed
      ? {
          [FACE_SEED_ATTR]: `${round(options.seed.x)} ${round(options.seed.y)}`,
        }
      : {}),
  };
}

const jaccard = (a: readonly string[], b: ReadonlySet<string>) => {
  const union = new Set([...a, ...b]);
  return union.size ? a.filter((id) => b.has(id)).length / union.size : 0;
};

/**
 * 면이 선을 따라간다 — 경계 요소(members)가 바뀐 뒤 면의 새 경로. 고리가 끊겨 다시 잡을 수 없으면 null
 * (부르는 쪽이 이전 면을 그대로 둔다).
 * - 씨앗이 없으면(묶음 안쪽 채우기) members 가 두른 바깥 테두리.
 * - 씨앗이 있으면(채우기 통) members 가 가른 칸 중 씨앗을 품은 칸. 선을 통째로 옮겨 씨앗이 밖이 되면
 *   경계 요소가 가장 많이 겹치는 칸(같으면 씨앗에 가까운 칸)을 고르고 씨앗을 그 칸 안으로 옮긴다.
 */
export function recomputeFace(
  face: FaceSourceObject,
  members: readonly FaceSourceObject[],
  tolerance = FACE_TOLERANCE,
): { d: string; seed?: string } | null {
  // 면의 경로·씨앗은 면이 든 좌표계(조상 변환 — 붙여넣은 묶음 안)로 적는다. 계산은 문서 좌표에서.
  const frame = face.parentMatrix;
  const back = frame ? invertMatrix(frame) : null;
  if (frame && !back) return null;
  const local = (p: Point) => (back ? applyMatrix(back, p) : p);
  const pathOf = (regions: FaceRegion[]) =>
    facePathData(
      regions.map((region) => ({
        ...region,
        outer: region.outer.map(local),
        holes: region.holes.map((hole) => hole.map(local)),
      })),
    );
  const arrangement = arrangeFaceCurves(faceCurves(members), tolerance);
  const seedText = face.attrs[FACE_SEED_ATTR];
  if (seedText === undefined) {
    const regions = closedOutlines(arrangement);
    return regions.length ? { d: pathOf(regions) } : null;
  }
  const [sx = NaN, sy = NaN] = numbers(seedText);
  const { x, y } = frame
    ? applyMatrix(frame, { x: sx, y: sy })
    : { x: sx, y: sy };
  const seed = { x, y };
  const faces = boundedFaces(arrangement);
  if (!faces.length) return null;
  const around = faces.find((region) =>
    pointInRegion(seed, region.outer, region.holes),
  );
  const keys = new Set(faceKeys(face));
  const reach = (region: FaceRegion) => {
    const inside = interiorPoint(region.outer, region.holes);
    return Number.isFinite(x + y) ? distance(inside, seed) : 0;
  };
  const chosen =
    around ??
    [...faces].sort(
      (a, b) =>
        jaccard(b.sourceIds, keys) - jaccard(a.sourceIds, keys) ||
        reach(a) - reach(b),
    )[0];
  const next = around
    ? { x: sx, y: sy }
    : local(interiorPoint(chosen.outer, chosen.holes));
  return {
    d: pathOf([chosen]),
    seed: `${round(next.x)} ${round(next.y)}`,
  };
}

/**
 * 새 면을 넣을 자리 — 첫 잉크(선을 긋는 도형·글자) 바로 앞. 바탕·채움·앞서 만든 면 뒤, 모든 선·글자 앞이라
 * 면이 선·글자를 가리지 않는다. 잉크가 없으면 null(맨 끝에 넣는다).
 */
export function faceInsertBefore(objects: readonly FaceSourceObject[]) {
  return (
    objects.find(
      (o) =>
        !isFaceObject(o) &&
        !hidden(o) &&
        (o.type === "text" || drawsBoundary(o)),
    )?.id ?? null
  );
}

/**
 * 다각형 도구가 달라붙을 점 — 선의 끝점·다각형과 사각형의 꼭짓점·경로 명령의 끝점·선끼리의 교점.
 * 원·타원·곡선의 표본점은 아니다. 점이 64개를 넘는 꺾은선·경로(함수 그래프 등)는 양 끝만.
 */
export function snapCandidates(objects: readonly FaceSourceObject[]): Point[] {
  const points: Point[] = [];
  const boundary = new Set(boundaryObjects(objects));
  for (const o of objects) {
    const face = isFaceObject(o) && o.type === "polygon" && !hidden(o);
    if (!face && !boundary.has(o)) continue;
    const matrix = objectMatrix(o);
    for (const piece of localPieces(o, SAMPLE_STEP)) {
      const vertices =
        piece.vertices.length <= 64
          ? piece.vertices
          : piece.closed
            ? []
            : [piece.vertices[0], piece.vertices.at(-1)!];
      points.push(...vertices.map((p) => applyMatrix(matrix, p)));
    }
  }
  points.push(...arrangeFaceCurves(faceCurves(objects)).junctions);
  const unique: Point[] = [];
  for (const p of points)
    if (!unique.some((q) => distance(p, q) < 1e-6)) unique.push(p);
  return unique;
}

/** 허용 오차 안의 가장 가까운 후보(없으면 null). */
export function nearestSnap(
  p: Point,
  candidates: readonly Point[],
  tolerance: number,
): Point | null {
  let best: Point | null = null,
    bestDistance = tolerance;
  for (const q of candidates) {
    const d = distance(p, q);
    if (d <= bestDistance) {
      best = q;
      bestDistance = d;
    }
  }
  return best;
}

/** 다각형 도구 — 세 점 이상 찍은 뒤 첫 점 근처를 누르면 닫는다. */
export const polygonToolCloses = (
  points: readonly Point[],
  p: Point,
  tolerance: number,
) => points.length >= 3 && distance(points[0], p) <= tolerance;
