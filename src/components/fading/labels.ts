import type { FadingStep } from "@/lib/fading/erasure";
import type { FsrsRating } from "@/lib/fading/fsrs";
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
