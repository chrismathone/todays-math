/**
 * Independent H2 verification. No Next server, account, network API or DB writes.
 *
 * TSX_DISABLE_CACHE=1 node node_modules/tsx/dist/cli.mjs scripts/qa/measure-builder-h2-flow.ts
 * Optional: --rounds 7 --db-rounds 3 --root /absolute/product/worktree
 * --baseline-from-git exercises the automatic missing-snapshot fallback without
 * removing any files: all three baseline files come from the pinned commit in RAM.
 * Only this script and the two fixed /tmp report files are written. Actual bank
 * responses cross a private child-process IPC channel and remain in memory.
 * The DB child receives NODE_OPTIONS=--conditions=react-server and the authorized
 * env-file. It verifies READ ONLY before every product read and always rolls back.
 * The parent runs real ExamBuilder + mathSource in jsdom; these are local DOM
 * timings and intercepted request counts, never authenticated HTTP timings.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runInThisContext } from "node:vm";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { UnitEntity } from "../../src/contracts/unit.contract";
import type {
  BankData,
  StudioProblem,
} from "../../src/components/unified/types";
import type { BankSourceAvailability } from "../../src/contracts/bankSource.contract";
import type {
  ExamBuilderProps,
  ExamScope,
} from "../../src/components/exam-builder/types";
import type * as ReactTypes from "react";

const args = process.argv.slice(2);
function argument(name: string, fallback: string) {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
}
const script = fileURLToPath(import.meta.url);
const root = path.resolve(
  argument("--root", path.resolve(path.dirname(script), "../..")),
);
const baseline = "/tmp/builder-h2-impl-baseline";
const baselineCommit = "b353aff927677b475ff167137214898879ac27c5";
const envFile = "/Users/pss/Desktop/creative/today_/.env";
const resultFile = "/tmp/builder-h2-flow-results.json";
const reviewFile = "/tmp/builder-h2-flow-review.md";
const rounds = Number(argument("--rounds", "7"));
const dbRounds = Number(argument("--db-rounds", "3"));
const nodeRequire = createRequire(path.join(root, "package.json"));
const sha = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(value) ?? "undefined")
    .digest("hex");
const sourceSha = (source: string) =>
  createHash("sha256").update(source, "utf8").digest("hex");
const ms = (value: number) => Number(value.toFixed(3));
function baselineGitFile(file: string) {
  return execFileSync("git", ["show", `${baselineCommit}:${file}`], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}
function baselineFile(name: string) {
  const snapshot = path.join(baseline, name);
  return !args.includes("--baseline-from-git") && existsSync(snapshot)
    ? readFileSync(snapshot, "utf8")
    : baselineGitFile(`src/components/exam-builder/${name}`);
}
function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}
function codeOf(error: unknown) {
  const code = (error as { code?: unknown })?.code;
  const message = (error as { message?: unknown })?.message;
  if (typeof code === "string" && /^(P\d{4}|E[A-Z_]+|QA_[A-Z_]+)$/.test(code))
    return code;
  if (typeof message === "string" && /^QA_[A-Z_]+$/.test(message))
    return message;
  return "QA_READ_OR_RUNTIME_ERROR";
}
function assert(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`QA_${code}`);
}
type BankFixture = {
  bootstrap: BankData & { units: UnitEntity[] };
  inventories: Record<string, BankSourceAvailability>;
};
type DbSample = {
  round: number;
  cache: string;
  route: string;
  ms: number;
  readOperations: number;
  digest: string;
};
type DbResult = {
  status: "passed" | "blocked";
  code?: string;
  verifiedTransactions: number;
  rolledBackTransactions: number;
  readOperations: number;
  guardChecks: number;
  samples: DbSample[];
  responseDigestsStable: boolean;
  fixture?: BankFixture;
};

/** Defense in depth: read allowlist + scoped client + actual PostgreSQL READ ONLY. */
async function collectDatabase(): Promise<DbResult> {
  const { PrismaClient: Client } = await import("@prisma/client");
  const scope = new AsyncLocalStorage<Prisma.TransactionClient>();
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
  let extended: PrismaClient | undefined;
  const result: DbResult = {
    status: "blocked",
    verifiedTransactions: 0,
    rolledBackTransactions: 0,
    readOperations: 0,
    guardChecks: 0,
    samples: [],
    responseDigestsStable: false,
  };
  const denied = () => new Error("QA_READ_ONLY_GUARD");
  function protect<T extends object>(target: T, inTransaction = false): T {
    return new Proxy(target, {
      get(client, key, receiver) {
        const active = scope.getStore();
        if (key === "$extends")
          return (extension: Parameters<PrismaClient["$extends"]>[0]) => {
            if (inTransaction) throw denied();
            extended = (client as unknown as PrismaClient).$extends(
              extension,
            ) as unknown as PrismaClient;
            return protect(extended);
          };
        if (key === "$transaction")
          return (run: unknown) => {
            if (!active || typeof run !== "function" || inTransaction)
              throw denied();
            return run(active);
          };
        if (typeof key !== "string") return Reflect.get(client, key, receiver);
        if (!inTransaction && active && !key.startsWith("$"))
          return Reflect.get(active, key);
        if (key === "$queryRaw")
          return (query: Prisma.Sql) => {
            if (!inTransaction && active) return active.$queryRaw(query);
            if (
              !inTransaction ||
              !query ||
              typeof query.text !== "string" ||
              !/^\s*(SELECT|WITH)\b/i.test(query.text) ||
              /;|\b(INSERT|UPDATE|DELETE|MERGE|ALTER|DROP|CREATE|TRUNCATE|CALL|COPY|GRANT|REVOKE|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|SET|RESET|DISCARD|DO|EXECUTE|PREPARE|VACUUM|REFRESH|LISTEN|NOTIFY|set_config|nextval|setval|pg_advisory_lock)\b/i.test(
                query.text,
              )
            )
              throw denied();
            result.readOperations += 1;
            return (
              Reflect.get(client, key) as (
                query: Prisma.Sql,
              ) => Promise<unknown>
            ).call(client, query);
          };
        if (key.startsWith("$")) throw denied();
        const value = Reflect.get(client, key, receiver);
        if (value && typeof value === "object")
          return new Proxy(value, {
            get(delegate, operation) {
              if (
                !inTransaction ||
                typeof operation !== "string" ||
                !reads.has(operation)
              )
                throw denied();
              const read = Reflect.get(delegate, operation);
              if (typeof read !== "function") throw denied();
              return (...values: unknown[]) => {
                result.readOperations += 1;
                return Reflect.apply(read, delegate, values);
              };
            },
          });
        return value;
      },
    });
  }
  // Synthetic negative checks do not contact the database or attempt real writes.
  const fake = protect({
    problem: {
      update: () => {
        throw new Error("QA_GUARD_FAILED");
      },
    },
  });
  const fakeTx = protect(
    {
      problem: {},
      $queryRaw: (query: unknown) => {
        void query;
        throw new Error("QA_GUARD_FAILED");
      },
    },
    true,
  );
  const checks = [
    () => Reflect.get(fake.problem, "findMany"),
    () => Reflect.get(fake.problem, "update"),
    () => Reflect.get(fakeTx.problem, "deleteMany"),
    () => Reflect.get(fakeTx, "$executeRaw"),
    () => Reflect.get(fakeTx, "$queryRawUnsafe"),
    () => Reflect.get(fake, "$transaction")([]),
    () => Reflect.get(fake, "$queryRaw")({ text: "SELECT 1" }),
    () =>
      Reflect.get(
        fakeTx,
        "$queryRaw",
      )({
        text: "WITH changed AS (DELETE FROM example RETURNING *) SELECT * FROM changed",
      }),
    () =>
      Reflect.get(fakeTx, "$queryRaw")({ text: "SELECT nextval('example')" }),
    () => Reflect.get(fakeTx, "$queryRaw")({ text: "SELECT 1; COMMIT" }),
  ];
  for (const check of checks) {
    let rejected = false;
    try {
      check();
    } catch (error) {
      rejected = codeOf(error) === "QA_READ_ONLY_GUARD";
    }
    assert(rejected, "NEGATIVE_GUARD_FAILED");
    result.guardChecks += 1;
  }
  if (!process.env.DATABASE_URL)
    return { ...result, code: "QA_DATABASE_URL_MISSING" };
  const raw = new Client({ log: [] });
  (globalThis as typeof globalThis & { prisma?: PrismaClient }).prisma =
    protect(raw);
  try {
    const preview = await import(
      pathToFileURL(path.join(root, "src/lib/unifiedPreview.ts")).href
    );
    const availability = await import(
      pathToFileURL(path.join(root, "src/lib/bankSourceAvailability.ts")).href
    );
    const cache = await import(
      pathToFileURL(path.join(root, "src/lib/bankReadCache.ts")).href
    );
    assert(extended, "DB_EXTENSION_MISSING");
    const rollback = new Error("QA_INTENTIONAL_ROLLBACK");
    async function readOnly<T>(run: () => Promise<T>): Promise<T> {
      let output: T | undefined;
      let completed = false;
      try {
        await extended!.$transaction(
          async (tx) => {
            await tx.$executeRaw`SET TRANSACTION READ ONLY`;
            const [setting] = await tx.$queryRaw<
              { readOnly: string; isolation: string }[]
            >`SELECT current_setting('transaction_read_only') AS "readOnly", current_setting('transaction_isolation') AS "isolation"`;
            assert(
              setting?.readOnly === "on" &&
                setting.isolation === "repeatable read",
              "TRANSACTION_NOT_READ_ONLY",
            );
            result.verifiedTransactions += 1;
            output = await scope.run(protect(tx, true), run);
            completed = true;
            throw rollback;
          },
          {
            isolationLevel: "RepeatableRead",
            timeout: 120_000,
            maxWait: 20_000,
          },
        );
      } catch (error) {
        if (error !== rollback) throw error;
        result.rolledBackTransactions += 1;
      }
      assert(completed, "READ_NOT_COMPLETED");
      return output as T;
    }
    const digests = new Map<string, string>();
    let stable = true;
    for (let round = 0; round < dbRounds; round += 1) {
      const fixture = await readOnly(async () => {
        cache.invalidateBankReadCache();
        const data: BankFixture = {
          bootstrap: {} as BankFixture["bootstrap"],
          inventories: {},
        };
        const paths: [string, () => Promise<unknown>][] = [
          [
            "bootstrap",
            () =>
              preview.loadUnifiedBank(
                new URLSearchParams({
                  identity: "question",
                  view: "bootstrap",
                }),
              ),
          ],
          [
            "allWithoutRecent",
            () =>
              availability.loadBankSourceAvailability(
                new URLSearchParams({
                  identity: "question",
                  view: "available",
                  families: "1",
                }),
              ),
          ],
          [
            "textbookWithoutRecent",
            () =>
              availability.loadBankSourceAvailability(
                new URLSearchParams({
                  identity: "question",
                  view: "available",
                  families: "1",
                  sourceGroup: "school_textbook",
                }),
              ),
          ],
          // Real default UI sends recent=1. Supply an explicit empty exclusion
          // context to the pure reader, without selecting/impersonating an account.
          // This measures shared-bank capacity, never a teacher's personal capacity.
          [
            "all",
            () =>
              availability.loadBankSourceAvailability(
                new URLSearchParams({
                  identity: "question",
                  view: "available",
                  families: "1",
                  recent: "1",
                }),
                { recentProblemIds: async () => [] },
              ),
          ],
          [
            "textbook",
            () =>
              availability.loadBankSourceAvailability(
                new URLSearchParams({
                  identity: "question",
                  view: "available",
                  families: "1",
                  recent: "1",
                  sourceGroup: "school_textbook",
                }),
                { recentProblemIds: async () => [] },
              ),
          ],
        ];
        for (const cacheState of ["cold", "warm"])
          for (const [route, run] of paths) {
            const operations = result.readOperations;
            const start = performance.now();
            const value = await run();
            const elapsed = ms(performance.now() - start);
            const digest = sha(value);
            const prior = digests.get(route);
            if (prior && prior !== digest) stable = false;
            digests.set(route, digest);
            result.samples.push({
              round: round + 1,
              cache: cacheState,
              route,
              ms: elapsed,
              readOperations: result.readOperations - operations,
              digest,
            });
            if (cacheState === "cold") {
              if (route === "bootstrap")
                data.bootstrap = value as BankFixture["bootstrap"];
              else data.inventories[route] = value as BankSourceAvailability;
            }
          }
        return data;
      });
      if (round === 0) result.fixture = fixture;
      process.send?.({ type: "progress", round: round + 1 });
    }
    result.responseDigestsStable = stable;
    result.status = "passed";
  } catch (error) {
    result.code = codeOf(error);
    // Never substitute a made-up fixture after a network/auth/reader failure.
    delete result.fixture;
  } finally {
    await raw.$disconnect();
  }
  return result;
}

async function databaseChild(): Promise<DbResult> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        "--env-file",
        envFile,
        "--import",
        pathToFileURL(path.join(root, "node_modules/tsx/dist/loader.mjs")).href,
        script,
        "--db-child",
        "--root",
        root,
        "--db-rounds",
        String(dbRounds),
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          TSX_DISABLE_CACHE: "1",
          NODE_OPTIONS:
            `${process.env.NODE_OPTIONS ?? ""} --conditions=react-server`.trim(),
        },
        stdio: ["ignore", "ignore", "ignore", "ipc"],
        serialization: "advanced",
      },
    );
    let answer: DbResult | undefined;
    child.on("message", (message: unknown) => {
      const entry = message as {
        type?: string;
        value?: DbResult;
        round?: number;
      };
      if (entry.type === "result") answer = entry.value;
      if (entry.type === "progress")
        console.log(`READ ONLY · DB ${entry.round}/${dbRounds}회 완료`);
    });
    child.on("error", () =>
      resolve({
        status: "blocked",
        code: "QA_DB_CHILD_SPAWN",
        verifiedTransactions: 0,
        rolledBackTransactions: 0,
        readOperations: 0,
        guardChecks: 0,
        samples: [],
        responseDigestsStable: false,
      }),
    );
    child.on("exit", () =>
      resolve(
        answer ?? {
          status: "blocked",
          code: "QA_DB_CHILD_NO_RESULT",
          verifiedTransactions: 0,
          rolledBackTransactions: 0,
          readOperations: 0,
          guardChecks: 0,
          samples: [],
          responseDigestsStable: false,
        },
      ),
    );
  });
}

type RequestRecord = {
  method: string;
  pathname: string;
  kind: string;
  stage: string;
  recent: boolean;
  memoryResponseMs: number;
};
type Flow = {
  version: string;
  inventory: string;
  entry: string;
  grade: string;
  round: number;
  stages: Record<
    string,
    { ms: number; requests: number; detailInputs: number }
  >;
  requests: RequestRecord[];
  selected: number;
  totalMs: number;
};

function productLoader(version: "before" | "after") {
  const ts: typeof import("typescript") = nodeRequire("typescript");
  const modules = new Map<string, { exports: Record<string, unknown> }>();
  const hashes: Record<string, string> = {};
  const builderDir = path.join(root, "src/components/exam-builder");
  function load(file: string): Record<string, unknown> {
    if (modules.has(file)) return modules.get(file)!.exports;
    assert(!file.endsWith("/src/lib/db.ts"), "CLIENT_DB_IMPORT_BLOCKED");
    const compiledModule = { exports: {} as Record<string, unknown> };
    modules.set(file, compiledModule);
    if (file.endsWith(".css")) {
      compiledModule.exports = {
        __esModule: true,
        default: new Proxy({}, { get: (_target, key) => String(key) }),
      };
      return compiledModule.exports;
    }
    let source: string;
    const name = path.basename(file);
    if (
      version === "before" &&
      path.dirname(file) === builderDir &&
      ["ExamBuilder.tsx", "ScopePicker.tsx"].includes(name)
    )
      source = baselineFile(name);
    else if (version === "before")
      source = baselineGitFile(path.relative(root, file));
    else source = readFileSync(file, "utf8");
    hashes[path.relative(root, file)] = sourceSha(source);
    if (file.endsWith(".json")) {
      compiledModule.exports = JSON.parse(source);
      return compiledModule.exports;
    }
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const requireProduct = (specifier: string) => {
      if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
        assert(
          specifier !== "server-only" && specifier !== "@prisma/client",
          "SERVER_IMPORT_BLOCKED",
        );
        return nodeRequire(specifier);
      }
      const base = specifier.startsWith("@/")
        ? path.join(root, "src", specifier.slice(2))
        : path.resolve(path.dirname(file), specifier);
      const resolved = [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        `${base}.json`,
        path.join(base, "index.ts"),
        path.join(base, "index.tsx"),
      ].find((candidate) => existsSync(candidate) && !candidate.endsWith("/"));
      assert(resolved, "PRODUCT_MODULE_MISSING");
      return load(resolved);
    };
    const evaluate = runInThisContext(
      `(function(require,module,exports,__filename,__dirname){${output}\n})`,
      { filename: file },
    );
    evaluate(
      requireProduct,
      compiledModule,
      compiledModule.exports,
      file,
      path.dirname(file),
    );
    return compiledModule.exports;
  }
  return { load, hashes };
}

async function measureDom(fixture: BankFixture) {
  const { JSDOM } = nodeRequire("jsdom");
  const dom = new JSDOM(
    "<!doctype html><html><body><main id='root'></main></body></html>",
    { url: "http://offline.invalid/", pretendToBeVisual: true },
  );
  const exposed = [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLSelectElement",
    "HTMLDialogElement",
    "MutationObserver",
    "Event",
    "MouseEvent",
    "CustomEvent",
    "Node",
    "getComputedStyle",
    "requestAnimationFrame",
    "cancelAnimationFrame",
  ];
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const key of exposed) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    const value = dom.window[key];
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value:
        typeof value === "function" &&
        [
          "getComputedStyle",
          "requestAnimationFrame",
          "cancelAnimationFrame",
        ].includes(key)
          ? value.bind(dom.window)
          : value,
    });
  }
  const globals = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
    ResizeObserver?: unknown;
  };
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  globals.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  const React: typeof ReactTypes = nodeRequire("react");
  const { createRoot }: typeof import("react-dom/client") =
    nodeRequire("react-dom/client");
  const { fireEvent }: typeof import("@testing-library/dom") = nodeRequire(
    "@testing-library/dom",
  );
  const document: Document = dom.window.document;
  const container = document.getElementById("root")!;
  const clients = {
    before: productLoader("before"),
    after: productLoader("after"),
  };
  const sources = Object.fromEntries(
    Object.entries(clients).map(([version, loader]) => [
      version,
      {
        ExamBuilder: loader.load(
          path.join(root, "src/components/exam-builder/ExamBuilder.tsx"),
        ).default as ReactTypes.ComponentType<ExamBuilderProps<StudioProblem>>,
        factory: loader.load(
          path.join(root, "src/components/exam-builder/mathSource.ts"),
        )
          .createMathExamBuilderSource as typeof import("../../src/components/exam-builder/mathSource").createMathExamBuilderSource,
      },
    ]),
  );
  const nativeFetch = globalThis.fetch;
  const flows: Flow[] = [];
  let activeMock: typeof fetch | undefined;
  globalThis.fetch = ((...values: Parameters<typeof fetch>) => {
    assert(activeMock, "NO_ACTIVE_OFFLINE_FETCH");
    return activeMock(...values);
  }) as typeof fetch;
  try {
    for (const inventory of ["all", "textbook"]) {
      const value = fixture.inventories[inventory];
      assert(value.facets?.unitFamilies, "FAMILY_COUNTS_MISSING");
      const families = value.facets.unitFamilies;
      const grades = [
        ...new Set(
          fixture.bootstrap.units
            .filter((unit) => (families[unit.id] ?? 0) > 0)
            .map((unit) => unit.grade),
        ),
      ];
      for (const entry of ["workspace-units", "deferred-units"]) {
        for (const grade of grades) {
          const selectedUnit = fixture.bootstrap.units.find(
            (unit) => unit.grade === grade && (families[unit.id] ?? 0) > 0,
          )!;
          for (let round = -1; round < rounds; round += 1) {
            const order =
              round % 2 === 0
                ? (["after", "before"] as const)
                : (["before", "after"] as const);
            for (const version of order) {
              const requests: RequestRecord[] = [];
              const stages: Flow["stages"] = {};
              let stage = "entry";
              let loadedScopes: ExamScope[] = [];
              let loadError: { code: string; name?: string } | undefined;
              const sourceOptions = {
                ...(entry === "workspace-units"
                  ? {
                      initialUnits: fixture.bootstrap.units,
                      initialUnitCounts: fixture.bootstrap.unitCounts,
                      initialCountUnit: "question" as const,
                    }
                  : {}),
                problemsUrl: "/api/studio/problems",
                filters:
                  inventory === "textbook" ? "sourceGroup=school_textbook" : "",
                refreshAvailability: true,
                distinctFamilies: true,
                availabilityCache: new Map(),
              };
              const mock: typeof fetch = async (input, init) => {
                const started = performance.now();
                const url = new URL(String(input), "http://offline.invalid");
                const method = init?.method ?? "GET";
                const params =
                  method === "POST"
                    ? new URLSearchParams(JSON.parse(String(init?.body)))
                    : url.searchParams;
                let kind: string;
                let response: unknown;
                if (
                  url.pathname === "/api/studio/problems" &&
                  method === "GET" &&
                  params.get("view") === "bootstrap" &&
                  params.get("identity") === "question"
                ) {
                  kind = "bootstrap";
                  response = fixture.bootstrap;
                } else if (
                  url.pathname === "/api/studio/problems/sources" &&
                  method === "POST" &&
                  params.get("view") === "available" &&
                  params.get("identity") === "question" &&
                  params.get("families") === "1" &&
                  params.get("recent") === "1" &&
                  (params.get("sourceGroup") ?? "") ===
                    (inventory === "textbook" ? "school_textbook" : "")
                ) {
                  kind = "availability";
                  response = value;
                } else throw new Error("QA_UNEXPECTED_API_REQUEST_BLOCKED");
                const result = new Response(JSON.stringify(response), {
                  status: 200,
                  headers: { "content-type": "application/json" },
                });
                requests.push({
                  method,
                  pathname: url.pathname,
                  kind,
                  stage,
                  recent: params.get("recent") === "1",
                  memoryResponseMs: ms(performance.now() - started),
                });
                return result;
              };
              activeMock = mock;
              const { ExamBuilder, factory } = sources[version];
              function Harness() {
                const [questions, setQuestions] = React.useState<
                  StudioProblem[]
                >([]);
                const [title, setTitle] = React.useState("검증");
                const [source] = React.useState(() => {
                  const source = factory({ ...sourceOptions, fetch: mock });
                  const original = source.loadScopes;
                  source.loadScopes = async (...values) => {
                    try {
                      loadedScopes = await original(...values);
                      return loadedScopes;
                    } catch (error) {
                      const structured = error as { name?: string };
                      loadError = {
                        code: codeOf(error),
                        name: structured.name?.match(/^[A-Za-z]+$/)?.[0],
                      };
                      throw error;
                    }
                  };
                  return source;
                });
                return React.createElement(ExamBuilder, {
                  source,
                  questions,
                  onQuestionsChange: setQuestions,
                  title,
                  onTitleChange: setTitle,
                  difficulties: [
                    "연산",
                    "기본",
                    "응용",
                    "심화하",
                    "심화중",
                    "심화상",
                  ],
                  maxQuestions: 100,
                  renderQuestion: () => null,
                  renderOutput: () => null,
                });
              }
              const reactRoot = createRoot(container);
              const stageAction = async (name: string, action: () => void) => {
                stage = name;
                const startCount = requests.length;
                const start = performance.now();
                await React.act(async () => {
                  action();
                  await new Promise<void>((resolve) => setImmediate(resolve));
                });
                const picker = document.querySelector(
                  "[aria-label='범위 고르기']",
                );
                stages[name] = {
                  ms: ms(performance.now() - start),
                  requests: requests.length - startCount,
                  detailInputs:
                    picker?.querySelectorAll("input[type='checkbox']").length ??
                    0,
                };
              };
              try {
                await stageAction("entry", () =>
                  reactRoot.render(React.createElement(Harness)),
                );
                if (loadedScopes.length !== fixture.bootstrap.units.length)
                  console.log(
                    JSON.stringify({
                      phase: "scope-readiness",
                      version,
                      inventory,
                      entry,
                      grade,
                      scopes: loadedScopes.length,
                      requests,
                      loadError,
                      alerts:
                        document.querySelectorAll("[role='alert']").length,
                    }),
                  );
                assert(
                  loadedScopes.length === fixture.bootstrap.units.length,
                  "SCOPES_NOT_READY",
                );
                assert(
                  loadedScopes.every(
                    (scope) => scope.count === (families[scope.id] ?? 0),
                  ),
                  "PRODUCT_COUNTS_DIFFER",
                );
                const picker = document.querySelector(
                  "[aria-label='범위 고르기']",
                )!;
                assert(picker, "PICKER_MISSING");
                const sequence = !!picker.querySelector("[data-scope-stage]");
                const buttonByText = (text: string) =>
                  [
                    ...picker.querySelectorAll<HTMLButtonElement>("button"),
                  ].find((button) => button.textContent?.trim() === text);
                await stageAction("grade", () => {
                  if (sequence) {
                    const button = buttonByText(grade);
                    assert(button && !button.disabled, "GRADE_BUTTON_MISSING");
                    fireEvent.click(button);
                  } else {
                    const select =
                      picker.querySelector<HTMLSelectElement>("select");
                    assert(select, "GRADE_SELECT_MISSING");
                    fireEvent.change(select, { target: { value: grade } });
                  }
                });
                await stageAction("unit", () => {
                  if (sequence) {
                    const button = buttonByText(selectedUnit.chapter);
                    assert(button && !button.disabled, "UNIT_BUTTON_MISSING");
                    fireEvent.click(button);
                  } else {
                    const select =
                      picker.querySelectorAll<HTMLSelectElement>("select")[1];
                    assert(select, "UNIT_SELECT_MISSING");
                    fireEvent.change(select, {
                      target: {
                        value: JSON.stringify([grade, selectedUnit.chapter]),
                      },
                    });
                  }
                });
                await stageAction("lesson", () => {
                  const labels = [
                    ...picker.querySelectorAll<HTMLLabelElement>("label"),
                  ];
                  const label = labels.find(
                    (label) =>
                      label.querySelector("strong")?.textContent?.trim() ===
                        selectedUnit.section ||
                      label
                        .querySelector("span")
                        ?.firstChild?.textContent?.trim() ===
                        selectedUnit.section,
                  );
                  const checkbox = label?.querySelector<HTMLInputElement>(
                    "input[type='checkbox']",
                  );
                  assert(
                    checkbox && !checkbox.disabled,
                    "LESSON_CHECKBOX_MISSING",
                  );
                  fireEvent.click(checkbox);
                });
                const selected = picker.querySelectorAll(
                  "input[type='checkbox']:checked",
                ).length;
                assert(selected >= 1, "LESSON_NOT_SELECTED");
                if (sequence)
                  assert(
                    stages.entry.detailInputs === 0,
                    "H2_INITIAL_DETAILS_PRESENT",
                  );
                if (round >= 0)
                  flows.push({
                    version,
                    inventory,
                    entry,
                    grade,
                    round: round + 1,
                    stages,
                    requests,
                    selected,
                    totalMs: ms(
                      Object.values(stages).reduce(
                        (sum, sample) => sum + sample.ms,
                        0,
                      ),
                    ),
                  });
              } finally {
                await React.act(async () => reactRoot.unmount());
              }
            }
          }
        }
      }
      console.log(
        `제품 DOM · ${inventory} 학년 ${grades.length}개, 두 진입 방식 전후 완료`,
      );
    }
    const stableSources = Object.values(clients).every((client) =>
      Object.entries(client.hashes).every(([file, digest]) => {
        if (client === clients.before) return true;
        return (
          sourceSha(readFileSync(path.join(root, file), "utf8")) === digest
        );
      }),
    );
    return {
      status: "passed",
      engine: `jsdom ${nodeRequire("jsdom/package.json").version}`,
      reactMode: "development client renderer, StrictMode off",
      cssAndLayout: false,
      warmupRoundsExcluded: 1,
      alternatingOrder: true,
      stableSources,
      hashes: { before: clients.before.hashes, after: clients.after.hashes },
      flows,
    };
  } finally {
    globalThis.fetch = nativeFetch;
    delete globals.IS_REACT_ACT_ENVIRONMENT;
    Reflect.deleteProperty(globals, "ResizeObserver");
    dom.window.close();
    for (const key of exposed) {
      const prior = originals.get(key);
      if (prior) Object.defineProperty(globalThis, key, prior);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

function bankSummary(fixture: BankFixture) {
  return Object.fromEntries(
    ["all", "textbook"].map((key) => {
      const inventory = fixture.inventories[`${key}WithoutRecent`];
      const units = fixture.bootstrap.units;
      const byGrade = [...new Set(units.map((unit) => unit.grade))].map(
        (grade) => {
          const rows = units.filter((unit) => unit.grade === grade);
          return {
            grade,
            scopes: rows.length,
            selectableScopes: rows.filter(
              (unit) => (inventory.facets?.unitFamilies?.[unit.id] ?? 0) > 0,
            ).length,
            availableQuestionsSummedByScope: rows.reduce(
              (sum, unit) =>
                sum + (inventory.facets?.units[unit.id]?.available ?? 0),
              0,
            ),
            familyCapacitySummedByScope: rows.reduce(
              (sum, unit) =>
                sum + (inventory.facets?.unitFamilies?.[unit.id] ?? 0),
              0,
            ),
          };
        },
      );
      return [
        key,
        {
          scopes: units.length,
          heldQuestions: inventory.held,
          availableQuestions: inventory.available,
          formatAvailable: inventory.formatAvailable,
          byGrade,
        },
      ];
    }),
  );
}
function serverIdentity() {
  try {
    return execFileSync("lsof", ["-nP", "-iTCP:3008", "-sTCP:LISTEN", "-Fpc"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unavailable";
  }
}
function comparison(flows: Flow[]) {
  return ["all", "textbook"].flatMap((inventory) =>
    ["workspace-units", "deferred-units"].map((entry) => {
      const subset = flows.filter(
        (flow) => flow.inventory === inventory && flow.entry === entry,
      );
      const versions = Object.fromEntries(
        ["before", "after"].map((version) => {
          const list = subset.filter((flow) => flow.version === version);
          return [
            version,
            {
              runs: list.length,
              grades: new Set(list.map((flow) => flow.grade)).size,
              requests: [...new Set(list.map((flow) => flow.requests.length))],
              totalMedianMs: ms(median(list.map((flow) => flow.totalMs))),
              stages: Object.fromEntries(
                ["entry", "grade", "unit", "lesson"].map((stage) => [
                  stage,
                  {
                    medianMs: ms(
                      median(list.map((flow) => flow.stages[stage].ms)),
                    ),
                    requests: [
                      ...new Set(
                        list.map((flow) => flow.stages[stage].requests),
                      ),
                    ],
                  },
                ]),
              ),
            },
          ];
        }),
      );
      const before = versions.before;
      const after = versions.after;
      return {
        inventory,
        entry,
        before,
        after,
        requestCountNotIncreased: after.requests.every(
          (count) => count <= Math.max(...before.requests),
        ),
        localTotalMedianNotIncreased:
          after.totalMedianMs <= before.totalMedianMs,
        deltaMs: ms(after.totalMedianMs - before.totalMedianMs),
      };
    }),
  );
}

async function main() {
  assert(
    Number.isInteger(rounds) &&
      rounds >= 1 &&
      rounds <= 30 &&
      Number.isInteger(dbRounds) &&
      dbRounds >= 1 &&
      dbRounds <= 5,
    "INVALID_ROUNDS",
  );
  if (args.includes("--db-child")) {
    const value = await collectDatabase();
    process.send?.({ type: "result", value }, () => process.disconnect?.());
    return;
  }
  const startedAt = new Date().toISOString();
  const serverBefore = serverIdentity();
  console.log(
    "H2 독립 검증 · 실제 API HTTP 호출 없음 · DB 응답은 메모리에만 보관",
  );
  const database = await databaseChild();
  const fixture = database.fixture;
  delete database.fixture;
  let domResult:
    | Awaited<ReturnType<typeof measureDom>>
    | { status: "blocked"; code: string };
  if (fixture) {
    try {
      domResult = await measureDom(fixture);
    } catch (error) {
      domResult = { status: "blocked", code: codeOf(error) };
    }
  } else domResult = { status: "blocked", code: "QA_NO_REAL_DB_FIXTURE" };
  const comparisons = "flows" in domResult ? comparison(domResult.flows) : [];
  const serverAfter = serverIdentity();
  const output = {
    startedAt,
    finishedAt: new Date().toISOString(),
    root,
    baseline,
    rounds,
    dbRounds,
    provenance: {
      baselineCommit,
      sourceHash: "SHA-256 of UTF-8 source bytes",
      head: execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim(),
      baselineFiles: [
        "ExamBuilder.tsx",
        "ExamBuilder.module.css",
        "ScopePicker.tsx",
      ].map((file) => ({
        file,
        digest: sourceSha(baselineFile(file)),
        origin:
          !args.includes("--baseline-from-git") &&
          existsSync(path.join(baseline, file))
            ? "provided-temp-copy"
            : "pinned-git-show-in-memory",
        matchesProvidedSnapshot: existsSync(path.join(baseline, file))
          ? sourceSha(baselineFile(file)) ===
            sourceSha(readFileSync(path.join(baseline, file), "utf8"))
          : null,
      })),
      mathSourceBefore: `${baselineCommit} via git show in memory; no mathSource copy exists in supplied baseline`,
    },
    safety: {
      databaseWrites: 0,
      databaseCommits: 0,
      authenticationBypasses: 0,
      httpApiRequests: 0,
      serverBefore,
      serverAfter,
      serverUnchanged:
        serverBefore !== "unavailable" && serverBefore === serverAfter,
      rawBankResponsesPersisted: false,
      envContentsPrinted: false,
      childOutputSuppressed: true,
    },
    http: {
      status: "blocked",
      measured: false,
      reasons: [
        "No authorized authenticated session was provided; no session forged or account data read.",
        "Product withErrorLog records 4xx/5xx responses through recordErrorLog, so even an unauthenticated probe may write to the shared DB.",
        "The running port-3008 server cannot be placed in this harness's verified READ ONLY transaction without changing/restarting it. No API probe was sent.",
      ],
    },
    database,
    bank: fixture ? bankSummary(fixture) : undefined,
    dom: domResult,
    comparisons,
    limitations: [
      "DB samples execute unmodified product loaders locally in verified READ ONLY/RepeatableRead transactions; they exclude auth, HTTP, Next compilation and rendering.",
      "Offline DOM samples run real ExamBuilder and mathSource against the same real response objects. Requests are intercepted in memory; CSS, layout, paint, network and account authorization are excluded.",
      "One source-order eligible lesson per grade is selected; all curriculum scopes and default family counts are checked on every mount. No questions are composed or saved.",
      "The default UI sends recent=1. Its pure product reader receives an explicitly empty exclusion context (recentProblemIds => []), as in the existing read-only benchmark. This is shared-bank capacity, not an authenticated teacher's capacity. Personal 14-day history and its DB cost are unverified; no account/history rows are read.",
      `Baseline ExamBuilder/ScopePicker use the supplied temporary copies when present, otherwise git show from pinned ${baselineCommit} in memory. --baseline-from-git forces the fallback without modifying the snapshot. Other baseline TS/TSX dependencies, including mathSource, always come from that pinned commit. Current loaded sources are hashed and checked for concurrent edits. CSS/layout are excluded.`,
      "Local medians cannot prove non-increase of authenticated end-to-end HTTP latency; individual tiny DOM stage timings are subject to scheduler/JIT noise.",
    ],
  };
  writeFileSync(resultFile, `${JSON.stringify(output, null, 2)}\n`);
  const lines = [
    "# 시험지 만들기 H2 독립 검증",
    "",
    `측정: ${startedAt} → ${output.finishedAt}`,
    `제품 작업트리: ${root}`,
    "",
    "## 판정",
    "",
    `DB: ${database.status}${database.code ? ` (${database.code})` : ""}. 검증된 READ ONLY 트랜잭션 ${database.verifiedTransactions}회, 의도한 롤백 ${database.rolledBackTransactions}회, 제품 읽기 메서드 ${database.readOperations}회(SQL 문장 수와 다름), 합성 보호 검사 ${database.guardChecks}개.`,
    `제품 DOM: ${domResult.status}${"code" in domResult ? ` (${domResult.code})` : ""}. 실제 HTTP API 호출 0회.`,
    "인증된 HTTP 전후 속도는 미검증이다. 거절 응답도 DB 오류 로그를 쓸 수 있어, 쓰기 금지 및 서버 유지 조건에 따라 호출하지 않았다.",
    "",
    "## 실제 범위와 출제 가능 수",
    "",
    "문항은 서버의 question 정체성 기준이다. 기본 설정의 범위별 선택 상한은 같은 문항류 1개 규칙의 갈래 수다. 범위별 합계와 전역 문항 수를 혼동하지 않는다.",
    "",
  ];
  if (output.bank) {
    lines.push(
      "| 출처 | 범위 수 | 보유 문항 | 출제 가능 문항 |",
      "|---|---:|---:|---:|",
    );
    for (const [key, bank] of Object.entries(output.bank))
      lines.push(
        `| ${key} | ${bank.scopes} | ${bank.heldQuestions} | ${bank.availableQuestions} |`,
      );
    for (const [key, bank] of Object.entries(output.bank)) {
      lines.push(
        "",
        `### ${key} 학년별`,
        "",
        "| 학년·과정 | 전체 범위 | 선택 가능 범위 | 출제 가능 문항(범위 합) | 갈래 상한(범위 합) |",
        "|---|---:|---:|---:|---:|",
      );
      for (const row of bank.byGrade)
        lines.push(
          `| ${row.grade} | ${row.scopes} | ${row.selectableScopes} | ${row.availableQuestionsSummedByScope} | ${row.familyCapacitySummedByScope} |`,
        );
    }
  }
  lines.push(
    "",
    "## 제품 요청 수와 로컬 DOM 시간",
    "",
    `실제 제품을 jsdom으로 실행. 첫 1회 예열 제외, 전후 순서 교대, 학년별 ${rounds}회. 같은 실제 DB 응답을 메모리에서 전달한다. workspace-units는 작업실이 단원 메타데이터를 전달한 진입, deferred-units는 mathSource가 bootstrap을 직접 받는 진입이다.`,
    "",
    "| 출처 / 진입 | 학년 수 | 요청 수 전→후 | 로컬 단계 합 중앙값 ms 전→후 | 요청 증가 없음 | 로컬 합 증가 없음 |",
    "|---|---:|---:|---:|---|---|",
  );
  for (const item of comparisons)
    lines.push(
      `| ${item.inventory} / ${item.entry} | ${item.after.grades} | ${item.before.requests.join(",")} → ${item.after.requests.join(",")} | ${item.before.totalMedianMs} → ${item.after.totalMedianMs} | ${item.requestCountNotIncreased} | ${item.localTotalMedianNotIncreased} |`,
    );
  lines.push(
    "",
    "단계별 시간과 요청 수:",
    "",
    "| 출처 / 진입 | 단계 | 로컬 ms 전→후 | 요청 수 전→후 |",
    "|---|---|---:|---:|",
  );
  for (const item of comparisons)
    for (const stage of ["entry", "grade", "unit", "lesson"])
      lines.push(
        `| ${item.inventory} / ${item.entry} | ${stage} | ${item.before.stages[stage].medianMs} → ${item.after.stages[stage].medianMs} | ${item.before.stages[stage].requests.join(",")} → ${item.after.stages[stage].requests.join(",")} |`,
      );
  lines.push(
    "",
    "## 서버 로더 시간 (HTTP 제외)",
    "",
    "| 로더 | cold 중앙값 ms | warm 중앙값 ms | cold 읽기 연산 | warm 읽기 연산 |",
    "|---|---:|---:|---:|---:|",
  );
  for (const route of [
    "bootstrap",
    "allWithoutRecent",
    "textbookWithoutRecent",
    "all",
    "textbook",
  ]) {
    const cold = database.samples.filter(
      (sample) => sample.route === route && sample.cache === "cold",
    );
    const warm = database.samples.filter(
      (sample) => sample.route === route && sample.cache === "warm",
    );
    if (cold.length)
      lines.push(
        `| ${route} | ${ms(median(cold.map((sample) => sample.ms)))} | ${ms(median(warm.map((sample) => sample.ms)))} | ${[...new Set(cold.map((sample) => sample.readOperations))].join(",")} | ${[...new Set(warm.map((sample) => sample.readOperations))].join(",")} |`,
      );
  }
  lines.push(
    "",
    `응답 digest 안정: ${database.responseDigestsStable}. 이는 같은 로더의 반복 결과 비교이며, 전후 서로 다른 서버의 HTTP 비교가 아니다.`,
    "",
    "## 보호·재현과 한계",
    "",
    `3008 리스너 전후 동일: ${output.safety.serverUnchanged}. 서버 시작·재시작 명령을 실행하지 않았다.`,
    `제품 소스 측정 중 안정: ${"stableSources" in domResult ? domResult.stableSources : "미검증"}. 실제 사용한 모든 JS/TS 소스 digest는 JSON에 있다.`,
    "",
    "```sh",
    `cd '${root}'`,
    `TSX_DISABLE_CACHE=1 node node_modules/tsx/dist/cli.mjs scripts/qa/measure-builder-h2-flow.ts --rounds ${rounds} --db-rounds ${dbRounds}${args.includes("--baseline-from-git") ? " --baseline-from-git" : ""}`,
    "```",
    "",
    `기준 사본이 없어도 파일을 복원할 필요가 없다. 세 파일(ExamBuilder.tsx, ExamBuilder.module.css, ScopePicker.tsx)은 각 src/components/exam-builder/ 경로에 대해 git show ${baselineCommit}:<경로>를 실행해 메모리에서 읽는다. --baseline-from-git 옵션은 사본을 그대로 둔 채 같은 경로를 강제로 검증한다. 이번 기준 파일 출처: ${output.provenance.baselineFiles.map((file) => `${file.file}=${file.origin}`).join(", ")}.`,
    "",
    "DB 자식 프로세스만 지정된 env-file을 로드한다. NODE_OPTIONS에 --conditions=react-server를 추가한다. Prisma 실제 클라이언트는 로그를 끄고, 제품의 visibility extension을 유지한다. SET TRANSACTION READ ONLY 및 transaction_isolation 확인 뒤에만 모델/SQL 읽기를 허용한다. 제품 내부 트랜잭션은 같은 보호된 클라이언트를 사용한다. 모든 성공 트랜잭션도 센티널 예외로 ROLLBACK한다. 쓰기·unsafe raw·트랜잭션 밖 읽기·배열 트랜잭션은 거절한다. 부정 검사는 가짜 클라이언트에서만 실행하므로 실제 DB 쓰기 시도가 없다.",
    "",
    "실제 bootstrap·availability 응답은 IPC와 프로세스 메모리에만 있다. 결과 파일에는 수량·해시·시간·요청 경로만 저장한다. 계정·학생·문항 본문·DB 주소·env 내용·오류 원문을 출력하거나 저장하지 않는다.",
    "",
    ...output.limitations.map((line) => `- ${line}`),
    "",
    "HTTP 차단의 코드 근거: src/lib/studio-ai/guard.ts authorizeStudio, src/lib/errorLog/withErrorLog.ts withErrorLog/logRejection, src/lib/errorLog/record.ts recordErrorLog. 인증 우회 또는 서버·DB 설정 변경 없이 HTTP 지연의 동등성을 결론낼 수 없다.",
    "",
  );
  writeFileSync(reviewFile, lines.join("\n"));
  console.log(`결과: ${resultFile}`);
  console.log(`검토: ${reviewFile}`);
  console.log(
    `DB ${database.status}; DOM ${domResult.status}; HTTP 미검증; 3008 유지 ${output.safety.serverUnchanged}`,
  );
  if (
    database.status !== "passed" ||
    !database.responseDigestsStable ||
    domResult.status !== "passed" ||
    ("stableSources" in domResult && !domResult.stableSources)
  )
    process.exitCode = 2;
  else if (
    comparisons.some(
      (item) =>
        !item.requestCountNotIncreased || !item.localTotalMedianNotIncreased,
    )
  )
    process.exitCode = 3;
}

main().catch((error: unknown) => {
  const code = codeOf(error);
  if (args.includes("--db-child"))
    process.send?.(
      {
        type: "result",
        value: {
          status: "blocked",
          code,
          verifiedTransactions: 0,
          rolledBackTransactions: 0,
          readOperations: 0,
          guardChecks: 0,
          samples: [],
          responseDigestsStable: false,
        },
      },
      () => process.disconnect?.(),
    );
  else {
    console.error(`독립 검증 실패: ${code} (오류 원문·연결 정보 출력 생략)`);
    process.exitCode = 1;
  }
});
