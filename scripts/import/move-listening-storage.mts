/** Private bucket migration. Run with environment variables supplied by the operator;
 * importing this module never loads .env or performs network/file mutations.
 * REST contracts: https://supabase.com/docs/reference/javascript/file-buckets-list
 * https://supabase.com/docs/reference/self-hosting-storage/search-for-objects-under-a-prefix
 */
import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, rename, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BUCKET = "english-listening-private",
  MAX_OBJECT_BYTES = 50 * 1024 * 1024,
  MAX_OBJECTS = 50000,
  MAX_TOTAL_BYTES = 100 * 1024 ** 3,
  PAGE_SIZE = 100;
const OLD_ORIGIN = "https://yqbycslqbfcsxrlhjjlq.supabase.co";
type Endpoint = { url: string; key: string };
export type ListeningStorageMoveConfig = { source: Endpoint; target: Endpoint };
type InventoryObject = {
  key: string;
  id: string;
  bytes: number;
  mime: string | null;
};
type VerifiedObject = {
  key: string;
  bytes: number;
  mime: string;
  sha256: string;
  sourceEtag: string;
  targetEtag: string | null;
  targetVerified: boolean;
  sourceDeleted: boolean;
};
type Checkpoint = {
  version: 1;
  sourceOrigin: string;
  targetOrigin: string;
  bucket: typeof BUCKET;
  prefix: string;
  entries: VerifiedObject[];
  verifiedAll: boolean;
  cleanupStarted: boolean;
  cleanupComplete: boolean;
  updatedAt: string;
};
export interface ListeningStorageMoveOptions {
  apply?: boolean;
  deleteSource?: boolean;
  prefix?: string;
  checkpointPath?: string;
  signal?: AbortSignal;
  concurrency?: number;
}
export interface ListeningStorageMoveResult {
  mode: "read_only" | "applied" | "key_rotation" | "empty_source";
  sourceCount: number;
  totalBytes: number;
  copied: number;
  reused: number;
  verified: number;
  deleted: number;
}
function failure(message: string): never {
  throw new Error(message);
}
function origin(value: string | undefined, label: string) {
  const url = value?.replace(/\/+$/, "");
  if (!url || !/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url))
    failure(`${label} must be a Supabase HTTPS project origin.`);
  return url;
}
function credentials(
  value: string | undefined,
  label: string,
): Record<string, string> {
  if (value && /^sb_secret_[A-Za-z0-9_-]+$/.test(value))
    return { apikey: value };
  if (value && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
    try {
      if (
        JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString())
          .role === "service_role"
      )
        return { apikey: value, Authorization: `Bearer ${value}` };
    } catch {}
  }
  return failure(
    `${label} requires a server secret or service_role key; publishable and anon keys are refused.`,
  );
}
export function readListeningStorageMoveConfig(
  env: Record<string, string | undefined>,
): ListeningStorageMoveConfig {
  const sourceKey = env.SUPABASE_SECRET_KEY2 || env.SUPABASE_SERVICE_ROLE_KEY2,
    targetKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  credentials(sourceKey, "SUPABASE_SECRET_KEY2");
  credentials(targetKey, "SUPABASE_SECRET_KEY");
  return {
    source: {
      url: origin(env.SUPABASE_URL2 || OLD_ORIGIN, "SUPABASE_URL2"),
      key: sourceKey!,
    },
    target: { url: origin(env.SUPABASE_URL, "SUPABASE_URL"), key: targetKey! },
  };
}
function safeKey(key: string, folder = false) {
  if (
    !key ||
    key.length > 1024 ||
    /[\x00-\x1f\x7f\\]/.test(key) ||
    key.startsWith("/") ||
    key.endsWith("/") ||
    key
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..") ||
    key.split("/").length > 20
  )
    failure(`Invalid ${folder ? "folder" : "object"} path.`);
  return key;
}
const encoded = (key: string) =>
  safeKey(key).split("/").map(encodeURIComponent).join("/");
const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
function sameInventory(a: InventoryObject[], b: InventoryObject[]) {
  return (
    a.length === b.length &&
    a.every((row, index) => JSON.stringify(row) === JSON.stringify(b[index]))
  );
}
async function limited<T, U>(
  values: T[],
  count: number,
  operation: (value: T) => Promise<U>,
): Promise<U[]> {
  const result = new Array<U>(values.length);
  let next = 0,
    error: unknown;
  const workers = Array.from(
    { length: Math.min(count, values.length) },
    async () => {
      while (error === undefined && next < values.length) {
        const index = next++;
        try {
          result[index] = await operation(values[index]);
        } catch (cause) {
          error = cause;
        }
      }
    },
  );
  await Promise.allSettled(workers);
  if (error !== undefined) throw error;
  return result;
}
async function boundedBody(
  response: Response,
  max: number,
  signal?: AbortSignal,
) {
  if (!response.body) failure("Storage response body is missing.");
  const reader = response.body.getReader(),
    parts: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > max) failure("Storage response exceeds the byte bound.");
      parts.push(Buffer.from(next.value));
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return Buffer.concat(parts, size);
}
function transport(
  endpoint: Endpoint,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
) {
  const headers = credentials(endpoint.key, "Storage key"),
    base = `${origin(endpoint.url, "Storage origin")}/storage/v1`;
  const request = async (route: string, init: RequestInit = {}) => {
    signal?.throwIfAborted();
    try {
      return await fetchImpl(base + route, {
        ...init,
        redirect: "error",
        cache: "no-store",
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(120000)])
          : AbortSignal.timeout(120000),
        headers: {
          ...Object.fromEntries(new Headers(init.headers)),
          ...headers,
        },
      });
    } catch {
      signal?.throwIfAborted();
      return failure(
        "Storage request failed; source cleanup has not been authorized by this failure.",
      );
    }
  };
  const json = async <T,>(response: Response): Promise<T> => {
    if (!response.ok) {
      await response.body?.cancel();
      failure(`Storage request returned HTTP ${response.status}.`);
    }
    try {
      return JSON.parse(
        (await boundedBody(response, 1024 * 1024, signal)).toString(),
      ) as T;
    } catch {
      return failure("Storage JSON response is invalid or incomplete.");
    }
  };
  const privateBucket = async (allowMissing = false) => {
    const response = await request(`/bucket/${BUCKET}`);
    if (response.status === 404 && allowMissing) {
      await response.body?.cancel();
      return false;
    }
    const value = await json<{ id?: string; public?: boolean }>(response);
    if (value.id !== BUCKET || value.public !== false)
      failure("Listening bucket must exist and remain private.");
    return true;
  };
  const inventory = async (prefix: string) => {
    const pending = [prefix],
      seenFolders = new Set<string>(),
      files = new Map<string, InventoryObject>();
    let visited = 0;
    while (pending.length) {
      const folder = pending.shift()!;
      if (seenFolders.has(folder)) failure("Repeated Storage folder.");
      seenFolders.add(folder);
      if (seenFolders.size > MAX_OBJECTS)
        failure("Storage folder limit exceeded.");
      let offset = 0;
      const names = new Set<string>();
      while (true) {
        const page = await json<unknown>(
          await request(`/object/list/${BUCKET}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              prefix: folder,
              limit: PAGE_SIZE,
              offset,
              sortBy: { column: "name", order: "asc" },
            }),
          }),
        );
        if (!Array.isArray(page) || page.length > PAGE_SIZE)
          failure("Invalid Storage pagination page.");
        if (page.length === 0) break;
        for (const unknownRow of page) {
          if (!unknownRow || typeof unknownRow !== "object")
            failure("Invalid Storage inventory row.");
          const row = unknownRow as {
            name?: unknown;
            id?: unknown;
            metadata?: { size?: unknown; mimetype?: unknown } | null;
          };
          if (
            typeof row.name !== "string" ||
            row.name.includes("/") ||
            names.has(row.name)
          )
            failure("Incomplete or repeated Storage pagination.");
          names.add(row.name);
          const key = safeKey(folder ? `${folder}/${row.name}` : row.name);
          if (++visited > MAX_OBJECTS * 2)
            failure("Storage inventory limit exceeded.");
          if (row.id === null && row.metadata === null) {
            pending.push(key);
            continue;
          }
          if (
            typeof row.id !== "string" ||
            !row.id ||
            !row.metadata ||
            typeof row.metadata.size !== "number" ||
            !Number.isSafeInteger(row.metadata.size) ||
            row.metadata.size < 1
          )
            failure("Storage file metadata is incomplete.");
          if (files.has(key) || files.size >= MAX_OBJECTS)
            failure("Storage object inventory is duplicated or too large.");
          files.set(key, {
            key,
            id: row.id,
            bytes: row.metadata.size,
            mime:
              typeof row.metadata.mimetype === "string"
                ? row.metadata.mimetype
                : null,
          });
        }
        offset += page.length;
      }
    }
    return [...files.values()].sort((a, b) =>
      a.key < b.key ? -1 : a.key > b.key ? 1 : 0,
    );
  };
  const head = async (key: string, allowMissing = false) => {
    const response = await request(
      `/object/authenticated/${BUCKET}/${encoded(key)}`,
      { method: "HEAD" },
    );
    if (response.status === 404 && allowMissing) {
      await response.body?.cancel();
      return null;
    }
    if (!response.ok) {
      await response.body?.cancel();
      failure(`Storage object HEAD returned HTTP ${response.status}.`);
    }
    const rawSize = response.headers.get("content-length"),
      bytes = rawSize === null ? NaN : Number(rawSize),
      mime = response.headers.get("content-type"),
      etag = response.headers.get("etag");
    if (
      !Number.isSafeInteger(bytes) ||
      bytes < 1 ||
      bytes > MAX_OBJECT_BYTES ||
      !mime ||
      !/^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+(?:;[^\r\n]*)?$/.test(
        mime,
      ) ||
      !etag ||
      !/^"[^"\r\n]{1,200}"$/.test(etag)
    )
      failure(
        "Storage object exceeds 50MiB or has invalid size/MIME/ETag metadata.",
      );
    return { bytes, mime, etag };
  };
  const read = async (
    key: string,
    metadata: NonNullable<Awaited<ReturnType<typeof head>>>,
  ) => {
    const response = await request(
      `/object/authenticated/${BUCKET}/${encoded(key)}`,
      { headers: { "If-Match": metadata.etag, "Accept-Encoding": "identity" } },
    );
    if (
      response.status !== 200 ||
      response.headers.get("content-length") !== String(metadata.bytes) ||
      response.headers.get("content-type") !== metadata.mime ||
      response.headers.get("etag") !== metadata.etag
    ) {
      await response.body?.cancel();
      failure("Storage object changed during bounded read.");
    }
    const bytes = await boundedBody(response, metadata.bytes, signal);
    if (bytes.length !== metadata.bytes)
      failure("Storage object stream was truncated.");
    return bytes;
  };
  const verify = async (
    entry: Pick<VerifiedObject, "key" | "bytes" | "mime" | "sha256">,
  ) => {
    const metadata = await head(entry.key, true);
    if (!metadata) return false;
    if (metadata.bytes !== entry.bytes || metadata.mime !== entry.mime)
      failure(
        "Existing target object collides in size or MIME; no overwrite is permitted.",
      );
    if (digest(await read(entry.key, metadata)) !== entry.sha256)
      failure(
        "Existing target object collides in SHA; no overwrite is permitted.",
      );
    return metadata;
  };
  const upload = async (entry: VerifiedObject, bytes: Buffer) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      let status = 0;
      try {
        const response = await request(
          `/object/${BUCKET}/${encoded(entry.key)}`,
          {
            method: "POST",
            headers: {
              "content-type": entry.mime,
              "x-upsert": "false",
              "cache-control": "no-store",
            },
            body: new Uint8Array(bytes),
          },
        );
        status = response.status;
        await response.body?.cancel();
      } catch {
        signal?.throwIfAborted();
      }
      // Reconcile a missing response or concurrent identical upload without any replacement.
      if (await verify(entry)) return;
      if (status && ![429, 500, 502, 503, 504].includes(status))
        failure(
          `Target upload returned HTTP ${status} without an identical object.`,
        );
    }
    failure("Target upload did not produce a verified immutable object.");
  };
  return {
    request,
    json,
    privateBucket,
    inventory,
    head,
    read,
    verify,
    upload,
  };
}

export async function moveListeningStorage(
  config: ListeningStorageMoveConfig,
  options: ListeningStorageMoveOptions = {},
  dependencies: {
    fetchImpl?: typeof fetch;
    onProgress?: (progress: {
      stage: string;
      completed: number;
      total: number;
    }) => void;
  } = {},
): Promise<ListeningStorageMoveResult> {
  credentials(config.source.key, "Source key");
  credentials(config.target.key, "Target key");
  config = {
    source: {
      ...config.source,
      url: origin(config.source.url, "Source origin"),
    },
    target: {
      ...config.target,
      url: origin(config.target.url, "Target origin"),
    },
  };
  if (options.deleteSource && !options.apply)
    failure("--delete-source requires --apply.");
  if (config.source.url === config.target.url)
    return {
      mode: "key_rotation",
      sourceCount: 0,
      totalBytes: 0,
      copied: 0,
      reused: 0,
      verified: 0,
      deleted: 0,
    };
  if (options.apply && !options.checkpointPath)
    failure("--apply requires a durable local checkpoint path.");
  const concurrency = options.concurrency ?? 4;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4)
    failure("Concurrency must be between 1 and 4.");
  const prefix = options.prefix
      ? safeKey(options.prefix.replace(/\/$/, ""), true)
      : "",
    fetchImpl = dependencies.fetchImpl ?? fetch;
  const source = transport(config.source, fetchImpl, options.signal),
    target = transport(config.target, fetchImpl, options.signal);
  if (!(await source.privateBucket(true)))
    return {
      mode: "empty_source",
      sourceCount: 0,
      totalBytes: 0,
      copied: 0,
      reused: 0,
      verified: 0,
      deleted: 0,
    };
  const targetExists = await target.privateBucket(true);
  const inventory = await source.inventory(prefix),
    confirmation = await source.inventory(prefix);
  if (!sameInventory(inventory, confirmation))
    failure(
      "Source inventory changed or pagination was incomplete; nothing may be deleted.",
    );
  let checkpoint: Checkpoint | undefined;
  if (options.apply && options.checkpointPath) {
    try {
      if ((await stat(options.checkpointPath)).size > 64 * 1024 * 1024)
        failure("Checkpoint exceeds the local byte bound.");
      const candidate = JSON.parse(
        await readFile(options.checkpointPath, "utf8"),
      ) as Checkpoint;
      if (
        candidate.version !== 1 ||
        candidate.sourceOrigin !== config.source.url ||
        candidate.targetOrigin !== config.target.url ||
        candidate.bucket !== BUCKET ||
        candidate.prefix !== prefix ||
        !Array.isArray(candidate.entries) ||
        candidate.entries.length > MAX_OBJECTS
      )
        failure("Checkpoint belongs to a different migration or is malformed.");
      const names = new Set<string>();
      for (const entry of candidate.entries) {
        safeKey(entry.key);
        if (
          names.has(entry.key) ||
          !Number.isSafeInteger(entry.bytes) ||
          entry.bytes < 1 ||
          entry.bytes > MAX_OBJECT_BYTES ||
          typeof entry.mime !== "string" ||
          !/^[a-f0-9]{64}$/.test(entry.sha256) ||
          typeof entry.sourceDeleted !== "boolean" ||
          typeof entry.targetVerified !== "boolean" ||
          typeof entry.sourceEtag !== "string" ||
          (entry.targetEtag !== null && typeof entry.targetEtag !== "string")
        )
          failure("Checkpoint object proof is malformed.");
        names.add(entry.key);
      }
      if (
        candidate.entries.reduce((sum, row) => sum + row.bytes, 0) >
        MAX_TOTAL_BYTES
      )
        failure("Checkpoint exceeds migration byte bound.");
      checkpoint = candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  if (
    checkpoint?.cleanupStarted &&
    inventory.some(
      (row) => !checkpoint!.entries.some((entry) => entry.key === row.key),
    )
  )
    failure(
      "New source objects appeared after cleanup began; refusing further deletion.",
    );
  // Validate every source object's actual headers and total budget before creating a bucket.
  const metadata = await limited(inventory, concurrency, async (row) => {
    if (row.bytes > MAX_OBJECT_BYTES)
      failure(
        "Source contains an object larger than 50MiB; no writes performed.",
      );
    const value = (await source.head(row.key))!;
    if (
      value.bytes !== row.bytes ||
      (row.mime !== null && row.mime !== value.mime)
    )
      failure("Source inventory and actual object metadata differ.");
    return { row, ...value };
  });
  const totalBytes = metadata.reduce((sum, row) => sum + row.bytes, 0);
  if (totalBytes > MAX_TOTAL_BYTES)
    failure("Source exceeds the 100GiB migration byte bound.");
  if (targetExists) await target.inventory(prefix); // Complete pagination proof before any destination writes.
  let completed = 0;
  const current = await limited(metadata, concurrency, async (value) => {
    const bytes = await source.read(value.row.key, value),
      entry: VerifiedObject = {
        key: value.row.key,
        bytes: value.bytes,
        mime: value.mime,
        sha256: digest(bytes),
        sourceEtag: value.etag,
        targetEtag: null,
        targetVerified: false,
        sourceDeleted: false,
      };
    if (targetExists) {
      const proof = await target.verify(entry);
      if (proof) {
        entry.targetEtag = proof.etag;
        entry.targetVerified = true;
      }
    } // Collision preflight, including full remote SHA.
    dependencies.onProgress?.({
      stage: "preflight",
      completed: ++completed,
      total: metadata.length,
    });
    return entry;
  });
  const remainingKeys = new Set(current.map((row) => row.key)),
    previousMissing = checkpoint?.cleanupStarted
      ? checkpoint.entries.filter((row) => !remainingKeys.has(row.key))
      : [];
  for (const entry of previousMissing) {
    if (await source.head(entry.key, true))
      failure("Source pagination omitted an existing checkpoint object.");
    if (!targetExists || !(await target.verify(entry)))
      failure(
        "An earlier verified destination disappeared during cleanup resume.",
      );
    entry.sourceDeleted = true;
  }
  const entries = [...current, ...previousMissing].sort((a, b) =>
    a.key < b.key ? -1 : a.key > b.key ? 1 : 0,
  );
  if (entries.reduce((sum, row) => sum + row.bytes, 0) > MAX_TOTAL_BYTES)
    failure("Checkpoint exceeds migration byte bound.");
  const result: ListeningStorageMoveResult = {
    mode: options.apply ? "applied" : "read_only",
    sourceCount: entries.length,
    totalBytes: entries.reduce((sum, row) => sum + row.bytes, 0),
    copied: 0,
    reused: 0,
    verified: 0,
    deleted: previousMissing.length,
  };
  if (!entries.length) return { ...result, mode: "empty_source" };
  if (!options.apply) return result;
  checkpoint = {
    version: 1,
    sourceOrigin: config.source.url,
    targetOrigin: config.target.url,
    bucket: BUCKET,
    prefix,
    entries,
    verifiedAll: false,
    cleanupStarted: checkpoint?.cleanupStarted ?? false,
    cleanupComplete: false,
    updatedAt: new Date().toISOString(),
  };
  let persistQueue = Promise.resolve();
  const persist = () => {
    if (!options.checkpointPath) return Promise.resolve();
    const snapshot =
      JSON.stringify(
        { ...checkpoint, updatedAt: new Date().toISOString() },
        null,
        2,
      ) + "\n";
    persistQueue = persistQueue.then(async () => {
      const filename = path.resolve(options.checkpointPath!),
        temporary = filename + `.tmp-${randomUUID()}`;
      await mkdir(path.dirname(filename), { recursive: true });
      await writeFile(temporary, snapshot, { mode: 0o600 });
      await rename(temporary, filename);
    });
    return persistQueue;
  };
  await persist();
  if (!targetExists) {
    await target.json(
      await target.request("/bucket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: BUCKET,
          name: BUCKET,
          public: false,
          file_size_limit: MAX_OBJECT_BYTES,
        }),
      }),
    );
    await target.privateBucket();
  }
  completed = 0;
  await limited(current, concurrency, async (entry) => {
    if (await target.verify(entry)) result.reused++;
    else {
      const value = metadata.find((row) => row.row.key === entry.key)!;
      const bytes = await source.read(entry.key, value);
      if (digest(bytes) !== entry.sha256)
        failure("Source changed after preflight; cleanup prohibited.");
      await target.upload(entry, bytes);
      result.copied++;
    }
    result.verified++;
    entry.targetEtag = (await target.head(entry.key))!.etag;
    entry.targetVerified = true;
    await persist();
    dependencies.onProgress?.({
      stage: "copy",
      completed: ++completed,
      total: current.length,
    });
  });
  await source.privateBucket();
  await target.privateBucket();
  const finalSource = await source.inventory(prefix);
  if (!sameInventory(inventory, finalSource))
    failure("Source inventory changed before cleanup; source preserved.");
  const targetInventory = await target.inventory(prefix),
    targetNames = new Set(targetInventory.map((row) => row.key));
  if (entries.some((row) => !targetNames.has(row.key)))
    failure("Final target inventory does not contain every source object.");
  // Full source and destination bytes are checked again after every copy has finished.
  await limited(entries, concurrency, async (entry) => {
    const proof = await target.verify(entry);
    if (!proof) failure("Target verification is incomplete.");
    entry.targetEtag = proof.etag;
    entry.targetVerified = true;
    if (!entry.sourceDeleted) {
      const value = (await source.head(entry.key))!;
      if (
        value.bytes !== entry.bytes ||
        value.mime !== entry.mime ||
        digest(await source.read(entry.key, value)) !== entry.sha256
      )
        failure("Source changed before cleanup.");
    }
  });
  checkpoint.verifiedAll = true;
  result.verified = entries.length;
  await persist();
  if (!options.deleteSource) return result;
  checkpoint.cleanupStarted = true;
  await persist();
  // Never empty/delete a bucket. Only explicit verified keys in this source bucket/prefix.
  for (let offset = 0; offset < current.length; offset += 1000) {
    options.signal?.throwIfAborted();
    const batch = current.slice(offset, offset + 1000),
      keys = batch.map((row) => row.key);
    await source.privateBucket();
    await target.privateBucket();
    await source.json(
      await source.request(`/object/${BUCKET}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prefixes: keys }),
      }),
    );
    for (const entry of batch) {
      if (await source.head(entry.key, true))
        failure(
          "Source delete did not complete; resume with the same checkpoint.",
        );
      entry.sourceDeleted = true;
      result.deleted++;
    }
    await persist();
    dependencies.onProgress?.({
      stage: "cleanup",
      completed: result.deleted,
      total: entries.length,
    });
  }
  const leftovers = await source.inventory(prefix);
  if (leftovers.length)
    failure(
      "Source contains remaining or newly added objects; no unverified cleanup attempted.",
    );
  checkpoint.cleanupComplete = true;
  await persist();
  return result;
}

export function parseListeningStorageMoveArgs(
  args: string[],
): ListeningStorageMoveOptions & { help?: boolean } {
  const options: ListeningStorageMoveOptions & { help?: boolean } = {
    checkpointPath: "output/listening-assessments/storage-move-checkpoint.json",
  };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--help") options.help = true;
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--delete-source") options.deleteSource = true;
    else if (arg === "--prefix" || arg === "--checkpoint") {
      const value = args[++index];
      if (!value || value.startsWith("--")) failure(`${arg} requires a value.`);
      if (arg === "--prefix") options.prefix = value;
      else options.checkpointPath = value;
    } else
      failure(
        "Unknown option; credentials must be supplied through environment variables.",
      );
  }
  if (options.deleteSource && !options.apply)
    failure("--delete-source requires --apply.");
  return options;
}
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  try {
    const options = parseListeningStorageMoveArgs(process.argv.slice(2));
    if (options.help)
      console.log(
        `move-listening-storage.mts [--apply] [--delete-source] [--prefix PATH] [--checkpoint PATH]\nDefault: read-only. Environment: SUPABASE_URL2 (fallback ${OLD_ORIGIN}), SUPABASE_SECRET_KEY2, SUPABASE_URL, SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.\nSame project origin is key rotation only and never deletes files.`,
      );
    else {
      const config = readListeningStorageMoveConfig(process.env);
      const controller = new AbortController();
      process.once("SIGINT", () => controller.abort());
      process.once("SIGTERM", () => controller.abort());
      const result = await moveListeningStorage(
        config,
        { ...options, signal: controller.signal },
        {
          onProgress: (value) => {
            if (value.completed === value.total || value.completed % 25 === 0)
              console.log(`${value.stage}: ${value.completed}/${value.total}`);
          },
        },
      );
      console.log(
        result.mode === "key_rotation"
          ? "Same project origin: key rotation only. No objects copied or deleted."
          : JSON.stringify(result, null, 2),
      );
    }
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Storage migration failed.",
    );
    process.exitCode = 1;
  }
}
