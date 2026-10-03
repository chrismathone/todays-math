/** Only the two reviewed receiver migrations. Default: read-only preflight.
 * node --env-file=<target.env> --import tsx scripts/qa/apply-eywa-managed-migrations.ts
 * Apply requires --apply and ALLOW_SHARED_IMPORT=1; --verify is read-only.
 * No fixture rows, candidate approvals, or license changes are performed.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient, type Prisma } from "@prisma/client";

const names = [
  "20261003085222_eywa_managed_sync",
  "20261003103000_eywa_auto_branch",
];
const tables = [
  "eywa_binding",
  "eywa_managed_account",
  "eywa_inbox",
  "eywa_nonce",
  "eywa_sso_use",
  "eywa_sso_handoff",
  "class_membership",
  "student_enrollment",
];
const originals = [
  "user",
  "class",
  "student",
  "progress",
  "progress_plan",
  "english_exam",
];
const migrations = names.map((name) => {
  // Match repository/Prisma LF checksums, independent of Windows checkout CRLF.
  const sql = readFileSync(
    `prisma/migrations/${name}/migration.sql`,
    "utf8",
  ).replaceAll("\r", "");
  const statements = (
    sql.replace(/^--.*$/gm, "").match(/(?:\$\$[\s\S]*?\$\$|[^;])+/g) ?? []
  )
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    name,
    sql,
    statements,
    checksum: createHash("sha256").update(sql).digest("hex"),
  };
});
type Tx = Prisma.TransactionClient;
function ensure(ok: unknown, reason: string): asserts ok {
  if (!ok) throw new Error(reason);
}
async function counts(tx: Tx, selected: string[]) {
  const result: Record<string, number> = {};
  for (const name of selected) {
    const [row] = await tx.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM public."${name}"`,
    );
    result[name] = row.n;
  }
  return result;
}
async function history(tx: Tx) {
  return tx.$queryRawUnsafe<
    {
      migration_name: string;
      checksum: string;
      finished: boolean;
      rolled_back: boolean;
    }[]
  >(
    `SELECT migration_name,checksum,finished_at IS NOT NULL AS finished,rolled_back_at IS NOT NULL AS rolled_back FROM public._prisma_migrations WHERE migration_name IN ($1,$2) ORDER BY migration_name`,
    ...names,
  );
}
async function preflight(tx: Tx) {
  const applied = await history(tx);
  ensure(
    applied.length === 0,
    "Selected migration history already exists; use --verify and review, never overwrite",
  );
  const existing = await tx.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN (${tables.map((_, i) => `$${i + 1}`).join(",")})`,
    ...tables,
  );
  ensure(existing[0].n === 0, "Receiver integration tables already exist");
  const columns = await tx.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='public' AND ((table_name='user' AND column_name IN ('auth_source','manual_suspended_at')) OR (table_name='class' AND column_name IN ('active','branch_id','closed_at','eywa_binding_id','permission_revision')) OR (table_name='student' AND column_name IN ('branch_id','eywa_binding_id','is_test','source_status')) OR (table_name='progress' AND column_name='retired_at') OR (table_name='english_exam' AND column_name='branch_id'))`,
  );
  ensure(columns[0].n === 0, "Receiver columns already exist");
  const [prerequisites] = await tx.$queryRawUnsafe<
    {
      class_fk: boolean;
      plan_unique: boolean;
      orphan_classes: number;
      duplicate_plans: number;
    }[]
  >(
    `SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.class'::regclass AND conname='class_user_id_fkey') AS class_fk, to_regclass('public.progress_plan_student_id_key') IS NOT NULL AS plan_unique, (SELECT count(*)::int FROM class c LEFT JOIN "user" u ON u.id=c.user_id WHERE u.id IS NULL) AS orphan_classes, (SELECT count(*)::int FROM (SELECT class_id,student_id FROM progress_plan GROUP BY class_id,student_id HAVING count(*)>1) d) AS duplicate_plans`,
  );
  ensure(
    prerequisites.class_fk &&
      prerequisites.plan_unique &&
      prerequisites.orphan_classes === 0 &&
      prerequisites.duplicate_plans === 0,
    "Migration prerequisites failed",
  );
  return {
    history: applied,
    newTables: existing[0].n,
    newColumns: columns[0].n,
    prerequisites,
    counts: await counts(tx, originals),
  };
}
async function verify(tx: Tx, fresh = false) {
  const applied = await history(tx);
  ensure(
    applied.length === 2,
    "Expected exactly two migration history entries",
  );
  for (const m of migrations)
    ensure(
      applied.some(
        (a) =>
          a.migration_name === m.name &&
          a.checksum === m.checksum &&
          a.finished &&
          !a.rolled_back,
      ),
      `Migration history/checksum mismatch: ${m.name}`,
    );
  const tableState = await tx.$queryRawUnsafe<{ name: string; rls: boolean }[]>(
    `SELECT c.relname AS name,c.relrowsecurity AS rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN (${tables.map((_, i) => `$${i + 1}`).join(",")})`,
    ...tables,
  );
  ensure(
    tableState.length === 8 && tableState.every((t) => t.rls),
    "Expected all eight integration tables with RLS",
  );
  const grants = await tx.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee IN ('PUBLIC','anon','authenticated') AND table_name IN (${tables.map((_, i) => `$${i + 1}`).join(",")})`,
    ...tables,
  );
  ensure(grants[0].n === 0, "Integration browser/public grants remain");
  const triggers = await tx.$queryRawUnsafe<{ name: string }[]>(
    `SELECT tgname AS name FROM pg_trigger WHERE tgrelid IN ('public.user'::regclass,'public.class'::regclass,'public.student'::regclass,'public.english_exam'::regclass) AND tgenabled='O' AND tgname IN ('eywa_user_guard','eywa_class_branch_guard','eywa_student_branch_guard','eywa_english_exam_branch_guard')`,
  );
  ensure(triggers.length === 4, "Missing active guard triggers");
  const functions = await tx.$queryRawUnsafe<
    { name: string; config: string[] }[]
  >(
    `SELECT proname AS name,proconfig AS config FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('eywa_user_guard','eywa_class_branch_guard') AND NOT prosecdef`,
  );
  ensure(
    functions.length === 2 &&
      functions.every((f) =>
        f.config?.some(
          (c) => c.replaceAll(" ", "") === "search_path=pg_catalog,public",
        ),
      ),
    "Guard function security/search path mismatch",
  );
  const constraints = await tx.$queryRawUnsafe<
    { name: string; validated: boolean }[]
  >(
    `SELECT conname AS name,convalidated AS validated FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname IN ('eywa_binding_mode','eywa_managed_status','eywa_managed_current','eywa_inbox_status','user_auth_source','user_eywa_no_password')`,
  );
  ensure(
    constraints.length === 6 && constraints.every((c) => c.validated),
    "Expected validated sync checks",
  );
  const [structure] = await tx.$queryRawUnsafe<
    {
      restrict_owner: boolean;
      plan_unique: boolean;
      old_plan_unique_absent: boolean;
      live_unique: boolean;
      automatic_default: boolean;
    }[]
  >(
    `SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.class'::regclass AND conname='class_user_id_fkey' AND confdeltype='r' AND convalidated) AS restrict_owner, EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.progress_plan_class_id_student_id_key') AND indisunique AND indisvalid) AS plan_unique, to_regclass('public.progress_plan_student_id_key') IS NULL AS old_plan_unique_absent, EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.eywa_managed_live_source') AND indisunique AND indisvalid AND indpred IS NOT NULL) AS live_unique, EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='eywa_binding' AND column_name='auto_provisioned_branch' AND is_nullable='NO' AND column_default='false') AS automatic_default`,
  );
  ensure(
    Object.values(structure).every(Boolean),
    "Receiver structure invariant failed",
  );
  const [invariants] = await tx.$queryRawUnsafe<Record<string, number>[]>(
    `SELECT (SELECT count(*)::int FROM "user" WHERE auth_source='eywa' AND password_hash IS NOT NULL) AS managed_passwords, (SELECT count(*)::int FROM "user" WHERE manual_suspended_at IS DISTINCT FROM suspended_at AND NOT EXISTS(SELECT 1 FROM eywa_managed_account m WHERE m.current_user_id="user".id)) AS manual_suspension_mismatches, (SELECT count(*)::int FROM class c JOIN "user" u ON u.id=c.user_id WHERE c.eywa_binding_id IS NULL AND c.branch_id IS DISTINCT FROM u.branch_id) AS class_backfill_mismatches, (SELECT count(*)::int FROM student s JOIN class c ON c.id=s.class_id WHERE s.eywa_binding_id IS NULL AND s.branch_id IS DISTINCT FROM c.branch_id) AS student_backfill_mismatches, (SELECT count(*)::int FROM english_exam e JOIN "user" u ON u.id=e.user_id WHERE e.branch_id IS DISTINCT FROM u.branch_id) AS exam_backfill_mismatches`,
  );
  ensure(
    Object.values(invariants).every((n) => n === 0),
    "Receiver data/backfill invariant failed",
  );
  const integrationCounts = await counts(tx, tables);
  if (fresh)
    ensure(
      Object.values(integrationCounts).every((n) => n === 0),
      "Migration unexpectedly created integration records",
    );
  return {
    migrations: applied,
    tablesWithRls: tableState.length,
    publicGrants: grants[0].n,
    guards: triggers.length,
    functions: functions.length,
    validatedChecks: constraints.length,
    structure,
    invariants,
    counts: await counts(tx, originals),
    integrationCounts,
  };
}
async function main() {
  const apply = process.argv.includes("--apply"),
    check = process.argv.includes("--verify");
  ensure(!(apply && check), "Choose one mode");
  ensure(
    !apply || process.env.ALLOW_SHARED_IMPORT === "1",
    "Apply requires explicit ALLOW_SHARED_IMPORT=1",
  );
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  ensure(url, "Explicit target DIRECT_URL or DATABASE_URL required");
  const db = new PrismaClient({ datasources: { db: { url } }, log: [] });
  try {
    const evidence = await db.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '10s'");
        await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '60s'");
        if (!apply) {
          await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
          return check ? verify(tx) : preflight(tx);
        }
        await tx.$executeRawUnsafe(
          "SELECT pg_advisory_xact_lock(hashtextextended('eywa-managed-receiver-migrations',0))",
        );
        // Stable row counts/backfill source values while applying; fail promptly if busy.
        await tx.$executeRawUnsafe(
          'LOCK TABLE public."user",public.class,public.student,public.progress,public.progress_plan,public.english_exam IN ACCESS EXCLUSIVE MODE',
        );
        const before = await preflight(tx);
        for (const m of migrations) {
          for (const sql of m.statements) await tx.$executeRawUnsafe(sql);
          await tx.$executeRawUnsafe(
            "INSERT INTO public._prisma_migrations(id,checksum,migration_name,finished_at,applied_steps_count) VALUES ($1,$2,$3,now(),1)",
            randomUUID(),
            m.checksum,
            m.name,
          );
        }
        const after = await verify(tx, true);
        ensure(
          JSON.stringify(before.counts) === JSON.stringify(after.counts),
          "Original row counts changed; rolling back",
        );
        return { before, after };
      },
      { timeout: 120000, maxWait: 10000 },
    );
    console.log(
      JSON.stringify(
        {
          mode: apply ? "applied" : check ? "verified" : "preflight",
          at: new Date().toISOString(),
          migrations: migrations.map(({ name, checksum, statements }) => ({
            name,
            checksum,
            statements: statements.length,
          })),
          evidence,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error: unknown) => {
  // Never emit Prisma error metadata, query rows, connection strings, or secrets.
  console.error(
    error instanceof Error && !error.name.startsWith("Prisma")
      ? error.message
      : "Database operation failed; transaction rolled back (inspect nonsecret diagnostics)",
  );
  process.exitCode = 1;
});
