export const NAMES: Record<string, string> = {
  path: "곡선/경로",
  line: "선분",
  circle: "원",
  ellipse: "타원",
  rect: "사각형",
  polygon: "다각형",
  polyline: "꺾은선",
  text: "글자",
};

/** 노란 점으로 바꿀 수 있는 다각형의 이름(`data-shape`) — figureShapeAdjust 의 모양 표와 같은 이름. */
const SHAPE_NAMES: Record<string, string> = {
  parallelogram: "평행사변형",
  triangle: "삼각형",
};

/**
 * 요소 목록·오른쪽 칸 제목의 이름 — 면(채우기 통·다각형 도구·안쪽 채우기가 만든 채운 영역, `data-face`)은 «면»,
 * 삼각형·평행사변형(`data-shape`)은 그 이름, 나머지는 종류 이름.
 */
export const objectName = (o: {
  type: string;
  attrs: Record<string, string>;
}) =>
  o.attrs["data-face"] !== undefined
    ? "면"
    : (SHAPE_NAMES[o.attrs["data-shape"] ?? ""] ?? NAMES[o.type] ?? o.type);
