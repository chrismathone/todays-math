import { z } from "zod";
import { CONCEPT_KINDS } from "@/lib/math-explorers/conceptKinds";
import { isoDateSchema, uuidSchema } from "./common.contract";
import {
  mathExpeditionJourneySchema,
  mathExpeditionSchema,
} from "./mathExpedition.contract";

/** Screens that show «한 번 더 → 풀이» on concept cards send `x-explorer-follow-up: 1`. */
export const EXPLORER_FOLLOW_UP_HEADER = "x-explorer-follow-up";
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
  sessionId: id.optional(),
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
  continuation: count.optional(),
  continuationCardIds: z.array(id).min(1).max(5).optional(),
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
  /**
   * «한 번 더 → 풀이»(plan §3.2 ②): the current question waits for a second try
   * (`again`) or shows its solution (`solution`); `firstChoiceIds` are the public
   * choice positions the student picked first. Read before anything writes it.
   */
  followUp: z
    .strictObject({
      questionId: id,
      state: z.enum(["again", "solution"]),
      firstChoiceIds: z.array(z.number().int().min(0).max(3)).max(4),
    })
    .optional(),
  /** Activities (`cardId:kind`) whose solution was shown — not asked again today. */
  shown: z.array(id).max(15).optional(),
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
/**
 * 보충 카드(D-147) 저장 칸 — 본 카드 기록(`definitions`)과 따로. 배포 1단계는 **읽기만**(서버는 아직 쓰지 않는다):
 * 2단계 코드가 쓴 뒤 되돌려도 이 계약이 읽어 학습 API · 강사 현황이 막히지 않게(star-economy D-144 와 같은 두 단계).
 * 한 장 = 뜻 만나기 → 세 활동(0 문장 조립 · 1 예 모으기 · 2 경계 살피기). 멈춘 진행은 카드마다 `sessions`, 지금 푸는
 * 한 장이 `active`, 단원 끝 줄로 시작한 장이 `offered`(그날 그 줄이 가리키는 장). 모으면 `collectedAt` · 못 모으면 `missedAt`.
 */
const supplementKind = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export const explorerSupplementSessionSchema = z.strictObject({
  id,
  cardId: id,
  date: isoDateSchema,
  queue: z.array(supplementKind).min(1).max(3),
  index: z.number().int().min(0).max(3),
  round: z.number().int().min(0).max(3),
  next: z.array(supplementKind).max(3),
  seen: z.boolean(),
  passed: z.array(supplementKind).max(3),
});
export const explorerSupplementsSchema = z.strictObject({
  runs: count,
  active: id.optional(),
  offered: z.strictObject({ date: isoDateSchema, cardId: id }).optional(),
  cards: z.record(
    id,
    z.strictObject({
      collectedAt: isoDateSchema.optional(),
      missedAt: isoDateSchema.optional(),
    }),
  ),
  sessions: z.record(id, explorerSupplementSessionSchema),
});
export type ExplorerSupplements = z.infer<typeof explorerSupplementsSchema>;
export type ExplorerSupplementSession = z.infer<
  typeof explorerSupplementSessionSchema
>;
export const explorerProfileSchema = z.strictObject({
  id,
  grade,
  stars: count,
  earned: count,
  // D-144: 기지는 3단계 뒤로도 끝없이 자란다(`starEconomy.ts`).
  level: count,
  definitions: explorerDefinitionsSchema.optional(),
  workshop: workshopRecordSchema.optional(),
  supplements: explorerSupplementsSchema.optional(),
});

export const explorerActionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("expedition-start") }),
  z.strictObject({
    type: z.literal("start"),
    route: route.default("unit"),
    unitId: id.optional(),
    cardId: id.optional(),
    dayId: isoDateSchema.optional(),
  }),
  z.strictObject({ type: z.literal("read"), questionId: id }),
  /** «알겠어요» on an open solution (plan §3.2 ②). */
  z.strictObject({ type: z.literal("understood"), questionId: id }),
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
  z.strictObject({ type: z.literal("retry-unresolved") }),
  // 보충 카드 한 장(D-147) — 시작 · 이어서는 같은 행동(멈춘 진행이 있으면 이어서).
  z.strictObject({ type: z.literal("supplement-start"), cardId: id }),
  z.strictObject({ type: z.literal("supplement-read"), questionId: id }),
  z.strictObject({
    type: z.literal("supplement-answer"),
    questionId: id,
    choiceIds: z.array(z.number().int().min(0).max(3)).max(4),
  }),
  z.strictObject({ type: z.literal("supplement-solution"), cardId: id }),
]);
export type SupplementAction = Extract<
  z.infer<typeof explorerActionSchema>,
  { type: `supplement-${string}` }
>;
export const explorerRequestSchema = z.strictObject({
  requestId: uuidSchema,
  expectedRevision: count,
  action: explorerActionSchema,
  /**
   * The student whose screen sent it. Sign-out and sign-in move softly, so a chest
   * save queued by one student can leave after another has signed in — the route
   * refuses a body for anyone but the signed-in student (05 §8.21).
   * Required since every screen sends it (D-146 took it optional for old tabs).
   */
  studentId: id,
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
export type ExplorerSolution = z.infer<typeof explorerSolutionSchema>;
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
  /** After a wrong first answer (plan §3.2 ②) — sent only to screens that ask. */
  followUp: z
    .strictObject({
      state: z.enum(["again", "solution"]),
      firstChoiceIds: z.array(z.number().int().min(0).max(3)).max(4),
    })
    .optional(),
  solution: explorerSolutionSchema.optional(),
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
      continuation: count.default(0),
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
  /**
   * 보충 카드(D-147) — 이름 · 갈래 · 단원과 학생 기록만(정답 · 문장은 활동과 해설로만 나간다). 1단계는 읽기만(없어도 된다).
   * `offer` 는 단원 끝 줄, `solved` 는 멈춘 진행에서 해결한 활동 수(«이어서 하기 · n / 3»).
   */
  supplements: z
    .strictObject({
      cards: z
        .array(
          z.strictObject({
            id,
            unitId: id,
            name: text,
            kind: z.enum(CONCEPT_KINDS),
            prerequisiteIds: z.array(id).max(10),
            collectedAt: isoDateSchema.nullable(),
            missedAt: isoDateSchema.nullable(),
            started: z.boolean(),
            solved: z.number().int().min(0).max(3),
          }),
        )
        .max(60),
      session: z
        .strictObject({
          id,
          cardId: id,
          title: text,
          index: z.number().int().min(0).max(3),
          total: z.number().int().min(1).max(3),
          round: z.number().int().min(0).max(3),
          solved: z.number().int().min(0).max(3),
        })
        .nullable(),
      activity: explorerActivitySchema.nullable(),
      offer: z.strictObject({ cardId: id, unitId: id }).nullable(),
    })
    .optional(),
});
export const explorerStateSchema = explorerViewSchema.extend({
  student: z.strictObject({ id, name: z.string(), className: z.string() }),
  revision: count,
  feedback: explorerFeedbackSchema.nullable(),
  today: isoDateSchema.optional(),
  journey: mathExpeditionJourneySchema.optional(),
  expedition: mathExpeditionSchema.optional(),
});
export type ExplorerView = z.infer<typeof explorerViewSchema>;
export type ExplorerState = z.infer<typeof explorerStateSchema>;
export type ExplorerActivity = z.infer<typeof explorerActivitySchema>;
