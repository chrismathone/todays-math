import { z } from "zod";
import { dataResponseSchema, isoDateTimeSchema } from "./common.contract";
import {
  prerequisiteSectionEvidenceSchema,
  prerequisiteVersionsSchema,
} from "./mathPrerequisite.contract";
import {
  textbookConceptLinkSchema,
  textbookConceptReviewSchema,
} from "./textbookConcept.contract";

export const mathInsightInquiryInputSchema = z.strictObject({
  query: z.string().trim().min(1).max(500),
});
export type MathInsightInquiryInput = z.infer<
  typeof mathInsightInquiryInputSchema
>;
export const mathInsightExclusionSchema = z.enum([
  "unfinished",
  "future",
  "before-plan",
  "outside-window",
  "superseded",
  "hint-self-check-give-up-or-repeated",
  "retry-not-first-attempt",
  "no-plan",
]);
export const mathInsightEvidenceSchema = z.strictObject({
  id: z.string(),
  sessionId: z.string(),
  sectionId: z.string(),
  startedAt: isoDateTimeSchema,
  completedAt: isoDateTimeSchema.nullable(),
  included: z.boolean(),
  exclusions: z.array(mathInsightExclusionSchema),
  independentCorrect: z.number().int().nonnegative(),
  independentIncorrect: z.number().int().nonnegative(),
});
export const mathInsightSnapshotSchema = z.strictObject({
  scope: z.strictObject({
    pilotId: z.literal("elementary-fractions-v1"),
    dataVersion: z.literal(1),
    graphHash: z.string(),
    versions: prerequisiteVersionsSchema,
    limitations: z.array(z.string()),
  }),
  asOf: isoDateTimeSchema,
  revision: z.number().int().nonnegative(),
  stateDigest: z.string(),
  freshness: z.enum(["current", "insufficient"]),
  eligibility: z.enum(["eligible", "out-of-scope", "insufficient"]),
  goal: z
    .strictObject({
      sectionId: z.string(),
      title: z.string(),
      unitId: z.string().nullable(),
      mappingStatus: z.enum(["verified", "unmapped"]),
    })
    .nullable(),
  sections: z
    .array(
      prerequisiteSectionEvidenceSchema.extend({
        evidenceIds: z.array(z.string()),
        mappingStatus: z.literal("verified"),
        relation: textbookConceptLinkSchema.shape.relation,
      }),
    )
    .max(4),
  evidence: z.array(mathInsightEvidenceSchema).max(31),
  nextChecks: z
    .array(
      z.strictObject({
        id: z.string(),
        sectionId: z.string(),
        title: z.string(),
        unitId: z.string(),
        relation: textbookConceptLinkSchema.shape.relation,
        reviewStatus: textbookConceptReviewSchema.shape.status,
        eligible: z.boolean(),
        evidenceIds: z.array(z.string()),
        reason: z.string(),
        caveats: z.array(z.string()),
      }),
    )
    .max(2),
  limitations: z.array(z.string()),
});
export type MathInsightSnapshot = z.infer<typeof mathInsightSnapshotSchema>;
export const mathInsightIntentSchema = z.enum([
  "overview",
  "evidence",
  "next-checks",
  "insufficient",
]);
export const mathInsightInquiryResultSchema = z.strictObject({
  snapshot: mathInsightSnapshotSchema,
  status: z.enum(["supported", "insufficient"]),
  intent: mathInsightIntentSchema,
  facts: z
    .array(
      z.strictObject({
        text: z.string(),
        evidenceIds: z.array(z.string()),
        candidateIds: z.array(z.string()),
      }),
    )
    .max(8),
  provenance: z.strictObject({
    provider: z.enum(["gemini", "anthropic"]),
    model: z.string(),
    role: z.literal("selection-only"),
  }),
});
export type MathInsightInquiryResult = z.infer<
  typeof mathInsightInquiryResultSchema
>;
export const mathInsightSnapshotResponseSchema = dataResponseSchema(
  mathInsightSnapshotSchema,
);
export const mathInsightInquiryResponseSchema = dataResponseSchema(
  mathInsightInquiryResultSchema,
);
