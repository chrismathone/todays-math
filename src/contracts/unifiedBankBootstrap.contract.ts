import { z } from "zod";
import { uuidSchema } from "./common.contract";
import { unitSchema } from "./unit.contract";
import { questionReadMetadataSchema } from "./questionFormats.contract";
import {
  bankSourceBookSchema,
  bankSourceCountsSchema,
  bankSourceMaterialSchema,
} from "./bankSource.contract";

/** Unfiltered shared-bank metadata; no problem bodies or account-specific reads. */
export const unifiedBankBootstrapSchema = questionReadMetadataSchema.extend({
  problems: z.array(z.never()),
  total: z.number().int().nonnegative(),
  page: z.literal(1),
  pageSize: z.literal(12),
  grades: z.array(
    z.strictObject({
      grade: z.string().min(1),
      count: z.number().int().nonnegative(),
    }),
  ),
  chapters: z.array(z.string()),
  units: z.array(unitSchema),
  unitCounts: z.record(uuidSchema, z.number().int().nonnegative()),
});

/** Curriculum navigation reads no problem inventory or account data. */
export const unifiedBankCurriculumQuerySchema = z
  .strictObject({
    identity: z.literal("question"),
    view: z.literal("curriculum"),
    grade: z.string().trim().min(1).max(100).optional(),
    chapter: z.string().trim().min(1).max(200).optional(),
    unitIds: z
      .string()
      .transform((value) => [...new Set(value.split(","))])
      .pipe(z.array(uuidSchema).min(1).max(1000))
      .optional(),
  })
  .refine((value) => !value.chapter || !!value.grade)
  .refine((value) => !value.unitIds || (!value.grade && !value.chapter));

export const unifiedBankCurriculumSchema = z.strictObject({
  view: z.literal("curriculum"),
  grades: z.array(z.string().min(1)),
  chapters: z.array(z.string().min(1)),
  units: z.array(unitSchema),
});
export type UnifiedBankCurriculum = z.infer<typeof unifiedBankCurriculumSchema>;

/** Only explicitly requested lessons; no global source/difficulty/book facets. */
export const unifiedBankScopeCountsSchema = questionReadMetadataSchema.extend({
  view: z.literal("scope-counts"),
  unitCounts: z.record(uuidSchema, z.number().int().nonnegative()),
  unitFamilies: z.record(uuidSchema, z.number().int().nonnegative()),
});
export type UnifiedBankScopeCounts = z.infer<
  typeof unifiedBankScopeCountsSchema
>;

export const unifiedBankPickerGroupsSchema = questionReadMetadataSchema.extend({
  view: z.literal("picker-groups"),
  sources: bankSourceCountsSchema.shape.sources,
});
const pickerBookSchema = bankSourceBookSchema.pick({
  id: true,
  grade: true,
  publisher: true,
  author: true,
  title: true,
});
export type UnifiedBankPickerBook = z.infer<typeof pickerBookSchema>;
export const unifiedBankPickerBooksSchema = questionReadMetadataSchema.extend({
  view: z.literal("picker-books"),
  grades: z.array(z.string().min(1)),
  kinds: z.array(z.string().min(1)),
  books: z.array(pickerBookSchema),
});
export const unifiedBankPickerBookCountsSchema =
  questionReadMetadataSchema.extend({
    view: z.literal("picker-book-counts"),
    books: z.array(
      bankSourceBookSchema.pick({
        id: true,
        count: true,
        open: true,
        kinds: true,
      }),
    ),
  });
export type UnifiedBankPickerBookCounts = z.infer<
  typeof unifiedBankPickerBookCountsSchema
>;

export const unifiedBankMaterialsPageSchema = questionReadMetadataSchema.extend(
  {
    view: z.literal("materials-page"),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.literal(20),
    materials: z.array(bankSourceMaterialSchema).max(20),
    selectedAvailable: z.array(uuidSchema).max(300),
  },
);
