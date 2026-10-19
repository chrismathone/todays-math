import type { FadingStep } from "@/lib/fading/erasure";
import type { FsrsRating } from "@/lib/fading/fsrs";
/** 화면의 문장 번호다. 계약과 교과 내용의 명제 이름은 바꾸지 않는다. */
export function conceptSentenceLabel(index: number) {
  return `개념 ${index + 1}`;
}
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

/** Student display only. Source curriculum names and identifiers are unchanged. */
export function studentCurriculumName(name = "") {
  return name
    .split("::")
    .map((part) =>
      part
        .trim()
        .replace(
          /^(?:초등|중등|고등|초|중|고)\s*\d(?:학년)?\s*(?:[·:]\s*)?/,
          "",
        )
        .replace(/^\d+(?:-\d+)+\s*(?:[·:]\s*)?/, "")
        .trim(),
    )
    .filter(Boolean)
    .join(" · ");
}
export const studentStepNames: Record<FadingStep, string> = {
  1: "떠올려 보기",
  2: "핵심어 빈칸",
  3: "더 많은 빈칸",
  4: "직접 쓰기",
};

/** Relative words for an already calculated date; never changes the schedule. */
export function studentDateLabel(value: string, today?: string): string {
  const base =
    today ??
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  const day = (date: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
    const time = Date.parse(`${date}T00:00:00Z`);
    return Number.isFinite(time) &&
      new Date(time).toISOString().slice(0, 10) === date
      ? time
      : NaN;
  };
  const days = Math.round((day(value) - day(base)) / 86400000);
  return !Number.isFinite(days)
    ? "다음에"
    : days === 0
      ? "오늘"
      : days === 1
        ? "내일"
        : days === 2
          ? "모레"
          : days > 0
            ? `${days}일 뒤`
            : `${-days}일 전`;
}
export function studentDueLabel(days: number | null) {
  return days === null
    ? "처음 만나요"
    : days < 0
      ? `${-days}일 지났어요`
      : `${days === 0 ? "오늘" : days === 1 ? "내일" : days === 2 ? "모레" : `${days}일 뒤`} 복습`;
}
