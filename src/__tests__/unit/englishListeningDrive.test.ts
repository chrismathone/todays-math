// @vitest-environment node
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  listeningDriveOAuth,
  readListeningDriveConfig,
} from "@/lib/english/listening/media/driveConfig";
import { createListeningDriveApi } from "@/lib/english/listening/media/driveApi";
import { createListeningMediaService } from "@/lib/english/listening/media/service";
import type { ListeningMediaStore } from "@/lib/english/listening/media/store";
import {
  driveReadyRecord,
  validateListeningDriveMp3,
} from "@/lib/english/listening/runtime/driveAssets";
import { fakeListeningDrive } from "../fixtures/english-listening/fakeDrive";
vi.mock("server-only", () => ({}));
const tone = readFileSync(
  new URL("../fixtures/english-listening/tone.mp3", import.meta.url),
);
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
async function setup() {
  const fake = fakeListeningDrive(randomUUID()),
    api = createListeningDriveApi(fake.config, fake.fetchImpl);
  const text = Buffer.from("SECRET_ANSWERS"),
    tag = Buffer.concat([
      Buffer.from([73, 68, 51, 3, 0, 0, 0, 0, 0, text.length]),
      text,
    ]);
  const original = Buffer.concat([tag, tone]);
  const fileId = fake.add(original);
  const validated = await validateListeningDriveMp3(original),
    ref = await api.pin({ fileId, ...validated });
  const record = driveReadyRecord({
    assetId: randomUUID(),
    setId: randomUUID(),
    ownerId: fake.config.ownerId,
    branchId: null,
    drive: ref,
    mimeType: "audio/mpeg",
    sha256: validated.sha256,
    durationMs: validated.durationMs,
    now: Date.now(),
  });
  let allow = true,
    ownerId = record.ownerId;
  const get = vi.fn(async () => record);
  const store = { get, readBlob: vi.fn() } as unknown as ListeningMediaStore;
  const media = createListeningMediaService({
    store,
    drive: api,
    authorize: async () => allow,
    resolveScope: async () => ({ ownerId, branchId: null }),
  });
  const request = (method: "GET" | "HEAD" = "GET", range?: string) =>
    media.serve(null, {
      setId: record.setId,
      assetId: record.assetId,
      method,
      range,
    });
  return {
    fake,
    api,
    record,
    original,
    validated,
    request,
    get,
    revoke: () => {
      allow = false;
    },
    changeOwner: () => {
      ownerId = randomUUID();
    },
  };
}
describe("Private Drive listening media", () => {
  it("deduplicates concurrent refresh, caches until expiry and never returns provider secrets in errors", async () => {
    let now = 0;
    const fetcher = vi.fn(async () =>
      Response.json({ access_token: "token", expires_in: 3600 }),
    );
    const oauth = listeningDriveOAuth(
      { clientId: "client", clientSecret: "secret", refreshToken: "refresh" },
      fetcher as typeof fetch,
      () => now,
    );
    expect(
      await Promise.all([
        oauth.accessToken(),
        oauth.accessToken(),
        oauth.accessToken(),
      ]),
    ).toEqual(["token", "token", "token"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    now = 3500000;
    await oauth.accessToken();
    expect(fetcher).toHaveBeenCalledTimes(2);
    const broken = listeningDriveOAuth(
      { clientId: "client", clientSecret: "SECRET", refreshToken: "SECRET" },
      async () =>
        Response.json(
          { error: "invalid_grant", description: "SECRET" },
          { status: 400 },
        ),
    );
    await expect(broken.accessToken()).rejects.toThrow(
      "Drive 연결 허락을 다시 확인해 주세요.",
    );
    expect(readListeningDriveConfig({})).toBeNull();
  });
  it("strictly decodes every frame before readiness and serves only metadata-scrubbed MPEG bytes", async () => {
    const s = await setup();
    expect(s.record.chunks).toEqual([]);
    expect(s.record.playback!.chunks).toEqual([]);
    const response = await s.request();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(response.headers.get("etag")).toBe(`"${s.validated.sha256}"`);
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(sha(bytes)).toBe(s.validated.sha256);
    expect(bytes.includes(Buffer.from("SECRET_ANSWERS"))).toBe(false);
    expect(JSON.stringify([...response.headers])).not.toContain(
      s.record.drive!.fileId,
    );
    await expect(
      validateListeningDriveMp3(Buffer.from("M4A pretending MP3")),
    ).rejects.toThrow();
  });
  it("authorizes before metadata or OAuth and rejects changed owner/branch scope", async () => {
    const s = await setup(),
      calls = s.fake.calls.length;
    s.revoke();
    expect((await s.request()).status).toBe(404);
    expect(s.get).not.toHaveBeenCalled();
    expect(s.fake.calls).toHaveLength(calls);
    const other = await setup(),
      count = other.fake.calls.length;
    other.changeOwner();
    expect((await other.request()).status).toBe(404);
    expect(other.fake.calls).toHaveLength(count);
  });
  it("HEAD ignores Range and never opens bytes; partial GET uses scrubbed logical offsets", async () => {
    const s = await setup();
    const head = await s.request("HEAD", "bytes=1-9");
    expect(head.status).toBe(200);
    expect(s.fake.reads).toBe(0);
    expect(head.body).toBeNull();
    const response = await s.request("GET", "bytes=1-9");
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe(
      `bytes 1-9/${s.record.playback!.totalBytes}`,
    );
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      s.original.subarray(s.validated.start + 1, s.validated.start + 10),
    );
    expect((await s.request("GET", "bytes=99999999-")).status).toBe(416);
  });
  it("fails closed after a file is shared publicly, mutated or revision pin revoked", async () => {
    const s = await setup(),
      file = s.fake.files.get(s.record.drive!.fileId)!;
    file.public = true;
    expect((await s.request()).status).toBe(404);
    file.public = false;
    file.keepForever = false;
    expect((await s.request()).status).toBe(404);
    file.keepForever = true;
    file.bytes = Buffer.from(file.bytes);
    file.bytes[100] ^= 1;
    expect((await s.request()).status).toBe(404);
  });
  it("validates upstream range headers, cancels on downstream cancellation and uploads bounded private WAV", async () => {
    const s = await setup(),
      response = await s.request(),
      reader = response.body!.getReader();
    await reader.read();
    await reader.cancel();
    expect(s.fake.cancels).toBeGreaterThan(0);
    const bad = createListeningDriveApi(
      s.fake.config,
      async () => new Response(new Uint8Array(5), { status: 200 }),
    );
    await expect(async () => {
      for await (const _part of bad.read(s.record.drive!, 0, 5)) {
        void _part;
      }
    }).rejects.toThrow();
    const bytes = Buffer.alloc(1024 * 1024 + 44, 7);
    const ref = await s.api.upload({
      bytes: bytes.length,
      mimeType: "audio/wav",
      name: "clip.wav",
      read: async function* () {
        yield bytes.subarray(0, 1024 * 1024);
        yield bytes.subarray(1024 * 1024);
      },
    });
    expect(s.fake.files.get(ref.fileId)!.bytes).toEqual(bytes);
    expect(ref.originalSha256).toBe(sha(bytes));
    expect(ref.start).toBe(0);
  });
});
