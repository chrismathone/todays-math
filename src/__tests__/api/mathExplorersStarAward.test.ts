// @vitest-environment node
// D-144 «한 칸 보장» — 오늘의 칸을 얻는 순간 그 미션이 준 카드 레벨 별이 3보다 적으면 3까지 채운다.
// 제품 라우트 · CAS 저장 · 탐험 가드를 그대로 지난다(DB 는 메모리 대역 — mathExplorersRoutes.test.ts 와 같은 모양).
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
        eywaWithdrawnAt: null,
        studentAccount: { id: f.otherId, disabledAt: null },
      }),
    },
    studentSrsState: {
      findUnique: async ({ where }: { where: { studentId: string } }) =>
        structuredClone(f.rows.get(where.studentId) ?? null),
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
import { POST as COURSE_START } from "@/app/api/learn/math-srs/course/route";
import { POST as COURSE_ATTEMPT } from "@/app/api/learn/math-srs/course/attempts/route";
import { POST as REPLAY_POST } from "@/app/api/learn/math-srs/replay/route";
import { changeSrsState } from "@/lib/math-srs/serverStore";
import { correctSrsChoice } from "@/lib/math-srs/sharedAnswers";
import {
  emptyCourseState,
  setCoursePlan,
  startAutomaticCourse,
} from "@/lib/math-srs/courseAutomation";
import {
  explorerStateSchema,
  type ExplorerAction,
  type ExplorerState,
} from "@/contracts/mathExplorers.contract";
import { definitionCard } from "@/lib/math-explorers/definition-cards";
import { createExplorerState } from "@/lib/math-explorers/engine";
import { createMemories } from "@/lib/math-srs/memory";
import {
  emptySrsState,
  parseSrsState,
  startSrsMission,
  submitSrsAttempt,
} from "@/lib/math-srs/serverState";

const base = "http://localhost:3000";
const path = "/api/learn/math-explorers";
const read = () => GET(new Request(`${base}${path}`));
const post = (body: unknown) =>
  POST(
    new Request(`${base}${path}`, {
      method: "POST",
      headers: { origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: f.studentId, ...(body as object) }),
    }),
  );
const data = async (response: Response) => {
  expect(response.status).toBe(200);
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
const saved = () => parseSrsState(f.rows.get(f.studentId)!.payload);
const profile = () => saved().explorers!.profile;
const courseRequest = (body: unknown) =>
  new Request(`${base}/api/learn/math-srs/course`, {
    method: "POST",
    headers: { origin: base, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/** 정답 — 초안 정의 조립 조각 · 예 모으기 · 참거짓. `wrongCards` 는 첫 바퀴에서 한 번 틀린다. */
function answerFor(
  view: ExplorerState,
  wrongCards: Set<string>,
  stuck?: string,
): ExplorerAction {
  const activity = view.currentActivity!;
  if (activity.kind === "read")
    return { type: "read", questionId: activity.questionId };
  const card = definitionCard(activity.cardId);
  const labels =
    activity.kind === "assemble"
      ? card.words.slice(0, 2)
      : activity.kind === "examples"
        ? card.examples.filter((e) => e.yes).map((e) => e.text)
        : [card.truth ? "맞다" : "아니다"];
  const correct = labels.map(
    (label) => activity.choices.find((c) => c.label === label)!.id,
  );
  if (
    (view.session!.round === 0 &&
      !view.session!.continuation &&
      wrongCards.delete(activity.cardId)) ||
    // `stuck` 카드는 자동 재도전 세 바퀴 내내 틀려 «남은 문제»로 남는다(명시 재도전에서는 맞힌다).
    (stuck === activity.cardId && !view.session!.continuation)
  )
    return {
      type: "answer",
      questionId: activity.questionId,
      choiceIds:
        activity.kind === "assemble"
          ? [...correct].reverse()
          : [activity.choices.find((c) => !correct.includes(c.id))!.id],
    };
  return {
    type: "answer",
    questionId: activity.questionId,
    choiceIds: correct,
  };
}
async function finishConcept(
  view: ExplorerState,
  wrongCards = new Set<string>(),
  stuck?: string,
) {
  for (let i = 0; view.currentActivity && i < 200; i++)
    view = await action(view, answerFor(view, wrongCards, stuck));
  expect(view.session?.done).toBe(true);
  return view;
}
type MiddleProblem = { answer: number; choices?: string[] };
const right = (p: MiddleProblem) => correctSrsChoice(p) ?? String(p.answer);
async function finishMiddle(wrongLast = false) {
  for (let index = 0; index < 12; index++)
    await changeSrsState(f.studentId, (state) => {
      const mission = state.missions.at(-1)!;
      const problem = mission.problems[index];
      return submitSrsAttempt(
        state,
        f.studentId,
        {
          missionId: mission.id,
          problemId: problem.id,
          submittedAnswer:
            wrongLast && index === 11
              ? problem.choices
                ? problem.choices[(problem.answer + 1) % 4]!
                : String(problem.answer + 999)
              : right(problem),
          elapsedSeconds: 10,
          rating: "good",
        },
        new Date(),
      );
    });
}
async function answerCourse() {
  const session = saved().course!.learner.session!;
  const problem = session.problems[session.attempts.length];
  expect(
    (
      await COURSE_ATTEMPT(
        courseRequest({
          sessionId: session.id,
          problemId: problem.id,
          submittedAnswer: problem.answer,
        }),
      )
    ).status,
  ).toBe(200);
}

beforeEach(() => {
  f.rows.clear();
  f.writes = 0;
  f.session = {
    student: { studentId: f.studentId, mustChangePassword: false },
  };
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-27T01:00:00.000Z"));
  vi.stubEnv("AUTH_URL", base);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("one-tile star floor (D-144)", () => {
  it("gives a middle question-bank day three stars once, only when its retry is solved, and not again the same day", async () => {
    const middle = startSrsMission(
      emptySrsState(),
      f.studentId,
      new Date("2026-09-27T00:00:00.000Z"),
      71,
      randomUUID,
    );
    const course = startAutomaticCourse(
      setCoursePlan(
        emptyCourseState(),
        {
          startSectionId: "3-1-1-1",
          dailyQuestionCount: 5,
          enabled: true,
          expectedRevision: 0,
        },
        new Date("2026-09-27T01:00:00.000Z"),
      ),
      new Date("2026-09-27T01:00:00.000Z"),
      71,
      randomUUID,
    );
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 1,
      payload: { ...middle, course },
    });
    let view = await action(await data(await read()), {
      type: "expedition-start",
    });
    expect(view.expedition?.mission).toMatchObject({ kind: "middle" });
    expect(profile()).toMatchObject({ stars: 0, earned: 0 });
    await finishMiddle(true);
    // 첫 풀이 12문제는 끝났지만 오답 하나가 남아 칸도 별도 아직이다.
    view = await data(await read());
    expect(view.expedition?.mission).toMatchObject({ status: "retry" });
    expect(profile()).toMatchObject({ stars: 0, earned: 0 });
    expect(view.expedition?.todayStars).toBeUndefined();
    const mission = saved().missions.at(-1)!;
    const retry = () =>
      REPLAY_POST(
        new Request(`${base}/api/learn/math-srs/replay`, {
          method: "POST",
          headers: { origin: base, "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "middle",
            step: 12,
            missionId: mission.id,
            problemId: mission.problems[11].id,
            submittedAnswer: right(mission.problems[11]),
            recordRetry: true,
          }),
        }),
      );
    expect((await retry()).status).toBe(200);
    expect(profile()).toMatchObject({ stars: 3, earned: 3 });
    expect(saved().expedition!.awards.at(-1)).toMatchObject({
      missionId: view.expedition!.mission!.id,
      stars: { cards: 0, bonus: 3 },
    });
    view = await data(await read());
    expect(view.profile).toMatchObject({ stars: 3, earned: 3 });
    expect(view.expedition?.todayStars).toEqual({ cards: 0, bonus: 3 });
    // 같은 재도전을 다시 보내도(응답을 잃은 재시도) 별은 그대로.
    expect((await retry()).status).toBe(200);
    expect(profile()).toMatchObject({ stars: 3, earned: 3 });
    // 같은 날 남은 초등 세션을 끝내도 칸이 없으니 별도 없다(추가 학습은 칸도 별도 안 늘린다).
    view = await action(view, { type: "expedition-start" });
    expect(view.expedition?.mission).toMatchObject({ kind: "elementary" });
    for (let i = 0; i < 5; i++) await answerCourse();
    expect((await COURSE_START(courseRequest({}))).status).toBe(200);
    for (let i = 0; i < 5; i++) await answerCourse();
    view = await data(await read());
    expect(view.expedition?.mission).toMatchObject({
      kind: "elementary",
      status: "complete",
    });
    expect(saved().expedition!.awards).toHaveLength(1);
    expect(profile()).toMatchObject({ stars: 3, earned: 3 });
  });

  it("gives an elementary bank day three stars on the Korea date it is finished", async () => {
    const start = new Date("2026-09-27T14:00:00.000Z"); // 한국 23시
    vi.setSystemTime(start);
    const course = startAutomaticCourse(
      setCoursePlan(
        emptyCourseState(),
        {
          startSectionId: "3-1-1-1",
          dailyQuestionCount: 5,
          enabled: true,
          expectedRevision: 0,
        },
        start,
      ),
      start,
      71,
      randomUUID,
    );
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 1,
      payload: { ...emptySrsState(), course },
    });
    let view = await action(await data(await read()), {
      type: "expedition-start",
    });
    expect(view.expedition?.mission).toMatchObject({
      kind: "elementary",
      goal: 10,
    });
    for (let i = 0; i < 5; i++) await answerCourse();
    expect((await COURSE_START(courseRequest({}))).status).toBe(200);
    vi.setSystemTime(new Date("2026-09-27T15:30:00.000Z")); // 자정 넘김
    for (let i = 0; i < 5; i++) await answerCourse();
    view = await data(await read());
    expect(view.journey?.days.map((d) => d.date)).toEqual(["2026-09-28"]);
    expect(saved().expedition!.awards[0]).toMatchObject({
      day: { date: "2026-09-28" },
      stars: { cards: 0, bonus: 3 },
    });
    expect(view.profile).toMatchObject({ stars: 3, earned: 3 });
    expect(view.expedition?.todayStars).toEqual({ cards: 0, bonus: 3 });
    // 다음 날에는 «오늘의 칸 별»이 따라오지 않는다.
    vi.setSystemTime(new Date("2026-09-29T01:00:00.000Z"));
    expect((await data(await read())).expedition?.todayStars).toBeUndefined();
  });

  it("adds nothing to a concept day whose five new cards already gave five stars", async () => {
    let view = await action(await data(await read()), {
      type: "expedition-start",
    });
    expect(view.expedition?.mission).toMatchObject({
      kind: "explorers",
      route: "unit",
    });
    view = await finishConcept(view);
    expect(view.session?.stars).toBe(5);
    expect(view.profile).toMatchObject({ stars: 5, earned: 5 });
    expect(saved().expedition!.awards[0]).toMatchObject({
      stars: { cards: 5, bonus: 0 },
    });
    expect(view.expedition?.todayStars).toEqual({ cards: 5, bonus: 0 });
  });

  it("tops a thin memory day up to three and keeps historical replay free of stars", async () => {
    let view = await action(await data(await read()), {
      type: "expedition-start",
    });
    view = await finishConcept(view);
    const cardIds = view.session!.cardIds;
    expect(view.profile.stars).toBe(5);
    // 다음 날 — 다섯 장 모두 만기라 기억 복습. 세 장은 처음에 틀려 레벨이 안 오르고, 두 장만 오른다.
    vi.setSystemTime(new Date("2026-09-28T01:00:00.000Z"));
    view = await action(await data(await read()), { type: "expedition-start" });
    expect(view.expedition?.mission).toMatchObject({
      kind: "explorers",
      route: "memory",
    });
    view = await finishConcept(view, new Set(cardIds.slice(0, 3)));
    expect(view.session?.stars).toBe(2);
    expect(saved().expedition!.awards.at(-1)).toMatchObject({
      day: { date: "2026-09-28" },
      stars: { cards: 2, bonus: 1 },
    });
    expect(view.profile).toMatchObject({ stars: 5 + 2 + 1, earned: 8 });
    expect(view.expedition?.todayStars).toEqual({ cards: 2, bonus: 1 });
    // 지난 칸 다시 풀기는 칸도 별도 없다.
    vi.setSystemTime(new Date("2026-09-29T01:00:00.000Z"));
    const before = saved();
    view = await action(await data(await read()), {
      type: "start",
      route: "unit",
      dayId: "2026-09-27",
    });
    view = await finishConcept(view);
    const after = saved();
    expect(after.expedition!.awards).toEqual(before.expedition!.awards);
    expect(after.explorers!.profile.stars).toBe(
      before.explorers!.profile.stars,
    );
    expect(after.explorers!.profile.earned).toBe(
      before.explorers!.profile.earned,
    );
  });

  it("keeps tiles awarded before D-144 as they were — no stars are added to past days", async () => {
    // 옛 판 기록: 은행 날 칸 하나(별 기록 없음) + 3단계를 다 키우고 별 40 이 쌓인 학생
    const middle = startSrsMission(
      emptySrsState(),
      f.studentId,
      new Date("2026-09-26T01:00:00.000Z"),
      71,
      randomUUID,
    );
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 1,
      payload: middle,
    });
    vi.setSystemTime(new Date("2026-09-26T01:00:00.000Z"));
    await action(await data(await read()), { type: "expedition-start" });
    await finishMiddle();
    const row = f.rows.get(f.studentId)!;
    const legacy = structuredClone(row.payload) as ReturnType<typeof saved>;
    delete (legacy.expedition!.awards[0] as { stars?: unknown }).stars;
    legacy.explorers!.profile = {
      ...legacy.explorers!.profile,
      level: 3,
      stars: 40,
      earned: 61,
    };
    f.rows.set(f.studentId, { ...row, payload: legacy });
    vi.setSystemTime(new Date("2026-09-28T01:00:00.000Z"));
    let view = await data(await read());
    expect(view.profile).toMatchObject({ level: 3, stars: 40, earned: 61 });
    expect(saved().expedition!.awards[0].stars).toBeUndefined();
    // 쌓인 별은 새 단계에 바로 쓰인다 — 누를 때마다 한 단계(12).
    view = await action(view, { type: "upgrade" });
    expect(view.profile).toMatchObject({ level: 4, stars: 28, earned: 61 });
    expect(view.feedback?.message).toBe("별 12개로 기지가 4단계로 자랐어요.");
  });
});

/** 옛 화면(오늘의 탐험 없이)에서 개념 세션 하나를 끝낸다 — 세션 별이 남는다. `stuck` 카드는 끝까지 틀려 남은 문제로 둔다. */
async function legacyConcept(unitId: string, stuck?: string) {
  let view = await data(await read());
  expect(view.expedition?.mission ?? null).toBeNull();
  view = await action(view, { type: "start", route: "unit", unitId });
  return finishConcept(view, new Set(), stuck);
}
const firstUnit = (view: ExplorerState, grade: number) =>
  view.units.find((unit) => unit.grade === grade)!;

describe("one-tile star floor counts only this mission's card stars (D-144 review)", () => {
  it("does not read a leftover concept session's stars on a middle bank day", async () => {
    vi.setSystemTime(new Date("2026-09-26T01:00:00.000Z"));
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 1,
      payload: startSrsMission(
        emptySrsState(),
        f.studentId,
        new Date("2026-09-26T00:00:00.000Z"),
        71,
        randomUUID,
      ),
    });
    const leftover = await legacyConcept("g7-equation");
    expect(leftover.session?.stars).toBe(5);
    let view = await action(leftover, { type: "expedition-start" });
    expect(view.expedition?.mission).toMatchObject({
      kind: "middle",
      route: "bank",
    });
    await finishMiddle();
    view = await data(await read());
    expect(saved().expedition!.awards.at(-1)!.stars).toEqual({
      cards: 0,
      bonus: 3,
    });
    expect(view.expedition?.todayStars).toEqual({ cards: 0, bonus: 3 });
    expect(view.profile).toMatchObject({ stars: 5 + 3, earned: 8 });
  });

  it("does not read a leftover concept session's stars on an elementary bank day", async () => {
    vi.setSystemTime(new Date("2026-09-26T01:00:00.000Z"));
    const start = new Date("2026-09-26T01:00:00.000Z");
    const course = startAutomaticCourse(
      setCoursePlan(
        emptyCourseState(),
        {
          startSectionId: "3-1-1-1",
          dailyQuestionCount: 5,
          enabled: true,
          expectedRevision: 0,
        },
        start,
      ),
      start,
      71,
      randomUUID,
    );
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 1,
      payload: { ...emptySrsState(), course },
    });
    const leftover = await legacyConcept(
      firstUnit(await data(await read()), 3).id,
    );
    expect(leftover.session?.stars).toBe(5);
    let view = await action(leftover, { type: "expedition-start" });
    expect(view.expedition?.mission).toMatchObject({ kind: "elementary" });
    for (let i = 0; i < 5; i++) await answerCourse();
    expect((await COURSE_START(courseRequest({}))).status).toBe(200);
    for (let i = 0; i < 5; i++) await answerCourse();
    view = await data(await read());
    expect(view.expedition?.mission).toMatchObject({ status: "complete" });
    expect(saved().expedition!.awards.at(-1)!.stars).toEqual({
      cards: 0,
      bonus: 3,
    });
    expect(view.profile.stars).toBe(5 + 3);
  });

  it("does not read a leftover concept session's stars on a 중1 bank review day (D-142 ⑼)", async () => {
    vi.setSystemTime(new Date("2026-09-20T01:00:00.000Z"));
    const explorer = createExplorerState(f.studentId, 7);
    explorer.profile.definitions = {
      courseGrade: 7,
      goalUnitId: "g7-equation",
      runs: 0,
      cards: {},
      history: [],
    };
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 1,
      payload: { ...emptySrsState(), explorers: explorer },
    });
    const leftover = await legacyConcept("g7-equation");
    expect(leftover.session?.stars).toBe(5);
    // 넘어간 중1: 끝낸 은행 날 셋 · 은행 개념 셋 만기 · 모은 카드는 아직 만기 전(개념 기억 복습이 끼지 않게)
    const state = saved();
    for (const card of Object.values(
      state.explorers!.profile.definitions!.cards,
    ))
      card.due = "2026-12-01";
    const bankDay = (date: string) => {
      const review = {
        kind: "middle" as const,
        dayId: `middle:${date}`,
        title: "일차방정식",
        subtitle: "중학교 1학년",
        reviewCount: 12,
      };
      return {
        missionId: randomUUID(),
        references: [],
        day: {
          ...review,
          id: `expedition:${date}`,
          date,
          completedAt: `${date}T02:00:00.000Z`,
          reviews: [review],
        },
      };
    };
    state.expedition = {
      version: 1,
      initializedAt: "2026-09-01T00:00:00.000Z",
      mission: null,
      legacyDays: [],
      receipts: [],
      awards: ["2026-09-16", "2026-09-17", "2026-09-18"].map(bankDay),
    };
    state.memories = createMemories().map((memory, i) => ({
      ...memory,
      attempts: i < 3 ? 4 : 0,
      lastReviewedAt: i < 3 ? "2026-09-20T03:00:00.000Z" : null,
      nextReviewAt: i < 3 ? "2026-09-26T00:00:00.000Z" : null,
    }));
    f.rows.set(f.studentId, { ...f.rows.get(f.studentId)!, payload: state });
    vi.setSystemTime(new Date("2026-09-27T01:00:00.000Z"));
    let view = await action(await data(await read()), {
      type: "expedition-start",
    });
    expect(view.expedition?.mission).toMatchObject({
      kind: "middle",
      route: "memory",
      title: "일차방정식 복습",
    });
    expect(saved().explorers!.profile.definitions!.session!.stars).toBe(5);
    await finishMiddle();
    view = await data(await read());
    expect(saved().expedition!.awards.at(-1)!.stars).toEqual({
      cards: 0,
      bonus: 3,
    });
    expect(view.profile.stars).toBe(5 + 3);
  });

  it("counts only the stars won after a legacy session was bound to the mission", async () => {
    // 옛 화면에서 끝냈지만 남은 문제가 있는 세션(카드 넷 수집 = 별 4)을 오늘의 탐험이 이어받는다.
    const unit = firstUnit(await data(await read()), 3);
    const stuck = unit.cards[1]!.id;
    const legacy = await legacyConcept(unit.id, stuck);
    expect(legacy.session).toMatchObject({ done: true, stars: 4 });
    expect(legacy.session!.unresolved.length).toBeGreaterThan(0);
    let view = await action(legacy, { type: "expedition-start" });
    expect(view.expedition?.mission).toMatchObject({
      kind: "explorers",
      status: "retry",
    });
    view = await action(view, { type: "retry-unresolved" });
    view = await finishConcept(view);
    expect(view.session).toMatchObject({ stars: 5, unresolved: [] });
    // 이 미션이 모은 카드는 한 장 — 보장이 둘을 채운다(옛 화면의 넷은 세지 않는다)
    expect(saved().expedition!.awards.at(-1)!.stars).toEqual({
      cards: 1,
      bonus: 2,
    });
    expect(view.expedition?.todayStars).toEqual({ cards: 1, bonus: 2 });
    expect(view.profile.stars).toBe(4 + 1 + 2);
  });

  it("counts every card the mission collected, including those only solved on its explicit retry", async () => {
    let view = await action(await data(await read()), {
      type: "expedition-start",
    });
    const stuck = view.session!.cardIds[1]!;
    view = await finishConcept(view, new Set(), stuck);
    expect(view.session).toMatchObject({ done: true, stars: 4 });
    expect(view.expedition?.mission).toMatchObject({ status: "retry" });
    view = await action(view, { type: "retry-unresolved" });
    view = await finishConcept(view);
    // 마지막 쓰기에서 오른 별은 1 이지만, 이 미션이 모은 카드는 다섯 — 보장 0
    expect(saved().expedition!.awards.at(-1)!.stars).toEqual({
      cards: 5,
      bonus: 0,
    });
    expect(view.profile.stars).toBe(5);
  });
});
