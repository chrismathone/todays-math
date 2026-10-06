// @vitest-environment node
/** Real PostgreSQL and canonical PCM files; no shared database fallback. */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { deflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createListeningRuntime } from "@/lib/english/listening/runtime/service";
import { createListeningMediaAccess } from "@/lib/english/listening/runtime/mediaAccess";
import { createListeningMediaService } from "@/lib/english/listening/media/service";
import { PrismaListeningMediaStore } from "@/lib/english/listening/media/prismaStore";
import { PrismaStorageListeningMediaStore } from "@/lib/english/listening/media/storageStore";
import { printableDraft } from "@/lib/english/listening/runtime/compose";
import { listeningDraftPrintDocument } from "@/lib/english/listening/draftPrint";
import {
  teacher,
  type ListeningActor,
} from "@/lib/english/listening/runtime/database";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";
import type { ListeningComposeSource } from "@/contracts/englishListeningCompose.contract";
import type { ListeningSetDetail } from "@/contracts/englishListeningHttp.contract";
import type { ListeningAssessmentSource } from "@/contracts/englishListeningSource.contract";
import { LISTENING_MAX_DOCUMENT_BYTES } from "@/contracts/englishListeningSource.contract";
import {
  decodeMp3,
  parseMp3,
  MAX_DURATION_MS,
  MAX_PLAYBACK_BYTES,
  waveHeader,
} from "@/lib/english/listening/media/mp3";
import { planListeningWaveClip } from "@/lib/english/listening/media/clip";
import { registerDriveListeningAsset } from "@/lib/english/listening/runtime/driveAssets";
import { createListeningDriveApi } from "@/lib/english/listening/media/driveApi";
import { fakeListeningDrive } from "../fixtures/english-listening/fakeDrive";
import { fakeListeningStorage } from "../fixtures/english-listening/fakeStorage";
import { createListeningStorageApi } from "@/lib/english/listening/media/storageApi";
import { prepareListeningM4aPlayback } from "@/lib/english/listening/media/trustedM4a";
import {
  registerStorageListeningAsset,
  insertStorageAsset,
  storageReadyRecord,
} from "@/lib/english/listening/runtime/storageAssets";

vi.mock("server-only", () => ({}));
const url = process.env.LISTENING_TEST_DATABASE_URL;
if (
  url &&
  (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname) ||
    !/^\/listening_(runtime|test)/.test(new URL(url).pathname))
)
  throw new Error("Refusing non-isolated listening database");
const db = url ? new PrismaClient({ datasources: { db: { url } } }) : null;
const now = new Date();
const runtime = db ? createListeningRuntime(db, () => now) : null;
const store = db ? new PrismaListeningMediaStore(db) : null;
const media = db
  ? createListeningMediaService({
      store: store!,
      ...createListeningMediaAccess(db, () => now),
      now: () => now.getTime(),
    })
  : null;
const archiveMedia = db
  ? createListeningMediaService({
      store: store!,
      ...createListeningMediaAccess(db, () => now),
      now: () => now.getTime(),
      mp3PlaybackEncoding: "scrubbed_mp3",
    })
  : null;
const ownerId = randomUUID(),
  otherId = randomUUID();
const branchIds: string[] = [];
const owner: ListeningActor = { kind: "teacher", userId: ownerId };
const other: ListeningActor = { kind: "teacher", userId: otherId };
const fakeDrive = fakeListeningDrive(ownerId);
const driveApi = createListeningDriveApi(fakeDrive.config, fakeDrive.fetchImpl);
const driveRuntime = db
  ? createListeningRuntime(db, () => now, { drive: driveApi })
  : null;
const fakeStorage = fakeListeningStorage();
const storageApi = createListeningStorageApi(
  fakeStorage.config,
  fakeStorage.fetchImpl,
);
const storageRuntime = db
  ? createListeningRuntime(db, () => now, { storage: storageApi })
  : null;
const durableStorageMedia = db
  ? createListeningMediaService({
      store: new PrismaStorageListeningMediaStore(db, storageApi),
      storage: storageApi,
      ...createListeningMediaAccess(db, () => now),
      now: () => now.getTime(),
    })
  : null;
const rights = englishListeningFixture().rights;
const sha = (value: Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
async function verifyStorageProxy(
  set: ListeningSetDetail,
  expected: Buffer,
  mimeType: "audio/mpeg" | "audio/wav",
) {
  const assetId = set.document.groups[0].audio!.assetId;
  const request = { setId: set.id, assetId };
  const head = await durableStorageMedia!.serve(
    { actor: owner },
    { ...request, method: "HEAD" },
  );
  expect(head.status).toBe(200);
  expect(head.headers.get("content-type")).toBe(mimeType);
  expect(head.headers.get("content-length")).toBe(String(expected.length));
  expect(head.headers.get("etag")).toBe(`"${sha(expected)}"`);
  expect(await head.text()).toBe("");
  const response = await durableStorageMedia!.serve(
    { actor: owner },
    { ...request, method: "GET" },
  );
  const actualHash = createHash("sha256");
  let actualBytes = 0;
  const reader = response.body!.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      actualHash.update(value);
      actualBytes += value.length;
    }
  } finally {
    reader.releaseLock();
  }
  expect(actualBytes).toBe(expected.length);
  expect(actualHash.digest("hex")).toBe(sha(expected));
  const boundary = Math.min(1024 * 1024, Math.floor(expected.length / 2));
  for (const [start, end] of [
    [0, Math.min(44, expected.length) - 1],
    [boundary - 16, boundary + 31],
  ]) {
    const range = await durableStorageMedia!.serve(
      { actor: owner },
      { ...request, method: "GET", range: `bytes=${start}-${end}` },
    );
    expect(range.status).toBe(206);
    expect(range.headers.get("content-range")).toBe(
      `bytes ${start}-${end}/${expected.length}`,
    );
    expect(Buffer.from(await range.arrayBuffer())).toEqual(
      expected.subarray(start, end + 1),
    );
  }
  expect(
    (
      await durableStorageMedia!.serve(
        { actor: other },
        { ...request, method: "GET" },
      )
    ).status,
  ).toBe(404);
}
function wave(marker = 0) {
  const bytes = Buffer.alloc(44 + 15000 * 16);
  bytes.write("RIFF");
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
  bytes.writeUInt32LE(bytes.length - 44, 40);
  for (let offset = 44; offset < bytes.length; offset += 2)
    bytes.writeInt16LE(((offset / 2 + marker) % 32000) - 16000, offset);
  return bytes;
}
async function* bytes(value: Uint8Array) {
  yield value;
}
/** A real PNG with random RGBA pixels avoids compressible padding or malformed image fixtures. */
function documentBudgetImage() {
  const width = 400,
    height = 100;
  const chunk = (kind: string, content: Buffer) => {
    const payload = Buffer.concat([Buffer.from(kind), content]);
    let crc = 0xffffffff;
    for (const byte of payload) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const result = Buffer.alloc(content.length + 12);
    result.writeUInt32BE(content.length, 0);
    payload.copy(result, 4);
    result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4);
    return result;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const pixels = randomBytes((width * 4 + 1) * height);
  for (let row = 0; row < height; row++) pixels[row * (width * 4 + 1)] = 0;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return {
    dataUrl: `data:image/png;base64,${png.toString("base64")}`,
    width,
    height,
  };
}
const edit = (set: ListeningSetDetail) => ({
  title: set.document.title,
  level: set.document.level,
  examId: null,
  rights: set.document.rights,
  basis: set.document.provenance.basis,
  expectedRevision: set.revision,
  groups: set.document.groups.map((group) => {
    const copy = { ...group };
    Reflect.deleteProperty(copy, "reviews");
    return copy;
  }),
});
async function source(
  marker = 0,
  timing = true,
  archive = false,
  external = false,
  useStorage = false,
  assessmentKind?: ListeningAssessmentSource["kind"],
) {
  let set = await runtime!.createSet(owner, {
    title: "원본 듣기 " + marker,
    rights,
    basis: "직접 작성한 테스트 문항과 PCM",
    ...(assessmentKind
      ? {
          source: {
            kind: assessmentKind,
            provider: "Self-authored assessment policy fixture",
            year: 2026,
            round: 1,
            month: null,
            originalFilename: "self-authored.pdf",
          },
        }
      : {}),
  });
  set = await runtime!.reviewSet(owner, set.id, {
    expectedRevision: set.revision,
    kind: "rights",
    basis: "테스트 원본 보관·교사 이용·배포 허용",
  });
  let wav = wave(marker);
  let original = wav;
  if (archive) {
    const tone = readFileSync(
      new URL("../fixtures/english-listening/tone.mp3", import.meta.url),
    );
    const text = Buffer.from("SECRET_ANSWER_AND_SCRIPT");
    original = Buffer.concat([
      Buffer.from([73, 68, 51, 3, 0, 0, 0, 0, 0, text.length]),
      text,
      tone,
    ]);
    const parts: Buffer[] = [];
    const decoded = await decodeMp3(
      original,
      { maxDurationMs: MAX_DURATION_MS, maxPlaybackBytes: MAX_PLAYBACK_BYTES },
      async (part) => {
        parts.push(part);
      },
    );
    wav = Buffer.concat([decoded.header, ...parts]);
  }
  const uploadMedia = archive ? archiveMedia! : media!;
  let ready;
  if (external && useStorage && !archive) {
    // Canonical self-authored PCM is already decoded; the archive registrar accepts MP3.
    const assetId = randomUUID();
    const ref = await storageApi.upload({
      ownerId,
      assetId,
      bytes: original.length,
      mimeType: "audio/wav",
      read: async function* () {
        yield original;
      },
    });
    const record = storageReadyRecord({
      assetId,
      setId: set.id,
      ownerId,
      branchId: set.document.branchId,
      storage: ref,
      mimeType: "audio/wav",
      sha256: sha(original),
      durationMs: 15000,
      now: now.getTime(),
    });
    await db!.$transaction((tx) => insertStorageAsset(tx, record));
    ready = record.completion!;
  } else if (external) {
    ready = useStorage
      ? await registerStorageListeningAsset(
          db!,
          storageApi,
          {
            actor: owner,
            setId: set.id,
            expectedSetRevision: set.revision,
            bytes: original,
          },
          () => now,
        )
      : await registerDriveListeningAsset(
          db!,
          driveApi,
          {
            actor: owner,
            setId: set.id,
            expectedSetRevision: set.revision,
            fileId: fakeDrive.add(original),
            bytes: original,
          },
          () => now,
        );
  } else {
    const begun = await uploadMedia.beginUpload(
      { actor: owner },
      {
        setId: set.id,
        totalBytes: original.length,
        mimeType: archive ? "audio/mpeg" : "audio/wav",
        expectedSha256: sha(original),
      },
    );
    const appended = await uploadMedia.appendChunk(
      { actor: owner },
      {
        setId: set.id,
        assetId: begun.assetId,
        expectedRevision: begun.revision,
        offset: 0,
        byteLength: original.length,
        sha256: sha(original),
      },
      bytes(original),
    );
    ready = await uploadMedia.completeUpload(
      { actor: owner },
      {
        setId: set.id,
        assetId: begun.assetId,
        expectedRevision: appended.revision,
      },
    );
  }
  if (ready.state !== "ready") throw new Error("Real PCM readiness required");
  const group = englishListeningFixture().groups[0];
  const editableGroup = { ...group };
  Reflect.deleteProperty(editableGroup, "reviews");
  const questions = group.questions.map((question, index) => ({
    ...question,
    ...(timing
      ? {
          audioRange: archive
            ? { startMs: index * 500, endMs: (index + 1) * 500 }
            : { startMs: index * 8000, endMs: index ? 15000 : 8000 },
        }
      : {}),
    evidence: [
      archive
        ? { startMs: index ? 600 : 100, endMs: index ? 900 : 300 }
        : { startMs: index ? 9000 : 3000, endMs: index ? 14000 : 7000 },
    ],
  }));
  set = await runtime!.updateSet(owner, set.id, {
    ...edit(set),
    groups: [
      {
        ...editableGroup,
        transcript: {
          ...group.transcript,
          text: group.transcript.text + marker,
        },
        audio: {
          assetId: ready.assetId,
          sha256: ready.sha256,
          durationMs: ready.durationMs,
        },
        questions,
      },
    ],
  });
  return { source: await runtime!.composeSource(owner, set.id), wav, original };
}
const selection = (
  source: ListeningComposeSource,
  questionIds = source.detail.document.groups[0].questions.map(
    (question) => question.id,
  ),
) => ({
  setId: source.detail.id,
  expectedRevision: source.detail.revision,
  documentHash: source.documentHash,
  groupId: source.detail.document.groups[0].id,
  questionIds,
});

describe.skipIf(!db)("listening compose (isolated PostgreSQL)", () => {
  beforeAll(async () => {
    process.env.ENGLISH_LISTENING_ENABLED = "true";
    process.env.ENGLISH_LISTENING_TEACHER_IDS = [ownerId, otherId].join(",");
    for (const id of [ownerId, otherId])
      await db!.user.create({
        data: {
          id,
          email: id + "@compose.listening.test",
          name: "듣기 구성 교사",
          approvalStatus: "approved",
        },
      });
  });
  afterEach(async () => {
    fakeStorage.files.clear();
    fakeStorage.calls.splice(0);
    fakeDrive.files.clear();
    fakeDrive.calls.splice(0);
    await db!.$transaction(async (tx) => {
      await tx.$executeRaw(
        Prisma.sql`DELETE FROM english_listening_media_storage_blob WHERE "assetId" IN(SELECT "assetId" FROM english_listening_media_asset WHERE "ownerId" IN(${ownerId}::uuid,${otherId}::uuid))`,
      );
      await tx.$executeRaw(
        Prisma.sql`DELETE FROM english_listening_media_blob WHERE "assetId" IN (SELECT "assetId" FROM english_listening_media_asset WHERE "ownerId" IN (${ownerId}::uuid,${otherId}::uuid))`,
      );
      await tx.$executeRaw(
        Prisma.sql`DELETE FROM english_listening_media_asset WHERE "ownerId" IN (${ownerId}::uuid,${otherId}::uuid)`,
      );
      await tx.$executeRaw(
        Prisma.sql`DELETE FROM english_listening_audit WHERE actor_id IN (${ownerId}::uuid,${otherId}::uuid)`,
      );
      await tx.$executeRaw(
        Prisma.sql`DELETE FROM english_listening_set WHERE owner_id IN (${ownerId}::uuid,${otherId}::uuid)`,
      );
      if (branchIds.length)
        await tx.branch.deleteMany({
          where: { id: { in: branchIds.splice(0) } },
        });
    });
  });
  it("lets the bank grant manage owned materials without granting listening assignments or bypassing rights", async () => {
    const pilotIds = process.env.ENGLISH_LISTENING_TEACHER_IDS;
    process.env.ENGLISH_LISTENING_TEACHER_IDS = otherId;
    await db!.user.update({
      where: { id: ownerId },
      data: { disabledMenus: ["english-listening"] },
    });
    try {
      const account = await db!.$transaction((tx) =>
        teacher(tx, owner, "materials"),
      );
      expect(account.menus).toContain("english-bank");
      expect(account.menus).not.toContain("english-listening");
      await expect(
        db!.$transaction((tx) => teacher(tx, owner)),
      ).rejects.toMatchObject({ status: 404 });
      const original = await source(91);
      const bank = await runtime!.teacherBank(owner, "bank", {});
      expect(
        bank.data.some((item) => item.id === original.source.detail.id),
      ).toBe(true);
      expect(
        (await runtime!.teacherList(owner, "sets")).some(
          (item) => "id" in item && item.id === original.source.detail.id,
        ),
      ).toBe(true);
      expect(
        (await runtime!.setDetail(owner, original.source.detail.id)).id,
      ).toBe(original.source.detail.id);
      await expect(
        runtime!.composeSource(other, original.source.detail.id),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        runtime!.setDetail(other, original.source.detail.id),
      ).rejects.toMatchObject({ status: 404 });
      for (const resource of ["classes", "assignments"] as const)
        await expect(
          runtime!.teacherList(owner, resource),
        ).rejects.toMatchObject({ status: 404 });
      await expect(runtime!.createAssignment(owner, {})).rejects.toMatchObject({
        status: 404,
      });
      await expect(
        runtime!.publishSet(owner, original.source.detail.id, {
          expectedRevision: original.source.detail.revision,
        }),
      ).rejects.toMatchObject({ status: 404 });
      const request = {
        setId: original.source.detail.id,
        assetId: original.source.detail.document.groups[0].audio!.assetId,
        method: "GET",
      } as const;
      const response = await media!.serve({ actor: owner }, request);
      expect(response.status).toBe(200);
      expect(Buffer.from(await response.arrayBuffer())).toEqual(original.wav);
      let composed = await runtime!.composeSet(owner, {
        title: "은행 문항 시험지",
        selections: [selection(original.source)],
      });
      expect(composed.document.rightsReview).toBeNull();
      composed = await runtime!.reviewSet(owner, composed.id, {
        expectedRevision: composed.revision,
        kind: "rights",
        basis: "직접 작성한 테스트 자료의 보관·교사 이용·인쇄 허용",
      });
      const printable = await db!.$transaction(async (tx) =>
        printableDraft(
          tx,
          await teacher(tx, owner, "materials"),
          composed.id,
          composed.revision,
          "student",
        ),
      );
      const studentPaper = JSON.stringify(
        listeningDraftPrintDocument(printable, "student"),
      );
      expect(studentPaper).not.toContain("answerChoiceId");
      expect(studentPaper).not.toContain(printable.groups[0].transcript.text);
      await runtime!.deleteSet(owner, composed.id, {
        expectedRevision: composed.revision,
      });
      await expect(
        runtime!.composeSource(owner, composed.id),
      ).rejects.toMatchObject({ status: 404 });
      await runtime!.updateSet(owner, original.source.detail.id, {
        ...edit(original.source.detail),
        rights: { rightsStatus: "unknown", allowedUses: [] },
      });
      expect((await media!.serve({ actor: owner }, request)).status).toBe(404);
      await db!.user.update({
        where: { id: ownerId },
        data: { disabledMenus: ["english-listening", "english-bank"] },
      });
      await expect(
        runtime!.teacherBank(owner, "bank", {}),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        runtime!.composeSource(owner, original.source.detail.id),
      ).rejects.toMatchObject({ status: 404 });
      expect((await media!.serve({ actor: owner }, request)).status).toBe(404);
      await db!.user.update({
        where: { id: ownerId },
        data: {
          disabledMenus: ["english-listening"],
          approvalStatus: "pending",
        },
      });
      await expect(
        runtime!.teacherBank(owner, "bank", {}),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        runtime!.setDetail(owner, original.source.detail.id),
      ).rejects.toMatchObject({ status: 404 });
      const branch = await db!.branch.create({
        data: {
          name: "자료은행 차단 테스트 학원",
          disabledMenus: ["english-bank", "english-listening"],
        },
      });
      branchIds.push(branch.id);
      await db!.user.update({
        where: { id: ownerId },
        data: {
          approvalStatus: "approved",
          disabledMenus: [],
          branchId: branch.id,
        },
      });
      await expect(
        runtime!.teacherBank(owner, "bank", {}),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        runtime!.setDetail(owner, original.source.detail.id),
      ).rejects.toMatchObject({ status: 404 });
    } finally {
      await db!.user.update({
        where: { id: ownerId },
        data: { disabledMenus: [], approvalStatus: "approved", branchId: null },
      });
      process.env.ENGLISH_LISTENING_TEACHER_IDS = pilotIds;
    }
  }, 120000);
  it.skipIf(!process.env.LISTENING_M4A_TEST_FFMPEG_PATH)(
    "preserves an original M4A and plays only its verified MP3 derivative through same-scope clone and selected PCM",
    async () => {
      const original = await source(70, true, true);
      const prepared = await prepareListeningM4aPlayback({
        sourcePath: fileURLToPath(
          new URL(
            "../fixtures/english-listening/tone-aac.m4a",
            import.meta.url,
          ),
        ),
        ffmpegPath: process.env.LISTENING_M4A_TEST_FFMPEG_PATH!,
      });
      const assetId = randomUUID();
      const request = {
        actor: owner,
        setId: original.source.detail.id,
        expectedSetRevision: original.source.detail.revision,
        assetId,
        bytes: prepared.sourceBytes,
        playbackDerivative: prepared.playbackDerivative,
      };
      await expect(
        registerStorageListeningAsset(
          db!,
          storageApi,
          { ...request, actor: other },
          () => now,
        ),
      ).rejects.toMatchObject({ status: 404 });
      const ready = await registerStorageListeningAsset(
        db!,
        storageApi,
        request,
        () => now,
      );
      if (ready.state !== "ready") throw Error("Verified derivative required");
      expect(ready.originalSha256).toBe(sha(prepared.sourceBytes));
      expect(ready.totalBytes).toBe(prepared.sourceBytes.length);
      const record = await store!.get(assetId);
      expect(record).toMatchObject({
        storageChunks: true,
        originalMimeType: "audio/mp4",
        expectedSha256: sha(prepared.sourceBytes),
      });
      const adapter = new PrismaStorageListeningMediaStore(db!, storageApi),
        stored: Buffer[] = [];
      for (const chunk of record!.chunks)
        for await (const part of adapter.readBlob(chunk.key, {
          start: 0,
          endExclusive: chunk.byteLength,
          maxChunkBytes: 1024,
        }))
          stored.push(Buffer.from(part));
      expect(Buffer.concat(stored)).toEqual(prepared.sourceBytes);
      expect(
        record!.chunks.every((c) =>
          record!.playback!.chunks.every((p) => p.key !== c.key),
        ),
      ).toBe(true);
      const [pg] = await db!.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(*) AS count FROM english_listening_media_blob WHERE "assetId"=${assetId}::uuid`,
      );
      expect(pg.count).toBe(BigInt(0));
      const before = fakeStorage.files.size;
      expect(
        await registerStorageListeningAsset(
          db!,
          storageApi,
          request,
          () => now,
        ),
      ).toEqual(ready);
      expect(fakeStorage.files.size).toBe(before);
      const input = edit(original.source.detail);
      input.groups[0].audio = {
        assetId,
        sha256: ready.sha256,
        durationMs: ready.durationMs,
      };
      const saved = await runtime!.updateSet(owner, request.setId, input),
        snapshot = await runtime!.composeSource(owner, saved.id);
      const expected = Buffer.concat(
        parseMp3(prepared.playbackDerivative.bytes, MAX_DURATION_MS).frames,
      );
      await verifyStorageProxy(saved, expected, "audio/mpeg");
      let whole = await storageRuntime!.composeSet(owner, {
        title: "M4A 원본과 검증된 전체 회차",
        selections: [selection(snapshot)],
      });
      expect(fakeStorage.files.size).toBe(before);
      const copied = await store!.get(whole.document.groups[0].audio!.assetId);
      expect(copied!.expectedSha256).toBe(sha(prepared.sourceBytes));
      expect(copied!.conversion).toEqual(record!.conversion);
      whole = await storageRuntime!.reviewSet(owner, whole.id, {
        expectedRevision: whole.revision,
        kind: "rights",
        basis: "직접 만든 음원 전체 교사 이용",
      });
      await verifyStorageProxy(whole, expected, "audio/mpeg");
      const q = snapshot.detail.document.groups[0].questions[1];
      let subset = await storageRuntime!.composeSet(owner, {
        title: "M4A 문항 선택 재생",
        selections: [selection(snapshot, [q.id])],
      });
      const pieces: Buffer[] = [];
      const decoded = await decodeMp3(
        prepared.playbackDerivative.bytes,
        {
          maxDurationMs: MAX_DURATION_MS,
          maxPlaybackBytes: MAX_PLAYBACK_BYTES,
        },
        async (part) => {
          pieces.push(part);
        },
      );
      const wav = Buffer.concat([decoded.header, ...pieces]),
        plan = planListeningWaveClip(decoded.header, wav.length, [q]);
      subset = await storageRuntime!.reviewSet(owner, subset.id, {
        expectedRevision: subset.revision,
        kind: "rights",
        basis: "직접 만든 음원 문항 선택 교사 이용",
      });
      await verifyStorageProxy(
        subset,
        Buffer.concat([
          plan.header,
          ...plan.ranges.map((r) => wav.subarray(r.start, r.endExclusive)),
        ]),
        "audio/wav",
      );
      expect((await store!.get(assetId))!.expectedSha256).toBe(
        sha(prepared.sourceBytes),
      );
    },
    120000,
  );
  it.skipIf(!process.env.LISTENING_M4A_TEST_FFMPEG_PATH)(
    "rolls back both derivative and original objects on failure without altering any prior assets",
    async () => {
      const original = await source(71, true, true),
        prepared = await prepareListeningM4aPlayback({
          sourcePath: fileURLToPath(
            new URL(
              "../fixtures/english-listening/tone-aac.m4a",
              import.meta.url,
            ),
          ),
          ffmpegPath: process.env.LISTENING_M4A_TEST_FFMPEG_PATH!,
        }),
        assetId = randomUUID();
      const existing = new Map(fakeStorage.files),
        upload = storageApi.uploadChunk.bind(storageApi);
      const fail = vi
        .spyOn(storageApi, "uploadChunk")
        .mockImplementationOnce(upload)
        .mockRejectedValueOnce(Error("Fixture source upload failure"));
      try {
        await expect(
          registerStorageListeningAsset(
            db!,
            storageApi,
            {
              actor: owner,
              setId: original.source.detail.id,
              expectedSetRevision: original.source.detail.revision,
              assetId,
              bytes: prepared.sourceBytes,
              playbackDerivative: prepared.playbackDerivative,
            },
            () => now,
          ),
        ).rejects.toThrow("Fixture source upload failure");
        expect(await store!.get(assetId)).toBeNull();
        expect(fakeStorage.files).toEqual(existing);
        const [row] = await db!.$queryRaw<{ count: bigint }[]>(
          Prisma.sql`SELECT COUNT(*) AS count FROM english_listening_media_storage_blob WHERE "assetId"=${assetId}::uuid`,
        );
        expect(row.count).toBe(BigInt(0));
      } finally {
        fail.mockRestore();
      }
    },
    120000,
  );
  it("splits a large strictly decoded MP3 into <=1MiB private objects, scrubs metadata and composes exact selected audio", async () => {
    const original = await source(50, true, true, true, true);
    const tone = readFileSync(
      new URL("../fixtures/english-listening/tone.mp3", import.meta.url),
    );
    const metadata = Buffer.alloc(32 * 1024 * 1024);
    metadata.write("SECRET_ANSWERS_AND_SCRIPT");
    const huge = Buffer.concat([
      Buffer.from([73, 68, 51, 3, 0, 0, 16, 0, 0, 0]),
      metadata,
      tone,
    ]);
    const ready = await registerStorageListeningAsset(
      db!,
      storageApi,
      {
        actor: owner,
        setId: original.source.detail.id,
        expectedSetRevision: original.source.detail.revision,
        bytes: huge,
      },
      () => now,
    );
    if (ready.state !== "ready") throw new Error("Validated MP3 required");
    const input = edit(original.source.detail);
    input.groups[0].audio = {
      assetId: ready.assetId,
      sha256: ready.sha256,
      durationMs: ready.durationMs,
    };
    const saved = await runtime!.updateSet(
        owner,
        original.source.detail.id,
        input,
      ),
      snapshot = await runtime!.composeSource(owner, saved.id),
      record = await store!.get(ready.assetId);
    expect(record!.storageChunks).toBe(true);
    expect(record!.chunks.length).toBeGreaterThan(32);
    expect(record!.chunks.every((c) => c.byteLength <= 1024 * 1024)).toBe(true);
    const rows = await db!.$queryRaw<{ key: string; ref: { key: string } }[]>(
        Prisma.sql`SELECT key,ref FROM english_listening_media_storage_blob WHERE "assetId"=${ready.assetId}::uuid`,
      ),
      refs = new Map(rows.map((row) => [row.key, row.ref]));
    const playback = Buffer.concat(
      record!.playback!.chunks.map((c) =>
        fakeStorage.files
          .get(refs.get(c.key)!.key)!
          .subarray(c.blobOffset ?? 0, (c.blobOffset ?? 0) + c.byteLength),
      ),
    );
    expect(sha(playback)).toBe(ready.sha256);
    expect(playback.includes(Buffer.from("SECRET_ANSWERS"))).toBe(false);
    await verifyStorageProxy(saved, playback, "audio/mpeg");
    const filesBefore = fakeStorage.files.size;
    let whole = await storageRuntime!.composeSet(owner, {
      title: "큰 Storage 회차",
      selections: [selection(snapshot)],
    });
    expect(fakeStorage.files.size).toBe(filesBefore);
    const wholeAsset = await store!.get(
      whole.document.groups[0].audio!.assetId,
    );
    expect(wholeAsset!.chunks[0].key).not.toBe(record!.chunks[0].key);
    expect(wholeAsset!.setId).toBe(whole.id);
    whole = await storageRuntime!.reviewSet(owner, whole.id, {
      expectedRevision: whole.revision,
      kind: "rights",
      basis: "직접 만든 테스트 음원의 보관·교사 이용 허용",
    });
    await verifyStorageProxy(whole, playback, "audio/mpeg");
    const group = snapshot.detail.document.groups[0],
      question = group.questions[1],
      selected = await storageRuntime!.composeSet(owner, {
        title: "큰 Storage 선택 문항",
        selections: [selection(snapshot, [question.id])],
      }),
      clipAsset = await store!.get(selected.document.groups[0].audio!.assetId);
    expect(clipAsset!.storageChunks).toBe(true);
    const clipRows = await db!.$queryRaw<
        { key: string; ref: { key: string } }[]
      >(
        Prisma.sql`SELECT key,ref FROM english_listening_media_storage_blob WHERE "assetId"=${clipAsset!.assetId}::uuid`,
      ),
      clipRefs = new Map(clipRows.map((row) => [row.key, row.ref]));
    const actual = Buffer.concat(
      clipAsset!.chunks.map((c) =>
        fakeStorage.files.get(clipRefs.get(c.key)!.key)!,
      ),
    );
    const plan = planListeningWaveClip(
        original.wav.subarray(0, 44),
        original.wav.length,
        [question],
      ),
      expected = Buffer.concat([
        plan.header,
        ...plan.ranges.map((r) =>
          original.wav.subarray(r.start, r.endExclusive),
        ),
      ]);
    expect(actual.equals(expected)).toBe(true);
    const reviewed = await storageRuntime!.reviewSet(owner, selected.id, {
      expectedRevision: selected.revision,
      kind: "rights",
      basis: "직접 만든 테스트 문항의 선택·교사 이용 허용",
    });
    await verifyStorageProxy(reviewed, expected, "audio/wav");
  }, 120000);
  it("splits a >32MiB selected PCM exam into <=1MiB private objects with exact selected samples", async () => {
    const original = await source(60, true, true, true, true),
      samples = 48000 * 360;
    const header = waveHeader(samples, 48000, 1),
      wav = Buffer.alloc(44 + samples * 2);
    header.copy(wav);
    for (let offset = 44; offset < wav.length; offset += 2)
      wav.writeInt16LE(((offset / 2) % 64000) - 32000, offset);
    const assetId = randomUUID(),
      ref = await storageApi.upload({
        ownerId,
        assetId,
        bytes: wav.length,
        mimeType: "audio/wav",
        read: async function* () {
          for (let i = 0; i < wav.length; i += 1024 * 1024)
            yield wav.subarray(i, i + 1024 * 1024);
        },
      });
    const record = storageReadyRecord({
      assetId,
      setId: original.source.detail.id,
      ownerId,
      branchId: null,
      storage: ref,
      mimeType: "audio/wav",
      sha256: sha(wav),
      durationMs: 360000,
      now: now.getTime(),
    });
    await db!.$transaction(async (tx) => {
      await tx.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`listening-media:${ownerId}`},0))`,
      );
      await insertStorageAsset(tx, record);
    });
    const input = edit(original.source.detail);
    input.groups[0].audio = { assetId, sha256: sha(wav), durationMs: 360000 };
    input.groups[0].questions = input.groups[0].questions.map((q, i) => ({
      ...q,
      audioRange: i
        ? { startMs: 1000, endMs: 360000 }
        : { startMs: 0, endMs: 1000 },
      evidence: [],
    }));
    const saved = await runtime!.updateSet(
        owner,
        original.source.detail.id,
        input,
      ),
      snapshot = await runtime!.composeSource(owner, saved.id),
      question = snapshot.detail.document.groups[0].questions[1];
    const composed = await storageRuntime!.composeSet(owner, {
        title: "큰 PCM 선택 문항",
        selections: [selection(snapshot, [question.id])],
      }),
      output = await store!.get(composed.document.groups[0].audio!.assetId);
    expect(output!.storageChunks).toBe(true);
    expect(output!.playback!.totalBytes).toBeGreaterThan(32 * 1024 * 1024);
    const rows = await db!.$queryRaw<{ key: string; ref: { key: string } }[]>(
        Prisma.sql`SELECT key,ref FROM english_listening_media_storage_blob WHERE "assetId"=${output!.assetId}::uuid`,
      ),
      refs = new Map(rows.map((row) => [row.key, row.ref]));
    const actualHash = createHash("sha256");
    for (const chunk of output!.chunks) {
      const bytes = fakeStorage.files.get(refs.get(chunk.key)!.key)!;
      expect(bytes.length).toBeLessThanOrEqual(1024 * 1024);
      actualHash.update(bytes);
    }
    const plan = planListeningWaveClip(header, wav.length, [question]),
      expectedHash = createHash("sha256").update(plan.header);
    for (const range of plan.ranges)
      expectedHash.update(wav.subarray(range.start, range.endExclusive));
    expect(actualHash.digest("hex")).toBe(expectedHash.digest("hex"));
    expect(composed.document.groups[0].audio!.durationMs).toBe(359000);
    const reviewed = await storageRuntime!.reviewSet(owner, composed.id, {
      expectedRevision: composed.revision,
      kind: "rights",
      basis: "직접 만든 큰 PCM 문항의 선택·교사 이용 허용",
    });
    const expected = Buffer.concat([
      plan.header,
      ...plan.ranges.map((range) =>
        wav.subarray(range.start, range.endExclusive),
      ),
    ]);
    await verifyStorageProxy(reviewed, expected, "audio/wav");
    const cancellations = fakeStorage.cancels;
    const partial = await durableStorageMedia!.serve(
      { actor: owner },
      { setId: reviewed.id, assetId: output!.assetId, method: "GET" },
    );
    const reader = partial.body!.getReader();
    await reader.read();
    await reader.cancel();
    expect(fakeStorage.cancels).toBeGreaterThan(cancellations);
  }, 120000);
  it("stores validated original MP3 in private Supabase Storage, registers idempotently and shares whole audio under fresh scope", async () => {
    const original = await source(30, true, true, true, true),
      from = original.source.detail.document.groups[0],
      asset = await store!.get(from.audio!.assetId);
    const ready = await registerStorageListeningAsset(
      db!,
      storageApi,
      {
        actor: owner,
        setId: original.source.detail.id,
        expectedSetRevision: original.source.detail.revision,
        bytes: original.original,
        assetId: asset!.assetId,
      },
      () => now,
    );
    expect(ready.assetId).toBe(asset!.assetId);
    expect(fakeStorage.files.size).toBe(1);
    const composed = await storageRuntime!.composeSet(owner, {
        title: "Supabase 회차",
        selections: [selection(original.source)],
      }),
      cloned = await store!.get(composed.document.groups[0].audio!.assetId);
    expect(cloned!.storage).toEqual(asset!.storage);
    expect(cloned!.setId).toBe(composed.id);
    expect(fakeStorage.files.size).toBe(1);
    const [row] = await db!.$queryRaw<{ count: bigint; bytes: bigint }[]>(
      Prisma.sql`SELECT (SELECT COUNT(*) FROM english_listening_media_blob WHERE "assetId" IN(SELECT "assetId" FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid)) AS count,(SELECT SUM("reservedBytes") FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid) AS bytes`,
    );
    expect(row).toEqual({ count: BigInt(0), bytes: BigInt(0) });
  });
  it("clips reordered Supabase MP3 or legacy PG PCM to Storage while preserving exact samples and resetting reviews", async () => {
    for (const external of [true, false]) {
      const original = await source(
          external ? 31 : 32,
          true,
          external,
          external,
          external,
        ),
        group = original.source.detail.document.groups[0],
        questions = [...group.questions].reverse();
      const composed = await storageRuntime!.composeSet(owner, {
          title: "Supabase 선택 문항",
          selections: [
            selection(
              original.source,
              questions.map((q) => q.id),
            ),
          ],
        }),
        record = await store!.get(composed.document.groups[0].audio!.assetId),
        output = fakeStorage.files.get(record!.storage!.key)!;
      const plan = planListeningWaveClip(
        original.wav.subarray(0, 44),
        original.wav.length,
        questions,
      );
      expect(output).toEqual(
        Buffer.concat([
          plan.header,
          ...plan.ranges.map((r) =>
            original.wav.subarray(r.start, r.endExclusive),
          ),
        ]),
      );
      expect(record!.chunks).toEqual([]);
      expect(composed.document.groups[0].reviews).toEqual({
        audio: null,
        alignment: null,
        content: null,
      });
      const [row] = await db!.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(*) AS count FROM english_listening_media_blob WHERE "assetId"=${record!.assetId}::uuid`,
      );
      expect(row.count).toBe(BigInt(0));
    }
  });
  it("registers strictly validated private Drive audio idempotently without bytea rows and clones fresh set scope", async () => {
    const original = await source(10, true, true, true),
      from = original.source.detail.document.groups[0];
    const asset = await store!.get(from.audio!.assetId);
    const repeated = await registerDriveListeningAsset(
      db!,
      driveApi,
      {
        actor: owner,
        setId: original.source.detail.id,
        expectedSetRevision: original.source.detail.revision,
        fileId: asset!.drive!.fileId,
        bytes: original.original,
        assetId: asset!.assetId,
      },
      () => now,
    );
    expect(repeated.assetId).toBe(asset!.assetId);
    const composed = await driveRuntime!.composeSet(owner, {
      title: "Drive 원본 회차",
      selections: [selection(original.source)],
    });
    const cloned = await store!.get(composed.document.groups[0].audio!.assetId);
    expect(cloned!.setId).toBe(composed.id);
    expect(cloned!.assetId).not.toBe(asset!.assetId);
    expect(cloned!.drive).toEqual(asset!.drive);
    const [inventory] = await db!.$queryRaw<{ count: bigint; bytes: bigint }[]>(
      Prisma.sql`SELECT (SELECT COUNT(*) FROM english_listening_media_blob WHERE "assetId" IN (SELECT "assetId" FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid)) AS count,(SELECT SUM("reservedBytes") FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid) AS bytes`,
    );
    expect(inventory).toEqual({ count: BigInt(0), bytes: BigInt(0) });
    expect(composed.document.rightsReview).toBeNull();
    expect(composed.document.groups[0].reviews.audio).toBeNull();
  });
  it("reorders Drive MP3 ranges into sample-exact private PCM with no database binary", async () => {
    const original = await source(11, true, true, true),
      group = original.source.detail.document.groups[0],
      questions = [...group.questions].reverse();
    const composed = await driveRuntime!.composeSet(owner, {
      title: "Drive 순서 바꿈",
      selections: [
        selection(
          original.source,
          questions.map((q) => q.id),
        ),
      ],
    });
    const asset = await store!.get(composed.document.groups[0].audio!.assetId),
      output = fakeDrive.files.get(asset!.drive!.fileId)!.bytes;
    const plan = planListeningWaveClip(
      original.wav.subarray(0, 44),
      original.wav.length,
      questions,
    );
    expect(output).toEqual(
      Buffer.concat([
        plan.header,
        ...plan.ranges.map((r) =>
          original.wav.subarray(r.start, r.endExclusive),
        ),
      ]),
    );
    const [row] = await db!.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`SELECT COUNT(*) AS count FROM english_listening_media_blob WHERE "assetId" IN (SELECT "assetId" FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid)`,
    );
    expect(row.count).toBe(BigInt(0));
    expect(composed.document.groups[0].questions[0].audioRange).toEqual({
      startMs: 0,
      endMs: 500,
    });
    const count = fakeDrive.calls.length;
    await expect(
      registerDriveListeningAsset(db!, driveApi, {
        actor: other,
        setId: original.source.detail.id,
        expectedSetRevision: original.source.detail.revision,
        fileId: asset!.drive!.fileId,
        bytes: original.original,
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(fakeDrive.calls).toHaveLength(count);
  });
  it.each(["drive", "storage"] as const)(
    "removes only a newly uploaded %s clip when oversized composition rolls back SQL",
    async (backend) => {
      const originals: ListeningComposeSource[] = [];
      const image = documentBudgetImage();
      for (const [marker, external] of [
        [21, true],
        [22, false],
      ] as const) {
        const original = await source(
            marker,
            true,
            external,
            external,
            backend === "storage",
          ),
          input = edit(original.source.detail),
          question = input.groups[0].questions[0];
        input.groups[0].questions = Array.from({ length: 10 }, (_, index) => {
          const ids = new Map(
            question.choices.map((c) => [c.id, randomUUID()]),
          );
          return {
            ...question,
            id: randomUUID(),
            image,
            sourceNumber: index + 1,
            ...(external
              ? {
                  audioRange: {
                    startMs: index * 100,
                    endMs: (index + 1) * 100,
                  },
                  evidence: [],
                }
              : {}),
            choices: question.choices.map((c) => ({
              ...c,
              id: ids.get(c.id)!,
            })),
            answerChoiceId: ids.get(question.answerChoiceId!)!,
          };
        });
        const saved = await runtime!.updateSet(
          owner,
          original.source.detail.id,
          input,
        );
        expect(Buffer.byteLength(JSON.stringify(saved.document))).toBeLessThan(
          LISTENING_MAX_DOCUMENT_BYTES,
        );
        originals.push(await runtime!.composeSource(owner, saved.id));
      }
      const originalAsset = await store!.get(
          originals[0].detail.document.groups[0].audio!.assetId,
        ),
        before = await runtime!.teacherList(owner, "sets");
      await expect(
        (backend === "storage" ? storageRuntime! : driveRuntime!).composeSet(
          owner,
          {
            title: "Drive 복합 그림 한도",
            selections: [
              selection(
                originals[0],
                [...originals[0].detail.document.groups[0].questions]
                  .reverse()
                  .map((q) => q.id),
              ),
              selection(originals[1]),
            ],
          },
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(await runtime!.teacherList(owner, "sets")).toHaveLength(
        before.length,
      );
      if (backend === "storage") {
        expect(fakeStorage.files.has(originalAsset!.storage!.key)).toBe(true);
        expect(fakeStorage.files.size).toBe(1);
      } else {
        expect(
          fakeDrive.files.get(originalAsset!.drive!.fileId)!.trashed,
        ).not.toBe(true);
        const derivatives = [...fakeDrive.files.entries()].filter(([id]) =>
          id.startsWith("derivative_"),
        );
        expect(derivatives).toHaveLength(1);
        expect(derivatives[0][1].trashed).toBe(true);
      }
      const [inventory] = await db!.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(*) AS count FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid`,
      );
      expect(inventory.count).toBe(BigInt(2));
    },
  );
  afterAll(async () => {
    await db?.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
    await db?.$disconnect();
  });
  it("clones compressed archives once per unique original blob, preserving MPEG identity and scope", async () => {
    const original = await source(8, true, true);
    const originalAudio = original.source.detail.document.groups[0].audio!;
    const before = (await store!.get(originalAudio.assetId))!;
    expect(before.playback!.mimeType).toBe("audio/mpeg");
    const composed = await runtime!.composeSet(owner, {
      title: "보관 MP3 전체 회차",
      selections: [selection(original.source)],
    });
    const audio = composed.document.groups[0].audio!;
    const copied = (await store!.get(audio.assetId))!;
    expect(copied.playback!.mimeType).toBe("audio/mpeg");
    expect(copied.playback!.sha256).toBe(before.playback!.sha256);
    const blobs = await db!.$queryRaw<{ count: bigint; bytes: bigint }[]>(
      Prisma.sql`SELECT COUNT(*)::bigint AS count,SUM("byteLength")::bigint AS bytes FROM english_listening_media_blob WHERE "assetId"=${audio.assetId}::uuid`,
    );
    expect(Number(blobs[0].count)).toBe(before.chunks.length);
    expect(Number(blobs[0].bytes)).toBe(original.original.length);
    expect(
      copied.chunks.every((chunk) =>
        before.chunks.every((old) => old.key !== chunk.key),
      ),
    ).toBe(true);
    const reviewed = await runtime!.reviewSet(owner, composed.id, {
      expectedRevision: composed.revision,
      kind: "rights",
      basis: "직접 만든 보관 음원의 교사 이용",
    });
    const response = await media!.serve(
      { actor: owner },
      { setId: reviewed.id, assetId: audio.assetId, method: "GET" },
    );
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      Buffer.concat(parseMp3(original.original, MAX_DURATION_MS).frames),
    );
    expect(await store!.get(originalAudio.assetId)).toEqual(before);
  });
  it("decodes an archive on demand and clips reordered questions to sample-exact canonical PCM", async () => {
    const original = await source(9, true, true);
    const questions = [
      ...original.source.detail.document.groups[0].questions,
    ].reverse();
    const expected = planListeningWaveClip(
      original.wav.subarray(0, 44),
      original.wav.length,
      questions,
    );
    let composed = await runtime!.composeSet(owner, {
      title: "보관 MP3 문항 순서 편집",
      selections: [
        selection(
          original.source,
          questions.map((question) => question.id),
        ),
      ],
    });
    composed = await runtime!.reviewSet(owner, composed.id, {
      expectedRevision: composed.revision,
      kind: "rights",
      basis: "직접 만든 보관 음원의 편집·교사 이용",
    });
    const group = composed.document.groups[0];
    const response = await media!.serve(
      { actor: owner },
      { setId: composed.id, assetId: group.audio!.assetId, method: "GET" },
    );
    expect(response.headers.get("content-type")).toBe("audio/wav");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      Buffer.concat([
        expected.header,
        ...expected.ranges.map((range) =>
          original.wav.subarray(range.start, range.endExclusive),
        ),
      ]),
    );
    expect(group.reviews).toEqual({
      content: null,
      audio: null,
      alignment: null,
    });
    expect(group.questions.map((question) => question.audioRange)).toEqual(
      questions.map((question) =>
        expected.audioRangeByQuestionId.get(question.id),
      ),
    );
  });
  it("copies a full round with fresh IDs and set-owned sealed bytes while originals stay unchanged", async () => {
    const original = await source();
    const composed = await runtime!.composeSet(owner, {
      title: "전체 회차",
      selections: [selection(original.source)],
    });
    const from = original.source.detail.document.groups[0],
      to = composed.document.groups[0];
    expect(composed.document.rightsReview).toBeNull();
    expect(to.reviews).toEqual({ content: null, audio: null, alignment: null });
    expect(to.id).not.toBe(from.id);
    expect(to.audio!.assetId).not.toBe(from.audio!.assetId);
    expect(to.questions[0].id).not.toBe(from.questions[0].id);
    expect(to.questions[0].answerChoiceId).toBe(to.questions[0].choices[0].id);
    expect(to.audio!.sha256).toBe(from.audio!.sha256);
    const record = await store!.get(to.audio!.assetId);
    expect(record!.setId).toBe(composed.id);
    expect(record!.completion!.setId).toBe(composed.id);
    expect(record!.chunks[0].key).not.toBe(
      (await store!.get(from.audio!.assetId))!.chunks[0].key,
    );
    expect(
      (await runtime!.composeSource(owner, original.source.detail.id))
        .documentHash,
    ).toBe(original.source.documentHash);
  });
  it("clips only the selected question PCM and remaps timing to its fresh audio", async () => {
    const original = await source(1);
    const question = original.source.detail.document.groups[0].questions[1];
    const composed = await runtime!.composeSet(owner, {
      title: "두 번째 문항",
      selections: [selection(original.source, [question.id])],
    });
    const group = composed.document.groups[0];
    expect(group.audio!.durationMs).toBe(7000);
    expect(group.audio!.sha256).not.toBe(
      original.source.detail.document.groups[0].audio!.sha256,
    );
    expect(group.questions[0].evidence).toEqual([
      { startMs: 1000, endMs: 6000 },
    ]);
    expect(group.questions[0].audioRange).toEqual({ startMs: 0, endMs: 7000 });
    const record = await store!.get(group.audio!.assetId);
    const blobs = await db!.$queryRaw<{ bytes: Uint8Array }[]>(
      Prisma.sql`SELECT bytes FROM english_listening_media_blob WHERE "assetId"=${group.audio!.assetId}::uuid`,
    );
    const output = Buffer.concat(blobs.map((row) => Buffer.from(row.bytes)));
    expect(output.subarray(44)).toEqual(original.wav.subarray(44 + 8000 * 16));
    expect(sha(output)).toBe(record!.playback!.sha256);
  });
  it("rolls back the draft before PG clone or clip binary writes when actual database disk ceiling is reached", async () => {
    const original = await source(40),
      before = await runtime!.teacherList(owner, "sets"),
      previous = process.env.ENGLISH_LISTENING_DATABASE_MAX_BYTES;
    const [row] = await db!.$queryRaw<{ bytes: bigint }[]>(
      Prisma.sql`SELECT pg_database_size(current_database())::bigint AS bytes`,
    );
    process.env.ENGLISH_LISTENING_DATABASE_MAX_BYTES = String(row.bytes);
    try {
      for (const ids of [
        undefined,
        [original.source.detail.document.groups[0].questions[0].id],
      ])
        await expect(
          runtime!.composeSet(owner, {
            title: "DB 공간 한도",
            selections: [selection(original.source, ids)],
          }),
        ).rejects.toMatchObject({ code: "quota_exceeded" });
      expect(await runtime!.teacherList(owner, "sets")).toHaveLength(
        before.length,
      );
      const [inventory] = await db!.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(*) AS count FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid`,
      );
      expect(inventory.count).toBe(BigInt(1));
    } finally {
      if (previous === undefined)
        delete process.env.ENGLISH_LISTENING_DATABASE_MAX_BYTES;
      else process.env.ENGLISH_LISTENING_DATABASE_MAX_BYTES = previous;
    }
  });
  it("refuses missing full-question ranges and does not leave partial sets or assets", async () => {
    const original = await source(2, false);
    const before = await runtime!.teacherList(owner, "sets");
    await expect(
      runtime!.composeSet(owner, {
        title: "구간 없음",
        selections: [
          selection(original.source, [
            original.source.detail.document.groups[0].questions[0].id,
          ]),
        ],
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(await runtime!.teacherList(owner, "sets")).toHaveLength(
      before.length,
    );
  });
  it.each(["national_listening", "mock_exam"] as const)(
    "rejects retired %s source imports before creating sets or assets",
    async (kind) => {
      const before = await runtime!.teacherList(owner, "sets");
      await expect(
        source(51, false, false, false, false, kind),
      ).rejects.toMatchObject({ status: 404 });
      expect(await runtime!.teacherList(owner, "sets")).toHaveLength(
        before.length,
      );
    },
  );

  it.each([
    { assessmentKind: "national_listening" as const, sourceRecordId: null },
    { assessmentKind: "mock_exam" as const, sourceRecordId: null },
    { assessmentKind: null, sourceRecordId: "ebs-middle-1-2026-1" },
    { assessmentKind: null, sourceRecordId: "ebsi-high-1-2022-2" },
  ])(
    "rejects tainted question provenance $assessmentKind/$sourceRecordId when source is absent",
    async (metadata) => {
      const original = await source(52, true, false, true, true);
      const originalDocument = structuredClone(original.source.detail.document);
      const input = structuredClone(edit(original.source.detail));
      input.groups[0].questions[1] = {
        ...input.groups[0].questions[1],
        image: documentBudgetImage(),
        metadata: { ...input.groups[0].questions[1].metadata!, ...metadata },
      };
      await expect(
        runtime!.updateSet(owner, original.source.detail.id, input),
      ).rejects.toMatchObject({ status: 404 });
      expect(
        (await runtime!.setDetail(owner, original.source.detail.id)).document,
      ).toEqual(originalDocument);
    },
  );

  it("denies a historical mixed assembled set even when only own questions are selected", async () => {
    const custom = await source(54, true, false, true, true);
    const saved = custom.source;
    const tainted = structuredClone(saved.detail.document);
    tainted.provenance.kind = "assembled";
    tainted.groups[0].questions[0].metadata = {
      ...tainted.groups[0].questions[0].metadata!,
      assessmentKind: "mock_exam",
    };
    await db!.$executeRaw(
      Prisma.sql`UPDATE english_listening_set SET document=${JSON.stringify(tainted)}::jsonb WHERE id=${saved.detail.id}::uuid`,
    );
    await expect(
      storageRuntime!.composeSet(owner, {
        title: "자체 제작 문항 선택",
        selections: [selection(saved, [tainted.groups[0].questions[1].id])],
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      runtime!.composeSource(owner, saved.detail.id),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("selects only requested questions while retaining the original private Storage audio when whole_source is explicit", async () => {
    const original = await source(44, false, true, true, true);
    const sourceGroup = original.source.detail.document.groups[0];
    const originalRecord = (await store!.get(sourceGroup.audio!.assetId))!;
    const composed = await storageRuntime!.composeSet(owner, {
      title: "선택 문항과 전체 회차 음원",
      selections: [
        {
          ...selection(original.source, [sourceGroup.questions[1].id]),
          audioMode: "whole_source",
        },
      ],
    });
    const group = composed.document.groups[0];
    expect(group.questions).toHaveLength(1);
    expect(group.questions[0].prompt).toBe(sourceGroup.questions[1].prompt);
    expect(group.questions[0].metadata).toEqual(
      sourceGroup.questions[1].metadata,
    );
    expect(group.questions[0].audioRange).toBeUndefined();
    expect(group.audio!.assetId).not.toBe(sourceGroup.audio!.assetId);
    expect(group.audio!.sha256).toBe(sourceGroup.audio!.sha256);
    expect(group.audio!.durationMs).toBe(sourceGroup.audio!.durationMs);
    expect(composed.document.provenance.basis).toContain("전체 음원 포함");
    expect((await store!.get(group.audio!.assetId))!.playback!.sha256).toBe(
      originalRecord.playback!.sha256,
    );
    const [inventory] = await db!.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`SELECT COUNT(*)::bigint AS count FROM english_listening_media_blob WHERE "assetId"=${group.audio!.assetId}::uuid`,
    );
    expect(inventory.count).toBe(BigInt(0));
    const reviewed = await storageRuntime!.reviewSet(owner, composed.id, {
      expectedRevision: composed.revision,
      kind: "rights",
      basis: "테스트 원본 교사 이용 허용",
    });
    const span = originalRecord.storage!;
    await verifyStorageProxy(
      reviewed,
      original.original.subarray(span.start, span.endExclusive),
      "audio/mpeg",
    );
    await expect(
      storageRuntime!.composeSet(other, {
        title: "다른 교사의 원본",
        selections: [
          {
            ...selection(original.source, [sourceGroup.questions[1].id]),
            audioMode: "whole_source",
          },
        ],
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("checks current owner and branch scope, exact revisions/hash and selected question identity", async () => {
    const original = await source(3);
    const input = {
      title: "권한 확인",
      selections: [selection(original.source)],
    };
    await expect(runtime!.composeSet(other, input)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      runtime!.composeSet(owner, {
        ...input,
        selections: [{ ...input.selections[0], expectedRevision: 1 }],
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      runtime!.composeSet(owner, {
        ...input,
        selections: [{ ...input.selections[0], documentHash: "0".repeat(64) }],
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      runtime!.composeSet(owner, {
        ...input,
        selections: [{ ...input.selections[0], questionIds: [randomUUID()] }],
      }),
    ).rejects.toMatchObject({ status: 409 });
    const branch = await db!.branch.create({
      data: { name: "다른 듣기 지점" },
    });
    branchIds.push(branch.id);
    await db!.$executeRaw(
      Prisma.sql`UPDATE english_listening_set SET branch_id=${branch.id}::uuid,document=jsonb_set(document,'{branchId}',to_jsonb(${branch.id}::text)) WHERE id=${original.source.detail.id}::uuid`,
    );
    await expect(runtime!.composeSet(owner, input)).rejects.toMatchObject({
      status: 404,
    });
  });
  it("requires a new explicit rights review before draft printing and playback", async () => {
    const original = await source(4);
    let composed = await runtime!.composeSet(owner, {
      title: "인쇄",
      selections: [selection(original.source)],
    });
    const print = (set: ListeningSetDetail, view: "student" | "teacher") =>
      db!.$transaction(async (tx) =>
        printableDraft(
          tx,
          await teacher(tx, owner),
          set.id,
          set.revision,
          view,
        ),
      );
    await expect(print(composed, "student")).rejects.toMatchObject({
      status: 404,
    });
    composed = await runtime!.reviewSet(owner, composed.id, {
      expectedRevision: composed.revision,
      kind: "rights",
      basis: "선택 자료의 출력·교사 이용 허용 확인",
    });
    expect((await print(composed, "student")).id).toBe(composed.id);
    expect((await print(composed, "teacher")).id).toBe(composed.id);
    const stale = { ...composed, revision: composed.revision - 1 };
    await expect(print(stale, "student")).rejects.toMatchObject({
      status: 409,
    });
  });
  it("rolls back all cloned sets, sealed assets and blobs when two valid image rounds exceed the document budget", async () => {
    const image = documentBudgetImage();
    const originals: ListeningComposeSource[] = [];
    for (const marker of [5, 6]) {
      const original = await source(marker);
      const input = edit(original.source.detail);
      const group = input.groups[0];
      const question = group.questions[0];
      group.questions = Array.from({ length: 10 }, (_, index) => {
        const ids = new Map(
          question.choices.map((choice) => [choice.id, randomUUID()]),
        );
        return {
          ...question,
          id: randomUUID(),
          sourceNumber: index + 1,
          image,
          choices: question.choices.map((choice) => ({
            ...choice,
            id: ids.get(choice.id)!,
          })),
          answerChoiceId: ids.get(question.answerChoiceId!)!,
        };
      });
      const saved = await runtime!.updateSet(
        owner,
        original.source.detail.id,
        input,
      );
      const size = Buffer.byteLength(JSON.stringify(saved.document), "utf8");
      expect(size).toBeGreaterThan(2 * 1024 * 1024);
      expect(size).toBeLessThan(LISTENING_MAX_DOCUMENT_BYTES);
      originals.push(await runtime!.composeSource(owner, saved.id));
    }
    expect(
      originals.reduce(
        (total, original) =>
          total +
          Buffer.byteLength(JSON.stringify(original.detail.document), "utf8"),
        0,
      ),
    ).toBeGreaterThan(LISTENING_MAX_DOCUMENT_BYTES);
    const inventory = async () => {
      const [row] = await db!.$queryRaw<
        {
          sets: bigint;
          assets: bigint;
          blobs: bigint;
          audits: bigint;
          bytes: bigint;
        }[]
      >(Prisma.sql`
        SELECT (SELECT count(*) FROM english_listening_set WHERE owner_id=${ownerId}::uuid) AS sets,
        (SELECT count(*) FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid) AS assets,
        (SELECT count(*) FROM english_listening_media_blob WHERE "assetId" IN (SELECT "assetId" FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid)) AS blobs,
        (SELECT count(*) FROM english_listening_audit WHERE actor_id=${ownerId}::uuid) AS audits,
        (SELECT COALESCE(sum("reservedBytes"),0)::bigint FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid) AS bytes`);
      return row;
    };
    const before = await inventory();
    expect(before.sets).toBe(BigInt(2));
    expect(before.assets).toBe(BigInt(2));
    await expect(
      runtime!.composeSet(owner, {
        title: "문서 한도 초과 시험지",
        selections: originals.map((original) => selection(original)),
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message:
        "시험지의 문항 그림이 너무 많습니다. 시험지를 나눠 만들어 주세요.",
    });
    expect(await inventory()).toEqual(before);
    for (const original of originals)
      expect(
        (await runtime!.composeSource(owner, original.detail.id)).documentHash,
      ).toBe(original.documentHash);
  });
});
