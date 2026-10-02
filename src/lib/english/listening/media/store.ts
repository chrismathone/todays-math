import type {
  ListeningMediaBlocker,
  ListeningMediaCompletion,
  ListeningMediaUpload,
} from "../../../../contracts/englishListeningMedia.contract";

export interface ListeningMediaChunkRecord {
  key: string;
  offset: number;
  byteLength: number;
  sha256: string;
  /** Exact request revision retained for idempotent retry checks. */
  expectedRevision: number;
}
/** Internal metadata. Never serialize this as a student or teacher response. */
export interface ListeningMediaRecord extends ListeningMediaUpload {
  assetId: string;
  revision: number;
  receivedBytes: number;
  chunkBytes: number;
  uploadExpiresAt: number;
  state: "uploading" | "ready" | "publish_blocked" | "failed" | "expired";
  chunks: ListeningMediaChunkRecord[];
  completion?: ListeningMediaCompletion;
  finalizedFromRevision?: number;
  blocker?: ListeningMediaBlocker;
}
export interface ListeningMediaRead {
  start: number;
  endExclusive: number;
  maxChunkBytes: number;
}
/**
 * Trusted adapter boundary. Metadata reads return detached snapshots. CAS is atomic
 * across ALL callers; blobs are immutable, private, exclusively created, and opaque.
 * readBlob yields only the requested interval, in pieces <= maxChunkBytes; closes on
 * cancellation. A production adapter needs durable CAS, quotas and orphan cleanup.
 */
export interface ListeningMediaStore {
  create(record: ListeningMediaRecord): Promise<boolean>;
  get(assetId: string): Promise<ListeningMediaRecord | null>;
  compareAndSwap(
    assetId: string,
    revision: number,
    next: ListeningMediaRecord,
  ): Promise<boolean>;
  putBlob(bytes: Uint8Array): Promise<string>;
  readBlob(key: string, read: ListeningMediaRead): AsyncIterable<Uint8Array>;
  deleteBlob(key: string): Promise<void>;
  /** Includes expired tombstones until their blob list has been cleared. */
  listExpired(now: number, limit: number): Promise<ListeningMediaRecord[]>;
}
