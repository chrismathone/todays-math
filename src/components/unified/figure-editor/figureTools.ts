/**
 * 도형 편집기 도구 — 이름·글리프·도구 줄 차례 한 벌. 도구 줄(`FigureEditor`), ▾ 메뉴(`FigureToolMenu`),
 * 단축키 표(`figureShortcuts`)가 같이 읽는다 — 단추 이름과 단축키 목록의 이름이 갈리지 않는다.
 *
 * 원장님 2026-09-21 확정 «안 A — 마지막에 쓴 도구가 겉에(ppt 식 나눈 단추)». 묶는 것은 둘뿐이다:
 * **선**(선분·화살표·곡선) · **도형**(원·타원·삼각형·사각형·다각형). 선택·이동 · 화면 이동 · 글자 · 채우기 · 함수는
 * 그대로 따로 선다 — 선택·이동은 도구가 아니라 고르는 상태이고, 나머지는 서로 성격이 달라 한 무리가 안 된다.
 * 시안 docs/design/mockups/wire-t43-figure-panel.html «② 상단 도구» A.
 */

/** 캔버스를 누를 때 하는 일 — 편집기의 `tool` 상태. */
export type FigureTool =
  | "select"
  | "pan"
  | "line"
  | "arrow"
  | "curve"
  | "circle"
  | "ellipse"
  | "rect"
  | "triangle"
  | "polygon"
  | "text"
  | "fill";
/** 도구 줄에서 고르는 것 — 줄 끝의 «함수»는 `tool` 이 아니라 오른쪽 칸의 함수 입력을 연다. */
export type FigureToolChoice = FigureTool | "function";

export interface FigureToolInfo {
  id: FigureToolChoice;
  label: string;
  glyph: string;
}

export const FIGURE_TOOLS: readonly FigureToolInfo[] = [
  { id: "select", label: "선택·이동", glyph: "↖" },
  { id: "pan", label: "화면 이동", glyph: "✋" },
  { id: "line", label: "선분", glyph: "╱" },
  { id: "arrow", label: "화살표", glyph: "↗" },
  { id: "curve", label: "곡선", glyph: "⌒" },
  { id: "circle", label: "원", glyph: "○" },
  { id: "ellipse", label: "타원", glyph: "⬭" },
  { id: "rect", label: "사각형", glyph: "□" },
  // 원장님 2026-09-19 «삼각형도 추가해 주고» · «면을 쉽게 만들 수 있어야 색칠을 할 수가 있음»
  { id: "triangle", label: "삼각형", glyph: "△" },
  { id: "polygon", label: "다각형", glyph: "⬠" },
  { id: "text", label: "글자", glyph: "T" },
  { id: "fill", label: "채우기", glyph: "▧" },
  { id: "function", label: "함수", glyph: "ƒ" },
];

export const figureTool = (id: FigureToolChoice): FigureToolInfo =>
  FIGURE_TOOLS.find((tool) => tool.id === id)!;

export type FigureToolGroupName = "선" | "도형";

/** 묶인 도구 — 무리 이름과 속 도구(메뉴 차례). 겉에는 처음에 첫 도구가 선다. */
export const FIGURE_TOOL_GROUPS: readonly {
  name: FigureToolGroupName;
  tools: readonly FigureTool[];
}[] = [
  { name: "선", tools: ["line", "arrow", "curve"] },
  { name: "도형", tools: ["circle", "ellipse", "rect", "triangle", "polygon"] },
];

/** 이 도구가 든 무리 — 따로 서는 도구면 null. */
export const figureToolGroup = (
  id: FigureToolChoice,
): FigureToolGroupName | null =>
  FIGURE_TOOL_GROUPS.find((group) =>
    (group.tools as readonly string[]).includes(id),
  )?.name ?? null;

/** 도구 줄 차례 — 낱 도구와 무리. */
export const FIGURE_TOOLBAR: readonly (
  | { kind: "tool"; id: FigureToolChoice }
  | { kind: "group"; name: FigureToolGroupName }
)[] = [
  { kind: "tool", id: "select" },
  { kind: "tool", id: "pan" },
  { kind: "group", name: "선" },
  { kind: "group", name: "도형" },
  { kind: "tool", id: "text" },
  { kind: "tool", id: "fill" },
  { kind: "tool", id: "function" },
];
