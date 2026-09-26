// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { mathSrsReplayResponseSchema } from "@/contracts/mathSrsReplay.contract";
import {
  dailyJourneyDto,
  updateDailyJourney,
} from "@/lib/math-srs/dailyJourney";
import {
  emptyCourseState,
  setCoursePlan,
  startAutomaticCourse,
  submitCourseAttempt,
  type StoredCourse,
} from "@/lib/math-srs/courseAutomation";
import {
  currentSrsMission,
  emptySrsState,
  parseSrsState,
  recordSrsRetry,
  startSrsMission,
  submitSrsAttempt,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import { replayProblem } from "@/lib/math-srs/replay";

const now = new Date("2026-09-26T03:00:00.000Z");
const tomorrow = new Date("2026-09-27T03:00:00.000Z");
const studentId = randomUUID();
const plan = (goal: 5 | 10 | 15 | 20) => ({
  startSectionId: "3-1-1-1",
  dailyQuestionCount: goal,
  enabled: true,
  expectedRevision: 0,
});
const middleStart = () =>
  startSrsMission(emptySrsState(), studentId, now, 71, randomUUID);
function middleAnswer(state: StoredSrsState, wrong = false) {
  const mission = state.missions[0];
  const problem = mission.problems[mission.attempts.length];
  return submitSrsAttempt(
    state,
    studentId,
    {
      missionId: mission.id,
      problemId: problem.id,
      submittedAnswer: wrong
        ? String(problem.answer + 999)
        : String(problem.answer),
      elapsedSeconds: 10,
      rating: "good",
    },
    now,
  );
}
function courseChange(
  state: StoredSrsState,
  change: (course: StoredCourse) => StoredCourse,
) {
  return updateDailyJourney(state, {
    ...state,
    course: change(state.course ?? emptyCourseState()),
  });
}
function elementaryStart(goal: 5 | 10 = 10) {
  return courseChange(emptySrsState(), (course) =>
    startAutomaticCourse(
      setCoursePlan(course, plan(goal), now),
      now,
      71,
      randomUUID,
    ),
  );
}
function elementaryAnswer(state: StoredSrsState, wrong = false) {
  return courseChange(state, (course) => {
    const session = course.learner.session!;
    const problem = session.problems[session.attempts.length];
    return submitCourseAttempt(
      course,
      {
        sessionId: session.id,
        problemId: problem.id,
        submittedAnswer: wrong ? "" : problem.answer,
        ...(wrong ? { giveUp: true } : {}),
      },
      now,
    );
  });
}

describe("permanent daily learning journey", () => {
  it("moves one tile only after twelve first attempts and every wrong answer is retried", () => {
    let state = middleStart();
    for (let index = 0; index < 12; index++) {
      state = middleAnswer(state, index === 0);
      expect(dailyJourneyDto(state, "middle", now).completedDays).toBe(0);
    }
    const mission = state.missions[0];
    const wrong = mission.problems[0];
    expect(currentSrsMission(state, tomorrow)?.id).toBe(mission.id);
    expect(startSrsMission(state, studentId, tomorrow, 82, randomUUID)).toBe(
      state,
    );
    expect(
      recordSrsRetry(
        state,
        mission.id,
        wrong.id,
        String(wrong.answer + 99),
        tomorrow,
      ),
    ).toBe(state);
    expect(() =>
      recordSrsRetry(
        state,
        mission.id,
        mission.problems[1].id,
        String(mission.problems[1].answer),
        tomorrow,
      ),
    ).toThrow();
    const initialScores = structuredClone({
      attempts: mission.attempts,
      memories: state.memories,
    });
    state = recordSrsRetry(
      state,
      mission.id,
      wrong.id,
      String(wrong.answer),
      tomorrow,
    );
    const journey = dailyJourneyDto(state, "middle", tomorrow);
    expect(journey.completedDays).toBe(1);
    expect(journey.todayComplete).toBe(true);
    expect(journey.days[0]).toMatchObject({
      id: "middle:2026-09-26",
      date: "2026-09-26",
      reviewCount: 12,
    });
    expect({
      attempts: state.missions[0].attempts,
      memories: state.memories,
    }).toEqual(initialScores);
    expect(
      recordSrsRetry(
        state,
        mission.id,
        wrong.id,
        String(wrong.answer),
        tomorrow,
      ),
    ).toBe(state);
    expect(parseSrsState(state)).toEqual(state);
    expect(startSrsMission(state, studentId, tomorrow, 82, randomUUID)).toBe(
      state,
    );
  });

  it("finishing both five-question batches yields one daily tile, never five or ten", () => {
    let state = elementaryStart(10);
    for (let index = 0; index < 5; index++) state = elementaryAnswer(state);
    expect(dailyJourneyDto(state, "elementary", now).completedDays).toBe(0);
    state = courseChange(state, (course) =>
      startAutomaticCourse(course, now, 82, randomUUID),
    );
    for (let index = 0; index < 5; index++) state = elementaryAnswer(state);
    const journey = dailyJourneyDto(state, "elementary", now);
    expect(journey.completedDays).toBe(1);
    expect(journey.days[0].reviewCount).toBe(10);
    expect(journey.todayComplete).toBe(true);
    expect(journey.upcoming[0].title).toBeTruthy();
    expect(
      dailyJourneyDto(parseSrsState(state), "elementary", tomorrow)
        .completedDays,
    ).toBe(1);
    expect(dailyJourneyDto(state, "elementary", tomorrow).todayComplete).toBe(
      false,
    );
    const old = replayProblem(
      state,
      "elementary",
      1,
      tomorrow,
      undefined,
      journey.days[0].id,
    );
    expect(old.problemId).toBe(state.course!.history[0].session.problems[0].id);
  });

  it("does not award a tile from lowering settings or revoke one after increasing them", () => {
    let state = elementaryStart(10);
    for (let index = 0; index < 5; index++) state = elementaryAnswer(state);
    state = courseChange(state, (course) =>
      setCoursePlan(course, plan(5), now),
    );
    expect(dailyJourneyDto(state, "elementary", now)).toMatchObject({
      completedDays: 0,
      todayGoal: 10,
    });
    let complete = elementaryStart(5);
    for (let index = 0; index < 5; index++)
      complete = elementaryAnswer(complete);
    complete = courseChange(complete, (course) =>
      setCoursePlan(course, plan(20), now),
    );
    expect(dailyJourneyDto(complete, "elementary", now)).toMatchObject({
      completedDays: 1,
      todayComplete: true,
      todayGoal: 5,
    });
  });

  it("waits for elementary wrong-answer retry and keeps old tiles replayable after history compaction", () => {
    let state = elementaryStart(5);
    for (let index = 0; index < 5; index++)
      state = elementaryAnswer(state, index === 0);
    expect(dailyJourneyDto(state, "elementary", now).completedDays).toBe(0);
    state = courseChange(state, (course) => {
      const session = course.learner.session!;
      const problem = session.problems[0];
      return submitCourseAttempt(
        course,
        {
          sessionId: session.id,
          problemId: problem.id,
          submittedAnswer: problem.answer,
          retryIndex: 0,
        },
        now,
      );
    });
    const dayId = dailyJourneyDto(state, "elementary", now).days[0].id;
    const original = replayProblem(
      state,
      "elementary",
      1,
      tomorrow,
      undefined,
      dayId,
    );
    const before = structuredClone(state);
    replayProblem(state, "elementary", 1, tomorrow, {
      kind: "elementary",
      step: 1,
      dayId,
      problemId: original.problemId,
      submittedAnswer: state.course!.learner.session!.problems[0].answer,
    });
    expect(state).toEqual(before);
    const compacted = {
      ...state,
      course: {
        ...state.course!,
        history: [],
        learner: { ...state.course!.learner, session: null },
        requests: [],
      },
    };
    const review = replayProblem(
      compacted,
      "elementary",
      1,
      tomorrow,
      undefined,
      dayId,
    );
    expect(review.regenerated).toBe(true);
    expect(review.title).toBe(original.title);
    expect(review.answerChoices).toHaveLength(4);
    expect(
      replayProblem(compacted, "elementary", 1, tomorrow, undefined, dayId),
    ).toEqual(review);
    expect(
      mathSrsReplayResponseSchema.safeParse({ data: review }).success,
    ).toBe(true);
    expect(
      dailyJourneyDto(compacted, "elementary", tomorrow).completedDays,
    ).toBe(1);
  });

  it("replays completed middle units after bounded mission details have expired", () => {
    let state = middleStart();
    for (let index = 0; index < 12; index++) state = middleAnswer(state);
    const dayId = dailyJourneyDto(state, "middle", now).days[0].id;
    const archived = { ...state, missions: [] };
    const review = replayProblem(
      archived,
      "middle",
      12,
      tomorrow,
      undefined,
      dayId,
    );
    expect(review.regenerated).toBe(true);
    expect(review.solution).toBeNull();
    expect(review.answerChoices).toHaveLength(4);
    expect(dailyJourneyDto(archived, "middle", tomorrow).completedDays).toBe(1);
    expect(() =>
      replayProblem(
        archived,
        "middle",
        1,
        tomorrow,
        undefined,
        "middle:1999-01-01",
      ),
    ).toThrow();
    expect(() =>
      replayProblem(archived, "middle", 13, tomorrow, undefined, dayId),
    ).toThrow();
  });
});
