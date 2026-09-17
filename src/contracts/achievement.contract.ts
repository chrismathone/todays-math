/**
 * 성취 팩터 계약 — `GET /api/students/{id}/achievement?from=&to=&compare=` (D-134 트랙 2).
 *
 * SSOT: docs/planning/23-achievement-report.md §3~§5 · 브리프 `tracks/briefs/achievement-factors.md`
 * 산출 규칙의 본문은 `src/lib/achievement/collect.ts`(순수 함수)에 있다 — 이 파일은 **모양**만 못 박는다.
 *
 * ## 🔴 모든 팩터가 `.nullable()` 이다 — 그리고 그것이 이 계약의 요점이다
 *
 * 팩터 넷 중 지금 숫자를 댈 수 있는 것은 «진도» 하나다(23 §1.1 — `test_result`·`analysis_report`·
 * `concept_lecture_view`·`progress_plan` 이 전부 0행). `null` 을 못 담는 계약을 쓰면 **화면이
 * 빈칸을 0으로 그리는 길**이 계약 층에서 열린다. 그래서 여기서 먼저 막는다.
 *
 * `null`(기록 없음) 과 `0`(기록이 있는데 0) 은 **다른 값**이다. 이 저장소가 여러 번 낸 결함이라
 * (20번 «칸이 없다»를 0점으로 채우면) 순수 함수·계약·시험 세 곳이 같이 지킨다.
 *
 * ## 🔴 단일 «성취 지수» 칸이 없다 (23 §2.4)
 *
 * 가중치를 정당화할 근거가 우리에게 없다. «종합»은 **한 장에 모으는 것**이지 **한 숫자로 합치는
 * 것**이 아니다. 앞으로도 이 스키마에 합산 점수 칸을 더하지 않는다.
 *
 * ## 🔴 «결시면 점수가 없다»를 미리 전제한다
 *
 * 지금 `TestResult.score` 는 NOT NULL 이지만 트랙 1(`grading-input`)이 `absent` 를 더하고
 * `score` 를 nullable 로 바꾼다(그 브리프 §1.1). 이 계약은 **그 뒤의 뜻**으로 쓰여 있고,
 * 읽는 쪽(`src/lib/achievement/load.ts`)이 지금 스키마를 그 뜻으로 옮겨 담는다.
 * 🔴 `prisma/schema.prisma` 는 이 트랙이 건드리지 않는다 — 리드가 병합한다.
 */
import { z } from "zod";

import { ACHIEVEMENT_BANDS, MIN_UNIT_PROBLEMS } from "@/lib/achievement/types";

import {
  dataResponseSchema,
  isoDateSchema,
  isoDateTimeSchema,
  uuidSchema,
} from "./common.contract";

// ─────────────────────────────────────────────
// 질의
// ─────────────────────────────────────────────

/** 비교군 — 🔴 **기본값은 «미사용»**. 전국·석차는 없다(표본이 없다, 23 §4 ④). */
export const achievementCompareSchema = z.enum(["none", "previous", "class"]);
export type AchievementCompare = z.infer<typeof achievementCompareSchema>;

export const achievementQuerySchema = z
  .strictObject({
    from: isoDateSchema,
    to: isoDateSchema,
    compare: achievementCompareSchema.default("none"),
  })
  .refine((q) => q.from <= q.to, {
    error: "기간의 시작이 끝보다 뒤일 수 없습니다.",
    path: ["from"],
  });
export type AchievementQuery = z.infer<typeof achievementQuerySchema>;

// ─────────────────────────────────────────────
// 조각
// ─────────────────────────────────────────────

export const achievementBandSchema = z.enum(ACHIEVEMENT_BANDS);

export const achievementUnitRefSchema = z.strictObject({
  unitId: uuidSchema,
  grade: z.string(),
  chapter: z.string(),
  section: z.string(),
});

export const achievementPeriodSchema = z.strictObject({
  from: isoDateSchema,
  to: isoDateSchema,
});

// ── ① 무엇을 배웠나 ────────────────────────────────────────────────────

export const coveredUnitSchema = achievementUnitRefSchema.extend({
  lessons: z.number().int().min(1),
});

/** 밀림을 **못 재는** 까닭 — `planDriftDays` 가 `null` 일 때만 값이 있다. */
export const planDriftGapSchema = z.enum([
  "계획없음",
  "계획꺼짐",
  "진도없음",
  "차시밖",
]);

export const learnedFactorsSchema = z.strictObject({
  /** 🔴 진도 0행이면 `null` — 빈 배열이 아니다. */
  units: z.array(coveredUnitSchema).nullable(),
  lessons: z.number().int().min(1).nullable(),
  /** 음수면 밀림 · 양수면 앞섬 · 0 이면 계획대로. 🔴 계획이 없으면 `null`(«0일 밀림»이 아니다). */
  planDriftDays: z.number().int().nullable(),
  planDriftGap: planDriftGapSchema.nullable(),
});

// ── ② 얼마나 맞았나 ────────────────────────────────────────────────────

export const scoredRoundSchema = z.strictObject({
  testId: uuidSchema,
  testDate: isoDateSchema,
  takenAt: isoDateTimeSchema,
  /** 🔴 결시면 `null` — 0점으로 적으면 평균·추이에 진짜 0점처럼 실린다. */
  score: z.number().nullable(),
  maxScore: z.number().nullable(),
});

export const unitAccuracySchema = achievementUnitRefSchema.extend({
  correct: z.number().int().min(0),
  total: z.number().int().min(MIN_UNIT_PROBLEMS),
  accuracy: z.number().min(0).max(100),
});

/** 문항 12개 미만이라 **정답률을 안 낸** 단원 — 숨긴 게 아니라 여기 있다. */
export const underSampledUnitSchema = achievementUnitRefSchema.extend({
  total: z
    .number()
    .int()
    .min(1)
    .max(MIN_UNIT_PROBLEMS - 1),
  needed: z.literal(MIN_UNIT_PROBLEMS),
});

export const bandAccuracySchema = z.strictObject({
  correct: z.number().int().min(0),
  total: z.number().int().min(1),
  accuracy: z.number().min(0).max(100),
});

export const reviewUnitSchema = achievementUnitRefSchema.extend({
  flaggedRounds: z.number().int().min(1),
  problems: z.number().int().min(0),
  /** 🔴 표본 부족이면 `null` — 0% 가 아니다. */
  accuracy: z.number().min(0).max(100).nullable(),
});

export const scoredFactorsSchema = z.strictObject({
  /** 🔴 채점 0건이면 `null`, 있는데 전부 결시면 빈 배열. */
  rounds: z.array(scoredRoundSchema).nullable(),
  absentRounds: z.array(scoredRoundSchema).nullable(),
  averagePercent: z.number().min(0).max(100).nullable(),
  unitAccuracy: z
    .strictObject({
      reported: z.array(unitAccuracySchema),
      underSampled: z.array(underSampledUnitSchema),
    })
    .nullable(),
  /** 네 밴드가 **전부** 있고, 문항 0인 밴드는 그 밴드만 `null`. */
  bandAccuracy: z
    .strictObject(
      Object.fromEntries(
        ACHIEVEMENT_BANDS.map((band) => [band, bandAccuracySchema.nullable()]),
      ) as Record<
        (typeof ACHIEVEMENT_BANDS)[number],
        z.ZodNullable<typeof bandAccuracySchema>
      >,
    )
    .nullable(),
  /** 🔴 분석 리포트 0건이면 `null`, 리포트는 있는데 꼽힌 단원이 없으면 빈 배열. */
  reviewUnits: z.array(reviewUnitSchema).nullable(),
});

// ── ③ 스스로 한 것 ─────────────────────────────────────────────────────

export const lectureFactorsSchema = z.strictObject({
  assigned: z.number().int().min(1),
  completed: z.number().int().min(0),
  averagePercent: z.number().min(0).max(100),
});

export const selfStudyFactorsSchema = z.strictObject({
  /** 🔴 대상 강의가 0편이면 `null` — 「0편 봤다」와 다른 말이다. */
  lectures: lectureFactorsSchema.nullable(),
  /** 🔴 숙제는 **표가 없다**(23 §3 축 12) — 언제나 `null`. 자리만 비워 둔다. */
  homework: z.null(),
});

// ── 비교군 ─────────────────────────────────────────────────────────────

export const comparisonMetricSchema = z.strictObject({
  value: z.number().nullable(),
  /** 🔴 **그 평균의 분모** — 값을 낸 사람이 몇인가. */
  sample: z.number().int().min(0),
});

export const comparisonSchema = z.strictObject({
  kind: z.enum(["지난기간", "반평균"]),
  /** 🔴 표본 수를 반드시 같이 낸다 — 반 최대 10명이라 「반 평균」은 얇다. */
  sampleSize: z.number().int().min(0),
  lessons: comparisonMetricSchema,
  averagePercent: comparisonMetricSchema,
});

// ─────────────────────────────────────────────
// 응답
// ─────────────────────────────────────────────

export const achievementFactorsSchema = z.strictObject({
  student: z.strictObject({
    id: uuidSchema,
    name: z.string(),
    className: z.string(),
    classGrade: z.string(),
  }),
  period: achievementPeriodSchema,
  learned: learnedFactorsSchema,
  scored: scoredFactorsSchema,
  selfStudy: selfStudyFactorsSchema,
  /** 🔴 ④ 선생님 의견 — **아직 칸이 없다.** 언제나 `null`. 태도는 숫자가 아니라 문장이다(23 §2.4 ②). */
  teacherNote: z.null(),
  /** 🔴 기본값 «미사용» 이라 `null`. */
  comparison: comparisonSchema.nullable(),
});
export type AchievementFactorsPayload = z.infer<
  typeof achievementFactorsSchema
>;

export const achievementResponseSchema = dataResponseSchema(
  achievementFactorsSchema,
);
export type AchievementResponse = z.infer<typeof achievementResponseSchema>;
