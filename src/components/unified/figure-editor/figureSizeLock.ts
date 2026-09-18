import type { figureObjects } from "./figureSvgEditing";

type FigureObject = ReturnType<typeof figureObjects>[number];

/**
 * 요소 크기 고정 (이동만 가능) — 원장님 2026-09-19. 고정 표시는 요소의 data 속성으로 원문에 남긴다
 * (되돌리기·저장·다시 열기를 같이 탄다 — 인쇄·렌더에는 닿지 않는다).
 */
export const SIZE_LOCK_ATTR = "data-size-locked";

/**
 * 크기·모양을 정하는 속성. 고정한 요소는 이것을 못 바꾼다 — 자리만 정하는 x·y·cx·cy 와 transform 이동은 된다.
 * 글자 크기(font-size)는 선 두께처럼 서식으로 둔다.
 */
const SHAPE_ATTRS: Record<string, readonly string[]> = {
  line: ["x1", "y1", "x2", "y2"],
  rect: ["width", "height", "rx", "ry"],
  circle: ["r"],
  ellipse: ["rx", "ry"],
  path: ["d"],
  polygon: ["points"],
  polyline: ["points"],
};

export const isSizeLocked = (object: FigureObject) =>
  object.attrs[SIZE_LOCK_ATTR] === "true";

/** 이 속성이 이 요소의 크기·모양을 정하는가. */
export const isShapeAttr = (object: FigureObject, name: string) =>
  SHAPE_ATTRS[object.type]?.includes(name) ?? false;

/** 고정한 요소에 크기·모양을 바꾸는 편집이 들어오면 막는다. */
export const blocksSizeChange = (
  object: FigureObject,
  attrs: Record<string, string>,
) =>
  isSizeLocked(object) &&
  Object.keys(attrs).some((name) => isShapeAttr(object, name));

/** 조절점 가운데 옮기기만 하는 것 — 원·타원의 «중심 이동». 나머지는 모두 크기·모양을 바꾼다. */
export const isMoveHandle = (key: string) => key === "center";

/** 위 도구 줄의 전체 토글 표시 — 일부만 고정이면 «mixed». */
export function sizeLockState(objects: readonly FigureObject[]) {
  const locked = objects.filter(isSizeLocked).length;
  return locked === 0 ? false : locked === objects.length ? true : "mixed";
}

/** 요소 칸·전체 토글이 원문에 넣는 값 — 풀 때는 속성을 지운다(`editFigureObject(s)` 는 "" 를 지우기로 읽는다). */
export const sizeLockValue = (locked: boolean) => ({
  [SIZE_LOCK_ATTR]: locked ? "true" : "",
});
