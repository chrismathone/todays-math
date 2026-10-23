/** Applies only the commercial-workbook migration. No fallback to DATABASE_URL.
 * Default: read-only inspection. --dry-run: transactional DDL then rollback.
 * --apply: persist DDL and the matching Prisma migration receipt.
 * Explicit shared mutation gate: ALLOW_SHARED_IMPORT=1.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient, type Prisma } from "@prisma/client";
import { splitSqlStatements } from "./textbook-sql-statements";

const migration = "20261023110000_commercial_workbooks";
const tables = [
  "edition",
  "revision",
  "assignment",
  "grade_event",
  "wrong_note",
  "request",
].map((name) => `commercial_workbook_${name}`);
const triggers = [
  "revision_immutable",
  "assignment_immutable",
  "grade_event_immutable",
  "request_immutable",
  "note_history",
  "revision_guard",
  "grade_guard",
  "assignment_guard",
  "note_guard",
  "note_immutable_delete",
].map((name) => `commercial_workbook_${name}`);

async function inspect(tx: Prisma.TransactionClient) {
  const actual = await tx.$queryRaw<{ name: string; rls: boolean }[]>`
    SELECT c.relname AS name, c.relrowsecurity AS rls FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'commercial_workbook_%'`;
  if (
    actual.length !== tables.length ||
    tables.some((name) => !actual.some((row) => row.name === name && row.rls))
  )
    throw new Error(
      "Commercial workbook tables/RLS do not match the migration",
    );
  const actualTriggers = await tx.$queryRaw<{ name: string }[]>`
    SELECT tgname AS name FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname LIKE 'commercial_workbook_%' AND NOT t.tgisinternal`;
  if (triggers.some((name) => !actualTriggers.some((row) => row.name === name)))
    throw new Error("Commercial workbook history/validation trigger missing");
  const grants = await tx.$queryRaw<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.role_table_grants WHERE table_schema='public'
    AND table_name LIKE 'commercial_workbook_%' AND grantee IN ('PUBLIC','anon','authenticated')`;
  if (grants.length) throw new Error("Browser/public table grants remain");
  const policies = await tx.$queryRaw<{ policyname: string }[]>`
    SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'commercial_workbook_%'`;
  if (policies.length) throw new Error("Unexpected browser RLS policies");
  const functions = await tx.$queryRaw<
    {
      name: string;
      definer: boolean;
      config: string[] | null;
      public_execute: boolean;
    }[]
  >`
    SELECT p.proname AS name, p.prosecdef AS definer, p.proconfig AS config,
      EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
        WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname LIKE 'commercial_workbook_%'`;
  if (
    functions.length !== 6 ||
    functions.some(
      (fn) =>
        fn.definer ||
        fn.public_execute ||
        !fn.config?.some((value) => value.startsWith("search_path=")),
    )
  )
    throw new Error(
      "Trigger functions must be invoker-only, with fixed search_path and no PUBLIC execute",
    );
  const constraints = await tx.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname LIKE 'commercial_workbook_%'`;
  return {
    tables: actual.length,
    triggers: actualTriggers.length,
    functions: functions.length,
    constraints: Number(constraints[0].count),
    publicGrants: 0,
    browserPolicies: 0,
  };
}

async function main() {
  const url = process.env.COMMERCIAL_WORKBOOK_DATABASE_URL;
  if (!url)
    throw new Error(
      "COMMERCIAL_WORKBOOK_DATABASE_URL must explicitly select the database",
    );
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run");
  if (apply && dryRun) throw new Error("Choose --apply or --dry-run");
  if (
    process.argv.slice(2).some((arg) => !["--apply", "--dry-run"].includes(arg))
  )
    throw new Error("Unknown option");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(url).hostname,
  );
  if ((apply || dryRun) && !local && process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error("Shared mutation requires explicit ALLOW_SHARED_IMPORT=1");
  const sql = readFileSync(
    `prisma/migrations/${migration}/migration.sql`,
    "utf8",
  ).replaceAll("\r", "");
  const checksum = createHash("sha256").update(sql).digest("hex");
  const db = new PrismaClient({ datasources: { db: { url } } });
  const rollback = new Error("WORKBOOK_DRY_RUN_ROLLBACK");
  let evidence: Awaited<ReturnType<typeof inspect>> | undefined;
  try {
    await db.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL search_path TO public");
        if (!apply && !dryRun) {
          await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
          evidence = await inspect(tx);
          return;
        }
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('commercial-workbook-migration',0))::text`;
        const prior = await tx.$queryRaw<{ checksum: string }[]>`
        SELECT checksum FROM _prisma_migrations WHERE migration_name=${migration} AND rolled_back_at IS NULL AND finished_at IS NOT NULL`;
        if (
          prior.length > 1 ||
          (prior.length === 1 && prior[0].checksum !== checksum)
        )
          throw new Error("Migration receipt/checksum mismatch");
        if (!prior.length) {
          const existing = await tx.$queryRaw<{ count: bigint }[]>`
          SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'commercial_workbook_%'`;
          if (Number(existing[0].count))
            throw new Error(
              "Unrecorded workbook schema exists; inspect before applying",
            );
          for (const statement of splitSqlStatements(sql))
            await tx.$executeRawUnsafe(statement);
          await tx.$executeRaw`INSERT INTO _prisma_migrations(id,checksum,migration_name,finished_at,applied_steps_count)
          VALUES(${randomUUID()},${checksum},${migration},now(),1)`;
        }
        evidence = await inspect(tx);
        if (dryRun) throw rollback;
      },
      { timeout: 60000, maxWait: 10000 },
    );
    console.log(
      JSON.stringify({
        mode: apply ? "applied" : "read-only-check",
        migration,
        checksum,
        ...evidence,
      }),
    );
  } catch (error) {
    if (error !== rollback) throw error;
    console.log(
      JSON.stringify({
        mode: "dry-run-rolled-back",
        migration,
        checksum,
        ...evidence,
      }),
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Migration check failed",
  );
  process.exitCode = 1;
});
