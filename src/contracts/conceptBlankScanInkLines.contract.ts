import { z } from "zod";
import { scanBoxSchema } from "./conceptBlankScanIssued.contract";

export const scanInkLinesSchema = z.strictObject({
  status: z.enum(["ok", "unreliable"]),
  lines: z.array(
    z.strictObject({
      box: scanBoxSchema,
      inkRatio: z.number().min(0).max(1),
    }),
  ),
  emptyLines: z.array(scanBoxSchema.pick({ y: true, height: true })),
  reason: z.string().optional(),
});

export type ScanInkLines = z.infer<typeof scanInkLinesSchema>;
