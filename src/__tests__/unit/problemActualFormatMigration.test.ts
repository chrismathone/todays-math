// @vitest-environment node
import { readFileSync } from "node:fs";
import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openTextbookDb, seedWorld, insertProblem, rejected, type Db, type World } from "../helpers/textbookPglite";
import { classifyFact, MIGRATION_PATH, MIGRATION_NAME, sha256, type FormatRow, type SqlClient } from "../../../scripts/db/problem-actual-format";
import { formatCatalog, validateCatalog } from "../../../scripts/db/apply-problem-actual-format-migration";
import { loadQuestionCandidates } from "@/lib/problem/questionProjection";
import type { QuestionDb } from "@/lib/problem/questionQueries";
import { questionBucketsFromRows } from "@/lib/problem/questionCountBuckets";

let pg: Db, world: World;
const version = "migration-test-v1";
const column = (key: string) => `"${key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}"`;
/** Same strict, local PostgreSQL query-adapter approach as builderSpeedPglite.
 * Only the unchanged candidate reader's actual select/where shapes are accepted.
 */
function currentClient(): QuestionDb {
  const compile = (where: Record<string, unknown>, values: unknown[]): string => Object.entries(where).map(([key, value]) => {
    if (key === "AND") return `(${(value as Record<string, unknown>[]).map((w) => compile(w, values)).join(" AND ")})`;
    if (key === "pool") { values.push(value); return `pool=$${values.length}`; }
    if (key === "id" && value && typeof value === "object" && "in" in value) {
      values.push((value as { in: string[] }).in); return `id=ANY($${values.length}::uuid[])`;
    }
    throw new Error(`Unsupported old-reader predicate ${key}`);
  }).join(" AND ");
  return { problem: { findMany: async (args: { where: Record<string, unknown>; select: Record<string, boolean> }) => {
    const values: unknown[] = [];
    return (await pg.query(`SELECT ${Object.keys(args.select).map((key) => `${column(key)} AS "${key}"`).join(",")}
      FROM problem WHERE ${compile(args.where, values)}`, values)).rows;
  } } } as unknown as QuestionDb;
}
async function row(id: string) {
  return (await pg.query<FormatRow>(`SELECT id::text,content,answer,question_type AS "questionType",problem_type AS "problemType",
    family_key AS "familyKey",question_group_key AS "questionGroupKey",actual_format AS "actualFormat",
    actual_format_version AS "actualFormatVersion",actual_format_digest AS "actualFormatDigest" FROM problem WHERE id=$1`, [id])).rows[0];
}
async function prime(id: string) {
  const fact = classifyFact(await row(id), version);
  await pg.query("UPDATE problem SET actual_format=$2,actual_format_version=$3,actual_format_digest=$4 WHERE id=$1",
    [id, fact.actualFormat, fact.actualFormatVersion, fact.actualFormatDigest]);
  return fact;
}
async function fresh() {
  const { id } = await insertProblem(pg, world.unitId);
  await pg.query("UPDATE problem SET content='물음',answer='7',question_type='단답형' WHERE id=$1", [id]);
  await prime(id);
  return id;
}

beforeAll(async () => {
  // Replay the real Prisma history, then the separately deployed strict identity DDL.
  pg = await openTextbookDb({ until: "20261019100000_branch_owner_menus" });
  world = await seedWorld(pg);
  await pg.exec(readFileSync("supabase/migrations/20261018063016_question_group_identity.sql", "utf8"));
}, 120_000);
afterAll(async () => { await pg?.close(); });

describe.sequential("실제 형식 DDL의 DB 먼저 배포", () => {
  it("기존 전체 migration·정체 트리거 위에 적용해도 현재 reader·집계·old writer의 결과가 같다", async () => {
    // An unordered SQL scan may change heap order after UPDATE. Compare rows by
    // identity; product paths requiring order provide their own explicit orderBy.
    const byId = <T extends { id: string }>(rows: T[]) => rows.sort((a, b) => a.id.localeCompare(b.id));
    const before = byId(await loadQuestionCandidates({ pool: "shared" }, undefined, currentClient()));
    const oldReads = async () => (await pg.query<{ id: string }>(`SELECT id,content,answer,question_type,problem_type,family_key,question_group_key,
      pool,review_status,direct_use_allowed,problem_code,updated_at FROM problem ORDER BY id`)).rows;
    const oldSnapshot = await oldReads();
    await pg.exec("CREATE TABLE _prisma_migrations (migration_name text,checksum text,finished_at timestamptz,rolled_back_at timestamptz)");
    const catalogClient = { $queryRaw: async (query: Prisma.Sql | TemplateStringsArray, ...values: unknown[]) => {
      const q = Array.isArray(query) ? Prisma.sql(query as TemplateStringsArray, ...values) : query as Prisma.Sql;
      return (await pg.query(q.text, q.values)).rows;
    } } as unknown as SqlClient;
    const checksum = sha256(readFileSync(MIGRATION_PATH, "utf8").replaceAll("\r", ""));
    expect(validateCatalog(await formatCatalog(catalogClient), checksum)).toBe("pending");
    await pg.exec(readFileSync(MIGRATION_PATH, "utf8"));
    await pg.query("INSERT INTO _prisma_migrations VALUES ($1,$2,now(),NULL)", [MIGRATION_NAME, checksum]);
    expect(validateCatalog(await formatCatalog(catalogClient), checksum)).toBe("applied");
    expect(await oldReads()).toEqual(oldSnapshot);
    const after = byId(await loadQuestionCandidates({ pool: "shared" }, undefined, currentClient()));
    expect(after).toEqual(before);
    for (const r of oldSnapshot) await prime(String(r.id));
    expect(byId(await loadQuestionCandidates({ pool: "shared" }, undefined, currentClient()))).toEqual(before);
    const buckets = (rows: typeof before) => questionBucketsFromRows(rows.map((r) => ({ ...r, weight: 1, rowCount: 1 })), ["unit", "family", "source"]);
    expect(buckets(after)).toEqual(buckets(before));
    const { id } = await insertProblem(pg, world.unitId); // old INSERT omits all three columns
    expect((await row(id)).actualFormat).toBeNull();
    await pg.query("UPDATE problem SET review_status='approved',direct_use_allowed=true WHERE id=$1", [id]);
    expect((await row(id)).actualFormat).toBeNull();
    expect((await pg.query("SELECT indexname FROM pg_indexes WHERE indexname LIKE 'problem_pool_%actual_format%'")).rows).toHaveLength(3);
    for (const role of ["anon", "authenticated"]) {
      const [privilege] = (await pg.query<{ writable: boolean }>("SELECT has_column_privilege($1,'public.problem','actual_format','UPDATE') AS writable", [role])).rows;
      expect(privilege.writable).toBe(false);
    }
  });

  it.each([
    ["content", "새 물음"], ["answer", "8"], ["question_type", null],
    ["problem_type", "서술형"], ["family_key", "mid:new-family"], ["question_group_key", "legacy-proof"],
  ])("입력 %s 변경은 구버전 저장자의 stale 캐시 동시 쓰기까지 무효화한다", async (field, value) => {
    const id = await fresh();
    await pg.query(`UPDATE problem SET "${field}"=$2,actual_format='short_answer',actual_format_version=$3,actual_format_digest=$4 WHERE id=$1`,
      [id, value, version, "a".repeat(64)]);
    const updated = await row(id);
    expect([updated.actualFormat, updated.actualFormatVersion, updated.actualFormatDigest]).toEqual([null, null, null]);
  });

  it("NULL→값·값→NULL·같은 입력 재저장을 NULL-safe하게 구분한다", async () => {
    const id = await fresh();
    await pg.query("UPDATE problem SET question_type=NULL WHERE id=$1", [id]);
    await prime(id);
    await pg.query("UPDATE problem SET question_type='단답형' WHERE id=$1", [id]);
    expect((await row(id)).actualFormat).toBeNull();
    const fact = await prime(id);
    await pg.query("UPDATE problem SET content=content,question_type=question_type WHERE id=$1", [id]);
    expect(await row(id)).toMatchObject(fact);
  });

  it("검수·출제 잠금·시각 및 증거 없는 해설 변경은 캐시를 유지한다", async () => {
    const id = await fresh(), fact = await prime(id);
    await pg.query("UPDATE problem SET review_status='approved',direct_use_allowed=false,updated_at=now(),solution='새 해설' WHERE id=$1", [id]);
    expect(await row(id)).toMatchObject(fact);
  });

  it("선행 정체 트리거가 해설 변경으로 키를 지우면 새 캐시도 비운다", async () => {
    const id = await fresh();
    await pg.query("UPDATE problem SET question_group_key='legacy-proof' WHERE id=$1", [id]);
    await prime(id);
    await pg.query("UPDATE problem SET solution='정체 증거가 바뀜' WHERE id=$1", [id]);
    expect(await row(id)).toMatchObject({ questionGroupKey: null, actualFormat: null, actualFormatVersion: null, actualFormatDigest: null });
  });

  it("미계산 NULL과 계산된 unknown은 구분되고 CHECK는 모르는 형식·불완전한 세 칸을 거부한다", async () => {
    const id = await fresh();
    const bad = await rejected(pg.query("UPDATE problem SET actual_format='essay' WHERE id=$1", [id]));
    expect(bad.code).toBe("23514"); expect(bad.message).toContain("problem_actual_format_check");
    for (const sql of ["actual_format_digest=NULL", "actual_format_version=''", "actual_format_digest='bad'"])
      expect((await rejected(pg.query(`UPDATE problem SET ${sql} WHERE id=$1`, [id]))).message).toContain("problem_actual_format_complete_check");
    await pg.query("UPDATE problem SET actual_format='unknown' WHERE id=$1", [id]);
    expect((await row(id)).actualFormat).toBe("unknown");
    await pg.query("UPDATE problem SET actual_format=NULL,actual_format_version=NULL,actual_format_digest=NULL WHERE id=$1", [id]);
    expect((await row(id)).actualFormat).toBeNull();
  });
});

it("Supabase 정체 DDL 이전의 Prisma 전체 이력도 구버전 INSERT/UPDATE가 계속 동작한다", async () => {
  const legacy = await openTextbookDb();
  try {
    const seeded = await seedWorld(legacy);
    await legacy.query("UPDATE problem SET content='옛 writer 수정' WHERE id=$1", [seeded.problem1.id]);
    expect((await legacy.query<{ actual_format: string | null }>("SELECT actual_format FROM problem WHERE id=$1", [seeded.problem1.id])).rows[0].actual_format).toBeNull();
  } finally { await legacy.close(); }
}, 120_000);
