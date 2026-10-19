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
  reads: 0,
  withdrawn: false,
  disabled: false,
  missing: false,
  grade: null as string | null,
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
        class: { id: f.classId, name: "테스트반", grade: f.grade },
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
        f.reads++;
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
import {
  GET as COURSE_GET,
  POST as COURSE_START,
} from "@/app/api/learn/math-srs/course/route";
import { POST as COURSE_PLAN } from "@/app/api/learn/math-srs/course/plan/route";
import { POST as COURSE_ATTEMPT } from "@/app/api/learn/math-srs/course/attempts/route";
import {
  POST as REPLAY_POST,
  GET as REPLAY_GET,
} from "@/app/api/learn/math-srs/replay/route";
import { changeSrsState } from "@/lib/math-srs/serverStore";
import { correctSrsChoice } from "@/lib/math-srs/sharedAnswers";
import {
  emptyCourseState,
  setCoursePlan,
  startAutomaticCourse,
} from "@/lib/math-srs/courseAutomation";
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
/** The screen always names its student (D-146) — a body without one is refused. */
const post = (body: unknown, origin = base) =>
  postRaw(
    body && typeof body === "object" && !("studentId" in body)
      ? { ...body, studentId: f.studentId }
      : body,
    origin,
  );
const postRaw = (body: unknown, origin = base) =>
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
  f.reads = 0;
  f.withdrawn = false;
  f.disabled = false;
  f.missing = false;
  f.grade = null;
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

/** 학생 미션은 폰 «한 걸음» 보기형(2026-09-27) — 정답·오답 제출을 문항 종류에 맞춘다 */
type MiddleProblem = { answer: number; choices?: string[] };
const right = (p: MiddleProblem) => correctSrsChoice(p) ?? String(p.answer);
const wrongOf = (p: MiddleProblem) =>
  p.choices ? p.choices[(p.answer + 1) % 4]! : String(p.answer + 999);

describe("the class grade's default course plan (2026-10-19)", () => {
  const october = new Date("2026-10-19T10:00:00.000Z");
  it("shows a new 초5 student the 2nd-semester unit, writes nothing on read and keeps the plan on start", async () => {
    f.grade = "초5";
    vi.setSystemTime(october);
    const view = await data(await read());
    expect(view.expedition?.next?.unitId).toBe("g5-estimate");
    expect(f.writes).toBe(0);
    const started = await action(view, { type: "expedition-start" });
    expect(started.expedition?.mission?.unitId).toBe("g5-estimate");
    const stored = parseSrsState(f.rows.get(f.studentId)!.payload);
    expect(stored.course?.plan).toMatchObject({
      startSectionId: "5-2-1-1",
      dailyQuestionCount: 10,
      enabled: true,
    });
  });

  it("keeps a plan a teacher already saved", async () => {
    f.grade = "초5";
    vi.setSystemTime(october);
    await changeSrsState(f.studentId, (state) => ({
      ...state,
      course: setCoursePlan(
        emptyCourseState(),
        {
          startSectionId: "5-1-4-1",
          dailyQuestionCount: 5,
          enabled: true,
          expectedRevision: 0,
        },
        october,
      ),
    }));
    const view = await data(await read());
    await action(view, { type: "expedition-start" });
    const stored = parseSrsState(f.rows.get(f.studentId)!.payload);
    expect(stored.course?.plan?.startSectionId).toBe("5-1-4-1");
    expect(stored.course?.plan?.dailyQuestionCount).toBe(5);
  });

  it("leaves a class without an elementary grade as before", async () => {
    f.grade = "중2";
    vi.setSystemTime(october);
    await action(await data(await read()), { type: "expedition-start" });
    expect(
      parseSrsState(f.rows.get(f.studentId)!.payload).course,
    ).toBeUndefined();
  });
});

describe("authenticated math explorer persistence", () => {
  it("freezes one assignment atomically and replays exact concurrent start receipts across reload and midnight", async () => {
    const body = {
      requestId: randomUUID(),
      expectedRevision: 0,
      action: { type: "expedition-start" },
    };
    const [first, duplicate] = await Promise.all([post(body), post(body)]).then(
      (responses) => Promise.all(responses.map(data)),
    );
    expect(first.expedition?.mission).toEqual(duplicate.expedition?.mission);
    expect(first.expedition?.mission).toMatchObject({
      kind: "explorers",
      goal: 15,
      status: "active",
      answered: 0,
    });
    expect(first.expedition?.mission?.sourceSessionId).toBe(first.session?.id);
    expect(f.writes).toBe(1);
    vi.setSystemTime(new Date("2026-09-28T03:00:00.000Z"));
    expect((await data(await post(body))).expedition?.mission).toEqual(
      first.expedition?.mission,
    );
    expect(
      (await action(await data(await read()), { type: "expedition-start" }))
        .session?.id,
    ).toBe(first.session?.id);
    expect(
      (
        await post({
          ...body,
          action: { type: "goal", unitId: first.units[0].id },
        })
      ).status,
    ).toBe(409);
    expect((await post({ ...body, requestId: randomUUID() })).status).toBe(409);
  });

  it("blocks settings, other concept sessions, another bank and course plans while a bank mission is open", async () => {
    // An already started course session is unfinished work, so it is frozen first.
    const course = startAutomaticCourse(
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
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 1,
      payload: { ...emptySrsState(), course },
    });
    const view = await action(await data(await read()), {
      type: "expedition-start",
    });
    expect(view.expedition?.mission).toMatchObject({
      kind: "elementary",
      goal: 10,
      status: "active",
    });
    const snapshot = structuredClone(f.rows.get(f.studentId));
    for (const value of [
      { type: "goal", unitId: "g4-numbers" },
      { type: "course", grade: 4 },
      { type: "start", route: "unit", unitId: "g3-add" },
    ])
      expect(
        (
          await post({
            requestId: randomUUID(),
            expectedRevision: view.revision,
            action: value,
          })
        ).status,
      ).toBe(409);
    const request = (body: unknown) =>
      new Request(`${base}/api/learn/math-srs/course`, {
        method: "POST",
        headers: { origin: base, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    expect(
      (
        await COURSE_PLAN(
          request({
            startSectionId: "3-1-1-1",
            dailyQuestionCount: 10,
            enabled: true,
            expectedRevision: view.revision,
          }),
        )
      ).status,
    ).toBe(409);
    await expect(
      changeSrsState(f.studentId, (state) =>
        startSrsMission(state, f.studentId, now, 71, randomUUID),
      ),
    ).rejects.toThrow("진행 중");
    expect(f.rows.get(f.studentId)).toEqual(snapshot);
  });

  it("blocks another bank and course start while a concept mission is open", async () => {
    const course = setCoursePlan(
      emptyCourseState(),
      {
        startSectionId: "3-1-1-1",
        dailyQuestionCount: 10,
        enabled: true,
        expectedRevision: 0,
      },
      now,
    );
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 1,
      payload: { ...emptySrsState(), course },
    });
    let view = await action(await data(await read()), {
      type: "expedition-start",
    });
    // The current unit still has uncollected concepts, so concepts come first.
    expect(view.expedition?.mission).toMatchObject({
      kind: "explorers",
      unitId: "g3-add",
      goal: 15,
    });
    const frozen = view.expedition!.mission!;
    expect(
      (
        await post({
          requestId: randomUUID(),
          expectedRevision: view.revision,
          action: { type: "goal", unitId: "g4-numbers" },
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await post({
          requestId: randomUUID(),
          expectedRevision: view.revision,
          action: { type: "course", grade: 4 },
        })
      ).status,
    ).toBe(400);
    // Asking the concept engine for another route only resumes the frozen session.
    view = await action(view, { type: "start", route: "memory" });
    expect(view.session?.id).toBe(frozen.sourceSessionId);
    const snapshot = structuredClone(f.rows.get(f.studentId));
    const request = (body: unknown) =>
      new Request(`${base}/api/learn/math-srs/course`, {
        method: "POST",
        headers: { origin: base, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    expect((await COURSE_START(request({}))).status).toBe(409);
    expect(
      (
        await COURSE_PLAN(
          request({
            startSectionId: "3-1-1-1",
            dailyQuestionCount: 5,
            enabled: false,
            expectedRevision: view.revision,
          }),
        )
      ).status,
    ).toBe(409);
    await expect(
      changeSrsState(f.studentId, (state) =>
        startSrsMission(state, f.studentId, now, 71, randomUUID),
      ),
    ).rejects.toThrow("진행 중");
    expect(f.rows.get(f.studentId)).toEqual(snapshot);
    expect((await data(await read())).expedition?.mission).toEqual(frozen);
  });

  it("lets a teacher edit the plan without unfreezing the student's mission", async () => {
    const course = startAutomaticCourse(
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
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 1,
      payload: { ...emptySrsState(), course },
    });
    const view = await action(await data(await read()), {
      type: "expedition-start",
    });
    const frozen = view.expedition!.mission!;
    const edit = (state: ReturnType<typeof parseSrsState>) => ({
      ...state,
      course: setCoursePlan(
        state.course!,
        {
          startSectionId: "3-1-1-1",
          dailyQuestionCount: 10,
          enabled: true,
          expectedRevision: view.revision,
        },
        now,
      ),
    });
    await expect(changeSrsState(f.studentId, edit)).rejects.toThrow(
      "목표를 바꿔",
    );
    await changeSrsState(f.studentId, edit, undefined, undefined, {
      teacher: true,
    });
    const saved = parseSrsState(f.rows.get(f.studentId)!.payload);
    expect(saved.course!.plan!.dailyQuestionCount).toBe(10);
    expect(saved.expedition!.mission).toEqual(
      expect.objectContaining({
        id: frozen.id,
        unitId: frozen.unitId,
        goal: 10,
        status: "active",
      }),
    );
  });

  it("lets a teacher set the first plan while a concept-only (explorers) mission is open", async () => {
    // 운영 test_s(2026-09-30): 계획 없이 탐험만 한 학생의 9-28 미션이 7/15 로 열려 있어 원장님의 첫 계획 저장이 409 였다.
    const view = await action(await data(await read()), {
      type: "expedition-start",
    });
    const frozen = view.expedition!.mission!;
    expect(frozen.kind).toBe("explorers");
    const plan = (state: ReturnType<typeof parseSrsState>) => ({
      ...state,
      course: setCoursePlan(
        state.course ?? emptyCourseState(),
        {
          startSectionId: "3-1-1-1",
          dailyQuestionCount: 10,
          enabled: true,
          expectedRevision: view.revision,
        },
        now,
      ),
    });
    await expect(changeSrsState(f.studentId, plan)).rejects.toThrow();
    await changeSrsState(f.studentId, plan, undefined, undefined, {
      teacher: true,
    });
    const saved = parseSrsState(f.rows.get(f.studentId)!.payload);
    expect(saved.course!.plan!.startSectionId).toBe("3-1-1-1");
    expect(saved.expedition!.mission).toEqual(
      expect.objectContaining({
        id: frozen.id,
        kind: "explorers",
        status: "active",
      }),
    );
    // 선생님이라도 계획 밖 과정 칸(푼 소단원)은 열린 미션 동안 못 바꾼다
    const beyondPlan = (state: ReturnType<typeof parseSrsState>) => ({
      ...state,
      course: {
        ...state.course!,
        completedSectionIds: ["3-1-1-1"],
      },
    });
    await expect(
      changeSrsState(f.studentId, beyondPlan, undefined, undefined, {
        teacher: true,
      }),
    ).rejects.toThrow("진행 중인 오늘의 학습을 먼저 마쳐 주세요.");
  });

  it("awards the actual Korea completion day once and keeps historical replay read only", async () => {
    vi.setSystemTime(new Date("2026-09-27T14:59:00.000Z"));
    let view = await action(await data(await read()), {
      type: "expedition-start",
    });
    const frozen = view.expedition!.mission!;
    view = await action(view, correctAction(view));
    vi.setSystemTime(new Date("2026-09-27T15:01:00.000Z"));
    view = await finish(view);
    expect(view.expedition?.mission).toMatchObject({
      id: frozen.id,
      date: "2026-09-27",
      status: "complete",
      goal: 15,
      answered: 15,
    });
    expect(view.journey?.days.map((day) => day.date)).toEqual(["2026-09-28"]);
    expect(view.expedition?.canStart).toBe(false);
    const before = parseSrsState(f.rows.get(f.studentId)!.payload);
    vi.setSystemTime(new Date("2026-09-29T03:00:00.000Z"));
    view = await action(view, {
      type: "start",
      route: "unit",
      dayId: "2026-09-28",
    });
    expect(view.session?.cardIds).toEqual(
      before.explorers!.completedDays[0].cardIds,
    );
    view = await finish(view);
    const after = parseSrsState(f.rows.get(f.studentId)!.payload);
    expect(after.expedition).toEqual(before.expedition);
    expect(after.explorers!.profile.stars).toBe(
      before.explorers!.profile.stars,
    );
    expect(after.explorers!.profile.definitions!.cards).toEqual(
      before.explorers!.profile.definitions!.cards,
    );
    expect(after.explorers!.completedDays).toEqual(
      before.explorers!.completedDays,
    );
  });

  it("blocks supplement cards while today's mission is open and opens them after the tile (D-147)", async () => {
    let view = await action(await data(await read()), {
      type: "expedition-start",
    });
    expect(view.expedition?.mission?.status).toBe("active");
    const snapshot = structuredClone(f.rows.get(f.studentId));
    // 오늘의 탐험(개념 미션)이 열린 동안에는 보충을 시작하지 못한다 — 본 카드 세션이 열려 있어 엔진(conceptOpen)이 409.
    // 은행 미션(본 카드 세션 없음)은 경로의 막음과 저장 문지기가 맡는다(아래 두 시험).
    const blocked = await post({
      requestId: randomUUID(),
      expectedRevision: view.revision,
      action: { type: "supplement-start", cardId: "sup-line" },
    });
    expect(blocked.status).toBe(409);
    expect(f.rows.get(f.studentId)).toEqual(snapshot);
    view = await finish(view);
    expect(view.expedition?.mission?.status).toBe("complete");
    // 칸을 얻은 뒤에는 도감 선반에서 시작할 수 있다 — 칸 · 한 칸 보장은 그대로.
    const before = parseSrsState(f.rows.get(f.studentId)!.payload);
    view = await action(view, { type: "supplement-start", cardId: "sup-line" });
    expect(view.supplements!.session).toMatchObject({ cardId: "sup-line" });
    expect(view.supplements!.activity?.kind).toBe("read");
    const after = parseSrsState(f.rows.get(f.studentId)!.payload);
    expect(after.expedition).toEqual(before.expedition);
    expect(after.explorers!.completedDays).toEqual(
      before.explorers!.completedDays,
    );
  });

  it("refuses a supplement start on a bank day even for the card already being solved — no silent 200 (D-147 E2)", async () => {
    const course = startAutomaticCourse(
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
    // 어제 도감 선반에서 직선을 풀다 멈췄다(보충 칸에 active).
    const explorers = createExplorerState(f.studentId, 3);
    explorers.profile.supplements = {
      runs: 1,
      active: "sup-line",
      cards: {},
      sessions: {
        "sup-line": {
          id: "supplement-x-1",
          cardId: "sup-line",
          date: "2026-09-26",
          queue: [0, 1, 2],
          index: 0,
          round: 0,
          next: [],
          seen: false,
          passed: [],
        },
      },
    };
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 1,
      payload: { ...emptySrsState(), course, explorers },
    });
    const view = await action(await data(await read()), {
      type: "expedition-start",
    });
    expect(view.expedition?.mission).toMatchObject({
      kind: "elementary",
      status: "active",
    });
    const snapshot = structuredClone(f.rows.get(f.studentId));
    for (const value of [
      { type: "supplement-start", cardId: "sup-line" },
      {
        type: "supplement-read",
        questionId: view.supplements!.activity!.questionId,
      },
    ] as ExplorerAction[]) {
      const blocked = await post({
        requestId: randomUUID(),
        expectedRevision: view.revision,
        action: value,
      });
      expect(blocked.status).toBe(409);
    }
    expect(f.rows.get(f.studentId)).toEqual(snapshot);
    // 저장 문지기 자체도 — 미션이 열린 동안 보충 칸이 바뀌는 쓰기는 거절한다(expedition.ts updateExpedition).
    await expect(
      changeSrsState(f.studentId, (state) => ({
        ...state,
        explorers: {
          ...state.explorers!,
          profile: {
            ...state.explorers!.profile,
            supplements: { runs: 2, cards: {}, sessions: {} },
          },
        },
      })),
    ).rejects.toThrow("오늘의 탐험을 마친 뒤");
    expect(f.rows.get(f.studentId)).toEqual(snapshot);
  });

  it("blocks supplement cards while a bank mission is open — no concept session, the write guard refuses (D-147)", async () => {
    const course = startAutomaticCourse(
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
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 1,
      payload: { ...emptySrsState(), course },
    });
    const view = await action(await data(await read()), {
      type: "expedition-start",
    });
    expect(view.expedition?.mission).toMatchObject({
      kind: "elementary",
      status: "active",
    });
    expect(view.session).toBeNull();
    const snapshot = structuredClone(f.rows.get(f.studentId));
    const blocked = await post({
      requestId: randomUUID(),
      expectedRevision: view.revision,
      action: { type: "supplement-start", cardId: "sup-line" },
    });
    expect(blocked.status).toBe(409);
    expect(f.rows.get(f.studentId)).toEqual(snapshot);
  });

  it("keeps an exhausted concept mission open across midnight until retry-unresolved solves the rest", async () => {
    let view = await action(await data(await read()), {
      type: "expedition-start",
    });
    const id = view.session!.id;
    const missionId = view.expedition!.mission!.id;
    let lastRequestId = "";
    for (let count = 0; view.currentActivity && count < 100; count++) {
      const correct = correctAction(view);
      const activity = view.currentActivity;
      // Assembly needs two pieces: the right pieces in the wrong order are wrong.
      const wrong: ExplorerAction =
        correct.type !== "answer"
          ? correct
          : {
              type: "answer",
              questionId: activity.questionId,
              choiceIds:
                activity.kind === "assemble"
                  ? [...correct.choiceIds].reverse()
                  : [
                      activity.choices.find(
                        (choice) => !correct.choiceIds.includes(choice.id),
                      )!.id,
                    ],
            };
      lastRequestId = randomUUID();
      view = await data(
        await post({
          requestId: lastRequestId,
          expectedRevision: view.revision,
          action: wrong,
        }),
      );
    }
    // Three automatic rounds are exhausted and wrong tasks remain.
    expect(view.session).toMatchObject({ id, done: true, round: 3 });
    expect(view.session!.unresolved.length).toBeGreaterThan(0);
    expect(view.expedition?.mission).toMatchObject({
      id: missionId,
      status: "retry",
      answered: 15,
      sourceSessionId: id,
      completedAt: null,
    });
    expect(view.expedition?.mission?.retryRemaining).toBe(
      view.session!.unresolved.length,
    );
    expect(view.journey?.completedDays).toBe(0);
    const firstCorrect = view.session!.first;
    const before = parseSrsState(f.rows.get(f.studentId)!.payload);
    // A request ID already used for an answer cannot be replayed as a start.
    expect(
      (
        await post({
          requestId: lastRequestId,
          expectedRevision: view.revision,
          action: { type: "expedition-start" },
        })
      ).status,
    ).toBe(409);

    vi.setSystemTime(new Date("2026-09-28T03:00:00.000Z"));
    view = await action(view, { type: "expedition-start" });
    expect(view.session?.id).toBe(id);
    expect(view.expedition?.mission?.id).toBe(missionId);
    view = await action(view, {
      type: "start",
      route: "unit",
      unitId: "g4-numbers",
    });
    expect(view.session?.id).toBe(id);
    expect(
      (
        await post({
          requestId: randomUUID(),
          expectedRevision: view.revision,
          action: { type: "goal", unitId: "g4-numbers" },
        })
      ).status,
    ).toBe(409);

    const retryBody = {
      requestId: randomUUID(),
      expectedRevision: view.revision,
      action: { type: "retry-unresolved" },
    };
    view = await data(await post(retryBody));
    expect(view.session).toMatchObject({ id, done: false, continuation: 1 });
    // While reopened, the mission still owes the leftovers and keeps its 15 answered.
    expect(view.expedition?.mission).toMatchObject({
      id: missionId,
      answered: 15,
      status: "retry",
    });
    const writes = f.writes;
    expect((await data(await post(retryBody))).session?.continuation).toBe(1);
    expect(f.writes).toBe(writes);
    view = await finish(view);
    expect(view.session).toMatchObject({
      id,
      done: true,
      unresolved: [],
      first: firstCorrect,
    });
    expect(view.expedition?.mission).toMatchObject({
      id: missionId,
      date: "2026-09-27",
      status: "complete",
      retryRemaining: 0,
    });
    expect(view.journey?.days.map((day) => day.date)).toEqual(["2026-09-28"]);
    const after = parseSrsState(f.rows.get(f.studentId)!.payload);
    // First-attempt statistics are kept; the resolution is recorded, not re-counted.
    const history = after.explorers!.profile.definitions!.history.filter(
      (entry) => entry.sessionId === id,
    );
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      date: "2026-09-27",
      first: firstCorrect,
      unresolved: 0,
    });
    expect(
      after.explorers!.completedDays.filter((day) => day.sessionId === id),
    ).toHaveLength(1);
    // Explicit retries do not advance any memory schedule.
    // A card solved only on the retry is collected then, due the day after the
    // actual completion; the explicit retry never advances a review step.
    const cardsBefore = before.explorers!.profile.definitions!.cards;
    const cardsAfter = after.explorers!.profile.definitions!.cards;
    expect(Object.keys(cardsBefore).length).toBeGreaterThan(0);
    for (const [cardId, progress] of Object.entries(cardsBefore)) {
      expect(cardsAfter[cardId].reviewStep ?? 0).toBe(progress.reviewStep ?? 0);
      if (cardsAfter[cardId].due !== progress.due)
        expect(cardsAfter[cardId].due).toBe("2026-09-29");
    }
    const stars = after.explorers!.profile.stars;
    expect(
      (
        await post({
          requestId: randomUUID(),
          expectedRevision: view.revision,
          action: { type: "retry-unresolved" },
        })
      ).status,
    ).toBe(400);
    // One tile per Korea day: a finished day cannot start another assignment.
    expect(view.expedition?.canStart).toBe(false);
    expect(
      (
        await post({
          requestId: randomUUID(),
          expectedRevision: view.revision,
          action: { type: "expedition-start" },
        })
      ).status,
    ).toBe(409);
    expect(
      parseSrsState(f.rows.get(f.studentId)!.payload).explorers!.profile.stars,
    ).toBe(stars);
  });

  it("never adds a second tile on a day that already has one", async () => {
    vi.setSystemTime(new Date("2026-09-27T01:00:00.000Z"));
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
        now,
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
    // Two unfinished sources: the older one is frozen first.
    let view = await action(await data(await read()), {
      type: "expedition-start",
    });
    expect(view.expedition?.mission).toMatchObject({
      kind: "middle",
      goal: 12,
    });
    for (let index = 0; index < 12; index++)
      await changeSrsState(f.studentId, (state) => {
        const mission = state.missions[0];
        const problem = mission.problems[index];
        return submitSrsAttempt(
          state,
          f.studentId,
          {
            missionId: mission.id,
            problemId: problem.id,
            submittedAnswer: right(problem),
            elapsedSeconds: 10,
            rating: "good",
          },
          new Date(),
        );
      });
    view = await data(await read());
    expect(view.expedition?.mission).toMatchObject({
      kind: "middle",
      status: "complete",
    });
    expect(view.journey?.days.map((day) => day.date)).toEqual(["2026-09-27"]);
    // The started course session is still owed, so it may be finished today...
    expect(view.expedition?.canStart).toBe(true);
    view = await action(view, { type: "expedition-start" });
    expect(view.expedition?.mission).toMatchObject({
      kind: "elementary",
      status: "active",
    });
    const request = (body: unknown) =>
      new Request(`${base}/api/learn/math-srs/course`, {
        method: "POST",
        headers: { origin: base, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    const answerCurrent = async () => {
      const session = parseSrsState(f.rows.get(f.studentId)!.payload).course!
        .learner.session!;
      const problem = session.problems[session.attempts.length];
      expect(
        (
          await COURSE_ATTEMPT(
            request({
              sessionId: session.id,
              problemId: problem.id,
              submittedAnswer: problem.answer,
            }),
          )
        ).status,
      ).toBe(200);
    };
    for (let index = 0; index < 5; index++) await answerCurrent();
    expect((await COURSE_START(request({}))).status).toBe(200);
    for (let index = 0; index < 5; index++) await answerCurrent();
    view = await data(await read());
    // ...but it earns no second tile for the same Korea date.
    expect(view.expedition?.mission).toMatchObject({
      kind: "elementary",
      status: "complete",
      answered: 10,
    });
    expect(view.journey?.days.map((day) => day.date)).toEqual(["2026-09-27"]);
    expect(
      parseSrsState(f.rows.get(f.studentId)!.payload).expedition!.awards,
    ).toHaveLength(1);
    expect(view.expedition?.canStart).toBe(false);
  });

  it("continues elementary ten across five-question sessions and midnight despite a source daily limit of five", async () => {
    const course = startAutomaticCourse(
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
    const request = (body: unknown) =>
      new Request(`${base}/api/learn/math-srs/course`, {
        method: "POST",
        headers: { origin: base, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    const answerNext = async (wrong = false) => {
      const session = parseSrsState(f.rows.get(f.studentId)!.payload).course!
        .learner.session!;
      const retry = session.retry && !session.retry.completedAt;
      const problem = retry
        ? session.problems.find(
            (p) => p.id === session.retry!.pendingProblemIds[0],
          )!
        : session.problems[session.attempts.length];
      const response = await COURSE_ATTEMPT(
        request({
          sessionId: session.id,
          problemId: problem.id,
          submittedAnswer: wrong ? "" : problem.answer,
          ...(wrong ? { giveUp: true } : {}),
          ...(retry ? { retryIndex: session.retry!.attempts.length } : {}),
        }),
      );
      expect(response.status).toBe(200);
      return courseStudentResponseSchema.parse(await response.json()).data;
    };
    for (let index = 0; index < 5; index++) await answerNext();
    const halfway = courseStudentResponseSchema.parse(
      await (
        await COURSE_GET(new Request(`${base}/api/learn/math-srs/course`))
      ).json(),
    ).data;
    expect(halfway.journey).toMatchObject({
      todayGoal: 10,
      todayAnswered: 5,
      todayComplete: false,
    });
    expect(halfway.summary.recommendation?.mode).toBe("review");
    expect((await COURSE_START(request({}))).status).toBe(200);
    vi.setSystemTime(new Date("2026-09-28T03:00:00.000Z"));
    for (let index = 0; index < 5; index++) await answerNext(index === 4);
    view = await data(await read());
    expect(view.expedition?.mission).toMatchObject({
      answered: 10,
      retryRemaining: 1,
      status: "retry",
    });
    expect(view.journey?.completedDays).toBe(0);
    const complete = await answerNext();
    expect(complete.journey).toMatchObject({
      todayComplete: true,
      todayAnswered: 10,
      todayGoal: 10,
    });
    const saved = parseSrsState(f.rows.get(f.studentId)!.payload);
    expect(saved.course!.plan).toEqual(course.plan);
    expect(saved.expedition!.awards.map((a) => a.day.date)).toEqual([
      "2026-09-28",
    ]);
    expect(saved.expedition!.mission!.sourceSessionIds).toHaveLength(2);
    const dayId = saved.expedition!.awards[0].day.dayId;
    const replay = await REPLAY_GET(
      new Request(
        `${base}/api/learn/math-srs/replay?kind=elementary&step=6&dayId=${encodeURIComponent(dayId)}`,
      ),
    );
    expect(replay.status).toBe(200);
    const replayData = (await replay.json()).data;
    expect(replayData.problemId).toBe(
      saved.course!.learner.session!.problems[0].id,
    );
    const before = structuredClone(f.rows.get(f.studentId));
    const graded = await REPLAY_POST(
      new Request(`${base}/api/learn/math-srs/replay`, {
        method: "POST",
        headers: { origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "elementary",
          step: 6,
          dayId,
          problemId: replayData.problemId,
          submittedAnswer: saved.course!.learner.session!.problems[0].answer,
        }),
      }),
    );
    expect(graded.status).toBe(200);
    expect(f.rows.get(f.studentId)).toEqual(before);
  });

  it("keeps the actual middle twelve unresolved until the server grades its last retry", async () => {
    const source = startSrsMission(
      emptySrsState(),
      f.studentId,
      now,
      71,
      randomUUID,
    );
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 1,
      payload: source,
    });
    const view = await action(await data(await read()), {
      type: "expedition-start",
    });
    expect(view.expedition?.mission).toMatchObject({
      kind: "middle",
      goal: 12,
    });
    for (let index = 0; index < 12; index++)
      await changeSrsState(f.studentId, (state) => {
        const mission = state.missions[0];
        const problem = mission.problems[index];
        return submitSrsAttempt(
          state,
          f.studentId,
          {
            missionId: mission.id,
            problemId: problem.id,
            submittedAnswer: index === 11 ? wrongOf(problem) : right(problem),
            elapsedSeconds: 10,
            rating: "good",
          },
          now,
        );
      });
    expect((await data(await read())).expedition?.mission).toMatchObject({
      status: "retry",
      answered: 12,
      retryRemaining: 1,
    });
    vi.setSystemTime(new Date("2026-09-28T03:00:00.000Z"));
    const mission = parseSrsState(f.rows.get(f.studentId)!.payload).missions[0];
    const request = () =>
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
      });
    const response = await REPLAY_POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).data.journey).toMatchObject({
      todayGoal: 12,
      todayAnswered: 12,
      todayComplete: true,
    });
    const writes = f.writes;
    expect((await REPLAY_POST(request())).status).toBe(200);
    expect(f.writes).toBe(writes);
    expect(
      (await data(await read())).journey?.days.map((day) => day.date),
    ).toEqual(["2026-09-28"]);
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
    // 남의 학생 id 는 이제 «이 화면의 학생» 칸이라 모양은 맞다 — 그래도 로그인한 학생이 아니면 거절(409),
    // 쓰지 않는다(리드 3차 검토, 05 §8.21).
    expect((await post({ ...body, studentId: f.otherId })).status).toBe(409);
    for (const extra of [
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
      studentId: f.studentId,
    };
    const pair = await Promise.all([post(body), post(body)]);
    const views = await Promise.all(pair.map(data));
    expect(views.every((entry) => entry.revision === 1)).toBe(true);
    expect(f.writes).toBe(1);
    const duplicate = await data(await post(body));
    expect(duplicate.revision).toBe(1);
    expect(f.writes).toBe(1);
    const reused = await post({
      ...body,
      action: { type: "course", grade: 4 },
    });
    expect(reused.status).toBe(409);
    expect((await reused.json()).error.code).toBe("CONFLICT");
    const stale = await post({
      ...body,
      requestId: randomUUID(),
      action: { type: "course", grade: 4 },
    });
    expect(stale.status).toBe(409);
    expect((await stale.json()).error.code).toBe("REVISION_MISMATCH");
    expect(f.writes).toBe(1);
  });

  it("collects wrong answers, awards one completed day, unlocks chests, and replays old days without rewards", async () => {
    let view = await action(await data(await read()), {
      type: "expedition-start",
    });
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

/**
 * 상자 누름 속도 (2026-09-28, reward-speed ①) — 시작이 아닌 동작은 상태 행을 **미리 읽지 않고**
 * 바로 revision 비교 저장으로 간다. 미리 읽기가 하던 일(영수증 되돌려주기 · 탐험 시작 요청 번호
 * 재사용 막기)은 엔진 영수증과 저장 실패 뒤 다시 읽기가 받는다 — 그 셋을 여기서 지킨다.
 */
describe("chest press without a pre-read", () => {
  async function readyChest() {
    const view = await finish(await unitStart());
    const chest = view.chests.find((item) => item.ready && !item.claimed);
    if (!chest) throw new Error("Expected a ready chest");
    return { view, chest };
  }
  const chestBody = (
    view: ExplorerState,
    chestId: string,
  ): ExplorerRequest => ({
    requestId: randomUUID(),
    expectedRevision: view.revision,
    action: { type: "chest", chestId },
    studentId: f.studentId,
  });

  it("reads the state row once and writes once", async () => {
    const { view, chest } = await readyChest();
    f.reads = 0;
    f.writes = 0;
    const opened = await data(await post(chestBody(view, chest.id)));
    expect(opened.feedback).toMatchObject({ chestId: chest.id, stars: 1 });
    expect(opened.profile.stars).toBe(view.profile.stars + 1);
    expect(f.reads).toBe(1);
    expect(f.writes).toBe(1);
  });

  it("replays a lost response with the same receipt and no second star", async () => {
    const { view, chest } = await readyChest();
    const body = chestBody(view, chest.id);
    const first = await data(await post(body));
    f.writes = 0;
    const retry = await data(await post(body));
    expect(retry.feedback).toEqual(first.feedback);
    expect(retry.revision).toBe(first.revision);
    expect(retry.profile.stars).toBe(view.profile.stars + 1);
    expect(f.writes).toBe(0);
  });

  it("gives one star when two tabs send the very same press", async () => {
    const { view, chest } = await readyChest();
    const body = chestBody(view, chest.id);
    f.writes = 0;
    const [a, b] = await Promise.all([post(body), post(body)]).then(
      (responses) => Promise.all(responses.map(data)),
    );
    expect(a.feedback).toEqual(b.feedback);
    expect(a.feedback?.chestId).toBe(chest.id);
    expect(a.revision).toBe(b.revision);
    expect(a.profile.stars).toBe(view.profile.stars + 1);
    expect(b.profile.stars).toBe(view.profile.stars + 1);
    expect(f.writes).toBe(1);
  });

  it("refuses an action sent for another student and leaves the record alone", async () => {
    // 로그아웃 · 로그인은 소프트 이동이라 앞 학생의 저장 줄이 새 학생 쿠키로 나갈 수 있다(리드 3차 검토).
    const { view, chest } = await readyChest();
    f.writes = 0;
    const other = await post({
      ...chestBody(view, chest.id),
      studentId: f.otherId,
    });
    expect(other.status).toBe(409);
    expect((await other.json()).error.code).toBe("CONFLICT");
    expect(f.writes).toBe(0);
    const mine = await data(
      await post({ ...chestBody(view, chest.id), studentId: f.studentId }),
    );
    expect(mine.feedback?.chestId).toBe(chest.id);
    expect(f.writes).toBe(1);
  });

  it("refuses an action that does not name its student and leaves the record alone", async () => {
    // D-146 은 옛 탭 호환으로 선택이었다 — 모든 화면이 보낸 뒤로 필수(0-Y.5).
    const { view, chest } = await readyChest();
    f.writes = 0;
    const snapshot = structuredClone(f.rows.get(f.studentId));
    const { studentId, ...unnamedBody } = chestBody(view, chest.id);
    expect(studentId).toBe(f.studentId);
    const unnamed = await postRaw(unnamedBody);
    expect(unnamed.status).toBe(400);
    expect(f.writes).toBe(0);
    expect(f.rows.get(f.studentId)).toEqual(snapshot);
  });

  it("rejects an answer that reuses the expedition start request id", async () => {
    const view = await data(await read());
    const startId = randomUUID();
    const started = await data(
      await post({
        requestId: startId,
        expectedRevision: view.revision,
        action: { type: "expedition-start" },
      }),
    );
    const writes = f.writes;
    const reused = await post({
      requestId: startId,
      expectedRevision: started.revision,
      action: correctAction(started),
    });
    expect(reused.status).toBe(409);
    expect((await reused.json()).error.code).toBe("CONFLICT");
    expect(f.writes).toBe(writes);
  });
});

describe("concept card follow-ups — «한 번 더 → 풀이» (plan §3.2 ②)", () => {
  const asking = async (view: ExplorerState, value: ExplorerAction) =>
    data(
      await POST(
        new Request(`${base}${path}`, {
          method: "POST",
          headers: {
            origin: base,
            "Content-Type": "application/json",
            "x-explorer-follow-up": "1",
          },
          body: JSON.stringify({
            requestId: randomUUID(),
            expectedRevision: view.revision,
            studentId: f.studentId,
            action: value,
          }),
        }),
      ),
    );
  /** A wrong answer: the right choices of a different kind are never right here. */
  function wrongAction(view: ExplorerState): ExplorerAction {
    const activity = view.currentActivity!;
    const card = definitionCard(activity.cardId);
    const right = (correctAction(view) as { choiceIds: number[] }).choiceIds;
    const choiceIds =
      activity.kind === "truth"
        ? activity.choices.map((c) => c.id).filter((id) => id !== right[0])
        : activity.kind === "assemble"
          ? [
              right[0],
              activity.choices.find(
                (c) => c.label !== card.words[0] && c.label !== card.words[1],
              )!.id,
            ]
          : // Every example picked is wrong unless every example belongs.
            right.length === activity.choices.length
            ? [right[0]]
            : activity.choices.map((c) => c.id);
    return { type: "answer", questionId: activity.questionId, choiceIds };
  }
  async function toAnswer(view: ExplorerState) {
    if (view.currentActivity?.kind === "read")
      view = await action(view, correctAction(view));
    return view;
  }

  it("keeps a wrong answer on the question, opens the solution, and moves on at «알겠어요»", async () => {
    let view = await toAnswer(await unitStart());
    const questionId = view.currentActivity!.questionId;
    view = await asking(view, wrongAction(view));
    expect(view.feedback).toMatchObject({ correct: false, advance: false });
    expect(view.currentActivity?.questionId).toBe(questionId);
    expect(view.currentActivity?.followUp?.state).toBe("again");
    view = await asking(view, wrongAction(view));
    expect(view.currentActivity?.followUp?.state).toBe("solution");
    expect(view.currentActivity?.solution?.cardId).toBe(
      view.currentActivity!.cardId,
    );
    expect(view.feedback?.solution).toBeDefined();
    // A tab that does not ask still reads the open solution without the new fields.
    const plain = await data(await read());
    expect(plain.currentActivity?.questionId).toBe(questionId);
    expect("followUp" in plain.currentActivity!).toBe(false);
    view = await asking(view, { type: "understood", questionId });
    expect(view.currentActivity?.questionId).not.toBe(questionId);
    expect(view.currentActivity?.followUp).toBeUndefined();
  });

  it("keeps the old rounds for a screen that does not ask", async () => {
    let view = await toAnswer(await unitStart());
    const questionId = view.currentActivity!.questionId;
    view = await action(view, wrongAction(view));
    expect(view.feedback).toMatchObject({ correct: false, advance: true });
    expect(view.currentActivity?.questionId).not.toBe(questionId);
    expect(view.currentActivity && "followUp" in view.currentActivity).toBe(
      false,
    );
  });
});
