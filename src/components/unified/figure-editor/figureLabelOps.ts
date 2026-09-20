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
  invert,
  parentMatrix,
  scaleOf,
  type Affine,
  type Point,
} from "./figureEditGeometry";
import { sampleFigurePath } from "./figureFlip";
import { straightPathPieces } from "./figureSegmentMarks";
import { widenFrame } from "./figureFrame";
import { POINT_NAME } from "./figureEditElements";
import { figureAngleKinds } from "./figureObjectGroups";
import { isAngleKind, objectName } from "./figureObjectNames";
import { figureLabelSummary } from "./FigureLabelInput";
import { ANGLE_MARK_WIDTH } from "./figureAngleMark";

/**
 * 글자 더하기(원장님 2026-09-20 «아직 없는 명령 전부») — **각의 크기 글자**(`addAngle.text`)와 **점 이름**(`addLabel`).
 * 도형 엔진 v2 가 라벨을 놓는 규칙을 그대로 옮긴다(vendor/figure-engine/core/figure_scene.py):
 * - 각의 크기: 이등분선 위 `17.5 + n·max(3.5, 0.45×글자)` 사다리에서 **잉크를 안 밟는 첫 자리**(`_angle_label_layout`).
 *   사다리는 «가장 가까운 다른 이름 붙은 점까지의 절반»에서 끊는다 — 그 너머는 **옆 꼭짓점의 값**으로 읽힌다.
 *   안쪽에 자리가 없으면 **밖으로 끌어내고 호에서 지시선을 긋는다**(원장님 2026-08-27 «화살표로 각을 도형 밖으로»).
 *   글자는 똑바로 서고 흰 테두리(halo)를 두른다 — 엔진 각 라벨과 같은 `paint-order="stroke"`.
 * - 점 이름: 꼭짓점 **바깥**(붙은 변들의 반대 방향, `_outward_vector`) 차례로 여덟 방향 × 다섯 거리
 *   `7.7 + 0.18×글자 + n·max(3.5, 0.55×글자)`(`_place_labels`) 가운데 선·다른 이름·점을 가장 덜 밟는 자리.
 *   엔진처럼 제 점을 `data-px`·`data-py` 에 적어 둔다 — 그래야 **다음 요청의 이름 목록**(`figurePointNames`)에 뜬다.
 *
 * ⚠️ 엔진과 **일부러 다른 두 가지**(엔진은 각 라벨 → 치수 → 점 이름 차례로 놓지만, 우리는 이미 다 그려진 그림에 얹는다):
 *  ① 각 라벨도 **이미 있는 치수 점선**을 잉크로 센다(엔진은 치수보다 먼저 놓아 못 본다).
 *  ② 각 라벨의 `occupied` 에 **이미 있는 모든 글자**를 넣는다(엔진은 저보다 먼저 놓인 라벨만 본다).
 * 둘 다 «이미 그려진 것 위에 얹지 않는다»는 같은 뜻이고, 엔진 그림에 없던 글자를 더할 때만 갈린다.
 */

// ── 엔진 v2 값 (figure_scene.py StyleProfile · 모듈 상수) ─────────────────
/** `style.font_size` · `style.angle_font_size` — 1배 기준. */
const LABEL_FONT = 16.8;
/** `style.label_offset` — 실제 거리는 `label_offset + 0.18×글자 + 자리순위 × max(3.5, 0.55×글자)`. */
const LABEL_OFFSET = 7.7;
/** `style.angle_label_distance`. */
const ANGLE_LABEL_DISTANCE = 17.5;
/** `style.padding` — 라벨이 틀 밖으로 나가면 이만큼 여백을 두고 넓힌다. */
const CANVAS_PAD = 12;
/** `style.halo_width` — 각 라벨 뒤 흰 테두리. */
const HALO = 3.15;
/** `_TICK_HALF` — 지시선이 이보다 짧으면 같은 길이 눈금으로 읽힌다(`_leader_is_drawable`). */
const TICK_HALF = 4;
/** `_LABEL_PULL` — 바깥 방향의 세로 성분을 눌러 수평 쪽으로 당긴다. */
const LABEL_PULL = 0.4;
/** `_OUTWARD_MIN` — 붙은 변들의 합이 이보다 짧으면 «바깥»이 없다(선분 위의 점). */
const OUTWARD_MIN = 0.3;
/** 밖으로 끌어낸 라벨의 거리(호 반지름 + 글자 × far)와 팔에서 돌리는 각. */
const OUT_FAR = [1.2, 1.7, 2.3, 3.0];
const OUT_TURN = [30, 48, 66];
/** 지시선이 휘는 정도 — 곧은 선은 도형의 변으로 읽힌다. */
const LEADER_BOW = 0.18;
const INK = "#111111";

/** 글자 상자 — 잉크 상자다(em 상자가 아니다). `_text_box`: 위 0.75em · 내림 글자만 아래 0.22em. */
const ASCENT = 0.75;
const DESCENT = 0.22;
const DESCENDERS = new Set("gjpqy,;()[]{}/");
/** `label_markup.DEG_RATIO`(0.183 ÷ 0.290) · `SCRIPT_RATIO`. */
const DEG_RATIO = 0.63;
const SCRIPT_RATIO = 0.72;

export type FigureLabelCommand = Extract<FigureEditCommand, { op: "addLabel" }>;
export const isFigureLabelCommand = (
  command: FigureEditCommand,
): command is FigureLabelCommand => command.op === "addLabel";

/** 적용 목록의 한 줄 — «점 이름 D 추가». */
export const figureLabelOpLabel = (command: FigureLabelCommand) =>
  `점 이름 ${figureLabelSummary(command.text)} 추가`;

export interface FigureLabelContext {
  /** 점 이름·좌표 → 그림 좌표. 못 찾으면 적용 쪽의 거절로 던진다. */
  resolve: (ref: FigureEditPointRef) => { x: number; y: number };
  /** 요청 때 그림의 요소 이름(«4번 글자») — 이번 요청에서 더한 요소면 undefined. */
  nameOf: (id: string) => string | undefined;
}

// ── 기하·서식 ────────────────────────────────────────────────────────────
type Box = [number, number, number, number];
type FigureObject = ReturnType<typeof figureObjects>[number];

const sub = (p: Point, q: Point): Point => [p[0] - q[0], p[1] - q[1]];
const length = (p: Point, q: Point) => Math.hypot(q[0] - p[0], q[1] - p[1]);
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));
/** 엔진 `_fmt` — 소수 셋째 자리, 뒤 0 없이. */
const fmt = (value: number) => {
  const text = (Math.abs(value) < 5e-7 ? 0 : value)
    .toFixed(3)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
  return text === "-0" || !text ? "0" : text;
};
const round3 = (value: number) => Number(fmt(value));

/** Times New Roman 의 실제 글자 폭(em, AFM) — 엔진 `label_markup._TIMES_EM` 가운데 라벨에 나오는 글자. */
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
/** 지면에 보이는 글 — `$…$`·TeX 명령어를 벗긴다(폭 어림용). */
const visibleText = (text: string) =>
  text
    .replace(/\$/g, "")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}]/g, "")
    .trim();
/**
 * 라벨의 폭(em) — 엔진 `label_width_em`: 도 기호는 0.63배, 첨자는 0.72배로 센다.
 * 도 기호를 본디 크기로 세면 «40°» 상자가 12% 넓어져 사다리 한 칸이 어긋난다.
 */
function labelWidthEm(text: string) {
  const shown = visibleText(text);
  let total = 0;
  let script = false;
  for (let i = 0; i < shown.length; i++) {
    const ch = shown[i];
    if (ch === "^" || ch === "_") {
      script = true;
      continue;
    }
    total += charEm(ch) * (ch === "°" ? DEG_RATIO : script ? SCRIPT_RATIO : 1);
    script = false;
  }
  return total;
}
/** 엔진 `_text_box` — (x, 밑선)에 선 글자의 잉크 상자. */
function textBox(x: number, baseline: number, text: string, fs: number): Box {
  const shown = visibleText(text) || text;
  const width = Math.max(0.62, labelWidthEm(text)) * fs;
  const descent = [...shown].some((ch) => DESCENDERS.has(ch))
    ? DESCENT * fs
    : 0;
  return [
    x - width / 2,
    baseline - ASCENT * fs,
    x + width / 2,
    baseline + descent,
  ];
}
const expandBox = ([x1, y1, x2, y2]: Box, pad: number): Box => [
  x1 - pad,
  y1 - pad,
  x2 + pad,
  y2 + pad,
];
const boxesOverlap = (a: Box, b: Box, gap = 0) =>
  !(
    a[2] + gap <= b[0] ||
    b[2] + gap <= a[0] ||
    a[3] + gap <= b[1] ||
    b[3] + gap <= a[1]
  );
const pointInBox = ([x, y]: Point, box: Box, margin = 0) =>
  box[0] - margin <= x &&
  x <= box[2] + margin &&
  box[1] - margin <= y &&
  y <= box[3] + margin;
/** 선분이 상자를 지나나 — Liang–Barsky. */
function segmentHitsBox(p: Point, q: Point, [x1, y1, x2, y2]: Box) {
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
/** 원 **둘레**가 상자를 지나나(안쪽만 겹치는 것은 아니다) — 엔진 `_circle_intersects_box`. */
function circleHitsBox(c: Point, r: number, box: Box) {
  const near = Math.hypot(
    c[0] - clamp(c[0], box[0], box[2]),
    c[1] - clamp(c[1], box[1], box[3]),
  );
  const far = Math.max(
    ...[box[0], box[2]].flatMap((x) =>
      [box[1], box[3]].map((y) => Math.hypot(c[0] - x, c[1] - y)),
    ),
  );
  return near <= r && r <= far;
}

// ── 지금 그림 읽기 ───────────────────────────────────────────────────────
/** 요소 하나가 남기는 잉크 — 곧은 획과 원 둘레. */
interface InkPiece {
  index: number;
  /** 각 표시인가 — 각의 크기 글자는 제 호 곁에 앉는 것이 정상이라 안 센다. */
  angle: boolean;
  lines: [Point, Point][];
  circles: { c: Point; r: number }[];
}
/** 이미 있는 글자. */
interface TextPiece {
  index: number;
  id: string;
  /** `data-mj` 또는 본문(`$…$` 그대로). */
  text: string;
  /** 점 이름(A·P′ …)인가. */
  isName: boolean;
  /** 점 이름이 가리키는 점(엔진 `data-px`·`data-py`, 없으면 글자 가운데). */
  owner: Point;
  center: Point;
  fontSize: number;
  box: Box;
}

function elementInk(o: FigureObject, m: Affine): InkPiece {
  const lines: [Point, Point][] = [];
  const circles: { c: Point; r: number }[] = [];
  const n = (key: string) => Number.parseFloat(o.attrs[key] ?? "") || 0;
  const chain = (points: Point[], closed = false) => {
    const list = points.map((p) => applyPoint(m, p));
    for (let i = 0; i + 1 < list.length + (closed ? 1 : 0); i++)
      lines.push([list[i], list[(i + 1) % list.length]]);
  };
  const values = (value = "") =>
    (value.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) ?? []).map(
      Number,
    );
  const pairs = (list: number[]): Point[] =>
    list.flatMap((x, i) =>
      i % 2 || i + 1 >= list.length ? [] : [[x, list[i + 1]] as Point],
    );
  if (o.type === "line")
    chain([
      [n("x1"), n("y1")],
      [n("x2"), n("y2")],
    ]);
  else if (o.type === "polyline" || o.type === "polygon")
    chain(pairs(values(o.attrs.points)), o.type === "polygon");
  else if (o.type === "rect")
    chain(
      [
        [n("x"), n("y")],
        [n("x") + n("width"), n("y")],
        [n("x") + n("width"), n("y") + n("height")],
        [n("x"), n("y") + n("height")],
      ],
      true,
    );
  else if (o.type === "circle") {
    const r = n("r") * scaleOf(m);
    if (r > 0) circles.push({ c: applyPoint(m, [n("cx"), n("cy")]), r });
  } else if (o.type === "ellipse")
    chain(
      Array.from({ length: 48 }, (_, k): Point => [
        n("cx") + n("rx") * Math.cos((k * Math.PI) / 24),
        n("cy") + n("ry") * Math.sin((k * Math.PI) / 24),
      ]),
      true,
    );
  else if (o.type === "path") {
    const straight = straightPathPieces(o.attrs.d ?? "");
    for (const piece of straight ?? sampleFigurePath(o.attrs.d ?? "", 16) ?? [])
      chain(piece);
  }
  return { index: -1, angle: false, lines, circles };
}

function readLabelFigure(svg: string) {
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
  const size = Math.max(viewBox[2], viewBox[3]);
  const matrices = nodes.map(elementMatrix);
  const kinds = figureAngleKinds(objects, viewBox);
  const first = (value: string | undefined) => {
    const number = Number.parseFloat(value?.trim().split(/[\s,]+/)[0] ?? "");
    return Number.isFinite(number) ? number : 0;
  };
  const texts: TextPiece[] = [];
  const ink: InkPiece[] = [];
  objects.forEach((o, index) => {
    if (o.type === "text") {
      const raw = o.attrs["data-mj"] ?? o.text;
      const name = raw.replace(/[$\s]/g, "");
      const fontSize = first(o.attrs["font-size"]) || LABEL_FONT;
      const anchor = o.attrs["text-anchor"];
      const middle = ["middle", "central"].includes(
        o.attrs["dominant-baseline"] ?? "",
      );
      const baseline = applyPoint(matrices[index], [
        first(o.attrs.x) +
          (anchor === "middle" ? 0 : anchor === "end" ? -0.3 : 0.3) * fontSize,
        first(o.attrs.y) + (middle ? 0.32 * fontSize : 0),
      ]);
      const px = Number.parseFloat(o.attrs["data-px"] ?? ""),
        py = Number.parseFloat(o.attrs["data-py"] ?? "");
      const center: Point = [baseline[0], baseline[1] - 0.32 * fontSize];
      texts.push({
        index,
        id: o.id,
        text: raw,
        isName: POINT_NAME.test(name),
        owner:
          Number.isFinite(px) && Number.isFinite(py)
            ? applyPoint(parentMatrix(nodes[index]), [px, py])
            : center,
        center,
        fontSize,
        box: textBox(baseline[0], baseline[1], raw, fontSize),
      });
      return;
    }
    const piece = elementInk(o, matrices[index]);
    piece.index = index;
    piece.angle = isAngleKind(kinds.get(o.id));
    ink.push(piece);
  });
  // 찍은 점(작은 원) — 엔진 `self.points` 처럼 라벨이 피한다
  const dots = objects.flatMap((o, index): Point[] => {
    const r = Number.parseFloat(o.attrs.r ?? "");
    return o.type === "circle" && r > 0 && r <= 0.04 * size
      ? [applyPoint(matrices[index], [first(o.attrs.cx), first(o.attrs.cy)])]
      : [];
  });
  const named = texts.filter((t) => t.isName);
  // 크기·글꼴·색은 그림의 이름 글자를 따른다(없으면 아무 글자나) — 엔진 그림이면 엔진 값 그대로다
  const pool = named.length ? named : texts;
  const font = pool.length ? median(pool.map((t) => t.fontSize)) : undefined;
  return {
    objects,
    matrices,
    viewBox,
    size,
    ink,
    texts,
    /** 이름 붙은 점 · 찍은 점(엔진 `self.points`). */
    points: [...named.map((t) => t.owner), ...dots],
    font,
    family: pool
      .map((t) => objects[t.index].attrs["font-family"])
      .find((value) => value),
    color: pool
      .map((t) => objects[t.index].attrs.fill?.trim())
      .find((value) => value && /^#[\da-f]{3,6}$/i.test(value)),
    /** 엔진 크기의 몇 배로 그릴까 — 이름 글자 크기로, 글자가 없으면 그림 크기로. */
    k: font
      ? clamp(font / LABEL_FONT, 0.5, 3)
      : clamp(Math.max(viewBox[2], viewBox[3]) / 275, 0.5, 1),
  };
}
type LabelFigure = ReturnType<typeof readLabelFigure>;

/** 이 상자가 잉크를 밟나 — 엔진 `_label_hits_geometry`. `angleMarks` 가 거짓이면 각 표시는 안 센다. */
function hitsInk(box: Box, figure: LabelFigure, angleMarks: boolean) {
  if (figure.points.some((p) => pointInBox(p, box, 1.5))) return true;
  return figure.ink.some(
    (piece) =>
      (angleMarks || !piece.angle) &&
      (piece.lines.some(([a, b]) => segmentHitsBox(a, b, box)) ||
        piece.circles.some(({ c, r }) => circleHitsBox(c, r, box))),
  );
}
/**
 * 후보 자리의 값 — 엔진 `_candidate_cost`. 앞 수는 «딱딱한 충돌 수»(0이면 아무것도 안 밟는다),
 * 뒤 수는 차례·겹친 넓이로 매긴 벌점. 두 수를 차례로 견준다.
 */
function candidateCost(
  box: Box,
  figure: LabelFigure,
  occupied: readonly Box[],
  rank: number,
  distanceRank: number,
  angleMarks: boolean,
  ownPoint?: Point,
): [number, number] {
  let hard = 0;
  let cost = rank * 0.25 + distanceRank * 0.4;
  for (const other of occupied)
    if (boxesOverlap(box, other, 1)) {
      const ix = Math.max(
        0,
        Math.min(box[2], other[2]) - Math.max(box[0], other[0]),
      );
      const iy = Math.max(
        0,
        Math.min(box[3], other[3]) - Math.max(box[1], other[1]),
      );
      hard += 1;
      cost += ix * iy * 50;
    }
  for (const p of figure.points)
    if ((!ownPoint || length(p, ownPoint) > 1e-6) && pointInBox(p, box, 1.5)) {
      hard += 1;
      cost += 100;
    }
  for (const piece of figure.ink) {
    if (!angleMarks && piece.angle) continue;
    for (const [a, b] of piece.lines)
      if (segmentHitsBox(a, b, box)) {
        hard += 1;
        cost += 20;
      }
    for (const { c, r } of piece.circles)
      if (circleHitsBox(c, r, box)) {
        hard += 1;
        cost += 15;
      }
  }
  return [hard, cost];
}
/** 앞자리부터 차례로 견준다 — 같은 값이면 다음 자리로. */
function earlier(a: readonly number[], b: readonly number[]) {
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  return false;
}
const better = (a: [number, number], b: [number, number]) => earlier(a, b);

/**
 * 거절 이유에 쓰는 글자 요소의 이름 — 요소 목록과 같은 함수(«5번 글자 40°»). 요소 이름이 이미 내용을 담으므로
 * 내용을 다시 붙이지 않는다(브라우저 확인 2026-09-20: «글자 40° 40°» 가 나왔다).
 */
function describeText(
  figure: LabelFigure,
  index: number,
  context: FigureLabelContext,
) {
  const o = figure.objects[figure.texts[index].index];
  return (
    context.nameOf(o.id) ??
    `${objectName(o)} ${figureLabelSummary(figure.texts[index].text)}`
  );
}

// ── 각의 크기 글자 ───────────────────────────────────────────────────────
export interface AngleLabelCorner {
  at: Point;
  from: Point;
  to: Point;
  /** 각 표시(호·ㄱ자)의 반지름 — 밖으로 끌어낸 라벨의 지시선이 여기서 시작한다. */
  radius: number;
}

const unit = (from: Point, to: Point): Point => {
  const l = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return [(to[0] - from[0]) / l, (to[1] - from[1]) / l];
};
/** 지시선이 글자 앞에서 끊기는 거리 — 엔진 `_leader_stop_radius`(다가오는 방향으로 상자 경계까지). */
function leaderStop(text: string, fs: number, u: Point) {
  const box = textBox(0, 0, text, fs);
  const halfW = (box[2] - box[0]) / 2,
    halfH = (box[3] - box[1]) / 2;
  const margin = 2 + (HALO * fs) / LABEL_FONT / 2;
  if (!u[0] && !u[1]) return Math.max(halfW, halfH) + margin;
  return (
    Math.min(
      u[0] ? halfW / Math.abs(u[0]) : Infinity,
      u[1] ? halfH / Math.abs(u[1]) : Infinity,
    ) + margin
  );
}
/**
 * 지시선이 **그릴 값어치가 있는 길이**인가 — 엔진 `_leader_is_drawable`. 짧으면 변을 가로지르는
 * 같은 길이 눈금으로 읽혀 문항의 뜻이 달라진다. 문턱은 눈금 전장의 두 배.
 */
function leaderDrawable(
  anchor: Point,
  center: Point,
  text: string,
  fs: number,
  k: number,
) {
  const d = sub(center, anchor);
  const l = Math.hypot(d[0], d[1]);
  if (!l) return false;
  const stop = leaderStop(text, fs, [d[0] / l, d[1] / l]);
  return l - stop > 2 * (TICK_HALF * k * 2);
}

/**
 * 각의 크기 글자가 설 자리 — 엔진 `_angle_label_layout`. 이등분선 위 사다리에서 잉크를 안 밟는 자리를 고르고,
 * 없으면 두 변 중 한쪽 바로 바깥으로 끌어내 호에서 지시선을 긋는다. 밖에서도 못 비키면 가장 덜 나쁜 자리
 * (각 라벨은 늘 그려져야 한다 — 없으면 어느 각의 값인지가 아예 사라진다).
 */
function angleLabelLayout(
  corner: AngleLabelCorner,
  text: string,
  fs: number,
  figure: LabelFigure,
  occupied: readonly Box[],
) {
  const { at, from, to, radius } = corner;
  const a0 = Math.atan2(from[1] - at[1], from[0] - at[0]);
  const a1 = Math.atan2(to[1] - at[1], to[0] - at[0]);
  const delta = ((a1 - a0 + Math.PI) % (2 * Math.PI)) - Math.PI;
  const mid = a0 + delta / 2;
  const k = fs / LABEL_FONT;
  // 사다리는 «가장 가까운 다른 이름 붙은 점까지의 절반»에서 끊는다 — 그 너머는 옆 꼭짓점의 값으로 읽힌다
  const gaps = figure.points
    .map((p) => length(p, at))
    .filter((d) => d > Math.max(2, 0.15 * radius));
  const reach = gaps.length ? Math.min(...gaps) / 2 : Infinity;
  const step = Math.max(3.5 * k, 0.45 * fs);
  const ladder = Array.from(
    { length: 10 },
    (_, index) => ANGLE_LABEL_DISTANCE * k + index * step,
  ).filter((d) => d <= reach);
  const distances = ladder.length ? ladder : [ANGLE_LABEL_DISTANCE * k];
  const pad = (HALO * k) / 2 + 0.5;
  let best:
    { cost: [number, number, number]; center: Point; box: Box } | undefined;
  for (const [rank, distance] of distances.entries()) {
    const x = at[0] + distance * Math.cos(mid);
    const baseline = at[1] + distance * Math.sin(mid) + 0.32 * fs;
    const box = textBox(x, baseline, text, fs);
    const hits = hitsInk(box, figure, false);
    const [hard, value] = candidateCost(
      expandBox(box, pad),
      figure,
      occupied,
      rank,
      0,
      false,
    );
    const cost: [number, number, number] = [hits ? 1 : 0, hard, value];
    if (!best || earlier(cost, best.cost))
      best = { cost, center: [x, baseline], box };
    if (!cost[0] && !cost[1]) break;
  }
  if (!best!.cost[0])
    return { center: best!.center, box: best!.box, anchor: undefined };

  // ── 안쪽에 자리가 없다 → 밖으로 끌어내고 지시선을 긋는다 ──
  const anchor: Point = [
    at[0] + radius * Math.cos(mid),
    at[1] + radius * Math.sin(mid),
  ];
  const sign = delta >= 0 ? 1 : -1;
  // 치수가 달린 팔을 피한다(엔진: 각 라벨이 밀려나면 그 변의 치수가 자리를 잃는다)
  const taken = [from, to].map((arm) => dimensionOnArm(figure, at, arm));
  let chosen: { key: number[]; center: Point; box: Box } | undefined;
  for (const [farRank, far] of OUT_FAR.entries()) {
    const distance = radius + fs * far;
    for (const [armRank, arm] of [a0, a1].entries()) {
      const turn = armRank ? sign : -sign;
      for (const [turnRank, degrees] of OUT_TURN.entries()) {
        const direction = arm + turn * ((degrees * Math.PI) / 180);
        const x = at[0] + distance * Math.cos(direction);
        const baseline = at[1] + distance * Math.sin(direction) + 0.32 * fs;
        const box = textBox(x, baseline, text, fs);
        if (hitsInk(box, figure, false)) continue;
        const grown = expandBox(box, pad);
        if (occupied.some((other) => boxesOverlap(grown, other, 1))) continue;
        // 밖에 세우는 것과 지시선을 긋는 것은 **한 결정**이다 — 못 그을 자리면 세우지도 않는다
        if (!leaderDrawable(anchor, [x, baseline - 0.32 * fs], text, fs, k))
          continue;
        // 치수가 달린 팔을 피하는 것이 먼저, 그다음이 «가까이»·«덜 돌리기»·팔 차례(엔진과 같은 차례)
        const key = [taken[armRank] ? 1 : 0, farRank, turnRank, armRank];
        if (!chosen || earlier(key, chosen.key))
          chosen = { key, center: [x, baseline], box };
      }
    }
  }
  if (!chosen)
    return { center: best!.center, box: best!.box, anchor: undefined };
  return { center: chosen.center, box: chosen.box, anchor };
}

/** 이 팔 위를 재는 치수(점선 곡선)가 있나 — 엔진 `_angle_label_layout` 의 `arm_taken`. */
function dimensionOnArm(figure: LabelFigure, at: Point, arm: Point) {
  const u = unit(at, arm);
  const armLength = length(at, arm);
  const onArm = (p: Point) => {
    const v = sub(p, at);
    const t = v[0] * u[0] + v[1] * u[1];
    const off = Math.abs(v[0] * u[1] - v[1] * u[0]);
    return off <= 0.25 && t >= -0.25 && t <= armLength + 0.25;
  };
  return figure.ink.some((piece) => {
    const o = figure.objects[piece.index];
    const dash = o.attrs["stroke-dasharray"] ?? "";
    if (o.type !== "path" || !dash || dash === "none") return false;
    const pieces = sampleFigurePath(o.attrs.d ?? "", 4);
    if (!pieces) return false;
    const ends = pieces
      .flatMap((list) => [list[0], list[list.length - 1]])
      .map((p) => applyPoint(figure.matrices[piece.index], p));
    return ends.length > 0 && ends.every(onArm);
  });
}

/**
 * 이 각에 **이미 크기 글자가 있나** — 있으면 그 요소 차례. 점 이름(A·B)은 세지 않는다.
 * 임자를 가르는 자는 엔진과 같다: 꼭짓점에서 «가장 가까운 다른 이름 붙은 점까지의 절반» 안, 그리고 밖으로
 * 끌어내는 한계(호 반지름 + 4.2 글자) 안. 방향은 각의 쐐기를 팔마다 66°(바깥 후보의 한계)까지 넓힌 안쪽.
 */
function angleLabelIndex(
  corner: AngleLabelCorner,
  fs: number,
  figure: LabelFigure,
) {
  const { at, from, to, radius } = corner;
  const u1 = unit(at, from),
    u2 = unit(at, to);
  const half = Math.acos(clamp(u1[0] * u2[0] + u1[1] * u2[1], -1, 1)) / 2;
  const bisector: Point = [u1[0] + u2[0], u1[1] + u2[1]];
  const bl = Math.hypot(bisector[0], bisector[1]);
  if (!bl) return -1;
  const gaps = figure.points
    .map((p) => length(p, at))
    .filter((d) => d > Math.max(2, 0.15 * radius));
  const reach = gaps.length ? Math.min(...gaps) / 2 : Infinity;
  const own = Math.min(radius + 4.2 * fs, Math.max(radius + 1.2 * fs, reach));
  const limit = half + (66 * Math.PI) / 180;
  return figure.texts.findIndex((t) => {
    if (t.isName) return false;
    const d = length(t.center, at);
    if (!(d > 0.3 * radius) || d > own) return false;
    const v = unit(at, t.center);
    return (
      Math.acos(clamp((v[0] * bisector[0] + v[1] * bisector[1]) / bl, -1, 1)) <=
      limit
    );
  });
}

/**
 * 각의 크기 글자를 더한다 — `addAngle` 의 `text`(원장님 2026-09-20 «각 B 에 40° 표시»).
 * 각 표시가 이미 있든(글자만 더한다) 방금 그렸든 같은 자리에 선다(엔진처럼 자기 각 표시는 잉크로 안 센다).
 */
export function addAngleSizeLabel(
  svg: string,
  corner: AngleLabelCorner,
  text: string,
  context: FigureLabelContext,
): { svg: string; leader: boolean } | { reason: string } {
  const figure = readLabelFigure(svg);
  const fs = figure.font ?? LABEL_FONT * figure.k;
  const twin = angleLabelIndex(corner, fs, figure);
  // 요소 이름(«글자 40°»)이 이미 글의 내용을 담는다 — 여기서 또 붙이면 «글자 40° 40°» 가 된다
  if (twin >= 0)
    return {
      reason: `이미 각의 크기 글자가 있습니다(${describeText(figure, twin, context)})`,
    };
  const k = fs / LABEL_FONT;
  const layout = angleLabelLayout(
    corner,
    text,
    fs,
    figure,
    figure.texts.map((t) => t.box),
  );
  const [x, baseline] = layout.center;
  const label = addFigureObject(
    svg,
    "text",
    { x: round3(x), y: round3(baseline) },
    { x: 0, y: 0 },
    text,
  );
  let next = editFigureObject(label.svg, label.id, {
    "font-size": fmt(fs),
    ...(figure.family ? { "font-family": figure.family } : {}),
    "text-anchor": "middle",
    fill: figure.color ?? INK,
    "paint-order": "stroke",
    stroke: "#ffffff",
    "stroke-width": fmt(HALO * k),
    "stroke-linejoin": "round",
  });
  const ink: Point[] = [
    [layout.box[0], layout.box[1]],
    [layout.box[2], layout.box[3]],
  ];
  if (layout.anchor) {
    const center: Point = [x, baseline - 0.32 * fs];
    const d = sub(center, layout.anchor);
    const l = Math.hypot(d[0], d[1]);
    const u: Point = [d[0] / l, d[1] / l];
    const stop = leaderStop(text, fs, u);
    const end: Point = [center[0] - u[0] * stop, center[1] - u[1] * stop];
    const bow = LEADER_BOW * (l - stop);
    const control: Point = [
      (layout.anchor[0] + end[0]) / 2 - u[1] * bow,
      (layout.anchor[1] + end[1]) / 2 + u[0] * bow,
    ];
    const line = addFigureObject(next, "curve", { x: 0, y: 0 }, { x: 1, y: 1 });
    next = editFigureObject(line.svg, line.id, {
      d: `M ${fmt(layout.anchor[0])} ${fmt(layout.anchor[1])} Q ${fmt(control[0])} ${fmt(control[1])} ${fmt(end[0])} ${fmt(end[1])}`,
      stroke: INK,
      "stroke-width": fmt(ANGLE_MARK_WIDTH * k),
      "stroke-linecap": "round",
      fill: "",
    });
    ink.push(layout.anchor, control, end);
  }
  return {
    svg: widenFrame(next, ink, CANVAS_PAD * k),
    leader: layout.anchor !== undefined,
  };
}

// ── 점 이름 ──────────────────────────────────────────────────────────────
const COMPASS: Record<string, Point> = {
  N: [0, -1],
  NE: [Math.SQRT1_2, -Math.SQRT1_2],
  E: [1, 0],
  SE: [Math.SQRT1_2, Math.SQRT1_2],
  S: [0, 1],
  SW: [-Math.SQRT1_2, Math.SQRT1_2],
  W: [-1, 0],
  NW: [-Math.SQRT1_2, -Math.SQRT1_2],
};
const COMPASS_ORDER = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/**
 * 이 점의 **바깥** — 붙은 변들의 반대 방향(외각 이등분선, 엔진 `_outward_vector`). 합이 짧으면(선분 위의 점·두 현의
 * 교점) 바깥이 없다 — 못 가르는 것을 가른 척하면 틀린 자리를 «근거 있는 자리»로 만든다.
 */
function outwardVector(at: Point, figure: LabelFigure, tolerance: number) {
  let sx = 0,
    sy = 0,
    incident = 0;
  for (const piece of figure.ink)
    for (const [a, b] of piece.lines)
      for (const [end, other] of [
        [a, b],
        [b, a],
      ] as [Point, Point][]) {
        if (length(end, at) > tolerance) continue;
        const l = length(at, other);
        if (!(l > 1e-6)) continue;
        sx += (other[0] - at[0]) / l;
        sy += (other[1] - at[1]) / l;
        incident += 1;
      }
  if (!incident) return undefined;
  const l = Math.hypot(sx, sy);
  return l < OUTWARD_MIN ? undefined : ([-sx / l, -sy / l] as Point);
}

/** 여덟 방향을 바깥 기준으로 다시 매긴다 — 자리 집합은 그대로 두고 차례만(엔진 `_label_vectors`). */
function labelVectors(outward: Point | undefined, position?: string): Point[] {
  if (position) return [COMPASS[position]];
  const base = COMPASS_ORDER.map((key) => COMPASS[key]);
  if (!outward) return base;
  // 세로 성분을 눌러 수평 쪽으로 당긴다(`_LABEL_PULL`)
  const target = Math.atan2(LABEL_PULL * outward[1], outward[0]);
  const turn = (v: Point) => {
    const d = Math.atan2(v[1], v[0]) - target;
    return Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
  };
  return [...base].sort((a, b) => turn(a) - turn(b));
}

/**
 * 이 자리에 이미 점 이름이 있나 / 이 이름을 이미 쓰고 있나 — 있으면 그 요소 차례.
 * 같은 이름이 둘이면 요소 목록의 `names` 가 둘 다 버려(어느 쪽인지 모르니) **다음 요청에서 부를 수 없다.**
 */
function namedAlready(
  figure: LabelFigure,
  at: Point,
  text: string,
  tol: number,
) {
  const name = visibleText(text).replace(/\s/g, "");
  const here = figure.texts.findIndex(
    (t) => t.isName && length(t.owner, at) <= tol,
  );
  const same = figure.texts.findIndex(
    (t) => t.isName && visibleText(t.text).replace(/\s/g, "") === name,
  );
  return { here, same };
}

/**
 * 점 이름이 설 자리 — 엔진 `_place_labels`: 바깥 차례의 여덟 방향 × 다섯 거리
 * `label_offset + 0.18×글자 + 자리순위 × max(3.5, 0.55×글자)`. 엔진은 자리를 못 얻으면 던지지만(그림을 다시 그리면
 * 되니까) 우리는 **가장 덜 나쁜 자리**를 쓴다 — 이름 없는 점을 남기는 것보다 조금 붙은 이름이 낫다.
 * `skip` 은 자기 자신(자리 고치기 때 옛 자리를 겹침으로 세지 않는다).
 */
function pointLabelLayout(
  at: Point,
  text: string,
  fs: number,
  figure: LabelFigure,
  tolerance: number,
  position?: string,
  skip?: number,
) {
  const k = fs / LABEL_FONT;
  const occupied = figure.texts
    .filter((t) => t.index !== skip)
    .map((t) => t.box);
  const vectors = labelVectors(outwardVector(at, figure, tolerance), position);
  let best: { cost: [number, number]; center: Point; box: Box } | undefined;
  for (const [rank, [ux, uy]] of vectors.entries())
    for (let distanceRank = 0; distanceRank < 5; distanceRank++) {
      const distance =
        LABEL_OFFSET * k +
        0.18 * fs +
        distanceRank * Math.max(3.5 * k, 0.55 * fs);
      const x = at[0] + ux * distance;
      const baseline = at[1] + uy * distance + 0.32 * fs;
      const box = textBox(x, baseline, text, fs);
      const cost = candidateCost(
        box,
        figure,
        occupied,
        rank,
        distanceRank,
        true,
        at,
      );
      if (!best || better(cost, best.cost))
        best = { cost, center: [x, baseline], box };
    }
  return best!;
}

/**
 * 이미 있는 점 이름의 자리를 다시 잡는다 — `relabel`(원장님 2026-08-25 «텍스트가 선을 침범한다»).
 * 더하기와 **같은 규칙**으로 고르고, 끌어 옮긴 자리(`transform`)는 지운다. 임자 점을 모르면 손대지 않는다 —
 * 어느 점의 이름인지 모르는 채로 옮기면 엉뚱한 점에 붙는다.
 */
export function relocateFigureLabel(
  svg: string,
  id: string,
  position: string | undefined,
): { svg: string; moved: boolean } | { reason: string } {
  const figure = readLabelFigure(svg);
  const index = figure.objects.findIndex((o) => o.id === id);
  const label = figure.texts.find((t) => t.index === index);
  if (!label) return { reason: "글자 요소가 아닙니다" };
  if (!label.isName)
    return {
      reason: "점 이름이 아닙니다(각의 크기 글자는 지우고 다시 답니다)",
    };
  const o = figure.objects[index];
  const px = Number.parseFloat(o.attrs["data-px"] ?? "");
  const tol = Math.max(1, 0.01 * figure.size);
  // 엔진 라벨은 제 점을 적어 둔다. 안 적혀 있으면 가까운 꼭짓점을 임자로 본다(요소 목록의 이름 찾기와 같은 자)
  let at = label.owner;
  if (!Number.isFinite(px)) {
    const vertices = figure.ink.flatMap((piece) =>
      piece.lines.flatMap(([a, b]) => [a, b]),
    );
    let near = 0.12 * figure.size;
    let found: Point | undefined;
    for (const v of vertices) {
      const d = length(v, label.center);
      if (d <= near) [found, near] = [v, d];
    }
    if (!found) return { reason: "어느 점의 이름인지 알 수 없습니다" };
    at = found;
  }
  const fs = label.fontSize;
  const { center, box } = pointLabelLayout(
    at,
    label.text,
    fs,
    figure,
    tol,
    position,
    index,
  );
  const node = [...readFigureSvg(svg).querySelectorAll("[data-object-id]")][
    index
  ];
  const inverse = invert(parentMatrix(node));
  if (!inverse) return { reason: "변환 때문에 옮길 수 없습니다" };
  const [lx, ly] = applyPoint(inverse, center);
  const moved =
    Math.hypot(
      center[0] - label.center[0],
      center[1] - label.center[1] - 0.32 * fs,
    ) > 0.05;
  const next = editFigureObject(svg, id, {
    x: fmt(lx),
    y: fmt(ly),
    transform: "",
    "data-px": fmt(at[0]),
    "data-py": fmt(at[1]),
  });
  return {
    svg: widenFrame(
      next,
      [
        [box[0], box[1]],
        [box[2], box[3]],
      ],
      CANVAS_PAD * (fs / LABEL_FONT),
    ),
    moved,
  };
}

/**
 * 점 이름을 더한다 — `addLabel`(원장님 2026-09-20 «이 꼭짓점을 D 로»). 엔진 꼭짓점 라벨 규칙 그대로
 * (바깥 차례의 여덟 방향 × 다섯 거리). 엔진과 달리 자리를 못 얻어도 던지지 않고 **가장 덜 나쁜 자리**에 세운다 —
 * 이름 없는 점을 남기는 것보다 조금 붙은 이름이 낫다(원장님은 이름을 붙여 달라고 하셨다).
 */
export function addFigureLabel(
  svg: string,
  command: FigureLabelCommand,
  context: FigureLabelContext,
): { svg: string; text: string } | { reason: string } {
  const asked = context.resolve(command.at);
  const figure = readLabelFigure(svg);
  // 요소 목록은 점 자리를 소수 첫째 자리로 싣는다 — 0.1 안의 실제 꼭짓점·찍은 점이 있으면 그 자리로
  const vertices = [
    ...figure.ink.flatMap((piece) => piece.lines.flatMap(([a, b]) => [a, b])),
    ...figure.points,
  ];
  let at: Point = [asked.x, asked.y];
  let snap = 0.1;
  for (const v of vertices) {
    const d = length(v, at);
    if (d <= snap) [at, snap] = [v, d];
  }
  const tol = Math.max(1, 0.01 * figure.size);
  const { here, same } = namedAlready(figure, at, command.text, tol);
  const describe = (index: number) => describeText(figure, index, context);
  if (here >= 0)
    return { reason: `이미 점 이름이 있습니다(${describe(here)})` };
  if (same >= 0)
    return { reason: `이미 그림에 있는 이름입니다(${describe(same)})` };

  const fs = figure.font ?? LABEL_FONT * figure.k;
  const k = fs / LABEL_FONT;
  const { center, box } = pointLabelLayout(
    at,
    command.text,
    fs,
    figure,
    tol,
    command.position,
  );
  const added = addFigureObject(
    svg,
    "text",
    { x: round3(center[0]), y: round3(center[1]) },
    { x: 0, y: 0 },
    command.text,
  );
  const next = editFigureObject(added.svg, added.id, {
    "font-size": fmt(fs),
    ...(figure.family ? { "font-family": figure.family } : {}),
    "text-anchor": "middle",
    fill: figure.color ?? INK,
    // 엔진 꼭짓점 라벨처럼 **제 점을 적어 둔다** — 그래야 다음 요청의 이름 목록(figurePointNames)에 뜬다
    "data-px": fmt(at[0]),
    "data-py": fmt(at[1]),
  });
  return {
    svg: widenFrame(
      next,
      [
        [box[0], box[1]],
        [box[2], box[3]],
      ],
      CANVAS_PAD * k,
    ),
    text: figureLabelOpLabel(command),
  };
}
