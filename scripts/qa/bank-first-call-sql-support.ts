/** No credentials or bank bodies are printed or persisted by these probes. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";
import { Prisma } from "@prisma/client";
import type * as CountModule from "../../src/lib/problem/questionCountSql";
import { problemVisibleWhere } from "../../src/lib/problemPool";
import { problemEligibleWhere } from "../../src/lib/problemEligibility";
import { verifyFormatScope } from "../../src/lib/problem/actualFormat";

export function loadProbeEnvironment() {
  if (process.env.DATABASE_URL) return;
  const paths = [
    "/Users/pss/Desktop/creative/today_/.env.local",
    "/Users/pss/Desktop/creative/today_/.env",
  ];
  for (const path of paths) {
    if (!existsSync(path)) continue;
    const env = parseEnv(readFileSync(path, "utf8"));
    if (env.DATABASE_URL) {
      process.env.DATABASE_URL = env.DATABASE_URL;
      return;
    }
  }
  throw new Error("DATABASE_URL_MISSING");
}

export async function frozenCountSql(ref = "5051fea68") {
  const folder = await mkdtemp(resolve(".bank-first-call-sql-baseline-"));
  const file = "src/lib/problem/questionCountSql.ts";
  const source = execFileSync("git", ["show", `${ref}:${file}`], {
    encoding: "utf8",
  });
  const target = resolve(folder, file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(
    target,
    source.replace(
      /(\bfrom\s*|\bimport\s*)["']([^"']+)["']/g,
      (match, prefix: string, spec: string) => {
        const path = spec.startsWith("@/")
          ? resolve("src", spec.slice(2))
          : spec.startsWith(".")
            ? resolve(dirname(file), spec)
            : null;
        return path ? `${prefix}${JSON.stringify(path)}` : match;
      },
    ),
  );
  return {
    module: (await import(pathToFileURL(target).href)) as typeof CountModule,
    sha256: createHash("sha256").update(source).digest("hex"),
    close: () => rm(folder, { recursive: true, force: true }),
  };
}

export function workingCountSqlSha256() {
  return createHash("sha256")
    .update(readFileSync(resolve("src/lib/problem/questionCountSql.ts")))
    .digest("hex");
}

export type ProbeScope = {
  grade: string;
  units: string[];
  chapterUnits: string[];
  material: string | null;
  books: string[];
  materialPage: string[];
};
export function queries(
  mod: typeof CountModule,
  client: object,
  scope: ProbeScope,
) {
  const formats = new Map<string, string>();
  verifyFormatScope(formats, client, problemVisibleWhere());
  const counts = (
    where: Prisma.ProblemWhereInput,
    dimensions: CountModule.CountDimension[],
    includeFormats = true,
  ) =>
    mod.questionCountsSql(
      where,
      dimensions,
      undefined,
      formats,
      client,
      includeFormats,
    )!;
  const order: Prisma.ProblemOrderByWithRelationInput[] = [
    { unit: { orderIndex: "asc" } },
    { problemCode: "asc" },
    { id: "asc" },
  ];
  return [
    {
      name: "scope-grade-units-family",
      sql: counts({ unitId: { in: scope.units } }, ["unit", "family"], false),
    },
    {
      name: "scope-chapter-units-family",
      sql: counts(
        { unitId: { in: scope.chapterUnits } },
        ["unit", "family"],
        false,
      ),
    },
    {
      name: "scope-grade-availability",
      sql: counts({ unitId: { in: scope.units } }, [
        "unit",
        "family",
        "difficulty",
        "source",
        "book",
        "kind",
      ]),
    },
    {
      name: "global-availability-family",
      sql: counts(problemVisibleWhere(), [
        "unit",
        "family",
        "difficulty",
        "source",
        "book",
        "kind",
      ]),
    },
    {
      name: "global-source-counts",
      sql: counts(
        problemVisibleWhere(),
        ["source", "book", "kind", "material"],
        false,
      ),
    },
    {
      name: "source-groups-only",
      sql: counts(problemVisibleWhere(), ["source"], false),
    },
    {
      name: "source-grade-books-kind",
      sql: counts(
        {
          source: "school_textbook",
          sourceMaterial: { bookId: { in: scope.books } },
        },
        ["book", "kind"],
        false,
      ),
    },
    {
      name: "source-material-page-counts",
      sql: counts(
        {
          source: "school_textbook",
          sourceMaterialId: { in: scope.materialPage },
        },
        ["material"],
        false,
      ),
    },
    {
      name: "global-bootstrap",
      sql: counts(problemEligibleWhere(), ["unit", "grade"], false),
    },
    {
      name: "global-list-counts",
      sql: counts(problemVisibleWhere(), ["source", "difficulty", "grade"]),
    },
    {
      name: "global-page-one",
      sql: mod.questionPageSql(
        problemVisibleWhere(),
        order,
        true,
        undefined,
        0,
        12,
        formats,
        client,
      )!,
    },
    {
      name: "grade-page-five",
      sql: mod.questionPageSql(
        { unitId: { in: scope.units } },
        order,
        true,
        undefined,
        48,
        12,
        formats,
        client,
      )!,
    },
    ...(scope.material
      ? [
          {
            name: "material-page-one",
            sql: mod.questionPageSql(
              { sourceMaterialId: scope.material },
              [{ questionNumber: "asc" }, ...order],
              true,
              undefined,
              0,
              12,
              formats,
              client,
            )!,
          },
        ]
      : []),
  ];
}

export function selectOnly(sql: Prisma.Sql) {
  if (
    !/^\s*(SELECT|WITH)\b/i.test(sql.text) ||
    /\b(INSERT|UPDATE|DELETE|MERGE|ALTER|DROP|CREATE|TRUNCATE|CALL|COPY|GRANT|REVOKE)\b/i.test(
      sql.text,
    )
  )
    throw new Error("SELECT_GUARD");
}

export function bytesOf(value: unknown) {
  const bytes = Buffer.from(
    JSON.stringify(value, (_, entry) =>
      typeof entry === "bigint" ? Number(entry) : entry,
    ),
  );
  return {
    bytes,
    length: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

/** Keep raw order and bytes authoritative. These diagnostics identify internal
 * ordering evidence; they never sort a response or turn a raw failure into pass. */
export function countRowDiagnostics(reference: unknown[], rows: unknown[]) {
  const isBucket = (row: unknown): row is CountModule.CountBucket =>
    !!row && typeof row === "object" && "axis" in row && "held" in row;
  if (!reference.every(isBucket) || !rows.every(isBucket)) return {};
  const publicRows = (buckets: CountModule.CountBucket[]) =>
    buckets.map((bucket) =>
      Object.defineProperty({ ...bucket }, "firstAvailable", {
        enumerable: false,
      }),
    );
  const key = (bucket: CountModule.CountBucket) =>
    JSON.stringify([bucket.axis, bucket.key, bucket.extra]);
  const prior = new Map(reference.map((bucket) => [key(bucket), bucket]));
  const countValuesEqual =
    reference.length === rows.length &&
    rows.every((bucket) => {
      const before = prior.get(key(bucket));
      return (
        before?.held === bucket.held &&
        before.available === bucket.available &&
        before.rowCount === bucket.rowCount
      );
    });
  return {
    countProjectionByteEqual: bytesOf(publicRows(reference)).bytes.equals(
      bytesOf(publicRows(rows)).bytes,
    ),
    countValuesEqual,
    rowOrderEqual:
      JSON.stringify(reference.map(key)) === JSON.stringify(rows.map(key)),
    firstAvailableChanges: rows.filter(
      (bucket) =>
        prior.get(key(bucket))?.firstAvailable !== bucket.firstAvailable,
    ).length,
  };
}

type PlanNode = Record<string, unknown> & { Plans?: PlanNode[] };
export function planSummary(explain: Record<string, unknown>) {
  const root = explain.Plan as PlanNode;
  const nodes: Record<string, unknown>[] = [];
  const walk = (node: PlanNode) => {
    nodes.push(
      Object.fromEntries(
        [
          "Node Type",
          "Strategy",
          "Relation Name",
          "Index Name",
          "Actual Rows",
          "Actual Loops",
          "Heap Fetches",
          "Exact Heap Blocks",
          "Lossy Heap Blocks",
          "Sort Method",
          "Sort Space Used",
          "Sort Space Type",
          "Peak Memory Usage",
          "HashAgg Batches",
          "Disk Usage",
          "Shared Hit Blocks",
          "Shared Read Blocks",
          "Temp Read Blocks",
          "Temp Written Blocks",
        ]
          .filter((key) => node[key] !== undefined)
          .map((key) => [key, node[key]]),
      ),
    );
    node.Plans?.forEach(walk);
  };
  walk(root);
  return {
    planningMs: explain["Planning Time"],
    executionMs: explain["Execution Time"],
    sharedHit: root["Shared Hit Blocks"],
    sharedRead: root["Shared Read Blocks"],
    tempRead: root["Temp Read Blocks"],
    tempWritten: root["Temp Written Blocks"],
    nodes,
  };
}

export async function readProbeScope(
  tx: Prisma.TransactionClient,
): Promise<ProbeScope> {
  const units = await tx.$queryRaw<
    { id: string; grade: string; chapter: string }[]
  >`
    SELECT id,grade,chapter FROM public.unit ORDER BY order_index,id`;
  const chosen = units.filter((unit) => unit.grade === "중2");
  if (!chosen.length) throw new Error("SCOPE_MISSING");
  const [material] = await tx.$queryRaw<{ id: string }[]>`
    SELECT source_material_id AS id FROM public.problem
    WHERE pool='shared' AND source='school_textbook' AND source_material_id IS NOT NULL
    GROUP BY source_material_id ORDER BY count(*) DESC,source_material_id LIMIT 1`;
  const books = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM public.source_book WHERE kind='school_textbook' AND grade=${chosen[0].grade} ORDER BY id`;
  const materials = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM public.source_material WHERE book_id=ANY(${books.map((book) => book.id)}::uuid[])
    ORDER BY sequence,id LIMIT 20`;
  return {
    grade: "중2",
    units: chosen.map((unit) => unit.id),
    chapterUnits: chosen
      .filter((unit) => unit.chapter === chosen[0].chapter)
      .map((unit) => unit.id),
    material: material?.id ?? null,
    books: books.map((book) => book.id),
    materialPage: materials.map((material) => material.id),
  };
}

export async function readOnlyGuard(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SET TRANSACTION READ ONLY`;
  const [config] = await tx.$queryRaw<Record<string, string>[]>`
    SELECT current_setting('transaction_read_only') AS "readOnly",
      current_setting('server_version') AS version,
      current_setting('work_mem') AS "workMem",
      current_setting('hash_mem_multiplier') AS "hashMultiplier",
      current_setting('max_parallel_workers_per_gather') AS "parallelWorkers"`;
  if (config.readOnly !== "on") throw new Error("READ_ONLY_GUARD");
  return config;
}

export function safeError(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  const message = error instanceof Error ? error.message : "";
  return /^[A-Z][A-Z0-9_]+$/.test(message)
    ? message
    : `PROBE_FAILED${/^(P\d+|[A-Z0-9]{5})$/.test(code) ? `_${code}` : ""}`;
}
