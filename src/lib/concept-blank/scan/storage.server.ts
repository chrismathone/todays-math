import "server-only";
import { createHash } from "node:crypto";
import { STUDIO_AI_IMAGE_BUDGET } from "@/lib/studio-ai/limits";

export const SCAN_PHOTO_BUCKET = "concept-blank-scan-private";
const host = /^https:\/\/[a-z0-9]{20}\.supabase\.co$/;
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const objectPath = new RegExp(`^${uuid}/${uuid}/${uuid}$`);
const maxBytes = Math.floor(((STUDIO_AI_IMAGE_BUDGET - 32) * 3) / 4);
const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
type PhotoMime = "image/jpeg" | "image/png" | "image/webp";
export interface ScanPhotoStorage {
  bucket: string;
  upload(key: string, bytes: Uint8Array, mime: PhotoMime): Promise<void>;
  read(key: string, hash: string, mime: PhotoMime): Promise<Buffer>;
  signedUrl(key: string, seconds: number): Promise<string>;
  remove(key: string): Promise<void>;
}
export type ScanStorageConfig = {
  url: string;
  serviceKey: string;
  bucket: string;
};
export class ScanStorageError extends Error {
  readonly status = 503;
  constructor() {
    super(
      "사진 비공개 저장소를 확인하지 못했습니다. 잠시 뒤 다시 이용해 주세요.",
    );
    this.name = "ScanStorageError";
  }
}
function credentials(key: string): Record<string, string> {
  if (!key || /[\s\x00-\x1f\x7f]/.test(key)) throw new ScanStorageError();
  if (/^sb_secret_[A-Za-z0-9_-]+$/.test(key)) return { apikey: key };
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
    try {
      if (
        JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
          .role === "service_role"
      )
        return { apikey: key, Authorization: `Bearer ${key}` };
    } catch {
      /* Invalid credentials fail closed below. */
    }
  }
  throw new ScanStorageError();
}
export function readScanStorageConfig(
  env: Record<string, string | undefined> = process.env,
): ScanStorageConfig | null {
  const url = (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL)?.replace(
    /\/$/,
    "",
  );
  const serviceKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = env.CONCEPT_BLANK_SCAN_STORAGE_BUCKET ?? SCAN_PHOTO_BUCKET;
  if (
    !url ||
    !host.test(url) ||
    !serviceKey ||
    !/^[-a-z0-9]{3,63}$/.test(bucket)
  )
    return null;
  credentials(serviceKey);
  return { url, serviceKey, bucket };
}

/** Isolated server transport using the project's existing Storage REST pattern. No browser credentials. */
export function createScanPhotoStorage(
  config: ScanStorageConfig,
  fetchImpl: typeof fetch = fetch,
): ScanPhotoStorage {
  if (!host.test(config.url) || !/^[-a-z0-9]{3,63}$/.test(config.bucket))
    throw new ScanStorageError();
  const auth = credentials(config.serviceKey),
    base = `${config.url}/storage/v1`;
  const object = (key: string) => {
    if (!objectPath.test(key)) throw new ScanStorageError();
    return `${config.bucket}/${key}`;
  };
  const request = async (suffix: string, init: RequestInit = {}) => {
    try {
      return await fetchImpl(`${base}/${suffix}`, {
        ...init,
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(60_000),
        headers: { ...Object.fromEntries(new Headers(init.headers)), ...auth },
      });
    } catch {
      throw new ScanStorageError();
    }
  };
  const json = async (response: Response): Promise<unknown> => {
    if (!response.ok) {
      await response.body?.cancel();
      throw new ScanStorageError();
    }
    try {
      return await response.json();
    } catch {
      throw new ScanStorageError();
    }
  };
  const privateBucket = async () => {
    const value = (await json(await request(`bucket/${config.bucket}`))) as {
      id?: unknown;
      public?: unknown;
    } | null;
    if (value?.id !== config.bucket || value.public !== false)
      throw new ScanStorageError();
  };
  const read: ScanPhotoStorage["read"] = async (key, hash, mime) => {
    const path = object(key);
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new ScanStorageError();
    await privateBucket();
    const response = await request(`object/authenticated/${path}`);
    if (
      !response.ok ||
      !response.body ||
      response.headers.get("content-type")?.split(";")[0] !== mime ||
      Number(response.headers.get("content-length")) > maxBytes
    ) {
      await response.body?.cancel();
      throw new ScanStorageError();
    }
    const reader = response.body.getReader(),
      chunks: Uint8Array[] = [];
    let count = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        count += chunk.value.byteLength;
        if (count > maxBytes) throw new ScanStorageError();
        chunks.push(chunk.value);
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const bytes = Buffer.concat(chunks);
    if (!bytes.length || digest(bytes) !== hash) throw new ScanStorageError();
    return bytes;
  };
  return {
    bucket: config.bucket,
    read,
    async upload(key, bytes, mime) {
      const path = object(key);
      if (!bytes.byteLength || bytes.byteLength > maxBytes)
        throw new ScanStorageError();
      await privateBucket();
      const response = await request(`object/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": mime,
          "Cache-Control": "no-store",
          "x-upsert": "false",
        },
        body: new Uint8Array(bytes),
      });
      await response.body?.cancel();
      // A replay of the same object may return conflict. Only byte-identical readback makes it success.
      if (!response.ok && response.status !== 409) throw new ScanStorageError();
      await read(key, digest(bytes), mime);
    },
    async signedUrl(key, seconds) {
      const path = object(key);
      if (!Number.isInteger(seconds) || seconds < 1 || seconds > 60)
        throw new ScanStorageError();
      await privateBucket();
      const value = (await json(
        await request(`object/sign/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expiresIn: seconds }),
        }),
      )) as { signedURL?: unknown } | null;
      if (typeof value?.signedURL !== "string") throw new ScanStorageError();
      const signed = new URL(
        value.signedURL.startsWith("/object/")
          ? `${base}${value.signedURL}`
          : value.signedURL,
        base,
      );
      if (
        signed.origin !== config.url ||
        signed.username ||
        signed.password ||
        signed.pathname !== `/storage/v1/object/sign/${path}` ||
        !signed.searchParams.get("token")
      )
        throw new ScanStorageError();
      return signed.toString();
    },
    async remove(key) {
      object(key);
      // Delete known objects even if an operator accidentally made the bucket public.
      await json(
        await request(`object/${config.bucket}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prefixes: [key] }),
        }),
      );
    },
  };
}
export function scanPhotoStorage(): ScanPhotoStorage {
  const config = readScanStorageConfig();
  if (!config) throw new ScanStorageError();
  return createScanPhotoStorage(config);
}
