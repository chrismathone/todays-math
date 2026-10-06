// @vitest-environment node
// «오늘의 기억» 학생 라우트 — 실제 은행의 개념으로 풀이 한 벌을 HTTP 로 돈다(은행 전체를 싣는다).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({
  studentId: "017c1a9b-b28a-4a5b-80b6-f1a21ccfeee2",
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
  classGrade: "중2" as string | null,
  /** 다음 쓰기 직전에 한 번 — 다른 창이 먼저 저장한 것처럼 revision 을 올린다. */
  raceOnce: false,
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
        class: { id: f.classId, name: "테스트반", grade: f.classGrade },
        eywaWithdrawnAt: f.withdrawn ? new Date() : null,
        studentAccount: {
          id: "ee7be323-de24-4c8c-b6d1-1da66f09efdf",
          disabledAt: f.disabled ? new Date() : null,
        },
      }),
    },
    studentSrsState: {
      findUnique: async ({ where }: { where: { studentId: string } }) => {
        f.reads++;
        return structuredClone(f.rows.get(where.studentId) ?? null);
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
        if (f.raceOnce && row) {
          f.raceOnce = false;
          row.revision += 1;
        }
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

import { GET as CATALOG } from "@/app/api/learn/fading/catalog/route";
import { GET as CONCEPT } from "@/app/api/learn/fading/concepts/[id]/route";
import { GET, POST } from "@/app/api/learn/fading/route";
import type { FadingPlacement } from "@/contracts/fading.contract";
import {
  fadingCatalogResponseSchema,
  fadingConceptResponseSchema,
  fadingStateResponseSchema,
  type FadingAction,
  type FadingState,
} from "@/contracts/fadingApi.contract";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { fadingCatalog } from "@/lib/fading/catalog";
import { chipFits, chipTray } from "@/lib/fading/chips";
import type { FadingConcept } from "@/lib/fading/concepts";
import {
  fadingEnabled,
  fadingGate,
  fadingReadable,
} from "@/lib/fading/enabled";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import { fadingFigureMap } from "@/lib/fading/figures";
import { createLocalFadingSource } from "@/lib/fading/local";
import { FADING_TRAPS } from "@/lib/fading/trapTable";
import { fadingTrapMap } from "@/lib/fading/traps";
import { FadingSourceError } from "@/lib/fading/source";
import { emptyFading, pickFadingConcept } from "@/lib/fading/state";
import { emptySrsState, parseSrsState } from "@/lib/math-srs/serverState";

const base = "http://localhost:3000";
const path = "/api/learn/fading";
const DAY1 = new Date("2026-10-06T03:00:00.000Z"); // 한국 10월 6일 낮
const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;

const read = () => GET(new Request(`${base}${path}`));
const postRaw = (body: unknown, origin = base) =>
  POST(
    new Request(`${base}${path}`, {
      method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
const catalog = (query = "") =>
  CATALOG(new Request(`${base}${path}/catalog${query}`));
const concept = (id: string) =>
  CONCEPT(new Request(`${base}${path}/concepts/${id}`), {
    params: Promise.resolve({ id }),
  });

async function state(response: Response): Promise<FadingState> {
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  return fadingStateResponseSchema.parse(await response.json()).data;
}
const act = async (action: FadingAction) => state(await postRaw(action));
const code = async (response: Response) =>
  [response.status, (await response.json()).error?.code] as const;

/** 그 단계를 안 틀리고 채우는 «넣기»의 차례 — 화면이 하듯 받은 내용과 씨앗으로 칩을 낸다. */
function placements(
  c: FadingConcept,
  step: FadingStep,
  seed: number,
  miss = false,
  traps: readonly { text: string }[] = [],
): FadingPlacement[] {
  const tray = chipTray(c, step, { seed, traps });
  const used = new Set<string>();
  const moves: FadingPlacement[] = [];
  for (const [i, target] of erasedTargets(c, step).entries()) {
    if (miss && i === 0)
      moves.push({
        targetId: target.id,
        chipId: tray.find((chip) => !chipFits(c, target.id, chip))!.id,
      });
    const chip = tray.find(
      (x) => !used.has(x.id) && chipFits(c, target.id, x),
    )!;
    used.add(chip.id);
    moves.push({ targetId: target.id, chipId: chip.id });
  }
  return moves;
}

/** 은행의 중2 첫 개념들. */
async function someConcepts() {
  const response = await catalog("?grade=중2");
  expect(response.status).toBe(200);
  const data = fadingCatalogResponseSchema.parse(await response.json()).data;
  return data.sections.flatMap((s) => s.concepts.map((c) => c.id));
}

/** 풀이를 열어 4단계까지 마친다(평가 직전). */
async function toRating(conceptId: string) {
  let view = await act({ action: "open", conceptId });
  const sessionId = view.session!.id;
  const content = view.opened!.concept as FadingConcept;
  if (view.session!.step === 1)
    view = await act({ action: "read", conceptId, sessionId });
  for (let step = view.session!.step; step <= 4; step++)
    view = await act({
      action: "step",
      conceptId,
      sessionId,
      step: step as 2 | 3 | 4,
      placements: placements(content, step as FadingStep, view.session!.seed),
    });
  return { view, sessionId, content };
}

beforeEach(() => {
  f.rows.clear();
  f.writes = 0;
  f.reads = 0;
  f.withdrawn = false;
  f.disabled = false;
  f.classGrade = "중2";
  f.raceOnce = false;
  f.session = {
    student: { studentId: f.studentId, mustChangePassword: false },
  };
  vi.useFakeTimers();
  vi.setSystemTime(DAY1);
  vi.stubEnv("AUTH_URL", base);
  vi.stubEnv("MATH_FADING", "on");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("문지기", () => {
  it("꺼져 있으면 네 길이 전부 없다 — 학생 기록을 읽지도 않는다", async () => {
    vi.stubEnv("MATH_FADING", "off");
    for (const response of [
      await read(),
      await postRaw({ action: "all-today", on: true }),
      await catalog(),
      await concept("m2-01-01-c1"),
    ])
      expect(await code(response)).toEqual([404, "NOT_FOUND"]);
    expect(f.reads).toBe(0);
    expect(f.writes).toBe(0);
  });

  it("문의 세 상태 — 꺼짐 · 읽기만 · 켜짐. 값이 없으면 켜짐이고, 모르는 값은 꺼짐이다", () => {
    const at = (value: string | undefined) => {
      vi.stubEnv("MATH_FADING", value);
      return [fadingGate(), fadingReadable(), fadingEnabled()];
    };
    expect(at("on")).toEqual(["on", true, true]);
    // 값이 없으면 켜짐이다(원장님 2026-10-06 «새 SRS 로 보이도록») — 그 전까지는 꺼짐이 기본이었다.
    expect(at(undefined)).toEqual(["on", true, true]);
    expect(at("")).toEqual(["on", true, true]);
    expect(at("read")).toEqual(["read", true, false]);
    // 끄는 값은 `off` 다. 모르는 값도 꺼짐이다 — 끄려다 낸 오타가 문을 열어 두지 않는다.
    for (const value of ["off", "of", "OFF", "ON", "Read", "true", "1", "0"])
      expect(at(value), value).toEqual(["off", false, false]);
  });

  it("«읽기만»(`read`)에서도 학생의 네 길은 닫혀 있다 — 새 칸을 쓰는 길은 `on` 에서만 열린다", async () => {
    vi.stubEnv("MATH_FADING", "read");
    for (const response of [
      await read(),
      await postRaw({ action: "all-today", on: true }),
      await catalog(),
      await concept("m2-01-01-c1"),
    ])
      expect(await code(response)).toEqual([404, "NOT_FOUND"]);
    expect(f.reads).toBe(0);
    expect(f.writes).toBe(0);
  });

  it("학생 세션이 없으면 401, 첫 비밀번호를 안 바꾼 학생은 403", async () => {
    f.session = null;
    expect((await read()).status).toBe(401);
    expect((await catalog()).status).toBe(401);
    f.session = { user: { id: "teacher" } };
    expect((await read()).status).toBe(401);
    f.session = {
      student: { studentId: f.studentId, mustChangePassword: true },
    };
    expect((await read()).status).toBe(403);
    expect((await postRaw({ action: "all-today", on: true })).status).toBe(403);
  });

  it("퇴원했거나 계정이 꺼진 학생은 401", async () => {
    f.withdrawn = true;
    expect((await read()).status).toBe(401);
    f.withdrawn = false;
    f.disabled = true;
    expect((await read()).status).toBe(401);
    expect((await catalog()).status).toBe(401);
    expect((await concept("m2-01-01-c1")).status).toBe(401);
  });

  it("다른 사이트에서 온 쓰기는 거절한다", async () => {
    expect(
      await code(
        await postRaw({ action: "all-today", on: true }, "https://evil.test"),
      ),
    ).toEqual([403, "FORBIDDEN"]);
    expect(f.writes).toBe(0);
  });

  it("꼴이 어긋난 요청은 400 — 모르는 행동 · 번호 없는 풀이 요청 · 1단계의 «넣기»", async () => {
    for (const body of [
      {},
      { action: "nope" },
      { action: "pick" },
      { action: "read", conceptId: "m2-01-01-c1" },
      {
        action: "step",
        conceptId: "m2-01-01-c1",
        sessionId: uuid(1),
        step: 1,
        placements: [],
      },
      { action: "all-today", on: "yes" },
      { action: "pick", conceptId: "m2-01-01-c1", extra: 1 },
    ])
      expect(await code(await postRaw(body))).toEqual([
        400,
        "VALIDATION_ERROR",
      ]);
    expect(f.writes).toBe(0);
  });
});

describe("상태를 읽는다", () => {
  it("기록이 없는 학생은 빈 상태다 — 읽기는 쓰지 않는다", async () => {
    const view = await state(await read());
    expect(view).toMatchObject({
      today: "2026-10-06",
      revision: 0,
      concepts: {},
      session: null,
      opened: null,
      days: [],
      receipt: null,
    });
    expect(view.summary.queue).toEqual({ due: [], held: [], unrated: [] });
    expect(f.writes).toBe(0);
  });

  it("«오늘»은 한국 날짜다", async () => {
    vi.setSystemTime(new Date("2026-10-06T15:00:00.000Z"));
    expect((await state(await read())).today).toBe("2026-10-07");
  });
});

describe("개념을 고르고 풀이 한 벌을 돈다", () => {
  it("고른 개념은 평가 전 대기열에 들고, 빼면 사라진다 — 은행에 없는 열쇠는 404", async () => {
    const [first] = await someConcepts();
    const picked = await act({ action: "pick", conceptId: first! });
    expect(picked.summary.queue.unrated).toEqual([first]);
    expect(picked.concepts[first!]).toMatchObject({
      step: 1,
      rated: false,
      addedOn: "2026-10-06",
    });
    expect(picked.revision).toBe(1);
    expect((await act({ action: "pick", conceptId: first! })).revision).toBe(1);
    expect(
      (await act({ action: "drop", conceptId: first! })).summary.queue.unrated,
    ).toEqual([]);
    expect(
      await code(await postRaw({ action: "pick", conceptId: "no-such-key" })),
    ).toEqual([404, "NOT_FOUND"]);
    expect(
      await code(await postRaw({ action: "open", conceptId: "no-such-key" })),
    ).toEqual([404, "NOT_FOUND"]);
  });

  it("은행에서 사라진 개념의 기록은 숫자에 안 잡히고, 빼는 것만 된다", async () => {
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 1,
      payload: {
        ...emptySrsState(),
        fading: pickFadingConcept(emptyFading(), "gone-key", "2026-10-01"),
      },
    });
    expect((await state(await read())).summary.queue.unrated).toEqual([]);
    expect(
      await code(await postRaw({ action: "open", conceptId: "gone-key" })),
    ).toEqual([404, "NOT_FOUND"]);
    await act({ action: "drop", conceptId: "gone-key" });
    expect(
      parseSrsState(f.rows.get(f.studentId)!.payload).fading!.concepts,
    ).toEqual({});
  });

  it("풀이를 열면 번호 · 씨앗 · 개념의 내용이 내려온다 — 다시 읽어도 같은 풀이다", async () => {
    const [first] = await someConcepts();
    const opened = await act({ action: "open", conceptId: first! });
    expect(opened.session).toMatchObject({
      conceptId: first,
      startStep: 1,
      step: 1,
      phase: "steps",
      missedAtFour: [],
      ratings: [],
    });
    expect(opened.opened!.concept.id).toBe(first);
    expect(opened.opened!.traps).toEqual([]);
    const again = await act({ action: "open", conceptId: first! });
    expect(again.session).toEqual(opened.session);
    expect(again.revision).toBe(opened.revision);
    const reread = await state(await read());
    expect(reread.session).toEqual(opened.session);
    expect(reread.opened).toEqual(opened.opened);
  });

  it("1단계에서 4단계까지 마치고 평가하면 다음 복습일이 잡히고 집계 · 연속에 하루가 든다", async () => {
    const [first] = await someConcepts();
    const { view, sessionId } = await toRating(first!);
    expect(view.session).toMatchObject({ phase: "rating", step: 4 });
    expect(view.session!.ratings).toEqual([
      { rating: "again", intervalDays: 1 },
      { rating: "hard", intervalDays: 2 },
      { rating: "good", intervalDays: 3 },
      { rating: "easy", intervalDays: 16 },
    ]);
    const done = await act({
      action: "rate",
      conceptId: first!,
      sessionId,
      rating: "good",
      requestId: uuid(1),
    });
    expect(done.session).toBeNull();
    expect(done.opened).toBeNull();
    expect(done.receipt).toEqual({
      requestId: uuid(1),
      conceptId: first,
      rating: "good",
      dueOn: "2026-10-09",
    });
    expect(done.summary).toMatchObject({
      learned: 1,
      streak: { current: 1, best: 1 },
      plan: { done: 0, total: 0 },
      todayCount: { reviews: 1, passed: 1, fresh: 1 },
      queue: { due: [], held: [], unrated: [] },
    });
    expect(done.days).toEqual([
      { date: "2026-10-06", reviews: 1, passed: 1, fresh: 1 },
    ]);
  });

  it("같은 평가 요청을 다시 보내면 한 번만 적용되고 같은 영수증이 온다", async () => {
    const [first] = await someConcepts();
    const { sessionId } = await toRating(first!);
    const rate: FadingAction = {
      action: "rate",
      conceptId: first!,
      sessionId,
      rating: "easy",
      requestId: uuid(2),
    };
    const once = await act(rate);
    const writes = f.writes;
    const twice = await act(rate);
    expect(twice.receipt).toEqual(once.receipt);
    expect(twice.revision).toBe(once.revision);
    expect(f.writes).toBe(writes);
  });

  it("복습일이 되면 대기열에 오르고 4단계에서 시작한다 — 그 전에는 풀이가 열리지 않는다", async () => {
    const [first] = await someConcepts();
    const { sessionId } = await toRating(first!);
    await act({
      action: "rate",
      conceptId: first!,
      sessionId,
      rating: "good",
      requestId: uuid(1),
    });
    expect(
      await code(await postRaw({ action: "open", conceptId: first! })),
    ).toEqual([409, "CONFLICT"]);
    vi.setSystemTime(new Date("2026-10-09T03:00:00.000Z"));
    const due = await state(await read());
    expect(due.summary.queue.due).toEqual([first]);
    expect(due.summary.plan).toEqual({ done: 0, total: 1 });
    expect(due.concepts[first!]).toMatchObject({ daysUntil: 0, rated: true });
    const reopened = await act({ action: "open", conceptId: first! });
    expect(reopened.session).toMatchObject({ startStep: 4, step: 4 });
    expect(reopened.session!.id).not.toBe(sessionId);
  });

  it("4단계에서 틀린 것은 그 자리에서 적히고, 뒤에 안 틀리고 채워 보내도 평가는 «다시»뿐이다", async () => {
    const [first] = await someConcepts();
    let view = await act({ action: "open", conceptId: first! });
    const sessionId = view.session!.id;
    const content = view.opened!.concept as FadingConcept;
    const seed = view.session!.seed;
    view = await act({ action: "read", conceptId: first!, sessionId });
    for (const step of [2, 3] as const)
      view = await act({
        action: "step",
        conceptId: first!,
        sessionId,
        step,
        placements: placements(content, step, seed),
      });
    const wrong = placements(content, 4, seed, true)[0]!;
    view = await act({
      action: "miss",
      conceptId: first!,
      sessionId,
      placement: wrong,
    });
    expect(view.session!.missedAtFour).toEqual([wrong.targetId]);
    // 새로고침한 것처럼 — 서버의 풀이에 틀림이 남아 있다.
    expect((await state(await read())).session!.missedAtFour).toEqual([
      wrong.targetId,
    ]);
    view = await act({
      action: "step",
      conceptId: first!,
      sessionId,
      step: 4,
      placements: placements(content, 4, seed),
    });
    expect(view.session!.ratings).toEqual([
      { rating: "again", intervalDays: 1 },
    ]);
    expect(
      await code(
        await postRaw({
          action: "rate",
          conceptId: first!,
          sessionId,
          rating: "good",
          requestId: uuid(3),
        }),
      ),
    ).toEqual([409, "CONFLICT"]);
    const lapsed = await act({
      action: "rate",
      conceptId: first!,
      sessionId,
      rating: "again",
      requestId: uuid(4),
    });
    // 평가한 개념은 내일의 대기열로 간다 — 상태는 개념 하나의 길로 본다.
    expect(lapsed.receipt).toMatchObject({
      rating: "again",
      dueOn: "2026-10-07",
    });
    const one = fadingConceptResponseSchema.parse(
      await (await concept(first!)).json(),
    ).data;
    expect(one.status).toMatchObject({ step: 2, lapses: 1, daysUntil: 1 });
  });

  it("«아직 모르겠어요»로 단계를 마칠 수 있다", async () => {
    const [first] = await someConcepts();
    let view = await act({ action: "open", conceptId: first! });
    const sessionId = view.session!.id;
    view = await act({ action: "read", conceptId: first!, sessionId });
    view = await act({
      action: "step",
      conceptId: first!,
      sessionId,
      step: 2,
      placements: [],
      gaveUp: true,
    });
    expect(view.session!.step).toBe(3);
  });

  it("다른 번호의 풀이 · 건너뛴 단계 · 덜 채운 단계는 409 이고 아무것도 쓰지 않는다", async () => {
    const [first] = await someConcepts();
    let view = await act({ action: "open", conceptId: first! });
    const sessionId = view.session!.id;
    const content = view.opened!.concept as FadingConcept;
    view = await act({ action: "read", conceptId: first!, sessionId });
    const writes = f.writes;
    for (const body of [
      { action: "read", conceptId: first!, sessionId: uuid(9) },
      {
        action: "step",
        conceptId: first!,
        sessionId,
        step: 3,
        placements: placements(content, 3, view.session!.seed),
      },
      { action: "step", conceptId: first!, sessionId, step: 2, placements: [] },
      {
        action: "rate",
        conceptId: first!,
        sessionId,
        rating: "good",
        requestId: uuid(5),
      },
    ])
      expect(await code(await postRaw(body))).toEqual([409, "CONFLICT"]);
    expect(f.writes).toBe(writes);
  });

  it("«오늘 전부»를 켜면 그날의 대기열이 상한을 보지 않는다", async () => {
    expect((await act({ action: "all-today", on: true })).summary.mode).toBe(
      "all",
    );
    vi.setSystemTime(new Date("2026-10-07T03:00:00.000Z"));
    expect((await state(await read())).summary.mode).toBe("split");
  });
});

describe("저장 — 새 칸만 쓴다", () => {
  it("옛 칸을 건드리지 않는다 — 하루 여정 · 통합 탐험의 장부가 생기지 않고, 있던 칸은 그대로다", async () => {
    const before = parseSrsState({
      ...emptySrsState(),
      dailyJourney: { elementary: [], middle: [] },
    });
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 4,
      payload: structuredClone(before),
    });
    const [first] = await someConcepts();
    const view = await act({ action: "pick", conceptId: first! });
    expect(view.revision).toBe(5);
    const { fading, ...rest } = parseSrsState(f.rows.get(f.studentId)!.payload);
    expect(rest).toEqual(before);
    expect(rest.expedition).toBeUndefined();
    expect(Object.keys(fading!.concepts)).toEqual([first]);
  });

  it("그사이 다른 창이 먼저 저장했으면 새 기록을 다시 읽어 그 위에 적용한다", async () => {
    const [first, second] = await someConcepts();
    await act({ action: "pick", conceptId: first! });
    f.raceOnce = true;
    const reads = f.reads;
    const view = await act({ action: "pick", conceptId: second! });
    expect(f.reads - reads).toBeGreaterThanOrEqual(2);
    expect(view.summary.queue.unrated.sort()).toEqual([first, second].sort());
    expect(view.revision).toBe(3);
  });

  it("바뀐 것이 없으면 쓰지 않는다", async () => {
    await act({ action: "all-today", on: true });
    const writes = f.writes;
    await act({ action: "all-today", on: true });
    expect(f.writes).toBe(writes);
  });
});

describe("개념 목록 · 개념 하나", () => {
  it("학년을 안 주면 반 학년의 목록이 온다 — 고른 개념에는 내 상태가 붙는다", async () => {
    const first = (await someConcepts())[0]!;
    await act({ action: "pick", conceptId: first });
    const data = fadingCatalogResponseSchema.parse(
      await (await catalog()).json(),
    ).data;
    expect(data.grade).toBe("중2");
    expect(data.grades).toEqual([
      "초3",
      "초4",
      "초5",
      "초6",
      "중1",
      "중2",
      "중3",
    ]);
    expect(data.sections.length).toBeGreaterThan(10);
    expect(data.sections.every((s) => s.key.startsWith("중2::"))).toBe(true);
    const all = data.sections.flatMap((s) => s.concepts);
    expect(all.find((c) => c.id === first)!.status).toEqual({
      step: 1,
      rated: false,
      dueOn: null,
      daysUntil: null,
      risk: null,
    });
    expect(all.filter((c) => c.status).length).toBe(1);
    expect(f.writes).toBe(1);
  });

  it("학년을 주면 그 학년이 오고, 은행에 없는 학년 · 꼴이 어긋난 학년은 400 이다", async () => {
    const data = fadingCatalogResponseSchema.parse(
      await (await catalog("?grade=초5")).json(),
    ).data;
    expect(data.grade).toBe("초5");
    expect(data.sections.every((s) => s.key.startsWith("초5::"))).toBe(true);
    expect(await code(await catalog("?grade=초1"))).toEqual([
      400,
      "VALIDATION_ERROR",
    ]);
    expect(await code(await catalog("?grade=x"))).toEqual([
      400,
      "VALIDATION_ERROR",
    ]);
  });

  it("반 학년이 은행에 없으면 은행의 첫 학년이 온다", async () => {
    f.classGrade = "고1";
    const data = fadingCatalogResponseSchema.parse(
      await (await catalog()).json(),
    ).data;
    expect(data.grade).toBe("초3");
  });

  it("개념 하나는 내용과 내 상태를 준다 — 고르지 않았으면 상태가 없고, 없는 열쇠는 404", async () => {
    const first = (await someConcepts())[0]!;
    const fresh = fadingConceptResponseSchema.parse(
      await (await concept(first)).json(),
    ).data;
    expect(fresh.content.concept.id).toBe(first);
    expect(fresh.content.traps).toEqual([]);
    expect(fresh.status).toBeNull();
    await act({ action: "pick", conceptId: first });
    const picked = fadingConceptResponseSchema.parse(
      await (await concept(first)).json(),
    ).data;
    expect(picked.status).toMatchObject({ id: first, step: 1, rated: false });
    expect(await code(await concept("no-such-key"))).toEqual([
      404,
      "NOT_FOUND",
    ]);
    expect(await code(await concept("Bad Key!"))).toEqual([
      400,
      "VALIDATION_ERROR",
    ]);
  });
});

describe("서버 없이 도는 길(`createLocalFadingSource`)은 학생 API 와 같은 답을 낸다", () => {
  /** 서버가 풀이를 열 때 지은 번호와 씨앗을 로컬에 그대로 넣는다 — 그래야 두 답을 글자 그대로 견준다. */
  const world = () => {
    const fresh = { sessionId: uuid(0), seed: 0 };
    const local = createLocalFadingSource({
      concepts: fadingCatalog(),
      today: "2026-10-06",
      defaultGrade: "중2",
      traps: fadingTrapMap(fadingCatalog()),
      figures: fadingFigureMap(fadingCatalog(), CONCEPT_BLANK_BANK.figures),
      fresh: () => fresh,
    });
    /** 같은 행동을 양쪽에 — 서버가 먼저다(`open` 이면 번호와 씨앗을 받아 로컬에 넣는다). */
    const both = async (action: FadingAction) => {
      const server = await act(action);
      if (action.action === "open" && server.session)
        Object.assign(fresh, {
          sessionId: server.session.id,
          seed: server.session.seed,
        });
      expect(await local.act(action)).toStrictEqual(server);
      return server;
    };
    /** 양쪽이 같은 까닭으로 거절한다 — 상태 코드 · 오류 코드 · (충돌이면) 문구까지. */
    const refused = async (
      action: unknown,
      status: number,
      errorCode: string,
    ) => {
      const response = await postRaw(action);
      const body = await response.json();
      expect([response.status, body.error?.code]).toEqual([status, errorCode]);
      const error = await local.act(action as FadingAction).then(
        () => null,
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(FadingSourceError);
      expect(error).toMatchObject({
        status,
        code: errorCode,
        message: body.error.message,
      });
    };
    return { local, both, refused };
  };

  it("고르기 · 풀이 한 벌 · 평가 · 다음 날까지 — 응답이 글자 그대로 같다", async () => {
    const { local, both } = world();
    const [first, second] = await someConcepts();
    expect(await local.state()).toStrictEqual(await state(await read()));
    await both({ action: "pick", conceptId: first! });
    await both({ action: "pick", conceptId: second! });
    await both({ action: "all-today", on: true });

    let view = await both({ action: "open", conceptId: first! });
    const sessionId = view.session!.id;
    const content = view.opened!.concept as FadingConcept;
    view = await both({ action: "read", conceptId: first!, sessionId });
    for (const step of [2, 3] as const)
      view = await both({
        action: "step",
        conceptId: first!,
        sessionId,
        step,
        placements: placements(content, step, view.session!.seed, step === 2),
      });
    // 4단계에서 틀린 것 하나는 그 자리에서 나간다.
    const four = placements(content, 4, view.session!.seed, true);
    await both({
      action: "miss",
      conceptId: first!,
      sessionId,
      placement: four[0]!,
    });
    view = await both({
      action: "step",
      conceptId: first!,
      sessionId,
      step: 4,
      placements: four,
    });
    expect(view.session!.ratings.map((r) => r.rating)).toEqual(["again"]);
    const rate: FadingAction = {
      action: "rate",
      conceptId: first!,
      sessionId,
      rating: "again",
      requestId: uuid(7),
    };
    const rated = await both(rate);
    expect(rated.receipt).toMatchObject({ requestId: uuid(7) });
    // 같은 평가가 다시 와도 양쪽 다 한 번만 적용하고 같은 영수증을 낸다.
    expect(await both(rate)).toStrictEqual(rated);

    // 다음 날 — «다시»의 간격은 하루라 대기열에 돌아와 있다.
    vi.setSystemTime(new Date(DAY1.getTime() + 86_400_000));
    local.setToday("2026-10-07");
    const next = await state(await read());
    expect(await local.state()).toStrictEqual(next);
    expect(next.summary.queue.due).toEqual([first]);
    await both({ action: "open", conceptId: first! });
  });

  it("개념 목록 · 개념 하나도 같다 — 학년을 안 주면 그 학생의 학년", async () => {
    const { local, both } = world();
    const [first] = await someConcepts();
    await both({ action: "pick", conceptId: first! });
    for (const grade of [undefined, "중2", "초3"])
      expect(await local.catalog(grade)).toStrictEqual(
        fadingCatalogResponseSchema.parse(
          await (await catalog(grade ? `?grade=${grade}` : "")).json(),
        ).data,
      );
    expect(await local.concept(first!)).toStrictEqual(
      fadingConceptResponseSchema.parse(await (await concept(first!)).json())
        .data,
    );
    for (const grade of ["초1", "고1"]) {
      const response = await catalog(`?grade=${grade}`);
      const body = await response.json();
      expect([response.status, body.error.code]).toEqual([
        400,
        "VALIDATION_ERROR",
      ]);
      await expect(local.catalog(grade)).rejects.toMatchObject({
        status: 400,
        code: "VALIDATION_ERROR",
        message: body.error.message,
      });
    }
    for (const [id, status, errorCode] of [
      ["no-such-key", 404, "NOT_FOUND"],
      ["Bad Key!", 400, "VALIDATION_ERROR"],
    ] as const) {
      const response = await concept(id);
      const body = await response.json();
      expect([response.status, body.error.code]).toEqual([status, errorCode]);
      await expect(local.concept(id)).rejects.toMatchObject({
        status,
        code: errorCode,
        message: body.error.message,
      });
    }
  });

  it("거절도 같다 — 없는 개념 404 · 꼴이 틀린 요청 400 · 지금 할 수 없는 일 409(문구까지)", async () => {
    const { local, both, refused } = world();
    const [first, second] = await someConcepts();
    await refused(
      { action: "pick", conceptId: "no-such-key" },
      404,
      "NOT_FOUND",
    );
    await refused(
      { action: "open", conceptId: "no-such-key" },
      404,
      "NOT_FOUND",
    );
    await refused({ action: "fly" }, 400, "VALIDATION_ERROR");
    // 은행에 없는 열쇠라도 빼는 것은 된다(아무것도 안 바뀐다).
    await both({ action: "drop", conceptId: "no-such-key" });
    await both({ action: "pick", conceptId: first! });
    await both({ action: "pick", conceptId: second! });
    const view = await both({ action: "open", conceptId: first! });
    const before = local.snapshot();
    // 다른 번호의 풀이 · 건너뛴 단계 · 단계를 마치기 전의 평가
    await refused(
      { action: "read", conceptId: first!, sessionId: uuid(99) },
      409,
      "CONFLICT",
    );
    await refused(
      {
        action: "step",
        conceptId: first!,
        sessionId: view.session!.id,
        step: 3,
        placements: [],
      },
      409,
      "CONFLICT",
    );
    await refused(
      {
        action: "rate",
        conceptId: first!,
        sessionId: view.session!.id,
        rating: "good",
        requestId: uuid(8),
      },
      409,
      "CONFLICT",
    );
    // 거절은 아무것도 바꾸지 않는다.
    expect(local.snapshot()).toStrictEqual(before);
    expect(await local.state()).toStrictEqual(await state(await read()));
  });

  it("함정이 있는 개념 — 내용에 함정이 내려가고, 함정을 넣은 «넣기»를 양쪽이 같은 칩으로 읽는다", async () => {
    const { local, both } = world();
    const conceptId = Object.keys(FADING_TRAPS)[0]!;
    const trapText = FADING_TRAPS[conceptId]![0]!.text;
    const detail = fadingConceptResponseSchema.parse(
      await (await concept(conceptId)).json(),
    ).data;
    expect(detail.content.traps).toEqual([{ text: trapText }]);
    expect(await local.concept(conceptId)).toStrictEqual(detail);

    let view = await both({ action: "open", conceptId });
    const sessionId = view.session!.id;
    const seed = view.session!.seed;
    const content = view.opened!.concept as FadingConcept;
    const traps = view.opened!.traps;
    expect(traps).toEqual([{ text: trapText }]);
    view = await both({ action: "read", conceptId, sessionId });
    for (const step of [2, 3] as const)
      view = await both({
        action: "step",
        conceptId,
        sessionId,
        step,
        placements: placements(content, step, seed, false, traps),
      });
    // 4단계 — 함정 칩을 첫 빈칸에 넣었다가(틀림 · 그 자리에서 적힌다) 맞는 칩으로 다 채운다.
    const tray = chipTray(content, 4, { seed, traps });
    const trap = tray.find((chip) => chip.text === trapText)!;
    const first = erasedTargets(content, 4)[0]!;
    const wrong = { targetId: first.id, chipId: trap.id };
    view = await both({
      action: "miss",
      conceptId,
      sessionId,
      placement: wrong,
    });
    expect(view.session!.missedAtFour).toEqual([first.id]);
    view = await both({
      action: "step",
      conceptId,
      sessionId,
      step: 4,
      placements: [wrong, ...placements(content, 4, seed, false, traps)],
    });
    expect(view.session!.phase).toBe("rating");
    expect(view.session!.ratings.map((r) => r.rating)).toEqual(["again"]);
  });

  it("그림이 있는 소단원의 개념 — 내용에 그림이 내려가고 양쪽이 같다 · 없는 소단원은 없다고 싣는다", async () => {
    const { local, both } = world();
    const withFigure = fadingCatalog().find((c) =>
      CONCEPT_BLANK_BANK.figures.some((f) => f.section === c.section),
    )!;
    const without = fadingCatalog().find(
      (c) => !CONCEPT_BLANK_BANK.figures.some((f) => f.section === c.section),
    )!;
    const shown = fadingConceptResponseSchema.parse(
      await (await concept(withFigure.id)).json(),
    ).data;
    expect(shown.content.figure).not.toBeNull();
    expect(
      CONCEPT_BLANK_BANK.figures.find((f) => f.id === shown.content.figure!.id)!
        .section,
    ).toBe(withFigure.section);
    expect(await local.concept(withFigure.id)).toStrictEqual(shown);
    const plain = fadingConceptResponseSchema.parse(
      await (await concept(without.id)).json(),
    ).data;
    expect(plain.content.figure).toBeNull();
    expect(await local.concept(without.id)).toStrictEqual(plain);
    // 풀이를 열면 같은 그림이 내용에 같이 온다.
    const opened = await both({ action: "open", conceptId: withFigure.id });
    expect(opened.opened!.figure).toEqual(shown.content.figure);
  });

  it("바뀐 것이 없으면 revision 이 그대로다 — 서버가 쓰지 않는 것과 같다", async () => {
    const { local, both } = world();
    const [first] = await someConcepts();
    const picked = await both({ action: "pick", conceptId: first! });
    const again = await both({ action: "pick", conceptId: first! });
    expect(again.revision).toBe(picked.revision);
    expect((await local.state()).revision).toBe(picked.revision);
  });
});

describe("카드 풀이의 하위 문(`MATH_FADING_CARDS`)", () => {
  /** 저장된 열린 풀이 — 학생 기록 한 줄에서 꺼낸다. */
  const storedSession = () =>
    parseSrsState(f.rows.get(f.studentId)!.payload).fading!.session;

  it("값이 없으면 꺼짐 — 처음부터 평가까지 응답 · 저장 칸에 새 칸이 하나도 없다", async () => {
    const [first] = await someConcepts();
    expect(await state(await read())).not.toHaveProperty("mode");
    const { view, sessionId } = await toRating(first!);
    expect(Object.keys(view.session!).sort()).toEqual(
      [
        "conceptId",
        "id",
        "missedAtFour",
        "phase",
        "ratings",
        "seed",
        "startStep",
        "step",
      ].sort(),
    );
    expect(Object.keys(storedSession()!).sort()).toEqual(
      ["conceptId", "id", "missedAtFour", "phase", "seed", "startStep"].sort(),
    );
    const detail = fadingConceptResponseSchema.parse(
      await (await concept(first!)).json(),
    ).data;
    expect(detail).not.toHaveProperty("mode");
    await act({
      action: "rate",
      conceptId: first!,
      sessionId,
      rating: "good",
      requestId: uuid(41),
    });
    const stored = parseSrsState(f.rows.get(f.studentId)!.payload).fading!
      .concepts[first!]!;
    expect(stored).not.toHaveProperty("marks");
  });

  it("켜면 새 풀이가 카드 풀이다 — 4단계는 글로 쓰고, 모르는 글은 대조를 기다리고, 칩은 409 다 · 서버 없이 도는 길과 응답이 같다", async () => {
    vi.stubEnv("MATH_FADING_CARDS", "on");
    const [first] = await someConcepts();
    const fresh = { sessionId: uuid(0), seed: 0 };
    const local = createLocalFadingSource({
      concepts: fadingCatalog(),
      today: "2026-10-06",
      defaultGrade: "중2",
      traps: fadingTrapMap(fadingCatalog()),
      figures: fadingFigureMap(fadingCatalog(), CONCEPT_BLANK_BANK.figures),
      fresh: () => fresh,
      cards: true,
    });
    const both = async (action: FadingAction) => {
      const server = await act(action);
      if (action.action === "open" && server.session)
        Object.assign(fresh, {
          sessionId: server.session.id,
          seed: server.session.seed,
        });
      expect(await local.act(action)).toStrictEqual(server);
      return server;
    };
    expect((await state(await read())).mode).toBe("cards");
    let view = await both({ action: "open", conceptId: first! });
    expect(view.session!.mode).toBe("cards");
    expect(storedSession()).toMatchObject({ mode: "cards" });
    const sessionId = view.session!.id;
    const content = view.opened!.concept as FadingConcept;
    const seen = "3".repeat(content.propositions.length);
    view = await both({ action: "read", conceptId: first!, sessionId, seen });
    expect(storedSession()!.seen).toBe(seen);
    for (const step of [2, 3] as const)
      view = await both({
        action: "step",
        conceptId: first!,
        sessionId,
        step,
        placements: placements(
          content,
          step,
          view.session!.seed,
          false,
          view.opened!.traps,
        ),
      });
    // 옛 화면의 칩은 4단계에서 받지 않는다.
    expect(
      await code(
        await postRaw({
          action: "step",
          conceptId: first!,
          sessionId,
          step: 4,
          placements: placements(
            content,
            4,
            view.session!.seed,
            false,
            view.opened!.traps,
          ),
        }),
      ),
    ).toEqual([409, "CONFLICT"]);
    const targets = erasedTargets(content, 4);
    const [odd, ...rest] = targets;
    view = await both({
      action: "step",
      conceptId: first!,
      sessionId,
      step: 4,
      placements: [
        { targetId: odd!.id, text: "어느 답도 아닌 글" },
        ...rest.map((t) => ({ targetId: t.id, text: t.text })),
      ],
    });
    expect(view.session).toMatchObject({
      phase: "rating",
      missedAtFour: [],
      unjudged: [{ targetId: odd!.id, text: "어느 답도 아닌 글" }],
    });
    // 다시 읽어도 같은 대조가 선다.
    expect((await state(await read())).session!.unjudged).toEqual(
      view.session!.unjudged,
    );
    expect(
      await code(
        await postRaw({
          action: "rate",
          conceptId: first!,
          sessionId,
          rating: "good",
          requestId: uuid(42),
        }),
      ),
    ).toEqual([409, "CONFLICT"]);
    const done = await both({
      action: "rate",
      conceptId: first!,
      sessionId,
      rating: "good",
      requestId: uuid(42),
      judged: { [odd!.id]: "same" },
    });
    expect(done.receipt).toMatchObject({ rating: "good" });
    const stored = parseSrsState(f.rows.get(f.studentId)!.payload).fading!
      .concepts[first!]!;
    expect(stored.marks).toEqual({ digest: stored.digest, seen });
    const detail = fadingConceptResponseSchema.parse(
      await (await concept(first!)).json(),
    ).data;
    expect(detail.mode).toBe("cards");
  });
});
