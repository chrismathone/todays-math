/** Shared DB inspection only. Every statement runs in a verified READ ONLY transaction. */
import { writeFile, readFile, mkdtemp, mkdir, rm } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  questionCountsSql,
  questionFormatReadSql,
  questionPageSql,
} from "../../src/lib/problem/questionCountSql";
import { problemVisibleWhere } from "../../src/lib/problemPool";
import { bankReadFingerprintSql } from "../../src/lib/bankReadFingerprint";
import { verifyFormatScope } from "../../src/lib/problem/actualFormat";
import { problemEligibleWhere } from "../../src/lib/problemEligibility";

const raw = new PrismaClient({ log: [] });
let temporary: string | undefined;
async function main() {
  const output = process.argv[2];
  if (!output) throw new Error("OUTPUT_REQUIRED");
  let countsSql = questionCountsSql,
    formatReadSql = questionFormatReadSql,
    pageSql = questionPageSql,
    markVerified = verifyFormatScope;
  const baselineDirectory = process.env.FORMAT_MEASURE_BASELINE_DIR;
  if (baselineDirectory) {
    temporary = await mkdtemp(resolve(".question-format-explain-baseline-"));
    const files = [
      "src/lib/problem/questionCountSql.ts",
      "src/lib/problem/actualFormat.ts",
    ];
    for (const file of files) {
      const target = resolve(temporary, file);
      await mkdir(dirname(target), { recursive: true });
      const source = await readFile(resolve(baselineDirectory, file), "utf8");
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
            if (!path) return match;
            const local = `${relative(process.cwd(), path)}.ts`;
            return `${prefix}${JSON.stringify(files.includes(local) ? resolve(temporary!, local) : path)}`;
          },
        ),
      );
    }
    ({
      questionCountsSql: countsSql,
      questionFormatReadSql: formatReadSql,
      questionPageSql: pageSql,
    } = await import(pathToFileURL(resolve(temporary, files[0])).href));
    ({ verifyFormatScope: markVerified } = await import(
      pathToFileURL(resolve(temporary, files[1])).href
    ));
  }
  const result = await raw.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const [setting] = await tx.$queryRaw<{ readOnly: string }[]>`
      SELECT current_setting('transaction_read_only') AS "readOnly"`;
      if (setting.readOnly !== "on") throw new Error("READ_ONLY_GUARD");
      await tx.$executeRaw`SET LOCAL plan_cache_mode = 'force_custom_plan'`;
      await tx.$executeRaw`SET LOCAL max_parallel_workers_per_gather = 0`;
      const indexes = await tx.$queryRaw`
      SELECT tablename,indexname,indexdef FROM pg_indexes
      WHERE schemaname='public' AND tablename IN ('problem','unit','source_material','source_book')
      ORDER BY tablename,indexname`;
      const formats = new Map<string, string>();
      const invalid = await tx.$queryRaw<unknown[]>(
        formatReadSql(problemVisibleWhere(), true)!,
      );
      if (invalid.length) throw new Error("INVALID_FACTS_CHANGED");
      markVerified(formats, tx, problemVisibleWhere());
      const triggers =
        await tx.$queryRaw`SELECT tgname,tgenabled,pg_get_triggerdef(oid) AS definition FROM pg_trigger
        WHERE tgrelid='public.problem'::regclass AND tgname IN ('problem_zz_actual_format_invalidate','problem_question_group_invalidate') ORDER BY tgname`;
      const queries: [string, Prisma.Sql | null][] = [
        ["fingerprint-row-versions", bankReadFingerprintSql()],
        ["missing-formats", formatReadSql(problemVisibleWhere(), true)],
        [
          "availability-family",
          countsSql(
            problemVisibleWhere(),
            ["unit", "family", "difficulty", "source", "book", "kind"],
            undefined,
            formats,
            tx,
          ),
        ],
        [
          "source-counts",
          countsSql(
            problemVisibleWhere(),
            ["source", "book", "kind", "material"],
            undefined,
            formats,
            tx,
            false,
          ),
        ],
        [
          "bootstrap",
          countsSql(
            problemEligibleWhere(),
            ["unit", "grade"],
            undefined,
            formats,
            tx,
            false,
          ),
        ],
        [
          "page-one",
          pageSql(
            problemVisibleWhere(),
            [
              { unit: { orderIndex: "asc" } },
              { problemCode: "asc" },
              { id: "asc" },
            ],
            true,
            undefined,
            0,
            12,
            formats,
            tx,
          ),
        ],
        [
          "fingerprint-count-max-null",
          Prisma.sql`SELECT count(*)::text AS count,max(updated_at)::text AS updated,
        count(*) FILTER (WHERE actual_format IS NULL)::text AS missing FROM public.problem WHERE pool='shared'`,
        ],
        [
          "fingerprint-mvcc",
          Prisma.sql`SELECT count(*)::text AS count,max(updated_at)::text AS updated,
        count(*) FILTER (WHERE actual_format IS NULL)::text AS missing,
        sum(xmin::text::bigint)::text AS revision FROM public.problem WHERE pool='shared'`,
        ],
      ];
      const plans = [];
      for (const [name, sql] of queries) {
        if (
          !sql ||
          !/^\s*(SELECT|WITH)\b/i.test(sql.text) ||
          /\b(INSERT|UPDATE|DELETE|MERGE|ALTER|DROP|CREATE|TRUNCATE|CALL|COPY|GRANT|REVOKE)\b/i.test(
            sql.text,
          )
        )
          throw new Error("SELECT_GUARD");
        const start = performance.now();
        const plan = await tx.$queryRaw(
          Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`,
        );
        const ms = Number((performance.now() - start).toFixed(3));
        plans.push({ name, ms, plan });
        console.log(`${name}: ${ms}ms`);
      }
      return {
        measuredAt: new Date().toISOString(),
        source: baselineDirectory
          ? "frozen-working-tree-r1"
          : "working-tree-r2",
        readOnly: setting.readOnly,
        indexes,
        triggers,
        plans,
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 120_000, maxWait: 20_000 },
  );
  await writeFile(
    output,
    JSON.stringify(
      result,
      (_, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    ) + "\n",
  );
}
main()
  .catch(() => {
    console.error("EXPLAIN_FAILED (connection/error details omitted)");
    process.exitCode = 1;
  })
  .finally(async () => {
    await raw.$disconnect();
    if (temporary) await rm(temporary, { recursive: true, force: true });
  });
