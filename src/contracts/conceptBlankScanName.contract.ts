import { z } from "zod";
import { scanReadSchema } from "./conceptBlankScan.contract";
import { STUDIO_AI_IMAGE_BUDGET } from "@/lib/studio-ai/limits";
export const scanWrittenNameSchema = z
  .strictObject({
    text: z.string().max(120),
    status: scanReadSchema.shape.status,
  })
  .superRefine((v, ctx) => {
    if (
      (v.status === "read" && !v.text.trim()) ||
      (["blank", "unreadable"].includes(v.status) && v.text !== "")
    )
      ctx.addIssue({
        code: "custom",
        message: "이름과 판독 상태가 맞지 않습니다.",
      });
  });
export type ScanWrittenName = z.infer<typeof scanWrittenNameSchema>;
export const scanNameResultSchema = z.enum([
  "matched",
  "ambiguous",
  "none",
  "mismatch",
]);
export const scanNameMethodSchema = z.enum([
  "name-exact",
  "teacher-picked",
  "teacher-selected",
  "student-account",
]);
export const scanWrittenNameViewSchema = z.object({
  text: z.string(),
  status: scanReadSchema.shape.status,
  result: scanNameResultSchema,
  method: scanNameMethodSchema,
});
export const scanAssignStudentSchema = z.strictObject({
  studentId: z.uuid(),
  revision: z.number().int().nonnegative(),
});
export const scanNameCaptureInputSchema = z.strictObject({
  printedSheetId: z.uuid(),
  requestId: z.uuid(),
  imageDataUrl: z.string().min(1).max(STUDIO_AI_IMAGE_BUDGET),
});
export const scanNameCaptureActionSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("choose"), studentId: z.uuid() }),
  z.strictObject({ action: z.literal("retry") }),
]);
export const scanNameCaptureViewSchema = z.strictObject({
  id: z.uuid(),
  printedSheetId: z.uuid(),
  submissionId: z.uuid().nullable(),
  job: z.enum(["reading", "waiting"]).nullable(),
  lastError: z.string().nullable(),
  writtenName: scanWrittenNameSchema.nullable(),
  result: scanNameResultSchema.nullable(),
  students: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      className: z.string(),
      candidate: z.boolean(),
    }),
  ),
  hasMoreStudents: z.boolean(),
});
export type ScanNameCaptureView = z.infer<typeof scanNameCaptureViewSchema>;
