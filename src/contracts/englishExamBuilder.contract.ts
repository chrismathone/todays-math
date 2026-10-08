import { z } from "zod";
import { dataResponseSchema, uuidSchema } from "./common.contract";
import {
  englishDifficultySchema,
  englishGradeSchema,
} from "./english.contract";
import {
  englishBankQuestionSchema,
  englishQuestionBankReferenceSchema,
} from "./englishQuestionBank.contract";

const scopeIds = z
  .array(uuidSchema.transform((id) => id.toLowerCase()))
  .min(1)
  .max(80)
  .refine((ids) => new Set(ids).size === ids.length, "범위가 중복되었습니다.");
export const englishExamCandidatesSchema = z.strictObject({
  scopeIds,
  difficulty: z
    .union([englishDifficultySchema, z.literal("미지정")])
    .optional(),
  query: z.string().trim().max(200).default(""),
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
  exclude: z.array(englishQuestionBankReferenceSchema).max(80).default([]),
});
export type EnglishExamCandidates = z.infer<typeof englishExamCandidatesSchema>;
export const englishExamComposeSchema = z
  .strictObject({
    allocations: z
      .array(
        z.strictObject({
          scopeId: uuidSchema.transform((id) => id.toLowerCase()),
          count: z.number().int().min(1).max(80),
        }),
      )
      .min(1)
      .max(80),
  })
  .refine(
    ({ allocations }) =>
      allocations.reduce((n, a) => n + a.count, 0) <= 80 &&
      new Set(allocations.map((a) => a.scopeId)).size === allocations.length,
    "최대 80문항이며 같은 범위는 한 번만 지정할 수 있습니다.",
  );
export type EnglishExamCompose = z.infer<typeof englishExamComposeSchema>;
export const englishExamScopeResponseSchema = dataResponseSchema(
  z.strictObject({
    items: z
      .array(
        z.strictObject({
          id: uuidSchema,
          label: z.string(),
          group: englishGradeSchema,
          detail: z.string(),
          count: z.number().int().min(0),
        }),
      )
      .max(100),
    total: z.number().int().min(0),
  }),
);
export const englishExamCandidatesResponseSchema = dataResponseSchema(
  z.strictObject({
    items: z.array(englishBankQuestionSchema).max(50),
    total: z.number().int().min(0),
  }),
);
