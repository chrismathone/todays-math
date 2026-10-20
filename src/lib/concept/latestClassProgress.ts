import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** Same per-class LIMIT/order as /api/progress, in one database round trip. */
export function latestClassProgressSql(classIds: readonly string[]) {
  return Prisma.sql`/* concept-board-latest-progress */
    SELECT c.id::text AS "classId", p.unit_id::text AS "unitId",
      to_char(p.recorded_at, 'YYYY-MM-DD') AS "recordedAt"
    FROM jsonb_array_elements_text(${JSON.stringify(classIds)}::jsonb)
      WITH ORDINALITY AS c(id, position)
    CROSS JOIN LATERAL (
      SELECT unit_id, recorded_at FROM progress
      WHERE class_id = c.id::uuid AND student_id IS NULL AND retired_at IS NULL
      ORDER BY recorded_at DESC, created_at DESC LIMIT 1
    ) p
    ORDER BY c.position`;
}

export type LatestClassProgress = {
  classId: string;
  unitId: string;
  recordedAt: string;
};

export async function loadLatestClassProgress(classIds: readonly string[]) {
  return classIds.length
    ? db.$queryRaw<LatestClassProgress[]>(latestClassProgressSql(classIds))
    : [];
}
