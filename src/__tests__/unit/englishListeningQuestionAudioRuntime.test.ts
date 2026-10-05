// @vitest-environment node
/** Real disposable PostgreSQL; remote bytes use authenticated in-memory Storage transport. */
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import type { ListeningDraft } from "@/contracts/englishListeningHttp.contract";
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
const storage = createListeningStorageApi(fake.config, fake.fetchImpl);
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
  it.each(
    [
      "national_listening",
      "mock_exam",
      "metadata_national",
      "metadata_mock",
      "ebs-middle-1-2026-1",
      "ebsi-high-1-2022-2",
    ].flatMap((policy) => [false, true].map((apply) => ({ policy, apply }))),
  )(
    "rejects $policy before any Storage access with apply=$apply and preserves the complete original",
    async ({ policy, apply }) => {
      const { set, plan, fixture, original } = await setup();
      const document: ListeningDraft = structuredClone(set.document);
      for (const group of document.groups)
        for (const question of group.questions) {
          question.metadata!.assessmentKind = null;
          question.metadata!.sourceRecordId = null;
        }
      if (policy === "national_listening" || policy === "mock_exam")
        document.source!.kind = policy;
      else {
        delete document.source;
        const metadata = document.groups[0].questions[1].metadata!;
        if (policy.startsWith("metadata_"))
          metadata.assessmentKind =
            policy === "metadata_national" ? "national_listening" : "mock_exam";
        else metadata.sourceRecordId = policy;
      }
      // This is an isolated database fixture; prove each policy signal independently.
      await db!
        .$executeRaw`UPDATE english_listening_set SET document=${JSON.stringify(document)}::jsonb WHERE id=${set.id}::uuid`;
      const before = await runtime!.setDetail(owner, set.id);
      const [inventory] = await db!.$queryRaw<
        { assets: bigint; chunks: bigint; audits: bigint }[]
      >`
      SELECT
        (SELECT COUNT(*) FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid) AS assets,
        (SELECT COUNT(*) FROM english_listening_media_storage_blob b JOIN english_listening_media_asset a ON a."assetId"=b."assetId" WHERE a."ownerId"=${ownerId}::uuid) AS chunks,
        (SELECT COUNT(*) FROM english_listening_audit WHERE resource_id=${set.id}::uuid) AS audits`;
      const calls = fake.calls.length;
      const files = new Map(fake.files);
      await expect(
        adoptListeningQuestionAudio(db!, apply ? storage : null, plan, {
          actor: owner,
          apply,
          clock: () => now,
        }),
      ).rejects.toThrow(
        /national listening and mock assessments require whole-source audio.*including dry runs/,
      );
      expect(fake.calls).toHaveLength(calls);
      expect(fake.files).toEqual(files);
      const after = await runtime!.setDetail(owner, set.id);
      expect(after.document).toEqual(before.document);
      expect(after.revision).toBe(before.revision);
      expect(await store!.get(original.assetId)).toEqual(original);
      const [actualInventory] = await db!.$queryRaw<
        { assets: bigint; chunks: bigint; audits: bigint }[]
      >`
      SELECT
        (SELECT COUNT(*) FROM english_listening_media_asset WHERE "ownerId"=${ownerId}::uuid) AS assets,
        (SELECT COUNT(*) FROM english_listening_media_storage_blob b JOIN english_listening_media_asset a ON a."assetId"=b."assetId" WHERE a."ownerId"=${ownerId}::uuid) AS chunks,
        (SELECT COUNT(*) FROM english_listening_audit WHERE resource_id=${set.id}::uuid) AS audits`;
      expect(actualInventory).toEqual(inventory);
      expect(await output(set.id, original.assetId)).toEqual(fixture.audio);
    },
  );

  it("rejects a national assessment even when a prior split audit matches the current document", async () => {
    const { set, plan } = await setup();
    const payload = {
      planHash: plan.planHash,
      documentSha256: listeningValueHash(set.document),
      revision: set.revision,
    };
    await db!
      .$executeRaw`INSERT INTO english_listening_audit(id,resource_id,actor_id,kind,payload,created_at) VALUES(${randomUUID()}::uuid,${set.id}::uuid,${ownerId}::uuid,'question_audio_split',${JSON.stringify(payload)}::jsonb,${now})`;
    const calls = fake.calls.length;
    for (const apply of [false, true])
      await expect(
        adoptListeningQuestionAudio(db!, storage, plan, {
          actor: owner,
          apply,
        }),
      ).rejects.toThrow(/require whole-source audio/);
    expect(fake.calls).toHaveLength(calls);
    expect((await runtime!.setDetail(owner, set.id)).document).toEqual(
      set.document,
    );
  });

  it("continues to reject wrong ownership and copied untrusted plans without Storage writes", async () => {
    const { set, plan } = await setup();
    const calls = fake.calls.length;
    await expect(
      adoptListeningQuestionAudio(db!, storage, plan, {
        actor: { kind: "teacher", userId: otherId },
        apply: true,
      }),
    ).rejects.toThrow();
    await expect(
      adoptListeningQuestionAudio(
        db!,
        storage,
        { ...plan },
        { actor: owner, apply: true },
      ),
    ).rejects.toThrow(/plan must be loaded/);
    expect(fake.calls).toHaveLength(calls);
    expect((await runtime!.setDetail(owner, set.id)).document).toEqual(
      set.document,
    );
  });
});
