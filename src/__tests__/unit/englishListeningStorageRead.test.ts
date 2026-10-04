// @vitest-environment node
import { createHash, randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  createListeningStorageApi,
  type ListeningStorageRef,
} from "@/lib/english/listening/media/storageApi";
import { PrismaStorageListeningMediaStore } from "@/lib/english/listening/media/storageStore";
import { createListeningMediaService } from "@/lib/english/listening/media/service";
import { storageReadyRecord } from "@/lib/english/listening/runtime/storageAssets";
import type { ListeningMediaStore } from "@/lib/english/listening/media/store";
import { fakeListeningStorage } from "../fixtures/english-listening/fakeStorage";
vi.mock("server-only", () => ({}));

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
async function collect(stream: AsyncIterable<Uint8Array>) {
  const parts: Buffer[] = [];
  for await (const part of stream) parts.push(Buffer.from(part));
  return Buffer.concat(parts);
}
function fixture(count = 1) {
  const fake = fakeListeningStorage();
  const ownerId = randomUUID(), assetId = randomUUID(), setId = randomUUID();
  const rows = Array.from({ length: count }, (_, index) => {
    const key = randomUUID();
    const bytes = Buffer.alloc(1024 * 1024, index + 1);
    const ref: ListeningStorageRef = {
      ownerId, bucket: fake.config.bucket,
      key: `${ownerId}/${assetId}/${key}`,
      bytes: bytes.length, start: 0, endExclusive: bytes.length,
      sha256: sha(bytes),
      etag: `"${createHash("md5").update(bytes).digest("hex")}"`,
    };
    fake.files.set(ref.key, bytes);
    return {
      key, assetId, ownerId, byteLength: bytes.length, sha256: ref.sha256,
      ref, committed: true, deleting: false, bytes,
    };
  });
  const query = vi.fn(async (_sql: TemplateStringsArray, key: string) =>
    rows.filter((row) => row.key === key),
  );
  const api = createListeningStorageApi(fake.config, fake.fetchImpl);
  const store = new PrismaStorageListeningMediaStore(
    { $queryRaw: query } as unknown as PrismaClient, api,
  );
  const read = (index = 0, signal?: AbortSignal) => store.readBlob(rows[index].key, {
    start: 0, endExclusive: rows[index].byteLength, maxChunkBytes: 32 * 1024, signal,
  });
  const chunks = rows.map((row, index) => ({
    key: row.key, byteLength: row.byteLength, offset: index * row.byteLength,
    expectedRevision: 1, sha256: row.sha256,
  }));
  const bytes = Buffer.concat(rows.map((row) => row.bytes));
  const record = storageReadyRecord({
    ownerId, assetId, setId, branchId: null, storage: rows[0].ref,
    mimeType: "audio/wav", sha256: sha(bytes), durationMs: 10000, now: 1,
  });
  delete record.storage;
  record.storageChunks = true;
  record.chunks = chunks;
  record.playback = { revision: 1, mimeType: "audio/wav", sha256: sha(bytes), totalBytes: bytes.length, chunks };
  const get = vi.fn(async () => record);
  let allowed = true, scopedOwnerId = ownerId;
  const media = createListeningMediaService({
    store: { get, readBlob: store.readBlob.bind(store) } as unknown as ListeningMediaStore,
    authorize: async () => allowed,
    resolveScope: async () => ({ ownerId: scopedOwnerId, branchId: null }),
  });
  return { fake, rows, query, api, store, read, bytes, get,
    serve: (method: "GET" | "HEAD" = "GET", range?: string) =>
      media.serve(null, { setId, assetId, method, range }),
    revoke: () => { allowed = false; },
    move: () => { scopedOwnerId = randomUUID(); },
  };
}

describe("private Storage reads without redundant per-chunk HEAD", () => {
  it("streams exact cross-chunk ranges with one live DB lookup and two HTTP requests per touched chunk", async () => {
    const s = fixture(3);
    const head = await s.serve("HEAD", "bytes=0-2");
    expect(head.status).toBe(200);
    expect(head.body).toBeNull();
    expect(s.query).not.toHaveBeenCalled();
    expect(s.fake.calls).toHaveLength(0);
    const start = 1024 * 1024 - 31, end = 2 * 1024 * 1024 + 17;
    const response = await s.serve("GET", `bytes=${start}-${end - 1}`);
    expect(response.status).toBe(206);
    expect(response.headers.get("etag")).toBe(`"${sha(s.bytes)}"`);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-length")).toBe(String(end - start));
    expect(response.headers.get("content-range")).toBe(`bytes ${start}-${end - 1}/${s.bytes.length}`);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(s.bytes.subarray(start, end));
    expect(s.query).toHaveBeenCalledTimes(3);
    expect(s.fake.calls.filter((c) => c.url.includes("/bucket/"))).toHaveLength(3);
    expect(s.fake.calls.filter((c) => c.url.includes("/object/"))).toHaveLength(3);
    expect(s.fake.calls.every((c) => c.method === "GET")).toBe(true);
  });

  it("does not reuse authorization or ownership across playback requests", async () => {
    for (const deny of ["revoke", "move"] as const) {
      const s = fixture();
      await (await s.serve("GET", "bytes=0-3")).arrayBuffer();
      s.fake.calls.length = 0;
      s.query.mockClear();
      s[deny]();
      const response = await s.serve();
      expect(response.status).toBe(404);
      expect(s.query).not.toHaveBeenCalled();
      expect(s.fake.calls).toHaveLength(0);
    }
  });

  it("rechecks bucket privacy before the next chunk of the same stream", async () => {
    const s = fixture(2), reader = (await s.serve()).body!.getReader();
    let count = 0;
    while (count < 1024 * 1024) {
      const { value, done } = await reader.read();
      expect(done).toBe(false);
      count += value!.byteLength;
    }
    expect(count).toBe(1024 * 1024);
    s.fake.share();
    await expect(reader.read()).rejects.toThrow();
    expect(s.fake.calls.filter((c) => c.url.includes("/bucket/"))).toHaveLength(2);
    expect(s.fake.calls.filter((c) => c.url.includes("/object/"))).toHaveLength(1);
  });

  it("fails if a checked object is changed or deleted before a later read", async () => {
    for (const deleted of [false, true]) {
      const s = fixture();
      await collect(s.read());
      if (deleted) s.fake.files.delete(s.rows[0].ref.key);
      else s.fake.files.set(s.rows[0].ref.key, Buffer.alloc(1024 * 1024, 99));
      await expect(collect(s.read())).rejects.toThrow();
    }
  });

  it.each([
    { deleting: true }, { ownerId: randomUUID() }, { byteLength: 9 }, { sha256: "0".repeat(64) }, { ref: null },
  ])("rejects live blob metadata corruption before Storage: %j", async (change) => {
    const s = fixture();
    Object.assign(s.rows[0], change);
    await expect(collect(s.read())).rejects.toThrow();
    expect(s.fake.calls).toHaveLength(0);
  });

  it.each([
    { bucket: "other-private" }, { key: "../other" }, { ownerId: randomUUID() },
    { bytes: NaN }, { bytes: 337 * 1024 * 1024 }, { start: -1 },
    { endExclusive: 1024 * 1024 + 1 }, { etag: '"bad\r\nheader"' }, { sha256: "invalid" },
  ])("validates the entire immutable ref before a credentialed read: %j", async (change) => {
    const s = fixture();
    await expect(collect(s.api.readPrivate({ ...s.rows[0].ref, ...change }, 0, 4))).rejects.toThrow();
    expect(s.fake.calls).toHaveLength(0);
  });

  it.each([
    { status: 200 }, { status: 302 }, { status: 412 }, { header: "etag", value: '"changed"' },
    { header: "content-range", value: "bytes 1-4/1048576" },
    { header: "content-range", value: "bytes 0-3/1048577" },
    { header: "content-length", value: "5" },
  ])("rejects GET integrity failures before delivering bytes: %j", async (change) => {
    const s = fixture();
    const api = createListeningStorageApi(s.fake.config, async (url, init) => {
      const response = await s.fake.fetchImpl(url, init);
      expect(init?.cache).toBe("no-store");
      expect(init?.redirect).toBe("error");
      if (!String(url).includes("/object/")) return response;
      const headers = new Headers(response.headers);
      if (change.header !== undefined && change.value !== undefined)
        headers.set(change.header, change.value);
      expect(new Headers(init?.headers).get("if-match")).toBe(s.rows[0].ref.etag);
      expect(new Headers(init?.headers).get("range")).toBe("bytes=0-3");
      expect(new Headers(init?.headers).get("accept-encoding")).toBe("identity");
      return new Response(response.body, { status: "status" in change ? change.status : 206, headers });
    });
    const pieces: Uint8Array[] = [];
    await expect((async () => {
      for await (const part of api.readPrivate(s.rows[0].ref, 0, 4)) pieces.push(part);
    })()).rejects.toThrow();
    expect(pieces).toHaveLength(0);
    expect(s.fake.cancels).toBe(1);
  });

  it.each([3, 5])("rejects a lying GET body of %i bytes despite valid length headers", async (length) => {
    const s = fixture();
    let cancelled = 0;
    const api = createListeningStorageApi(s.fake.config, async (url, init) => {
      if (!String(url).includes("/object/")) return s.fake.fetchImpl(url, init);
      let sent = false;
      return new Response(new ReadableStream({
        pull(c) { if (sent) c.close(); else { sent = true; c.enqueue(new Uint8Array(length)); } },
        cancel() { cancelled++; },
      }, { highWaterMark: 0 }), { status: 206, headers: {
        etag: s.rows[0].ref.etag, "content-length": "4", "content-range": "bytes 0-3/1048576",
      } });
    });
    await expect(collect(api.readPrivate(s.rows[0].ref, 0, 4))).rejects.toThrow();
    if (length > 4) expect(cancelled).toBe(1);
  });

  it("avoids all work on pre-abort and stops before GET when aborted during bucket validation", async () => {
    const s = fixture(), controller = new AbortController();
    controller.abort();
    await expect(collect(s.read(0, controller.signal))).rejects.toThrow();
    expect(s.query).not.toHaveBeenCalled();
    expect(s.fake.calls).toHaveLength(0);
    const during = new AbortController();
    const api = createListeningStorageApi(s.fake.config, async (url, init) => {
      const response = await s.fake.fetchImpl(url, init);
      expect(init?.signal).toBeDefined();
      during.abort();
      return response;
    });
    await expect(collect(api.readPrivate(s.rows[0].ref, 0, 4, during.signal))).rejects.toThrow();
    expect(s.fake.calls).toHaveLength(1);
    expect(s.fake.calls[0].url).toContain("/bucket/");
  });

  it("does not yield a body read that resolves after cancellation", async () => {
    const s = fixture(), controller = new AbortController();
    const api = createListeningStorageApi(s.fake.config, async (url, init) => {
      if (!String(url).includes("/object/")) return s.fake.fetchImpl(url, init);
      return new Response(new ReadableStream({
        pull(c) { controller.abort(); c.enqueue(new Uint8Array(4)); },
      }, { highWaterMark: 0 }), { status: 206, headers: {
        etag: s.rows[0].ref.etag, "content-length": "4", "content-range": "bytes 0-3/1048576",
      } });
    });
    const iterator = api.readPrivate(s.rows[0].ref, 0, 4, controller.signal)[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toThrow();
  });

  it("propagates stream cancellation and abort to the upstream reader", async () => {
    const s = fixture(), reader = (await s.serve()).body!.getReader();
    await reader.read();
    await reader.cancel();
    expect(s.fake.cancels).toBe(1);
    const controller = new AbortController(), iterator = s.read(0, controller.signal)[Symbol.asyncIterator]();
    await iterator.next();
    controller.abort();
    await expect(iterator.next()).rejects.toThrow();
    expect(s.fake.cancels).toBe(2);
  });
});
