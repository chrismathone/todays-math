/** Classifier-version transition for the bank revision counter (DB first).
 * Default: READ ONLY preflight — prints how many shared rows sit on each version and whether the
 * new classifier agrees with every stored fact. Only the lead may run ALLOW_SHARED_IMPORT=1 --apply.
 *
 *   npx tsx --env-file=<env> scripts/db/apply-bank-format-version-migration.ts [--report <json>]
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=<env> scripts/db/apply-bank-format-version-migration.ts --apply
 *
 * Apply = ONE transaction: lock_timeout 3s · advisory lock · the migration's LOCK (four tables,
 * SHARE ROW EXCLUSIVE) · re-classify every row on the previous version with the new classifier and
 * refuse on any changed fact · the migration's DO block (recount = previous count, else RAISE) ·
 * exact Prisma history row · post-check of catalog and counter. Any failure rolls everything back.
 * Never runs prisma migrate deploy.
 */
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { ACTUAL_FORMAT_VERSION } from "../../src/lib/problem/actualFormat";
import {
  BANK_REVISION_BAKED_VERSION, BANK_REVISION_PATH, FORMAT_TRANSITION_MIGRATION,
  bankRevisionCatalog, validateBankRevisionCatalog, verifyBankRevisionCounter,
} from "./apply-bank-read-revision-migration";
import {
  FORMAT_VALUES, ROOT, classifyFact, hasFormatColumns, readOnly, readPage, safeCode, sha256,
  splitMigration, type SqlClient,
} from "./problem-actual-format";

export { FORMAT_TRANSITION_MIGRATION };
export const FORMAT_TRANSITION_PATH = resolve(ROOT, "prisma/migrations", FORMAT_TRANSITION_MIGRATION, "migration.sql");
export const FORMAT_TRANSITION_FROM = BANK_REVISION_BAKED_VERSION;
export const FORMAT_TRANSITION_TO = ACTUAL_FORMAT_VERSION;

export type TransitionScan = {
  rows: number; unstamped: number; atFrom: number; atTo: number; otherVersion: number;
  agree: number; formatChanged: number; digestChanged: number;
  byFormat: Record<string, number>;
  /** Changed facts — hashed ids only (row contents never leave the database). */
  changes: { rowHash: string; from: string; to: string; digestChanged: boolean }[];
};

/** Re-classify every shared row stamped with the previous version. Read only. */
export async function scanTransition(tx: SqlClient, batchSize = 500): Promise<TransitionScan> {
  if (!(await hasFormatColumns(tx))) throw new Error("FORMAT_COLUMNS_MISSING");
  const scan: TransitionScan = {
    rows: 0, unstamped: 0, atFrom: 0, atTo: 0, otherVersion: 0, agree: 0, formatChanged: 0, digestChanged: 0,
    byFormat: Object.fromEntries(FORMAT_VALUES.map((f) => [f, 0])), changes: [],
  };
  let cursor: string | null = null;
  while (true) {
    const page = await readPage(tx, cursor, batchSize, true);
    if (!page.length) break;
    for (const row of page) {
      scan.rows++;
      if (row.actualFormat === null) scan.unstamped++;
      else if (row.actualFormatVersion === FORMAT_TRANSITION_TO) scan.atTo++;
      else if (row.actualFormatVersion !== FORMAT_TRANSITION_FROM) scan.otherVersion++;
      else {
        scan.atFrom++;
        const fact = classifyFact(row, FORMAT_TRANSITION_TO);
        const formatChanged = fact.actualFormat !== row.actualFormat;
        const digestChanged = fact.actualFormatDigest !== row.actualFormatDigest;
        if (formatChanged) scan.formatChanged++;
        if (digestChanged) scan.digestChanged++;
        if (!formatChanged && !digestChanged) {
          scan.agree++;
          scan.byFormat[fact.actualFormat] = (scan.byFormat[fact.actualFormat] ?? 0) + 1;
        } else if (scan.changes.length < 50)
          scan.changes.push({ rowHash: sha256(row.id).slice(0, 16), from: row.actualFormat!, to: fact.actualFormat, digestChanged });
      }
    }
    cursor = page[page.length - 1].id;
  }
  return scan;
}

/** Restamping only renames the version when every stored fact is what the new classifier says. */
export function assertTransitionSafe(scan: TransitionScan) {
  if (scan.formatChanged || scan.digestChanged) throw new Error("FORMAT_TRANSITION_FACT_CHANGED");
  if (scan.agree !== scan.atFrom) throw new Error("FORMAT_TRANSITION_SCAN_INCONSISTENT");
}

export async function transitionHistory(tx: SqlClient) {
  return tx.$queryRaw<{ checksum: string; finished_at: Date | null; rolled_back_at: Date | null }[]>`
    SELECT checksum,finished_at,rolled_back_at FROM public._prisma_migrations WHERE migration_name=${FORMAT_TRANSITION_MIGRATION}`;
}

/** "pending" — the base install carries the baked version and no transition history.
 *  "applied" — the singleton carries the current version and the exact history row exists. */
export async function transitionStatus(tx: SqlClient, checksum: string, baseChecksum: string): Promise<"pending" | "applied"> {
  const history = await transitionHistory(tx);
  const catalog = await bankRevisionCatalog(tx);
  if (!history.length) {
    if (validateBankRevisionCatalog(catalog, baseChecksum, FORMAT_TRANSITION_FROM) !== "applied")
      throw new Error("BANK_REVISION_BASE_NOT_APPLIED");
    return "pending";
  }
  if (history.length === 1 && history[0].checksum === checksum && history[0].finished_at && !history[0].rolled_back_at
    && validateBankRevisionCatalog(catalog, baseChecksum, FORMAT_TRANSITION_TO) === "applied") return "applied";
  throw new Error("FORMAT_TRANSITION_CATALOG_MISMATCH");
}

export function readTransitionMigration() {
  const raw = readFileSync(FORMAT_TRANSITION_PATH, "utf8");
  const statements = splitMigration(raw);
  // The draft names exactly the two versions this checkout knows. A later parser change moves
  // ACTUAL_FORMAT_VERSION again and must ship its own transition — fail closed here.
  if (statements.length !== 2 || !raw.includes(`'${FORMAT_TRANSITION_FROM}'`) || !raw.includes(`'${FORMAT_TRANSITION_TO}'`))
    throw new Error("FORMAT_TRANSITION_MIGRATION_CHANGED");
  return { raw, statements, checksum: sha256(raw.replaceAll("\r", "")) };
}

async function main() {
  const args = process.argv.slice(2);
  let apply = false, report: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--apply") apply = true;
    else if (args[i] === "--report" && args[i + 1]) report = args[++i];
    else throw new Error("UNKNOWN_ARGUMENT");
  }
  if (apply && process.env.ALLOW_SHARED_IMPORT !== "1") throw new Error("SHARED_WRITE_GATE_CLOSED");
  const { statements, checksum } = readTransitionMigration();
  const baseChecksum = sha256(readFileSync(BANK_REVISION_PATH, "utf8").replaceAll("\r", ""));
  const db = new PrismaClient({ log: [] });
  try {
    const pre = await readOnly(db, async (tx) => {
      const status = await transitionStatus(tx, checksum, baseChecksum);
      await verifyBankRevisionCounter(tx);
      const [counter] = await tx.$queryRaw<{ invalid: string }[]>`SELECT invalid_format_count::text AS invalid FROM public.bank_read_revision WHERE id=1`;
      return { status, counter: counter.invalid, scan: await scanTransition(tx) };
    });
    const summary = {
      mode: apply ? "apply" : "read-only-preflight", migration: FORMAT_TRANSITION_MIGRATION, checksum,
      from: FORMAT_TRANSITION_FROM, to: FORMAT_TRANSITION_TO, status: pre.status, invalidFormatCount: pre.counter,
      ...pre.scan,
      willRestamp: pre.scan.atFrom,
      expectedCounterAfter: pre.counter,
      note: "판만 옮긴다(형식 · 입력 지문은 그대로). 재집계 수 = 옛 수가 아니면 마이그레이션이 RAISE 로 전체를 되돌린다.",
    };
    if (report) writeFileSync(report, JSON.stringify(summary, null, 2) + "\n");
    console.log(JSON.stringify({ ...summary, changes: summary.changes.length }));
    if (pre.status === "applied") return;
    assertTransitionSafe(pre.scan);
    if (!apply) return;
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL lock_timeout='3s'`;
      await tx.$executeRaw`SET LOCAL statement_timeout='120s'`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261021,90000)`;
      if (await transitionStatus(tx, checksum, baseChecksum) !== "pending") throw new Error("FORMAT_TRANSITION_APPLIED_CONCURRENTLY");
      await verifyBankRevisionCounter(tx);
      const [before] = await tx.$queryRaw<{ invalid: string }[]>`SELECT invalid_format_count::text AS invalid FROM public.bank_read_revision WHERE id=1`;
      await tx.$executeRawUnsafe(statements[0]); // LOCK — writers wait from here until COMMIT
      assertTransitionSafe(await scanTransition(tx)); // same snapshot as the restamp below
      await tx.$executeRawUnsafe(statements[1]); // DO block: guard · recount · restamp · recount = previous
      await tx.$executeRaw`INSERT INTO public._prisma_migrations
        (id,checksum,finished_at,migration_name,logs,rolled_back_at,started_at,applied_steps_count)
        VALUES (${randomUUID()},${checksum},now(),${FORMAT_TRANSITION_MIGRATION},NULL,NULL,now(),1)`;
      if (await transitionStatus(tx, checksum, baseChecksum) !== "applied") throw new Error("FORMAT_TRANSITION_POSTCHECK_FAILED");
      await verifyBankRevisionCounter(tx);
      const [after] = await tx.$queryRaw<{ invalid: string }[]>`SELECT invalid_format_count::text AS invalid FROM public.bank_read_revision WHERE id=1`;
      if (after.invalid !== before.invalid) throw new Error("FORMAT_TRANSITION_COUNT_CHANGED");
    }, { timeout: 300_000, maxWait: 20_000 });
    console.log("분류기 판 옮기기 완료 — singleton 과 형식 칸이 새 판입니다. BANK_READ_REVISION=on 이면 판 일치 길로 돌아옵니다.");
  } finally { await db.$disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((error) => { console.error(`FORMAT_TRANSITION_FAILED: ${safeCode(error)}`); process.exitCode = 1; });
