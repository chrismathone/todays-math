// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { ListeningAttemptCommand } from "@/contracts/englishListening.contract";
import {
  createListeningAttempt,
  transitionListeningAttempt,
  gradeListeningAnswers,
} from "@/lib/english/listening/attempt";
import {
  englishListeningAssignmentFixture,
  englishListeningPublicationFixture,
  listeningFixtureIds,
  listeningFixtureNow,
} from "@/mocks/englishListeningFixture";

function setup(exam = false) {
  const publication = englishListeningPublicationFixture();
  const assignment = englishListeningAssignmentFixture();
  if (exam) {
    assignment.mode = "exam";
    assignment.releasePolicy = { kind: "at_time", at: assignment.closesAt };
  }
  const attempt = createListeningAttempt(publication, assignment, {
    id: listeningFixtureIds.attempt,
    studentId: listeningFixtureIds.student,
    now: listeningFixtureNow,
  });
  const context = {
    now: listeningFixtureNow,
    soundChecked: true,
    audioReady: true,
  };
  const started = transitionListeningAttempt(
    publication,
    assignment,
    attempt,
    { kind: "start", expectedRevision: 1, idempotencyKey: "start" },
    context,
  );
  const question = publication.document.groups[0].questions[0];
  const answer: ListeningAttemptCommand = {
    kind: "answer",
    phase: "initial",
    questionId: question.id,
    choiceId: question.answerChoiceId,
    expectedRevision: started.revision,
    idempotencyKey: "answer-1",
  };
  return {
    publication,
    assignment,
    attempt,
    context,
    started,
    question,
    answer,
  };
}

describe("server-clock attempt transitions", () => {
  it("rejects foreign server context identity before new commands and receipt replay", () => {
    const { publication, assignment, started, answer, context } = setup();
    const foreign = { ...context, studentId: listeningFixtureIds.retry };
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        started,
        answer,
        foreign,
      ),
    ).toThrow(/student binding/i);
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        started,
        { kind: "start", expectedRevision: 1, idempotencyKey: "start" },
        foreign,
      ),
    ).toThrow(/student binding/i);
  });
  it("records release at initial-answer save and reports known exposure separately", () => {
    const { publication, assignment, started, context, answer } = setup(true);
    assignment.releasePolicy = { kind: "at_time", at: context.now };
    const saved = transitionListeningAttempt(
      publication,
      assignment,
      started,
      answer,
      context,
    );
    expect(saved.firstAnswers[0].savedAfterRelease).toBe(true);
    expect(
      gradeListeningAnswers(publication, saved.firstAnswers),
    ).toMatchObject({ savedAfterRelease: 1, releaseStatusUnknown: 0 });
    const hidden = setup();
    const unexposed = transitionListeningAttempt(
      hidden.publication,
      hidden.assignment,
      hidden.started,
      hidden.answer,
      hidden.context,
    );
    expect(unexposed.firstAnswers[0].savedAfterRelease).toBe(false);
    const legacyAnswer = {
      questionId: saved.firstAnswers[0].questionId,
      choiceId: saved.firstAnswers[0].choiceId,
      savedAt: saved.firstAnswers[0].savedAt,
    };
    expect(gradeListeningAnswers(publication, [legacyAnswer])).toMatchObject({
      savedAfterRelease: 0,
      releaseStatusUnknown: 1,
    });
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        started,
        { ...answer, savedAfterRelease: false },
        context,
      ),
    ).toThrow();
  });
  it("records administrative cancellation after assignment revocation while denying answer writes", () => {
    const { publication, assignment, started, context, answer } = setup();
    const revoked = { ...assignment, cancelledAt: context.now };
    expect(() =>
      transitionListeningAttempt(
        publication,
        revoked,
        started,
        answer,
        context,
      ),
    ).toThrow(/revoked/i);
    const command = {
      kind: "cancel",
      expectedRevision: started.revision,
      idempotencyKey: "revoke",
    };
    const cancelled = transitionListeningAttempt(
      publication,
      revoked,
      started,
      command,
      context,
    );
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.firstAnswers).toEqual(started.firstAnswers);
    expect(
      transitionListeningAttempt(
        publication,
        revoked,
        cancelled,
        command,
        context,
      ),
    ).toEqual(cancelled);
    expect(() =>
      transitionListeningAttempt(
        publication,
        revoked,
        cancelled,
        answer,
        context,
      ),
    ).toThrow();
  });
  it("does not start the timer before sound readiness; reload/start cannot extend it", () => {
    const { publication, assignment, attempt, context, started } = setup();
    expect(attempt.deadlineAt).toBeNull();
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        attempt,
        { kind: "start", expectedRevision: 1, idempotencyKey: "start" },
        { ...context, soundChecked: false },
      ),
    ).toThrow(/ready/i);
    expect(started.deadlineAt).toBe("2026-10-03T00:10:00.000Z");
    const duplicate = transitionListeningAttempt(
      publication,
      assignment,
      started,
      { kind: "start", expectedRevision: 1, idempotencyKey: "start" },
      { ...context, now: "2026-10-03T00:05:00.000Z" },
    );
    expect(duplicate).toEqual(started);
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        started,
        {
          kind: "start",
          expectedRevision: started.revision,
          idempotencyKey: "again",
        },
        context,
      ),
    ).toThrow();
  });

  it("uses teacher start for broadcast attempts without requiring student media", () => {
    const { publication, assignment, attempt, context } = setup();
    assignment.audioSource = "teacher_device";
    const command = {
      kind: "start",
      expectedRevision: 1,
      idempotencyKey: "teacher-start",
    } as const;
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        attempt,
        command,
        context,
      ),
    ).toThrow();
    const broadcast = {
      schemaVersion: 1 as const,
      id: listeningFixtureIds.retry,
      assignmentId: assignment.id,
      publicationId: publication.id,
      participantStudentIds: [attempt.studentId],
      startedAt: context.now,
      deadlineAt: "2026-10-03T00:07:00.000Z",
    };
    const started = transitionListeningAttempt(
      publication,
      assignment,
      attempt,
      command,
      {
        now: "2026-10-03T00:01:00.000Z",
        audioReady: false,
        soundChecked: false,
        broadcast,
      },
    );
    expect(started.status).toBe("in_progress");
    expect(started.startedAt).toBe(context.now);
    expect(started.deadlineAt).toBe(broadcast.deadlineAt);
    expect(started.broadcastSessionId).toBe(broadcast.id);
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        started,
        {
          kind: "interrupt",
          reason: "student_playback",
          expectedRevision: started.revision,
          idempotencyKey: "fail",
        },
        { ...context, now: started.updatedAt },
      ),
    ).toThrow(/source mismatch/i);
  });

  it("rejects stale tabs, key reuse with different bodies, and rewriting first answers", () => {
    const { publication, assignment, started, context, answer, question } =
      setup();
    const saved = transitionListeningAttempt(
      publication,
      assignment,
      started,
      answer,
      context,
    );
    expect(started.firstAnswers).toEqual([]);
    expect(saved.firstAnswers).toHaveLength(1);
    expect(Object.isFrozen(saved.firstAnswers[0])).toBe(true);
    expect(
      transitionListeningAttempt(
        publication,
        assignment,
        saved,
        answer,
        context,
      ),
    ).toEqual(saved);
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        saved,
        { ...answer, idempotencyKey: "stale" },
        context,
      ),
    ).toThrow(/revision/i);
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        saved,
        { ...answer, choiceId: question.choices[1].id },
        context,
      ),
    ).toThrow(/idempotency/i);
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        saved,
        {
          ...answer,
          idempotencyKey: "overwrite",
          expectedRevision: saved.revision,
          choiceId: question.choices[1].id,
        },
        context,
      ),
    ).toThrow(/first answer/i);
  });

  it("rejects new writes at the exact deadline but replays previously accepted requests", () => {
    const { publication, assignment, started, context, answer } = setup();
    const saved = transitionListeningAttempt(
      publication,
      assignment,
      started,
      answer,
      context,
    );
    const late = { ...context, now: started.deadlineAt! };
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        started,
        answer,
        late,
      ),
    ).toThrow(/deadline/i);
    expect(
      transitionListeningAttempt(publication, assignment, saved, answer, late),
    ).toEqual(saved);
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        saved,
        {
          kind: "submit",
          expectedRevision: saved.revision,
          idempotencyKey: "late",
        },
        late,
      ),
    ).toThrow(/deadline/i);
    const expired = transitionListeningAttempt(
      publication,
      assignment,
      saved,
      {
        kind: "expire",
        expectedRevision: saved.revision,
        idempotencyKey: "expire",
      },
      late,
    );
    expect(expired.status).toBe("expired");
    expect(expired.firstAnswers).toEqual(saved.firstAnswers);
  });

  it("returns one immutable submission for duplicate retries, including after deadline", () => {
    const { publication, assignment, started, context } = setup(true);
    const command = {
      kind: "submit",
      expectedRevision: started.revision,
      idempotencyKey: "submit",
    } as const;
    const submitted = transitionListeningAttempt(
      publication,
      assignment,
      started,
      command,
      context,
    );
    expect(submitted.status).toBe("submitted");
    expect(
      transitionListeningAttempt(publication, assignment, submitted, command, {
        ...context,
        now: assignment.closesAt,
      }),
    ).toEqual(submitted);
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        submitted,
        {
          ...command,
          expectedRevision: submitted.revision,
          idempotencyKey: "second",
        },
        context,
      ),
    ).toThrow();
  });

  it("blocks review answers until group release and keeps first-answer grades separate", () => {
    const { publication, assignment, started, context, answer } = setup();
    let saved = transitionListeningAttempt(
      publication,
      assignment,
      started,
      answer,
      context,
    );
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        saved,
        {
          ...answer,
          phase: "review",
          expectedRevision: saved.revision,
          idempotencyKey: "review-early",
        },
        context,
      ),
    ).toThrow(/released/i);
    const second = publication.document.groups[0].questions[1];
    saved = transitionListeningAttempt(
      publication,
      assignment,
      saved,
      {
        ...answer,
        questionId: second.id,
        choiceId: second.choices[0].id,
        expectedRevision: saved.revision,
        idempotencyKey: "second",
      },
      context,
    );
    saved = transitionListeningAttempt(
      publication,
      assignment,
      saved,
      {
        ...answer,
        phase: "review",
        questionId: second.id,
        choiceId: second.answerChoiceId,
        expectedRevision: saved.revision,
        idempotencyKey: "review",
      },
      context,
    );
    const grade = gradeListeningAnswers(publication, saved.firstAnswers);
    expect(grade).toMatchObject({
      correct: 1,
      incorrect: 1,
      unanswered: 1,
      total: 3,
    });
    expect(saved.reviewAnswers).toHaveLength(1);
    expect(() =>
      gradeListeningAnswers(publication, [
        ...saved.firstAnswers,
        saved.firstAnswers[0],
      ]),
    ).toThrow();
  });

  it("keeps interruption terminal and requires an explicit linked teacher-authorized retry", () => {
    const { publication, assignment, started, context } = setup();
    const interrupted = transitionListeningAttempt(
      publication,
      assignment,
      started,
      {
        kind: "interrupt",
        reason: "student_connection",
        expectedRevision: started.revision,
        idempotencyKey: "interruption",
      },
      context,
    );
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        interrupted,
        {
          kind: "start",
          expectedRevision: interrupted.revision,
          idempotencyKey: "resume",
        },
        context,
      ),
    ).toThrow();
    const retry = createListeningAttempt(publication, assignment, {
      id: listeningFixtureIds.retry,
      studentId: listeningFixtureIds.student,
      now: context.now,
      previousAttempt: interrupted,
      retryAuthorization: {
        authorizedBy: listeningFixtureIds.owner,
        reason: "연결 중단 후 재응시",
      },
    });
    expect(retry.retry?.previousAttemptId).toBe(interrupted.id);
    expect(retry.firstAnswers).toEqual([]);
  });

  it("rejects revoked assignments, mismatched publications, unassigned students and client timestamps", () => {
    const { publication, assignment, started, context, answer } = setup();
    expect(() =>
      transitionListeningAttempt(
        publication,
        { ...assignment, cancelledAt: context.now },
        started,
        answer,
        context,
      ),
    ).toThrow();
    expect(() =>
      transitionListeningAttempt(
        publication,
        { ...assignment, publicationId: listeningFixtureIds.retry },
        started,
        answer,
        context,
      ),
    ).toThrow();
    expect(() =>
      createListeningAttempt(publication, assignment, {
        id: listeningFixtureIds.retry,
        studentId: listeningFixtureIds.owner,
        now: context.now,
      }),
    ).toThrow();
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        started,
        { ...answer, submittedAt: context.now },
        context,
      ),
    ).toThrow();
  });

  it("rejects corrupted saved states and unsupported versions before replay or release", () => {
    const { publication, assignment, started, context, answer } = setup();
    const saved = transitionListeningAttempt(
      publication,
      assignment,
      started,
      answer,
      context,
    );
    const corrupted = structuredClone(saved);
    corrupted.firstAnswers[0].savedAt = saved.deadlineAt!;
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        corrupted,
        answer,
        context,
      ),
    ).toThrow();
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        { ...saved, schemaVersion: 2 },
        answer,
        context,
      ),
    ).toThrow();
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        saved,
        {
          kind: "submit",
          expectedRevision: saved.revision,
          idempotencyKey: "bad-clock",
        },
        { ...context, now: "2026-10-02T23:59:59.000Z" },
      ),
    ).toThrow(/clock/i);
  });

  it("allows released review after submission and deadline without altering first answers or submission time", () => {
    const { publication, assignment, started, context, answer } = setup();
    let saved = transitionListeningAttempt(
      publication,
      assignment,
      started,
      answer,
      context,
    );
    const second = publication.document.groups[0].questions[1];
    saved = transitionListeningAttempt(
      publication,
      assignment,
      saved,
      {
        ...answer,
        questionId: second.id,
        choiceId: second.choices[0].id,
        expectedRevision: saved.revision,
        idempotencyKey: "a2",
      },
      context,
    );
    const submitted = transitionListeningAttempt(
      publication,
      assignment,
      saved,
      {
        kind: "submit",
        expectedRevision: saved.revision,
        idempotencyKey: "submit",
      },
      context,
    );
    const reviewCommand = {
      ...answer,
      phase: "review" as const,
      questionId: second.id,
      choiceId: second.answerChoiceId,
      expectedRevision: submitted.revision,
      idempotencyKey: "late-review",
    };
    const reviewed = transitionListeningAttempt(
      publication,
      assignment,
      submitted,
      reviewCommand,
      { now: "2026-10-04T00:00:00.000Z" },
    );
    expect(reviewed.status).toBe("submitted");
    expect(reviewed.submittedAt).toBe(submitted.submittedAt);
    expect(reviewed.firstAnswers).toEqual(submitted.firstAnswers);
    expect(reviewed.reviewAnswers[0].choiceId).toBe(second.answerChoiceId);
    expect(gradeListeningAnswers(publication, reviewed.firstAnswers)).toEqual(
      gradeListeningAnswers(publication, submitted.firstAnswers),
    );
    expect(() =>
      transitionListeningAttempt(
        publication,
        assignment,
        submitted,
        { ...reviewCommand, phase: "initial" },
        { now: "2026-10-04T00:00:00.000Z" },
      ),
    ).toThrow();
  });
});
