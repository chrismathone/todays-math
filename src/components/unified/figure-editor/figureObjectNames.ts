import { isFigureMathLabel } from "./FigureLabelInput";

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

/** 각 표시(직각 표시 ㄱ자 · 각의 호)의 종류 — 원장님 2026-09-19 «직각 둔각 예각». */
export type FigureAngleKind = "직각" | "예각" | "둔각";
/**
 * 선분 위 표시의 이름 — 같은 길이 눈금(‖) · 평행 표시(»). 엔진은 한 획마다 `<line>` 하나로 그린다.
 * 선분을 봐야 알아서 `figureSegmentMarks`(figureMarks.ts)가 모양으로 가른다.
 */
export type FigureSegmentMarkKind = "같은 길이 표시" | "평행 표시";
/** 요소 id → 각의 종류. 그림 전체(두 변)를 봐야 알아서 `figureAngleKinds`(figureObjectGroups.ts)가 만든다. */
export type FigureAngleKinds = ReadonlyMap<string, FigureAngleKind>;

/**
 * 요소 이름 — 이름이 나오는 **모든 자리**(요소 목록 단추 · 오른쪽 칸 제목 · AI 에게 보내는 요소 종류 · AI 결과 줄)가
 * 이것 하나를 쓴다(원장님 2026-09-19 «항상 모든 화면이 일치하도록»). 자리마다 따로 짓지 않는다.
 * 각 표시는 그 종류(직각·예각·둔각 — `angles`), 함수 도구가 그린 곡선은 «함수 그래프», 글은 «수식»·«글자»,
 * 면(채우기 통·다각형 도구·안쪽 채우기가 만든 채운 영역, `data-face`)은 «면», 삼각형·평행사변형(`data-shape`)은
 * 그 이름, 나머지는 종류 이름.
 */
export const objectName = (
  o: {
    id?: string;
    type: string;
    attrs: Record<string, string>;
    text?: string;
  },
  angles?: FigureAngleKinds,
) =>
  (o.id === undefined ? undefined : angles?.get(o.id)) ??
  (o.attrs["data-function"]
    ? "함수 그래프"
    : o.type === "text"
      ? isFigureMathLabel(o.attrs["data-mj"] ?? o.text ?? "")
        ? "수식"
        : "글자"
      : o.attrs["data-face"] !== undefined
        ? "면"
        : (SHAPE_NAMES[o.attrs["data-shape"] ?? ""] ??
          NAMES[o.type] ??
          o.type));
