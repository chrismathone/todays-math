/** English bank HTTP contract. Original text is preserved exactly; never silently truncated. */
import { z } from "zod";
import {
  dataResponseSchema,
  isoDateTimeSchema,
  uuidSchema,
} from "./common.contract";
import {
  englishGradeSchema,
  englishPassageRefSchema,
} from "./english.contract";
export {
  englishPassageRefSchema,
  type EnglishPassageRef,
} from "./english.contract";

export const ENGLISH_BANK_TEXT_MAX = 30_000;
export const ENGLISH_BANK_PATH_LIMITS = {
  chatgpt: 18_000,
  api: 18_000,
  cloze: 24_000,
} as const;
export const englishBankPathSchema = z.enum(["chatgpt", "cloze", "api"]);
const revision = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const text = z
  .string()
  .min(1)
  .max(ENGLISH_BANK_TEXT_MAX)
  .refine((value) => value.trim().length > 0);
const title = z.string().trim().min(1).max(160);
export const englishPassageSourceSchema = z.strictObject({
  label: z.string().trim().max(255),
  url: z
    .url()
    .max(2000)
    .refine((value) => /^https?:\/\//.test(value))
    .nullable(),
});
export const englishPassagePurposeSchema = z.enum([
  "generation_input",
  "external_model",
]);
export const englishPassageRightsSchema = z.strictObject({
  status: z.enum(["unconfirmed", "confirmed"]),
  basis: z.string().max(2000),
  allowedUses: z.array(englishPassagePurposeSchema).max(2),
  confirmedBy: uuidSchema.nullable(),
  confirmedAt: isoDateTimeSchema.nullable(),
});
export type EnglishPassageRights = z.infer<typeof englishPassageRightsSchema>;
export const englishPassageCreateSchema = z.strictObject({
  title,
  text,
  grade: englishGradeSchema.nullable().default(null),
  source: englishPassageSourceSchema.default({ label: "", url: null }),
  clientKey: uuidSchema,
});
export type EnglishPassageCreate = z.infer<typeof englishPassageCreateSchema>;
export const englishPassageUpdateSchema = z
  .strictObject({
    revision,
    title: title.optional(),
    text: text.optional(),
    grade: englishGradeSchema.nullable().optional(),
    source: englishPassageSourceSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 1);
export type EnglishPassageUpdate = z.infer<typeof englishPassageUpdateSchema>;
export const englishPassageArchiveSchema = z.strictObject({ revision });
export const englishPassageRightsConfirmSchema = z.strictObject({
  revision,
  basis: z.string().trim().min(1).max(2000),
  allowedUses: z
    .array(englishPassagePurposeSchema)
    .min(1)
    .max(2)
    .refine((values) => new Set(values).size === values.length),
});
export const englishPassageImportSchema = z
  .strictObject({
    clientKey: uuidSchema,
    kind: z.enum(["material", "set"]),
    id: uuidSchema,
    /** Set imports must explicitly choose generated passage or recorded original source. */
    textKind: z.enum(["passage", "sourcePassage"]).optional(),
    title: title.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "set" && !value.textKind)
      ctx.addIssue({
        code: "custom",
        path: ["textKind"],
        message: "가져올 원문을 선택해 주세요.",
      });
    if (value.kind === "material" && value.textKind)
      ctx.addIssue({
        code: "custom",
        path: ["textKind"],
        message: "자료에는 지문 종류를 지정하지 않습니다.",
      });
  });
export type EnglishPassageImport = z.infer<typeof englishPassageImportSchema>;
export const englishPassageQuerySchema = z.strictObject({
  q: z.string().trim().max(200).default(""),
  grade: englishGradeSchema.optional(),
  source: z.string().trim().max(255).optional(),
  archived: z.enum(["false", "true"]).default("false"),
  cursor: z.string().max(1000).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const englishPassageSummarySchema = z.strictObject({
  id: uuidSchema,
  title,
  grade: englishGradeSchema.nullable(),
  source: englishPassageSourceSchema,
  revision,
  textRevision: revision,
  textLength: z.number().int().min(1).max(ENGLISH_BANK_TEXT_MAX),
  snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
  rights: englishPassageRightsSchema,
  archivedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type EnglishPassageSummary = z.infer<typeof englishPassageSummarySchema>;
export const englishPassageUseSchema = z.strictObject({
  setId: uuidSchema,
  examId: uuidSchema,
  title: z.string(),
  textRevision: revision,
  snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
  sourceSnapshot: englishPassageSourceSchema,
  textSnapshot: text,
  createdAt: isoDateTimeSchema,
});
export const englishPassageDetailSchema = englishPassageSummarySchema.extend({
  text,
  importedFrom: z
    .strictObject({
      kind: z.enum(["material", "set"]),
      id: uuidSchema,
      textKind: z.enum(["passage", "sourcePassage"]).optional(),
    })
    .nullable(),
  usages: z.array(englishPassageUseSchema),
});
export type EnglishPassageDetail = z.infer<typeof englishPassageDetailSchema>;
export const englishBankMakerSeedSchema = z.strictObject({
  requestId: uuidSchema,
  examId: uuidSchema,
  path: englishBankPathSchema,
  passageRef: englishPassageRefSchema,
  title,
  text,
});
export type EnglishBankMakerSeed = z.infer<typeof englishBankMakerSeedSchema>;
export const englishPassagePrepareSchema = z.strictObject({
  examId: uuidSchema,
  path: englishBankPathSchema,
  textRevision: revision,
});
export const englishPassageResponseSchema = dataResponseSchema(
  englishPassageDetailSchema,
);
export const englishPassageWriteResponseSchema = z.strictObject({
  data: englishPassageDetailSchema,
  meta: z.strictObject({
    replayed: z.boolean(),
    duplicateIds: z.array(uuidSchema),
  }),
});
export const englishPassageListResponseSchema = z.strictObject({
  data: z.array(englishPassageSummarySchema),
  meta: z.strictObject({ nextCursor: z.string().nullable() }),
});
export const englishPassageUsesResponseSchema = dataResponseSchema(
  z.array(englishPassageUseSchema),
);
export const englishPassagePrepareResponseSchema = dataResponseSchema(
  englishBankMakerSeedSchema,
);

export const englishListeningBankQuerySchema = z.strictObject({
  q: z.string().trim().max(200).default(""),
  level: z.string().trim().max(80).optional(),
  cursor: z.string().max(1000).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
/** Official catalog supports year/round; own listening drafts do not. */
export const englishListeningReferenceQuerySchema =
  englishListeningBankQuerySchema.extend({
    year: z.coerce.number().int().min(1900).max(2200).optional(),
    round: z.coerce.number().int().min(1).max(10).optional(),
  });
export const englishListeningBankSummarySchema = z.strictObject({
  id: uuidSchema,
  revision,
  title: z.string(),
  level: z.string().nullable(),
  groupCount: z.number().int().min(0),
  publicationCount: z.number().int().min(0),
  updatedAt: isoDateTimeSchema,
});
export type EnglishListeningBankSummary = z.infer<
  typeof englishListeningBankSummarySchema
>;
export const englishListeningBankResponseSchema = z.strictObject({
  data: z.array(englishListeningBankSummarySchema),
  meta: z.strictObject({ nextCursor: z.string().nullable() }),
});
export const englishListeningReferenceSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  school: z.enum(["middle", "high"]),
  grade: z.number().int().min(1).max(3),
  year: z.number().int(),
  round: z.number().int(),
  provider: z.string(),
  sourceUrl: z.url(),
  reuseStatus: z.literal("permission-required"),
  hosted: z.literal(false),
});
export type EnglishListeningReference = z.infer<
  typeof englishListeningReferenceSchema
>;
export const englishListeningReferencesResponseSchema = z.strictObject({
  data: z.array(englishListeningReferenceSchema),
  meta: z.strictObject({ nextCursor: z.string().nullable() }),
});
