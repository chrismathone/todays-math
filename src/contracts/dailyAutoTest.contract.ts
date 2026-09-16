/**
 * 매일 자동 출제 계약 — **진도 계획**(②)과 **자동 초안 회차**(③). D-129.
 *
 * SSOT: docs/planning/22-daily-auto-test.md · 결정 D-129(07 Decision Log)
 * 규칙(날짜 펴기·실제가 이긴다·밀림 셈)은 순수 함수 `src/lib/daily/progressPlan.ts` 한 곳에 있다.
 *
 * 대응 API 경로:
 *   GET /api/tests/auto-draft/cron — Vercel cron 전용(KST 08:00). 세션이 아니라 CRON_SECRET.
 *
 * ⚠️ 화면 계약은 여기 없다 — 반 설정의 요일·계획 칸은 **D-07 시안 뒤**다(22 §4 ④).
 */
import { z } from "zod";

import {
  dataResponseSchema,
  isoDateSchema,
  uuidSchema,
} from "./common.contract";

// ─────────────────────────────────────────────
// ② 진도 계획 — **규칙 한 줄**이다. 날짜별 행을 쌓지 않는다.
// ─────────────────────────────────────────────

/**
 * 수업 요일 — `0=일 … 6=토`. JS `Date.getUTCDay()` 와 같은 번호다.
 *
 * 🔴 **한국식 「월=1」이 아니다.** 요일 번호는 표기 방식이 둘(일 시작·월 시작)이라
 *    한쪽만 적어 두면 화면과 규칙이 조용히 하루씩 어긋난다 — 화면이 이 번호로 맞춘다.
 */
export const lessonWeekdaySchema = z.number().int().min(0).max(6);

/** 한 수업에 나가는 차시 수의 상한 — 값이 아니라 **오타를 막는 울타리**다(22 §5 ⏳). */
export const MAX_UNITS_PER_LESSON = 10;

export const progressPlanRuleSchema = z.strictObject({
  /** 수업 요일(여럿). 비면 수업일이 하나도 없다 — 계획으로 쓸 수 없어 막는다. */
  weekdays: z
    .array(lessonWeekdaySchema)
    .min(1, { error: "수업 요일을 하나 이상 골라야 합니다." }),
  /** 한 수업당 차시 수 — 기본 1. */
  unitsPerLesson: z.number().int().min(1).max(MAX_UNITS_PER_LESSON),
  /** 시작 차시 — 교육과정 차례(`Unit.orderIndex`, D-27)의 출발점. */
  startUnitId: uuidSchema,
  /** 시작일 — 이 날 **이후 첫 수업일**에 시작 차시를 나간다. */
  startDate: isoDateSchema,
  /** 꺼 두면 자동 대상이 아니다. 계획을 지우지 않고 멈추는 길. */
  active: z.boolean(),
});
export type ProgressPlanRuleInput = z.infer<typeof progressPlanRuleSchema>;

export const progressPlanSchema = progressPlanRuleSchema.extend({
  id: uuidSchema,
  classId: uuidSchema,
  /** NULL 이면 반 계획, 값이 있으면 그 학생 계획(개별 진도 학생에 한해 반 계획을 덮는다). */
  studentId: uuidSchema.nullable(),
});
export type ProgressPlanEntity = z.infer<typeof progressPlanSchema>;

// ─────────────────────────────────────────────
// ③ 자동 초안 회차 — 한 회차가 무엇을 했나
// ─────────────────────────────────────────────

/**
 * 건너뛴 까닭. **조용히 빠지는 학생이 없게** 회차마다 학생별로 적는다.
 * · `already`        오늘 그 학생 확인테스트가 이미 있다(초안 포함) — 지금 화면 규칙과 같다
 * · `lacking`        출제 자격 문항이 모자란다 — 만들지 않고 기록만(D-64 와 같은 결)
 * · `no-range`       범위를 못 냈다(진도·계획이 가리키는 차시가 단원 목록 밖 등)
 * · `exam-or-unread` 보고서는 있는데 오늘 진도 행이 없다 — 시험기간·미분류(D-64: 표시만)
 * · `failed`         출제가 오류로 끝났다(422 문항류 부족 포함)
 */
export const autoDraftSkipReasonSchema = z.enum([
  "already",
  "lacking",
  "no-range",
  "exam-or-unread",
  "failed",
]);
export type AutoDraftSkipReason = z.infer<typeof autoDraftSkipReasonSchema>;

export const autoDraftSkipSchema = z.strictObject({
  studentId: uuidSchema,
  reason: autoDraftSkipReasonSchema,
});
export type AutoDraftSkip = z.infer<typeof autoDraftSkipSchema>;

export const autoDraftSummarySchema = z.strictObject({
  /** 기준일(KST) — 「오늘」의 정의. */
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** 오늘 대상이 된 학생 수(계획상 수업일 + 오늘 보고서가 있는 학생). */
  targets: z.number().int().min(0),
  /** 만든 초안 수. */
  created: z.number().int().min(0),
  /** 건너뛴 수 — `skips` 의 길이와 같다. */
  skipped: z.number().int().min(0),
  skips: z.array(autoDraftSkipSchema),
});
export type AutoDraftSummary = z.infer<typeof autoDraftSummarySchema>;

export const autoDraftRunResponseSchema = dataResponseSchema(
  autoDraftSummarySchema,
);
export type AutoDraftRunResponse = z.infer<typeof autoDraftRunResponseSchema>;
