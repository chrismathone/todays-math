import { z } from "zod";
import { mathSrsJourneySchema } from "./mathSrsJourney.contract";
import { dataResponseSchema, uuidSchema } from "./common.contract";

export const mathSrsReplayKindSchema = z.enum(["elementary", "middle"]);
export type MathSrsReplayKind = z.infer<typeof mathSrsReplayKindSchema>;
export const mathSrsReplayQuerySchema = z.strictObject({
  kind: mathSrsReplayKindSchema,
  step: z.coerce.number().int().min(1).max(500),
  dayId: z.string().min(1).max(100).optional(),
  figure: z.literal("true").optional(),
});
export const mathSrsReplaySubmitInputSchema = z.strictObject({
  kind: mathSrsReplayKindSchema,
  step: z.number().int().min(1).max(500),
  problemId: uuidSchema,
  missionId: uuidSchema.optional(),
  dayId: z.string().min(1).max(100).optional(),
  recordRetry: z.boolean().optional(),
  submittedAnswer: z.string().trim().min(1).max(2000),
  revealSolution: z.boolean().optional(),
});
export type MathSrsReplaySubmitInput = z.infer<
  typeof mathSrsReplaySubmitInputSchema
>;
export const mathSrsReplaySchema = z.strictObject({
  journey: mathSrsJourneySchema.optional(),
  regenerated: z.boolean().optional(),
  kind: mathSrsReplayKindSchema,
  step: z.number().int().positive(),
  problemId: uuidSchema,
  title: z.string(),
  subtitle: z.string(),
  content: z.string(),
  figureUrl: z.string().nullable(),
  answerChoices: z.array(z.string()).length(4),
  interactive: z
    .strictObject({
      kind: z.literal("fraction-parts"),
      denominator: z.number().int().min(2).max(12),
      shape: z.literal("bar"),
    })
    .nullable(),
  correct: z.boolean().nullable(),
  canRevealSolution: z.boolean(),
  solution: z
    .strictObject({ answer: z.string(), solution: z.string() })
    .nullable(),
});
export type MathSrsReplay = z.infer<typeof mathSrsReplaySchema>;
export const mathSrsReplayResponseSchema =
  dataResponseSchema(mathSrsReplaySchema);
