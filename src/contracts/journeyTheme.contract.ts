import { z } from "zod";
import { JOURNEY_THEME_IDS } from "@/lib/math-explorers/journeyThemes";

/** 진도판 테마(학원 전체 한 벌) — 관리자 «학습 관리» 화면이 읽고 바꾼다. */
export const journeyThemeIdSchema = z.enum(JOURNEY_THEME_IDS);

export const journeyThemeUpdateSchema = z.strictObject({
  theme: journeyThemeIdSchema,
});

export const journeyThemeResponseSchema = z.strictObject({
  data: z.strictObject({
    theme: journeyThemeIdSchema,
    /** 관리자가 아직 안 골랐으면 null(기본 판). */
    updatedAt: z.string().nullable(),
  }),
});

export type JourneyThemeUpdate = z.infer<typeof journeyThemeUpdateSchema>;
export type JourneyThemeResponse = z.infer<typeof journeyThemeResponseSchema>;
