// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { openScanTestDb } from "../helpers/conceptBlankScanDb";
import { createDatabaseScanUsageStore } from "@/lib/concept-blank/scan/usageDatabase";
import { scanReservation, scanConfig } from "@/lib/concept-blank/scan/model";
import {
  scanDatabaseError,
  ScanUnavailableError,
} from "@/lib/concept-blank/scan/database";
import { seedWorld } from "../helpers/textbookPglite";

let local: Awaited<ReturnType<typeof openScanTestDb>>;
beforeAll(async () => {
  local = await openScanTestDb();
}, 60_000);
afterAll(async () => {
  await local?.pg.close();
});
const reservation = (reservedNanoUsd: number, key = randomUUID()) => ({
  reservedNanoUsd,
  requestKey: key,
  operation: "read" as const,
  model: "claude-opus-5-5" as const,
  promptVersion: "test-v1",
});

describe("scan migration and durable pre-reservation", () => {
  it("maps only missing table/column errors to the actionable DB-first 503", () => {
    for (const error of [
      { code: "42P01" },
      { code: "P2010", meta: { code: "42P01" } },
      { code: "P2022" },
    ]) {
      expect(() => scanDatabaseError(error)).toThrow(ScanUnavailableError);
    }
    const other = new Error("network unavailable");
    expect(() => scanDatabaseError(other)).toThrow(other);
    expect(new ScanUnavailableError()).toMatchObject({ status: 503 });
  });
  it("creates exactly the eight server-only tables and revokes default browser privileges", async () => {
    const rows = await local.db.query<{
      name: string;
      rls: boolean;
      anon: boolean;
      authenticated: boolean;
    }>(`
      SELECT c.relname AS name, c.relrowsecurity AS rls,
        has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS anon,
        has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS authenticated
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'concept_blank_%'`);
    expect(rows).toHaveLength(8);
    for (const row of rows)
      expect(row).toMatchObject({
        rls: true,
        anon: false,
        authenticated: false,
      });
  });

  it("bounds only the actual request and maximum output", async () => {
    const bound = await scanReservation(scanConfig({}).model, {
      prompt: "한 쪽",
    });
    expect(bound.inputTokens).toBe(Buffer.byteLength("한 쪽") + 1024);
    expect(bound.outputTokens).toBe(16000);
    expect(bound.reservedNanoUsd).toBeLessThan(432_000_000);
  });

  it("rejects before dispatch when the maximum cannot fit, then frees only the settled difference", async () => {
    const store = createDatabaseScanUsageStore(local.db);
    await expect(store.begin("2031-01", 100, reservation(101))).rejects.toThrow(
      /상한/,
    );
    expect(await store.inspect("2031-01")).toMatchObject({
      spentNanoUsd: 0,
      reservedNanoUsd: 0,
      busy: false,
    });
    const lease = await store.begin("2031-01", 100, reservation(80));
    const restarted = createDatabaseScanUsageStore(local.db);
    expect(await restarted.inspect("2031-01")).toMatchObject({
      reservedNanoUsd: 80,
      busy: true,
    });
    const parallel = await restarted.begin("2031-01", 100, reservation(1));
    await restarted.settle(parallel, 0);
    await restarted.settle(lease, 30, { output: '{"slots":[]}' });
    expect(await store.inspect("2031-01")).toEqual({
      spentNanoUsd: 30,
      reservedNanoUsd: 0,
      busy: false,
      unresolved: false,
      activeCalls: 0,
      queuedCalls: 0,
    });
    await expect(store.begin("2031-01", 100, reservation(71))).rejects.toThrow(
      /상한/,
    );
    await expect(store.settle(lease, 30)).rejects.toThrow(/정산/);
    const last = await store.begin("2031-01", 100, reservation(70));
    await store.settle(last, 70);
    await expect(store.begin("2031-01", 100, reservation(1))).rejects.toThrow(
      /상한/,
    );
  });

  it("retains a billed result with settlement so replay after process loss never pays again", async () => {
    const store = createDatabaseScanUsageStore(local.db);
    const key = randomUUID();
    const lease = await store.begin("2031-02", 100, reservation(80, key));
    await store.settle(lease, 10, { output: "protected raw answer" });
    expect(await createDatabaseScanUsageStore(local.db).findResult(key)).toBe(
      "protected raw answer",
    );
    await expect(
      store.begin("2031-02", 100, reservation(80, key)),
    ).rejects.toThrow(/이미/);
    expect(await store.inspect("2031-02")).toMatchObject({ spentNanoUsd: 10 });
  });

  it("charges unknown usage at its bound, including across UTC rollover", async () => {
    const store = createDatabaseScanUsageStore(local.db);
    const lease = await store.begin("2031-03", 100, reservation(90));
    await store.settle(lease, null);
    expect(await store.inspect("2031-03")).toEqual({
      spentNanoUsd: 90,
      reservedNanoUsd: 0,
      busy: false,
      unresolved: false,
      activeCalls: 0,
      queuedCalls: 0,
    });
    const next = await store.begin("2031-03", 100, reservation(1));
    await store.settle(next, 1);
    const april = await store.begin("2031-04", 100, reservation(90));
    await store.settle(april, 20);
    expect(await store.inspect("2031-04")).toMatchObject({
      spentNanoUsd: 20,
      unresolved: false,
    });
  });

  it("fails closed and records evidence if a provider receipt violates the frozen bound", async () => {
    const store = createDatabaseScanUsageStore(local.db);
    const lease = await store.begin("2031-05", 100, reservation(80));
    await expect(
      store.settle(lease, 81, { output: "must not be replayable" }),
    ).rejects.toThrow(/예약/);
    expect(await store.inspect("2031-05")).toMatchObject({
      unresolved: false,
      reservedNanoUsd: 0,
      spentNanoUsd: 81,
    });
  });

  it("freezes issued paper and rejects wrong-child evidence and late corrections in the database", async () => {
    const world = await seedWorld(local.pg);
    const sheet = randomUUID(),
      submission = randomUUID(),
      photo = randomUUID(),
      read = randomUUID();
    const snapshot = {
      version: 1,
      pages: [
        {
          number: 1,
          slots: [{ id: "p1.q1.answer" }],
          targets: [{ id: "p1.q1.grade" }],
        },
      ],
      pageCount: 1,
      bankFingerprint: "fixture",
    };
    await local.db.query(
      `INSERT INTO concept_blank_printed_sheet
      (id,user_id,created_by,request_id,snapshot,layout,render_artifact,artifact_sha256)
      VALUES ($1,$2,$2,$3,$4::jsonb,'{"version":1,"pages":[]}','{"version":1}',$5)`,
      [
        sheet,
        world.userA,
        randomUUID(),
        JSON.stringify(snapshot),
        "a".repeat(64),
      ],
    );
    await expect(
      local.db.query(
        `UPDATE concept_blank_printed_sheet SET sheet_code='changed' WHERE id=$1`,
        [sheet],
      ),
    ).rejects.toThrow(/immutable/);
    await local.db.query(
      `INSERT INTO concept_blank_scan_submission
      (id,printed_sheet_id,student_id,captured_student_id,request_id,state)
      VALUES ($1,$2,$3,$3,$4,'checking')`,
      [submission, sheet, world.studentA, randomUUID()],
    );
    await local.db.query(
      `INSERT INTO concept_blank_scan_photo
      (id,submission_id,page_number,version,bucket,object_key,content_sha256,mime_type,width,height,registration,expires_at)
      VALUES ($1,$2,1,1,'private',$4,$3,'image/jpeg',100,100,'{"status":"uncertain"}',NOW()+INTERVAL '7 days')`,
      [photo, submission, "b".repeat(64), photo],
    );
    await local.db.query(
      `INSERT INTO concept_blank_scan_read
      (id,submission_id,photo_id,slot_id,status,text,prompt_version,requested_model)
      VALUES ($1,$2,$3,'p1.q1.answer','read','처음 읽은 글','test','test')`,
      [read, submission, photo],
    );
    await expect(
      local.db.query(
        `INSERT INTO concept_blank_scan_read
      (id,submission_id,photo_id,slot_id,status,text,prompt_version,requested_model)
      VALUES ($1,$2,$3,'unknown','read','다른 칸','test','test')`,
        [randomUUID(), submission, photo],
      ),
    ).rejects.toThrow(/unknown scan slot/);
    const correct = (sequence: number) =>
      local.db.query(
        `INSERT INTO concept_blank_scan_correction
      (id,submission_id,read_id,slot_id,resolution,text,directly_entered,student_actor_id,sequence)
      VALUES ($1,$2,$3,'p1.q1.answer','blank','',true,$4,$5)`,
        [randomUUID(), submission, read, world.studentA, sequence],
      );
    await correct(1);
    await local.db.query(
      `UPDATE concept_blank_scan_submission SET job_id=$2,job_kind='grade',job_started_at=NOW() WHERE id=$1`,
      [submission, randomUUID()],
    );
    await expect(correct(2)).rejects.toThrow(/frozen/);
    await local.db.query(
      `UPDATE concept_blank_scan_submission SET state='graded',graded_at=NOW(),
      job_id=NULL,job_kind=NULL,job_started_at=NULL,revision=revision+1 WHERE id=$1`,
      [submission],
    );
    await expect(correct(2)).rejects.toThrow(/published/);
    await expect(
      local.db.query(
        `UPDATE concept_blank_scan_read SET text='overwrite' WHERE id=$1`,
        [read],
      ),
    ).rejects.toThrow(/immutable/);
    const rows = await local.db.query<{ text: string }>(
      `SELECT text FROM concept_blank_scan_read WHERE id=$1`,
      [read],
    );
    expect(rows[0].text).toBe("처음 읽은 글");
  });
});
