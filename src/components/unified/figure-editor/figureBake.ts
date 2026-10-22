/**
 * 도형 편집기 — 고른 요소에 **변환 하나를 걸어 좌표로 적는 한 엔진**. 90° 회전(figureRotate.ts)과
 * 대칭(figureMirror.ts)이 같이 쓴다(원장님 2026-09-20 «회전과 같이 편집기 단추와 AI 명령이 한 함수»).
 * 거는 변환만 다르고 규칙은 하나다 — 그래서 회전에서 고친 것이 대칭에도 그대로 간다.
 *
 * - 변환은 고른 것 전체의 경계 상자(그림 좌표)를 받아 정한다 — 여럿·묶음은 **한 덩어리로** 움직인다.
 *   상자는 도형 요소의 점(끝점·꼭짓점·곡선 조절점·원/타원의 정확한 상자)으로 잰다. 글자는 넣지 않는다:
 *   글자는 움직여도 모양이 그대로라 상자에 넣으면 제자리로 돌아오지 않고, 화면에서 잰 글자 가운데(소수 여러 자리)가
 *   들어가면 선 좌표에 떠돌이 자릿수가 붙는다(정밀 수치 칸에 보인다). 글자만 골랐으면 글자 가운데들의 상자로.
 * - **좌표를 그대로 적는다**(변환 행렬을 덧씌우지 않는다) — 정밀 수치·조절점·노란 점·면 계산이 새 모양을 그대로 읽는다.
 *   요소의 조상·자기 transform 은 그대로 두고, 그 좌표계로 옮긴 변환(요소 좌표 → 그림 좌표 → 변환 → 되돌림)을 점에 건다.
 *   축에 붙은 사각형·타원은 축에 붙은 채 폭과 높이가 바뀐다. 사각형은 사각형, 원은 원으로 남는다.
 *   거울 대칭은 **방향이 뒤집힌다** — 호(A)의 sweep 을 뒤집어야 곡선이 거울상으로 보인다(큰/작은 쪽 large 는 그대로).
 *   화살촉(marker)·다각형 점 차례는 건드리지 않는다: 좌표만 옮기니 화살표는 같은 끝에, 노란 점은 같은 변에 남는다.
 * - 좌표로 못 적는 요소는 자기 transform 에 변환을 합쳐 적는다(보이는 모양은 같다):
 *   함수 그래프(식과 곡선이 갈리지 않게 — 식을 고쳐 다시 그려도 그대로) · 자르기·가림·무늬(url)를 쓰는 요소 ·
 *   가로·세로 배율이 다른 변환 안의 원/타원/사각형/호 · 읽지 못한 경로.
 * - 글자는 똑바로 선 채 자리만 옮긴다(원장님 항목 22 «각도가 기울어지지 않게») — 끌어 옮기기처럼 앞에 translate 를
 *   붙인다(조판본이 새로 조판하지 않고 따라온다). 글자 배경은 조판 때 글자 묶음 안에 들어가 같이 간다.
 *   엔진 라벨의 임자 꼭짓점(`data-px`·`data-py`)은 그 꼭짓점이 같이 움직일 때 같이 간다.
 * - 선을 따라가는 면(채우기 통·안쪽 채우기)은 스스로 움직이지 않는다 — 둘러싼 선이 모두 움직이면 경로·씨앗 점을
 *   같이 옮겨(편집기 commit 의 면 맞추기가 같은 칸을 다시 찾게) 따라온다.
 * - 움직인 것(곡선은 곡선 자체, 글자는 조판한 상자)이 그림 틀 밖으로 나가면 넘친 쪽만 틀을 넓힌다
 *   (`widenFigureFrame` — 뒤집기·회전과 같은 한 함수). 줄이지는 않는다. 같은 원문에 적으니 되돌리기 한 걸음에 같이 간다.
 * 번호(요소 차례)·요소 이름·묶음 표시는 건드리지 않는다.
 */
import {
  applyPoint,
  applyVector,
  elementMatrix,
  invert,
  multiply,
  parentMatrix,
  parseTransform,
  type Affine,
  type Point,
} from "./figureEditGeometry";
import { isTiedFace } from "./figureFaceEditing";
import { FACE_ATTR, FACE_SEED_ATTR } from "./figureFaceSources";
import { sampleFigurePath } from "./figureFlip";
import { widenFigureFrame } from "./figureFrame";
import { isSizeLocked } from "./figureSizeLock";
import { figureAssetLocalFrame } from "./figureAssetGeometry";
import {
  editableFigureDoc,
  serializeFigureSvg,
  type figureObjects,
} from "./figureSvgEditing";

export type FigureObject = ReturnType<typeof figureObjects>[number];

/** 글자 상자(그림 좌표) — 가운데와 반폭·반높이. */
export interface TextBox {
  center: Point;
  half: Point;
}

export interface BakeOptions {
  /** 글자 가운데(그림 좌표) — 화면에서 잰 값. 없는 글자는 글자 크기로 어림한다. */
  textCenters?: ReadonlyMap<string, Point>;
  /**
   * 화면에서 잰 글자 상자(`measureTextBoxes`) — 가운데는 `textCenters` 대신 이것을 쓰고, 상자는 옮긴 뒤 틀 밖인지
   * 재는 데 쓴다(조판한 `\frac{1}{2}` 는 원문 글자 수 어림보다 훨씬 크다). 없는 글자는 글자 크기로 어림한다.
   */
  textBoxes?: ReadonlyMap<string, TextBox>;
}

const OBJECT = "data-object-id";
const NUMBER = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/y;
const NUMBERS = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;
const TRANSFORM_LIST =
  /^\s*(?:(?:matrix|translate|scale|rotate|skewX|skewY)\s*\([^)]*\)[\s,]*)+$/;
/** 한글·전각은 1em — `figureTextBackground` 의 어림과 같다. */
const FULL_WIDTH = /[ᄀ-ᇿ①-⓿⺀-鿿가-힯＀-￯※]/u;
/** 임자 꼭짓점을 찾는 거리 — 그림 긴 변의 2%(«요청대로 고치기»가 라벨 이름을 꼭짓점에 붙이는 거리와 같다). */
const OWNER_REACH = 0.02;

/** 소수 여섯째 자리 — 90° 회전·대칭은 더하기·빼기뿐이라 떠돌이 오차만 걷힌다(두 자리로 자르면 되짚었을 때 어긋난다). */
const clean = (value: number) => {
  const rounded = Math.round(value * 1e6) / 1e6;
  return Object.is(rounded, -0) ? 0 : rounded;
};
const text = (value: number) => String(clean(value));
const numbersOf = (value?: string | null) =>
  (value?.match(NUMBERS) ?? []).map(Number);
const first = (value?: string | null) => numbersOf(value)[0] ?? 0;
const pairs = (values: number[]): Point[] =>
  values.flatMap((x, i) =>
    i % 2 || i + 1 >= values.length ? [] : [[x, values[i + 1]] as Point],
  );

/** 변환을 다른 좌표계로 옮긴 것 — m 은 그 좌표계 → 그림 좌표. */
const conjugate = (m: Affine, motion: Affine): Affine | null => {
  const back = invert(m);
  return back && multiply(multiply(back, motion), m);
};

/** 닮음(회전·뒤집기·한 배율)인가 — 원·호가 그대로 원·호로 남는다. */
function similarity(l: Affine) {
  const [a, b, c, d] = l;
  const scale = Math.sqrt(Math.abs(a * d - b * c));
  const tolerance = 1e-9 * Math.max(1, scale);
  if (Math.abs(a - d) <= tolerance && Math.abs(b + c) <= tolerance)
    return { scale, flip: false };
  if (Math.abs(a + d) <= tolerance && Math.abs(b - c) <= tolerance)
    return { scale, flip: true };
  return null;
}

/** 축에 붙은 것이 축에 붙은 채 남는가 — 그대로(diagonal) · 가로세로가 바뀜(swap) · 아니면 null. */
function axisKind(l: Affine): "diagonal" | "swap" | null {
  const size = Math.max(...l.slice(0, 4).map(Math.abs));
  const tolerance = 1e-9 * Math.max(1, size);
  if (Math.abs(l[1]) <= tolerance && Math.abs(l[2]) <= tolerance)
    return "diagonal";
  if (Math.abs(l[0]) <= tolerance && Math.abs(l[3]) <= tolerance) return "swap";
  return null;
}

// ── 경로 ────────────────────────────────────────────────────

const ARGS: Record<string, number> = {
  m: 2,
  l: 2,
  h: 1,
  v: 1,
  c: 6,
  s: 4,
  q: 4,
  t: 2,
  a: 7,
  z: 0,
};
interface Segment {
  command: string;
  values: number[];
}

/** `d` 읽기 — 명령마다 인수 묶음 몇 개. 호의 두 플래그는 붙여 써도(`0110`) 한 글자씩. 읽지 못하면 null. */
function parsePath(d: string): Segment[] | null {
  const segments: Segment[] = [];
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
  const flag = () => {
    skip();
    const char = d[i];
    if (char !== "0" && char !== "1") return null;
    i++;
    return Number(char);
  };
  skip();
  while (i < d.length) {
    const command = d[i];
    const count = ARGS[command.toLowerCase()];
    if (count === undefined) return null;
    i++;
    const values: number[] = [];
    if (count)
      do {
        for (let k = 0; k < count; k++) {
          const arc = command.toLowerCase() === "a" && (k === 3 || k === 4);
          const value = arc ? flag() : number();
          if (value === null || !Number.isFinite(value)) return null;
          values.push(value);
        }
        skip();
      } while (i < d.length && !/[A-Za-z]/.test(d[i]));
    else skip();
    segments.push({ command, values });
  }
  return segments.length && /[Mm]/.test(segments[0].command) ? segments : null;
}

/**
 * 경로를 차례로 걷는다 — 인수 묶음마다 그 묶음이 시작하는 자리(절대 좌표)와 함께 부른다.
 * 맨 앞의 상대 이동(`m`)의 첫 점은 절대 좌표로 읽힌다(SVG 규칙).
 */
function walkPath(
  segments: readonly Segment[],
  visit: (
    segment: Segment,
    group: number[],
    from: Point,
    absolute: boolean,
  ) => void,
) {
  let current: Point = [0, 0],
    start: Point = [0, 0];
  segments.forEach((segment, index) => {
    const kind = segment.command.toLowerCase();
    const count = ARGS[kind];
    if (!count) {
      visit(segment, [], current, true);
      current = start;
      return;
    }
    for (let k = 0; k < segment.values.length; k += count) {
      const group = segment.values.slice(k, k + count);
      const absolute =
        segment.command !== kind || (index === 0 && k === 0 && kind === "m");
      visit(segment, group, current, absolute);
      const at = (x: number, y: number): Point =>
        absolute ? [x, y] : [current[0] + x, current[1] + y];
      current =
        kind === "h"
          ? [absolute ? group[0] : current[0] + group[0], current[1]]
          : kind === "v"
            ? [current[0], absolute ? group[0] : current[1] + group[0]]
            : at(group[count - 2], group[count - 1]);
      if (kind === "m" && k === 0) start = current;
    }
  });
}

/** 경로의 점(끝점·조절점, 요소 좌표) — 경계 상자와 임자 꼭짓점 찾기에 쓴다. */
function pathPoints(segments: readonly Segment[]) {
  const points: Point[] = [];
  walkPath(segments, (segment, group, from, absolute) => {
    const kind = segment.command.toLowerCase();
    const at = (x: number, y: number): Point =>
      absolute ? [x, y] : [from[0] + x, from[1] + y];
    if (kind === "h")
      points.push([absolute ? group[0] : from[0] + group[0], from[1]]);
    else if (kind === "v")
      points.push([from[0], absolute ? group[0] : from[1] + group[0]]);
    else if (kind === "a") points.push(at(group[5], group[6]));
    else
      for (let j = 0; j < group.length; j += 2)
        points.push(at(group[j], group[j + 1]));
  });
  return points;
}

/**
 * 경로 좌표를 l 로 옮긴 새 `d` — 명령 글자(절대·상대)는 그대로 둔다. 가로·세로 명령은 옮긴 뒤 축이 바뀌면 서로 바꾸고,
 * 비스듬해지면 선분 명령으로 적는다. 호는 닮음일 때만(아니면 null — 부르는 쪽이 자기 변환으로 돌린다).
 */
function transformPath(segments: readonly Segment[], l: Affine) {
  const axes = axisKind(l);
  const similar = similarity(l);
  if (!similar && segments.some((s) => s.command.toLowerCase() === "a"))
    return null;
  const out: { command: string; values: string[] }[] = [];
  const letterFor = (segment: Segment) => {
    const kind = segment.command.toLowerCase();
    if (kind !== "h" && kind !== "v") return segment.command;
    const next = !axes
      ? "l"
      : axes === "diagonal"
        ? kind
        : kind === "h"
          ? "v"
          : "h";
    return segment.command === kind ? next : next.toUpperCase();
  };
  let last: Segment | null = null;
  walkPath(segments, (segment, group, from, absolute) => {
    if (segment !== last) {
      out.push({ command: letterFor(segment), values: [] });
      last = segment;
    }
    const values = out.at(-1)!.values;
    const kind = segment.command.toLowerCase();
    const move = (x: number, y: number) =>
      absolute ? applyPoint(l, [x, y]) : applyVector(l, [x, y]);
    if (kind === "h" || kind === "v") {
      const [x, y] =
        kind === "h"
          ? move(group[0], absolute ? from[1] : 0)
          : move(absolute ? from[0] : 0, group[0]);
      const next = letterFor(segment).toLowerCase();
      values.push(
        ...(next === "l" ? [x, y] : [next === "h" ? x : y]).map(text),
      );
    } else if (kind === "a") {
      const [rx, ry, angle, large, sweep, x, y] = group;
      const { scale, flip } = similar!;
      const radians = (angle * Math.PI) / 180;
      const axis = applyVector(l, [Math.cos(radians), Math.sin(radians)]);
      // 원호(rx = ry)는 축 각도가 뜻이 없다 — 그대로 둔다(되짚으면 글자 그대로 돌아온다)
      const turned =
        rx === ry
          ? angle
          : ((((Math.atan2(axis[1], axis[0]) * 180) / Math.PI) % 360) + 360) %
            360;
      values.push(
        text(rx * scale),
        text(ry * scale),
        text(turned),
        String(large),
        String(flip ? 1 - sweep : sweep),
        ...move(x, y).map(text),
      );
    } else
      for (let j = 0; j < group.length; j += 2)
        values.push(...move(group[j], group[j + 1]).map(text));
  });
  return out
    .map(({ command, values }) => [command, ...values].join(" "))
    .join(" ");
}

// ── 요소 ────────────────────────────────────────────────────

const objectOf = (node: Element): FigureObject => ({
  id: node.getAttribute(OBJECT) ?? "",
  type: node.localName,
  text: node.textContent ?? "",
  attrs: Object.fromEntries([...node.attributes].map((a) => [a.name, a.value])),
});

/**
 * 좌표 대신 자기 변환으로 움직여야 하는 요소 — 함수 그래프(식이 곡선을 다시 그린다) · url 로 잇는 자르기·가림·무늬
 * (그것들은 요소 좌표계에 붙어 좌표만 돌리면 제자리에 남는다). 화살촉(marker)은 선 방향을 따라가니 괜찮다.
 */
const keepsFrame = (node: Element) =>
  node.hasAttribute("data-asset") ||
  node.hasAttribute("data-function") ||
  [...node.attributes].some(
    ({ name, value }) => !name.startsWith("marker") && /url\(/i.test(value),
  );

/** 요소 좌표의 점 — 경계 상자(원·타원은 따로)와 임자 꼭짓점 찾기에 쓴다. */
function localPoints(node: Element): Point[] {
  const n = (name: string) => first(node.getAttribute(name));
  switch (node.localName) {
    case "line":
      return [
        [n("x1"), n("y1")],
        [n("x2"), n("y2")],
      ];
    case "polyline":
    case "polygon":
      return pairs(numbersOf(node.getAttribute("points")));
    case "rect":
      return [
        [n("x"), n("y")],
        [n("x") + n("width"), n("y")],
        [n("x") + n("width"), n("y") + n("height")],
        [n("x"), n("y") + n("height")],
      ];
    case "circle":
    case "ellipse":
      return [[n("cx"), n("cy")]];
    case "path": {
      const segments = parsePath(node.getAttribute("d") ?? "");
      return segments ? pathPoints(segments) : [];
    }
  }
  return [];
}

/** 경계 상자에 넣을 점(그림 좌표). 원·타원은 변환 뒤의 정확한 상자 — 옮긴 뒤의 상자가 상자를 옮긴 것과 같다. */
function extentPoints(node: Element, m: Affine): Point[] {
  if (node.hasAttribute("data-asset")) {
    const frame = figureAssetLocalFrame(node);
    if (frame) return frame.map((point) => applyPoint(m, point));
    // A forged/edited asset must not bypass its registered-frame guard by
    // falling through to ordinary group geometry.
    if (node.localName === "g") return [];
  }
  if (node.localName === "g")
    return [...node.children].flatMap((child) =>
      extentPoints(child, multiply(m, parseTransform(child.getAttribute("transform") ?? ""))),
    );
  if (node.localName === "circle" || node.localName === "ellipse") {
    const n = (name: string) => first(node.getAttribute(name));
    const rx = node.localName === "circle" ? n("r") : n("rx"),
      ry = node.localName === "circle" ? n("r") : n("ry");
    const [x, y] = applyPoint(m, [n("cx"), n("cy")]);
    const hx = Math.hypot(m[0] * rx, m[2] * ry),
      hy = Math.hypot(m[1] * rx, m[3] * ry);
    return [
      [x - hx, y],
      [x + hx, y],
      [x, y - hy],
      [x, y + hy],
    ];
  }
  return localPoints(node).map((p) => applyPoint(m, p));
}

/**
 * 글자 상자 어림(요소 좌표) — 한글·전각 1em, 빈칸 0.25em, 나머지 0.55em, 가운데는 밑선에서 0.36em 위, 높이 1em.
 * 가운데는 회전 중심·자리 옮기기에, 반폭·반높이는 틀 넓히기에 쓴다.
 */
function estimateTextBox(node: Element): { center: Point; half: Point } {
  const size = first(node.getAttribute("font-size")) || 18;
  const x = first(node.getAttribute("x")),
    y = first(node.getAttribute("y"));
  const width =
    [...(node.textContent ?? "")].reduce(
      (sum, char) =>
        sum + (FULL_WIDTH.test(char) ? 1 : char === " " ? 0.25 : 0.55),
      0,
    ) * size;
  const anchor = node.getAttribute("text-anchor");
  const middle = ["middle", "central"].includes(
    node.getAttribute("dominant-baseline") ?? "",
  );
  return {
    center: [
      anchor === "middle"
        ? x
        : anchor === "end"
          ? x - width / 2
          : x + width / 2,
      middle ? y : y - 0.36 * size,
    ],
    half: [width / 2, size / 2],
  };
}

/** 요소 좌표의 반폭·반높이를 m 으로 옮긴 그림 좌표의 반폭·반높이 — 네 모서리를 옮긴 상자. */
function halfExtent(m: Affine, [hx, hy]: Point): Point {
  const corners = [
    [-hx, -hy],
    [hx, -hy],
    [hx, hy],
    [-hx, hy],
  ].map((p) => applyVector(m, p as Point));
  const xs = corners.map((p) => p[0]),
    ys = corners.map((p) => p[1]);
  return [
    (Math.max(...xs) - Math.min(...xs)) / 2,
    (Math.max(...ys) - Math.min(...ys)) / 2,
  ];
}

/** 요소가 그림에서 차지하는 자리(그림 좌표) — 곡선은 조절점이 아니라 곡선 위의 점, 원·타원은 정확한 상자. */
function inkPoints(node: Element): Point[] {
  const m = elementMatrix(node);
  // Registered current/legacy pictures keep their conservative container in
  // alignment too; recursive ink must not replace asset identity with a bbox.
  if (node.localName === "g" && node.hasAttribute("data-asset"))
    return extentPoints(node, m);
  if (node.localName === "g")
    return [...node.children].flatMap((child) => inkPoints(child));
  if (node.localName === "path") {
    const pieces = sampleFigurePath(node.getAttribute("d") ?? "", 12);
    if (pieces) return pieces.flat().map((p) => applyPoint(m, p));
  }
  return extentPoints(node, m);
}

/** 좌표를 l 로 옮겨 적는다 — 이 요소 모양으로 못 적으면 false(부르는 쪽이 자기 변환으로 건다). */
function bake(node: Element, l: Affine): boolean {
  const n = (name: string) => first(node.getAttribute(name));
  const set = (values: Record<string, number>) => {
    for (const [name, value] of Object.entries(values))
      node.setAttribute(name, text(value));
  };
  switch (node.localName) {
    case "line": {
      const [x1, y1] = applyPoint(l, [n("x1"), n("y1")]);
      const [x2, y2] = applyPoint(l, [n("x2"), n("y2")]);
      set({ x1, y1, x2, y2 });
      return true;
    }
    case "polyline":
    case "polygon":
      node.setAttribute(
        "points",
        pairs(numbersOf(node.getAttribute("points")))
          .map((p) => applyPoint(l, p).map(text).join(" "))
          .join(" "),
      );
      return true;
    case "rect":
    case "ellipse": {
      const axes = axisKind(l);
      if (!axes) return false;
      // 모서리 반지름 — 한쪽만 적혀 있으면 다른 쪽도 같다(SVG 규칙)
      const hasRx = node.hasAttribute("rx"),
        hasRy = node.hasAttribute("ry");
      const rx = hasRx ? n("rx") : n("ry"),
        ry = hasRy ? n("ry") : rx;
      const [nextRx, nextRy] =
        axes === "diagonal"
          ? [Math.abs(l[0]) * rx, Math.abs(l[3]) * ry]
          : [Math.abs(l[2]) * ry, Math.abs(l[1]) * rx];
      if (node.localName === "ellipse") {
        const [cx, cy] = applyPoint(l, [n("cx"), n("cy")]);
        set({ cx, cy, rx: nextRx, ry: nextRy });
        return true;
      }
      const [ax, ay] = applyPoint(l, [n("x"), n("y")]);
      const [bx, by] = applyPoint(l, [
        n("x") + n("width"),
        n("y") + n("height"),
      ]);
      set({
        x: Math.min(ax, bx),
        y: Math.min(ay, by),
        width: Math.abs(bx - ax),
        height: Math.abs(by - ay),
      });
      if (!hasRx && !hasRy) return true;
      if (hasRx || clean(nextRx) !== clean(nextRy)) set({ rx: nextRx });
      if (hasRy || clean(nextRx) !== clean(nextRy)) set({ ry: nextRy });
      return true;
    }
    case "circle": {
      const similar = similarity(l);
      if (!similar) return false;
      const [cx, cy] = applyPoint(l, [n("cx"), n("cy")]);
      set({ cx, cy, r: n("r") * similar.scale });
      return true;
    }
    case "path": {
      const segments = parsePath(node.getAttribute("d") ?? "");
      const d = segments && transformPath(segments, l);
      if (!d) return false;
      node.setAttribute("d", d);
      return true;
    }
  }
  return false;
}

/** 행렬 → transform 값. 단위면 "", 옮기기뿐이면 translate. */
function transformText(m: Affine) {
  const [a, b, c, d, e, f] = m.map(clean);
  if (a === 1 && b === 0 && c === 0 && d === 1)
    return e || f ? `translate(${e} ${f})` : "";
  return `matrix(${[a, b, c, d, e, f].join(" ")})`;
}

/** 자기 변환 앞에 k(부모 좌표계의 변환)를 합친다 — 읽을 수 있는 변환이면 한 행렬로 접는다(되짚으면 원래 값). */
function frame(node: Element, k: Affine) {
  const current = node.getAttribute("transform")?.trim() ?? "";
  const next =
    !current || TRANSFORM_LIST.test(current)
      ? transformText(multiply(k, parseTransform(current)))
      : `${transformText(k) || ""} ${current}`.trim();
  if (next) node.setAttribute("transform", next);
  else node.removeAttribute("transform");
}

/** 글자 옮기기 — 끌어 옮기기처럼 앞에 translate. 앞에 이미 translate 가 있으면 합친다(돌아오면 원래 값). */
function shift(node: Element, [dx, dy]: Point) {
  const current = node.getAttribute("transform")?.trim() ?? "";
  const lead = /^translate\(\s*([^\s,)]+)(?:[\s,]+([^\s,)]+))?\s*\)/.exec(
    current,
  );
  let x = dx,
    y = dy,
    rest = current;
  if (lead && Number.isFinite(+lead[1]) && Number.isFinite(+(lead[2] ?? 0))) {
    x += +lead[1];
    y += +(lead[2] ?? 0);
    rest = current.slice(lead[0].length).trim();
  }
  const head = clean(x) || clean(y) ? `translate(${text(x)} ${text(y)})` : "";
  const next = [head, rest].filter(Boolean).join(" ");
  if (next) node.setAttribute("transform", next);
  else node.removeAttribute("transform");
}

/**
 * 단추를 끌 이유의 **갈래** — 없으면 null. 문구는 부르는 쪽(회전·대칭)이 제 말로 적는다.
 * 크기 고정 요소가 섞임 · 선을 따라가는 면만 고름 · 글자 하나만 고름(글자는 자리만 옮기는데 상자 가운데가 제자리다).
 */
export function selectionBlockKind(
  objects: readonly FigureObject[],
  ids: readonly string[],
): "locked" | "face" | "text" | null {
  const wanted = new Set(ids);
  const chosen = objects.filter((o) => wanted.has(o.id));
  if (!chosen.length) return null;
  if (chosen.some(isSizeLocked)) return "locked";
  const moving = chosen.filter((o) => !isTiedFace(o));
  if (!moving.length) return "face";
  if (moving.length === 1 && moving[0].type === "text") return "text";
  return null;
}

/** 고른 것 전체의 경계 상자(그림 좌표) — 도형 요소의 점으로, 도형이 없으면 글자 가운데로 잰다. */
export interface SelectionBounds {
  min: Point;
  max: Point;
  center: Point;
}
/** 경계 상자를 받아 걸 변환을 정한다 — null 이면 그림을 그대로 둔다. */
export type SelectionMotion = (bounds: SelectionBounds) => Affine | null;

/**
 * 요소마다 **다른** 변환을 걸 때(정렬 — figureAlign.ts). 고른 요소 전부의 상자(요소 id → 상자, 그림 차례)와
 * 그것을 합친 바깥 상자를 받아 요소마다 걸 변환을 정한다. 돌려준 Map 에 없는 요소는 그대로 둔다
 * («고르게 벌리기»처럼 이웃을 봐야 정해지는 것이 있어 요소 하나씩이 아니라 전부를 한 번에 받는다).
 */
export type ObjectMotions = (
  boxes: ReadonlyMap<string, SelectionBounds>,
  whole: SelectionBounds,
) => ReadonlyMap<string, Affine> | null;

/** 고른 요소에 변환 하나를 한 덩어리로 걸어 좌표로 적은 새 원문. 걸 것이 없으면 원문 그대로. */
export function bakeFigureSelection(
  svg: string,
  ids: readonly string[],
  plan: SelectionMotion,
  options: BakeOptions = {},
): string {
  return runBake(svg, ids, options, (whole) => plan(whole));
}

/**
 * 고른 요소에 **요소마다 다른** 변환을 걸어 좌표로 적은 새 원문 — 정렬(figureAlign.ts)이 쓴다.
 * 규칙은 한 덩어리로 걸 때(위 문서)와 같다. 다른 것 둘:
 * - 상자는 «그림에서 차지하는 자리»(곡선은 곡선 위의 점, 글자는 조판한 상자)로 잰다 — 왼쪽을 맞추려면
 *   곡선의 조절점이 아니라 곡선이 닿는 왼쪽 끝이, 글자는 가운데가 아니라 상자의 왼쪽 끝이 기준이어야 한다.
 *   «전체 상자»도 그 상자들을 합친 것이다 — 회전·대칭이 중심을 잡는 상자와 달리 글자의 폭·높이가 들어간다.
 * - 선을 따라가는 면은 둘러싼 선이 **모두 같은 변환**으로 움직일 때만 따라간다(제각각이면 따라갈 수 없다).
 */
export function bakeFigureObjects(
  svg: string,
  ids: readonly string[],
  plan: ObjectMotions,
  options: BakeOptions = {},
): string {
  return runBake(svg, ids, options, (_, each) => {
    const boxes = each();
    if (!boxes.size) return null;
    const all = [...boxes.values()];
    const min: Point = [
      Math.min(...all.map((b) => b.min[0])),
      Math.min(...all.map((b) => b.min[1])),
    ];
    const max: Point = [
      Math.max(...all.map((b) => b.max[0])),
      Math.max(...all.map((b) => b.max[1])),
    ];
    const byId = new Map(
      [...boxes].map(([node, box]) => [node.getAttribute(OBJECT) ?? "", box]),
    );
    const planned = plan(byId, {
      min,
      max,
      center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2],
    });
    if (!planned?.size) return null;
    const motions = new Map<Element, Affine>();
    for (const node of boxes.keys()) {
      const motion = planned.get(node.getAttribute(OBJECT) ?? "");
      if (motion) motions.set(node, motion);
    }
    return motions.size ? motions : null;
  });
}

/** 걸 변환 — 하나면 고른 것 전부에, Map 이면 요소마다. `each()` 는 부를 때만 요소 상자를 잰다. */
type BakePlan = (
  whole: SelectionBounds,
  each: () => ReadonlyMap<Element, SelectionBounds>,
) => Affine | ReadonlyMap<Element, Affine> | null;

/** 두 변환이 같은가 — 면이 둘러싼 선을 따라갈 수 있는지 가른다. */
const sameMotion = (a: Affine, b: Affine) => a.every((v, i) => v === b[i]);

function runBake(
  svg: string,
  ids: readonly string[],
  options: BakeOptions,
  plan: BakePlan,
): string {
  const doc = editableFigureDoc(svg);
  const nodes = [...doc.querySelectorAll(`[${OBJECT}]`)];
  const objects = nodes.map(objectOf);
  if (!ids.length) return svg;
  const wanted = new Set(ids);
  const matrices = new Map(nodes.map((node) => [node, elementMatrix(node)]));
  const targets = nodes.filter(
    (node, i) =>
      wanted.has(objects[i].id) &&
      !isTiedFace(objects[i]) &&
      invert(matrices.get(node)!),
  );
  const isText = (node: Element) => node.localName === "text";

  // 글자 상자(그림 좌표) — 화면에서 잰 것이 있으면 그것, 없으면 글자 크기로 어림
  const textBoxes = new Map(
    targets.filter(isText).map((node): [Element, TextBox] => {
      const id = node.getAttribute(OBJECT)!;
      const measured = options.textBoxes?.get(id);
      if (measured) return [node, measured];
      const m = matrices.get(node)!;
      const estimate = estimateTextBox(node);
      return [
        node,
        {
          center:
            options.textCenters?.get(id) ?? applyPoint(m, estimate.center),
          half: halfExtent(m, estimate.half),
        },
      ];
    }),
  );

  // 경계 상자 — 도형 요소의 점(글자만 골랐으면 글자 가운데들)
  const shapeExtents = targets.flatMap((node) =>
    isText(node) ? [] : extentPoints(node, matrices.get(node)!),
  );
  const extents = shapeExtents.length
    ? shapeExtents
    : [...textBoxes.values()].map((box) => box.center);
  if (!extents.length) return svg;
  const xs = extents.map((p) => p[0]),
    ys = extents.map((p) => p[1]);
  const min: Point = [Math.min(...xs), Math.min(...ys)],
    max: Point = [Math.max(...xs), Math.max(...ys)];

  // 요소마다의 상자(그림에서 차지하는 자리) — 부를 때만 잰다(한 덩어리로 걸 때는 쓰지 않는다)
  let boxes: ReadonlyMap<Element, SelectionBounds> | null = null;
  const eachBounds = () => {
    if (boxes) return boxes;
    const found = new Map<Element, SelectionBounds>();
    for (const node of targets) {
      const box = textBoxes.get(node);
      const points: Point[] = box
        ? [
            [box.center[0] - box.half[0], box.center[1] - box.half[1]],
            [box.center[0] + box.half[0], box.center[1] + box.half[1]],
          ]
        : inkPoints(node);
      if (!points.length) continue;
      const px = points.map((p) => p[0]),
        py = points.map((p) => p[1]);
      const lo: Point = [Math.min(...px), Math.min(...py)],
        hi: Point = [Math.max(...px), Math.max(...py)];
      found.set(node, {
        min: lo,
        max: hi,
        center: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2],
      });
    }
    boxes = found;
    return boxes;
  };

  const planned = plan(
    { min, max, center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2] },
    eachBounds,
  );
  if (!planned) return svg;
  // 고른 요소에만 건다 — 임자 꼭짓점을 찾을 때 고르지 않은 요소의 꼭짓점이 «같이 움직인다»로 읽히면 안 된다.
  const motions: ReadonlyMap<Element, Affine> =
    planned instanceof Map
      ? planned
      : new Map(targets.map((node) => [node, planned as Affine]));
  const motionOf = (node: Element): Affine | null => motions.get(node) ?? null;
  const moved = targets.filter((node) => motionOf(node));
  if (!moved.length) return svg;

  // 임자 꼭짓점 — 움직이기 전 모든 도형의 점(그림 좌표)과 그 점이 든 요소
  const vertices = nodes
    .filter((node, i) => !isText(node) && !isTiedFace(objects[i]))
    .flatMap((node) =>
      localPoints(node).map((p) => ({
        at: applyPoint(matrices.get(node)!, p),
        node,
      })),
    );
  const view = numbersOf(doc.documentElement.getAttribute("viewBox"));
  const reach = OWNER_REACH * (Math.max(view[2] || 0, view[3] || 0) || 480);
  /** 라벨의 임자 꼭짓점이 어떻게 움직이는가 — 가까운 꼭짓점이 없으면 라벨을 따라 움직인다. */
  const ownerMotion = (at: Point, fallback: Affine | null): Affine | null => {
    let best: (typeof vertices)[number] | undefined,
      distance = reach;
    for (const vertex of vertices) {
      const d = Math.hypot(vertex.at[0] - at[0], vertex.at[1] - at[1]);
      if (d <= distance) {
        best = vertex;
        distance = d;
      }
    }
    return best ? motionOf(best.node) : fallback;
  };

  const moveShape = (node: Element, motion: Affine) => {
    const local = conjugate(matrices.get(node)!, motion);
    if (local && !keepsFrame(node) && bake(node, local)) return;
    const k = conjugate(parentMatrix(node), motion);
    if (k) frame(node, k);
  };
  // 글자는 안 움직여도 한 번 본다 — 임자 꼭짓점이 든 요소가 움직였으면 그 점은 따라가야 한다(정렬).
  for (const node of targets) {
    const motion = motionOf(node);
    if (!isText(node)) {
      if (motion) moveShape(node, motion);
      continue;
    }
    const parent = parentMatrix(node),
      back = invert(parent);
    if (!back) continue;
    if (motion) {
      const { center } = textBoxes.get(node)!;
      const [x, y] = applyPoint(motion, center);
      shift(node, applyVector(back, [x - center[0], y - center[1]]));
    }
    if (node.hasAttribute("data-px") && node.hasAttribute("data-py")) {
      const owner = applyPoint(parent, [
        first(node.getAttribute("data-px")),
        first(node.getAttribute("data-py")),
      ]);
      const turn = ownerMotion(owner, motion);
      if (turn) {
        const [px, py] = applyPoint(back, applyPoint(turn, owner));
        node.setAttribute("data-px", text(px));
        node.setAttribute("data-py", text(py));
      }
    }
  }

  // 선을 따라가는 면 — 둘러싼 선이 모두 **같은 변환으로** 움직이면 같이 간다
  // (씨앗 점은 면이 든 좌표계, 자기 변환 제외)
  const keyed = new Map(
    targets.flatMap((node) => {
      const key = node.getAttribute("id");
      return key ? [[key, node] as const] : [];
    }),
  );
  nodes.forEach((node, i) => {
    if (!isTiedFace(objects[i])) return;
    const faceKeys = (node.getAttribute(FACE_ATTR) ?? "")
      .split(/\s+/)
      .filter(Boolean);
    const owners = faceKeys.map((key) => keyed.get(key));
    if (!faceKeys.length || owners.some((owner) => !owner)) return;
    const shared = motionOf(owners[0]!);
    if (
      !shared ||
      owners.some((owner) => {
        const motion = motionOf(owner!);
        return !motion || !sameMotion(motion, shared);
      })
    )
      return;
    const seed = node.getAttribute(FACE_SEED_ATTR);
    const k = conjugate(parentMatrix(node), shared);
    if (seed !== null && k) {
      const [sx, sy] = applyPoint(k, [
        numbersOf(seed)[0] ?? 0,
        numbersOf(seed)[1] ?? 0,
      ]);
      node.setAttribute(FACE_SEED_ATTR, `${text(sx)} ${text(sy)}`);
    }
    moveShape(node, shared);
  });

  // 움직인 것이 틀 밖이면 넘친 쪽만 넓힌다(뒤집기와 같은 한 함수) — 글자는 옮긴 가운데에 제 상자를 얹는다
  const ink = moved.flatMap((node): Point[] => {
    if (!isText(node)) return inkPoints(node);
    const { center, half } = textBoxes.get(node)!;
    const [x, y] = applyPoint(motionOf(node)!, center);
    return [
      [x - half[0], y - half[1]],
      [x + half[0], y + half[1]],
    ];
  });
  widenFigureFrame(doc.documentElement, ink);
  return serializeFigureSvg(doc);
}

/**
 * 화면에서 잰 글자 상자(그림 좌표) — 조판한 라벨은 원문 글자 수로 어림하면 크게 어긋난다(`\frac{1}{2}` 가 11글자).
 * 캔버스의 조판본(`<g data-object-id>`)이나 `<text>` 의 상자를 루트 좌표로 옮긴다: 가운데는 상자 가운데를 옮긴 점,
 * 반폭·반높이는 네 모서리를 옮긴 상자. 글자는 자리만 옮기니 옮긴 뒤의 상자는 이 상자를 옮긴 것이다(틀 넓히기).
 * 화면 좌표는 float32 라 1e-5 쯤 떨린다 — 0.001 로 자른다. 안 자르면 옮긴 뒤 다시 잰 값이 조금씩 달라 되짚어도
 * 라벨에 `translate(-0.000008 0)` 같은 찌꺼기가 남았다(브라우저 실측 2026-09-19).
 */
export function measureTextBoxes(root: SVGSVGElement, ids: readonly string[]) {
  const boxes = new Map<string, TextBox>();
  const toRoot = root.getScreenCTM?.()?.inverse();
  if (!toRoot) return boxes;
  const thousandth = (value: number) => Math.round(value * 1000) / 1000;
  for (const id of ids) {
    const node = root.querySelector<SVGGraphicsElement>(`[${OBJECT}="${id}"]`);
    const box = node?.getBBox?.();
    const matrix = node?.getScreenCTM?.();
    if (!box || !matrix || !(box.width > 0 || box.height > 0)) continue;
    const toFigure = toRoot.multiply(matrix);
    const at = (x: number, y: number) =>
      new DOMPoint(x, y).matrixTransform(toFigure);
    const center = at(box.x + box.width / 2, box.y + box.height / 2);
    const corners = [
      at(box.x, box.y),
      at(box.x + box.width, box.y),
      at(box.x + box.width, box.y + box.height),
      at(box.x, box.y + box.height),
    ];
    const xs = corners.map((p) => p.x),
      ys = corners.map((p) => p.y);
    const half: Point = [
      thousandth((Math.max(...xs) - Math.min(...xs)) / 2),
      thousandth((Math.max(...ys) - Math.min(...ys)) / 2),
    ];
    if ([center.x, center.y, ...half].every(Number.isFinite))
      boxes.set(id, {
        center: [thousandth(center.x), thousandth(center.y)],
        half,
      });
  }
  return boxes;
}

/** 화면에서 잰 글자 가운데(그림 좌표) — `measureTextBoxes` 의 가운데만. */
export function measureTextCenters(
  root: SVGSVGElement,
  ids: readonly string[],
) {
  return new Map(
    [...measureTextBoxes(root, ids)].map(([id, box]) => [id, box.center]),
  );
}
