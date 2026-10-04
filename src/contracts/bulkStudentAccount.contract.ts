import { z } from "zod";
import { dataResponseSchema, uuidSchema } from "./common.contract";

/** Both preview and issuance return identifiers and reasons, never contact digits or passwords. */
export const bulkStudentAccountStatusSchema = z.enum([
  "ready",
  "issued",
  "existing",
  "missing_phone",
  "duplicate_name",
  "invalid_name",
]);
export const bulkStudentAccountResultSchema = z.strictObject({
  studentId: uuidSchema,
  name: z.string(),
  loginId: z.string().nullable(),
  status: bulkStudentAccountStatusSchema,
});
export const bulkStudentAccountResponseSchema = dataResponseSchema(
  z.strictObject({
    classId: uuidSchema,
    className: z.string(),
    total: z.number().int().nonnegative(),
    ready: z.number().int().nonnegative(),
    issued: z.number().int().nonnegative(),
    existing: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    students: z.array(bulkStudentAccountResultSchema),
  }),
);
export type BulkStudentAccountStatus = z.infer<
  typeof bulkStudentAccountStatusSchema
>;
export type BulkStudentAccountResult = z.infer<
  typeof bulkStudentAccountResultSchema
>;
export type BulkStudentAccountSummary = z.infer<
  typeof bulkStudentAccountResponseSchema
>["data"];
