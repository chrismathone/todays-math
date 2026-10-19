/**
 * Shared DB, reads only (no account/student reads). From the repo root:
 * node_modules/.bin/tsx --conditions=react-server --env-file=/Users/pss/Desktop/creative/today_/.env scripts/qa/measure-question-format-column-live.ts
 * Optional arguments: baseline Git ref, output JSON path.
 * FORMAT_MEASURE_BASELINE_DIR freezes an uncommitted first-pass source snapshot
 * (including its manifest); FORMAT_MEASURE_VALIDATED=1 also measures a second
 * request with the DB fingerprint query still included. Cold samples always
 * clear both implementations' own caches.
 * Each round compares old/current readers in one verified READ ONLY snapshot.
 * Freezes all changed reader dependencies at the baseline ref. Measures server reader work, excluding auth, compilation, HTTP and client rendering.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { dirname, resolve, relative } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { PrismaClient, Prisma } from "@prisma/client";
import { DIFFICULTY_LADDER } from "../../src/contracts/difficulty";

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
let invalidFormatRows = 0;
const queryStats: { mode: string; ms: number; rows: number }[] = [];
const rounds = Number(process.env.FORMAT_MEASURE_ROUNDS ?? 3);
if (![1, 2, 3].includes(rounds)) throw new Error("INVALID_ROUNDS");

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
          return (async () => {
            const started = performance.now();
            const result = await (
              value as (query: Prisma.Sql) => Promise<unknown[]>
            ).call(target, query);
            const read = query as Prisma.Sql & {
              questionCountRead?: { mode: string; onlyInvalid?: boolean };
              bankReadFingerprint?: boolean;
            };
            queryStats.push({
              mode:
                read.questionCountRead?.mode ??
                (read.bankReadFingerprint ? "fingerprint" : "other"),
              ms: Number((performance.now() - started).toFixed(3)),
              rows: result.length,
            });
            if (read.questionCountRead?.mode === "formats")
              invalidFormatRows += result.filter(
                (row) =>
                  (row as { actualFormat: unknown }).actualFormat === null,
              ).length;
            return result;
          })();
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
  cacheMode: "cold" | "validated";
  scenario: string;
  ms: number;
  reads: number;
  candidateScans: number;
  candidateRows: number;
  responseBytes: number;
  responseSha256: string;
  invalidFormatRows: number;
  queries: typeof queryStats;
  byteEqual: boolean;
};
const baselineDirectory = process.env.FORMAT_MEASURE_BASELINE_DIR;
const baselineRef = baselineDirectory
  ? `working-tree-r1:${createHash("sha256")
      .update(readFileSync(resolve(baselineDirectory, "manifest.json")))
      .digest("hex")}`
  : execFileSync("git", ["rev-parse", process.argv[2] ?? "HEAD"], {
      encoding: "utf8",
    }).trim();
const outputPath = resolve(
  process.argv[3] ??
    "docs/planning/tracks/reports/question-format-column-code-codex-20261019-measurements.json",
);

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_MISSING");
  const temporary = await mkdtemp(resolve(".question-format-baseline-"));
  const raw = new PrismaClient({ log: [] });
  try {
    const files = [
      "src/lib/unifiedPreview.ts",
      "src/lib/unifiedBankSelection.ts",
      "src/lib/bankSourceQuestions.ts",
      "src/lib/bankSourceAvailability.ts",
      "src/lib/bankSourceCounts.ts",
      "src/lib/bankReadCache.ts",
      ...[
        "questionProjection",
        "questionCountProjection",
        "questionCountSql",
        "questionCountBuckets",
        "formatQuery",
      ].map((name) => `src/lib/problem/${name}.ts`),
      ...(baselineDirectory
        ? ["actualFormat", "actualFormatProjection"].map(
            (name) => `src/lib/problem/${name}.ts`,
          )
        : []),
    ];
    const { mkdir } = await import("node:fs/promises");
    for (const file of files) {
      const target = resolve(temporary, file);
      await mkdir(dirname(target), { recursive: true });
      const source = baselineDirectory
        ? await readFile(resolve(baselineDirectory, file), "utf8")
        : execFileSync("git", ["show", `${baselineRef}:${file}`], {
            encoding: "utf8",
          });
      const frozen = source.replace(
        /(\bfrom\s*|\bimport\s*)["']([^"']+)["']/g,
        (match, prefix: string, spec: string) => {
          const path = spec.startsWith("@/")
            ? resolve("src", spec.slice(2))
            : spec.startsWith(".")
              ? resolve(dirname(file), spec)
              : null;
          if (!path) return match;
          const local = `${relative(process.cwd(), path)}.ts`;
          const imported = files.includes(local)
            ? resolve(temporary, local)
            : path;
          return `${prefix}${JSON.stringify(imported)}`;
        },
      );
      await writeFile(target, frozen);
    }
    (globalThis as typeof globalThis & { prisma?: PrismaClient }).prisma =
      protect(raw);
    const after = {
      ...(await import("../../src/lib/unifiedPreview")),
      ...(await import("../../src/lib/bankSourceQuestions")),
      ...(await import("../../src/lib/unifiedBankSelection")),
    };
    const before = {
      ...(await import(
        pathToFileURL(resolve(temporary, "src/lib/unifiedPreview.ts")).href
      )),
      ...(await import(
        pathToFileURL(resolve(temporary, "src/lib/bankSourceQuestions.ts")).href
      )),
      ...(await import(
        pathToFileURL(resolve(temporary, "src/lib/unifiedBankSelection.ts"))
          .href
      )),
    } as typeof after;
    const { invalidateBankReadCache } =
      await import("../../src/lib/bankReadCache");
    const beforeCache = (await import(
      pathToFileURL(resolve(temporary, "src/lib/bankReadCache.ts")).href
    )) as { invalidateBankReadCache: () => void };
    const params = (filters: Record<string, string>) =>
      new URLSearchParams({ identity: "question", ...filters });
    let fixture: {
      id: string;
      unitId: string;
      materialId: string;
      bookId: string;
    };
    async function seeded<T>(run: () => Promise<T>) {
      const original = Math.random;
      let seed = 19102026;
      Math.random = () =>
        (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
      try {
        return await run();
      } finally {
        Math.random = original;
      }
    }
    const scenarios = (
      reader: typeof after,
    ): [string, () => Promise<unknown>][] => [
      [
        "문제은행 전체 1쪽",
        () => reader.loadUnifiedBank(params({ page: "1", pageSize: "12" })),
      ],
      [
        "다른 필터 중2 5쪽",
        () =>
          reader.loadUnifiedBank(
            params({ grade: "중2", page: "5", pageSize: "12" }),
          ),
      ],
      [
        "객관식 1쪽",
        () =>
          reader.loadUnifiedBank(
            params({ availableFormat: "multiple_choice", pageSize: "12" }),
          ),
      ],
      [
        "범위 수량 전체·갈래",
        () =>
          reader.loadQuestionSourceAvailability(
            params({ view: "available", families: "1" }),
          ),
      ],
      [
        "범위 수량 중2·기본·단답형",
        () =>
          reader.loadQuestionSourceAvailability(
            params({
              view: "available",
              grade: "중2",
              difficulty: "기본",
              availableFormat: "short_answer",
              families: "1",
            }),
          ),
      ],
      ["출처 고르기", () => reader.loadQuestionSourceCounts(params({}))],
      ["작업실 bootstrap", () => reader.loadUnifiedBankBootstrap("question")],
      [
        "자료 안 목록",
        () =>
          reader.loadUnifiedBank(
            params({
              sourceGroup: "school_textbook",
              materials: fixture.materialId,
              pageSize: "12",
            }),
          ),
      ],
      [
        "책의 자료 수량",
        () =>
          reader.loadQuestionSourceMaterials(
            params({
              books: fixture.bookId,
              view: "materials",
              availableFormat: "short_answer",
            }),
          ),
      ],
      [
        "저장된 실제 ID",
        () =>
          reader.loadUnifiedBank(params({ ids: fixture.id, pageSize: "12" })),
      ],
      [
        "시험지 후보 선택",
        () =>
          seeded(() =>
            reader.selectUnifiedBankProblems({
              identity: "question",
              filters: new URLSearchParams({
                unitIds: fixture.unitId,
              }).toString(),
              counts: Object.fromEntries(
                DIFFICULTY_LADDER.map((tier) => [
                  tier,
                  tier === "기본" ? 2 : 0,
                ]),
              ),
            }),
          ),
      ],
    ];
    const samples: Sample[] = [];
    for (let round = 1; round <= rounds; round++) {
      await productClient.$transaction(
        async (tx) => {
          await tx.$executeRaw`SET TRANSACTION READ ONLY`;
          const [setting] = await tx.$queryRaw<{ readOnly: string }[]>`
          SELECT current_setting('transaction_read_only') AS "readOnly"`;
          if (setting.readOnly !== "on") throw denied();
          // Cold/custom plans for both implementations; deterministic serial
          // scans avoid the legacy unordered JSON-key order varying by worker.
          await tx.$executeRaw`SET LOCAL plan_cache_mode = 'force_custom_plan'`;
          await tx.$executeRaw`SET LOCAL max_parallel_workers_per_gather = 0`;
          verifiedTransactions++;
          await scope.run(protect(tx, true), async () => {
            const [selected] = await scope.getStore()!.$queryRaw<
              (typeof fixture)[]
            >(Prisma.sql`
              SELECT p.id,p.unit_id AS "unitId",p.source_material_id AS "materialId",m.book_id AS "bookId"
              FROM problem p JOIN source_material m ON m.id=p.source_material_id
              WHERE p.pool='shared' AND p.source='school_textbook' AND p.review_status='approved' AND p.direct_use_allowed=true
              ORDER BY p.id LIMIT 1`);
            if (!selected) throw new Error("EMPTY_TEXTBOOK_FIXTURE");
            fixture = selected;
            const reference = new Map<string, Buffer>();
            for (const [version, reader] of [
              ["before", before],
              ["after", after],
            ] as const) {
              invalidateBankReadCache();
              for (const [scenario, run] of scenarios(reader).filter(
                ([name]) =>
                  !process.env.FORMAT_MEASURE_SCENARIO ||
                  name === process.env.FORMAT_MEASURE_SCENARIO,
              )) {
                for (const cacheMode of (version === "after" &&
                process.env.FORMAT_MEASURE_VALIDATED === "1"
                  ? ["cold", "validated"]
                  : ["cold"]) as Sample["cacheMode"][]) {
                  if (cacheMode === "cold") {
                    invalidateBankReadCache();
                    beforeCache.invalidateBankReadCache();
                  }
                  const startInvalid = invalidFormatRows,
                    startQueries = queryStats.length;
                  const startReads = readOperations,
                    startScans = candidateScans,
                    startRows = candidateRows;
                  const start = performance.now();
                  const value = await run();
                  const ms = Number((performance.now() - start).toFixed(3));
                  // Raw JSON bytes, without key sorting or normalization.
                  const bytes = Buffer.from(JSON.stringify(value));
                  if (version === "before") reference.set(scenario, bytes);
                  const sample: Sample = {
                    round,
                    version,
                    cacheMode,
                    scenario,
                    ms,
                    reads: readOperations - startReads,
                    candidateScans: candidateScans - startScans,
                    candidateRows: candidateRows - startRows,
                    responseBytes: bytes.length,
                    responseSha256: createHash("sha256")
                      .update(bytes)
                      .digest("hex"),
                    invalidFormatRows: invalidFormatRows - startInvalid,
                    queries: queryStats.slice(startQueries),
                    byteEqual: bytes.equals(reference.get(scenario)!),
                  };
                  if (!sample.byteEqual) {
                    const old = JSON.parse(
                      reference.get(scenario)!.toString(),
                    ) as Record<string, unknown>;
                    const current = value as Record<string, unknown>;
                    const keys = Object.keys(current).filter(
                      (key) =>
                        JSON.stringify(old[key]) !==
                        JSON.stringify(current[key]),
                    );
                    console.log(`불일치 필드: ${keys.join(", ")}`);
                  }
                  samples.push(sample);
                  console.log(
                    `${round}/${rounds} ${version}/${cacheMode} ${scenario}: ${ms}ms, 후보 ${sample.candidateScans}회/${sample.candidateRows}행, 바이트 ${sample.byteEqual ? "일치" : "불일치"}`,
                  );
                }
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
          rounds,
          solverRandomSeed: 19102026,
          planCacheMode: "force_custom_plan",
          maxParallelWorkersPerGather: 0,
          scope:
            "server readers; each path clears app caches; auth/HTTP/compile/client excluded; read-only same-snapshot rounds",
          samples,
        },
        null,
        2,
      ) + "\n",
    );
    if (samples.some((sample) => !sample.byteEqual))
      throw new Error("RESPONSE_BYTES_CHANGED");
    console.log(
      `READ ONLY ${verifiedTransactions}/${rounds} 확인, 전/후 응답 ${samples.filter((sample) => sample.version === "after").length}건 바이트 일치 · ${outputPath}`,
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
