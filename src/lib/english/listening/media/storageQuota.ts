/** Shared physical-object quota for bulk imports, GUI uploads and composed aliases. */
import "server-only";
import type { Prisma } from "@prisma/client";
import type { ListeningStorageRef } from "./storageApi";
import { ListeningMediaError } from "./errors";
type Sql = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;
/** Pro private Storage: original archives plus sample-accurate PCM derivatives; PG limits stay separate. */
export const LISTENING_STORAGE_OWNER_BYTES = 80 * 1024 ** 3;
export const LISTENING_STORAGE_OWNER_ASSETS = 8192;
export async function assertListeningStorageQuota(
  tx: Sql,
  ownerId: string,
  input: {
    reserveBytes?: number;
    assetCount?: number;
    ref?: ListeningStorageRef;
    maxOwnerBytes?: number;
    maxOwnerAssets?: number;
  } = {},
) {
  // Caller holds listening-media:<ownerId>. Whole-file aliases and chunk aliases
  // share physical objects, while unfinished uploads reserve their maximum output.
  const assets = await tx.$queryRaw<
    {
      storage: ListeningStorageRef | null;
      state: string;
      reservedBytes: number;
    }[]
  >`SELECT record->'storage' AS storage, state, "reservedBytes" FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid AND (record->'storage' IS NOT NULL OR record->>'storageChunks'='true')`;
  const blobs = await tx.$queryRaw<
    {
      ref: ListeningStorageRef | null;
      key: string;
      assetId: string;
      byteLength: number;
    }[]
  >`SELECT b.ref,b.key,b."assetId",b."byteLength" FROM english_listening_media_storage_blob b JOIN english_listening_media_asset a ON a."assetId"=b."assetId" WHERE a."ownerId"=${ownerId}::uuid AND a.state<>'uploading'`;
  const files = new Map<string, number>();
  const add = (ref: ListeningStorageRef) => {
    if (
      ref.ownerId !== ownerId ||
      !Number.isSafeInteger(ref.bytes) ||
      ref.bytes < 1
    )
      throw new ListeningMediaError("storage_integrity");
    const key = `${ref.bucket}:${ref.key}`;
    if (files.has(key) && files.get(key) !== ref.bytes)
      throw new ListeningMediaError("storage_integrity");
    files.set(key, ref.bytes);
  };
  let reservations = input.reserveBytes ?? 0;
  for (const row of assets) {
    if (row.storage) add(row.storage);
    else if (row.state === "uploading") reservations += row.reservedBytes;
  }
  for (const blob of blobs) {
    if (blob.ref) add(blob.ref);
    else files.set(`pending:${blob.assetId}:${blob.key}`, blob.byteLength);
  }
  if (input.ref) add(input.ref);
  if (
    !Number.isSafeInteger(reservations) ||
    reservations < 0 ||
    reservations + [...files.values()].reduce((a, b) => a + b, 0) >
      (input.maxOwnerBytes ?? LISTENING_STORAGE_OWNER_BYTES) ||
    assets.length + (input.assetCount ?? 1) >
      (input.maxOwnerAssets ?? LISTENING_STORAGE_OWNER_ASSETS)
  )
    throw new ListeningMediaError("quota_exceeded");
}
