import type {
  ListeningMediaBlocker,
  ListeningMediaCompletion,
  ListeningMediaScope,
  ListeningMediaUpload,
} from "../../../../contracts/englishListeningMedia.contract";
import type { ListeningDriveRef } from "./driveApi";
import type { ListeningStorageRef } from "./storageApi";

export interface ListeningMediaChunkRecord {
  key: string;
  offset: number;
  byteLength: number;
  /** Internal bounded view into an immutable original blob; absent means zero. */
  blobOffset?: number;
  sha256: string;
  /** Exact request revision retained for idempotent retry checks. */
  expectedRevision: number;
}
/** Internal metadata. Never serialize this as a student or teacher response.
 * `ownerId`/`branchId` are the set scope the server resolved at upload start; every later
 * operation re-resolves the current scope and refuses the record when it no longer matches. */
export interface ListeningMediaRecord
  extends ListeningMediaUpload, ListeningMediaScope {
  assetId: string;
  revision: number;
  receivedBytes: number;
  chunkBytes: number;
  uploadExpiresAt: number;
  state: "uploading" | "ready" | "publish_blocked" | "failed" | "expired";
  chunks: ListeningMediaChunkRecord[];
  /** Server-selected at upload start, never accepted from public upload inputs. */
  mp3PlaybackEncoding?: "scrubbed_mp3";
  /** Private immutable external audio binding; never include in public DTOs. */
  drive?: ListeningDriveRef;
  storage?: ListeningStorageRef;
  /** Server-selected durable private Storage chunks; never supplied by public inputs. */
  storageChunks?: true;
  /** Original chunks/hash never change. Only this canonical identity is playable. */
  playback?: {
    revision: 1;
    mimeType: "audio/wav" | "audio/mpeg";
    sha256: string;
    totalBytes: number;
    chunks: ListeningMediaChunkRecord[];
  };
  completion?: ListeningMediaCompletion;
  finalizedFromRevision?: number;
  blocker?: ListeningMediaBlocker;
}
export interface ListeningMediaRead {
  start: number;
  endExclusive: number;
  maxChunkBytes: number;
  signal?: AbortSignal;
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
  putBlob(
    bytes: Uint8Array,
    scope?: { assetId: string; ownerId: string },
  ): Promise<string>;
  readBlob(key: string, read: ListeningMediaRead): AsyncIterable<Uint8Array>;
  deleteBlob(key: string): Promise<void>;
  /** Includes expired tombstones until their blob list has been cleared. */
  listExpired(now: number, limit: number): Promise<ListeningMediaRecord[]>;
  cleanupOrphanBlobs?(now: number, limit: number): Promise<number>;
}
