/** Apply only the reviewed roster-transfer guard; never deploy unrelated migrations.
 * Default performs the real DDL and assertions inside a transaction, then rolls back.
 * --apply requires ALLOW_SHARED_IMPORT=1; --verify is read-only.
 * No account approval, business-data update or fixture insertion occurs here.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient, type Prisma } from "@prisma/client";

const migration = "20261003130017_eywa_owned_roster_transfer";
const prerequisites = [
  "20261003085222_eywa_managed_sync",
  "20261003103000_eywa_auto_branch",
];
function source(name: string) {
  const sql = readFileSync(
    `prisma/migrations/${name}/migration.sql`,
    "utf8",
  ).replaceAll("\r", "");
  return { sql, checksum: createHash("sha256").update(sql).digest("hex") };
}
const { sql, checksum } = source(migration);
const statements = (
  sql.replace(/^--.*$/gm, "").match(/(?:\$\$[\s\S]*?\$\$|[^;])+/g) ?? []
)
  .map((s) => s.trim())
  .filter(Boolean);
type Tx = Prisma.TransactionClient;
class CheckFailure extends Error {}
class DryRunRollback extends Error {
  constructor(readonly evidence: unknown) {
    super("Verified dry run rolled back");
  }
}
function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new CheckFailure(message);
}
async function history(tx: Tx, name: string) {
  return tx.$queryRaw<
    { checksum: string; finished: boolean; rolled_back: boolean }[]
  >`
    SELECT checksum, finished_at IS NOT NULL AS finished,
      rolled_back_at IS NOT NULL AS rolled_back
    FROM public._prisma_migrations WHERE migration_name=${name}`;
}
async function checkPrerequisites(tx: Tx) {
  for (const name of prerequisites) {
    const rows = await history(tx, name);
    ensure(
      rows.length === 1 &&
        rows[0].finished &&
        !rows[0].rolled_back &&
        rows[0].checksum === source(name).checksum,
      "Prerequisite migration checksum/history mismatch",
    );
  }
  const [guards] = await tx.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM pg_trigger WHERE NOT tgisinternal AND tgenabled='O'
      AND tgrelid IN ('public.class'::regclass,'public.student'::regclass,'public.english_exam'::regclass)
      AND tgname IN ('eywa_class_branch_guard','eywa_student_branch_guard','eywa_english_exam_branch_guard')`;
  ensure(guards.n === 3, "Existing operational branch guards missing");
}
async function counts(tx: Tx) {
  const [row] = await tx.$queryRaw<Record<string, number>[]>`
    SELECT (SELECT count(*)::int FROM public."user") AS users,
      (SELECT count(*)::int FROM public.class) AS classes,
      (SELECT count(*)::int FROM public.student) AS students,
      (SELECT count(*)::int FROM public.student_account) AS student_accounts,
      (SELECT count(*)::int FROM public.test) AS tests,
      (SELECT count(*)::int FROM public.english_exam) AS english_exams`;
  return row;
}
async function verify(tx: Tx) {
  await checkPrerequisites(tx);
  const rows = await history(tx, migration);
  ensure(
    rows.length === 1 &&
      rows[0].finished &&
      !rows[0].rolled_back &&
      rows[0].checksum === checksum,
    "Roster migration checksum/history mismatch",
  );
  const functions = await tx.$queryRaw<
    {
      name: string;
      invoker: boolean;
      config: string[];
      can_execute: boolean;
    }[]
  >`
    SELECT proname AS name, NOT prosecdef AS invoker, proconfig AS config,
      has_function_privilege(current_user,oid,'EXECUTE') AS can_execute
    FROM pg_proc WHERE oid IN (
      'public.eywa_class_branch_guard()'::regprocedure,
      'public.eywa_transfer_owned_roster(uuid,uuid,uuid)'::regprocedure)`;
  ensure(
    functions.length === 2 &&
      functions.every(
        (f) =>
          f.invoker &&
          f.can_execute &&
          f.config?.some(
            (s) => s.replaceAll(" ", "") === "search_path=pg_catalog,public",
          ),
      ),
    "Function security/search path/runtime privilege mismatch",
  );
  const grants = await tx.$queryRaw<
    { browser_execute: boolean; public_execute: boolean }[]
  >`
    SELECT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN ('anon','authenticated')
      AND has_function_privilege(r.oid,
        'public.eywa_transfer_owned_roster(uuid,uuid,uuid)'::regprocedure,'EXECUTE')) AS browser_execute,
      EXISTS(SELECT 1 FROM pg_proc p,
        LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
        WHERE p.oid='public.eywa_transfer_owned_roster(uuid,uuid,uuid)'::regprocedure
          AND a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute`;
  ensure(
    !grants[0].browser_execute && !grants[0].public_execute,
    "Browser/public execution privilege remains",
  );
  return { functions, grants: grants[0], counts: await counts(tx) };
}
async function main() {
  const apply = process.argv.includes("--apply");
  const check = process.argv.includes("--verify");
  ensure(!(apply && check), "Choose apply or verify");
  ensure(
    !apply || process.env.ALLOW_SHARED_IMPORT === "1",
    "Apply requires ALLOW_SHARED_IMPORT=1",
  );
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  ensure(url, "Explicit database URL required");
  const db = new PrismaClient({ datasources: { db: { url } }, log: [] });
  try {
    let evidence: unknown;
    try {
      evidence = await db.$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe("SET LOCAL lock_timeout='10s'");
          await tx.$executeRawUnsafe("SET LOCAL statement_timeout='45s'");
          if (check) {
            await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
            return verify(tx);
          }
          await tx.$executeRawUnsafe(
            "SELECT pg_advisory_xact_lock(hashtextextended('eywa-managed-receiver-migrations',0))",
          );
          await checkPrerequisites(tx);
          ensure(
            (await history(tx, migration)).length === 0,
            "Roster migration history already exists; use --verify",
          );
          const before = await counts(tx);
          for (const statement of statements)
            await tx.$executeRawUnsafe(statement);
          await tx.$executeRaw`
          INSERT INTO public._prisma_migrations(id,checksum,migration_name,finished_at,applied_steps_count)
          VALUES (${randomUUID()},${checksum},${migration},now(),1)`;
          const after = await verify(tx);
          ensure(
            JSON.stringify(before) === JSON.stringify(after.counts),
            "Business row counts changed",
          );
          const result = { before, after };
          if (!apply) throw new DryRunRollback(result);
          return result;
        },
        { timeout: 90000, maxWait: 10000, isolationLevel: "RepeatableRead" },
      );
    } catch (error) {
      if (!(error instanceof DryRunRollback)) throw error;
      evidence = error.evidence;
      ensure(
        (await history(db, migration)).length === 0,
        "Dry-run history was not rolled back",
      );
    }
    console.log(
      JSON.stringify(
        {
          mode: check ? "verified" : apply ? "applied" : "dry_run_rolled_back",
          at: new Date().toISOString(),
          migration,
          checksum,
          statements: statements.length,
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
  console.error(
    error instanceof CheckFailure
      ? error.message
      : "Roster migration operation failed; transaction rolled back. No database details logged.",
  );
  process.exitCode = 1;
});
