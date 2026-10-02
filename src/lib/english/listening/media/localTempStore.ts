import { randomUUID } from "node:crypto";
import { mkdtemp, open, realpath, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import type {
  ListeningMediaRead,
  ListeningMediaRecord,
  ListeningMediaStore,
} from "./store";

/**
 * Local probe adapter ONLY. Metadata is in memory, CAS covers one instance, and
 * bytes live in an exclusively created OS temp directory. No restart durability,
 * cross-process locking, production ACL proof, quota manager or scheduled sweeper.
 */
export class LocalTempListeningMediaStore implements ListeningMediaStore {
  private readonly records = new Map<string, ListeningMediaRecord>();
  private disposed = false;
  private constructor(
    private readonly directory: string,
    private readonly parent: string,
  ) {}
  static async create() {
    const parent = await realpath(tmpdir());
    return new LocalTempListeningMediaStore(
      await mkdtemp(join(parent, "listening-media-l0-")),
      parent,
    );
  }
  private assertOpen() {
    if (this.disposed) throw new Error("local_media_store_disposed");
  }
  private blobPath(key: string) {
    this.assertOpen();
    if (!/^[a-f0-9-]{36}$/.test(key)) throw new Error("invalid_blob_key");
    return join(this.directory, key);
  }
  async create(record: ListeningMediaRecord) {
    this.assertOpen();
    if (this.records.has(record.assetId)) return false;
    this.records.set(record.assetId, structuredClone(record));
    return true;
  }
  async get(assetId: string) {
    this.assertOpen();
    const value = this.records.get(assetId);
    return value ? structuredClone(value) : null;
  }
  async compareAndSwap(
    assetId: string,
    revision: number,
    next: ListeningMediaRecord,
  ) {
    this.assertOpen();
    if (next.assetId !== assetId || next.revision !== revision + 1)
      throw new Error("invalid_cas");
    if (this.records.get(assetId)?.revision !== revision) return false;
    this.records.set(assetId, structuredClone(next));
    return true;
  }
  async putBlob(bytes: Uint8Array) {
    const key = randomUUID();
    const handle = await open(this.blobPath(key), "wx", 0o600);
    try {
      await handle.writeFile(bytes);
    } catch (error) {
      await handle.close();
      await unlink(this.blobPath(key));
      throw error;
    }
    await handle.close();
    return key;
  }
  async *readBlob(
    key: string,
    { start, endExclusive, maxChunkBytes }: ListeningMediaRead,
  ) {
    if (
      ![start, endExclusive, maxChunkBytes].every(Number.isSafeInteger) ||
      start < 0 ||
      endExclusive < start ||
      maxChunkBytes <= 0 ||
      maxChunkBytes > 1024 * 1024
    )
      throw new Error("invalid_blob_range");
    const handle = await open(this.blobPath(key), "r");
    try {
      let offset = start;
      while (offset < endExclusive) {
        const buffer = Buffer.alloc(
          Math.min(maxChunkBytes, endExclusive - offset),
        );
        const { bytesRead } = await handle.read(
          buffer,
          0,
          buffer.length,
          offset,
        );
        if (bytesRead === 0) throw new Error("truncated_blob");
        offset += bytesRead;
        yield buffer.subarray(0, bytesRead);
      }
    } finally {
      await handle.close();
    }
  }
  async deleteBlob(key: string) {
    try {
      await unlink(this.blobPath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  async listExpired(now: number, limit: number) {
    this.assertOpen();
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      throw new Error("invalid_cleanup_limit");
    const found: ListeningMediaRecord[] = [];
    for (const record of this.records.values()) {
      if (
        record.state !== "ready" &&
        record.uploadExpiresAt <= now &&
        (record.state !== "expired" || record.chunks.length > 0)
      )
        found.push(structuredClone(record));
      if (found.length === limit) break;
    }
    return found;
  }
  /** Only call once active readers/writers have stopped. */
  async dispose() {
    if (this.disposed) return;
    const actual = await realpath(this.directory);
    if (
      actual !== this.directory ||
      dirname(actual) !== this.parent ||
      !basename(actual).startsWith("listening-media-l0-")
    )
      throw new Error("unsafe_temp_cleanup");
    await rm(actual, { recursive: true, force: false });
    this.records.clear();
    this.disposed = true;
  }
}
