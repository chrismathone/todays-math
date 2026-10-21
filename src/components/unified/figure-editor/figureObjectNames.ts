import { assetLabel } from "@/lib/figure/assetCatalog";
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

/**
 * 원호 경로인가 — 한 원 위의 호 한 획(`M 시작 A r r 0 large sweep 끝`). 엔진의 부채꼴 호(figure_svg.arc)·
 * 각 표시 호(figure_svg.angle_arc)·AI 가 더한 호(figureShapeOps `addArc`)가 다 이 꼴이다.
 * 원장님 2026-09-20 «부채꼴의 호·AI 가 더한 호를 «호»라고 불러» — 그 «호»의 판정 한 자리다.
 * 치수선의 두 조각 점선 곡선·베지어(Q·C)로 그린 자유 곡선은 «곡선/경로» 그대로다(`A` 가 없거나 획이 둘이라 걸리지 않는다).
 * 타원 호(rx ≠ ry)도 한 원 위가 아니라 «곡선/경로» — 여유 2% 는 각 표시를 가르는 자리
 * (figureObjectGroups.ts `arcAngleMark`)와 같은 값이다.
 */
export const isArcPath = (d: string | undefined): boolean => {
  if (!d || !/^\s*M[^A-Za-z]*A[^A-Za-z]*$/.test(d)) return false;
  const v = (d.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) ?? []).map(
    Number,
  );
  // M x0 y0 A rx ry 기울기 large sweep x1 y1 — 아홉
  if (v.length !== 9) return false;
  const rx = Math.abs(v[2]),
    ry = Math.abs(v[3]);
  const r = (rx + ry) / 2;
  return r > 0 && Math.abs(rx - ry) <= 0.02 * r;
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
/** 각의 종류인가 — 선분 위 표시와 가른다(요소 목록 단추는 각 표시만 종류를 적는다). */
export const isAngleKind = (
  kind: string | undefined,
): kind is FigureAngleKind =>
  kind === "직각" || kind === "예각" || kind === "둔각";
/**
 * 요소 id → 각의 종류 · 선분 위 표시의 이름. 그림 전체(두 변 · 표시가 앉은 선분)를 봐야 알아서
 * `figureAngleKinds`(figureObjectGroups.ts)가 만든다.
 */
export type FigureAngleKinds = ReadonlyMap<
  string,
  FigureAngleKind | FigureSegmentMarkKind
>;

/**
 * 요소 이름 — 이름이 나오는 **모든 자리**(요소 목록 단추 · 오른쪽 칸 제목 · AI 에게 보내는 요소 종류 · AI 결과 줄)가
 * 이것 하나를 쓴다(원장님 2026-09-19 «항상 모든 화면이 일치하도록»). 자리마다 따로 짓지 않는다.
 * 각 표시는 그 종류(직각·예각·둔각 — `angles`), 선분 위 표시는 «같은 길이 표시»·«평행 표시»(`angles`),
 * 함수 도구가 그린 곡선은 «함수 그래프», 글은 «수식»·«글자»,
 * 면(채우기 통·다각형 도구·안쪽 채우기가 만든 채운 영역, `data-face`)은 «면», 삼각형·평행사변형(`data-shape`)은
 * 그 이름, 한 원 위의 호(`isArcPath` — 부채꼴의 호·AI 가 더한 호)는 «호», 나머지는 종류 이름.
 * 각 표시의 호도 같은 꼴이지만 `angles` 가 먼저라 «직각»·«예각»·«둔각»으로 남는다(원장님 2026-09-20).
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
  // 그림 조각(math-figure-editor) — «건물»·«집»처럼 그 이름
  (o.attrs["data-asset"] !== undefined ? assetLabel(o.attrs["data-asset"]) : undefined) ??
  (o.attrs["data-function"]
    ? "함수 그래프"
    : o.type === "text"
      ? isFigureMathLabel(o.attrs["data-mj"] ?? o.text ?? "")
        ? "수식"
        : "글자"
      : o.attrs["data-face"] !== undefined
        ? "면"
        : o.type === "path" && isArcPath(o.attrs.d)
          ? "호"
          : (SHAPE_NAMES[o.attrs["data-shape"] ?? ""] ??
            NAMES[o.type] ??
            o.type));
