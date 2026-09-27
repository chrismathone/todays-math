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
  /** Today's tile (while it is open) and the planned tiles after it (D-142). */
  upcoming: z.array(
    z.strictObject({
      title: z.string(),
      subtitle: z.string(),
      /** First tile of a new grade — «중3» · «초5». */
      gradeStart: z.string().max(10).optional(),
    }),
  ),
});
export type MathSrsJourney = z.infer<typeof mathSrsJourneySchema>;
