import type { FadingStep } from "@/lib/fading/erasure";
import type { FsrsRating } from "@/lib/fading/fsrs";
/** 단원 번호와 제목 속 수량을 표시에서만 구분한다. 원본 이름·키는 보존한다. */
export function curriculumName(name = "") {
  return name.replace(/^(\d+(?:-\d+)+)\s+(?=\S)/, "$1 · ");
}
export const stepNames: Record<FadingStep, string> = {
  1: "정독",
  2: "핵심어 소거",
  3: "수식·조건 소거",
  4: "백지",
};
export const ratingNames: Record<FsrsRating, string> = {
  again: "다시",
  hard: "어려움",
  good: "알맞음",
  easy: "쉬움",
};
export function dueLabel(days: number | null) {
  return days === null
    ? "첫 풀이 전"
    : days < 0
      ? `${-days}일 밀림`
      : days === 0
        ? "오늘 복습"
        : `${days}일 뒤 복습`;
}
