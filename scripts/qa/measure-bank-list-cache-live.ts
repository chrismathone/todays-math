/**
 * Shared DB, reads only (no account/student reads). From the repo root:
 * npx tsx --conditions=react-server --env-file=/Users/pss/Desktop/creative/today_/.env scripts/qa/measure-bank-list-cache-live.ts
 * Optional arguments: baseline Git ref, output JSON path.
 * Each round compares old/current readers in one verified READ ONLY snapshot.
 * Measures server list work, excluding auth, compilation, HTTP and client rendering.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { PrismaClient, type Prisma } from "@prisma/client";
import type { BankData } from "../../src/components/unified/types";

const reads = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);
const scope = new AsyncLocalStorage<Prisma.TransactionClient>();
const denied = () => new Error("READ_ONLY_GUARD");
let productClient: PrismaClient;
let readOperations = 0;
let candidateScans = 0;
let candidateRows = 0;
let verifiedTransactions = 0;

/** Keep the product visibility extension; redirect every nested read into the snapshot. */
function protect<T extends object>(client: T, transaction = false): T {
  return new Proxy(client, {
    get(target, key, receiver) {
      const current = scope.getStore();
      if (key === "$extends")
        return (extension: Parameters<PrismaClient["$extends"]>[0]) => {
          productClient = (target as unknown as PrismaClient).$extends(
            extension,
          ) as unknown as PrismaClient;
          return protect(productClient);
        };
      if (key === "$transaction")
        return (run: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
          if (!current || typeof run !== "function") throw denied();
          return run(current);
        };
      if (typeof key !== "string") return Reflect.get(target, key, receiver);
      if (!transaction && current && !key.startsWith("$"))
        return Reflect.get(current, key);
      const value = Reflect.get(target, key, receiver);
      if (key === "$queryRaw")
        return (query: Prisma.Sql) => {
          if (!transaction && current) return current.$queryRaw(query);
          if (
            !transaction ||
            !query ||
            typeof query.text !== "string" ||
            !/^\s*(SELECT|WITH)\b/i.test(query.text) ||
            /\b(INSERT|UPDATE|DELETE|MERGE|ALTER|DROP|CREATE|TRUNCATE|CALL|COPY|GRANT|REVOKE)\b/i.test(
              query.text,
            )
          )
            throw denied();
          readOperations++;
          return (value as (query: Prisma.Sql) => Promise<unknown>).call(
            target,
            query,
          );
        };
      if (key.startsWith("$")) throw denied();
      if (value && typeof value === "object")
        return new Proxy(value, {
          get(delegate, operation) {
            if (
              !transaction ||
              typeof operation !== "string" ||
              !reads.has(operation)
            )
              throw denied();
            const read = Reflect.get(delegate, operation);
            if (typeof read !== "function") throw denied();
            return async (args: { select?: Record<string, unknown> }) => {
              readOperations++;
              const candidates =
                key === "problem" &&
                operation === "findMany" &&
                args?.select?.familyKey &&
                !args.select.content;
              const result = await Reflect.apply(read, delegate, [args]);
              if (candidates) {
                candidateScans++;
                candidateRows += result.length;
              }
              return result;
            };
          },
        });
      return value;
    },
  });
}

type Sample = {
  round: number;
  version: "before" | "after";
  scenario: string;
  ms: number;
  reads: number;
  candidateScans: number;
  candidateRows: number;
  responseBytes: number;
  responseSha256: string;
  total: number;
  page: number;
  byteEqual: boolean;
};
const baselineRef =
  process.argv[2] ?? "b353aff927677b475ff167137214898879ac27c5";
const outputPath = resolve(
  process.argv[3] ??
    "docs/planning/tracks/reports/bank-cache-report-parallel-codex-20261019-measurements.json",
);

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_MISSING");
  const temporary = await mkdtemp(resolve(".bank-list-cache-baseline-"));
  const raw = new PrismaClient({ log: [] });
  try {
    const baselinePath = resolve(temporary, "unifiedPreview.ts");
    await writeFile(
      baselinePath,
      execFileSync("git", ["show", `${baselineRef}:src/lib/unifiedPreview.ts`]),
    );
    (globalThis as typeof globalThis & { prisma?: PrismaClient }).prisma =
      protect(raw);
    // Install the write guard before the application's db singleton is imported.
    const after = await import("../../src/lib/unifiedPreview");
    const before = (await import(
      pathToFileURL(baselinePath).href
    )) as typeof after;
    const { invalidateBankReadCache } =
      await import("../../src/lib/bankReadCache");
    const scenarios = [
      ["첫 호출 · 전체 1쪽", { page: "1" }],
      ["같은 조건 · 전체 2쪽", { page: "2" }],
      ["다른 필터 · 중2 5쪽", { grade: "중2", page: "5" }],
    ] as const;
    const samples: Sample[] = [];
    for (let round = 1; round <= 3; round++) {
      await productClient.$transaction(
        async (tx) => {
          await tx.$executeRaw`SET TRANSACTION READ ONLY`;
          const [setting] = await tx.$queryRaw<{ readOnly: string }[]>`
          SELECT current_setting('transaction_read_only') AS "readOnly"`;
          if (setting.readOnly !== "on") throw denied();
          verifiedTransactions++;
          await scope.run(protect(tx, true), async () => {
            const reference = new Map<string, Buffer>();
            for (const [version, reader] of [
              ["before", before],
              ["after", after],
            ] as const) {
              invalidateBankReadCache();
              for (const [scenario, filters] of scenarios) {
                const startReads = readOperations,
                  startScans = candidateScans,
                  startRows = candidateRows;
                const start = performance.now();
                const value: BankData = await reader.loadUnifiedBank(
                  new URLSearchParams({
                    identity: "question",
                    pageSize: "12",
                    ...filters,
                  }),
                );
                const ms = Number((performance.now() - start).toFixed(3));
                // Raw JSON bytes, without key sorting or normalization.
                const bytes = Buffer.from(JSON.stringify(value));
                if (version === "before") reference.set(scenario, bytes);
                const sample: Sample = {
                  round,
                  version,
                  scenario,
                  ms,
                  reads: readOperations - startReads,
                  candidateScans: candidateScans - startScans,
                  candidateRows: candidateRows - startRows,
                  responseBytes: bytes.length,
                  responseSha256: createHash("sha256")
                    .update(bytes)
                    .digest("hex"),
                  total: value.total,
                  page: value.page,
                  byteEqual: bytes.equals(reference.get(scenario)!),
                };
                samples.push(sample);
                console.log(
                  `${round}/3 ${version} ${scenario}: ${ms}ms, 후보 ${sample.candidateScans}회/${sample.candidateRows}행, 바이트 ${sample.byteEqual ? "일치" : "불일치"}`,
                );
              }
            }
          });
        },
        { isolationLevel: "RepeatableRead", timeout: 120_000, maxWait: 20_000 },
      );
    }
    await writeFile(
      outputPath,
      JSON.stringify(
        {
          measuredAt: new Date().toISOString(),
          baselineRef,
          verifiedTransactions,
          scope:
            "server loadUnifiedBank; auth/HTTP/compile/client excluded; read-only same-snapshot rounds",
          samples,
        },
        null,
        2,
      ) + "\n",
    );
    if (samples.some((sample) => !sample.byteEqual))
      throw new Error("RESPONSE_BYTES_CHANGED");
    console.log(
      `READ ONLY ${verifiedTransactions}/3 확인, 전/후 응답 9/9 바이트 일치 · ${outputPath}`,
    );
  } finally {
    await raw.$disconnect();
    await rm(temporary, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const code = (error as { code?: unknown })?.code;
  console.error(
    `측정 실패: ${typeof code === "string" && /^[A-Z0-9_]+$/.test(code) ? code : "READ_OR_GUARD_ERROR"} (연결 정보·오류 원문 출력 생략)`,
  );
  process.exitCode = 1;
});
