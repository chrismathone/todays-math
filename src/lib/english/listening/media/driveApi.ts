import "server-only";
import { createHash } from "node:crypto";
import { LISTENING_DRIVE_ID, type ListeningDriveConfig } from "./driveConfig";

export interface ListeningDriveRef {
  fileId: string;
  revisionId: string;
  folderId: string;
  ownerId: string;
  bytes: number;
  originalSha256: string;
  md5Checksum: string;
  start: number;
  endExclusive: number;
}
type FileMetadata = {
  id: string;
  size?: string;
  md5Checksum?: string;
  sha256Checksum?: string;
  headRevisionId?: string;
  parents?: string[];
  trashed?: boolean;
  ownedByMe?: boolean;
  mimeType?: string;
  permissions?: { type?: string }[];
  capabilities?: { canDownload?: boolean };
};
const API = "https://www.googleapis.com/drive/v3";
const fields =
  "id,size,md5Checksum,sha256Checksum,headRevisionId,parents,trashed,ownedByMe,mimeType,permissions(type),capabilities(canDownload)";
const failure = () => new Error("비공개 Drive 음원을 확인하지 못했습니다.");
const revisionId = (value: string) => {
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(value)) throw failure();
  return value;
};
export function createListeningDriveApi(
  config: ListeningDriveConfig,
  fetchImpl: typeof fetch = fetch,
) {
  const fileUrl = (id: string) => {
    if (!LISTENING_DRIVE_ID.test(id)) throw failure();
    return `${API}/files/${id}`;
  };
  const request = async (url: string, init: RequestInit = {}) => {
    const target = new URL(url);
    if (
      target.origin !== "https://www.googleapis.com" ||
      target.username ||
      target.password
    )
      throw failure();
    try {
      return await fetchImpl(url, {
        ...init,
        redirect: "error",
        cache: "no-store",
        signal: init.signal
          ? AbortSignal.any([init.signal, AbortSignal.timeout(120_000)])
          : AbortSignal.timeout(120_000),
        headers: {
          ...Object.fromEntries(new Headers(init.headers)),
          Authorization: `Bearer ${await config.accessToken()}`,
        },
      });
    } catch {
      throw failure();
    }
  };
  const json = async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
      await response.body?.cancel();
      throw failure();
    }
    try {
      return (await response.json()) as T;
    } catch {
      throw failure();
    }
  };
  const metadata = async (id: string) =>
    json<FileMetadata>(
      await request(
        `${fileUrl(id)}?${new URLSearchParams({ fields, supportsAllDrives: "true" })}`,
      ),
    );
  const privateFile = (file: FileMetadata, id: string, folder = false) => {
    if (
      file.id !== id ||
      file.trashed !== false ||
      file.ownedByMe !== true ||
      !Array.isArray(file.permissions) ||
      file.permissions.some((p) => p.type !== "user") ||
      (folder
        ? file.mimeType !== "application/vnd.google-apps.folder"
        : !file.parents?.includes(config.folderId))
    )
      throw failure();
  };
  const checkFolder = async () =>
    privateFile(await metadata(config.folderId), config.folderId, true);
  const check = async (ref: ListeningDriveRef) => {
    if (
      ref.ownerId !== config.ownerId ||
      ref.folderId !== config.folderId ||
      !Number.isSafeInteger(ref.bytes) ||
      ref.bytes <= 0 ||
      !Number.isSafeInteger(ref.start) ||
      !Number.isSafeInteger(ref.endExclusive) ||
      ref.start < 0 ||
      ref.start >= ref.endExclusive ||
      ref.endExclusive > ref.bytes
    )
      throw failure();
    await checkFolder();
    const file = await metadata(ref.fileId);
    privateFile(file, ref.fileId);
    if (
      Number(file.size) !== ref.bytes ||
      file.md5Checksum !== ref.md5Checksum ||
      (file.sha256Checksum !== undefined &&
        file.sha256Checksum !== ref.originalSha256) ||
      file.headRevisionId !== ref.revisionId ||
      file.capabilities?.canDownload === false
    )
      throw failure();
    const revision = await json<{
      id?: string;
      size?: string;
      md5Checksum?: string;
      keepForever?: boolean;
    }>(
      await request(
        `${fileUrl(ref.fileId)}/revisions/${revisionId(ref.revisionId)}?fields=id,size,md5Checksum,keepForever`,
      ),
    );
    if (
      revision.id !== ref.revisionId ||
      Number(revision.size) !== ref.bytes ||
      revision.md5Checksum !== ref.md5Checksum ||
      revision.keepForever !== true
    )
      throw failure();
  };
  const pin = async (input: {
    fileId: string;
    bytes: number;
    originalSha256: string;
    md5Checksum: string;
    start: number;
    endExclusive: number;
  }): Promise<ListeningDriveRef> => {
    await checkFolder();
    const file = await metadata(input.fileId);
    privateFile(file, input.fileId);
    if (
      Number(file.size) !== input.bytes ||
      file.md5Checksum !== input.md5Checksum ||
      (file.sha256Checksum !== undefined &&
        file.sha256Checksum !== input.originalSha256) ||
      !file.headRevisionId
    )
      throw failure();
    const ref = {
      ...input,
      revisionId: file.headRevisionId,
      folderId: config.folderId,
      ownerId: config.ownerId,
    };
    await json(
      await request(
        `${fileUrl(ref.fileId)}/revisions/${revisionId(ref.revisionId)}?fields=id`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keepForever: true }),
        },
      ),
    );
    await check(ref);
    // Older Drive blobs can omit SHA-256. Verify actual pinned bytes in that case,
    // rather than treating a local validation receipt or MD5 as SHA-256 proof.
    if (!file.sha256Checksum) {
      const digest = createHash("sha256");
      for await (const part of read(
        { ...ref, start: 0, endExclusive: ref.bytes },
        0,
        ref.bytes,
      ))
        digest.update(part);
      if (digest.digest("hex") !== ref.originalSha256) throw failure();
    }
    return ref;
  };
  const read = async function* (
    ref: ListeningDriveRef,
    start: number,
    endExclusive: number,
    signal?: AbortSignal,
  ) {
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(endExclusive) ||
      start < 0 ||
      start >= endExclusive ||
      endExclusive > ref.endExclusive - ref.start
    )
      throw failure();
    const from = ref.start + start,
      to = ref.start + endExclusive - 1;
    const response = await request(
      `${fileUrl(ref.fileId)}/revisions/${revisionId(ref.revisionId)}?alt=media`,
      {
        headers: {
          Range: `bytes=${from}-${to}`,
          "Accept-Encoding": "identity",
        },
        signal,
      },
    );
    if (
      response.status !== 206 ||
      response.headers.get("content-range") !==
        `bytes ${from}-${to}/${ref.bytes}` ||
      Number(response.headers.get("content-length")) !== to - from + 1 ||
      !response.body
    ) {
      await response.body?.cancel();
      throw failure();
    }
    const reader = response.body.getReader();
    let remaining = to - from + 1;
    try {
      while (true) {
        signal?.throwIfAborted();
        const next = await reader.read();
        if (next.done) break;
        if (next.value.length > remaining) throw failure();
        remaining -= next.value.length;
        for (let offset = 0; offset < next.value.length; offset += 1024 * 1024)
          yield next.value.subarray(offset, offset + 1024 * 1024);
      }
      if (remaining) throw failure();
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  };
  const trash = async (id: string) => {
    await json(
      await request(`${fileUrl(id)}?fields=id`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trashed: true }),
      }),
    );
  };
  const upload = async (input: {
    bytes: number;
    mimeType: "audio/wav";
    name: string;
    read: () => AsyncIterable<Uint8Array>;
  }): Promise<ListeningDriveRef> => {
    if (
      !Number.isSafeInteger(input.bytes) ||
      input.bytes < 44 ||
      input.bytes > 336 * 1024 * 1024
    )
      throw failure();
    await checkFolder();
    const generated = await json<{ ids?: string[] }>(
      await request(`${API}/files/generateIds?count=1&space=drive&type=files`),
    );
    const id = generated.ids?.[0];
    if (!id || !LISTENING_DRIVE_ID.test(id)) throw failure();
    const initialized = await request(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Upload-Content-Type": input.mimeType,
          "X-Upload-Content-Length": String(input.bytes),
        },
        body: JSON.stringify({
          id,
          name: input.name,
          mimeType: input.mimeType,
          parents: [config.folderId],
          appProperties: { listeningDerivative: "pcm_clip" },
        }),
      },
    );
    const session = initialized.headers.get("location");
    if (!initialized.ok || !session) throw failure();
    const hash = createHash("sha256"),
      md5 = createHash("md5");
    let offset = 0,
      pending = Buffer.alloc(0),
      completed = false;
    const put = async (part: Buffer) => {
      hash.update(part);
      md5.update(part);
      const result = await request(session, {
        method: "PUT",
        headers: {
          "Content-Length": String(part.length),
          "Content-Range": `bytes ${offset}-${offset + part.length - 1}/${input.bytes}`,
        },
        body: new Uint8Array(part),
      });
      offset += part.length;
      if (offset < input.bytes) {
        if (
          result.status !== 308 ||
          result.headers.get("range") !== `bytes=0-${offset - 1}`
        )
          throw failure();
        await result.body?.cancel();
      } else {
        const value = await json<{ id?: string }>(result);
        if (value.id !== id) throw failure();
        completed = true;
      }
    };
    try {
      for await (const part of input.read()) {
        if (
          part.length > 1024 * 1024 ||
          offset + pending.length + part.length > input.bytes
        )
          throw failure();
        pending = Buffer.concat([pending, part]);
        while (pending.length >= 1024 * 1024) {
          await put(pending.subarray(0, 1024 * 1024));
          pending = pending.subarray(1024 * 1024);
        }
      }
      if (pending.length) await put(pending);
      if (offset !== input.bytes || !completed) throw failure();
      return await pin({
        fileId: id,
        bytes: input.bytes,
        originalSha256: hash.digest("hex"),
        md5Checksum: md5.digest("hex"),
        start: 0,
        endExclusive: input.bytes,
      });
    } catch (error) {
      if (id) await trash(id).catch(() => {});
      throw error;
    }
  };
  return { config, metadata, check, pin, read, upload, trash };
}
export type ListeningDriveApi = ReturnType<typeof createListeningDriveApi>;
