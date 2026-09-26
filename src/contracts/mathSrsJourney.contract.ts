import { z } from "zod";

export const mathSrsJourneyDaySchema = z.strictObject({
  id: z.string().min(1).max(100),
  date: z.iso.date(),
  completedAt: z.iso.datetime(),
  title: z.string(),
  subtitle: z.string(),
  reviewCount: z.number().int().nonnegative(),
});
export type MathSrsJourneyDay = z.infer<typeof mathSrsJourneyDaySchema>;
export const mathSrsJourneySchema = z.strictObject({
  completedDays: z.number().int().nonnegative(),
  todayComplete: z.boolean(),
  todayAnswered: z.number().int().nonnegative(),
  todayGoal: z.number().int().positive(),
  days: z.array(mathSrsJourneyDaySchema),
  upcoming: z.array(
    z.strictObject({ title: z.string(), subtitle: z.string() }),
  ),
});
export type MathSrsJourney = z.infer<typeof mathSrsJourneySchema>;
