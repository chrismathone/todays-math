/** Global PostgreSQL binary budget, separate from owner/private object quotas. */
import { Prisma } from "@prisma/client";
import { ListeningMediaError } from "./errors";
type Sql = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;
export const LISTENING_DATABASE_DEFAULT_MAX_BYTES = 6 * 1024 ** 3;
export function listeningDatabaseMaxBytes(
  explicit?: number,
  env: Record<string, string | undefined> = process.env,
) {
  const raw = env.ENGLISH_LISTENING_DATABASE_MAX_BYTES;
  const value =
    explicit ??
    (raw === undefined || raw === ""
      ? LISTENING_DATABASE_DEFAULT_MAX_BYTES
      : Number(raw));
  if (!Number.isSafeInteger(value) || value < 1024 * 1024)
    throw new ListeningMediaError("invalid_request");
  return value;
}
export async function lockListeningDatabaseCapacity(tx: Sql) {
  // Every PostgreSQL media writer acquires global -> owner -> asset. Reentrant
  // transaction locks allow the capacity check to share this exact namespace.
  await tx.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${"listening-media:database-capacity"},0))`,
  );
}
export function listeningDatabaseCapacityFits(
  current: number,
  remaining: number,
  additional: number,
  max: number,
) {
  if (
    ![current, remaining, additional, max].every(
      (n) => Number.isSafeInteger(n) && n >= 0,
    )
  )
    return false;
  // Raw size is conservative for compressed TOAST. Add 10% for TOAST pages,
  // indexes/page allocation and 1MiB for metadata/page headroom.
  const projected =
    current + Math.ceil((remaining + additional) * 1.1) + 1024 * 1024;
  return Number.isSafeInteger(projected) && projected <= max;
}
export async function assertListeningDatabaseCapacity(
  tx: Sql,
  additional: number,
  maxBytes?: number,
) {
  if (!Number.isSafeInteger(additional) || additional < 0)
    throw new ListeningMediaError("invalid_request");
  const max = listeningDatabaseMaxBytes(maxBytes);
  await lockListeningDatabaseCapacity(tx);
  const [row] = await tx.$queryRaw<
    { current: bigint; remaining: bigint }[]
  >(Prisma.sql`
    SELECT pg_database_size(current_database())::bigint AS current,
      (SELECT COALESCE(SUM(GREATEST(a."reservedBytes"-COALESCE(b.bytes,0),0)),0)::bigint
       FROM english_listening_media_asset a LEFT JOIN LATERAL
       (SELECT COALESCE(SUM("byteLength"),0)::bigint AS bytes FROM english_listening_media_blob WHERE "assetId"=a."assetId") b ON true
       WHERE a.state='uploading' AND a.record->'drive' IS NULL AND a.record->'storage' IS NULL AND a.record->>'storageChunks' IS DISTINCT FROM 'true') AS remaining`);
  if (
    !row ||
    !listeningDatabaseCapacityFits(
      Number(row.current),
      Number(row.remaining),
      additional,
      max,
    )
  )
    throw new ListeningMediaError("quota_exceeded");
}
