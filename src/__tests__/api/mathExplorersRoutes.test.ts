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
    let view = await unitStart();
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
