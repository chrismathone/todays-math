// @vitest-environment node
/** Disposable PostgreSQL only. Synthetic receipts/readiness metadata test transactions, not audio quality. */
import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createListeningRuntime } from "@/lib/english/listening/runtime/service";
import { listeningDraftSchema } from "@/contracts/englishListeningHttp.contract";
import { listeningMediaCompletionSchema } from "@/contracts/englishListeningMedia.contract";
import { makeListeningStyleStageFixture } from "../fixtures/english-listening/styleStage";
import { loadVerifiedListeningStyleStage } from "../../../scripts/qa/english-listening/verified-listening-style-stage.mts";
import {
  applyListeningStyle,
  loadListeningStyleSnapshot,
} from "../../../scripts/qa/english-listening/apply-listening-style.mts";
vi.mock("server-only", () => ({}));
const url = process.env.LISTENING_STYLE_TEST_DATABASE_URL;
if (
  url &&
  (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname) ||
    new URL(url).pathname !== "/listening_style_test")
)
  throw Error("Refusing a non-isolated style adoption database");
const db = url ? new PrismaClient({ datasourceUrl: url }) : null;
const owner = "6f361696-5eb5-4f7d-9c66-9313ad7bb06a";
const actor = { kind: "teacher" as const, userId: owner };
const roots: string[] = [];
const runtime = db ? createListeningRuntime(db) : null;
const json = (value: unknown) => Prisma.sql`${JSON.stringify(value)}::jsonb`;
async function fixture(badReadyOriginal = false, koreanOnlyEvidence = false) {
  const f = await makeListeningStyleStageFixture("4", { koreanOnlyEvidence });
  roots.push(f.root);
  const loaded = await loadVerifiedListeningStyleStage(f.file, f.root);
  const set = await runtime!.createSet(actor, loaded.baseline.createInput);
  const assetId = randomUUID(),
    audioHash = loaded.audit.sourceAudioSha256;
  const completion = listeningMediaCompletionSchema.parse({
    assetId,
    setId: set.id,
    ownerId: owner,
    branchId: null,
    revision: 1,
    receivedBytes: 28,
    totalBytes: 28,
    chunkBytes: 1024,
    uploadExpiresAt: Date.now() + 600000,
    verifiedAt: Date.now(),
    state: "ready",
    publishable: true,
    mimeType: "audio/mpeg",
    sha256: audioHash,
    originalSha256: badReadyOriginal ? "b".repeat(64) : audioHash,
    durationMs: 60000,
  });
  const record = {
    assetId,
    setId: set.id,
    ownerId: owner,
    branchId: null,
    completion,
  };
  await db!.$executeRaw(
    Prisma.sql`INSERT INTO english_listening_media_asset("assetId","ownerId","branchId","setId",revision,state,"uploadExpiresAt","reservedBytes",record) VALUES(${assetId}::uuid,${owner}::uuid,NULL,${set.id}::uuid,1,'ready',${new Date(completion.uploadExpiresAt)},28,${json(record)})`,
  );
  const edited = await runtime!.updateSet(actor, set.id, {
    ...loaded.baseline.editableInput,
    expectedRevision: set.revision,
    groups: loaded.baseline.editableInput.groups.map((group) => ({
      ...group,
      audio: { assetId, sha256: audioHash, durationMs: 60000 },
    })),
  });
  const snapshotFile = resolve(f.root, "snapshots.json");
  await writeFile(
    snapshotFile,
    JSON.stringify({
      ownerId: owner,
      checkedAt: new Date().toISOString(),
      snapshots: [
        {
          id: set.id,
          revision: edited.revision,
          document: edited.document,
          publications: 0,
          sourceRecordId: loaded.sourceRecordId,
          baselineSha256: loaded.audit.baselineSha256,
          baselineMatch: true,
        },
      ],
    }),
  );
  const backup = await loadListeningStyleSnapshot(
    snapshotFile,
    f.root,
    loaded.sourceRecordId,
    loaded.audit.baselineSha256,
  );
  return {
    f,
    loaded,
    backup,
    setId: set.id,
    document: edited.document,
    assetId,
  };
}
async function stored(setId: string) {
  const rows = await db!.$queryRaw<{ document: unknown; revision: number }[]>(
    Prisma.sql`SELECT document,revision FROM english_listening_set WHERE id=${setId}::uuid`,
  );
  const audits = await db!.$queryRaw<{ count: bigint }[]>(
    Prisma.sql`SELECT count(*) AS count FROM english_listening_audit WHERE resource_id=${setId}::uuid AND kind='reconstructed_style_adopted'`,
  );
  return {
    document: listeningDraftSchema.parse(rows[0].document),
    revision: rows[0].revision,
    audits: Number(audits[0].count),
  };
}
describe.skipIf(!db)(
  "receipt-qualified style adoption (isolated PostgreSQL)",
  () => {
    beforeAll(async () => {
      await db!.user.create({
        data: {
          id: owner,
          email: "style-owner@listening.test",
          name: "스타일 검사 교사",
          approvalStatus: "approved",
        },
      });
    });
    afterAll(async () => {
      await db?.$disconnect();
      for (const root of roots.splice(0)) {
        if (dirname(root) !== resolve(tmpdir()))
          throw Error("Unexpected fixture cleanup target");
        await rm(root, { recursive: true, force: true });
      }
    });
    it("preflights with READ ONLY, then atomically changes only qualified questions and records a bound audit", async () => {
      const f = await fixture();
      expect(
        await applyListeningStyle(db!, f.loaded, f.backup, { actor }),
      ).toMatchObject({ status: "read_only", qualified: 2, held: 3 });
      expect(await stored(f.setId)).toEqual({
        document: f.document,
        revision: f.document.revision,
        audits: 0,
      });
      expect(
        await applyListeningStyle(db!, f.loaded, f.backup, {
          actor,
          apply: true,
        }),
      ).toMatchObject({ status: "applied", revision: f.document.revision + 1 });
      const after = await stored(f.setId);
      expect(after.audits).toBe(1);
      expect(after.document.groups[0].questions).toEqual(
        f.loaded.staged.editableInput.groups[0].questions,
      );
      expect(
        after.document.groups[0].questions[1].metadata!.reconstruction!
          .verification,
      ).toBe("needs_review");
      expect(after.document.groups[0].questions.slice(2)).toEqual(
        f.document.groups[0].questions.slice(2),
      );
      expect(after.document.groups[0].audio).toEqual(
        f.document.groups[0].audio,
      );
      expect(after.document.groups[0].transcript).toEqual(
        f.document.groups[0].transcript,
      );
      expect(after.document.rights).toEqual(f.document.rights);
      expect(after.document.provenance).toEqual(f.document.provenance);
    });
    it("preserves a receipt-eligible item with Korean-only evidence while adopting other qualified items", async () => {
      const f = await fixture(false, true);
      const result = await applyListeningStyle(db!, f.loaded, f.backup, {
        actor,
        apply: true,
      });
      expect(result).toMatchObject({
        status: "applied",
        qualified: 1,
        held: 4,
      });
      expect(result.adoptionHolds).toEqual([
        {
          questionId: f.document.groups[0].questions[0].id,
          reasons: ["No English speech in the bound evidence quotations"],
        },
      ]);
      const after = await stored(f.setId);
      expect(after.document.groups[0].questions[0]).toEqual(
        f.document.groups[0].questions[0],
      );
      expect(after.document.groups[0].questions[1]).toEqual(
        f.loaded.staged.editableInput.groups[0].questions[1],
      );
      expect(after.document.groups[0].questions.slice(2)).toEqual(
        f.document.groups[0].questions.slice(2),
      );
      expect(after.audits).toBe(1);
      expect(
        await applyListeningStyle(db!, f.loaded, f.backup, { actor }),
      ).toMatchObject({ status: "already_applied", qualified: 1, held: 4 });
    });
    it("serializes concurrent identical applications and creates one adoption audit", async () => {
      const f = await fixture();
      const results = await Promise.all([
        applyListeningStyle(db!, f.loaded, f.backup, { actor, apply: true }),
        applyListeningStyle(db!, f.loaded, f.backup, { actor, apply: true }),
      ]);
      expect(results.map((value) => value.status).sort()).toEqual([
        "already_applied",
        "applied",
      ]);
      expect(await stored(f.setId)).toMatchObject({
        revision: f.document.revision + 1,
        audits: 1,
      });
    });
    it("preserves a newer user edit and writes no adoption audit", async () => {
      const f = await fixture();
      const current = structuredClone(f.document);
      current.groups[0].questions[4].prompt = "사용자가 고친 문항";
      await db!.$executeRaw(
        Prisma.sql`UPDATE english_listening_set SET document=${json(current)},revision=revision+1 WHERE id=${f.setId}::uuid`,
      );
      // Runtime requires matching document revision too; neither inconsistency nor an ordinary newer revision may overwrite.
      await expect(
        applyListeningStyle(db!, f.loaded, f.backup, { actor, apply: true }),
      ).rejects.toThrow();
      current.revision++;
      await db!.$executeRaw(
        Prisma.sql`UPDATE english_listening_set SET document=${json(current)} WHERE id=${f.setId}::uuid`,
      );
      await expect(
        applyListeningStyle(db!, f.loaded, f.backup, { actor, apply: true }),
      ).rejects.toThrow("snapshot changed");
      expect(await stored(f.setId)).toEqual({
        document: current,
        revision: current.revision,
        audits: 0,
      });
    });
    it("preserves a publication or human review added after export", async () => {
      for (const mode of ["publication", "review"] as const) {
        const f = await fixture();
        if (mode === "publication") {
          const id = randomUUID();
          await db!.$executeRaw(
            Prisma.sql`INSERT INTO english_listening_publication(id,set_id,source_revision,snapshot) VALUES(${id}::uuid,${f.setId}::uuid,${f.document.revision},${json({ id, document: f.document })})`,
          );
        } else {
          const current = structuredClone(f.document);
          current.groups[0].reviews.content = {
            reviewerId: owner,
            reviewedAt: new Date().toISOString(),
            revision: current.revision,
            contentHash: "a".repeat(64),
          };
          // Use the public contract for the actual review stamp shape.
          const valid = listeningDraftSchema.parse(current);
          await db!.$executeRaw(
            Prisma.sql`UPDATE english_listening_set SET document=${json(valid)} WHERE id=${f.setId}::uuid`,
          );
        }
        await expect(
          applyListeningStyle(db!, f.loaded, f.backup, { actor, apply: true }),
        ).rejects.toThrow();
        expect((await stored(f.setId)).audits).toBe(0);
      }
    });
    it("rejects changed ready-audio identity before any question update", async () => {
      const f = await fixture();
      await expect(
        db!.$executeRaw(
          Prisma.sql`UPDATE english_listening_media_asset SET record=jsonb_set(record,'{completion,originalSha256}',${json("b".repeat(64))}) WHERE "assetId"=${f.assetId}::uuid`,
        ),
      ).rejects.toThrow("Ready listening media is immutable");
      const bad = await fixture(true);
      await expect(
        applyListeningStyle(db!, bad.loaded, bad.backup, {
          actor,
          apply: true,
        }),
      ).rejects.toThrow("Ready audio");
      expect(await stored(f.setId)).toEqual({
        document: f.document,
        revision: f.document.revision,
        audits: 0,
      });
    });
  },
);
