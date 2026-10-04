/** Trusted Node importer only. There is deliberately no public registration route. */
import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { ListeningDriveApi, ListeningDriveRef } from "../media/driveApi";
import type { ListeningMediaRecord } from "../media/store";
import {
  decodeMp3,
  parseMp3,
  MAX_DURATION_MS,
  MAX_PLAYBACK_BYTES,
  MAX_ORIGINAL_BYTES,
} from "../media/mp3";
import {
  denied,
  expected,
  invalid,
  json,
  lock,
  one,
  ownedSet,
  teacher,
  type ListeningActor,
  type ListeningDatabase,
  type ListeningTx,
} from "./database";

// External storage has its own budget. PostgreSQL's legacy byte quota stays unchanged.
export const LISTENING_DRIVE_OWNER_BYTES = 8 * 1024 ** 3;
export const LISTENING_DRIVE_OWNER_ASSETS = 512;
export async function assertDriveQuota(
  tx: ListeningTx,
  ownerId: string,
  ref: ListeningDriveRef,
) {
  const rows = await tx.$queryRaw<{ drive: ListeningDriveRef }[]>(
    Prisma.sql`SELECT record->'drive' AS drive FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid AND record->'drive' IS NOT NULL`,
  );
  const files = new Map(
    rows.map(({ drive }) => [
      `${drive.fileId}:${drive.revisionId}`,
      drive.bytes,
    ]),
  );
  files.set(`${ref.fileId}:${ref.revisionId}`, ref.bytes);
  if (
    rows.length >= LISTENING_DRIVE_OWNER_ASSETS ||
    [...files.values()].reduce((a, b) => a + b, 0) > LISTENING_DRIVE_OWNER_BYTES
  )
    throw invalid("Drive 듣기 자료 보관 한도를 초과했습니다.");
}
export function driveReadyRecord(input: {
  assetId: string;
  setId: string;
  ownerId: string;
  branchId: string | null;
  drive: ListeningDriveRef;
  mimeType: "audio/mpeg" | "audio/wav";
  sha256: string;
  durationMs: number;
  now: number;
}): ListeningMediaRecord {
  const totalBytes = input.drive.bytes,
    playbackBytes = input.drive.endExclusive - input.drive.start;
  return {
    assetId: input.assetId,
    setId: input.setId,
    ownerId: input.ownerId,
    branchId: input.branchId,
    revision: 1,
    state: "ready",
    totalBytes,
    receivedBytes: totalBytes,
    mimeType: input.mimeType,
    expectedSha256: input.drive.originalSha256,
    chunkBytes: 1024 * 1024,
    uploadExpiresAt: input.now,
    chunks: [],
    drive: input.drive,
    playback: {
      revision: 1,
      mimeType: input.mimeType,
      sha256: input.sha256,
      totalBytes: playbackBytes,
      chunks: [],
    },
    completion: {
      assetId: input.assetId,
      setId: input.setId,
      ownerId: input.ownerId,
      branchId: input.branchId,
      revision: 1,
      state: "ready",
      publishable: true,
      totalBytes,
      receivedBytes: totalBytes,
      chunkBytes: 1024 * 1024,
      uploadExpiresAt: input.now,
      verifiedAt: input.now,
      mimeType: input.mimeType,
      sha256: input.sha256,
      originalSha256: input.drive.originalSha256,
      durationMs: input.durationMs,
      playbackBytes,
      playbackRevision: 1,
    },
  };
}
export async function insertDriveAsset(
  tx: ListeningTx,
  record: ListeningMediaRecord,
) {
  if (!record.drive) throw invalid("Drive 음원이 없습니다.");
  await assertDriveQuota(tx, record.ownerId, record.drive);
  // No bytea rows and no PostgreSQL binary reservation. Drive physical files are
  // counted once above, while each set still has its own immutable asset identity.
  await tx.$executeRaw(
    Prisma.sql`INSERT INTO english_listening_media_asset("assetId","ownerId","branchId","setId",revision,state,"uploadExpiresAt","reservedBytes",record) VALUES(${record.assetId}::uuid,${record.ownerId}::uuid,${record.branchId}::uuid,${record.setId}::uuid,1,'ready',${new Date(record.uploadExpiresAt)},0,${json(record)})`,
  );
}
export async function validateListeningDriveMp3(bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_ORIGINAL_BYTES)
    throw invalid("MP3 파일 크기를 확인해 주세요.");
  const parsed = parseMp3(bytes, MAX_DURATION_MS);
  const decoded = await decodeMp3(
    bytes,
    { maxDurationMs: MAX_DURATION_MS, maxPlaybackBytes: MAX_PLAYBACK_BYTES },
    async () => {},
  );
  return {
    bytes: bytes.length,
    originalSha256: createHash("sha256").update(bytes).digest("hex"),
    md5Checksum: createHash("md5").update(bytes).digest("hex"),
    start: parsed.audioStart,
    endExclusive: parsed.audioEnd,
    sha256: createHash("sha256")
      .update(bytes.subarray(parsed.audioStart, parsed.audioEnd))
      .digest("hex"),
    durationMs: decoded.durationMs,
  };
}
export async function registerDriveListeningAsset(
  database: ListeningDatabase,
  drive: ListeningDriveApi,
  input: {
    actor: ListeningActor;
    setId: string;
    expectedSetRevision: number;
    fileId: string;
    bytes: Buffer;
    assetId?: string;
  },
  clock: () => Date = () => new Date(),
) {
  const setId = z.uuid().parse(input.setId),
    assetId = z.uuid().parse(input.assetId ?? randomUUID());
  const authorized = async (tx: ListeningTx) => {
    await lock(tx, setId);
    const account = await teacher(tx, input.actor),
      set = await ownedSet(tx, account, setId);
    expected(set.revision, input.expectedSetRevision);
    if (
      account.id !== drive.config.ownerId ||
      set.owner_id !== drive.config.ownerId ||
      !set.document.rightsReview ||
      set.document.rights.rightsStatus !== "approved" ||
      !set.document.rights.allowedUses.includes("store_original")
    )
      throw denied();
    return set;
  };
  // Fail before codec work or any OAuth/Drive call for unauthorized actors.
  await database.$transaction(authorized);
  const validated = await validateListeningDriveMp3(input.bytes);
  const ref = await drive.pin({ fileId: input.fileId, ...validated });
  return database.$transaction(
    async (tx) => {
      const set = await authorized(tx);
      await tx.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`listening-media:${set.owner_id}`},0))`,
      );
      const previous = await one<{ record: ListeningMediaRecord }>(
        tx,
        Prisma.sql`SELECT record FROM english_listening_media_asset WHERE "assetId"=${assetId}::uuid`,
      );
      if (previous) {
        const r = previous.record;
        if (
          r.setId !== setId ||
          r.ownerId !== set.owner_id ||
          r.branchId !== set.branch_id ||
          r.state !== "ready" ||
          r.drive?.fileId !== ref.fileId ||
          r.drive?.revisionId !== ref.revisionId ||
          r.expectedSha256 !== validated.originalSha256 ||
          r.playback?.sha256 !== validated.sha256
        )
          throw denied();
        return r.completion!;
      }
      const record = driveReadyRecord({
        assetId,
        setId,
        ownerId: set.owner_id,
        branchId: set.branch_id,
        drive: ref,
        mimeType: "audio/mpeg",
        sha256: validated.sha256,
        durationMs: validated.durationMs,
        now: clock().getTime(),
      });
      await insertDriveAsset(tx, record);
      return record.completion!;
    },
    { maxWait: 10000, timeout: 30000 },
  );
}
