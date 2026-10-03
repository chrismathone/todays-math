// @vitest-environment node
import { describe, expect, it } from "vitest";
import { appendListeningAssignmentTargets } from "@/lib/english/listening/assignment";
import {
  createListeningAttempt,
  transitionListeningAttempt,
} from "@/lib/english/listening/attempt";
import { projectListeningStudentView } from "@/lib/english/listening/projection";
import {
  englishListeningAssignmentFixture,
  englishListeningPublicationFixture,
  listeningFixtureIds,
  listeningFixtureNow,
} from "@/mocks/englishListeningFixture";

describe("immutable assignment target additions", () => {
  it("starts an old attempt in a trusted broadcast that also includes newly added students", () => {
    const original = {
      ...englishListeningAssignmentFixture(),
      audioSource: "teacher_device" as const,
    };
    const publication = englishListeningPublicationFixture();
    const attempt = createListeningAttempt(publication, original, {
      id: listeningFixtureIds.attempt,
      studentId: listeningFixtureIds.student,
      now: listeningFixtureNow,
    });
    const result = appendListeningAssignmentTargets(original, {
      expectedRevision: original.revision,
      addedStudentIds: [listeningFixtureIds.retry],
      addedBy: listeningFixtureIds.owner,
      addedAt: listeningFixtureNow,
      reason: "전입",
    });
    const context = {
      now: listeningFixtureNow,
      broadcast: {
        schemaVersion: 1 as const,
        id: listeningFixtureIds.retry,
        assignmentId: original.id,
        publicationId: publication.id,
        participantStudentIds: result.assignment.targetStudentIds,
        startedAt: listeningFixtureNow,
        deadlineAt: "2026-10-03T00:07:00.000Z",
      },
    };
    const command = {
      kind: "start",
      expectedRevision: attempt.revision,
      idempotencyKey: "broadcast",
    };
    const started = transitionListeningAttempt(
      publication,
      result.previous,
      attempt,
      command,
      context,
    );
    expect(started.status).toBe("in_progress");
    expect(started.deadlineAt).toBe(context.broadcast.deadlineAt);
    expect(() =>
      transitionListeningAttempt(
        publication,
        result.previous,
        attempt,
        command,
        {
          ...context,
          broadcast: {
            ...context.broadcast,
            participantStudentIds: [listeningFixtureIds.retry],
          },
        },
      ),
    ).toThrow(/broadcast binding/i);
  });
  it("preserves the revision used by existing attempts and audits new recipients", () => {
    const original = englishListeningAssignmentFixture();
    const publication = englishListeningPublicationFixture();
    const attempt = createListeningAttempt(publication, original, {
      id: listeningFixtureIds.attempt,
      studentId: listeningFixtureIds.student,
      now: listeningFixtureNow,
    });
    const result = appendListeningAssignmentTargets(original, {
      expectedRevision: original.revision,
      addedStudentIds: [listeningFixtureIds.retry],
      addedBy: listeningFixtureIds.owner,
      addedAt: listeningFixtureNow,
      reason: "전입 학생 추가",
    });
    expect(result.previous).toEqual(original);
    expect(result.assignment.revision).toBe(original.revision + 1);
    expect(original.targetStudentIds).not.toContain(listeningFixtureIds.retry);
    expect(result.assignment.targetStudentIds).toContain(
      listeningFixtureIds.retry,
    );
    expect(result.audit).toMatchObject({
      previousRevision: original.revision,
      revision: result.assignment.revision,
      addedStudentIds: [listeningFixtureIds.retry],
    });
    expect(Object.isFrozen(result.previous.targetStudentIds)).toBe(true);
    const command = {
      kind: "start",
      expectedRevision: 1,
      idempotencyKey: "start",
    };
    const context = {
      now: listeningFixtureNow,
      soundChecked: true,
      audioReady: true,
    };
    const started = transitionListeningAttempt(
      publication,
      result.previous,
      attempt,
      command,
      context,
    );
    const question = publication.document.groups[0].questions[0];
    const saved = transitionListeningAttempt(
      publication,
      result.previous,
      started,
      {
        kind: "answer",
        phase: "initial",
        questionId: question.id,
        choiceId: question.choices[0].id,
        expectedRevision: started.revision,
        idempotencyKey: "answer-after-target-addition",
      },
      context,
    );
    expect(saved.firstAnswers).toHaveLength(1);
    expect(
      projectListeningStudentView(publication, result.previous, saved, {
        now: context.now,
      }).groups[0].state,
    ).toBe("locked");
    expect(
      transitionListeningAttempt(
        publication,
        result.previous,
        started,
        command,
        context,
      ),
    ).toEqual(started);
    expect(() =>
      transitionListeningAttempt(
        publication,
        result.assignment,
        started,
        command,
        context,
      ),
    ).toThrow(/binding/i);
    const added = createListeningAttempt(publication, result.assignment, {
      id: listeningFixtureIds.retry,
      studentId: listeningFixtureIds.retry,
      now: listeningFixtureNow,
    });
    expect(added.assignmentRevision).toBe(result.assignment.revision);
  });

  it("rejects stale revisions, duplicate or existing recipients, and revoked assignments", () => {
    const original = englishListeningAssignmentFixture();
    const options = {
      expectedRevision: original.revision,
      addedStudentIds: [listeningFixtureIds.retry],
      addedBy: listeningFixtureIds.owner,
      addedAt: listeningFixtureNow,
      reason: "전입",
    };
    expect(() =>
      appendListeningAssignmentTargets(original, {
        ...options,
        expectedRevision: 0,
      }),
    ).toThrow();
    expect(() =>
      appendListeningAssignmentTargets(original, {
        ...options,
        addedStudentIds: original.targetStudentIds,
      }),
    ).toThrow();
    expect(() =>
      appendListeningAssignmentTargets(original, {
        ...options,
        addedStudentIds: [listeningFixtureIds.retry, listeningFixtureIds.retry],
      }),
    ).toThrow();
    expect(() =>
      appendListeningAssignmentTargets(
        { ...original, cancelledAt: listeningFixtureNow },
        options,
      ),
    ).toThrow();
  });
});
