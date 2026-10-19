/** DB tools only: no product reader/writer is switched in this phase. */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Prisma, type PrismaClient } from "@prisma/client";
import { classifyFormat, type FormatInput, type ProblemFormat } from "../../src/lib/problem/provenance";
import { questionFormatWithoutContent } from "../../src/lib/problem/questionFormat";
import { problemVisibleWhere } from "../../src/lib/problemPool";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const MIGRATION_NAME = "20261019120000_problem_actual_format";
export const MIGRATION_PATH = resolve(ROOT, "prisma/migrations", MIGRATION_NAME, "migration.sql");
export const FORMAT_VALUES: readonly ProblemFormat[] = ["multiple_choice", "short_answer", "descriptive", "unknown"];
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export type FormatRow = FormatInput & {
  id: string;
  questionGroupKey: string | null;
  actualFormat: ProblemFormat | null;
  actualFormatVersion: string | null;
  actualFormatDigest: string | null;
};
export type FormatFact = { actualFormat: ProblemFormat; actualFormatVersion: string; actualFormatDigest: string };
export type SqlClient = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;
export type TransactionHost = Pick<PrismaClient, "$transaction">;

/** Hash the transitive local runtime imports, not just the top-level parser.
 * Failing closed on an unfamiliar dependency keeps a new parser from retaining an old version.
 */
export function formatRuleVersion(): string {
  const visited = new Map<string, string>();
  const visit = (file: string) => {
    if (visited.has(file)) return;
    const source = readFileSync(file, "utf8").replaceAll("\r\n", "\n");
    visited.set(file, source);
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)["']([^"']+)["']/g)) {
      const spec = match[1];
      if (spec.startsWith("node:")) continue;
      const base = spec.startsWith("@/") ? resolve(ROOT, "src", spec.slice(2))
        : spec.startsWith(".") ? resolve(dirname(file), spec) : null;
      if (!base) throw new Error("UNVERSIONED_FORMAT_DEPENDENCY");
      const target = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((p) => existsSync(p) && /\.tsx?$/.test(p));
      if (!target) throw new Error("FORMAT_DEPENDENCY_MISSING");
      visit(target);
    }
  };
  visit(resolve(ROOT, "src/lib/problem/provenance.ts"));
  visit(resolve(ROOT, "src/lib/problem/questionFormat.ts"));
  return `format-v1:${sha256(JSON.stringify([...visited].map(([file, source]) => [relative(ROOT, file), source]).sort()))}`;
}

/** Canonical field order, explicit nulls, exact UTF-8 strings. Never trim, NFC-normalize
 * or collapse CRLF: a parser input change must change the digest even if its result agrees.
 */
export function formatInputDigest(row: FormatInput & { questionGroupKey?: string | null }): string {
  return sha256(JSON.stringify([
    "problem-actual-format-input-v1", row.content, row.answer,
    row.questionType ?? null, row.problemType ?? null, row.familyKey,
    row.questionGroupKey ?? null,
  ]));
}

export function classifyFact(row: FormatRow, version: string): FormatFact {
  const actualFormat = classifyFormat(row);
  const proof = questionFormatWithoutContent(row);
  // A stale/forged strict v1 proof must never silently replace the actual text classification.
  if (proof !== null && proof !== actualFormat) throw new Error("FORMAT_EVIDENCE_MISMATCH");
  return { actualFormat, actualFormatVersion: version, actualFormatDigest: formatInputDigest(row) };
}

export const matchesFact = (row: Pick<FormatRow, keyof FormatFact>, fact: FormatFact) =>
  row.actualFormat === fact.actualFormat && row.actualFormatVersion === fact.actualFormatVersion && row.actualFormatDigest === fact.actualFormatDigest;

export const inputSelect = Prisma.sql`p.id::text AS id, p.content, p.answer,
  p.question_type AS "questionType", p.problem_type AS "problemType", p.family_key AS "familyKey",
  p.question_group_key AS "questionGroupKey"`;
export const cachedSelect = Prisma.sql`p.actual_format AS "actualFormat", p.actual_format_version AS "actualFormatVersion", p.actual_format_digest AS "actualFormatDigest"`;
export const emptyCachedSelect = Prisma.sql`NULL::text AS "actualFormat", NULL::text AS "actualFormatVersion", NULL::text AS "actualFormatDigest"`;
export const visiblePool = problemVisibleWhere().pool;

export async function hasFormatColumns(tx: SqlClient): Promise<boolean> {
  const [r] = await tx.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM information_schema.columns
    WHERE table_schema='public' AND table_name='problem' AND column_name IN ('actual_format','actual_format_version','actual_format_digest')`;
  if (r.n !== 0 && r.n !== 3) throw new Error("PARTIAL_FORMAT_SCHEMA");
  return r.n === 3;
}
export async function readPage(tx: SqlClient, cursor: string | null, take: number, hasColumns: boolean): Promise<FormatRow[]> {
  return tx.$queryRaw<FormatRow[]>(Prisma.sql`SELECT ${inputSelect}, ${hasColumns ? cachedSelect : emptyCachedSelect}
    FROM public.problem p WHERE p.pool=${visiblePool}::problem_pool
    ${cursor === null ? Prisma.empty : Prisma.sql`AND p.id > ${cursor}::uuid`} ORDER BY p.id LIMIT ${take}`);
}
export async function readOnly<T>(client: TransactionHost, run: (tx: Prisma.TransactionClient) => Promise<T>) {
  return client.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const [r] = await tx.$queryRaw<{ readOnly: string }[]>`SELECT current_setting('transaction_read_only') AS "readOnly"`;
    if (r.readOnly !== "on") throw new Error("READ_ONLY_GUARD");
    return run(tx);
  }, { isolationLevel: "RepeatableRead", timeout: 300_000, maxWait: 20_000 });
}
export function splitMigration(sql: string): string[] {
  return sql.split(/^-- statement$/m).map((p) => p.replace(/^--.*$/gm, "").trim().replace(/;$/, "")).filter(Boolean);
}
/** Never emit Prisma messages: they can contain row contents, credentials or SQL parameters. */
export function safeCode(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  if (typeof code === "string" && /^[A-Z0-9_]{2,60}$/.test(code)) return code;
  const message = error instanceof Error ? error.message : "";
  return /^[A-Z][A-Z0-9_]{2,80}$/.test(message) ? message : "DB_OPERATION_FAILED";
}
