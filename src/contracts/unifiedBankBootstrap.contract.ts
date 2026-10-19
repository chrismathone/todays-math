import { z } from "zod";
import { uuidSchema } from "./common.contract";
import { unitSchema } from "./unit.contract";
import { questionReadMetadataSchema } from "./questionFormats.contract";

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
