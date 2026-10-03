/** Run only this additive migration. Default is read-only validation.
 * LISTENING_DATABASE_URL=<explicit URL> npx tsx .../apply-migration.ts --dry-run
 * LISTENING_DATABASE_URL=<explicit URL> npx tsx .../apply-migration.ts --apply
 * Non-loopback mutation additionally requires ALLOW_SHARED_IMPORT=1 after approval.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient, type Prisma } from "@prisma/client";

export const LISTENING_MIGRATION = "20261003120000_english_listening";
export const listeningTables = [
  "set",
  "publication",
  "assignment",
  "assignment_revision",
  "target",
  "attempt",
  "receipt",
  "release",
  "broadcast",
  "audit",
  "media_asset",
  "media_blob",
].map((name) => "english_listening_" + name);
export function listeningMigrationStatements() {
  return readFileSync(
    `prisma/migrations/${LISTENING_MIGRATION}/migration.sql`,
    "utf8",
  )
    .replaceAll("\r", "")
    .split(/^-- statement\s*$/m)
    .slice(1)
    .map((s) => s.trim())
    .filter(Boolean);
}
export async function checkListeningSchema(tx: Prisma.TransactionClient) {
  const tables = await tx.$queryRaw<
    { name: string; rls: boolean }[]
  >`SELECT c.relname AS name,c.relrowsecurity AS rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=current_schema() AND c.relname LIKE 'english_listening_%' AND c.relkind='r'`;
  for (const name of listeningTables)
    if (!tables.some((t) => t.name === name && t.rls))
      throw new Error(`Missing table/RLS: ${name}`);
  const nullable = await tx.$queryRaw<
    { is_nullable: string }[]
  >`SELECT is_nullable FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='english_listening_set' AND column_name='branch_id'`;
  if (nullable[0]?.is_nullable !== "YES")
    throw new Error("Standalone nullable branch scope missing");
  const constraints = await tx.$queryRaw<
    { table: string; kind: string; definition: string }[]
  >`SELECT c.relname AS table,k.contype::text AS kind,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=current_schema() AND c.relname LIKE 'english_listening_%'`;
  for (const table of listeningTables)
    if (!constraints.some((c) => c.table === table && c.kind === "p"))
      throw new Error(`Missing primary key: ${table}`);
  for (const table of [
    "publication",
    "assignment",
    "target",
    "attempt",
    "receipt",
    "release",
    "broadcast",
    "media_asset",
    "media_blob",
  ])
    if (
      !constraints.some(
        (c) =>
          c.table === "english_listening_" + table &&
          c.kind === "f" &&
          c.definition.includes("RESTRICT"),
      )
    )
      throw new Error(`Missing restrictive FK: ${table}`);
  if (
    !constraints.some(
      (c) =>
        c.table === "english_listening_attempt" &&
        c.definition === "UNIQUE (assignment_id, student_id, ordinal)",
    )
  )
    throw new Error("Missing initial attempt uniqueness");
  if (
    !constraints.some(
      (c) =>
        c.table === "english_listening_media_blob" &&
        c.definition.includes("octet_length"),
    )
  )
    throw new Error("Missing blob byte length check");
  const triggers = await tx.$queryRaw<
    { name: string }[]
  >`SELECT tgname AS name FROM pg_trigger WHERE tgrelid='english_listening_publication'::regclass AND NOT tgisinternal`;
  if (
    !triggers.some((t) => t.name === "english_listening_publication_immutable")
  )
    throw new Error("Missing immutable publication trigger");
  const grants = await tx.$queryRaw<
    { table_name: string }[]
  >`SELECT table_name FROM information_schema.role_table_grants WHERE table_schema=current_schema() AND table_name LIKE 'english_listening_%' AND grantee IN ('PUBLIC','anon','authenticated')`;
  if (grants.length)
    throw new Error("Public/client role table privileges remain");
  return {
    tables: listeningTables.length,
    constraints: constraints.length,
    immutablePublication: true,
    publicGrants: 0,
  };
}
async function main() {
  const url = process.env.LISTENING_DATABASE_URL;
  if (!url)
    throw new Error(
      "LISTENING_DATABASE_URL must explicitly select the database; DATABASE_URL is never used as fallback",
    );
  const apply = process.argv.includes("--apply"),
    dry = process.argv.includes("--dry-run");
  if (apply && dry) throw new Error("Choose --apply or --dry-run");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(url).hostname,
  );
  if ((apply || dry) && !local && process.env.ALLOW_SHARED_IMPORT !== "1")
    throw new Error(
      "Shared database mutation needs explicit approved ALLOW_SHARED_IMPORT=1",
    );
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const rollback = new Error("LISTENING_DRY_RUN_ROLLBACK");
  let evidence: unknown;
  try {
    if (!apply && !dry) {
      evidence = await prisma.$transaction(checkListeningSchema);
    } else
      await prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('english-listening-migration',0))`;
          const before = await tx.$queryRaw<
            { name: string; count: bigint }[]
          >`SELECT 'user' AS name,count(*) FROM "user" UNION ALL SELECT 'class',count(*) FROM "class" UNION ALL SELECT 'student',count(*) FROM student`;
          const exists = await tx.$queryRaw<
            { found: boolean }[]
          >`SELECT to_regclass('english_listening_set') IS NOT NULL AS found`;
          if (!exists[0].found)
            for (const statement of listeningMigrationStatements())
              await tx.$executeRawUnsafe(statement);
          evidence = await checkListeningSchema(tx);
          const after = await tx.$queryRaw<
            { name: string; count: bigint }[]
          >`SELECT 'user' AS name,count(*) FROM "user" UNION ALL SELECT 'class',count(*) FROM "class" UNION ALL SELECT 'student',count(*) FROM student`;
          if (before.some((row, index) => row.count !== after[index].count))
            throw new Error("Existing row counts changed");
          const checksum = createHash("sha256")
            .update(
              readFileSync(
                `prisma/migrations/${LISTENING_MIGRATION}/migration.sql`,
                "utf8",
              ).replaceAll("\r", ""),
            )
            .digest("hex");
          await tx.$executeRawUnsafe(
            'CREATE TABLE IF NOT EXISTS "_prisma_migrations" (id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, finished_at timestamptz, migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz, started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0)',
          );
          const prior = await tx.$queryRaw<
            { checksum: string }[]
          >`SELECT checksum FROM _prisma_migrations WHERE migration_name=${LISTENING_MIGRATION} AND rolled_back_at IS NULL`;
          if (prior.length && prior[0].checksum !== checksum)
            throw new Error("Migration checksum mismatch");
          if (!prior.length)
            await tx.$executeRaw`INSERT INTO _prisma_migrations(id,checksum,migration_name,finished_at,applied_steps_count) VALUES(${randomUUID()},${checksum},${LISTENING_MIGRATION},now(),1)`;
          if (dry) throw rollback;
        },
        { timeout: 30000 },
      );
    console.log(
      JSON.stringify({
        mode: apply ? "applied" : "checked",
        ...(evidence as object),
      }),
    );
  } catch (error) {
    if (error !== rollback) throw error;
    console.log(
      JSON.stringify({ mode: "dry-run-rolled-back", ...(evidence as object) }),
    );
  } finally {
    await prisma.$disconnect();
  }
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/apply-migration.ts"))
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Migration failed");
    process.exitCode = 1;
  });
