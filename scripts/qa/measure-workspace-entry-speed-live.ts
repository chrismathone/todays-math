/**
 * Shared DB, reads only:
 * npx tsx --conditions=react-server --env-file=/Users/pss/Desktop/creative/today_/.env scripts/qa/measure-workspace-entry-speed-live.ts
 *
 * Execute the HEAD/current WorkspacePage server functions with the same resolved
 * account and an inert client boundary. Measures the bank wait in the / entry,
 * excluding authentication, Next compilation, HTTP transport and client rendering.
 * Every real bank read runs in a verified READ ONLY transaction; print no rows,
 * account data, connection strings or raw errors.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import { runInNewContext } from "node:vm";
import { PrismaClient, type Prisma } from "@prisma/client";
import ts from "typescript";
import type { BankData } from "../../src/components/unified/types";
import { unifiedBankBootstrapSchema } from "../../src/contracts/unifiedBankBootstrap.contract";

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
let readOperations = 0;
let verifiedTransactions = 0;
const denied = () => new Error("READ_ONLY_GUARD");

function protect<T extends object>(client: T, transaction = false): T {
  return new Proxy(client, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      if (key === "$extends")
        return (extension: Parameters<PrismaClient["$extends"]>[0]) =>
          protect((target as unknown as PrismaClient).$extends(extension));
      if (key === "$transaction")
        return (run: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
          if (transaction || typeof run !== "function") throw denied();
          return (target as unknown as PrismaClient).$transaction(
            async (tx) => {
              await tx.$executeRaw`SET TRANSACTION READ ONLY`;
              const [setting] = await tx.$queryRaw<{ readOnly: string }[]>`
              SELECT current_setting('transaction_read_only') AS "readOnly"`;
              if (setting.readOnly !== "on") throw denied();
              verifiedTransactions += 1;
              return run(protect(tx, true));
            },
            {
              isolationLevel: "RepeatableRead",
              timeout: 120_000,
              maxWait: 20_000,
            },
          );
        };
      if (typeof key !== "string") return value;
      if (key === "$queryRaw")
        return (query: Prisma.Sql) => {
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
          readOperations += 1;
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
            return (...args: unknown[]) => {
              readOperations += 1;
              return Reflect.apply(read, delegate, args);
            };
          },
        });
      return value;
    },
  });
}

const metadata = (data: Partial<BankData>) => ({
  total: data.total,
  grades: data.grades,
  chapters: data.chapters,
  units: data.units,
  unitCounts: data.unitCounts,
  countUnit: data.countUnit,
  version: data.version,
});
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const median = (samples: number[]) => [...samples].sort((a, b) => a - b)[1];
const elapsed = async <T>(run: () => Promise<T>) => {
  const start = performance.now();
  const value = await run();
  return { value, ms: Number((performance.now() - start).toFixed(3)) };
};

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_MISSING");
  const raw = new PrismaClient({ log: [] });
  (globalThis as typeof globalThis & { prisma?: PrismaClient }).prisma =
    protect(raw);
  const { loadUnifiedBankBootstrap, loadUnifiedBank } =
    await import("../../src/lib/unifiedPreview");
  const { invalidateBankReadCache } =
    await import("../../src/lib/bankReadCache");
  const account = {
    id: "measurement-account",
    name: "",
    email: "",
    role: "director",
    approvalStatus: "approved",
    isAdmin: false,
    menus: ["home", "bank", "studio"],
    branchId: null,
  };
  const nodeRequire = createRequire(import.meta.url);
  const compile = (source: string) => {
    const exports: {
      default?: (props: { user: typeof account }) => Promise<{
        props: { initialData: BankData; deferBankMetadata?: boolean };
      }>;
    } = {};
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2022,
      },
    });
    runInNewContext(compiled.outputText, {
      exports,
      require: (name: string) => {
        if (name === "./UnifiedWorkspace")
          return { __esModule: true, default: "workspace-boundary" };
        if (name === "@/lib/unifiedPreview")
          return { loadUnifiedBankBootstrap };
        if (name === "@/lib/accountAccess")
          return { getAccountAccess: async () => account };
        if (name === "@/lib/fading/enabled") return { fadingGate: () => "on" };
        if (name === "react/jsx-runtime") return nodeRequire(name);
        throw new Error("UNEXPECTED_SERVER_DEPENDENCY");
      },
    });
    if (!exports.default) throw new Error("ENTRY_MISSING");
    return () => exports.default!({ user: account });
  };
  const path = "src/components/unified/WorkspacePage.tsx";
  const before = compile(
    execFileSync("git", ["show", `HEAD:${path}`], { encoding: "utf8" }),
  );
  const after = compile(readFileSync(path, "utf8"));
  const samples: {
    before: number;
    after: number;
    lazyCold: number;
    lazyWarm: number;
    afterBankReads: number;
    warmBankReads: number;
  }[] = [];
  let expectedDigest = "";
  let total = 0;
  let bytes = 0;
  try {
    for (let round = 0; round < 3; round += 1) {
      invalidateBankReadCache();
      const old = await elapsed(before);
      if (old.value.props.initialData.error)
        throw new Error("BASELINE_BANK_FAILED");
      const expected = metadata(old.value.props.initialData);
      expectedDigest = digest(expected);
      total = expected.total ?? 0;
      bytes = Buffer.byteLength(JSON.stringify(expected));
      invalidateBankReadCache();
      const readsBeforeEntry = readOperations;
      const current = await elapsed(after);
      const afterBankReads = readOperations - readsBeforeEntry;
      if (afterBankReads || !current.value.props.deferBankMetadata)
        throw new Error("ENTRY_STILL_READS_BANK");
      const cold = await elapsed(() =>
        loadUnifiedBank(
          new URLSearchParams({ identity: "question", view: "bootstrap" }),
        ),
      );
      const readsBeforeWarm = readOperations;
      unifiedBankBootstrapSchema.parse(cold.value);
      const warm = await elapsed(() =>
        loadUnifiedBank(
          new URLSearchParams({ identity: "question", view: "bootstrap" }),
        ),
      );
      const warmBankReads = readOperations - readsBeforeWarm;
      if (
        digest(metadata(cold.value)) !== expectedDigest ||
        digest(metadata(warm.value)) !== expectedDigest ||
        warmBankReads
      )
        throw new Error("METADATA_PARITY_OR_CACHE_FAILED");
      samples.push({
        before: old.ms,
        after: current.ms,
        lazyCold: cold.ms,
        lazyWarm: warm.ms,
        afterBankReads,
        warmBankReads,
      });
    }
    console.log(
      JSON.stringify(
        {
          measurement:
            "WorkspacePage bank-dependent server wait; excludes auth/HTTP/client",
          baselineRef: execFileSync("git", ["rev-parse", "HEAD"], {
            encoding: "utf8",
          }).trim(),
          readOnly: true,
          verifiedTransactions,
          samples,
          medianMs: Object.fromEntries(
            (["before", "after", "lazyCold", "lazyWarm"] as const).map(
              (key) => [key, median(samples.map((row) => row[key]))],
            ),
          ),
          total,
          metadataBytes: bytes,
          metadataSha256: expectedDigest,
          parity: true,
        },
        null,
        2,
      ),
    );
  } finally {
    await raw.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      measurementFailed: true,
      kind: error instanceof Error ? error.name : "unknown",
    }),
  );
  process.exitCode = 1;
});
