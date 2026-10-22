import type { Point } from "./figureEditGeometry";
import {
  cleanFigureForSave,
  editableFigureDoc,
  fitFigureViewport,
  serializeFigureSvg,
  withoutFigureNumbers,
} from "./figureSvgEditing";
import { typesetFigureSvg } from "./figureTypeset";

/**
 * 그림 틀(루트 viewBox) 넓히기 — 뒤집기(`flipFigureCurve`)와 90° 회전(`rotateFigureSelection`)이 같이 쓰는 한 함수.
 * 편집기는 틀만 보여 준다: 엔진 그림은 틀이 도형에 꼭 맞아, 아래로 뒤집은 «10» 이 편집 화면 밑에서 잘렸고
 * (2026-09-19 브라우저 확인) 넓은 그림을 돌리면 위아래가 잘렸다 — 원장님 2026-09-19 «틀을 넓혀 다 보이게».
 * - 밖으로 나간 쪽만, 여백 pad 를 두고 넓힌다. 안에 든 쪽은 그대로 — 줄이지는 않는다(네 번 돌아 제자리로 와도 넓힌 채).
 * - width·height 가 적혀 있으면 틀과 같은 비율로 늘린다(화면의 한 단위 크기가 그대로).
 * 저장할 때는 `fitFigureViewport` 가 다시 맞춘다.
 */

/** 기본 여백(그림 단위) — 선 굵기·화살촉이 틀 끝에 붙지 않을 만큼. */
export const FRAME_PAD = 6;

const round3 = (value: number) => Math.round(value * 1000) / 1000;
const text = (value: number) => {
  const rounded = Math.round(value * 1e6) / 1e6;
  return String(Object.is(rounded, -0) ? 0 : rounded);
};

/** 루트 요소의 틀을 그 자리에서 넓힌다 — 넓혔으면 true. 틀을 읽지 못하면 그대로. */
export function widenFigureFrame(
  root: Element,
  points: readonly Point[],
  pad = FRAME_PAD,
): boolean {
  if (!points.length) return false;
  const view = root
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (view?.length !== 4 || !view.every(Number.isFinite) || view[2] <= 0)
    return false;
  const [x, y, w, h] = view;
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const left = Math.min(...xs) < x ? Math.min(...xs) - pad : x;
  const top = Math.min(...ys) < y ? Math.min(...ys) - pad : y;
  const right = Math.max(...xs) > x + w ? Math.max(...xs) + pad : x + w;
  const bottom = Math.max(...ys) > y + h ? Math.max(...ys) + pad : y + h;
  if (left === x && top === y && right === x + w && bottom === y + h)
    return false;
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
  return true;
}

/** 원문의 틀을 점들이 들어가게 넓힌 새 원문 — 틀 안이면 원문 그대로. */
export function widenFrame(
  svg: string,
  points: readonly Point[],
  pad = FRAME_PAD,
): string {
  if (!points.length) return svg;
  const doc = editableFigureDoc(svg);
  return widenFigureFrame(doc.documentElement, points, pad)
    ? serializeFigureSvg(doc)
    : svg;
}

/**
 * 저장할 때 내보내는 그림 — 라벨을 조판하고 틀을 **실제 선·글자**에 맞춘다(여백 = 큰 변의 4%, 최소 10).
 * 편집 화면의 «다 보이게»(`fitFrameToContent`)가 **같은 이 함수**를 탄다: 규칙이 갈리면 «단추를 눌러 본 모습»과
 * «저장한 모습»이 달라진다(원장님 2026-09-20).
 */
export const renderFittedFigure = async (svg: string) =>
  withoutFigureNumbers(
    fitFigureViewport(await typesetFigureSvg(cleanFigureForSave(svg))),
  );

/** Expand the viewport only; preserve element coordinates, strokes and grid cells. */
export function expandFigureFrame(svg: string, margin: number, axis: "both" | "horizontal" | "vertical" = "both"): string {
  if (!Number.isFinite(margin) || margin <= 0 || margin > 10_000 || !["both", "horizontal", "vertical"].includes(axis)) return svg;
  const doc = editableFigureDoc(svg), root = doc.documentElement;
  const view = (root.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  if (view.length !== 4 || !view.every(Number.isFinite) || view[2] <= 0 || view[3] <= 0) return svg;
  for (const name of ["width", "height"]) {
    const raw = root.getAttribute(name);
    if (raw !== null) {
      const value = raw.trim().replace(/px$/, "");
      if (!value || !Number.isFinite(Number(value)) || Number(value) <= 0) return svg;
    }
  }
  const [x, y, width, height] = view;
  const dx = axis === "vertical" ? 0 : margin, dy = axis === "horizontal" ? 0 : margin;
  return widenFigureFrame(root, [[x - dx, y - dy], [x + width + dx, y + height + dy]], 0)
    ? serializeFigureSvg(doc) : svg;
}

/** 적힌 수가 같은 틀인가 — 글자가 달라도(`10` vs `10.0`) 수가 같으면 같다. */
const sameFrameValue = (a: string | null, b: string) => {
  const read = (value: string | null) =>
    (value ?? "")
      .trim()
      .split(/[\s,]+/)
      .map(Number);
  const [before, after] = [read(a), read(b)];
  return (
    before.length === after.length &&
    before.every(
      (value, i) =>
        Number.isFinite(value) &&
        Number.isFinite(after[i]) &&
        Math.abs(value - after[i]) < 1e-6,
    )
  );
};

/**
 * 오른쪽 칸 «다 보이게» — 지금 내용에 틀을 딱 맞춘 원문. **틀(viewBox·width·height)만** 바꾼다:
 * 요소는 하나도 안 건드리니 글자 크기·선 굵기가 그대로고, 크기 고정(`figureSizeLock`)과도 무관하다.
 * - 밖으로 나가 잘린 것을 들이고(넓히고), 쓸데없이 넓던 여백은 **줄인다** — `widenFrame`(넓히기만)과 다른 점.
 * - 틀이 저장본과 같은 글자가 되게 저장본의 속성을 **그대로 옮겨 적는다**(다시 계산하지 않는다).
 * - 원문에 width·height 가 없으면 새로 적지 않는다 — 그래야 두 번째 누름이 «이미 맞음»으로 멈춘다.
 * - 이미 맞으면 `null` — 부르는 쪽이 되돌리기 자리를 안 만든다.
 */
export async function fitFrameToContent(svg: string): Promise<string | null> {
  const doc = editableFigureDoc(svg);
  const root = doc.documentElement;
  const fitted = new DOMParser().parseFromString(
    await renderFittedFigure(svg),
    "image/svg+xml",
  ).documentElement;
  const next = (["viewBox", "width", "height"] as const)
    // width·height 는 원문에 있을 때만 — viewBox 는 prepareFigureSvg 가 늘 채워 둔다.
    .filter((name) => name === "viewBox" || root.hasAttribute(name))
    .map((name) => [name, fitted.getAttribute(name) ?? ""] as const)
    .filter(([, value]) => value !== "");
  if (!next.some(([name]) => name === "viewBox")) return null;
  if (
    next.every(([name, value]) =>
      sameFrameValue(root.getAttribute(name), value),
    )
  )
    return null;
  for (const [name, value] of next) root.setAttribute(name, value);
  return serializeFigureSvg(doc);
}
