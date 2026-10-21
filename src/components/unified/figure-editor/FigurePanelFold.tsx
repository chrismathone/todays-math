import { useId, type ReactNode } from "react";
import type { figureObjects } from "./figureSvgEditing";
import { isFaceObject } from "./figureFaceSources";

type FigureObject = ReturnType<typeof figureObjects>[number];

/** 오른쪽 칸의 무리 셋 — 시안 D 의 차례. */
// math-figure-editor: «모눈»(배경 모눈, figureGrid.ts)을 더했다 — 상류에는 없는 무리.
export type FigurePanelFoldName = "배치" | "모양" | "모눈" | "틀 · 세부";

/** 처음 펼침 — 배치·모양은 펼쳐 두고 틀·세부만 접는다(원장님 2026-09-21 확정). */
export const FIGURE_PANEL_FOLDS_OPEN: Readonly<
  Record<FigurePanelFoldName, boolean>
> = { 배치: true, 모양: true, 모눈: false, "틀 · 세부": false };

/**
 * 오른쪽 칸 접는 무리 — 원장님 2026-09-21 확정 «안 D — 접는 무리»(시안 docs/design/mockups/wire-t43-figure-panel.html D).
 *
 * 머리글을 누르면 접히고 펴진다. 머리글 오른쪽의 작은 글은 **속 항목 이름**이다 — 접어 둔 것을 못 찾으시지 않게.
 * 접은 상태는 편집기가 쥐고 있다(편집기를 연 동안 기억, 다시 열면 처음대로). 접은 속은 `hidden` 으로 숨길 뿐
 * 그대로 두어, 펴면 적던 값·펼친 «정밀 수치 조정»이 그대로다.
 */
export function FigurePanelFold({
  name,
  summary,
  open,
  onToggle,
  children,
}: {
  name: FigurePanelFoldName;
  /** 속 항목 이름 — «회전 · 대칭 · 정렬 · 간격 · 순서» */
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const body = useId();
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={body}
        onClick={onToggle}
        className="mb-2 mt-2.5 flex w-full items-center gap-1.5 border-b border-[var(--divider)] px-1 py-1.5 text-left text-xs leading-normal font-semibold text-[var(--ink)] hover:bg-side"
      >
        <span>
          <span aria-hidden="true">{open ? "▾" : "▸"}</span> {name}
        </span>
        <span className="ml-auto min-w-0 truncate font-normal text-[var(--text-2)]">
          {summary}
        </span>
      </button>
      <div id={body} role="group" aria-label={name} hidden={!open}>
        {children}
      </div>
    </>
  );
}

/** «배치» 속 항목 — 뒤집기(곡선 하나)는 설 때만. */
export const arrangeSummary = (flip: boolean) =>
  ["회전", "대칭", ...(flip ? ["뒤집기"] : []), "정렬", "간격", "순서"].join(
    " · ",
  );

const SHAPE_ITEMS = "선 색 · 두께 · 점선 · 채우기";
const TEXT_ITEMS = "기울임 · 굵게 · 글자 색 · 배경색 · 글자 크기";

/** «모양» 속 항목 — 요소 하나. 면은 선이 없어 채우기뿐이다. */
export const shapeSummary = (object: FigureObject) =>
  object.type === "text"
    ? TEXT_ITEMS
    : isFaceObject(object)
      ? "채우기"
      : SHAPE_ITEMS;

/** «모양» 속 항목 — 여럿을 골랐을 때의 공통 서식(선·도형 칸 · 글자 칸). */
export const commonSummary = (objects: readonly FigureObject[]) => {
  const shapes = objects.some((o) => o.type !== "text");
  const texts = objects.some((o) => o.type === "text");
  return shapes && texts
    ? "선·도형 서식 · 글자 서식"
    : texts
      ? "글자 색 · 배경색 · 글자 크기 · 기울임 · 굵게"
      : SHAPE_ITEMS;
};

/** «틀 · 세부» 속 항목 — 크기 고정·정밀 수치는 요소 하나를 골랐을 때만 선다. */
export const detailSummary = (single: boolean) =>
  single ? "다 보이게 · 크기 고정 · 정밀 수치" : "다 보이게";
