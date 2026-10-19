/** SELECT/EXPLAIN only, in a verified READ ONLY snapshot. No row bodies leave DB. */
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { Prisma, PrismaClient } from "@prisma/client";
import { readOnly } from "../db/problem-actual-format";
import { heldQuestionSourceGroupsSql } from "../../src/lib/problem/questionHeldSourceSql";
import { questionCountsSql, type CountBucket } from "../../src/lib/problem/questionCountSql";
import { verifyFormatScope } from "../../src/lib/problem/actualFormat";
import { problemVisibleWhere } from "../../src/lib/problemPool";
import { BANK_SOURCE_GROUPS, type BankSourceCounts } from "../../src/contracts/bankSource.contract";

async function main() {
  const db = new PrismaClient({ log: [] });
  try {
    const result = await readOnly(db, async (tx) => {
      const formats = new Map<string, string>();
      verifyFormatScope(formats, tx, problemVisibleWhere());
      const before = questionCountsSql(problemVisibleWhere(), ["source"], undefined, formats, tx, false)!;
      const after = heldQuestionSourceGroupsSql();
      const samples = [];
      for (let round = 1; round <= 3; round++) {
        const started = performance.now();
        const old = await tx.$queryRaw<CountBucket[]>(before);
        const oldMs = Number((performance.now() - started).toFixed(3));
        const expected = { total: old.find((row) => row.axis === "all")?.held ?? 0,
          ...Object.fromEntries(BANK_SOURCE_GROUPS.map((group) => [group, old.find((row) => row.axis === "source" && row.key === group)?.held ?? 0])) };
        const nextStarted = performance.now();
        const [current] = await tx.$queryRaw<BankSourceCounts["sources"][]>(after);
        const ms = Number((performance.now() - nextStarted).toFixed(3));
        const bytes = Buffer.from(JSON.stringify(current));
        const equal = bytes.equals(Buffer.from(JSON.stringify(expected)));
        if (!equal) throw new Error("HELD_SOURCE_BYTES_CHANGED");
        samples.push({ round, beforeMs: oldMs, afterMs: ms, bytesEqual: equal, sha256: createHash("sha256").update(bytes).digest("hex") });
        console.log(`${round}/3 groups held only: ${oldMs} -> ${ms}ms; bytes=${equal}`);
      }
      const plans = [];
      for (const [name, sql] of [["before", before], ["after", after]] as [string, Prisma.Sql][]) {
        const plan = await tx.$queryRaw(Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
        plans.push({ name, plan });
      }
      return { measuredAt: new Date().toISOString(), readOnly: true, timing: "SQL + network only; excludes fingerprint/transaction/auth/HTTP", samples, plans };
    });
    await writeFile(process.argv[2] ?? "docs/planning/tracks/reports/bank-first-call-held-source-live-20261019.json", JSON.stringify(result, null, 2) + "\n");
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("HELD_SOURCE_MEASURE_FAILED (connection/error details omitted)"); process.exitCode = 1; });
