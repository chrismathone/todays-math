import { z } from "zod";
import { CONCEPT_IDS } from "@/lib/math-srs/types";
import {
  dataResponseSchema,
  difficultySchema,
  isoDateSchema,
  isoDateTimeSchema,
  uuidSchema,
} from "./common.contract";

const conceptIdSchema = z.enum(CONCEPT_IDS);
const ratingSchema = z.enum(["again", "hard", "good", "easy"]);
const kindSchema = z.enum([
  "warmup",
  "quick",
  "memory",
  "training",
  "revenge",
  "boss",
]);

export const mathSrsMemorySchema = z.strictObject({
  conceptId: conceptIdSchema,
  mastery: z.number().min(0).max(100),
  stabilityDays: z.number().positive().max(36_500),
  lastReviewedAt: isoDateTimeSchema.nullable(),
  nextReviewAt: isoDateTimeSchema.nullable(),
  attempts: z.number().int().nonnegative(),
  successes: z.number().int().nonnegative(),
});

export const mathSrsAttemptSchema = z.strictObject({
  problemId: z.string().min(1).max(200),
  conceptId: conceptIdSchema,
  templateId: z.string().min(1).max(200),
  kind: kindSchema,
  submittedAnswer: z.string().max(200),
  correct: z.boolean(),
  rating: ratingSchema,
  usedHint: z.boolean(),
  elapsedSeconds: z.number().min(0).max(86_400),
  answeredAt: isoDateTimeSchema,
});

/** A display-only source. Seeds, answer keys and full engine records never cross this boundary. */
export const mathSrsSourceSchema = z.strictObject({
  engine: z.literal("middle"),
  typeKey: z.string().max(200),
  title: z.string().max(200),
  tier: difficultySchema,
  requestedDifficulty: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
});

export const mathSrsProblemSchema = z.strictObject({
  id: z.string().min(1).max(200),
  templateId: z.string().min(1).max(200),
  conceptId: conceptIdSchema,
  conceptWeights: z.array(
    z.strictObject({
      conceptId: conceptIdSchema,
      weight: z.number().min(0).max(1),
    }),
  ),
  difficulty: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  kind: kindSchema,
  prompt: z.string().max(8_000),
  equation: z.string().max(4_000),
  answerUnit: z.string().max(100).optional(),
  expectedSeconds: z.number().positive().max(3_600),
  source: mathSrsSourceSchema.optional(),
  hint: z.string().max(8_000).nullable(),
  feedback: z
    .strictObject({
      answer: z.number().finite(),
      answerText: z.string().max(4_000).optional(),
      solution: z.array(z.string().max(8_000)).max(30),
    })
    .nullable(),
});
export type MathSrsPublicProblem = z.infer<typeof mathSrsProblemSchema>;

export const mathSrsMissionSchema = z.strictObject({
  id: z.string().min(1).max(200),
  date: isoDateSchema,
  startedAt: isoDateTimeSchema,
  completedAt: isoDateTimeSchema.nullable(),
  problems: z.array(mathSrsProblemSchema).length(12),
  attempts: z.array(mathSrsAttemptSchema).max(12),
});
export type MathSrsPublicMission = z.infer<typeof mathSrsMissionSchema>;

export const mathSrsMissionSummarySchema = z.strictObject({
  id: z.string(),
  date: isoDateSchema,
  startedAt: isoDateTimeSchema,
  completedAt: isoDateTimeSchema.nullable(),
  answered: z.number().int().min(0).max(12),
  total: z.literal(12),
  correct: z.number().int().min(0).max(12),
});
export type MathSrsMissionSummary = z.infer<typeof mathSrsMissionSummarySchema>;

export const mathSrsProgressSchema = z.strictObject({
  unitId: uuidSchema,
  section: z.string(),
  recordedAt: isoDateSchema,
  source: z.enum(["class", "individual"]),
});
export type MathSrsProgress = z.infer<typeof mathSrsProgressSchema>;

export const mathSrsStateSchema = z.strictObject({
  student: z.strictObject({
    id: uuidSchema,
    name: z.string(),
    classId: uuidSchema,
    className: z.string(),
  }),
  revision: z.number().int().nonnegative(),
  memories: z.array(mathSrsMemorySchema).length(CONCEPT_IDS.length),
  mission: mathSrsMissionSchema.nullable(),
  recentMissions: z.array(mathSrsMissionSummarySchema),
  currentProgress: mathSrsProgressSchema.nullable(),
  lectures: z.array(
    z.strictObject({
      id: uuidSchema,
      title: z.string(),
      unitId: uuidSchema,
      section: z.string(),
      href: z.string(),
    }),
  ),
  available: z.literal(true),
});
export type MathSrsState = z.infer<typeof mathSrsStateSchema>;
export const mathSrsStateResponseSchema =
  dataResponseSchema(mathSrsStateSchema);

export const mathSrsStartSchema = z.strictObject({});
export const mathSrsHintInputSchema = z.strictObject({
  missionId: uuidSchema,
  problemId: uuidSchema,
});
export type MathSrsHintInput = z.infer<typeof mathSrsHintInputSchema>;
export const mathSrsAttemptInputSchema = mathSrsHintInputSchema.extend({
  submittedAnswer: z.string().trim().max(200),
  elapsedSeconds: z.number().finite().min(0).max(86_400),
  rating: ratingSchema,
});
export type MathSrsAttemptInput = z.infer<typeof mathSrsAttemptInputSchema>;

export const mathSrsClassDashboardSchema = z.strictObject({
  class: z.strictObject({ id: uuidSchema, name: z.string() }),
  students: z.array(
    z.strictObject({
      id: uuidSchema,
      name: z.string(),
      hasAccount: z.boolean(),
      memories: z.array(mathSrsMemorySchema).length(CONCEPT_IDS.length),
      today: mathSrsMissionSummarySchema.nullable(),
      lastPracticedAt: isoDateTimeSchema.nullable(),
      currentProgress: mathSrsProgressSchema.nullable(),
    }),
  ),
  available: z.literal(true),
});
export type MathSrsClassDashboard = z.infer<typeof mathSrsClassDashboardSchema>;
export const mathSrsClassResponseSchema = dataResponseSchema(
  mathSrsClassDashboardSchema,
);
