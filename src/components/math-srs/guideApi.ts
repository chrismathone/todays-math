import type { GuideId } from "@/contracts/mathSrsGuide.contract";
import { learnJsonRequest } from "./courseApi";

const contract = () => import("@/contracts/mathSrsGuide.contract");
const guide = async (value: unknown) =>
  (await contract()).guideResponseSchema.parse(value).data.guide;
const url = "/api/learn/math-srs/guide";

/** `null` — the student has not chosen yet (plan §2 decision 10). */
export const getGuide = () => learnJsonRequest(url, guide);
/** A failed save must never block study; the screen keeps the choice for the visit. */
export const saveGuide = (guideId: GuideId) =>
  learnJsonRequest(url, guide, { guideId });
