/**
 * Apply ONLY the SRS table migration; never deploy unrelated pending migrations.
 * Default: execute and validate in a transaction, then roll everything back.
 * --check: read-only readiness check.
 * ALLOW_SHARED_IMPORT=1 + --apply: commit the verified additive migration.
 * No test student, learning state, or changes to existing student rows are inserted.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { Prisma, PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const migration = "20260923150000_student_srs_state";
const sql = readFileSync(
  `prisma/migrations/${migration}/migration.sql`,
  "utf8",
);
const checksum = createHash("sha256")
  .update(sql.replaceAll("\r", ""))
  .digest("hex");
const apply = process.argv.includes("--apply");
const checkOnly = process.argv.includes("--check");
if (apply && (checkOnly || process.env.ALLOW_SHARED_IMPORT !== "1")) {
  throw new Error(
    "Use --apply with ALLOW_SHARED_IMPORT=1, separately from --check.",
  );
}
const db = new PrismaClient();
class RollbackDryRun extends Error {}

async function verify(tx: Prisma.TransactionClient) {
  const [table] = await tx.$queryRaw<
    Array<{
      rls: boolean;
      checks: number;
      primary_key: boolean;
      cascade_fk: boolean;
      policies: number;
    }>
  >`
    SELECT c.relrowsecurity AS rls,
      (SELECT count(*)::int FROM pg_constraint k WHERE k.conrelid=c.oid AND k.contype='c') AS checks,
      EXISTS(SELECT 1 FROM pg_constraint k WHERE k.conrelid=c.oid AND k.contype='p') AS primary_key,
      EXISTS(SELECT 1 FROM pg_constraint k WHERE k.conrelid=c.oid AND k.contype='f' AND k.confrelid='public.student'::regclass AND k.confdeltype='c') AS cascade_fk,
      (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid=c.oid) AS policies
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='student_srs_state'`;
  if (
    !table ||
    !table.rls ||
    table.checks !== 2 ||
    !table.primary_key ||
    !table.cascade_fk ||
    table.policies !== 0
  )
    throw new Error(
      "SRS table protection or constraints do not match the migration.",
    );
  const columns = await tx.$queryRaw<
    Array<{ column_name: string; udt_name: string; is_nullable: string }>
  >`
    SELECT column_name,udt_name,is_nullable FROM information_schema.columns
    WHERE table_schema='public' AND table_name='student_srs_state' ORDER BY ordinal_position`;
  const expected = [
    "student_id:uuid",
    "revision:int4",
    "payload:jsonb",
    "created_at:timestamp",
    "updated_at:timestamp",
  ];
  if (
    columns.length !== expected.length ||
    columns.some(
      (c, i) =>
        `${c.column_name}:${c.udt_name}` !== expected[i] ||
        c.is_nullable !== "NO",
    )
  )
    throw new Error("SRS columns do not match the application schema.");
  const [{ rows }] = await tx.$queryRaw<
    Array<{ rows: number }>
  >`SELECT count(*)::int AS rows FROM student_srs_state`;
  console.log(
    JSON.stringify({ ready: true, rls: true, checks: table.checks, rows }),
  );
}

async function run() {
  if (checkOnly) {
    const [{ present }] = await db.$queryRaw<
      Array<{ present: boolean }>
    >`SELECT to_regclass('public.student_srs_state') IS NOT NULL AS present`;
    if (!present) throw new Error("SRS table has not been installed.");
    await verify(db);
    return;
  }
  await db
    .$transaction(
      async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
        await tx.$executeRaw`SET LOCAL statement_timeout = '20s'`;
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(9232026, 150000)::text`;
        const applied = await tx.$queryRaw<
          Array<{ checksum: string; finished_at: Date | null }>
        >`
      SELECT checksum,finished_at FROM _prisma_migrations
      WHERE migration_name=${migration} AND rolled_back_at IS NULL`;
        if (applied.length) {
          if (
            applied.length !== 1 ||
            applied[0].checksum !== checksum ||
            !applied[0].finished_at
          )
            throw new Error(
              "Existing migration record differs; stop for investigation.",
            );
          await verify(tx);
          console.log("Migration already applied; no changes.");
          return;
        }
        const statements = sql
          .split("\n")
          .filter((line) => !line.trimStart().startsWith("--"))
          .join("\n")
          .split(";")
          .map((part) => part.trim())
          .filter(Boolean);
        if (
          statements.length !== 2 ||
          !statements[0].startsWith('CREATE TABLE "student_srs_state"') ||
          statements[1] !==
            'ALTER TABLE "student_srs_state" ENABLE ROW LEVEL SECURITY'
        )
          throw new Error(
            "Unexpected SQL: this tool only installs the SRS table and its RLS guard.",
          );
        for (const statement of statements)
          await tx.$executeRawUnsafe(statement);
        await tx.$executeRaw`
      INSERT INTO _prisma_migrations (id,checksum,finished_at,migration_name,logs,rolled_back_at,started_at,applied_steps_count)
      VALUES (${randomUUID()},${checksum},now(),${migration},NULL,NULL,now(),1)`;
        await verify(tx);
        if (!apply) throw new RollbackDryRun();
        console.log(
          "SRS migration committed; existing student and result rows were not modified.",
        );
      },
      { timeout: 45000, maxWait: 10000 },
    )
    .catch((error: unknown) => {
      if (error instanceof RollbackDryRun)
        console.log(
          "Dry run passed; migration and its record were rolled back.",
        );
      else throw error;
    });
}

run()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "SRS migration failed.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
