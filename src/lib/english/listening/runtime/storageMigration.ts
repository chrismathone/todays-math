/** Trusted, one-time physical relocation. Never expose as an unreviewed HTTP endpoint. */
import "server-only";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { Prisma } from "@prisma/client";
import {
  listeningMediaAssetSchema,
  listeningMediaCompletionSchema,
  listeningMediaIdSchema,
} from "@/contracts/englishListeningMedia.contract";
import {
  LISTENING_MAX_DURATION_MS,
  LISTENING_MAX_UPLOAD_BYTES,
} from "@/contracts/englishListeningSource.contract";
import { inspectListeningMedia } from "../media/inspect";
import { lockListeningDatabaseCapacity } from "../media/databaseCapacity";
import { assertListeningStorageQuota } from "../media/storageQuota";
import { createListeningMediaService } from "../media/service";
import type { ListeningMediaRecord, ListeningMediaStore } from "../media/store";
import type {
  ListeningStorageApi,
  ListeningStorageRef,
} from "../media/storageApi";
import { createListeningMediaAccess } from "./mediaAccess";
import {
  conflict,
  denied,
  invalid,
  json,
  lock,
  one,
  ownedSet,
  teacher,
  type ListeningActor,
  type ListeningDatabase,
  type ListeningTx,
} from "./database";

type AssetRow = {
  assetId: string;
  ownerId: string;
  branchId: string | null;
  setId: string;
  revision: number;
  state: string;
  reservedBytes: number;
  record: ListeningMediaRecord;
};
type BlobRow = {
  key: string;
  byteLength: number;
  committed: boolean;
  sha256?: string;
};
export interface ListeningWaveStorageMigrationResult {
  migrated: boolean;
  removedBlobCount: number;
  assetId: string;
  setId: string;
  bytes: number;
  sha256: string;
  storage: ListeningStorageRef;
}
const bad = () =>
  invalid("동일 원본·재생 SHA를 가진 기존 PCM16 WAV만 이관할 수 있습니다.");
const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

async function authorized(
  tx: ListeningTx,
  input: { actor: ListeningActor; setId: string },
) {
  const set = await ownedSet(tx, await teacher(tx, input.actor), input.setId);
  if (
    !set.document.rightsReview ||
    set.document.rights.rightsStatus !== "approved" ||
    !["store_original", "teacher_review"].every((use) =>
      set.document.rights.allowedUses.some((value) => value === use),
    )
  )
    throw denied();
  return set;
}
function waveRecord(
  row: AssetRow,
  set: { id: string; owner_id: string; branch_id: string | null },
) {
  const r = row.record,
    p = r.playback,
    c = listeningMediaCompletionSchema.safeParse(r.completion);
  if (
    row.assetId !== r.assetId ||
    row.setId !== set.id ||
    r.setId !== set.id ||
    row.ownerId !== set.owner_id ||
    r.ownerId !== set.owner_id ||
    row.branchId !== set.branch_id ||
    r.branchId !== set.branch_id
  )
    throw denied();
  if (
    row.revision !== r.revision ||
    row.state !== "ready" ||
    r.state !== "ready" ||
    r.drive ||
    r.storageChunks ||
    r.mimeType !== "audio/wav" ||
    !p ||
    p.mimeType !== "audio/wav" ||
    p.revision !== 1 ||
    p.sha256 !== r.expectedSha256 ||
    p.totalBytes !== r.totalBytes ||
    r.receivedBytes !== r.totalBytes ||
    !Number.isSafeInteger(r.totalBytes) ||
    r.totalBytes <= 44 ||
    r.totalBytes > LISTENING_MAX_UPLOAD_BYTES ||
    !c.success ||
    c.data.state !== "ready"
  )
    throw bad();
  const completion = c.data;
  if (
    completion.assetId !== r.assetId ||
    completion.setId !== r.setId ||
    completion.ownerId !== r.ownerId ||
    completion.branchId !== r.branchId ||
    completion.revision !== r.revision ||
    completion.mimeType !== "audio/wav" ||
    completion.sha256 !== r.expectedSha256 ||
    completion.totalBytes !== r.totalBytes ||
    completion.receivedBytes !== r.totalBytes ||
    (completion.originalSha256 !== undefined &&
      completion.originalSha256 !== r.expectedSha256) ||
    (completion.playbackBytes !== undefined &&
      completion.playbackBytes !== r.totalBytes) ||
    (completion.playbackRevision !== undefined &&
      completion.playbackRevision !== p.revision)
  )
    throw bad();
  if (!Array.isArray(r.chunks) || !Array.isArray(p.chunks)) throw bad();
  if (r.storage) {
    if (r.chunks.length || p.chunks.length || row.reservedBytes !== 0)
      throw bad();
  } else {
    if (!r.chunks.length || !isDeepStrictEqual(r.chunks, p.chunks)) throw bad();
    let offset = 0;
    const keys = new Set<string>();
    for (const chunk of r.chunks) {
      if (
        !listeningMediaIdSchema.safeParse(chunk.key).success ||
        keys.has(chunk.key) ||
        chunk.offset !== offset ||
        (chunk.blobOffset ?? 0) !== 0 ||
        !Number.isSafeInteger(chunk.byteLength) ||
        chunk.byteLength < 1 ||
        chunk.byteLength > 1024 * 1024 ||
        !/^[a-f0-9]{64}$/.test(chunk.sha256)
      )
        throw bad();
      keys.add(chunk.key);
      offset += chunk.byteLength;
    }
    if (offset !== r.totalBytes) throw bad();
  }
  return r;
}
function validateRef(record: ListeningMediaRecord, ref: ListeningStorageRef) {
  if (
    ref.ownerId !== record.ownerId ||
    !ref.key.startsWith(`${record.ownerId}/${record.assetId}/`) ||
    ref.bytes !== record.totalBytes ||
    ref.start !== 0 ||
    ref.endExclusive !== record.totalBytes ||
    ref.sha256 !== record.expectedSha256
  )
    throw bad();
}
async function sourceRows(
  tx: ListeningTx,
  r: ListeningMediaRecord,
  digest = false,
) {
  const rows = await tx.$queryRaw<BlobRow[]>(
    Prisma.sql`SELECT key,"byteLength",committed ${digest ? Prisma.sql`,encode(sha256(bytes),'hex') AS sha256` : Prisma.empty} FROM english_listening_media_blob WHERE "assetId"=${r.assetId}::uuid ORDER BY key`,
  );
  if (rows.length !== r.chunks.length) throw bad();
  for (const chunk of r.chunks) {
    const row = rows.find((row) => row.key === chunk.key);
    if (
      !row ||
      !row.committed ||
      row.byteLength !== chunk.byteLength ||
      (digest && row.sha256 !== chunk.sha256)
    )
      throw bad();
  }
}
async function assertNoAliases(tx: ListeningTx, r: ListeningMediaRecord) {
  const keys = r.chunks.map((c) => c.key);
  const alias = await one<{ assetId: string }>(
    tx,
    Prisma.sql`
    SELECT a."assetId" FROM english_listening_media_asset a WHERE a."assetId"<>${r.assetId}::uuid AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(a.record->'chunks')='array' THEN a.record->'chunks' ELSE '[]'::jsonb END || CASE WHEN jsonb_typeof(a.record->'playback'->'chunks')='array' THEN a.record->'playback'->'chunks' ELSE '[]'::jsonb END) c
      WHERE c->>'key'=ANY(${keys}::text[])
    ) LIMIT 1`,
  );
  if (alias)
    throw invalid("다른 음원이 원본 조각을 참조하고 있어 이관할 수 없습니다.");
}
async function readSource(
  database: ListeningDatabase,
  r: ListeningMediaRecord,
) {
  const bytes = Buffer.alloc(r.totalBytes);
  for (const chunk of r.chunks) {
    const digest = createHash("sha256");
    for (let offset = 0; offset < chunk.byteLength; offset += 64 * 1024) {
      const length = Math.min(64 * 1024, chunk.byteLength - offset);
      const row = await database.$transaction((tx) =>
        one<{ bytes: Uint8Array }>(
          tx,
          Prisma.sql`SELECT SUBSTRING(bytes FROM ${offset + 1}::integer FOR ${length}::integer) AS bytes FROM english_listening_media_blob WHERE key=${chunk.key}::uuid AND "assetId"=${r.assetId}::uuid AND committed`,
        ),
      );
      if (!row || row.bytes.length !== length) throw bad();
      digest.update(row.bytes);
      bytes.set(row.bytes, chunk.offset + offset);
    }
    if (digest.digest("hex") !== chunk.sha256) throw bad();
  }
  if (sha(bytes) !== r.expectedSha256) throw bad();
  const inspected = inspectListeningMedia(
    bytes.subarray(0, 44),
    bytes.length,
    "audio/wav",
    LISTENING_MAX_DURATION_MS,
  );
  if (
    !inspected.playable ||
    r.completion?.state !== "ready" ||
    inspected.durationMs !== r.completion.durationMs
  )
    throw bad();
  return bytes;
}
async function verifyProxy(
  database: ListeningDatabase,
  storage: ListeningStorageApi,
  actor: ListeningActor,
  record: ListeningMediaRecord,
  original?: Buffer,
) {
  // Probe the established app media service with a detached candidate before any PG deletion.
  const unused = async () => {
    throw new Error("Read-only migration probe");
  };
  const store: ListeningMediaStore = {
    get: async (id) => (id === record.assetId ? structuredClone(record) : null),
    create: unused,
    compareAndSwap: unused,
    putBlob: unused,
    deleteBlob: unused,
    listExpired: unused,
    readBlob: async function* () {
      throw new Error("Unexpected PG read in Storage probe");
    },
  };
  const service = createListeningMediaService({
    store,
    storage,
    ...createListeningMediaAccess(database),
  });
  const input = { setId: record.setId, assetId: record.assetId };
  const head = await service.serve({ actor }, { ...input, method: "HEAD" });
  if (
    head.status !== 200 ||
    head.body !== null ||
    head.headers.get("content-length") !== String(record.totalBytes) ||
    head.headers.get("content-type") !== "audio/wav" ||
    head.headers.get("etag") !== `"${record.expectedSha256}"`
  )
    throw bad();
  const starts = [
    0,
    Math.max(
      0,
      Math.min(
        record.totalBytes - 45,
        (record.chunks[0]?.byteLength ?? 64 * 1024) - 22,
      ),
    ),
    record.totalBytes - 44,
  ];
  for (const start of new Set(starts)) {
    const end = Math.min(record.totalBytes, start + 44),
      response = await service.serve(
        { actor },
        { ...input, method: "GET", range: `bytes=${start}-${end - 1}` },
      );
    if (
      response.status !== 206 ||
      response.headers.get("content-range") !==
        `bytes ${start}-${end - 1}/${record.totalBytes}`
    )
      throw bad();
    const part = Buffer.from(await response.arrayBuffer());
    if (
      part.length !== end - start ||
      (original && !part.equals(original.subarray(start, end)))
    )
      throw bad();
  }
  const response = await service.serve({ actor }, { ...input, method: "GET" });
  if (response.status !== 200 || !response.body) throw bad();
  const reader = response.body.getReader(),
    digest = createHash("sha256");
  let total = 0,
    prefix = Buffer.alloc(0);
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.length;
      if (total > record.totalBytes) throw bad();
      digest.update(next.value);
      if (prefix.length < 44)
        prefix = Buffer.concat([
          prefix,
          Buffer.from(next.value.subarray(0, 44 - prefix.length)),
        ]);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const inspected = inspectListeningMedia(
    prefix,
    total,
    "audio/wav",
    LISTENING_MAX_DURATION_MS,
  );
  if (
    total !== record.totalBytes ||
    digest.digest("hex") !== record.expectedSha256 ||
    !inspected.playable ||
    record.completion?.state !== "ready" ||
    inspected.durationMs !== record.completion.durationMs
  )
    throw bad();
}
const triggerRestore = {
  O: "ENABLE TRIGGER",
  R: "ENABLE REPLICA TRIGGER",
  A: "ENABLE ALWAYS TRIGGER",
  D: "DISABLE TRIGGER",
} as const;

/** Keeps all public identities and publication snapshots. Requires table-owner privilege
 * to temporarily disable exactly the ready seal in the same rollback-safe transaction.
 * The caller should preserve an independent local backup before operating migration. */
export async function migrateListeningWaveAssetToStorage(
  database: ListeningDatabase,
  storage: ListeningStorageApi,
  input: { actor: ListeningActor; setId: string; assetId: string },
): Promise<ListeningWaveStorageMigrationResult> {
  const ids = listeningMediaAssetSchema.parse({
    setId: input.setId,
    assetId: input.assetId,
  });
  const record = await database.$transaction(async (tx) => {
    const set = await authorized(tx, input),
      row = await one<AssetRow>(
        tx,
        Prisma.sql`SELECT * FROM english_listening_media_asset WHERE "assetId"=${ids.assetId}::uuid`,
      );
    if (!row) throw denied();
    const r = waveRecord(row, set);
    await sourceRows(tx, r);
    if (!r.storage) await assertNoAliases(tx, r);
    return r;
  });
  const result = (
    ref: ListeningStorageRef,
    migrated: boolean,
  ): ListeningWaveStorageMigrationResult => ({
    migrated,
    removedBlobCount: migrated ? record.chunks.length : 0,
    ...ids,
    bytes: record.totalBytes,
    sha256: record.expectedSha256,
    storage: ref,
  });
  if (record.storage) {
    validateRef(record, record.storage);
    await verifyProxy(database, storage, input.actor, record);
    return result(record.storage, false);
  }
  const bytes = await readSource(database, record);
  let staged: ListeningStorageRef | undefined,
    candidate: ListeningMediaRecord | undefined;
  try {
    staged = await storage.upload({
      ownerId: record.ownerId,
      assetId: record.assetId,
      bytes: bytes.length,
      mimeType: "audio/wav",
      read: async function* () {
        for (let offset = 0; offset < bytes.length; offset += 1024 * 1024)
          yield bytes.subarray(offset, offset + 1024 * 1024);
      },
    });
    validateRef(record, staged);
    candidate = {
      ...record,
      storage: staged,
      chunks: [],
      playback: { ...record.playback!, chunks: [] },
    };
    await verifyProxy(database, storage, input.actor, candidate, bytes);
    const next = candidate,
      ref = staged;
    await database.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL lock_timeout='5s'");
        // Set editors/compose acquire these set locks before media locks. Never invert them.
        await lock(tx, ids.setId);
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM english_listening_set WHERE id=${ids.setId}::uuid FOR UPDATE`,
        );
        await lockListeningDatabaseCapacity(tx);
        await tx.$executeRaw(
          Prisma.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`listening-media:${record.ownerId}`}::text,0))`,
        );
        await tx.$executeRawUnsafe(
          "LOCK TABLE english_listening_media_asset IN ACCESS EXCLUSIVE MODE",
        );
        const row = await one<AssetRow>(
          tx,
          Prisma.sql`SELECT * FROM english_listening_media_asset WHERE "assetId"=${ids.assetId}::uuid FOR UPDATE`,
        );
        if (!row || !isDeepStrictEqual(row.record, record)) throw conflict();
        waveRecord(row, await authorized(tx, input));
        await sourceRows(tx, record, true);
        await assertNoAliases(tx, record);
        await assertListeningStorageQuota(tx, record.ownerId, { ref });
        const trigger = await one<{ enabled: string }>(
          tx,
          Prisma.sql`SELECT tgenabled::text AS enabled FROM pg_trigger WHERE tgrelid='english_listening_media_asset'::regclass AND tgname='english_listening_ready_media_immutable' AND NOT tgisinternal`,
        );
        if (!trigger || !(trigger.enabled in triggerRestore)) throw bad();
        await tx.$executeRawUnsafe(
          "ALTER TABLE english_listening_media_asset DISABLE TRIGGER english_listening_ready_media_immutable",
        );
        const changed = await tx.$executeRaw(
          Prisma.sql`UPDATE english_listening_media_asset SET record=${json(next)},"reservedBytes"=0 WHERE "assetId"=${ids.assetId}::uuid AND revision=${record.revision} AND state='ready' AND record=${json(record)}`,
        );
        if (changed !== 1) throw conflict();
        const deleted = await tx.$executeRaw(
          Prisma.sql`DELETE FROM english_listening_media_blob WHERE "assetId"=${ids.assetId}::uuid AND key::text=ANY(${record.chunks.map((chunk) => chunk.key)}::text[]) AND committed`,
        );
        if (deleted !== record.chunks.length) throw conflict();
        await tx.$executeRawUnsafe(
          `ALTER TABLE english_listening_media_asset ${triggerRestore[trigger.enabled as keyof typeof triggerRestore]} english_listening_ready_media_immutable`,
        );
      },
      { maxWait: 10000, timeout: 30000 },
    );
    return result(staged, true);
  } catch (error) {
    if (
      staged &&
      staged.ownerId === record.ownerId &&
      staged.key.startsWith(`${record.ownerId}/${record.assetId}/`)
    ) {
      // A lost commit acknowledgement must never delete a now-live immutable object.
      const committed = await database.$transaction(async (tx) => {
        const row = await one<AssetRow>(
          tx,
          Prisma.sql`SELECT * FROM english_listening_media_asset WHERE "assetId"=${ids.assetId}::uuid`,
        );
        const bound = await one<{ exists: boolean }>(
          tx,
          Prisma.sql`SELECT EXISTS(SELECT 1 FROM english_listening_media_asset WHERE record->'storage'->>'bucket'=${staged!.bucket} AND record->'storage'->>'key'=${staged!.key}) OR EXISTS(SELECT 1 FROM english_listening_media_storage_blob WHERE ref->>'bucket'=${staged!.bucket} AND ref->>'key'=${staged!.key}) AS exists`,
        );
        return {
          matches:
            !!candidate && !!row && isDeepStrictEqual(row.record, candidate),
          live: bound?.exists === true,
          removed: !(await one(
            tx,
            Prisma.sql`SELECT key FROM english_listening_media_blob WHERE "assetId"=${ids.assetId}::uuid LIMIT 1`,
          )),
        };
      });
      if (committed.matches && committed.live && committed.removed)
        return result(staged, true);
      if (!committed.live) await storage.remove(staged);
    }
    throw error;
  }
}
