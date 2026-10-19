/** Inspect the installed Prisma client's DISTINCT vs DB GROUP BY. READ ONLY.
 * Unit labels only; no accounts, problem content, credentials, or shared writes.
 */
import { writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

async function main() {
  const sql: string[] = [];
  const db = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
  db.$on("query", (event) => { sql.push(event.query); });
  try {
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const [proof] = await tx.$queryRaw<{ readOnly: string }[]>`SELECT current_setting('transaction_read_only') AS "readOnly"`;
      if (proof.readOnly !== "on") throw new Error("READ_ONLY_GUARD");
      const old = await tx.unit.findMany({ select: { grade: true }, distinct: ["grade"], orderBy: { grade: "asc" } });
      const oldSql = sql.at(-1)!;
      const current = await tx.unit.groupBy({ by: ["grade"], _min: { orderIndex: true }, orderBy: { _min: { orderIndex: "asc" } } });
      const currentSql = sql.at(-1)!;
      const valuesEqual = JSON.stringify(old.map((r) => r.grade).sort()) === JSON.stringify(current.map((r) => r.grade).sort());
      if (!valuesEqual || /\bDISTINCT\b|\bGROUP BY\b/.test(oldSql) || !/\bGROUP BY\b/.test(currentSql)) throw new Error("METADATA_SQL_EXPECTATION_CHANGED");
      // Query text comes exclusively from the two generated, unfiltered SELECTs.
      const plans = [];
      for (const query of [oldSql, currentSql]) {
        if (!/^\s*SELECT\b/.test(query) || /\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|CALL|COPY)\b/i.test(query)) throw new Error("SELECT_GUARD");
        plans.push(await tx.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`, 0));
      }
      return { measuredAt: new Date().toISOString(), readOnly: true, valuesEqual, oldResultRows: old.length, currentResultRows: current.length,
        oldSql, currentSql, plans, note: "Generated SQL and EXPLAIN reveal database rows before Prisma in-memory distinct; no question/body reads." };
    }, { isolationLevel: "RepeatableRead", timeout: 30000, maxWait: 10000 });
    await writeFile(process.argv[2] ?? "docs/planning/tracks/reports/bank-first-call-curriculum-metadata-20261019.json", JSON.stringify(result, null, 2) + "\n");
    console.log(`READ ONLY metadata rows: ${result.oldResultRows}/${result.currentResultRows}; GROUP BY verified`);
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("METADATA_PROBE_FAILED (connection/error details omitted)"); process.exitCode = 1; });
