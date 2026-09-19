import { transformFigureSelection } from "./figureClipboard";
import { POINT_NAME } from "./figureEditElements";
import {
  applyPoint,
  applyVector,
  elementMatrix,
  invert,
  parentMatrix,
  round2,
  type Point,
} from "./figureEditGeometry";
import {
  editableFigureDoc,
  editFigureObject,
  figureObjects,
  readFigureSvg,
  serializeFigureSvg,
} from "./figureSvgEditing";

/**
 * 곡선 뒤집기 — 곡선·꺾은선을 **두 끝을 잇는 현에 대해 거울 대칭**한다. 끝은 그대로, 부푼 쪽만 반대편으로.
 * 원장님 2026-09-19 «치수선 고치기가 제대로 안 되네.» — «선분 BC의 치수선을 선분 BC 아래로» 를 AI 가 경로의 점을
 * 하나씩 옮겨(`point`) 흉내 내다 호가 둘로 꺾였다. «요청대로 고치기»의 `flip` 과 편집기 단추가 같이 쓴다.
 * - 경로(d)는 절대 좌표로 읽어 M·L·Q·T·C·S·A 를 대칭한다(H·V 는 대칭하면 기울어지니 L 로). 호(A)는 방향(sweep)을
 *   뒤집고 기울기를 현에 대해 비춘다.
 * - 현: 조각이 하나면 처음·끝, 여럿이면(엔진 치수선은 값 자리에 틈을 낸 두 조각 — figure_scene.py
 *   `_dimension_gapped_path`) 조각 끝들 가운데 **가장 먼 두 끝**.
 * - 현 위의 점(끝)은 원래 숫자를 그대로 둔다 — 대칭한 점만 소수 셋째 자리(엔진 `_fmt` 자릿수).
 */

type Segment = { command: string; values: number[] };

const NUMBER = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/y;
const SIZES: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  Q: 4,
  T: 2,
  C: 6,
  S: 4,
  A: 7,
};

/** 경로 d → 절대 좌표 조각(H·V 는 L). 읽지 못하면 null. */
function parsePath(d: string): Segment[] | null {
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
  // 호의 두 깃발은 한 글자다 — 띄어 쓰지 않은 «01» 도 읽는다
  const flag = () => {
    skip();
    const c = d[i];
    if (c !== "0" && c !== "1") return null;
    i++;
    return Number(c);
  };
  const segments: Segment[] = [];
  let command = "",
    x = 0,
    y = 0,
    sx = 0,
    sy = 0;
  for (skip(); i < d.length; skip()) {
    if (/[a-z]/i.test(d[i])) command = d[i++];
    else if (!command) return null;
    const upper = command.toUpperCase(),
      relative = command !== upper;
    if (upper === "Z") {
      segments.push({ command: "Z", values: [] });
      x = sx;
      y = sy;
      command = "";
      continue;
    }
    const size = SIZES[upper];
    if (size === undefined) return null;
    const raw: number[] = [];
    for (let k = 0; k < size; k++) {
      const value = upper === "A" && (k === 3 || k === 4) ? flag() : number();
      if (value === null || !Number.isFinite(value)) return null;
      raw.push(value);
    }
    if (upper === "H" || upper === "V") {
      if (upper === "H") x = raw[0] + (relative ? x : 0);
      else y = raw[0] + (relative ? y : 0);
      segments.push({ command: "L", values: [x, y] });
      continue;
    }
    if (upper === "A") {
      raw[5] += relative ? x : 0;
      raw[6] += relative ? y : 0;
    } else
      for (let k = 0; k < raw.length; k++)
        raw[k] += relative ? (k % 2 ? y : x) : 0;
    x = raw[raw.length - 2];
    y = raw[raw.length - 1];
    segments.push({ command: upper, values: raw });
    if (upper === "M") {
      sx = x;
      sy = y;
      command = relative ? "l" : "L";
    }
  }
  return segments[0]?.command === "M" ? segments : null;
}

const text = (value: number) => {
  const rounded = Math.round(value * 1e6) / 1e6;
  return String(Object.is(rounded, -0) ? 0 : rounded);
};
const round3 = (value: number) => Math.round(value * 1000) / 1000;
const serialize = (segments: Segment[]) =>
  segments
    .map(({ command, values }) =>
      values.length ? `${command} ${values.map(text).join(" ")}` : command,
    )
    .join(" ");

/** 점 p 를 a·b 를 지나는 직선에 대해 비춘 점. */
export function mirrorAcross(p: Point, a: Point, b: Point): Point {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  return [2 * (a[0] + t * dx) - p[0], 2 * (a[1] + t * dy) - p[1]];
}

/** 대칭 — 현 위의 점은 원래 숫자 그대로(끝점 불변), 나머지는 소수 셋째 자리. */
const mirrorKeeping = (p: Point, a: Point, b: Point): Point => {
  const [x, y] = mirrorAcross(p, a, b);
  return Math.hypot(x - p[0], y - p[1]) < 1e-9 ? p : [round3(x), round3(y)];
};

/** SVG 호(끝점 표기) → 중심 표기 — SVG 1.1 F.6.5. 반지름이 모자라면 SVG 처럼 늘린다. */
function arcCenter(
  [x1, y1]: Point,
  [rx, ry, rotation, large, sweep, x2, y2]: number[],
) {
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  if (!rx || !ry || (x1 === x2 && y1 === y2)) return null;
  const phi = (rotation * Math.PI) / 180,
    cos = Math.cos(phi),
    sin = Math.sin(phi);
  const hx = (x1 - x2) / 2,
    hy = (y1 - y2) / 2;
  const x1p = cos * hx + sin * hy,
    y1p = -sin * hx + cos * hy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const numerator =
    rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const denominator = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coefficient =
    (large === sweep ? -1 : 1) *
    Math.sqrt(Math.max(0, numerator / (denominator || 1)));
  const cxp = (coefficient * rx * y1p) / ry,
    cyp = (-coefficient * ry * x1p) / rx;
  const angle = (ux: number, uy: number, vx: number, vy: number) =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const start = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let turn = angle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry,
  );
  if (!sweep && turn > 0) turn -= 2 * Math.PI;
  if (sweep && turn < 0) turn += 2 * Math.PI;
  return {
    center: [
      cos * cxp - sin * cyp + (x1 + x2) / 2,
      sin * cxp + cos * cyp + (y1 + y2) / 2,
    ] as Point,
    rx,
    ry,
    cos,
    sin,
    start,
    turn,
  };
}

/** 곡선 위의 점 — 조각(M 으로 시작하는 한 획)마다 한 줄. 조절점이 아니라 **곡선 자체**의 자리다. 읽지 못하면 null. */
export function sampleFigurePath(d: string, steps = 16): Point[][] | null {
  const segments = parsePath(d);
  if (!segments) return null;
  const pieces: Point[][] = [];
  let piece: Point[] = [];
  let x = 0,
    y = 0,
    sx = 0,
    sy = 0;
  let lastQ: Point | null = null,
    lastC: Point | null = null;
  for (const { command, values: v } of segments) {
    const previousQ = lastQ,
      previousC = lastC;
    lastQ = lastC = null;
    if (command === "M") {
      if (piece.length) pieces.push(piece);
      x = sx = v[0];
      y = sy = v[1];
      piece = [[x, y]];
      continue;
    }
    if (command === "Z" || command === "L") {
      [x, y] = command === "Z" ? [sx, sy] : [v[0], v[1]];
      piece.push([x, y]);
      continue;
    }
    if (command === "Q" || command === "T") {
      const c: Point =
        command === "Q"
          ? [v[0], v[1]]
          : previousQ
            ? [2 * x - previousQ[0], 2 * y - previousQ[1]]
            : [x, y];
      const e: Point = command === "Q" ? [v[2], v[3]] : [v[0], v[1]];
      for (let k = 1; k <= steps; k++) {
        const t = k / steps,
          s = 1 - t;
        piece.push([
          s * s * x + 2 * s * t * c[0] + t * t * e[0],
          s * s * y + 2 * s * t * c[1] + t * t * e[1],
        ]);
      }
      lastQ = c;
      [x, y] = e;
    } else if (command === "C" || command === "S") {
      const c1: Point =
        command === "C"
          ? [v[0], v[1]]
          : previousC
            ? [2 * x - previousC[0], 2 * y - previousC[1]]
            : [x, y];
      const c2: Point = command === "C" ? [v[2], v[3]] : [v[0], v[1]];
      const e: Point = command === "C" ? [v[4], v[5]] : [v[2], v[3]];
      for (let k = 1; k <= steps; k++) {
        const t = k / steps,
          s = 1 - t;
        piece.push([
          s * s * s * x +
            3 * s * s * t * c1[0] +
            3 * s * t * t * c2[0] +
            t * t * t * e[0],
          s * s * s * y +
            3 * s * s * t * c1[1] +
            3 * s * t * t * c2[1] +
            t * t * t * e[1],
        ]);
      }
      lastC = c2;
      [x, y] = e;
    } else {
      // A
      const arc = arcCenter([x, y], v);
      if (arc)
        for (let k = 1; k < steps; k++) {
          const angle = arc.start + (arc.turn * k) / steps;
          const ex = arc.rx * Math.cos(angle),
            ey = arc.ry * Math.sin(angle);
          piece.push([
            arc.center[0] + arc.cos * ex - arc.sin * ey,
            arc.center[1] + arc.sin * ex + arc.cos * ey,
          ]);
        }
      // 끝은 계산하지 않고 적힌 자리 그대로(반지름이 0 이면 SVG 처럼 곧은 선)
      [x, y] = [v[5], v[6]];
      piece.push([x, y]);
    }
  }
  if (piece.length) pieces.push(piece);
  return pieces;
}

/** 현 — 조각이 하나면 처음·끝, 여럿이면 조각 끝들 가운데 가장 먼 두 끝. 닫혀 있으면(길이 0) null. */
function chordOf(pieces: Point[][]): [Point, Point] | null {
  const ends = pieces.flatMap((piece) => [piece[0], piece[piece.length - 1]]);
  let chord: [Point, Point] | null = null,
    longest = 1e-6;
  const pairs: [Point, Point][] =
    pieces.length === 1
      ? [[ends[0], ends[1]]]
      : ends.flatMap((a, i) =>
          ends.slice(i + 1).map((b): [Point, Point] => [a, b]),
        );
  for (const [a, b] of pairs) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length > longest) {
      longest = length;
      chord = [a, b];
    }
  }
  return chord;
}

/** 현에서 잰 부호 있는 거리 — 양쪽으로 가장 멀리 나간 값(양수는 현의 오른쪽 법선 쪽). */
function sides(pieces: Point[][], [a, b]: [Point, Point]) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    length = Math.hypot(dx, dy);
  let positive = 0,
    negative = 0;
  for (const piece of pieces)
    for (const [x, y] of piece) {
      const distance = (dx * (y - a[1]) - dy * (x - a[0])) / length;
      positive = Math.max(positive, distance);
      negative = Math.max(negative, -distance);
    }
  return { positive, negative, sign: positive >= negative ? 1 : -1 };
}

const STRAIGHT = "곧은 선이라 뒤집을 것이 없습니다";
const CLOSED = "닫힌 곡선은 뒤집지 않습니다";

export type FlipPathResult =
  { d: string; chord: [Point, Point] } | { reason: string };

/** 경로 d 를 현에 대해 뒤집는다 — 좌표는 요소 자신의 좌표(transform 앞). */
export function flipFigurePathData(d: string): FlipPathResult {
  const segments = parsePath(d);
  const pieces = segments && sampleFigurePath(d);
  if (!segments || !pieces) return { reason: "경로를 읽지 못했습니다" };
  if (segments.some((segment) => segment.command === "Z"))
    return { reason: CLOSED };
  const chord = chordOf(pieces);
  if (!chord) return { reason: CLOSED };
  const { positive, negative } = sides(pieces, chord);
  if (Math.max(positive, negative) < 0.5) return { reason: STRAIGHT };
  const [a, b] = chord;
  // 호의 기울기는 현의 방향에 대해 비춘다(φ → 2θ − φ) — (−180, 180] 로
  const theta = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  const flipped = segments.map(({ command, values }): Segment => {
    if (command === "A") {
      const [rx, ry, rotation, large, sweep, x, y] = values;
      let tilt = round3(2 * theta - rotation) % 360;
      if (tilt > 180) tilt -= 360;
      if (tilt <= -180) tilt += 360;
      return {
        command,
        values: [
          rx,
          ry,
          tilt,
          large,
          1 - sweep,
          ...mirrorKeeping([x, y], a, b),
        ],
      };
    }
    const next: number[] = [];
    for (let k = 0; k < values.length; k += 2)
      next.push(...mirrorKeeping([values[k], values[k + 1]], a, b));
    return { command, values: next };
  });
  return { d: serialize(flipped), chord };
}

export type FlipPointsResult =
  { points: string; chord: [Point, Point] } | { reason: string };

/** 꺾은선 points 속성 → 점 목록. */
function pointList(points: string): Point[] {
  const values = (
    points.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) ?? []
  ).map(Number);
  const list: Point[] = [];
  for (let k = 0; k + 1 < values.length; k += 2)
    list.push([values[k], values[k + 1]]);
  return list;
}

/** 꺾은선(points) 을 처음·끝을 잇는 현에 대해 뒤집는다. */
export function flipFigurePointList(points: string): FlipPointsResult {
  const list = pointList(points);
  if (list.length < 2) return { reason: "경로를 읽지 못했습니다" };
  const chord = chordOf([list]);
  if (!chord) return { reason: CLOSED };
  const { positive, negative } = sides([list], chord);
  if (Math.max(positive, negative) < 0.5) return { reason: STRAIGHT };
  return {
    points: list
      .flatMap((p) => mirrorKeeping(p, chord[0], chord[1]))
      .map(text)
      .join(" "),
    chord,
  };
}

/** 두 선분이 서로 **가로지르는가**(끝이 닿는 것은 빼고). */
function crossing(p: Point, q: Point, r: Point, s: Point) {
  const orient = (a: Point, b: Point, c: Point) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = orient(r, s, p),
    d2 = orient(r, s, q),
    d3 = orient(p, q, r),
    d4 = orient(p, q, s);
  const eps = 1e-9;
  return (
    ((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) &&
    ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps))
  );
}
function crossesItself(pieces: Point[][]) {
  const edges = pieces.flatMap((piece, pieceIndex) =>
    piece.slice(1).map((q, i) => ({ p: piece[i], q, pieceIndex, i })),
  );
  for (let m = 0; m < edges.length; m++)
    for (let n = m + 1; n < edges.length; n++) {
      const e = edges[m],
        f = edges[n];
      if (e.pieceIndex === f.pieceIndex && Math.abs(e.i - f.i) < 2) continue;
      if (crossing(e.p, e.q, f.p, f.q)) return true;
    }
  return false;
}

const SAME = 0.5;
const samePoint = (a: Point, b: Point) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]) <= SAME;

/** 점 옮기기가 곡선을 현을 가로질러 꺾었다 — 적용 목록에서 «반대쪽으로는 뒤집기»를 알린다. */
export const BENT_ACROSS = "곡선이 현을 가로질러 꺾입니다";
export const CROSSES_ITSELF = "곡선이 스스로 엇갈립니다";

/**
 * «요청대로 고치기» 적용 쪽 방어 — 모델이 곡선의 점을 하나씩 옮겨(`point`) 반대편 넘기기를 흉내 내면 곡선이 꺾인다
 * (원장님 2026-09-19: 틈 두 끝만 아래로, 조절점은 위에 남아 B 쪽은 처지고 C 쪽은 솟는 두 조각).
 * - 꺾임: 현(끝)이 그대로인데, 한쪽으로만 부풀던 곡선이 **양쪽으로** 나간다. 끝을 옮긴 것(현이 바뀜)은 곡선을 새로
 *   놓은 것이라 보지 않는다.
 * - 엇갈림: 전에 없던 자기 교차가 생긴다.
 * 문턱: 전에는 반대쪽이 제일 먼 쪽의 1/10 이하(한쪽), 뒤에는 양쪽이 다 제일 먼 쪽의 15%·1 단위를 넘는다.
 * 둘 다 아니면 null.
 */
export function bentCurveReason(before: string, after: string): string | null {
  const was = sampleFigurePath(before),
    now = sampleFigurePath(after);
  if (!was || !now) return null;
  const wasChord = chordOf(was),
    nowChord = chordOf(now);
  if (wasChord && nowChord) {
    const same =
      (samePoint(wasChord[0], nowChord[0]) &&
        samePoint(wasChord[1], nowChord[1])) ||
      (samePoint(wasChord[0], nowChord[1]) &&
        samePoint(wasChord[1], nowChord[0]));
    if (same) {
      const old = sides(was, wasChord),
        next = sides(now, nowChord);
      const oldMost = Math.max(old.positive, old.negative),
        nextMost = Math.max(next.positive, next.negative);
      const oneSided =
        oldMost > SAME && Math.min(old.positive, old.negative) <= 0.1 * oldMost;
      if (
        oneSided &&
        Math.min(next.positive, next.negative) > Math.max(1, 0.15 * nextMost)
      )
        return BENT_ACROSS;
    }
  }
  return !crossesItself(was) && crossesItself(now) ? CROSSES_ITSELF : null;
}

type FigureObject = ReturnType<typeof figureObjects>[number];

const first = (value: string | undefined) => {
  const number = Number.parseFloat(value?.trim().split(/[\s,]+/)[0] ?? "");
  return Number.isFinite(number) ? number : 0;
};
const styled = (node: Element, o: FigureObject, name: string) =>
  (node as SVGElement).style?.getPropertyValue(name) || o.attrs[name];

/** 글자의 눈에 보이는 가운데(그림 좌표) — 엔진 값 라벨은 밑선을 곡선보다 0.32 글자 아래에 둔다(figure_scene.py). */
function labelCenter(o: FigureObject, node: Element) {
  const size = first(styled(node, o, "font-size")) || 16;
  const anchor = styled(node, o, "text-anchor");
  // 보이는 글자 수 — 수식 원문(`$96^\circ$`)이 아니라 지면의 «96°»
  const length = [...(o.text.trim() || o.attrs["data-mj"] || "")].length;
  const baseline = styled(node, o, "dominant-baseline");
  const at = applyPoint(elementMatrix(node), [
    first(o.attrs.x) +
      (anchor === "middle"
        ? 0
        : (anchor === "end" ? -0.3 : 0.3) * size * length),
    first(o.attrs.y) -
      (["middle", "central"].includes(baseline ?? "") ? 0 : 0.32 * size),
  ]);
  return { at, size, half: 0.3 * size * Math.max(1, length) };
}

function curveSamples(o: FigureObject, node: Element): Point[][] | null {
  const matrix = elementMatrix(node);
  let pieces: Point[][] | null = null;
  if (o.type === "path") pieces = sampleFigurePath(o.attrs.d ?? "", 12);
  else if (o.type === "polyline") {
    const list = pointList(o.attrs.points ?? "");
    pieces = list.length > 1 ? [list] : null;
  }
  return (
    pieces?.map((piece) => piece.map((p) => applyPoint(matrix, p))) ?? null
  );
}

const toSegment = (p: Point, a: Point, b: Point) => {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1),
    ),
  );
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};
/** 곡선까지의 거리 — 조각 사이 틈(엔진 치수선의 값 자리)은 가까운 끝끼리 이어 곡선으로 친다. */
function distanceToCurve(p: Point, pieces: Point[][]) {
  let best = Infinity;
  for (const piece of pieces)
    for (let i = 1; i < piece.length; i++)
      best = Math.min(best, toSegment(p, piece[i - 1], piece[i]));
  for (let i = 1; i < pieces.length; i++) {
    const ends = [pieces[i - 1][0], pieces[i - 1].at(-1)!];
    const next = [pieces[i][0], pieces[i].at(-1)!];
    let bridge: [Point, Point] = [ends[0], next[0]];
    for (const a of ends)
      for (const b of next)
        if (
          Math.hypot(a[0] - b[0], a[1] - b[1]) <
          Math.hypot(bridge[0][0] - bridge[1][0], bridge[0][1] - bridge[1][1])
        )
          bridge = [a, b];
    best = Math.min(best, toSegment(p, bridge[0], bridge[1]));
  }
  return best;
}

/**
 * 곡선에 딸린 값 글자(치수의 «10») — 엔진 SVG 에 둘을 잇는 표지가 없어(`data-px` 는 꼭짓점 이름에만) 자리로 가른다:
 * 꼭짓점 이름이 아니다 · 현의 두 끝 **사이**에 선다 · 곡선이 부푼 쪽에 있다 · 곡선에서 글자 크기 2.5배 안 ·
 * 다른 곡선(다른 치수·각의 호)이 더 가깝지 않다. 여럿이면 가장 가까운 것 하나.
 */
function curveLabel(
  objects: FigureObject[],
  nodes: Element[],
  index: number,
  chord: [Point, Point],
) {
  const pieces = curveSamples(objects[index], nodes[index]);
  if (!pieces) return undefined;
  const [a, b] = chord;
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    length2 = dx * dx + dy * dy;
  const bulge = sides(pieces, chord).sign;
  const others = objects.flatMap((o, i) =>
    i !== index && (o.type === "path" || o.type === "polyline")
      ? [curveSamples(o, nodes[i])].filter((p): p is Point[][] => !!p)
      : [],
  );
  let found:
    | { index: number; at: Point; distance: number; size: number; half: number }
    | undefined;
  objects.forEach((o, i) => {
    if (o.type !== "text") return;
    if (o.attrs["data-px"] !== undefined || o.attrs["data-py"] !== undefined)
      return;
    if (POINT_NAME.test((o.attrs["data-mj"] ?? o.text).replace(/[$\s]/g, "")))
      return;
    const { at, size, half } = labelCenter(o, nodes[i]);
    const t = ((at[0] - a[0]) * dx + (at[1] - a[1]) * dy) / length2;
    if (t <= 0 || t >= 1) return;
    if ((dx * (at[1] - a[1]) - dy * (at[0] - a[0])) * bulge <= 0) return;
    const distance = distanceToCurve(at, pieces);
    if (distance > 2.5 * size) return;
    if (others.some((other) => distanceToCurve(at, other) < distance)) return;
    if (!found || distance < found.distance)
      found = { index: i, at, distance, size, half };
  });
  return found;
}

export type FlipCurveResult =
  { svg: string; labelId?: string } | { reason: string };

/**
 * 편집기 요소 하나(곡선 path · 꺾은선 polyline)를 현에 대해 뒤집고, 딸린 값 글자를 같은 현에 대해 대칭 자리로
 * 옮긴다 — 글자는 **똑바로 선 채**(원장님 항목 22) 평행 이동만 한다. 요소 id 로 부른다(편집기 단추·AI `flip` 공용).
 * 크기 고정·각 표시 같은 편집기 규칙은 부르는 쪽이 먼저 본다.
 */
export function flipFigureCurve(svg: string, id: string): FlipCurveResult {
  const objects = figureObjects(svg);
  const index = objects.findIndex((o) => o.id === id);
  const object = objects[index];
  if (!object) return { reason: "요소를 찾지 못했습니다" };
  if (
    (object.type !== "path" && object.type !== "polyline") ||
    object.attrs["data-function"]
  )
    return { reason: "곡선·꺾은선만 뒤집습니다" };
  const flipped =
    object.type === "path"
      ? flipFigurePathData(object.attrs.d ?? "")
      : flipFigurePointList(object.attrs.points ?? "");
  if ("reason" in flipped) return flipped;
  const nodes = [...readFigureSvg(svg).querySelectorAll("[data-object-id]")];
  const matrix = elementMatrix(nodes[index]);
  const chord = flipped.chord.map((p) => applyPoint(matrix, p)) as [
    Point,
    Point,
  ];
  const label = curveLabel(objects, nodes, index, chord);
  let next = editFigureObject(
    svg,
    id,
    "d" in flipped ? { d: flipped.d } : { points: flipped.points },
  );
  // 뒤집은 곡선이 차지하는 자리(그림 좌표) — 틀 밖으로 나가면 넓힌다
  const ink: Point[] = (
    "d" in flipped
      ? (sampleFigurePath(flipped.d, 12) ?? [])
      : [pointList(flipped.points)]
  ).flatMap((piece) => piece.map((p) => applyPoint(matrix, p)));
  let pad = 6;
  let labelId: string | undefined;
  const labelNode = label && nodes[label.index];
  const inverse = labelNode && invert(parentMatrix(labelNode));
  if (label && labelNode && inverse) {
    const target = mirrorAcross(label.at, chord[0], chord[1]);
    const [lx, ly] = applyVector(inverse, [
      target[0] - label.at[0],
      target[1] - label.at[1],
    ]);
    const previous = labelNode.getAttribute("transform")?.trim();
    labelId = objects[label.index].id;
    next = transformFigureSelection(next, [
      {
        id: labelId,
        transform: `translate(${round2(lx)} ${round2(ly)})${previous ? ` ${previous}` : ""}`,
      },
    ]);
    ink.push(
      [target[0] - label.half, target[1] - label.size / 2],
      [target[0] + label.half, target[1] + label.size / 2],
    );
    pad = 0.6 * label.size;
  }
  next = widenFrame(next, ink, pad);
  return labelId ? { svg: next, labelId } : { svg: next };
}

/**
 * 그림 틀(루트 viewBox)을 점들이 들어가게 넓힌다 — 밖으로 나간 쪽만, 여백 pad 를 두고. 줄이지는 않는다.
 * 편집기는 틀만 보여 준다: 엔진 그림은 틀이 도형에 꼭 맞아, 아래로 뒤집은 «10» 이 편집 화면 밑에서 잘렸다
 * (2026-09-19 브라우저 확인). 저장할 때는 fitFigureViewport 가 다시 맞춘다. width·height 가 적혀 있으면 같은 비율로.
 */
function widenFrame(svg: string, points: Point[], pad: number): string {
  if (!points.length) return svg;
  const doc = editableFigureDoc(svg);
  const root = doc.documentElement;
  const view = root
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (view?.length !== 4 || !view.every(Number.isFinite) || view[2] <= 0)
    return svg;
  const [x, y, w, h] = view;
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const left = Math.min(...xs) < x ? Math.min(...xs) - pad : x;
  const top = Math.min(...ys) < y ? Math.min(...ys) - pad : y;
  const right = Math.max(...xs) > x + w ? Math.max(...xs) + pad : x + w;
  const bottom = Math.max(...ys) > y + h ? Math.max(...ys) + pad : y + h;
  if (left === x && top === y && right === x + w && bottom === y + h)
    return svg;
  const next = [left, top, right - left, bottom - top].map(round3);
  root.setAttribute("viewBox", next.map(text).join(" "));
  for (const [name, before, after] of [
    ["width", w, next[2]],
    ["height", h, next[3]],
  ] as const) {
    const size = Number.parseFloat(root.getAttribute(name) ?? "");
    if (Number.isFinite(size) && size > 0)
      root.setAttribute(name, text(round3((size * after) / before)));
  }
  return serializeFigureSvg(doc);
}
