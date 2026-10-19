import { z } from "zod";
import { uuidSchema, isoDateTimeSchema } from "./common.contract";
import {
  classExamReportSchema,
  studentExamReportSchema,
} from "./examReport.contract";
import { EXAM_REPORT_NOTE_LIMIT } from "@/lib/examReport/settings";

export const examReportOptionsSchema = z.strictObject({
  /** M1은 기존 저장값·확정 PDF 지문 호환용. 새 선택·출력은 S1 요약만 쓴다. */
  format: z.enum(["S1", "M1"]).default("S1"),
  wrongQuestions: z.boolean().default(true),
  retries: z.boolean().default(true),
  teacherNote: z.boolean().default(true),
  classAverage: z.boolean().default(false),
});
export type ExamReportOptions = z.infer<typeof examReportOptionsSchema>;
export const examReportWorkflowStatusSchema = z.enum([
  "none",
  "draft",
  "confirmed",
  "stale",
  "absent",
  "ungraded",
  "incomplete",
]);
const revision = z.number().int().nonnegative();
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const note = z.string().max(EXAM_REPORT_NOTE_LIMIT);
export const examReportNoteInputSchema = z.strictObject({
  expectedRevision: revision,
  teacherNote: note,
});
export const examReportConfirmInputSchema = z.strictObject({
  expectedRevision: revision,
  teacherNote: note.optional(),
});
export const examReportSettingsInputSchema = z.strictObject({
  expectedOptionsDigest: digest,
  options: examReportOptionsSchema.extend({
    format: z.literal("S1").default("S1"),
  }),
});
export const examReportPrintInputSchema = z.strictObject({
  scope: z.enum(["confirmed", "all"]).default("confirmed"),
  kind: z.enum(["students", "class"]).default("students"),
});
export const examReportSummarySchema = z.strictObject({
  student: studentExamReportSchema.shape.student,
  gradingStatus: studentExamReportSchema.shape.status,
  score: studentExamReportSchema.shape.score,
  wrongCount: z.number().int().nonnegative(),
  teacherNote: z.string(),
  revision,
  status: examReportWorkflowStatusSchema,
  confirmedAt: isoDateTimeSchema.nullable(),
});
export const examReportStudentResponseSchema = z.strictObject({
  data: z.strictObject({
    report: studentExamReportSchema,
    summary: examReportSummarySchema,
    options: examReportOptionsSchema,
    classComparison: z
      .strictObject({
        averageScore: z.number().nonnegative().nullable(),
        gradedCount: z.number().int().nonnegative(),
      })
      .nullable(),
  }),
});
export const examReportListResponseSchema = z.strictObject({
  data: z.strictObject({
    classReport: classExamReportSchema,
    options: examReportOptionsSchema,
    optionsDigest: digest,
    students: z.array(examReportSummarySchema),
  }),
});
export const examReportRouteParamsSchema = z.strictObject({
  testId: uuidSchema,
});
export const examReportStudentParamsSchema = examReportRouteParamsSchema.extend(
  { studentId: uuidSchema },
);
export type ExamReportSummary = z.infer<typeof examReportSummarySchema>;
export type ExamReportList = z.infer<
  typeof examReportListResponseSchema
>["data"];
export type ExamReportStudent = z.infer<
  typeof examReportStudentResponseSchema
>["data"];
