// @vitest-environment node
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createListeningMediaService } from "../../lib/english/listening/media/service";
import { LocalTempListeningMediaStore } from "../../lib/english/listening/media/localTempStore";
import {
  decodeMp3,
  MAX_PLAYBACK_BYTES,
  parseMp3,
} from "../../lib/english/listening/media/mp3";
import { inspectListeningMedia } from "../../lib/english/listening/media/inspect";

const tone = readFileSync(
  new URL("../fixtures/english-listening/tone.mp3", import.meta.url),
);
const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const stores: LocalTempListeningMediaStore[] = [];
afterEach(async () => {
  await Promise.all(stores.splice(0).map((store) => store.dispose()));
});
async function* body(bytes: Uint8Array) {
  yield bytes;
}
function taggedMp3() {
  const answer = Buffer.from("SECRET_ANSWER_B_AND_TRANSCRIPT", "utf8");
  const payload = Buffer.concat([Buffer.from([3]), answer]);
  const frame = Buffer.alloc(10);
  frame.write("TIT2");
  frame.writeUInt32BE(payload.length, 4);
  const header = Buffer.from([
    73,
    68,
    51,
    3,
    0,
    0,
    0,
    0,
    0,
    frame.length + payload.length,
  ]);
  const id3v1 = Buffer.alloc(128);
  id3v1.write("TAG");
  answer.copy(id3v1, 3);
  return Buffer.concat([header, frame, payload, tone, id3v1]);
}
async function setup(limits = {}) {
  const store = await LocalTempListeningMediaStore.create();
  stores.push(store);
  const setId = randomUUID(),
    ownerId = randomUUID();
  let authorized = true;
  const service = createListeningMediaService({
    store,
    authorize: async () => authorized,
    resolveScope: async () => ({ ownerId, branchId: null }),
    limits: { chunkBytes: 1024, readChunkBytes: 512, ...limits },
  });
  async function upload(bytes = taggedMp3(), mimeType = "audio/mpeg") {
    let receipt = await service.beginUpload(null, {
      setId,
      totalBytes: bytes.length,
      mimeType,
      expectedSha256: hash(bytes),
    });
    for (let offset = 0; offset < bytes.length; offset += receipt.chunkBytes) {
      const chunk = bytes.subarray(offset, offset + receipt.chunkBytes);
      receipt = await service.appendChunk(
        null,
        {
          setId,
          assetId: receipt.assetId,
          expectedRevision: receipt.revision,
          offset,
          byteLength: chunk.length,
          sha256: hash(chunk),
        },
        body(chunk),
      );
    }
    return {
      setId,
      assetId: receipt.assetId,
      expectedRevision: receipt.revision,
    };
  }
  return {
    store,
    service,
    upload,
    setId,
    revoke: () => {
      authorized = false;
    },
  };
}

describe("real portable MP3 decoding", () => {
  it.each(["tone-vbr-stereo.mp3", "tone-mpeg2.mp3"])(
    "fully decodes independent LAME fixture %s, including Xing and gapless duration",
    async (file) => {
      const bytes = readFileSync(
        new URL(`../fixtures/english-listening/${file}`, import.meta.url),
      );
      const f = await setup({ maxDurationMs: 1000 });
      const request = await f.upload(bytes);
      const ready = await f.service.completeUpload(null, request);
      expect(ready).toMatchObject({ state: "ready", durationMs: 1000 });
      const reply = await f.service.serve(null, {
        setId: f.setId,
        assetId: request.assetId,
        method: "GET",
      });
      const wav = Buffer.from(await reply.arrayBuffer());
      expect(wav.includes(Buffer.from("SECRET_ANSWER"))).toBe(false);
      expect(wav.readUInt16LE(22)).toBe(file.includes("stereo") ? 2 : 1);
      expect(wav.readUInt32LE(24)).toBe(
        file.includes("stereo") ? 48000 : 22050,
      );
      // Removing exactly one complete frame still conflicts with Xing's file frame count.
      const frames = parseMp3(bytes, 600000).frames;
      const truncated = bytes.subarray(0, bytes.length - frames.at(-1)!.length);
      const another = await f.upload(truncated);
      expect(await f.service.completeUpload(null, another)).toMatchObject({
        state: "publish_blocked",
        blocker: "unsupported_or_invalid_mp3",
      });
    },
  );
  it("aborts a stalled upload body immediately without opening a blob", async () => {
    const f = await setup();
    const abort = new AbortController();
    const r = await f.service.beginUpload(null, {
      setId: f.setId,
      totalBytes: tone.length,
      mimeType: "audio/mpeg",
      expectedSha256: hash(tone),
    });
    const closed = vi.fn(async () => ({
      done: true as const,
      value: undefined,
    }));
    const stalled = {
      [Symbol.asyncIterator]: () => ({
        next: () => new Promise<IteratorResult<Uint8Array>>(() => {}),
        return: closed,
      }),
    };
    const pending = f.service.appendChunk(
      null,
      {
        setId: f.setId,
        assetId: r.assetId,
        expectedRevision: 0,
        offset: 0,
        byteLength: 1024,
        sha256: hash(tone.subarray(0, 1024)),
      },
      stalled,
      { signal: abort.signal },
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    abort.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(closed).toHaveBeenCalledOnce();
    expect((await f.store.get(r.assetId))!.chunks).toHaveLength(0);
  });
  it("decodes a real encoded tone into a PCM waveform, removing ID3v2/v1 and preserving original identity", async () => {
    const f = await setup();
    const bytes = taggedMp3();
    const request = await f.upload(bytes);
    const ready = await f.service.completeUpload(null, request);
    expect(ready).toMatchObject({
      state: "ready",
      mimeType: "audio/wav",
      originalSha256: hash(bytes),
      playbackRevision: 1,
    });
    if (ready.state !== "ready") throw Error("decode blocked");
    expect(ready.durationMs).toBeGreaterThanOrEqual(1000);
    expect(ready.durationMs).toBeLessThan(1100);
    expect(ready.totalBytes).toBe(bytes.length);
    const response = await f.service.serve(null, {
      setId: f.setId,
      assetId: request.assetId,
      method: "GET",
    });
    const wav = Buffer.from(await response.arrayBuffer());
    expect(hash(wav)).toBe(ready.sha256);
    expect(ready.sha256).not.toBe(hash(bytes));
    expect(wav.length).toBe(ready.playbackBytes);
    expect(
      inspectListeningMedia(
        wav.subarray(0, 44),
        wav.length,
        "audio/wav",
        600000,
      ),
    ).toMatchObject({ playable: true, durationMs: ready.durationMs });
    expect(wav.includes(Buffer.from("SECRET_ANSWER"))).toBe(false);
    expect(wav.includes(Buffer.from("TIT2"))).toBe(false);
    expect(wav.subarray(0, 12).toString("ascii")).toMatch(
      /^RIFF[\s\S]{4}WAVE$/,
    );
    // Independent signal measurement: real 440Hz tone, not an empty/fake PCM header.
    let energy = 0,
      crossings = 0,
      previous = 0;
    const start = 44 + 4410 * 2,
      stop = start + 22050 * 2;
    for (let p = start; p < stop; p += 2) {
      const sample = wav.readInt16LE(p);
      energy += sample * sample;
      if (sample >= 0 && previous < 0) crossings++;
      previous = sample;
    }
    expect(Math.sqrt(energy / 22050)).toBeGreaterThan(5000);
    expect(crossings * 2).toBeGreaterThan(435);
    expect(crossings * 2).toBeLessThan(445);
    const record = await f.store.get(request.assetId);
    expect(record?.expectedSha256).toBe(hash(bytes));
    const original: Buffer[] = [];
    for (const chunk of record!.chunks)
      for await (const part of f.store.readBlob(chunk.key, {
        start: 0,
        endExclusive: chunk.byteLength,
        maxChunkBytes: 512,
      }))
        original.push(Buffer.from(part));
    expect(Buffer.concat(original)).toEqual(bytes);
    expect(
      record!.playback!.chunks.some((p) =>
        record!.chunks.some((o) => o.key === p.key),
      ),
    ).toBe(false);
    expect(await f.service.completeUpload(null, request)).toEqual(ready);
    for (const range of [
      "bytes=0-43",
      "bytes=1000-2500",
      "bytes=-600",
      "bytes=70000-",
    ]) {
      const reply = await f.service.serve(null, {
        setId: f.setId,
        assetId: request.assetId,
        method: "GET",
        range,
      });
      expect(reply.status).toBe(206);
      const match = reply.headers
        .get("content-range")!
        .match(/bytes (\d+)-(\d+)\/(\d+)/)!;
      expect(Number(match[3])).toBe(wav.length);
      expect(Buffer.from(await reply.arrayBuffer())).toEqual(
        wav.subarray(Number(match[1]), Number(match[2]) + 1),
      );
    }
    f.revoke();
    expect(
      (
        await f.service.serve(null, {
          setId: f.setId,
          assetId: request.assetId,
          method: "HEAD",
        })
      ).status,
    ).toBe(404);
  });
  it("converges concurrent completion and leaves only immutable accepted originals and derivative", async () => {
    const f = await setup();
    const request = await f.upload();
    const results = await Promise.all([
      f.service.completeUpload(null, request),
      f.service.completeUpload(null, request),
    ]);
    expect(results[0]).toEqual(results[1]);
    const ready = results[0];
    expect(ready.state).toBe("ready");
    const response = await f.service.serve(null, {
      setId: f.setId,
      assetId: request.assetId,
      method: "GET",
    });
    if (ready.state === "ready")
      expect(hash(new Uint8Array(await response.arrayBuffer()))).toBe(
        ready.sha256,
      );
  });
  it.each([
    "truncated",
    "broken-header",
    "junk-tail",
    "metadata-only",
    "truncated-id3",
    "fake-signature",
  ])(
    "rejects %s instead of resynchronizing or serving originals",
    async (kind) => {
      let bytes = Buffer.from(tone);
      if (kind === "truncated") bytes = bytes.subarray(0, bytes.length - 1);
      if (kind === "broken-header") {
        const first = parseMp3(bytes, 600000).frames[0].length;
        bytes[first] = 0;
      }
      if (kind === "junk-tail")
        bytes = Buffer.concat([bytes, Buffer.from("ANSWER_B")]);
      if (kind === "metadata-only") bytes = Buffer.from("ID3\x04\0\0\0\0\0\0");
      if (kind === "truncated-id3")
        bytes = Buffer.from("ID3\x04\0\0\0\0\x7f\x7f");
      if (kind === "fake-signature") bytes = Buffer.from([255, 251, 144, 0]);
      const f = await setup();
      const request = await f.upload(bytes);
      expect(await f.service.completeUpload(null, request)).toMatchObject({
        state: "publish_blocked",
        blocker: "unsupported_or_invalid_mp3",
      });
      expect(
        await f.service.getVerifiedReadiness(null, {
          setId: f.setId,
          assetId: request.assetId,
        }),
      ).toBeNull();
      expect(
        (
          await f.service.serve(null, {
            setId: f.setId,
            assetId: request.assetId,
            method: "GET",
          })
        ).status,
      ).toBe(404);
    },
  );
  it("rejects duration/output overflow before publication and deletes partial derivative chunks", async () => {
    for (const [limits, blocker] of [
      [{ maxDurationMs: 200 }, "duration_limit"],
      [{ maxPlaybackBytes: 1000 }, "output_limit"],
    ] as const) {
      const f = await setup(limits);
      const request = await f.upload();
      const put = vi.spyOn(f.store, "putBlob"),
        del = vi.spyOn(f.store, "deleteBlob");
      expect(await f.service.completeUpload(null, request)).toMatchObject({
        state: "publish_blocked",
        blocker,
      });
      expect(del.mock.calls.length).toBe(put.mock.calls.length);
    }
  });
  it("cancels between decoder batches, frees output staging, and allows a clean retry", async () => {
    const f = await setup();
    const request = await f.upload();
    const abort = new AbortController();
    const originalPut = f.store.putBlob.bind(f.store);
    const spy = vi
      .spyOn(f.store, "putBlob")
      .mockImplementation(async (bytes) => {
        const key = await originalPut(bytes);
        abort.abort();
        return key;
      });
    const del = vi.spyOn(f.store, "deleteBlob");
    await expect(
      f.service.completeUpload(null, request, { signal: abort.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(del.mock.calls.length).toBe(spy.mock.calls.length);
    spy.mockRestore();
    expect((await f.store.get(request.assetId))?.state).toBe("uploading");
    expect(await f.service.completeUpload(null, request)).toMatchObject({
      state: "ready",
    });
  });
  it("rejects a malicious declared Xing frame total and hard limits cannot be raised", async () => {
    const frames = parseMp3(tone, 600000).frames;
    const modified = Buffer.from(tone);
    modified.write("Xing", 21);
    modified.writeUInt32BE(1, 25);
    modified.writeUInt32BE(frames.length + 10, 29);
    await expect(
      decodeMp3(
        modified,
        { maxDurationMs: 600000, maxPlaybackBytes: MAX_PLAYBACK_BYTES },
        async () => {},
      ),
    ).rejects.toMatchObject({ blocker: "unsupported_or_invalid_mp3" });
    await expect(setup({ maxDurationMs: 600001 })).rejects.toMatchObject({
      code: "invalid_request",
    });
    await expect(
      setup({ maxTotalBytes: 16 * 1024 * 1024 + 1 }),
    ).rejects.toMatchObject({ code: "invalid_request" });
  });
});
