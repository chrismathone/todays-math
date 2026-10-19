/**
 * Shared DB, reads only. Run from the repo root:
 * npx tsx --env-file=/Users/pss/Desktop/creative/today_/.env scripts/qa/measure-builder-speed-live.ts
 *
 * Every path runs in a RepeatableRead / READ ONLY transaction. Nested product
 * transactions reuse it, including query resolution normally done outside them.
 * No row contents, IDs, connection strings or raw error messages are printed.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { PrismaClient, type Prisma } from "@prisma/client";

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

/** The product's own $extends (visibility wall) is applied before wrapping. */
function readOnlyClient<T extends object>(client: T, transaction = false): T {
  return new Proxy(client, {
    get(target, key, receiver) {
      const current = scope.getStore();
      if (key === "$extends")
        return (extension: Parameters<PrismaClient["$extends"]>[0]) => {
          productClient = (target as unknown as PrismaClient).$extends(
            extension,
          ) as unknown as PrismaClient;
          return readOnlyClient(productClient);
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
              typeof operation !== "string" ||
              !reads.has(operation) ||
              !transaction
            )
              throw denied();
            const read = Reflect.get(delegate, operation);
            return typeof read === "function" ? read.bind(delegate) : read;
          },
        });
      return value;
    },
  });
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object" && !(value instanceof Date))
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  return value;
}
const digest = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(value)) ?? "undefined")
    .digest("hex");
const median = (values: number[]) => [...values].sort((a, b) => a - b)[1];

async function main() {
  // server-only resolves to its documented empty export in this child process.
  if (!process.execArgv.includes("--conditions=react-server")) {
    const child = spawnSync(
      process.execPath,
      [
        ...process.execArgv,
        "--conditions=react-server",
        resolve(process.argv[1]),
        ...process.argv.slice(2),
      ],
      { stdio: ["ignore", "inherit", "inherit"], env: process.env },
    );
    process.exitCode = child.status ?? 1;
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_MISSING");
  const raw = new PrismaClient({ log: [] });
  const globalDb = globalThis as typeof globalThis & { prisma?: PrismaClient };
  globalDb.prisma = readOnlyClient(raw);
  // Dynamic imports are intentional: install the guard before the db singleton loads.
  const { db } = await import("../../src/lib/db");
  const { invalidateBankReadCache } =
    await import("../../src/lib/bankReadCache");
  const after = {
    ...(await import("../../src/lib/bankSourceAvailability")),
    ...(await import("../../src/lib/bankSourceCounts")),
    ...(await import("../../src/lib/unifiedPreview")),
  };
  const before = {
    ...(await import("../../.builder-speed-baseline/bankSourceAvailability")),
    ...(await import("../../.builder-speed-baseline/bankSourceCounts")),
    ...(await import("../../.builder-speed-baseline/unifiedPreview")),
  };
  async function readOnly<T>(run: () => Promise<T>): Promise<T> {
    return productClient.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const [setting] = await tx.$queryRaw<{ readOnly: string }[]>`
        SELECT current_setting('transaction_read_only') AS "readOnly"`;
        if (setting.readOnly !== "on") throw denied();
        // Keep the product visibility extension on model reads inside the transaction.
        // db was extended from raw; tx from db therefore carries the same wall.
        return scope.run(readOnlyClient(tx, true), run);
      },
      { isolationLevel: "RepeatableRead", timeout: 120_000, maxWait: 20_000 },
    );
  }
  try {
    // Scope the same way as the lead's script; select no account/student data.
    const fixture = await readOnly(async () => {
      const [top] = await db.problem.groupBy({
        by: ["unitId"],
        _count: { _all: true },
        orderBy: { _count: { unitId: "desc" } },
        take: 1,
      });
      if (!top) throw new Error("EMPTY_BANK");
      const row = await db.problem.findFirst({
        where: { unitId: top.unitId },
        select: { id: true },
      });
      if (!row) throw new Error("EMPTY_BANK");
      return { unitId: top.unitId, excludeId: row.id };
    });
    const context = { recentProblemIds: async () => [] as string[] };
    const params = (extra: Record<string, string>) =>
      new URLSearchParams({ identity: "question", ...extra });
    const paths = (
      reader: Pick<
        typeof after,
        | "loadBankSourceAvailability"
        | "loadUnifiedBank"
        | "loadBankSourceCounts"
      >,
    ): [string, () => Promise<unknown>][] => [
      [
        "범위 수량(최근 제외)",
        () =>
          reader.loadBankSourceAvailability(
            params({ view: "available", families: "1", recent: "1" }),
            context,
          ),
      ],
      [
        "범위 수량(제외 없음)",
        () =>
          reader.loadBankSourceAvailability(
            params({ view: "available", families: "1" }),
            context,
          ),
      ],
      [
        "문항 추가",
        () =>
          reader.loadUnifiedBank(
            params({ unitIds: fixture.unitId, pageSize: "12" }),
          ),
      ],
      [
        "문항 교체",
        () =>
          reader.loadUnifiedBank(
            params({
              unitIds: fixture.unitId,
              difficulty: "기본",
              pageSize: "10",
              excludeIds: fixture.excludeId,
            }),
          ),
      ],
      ["출처 고르기", () => reader.loadBankSourceCounts(params({}))],
    ];
    const samples = new Map<
      string,
      {
        before: number[];
        after: number[];
        equal: boolean[];
        warmEqual: boolean[];
        warmBefore: number[];
        warmAfter: number[];
      }
    >();
    console.log("READ ONLY 확인 · 1차 전 ↔ 현재, 같은 프로세스 3회 (ms)");
    for (let round = 0; round < 3; round++) {
      const hashes = new Map<string, string>();
      const warmHashes = new Map<string, string>();
      const priorValues = new Map<string, unknown>();
      for (const [tag, reader] of [
        ["before", before],
        ["after", after],
      ] as const) {
        invalidateBankReadCache();
        for (const [name, run] of paths(reader)) {
          const start = performance.now();
          const value = await readOnly(run);
          const elapsed = Math.round(performance.now() - start);
          const sample = samples.get(name) ?? {
            before: [],
            after: [],
            equal: [],
            warmEqual: [],
            warmBefore: [],
            warmAfter: [],
          };
          sample[tag].push(elapsed);
          const hash = digest(value);
          if (tag === "before") {
            hashes.set(name, hash);
            priorValues.set(name, value);
          } else {
            const equal = hashes.get(name) === hash;
            sample.equal.push(equal);
            if (!equal) {
              const old = priorValues.get(name) as Record<string, unknown>;
              const next = value as Record<string, unknown>;
              const fields = [
                "problems",
                "total",
                "page",
                "pageSize",
                "units",
                "unitCounts",
                "grades",
                "chapters",
                "facets",
                "sources",
                "textbook",
              ].filter((key) => digest(old[key]) !== digest(next[key]));
              console.log(`응답 불일치 필드: ${fields.join(", ")}`);
            }
          }
          samples.set(name, sample);
          console.log(`${round + 1}/3 ${tag} ${name}: ${elapsed}ms`);
        }
        for (const [name, run] of paths(reader)) {
          const start = performance.now();
          const value = await readOnly(run);
          samples
            .get(name)!
            [tag === "before" ? "warmBefore" : "warmAfter"].push(
              Math.round(performance.now() - start),
            );
          if (tag === "before") warmHashes.set(name, digest(value));
          else
            samples
              .get(name)!
              .warmEqual.push(warmHashes.get(name) === digest(value));
        }
      }
    }
    console.log(
      "\n| 경로 | 전 3회 ms | 후 3회 ms | 중앙값 전 → 후 | 응답 동일 | 재호출 중앙값 전 → 후 |\n|---|---:|---:|---:|---|---:|",
    );
    for (const [name, sample] of samples)
      console.log(
        `| ${name} | ${sample.before.join(" / ")} | ${sample.after.join(" / ")} | ${median(sample.before)} → ${median(sample.after)} | ${sample.equal.every(Boolean) && sample.warmEqual.every(Boolean) ? "첫/재호출 각 3/3 일치" : "불일치"} | ${median(sample.warmBefore)} → ${median(sample.warmAfter)} |`,
      );
    if (
      [...samples.values()].some((sample) =>
        [...sample.equal, ...sample.warmEqual].some((equal) => !equal),
      )
    )
      process.exitCode = 2;
  } finally {
    await raw.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Prisma messages can contain a URL or query data. Only a sanitized code leaves here.
  const code = (error as { code?: unknown })?.code;
  console.error(
    `측정 실패: ${typeof code === "string" && /^[A-Z0-9_]+$/.test(code) ? code : "READ_OR_GUARD_ERROR"} (연결 정보·오류 원문 출력 생략)`,
  );
  process.exitCode = 1;
});
