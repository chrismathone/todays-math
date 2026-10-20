// @vitest-environment node
/**
 * Consensus 2026-10-20 Q1: the preview card opens by itself only on a section's
 * first lesson; a relearn day offers it behind a button. The server knows from
 * `progress[sectionId].completedSessions` (never trimmed, unlike `history`) and
 * tells only screens that send `x-course-relearn: 1` — older tabs parse strictly.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  COURSE_RELEARN_HEADER,
  courseStudentResponseSchema,
  type CourseAttemptInput,
} from "@/contracts/mathSrsCourse.contract";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import {
  emptyCourseState,
  revealCourseHint,
  setCoursePlan,
  startAutomaticCourse,
  submitCourseAttempt,
  type StoredCourse,
} from "@/lib/math-srs/courseAutomation";
import { courseStudentDto } from "@/lib/math-srs/courseServer";
import { emptySrsState } from "@/lib/math-srs/serverState";

const now = new Date("2026-09-22T16:00:00.000Z");
const later = new Date(now.getTime() + 86_400_000);
const student = {
  id: randomUUID(),
  name: "학생",
  classId: randomUUID(),
  class: { id: randomUUID(), name: "초3" },
  studentAccount: { id: randomUUID(), disabledAt: null },
};
const configured = () =>
  setCoursePlan(
    emptyCourseState(),
    {
      startSectionId: COURSE_SECTIONS[0].id,
      dailyQuestionCount: 10,
      enabled: true,
      expectedRevision: 0,
    },
    now,
  );
const start = (state: StoredCourse, at = now, seed = 71) =>
  startAutomaticCourse(state, at, seed, randomUUID);

function answer(state: StoredCourse, at: Date, wrong: boolean) {
  const session = state.learner.session!;
  const problem = session.problems[session.attempts.length];
  let input: CourseAttemptInput = {
    sessionId: session.id,
    problemId: problem.id,
    submittedAnswer: problem.answer,
  };
  if (wrong) input = { ...input, submittedAnswer: "", giveUp: true };
  else if (problem.input.mode === "self-check") {
    state = revealCourseHint(state, input);
    input = { ...input, selfCorrect: true };
  }
  return submitCourseAttempt(state, input, at);
}
function finish(state: StoredCourse, at: Date, wrong: boolean) {
  while (!state.learner.session!.completedAt) state = answer(state, at, wrong);
  while (
    state.learner.session!.retry &&
    !state.learner.session!.retry.completedAt
  ) {
    const session = state.learner.session!;
    const problem = session.problems.find(
      (p) => p.id === session.retry!.pendingProblemIds[0],
    )!;
    const input: CourseAttemptInput = {
      sessionId: session.id,
      problemId: problem.id,
      submittedAnswer: wrong ? "" : problem.answer,
      retryIndex: session.retry!.attempts.length,
      ...(wrong
        ? { giveUp: true }
        : problem.input.mode === "self-check"
          ? { selfCorrect: true }
          : {}),
    };
    if (!wrong && problem.input.mode === "self-check")
      state = revealCourseHint(state, input);
    state = submitCourseAttempt(state, input, at);
  }
  return state;
}
const dto = (course: StoredCourse, relearn?: boolean) => {
  const data = courseStudentDto(
    student,
    { revision: 1, state: { ...emptySrsState(), course } },
    later,
    undefined,
    relearn === undefined ? {} : { followUp: true, relearn },
  );
  expect(courseStudentResponseSchema.safeParse({ data }).success).toBe(true);
  return data.session;
};

describe("relearn flag for the preview card", () => {
  it("is a header the screen sends, distinct from the follow-up header", () => {
    expect(COURSE_RELEARN_HEADER).toBe("x-course-relearn");
  });

  it("is absent on a section's first lesson", () => {
    const first = start(configured());
    expect(first.learner.session?.mode).toBe("learn");
    expect(dto(first, true)).not.toHaveProperty("relearn");
  });

  it("marks the lesson of a section the student finished before, only for screens that ask", () => {
    // A poor first lesson rests until tomorrow; the review comes first, then the same section again.
    const poor = finish(start(configured()), now, true);
    const reviewed = finish(start(poor, later, 99), later, false);
    const again = start(reviewed, later, 123);
    expect(again.learner.session?.mode).toBe("learn");
    expect(again.learner.session?.sectionId).toBe(COURSE_SECTIONS[0].id);
    expect(dto(again, true)?.relearn).toBe(true);
    expect(dto(again, false)).not.toHaveProperty("relearn");
    expect(dto(again)).not.toHaveProperty("relearn");
  });

  it("never marks a review session", () => {
    const poor = finish(start(configured()), now, true);
    const review = start(poor, later, 99);
    expect(review.learner.session?.mode).toBe("review");
    expect(dto(review, true)).not.toHaveProperty("relearn");
  });
});
