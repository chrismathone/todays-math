// @vitest-environment node
/** Explicit fresh loopback PostgreSQL only. No operating database or Storage fallback. */
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
import { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { createListeningRuntime } from "@/lib/english/listening/runtime/service";
import { createListeningMediaService } from "@/lib/english/listening/media/service";
import { PrismaListeningMediaStore } from "@/lib/english/listening/media/prismaStore";
import { createListeningMediaAccess } from "@/lib/english/listening/runtime/mediaAccess";
import {
  json,
  lock,
  type ListeningActor,
} from "@/lib/english/listening/runtime/database";
import { listeningUpdateSetSchema } from "@/contracts/englishListeningHttp.contract";
import { publishListeningWithVerifiedMedia } from "@/lib/english/listening/verifiedPublication";
import {
  nativeArtifacts,
  nativeSha,
  nativeSourceId,
} from "../fixtures/english-listening/nativeStage";
import {
  adoptNativeListeningQuestions,
  loadNativeQuestionStage,
} from "../../../scripts/import/adopt-native-listening-questions.mts";

const url = process.env.LISTENING_TEST_DATABASE_URL;
if (
  url &&
  (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname) ||
    !/^\/listening_(test|runtime)/.test(new URL(url).pathname))
)
  throw Error("Refusing non-isolated native adoption database");
const db = url ? new PrismaClient({ datasourceUrl: url }) : null;
const initialTeacherIds = process.env.ENGLISH_LISTENING_TEACHER_IDS;
const users: string[] = [],
  roots: string[] = [];
async function* body(value: Uint8Array) {
  yield value;
}
async function fixture(register = true) {
  const root = await mkdtemp(resolve(tmpdir(), "listening-native-db-"));
  roots.push(root);
  const f = await nativeArtifacts(root);
  const ownerId = randomUUID();
  users.push(ownerId);
  await db!.user.create({
    data: {
      id: ownerId,
      email: ownerId + "@native.listening.test",
      name: "자체 작성 자료 검사",
      approvalStatus: "approved",
      disabledMenus: ["english-listening"],
    },
  });
  const actor: ListeningActor = { kind: "teacher", userId: ownerId };
  const runtime = createListeningRuntime(db!),
    store = new PrismaListeningMediaStore(db!);
  const media = createListeningMediaService({
    store,
    ...createListeningMediaAccess(db!),
  });
  const loaded = await loadNativeQuestionStage(root, nativeSourceId);
  if (!register)
    return {
      ...f,
      root,
      ownerId,
      actor,
      runtime,
      store,
      media,
      loaded,
      detail: null,
    };
  let detail = await runtime.createSet(actor, f.original.createInput);
  detail = await runtime.reviewSet(actor, detail.id, {
    expectedRevision: detail.revision,
    kind: "rights",
    basis: "직접 작성한 테스트 문항·음원 보관 및 인쇄",
  });
  const begun = await media.beginUpload(
    { actor },
    {
      setId: detail.id,
      mimeType: "audio/wav",
      totalBytes: f.audio.length,
      expectedSha256: nativeSha(f.audio),
    },
  );
  const appended = await media.appendChunk(
    { actor },
    {
      setId: detail.id,
      assetId: begun.assetId,
      expectedRevision: begun.revision,
      offset: 0,
      byteLength: f.audio.length,
      sha256: nativeSha(f.audio),
    },
    body(f.audio),
  );
  const ready = await media.completeUpload(
    { actor },
    {
      setId: detail.id,
      assetId: begun.assetId,
      expectedRevision: appended.revision,
    },
  );
  if (ready.state !== "ready") throw Error("Real verified wave required");
  detail = await runtime.updateSet(actor, detail.id, {
    ...f.original.editableInput,
    groups: f.original.editableInput.groups.map((group) => ({
      ...group,
      audio: {
        assetId: ready.assetId,
        sha256: ready.sha256,
        durationMs: ready.durationMs,
      },
    })),
    rights: detail.document.rights,
    basis: detail.document.provenance.basis,
    expectedRevision: detail.revision,
  });
  return { ...f, root, ownerId, actor, runtime, store, media, loaded, detail };
}
afterEach(async () => {
  if (initialTeacherIds === undefined)
    delete process.env.ENGLISH_LISTENING_TEACHER_IDS;
  else process.env.ENGLISH_LISTENING_TEACHER_IDS = initialTeacherIds;
  if (db && users.length)
    await db.$transaction(async (tx) => {
      await tx.$executeRaw(
        Prisma.sql`DELETE FROM english_listening_publication WHERE set_id IN(SELECT id FROM english_listening_set WHERE owner_id::text IN(${Prisma.join(users)}))`,
      );
      await tx.$executeRaw(
        Prisma.sql`DELETE FROM english_listening_media_blob WHERE "assetId" IN(SELECT "assetId" FROM english_listening_media_asset WHERE "ownerId"::text IN(${Prisma.join(users)}))`,
      );
      await tx.$executeRaw(
        Prisma.sql`DELETE FROM english_listening_media_asset WHERE "ownerId"::text IN(${Prisma.join(users)})`,
      );
      await tx.$executeRaw(
        Prisma.sql`DELETE FROM english_listening_audit WHERE actor_id::text IN(${Prisma.join(users)})`,
      );
      await tx.$executeRaw(
        Prisma.sql`DELETE FROM english_listening_set WHERE owner_id::text IN(${Prisma.join(users)})`,
      );
      await tx.user.deleteMany({ where: { id: { in: users } } });
      users.splice(0);
    });
  for (const root of roots.splice(0)) {
    if (dirname(resolve(root)) !== resolve(tmpdir()))
      throw Error("Unexpected cleanup path");
    await rm(root, { recursive: true, force: true });
  }
});
afterAll(async () => {
  await db?.$disconnect();
});

describe.skipIf(!db)("native question adoption (isolated PostgreSQL)", () => {
  it("has no read-only writes, adopts once and preserves immutable assets, identities, metadata and answer references", async () => {
    const f = await fixture();
    const original = f.detail!;
    const assetId = original.document.groups[0].audio!.assetId;
    const record = await f.store.get(assetId);
    const [inventory] = await db!.$queryRaw<
      { assets: bigint; blobs: bigint; audits: bigint }[]
    >(
      Prisma.sql`SELECT (SELECT count(*) FROM english_listening_media_asset WHERE "ownerId"=${f.ownerId}::uuid) AS assets,(SELECT count(*) FROM english_listening_media_blob WHERE "assetId"=${assetId}::uuid) AS blobs,(SELECT count(*) FROM english_listening_audit WHERE actor_id=${f.ownerId}::uuid) AS audits`,
    );
    expect(
      await adoptNativeListeningQuestions(db!, f.loaded, { actor: f.actor }),
    ).toMatchObject({ status: "read_only", revision: original.revision });
    expect(await f.runtime.setDetail(f.actor, original.id)).toEqual(original);
    const [before] = await db!.$queryRaw<{ audits: bigint }[]>(
      Prisma.sql`SELECT count(*) AS audits FROM english_listening_audit WHERE actor_id=${f.ownerId}::uuid`,
    );
    expect(before.audits).toBe(inventory.audits);
    const result = await adoptNativeListeningQuestions(db!, f.loaded, {
      actor: f.actor,
      apply: true,
    });
    expect(result).toMatchObject({
      status: "applied",
      revision: original.revision + 1,
    });
    const saved = await f.runtime.setDetail(f.actor, original.id);
    expect(saved.document.groups[0].audio).toEqual(
      original.document.groups[0].audio,
    );
    expect(saved.document.rightsReview).toEqual(original.document.rightsReview);
    expect(saved.document.provenance).toEqual(original.document.provenance);
    for (const [i, q] of saved.document.groups[0].questions.entries()) {
      const old = original.document.groups[0].questions[i];
      expect(q.id).toBe(old.id);
      expect(q.answerChoiceId).toBe(old.answerChoiceId);
      expect(q.choices.map((c) => c.id)).toEqual(old.choices.map((c) => c.id));
      expect(q.metadata).toEqual(old.metadata);
      expect(q.image).toBeUndefined();
      expect(q.prompt).toBe(f.stage.questions[i].prompt);
    }
    expect(await f.store.get(assetId)).toEqual(record);
    const [after] = await db!.$queryRaw<
      { assets: bigint; blobs: bigint; audits: bigint; proof: unknown }[]
    >(
      Prisma.sql`SELECT (SELECT count(*) FROM english_listening_media_asset WHERE "ownerId"=${f.ownerId}::uuid) AS assets,(SELECT count(*) FROM english_listening_media_blob WHERE "assetId"=${assetId}::uuid) AS blobs,(SELECT count(*) FROM english_listening_audit WHERE actor_id=${f.ownerId}::uuid) AS audits,(SELECT payload FROM english_listening_audit WHERE resource_id=${original.id}::uuid AND kind='native_questions_adopted') AS proof`,
    );
    expect(after.assets).toBe(inventory.assets);
    expect(after.blobs).toBe(inventory.blobs);
    expect(after.audits).toBe(inventory.audits + BigInt(2));
    expect(after.proof).toMatchObject({
      stageSha256: f.loaded.stageSha256,
      originalPreparedSha256: f.stage.originalPreparedSha256,
      questionCount: 2,
      nativeCount: 2,
    });
    expect(
      await adoptNativeListeningQuestions(db!, f.loaded, {
        actor: f.actor,
        apply: true,
      }),
    ).toMatchObject({ status: "already_native", revision: saved.revision });
    expect((await f.runtime.setDetail(f.actor, original.id)).revision).toBe(
      saved.revision,
    );
  });
  it("reports pending registration without creating a set, and refuses edits and human-reviewed source content", async () => {
    const pending = await fixture(false);
    await expect(
      adoptNativeListeningQuestions(db!, structuredClone(pending.loaded), {
        actor: pending.actor,
        apply: true,
      }),
    ).rejects.toThrow("loaded and verified from archive files");
    expect(
      await adoptNativeListeningQuestions(db!, pending.loaded, {
        actor: pending.actor,
        apply: true,
      }),
    ).toMatchObject({ status: "pending_registration" });
    expect(await pending.runtime.teacherList(pending.actor, "sets")).toEqual(
      [],
    );
    const f = await fixture();
    let detail = f.detail!;
    const input = listeningUpdateSetSchema.parse({
      ...f.original.editableInput,
      groups: detail.document.groups.map(({ reviews, ...group }) => {
        void reviews;
        return group;
      }),
      rights: detail.document.rights,
      basis: detail.document.provenance.basis,
      expectedRevision: detail.revision,
    });
    input.groups[0].questions[0].prompt = "User edited prompt";
    detail = await f.runtime.updateSet(f.actor, detail.id, input);
    await expect(
      adoptNativeListeningQuestions(db!, f.loaded, {
        actor: f.actor,
        apply: true,
      }),
    ).rejects.toThrow("preserve user edits");
    expect(
      (await f.runtime.setDetail(f.actor, detail.id)).document.groups[0]
        .questions[0].prompt,
    ).toBe("User edited prompt");
    detail = await f.runtime.updateSet(f.actor, detail.id, {
      ...input,
      groups: f.original.editableInput.groups.map((g) => ({
        ...g,
        audio: detail.document.groups[0].audio,
      })),
      expectedRevision: detail.revision,
    });
    detail = await f.runtime.reviewSet(f.actor, detail.id, {
      kind: "content",
      groupId: detail.document.groups[0].id,
      expectedRevision: detail.revision,
    });
    await expect(
      adoptNativeListeningQuestions(db!, f.loaded, {
        actor: f.actor,
        apply: true,
      }),
    ).rejects.toThrow("human-reviewed");
    expect((await f.runtime.setDetail(f.actor, detail.id)).revision).toBe(
      detail.revision,
    );
  });
  it("rechecks a publication committed while waiting for the set lock, even when publication does not change its revision", async () => {
    const f = await fixture();
    let detail = f.detail!;
    // The publisher requires the listening grant; bank-only remains insufficient.
    process.env.ENGLISH_LISTENING_TEACHER_IDS = f.ownerId;
    await db!.user.update({
      where: { id: f.ownerId },
      data: { disabledMenus: [] },
    });
    for (const kind of ["content", "audio", "alignment"] as const)
      detail = await f.runtime.reviewSet(f.actor, detail.id, {
        kind,
        groupId: detail.document.groups[0].id,
        expectedRevision: detail.revision,
      });
    const publication = await publishListeningWithVerifiedMedia(
      detail.document,
      { id: randomUUID(), publishedAt: new Date().toISOString() },
      (target) => f.media.getVerifiedReadiness({ actor: f.actor }, target),
    );
    detail = await f.runtime.updateSet(f.actor, detail.id, {
      ...f.original.editableInput,
      groups: f.original.editableInput.groups.map((g) => ({
        ...g,
        audio: detail.document.groups[0].audio,
      })),
      rights: detail.document.rights,
      basis: detail.document.provenance.basis,
      expectedRevision: detail.revision,
    });
    expect(detail.document.groups[0].reviews.content).toBeNull();
    let locked!: () => void, release!: () => void;
    const held = new Promise<void>((r) => {
        locked = r;
      }),
      gate = new Promise<void>((r) => {
        release = r;
      });
    const publishing = db!.$transaction(
      async (tx) => {
        await lock(tx, detail.id);
        locked();
        await gate;
        await tx.$executeRaw(
          Prisma.sql`INSERT INTO english_listening_publication(id,set_id,source_revision,snapshot,created_at) VALUES(${publication.id}::uuid,${detail.id}::uuid,${publication.document.revision},${json(publication)},${new Date()})`,
        );
      },
      { timeout: 30000 },
    );
    await held;
    const adoption = adoptNativeListeningQuestions(db!, f.loaded, {
      actor: f.actor,
      apply: true,
    });
    const denied = expect(adoption).rejects.toThrow(
      "published or human-reviewed",
    );
    try {
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        const [state] = await db!.$queryRaw<{ count: bigint }[]>(
          Prisma.sql`SELECT count(*) AS count FROM pg_locks WHERE locktype='advisory' AND NOT granted`,
        );
        if (state.count > BigInt(0)) {
          waiting = true;
          break;
        }
        await setTimeout(30);
      }
      expect(waiting).toBe(true);
    } finally {
      release();
    }
    await publishing;
    await denied;
    const saved = await f.runtime.setDetail(f.actor, detail.id);
    expect(saved.revision).toBe(detail.revision);
    expect(saved.document.groups[0].questions[0].image).toBeDefined();
    expect(saved.publications).toHaveLength(1);
  }, 60000);
});
