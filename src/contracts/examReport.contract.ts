import { z } from "zod";
import {
  isoDateSchema,
  isoDateTimeSchema,
  uuidSchema,
} from "./common.contract";
import { testProblemItemSchema } from "./test.contract";

/** M5 — 화면과 독립인 한 회차의 읽기 계약. 단원 정답률·종합 지수는 만들지 않는다. */
const count = z.number().int().nonnegative();
export const examReportStatusSchema = z.enum([
  "graded",
  "absent",
  "ungraded",
  "incomplete",
]);
export const examReportScoreSchema = z.strictObject({
  value: z.number().nonnegative().nullable(),
  maximum: z.number().nonnegative().nullable(),
  unit: z.enum(["points", "questions"]),
  /** 기존 채점은 무배점도 100점으로 환산한다. 문항 수 표현과 혼동하지 않게 원값을 별도로 둔다. */
  storedValue: z.number().nonnegative().nullable(),
});
export const examReportQuestionSchema = testProblemItemSchema.shape.problem
  .pick({
    content: true,
    answer: true,
    solution: true,
    questionType: true,
    figureUrls: true,
    figureSvg: true,
    figureDims: true,
    figureSourceMm: true,
    choiceFigureIndex: true,
  })
  .extend({
    problemId: uuidSchema,
    no: count.min(1),
    unitName: z.string(),
    typeLabel: z.string().nullable(),
    isCorrect: z.boolean().nullable(),
  });
const outcome = {
  resultId: uuidSchema.nullable(),
  takenAt: isoDateTimeSchema.nullable(),
  status: examReportStatusSchema,
  score: examReportScoreSchema,
  correctCount: count.nullable(),
  questionCount: count,
};
export const studentExamReportSchema = z.strictObject({
  publication: z.strictObject({
    id: uuidSchema,
    title: z.string(),
    testDate: isoDateSchema,
  }),
  testId: uuidSchema,
  classId: uuidSchema,
  className: z.string(),
  student: z.strictObject({ id: uuidSchema, name: z.string() }),
  ...outcome,
  questions: z.array(examReportQuestionSchema),
  wrongQuestions: z.array(examReportQuestionSchema),
  teacherNote: z.string(),
  /** 읽기 배선은 별도 단계. 지면 시안에서는 선택 이력과 지어낸 픽스처만 쓴다. */
  history: z
    .array(
      z.strictObject({
        date: isoDateSchema,
        title: z.string(),
        score100: z.number().int().min(0).max(100).nullable(),
      }),
    )
    .optional(),
  /** 명시적인 원기록 연결이 있는 재시험만. 날짜·제목·단원 유사성으로 추측하지 않는다. */
  retries: z.array(
    z.strictObject({ testId: uuidSchema, testDate: isoDateSchema, ...outcome }),
  ),
});
export type StudentExamReport = z.infer<typeof studentExamReportSchema>;
export const classExamReportSchema = z.strictObject({
  publication: studentExamReportSchema.shape.publication,
  testId: uuidSchema,
  classId: uuidSchema,
  className: z.string(),
  students: z.array(
    z.strictObject({
      student: studentExamReportSchema.shape.student,
      ...outcome,
      marks: z.array(z.boolean().nullable()),
    }),
  ),
  questions: z.array(
    z.strictObject({
      problemId: uuidSchema,
      no: count.min(1),
      correctCount: count,
      answeredCount: count,
    }),
  ),
  rollup: z.strictObject({
    gradedCount: count,
    absentCount: count,
    averageScore: z.number().nonnegative().nullable(),
  }),
});
export type ClassExamReport = z.infer<typeof classExamReportSchema>;
