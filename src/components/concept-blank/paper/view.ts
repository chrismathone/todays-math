import type { ConceptBlankPaperProps } from "../ConceptBlankPaper";

/** 인쇄 주소 `?view=student|key|both` — 모르는 값 · 없음은 «둘 다»(학생지 뒤에 채점표). */
export function parseConceptBlankView(
  value: string | string[] | undefined,
): ConceptBlankPaperProps["view"] {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "student" || v === "key" ? v : "both";
}
