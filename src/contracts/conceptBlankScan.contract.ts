import { z } from "zod";
import {
  CONCEPT_BLANK_FORMS,
  conceptBlankSelectionSchema,
  figureItemSchema,
} from "./conceptBlank.contract";

/** v1 freezes print-time content. Never rebuild a saved snapshot from today's bank. */
const id = z.string().min(1).max(240);
const text = z.string().max(12_000);
const nonempty = text.refine(
  (s) => s.trim().length > 0,
  "빈 글은 허용하지 않습니다.",
);
const positiveInt = z.number().int().positive();
export const scanSlotSchema = z.strictObject({
  id,
  questionId: id,
  kind: z.enum([
    "recall",
    "answer",
    "ox-mark",
    "ox-reason",
    "cloze",
    "meaning",
    "example",
    "figure-tag",
    "figure-line",
  ]),
  label: nonempty,
});
export const scanQuestionSchema = z.strictObject({
  id,
  number: positiveInt,
  sourceId: id,
  prompt: nonempty,
  figure: figureItemSchema.optional(),
});
export const scanTargetSchema = z.strictObject({
  id,
  questionId: id,
  kind: z.enum(["concept", "ox", "cloze", "apply", "example", "figure"]),
  slotIds: z.array(id).min(1).max(4),
  referenceAnswer: nonempty,
  requiredIdeas: z
    .array(z.strictObject({ anyOf: z.array(nonempty).min(1).max(10) }))
    .min(1)
    .max(10),
  /** A has region-level writing but concept-level judgments; no invented matching rule. */
  manualReviewReason: nonempty.optional(),
});
const pageBase = z.strictObject({
  number: positiveInt,
  form: z.enum(CONCEPT_BLANK_FORMS),
  questions: z.array(scanQuestionSchema).min(1).max(2000),
  slots: z.array(scanSlotSchema).min(1).max(8000),
  targets: z.array(scanTargetSchema).max(8000),
});
export const scanPageSchema = pageBase.superRefine((page, ctx) => {
  const unique = (values: string[]) => new Set(values).size === values.length;
  const questions = new Set(page.questions.map((q) => q.id));
  const slots = new Map(page.slots.map((s) => [s.id, s]));
  if (
    !unique(page.questions.map((q) => q.id)) ||
    !unique(page.slots.map((s) => s.id)) ||
    !unique(page.targets.map((t) => t.id))
  )
    ctx.addIssue({
      code: "custom",
      message: "문항·칸·판정 id는 중복될 수 없습니다.",
    });
  if (
    page.slots.some((s) => !questions.has(s.questionId)) ||
    page.targets.some(
      (t) =>
        !questions.has(t.questionId) ||
        !unique(t.slotIds) ||
        t.slotIds.some((s) => slots.get(s)?.questionId !== t.questionId),
    )
  )
    ctx.addIssue({
      code: "custom",
      message: "문항과 답 칸 연결이 맞지 않습니다.",
    });
});
export const scanSnapshotSchema = z
  .strictObject({
    version: z.literal(1),
    selection: conceptBlankSelectionSchema,
    /** Exact-pick / overlong-code sheets print no code. Never manufacture one. */
    sheetCode: z.string().min(1).max(20_000).nullable(),
    bankFingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    pageCount: positiveInt.max(2000),
    pages: z.array(scanPageSchema).min(1).max(2000),
  })
  .superRefine((snapshot, ctx) => {
    const globalIds = (field: "slots" | "questions" | "targets") =>
      snapshot.pages.flatMap((p) => p[field].map((v) => v.id));
    if (
      snapshot.pageCount !== snapshot.pages.length ||
      snapshot.pages.some((p, i) => p.number !== i + 1) ||
      ["slots", "questions", "targets"].some((field) => {
        const ids = globalIds(field as "slots" | "questions" | "targets");
        return ids.length !== new Set(ids).size;
      })
    )
      ctx.addIssue({
        code: "custom",
        message: "학생지 쪽 수·차례·id가 맞지 않습니다.",
      });
  });

export const scanReadSchema = z
  .strictObject({
    id,
    status: z.enum(["read", "uncertain", "unreadable", "blank"]),
    text,
  })
  .superRefine((r, ctx) => {
    if (
      (r.status === "read" && !r.text.trim()) ||
      ((r.status === "blank" || r.status === "unreadable") && r.text !== "")
    )
      ctx.addIssue({
        code: "custom",
        message: "읽기 상태와 글이 맞지 않습니다.",
      });
  });
export const scanActorSchema = z.strictObject({
  kind: z.enum(["student", "teacher"]),
  id,
});
export const scanCorrectionSchema = z.strictObject({
  slotId: id,
  text,
  actor: scanActorSchema,
  directlyEntered: z.literal(true),
  at: z.iso.datetime(),
});
export const SCAN_GRADE_MARKS = {
  correct: "○",
  partial: "△",
  incorrect: "×",
  review: "확인 필요",
} as const;
export const scanGradeLabelSchema = z.enum([
  "correct",
  "partial",
  "incorrect",
  "review",
]);
export const scanGradeSchema = z.strictObject({
  id,
  label: scanGradeLabelSchema,
  reason: z
    .string()
    .trim()
    .min(1)
    .max(240)
    .refine((s) => !/[\r\n]/.test(s), "까닭은 한 줄입니다."),
  directlyEntered: z.boolean(),
});
export const scanTeacherOverrideSchema = z.strictObject({
  grade: scanGradeSchema,
  actor: scanActorSchema.extend({ kind: z.literal("teacher") }),
  at: z.iso.datetime(),
});
export const scanSubmissionStateSchema = z.enum([
  "capturing",
  "read",
  "checking",
  "graded",
  "teacher-corrected",
]);
export const scanSubmissionSchema = z
  .strictObject({
    id,
    printedSheetId: id,
    studentId: id,
    capturedBy: scanActorSchema,
    state: scanSubmissionStateSchema,
    readings: z.array(scanReadSchema),
    corrections: z.array(scanCorrectionSchema),
    grades: z.array(scanGradeSchema),
    teacherOverrides: z.array(scanTeacherOverrideSchema),
  })
  .superRefine((s, ctx) => {
    if (s.capturedBy.kind === "student" && s.capturedBy.id !== s.studentId)
      ctx.addIssue({
        code: "custom",
        message: "학생은 자기 답안만 제출합니다.",
      });
    if (
      s.corrections.some(
        (c) => c.actor.kind === "student" && c.actor.id !== s.studentId,
      )
    )
      ctx.addIssue({ code: "custom", message: "다른 학생의 직접 입력입니다." });
    if (s.state === "teacher-corrected" && !s.teacherOverrides.length)
      ctx.addIssue({ code: "custom", message: "교사 수정 이력이 필요합니다." });
  });

export type ScanSnapshot = z.infer<typeof scanSnapshotSchema>;
export type ScanPage = z.infer<typeof scanPageSchema>;
export type ScanTarget = z.infer<typeof scanTargetSchema>;
export type ScanRead = z.infer<typeof scanReadSchema>;
export type ScanCorrection = z.infer<typeof scanCorrectionSchema>;
export type ScanGrade = z.infer<typeof scanGradeSchema>;
export type ScanActor = z.infer<typeof scanActorSchema>;
export type ScanSubmissionState = z.infer<typeof scanSubmissionStateSchema>;

/** Authentication, branch scope and complete-page persistence belong to the future route/service. */
export function transitionScanSubmission(
  state: ScanSubmissionState,
  event: "read" | "confirm" | "grade" | "teacher-correct",
  actor: ScanActor,
): ScanSubmissionState {
  scanActorSchema.parse(actor);
  if (state === "capturing" && event === "read") return "read";
  if (state === "read" && event === "confirm") return "checking";
  if (state === "checking" && event === "grade") return "graded";
  if (
    (state === "graded" || state === "teacher-corrected") &&
    event === "teacher-correct" &&
    actor.kind === "teacher"
  )
    return "teacher-corrected";
  throw new RangeError("허용되지 않은 제출 상태 변경입니다.");
}
