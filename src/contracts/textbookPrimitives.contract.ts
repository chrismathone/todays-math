import { z } from "zod";

/** Exchange IDs also cover imported source IDs. Live database IDs use uuidSchema. */
export const textbookIdSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/);
export const textbookKeySchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9가-힣][A-Za-z0-9가-힣_.:-]*$/);
export const textbookHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const textbookDateSchema = z.iso.datetime({ offset: true });
export const textbookTextSchema = z.string().max(100_000);
export const textbookTitleSchema = z.string().min(1).max(120);
export const textbookRevisionSchema = z
  .number()
  .int()
  .min(1)
  .max(Number.MAX_SAFE_INTEGER);
export const textbookFormSchema = z.enum([
  "recall",
  "term",
  "cloze",
  "map",
  "figure",
]);
export const textbookLevelSchema = z.enum(["하", "중", "상"]);
export const textbookEntryKindSchema = z.enum([
  "concept",
  "ox",
  "apply",
  "figure",
]);
export const textbookVersion = "injaewon.textbook.exchange.v1" as const;
export const textbookCanonicalizationVersion =
  "injaewon.textbook.c14n.v1" as const;

export const textbookIssueSchema = z.strictObject({
  code: z.string().min(1).max(100),
  severity: z.enum(["error", "warning", "info"]),
  message: z.string().min(1).max(2000),
  path: z.array(z.union([z.string(), z.number().int().nonnegative()])),
  itemId: textbookIdSchema.optional(),
  sectionId: textbookIdSchema.optional(),
  physicalPageIndex: z.number().int().positive().optional(),
});
export type TextbookIssue = z.infer<typeof textbookIssueSchema>;
