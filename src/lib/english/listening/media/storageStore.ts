/** Durable GUI upload metadata with immutable private Storage chunks and legacy PG reads. */
import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { ListeningMediaError } from "./errors";
import { MAX_ORIGINAL_BYTES, MAX_PLAYBACK_BYTES } from "./mp3";
import { PrismaListeningMediaStore } from "./prismaStore";
import {
  assertListeningStorageQuota,
  LISTENING_STORAGE_OWNER_ASSETS,
  LISTENING_STORAGE_OWNER_BYTES,
} from "./storageQuota";
import type { ListeningStorageApi, ListeningStorageRef } from "./storageApi";
import type {
  ListeningMediaRead,
  ListeningMediaRecord,
  ListeningMediaStore,
} from "./store";
type Sql = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;
type AssetRow = {
  record: ListeningMediaRecord;
  revision: number;
  ownerId: string;
  state: string;
  reservedBytes: number;
};
type BlobRow = {
  key: string;
  assetId: string;
  ownerId: string;
  byteLength: number;
  sha256: string;
  ref: ListeningStorageRef | null;
  committed: boolean;
  deleting: boolean;
  createdAt: Date;
};
const MAX_BLOB_BYTES = 1024 * 1024;
const keysOf = (record: ListeningMediaRecord) => [
  ...new Set(
    [...record.chunks, ...(record.playback?.chunks ?? [])].map((c) => c.key),
  ),
];
function bound(n: number, min: number, max: number) {
  if (!Number.isSafeInteger(n) || n < min || n > max)
    throw new ListeningMediaError("invalid_request");
}
function integrity(): never {
  throw new ListeningMediaError("storage_integrity");
}
export interface PrismaStorageListeningMediaStoreOptions {
  maxOwnerBytes?: number;
  maxOwnerAssets?: number;
  orphanTtlMs?: number;
}
export class PrismaStorageListeningMediaStore implements ListeningMediaStore {
  private readonly legacy: PrismaListeningMediaStore;
  private readonly maxOwnerBytes: number;
  private readonly maxOwnerAssets: number;
  private readonly orphanTtlMs: number;
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: ListeningStorageApi,
    options: PrismaStorageListeningMediaStoreOptions = {},
  ) {
    this.legacy = new PrismaListeningMediaStore(prisma);
    this.maxOwnerBytes = options.maxOwnerBytes ?? LISTENING_STORAGE_OWNER_BYTES;
    this.maxOwnerAssets =
      options.maxOwnerAssets ?? LISTENING_STORAGE_OWNER_ASSETS;
    this.orphanTtlMs = options.orphanTtlMs ?? 60 * 60 * 1000;
    bound(this.maxOwnerBytes, 1, Number.MAX_SAFE_INTEGER);
    bound(this.maxOwnerAssets, 1, 10000);
    bound(this.orphanTtlMs, 60000, 24 * 60 * 60 * 1000);
  }
  private transaction<T>(fn: (tx: Sql) => Promise<T>) {
    return this.prisma.$transaction(fn, { maxWait: 10000, timeout: 30000 });
  }
  private async lockOwner(tx: Sql, ownerId: string) {
    // Storage metadata reserves no PostgreSQL binary capacity. The owner namespace
    // is shared with bulk/compose and always precedes the asset row lock.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`listening-media:${ownerId}`},0))`;
  }
  private async locked(tx: Sql, assetId: string) {
    const rows = await tx.$queryRaw<
      AssetRow[]
    >`SELECT record,revision,"ownerId",state,"reservedBytes" FROM english_listening_media_asset WHERE "assetId"=${assetId}::uuid FOR UPDATE`;
    return rows[0];
  }
  private async used(tx: Sql, assetId: string) {
    const [row] = await tx.$queryRaw<
      { bytes: bigint }[]
    >`SELECT COALESCE(SUM("byteLength"),0)::bigint AS bytes FROM english_listening_media_storage_blob WHERE "assetId"=${assetId}::uuid`;
    return Number(row.bytes);
  }
  async create(input: ListeningMediaRecord) {
    bound(input.totalBytes, 1, MAX_ORIGINAL_BYTES);
    if (
      input.revision !== 0 ||
      input.state !== "uploading" ||
      input.receivedBytes !== 0 ||
      input.chunks.length ||
      input.playback ||
      input.drive ||
      input.storage
    )
      throw new ListeningMediaError("invalid_request");
    const record: ListeningMediaRecord = { ...input, storageChunks: true };
    const reserve =
      record.totalBytes +
      MAX_BLOB_BYTES +
      (record.mimeType === "audio/mpeg" &&
      record.mp3PlaybackEncoding !== "scrubbed_mp3"
        ? MAX_PLAYBACK_BYTES
        : 0);
    return this.transaction(async (tx) => {
      await this.lockOwner(tx, record.ownerId);
      const exists = await this.locked(tx, record.assetId);
      if (exists) return false;
      await assertListeningStorageQuota(tx, record.ownerId, {
        reserveBytes: reserve,
        maxOwnerBytes: this.maxOwnerBytes,
        maxOwnerAssets: this.maxOwnerAssets,
      });
      const inserted =
        await tx.$executeRaw`INSERT INTO english_listening_media_asset("assetId","ownerId","branchId","setId",revision,state,"uploadExpiresAt","reservedBytes",record) VALUES(${record.assetId}::uuid,${record.ownerId}::uuid,${record.branchId}::uuid,${record.setId}::uuid,0,'uploading',${new Date(record.uploadExpiresAt)},${reserve},${JSON.stringify(record)}::jsonb) ON CONFLICT("assetId") DO NOTHING`;
      return inserted === 1;
    });
  }
  async get(assetId: string) {
    return this.legacy.get(assetId);
  }
  async compareAndSwap(
    assetId: string,
    revision: number,
    next: ListeningMediaRecord,
  ) {
    if (next.assetId !== assetId || next.revision !== revision + 1)
      throw new ListeningMediaError("invalid_request");
    if (!(await this.get(assetId))?.storageChunks)
      return this.legacy.compareAndSwap(assetId, revision, next);
    return this.transaction(async (tx) => {
      await this.lockOwner(tx, next.ownerId);
      const row = await this.locked(tx, assetId);
      if (!row || row.revision !== revision) return false;
      const previous = row.record;
      if (
        row.state === "ready" ||
        !next.storageChunks ||
        next.drive ||
        next.storage ||
        [
          "assetId",
          "ownerId",
          "branchId",
          "setId",
          "expectedSha256",
          "totalBytes",
          "mimeType",
          "chunkBytes",
          "uploadExpiresAt",
          "mp3PlaybackEncoding",
        ].some(
          (k) =>
            previous[k as keyof ListeningMediaRecord] !==
            next[k as keyof ListeningMediaRecord],
        )
      )
        integrity();
      if (previous.state !== "uploading" && next.state !== "expired")
        integrity();
      if (
        next.state !== "expired" &&
        JSON.stringify(next.chunks.slice(0, previous.chunks.length)) !==
          JSON.stringify(previous.chunks)
      )
        integrity();
      if (
        next.state === "ready" &&
        (!next.playback ||
          next.completion?.state !== "ready" ||
          next.completion.sha256 !== next.playback.sha256 ||
          next.completion.mimeType !== next.playback.mimeType ||
          next.completion.originalSha256 !== next.expectedSha256 ||
          next.completion.ownerId !== next.ownerId ||
          next.completion.branchId !== next.branchId ||
          next.completion.setId !== next.setId ||
          next.completion.assetId !== assetId ||
          next.completion.revision !== next.revision ||
          next.receivedBytes !== next.totalBytes)
      )
        integrity();
      const refs = [...next.chunks, ...(next.playback?.chunks ?? [])],
        keys = keysOf(next);
      bound(refs.length, 0, 16384);
      let covered = 0;
      if (next.state !== "expired") {
        for (const chunk of next.chunks) {
          if (
            chunk.offset !== covered ||
            !Number.isSafeInteger(chunk.byteLength) ||
            chunk.byteLength <= 0 ||
            chunk.byteLength > next.chunkBytes ||
            chunk.blobOffset !== undefined
          )
            integrity();
          covered += chunk.byteLength;
        }
        if (covered !== next.receivedBytes || covered > next.totalBytes)
          integrity();
      }
      if (next.state !== "expired" && keys.length) {
        const blobs = await tx.$queryRaw<
          BlobRow[]
        >`SELECT key,"assetId","byteLength",sha256,ref,committed,deleting FROM english_listening_media_storage_blob WHERE "assetId"=${assetId}::uuid AND key=ANY(${keys}::uuid[]) FOR UPDATE`;
        if (
          blobs.length !== keys.length ||
          refs.some((ref) => {
            const blob = blobs.find((b) => b.key === ref.key),
              offset = ref.blobOffset ?? 0;
            return (
              !blob ||
              blob.deleting ||
              !blob.ref ||
              blob.ref.ownerId !== next.ownerId ||
              blob.ref.bytes !== blob.byteLength ||
              blob.ref.sha256 !== blob.sha256 ||
              !Number.isSafeInteger(offset) ||
              offset < 0 ||
              !Number.isSafeInteger(ref.byteLength) ||
              ref.byteLength <= 0 ||
              offset + ref.byteLength > blob.byteLength ||
              (ref.blobOffset === undefined &&
                (ref.byteLength !== blob.byteLength ||
                  ref.sha256 !== blob.sha256))
            );
          })
        )
          integrity();
        await tx.$executeRaw`UPDATE english_listening_media_storage_blob SET committed=true WHERE "assetId"=${assetId}::uuid AND key=ANY(${keys}::uuid[])`;
      }
      const reserved = next.state === "uploading" ? row.reservedBytes : 0;
      const changed =
        await tx.$executeRaw`UPDATE english_listening_media_asset SET revision=${next.revision},state=${next.state},record=${JSON.stringify(next)}::jsonb,"reservedBytes"=${reserved} WHERE "assetId"=${assetId}::uuid AND revision=${revision}`;
      return changed === 1;
    });
  }
  async putBlob(
    bytes: Uint8Array,
    scope?: { assetId: string; ownerId: string },
    signal?: AbortSignal,
  ) {
    signal?.throwIfAborted();
    if (!scope) throw new ListeningMediaError("invalid_request");
    if (!(await this.get(scope.assetId))?.storageChunks)
      return this.legacy.putBlob(bytes, scope);
    bound(bytes.byteLength, 1, MAX_BLOB_BYTES);
    const key = randomUUID(),
      sha256 = createHash("sha256").update(bytes).digest("hex");
    const mimeType = await this.transaction(async (tx) => {
      await this.lockOwner(tx, scope.ownerId);
      const row = await this.locked(tx, scope.assetId);
      if (
        !row ||
        row.ownerId !== scope.ownerId ||
        row.state !== "uploading" ||
        !row.record.storageChunks
      )
        throw new ListeningMediaError("conflict");
      if (row.record.uploadExpiresAt <= Date.now())
        throw new ListeningMediaError("expired");
      if (
        (await this.used(tx, scope.assetId)) + bytes.byteLength >
        row.reservedBytes
      )
        throw new ListeningMediaError("quota_exceeded");
      // A preallocated object identity survives crashes or ambiguous Storage replies.
      await tx.$executeRaw`INSERT INTO english_listening_media_storage_blob(key,"assetId","byteLength",sha256) VALUES(${key}::uuid,${scope.assetId}::uuid,${bytes.byteLength},${sha256})`;
      return row.record.mimeType;
    });
    try {
      const ref = await this.storage.uploadChunk({
        ...scope,
        key,
        bytes,
        mimeType,
        signal,
      });
      signal?.throwIfAborted();
      await this.transaction(async (tx) => {
        await this.lockOwner(tx, scope.ownerId);
        const row = await this.locked(tx, scope.assetId);
        if (!row || row.ownerId !== scope.ownerId || row.state !== "uploading")
          throw new ListeningMediaError("conflict");
        if (row.record.uploadExpiresAt <= Date.now())
          throw new ListeningMediaError("expired");
        const changed =
          await tx.$executeRaw`UPDATE english_listening_media_storage_blob SET ref=${JSON.stringify(ref)}::jsonb WHERE key=${key}::uuid AND "assetId"=${scope.assetId}::uuid AND ref IS NULL AND deleting=false`;
        if (changed !== 1) throw new ListeningMediaError("conflict");
      });
      return key;
    } catch (error) {
      // If provider removal fails the durable row remains for the orphan sweeper.
      await this.deleteBlob(key).catch(() => {});
      throw error;
    }
  }
  private async blob(key: string) {
    const [row] = await this.prisma.$queryRaw<
      BlobRow[]
    >`SELECT b.key,b."assetId",a."ownerId",b."byteLength",b.sha256,b.ref,b.committed,b.deleting FROM english_listening_media_storage_blob b JOIN english_listening_media_asset a ON a."assetId"=b."assetId" WHERE b.key=${key}::uuid`;
    return row;
  }
  async *readBlob(
    key: string,
    { start, endExclusive, maxChunkBytes, signal }: ListeningMediaRead,
  ) {
    signal?.throwIfAborted();
    bound(start, 0, MAX_BLOB_BYTES);
    bound(endExclusive, start, MAX_BLOB_BYTES);
    bound(maxChunkBytes, 1, MAX_BLOB_BYTES);
    const blob = await this.blob(key);
    signal?.throwIfAborted();
    if (!blob) {
      yield* this.legacy.readBlob(key, {
        start,
        endExclusive,
        maxChunkBytes,
        signal,
      });
      return;
    }
    if (
      blob.deleting ||
      !blob.ref ||
      blob.ref.ownerId !== blob.ownerId ||
      blob.ref.bytes !== blob.byteLength ||
      blob.ref.sha256 !== blob.sha256 ||
      endExclusive > blob.byteLength
    )
      integrity();
    if (start === endExclusive) return;
    // Staged decoder output is readable internally before CAS; user delivery only
    // reaches sealed asset chunk lists through the service's live authorization.
    // readPrivate checks the live private bucket and conditional GET's ETag, total
    // size and exact range; a separate HEAD adds a redundant serial round trip.
    for await (const part of this.storage.readPrivate(
      blob.ref,
      start,
      endExclusive,
      signal,
    )) {
      for (let offset = 0; offset < part.byteLength; offset += maxChunkBytes) {
        signal?.throwIfAborted();
        yield part.subarray(offset, offset + maxChunkBytes);
      }
    }
  }
  async deleteBlob(key: string, orphanCutoff?: Date) {
    const candidate = await this.blob(key);
    if (!candidate) {
      await this.legacy.deleteBlob(key);
      return;
    }
    const removal = await this.transaction(async (tx) => {
      await this.lockOwner(tx, candidate.ownerId);
      const asset = await this.locked(tx, candidate.assetId);
      if (!asset) return null;
      const [row] = await tx.$queryRaw<
        BlobRow[]
      >`SELECT key,"assetId","byteLength",sha256,ref,committed,deleting,"createdAt" FROM english_listening_media_storage_blob WHERE key=${key}::uuid FOR UPDATE`;
      if (!row) return null;
      if (
        orphanCutoff &&
        !row.deleting &&
        (row.committed ||
          row.createdAt > orphanCutoff ||
          keysOf(asset.record).includes(key))
      )
        return null;
      if (asset.state !== "expired" && keysOf(asset.record).includes(key))
        integrity();
      if (row.ref) {
        const [alias] = await tx.$queryRaw<
          { count: bigint }[]
        >`SELECT COUNT(*)::bigint AS count FROM english_listening_media_storage_blob WHERE key<>${key}::uuid AND ref->>'bucket'=${row.ref.bucket} AND ref->>'key'=${row.ref.key}`;
        if (Number(alias.count) > 0) {
          await tx.$executeRaw`DELETE FROM english_listening_media_storage_blob WHERE key=${key}::uuid`;
          return null;
        }
      }
      await tx.$executeRaw`UPDATE english_listening_media_storage_blob SET deleting=true WHERE key=${key}::uuid`;
      return (
        row.ref ?? {
          bucket: this.storage.config.bucket,
          key: `${candidate.ownerId}/${candidate.assetId}/${key}`,
          ownerId: candidate.ownerId,
        }
      );
    });
    if (!removal) return;
    await this.storage.remove(removal);
    await this.transaction(async (tx) => {
      await this.lockOwner(tx, candidate.ownerId);
      await this.locked(tx, candidate.assetId);
      await tx.$executeRaw`DELETE FROM english_listening_media_storage_blob WHERE key=${key}::uuid AND deleting=true`;
    });
  }
  async listExpired(now: number, limit: number) {
    return this.legacy.listExpired(now, limit);
  }
  async cleanupOrphanBlobs(now: number, limit: number) {
    bound(limit, 1, 100);
    const cutoff = new Date(now - this.orphanTtlMs);
    const rows = await this.prisma.$queryRaw<
      { key: string }[]
    >`SELECT key FROM english_listening_media_storage_blob WHERE (committed=false AND "createdAt"<=${cutoff}) OR deleting=true ORDER BY "createdAt",key LIMIT ${limit}`;
    let removed = 0;
    for (const row of rows) {
      // deleteBlob rechecks live references under the shared owner lock.
      await this.deleteBlob(row.key, cutoff);
      if (!(await this.blob(row.key))) removed++;
    }
    await this.prisma
      .$executeRaw`DELETE FROM english_listening_media_asset WHERE "assetId" IN (SELECT a."assetId" FROM english_listening_media_asset a WHERE a.state='expired' AND a.record->>'storageChunks'='true' AND jsonb_array_length(a.record->'chunks')=0 AND a.record->'playback' IS NULL AND NOT EXISTS(SELECT 1 FROM english_listening_media_storage_blob b WHERE b."assetId"=a."assetId") ORDER BY a."uploadExpiresAt" LIMIT ${limit})`;
    return removed + (await this.legacy.cleanupOrphanBlobs(now, limit));
  }
}
