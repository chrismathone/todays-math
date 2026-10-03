import "server-only";
import { createHash } from "node:crypto";
import {
  canonicalBytes,
  payloadProjection,
  snapshotProjection,
  manifestProjection,
  conceptProjection,
} from "./canonical";

export const sha256 = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");
export const canonicalHash = (value: unknown): string =>
  sha256(canonicalBytes(value));
export const contentHash = (
  payload: Parameters<typeof payloadProjection>[0],
): string => canonicalHash(payloadProjection(payload));
export const snapshotHash = (
  snapshot: Parameters<typeof snapshotProjection>[0],
): string =>
  canonicalHash(
    snapshotProjection({
      ...snapshot,
      contentHash: contentHash(snapshot.payload),
    }),
  );
export const conceptContentHash = (
  concept: Parameters<typeof conceptProjection>[0],
): string => canonicalHash(conceptProjection(concept));
export const manifestHash = (
  exchange: Parameters<typeof manifestProjection>[0],
): string =>
  canonicalHash(
    manifestProjection({
      ...exchange,
      snapshots: exchange.snapshots.map((s) => ({
        ...s,
        contentHash: contentHash(s.payload),
        ...(s.snapshotHash === undefined
          ? {}
          : { snapshotHash: snapshotHash(s) }),
      })),
    }),
  );
