// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { mathExpeditionJourneySchema } from "@/contracts/mathExpedition.contract";
import { expeditionJourney } from "@/lib/math-explorers/expeditionJourney";
import {
  applyExplorerAction,
  createExplorerState,
} from "@/lib/math-explorers/engine";
import {
  definitionCard,
  definitionOptions,
  definitionQuestionId,
  definitionUnits,
  definitionNeedsRead,
} from "@/lib/math-explorers/definition-cards";
import {
  emptyCourseState,
  setCoursePlan,
  startAutomaticCourse,
  submitCourseAttempt,
} from "@/lib/math-srs/courseAutomation";
import { updateDailyJourney } from "@/lib/math-srs/dailyJourney";
import {
  emptySrsState,
  parseSrsState,
  recordSrsRetry,
  startSrsMission,
  submitSrsAttempt,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import { replayProblem } from "@/lib/math-srs/replay";
import { correctSrsChoice } from "@/lib/math-srs/sharedAnswers";

type MiddleProblem = StoredSrsState["missions"][number]["problems"][number];
/** 학생 미션은 폰 «한 걸음» 보기형(2026-09-27) — 정답·오답 제출을 문항 종류에 맞춘다 */
const right = (p: MiddleProblem) => correctSrsChoice(p) ?? String(p.answer);
const wrongOf = (p: MiddleProblem) =>
  p.choices ? p.choices[(p.answer + 1) % 4]! : String(p.answer + 999);

const now = new Date("2026-09-27T03:00:00.000Z");
const tomorrow = new Date("2026-09-28T03:00:00.000Z");
const student = randomUUID();
function withElementary(input = emptySrsState(), wrong = false, count = 5) {
  let course = startAutomaticCourse(
    setCoursePlan(
      emptyCourseState(),
      {
        startSectionId: "3-1-1-1",
        dailyQuestionCount: 5,
        enabled: true,
        expectedRevision: 0,
      },
      now,
    ),
    now,
    71,
    randomUUID,
  );
  let state = { ...input, course };
  for (let index = 0; index < count; index++) {
    const session = course.learner.session!;
    const problem = session.problems[index];
    course = submitCourseAttempt(
      course,
      {
        sessionId: session.id,
        problemId: problem.id,
        submittedAnswer: wrong && index === 0 ? "" : problem.answer,
        ...(wrong && index === 0 ? { giveUp: true } : {}),
      },
      now,
    );
    state = updateDailyJourney(state, { ...state, course }) as typeof state;
  }
  return state;
}
function withMiddle(
  input = emptySrsState(),
  wrong = false,
  count = 12,
  date = now,
) {
  let state = startSrsMission(input, student, date, 71, randomUUID);
  for (let index = 0; index < count; index++) {
    const mission = state.missions[0];
    const problem = mission.problems[index];
    state = submitSrsAttempt(
      state,
      student,
      {
        missionId: mission.id,
        problemId: problem.id,
        submittedAnswer:
          wrong && index === 0 ? wrongOf(problem) : right(problem),
        elapsedSeconds: 10,
        rating: "good",
      },
      date,
    );
  }
  return state;
}
function withExplorer(input = emptySrsState(), count = 30) {
  let explorer = createExplorerState(student);
  explorer = applyExplorerAction(
    explorer,
    {
      type: "start",
      route: "unit",
      unitId: definitionUnits.find((unit) => unit.grade === 3)!.id,
    },
    "2026-09-27",
    randomUUID(),
  ).state;
  for (let index = 0; index < count; index++) {
    const session = explorer.profile.definitions!.session!;
    if (session.done) break;
    const questionId = definitionQuestionId(session);
    if (definitionNeedsRead(explorer.profile, session)) {
      explorer = applyExplorerAction(
        explorer,
        { type: "read", questionId },
        "2026-09-27",
        randomUUID(),
      ).state;
      continue;
    }
    const task = session.queue[session.index];
    const card = definitionCard(task.cardId);
    const correct =
      task.kind === 0
        ? [0, 1]
        : task.kind === 1
          ? card.examples.flatMap((example, i) => (example.yes ? [i] : []))
          : [Number(card.truth)];
    const order = definitionOptions(session, task);
    explorer = applyExplorerAction(
      explorer,
      {
        type: "answer",
        questionId,
        choiceIds: correct.map((id) => order.indexOf(id)),
      },
      "2026-09-27",
      randomUUID(),
    ).state;
  }
  return { ...input, explorers: explorer };
}

describe("conservative unified expedition history", () => {
  it("combines three completed modes on one date into one permanent tile with every replay reference", () => {
    const state = withExplorer(withMiddle(withElementary()));
    const before = structuredClone(state);
    const journey = expeditionJourney(state, now);
    expect(mathExpeditionJourneySchema.safeParse(journey).success).toBe(true);
    expect(journey.completedDays).toBe(1);
    expect(journey.todayComplete).toBe(true);
    expect(journey.days[0].id).toBe("expedition:2026-09-27");
    expect(journey.days[0].reviews.map((review) => review.kind).sort()).toEqual(
      ["elementary", "explorers", "middle"],
    );
    expect(
      journey.days[0].reviews.find((review) => review.kind === "elementary")
        ?.dayId,
    ).toBe("elementary:2026-09-27");
    expect(
      journey.days[0].reviews.find((review) => review.kind === "middle")?.dayId,
    ).toBe("middle:2026-09-27");
    expect(
      journey.days[0].reviews.find((review) => review.kind === "explorers")
        ?.dayId,
    ).toBe("2026-09-27");
    expect(state).toEqual(before);
    expect(
      expeditionJourney(parseSrsState(state), tomorrow).completedDays,
    ).toBe(1);
    expect(expeditionJourney(state, tomorrow).todayComplete).toBe(false);
  });

  it("keeps past question-bank days replayable and adds only one tile on the next learning date", () => {
    const state = withMiddle(withMiddle(withElementary()), false, 12, tomorrow);
    const journey = expeditionJourney(state, tomorrow);
    expect(journey.days.map((day) => day.date)).toEqual([
      "2026-09-27",
      "2026-09-28",
    ]);
    for (const review of journey.days[0].reviews) {
      if (review.kind === "explorers") continue;
      const problem = replayProblem(
        state,
        review.kind,
        1,
        tomorrow,
        undefined,
        review.dayId,
      );
      expect(problem.answerChoices).toHaveLength(4);
      expect(problem.solution).toBeNull();
      expect(problem.title).toBeTruthy();
    }
    expect(journey.completedDays).toBe(2);
  });

  it("does not award partial work or a first pass with pending wrong-answer retries", () => {
    let state = withExplorer(
      withMiddle(withElementary(undefined, true), true),
      2,
    );
    expect(expeditionJourney(state, now).completedDays).toBe(0);
    const mission = state.missions[0];
    state = recordSrsRetry(
      state,
      mission.id,
      mission.problems[0].id,
      right(mission.problems[0]),
      now,
    ) as typeof state;
    expect(expeditionJourney(state, now).completedDays).toBe(1);
    // The union is a history metric. It must not alter or certify the unfinished
    // elementary/explorer sessions as a newly invented combined daily mission.
    expect(state.course!.learner.session!.retry?.completedAt).toBeNull();
    expect(state.explorers.profile.definitions!.session!.done).toBe(false);
    expect(
      expeditionJourney(state, now).days[0].reviews.map(
        (review) => review.kind,
      ),
    ).toEqual(["middle"]);
    expect(expeditionJourney(state, now).activeKind).toBe("explorers");
  });

  it("does not create new milestones from grade changes, duplicate legacy day rows or ordinary replay", () => {
    let state: StoredSrsState = withExplorer();
    const original = expeditionJourney(state, now).days;
    const changed = applyExplorerAction(
      state.explorers!,
      { type: "course", grade: 4 },
      "2026-09-27",
      randomUUID(),
    );
    state = {
      ...state,
      explorers: {
        ...changed.state,
        completedDays: [
          ...changed.state.completedDays,
          ...changed.state.completedDays,
        ],
      },
    };
    const journey = expeditionJourney(state, now);
    expect(journey.completedDays).toBe(1);
    expect(journey.days).toEqual(original);
    expect(
      journey.upcoming.every((unit) => unit.subtitle === "초등 4학년"),
    ).toBe(true);
    const replay = applyExplorerAction(
      changed.state,
      { type: "start", route: "unit", dayId: "2026-09-27" },
      "2026-09-28",
      randomUUID(),
    );
    expect(replay.state.profile.definitions?.session?.reviewOnly).toBe(true);
    expect(
      expeditionJourney({ ...state, explorers: replay.state }, tomorrow).days,
    ).toEqual(original);
  });

  it("does not invent old completion from absent or partially retained records", () => {
    const empty = expeditionJourney(emptySrsState(), now);
    expect(empty.days).toEqual([]);
    expect(empty.completedDays).toBe(0);
    expect(
      expeditionJourney(withMiddle(emptySrsState(), false, 11), now)
        .completedDays,
    ).toBe(0);
    expect(
      expeditionJourney(withElementary(emptySrsState(), false, 4), now)
        .completedDays,
    ).toBe(0);
  });
});
