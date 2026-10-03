import { z } from "zod";

export const mathGraphUnitIdSchema = z
  .string()
  .regex(
    /^(?:E(?:12|34|56)-[NRGD]\d{2}|M[123]-[NRGD]\d{2}|H-(?:C[12]|BAS[12]|ALG|CAL[12]|PS|GEO)-\d{2})$/,
  );
const topicIdSchema = z.string().regex(/^[A-Z0-9-]+\.t\d{2}$/);
const schoolLevelSchema = z.enum(["elementary", "middle", "high"]);

export const mathGraphUnitSchema = z.strictObject({
  id: mathGraphUnitIdSchema,
  nodeType: z.literal("unit"),
  title: z.string().min(1),
  schoolLevel: schoolLevelSchema,
  gradeBand: z.string(),
  suggestedGrade: z.number().int().min(1).max(3).nullable(),
  course: z.string(),
  courseGroup: z.string(),
  domain: z.string(),
  topics: z.array(z.string().min(1)).min(1),
  officialBasis: z.literal("editorial_curriculum_summary"),
  achievementStandardIds: z.array(z.string()).length(0),
  needsCurriculumAudit: z.literal(true),
  detailConfidence: z.enum(["editorial_summary", "editorial_topic_grouping"]),
});
export type MathGraphUnit = z.infer<typeof mathGraphUnitSchema>;

const topicSchema = z.strictObject({
  id: topicIdSchema,
  nodeType: z.literal("topic"),
  parentId: mathGraphUnitIdSchema,
  title: z.string().min(1),
  order: z.number().int().positive(),
  schoolLevel: schoolLevelSchema,
  gradeBand: z.string(),
  course: z.string(),
  domain: z.string(),
  officialBasis: z.literal("editorial_learning_element"),
  achievementStandardIds: z.array(z.string()).length(0),
});
export const mathGraphUnitEdgeSchema = z.strictObject({
  from: mathGraphUnitIdSchema,
  to: mathGraphUnitIdSchema,
  relation: z.enum(["prerequisite", "support"]),
  reason: z.string().min(1),
  officialBasis: z.literal("pedagogical_inference"),
  confidence: z.enum(["strong_inference", "support_inference"]),
  isOfficialEnrollmentRequirement: z.literal(false),
});
export type MathGraphUnitEdge = z.infer<typeof mathGraphUnitEdgeSchema>;
const containsSchema = z.strictObject({
  from: mathGraphUnitIdSchema,
  to: topicIdSchema,
  relation: z.literal("contains"),
  confidence: z.literal("structural"),
});
const countSchema = z.number().int().nonnegative();
const contentHashSchema = z.string().regex(/^[a-f0-9]{64}$/);

export const mathCurriculumGraphSchema = z.strictObject({
  schemaVersion: z.literal("1.1.0"),
  graphContentHash: contentHashSchema,
  title: z.string(),
  dataStatus: z.string(),
  scope: z.strictObject({
    included: z.array(z.string()),
    excluded: z.array(z.string()),
    topicPrerequisiteEdgesIncluded: z.literal(false),
    note: z.string(),
  }),
  units: z.array(mathGraphUnitSchema),
  topics: z.array(topicSchema),
  edges: z.array(z.union([mathGraphUnitEdgeSchema, containsSchema])),
  courseRelations: z.array(
    z.strictObject({
      from: z.string(),
      to: z.string(),
      relation: z.enum([
        "course_sequence",
        "alternative_track",
        "recommended_foundation",
        "recommended_before_or_concurrent",
        "conceptual_support",
      ]),
      entityType: z.literal("course"),
      note: z.string(),
    }),
  ),
  topologicalOrder: z.array(mathGraphUnitIdSchema),
  validation: z.strictObject({
    unitCount: countSchema,
    topicCount: countSchema,
    prerequisiteEdgeCount: countSchema,
    supportEdgeCount: countSchema,
    containmentEdgeCount: countSchema,
    duplicateUnitIdCount: countSchema,
    danglingUnitEdgeCount: countSchema,
    prerequisiteCycleCount: countSchema,
  }),
  sources: z.array(
    z.strictObject({
      title: z.string(),
      url: z.url(),
      role: z.string(),
    }),
  ),
});
export type MathCurriculumGraph = z.infer<typeof mathCurriculumGraphSchema>;

export const prerequisiteVersionsSchema = z.strictObject({
  graphSchemaVersion: z.literal("1.1.0"),
  graphContentHash: contentHashSchema,
  mappingVersion: z.literal(1),
  policyVersion: z.literal(1),
});
const sectionIdSchema = z.string().regex(/^[3-6]-[12]-\d+-\d+$/);
export const prerequisiteOutcomeSchema = z.enum([
  "passed",
  "failed",
  "inconclusive",
  "unknown",
]);
export type PrerequisiteOutcome = z.infer<typeof prerequisiteOutcomeSchema>;
export const prerequisiteSectionEvidenceSchema = z.strictObject({
  unitId: mathGraphUnitIdSchema,
  sectionId: sectionIdSchema,
  title: z.string(),
  status: z.enum([
    "unassessed",
    "passed_recent",
    "not_passed_recent",
    "stale",
    "inconclusive",
  ]),
  outcome: prerequisiteOutcomeSchema,
  independentCorrect: z.number().int().min(0).max(5),
  independentIncorrect: z.number().int().min(0).max(5),
  lastObservedAt: z.iso.datetime({ offset: true }).nullable(),
  sourceRetained: z.boolean(),
  partial: z.literal(true),
});
export type PrerequisiteSectionEvidence = z.infer<
  typeof prerequisiteSectionEvidenceSchema
>;

// Display metadata only. It is never written into StudentSrsState.payload.
export const prerequisiteContextSchema = z.strictObject({
  kind: z.enum(["check", "return", "unavailable"]),
  targetSectionId: sectionIdSchema,
  sectionId: sectionIdSchema.nullable(),
  reason: z.string().min(1),
  canStart: z.boolean(),
  partial: z.literal(true),
  versions: prerequisiteVersionsSchema,
});
export type PrerequisiteContext = z.infer<typeof prerequisiteContextSchema>;

export const prerequisiteTeacherEvidenceSchema = z.strictObject({
  source: z.literal("completed_elementary_course"),
  configuredAt: z.iso.datetime({ offset: true }).nullable(),
  versions: prerequisiteVersionsSchema,
  sections: z.array(prerequisiteSectionEvidenceSchema).max(4),
  heldSectionIds: z.array(sectionIdSchema).max(2),
  holdReason: z.string().nullable(),
  context: prerequisiteContextSchema.nullable(),
});
export type PrerequisiteTeacherEvidence = z.infer<
  typeof prerequisiteTeacherEvidenceSchema
>;
