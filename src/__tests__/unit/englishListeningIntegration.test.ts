// @vitest-environment node
/** L0 cross-module test with real temp bytes and simulated trusted records, not a deployed API test. */
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  englishListeningFixture,
  englishListeningAssignmentFixture,
  listeningFixtureIds as ids,
  listeningFixtureNow as now,
} from "@/mocks/englishListeningFixture";
import type { ListeningMediaScope } from "@/contracts/englishListeningMedia.contract";
import { createListeningMediaService } from "@/lib/english/listening/media/service";
import { LocalTempListeningMediaStore } from "@/lib/english/listening/media/localTempStore";
import { publishListeningWithVerifiedMedia } from "@/lib/english/listening/verifiedPublication";
import { listeningContentHash } from "@/lib/english/listening/publication";
import {
  createListeningAttempt,
  transitionListeningAttempt,
} from "@/lib/english/listening/attempt";
import { projectListeningStudentView } from "@/lib/english/listening/projection";
import {
  canReadListeningAssignment,
  type ListeningStudentAccessFacts,
} from "@/lib/english/listening/access";

const stores: LocalTempListeningMediaStore[] = [];
afterEach(async () => {
  await Promise.all(stores.splice(0).map((store) => store.dispose()));
});
const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
async function* body(bytes: Uint8Array) {
  yield bytes;
}
function wave(seconds = 15, fill = 0) {
  // PCM silence (or a constant) of the given length; a transport sample, never a reviewed lesson.
  const bytes = Buffer.alloc(44 + seconds * 16000, fill);
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
  return bytes;
}
/** Trusted rows as a route adapter would load them for a student request. */
function studentFacts() {
  // Immutable published snapshot fields (F1): filled once the publication exists.
  const publication = {
    id: ids.publication,
    ownerUserId: ids.owner,
    branchId: ids.branch,
    withdrawnAt: null as number | null,
    setId: ids.set,
    audioAssetIds: [] as string[],
  };
  const facts: ListeningStudentAccessFacts = {
    session: {
      accountId: "account",
      studentId: ids.student,
      name: "학생",
      mustChangePassword: false,
    },
    account: {
      id: "account",
      studentId: ids.student,
      active: true,
      mustChangePassword: false,
    },
    student: {
      id: ids.student,
      classId: "class",
      branchId: ids.branch,
      enrolled: true,
    },
    assignment: {
      id: ids.assignment,
      publicationId: ids.publication,
      ownerUserId: ids.owner,
      branchId: ids.branch,
      classId: "class",
      availableFrom: Date.parse(now),
      revokedAt: null,
      audioSource: "student_device",
    },
    target: {
      assignmentId: ids.assignment,
      studentId: ids.student,
      classId: "class",
      revokedAt: null,
    },
    publication,
    attempt: null,
    now: Date.parse(now),
  };
  return { facts, publication };
}
type Actor = "teacher" | "student";
/** Server-side set scope lookup (never request data); tests mutate it to simulate reassignment. */
function scopeRow() {
  const row: { current: ListeningMediaScope | null } = {
    current: { ownerId: ids.owner, branchId: ids.branch },
  };
  return row;
}
async function service(facts: ListeningStudentAccessFacts, row = scopeRow()) {
  const store = await LocalTempListeningMediaStore.create();
  stores.push(store);
  const media = createListeningMediaService({
    store,
    now: () => Date.parse(now),
    authorize: async (actor: Actor, target) =>
      target.setId === ids.set &&
      (actor === "teacher" ||
        (target.action === "playback" &&
          target.assetId !== undefined &&
          canReadListeningAssignment(facts, "media", {
            setId: target.setId,
            assetId: target.assetId,
          }))),
    resolveScope: async (_actor: Actor, setId) =>
      setId === ids.set ? row.current : null,
  });
  async function upload(bytes: Buffer) {
    let receipt = await media.beginUpload("teacher", {
      setId: ids.set,
      totalBytes: bytes.length,
      mimeType: "audio/wav",
      expectedSha256: sha(bytes),
    });
    receipt = await media.appendChunk(
      "teacher",
      {
        setId: ids.set,
        assetId: receipt.assetId,
        expectedRevision: receipt.revision,
        offset: 0,
        byteLength: bytes.length,
        sha256: sha(bytes),
      },
      body(bytes),
    );
    return receipt;
  }
  return { media, store, upload, row };
}
function reviewed(document: ReturnType<typeof englishListeningFixture>) {
  const contentHash = listeningContentHash(document);
  for (const group of document.groups) {
    const review = {
      reviewerId: ids.owner,
      reviewedAt: now,
      revision: document.revision,
      contentHash,
    };
    const audioReview = {
      ...review,
      assetId: group.audio.assetId,
      sha256: group.audio.sha256,
      transcriptRevision: group.transcript.revision,
    };
    group.reviews = {
      content: review,
      audio: audioReview,
      alignment: audioReview,
    };
  }
  return document;
}

describe("listening media → publication → learner boundary", () => {
  it("binds verified bytes to publication, releases only a complete group, and denies the next revoked Range request", async () => {
    const { facts, publication: publicationFacts } = studentFacts();
    const { media, upload } = await service(facts);
    const document = englishListeningFixture();
    document.groups = [document.groups[0]];
    const assignment = englishListeningAssignmentFixture();
    const bytes = wave();
    let receipt = await media.beginUpload("teacher", {
      setId: ids.set,
      totalBytes: bytes.length,
      mimeType: "audio/wav",
      expectedSha256: sha(bytes),
    });
    const request = {
      setId: ids.set,
      assetId: receipt.assetId,
      method: "GET",
      range: "bytes=44-63",
    };
    expect((await media.serve("student", request)).status).toBe(404);
    receipt = await media.appendChunk(
      "teacher",
      {
        setId: ids.set,
        assetId: receipt.assetId,
        expectedRevision: receipt.revision,
        offset: 0,
        byteLength: bytes.length,
        sha256: sha(bytes),
      },
      body(bytes),
    );
    const completion = await media.completeUpload("teacher", {
      setId: ids.set,
      assetId: receipt.assetId,
      expectedRevision: receipt.revision,
    });
    expect(completion).toMatchObject({
      state: "ready",
      ownerId: ids.owner,
      branchId: ids.branch,
      verifiedAt: Date.parse(now),
    });
    document.groups[0].audio = {
      assetId: receipt.assetId,
      sha256: sha(bytes),
      durationMs: 15000,
    };
    reviewed(document);
    const group = document.groups[0];
    const read = (target: { setId: string; assetId: string }) =>
      media.getVerifiedReadiness("teacher", target);
    const publication = await publishListeningWithVerifiedMedia(
      document,
      { id: ids.publication, publishedAt: now },
      read,
    );
    publicationFacts.audioAssetIds = publication.document.groups.map(
      (item) => item.audio.assetId,
    );
    const response = await media.serve("student", request);
    expect(response.status).toBe(206);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      bytes.subarray(44, 64),
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    // A second ready asset in the same set that no publication references stays private (F1 target binding).
    const unpublished = await upload(wave(12, 7));
    await media.completeUpload("teacher", {
      setId: ids.set,
      assetId: unpublished.assetId,
      expectedRevision: unpublished.revision,
    });
    expect(
      (
        await media.serve("student", {
          ...request,
          assetId: unpublished.assetId,
        })
      ).status,
    ).toBe(404);
    let attempt = createListeningAttempt(publication, assignment, {
      id: ids.attempt,
      studentId: ids.student,
      now,
    });
    attempt = transitionListeningAttempt(
      publication,
      assignment,
      attempt,
      {
        kind: "start",
        expectedRevision: attempt.revision,
        idempotencyKey: "start",
      },
      { now, soundChecked: true, audioReady: true },
    );
    const answer = (index: number) =>
      transitionListeningAttempt(
        publication,
        assignment,
        attempt,
        {
          kind: "answer",
          phase: "initial",
          questionId: group.questions[index].id,
          choiceId: group.questions[index].choices[0].id,
          expectedRevision: attempt.revision,
          idempotencyKey: `answer-${index}`,
        },
        { now },
      );
    attempt = answer(0);
    const locked = projectListeningStudentView(
      publication,
      assignment,
      attempt,
      { now },
    );
    expect(locked.groups[0].state).toBe("locked");
    expect(JSON.stringify(locked)).not.toMatch(
      /answerChoiceId|transcript|explanation|evidence|sha256|reviewerId|ownerId|verifiedAt/,
    );
    attempt = answer(1);
    expect(
      projectListeningStudentView(publication, assignment, attempt, { now })
        .groups[0].state,
    ).toBe("review");
    const answersBefore = JSON.stringify(attempt.firstAnswers);
    facts.assignment.revokedAt = Date.parse(now);
    expect((await media.serve("student", request)).status).toBe(404);
    expect(
      (await media.serve("student", { ...request, method: "HEAD" })).status,
    ).toBe(404);
    expect(JSON.stringify(attempt.firstAnswers)).toBe(answersBefore);
    facts.assignment.revokedAt = null;
    facts.assignment.audioSource = "teacher_device";
    expect((await media.serve("student", request)).status).toBe(404);
    expect(canReadListeningAssignment(facts, "read")).toBe(true);
  });

  it("publishes only media whose stored scope and verification time match the document, never synthesized ones", async () => {
    const { facts } = studentFacts();
    const { media, upload, row } = await service(facts);
    const bytes = wave();
    const receipt = await upload(bytes);
    await media.completeUpload("teacher", {
      setId: ids.set,
      assetId: receipt.assetId,
      expectedRevision: receipt.revision,
    });
    const base = () => {
      const document = englishListeningFixture();
      document.groups = [document.groups[0]];
      document.groups[0].audio = {
        assetId: receipt.assetId,
        sha256: sha(bytes),
        durationMs: 15000,
      };
      return document;
    };
    const options = { id: ids.publication, publishedAt: now };
    const read = (target: { setId: string; assetId: string }) =>
      media.getVerifiedReadiness("teacher", target);
    await expect(
      publishListeningWithVerifiedMedia(reviewed(base()), options, read),
    ).resolves.toMatchObject({ id: ids.publication });
    // The review's F2 reproducer: a document claiming another owner used to publish.
    const foreignOwner = base();
    foreignOwner.ownerId = ids.student;
    await expect(
      publishListeningWithVerifiedMedia(reviewed(foreignOwner), options, read),
    ).rejects.toThrow(/media scope/i);
    const foreignBranch = base();
    foreignBranch.branchId = ids.retry;
    await expect(
      publishListeningWithVerifiedMedia(reviewed(foreignBranch), options, read),
    ).rejects.toThrow(/media scope/i);
    // Readiness altered between the service and the bridge (a faulty adapter) is still refused.
    for (const change of [
      { ownerId: ids.student },
      { branchId: ids.retry },
      { branchId: null },
      { verifiedAt: Date.parse(now) + 1 },
    ])
      await expect(
        publishListeningWithVerifiedMedia(
          reviewed(base()),
          options,
          async (target) => ({ ...(await read(target)), ...change }),
        ),
      ).rejects.toThrow(/media/i);
    // The set was reassigned after the upload: the service itself refuses the readiness lookup.
    row.current = { ownerId: ids.student, branchId: ids.branch };
    await expect(
      publishListeningWithVerifiedMedia(reviewed(base()), options, read),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      media.getVerifiedReadiness("teacher", {
        setId: ids.set,
        assetId: receipt.assetId,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(
      (
        await media.serve("student", {
          setId: ids.set,
          assetId: receipt.assetId,
          method: "HEAD",
        })
      ).status,
    ).toBe(404);
  });

  it("rejects a missing capability and wrong set binding before mapping readiness", async () => {
    const document = englishListeningFixture();
    const options = { id: ids.publication, publishedAt: now };
    await expect(
      publishListeningWithVerifiedMedia(document, options, async () => null),
    ).rejects.toThrow(/media/i);
    const receipt = (assetId: string) => ({
      setId: document.id,
      ...document.groups.find((group) => group.audio.assetId === assetId)!
        .audio,
      state: "ready",
      publishable: true,
      mimeType: "audio/wav",
      revision: 2,
      receivedBytes: 100,
      totalBytes: 100,
      chunkBytes: 100,
      uploadExpiresAt: Date.parse(now) + 1000,
      ownerId: document.ownerId,
      branchId: document.branchId,
      verifiedAt: Date.parse(now),
    });
    await expect(
      publishListeningWithVerifiedMedia(document, options, async (target) =>
        receipt(target.assetId),
      ),
    ).resolves.toMatchObject({ id: ids.publication });
    type Receipt = ReturnType<typeof receipt>;
    const patch = (change: Partial<Receipt>) => (r: Receipt) => ({
      ...r,
      ...change,
    });
    const blocked = (r: Receipt) => {
      const rest: Record<string, unknown> = { ...r };
      delete rest.sha256;
      delete rest.durationMs;
      delete rest.mimeType;
      return {
        ...rest,
        state: "publish_blocked",
        publishable: false,
        blocker: "duration_limit",
      };
    };
    for (const change of [
      patch({ setId: ids.assignment }),
      patch({ assetId: ids.assignment }),
      patch({ sha256: "c".repeat(64) }),
      patch({ durationMs: 19999 }),
      blocked,
      patch({ ownerId: undefined }),
      patch({ verifiedAt: undefined }),
    ]) {
      await expect(
        publishListeningWithVerifiedMedia(document, options, async (target) =>
          change(receipt(target.assetId)),
        ),
      ).rejects.toThrow(/media|invalid/i);
    }
  });
});
