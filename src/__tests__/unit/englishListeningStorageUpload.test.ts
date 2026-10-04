// @vitest-environment node
/** Real disposable PostgreSQL metadata; Storage transport is an in-memory HTTP fixture. */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createListeningStorageApi } from "@/lib/english/listening/media/storageApi";
import { PrismaStorageListeningMediaStore } from "@/lib/english/listening/media/storageStore";
import { PrismaListeningMediaStore } from "@/lib/english/listening/media/prismaStore";
import { createListeningMediaService } from "@/lib/english/listening/media/service";
import { parseMp3, waveHeader } from "@/lib/english/listening/media/mp3";
import type { ListeningMediaStore } from "@/lib/english/listening/media/store";
import { fakeListeningStorage } from "../fixtures/english-listening/fakeStorage";
vi.mock("server-only", () => ({}));
const connection = process.env.LISTENING_MEDIA_TEST_DATABASE_URL;
if (
  connection &&
  (!["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(connection).hostname,
  ) ||
    !/^\/listening_media(?:_test)?$/.test(new URL(connection).pathname))
)
  throw new Error("Refusing non-isolated media database");
const schema = `storage_upload_${randomUUID().replaceAll("-", "")}`;
const admin = connection
  ? new PrismaClient({ datasourceUrl: connection })
  : null;
let db: PrismaClient;
let other: PrismaClient;
const tone = readFileSync(
  new URL("../fixtures/english-listening/tone.mp3", import.meta.url),
);
const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
async function* body(bytes: Uint8Array) {
  yield bytes;
}
describe.skipIf(!admin)(
  "durable GUI Storage uploads (isolated PostgreSQL)",
  () => {
    beforeAll(async () => {
      await admin!.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      const url = new URL(connection!);
      url.searchParams.set("schema", schema);
      db = new PrismaClient({ datasourceUrl: url.toString() });
      other = new PrismaClient({ datasourceUrl: url.toString() });
      await db.$executeRaw`CREATE TABLE english_listening_set(id uuid PRIMARY KEY)`;
      const original = readFileSync(
        "prisma/migrations/20261003120000_english_listening/migration.sql",
        "utf8",
      );
      for (const sql of original
        .split("-- statement")
        .filter((sql) =>
          /^\s*CREATE (TABLE|INDEX|FUNCTION|TRIGGER)[\s\S]*english_listening_(?:media_|immutable_media)/i.test(
            sql,
          ),
        ))
        await db.$executeRawUnsafe(sql);
      const migration = readFileSync(
        "prisma/migrations/20261004071000_listening_storage_chunks/migration.sql",
        "utf8",
      );
      for (const sql of migration
        .split("-- statement")
        .map((s) => s.trim())
        .filter(Boolean))
        await db.$executeRawUnsafe(sql);
    });
    afterAll(async () => {
      await db?.$disconnect();
      await other?.$disconnect();
      if (admin) {
        await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
        await admin.$disconnect();
      }
    });
    async function fixture(
      options: {
        maxOwnerBytes?: number;
        maxOwnerAssets?: number;
        canonical?: boolean;
      } = {},
    ) {
      const fake = fakeListeningStorage(),
        api = createListeningStorageApi(fake.config, fake.fetchImpl);
      const ownerId = randomUUID(),
        setId = randomUUID(),
        branchId = randomUUID();
      await db.$executeRaw`INSERT INTO english_listening_set(id) VALUES(${setId}::uuid)`;
      const store = new PrismaStorageListeningMediaStore(db, api, options);
      let allowed = true;
      let scope = { ownerId, branchId };
      const make = (adapter: ListeningMediaStore = store) =>
        createListeningMediaService({
          store: adapter,
          storage: api,
          authorize: async () => allowed,
          resolveScope: async () => scope,
          mp3PlaybackEncoding: options.canonical
            ? "canonical_pcm"
            : "scrubbed_mp3",
          limits: { chunkBytes: 4096, readChunkBytes: 1000 },
        });
      const service = make();
      async function begin(
        bytes: Buffer = tone,
        mimeType: "audio/mpeg" | "audio/wav" = "audio/mpeg",
      ) {
        return service.beginUpload(null, {
          setId,
          totalBytes: bytes.length,
          expectedSha256: sha(bytes),
          mimeType,
        });
      }
      async function append(
        assetId: string,
        bytes: Buffer,
        offset = 0,
        revision = 0,
        svc = service,
      ) {
        const part = bytes.subarray(offset, offset + 4096);
        return svc.appendChunk(
          null,
          {
            setId,
            assetId,
            offset,
            expectedRevision: revision,
            byteLength: part.length,
            sha256: sha(part),
          },
          body(part),
        );
      }
      async function upload(
        bytes: Buffer = tone,
        mimeType: "audio/mpeg" | "audio/wav" = "audio/mpeg",
      ) {
        let receipt = await begin(bytes, mimeType);
        while (receipt.receivedBytes < bytes.length)
          receipt = await append(
            receipt.assetId,
            bytes,
            receipt.receivedBytes,
            receipt.revision,
          );
        return receipt;
      }
      return {
        fake,
        api,
        store,
        service,
        make,
        begin,
        append,
        upload,
        ownerId,
        setId,
        revoke: () => {
          allowed = false;
        },
        move: () => {
          scope = { ownerId: randomUUID(), branchId };
        },
      };
    }
    it("reconnects, resumes and seals scrubbed MP3 without PostgreSQL audio bytes; serves exact ranges", async () => {
      const s = await fixture();
      const text = Buffer.from("SECRET_ANSWERS"),
        bytes = Buffer.concat([
          Buffer.from([73, 68, 51, 3, 0, 0, 0, 0, 0, text.length]),
          text,
          tone,
        ]);
      let receipt = await s.begin(bytes);
      receipt = await s.append(receipt.assetId, bytes);
      const resumed = s.make(
        new PrismaStorageListeningMediaStore(other, s.api),
      );
      expect((await s.store.get(receipt.assetId))!.storageChunks).toBe(true);
      while (receipt.receivedBytes < bytes.length)
        receipt = await s.append(
          receipt.assetId,
          bytes,
          receipt.receivedBytes,
          receipt.revision,
          resumed,
        );
      const input = {
        setId: s.setId,
        assetId: receipt.assetId,
        expectedRevision: receipt.revision,
      };
      const completed = await resumed.completeUpload(null, input);
      expect(await s.service.completeUpload(null, input)).toEqual(completed);
      expect(completed.state).toBe("ready");
      const blobs = await db.$queryRaw<
        { count: bigint }[]
      >`SELECT COUNT(*) AS count FROM english_listening_media_blob WHERE "assetId"=${receipt.assetId}::uuid`;
      expect(Number(blobs[0].count)).toBe(0);
      const parsed = parseMp3(bytes, 30 * 60 * 1000);
      const response = await resumed.serve(null, {
        setId: s.setId,
        assetId: receipt.assetId,
        method: "GET",
        range: "bytes=3-113",
      });
      expect(response.status).toBe(206);
      expect(Buffer.from(await response.arrayBuffer())).toEqual(
        bytes.subarray(parsed.audioStart + 3, parsed.audioStart + 114),
      );
      const full = Buffer.from(
        await (
          await resumed.serve(null, {
            setId: s.setId,
            assetId: receipt.assetId,
            method: "GET",
          })
        ).arrayBuffer(),
      );
      expect(full.includes(text)).toBe(false);
      expect(sha(full)).toBe(
        completed.state === "ready" ? completed.sha256 : "",
      );
      const before = s.fake.calls.length;
      expect(
        (
          await resumed.serve(null, {
            setId: s.setId,
            assetId: receipt.assetId,
            method: "HEAD",
          })
        ).body,
      ).toBeNull();
      expect(s.fake.calls.length).toBe(before);
      s.revoke();
      expect(
        (
          await resumed.serve(null, {
            setId: s.setId,
            assetId: receipt.assetId,
            method: "GET",
          })
        ).status,
      ).toBe(404);
      expect(s.fake.calls.length).toBe(before);
    });
    it("concurrent same chunk retries accept one revision and remove the losing staged object", async () => {
      const s = await fixture(),
        receipt = await s.begin();
      const b = s.make(new PrismaStorageListeningMediaStore(other, s.api));
      const [a, c] = await Promise.all([
        s.append(receipt.assetId, tone),
        s.append(receipt.assetId, tone, 0, 0, b),
      ]);
      expect(c).toEqual(a);
      const retry = await s.append(receipt.assetId, tone);
      expect(retry).toEqual(a);
      const record = (await s.store.get(receipt.assetId))!;
      expect(record.revision).toBe(1);
      expect(record.chunks).toHaveLength(1);
      expect(s.fake.files.size).toBe(1);
      await expect(
        s.append(receipt.assetId, Buffer.alloc(tone.length, 3)),
      ).rejects.toMatchObject({ code: "conflict" });
    });
    it("rolls back staged bytes after failed metadata CAS and allows a clean retry", async () => {
      const s = await fixture(),
        receipt = await s.begin();
      const compare = vi
        .spyOn(s.store, "compareAndSwap")
        .mockRejectedValueOnce(new Error("isolated SQL failure"));
      await expect(s.append(receipt.assetId, tone)).rejects.toThrow(
        "isolated SQL failure",
      );
      expect(s.fake.files.size).toBe(0);
      expect((await s.store.get(receipt.assetId))!.receivedBytes).toBe(0);
      compare.mockRestore();
      await s.append(receipt.assetId, tone);
      expect(s.fake.files.size).toBe(1);
    });
    it("cleans partial decoded WAV output and permits completion retry with original chunks preserved", async () => {
      const s = await fixture({ canonical: true }),
        r = await s.upload(),
        originals = s.fake.files.size;
      const put = s.store.putBlob.bind(s.store);
      let writes = 0;
      const fail = vi
        .spyOn(s.store, "putBlob")
        .mockImplementation(async (...args) => {
          if (++writes === 2) throw new Error("isolated output failure");
          return put(...args);
        });
      const input = {
        setId: s.setId,
        assetId: r.assetId,
        expectedRevision: r.revision,
      };
      await expect(s.service.completeUpload(null, input)).rejects.toThrow(
        "isolated output failure",
      );
      expect(writes).toBe(2);
      expect(s.fake.files.size).toBe(originals);
      expect((await s.store.get(r.assetId))!.state).toBe("uploading");
      fail.mockRestore();
      const completion = await s.service.completeUpload(null, input);
      expect(completion).toMatchObject({
        state: "ready",
        mimeType: "audio/wav",
      });
      const pg = await db.$queryRaw<
        { count: bigint }[]
      >`SELECT COUNT(*) AS count FROM english_listening_media_blob WHERE "assetId"=${r.assetId}::uuid`;
      expect(Number(pg[0].count)).toBe(0);
    });
    it("retains durable orphan intent after failed remote removal and retries cleanup safely", async () => {
      const s = await fixture(),
        r = await s.begin();
      const upload = vi
        .spyOn(s.api, "uploadChunk")
        .mockRejectedValueOnce(new Error("isolated transport failure"));
      const remove = vi
        .spyOn(s.api, "remove")
        .mockRejectedValueOnce(new Error("isolated removal failure"));
      await expect(s.append(r.assetId, tone)).rejects.toThrow(
        "isolated transport failure",
      );
      const rows = await db.$queryRaw<
        { ref: unknown; deleting: boolean }[]
      >`SELECT ref,deleting FROM english_listening_media_storage_blob WHERE "assetId"=${r.assetId}::uuid`;
      expect(rows).toEqual([{ ref: null, deleting: true }]);
      upload.mockRestore();
      remove.mockRestore();
      expect(
        await s.store.cleanupOrphanBlobs(Date.now(), 100),
      ).toBeGreaterThanOrEqual(1);
      await s.append(r.assetId, tone);
      expect((await s.store.get(r.assetId))!.revision).toBe(1);
    });
    it("rejects whole-file SHA mismatches and expires failed uploads without deleting ready assets", async () => {
      const s = await fixture();
      let r = await s.service.beginUpload(null, {
        setId: s.setId,
        totalBytes: tone.length,
        mimeType: "audio/mpeg",
        expectedSha256: "0".repeat(64),
      });
      while (r.receivedBytes < tone.length)
        r = await s.append(r.assetId, tone, r.receivedBytes, r.revision);
      await expect(
        s.service.completeUpload(null, {
          setId: s.setId,
          assetId: r.assetId,
          expectedRevision: r.revision,
        }),
      ).rejects.toMatchObject({ code: "hash_mismatch" });
      const failed = (await s.store.get(r.assetId))!;
      expect(failed.state).toBe("failed");
      await s.store.compareAndSwap(r.assetId, failed.revision, {
        ...failed,
        state: "expired",
        revision: failed.revision + 1,
      });
      for (const chunk of failed.chunks) await s.store.deleteBlob(chunk.key);
      const tombstone = (await s.store.get(r.assetId))!;
      await s.store.compareAndSwap(r.assetId, tombstone.revision, {
        ...tombstone,
        chunks: [],
        playback: undefined,
        revision: tombstone.revision + 1,
      });
      await s.store.cleanupOrphanBlobs(Date.now(), 100);
      expect(await s.store.get(r.assetId)).toBeNull();
      expect(s.fake.files.size).toBe(0);
    });
    it("counts owner reservations atomically across independent clients", async () => {
      const s = await fixture({ maxOwnerAssets: 1 });
      const second = s.make(
        new PrismaStorageListeningMediaStore(other, s.api, {
          maxOwnerAssets: 1,
        }),
      );
      const requests = {
        setId: s.setId,
        totalBytes: tone.length,
        mimeType: "audio/mpeg",
        expectedSha256: sha(tone),
      };
      const results = await Promise.allSettled([
        s.service.beginUpload(null, requests),
        second.beginUpload(null, requests),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((r) => r.status === "rejected")[0]).toMatchObject({
        reason: { code: "quota_exceeded" },
      });
      expect(s.fake.files.size).toBe(0);
    });
    it("cancels a pending provider write and removes its durable intent", async () => {
      const s = await fixture(),
        r = await s.begin(),
        controller = new AbortController();
      let entered!: () => void;
      const started = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const upload = vi
        .spyOn(s.api, "uploadChunk")
        .mockImplementation(async (input) => {
          expect(input.signal).toBe(controller.signal);
          entered();
          await new Promise<never>((_, reject) =>
            input.signal!.addEventListener(
              "abort",
              () => reject(input.signal!.reason),
              { once: true },
            ),
          );
          throw new Error("unreachable");
        });
      const part = tone.subarray(0, 4096);
      const pending = s.service.appendChunk(
        null,
        {
          setId: s.setId,
          assetId: r.assetId,
          offset: 0,
          expectedRevision: 0,
          byteLength: part.length,
          sha256: sha(part),
        },
        body(part),
        { signal: controller.signal },
      );
      await started;
      controller.abort(new Error("cancelled upload"));
      await expect(pending).rejects.toThrow("cancelled upload");
      upload.mockRestore();
      const rows = await db.$queryRaw<
        { count: bigint }[]
      >`SELECT COUNT(*) AS count FROM english_listening_media_storage_blob WHERE "assetId"=${r.assetId}::uuid`;
      expect(Number(rows[0].count)).toBe(0);
      expect(s.fake.files.size).toBe(0);
    });
    it("rejects cross-owner writes, reassigned scope and altered immutable chunk hashes", async () => {
      const s = await fixture(),
        receipt = await s.upload();
      await expect(
        s.store.putBlob(Buffer.from([1]), {
          assetId: receipt.assetId,
          ownerId: randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "conflict" });
      const record = (await s.store.get(receipt.assetId))!;
      await expect(
        s.store.compareAndSwap(record.assetId, record.revision, {
          ...record,
          revision: record.revision + 1,
          chunks: [{ ...record.chunks[0], sha256: "0".repeat(64) }],
        }),
      ).rejects.toMatchObject({ code: "storage_integrity" });
      s.move();
      await expect(
        s.service.completeUpload(null, {
          setId: s.setId,
          assetId: receipt.assetId,
          expectedRevision: receipt.revision,
        }),
      ).rejects.toMatchObject({ code: "not_found" });
    });
    it("preserves old PostgreSQL WAV playback when the hybrid adapter is selected", async () => {
      const s = await fixture();
      const old = s.make(new PrismaListeningMediaStore(db));
      const bytes = Buffer.concat([waveHeader(80, 8000, 1), Buffer.alloc(160)]);
      let r = await old.beginUpload(null, {
        setId: s.setId,
        totalBytes: bytes.length,
        mimeType: "audio/wav",
        expectedSha256: sha(bytes),
      });
      r = await s.append(r.assetId, bytes, 0, 0, old);
      await old.completeUpload(null, {
        setId: s.setId,
        assetId: r.assetId,
        expectedRevision: r.revision,
      });
      const response = await s.service.serve(null, {
        setId: s.setId,
        assetId: r.assetId,
        method: "GET",
        range: "bytes=40-80",
      });
      expect(Buffer.from(await response.arrayBuffer())).toEqual(
        bytes.subarray(40, 81),
      );
    });
    it("keeps referenced shared objects until the last expired alias is cleaned", async () => {
      const s = await fixture(),
        receipt = await s.upload();
      const record = (await s.store.get(receipt.assetId))!;
      const [blob] = await db.$queryRaw<
        { key: string; ref: unknown; sha256: string; byteLength: number }[]
      >`SELECT key,ref,sha256,"byteLength" FROM english_listening_media_storage_blob WHERE "assetId"=${record.assetId}::uuid LIMIT 1`;
      const aliasId = randomUUID(),
        aliasKey = randomUUID();
      await db.$executeRaw`INSERT INTO english_listening_media_asset("assetId","ownerId","branchId","setId",revision,state,"uploadExpiresAt","reservedBytes",record) VALUES(${aliasId}::uuid,${s.ownerId}::uuid,${record.branchId}::uuid,${s.setId}::uuid,1,'expired',NOW(),0,${JSON.stringify({ ...record, assetId: aliasId, revision: 1, state: "expired", chunks: [] })}::jsonb)`;
      await db.$executeRaw`INSERT INTO english_listening_media_storage_blob(key,"assetId","byteLength",sha256,ref,committed) VALUES(${aliasKey}::uuid,${aliasId}::uuid,${blob.byteLength},${blob.sha256},${JSON.stringify(blob.ref)}::jsonb,true)`;
      await s.store.deleteBlob(aliasKey);
      expect(s.fake.files.size).toBe(record.chunks.length);
      await expect(s.store.deleteBlob(blob.key)).rejects.toMatchObject({
        code: "storage_integrity",
      });
    });
    it("enables RLS and enforces immutable object refs in SQL", async () => {
      const s = await fixture(),
        receipt = await s.upload();
      const [row] = await db.$queryRaw<
        { relrowsecurity: boolean }[]
      >`SELECT relrowsecurity FROM pg_class WHERE oid='english_listening_media_storage_blob'::regclass`;
      expect(row.relrowsecurity).toBe(true);
      await expect(
        db.$executeRaw`UPDATE english_listening_media_storage_blob SET sha256=${"0".repeat(64)} WHERE "assetId"=${receipt.assetId}::uuid`,
      ).rejects.toThrow();
    });
  },
);
