import { z } from "zod";
import {
  applyItemSchema,
  conceptEntrySchema,
  figureItemSchema,
  oxItemSchema,
  sectionKeySchema,
} from "./conceptBlank.contract";
import { CONCEPT_KINDS } from "@/lib/math-explorers/conceptKinds";
import {
  textbookDateSchema,
  textbookEntryKindSchema,
  textbookFormSchema,
  textbookHashSchema,
  textbookIdSchema,
  textbookKeySchema,
  textbookLevelSchema,
  textbookRevisionSchema,
  textbookTextSchema,
  textbookTitleSchema,
} from "./textbookPrimitives.contract";

export const textbookConceptReviewSchema = z
  .strictObject({
    status: z.enum(["candidate", "confirmed", "rejected"]),
    candidateRule: z.enum(["unit-triple", "bridge", "manual"]),
    reviewedBy: z.uuid().nullable(),
    reviewedAt: textbookDateSchema.nullable(),
    targetHash: textbookHashSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    if (
      value.status === "confirmed" &&
      (!value.reviewedBy || !value.reviewedAt || !value.targetHash)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "확인한 연결에는 확인자·시각·대상 해시가 필요합니다.",
      });
    }
  });

export const textbookConceptTargetSchema = z.discriminatedUnion("namespace", [
  z.strictObject({
    namespace: z.literal("explorer-card"),
    cardId: textbookIdSchema,
  }),
  z.strictObject({
    namespace: z.literal("course-section"),
    courseSectionId: textbookIdSchema,
  }),
  z.strictObject({
    namespace: z.literal("graph-unit"),
    graphUnitId: textbookIdSchema,
  }),
]);
export const textbookBlankReferenceSchema = z.strictObject({
  blankSectionKey: sectionKeySchema,
  entryKind: textbookEntryKindSchema,
  entryId: conceptEntrySchema.shape.id,
  review: textbookConceptReviewSchema,
});
export const textbookConceptLinkSchema = z.strictObject({
  linkId: textbookIdSchema,
  target: textbookConceptTargetSchema,
  relation: z.enum(["same", "covers-part", "related"]),
  review: textbookConceptReviewSchema,
});
export const textbookConceptBodySchema = z.strictObject({
  goal: textbookTextSchema,
  prerequisites: z.array(textbookTextSchema).max(100),
  definition: textbookTextSchema,
  conditions: textbookTextSchema.nullable(),
  examples: z.array(textbookTextSchema).max(100),
  counterexamples: z.array(textbookTextSchema).max(100),
  misconceptions: z.array(textbookTextSchema).max(100),
  explainPrompt: textbookTextSchema.nullable(),
});
export const textbookFrozenEntrySchema = z.discriminatedUnion("entryKind", [
  z.strictObject({
    entryKind: z.literal("concept"),
    payload: conceptEntrySchema,
  }),
  z.strictObject({ entryKind: z.literal("ox"), payload: oxItemSchema }),
  z.strictObject({ entryKind: z.literal("apply"), payload: applyItemSchema }),
  z.strictObject({ entryKind: z.literal("figure"), payload: figureItemSchema }),
]);
export const textbookFrozenConceptSchema = z.strictObject({
  contentHash: textbookHashSchema,
  parserVersion: z.string().min(1).max(80),
  compositionVersion: z.string().min(1).max(80),
  mappingVersion: z.string().min(1).max(80),
  sections: z
    .array(
      z.strictObject({
        blankSectionKey: sectionKeySchema,
        title: textbookTitleSchema,
        unitLabel: z.string().max(300),
      }),
    )
    .max(60),
  entries: z.array(textbookFrozenEntrySchema).max(2000),
  selection: z
    .array(
      z.strictObject({
        blankSectionKey: sectionKeySchema,
        entryKind: textbookEntryKindSchema,
        entryId: conceptEntrySchema.shape.id,
        form: textbookFormSchema,
        level: textbookLevelSchema,
      }),
    )
    .max(2000),
  assetHashes: z
    .array(
      z.strictObject({ assetId: textbookIdSchema, sha256: textbookHashSchema }),
    )
    .max(2000),
});
export const textbookConceptSchema = z
  .strictObject({
    conceptKey: textbookKeySchema,
    unitKey: textbookKeySchema,
    sectionKey: textbookKeySchema.nullable(),
    title: textbookTitleSchema,
    kind: z.enum(CONCEPT_KINDS),
    unitId: z.uuid().nullable(),
    body: textbookConceptBodySchema,
    blankItems: z.array(textbookBlankReferenceSchema).max(2000),
    // Absent in older exchange packages; do not insert defaults while parsing their bytes.
    blankForms: z
      .array(textbookFormSchema)
      .min(1)
      .max(5)
      .refine(
        (forms) => new Set(forms).size === forms.length,
        "백지 형식을 중복 선택할 수 없습니다.",
      )
      .optional(),
    links: z.array(textbookConceptLinkSchema).max(2000),
    mappingVersion: z.string().min(1).max(80),
    derivedFromConceptKey: textbookKeySchema.nullable(),
    frozen: textbookFrozenConceptSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    for (const [index, entry] of value.blankItems.entries()) {
      const key = `${entry.entryKind}:${entry.entryId}`;
      if (seen.has(key))
        ctx.addIssue({
          code: "custom",
          path: ["blankItems", index],
          message: "같은 백지 항목을 중복 연결할 수 없습니다.",
        });
      seen.add(key);
    }
    const links = new Set<string>();
    for (const [index, entry] of value.links.entries()) {
      if (links.has(entry.linkId))
        ctx.addIssue({
          code: "custom",
          path: ["links", index, "linkId"],
          message: "중복 연결 ID입니다.",
        });
      links.add(entry.linkId);
    }
  });
export const textbookConceptIntegrationSchema = z.strictObject({
  version: z.literal("injaewon.textbook.concepts.v1"),
  concepts: z.array(textbookConceptSchema).max(5000),
});

export const textbookConceptAttemptSchema = z.strictObject({
  attemptId: z.uuid(),
  requestId: z.uuid(),
  bodyHash: textbookHashSchema,
  studentId: z.uuid(),
  editionId: z.uuid(),
  conceptKey: textbookKeySchema,
  frozenHash: textbookHashSchema,
  form: textbookFormSchema,
  channel: z.enum(["student-text", "teacher-observed"]),
  response: z.string().max(20_000),
  submittedAt: textbookDateSchema,
  revision: textbookRevisionSchema,
  reviewStatus: z.enum(["pending", "checked", "needs-review"]),
  reviewedBy: z.uuid().nullable(),
  reviewedAt: textbookDateSchema.nullable(),
  note: z.string().max(4000).nullable(),
});
export const textbookAttemptSubmitSchema = z.strictObject({
  requestId: z.uuid(),
  form: z.enum(["recall", "term", "cloze"]),
  response: z.string().min(1).max(20_000),
});
export const textbookObservationCreateSchema = z.strictObject({
  requestId: z.uuid(),
  studentId: z.uuid(),
  form: textbookFormSchema,
  observation: z.string().min(1).max(20_000),
});
export const textbookAttemptReviewSchema = z.strictObject({
  requestId: z.uuid(),
  expectedRevision: textbookRevisionSchema,
  reviewStatus: z.enum(["checked", "needs-review"]),
  note: z.string().max(4000).nullable(),
});
export type TextbookConcept = z.infer<typeof textbookConceptSchema>;
export type TextbookConceptBody = z.infer<typeof textbookConceptBodySchema>;
export type TextbookConceptTarget = z.infer<typeof textbookConceptTargetSchema>;
export type TextbookFrozenConcept = z.infer<typeof textbookFrozenConceptSchema>;
export type TextbookFrozenEntry = z.infer<typeof textbookFrozenEntrySchema>;
export type TextbookConceptAttempt = z.infer<
  typeof textbookConceptAttemptSchema
>;
