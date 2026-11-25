// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { openScanTestDb } from "../helpers/conceptBlankScanDb";
import { scanWorld } from "../helpers/conceptBlankScanFixture";
import {
  addScanPhoto,
  beginScanSubmission,
  getScanSubmission,
} from "@/lib/concept-blank/scan/submission";
import {
  signScanPhoto,
  deleteScanPhoto,
  purgeScanPhotos,
} from "@/lib/concept-blank/scan/retention";
import type { ScanPhotoStorage } from "@/lib/concept-blank/scan/storage.server";
let local: Awaited<ReturnType<typeof openScanTestDb>>,
  world: Awaited<ReturnType<typeof scanWorld>>;
const origin = "https://today.example.test";
const storage: ScanPhotoStorage = {
  bucket: "test-private",
  upload: async () => {},
  read: async () => Buffer.from(""),
  signedUrl: vi.fn(async () => "https://example.test/signed"),
  remove: vi.fn(async () => {}),
};
beforeAll(async () => {
  local = await openScanTestDb();
  world = await scanWorld(local);
}, 60_000);
afterAll(async () => {
  await local?.pg.close();
});
async function photo() {
  const { id } = await beginScanSubmission(
    world.student,
    { printedSheetId: world.issued.id, requestId: randomUUID() },
    local.db,
  );
  const added = await addScanPhoto(
    world.student,
    id,
    {
      revision: 0,
      imageDataUrl: await QRCode.toDataURL(
        `${origin}/concept-blank/scan?p=${world.issued.id}&page=1&part=student`,
        { width: 700, margin: 4 },
      ),
    },
    { db: local.db, storage, origin },
  );
  return { id, photoId: added.photoId };
}
describe("private photo retention and deletion", () => {
  it("checks both ownership and parent identity, bounds signed URLs by remaining lifetime and denies expired photos", async () => {
    const a = await photo(),
      b = await photo();
    await expect(
      signScanPhoto({ kind: "teacher", id: world.userB }, a.id, a.photoId, {
        db: local.db,
        storage,
      }),
    ).rejects.toThrow(/권한/);
    await expect(
      signScanPhoto(world.student, a.id, b.photoId, { db: local.db, storage }),
    ).rejects.toThrow(/사진/);
    const now = new Date();
    await local.db.query(
      `UPDATE concept_blank_scan_photo SET expires_at=$2::timestamptz WHERE id=$1::uuid`,
      [a.photoId, new Date(now.getTime() + 20_000).toISOString()],
    );
    expect(
      await signScanPhoto(world.student, a.id, a.photoId, {
        db: local.db,
        storage,
        now: () => now,
      }),
    ).toEqual({ url: "https://example.test/signed" });
    expect(storage.signedUrl).toHaveBeenLastCalledWith(expect.any(String), 20);
    await expect(
      signScanPhoto(world.student, a.id, a.photoId, {
        db: local.db,
        storage,
        now: () => new Date(now.getTime() + 21_000),
      }),
    ).rejects.toThrow(/만료/);
  });
  it("teacher deletion immediately closes access; failure remains retryable and only successful Storage deletion marks deleted", async () => {
    const a = await photo();
    const view = await getScanSubmission(world.student, a.id, local.db);
    await expect(
      deleteScanPhoto(world.student, a.id, a.photoId, view.revision, {
        db: local.db,
        storage,
      }),
    ).rejects.toThrow(/교사/);
    const failing = {
      ...storage,
      remove: vi.fn(async () => {
        throw Error("private provider detail");
      }),
    };
    const result = await deleteScanPhoto(
      world.teacher,
      a.id,
      a.photoId,
      view.revision,
      { db: local.db, storage: failing },
    );
    expect(result.deleted).toBe(false);
    const [row] = await local.db.query<{
      deleted_at: Date | null;
      delete_requested_at: Date | null;
      delete_attempts: number;
      delete_error: string;
    }>(`SELECT * FROM concept_blank_scan_photo WHERE id=$1::uuid`, [a.photoId]);
    expect(row.deleted_at).toBeNull();
    expect(row.delete_requested_at).not.toBeNull();
    expect(row.delete_attempts).toBe(1);
    expect(row.delete_error).not.toContain("provider");
    await expect(
      signScanPhoto(world.student, a.id, a.photoId, { db: local.db, storage }),
    ).rejects.toThrow(/만료|삭제/);
    const purged = await purgeScanPhotos({ db: local.db, storage });
    expect(purged.deleted).toBeGreaterThan(0);
    expect(
      (
        await local.db.query<{ deleted_at: Date | null }>(
          `SELECT deleted_at FROM concept_blank_scan_photo WHERE id=$1::uuid`,
          [a.photoId],
        )
      )[0].deleted_at,
    ).not.toBeNull();
  });
  it("purges expired unused photos, preserves unexpired grading evidence and does not delete during an active job", async () => {
    const expired = await photo(),
      kept = await photo(),
      busy = await photo();
    for (const item of [expired, busy])
      await local.db.query(
        `UPDATE concept_blank_scan_photo SET created_at=CURRENT_TIMESTAMP-interval '8 days',expires_at=CURRENT_TIMESTAMP-interval '1 day' WHERE id=$1::uuid`,
        [item.photoId],
      );
    await local.db.query(
      `UPDATE concept_blank_scan_photo SET used_at=CURRENT_TIMESTAMP,expires_at=created_at+interval '30 days' WHERE id=$1::uuid`,
      [kept.photoId],
    );
    await local.db.query(
      `UPDATE concept_blank_scan_submission SET state='read',job_id=$2::uuid,job_kind='read',job_started_at=CURRENT_TIMESTAMP WHERE id=$1::uuid`,
      [busy.id, randomUUID()],
    );
    await purgeScanPhotos({ db: local.db, storage });
    const rows = await local.db.query<{ id: string; deleted_at: Date | null }>(
      `SELECT id,deleted_at FROM concept_blank_scan_photo WHERE id=ANY($1::uuid[])`,
      [[expired.photoId, kept.photoId, busy.photoId]],
    );
    expect(
      rows.find((r) => r.id === expired.photoId)?.deleted_at,
    ).not.toBeNull();
    expect(rows.find((r) => r.id === kept.photoId)?.deleted_at).toBeNull();
    expect(rows.find((r) => r.id === busy.photoId)?.deleted_at).toBeNull();
  });
});
