import { z } from "zod";

export const LISTENING_SOURCE_TRANSCRIPT_LABEL = "AI 음성 전사 · 미검수";
export const listeningSourceTranscriptProfileSchema = z.enum([
  "english",
  "bilingual",
]);
const ms = z.number().int().min(0).max(2147483647);
export const listeningSourceTranscriptTimingQualitySchema = z
  .strictObject({
    outOfBoundsWordCount: ms,
    nonPositiveWordCount: ms,
    durationDeltaMs: z.number().int(),
    durationMatched: z.boolean(),
  })
  .refine(
    (quality) =>
      quality.durationMatched === Math.abs(quality.durationDeltaMs) <= 1500,
  );
/** Provider timings are estimates, never question alignment or human review evidence. */
export const listeningSourceTranscriptSegmentSchema = z
  .strictObject({ startMs: ms, endMs: ms, text: z.string().min(1) })
  .refine((segment) => segment.startMs < segment.endMs);
export const listeningSourceTranscriptSchema = z
  .strictObject({
    id: z.uuid(),
    assetId: z.uuid(),
    profile: listeningSourceTranscriptProfileSchema,
    origin: z.literal("ai_transcription"),
    reviewStatus: z.literal("ai_unreviewed"),
    text: z.string(),
    durationMs: ms.min(1),
    generatedAt: z.iso.datetime(),
    excludedWordCount: ms,
    timingReviewNeeded: z.boolean(),
    segments: z.array(listeningSourceTranscriptSegmentSchema),
  })
  .refine((item) =>
    item.segments.every((segment) => segment.endMs <= item.durationMs),
  );
export const listeningSourceTranscriptsResponseSchema = z.strictObject({
  setId: z.uuid(),
  items: z.array(listeningSourceTranscriptSchema),
});
export type ListeningSourceTranscriptSegment = z.infer<
  typeof listeningSourceTranscriptSegmentSchema
>;
export type ListeningSourceTranscript = z.infer<
  typeof listeningSourceTranscriptSchema
>;
export type ListeningSourceTranscriptsResponse = z.infer<
  typeof listeningSourceTranscriptsResponseSchema
>;
