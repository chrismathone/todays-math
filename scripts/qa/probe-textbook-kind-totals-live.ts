/** SELECT only, in a verified READ ONLY snapshot — the source picker's global kind column (`picker-kind-counts`):
 * its SQL's time and that it equals the per-book `kinds` summed over every textbook book. Counts only.
 * node --env-file=<today_/.env> node_modules/tsx/dist/cli.mjs --conditions=react-server scripts/qa/probe-textbook-kind-totals-live.ts
 */
import { PrismaClient } from "@prisma/client";
import { readOnly, safeCode } from "../db/problem-actual-format";
import { heldQuestionTextbookKindsSql } from "../../src/lib/problem/questionHeldSourceSql";

async function main() {
  const db = new PrismaClient({ log: [] });
  try {
    const result = await readOnly(db, async (tx) => {
      const samples = [];
      let kinds: { kind: string; count: number }[] = [];
      for (let round = 1; round <= 3; round++) {
        const started = performance.now();
        kinds = await tx.$queryRaw<{ kind: string; count: number }[]>(
          heldQuestionTextbookKindsSql(),
        );
        samples.push(Number((performance.now() - started).toFixed(1)));
      }
      // Per-book kinds (the `picker-book-counts` meaning), summed over every textbook book.
      const perBook = await tx.$queryRaw<{ kind: string; count: number }[]>`
        SELECT kind, sum(n)::int AS count FROM (
          SELECT m.book_id, m.kind, count(DISTINCT COALESCE(p.question_group_key, 'row:' || p.id::text)) AS n
          FROM public.problem p
          JOIN public.source_material m ON m.id = p.source_material_id
          JOIN public.source_book b ON b.id = m.book_id AND b.kind = 'school_textbook'
          WHERE p.pool = 'shared' AND p.source = 'school_textbook'
          GROUP BY m.book_id, m.kind) x
        GROUP BY kind`;
      const sum = new Map(perBook.map((row) => [row.kind, row.count]));
      return {
        measuredAt: new Date().toISOString(),
        readOnly: true,
        sqlMs: samples,
        kinds,
        equalsSumOfBooks:
          kinds.length === perBook.length &&
          kinds.every((row) => sum.get(row.kind) === row.count),
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
