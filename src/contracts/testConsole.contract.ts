/**
 * 테스트 도구판 API 계약 — `GET|POST /api/learn/test-console` (원장님 2026-09-28).
 * 시험용 학생 계정(`TEST_CONSOLE_LOGIN_IDS`)에만 열린다. 다른 학생에게는 404 다.
 */
import { z } from "zod";

import { dataResponseSchema } from "./common.contract";
import {
  courseDailyGoalSchema,
  courseSectionIdSchema,
} from "./mathSrsCourse.contract";
import {
  TEST_CLOCK_MAX_DAYS,
  TEST_CLOCK_MIN_DAYS,
} from "@/lib/learn/testConsole";

const count = z.number().int().min(0);

export const RESET_PARTS = [
  "all",
  "memory",
  "explorers",
  "expedition",
  "course",
  "journey",
  // «오늘의 기억» 새 앱의 칸(2026-10-06)
  "fading",
] as const;
export type ResetPart = (typeof RESET_PARTS)[number];

export const testConsoleActionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("reset"), part: z.enum(RESET_PARTS) }),
  z.strictObject({
    type: z.literal("clock"),
    offsetDays: z
      .number()
      .int()
      .min(TEST_CLOCK_MIN_DAYS)
      .max(TEST_CLOCK_MAX_DAYS),
  }),
  z
    .strictObject({
      type: z.literal("explorer"),
      stars: count.max(99_999).optional(),
      level: count.max(99).optional(),
      grade: z.number().int().min(3).max(9).optional(),
      clearCards: z.literal(true).optional(),
    })
    .refine(
      (v) =>
        v.stars !== undefined ||
        v.level !== undefined ||
        v.grade !== undefined ||
        v.clearCards,
      "바꿀 값을 하나 이상 넣어 주세요.",
    ),
  z.strictObject({ type: z.literal("clear-mission") }),
  z.strictObject({
    type: z.literal("course"),
    startSectionId: courseSectionIdSchema,
    dailyQuestionCount: courseDailyGoalSchema,
    enabled: z.boolean(),
  }),
  z.strictObject({ type: z.literal("restore"), payload: z.unknown() }),
  z.strictObject({ type: z.literal("must-change-password") }),
  z.strictObject({ type: z.literal("clear-lecture-views") }),
]);
export type TestConsoleAction = z.infer<typeof testConsoleActionSchema>;

export const testConsoleStateSchema = z.strictObject({
  loginId: z.string(),
  studentName: z.string(),
  className: z.string(),
  /** 도구판 시계로 본 오늘(KST) · 실제 오늘 · 옮긴 날 수 */
  today: z.string(),
  realToday: z.string(),
  offsetDays: z.number().int(),
  revision: count,
  explorer: z
    .strictObject({
      grade: z.number().int(),
      stars: count,
      earned: count,
      level: count,
      cards: count,
    })
    .nullable(),
  mission: z.strictObject({ status: z.string(), date: z.string() }).nullable(),
  course: z
    .strictObject({
      startSectionId: z.string(),
      dailyQuestionCount: z.number().int(),
      enabled: z.boolean(),
    })
    .nullable(),
  counts: z.strictObject({
    srsMissions: count,
    completedDays: count,
    expeditionTiles: count,
    lectureViews: count,
  }),
  sections: z.array(z.strictObject({ id: z.string(), label: z.string() })),
  /** 스냅샷용 원본 — 도구판이 브라우저에 보관했다가 `restore` 로 되돌린다. 기록이 없으면 null */
  payload: z.unknown(),
  message: z.string().nullable(),
});
export type TestConsoleState = z.infer<typeof testConsoleStateSchema>;
export const testConsoleResponseSchema = dataResponseSchema(
  testConsoleStateSchema,
);
