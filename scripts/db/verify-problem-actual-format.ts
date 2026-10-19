/** Independent count audit: shared PostgreSQL is READ ONLY; proposed cache/indexes
 * exist only in an in-memory PGlite mirror. Uses the unchanged product reader.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { PrismaClient } from "@prisma/client";
import { BANK_SOURCE_GROUPS, BANK_SOURCE_GROUP_SOURCES } from "../../src/contracts/bankSource.contract";
import { QUESTION_FORMATS, type QuestionFormat } from "../../src/contracts/questionFormats.contract";
import { questionBucketsFromRows } from "../../src/lib/problem/questionCountBuckets";
import type { CountBucket, CountDimension } from "../../src/lib/problem/questionCountSql";
import { familyIdOf } from "../../src/lib/generator/familyKey";
import { MISSING_ANSWER } from "../../src/lib/missingAnswer";
import { durableJson } from "./backfill-problem-actual-format";
import { classifyFact, formatRuleVersion, hasFormatColumns, MIGRATION_PATH, readOnly, readPage, safeCode, sha256, splitMigration, visiblePool } from "./problem-actual-format";

const dimensions: CountDimension[] = ["unit", "difficulty", "source", "material", "book", "kind", "family", "grade"];
const bucketKey = (b: CountBucket) => JSON.stringify([b.axis, b.key, b.extra]);
export function compareBuckets(a: readonly CountBucket[], b: readonly CountBucket[]) {
  const left = new Map(a.map((r) => [bucketKey(r), r]));
  const right = new Map(b.map((r) => [bucketKey(r), r]));
  let mismatches = 0;
  for (const key of new Set([...left.keys(), ...right.keys()])) {
    const x = left.get(key), y = right.get(key);
    if (!x || !y || x.held !== y.held || x.available !== y.available || x.rowCount !== y.rowCount) mismatches++;
  }
  return { buckets: Math.max(left.size, right.size), mismatches };
}

export const MIRROR_DDL = `CREATE TABLE problem (
  id text PRIMARY KEY, pool text, unit_id text, source text, source_material_id text,
  actual_format text, question_group_key text, family_key text, family_id text,
  difficulty text, grade text, book_id text, kind text, source_groups text[],
  review_status text, direct_use_allowed boolean, has_answer boolean,
  problem_code text, question_number integer);
  CREATE TABLE unit (id text PRIMARY KEY,grade text,order_index integer);
  CREATE UNIQUE INDEX problem_problem_code_key ON problem(problem_code);
  CREATE INDEX problem_unit_id_idx ON problem(unit_id);
  CREATE INDEX problem_source_material_id_idx ON problem(source_material_id);
  CREATE INDEX problem_question_group_key_idx ON problem(question_group_key);`;
const eligible = "pool='shared' AND review_status='approved' AND direct_use_allowed AND has_answer AND actual_format<>'unknown'";

/** SQL unions count question identities, never sums per-format/per-book counts. */
export async function mirroredBuckets(pg: PGlite, format?: QuestionFormat): Promise<CountBucket[]> {
  const result = await pg.query<CountBucket>(`WITH rows AS (
      SELECT *, COALESCE(question_group_key,'row:'||id) COLLATE "C" AS question_id, (${eligible}) AS eligible FROM problem
    ), exploded AS (
      SELECT p.*, b.axis,b.key,b.extra FROM rows p CROSS JOIN LATERAL (VALUES
        ('all','',NULL::text), ('format',NULLIF(p.actual_format,'unknown'),NULL),
        ('unit',p.unit_id,NULL), ('difficulty',p.difficulty,NULL), ('grade',p.grade,NULL),
        ('family',p.unit_id,p.family_key),
        ('material',CASE WHEN p.source='school_textbook' THEN p.source_material_id END,NULL),
        ('book',p.book_id,NULL), ('kind',p.book_id,p.kind)
      ) b(axis,key,extra)
      UNION ALL SELECT p.*,'source',s,NULL FROM rows p CROSS JOIN LATERAL unnest(p.source_groups) s
    ) SELECT axis,key,extra,count(DISTINCT question_id)::int AS held,
        count(DISTINCT question_id) FILTER(WHERE eligible)::int AS available,
        count(*) FILTER(WHERE eligible)::int AS "rowCount"
      FROM exploded WHERE key IS NOT NULL AND (axis='format' OR $1::text IS NULL OR actual_format=$1)
      GROUP BY axis,key,extra`, [format ?? null]);
  return result.rows;
}

function planSummary(plan: Record<string, unknown>) {
  const nodes: string[] = [], indexes: string[] = [];
  const walk = (node: Record<string, unknown>) => {
    nodes.push(String(node["Node Type"]));
    if (node["Index Name"]) indexes.push(String(node["Index Name"]));
    for (const child of (node.Plans ?? []) as Record<string, unknown>[]) walk(child);
  };
  walk(plan.Plan as Record<string, unknown>);
  return { nodes, indexes, planningMs: plan["Planning Time"], executionMs: plan["Execution Time"], plan };
}
export async function explainMirror(pg: PGlite) {
  const [unit] = (await pg.query<{ unit_id: string; actual_format: string }>(`SELECT unit_id,actual_format,count(*) n FROM problem
    WHERE actual_format<>'unknown' GROUP BY unit_id,actual_format ORDER BY n DESC LIMIT 1`)).rows;
  const [material] = (await pg.query<{ source_material_id: string; actual_format: string }>(`SELECT source_material_id,actual_format,count(*) n
    FROM problem WHERE source_material_id IS NOT NULL AND actual_format<>'unknown'
    GROUP BY source_material_id,actual_format ORDER BY n DESC LIMIT 1`)).rows;
  if (!unit) throw new Error("EMPTY_MIRROR");
  const queries = [
    { name: "형식별 ID 후보 쪽", sql: "SELECT id FROM problem WHERE pool='shared' AND actual_format=$1 ORDER BY id LIMIT 12", values: [unit.actual_format] },
    { name: "희소 형식 전체 문항 집계", sql: "SELECT count(DISTINCT COALESCE(question_group_key,'row:'||id)) FROM problem WHERE pool='shared' AND actual_format=$1", values: ["descriptive"] },
    { name: "단원·형식별 코드순 후보 쪽", sql: "SELECT id FROM problem WHERE pool='shared' AND unit_id=$1 AND actual_format=$2 ORDER BY problem_code,id LIMIT 12", values: [unit.unit_id, unit.actual_format] },
    { name: "단원·형식별 문항 합집합", sql: "SELECT count(DISTINCT COALESCE(question_group_key,'row:'||id)) FROM problem WHERE pool='shared' AND unit_id=$1 AND actual_format=$2", values: [unit.unit_id, unit.actual_format] },
    ...(material ? [
      { name: "자료·형식별 실제 은행순 후보 쪽", sql: "SELECT p.id FROM problem p JOIN unit u ON u.id=p.unit_id WHERE p.pool='shared' AND p.source_material_id=$1 AND p.actual_format=$2 ORDER BY p.question_number,u.order_index,p.problem_code LIMIT 12", values: [material.source_material_id, material.actual_format] },
      { name: "자료·형식별 문항 합집합", sql: "SELECT count(DISTINCT COALESCE(question_group_key,'row:'||id)) FROM problem WHERE pool='shared' AND source_material_id=$1 AND actual_format=$2", values: [material.source_material_id, material.actual_format] },
    ] : []),
  ];
  const run = async () => Promise.all(queries.map(async (q) => {
    const [row] = (await pg.query<{ "QUERY PLAN": Record<string, unknown>[] }>(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${q.sql}`, q.values)).rows;
    return { name: q.name, sql: q.sql, ...planSummary(row["QUERY PLAN"][0]) };
  }));
  await pg.exec("ANALYZE problem");
  const before = await run();
  for (const stmt of splitMigration(readFileSync(MIGRATION_PATH, "utf8")))
    if (/^CREATE INDEX/.test(stmt)) await pg.exec(stmt);
  await pg.exec("ANALYZE problem");
  return { environment: "PGlite in memory, actual metadata distribution; UUID/enum columns represented as text. Plans are local evidence, not production latency.", before, after: await run() };
}

async function main() {
  // Resolve server-only to its official empty server export, as the existing live benchmark does.
  if (!process.execArgv.includes("--conditions=react-server")) {
    const child = spawnSync(process.execPath, [...process.execArgv, "--conditions=react-server", resolve(process.argv[1]), ...process.argv.slice(2)],
      { stdio: "inherit", env: process.env });
    process.exitCode = child.status ?? 1;
    return;
  }
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--report" || !args[1] || args[1].startsWith("--")) throw new Error("VERIFY_REQUIRES_REPORT_PATH");
  const started = performance.now();
  const capturedAt = new Date().toISOString();
  const db = new PrismaClient({ log: [] });
  (globalThis as typeof globalThis & { prisma?: PrismaClient }).prisma = db;
  const { loadQuestionCandidates } = await import("../../src/lib/problem/questionProjection");
  const pg = new PGlite();
  try {
    await pg.exec(MIRROR_DDL);
    const result = await readOnly(db, async (tx) => {
      const version = formatRuleVersion();
      const [units, materials, ordering] = await Promise.all([
        tx.unit.findMany({ select: { id: true, grade: true, orderIndex: true } }),
        tx.sourceMaterial.findMany({ select: { id: true, bookId: true, kind: true } }),
        tx.$queryRaw<{ id: string; problem_code: string; question_number: number | null }[]>`SELECT id::text,problem_code,question_number FROM public.problem WHERE pool='shared'`,
      ]);
      const byUnit = new Map(units.map((u) => [u.id, u.grade]));
      const byMaterial = new Map(materials.map((m) => [m.id, m]));
      const byOrder = new Map(ordering.map((o) => [o.id, o]));
      await pg.query("INSERT INTO unit SELECT * FROM jsonb_populate_recordset(NULL::unit,$1::jsonb)",
        [JSON.stringify(units.map((u) => ({ id: u.id, grade: u.grade, order_index: u.orderIndex })))]);
      const current = await loadQuestionCandidates({ pool: visiblePool }, undefined, tx);
      const byId = new Map(current.map((r) => [r.id, r]));
      const columns = await hasFormatColumns(tx);
      let cursor: string | null = null, rows = 0, rowMismatches = 0;
      let corpusDigest = sha256("problem-format-corpus-v1");
      while (true) {
        const page = await readPage(tx, cursor, 500, columns);
        if (!page.length) break;
        const mirror = page.map((row) => {
          const fact = classifyFact(row, version), baseline = byId.get(row.id);
          if (!baseline || (baseline.actualFormat ?? "unknown") !== fact.actualFormat) rowMismatches++;
          if (!baseline) throw new Error("BASELINE_ROW_MISSING");
          const material = baseline.source === "school_textbook" ? byMaterial.get(baseline.sourceMaterialId ?? "") : undefined;
          corpusDigest = sha256(`${corpusDigest}:${row.id}:${fact.actualFormatDigest}:${fact.actualFormat}`);
          rows++;
          return { id: row.id, pool: baseline.pool, unit_id: baseline.unitId, source: baseline.source,
            source_material_id: baseline.sourceMaterialId, actual_format: fact.actualFormat,
            question_group_key: row.questionGroupKey, family_key: row.familyKey, family_id: sha256(familyIdOf(baseline)),
            difficulty: baseline.difficulty, grade: byUnit.get(baseline.unitId), book_id: material?.bookId ?? null, kind: material?.kind ?? null,
            source_groups: BANK_SOURCE_GROUPS.filter((g) => (BANK_SOURCE_GROUP_SOURCES[g] as readonly string[]).includes(baseline.source)),
            review_status: baseline.reviewStatus, direct_use_allowed: baseline.directUseAllowed, has_answer: row.answer !== MISSING_ANSWER,
            problem_code: byOrder.get(row.id)!.problem_code, question_number: byOrder.get(row.id)!.question_number,
          };
        });
        await pg.query("INSERT INTO problem SELECT * FROM jsonb_populate_recordset(NULL::problem,$1::jsonb)", [JSON.stringify(mirror)]);
        cursor = page[page.length - 1].id;
      }
      if (rows !== current.length) throw new Error("BASELINE_DENOMINATOR_MISMATCH");
      const comparisons = [];
      let allBuckets: CountBucket[] = [];
      for (const format of [undefined, ...QUESTION_FORMATS]) {
        const baseline = questionBucketsFromRows(current.map((r) => ({ ...r, weight: 1, rowCount: 1 })), dimensions, format, { units, materials });
        const cached = await mirroredBuckets(pg, format);
        if (!format) allBuckets = cached;
        const available = current.filter((r) => r.available && (!format || r.actualFormat === format));
        const expectedFamilies = new Map<string, { families: Set<string>; questions: Set<string> }>();
        for (const row of available) {
          const entry = expectedFamilies.get(row.unitId) ?? { families: new Set(), questions: new Set() };
          entry.families.add(familyIdOf(row)); entry.questions.add(row.questionId); expectedFamilies.set(row.unitId, entry);
        }
        const actualFamilies = (await pg.query<{ unit_id: string; n: number }>(`SELECT unit_id,
          LEAST(count(DISTINCT family_id),count(DISTINCT COALESCE(question_group_key,'row:'||id)))::int n
          FROM problem WHERE (${eligible}) AND ($1::text IS NULL OR actual_format=$1) GROUP BY unit_id`, [format ?? null])).rows;
        let familyMismatches = actualFamilies.length === expectedFamilies.size ? 0 : 1;
        for (const row of actualFamilies) {
          const expected = expectedFamilies.get(row.unit_id);
          if (!expected || row.n !== Math.min(expected.families.size, expected.questions.size)) familyMismatches++;
        }
        comparisons.push({ format: format ?? "all", ...compareBuckets(baseline, cached), familyUnits: actualFamilies.length, familyMismatches });
      }
      return { mode: "independent-read-only-verification", transactionReadOnly: true, rows, baselineRows: current.length,
        version, corpusDigest, rowMismatches, comparisons,
        totalMismatches: rowMismatches + comparisons.reduce((n, c) => n + c.mismatches + c.familyMismatches, 0),
        totals: allBuckets.filter((b) => ["all", "format", "source"].includes(b.axis)),
        dimensions, eligibility: "Existing approval/lock/answer/shared-pool rules preserved; unknown is held but unavailable",
      };
    });
    // The shared read-only snapshot has finished before any local index experiments.
    const indexes = await explainMirror(pg);
    const report = { ...result, capturedAt, indexes, elapsedMs: Math.round(performance.now() - started) };
    durableJson(resolve(args[1]), report);
    console.log(JSON.stringify({ ...result, indexPlans: indexes.after.map(({ name, nodes, indexes, executionMs }) => ({ name, nodes, indexes, executionMs })), elapsedMs: report.elapsedMs }, null, 2));
    if (result.totalMismatches) throw new Error("FORMAT_COUNT_PARITY_FAILED");
  } finally { await pg.close(); await db.$disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((error) => { console.error(`문항 형식 대조 실패: ${safeCode(error)}`); process.exitCode = 1; });
