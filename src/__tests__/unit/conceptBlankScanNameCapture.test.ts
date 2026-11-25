// @vitest-environment node
import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { openScanTestDb } from "../helpers/conceptBlankScanDb";
import { scanWorld } from "../helpers/conceptBlankScanFixture";
import {
  startScanNameCapture,
  runScanNameCapture,
  getScanNameCapture,
  chooseScanNameStudent,
} from "@/lib/concept-blank/scan/nameCapture";
import { getScanSubmission } from "@/lib/concept-blank/scan/submission";
import { beginScanJob } from "@/lib/concept-blank/scan/jobs";
import { scanConfig, type ScanModel } from "@/lib/concept-blank/scan/model";
import type { ScanPhotoStorage } from "@/lib/concept-blank/scan/storage.server";
let local: Awaited<ReturnType<typeof openScanTestDb>>,
  world: Awaited<ReturnType<typeof scanWorld>>;
const objects = new Map<string, Buffer>(),
  origin = "https://name.example.test";
const storage: ScanPhotoStorage = {
  bucket: "test",
  upload: async (k, b) => {
    objects.set(k, Buffer.from(b));
  },
  read: async (k) => objects.get(k)!,
  remove: async (k) => {
    objects.delete(k);
  },
  signedUrl: async () => "https://name.example.test/photo",
};
beforeAll(async () => {
  local = await openScanTestDb();
  world = await scanWorld(local);
  await local.db.query("UPDATE student SET name=$2::text WHERE id=$1::uuid", [
    world.studentA,
    "홍길동",
  ]);
}, 60_000);
afterAll(async () => {
  await local?.pg.close();
});
async function capture(text: string, status = "read") {
  const imageDataUrl = await QRCode.toDataURL(
    `${origin}/concept-blank/scan?p=${world.issued.id}&page=1&part=student`,
    { width: 700 },
  );
  const job = await startScanNameCapture(
    world.teacher,
    { printedSheetId: world.issued.id, requestId: randomUUID(), imageDataUrl },
    { db: local.db, storage, origin },
  );
  const model: ScanModel = async (r) =>
    JSON.stringify({
      written_name: { text, status },
      slots: JSON.parse(r.prompt.split("\n").at(-1)!).slots.map(
        (s: { id: string }) => ({ id: s.id, text: "", status: "blank" }),
      ),
    });
  return {
    job: { id: job.id, jobId: job.jobId! },
    deps: { db: local.db, storage, config: scanConfig({}), model: () => model },
  };
}
it("keeps an unassigned photo outside submissions and publishes nothing; unique name transfers photo/read once", async () => {
  const { job, deps } = await capture("홍 길동");
  await expect(
    getScanSubmission(world.teacher, job.id, local.db),
  ).rejects.toThrow(/찾을/);
  await expect(
    beginScanJob(
      world.teacher,
      job.id,
      { kind: "grade", revision: 0 },
      local.db,
    ),
  ).rejects.toThrow();
  await runScanNameCapture(job, deps);
  const captureView = await getScanNameCapture(world.teacher, job.id, local.db);
  expect(captureView.submissionId).toBe(job.id);
  const v = await getScanSubmission(world.teacher, job.id, local.db);
  expect(v.student.id).toBe(world.studentA);
  expect(v.writtenName).toMatchObject({
    method: "name-exact",
    result: "matched",
    text: "홍 길동",
  });
  expect(v.photos).toHaveLength(1);
  expect(v.readings.length).toBeGreaterThan(0);
  expect(v.grades).toEqual([]);
  await runScanNameCapture(job, deps);
  expect(
    (await getScanSubmission(world.teacher, job.id, local.db)).photos,
  ).toHaveLength(1);
});
it("uncertain reading opens candidates without choosing; only the capturing teacher can choose", async () => {
  const { job, deps } = await capture("홍길동", "uncertain");
  await runScanNameCapture(job, deps);
  const v = await getScanNameCapture(world.teacher, job.id, local.db);
  expect(v.submissionId).toBeNull();
  expect(v.students[0]).toMatchObject({ id: world.studentA, candidate: true });
  await expect(
    getScanNameCapture(world.student, job.id, local.db),
  ).rejects.toThrow();
  await expect(
    chooseScanNameStudent(
      { kind: "teacher", id: world.userB },
      job.id,
      world.studentA,
      local.db,
    ),
  ).rejects.toThrow();
  await chooseScanNameStudent(world.teacher, job.id, world.studentA, local.db);
  expect(
    (await getScanSubmission(world.teacher, job.id, local.db)).writtenName,
  ).toMatchObject({ method: "teacher-picked", result: "none" });
});

it("persists ambiguity and no-match without creating a submission; manual choice keeps the evidence", async () => {
  const duplicate = randomUUID();
  await local.db.query(
    `INSERT INTO student(id,class_id,name,updated_at) VALUES($1::uuid,$2::uuid,'홍길동',CURRENT_TIMESTAMP)`,
    [duplicate, world.classA],
  );
  const { job, deps } = await capture("홍길동");
  await runScanNameCapture(job, deps);
  const v = await getScanNameCapture(world.teacher, job.id, local.db);
  expect(v.result).toBe("ambiguous");
  expect(v.submissionId).toBeNull();
  expect(v.students.filter((s) => s.candidate)).toHaveLength(2);
  await chooseScanNameStudent(world.teacher, job.id, duplicate, local.db);
  expect(
    (await getScanSubmission(world.teacher, job.id, local.db)).writtenName,
  ).toMatchObject({ result: "ambiguous", method: "teacher-picked" });
  const none = await capture("등록되지 않은 이름");
  await runScanNameCapture(none.job, none.deps);
  expect(
    await getScanNameCapture(world.teacher, none.job.id, local.db),
  ).toMatchObject({ result: "none", submissionId: null });
  await chooseScanNameStudent(
    world.teacher,
    none.job.id,
    world.studentA,
    local.db,
  );
  expect(
    (await getScanSubmission(world.teacher, none.job.id, local.db)).writtenName,
  ).toMatchObject({ result: "mismatch", method: "teacher-picked" });
});

it("shares four slots and FIFO with answer reads; queued names resume without a second paid attempt", async () => {
  const { createDatabaseScanUsageStore } =
    await import("@/lib/concept-blank/scan/usageDatabase");
  const { createScanModel } = await import("@/lib/concept-blank/scan/model");
  const { runQueuedScanJobs } = await import("@/lib/concept-blank/scan/queue");
  const store = createDatabaseScanUsageStore(local.db),
    month = new Date().toISOString().slice(0, 7);
  const held = await Promise.all(
    Array.from({ length: 4 }, () =>
      store.begin(
        month,
        100e9,
        {
          requestKey: randomUUID(),
          operation: "read",
          model: "claude-opus-5-5",
          promptVersion: "test",
          reservedNanoUsd: 100,
        },
        4,
      ),
    ),
  );
  const c = await capture("홍길동");
  let paid = 0;
  const order: string[] = [];
  const deps = {
    ...c.deps,
    model: (key: string, submissionId?: string, attemptKey?: string) =>
      createScanModel({
        store: createDatabaseScanUsageStore(local.db, {
          submissionId,
          jobId: attemptKey,
        }),
        requestKey: key,
        attemptKey,
        transport: async (input) => {
          paid++;
          order.push(key);
          input.onAnthropicUsage?.({
            inputTokens: 1,
            outputTokens: 1,
            cachedInputTokens: 0,
            cacheCreationInputTokens: 0,
          });
          return c.deps.model()({
            operation: "read",
            prompt: input.prompt,
            signal: input.signal!,
          });
        },
      }),
  };
  await runScanNameCapture(c.job, deps);
  expect(
    (await getScanNameCapture(world.teacher, c.job.id, local.db)).job,
  ).toBe("waiting");
  expect(paid).toBe(0);
  const { beginScanSubmission, addScanPhoto } =
    await import("@/lib/concept-blank/scan/submission");
  const { runScanJob } = await import("@/lib/concept-blank/scan/jobs");
  const normal = await beginScanSubmission(
    world.student,
    { printedSheetId: world.issued.id, requestId: randomUUID() },
    local.db,
  );
  const imageDataUrl = await QRCode.toDataURL(
    `${origin}/concept-blank/scan?p=${world.issued.id}&page=1&part=student`,
    { width: 700 },
  );
  await addScanPhoto(
    world.student,
    normal.id,
    { revision: 0, imageDataUrl },
    { db: local.db, storage, origin },
  );
  const normalView = await getScanSubmission(
    world.student,
    normal.id,
    local.db,
  );
  await runScanJob(
    await beginScanJob(
      world.student,
      normal.id,
      { kind: "read", revision: normalView.revision },
      local.db,
    ),
    deps,
  );
  expect(paid).toBe(0);

  await store.settle(held[0], 1);
  await runQueuedScanJobs(deps);
  expect(
    (await getScanNameCapture(world.teacher, c.job.id, local.db)).job,
  ).toBeNull();
  expect(paid).toBe(2);
  expect(order[0]).toMatch(/^name:/);
  expect(order[1]).toMatch(/^read:/);
  await runQueuedScanJobs(deps);
  expect(paid).toBe(2);
  for (const lease of held.slice(1)) await store.settle(lease, 1);
});

it("keeps failed unknown usage settled and retries only after an explicit new name attempt", async () => {
  const { createDatabaseScanUsageStore } =
    await import("@/lib/concept-blank/scan/usageDatabase");
  const { createScanModel } = await import("@/lib/concept-blank/scan/model");
  const { retryScanNameCapture } =
    await import("@/lib/concept-blank/scan/nameCapture");
  const { runQueuedScanJobs } = await import("@/lib/concept-blank/scan/queue");
  const c = await capture("등록 안 된 이름");
  let paid = 0;
  const deps = {
    ...c.deps,
    model: (key: string, submissionId?: string, attemptKey?: string) =>
      createScanModel({
        store: createDatabaseScanUsageStore(local.db, {
          submissionId,
          jobId: attemptKey,
        }),
        requestKey: key,
        attemptKey,
        transport: async (input) => {
          paid++;
          if (paid === 1) throw new Error("network outcome unknown");
          input.onAnthropicUsage?.({
            inputTokens: 1,
            outputTokens: 1,
            cachedInputTokens: 0,
            cacheCreationInputTokens: 0,
          });
          return c.deps.model()({
            operation: "read",
            prompt: input.prompt,
            signal: input.signal!,
          });
        },
      }),
  };
  await runScanNameCapture(c.job, deps);
  expect(
    (await getScanNameCapture(world.teacher, c.job.id, local.db)).lastError,
  ).toBeTruthy();
  const [call] = await local.db.query<{
    status: string;
    cost_nano_usd: number;
    reserved_nano_usd: number;
    settlement_reason: string;
  }>(
    `SELECT status,cost_nano_usd,reserved_nano_usd,settlement_reason FROM concept_blank_scan_usage_call WHERE job_id=$1::uuid`,
    [c.job.jobId],
  );
  expect(call.status).toBe("settled");
  expect(call.settlement_reason).toBe("usage-unknown");
  expect(call.cost_nano_usd).toBe(call.reserved_nano_usd);
  await runQueuedScanJobs(deps);
  expect(paid).toBe(1);
  const retry = await retryScanNameCapture(world.teacher, c.job.id, local.db);
  expect(retry.jobId).not.toBe(c.job.jobId);
  await runScanNameCapture({ id: retry.id, jobId: retry.jobId! }, deps);
  expect(paid).toBe(2);
  expect(
    (await getScanNameCapture(world.teacher, c.job.id, local.db)).writtenName
      ?.text,
  ).toBe("등록 안 된 이름");
});

it("retries pending photo deletion after seven days and leaves transferred photos to normal retention", async () => {
  const { purgeScanNameCaptures } =
    await import("@/lib/concept-blank/scan/nameCapture");
  const c = await capture("아무도 없음");
  await runScanNameCapture(c.job, c.deps);
  await local.db.query(
    `UPDATE concept_blank_scan_name_capture SET expires_at=CURRENT_TIMESTAMP-interval '1 day' WHERE id=$1::uuid`,
    [c.job.id],
  );
  expect(
    await purgeScanNameCaptures({
      db: local.db,
      storage: {
        ...storage,
        remove: async () => {
          throw new Error("retry");
        },
      },
    }),
  ).toEqual({ deleted: 0 });
  expect(await purgeScanNameCaptures({ db: local.db, storage })).toEqual({
    deleted: 1,
  });
  await expect(
    getScanNameCapture(world.teacher, c.job.id, local.db),
  ).rejects.toThrow(/보관/);
});

it("does not schedule an active name capture twice for the same upload request", async () => {
  const imageDataUrl = await QRCode.toDataURL(
    `${origin}/concept-blank/scan?p=${world.issued.id}&page=1&part=student`,
    { width: 700 },
  );
  const input = {
    printedSheetId: world.issued.id,
    requestId: randomUUID(),
    imageDataUrl,
  };
  const first = await startScanNameCapture(world.teacher, input, {
    db: local.db,
    storage,
    origin,
  });
  expect(first.jobId).toBeTruthy();
  const replay = await startScanNameCapture(world.teacher, input, {
    db: local.db,
    storage,
    origin,
  });
  expect(replay).toEqual({ id: first.id, jobId: null });
});
