/** Existing saved V1 questions, projected without copying sets or changing their content. */
import { z } from "zod";

import {
  dataResponseSchema,
  isoDateTimeSchema,
  uuidSchema,
} from "./common.contract";
import {
  ENGLISH_PASSAGE_MAX,
  englishDifficultySchema,
  englishGradeSchema,
  englishQuestionSchema,
  englishQuestionTypeSchema,
  englishSetSourceSchema,
  englishSetStatusSchema,
  type EnglishQuestion,
} from "./english.contract";

export const ENGLISH_BANK_PAGE_MAX = 10_000;
export const ENGLISH_BANK_PAGE_SIZE_MAX = 50;
export const ENGLISH_BANK_RESOLVE_MAX = 80;
export const ENGLISH_BANK_BODY_MAX_BYTES = 16 * 1024;
export const ENGLISH_BANK_QUERY_MAX_BYTES = 4096;

export type EnglishDifficulty = z.infer<typeof englishDifficultySchema>;
const revisionSchema = z.number().int().min(1).max(2_147_483_647);
const indexSchema = z.number().int().min(0).max(2_147_483_647);

// The write schema trims strings. Validate its strict V1 shape but return the saved
// strings verbatim: reading a bank question must not rewrite whitespace or drop fields.
const savedQuestionSchema = z.custom<EnglishQuestion>(
  (value) => englishQuestionSchema.safeParse(value).success,
  "저장된 문항 형식을 읽을 수 없습니다.",
);

export const englishBankQuestionSchema = z
  .strictObject({
    key: z.string().min(1),
    setId: uuidSchema,
    questionIndex: indexSchema,
    revision: revisionSchema,
    examId: uuidSchema,
    school: z.string().min(1).max(80),
    grade: englishGradeSchema,
    examTitle: z.string().min(1).max(100),
    title: z.string().min(1).max(160),
    status: englishSetStatusSchema,
    source: englishSetSourceSchema,
    passage: z.string().min(1).max(ENGLISH_PASSAGE_MAX),
    question: savedQuestionSchema,
    difficulty: englishDifficultySchema.nullable(),
    updatedAt: isoDateTimeSchema,
  })
  .refine(
    (item) =>
      item.key === `${item.setId}:${item.revision}:${item.questionIndex}`,
    { path: ["key"], message: "문항 키가 현재 세트와 일치하지 않습니다." },
  );
export type EnglishBankQuestion = z.infer<typeof englishBankQuestionSchema>;

const pageNumber = (max: number, fallback: number) =>
  z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(max))
    .default(fallback);

export const englishQuestionBankQuerySchema = z.strictObject({
  q: z.string().max(200).trim().optional(),
  grade: englishGradeSchema.optional(),
  type: englishQuestionTypeSchema.optional(),
  status: englishSetStatusSchema.optional(),
  examId: uuidSchema.optional(),
  page: pageNumber(ENGLISH_BANK_PAGE_MAX, 1),
  pageSize: pageNumber(ENGLISH_BANK_PAGE_SIZE_MAX, 20),
});
export type EnglishQuestionBankQuery = z.infer<
  typeof englishQuestionBankQuerySchema
>;

export const englishQuestionBankResponseSchema = dataResponseSchema(
  z.strictObject({
    items: z.array(englishBankQuestionSchema).max(ENGLISH_BANK_PAGE_SIZE_MAX),
    total: z.number().int().min(0),
    page: z.number().int().min(1).max(ENGLISH_BANK_PAGE_MAX),
    pageSize: z.number().int().min(1).max(ENGLISH_BANK_PAGE_SIZE_MAX),
  }),
);
export type EnglishQuestionBankResponse = z.infer<
  typeof englishQuestionBankResponseSchema
>;

export const englishQuestionBankReferenceSchema = z.strictObject({
  setId: uuidSchema.transform((id) => id.toLowerCase()),
  revision: revisionSchema,
  questionIndex: indexSchema,
});
export const englishQuestionBankResolveRequestSchema = z
  .strictObject({
    items: z
      .array(englishQuestionBankReferenceSchema)
      .min(1)
      .max(ENGLISH_BANK_RESOLVE_MAX),
  })
  .refine(
    ({ items }) =>
      new Set(
        items.map(
          (item) => `${item.setId}:${item.revision}:${item.questionIndex}`,
        ),
      ).size === items.length,
    { path: ["items"], message: "같은 문항이 두 번 들어 있습니다." },
  );
export type EnglishQuestionBankResolveRequest = z.infer<
  typeof englishQuestionBankResolveRequestSchema
>;
export const englishQuestionBankResolveResponseSchema = dataResponseSchema(
  z.array(englishBankQuestionSchema).max(ENGLISH_BANK_RESOLVE_MAX),
);
export type EnglishQuestionBankResolveResponse = z.infer<
  typeof englishQuestionBankResolveResponseSchema
>;
