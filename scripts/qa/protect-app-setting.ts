import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient, type Prisma } from "@prisma/client";
const migration = "20261007022000_app_setting_server_only";
const sql = readFileSync(
  `prisma/migrations/${migration}/migration.sql`,
  "utf8",
);
const apply = process.argv.includes("--apply");
if (apply && process.env.ALLOW_SHARED_IMPORT !== "1")
  throw new Error("Apply requires ALLOW_SHARED_IMPORT=1 and --apply.");
const db = new PrismaClient();
class DryRun extends Error {}
async function fingerprint(tx: Prisma.TransactionClient) {
  return tx.$queryRaw<
    { count: number; digest: string | null }[]
  >`SELECT count(*)::int AS count,
    md5(string_agg(key || value::text || updated_at::text || coalesce(updated_by_id::text, ''), '|' ORDER BY key)) AS digest FROM public.app_setting`;
}
async function main() {
  try {
    await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
        const before = await fingerprint(tx);
        const actor = await tx.$queryRaw<
          { bypass: boolean; owner: boolean }[]
        >`SELECT r.rolbypassrls AS bypass,
      pg_get_userbyid(c.relowner)=current_user AS owner FROM pg_roles r JOIN pg_class c ON c.relname='app_setting'
      JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public' WHERE r.rolname=current_user`;
        if (!actor[0]?.bypass && !actor[0]?.owner)
          throw new Error("The server role would lose settings access.");
        for (const statement of sql
          .split("\n")
          .filter((line) => !line.trim().startsWith("--"))
          .join("\n")
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean))
          await tx.$executeRawUnsafe(statement);
        const verification = await tx.$queryRaw<
          { rls: boolean; publicRead: boolean; publicWrite: boolean }[]
        >`SELECT c.relrowsecurity AS rls,
      has_table_privilege('anon',c.oid,'SELECT') OR has_table_privilege('authenticated',c.oid,'SELECT') AS "publicRead",
      has_table_privilege('anon',c.oid,'INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE') AS "publicWrite"
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relname='app_setting' AND n.nspname='public'`;
        if (
          !verification[0]?.rls ||
          verification[0].publicRead ||
          verification[0].publicWrite
        )
          throw new Error("Public settings access remains open.");
        if (JSON.stringify(before) !== JSON.stringify(await fingerprint(tx)))
          throw new Error("Settings rows changed unexpectedly.");
        const recorded = await tx.$queryRaw<
          { checksum: string }[]
        >`SELECT checksum FROM _prisma_migrations WHERE migration_name=${migration} AND rolled_back_at IS NULL`;
        const checksum = createHash("sha256")
          .update(sql.replaceAll("\r", ""))
          .digest("hex");
        if (recorded.length && recorded[0]!.checksum !== checksum)
          throw new Error("Migration checksum differs.");
        if (!recorded.length)
          await tx.$executeRaw`INSERT INTO _prisma_migrations (id,checksum,finished_at,migration_name,logs,rolled_back_at,started_at,applied_steps_count)
      VALUES (${randomUUID()},${checksum},now(),${migration},NULL,NULL,now(),1)`;
        console.log(
          JSON.stringify(
            { applied: apply, verification, rowsPreserved: before[0]?.count },
            null,
            2,
          ),
        );
        if (!apply) throw new DryRun();
      },
      { timeout: 30_000 },
    );
  } catch (error) {
    if (error instanceof DryRun) console.log("Dry run rolled back.");
    else throw error;
  } finally {
    await db.$disconnect();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
