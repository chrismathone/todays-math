import { z } from "zod";
import { dataResponseSchema, uuidSchema } from "@/contracts/common.contract";
import { storedFadingDaySchema } from "@/contracts/fading.contract";
import {
  FADING_VIEW_DAYS,
  fadingConceptStatusSchema,
} from "@/contracts/fadingApi.contract";
import { courseDashboardSchema } from "@/contracts/mathSrsCourse.contract";

/**
 * «오늘의 기억» — 교사 현황의 계약 (`docs/planning/srs-overhaul-20261006.md` §15).
 *
 *   GET /api/math-srs/fading                       반 · 학생별 현황(메뉴 `srs`)
 *   GET /api/students/{id}/math-srs/fading         학생 하나 — 숫자와 고른 개념의 상태
 *
 * 읽기뿐이다. 🔴 숫자는 전부 **세는 값**이다 — 뭉친 점수가 없고(`D-134` · codex 합의 D7), 답 하나하나의 기록도 없다(`D-157`).
 * `flags` 는 «살펴볼 까닭»이다. 문턱은 자료로 맞춘 값이 아니라 정책 판(`policy`)의 값이다 — 응답에 판 번호를 같이 싣는다.
 */

const dateSchema = z.iso.date();
const count = z.number().int().min(0);

/** 살펴볼 까닭 — 이 차례로 나온다. 계정이 없으면 그것 하나만 말한다. */
export const FADING_TEACHER_FLAGS = [
  "no-account", // 계정이 없거나 꺼져 있다
  "not-started", // 계정을 만들고도 한 번도 평가를 닫지 않았다
  "overdue", // 복습이 밀렸다
  "idle", // 오래 쉬었다
] as const;
export type FadingTeacherFlag = (typeof FADING_TEACHER_FLAGS)[number];

export const fadingTeacherSummarySchema = z.strictObject({
  /** 고른 개념(은행에 있는 것만). */
  picked: count,
  /** 첫 평가를 마친 개념 — «배운 개념». 다 외웠다는 뜻이 아니다. */
  learned: count,
  stepCounts: z.strictObject({ 1: count, 2: count, 3: count, 4: count }),
  /** 복습일이 된 개념 — 오늘이 복습일인 것과 밀린 것. */
  due: count,
  /** 그 가운데 복습일이 지난 것. */
  overdue: count,
  /** 가장 오래 밀린 날 수 — 밀린 것이 없으면 0. */
  longestOverdueDays: count,
  /** 오늘 평가로 닫은 풀이와, 그중 처음 배운 것. */
  reviewedToday: count,
  freshToday: count,
  /** 마지막으로 평가를 닫은 날과 그날부터 지난 날 수 — 한 적이 없으면 `null`. */
  lastOn: dateSchema.nullable(),
  idleDays: count.nullable(),
  /** N일 연속(지금 값)과 가장 긴 값. */
  streak: z.strictObject({ current: count, best: count }),
  /** «다시»로 닫은 횟수의 합. */
  lapses: count,
  /**
   * 추가 확인(단기 재학습) 대기열에 **지금 남은** 줄의 사실 — 저장된 줄의 `since` · `fails` · `checks` 만 센다(2026-10-16).
   * 🔴 판정이 아니다(«살펴볼 까닭»에 들지 않는다). 남은 줄 · 그중 틀린 적이 있는 줄 · 틀림의 합 · 판정 난 확인의 합 · 가장 오래 남은 줄이 든 날(한국 날짜).
   * 선택 칸이다 — 이 칸이 없던 서버의 응답도 읽는다.
   */
  relearn: z
    .strictObject({
      waiting: count,
      failing: count,
      fails: count,
      checks: count,
      sinceOn: dateSchema.nullable(),
    })
    .optional(),
  /**
   * 최근 7일(오늘 포함)에 평가를 닫은 날 수와 그동안의 첫 평가 수 — 사실 표시다(«매일 하는데 새 개념이 없다»를 교사가 읽게).
   * 🔴 7일은 검증된 학습 진단 문턱이 아니다 — 판정에 쓰지 않는다. 선택 칸이다.
   */
  recent: z.strictObject({ days: count, fresh: count }).optional(),
  flags: z.array(z.enum(FADING_TEACHER_FLAGS)),
});
export type FadingTeacherSummary = z.infer<typeof fadingTeacherSummarySchema>;

export const fadingTeacherDashboardSchema = z.strictObject({
  today: dateSchema,
  /** 살펴볼 까닭의 문턱 — 정책 판 번호. */
  policy: z.number().int().min(1),
  management: courseDashboardSchema.shape.management,
  classes: z.array(z.strictObject({ id: uuidSchema, name: z.string() })),
  /** 한 학생이 두 반에 등록돼 있으면 줄이 둘이다(«SRS 현황»과 같다). */
  students: z.array(
    z.strictObject({
      id: uuidSchema,
      name: z.string(),
      classId: uuidSchema,
      className: z.string(),
      classGrade: z.string().nullable(),
      hasAccount: z.boolean(),
      summary: fadingTeacherSummarySchema,
    }),
  ),
});
export type FadingTeacherDashboard = z.infer<
  typeof fadingTeacherDashboardSchema
>;
export const fadingTeacherDashboardResponseSchema = dataResponseSchema(
  fadingTeacherDashboardSchema,
);

export const fadingTeacherStudentSchema = z.strictObject({
  today: dateSchema,
  policy: z.number().int().min(1),
  student: z.strictObject({
    id: uuidSchema,
    name: z.string(),
    classId: uuidSchema,
    className: z.string(),
    hasAccount: z.boolean(),
  }),
  summary: fadingTeacherSummarySchema,
  /** 고른 개념의 상태 — 묶음 표의 차례. 🔴 개념의 이름(용어)과 상태뿐이다 — 문장과 답은 싣지 않는다. */
  concepts: z.array(fadingConceptStatusSchema),
  /** 최근 여덟 주의 집계. `passed` 는 정답률이 아니다 — «다시»가 아닌 평가의 수다. */
  days: z.array(storedFadingDaySchema).max(FADING_VIEW_DAYS),
});
export type FadingTeacherStudent = z.infer<typeof fadingTeacherStudentSchema>;
export const fadingTeacherStudentResponseSchema = dataResponseSchema(
  fadingTeacherStudentSchema,
);
