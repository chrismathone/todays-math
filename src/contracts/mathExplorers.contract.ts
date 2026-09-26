import { z } from "zod";
import { isoDateSchema, uuidSchema } from "./common.contract";
import { mathExpeditionJourneySchema } from "./mathExpedition.contract";

const id = z.string().min(1).max(200);
const text = z.string().max(4000);
const count = z.number().int().nonnegative();
const grade = z.number().int().min(3).max(9);
const route = z.enum(["unit", "memory", "repair"]);
const task = z.strictObject({
  cardId: id,
  kind: z.union([z.literal(0), z.literal(1), z.literal(2)]),
});
const optionalDate = z.union([isoDateSchema, z.literal("")]);

const workshopRoute = z.enum(["explore", "check", "memory"]);
const workshopAttachment = z.strictObject({
  sessionId: id,
  questionId: id,
  cardId: z.literal("g5-common-denominator"),
});
const workshopStage = z.enum([
  "predict",
  "split",
  "match",
  "rule",
  "check",
  "complete",
]);
const fraction = z.strictObject({
  numerator: z.number().int().min(1).max(21),
  denominator: z.number().int().min(2).max(21),
});
const workshopCheck = z.strictObject({
  fractions: z.array(fraction).min(1).max(2),
  denominator: z.number().int().min(2).max(21),
});
export const workshopRecordSchema = z.strictObject({
  runs: count,
  blueprintAt: isoDateSchema.optional(),
  discoveredAt: isoDateSchema.optional(),
  rememberedAt: isoDateSchema.optional(),
  memoryAttemptDate: isoDateSchema.optional(),
  lastCheck: z
    .strictObject({
      date: isoDateSchema,
      score: z.number().int().min(0).max(2),
      route: workshopRoute,
    })
    .optional(),
  session: z
    .strictObject({
      id,
      route: workshopRoute,
      stage: workshopStage,
      attachedTo: workshopAttachment,
      prediction: z.number().int().min(0).max(2).optional(),
      factors: z.tuple([
        z.number().int().min(1).max(6),
        z.number().int().min(1).max(6),
      ]),
      checkIndex: z.number().int().min(0).max(2),
      questions: z.array(workshopCheck).length(2),
      answers: z
        .array(z.array(z.number().int().min(0).max(21)).min(1).max(2))
        .max(2),
      passed: z.array(z.boolean()).max(2),
      date: isoDateSchema,
      stars: z.number().int().min(0).max(1),
    })
    .optional(),
});
export type WorkshopRecord = z.infer<typeof workshopRecordSchema>;
export type WorkshopSession = NonNullable<WorkshopRecord["session"]>;

export const explorerCardProgressSchema = z.strictObject({
  level: z.number().int().min(0).max(3),
  due: isoDateSchema,
  lastDate: optionalDate,
  attemptedAt: isoDateSchema,
  missed: z.number().int().min(0).max(3),
  reviewStep: z.number().int().min(0).max(4).optional(),
  reviewedAt: optionalDate.optional(),
  lastRecall: z.enum(["new", "remembered", "supported", "retry"]).optional(),
});
const historyEntry = z.strictObject({
  route: route.optional(),
  targetCardId: id.optional(),
  date: isoDateSchema,
  unit: id,
  first: z.number().int().min(0).max(15),
  unresolved: z.number().int().min(0).max(15),
  stars: z.number().int().min(0).max(5),
});
export const explorerDefinitionSessionSchema = z.strictObject({
  route: route.optional(),
  targetCardId: id.optional(),
  cardIds: z.array(id).length(5).optional(),
  id,
  unit: id,
  date: isoDateSchema,
  queue: z.array(task).min(1).max(15),
  index: z.number().int().min(0).max(15),
  round: z.number().int().min(0).max(3),
  next: z.array(task).max(15),
  seen: z.array(id).max(5),
  hinted: z.array(id).max(5),
  passed: z.array(id).max(15),
  initialWrong: z.array(id).max(5),
  first: z.number().int().min(0).max(15),
  done: z.boolean(),
  stars: z.number().int().min(0).max(5),
  unresolved: z.array(task).max(15),
  eligible: z.array(id).max(5),
  reviewOnly: z.boolean().optional(),
});
export const explorerDefinitionsSchema = z.strictObject({
  courseGrade: grade.optional(),
  claimedChests: z.array(id).max(92).optional(),
  goalUnitId: id.optional(),
  runs: count,
  cards: z.record(id, explorerCardProgressSchema),
  session: explorerDefinitionSessionSchema.optional(),
  history: z.array(historyEntry).max(60),
});
export const explorerProfileSchema = z.strictObject({
  id,
  grade,
  stars: count,
  earned: count,
  level: z.number().int().min(0).max(3),
  definitions: explorerDefinitionsSchema.optional(),
  workshop: workshopRecordSchema.optional(),
});

export const explorerActionSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("start"),
    route: route.default("unit"),
    unitId: id.optional(),
    cardId: id.optional(),
    dayId: isoDateSchema.optional(),
  }),
  z.strictObject({ type: z.literal("read"), questionId: id }),
  z.strictObject({
    type: z.literal("answer"),
    questionId: id,
    choiceIds: z.array(z.number().int().min(0).max(3)).max(4),
  }),
  z.strictObject({ type: z.literal("course"), grade }),
  z.strictObject({ type: z.literal("goal"), unitId: id }),
  z.strictObject({ type: z.literal("chest"), chestId: id }),
  z.strictObject({ type: z.literal("solution"), cardId: id }),
  z.strictObject({ type: z.literal("upgrade") }),
  z.strictObject({
    type: z.literal("lab-predict"),
    questionId: id,
    choiceId: z.number().int().min(0).max(2),
  }),
  z.strictObject({
    type: z.literal("lab-split"),
    questionId: id,
    factor: z.number().int().min(1).max(4),
  }),
  z.strictObject({
    type: z.literal("lab-match"),
    questionId: id,
    factors: z.tuple([
      z.number().int().min(1).max(6),
      z.number().int().min(1).max(6),
    ]),
  }),
  z.strictObject({
    type: z.literal("lab-rule"),
    questionId: id,
    choiceId: z.number().int().min(0).max(2),
  }),
  z.strictObject({
    type: z.literal("lab-check"),
    questionId: id,
    parts: z.array(z.number().int().min(0).max(21)).min(1).max(2),
  }),
  z.strictObject({ type: z.literal("lab-solution") }),
]);
export const explorerRequestSchema = z.strictObject({
  requestId: uuidSchema,
  expectedRevision: count,
  action: explorerActionSchema,
});
export type ExplorerAction = z.infer<typeof explorerActionSchema>;
export type ExplorerRequest = z.infer<typeof explorerRequestSchema>;
export type WorkshopAction = Extract<ExplorerAction, { type: `lab-${string}` }>;

export const workshopSolutionSchema = z.strictObject({
  title: text,
  explanation: text,
  examples: z
    .array(
      workshopCheck.extend({
        numerators: z.array(z.number().int().min(1).max(21)).min(1).max(2),
      }),
    )
    .length(2),
});
export const workshopViewSchema = z.strictObject({
  memoryDate: isoDateSchema.nullable(),
  memoryDue: z.boolean(),
  blueprintAt: isoDateSchema.nullable(),
  discoveredAt: isoDateSchema.nullable(),
  rememberedAt: isoDateSchema.nullable(),
  session: z
    .strictObject({
      id,
      route: workshopRoute,
      stage: workshopStage,
      attachedTo: workshopAttachment,
      questionId: id,
      checkIndex: z.number().int().min(0).max(2),
      checkTotal: z.literal(2),
      done: z.boolean(),
      prompt: text,
      fractions: z.array(fraction).max(2),
      targetDenominator: z.number().int().min(2).max(21).nullable(),
      factors: z.tuple([
        z.number().int().min(1).max(6),
        z.number().int().min(1).max(6),
      ]),
      choices: z
        .array(
          z.strictObject({ id: z.number().int().min(0).max(2), label: text }),
        )
        .max(3),
      predictionLabel: text.nullable(),
      stars: z.number().int().min(0).max(1),
    })
    .nullable(),
});
export type WorkshopView = z.infer<typeof workshopViewSchema>;

export const explorerSolutionSchema = z.strictObject({
  cardId: id,
  name: text,
  definition: text,
  explanation: text,
  note: text,
  examples: z
    .array(z.strictObject({ label: text, correct: z.boolean() }))
    .max(4),
  statement: text,
  truth: z.boolean(),
});
export const explorerFeedbackSchema = z.strictObject({
  message: text,
  correct: z.boolean().optional(),
  advance: z.boolean().optional(),
  complete: z.boolean().optional(),
  stars: count.optional(),
  chestId: id.optional(),
  solution: explorerSolutionSchema.optional(),
  workshopSolution: workshopSolutionSchema.optional(),
});
export type ExplorerFeedback = z.infer<typeof explorerFeedbackSchema>;
const completedDay = z.strictObject({
  date: isoDateSchema,
  unitId: id,
  sessionId: id,
  cardIds: z.array(id).length(5).optional(),
  route: route.optional(),
  targetCardId: id.optional(),
});
export const storedExplorerSchema = z.strictObject({
  version: z.literal(1),
  profile: explorerProfileSchema,
  receipts: z
    .array(
      z.strictObject({
        requestId: uuidSchema,
        actionKey: z.string().max(2000),
        feedback: explorerFeedbackSchema,
      }),
    )
    .max(256),
  completedDays: z.array(completedDay).max(36600),
});
export type StoredExplorer = z.infer<typeof storedExplorerSchema>;

const cardMetadata = z.strictObject({
  id,
  unitId: id,
  name: text,
  prerequisiteIds: z.array(id).max(10),
  progress: explorerCardProgressSchema.nullable(),
});
const unitMetadata = z.strictObject({
  id,
  grade,
  title: text,
  symbol: text,
  subtitle: text,
  color: z.enum(["blue", "mint", "purple"]),
  cards: z.array(cardMetadata).length(5),
});
export const explorerActivitySchema = z.strictObject({
  questionId: id,
  cardId: id,
  cardName: text,
  unitId: id,
  unitTitle: text,
  kind: z.enum(["read", "assemble", "examples", "truth"]),
  prompt: text,
  pieces: z.array(text).length(3).optional(),
  choices: z
    .array(z.strictObject({ id: z.number().int().min(0).max(3), label: text }))
    .max(4),
  reading: z.strictObject({ definition: text, note: text }).optional(),
});
export const explorerViewSchema = z.strictObject({
  profile: z.strictObject({
    id,
    grade,
    courseGrade: grade,
    stars: count,
    earned: count,
    level: count,
    goalUnitId: id.nullable(),
  }),
  units: z.array(unitMetadata).length(46),
  currentActivity: explorerActivitySchema.nullable(),
  session: z
    .strictObject({
      id,
      route,
      title: text,
      unitId: id,
      cardIds: z.array(id).length(5),
      index: count,
      total: z.number().int().min(1).max(15),
      round: z.number().int().min(0).max(3),
      done: z.boolean(),
      reviewOnly: z.boolean(),
      first: count,
      stars: count,
      unresolved: z
        .array(
          z.strictObject({
            cardId: id,
            name: text,
            kind: z.number().int().min(0).max(2),
          }),
        )
        .max(15),
    })
    .nullable(),
  dueCardIds: z.array(id).max(230),
  weakCardIds: z.array(id).max(230),
  chests: z
    .array(
      z.strictObject({
        id,
        unit: id,
        after: z.union([z.literal(2), z.literal(4)]),
        solved: z.number().int().min(0).max(4),
        ready: z.boolean(),
        claimed: z.boolean(),
      }),
    )
    .length(92),
  completedDays: z.array(completedDay).max(36600),
  history: z.array(historyEntry).max(60),
  workshop: workshopViewSchema.optional(),
});
export const explorerStateSchema = explorerViewSchema.extend({
  student: z.strictObject({ id, name: z.string(), className: z.string() }),
  revision: count,
  feedback: explorerFeedbackSchema.nullable(),
  today: isoDateSchema.optional(),
  journey: mathExpeditionJourneySchema.optional(),
});
export type ExplorerView = z.infer<typeof explorerViewSchema>;
export type ExplorerState = z.infer<typeof explorerStateSchema>;
export type ExplorerActivity = z.infer<typeof explorerActivitySchema>;
