// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { CourseAttemptInput } from "@/contracts/mathSrsCourse.contract";
import {
  emptyCourseState,
  setCoursePlan,
  storedCourseSchema,
  submitCourseAttempt,
  submitCourseFollowUp,
  type StoredCourse,
} from "@/lib/math-srs/courseAutomation";
import { emptySrsState, parseSrsState } from "@/lib/math-srs/serverState";

const at = (minute: number) =>
  new Date(Date.parse("2026-10-21T14:50:00.000Z") + minute * 60_000);
const options = { followUps: true };

// Entirely synthetic: no saved student IDs, questions or records.
function begin(): StoredCourse {
  const state = setCoursePlan(
    emptyCourseState(),
    {
      startSectionId: "5-2-1-1",
      dailyQuestionCount: 10,
      enabled: true,
      expectedRevision: 0,
    },
    at(0),
  );
  state.learner.session = {
    id: randomUUID(),
    sectionId: "5-2-1-1",
    mode: "learn",
    startedAt: at(0).toISOString(),
    completedAt: null,
    attempts: [],
    problems: Array.from({ length: 5 }, (_, seed) => ({
      id: randomUUID(),
      sectionId: "5-2-1-1",
      tier: "기본",
      seed,
      content: "1 + 1 = ?",
      answer: "2",
      solution: "1 + 1 = 2",
      figureSpec: null,
      input: { mode: "number", label: "답", placeholder: "", help: "" },
    })),
  };
  return valid(state);
}
function valid(state: StoredCourse) {
  expect(storedCourseSchema.safeParse(state).success).toBe(true);
  expect(parseSrsState({ ...emptySrsState(), course: state }).course).toEqual(
    state,
  );
  return state;
}
function input(state: StoredCourse, how = "right"): CourseAttemptInput {
  const session = state.learner.session!;
  const retry = session.retry;
  return {
    sessionId: session.id,
    problemId: retry
      ? retry.pendingProblemIds[0]
      : session.problems[session.attempts.length].id,
    submittedAnswer: how === "giveUp" ? "" : how === "right" ? "2" : "3",
    ...(how === "giveUp" ? { giveUp: true } : {}),
    ...(retry ? { retryIndex: retry.attempts.length } : {}),
  };
}
const answer = (state: StoredCourse, minute: number, how = "right") =>
  submitCourseAttempt(state, input(state, how), at(minute), options);
function follow(
  state: StoredCourse,
  minute: number,
  action: "answer" | "done",
) {
  const session = state.learner.session!;
  return submitCourseFollowUp(
    state,
    {
      sessionId: session.id,
      problemId: session.attempts.at(-1)!.problemId,
      action,
      ...(action === "answer" ? { submittedAnswer: "2" } : {}),
    },
    at(minute),
  );
}
function followed(minute = 3) {
  return valid(
    follow(follow(answer(begin(), 1, "wrong"), 2, "answer"), minute, "done"),
  );
}

describe("course session clocks include follow-up events", () => {
  it.each(["right", "wrong", "giveUp"])(
    "clamps a clock-back next first %s after follow-up answer and done",
    (how) => {
      const state = followed();
      const before = structuredClone(state);
      const next = valid(answer(state, -1440, how));
      expect(next.learner.session!.attempts.at(-1)!.answeredAt).toBe(
        at(3).toISOString(),
      );
      expect(next.learner.session!.attempts[0]).toEqual(
        before.learner.session!.attempts[0],
      );
      expect(
        next.learner.session!.followUps!.slice(
          0,
          before.learner.session!.followUps!.length,
        ),
      ).toEqual(before.learner.session!.followUps);
      expect(next.learner.session!.problems).toEqual(
        before.learner.session!.problems,
      );
      expect(next.plan).toEqual(before.plan);
      expect(next.history).toEqual(before.history);
      expect(next.requests.slice(0, -1)).toEqual(before.requests);
      expect(state).toEqual(before);
      expect(
        submitCourseAttempt(next, next.requests.at(-1)!, at(-2880), options),
      ).toBe(next);
    },
  );

  it("includes an unacknowledged follow-up answer", () => {
    const state = valid(follow(answer(begin(), 1, "wrong"), 2, "answer"));
    expect(
      valid(answer(state, 0)).learner.session!.attempts[1].answeredAt,
    ).toBe(at(2).toISOString());
  });

  it("includes a reveal's done event", () => {
    const state = valid(follow(answer(begin(), 1, "giveUp"), 3, "done"));
    expect(
      valid(answer(state, 0)).learner.session!.attempts[1].answeredAt,
    ).toBe(at(3).toISOString());
  });

  it.each([3, 4, 1443])(
    "keeps normal time %i exactly, with identical results to the clamped transition",
    (minute) => {
      const state = followed();
      const next = valid(answer(state, minute));
      expect(next.learner.session!.attempts[1].answeredAt).toBe(
        at(minute).toISOString(),
      );
      if (minute === 3) expect(next).toEqual(answer(state, -1440));
    },
  );

  it("keeps the next KST day and same-day accounting aligned with the event floor", () => {
    const state = followed(12);
    const clamped = valid(answer(state, 0));
    expect(clamped).toEqual(answer(state, 12));
    expect(clamped.activity.map((day) => day.date)).toEqual([
      "2026-10-21",
      "2026-10-22",
    ]);
  });

  it.each(["right", "wrong", "giveUp"])(
    "clamps the last first %s and keeps completion and existing records valid",
    (how) => {
      let state = begin();
      for (let minute = 1; minute <= 3; minute++) state = answer(state, minute);
      state = valid(
        follow(follow(answer(state, 4, "wrong"), 5, "answer"), 6, "done"),
      );
      const next = valid(answer(state, 0, how));
      expect(next.learner.session!.completedAt).toBe(at(6).toISOString());
      expect(next.learner.session!.attempts.slice(0, -1)).toEqual(
        state.learner.session!.attempts,
      );
      expect(
        next.learner.session!.followUps!.slice(
          0,
          state.learner.session!.followUps!.length,
        ),
      ).toEqual(state.learner.session!.followUps);
    },
  );

  it.each(["right", "wrong", "giveUp"])(
    "clamps last-follow-up → retry %s and preserves retry receipts",
    (how) => {
      let state = answer(begin(), 1, "wrong"); // Leave an earlier wrong answer for the retry queue.
      for (let minute = 2; minute <= 4; minute++) state = answer(state, minute);
      state = valid(
        follow(follow(answer(state, 5, "wrong"), 6, "answer"), 7, "done"),
      );
      const request = input(state, how);
      const next = valid(submitCourseAttempt(state, request, at(0), options));
      expect(next.learner.session!.retry!.attempts[0].answeredAt).toBe(
        at(7).toISOString(),
      );
      expect(next).toEqual(submitCourseAttempt(state, request, at(7), options));
      expect(next.memories).toEqual(state.memories);
      expect(next.activity).toEqual(state.activity);
      expect(next.recentAttempts).toEqual(state.recentAttempts);
      expect(next.learner.session!.attempts).toEqual(
        state.learner.session!.attempts,
      );
      expect(next.learner.session!.followUps).toEqual(
        state.learner.session!.followUps,
      );
      expect(submitCourseAttempt(next, request, at(-1440), options)).toBe(next);
    },
  );

  it("keeps existing no-follow-up first and retry clock floors", () => {
    let state = valid(answer(begin(), -1, "wrong"));
    expect(state.learner.session!.attempts[0].answeredAt).toBe(
      at(0).toISOString(),
    );
    for (let minute = 1; minute <= 4; minute++)
      state = valid(answer(state, minute));
    const retry = valid(answer(state, 0, "wrong"));
    expect(retry.learner.session!.retry!.attempts[0].answeredAt).toBe(
      at(4).toISOString(),
    );
    const done = valid(answer(retry, 0));
    expect(done.learner.session!.retry!.completedAt).toBe(at(4).toISOString());
  });
});
