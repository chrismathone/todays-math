/**
 * Export only classification/order/eligibility metadata in a verified READ ONLY
 * snapshot. Rows never leave memory. DDL, VACUUM, indexes and revision triggers
 * below execute ONLY on a new local PGlite instance after shared disconnect.
 * node_modules/.bin/tsx --conditions=react-server scripts/qa/bank-first-call-sql-mirror.ts OUTPUT.json
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PrismaClient } from "@prisma/client";
import * as current from "../../src/lib/problem/questionCountSql";
import { bankReadFingerprintSql } from "../../src/lib/bankReadFingerprint";
import { MISSING_ANSWER } from "../../src/lib/missingAnswer";
import { ACTUAL_FORMAT_VERSION } from "../../src/lib/problem/actualFormat";
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

const quote = (text: string) => `"${text.replaceAll('"', '""')}"`;
const literal = (text: string) => `'${text.replaceAll("'", "''")}'`;

async function main() {
  const output = process.argv[2];
  if (!output) throw new Error("OUTPUT_REQUIRED");
  const rounds = Number(process.env.BANK_SQL_ROUNDS ?? 3);
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 5)
    throw new Error("INVALID_ROUNDS");
  loadProbeEnvironment();
  const db = new PrismaClient({ log: [] });
  const captured = await db.$transaction(
    async (tx) => {
      const config = await readOnlyGuard(tx);
      const scope = await readProbeScope(tx);
      const enums = await tx.$queryRaw<{ name: string; labels: string[] }[]>`
      SELECT t.typname AS name,array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
      FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace
      WHERE n.nspname='public' GROUP BY t.typname ORDER BY t.typname`;
      const columns = await tx.$queryRaw<
        { table: string; name: string; type: string }[]
      >`
      SELECT c.relname AS "table",a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type
      FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('problem','unit','source_material','source_book')
        AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`;
      const indexes = await tx.$queryRaw<
        { tablename: string; indexname: string; indexdef: string }[]
      >`
      SELECT tablename,indexname,indexdef FROM pg_indexes
      WHERE schemaname='public' AND tablename IN ('problem','unit','source_material','source_book')
      ORDER BY tablename,indexname`;
      const problem = await tx.$queryRaw<Record<string, unknown>[]>`
      SELECT id,pool,unit_id,source,source_material_id,question_group_key,family_key,difficulty,
        review_status,direct_use_allowed,problem_code,question_number,actual_format,actual_format_version,
        created_at,updated_at,
        CASE WHEN answer=${MISSING_ANSWER} THEN ${MISSING_ANSWER} ELSE '' END AS answer
      FROM public.problem`;
      const unit = await tx.$queryRaw<Record<string, unknown>[]>`
      SELECT id,grade,chapter,section,order_index,semester,problem_code_prefix FROM public.unit`;
      const source_material = await tx.$queryRaw<Record<string, unknown>[]>`
      SELECT id,book_id,kind,external_key FROM public.source_material`;
      const source_book = await tx.$queryRaw<Record<string, unknown>[]>`
      SELECT id,kind,grade,publisher,external_key FROM public.source_book`;
      return {
        config,
        scope,
        enums,
        columns,
        indexes,
        tables: { problem, unit, source_material, source_book },
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 180_000, maxWait: 20_000 },
  );
  await db.$disconnect();
  if (
    captured.tables.problem.some(
      (row) =>
        row.pool === "shared" &&
        (row.actual_format === null ||
          row.actual_format_version !== ACTUAL_FORMAT_VERSION),
    )
  )
    throw new Error("INVALID_FORMAT_FACTS");
  console.log(
    `READ ONLY capture finished: ${captured.tables.problem.length} problem metadata rows; shared client disconnected`,
  );

  const pg = new PGlite();
  const frozen = await frozenCountSql();
  try {
    for (const type of captured.enums)
      await pg.exec(
        `CREATE TYPE ${quote(type.name)} AS ENUM (${type.labels.map(literal).join(",")})`,
      );
    console.log("PGlite enums created");
    for (const [table, rows] of Object.entries(captured.tables)) {
      const columns = captured.columns.filter((col) => col.table === table);
      await pg.exec(
        `CREATE TABLE ${quote(table)} (${columns.map((col) => `${quote(col.name)} ${col.type}`).join(",")})`,
      );
      // The shared scan's row order is retained. No real answer/content is copied.
      for (let offset = 0; offset < rows.length; offset += 2000)
        await pg.query(
          `INSERT INTO ${quote(table)} SELECT * FROM jsonb_populate_recordset(NULL::${quote(table)},$1::jsonb)`,
          [JSON.stringify(rows.slice(offset, offset + 2000))],
        );
      console.log(`PGlite ${table} metadata inserted`);
    }
    for (const index of captured.indexes) await pg.exec(index.indexdef);
    await pg.exec("VACUUM (ANALYZE)");
    await pg.exec(
      "SET plan_cache_mode='force_custom_plan'; SET max_parallel_workers_per_gather=0",
    );
    const samples: Record<string, unknown>[] = [];
    const plans: Record<string, unknown>[] = [];
    const reference = new Map<string, Buffer>();
    const referenceRows = new Map<string, unknown[]>();
    const client = {};
    const versions = [
      {
        version: "before",
        queries: queries(frozen.module, client, captured.scope),
      },
      { version: "after", queries: queries(current, client, captured.scope) },
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
    const run = async (
      variant: string,
      workMem: string,
      selected = versions,
    ) => {
      await pg.query("SELECT set_config('work_mem',$1,false)", [workMem]);
      for (let round = 1; round <= rounds; round++)
        for (const version of round % 2 ? selected : [...selected].reverse())
          for (const { name, sql } of version.queries) {
            selectOnly(sql);
            const started = performance.now();
            const rows = (await pg.query(sql.text, sql.values)).rows;
            const ms = Number((performance.now() - started).toFixed(3));
            const bytes = bytesOf(rows);
            if (!reference.has(name)) {
              reference.set(name, bytes.bytes);
              referenceRows.set(name, rows);
            }
            const byteEqual = reference.get(name)!.equals(bytes.bytes);
            samples.push({
              variant,
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
            if (round === 1) {
              const explain = (
                await pg.query<{ "QUERY PLAN": Record<string, unknown>[] }>(
                  `EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${sql.text}`,
                  sql.values,
                )
              ).rows[0]["QUERY PLAN"][0];
              plans.push({
                variant,
                workMem,
                version: version.version,
                name,
                ...planSummary(explain),
                plan: explain,
              });
            }
          }
      console.log(`PGlite ${variant} ${workMem} finished`);
    };
    await run("existing-indexes", "4MB");
    await run("existing-indexes", "16MB");
    const candidates = [
      {
        name: "scope-cover",
        index: "bank_probe_scope_cover_idx",
        ddl: "CREATE INDEX bank_probe_scope_cover_idx ON public.problem(unit_id,question_group_key) INCLUDE (id,actual_format,family_key) WHERE pool='shared'",
        reason:
          "Overlaps existing unit/question-group indexes; cannot cover approval/lock/answer checks.",
      },
      {
        name: "eligible-cover",
        index: "bank_probe_eligible_cover_idx",
        ddl: `CREATE INDEX bank_probe_eligible_cover_idx ON public.problem(unit_id,question_group_key) INCLUDE (id,actual_format) WHERE pool='shared' AND review_status='approved' AND direct_use_allowed AND answer <> ${literal(MISSING_ANSWER)}`,
        reason:
          "Exact existing eligibility predicate; can help legacy bootstrap, cannot replace visible-held queries that include blocked siblings.",
      },
    ];
    const indexEvidence = [];
    for (const candidate of candidates) {
      await pg.exec(candidate.ddl);
      await pg.exec("VACUUM (ANALYZE) problem");
      const size = (
        await pg.query<{ bytes: number }>(
          "SELECT pg_relation_size($1::regclass)::int AS bytes",
          [candidate.index],
        )
      ).rows[0].bytes;
      indexEvidence.push({ ...candidate, bytes: size });
      await run(
        candidate.name,
        "4MB",
        versions.filter((version) => version.version === "after"),
      );
      await pg.exec(`DROP INDEX ${quote(candidate.index)}`);
      await pg.exec("ANALYZE problem");
      await run(
        `without-${candidate.name}`,
        "4MB",
        versions.filter((version) => version.version === "after"),
      );
    }

    const root =
      process.env.BANK_SQL_ROOT_DIR ??
      "/Users/pss/Desktop/creative/today-bank-index";
    const migrationPath = resolve(
      root,
      "prisma/migrations/20261019160000_bank_read_revision/migration.sql",
    );
    const migration = await readFile(migrationPath, "utf8");
    const rootReader = await readFile(
      resolve(root, "src/lib/bankReadFingerprint.ts"),
      "utf8",
    );
    const revisionSql = rootReader
      .slice(rootReader.indexOf("export function bankRevisionFingerprintSql"))
      .match(/Prisma\.sql`([^`]+)`/)?.[1];
    if (!revisionSql || /\$\{/.test(revisionSql))
      throw new Error("REVISION_SQL_CHANGED");
    await pg.exec("CREATE ROLE anon; CREATE ROLE authenticated; BEGIN");
    try {
      await pg.exec(migration);
      await pg.exec("COMMIT");
    } catch (error) {
      await pg.exec("ROLLBACK");
      throw error;
    }
    const fingerprint = bankReadFingerprintSql();
    const revisionSamples = [];
    for (const [name, text, values] of [
      ["xmin-fingerprint", fingerprint.text, fingerprint.values],
      ["revision-singleton", revisionSql, []],
    ] as const) {
      selectOnly({ text } as typeof fingerprint);
      for (let round = 1; round <= 5; round++) {
        const started = performance.now();
        const rows = (await pg.query(text, [...values])).rows;
        const ms = Number((performance.now() - started).toFixed(3));
        const explain = (
          await pg.query<{ "QUERY PLAN": Record<string, unknown>[] }>(
            `EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${text}`,
            [...values],
          )
        ).rows[0]["QUERY PLAN"][0];
        revisionSamples.push({
          name,
          round,
          ms,
          rows: rows.length,
          ...planSummary(explain),
          plan: explain,
        });
      }
    }
    await run(
      "revision-ddl-existing-indexes",
      "4MB",
      versions.filter((version) => version.version === "after"),
    );
    const totals = (
      await pg.query(`SELECT pool,source,actual_format,count(*)::int AS n FROM problem
      GROUP BY pool,source,actual_format ORDER BY pool,source,actual_format`)
    ).rows;
    const result = {
      measuredAt: new Date().toISOString(),
      baseline: "5051fea68",
      baselineSqlSha256: frozen.sha256,
      workingSqlSha256: workingCountSqlSha256(),
      environment:
        "In-memory PGlite actual metadata distribution with real UUID/enum column types and all existing indexes. No actual question body/answer copied; omitted fields are NULL, so heap/TOAST width and all-visible VACUUM differ from production. Local CPU/WASM/storage/costs are not shared DB latency.",
      sharedReadOnly: captured.config,
      sharedDisconnectedBeforeLocalDdl: true,
      scope: {
        grade: captured.scope.grade,
        units: captured.scope.units.length,
        chapterUnits: captured.scope.chapterUnits.length,
        books: captured.scope.books.length,
        materialPage: captured.scope.materialPage.length,
      },
      rows: Object.fromEntries(
        Object.entries(captured.tables).map(([table, rows]) => [
          table,
          rows.length,
        ]),
      ),
      totals,
      existingIndexes: captured.indexes,
      indexEvidence,
      samples,
      plans,
      revision: {
        migrationPath,
        migrationSha256: createHash("sha256").update(migration).digest("hex"),
        ddlAppliedLocally: true,
        sql: revisionSql,
        samples: revisionSamples,
      },
    };
    await writeFile(output, JSON.stringify(result, null, 2) + "\n");
    // Index-induced natural-order changes are evidence against adopting that index,
    // not a reason to normalize the response. Product before/after must still match.
    if (
      samples.some(
        (sample) => sample.variant === "existing-indexes" && !sample.byteEqual,
      )
    )
      throw new Error("SQL_BYTE_PARITY_FAILED");
  } finally {
    await frozen.close();
    await pg.close();
  }
}
if (process.argv[1]?.endsWith("bank-first-call-sql-mirror.ts"))
  main().catch((error) => {
    console.error(safeError(error));
    process.exitCode = 1;
  });
