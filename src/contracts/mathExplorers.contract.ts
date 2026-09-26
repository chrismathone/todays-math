import { z } from "zod";
import { isoDateSchema, uuidSchema } from "./common.contract";

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
]);
export const explorerRequestSchema = z.strictObject({
  requestId: uuidSchema,
  expectedRevision: count,
  action: explorerActionSchema,
});
export type ExplorerAction = z.infer<typeof explorerActionSchema>;
export type ExplorerRequest = z.infer<typeof explorerRequestSchema>;

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
});
export const explorerStateSchema = explorerViewSchema.extend({
  student: z.strictObject({ id, name: z.string(), className: z.string() }),
  revision: count,
  feedback: explorerFeedbackSchema.nullable(),
});
export type ExplorerView = z.infer<typeof explorerViewSchema>;
export type ExplorerState = z.infer<typeof explorerStateSchema>;
export type ExplorerActivity = z.infer<typeof explorerActivitySchema>;
