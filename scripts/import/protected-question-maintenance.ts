/** Shared mechanics for the NEW, separately approved 17-row repair and <=96-content batch.
 * Does not change verified-engine-batch's frozen cap or no-existing-family policy.
 * No env loading, DB connection, generation, or mutation on import.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  closeSync,
  fsyncSync,
  openSync,
  readFileSync,
} from "node:fs";
import path from "node:path";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  assertReferenceCoverage,
  type ReferenceColumn,
} from "./verified-engine-batch";

export const QUESTION_FORMAT_PLAN =
  "docs/planning/tracks/math-question-formats-20261018.md";
export const QUESTION_FORMAT_PLAN_SHA =
  "50c525785cae16825d23d7bd55de81f7a779fa54cd98e8933d470a126acccc61";
export const digest = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b, "en"))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export const valueDigest = (value: unknown) => digest(stableJson(value));
export type DatabaseRow = Record<string, unknown> & { id: string };
export type Payload = {
  content: string;
  answer: string;
  solution: string | null;
  figureSvg: string | null;
};
export function payloadOf(row: DatabaseRow): Payload {
  return {
    content: String(row.content),
    answer: String(row.answer),
    solution: row.solution as string | null,
    figureSvg: row.figure_svg as string | null,
  };
}
export const payloadDigest = (row: Payload) =>
  digest(
    JSON.stringify([row.content, row.answer, row.solution, row.figureSvg]),
  );
export function patchedRow(before: DatabaseRow, payload: Payload): DatabaseRow {
  const after = {
    ...before,
    content: payload.content,
    answer: payload.answer,
    solution: payload.solution,
    figure_svg: payload.figureSvg,
  };
  // The identity trigger invalidates only the changed row. Never restore an unproved group key.
  if ("question_group_key" in after) after.question_group_key = null;
  return after;
}
export const quoteIdentifier = (value: string) =>
  `"${value.replace(/"/g, '""')}"`;
export async function discoverReferences(
  tx: Prisma.TransactionClient,
): Promise<ReferenceColumn[]> {
  const scalar = await tx.$queryRawUnsafe<
    { schema: string; table: string; column: string; targetColumn: string }[]
  >(`
    SELECT DISTINCT n.nspname AS "schema", c.relname AS "table", a.attname AS "column", target.attname AS "targetColumn"
    FROM pg_constraint f JOIN pg_class c ON c.oid=f.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN LATERAL unnest(f.conkey,f.confkey) AS k(attnum,targetnum) ON true
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum
    JOIN pg_attribute target ON target.attrelid=f.confrelid AND target.attnum=k.targetnum
    WHERE f.contype='f' AND f.confrelid='public.problem'::regclass
    UNION SELECT c.table_schema,c.table_name,c.column_name,'id' FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name AND t.table_type='BASE TABLE'
    WHERE c.table_schema='public' AND c.column_name IN ('problem_id','origin_problem_id')`);
  if (scalar.some((row) => row.targetColumn !== "id"))
    throw new Error("Non-id problem FK requires explicit reference review");
  const json = await tx.$queryRawUnsafe<
    { schema: string; table: string; column: string }[]
  >(`
    SELECT c.table_schema AS "schema",c.table_name AS "table",c.column_name AS "column" FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name AND t.table_type='BASE TABLE'
    WHERE c.table_schema='public' AND ((c.column_name='source_ref' AND c.data_type='jsonb') OR (c.table_name='textbook_problem_snapshot' AND c.column_name='source_key'))`);
  const references: ReferenceColumn[] = [
    ...scalar.map((row) => ({
      schema: row.schema,
      table: row.table,
      column: row.column,
      kind: "scalar" as const,
    })),
    ...json.map((row) => ({
      ...row,
      kind:
        row.column === "source_ref"
          ? ("source-ref" as const)
          : ("source-key" as const),
    })),
  ].sort((a, b) =>
    `${a.schema}.${a.table}.${a.column}`.localeCompare(
      `${b.schema}.${b.table}.${b.column}`,
      "en",
    ),
  );
  assertReferenceCoverage(references);
  return references;
}
export async function referenceCounts(
  tx: Prisma.TransactionClient,
  refs: readonly ReferenceColumn[],
  ids: readonly string[],
) {
  const result: Record<string, Record<string, number>> = Object.fromEntries(
    ids.map((id) => [id, {}]),
  );
  for (const ref of refs) {
    const column = quoteIdentifier(ref.column);
    const value =
      ref.kind === "source-ref"
        ? `${column}->>'problemId'`
        : ref.kind === "source-key"
          ? `CASE WHEN ${column} LIKE 'tm:%' THEN substring(${column} from 4) END`
          : `${column}::text`;
    const found = await tx.$queryRawUnsafe<{ id: string; count: bigint }[]>(
      `SELECT ${value} AS id,count(*) AS count FROM ${quoteIdentifier(ref.schema)}.${quoteIdentifier(ref.table)} WHERE ${value}=ANY($1::text[]) GROUP BY ${value}`,
      [...ids],
    );
    for (const row of found)
      result[row.id]![`${ref.schema}.${ref.table}.${ref.column}`] = Number(
        row.count,
      );
  }
  return result;
}
export function assertNoReferences(
  counts: Record<string, Record<string, number>>,
): void {
  for (const [id, row] of Object.entries(counts))
    if (Object.values(row).some((n) => !Number.isSafeInteger(n) || n !== 0))
      throw new Error(`Referenced row: ${id}; repair/revert stopped`);
}
export async function readRows(
  tx: Prisma.TransactionClient,
  ids: readonly string[],
  familyKeys: readonly string[] = [],
  externalIds: readonly string[] = [],
): Promise<DatabaseRow[]> {
  const got = await tx.$queryRawUnsafe<{ row: DatabaseRow }[]>(
    "SELECT to_jsonb(p) AS row FROM public.problem p WHERE id::text=ANY($1::text[]) OR family_key=ANY($2::text[]) OR external_id=ANY($3::text[]) ORDER BY id",
    [...ids],
    [...familyKeys],
    [...externalIds],
  );
  return got.map((item) => item.row);
}
export async function lockedMaintenance<T>(
  prisma: PrismaClient,
  work: (tx: Prisma.TransactionClient, refs: ReferenceColumn[]) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '15s'");
      await tx.$executeRawUnsafe(
        "LOCK TABLE public.problem IN SHARE ROW EXCLUSIVE MODE",
      );
      const refs = await discoverReferences(tx);
      for (const table of [
        ...new Set(
          refs.map(
            (ref) =>
              `${quoteIdentifier(ref.schema)}.${quoteIdentifier(ref.table)}`,
          ),
        ),
      ].sort()) {
        await tx.$executeRawUnsafe(
          `LOCK TABLE ${table} IN SHARE ROW EXCLUSIVE MODE`,
        );
      }
      // Lock first; READ COMMITTED then observes inserts that completed while waiting.
      return work(tx, refs);
    },
    { isolationLevel: "ReadCommitted", maxWait: 30_000, timeout: 120_000 },
  );
}
export async function readonlyMaintenance<T>(
  prisma: PrismaClient,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      return work(tx);
    },
    { isolationLevel: "RepeatableRead", maxWait: 30_000, timeout: 180_000 },
  );
}
export async function updatePayloadCas(
  tx: Prisma.TransactionClient,
  before: DatabaseRow,
  payload: Payload,
): Promise<DatabaseRow> {
  const got = await tx.$queryRawUnsafe<{ row: DatabaseRow }[]>(
    `UPDATE public.problem p SET content=$2,answer=$3,solution=$4,figure_svg=$5 WHERE id::text=$1 AND to_jsonb(p)=$6::jsonb RETURNING to_jsonb(p) AS row`,
    before.id,
    payload.content,
    payload.answer,
    payload.solution,
    payload.figureSvg,
    JSON.stringify(before),
  );
  if (got.length !== 1)
    throw new Error(`Full-row repair CAS failed: ${before.id}`);
  const expected = patchedRow(before, payload);
  if (stableJson(got[0]!.row) !== stableJson(expected))
    throw new Error(`Repair readback changed non-payload fields: ${before.id}`);
  return got[0]!.row;
}
export function sourceDigests(repoDir: string, files: readonly string[]) {
  return Object.fromEntries(
    [...new Set(files)]
      .sort()
      .map((file) => [file, digest(readFileSync(path.resolve(repoDir, file)))]),
  );
}
export function committedBytes(repoDir: string, file: string): Buffer {
  const relative = path.relative(
    path.resolve(repoDir),
    path.resolve(repoDir, file),
  );
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error("Approval artifact must be inside this repository");
  const actual = readFileSync(path.resolve(repoDir, relative));
  const committed = execFileSync("git", ["show", `HEAD:${relative}`], {
    cwd: repoDir,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (!actual.equals(committed))
    throw new Error(`Artifact is not committed at HEAD: ${relative}`);
  return actual;
}
export type MaintenanceApproval = {
  reviewer: "Claude";
  verdict: "approved";
  kind: "17-row-content-repair" | "bounded-family-reinforcement";
  planSha256: string;
  sourceCommit: string;
  sourceDigestsSha256: string;
  manifestSha256: string;
  beforeLedgerSha256: string;
  prewriteSha256?: string;
};
export type ApprovalFiles = {
  repoDir: string;
  manifest: string;
  before: string;
  approval: string;
  prewrite?: string;
  journal: string;
};
export function verifyApproval(
  files: ApprovalFiles,
  kind: MaintenanceApproval["kind"],
  evidence: { sourceCommit: string; sourceDigests: Record<string, string> },
) {
  const plan = committedBytes(files.repoDir, QUESTION_FORMAT_PLAN);
  const manifest = committedBytes(files.repoDir, files.manifest);
  const before = committedBytes(files.repoDir, files.before);
  const approval = JSON.parse(
    committedBytes(files.repoDir, files.approval).toString("utf8"),
  ) as MaintenanceApproval;
  if (
    digest(plan) !== QUESTION_FORMAT_PLAN_SHA ||
    approval.planSha256 !== QUESTION_FORMAT_PLAN_SHA ||
    approval.kind !== kind ||
    approval.reviewer !== "Claude" ||
    approval.verdict !== "approved" ||
    approval.manifestSha256 !== digest(manifest) ||
    approval.beforeLedgerSha256 !== digest(before) ||
    approval.sourceCommit !== evidence.sourceCommit ||
    approval.sourceDigestsSha256 !== valueDigest(evidence.sourceDigests) ||
    (files.prewrite &&
      approval.prewriteSha256 !==
        digest(committedBytes(files.repoDir, files.prewrite)))
  )
    throw new Error(
      "Exact plan/source/manifest/before/prewrite/Claude approval mismatch",
    );
  execFileSync(
    "git",
    ["merge-base", "--is-ancestor", evidence.sourceCommit, "HEAD"],
    { cwd: files.repoDir, stdio: "pipe" },
  );
  for (const [file, expected] of Object.entries(evidence.sourceDigests)) {
    if (digest(committedBytes(files.repoDir, file)) !== expected)
      throw new Error(`Source digest mismatch: ${file}`);
  }
  return { manifest, before, approval };
}
export function assertCoordinatorWrite(
  apply: boolean,
  gate: string | undefined,
  writer: string | undefined,
): void {
  if (!apply || gate !== "1" || writer !== "coordinator")
    throw new Error(
      "Root coordinator only: --apply, ALLOW_SHARED_IMPORT=1 and MATH_QUESTION_FORMATS_WRITER=coordinator are required",
    );
}
export function journal(files: ApprovalFiles, event: unknown): void {
  const dest = path.resolve(files.repoDir, files.journal);
  if (
    [
      QUESTION_FORMAT_PLAN,
      files.manifest,
      files.before,
      files.approval,
      files.prewrite,
    ]
      .filter(Boolean)
      .some((file) => path.resolve(files.repoDir, file!) === dest)
  )
    throw new Error("Journal must not overwrite frozen artifacts");
  const fd = openSync(dest, "a", 0o600);
  try {
    appendFileSync(
      fd,
      JSON.stringify({ at: new Date().toISOString(), ...(event as object) }) +
        "\n",
    );
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
