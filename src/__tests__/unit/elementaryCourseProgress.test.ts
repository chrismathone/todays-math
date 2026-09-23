import { describe, expect, it, vi } from "vitest";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { getCourseProblemInput } from "@/lib/math-srs/elementary/answers";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";
import {
  createCourseLearner,
  dueCourseSections,
  getSectionStatus,
  markCourseHint,
  recordCourseAttempt,
  startCourseSession,
} from "@/lib/math-srs/elementary/progress";
import {
  COURSE_STORAGE_KEY,
  loadCourseStore,
  saveCourseStore,
} from "@/lib/math-srs/elementary/storage";
import { STORAGE_KEY as LEGACY_STORAGE_KEY } from "@/lib/math-srs/storage";
import type {
  CourseAttempt,
  CourseLearnerState,
  CourseProblem,
  CourseSession,
  CourseStore,
} from "@/lib/math-srs/elementary/types";

const START = "2026-09-23T00:00:00.000Z";
const DAY_MS = 86_400_000;

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function session(
  sectionId = COURSE_SECTIONS[0].id,
  startedAt = START,
  manual = false,
): CourseSession {
  const id = `lesson-${sectionId}-${startedAt}`;
  const source = manual
    ? { content: "삼각형을 그리시오.", answer: "해설 참고" }
    : { content: "1 + 1의 값을 구하세요.", answer: "2" };
  return {
    id,
    sectionId,
    mode: "learn",
    startedAt,
    completedAt: null,
    attempts: [],
    problems: Array.from({ length: 5 }, (_, index): CourseProblem => ({
      id: `${id}-${index}`,
      sectionId,
      tier: "기본",
      seed: index,
      ...source,
      solution: "1에 1을 더하면 2입니다.",
      figureSpec: null,
      input: getCourseProblemInput(source),
    })),
  };
}

function nextAttempt(
  state: CourseLearnerState,
  changes: Partial<CourseAttempt> = {},
): CourseAttempt {
  const current = state.session!;
  const problem = current.problems[current.attempts.length];
  return {
    problemId: problem.id,
    submittedAnswer: problem.input.mode === "self-check" ? "" : "2",
    correct: true,
    usedHint: false,
    selfAssessed: problem.input.mode === "self-check",
    answeredAt: new Date(
      Date.parse(current.startedAt) + (current.attempts.length + 1) * 60_000,
    ).toISOString(),
    ...changes,
  };
}

function finish(
  state: CourseLearnerState,
  overrides: Partial<CourseAttempt> = {},
): CourseLearnerState {
  while (!state.session?.completedAt)
    state = recordCourseAttempt(state, nextAttempt(state, overrides));
  return state;
}

function storeFor(state: CourseLearnerState): CourseStore {
  return { version: 1, learners: { "srs-default": state } };
}

describe("elementary lesson progress", () => {
  it("starts at the first real course section without invented mastery", () => {
    const state = createCourseLearner();
    expect(state).toEqual({
      selectedSectionId: COURSE_SECTIONS[0].id,
      progress: {},
      session: null,
    });
    expect(
      getSectionStatus(state, COURSE_SECTIONS[0].id, new Date(START)),
    ).toBe("new");
    expect(dueCourseSections(state, new Date(START))).toEqual([]);
  });

  it("accepts actual generated sessions and preserves only five active problems", () => {
    for (const section of COURSE_SECTIONS) {
      const generated = generateCourseSession(
        section.id,
        section.order,
        new Date(START),
      );
      const state = startCourseSession(createCourseLearner(), generated);
      expect(state.session?.problems).toHaveLength(5);
      expect(saveCourseStore(storeFor(state), new MemoryStorage()).ok).toBe(
        true,
      );
    }
  });

  it("records ordered answers and rejects forged correctness, invalid numbers, and manual metadata", () => {
    const state = startCourseSession(createCourseLearner(), session());
    expect(() =>
      recordCourseAttempt(
        state,
        nextAttempt(state, { problemId: state.session!.problems[1].id }),
      ),
    ).toThrow();
    expect(() =>
      recordCourseAttempt(state, nextAttempt(state, { submittedAnswer: "3" })),
    ).toThrow();
    expect(() =>
      recordCourseAttempt(
        state,
        nextAttempt(state, { submittedAnswer: "1/0", correct: false }),
      ),
    ).toThrow();
    expect(() =>
      recordCourseAttempt(state, nextAttempt(state, { selfAssessed: true })),
    ).toThrow();
    expect(() =>
      recordCourseAttempt(
        state,
        nextAttempt(state, { answeredAt: "2026-09-22T00:00:00.000Z" }),
      ),
    ).toThrow();
    const skipped = recordCourseAttempt(
      state,
      nextAttempt(state, { submittedAnswer: "", correct: false }),
    );
    expect(skipped.session?.attempts).toHaveLength(1);
    expect(skipped.progress).toEqual({});
  });

  it("is immutable and idempotent, including the final answer and completion aggregate", () => {
    const initial = startCourseSession(createCourseLearner(), session());
    const attempt = nextAttempt(initial);
    const first = recordCourseAttempt(initial, attempt);
    expect(initial.session?.attempts).toHaveLength(0);
    expect(recordCourseAttempt(first, attempt)).toBe(first);
    expect(() =>
      recordCourseAttempt(first, { ...attempt, usedHint: true }),
    ).toThrow();
    const completed = finish(first);
    expect(recordCourseAttempt(completed, completed.session!.attempts[4])).toBe(
      completed,
    );
    expect(completed.progress[initial.session!.sectionId]).toMatchObject({
      completedSessions: 1,
      attempts: 5,
      correct: 5,
    });
    expect(completed.selectedSectionId).toBe(COURSE_SECTIONS[1].id);
  });

  it("persists solution hints and cannot treat the recorded hint as an independent answer", () => {
    const initial = startCourseSession(createCourseLearner(), session());
    const id = initial.session!.problems[0].id;
    expect(() =>
      markCourseHint(initial, initial.session!.problems[1].id),
    ).toThrow();
    const hinted = markCourseHint(initial, id);
    expect(markCourseHint(hinted, id)).toBe(hinted);
    const storage = new MemoryStorage();
    expect(saveCourseStore(storeFor(hinted), storage).ok).toBe(true);
    const restored = loadCourseStore(storage).store.learners["srs-default"];
    const answered = recordCourseAttempt(restored, nextAttempt(restored));
    expect(answered.session?.attempts[0].usedHint).toBe(true);
    const completed = finish(answered);
    expect(completed.progress[completed.session!.sectionId].intervalDays).toBe(
      1,
    );
  });

  it("restores A → B → A without losing questions, answers, or viewed hints", () => {
    let state = startCourseSession(createCourseLearner(), session());
    state = recordCourseAttempt(state, nextAttempt(state));
    state = markCourseHint(state, state.session!.problems[1].id);
    const a = state.session;
    state = startCourseSession(state, session(COURSE_SECTIONS[1].id));
    const b = state.session;
    expect(getSectionStatus(state, COURSE_SECTIONS[0].id)).toBe("learning");
    const storage = new MemoryStorage();
    expect(saveCourseStore(storeFor(state), storage).ok).toBe(true);
    state = loadCourseStore(storage).store.learners["srs-default"];
    state = startCourseSession(
      state,
      session(COURSE_SECTIONS[0].id, "2026-09-24T00:00:00.000Z"),
    );
    expect(state.session).toEqual(a);
    expect(state.pausedSessions).toEqual({ [COURSE_SECTIONS[1].id]: b });
    expect(startCourseSession(state, session())).toBe(state);
  });

  it("refuses a seventeenth paused lesson instead of dropping unfinished work", () => {
    let state = createCourseLearner();
    for (const section of COURSE_SECTIONS.slice(0, 17))
      state = startCourseSession(state, session(section.id));
    expect(Object.keys(state.pausedSessions!)).toHaveLength(16);
    expect(() =>
      startCourseSession(state, session(COURSE_SECTIONS[17].id)),
    ).toThrow(/먼저 마쳐/);
    expect(state.session?.sectionId).toBe(COURSE_SECTIONS[16].id);
    const restored = startCourseSession(state, session(COURSE_SECTIONS[0].id));
    expect(Object.keys(restored.pausedSessions!)).toHaveLength(16);
  });

  it("continues across chapter, semester, grade boundaries and stops at the final section", () => {
    const boundaries = COURSE_SECTIONS.filter((section, index) => {
      const next = COURSE_SECTIONS[index + 1];
      return (
        !next ||
        section.grade !== next.grade ||
        section.semester !== next.semester ||
        section.chapterId !== next.chapterId
      );
    });
    for (const section of boundaries) {
      const index = COURSE_SECTIONS.indexOf(section);
      const completed = finish(
        startCourseSession(createCourseLearner(), session(section.id)),
      );
      expect(completed.selectedSectionId).toBe(
        COURSE_SECTIONS[index + 1]?.id ?? section.id,
      );
    }
  });

  it("completes attempted lessons without claiming mastery and schedules weak work tomorrow", () => {
    const completed = finish(
      startCourseSession(createCourseLearner(), session()),
      { correct: false, submittedAnswer: "3" },
    );
    const progress = completed.progress[completed.session!.sectionId];
    expect(progress).toMatchObject({
      correct: 0,
      completedSessions: 1,
      intervalDays: 1,
    });
    expect(
      getSectionStatus(
        completed,
        progress.sectionId,
        new Date(progress.lastReviewedAt),
      ),
    ).toBe("complete");
    expect(
      dueCourseSections(
        completed,
        new Date(Date.parse(progress.nextReviewAt) - 1),
      ),
    ).toEqual([]);
    expect(
      getSectionStatus(
        completed,
        progress.sectionId,
        new Date(progress.nextReviewAt),
      ),
    ).toBe("review");
    expect(
      dueCourseSections(completed, new Date(progress.nextReviewAt)).map(
        (section) => section.id,
      ),
    ).toEqual([progress.sectionId]);
  });

  it("self-checked lessons require explicit self assessment and receive an early review", () => {
    const initial = startCourseSession(
      createCourseLearner(),
      session(COURSE_SECTIONS[0].id, START, true),
    );
    expect(() =>
      recordCourseAttempt(
        initial,
        nextAttempt(initial, { selfAssessed: false }),
      ),
    ).toThrow();
    const noted = recordCourseAttempt(
      initial,
      nextAttempt(initial, { submittedAnswer: "가".repeat(2_000) }),
    );
    expect(saveCourseStore(storeFor(noted), new MemoryStorage()).ok).toBe(true);
    const completed = finish(noted);
    expect(completed.progress[completed.session!.sectionId]).toMatchObject({
      correct: 5,
      intervalDays: 1,
    });
  });

  it("expands clean review intervals without using solving speed or losing next lesson selection", () => {
    let state = finish(startCourseSession(createCourseLearner(), session()));
    const selected = state.selectedSectionId;
    const first = state.progress[state.session!.sectionId];
    expect(first.intervalDays).toBe(3);
    const review = {
      ...session(first.sectionId, first.nextReviewAt),
      mode: "review" as const,
    };
    state = startCourseSession(state, review);
    expect(state.selectedSectionId).toBe(selected);
    // Days spent with a notebook do not lower a correct independent answer.
    for (let index = 0; index < 5; index++)
      state = recordCourseAttempt(
        state,
        nextAttempt(state, {
          answeredAt: new Date(
            Date.parse(review.startedAt) + (index + 1) * DAY_MS,
          ).toISOString(),
        }),
      );
    expect(state.progress[first.sectionId]).toMatchObject({
      completedSessions: 2,
      attempts: 10,
      correct: 10,
      intervalDays: 6,
    });
    expect(state.selectedSectionId).toBe(selected);
  });
});

describe("elementary isolated persistence", () => {
  it("keeps learner data separate and never changes the existing SRS storage key", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_STORAGE_KEY, "existing algebra learner data");
    const alice = finish(startCourseSession(createCourseLearner(), session()));
    const bob = startCourseSession(
      createCourseLearner(),
      session(COURSE_SECTIONS[25].id),
    );
    const store: CourseStore = { version: 1, learners: { alice, bob } };
    expect(saveCourseStore(store, storage)).toEqual({
      ok: true,
      warning: null,
    });
    expect(loadCourseStore(storage)).toEqual({ store, warning: null });
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBe(
      "existing algebra learner data",
    );
    expect(
      Object.keys(loadCourseStore(storage).store.learners.bob.progress),
    ).toHaveLength(0);
  });

  it.each(["{bad json", JSON.stringify({ version: 2, learners: {} }), "null"])(
    "protects unreadable or future storage: %s",
    (raw) => {
      const storage = new MemoryStorage();
      storage.setItem(COURSE_STORAGE_KEY, raw);
      expect(loadCourseStore(storage).warning).toBeTruthy();
      expect(saveCourseStore(storeFor(createCourseLearner()), storage).ok).toBe(
        false,
      );
      expect(storage.getItem(COURSE_STORAGE_KEY)).toBe(raw);
    },
  );

  it("rejects invalid curriculum IDs, answer order, forged completed aggregates, and oversized sessions", () => {
    const state = finish(startCourseSession(createCourseLearner(), session()));
    const invalids = [
      { ...state, selectedSectionId: "not-in-the-course" },
      { ...state, progress: {} },
      {
        ...state,
        session: {
          ...state.session,
          problems: [...state.session!.problems, state.session!.problems[0]],
        },
      },
      {
        ...state,
        session: {
          ...state.session,
          attempts: [...state.session!.attempts].reverse(),
        },
      },
      {
        ...state,
        session: { ...state.session, hintedProblemIds: ["unknown"] },
      },
      {
        ...state,
        pausedSessions: { [state.session!.sectionId]: state.session },
      },
      { ...state, progress: { unknown: Object.values(state.progress)[0] } },
    ];
    for (const invalid of invalids) {
      const storage = new MemoryStorage();
      const raw = JSON.stringify(storeFor(invalid as CourseLearnerState));
      storage.setItem(COURSE_STORAGE_KEY, raw);
      expect(loadCourseStore(storage).warning).toBeTruthy();
      expect(saveCourseStore(storeFor(createCourseLearner()), storage).ok).toBe(
        false,
      );
      expect(storage.getItem(COURSE_STORAGE_KEY)).toBe(raw);
    }
  });

  it("reports quota failures while preserving the previously persisted state", () => {
    const storage = new MemoryStorage();
    const store = storeFor(createCourseLearner());
    saveCourseStore(store, storage);
    const before = storage.getItem(COURSE_STORAGE_KEY);
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(
      saveCourseStore(
        storeFor(startCourseSession(createCourseLearner(), session())),
        storage,
      ),
    ).toMatchObject({
      ok: false,
      warning: expect.stringContaining("저장 공간"),
    });
    expect(storage.getItem(COURSE_STORAGE_KEY)).toBe(before);
  });

  it("reports denied browser storage and protects against prototype learner keys", () => {
    const storage = new MemoryStorage();
    const value = JSON.stringify(createCourseLearner());
    storage.setItem(
      COURSE_STORAGE_KEY,
      `{"version":1,"learners":{"__proto__":${value}}}`,
    );
    expect(loadCourseStore(storage).warning).toBeTruthy();
    vi.spyOn(storage, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(loadCourseStore(storage).warning).toContain("저장할 수 없습니다");
    expect(saveCourseStore(storeFor(createCourseLearner()), storage).ok).toBe(
      false,
    );
  });
});
