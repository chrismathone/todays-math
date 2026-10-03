import { z } from "zod";
import { textbookConceptTargetSchema } from "./textbookConcept.contract";

export const textbookConceptTargetQuerySchema = z.strictObject({
  namespace: z
    .enum(["explorer-card", "course-section", "graph-unit"])
    .optional(),
  q: z.string().max(200).optional(),
  cursor: z
    .string()
    .regex(/^(0|[1-9]\d{0,6})$/)
    .optional(),
  limit: z
    .string()
    .regex(/^[1-9]\d{0,2}$/)
    .refine((value) => Number(value) <= 200)
    .optional(),
});

/** These are selectable sources, not confirmed equivalence or prerequisite edges. */
export const textbookConceptTargetCatalogSchema = z.strictObject({
  entries: z
    .array(
      z.strictObject({
        target: textbookConceptTargetSchema,
        title: z.string().min(1).max(500),
        context: z.string().max(1000),
        description: z.string().max(20000),
      }),
    )
    .max(200),
  nextCursor: z.string().regex(/^\d+$/).nullable(),
});

export type TextbookConceptTargetCatalog = z.infer<
  typeof textbookConceptTargetCatalogSchema
>;
