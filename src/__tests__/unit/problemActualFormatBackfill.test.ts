// @vitest-environment node
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyFact, formatInputDigest, formatRuleVersion, MIGRATION_PATH, safeCode, type FormatRow, type SqlClient } from "../../../scripts/db/problem-actual-format";
import { parseBackfillArgs, reconcileFailures, retryChunk, updateLockedRows, type BackfillState } from "../../../scripts/db/backfill-problem-actual-format";
import { compareBuckets, MIRROR_DDL, mirroredBuckets } from "../../../scripts/db/verify-problem-actual-format";
import { validateCatalog } from "../../../scripts/db/apply-problem-actual-format-migration";

const row = (patch: Partial<FormatRow> = {}): FormatRow => ({
  id: randomUUID(), content: "물음", answer: "7", questionType: "단답형", problemType: "개념", familyKey: null,
  questionGroupKey: null, actualFormat: null, actualFormatVersion: null, actualFormatDigest: null, ...patch,
});
const state = (): BackfillState => ({ kind: "problem-actual-format-backfill-v1", databaseHash: "test", version: "test", failures: {}, completed: false });

describe("형식 백필의 원문·관문·재개", () => {
  it("판정 입력 전부가 digest에 참여하고 공백·개행·빈 문자열을 뭉개지 않는다", () => {
    const base = row();
    for (const patch of [{ content: "물음 " }, { content: "물음\r\n" }, { answer: "8" }, { questionType: null },
      { problemType: "서술형" }, { familyKey: "" }, { questionGroupKey: "" }])
      expect(formatInputDigest({ ...base, ...patch })).not.toBe(formatInputDigest(base));
    const anotherId = { ...base, id: randomUUID() };
    expect(formatInputDigest(anotherId)).toBe(formatInputDigest(base));
    expect(formatRuleVersion()).toMatch(/^format-v1:[a-f0-9]{64}$/);
  });
  it("strict v1 키만으로 모순된 본문을 객관식으로 저장하지 않는다", () => {
    const proof = { questionGroupKey: `q:v1:${"a".repeat(64)}`, questionType: "객관식", answer: "①" };
    expect(() => classifyFact(row(proof), "test")).toThrow("FORMAT_EVIDENCE_MISMATCH");
    expect(classifyFact(row({ ...proof, content: "물음\n① 1\n② 2\n③ 3\n④ 4\n⑤ 5" }), "test").actualFormat).toBe("multiple_choice");
    expect(classifyFact(row({ questionType: null }), "test").actualFormat).toBe("unknown");
  });
  it("apply만 또는 환경변수만으로 쓰지 않으며 잘못된 인자를 조용히 무시하지 않는다", () => {
    expect(parseBackfillArgs([], { ALLOW_SHARED_IMPORT: "1" })).toMatchObject({ apply: false });
    expect(() => parseBackfillArgs(["--apply", "--state", "ledger.json"], {})).toThrow("SHARED_WRITE_GATE_CLOSED");
    expect(() => parseBackfillArgs(["--apply"], { ALLOW_SHARED_IMPORT: "1" })).toThrow("APPLY_REQUIRES_STATE_FILE");
    expect(parseBackfillArgs(["--apply", "--state", "ledger.json"], { ALLOW_SHARED_IMPORT: "1" }).apply).toBe(true);
    expect(() => parseBackfillArgs(["--aplly"], {})).toThrow("UNKNOWN_ARGUMENT");
    expect(() => parseBackfillArgs(["--batch-size", "0"], {})).toThrow("INVALID_BATCH_SIZE");
    for (const report of ["ledger.json", "ledger.json.lock", "ledger.json.before.jsonl"])
      expect(() => parseBackfillArgs(["--state", "ledger.json", "--report", report], {})).toThrow("REPORT_STATE_PATH_COLLISION");
    expect(safeCode(new Error("postgres://secret:password@host/raw-answer"))).toBe("DB_OPERATION_FAILED");
  });
  it("한 배치의 일시 실패 후 성공하면 실패 표시를 지우고 성공 분모를 보전한다", async () => {
    const s = state(), rows = [row(), row()]; let calls = 0, persisted = 0;
    expect(await retryChunk(rows, s, async (batch) => { if (++calls === 1) throw new Error("TRANSIENT"); return batch.length; }, () => persisted++)).toBe(2);
    expect(s.failures).toEqual({}); expect(persisted).toBe(3);
  });
  it("3회 실패를 보존해 재개 때 건너뛰고 입력이 바뀌면 재시도한다", async () => {
    const s = state(), r = row(); let calls = 0;
    const fail = async () => { calls++; throw new Error("ROW_FAILED"); };
    await retryChunk([r], s, fail, () => {});
    expect(calls).toBe(3); expect(s.failures[r.id].attempts).toBe(3);
    await retryChunk([r], s, fail, () => {}); expect(calls).toBe(3);
    expect(await retryChunk([{ ...r, answer: "8" }], s, async () => 1, () => {})).toBe(1);
    expect(s.failures).toEqual({});
  });
  it("DDL 이력·칼럼·제약·트리거·인덱스의 부분 적용은 중단한다", () => {
    const pending = { columns: false, columnDetails: [], history: [], checks: [],
      triggers: [{ name: "problem_question_group_invalidate", enabled: "O", definition: "test" }], indexes: [], functions: [], questionGroupKeyPresent: true };
    expect(validateCatalog(pending, "hash")).toBe("pending");
    expect(() => validateCatalog({ ...pending, columns: true }, "hash")).toThrow("FORMAT_MIGRATION_CATALOG_MISMATCH");
  });
  it("현재 스냅샷에서 해소된 실패·범위 제외·변경 입력을 기록하고 미해결 실패만 보존한다", () => {
    const s = state();
    for (const id of ["valid", "gone", "changed", "unresolved"]) s.failures[id] = { digest: "old", attempts: 3, code: "ROW_FAILED" };
    expect(reconcileFailures(s, new Map([
      ["valid", { digest: "old", current: true }], ["changed", { digest: "new", current: false }], ["unresolved", { digest: "old", current: false }],
    ]))).toEqual({ alreadyCurrent: 1, outOfScope: 1, inputChanged: 1, unresolved: 1 });
    expect(Object.keys(s.failures)).toEqual(["unresolved"]);
    expect(s.failures.unresolved.attempts).toBe(3);
    expect(s.resolvedFailures?.gone).toMatchObject({ reason: "out-of-scope", previous: { attempts: 3 } });
  });
});

it("실제 PGlite에서 쓰기 직전 재독해·원장 선기록·멱등 재개·세 칸만 갱신을 검증한다", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(`CREATE TYPE problem_pool AS ENUM ('shared','private');
      CREATE TABLE problem (id uuid PRIMARY KEY, pool problem_pool DEFAULT 'shared',unit_id uuid,
        source_material_id uuid,problem_code text,question_number integer,
        content text,answer text,question_type text,problem_type text,family_key text,question_group_key text,
        updated_at timestamptz DEFAULT '2026-01-01T00:00:00Z');`);
    await pg.exec(readFileSync(MIGRATION_PATH, "utf8"));
    const original = row();
    await pg.query("INSERT INTO problem(id,content,answer,question_type,problem_type) VALUES($1,$2,$3,$4,$5)",
      [original.id, original.content, original.answer, original.questionType, original.problemType]);
    // Simulate a source edit after the scan; the locked reread must use the new source.
    await pg.query("UPDATE problem SET answer='8',question_type='서술형' WHERE id=$1", [original.id]);
    const events: string[] = [];
    const tx = {
      $queryRaw: async (q: { text: string; values: unknown[] }) => {
        if (q.text.includes("UPDATE public.problem")) events.push("update");
        return (await pg.query(q.text, q.values)).rows;
      },
      $executeRaw: async (q: { text: string; values: unknown[] }) => (await pg.query(q.text, q.values)).affectedRows,
    } as unknown as SqlClient;
    let journals = 0;
    const journal = async () => {
      const [before] = (await pg.query<{ actual_format: string | null }>("SELECT actual_format FROM problem")).rows;
      expect(before.actual_format).toBeNull();
    };
    // Journal callback is synchronous in production. Observe the preimage directly after it fires.
    await journal();
    await pg.exec("BEGIN");
    expect(await updateLockedRows(tx, [original], "test", () => { journals++; events.push("journal"); })).toBe(1);
    await pg.exec("COMMIT");
    expect(events).toEqual(["journal", "update"]);
    const [saved] = (await pg.query<{ actual_format: string; answer: string; updated_at: Date }>("SELECT * FROM problem")).rows;
    expect(saved.actual_format).toBe("descriptive"); expect(saved.answer).toBe("8");
    expect(new Date(saved.updated_at).toISOString()).toBe("2026-01-01T00:00:00.000Z");
    await pg.exec("BEGIN");
    expect(await updateLockedRows(tx, [original], "test", () => { journals++; })).toBe(0);
    await pg.exec("COMMIT");
    expect(journals).toBe(1);
    await expect(updateLockedRows(tx, [original], "different-version", () => { journals++; })).rejects.toThrow("FORMAT_EXISTING_VERSION_MISMATCH");
    expect(journals).toBe(1);
  } finally { await pg.close(); }
}, 60_000);

it("독립 SQL 집계는 unknown·형제·NULL 정체·자료/책 합집합을 보존한다", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(MIRROR_DDL);
    const base = { pool: "shared", unit_id: "u", source: "school_textbook", source_material_id: "m", actual_format: "short_answer",
      question_group_key: "q:pair", family_key: null, family_id: "family", difficulty: "기본", grade: "중1", book_id: "b", kind: "자료",
      source_groups: ["school_textbook"], review_status: "approved", direct_use_allowed: true, has_answer: true, question_number: 1 };
    const rows = [
      { ...base, id: "1", problem_code: "1" },
      { ...base, id: "2", problem_code: "2", source_material_id: "m2", actual_format: "descriptive" },
      { ...base, id: "3", problem_code: "3", question_group_key: null, actual_format: "unknown" },
      { ...base, id: "4", problem_code: "4", question_group_key: null, actual_format: "unknown" },
    ];
    await pg.query("INSERT INTO problem SELECT * FROM jsonb_populate_recordset(NULL::problem,$1)", [JSON.stringify(rows)]);
    const buckets = await mirroredBuckets(pg);
    expect(buckets.find((b) => b.axis === "all")).toMatchObject({ held: 3, available: 1, rowCount: 2 });
    expect(buckets.find((b) => b.axis === "book")).toMatchObject({ held: 3, available: 1 });
    expect(buckets.filter((b) => b.axis === "format")).toHaveLength(2);
    expect(compareBuckets(buckets, buckets).mismatches).toBe(0);
    expect(compareBuckets(buckets, buckets.slice(1)).mismatches).toBe(1);
  } finally { await pg.close(); }
}, 60_000);
