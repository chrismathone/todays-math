/**
 * 매일 자동 출제 계약 — **진도 계획**(②)과 **자동 초안 회차**(③). D-129.
 *
 * SSOT: docs/planning/22-daily-auto-test.md · 결정 D-129(07 Decision Log)
 * 규칙(날짜 펴기·실제가 이긴다·밀림 셈)은 순수 함수 `src/lib/daily/progressPlan.ts` 한 곳에 있다.
 *
 * 대응 API 경로:
 *   GET /api/tests/auto-draft/cron — Vercel cron 전용(KST 08:00). 세션이 아니라 CRON_SECRET.
 *   GET    /api/classes/{id}/progress-plan   — 반 계획 · 이번 주 예정 · 학생 계획들 (?day=YYYY-MM-DD)
 *   PUT    /api/classes/{id}/progress-plan   — 반 계획 넣기(201)·**덮어쓰기**(200) — 반에 한 줄
 *   PATCH  /api/classes/{id}/progress-plan   — 일부 고치기 · 켜기/끄기
 *   DELETE /api/classes/{id}/progress-plan   — 지우기(그 반은 자동에서 빠진다)
 *   GET/PUT/PATCH/DELETE /api/students/{id}/progress-plan — 학생 계획(**개별 진도 학생만** 넣고 고친다)
 *   POST   /api/classes (`progressPlan` 칸) — 반을 만들 때 계획을 같이(class.contract.ts)
 *
 * 🔴 본문이 계약을 어기면 **422** 다(`VALIDATION_ERROR`) — 차시가 없거나 개별 진도 학생이 아닌 것도 같다.
 *    경로 id 형식만 지금 관례대로 400.
 *
 * ⚠️ 화면 계약은 여기 없다 — 반 설정의 요일·계획 칸은 **D-07 시안 뒤**다(22 §4 ④).
 */
import { z } from "zod";

import {
  dataResponseSchema,
  isoDateSchema,
  uuidSchema,
} from "./common.contract";
import { unitSchema } from "./unit.contract";

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
// ④ 계획 쓰기·읽기 API (화면은 D-07 Hi-fi 뒤)
// ─────────────────────────────────────────────

/**
 * 계획 넣기·덮어쓰기(PUT) 본문 — 규칙 한 줄. 반인지 학생인지는 **경로**가 정한다(본문에 id 가 없다).
 * 한 수업당 차시 수는 기본 1(22 §5 원장님 답) · 켜짐은 기본 켬.
 */
export const progressPlanWriteRequestSchema = progressPlanRuleSchema.extend({
  unitsPerLesson: progressPlanRuleSchema.shape.unitsPerLesson.default(1),
  active: progressPlanRuleSchema.shape.active.default(true),
});
export type ProgressPlanWriteRequest = z.infer<
  typeof progressPlanWriteRequestSchema
>;

/** 일부 고치기(PATCH) — 켜기/끄기만 보내도 된다. 빈 본문은 막는다. */
export const progressPlanPatchRequestSchema = progressPlanRuleSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    error: "수정할 값이 없습니다.",
  });
export type ProgressPlanPatchRequest = z.infer<
  typeof progressPlanPatchRequestSchema
>;

export const progressPlanResponseSchema =
  dataResponseSchema(progressPlanSchema);

/** 예정·실제 차시 — 화면이 이름을 그린다(학년 › 단원 › 차시). */
export const planUnitRefSchema = unitSchema.omit({ orderIndex: true });
export type PlanUnitRef = z.infer<typeof planUnitRefSchema>;

/**
 * 「이번 주 예정」 한 줄 — 수업일이거나 실제로 진도가 기록된 날만 선다.
 * 규칙: `src/lib/daily/planSchedule.ts` (예정은 **그날 아침 기준** · 밀림은 그 날짜까지의 기록 기준).
 */
export const planScheduleRowSchema = z.strictObject({
  date: isoDateSchema,
  weekday: lessonWeekdaySchema,
  /** 계획상 그날 수업인가. 보강처럼 기록만 있는 날은 거짓. */
  lesson: z.boolean(),
  planned: z.array(planUnitRefSchema),
  actual: z.array(planUnitRefSchema),
  /** 양수 앞섬 · 음수 밀림 · 기록이 없으면 0. */
  driftDays: z.number().int(),
  /** 교육과정 끝에 닿아 끝 차시에 멈춰 있다. */
  atCurriculumEnd: z.boolean(),
});
export type PlanScheduleRowEntity = z.infer<typeof planScheduleRowSchema>;

/** 이번 주 월요일 ~ 다음 주 일요일(14일). */
export const planScheduleSchema = z.strictObject({
  from: isoDateSchema,
  to: isoDateSchema,
  rows: z.array(planScheduleRowSchema),
});
export type PlanScheduleEntity = z.infer<typeof planScheduleSchema>;

/** GET 의 `?day=` — 없으면 오늘(KST). 지난 주·다음 주를 볼 때. */
export const progressPlanQuerySchema = z.strictObject({
  day: isoDateSchema.optional(),
});

export const classProgressPlanResponseSchema = dataResponseSchema(
  z.strictObject({
    /** 반 계획 — 없으면 null. */
    plan: progressPlanSchema.nullable(),
    /** 반 계획을 반 진도로 편 예정 — 계획이 없으면 null. */
    schedule: planScheduleSchema.nullable(),
    /** 이 반 학생들의 학생 계획 — 누가 반 계획을 덮는지 화면이 안다. */
    studentPlans: z.array(progressPlanSchema),
  }),
);
export type ClassProgressPlanResponse = z.infer<
  typeof classProgressPlanResponseSchema
>;

export const studentProgressPlanResponseSchema = dataResponseSchema(
  z.strictObject({
    plan: progressPlanSchema.nullable(),
    /** 이 학생 계획이 지금 반 계획을 덮나 — 계획이 있고 개별 진도 학생일 때만 참(`pickProgressPlan`). */
    inEffect: z.boolean(),
    /** 학생 계획을 그 학생의 적용 진도로 편 예정 — 덮지 않으면 null(반 계획을 보라). */
    schedule: planScheduleSchema.nullable(),
  }),
);
export type StudentProgressPlanResponse = z.infer<
  typeof studentProgressPlanResponseSchema
>;

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
