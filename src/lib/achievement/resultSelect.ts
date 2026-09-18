/**
 * 채점 회차 조회의 **select** — 상수로 꺼내 시험이 읽게 한다 (Hi-fi 브리프 §1 #1).
 *
 * ## 🔴 왜 따로 꺼냈나 — 결시가 «늘 응시»로 굳는 자리
 *
 * 트랙 1(`grading-input`)이 `TestResult.absent` 를 더하고 `score` 를 nullable 로 바꾼다. 그런데
 * 이 조회가 **`absent` 를 select 하지 않으면** 칸이 생겨도 값이 안 온다. 읽는 쪽(`readAbsent`)은
 * 덕 타이핑이라 칸이 없으면 «결시 아님»으로 보고, **tsc 도 못 잡는다** — 트랙 1 을 병합해도
 * 결시가 늘 «응시»로 읽히고, 결시 회차가 0점짜리 응시로 평균에 실린다(23 §4 ③).
 *
 * 예전 주석은 «트랙 1 이 병합되면 **이 파일을 고치지 않아도** 진짜 값이 들어온다»였다 — **거짓이었다.**
 * select 에 칸을 적어야 온다. 지금 스키마에는 그 칸이 없어서 적을 수도 없다(tsc 가 막는다).
 *
 * 그래서 **덫**을 둔다: `achievementResultSelect.test.ts` 가 `Prisma.TestResultScalarFieldEnum`
 * 에 `absent` 가 **있으면** 이 상수에도 있어야 초록이다. 트랙 1 이 병합되는 순간 빨개지고,
 * 이 상수에 `absent: true` 를 더해야 다시 초록이 된다.
 *
 * ⚠️ 이 파일은 `server-only` 가 아니다 — 시험이 상수를 읽어야 해서. DB 에 닿는 것은 `load.ts` 뿐이다.
 */
import type { Prisma } from "@prisma/client";

export const RESULT_SELECT = {
  testId: true,
  takenAt: true,
  score: true,
  test: { select: { testDate: true } },
  answers: {
    select: {
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

/**
 * 🔴 **«결시»를 읽는 법** — 칸이 **select 되어 와 있고** 참일 때만 결시다.
 *
 * 짐작(«0점이면 결시»)은 하지 않는다 — 0점은 진짜 0점일 수 있다. 칸이 안 오면 «결시 아님»이 되므로
 * select 에서 빠지면 조용히 틀린다 — 그 자리는 위의 덫이 지킨다.
 */
export function readAbsent(row: object): boolean {
  return (row as { absent?: unknown }).absent === true;
}

export function readScore(row: { score: unknown }): number | null {
  return typeof row.score === "number" ? row.score : null;
}
