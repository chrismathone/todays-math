// @vitest-environment node
import { createHash, randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listeningMediaUploadSchema } from "../../contracts/englishListeningMedia.contract";
import { createListeningMediaService } from "../../lib/english/listening/media/service";
import { LocalTempListeningMediaStore } from "../../lib/english/listening/media/localTempStore";

const stores: LocalTempListeningMediaStore[] = [];
afterEach(async () => {
  await Promise.all(stores.splice(0).map((s) => s.dispose()));
});
const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
async function* body(bytes: Uint8Array) {
  yield bytes;
}
function wav(samples = 80) {
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24);
  bytes.writeUInt32LE(16000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    bytes.writeInt16LE(Math.round(6000 * Math.sin(i / 3)), 44 + i * 2);
  return bytes;
}
async function fixture() {
  const store = await LocalTempListeningMediaStore.create();
  stores.push(store);
  let now = 1000;
  let allowed = true;
  const authorize = vi.fn(async () => allowed);
  const service = createListeningMediaService({
    store,
    authorize,
    now: () => now,
    limits: {
      chunkBytes: 128,
      maxTotalBytes: 4096,
      readChunkBytes: 32,
      uploadTtlMs: 500,
      maxDurationMs: 1000,
    },
  });
  const setId = randomUUID();
  const context = { actor: "teacher" };
  async function begin(
    bytes = wav(),
    mimeType = "audio/wav",
    expectedSha256 = sha(bytes),
  ) {
    return service.beginUpload(context, {
      setId,
      totalBytes: bytes.length,
      mimeType,
      expectedSha256,
    });
  }
  async function upload(bytes = wav(), mimeType = "audio/wav") {
    let receipt = await begin(bytes, mimeType);
    for (let offset = 0; offset < bytes.length; offset += 128) {
      const part = bytes.subarray(offset, offset + 128);
      receipt = await service.appendChunk(
        context,
        {
          setId,
          assetId: receipt.assetId,
          expectedRevision: receipt.revision,
          offset,
          byteLength: part.length,
          sha256: sha(part),
        },
        body(part),
      );
    }
    return receipt;
  }
  return {
    service,
    store,
    authorize,
    setId,
    context,
    begin,
    upload,
    revoke: () => {
      allowed = false;
    },
    advance: () => {
      now += 501;
    },
  };
}

describe("listening media upload boundary", () => {
  it("reports safe integer milliseconds rounded up after validating the real PCM duration", async () => {
    const f = await fixture();
    const bytes = wav(80);
    bytes.writeUInt32LE(44100, 24);
    bytes.writeUInt32LE(88200, 28);
    const r = await f.upload(bytes);
    const ready = await f.service.completeUpload(f.context, {
      setId: f.setId,
      assetId: r.assetId,
      expectedRevision: r.revision,
    });
    expect(ready).toMatchObject({ state: "ready", durationMs: 2 });
  });
  it("makes concurrent identical writes/finalization idempotent and rejects stale completion", async () => {
    const f = await fixture();
    const bytes = wav();
    const start = await f.begin(bytes);
    const first = bytes.subarray(0, 128);
    const request = {
      setId: f.setId,
      assetId: start.assetId,
      expectedRevision: 0,
      offset: 0,
      byteLength: first.length,
      sha256: sha(first),
    };
    const replies = await Promise.all([
      f.service.appendChunk(f.context, request, body(first)),
      f.service.appendChunk(f.context, request, body(first)),
    ]);
    expect(replies[0]).toEqual(replies[1]);
    const tail = bytes.subarray(128);
    const last = await f.service.appendChunk(
      f.context,
      {
        ...request,
        offset: 128,
        byteLength: tail.length,
        sha256: sha(tail),
        expectedRevision: 1,
      },
      body(tail),
    );
    const finish = {
      setId: f.setId,
      assetId: start.assetId,
      expectedRevision: last.revision,
    };
    await expect(
      f.service.completeUpload(f.context, { ...finish, expectedRevision: 0 }),
    ).rejects.toMatchObject({ code: "conflict" });
    const completions = await Promise.all([
      f.service.completeUpload(f.context, finish),
      f.service.completeUpload(f.context, finish),
    ]);
    expect(completions[0]).toEqual(completions[1]);
    expect(await f.store.get(start.assetId)).toMatchObject({
      revision: 3,
      receivedBytes: bytes.length,
      state: "ready",
    });
  });
  it("rejects unknown fields, unsafe numbers, empty files and unsupported declared types", () => {
    const input = {
      setId: randomUUID(),
      totalBytes: 50,
      mimeType: "audio/wav",
      expectedSha256: "a".repeat(64),
    };
    expect(listeningMediaUploadSchema.safeParse(input).success).toBe(true);
    for (const patch of [
      { filename: "answer-is-B.mp3" },
      { totalBytes: 0 },
      { totalBytes: Number.MAX_SAFE_INTEGER + 1 },
      { mimeType: "text/html" },
    ])
      expect(
        listeningMediaUploadSchema.safeParse({ ...input, ...patch }).success,
      ).toBe(false);
  });
  it("keeps incomplete content unavailable and only finalizes after complete SHA256 verification", async () => {
    const f = await fixture();
    const receipt = await f.begin();
    expect(
      (
        await f.service.serve(f.context, {
          setId: f.setId,
          assetId: receipt.assetId,
          method: "HEAD",
        })
      ).status,
    ).toBe(404);
    await expect(
      f.service.completeUpload(f.context, {
        setId: f.setId,
        assetId: receipt.assetId,
        expectedRevision: 0,
      }),
    ).rejects.toMatchObject({ code: "incomplete" });
    const uploaded = await f.upload();
    const ready = await f.service.completeUpload(f.context, {
      setId: f.setId,
      assetId: uploaded.assetId,
      expectedRevision: uploaded.revision,
    });
    expect(ready).toMatchObject({
      setId: f.setId,
      state: "ready",
      publishable: true,
      durationMs: 10,
    });
    expect(
      await f.service.completeUpload(f.context, {
        setId: f.setId,
        assetId: uploaded.assetId,
        expectedRevision: uploaded.revision,
      }),
    ).toEqual(ready);
  });
  it("accepts an exact stale retry, rejects changed bytes, gaps and concurrent conflicting appends", async () => {
    const f = await fixture();
    const bytes = wav();
    const receipt = await f.begin(bytes);
    const part = bytes.subarray(0, 128);
    const request = {
      setId: f.setId,
      assetId: receipt.assetId,
      offset: 0,
      expectedRevision: 0,
      byteLength: part.length,
      sha256: sha(part),
    };
    const first = await f.service.appendChunk(f.context, request, body(part));
    expect(await f.service.appendChunk(f.context, request, body(part))).toEqual(
      first,
    );
    await expect(
      f.service.appendChunk(f.context, { ...request, offset: 256 }, body(part)),
    ).rejects.toMatchObject({ code: "conflict" });
    const changed = Buffer.from(part);
    changed[100] ^= 1;
    await expect(
      f.service.appendChunk(
        f.context,
        { ...request, sha256: sha(changed) },
        body(changed),
      ),
    ).rejects.toMatchObject({ code: "conflict" });
    const rest = bytes.subarray(128);
    const other = Buffer.from(rest);
    other[10] ^= 1;
    const next = {
      ...request,
      offset: 128,
      expectedRevision: first.revision,
      byteLength: rest.length,
    };
    const results = await Promise.allSettled([
      f.service.appendChunk(
        f.context,
        { ...next, sha256: sha(rest) },
        body(rest),
      ),
      f.service.appendChunk(
        f.context,
        { ...next, sha256: sha(other) },
        body(other),
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  });
  it("bounds bytes and terminates oversized or truncated stream bodies without storing them", async () => {
    const f = await fixture();
    const bytes = wav();
    const receipt = await f.begin(bytes);
    const put = vi.spyOn(f.store, "putBlob");
    const closed = vi.fn();
    async function* excessive() {
      try {
        yield Buffer.alloc(129);
        yield Buffer.alloc(10000);
      } finally {
        closed();
      }
    }
    const request = {
      setId: f.setId,
      assetId: receipt.assetId,
      offset: 0,
      expectedRevision: 0,
      byteLength: 128,
      sha256: sha(bytes.subarray(0, 128)),
    };
    await expect(
      f.service.appendChunk(f.context, request, excessive()),
    ).rejects.toMatchObject({ code: "body_size" });
    expect(closed).toHaveBeenCalledOnce();
    expect(put).not.toHaveBeenCalled();
    await expect(
      f.service.appendChunk(f.context, request, body(Buffer.alloc(10))),
    ).rejects.toMatchObject({ code: "body_size" });
    await expect(f.begin(Buffer.alloc(4097))).rejects.toMatchObject({
      code: "too_large",
    });
  });
  it("fails closed for chunk and whole-file hashes, mismatched MIME, tags, and missing MP3 decoder", async () => {
    const f = await fixture();
    const bytes = wav();
    const start = await f.begin(bytes, "audio/wav", "0".repeat(64));
    let revision = 0;
    for (let offset = 0; offset < bytes.length; offset += 128) {
      const part = bytes.subarray(offset, offset + 128);
      const request = {
        setId: f.setId,
        assetId: start.assetId,
        offset,
        expectedRevision: revision,
        byteLength: part.length,
        sha256: sha(part),
      };
      if (!offset)
        await expect(
          f.service.appendChunk(
            f.context,
            { ...request, sha256: "0".repeat(64) },
            body(part),
          ),
        ).rejects.toMatchObject({ code: "hash_mismatch" });
      revision = (await f.service.appendChunk(f.context, request, body(part)))
        .revision;
    }
    await expect(
      f.service.completeUpload(f.context, {
        setId: f.setId,
        assetId: start.assetId,
        expectedRevision: revision,
      }),
    ).rejects.toMatchObject({ code: "hash_mismatch" });
    for (const [payload, type, blocker] of [
      [
        Buffer.from("ID3\x04\x00\x00\x00\x00\x00\x10secret-answer"),
        "audio/mpeg",
        "mp3_decoder_and_scrubber_unavailable",
      ],
      [bytes, "audio/mpeg", "type_signature_mismatch"],
      [
        Buffer.concat([bytes, Buffer.from("TAGanswer-is-B")]),
        "audio/wav",
        "unsupported_or_invalid_wave",
      ],
    ] as const) {
      const r = await f.upload(payload, type);
      const result = await f.service.completeUpload(f.context, {
        setId: f.setId,
        assetId: r.assetId,
        expectedRevision: r.revision,
      });
      expect(result).toMatchObject({
        state: "publish_blocked",
        publishable: false,
        blocker,
      });
      expect(
        (
          await f.service.serve(f.context, {
            setId: f.setId,
            assetId: r.assetId,
            method: "GET",
          })
        ).status,
      ).toBe(404);
    }
  });
  it("expires sessions and removes their blobs; a late completion cannot revive them", async () => {
    const f = await fixture();
    const r = await f.upload();
    f.advance();
    await expect(
      f.service.completeUpload(f.context, {
        setId: f.setId,
        assetId: r.assetId,
        expectedRevision: r.revision,
      }),
    ).rejects.toMatchObject({ code: "expired" });
    expect(await f.service.cleanupExpiredUploads()).toBe(1);
    expect(await f.store.get(r.assetId)).toMatchObject({
      state: "expired",
      chunks: [],
    });
    expect(
      (
        await f.service.serve(f.context, {
          setId: f.setId,
          assetId: r.assetId,
          method: "HEAD",
        })
      ).status,
    ).toBe(404);
  });
  it("checks current rights again after consuming an upload and before persisting bytes", async () => {
    const f = await fixture();
    const bytes = wav();
    const r = await f.begin(bytes);
    const put = vi.spyOn(f.store, "putBlob");
    const part = bytes.subarray(0, 128);
    async function* revokedBody() {
      yield part;
      f.revoke();
    }
    await expect(
      f.service.appendChunk(
        f.context,
        {
          setId: f.setId,
          assetId: r.assetId,
          expectedRevision: 0,
          offset: 0,
          byteLength: 128,
          sha256: sha(part),
        },
        revokedBody(),
      ),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(put).not.toHaveBeenCalled();
  });
  it("requires actual strict PCM header values and bounded duration", async () => {
    const f = await fixture();
    for (const mutate of [
      (b: Buffer) => {
        b[0] |= 0x80;
      },
      (b: Buffer) => {
        b.writeUInt16LE(3, 20);
      },
      (b: Buffer) => {
        b.writeUInt32LE(1, 28);
      },
      (b: Buffer) => {
        b.write("LIST", 36);
      },
      (b: Buffer) => {
        b.writeUInt32LE(128, 40);
      },
    ]) {
      const bytes = wav();
      mutate(bytes);
      const r = await f.upload(bytes);
      expect(
        await f.service.completeUpload(f.context, {
          setId: f.setId,
          assetId: r.assetId,
          expectedRevision: r.revision,
        }),
      ).toMatchObject({ publishable: false });
      expect(
        await f.service.getVerifiedReadiness(f.context, {
          setId: f.setId,
          assetId: r.assetId,
        }),
      ).toBeNull();
    }
    const store = await LocalTempListeningMediaStore.create();
    stores.push(store);
    const service = createListeningMediaService({
      store,
      authorize: async () => true,
      limits: { maxDurationMs: 1 },
    });
    const bytes = wav();
    const r = await service.beginUpload(
      {},
      {
        setId: f.setId,
        totalBytes: bytes.length,
        mimeType: "audio/wav",
        expectedSha256: sha(bytes),
      },
    );
    await service.appendChunk(
      {},
      {
        setId: f.setId,
        assetId: r.assetId,
        expectedRevision: 0,
        offset: 0,
        byteLength: bytes.length,
        sha256: sha(bytes),
      },
      body(bytes),
    );
    expect(
      await service.completeUpload(
        {},
        { setId: f.setId, assetId: r.assetId, expectedRevision: 1 },
      ),
    ).toMatchObject({ blocker: "duration_limit", publishable: false });
  });
  it("keeps a failed cleanup retryable and never deletes ready assets at upload expiry", async () => {
    const f = await fixture();
    const r = await f.upload();
    const pending = await f.upload();
    const completion = await f.service.completeUpload(f.context, {
      setId: f.setId,
      assetId: r.assetId,
      expectedRevision: r.revision,
    });
    f.advance();
    const remove = vi
      .spyOn(f.store, "deleteBlob")
      .mockRejectedValueOnce(new Error("disk busy"));
    await expect(f.service.cleanupExpiredUploads()).rejects.toThrow(
      "disk busy",
    );
    expect(await f.store.get(pending.assetId)).toMatchObject({
      state: "expired",
    });
    expect(await f.service.cleanupExpiredUploads()).toBe(1);
    expect(remove).toHaveBeenCalled();
    expect(
      await f.service.getVerifiedReadiness(f.context, {
        setId: f.setId,
        assetId: r.assetId,
      }),
    ).toEqual(completion);
    expect(
      (
        await f.service.serve(f.context, {
          setId: f.setId,
          assetId: r.assetId,
          method: "HEAD",
        })
      ).status,
    ).toBe(200);
  });
});

describe("listening media authenticated responses", () => {
  it("reauthorizes HEAD and each Range before metadata/bytes, hiding existing and missing assets equally", async () => {
    const f = await fixture();
    const r = await f.upload();
    await f.service.completeUpload(f.context, {
      setId: f.setId,
      assetId: r.assetId,
      expectedRevision: r.revision,
    });
    const request = {
      setId: f.setId,
      assetId: r.assetId,
      method: "GET",
      range: "bytes=1-9",
    };
    expect((await f.service.serve(f.context, request)).status).toBe(206);
    f.revoke();
    const get = vi.spyOn(f.store, "get");
    const read = vi.spyOn(f.store, "readBlob");
    for (const assetId of [r.assetId, randomUUID()])
      for (const method of ["HEAD", "GET"]) {
        const response = await f.service.serve(f.context, {
          ...request,
          assetId,
          method,
        });
        expect(response.status).toBe(404);
        expect(await response.text()).toBe("");
        expect(response.headers.get("Content-Range")).toBeNull();
        expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      }
    expect(get).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });
  it("serves exact closed/open/suffix ranges with bounded lazy reads and opaque headers", async () => {
    const f = await fixture();
    const bytes = wav();
    const r = await f.upload(bytes);
    await f.service.completeUpload(f.context, {
      setId: f.setId,
      assetId: r.assetId,
      expectedRevision: r.revision,
    });
    const read = vi.spyOn(f.store, "readBlob");
    for (const [range, start, end] of [
      ["bytes=20-150", 20, 151],
      ["bytes=180-", 180, 204],
      ["bytes=-10", 194, 204],
      ["bytes=-999", 0, 204],
      ["bytes=200-999", 200, 204],
    ] as const) {
      read.mockClear();
      const response = await f.service.serve(f.context, {
        setId: f.setId,
        assetId: r.assetId,
        method: "GET",
        range,
      });
      expect(response.status).toBe(206);
      expect(read).not.toHaveBeenCalled();
      expect(response.headers.get("Content-Range")).toBe(
        `bytes ${start}-${end - 1}/${bytes.length}`,
      );
      expect(response.headers.get("Content-Length")).toBe(String(end - start));
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("Content-Disposition")).toBe(
        `inline; filename="audio-${r.assetId}.wav"`,
      );
      const reader = response.body!.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const piece = await reader.read();
        if (piece.done) break;
        expect(piece.value.length).toBeLessThanOrEqual(32);
        chunks.push(piece.value);
      }
      expect(Buffer.concat(chunks)).toEqual(bytes.subarray(start, end));
    }
    read.mockClear();
    const head = await f.service.serve(f.context, {
      setId: f.setId,
      assetId: r.assetId,
      method: "HEAD",
      range: "bytes=invalid",
    });
    expect(head.status).toBe(200);
    expect(head.body).toBeNull();
    expect(head.headers.get("Content-Length")).toBe("204");
    expect(read).not.toHaveBeenCalled(); // HTTP Range only applies to GET.
    for (const range of [
      "bytes=204-",
      "bytes=9-1",
      "bytes=-0",
      "bytes=0-1,4-5",
      "bytes=",
      "bytes=9007199254740993-",
      "bytes=+1-2",
      "items=0-2",
    ]) {
      const response = await f.service.serve(f.context, {
        setId: f.setId,
        assetId: r.assetId,
        method: "GET",
        range,
      });
      expect(response.status).toBe(416);
      expect(response.headers.get("Content-Range")).toBe("bytes */204");
      expect(response.body).toBeNull();
    }
  });
  it("rejects another set reference and fails closed when authorization throws", async () => {
    const f = await fixture();
    const r = await f.upload();
    await f.service.completeUpload(f.context, {
      setId: f.setId,
      assetId: r.assetId,
      expectedRevision: r.revision,
    });
    expect(
      (
        await f.service.serve(f.context, {
          setId: randomUUID(),
          assetId: r.assetId,
          method: "GET",
        })
      ).status,
    ).toBe(404);
    const get = vi.spyOn(f.store, "get");
    get.mockClear();
    f.authorize.mockRejectedValueOnce(new Error("auth unavailable"));
    expect(
      (
        await f.service.serve(f.context, {
          setId: f.setId,
          assetId: r.assetId,
          method: "HEAD",
        })
      ).status,
    ).toBe(404);
    expect(get).not.toHaveBeenCalled();
  });
  it("cancels the storage reader and rejects oversized or truncated adapter output", async () => {
    const f = await fixture();
    const r = await f.upload();
    await f.service.completeUpload(f.context, {
      setId: f.setId,
      assetId: r.assetId,
      expectedRevision: r.revision,
    });
    const closed = vi.fn();
    const read = vi
      .spyOn(f.store, "readBlob")
      .mockImplementation(async function* () {
        try {
          yield Buffer.alloc(32);
          yield Buffer.alloc(32);
        } finally {
          closed();
        }
      });
    const request = { setId: f.setId, assetId: r.assetId, method: "GET" };
    const reader = (
      await f.service.serve(f.context, request)
    ).body!.getReader();
    await reader.read();
    await reader.cancel();
    expect(closed).toHaveBeenCalledOnce();
    read.mockImplementation(async function* () {
      yield Buffer.alloc(33);
    });
    await expect(
      (await f.service.serve(f.context, request)).arrayBuffer(),
    ).rejects.toMatchObject({ code: "storage_integrity" });
    read.mockImplementation(async function* () {
      yield Buffer.alloc(1);
    });
    await expect(
      (await f.service.serve(f.context, request)).arrayBuffer(),
    ).rejects.toMatchObject({ code: "storage_integrity" });
  });
});
