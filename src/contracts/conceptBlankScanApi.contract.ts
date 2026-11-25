import { z } from "zod";
import { CONCEPT_BLANK_FORMS } from "./conceptBlank.contract";
import {
  scanGradeLabelSchema,
  scanGradeSchema,
  scanReadSchema,
  scanSlotSchema,
  scanSubmissionStateSchema,
} from "./conceptBlankScan.contract";
import { scanRegistrationSchema } from "./conceptBlankScanPhoto.contract";
import { STUDIO_AI_IMAGE_BUDGET } from "@/lib/studio-ai/limits";

const id = z.string().min(1).max(240);
export const scanRevisionSchema = z.number().int().nonnegative();
export const scanStartInputSchema = z.strictObject({
  printedSheetId: z.uuid(),
  studentId: z.uuid().optional(),
  requestId: z.uuid(),
});
export const scanPhotoInputSchema = z.strictObject({
  revision: scanRevisionSchema,
  imageDataUrl: z.string().min(1).max(STUDIO_AI_IMAGE_BUDGET),
});
export const scanJobInputSchema = z.strictObject({
  revision: scanRevisionSchema,
  kind: z.enum(["read", "grade"]),
});
export const scanCorrectionInputSchema = z
  .strictObject({
    revision: scanRevisionSchema,
    readId: z.uuid(),
    slotId: id,
    resolution: z.enum(["text", "blank", "review"]),
    text: z.string().max(12_000),
  })
  .superRefine((value, ctx) => {
    if (value.resolution === "text" ? !value.text.trim() : value.text !== "")
      ctx.addIssue({
        code: "custom",
        message: "입력한 글과 확인 상태가 맞지 않습니다.",
      });
  });
export const scanOverrideInputSchema = z.strictObject({
  revision: scanRevisionSchema,
  targetId: id,
  label: scanGradeLabelSchema,
  reason: scanGradeSchema.shape.reason,
});

export const scanPublicSnapshotSchema = z.strictObject({
  version: z.literal(1),
  sheetCode: z.string().nullable(),
  pageCount: z.number().int().positive(),
  pages: z.array(
    z.strictObject({
      number: z.number().int().positive(),
      form: z.enum(CONCEPT_BLANK_FORMS),
      questions: z.array(
        z.strictObject({
          id,
          number: z.number().int().positive(),
          prompt: z.string(),
        }),
      ),
      slots: z.array(scanSlotSchema),
    }),
  ),
});
const correction = z.strictObject({
  id: z.uuid(),
  readId: z.uuid(),
  slotId: id,
  resolution: z.enum(["text", "blank", "review"]),
  text: z.string(),
  directlyEntered: z.literal(true),
  by: z.enum(["student", "teacher"]),
  sequence: z.number().int().positive(),
  at: z.iso.datetime(),
});
const grade = z.strictObject({
  id: z.uuid(),
  targetId: id,
  page: z.number().int().positive(),
  questionId: id,
  slotIds: z.array(id),
  unit: z.enum(["문항", "빈칸", "이름표", "설명 칸", "개념"]),
  label: scanGradeLabelSchema,
  reason: scanGradeSchema.shape.reason,
  directlyEntered: z.boolean(),
  origin: z.enum(["rule", "model", "teacher"]),
  sequence: z.number().int().positive(),
  at: z.iso.datetime(),
});
/** Explicit public fields; stored answer/rubric/layout artifacts and object keys never cross this boundary. */
export const scanSubmissionViewSchema = z.strictObject({
  id: z.uuid(),
  printedSheetId: z.uuid(),
  student: z.strictObject({
    id: z.uuid(),
    name: z.string(),
    className: z.string(),
  }),
  role: z.enum(["student", "teacher"]),
  state: scanSubmissionStateSchema,
  revision: scanRevisionSchema,
  job: z
    .strictObject({
      kind: z.enum(["read", "grade"]),
      startedAt: z.iso.datetime(),
    })
    .nullable(),
  lastError: z.string().nullable(),
  snapshot: scanPublicSnapshotSchema,
  photos: z.array(
    z.strictObject({
      id: z.uuid(),
      page: z.number().int().positive(),
      version: z.number().int().positive(),
      width: z.number().int().positive().max(10000),
      height: z.number().int().positive().max(10000),
      registration: scanRegistrationSchema,
      available: z.boolean(),
      expiresAt: z.iso.datetime(),
    }),
  ),
  readings: z.array(
    z.strictObject({
      id: z.uuid(),
      slotId: id,
      photoId: z.uuid(),
      status: scanReadSchema.shape.status,
      text: z.string(),
    }),
  ),
  corrections: z.array(correction),
  grades: z.array(grade),
});
export type ScanSubmissionView = z.infer<typeof scanSubmissionViewSchema>;
export type ScanStartInput = z.infer<typeof scanStartInputSchema>;
export type ScanPhotoInput = z.infer<typeof scanPhotoInputSchema>;
export type ScanCorrectionInput = z.infer<typeof scanCorrectionInputSchema>;
export type ScanOverrideInput = z.infer<typeof scanOverrideInputSchema>;
export type ScanJobInput = z.infer<typeof scanJobInputSchema>;

export const scanIssueViewSchema = z.strictObject({
  id: z.uuid(),
  title: z.string(),
  pageCount: z.number().int().positive(),
  role: z.enum(["student", "teacher"]),
  students: z.array(
    z.strictObject({ id: z.uuid(), name: z.string(), className: z.string() }),
  ),
  hasMoreStudents: z.boolean(),
  submissions: z.array(
    z.strictObject({
      id: z.uuid(),
      studentId: z.uuid(),
      studentName: z.string(),
      state: scanSubmissionStateSchema,
      createdAt: z.iso.datetime(),
    }),
  ),
});
export type ScanIssueView = z.infer<typeof scanIssueViewSchema>;
