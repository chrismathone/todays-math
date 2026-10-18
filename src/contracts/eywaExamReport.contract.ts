import { z } from "zod";
import {
  isoDateSchema,
  isoDateTimeSchema,
  uuidSchema,
} from "./common.contract";
import { studentExamReportSchema } from "./examReport.contract";

export const examReportDigestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const sourceStudentId = z
  .string()
  .min(1)
  .max(200)
  .refine((id) => !/[\u0000-\u001f\u007f/]/.test(id));
export const examReportSnapshotSchema = z
  .strictObject({
    report: studentExamReportSchema,
    layoutVersion: z.string().min(1).max(100),
    options: z.strictObject({
      format: z.enum(["S1", "M1"]),
      wrongQuestions: z.boolean(),
      retries: z.boolean(),
      teacherNote: z.boolean(),
      classAverage: z.boolean().default(false),
    }),
    classComparison: z
      .strictObject({
        averageScore: z.number().nonnegative(),
        gradedCount: z.number().int().positive(),
      })
      .nullable()
      .default(null),
  })
  .superRefine(({ report, options, classComparison }, ctx) => {
    if (
      report.status !== "graded" ||
      !report.resultId ||
      !report.takenAt ||
      report.score.value === null ||
      report.score.maximum === null ||
      report.score.value > report.score.maximum ||
      report.questionCount < 1 ||
      report.questions.length !== report.questionCount ||
      report.questions.some((q) => q.isCorrect === null) ||
      report.correctCount !== report.questions.filter((q) => q.isCorrect).length
    )
      ctx.addIssue({
        code: "custom",
        message: "채점이 완료된 성적표만 확정할 수 있습니다.",
      });
    if (
      options.classAverage &&
      (!classComparison ||
        classComparison.averageScore > (report.score.maximum ?? 0))
    )
      ctx.addIssue({ code: "custom", message: "반 평균의 근거가 없습니다." });
    if (
      new Set(report.questions.map((q) => q.problemId)).size !==
        report.questionCount ||
      report.questions.some((q, i) => q.no !== i + 1) ||
      JSON.stringify(report.wrongQuestions) !==
        JSON.stringify(report.questions.filter((q) => q.isCorrect === false))
    )
      ctx.addIssue({
        code: "custom",
        message: "문항 차례와 오답 내역이 일치하지 않습니다.",
      });
  });
export type ExamReportSnapshot = z.input<typeof examReportSnapshotSchema>;

/** 적용 전 SQL 초안의 보관본 계약. 실제 쓰기·확정 경로는 아직 없다. */
export const confirmedExamReportArtifactSchema = z.strictObject({
  id: uuidSchema,
  state: z.enum(["draft", "confirmed"]),
  confirmedAt: isoDateTimeSchema,
  snapshot: examReportSnapshotSchema,
  sourceDigest: examReportDigestSchema,
  pdfSha256: examReportDigestSchema,
  pdfSize: z.number().int().min(5).max(4_000_000),
});
export type ConfirmedExamReportArtifact = z.input<
  typeof confirmedExamReportArtifactSchema
>;

export const examReportItemSchema = z.strictObject({
  publicationId: uuidSchema,
  sourceStudentId,
  sourceTestId: uuidSchema,
  testDate: isoDateSchema,
  sha256: examReportDigestSchema,
  pdfSha256: examReportDigestSchema,
  confirmedAt: isoDateTimeSchema,
});
export type EywaExamReportItem = z.infer<typeof examReportItemSchema>;
export const examReportDaySchema = z
  .strictObject({
    version: z.literal("v1"),
    bindingId: uuidSchema,
    date: isoDateSchema,
    availability: z.enum(["ready", "not-installed"]),
    reports: z.array(examReportItemSchema),
  })
  .refine(
    (day) => day.availability === "ready" || day.reports.length === 0,
    "확정 저장소가 없으면 성적표를 내보낼 수 없습니다.",
  );
export type EywaExamReportDay = z.infer<typeof examReportDaySchema>;
export const examReportPdfRequestSchema = z.strictObject({
  date: isoDateSchema,
  publicationId: uuidSchema,
  sourceStudentId,
  sha256: examReportDigestSchema,
});
