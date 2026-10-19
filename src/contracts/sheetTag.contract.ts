import { z } from "zod";

/**
 * 시험지 태그(W8 · Hi-fi 1안 + 3안의 «접힌 한 줄» — 원장님 2026-10-16).
 *
 * 정해진 여덟 가운데 **하나**, 시험지(`draft`) · 연산 연습지(`arithmeticSheet`)에만 붙는다. 문제지 여섯 양식에 찍고 양식(W6)에 담지 않는다.
 * 저장 자리는 `workspace_document.payload` — 시험지는 `payload.tag`, 연산 연습지는 출력 설정과 같은 자리 `payload.presentation.tag`
 * (연산 본문은 칸을 엄격히 가려 받는다). 칸이 없는 옛 자료는 «태그 없음»이다. DB 변경은 없다.
 */
export const SHEET_TAGS = [
  "일일TEST",
  "주간TEST",
  "단원TEST",
  "숙제",
  "복습",
  "오답",
  "입학TEST",
  "내신대비",
] as const;
export const sheetTagSchema = z.enum(SHEET_TAGS);
export type SheetTag = z.infer<typeof sheetTagSchema>;

/** 태그가 붙는 자료 종류 — 추출한 자료 · 개념 백지에는 없다. */
export const TAGGABLE_DOCUMENT_KINDS = ["draft", "arithmeticSheet"] as const;
export const isTaggableKind = (kind: string) =>
  (TAGGABLE_DOCUMENT_KINDS as readonly string[]).includes(kind);

/** 저장본에서 읽은 값 — 모르는 값은 «태그 없음»으로 읽는다(지어내지 않는다 · 여는 일을 막지 않는다). */
export function readSheetTag(value: unknown): SheetTag | undefined {
  const parsed = sheetTagSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
