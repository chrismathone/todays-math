/** Shared DB READ ONLY. Server reader time, including DB/network/fingerprint;
 * excludes the harness transaction's BEGIN/COMMIT, HTTP/auth/Next compilation/
 * browser rendering. No answers are saved.
 * node_modules/.bin/tsx --conditions=react-server --env-file=/path/to/operator.env scripts/qa/measure-bank-first-call-demand-live.ts [output.json]
 * Revision stays OFF because only the lead can apply the shared DDL.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { Prisma, PrismaClient } from "@prisma/client";
import type { BankData } from "../../src/components/unified/types";
import type { BankSourceCounts, BankSourceMaterial } from "../../src/contracts/bankSource.contract";
import { safeCode } from "../db/problem-actual-format";

const scope = new AsyncLocalStorage<Prisma.TransactionClient>();
const reads = new Set(["findMany", "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "count", "aggregate", "groupBy"]);
const stats: { kind: string; rows: number; ms: number }[] = [];
const denied = () => new Error("READ_ONLY_GUARD");
function protect<T extends object>(client: T, transaction = false): T {
  return new Proxy(client, {
    get(target, key, receiver) {
      const current = scope.getStore();
      if (key === "$extends") return (extension: Parameters<PrismaClient["$extends"]>[0]) =>
        protect((target as unknown as PrismaClient).$extends(extension));
      if (key === "$transaction") return (run: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
        if (!current || typeof run !== "function") throw denied();
        return run(current);
      };
      if (typeof key !== "string") return Reflect.get(target, key, receiver);
      if (!transaction && current && !key.startsWith("$")) return Reflect.get(current, key);
      const value = Reflect.get(target, key, receiver);
      if (key === "$queryRaw") return async (query: Prisma.Sql) => {
        if (!transaction && current) return current.$queryRaw(query);
        if (!transaction || !query?.text || !/^\s*(SELECT|WITH)\b/i.test(query.text)
          || /\b(INSERT|UPDATE|DELETE|MERGE|ALTER|DROP|CREATE|TRUNCATE|CALL|COPY|GRANT|REVOKE)\b/i.test(query.text)) throw denied();
        const started = performance.now();
        const rows = await (value as (query: Prisma.Sql) => Promise<unknown[]>).call(target, query);
        const meta = query as Prisma.Sql & { questionCountRead?: { mode: string }; bankReadFingerprint?: boolean; bankReadRevision?: boolean };
        stats.push({ kind: meta.bankReadFingerprint ? "xmin-fingerprint" : meta.bankReadRevision ? "revision" : meta.questionCountRead?.mode ?? "other-select", rows: rows.length, ms: Number((performance.now() - started).toFixed(3)) });
        return rows;
      };
      if (key.startsWith("$")) throw denied();
      if (value && typeof value === "object") return new Proxy(value, {
        get(delegate, method) {
          if (!transaction || typeof method !== "string" || !reads.has(method)) throw denied();
          return async (...args: unknown[]) => {
            const start = performance.now();
            const result = await (Reflect.get(delegate, method) as (...args: unknown[]) => Promise<unknown>).apply(delegate, args);
            stats.push({ kind: `${key}.${method}`, rows: Array.isArray(result) ? result.length : result ? 1 : 0, ms: Number((performance.now() - start).toFixed(3)) });
            return result;
          };
        },
      });
      return value;
    },
  });
}
type Curriculum = { grades: string[]; chapters: string[]; units: { id: string }[] };
type Reader = {
  loadUnifiedBankCurriculum(params: URLSearchParams): Promise<Curriculum>;
  loadUnifiedBank(params: URLSearchParams): Promise<BankData>;
  loadQuestionScopeCounts(params: URLSearchParams): Promise<{ unitCounts: Record<string, number>; unitFamilies: Record<string, number> }>;
  loadQuestionSourceAvailability(params: URLSearchParams): Promise<{ facets?: { units: Record<string, { available: number }>; unitFamilies?: Record<string, number> } }>;
  loadQuestionSourceCounts(params: URLSearchParams): Promise<BankSourceCounts>;
  loadQuestionSourceMaterials(params: URLSearchParams): Promise<{ materials: BankSourceMaterial[] }>;
  loadQuestionPickerGroups(params: URLSearchParams): Promise<{ sources: BankSourceCounts["sources"] }>;
  loadQuestionPickerBooks(params: URLSearchParams): Promise<unknown>;
  loadQuestionPickerBookCounts(params: URLSearchParams): Promise<{ books: { id: string; count: number; open: number; kinds: Record<string, number> }[] }>;
  loadQuestionMaterialsPage(params: URLSearchParams): Promise<{ materials: BankSourceMaterial[]; selectedAvailable: string[]; total: number }>;
};
const params = (values: Record<string, string>) => new URLSearchParams({ identity: "question", ...values });
const bytes = (value: unknown) => Buffer.from(JSON.stringify(value));

async function main() {
  if (process.env.BANK_READ_REVISION === "on") throw new Error("SHARED_REVISION_NOT_APPLIED_BY_THIS_TASK");
  const raw = new PrismaClient({ log: [] });
  (globalThis as typeof globalThis & { prisma?: PrismaClient }).prisma = protect(raw);
  try {
    const reader = { ...await import("../../src/lib/unifiedPreview"), ...await import("../../src/lib/bankSourceQuestions") } as unknown as Reader;
    const { invalidateBankReadCache } = await import("../../src/lib/bankReadCache");
    const samples: { round: number; scenario: string; mode: string; ms: number; bytes: number; sha256: string; queries: typeof stats; comparison?: {
      fields: string[]; bytesEqual?: boolean; valuesEqual?: boolean; rawRecordBytesEqual?: boolean;
      kindKeyOrderEqual?: boolean[];
    } }[] = [];
    for (let round = 1; round <= 3; round++) {
      await raw.$transaction(async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const [proof] = await tx.$queryRaw<{ readOnly: string }[]>`SELECT current_setting('transaction_read_only') AS "readOnly"`;
        if (proof.readOnly !== "on") throw denied();
        await tx.$executeRaw`SET LOCAL plan_cache_mode='force_custom_plan'`;
        await tx.$executeRaw`SET LOCAL max_parallel_workers_per_gather=0`;
        const units = await tx.unit.findMany({ where: { grade: "중2" }, orderBy: { orderIndex: "asc" }, select: { id: true, chapter: true } });
        const chapter = units[0]?.chapter;
        if (!chapter) throw new Error("EMPTY_CURRICULUM_FIXTURE");
        const visibleIds = units.filter((u) => u.chapter === chapter).slice(0, 20).map((u) => u.id);
        const unitIds = visibleIds.join(",");
        const book = await tx.sourceBook.findFirst({ where: { kind: "school_textbook", grade: "중2" }, orderBy: { id: "asc" }, select: { id: true } });
        if (!book) throw new Error("EMPTY_BOOK_FIXTURE");
        const material = await tx.sourceMaterial.findFirst({ where: { bookId: book.id }, orderBy: { id: "asc" }, select: { id: true } });
        if (!material) throw new Error("EMPTY_MATERIAL_FIXTURE");
        await scope.run(protect(tx, true), async () => {
          const cases: [string, () => Promise<unknown>][] = [
            ["initial-grades", () => reader.loadUnifiedBankCurriculum(params({ view: "curriculum" }))],
            ["selected-grade-chapters", () => reader.loadUnifiedBankCurriculum(params({ view: "curriculum", grade: "중2" }))],
            ["selected-chapter-lessons", () => reader.loadUnifiedBankCurriculum(params({ view: "curriculum", grade: "중2", chapter }))],
            ["visible-lesson-counts", () => reader.loadQuestionScopeCounts(params({ view: "scope-counts", unitIds, families: "1" }))],
            ["visible-lesson-page", () => reader.loadUnifiedBank(params({ view: "page", unitIds, page: "1", pageSize: "12" }))],
            ["source-picker-groups", () => reader.loadQuestionPickerGroups(params({ view: "picker-groups" }))],
            ["source-picker-book-grades", () => reader.loadQuestionPickerBooks(params({ view: "picker-books" }))],
            ["source-picker-visible-books", () => reader.loadQuestionPickerBooks(params({ view: "picker-books", grade: "중2" }))],
            ["source-picker-visible-book-counts", () => reader.loadQuestionPickerBookCounts(params({ view: "picker-book-counts", grade: "중2" }))],
            ["visible-materials-page", () => reader.loadQuestionMaterialsPage(params({ view: "materials-page", books: book.id, materials: material.id, page: "1", pageSize: "20" }))],
          ];
          for (const [scenario, read] of cases.filter(([name]) => !process.env.BANK_FIRST_CALL_SCENARIO || process.env.BANK_FIRST_CALL_SCENARIO === name)) {
            invalidateBankReadCache();
            for (const mode of ["cold", "validated"]) {
              const firstQuery = stats.length;
              const start = performance.now();
              const value = await read();
              const ms = Number((performance.now() - start).toFixed(3));
              const response = bytes(value);
              const sample: typeof samples[number] = { round, scenario, mode, ms, bytes: response.length,
                sha256: createHash("sha256").update(response).digest("hex"), queries: stats.slice(firstQuery) };
              if (scenario === "visible-lesson-page") {
                const reference = await reader.loadUnifiedBank(params({ unitIds, page: "1", pageSize: "12" }));
                const fields = ["problems", "total", "page", "pageSize", "version", "countUnit"] as const;
                sample.comparison = { fields: [...fields], bytesEqual: bytes(Object.fromEntries(fields.map((key) => [key, reference[key]])))
                  .equals(bytes(Object.fromEntries(fields.map((key) => [key, (value as BankData)[key]])))) };
              }
              if (scenario === "visible-lesson-counts") {
                const reference = await reader.loadQuestionSourceAvailability(params({ view: "available", unitIds, families: "1" }));
                const expected = visibleIds.map((id) => [id, reference.facets?.units[id]?.available ?? 0, reference.facets?.unitFamilies?.[id] ?? 0]);
                const current = value as Awaited<ReturnType<Reader["loadQuestionScopeCounts"]>>;
                sample.comparison = { fields: ["requested unitCounts", "requested unitFamilies"],
                  bytesEqual: bytes(expected).equals(bytes(visibleIds.map((id) => [id, current.unitCounts[id] ?? 0, current.unitFamilies[id] ?? 0]))) };
              }
              if (scenario === "source-picker-groups") {
                const reference = await reader.loadQuestionSourceCounts(params({}));
                sample.comparison = { fields: ["sources"], bytesEqual: bytes(reference.sources).equals(bytes((value as { sources: unknown }).sources)) };
              }
              if (scenario === "source-picker-visible-book-counts") {
                const reference = await reader.loadQuestionSourceCounts(params({}));
                const current = value as Awaited<ReturnType<Reader["loadQuestionPickerBookCounts"]>>;
                const expected = current.books.map((b) => { const old = reference.textbook.books.find((old) => old.id === b.id);
                  return { id: b.id, count: old?.count ?? 0, open: old?.open ?? 0, kinds: old?.kinds ?? {} }; });
                // This is a NEW smaller endpoint, whose per-kind record keys do
                // not inherit the global scan's physical encounter order. Keep
                // the raw byte mismatch visible and verify every key/value.
                // Whole old API bytes are compared separately without sorting.
                sample.comparison = { fields: ["requested book count/open and keyed kind counts"],
                  rawRecordBytesEqual: bytes(expected).equals(bytes(current.books)),
                  kindKeyOrderEqual: current.books.map((book, index) => Object.keys(book.kinds).join("|") === Object.keys(expected[index].kinds).join("|")),
                  valuesEqual: current.books.every((book, index) => book.count === expected[index].count && book.open === expected[index].open
                    && Object.keys(book.kinds).length === Object.keys(expected[index].kinds).length
                    && Object.entries(book.kinds).every(([kind, count]) => expected[index].kinds[kind] === count)),
                };
              }
              if (scenario === "visible-materials-page") {
                const reference = await reader.loadQuestionSourceMaterials(params({ view: "materials", books: book.id }));
                const current = value as Awaited<ReturnType<Reader["loadQuestionMaterialsPage"]>>;
                sample.comparison = { fields: ["first 20 material rows", "total", "selectedAvailable"],
                  bytesEqual: bytes({ materials: reference.materials.slice(0, 20), total: reference.materials.length,
                    selectedAvailable: reference.materials.some((row) => row.id === material.id && row.available > 0) ? [material.id] : [] })
                    .equals(bytes({ materials: current.materials, total: current.total, selectedAvailable: current.selectedAvailable })) };
              }
              if (sample.comparison?.bytesEqual === false || sample.comparison?.valuesEqual === false) throw new Error("DEMAND_PAYLOAD_CHANGED");
              samples.push(sample);
              console.log(`${round}/3 ${scenario}/${mode}: ${ms}ms`);
              // Reference checks above must not warm the next new-path sample.
              // Only this scenario's cache can be reused; reference global keys differ.
            }
          }
        });
      }, { isolationLevel: "RepeatableRead", timeout: 120_000, maxWait: 20_000 });
    }
    const output = process.argv[2] ?? "docs/planning/tracks/reports/bank-first-call-demand-live-20261019.json";
    await writeFile(output, JSON.stringify({ measuredAt: new Date().toISOString(), readOnly: true, verifiedTransactions: 3,
      revisionReader: "off", source: "shared DB, server readers", timingIncludes: "DB/network/fingerprint", timingExcludes: "harness BEGIN/COMMIT, auth/HTTP/compile/browser",
      note: "Cold clears process caches, not DB buffers. Validated repeats still query the DB fingerprint where used. New reduced responses compare only declared payload fields. New scoped book kind-record key order differs from the global scan: rawRecordBytesEqual records that failure; all keyed count values are checked separately. Unchanged API whole-response parity is measured separately, without sorting/normalizing/deleting fields.", samples }, null, 2) + "\n");
  } finally { await raw.$disconnect(); }
}
main().catch((error) => { console.error(`DEMAND_MEASURE_FAILED:${safeCode(error)} (connection/error details omitted)`); process.exitCode = 1; });
