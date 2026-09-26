import { z } from "zod";
import {
  mathSrsJourneyDaySchema,
  mathSrsJourneySchema,
} from "./mathSrsJourney.contract";

export const mathExpeditionKindSchema = z.enum([
  "elementary",
  "middle",
  "explorers",
]);
export type MathExpeditionKind = z.infer<typeof mathExpeditionKindSchema>;
export const mathExpeditionReviewSchema = z.strictObject({
  kind: mathExpeditionKindSchema,
  dayId: z.string().min(1).max(100),
  title: z.string(),
  subtitle: z.string(),
  reviewCount: z.number().int().positive(),
});
export type MathExpeditionReview = z.infer<typeof mathExpeditionReviewSchema>;
export const mathExpeditionDaySchema = mathSrsJourneyDaySchema.extend({
  kind: mathExpeditionKindSchema,
  dayId: z.string().min(1).max(100),
  reviews: z.array(mathExpeditionReviewSchema).min(1).max(3),
});
export type MathExpeditionDay = z.infer<typeof mathExpeditionDaySchema>;
export const mathExpeditionJourneySchema = mathSrsJourneySchema.extend({
  activeKind: mathExpeditionKindSchema,
  days: z.array(mathExpeditionDaySchema),
});
export type MathExpeditionJourney = z.infer<typeof mathExpeditionJourneySchema>;
