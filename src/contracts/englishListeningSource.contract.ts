import { z } from "zod";

export const LISTENING_MAX_UPLOAD_BYTES = 64 * 1024 * 1024;
export const LISTENING_MAX_DURATION_MS = 30 * 60 * 1000;
export const LISTENING_MAX_PLAYBACK_BYTES = 336 * 1024 * 1024;
/** Enough for all six grades plus a mock exam, within the media adapter's integer bound. */
export const LISTENING_MAX_OWNER_BYTES = 2 ** 31 - 1;
/** Leave room for HTTP envelopes below the hosting provider's request limit. */
export const LISTENING_MAX_DOCUMENT_BYTES = 3 * 1024 * 1024;

export const listeningAssessmentSourceSchema = z.strictObject({
  kind: z.enum(["national_listening", "mock_exam", "other"]),
  provider: z.string().trim().min(1).max(200),
  year: z.number().int().min(1900).max(2200),
  round: z.number().int().min(1).max(10).nullable(),
  month: z.number().int().min(1).max(12).nullable(),
  originalFilename: z.string().max(200),
});
export type ListeningAssessmentSource = z.infer<
  typeof listeningAssessmentSourceSchema
>;

/** Browser-rendered question-sheet crops contain no transcript or answer-sheet data. */
export const listeningQuestionImageSchema = z.strictObject({
  dataUrl: z
    .string()
    .max(300_000)
    .regex(/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/),
  width: z.number().int().min(1).max(2400),
  height: z.number().int().min(1).max(2400),
});
