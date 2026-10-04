// @vitest-environment node
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import {
  listeningMediaUploadSchema,
  listeningMediaCompletionSchema,
} from "@/contracts/englishListeningMedia.contract";
import { LocalTempListeningMediaStore } from "@/lib/english/listening/media/localTempStore";
import { createListeningMediaService } from "@/lib/english/listening/media/service";
import {
  decodeMp3,
  parseMp3,
  MAX_DURATION_MS,
  MAX_PLAYBACK_BYTES,
} from "@/lib/english/listening/media/mp3";
import { decodeListeningMp3Clip } from "@/lib/english/listening/media/mp3Clip";
import { planListeningWaveClip } from "@/lib/english/listening/media/clip";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";

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
function tagged() {
  const text = Buffer.from("SECRET_ANSWER_AND_TRANSCRIPT");
  const tag = Buffer.concat([
    Buffer.from([73, 68, 51, 3, 0, 0, 0, 0, 0, text.length]),
    text,
  ]);
  const trailer = Buffer.alloc(128);
  trailer.write("TAG");
  text.copy(trailer, 3);
  return Buffer.concat([tag, tone, trailer]);
}
async function pcm(bytes: Buffer) {
  const pieces: Buffer[] = [];
  const decoded = await decodeMp3(
    bytes,
    { maxDurationMs: MAX_DURATION_MS, maxPlaybackBytes: MAX_PLAYBACK_BYTES },
    async (part) => {
      pieces.push(part);
    },
  );
  return Buffer.concat([decoded.header, ...pieces]);
}
async function setup(maxDurationMs = MAX_DURATION_MS) {
  const store = await LocalTempListeningMediaStore.create();
  stores.push(store);
  const ownerId = randomUUID(),
    setId = randomUUID();
  let allow = true;
  const service = createListeningMediaService({
    store,
    mp3PlaybackEncoding: "scrubbed_mp3",
    authorize: async () => allow,
    resolveScope: async () => ({ ownerId, branchId: null }),
    limits: { chunkBytes: 1024, readChunkBytes: 512, maxDurationMs },
  });
  async function upload(bytes: Buffer) {
    let receipt = await service.beginUpload(null, {
      setId,
      totalBytes: bytes.length,
      mimeType: "audio/mpeg",
      expectedSha256: hash(bytes),
    });
    for (let offset = 0; offset < bytes.length; offset += receipt.chunkBytes) {
      const part = bytes.subarray(offset, offset + receipt.chunkBytes);
      receipt = await service.appendChunk(
        null,
        {
          setId,
          assetId: receipt.assetId,
          expectedRevision: receipt.revision,
          offset,
          byteLength: part.length,
          sha256: hash(part),
        },
        body(part),
      );
    }
    const request = {
      setId,
      assetId: receipt.assetId,
      expectedRevision: receipt.revision,
    };
    const ready = await service.completeUpload(null, request);
    return { request, ready };
  }
  return {
    store,
    service,
    upload,
    setId,
    revoke: () => {
      allow = false;
    },
  };
}
describe("private compressed listening archive", () => {
  it("fully validates audio, strips ID3 and serves exact original MPEG frames through shared original blobs", async () => {
    const f = await setup();
    const original = tagged();
    const { request, ready } = await f.upload(original);
    const playbackRequest = { setId: request.setId, assetId: request.assetId };
    expect(ready).toMatchObject({
      state: "ready",
      mimeType: "audio/mpeg",
      originalSha256: hash(original),
    });
    expect(listeningMediaCompletionSchema.safeParse(ready).success).toBe(true);
    const record = (await f.store.get(request.assetId))!;
    expect(record.mp3PlaybackEncoding).toBe("scrubbed_mp3");
    expect(
      new Set(
        [...record.chunks, ...record.playback!.chunks].map((part) => part.key),
      ).size,
    ).toBe(record.chunks.length);
    expect(record.playback!.chunks[0].blobOffset).toBeGreaterThan(0);
    const expected = Buffer.concat(parseMp3(original, MAX_DURATION_MS).frames);
    const response = await f.service.serve(null, {
      ...playbackRequest,
      method: "GET",
    });
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    const actual = Buffer.from(await response.arrayBuffer());
    expect(actual).toEqual(expected);
    expect(actual.includes(Buffer.from("SECRET_ANSWER"))).toBe(false);
    expect(await pcm(actual)).toEqual(await pcm(original));
    if (ready.state !== "ready") throw Error("archive blocked");
    expect(hash(actual)).toBe(ready.sha256);
    expect(await f.service.completeUpload(null, request)).toEqual(ready);
    const range = await f.service.serve(null, {
      ...playbackRequest,
      method: "GET",
      range: "bytes=1000-2200",
    });
    expect(range.status).toBe(206);
    expect(Buffer.from(await range.arrayBuffer())).toEqual(
      expected.subarray(1000, 2201),
    );
    const head = await f.service.serve(null, {
      ...playbackRequest,
      method: "HEAD",
    });
    expect(head.headers.get("content-length")).toBe(String(expected.length));
    expect(await head.text()).toBe("");
    f.revoke();
    expect(
      (await f.service.serve(null, { ...playbackRequest, method: "GET" }))
        .status,
    ).toBe(404);
  });
  it("retains the server-selected encoding when a default service retries completion", async () => {
    const f = await setup();
    const { request, ready } = await f.upload(tagged());
    const record = (await f.store.get(request.assetId))!;
    const ordinary = createListeningMediaService({
      store: f.store,
      authorize: async () => true,
      resolveScope: async () => ({ ownerId: record.ownerId, branchId: null }),
    });
    expect(await ordinary.completeUpload(null, request)).toEqual(ready);
    expect(
      listeningMediaUploadSchema.safeParse({
        setId: f.setId,
        totalBytes: 1,
        mimeType: "audio/mpeg",
        expectedSha256: "a".repeat(64),
        mp3PlaybackEncoding: "scrubbed_mp3",
      }).success,
    ).toBe(false);
  });
  it("rejects malformed frames and excessive duration before archive readiness", async () => {
    const f = await setup();
    const bad = Buffer.from(tone);
    bad[bad.length - 2] = 0;
    const result = await f.upload(Buffer.concat([bad, Buffer.from([0])]));
    expect(result.ready).toMatchObject({
      state: "publish_blocked",
      blocker: "unsupported_or_invalid_mp3",
    });
    const short = await setup(1);
    expect((await short.upload(tone)).ready).toMatchObject({
      state: "publish_blocked",
      blocker: "duration_limit",
    });
  });
  it.each([false, true])(
    "clips decoded MPEG with exact PCM overlap/order semantics (overlap=%s)",
    async (overlap) => {
      const questions = englishListeningFixture()
        .groups[0].questions.map((question, index) => ({
          ...question,
          audioRange: index
            ? { startMs: overlap ? 250 : 650, endMs: 950 }
            : { startMs: 100, endMs: 500 },
          evidence: [],
        }))
        .reverse();
      const original = tagged();
      const canonical = await pcm(original);
      const expected = planListeningWaveClip(
        canonical.subarray(0, 44),
        canonical.length,
        questions,
      );
      const decoded = await decodeListeningMp3Clip(original, questions);
      try {
        const pieces = [decoded.plan.header];
        for (const range of decoded.plan.ranges)
          for await (const part of decoded.readRange(
            range.start,
            range.endExclusive,
          ))
            pieces.push(part);
        expect(Buffer.concat(pieces)).toEqual(
          Buffer.concat([
            expected.header,
            ...expected.ranges.map((range) =>
              canonical.subarray(range.start, range.endExclusive),
            ),
          ]),
        );
        expect(decoded.plan.audioRangeByQuestionId).toEqual(
          expected.audioRangeByQuestionId,
        );
      } finally {
        await decoded.dispose();
      }
      await expect(async () => {
        for await (const _ of decoded.readRange(44, 46)) void _;
      }).rejects.toMatchObject({ code: "ENOENT" });
    },
  );
});
