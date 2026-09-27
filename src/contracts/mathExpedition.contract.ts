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
/** The board centre «나의 진행» (D-142): the n-th unit of the grade (elementary: lesson of the chapter). */
export const mathExpeditionPositionSchema = z.strictObject({
  caption: z.string(),
  ordinal: z.number().int().positive(),
  title: z.string(),
  note: z.string().optional(),
  collected: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  due: z.number().int().nonnegative(),
});
export const mathExpeditionJourneySchema = mathSrsJourneySchema.extend({
  activeKind: mathExpeditionKindSchema,
  days: z.array(mathExpeditionDaySchema),
  position: mathExpeditionPositionSchema.optional(),
});
export type MathExpeditionJourney = z.infer<typeof mathExpeditionJourneySchema>;

export const expeditionRouteSchema = z.enum([
  "bank",
  "unit",
  "memory",
  "repair",
]);
export const expeditionPlanSchema = z.strictObject({
  kind: mathExpeditionKindSchema,
  route: expeditionRouteSchema,
  unitId: z.string().min(1),
  title: z.string(),
  subtitle: z.string(),
  goal: z.number().int().min(1).max(500),
});
export const expeditionMissionSchema = expeditionPlanSchema.extend({
  id: z.uuid(),
  date: z.iso.date(),
  answered: z.number().int().nonnegative(),
  retryRemaining: z.number().int().nonnegative(),
  status: z.enum(["active", "retry", "complete"]),
  sourceSessionId: z.string().nullable(),
  sourceSessionIds: z.array(z.string()),
  startedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
});
/**
 * D-144 한 칸 보장: 칸을 얻을 때 그 미션이 준 카드 레벨 별(`cards`)과 3까지 채운 별(`bonus`).
 * 칸 기록에 함께 남아 같은 칸을 다시 계산하지 않는다 — 이 칸이 없는 옛 기록(D-144 전)은 보장이 없던 날이다.
 */
export const expeditionTileStarsSchema = z.strictObject({
  cards: z.number().int().nonnegative(),
  bonus: z.number().int().min(0).max(3),
});
export type ExpeditionTileStars = z.infer<typeof expeditionTileStarsSchema>;
export const mathExpeditionSchema = z.strictObject({
  mission: expeditionMissionSchema.nullable(),
  next: expeditionPlanSchema.nullable(),
  completedToday: z.boolean(),
  canStart: z.boolean(),
  /** 오늘(한국 날짜) 얻은 칸의 별 — 오늘 칸이 없거나 D-144 전 칸이면 없음 */
  todayStars: expeditionTileStarsSchema.optional(),
});
export type ExpeditionPlan = z.infer<typeof expeditionPlanSchema>;
export type ExpeditionMission = z.infer<typeof expeditionMissionSchema>;
export type MathExpedition = z.infer<typeof mathExpeditionSchema>;

const sourceReferenceSchema = z.strictObject({
  id: z.string().min(1),
  unitIds: z.array(z.string()),
  problemIds: z.array(z.uuid()),
});
export const storedExpeditionMissionSchema = expeditionMissionSchema.extend({
  awardEligible: z.boolean(),
  references: z.array(sourceReferenceSchema),
});
export const storedExpeditionSchema = z
  .strictObject({
    version: z.literal(1),
    initializedAt: z.iso.datetime(),
    mission: storedExpeditionMissionSchema.nullable(),
    legacyDays: z.array(mathExpeditionDaySchema),
    awards: z.array(
      z.strictObject({
        day: mathExpeditionDaySchema,
        missionId: z.uuid(),
        references: z.array(sourceReferenceSchema),
        stars: expeditionTileStarsSchema.optional(),
      }),
    ),
    receipts: z
      .array(
        z.strictObject({
          requestId: z.uuid(),
          actionKey: z.string(),
          missionId: z.uuid().nullable(),
        }),
      )
      .max(128),
  })
  .superRefine((value, ctx) => {
    const dates = [
      ...value.legacyDays.map((d) => d.date),
      ...value.awards.map((a) => a.day.date),
    ];
    if (new Set(dates).size !== dates.length)
      ctx.addIssue({
        code: "custom",
        message: "하루에는 한 칸만 전진할 수 있습니다.",
      });
  });
export type StoredExpedition = z.infer<typeof storedExpeditionSchema>;
export type StoredExpeditionMission = z.infer<
  typeof storedExpeditionMissionSchema
>;
