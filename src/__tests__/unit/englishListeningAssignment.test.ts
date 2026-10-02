// @vitest-environment node
import { describe, expect, it } from "vitest";
import { appendListeningAssignmentTargets } from "@/lib/english/listening/assignment";
import {
  createListeningAttempt,
  transitionListeningAttempt,
} from "@/lib/english/listening/attempt";
import {
  englishListeningAssignmentFixture,
  englishListeningPublicationFixture,
  listeningFixtureIds,
  listeningFixtureNow,
} from "@/mocks/englishListeningFixture";

describe("immutable assignment target additions", () => {
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
