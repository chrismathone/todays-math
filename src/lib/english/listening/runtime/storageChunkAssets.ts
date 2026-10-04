/** Metadata-only immutable chunk assets for bounded private object storage. */
import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type {
  ListeningStorageApi,
  ListeningStorageRef,
} from "../media/storageApi";
import type { ListeningMediaRecord } from "../media/store";
import type { ListeningM4aConversion } from "../media/trustedM4a";
import { assertListeningStorageQuota } from "../media/storageQuota";
import { invalid, json, type ListeningTx } from "./database";
const chunkBytes = 1024 * 1024;
const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
export async function storageChunkReferences(
  tx: ListeningTx,
  record: ListeningMediaRecord,
  storage: ListeningStorageApi,
) {
  if (
    !record.storageChunks ||
    record.storage ||
    record.drive ||
    !record.playback
  )
    throw invalid("원본 음원 저장 정보를 확인해 주세요.");
  const references = [...record.chunks, ...record.playback.chunks],
    keys = [...new Set(references.map((ref) => ref.key))];
  if (!keys.length) throw invalid("원본 음원 조각이 없습니다.");
  const rows = await tx.$queryRaw<
    {
      key: string;
      byteLength: number;
      sha256: string;
      ref: ListeningStorageRef;
    }[]
  >(
    Prisma.sql`SELECT key,"byteLength",sha256,ref FROM english_listening_media_storage_blob WHERE "assetId"=${record.assetId}::uuid AND key IN(${Prisma.join(keys.map((key) => Prisma.sql`${key}::uuid`))}) AND committed=true AND deleting=false AND ref IS NOT NULL`,
  );
  if (
    rows.length !== keys.length ||
    rows.some(
      (row) =>
        row.ref.ownerId !== record.ownerId ||
        row.ref.bytes !== row.byteLength ||
        row.ref.sha256 !== row.sha256 ||
        row.ref.start !== 0 ||
        row.ref.endExclusive !== row.byteLength,
    ) ||
    references.some((ref) => {
      const row = rows.find((row) => row.key === ref.key),
        offset = ref.blobOffset ?? 0;
      return (
        !row ||
        !Number.isSafeInteger(offset) ||
        offset < 0 ||
        !Number.isSafeInteger(ref.byteLength) ||
        ref.byteLength < 1 ||
        ref.byteLength > chunkBytes ||
        offset + ref.byteLength > row.byteLength
      );
    })
  )
    throw invalid("원본 음원 조각을 확인하지 못했습니다.");
  for (const row of rows) await storage.check(row.ref);
  return new Map(rows.map((row) => [row.key, row.ref]));
}
export async function cloneStorageChunkAsset(
  tx: ListeningTx,
  original: ListeningMediaRecord,
  target: { id: string; ownerId: string; branchId: string | null },
  storage: ListeningStorageApi,
) {
  if (original.ownerId !== target.ownerId)
    throw invalid("원본 음원 소유 범위를 확인해 주세요.");
  const refs = await storageChunkReferences(tx, original, storage);
  await assertListeningStorageQuota(tx, target.ownerId, { assetCount: 1 });
  const assetId = randomUUID(),
    mapping = new Map([...refs.keys()].map((key) => [key, randomUUID()]));
  const chunks = (items: ListeningMediaRecord["chunks"]) =>
    items.map((item) => ({ ...item, key: mapping.get(item.key)! }));
  const record: ListeningMediaRecord = {
    ...original,
    assetId,
    setId: target.id,
    ownerId: target.ownerId,
    branchId: target.branchId,
    chunks: chunks(original.chunks),
    playback: {
      ...original.playback!,
      chunks: chunks(original.playback!.chunks),
    },
    completion: {
      ...original.completion!,
      assetId,
      setId: target.id,
      ownerId: target.ownerId,
      branchId: target.branchId,
    },
  };
  await tx.$executeRaw(
    Prisma.sql`INSERT INTO english_listening_media_asset("assetId","ownerId","branchId","setId",revision,state,"uploadExpiresAt","reservedBytes",record) VALUES(${assetId}::uuid,${target.ownerId}::uuid,${target.branchId}::uuid,${target.id}::uuid,${record.revision},'ready',${new Date(record.uploadExpiresAt)},0,${json(record)})`,
  );
  const pairs = [...mapping].map(
    ([oldKey, newKey]) => Prisma.sql`(${oldKey}::uuid,${newKey}::uuid)`,
  );
  const copied = await tx.$executeRaw(
    Prisma.sql`INSERT INTO english_listening_media_storage_blob(key,"assetId","byteLength",sha256,ref,committed,deleting) SELECT m.new_key,${assetId}::uuid,b."byteLength",b.sha256,b.ref,true,false FROM english_listening_media_storage_blob b JOIN(VALUES ${Prisma.join(pairs)}) AS m(old_key,new_key) ON b.key=m.old_key WHERE b."assetId"=${original.assetId}::uuid AND b.committed=true AND b.deleting=false AND b.ref IS NOT NULL`,
  );
  if (copied !== mapping.size)
    throw invalid("음원 참조 복사를 완료하지 못했습니다.");
  return record;
}
/** Caller owns a transaction and tracks created objects until SQL commits. */
export async function writeStorageChunkAsset(
  tx: ListeningTx,
  storage: ListeningStorageApi,
  input: {
    assetId?: string;
    setId: string;
    ownerId: string;
    branchId: string | null;
    mimeType: "audio/wav" | "audio/mpeg";
    totalBytes: number;
    durationMs: number;
    now: number;
    read: () => AsyncIterable<Uint8Array>;
    playbackSpan?: { start: number; endExclusive: number };
    expectedSha256?: string;
    /** Trusted native conversion preserves source bytes under this same asset. */
    originalSource?: {
      mimeType: "audio/mp4";
      totalBytes: number;
      expectedSha256: string;
      read: () => AsyncIterable<Uint8Array>;
      conversion: ListeningM4aConversion;
    };
  },
  created: ListeningStorageRef[],
) {
  if (
    !Number.isSafeInteger(input.totalBytes) ||
    input.totalBytes < 1 ||
    input.totalBytes > 336 * chunkBytes
  )
    throw invalid("음원 크기를 확인해 주세요.");
  if (
    input.originalSource &&
    (input.mimeType !== "audio/mpeg" ||
      !Number.isSafeInteger(input.originalSource.totalBytes) ||
      input.originalSource.totalBytes < 1 ||
      input.originalSource.totalBytes > 64 * chunkBytes ||
      input.originalSource.expectedSha256 !==
        input.originalSource.conversion.sourceSha256)
  )
    throw invalid("원본 M4A 크기와 검증 정보를 확인해 주세요.");
  const span = input.playbackSpan ?? {
    start: 0,
    endExclusive: input.totalBytes,
  };
  if (
    !Number.isSafeInteger(span.start) ||
    !Number.isSafeInteger(span.endExclusive) ||
    span.start < 0 ||
    span.start >= span.endExclusive ||
    span.endExclusive > input.totalBytes
  )
    throw invalid("음원 재생 범위를 확인해 주세요.");
  await assertListeningStorageQuota(tx, input.ownerId, {
    reserveBytes: input.totalBytes + (input.originalSource?.totalBytes ?? 0),
    assetCount: 1,
  });
  const assetId = input.assetId ?? randomUUID();
  const staged: ListeningMediaRecord = {
    assetId,
    setId: input.setId,
    ownerId: input.ownerId,
    branchId: input.branchId,
    storageChunks: true,
    revision: 0,
    state: "uploading",
    totalBytes: input.originalSource?.totalBytes ?? input.totalBytes,
    receivedBytes: 0,
    mimeType: input.mimeType,
    expectedSha256:
      input.originalSource?.expectedSha256 ??
      input.expectedSha256 ??
      "0".repeat(64),
    chunkBytes,
    uploadExpiresAt: input.now,
    chunks: [],
    ...(input.originalSource
      ? {
          originalMimeType: input.originalSource.mimeType,
          conversion: input.originalSource.conversion,
        }
      : {}),
  };
  await tx.$executeRaw(
    Prisma.sql`INSERT INTO english_listening_media_asset("assetId","ownerId","branchId","setId",revision,state,"uploadExpiresAt","reservedBytes",record) VALUES(${assetId}::uuid,${input.ownerId}::uuid,${input.branchId}::uuid,${input.setId}::uuid,0,'uploading',${new Date(input.now)},${input.totalBytes + (input.originalSource?.totalBytes ?? 0)},${json(staged)})`,
  );
  const chunks: ListeningMediaRecord["chunks"] = [],
    playbackChunks: ListeningMediaRecord["chunks"] = [],
    originalHash = createHash("sha256"),
    playbackHash = createHash("sha256");
  let offset = 0,
    pending = Buffer.alloc(0);
  const write = async (bytes: Buffer, sourceOnly = false) => {
    const key = randomUUID(),
      sha256 = digest(bytes);
    await tx.$executeRaw(
      Prisma.sql`INSERT INTO english_listening_media_storage_blob(key,"assetId","byteLength",sha256,committed,deleting) VALUES(${key}::uuid,${assetId}::uuid,${bytes.length},${sha256},false,false)`,
    );
    const cleanupIndex = created.length;
    created.push({
      bucket: storage.config.bucket,
      key: `${input.ownerId}/${assetId}/${key}`,
      ownerId: input.ownerId,
      etag: '""',
      bytes: bytes.length,
      sha256,
      start: 0,
      endExclusive: bytes.length,
    });
    const ref = await storage.uploadChunk({
      ownerId: input.ownerId,
      assetId,
      key,
      bytes,
      mimeType: sourceOnly ? "audio/mp4" : input.mimeType,
    });
    created[cleanupIndex] = ref;
    if (ref.sha256 !== sha256 || ref.bytes !== bytes.length)
      throw invalid("저장된 음원 해시를 확인하지 못했습니다.");
    await tx.$executeRaw(
      Prisma.sql`UPDATE english_listening_media_storage_blob SET ref=${json(ref)},committed=true WHERE key=${key}::uuid AND "assetId"=${assetId}::uuid AND ref IS NULL AND deleting=false`,
    );
    const chunk = {
      key,
      offset,
      byteLength: bytes.length,
      sha256,
      expectedRevision:
        input.originalSource && !sourceOnly
          ? playbackChunks.length
          : chunks.length,
    };
    if (sourceOnly || !input.originalSource) {
      chunks.push(chunk);
      originalHash.update(bytes);
    }
    const start = Math.max(offset, span.start),
      end = Math.min(offset + bytes.length, span.endExclusive);
    if (!sourceOnly && start < end) {
      const piece = bytes.subarray(start - offset, end - offset);
      playbackHash.update(piece);
      playbackChunks.push({
        ...chunk,
        offset: start - span.start,
        byteLength: piece.length,
        blobOffset: start - offset,
        sha256: digest(piece),
      });
    }
    offset += bytes.length;
  };
  for await (const bytes of input.read()) {
    if (
      bytes.length > chunkBytes ||
      offset + pending.length + bytes.length > input.totalBytes
    )
      throw invalid("음원 길이가 일치하지 않습니다.");
    pending = Buffer.concat([pending, bytes]);
    while (pending.length >= chunkBytes) {
      await write(pending.subarray(0, chunkBytes));
      pending = pending.subarray(chunkBytes);
    }
  }
  if (pending.length) await write(pending);
  if (offset !== input.totalBytes)
    throw invalid("음원 길이가 일치하지 않습니다.");
  if (input.originalSource) {
    offset = 0;
    pending = Buffer.alloc(0);
    for await (const bytes of input.originalSource.read()) {
      if (
        bytes.length > chunkBytes ||
        offset + pending.length + bytes.length > input.originalSource.totalBytes
      )
        throw invalid("원본 M4A 길이가 일치하지 않습니다.");
      pending = Buffer.concat([pending, bytes]);
      while (pending.length >= chunkBytes) {
        await write(pending.subarray(0, chunkBytes), true);
        pending = pending.subarray(chunkBytes);
      }
    }
    if (pending.length) await write(pending, true);
    if (offset !== input.originalSource.totalBytes)
      throw invalid("원본 M4A 길이가 일치하지 않습니다.");
  }
  const originalSha256 = originalHash.digest("hex"),
    sha256 = playbackHash.digest("hex");
  if (
    (input.originalSource?.expectedSha256 ?? input.expectedSha256) &&
    originalSha256 !==
      (input.originalSource?.expectedSha256 ?? input.expectedSha256)
  )
    throw invalid("원본 음원 해시가 일치하지 않습니다.");
  const record: ListeningMediaRecord = {
    ...staged,
    revision: 1,
    state: "ready",
    receivedBytes: staged.totalBytes,
    expectedSha256: originalSha256,
    chunks,
    playback: {
      revision: 1,
      mimeType: input.mimeType,
      sha256,
      totalBytes: span.endExclusive - span.start,
      chunks: playbackChunks,
    },
    completion: {
      assetId,
      setId: input.setId,
      ownerId: input.ownerId,
      branchId: input.branchId,
      revision: 1,
      state: "ready",
      publishable: true,
      totalBytes: staged.totalBytes,
      receivedBytes: staged.totalBytes,
      chunkBytes,
      uploadExpiresAt: input.now,
      verifiedAt: input.now,
      mimeType: input.mimeType,
      sha256,
      originalSha256,
      durationMs: input.durationMs,
      playbackBytes: span.endExclusive - span.start,
      playbackRevision: 1,
    },
  };
  await tx.$executeRaw(
    Prisma.sql`UPDATE english_listening_media_asset SET revision=1,state='ready',"reservedBytes"=0,record=${json(record)} WHERE "assetId"=${assetId}::uuid AND revision=0 AND state='uploading'`,
  );
  return record;
}
