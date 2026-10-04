/** Trusted importer: actual full decode, private object storage, metadata-only SQL. */
import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type {
  ListeningStorageApi,
  ListeningStorageRef,
} from "../media/storageApi";
import type { ListeningMediaRecord } from "../media/store";
import { validateListeningDriveMp3 } from "./driveAssets";
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
export const LISTENING_STORAGE_OWNER_BYTES = 8 * 1024 ** 3;
export const LISTENING_STORAGE_OWNER_ASSETS = 512;
export async function assertStorageQuota(
  tx: ListeningTx,
  ownerId: string,
  ref: ListeningStorageRef,
) {
  const rows = await tx.$queryRaw<{ storage: ListeningStorageRef }[]>(
    Prisma.sql`SELECT record->'storage' AS storage FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid AND record->'storage' IS NOT NULL`,
  );
  if (
    rows.some(
      ({ storage }) =>
        !Number.isSafeInteger(storage.bytes) || storage.bytes < 1,
    )
  )
    throw invalid("보관된 음원 정보를 확인해 주세요.");
  const files = new Map(
    rows.map(({ storage }) => [
      `${storage.bucket}:${storage.key}:${storage.etag}`,
      storage.bytes,
    ]),
  );
  files.set(`${ref.bucket}:${ref.key}:${ref.etag}`, ref.bytes);
  if (
    rows.length >= LISTENING_STORAGE_OWNER_ASSETS ||
    [...files.values()].reduce((a, b) => a + b, 0) >
      LISTENING_STORAGE_OWNER_BYTES
  )
    throw invalid("듣기 자료 보관 한도를 초과했습니다.");
}
export function storageReadyRecord(input: {
  assetId: string;
  setId: string;
  ownerId: string;
  branchId: string | null;
  storage: ListeningStorageRef;
  mimeType: "audio/wav" | "audio/mpeg";
  sha256: string;
  durationMs: number;
  now: number;
}): ListeningMediaRecord {
  const totalBytes = input.storage.bytes,
    playbackBytes = input.storage.endExclusive - input.storage.start;
  return {
    assetId: input.assetId,
    setId: input.setId,
    ownerId: input.ownerId,
    branchId: input.branchId,
    storage: input.storage,
    revision: 1,
    state: "ready",
    totalBytes,
    receivedBytes: totalBytes,
    mimeType: input.mimeType,
    expectedSha256: input.storage.sha256,
    chunkBytes: 1024 * 1024,
    uploadExpiresAt: input.now,
    chunks: [],
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
      originalSha256: input.storage.sha256,
      durationMs: input.durationMs,
      playbackBytes,
      playbackRevision: 1,
    },
  };
}
export async function insertStorageAsset(
  tx: ListeningTx,
  record: ListeningMediaRecord,
) {
  if (!record.storage) throw invalid("음원 저장 정보가 없습니다.");
  await assertStorageQuota(tx, record.ownerId, record.storage);
  await tx.$executeRaw(
    Prisma.sql`INSERT INTO english_listening_media_asset("assetId","ownerId","branchId","setId",revision,state,"uploadExpiresAt","reservedBytes",record) VALUES(${record.assetId}::uuid,${record.ownerId}::uuid,${record.branchId}::uuid,${record.setId}::uuid,1,'ready',${new Date(record.uploadExpiresAt)},0,${json(record)})`,
  );
}
export async function registerStorageListeningAsset(
  database: ListeningDatabase,
  storage: ListeningStorageApi,
  input: {
    actor: ListeningActor;
    setId: string;
    expectedSetRevision: number;
    bytes: Buffer;
    assetId?: string;
  },
  clock: () => Date = () => new Date(),
) {
  const setId = z.uuid().parse(input.setId),
    assetId = z.uuid().parse(input.assetId ?? randomUUID());
  const authorized = async (tx: ListeningTx) => {
    await lock(tx, setId);
    const set = await ownedSet(tx, await teacher(tx, input.actor), setId);
    expected(set.revision, input.expectedSetRevision);
    if (
      !set.document.rightsReview ||
      set.document.rights.rightsStatus !== "approved" ||
      !set.document.rights.allowedUses.includes("store_original")
    )
      throw denied();
    return set;
  };
  const source = await database.$transaction(authorized);
  const validated = await validateListeningDriveMp3(input.bytes);
  const previous = await database.$transaction(async (tx) => {
    await authorized(tx);
    return one<{ record: ListeningMediaRecord }>(
      tx,
      Prisma.sql`SELECT record FROM english_listening_media_asset WHERE "assetId"=${assetId}::uuid`,
    );
  });
  if (previous) {
    const r = previous.record;
    if (
      r.setId !== setId ||
      r.ownerId !== source.owner_id ||
      r.branchId !== source.branch_id ||
      r.state !== "ready" ||
      !r.storage ||
      r.expectedSha256 !== validated.originalSha256 ||
      r.playback?.sha256 !== validated.sha256
    )
      throw denied();
    await storage.check(r.storage);
    return r.completion!;
  }
  const ref = await storage.upload({
    ownerId: source.owner_id,
    assetId,
    bytes: input.bytes.length,
    mimeType: "audio/mpeg",
    read: async function* () {
      for (let i = 0; i < input.bytes.length; i += 1024 * 1024)
        yield input.bytes.subarray(i, i + 1024 * 1024);
    },
  });
  try {
    return await database.$transaction(
      async (tx) => {
        const set = await authorized(tx);
        await tx.$executeRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`listening-media:${set.owner_id}`},0))`,
        );
        const record = storageReadyRecord({
          assetId,
          setId,
          ownerId: set.owner_id,
          branchId: set.branch_id,
          storage: {
            ...ref,
            start: validated.start,
            endExclusive: validated.endExclusive,
          },
          mimeType: "audio/mpeg",
          sha256: validated.sha256,
          durationMs: validated.durationMs,
          now: clock().getTime(),
        });
        await insertStorageAsset(tx, record);
        return record.completion!;
      },
      { maxWait: 10000, timeout: 30000 },
    );
  } catch (error) {
    await storage.remove(ref).catch(() => {});
    throw error;
  }
}
