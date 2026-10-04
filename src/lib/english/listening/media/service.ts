/** Node-only media library; route authentication and rights lookup MUST be injected. */
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  listeningMediaAssetSchema,
  listeningMediaChunkSchema,
  listeningMediaCompleteSchema,
  listeningMediaCompletionSchema,
  listeningMediaRequestSchema,
  listeningMediaScopeSchema,
  listeningMediaUploadSchema,
  type ListeningMediaScope,
  type ListeningMediaUploadReceipt,
} from "../../../../contracts/englishListeningMedia.contract";
import { ListeningMediaError } from "./errors";
import { inspectListeningMedia } from "./inspect";
import {
  decodeMp3,
  parseMp3,
  MAX_DURATION_MS,
  MAX_ORIGINAL_BYTES,
  MAX_PLAYBACK_BYTES,
  MediaFormatError,
} from "./mp3";
import { decideListeningRange } from "./range";
import type {
  ListeningMediaChunkRecord,
  ListeningMediaRecord,
  ListeningMediaStore,
} from "./store";
import type { ListeningDriveApi } from "./driveApi";

export interface ListeningMediaLimits {
  chunkBytes: number;
  maxTotalBytes: number;
  readChunkBytes: number;
  uploadTtlMs: number;
  maxDurationMs: number;
  maxPlaybackBytes: number;
}
/** Bounded short pilot; long/full-exam audio needs a separate processing path. */
export const LISTENING_MEDIA_L0_LIMITS: Readonly<ListeningMediaLimits> =
  Object.freeze({
    chunkBytes: 1024 * 1024,
    maxTotalBytes: MAX_ORIGINAL_BYTES,
    readChunkBytes: 64 * 1024,
    uploadTtlMs: 60 * 60 * 1000,
    maxDurationMs: MAX_DURATION_MS,
    maxPlaybackBytes: MAX_PLAYBACK_BYTES,
  });
export interface ListeningMediaAuthorizationTarget {
  action: "store_original" | "playback" | "publish";
  setId: string;
  assetId?: string;
}
export interface ListeningMediaDependencies<Context> {
  store: ListeningMediaStore;
  /** Server-only private external storage; never chosen by a client upload flag. */
  drive?: ListeningDriveApi | null;
  /** Trusted bulk archival path only. Full decoding still gates readiness. */
  mp3PlaybackEncoding?: "canonical_pcm" | "scrubbed_mp3";
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
  /**
   * Trusted owner/branch of the listening set, read from server storage (the set row),
   * never from a request body or a client receipt. Called after `authorize` and before
   * any media metadata on EVERY operation. The result is stored on new uploads and
   * compared against the stored scope afterwards: a set that was reassigned, revoked or
   * no longer resolves fails closed (`not_found`). Must resolve to
   * `{ ownerId, branchId }` or null/throw to deny.
   */
  resolveScope(context: Context, setId: string): Promise<unknown>;
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
/** Streams may frame zero-length pieces; they carry no bytes but must not spin forever. */
const MAX_EMPTY_PIECES = 4096;
// Per Node process; cross-process stored bytes are additionally bounded by owner quota.
let activeFinalizations = 0;
export interface ListeningMediaOperationOptions {
  signal?: AbortSignal;
}
async function collectBody(
  body: AsyncIterable<Uint8Array>,
  length: number,
  signal?: AbortSignal,
) {
  // At most one configured upload chunk is buffered, never the complete asset.
  const result = Buffer.alloc(length);
  let offset = 0;
  let empty = 0;
  const iterator = body[Symbol.asyncIterator]();
  try {
    while (true) {
      signal?.throwIfAborted();
      let removeAbort = () => {};
      const item = await (signal
        ? Promise.race([
            iterator.next(),
            new Promise<never>((_, reject) => {
              const abort = () => reject(signal.reason);
              signal.addEventListener("abort", abort, { once: true });
              removeAbort = () => signal.removeEventListener("abort", abort);
              if (signal.aborted) abort();
            }),
          ]).finally(() => removeAbort())
        : iterator.next());
      if (item.done) break;
      const piece = item.value;
      if (!(piece instanceof Uint8Array))
        throw new ListeningMediaError("body_size");
      if (piece.byteLength === 0) {
        if (++empty > MAX_EMPTY_PIECES)
          throw new ListeningMediaError("body_size");
        continue;
      }
      if (piece.byteLength > length - offset)
        throw new ListeningMediaError("body_size");
      result.set(piece, offset);
      offset += piece.byteLength;
    }
    if (offset !== length) throw new ListeningMediaError("body_size");
    return result;
  } finally {
    // A pending application iterator cannot be forcibly interrupted; don't keep the
    // HTTP operation alive waiting for it after its AbortSignal has fired.
    if (signal?.aborted) void iterator.return?.().catch(() => {});
    else await iterator.return?.();
  }
}
/** Only committed chunk references can be read; limits also police faulty adapters. */
async function* readAsset(
  store: ListeningMediaStore,
  record: Pick<ListeningMediaRecord, "chunks">,
  start: number,
  end: number,
  max: number,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  let remaining = end - start;
  for (const chunk of record.chunks) {
    signal?.throwIfAborted();
    const from = Math.max(start, chunk.offset);
    const to = Math.min(end, chunk.offset + chunk.byteLength);
    if (from >= to) continue;
    let chunkRemaining = to - from;
    let empty = 0;
    for await (const piece of store.readBlob(chunk.key, {
      start: (chunk.blobOffset ?? 0) + from - chunk.offset,
      endExclusive: (chunk.blobOffset ?? 0) + to - chunk.offset,
      maxChunkBytes: max,
      signal,
    })) {
      signal?.throwIfAborted();
      if (!(piece instanceof Uint8Array))
        throw new ListeningMediaError("storage_integrity");
      if (piece.byteLength === 0) {
        if (++empty > MAX_EMPTY_PIECES)
          throw new ListeningMediaError("storage_integrity");
        continue;
      }
      if (piece.byteLength > max || piece.byteLength > chunkRemaining)
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
function responseStream(
  source: (signal: AbortSignal) => AsyncIterable<Uint8Array>,
  signal?: AbortSignal,
) {
  const abort = new AbortController();
  const combined = signal
    ? AbortSignal.any([abort.signal, signal])
    : abort.signal;
  const iterator = source(combined)[Symbol.asyncIterator]();
  let ended = false;
  let removeAbort = () => {};
  return new ReadableStream<Uint8Array>(
    {
      start(controller) {
        const onAbort = () => {
          if (ended) return;
          ended = true;
          removeAbort();
          controller.error(combined.reason);
          void iterator.return?.().catch(() => {});
        };
        combined.addEventListener("abort", onAbort, { once: true });
        removeAbort = () => combined.removeEventListener("abort", onAbort);
        if (combined.aborted) onAbort();
      },
      async pull(controller) {
        try {
          const item = await iterator.next();
          if (ended) return;
          if (item.done) {
            ended = true;
            removeAbort();
            controller.close();
          } else controller.enqueue(item.value);
        } catch (error) {
          if (!ended) {
            ended = true;
            removeAbort();
            controller.error(error);
          }
          await iterator.return?.();
        }
      },
      async cancel() {
        ended = true;
        removeAbort();
        abort.abort();
        await iterator.return?.();
      },
    },
    { highWaterMark: 0 },
  );
}

export function createListeningMediaService<Context>(
  dependencies: ListeningMediaDependencies<Context>,
) {
  const { store, authorize, resolveScope } = dependencies;
  const now = dependencies.now ?? Date.now;
  const limits = { ...LISTENING_MEDIA_L0_LIMITS, ...dependencies.limits };
  if (
    typeof resolveScope !== "function" ||
    (dependencies.mp3PlaybackEncoding !== undefined &&
      !["canonical_pcm", "scrubbed_mp3"].includes(
        dependencies.mp3PlaybackEncoding,
      )) ||
    !Object.values(limits).every((n) => Number.isSafeInteger(n) && n > 0) ||
    limits.chunkBytes > 1024 * 1024 ||
    limits.readChunkBytes > 1024 * 1024 ||
    limits.maxTotalBytes > MAX_ORIGINAL_BYTES ||
    limits.maxDurationMs > MAX_DURATION_MS ||
    limits.maxPlaybackBytes > MAX_PLAYBACK_BYTES ||
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
  /** Current trusted scope of the set; invalid, missing or failing lookups deny opaquely. */
  async function scope(
    context: Context,
    setId: string,
  ): Promise<ListeningMediaScope> {
    let value: unknown;
    try {
      value = await resolveScope(context, setId);
    } catch {
      throw new ListeningMediaError("not_found");
    }
    const result = listeningMediaScopeSchema.safeParse(value);
    if (!result.success) throw new ListeningMediaError("not_found");
    return result.data;
  }
  function assertScope(
    record: ListeningMediaRecord,
    current: ListeningMediaScope,
  ) {
    if (
      record.ownerId !== current.ownerId ||
      record.branchId !== current.branchId
    )
      throw new ListeningMediaError("not_found");
  }
  async function find(assetId: string, setId: string) {
    const record = await store.get(assetId);
    if (!record || record.setId !== setId)
      throw new ListeningMediaError("not_found");
    return record;
  }
  /** Order on every operation: authorize → current set scope → metadata → scope match. */
  async function findScoped(context: Context, assetId: string, setId: string) {
    const current = await scope(context, setId);
    const record = await find(assetId, setId);
    assertScope(record, current);
    return record;
  }
  function unexpired(record: ListeningMediaRecord) {
    if (record.state === "expired" || record.uploadExpiresAt <= now())
      throw new ListeningMediaError("expired");
  }
  async function beginUpload(context: Context, input: unknown) {
    const data = parse(listeningMediaUploadSchema, input);
    await check(context, { action: "store_original", setId: data.setId });
    const current = await scope(context, data.setId);
    if (
      data.totalBytes > limits.maxTotalBytes ||
      Math.ceil(data.totalBytes / limits.chunkBytes) > 4096
    )
      throw new ListeningMediaError("too_large");
    const record: ListeningMediaRecord = {
      ...data,
      ownerId: current.ownerId,
      branchId: current.branchId,
      assetId: randomUUID(),
      state: "uploading",
      revision: 0,
      receivedBytes: 0,
      chunkBytes: limits.chunkBytes,
      uploadExpiresAt: now() + limits.uploadTtlMs,
      chunks: [],
      ...(data.mimeType === "audio/mpeg" &&
      dependencies.mp3PlaybackEncoding === "scrubbed_mp3"
        ? { mp3PlaybackEncoding: "scrubbed_mp3" as const }
        : {}),
    };
    if (!(await store.create(record)))
      throw new ListeningMediaError("conflict");
    return receipt(record);
  }
  async function appendChunk(
    context: Context,
    input: unknown,
    body: AsyncIterable<Uint8Array>,
    { signal }: ListeningMediaOperationOptions = {},
  ) {
    signal?.throwIfAborted();
    const data = parse(listeningMediaChunkSchema, input);
    const target = {
      action: "store_original" as const,
      setId: data.setId,
      assetId: data.assetId,
    };
    await check(context, target);
    const record = await findScoped(context, data.assetId, data.setId);
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
    const bytes = await collectBody(body, data.byteLength, signal);
    if (digest(bytes) !== data.sha256)
      throw new ListeningMediaError("hash_mismatch");
    await check(context, target);
    assertScope(record, await scope(context, data.setId));
    signal?.throwIfAborted();
    unexpired(record);
    if (isRetry)
      return {
        ...receipt(record),
        revision: data.expectedRevision + 1,
        receivedBytes: data.offset + data.byteLength,
      };
    const key = await store.putBlob(bytes, record);
    let committed = false;
    try {
      await check(context, target);
      assertScope(record, await scope(context, data.setId));
      signal?.throwIfAborted();
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
      const current = await findScoped(context, data.assetId, data.setId);
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
  async function finalizeUpload(
    context: Context,
    input: unknown,
    { signal }: ListeningMediaOperationOptions = {},
  ) {
    signal?.throwIfAborted();
    const data = parse(listeningMediaCompleteSchema, input);
    const target = {
      action: "store_original" as const,
      setId: data.setId,
      assetId: data.assetId,
    };
    await check(context, target);
    const record = await findScoped(context, data.assetId, data.setId);
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
    // One bounded original (64MiB maximum). PCM output is written in bounded chunks.
    const original = Buffer.alloc(record.totalBytes);
    let position = 0;
    for await (const piece of readAsset(
      store,
      record,
      0,
      record.totalBytes,
      limits.readChunkBytes,
      signal,
    )) {
      hash.update(piece);
      original.set(piece, position);
      position += piece.length;
    }
    await check(context, target);
    assertScope(record, await scope(context, data.setId));
    unexpired(record);
    if (hash.digest("hex") !== record.expectedSha256) {
      await store.compareAndSwap(record.assetId, record.revision, {
        ...record,
        revision: record.revision + 1,
        state: "failed",
      });
      throw new ListeningMediaError("hash_mismatch");
    }
    let inspection = inspectListeningMedia(
      original.subarray(0, 44),
      record.totalBytes,
      record.mimeType,
      limits.maxDurationMs,
    );
    let playback: ListeningMediaRecord["playback"];
    const staged: ListeningMediaChunkRecord[] = [];
    let committed = false;
    try {
      if (
        record.mimeType === "audio/mpeg" &&
        !inspection.playable &&
        inspection.blocker !== "type_signature_mismatch"
      ) {
        let offset = 44;
        try {
          if (record.mp3PlaybackEncoding === "scrubbed_mp3") {
            const decoded = await decodeMp3(
              original,
              limits,
              async () => {},
              signal,
            );
            const parsed = parseMp3(original, limits.maxDurationMs);
            const span = original.subarray(parsed.audioStart, parsed.audioEnd);
            playback = {
              revision: 1,
              mimeType: "audio/mpeg",
              sha256: digest(span),
              totalBytes: span.length,
              chunks: record.chunks.flatMap((chunk) => {
                const from = Math.max(parsed.audioStart, chunk.offset);
                const to = Math.min(
                  parsed.audioEnd,
                  chunk.offset + chunk.byteLength,
                );
                return from < to
                  ? [
                      {
                        ...chunk,
                        offset: from - parsed.audioStart,
                        byteLength: to - from,
                        blobOffset: from - chunk.offset,
                        sha256: digest(original.subarray(from, to)),
                      },
                    ]
                  : [];
              }),
            };
            inspection = { playable: true, durationMs: decoded.durationMs };
          } else {
            const outputChunkBytes = Math.max(64 * 1024, limits.chunkBytes);
            let pending = Buffer.alloc(outputChunkBytes);
            let pendingLength = 0;
            const flush = async () => {
              if (!pendingLength) return;
              signal?.throwIfAborted();
              const bytes = pending.subarray(0, pendingLength);
              const key = await store.putBlob(bytes, record);
              staged.push({
                key,
                offset,
                byteLength: bytes.length,
                sha256: digest(bytes),
                expectedRevision: record.revision,
              });
              offset += bytes.length;
              pending = Buffer.alloc(outputChunkBytes);
              pendingLength = 0;
            };
            const decoded = await decodeMp3(
              original,
              limits,
              async (pcm) => {
                for (let p = 0; p < pcm.length;) {
                  signal?.throwIfAborted();
                  const take = Math.min(
                    outputChunkBytes - pendingLength,
                    pcm.length - p,
                  );
                  pcm.copy(pending, pendingLength, p, p + take);
                  p += take;
                  pendingLength += take;
                  if (pendingLength === outputChunkBytes) await flush();
                }
              },
              signal,
            );
            await flush();
            const key = await store.putBlob(decoded.header, record);
            staged.unshift({
              key,
              offset: 0,
              byteLength: 44,
              sha256: digest(decoded.header),
              expectedRevision: record.revision,
            });
            const playbackHash = createHash("sha256");
            for await (const piece of readAsset(
              store,
              { chunks: staged },
              0,
              offset,
              limits.readChunkBytes,
              signal,
            ))
              playbackHash.update(piece);
            playback = {
              revision: 1,
              mimeType: "audio/wav",
              sha256: playbackHash.digest("hex"),
              totalBytes: offset,
              chunks: staged,
            };
            inspection = { playable: true, durationMs: decoded.durationMs };
          }
        } catch (error) {
          if (!(error instanceof MediaFormatError)) throw error;
          inspection = { playable: false, blocker: error.blocker };
        }
      } else if (inspection.playable) {
        if (record.totalBytes > limits.maxPlaybackBytes)
          inspection = { playable: false, blocker: "output_limit" };
        else
          playback = {
            revision: 1,
            mimeType: "audio/wav",
            sha256: record.expectedSha256,
            totalBytes: record.totalBytes,
            chunks: record.chunks,
          };
      }
      await check(context, target);
      assertScope(record, await scope(context, data.setId));
      signal?.throwIfAborted();
      unexpired(record);
      // Stored scope and the server clock at verification; never request-supplied values.
      const fields = {
        ...receipt({ ...record, revision: record.revision + 1 }),
        ownerId: record.ownerId,
        branchId: record.branchId,
        verifiedAt: now(),
      };
      const completion = listeningMediaCompletionSchema.parse(
        inspection.playable
          ? {
              ...fields,
              state: "ready",
              publishable: true,
              mimeType: playback!.mimeType,
              sha256: playback!.sha256,
              originalSha256: record.expectedSha256,
              playbackBytes: playback!.totalBytes,
              playbackRevision: playback!.revision,
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
        playback,
      };
      committed = await store.compareAndSwap(
        record.assetId,
        record.revision,
        next,
      );
      if (!committed) {
        await check(context, target);
        const current = await findScoped(context, data.assetId, data.setId);
        if (
          current.completion &&
          current.finalizedFromRevision === data.expectedRevision
        )
          return current.completion;
        throw new ListeningMediaError("conflict");
      }
      return completion;
    } catch (error) {
      // Another process may have sealed the asset while this decoder staged output.
      if (
        error instanceof ListeningMediaError &&
        ["conflict", "quota_exceeded"].includes(error.code)
      ) {
        await check(context, target);
        const current = await findScoped(context, data.assetId, data.setId);
        if (
          current.completion &&
          current.finalizedFromRevision === data.expectedRevision
        ) {
          if (current.state !== "ready") unexpired(current);
          return current.completion;
        }
      }
      throw error;
    } finally {
      // Also removes partial output after malformed input, quota, cancellation or a lost CAS.
      if (!committed || !playback) {
        for (const chunk of staged) await store.deleteBlob(chunk.key);
      }
    }
  }
  async function completeUpload(
    context: Context,
    input: unknown,
    options: ListeningMediaOperationOptions = {},
  ) {
    const data = parse(listeningMediaCompleteSchema, input);
    await check(context, {
      action: "store_original",
      setId: data.setId,
      assetId: data.assetId,
    });
    if (activeFinalizations >= 2) throw new ListeningMediaError("conflict");
    activeFinalizations++;
    try {
      return await finalizeUpload(context, data, options);
    } finally {
      activeFinalizations--;
    }
  }
  async function serve(
    context: Context,
    input: unknown,
    { signal }: ListeningMediaOperationOptions = {},
  ): Promise<Response> {
    signal?.throwIfAborted();
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
      record = await findScoped(context, request.assetId, request.setId);
    } catch (error) {
      if (error instanceof ListeningMediaError) return unavailable();
      throw error;
    }
    if (
      record.state !== "ready" ||
      record.completion?.state !== "ready" ||
      !record.playback ||
      record.playback.sha256 !== record.completion.sha256
    )
      return unavailable();
    const playback = record.playback;
    if (record.drive) {
      const drive = dependencies.drive;
      if (
        !drive ||
        record.ownerId !== drive.config.ownerId ||
        record.drive.ownerId !== record.ownerId ||
        record.drive.endExclusive - record.drive.start !==
          playback.totalBytes ||
        record.chunks.length ||
        playback.chunks.length
      )
        return unavailable();
      try {
        await drive.check(record.drive);
      } catch {
        return unavailable();
      }
    }
    const headers = new Headers({
      ...securityHeaders,
      "Accept-Ranges": "bytes",
      "Content-Type": playback.mimeType,
      "Content-Disposition": `inline; filename="audio-${record.assetId}.${playback.mimeType === "audio/mpeg" ? "mp3" : "wav"}"`,
      ETag: `"${playback.sha256}"`,
    });
    // RFC 9110 §14.2: Range applies to GET only (HEAD ignores it and never opens a blob). An
    // unknown range unit or an unsupported multi-range set is ignored and the authorized full
    // representation is sent; an invalid or unsatisfiable `bytes` specifier is rejected with 416.
    const decision =
      request.method === "GET" && request.range != null
        ? decideListeningRange(request.range, playback.totalBytes)
        : null;
    if (decision?.kind === "reject") {
      headers.set("Content-Range", `bytes */${playback.totalBytes}`);
      return new Response(null, { status: 416, headers });
    }
    const partial = decision?.kind === "single";
    const range =
      decision?.kind === "single"
        ? decision.range
        : { start: 0, endExclusive: playback.totalBytes };
    headers.set("Content-Length", String(range.endExclusive - range.start));
    if (partial)
      headers.set(
        "Content-Range",
        `bytes ${range.start}-${range.endExclusive - 1}/${playback.totalBytes}`,
      );
    return new Response(
      request.method === "HEAD"
        ? null
        : responseStream(
            (streamSignal) =>
              record.drive
                ? dependencies.drive!.read(
                    record.drive,
                    range.start,
                    range.endExclusive,
                    streamSignal,
                  )
                : readAsset(
                    store,
                    playback,
                    range.start,
                    range.endExclusive,
                    limits.readChunkBytes,
                    streamSignal,
                  ),
            signal,
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
    const record = await findScoped(context, data.assetId, data.setId);
    return record.state === "ready" &&
      record.completion?.state === "ready" &&
      record.playback?.sha256 === record.completion.sha256
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
      for (const key of new Set(
        [...record.chunks, ...(record.playback?.chunks ?? [])].map(
          (chunk) => chunk.key,
        ),
      ))
        await store.deleteBlob(key);
      if (
        await store.compareAndSwap(record.assetId, tombstone.revision, {
          ...tombstone,
          chunks: [],
          playback: undefined,
          revision: tombstone.revision + 1,
        })
      )
        cleaned++;
    }
    await store.cleanupOrphanBlobs?.(now(), limit);
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
