/**
 * Run: node node_modules/tsx/dist/cli.mjs scripts/qa/english-listening/media-probe.ts
 * Offline local-temp probe. No environment loading, network, DB, AI or audio device.
 * Synthesizes an original 440Hz PCM tone, not an external/copyrighted recording.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { LISTENING_MEDIA_CAPABILITIES } from "../../../src/contracts/englishListeningMedia.contract";
import { LocalTempListeningMediaStore } from "../../../src/lib/english/listening/media/localTempStore";
import { createListeningMediaService } from "../../../src/lib/english/listening/media/service";

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
async function* body(bytes: Uint8Array) {
  for (let offset = 0; offset < bytes.length; offset += 64 * 1024)
    yield bytes.subarray(offset, offset + 64 * 1024);
}
function originalTone(seconds: number) {
  const rate = 48000;
  const samples = rate * seconds;
  const result = Buffer.alloc(44 + samples * 2);
  result.write("RIFF", 0);
  result.writeUInt32LE(result.length - 8, 4);
  result.write("WAVEfmt ", 8);
  result.writeUInt32LE(16, 16);
  result.writeUInt16LE(1, 20);
  result.writeUInt16LE(1, 22);
  result.writeUInt32LE(rate, 24);
  result.writeUInt32LE(rate * 2, 28);
  result.writeUInt16LE(2, 32);
  result.writeUInt16LE(16, 34);
  result.write("data", 36);
  result.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    result.writeInt16LE(
      Math.round(4000 * Math.sin((2 * Math.PI * 440 * i) / rate)),
      44 + 2 * i,
    );
  return result;
}
async function main() {
  const started = performance.now();
  const store = await LocalTempListeningMediaStore.create();
  let allowed = true;
  let now = Date.now();
  let metadataReads = 0;
  let byteReads = 0;
  let maxReadBytes = 0;
  const originalGet = store.get.bind(store);
  const originalRead = store.readBlob.bind(store);
  store.get = async (id) => {
    metadataReads++;
    return originalGet(id);
  };
  store.readBlob = async function* (key, range) {
    byteReads++;
    for await (const part of originalRead(key, range)) {
      maxReadBytes = Math.max(maxReadBytes, part.length);
      yield part;
    }
  };
  // Trusted set row as the server would read it; the probe reassigns it to prove fail-closed.
  const owner = randomUUID();
  const branch = randomUUID();
  let scope: unknown = { ownerId: owner, branchId: branch };
  const service = createListeningMediaService({
    store,
    authorize: async () => allowed,
    resolveScope: async () => scope,
    now: () => now,
  });
  const context = { actor: "offline-probe" };
  const setId = randomUUID();
  const checks: string[] = [];
  const check = (name: string) => checks.push(name);
  const begin = (
    bytes: Uint8Array,
    expectedSha256 = sha(bytes),
    mimeType = "audio/wav",
  ) =>
    service.beginUpload(context, {
      setId,
      totalBytes: bytes.length,
      expectedSha256,
      mimeType,
    });
  try {
    const tone = originalTone(60);
    assert(tone.length > 4 * 1024 * 1024);
    let upload = await begin(tone);
    const target = { setId, assetId: upload.assetId };
    assert.equal(
      (await service.serve(context, { ...target, method: "HEAD" })).status,
      404,
    );
    await assert.rejects(
      service.completeUpload(context, {
        ...target,
        expectedRevision: upload.revision,
      }),
      { code: "incomplete" },
    );
    check("incomplete assets cannot be played or finalized");
    let chunks = 0;
    for (let offset = 0; offset < tone.length; offset += upload.chunkBytes) {
      const part = tone.subarray(offset, offset + upload.chunkBytes);
      const request = {
        ...target,
        offset,
        expectedRevision: upload.revision,
        byteLength: part.length,
        sha256: sha(part),
      };
      if (offset === 0)
        await assert.rejects(
          service.appendChunk(
            context,
            { ...request, offset: upload.chunkBytes },
            body(part),
          ),
          { code: "conflict" },
        );
      upload = await service.appendChunk(context, request, body(part));
      chunks++;
      assert.deepEqual(
        await service.appendChunk(context, request, body(part)),
        upload,
      );
      if (offset === 0) {
        const changed = Buffer.from(part);
        changed[50] ^= 1;
        await assert.rejects(
          service.appendChunk(
            context,
            { ...request, sha256: sha(changed) },
            body(changed),
          ),
          { code: "conflict" },
        );
      }
    }
    check("sequential chunks, exact retries and conflicts");
    const completion = await service.completeUpload(context, {
      ...target,
      expectedRevision: upload.revision,
    });
    assert.equal(completion.state, "ready");
    assert.deepEqual(
      await service.getVerifiedReadiness(context, target),
      completion,
    );
    check("whole-file SHA256 and verified readiness");
    assert.equal(completion.ownerId, owner);
    assert.equal(completion.branchId, branch);
    assert.equal(completion.verifiedAt, now);
    for (const reassigned of [
      { ownerId: randomUUID(), branchId: branch },
      { ownerId: owner, branchId: randomUUID() },
      null,
    ]) {
      scope = reassigned;
      const readsBefore = { metadataReads, byteReads };
      assert.equal(
        (await service.serve(context, { ...target, method: "HEAD" })).status,
        404,
      );
      await assert.rejects(service.getVerifiedReadiness(context, target), {
        code: "not_found",
      });
      assert.equal(byteReads, readsBefore.byteReads);
      if (reassigned === null)
        assert.equal(metadataReads, readsBefore.metadataReads);
    }
    scope = { ownerId: owner, branchId: branch };
    assert.equal(
      (await service.serve(context, { ...target, method: "HEAD" })).status,
      200,
    );
    check(
      "stored owner/branch and server verification time; reassignment or unresolvable set fails closed",
    );
    const full = await service.serve(context, { ...target, method: "GET" });
    assert.equal(full.status, 200);
    const downloadHash = createHash("sha256");
    let downloadBytes = 0;
    const fullReader = full.body!.getReader();
    try {
      while (true) {
        const part = await fullReader.read();
        if (part.done) break;
        downloadHash.update(part.value);
        downloadBytes += part.value.length;
      }
    } finally {
      fullReader.releaseLock();
    }
    assert.equal(downloadBytes, tone.length);
    assert.equal(downloadHash.digest("hex"), sha(tone));
    const seeks = [
      ["bytes=1048500-1048700", 1048500, 1048701],
      [`bytes=${tone.length - 101}-`, tone.length - 101, tone.length],
      ["bytes=-97", tone.length - 97, tone.length],
    ] as const;
    for (const [range, first, end] of seeks) {
      const response = await service.serve(context, {
        ...target,
        method: "GET",
        range,
      });
      assert.equal(response.status, 206);
      assert.equal(
        response.headers.get("Content-Range"),
        `bytes ${first}-${end - 1}/${tone.length}`,
      );
      assert.deepEqual(
        Buffer.from(await response.arrayBuffer()),
        tone.subarray(first, end),
      );
    }
    check(
      "full streaming hash and closed/open/suffix seeks across chunk boundary",
    );
    const beforeHead = byteReads;
    const head = await service.serve(context, {
      ...target,
      method: "HEAD",
      range: "bytes=0-1",
    });
    assert.equal(head.status, 200);
    assert.equal(head.body, null);
    assert.equal(byteReads, beforeHead);
    assert.equal(head.headers.get("Content-Length"), String(tone.length));
    assert.equal(head.headers.get("Cache-Control"), "private, no-store");
    assert.equal(head.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(
      head.headers.get("Content-Disposition"),
      `inline; filename="audio-${target.assetId}.wav"`,
    );
    const invalid = await service.serve(context, {
      ...target,
      method: "GET",
      range: `bytes=${tone.length}-`,
    });
    assert.equal(invalid.status, 416);
    assert.equal(
      invalid.headers.get("Content-Range"),
      `bytes */${tone.length}`,
    );
    check("HEAD has no byte reads; 416 and neutral private response headers");
    for (const range of ["items=0-2", "bytes=0-1,4-5"]) {
      const ignored = await service.serve(context, {
        ...target,
        method: "GET",
        range,
      });
      assert.equal(ignored.status, 200);
      assert.equal(ignored.headers.get("Content-Range"), null);
      assert.equal(ignored.headers.get("Content-Length"), String(tone.length));
      await ignored.body!.cancel();
    }
    check(
      "unknown range unit and multi-range sets are ignored with the full 200 representation",
    );
    allowed = false;
    const readsBeforeRevoke = { metadataReads, byteReads };
    for (const method of ["HEAD", "GET"])
      assert.equal(
        (
          await service.serve(context, {
            ...target,
            method,
            range: "bytes=0-30",
          })
        ).status,
        404,
      );
    assert.deepEqual({ metadataReads, byteReads }, readsBeforeRevoke);
    check(
      "revocation rejects new HEAD/Range before all metadata and byte reads",
    );
    allowed = true;
    const pending = await begin(tone);
    now += 60 * 60 * 1000 + 1;
    await assert.rejects(
      service.completeUpload(context, {
        setId,
        assetId: pending.assetId,
        expectedRevision: 0,
      }),
      { code: "expired" },
    );
    assert.equal(await service.cleanupExpiredUploads(), 1);
    assert.equal(
      (await service.serve(context, { ...target, method: "HEAD" })).status,
      200,
    );
    check(
      "expired sessions fail closed and clean up; ready assets are retained",
    );
    const tiny = originalTone(1);
    const bad = await begin(tiny, "0".repeat(64));
    await service.appendChunk(
      context,
      {
        setId,
        assetId: bad.assetId,
        offset: 0,
        expectedRevision: 0,
        byteLength: tiny.length,
        sha256: sha(tiny),
      },
      body(tiny),
    );
    await assert.rejects(
      service.completeUpload(context, {
        setId,
        assetId: bad.assetId,
        expectedRevision: 1,
      }),
      { code: "hash_mismatch" },
    );
    assert.equal(
      (
        await service.serve(context, {
          setId,
          assetId: bad.assetId,
          method: "GET",
        })
      ).status,
      404,
    );
    check("whole-file hash mismatch remains unplayable");
    const tagged = Buffer.from(
      "ID3\x04\x00\x00\x00\x00\x00\x10SECRET_ANSWER_IN_TAG",
    );
    const mp3 = await begin(tagged, sha(tagged), "audio/mpeg");
    await service.appendChunk(
      context,
      {
        setId,
        assetId: mp3.assetId,
        offset: 0,
        expectedRevision: 0,
        byteLength: tagged.length,
        sha256: sha(tagged),
      },
      body(tagged),
    );
    const blocked = await service.completeUpload(context, {
      setId,
      assetId: mp3.assetId,
      expectedRevision: 1,
    });
    assert.equal(blocked.state, "publish_blocked");
    assert.equal(blocked.publishable, false);
    assert.equal(
      (
        await service.serve(context, {
          setId,
          assetId: mp3.assetId,
          method: "GET",
        })
      ).status,
      404,
    );
    check("metadata-only fake MP3 rejected by full decoding gate");
    assert(maxReadBytes <= 64 * 1024);
    console.log(
      JSON.stringify(
        {
          ok: true,
          adapter: "local-temp-single-process",
          generatedToneBytes: tone.length,
          generatedToneSeconds: 60,
          sha256: sha(tone),
          uploadChunks: chunks,
          maxStorageReadBytes: maxReadBytes,
          elapsedMs: Math.round(performance.now() - started),
          capabilities: LISTENING_MEDIA_CAPABILITIES,
          checks,
        },
        null,
        2,
      ),
    );
  } finally {
    await store.dispose();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "media_probe_failed");
  process.exitCode = 1;
});
