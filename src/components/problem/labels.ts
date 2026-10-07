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
  school_textbook: "교과서",
};

/** 필터 드롭다운이 그리는 순서 — 많은 것부터. */
export const SOURCE_OPTIONS = [
  "past_exam",
  "transformed",
  "manual",
  "school_textbook",
  "ai_generated",
] as const satisfies readonly ProblemSource[];

export const PROBLEM_TYPES = ["계산", "개념", "활용", "서술형"] as const;

/**
 * 「유형」 드롭다운이 그리는 항목 — **두 축이 한 칸에 들어 있다** (원장님 지시 2026-08-26:
 * 「유형에 단답형 추가 · [단] 을 거를 수 있게 · [서] 도 서술형 필터에」).
 *
 *   · `계산`·`개념`·`활용` → `problemType` (문제를 **어떻게 푸나**)
 *   · `단답형`·`서술형`    → 형식 라벨 `[단]`·`[서]` (답을 **어떻게 내나**)
 *
 * ## 왜 「서술형」을 `problemType` 에서 형식 축으로 옮겼나 — 실측이 정했다
 *
 * 공유 DB 전량 47,797건에서 `problem_type='서술형'` 8,037건의 라벨을 세어 보면
 * (`scripts/qa/probe-format-filter.ts --cross`, 2026-08-26):
 *
 * | `problem_type='서술형'` 의 라벨 | 건수 |
 * |---|---|
 * | `[서]` 서술형 | 7,755 |
 * | **`[단]` 단답형** | **278** |
 * | `[객]` 객관식 | 4 |
 *
 * 즉 **지금 「유형=서술형」으로 거르면 화면에 `[단]` 이 붙은 278건이 같이 나온다** — 원장님이
 * 「[단]과 [서]를 분리하라」고 하신 바로 그 뒤섞임이다. 형식 축으로 옮기면 그 278건은
 * **단답형 필터로 옮겨 가고**(사라지지 않는다), `problem_type` 이 계산·개념인데 라벨이
 * `[서]` 인 50건이 서술형 필터에 **새로 들어온다**. 결과는 화면 라벨과 **정확히 같은 집합**이다.
 *
 * ⚠️ 그래서 `problem_type='서술형'` 을 **그 값 자체로** 고르는 길은 이 칸에서 사라진다.
 *    그 값을 그대로 두면 「유형 칸의 서술형」과 「라벨의 [서]」가 계속 다른 것을 가리킨다
 *    (07 §6 이 원장님께 여쭌 「problemType 에서 서술형을 걷어낼까」와 같은 자리다).
 */
export const PROBLEM_FILTER_OPTIONS = [
  { value: "type:계산", label: "계산" },
  { value: "type:개념", label: "개념" },
  { value: "type:활용", label: "활용" },
  { value: "format:short_answer", label: "단답형" },
  { value: "format:descriptive", label: "서술형" },
] as const;

export type ProblemFilterOptionValue =
  (typeof PROBLEM_FILTER_OPTIONS)[number]["value"];

/**
 * 드롭다운 값 하나를 두 축으로 되돌린다. 화면이 `startsWith("format:")` 같은 문자열
 * 조각을 **여기저기서 다시 자르지 않게** 한 곳에 둔다 — 자르는 자리가 둘이면 축을
 * 하나 더할 때 한쪽만 고쳐도 아무도 모른다.
 */
export function splitProblemFilterValue(value: string): {
  problemType?: string;
  format?: string;
} {
  if (value.startsWith("type:")) return { problemType: value.slice(5) };
  if (value.startsWith("format:")) return { format: value.slice(7) };
  return {};
}
