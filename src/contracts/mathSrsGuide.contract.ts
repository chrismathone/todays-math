import { z } from "zod";

/**
 * Owner 2026-10-20 (plan §2 decision 10): each student picks a guide first, from
 * all five candidates, and may change it any time. The choice lives in the
 * student record as `guide` — reader first: the commit that reads it ships and
 * goes Ready before anything writes it, because the record rejects unknown keys.
 */
export const GUIDE_IDS = [
  "peer-recorder",
  "marten",
  "paper-swallow",
  "bookmark-spirit",
  "wood-friend",
] as const;
export const guideIdSchema = z.enum(GUIDE_IDS);
export type GuideId = z.infer<typeof guideIdSchema>;

/** No `guide` in the record means the student has not chosen yet. */
export const storedGuideSchema = z.strictObject({
  id: guideIdSchema,
  chosenAt: z.iso.datetime(),
});
export type StoredGuide = z.infer<typeof storedGuideSchema>;
