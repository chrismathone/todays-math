// @vitest-environment node
/** Explicit disposable PostgreSQL only; Storage is a deterministic HTTP fixture. */
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { migrateListeningWaveAssetToStorage } from "@/lib/english/listening/runtime/storageMigration";
import { createListeningStorageApi } from "@/lib/english/listening/media/storageApi";
import { createListeningMediaService } from "@/lib/english/listening/media/service";
import { PrismaListeningMediaStore } from "@/lib/english/listening/media/prismaStore";
import { PrismaStorageListeningMediaStore } from "@/lib/english/listening/media/storageStore";
import { createListeningMediaAccess } from "@/lib/english/listening/runtime/mediaAccess";
import { createListeningRuntime } from "@/lib/english/listening/runtime/service";
import { waveHeader } from "@/lib/english/listening/media/mp3";
import type {
  ListeningActor,
  ListeningDatabase,
  ListeningTx,
} from "@/lib/english/listening/runtime/database";
import type { ListeningMediaRecord } from "@/lib/english/listening/media/store";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";
import { fakeListeningStorage } from "../fixtures/english-listening/fakeStorage";
vi.mock("server-only", () => ({}));
const url = process.env.LISTENING_TEST_DATABASE_URL;
if (
  url &&
  (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname) ||
    !/^\/listening_(test|runtime)/.test(new URL(url).pathname))
)
  throw new Error("Refusing non-isolated listening database");
const db = url ? new PrismaClient({ datasourceUrl: url }) : null;
const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
async function* body(bytes: Uint8Array) {
  yield bytes;
}
describe.skipIf(!db)(
  "existing WAV physical Storage migration (real PostgreSQL)",
  () => {
    beforeAll(() => {
      process.env.ENGLISH_LISTENING_ENABLED = "true";
      process.env.ENGLISH_LISTENING_TEACHER_IDS = "";
    });
    afterAll(async () => {
      await db?.$disconnect();
    });
    async function fixture() {
      const ownerId = randomUUID(),
        actor: ListeningActor = { kind: "teacher", userId: ownerId };
      process.env.ENGLISH_LISTENING_TEACHER_IDS += "," + ownerId;
      await db!.user.create({
        data: {
          id: ownerId,
          email: `${ownerId}@migration.listening.test`,
          name: "이관 검증 교사",
          approvalStatus: "approved",
        },
      });
      const runtime = createListeningRuntime(db!),
        store = new PrismaListeningMediaStore(db!),
        access = createListeningMediaAccess(db!);
      const media = createListeningMediaService({
        store,
        ...access,
        limits: { chunkBytes: 64 * 1024 },
      });
      let set = await runtime.createSet(actor, {
        title: "기존 WAV",
        rights: {
          rightsStatus: "approved",
          allowedUses: ["store_original", "teacher_review", "distribution"],
        },
        basis: "검증용 자체 작성",
      });
      set = await runtime.reviewSet(actor, set.id, {
        expectedRevision: set.revision,
        kind: "rights",
        basis: "원본 보관 및 수업 이용",
      });
      const pcm = Buffer.alloc(15 * 8000 * 2);
      for (let n = 0; n < pcm.length; n += 2)
        pcm.writeInt16LE((n % 16000) - 8000, n);
      const wave = Buffer.concat([waveHeader(pcm.length / 2, 8000, 1), pcm]);
      let receipt = await media.beginUpload(
        { actor },
        {
          setId: set.id,
          totalBytes: wave.length,
          mimeType: "audio/wav",
          expectedSha256: hash(wave),
        },
      );
      for (let offset = 0; offset < wave.length; offset += 64 * 1024) {
        const part = wave.subarray(offset, offset + 64 * 1024);
        receipt = await media.appendChunk(
          { actor },
          {
            setId: set.id,
            assetId: receipt.assetId,
            offset,
            expectedRevision: receipt.revision,
            byteLength: part.length,
            sha256: hash(part),
          },
          body(part),
        );
      }
      const ready = await media.completeUpload(
        { actor },
        {
          setId: set.id,
          assetId: receipt.assetId,
          expectedRevision: receipt.revision,
        },
      );
      if (ready.state !== "ready") throw new Error("Expected canonical WAV");
      const group = englishListeningFixture().groups[0];
      set = await runtime.updateSet(actor, set.id, {
        expectedRevision: set.revision,
        title: set.document.title,
        level: null,
        examId: null,
        rights: set.document.rights,
        basis: set.document.provenance.basis,
        groups: [
          {
            id: group.id,
            transcript: group.transcript,
            questions: group.questions,
            audio: {
              assetId: ready.assetId,
              sha256: ready.sha256,
              durationMs: ready.durationMs,
            },
          },
        ],
      });
      for (const kind of ["content", "audio", "alignment"])
        set = await runtime.reviewSet(actor, set.id, {
          expectedRevision: set.revision,
          kind,
          groupId: group.id,
        });
      const publication = await runtime.publishSet(actor, set.id, {
        expectedRevision: set.revision,
      });
      const record = (await store.get(receipt.assetId))!,
        fake = fakeListeningStorage(),
        storage = createListeningStorageApi(fake.config, fake.fetchImpl);
      const input = { actor, setId: set.id, assetId: receipt.assetId };
      const migrate = () =>
        migrateListeningWaveAssetToStorage(db!, storage, input);
      const read = () => store.get(receipt.assetId);
      const blobCount = async () =>
        Number(
          (
            await db!.$queryRaw<
              { count: bigint }[]
            >`SELECT COUNT(*) AS count FROM english_listening_media_blob WHERE "assetId"=${receipt.assetId}::uuid`
          )[0].count,
        );
      return {
        actor,
        input,
        migrate,
        read,
        blobCount,
        record,
        wave,
        set,
        publication,
        storage,
        fake,
      };
    }
    async function triggerState() {
      return db!.$queryRaw<
        { name: string; enabled: string }[]
      >`SELECT tgname AS name,tgenabled::text AS enabled FROM pg_trigger WHERE tgrelid='english_listening_media_asset'::regclass ORDER BY tgname`;
    }
    async function mutate(assetId: string, record: ListeningMediaRecord) {
      await db!.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          "ALTER TABLE english_listening_media_asset DISABLE TRIGGER english_listening_ready_media_immutable",
        );
        await tx.$executeRaw`UPDATE english_listening_media_asset SET record=${JSON.stringify(record)}::jsonb WHERE "assetId"=${assetId}::uuid`;
        await tx.$executeRawUnsafe(
          "ALTER TABLE english_listening_media_asset ENABLE TRIGGER english_listening_ready_media_immutable",
        );
      });
    }
    it("keeps identity, revisions, publication snapshots and exact proxy HEAD/range/full bytes while deleting only old scoped blobs", async () => {
      const s = await fixture(),
        before = await triggerState(),
        count = await s.blobCount();
      const [pub] = await db!.$queryRaw<
        { snapshot: unknown }[]
      >`SELECT snapshot FROM english_listening_publication WHERE id=${s.publication.id}::uuid`;
      const result = await s.migrate();
      expect(result).toMatchObject({
        migrated: true,
        removedBlobCount: count,
        assetId: s.input.assetId,
        sha256: hash(s.wave),
        bytes: s.wave.length,
      });
      const record = (await s.read())!;
      expect(record).toEqual({
        ...s.record,
        storage: result.storage,
        chunks: [],
        playback: { ...s.record.playback!, chunks: [] },
      });
      expect(await s.blobCount()).toBe(0);
      expect(await triggerState()).toEqual(before);
      const [after] = await db!.$queryRaw<
        { snapshot: unknown }[]
      >`SELECT snapshot FROM english_listening_publication WHERE id=${s.publication.id}::uuid`;
      expect(after.snapshot).toEqual(pub.snapshot);
      const proxy = createListeningMediaService({
        store: new PrismaStorageListeningMediaStore(db!, s.storage),
        storage: s.storage,
        ...createListeningMediaAccess(db!),
      });
      const request = { setId: s.input.setId, assetId: s.input.assetId };
      const acceptedHead = await proxy.serve(
        { actor: s.actor },
        { ...request, method: "HEAD" },
      );
      expect(acceptedHead.status).toBe(200);
      expect(acceptedHead.body).toBeNull();
      expect(acceptedHead.headers.get("content-length")).toBe(
        String(s.wave.length),
      );
      const range = await proxy.serve(
        { actor: s.actor },
        { ...request, method: "GET", range: "bytes=65500-65700" },
      );
      expect(range.status).toBe(206);
      expect(Buffer.from(await range.arrayBuffer())).toEqual(
        s.wave.subarray(65500, 65701),
      );
      const full = await proxy.serve(
        { actor: s.actor },
        { ...request, method: "GET" },
      );
      expect(hash(Buffer.from(await full.arrayBuffer()))).toBe(hash(s.wave));
      expect(await s.migrate()).toMatchObject({
        migrated: false,
        removedBlobCount: 0,
        storage: result.storage,
      });
      expect(s.fake.files.size).toBe(1);
      await expect(
        db!
          .$executeRaw`UPDATE english_listening_media_asset SET revision=revision+1 WHERE "assetId"=${s.input.assetId}::uuid`,
      ).rejects.toThrow();
    });
    it("denies another owner or changed rights before any Storage upload", async () => {
      const s = await fixture(),
        other = await fixture();
      await expect(
        migrateListeningWaveAssetToStorage(db!, s.storage, {
          ...s.input,
          actor: other.actor,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await db!
        .$executeRaw`UPDATE english_listening_set SET document=jsonb_set(document,'{rights,allowedUses}','["store_original"]'::jsonb) WHERE id=${s.input.setId}::uuid`;
      await expect(s.migrate()).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(s.fake.calls).toHaveLength(0);
      expect(await s.blobCount()).toBe(s.record.chunks.length);
    });
    it("refuses cross-asset PG chunk aliases and leaves all original identities intact", async () => {
      const s = await fixture(),
        aliasId = randomUUID(),
        alias = {
          ...s.record,
          assetId: aliasId,
          completion: { ...s.record.completion!, assetId: aliasId },
        };
      await db!
        .$executeRaw`INSERT INTO english_listening_media_asset("assetId","ownerId","branchId","setId",revision,state,"uploadExpiresAt","reservedBytes",record) VALUES(${aliasId}::uuid,${alias.ownerId}::uuid,${alias.branchId}::uuid,${alias.setId}::uuid,${alias.revision},'ready',${new Date(alias.uploadExpiresAt)},0,${JSON.stringify(alias)}::jsonb)`;
      await expect(s.migrate()).rejects.toThrow();
      expect(s.fake.calls).toHaveLength(0);
      expect(await s.read()).toEqual(s.record);
      expect(await s.blobCount()).toBe(s.record.chunks.length);
      expect(s.fake.files.size).toBe(0);
    });
    it("rejects a changed record during upload and removes only the new Storage object", async () => {
      const s = await fixture(),
        upload = s.storage.upload.bind(s.storage),
        changed = { ...s.record, blocker: "output_limit" as const };
      vi.spyOn(s.storage, "upload").mockImplementationOnce(async (input) => {
        const ref = await upload(input);
        await mutate(s.input.assetId, changed);
        return ref;
      });
      await expect(s.migrate()).rejects.toMatchObject({ code: "CONFLICT" });
      expect(await s.read()).toEqual(changed);
      expect(await s.blobCount()).toBe(s.record.chunks.length);
      expect(s.fake.files.size).toBe(0);
    });
    it("rejects remote SHA failure before SQL relocation and preserves PostgreSQL originals", async () => {
      const s = await fixture(),
        upload = s.storage.upload.bind(s.storage);
      vi.spyOn(s.storage, "upload").mockImplementationOnce(async (input) => ({
        ...(await upload(input)),
        sha256: "0".repeat(64),
      }));
      await expect(s.migrate()).rejects.toThrow();
      expect(s.storage.upload).toHaveBeenCalledOnce();
      expect(await s.read()).toEqual(s.record);
      expect(await s.blobCount()).toBe(s.record.chunks.length);
      expect(s.fake.files.size).toBe(0);
    });
    it("rolls back real SQL deletion failure and restores the exact original ready trigger state", async () => {
      const s = await fixture(),
        other = await fixture(),
        unrelatedKey = `${s.record.ownerId}/${randomUUID()}/${randomUUID()}`,
        unrelatedBytes = Buffer.from("unrelated private object");
      s.fake.files.set(unrelatedKey, unrelatedBytes);
      await db!.$executeRawUnsafe(
        "ALTER TABLE english_listening_media_asset ENABLE ALWAYS TRIGGER english_listening_ready_media_immutable",
      );
      const before = await triggerState();
      await db!.$executeRawUnsafe(
        "CREATE FUNCTION refuse_wave_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'isolated delete failure'; END $$",
      );
      await db!.$executeRawUnsafe(
        "CREATE TRIGGER refuse_wave_delete BEFORE DELETE ON english_listening_media_blob FOR EACH ROW EXECUTE FUNCTION refuse_wave_delete()",
      );
      try {
        await expect(s.migrate()).rejects.toThrow("isolated delete failure");
        expect(await s.read()).toEqual(s.record);
        expect(await s.blobCount()).toBe(s.record.chunks.length);
        expect(await triggerState()).toEqual(before);
        expect(s.fake.files.size).toBe(1);
        expect(s.fake.files.get(unrelatedKey)).toEqual(unrelatedBytes);
        expect(await other.read()).toEqual(other.record);
        expect(await other.blobCount()).toBe(other.record.chunks.length);
      } finally {
        await db!.$executeRawUnsafe(
          "DROP TRIGGER refuse_wave_delete ON english_listening_media_blob",
        );
        await db!.$executeRawUnsafe("DROP FUNCTION refuse_wave_delete()");
        await db!.$executeRawUnsafe(
          "ALTER TABLE english_listening_media_asset ENABLE TRIGGER english_listening_ready_media_immutable",
        );
      }
    });
    it("rechecks live rights after Storage upload and removes the staged copy when rights were revoked", async () => {
      const s = await fixture(),
        upload = s.storage.upload.bind(s.storage);
      vi.spyOn(s.storage, "upload").mockImplementationOnce(async (input) => {
        const ref = await upload(input);
        await db!
          .$executeRaw`UPDATE english_listening_set SET document=jsonb_set(document,'{rightsReview}','null'::jsonb) WHERE id=${s.input.setId}::uuid`;
        return ref;
      });
      await expect(s.migrate()).rejects.toThrow();
      expect(s.storage.upload).toHaveBeenCalledOnce();
      expect(await s.read()).toEqual(s.record);
      expect(await s.blobCount()).toBe(s.record.chunks.length);
      expect(s.fake.files.size).toBe(0);
    });
    it("rejects a media branch different from its owning set before upload", async () => {
      const s = await fixture(),
        branchId = randomUUID(),
        changed = {
          ...s.record,
          branchId,
          completion: { ...s.record.completion!, branchId },
        };
      await db!.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          "ALTER TABLE english_listening_media_asset DISABLE TRIGGER english_listening_ready_media_immutable",
        );
        await tx.$executeRaw`UPDATE english_listening_media_asset SET "branchId"=${branchId}::uuid,record=${JSON.stringify(changed)}::jsonb WHERE "assetId"=${s.input.assetId}::uuid`;
        await tx.$executeRawUnsafe(
          "ALTER TABLE english_listening_media_asset ENABLE TRIGGER english_listening_ready_media_immutable",
        );
      });
      await expect(s.migrate()).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(s.fake.calls).toHaveLength(0);
      expect(await s.blobCount()).toBe(s.record.chunks.length);
    });
    it.each(["compressed", "different-playback-sha"])(
      "rejects out-of-scope identity before upload: %s",
      async (kind) => {
        const s = await fixture(),
          changed: ListeningMediaRecord =
            kind === "compressed"
              ? {
                  ...s.record,
                  mimeType: "audio/mpeg",
                  playback: { ...s.record.playback!, mimeType: "audio/mpeg" },
                }
              : {
                  ...s.record,
                  playback: { ...s.record.playback!, sha256: "0".repeat(64) },
                };
        await mutate(s.input.assetId, changed);
        await expect(s.migrate()).rejects.toMatchObject({
          code: "VALIDATION_ERROR",
        });
        expect(s.fake.calls).toHaveLength(0);
        expect(await s.blobCount()).toBe(s.record.chunks.length);
      },
    );
    it("rejects a newly introduced PG alias after upload, before deleting either asset's source", async () => {
      const s = await fixture(),
        upload = s.storage.upload.bind(s.storage),
        aliasId = randomUUID();
      const alias = {
        ...s.record,
        assetId: aliasId,
        completion: { ...s.record.completion!, assetId: aliasId },
      };
      vi.spyOn(s.storage, "upload").mockImplementationOnce(async (input) => {
        const ref = await upload(input);
        await db!
          .$executeRaw`INSERT INTO english_listening_media_asset("assetId","ownerId","branchId","setId",revision,state,"uploadExpiresAt","reservedBytes",record) VALUES(${aliasId}::uuid,${alias.ownerId}::uuid,${alias.branchId}::uuid,${alias.setId}::uuid,${alias.revision},'ready',${new Date(alias.uploadExpiresAt)},0,${JSON.stringify(alias)}::jsonb)`;
        return ref;
      });
      await expect(s.migrate()).rejects.toThrow("다른 음원이 원본 조각");
      expect(s.storage.upload).toHaveBeenCalledOnce();
      expect(await s.read()).toEqual(s.record);
      expect(await s.blobCount()).toBe(s.record.chunks.length);
      expect(s.fake.files.size).toBe(0);
    });
    it("checks actual PG chunk SHA again after the network probe, even if a privileged writer bypassed the byte seal", async () => {
      const s = await fixture(),
        upload = s.storage.upload.bind(s.storage),
        key = s.record.chunks[0].key;
      vi.spyOn(s.storage, "upload").mockImplementationOnce(async (input) => {
        const ref = await upload(input);
        await db!.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            "ALTER TABLE english_listening_media_blob DISABLE TRIGGER english_listening_blob_immutable",
          );
          await tx.$executeRaw`UPDATE english_listening_media_blob SET bytes=set_byte(bytes,100,CASE WHEN get_byte(bytes,100)=0 THEN 1 ELSE 0 END) WHERE key=${key}::uuid`;
          await tx.$executeRawUnsafe(
            "ALTER TABLE english_listening_media_blob ENABLE TRIGGER english_listening_blob_immutable",
          );
        });
        return ref;
      });
      await expect(s.migrate()).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
      });
      expect(s.storage.upload).toHaveBeenCalledOnce();
      expect(await s.read()).toEqual(s.record);
      expect(await s.blobCount()).toBe(s.record.chunks.length);
      expect(s.fake.files.size).toBe(0);
    });
    it("fails the app playback probe before SQL relocation if the uploaded object changes", async () => {
      const s = await fixture(),
        upload = s.storage.upload.bind(s.storage);
      vi.spyOn(s.storage, "upload").mockImplementationOnce(async (input) => {
        const ref = await upload(input),
          bytes = s.fake.files.get(ref.key)!;
        bytes[100] ^= 1;
        return ref;
      });
      await expect(s.migrate()).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
      });
      expect(s.storage.upload).toHaveBeenCalledOnce();
      expect(await s.read()).toEqual(s.record);
      expect(await s.blobCount()).toBe(s.record.chunks.length);
      expect(s.fake.files.size).toBe(0);
    });
    it.each([
      "ENABLE REPLICA TRIGGER",
      "ENABLE ALWAYS TRIGGER",
      "DISABLE TRIGGER",
    ])(
      "restores exact original trigger mode after successful relocation: %s",
      async (mode) => {
        const s = await fixture();
        await db!.$executeRawUnsafe(
          `ALTER TABLE english_listening_media_asset ${mode} english_listening_ready_media_immutable`,
        );
        const before = await triggerState();
        try {
          expect(await s.migrate()).toMatchObject({ migrated: true });
          expect(await triggerState()).toEqual(before);
        } finally {
          await db!.$executeRawUnsafe(
            "ALTER TABLE english_listening_media_asset ENABLE TRIGGER english_listening_ready_media_immutable",
          );
        }
      },
    );
    it("reconciles a lost SQL commit acknowledgment without deleting the now-live Storage object", async () => {
      const s = await fixture();
      let lost = false;
      const database = {
        $transaction: async (
          fn: (tx: ListeningTx) => Promise<unknown>,
          options?: { timeout?: number },
        ) => {
          const value = await db!.$transaction(fn, options);
          if (options?.timeout === 30000 && !lost) {
            lost = true;
            throw new Error("lost commit acknowledgment");
          }
          return value;
        },
      } as unknown as ListeningDatabase;
      const result = await migrateListeningWaveAssetToStorage(
        database,
        s.storage,
        s.input,
      );
      expect(lost).toBe(true);
      expect(result.migrated).toBe(true);
      expect(await s.blobCount()).toBe(0);
      expect((await s.read())!.storage).toEqual(result.storage);
      expect(s.fake.files.size).toBe(1);
      expect(await s.migrate()).toMatchObject({
        migrated: false,
        removedBlobCount: 0,
      });
    });
  },
);
