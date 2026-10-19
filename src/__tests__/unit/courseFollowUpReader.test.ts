// @vitest-environment node
/**
 * Reader side of «한 번 더 → 풀이» (plan §3.2 · decisions 2 and 6, 2026-10-19).
 * The writer that records a second answer or an opened solution ships only after
 * this reader is in production: an older reader rejects every record it writes.
 * Each case below is a state the writer will persist, built from real
 * transitions plus the `followUps` a writer adds.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { coursePublicProblemSchema } from "@/contracts/mathSrsCourse.contract";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { gradeCourseAnswer } from "@/lib/math-srs/elementary/answers";
import { courseLearnerSchema } from "@/lib/math-srs/elementary/progress";
import type {
  CourseFollowUp,
  CourseProblem,
} from "@/lib/math-srs/elementary/types";
import {
  emptyCourseState,
  revealCourseHint,
  setCoursePlan,
  startAutomaticCourse,
  storedCourseSchema,
  submitCourseAttempt,
  type StoredCourse,
} from "@/lib/math-srs/courseAutomation";

const now = new Date("2026-10-20T01:00:00.000Z");
const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000);
const iso = (minutes: number) => at(minutes).toISOString();

const wrongChoice = (problem: CourseProblem) =>
  problem.answerChoices?.find(
    (choice) => gradeCourseAnswer(problem, choice) === false,
  ) ?? null;
const graded = (problem: CourseProblem) =>
  problem.input.mode !== "self-check" && wrongChoice(problem) !== null;

function begin(sectionId: string, seed: number) {
  const planned = setCoursePlan(
    emptyCourseState(),
    {
      startSectionId: sectionId,
      dailyQuestionCount: 10,
      enabled: true,
      expectedRevision: 0,
    },
    now,
  );
  return startAutomaticCourse(planned, now, seed, randomUUID);
}

/** A grade-5 session whose problems match `want` (by index). */
function findSession(
  want: (problems: CourseProblem[]) => boolean,
): StoredCourse {
  for (const section of COURSE_SECTIONS.filter((s) => s.grade === 5))
    for (let seed = 1; seed < 60; seed++) {
      const state = begin(section.id, seed);
      if (want(state.learner.session!.problems)) return state;
    }
  throw new Error("no grade-5 session matches");
}

type Answer = "right" | "wrong" | "giveUp" | "selfWrong";
function answer(state: StoredCourse, how: Answer, minute: number) {
  const session = state.learner.session!;
  const problem = session.problems[session.attempts.length];
  const base = { sessionId: session.id, problemId: problem.id };
  if (how === "giveUp")
    return submitCourseAttempt(
      state,
      { ...base, submittedAnswer: "", giveUp: true },
      at(minute),
    );
  if (problem.input.mode === "self-check") {
    const hinted = revealCourseHint(state, base);
    return submitCourseAttempt(
      hinted,
      {
        ...base,
        submittedAnswer: "",
        selfCorrect: how === "right",
      },
      at(minute),
    );
  }
  return submitCourseAttempt(
    state,
    {
      ...base,
      submittedAnswer: how === "right" ? problem.answer : wrongChoice(problem)!,
    },
    at(minute),
  );
}

function withFollowUps(
  state: StoredCourse,
  followUps: CourseFollowUp[],
  pendingProblemIds?: string[] | null,
): StoredCourse {
  const session = state.learner.session!;
  const { retry, ...rest } = session;
  const nextRetry =
    pendingProblemIds === undefined
      ? retry
      : pendingProblemIds === null
        ? undefined
        : { ...retry!, pendingProblemIds };
  return {
    ...state,
    learner: {
      ...state.learner,
      session: {
        ...rest,
        ...(nextRetry ? { retry: nextRetry } : {}),
        followUps,
      },
    },
  };
}

const accepts = (state: StoredCourse) =>
  expect(storedCourseSchema.safeParse(state).success).toBe(true);
const rejects = (state: StoredCourse) =>
  expect(storedCourseSchema.safeParse(state).success).toBe(false);

const twoGraded = () => findSession((p) => graded(p[0]) && graded(p[1]));
const retryOf = (
  problem: CourseProblem,
  minute: number,
  how: "right" | "wrong" | "giveUp",
  doneMinute: number | null = null,
): Extract<CourseFollowUp, { kind: "retry" }> => ({
  problemId: problem.id,
  kind: "retry",
  submittedAnswer:
    how === "giveUp"
      ? ""
      : how === "right"
        ? problem.answer
        : wrongChoice(problem)!,
  ...(how === "giveUp" ? { giveUp: true } : {}),
  correct: how === "right",
  answeredAt: iso(minute),
  doneAt: doneMinute === null ? null : iso(doneMinute),
});

describe("course follow-up records (reader)", () => {
  it("accepts a second answer right after a wrong first answer", () => {
    let state = answer(twoGraded(), "wrong", 1);
    const [p0] = state.learner.session!.problems;
    for (const how of ["right", "wrong", "giveUp"] as const)
      accepts(withFollowUps(state, [retryOf(p0, 2, how)]));
    accepts(withFollowUps(state, [retryOf(p0, 2, "wrong", 3)]));
    state = answer(
      withFollowUps(state, [retryOf(p0, 2, "right", 2)]),
      "right",
      4,
    );
    accepts(state);
  });

  it("accepts an opened solution after giving up or a self-check «다시 연습»", () => {
    const gave = answer(twoGraded(), "giveUp", 1);
    const reveal = (problem: CourseProblem, minute: number) =>
      ({
        problemId: problem.id,
        kind: "reveal",
        correct: false,
        answeredAt: iso(minute),
        doneAt: null,
      }) satisfies CourseFollowUp;
    accepts(
      withFollowUps(gave, [reveal(gave.learner.session!.problems[0], 1)]),
    );

    const selfState = findSession((p) => p[0].input.mode === "self-check");
    const self = answer(selfState, "selfWrong", 1);
    accepts(
      withFollowUps(self, [reveal(self.learner.session!.problems[0], 1)]),
    );
  });

  it("leaves followed-up problems out of the end-of-session retry queue", () => {
    let state = twoGraded();
    const problems = state.learner.session!.problems;
    state = answer(state, "wrong", 1);
    state = withFollowUps(state, [retryOf(problems[0], 2, "right", 2)]);
    state = answer(state, "wrong", 3);
    for (let i = 2; i < 5; i++) state = answer(state, "right", 2 + i * 2);
    const session = state.learner.session!;
    expect(session.completedAt).not.toBeNull();
    // The current writer queues every wrong first answer; the follow-up writer
    // leaves out the ones the student already resolved on the spot.
    expect(session.retry?.pendingProblemIds).toEqual([
      problems[0].id,
      problems[1].id,
    ]);
    rejects(state);
    accepts(withFollowUps(state, session.followUps!, [problems[1].id]));

    const both = withFollowUps(
      state,
      [...session.followUps!, retryOf(problems[1], 4, "wrong", 4)],
      null,
    );
    accepts(both);
    // A retry object whose queue the follow-ups emptied must be dropped.
    rejects(withFollowUps(state, both.learner.session!.followUps!, []));
  });

  it("accepts the last problem's follow-up after the session finished", () => {
    let state = findSession((p) => graded(p[4]));
    for (let i = 0; i < 4; i++) state = answer(state, "right", 1 + i);
    state = answer(state, "wrong", 5);
    const last = state.learner.session!.problems[4];
    expect(state.learner.session!.retry?.pendingProblemIds).toEqual([last.id]);
    accepts(withFollowUps(state, [retryOf(last, 6, "wrong", 7)], null));
  });

  it("rejects records that do not follow a wrong first answer", () => {
    const state = answer(twoGraded(), "wrong", 1);
    const [p0, p1] = state.learner.session!.problems;
    const right = answer(twoGraded(), "right", 1);
    const r0 = right.learner.session!.problems[0];
    rejects(withFollowUps(right, [retryOf(r0, 2, "right")]));
    rejects(withFollowUps(state, [retryOf(p1, 2, "right")]));
    rejects(
      withFollowUps(state, [retryOf(p0, 2, "right"), retryOf(p0, 3, "wrong")]),
    );
    rejects(
      withFollowUps(state, [{ ...retryOf(p0, 2, "wrong"), correct: true }]),
    );
    rejects(
      withFollowUps(state, [
        {
          problemId: p0.id,
          kind: "reveal",
          correct: false,
          answeredAt: iso(2),
          doneAt: null,
        },
      ]),
    );
    // The learner schema checks sessions on its own (paused sessions, local data).
    const opened = withFollowUps(state, [
      {
        problemId: p0.id,
        kind: "reveal",
        correct: false,
        answeredAt: state.learner.session!.attempts[0].answeredAt,
        doneAt: null,
      },
    ]);
    expect(courseLearnerSchema.safeParse(opened.learner).success).toBe(false);
    expect(
      courseLearnerSchema.safeParse(
        withFollowUps(state, [retryOf(p0, 2, "right")]).learner,
      ).success,
    ).toBe(true);
    const gave = answer(twoGraded(), "giveUp", 1);
    rejects(
      withFollowUps(gave, [
        retryOf(gave.learner.session!.problems[0], 2, "right"),
      ]),
    );
    // An empty answer without «모르겠어요» on the request is not a give-up: only the
    // request tells them apart, so an opened solution must not follow it.
    const reveal: CourseFollowUp = {
      problemId: gave.learner.session!.problems[0].id,
      kind: "reveal",
      correct: false,
      answeredAt: gave.learner.session!.attempts[0].answeredAt,
      doneAt: null,
    };
    accepts(withFollowUps(gave, [reveal]));
    const unflagged = {
      ...gave,
      requests: gave.requests.map((request) => ({
        ...request,
        giveUp: undefined,
      })),
    };
    accepts(unflagged);
    rejects(withFollowUps(unflagged, [reveal]));
  });

  it("rejects records out of time order", () => {
    let state = answer(twoGraded(), "wrong", 1);
    const [p0] = state.learner.session!.problems;
    rejects(withFollowUps(state, [retryOf(p0, 0, "right")]));
    rejects(withFollowUps(state, [retryOf(p0, 3, "right", 2)]));
    state = answer(state, "right", 2);
    rejects(withFollowUps(state, [retryOf(p0, 3, "right")]));
  });

  it("the public problem contract reads the follow-up state before the server sends it", () => {
    const problem = {
      id: randomUUID(),
      sectionId: COURSE_SECTIONS[0].id,
      tier: "기본",
      content: "문제",
      input: { mode: "number", label: "답", placeholder: "", help: "" },
      answerChoices: null,
      interactive: null,
      figureUrl: null,
      hint: null,
      feedback: { correct: false },
    };
    expect(coursePublicProblemSchema.safeParse(problem).success).toBe(true);
    for (const followUp of [
      null,
      { state: "awaiting", done: false },
      { state: "correct", done: true },
      { state: "solution", done: false },
    ])
      expect(
        coursePublicProblemSchema.safeParse({ ...problem, followUp }).success,
      ).toBe(true);
    expect(
      coursePublicProblemSchema.safeParse({
        ...problem,
        followUp: { state: "other", done: false },
      }).success,
    ).toBe(false);
  });
});
