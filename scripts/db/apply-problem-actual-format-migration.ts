/** Default: READ ONLY catalog preflight. Only a lead-reviewed
 * ALLOW_SHARED_IMPORT=1 ... --apply may execute the DDL, in one transaction.
 * Records the exact checksum in _prisma_migrations; never invokes migrate deploy.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { hasFormatColumns, MIGRATION_NAME, MIGRATION_PATH, readOnly, safeCode, sha256, splitMigration, type SqlClient } from "./problem-actual-format";

export const FORMAT_INDEXES = ["problem_pool_actual_format_id_idx", "problem_pool_unit_actual_format_code_id_idx", "problem_pool_material_actual_format_number_id_idx"];
export async function formatCatalog(tx: SqlClient) {
  const columns = await hasFormatColumns(tx);
  const columnDetails = await tx.$queryRaw<{ name: string; type: string; required: boolean; defaultExpression: string | null }[]>`
    SELECT a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS required,pg_get_expr(d.adbin,d.adrelid) AS "defaultExpression"
    FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid='public.problem'::regclass AND NOT a.attisdropped AND a.attname IN ('actual_format','actual_format_version','actual_format_digest')`;
  const history = await tx.$queryRaw<{ checksum: string; finished_at: Date | null; rolled_back_at: Date | null }[]>`
    SELECT checksum,finished_at,rolled_back_at FROM public._prisma_migrations WHERE migration_name=${MIGRATION_NAME}`;
  const checks = await tx.$queryRaw<{ name: string; definition: string; validated: boolean }[]>`SELECT conname AS name,
    pg_get_constraintdef(oid) AS definition,convalidated AS validated FROM pg_constraint
    WHERE conrelid='public.problem'::regclass AND conname IN ('problem_actual_format_check','problem_actual_format_complete_check')`;
  const triggers = await tx.$queryRaw<{ name: string; enabled: string; definition: string }[]>`SELECT tgname AS name,tgenabled::text AS enabled,
    pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid='public.problem'::regclass AND NOT tgisinternal ORDER BY tgname`;
  const indexes = await tx.$queryRaw<{ name: string; definition: string }[]>`SELECT indexname AS name,indexdef AS definition FROM pg_indexes
    WHERE schemaname='public' AND tablename='problem' AND indexname IN
      ('problem_pool_actual_format_id_idx','problem_pool_unit_actual_format_code_id_idx','problem_pool_material_actual_format_number_id_idx')`;
  const functions = await tx.$queryRaw<{ source: string; securityDefiner: boolean }[]>`SELECT p.prosrc AS source,p.prosecdef AS "securityDefiner"
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='invalidate_problem_actual_format' AND p.pronargs=0`;
  const [proof] = await tx.$queryRaw<{ present: boolean }[]>`SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='problem' AND column_name='question_group_key') AS present`;
  return { columns, columnDetails, history, checks, triggers, indexes, functions, questionGroupKeyPresent: proof.present };
}

export function validateCatalog(catalog: Awaited<ReturnType<typeof formatCatalog>>, checksum: string): "pending" | "applied" {
  if (!catalog.questionGroupKeyPresent) throw new Error("QUESTION_IDENTITY_READER_FLOOR_REQUIRED");
  const proof = catalog.triggers.find((t) => t.name === "problem_question_group_invalidate");
  if (!proof || proof.enabled !== "O") throw new Error("QUESTION_IDENTITY_TRIGGER_REQUIRED");
  const own = catalog.triggers.filter((t) => t.name === "problem_zz_actual_format_invalidate");
  if (catalog.history.length === 0 && !catalog.columns && !catalog.checks.length && !own.length && !catalog.indexes.length && !catalog.functions.length) return "pending";
  const expectedTypes: Record<string, string> = { actual_format: "character varying(20)", actual_format_version: "character varying(96)", actual_format_digest: "character(64)" };
  const raw = readFileSync(MIGRATION_PATH, "utf8").replaceAll("\r", "");
  const expectedSource = raw.match(/AS \$\$([\s\S]*?)\$\$/)?.[1].trim();
  const normalizeIndex = (s: string) => s.replaceAll('"', "").replace(" USING btree", "").replace(/\s+/g, " ").trim().replace(/;$/, "");
  const expectedIndexes = splitMigration(raw).filter((s) => /^CREATE INDEX/.test(s)).map(normalizeIndex);
  const shapeMatches = catalog.columnDetails.length === 3 && catalog.columnDetails.every((c) =>
    expectedTypes[c.name] === c.type && !c.required && c.defaultExpression === null)
    && catalog.functions.length === 1 && !catalog.functions[0].securityDefiner && catalog.functions[0].source.trim() === expectedSource
    && catalog.checks.every((c) => c.validated)
    && catalog.indexes.every((i) => expectedIndexes.includes(normalizeIndex(i.definition)));
  if (catalog.history.length === 1 && catalog.history[0].checksum === checksum && catalog.history[0].finished_at && !catalog.history[0].rolled_back_at
    && catalog.columns && shapeMatches && catalog.checks.length === 2 && own.length === 1 && own[0].enabled === "O"
    && /BEFORE UPDATE ON .*problem FOR EACH ROW EXECUTE FUNCTION (public\.)?invalidate_problem_actual_format\(\)/.test(own[0].definition)
    && catalog.indexes.length === 3)
    return "applied";
  throw new Error("FORMAT_MIGRATION_CATALOG_MISMATCH");
}
async function main() {
  const args = process.argv.slice(2);
  if (args.some((a) => a !== "--apply") || args.length > 1) throw new Error("UNKNOWN_ARGUMENT");
  const apply = args.includes("--apply");
  if (apply && process.env.ALLOW_SHARED_IMPORT !== "1") throw new Error("SHARED_WRITE_GATE_CLOSED");
  const raw = readFileSync(MIGRATION_PATH, "utf8");
  const statements = splitMigration(raw), checksum = sha256(raw.replaceAll("\r", ""));
  if (statements.length !== 7) throw new Error("MIGRATION_STATEMENT_COUNT_MISMATCH");
  const db = new PrismaClient({ log: [] });
  try {
    const before = await readOnly(db, (tx) => formatCatalog(tx));
    const status = validateCatalog(before, checksum);
    console.log(JSON.stringify({ mode: apply ? "apply" : "read-only-preflight", migration: MIGRATION_NAME, checksum, statements: statements.length,
      status, columnsPresent: before.columns, checks: before.checks.length, indexes: before.indexes.length,
      questionGroupKeyPresent: before.questionGroupKeyPresent, triggers: before.triggers.map((t) => ({ name: t.name, enabled: t.enabled })) }, null, 2));
    if (!apply || status === "applied") return;
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL lock_timeout='3s'`;
      await tx.$executeRaw`SET LOCAL statement_timeout='60s'`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261019,120000)`;
      if (validateCatalog(await formatCatalog(tx), checksum) !== "pending") throw new Error("MIGRATION_ALREADY_APPLIED_CONCURRENTLY");
      for (const statement of statements) await tx.$executeRawUnsafe(statement);
      await tx.$executeRaw`INSERT INTO public._prisma_migrations
        (id,checksum,finished_at,migration_name,logs,rolled_back_at,started_at,applied_steps_count)
        VALUES (${randomUUID()},${checksum},now(),${MIGRATION_NAME},NULL,NULL,now(),1)`;
      if (validateCatalog(await formatCatalog(tx), checksum) !== "applied") throw new Error("MIGRATION_POSTCHECK_FAILED");
    }, { timeout: 120_000, maxWait: 20_000 });
    console.log("문항 형식 칸·트리거·인덱스·Prisma 이력 적용 완료. 백필은 별도 명령이다.");
  } finally { await db.$disconnect(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((error) => { console.error(`문항 형식 DDL 실패: ${safeCode(error)}`); process.exitCode = 1; });
