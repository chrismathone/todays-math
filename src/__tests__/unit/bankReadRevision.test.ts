// @vitest-environment node
import { readFileSync } from "node:fs";
import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { openTextbookDb, seedWorld, insertProblem, type Db, type World } from "../helpers/textbookPglite";
import { ACTUAL_FORMAT_VERSION, verifyFormatScope } from "@/lib/problem/actualFormat";
import { bankReadFingerprintSql, bankRevisionFingerprintSql, bankFormatsCurrent, currentBankReadClient, currentBankReadFingerprint, withBankReadClient, withBankReadFingerprint } from "@/lib/bankReadFingerprint";
import { cachedBankRead, invalidateBankReadCache } from "@/lib/bankReadCache";
import { questionCountsSql, questionPageSql } from "@/lib/problem/questionCountSql";
import { BANK_REVISION_BAKED_VERSION, BANK_REVISION_PATH, BANK_REVISION_MIGRATION, FORMAT_TRANSITION_MIGRATION, bankRevisionCatalog, bankRevisionRollbackStatements, validateBankRevisionCatalog, verifyBankRevisionCounter } from "../../../scripts/db/apply-bank-read-revision-migration";
import { FORMAT_TRANSITION_FROM, FORMAT_TRANSITION_TO, assertTransitionSafe, readTransitionMigration, scanTransition, transitionStatus } from "../../../scripts/db/apply-bank-format-version-migration";
import { classifyFact, readPage, sha256, splitMigration, type SqlClient } from "../../../scripts/db/problem-actual-format";

let pg: Db, world: World, id: string;
const migration = readFileSync(BANK_REVISION_PATH, "utf8");
const checksum = sha256(migration.replaceAll("\r", ""));
const queries: string[] = [];
const client = {
  $queryRaw: async (query: Prisma.Sql | TemplateStringsArray, ...values: unknown[]) => {
    const sql = Array.isArray(query) ? Prisma.sql(query as TemplateStringsArray, ...values) : query as Prisma.Sql;
    queries.push(sql.text);
    return (await pg.query(sql.text, sql.values)).rows;
  },
} as unknown as SqlClient;
const revision = async () => (await pg.query<{ revision: string; invalid: string }>(
  "SELECT revision::text,invalid_format_count::text AS invalid FROM bank_read_revision WHERE id=1",
)).rows[0];
async function prime(problemId: string, version = ACTUAL_FORMAT_VERSION) {
  await pg.query("UPDATE problem SET actual_format='short_answer',actual_format_version=$2,actual_format_digest=$3 WHERE id=$1", [problemId, version, "0".repeat(64)]);
}
async function read<T>(run: () => Promise<T>) {
  await pg.exec("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try { return await withBankReadFingerprint(client, run); }
  finally { await pg.exec("ROLLBACK"); }
}
const publicRead = (compute: () => Promise<unknown>) => read(() => cachedBankRead("revision-test", compute));

beforeAll(async () => {
  pg = await openTextbookDb({ until: "20261019120000_problem_actual_format" });
  await pg.exec(readFileSync("supabase/migrations/20261018063016_question_group_identity.sql", "utf8"));
  world = await seedWorld(pg);
  id = (await insertProblem(pg, world.unitId)).id;
  await pg.exec("CREATE TABLE _prisma_migrations (migration_name text,checksum text,finished_at timestamptz,rolled_back_at timestamptz)");
}, 120_000);
afterAll(async () => { vi.unstubAllEnvs(); await pg?.close(); });
beforeEach(() => { vi.stubEnv("BANK_READ_REVISION", "off"); queries.length = 0; invalidateBankReadCache(); });

describe.sequential("bank revision DB first and opt-in reader", () => {
  it("keeps the pre-DDL path and adds schema without changing old query bytes", async () => {
    await withBankReadClient(client, async () => {
      expect(currentBankReadClient()).toBe(client);
      expect(currentBankReadFingerprint()).toBeUndefined();
      expect(bankFormatsCurrent(client)).toBe(false);
      expect(queries).toHaveLength(0);
    });
    expect(currentBankReadClient()).toBeUndefined();
    expect(validateBankRevisionCatalog(await bankRevisionCatalog(client), checksum)).toBe("pending");
    await read(async () => expect(bankFormatsCurrent(client)).toBe(false));
    expect(queries.some((q) => q.includes("FROM public.bank_read_revision"))).toBe(false);
    const formats = new Map<string, string>();
    verifyFormatScope(formats, client, { pool: "shared" });
    const sql = [
      Prisma.sql`SELECT id,content,answer,updated_at FROM problem ORDER BY id`,
      questionCountsSql({ pool: "shared" }, ["unit", "family", "source"], undefined, formats, client)!,
      questionPageSql({ pool: "shared" }, [{ unit: { orderIndex: "asc" } }, { problemCode: "asc" }, { id: "asc" }], true, undefined, 0, 12, formats, client)!,
    ];
    const before = await Promise.all(sql.map(async (q) => Buffer.from(JSON.stringify((await pg.query(q.text, q.values)).rows))));
    // The operator owns BEGIN/COMMIT; SQL failure rolls back every object.
    await pg.exec("BEGIN");
    for (const statement of splitMigration(migration)) await pg.exec(statement);
    await pg.query("INSERT INTO _prisma_migrations VALUES ($1,$2,now(),NULL)", [BANK_REVISION_MIGRATION, checksum]);
    await pg.exec("COMMIT");
    const installed = await bankRevisionCatalog(client);
    // 20261019160000 은 그때의 분류기 판을 singleton 에 박았다 — 그 사실은 그대로다.
    expect(migration).toContain(`'${BANK_REVISION_BAKED_VERSION}'`);
    expect(installed.rows[0].formatVersion).toBe(BANK_REVISION_BAKED_VERSION);
    expect(validateBankRevisionCatalog(installed, checksum, BANK_REVISION_BAKED_VERSION)).toBe("applied");
    await verifyBankRevisionCounter(client);
    // 지금 판은 검토된 판 옮기기 마이그레이션이 맞춘다(잠금 · 재집계 = 옛 수).
    expect(FORMAT_TRANSITION_FROM).toBe(BANK_REVISION_BAKED_VERSION);
    expect(FORMAT_TRANSITION_TO).toBe(ACTUAL_FORMAT_VERSION);
    const transition = readTransitionMigration();
    expect(await transitionStatus(client, transition.checksum, checksum)).toBe("pending");
    assertTransitionSafe(await scanTransition(client));
    const counted = (await revision()).invalid;
    await pg.exec("BEGIN");
    for (const statement of transition.statements) await pg.exec(statement);
    await pg.query("INSERT INTO _prisma_migrations VALUES ($1,$2,now(),NULL)", [FORMAT_TRANSITION_MIGRATION, transition.checksum]);
    await pg.exec("COMMIT");
    expect(await transitionStatus(client, transition.checksum, checksum)).toBe("applied");
    expect(validateBankRevisionCatalog(await bankRevisionCatalog(client), checksum)).toBe("applied");
    expect((await revision()).invalid).toBe(counted);
    await verifyBankRevisionCounter(client);
    for (let i = 0; i < sql.length; i++) expect(Buffer.from(JSON.stringify((await pg.query(sql[i].text, sql[i].values)).rows)).equals(before[i])).toBe(true);
    expect((await pg.query("SELECT indexname FROM pg_indexes WHERE tablename='bank_read_revision'")).rows).toEqual([{ indexname: "bank_read_revision_pkey" }]);
    expect(migration).not.toMatch(/CREATE (?:UNIQUE )?INDEX/);
  });

  it("moves stamped facts to the new classifier version only when they agree; drift rolls everything back", async () => {
    const local = await openTextbookDb({ until: "20261019120000_problem_actual_format" });
    const localClient = {
      $queryRaw: async (query: Prisma.Sql | TemplateStringsArray, ...values: unknown[]) => {
        const sql = Array.isArray(query) ? Prisma.sql(query as TemplateStringsArray, ...values) : query as Prisma.Sql;
        return (await local.query(sql.text, sql.values)).rows;
      },
    } as unknown as SqlClient;
    try {
      await local.exec(readFileSync("supabase/migrations/20261018063016_question_group_identity.sql", "utf8"));
      const w = await seedWorld(local);
      const ids = [(await insertProblem(local, w.unitId)).id, (await insertProblem(local, w.unitId)).id, (await insertProblem(local, w.unitId)).id];
      await local.exec("CREATE TABLE _prisma_migrations (migration_name text,checksum text,finished_at timestamptz,rolled_back_at timestamptz)");
      // 두 행은 옛 판으로 «올바른» 사실, 한 행은 미계산(NULL) — 옛 수 = 미계산 + 다른 판
      for (const row of (await readPage(localClient, null, 500, true)).filter((r) => ids.slice(0, 2).includes(r.id))) {
        const fact = classifyFact(row, FORMAT_TRANSITION_FROM);
        await local.query("UPDATE problem SET actual_format=$2,actual_format_version=$3,actual_format_digest=$4 WHERE id=$1", [row.id, fact.actualFormat, fact.actualFormatVersion, fact.actualFormatDigest]);
      }
      await local.exec("BEGIN");
      for (const statement of splitMigration(migration)) await local.exec(statement);
      await local.query("INSERT INTO _prisma_migrations VALUES ($1,$2,now(),NULL)", [BANK_REVISION_MIGRATION, checksum]);
      await local.exec("COMMIT");
      const counter = async () => (await local.query<{ v: string; invalid: string }>("SELECT format_version AS v,invalid_format_count::text AS invalid FROM bank_read_revision")).rows[0];
      const versions = async () => (await local.query<{ v: string | null }>("SELECT actual_format_version AS v FROM problem WHERE id = ANY($1::uuid[]) ORDER BY id", [ids])).rows.map((r) => r.v);
      const previous = await counter();
      const transition = readTransitionMigration();
      const scan = await scanTransition(localClient);
      expect(scan.atFrom).toBe(2);
      expect(scan.agree).toBe(2);
      // 입력 지문이 저장값과 다르면(판정기가 다른 사실을 낼 수 있으면) 옮기지 않는다
      await local.query("UPDATE problem SET actual_format_digest=$2 WHERE id=$1", [ids[0], "f".repeat(64)]);
      const tampered = await scanTransition(localClient);
      expect(tampered.digestChanged).toBe(1);
      expect(() => assertTransitionSafe(tampered)).toThrow("FORMAT_TRANSITION_FACT_CHANGED");
      const fixed = classifyFact((await readPage(localClient, null, 500, true)).find((r) => r.id === ids[0])!, FORMAT_TRANSITION_FROM);
      await local.query("UPDATE problem SET actual_format_digest=$2 WHERE id=$1", [ids[0], fixed.actualFormatDigest]);
      // 카운터가 실제와 어긋나 있으면 DO 블록이 RAISE — 거래 전체가 되돌아간다
      await local.exec("UPDATE bank_read_revision SET invalid_format_count=invalid_format_count+1");
      const before = await versions();
      await local.exec("BEGIN");
      await expect((async () => { for (const statement of transition.statements) await local.exec(statement); })()).rejects.toThrow("BANK_FORMAT_TRANSITION_COUNTER_DRIFT");
      await local.exec("ROLLBACK");
      expect((await counter()).v).toBe(FORMAT_TRANSITION_FROM);
      expect(await versions()).toEqual(before);
      await local.exec("UPDATE bank_read_revision SET invalid_format_count=invalid_format_count-1");
      // 정상: 옛 판 두 행이 새 판으로 · 재집계 수 = 옛 수 · singleton 판이 새 판
      const ready = await counter();
      expect(ready.invalid).toBe(previous.invalid);
      await local.exec("BEGIN");
      for (const statement of transition.statements) await local.exec(statement);
      await local.query("INSERT INTO _prisma_migrations VALUES ($1,$2,now(),NULL)", [FORMAT_TRANSITION_MIGRATION, transition.checksum]);
      await local.exec("COMMIT");
      const after = await counter();
      expect(after.v).toBe(FORMAT_TRANSITION_TO);
      expect(after.invalid).toBe(previous.invalid);
      expect((await versions()).filter((v) => v === FORMAT_TRANSITION_TO)).toHaveLength(2);
      expect((await versions()).filter((v) => v === null)).toHaveLength(1);
      expect(await transitionStatus(localClient, transition.checksum, checksum)).toBe("applied");
      await verifyBankRevisionCounter(localClient);
      // 두 번 돌리면 판 확인에서 멈춘다(이미 옮김)
      await local.exec("BEGIN");
      await expect((async () => { for (const statement of transition.statements) await local.exec(statement); })()).rejects.toThrow("BANK_FORMAT_TRANSITION_FROM_MISMATCH");
      await local.exec("ROLLBACK");
    } finally { await local.close(); }
  }, 120_000);

  it("increments once per bulk statement and accounts for NULL/current/other-version format facts", async () => {
    const before = await revision();
    await pg.query("UPDATE problem SET review_status=review_status WHERE pool='shared'");
    expect(BigInt((await revision()).revision)).toBe(BigInt(before.revision) + BigInt(1));
    await prime(id);
    const valid = await revision();
    await verifyBankRevisionCounter(client);
    await pg.query("UPDATE problem SET content=content || ' changed',updated_at=updated_at WHERE id=$1", [id]);
    expect(BigInt((await revision()).invalid)).toBe(BigInt(valid.invalid) + BigInt(1));
    await prime(id, "previous-classifier");
    await verifyBankRevisionCounter(client);
    expect((await revision()).invalid).toBe((BigInt(valid.invalid) + BigInt(1)).toString());
    await prime(id);
    expect((await revision()).invalid).toBe(valid.invalid);
    await verifyBankRevisionCounter(client);
  });

  it("covers pool transitions, INSERT/DELETE, UPSERT, and leaves unrelated private writes out", async () => {
    const fresh = (await insertProblem(pg, world.unitId)).id;
    const shared = await revision();
    await pg.query("UPDATE problem SET pool='private' WHERE id=$1", [fresh]);
    expect(BigInt((await revision()).invalid)).toBe(BigInt(shared.invalid) - BigInt(1));
    const privateState = await revision();
    await pg.query("UPDATE problem SET content=content || ' private' WHERE id=$1", [fresh]);
    expect(await revision()).toEqual(privateState);
    await pg.query("UPDATE problem SET pool='shared' WHERE id=$1", [fresh]);
    const moved = await revision();
    // A zero-row INSERT part of UPSERT must not double-bump the update event.
    await pg.query("INSERT INTO problem SELECT * FROM problem WHERE id=$1 ON CONFLICT(id) DO UPDATE SET review_status=EXCLUDED.review_status", [fresh]);
    expect(BigInt((await revision()).revision)).toBe(BigInt(moved.revision) + BigInt(1));
    await pg.query("DELETE FROM problem WHERE id=$1", [fresh]);
    expect(BigInt((await revision()).invalid)).toBe(BigInt(shared.invalid) - BigInt(1));
    await verifyBankRevisionCounter(client);
  });

  it("invalidates on related-table statements and counter rollback matches source rollback", async () => {
    const before = await revision();
    await pg.query("UPDATE unit SET order_index=order_index WHERE id=$1", [world.unitId]);
    await pg.exec("UPDATE source_book SET title=title; DELETE FROM source_material WHERE false");
    expect(BigInt((await revision()).revision)).toBe(BigInt(before.revision) + BigInt(3));
    const stable = await revision();
    await pg.exec("BEGIN");
    await insertProblem(pg, world.unitId);
    expect(await revision()).not.toEqual(stable);
    await pg.exec("ROLLBACK");
    expect(await revision()).toEqual(stable);
    await verifyBankRevisionCounter(client);
  });

  it("queues simultaneous PGlite transactions without losing relative revision/counter changes", async () => {
    // PGlite has ONE connection: verifies queued transactions, not network lock
    // contention, deadlocks, or multi-connection MVCC. Report this limit explicitly.
    const before = await revision();
    await Promise.all(Array.from({ length: 12 }, () => pg.transaction(async (tx) => {
      await tx.query("UPDATE problem SET actual_format=NULL,actual_format_version=NULL,actual_format_digest=NULL WHERE id=$1", [id]);
    })));
    expect(BigInt((await revision()).revision)).toBe(BigInt(before.revision) + BigInt(12));
    await verifyBankRevisionCounter(client);
  });

  it("validates every request with one singleton SELECT, and refreshes public caches after raw SQL", async () => {
    await pg.query("UPDATE problem SET actual_format='unknown',actual_format_version=$1,actual_format_digest=$2 WHERE pool='shared'", [ACTUAL_FORMAT_VERSION, "0".repeat(64)]);
    vi.stubEnv("BANK_READ_REVISION", "on");
    const compute = vi.fn(async () => (await revision()).revision);
    queries.length = 0;
    const first = await publicRead(compute);
    await publicRead(compute);
    expect(compute).toHaveBeenCalledOnce();
    expect(queries).toHaveLength(2);
    expect(queries.every((q) => q.includes("FROM public.bank_read_revision") && !q.includes("public.problem"))).toBe(true);
    await pg.query("UPDATE problem SET review_status=review_status,updated_at=updated_at WHERE id=$1", [id]);
    expect(await publicRead(compute)).not.toBe(first);
    expect(compute).toHaveBeenCalledTimes(2);
    await read(async () => expect(bankFormatsCurrent(client)).toBe(true));
    await pg.query("UPDATE problem SET answer=answer || ' changed' WHERE id=$1", [id]);
    await read(async () => expect(bankFormatsCurrent(client)).toBe(false));
    const legacy = vi.fn(async () => 42);
    await publicRead(legacy); await publicRead(legacy);
    expect(legacy).toHaveBeenCalledTimes(2);
  });

  it("falls back on a classifier-version mismatch and rejects incomplete/catalog-tampered installs", async () => {
    vi.stubEnv("BANK_READ_REVISION", "on");
    await pg.exec("BEGIN");
    try {
      await pg.exec("UPDATE bank_read_revision SET format_version='older-classifier'");
      queries.length = 0;
      await withBankReadFingerprint(client, async () => undefined);
      expect(queries).toHaveLength(2);
      expect(queries[1]).toContain("xmin");
      const mismatch = await bankRevisionCatalog(client);
      expect(() => validateBankRevisionCatalog({ ...mismatch, triggers: [] }, checksum)).toThrow();
    } finally { await pg.exec("ROLLBACK"); }
    const catalog = await bankRevisionCatalog(client);
    expect(() => validateBankRevisionCatalog({ ...catalog, functions: catalog.functions.map((f) => ({ ...f, securityDefiner: false })) }, checksum)).toThrow("BANK_REVISION_CATALOG_MISMATCH");
    await verifyBankRevisionCounter(client);
    expect(bankReadFingerprintSql().text).toContain("xmin");
    expect(bankRevisionFingerprintSql().text).not.toContain("xmin");
  });

  it("denies browser table/function access while an existing restricted SQL writer still works", async () => {
    for (const role of ["anon", "authenticated"]) {
      const [permission] = (await pg.query<{ table: boolean; fn: boolean }>(
        "SELECT has_table_privilege($1,'public.bank_read_revision','SELECT,INSERT,UPDATE,DELETE') AS table,has_function_privilege($1,'public.advance_problem_bank_revision()','EXECUTE') AS fn", [role],
      )).rows;
      expect(permission).toEqual({ table: false, fn: false });
    }
    await pg.exec("CREATE ROLE bank_fixture_writer; GRANT USAGE ON SCHEMA public TO bank_fixture_writer; GRANT SELECT,UPDATE ON problem TO bank_fixture_writer; GRANT SELECT ON problem_outer_wall_quarantine TO bank_fixture_writer");
    const before = await revision();
    await pg.exec("BEGIN; SET LOCAL ROLE bank_fixture_writer");
    try {
      await pg.query("UPDATE public.problem SET review_status=review_status WHERE id=$1", [id]);
      await pg.exec("COMMIT");
    } catch (error) { await pg.exec("ROLLBACK"); throw error; }
    expect(BigInt((await revision()).revision)).toBe(BigInt(before.revision) + BigInt(1));
  });

  it("handles TRUNCATE transactionally and a DDL failure leaves no partial install", async () => {
    const before = await revision();
    await pg.exec("BEGIN; TRUNCATE public.problem CASCADE");
    expect((await revision()).invalid).toBe("0");
    await pg.exec("ROLLBACK");
    expect(await revision()).toEqual(before);
    // Run a second real schema for a failed atomic install, then verify absence.
    const local = await openTextbookDb({ until: "20261019120000_problem_actual_format" });
    try {
      await local.exec("BEGIN");
      await expect(local.exec(`${migration}\nSELECT 1/0;`)).rejects.toThrow();
      await local.exec("ROLLBACK");
      expect((await local.query("SELECT to_regclass('public.bank_read_revision') AS t")).rows).toEqual([{ t: null }]);
      expect((await local.query("SELECT tgname FROM pg_trigger WHERE tgname LIKE '%bank_revision%'")).rows).toEqual([]);
    } finally { await local.close(); }
  }, 120_000);

  it("rolls back only its additive objects and exact history, preserving the old reader", async () => {
    const before = (await pg.query("SELECT id,content,answer,updated_at FROM public.problem ORDER BY id")).rows;
    await pg.exec("BEGIN");
    for (const statement of bankRevisionRollbackStatements()) await pg.exec(statement);
    await pg.query("DELETE FROM _prisma_migrations WHERE migration_name=$1 AND checksum=$2", [BANK_REVISION_MIGRATION, checksum]);
    await pg.exec("COMMIT");
    expect(validateBankRevisionCatalog(await bankRevisionCatalog(client), checksum)).toBe("pending");
    expect((await pg.query("SELECT id,content,answer,updated_at FROM public.problem ORDER BY id")).rows).toEqual(before);
    await read(async () => undefined);
  });
});
