// @vitest-environment node
/** Real PostgreSQL and canonical PCM files; no shared database fallback. */
import { createHash, randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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

vi.mock("server-only", () => ({}));
const url = process.env.LISTENING_TEST_DATABASE_URL;
if (
  url &&
  (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname) ||
    !/^\/listening_(runtime|test)/.test(new URL(url).pathname))
)
  throw new Error("Refusing non-isolated listening database");
const db = url ? new PrismaClient({ datasources: { db: { url } } }) : null;
const now = new Date("2026-10-04T03:00:00Z");
const runtime = db ? createListeningRuntime(db, () => now) : null;
const store = db ? new PrismaListeningMediaStore(db) : null;
const media = db
  ? createListeningMediaService({
      store: store!,
      ...createListeningMediaAccess(db, () => now),
      now: () => now.getTime(),
    })
  : null;
const ownerId = randomUUID(),
  otherId = randomUUID();
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
async function source(marker = 0, timing = true) {
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
  const wav = wave(marker);
  const begun = await media!.beginUpload(
    { actor: owner },
    {
      setId: set.id,
      totalBytes: wav.length,
      mimeType: "audio/wav",
      expectedSha256: sha(wav),
    },
  );
  const appended = await media!.appendChunk(
    { actor: owner },
    {
      setId: set.id,
      assetId: begun.assetId,
      expectedRevision: begun.revision,
      offset: 0,
      byteLength: wav.length,
      sha256: sha(wav),
    },
    bytes(wav),
  );
  const ready = await media!.completeUpload(
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
      ? { audioRange: { startMs: index * 8000, endMs: index ? 15000 : 8000 } }
      : {}),
    evidence: [{ startMs: index ? 9000 : 3000, endMs: index ? 14000 : 7000 }],
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
  return { source: await runtime!.composeSource(owner, set.id), wav };
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
  afterAll(async () => {
    await db?.$disconnect();
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
});
