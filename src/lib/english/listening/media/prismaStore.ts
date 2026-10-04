/** PostgreSQL private chunk adapter. No object URL or original-byte delivery API. */
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { ListeningMediaError } from "./errors";
import { MAX_ORIGINAL_BYTES, MAX_PLAYBACK_BYTES } from "./mp3";
import {
  LISTENING_MAX_OWNER_BYTES,
  LISTENING_MAX_OWNER_ASSETS,
} from "@/contracts/englishListeningSource.contract";
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
  reservedBytes: number;
  state: string;
};
const MAX_BLOB_BYTES = 1024 * 1024;
const keysOf = (record: ListeningMediaRecord) => [
  ...new Set(
    [...record.chunks, ...(record.playback?.chunks ?? [])].map(
      (chunk) => chunk.key,
    ),
  ),
];
const references = (record: ListeningMediaRecord) => [
  ...record.chunks,
  ...(record.playback?.chunks ?? []),
];
function bound(value: number, min: number, max: number) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new ListeningMediaError("invalid_request");
}

export interface PrismaListeningMediaStoreOptions {
  /** Reserved original + maximum derivative bytes, including staged uncommitted writes. */
  maxOwnerBytes?: number;
  maxOwnerAssets?: number;
  orphanTtlMs?: number;
}

export class PrismaListeningMediaStore implements ListeningMediaStore {
  private readonly maxOwnerBytes: number;
  private readonly maxOwnerAssets: number;
  private readonly orphanTtlMs: number;
  constructor(
    private readonly prisma: PrismaClient,
    options: PrismaListeningMediaStoreOptions = {},
  ) {
    this.maxOwnerBytes = options.maxOwnerBytes ?? LISTENING_MAX_OWNER_BYTES;
    this.maxOwnerAssets = options.maxOwnerAssets ?? LISTENING_MAX_OWNER_ASSETS;
    this.orphanTtlMs = options.orphanTtlMs ?? 60 * 60 * 1000;
    bound(this.maxOwnerBytes, 1, 2 ** 31 - 1);
    bound(this.maxOwnerAssets, 1, 10000);
    bound(this.orphanTtlMs, 60000, 24 * 60 * 60 * 1000);
  }
  private transaction<T>(fn: (tx: Sql) => Promise<T>) {
    return this.prisma.$transaction(fn, { maxWait: 10000, timeout: 30000 });
  }
  private async lockOwner(tx: Sql, ownerId: string) {
    // Same namespace for every adapter/process. Lock order is ALWAYS owner then asset.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`listening-media:${ownerId}`}, 0))`;
  }
  private async locked(tx: Sql, assetId: string) {
    const rows = await tx.$queryRaw<
      AssetRow[]
    >`SELECT record, revision, "ownerId", "reservedBytes", state FROM english_listening_media_asset WHERE "assetId" = ${assetId}::uuid FOR UPDATE`;
    return rows[0];
  }
  private async used(tx: Sql, assetId: string) {
    const rows = await tx.$queryRaw<
      { bytes: bigint }[]
    >`SELECT COALESCE(SUM("byteLength"), 0)::bigint AS bytes FROM english_listening_media_blob WHERE "assetId" = ${assetId}::uuid`;
    return Number(rows[0].bytes);
  }
  async create(record: ListeningMediaRecord) {
    bound(record.totalBytes, 1, MAX_ORIGINAL_BYTES);
    if (
      record.revision !== 0 ||
      record.state !== "uploading" ||
      record.receivedBytes !== 0 ||
      record.chunks.length ||
      record.playback
    )
      throw new ListeningMediaError("invalid_request");
    const reserve =
      record.totalBytes +
      MAX_BLOB_BYTES +
      (record.mimeType === "audio/mpeg" &&
      record.mp3PlaybackEncoding !== "scrubbed_mp3"
        ? MAX_PLAYBACK_BYTES
        : 0);
    return this.transaction(async (tx) => {
      await this.lockOwner(tx, record.ownerId);
      const quota = await tx.$queryRaw<
        { bytes: bigint; count: bigint }[]
      >`SELECT COALESCE(SUM("reservedBytes"), 0)::bigint AS bytes, COUNT(*)::bigint AS count FROM english_listening_media_asset WHERE "ownerId" = ${record.ownerId}::uuid`;
      if (
        Number(quota[0].bytes) + reserve > this.maxOwnerBytes ||
        Number(quota[0].count) >= this.maxOwnerAssets
      )
        throw new ListeningMediaError("quota_exceeded");
      const inserted =
        await tx.$executeRaw`INSERT INTO english_listening_media_asset ("assetId", "ownerId", "branchId", "setId", revision, state, "uploadExpiresAt", "reservedBytes", record) VALUES (${record.assetId}::uuid, ${record.ownerId}::uuid, ${record.branchId}::uuid, ${record.setId}::uuid, 0, 'uploading', ${new Date(record.uploadExpiresAt)}, ${reserve}, ${JSON.stringify(record)}::jsonb) ON CONFLICT ("assetId") DO NOTHING`;
      return inserted === 1;
    });
  }
  async get(assetId: string) {
    const rows = await this.prisma.$queryRaw<
      { record: ListeningMediaRecord }[]
    >`SELECT record FROM english_listening_media_asset WHERE "assetId" = ${assetId}::uuid`;
    return rows[0]?.record ?? null;
  }
  async compareAndSwap(
    assetId: string,
    revision: number,
    next: ListeningMediaRecord,
  ) {
    if (next.assetId !== assetId || next.revision !== revision + 1)
      throw new ListeningMediaError("invalid_request");
    return this.transaction(async (tx) => {
      await this.lockOwner(tx, next.ownerId);
      const row = await this.locked(tx, assetId);
      if (!row || row.revision !== revision) return false;
      const previous = row.record;
      // A verified identity is permanently sealed, including original scope/hash and bytes.
      if (
        row.state === "ready" ||
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
          (key) =>
            previous[key as keyof ListeningMediaRecord] !==
            next[key as keyof ListeningMediaRecord],
        )
      )
        throw new ListeningMediaError("storage_integrity");
      if (previous.state !== "uploading" && next.state !== "expired")
        throw new ListeningMediaError("storage_integrity");
      if (
        next.state !== "expired" &&
        JSON.stringify(next.chunks.slice(0, previous.chunks.length)) !==
          JSON.stringify(previous.chunks)
      )
        throw new ListeningMediaError("storage_integrity");
      if (
        next.state === "ready" &&
        (!next.playback ||
          next.completion?.state !== "ready" ||
          next.completion.sha256 !== next.playback.sha256 ||
          next.completion.mimeType !== next.playback.mimeType ||
          next.receivedBytes !== next.totalBytes)
      )
        throw new ListeningMediaError("storage_integrity");
      const refs = references(next);
      bound(refs.length, 0, 16384);
      const keys = keysOf(next);
      if (next.state !== "expired" && keys.length) {
        // Lock and validate every reference before publication. A sweeper cannot delete it
        // between this read and marking it committed because it takes the same owner lock.
        const blobs = await tx.$queryRaw<
          { key: string; byteLength: number }[]
        >`SELECT key, "byteLength" FROM english_listening_media_blob WHERE "assetId" = ${assetId}::uuid AND key = ANY(${keys}::uuid[]) FOR UPDATE`;
        if (
          blobs.length !== keys.length ||
          refs.some((ref) => {
            const blob = blobs.find((value) => value.key === ref.key);
            const offset = ref.blobOffset ?? 0;
            return (
              !blob ||
              !Number.isSafeInteger(offset) ||
              offset < 0 ||
              !Number.isSafeInteger(ref.byteLength) ||
              ref.byteLength <= 0 ||
              offset + ref.byteLength > blob.byteLength ||
              (ref.blobOffset === undefined &&
                ref.byteLength !== blob.byteLength)
            );
          })
        )
          throw new ListeningMediaError("storage_integrity");
        await tx.$executeRaw`UPDATE english_listening_media_blob SET committed = true WHERE "assetId" = ${assetId}::uuid AND key = ANY(${keys}::uuid[])`;
      }
      const reserved =
        next.state === "uploading"
          ? row.reservedBytes
          : await this.used(tx, assetId);
      const changed =
        await tx.$executeRaw`UPDATE english_listening_media_asset SET revision = ${next.revision}, state = ${next.state}, record = ${JSON.stringify(next)}::jsonb, "reservedBytes" = ${reserved} WHERE "assetId" = ${assetId}::uuid AND revision = ${revision}`;
      return changed === 1;
    });
  }
  async putBlob(
    bytes: Uint8Array,
    scope?: { assetId: string; ownerId: string },
  ) {
    if (!scope) throw new ListeningMediaError("invalid_request");
    bound(bytes.byteLength, 1, MAX_BLOB_BYTES);
    const key = randomUUID();
    await this.transaction(async (tx) => {
      await this.lockOwner(tx, scope.ownerId);
      const row = await this.locked(tx, scope.assetId);
      if (!row || row.ownerId !== scope.ownerId || row.state !== "uploading")
        throw new ListeningMediaError("conflict");
      if (row.record.uploadExpiresAt <= Date.now())
        throw new ListeningMediaError("expired");
      if (
        (await this.used(tx, scope.assetId)) + bytes.byteLength >
        row.reservedBytes
      )
        throw new ListeningMediaError("quota_exceeded");
      await tx.$executeRaw`INSERT INTO english_listening_media_blob (key, "assetId", bytes, "byteLength", committed, "createdAt") VALUES (${key}::uuid, ${scope.assetId}::uuid, ${Buffer.from(bytes)}, ${bytes.byteLength}, false, NOW())`;
    });
    return key;
  }
  async *readBlob(
    key: string,
    { start, endExclusive, maxChunkBytes, signal }: ListeningMediaRead,
  ) {
    bound(start, 0, MAX_BLOB_BYTES);
    bound(endExclusive, start, MAX_BLOB_BYTES);
    bound(maxChunkBytes, 1, MAX_BLOB_BYTES);
    for (let offset = start; offset < endExclusive; offset += maxChunkBytes) {
      signal?.throwIfAborted();
      const length = Math.min(maxChunkBytes, endExclusive - offset);
      // SUBSTRING is executed by PostgreSQL; the driver never receives a full large blob.
      const rows = await this.prisma.$queryRaw<
        { bytes: Uint8Array }[]
      >`SELECT SUBSTRING(bytes FROM ${offset + 1}::int FOR ${length}::int) AS bytes FROM english_listening_media_blob WHERE key = ${key}::uuid AND "byteLength" >= ${endExclusive}`;
      signal?.throwIfAborted();
      if (rows.length !== 1 || rows[0].bytes.byteLength !== length)
        throw new ListeningMediaError("storage_integrity");
      yield rows[0].bytes;
    }
  }
  async deleteBlob(key: string) {
    const rows = await this.prisma.$queryRaw<
      { assetId: string; ownerId: string }[]
    >`SELECT b."assetId", a."ownerId" FROM english_listening_media_blob b JOIN english_listening_media_asset a ON a."assetId" = b."assetId" WHERE b.key = ${key}::uuid`;
    if (!rows.length) return;
    await this.transaction(async (tx) => {
      const { assetId, ownerId } = rows[0];
      await this.lockOwner(tx, ownerId);
      const row = await this.locked(tx, assetId);
      if (!row) return;
      if (row.state !== "expired" && keysOf(row.record).includes(key))
        throw new ListeningMediaError("storage_integrity");
      await tx.$executeRaw`DELETE FROM english_listening_media_blob WHERE key = ${key}::uuid`;
      if (row.state !== "uploading")
        await tx.$executeRaw`UPDATE english_listening_media_asset SET "reservedBytes" = ${await this.used(tx, assetId)} WHERE "assetId" = ${assetId}::uuid`;
    });
  }
  async listExpired(now: number, limit: number) {
    bound(limit, 1, 100);
    const rows = await this.prisma.$queryRaw<
      { record: ListeningMediaRecord }[]
    >`SELECT record FROM english_listening_media_asset WHERE state <> 'ready' AND "uploadExpiresAt" <= ${new Date(now)} AND (state <> 'expired' OR jsonb_array_length(record->'chunks') > 0 OR record->'playback' IS NOT NULL) ORDER BY "uploadExpiresAt", "assetId" LIMIT ${limit}`;
    return rows.map((row) => row.record);
  }
  /** Bounded maintenance. Never deletes committed/ready bytes; locks prevent CAS races. */
  async cleanupOrphanBlobs(now: number, limit: number) {
    bound(limit, 1, 100);
    const cutoff = new Date(now - this.orphanTtlMs);
    const rows = await this.prisma.$queryRaw<
      { key: string; assetId: string; ownerId: string }[]
    >`SELECT b.key, b."assetId", a."ownerId" FROM english_listening_media_blob b JOIN english_listening_media_asset a ON a."assetId" = b."assetId" WHERE b.committed = false AND b."createdAt" <= ${cutoff} ORDER BY b."createdAt", b.key LIMIT ${limit}`;
    let removed = 0;
    for (const candidate of rows) {
      removed += await this.transaction(async (tx) => {
        await this.lockOwner(tx, candidate.ownerId);
        const row = await this.locked(tx, candidate.assetId);
        if (!row || keysOf(row.record).includes(candidate.key)) return 0;
        const deleted =
          await tx.$executeRaw`DELETE FROM english_listening_media_blob WHERE key = ${candidate.key}::uuid AND committed = false AND "createdAt" <= ${cutoff}`;
        if (row.state !== "uploading")
          await tx.$executeRaw`UPDATE english_listening_media_asset SET "reservedBytes" = ${await this.used(tx, candidate.assetId)} WHERE "assetId" = ${candidate.assetId}::uuid`;
        return deleted;
      });
    }
    // Expired empty tombstones have no usable identity and can be removed after cleanup.
    await this.prisma
      .$executeRaw`DELETE FROM english_listening_media_asset WHERE "assetId" IN (SELECT a."assetId" FROM english_listening_media_asset a WHERE a.state = 'expired' AND a."reservedBytes" = 0 AND jsonb_array_length(a.record->'chunks') = 0 AND NOT EXISTS (SELECT 1 FROM english_listening_media_blob b WHERE b."assetId" = a."assetId") ORDER BY a."uploadExpiresAt" LIMIT ${limit})`;
    return removed;
  }
}
