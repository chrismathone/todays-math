import type { Point } from "./figureEditGeometry";
import { editableFigureDoc, serializeFigureSvg } from "./figureSvgEditing";

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
