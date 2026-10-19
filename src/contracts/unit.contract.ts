/**
 * 교육과정 단원 목록 — S-04 확인테스트 범위 선택.
 * GET /api/units
 */
import { z } from "zod";

import { dataResponseSchema, uuidSchema } from "./common.contract";

export const unitSchema = z.strictObject({
  id: uuidSchema,
  grade: z.string().min(1),
  chapter: z.string().min(1),
  section: z.string().min(1),
  orderIndex: z.number().int(),
});
export type UnitEntity = z.infer<typeof unitSchema>;

/** Current problem cards need their own unit labels, not the whole catalogue. */
export const unitIdsParamSchema = z.string()
  .transform((value) => [...new Set(value.split(","))])
  .pipe(z.array(uuidSchema).min(1).max(1000));

export const unitListResponseSchema = dataResponseSchema(z.array(unitSchema));
export type UnitListResponse = z.infer<typeof unitListResponseSchema>;
