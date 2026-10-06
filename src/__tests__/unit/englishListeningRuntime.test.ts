// @vitest-environment node
/** Real PostgreSQL tests. Explicit loopback test URL required; never use DATABASE_URL. */
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient, Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createListeningRuntime } from "@/lib/english/listening/runtime/service";
import { createListeningMediaAccess } from "@/lib/english/listening/runtime/mediaAccess";
import { PrismaListeningMediaStore } from "@/lib/english/listening/media/prismaStore";
import { createListeningMediaService } from "@/lib/english/listening/media/service";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";
import { listeningQuestionMetadata } from "@/lib/english/listening/metadata";
import type { ListeningActor } from "@/lib/english/listening/runtime/database";
import type { ListeningSetDetail } from "@/contracts/englishListeningHttp.contract";
import type { ListeningStudentDetail } from "@/contracts/englishListeningStudentHttp.contract";

vi.mock("server-only", () => ({}));
const url = process.env.LISTENING_TEST_DATABASE_URL;
if (
  url &&
  (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname) ||
    !/^\/listening_(runtime|test)/.test(new URL(url).pathname))
)
  throw new Error("Refusing non-isolated listening test database");
const db = url ? new PrismaClient({ datasources: { db: { url } } }) : null;
const db2 = url ? new PrismaClient({ datasources: { db: { url } } }) : null;
let now = new Date("2026-10-03T08:00:00Z");
const clock = () => now;
const runtime = db ? createListeningRuntime(db, clock) : null;
const otherRuntime = db2 ? createListeningRuntime(db2, clock) : null;
const teacherId = randomUUID(),
  otherId = randomUUID(),
  classId = randomUUID(),
  otherClass = randomUUID();
const studentId = randomUUID(),
  student2Id = randomUUID(),
  accountId = randomUUID(),
  account2Id = randomUUID();
const owner: ListeningActor = { kind: "teacher", userId: teacherId };
const other: ListeningActor = { kind: "teacher", userId: otherId };
const learner: ListeningActor = {
  kind: "student",
  session: {
    accountId,
    studentId,
    name: "듣기학생",
    mustChangePassword: false,
  },
};
const learner2: ListeningActor = {
  kind: "student",
  session: {
    accountId: account2Id,
    studentId: student2Id,
    name: "듣기학생2",
    mustChangePassword: false,
  },
};
const store = db ? new PrismaListeningMediaStore(db) : null;
const media = db
  ? createListeningMediaService({
      store: store!,
      ...createListeningMediaAccess(db, clock),
      now: () => now.getTime(),
      limits: { maxTotalBytes: 16 * 1024 * 1024, maxDurationMs: 600000 },
    })
  : null;
const rights = englishListeningFixture().rights;
const sha = (value: Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
function wave() {
  const b = Buffer.alloc(44 + 240000);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(16000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(b.length - 44, 40);
  return b;
}
async function* bytes(b: Uint8Array) {
  yield b;
}
function edit(set: ListeningSetDetail) {
  return {
    expectedRevision: set.revision,
    title: set.document.title,
    level: set.document.level,
    examId: set.document.examId,
    rights: set.document.rights,
    basis: set.document.provenance.basis,
    groups: set.document.groups.map(({ id, audio, transcript, questions }) => ({
      id,
      audio,
      transcript,
      questions,
    })),
  };
}
async function newSet() {
  return runtime!.createSet(owner, {
    title: "검증 듣기",
    rights,
    basis: "직접 작성한 자료",
  });
}
async function published() {
  let set = await newSet();
  set = await runtime!.reviewSet(owner, set.id, {
    expectedRevision: set.revision,
    kind: "rights",
    basis: "직접 작성 및 배포권",
  });
  const wav = wave();
  const started = await media!.beginUpload(
    { actor: owner },
    {
      setId: set.id,
      totalBytes: wav.length,
      mimeType: "audio/wav",
      expectedSha256: sha(wav),
    },
  );
  const chunk = await media!.appendChunk(
    { actor: owner },
    {
      setId: set.id,
      assetId: started.assetId,
      expectedRevision: started.revision,
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
      assetId: started.assetId,
      expectedRevision: chunk.revision,
    },
  );
  if (ready.state !== "ready") throw new Error("Expected real WAV readiness");
  const group = englishListeningFixture().groups[0];
  const editable = {
    id: group.id,
    audio: group.audio,
    transcript: group.transcript,
    questions: group.questions,
  };
  set = await runtime!.updateSet(owner, set.id, {
    ...edit(set),
    groups: [
      {
        ...editable,
        audio: {
          assetId: ready.assetId,
          sha256: ready.sha256,
          durationMs: ready.durationMs,
        },
      },
    ],
  });
  for (const kind of ["content", "audio", "alignment"])
    set = await runtime!.reviewSet(owner, set.id, {
      expectedRevision: set.revision,
      kind,
      groupId: group.id,
    });
  const publication = await runtime!.publishSet(owner, set.id, {
    expectedRevision: set.revision,
  });
  return { set, publication, assetId: ready.assetId };
}
async function assigned(
  options: {
    mode?: "practice" | "exam";
    audioSource?: "student_device" | "teacher_device";
    policy?: "manual" | "after_submit";
    targets?: string[];
  } = {},
) {
  const p = await published();
  const mode = options.mode ?? "practice";
  const detail = await runtime!.createAssignment(owner, {
    publicationId: p.publication.id,
    classId,
    targetStudentIds: options.targets ?? [studentId],
    mode,
    audioSource: options.audioSource ?? "student_device",
    opensAt: now.toISOString(),
    closesAt: new Date(now.getTime() + 3600000).toISOString(),
    timeLimitSeconds: 600,
    releasePolicy: {
      kind:
        mode === "practice"
          ? "after_unit_answer"
          : (options.policy ?? "after_submit"),
    },
  });
  return { ...p, ...detail, id: detail.assignment.id };
}
async function command(
  id: string,
  detail: ListeningStudentDetail,
  kind: string,
  extra: Record<string, unknown> = {},
  key = randomUUID(),
) {
  return runtime!.studentCommand(learner, id, {
    attemptId: detail.attempt!.id,
    command: {
      kind,
      expectedRevision: detail.attempt!.revision,
      idempotencyKey: key,
      ...extra,
    },
    ...(kind === "start" ? { soundChecked: true } : {}),
  });
}
describe.skipIf(!db)(
  "listening persistent runtime (isolated PostgreSQL)",
  () => {
    beforeAll(async () => {
      // The persistent media store and runtime must share the suite's clock.
      vi.spyOn(Date, "now").mockImplementation(() => now.getTime());
      process.env.ENGLISH_LISTENING_TEACHER_IDS = [teacherId, otherId].join(
        ",",
      );
      process.env.ENGLISH_LISTENING_ENABLED = "true";
      for (const [id, name] of [
        [teacherId, "듣기교사"],
        [otherId, "외부교사"],
      ])
        await db!.user.create({
          data: {
            id,
            email: id + "@listening.test",
            name,
            approvalStatus: "approved",
          },
        });
      for (const [id, userId] of [
        [classId, teacherId],
        [otherClass, otherId],
      ])
        await db!.class.create({
          data: {
            id,
            userId,
            name: "듣기반",
            grade: "중1",
            difficultyRatio: { easy: 1 },
          },
        });
      for (const [id, aid] of [
        [studentId, accountId],
        [student2Id, account2Id],
      ]) {
        await db!.student.create({ data: { id, classId, name: "듣기학생" } });
        await db!.studentAccount.create({
          data: {
            id: aid,
            studentId: id,
            loginId: aid.replaceAll("-", "").slice(0, 20),
            passwordHash: "not-a-login-fixture",
            mustChangePassword: false,
          },
        });
      }
    });
    afterAll(async () => {
      await db?.$disconnect();
      await db2?.$disconnect();
      vi.mocked(Date.now).mockRestore();
    });

    it("searches question metadata with year, round and origin within the actor scope", async () => {
      const source = {
        kind: "other" as const,
        provider: "직접 제작",
        year: 2020,
        round: 2,
        month: null,
        originalFilename: "questions.pdf",
      };
      let set = await runtime!.createSet(owner, {
        title: "원본 듣기",
        level: "중1",
        rights,
        source,
        basis: "isolated source fixture",
      });
      const group = englishListeningFixture().groups[0];
      set = await runtime!.updateSet(owner, set.id, {
        ...edit(set),
        groups: [
          {
            id: group.id,
            audio: null,
            transcript: group.transcript,
            questions: group.questions.map((question) => ({
              ...question,
              metadata: {
                ...listeningQuestionMetadata(
                  { image: {} },
                  { source, level: "중1" },
                ),
                keywords: ["여행_100%"],
              },
            })),
          },
        ],
      });
      const query = {
        q: "여행_100%",
        year: "2020",
        round: "2",
        origin: "official_original",
        level: "중1",
      };
      const result = await runtime!.teacherBank(owner, "bank", query);
      expect(result.data.map((row) => row.id)).toEqual([set.id]);
      expect(result.data[0]).toMatchObject({
        questionCount: 2,
        reconstructedQuestionCount: 0,
        source,
      });
      expect(
        (await runtime!.teacherBank(other, "bank", query)).data,
      ).toHaveLength(0);
      expect(
        (await runtime!.teacherBank(owner, "bank", { ...query, round: "1" }))
          .data,
      ).toHaveLength(0);
      expect(
        (
          await runtime!.teacherBank(owner, "bank", {
            ...query,
            origin: "audio_reconstructed",
          })
        ).data,
      ).toHaveLength(0);
    });

    it("stores incomplete drafts, rejects forged provenance and arbitrates concurrent CAS", async () => {
      const draft = await runtime!.createSet(owner, {
        title: "",
        rights: { rightsStatus: "unknown", allowedUses: [] },
        basis: "",
      });
      expect(draft.document.groups).toEqual([]);
      expect(draft.document.provenance.recordedBy).toBe(teacherId);
      await expect(
        runtime!.createSet(owner, {
          title: "forged",
          rights,
          basis: "x",
          ownerId: otherId,
        }),
      ).rejects.toThrow();
      const group = englishListeningFixture().groups[0];
      const bare = {
        id: group.id,
        audio: group.audio,
        transcript: group.transcript,
        questions: group.questions,
      };
      const data = {
        ...edit(draft),
        groups: [
          {
            ...bare,
            audio: null,
            questions: [
              {
                ...bare.questions[0],
                prompt: "",
                explanation: "",
                answerChoiceId: null,
                evidence: [],
              },
            ],
            transcript: {
              revision: 900,
              text: "",
              spokenText: "",
              translation: null,
            },
          },
        ],
      };
      const race = await Promise.allSettled([
        runtime!.updateSet(owner, draft.id, data),
        otherRuntime!.updateSet(owner, draft.id, data),
      ]);
      expect(race.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(
        (await runtime!.setDetail(owner, draft.id)).document.groups[0]
          .transcript.revision,
      ).toBe(1);
      await expect(runtime!.setDetail(other, draft.id)).rejects.toMatchObject({
        status: 404,
      });
      await expect(
        runtime!.publishSet(owner, draft.id, { expectedRevision: 2 }),
      ).rejects.toThrow();
    });

    it("requires server rights review before storing originals and immutable verified publication", async () => {
      const draft = await newSet();
      const wav = wave();
      await expect(
        media!.beginUpload(
          { actor: owner },
          {
            setId: draft.id,
            totalBytes: wav.length,
            mimeType: "audio/wav",
            expectedSha256: sha(wav),
          },
        ),
      ).rejects.toThrow();
      const p = await published();
      await expect(
        db!.$executeRaw(
          Prisma.sql`UPDATE english_listening_publication SET snapshot=snapshot || '{"contentHash":"bad"}'::jsonb WHERE id=${p.publication.id}::uuid`,
        ),
      ).rejects.toThrow("immutable");
      const edited = await runtime!.updateSet(owner, p.set.id, {
        ...edit(p.set),
        title: "새 초안",
      });
      expect(edited.document.groups[0].reviews.content).toBeNull();
      expect(edited.publications[0].document.title).toBe("검증 듣기");
      await expect(
        runtime!.publishSet(owner, edited.id, {
          expectedRevision: edited.revision,
        }),
      ).rejects.toThrow("review");
    });

    it("prepares once across connections, discloses only complete practice group, and replays durably", async () => {
      const a = await assigned();
      const [prepared, duplicate] = await Promise.all([
        runtime!.prepareStudent(learner, a.id),
        otherRuntime!.prepareStudent(learner, a.id),
      ]);
      expect(duplicate.attempt!.id).toBe(prepared.attempt!.id);
      expect(JSON.stringify(prepared)).not.toMatch(
        /answerChoiceId|explanation|transcript|contentHash|sha256|receipts|ownerId|evidence/,
      );
      let d = await command(a.id, prepared, "start");
      const q = a.publication.document.groups[0].questions;
      d = await command(a.id, d, "answer", {
        phase: "initial",
        questionId: q[0].id,
        choiceId: q[0].answerChoiceId,
      });
      expect(d.view.groups[0].state).toBe("locked");
      const request = {
        attemptId: d.attempt!.id,
        command: {
          kind: "answer",
          expectedRevision: d.attempt!.revision,
          idempotencyKey: randomUUID(),
          phase: "initial",
          questionId: q[1].id,
          choiceId: q[1].answerChoiceId,
        },
      };
      d = await runtime!.studentCommand(learner, a.id, request);
      expect(d.view.groups[0].state).toBe("review");
      const restarted = createListeningRuntime(db2!, clock);
      const replay = await restarted.studentCommand(learner, a.id, request);
      expect(replay.attempt).toEqual(d.attempt);
      expect(d.attempt!.firstAnswers).toHaveLength(2);
      await expect(
        command(a.id, d, "answer", {
          phase: "initial",
          questionId: q[0].id,
          choiceId: q[0].choices[1].id,
        }),
      ).rejects.toThrow("immutable");
      const releases = await db!.$queryRaw<
        { count: bigint }[]
      >`SELECT count(*) FROM english_listening_release WHERE assignment_id=${a.id}::uuid`;
      expect(Number(releases[0].count)).toBe(1);
    });

    it("preserves deadline and answers through CAS races, expired retries and new-request rejection", async () => {
      const a = await assigned();
      let d = await command(
        a.id,
        await runtime!.prepareStudent(learner, a.id),
        "start",
      );
      const originalDeadline = d.attempt!.deadlineAt;
      const q = a.publication.document.groups[0].questions;
      const requests = q.map((question) => ({
        attemptId: d.attempt!.id,
        command: {
          kind: "answer",
          expectedRevision: d.attempt!.revision,
          idempotencyKey: randomUUID(),
          phase: "initial",
          questionId: question.id,
          choiceId: question.answerChoiceId,
        },
      }));
      const race = await Promise.allSettled(
        requests.map((request, index) =>
          (index ? otherRuntime! : runtime!).studentCommand(
            learner,
            a.id,
            request,
          ),
        ),
      );
      const winner = race.findIndex((r) => r.status === "fulfilled");
      expect(race.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const before = now;
      now = new Date(Date.parse(originalDeadline!) + 1000);
      try {
        d = await runtime!.studentCommand(learner, a.id, requests[winner]);
        expect(d.attempt!.deadlineAt).toBe(originalDeadline);
        expect(d.attempt!.firstAnswers).toHaveLength(1);
        expect(d.attempt!.status).toBe("expired");
        await expect(command(a.id, d, "submit")).rejects.toThrow(
          /deadline|Terminal/,
        );
        await expect(
          runtime!.studentCommand(learner, a.id, {
            ...requests[winner],
            command: {
              ...requests[winner].command,
              choiceId: q[winner].choices.find(
                (c) => c.id !== q[winner].answerChoiceId,
              )!.id,
            },
          }),
        ).rejects.toThrow("Idempotency");
      } finally {
        now = before;
      }
    });

    it("rejects class transfer, disabled/password accounts, pilot/menu revocation and cancellation before media metadata", async () => {
      const a = await assigned();
      const prepared = await runtime!.prepareStudent(learner, a.id);
      const started = await command(a.id, prepared, "start");
      const spy = vi.spyOn(store!, "get");
      await db!.student.update({
        where: { id: studentId },
        data: { classId: otherClass },
      });
      await expect(runtime!.studentDetail(learner, a.id)).rejects.toMatchObject(
        { status: 404 },
      );
      spy.mockClear();
      expect(
        (
          await media!.serve(
            { actor: learner, assignmentId: a.id },
            { setId: a.set.id, assetId: a.assetId, method: "HEAD" },
          )
        ).status,
      ).toBe(404);
      expect(spy).not.toHaveBeenCalled();
      await db!.student.update({ where: { id: studentId }, data: { classId } });
      for (const data of [
        { disabledAt: new Date() },
        { disabledAt: null, mustChangePassword: true },
      ]) {
        await db!.studentAccount.update({ where: { id: accountId }, data });
        await expect(
          runtime!.studentDetail(learner, a.id),
        ).rejects.toMatchObject({ status: 404 });
      }
      await db!.studentAccount.update({
        where: { id: accountId },
        data: { disabledAt: null, mustChangePassword: false },
      });
      await db!.user.update({
        where: { id: teacherId },
        data: { disabledMenus: ["english"] },
      });
      await expect(runtime!.studentDetail(learner, a.id)).rejects.toMatchObject(
        { status: 404 },
      );
      await db!.user.update({
        where: { id: teacherId },
        data: { disabledMenus: [] },
      });
      process.env.ENGLISH_LISTENING_ENABLED = "false";
      await expect(runtime!.studentDetail(learner, a.id)).rejects.toMatchObject(
        { status: 404 },
      );
      process.env.ENGLISH_LISTENING_ENABLED = "true";
      await runtime!.mutateAssignment(owner, a.id, "cancel", {
        expectedRevision: 1,
      });
      await expect(command(a.id, started, "submit")).rejects.toMatchObject({
        status: 404,
      });
      expect(
        (await runtime!.assignmentDetail(owner, a.id)).results[0].attempt!
          .status,
      ).toBe("cancelled");
      spy.mockRestore();
    });

    it("binds exact publication asset and refuses another student and teacher-device bytes", async () => {
      const a = await assigned();
      await expect(
        runtime!.studentDetail(learner2, a.id),
      ).rejects.toMatchObject({ status: 404 });
      expect(
        (
          await media!.serve(
            { actor: learner, assignmentId: a.id },
            { setId: a.set.id, assetId: randomUUID(), method: "GET" },
          )
        ).status,
      ).toBe(404);
      const b = await assigned({
        audioSource: "teacher_device",
        targets: [studentId, student2Id],
      });
      await runtime!.mutateAssignment(owner, b.id, "broadcast", {
        expectedRevision: 1,
      });
      const d = await command(
        b.id,
        await runtime!.prepareStudent(learner, b.id),
        "start",
      );
      expect(d.media).toBeUndefined();
      expect(JSON.stringify(d.view)).not.toMatch(/assetId|durationMs|evidence/);
      expect(
        (
          await media!.serve(
            { actor: learner, assignmentId: b.id },
            { setId: b.set.id, assetId: b.assetId, method: "HEAD" },
          )
        ).status,
      ).toBe(404);
      const p2 = await runtime!.prepareStudent(learner2, b.id);
      const d2 = await runtime!.studentCommand(learner2, b.id, {
        attemptId: p2.attempt!.id,
        command: {
          kind: "start",
          expectedRevision: 1,
          idempotencyKey: randomUUID(),
        },
      });
      expect(d2.attempt!.deadlineAt).toBe(d.attempt!.deadlineAt);
      await runtime!.mutateAssignment(owner, b.id, "broadcast", {
        expectedRevision: 2,
        action: "interrupt",
      });
      expect(
        (await runtime!.studentDetail(learner, b.id)).attempt!.status,
      ).toBe("interrupted");
    });

    it("persists pre-attempt manual exposure, target revision history, retry authorization and stale attempt denial", async () => {
      const a = await assigned({ mode: "exam", policy: "manual" });
      await runtime!.mutateAssignment(owner, a.id, "release", {
        expectedRevision: 1,
      });
      const released = await runtime!.studentDetail(learner, a.id);
      expect(released.attempt).toBeNull();
      expect(released.view.groups[0].state).toBe("review");
      let d = await command(
        a.id,
        await runtime!.prepareStudent(learner, a.id),
        "start",
      );
      const oldAttempt = d.attempt!.id;
      d = await command(a.id, d, "interrupt", { reason: "student_connection" });
      await runtime!.mutateAssignment(owner, a.id, "targets", {
        expectedRevision: 2,
        addedStudentIds: [student2Id],
        reason: "전입",
      });
      const detail = await runtime!.assignmentDetail(owner, a.id);
      expect(
        detail.results.find((r) => r.studentId === studentId)!.attempt!
          .assignmentRevision,
      ).toBe(2);
      await runtime!.mutateAssignment(owner, a.id, "retry", {
        expectedRevision: 3,
        studentId,
        previousAttemptId: oldAttempt,
        reason: "통신 복구",
      });
      const retried = await runtime!.studentDetail(learner, a.id);
      expect(retried.attempt!.id).not.toBe(oldAttempt);
      expect(retried.view.groups[0].state).toBe("review");
      await expect(
        runtime!.studentCommand(learner, a.id, {
          attemptId: oldAttempt,
          command: {
            kind: "start",
            expectedRevision: 1,
            idempotencyKey: randomUUID(),
          },
          soundChecked: true,
        }),
      ).rejects.toThrow("식별자");
      const target2 = await runtime!.prepareStudent(learner2, a.id);
      expect(target2.attempt).not.toBeNull();
      const history = await db!.$queryRaw<
        { count: bigint }[]
      >`SELECT count(*) FROM english_listening_attempt WHERE assignment_id=${a.id}::uuid AND student_id=${studentId}::uuid`;
      expect(Number(history[0].count)).toBe(2);
    });

    it("persists editable exam drafts and freezes submitted answers across a new connection", async () => {
      const a = await assigned({ mode: "exam" });
      let d = await command(
        a.id,
        await runtime!.prepareStudent(learner, a.id),
        "start",
      );
      const q = a.publication.document.groups[0].questions[0];
      const wrong = q.choices.find((c) => c.id !== q.answerChoiceId)!.id;
      d = await command(a.id, d, "answer", {
        phase: "initial",
        questionId: q.id,
        choiceId: wrong,
      });
      expect(d.attempt!.firstAnswers).toEqual([]);
      expect(d.attempt!.draftAnswers![0].choiceId).toBe(wrong);
      d = await command(a.id, d, "answer", {
        phase: "initial",
        questionId: q.id,
        choiceId: q.answerChoiceId,
      });
      expect(
        (await otherRuntime!.studentDetail(learner, a.id)).attempt!
          .draftAnswers![0].choiceId,
      ).toBe(q.answerChoiceId);
      d = await command(a.id, d, "submit");
      const submitted = d.attempt!.submittedAt;
      expect(d.attempt!.firstAnswers[0].choiceId).toBe(q.answerChoiceId);
      expect(d.view.groups[0].state).toBe("review");
      d = await command(a.id, d, "answer", {
        phase: "review",
        questionId: q.id,
        choiceId: wrong,
      });
      expect(d.attempt!.firstAnswers[0].choiceId).toBe(q.answerChoiceId);
      expect(d.attempt!.submittedAt).toBe(submitted);
      expect(
        (await runtime!.assignmentDetail(owner, a.id)).results[0].grade!
          .correct,
      ).toBe(1);
    });

    it("revokes old publication access when current distribution rights are removed", async () => {
      const a = await assigned();
      await runtime!.prepareStudent(learner, a.id);
      const current = await runtime!.setDetail(owner, a.set.id);
      await runtime!.updateSet(owner, a.set.id, {
        ...edit(current),
        rights: { rightsStatus: "unknown", allowedUses: [] },
      });
      await expect(runtime!.studentDetail(learner, a.id)).rejects.toMatchObject(
        { status: 404 },
      );
      const spy = vi.spyOn(store!, "get");
      expect(
        (
          await media!.serve(
            { actor: learner, assignmentId: a.id },
            {
              setId: a.set.id,
              assetId: a.assetId,
              method: "GET",
              range: "bytes=0-99",
            },
          )
        ).status,
      ).toBe(404);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("gives branch managers own-branch resources while excluding another branch and forged class targets", async () => {
      const branchA = await db!.branch.create({ data: { name: "듣기A" } });
      const branchB = await db!.branch.create({ data: { name: "듣기B" } });
      const managerId = randomUUID(),
        branchTeacherId = randomUUID(),
        foreignId = randomUUID();
      process.env.ENGLISH_LISTENING_TEACHER_IDS += `,${managerId},${branchTeacherId},${foreignId}`;
      for (const [id, branchId, isAdmin] of [
        [managerId, branchA.id, true],
        [branchTeacherId, branchA.id, false],
        [foreignId, branchB.id, false],
      ] as const)
        await db!.user.create({
          data: {
            id,
            email: id + "@listening.test",
            name: "지점교사",
            branchId,
            isAdmin,
            approvalStatus: "approved",
          },
        });
      const t: ListeningActor = { kind: "teacher", userId: branchTeacherId },
        m: ListeningActor = { kind: "teacher", userId: managerId };
      const draft = await runtime!.createSet(t, {
        title: "A",
        rights,
        basis: "자체",
      });
      expect((await runtime!.setDetail(m, draft.id)).id).toBe(draft.id);
      await expect(
        runtime!.setDetail({ kind: "teacher", userId: foreignId }, draft.id),
      ).rejects.toMatchObject({ status: 404 });
      const a = await assigned();
      await expect(
        runtime!.createAssignment(owner, {
          publicationId: a.publication.id,
          classId: otherClass,
          targetStudentIds: [studentId],
          mode: "practice",
          audioSource: "student_device",
          opensAt: now.toISOString(),
          closesAt: new Date(now.getTime() + 3600000).toISOString(),
          timeLimitSeconds: null,
          releasePolicy: { kind: "after_unit_answer" },
        }),
      ).rejects.toMatchObject({ status: 404 });
    });
  },
);
