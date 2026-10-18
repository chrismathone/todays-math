import { z } from "zod";
import { uuidSchema } from "./common.contract";

/** A question is the task; problemId always names an actual stored representation. */
export const QUESTION_FORMATS = [
  "multiple_choice",
  "short_answer",
  "descriptive",
] as const;
export const QUESTION_FORMAT_LABELS = {
  multiple_choice: "객관식",
  short_answer: "단답형",
  descriptive: "서술형",
} as const;
export const questionFormatSchema = z.enum(QUESTION_FORMATS);
export type QuestionFormat = z.infer<typeof questionFormatSchema>;
export type QuestionFormatIntent = Partial<
  Record<(typeof QUESTION_FORMAT_LABELS)[QuestionFormat], number>
>;
export const questionFormatIntentSchema = z.partialRecord(
  z.enum(["객관식", "단답형", "서술형"]),
  z.number().int().min(0).max(100),
);
export const questionIdSchema = z
  .string()
  .regex(/^(?:q:v1:[a-f0-9]{64}|row:[0-9a-f-]{36})$/);
export const questionRepresentationSchema = z.strictObject({
  problemId: uuidSchema,
  format: questionFormatSchema.nullable(),
  revision: z.string().min(1),
  state: z.enum(["available", "blocked", "unverified"]),
  reasonCode: z.string().min(1).nullable(),
});
export type QuestionRepresentation = z.infer<
  typeof questionRepresentationSchema
>;
export const questionSelectionSchema = z.strictObject({
  questionId: questionIdSchema,
  problemId: uuidSchema,
  format: questionFormatSchema,
  revision: z.string().min(1),
});
export type QuestionSelection = z.infer<typeof questionSelectionSchema>;
export const questionReadMetadataSchema = z.strictObject({
  version: z.literal(2),
  countUnit: z.literal("question"),
  queryKey: z.string().min(1),
});
export type QuestionReadMetadata = z.infer<typeof questionReadMetadataSchema>;
export const questionSelectionStatusSchema = z.enum([
  "complete",
  "insufficient",
  "search_limit",
]);
export type QuestionSelectionStatus = z.infer<
  typeof questionSelectionStatusSchema
>;
