import { z } from "zod";
import {
  applyItemSchema,
  conceptBlankSelectionSchema,
  conceptEntrySchema,
  figureItemSchema,
  oxItemSchema,
  sectionKeySchema,
  type ConceptBlankSheet,
} from "./conceptBlank.contract";
import {
  textbookFormSchema,
  textbookHashSchema,
  textbookKeySchema,
  textbookTitleSchema,
} from "./textbookPrimitives.contract";

const headerSchema = z.strictObject({
  title: textbookTitleSchema,
  unitLabel: z.string().max(300),
  date: conceptBlankSelectionSchema.shape.date.unwrap().nullable(),
  form: textbookFormSchema,
});
const entryOrderSchema = z.strictObject({
  entryKind: z.enum(["concept", "ox", "apply"]),
  entryId: conceptEntrySchema.shape.id,
});

/** Wire shape of the existing paper model; entry validation remains in conceptBlank.contract. */
export const textbookBlankSheetSchema = z
  .discriminatedUnion("form", [
    z.strictObject({
      form: z.literal("recall"),
      header: headerSchema,
      zones: z
        .array(
          z.strictObject({
            section: sectionKeySchema,
            title: textbookTitleSchema,
            hint: z.string().max(1000),
            side: z.enum(["그림", "예"]),
          }),
        )
        .min(1)
        .max(60),
      key: z.array(conceptEntrySchema).min(1).max(2000),
      omittedCases: z.literal(0).optional(),
    }),
    z.strictObject({
      form: z.literal("term"),
      header: headerSchema,
      terms: z.array(conceptEntrySchema).max(2000),
      ox: z.array(oxItemSchema).max(2000),
      entryOrder: z
        .array(
          entryOrderSchema.extend({ entryKind: z.enum(["concept", "ox"]) }),
        )
        .min(1)
        .max(2000),
    }),
    z.strictObject({
      form: z.literal("cloze"),
      header: headerSchema,
      sentences: z.array(conceptEntrySchema).max(2000),
      apply: z.array(applyItemSchema).max(2000),
      entryOrder: z
        .array(
          entryOrderSchema.extend({ entryKind: z.enum(["concept", "apply"]) }),
        )
        .min(1)
        .max(2000),
    }),
    z.strictObject({
      form: z.literal("map"),
      header: headerSchema,
      questionMode: z.literal(true).optional(),
      maps: z
        .array(
          z.strictObject({
            hub: textbookTitleSchema,
            nodes: z.array(conceptEntrySchema).min(1).max(6),
          }),
        )
        .min(1)
        .max(2000),
    }),
    z.strictObject({
      form: z.literal("figure"),
      header: headerSchema,
      figures: z.array(figureItemSchema).min(1).max(2000),
    }),
  ])
  .refine((sheet) => sheet.form === sheet.header.form, {
    message: "지면과 머리말의 백지 형식이 다릅니다.",
    path: ["header", "form"],
  }) satisfies z.ZodType<ConceptBlankSheet>;

/** Teacher-only exact preview. A current hash describes this in-memory composition, not a publication. */
export const textbookBlankResultSchema = z.strictObject({
  editionId: z.uuid(),
  conceptKey: textbookKeySchema,
  source: z.enum(["current", "frozen"]),
  contentHash: textbookHashSchema,
  selection: conceptBlankSelectionSchema.safeExtend({
    pick: conceptBlankSelectionSchema.shape.pick.unwrap(),
  }),
  sheets: z.array(textbookBlankSheetSchema).min(1).max(300),
  sheetCode: z.null(),
});
export const textbookBlankResponseSchema = z.strictObject({
  data: textbookBlankResultSchema,
});
export type TextbookBlankResult = z.infer<typeof textbookBlankResultSchema>;
export type TextbookBlankResponse = z.infer<typeof textbookBlankResponseSchema>;
