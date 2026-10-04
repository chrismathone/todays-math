// @vitest-environment node
/** Real disposable PostgreSQL; remote bytes use authenticated in-memory Storage transport. */
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
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
import { createListeningStorageApi } from "@/lib/english/listening/media/storageApi";
import { PrismaStorageListeningMediaStore } from "@/lib/english/listening/media/storageStore";
import { createListeningMediaService } from "@/lib/english/listening/media/service";
import { createListeningMediaAccess } from "@/lib/english/listening/runtime/mediaAccess";
import {
  storageReadyRecord,
  insertStorageAsset,
} from "@/lib/english/listening/runtime/storageAssets";
import { listeningValueHash } from "@/lib/english/listening/publication";
import {
  loadListeningQuestionAudioPlan,
  adoptListeningQuestionAudio,
  type PreparedQuestionAudioPlan,
} from "@/lib/english/listening/runtime/questionAudio";
import {
  LISTENING_STORAGE_OWNER_BYTES,
  LISTENING_STORAGE_OWNER_ASSETS,
} from "@/lib/english/listening/media/storageQuota";
import {
  LISTENING_MAX_OWNER_BYTES,
  LISTENING_MAX_OWNER_ASSETS,
} from "@/contracts/englishListeningSource.contract";
import { questionAudioSha256 as sha } from "@/lib/english/listening/questionAudioProof";
import { fakeListeningStorage } from "../fixtures/english-listening/fakeStorage";
import {
  questionAudioArtifacts,
  audioSourceId,
} from "../fixtures/english-listening/questionAudio";
vi.mock("server-only", () => ({}));
const url = process.env.LISTENING_TEST_DATABASE_URL;
if (
  url &&
  (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname) ||
    !/^\/listening_(runtime|test)/.test(new URL(url).pathname))
)
  throw Error("Refusing external database");
const db = url ? new PrismaClient({ datasourceUrl: url }) : null,
  ownerId = randomUUID(),
  otherId = randomUUID(),
  owner = { kind: "teacher" as const, userId: ownerId },
  now = new Date();
const fake = fakeListeningStorage();
let uploadHook: (() => Promise<void>) | undefined;
let failUploads = false;
const storage = createListeningStorageApi(fake.config, async (url, init) => {
  if (
    failUploads &&
    init?.method === "POST" &&
    String(url).includes("/object/")
  )
    throw Error("synthetic remote outage");
  if (
    init?.method === "POST" &&
    String(url).includes("/object/") &&
    uploadHook
  ) {
    const hook = uploadHook;
    uploadHook = undefined;
    await hook();
  }
  return fake.fetchImpl(url, init);
});
const runtime = db ? createListeningRuntime(db, () => now, { storage }) : null;
const store = db ? new PrismaStorageListeningMediaStore(db, storage) : null;
const media = db
  ? createListeningMediaService({
      store: store!,
      storage,
      ...createListeningMediaAccess(db, () => now),
      now: () => now.getTime(),
    })
  : null;
const folders: string[] = [],
  plans: PreparedQuestionAudioPlan[] = [];
async function setup() {
  const root = await mkdtemp(resolve(tmpdir(), "listening-question-db-"));
  folders.push(root);
  const fixture = await questionAudioArtifacts(root);
  let set = await runtime!.createSet(owner, {
    title: fixture.editableInput.title,
    level: "중1",
    rights: fixture.editableInput.rights,
    basis: fixture.editableInput.basis,
    source: fixture.assessment,
  });
  set = await runtime!.reviewSet(owner, set.id, {
    expectedRevision: set.revision,
    kind: "rights",
    basis: "self authored storage scope",
  });
  const assetId = randomUUID(),
    ref = await storage.upload({
      ownerId,
      assetId,
      bytes: fixture.audio.length,
      mimeType: "audio/wav",
      read: async function* () {
        yield fixture.audio;
      },
    });
  const record = storageReadyRecord({
    assetId,
    setId: set.id,
    ownerId,
    branchId: null,
    storage: ref,
    mimeType: "audio/wav",
    sha256: sha(fixture.audio),
    durationMs: 21000,
    now: now.getTime(),
  });
  await db!.$transaction((tx) => insertStorageAsset(tx, record));
  set = await runtime!.updateSet(owner, set.id, {
    ...fixture.editableInput,
    expectedRevision: set.revision,
    groups: [
      {
        ...fixture.editableInput.groups[0],
        audio: { assetId, sha256: sha(fixture.audio), durationMs: 21000 },
      },
    ],
  });
  fixture.snapshot.expectedSet = {
    setId: set.id,
    ownerId,
    branchId: null,
    revision: set.revision,
    documentSha256: listeningValueHash(set.document),
    originalAssetId: assetId,
  };
  await fixture.writeSnapshot();
  const plan = await loadListeningQuestionAudioPlan(root, audioSourceId);
  plans.push(plan);
  return { set, plan, fixture, original: record };
}
async function output(setId: string, assetId: string) {
  const response = await media!.serve(
    { actor: owner },
    { setId, assetId, method: "GET" },
  );
  expect(response.status).toBe(200);
  return Buffer.from(await response.arrayBuffer());
}
describe.runIf(Boolean(db))("trusted question audio atomic adoption", () => {
  beforeAll(async () => {
    process.env.ENGLISH_LISTENING_ENABLED = "true";
    process.env.ENGLISH_LISTENING_TEACHER_IDS = [ownerId, otherId].join(",");
    for (const id of [ownerId, otherId])
      await db!.user.create({
        data: {
          id,
          email: id + "@question-audio.test",
          name: "Question audio test",
          approvalStatus: "approved",
        },
      });
  });
  afterEach(async () => {
    uploadHook = undefined;
    failUploads = false;
    for (const plan of plans.splice(0)) await plan.dispose();
    for (const folder of folders.splice(0))
      await rm(folder, { recursive: true, force: true });
    await db!.$transaction(async (tx) => {
      await tx.$executeRaw`DELETE FROM english_listening_publication WHERE set_id IN(SELECT id FROM english_listening_set WHERE owner_id=${ownerId}::uuid)`;
      await tx.$executeRaw`DELETE FROM english_listening_media_storage_blob WHERE "assetId" IN(SELECT "assetId" FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid)`;
      await tx.$executeRaw`DELETE FROM english_listening_media_blob WHERE "assetId" IN(SELECT "assetId" FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid)`;
      await tx.$executeRaw`DELETE FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid`;
      await tx.$executeRaw`DELETE FROM english_listening_audit WHERE actor_id IN(${ownerId}::uuid,${otherId}::uuid)`;
      await tx.$executeRaw`DELETE FROM english_listening_set WHERE owner_id=${ownerId}::uuid`;
    });
    fake.files.clear();
    fake.calls.splice(0);
  });
  afterAll(async () => {
    await db!.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
    await db!.$disconnect();
  });
  it("previews without SQL/Storage mutations, then stores exact standalone PCM while preserving IDs, answers, metadata and original asset", async () => {
    const { set, plan, fixture, original } = await setup(),
      calls = fake.calls.length;
    const preview = await adoptListeningQuestionAudio(db!, null, plan, {
      actor: owner,
      clock: () => now,
    });
    expect(preview.status).toBe("read_only");
    expect(fake.calls).toHaveLength(calls);
    expect((await runtime!.setDetail(owner, set.id)).revision).toBe(
      set.revision,
    );
    const applied = await adoptListeningQuestionAudio(db!, storage, plan, {
      actor: owner,
      apply: true,
      clock: () => now,
    });
    expect(applied.status).toBe("applied");
    const result = await runtime!.setDetail(owner, set.id);
    expect(result.document.groups).toHaveLength(2);
    const old = set.document.groups.flatMap((g) => g.questions),
      actual = result.document.groups.flatMap((g) => g.questions);
    for (let i = 0; i < old.length; i++)
      expect(actual[i]).toEqual({
        ...old[i],
        evidence: old[i].evidence.map((e) => ({
          startMs: e.startMs - (i ? 11000 : 0),
          endMs: e.endMs - (i ? 11000 : 0),
        })),
        audioRange: { startMs: 0, endMs: plan.groups[i].clip.durationMs },
      });
    for (const [i, group] of result.document.groups.entries()) {
      const audio = await output(set.id, group.audio!.assetId);
      expect(sha(audio)).toBe(plan.groups[i].sha256);
      expect(audio.subarray(44)).toEqual(
        fixture.audio.subarray(
          44 + plan.groups[i].clip.startFrame * 2,
          44 + plan.groups[i].clip.endFrame * 2,
        ),
      );
      const head = await media!.serve(
        { actor: owner },
        { setId: set.id, assetId: group.audio!.assetId, method: "HEAD" },
      );
      expect(head.headers.get("content-length")).toBe(String(audio.length));
      const range = await media!.serve(
        { actor: owner },
        {
          setId: set.id,
          assetId: group.audio!.assetId,
          method: "GET",
          range: "bytes=43-71",
        },
      );
      expect(range.status).toBe(206);
      expect(Buffer.from(await range.arrayBuffer())).toEqual(
        audio.subarray(43, 72),
      );
    }
    expect(await store!.get(original.assetId)).toEqual(original);
    expect(await output(set.id, original.assetId)).toEqual(fixture.audio);
    expect(
      (
        await db!.$queryRaw<
          { n: bigint }[]
        >`SELECT COUNT(*) AS n FROM english_listening_media_blob WHERE "assetId" IN(SELECT "assetId" FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid)`
      )[0].n,
    ).toBe(BigInt(0));
    const assets = await db!.$queryRaw<
      { n: bigint }[]
    >`SELECT COUNT(*) AS n FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid`;
    const objectCount = fake.files.size;
    expect(
      (
        await adoptListeningQuestionAudio(db!, storage, plan, {
          actor: owner,
          apply: true,
          clock: () => now,
        })
      ).status,
    ).toBe("already_split");
    const callsBeforeReadOnly = fake.calls.length;
    expect(
      await adoptListeningQuestionAudio(db!, null, plan, {
        actor: owner,
        clock: () => now,
      }),
    ).toMatchObject({
      status: "already_split",
      revision: result.revision,
      planHash: plan.planHash,
    });
    expect(fake.calls).toHaveLength(callsBeforeReadOnly);
    expect(fake.files.size).toBe(objectCount);
    expect(
      (
        await db!.$queryRaw<
          { n: bigint }[]
        >`SELECT COUNT(*) AS n FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid`
      )[0].n,
    ).toBe(assets[0].n);
    const selected = await runtime!.composeSource(owner, set.id);
    const group = selected.detail.document.groups[0];
    const composed = await runtime!.composeSet(owner, {
      title: "Only first verified dialogue",
      selections: [
        {
          setId: set.id,
          expectedRevision: selected.detail.revision,
          documentHash: selected.documentHash,
          groupId: group.id,
          questionIds: [group.questions[0].id],
        },
      ],
    });
    const rights = await runtime!.reviewSet(owner, composed.id, {
      expectedRevision: composed.revision,
      kind: "rights",
      basis: "self authored exact subset",
    });
    expect(
      await output(rights.id, rights.document.groups[0].audio!.assetId),
    ).toEqual(await output(set.id, result.document.groups[0].audio!.assetId));
  });
  it("rejects wrong owner, stale whole-document proof and human-reviewed sources before remote writes", async () => {
    const { set, plan } = await setup(),
      calls = fake.calls.length;
    await expect(
      adoptListeningQuestionAudio(db!, storage, plan, {
        actor: { kind: "teacher", userId: otherId },
        apply: true,
      }),
    ).rejects.toThrow();
    expect(fake.calls).toHaveLength(calls);
    await runtime!.reviewSet(owner, set.id, {
      expectedRevision: set.revision,
      groupId: set.document.groups[0].id,
      kind: "content",
    });
    await expect(
      adoptListeningQuestionAudio(db!, storage, plan, {
        actor: owner,
        apply: true,
      }),
    ).rejects.toThrow(/human-reviewed/);
    expect(fake.calls).toHaveLength(calls);
  });
  it("refuses a source publication committed during remote upload and preserves the published original", async () => {
    const { set, plan } = await setup();
    let publishedRevision = 0;
    uploadHook = async () => {
      let current = set;
      for (const kind of ["content", "audio", "alignment"] as const)
        current = await runtime!.reviewSet(owner, set.id, {
          expectedRevision: current.revision,
          groupId: set.document.groups[0].id,
          kind,
          basis: "Synthetic self-authored test review",
        });
      await runtime!.publishSet(owner, set.id, {
        expectedRevision: current.revision,
      });
      publishedRevision = current.revision;
    };
    await expect(
      adoptListeningQuestionAudio(db!, storage, plan, {
        actor: owner,
        apply: true,
        clock: () => now,
      }),
    ).rejects.toThrow();
    expect(publishedRevision).toBeGreaterThan(set.revision);
    const source = await runtime!.setDetail(owner, set.id);
    expect(source.revision).toBe(publishedRevision);
    expect(source.document.groups[0].audio!.assetId).toBe(
      plan.snapshot.expectedSet.originalAssetId,
    );
    expect(source.publications).toHaveLength(1);
  });
  it("refuses a changed document hash even when a snapshot claims the current revision", async () => {
    const { set, plan, fixture } = await setup();
    fixture.snapshot.expectedSet.documentSha256 = "f".repeat(64);
    await fixture.writeSnapshot();
    const forged = await loadListeningQuestionAudioPlan(
      resolve(fixture.snapshotPath, "../.."),
      audioSourceId,
    );
    plans.push(forged);
    const calls = fake.calls.length;
    await expect(
      adoptListeningQuestionAudio(db!, storage, forged, {
        actor: owner,
        apply: true,
      }),
    ).rejects.toThrow(/full source document hash/);
    expect(fake.calls).toHaveLength(calls);
    expect((await runtime!.setDetail(owner, set.id)).revision).toBe(
      set.revision,
    );
    await expect(
      adoptListeningQuestionAudio(
        db!,
        storage,
        { ...plan },
        { actor: owner, apply: true },
      ),
    ).rejects.toThrow(/plan must be loaded/);
  });
  it("keeps document atomic when an edit occurs during upload; stable prepared clips survive as resumable checkpoints", async () => {
    const { set, plan } = await setup();
    uploadHook = async () => {
      await runtime!.updateSet(owner, set.id, {
        title: "User edited during upload",
        level: set.document.level,
        examId: set.document.examId,
        rights: set.document.rights,
        basis: set.document.provenance.basis,
        expectedRevision: set.revision,
        groups: set.document.groups.map(({ reviews, ...g }) => {
          void reviews;
          return g;
        }),
      });
    };
    await expect(
      adoptListeningQuestionAudio(db!, storage, plan, {
        actor: owner,
        apply: true,
        clock: () => now,
      }),
    ).rejects.toThrow();
    const actual = await runtime!.setDetail(owner, set.id);
    expect(actual.document.title).toBe("User edited during upload");
    expect(actual.document.groups[0].audio!.assetId).toBe(
      plan.snapshot.expectedSet.originalAssetId,
    );
    expect(actual.document.groups).toHaveLength(1);
    expect(
      (
        await db!.$queryRaw<
          { n: bigint }[]
        >`SELECT COUNT(*) AS n FROM english_listening_audit WHERE resource_id=${set.id}::uuid AND kind='question_audio_split'`
      )[0].n,
    ).toBe(BigInt(0));
    const original = await store!.get(
      plan.snapshot.expectedSet.originalAssetId,
    );
    expect(original!.state).toBe("ready");
  });
  it("resumes exact chunks after a remote failure without changing the original and isolates large Storage quota from PostgreSQL", async () => {
    const { set, plan } = await setup();
    failUploads = true;
    await expect(
      adoptListeningQuestionAudio(db!, storage, plan, {
        actor: owner,
        apply: true,
        clock: () => now,
      }),
    ).rejects.toThrow();
    failUploads = false;
    expect((await runtime!.setDetail(owner, set.id)).revision).toBe(
      set.revision,
    );
    expect(
      (
        await adoptListeningQuestionAudio(db!, storage, plan, {
          actor: owner,
          apply: true,
          clock: () => now,
        })
      ).status,
    ).toBe("applied");
    expect(LISTENING_STORAGE_OWNER_BYTES).toBe(80 * 1024 ** 3);
    expect(LISTENING_STORAGE_OWNER_ASSETS).toBe(8192);
    expect(LISTENING_MAX_OWNER_BYTES).toBe(2 ** 31 - 1);
    expect(LISTENING_MAX_OWNER_ASSETS).toBe(128);
    expect(
      (
        await db!.$queryRaw<
          { n: bigint }[]
        >`SELECT COUNT(*) AS n FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid`
      )[0].n,
    ).toBe(BigInt(3));
  });
});
