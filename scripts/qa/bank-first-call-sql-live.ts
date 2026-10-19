/**
 * READ ONLY PostgreSQL probe. Settings are transaction-local; no shared DDL/DML.
 * node_modules/.bin/tsx --conditions=react-server scripts/qa/bank-first-call-sql-live.ts OUTPUT.json
 * BANK_SQL_ROUNDS=1..5, BANK_SQL_WORK_MEM=default,16MB,64MB,
 * BANK_SQL_BASELINE_ONLY=1 for the initial settings experiment.
 */
import { writeFile } from "node:fs/promises";
import { Prisma, PrismaClient } from "@prisma/client";
import * as current from "../../src/lib/problem/questionCountSql";
import {
  bytesOf,
  countRowDiagnostics,
  frozenCountSql,
  loadProbeEnvironment,
  planSummary,
  queries,
  readOnlyGuard,
  readProbeScope,
  safeError,
  selectOnly,
  workingCountSqlSha256,
} from "./bank-first-call-sql-support";

async function main() {
  const output = process.argv[2];
  if (!output) throw new Error("OUTPUT_REQUIRED");
  const rounds = Number(process.env.BANK_SQL_ROUNDS ?? 3);
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 5)
    throw new Error("INVALID_ROUNDS");
  const settings = (process.env.BANK_SQL_WORK_MEM ?? "4MB,16MB,64MB").split(
    ",",
  );
  if (
    !settings.every((value) =>
      ["default", "4MB", "16MB", "32MB", "64MB"].includes(value),
    )
  )
    throw new Error("INVALID_WORK_MEM");
  loadProbeEnvironment();
  const db = new PrismaClient({ log: [] });
  const frozen = await frozenCountSql();
  try {
    const result = await db.$transaction(
      async (tx) => {
        const config = await readOnlyGuard(tx);
        // Same deterministic probe policy used in the previous R2 evidence.
        await tx.$executeRaw`SET LOCAL plan_cache_mode = 'force_custom_plan'`;
        if (process.env.BANK_SQL_NATIVE_PARALLEL !== "1")
          await tx.$executeRaw`SET LOCAL max_parallel_workers_per_gather = 0`;
        await tx.$executeRaw`SET LOCAL statement_timeout = '45s'`;
        const scope = await readProbeScope(tx);
        const [invalid] = await tx.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM public.problem WHERE pool='shared'
          AND (actual_format IS NULL OR actual_format_version IS DISTINCT FROM ${
            (await import("../../src/lib/problem/actualFormat"))
              .ACTUAL_FORMAT_VERSION
          })`;
        if (invalid.n) throw new Error("INVALID_FORMAT_FACTS");
        const indexes = await tx.$queryRaw<
          { tablename: string; indexname: string; indexdef: string }[]
        >`
        SELECT tablename,indexname,indexdef FROM pg_indexes
        WHERE schemaname='public' AND tablename IN ('problem','unit','source_material','source_book')
        ORDER BY tablename,indexname`;
        const versions = [
          { version: "before", queries: queries(frozen.module, tx, scope) },
          ...(process.env.BANK_SQL_BASELINE_ONLY === "1"
            ? []
            : [{ version: "after", queries: queries(current, tx, scope) }]),
        ];
        if (process.env.BANK_SQL_NAMES) {
          const names = process.env.BANK_SQL_NAMES.split(",");
          for (const version of versions)
            version.queries = version.queries.filter((query) =>
              names.includes(query.name),
            );
          if (versions.some((version) => !version.queries.length))
            throw new Error("QUERY_NAME_MISSING");
        }
        const reference = new Map<string, Buffer>();
        const referenceRows = new Map<string, unknown[]>();
        const samples: Record<string, unknown>[] = [];
        const plans: Record<string, unknown>[] = [];
        for (const workMem of settings) {
          await tx.$queryRaw`SELECT set_config('work_mem',${workMem === "default" ? config.workMem : workMem},true)`;
          for (let round = 1; round <= rounds; round++) {
            // Alternate order to avoid always warming the second implementation.
            for (const version of round % 2
              ? versions
              : [...versions].reverse()) {
              for (const { name, sql } of version.queries) {
                selectOnly(sql);
                const start = performance.now();
                const rows = await tx.$queryRaw<unknown[]>(sql);
                const ms = Number((performance.now() - start).toFixed(3));
                const bytes = bytesOf(rows);
                if (!reference.has(name)) {
                  reference.set(name, bytes.bytes);
                  referenceRows.set(name, rows);
                }
                const byteEqual = reference.get(name)!.equals(bytes.bytes);
                samples.push({
                  workMem,
                  round,
                  version: version.version,
                  name,
                  ms,
                  rows: rows.length,
                  bytes: bytes.length,
                  sha256: bytes.sha256,
                  byteEqual,
                  ...countRowDiagnostics(referenceRows.get(name)!, rows),
                });
                console.log(
                  `${workMem} ${round} ${version.version} ${name}: ${ms}ms parity=${byteEqual}`,
                );
                if (round === 1) {
                  const explain = await tx.$queryRaw<
                    { "QUERY PLAN": Record<string, unknown>[] }[]
                  >(Prisma.sql`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${sql}`);
                  const plan = explain[0]["QUERY PLAN"][0];
                  plans.push({
                    workMem,
                    version: version.version,
                    name,
                    ...planSummary(plan),
                    plan,
                  });
                }
              }
            }
          }
        }
        return {
          measuredAt: new Date().toISOString(),
          baseline: "5051fea68",
          baselineSqlSha256: frozen.sha256,
          workingSqlSha256: workingCountSqlSha256(),
          environment:
            "Shared PostgreSQL; one verified READ ONLY RepeatableRead snapshot; cache/connection/buffers not flushed; raw reader SQL only; auth/HTTP/rendering excluded.",
          config,
          probeParallel:
            process.env.BANK_SQL_NATIVE_PARALLEL === "1" ? "native" : "serial",
          scope: {
            grade: scope.grade,
            unitCount: scope.units.length,
            chapterUnitCount: scope.chapterUnits.length,
            material: !!scope.material,
            books: scope.books.length,
            materialPage: scope.materialPage.length,
          },
          indexes,
          samples,
          plans,
        };
      },
      { isolationLevel: "RepeatableRead", timeout: 600_000, maxWait: 20_000 },
    );
    await writeFile(output, JSON.stringify(result, null, 2) + "\n");
    if (result.samples.some((sample) => !sample.byteEqual))
      throw new Error("SQL_BYTE_PARITY_FAILED");
  } finally {
    await frozen.close();
    await db.$disconnect();
  }
}
if (process.argv[1]?.endsWith("bank-first-call-sql-live.ts"))
  main().catch((error) => {
    console.error(safeError(error));
    process.exitCode = 1;
  });
