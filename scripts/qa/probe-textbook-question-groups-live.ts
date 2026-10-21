/** SELECT only, in a verified READ ONLY snapshot. Counts only; no row bodies leave the DB. */
import { PrismaClient } from "@prisma/client";
import { readOnly, safeCode } from "../db/problem-actual-format";

async function main() {
  const db = new PrismaClient({ log: [] });
  try {
    const result = await readOnly(db, async (tx) => {
      const [spans] = await tx.$queryRaw<Record<string, number>[]>`
        WITH t AS (
          SELECT COALESCE(p.question_group_key, 'row:' || p.id::text) AS q, p.question_group_key AS k,
                 p.source_material_id AS mid, m.book_id AS bid, m.kind AS kind
          FROM public.problem p
          LEFT JOIN public.source_material m ON m.id = p.source_material_id
          WHERE p.pool = 'shared' AND p.source = 'school_textbook'
        ), g AS (
          SELECT q, count(*) AS n_rows, count(DISTINCT bid) AS n_books, count(DISTINCT kind) AS n_kinds,
                 count(DISTINCT mid) AS n_materials, count(DISTINCT (bid, kind)) AS n_book_kinds,
                 bool_or(mid IS NULL) AS has_null_material, bool_or(mid IS NOT NULL) AS has_material
          FROM t GROUP BY q
        )
        SELECT
          (SELECT count(*) FROM t)::int AS "textbookRows",
          (SELECT count(*) FROM t WHERE k IS NOT NULL)::int AS "rowsWithGroupKey",
          count(*)::int AS "questions",
          count(*) FILTER (WHERE n_rows > 1)::int AS "multiRowQuestions",
          count(*) FILTER (WHERE n_books > 1)::int AS "questionsSpanningBooks",
          count(*) FILTER (WHERE n_kinds > 1)::int AS "questionsSpanningKinds",
          count(*) FILTER (WHERE n_book_kinds > 1)::int AS "questionsSpanningBookKinds",
          count(*) FILTER (WHERE n_materials > 1)::int AS "questionsSpanningMaterials",
          count(*) FILTER (WHERE has_null_material AND has_material)::int AS "questionsHalfMaterial",
          count(*) FILTER (WHERE NOT has_material)::int AS "questionsWithoutMaterial"
        FROM g`;
      // A group key shared between a textbook row and a row of another source.
      const [cross] = await tx.$queryRaw<Record<string, number>[]>`
        SELECT count(*)::int AS "groupsMixingSources" FROM (
          SELECT p.question_group_key FROM public.problem p
          WHERE p.pool = 'shared' AND p.question_group_key IS NOT NULL
          GROUP BY p.question_group_key
          HAVING bool_or(p.source = 'school_textbook') AND bool_or(p.source <> 'school_textbook')
        ) x`;
      return {
        measuredAt: new Date().toISOString(),
        readOnly: true,
        ...spans,
        ...cross,
      };
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(`PROBE_FAILED ${safeCode(error)}`);
  process.exitCode = 1;
});
