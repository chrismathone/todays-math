// @vitest-environment node
/**
 * A student walks the expedition for several days the way the routes do, and every write
 * must pass the stored contract (`parseSrsState`). The engine and the contract disagreed
 * twice (2026-10-19): an unhinted self-check answer, and a course session created without a
 * teacher plan — both answered 503 and left the student stuck.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  applyExplorerAction,
  ExplorerActionConflict,
} from "@/lib/math-explorers/engine";
import {
  definitionCard,
  definitionDue,
  definitionNeedsRead,
  definitionOptions,
  definitionQuestionId,
} from "@/lib/math-explorers/definition-cards";
import {
  expeditionCourseRecommendation,
  expeditionCoursePrerequisiteDecision,
  expeditionDto,
  expeditionToday,
  initialOwnedExplorer,
  updateExpedition,
} from "@/lib/math-explorers/expedition";
import { startExpedition } from "@/lib/math-explorers/expeditionStart";
import {
  emptyCourseState,
  setCoursePlan,
  startRecommendedCourse,
  submitCourseAttempt,
  submitCourseFollowUp,
} from "@/lib/math-srs/courseAutomation";
import { updateDailyJourney } from "@/lib/math-srs/dailyJourney";
import { withDefaultCoursePlan } from "@/lib/math-srs/defaultCoursePlan";
import {
  emptySrsState,
  parseSrsState,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import { kstDateOf } from "@/lib/kstDate";

const studentId = randomUUID();
const DAY = 86_400_000;
// 19:00 KST on a weekday in the second semester.
const firstDay = new Date("2026-10-19T10:00:00.000Z");

/** What `changeSrsState` does before writing: merge the journey and expedition, then parse. */
function persist(previous: StoredSrsState, next: StoredSrsState, now: Date) {
  if (next === previous) return previous;
  return parseSrsState(
    updateExpedition(previous, updateDailyJourney(previous, next), now, {}),
  );
}

function explorerAction(
  state: StoredSrsState,
  action: Parameters<typeof applyExplorerAction>[1],
  now: Date,
  followUps = false,
) {
  const seeded = withDefaultCoursePlan(state, "초5", now);
  const result = applyExplorerAction(
    initialOwnedExplorer(seeded, studentId, now),
    action,
    kstDateOf(now),
    randomUUID(),
    { followUps },
  );
  return persist(state, { ...seeded, explorers: result.state }, now);
}

function solveDefinitionStep(state: StoredSrsState, now: Date) {
  const session = state.explorers!.profile.definitions!.session!;
  const questionId = definitionQuestionId(session);
  if (definitionNeedsRead(state.explorers!.profile, session))
    return explorerAction(state, { type: "read", questionId }, now);
  const task = session.queue[session.index];
  const card = definitionCard(task.cardId);
  const correct =
    task.kind === 0
      ? [0, 1]
      : task.kind === 1
        ? card.examples.flatMap((example, i) => (example.yes ? [i] : []))
        : [Number(card.truth)];
  const order = definitionOptions(session, task);
  return explorerAction(
    state,
    {
      type: "answer",
      questionId,
      choiceIds: correct.map((id) => order.indexOf(id)),
    },
    now,
  );
}

/** One course answer the way the student screen sends it: right answers, self-checks without a hint. */
function answerCourse(state: StoredSrsState, now: Date, giveUpFirst = false) {
  const course = state.course!;
  const session = course.learner.session!;
  if (!session.completedAt) {
    const problem = session.problems[session.attempts.length];
    const selfCheck = problem.input.mode === "self-check";
    // Give up on the session's first auto-graded problem (5-2-1-1 opens with a self-check).
    if (
      giveUpFirst &&
      session.problems.findIndex((p) => p.input.mode !== "self-check") ===
        session.attempts.length
    ) {
      // «모르겠어요» on the follow-up screen opens the solution; «알겠어요» closes it.
      const gaveUp = submitCourseAttempt(
        course,
        {
          sessionId: session.id,
          problemId: problem.id,
          submittedAnswer: "",
          giveUp: true,
        },
        now,
        { followUps: true },
      );
      const opened = persist(state, { ...state, course: gaveUp }, now);
      return persist(
        opened,
        {
          ...opened,
          course: submitCourseFollowUp(
            opened.course!,
            { sessionId: session.id, problemId: problem.id, action: "done" },
            now,
          ),
        },
        now,
      );
    }
    const next = submitCourseAttempt(
      course,
      {
        sessionId: session.id,
        problemId: problem.id,
        submittedAnswer: selfCheck ? "" : problem.answer,
        ...(selfCheck ? { selfCorrect: true } : {}),
      },
      now,
      { followUps: giveUpFirst },
    );
    return persist(state, { ...state, course: next }, now);
  }
  const retry = session.retry!;
  const problem = session.problems.find(
    (p) => p.id === retry.pendingProblemIds[0],
  )!;
  const selfCheck = problem.input.mode === "self-check";
  const next = submitCourseAttempt(
    course,
    {
      sessionId: session.id,
      problemId: problem.id,
      submittedAnswer: selfCheck ? "" : problem.answer,
      retryIndex: retry.attempts.length,
      ...(selfCheck ? { selfCorrect: true } : {}),
    },
    now,
  );
  return persist(state, { ...state, course: next }, now);
}

/** The «다음 회차» request the student screen makes while today's elementary mission is open. */
function startNextCourseSession(state: StoredSrsState, now: Date) {
  const seeded = withDefaultCoursePlan(state, "초5", now);
  const course = seeded.course ?? emptyCourseState();
  const next = startRecommendedCourse(
    course,
    expeditionCourseRecommendation(seeded, now),
    now,
    7,
    randomUUID,
    [],
    expeditionCoursePrerequisiteDecision(seeded, now)?.session ?? undefined,
  );
  return next === course
    ? state
    : persist(state, { ...seeded, course: next }, now);
}

function playDay(
  state: StoredSrsState,
  now: Date,
  classGrade = "초5",
  giveUpFirst = false,
) {
  const kinds: string[] = [];
  // The routes show and start from the class grade's default plan (`withDefaultCoursePlan`).
  const seeded = withDefaultCoursePlan(state, classGrade, now);
  if (!expeditionDto(seeded, studentId, now).canStart) return { state, kinds };
  state = persist(
    state,
    startExpedition(seeded, studentId, now, randomUUID(), 11, randomUUID),
    now,
  );
  for (let guard = 0; guard < 400; guard++) {
    const mission = state.expedition?.mission;
    if (!mission || mission.status === "complete") break;
    if (!kinds.includes(mission.kind)) kinds.push(mission.kind);
    if (mission.kind === "explorers") {
      const session = state.explorers!.profile.definitions!.session!;
      if (session.done) {
        if (!session.unresolved.length) break;
        state = explorerAction(state, { type: "retry-unresolved" }, now);
        continue;
      }
      state = solveDefinitionStep(state, now);
      continue;
    }
    if (mission.kind === "elementary") {
      const session = state.course?.learner.session;
      const active =
        session &&
        (!session.completedAt || (session.retry && !session.retry.completedAt));
      state = active
        ? answerCourse(state, now, giveUpFirst)
        : startNextCourseSession(state, now);
      continue;
    }
    throw new Error(`unexpected mission kind ${mission.kind}`);
  }
  return { state, kinds };
}

describe("a 초5 student walking the expedition keeps a readable record", () => {
  it("chooses 초5 and a unit in the settings, then studies every day without a teacher plan", () => {
    let state = emptySrsState();
    state = explorerAction(state, { type: "course", grade: 5 }, firstDay);
    state = explorerAction(
      state,
      { type: "goal", unitId: "g5-estimate" },
      firstDay,
    );
    const seen: string[] = [];
    for (let day = 0; day < 6; day++) {
      const now = new Date(firstDay.getTime() + day * DAY);
      try {
        const played = playDay(state, now);
        state = played.state;
        seen.push(...played.kinds);
      } catch (error) {
        if (error instanceof ExplorerActionConflict) throw error;
        throw new Error(
          `day ${day + 1} (${kstDateOf(now)}): ${(error as Error).message}`,
        );
      }
    }
    // The walk must reach the elementary bank, where the missing plan used to fail.
    expect(seen).toContain("elementary");
  });

  it("starts a new 초5 student with no settings at the class grade's semester, not 초3", () => {
    let state = emptySrsState();
    const units: string[] = [];
    for (let day = 0; day < 4; day++) {
      const now = new Date(firstDay.getTime() + day * DAY);
      const played = playDay(state, now);
      state = played.state;
      const mission = state.expedition?.mission;
      if (mission) units.push(mission.unitId);
    }
    expect(state.course?.plan?.startSectionId).toBe("5-2-1-1");
    expect(units.length).toBeGreaterThan(0);
    expect(units.every((unit) => unit.startsWith("g5-"))).toBe(true);
  });

  it("studies from a teacher plan through sections that hand out self-check problems", () => {
    let state: StoredSrsState = {
      ...emptySrsState(),
      course: setCoursePlan(
        emptyCourseState(),
        {
          // 5-2-1-1 «이상과 이하» generates a self-check «모두 쓰시오» problem.
          startSectionId: "5-2-1-1",
          dailyQuestionCount: 10,
          enabled: true,
          expectedRevision: 0,
        },
        firstDay,
      ),
    };
    const seen: string[] = [];
    let selfChecks = 0;
    for (let day = 0; day < 6; day++) {
      const now = new Date(firstDay.getTime() + day * DAY);
      const played = playDay(state, now);
      state = played.state;
      seen.push(...played.kinds);
      selfChecks += [
        ...(state.course?.history.map((h) => h.session) ?? []),
        ...(state.course?.learner.session
          ? [state.course.learner.session]
          : []),
      ]
        .flatMap((s) => s.attempts)
        .filter((a) => a.selfAssessed && !a.usedHint).length;
    }
    expect(seen).toContain("elementary");
    expect(selfChecks).toBeGreaterThan(0);
  });

  it("finishes a bank day whose given-up problems were resolved on the spot (follow-ups)", () => {
    let state: StoredSrsState = {
      ...emptySrsState(),
      course: setCoursePlan(
        emptyCourseState(),
        {
          startSectionId: "5-2-1-1",
          dailyQuestionCount: 10,
          enabled: true,
          expectedRevision: 0,
        },
        firstDay,
      ),
    };
    const bankDays: string[] = [];
    for (let day = 0; day < 6; day++) {
      const now = new Date(firstDay.getTime() + day * DAY);
      const played = playDay(state, now, "초5", true);
      state = played.state;
      if (played.kinds.includes("elementary"))
        bankDays.push(state.expedition!.mission!.status);
    }
    const sessions = [
      ...state.course!.history.map((h) => h.session),
      ...(state.course!.learner.session ? [state.course!.learner.session] : []),
    ];
    expect(sessions.some((s) => s.followUps?.length)).toBe(true);
    // Resolved problems are never asked again in the same session, and the day ends.
    for (const s of sessions)
      for (const f of s.followUps ?? [])
        expect(
          s.retry?.attempts.some((a) => a.problemId === f.problemId) ?? false,
        ).toBe(false);
    expect(bankDays.length).toBeGreaterThan(0);
    expect(bankDays.every((status) => status === "complete")).toBe(true);
  });

  it("counts a concept activity waiting for its second try once in the mission", () => {
    let state = persist(
      emptySrsState(),
      startExpedition(
        withDefaultCoursePlan(emptySrsState(), "초5", firstDay),
        studentId,
        firstDay,
        randomUUID(),
        11,
        randomUUID,
      ),
      firstDay,
    );
    expect(state.expedition?.mission?.kind).toBe("explorers");
    const session = () => state.explorers!.profile.definitions!.session!;
    if (definitionNeedsRead(state.explorers!.profile, session()))
      state = explorerAction(
        state,
        { type: "read", questionId: definitionQuestionId(session()) },
        firstDay,
      );
    const task = session().queue[session().index];
    const card = definitionCard(task.cardId);
    const order = definitionOptions(session(), task);
    const wrong =
      task.kind === 0
        ? [0, 2]
        : task.kind === 1
          ? card.examples.map((_, i) => i)
          : [1 - Number(card.truth)];
    const questionId = definitionQuestionId(session());
    const answerWrong = (s: StoredSrsState) =>
      explorerAction(
        s,
        {
          type: "answer",
          questionId,
          choiceIds: wrong.map((id) => order.indexOf(id)),
        },
        firstDay,
        true,
      );
    state = answerWrong(state);
    expect(session().index).toBe(0);
    expect(session().followUp?.state).toBe("again");
    expect(state.expedition!.mission!.answered).toBe(1);
    state = answerWrong(state);
    expect(session().followUp?.state).toBe("solution");
    expect(state.expedition!.mission!.answered).toBe(1);
    state = explorerAction(
      state,
      { type: "understood", questionId },
      firstDay,
      true,
    );
    expect(session().index).toBe(1);
    expect(session().followUp).toBeUndefined();
    expect(state.expedition!.mission!.answered).toBe(1);
  });

  it("moves on to the bank when a hard card ends at its solution again in review; that card waits for later reviews", () => {
    /** One concept or review day; `missCard` (or the day's first «맞다/아니다») ends at its solution. */
    function conceptDay(
      start: StoredSrsState,
      now: Date,
      missCard: string | null,
    ) {
      let s = persist(
        start,
        startExpedition(
          withDefaultCoursePlan(start, "초5", now),
          studentId,
          now,
          randomUUID(),
          11,
          randomUUID,
        ),
        now,
      );
      const session = () => s.explorers!.profile.definitions!.session!;
      let missed: string | null = null;
      for (let guard = 0; guard < 80 && !session().done; guard++) {
        if (definitionNeedsRead(s.explorers!.profile, session())) {
          s = explorerAction(
            s,
            { type: "read", questionId: definitionQuestionId(session()) },
            now,
            true,
          );
          continue;
        }
        const task = session().queue[session().index];
        if (
          missed ||
          task.kind !== 2 ||
          (missCard !== null && task.cardId !== missCard)
        ) {
          s = solveDefinitionStep(s, now);
          continue;
        }
        missed = task.cardId;
        const questionId = definitionQuestionId(session());
        const wrong = [
          definitionOptions(session(), task).indexOf(
            1 - Number(definitionCard(task.cardId).truth),
          ),
        ];
        for (let i = 0; i < 2; i++)
          s = explorerAction(
            s,
            { type: "answer", questionId, choiceIds: wrong },
            now,
            true,
          );
        s = explorerAction(s, { type: "understood", questionId }, now, true);
      }
      expect(session().done).toBe(true);
      expect(s.expedition!.mission!.status).toBe("complete");
      return { state: s, missed: missed!, route: session().route };
    }
    const today = (s: StoredSrsState, now: Date) =>
      expeditionToday(withDefaultCoursePlan(s, "초5", now), studentId, now)
        .plan;

    const day1 = conceptDay(emptySrsState(), firstDay, null);
    const hard = day1.missed;
    expect(
      day1.state.explorers!.profile.definitions!.cards[hard],
    ).toMatchObject({ level: 0, missed: 1 });
    // Day 2 is the planned review of the five new cards, the hard one included.
    const day2Date = new Date(firstDay.getTime() + DAY);
    expect(today(day1.state, day2Date)).toMatchObject({
      kind: "explorers",
      route: "memory",
    });
    expect(
      definitionDue(day1.state.explorers!.profile, kstDateOf(day2Date)).map(
        (card) => card.id,
      ),
    ).toContain(hard);
    const day2 = conceptDay(day1.state, day2Date, hard);
    expect(day2.route).toBe("memory");
    expect(day2.missed).toBe(hard);
    expect(day2.state.explorers!.profile.definitions!.cards[hard].level).toBe(
      0,
    );
    // Day 3: the unit's concept day is not replayed — decision 6, the card waits for review.
    const day3Date = new Date(firstDay.getTime() + 2 * DAY);
    expect(today(day2.state, day3Date).kind).toBe("elementary");
  });
});
