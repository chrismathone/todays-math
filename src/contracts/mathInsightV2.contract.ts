import { z } from "zod";
import { dataResponseSchema, isoDateTimeSchema } from "./common.contract";
import { coursePlanSchema } from "./mathSrsCourse.contract";
import { mathInsightSnapshotSchema } from "./mathInsight.contract";

/** Absent header keeps the v1 protocol. Any present value other than "2" is rejected. */
export const MATH_INSIGHT_VERSION_HEADER = "x-math-insight-version";
export const MATH_INSIGHT_V2 = "2";
export const mathInsightV2InquiryInputSchema = z.strictObject({
  query: z.string().trim().min(1).max(500),
});
export const mathInsightV2ReasonSchema = z.enum([
  "unfinished",
  "future",
  "before-plan",
  "outside-window",
  "no-plan",
  "future-plan",
  "source-missing",
  "unsupported-section",
  "hint-self-check-give-up-or-repeated",
  "retry-not-first-attempt",
]);
const count = z.number().int().nonnegative();
export const mathInsightV2EvidenceSchema = z.strictObject({
  id: z.string(),
  sessionId: z.string().nullable(),
  sectionId: z.string(),
  title: z.string(),
  grade: z
    .union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)])
    .nullable(),
  startedAt: isoDateTimeSchema.nullable(),
  completedAt: isoDateTimeSchema.nullable(),
  source: z.enum(["retained-session", "summary-without-session"]),
  included: z.boolean(),
  exclusions: z.array(mathInsightV2ReasonSchema),
  /** Raw retained source counts; never a passed/failed outcome or complete history. */
  independentCorrect: count,
  independentIncorrect: count,
  excludedFirstAttempts: count,
  retryAttempts: count,
});
export const mathInsightV2FactSchema = z.strictObject({
  id: z.string(),
  kind: z.enum([
    "plan-context",
    "course-goal",
    "observation",
    "availability",
    "limitation",
  ]),
  text: z.string(),
  evidenceIds: z.array(z.string()),
  candidateIds: z.array(z.string()),
});
export const mathInsightV2SnapshotSchema = z.strictObject({
  scope: z.strictObject({
    dataVersion: z.literal(2),
    supportedGrades: z.tuple([
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
    ]),
    windowStart: isoDateTimeSchema,
    windowEnd: isoDateTimeSchema,
    limitations: z.array(z.string()),
  }),
  context: mathInsightSnapshotSchema.shape.context,
  asOf: isoDateTimeSchema,
  revision: count,
  stateDigest: z.string().length(64),
  planContext: z.strictObject({
    status: z.enum(["absent", "active", "paused", "future"]),
    storedPlan: coursePlanSchema.nullable(),
    courseGoal: z
      .strictObject({ sectionId: z.string(), title: z.string() })
      .nullable(),
    /** Existing course daily goal calculation; explicitly excludes expedition mission. */
    courseDailyGoal: z
      .union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)])
      .nullable(),
    defaultPlan: z.literal("not-evaluated"),
    dailyMission: z.literal("not-evaluated"),
  }),
  retention: z.strictObject({
    sourcePresence: z.enum(["present", "none-retained", "summary-only"]),
    retentionCoverage: z.enum(["unknown", "possibly-truncated"]),
    retainedSessionCount: count,
    recentAttemptCount: count,
  }),
  observations: z.array(mathInsightV2EvidenceSchema).max(400),
  facts: z.array(mathInsightV2FactSchema).max(420),
  /** Unchanged four-section partial mapping and prerequisite policy, kept separate. */
  pilot: mathInsightSnapshotSchema,
});
export type MathInsightV2Snapshot = z.infer<typeof mathInsightV2SnapshotSchema>;
export type MathInsightV2Evidence = z.infer<typeof mathInsightV2EvidenceSchema>;
export const mathInsightV2IntentSchema = z.enum([
  "overview",
  "context",
  "evidence",
  "next-checks",
  "insufficient",
]);
export const mathInsightV2SelectionSchema = z.strictObject({
  snapshotId: z.string().length(64),
  intent: mathInsightV2IntentSchema,
  factIds: z.array(z.string()).max(6),
  evidenceIds: z.array(z.string()).max(6),
  candidateIds: z.array(z.string()).max(2),
});
export type MathInsightV2Selection = z.infer<
  typeof mathInsightV2SelectionSchema
>;
export const mathInsightV2InquiryResultSchema = z.strictObject({
  snapshot: mathInsightV2SnapshotSchema,
  status: z.enum(["supported", "insufficient"]),
  intent: mathInsightV2IntentSchema,
  facts: z.array(mathInsightV2FactSchema).max(8),
  provenance: z.strictObject({
    provider: z.enum(["gemini", "anthropic"]),
    model: z.string(),
    role: z.literal("selection-only"),
  }),
});
export type MathInsightV2InquiryResult = z.infer<
  typeof mathInsightV2InquiryResultSchema
>;
export const mathInsightV2SnapshotResponseSchema = dataResponseSchema(
  mathInsightV2SnapshotSchema,
);
export const mathInsightV2InquiryResponseSchema = dataResponseSchema(
  mathInsightV2InquiryResultSchema,
);
/** 409 has no snapshot. Refresh GET once; preserve query; never automatically repeat POST. */
export const MATH_INSIGHT_V2_STALE_CODE = "CONFLICT";
