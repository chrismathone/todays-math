/**
 * 고른 요소를 시계·반시계 90° 회전 — 원장님 2026-09-19 «회전 옵션 추가 가능한지. 시계 반시계 90도 방향».
 *
 * 중심은 고른 것 전체의 경계 상자 가운데(그림 좌표)다 — 여럿·묶음은 한 덩어리로 돈다(각자 제자리에서 돌지 않는다).
 * 좌표를 돌려 적기 · 글자는 똑바로 선 채 자리만 · 면·노란 점·임자 꼭짓점 따라가기 · 넘치면 틀 넓히기는
 * **대칭(figureMirror.ts)과 같은 한 엔진**(figureBake.ts)이 한다 — 규칙은 거기 적혀 있다.
 * 여기에는 «90° 회전이란 어떤 변환인가»와 «언제 단추를 끄는가»만 있다.
 */
import type { Affine, Point } from "./figureEditGeometry";
import {
  bakeFigureSelection,
  selectionBlockKind,
  type BakeOptions,
  type FigureObject,
} from "./figureBake";
import { figureObjects } from "./figureSvgEditing";

export {
  measureTextBoxes,
  measureTextCenters,
  type TextBox,
} from "./figureBake";
export type RotateOptions = BakeOptions;
export type RotateTurn = "cw" | "ccw";

/** 단추를 끄는 이유 — 단추의 title 과 단추 밑 보조 글. */
export const ROTATE_BLOCKED = {
  locked: "크기 고정한 요소가 있어 회전할 수 없습니다.",
  text: "글자는 기울지 않습니다. 함께 돌릴 요소를 같이 고르세요.",
  face: "면은 둘러싼 선을 따라갑니다. 선을 같이 고르세요.",
} as const;

/** 그림 좌표의 90° 회전 — 시계(화면 기준, y 가 아래로)는 오른쪽이 아래로 간다. */
function rotationAbout(turn: RotateTurn, [cx, cy]: Point): Affine {
  return turn === "cw"
    ? [0, 1, -1, 0, cx + cy, cy - cx]
    : [0, -1, 1, 0, cx - cy, cx + cy];
}

/**
 * 회전 단추를 끌 이유 — 없으면 null.
 * 크기 고정 요소가 섞임 · 선을 따라가는 면만 고름 · 글자 하나만 고름(글자는 자리만 도는데 중심이 제자리다).
 */
export function rotationBlock(
  objects: readonly FigureObject[],
  ids: readonly string[],
): string | null {
  const kind = selectionBlockKind(objects, ids);
  return kind ? ROTATE_BLOCKED[kind] : null;
}

/** 고른 요소를 한 덩어리로 90° 돌린 새 원문. 돌릴 수 없으면(`rotationBlock`) 원문 그대로. */
export function rotateFigureSelection(
  svg: string,
  ids: readonly string[],
  turn: RotateTurn,
  options: RotateOptions = {},
): string {
  if (!ids.length || rotationBlock(figureObjects(svg), ids)) return svg;
  return bakeFigureSelection(
    svg,
    ids,
    ({ center }) => rotationAbout(turn, center),
    options,
  );
}
