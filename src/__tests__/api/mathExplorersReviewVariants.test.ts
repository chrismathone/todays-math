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
  EXPLORER_REVIEW_VARIANT_CARD_IDS as ids,
  EXPLORER_FOLLOW_UP_HEADER,
  explorerStateSchema,
  type ExplorerAction,
  type ExplorerState,
} from "@/contracts/mathExplorers.contract";
import {
  applyExplorerAction,
  createExplorerState,
} from "@/lib/math-explorers/engine";
import {
  definitionCard,
  definitionSessionCard,
} from "@/lib/math-explorers/definition-cards";
import { emptySrsState, parseSrsState } from "@/lib/math-srs/serverState";
const base = "http://localhost:3000";
const url = `${base}/api/learn/math-explorers`;
const date = "2026-10-22";
const headers = {
  origin: base,
  "Content-Type": "application/json",
  [EXPLORER_FOLLOW_UP_HEADER]: "1",
};
async function read() {
  const response = await GET(new Request(url, { headers }));
  expect(response.status).toBe(200);
  return explorerStateSchema.parse((await response.json()).data);
}
async function act(
  view: ExplorerState,
  action: ExplorerAction,
  requestId = randomUUID(),
) {
  const response = await POST(
    new Request(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        studentId: f.studentId,
        expectedRevision: view.revision,
        requestId,
        action,
      }),
    }),
  );
  expect(response.status).toBe(200);
  return explorerStateSchema.parse((await response.json()).data);
}
function load(id: string, kind: number, variant: false | 1 | 2) {
  let explorer = createExplorerState(f.studentId, 5);
  explorer = applyExplorerAction(
    explorer,
    { type: "start", route: "unit", unitId: "g5-estimate" },
    date,
    randomUUID(),
  ).state;
  const session = explorer.profile.definitions!.session!;
  session.seen = [...ids];
  session.index = session.queue.findIndex(
    (task) => task.cardId === id && task.kind === kind,
  );
  if (variant)
    session.reviewVariant = { version: variant, seed: 27, cardIds: [...ids] };
  f.rows.set(f.studentId, {
    studentId: f.studentId,
    revision: 1,
    payload: { ...emptySrsState(), explorers: explorer },
  });
  return definitionSessionCard(session, id);
}
beforeEach(() => {
  f.rows.clear();
  f.writes = 0;
  f.reads = 0;
  f.session = {
    student: { studentId: f.studentId, mustChangePassword: false },
  };
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-22T03:00:00Z"));
  vi.stubEnv("AUTH_URL", base);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
describe("actual explorer route with in-memory storage: variant reader", () => {
  it("rejects unauthenticated reads and writes before storage", async () => {
    f.session = null;
    expect((await GET(new Request(url, { headers }))).status).toBe(401);
    expect(
      (
        await POST(
          new Request(url, {
            method: "POST",
            headers,
            body: JSON.stringify({}),
          }),
        )
      ).status,
    ).toBe(401);
    expect(f.reads).toBe(0);
    expect(f.writes).toBe(0);
  });
  it("starts a versioned new memory session through the route and resumes an old one without marking it", async () => {
    const explorer = createExplorerState(f.studentId, 5);
    explorer.profile.definitions = {
      runs: 12,
      courseGrade: 5,
      history: [],
      cards: Object.fromEntries(
        ids.map((id) => [
          id,
          {
            level: 1,
            due: date,
            lastDate: "2026-10-21",
            attemptedAt: "2026-10-21",
            missed: 0,
          },
        ]),
      ),
    };
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 1,
      payload: { ...emptySrsState(), explorers: explorer },
    });
    const started = await act(await read(), { type: "start", route: "memory" });
    const saved = parseSrsState(f.rows.get(f.studentId)!.payload);
    expect(
      saved.explorers!.profile.definitions!.session!.reviewVariant,
    ).toEqual({ version: 2, seed: 13, cardIds: [...ids] });
    expect((await read()).currentActivity).toEqual(started.currentActivity);
    saved.explorers!.profile.definitions!.session!.reviewVariant!.version = 1;
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 7,
      payload: saved,
    });
    const oldV1 = await read();
    const resumedV1 = await act(oldV1, { type: "start", route: "memory" });
    expect(resumedV1.currentActivity).toEqual(oldV1.currentActivity);
    expect(
      parseSrsState(f.rows.get(f.studentId)!.payload).explorers!.profile
        .definitions!.session!.reviewVariant,
    ).toEqual({ version: 1, seed: 13, cardIds: [...ids] });
    delete saved.explorers!.profile.definitions!.session!.reviewVariant;
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 8,
      payload: saved,
    });
    const before = await read();
    const resumed = await act(before, { type: "start", route: "memory" });
    expect(resumed.currentActivity).toEqual(before.currentActivity);
    expect(
      parseSrsState(f.rows.get(f.studentId)!.payload).explorers!.profile
        .definitions!.session,
    ).not.toHaveProperty("reviewVariant");
  });

  it.each(ids)(
    "aligns GET, choices, POST grading, retry, solution reload and receipts: %s",
    async (id) => {
      for (const variant of [false, 1, 2] as const)
        for (const kind of [1, 2]) {
          const card = load(id, kind, variant);
          if (!variant) expect(card).toBe(definitionCard(id));
          let view = await read();
          const initial = view.currentActivity!;
          const correctLabels =
            kind === 1
              ? card.examples.filter((e) => e.yes).map((e) => e.text)
              : [card.truth ? "맞다" : "아니다"];
          const wrongLabels =
            kind === 1
              ? card.examples.filter((e) => !e.yes).map((e) => e.text)
              : [card.truth ? "아니다" : "맞다"];
          const choices = (labels: string[]) =>
            labels.map(
              (label) =>
                initial.choices.find((choice) => choice.label === label)!.id,
            );
          const correct = await act(view, {
            type: "answer",
            questionId: initial.questionId,
            choiceIds: choices(correctLabels),
          });
          expect(correct.feedback!.correct).toBe(true);
          load(id, kind, variant);
          view = await read();
          view = await act(view, {
            type: "answer",
            questionId: initial.questionId,
            choiceIds: choices(wrongLabels),
          });
          expect(view.currentActivity!.followUp!.state).toBe("again");
          expect((await read()).currentActivity!.choices).toEqual(
            initial.choices,
          );
          const requestId = randomUUID();
          const action: ExplorerAction = {
            type: "answer",
            questionId: initial.questionId,
            choiceIds: choices(wrongLabels),
          };
          const solution = await act(view, action, requestId);
          expect(solution.feedback!.solution!.examples).toEqual(
            card.examples.map((e) => ({ label: e.text, correct: e.yes })),
          );
          expect(solution.feedback!.solution!.statement).toBe(card.trap);
          expect(solution.feedback!.solution!.explanation).toBe(
            card.explanation,
          );
          expect(JSON.stringify(solution)).not.toContain("reviewVariant");
          expect(solution.currentActivity!.solution).toEqual(
            solution.feedback!.solution,
          );
          expect((await read()).currentActivity).toEqual(
            solution.currentActivity,
          );
          const writes = f.writes;
          expect((await act(view, action, requestId)).feedback).toEqual(
            solution.feedback,
          );
          expect(f.writes).toBe(writes);
          const moved = await act(solution, {
            type: "understood",
            questionId: initial.questionId,
          });
          expect(moved.currentActivity?.questionId).not.toBe(
            initial.questionId,
          );
          const stored = parseSrsState(
            f.rows.get(f.studentId)!.payload,
          ).explorers!;
          expect(stored.profile.definitions!.session!.reviewVariant).toEqual(
            variant
              ? { version: variant, seed: 27, cardIds: [...ids] }
              : undefined,
          );
          expect(stored.profile.definitions!.session!.first).toBe(0);
        }
    },
  );
});
