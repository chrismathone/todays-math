// @vitest-environment node
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import {
  CourseInvalidInput,
  emptyCourseState,
  setCoursePlan,
  startRecommendedCourse,
  submitCourseAttempt,
  submitCourseFollowUp,
  storedCourseSchema,
} from "@/lib/math-srs/courseAutomation";
import { getCourseProblemInput } from "@/lib/math-srs/elementary/answers";

const now = new Date("2026-10-22T01:00:00.000Z");
function started() {
  const plan = setCoursePlan(
    emptyCourseState(),
    {
      startSectionId: "5-2-1-1",
      dailyQuestionCount: 10,
      enabled: true,
      expectedRevision: 0,
    },
    now,
  );
  const state = startRecommendedCourse(
    plan,
    { sectionId: "5-2-1-1", mode: "review", reason: "fixture" },
    now,
    7,
    randomUUID,
  );
  const p = state.learner.session!.problems[0];
  Object.assign(p, {
    content: "11, 12, 13 중에서 12 이상인 수를 모두 쓰시오.",
    answer: "$12,\\ 13$",
    solution: "12와 13입니다.",
    figureSpec: null,
    answerChoices: null,
    interactive: null,
  });
  p.input = getCourseProblemInput(p);
  expect(storedCourseSchema.safeParse(state).success).toBe(true);
  return state;
}
it("rejects malformed first and second list answers before changing attempts, memories or activity", () => {
  let state = started();
  const s = state.learner.session!,
    p = s.problems[0];
  const base = { sessionId: s.id, problemId: p.id };
  const before = structuredClone(state);
  for (const submittedAnswer of ["abc", "１２，１３", "12 13"]) {
    expect(() =>
      submitCourseAttempt(state, { ...base, submittedAnswer }, now, {
        followUps: true,
      }),
    ).toThrow(CourseInvalidInput);
    expect(state).toEqual(before);
  }
  // A duplicate is a well-formed wrong answer, not a format error.
  state = submitCourseAttempt(
    state,
    { ...base, submittedAnswer: "12,13,13" },
    now,
    { followUps: true },
  );
  expect(state.learner.session!.attempts).toHaveLength(1);
  expect(state.learner.session!.attempts[0].correct).toBe(false);
  const wrong = structuredClone(state);
  expect(() =>
    submitCourseFollowUp(
      state,
      { ...base, action: "answer", submittedAnswer: "abc" },
      now,
    ),
  ).toThrow(CourseInvalidInput);
  expect(state).toEqual(wrong);
  const fixed = submitCourseFollowUp(
    state,
    { ...base, action: "answer", submittedAnswer: "13,12" },
    now,
  );
  expect(fixed.learner.session!.followUps?.[0].correct).toBe(true);
  expect(fixed.learner.session!.attempts).toEqual(
    wrong.learner.session!.attempts,
  );
  expect(fixed.memories).toEqual(wrong.memories);
  expect(fixed.activity).toEqual(wrong.activity);
  expect(storedCourseSchema.safeParse(fixed).success).toBe(true);
});
