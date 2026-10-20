/**
 * Shared DB: reads only. No HTTP student actions, login, model calls or fixture writes.
 * npx tsx --conditions=react-server --env-file=/Users/pss/Desktop/creative/today_/.env scripts/qa/measure-sweep-20261020.ts
 * --only=books,course,concept,quick-create,arithmetic-reads,teaching-reads / --runs=3 / --output=<aggregate JSON path>
 * Baseline source is pinned to the checkout reviewed in the brief; responses stay in memory.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Prisma, PrismaClient } from "@prisma/client";
import type { TextbookSql } from "../../src/lib/textbook/server/sql";

const BASELINE = "560c6a0fa0d0fcb7908e0628b86bb62e6395c505";
const root = path.resolve(__dirname, "../..");
const option = (name: string) =>
  process.argv
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
const selected = new Set(
  (
    option("only") ??
    "books,course,concept,quick-create,arithmetic-reads,teaching-reads"
  ).split(","),
);
const runs = Number(option("runs") ?? 3);
assert(Number.isInteger(runs) && runs >= 1 && runs <= 10);

async function baselineModule(file: string) {
  const source = execFileSync("git", ["show", `${BASELINE}:${file}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  }).replace(
    /(from\s+["'])(\.{1,2}\/[^"']+)(["'])/g,
    (_, a, specifier, b) =>
      `${a}${path.resolve(root, path.dirname(file), specifier)}${b}`,
  );
  const folder = path.join(root, ".qa-artifacts/browser-sweep-baseline");
  await mkdir(folder, { recursive: true });
  const destination = path.join(folder, path.basename(file));
  await writeFile(destination, source);
  return import(pathToFileURL(destination).href);
}

type Operation = { name: string; ms: number; bytes: number };
type Stats = {
  calls: number;
  resultBytes: number;
  operations: Operation[];
};
let stats: Stats = { calls: 0, resultBytes: 0, operations: [] };
let observed: { name: string; ms: number; result: unknown }[] = [];
const prisma = new PrismaClient({ log: [] });
const results: Record<string, unknown> = {};

async function main() {
  await prisma.$transaction(
    async (tx) => {
      // PostgreSQL itself rejects mutations, including incidental lazy cache fills.
      await tx.$executeRaw`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`;
      const flags = await tx.$queryRaw<{ readOnly: string }[]>`
      SELECT current_setting('transaction_read_only') AS "readOnly"`;
      assert.equal(flags[0]?.readOnly, "on");
      const wrap = (target: object, prefix = ""): object =>
        new Proxy(target, {
          get(object, key) {
            if (key === "$extends") return () => client;
            if (key === "$transaction")
              throw new Error("Nested transactions forbidden");
            const value = Reflect.get(object, key);
            if (typeof value === "function")
              return async (...args: unknown[]) => {
                const start = performance.now();
                const result = await value.apply(object, args);
                stats.calls++;
                const ms = performance.now() - start;
                observed.push({ name: `${prefix}${String(key)}`, ms, result });
                return result;
              };
            return value && typeof value === "object"
              ? wrap(value, `${prefix}${String(key)}.`)
              : value;
          },
        });
      const client = wrap(tx) as PrismaClient;
      // Install before importing app DB modules. All their reads use this one READ ONLY snapshot.
      (globalThis as unknown as { prisma: PrismaClient }).prisma = client;
      const sql: TextbookSql = {
        query: (text, params = []) => client.$queryRawUnsafe(text, ...params),
        execute: async () => {
          throw new Error("Measurement writes forbidden");
        },
      };
      // A non-managed approved superadmin avoids relationship refresh side effects.
      const users = await tx.$queryRaw<
        { id: string; name: string; branchId: string | null }[]
      >`
      SELECT u.id, u.name, u.branch_id AS "branchId" FROM "user" u
      WHERE u.is_super_admin = true AND u.auth_source <> 'eywa'
        AND u.deleted_at IS NULL AND u.suspended_at IS NULL AND u.approval_status = 'approved'
        AND NOT EXISTS (SELECT 1 FROM eywa_managed_account m WHERE m.current_user_id = u.id)
      ORDER BY u.created_at, u.id LIMIT 1`;
      assert(users[0], "No eligible read-only measurement account");
      const actor = users[0];
      const viewer = {
        ...actor,
        isSuperAdmin: true,
        isAdmin: true,
        menus: ["srs", "teaching"],
        role: "director",
      };
      const now = new Date();
      type Loader = () => Promise<unknown>;
      const measure = async (load: Loader) => {
        stats = { calls: 0, resultBytes: 0, operations: [] };
        observed = [];
        const start = performance.now();
        const data = await load();
        const ms = +(performance.now() - start).toFixed(1);
        // Size accounting happens after stopping the reader timer.
        for (const { name, ms: callMs, result } of observed) {
          const bytes = Buffer.byteLength(
            JSON.stringify(result, (_, value) =>
              typeof value === "bigint" ? value.toString() : value,
            ) ?? "",
          );
          stats.resultBytes += bytes;
          if (option("detail") === "1")
            stats.operations.push({ name, ms: +callMs.toFixed(1), bytes });
        }
        return {
          data,
          ms,
          ...stats,
        };
      };
      const compare = async (label: string, before: Loader, after: Loader) => {
        const samples = [];
        for (let run = 1; run <= runs; run++) {
          // Alternate the order so query warming does not always favor the new implementation.
          const [old, next] =
            run % 2
              ? [await measure(before), await measure(after)]
              : await (async () => {
                  const next = await measure(after);
                  return [await measure(before), next];
                })();
          // Full response comparison without printing names, student records, answers or hashes.
          assert.deepEqual(next.data, old.data, `${label}: response mismatch`);
          const { data: oldData, ...beforeStats } = old;
          const { data: newData, ...afterStats } = next;
          void oldData;
          void newData;
          const sample = {
            run,
            before: beforeStats,
            after: afterStats,
            equal: true,
          };
          samples.push(sample);
          console.log(JSON.stringify({ service: label, ...sample }));
        }
        results[label] = samples;
      };
      if (selected.has("books")) {
        const [old, next] = await Promise.all([
          baselineModule("src/lib/textbook/server/books.ts"),
          import("../../src/lib/textbook/server/books"),
        ]);
        await compare(
          "books",
          () => old.listBooks(sql, actor),
          () => next.listBooks(sql, actor),
        );
      }
      if (selected.has("course")) {
        const [old, next] = await Promise.all([
          baselineModule("src/lib/math-srs/courseServer.ts"),
          import("../../src/lib/math-srs/courseServer"),
        ]);
        await compare(
          "course",
          () => old.loadCourseDashboard(viewer, now),
          () => next.loadCourseDashboard(viewer, now),
        );
      }
      if (selected.has("concept")) {
        const [old, next] = await Promise.all([
          baselineModule("src/lib/concept/adminService.ts"),
          import("../../src/lib/concept/adminService"),
        ]);
        await compare(
          "concept",
          () => old.loadConceptBoard(viewer, true, now),
          () => next.loadConceptBoard(viewer, true, now),
        );
      }
      if (selected.has("quick-create")) {
        const { runQuickCreateMeasurement } =
          await import("./sweep-20261020/quickCreate");
        const result = await runQuickCreateMeasurement({
          db: tx,
          sql,
          rounds: runs,
        });
        results["quick-create"] = result;
        for (const sample of result.samples)
          console.log(JSON.stringify({ service: "quick-create", ...sample }));
      }
      if (selected.has("arithmetic-reads")) {
        const started = performance.now();
        const { listArithmeticV2Types } =
          await import("../../src/lib/arithmetic-v2/catalog");
        const { loadUsageLabels } =
          await import("../../src/lib/usageLabels/load");
        const moduleLoadMs = +(performance.now() - started).toFixed(1);
        // Same all-grades first page as the workbench (24 types). No HTTP POST or write action.
        const { sortArithmeticCatalog } =
          await import("../../src/lib/arithmetic-v2/presentation/catalogOrder");
        const body = {
          arithmeticV2TypeIds: sortArithmeticCatalog(listArithmeticV2Types())
            .slice(0, 24)
            .map((type) => type.id),
        };
        await compare(
          "arithmetic-catalog-unchanged",
          async () => listArithmeticV2Types(),
          async () => listArithmeticV2Types(),
        );
        await compare(
          "arithmetic-labels-unchanged",
          () => loadUsageLabels(viewer, body, now),
          () => loadUsageLabels(viewer, body, now),
        );
        results["arithmetic-module-load"] = {
          moduleLoadMs,
          note: "Process import on this machine, separate from reader timing; unchanged server code.",
        };
        console.log(
          JSON.stringify({ service: "arithmetic-module-load", moduleLoadMs }),
        );
      }
      if (selected.has("teaching-reads")) {
        const { loadTeachingData } =
          await import("../../src/lib/studio-ai/teaching");
        const { listClasses } = await import("../../src/lib/class/listClasses");
        const teacher: import("../../src/lib/session").SessionUser = {
          ...actor,
          email: "",
          isAdmin: true,
          isSuperAdmin: true,
          menus: ["srs", "teaching"],
        };
        // The class helper is a behavior-preserving extraction of the old classes GET.
        // Compare its old sequential composition with the opt-in combined bootstrap.
        // One READ ONLY connection cannot measure the HTTP round trip removed by the UI.
        await compare(
          "teaching-server-composition",
          async () => {
            const data = await loadTeachingData(teacher, false);
            const page = await listClasses(teacher, 1, 100);
            return { ...data, classes: { status: "ready", page } };
          },
          () => loadTeachingData(teacher, true),
        );
      }
      if (option("output")) {
        const target = path.resolve(root, option("output")!);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(
          target,
          JSON.stringify(
            {
              baseline: BASELINE,
              measuredAt: now.toISOString(),
              readOnly: true,
              results,
            },
            null,
            2,
          ) + "\n",
        );
      }
    },
    {
      timeout: 240_000,
      maxWait: 30_000,
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
}

main()
  .catch((error: unknown) => {
    // Never serialize database errors: they may include SQL parameters or connection details.
    // AssertionError.message can contain an entire actual/expected diff.
    console.error("Read-only sweep measurement failed (details withheld)");
    if (error instanceof Error) {
      console.error(error.name);
      console.error(
        error.stack
          ?.split("\n")
          .filter((line) => /^\s+at /.test(line))
          .slice(0, 4)
          .join("\n"),
      );
    }
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
