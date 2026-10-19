// @vitest-environment node
/**
 * Writer side of «한 번 더 → 풀이» (plan §3.2 · decisions 2 and 6, 2026-10-19).
 * Ships only after the reader (`courseFollowUpReader.test.ts`) is in production.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  coursePublicSessionSchema,
  type CourseFollowUpInput,
} from "@/contracts/mathSrsCourse.contract";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { gradeCourseAnswer } from "@/lib/math-srs/elementary/answers";
import type { CourseProblem } from "@/lib/math-srs/elementary/types";
import {
  CourseConflict,
  emptyCourseState,
  publicCourseSession,
  revealCourseHint,
  setCoursePlan,
  startAutomaticCourse,
  storedCourseSchema,
  submitCourseAttempt,
  submitCourseFollowUp,
  type StoredCourse,
} from "@/lib/math-srs/courseAutomation";

const now = new Date("2026-10-20T01:00:00.000Z");
const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000);
const opts = { followUps: true } as const;

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
function findSession(want: (problems: CourseProblem[]) => boolean) {
  for (const section of COURSE_SECTIONS.filter((s) => s.grade === 5))
    for (let seed = 1; seed < 60; seed++) {
      const state = begin(section.id, seed);
      if (want(state.learner.session!.problems)) return state;
    }
  throw new Error("no grade-5 session matches");
}
const current = (state: StoredCourse) => {
  const session = state.learner.session!;
  return { session, problem: session.problems[session.attempts.length] };
};

type Answer = "right" | "wrong" | "giveUp" | "selfWrong";
function answer(
  state: StoredCourse,
  how: Answer,
  minute: number,
  options: { followUps?: boolean } = opts,
) {
  const { session, problem } = current(state);
  const base = { sessionId: session.id, problemId: problem.id };
  if (how === "giveUp")
    return submitCourseAttempt(
      state,
      { ...base, submittedAnswer: "", giveUp: true },
      at(minute),
      options,
    );
  if (problem.input.mode === "self-check")
    return submitCourseAttempt(
      revealCourseHint(state, base),
      { ...base, submittedAnswer: "", selfCorrect: how === "right" },
      at(minute),
      options,
    );
  return submitCourseAttempt(
    state,
    {
      ...base,
      submittedAnswer: how === "right" ? problem.answer : wrongChoice(problem)!,
    },
    at(minute),
    options,
  );
}
function followUp(
  state: StoredCourse,
  problem: CourseProblem,
  how: "right" | "wrong" | "giveUp" | "done",
  minute: number,
) {
  const input: CourseFollowUpInput =
    how === "done"
      ? {
          sessionId: state.learner.session!.id,
          problemId: problem.id,
          action: "done",
        }
      : how === "giveUp"
        ? {
            sessionId: state.learner.session!.id,
            problemId: problem.id,
            action: "answer",
            giveUp: true,
          }
        : {
            sessionId: state.learner.session!.id,
            problemId: problem.id,
            action: "answer",
            submittedAnswer:
              how === "right" ? problem.answer : wrongChoice(problem)!,
          };
  return submitCourseFollowUp(state, input, at(minute));
}
const valid = (state: StoredCourse) =>
  expect(storedCourseSchema.safeParse(state).success).toBe(true);
const publicProblem = (
  state: StoredCourse,
  problem: CourseProblem,
  followUp = true,
) => {
  const view = publicCourseSession(state.learner.session!, { followUp });
  expect(coursePublicSessionSchema.safeParse(view).success).toBe(true);
  return view.problems.find((p) => p.id === problem.id)!;
};
const twoGraded = () => findSession((p) => graded(p[0]) && graded(p[1]));

describe("course follow-ups (writer)", () => {
  it("records a second answer without touching the first attempt or memory", () => {
    const wrong = answer(twoGraded(), "wrong", 1);
    const [p0] = wrong.learner.session!.problems;
    expect(publicProblem(wrong, p0).followUp).toEqual({
      state: "awaiting",
      done: false,
    });
    expect(publicProblem(wrong, p0).hint).toBeNull();

    const right = followUp(wrong, p0, "right", 2);
    valid(right);
    expect(right.learner.session!.attempts).toEqual(
      wrong.learner.session!.attempts,
    );
    expect(right.memories).toEqual(wrong.memories);
    expect(right.activity).toEqual(wrong.activity);
    expect(right.learner.session!.followUps).toEqual([
      expect.objectContaining({
        problemId: p0.id,
        kind: "retry",
        submittedAnswer: p0.answer,
        correct: true,
        doneAt: null,
      }),
    ]);
    expect(publicProblem(right, p0).followUp).toEqual({
      state: "correct",
      done: false,
    });

    const missed = followUp(wrong, p0, "wrong", 2);
    valid(missed);
    expect(publicProblem(missed, p0).followUp).toEqual({
      state: "solution",
      done: false,
    });
    expect(publicProblem(missed, p0).hint).toEqual({
      answer: p0.answer,
      solution: p0.solution,
    });

    const gaveUp = followUp(wrong, p0, "giveUp", 2);
    valid(gaveUp);
    expect(gaveUp.learner.session!.followUps![0]).toMatchObject({
      submittedAnswer: "",
      giveUp: true,
      correct: false,
    });

    const done = followUp(missed, p0, "done", 3);
    valid(done);
    expect(done.learner.session!.followUps![0].doneAt).toBe(
      at(3).toISOString(),
    );
    expect(publicProblem(done, p0).followUp).toEqual({
      state: "solution",
      done: true,
    });
    expect(followUp(done, p0, "done", 4)).toBe(done);
  });

  it("returns the same state for a resent answer and refuses a different one", () => {
    const wrong = answer(twoGraded(), "wrong", 1);
    const [p0] = wrong.learner.session!.problems;
    const right = followUp(wrong, p0, "right", 2);
    expect(followUp(right, p0, "right", 3)).toBe(right);
    expect(() => followUp(right, p0, "wrong", 3)).toThrow(CourseConflict);
  });

  it("follows only the latest wrong first answer, before anything else happens", () => {
    const base = twoGraded();
    const [p0, p1] = base.learner.session!.problems;
    const right = answer(base, "right", 1);
    expect(() => followUp(right, p0, "right", 2)).toThrow(CourseConflict);
    const moved = answer(answer(base, "wrong", 1), "right", 2);
    expect(() => followUp(moved, p0, "right", 3)).toThrow(CourseConflict);
    expect(() => followUp(moved, p1, "right", 3)).toThrow(CourseConflict);
    const gave = answer(base, "giveUp", 1);
    expect(() => followUp(gave, p0, "right", 2)).toThrow(CourseConflict);
    expect(() => followUp(answer(base, "wrong", 1), p0, "done", 2)).toThrow(
      CourseConflict,
    );

    const self = findSession((p) => p[0].input.mode === "self-check");
    const selfWrong = answer(self, "selfWrong", 1);
    const s0 = selfWrong.learner.session!.problems[0];
    expect(() => followUp(selfWrong, s0, "giveUp", 2)).toThrow(CourseConflict);
  });

  it("records an opened solution after «모르겠어요» or «다시 연습» only for clients that ask", () => {
    const base = twoGraded();
    const p0 = base.learner.session!.problems[0];
    const gave = answer(base, "giveUp", 1);
    valid(gave);
    expect(gave.learner.session!.followUps).toEqual([
      {
        problemId: p0.id,
        kind: "reveal",
        correct: false,
        answeredAt: at(1).toISOString(),
        doneAt: null,
      },
    ]);
    expect(publicProblem(gave, p0)).toMatchObject({
      followUp: { state: "solution", done: false },
      hint: { answer: p0.answer, solution: p0.solution },
    });
    const legacy = answer(base, "giveUp", 1, {});
    expect(legacy.learner.session!.followUps).toBeUndefined();

    const self = findSession((p) => p[0].input.mode === "self-check");
    const selfWrong = answer(self, "selfWrong", 1);
    valid(selfWrong);
    expect(selfWrong.learner.session!.followUps).toMatchObject([
      { kind: "reveal" },
    ]);
    expect(answer(self, "right", 1).learner.session!.followUps).toBeUndefined();
  });

  it("keeps resolved problems out of the end-of-session retry queue", () => {
    let state = findSession((p) => graded(p[0]) && graded(p[4]));
    const problems = state.learner.session!.problems;
    state = followUp(answer(state, "wrong", 1), problems[0], "right", 2);
    for (let i = 1; i < 4; i++) state = answer(state, "right", 2 + i);
    // Wrong without a follow-up: the student moved on, so it stays in the queue.
    state = answer(state, "wrong", 7);
    valid(state);
    expect(state.learner.session!.retry?.pendingProblemIds).toEqual([
      problems[4].id,
    ]);
    const resolved = followUp(state, problems[4], "wrong", 8);
    valid(resolved);
    expect(resolved.learner.session!.retry).toBeUndefined();
    expect(publicProblem(resolved, problems[4]).followUp).toEqual({
      state: "solution",
      done: false,
    });
  });

  it("does not follow up once the retry round has started", () => {
    let state = findSession((p) => graded(p[0]) && graded(p[4]));
    const problems = state.learner.session!.problems;
    state = answer(state, "wrong", 1);
    state = answer(state, "right", 2);
    for (let i = 2; i < 4; i++) state = answer(state, "right", 1 + i);
    state = answer(state, "wrong", 5);
    const retry = state.learner.session!.retry!;
    state = submitCourseAttempt(
      state,
      {
        sessionId: state.learner.session!.id,
        problemId: retry.pendingProblemIds[0],
        submittedAnswer: problems[0].answer,
        retryIndex: 0,
      },
      at(6),
      opts,
    );
    expect(() => followUp(state, problems[4], "right", 7)).toThrow(
      CourseConflict,
    );
  });

  it("sends followUp only to clients that ask for it", () => {
    const wrong = answer(twoGraded(), "wrong", 1);
    const p0 = wrong.learner.session!.problems[0];
    const legacy = publicProblem(wrong, p0, false);
    expect("followUp" in legacy).toBe(false);
  });
});
