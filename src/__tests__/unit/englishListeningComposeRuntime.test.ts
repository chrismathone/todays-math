// @vitest-environment node
/** Real PostgreSQL and canonical PCM files; no shared database fallback. */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { deflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
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
import { printableDraft } from "@/lib/english/listening/runtime/compose";
import {
  teacher,
  type ListeningActor,
} from "@/lib/english/listening/runtime/database";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";
import type { ListeningComposeSource } from "@/contracts/englishListeningCompose.contract";
import type { ListeningSetDetail } from "@/contracts/englishListeningHttp.contract";
import {
  LISTENING_MAX_DOCUMENT_BYTES,
  LISTENING_MAX_OWNER_BYTES,
  LISTENING_MAX_OWNER_ASSETS,
} from "@/contracts/englishListeningSource.contract";
import {
  decodeMp3,
  parseMp3,
  MAX_DURATION_MS,
  MAX_PLAYBACK_BYTES,
} from "@/lib/english/listening/media/mp3";
import { planListeningWaveClip } from "@/lib/english/listening/media/clip";

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
const rights = englishListeningFixture().rights;
const sha = (value: Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
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
async function source(marker = 0, timing = true, archive = false) {
  let set = await runtime!.createSet(owner, {
    title: "원본 듣기 " + marker,
    rights,
    basis: "직접 작성한 테스트 문항과 PCM",
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
  const ready = await uploadMedia.completeUpload(
    { actor: owner },
    {
      setId: set.id,
      assetId: begun.assetId,
      expectedRevision: appended.revision,
    },
  );
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
    await db!.$transaction(async (tx) => {
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
  it("honors the 8GiB owner sum and 512 asset limit while individual reservations remain integers", async () => {
    expect(LISTENING_MAX_OWNER_BYTES).toBe(8 * 1024 ** 3);
    expect(LISTENING_MAX_OWNER_ASSETS).toBe(512);
    const original = await source(10, true, true);
    const setId = original.source.detail.id;
    const existing = original.source.detail.document.groups[0].audio!.assetId;
    // Four individually valid integer reservations exercise a sum greater than 2^31.
    await db!.$executeRaw(
      Prisma.sql`UPDATE english_listening_media_asset SET "reservedBytes"=${2 ** 31 - 1} WHERE "assetId"=${existing}::uuid`,
    );
    for (let index = 0; index < 3; index++) {
      const quotaAssetId = randomUUID();
      await db!.$executeRaw(
        Prisma.sql`INSERT INTO english_listening_media_asset("assetId","ownerId","setId",revision,state,"uploadExpiresAt","reservedBytes",record) SELECT ${quotaAssetId}::uuid,"ownerId","setId",0,'uploading',"uploadExpiresAt",${2 ** 31 - 1},(record-'playback'-'completion'-'finalizedFromRevision') || jsonb_build_object('assetId',${quotaAssetId}::text,'state','uploading','revision',0,'receivedBytes',0,'chunks','[]'::jsonb) FROM english_listening_media_asset WHERE "assetId"=${existing}::uuid`,
      );
      if (index === 1) {
        const within = await archiveMedia!.beginUpload(
          { actor: owner },
          {
            setId,
            totalBytes: 1,
            mimeType: "audio/mpeg",
            expectedSha256: "a".repeat(64),
          },
        );
        expect(within.state).toBe("uploading");
        await db!.$executeRaw(
          Prisma.sql`DELETE FROM english_listening_media_asset WHERE "assetId"=${within.assetId}::uuid`,
        );
      }
    }
    await expect(
      archiveMedia!.beginUpload(
        { actor: owner },
        {
          setId,
          totalBytes: 1,
          mimeType: "audio/mpeg",
          expectedSha256: "a".repeat(64),
        },
      ),
    ).rejects.toMatchObject({ code: "quota_exceeded" });
    await db!.$executeRaw(
      Prisma.sql`UPDATE english_listening_media_asset SET "reservedBytes"=1 WHERE "ownerId"=${ownerId}::uuid`,
    );
    const receipt = await archiveMedia!.beginUpload(
      { actor: owner },
      {
        setId,
        totalBytes: 1,
        mimeType: "audio/mpeg",
        expectedSha256: "a".repeat(64),
      },
    );
    expect(receipt.state).toBe("uploading");
    // Generate metadata-only rows in this isolated test DB to exercise the asset boundary.
    await db!.$executeRaw(
      Prisma.sql`WITH copies AS (SELECT gen_random_uuid() AS new_id,s.* FROM english_listening_media_asset s CROSS JOIN generate_series(1,507) WHERE "assetId"=${existing}::uuid) INSERT INTO english_listening_media_asset("assetId","ownerId","setId",revision,state,"uploadExpiresAt","reservedBytes",record) SELECT new_id,"ownerId","setId",0,'uploading',"uploadExpiresAt",0,(record-'playback'-'completion'-'finalizedFromRevision') || jsonb_build_object('assetId',new_id::text,'state','uploading','revision',0,'receivedBytes',0,'chunks','[]'::jsonb) FROM copies`,
    );
    await expect(
      archiveMedia!.beginUpload(
        { actor: owner },
        {
          setId,
          totalBytes: 1,
          mimeType: "audio/mpeg",
          expectedSha256: "a".repeat(64),
        },
      ),
    ).rejects.toMatchObject({ code: "quota_exceeded" });
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
