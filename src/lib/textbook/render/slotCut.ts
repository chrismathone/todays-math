/**
 * 교재 지면의 그림 자리 — 교재 렌더러(GFM)로 읽어도 자리가 마크다운 마디를 안 가르는가 (D-164 ③④ · 2026-10-21 Codex 5차).
 *
 * 은행 지면(`slottedProblem`)은 GFM 을 안 읽는다 — 그 파서를 화면 묶음(학생 폰 화면까지)에 싣지 않으려고 여기(서버)에만 둔다.
 * 양끝 `|` 가 없는 표 · `~~지운 줄~~` · 각주처럼 GFM 에만 있는 마디를 자리가 가르면 교재는 자리를 하나도 안 세우고 원문
 * 그대로 그린다(그 문항의 은행 지면은 GFM 을 모르니 자리에 그림을 세운다 — 각자 제 렌더러에 맞다).
 * 🔴 자리 표기를 DB 에 **쓰기 전에는** `checkFigureSlotsForWrite` 하나를 본다 — 은행 · 교재 두 지면이 다 서야 쓴다.
 */
import {
  checkFigureSlots,
  extractFigureSlots,
  slotMarkdownCut,
  type FigureSlotMark,
} from "@/lib/problem/figureSlots";

import { parseTextbookMarkdown } from "./markdown";

/** 교재 렌더러로 읽어 자리가 마디를 가르면 그 까닭(없으면 null). `placed` 는 은행 판정이 그림으로 세운 자리(`marks` 의 차례). */
export function textbookSlotCut(
  content: string,
  marks: readonly FigureSlotMark[],
  placed: ReadonlySet<number>,
): string | null {
  if (placed.size === 0) return null;
  return slotMarkdownCut(
    extractFigureSlots(content).content,
    marks,
    (k) => placed.has(k),
    parseTextbookMarkdown,
  );
}

/**
 * 🔴 자리 표기(`[그림:n]`)가 든 본문을 **쓰기 전에** 보는 검사 — 빈 배열이어야 쓴다(2단계 교과서 묶음).
 * 은행 지면(`checkFigureSlots` — 조판 · 넘침 자와 같은 함수)에 교재 지면(GFM)의 판정을 더한 것이다.
 */
export function checkFigureSlotsForWrite(
  content: string,
  figureCount: number,
  choiceFigureIndex: readonly (number | null)[] | null | undefined,
): string[] {
  const problems = checkFigureSlots(content, figureCount, choiceFigureIndex);
  if (problems.length) return problems;
  const slotted = extractFigureSlots(content);
  const placed = new Set(slotted.marks.map((_, k) => k));
  const cut = textbookSlotCut(content, slotted.marks, placed);
  return cut ? [`교재 지면: ${cut}`] : [];
}
