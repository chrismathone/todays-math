/** POST /api/tests/{id}/retry — 학생의 특정 시험 오답을 읽어 복습 계획만 반환한다. */
import { z } from "zod";

import { dataResponseSchema, uuidSchema } from "./common.contract";
import { testProblemItemSchema } from "./test.contract";

export const retryPlanRequestSchema = z.strictObject({
  studentId: uuidSchema,
  /** 생략하면 이 시험 · 이 학생의 최신 채점. 지정하면 그 기록만 사용한다. */
  testResultId: uuidSchema.optional(),
  /** 전체 문항 수. 생략하면 교과서 오답당 2, 그 외 오답당 1. 교과서 포함 시 이 기본 요청보다 작으면 422. */
  count: z.number().int().min(1).max(300).optional(),
  seed: z.string().min(1).max(200).optional(),
  excludeIds: z.array(uuidSchema).max(1000).default([]),
});
export type RetryPlanRequest = z.infer<typeof retryPlanRequestSchema>;

export const retryProblemSchema = testProblemItemSchema.shape.problem.extend({
  /** 지정 변형의 슬롯. 원문 및 기존 일반 후보는 null일 수 있다. */
  externalId: z.string().nullable(),
});

export const retryPlanResponseSchema = dataResponseSchema(
  z.strictObject({
    testId: uuidSchema,
    studentId: uuidSchema,
    testResultId: uuidSchema,
    wrongProblemIds: z.array(uuidSchema),
    requestedCount: z.number().int().nonnegative(),
    picked: z.array(
      z.strictObject({
        problem: retryProblemSchema,
        wrongProblemId: uuidSchema,
        origin: z.enum(["형제", "원문"]),
      }),
    ),
    shortfall: z.number().int().nonnegative(),
    /** 일반 오답만 같은 갈래로 접힌다. 교과서 오답은 원문별로 보존한다. */
    foldedWrong: z.number().int().nonnegative(),
    textbookShortfalls: z.array(
      z.strictObject({
        wrongProblemId: uuidSchema,
        required: z.number().int().min(1).max(2),
        available: z.number().int().nonnegative().max(1),
      }),
    ),
  }),
);
export type RetryPlanResponse = z.infer<typeof retryPlanResponseSchema>;
