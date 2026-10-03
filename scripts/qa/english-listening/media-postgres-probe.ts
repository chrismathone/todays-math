/** Actual isolated PostgreSQL only. No dotenv/shared DB fallback.
 * MEDIA_TEST_CONNECTIONS points to a JSON file with a `media` DSN, or supply
 * LISTENING_MEDIA_TEST_DATABASE_URL. MEDIA_TEST_MIGRATION optionally locates the
 * backend-owned migration. Every run creates/removes its own isolated schema.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaListeningMediaStore } from "../../../src/lib/english/listening/media/prismaStore";
import { createListeningMediaService } from "../../../src/lib/english/listening/media/service";
import { waveHeader } from "../../../src/lib/english/listening/media/mp3";

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
async function* body(bytes: Uint8Array) {
  yield bytes;
}
async function main() {
  const connection =
    process.env.LISTENING_MEDIA_TEST_DATABASE_URL ??
    (process.env.MEDIA_TEST_CONNECTIONS
      ? (
          JSON.parse(
            await readFile(process.env.MEDIA_TEST_CONNECTIONS, "utf8"),
          ) as { media: string }
        ).media
      : undefined);
  assert(connection, "Explicit isolated media database connection required");
  const url = new URL(connection);
  assert(
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
    "Loopback database only",
  );
  assert(
    /^\/listening_media(?:_test)?$/.test(url.pathname),
    "Dedicated media test database only",
  );
  const schema = `media_probe_${randomUUID().replaceAll("-", "")}`;
  assert(/^media_probe_[a-f0-9]{32}$/.test(schema));
  const admin = new PrismaClient({ datasources: { db: { url: connection } } });
  const clients: PrismaClient[] = [];
  const checks: string[] = [];
  const started = performance.now();
  try {
    // Only interpolated identifier is generated above and regex-checked; never user input.
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    url.searchParams.set("schema", schema);
    const client = () => {
      const db = new PrismaClient({
        datasources: { db: { url: url.toString() } },
      });
      clients.push(db);
      return db;
    };
    let db = client();
    await db.$executeRaw`CREATE TABLE english_listening_set(id uuid PRIMARY KEY)`;
    const migration = await readFile(
      process.env.MEDIA_TEST_MIGRATION ??
        resolve(
          "prisma/migrations/20261003120000_english_listening/migration.sql",
        ),
      "utf8",
    );
    const statements = migration
      .split("-- statement")
      .filter((sql) =>
        /^\s*CREATE (TABLE|INDEX|FUNCTION|TRIGGER)[\s\S]*english_listening_(?:media_|immutable_media)/i.test(
          sql,
        ),
      );
    assert.equal(
      statements.length,
      9,
      "Exact backend media schema, four indexes, function and two immutability triggers",
    );
    for (const sql of statements) await db.$executeRawUnsafe(sql);
    const setId = randomUUID(),
      ownerId = randomUUID();
    await db.$executeRaw`INSERT INTO english_listening_set(id) VALUES (${setId}::uuid)`;
    let allowed = true,
      clock = Date.now();
    let maxRead = 0;
    function service(store: PrismaListeningMediaStore) {
      const originalRead = store.readBlob.bind(store);
      store.readBlob = async function* (key, range) {
        for await (const bytes of originalRead(key, range)) {
          maxRead = Math.max(maxRead, bytes.length);
          yield bytes;
        }
      };
      return createListeningMediaService({
        store,
        authorize: async () => allowed,
        resolveScope: async () => ({ ownerId, branchId: null }),
        now: () => clock,
        limits: {
          chunkBytes: 1024 * 1024,
          readChunkBytes: 4096,
          uploadTtlMs: 60000,
        },
      });
    }
    let store = new PrismaListeningMediaStore(db, { orphanTtlMs: 60000 });
    let api = service(store);
    const original = await readFile(
      resolve("src/__tests__/fixtures/english-listening/tone.mp3"),
    );
    const receipt = await api.beginUpload(null, {
      setId,
      totalBytes: original.length,
      mimeType: "audio/mpeg",
      expectedSha256: sha(original),
    });
    const chunk = {
      setId,
      assetId: receipt.assetId,
      expectedRevision: 0,
      offset: 0,
      byteLength: original.length,
      sha256: sha(original),
    };
    const competingApi = service(new PrismaListeningMediaStore(client()));
    const appends = await Promise.all([
      api.appendChunk(null, chunk, body(original)),
      competingApi.appendChunk(null, chunk, body(original)),
    ]);
    assert.deepEqual(appends[0], appends[1]);
    const request = { setId, assetId: receipt.assetId, expectedRevision: 1 };
    const completions = await Promise.all([
      api.completeUpload(null, request),
      competingApi.completeUpload(null, request),
    ]);
    assert.deepEqual(completions[0], completions[1]);
    const ready = completions[0];
    assert.equal(ready.state, "ready");
    if (ready.state !== "ready") throw Error("MP3 blocked");
    checks.push(
      "independent clients converge concurrent upload CAS and complete real MP3",
    );
    const record = (await store.get(receipt.assetId))!;
    await assert.rejects(
      db.$executeRaw`UPDATE english_listening_media_blob SET bytes = decode('0000','hex'), "byteLength" = 2 WHERE key = ${record.chunks[0].key}::uuid`,
      /immutable/,
    );
    await assert.rejects(
      db.$executeRaw`UPDATE english_listening_media_asset SET state = 'expired' WHERE "assetId" = ${record.assetId}::uuid`,
      /immutable/,
    );
    checks.push(
      "backend DB triggers refuse byte mutation and ready identity mutation",
    );
    const stored = await db.$queryRaw<
      { count: bigint }[]
    >`SELECT COUNT(*)::bigint AS count FROM english_listening_media_blob WHERE "assetId" = ${receipt.assetId}::uuid`;
    assert.equal(
      Number(stored[0].count),
      record.chunks.length + record.playback!.chunks.length,
    );
    await assert.rejects(store.deleteBlob(record.playback!.chunks[0].key), {
      code: "storage_integrity",
    });
    await assert.rejects(
      store.compareAndSwap(record.assetId, record.revision, {
        ...record,
        revision: record.revision + 1,
      }),
      { code: "storage_integrity" },
    );
    const detached = (await store.get(record.assetId))!;
    detached.ownerId = randomUUID();
    assert.equal((await store.get(record.assetId))!.ownerId, ownerId);
    checks.push(
      "ready identity sealed, committed private chunks undeletable, detached reads, losing staging removed",
    );
    // New Prisma engine/connection proves persistence independently of an in-memory adapter.
    await db.$disconnect();
    db = client();
    store = new PrismaListeningMediaStore(db);
    api = service(store);
    assert.deepEqual(await api.completeUpload(null, request), ready);
    const full = Buffer.from(
      await (
        await api.serve(null, {
          setId,
          assetId: receipt.assetId,
          method: "GET",
        })
      ).arrayBuffer(),
    );
    assert.equal(sha(full), ready.sha256);
    assert.notEqual(sha(original), ready.sha256);
    for (const range of ["bytes=0-43", "bytes=4000-8500", "bytes=-19"]) {
      const response = await api.serve(null, {
        setId,
        assetId: receipt.assetId,
        method: "GET",
        range,
      });
      assert.equal(response.status, 206);
      const match = response.headers
        .get("content-range")!
        .match(/bytes (\d+)-(\d+)\/(\d+)/)!;
      assert.equal(Number(match[3]), full.length);
      assert.deepEqual(
        Buffer.from(await response.arrayBuffer()),
        full.subarray(Number(match[1]), Number(match[2]) + 1),
      );
    }
    assert(maxRead <= 4096);
    checks.push(
      "restart persistence, completion replay, derivative full hash, exact ranges, database reads <=4096 bytes",
    );
    const abort = new AbortController();
    const response = await api.serve(
      null,
      { setId, assetId: receipt.assetId, method: "GET" },
      { signal: abort.signal },
    );
    const reader = response.body!.getReader();
    await reader.read();
    abort.abort();
    await assert.rejects(reader.read(), { name: "AbortError" });
    allowed = false;
    assert.equal(
      (
        await api.serve(null, {
          setId,
          assetId: receipt.assetId,
          method: "HEAD",
        })
      ).status,
      404,
    );
    allowed = true;
    checks.push("aborted reader closes, revoked next HEAD fails closed");
    // Concurrent quota reservations from two separate Prisma engines: only one fits.
    const quotaOwner = randomUUID();
    const wav = Buffer.concat([waveHeader(80, 8000, 1), Buffer.alloc(160)]);
    const prototype = {
      setId,
      ownerId: quotaOwner,
      branchId: null,
      totalBytes: wav.length,
      expectedSha256: sha(wav),
      mimeType: "audio/wav" as const,
      revision: 0,
      receivedBytes: 0,
      chunkBytes: 1024,
      uploadExpiresAt: Date.now() + 60000,
      state: "uploading" as const,
      chunks: [],
    };
    const cap = wav.length + 1024 * 1024;
    const a = new PrismaListeningMediaStore(db, { maxOwnerBytes: cap }),
      b = new PrismaListeningMediaStore(client(), { maxOwnerBytes: cap });
    const reserves = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        (i % 2 ? a : b).create({ ...prototype, assetId: randomUUID() }),
      ),
    );
    assert.equal(reserves.filter((r) => r.status === "fulfilled").length, 1);
    for (const failed of reserves.filter((r) => r.status === "rejected"))
      assert.equal(failed.reason.code, "quota_exceeded");
    checks.push(
      "owner advisory lock enforces aggregate quota across concurrent clients",
    );
    const incomplete = await api.beginUpload(null, {
      setId,
      totalBytes: wav.length,
      mimeType: "audio/wav",
      expectedSha256: sha(wav),
    });
    const orphan = await store.putBlob(Buffer.from("uncommitted"), {
      assetId: incomplete.assetId,
      ownerId,
    });
    await db.$executeRaw`UPDATE english_listening_media_blob SET "createdAt" = ${new Date(Date.now() - 7200000)} WHERE key = ${orphan}::uuid`;
    assert.equal(await store.cleanupOrphanBlobs(Date.now(), 1), 1);
    assert.equal(await store.cleanupOrphanBlobs(Date.now(), 1), 0);
    await api.appendChunk(
      null,
      {
        setId,
        assetId: incomplete.assetId,
        expectedRevision: 0,
        offset: 0,
        byteLength: wav.length,
        sha256: sha(wav),
      },
      body(wav),
    );
    clock += 60001;
    assert.equal(await api.cleanupExpiredUploads(1), 1);
    assert.equal(await store.get(incomplete.assetId), null);
    assert.equal(
      (
        await api.serve(null, {
          setId,
          assetId: receipt.assetId,
          method: "HEAD",
        })
      ).status,
      200,
    );
    checks.push(
      "bounded orphan sweep, expiry cleanup releases quota/tombstone, ready identity survives expiry",
    );
    let longPilot: unknown;
    if (process.env.MEDIA_TEST_LONG_AUDIO) {
      const longBytes = await readFile(process.env.MEDIA_TEST_LONG_AUDIO);
      const longStore = new PrismaListeningMediaStore(db);
      const longApi = createListeningMediaService({
        store: longStore,
        authorize: async () => true,
        resolveScope: async () => ({ ownerId, branchId: null }),
      });
      let longUpload = await longApi.beginUpload(null, {
        setId,
        mimeType: "audio/mpeg",
        totalBytes: longBytes.length,
        expectedSha256: sha(longBytes),
      });
      for (
        let offset = 0;
        offset < longBytes.length;
        offset += longUpload.chunkBytes
      ) {
        const part = longBytes.subarray(offset, offset + longUpload.chunkBytes);
        longUpload = await longApi.appendChunk(
          null,
          {
            setId,
            assetId: longUpload.assetId,
            offset,
            byteLength: part.length,
            sha256: sha(part),
            expectedRevision: longUpload.revision,
          },
          body(part),
        );
      }
      const before = performance.now();
      let peakRss = process.memoryUsage().rss;
      const sampler = setInterval(() => {
        peakRss = Math.max(peakRss, process.memoryUsage().rss);
      }, 20);
      try {
        const complete = await longApi.completeUpload(null, {
          setId,
          assetId: longUpload.assetId,
          expectedRevision: longUpload.revision,
        });
        assert.equal(complete.state, "ready");
        if (complete.state !== "ready") throw Error("long MP3 blocked");
        assert.equal(complete.durationMs, 600000);
        assert.equal(complete.playbackBytes, 115200044);
        const decodeMs = Math.round(performance.now() - before);
        const response = await longApi.serve(null, {
          setId,
          assetId: longUpload.assetId,
          method: "GET",
        });
        const reader = response.body!.getReader(),
          streamedHash = createHash("sha256");
        let bytes = 0,
          largestPiece = 0;
        while (true) {
          const piece = await reader.read();
          if (piece.done) break;
          streamedHash.update(piece.value);
          bytes += piece.value.length;
          largestPiece = Math.max(largestPiece, piece.value.length);
        }
        assert.equal(streamedHash.digest("hex"), complete.sha256);
        assert.equal(bytes, complete.playbackBytes);
        assert(largestPiece <= 65536);
        longPilot = {
          originalBytes: longBytes.length,
          playbackBytes: bytes,
          durationMs: complete.durationMs,
          sha256: complete.sha256,
          decodeAndPersistMs: decodeMs,
          totalWithPlaybackMs: Math.round(performance.now() - before),
          peakProcessRssMiB: Math.ceil(peakRss / 1024 / 1024),
          largestPiece,
        };
        checks.push(
          "exact600-second stereo boundary: full decode/persist/stream/hash with default pilot limits",
        );
      } finally {
        clearInterval(sampler);
      }
    }
    console.log(
      JSON.stringify(
        {
          ok: true,
          database: "isolated loopback PostgreSQL",
          schemaSource: "backend media migration",
          checks,
          originalBytes: original.length,
          playbackBytes: full.length,
          originalSha256: sha(original),
          playbackSha256: sha(full),
          maxReadBytes: maxRead,
          longPilot,
          elapsedMs: Math.round(performance.now() - started),
        },
        null,
        2,
      ),
    );
  } finally {
    await Promise.all(clients.map((db) => db.$disconnect()));
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$disconnect();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "media_probe_failed");
  process.exitCode = 1;
});
