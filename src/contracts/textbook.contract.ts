import { z } from "zod";
import {
  textbookConceptSchema,
  textbookFrozenEntrySchema,
} from "./textbookConcept.contract";
import {
  textbookConfigSchema,
  textbookEditionSchema,
  textbookExchangeSchema,
  textbookItemSchema,
  textbookSectionSchema,
  textbookUnitSchema,
  textbookVideoBindingSchema,
} from "./textbookExchange.contract";
import {
  textbookDateSchema,
  textbookHashSchema,
  textbookIdSchema,
  textbookIssueSchema,
  textbookKeySchema,
  textbookRevisionSchema,
  textbookTitleSchema,
} from "./textbookPrimitives.contract";

export const textbookRequestSchema = z.strictObject({ requestId: z.uuid() });
export const textbookVisibilitySchema = z.enum(["private", "branch"]);
export const textbookBookSummarySchema = z.strictObject({
  id: z.uuid(),
  ownerId: z.uuid(),
  ownerName: z.string().max(100),
  isOwner: z.boolean(),
  title: textbookTitleSchema,
  visibility: textbookVisibilitySchema,
  sharedBranchId: z.uuid().nullable(),
  archivedAt: textbookDateSchema.nullable(),
  createdAt: textbookDateSchema,
  updatedAt: textbookDateSchema,
  draftEditionId: z.uuid().nullable(),
  latestPublishedEditionId: z.uuid().nullable(),
});
export const textbookBookListSchema = z.strictObject({
  data: z.array(textbookBookSummarySchema).max(1000),
});
export const textbookCreateBookSchema = textbookRequestSchema.extend({
  config: textbookConfigSchema,
});
export const textbookUpdateBookSchema = textbookRequestSchema.extend({
  title: textbookTitleSchema.optional(),
  archived: z.boolean().optional(),
  visibility: textbookVisibilitySchema.optional(),
  sharedBranchId: z.uuid().nullable().optional(),
});
export const textbookCreateEditionSchema = textbookRequestSchema.extend({
  sourceEditionId: z.uuid().optional(),
  label: z.string().min(1).max(40),
});
export const textbookSectionRecordSchema = z.strictObject({
  id: z.uuid(),
  unitKey: textbookKeySchema,
  revision: textbookRevisionSchema,
  section: textbookSectionSchema,
  updatedAt: textbookDateSchema,
});
export const textbookOutlineUnitSchema = textbookUnitSchema
  .omit({ sections: true })
  .extend({
    sections: z
      .array(
        z.strictObject({
          id: z.uuid(),
          sectionKey: textbookKeySchema,
          title: textbookTitleSchema,
          revision: textbookRevisionSchema,
        }),
      )
      .max(500),
  });
export const textbookEditionDetailSchema = z.strictObject({
  book: textbookBookSummarySchema,
  edition: textbookEditionSchema,
  structureRevision: textbookRevisionSchema,
  config: textbookConfigSchema,
  outline: z.array(textbookOutlineUnitSchema).max(500),
  issues: z.array(textbookIssueSchema).max(20_000),
});
export const textbookSaveStructureSchema = textbookRequestSchema.extend({
  expectedRevision: textbookRevisionSchema,
  config: textbookConfigSchema,
  outline: z.array(textbookOutlineUnitSchema).max(500),
});
export const textbookSaveSectionSchema = textbookRequestSchema.extend({
  expectedRevision: z.number().int().nonnegative(),
  unitKey: textbookKeySchema,
  section: textbookSectionSchema,
});
export const textbookSaveSectionResultSchema = z.strictObject({
  section: textbookSectionRecordSchema,
  aggregateRevision: textbookRevisionSchema,
  replayed: z.boolean(),
});
export const textbookDeleteSectionSchema = textbookRequestSchema.extend({
  expectedRevision: textbookRevisionSchema,
});
export const textbookCaptureItemsSchema = textbookRequestSchema.extend({
  expectedRevision: textbookRevisionSchema,
  sectionId: z.uuid(),
  source: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("test"), testId: z.uuid() }),
    z.strictObject({
      kind: z.literal("problems"),
      problemIds: z.array(z.uuid()).min(1).max(2000),
    }),
  ]),
});
export const textbookCaptureResultSchema = z.strictObject({
  items: z.array(textbookItemSchema),
  excluded: z.array(
    z.strictObject({ problemId: z.uuid(), reason: z.string().max(2000) }),
  ),
  aggregateRevision: textbookRevisionSchema,
  replayed: z.boolean(),
});
export const textbookUpdateItemSchema = textbookRequestSchema.extend({
  expectedRevision: textbookRevisionSchema,
  learningStage: textbookItemSchema.shape.learningStage.optional(),
  displayNumber: textbookItemSchema.shape.displayNumber.optional(),
  layout: textbookItemSchema.shape.layout.optional(),
  conceptKeys: textbookItemSchema.shape.conceptKeys,
  videoRequired: z.boolean().optional(),
});
/** Review claims in imported concepts are evidence only; the server stamps confirmations. */
export const textbookSaveConceptSchema = textbookRequestSchema.extend({
  expectedRevision: z.number().int().nonnegative(),
  concept: textbookConceptSchema,
  confirmBlankEntryIds: z.array(textbookIdSchema).max(2000).optional(),
  confirmLinkIds: z.array(textbookIdSchema).max(2000).optional(),
});
export const textbookConceptRecordSchema = z.strictObject({
  concept: textbookConceptSchema,
  revision: textbookRevisionSchema,
  aggregateRevision: textbookRevisionSchema,
});
export const textbookConceptCatalogSchema = z.strictObject({
  entries: z.array(textbookFrozenEntrySchema).max(2000),
  nextCursor: z.string().max(200).nullable(),
});
export const textbookArtifactSchema = z.strictObject({
  id: z.uuid(),
  kind: z.enum([
    "student-pdf",
    "answer-pdf",
    "spread-pdf",
    "offline-html",
    "exchange-json",
    "exchange-zip",
    "mapping-csv",
    "validation-json",
  ]),
  mimeType: z.string().max(100),
  sha256: textbookHashSchema,
  byteLength: z.number().int().nonnegative(),
  pageCount: z.number().int().nonnegative().nullable(),
});
export const textbookPublishReserveSchema = textbookRequestSchema.extend({
  expectedRevision: textbookRevisionSchema,
});
export const textbookPublishJobSchema = z.strictObject({
  requestId: z.uuid(),
  editionId: z.uuid(),
  expectedRevision: textbookRevisionSchema,
  status: z.enum([
    "reserved",
    "rendering",
    "verifying",
    "ready",
    "published",
    "failed",
  ]),
  completedSteps: z.number().int().nonnegative(),
  totalSteps: z.number().int().nonnegative(),
  issues: z.array(textbookIssueSchema).max(20_000),
  artifacts: z.array(textbookArtifactSchema).max(20),
  manifestHash: textbookHashSchema.nullable(),
  replayed: z.boolean(),
});
export const textbookPreflightSchema = z.strictObject({
  revision: textbookRevisionSchema,
  canPublish: z.boolean(),
  issues: z.array(textbookIssueSchema).max(20_000),
});
export const textbookAssignmentScopeSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("edition") }),
  z.strictObject({
    kind: z.literal("sections"),
    sectionIds: z.array(z.uuid()).min(1).max(500),
  }),
  z.strictObject({
    kind: z.literal("items"),
    itemIds: z.array(textbookIdSchema).min(1).max(10_000),
  }),
]);
export const textbookAssignmentSubjectSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("class"), classId: z.uuid() }),
  z.strictObject({ kind: z.literal("student"), studentId: z.uuid() }),
]);
export const textbookCreateAssignmentSchema = textbookRequestSchema
  .extend({
    subject: textbookAssignmentSubjectSchema,
    scope: textbookAssignmentScopeSchema,
    startsAt: textbookDateSchema,
    expiresAt: textbookDateSchema.nullable(),
  })
  .refine(
    (value) =>
      value.expiresAt === null ||
      Date.parse(value.expiresAt) > Date.parse(value.startsAt),
    "배정 만료는 시작 뒤여야 합니다.",
  );
export const textbookAssignmentSchema = z.strictObject({
  id: z.uuid(),
  editionId: z.uuid(),
  subject: textbookAssignmentSubjectSchema,
  scope: textbookAssignmentScopeSchema,
  startsAt: textbookDateSchema,
  expiresAt: textbookDateSchema.nullable(),
  revokedAt: textbookDateSchema.nullable(),
});
export const textbookReissueSchema = textbookRequestSchema.extend({
  itemIds: z.array(textbookIdSchema).min(1).max(200),
  classId: z.uuid(),
  title: textbookTitleSchema,
  testType: z.enum(["daily", "review"]),
  rangeEndUnitId: z.uuid(),
});
export const textbookImportSchema = textbookRequestSchema.extend({
  mode: z.enum(["archive", "copy"]),
  uploadId: z.uuid(),
  expectedSha256: textbookHashSchema,
});
export const textbookImportResultSchema = z.strictObject({
  mode: z.enum(["archive", "copy"]),
  archiveId: z.uuid().nullable(),
  bookId: z.uuid().nullable(),
  editionId: z.uuid().nullable(),
  idMap: z
    .array(
      z.strictObject({
        namespace: z.string().max(80),
        from: textbookIdSchema,
        to: textbookIdSchema,
      }),
    )
    .max(100_000),
  issues: z.array(textbookIssueSchema).max(20_000),
  replayed: z.boolean(),
});
export const textbookVideoCreateSchema = textbookRequestSchema.extend({
  title: textbookTitleSchema,
  provider: z.literal("youtube"),
  providerVideoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
});
export const textbookVideoSchema = z.strictObject({
  id: z.uuid(),
  title: textbookTitleSchema,
  provider: z.literal("youtube"),
  providerVideoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  createdAt: textbookDateSchema,
});
export const textbookBindingWriteSchema = textbookRequestSchema
  .extend({
    videoId: z.uuid(),
    startSeconds: z.number().nonnegative().max(86_400),
    endSeconds: z.number().positive().max(86_400).nullable(),
    status: textbookVideoBindingSchema.shape.status,
    expectedContentHash: textbookHashSchema,
  })
  .refine(
    (binding) =>
      binding.endSeconds === null || binding.endSeconds > binding.startSeconds,
    "종료 시점은 시작 뒤여야 합니다.",
  );
export const textbookSnapshotActionSchema = textbookRequestSchema.extend({
  expectedRevision: textbookRevisionSchema,
});
export const textbookExportResponseSchema = z.strictObject({
  data: textbookExchangeSchema,
});
export type TextbookBookSummary = z.infer<typeof textbookBookSummarySchema>;
export type TextbookEditionDetail = z.infer<typeof textbookEditionDetailSchema>;
export type TextbookSectionRecord = z.infer<typeof textbookSectionRecordSchema>;
export type TextbookOutlineUnit = z.infer<typeof textbookOutlineUnitSchema>;
export type TextbookPublishJob = z.infer<typeof textbookPublishJobSchema>;
export type TextbookArtifact = z.infer<typeof textbookArtifactSchema>;
export type TextbookAssignment = z.infer<typeof textbookAssignmentSchema>;
export type TextbookConceptRecord = z.infer<typeof textbookConceptRecordSchema>;
export type TextbookVideo = z.infer<typeof textbookVideoSchema>;
