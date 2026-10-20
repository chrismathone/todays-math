import { z } from "zod";
import { classListResponseSchema } from "./class.contract";

/** Optional first page, scoped by the verified teaching session; a failed list stays local. */
export const teachingClassesSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("ready"), page: classListResponseSchema }),
  z.strictObject({ status: z.literal("error") }),
]);
export type TeachingClasses = z.infer<typeof teachingClassesSchema>;
