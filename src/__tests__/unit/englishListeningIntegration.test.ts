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
function wave() {
  // Fifteen seconds of PCM silence; suitable for transport tests, never a reviewed lesson.
  const bytes = Buffer.alloc(44 + 15 * 16000);
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

describe("listening media → publication → learner boundary", () => {
  it("binds verified bytes to publication, releases only a complete group, and denies the next revoked Range request", async () => {
    const store = await LocalTempListeningMediaStore.create();
    stores.push(store);
    const document = englishListeningFixture();
    document.groups = [document.groups[0]];
    const assignment = englishListeningAssignmentFixture();
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
      publication: {
        id: ids.publication,
        ownerUserId: ids.owner,
        branchId: ids.branch,
        withdrawnAt: null,
      },
      attempt: null,
      now: Date.parse(now),
    };
    const media = createListeningMediaService({
      store,
      now: () => Date.parse(now),
      authorize: async (actor: "teacher" | "student", target) =>
        target.setId === ids.set &&
        (actor === "teacher" ||
          (target.action === "playback" &&
            canReadListeningAssignment(facts, "media"))),
    });
    const bytes = wave();
    let upload = await media.beginUpload("teacher", {
      setId: ids.set,
      totalBytes: bytes.length,
      mimeType: "audio/wav",
      expectedSha256: sha(bytes),
    });
    const request = {
      setId: ids.set,
      assetId: upload.assetId,
      method: "GET",
      range: "bytes=44-63",
    };
    expect((await media.serve("student", request)).status).toBe(404);
    upload = await media.appendChunk(
      "teacher",
      {
        setId: ids.set,
        assetId: upload.assetId,
        expectedRevision: upload.revision,
        offset: 0,
        byteLength: bytes.length,
        sha256: sha(bytes),
      },
      body(bytes),
    );
    await media.completeUpload("teacher", {
      setId: ids.set,
      assetId: upload.assetId,
      expectedRevision: upload.revision,
    });
    document.groups[0].audio = {
      assetId: upload.assetId,
      sha256: sha(bytes),
      durationMs: 15000,
    };
    const contentHash = listeningContentHash(document);
    const group = document.groups[0];
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
    const read = (target: { setId: string; assetId: string }) =>
      media.getVerifiedReadiness("teacher", target);
    const publication = await publishListeningWithVerifiedMedia(
      document,
      { id: ids.publication, publishedAt: now },
      read,
    );
    const response = await media.serve("student", request);
    expect(response.status).toBe(206);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      bytes.subarray(44, 64),
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
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
      /answerChoiceId|transcript|explanation|evidence|sha256|reviewerId/,
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

  it("rejects a missing capability and wrong set binding before mapping readiness", async () => {
    const document = englishListeningFixture();
    const options = { id: ids.publication, publishedAt: now };
    await expect(
      publishListeningWithVerifiedMedia(document, options, async () => null),
    ).rejects.toThrow();
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
    });
    for (const change of [
      { setId: ids.assignment },
      { assetId: ids.assignment },
      { sha256: "c".repeat(64) },
      { durationMs: 19999 },
    ]) {
      await expect(
        publishListeningWithVerifiedMedia(
          document,
          options,
          async (target) => ({
            ...receipt(target.assetId),
            ...change,
          }),
        ),
      ).rejects.toThrow(/media/i);
    }
  });
});
