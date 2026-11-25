import "server-only";
import { z } from "zod";
import { scanRevisionSchema } from "@/contracts/conceptBlankScanApi.contract";
import { scanDatabaseError, type ScanDatabase, type ScanSql } from "./database";
import { ScanAccessError, type ScanIdentity } from "./issuance";
import { SCAN_JOB_RECLAIM_MS } from "./jobs";
import {
  assertScanRevision,
  loadScanSubmission,
  scanPhotoAvailable,
  type ScanPhotoRow,
  type ScanSubmissionRow,
} from "./submission";
import type { ScanPhotoStorage } from "./storage.server";

type Deps = { db: ScanDatabase; storage: ScanPhotoStorage; now?: () => Date };
async function loadPhoto(sql: ScanSql, submissionId: string, photoId: string) {
  const [photo] = await sql
    .query<ScanPhotoRow>(
      `SELECT * FROM concept_blank_scan_photo WHERE submission_id=$1::uuid AND id=$2::uuid`,
      [submissionId, z.uuid().parse(photoId)],
    )
    .catch(scanDatabaseError);
  if (!photo) throw new ScanAccessError("이 답안의 사진이 아닙니다.", 404);
  return photo;
}

export async function signScanPhoto(
  actor: ScanIdentity,
  submissionId: string,
  photoId: string,
  deps: Deps,
) {
  await loadScanSubmission(actor, submissionId, deps.db);
  const photo = await loadPhoto(deps.db, submissionId, photoId),
    now = deps.now?.() ?? new Date();
  const seconds = Math.min(
    60,
    Math.floor((photo.expires_at.getTime() - now.getTime()) / 1000),
  );
  if (!scanPhotoAvailable(photo, now) || seconds < 1)
    throw new ScanAccessError("사진이 만료되었거나 삭제 요청되었습니다.", 404);
  if (photo.bucket !== deps.storage.bucket)
    throw new ScanAccessError("사진 저장소 설정을 확인해야 합니다.", 503);
  const url = await deps.storage.signedUrl(photo.object_key, seconds);
  // A deletion/revocation during signing must not hand out a newly issued link.
  await loadScanSubmission(actor, submissionId, deps.db);
  if (
    !scanPhotoAvailable(
      await loadPhoto(deps.db, submissionId, photoId),
      deps.now?.() ?? new Date(),
    )
  )
    throw new ScanAccessError("사진이 만료되었거나 삭제 요청되었습니다.", 404);
  return { url };
}

/** Metadata is retained; only the private object is removed. Storage success precedes deleted_at. */
async function removePhoto(photo: ScanPhotoRow, deps: Deps) {
  try {
    if (photo.bucket !== deps.storage.bucket)
      throw new Error("사진 저장소 변경 확인 필요");
    await deps.storage.remove(photo.object_key);
    await deps.db.query(
      `UPDATE concept_blank_scan_photo SET deleted_at=$2::timestamptz,delete_attempts=delete_attempts+1,delete_error=NULL WHERE id=$1::uuid AND deleted_at IS NULL`,
      [photo.id, (deps.now?.() ?? new Date()).toISOString()],
    );
    return true;
  } catch {
    await deps.db
      .query(
        `UPDATE concept_blank_scan_photo SET delete_attempts=delete_attempts+1,delete_error='사진 삭제를 완료하지 못했습니다. 다음 정리에서 다시 시도합니다.' WHERE id=$1::uuid AND deleted_at IS NULL`,
        [photo.id],
      )
      .catch(scanDatabaseError);
    return false;
  }
}

export async function deleteScanPhoto(
  actor: ScanIdentity,
  submissionId: string,
  photoId: string,
  revision: number,
  deps: Deps,
) {
  if (actor.kind !== "teacher")
    throw new ScanAccessError("사진 조기 삭제는 담당 교사가 할 수 있습니다.");
  scanRevisionSchema.parse(revision);
  const photo = await deps.db
    .transaction(async (tx) => {
      const { row } = await loadScanSubmission(actor, submissionId, tx, true);
      assertScanRevision(row, revision);
      if (row.job_id)
        throw new ScanAccessError(
          "답안을 처리하는 동안에는 사진을 지울 수 없습니다.",
          409,
        );
      const photo = await loadPhoto(tx, submissionId, photoId);
      await tx.query(
        `UPDATE concept_blank_scan_photo SET delete_requested_at=COALESCE(delete_requested_at,$2::timestamptz) WHERE id=$1::uuid`,
        [photoId, (deps.now?.() ?? new Date()).toISOString()],
      );
      await tx.query(
        `UPDATE concept_blank_scan_submission SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=$1::uuid`,
        [submissionId],
      );
      return photo;
    })
    .catch(scanDatabaseError);
  return { deleted: !!photo.deleted_at || (await removePhoto(photo, deps)) };
}

/** Cron's bounded batch. Parent locking serializes expiry with a grade's 30-day extension. */
export async function purgeScanPhotos(deps: Deps) {
  const now = deps.now?.() ?? new Date(),
    started = Date.now();
  const candidates = await deps.db
    .query<Pick<ScanPhotoRow, "id" | "submission_id">>(
      `SELECT id,submission_id FROM concept_blank_scan_photo WHERE deleted_at IS NULL AND (delete_requested_at IS NOT NULL OR expires_at<=$1::timestamptz) ORDER BY COALESCE(delete_requested_at,expires_at),id LIMIT 50`,
      [now.toISOString()],
    )
    .catch(scanDatabaseError);
  let deleted = 0,
    failed = 0,
    skipped = 0;
  for (const candidate of candidates) {
    if (Date.now() - started > 120_000) break;
    const photo = await deps.db
      .transaction(async (tx) => {
        const [parent] = await tx.query<ScanSubmissionRow>(
          `SELECT * FROM concept_blank_scan_submission WHERE id=$1::uuid FOR UPDATE`,
          [candidate.submission_id],
        );
        if (
          parent.job_id &&
          parent.job_started_at &&
          now.getTime() - parent.job_started_at.getTime() < SCAN_JOB_RECLAIM_MS
        )
          return null;
        const current = await loadPhoto(
          tx,
          candidate.submission_id,
          candidate.id,
        );
        if (
          current.deleted_at ||
          (!current.delete_requested_at && current.expires_at > now)
        )
          return null;
        await tx.query(
          `UPDATE concept_blank_scan_photo SET delete_requested_at=COALESCE(delete_requested_at,$2::timestamptz) WHERE id=$1::uuid`,
          [current.id, now.toISOString()],
        );
        return current;
      })
      .catch(scanDatabaseError);
    if (!photo) {
      skipped++;
      continue;
    }
    if (await removePhoto(photo, deps)) deleted++;
    else failed++;
  }
  return { deleted, failed, skipped };
}
