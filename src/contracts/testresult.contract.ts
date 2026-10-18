/**
 * 학생 응시 결과 계약 — v2 "오늘의 시험"(기출 예상 점수 판독기) T7.1.
 *
 * 대응 API 경로:
 *   POST   /api/tests/{id}/submit                — 채점 결과 입력(자동 채점 + 예상 점수 산출)
 *   GET    /api/tests/{id}/results                — 학생별 응시 결과 목록
 *   GET    /api/tests/{id}/results/{studentId}    — 특정 학생의 상세 분석 리포트(최신 1건)
 *
 * 참조: docs/planning/11-score-predictor.md §1 (산출물 A/B/C, "1차 산출물: 엔진 + 리포트 먼저")
 *       prisma/schema.prisma의 TestResult/ProblemAnswer/AnalysisReport
 *
 * ⚠️ T7.1 지시서의 예시 스키마는 SubmitTestResultSchema.testId를 요청 본문에 포함했으나,
 *    이 API는 testId를 경로 파라미터({id})로 이미 받으므로 본문에 중복·불일치 위험이 있는
 *    testId를 넣지 않는다(REST 관례 + idParamSchema 재사용, 다른 /api/tests/{id}/* 엔드포인트와
 *    일관). studentId만 본문에 남긴다 — 완료 보고에 근거 명시.
 * ⚠️ predictedScore(판독기 계산값)는 잠정 placeholder다 —
 *    src/lib/predictor/predictStudentScore.ts 상단 주석 참조.
 */
import { z } from "zod";

import {
  dataResponseSchema,
  difficultySchema,
  isoDateSchema,
  isoDateTimeSchema,
  testStatusSchema,
  testTypeSchema,
  uuidSchema,
} from "./common.contract";

// ─────────────────────────────────────────────
// 채점 방식 · 결시 — 세 상태의 자리 (D-134 트랙 1)
// ─────────────────────────────────────────────

/**
 * 한 채점 기록이 **어떻게 들어왔는가** — Prisma `GradingMode` 와 같은 값이다.
 *
 * 🔴 두 방식이 담는 것이 다르다. `marks` 는 `selectedChoice`·`essayScore` 가 **전부 NULL** 인데,
 *    기존 채점 규칙은 그 둘이 NULL 이면 **미답 → 오답 0점**으로 읽는다. 가르지 않으면
 *    「오답 표시로 채점했다」와 「전사했는데 다 비었다」가 같은 행이 된다.
 */
export const gradingModeSchema = z.enum(["marks", "answers"], {
  error: "채점 방식은 marks 또는 answers 여야 합니다.",
});
export type GradingMode = z.infer<typeof gradingModeSchema>;

// ─────────────────────────────────────────────
// 채점 결과 입력 (POST /api/tests/{id}/submit)
// ─────────────────────────────────────────────

/**
 * 문항 1개에 대한 학생 응답 — 객관식(selectedChoice)과 서술형(essayScore) 중 하나만 값을 갖고,
 * 둘 다 NULL이면 미답으로 채점한다(오답 처리, 0점).
 */
export const problemAnswerInputSchema = z.strictObject({
  problemId: uuidSchema,
  /** 객관식 선택 번호(1~5). 서술형/미답이면 NULL. */
  selectedChoice: z
    .number()
    .int()
    .min(1, { error: "선택 번호는 1 이상이어야 합니다." })
    .max(5, { error: "선택 번호는 5 이하여야 합니다." })
    .nullable(),
  /** 서술형 채점 점수(0~100, 배점 대비 비율). 객관식/미답이면 NULL. */
  essayScore: z
    .number()
    .min(0, { error: "서술형 점수는 0 이상이어야 합니다." })
    .max(100, { error: "서술형 점수는 100 이하여야 합니다." })
    .nullable(),
  /** 시험지 내 문항 순서 — TestProblem.orderIndex와 대응. */
  sequence: z.number().int().min(0),
});
export type ProblemAnswerInput = z.infer<typeof problemAnswerInputSchema>;

export const testResultSubmitRequestSchema = z.strictObject({
  studentId: uuidSchema,
  answers: z
    .array(problemAnswerInputSchema)
    .min(1, { error: "채점할 응답이 최소 1건 이상이어야 합니다." }),
});
export type TestResultSubmitRequest = z.infer<
  typeof testResultSubmitRequestSchema
>;

// ─────────────────────────────────────────────
// 엔티티
// ─────────────────────────────────────────────

export const problemAnswerSchema = z.strictObject({
  id: uuidSchema,
  problemId: uuidSchema,
  selectedChoice: z.number().int().min(1).max(5).nullable(),
  essayScore: z.number().min(0).max(100).nullable(),
  isCorrect: z.boolean(),
  sequence: z.number().int().min(0),
});
export type ProblemAnswerEntity = z.infer<typeof problemAnswerSchema>;

/** 난이도별 정답/전체 문항 수. */
export const difficultyDistributionEntrySchema = z.strictObject({
  correct: z.number().int().min(0),
  total: z.number().int().min(0),
});

export const analysisReportSchema = z.strictObject({
  id: uuidSchema,
  testResultId: uuidSchema,
  totalScore: z.number(),
  /** 잠정 placeholder — src/lib/predictor/predictStudentScore.ts 참조. */
  predictedScore: z.number(),
  /** {unitId: 정답률(0~100)} */
  unitScores: z.record(uuidSchema, z.number()),
  /** {difficulty(연산|기본|응용|심화): {correct, total}} — 네 갈래가 **전부** 있어야 한다 (D-106) */
  difficultyDistribution: z.record(
    difficultySchema,
    difficultyDistributionEntrySchema,
  ),
  /** 복습 추천 단원 id — 정답률 낮은 순 최대 3개(잠정 기준선 60%). */
  recommendedUnits: z.array(uuidSchema),
  createdAt: isoDateTimeSchema,
});
export type AnalysisReportEntity = z.infer<typeof analysisReportSchema>;

export const testResultSchema = z.strictObject({
  id: uuidSchema,
  testId: uuidSchema,
  studentId: uuidSchema,
  takenAt: isoDateTimeSchema,
  /**
   * 🔴 **결시면 null 이다** — `0` 으로 적으면 그 0이 평균·추이·리포트에 **진짜 0점처럼**
   *    실린다(23 §4 ③). 읽는 쪽은 `score ?? 0` 을 쓰면 안 된다.
   */
  score: z.number().nullable(),
  /** 잠정 placeholder — src/lib/predictor/predictStudentScore.ts 참조. 결시면 null. */
  predictedScore: z.number().nullable(),
  /**
   * 🔴 **칸이 없던 옛 본문은 `answers` 로 읽는다** — 기존 `POST /api/tests/{id}/submit` 의
   *    뜻을 한 글자도 안 바꾼다.
   */
  gradingMode: gradingModeSchema.default("answers"),
  /** 결시 — 칸을 전부 ✕ 로 찍은 것(전 문항 오답)과 **다른 뜻**이다. 옛 본문은 결시가 아니다. */
  absent: z.boolean().default(false),
  createdAt: isoDateTimeSchema,
});
export type TestResultEntity = z.infer<typeof testResultSchema>;

// ─────────────────────────────────────────────
// 응답 (제출 직후 — 자동 채점 + 분석 리포트 동봉)
// ─────────────────────────────────────────────

export const testResultSubmitResponseSchema = dataResponseSchema(
  z.strictObject({
    testResult: testResultSchema,
    analysisReport: analysisReportSchema,
  }),
);
export type TestResultSubmitResponse = z.infer<
  typeof testResultSubmitResponseSchema
>;

// ─────────────────────────────────────────────
// 목록 조회 (GET /api/tests/{id}/results)
// ─────────────────────────────────────────────

export const testResultListResponseSchema = dataResponseSchema(
  z.array(testResultSchema),
);
export type TestResultListResponse = z.infer<
  typeof testResultListResponseSchema
>;

// ─────────────────────────────────────────────
// 학생별 상세 조회 (GET /api/tests/{id}/results/{studentId}) — 최신 1건
// ─────────────────────────────────────────────

export const testResultDetailResponseSchema = dataResponseSchema(
  z.strictObject({
    testResult: testResultSchema,
    answers: z.array(problemAnswerSchema),
    analysisReport: analysisReportSchema,
  }),
);
export type TestResultDetailResponse = z.infer<
  typeof testResultDetailResponseSchema
>;

// ─────────────────────────────────────────────
// 채점 입력 — A안(표: 학생 × 문항, 틀린 번호만)
//   GET  /api/tests/{id}/grade  — 채점표(대상 학생 · 문항 · 지금까지 채점된 것)
//   POST /api/tests/{id}/grade  — 한 시험지의 **여러 학생을 한 번에** 저장
//
// 🔴 **기존 `/submit` 과 왜 다른 경로인가** — 보고서 `tracks/reports/grading-input.md` ②.
//    한 줄로: `/submit` 은 **학생 하나 · 응답 전량**을 받아 자동 채점하고, 이 경로는
//    **시험지 하나 · 학생 전원 · 정오만**을 받는다. 받는 것도 거절하는 까닭도 다르다.
// ─────────────────────────────────────────────

/** 채점표의 열 하나 — 화면의 문항 번호가 가리키는 문항. */
export const gradeSheetProblemSchema = z.strictObject({
  problemId: uuidSchema,
  /** 화면에 찍히는 번호 — **1부터**. `TestProblem.orderIndex` 차례를 1부터 다시 센 값이다. */
  no: z.number().int().min(1),
  /** `ProblemAnswer.sequence` 로 적힐 값 — `TestProblem.orderIndex` 그대로. */
  sequence: z.number().int().min(0),
  problemCode: z.string(),
  difficulty: difficultySchema,
});
export type GradeSheetProblem = z.infer<typeof gradeSheetProblemSchema>;

/**
 * 그 학생의 **가장 최근** 채점 기록. 🔴 이 칸이 `null` 이면 «**아직 안 봄**»이다 —
 * 0점도 만점도 결시도 아니다(`TestResult` 행이 없는 것).
 */
export const gradeSheetMarkSchema = z.strictObject({
  testResultId: uuidSchema,
  takenAt: isoDateTimeSchema,
  gradingMode: gradingModeSchema,
  absent: z.boolean(),
  /** 결시면 null. */
  score: z.number().nullable(),
  /** 틀렸다고 표시된 문항 — 문항 차례대로. 결시면 빈 배열. */
  wrongProblemIds: z.array(uuidSchema),
  correctCount: z.number().int().min(0),
});
export type GradeSheetMark = z.infer<typeof gradeSheetMarkSchema>;

export const gradeSheetStudentSchema = z.strictObject({
  studentId: uuidSchema,
  name: z.string(),
  latest: gradeSheetMarkSchema.nullable(),
});
export type GradeSheetStudent = z.infer<typeof gradeSheetStudentSchema>;

export const gradeSheetResponseSchema = dataResponseSchema(
  z.strictObject({
    testId: uuidSchema,
    publicationId: uuidSchema.nullable().optional(),
    className: z.string(),
    /** 학생별 출제면 그 학생 이름 — 반 전체 시험이면 null(검수 화면과 같은 규약). */
    studentName: z.string().nullable(),
    testType: testTypeSchema,
    testDate: isoDateSchema,
    status: testStatusSchema,
    problems: z.array(gradeSheetProblemSchema),
    /** 🔴 **시험지 대상 학생 전원** — 학생별 출제면 그 한 명, 아니면 반 학생 전부. */
    students: z.array(gradeSheetStudentSchema),
  }),
);
export type GradeSheetResponse = z.infer<typeof gradeSheetResponseSchema>;

/**
 * 학생 한 명의 채점 결과 — 화면이 표에서 찍은 것 그대로.
 *
 * 🔴 `absent` 에 기본값을 두지 않는다. 빠뜨린 줄을 «응시»로 지어내면, 결석생이
 *    조용히 응시자가 된다. 요청하는 쪽이 매번 **둘 중 하나를 말해야** 한다.
 */
export const gradeEntrySchema = z
  .strictObject({
    studentId: uuidSchema,
    absent: z.boolean(),
    wrongProblemIds: z.array(uuidSchema),
  })
  .refine((e) => !e.absent || e.wrongProblemIds.length === 0, {
    error: "결시 학생에게는 오답 번호를 붙일 수 없습니다.",
    path: ["wrongProblemIds"],
  })
  .refine((e) => new Set(e.wrongProblemIds).size === e.wrongProblemIds.length, {
    error: "같은 문항이 두 번 들어왔습니다.",
    path: ["wrongProblemIds"],
  });
export type GradeEntry = z.infer<typeof gradeEntrySchema>;

export const gradeSubmitRequestSchema = z
  .strictObject({
    /** 🔴 **이번에 채점한 학생을 전부** 싣는다 — 서버는 빠진 이름이 있으면 거절한다. */
    entries: z
      .array(gradeEntrySchema)
      .min(1, { error: "채점할 학생이 최소 1명 이상이어야 합니다." }),
  })
  .refine(
    (body) =>
      new Set(body.entries.map((e) => e.studentId)).size ===
      body.entries.length,
    {
      error: "같은 학생이 두 번 들어왔습니다.",
      path: ["entries"],
    },
  );
export type GradeSubmitRequest = z.infer<typeof gradeSubmitRequestSchema>;

/** 저장 직후 화면이 띄우는 **학생별 점수 목록** — 23 §4 ① 때문에 여기까지만이다. */
export const gradeScoreLineSchema = z.strictObject({
  studentId: uuidSchema,
  name: z.string(),
  absent: z.boolean(),
  correctCount: z.number().int().min(0),
  problemCount: z.number().int().min(0),
  /** 결시면 null — **0 이 아니다.** */
  score: z.number().nullable(),
});
export type GradeScoreLine = z.infer<typeof gradeScoreLineSchema>;

export const gradeSubmitResponseSchema = dataResponseSchema(
  z.strictObject({
    testId: uuidSchema,
    scores: z.array(gradeScoreLineSchema),
    /** 결시를 뺀 채점 인원 — 「몇 명을 실제로 쟀나」의 분모다. */
    gradedCount: z.number().int().min(0),
    absentCount: z.number().int().min(0),
  }),
);
export type GradeSubmitResponse = z.infer<typeof gradeSubmitResponseSchema>;
