import type { ExamQuestionInfo } from "./types";

export const REVIEW_SORT_OPTIONS = [
  { value: "difficulty-asc", label: "난이도 낮은 순" },
  { value: "difficulty-desc", label: "난이도 높은 순" },
  { value: "multiple-choice-first", label: "객관식 → 주관식" },
  { value: "subjective-first", label: "주관식 → 객관식" },
  { value: "scope", label: "단원 순" },
] as const;

export type ReviewSort = (typeof REVIEW_SORT_OPTIONS)[number]["value"];

/** Unknown metadata stays last in either direction; equal values retain their order. */
function compareKnown(a: number | undefined, b: number | undefined) {
  if (a === undefined) return b === undefined ? 0 : 1;
  if (b === undefined) return -1;
  return a - b;
}

function formatRank(format: string | undefined, subjectiveFirst: boolean) {
  if (format === "객관식") return subjectiveFirst ? 1 : 0;
  if (["단답형", "서술형", "주관식"].includes(format ?? ""))
    return subjectiveFirst ? 0 : 1;
  return undefined;
}

/** Reorders the actual sheet without cloning, replacing or changing a question. */
export function sortReviewQuestions<T>(
  items: T[],
  info: (item: T) => ExamQuestionInfo,
  sort: ReviewSort,
  difficulties: readonly string[],
): T[] {
  const rows = items.map((item, index) => ({ item, index, info: info(item) }));
  const difficulty = (value: string) => {
    const rank = difficulties.indexOf(value);
    return rank < 0 ? undefined : sort === "difficulty-desc" ? -rank : rank;
  };
  rows.sort((a, b) => {
    let result: number;
    if (sort === "scope") {
      result = compareKnown(
        Number.isFinite(a.info.scopeOrder) ? a.info.scopeOrder : undefined,
        Number.isFinite(b.info.scopeOrder) ? b.info.scopeOrder : undefined,
      );
    } else if (sort === "difficulty-asc" || sort === "difficulty-desc") {
      result = compareKnown(
        difficulty(a.info.difficulty),
        difficulty(b.info.difficulty),
      );
    } else {
      result = compareKnown(
        formatRank(a.info.format, sort === "subjective-first"),
        formatRank(b.info.format, sort === "subjective-first"),
      );
    }
    return result || a.index - b.index;
  });
  return rows.every((row, index) => row.item === items[index])
    ? items
    : rows.map((row) => row.item);
}
