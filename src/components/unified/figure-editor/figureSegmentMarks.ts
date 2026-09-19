import {
  applyPoint,
  parseTransform,
  type Affine,
  type Point,
} from "./figureEditGeometry";
import type { FigureSegmentMarkKind } from "./figureObjectNames";

/**
 * 선분 위 표시(같은 길이 눈금 ‖ · 평행 ») 판정 — 도형 엔진 v2 는 한 획마다 `<line>` 하나로 그리고
 * (figure_scene.py `_segment_mark_lines`) 둘을 잇는 표지가 없다. 그래서 모양과 자리로 가른다(각 표시 판정
 * figureObjectGroups.ts 처럼). AI «요청대로 고치기»가 같은 표시를 두 번 달지 않을 때(figureMarks.ts)와 요소 이름이
 * 이 한 규칙을 쓴다. 다른 편집기 모듈을 부르지 않는다 — 요소 이름·묶음 쪽에서 불러도 고리가 생기지 않게.
 */
export const SEGMENT_MARK_NAMES: Record<
  "tick" | "parallel",
  FigureSegmentMarkKind
> = {
  tick: "같은 길이 표시",
  parallel: "평행 표시",
};

type FigureObjectLike = {
  id: string;
  type: string;
  attrs: Record<string, string>;
};
/** 곧은 획 — 선분·다각형의 변·꺾은선 토막(그림 좌표). index 는 요소 차례. */
export interface Straight {
  index: number;
  a: Point;
  b: Point;
}
export interface StraightInk {
  /** 곧은 변 전부(짧은 획 포함). */
  edges: Straight[];
  /** 표시일 수 있는 짧은 획 — 선분 요소·두 점 경로. */
  strokes: Straight[];
}
/** 선분 위 표시 하나(겹 포함) — 앉은 변과 그 변 위 자리. */
export interface SegmentMark {
  kind: "tick" | "parallel";
  /** 요소 차례들. */
  indices: number[];
  edge: Straight;
  /** 변의 a 에서 표시 가운데까지. */
  center: number;
  /** 평행 표시의 촉 방향 — 변 a → b 쪽이면 1. */
  dir: 1 | -1;
  /** 눈금 한 줄의 길이 · » 한 획의 길이. */
  stroke: number;
}

const sub = (p: Point, q: Point): Point => [p[0] - q[0], p[1] - q[1]];
const dot = (p: Point, q: Point) => p[0] * q[0] + p[1] * q[1];
const cross = (u: Point, v: Point) => u[0] * v[1] - u[1] * v[0];
const length = (p: Point, q: Point) => Math.hypot(q[0] - p[0], q[1] - p[1]);
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
export const unitOf = (e: Straight): Point => {
  const l = length(e.a, e.b);
  return [(e.b[0] - e.a[0]) / l, (e.b[1] - e.a[1]) / l];
};

const NUMBER = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi;
const numbers = (value = "") => (value.match(NUMBER) ?? []).map(Number);
const pairs = (values: number[]): Point[] =>
  values.flatMap((x, i) =>
    i % 2 || i + 1 >= values.length ? [] : [[x, values[i + 1]] as Point],
  );
/** 곧은 경로(M·L·H·V·Z 만)의 조각들 — 곡선이 섞였으면 null. */
export function straightPathPieces(d: string): Point[][] | null {
  if (!/^[\sMmLlHhVvZz\d.,eE+-]*$/.test(d)) return null;
  const tokens =
    d.match(/[MmLlHhVvZz]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g) ?? [];
  const pieces: Point[][] = [];
  let piece: Point[] = [];
  let command = "";
  let x = 0,
    y = 0,
    sx = 0,
    sy = 0;
  for (let i = 0; i < tokens.length;) {
    if (/[A-Za-z]/.test(tokens[i])) {
      command = tokens[i++];
      if (/z/i.test(command)) {
        [x, y] = [sx, sy];
        piece.push([x, y]);
        continue;
      }
    }
    const take = () => Number(tokens[i++]);
    const relative = command === command.toLowerCase();
    const C = command.toUpperCase();
    if (C === "M" || C === "L") {
      const nx = take() + (relative ? x : 0),
        ny = take() + (relative ? y : 0);
      if (!Number.isFinite(nx) || !Number.isFinite(ny)) return null;
      [x, y] = [nx, ny];
      if (C === "M") {
        if (piece.length) pieces.push(piece);
        piece = [[x, y]];
        [sx, sy] = [x, y];
        // M 뒤에 이어진 좌표는 L
        command = relative ? "l" : "L";
      } else piece.push([x, y]);
    } else if (C === "H") {
      x = take() + (relative ? x : 0);
      piece.push([x, y]);
    } else if (C === "V") {
      y = take() + (relative ? y : 0);
      piece.push([x, y]);
    } else return null;
  }
  if (piece.length) pieces.push(piece);
  return pieces;
}

/** 요소들의 곧은 변과 짧은 획 — matrices 는 요소마다 그림 좌표로 가는 변환. */
export function straightInk(
  objects: readonly FigureObjectLike[],
  matrices: readonly Affine[],
  size: number,
): StraightInk {
  const markMax = Math.max(12, 0.05 * size);
  const edges: Straight[] = [];
  const strokes: Straight[] = [];
  objects.forEach((o, index) => {
    const m = matrices[index];
    const put = (points: Point[], closed: boolean) => {
      const list = points.map((p) => applyPoint(m, p));
      for (let i = 0; i + 1 < list.length + (closed ? 1 : 0); i++)
        edges.push({ index, a: list[i], b: list[(i + 1) % list.length] });
      return list;
    };
    const n = (key: string) => Number.parseFloat(o.attrs[key] ?? "") || 0;
    const short = (list: Point[]) => {
      if (list.length === 2 && length(list[0], list[1]) <= markMax)
        strokes.push({ index, a: list[0], b: list[1] });
    };
    if (o.type === "line")
      short(
        put(
          [
            [n("x1"), n("y1")],
            [n("x2"), n("y2")],
          ],
          false,
        ),
      );
    else if (o.type === "polyline" || o.type === "polygon")
      put(pairs(numbers(o.attrs.points)), o.type === "polygon");
    else if (o.type === "rect") {
      const [x, y, w, h] = [n("x"), n("y"), n("width"), n("height")];
      put(
        [
          [x, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
        ],
        true,
      );
    } else if (o.type === "path") {
      const pieces = straightPathPieces(o.attrs.d ?? "");
      const lists = pieces?.map((piece) => put(piece, false));
      if (lists?.length === 1) short(lists[0]);
    }
  });
  return { edges, strokes };
}

/**
 * 짧은 획을 선분 위 표시로 가른다.
 * - 눈금: 가운데가 (그보다 2.5배 넘게 긴) 변 위, 변과 거의 수직(75°~105°), 변을 가로지른다.
 * - » 한 획: 한 끝(촉)이 변 위, 다른 끝이 변에서 비켜 있고 변과 15°~53°. 촉을 같이 쓰고 변의 반대편으로 벌어진
 *   획과 짝이면 » 하나.
 * 한 변 위에 붙어 선 것끼리 겹으로 센다(엔진 눈금 사이 3 · » 사이 4). 좌표축 눈금처럼 한 변을 따라 여러 자리에
 * 흩어져 있으면(셋 이상) 표시가 아니다.
 */
export function recognizeSegmentMarks(ink: StraightInk): SegmentMark[] {
  type Tick = { s: Straight; e: Straight; along: number; score: number };
  type Arm = {
    s: Straight;
    e: Straight;
    tip: Point;
    tipAlong: number;
    backAlong: number;
    side: number;
    dir: 1 | -1;
    score: number;
  };
  const ticks: Tick[] = [];
  const arms: Arm[] = [];
  for (const s of ink.strokes) {
    const L = length(s.a, s.b);
    if (!(L > 0)) continue;
    const tol = Math.max(0.75, 0.2 * L);
    const v: Point = [(s.b[0] - s.a[0]) / L, (s.b[1] - s.a[1]) / L];
    let tick: Tick | undefined;
    let arm: Arm | undefined;
    for (const e of ink.edges) {
      if (e.index === s.index) continue;
      const E = length(e.a, e.b);
      if (E < 2.5 * L) continue;
      const u = unitOf(e);
      const rel = (p: Point) => [dot(sub(p, e.a), u), cross(u, sub(p, e.a))];
      const [ma, mp] = rel([(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2]);
      const [, pa] = rel(s.a),
        [, pb] = rel(s.b);
      if (
        Math.abs(mp) <= tol &&
        ma > tol &&
        ma < E - tol &&
        Math.abs(dot(v, u)) <= 0.26 &&
        pa * pb < 0 &&
        (!tick || Math.abs(mp) < tick.score)
      )
        tick = { s, e, along: ma, score: Math.abs(mp) };
      for (const [tip, back] of [
        [s.a, s.b],
        [s.b, s.a],
      ] as const) {
        const [ta, tp] = rel(tip),
          [ba, bp] = rel(back);
        if (Math.abs(tp) > tol || ta <= tol || ta >= E - tol) continue;
        const sin = Math.abs(bp) / L;
        if (sin < 0.25 || sin > 0.8 || Math.abs(ta - ba) < 0.3 * L) continue;
        if (!arm || Math.abs(tp) < arm.score)
          arm = {
            s,
            e,
            tip,
            tipAlong: ta,
            backAlong: ba,
            side: Math.sign(bp),
            dir: ta > ba ? 1 : -1,
            score: Math.abs(tp),
          };
      }
    }
    if (tick) ticks.push(tick);
    else if (arm) arms.push(arm);
  }
  // » — 촉을 같이 쓰고 변의 양쪽으로 벌어진 두 획
  const chevrons: { arms: Arm[]; e: Straight; center: number; dir: 1 | -1 }[] =
    [];
  const used = new Set<Arm>();
  for (const first of arms) {
    if (used.has(first)) continue;
    const L = length(first.s.a, first.s.b);
    const u = unitOf(first.e);
    const partner = arms.find((other) => {
      if (other === first || used.has(other)) return false;
      if (length(other.tip, first.tip) > Math.max(0.75, 0.2 * L)) return false;
      const back =
        length(other.s.a, other.tip) > length(other.s.b, other.tip)
          ? other.s.a
          : other.s.b;
      const side = Math.sign(cross(u, sub(back, first.e.a)));
      const dir = dot(sub(other.tip, back), u) > 0 ? 1 : -1;
      return side === -first.side && dir === first.dir;
    });
    if (!partner) continue;
    used.add(first).add(partner);
    chevrons.push({
      arms: [first, partner],
      e: first.e,
      center: (first.tipAlong + first.backAlong) / 2,
      dir: first.dir,
    });
  }
  const marks: SegmentMark[] = [];
  // 한 변 위 붙어 선 것끼리 한 표시(겹)
  const byEdge = <T extends { e: Straight }>(list: T[]) => {
    const groups = new Map<Straight, T[]>();
    for (const item of list)
      groups.set(item.e, [...(groups.get(item.e) ?? []), item]);
    return [...groups.values()];
  };
  for (const group of byEdge(ticks)) {
    group.sort((a, b) => a.along - b.along);
    const clusters: Tick[][] = [];
    for (const tick of group) {
      const last = clusters.at(-1);
      const L = length(tick.s.a, tick.s.b);
      if (last && tick.along - last.at(-1)!.along <= 0.75 * L) last.push(tick);
      else clusters.push([tick]);
    }
    // 좌표축 눈금 — 한 변을 따라 여러 자리에 흩어져 있다
    if (clusters.length >= 3) continue;
    for (const cluster of clusters) {
      if (cluster.length > 3) continue;
      marks.push({
        kind: "tick",
        indices: cluster.map((t) => t.s.index),
        edge: cluster[0].e,
        center: cluster.reduce((sum, t) => sum + t.along, 0) / cluster.length,
        dir: 1,
        stroke: median(cluster.map((t) => length(t.s.a, t.s.b))),
      });
    }
  }
  for (const group of byEdge(chevrons)) {
    group.sort((a, b) => a.center - b.center);
    const clusters: (typeof chevrons)[] = [];
    for (const chevron of group) {
      const last = clusters.at(-1);
      const L = length(chevron.arms[0].s.a, chevron.arms[0].s.b);
      if (
        last &&
        last[0].dir === chevron.dir &&
        chevron.center - last.at(-1)!.center <= 1.0 * L
      )
        last.push(chevron);
      else clusters.push([chevron]);
    }
    for (const cluster of clusters) {
      if (cluster.length > 3) continue;
      marks.push({
        kind: "parallel",
        indices: cluster.flatMap((c) => c.arms.map((arm) => arm.s.index)),
        edge: cluster[0].e,
        center: cluster.reduce((sum, c) => sum + c.center, 0) / cluster.length,
        dir: cluster[0].dir,
        stroke: median(
          cluster.flatMap((c) => c.arms.map((arm) => length(arm.s.a, arm.s.b))),
        ),
      });
    }
  }
  return marks;
}

/**
 * 선분 위 표시(같은 길이 눈금 · 평행 »)인 요소 — 요소 id → 이름. 요소 이름(`objectName`)이 부를 한 규칙이다.
 * 요소 자신의 transform 만 따른다(편집기 각 표시 판정 figureObjectGroups.ts 와 같은 눈). size 는 그림 틀의 긴 변.
 */
export function figureSegmentMarks(
  objects: readonly FigureObjectLike[],
  size: number,
): Map<string, FigureSegmentMarkKind> {
  const ink = straightInk(
    objects,
    objects.map((o) => parseTransform(o.attrs.transform)),
    size,
  );
  return new Map(
    recognizeSegmentMarks(ink).flatMap((mark) =>
      mark.indices.map(
        (index) => [objects[index].id, SEGMENT_MARK_NAMES[mark.kind]] as const,
      ),
    ),
  );
}
