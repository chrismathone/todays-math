/** Install only the private source-script table, with a reviewed file hash. Default rolls back. */
import { PrismaClient, Prisma } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { fileSha256 } from "./client.mjs";
import { requireProof } from "./import-plan.mjs";

const migration = "20261005142000_listening_source_transcripts";
const { values } = parseArgs({
  options: {
    file: { type: "string" },
    sha256: { type: "string" },
    apply: { type: "boolean", default: false },
  },
});
requireProof(
  values.file && /^[a-f0-9]{64}$/.test(values.sha256 ?? ""),
  "Reviewed migration file and exact SHA required",
);
const path = resolve(values.file!);
requireProof(
  path.replaceAll("\\", "/").endsWith("/" + migration + "/migration.sql"),
  "Wrong migration file",
);
requireProof(
  (await fileSha256(path)) === values.sha256,
  "Reviewed migration SQL changed",
);
const sql = await readFile(path, "utf8");
const checksum = createHash("sha256")
  .update(sql.replaceAll("\r", ""))
  .digest("hex");
const statements = sql
  .split(/^-- statement\s*$/m)
  .map((part) => part.trim())
  .filter(Boolean);
requireProof(
  statements.length === 9 &&
    statements[0].includes(
      "CREATE TABLE public.english_listening_source_transcript (",
    ),
  "Unexpected migration statement scope",
);
let url: URL;
try {
  url = new URL(process.env.DIRECT_URL ?? "");
} catch {
  throw new Error("DB configuration is missing");
}
requireProof(
  (decodeURIComponent(url.username) === "postgres.jyaguxwuaxgdnovtulna" &&
    url.hostname.endsWith(".pooler.supabase.com")) ||
    (url.hostname === "db.jyaguxwuaxgdnovtulna.supabase.co" &&
      url.username === "postgres"),
  "Wrong target DB project",
);
url.searchParams.set("connection_limit", "1");
url.searchParams.set("pool_timeout", "60");
const db = new PrismaClient({
  datasources: { db: { url: url.toString() } },
  log: [],
});
class DryRollback extends Error {}
async function verify(tx: Prisma.TransactionClient) {
  const [row] = await tx.$queryRaw<
    {
      rls: boolean;
      policies: number;
      checks: number;
      restrict_fks: number;
      immutable_trigger: boolean;
      columns: number;
    }[]
  >`SELECT c.relrowsecurity AS rls,
    (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid=c.oid) AS policies,
    (SELECT count(*)::int FROM pg_constraint k WHERE k.conrelid=c.oid AND k.contype='c') AS checks,
    (SELECT count(*)::int FROM pg_constraint k WHERE k.conrelid=c.oid AND k.contype='f' AND k.confdeltype='r') AS restrict_fks,
    EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=c.oid AND t.tgname='english_listening_source_transcript_immutable' AND t.tgenabled='O') AS immutable_trigger,
    (SELECT count(*)::int FROM information_schema.columns WHERE table_schema='public' AND table_name=c.relname) AS columns
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='english_listening_source_transcript'`;
  requireProof(
    row?.rls &&
      row.policies === 0 &&
      row.checks === 10 &&
      row.restrict_fks === 3 &&
      row.immutable_trigger &&
      row.columns === 19,
    "Private source transcript schema or protection differs",
  );
  const roles = await tx.$queryRaw<
    {
      rolname: string;
      can_read: boolean;
      can_write: boolean;
      can_execute: boolean;
    }[]
  >`SELECT rolname,
    has_table_privilege(rolname,'public.english_listening_source_transcript','SELECT') AS can_read,
    has_table_privilege(rolname,'public.english_listening_source_transcript','INSERT,UPDATE,DELETE,TRUNCATE') AS can_write,
    has_function_privilege(rolname,'public.english_listening_source_transcript_immutable()','EXECUTE') AS can_execute
    FROM pg_roles WHERE rolname IN ('anon','authenticated') ORDER BY rolname`;
  requireProof(
    roles.length === 2 &&
      roles.every(
        (role) => !role.can_read && !role.can_write && !role.can_execute,
      ),
    "Direct client access to private transcripts is not denied",
  );
  return {
    rls: true,
    clientPolicies: 0,
    clientRolesDenied: roles.map((role) => role.rolname),
    immutable: true,
    checks: row.checks,
    restrictForeignKeys: 3,
    columns: row.columns,
  };
}
try {
  let report: unknown;
  try {
    await db.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'");
        await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '20s'");
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(10052026,142000)::text`;
        const prior = await tx.$queryRaw<
          { checksum: string; finished_at: Date | null }[]
        >`SELECT checksum,finished_at FROM _prisma_migrations
        WHERE migration_name=${migration} AND rolled_back_at IS NULL`;
        if (prior.length) {
          requireProof(
            prior.length === 1 &&
              prior[0].checksum === checksum &&
              prior[0].finished_at,
            "Existing migration receipt differs",
          );
        } else {
          for (const statement of statements)
            await tx.$executeRawUnsafe(statement);
          await tx.$executeRaw`INSERT INTO _prisma_migrations
          (id,checksum,migration_name,finished_at,applied_steps_count)
          VALUES(${randomUUID()},${checksum},${migration},now(),1)`;
        }
        report = await verify(tx);
        if (!values.apply) throw new DryRollback();
      },
      { timeout: 45000, maxWait: 10000 },
    );
  } catch (error) {
    if (!(error instanceof DryRollback)) throw error;
  }
  console.log(
    JSON.stringify({
      migration,
      checksum,
      project: "jyaguxwuaxgdnovtulna",
      applied: values.apply,
      rolledBack: !values.apply,
      statements: statements.length,
      protection: report,
    }),
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Private script migration failed",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
