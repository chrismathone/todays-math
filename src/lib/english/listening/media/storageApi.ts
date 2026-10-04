/** Private Supabase Storage transport. No SDK, public URLs, or browser credentials. */
import "server-only";
import { createHash, randomUUID } from "node:crypto";
export interface ListeningStorageConfig {
  url: string;
  serviceKey: string;
  bucket: string;
}
export interface ListeningStorageRef {
  bucket: string;
  key: string;
  ownerId: string;
  etag: string;
  bytes: number;
  sha256: string;
  start: number;
  endExclusive: number;
}
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const keyPattern = new RegExp(`^(${uuid})/(${uuid})/(${uuid})$`);
const failed = () =>
  new Error("비공개 듣기 음원 저장소를 확인하지 못했습니다.");
function authHeaders(key: string): Record<string, string> {
  if (!key || /[\s\x00-\x1f\x7f]/.test(key)) throw failed();
  if (/^sb_secret_[A-Za-z0-9_-]+$/.test(key)) return { apikey: key };
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
    try {
      if (
        JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
          .role === "service_role"
      )
        return { apikey: key, Authorization: `Bearer ${key}` };
    } catch {}
  }
  throw failed();
}
export function readListeningStorageConfig(
  env: Record<string, string | undefined> = process.env,
): ListeningStorageConfig | null {
  const url = (
    env.ENGLISH_LISTENING_STORAGE_URL ??
    env.SUPABASE_URL ??
    env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/$/, "");
  const serviceKey =
    env.ENGLISH_LISTENING_STORAGE_SERVICE_KEY ||
    env.SUPABASE_SECRET_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket =
    env.ENGLISH_LISTENING_STORAGE_BUCKET ?? "english-listening-private";
  if (
    !url ||
    !/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url) ||
    !serviceKey ||
    !/^[-a-z0-9]{3,63}$/.test(bucket)
  )
    return null;
  authHeaders(serviceKey);
  return { url, serviceKey, bucket };
}
export function createListeningStorageApi(
  config: ListeningStorageConfig,
  fetchImpl: typeof fetch = fetch,
) {
  if (
    !/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(config.url) ||
    !/^[-a-z0-9]{3,63}$/.test(config.bucket)
  )
    throw failed();
  const credentials = authHeaders(config.serviceKey);
  const base = `${config.url}/storage/v1`,
    direct = config.url.replace(".supabase.co", ".storage.supabase.co"),
    tus = `${direct}/storage/v1/upload/resumable`;
  const request = async (url: string, init: RequestInit = {}) => {
    const target = new URL(url);
    if (
      ![new URL(config.url).origin, new URL(direct).origin].includes(
        target.origin,
      ) ||
      target.username ||
      target.password
    )
      throw failed();
    try {
      return await fetchImpl(url, {
        ...init,
        redirect: "error",
        cache: "no-store",
        signal: init.signal
          ? AbortSignal.any([init.signal, AbortSignal.timeout(120000)])
          : AbortSignal.timeout(120000),
        headers: {
          ...Object.fromEntries(new Headers(init.headers)),
          ...credentials,
        },
      });
    } catch {
      throw failed();
    }
  };
  const json = async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
      await response.body?.cancel();
      throw failed();
    }
    try {
      return (await response.json()) as T;
    } catch {
      throw failed();
    }
  };
  const privateBucket = async (signal?: AbortSignal) => {
    signal?.throwIfAborted();
    const value = await json<{ id?: string; public?: boolean }>(
      await request(`${base}/bucket/${config.bucket}`, { signal }),
    );
    signal?.throwIfAborted();
    if (value.id !== config.bucket || value.public !== false) throw failed();
  };
  const object = (
    ref: Pick<ListeningStorageRef, "bucket" | "key" | "ownerId">,
  ) => {
    const match = keyPattern.exec(ref.key);
    if (ref.bucket !== config.bucket || !match || match[1] !== ref.ownerId)
      throw failed();
    return `${base}/object/authenticated/${config.bucket}/${ref.key}`;
  };
  const validateRef = (ref: ListeningStorageRef) => {
    if (
      !Number.isSafeInteger(ref.bytes) ||
      ref.bytes <= 0 ||
      ref.bytes > 336 * 1024 * 1024 ||
      !Number.isSafeInteger(ref.start) ||
      !Number.isSafeInteger(ref.endExclusive) ||
      ref.start < 0 ||
      ref.start >= ref.endExclusive ||
      ref.endExclusive > ref.bytes ||
      !/^\"[^\"\r\n]{1,200}\"$/.test(ref.etag) ||
      !/^[a-f0-9]{64}$/.test(ref.sha256)
    )
      throw failed();
    return object(ref);
  };
  const check = async (ref: ListeningStorageRef) => {
    const url = validateRef(ref);
    await privateBucket();
    const response = await request(url, {
      method: "HEAD",
      headers: { "If-Match": ref.etag },
    });
    if (
      !response.ok ||
      Number(response.headers.get("content-length")) !== ref.bytes ||
      response.headers.get("etag") !== ref.etag
    )
      throw failed();
  };
  const validateRead = (
    ref: ListeningStorageRef,
    start: number,
    endExclusive: number,
  ) => {
    const url = validateRef(ref);
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(endExclusive) ||
      start < 0 ||
      start >= endExclusive ||
      endExclusive > ref.endExclusive - ref.start
    )
      throw failed();
    return url;
  };
  const read = async function* (
    ref: ListeningStorageRef,
    start: number,
    endExclusive: number,
    signal?: AbortSignal,
  ) {
    signal?.throwIfAborted();
    const url = validateRead(ref, start, endExclusive);
    const from = ref.start + start,
      to = ref.start + endExclusive - 1;
    const response = await request(url, {
      headers: {
        Range: `bytes=${from}-${to}`,
        "If-Match": ref.etag,
        "Accept-Encoding": "identity",
      },
      signal,
    });
    if (
      response.status !== 206 ||
      response.headers.get("content-range") !==
        `bytes ${from}-${to}/${ref.bytes}` ||
      Number(response.headers.get("content-length")) !== to - from + 1 ||
      response.headers.get("etag") !== ref.etag ||
      !response.body
    ) {
      await response.body?.cancel();
      throw failed();
    }
    const reader = response.body.getReader();
    let remaining = to - from + 1;
    try {
      while (true) {
        signal?.throwIfAborted();
        const next = await reader.read();
        signal?.throwIfAborted();
        if (next.done) break;
        if (next.value.length > remaining) throw failed();
        remaining -= next.value.length;
        for (let i = 0; i < next.value.length; i += 1024 * 1024)
          yield next.value.subarray(i, i + 1024 * 1024);
      }
      if (remaining) throw failed();
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  };
  const readPrivate = async function* (
    ref: ListeningStorageRef,
    start: number,
    endExclusive: number,
    signal?: AbortSignal,
  ) {
    signal?.throwIfAborted();
    validateRead(ref, start, endExclusive);
    // Recheck privacy on every chunk read. The conditional GET verifies ETag
    // and total/range lengths itself, without a preceding HEAD or cached checks.
    await privateBucket(signal);
    yield* read(ref, start, endExclusive, signal);
  };
  const remove = async (
    ref: Pick<ListeningStorageRef, "bucket" | "key" | "ownerId">,
  ) => {
    object(ref);
    await json(
      await request(`${base}/object/${config.bucket}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [ref.key] }),
      }),
    );
  };
  const upload = async (input: {
    ownerId: string;
    assetId: string;
    bytes: number;
    mimeType: "audio/wav" | "audio/mpeg" | "audio/mp4";
    read: () => AsyncIterable<Uint8Array>;
  }): Promise<ListeningStorageRef> => {
    const key = `${input.ownerId}/${input.assetId}/${randomUUID()}`,
      scope = { bucket: config.bucket, key, ownerId: input.ownerId };
    object(scope);
    if (
      !Number.isSafeInteger(input.bytes) ||
      input.bytes < 1 ||
      input.bytes > 336 * 1024 * 1024
    )
      throw failed();
    await privateBucket();
    const metadata = Object.entries({
      bucketName: config.bucket,
      objectName: key,
      contentType: input.mimeType,
      cacheControl: "0",
    })
      .map(([k, v]) => `${k} ${Buffer.from(v).toString("base64")}`)
      .join(",");
    const started = await request(tus, {
      method: "POST",
      headers: {
        "Tus-Resumable": "1.0.0",
        "Upload-Length": String(input.bytes),
        "Upload-Metadata": metadata,
        "x-upsert": "false",
      },
    });
    const location = started.headers.get("location");
    if (started.status !== 201 || !location) throw failed();
    const session = new URL(location, tus);
    if (
      session.origin !== new URL(direct).origin ||
      !session.pathname.startsWith("/storage/v1/upload/resumable/")
    )
      throw failed();
    let offset = 0,
      pending = Buffer.alloc(0);
    const hash = createHash("sha256");
    const put = async (part: Buffer) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        let result: Response | undefined;
        try {
          result = await request(session.href, {
            method: "PATCH",
            headers: {
              "Tus-Resumable": "1.0.0",
              "Upload-Offset": String(offset),
              "Content-Type": "application/offset+octet-stream",
            },
            body: new Uint8Array(part),
          });
        } catch {}
        if (
          result?.status === 204 &&
          Number(result.headers.get("upload-offset")) === offset + part.length
        ) {
          hash.update(part);
          offset += part.length;
          return;
        }
        if (result && ![429, 500, 502, 503, 504].includes(result.status)) {
          await result.body?.cancel();
          throw failed();
        }
        await result?.body?.cancel();
        const status = await request(session.href, {
          method: "HEAD",
          headers: { "Tus-Resumable": "1.0.0" },
        });
        const acknowledged = Number(status.headers.get("upload-offset"));
        if (status.ok && acknowledged === offset + part.length) {
          hash.update(part);
          offset = acknowledged;
          return;
        }
        if (!status.ok || acknowledged !== offset) throw failed();
      }
      throw failed();
    };
    try {
      for await (const part of input.read()) {
        if (
          part.length > 1024 * 1024 ||
          offset + pending.length + part.length > input.bytes
        )
          throw failed();
        pending = Buffer.concat([pending, part]);
        while (pending.length >= 6 * 1024 * 1024) {
          await put(pending.subarray(0, 6 * 1024 * 1024));
          pending = pending.subarray(6 * 1024 * 1024);
        }
      }
      if (pending.length) await put(pending);
      if (offset !== input.bytes) throw failed();
      const response = await request(object(scope), { method: "HEAD" }),
        etag = response.headers.get("etag");
      if (
        !response.ok ||
        Number(response.headers.get("content-length")) !== input.bytes ||
        !etag
      )
        throw failed();
      const ref: ListeningStorageRef = {
        ...scope,
        etag,
        bytes: input.bytes,
        sha256: hash.digest("hex"),
        start: 0,
        endExclusive: input.bytes,
      };
      await check(ref);
      // Verify the remote object, not only local sent bytes or an untrusted receipt.
      const remote = createHash("sha256");
      for await (const part of read(ref, 0, ref.bytes)) remote.update(part);
      if (remote.digest("hex") !== ref.sha256) throw failed();
      return ref;
    } catch (error) {
      await remove(scope).catch(() => {});
      throw error;
    }
  };
  /** Immutable <=1MiB object at a durable preallocated key. Ambiguous POST replies
   * are reconciled by HEAD and a remote SHA read, never by replacing the object. */
  const uploadChunk = async (input: {
    ownerId: string;
    assetId: string;
    key: string;
    bytes: Uint8Array;
    mimeType: "audio/wav" | "audio/mpeg" | "audio/mp4";
    signal?: AbortSignal;
  }): Promise<ListeningStorageRef> => {
    const scope = {
      bucket: config.bucket,
      ownerId: input.ownerId,
      key: `${input.ownerId}/${input.assetId}/${input.key}`,
    };
    const url = object(scope);
    if (
      input.bytes.byteLength < 1 ||
      input.bytes.byteLength > 1024 * 1024 ||
      !["audio/wav", "audio/mpeg", "audio/mp4"].includes(input.mimeType)
    )
      throw failed();
    const sha256 = createHash("sha256").update(input.bytes).digest("hex");
    await privateBucket();
    for (let attempt = 0; attempt < 3; attempt++) {
      input.signal?.throwIfAborted();
      try {
        const response = await request(
          `${base}/object/${config.bucket}/${scope.key}`,
          {
            method: "POST",
            signal: input.signal,
            headers: {
              "Content-Type": input.mimeType,
              "Cache-Control": "no-store",
              "x-upsert": "false",
            },
            body: new Uint8Array(input.bytes),
          },
        );
        await response.body?.cancel();
      } catch {
        input.signal?.throwIfAborted();
      }
      const response = await request(url, {
        method: "HEAD",
        signal: input.signal,
      });
      if (response.status === 404) {
        await response.body?.cancel();
        continue;
      }
      const etag = response.headers.get("etag");
      if (
        !response.ok ||
        !etag ||
        Number(response.headers.get("content-length")) !==
          input.bytes.byteLength
      )
        throw failed();
      const ref: ListeningStorageRef = {
        ...scope,
        etag,
        bytes: input.bytes.byteLength,
        sha256,
        start: 0,
        endExclusive: input.bytes.byteLength,
      };
      await check(ref);
      const hash = createHash("sha256");
      for await (const bytes of read(ref, 0, ref.bytes, input.signal))
        hash.update(bytes);
      if (hash.digest("hex") !== sha256) throw failed();
      return ref;
    }
    throw failed();
  };
  return { config, check, read, readPrivate, upload, uploadChunk, remove };
}
export type ListeningStorageApi = ReturnType<typeof createListeningStorageApi>;
