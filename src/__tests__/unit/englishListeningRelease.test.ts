// @vitest-environment node
import { describe, expect, it } from "vitest";
import { englishListeningStudentViewSchema } from "@/contracts/englishListeningStudent.contract";
import {
  createListeningAttempt,
  transitionListeningAttempt,
} from "@/lib/english/listening/attempt";
import { decideListeningRelease } from "@/lib/english/listening/release";
import { projectListeningStudentView } from "@/lib/english/listening/projection";
import {
  englishListeningAssignmentFixture,
  englishListeningPublicationFixture,
  listeningFixtureIds,
  listeningFixtureNow,
} from "@/mocks/englishListeningFixture";

function setup() {
  const publication = englishListeningPublicationFixture();
  const assignment = englishListeningAssignmentFixture();
  const context = {
    now: listeningFixtureNow,
    audioReady: true,
    soundChecked: true,
  };
  let attempt = createListeningAttempt(publication, assignment, {
    id: listeningFixtureIds.attempt,
    studentId: listeningFixtureIds.student,
    now: context.now,
  });
  attempt = transitionListeningAttempt(
    publication,
    assignment,
    attempt,
    { kind: "start", expectedRevision: 1, idempotencyKey: "start" },
    context,
  );
  return { publication, assignment, context, attempt };
}

describe("single server release decision and student allowlist projection", () => {
  it("keeps the complete shared group locked until all initial answers exist", () => {
    const { publication, assignment, context, attempt } = setup();
    const group = publication.document.groups[0];
    const first = group.questions[0];
    let saved = transitionListeningAttempt(
      publication,
      assignment,
      attempt,
      {
        kind: "answer",
        phase: "initial",
        questionId: first.id,
        choiceId: first.answerChoiceId,
        expectedRevision: attempt.revision,
        idempotencyKey: "a1",
      },
      context,
    );
    const locked = projectListeningStudentView(publication, assignment, saved, {
      now: context.now,
    });
    expect(locked.groups.map((group) => group.state)).toEqual([
      "locked",
      "locked",
    ]);
    expect(JSON.stringify(locked)).not.toMatch(
      /answerChoiceId|explanation|transcript|evidence|spokenText|reviews|rights|ownerId|sha256/,
    );
    expect(JSON.stringify(locked)).toContain(first.choices[0].text);
    const second = group.questions[1];
    saved = transitionListeningAttempt(
      publication,
      assignment,
      saved,
      {
        kind: "answer",
        phase: "initial",
        questionId: second.id,
        choiceId: second.answerChoiceId,
        expectedRevision: saved.revision,
        idempotencyKey: "a2",
      },
      context,
    );
    const mixed = projectListeningStudentView(publication, assignment, saved, {
      now: context.now,
    });
    expect(mixed.groups.map((group) => group.state)).toEqual([
      "review",
      "locked",
    ]);
    expect(englishListeningStudentViewSchema.safeParse(mixed).success).toBe(
      true,
    );
    expect(JSON.stringify(mixed.groups[1])).not.toMatch(
      /answerChoiceId|explanation|transcript|evidence/,
    );
  });

  it("strictly rejects secret fields injected into a locked student item", () => {
    const { publication, assignment, context, attempt } = setup();
    const view = JSON.parse(
      JSON.stringify(
        projectListeningStudentView(publication, assignment, attempt, {
          now: context.now,
        }),
      ),
    );
    view.groups[0].questions[0].answerChoiceId =
      publication.document.groups[0].questions[0].answerChoiceId;
    expect(englishListeningStudentViewSchema.safeParse(view).success).toBe(
      false,
    );
  });

  it("excludes every audio reference for teacher broadcasts, even during review", () => {
    const { publication, assignment, context, attempt } = setup();
    assignment.audioSource = "teacher_device";
    assignment.mode = "exam";
    assignment.releasePolicy = { kind: "at_time", at: context.now };
    const view = projectListeningStudentView(publication, assignment, attempt, {
      now: context.now,
    });
    expect(view.groups.every((group) => group.state === "review")).toBe(true);
    expect(JSON.stringify(view)).not.toMatch(
      /assetId|sha256|durationMs|"audio"|evidence/,
    );
    const tampered = JSON.parse(JSON.stringify(view));
    tampered.groups[0].audio = {
      assetId: publication.document.groups[0].audio.assetId,
    };
    expect(englishListeningStudentViewSchema.safeParse(tampered).success).toBe(
      false,
    );
  });

  it("implements exam time, submit, manual, never and preserves past release evidence", () => {
    const { publication, assignment, context, attempt } = setup();
    assignment.mode = "exam";
    assignment.releasePolicy = { kind: "at_time", at: assignment.closesAt };
    expect(
      decideListeningRelease(publication, assignment, attempt, {
        now: context.now,
      }).every((group) => !group.released),
    ).toBe(true);
    expect(
      decideListeningRelease(publication, assignment, attempt, {
        now: assignment.closesAt,
      }).every((group) => group.released),
    ).toBe(true);
    assignment.releasePolicy = { kind: "after_submit" };
    expect(
      decideListeningRelease(publication, assignment, attempt, {
        now: context.now,
      })[0].released,
    ).toBe(false);
    const submitted = transitionListeningAttempt(
      publication,
      assignment,
      attempt,
      {
        kind: "submit",
        expectedRevision: attempt.revision,
        idempotencyKey: "submit",
      },
      context,
    );
    expect(
      decideListeningRelease(publication, assignment, submitted, {
        now: context.now,
      })[0],
    ).toMatchObject({ released: true, earlyExposure: true });
    assignment.releasePolicy = { kind: "manual" };
    expect(
      decideListeningRelease(publication, assignment, attempt, {
        now: context.now,
      })[0].released,
    ).toBe(false);
    expect(
      decideListeningRelease(publication, assignment, attempt, {
        now: context.now,
        manualRelease: {
          assignmentId: assignment.id,
          publicationId: publication.id,
          releasedBy: listeningFixtureIds.owner,
          releasedAt: context.now,
        },
      })[0].released,
    ).toBe(true);
    assignment.releasePolicy = { kind: "never" };
    expect(
      decideListeningRelease(publication, assignment, submitted, {
        now: context.now,
      })[0].released,
    ).toBe(false);
    const history = {
      assignmentId: assignment.id,
      publicationId: publication.id,
      studentId: attempt.studentId,
      groupId: publication.document.groups[0].id,
      releasedAt: context.now,
    };
    expect(
      decideListeningRelease(publication, assignment, attempt, {
        now: context.now,
        releaseHistory: [history],
      }).map((group) => group.released),
    ).toEqual([true, false]);
    expect(() =>
      decideListeningRelease(publication, assignment, attempt, {
        now: context.now,
        releaseHistory: [{ ...history, studentId: listeningFixtureIds.owner }],
      }),
    ).toThrow();
  });
});
