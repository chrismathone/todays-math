// @vitest-environment node
/** Run against a fresh loopback DB with this file alone to test global reservations. */
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaListeningMediaStore } from "@/lib/english/listening/media/prismaStore";
import {
  listeningDatabaseCapacityFits,
  listeningDatabaseMaxBytes,
} from "@/lib/english/listening/media/databaseCapacity";
import type { ListeningMediaRecord } from "@/lib/english/listening/media/store";
const url = process.env.LISTENING_TEST_DATABASE_URL;
if (
  url &&
  (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname) ||
    !/^\/listening_(runtime|test)/.test(new URL(url).pathname))
)
  throw new Error("Refusing non-isolated listening database");
const db = url ? new PrismaClient({ datasources: { db: { url } } }) : null;
const owners = [randomUUID(), randomUUID()],
  sets = [randomUUID(), randomUUID()];
const record = (index = 0): ListeningMediaRecord => ({
  assetId: randomUUID(),
  ownerId: owners[index],
  branchId: null,
  setId: sets[index],
  revision: 0,
  state: "uploading",
  totalBytes: 1024 * 1024,
  receivedBytes: 0,
  mimeType: "audio/mpeg",
  expectedSha256: "0".repeat(64),
  mp3PlaybackEncoding: "scrubbed_mp3",
  chunkBytes: 1024 * 1024,
  uploadExpiresAt: Date.now() + 3600000,
  chunks: [],
});
const size = async () =>
  Number(
    (
      await db!.$queryRaw<{ bytes: bigint }[]>(
        Prisma.sql`SELECT pg_database_size(current_database())::bigint AS bytes`,
      )
    )[0].bytes,
  );
describe("Listening PostgreSQL disk budget", () => {
  it("supports the explicit Pro ceiling and 64-bit sums while rejecting invalid trusted limits", () => {
    expect(listeningDatabaseMaxBytes(undefined, {})).toBe(6 * 1024 ** 3);
    expect(
      listeningDatabaseMaxBytes(undefined, {
        ENGLISH_LISTENING_DATABASE_MAX_BYTES: String(8 * 1024 ** 3),
      }),
    ).toBe(8 * 1024 ** 3);
    expect(() =>
      listeningDatabaseMaxBytes(undefined, {
        ENGLISH_LISTENING_DATABASE_MAX_BYTES: "bad",
      }),
    ).toThrow();
    expect(
      listeningDatabaseCapacityFits(
        3 * 1024 ** 3,
        2 * 1024 ** 3,
        64 * 1024 ** 2,
        8 * 1024 ** 3,
      ),
    ).toBe(true);
    expect(
      listeningDatabaseCapacityFits(
        3 * 1024 ** 3,
        5 * 1024 ** 3,
        64 * 1024 ** 2,
        8 * 1024 ** 3,
      ),
    ).toBe(false);
  });
});
describe.skipIf(!db)(
  "Listening global disk reservation (isolated PostgreSQL)",
  () => {
    beforeAll(async () => {
      for (let index = 0; index < owners.length; index++) {
        await db!.user.create({
          data: {
            id: owners[index],
            email: `${owners[index]}@capacity.listening.test`,
            name: "용량 검증",
            approvalStatus: "approved",
          },
        });
        await db!.$executeRaw(
          Prisma.sql`INSERT INTO english_listening_set(id,owner_id,branch_id,revision,document) VALUES(${sets[index]}::uuid,${owners[index]}::uuid,NULL,1,${JSON.stringify({ id: sets[index], ownerId: owners[index], branchId: null })}::jsonb)`,
        );
      }
    });
    afterEach(async () => {
      await db!.$executeRaw(
        Prisma.sql`DELETE FROM english_listening_media_blob WHERE "assetId" IN(SELECT "assetId" FROM english_listening_media_asset WHERE "ownerId" IN(${owners[0]}::uuid,${owners[1]}::uuid))`,
      );
      await db!.$executeRaw(
        Prisma.sql`DELETE FROM english_listening_media_asset WHERE "ownerId" IN(${owners[0]}::uuid,${owners[1]}::uuid)`,
      );
    });
    afterAll(async () => {
      await db!.$executeRaw(
        Prisma.sql`DELETE FROM english_listening_set WHERE id IN(${sets[0]}::uuid,${sets[1]}::uuid)`,
      );
      await db!.user.deleteMany({ where: { id: { in: owners } } });
      await db!.$disconnect();
    });
    it("rejects an oversized reservation before any asset or bytea write", async () => {
      const item = record(),
        store = new PrismaListeningMediaStore(db!, {
          maxDatabaseBytes: await size(),
        });
      await expect(store.create(item)).rejects.toMatchObject({
        code: "quota_exceeded",
      });
      expect(await store.get(item.assetId)).toBeNull();
    });
    it("serializes two different owners so only one upload can reserve the remaining disk headroom", async () => {
      const reserve = 2 * 1024 * 1024,
        maxDatabaseBytes =
          (await size()) + Math.ceil(reserve * 1.1) + 1024 * 1024 + 128 * 1024;
      const store = new PrismaListeningMediaStore(db!, { maxDatabaseBytes });
      const results = await Promise.allSettled([
        store.create(record(0)),
        store.create(record(1)),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const rejected = results.find(
        (r) => r.status === "rejected",
      ) as PromiseRejectedResult;
      expect(rejected.reason).toMatchObject({ code: "quota_exceeded" });
    });
    it("rechecks current disk before bytea writes and leaves no staged blob after rejection", async () => {
      const item = record(),
        store = new PrismaListeningMediaStore(db!);
      await store.create(item);
      const restricted = new PrismaListeningMediaStore(db!, {
        maxDatabaseBytes: await size(),
      });
      await expect(
        restricted.putBlob(new Uint8Array(1024), {
          assetId: item.assetId,
          ownerId: item.ownerId,
        }),
      ).rejects.toMatchObject({ code: "quota_exceeded" });
      const [row] = await db!.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(*) AS count FROM english_listening_media_blob WHERE "assetId"=${item.assetId}::uuid`,
      );
      expect(row.count).toBe(BigInt(0));
    });
    it("excludes metadata-only external Storage reservations from PostgreSQL binary headroom", async () => {
      const external = { ...record(1), storageChunks: true };
      await db!.$executeRaw(
        Prisma.sql`INSERT INTO english_listening_media_asset("assetId","ownerId","branchId","setId",revision,state,"uploadExpiresAt","reservedBytes",record) VALUES(${external.assetId}::uuid,${external.ownerId}::uuid,NULL,${external.setId}::uuid,0,'uploading',${new Date(external.uploadExpiresAt)},${1024 ** 3},${JSON.stringify(external)}::jsonb)`,
      );
      const maxDatabaseBytes =
        (await size()) +
        Math.ceil(2 * 1024 * 1024 * 1.1) +
        1024 * 1024 +
        128 * 1024;
      const item = record(0);
      expect(
        await new PrismaListeningMediaStore(db!, { maxDatabaseBytes }).create(
          item,
        ),
      ).toBe(true);
    });
  },
);
