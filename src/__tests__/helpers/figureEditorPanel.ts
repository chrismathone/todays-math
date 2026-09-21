import { fireEvent, screen } from "@testing-library/react";

/**
 * 도형 편집기 시험 도우미 — 원장님 2026-09-21 확정 모양(트랙 50)을 사람이 하는 대로 지나간다.
 *
 * - 오른쪽 칸 «틀 · 세부»(다 보이게 · 크기 고정 · 정밀 수치)는 **처음에 접혀 있다**(안 D). 쓰기 전에 편다.
 * - 선·도형 무리 속 도구(화살표·곡선·타원·사각형·삼각형·다각형)는 겉에 없으면 ▾ 메뉴에서 고른다(안 A).
 */
export function openFigureFold(name: "배치" | "모양" | "틀 · 세부") {
  const fold = screen.getByRole("button", { name: new RegExp(`^${name}`) });
  if (fold.getAttribute("aria-expanded") === "false") fireEvent.click(fold);
}

export const openFigureDetails = () => openFigureFold("틀 · 세부");

const LINE_TOOLS = ["선분", "화살표", "곡선"];

export function pickFigureTool(name: string) {
  const toolbar = screen.getByRole("toolbar", { name: "도형 편집 도구" });
  const direct = [...toolbar.querySelectorAll("button")].find(
    (button) => button.getAttribute("aria-label") === name,
  );
  if (direct) {
    fireEvent.click(direct);
    return;
  }
  const group = LINE_TOOLS.includes(name) ? "선" : "도형";
  fireEvent.click(screen.getByRole("button", { name: `${group} 도구 고르기` }));
  fireEvent.click(screen.getByRole("menuitemradio", { name }));
}
