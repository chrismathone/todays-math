// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({
  studentId: "017c1a9b-b28a-4a5b-80b6-f1a21ccfeee2",
  otherId: "ee7be323-de24-4c8c-b6d1-1da66f09efdf",
  classId: "7e7c388b-c264-4d39-809b-527723b8b74b",
  session: null as unknown,
  rows: new Map<
    string,
    { studentId: string; revision: number; payload: unknown }
  >(),
  writes: 0,
  withdrawn: false,
  disabled: false,
  missing: false,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: async () => f.session }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, fn: unknown) => fn,
}));
vi.mock("@/lib/db", () => ({
  db: {
    unit: { findFirst: async () => null },
    student: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        name: "학생",
        classId: f.classId,
        class: { id: f.classId, name: "테스트반" },
        eywaWithdrawnAt: f.withdrawn ? new Date() : null,
        studentAccount: {
          id: f.otherId,
          disabledAt: f.disabled ? new Date() : null,
        },
      }),
    },
    studentSrsState: {
      findUnique: async ({ where }: { where: { studentId: string } }) => {
        if (f.missing) throw { code: "P2021" };
        const row = structuredClone(f.rows.get(where.studentId) ?? null);
        await Promise.resolve();
        return row;
      },
      create: async ({
        data,
      }: {
        data: { studentId: string; revision: number; payload: unknown };
      }) => {
        if (f.rows.has(data.studentId)) throw { code: "P2002" };
        f.rows.set(data.studentId, structuredClone(data));
        f.writes++;
        return data;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { studentId: string; revision: number };
        data: { payload: unknown };
      }) => {
        const row = f.rows.get(where.studentId);
        if (!row || row.revision !== where.revision) return { count: 0 };
        f.rows.set(where.studentId, {
          ...row,
          revision: row.revision + 1,
          payload: structuredClone(data.payload),
        });
        f.writes++;
        return { count: 1 };
      },
    },
  },
}));

import { GET, POST } from "@/app/api/learn/math-explorers/route";
import { GET as COURSE_GET, POST as COURSE_START } from "@/app/api/learn/math-srs/course/route";
import { POST as COURSE_PLAN } from "@/app/api/learn/math-srs/course/plan/route";
import { POST as COURSE_ATTEMPT } from "@/app/api/learn/math-srs/course/attempts/route";
import { POST as REPLAY_POST, GET as REPLAY_GET } from "@/app/api/learn/math-srs/replay/route";
import { changeSrsState } from "@/lib/math-srs/serverStore";
import { emptyCourseState, setCoursePlan, startAutomaticCourse } from "@/lib/math-srs/courseAutomation";
import { courseStudentResponseSchema } from "@/contracts/mathSrsCourse.contract";
import {
  explorerStateSchema,
  type ExplorerAction,
  type ExplorerRequest,
  type ExplorerState,
} from "@/contracts/mathExplorers.contract";
import { definitionCard } from "@/lib/math-explorers/definition-cards";
import { createExplorerState } from "@/lib/math-explorers/engine";
import {
  emptySrsState,
  parseSrsState,
  startSrsMission,
  submitSrsAttempt,
} from "@/lib/math-srs/serverState";

const base = "http://localhost:3000";
const path = "/api/learn/math-explorers";
const now = new Date("2026-09-26T16:00:00.000Z"); // already Sep 27 in Korea
const read = (query = "") => GET(new Request(`${base}${path}${query}`));
const post = (body: unknown, origin = base) =>
  POST(
    new Request(`${base}${path}`, {
      method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
const data = async (response: Response) => {
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  return explorerStateSchema.parse((await response.json()).data);
};
const action = async (view: ExplorerState, value: ExplorerAction) =>
  data(
    await post({
      requestId: randomUUID(),
      expectedRevision: view.revision,
      action: value,
    }),
  );
const unitStart = async () => {
  const view = await data(await read());
  return action(view, {
    type: "start",
    route: "unit",
    unitId: view.units.find((unit) => unit.grade === 3)!.id,
  });
};
function correctAction(view: ExplorerState): ExplorerAction {
  const activity = view.currentActivity!;
  if (activity.kind === "read")
    return { type: "read", questionId: activity.questionId };
  const card = definitionCard(activity.cardId);
  const labels =
    activity.kind === "assemble"
      ? card.words.slice(0, 2)
      : activity.kind === "examples"
        ? card.examples
            .filter((example) => example.yes)
            .map((example) => example.text)
        : [card.truth ? "맞다" : "아니다"];
  return {
    type: "answer",
    questionId: activity.questionId,
    choiceIds: labels.map((label) => {
      const choice = activity.choices.find((option) => option.label === label);
      if (!choice) throw new Error(`Missing choice: ${activity.kind}/${label}`);
      return choice.id;
    }),
  };
}
async function finish(view: ExplorerState) {
  for (let count = 0; view.currentActivity && count < 70; count++)
    view = await action(view, correctAction(view));
  expect(view.session?.done).toBe(true);
  return view;
}
beforeEach(() => {
  f.rows.clear();
  f.writes = 0;
  f.withdrawn = false;
  f.disabled = false;
  f.missing = false;
  f.session = {
    student: { studentId: f.studentId, mustChangePassword: false },
  };
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("AUTH_URL", base);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("authenticated math explorer persistence", () => {
  it("freezes one assignment atomically and replays exact concurrent start receipts across reload and midnight", async () => {
    const body = { requestId: randomUUID(), expectedRevision: 0, action: { type: "expedition-start" } };
    const [first, duplicate] = await Promise.all([post(body), post(body)]).then((responses) => Promise.all(responses.map(data)));
    expect(first.expedition?.mission).toEqual(duplicate.expedition?.mission);
    expect(first.expedition?.mission).toMatchObject({ kind: "explorers", goal: 15, status: "active", answered: 0 });
    expect(first.expedition?.mission?.sourceSessionId).toBe(first.session?.id);
    expect(f.writes).toBe(1);
    vi.setSystemTime(new Date("2026-09-28T03:00:00.000Z"));
    expect((await data(await post(body))).expedition?.mission).toEqual(first.expedition?.mission);
    expect((await action(await data(await read()), { type: "expedition-start" })).session?.id).toBe(first.session?.id);
    expect((await post({ ...body, action: { type: "goal", unitId: first.units[0].id } })).status).toBe(409);
    expect((await post({ ...body, requestId: randomUUID() })).status).toBe(409);
  });

  it("blocks settings, alternate course starts and another bank through the shared CAS guard", async () => {
    const course = setCoursePlan(emptyCourseState(), { startSectionId: "3-1-1-1", dailyQuestionCount: 10, enabled: true, expectedRevision: 0 }, now);
    f.rows.set(f.studentId, { studentId: f.studentId, revision: 1, payload: { ...emptySrsState(), course } });
    const view = await action(await data(await read()), { type: "expedition-start" });
    const snapshot = structuredClone(f.rows.get(f.studentId));
    for (const value of [{ type: "goal", unitId: "g4-numbers" }, { type: "course", grade: 4 }, { type: "start", route: "memory" }]) {
      expect([400, 409]).toContain((await post({ requestId: randomUUID(), expectedRevision: view.revision, action: value })).status);
    }
    const request = (body: unknown) => new Request(`${base}/api/learn/math-srs/course`, { method: "POST", headers: { origin: base, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    expect((await COURSE_START(request({}))).status).toBe(409);
    expect((await COURSE_PLAN(request({ startSectionId: "3-1-1-1", dailyQuestionCount: 5, enabled: false, expectedRevision: view.revision }))).status).toBe(409);
    await expect(changeSrsState(f.studentId, (state) => startSrsMission(state, f.studentId, now, 71, randomUUID))).rejects.toThrow("진행 중");
    expect(f.rows.get(f.studentId)).toEqual(snapshot);
  });

  it("awards the actual Korea completion day once and keeps historical replay read only", async () => {
    vi.setSystemTime(new Date("2026-09-27T14:59:00.000Z"));
    let view = await action(await data(await read()), { type: "expedition-start" });
    const frozen = view.expedition!.mission!;
    view = await action(view, correctAction(view));
    vi.setSystemTime(new Date("2026-09-27T15:01:00.000Z"));
    view = await finish(view);
    expect(view.expedition?.mission).toMatchObject({ id: frozen.id, date: "2026-09-27", status: "complete", goal: 15, answered: 15 });
    expect(view.journey?.days.map((day) => day.date)).toEqual(["2026-09-28"]);
    expect(view.expedition?.canStart).toBe(false);
    const before = parseSrsState(f.rows.get(f.studentId)!.payload);
    vi.setSystemTime(new Date("2026-09-29T03:00:00.000Z"));
    view = await action(view, { type: "start", route: "unit", dayId: "2026-09-28" });
    expect(view.session?.cardIds).toEqual(before.explorers!.completedDays[0].cardIds);
    view = await finish(view);
    const after = parseSrsState(f.rows.get(f.studentId)!.payload);
    expect(after.expedition).toEqual(before.expedition);
    expect(after.explorers!.profile.stars).toBe(before.explorers!.profile.stars);
    expect(after.explorers!.profile.definitions!.cards).toEqual(before.explorers!.profile.definitions!.cards);
    expect(after.explorers!.completedDays).toEqual(before.explorers!.completedDays);
  });

  it("retains an exhausted unresolved source and cannot replace it at midnight", async () => {
    let view = await action(await data(await read()), { type: "expedition-start" });
    const id = view.session!.id;
    for (let count = 0; view.currentActivity && count < 100; count++) {
      const correct = correctAction(view);
      view = await action(view, correct.type === "read" ? correct : { type: "answer", questionId: view.currentActivity.questionId, choiceIds: [] });
    }
    expect(view.session?.done).toBe(true);
    expect(view.session?.unresolved.length).toBeGreaterThan(0);
    expect(view.expedition?.mission).toMatchObject({ status: "retry", answered: 15, sourceSessionId: id, completedAt: null });
    expect(view.journey?.completedDays).toBe(0);
    vi.setSystemTime(new Date("2026-09-28T03:00:00.000Z"));
    view = await action(view, { type: "expedition-start" });
    expect(view.session?.id).toBe(id);
    expect((await post({ requestId: randomUUID(), expectedRevision: view.revision, action: { type: "start", route: "unit", unitId: "g4-numbers" } })).status).toBe(409);
    expect((await post({ requestId: randomUUID(), expectedRevision: view.revision, action: { type: "goal", unitId: "g4-numbers" } })).status).toBe(409);
  });

  it("continues elementary ten across five-question sessions and midnight despite a source daily limit of five", async () => {
    const course = startAutomaticCourse(setCoursePlan(emptyCourseState(), { startSectionId: "3-1-1-1", dailyQuestionCount: 5, enabled: true, expectedRevision: 0 }, now), now, 71, randomUUID);
    f.rows.set(f.studentId, { studentId: f.studentId, revision: 1, payload: { ...emptySrsState(), course } });
    let view = await action(await data(await read()), { type: "expedition-start" });
    expect(view.expedition?.mission).toMatchObject({ kind: "elementary", goal: 10 });
    const request = (body: unknown) => new Request(`${base}/api/learn/math-srs/course`, { method: "POST", headers: { origin: base, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const answerNext = async (wrong = false) => {
      const session = parseSrsState(f.rows.get(f.studentId)!.payload).course!.learner.session!;
      const retry = session.retry && !session.retry.completedAt;
      const problem = retry ? session.problems.find((p) => p.id === session.retry!.pendingProblemIds[0])! : session.problems[session.attempts.length];
      const response = await COURSE_ATTEMPT(request({ sessionId: session.id, problemId: problem.id, submittedAnswer: wrong ? "" : problem.answer, ...(wrong ? { giveUp: true } : {}), ...(retry ? { retryIndex: session.retry!.attempts.length } : {}) }));
      expect(response.status).toBe(200);
      return courseStudentResponseSchema.parse(await response.json()).data;
    };
    for (let index = 0; index < 5; index++) await answerNext();
    const halfway = courseStudentResponseSchema.parse(await (await COURSE_GET(new Request(`${base}/api/learn/math-srs/course`))).json()).data;
    expect(halfway.journey).toMatchObject({ todayGoal: 10, todayAnswered: 5, todayComplete: false });
    expect(halfway.summary.recommendation?.mode).toBe("review");
    expect((await COURSE_START(request({}))).status).toBe(200);
    vi.setSystemTime(new Date("2026-09-28T03:00:00.000Z"));
    for (let index = 0; index < 5; index++) await answerNext(index === 4);
    view = await data(await read());
    expect(view.expedition?.mission).toMatchObject({ answered: 10, retryRemaining: 1, status: "retry" });
    expect(view.journey?.completedDays).toBe(0);
    const complete = await answerNext();
    expect(complete.journey).toMatchObject({ todayComplete: true, todayAnswered: 10, todayGoal: 10 });
    const saved = parseSrsState(f.rows.get(f.studentId)!.payload);
    expect(saved.course!.plan).toEqual(course.plan);
    expect(saved.expedition!.awards.map((a) => a.day.date)).toEqual(["2026-09-28"]);
    expect(saved.expedition!.mission!.sourceSessionIds).toHaveLength(2);
    const dayId = saved.expedition!.awards[0].day.dayId;
    const replay = await REPLAY_GET(new Request(`${base}/api/learn/math-srs/replay?kind=elementary&step=6&dayId=${encodeURIComponent(dayId)}`));
    expect(replay.status).toBe(200);
    const replayData = (await replay.json()).data;
    expect(replayData.problemId).toBe(saved.course!.learner.session!.problems[0].id);
    const before = structuredClone(f.rows.get(f.studentId));
    const graded = await REPLAY_POST(new Request(`${base}/api/learn/math-srs/replay`, { method: "POST", headers: { origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ kind: "elementary", step: 6, dayId, problemId: replayData.problemId, submittedAnswer: saved.course!.learner.session!.problems[0].answer }) }));
    expect(graded.status).toBe(200);
    expect(f.rows.get(f.studentId)).toEqual(before);
  });

  it("keeps the actual middle twelve unresolved until the server grades its last retry", async () => {
    const source = startSrsMission(emptySrsState(), f.studentId, now, 71, randomUUID);
    f.rows.set(f.studentId, { studentId: f.studentId, revision: 1, payload: source });
    const view = await action(await data(await read()), { type: "expedition-start" });
    expect(view.expedition?.mission).toMatchObject({ kind: "middle", goal: 12 });
    for (let index = 0; index < 12; index++) await changeSrsState(f.studentId, (state) => {
      const mission = state.missions[0];
      const problem = mission.problems[index];
      return submitSrsAttempt(state, f.studentId, { missionId: mission.id, problemId: problem.id, submittedAnswer: String(problem.answer + (index === 11 ? 999 : 0)), elapsedSeconds: 10, rating: "good" }, now);
    });
    expect((await data(await read())).expedition?.mission).toMatchObject({ status: "retry", answered: 12, retryRemaining: 1 });
    vi.setSystemTime(new Date("2026-09-28T03:00:00.000Z"));
    const mission = parseSrsState(f.rows.get(f.studentId)!.payload).missions[0];
    const request = () => new Request(`${base}/api/learn/math-srs/replay`, { method: "POST", headers: { origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ kind: "middle", step: 12, missionId: mission.id, problemId: mission.problems[11].id, submittedAnswer: String(mission.problems[11].answer), recordRetry: true }) });
    const response = await REPLAY_POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).data.journey).toMatchObject({ todayGoal: 12, todayAnswered: 12, todayComplete: true });
    const writes = f.writes;
    expect((await REPLAY_POST(request())).status).toBe(200);
    expect(f.writes).toBe(writes);
    expect((await data(await read())).journey?.days.map((day) => day.date)).toEqual(["2026-09-28"]);
  });
  it("stores selected grade and goal, then supports due-memory and prerequisite-repair sessions", async () => {
    let view = await data(await read());
    view = await action(view, { type: "course", grade: 4 });
    expect(view.profile.courseGrade).toBe(4);
    const target = view.units.find((unit) => unit.grade === 4)!;
    view = await action(view, { type: "goal", unitId: target.id });
    expect(view.profile.goalUnitId).toBe(target.id);
    view = await action(view, {
      type: "start",
      route: "unit",
      unitId: target.id,
    });
    view = await finish(view);
    vi.setSystemTime(new Date("2026-09-28T03:00:00.000Z"));
    view = await data(await read());
    expect(view.dueCardIds.length).toBeGreaterThan(0);
    view = await action(view, { type: "start", route: "memory" });
    expect(view.session?.route).toBe("memory");
    expect(view.session?.cardIds).toHaveLength(5);
    expect((await data(await read())).session?.id).toBe(view.session?.id);
    view = await finish(view);
    const completed = view.completedDays.length;
    view = await action(view, {
      type: "start",
      route: "repair",
      cardId: target.cards[0].id,
    });
    expect(view.session?.route).toBe("repair");
    expect(view.session?.cardIds).toHaveLength(5);
    view = await finish(view);
    expect(view.completedDays).toHaveLength(completed);
  });
  it("adds explorer progress without replacing existing question-bank learning records", async () => {
    const previous = startSrsMission(
      emptySrsState(),
      f.studentId,
      now,
      71,
      randomUUID,
    );
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 12,
      payload: previous,
    });
    const view = await unitStart();
    expect(view.revision).toBe(13);
    const stored = parseSrsState(f.rows.get(f.studentId)!.payload);
    expect(stored.missions).toEqual(previous.missions);
    expect(stored.memories).toEqual(previous.memories);
    expect(stored.dailyJourney).toEqual(previous.dailyJourney);
    expect(stored.explorers?.profile.id).toBe(f.studentId);
  });
  it("returns all 230 concept metadata without reading or mutating another student's profile", async () => {
    const foreign = {
      ...emptySrsState(),
      explorers: createExplorerState(f.otherId),
    };
    foreign.explorers.profile.stars = 999;
    f.rows.set(f.otherId, {
      studentId: f.otherId,
      revision: 20,
      payload: foreign,
    });
    const view = await data(await read(`?studentId=${f.otherId}`));
    expect(view.student.id).toBe(f.studentId);
    expect(view.today).toBe("2026-09-27");
    expect(view.journey?.completedDays).toBe(0);
    expect(view.profile.id).toBe(f.studentId);
    expect(view.profile.stars).toBe(0);
    expect(view.units).toHaveLength(46);
    expect(view.units.flatMap((unit) => unit.cards)).toHaveLength(230);
    expect(view.chests).toHaveLength(92);
    expect(view.units[0].cards[0]).not.toHaveProperty("definition");
    expect(view.units[0].cards[0]).not.toHaveProperty("truth");
    expect(view.feedback).toBeNull();
    expect(view.revision).toBe(0);
    expect(f.writes).toBe(0);
  });

  it("rejects anonymous, teacher, initial-password, disabled, withdrawn and cross-origin requests", async () => {
    f.session = null;
    expect((await read()).status).toBe(401);
    f.session = { user: { id: f.studentId } };
    expect((await read()).status).toBe(401);
    f.session = {
      student: { studentId: f.studentId, mustChangePassword: true },
    };
    expect((await read()).status).toBe(403);
    f.session = {
      student: { studentId: f.studentId, mustChangePassword: false },
    };
    f.disabled = true;
    expect((await read()).status).toBe(401);
    f.disabled = false;
    f.withdrawn = true;
    expect((await read()).status).toBe(401);
    f.withdrawn = false;
    expect((await post({}, "https://evil.example")).status).toBe(403);
    expect(f.writes).toBe(0);
  });

  it("strictly rejects forged grades, scores, owner IDs and browser dates", async () => {
    const view = await data(await read());
    const body = {
      requestId: randomUUID(),
      expectedRevision: 0,
      action: { type: "start", route: "unit", unitId: view.units[0].id },
    };
    for (const extra of [
      { studentId: f.otherId },
      { stars: 100 },
      { date: "2099-01-01" },
      { correct: true },
    ])
      expect((await post({ ...body, ...extra })).status).toBe(400);
    expect(
      (await post({ ...body, action: { ...body.action, correct: true } }))
        .status,
    ).toBe(400);
    expect(f.writes).toBe(0);
  });

  it("persists KST dates, resumes after reload, hides pending answers and rejects early solutions", async () => {
    let view = await unitStart();
    const stored = parseSrsState(f.rows.get(f.studentId)!.payload).explorers!;
    expect(stored.profile.definitions?.session?.date).toBe("2026-09-27");
    expect(view.currentActivity?.kind).toBe("read");
    view = await action(view, correctAction(view));
    expect(view.currentActivity?.kind).toBe("assemble");
    expect(view.currentActivity).not.toHaveProperty("reading");
    expect(view.currentActivity).not.toHaveProperty("answer");
    expect(view.currentActivity).not.toHaveProperty("solution");
    expect(
      view.currentActivity?.choices.every(
        (choice) => Object.keys(choice).sort().join() === "id,label",
      ),
    ).toBe(true);
    expect((await data(await read())).currentActivity).toEqual(
      view.currentActivity,
    );
    const early = await post({
      requestId: randomUUID(),
      expectedRevision: view.revision,
      action: { type: "solution", cardId: view.currentActivity!.cardId },
    });
    expect([400, 409]).toContain(early.status);
  });

  it("accepts exact lost-response retries and concurrent duplicates but rejects changed fingerprints and stale revisions", async () => {
    const view = await data(await read());
    const body: ExplorerRequest = {
      requestId: randomUUID(),
      expectedRevision: 0,
      action: { type: "start", route: "unit", unitId: view.units[0].id },
    };
    const pair = await Promise.all([post(body), post(body)]);
    const views = await Promise.all(pair.map(data));
    expect(views.every((entry) => entry.revision === 1)).toBe(true);
    expect(f.writes).toBe(1);
    const duplicate = await data(await post(body));
    expect(duplicate.revision).toBe(1);
    expect(f.writes).toBe(1);
    expect(
      (await post({ ...body, action: { type: "course", grade: 4 } })).status,
    ).toBe(409);
    expect(
      (
        await post({
          ...body,
          requestId: randomUUID(),
          action: { type: "course", grade: 4 },
        })
      ).status,
    ).toBe(409);
    expect(f.writes).toBe(1);
  });

  it("collects wrong answers, awards one completed day, unlocks chests, and replays old days without rewards", async () => {
    let view = await action(await data(await read()), { type: "expedition-start" });
    view = await action(view, correctAction(view));
    const initialActivity = view.currentActivity!;
    const correct = correctAction(view);
    if (correct.type !== "answer")
      throw new Error("Expected an answer activity");
    const wrongIds = initialActivity.choices
      .map((choice) => choice.id)
      .filter((id) => !correct.choiceIds.includes(id));
    view = await action(view, {
      type: "answer",
      questionId: initialActivity.questionId,
      choiceIds: wrongIds,
    });
    expect(view.feedback?.correct).toBe(false);
    expect(view.completedDays).toHaveLength(0);
    expect(
      (
        await post({
          requestId: randomUUID(),
          expectedRevision: view.revision,
          action: correct,
        })
      ).status,
    ).toBe(409);
    view = await finish(view);
    expect(view.completedDays).toHaveLength(1);
    expect(view.journey?.completedDays).toBe(1);
    expect(view.journey?.days[0].reviews[0]).toMatchObject({
      kind: "explorers",
      dayId: "2026-09-27",
    });
    expect(view.completedDays[0].date).toBe("2026-09-27");
    const solution = await action(view, {
      type: "solution",
      cardId: initialActivity.cardId,
    });
    expect(solution.feedback?.solution?.cardId).toBe(initialActivity.cardId);
    expect((await data(await read())).feedback).toBeNull();
    const chest = solution.chests.find((item) => item.ready && !item.claimed)!;
    expect(chest).toBeTruthy();
    view = await action(solution, { type: "chest", chestId: chest.id });
    expect(view.chests.find((item) => item.id === chest.id)?.claimed).toBe(
      true,
    );
    const stars = view.profile.stars;
    vi.setSystemTime(new Date("2026-09-28T03:00:00.000Z"));
    view = await action(view, {
      type: "start",
      route: "unit",
      dayId: "2026-09-27",
    });
    expect(view.session?.reviewOnly).toBe(true);
    view = await finish(view);
    expect(view.profile.stars).toBe(stars);
    expect(view.completedDays).toHaveLength(1);
    expect(
      parseSrsState(f.rows.get(f.studentId)!.payload).explorers?.completedDays,
    ).toHaveLength(1);
  });

  it("returns storage preparation errors and blocks a corrupted foreign-owner profile", async () => {
    f.missing = true;
    expect((await read()).status).toBe(503);
    f.missing = false;
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 1,
      payload: {
        ...emptySrsState(),
        explorers: createExplorerState(f.otherId),
      },
    });
    expect((await read()).status).toBe(503);
    expect(f.writes).toBe(0);
  });
});
