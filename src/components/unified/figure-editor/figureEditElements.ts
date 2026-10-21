import {
  FIGURE_EDIT_MAX_ELEMENTS,
  FIGURE_EDIT_MAX_POINTS,
  type FigureEditElement,
  type FigureEditFigure,
} from "@/lib/dev-ai/figure-edit-contract";
import {
  figureNumbers,
  figureObjects,
  readFigureSvg,
} from "./figureSvgEditing";
import { figureHandles } from "./figureHandles";
import { objectName } from "./figureObjectNames";
import { figureAngleKinds } from "./figureObjectGroups";
import { isSizeLocked } from "./figureSizeLock";
import { figureAssetRootFrame } from "./figureAssetGeometry";
import {
  applyPoint,
  elementMatrix,
  parentMatrix,
  scaleOf,
  type Point,
} from "./figureEditGeometry";

type FigureObject = ReturnType<typeof figureObjects>[number];

const first = (value: string | undefined) => {
  const number = Number.parseFloat(value?.trim().split(/[\s,]+/)[0] ?? "");
  return Number.isFinite(number) ? number : 0;
};

/**
 * 옮길 수 있는 점 — 편집기 조절점 가운데 모양을 정하는 점(선분 시작·끝 · 다각형·경로 꼭짓점 · 사각형 네 모서리).
 * 차례가 곧 수정 명령 `point` 의 `vertex`(1부터)다. 원·타원·글자는 없다(자리는 «옮기기»로 바꾼다).
 */
export function figureEditVertices(
  o: FigureObject,
): { key: string; point: Point }[] {
  if (o.type === "circle" || o.type === "ellipse" || o.type === "text")
    return [];
  if (o.attrs["data-function"]) return [];
  return figureHandles(o)
    .filter((handle) => !handle.control)
    .map((handle) => ({ key: handle.key, point: [handle.x, handle.y] }));
}

/** 요소 목록에 싣는 핵심 좌표(요소 좌표) — 꼭짓점, 없으면 원 중심·글자 자리. */
function keyPoints(o: FigureObject): Point[] {
  if (o.type === "circle" || o.type === "ellipse")
    return [[first(o.attrs.cx), first(o.attrs.cy)]];
  if (o.type === "text") return [[first(o.attrs.x), first(o.attrs.y)]];
  return figureEditVertices(o).map((vertex) => vertex.point);
}

const tenth = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
};
const roundPoint = ([x, y]: Point): Point => [tenth(x), tenth(y)];
/** 색 값은 짧은 이름·#hex·none 만 싣는다(url(#…) 같은 참조는 AI 에게 쓸모가 없다). */
const plainColor = (value: string | undefined) =>
  value && /^(?:#[\da-f]{3,8}|[a-z]{3,20})$/i.test(value.trim())
    ? value.trim()
    : undefined;

function styleValue(node: Element, o: FigureObject, name: string) {
  const styled = (node as SVGElement).style?.getPropertyValue(name);
  return styled || o.attrs[name];
}

/** 경계 상자 — 꼭짓점을 싣지 못한 곡선(함수 그래프·긴 꺾은선)을 위해. */
function boxOf(o: FigureObject, node: Element) {
  const values = (o.attrs.d ?? o.attrs.points ?? "").match(
    /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi,
  );
  if (!values || values.length < 2) return undefined;
  const matrix = elementMatrix(node);
  const points = values
    .map(Number)
    .flatMap((x, i, all) =>
      i % 2 || i + 1 >= all.length ? [] : [applyPoint(matrix, [x, all[i + 1]])],
    );
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  return [
    tenth(Math.min(...xs)),
    tenth(Math.min(...ys)),
    tenth(Math.max(...xs)),
    tenth(Math.max(...ys)),
  ] as [number, number, number, number];
}

/**
 * 검증된 실물 조각의 보수적인 틀 상자 — 경로의 숫자를 좌표 쌍으로 추측하지 않는다.
 * AI 에게는 조각 하나를 요소 한 줄(이름 + 상자)로만 보낸다 — 안의 도형 수십 개를 늘어놓지 않는다(math-figure-editor).
 */
function assetBox(node: Element) {
  const frame = figureAssetRootFrame(node);
  if (!frame) return undefined;
  const xs = frame.map(([x]) => x), ys = frame.map(([, y]) => y);
  return [tenth(Math.min(...xs)), tenth(Math.min(...ys)), tenth(Math.max(...xs)), tenth(Math.max(...ys))] as [
    number,
    number,
    number,
    number,
  ];
}

/** 점 이름 라벨(A · P′ · A_1 …) — 곡선 뒤집기(figureFlip.ts)도 «값 글자가 아닌 것»을 이것으로 가른다. */
export const POINT_NAME = /^[A-Z](?:'{1,2}|′{1,2}|_?\{?\d{1,2}\}?)?$/;

/**
 * 라벨로 이름 붙은 점 — 도형 엔진 라벨은 자기 점을 `data-px`·`data-py` 로 적어 둔다(v2). 그 자리의 꼭짓점을 쓰고,
 * 적어 두지 않은 라벨은 가까운 꼭짓점을 어림한다. 대문자 한 글자(+ ′ · 아래 번호)만 — 길이 숫자·소문자 변 이름은 점이 아니다.
 * 같은 이름이 둘이면 어느 쪽인지 모르니 싣지 않는다.
 */
function pointNames(
  objects: FigureObject[],
  nodes: Element[],
  size: number,
): FigureEditFigure["names"] {
  const candidates: Point[] = objects.flatMap((o, i) =>
    o.type === "text"
      ? []
      : keyPoints(o).map((p) => applyPoint(elementMatrix(nodes[i]), p)),
  );
  const nearest = (at: Point, limit: number) => {
    let best: Point | undefined,
      distance = limit;
    for (const candidate of candidates) {
      const d = Math.hypot(candidate[0] - at[0], candidate[1] - at[1]);
      if (d <= distance) {
        best = candidate;
        distance = d;
      }
    }
    return best;
  };
  const found = new Map<string, Point | null>();
  objects.forEach((o, i) => {
    if (o.type !== "text") return;
    const name = (o.attrs["data-mj"] ?? o.text).replace(/[$\s]/g, "");
    if (!POINT_NAME.test(name)) return;
    const px = Number.parseFloat(o.attrs["data-px"] ?? ""),
      py = Number.parseFloat(o.attrs["data-py"] ?? "");
    let at: Point | undefined;
    if (Number.isFinite(px) && Number.isFinite(py)) {
      // 라벨을 끌어 옮겨도 점은 그대로다 — 라벨 자신의 transform 은 빼고 부모 변환만
      const anchor = applyPoint(parentMatrix(nodes[i]), [px, py]);
      at = nearest(anchor, 0.02 * size) ?? anchor;
    } else {
      const fontSize = first(o.attrs["font-size"]) || 18;
      const anchor = o.attrs["text-anchor"];
      const middle = ["middle", "central"].includes(
        o.attrs["dominant-baseline"] ?? "",
      );
      const center = applyPoint(elementMatrix(nodes[i]), [
        first(o.attrs.x) +
          (anchor === "middle" ? 0 : anchor === "end" ? -0.3 : 0.3) * fontSize,
        first(o.attrs.y) - (middle ? 0 : 0.35 * fontSize),
      ]);
      at = nearest(center, 0.12 * size);
    }
    if (!at) return;
    found.set(name, found.has(name) ? null : at);
  });
  const names = [...found].flatMap(([name, at]) =>
    at ? [{ name, x: at[0], y: at[1] }] : [],
  );
  return names.length ? names.slice(0, 60) : undefined;
}

function viewBoxOf(doc: Document): [number, number, number, number] {
  const parsed = doc.documentElement
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  return parsed?.length === 4 &&
    parsed.every(Number.isFinite) &&
    parsed[2] > 0 &&
    parsed[3] > 0
    ? [parsed[0], parsed[1], parsed[2], parsed[3]]
    : [0, 0, 480, 360];
}

/**
 * 이름 붙은 점의 **정확한** 자리(그림 좌표) — 요소 목록(`describeFigureForEdit`)은 0.1 로 반올림해 싣는다.
 * 코드가 계산하는 명령(수선의 발 · 원의 반지름 · 중점 · 교점, figureShapeOps.ts)은 이것으로 그림의 점 그대로 잰다.
 */
export function figurePointNames(svg: string) {
  const doc = readFigureSvg(svg);
  const [, , width, height] = viewBoxOf(doc);
  return (
    pointNames(
      figureObjects(svg),
      [...doc.querySelectorAll("[data-object-id]")],
      Math.max(width, height),
    ) ?? []
  );
}

/**
 * «요청대로 고치기»에 보내는 지금 그림 — 편집기 번호(요소 목록·그림 위 번호 = 요소에 붙은 고정 번호 `figureNumbers`) 그대로,
 * 번호 차례로 싣는다(그리는 차례가 아니다 — 맨 뒤로 보낸 «5번»도 5번 자리에 5번으로 간다, 원장님 2026-09-21).
 * 종류 · 사용자가 이름 붙인 묶음 · 글자 · 핵심 좌표(그림 좌표) · 서식 · 크기 고정을 싣는다.
 * 편집기 목록의 역할 어림(x축·눈금 …)은 싣지 않는다 — 직각 표시를 축 화살촉으로 읽어 직각삼각형 변을 «x축»·«y축»으로
 * 묶는 일이 있다(2026-09-19 브라우저 확인). 틀릴 수 있는 어림보다 그림 이미지의 번호가 낫다.
 */
export function describeFigureForEdit(svg: string): FigureEditFigure {
  const doc = readFigureSvg(svg);
  const nodes = [...doc.querySelectorAll("[data-object-id]")];
  const objects = figureObjects(svg);
  const viewBox = viewBoxOf(doc);
  // 종류 이름은 편집기 요소 목록·오른쪽 칸 제목과 같은 함수(`objectName`) — 각 표시는 직각·예각·둔각
  const angles = figureAngleKinds(objects, viewBox);
  const numbers = figureNumbers(svg);
  const nodeOf = new Map(
    nodes.map((node) => [node.getAttribute("data-object-id")!, node]),
  );
  const elements = [...objects]
    .sort((a, b) => numbers.get(a.id)! - numbers.get(b.id)!)
    .slice(0, FIGURE_EDIT_MAX_ELEMENTS)
    .map((o): FigureEditElement => {
      const node = nodeOf.get(o.id)!;
      const matrix = elementMatrix(node);
      const element: FigureEditElement = {
        n: numbers.get(o.id)!,
        kind: objectName(o, angles),
      };
      const group = o.attrs["data-group"]?.trim();
      if (group) element.role = group.slice(0, 40);
      if (o.type === "text")
        element.text = (o.attrs["data-mj"] ?? o.text).slice(0, 200);
      if (o.attrs["data-asset"] !== undefined) {
        const box = assetBox(node);
        if (box) element.box = box;
        if (isSizeLocked(o)) element.locked = true;
        return element;
      }
      const points = keyPoints(o);
      if (points.length && points.length <= FIGURE_EDIT_MAX_POINTS)
        element.points = points.map((p) => roundPoint(applyPoint(matrix, p)));
      else if (
        o.type === "path" ||
        o.type === "polyline" ||
        o.type === "polygon"
      ) {
        const box = boxOf(o, node);
        if (box) element.box = box;
      }
      if (o.type === "circle")
        element.r = tenth(first(o.attrs.r) * scaleOf(matrix));
      if (o.type === "ellipse") {
        element.rx = tenth(first(o.attrs.rx) * scaleOf(matrix));
        element.ry = tenth(first(o.attrs.ry) * scaleOf(matrix));
      }
      if (o.type === "text") {
        const color = plainColor(styleValue(node, o, "fill"));
        if (color) element.color = color;
        const fontSize = first(styleValue(node, o, "font-size"));
        if (fontSize > 0) element.fontSize = tenth(fontSize);
      } else {
        const color = plainColor(styleValue(node, o, "stroke"));
        if (color) element.color = color;
        const width = first(styleValue(node, o, "stroke-width"));
        if (width > 0) element.width = Math.round(width * 100) / 100;
        const dash = styleValue(node, o, "stroke-dasharray");
        if (dash && dash !== "none") element.dashed = true;
        const fill = plainColor(styleValue(node, o, "fill"));
        if (fill) element.fill = fill;
      }
      if (isSizeLocked(o)) element.locked = true;
      return element;
    });
  const names = pointNames(
    objects,
    nodes,
    Math.max(viewBox[2], viewBox[3]),
  )?.map(({ name, x, y }) => ({ name, x: tenth(x), y: tenth(y) }));
  return { viewBox, elements, ...(names ? { names } : {}) };
}
