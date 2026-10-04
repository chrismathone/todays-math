// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  createListeningStorageApi,
  readListeningStorageConfig,
} from "@/lib/english/listening/media/storageApi";
import { createListeningMediaService } from "@/lib/english/listening/media/service";
import { storageReadyRecord } from "@/lib/english/listening/runtime/storageAssets";
import { validateListeningDriveMp3 } from "@/lib/english/listening/runtime/driveAssets";
import type { ListeningMediaStore } from "@/lib/english/listening/media/store";
import { fakeListeningStorage } from "../fixtures/english-listening/fakeStorage";
vi.mock("server-only", () => ({}));
const tone = readFileSync(
  new URL("../fixtures/english-listening/tone.mp3", import.meta.url),
);
async function setup() {
  const fake = fakeListeningStorage(),
    api = createListeningStorageApi(fake.config, fake.fetchImpl),
    ownerId = randomUUID(),
    assetId = randomUUID(),
    setId = randomUUID();
  const text = Buffer.from("SECRET_ANSWERS"),
    original = Buffer.concat([
      Buffer.from([73, 68, 51, 3, 0, 0, 0, 0, 0, text.length]),
      text,
      tone,
    ]);
  const validated = await validateListeningDriveMp3(original);
  const ref = await api.upload({
    ownerId,
    assetId,
    bytes: original.length,
    mimeType: "audio/mpeg",
    read: async function* () {
      yield original;
    },
  });
  const record = storageReadyRecord({
    ownerId,
    assetId,
    setId,
    branchId: null,
    storage: {
      ...ref,
      start: validated.start,
      endExclusive: validated.endExclusive,
    },
    mimeType: "audio/mpeg",
    sha256: validated.sha256,
    durationMs: validated.durationMs,
    now: Date.now(),
  });
  let allow = true;
  const get = vi.fn(async () => record);
  const media = createListeningMediaService({
    store: { get } as unknown as ListeningMediaStore,
    storage: api,
    authorize: async () => allow,
    resolveScope: async () => ({ ownerId, branchId: null }),
  });
  return {
    fake,
    api,
    record,
    original,
    validated,
    request: (method: "GET" | "HEAD" = "GET", range?: string) =>
      media.serve(null, { setId, assetId, method, range }),
    revoke: () => {
      allow = false;
    },
    get,
  };
}
describe("Supabase private listening storage", () => {
  it("reconciles an ambiguous immutable chunk POST and verifies remote SHA without replacing the object", async () => {
    const fake = fakeListeningStorage();
    let fail = true;
    const api = createListeningStorageApi(fake.config, async (url, init) => {
      const response = await fake.fetchImpl(url, init);
      if (init?.method === "POST" && String(url).includes("/object/") && fail) {
        fail = false;
        throw new Error("Reply lost after Storage committed");
      }
      return response;
    });
    const input = {
      ownerId: randomUUID(),
      assetId: randomUUID(),
      key: randomUUID(),
      bytes: Buffer.from("private chunk"),
      mimeType: "audio/mpeg" as const,
    };
    const ref = await api.uploadChunk(input);
    expect(fake.files.get(ref.key)).toEqual(input.bytes);
    expect(await api.uploadChunk(input)).toEqual(ref);
    expect(fake.files.size).toBe(1);
    await expect(
      api.uploadChunk({ ...input, bytes: Buffer.from("wrong content") }),
    ).rejects.toThrow();
    expect(fake.files.get(ref.key)).toEqual(input.bytes);
    expect(
      fake.calls
        .filter((c) => c.method === "POST")
        .every((c) => c.length <= 1024 * 1024),
    ).toBe(true);
    const count = fake.calls.length;
    await expect(
      api.uploadChunk({ ...input, key: "../elsewhere" }),
    ).rejects.toThrow();
    await expect(
      api.uploadChunk({ ...input, bytes: Buffer.alloc(1024 * 1024 + 1) }),
    ).rejects.toThrow();
    expect(fake.calls).toHaveLength(count);
  });
  it("uses opaque secret keys as apikey only and rejects malformed/public keys without fallback", async () => {
    const secret = "sb_secret_test_private",
      ownerId = randomUUID(),
      assetId = randomUUID(),
      key = `${ownerId}/${assetId}/${randomUUID()}`;
    const calls: Headers[] = [];
    const fetcher = async (
      _url: string | URL | Request,
      init?: RequestInit,
    ) => {
      calls.push(new Headers(init?.headers));
      return init?.method === "HEAD"
        ? new Response(null, {
            headers: { etag: '"abc"', "content-length": "10" },
          })
        : Response.json({ id: "english-listening-private", public: false });
    };
    const config = readListeningStorageConfig({
      SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
      SUPABASE_SECRET_KEY: secret,
      SUPABASE_SERVICE_ROLE_KEY: "ignored",
    })!;
    await createListeningStorageApi(config, fetcher as typeof fetch).check({
      ownerId,
      key,
      bucket: config.bucket,
      bytes: 10,
      start: 0,
      endExclusive: 10,
      etag: '"abc"',
      sha256: "0".repeat(64),
    });
    expect(calls).toHaveLength(2);
    expect(
      calls.every((h) => h.get("apikey") === secret && !h.has("authorization")),
    ).toBe(true);
    for (const bad of [
      " ",
      "sb_publishable_public",
      "e30.eyJyb2xlIjoiYW5vbiJ9.signature",
      "not-a-secret",
    ])
      expect(() =>
        readListeningStorageConfig({
          SUPABASE_URL: config.url,
          SUPABASE_SECRET_KEY: bad,
          SUPABASE_SERVICE_ROLE_KEY: fakeListeningStorage().config.serviceKey,
        }),
      ).toThrow();
  });
  it("fails closed without server credential/config and never forwards provider error secrets", async () => {
    expect(readListeningStorageConfig({})).toBeNull();
    expect(
      readListeningStorageConfig({
        SUPABASE_URL: "https://evil.test",
        SUPABASE_SERVICE_ROLE_KEY: "SECRET",
      }),
    ).toBeNull();
    const f = fakeListeningStorage(),
      api = createListeningStorageApi(f.config, async () =>
        Response.json({ secret: "SECRET" }, { status: 403 }),
      );
    await expect(
      api.upload({
        ownerId: randomUUID(),
        assetId: randomUUID(),
        bytes: 1,
        mimeType: "audio/mpeg",
        read: async function* () {
          yield new Uint8Array([1]);
        },
      }),
    ).rejects.toThrow("비공개 듣기 음원 저장소를 확인하지 못했습니다.");
  });
  it("preserves private original while authenticated playback strips metadata, supports range/HEAD and exposes only asset id", async () => {
    const s = await setup();
    expect(s.fake.files.get(s.record.storage!.key)).toEqual(s.original);
    const head = await s.request("HEAD", "bytes=1-9");
    expect(head.status).toBe(200);
    expect(head.body).toBeNull();
    const response = await s.request("GET", "bytes=1-9");
    expect(response.status).toBe(206);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      s.original.subarray(s.validated.start + 1, s.validated.start + 10),
    );
    expect(JSON.stringify([...response.headers])).not.toContain(
      s.record.storage!.key,
    );
    const full = Buffer.from(await (await s.request()).arrayBuffer());
    expect(full.includes(Buffer.from("SECRET_ANSWERS"))).toBe(false);
  });
  it("denies revoked app access before DB metadata or Storage and rejects public bucket or changed object etag", async () => {
    const s = await setup(),
      count = s.fake.calls.length;
    s.revoke();
    expect((await s.request()).status).toBe(404);
    expect(s.fake.calls).toHaveLength(count);
    expect(s.get).not.toHaveBeenCalled();
    const shared = await setup();
    shared.fake.share();
    expect((await shared.request()).status).toBe(404);
    const changed = await setup(),
      blob = Buffer.from(changed.original);
    blob[100] ^= 1;
    changed.fake.files.set(changed.record.storage!.key, blob);
    expect((await changed.request()).status).toBe(404);
  });
  it("uses 6MiB resumable chunks and recovers a failed PATCH through authoritative HEAD offset", async () => {
    const fake = fakeListeningStorage(),
      api = createListeningStorageApi(fake.config, fake.fetchImpl),
      bytes = Buffer.alloc(7 * 1024 * 1024, 7);
    fake.failPatch();
    const ref = await api.upload({
      ownerId: randomUUID(),
      assetId: randomUUID(),
      bytes: bytes.length,
      mimeType: "audio/wav",
      read: async function* () {
        for (let i = 0; i < bytes.length; i += 1024 * 1024)
          yield bytes.subarray(i, i + 1024 * 1024);
      },
    });
    expect(fake.files.get(ref.key)!.equals(bytes)).toBe(true);
    expect(
      fake.calls.filter((c) => c.method === "PATCH").map((c) => c.length),
    ).toEqual([6 * 1024 * 1024, 6 * 1024 * 1024, 1024 * 1024]);
    expect(
      fake.calls.some(
        (c) => c.method === "HEAD" && c.url.includes("upload/resumable/"),
      ),
    ).toBe(true);
  });
  it("rejects traversal/cross-owner objects before credentialed fetch and cancels upstream on response cancel", async () => {
    const s = await setup(),
      before = s.fake.calls.length;
    await expect(
      s.api.check({ ...s.record.storage!, key: "../other.mp3" }),
    ).rejects.toThrow();
    await expect(
      s.api.check({ ...s.record.storage!, ownerId: randomUUID() }),
    ).rejects.toThrow();
    expect(s.fake.calls).toHaveLength(before);
    const response = await s.request(),
      reader = response.body!.getReader();
    await reader.read();
    await reader.cancel();
    expect(s.fake.cancels).toBeGreaterThan(0);
  });
});
