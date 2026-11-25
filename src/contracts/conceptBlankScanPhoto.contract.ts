import { z } from "zod";

const point = z.strictObject({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
});
/** No coordinate fields are legal in the fallback. A client cannot retain stale overlays. */
export const scanRegistrationSchema = z.discriminatedUnion("status", [
  z.strictObject({
    version: z.literal(1),
    status: z.literal("uncertain"),
    reason: z.string().min(1).max(240),
  }),
  z.strictObject({
    version: z.literal(1),
    status: z.literal("matched"),
    transform: z.array(z.number().finite()).length(9),
    qrErrorMm: z.number().finite().nonnegative(),
    slots: z
      .array(
        z.strictObject({
          slotId: z.string().min(1).max(240),
          points: z.array(point).length(4),
        }),
      )
      .max(8000),
  }),
]);
export type ScanRegistration = z.infer<typeof scanRegistrationSchema>;
