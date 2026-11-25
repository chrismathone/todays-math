// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { openScanTestDb } from "../helpers/conceptBlankScanDb";
import { scanWorld } from "../helpers/conceptBlankScanFixture";
import { scanCorrectionInputSchema } from "@/contracts/conceptBlankScanApi.contract";
import {
  beginScanSubmission,
  getScanSubmission,
  addScanPhoto,
  correctScanAnswer,
  overrideScanGrade,
} from "@/lib/concept-blank/scan/submission";
import type { ScanPhotoStorage } from "@/lib/concept-blank/scan/storage.server";

let local: Awaited<ReturnType<typeof openScanTestDb>>;
let world: Awaited<ReturnType<typeof scanWorld>>;
const origin = "https://today.example.test";
const objects = new Map<string, Buffer>();
const storage: ScanPhotoStorage = {
  bucket: "test-private",
  upload: vi.fn(async (key, bytes) => {
    objects.set(key, Buffer.from(bytes));
  }),
  read: vi.fn(async (key, hash) => {
    const b = objects.get(key)!;
    if (createHash("sha256").update(b).digest("hex") !== hash)
      throw Error("hash mismatch");
    return b;
  }),
  signedUrl: vi.fn(async () => "https://example.test/photo"),
  remove: vi.fn(async (key) => {
    objects.delete(key);
  }),
};
const deps = () => ({ db: local.db, storage, origin });
const photo = (part = "student", p = world.issued.id) =>
  QRCode.toDataURL(`${origin}/concept-blank/scan?p=${p}&page=1&part=${part}`, {
    width: 700,
    margin: 4,
  });
const start = (requestId = randomUUID()) =>
  beginScanSubmission(
    world.student,
    { printedSheetId: world.issued.id, requestId },
    local.db,
  );
beforeAll(async () => {
  local = await openScanTestDb();
  world = await scanWorld(local);
}, 60_000);
afterAll(async () => {
  await local?.pg.close();
});

describe("scan submissions, staged photos and immutable answers", () => {
  it("strictly distinguishes text, blank and review and rejects client identity claims", () => {
    const base = { revision: 0, slotId: "slot", readId: randomUUID() };
    expect(
      scanCorrectionInputSchema.safeParse({
        ...base,
        resolution: "blank",
        text: "",
      }).success,
    ).toBe(true);
    expect(
      scanCorrectionInputSchema.safeParse({
        ...base,
        resolution: "review",
        text: "",
      }).success,
    ).toBe(true);
    expect(
      scanCorrectionInputSchema.safeParse({
        ...base,
        resolution: "text",
        text: " ",
      }).success,
    ).toBe(false);
    expect(
      scanCorrectionInputSchema.safeParse({
        ...base,
        resolution: "blank",
        text: "answer",
      }).success,
    ).toBe(false);
    expect(
      scanCorrectionInputSchema.safeParse({
        ...base,
        resolution: "text",
        text: "answer",
        actor: { id: world.userA },
      }).success,
    ).toBe(false);
  });
  it("creates idempotently, authorizes current issue AND student scope and projects no answer keys", async () => {
    const requestId = randomUUID();
    const a = await start(requestId),
      b = await start(requestId);
    expect(a.id).toBe(b.id);
    const view = await getScanSubmission(world.student, a.id, local.db);
    expect(view.student.id).toBe(world.studentA);
    expect(view.snapshot.pages).toHaveLength(world.snapshot.pageCount);
    const json = JSON.stringify(view);
    for (const key of [
      "referenceAnswer",
      "requiredIdeas",
      "bankFingerprint",
      "selection",
      "object_key",
    ])
      expect(json).not.toContain(key);
    await expect(
      getScanSubmission({ kind: "teacher", id: world.userB }, a.id, local.db),
    ).rejects.toThrow(/권한/);
    const other = await scanWorld(local);
    await expect(
      beginScanSubmission(
        other.student,
        { printedSheetId: world.issued.id, requestId: randomUUID() },
        local.db,
      ),
    ).rejects.toThrow(/권한/);
    await expect(
      beginScanSubmission(
        world.student,
        {
          printedSheetId: world.issued.id,
          studentId: other.studentA,
          requestId: randomUUID(),
        },
        local.db,
      ),
    ).rejects.toThrow(/본인/);
    await expect(
      beginScanSubmission(
        world.teacher,
        {
          printedSheetId: world.issued.id,
          studentId: world.studentA,
          requestId,
        },
        local.db,
      ),
    ).rejects.toThrow(/같은 요청/);
  });
  it("validates photo QR, stores uncertain registration with no overlays and replaces without losing evidence", async () => {
    const a = await start();
    await expect(
      addScanPhoto(
        world.student,
        a.id,
        { revision: 0, imageDataUrl: await photo("key") },
        deps(),
      ),
    ).rejects.toThrow(/채점표/);
    await expect(
      addScanPhoto(
        world.student,
        a.id,
        { revision: 0, imageDataUrl: await photo("student", randomUUID()) },
        deps(),
      ),
    ).rejects.toThrow(/다른 발행/);
    const first = await addScanPhoto(
      world.student,
      a.id,
      { revision: 0, imageDataUrl: await photo() },
      deps(),
    );
    let view = await getScanSubmission(world.student, a.id, local.db);
    expect(view.photos[0].registration.status).toBe("uncertain");
    expect(view.photos[0].registration).not.toHaveProperty("slots");
    await expect(
      addScanPhoto(
        world.student,
        a.id,
        { revision: 0, imageDataUrl: await photo() },
        deps(),
      ),
    ).rejects.toThrow(/최신/);
    await addScanPhoto(
      world.student,
      a.id,
      { revision: view.revision, imageDataUrl: await photo() },
      deps(),
    );
    view = await getScanSubmission(world.student, a.id, local.db);
    expect(view.photos).toHaveLength(1);
    expect(view.photos[0].id).not.toBe(first.photoId);
    const rows = await local.db.query<{
      is_current: boolean;
      expires_at: Date;
      created_at: Date;
    }>(
      `SELECT * FROM concept_blank_scan_photo WHERE submission_id=$1 ORDER BY version`,
      [a.id],
    );
    expect(rows.map((r) => r.is_current)).toEqual([false, true]);
    expect(
      rows.every(
        (r) =>
          r.expires_at.getTime() - r.created_at.getTime() === 7 * 86400_000,
      ),
    ).toBe(true);
  });
  it("keeps a staged metadata row on upload failure and will not promote an older in-flight upload", async () => {
    const a = await start();
    const imageDataUrl = await photo();
    await expect(
      addScanPhoto(
        world.student,
        a.id,
        { revision: 0, imageDataUrl },
        {
          ...deps(),
          storage: {
            ...storage,
            upload: async () => {
              throw Error("offline");
            },
          },
        },
      ),
    ).rejects.toThrow("offline");
    const staged = await local.db.query<{ is_current: boolean }>(
      `SELECT is_current FROM concept_blank_scan_photo WHERE submission_id=$1`,
      [a.id],
    );
    expect(staged).toEqual([{ is_current: false }]);
    let view = await getScanSubmission(world.student, a.id, local.db);
    let unblock!: () => void, entered!: () => void;
    const waiting = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const barrier = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    const old = addScanPhoto(
      world.student,
      a.id,
      { revision: view.revision, imageDataUrl },
      {
        ...deps(),
        storage: {
          ...storage,
          upload: async (...args) => {
            entered();
            await barrier;
            await storage.upload(...args);
          },
        },
      },
    );
    const stale = expect(old).rejects.toThrow(/최신/);
    await waiting;
    view = await getScanSubmission(world.student, a.id, local.db);
    const latest = await addScanPhoto(
      world.student,
      a.id,
      { revision: view.revision, imageDataUrl },
      deps(),
    );
    unblock();
    await stale;
    expect(
      (await getScanSubmission(world.student, a.id, local.db)).photos[0].id,
    ).toBe(latest.photoId);
  });
  it("appends corrections while checking, rejects late/post-publication student writes and permits teacher reasons only", async () => {
    const a = await start();
    const added = await addScanPhoto(
      world.student,
      a.id,
      { revision: 0, imageDataUrl: await photo() },
      deps(),
    );
    const slot = world.snapshot.pages[0].slots[0];
    const readId = randomUUID();
    await local.db.query(
      `INSERT INTO concept_blank_scan_read (id,submission_id,photo_id,slot_id,status,text,prompt_version,requested_model) VALUES($1,$2,$3,$4,'unreadable','','test','fake')`,
      [readId, a.id, added.photoId, slot.id],
    );
    await local.db.query(
      `UPDATE concept_blank_scan_submission SET state='checking' WHERE id=$1`,
      [a.id],
    );
    let view = await getScanSubmission(world.student, a.id, local.db);
    const revision = view.revision;
    const input = {
      revision,
      slotId: slot.id,
      readId,
      resolution: "text" as const,
      text: "내가 쓴 글",
    };
    await correctScanAnswer(world.student, a.id, input, local.db);
    await expect(
      correctScanAnswer(world.student, a.id, input, local.db),
    ).rejects.toThrow(/최신/);
    view = await getScanSubmission(world.student, a.id, local.db);
    expect(view.corrections[0].directlyEntered).toBe(true);
    expect(view.readings[0].text).toBe("");
    await correctScanAnswer(
      world.student,
      a.id,
      { ...input, revision: view.revision, resolution: "review", text: "" },
      local.db,
    );
    await local.db.query(
      `INSERT INTO concept_blank_scan_grade (id,submission_id,target_id,sequence,label,reason,directly_entered,evidence,origin) VALUES($1,$2,$3,1,'review','읽은 답 확인',true,$4::jsonb,'rule')`,
      [
        randomUUID(),
        a.id,
        world.snapshot.pages[0].targets[0].id,
        JSON.stringify({ readIds: [readId], correctionIds: [] }),
      ],
    );
    await local.db.query(
      `UPDATE concept_blank_scan_submission SET state='graded',graded_at=CURRENT_TIMESTAMP WHERE id=$1`,
      [a.id],
    );
    view = await getScanSubmission(world.student, a.id, local.db);
    await expect(
      correctScanAnswer(
        world.student,
        a.id,
        { ...input, revision: view.revision },
        local.db,
      ),
    ).rejects.toThrow(/공개/);
    const target = world.snapshot.pages[0].targets[0];
    const override = {
      revision: view.revision,
      targetId: target.id,
      label: "partial" as const,
      reason: "필수 뜻 중 일부를 더 써야 합니다.",
    };
    await expect(
      overrideScanGrade(world.student, a.id, override, local.db),
    ).rejects.toThrow(/교사/);
    await expect(
      overrideScanGrade(
        world.teacher,
        a.id,
        { ...override, reason: " " },
        local.db,
      ),
    ).rejects.toThrow();
    await overrideScanGrade(world.teacher, a.id, override, local.db);
    view = await getScanSubmission(world.student, a.id, local.db);
    expect(view.state).toBe("teacher-corrected");
    expect(view.grades.at(-1)?.origin).toBe("teacher");
    expect(view.grades.at(-1)?.reason).toBe(override.reason);
    await expect(
      overrideScanGrade(world.teacher, a.id, override, local.db),
    ).rejects.toThrow(/최신/);
  });
});
