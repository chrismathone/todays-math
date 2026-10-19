/** Default is a database-enforced READ ONLY scan, including before the DDL exists.
 * npx tsx --env-file=<env> scripts/db/backfill-problem-actual-format.ts --report <json>
 * ALLOW_SHARED_IMPORT=1 ... --apply --state <durable-ledger.json>
 * No generated-client dependency on the new columns; never run prisma generate here.
 */
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { classifyFormat } from "../../src/lib/problem/provenance";
import { questionFormatWithoutContent } from "../../src/lib/problem/questionFormat";
import {
  cachedSelect, classifyFact, FORMAT_VALUES, formatInputDigest, formatRuleVersion,
  hasFormatColumns, inputSelect, matchesFact, readOnly, readPage, safeCode, sha256,
  visiblePool, MIGRATION_PATH, type FormatFact, type FormatRow, type SqlClient,
} from "./problem-actual-format";
import { formatCatalog, validateCatalog } from "./apply-problem-actual-format-migration";

type Sample = { rowHash: string; inputDigest: string; format: string; rereadMatch: boolean };
export async function scanBackfill(tx: SqlClient, batchSize = 500, observe?: (row: FormatRow, fact: FormatFact) => void) {
  const started = performance.now();
  const capturedAt = new Date().toISOString();
  const [server] = await tx.$queryRaw<{ version: string }[]>`SELECT current_setting('server_version') AS version`;
  const version = formatRuleVersion();
  const columnsPresent = await hasFormatColumns(tx);
  const counts = Object.fromEntries(FORMAT_VALUES.map((f) => [f, 0])) as Record<string, number>;
  const targets = { ...counts };
  const sampleRows: FormatRow[] = [];
  let rows = 0, alreadyCurrent = 0, evidenceMismatches = 0, shortcutRows = 0;
  let cursor: string | null = null, corpusDigest = sha256("problem-format-corpus-v1");
  while (true) {
    const page = await readPage(tx, cursor, batchSize, columnsPresent);
    if (!page.length) break;
    for (const row of page) {
      const actualFormat = classifyFormat(row);
      const fact: FormatFact = { actualFormat, actualFormatVersion: version, actualFormatDigest: formatInputDigest(row) };
      observe?.(row, fact);
      const shortcut = questionFormatWithoutContent(row);
      if (shortcut !== null) shortcutRows++;
      if (shortcut !== null && shortcut !== actualFormat) evidenceMismatches++;
      if (counts[actualFormat] < 3) sampleRows.push(row);
      counts[actualFormat]++;
      rows++;
      if (matchesFact(row, fact)) alreadyCurrent++;
      else targets[actualFormat]++;
      corpusDigest = sha256(`${corpusDigest}:${row.id}:${fact.actualFormatDigest}:${actualFormat}`);
    }
    cursor = page[page.length - 1].id;
  }
  const samples: Sample[] = [];
  for (const row of sampleRows) {
    const [again] = await tx.$queryRaw<FormatRow[]>(Prisma.sql`SELECT ${inputSelect},
      ${columnsPresent ? cachedSelect : Prisma.sql`NULL::text AS "actualFormat", NULL::text AS "actualFormatVersion", NULL::text AS "actualFormatDigest"`}
      FROM public.problem p WHERE p.id=${row.id}::uuid`);
    const format = classifyFormat(row);
    samples.push({ rowHash: sha256(row.id).slice(0, 16), inputDigest: formatInputDigest(row), format,
      rereadMatch: !!again && formatInputDigest(row) === formatInputDigest(again) && classifyFormat(again) === format });
  }
  const elapsedMs = Math.round(performance.now() - started);
  return {
    mode: "dry-run" as const, capturedAt, serverVersion: server.version, transactionReadOnly: true, scope: { pool: visiblePool },
    version, columnsPresent, rows, counts, targets, alreadyCurrent,
    unknown: counts.unknown, shortcutRows, evidenceMismatches, samples,
    sampleMismatches: samples.filter((s) => !s.rereadMatch).length, corpusDigest, elapsedMs,
    estimate: {
      readAndClassifyMs: elapsedMs,
      writeBatches: Math.ceil((rows - alreadyCurrent) / batchSize),
      assumedWriteBatchMs: 250,
      totalMsAtAssumedWriteBudget: elapsedMs + Math.ceil((rows - alreadyCurrent) / batchSize) * 250,
      note: "쓰기 시간은 측정값이 아닌 배치당 250ms 가정. 인덱스·잠금·네트워크·재시도 비용에 따라 달라짐.",
    },
  };
}

type Failure = { digest: string; attempts: number; code: string };
export type BackfillState = {
  kind: "problem-actual-format-backfill-v1"; databaseHash: string; version: string;
  failures: Record<string, Failure>; completed: boolean;
  resolvedFailures?: Record<string, { previous: Failure; reason: "already-current" | "out-of-scope" | "input-changed"; resolvedAt: string }>;
};

/** Reconcile historical failures against the FINAL read-only snapshot. A missing
 * shared row is out of scope; a valid result is resolved, not a permanent failure.
 * Changed but still-unfilled inputs get a fresh budget on the next run.
 */
export function reconcileFailures(state: BackfillState, observations: ReadonlyMap<string, { digest: string; current: boolean }>) {
  const counts = { alreadyCurrent: 0, outOfScope: 0, inputChanged: 0, unresolved: 0 };
  for (const [id, previous] of Object.entries(state.failures)) {
    const seen = observations.get(id);
    const reason = !seen ? "out-of-scope" : seen.current ? "already-current" : seen.digest !== previous.digest ? "input-changed" : null;
    if (!reason) { counts.unresolved++; continue; }
    (state.resolvedFailures ??= {})[id] = { previous, reason, resolvedAt: new Date().toISOString() };
    delete state.failures[id];
    if (reason === "out-of-scope") counts.outOfScope++;
    if (reason === "already-current") counts.alreadyCurrent++;
    if (reason === "input-changed") counts.inputChanged++;
  }
  return counts;
}

/** Resolve existing ancestors too, so a report through a directory symlink
 * cannot replace a state/journal/lock through another spelling of the same path.
 */
function canonicalFile(file: string): string {
  if (existsSync(file)) return realpathSync(file);
  const parent = dirname(file);
  return parent === file ? file : join(canonicalFile(parent), basename(file));
}
export function durableJson(file: string, value: unknown) {
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  const fd = openSync(temp, "w", 0o600);
  try { writeFileSync(fd, JSON.stringify(value, null, 2) + "\n"); fsyncSync(fd); }
  finally { closeSync(fd); }
  renameSync(temp, file);
  const dir = openSync(dirname(file), "r");
  try { fsyncSync(dir); } finally { closeSync(dir); }
}
function appendJournal(file: string, value: unknown) {
  const fd = openSync(file, "a", 0o600);
  try { writeFileSync(fd, JSON.stringify(value) + "\n"); fsyncSync(fd); }
  finally { closeSync(fd); }
}

/** A batch error gets isolated to individual rows; all failures survive restarts.
 * Retrying the same source stops at 3 attempts. A changed input gets a fresh budget.
 */
export async function retryChunk(
  rows: readonly FormatRow[], state: BackfillState,
  write: (rows: readonly FormatRow[]) => Promise<number>, persist: () => void,
): Promise<number> {
  const pending = rows.filter((r) => {
    const previous = state.failures[r.id];
    if (previous && previous.digest !== formatInputDigest(r)) delete state.failures[r.id];
    return (state.failures[r.id]?.attempts ?? 0) < 3;
  });
  if (!pending.length) return 0;
  try {
    const changed = await write(pending);
    for (const row of pending) delete state.failures[row.id];
    persist();
    return changed;
  } catch (error) {
    for (const row of pending) state.failures[row.id] = {
      digest: formatInputDigest(row), attempts: (state.failures[row.id]?.attempts ?? 0) + 1, code: safeCode(error),
    };
    persist();
    let changed = 0;
    for (const row of pending) changed += await retryChunk([row], state, write, persist);
    return changed;
  }
}

export async function updateLockedRows(tx: SqlClient, rows: readonly FormatRow[], version: string,
  journal: (entries: unknown) => void): Promise<number> {
  if (!rows.length) return 0;
  const current = await tx.$queryRaw<FormatRow[]>(Prisma.sql`SELECT ${inputSelect}, ${cachedSelect}
    FROM public.problem p WHERE p.id IN (${Prisma.join(rows.map((r) => Prisma.sql`${r.id}::uuid`))})
      AND p.pool=${visiblePool}::problem_pool ORDER BY p.id FOR UPDATE`);
  const patches = current.flatMap((row) => {
    // Rule hashes have no ordering. Never let an older checkout replace another
    // rule version merely because it reread and locked that newer result.
    if (row.actualFormatVersion !== null && row.actualFormatVersion !== version)
      throw new Error("FORMAT_EXISTING_VERSION_MISMATCH");
    const fact = classifyFact(row, version);
    return matchesFact(row, fact) ? [] : [{ row, fact }];
  });
  if (!patches.length) return 0;
  // Durable before-images precede SQL. On an ambiguous commit a restart rechecks
  // the persisted triple instead of trusting a cursor or a previous success counter.
  journal({ batchId: randomUUID(), loggedAt: new Date().toISOString(), entries: patches.map(({ row, fact }) => ({
    id: row.id, before: { actualFormat: row.actualFormat, actualFormatVersion: row.actualFormatVersion, actualFormatDigest: row.actualFormatDigest },
    after: fact,
  })) });
  const data = patches.map(({ row, fact }) => ({
    id: row.id, content: row.content, answer: row.answer, question_type: row.questionType ?? null,
    problem_type: row.problemType ?? null, family_key: row.familyKey, question_group_key: row.questionGroupKey,
    actual_format: fact.actualFormat, actual_format_version: fact.actualFormatVersion, actual_format_digest: fact.actualFormatDigest,
    before_format: row.actualFormat, before_version: row.actualFormatVersion, before_digest: row.actualFormatDigest,
  }));
  const written = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`WITH patch AS (
    SELECT * FROM jsonb_to_recordset(${JSON.stringify(data)}::jsonb) AS x(
      id uuid, content text, answer text, question_type text, problem_type text, family_key text, question_group_key text,
      actual_format text, actual_format_version text, actual_format_digest text, before_format text, before_version text, before_digest text)
    ) UPDATE public.problem p SET actual_format=x.actual_format, actual_format_version=x.actual_format_version, actual_format_digest=x.actual_format_digest
      FROM patch x WHERE p.id=x.id AND p.pool=${visiblePool}::problem_pool
      AND ROW(p.content,p.answer,p.question_type,p.problem_type,p.family_key,p.question_group_key)
        IS NOT DISTINCT FROM ROW(x.content,x.answer,x.question_type,x.problem_type,x.family_key,x.question_group_key)
      AND ROW(p.actual_format,p.actual_format_version,p.actual_format_digest)
        IS NOT DISTINCT FROM ROW(x.before_format,x.before_version,x.before_digest)
      RETURNING p.id::text AS id`);
  if (written.length !== patches.length) throw new Error("FORMAT_CAS_MISMATCH");
  const reread = await tx.$queryRaw<FormatRow[]>(Prisma.sql`SELECT ${inputSelect}, ${cachedSelect} FROM public.problem p
    WHERE p.id IN (${Prisma.join(written.map((r) => Prisma.sql`${r.id}::uuid`))})`);
  const expected = new Map(patches.map((p) => [p.row.id, p.fact]));
  if (reread.length !== patches.length || reread.some((row) =>
    !matchesFact(row, classifyFact(row, version)) || !matchesFact(row, expected.get(row.id)!)))
    throw new Error("FORMAT_ROUNDTRIP_MISMATCH");
  // updated_at, question_group_key, eligibility and every source column are untouched.
  return written.length;
}

export function parseBackfillArgs(args: string[], env: { ALLOW_SHARED_IMPORT?: string } = { ALLOW_SHARED_IMPORT: process.env.ALLOW_SHARED_IMPORT }) {
  let apply = false, batchSize = 500, stateFile: string | undefined, reportFile: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--apply") apply = true;
    else if (["--batch-size", "--state", "--report"].includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error("MISSING_ARGUMENT_VALUE");
      if (arg === "--batch-size") batchSize = Number(value);
      if (arg === "--state") stateFile = resolve(value);
      if (arg === "--report") reportFile = resolve(value);
    } else throw new Error("UNKNOWN_ARGUMENT");
  }
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 5000) throw new Error("INVALID_BATCH_SIZE");
  if (apply && env.ALLOW_SHARED_IMPORT !== "1") throw new Error("SHARED_WRITE_GATE_CLOSED");
  if (apply && !stateFile) throw new Error("APPLY_REQUIRES_STATE_FILE");
  if (stateFile) {
    const reserved = [stateFile, `${stateFile}.lock`, `${stateFile}.before.jsonl`].map(canonicalFile);
    if (new Set(reserved).size !== reserved.length || (reportFile && reserved.includes(canonicalFile(reportFile))))
      throw new Error("REPORT_STATE_PATH_COLLISION");
  }
  return { apply, batchSize, stateFile, reportFile };
}

async function main() {
  const args = parseBackfillArgs(process.argv.slice(2)); // guard before even constructing a client
  const db = new PrismaClient({ log: [] });
  try {
    const preflight = await readOnly(db, (tx) => scanBackfill(tx, args.batchSize));
    if (args.reportFile) durableJson(args.reportFile, preflight);
    console.log(JSON.stringify(preflight, null, 2));
    if (preflight.evidenceMismatches || preflight.sampleMismatches) throw new Error("BACKFILL_PREFLIGHT_MISMATCH");
    if (!args.apply) return;
    if (!preflight.columnsPresent) throw new Error("MIGRATION_REQUIRED");
    const migrationChecksum = sha256(readFileSync(MIGRATION_PATH, "utf8").replaceAll("\r", ""));
    if (validateCatalog(await readOnly(db, (tx) => formatCatalog(tx)), migrationChecksum) !== "applied")
      throw new Error("VERIFIED_MIGRATION_REQUIRED");
    const stateFile = args.stateFile!;
    mkdirSync(dirname(stateFile), { recursive: true });
    const lockFile = `${stateFile}.lock`;
    const lock = openSync(lockFile, "wx", 0o600);
    try {
      writeFileSync(lock, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }) + "\n");
      fsyncSync(lock);
      const [{ database }] = await db.$queryRaw<{ database: string }[]>`SELECT current_database() || ':' || current_schema() || ':' || coalesce(inet_server_addr()::text,'local') AS database`;
      const databaseHash = sha256(database);
      const state: BackfillState = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : {
        kind: "problem-actual-format-backfill-v1", databaseHash, version: preflight.version, failures: {}, completed: false,
      };
      if (state.kind !== "problem-actual-format-backfill-v1" || state.databaseHash !== databaseHash || state.version !== preflight.version)
        throw new Error("BACKFILL_STATE_MISMATCH");
      state.completed = false;
      const persist = () => durableJson(stateFile, state);
      persist();
      let cursor: string | null = null, scanned = 0, written = 0;
      while (true) {
        const page = await readPage(db, cursor, args.batchSize, true);
        if (!page.length) break;
        written += await retryChunk(page, state, (chunk) => db.$transaction(async (tx) => {
          await tx.$executeRaw`SET LOCAL lock_timeout='3s'`;
          return updateLockedRows(tx, chunk, preflight.version, (entries) => appendJournal(`${stateFile}.before.jsonl`, entries));
        }, { timeout: 30_000, maxWait: 20_000 }), persist);
        scanned += page.length;
        cursor = page[page.length - 1].id;
      }
      const failureObservations = new Map<string, { digest: string; current: boolean }>();
      const final = await readOnly(db, (tx) => scanBackfill(tx, args.batchSize, (row, fact) => {
        if (state.failures[row.id]) failureObservations.set(row.id, { digest: fact.actualFormatDigest, current: matchesFact(row, fact) });
      }));
      const reconciledFailures = reconcileFailures(state, failureObservations);
      const abandonedAfter3 = Object.values(state.failures).filter((f) => f.attempts >= 3).length;
      state.completed = abandonedAfter3 === 0 && final.rows === final.alreadyCurrent && final.evidenceMismatches === 0 && final.sampleMismatches === 0;
      persist();
      const result = { mode: "apply", scanned, writtenThisRun: written, abandonedAfter3, reconciledFailures, completed: state.completed, final };
      if (args.reportFile) durableJson(args.reportFile, result);
      console.log(JSON.stringify(result, null, 2));
      if (!state.completed) throw new Error("BACKFILL_INCOMPLETE");
    } finally { closeSync(lock); unlinkSync(lockFile); }
  } finally { await db.$disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((error) => { console.error(`문항 형식 백필 실패: ${safeCode(error)}`); process.exitCode = 1; });
