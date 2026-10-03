import {
  canonicalBytes,
  payloadProjection,
  snapshotProjection,
  manifestProjection,
  conceptProjection,
} from "./canonical";

export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new Uint8Array(bytes),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export const canonicalHash = (value: unknown): Promise<string> =>
  sha256(canonicalBytes(value));
export const contentHash = (
  payload: Parameters<typeof payloadProjection>[0],
): Promise<string> => canonicalHash(payloadProjection(payload));
export const snapshotHash = async (
  snapshot: Parameters<typeof snapshotProjection>[0],
): Promise<string> =>
  canonicalHash(
    snapshotProjection({
      ...snapshot,
      contentHash: await contentHash(snapshot.payload),
    }),
  );
export const conceptContentHash = (
  concept: Parameters<typeof conceptProjection>[0],
): Promise<string> => canonicalHash(conceptProjection(concept));
export const manifestHash = async (
  exchange: Parameters<typeof manifestProjection>[0],
): Promise<string> =>
  canonicalHash(
    manifestProjection({
      ...exchange,
      snapshots: await Promise.all(
        exchange.snapshots.map(async (s) => ({
          ...s,
          contentHash: await contentHash(s.payload),
          ...(s.snapshotHash === undefined
            ? {}
            : { snapshotHash: await snapshotHash(s) }),
        })),
      ),
    }),
  );
