import type { ProblemSource, ReviewStatus } from "@/contracts/common.contract";

// 🔴 `DIFFICULTY_LABEL` 은 없앴다 (D-106, 2026-08-25).
//    난이도 값이 이미 사람이 읽는 말(`연산`·`기본`·`응용`·`심화`)이라 이름표가
//    **값을 한 번 더 적는 표**가 된다. 그런 표는 값이 늘 때 조용히 뒤처진다.
//    화면은 `problem.difficulty` 를 그대로 그린다.

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
};

/**
 * 출처 이름표 — `ProblemSource` **네 값 전부**를 덮어야 한다.
 *
 * ⚠️ 2026-08-19 까지 `manual`·`past_exam` 둘만 있었다. DB 에는 `transformed`
 *    4,862건과 `ai_generated` 20건이 있으니, 이 표를 쓰는 자리가 생기는 순간
 *    4,882건이 이름 없이(`undefined`) 그려진다. 타입으로 못 박아 둔다 —
 *    `Record<ProblemSource, string>` 이라 값이 하나 늘면 컴파일이 막는다.
 */
export const SOURCE_LABEL: Record<ProblemSource, string> = {
  manual: "자작",
  past_exam: "기출",
  transformed: "변형",
  ai_generated: "AI 생성",
};

/** 필터 드롭다운이 그리는 순서 — 많은 것부터. */
export const SOURCE_OPTIONS = [
  "past_exam",
  "transformed",
  "manual",
  "ai_generated",
] as const satisfies readonly ProblemSource[];

export const PROBLEM_TYPES = ["계산", "개념", "활용", "서술형"] as const;
