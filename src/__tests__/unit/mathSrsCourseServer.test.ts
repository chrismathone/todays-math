// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  coursePlanInputSchema,
  courseStudentDetailResponseSchema,
  courseStudentResponseSchema,
  type CourseAttemptInput,
} from "@/contracts/mathSrsCourse.contract";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import {
  CourseConflict,
  CourseInvalidInput,
  courseSummary,
  emptyCourseState,
  estimatedCourseRecall,
  publicCourseSession,
  revealCourseHint,
  setCoursePlan,
  startAutomaticCourse,
  storedCourseSchema,
  submitCourseAttempt,
  type StoredCourse,
} from "@/lib/math-srs/courseAutomation";
import { courseDetailDto, courseStudentDto } from "@/lib/math-srs/courseServer";
import {
  emptySrsState,
  parseSrsState,
  SrsConflict,
  SrsUnavailable,
  startSrsMission,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import {
  changeSrsState,
  readSrsState,
  type SrsStateRow,
  type SrsStateTable,
} from "@/lib/math-srs/serverStore";

const now = new Date("2026-09-22T16:00:00.000Z");
const studentId = randomUUID();
const student = {
  id: studentId,
  name: "학생",
  classId: randomUUID(),
  class: { id: randomUUID(), name: "초3" },
  studentAccount: { id: randomUUID(), disabledAt: null },
};
const plan = (id = COURSE_SECTIONS[0].id, goal: 5 | 10 | 15 | 20 = 10) => ({
  startSectionId: id,
  dailyQuestionCount: goal,
  enabled: true,
  expectedRevision: 0,
});
const configured = (id?: string, goal?: 5 | 10 | 15 | 20) =>
  setCoursePlan(emptyCourseState(), plan(id, goal), now);
const start = (state = configured(), at = now, seed = 71) =>
  startAutomaticCourse(state, at, seed, randomUUID);
const inputFor = (
  state: StoredCourse,
  index = state.learner.session!.attempts.length,
): CourseAttemptInput => {
  const session = state.learner.session!;
  return {
    sessionId: session.id,
    problemId: session.problems[index].id,
    submittedAnswer: session.problems[index].answer,
  };
};
function answer(state: StoredCourse, at = now, wrong = false) {
  const p =
    state.learner.session!.problems[state.learner.session!.attempts.length];
  let input = inputFor(state);
  if (wrong) input = { ...input, submittedAnswer: "", giveUp: true };
  else if (p.input.mode === "self-check") {
    state = revealCourseHint(state, input);
    input = { ...input, selfCorrect: true };
  }
  return submitCourseAttempt(state, input, at);
}
function finish(state: StoredCourse, at = now, wrong = false) {
  while (!state.learner.session!.completedAt) state = answer(state, at, wrong);
  return storedCourseSchema.parse(state);
}
function tableFixture(initial: StoredSrsState | null = null) {
  let row: SrsStateRow | null = initial
    ? { studentId, revision: 1, payload: initial }
    : null;
  const table: SrsStateTable = {
    async findUnique() {
      const result = structuredClone(row);
      await Promise.resolve();
      return result;
    },
    async findMany() {
      return row ? [structuredClone(row)] : [];
    },
    async create({ data }) {
      if (row) throw { code: "P2002" };
      row = structuredClone(data);
      return row;
    },
    async updateMany({ where, data }) {
      if (!row || row.revision !== where.revision) return { count: 0 };
      row = {
        ...row,
        payload: structuredClone(data.payload),
        revision: row.revision + 1,
      };
      return { count: 1 };
    },
  };
  return table;
}

describe("durable elementary scheduling", () => {
  it("starts in setup with a default goal and no fabricated earlier progress", () => {
    expect(courseSummary(emptyCourseState(), now)).toMatchObject({
      status: "setup",
      currentSectionId: null,
      todayGoal: 10,
      completedSections: 0,
    });
    const state = start(configured(COURSE_SECTIONS[25].id));
    expect(state.learner.session?.sectionId).toBe(COURSE_SECTIONS[25].id);
    expect(state.learner.progress).toEqual({});
    expect(state.memories).toEqual({});
    expect(storedCourseSchema.parse(state)).toEqual(state);
    expect(coursePlanInputSchema.safeParse(plan("unknown")).success).toBe(
      false,
    );
  });
  it("resumes the same session across midnight and while paused", () => {
    let state = answer(start());
    state = setCoursePlan(state, { ...plan(), enabled: false }, now);
    expect(start(state, new Date("2026-09-24T00:00:00.000Z"))).toBe(state);
    state = finish(state);
    expect(courseSummary(state, now).status).toBe("paused");
    expect(start(state)).toBe(state);
    state = setCoursePlan(state, plan(), now);
    expect(start(state).learner.session?.id).not.toBe(
      state.learner.session?.id,
    );
  });
  it("persists hints and exposes only earned answer/solution feedback with opaque IDs", () => {
    const state = start();
    const dto = publicCourseSession(state.learner.session!);
    expect(
      dto.problems.every(
        (p) =>
          /^[a-f\d-]{36}$/.test(p.id) && p.hint === null && p.feedback === null,
      ),
    ).toBe(true);
    expect(JSON.stringify(dto)).not.toMatch(
      /"(?:seed|figureSpec|answer|solution)":/,
    );
    const hinted = revealCourseHint(state, inputFor(state));
    expect(storedCourseSchema.parse(hinted)).toEqual(hinted);
    expect(
      publicCourseSession(hinted.learner.session!).problems[0].hint,
    ).not.toBeNull();
    const attempted = answer(hinted);
    expect(attempted.learner.session?.attempts[0].usedHint).toBe(true);
    expect(
      publicCourseSession(attempted.learner.session!).problems[1].feedback,
    ).toBeNull();
    expect(() => revealCourseHint(state, inputFor(state, 2))).toThrow(
      CourseConflict,
    );
  });
  it("counts partial answers by KST date across multiple sessions and stops starting at the goal", () => {
    const before = new Date("2026-09-23T14:59:00.000Z");
    const after = new Date("2026-09-23T15:01:00.000Z");
    let state = answer(start(configured(undefined, 5), before), before);
    expect(courseSummary(state, after).todayAnswered).toBe(0);
    state = finish(state, after);
    expect(courseSummary(state, after).todayAnswered).toBe(4);
    state = start(state, after);
    state = answer(state, after);
    expect(courseSummary(state, after).todayAnswered).toBe(5);
    expect(start(state, after)).toBe(state); // finishing active is always allowed
    state = finish(state, after);
    expect(courseSummary(state, after).todayAnswered).toBe(9);
    expect(start(state, after)).toBe(state);
    expect(
      courseSummary(state, new Date("2026-09-24T15:01:00.000Z")).todayAnswered,
    ).toBe(0);
  });
  it("does not advance or endlessly replay a poor lesson today; schedules early review", () => {
    const state = finish(start(), now, true);
    expect(state.learner.selectedSectionId).toBe(COURSE_SECTIONS[0].id);
    expect(state.completedSectionIds).toEqual([]);
    expect(start(state)).toBe(state);
    expect(courseSummary(state, now).status).toBe("done");
    const later = new Date(now.getTime() + 86_400_000);
    const review = start(state, later, 99);
    expect(review.learner.session?.mode).toBe("review");
    expect(review.learner.session?.problems[0].seed).not.toBe(
      state.learner.session?.problems[0].seed,
    );
    const completed = finish(review, later);
    expect(completed.learner.selectedSectionId).toBe(COURSE_SECTIONS[0].id);
    expect(completed.completedSectionIds).toEqual([]);
    expect(start(completed, later).learner.session?.mode).toBe("learn");
  });
  it("prioritizes the oldest due review over a new lesson and retains the new cursor", () => {
    let state = finish(start());
    state = finish(start(state));
    const cursor = state.learner.selectedSectionId;
    const later = new Date(now.getTime() + 70 * 86_400_000);
    const due = Object.values(state.memories).sort((a, b) =>
      a.nextReviewAt.localeCompare(b.nextReviewAt),
    );
    state = start(state, later);
    expect(state.learner.session).toMatchObject({
      sectionId: due[0].sectionId,
      mode: "review",
    });
    state = finish(state, later);
    expect(state.learner.selectedSectionId).toBe(cursor);
  });
  it("finishes the final section instead of repeating it", () => {
    // A numeric fixture preserves the real engine's session/section validation.
    let state = start(configured(COURSE_SECTIONS.at(-1)!.id));
    state.learner.session!.problems = state.learner.session!.problems.map(
      (p) => ({
        ...p,
        content: "1+1을 계산하시오.",
        answer: "2",
        solution: "2입니다.",
        input: { mode: "number", label: "답", placeholder: "", help: "" },
      }),
    );
    state = finish(state);
    expect(courseSummary(state, now).status).toBe("complete");
    expect(start(state)).toBe(state);
  });
  it("requires a persisted reveal for self-check and never counts it as unaided evidence", () => {
    const state = start();
    const problem = state.learner.session!.problems[0];
    problem.content = "이유를 설명하시오.";
    problem.input.mode = "self-check";
    const input = { ...inputFor(state), selfCorrect: true };
    expect(() => submitCourseAttempt(state, input, now)).toThrow(
      CourseInvalidInput,
    );
    const answered = submitCourseAttempt(
      revealCourseHint(state, input),
      input,
      now,
    );
    expect(answered.memories[problem.sectionId]).toMatchObject({
      attempts: 1,
      correct: 1,
      unaidedCorrect: 0,
      hinted: 1,
      selfAssessed: 1,
      mastery: 0,
    });
  });
  it.each([2, 5])(
    "advances sections with %i self-check problems without inventing unaided mastery",
    (selfChecks) => {
      let state = start();
      const id = state.learner.session!.sectionId;
      for (const problem of state.learner.session!.problems.slice(
        0,
        selfChecks,
      )) {
        problem.content = "이유를 설명하시오.";
        problem.input.mode = "self-check";
      }
      state = finish(state);
      expect(state.completedSectionIds).toContain(id);
      expect(state.learner.selectedSectionId).toBe(COURSE_SECTIONS[1].id);
      expect(state.memories[id]).toMatchObject({
        unaidedCorrect: 5 - selfChecks,
        selfAssessed: selfChecks,
        hinted: selfChecks,
      });
      expect(state.memories[id].nextReviewAt).toBe(
        new Date(now.getTime() + 86_400_000).toISOString(),
      );
      if (selfChecks === 5) expect(state.memories[id].mastery).toBe(0);
      expect(start(state).learner.session?.sectionId).toBe(
        COURSE_SECTIONS[1].id,
      );
    },
  );
  it("does not advance mixed self-check work when an available auto-graded answer is wrong", () => {
    let state = start();
    for (const problem of state.learner.session!.problems.slice(0, 3)) {
      problem.content = "이유를 설명하시오.";
      problem.input.mode = "self-check";
    }
    for (let i = 0; i < 3; i++) state = answer(state);
    state = answer(state, now, true);
    state = finish(state);
    expect(state.completedSectionIds).toEqual([]);
    expect(state.learner.selectedSectionId).toBe(COURSE_SECTIONS[0].id);
  });
  it("idempotently replays identical answers even after another session, rejects stale/different ones", () => {
    const initial = start();
    const request = inputFor(initial);
    let state = submitCourseAttempt(initial, request, now);
    expect(
      submitCourseAttempt(state, request, new Date(now.getTime() + 500)),
    ).toBe(state);
    expect(() =>
      submitCourseAttempt(state, { ...request, submittedAnswer: "99999" }, now),
    ).toThrow(CourseConflict);
    expect(() =>
      submitCourseAttempt(initial, inputFor(initial, 2), now),
    ).toThrow(CourseConflict);
    state = start(finish(state));
    expect(submitCourseAttempt(state, request, now)).toBe(state);
  });
  it("preserves records on plan edits and rejects moving the start while work is unfinished", () => {
    let state = answer(start());
    expect(() =>
      setCoursePlan(state, plan(COURSE_SECTIONS[5].id), now),
    ).toThrow(CourseConflict);
    state = finish(state);
    const changed = setCoursePlan(state, plan(COURSE_SECTIONS[5].id), now);
    expect(changed.memories).toEqual(state.memories);
    expect(changed.activity).toEqual(state.activity);
    expect(start(changed).learner.session?.sectionId).toBe(
      COURSE_SECTIONS[5].id,
    );
  });
  it("uses evidence-dependent stability and labels recall as an estimate that decays", () => {
    const good = finish(start());
    const bad = finish(start(), now, true);
    const id = COURSE_SECTIONS[0].id;
    expect(good.memories[id].stabilityDays).toBeGreaterThan(
      bad.memories[id].stabilityDays,
    );
    expect(good.memories[id].mastery).toBeLessThan(100);
    expect(bad.memories[id].mastery).toBeGreaterThan(0);
    expect(
      estimatedCourseRecall(
        good.memories[id],
        new Date(now.getTime() + 100 * 86_400_000),
      ),
    ).toBeLessThan(estimatedCourseRecall(good.memories[id], now));
    const initial = start();
    const hinted = finish(revealCourseHint(initial, inputFor(initial)));
    expect(hinted.memories[id].nextReviewAt).toBe(
      new Date(now.getTime() + 86_400_000).toISOString(),
    );
  });
  it("grows stability once per spaced session, with a first perfect interval of three days", () => {
    let state = start();
    const id = state.learner.session!.sectionId;
    for (let i = 0; i < 4; i++) {
      state = answer(state);
      expect(state.memories[id].stabilityDays).toBe(1);
    }
    state = finish(state);
    expect(state.memories[id].stabilityDays).toBe(3);
    expect(state.memories[id].nextReviewAt).toBe(
      new Date(now.getTime() + 3 * 86_400_000).toISOString(),
    );
    const later = new Date(now.getTime() + 3 * 86_400_000);
    state = start(state, later, 78);
    for (let i = 0; i < 4; i++) {
      state = answer(state, later);
      expect(state.memories[id].stabilityDays).toBe(3);
    }
    state = finish(state, later);
    expect(state.memories[id].stabilityDays).toBeGreaterThan(3);
    expect(state.memories[id].stabilityDays).toBeLessThan(8);
  });
  it("bounds retained history while preserving exact lifetime and daily totals", () => {
    let state = configured();
    for (let day = 0; day < 92; day++) {
      const at = new Date(now.getTime() + day * 86_400_000);
      state = finish(start(state, at, 71 + day), at, true);
    }
    expect(state.history).toHaveLength(30);
    expect(state.activity).toHaveLength(90);
    expect(state.recentAttempts).toHaveLength(100);
    expect(state.memories[COURSE_SECTIONS[0].id]).toMatchObject({
      attempts: 460,
      completedSessions: 92,
      correct: 0,
    });
    expect(state.activity.every((day) => day.answered === 5)).toBe(true);
    expect(storedCourseSchema.safeParse(state).success).toBe(true);
  });
  it("validates persisted report DTOs and rejects malformed stored state", () => {
    const course = answer(start());
    const saved = { revision: 2, state: { ...emptySrsState(), course } };
    expect(
      courseStudentResponseSchema.safeParse({
        data: courseStudentDto(student, saved, now),
      }).success,
    ).toBe(true);
    const detail = courseDetailDto(student, saved, now);
    expect(
      courseStudentDetailResponseSchema.safeParse({ data: detail }).success,
    ).toBe(true);
    expect(detail.sections[0].attempts).toBe(1);
    expect(detail.activity[0].answered).toBe(1);
    for (const corrupt of [
      (s: StoredCourse) => {
        s.learner.selectedSectionId = "unknown";
      },
      (s: StoredCourse) => {
        s.requests = [];
      },
      (s: StoredCourse) => {
        s.memories[COURSE_SECTIONS[0].id].attempts = 100;
      },
      (s: StoredCourse) => {
        s.learner.session!.problems[0].id = "seed:71";
      },
      (s: StoredCourse) => {
        s.memories = {};
      },
      (s: StoredCourse) => {
        s.activity = [];
      },
    ]) {
      const broken = structuredClone(saved.state);
      corrupt(broken.course);
      expect(() => parseSrsState(broken)).toThrow(SrsUnavailable);
    }
  });
});

describe("shared row compare-and-swap", () => {
  const wrap =
    (fn: (c: StoredCourse) => StoredCourse) => (s: StoredSrsState) => {
      const prior = s.course ?? emptyCourseState();
      const course = fn(prior);
      return course === prior ? s : { ...s, course };
    };
  it("preserves old algebra records and course data through both types of write", async () => {
    const table = tableFixture();
    const old = await changeSrsState(
      studentId,
      (s) => startSrsMission(s, studentId, now, 3, randomUUID),
      table,
    );
    await changeSrsState(
      studentId,
      wrap((c) => setCoursePlan(c, plan(), now)),
      table,
      old.revision,
    );
    const course = await changeSrsState(
      studentId,
      wrap((c) => start(c)),
      table,
    );
    expect(course.state.missions).toEqual(old.state.missions);
    const result = await changeSrsState(
      studentId,
      (s) => startSrsMission(s, studentId, now, 4, randomUUID),
      table,
    );
    expect(result.state.course).toEqual(course.state.course);
    expect(parseSrsState(emptySrsState()).course).toBeUndefined();
  });
  it("concurrent starts and equal submissions persist exactly once", async () => {
    const table = tableFixture({ ...emptySrsState(), course: configured() });
    const starts = await Promise.all([
      changeSrsState(studentId, wrap(start), table),
      changeSrsState(studentId, wrap(start), table),
    ]);
    expect(starts[0]).toEqual(starts[1]);
    const input = inputFor(starts[0].state.course!);
    const fn = wrap((c) => submitCourseAttempt(c, input, now));
    const results = await Promise.all([
      changeSrsState(studentId, fn, table),
      changeSrsState(studentId, fn, table),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(results[0].state.course?.activity[0].answered).toBe(1);
  });
  it("concurrent different submissions conflict and stale plans never overwrite a learning write", async () => {
    const table = tableFixture({ ...emptySrsState(), course: start() });
    const saved = await readSrsState(studentId, table);
    const input = inputFor(saved.state.course!);
    const results = await Promise.allSettled([
      changeSrsState(
        studentId,
        wrap((c) => submitCourseAttempt(c, input, now)),
        table,
      ),
      changeSrsState(
        studentId,
        wrap((c) =>
          submitCourseAttempt(c, { ...input, submittedAnswer: "99999" }, now),
        ),
        table,
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await expect(
      changeSrsState(
        studentId,
        wrap((c) => setCoursePlan(c, plan(), now)),
        table,
        saved.revision,
      ),
    ).rejects.toThrow(SrsConflict);
    expect(
      (await readSrsState(studentId, table)).state.course?.activity[0].answered,
    ).toBe(1);
  });
  it("checks plan revisions again after a CAS collision, including first-row creation", async () => {
    const table = tableFixture();
    const results = await Promise.allSettled([
      changeSrsState(
        studentId,
        wrap((c) => setCoursePlan(c, plan(), now)),
        table,
        0,
      ),
      changeSrsState(
        studentId,
        wrap((c) => setCoursePlan(c, plan(COURSE_SECTIONS[3].id), now)),
        table,
        0,
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (results.find((r) => r.status === "rejected") as PromiseRejectedResult)
        .reason,
    ).toBeInstanceOf(SrsConflict);
  });
  it("reports missing storage without resetting or creating local data", async () => {
    const table = tableFixture();
    table.findUnique = async () => {
      throw { code: "P2021" };
    };
    await expect(readSrsState(studentId, table)).rejects.toThrow(
      SrsUnavailable,
    );
  });
});
