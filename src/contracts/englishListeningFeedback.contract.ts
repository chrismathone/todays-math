/** Shared feedback DTOs. Media identity and reporter identity are server-owned. */
import { z } from "zod";

export const LISTENING_FEEDBACK_REASONS = [
  "wrong_start", "wrong_audio", "not_playing", "poor_quality", "cut_off", "other",
] as const;
export const LISTENING_FEEDBACK_REASON_LABELS: Record<ListeningFeedbackReason, string> = {
  wrong_start: "시작 위치가 맞지 않음",
  wrong_audio: "문항과 다른 음원",
  not_playing: "음원이 안 나옴",
  poor_quality: "잡음·소리 문제",
  cut_off: "앞뒤가 잘림",
  other: "기타",
};
export const listeningFeedbackReasonSchema = z.enum(LISTENING_FEEDBACK_REASONS);
export type ListeningFeedbackReason = z.infer<typeof listeningFeedbackReasonSchema>;
const revision = z.number().int().positive().max(2147483646);
const position = z.number().int().nonnegative().max(2147483647).nullable();
export const listeningFeedbackContextSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("set"), id: z.uuid(), revision }),
  // publicationId identifies immutable content; attempt.revision is answer CAS only.
  z.strictObject({ kind: z.literal("assignment"), id: z.uuid(), publicationId: z.uuid() }),
]);
export type ListeningFeedbackContext = z.infer<typeof listeningFeedbackContextSchema>;
const voteFields = {
  questionId: z.uuid(),
  rating: z.enum(["like", "dislike"]),
  reasons: z.array(listeningFeedbackReasonSchema).max(6).refine(
    (values) => new Set(values).size === values.length, "사유를 중복 선택할 수 없습니다.",
  ),
  comment: z.string().trim().max(1000),
  playbackMs: position,
  suggestedStartMs: position,
};
export const listeningFeedbackInputSchema = z.strictObject({
  requestId: z.uuid(),
  context: listeningFeedbackContextSchema,
  groupId: z.uuid(),
  ...voteFields,
}).superRefine((data, ctx) => {
  if (data.rating === "dislike" && !data.reasons.length)
    ctx.addIssue({ code: "custom", path: ["reasons"], message: "불편한 점을 선택해 주세요." });
  if (data.reasons.includes("other") && !data.comment)
    ctx.addIssue({ code: "custom", path: ["comment"], message: "기타 내용을 입력해 주세요." });
  if (data.rating === "like" && (data.reasons.length || data.comment || data.suggestedStartMs !== null))
    ctx.addIssue({ code: "custom", path: ["rating"], message: "좋아요에는 사유나 수정 제안을 포함할 수 없습니다." });
});
export type ListeningFeedbackInput = z.infer<typeof listeningFeedbackInputSchema>;
export const listeningFeedbackItemSchema = z.strictObject({ ...voteFields, updatedAt: z.iso.datetime() });
export type ListeningFeedbackItem = z.infer<typeof listeningFeedbackItemSchema>;
export const listeningFeedbackResponseSchema = z.strictObject({ feedback: listeningFeedbackItemSchema });
export const listeningFeedbackListSchema = z.strictObject({ items: z.array(listeningFeedbackItemSchema) });
export const listeningFeedbackQuerySchema = z.discriminatedUnion("contextKind", [
  z.strictObject({ contextKind: z.literal("set"), contextId: z.uuid(), revision: z.coerce.number().int().positive().max(2147483646) }),
  z.strictObject({ contextKind: z.literal("assignment"), contextId: z.uuid(), publicationId: z.uuid() }),
]);
export const listeningFeedbackReportsQuerySchema = z.strictObject({
  rating: voteFields.rating.optional(),
  reason: listeningFeedbackReasonSchema.optional(),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export const listeningFeedbackReportSchema = z.strictObject({
  id: z.uuid(), contextKind: z.enum(["set", "assignment"]), contextId: z.uuid(), revision,
  setId: z.uuid(), questionId: z.uuid(), groupId: z.uuid(),
  questionNumber: z.number().int().positive().nullable(), setTitle: z.string(),
  rating: voteFields.rating, reasons: voteFields.reasons, comment: voteFields.comment,
  playbackMs: position, suggestedStartMs: position, originalStartMs: position,
  audioAssetId: z.uuid(), durationMs: z.number().int().positive(),
  reporterKind: z.enum(["teacher", "student"]), createdAt: z.iso.datetime(),
});
export type ListeningFeedbackReport = z.infer<typeof listeningFeedbackReportSchema>;
export const listeningFeedbackReportsSchema = z.strictObject({
  items: z.array(listeningFeedbackReportSchema), page: z.number().int().positive(), hasNext: z.boolean(),
  // total counts filtered append-only events; counts count current votes before rating/reason filtering.
  total: z.number().int().nonnegative(),
  counts: z.strictObject({ like: z.number().int().nonnegative(), dislike: z.number().int().nonnegative() }),
});
export type ListeningFeedbackReports = z.infer<typeof listeningFeedbackReportsSchema>;
export type ListeningFeedbackReportsResponse = ListeningFeedbackReports;
