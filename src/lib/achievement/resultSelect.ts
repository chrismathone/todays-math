/**
 * 채점 회차 조회의 **select** — 상수로 꺼내 시험이 읽게 한다 (Hi-fi 브리프 §1 #1).
 *
 * ## 🔴 왜 따로 꺼냈나 — 결시가 «늘 응시»로 굳던 자리
 *
 * 트랙 1(`grading-input`, main 병합 fe5a125d)이 `TestResult.absent` 를 더하고 `score` 를 nullable 로
 * 바꿨다. 이 조회가 **`absent` 를 select 하지 않으면** 칸이 있어도 값이 안 온다. 예전 읽는 쪽은
 * `readAbsent(row: object)` 덕 타이핑이라 칸이 안 오면 «결시 아님»으로 보고 **tsc 도 못 잡았다** —
 * 결시 회차가 0점짜리 응시로 평균에 실리는 자리였다(23 §4 ③). 주석은 «이 파일을 고치지 않아도
 * 진짜 값이 들어온다»였는데 **거짓이었다.**
 *
 * 이제 `absent` 를 select 하고 **Prisma 가 준 형 그대로** 읽는다(`load.ts` — 덕 타이핑 없음).
 * `score` 도 `Float?` 그대로다 — `?? 0` 을 적지 않는다(결시·없는 값은 `rollupScores` 가 가른다).
 *
 * **덫**은 남긴다: `achievementResultSelect.test.ts` 가 `Prisma.TestResultScalarFieldEnum` 의 감시 칸이
 * 이 상수에 다 있는지 본다 — 누가 select 를 줄이면 빨개진다.
 *
 * ⚠️ 이 파일은 `server-only` 가 아니다 — 시험이 상수를 읽어야 해서. DB 에 닿는 것은 `load.ts` 뿐이다.
 */
import type { Prisma } from "@prisma/client";

export const RESULT_SELECT = {
  testId: true,
  takenAt: true,
  score: true,
  absent: true,
  test: { select: { testDate: true } },
  answers: {
    select: {
      problemId: true,
      isCorrect: true,
      problem: { select: { unitId: true, difficulty: true } },
    },
  },
  analysisReport: { select: { recommendedUnits: true } },
} as const satisfies Prisma.TestResultSelect;

/** 이 조회가 **반드시** 읽어야 하는 칸 — 스키마에 있으면 select 에도 있어야 한다. */
export const WATCHED_RESULT_FIELDS = ["absent", "score"] as const;

/**
 * 스키마에는 있는데 select 가 **안 읽는** 감시 칸. 비어 있어야 정상이다.
 *
 * @param scalarFields `Prisma.TestResultScalarFieldEnum` — 스키마가 지금 가진 칸
 */
export function unreadResultFields(
  select: Readonly<Record<string, unknown>>,
  scalarFields: Readonly<Record<string, string>>,
): string[] {
  return WATCHED_RESULT_FIELDS.filter(
    (field) => field in scalarFields && select[field] !== true,
  );
}
