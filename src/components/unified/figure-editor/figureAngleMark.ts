import {
  applyPoint,
  round2,
  type Affine,
  type Point,
} from "./figureEditGeometry";
import { sampleFigurePath } from "./figureFlip";

/**
 * 각 표시 더하기 — 원장님 2026-09-19 «각 ACB에 각 표시» 가 422 였다(더할 명령이 없었다).
 * 도형 엔진 v2 가 그리는 각 표시와 **같은 요소 모양**을 만든다 — 편집기가 이미 읽는 모양(figureObjectGroups.ts
 * `arcAngleMark`·`rightAngleMark`)이라 요소 목록·오른쪽 칸·«각» 묶음·직각/예각/둔각 이름이 손으로 그린 것과 같다.
 * - 호: `M 시작 A r r 0 0 방향 끝` — 꼭짓점에서 한 변 위 r 인 점에서 다른 변 위 r 인 점까지 **작은 쪽**
 *   (figure_svg.py `angle_arc`). 반지름 기본 22(`angle_radius`).
 * - 직각: `M a L b L c` ㄱ자 — 한 변 = 반지름 × 0.55, 짧은 변의 0.85 를 넘지 않는다(figure_scene.py
 *   `_angle_mark_polylines` · `_RIGHT_ANGLE_SCALE` · `_RIGHT_ANGLE_FIT`).
 * - 굵기 0.72(`mark_width`) · 색 #111111 · 채우기 없음.
 */
export const ANGLE_MARK_RADIUS = 22;
export const RIGHT_MARK_SCALE = 0.55;
const RIGHT_MARK_FIT = 0.85;
export const ANGLE_MARK_WIDTH = 0.72;
/** 편집기가 호를 «직각»으로 읽는 여유(figureObjectGroups.ts `RIGHT_SLACK`) — right 를 안 주면 이 안에서 ㄱ자. */
const RIGHT_SLACK = 1;
/** ㄱ자를 그려도 편집기가 직각으로 읽는 벌어짐(두 토막 cos ≤ 0.1 ≈ 84.3°~95.7°) 안쪽. */
const RIGHT_LIMIT = 5;

export type AngleMarkResult =
  { d: string; right: boolean; degrees: number } | { reason: string };

const unit = (from: Point, to: Point) => {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return {
    length,
    u: [(to[0] - from[0]) / length, (to[1] - from[1]) / length] as Point,
  };
};
const at2 = ([x, y]: Point) => `${round2(x)} ${round2(y)}`;

/**
 * 꼭짓점 at 에서 반직선 at→from · at→to 사이 작은 쪽 각의 표시(그림 좌표). right 가 없으면 그림의 각으로 정한다
 * (90° ± 1° 면 ㄱ자). radius 는 호 반지름 — 두 변 중 짧은 쪽의 절반을 넘지 않게 줄인다.
 */
export function angleMarkPath({
  at,
  from,
  to,
  right,
  radius = ANGLE_MARK_RADIUS,
}: {
  at: Point;
  from: Point;
  to: Point;
  right?: boolean;
  radius?: number;
}): AngleMarkResult {
  const first = unit(at, from),
    second = unit(at, to);
  if (!(first.length > 1e-6) || !(second.length > 1e-6))
    return { reason: "각의 두 변이 있어야 합니다" };
  const [u1, u2] = [first.u, second.u];
  const cos = Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]));
  const degrees = (Math.acos(cos) * 180) / Math.PI;
  if (degrees > 179)
    return { reason: "두 변이 한 직선이라 각 표시를 하지 않았습니다" };
  if (degrees < 1) return { reason: "두 변이 겹쳐 각 표시를 하지 않았습니다" };
  const square = right ?? Math.abs(degrees - 90) <= RIGHT_SLACK;
  const shorter = Math.min(first.length, second.length);
  if (square) {
    if (Math.abs(degrees - 90) > RIGHT_LIMIT)
      return {
        reason: `그림의 각이 ${Math.round(degrees)}°라 직각 표시를 하지 않았습니다`,
      };
    const side = Math.min(radius * RIGHT_MARK_SCALE, RIGHT_MARK_FIT * shorter);
    const a: Point = [at[0] + side * u1[0], at[1] + side * u1[1]];
    const b: Point = [
      at[0] + side * (u1[0] + u2[0]),
      at[1] + side * (u1[1] + u2[1]),
    ];
    const c: Point = [at[0] + side * u2[0], at[1] + side * u2[1]];
    return { d: `M ${at2(a)} L ${at2(b)} L ${at2(c)}`, right: true, degrees };
  }
  const r = Math.min(radius, 0.5 * shorter);
  const p0: Point = [at[0] + r * u1[0], at[1] + r * u1[1]];
  const p1: Point = [at[0] + r * u2[0], at[1] + r * u2[1]];
  // 그림 좌표는 y 가 아래 — u1 에서 u2 로 도는 외적이 양수면 화면 시계 방향 = SVG sweep 1
  const sweep = u1[0] * u2[1] - u1[1] * u2[0] > 0 ? 1 : 0;
  return {
    d: `M ${at2(p0)} A ${round2(r)} ${round2(r)} 0 0 ${sweep} ${at2(p1)}`,
    right: false,
    degrees,
  };
}

/** 이미 있는 각 표시의 꼭짓점·크기·가운데 방향(그림 좌표) — 이웃 크기를 따르고 같은 각에 두 번 달지 않으려고. */
export interface AngleMarkCorner {
  vertex: Point;
  /** 꼭짓점에서 표시 가운데를 향하는 단위 벡터. */
  bisector: Point;
  /** 호 반지름, ㄱ자면 한 변 ÷ 0.55(엔진이 그 반지름에서 ㄱ자를 만든다). */
  radius: number;
}

/** 편집기가 각 표시로 읽은 요소(호 path · ㄱ자 path/polyline)의 꼭짓점. 모양을 못 읽으면 null. */
export function angleMarkCorner(
  o: { type: string; attrs: Record<string, string> },
  matrix: Affine,
): AngleMarkCorner | null {
  const values = ((o.type === "path" ? o.attrs.d : o.attrs.points) ?? "").match(
    /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi,
  );
  const d = o.attrs.d ?? "";
  if (o.type === "path" && /^\s*M[^A-Za-z]*A[^A-Za-z]*$/.test(d)) {
    const [piece] = sampleFigurePath(d, 8) ?? [];
    if (!piece || !values || values.length !== 9) return null;
    const start = applyPoint(matrix, piece[0]),
      middle = applyPoint(matrix, piece[4]),
      end = applyPoint(matrix, piece[8]);
    // 원 위 세 점의 중심 — 호의 꼭짓점
    const ax = start[0],
      ay = start[1],
      bx = middle[0],
      by = middle[1],
      cx = end[0],
      cy = end[1];
    const det = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(det) < 1e-9) return null;
    const sq = (x: number, y: number) => x * x + y * y;
    const vertex: Point = [
      (sq(ax, ay) * (by - cy) +
        sq(bx, by) * (cy - ay) +
        sq(cx, cy) * (ay - by)) /
        det,
      (sq(ax, ay) * (cx - bx) +
        sq(bx, by) * (ax - cx) +
        sq(cx, cy) * (bx - ax)) /
        det,
    ];
    const radius = Math.hypot(middle[0] - vertex[0], middle[1] - vertex[1]);
    return {
      vertex,
      bisector: [
        (middle[0] - vertex[0]) / radius,
        (middle[1] - vertex[1]) / radius,
      ],
      radius,
    };
  }
  if (!values || values.length !== 6) return null;
  const [a, b, c] = [0, 2, 4].map((k) =>
    applyPoint(matrix, [Number(values[k]), Number(values[k + 1])]),
  );
  const vertex: Point = [a[0] + c[0] - b[0], a[1] + c[1] - b[1]];
  const reach = Math.hypot(b[0] - vertex[0], b[1] - vertex[1]);
  if (!reach) return null;
  return {
    vertex,
    bisector: [(b[0] - vertex[0]) / reach, (b[1] - vertex[1]) / reach],
    radius: Math.hypot(a[0] - vertex[0], a[1] - vertex[1]) / RIGHT_MARK_SCALE,
  };
}

/** 같은 꼭짓점 · 같은 쪽을 향하는 각 표시인가 — 가운데 방향이 20° 안. */
export function sameAngle(
  mark: AngleMarkCorner,
  at: Point,
  from: Point,
  to: Point,
) {
  if (
    Math.hypot(mark.vertex[0] - at[0], mark.vertex[1] - at[1]) >
    Math.max(2, 0.15 * mark.radius)
  )
    return false;
  const u1 = unit(at, from).u,
    u2 = unit(at, to).u;
  const bx = u1[0] + u2[0],
    by = u1[1] + u2[1],
    length = Math.hypot(bx, by);
  if (!length) return false;
  return (
    (bx * mark.bisector[0] + by * mark.bisector[1]) / length >
    Math.cos((20 * Math.PI) / 180)
  );
}
