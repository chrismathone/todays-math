/** Shared DB SELECT-only comparison. No problem bodies/answers/IDs are emitted.
 * Standalone: tsx --conditions=react-server --env-file=/path/to/.env scripts/qa/sweep-20261020/quickCreate.ts
 * Integration: inside the caller's READ ONLY transaction, pass { db: tx, sql }.
 */
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient, type Prisma } from "@prisma/client";
import {
  quickCreateCatalogSchema,
  quickCreateScopeSchema,
  type QuickCreateCatalog,
  type QuickCreateScope,
} from "../../../src/contracts/textbookQuickCreate.contract";
import { DEFAULT_PROBLEM_POOL } from "../../../src/lib/problemPool";
import { MISSING_ANSWER } from "../../../src/lib/missingAnswer";
import { classifyFormat } from "../../../src/lib/problem/provenance";
import {
  listQuickCreateUnits,
  quickCreateSemester,
} from "../../../src/lib/textbook/server/quickCreate";
import {
  conceptIndex,
  gradeLabel,
  keyOf,
  QUICK_CREATE_DIFFICULTIES,
  type UnitRow,
} from "../../../src/lib/textbook/server/quickCreate/context";
import {
  type TextbookSql,
  uuidList,
} from "../../../src/lib/textbook/server/sql";

/** Frozen pre-sweep reader. Keep its SELECT and first-seen loop unchanged so
 * measurements and API parity tests compare against the original behavior. */
export async function listQuickCreateUnitsBefore(
  sql: TextbookSql,
  input: QuickCreateScope,
): Promise<QuickCreateCatalog> {
  const scope = quickCreateScopeSchema.parse(input);
  const rows = await sql.query<UnitRow>(
    `SELECT u."id", u."grade", u."chapter", u."section", u."order_index" AS "orderIndex",
      (SELECT count(*)::int FROM "problem" p WHERE p."unit_id" = u."id" AND p."pool"::text = $2::text
       AND p."review_status"::text = 'approved' AND p."direct_use_allowed" = true AND p."answer" <> $3::text) AS "problemCount"
     FROM "unit" u WHERE u."grade" = $1::text ORDER BY u."order_index", u."id"`,
    [gradeLabel(scope), DEFAULT_PROBLEM_POOL, MISSING_ANSWER],
  );
  const units = rows.filter(
    (unit) => quickCreateSemester(unit) === scope.semester,
  );
  type Availability = NonNullable<
    QuickCreateCatalog["units"][number]["availability"]
  >;
  const availability = new Map<string, Availability>(
    units.map((unit) => [
      unit.id,
      {
        basic: { total: 0, written: 0 },
        standard: { total: 0, written: 0 },
        challenge: { total: 0, written: 0 },
      },
    ]),
  );
  if (units.length) {
    const problems = await sql.query<{
      unitId: string;
      difficulty: string;
      content: string;
      answer: string;
      questionType: string | null;
      problemType: string | null;
      familyKey: string | null;
    }>(
      `SELECT "unit_id" AS "unitId", "difficulty"::text AS "difficulty", "content", "answer",
      "question_type" AS "questionType", "problem_type"::text AS "problemType", "family_key" AS "familyKey"
      FROM "problem" WHERE "unit_id" IN ${uuidList("$1")} AND "pool"::text = $2::text
      AND "review_status"::text = 'approved' AND "direct_use_allowed" = true AND "answer" <> $3::text`,
      [
        JSON.stringify(units.map((unit) => unit.id)),
        DEFAULT_PROBLEM_POOL,
        MISSING_ANSWER,
      ],
    );
    const seenContent = new Set<string>();
    for (const row of problems) {
      const counts = availability.get(row.unitId)!;
      const written = classifyFormat(row) === "descriptive";
      for (const [difficulty, tiers] of Object.entries(
        QUICK_CREATE_DIFFICULTIES,
      )) {
        if ((tiers as readonly string[]).includes(row.difficulty)) {
          const key = JSON.stringify([
            row.unitId,
            difficulty,
            row.content.trim(),
          ]);
          if (seenContent.has(key)) continue;
          seenContent.add(key);
          const count = counts[difficulty as keyof Availability];
          count.total += 1;
          if (written) count.written += 1;
        }
      }
    }
  }
  return {
    units: units.map((unit) => ({
      id: unit.id,
      chapter: unit.chapter,
      section: unit.section,
      label: `${unit.chapter} · ${unit.section}`,
      problemCount: unit.problemCount,
      conceptCount: conceptIndex.get(keyOf(unit))?.length ?? 0,
      availability: availability.get(unit.id),
    })),
  };
}

const denied = () => new Error("QUICK_CREATE_READ_ONLY_GUARD");

/** Guards every reader statement, including CTEs; rejects all execute calls. */
export function quickCreateReadOnlySql(sql: TextbookSql): TextbookSql {
  return {
    query: <T>(text: string, params: Parameters<TextbookSql["query"]>[1]) => {
      if (
        !/^\s*(SELECT|WITH)\b/i.test(text) ||
        /\b(INSERT|UPDATE|DELETE|MERGE|ALTER|DROP|CREATE|TRUNCATE|CALL|COPY|GRANT|REVOKE|INTO|LOCK)\b/i.test(
          text,
        )
      )
        throw denied();
      return sql.query<T>(text, params);
    },
    execute: async () => {
      throw denied();
    },
  };
}

type QueryMeasurement = {
  rows: number;
  bytes: number;
  ms: number;
  fallbackRows: number;
};
type ReadMeasurement = {
  ms: number;
  responseBytes: number;
  responseSha256: string;
  queries: QueryMeasurement[];
};

/** db and sql MUST address the same caller-owned transaction. The caller must
 * SET TRANSACTION READ ONLY before SELECT; this helper verifies that setting.
 * Return values contain sizes/counts/hashes only, with no source rows or IDs. */
export async function runQuickCreateMeasurement({
  db,
  sql,
  scope = { schoolLevel: "middle", grade: 2, semester: 1 },
  rounds = 3,
}: {
  db: Pick<Prisma.TransactionClient, "$queryRawUnsafe">;
  sql: TextbookSql;
  scope?: QuickCreateScope;
  rounds?: number;
}) {
  const [proof] = await db.$queryRawUnsafe<{ readOnly: string }[]>(
    `SELECT current_setting('transaction_read_only') AS "readOnly"`,
  );
  if (proof?.readOnly !== "on") throw denied();
  const readOnly = quickCreateReadOnlySql(sql);
  const samples: {
    round: number;
    order: string;
    equal: true;
    before: ReadMeasurement;
    after: ReadMeasurement;
  }[] = [];
  for (let round = 1; round <= rounds; round++) {
    const measure = async (reader: typeof listQuickCreateUnits) => {
      const reads: { rows: unknown[]; ms: number }[] = [];
      const traced: TextbookSql = {
        ...readOnly,
        query: async <T>(
          text: string,
          params: Parameters<TextbookSql["query"]>[1],
        ) => {
          const start = performance.now();
          const rows = await readOnly.query<T>(text, params);
          const ms = performance.now() - start;
          reads.push({ rows, ms });
          return rows;
        },
      };
      const start = performance.now();
      const catalog = await reader(traced, scope);
      const ms = performance.now() - start;
      // Account for transfer sizes after the reader clock stops. Serializing
      // the legacy multi-MB result for this evidence must not inflate its time.
      const queries: QueryMeasurement[] = reads.map(({ rows, ms }) => ({
        rows: rows.length,
        bytes: Buffer.byteLength(JSON.stringify(rows)),
        ms: Number(ms.toFixed(3)),
        fallbackRows: rows.reduce<number>(
          (sum, row) =>
            sum +
            (Array.isArray((row as { fallback?: unknown }).fallback)
              ? (row as { fallback: unknown[] }).fallback.length
              : 0),
          0,
        ),
      }));
      // Exactly the API's final schema/writer flag, excluding HTTP/auth overhead.
      const response = JSON.stringify(
        quickCreateCatalogSchema.parse({
          ...catalog,
          writerReady: process.env.TEXTBOOK_RECOVERY_WRITER_ENABLED === "true",
        }),
      );
      return {
        response,
        measurement: {
          ms: Number(ms.toFixed(3)),
          responseBytes: Buffer.byteLength(response),
          responseSha256: createHash("sha256").update(response).digest("hex"),
          queries,
        },
      };
    };
    const beforeFirst = round % 2 === 1;
    const first = await measure(
      beforeFirst ? listQuickCreateUnitsBefore : listQuickCreateUnits,
    );
    const second = await measure(
      beforeFirst ? listQuickCreateUnits : listQuickCreateUnitsBefore,
    );
    const before = beforeFirst ? first : second;
    const after = beforeFirst ? second : first;
    if (before.response !== after.response)
      throw new Error("QUICK_CREATE_RESPONSE_MISMATCH");
    samples.push({
      round,
      order: beforeFirst ? "before-after" : "after-before",
      equal: true,
      before: before.measurement,
      after: after.measurement,
    });
  }
  return {
    measuredAt: new Date().toISOString(),
    readOnly: true,
    scope,
    samples,
    note: "Server catalog reader + DB/network; excludes transaction setup, HTTP/auth/Next/browser and schema serialization time. Query bytes are UTF-8 JSON sizes, not PostgreSQL wire bytes. No source rows emitted.",
  };
}

async function main() {
  const db = new PrismaClient({ log: [] });
  try {
    const result = await db.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        const sql: TextbookSql = {
          query: <T>(text: string, params = []) =>
            tx.$queryRawUnsafe<T[]>(text, ...params),
          execute: async () => {
            throw denied();
          },
        };
        return runQuickCreateMeasurement({ db: tx, sql });
      },
      { isolationLevel: "RepeatableRead", timeout: 180_000, maxWait: 10_000 },
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await db.$disconnect();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch(() => {
    console.error("QUICK_CREATE_MEASUREMENT_FAILED (details omitted)");
    process.exitCode = 1;
  });
}
