/** Node-only L0 library; route authentication and rights lookup MUST be injected. */
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  listeningMediaAssetSchema,
  listeningMediaChunkSchema,
  listeningMediaCompleteSchema,
  listeningMediaCompletionSchema,
  listeningMediaRequestSchema,
  listeningMediaUploadSchema,
  type ListeningMediaUploadReceipt,
} from "../../../../contracts/englishListeningMedia.contract";
import { ListeningMediaError } from "./errors";
import { inspectListeningMedia } from "./inspect";
import { parseListeningByteRange } from "./range";
import type { ListeningMediaRecord, ListeningMediaStore } from "./store";

export interface ListeningMediaLimits {
  chunkBytes: number;
  maxTotalBytes: number;
  readChunkBytes: number;
  uploadTtlMs: number;
  maxDurationMs: number;
}
/** Experimental ceilings, NOT approved production limits. */
export const LISTENING_MEDIA_L0_LIMITS: Readonly<ListeningMediaLimits> =
  Object.freeze({
    chunkBytes: 1024 * 1024,
    maxTotalBytes: 64 * 1024 * 1024,
    readChunkBytes: 64 * 1024,
    uploadTtlMs: 60 * 60 * 1000,
    maxDurationMs: 60 * 60 * 1000,
  });
export interface ListeningMediaAuthorizationTarget {
  action: "store_original" | "playback" | "publish";
  setId: string;
  assetId?: string;
}
export interface ListeningMediaDependencies<Context> {
  store: ListeningMediaStore;
  /**
   * Live authoritative check, never a client assertion or cached allow decision.
   * Check actor/branch/owner/set/asset linkage and purpose-specific rights; playback
   * must check current account, assignment, membership, mode, deadline and token
   * expiry (teacher_device disallows student bytes). Return literal true to allow.
   * Called BEFORE metadata access on EVERY operation, again before upload commits.
   */
  authorize(
    context: Context,
    target: ListeningMediaAuthorizationTarget,
  ): Promise<boolean>;
  now?: () => number;
  limits?: Partial<ListeningMediaLimits>;
}
const securityHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const unavailable = () =>
  new Response(null, { status: 404, headers: securityHeaders });
const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ListeningMediaError("invalid_request");
  return result.data;
}
function receipt(record: ListeningMediaRecord): ListeningMediaUploadReceipt {
  return {
    setId: record.setId,
    assetId: record.assetId,
    revision: record.revision,
    receivedBytes: record.receivedBytes,
    totalBytes: record.totalBytes,
    chunkBytes: record.chunkBytes,
    uploadExpiresAt: record.uploadExpiresAt,
    state: "uploading",
  };
}
async function collectBody(body: AsyncIterable<Uint8Array>, length: number) {
  // At most one configured upload chunk is buffered, never the complete asset.
  const result = Buffer.alloc(length);
  let offset = 0;
  for await (const piece of body) {
    if (
      !(piece instanceof Uint8Array) ||
      piece.byteLength === 0 ||
      piece.byteLength > length - offset
    )
      throw new ListeningMediaError("body_size");
    result.set(piece, offset);
    offset += piece.byteLength;
  }
  if (offset !== length) throw new ListeningMediaError("body_size");
  return result;
}
/** Only committed chunk references can be read; limits also police faulty adapters. */
async function* readAsset(
  store: ListeningMediaStore,
  record: ListeningMediaRecord,
  start: number,
  end: number,
  max: number,
) {
  let remaining = end - start;
  for (const chunk of record.chunks) {
    const from = Math.max(start, chunk.offset);
    const to = Math.min(end, chunk.offset + chunk.byteLength);
    if (from >= to) continue;
    let chunkRemaining = to - from;
    for await (const piece of store.readBlob(chunk.key, {
      start: from - chunk.offset,
      endExclusive: to - chunk.offset,
      maxChunkBytes: max,
    })) {
      if (
        !(piece instanceof Uint8Array) ||
        piece.byteLength === 0 ||
        piece.byteLength > max ||
        piece.byteLength > chunkRemaining
      )
        throw new ListeningMediaError("storage_integrity");
      chunkRemaining -= piece.byteLength;
      remaining -= piece.byteLength;
      yield piece;
    }
    if (chunkRemaining !== 0)
      throw new ListeningMediaError("storage_integrity");
  }
  if (remaining !== 0) throw new ListeningMediaError("storage_integrity");
}
function responseStream(source: AsyncIterable<Uint8Array>) {
  const iterator = source[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          const item = await iterator.next();
          if (item.done) controller.close();
          else controller.enqueue(item.value);
        } catch (error) {
          controller.error(error);
          await iterator.return?.();
        }
      },
      async cancel() {
        await iterator.return?.();
      },
    },
    { highWaterMark: 0 },
  );
}

export function createListeningMediaService<Context>(
  dependencies: ListeningMediaDependencies<Context>,
) {
  const { store, authorize } = dependencies;
  const now = dependencies.now ?? Date.now;
  const limits = { ...LISTENING_MEDIA_L0_LIMITS, ...dependencies.limits };
  if (
    !Object.values(limits).every((n) => Number.isSafeInteger(n) && n > 0) ||
    limits.chunkBytes > 1024 * 1024 ||
    limits.readChunkBytes > 1024 * 1024 ||
    limits.maxTotalBytes > 256 * 1024 * 1024 ||
    limits.uploadTtlMs > 24 * 60 * 60 * 1000
  )
    throw new ListeningMediaError("invalid_request");
  async function check(
    context: Context,
    target: ListeningMediaAuthorizationTarget,
  ) {
    try {
      if ((await authorize(context, target)) === true) return;
    } catch {
      /* fail closed */
    }
    throw new ListeningMediaError("not_found");
  }
  async function find(assetId: string, setId: string) {
    const record = await store.get(assetId);
    if (!record || record.setId !== setId)
      throw new ListeningMediaError("not_found");
    return record;
  }
  function unexpired(record: ListeningMediaRecord) {
    if (record.state === "expired" || record.uploadExpiresAt <= now())
      throw new ListeningMediaError("expired");
  }
  async function beginUpload(context: Context, input: unknown) {
    const data = parse(listeningMediaUploadSchema, input);
    await check(context, { action: "store_original", setId: data.setId });
    if (
      data.totalBytes > limits.maxTotalBytes ||
      Math.ceil(data.totalBytes / limits.chunkBytes) > 4096
    )
      throw new ListeningMediaError("too_large");
    const record: ListeningMediaRecord = {
      ...data,
      assetId: randomUUID(),
      state: "uploading",
      revision: 0,
      receivedBytes: 0,
      chunkBytes: limits.chunkBytes,
      uploadExpiresAt: now() + limits.uploadTtlMs,
      chunks: [],
    };
    if (!(await store.create(record)))
      throw new ListeningMediaError("conflict");
    return receipt(record);
  }
  async function appendChunk(
    context: Context,
    input: unknown,
    body: AsyncIterable<Uint8Array>,
  ) {
    const data = parse(listeningMediaChunkSchema, input);
    const target = {
      action: "store_original" as const,
      setId: data.setId,
      assetId: data.assetId,
    };
    await check(context, target);
    const record = await find(data.assetId, data.setId);
    unexpired(record);
    if (record.state !== "uploading") throw new ListeningMediaError("conflict");
    const prior = record.chunks.find((chunk) => chunk.offset === data.offset);
    const isRetry =
      prior &&
      prior.byteLength === data.byteLength &&
      prior.sha256 === data.sha256 &&
      prior.expectedRevision === data.expectedRevision;
    if (prior && !isRetry) throw new ListeningMediaError("conflict");
    if (
      !isRetry &&
      (data.expectedRevision !== record.revision ||
        data.offset !== record.receivedBytes ||
        data.byteLength !==
          Math.min(record.chunkBytes, record.totalBytes - record.receivedBytes))
    )
      throw new ListeningMediaError("conflict");
    if (data.byteLength > record.chunkBytes)
      throw new ListeningMediaError("too_large");
    const bytes = await collectBody(body, data.byteLength);
    if (digest(bytes) !== data.sha256)
      throw new ListeningMediaError("hash_mismatch");
    await check(context, target);
    unexpired(record);
    if (isRetry)
      return {
        ...receipt(record),
        revision: data.expectedRevision + 1,
        receivedBytes: data.offset + data.byteLength,
      };
    const key = await store.putBlob(bytes);
    let committed = false;
    try {
      await check(context, target);
      unexpired(record);
      const next: ListeningMediaRecord = {
        ...record,
        revision: record.revision + 1,
        receivedBytes: record.receivedBytes + bytes.length,
        chunks: [
          ...record.chunks,
          {
            key,
            offset: data.offset,
            byteLength: bytes.length,
            sha256: data.sha256,
            expectedRevision: data.expectedRevision,
          },
        ],
      };
      committed = await store.compareAndSwap(
        record.assetId,
        record.revision,
        next,
      );
      if (committed) return receipt(next);
      const current = await find(data.assetId, data.setId);
      unexpired(current);
      const accepted = current.chunks.find(
        (chunk) => chunk.offset === data.offset,
      );
      if (
        current.state === "uploading" &&
        accepted?.sha256 === data.sha256 &&
        accepted.byteLength === data.byteLength &&
        accepted.expectedRevision === data.expectedRevision
      )
        return {
          ...receipt(current),
          revision: data.expectedRevision + 1,
          receivedBytes: data.offset + data.byteLength,
        };
      throw new ListeningMediaError("conflict");
    } finally {
      if (!committed) await store.deleteBlob(key);
    }
  }
  async function completeUpload(context: Context, input: unknown) {
    const data = parse(listeningMediaCompleteSchema, input);
    const target = {
      action: "store_original" as const,
      setId: data.setId,
      assetId: data.assetId,
    };
    await check(context, target);
    const record = await find(data.assetId, data.setId);
    if (
      record.completion &&
      record.finalizedFromRevision === data.expectedRevision
    ) {
      if (record.state !== "ready") unexpired(record);
      return record.completion;
    }
    unexpired(record);
    if (
      record.state !== "uploading" ||
      record.revision !== data.expectedRevision
    )
      throw new ListeningMediaError("conflict");
    if (record.receivedBytes !== record.totalBytes)
      throw new ListeningMediaError("incomplete");
    const hash = createHash("sha256");
    const prefix = Buffer.alloc(Math.min(44, record.totalBytes));
    let prefixLength = 0;
    for await (const piece of readAsset(
      store,
      record,
      0,
      record.totalBytes,
      limits.readChunkBytes,
    )) {
      hash.update(piece);
      const take = Math.min(prefix.length - prefixLength, piece.length);
      if (take > 0) {
        prefix.set(piece.subarray(0, take), prefixLength);
        prefixLength += take;
      }
    }
    await check(context, target);
    unexpired(record);
    if (hash.digest("hex") !== record.expectedSha256) {
      await store.compareAndSwap(record.assetId, record.revision, {
        ...record,
        revision: record.revision + 1,
        state: "failed",
      });
      throw new ListeningMediaError("hash_mismatch");
    }
    const inspection = inspectListeningMedia(
      prefix,
      record.totalBytes,
      record.mimeType,
      limits.maxDurationMs,
    );
    const fields = receipt({ ...record, revision: record.revision + 1 });
    const completion = listeningMediaCompletionSchema.parse(
      inspection.playable
        ? {
            ...fields,
            state: "ready",
            publishable: true,
            mimeType: "audio/wav",
            sha256: record.expectedSha256,
            durationMs: inspection.durationMs,
          }
        : {
            ...fields,
            state: "publish_blocked",
            publishable: false,
            blocker: inspection.blocker,
          },
    );
    const next: ListeningMediaRecord = {
      ...record,
      state: completion.state,
      revision: completion.revision,
      completion,
      finalizedFromRevision: record.revision,
    };
    if (!(await store.compareAndSwap(record.assetId, record.revision, next))) {
      const current = await find(data.assetId, data.setId);
      if (
        current.completion &&
        current.finalizedFromRevision === data.expectedRevision
      )
        return current.completion;
      throw new ListeningMediaError("conflict");
    }
    return completion;
  }
  async function serve(context: Context, input: unknown): Promise<Response> {
    const parsed = listeningMediaRequestSchema.safeParse(input);
    if (!parsed.success) return unavailable();
    const request = parsed.data;
    let record: ListeningMediaRecord;
    try {
      await check(context, {
        action: "playback",
        setId: request.setId,
        assetId: request.assetId,
      });
      record = await find(request.assetId, request.setId);
    } catch (error) {
      if (error instanceof ListeningMediaError) return unavailable();
      throw error;
    }
    if (record.state !== "ready" || record.completion?.state !== "ready")
      return unavailable();
    const headers = new Headers({
      ...securityHeaders,
      "Accept-Ranges": "bytes",
      "Content-Type": "audio/wav",
      "Content-Disposition": `inline; filename="audio-${record.assetId}.wav"`,
    });
    // RFC 9110 §14.2: Range is ignored for HEAD; HEAD never opens a blob.
    const range =
      request.method === "GET" && request.range != null
        ? parseListeningByteRange(request.range, record.totalBytes)
        : { start: 0, endExclusive: record.totalBytes };
    if (!range) {
      headers.set("Content-Range", `bytes */${record.totalBytes}`);
      return new Response(null, { status: 416, headers });
    }
    const partial = request.method === "GET" && request.range != null;
    headers.set("Content-Length", String(range.endExclusive - range.start));
    if (partial)
      headers.set(
        "Content-Range",
        `bytes ${range.start}-${range.endExclusive - 1}/${record.totalBytes}`,
      );
    return new Response(
      request.method === "HEAD"
        ? null
        : responseStream(
            readAsset(
              store,
              record,
              range.start,
              range.endExclusive,
              limits.readChunkBytes,
            ),
          ),
      { status: partial ? 206 : 200, headers },
    );
  }
  /**
   * Publication code must read this trusted capability, never accept an uploaded
   * receipt as proof. The separate publication policy still checks human review,
   * matching immutable asset/hash references, content and distribution rights.
   */
  async function getVerifiedReadiness(context: Context, input: unknown) {
    const data = parse(listeningMediaAssetSchema, input);
    await check(context, { action: "publish", ...data });
    const record = await find(data.assetId, data.setId);
    return record.state === "ready" && record.completion?.state === "ready"
      ? record.completion
      : null;
  }
  /** Trusted maintenance entrypoint, not a user route. Bounded, retryable tombstone cleanup. */
  async function cleanupExpiredUploads(limit = 25) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      throw new ListeningMediaError("invalid_request");
    let cleaned = 0;
    for (const record of await store.listExpired(now(), limit)) {
      if (record.state === "ready" || record.uploadExpiresAt > now()) continue;
      const tombstone: ListeningMediaRecord = {
        ...record,
        state: "expired",
        revision: record.revision + 1,
        completion: undefined,
      };
      if (
        !(await store.compareAndSwap(
          record.assetId,
          record.revision,
          tombstone,
        ))
      )
        continue;
      for (const chunk of record.chunks) await store.deleteBlob(chunk.key);
      if (
        await store.compareAndSwap(record.assetId, tombstone.revision, {
          ...tombstone,
          chunks: [],
          revision: tombstone.revision + 1,
        })
      )
        cleaned++;
    }
    return cleaned;
  }
  return {
    beginUpload,
    appendChunk,
    completeUpload,
    getVerifiedReadiness,
    serve,
    cleanupExpiredUploads,
  };
}
