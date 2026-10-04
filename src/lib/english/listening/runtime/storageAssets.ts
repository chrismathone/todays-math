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
import {
  verifyListeningM4aPlayback,
  type VerifiedListeningM4aPlayback,
} from "../media/trustedM4a";
import { validateListeningDriveMp3 } from "./driveAssets";
import { assertListeningStorageQuota } from "../media/storageQuota";
import {
  storageChunkReferences,
  writeStorageChunkAsset,
} from "./storageChunkAssets";
export {
  LISTENING_STORAGE_OWNER_BYTES,
  LISTENING_STORAGE_OWNER_ASSETS,
} from "../media/storageQuota";
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
export async function assertStorageQuota(
  tx: ListeningTx,
  ownerId: string,
  ref: ListeningStorageRef,
) {
  try {
    await assertListeningStorageQuota(tx, ownerId, { ref });
  } catch {
    throw invalid("듣기 자료 보관 한도를 초과했습니다.");
  }
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
    /** In-process capability from the trusted CLI native strict conversion helper. */
    playbackDerivative?: VerifiedListeningM4aPlayback;
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
  const conversion = input.playbackDerivative
    ? verifyListeningM4aPlayback(input.bytes, input.playbackDerivative)
    : undefined;
  const playbackBytes = input.playbackDerivative?.bytes ?? input.bytes;
  const validated = await validateListeningDriveMp3(playbackBytes);
  if (
    conversion &&
    conversion.derivedOriginalSha256 !== validated.originalSha256
  )
    throw invalid("파생 음원 검증 후 원본이 변경되었습니다.");
  const originalSha256 = conversion?.sourceSha256 ?? validated.originalSha256;
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
      (!r.storage && !r.storageChunks) ||
      r.expectedSha256 !== originalSha256 ||
      r.playback?.sha256 !== validated.sha256 ||
      r.conversion?.derivedOriginalSha256 !== conversion?.derivedOriginalSha256
    )
      throw denied();
    if (r.storage) await storage.check(r.storage);
    else
      await database.$transaction(
        (tx) => storageChunkReferences(tx, r, storage),
        // Reusing a verified derivative can require dozens of private object HEADs.
        { maxWait: 10000, timeout: 60000 },
      );
    return r.completion!;
  }
  if (conversion || input.bytes.length > 32 * 1024 * 1024) {
    const encoded = conversion
      ? playbackBytes.subarray(validated.start, validated.endExclusive)
      : input.bytes;
    const created: ListeningStorageRef[] = [];
    try {
      return await database.$transaction(
        async (tx) => {
          const set = await authorized(tx);
          await tx.$executeRaw(
            Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`listening-media:${set.owner_id}`},0))`,
          );
          const record = await writeStorageChunkAsset(
            tx,
            storage,
            {
              assetId,
              setId,
              ownerId: set.owner_id,
              branchId: set.branch_id,
              mimeType: "audio/mpeg",
              totalBytes: encoded.length,
              durationMs: validated.durationMs,
              now: clock().getTime(),
              playbackSpan: conversion
                ? undefined
                : {
                    start: validated.start,
                    endExclusive: validated.endExclusive,
                  },
              expectedSha256: validated.originalSha256,
              read: async function* () {
                for (let i = 0; i < encoded.length; i += 1024 * 1024)
                  yield encoded.subarray(i, i + 1024 * 1024);
              },
              originalSource: conversion
                ? {
                    mimeType: "audio/mp4",
                    totalBytes: input.bytes.length,
                    expectedSha256: originalSha256,
                    conversion,
                    read: async function* () {
                      for (let i = 0; i < input.bytes.length; i += 1024 * 1024)
                        yield input.bytes.subarray(i, i + 1024 * 1024);
                    },
                  }
                : undefined,
            },
            created,
          );
          if (record.playback!.sha256 !== validated.sha256)
            throw invalid("음원 재생 해시가 일치하지 않습니다.");
          return record.completion!;
        },
        { maxWait: 10000, timeout: 600000 },
      );
    } catch (error) {
      await Promise.allSettled(created.map((ref) => storage.remove(ref)));
      throw error;
    }
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
