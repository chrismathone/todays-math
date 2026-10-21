import type { GuideId } from "@/contracts/mathSrsGuide.contract";

/** Home art, two problem-screen faces (after the pilot), the day's end and its reward. */
export const GUIDE_POSES = [
  "guide",
  "correct",
  "again",
  "done",
  "reward",
] as const;
export type GuidePose = (typeof GUIDE_POSES)[number];

/**
 * Public pictures next to the journey boards (`/images/journey/`). The student gate opens
 * `/images/guides/**`; build every path here so its test asks about the real ones.
 */
export const guideAssetPath = (id: GuideId, pose: GuidePose) =>
  `/images/guides/${id}/${pose}.webp`;
