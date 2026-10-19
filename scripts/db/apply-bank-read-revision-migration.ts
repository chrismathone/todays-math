/** Default READ ONLY preflight. Only the lead may use ALLOW_SHARED_IMPORT=1 --apply.
 * Atomic DDL + initial counter + exact Prisma checksum; never runs migrate deploy.
 * No secondary index is shipped, so CREATE INDEX CONCURRENTLY is unnecessary.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { ACTUAL_FORMAT_VERSION } from "../../src/lib/problem/actualFormat";
import { ROOT, readOnly, safeCode, sha256, splitMigration, type SqlClient } from "./problem-actual-format";

export const BANK_REVISION_MIGRATION = "20261019160000_bank_read_revision";
export const BANK_REVISION_PATH = resolve(ROOT, "prisma/migrations", BANK_REVISION_MIGRATION, "migration.sql");
export const BANK_REVISION_TRIGGERS = [
  ["problem", "problem_bank_revision_insert", 4, null, "new_rows"],
  ["problem", "problem_bank_revision_update", 16, "old_rows", "new_rows"],
  ["problem", "problem_bank_revision_delete", 8, "old_rows", null],
  ["problem", "problem_bank_revision_truncate", 32, null, null],
  ["unit", "unit_bank_revision", 60, null, null],
  ["source_material", "source_material_bank_revision", 60, null, null],
  ["source_book", "source_book_bank_revision", 60, null, null],
] as const;

export async function bankRevisionCatalog(tx: SqlClient) {
  const [table] = await tx.$queryRaw<{ present: boolean; rls: boolean }[]>`SELECT
    EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='bank_read_revision' AND c.relkind='r') AS present,
    COALESCE((SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='bank_read_revision'),false) AS rls`;
  const history = await tx.$queryRaw<{ checksum: string; finished_at: Date | null; rolled_back_at: Date | null }[]>`
    SELECT checksum,finished_at,rolled_back_at FROM public._prisma_migrations
    WHERE migration_name=${BANK_REVISION_MIGRATION}`;
  const columns = await tx.$queryRaw<{ name: string; type: string; required: boolean; defaultExpression: string | null }[]>`
    SELECT a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS required,
      pg_get_expr(d.adbin,d.adrelid) AS "defaultExpression"
    FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid=to_regclass('public.bank_read_revision') AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`;
  const constraints = await tx.$queryRaw<{ name: string; definition: string; validated: boolean }[]>`
    SELECT conname AS name,pg_get_constraintdef(oid) AS definition,convalidated AS validated
    FROM pg_constraint WHERE conrelid=to_regclass('public.bank_read_revision') AND contype IN ('p','c') ORDER BY conname`;
  const triggers = await tx.$queryRaw<{ table: string; name: string; enabled: string; type: number; oldTable: string | null; newTable: string | null; function: string; schema: string }[]>`
    SELECT c.relname AS table,t.tgname AS name,t.tgenabled::text AS enabled,t.tgtype::int AS type,
      t.tgoldtable::text AS "oldTable",t.tgnewtable::text AS "newTable",p.proname AS function,n.nspname AS schema
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE NOT t.tgisinternal AND t.tgname IN
      ('problem_bank_revision_insert','problem_bank_revision_update','problem_bank_revision_delete','problem_bank_revision_truncate',
       'unit_bank_revision','source_material_bank_revision','source_book_bank_revision')`;
  const functions = await tx.$queryRaw<{ name: string; source: string; securityDefiner: boolean; config: string[] | null }[]>`
    SELECT p.proname AS name,p.prosrc AS source,p.prosecdef AS "securityDefiner",p.proconfig AS config
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
    AND p.proname IN ('advance_problem_bank_revision','advance_related_bank_revision') AND p.pronargs=0`;
  const prerequisite = await tx.$queryRaw<{ name: string; enabled: string }[]>`
    SELECT tgname AS name,tgenabled::text AS enabled FROM pg_trigger
    WHERE tgrelid='public.problem'::regclass AND tgname IN ('problem_question_group_invalidate','problem_zz_actual_format_invalidate')`;
  const browserPrivileges = table.present ? await tx.$queryRaw<{ role: string; allowed: boolean }[]>`
    SELECT rolname AS role,has_table_privilege(oid,'public.bank_read_revision','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR has_function_privilege(oid,'public.advance_problem_bank_revision()','EXECUTE')
      OR has_function_privilege(oid,'public.advance_related_bank_revision()','EXECUTE') AS allowed
    FROM pg_roles WHERE rolname IN ('anon','authenticated')` : [];
  const rows = table.present ? await tx.$queryRaw<{ id: number; revision: string; schemaVersion: number; formatVersion: string; invalid: string }[]>`
    SELECT id::int,revision::text,schema_version::int AS "schemaVersion",format_version AS "formatVersion",invalid_format_count::text AS invalid
    FROM public.bank_read_revision` : [];
  return { table, history, columns, constraints, triggers, functions, prerequisite, browserPrivileges, rows };
}

export function validateBankRevisionCatalog(c: Awaited<ReturnType<typeof bankRevisionCatalog>>, checksum: string): "pending" | "applied" {
  if (c.prerequisite.length !== 2 || c.prerequisite.some((t) => t.enabled !== "O"))
    throw new Error("BANK_REVISION_READER_FLOOR_REQUIRED");
  if (!c.table.present && !c.history.length && !c.triggers.length && !c.functions.length) return "pending";
  const expectedColumns: Record<string, [string, string | null]> = {
    id: ["smallint", "1"], revision: ["bigint", "1"], schema_version: ["smallint", "1"],
    format_version: ["character varying(96)", null], invalid_format_count: ["bigint", "0"],
  };
  const expectedConstraints: Record<string, string> = {
    bank_read_revision_pkey: "PRIMARY KEY (id)", bank_read_revision_singleton: "CHECK ((id = 1))",
    bank_read_revision_schema: "CHECK ((schema_version = 1))", bank_read_revision_positive: "CHECK ((revision > 0))",
    bank_read_revision_invalid: "CHECK ((invalid_format_count >= 0))",
  };
  const raw = readFileSync(BANK_REVISION_PATH, "utf8").replaceAll("\r", "");
  const sources = [...raw.matchAll(/CREATE FUNCTION public\.(\w+)\(\)[\s\S]*?AS \$\$([\s\S]*?)\$\$/g)];
  const shape = c.table.rls && c.columns.length === 5 && c.columns.every((column) => {
    const expected = expectedColumns[column.name];
    return expected && column.required && column.type === expected[0] && column.defaultExpression === expected[1];
  }) && c.constraints.length === 5 && c.constraints.every((constraint) => constraint.validated && expectedConstraints[constraint.name] === constraint.definition)
    && c.triggers.length === 7 && BANK_REVISION_TRIGGERS.every(([table, name, type, oldTable, newTable]) => {
      const t = c.triggers.find((t) => t.name === name && t.table === table);
      return t?.enabled === "O" && t.type === type && t.oldTable === oldTable && t.newTable === newTable
        && t.schema === "public" && t.function === (table === "problem" ? "advance_problem_bank_revision" : "advance_related_bank_revision");
    }) && c.functions.length === 2 && c.functions.every((fn) => fn.securityDefiner
      && JSON.stringify(fn.config) === JSON.stringify(["search_path=pg_catalog"])
      && sources.some((match) => match[1] === fn.name && match[2].trim() === fn.source.trim()))
    && c.browserPrivileges.length === 2 && c.browserPrivileges.every((role) => !role.allowed)
    && c.rows.length === 1 && c.rows[0].id === 1 && c.rows[0].schemaVersion === 1
    && c.rows[0].formatVersion === ACTUAL_FORMAT_VERSION && /^\d+$/.test(c.rows[0].invalid) && /^[1-9]\d*$/.test(c.rows[0].revision);
  if (shape && c.history.length === 1 && c.history[0].checksum === checksum && c.history[0].finished_at && !c.history[0].rolled_back_at) return "applied";
  throw new Error("BANK_REVISION_CATALOG_MISMATCH");
}

/** Slow audit belongs to the operator, never to a screen request. */
export async function verifyBankRevisionCounter(tx: SqlClient) {
  const [r] = await tx.$queryRaw<{ matches: boolean }[]>`SELECT r.invalid_format_count=(SELECT count(*) FROM public.problem p
    WHERE p.pool='shared' AND (p.actual_format IS NULL OR p.actual_format_version IS DISTINCT FROM r.format_version)) AS matches
    FROM public.bank_read_revision r WHERE r.id=1`;
  if (r?.matches !== true) throw new Error("BANK_REVISION_COUNTER_MISMATCH");
}

export function bankRevisionRollbackStatements() {
  return [
    "LOCK TABLE public.problem, public.unit, public.source_material, public.source_book IN SHARE ROW EXCLUSIVE MODE",
    ...BANK_REVISION_TRIGGERS.map(([table, name]) => `DROP TRIGGER ${name} ON public.${table}`),
    "DROP FUNCTION public.advance_problem_bank_revision()",
    "DROP FUNCTION public.advance_related_bank_revision()",
    "DROP TABLE public.bank_read_revision",
  ];
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((a) => !["--apply", "--rollback"].includes(a)) || new Set(args).size !== args.length) throw new Error("UNKNOWN_ARGUMENT");
  const apply = args.includes("--apply");
  const rollback = args.includes("--rollback");
  if (apply && process.env.ALLOW_SHARED_IMPORT !== "1") throw new Error("SHARED_WRITE_GATE_CLOSED");
  if (apply && rollback && process.env.BANK_READ_REVISION !== "off") throw new Error("BANK_REVISION_DISABLE_READER_FIRST");
  const raw = readFileSync(BANK_REVISION_PATH, "utf8");
  const checksum = sha256(raw.replaceAll("\r", "")), statements = splitMigration(raw);
  if (statements.length !== 15 || !raw.includes(`'${ACTUAL_FORMAT_VERSION}'`)) throw new Error("BANK_REVISION_MIGRATION_CHANGED");
  const db = new PrismaClient({ log: [] });
  try {
    const status = await readOnly(db, async (tx) => {
      const status = validateBankRevisionCatalog(await bankRevisionCatalog(tx), checksum);
      if (status === "applied") await verifyBankRevisionCounter(tx);
      return status;
    });
    console.log(JSON.stringify({ mode: apply ? "apply" : "read-only-preflight", direction: rollback ? "rollback" : "forward", migration: BANK_REVISION_MIGRATION,
      checksum, statements: statements.length, status, secondaryIndexes: 0 }));
    if (!apply || status === (rollback ? "pending" : "applied")) return;
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL lock_timeout='3s'`;
      await tx.$executeRaw`SET LOCAL statement_timeout='60s'`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261019,160000)`;
      if (validateBankRevisionCatalog(await bankRevisionCatalog(tx), checksum) !== (rollback ? "applied" : "pending"))
        throw new Error("BANK_REVISION_APPLIED_CONCURRENTLY");
      if (rollback) {
        for (const statement of bankRevisionRollbackStatements()) await tx.$executeRawUnsafe(statement);
        await tx.$executeRaw`DELETE FROM public._prisma_migrations WHERE migration_name=${BANK_REVISION_MIGRATION} AND checksum=${checksum}`;
        if (validateBankRevisionCatalog(await bankRevisionCatalog(tx), checksum) !== "pending") throw new Error("BANK_REVISION_ROLLBACK_POSTCHECK_FAILED");
        return;
      }
      for (const statement of statements) await tx.$executeRawUnsafe(statement);
      await tx.$executeRaw`INSERT INTO public._prisma_migrations
        (id,checksum,finished_at,migration_name,logs,rolled_back_at,started_at,applied_steps_count)
        VALUES (${randomUUID()},${checksum},now(),${BANK_REVISION_MIGRATION},NULL,NULL,now(),1)`;
      validateBankRevisionCatalog(await bankRevisionCatalog(tx), checksum);
      await verifyBankRevisionCounter(tx);
    }, { timeout: 120_000, maxWait: 20_000 });
    console.log(rollback ? "은행 revision DDL 되돌림 완료." : "은행 revision DDL 검증 완료. BANK_READ_REVISION=on 전까지 기존 reader를 유지합니다.");
  } finally { await db.$disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((error) => { console.error(`BANK_REVISION_DDL_FAILED: ${safeCode(error)}`); process.exitCode = 1; });
