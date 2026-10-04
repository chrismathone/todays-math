import { z } from "zod";
import { dataResponseSchema, uuidSchema } from "./common.contract";

const grade = z.number().int().min(3).max(9);
const unitId = z.string().min(1).max(200);
export const explorerSettingsInputSchema = z.strictObject({
  expectedRevision: z.number().int().nonnegative(),
  courseGrade: grade,
  goalUnitId: unitId,
});
export type ExplorerSettingsInput = z.infer<typeof explorerSettingsInputSchema>;
export const explorerSettingsSchema = z.strictObject({
  studentId: uuidSchema,
  revision: z.number().int().nonnegative(),
  courseGrade: grade,
  goalUnitId: unitId.nullable(),
  locked: z.boolean(),
  units: z
    .array(z.strictObject({ id: unitId, grade, title: z.string().max(200) }))
    .max(46),
});
export type ExplorerSettings = z.infer<typeof explorerSettingsSchema>;
export const explorerSettingsResponseSchema = dataResponseSchema(
  explorerSettingsSchema,
);
