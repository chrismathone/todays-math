// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { openScanTestDb } from "../helpers/conceptBlankScanDb";
import { scanWorld } from "../helpers/conceptBlankScanFixture";
import { beginScanJob, runScanJob } from "@/lib/concept-blank/scan/jobs";
import {
  beginScanSubmission,
  addScanPhoto,
  getScanSubmission,
  correctScanAnswer,
} from "@/lib/concept-blank/scan/submission";
import { scanConfig, type ScanModel } from "@/lib/concept-blank/scan/model";
import { createScanModel } from "@/lib/concept-blank/scan/model";
import { createDatabaseScanUsageStore } from "@/lib/concept-blank/scan/usageDatabase";
import { runQueuedScanJobs } from "@/lib/concept-blank/scan/queue";
import type { ScanPhotoStorage } from "@/lib/concept-blank/scan/storage.server";
let local: Awaited<ReturnType<typeof openScanTestDb>>,
  world: Awaited<ReturnType<typeof scanWorld>>;
const origin = "https://today.example.test",
  objects = new Map<string, Buffer>();
const storage: ScanPhotoStorage = {
  bucket: "test-private",
  upload: async (key, b) => {
    objects.set(key, Buffer.from(b));
  },
  read: async (key, hash) => {
    const b = objects.get(key)!;
    expect(createHash("sha256").update(b).digest("hex")).toBe(hash);
    return b;
  },
  signedUrl: async () => "https://example.test/photo",
  remove: async (key) => {
    objects.delete(key);
  },
};
const config = scanConfig({});
beforeAll(async () => {
  local = await openScanTestDb();
  world = await scanWorld(local, ["term", "cloze", "map"]);
}, 60_000);
afterAll(async () => {
  await local?.pg.close();
});
async function captured() {
  const { id } = await beginScanSubmission(
    world.student,
    { printedSheetId: world.issued.id, requestId: randomUUID() },
    local.db,
  );
  for (const p of world.snapshot.pages) {
    const view = await getScanSubmission(world.student, id, local.db);
    const imageDataUrl = await QRCode.toDataURL(
      `${origin}/concept-blank/scan?p=${world.issued.id}&page=${p.number}&part=student`,
      { width: 700, margin: 4 },
    );
    await addScanPhoto(
      world.student,
      id,
      { revision: view.revision, imageDataUrl },
      { db: local.db, storage, origin },
    );
  }
  return id;
}
function fakeRead(status: "read" | "unreadable" | "blank" = "read") {
  return vi.fn<ScanModel>(async (request) => {
    const inventory = JSON.parse(request.prompt.split("\n").at(-1)!);
    return JSON.stringify({
      slots: inventory.slots.map((s: { id: string }) => ({
        id: s.id,
        status,
        text: status === "read" ? "종이에 적힌 답" : "",
      })),
    });
  });
}
const begin = async (id: string, kind: "read" | "grade") => {
  const view = await getScanSubmission(world.student, id, local.db);
  return beginScanJob(
    world.student,
    id,
    { revision: view.revision, kind },
    local.db,
  );
};
describe("durable reading, input freeze and immediate publication", () => {
  it("keeps a fifth job waiting and finishes it without another student click", async () => {
    const store = createDatabaseScanUsageStore(local.db);
    const held = await Promise.all(
      Array.from({ length: 4 }, () =>
        store.begin(
          "2026-11",
          100e9,
          {
            requestKey: randomUUID(),
            operation: "read",
            model: config.model,
            promptVersion: "test",
            reservedNanoUsd: 100,
          },
          4,
        ),
      ),
    );
    const id = await captured(),
      job = await begin(id, "read"),
      read = fakeRead();
    const model = (key: string, submissionId: string, attemptKey?: string) =>
      createScanModel({
        store: createDatabaseScanUsageStore(local.db, {
          submissionId,
          jobId: attemptKey,
        }),
        requestKey: key,
        attemptKey,
        transport: async (input) => {
          input.onAnthropicUsage?.({
            inputTokens: 5000,
            outputTokens: 100,
            cachedInputTokens: 0,
            cacheCreationInputTokens: 0,
          });
          return read({
            operation: "read",
            prompt: input.prompt,
            signal: input.signal!,
          });
        },
      });
    const deps = { db: local.db, storage, model, config };
    await runScanJob(job, deps);
    expect(await getScanSubmission(world.student, id, local.db)).toMatchObject({
      job: { kind: "read", waiting: true },
      lastError: null,
    });
    expect(read).not.toHaveBeenCalled();
    await store.settle(held[0], 0);
    await runQueuedScanJobs(deps);
    expect(await getScanSubmission(world.student, id, local.db)).toMatchObject({
      state: "checking",
      job: null,
      lastError: null,
    });
    expect(read).toHaveBeenCalledTimes(world.snapshot.pageCount);
    for (const lease of held.slice(1)) await store.settle(lease, 0);
  });

  it("charges an unknown call once, never auto-repeats it, and allows an explicit retry", async () => {
    const id = await captured(),
      read = fakeRead();
    let calls = 0;
    const model = (key: string, submissionId: string, attemptKey?: string) =>
      createScanModel({
        store: createDatabaseScanUsageStore(local.db, {
          submissionId,
          jobId: attemptKey,
        }),
        requestKey: key,
        attemptKey,
        transport: async (input) => {
          if (++calls === 1) throw new Error("connection lost");
          input.onAnthropicUsage?.({
            inputTokens: 1000,
            outputTokens: 100,
            cachedInputTokens: 0,
            cacheCreationInputTokens: 0,
          });
          return read({
            operation: "read",
            prompt: input.prompt,
            signal: input.signal!,
          });
        },
      });
    const deps = { db: local.db, storage, model, config };
    await runScanJob(await begin(id, "read"), deps);
    await runQueuedScanJobs(deps);
    expect(calls).toBe(1);
    expect(
      (await getScanSubmission(world.student, id, local.db)).job,
    ).toBeNull();
    await runScanJob(await begin(id, "read"), deps);
    expect(await getScanSubmission(world.student, id, local.db)).toMatchObject({
      state: "checking",
      job: null,
    });
    const rows = await local.db.query<{
      result_key: string;
      request_key: string;
      settlement_reason: string;
    }>(
      `SELECT * FROM concept_blank_scan_usage_call WHERE submission_id=$1::uuid ORDER BY queue_order`,
      [id],
    );
    expect(rows[0].settlement_reason).toBe("usage-unknown");
    expect(rows[0].result_key).toBe(rows[1].result_key);
    expect(rows[0].request_key).not.toBe(rows[1].request_key);
  });
  it("rejects missing pages before any job and locks captured input while reading", async () => {
    const a = await beginScanSubmission(
      world.student,
      { printedSheetId: world.issued.id, requestId: randomUUID() },
      local.db,
    );
    await expect(begin(a.id, "read")).rejects.toThrow(/빠졌|모든 쪽/);
    const id = await captured(),
      job = await begin(id, "read");
    await expect(begin(id, "read")).rejects.toThrow(/진행|중/);
    const before = await getScanSubmission(world.student, id, local.db);
    expect(before.state).toBe("read");
    await runScanJob(job, {
      db: local.db,
      storage,
      config,
      model: () => fakeRead(),
    });
    const after = await getScanSubmission(world.student, id, local.db);
    expect(after.state).toBe("checking");
    expect(after.job).toBeNull();
    expect(after.grades).toEqual([]);
  });
  it("retains already-read pages on failure and resumes without reading them again", async () => {
    const id = await captured(),
      model = fakeRead();
    let calls = 0;
    const flaky: ScanModel = async (r) => {
      if (++calls === 2) throw Error("upstream secret detail");
      return model(r);
    };
    await runScanJob(await begin(id, "read"), {
      db: local.db,
      storage,
      config,
      model: () => flaky,
    });
    let view = await getScanSubmission(world.student, id, local.db);
    expect(view.state).toBe("read");
    expect(view.readings).toHaveLength(world.snapshot.pages[0].slots.length);
    expect(view.lastError).not.toContain("secret");
    const retry = fakeRead();
    await runScanJob(await begin(id, "read"), {
      db: local.db,
      storage,
      config,
      model: () => retry,
    });
    view = await getScanSubmission(world.student, id, local.db);
    expect(view.state).toBe("checking");
    expect(retry).toHaveBeenCalledTimes(world.snapshot.pageCount - 1);
  });
  it("keeps blank versus review, freezes late edits, reveals no partial grades and publishes all together", async () => {
    const id = await captured();
    await runScanJob(await begin(id, "read"), {
      db: local.db,
      storage,
      config,
      model: () => fakeRead("unreadable"),
    });
    let view = await getScanSubmission(world.student, id, local.db);
    const first = view.readings[0],
      second = view.readings[1];
    await correctScanAnswer(
      world.student,
      id,
      {
        revision: view.revision,
        readId: first.id,
        slotId: first.slotId,
        resolution: "blank",
        text: "",
      },
      local.db,
    );
    view = await getScanSubmission(world.student, id, local.db);
    await correctScanAnswer(
      world.student,
      id,
      {
        revision: view.revision,
        readId: second.id,
        slotId: second.slotId,
        resolution: "review",
        text: "",
      },
      local.db,
    );
    view = await getScanSubmission(world.student, id, local.db);
    const staleRevision = view.revision;
    const job = await begin(id, "grade");
    await expect(
      correctScanAnswer(
        world.student,
        id,
        {
          revision: staleRevision,
          readId: first.id,
          slotId: first.slotId,
          resolution: "text",
          text: "late",
        },
        local.db,
      ),
    ).rejects.toThrow(/최신/);
    const noModel = vi
      .fn<ScanModel>()
      .mockRejectedValue(Error("must not call"));
    await runScanJob(job, {
      db: local.db,
      storage,
      config,
      model: () => noModel,
    });
    view = await getScanSubmission(world.student, id, local.db);
    expect(view.state).toBe("graded");
    expect(noModel).not.toHaveBeenCalled();
    expect(
      view.grades.find((g) => g.slotIds.includes(first.slotId))?.label,
    ).toBe("incorrect");
    expect(
      view.grades.find((g) => g.slotIds.includes(second.slotId))?.label,
    ).toBe("review");
    expect(
      view.grades.every((g) => g.label === "review" || g.label === "incorrect"),
    ).toBe(true);
    const rows = await local.db.query<{
      used_at: Date;
      created_at: Date;
      expires_at: Date;
    }>(
      `SELECT used_at,created_at,expires_at FROM concept_blank_scan_photo WHERE submission_id=$1::uuid AND is_current`,
      [id],
    );
    expect(
      rows.every(
        (r) =>
          r.used_at !== null &&
          r.expires_at.getTime() - r.created_at.getTime() === 30 * 86400_000,
      ),
    ).toBe(true);
  });
  it("retains a completed grade page through failure, hides it before publication, and never pays for it again", async () => {
    const id = await captured();
    await runScanJob(await begin(id, "read"), {
      db: local.db,
      storage,
      config,
      model: () => fakeRead(),
    });
    const normal: ScanModel = async (r) =>
      JSON.stringify({
        grades: JSON.parse(r.prompt.split("\n").at(-1)!).map(
          (t: { id: string }) => ({
            id: t.id,
            label: "partial",
            reason: "필수 뜻 일부가 빠졌습니다.",
          }),
        ),
      });
    let count = 0;
    const flaky: ScanModel = async (r) => {
      if (++count === 2)
        throw Error(
          "사진 채점의 월 사용 상한에 필요한 예약액이 남지 않았습니다.",
        );
      return normal(r);
    };
    await runScanJob(await begin(id, "grade"), {
      db: local.db,
      storage,
      config,
      model: () => flaky,
    });
    let view = await getScanSubmission(world.student, id, local.db);
    expect(view.state).toBe("checking");
    expect(view.grades).toEqual([]);
    expect(view.lastError).toContain("상한");
    const resumed = vi.fn(normal);
    await runScanJob(await begin(id, "grade"), {
      db: local.db,
      storage,
      config,
      model: () => resumed,
    });
    view = await getScanSubmission(world.student, id, local.db);
    expect(view.state).toBe("graded");
    expect(resumed).toHaveBeenCalledTimes(1);
    expect(view.grades.filter((g) => g.page === 1)).toHaveLength(
      world.snapshot.pages[0].targets.length,
    );
  });
  it("reclaims only an expired application job, never an active paid call or a live job", async () => {
    const id = await captured();
    await begin(id, "read");
    await expect(begin(id, "read")).rejects.toThrow(/진행|중/);
    await local.db.query(
      `UPDATE concept_blank_scan_submission SET job_started_at=CURRENT_TIMESTAMP-interval '10 minutes' WHERE id=$1::uuid`,
      [id],
    );
    const next = await begin(id, "read");
    expect(next.kind).toBe("read");
    await local.db.query(
      `UPDATE concept_blank_scan_submission SET job_started_at=CURRENT_TIMESTAMP-interval '10 minutes' WHERE id=$1::uuid`,
      [id],
    );
    const call = randomUUID();
    await local.db.query(
      `INSERT INTO concept_blank_scan_usage_month(month) VALUES('2026-11') ON CONFLICT DO NOTHING`,
    );
    await local.db.query(
      `INSERT INTO concept_blank_scan_usage_call(id,month,submission_id,request_key,result_key,operation,model,tariff_version,prompt_version,reserved_nano_usd,status) VALUES($1::uuid,'2026-11',$2::uuid,$3::text,$3::text,'read','fake','2026-11-03','test',100,'running')`,
      [call, id, randomUUID()],
    );
    await expect(begin(id, "read")).rejects.toThrow(/마무리/);
  });
});
