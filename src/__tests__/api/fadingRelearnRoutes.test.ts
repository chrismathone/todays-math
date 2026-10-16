// @vitest-environment node
// 단기 재학습 대기열의 학생 라우트 — 실제 은행의 개념으로 풀이 한 벌과 대기열을 HTTP 로 돈다(은행 전체를 싣는다).
// 🔴 DB 는 메모리의 대역이다 — 실제 학생 기록에 닿지 않는다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({
  studentId: "017c1a9b-b28a-4a5b-80b6-f1a21ccfeee2",
  otherId: "5d3f0c1e-9a47-4f0b-8a55-0d7b6c1f2e33",
  classId: "7e7c388b-c264-4d39-809b-527723b8b74b",
  session: null as unknown,
  rows: new Map<
    string,
    { studentId: string; revision: number; payload: unknown }
  >(),
  writes: 0,
  reads: 0,
  disabled: false,
  /** 다음 쓰기 직전에 한 번 — 다른 창이 먼저 저장한 것처럼 revision 을 올린다. */
  raceOnce: false,
  /** `raceOnce` 때 다른 창이 적은 것 — 그 줄의 payload 를 바꾼다(없으면 revision 만 오른다). */
  raceMutate: null as null | ((payload: unknown) => unknown),
  /** 옛 탐험 · 하루 여정의 갱신을 부른 수. */
  expedition: 0,
  journey: 0,
}));
vi.mock("server-only", () => ({}));
// 옛 탐험 · 하루 여정의 갱신 — 대기열의 저장이 이 둘을 지나면 안 된다. 부른 수만 세고 원래 함수를 그대로 돌린다.
vi.mock("@/lib/math-explorers/expedition", async (original) => {
  const real =
    await original<typeof import("@/lib/math-explorers/expedition")>();
  return {
    ...real,
    updateExpedition: (...args: Parameters<typeof real.updateExpedition>) => {
      f.expedition++;
      return real.updateExpedition(...args);
    },
  };
});
vi.mock("@/lib/math-srs/dailyJourney", async (original) => {
  const real = await original<typeof import("@/lib/math-srs/dailyJourney")>();
  return {
    ...real,
    updateDailyJourney: (
      ...args: Parameters<typeof real.updateDailyJourney>
    ) => {
      f.journey++;
      return real.updateDailyJourney(...args);
    },
  };
});
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
        class: { id: f.classId, name: "테스트반", grade: "중2" },
        eywaWithdrawnAt: null,
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
          if (f.raceMutate) row.payload = f.raceMutate(row.payload);
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

import {
  GET as RELEARN_GET,
  POST as RELEARN_POST,
} from "@/app/api/learn/fading/relearn/route";
import { POST as FADING_POST } from "@/app/api/learn/fading/route";
import type { FadingPlacement } from "@/contracts/fading.contract";
import {
  fadingStateResponseSchema,
  type FadingAction,
  type FadingState,
} from "@/contracts/fadingApi.contract";
import {
  FADING_RELEARN_STUDENT_HEADER,
  fadingRelearnActionResponseSchema,
  fadingRelearnQueueResponseSchema,
  type FadingRelearnAction,
  type FadingRelearnQueue,
} from "@/contracts/fadingRelearn.contract";
import { fadingCatalog } from "@/lib/fading/catalog";
import { chipFits, chipTray } from "@/lib/fading/chips";
import { fadingTargets, type FadingConcept } from "@/lib/fading/concepts";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import { createLocalFadingSource } from "@/lib/fading/local";
import {
  FADING_RELEARN_NOT_DUE,
  FADING_RELEARN_NO_EVIDENCE,
  fadingPropositionTargets,
} from "@/lib/fading/relearn";
import { fadingRelearnEnabled } from "@/lib/fading/relearnEnabled";
import { createLocalFadingRelearnSource } from "@/lib/fading/relearnLocal";
import { withFadingRelearn } from "@/lib/fading/relearnSource";
import { fadingTrapMap } from "@/lib/fading/traps";
import { fadingTypedOutcome } from "@/lib/fading/typed";
import { updateDailyJourney } from "@/lib/math-srs/dailyJourney";
import { emptySrsState } from "@/lib/math-srs/serverState";
import { STUDENT_CHANGED_MESSAGE } from "@/lib/studentRouteAccess";

const base = "http://localhost:3000";
const path = "/api/learn/fading/relearn";
/** 한국 10월 6일 낮 12시. */
const T0 = Date.UTC(2026, 9, 6, 3, 0, 0);
const MIN = 60_000;
const FIVE = 300_000;
const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const at = (ms: number) => vi.setSystemTime(new Date(ms));

const get = (headers: Record<string, string> = {}) =>
  RELEARN_GET(new Request(`${base}${path}`, { headers }));
const postRaw = (
  body: unknown,
  origin = base,
  headers: Record<string, string> = {},
) =>
  RELEARN_POST(
    new Request(`${base}${path}`, {
      method: "POST",
      headers: { origin, "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
const code = async (response: Response) => {
  const json = await response.json();
  return [response.status, json.error?.code, json.error?.message] as const;
};
async function queue(response: Response): Promise<FadingRelearnQueue> {
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  return fadingRelearnQueueResponseSchema.parse(await response.json()).data;
}
async function act(action: FadingRelearnAction) {
  const response = await postRaw(action);
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  return fadingRelearnActionResponseSchema.parse(await response.json()).data;
}

/** 풀이의 본 라우트 — 증거를 만든다. */
async function fading(action: FadingAction): Promise<FadingState> {
  const response = await FADING_POST(
    new Request(`${base}/api/learn/fading`, {
      method: "POST",
      headers: { origin: base, "Content-Type": "application/json" },
      body: JSON.stringify(action),
    }),
  );
  expect(response.status).toBe(200);
  return fadingStateResponseSchema.parse(await response.json()).data;
}

function chips(
  c: FadingConcept,
  step: FadingStep,
  seed: number,
  traps: readonly { text: string }[],
): FadingPlacement[] {
  const tray = chipTray(c, step, { seed, traps });
  const used = new Set<string>();
  return erasedTargets(c, step).map((target) => {
    const chip = tray.find(
      (x) => !used.has(x.id) && chipFits(c, target.id, x),
    )!;
    used.add(chip.id);
    return { targetId: target.id, chipId: chip.id };
  });
}

/** 은행의 중2 개념 가운데 명제가 셋 이상이고, 첫 명제의 첫 표적에 «틀린 글»로 쓸 다른 답이 있는 것. */
function pickConcept(skip = 0): FadingConcept {
  return fadingCatalog()
    .filter((c) => c.section.startsWith("중2::") && c.propositions.length >= 3)
    .filter((c) => {
      const first = fadingTargets(c)[0]!;
      return fadingTargets(c).some(
        (other) =>
          fadingTypedOutcome(
            c,
            first.id,
            other.text,
            fadingTrapMap([c])[c.id],
          ) === "wrong",
      );
    })[skip]!;
}

/** 카드 풀이로 처음 배운다 — 4단계에서 첫 표적을 한 번 틀리게 쓰고(`wrong`) «다시»로, 아니면 «좋음»으로 닫는다. */
async function learn(c: FadingConcept, requestId: string, wrong = true) {
  let view = await fading({ action: "open", conceptId: c.id });
  const ref = { conceptId: c.id, sessionId: view.session!.id };
  const seed = view.session!.seed;
  const traps = view.opened!.traps;
  view = await fading({ action: "read", ...ref });
  for (const step of [2, 3] as const)
    view = await fading({
      action: "step",
      ...ref,
      step,
      placements: chips(c, step, seed, traps),
    });
  const first = fadingTargets(c)[0]!;
  const slip = fadingTargets(c).find(
    (other) => fadingTypedOutcome(c, first.id, other.text, traps) === "wrong",
  )!;
  view = await fading({
    action: "step",
    ...ref,
    step: 4,
    placements: erasedTargets(c, 4).flatMap((target): FadingPlacement[] => [
      ...(wrong && target.id === first.id
        ? [{ targetId: target.id, text: slip.text }]
        : []),
      { targetId: target.id, text: target.text },
    ]),
  });
  view = await fading({
    action: "rate",
    ...ref,
    rating: wrong ? "again" : "good",
    requestId,
  });
  return view;
}

const attempt = (
  q: FadingRelearnQueue,
  c: FadingConcept,
  propositionId: string,
  n: number,
) => ({
  conceptId: c.id,
  propositionId,
  token: q.items.find((i) => i.propositionId === propositionId)!.token,
  attemptId: uuid(n),
  answers: fadingPropositionTargets(
    c.propositions.find((p) => p.id === propositionId)!,
  ).map((target) => ({ targetId: target.id, text: target.text })),
});

const row = () => f.rows.get(f.studentId)!;
/** 학생 기록에서 대기열만 뺀 글 — 대기열의 행동이 이 글을 바꾸면 안 된다. */
const restOfRecord = () => {
  const payload = structuredClone(row().payload) as {
    fading: Record<string, unknown>;
  };
  delete payload.fading.relearn;
  return JSON.stringify(payload);
};

beforeEach(() => {
  f.rows.clear();
  f.writes = 0;
  f.reads = 0;
  f.disabled = false;
  f.raceOnce = false;
  f.raceMutate = null;
  f.expedition = 0;
  f.journey = 0;
  f.session = {
    student: { studentId: f.studentId, mustChangePassword: false },
  };
  vi.useFakeTimers();
  at(T0);
  vi.stubEnv("AUTH_URL", base);
  vi.stubEnv("MATH_FADING", "on");
  vi.stubEnv("MATH_FADING_CARDS", "on");
  vi.stubEnv("MATH_FADING_RELEARN", "on");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("쓰는 길의 문 — 값이 없으면 열림 · `off` 로 닫는다", () => {
  it("값 없음 · 빈 값 · `on` 은 열림, `off` 와 모르는 값은 닫힘이고, 학생 라우트의 문이 `on` 이 아니면 늘 닫힘이다", () => {
    const gate = (
      relearn: string | undefined,
      main: string | undefined = "on",
    ) => {
      vi.stubEnv("MATH_FADING", main);
      vi.stubEnv("MATH_FADING_RELEARN", relearn);
      return fadingRelearnEnabled();
    };
    for (const value of ["on", undefined, ""]) {
      expect(gate(value), String(value)).toBe(true);
      // 학생 라우트의 문도 값이 없으면 켜짐이다.
      expect(gate(value, undefined), String(value)).toBe(true);
    }
    // 끄는 값은 `off` 다. 모르는 값도 닫힘이다 — 끄려다 낸 오타가 문을 열어 두지 않는다.
    for (const value of ["off", "of", "OFF", "ON", "On", "true", "1", "read"])
      expect(gate(value), value).toBe(false);
    for (const main of ["off", "read", "nope"])
      for (const value of ["on", undefined])
        expect(gate(value, main), main).toBe(false);
  });

  it("닫혀 있으면 읽기는 «꺼짐 · 빈 대기열»이고 학생 기록을 읽지 않는다 — 행동은 404 이고 아무것도 쓰지 않는다", async () => {
    // 대기열이 든 기록이 있어도.
    const c = pickConcept();
    await learn(c, uuid(2));
    await act({
      action: "record",
      observation: { kind: "rated", conceptId: c.id, requestId: uuid(2) },
    });
    const kept = JSON.stringify(row());
    vi.stubEnv("MATH_FADING_RELEARN", "off");
    f.reads = 0;
    f.writes = 0;
    expect(await queue(await get())).toEqual({
      enabled: false,
      now: T0,
      intervals: { retryMs: MIN, confirmMs: FIVE },
      items: [],
      contents: {},
      counts: { judging: 0, ready: 0, waiting: 0 },
      nextDueAt: null,
      today: { on: "2026-10-06", checks: 0, cleared: 0, entered: 0 },
    });
    for (const body of [
      {
        action: "record",
        observation: { kind: "rated", conceptId: c.id, requestId: uuid(2) },
      },
      { action: "nope" },
    ])
      expect((await code(await postRaw(body))).slice(0, 2)).toEqual([
        404,
        "NOT_FOUND",
      ]);
    expect(f.reads).toBe(0);
    expect(f.writes).toBe(0);
    // 닫아도 적힌 대기열은 지워지지 않는다 — 다시 열면 이어진다.
    expect(JSON.stringify(row())).toBe(kept);
    vi.stubEnv("MATH_FADING_RELEARN", "on");
    expect((await queue(await get())).items).toHaveLength(
      c.propositions.length,
    );
  });

  it("학생 라우트의 문이 꺼져 있으면 읽기도 404 다", async () => {
    vi.stubEnv("MATH_FADING", "off");
    expect((await code(await get())).slice(0, 2)).toEqual([404, "NOT_FOUND"]);
    expect((await code(await postRaw({}))).slice(0, 2)).toEqual([
      404,
      "NOT_FOUND",
    ]);
    expect(f.reads).toBe(0);
  });
});

describe("문지기 — 다른 학생 라우트와 같은 문", () => {
  const record = {
    action: "record",
    observation: {
      kind: "rated",
      conceptId: "m2-01-01-c1",
      requestId: uuid(2),
    },
  };

  it("학생 세션이 없으면 401, 원장 세션도 401, 첫 비밀번호를 안 바꾼 학생은 403, 꺼진 계정은 401", async () => {
    f.session = null;
    expect((await get()).status).toBe(401);
    expect((await postRaw(record)).status).toBe(401);
    f.session = { user: { id: "teacher" } };
    expect((await get()).status).toBe(401);
    expect((await postRaw(record)).status).toBe(401);
    f.session = {
      student: { studentId: f.studentId, mustChangePassword: true },
    };
    expect((await get()).status).toBe(403);
    expect((await postRaw(record)).status).toBe(403);
    f.session = {
      student: { studentId: f.studentId, mustChangePassword: false },
    };
    f.disabled = true;
    expect((await get()).status).toBe(401);
    expect((await postRaw(record)).status).toBe(401);
    expect(f.reads).toBe(0);
    expect(f.writes).toBe(0);
  });

  it("다른 사이트에서 온 쓰기는 거절한다", async () => {
    expect(
      (await code(await postRaw(record, "https://evil.test"))).slice(0, 2),
    ).toEqual([403, "FORBIDDEN"]);
    expect(f.reads).toBe(0);
  });

  it("🔴 화면이 실어 보낸 학생이 로그인한 학생과 다르면 기록을 읽기 전에 `STUDENT_CHANGED`(409) 다 — 같으면 지나간다", async () => {
    const other = { [FADING_RELEARN_STUDENT_HEADER]: f.otherId };
    expect(await code(await get(other))).toEqual([
      409,
      "STUDENT_CHANGED",
      STUDENT_CHANGED_MESSAGE,
    ]);
    expect(await code(await postRaw(record, base, other))).toEqual([
      409,
      "STUDENT_CHANGED",
      STUDENT_CHANGED_MESSAGE,
    ]);
    expect(f.reads).toBe(0);
    const mine = { [FADING_RELEARN_STUDENT_HEADER]: f.studentId };
    expect((await get(mine)).status).toBe(200);
  });

  it("②(`MATH_FADING_STUDENT_HEADER=required`): 머리 없는 읽기 · 쓰기는 기록을 읽기 전에 `STUDENT_CHANGED` — 제 머리는 그대로", async () => {
    vi.stubEnv("MATH_FADING_STUDENT_HEADER", "required");
    f.reads = 0;
    expect(await code(await get())).toEqual([
      409,
      "STUDENT_CHANGED",
      STUDENT_CHANGED_MESSAGE,
    ]);
    expect((await code(await postRaw(record)))[1]).toBe("STUDENT_CHANGED");
    expect(f.reads).toBe(0);
    expect(f.writes).toBe(0);
    const mine = { [FADING_RELEARN_STUDENT_HEADER]: f.studentId };
    expect((await get(mine)).status).toBe(200);
  });

  it("꼴이 어긋난 요청은 400 — 모르는 행동 · 모르는 칸 · 화면이 실어 보낸 시각 · 겹친 빈칸", async () => {
    const grade = {
      conceptId: "m2-01-01-c1",
      propositionId: "p1",
      token: uuid(1),
      attemptId: uuid(2),
      answers: [{ targetId: "p1#1", text: "답" }],
    };
    for (const body of [
      undefined,
      {},
      { action: "nope" },
      { action: "record" },
      { action: "record", observation: { kind: "missed", conceptId: "a" } },
      // 화면이 «틀렸다»를 직접 말하는 꼴은 없다.
      {
        action: "record",
        observation: {
          kind: "rated",
          conceptId: "m2-01-01-c1",
          requestId: uuid(2),
          missed: ["p1"],
        },
      },
      // 시각은 서버가 정한다 — 화면이 싣는 칸이 없다.
      { action: "grade", attempt: { ...grade, now: T0 + 10 * MIN } },
      { action: "grade", attempt: { ...grade, dueAt: 0 } },
      { action: "grade", attempt: grade, studentId: f.otherId },
      {
        action: "grade",
        attempt: { ...grade, answers: [grade.answers[0], grade.answers[0]] },
      },
      {
        action: "grade",
        attempt: { ...grade, answers: [{ targetId: "p1#1", text: "" }] },
      },
      {
        action: "judge",
        judgement: {
          conceptId: "m2-01-01-c1",
          propositionId: "p1",
          attemptId: uuid(2),
          judged: { "p1#1": "maybe" },
        },
      },
    ])
      expect(
        (await code(await postRaw(body))).slice(0, 2),
        JSON.stringify(body),
      ).toEqual([400, "VALIDATION_ERROR"]);
    expect(f.writes).toBe(0);
  });

  it("은행에 없는 개념은 404 다", async () => {
    expect(
      (
        await code(
          await postRaw({
            action: "record",
            observation: {
              kind: "rated",
              conceptId: "no-such-concept",
              requestId: uuid(2),
            },
          }),
        )
      ).slice(0, 2),
    ).toEqual([404, "NOT_FOUND"]);
  });
});

describe("대기열 한 벌 — 증거 → 1분 → 5분 → 나감", () => {
  it("기록이 없는 학생은 빈 대기열이다 — 읽기는 쓰지 않는다", async () => {
    const q = await queue(await get());
    expect(q).toMatchObject({
      enabled: true,
      now: T0,
      items: [],
      contents: {},
      nextDueAt: null,
    });
    expect(f.writes).toBe(0);
  });

  it("🔴 서버의 시계로 1분 · 5분을 잰다 — 59,999 · 60,000 · 299,999 · 300,000 — 그리고 대기열 밖의 기록은 글자 그대로다", async () => {
    const c = pickConcept();
    await learn(c, uuid(2));
    // 평가와 함께 등록됐다(D3) — 대기열 밖의 기록을 기준으로 잡는다.
    const longTerm = restOfRecord();
    const first = c.propositions[0]!.id;

    // 지어낸 증거 — 없는 요청 번호.
    expect(
      await code(
        await postRaw({
          action: "record",
          observation: { kind: "rated", conceptId: c.id, requestId: uuid(99) },
        }),
      ),
    ).toEqual([409, "CONFLICT", FADING_RELEARN_NO_EVIDENCE]);
    expect(restOfRecord()).toBe(longTerm);

    // 옛 화면이 따로 보내는 평가의 증거 — 본 행동과 함께 이미 등록됐으니 되풀이다(D3).
    const recorded = await act({
      action: "record",
      observation: { kind: "rated", conceptId: c.id, requestId: uuid(2) },
    });
    expect(recorded.applied).toEqual({
      entered: 0,
      updated: 0,
      skipped: 0,
      duplicate: true,
    });
    expect(recorded.result).toBeNull();
    expect(
      Object.fromEntries(
        recorded.queue.items.map((i) => [i.propositionId, i.origin]),
      ),
    ).toEqual(
      Object.fromEntries(
        c.propositions.map((p, i) => [p.id, i === 0 ? "missed" : "exposed"]),
      ),
    );
    // 틀린 명제는 1분 뒤, 처음 배운 풀이의 틀리지 않은 명제(`exposed`)는 5분 뒤 확인 한 번(결정 2).
    expect(recorded.queue.items.map((i) => [i.stage, i.dueAt])).toEqual(
      c.propositions.map((_, i) =>
        i === 0 ? ["retry", T0 + MIN] : ["confirm", T0 + FIVE],
      ),
    );
    expect(restOfRecord()).toBe(longTerm);
    // 같은 증거를 다시 알리면 쓰지 않는다.
    const writes = f.writes;
    expect(
      (
        await act({
          action: "record",
          observation: { kind: "rated", conceptId: c.id, requestId: uuid(2) },
        })
      ).applied,
    ).toMatchObject({ entered: 0, duplicate: true });
    expect(f.writes).toBe(writes);

    at(T0 + 59_999);
    let q = await queue(await get());
    expect(q.now).toBe(T0 + 59_999);
    expect(q.counts).toEqual({
      judging: 0,
      ready: 0,
      waiting: c.propositions.length,
    });
    expect(
      await code(
        await postRaw({ action: "grade", attempt: attempt(q, c, first, 10) }),
      ),
    ).toEqual([409, "CONFLICT", FADING_RELEARN_NOT_DUE]);
    expect(f.writes).toBe(writes);

    at(T0 + 60_000);
    const revision = row().revision;
    const passed = await act({
      action: "grade",
      attempt: attempt(q, c, first, 10),
    });
    expect(passed.result).toMatchObject({
      verdict: "passed",
      next: { stage: "confirm", dueAt: T0 + MIN + FIVE },
      replayed: false,
    });
    expect(passed.applied).toBeNull();
    expect(row().revision).toBe(revision + 1);
    expect(restOfRecord()).toBe(longTerm);

    // 같은 번호의 되풀이 — 쓰지 않고 처음의 결과.
    const again = await act({
      action: "grade",
      attempt: attempt(q, c, first, 10),
    });
    expect(again.result).toEqual({ ...passed.result, replayed: true });
    expect(row().revision).toBe(revision + 1);

    at(T0 + MIN + 299_999);
    q = await queue(await get());
    expect(q.items.find((i) => i.propositionId === first)).toMatchObject({
      state: "waiting",
      stage: "confirm",
      waitMs: 1,
    });
    expect(
      await code(
        await postRaw({ action: "grade", attempt: attempt(q, c, first, 11) }),
      ),
    ).toEqual([409, "CONFLICT", FADING_RELEARN_NOT_DUE]);

    at(T0 + MIN + 300_000);
    const cleared = await act({
      action: "grade",
      attempt: attempt(q, c, first, 11),
    });
    expect(cleared.result).toMatchObject({ verdict: "passed", next: null });
    expect(cleared.queue.items.some((i) => i.propositionId === first)).toBe(
      false,
    );
    expect(cleared.queue.today).toEqual({
      on: "2026-10-06",
      checks: 2,
      cleared: 1,
      entered: c.propositions.length,
    });
    // 장기 일정 · 풀이 · 집계 · 영수증 · 다른 칸(기억 · 미션)은 대기열을 다 돈 뒤에도 글자 그대로다.
    expect(restOfRecord()).toBe(longTerm);
    // 옛 탐험의 원정 · 하루 여정의 갱신을 한 번도 지나지 않았다 — 같은 날 다시 맞힌 것이 옛 탐험의 칸을 채우지 않는다.
    expect([f.expedition, f.journey]).toEqual([0, 0]);
    updateDailyJourney(emptySrsState(), emptySrsState());
    expect(f.journey).toBe(1);
    const stored = (
      row().payload as { fading: { concepts: Record<string, unknown> } }
    ).fading.concepts[c.id];
    expect(stored).toMatchObject({
      reviews: 1,
      lapses: 1,
      dueOn: "2026-10-07",
    });
  });

  it("🔴 1분은 틀린 그때부터다 — 4단계에서 틀린 그 자리의 증거로 들고, 뒤의 평가가 그 시각을 미루지 않는다", async () => {
    const c = pickConcept();
    let view = await fading({ action: "open", conceptId: c.id });
    const ref = { conceptId: c.id, sessionId: view.session!.id };
    const seed = view.session!.seed;
    const traps = view.opened!.traps;
    view = await fading({ action: "read", ...ref });
    for (const step of [2, 3] as const)
      view = await fading({
        action: "step",
        ...ref,
        step,
        placements: chips(c, step, seed, traps),
      });
    const head = fadingTargets(c)[0]!;
    const slip = fadingTargets(c).find(
      (other) => fadingTypedOutcome(c, head.id, other.text, traps) === "wrong",
    )!;
    const wrong = { targetId: head.id, text: slip.text };

    // 4단계를 푸는 중 — 10초에 첫 빈칸을 틀리게 썼다. 본 행동 `miss` 가 그 넣기 하나를 함께 등록한다(D3) — 옛 화면의 따로 알림은 되풀이다.
    at(T0 + 10_000);
    await fading({ action: "miss", ...ref, placement: wrong });
    const trace = {
      kind: "step" as const,
      ...ref,
      step: 4 as const,
      placements: [wrong],
    };
    const entered = await act({ action: "record", observation: trace });
    expect(entered.applied).toEqual({
      entered: 0,
      updated: 0,
      skipped: 0,
      duplicate: true,
    });
    expect(entered.queue.items).toHaveLength(1);
    expect(entered.queue.items[0]).toMatchObject({
      propositionId: c.propositions[0]!.id,
      origin: "missed",
      state: "waiting",
      dueAt: T0 + 10_000 + MIN,
      fails: 1,
    });
    // 풀이는 열린 채 그대로다 — 대기열 밖의 기록은 그 행동 전과 같다.
    const open = restOfRecord();

    // 60초에 4단계를 마치고 «다시»로 닫는다 — 차례 전부와 평가를 알린다(이미 센 틀림이다).
    at(T0 + 60_000);
    const moves = erasedTargets(c, 4).flatMap((target): FadingPlacement[] => [
      ...(target.id === head.id ? [wrong] : []),
      { targetId: target.id, text: target.text },
    ]);
    expect(
      (
        await act({
          action: "record",
          observation: { ...trace, placements: [wrong] },
        })
      ).applied,
    ).toMatchObject({ entered: 0, updated: 0, duplicate: true });
    expect(restOfRecord()).toBe(open);
    await fading({ action: "step", ...ref, step: 4, placements: moves });
    await fading({
      action: "rate",
      ...ref,
      rating: "again",
      requestId: uuid(2),
    });
    // 평가와 함께 처음 배운 풀이의 틀리지 않은 명제만 새로 들었다 — 틀린 명제는 다시 세지 않는다. 따로 알리면 되풀이다.
    expect((await queue(await get())).today.entered).toBe(
      c.propositions.length,
    );
    const closed = await act({
      action: "record",
      observation: { kind: "rated", conceptId: c.id, requestId: uuid(2) },
    });
    expect(closed.applied).toEqual({
      entered: 0,
      updated: 0,
      skipped: 0,
      duplicate: true,
    });
    const missed = (q: FadingRelearnQueue) =>
      q.items.find((i) => i.propositionId === c.propositions[0]!.id)!;
    expect(missed(closed.queue)).toMatchObject({
      dueAt: T0 + 10_000 + MIN,
      fails: 1,
      since: T0 + 10_000,
    });
    // 틀린 때(10초)부터 1분 — 69,999 에는 아직이고 70,000 에 준비된다. 평가(60초)부터 1분이 아니다.
    at(T0 + 69_999);
    let q = await queue(await get());
    expect(missed(q)).toMatchObject({ state: "waiting", waitMs: 1 });
    expect(q.counts.ready).toBe(0);
    at(T0 + 70_000);
    q = await queue(await get());
    expect(missed(q).state).toBe("ready");
    expect(q.counts).toEqual({
      judging: 0,
      ready: 1,
      waiting: c.propositions.length - 1,
    });
    const done = await act({
      action: "grade",
      attempt: attempt(q, c, c.propositions[0]!.id, 10),
    });
    expect(done.result).toMatchObject({
      verdict: "passed",
      next: { stage: "confirm", dueAt: T0 + 70_000 + FIVE },
    });
  });

  it("그사이 다른 창이 먼저 저장했어도 한 번만 적용된다(revision 을 견주어 쓴다)", async () => {
    const c = pickConcept();
    await learn(c, uuid(2));
    await act({
      action: "record",
      observation: { kind: "rated", conceptId: c.id, requestId: uuid(2) },
    });
    at(T0 + MIN);
    const q = await queue(await get());
    f.raceOnce = true;
    const done = await act({
      action: "grade",
      attempt: attempt(q, c, c.propositions[0]!.id, 10),
    });
    expect(done.result!.verdict).toBe("passed");
    expect(done.queue.today.checks).toBe(1);
    expect(
      done.queue.items.find((i) => i.propositionId === c.propositions[0]!.id),
    ).toMatchObject({ stage: "confirm", checks: 1 });
  });

  it("🔴 서버 없이 도는 길과 같은 답이다 — 같은 풀이 · 같은 시각이면 대기열이 글자 그대로 같다", async () => {
    const c = pickConcept();
    const clock = { now: T0 };
    let serial = 0;
    const main = createLocalFadingSource({
      concepts: [c],
      today: "2026-10-06",
      cards: true,
      traps: fadingTrapMap([c]),
      fresh: () => ({ sessionId: uuid(900 + ++serial), seed: serial }),
    });
    const local = createLocalFadingRelearnSource({
      main,
      concepts: [c],
      traps: fadingTrapMap([c]),
      now: () => clock.now,
    });
    const both = async (ms: number) => {
      at(ms);
      clock.now = ms;
      const server = await queue(await get());
      expect(await local.queue()).toEqual(server);
      return server;
    };

    // 서버: 본 라우트로 풀고 증거를 알린다. 로컬: 싸개가 같은 증거를 알린다.
    await learn(c, uuid(2));
    await act({
      action: "record",
      observation: { kind: "rated", conceptId: c.id, requestId: uuid(2) },
    });
    const source = withFadingRelearn(main, local);
    let view = await source.act({ action: "open", conceptId: c.id });
    const ref = { conceptId: c.id, sessionId: view.session!.id };
    const traps = view.opened!.traps;
    view = await source.act({ action: "read", ...ref });
    for (const step of [2, 3] as const)
      await source.act({
        action: "step",
        ...ref,
        step,
        placements: chips(c, step, view.session!.seed, traps),
      });
    const head = fadingTargets(c)[0]!;
    const slip = fadingTargets(c).find(
      (other) => fadingTypedOutcome(c, head.id, other.text, traps) === "wrong",
    )!;
    await source.act({
      action: "step",
      ...ref,
      step: 4,
      placements: erasedTargets(c, 4).flatMap((target): FadingPlacement[] => [
        ...(target.id === head.id
          ? [{ targetId: target.id, text: slip.text }]
          : []),
        { targetId: target.id, text: target.text },
      ]),
    });
    await source.act({
      action: "rate",
      ...ref,
      rating: "again",
      requestId: uuid(2),
    });

    await both(T0 + 30_000);
    await both(T0 + MIN);
    // 처음 배운 풀이의 틀리지 않은 명제(`exposed`)는 5분 뒤에 준비된다(결정 2).
    const ready = await both(T0 + FIVE);
    const [p1, p2, p3] = c.propositions.map((p) => p.id) as [
      string,
      string,
      string,
    ];
    // 틀림 · 못 알아본 글(대조) · 맞힘 — 두 길에 같은 답을 낸다.
    const wrong = {
      ...attempt(ready, c, p1, 10),
      answers: [
        { targetId: head.id, text: slip.text },
        ...attempt(ready, c, p1, 10).answers.slice(1),
      ],
    };
    const unknown = {
      ...attempt(ready, c, p2, 11),
      answers: attempt(ready, c, p2, 11).answers.map((answer, i) =>
        i === 0 ? { ...answer, text: "전혀 다른 설명" } : answer,
      ),
    };
    for (const each of [wrong, unknown, attempt(ready, c, p3, 12)]) {
      const server = await act({ action: "grade", attempt: each });
      const mine = await local.grade(each);
      expect(mine.result).toEqual(server.result);
      expect(mine.queue).toEqual(server.queue);
    }
    const waiting = await both(T0 + FIVE + 10_000);
    // 틀린 것(1분 뒤)은 기다리고, 맞힌 `exposed`(5분 확인 한 번)는 나갔고, 못 알아본 글은 대조를 기다리고, 아직 안 한 것은 준비돼 있다.
    expect(waiting.counts).toEqual({
      judging: 1,
      ready: c.propositions.length - 3,
      waiting: 1,
    });
    const judgement = {
      conceptId: c.id,
      propositionId: p2,
      attemptId: uuid(11),
      judged: { [unknown.answers[0]!.targetId]: "same" as const },
    };
    const server = await act({ action: "judge", judgement });
    const mine = await local.judge(judgement);
    expect(mine.result).toEqual(server.result);
    // 5분 확인(`confirm`)에서 «같은 뜻»이면 도움 없이 맞힌 것이라 나간다.
    expect(server.result).toMatchObject({ verdict: "passed", next: null });
    await both(T0 + FIVE + 2 * MIN);
    await both(T0 + 30 * MIN);
  });

  it("🔴 새로 고쳐도 · 자정을 넘겨도 남는다 — 다음 날에도 같은 줄 · 같은 확인 시각이고, 그날의 집계만 새로 센다", async () => {
    const c = pickConcept();
    // 한국 10월 6일 23:59:30.
    const night = Date.UTC(2026, 9, 6, 14, 59, 30);
    at(night);
    await learn(c, uuid(2));
    await act({
      action: "record",
      observation: { kind: "rated", conceptId: c.id, requestId: uuid(2) },
    });
    const before = await queue(await get());
    expect(before.today).toMatchObject({ on: "2026-10-06" });
    // 다음 날 00:04:30 — 새 요청(새로 고침)으로 읽는다(`exposed` 의 5분 확인까지 때가 됐다).
    at(night + FIVE);
    const after = await queue(await get());
    expect(after.today).toEqual({
      on: "2026-10-07",
      checks: 0,
      cleared: 0,
      entered: 0,
    });
    expect(after.items.map((i) => [i.key, i.dueAt, i.token])).toEqual(
      before.items.map((i) => [i.key, i.dueAt, i.token]),
    );
    expect(after.counts.ready).toBe(c.propositions.length);
    const done = await act({
      action: "grade",
      attempt: attempt(after, c, c.propositions[0]!.id, 10),
    });
    expect(done.result!.verdict).toBe("passed");
    expect(done.queue.today).toMatchObject({ on: "2026-10-07", checks: 1 });
  });

  it("다른 학생의 대기열에는 닿지 않는다 — 요청에 학생을 가리키는 값이 없고, 로그인한 학생의 기록만 읽고 쓴다", async () => {
    const c = pickConcept();
    await learn(c, uuid(2));
    await act({
      action: "record",
      observation: { kind: "rated", conceptId: c.id, requestId: uuid(2) },
    });
    const mine = JSON.stringify(row());
    // 다른 학생으로 로그인해 같은 요청 번호 · 같은 토큰을 보낸다.
    at(T0 + MIN);
    const q = await queue(await get());
    f.session = {
      student: { studentId: f.otherId, mustChangePassword: false },
    };
    expect((await queue(await get())).items).toEqual([]);
    expect(
      await code(
        await postRaw({
          action: "record",
          observation: { kind: "rated", conceptId: c.id, requestId: uuid(2) },
        }),
      ),
    ).toEqual([409, "CONFLICT", FADING_RELEARN_NO_EVIDENCE]);
    expect(
      (
        await code(
          await postRaw({
            action: "grade",
            attempt: attempt(q, c, c.propositions[0]!.id, 10),
          }),
        )
      )[0],
    ).toBe(409);
    expect(f.rows.has(f.otherId)).toBe(false);
    expect(JSON.stringify(row())).toBe(mine);
  });
});

describe("🔴 본 행동과 한 저장으로 등록된다(D3) — 증거를 따로 보내지 않아도 대기열에 있다", () => {
  /** 카드 풀이를 4단계 직전까지 — 열기 · 정독 · 2 · 3단계. */
  async function toFour(c: FadingConcept) {
    let view = await fading({ action: "open", conceptId: c.id });
    const ref = { conceptId: c.id, sessionId: view.session!.id };
    const seed = view.session!.seed;
    const traps = view.opened!.traps;
    view = await fading({ action: "read", ...ref });
    for (const step of [2, 3] as const)
      view = await fading({
        action: "step",
        ...ref,
        step,
        placements: chips(c, step, seed, traps),
      });
    const head = fadingTargets(c)[0]!;
    const slip = fadingTargets(c).find(
      (other) => fadingTypedOutcome(c, head.id, other.text, traps) === "wrong",
    )!;
    return { ref, seed, traps, head, slip, view };
  }
  const items = (q: FadingRelearnQueue) =>
    Object.fromEntries(
      q.items.map((i) => [
        i.propositionId,
        { origin: i.origin, dueAt: i.dueAt, fails: i.fails, stage: i.stage },
      ]),
    );

  it("rate · miss · give-up-card 가 `record` 없이 등록된다 — 새로 읽은 대기열(새 원천 · 새로고침)에 그대로 있고, 응답의 꼴은 그대로다", async () => {
    const c = pickConcept();
    const { ref, head, slip } = await toFour(c);
    const [p1, p2] = c.propositions.map((p) => p.id) as [string, string];
    at(T0 + 10_000);
    const missed = await fading({
      action: "miss",
      ...ref,
      placement: { targetId: head.id, text: slip.text },
    });
    // 응답은 지금 꼴 그대로 — 대기열을 싣지 않는다(옛 화면의 엄격한 파서).
    expect(Object.keys(missed)).not.toContain("relearn");
    expect(items(await queue(await get()))).toEqual({
      [p1]: {
        origin: "missed",
        dueAt: T0 + 10_000 + MIN,
        fails: 1,
        stage: "retry",
      },
    });
    at(T0 + 20_000);
    await fading({
      action: "give-up-card",
      ...ref,
      propositionId: p2,
      placements: [{ targetId: head.id, text: slip.text }],
    });
    // 같은 단계의 다른 명제가 더해진다 — 앞 명제의 확인 시각은 그대로.
    expect(items(await queue(await get()))).toEqual({
      [p1]: {
        origin: "missed",
        dueAt: T0 + 10_000 + MIN,
        fails: 1,
        stage: "retry",
      },
      [p2]: {
        origin: "missed",
        dueAt: T0 + 20_000 + MIN,
        fails: 1,
        stage: "retry",
      },
    });
    at(T0 + 30_000);
    await fading({
      action: "step",
      ...ref,
      step: 4,
      placements: erasedTargets(c, 4).flatMap((target): FadingPlacement[] =>
        target.id.startsWith(`${p2}#`)
          ? []
          : [{ targetId: target.id, text: target.text }],
      ),
      gaveUp: true,
    });
    await fading({
      action: "rate",
      ...ref,
      rating: "again",
      requestId: uuid(2),
    });
    // 평가로 나머지 명제(답을 본 직후)가 든다 — 틀린 둘은 그대로.
    const after = items(await queue(await get()));
    expect(after[p1]).toEqual({
      origin: "missed",
      dueAt: T0 + 10_000 + MIN,
      fails: 1,
      stage: "retry",
    });
    expect(after[p2]).toEqual({
      origin: "missed",
      dueAt: T0 + 20_000 + MIN,
      fails: 1,
      stage: "retry",
    });
    for (const p of c.propositions.slice(2))
      expect(after[p.id]).toEqual({
        origin: "exposed",
        dueAt: T0 + 30_000 + FIVE,
        fails: 0,
        stage: "confirm",
      });
    expect((await queue(await get())).today.entered).toBe(
      c.propositions.length,
    );
    expect(f.rows.get(f.studentId)!.revision).toBeGreaterThan(0);
  });

  it("옛 화면이 따로 보내는 증거는 되풀이다 — 틀림의 수 · 확인 시각 · 단계 · 집계가 그대로고 쓰지 않는다", async () => {
    const c = pickConcept();
    const { ref, head, slip } = await toFour(c);
    at(T0 + 10_000);
    await fading({
      action: "miss",
      ...ref,
      placement: { targetId: head.id, text: slip.text },
    });
    const before = JSON.stringify(row().payload);
    const writes = f.writes;
    const dup = await act({
      action: "record",
      observation: {
        kind: "step",
        ...ref,
        step: 4,
        placements: [{ targetId: head.id, text: slip.text }],
      },
    });
    expect(dup.applied).toMatchObject({
      entered: 0,
      updated: 0,
      duplicate: true,
    });
    expect(JSON.stringify(row().payload)).toBe(before);
    expect(f.writes).toBe(writes);
  });

  it("이미 지난 단계의 되풀이(2단계 다시)는 지금처럼 200 · 무변경이고, 평가로 닫힌 뒤의 4단계 되풀이는 지금처럼 409 — 등록은 둘 다 건너뛴다", async () => {
    const c = pickConcept();
    const { ref, seed, traps, head, slip } = await toFour(c);
    const q1 = await queue(await get());
    const writes = f.writes;
    const replay = await fading({
      action: "step",
      ...ref,
      step: 2,
      placements: chips(c, 2, seed, traps),
    });
    expect(replay.session!.step).toBe(4);
    expect(f.writes).toBe(writes);
    expect(await queue(await get())).toEqual(q1);
    const moves = erasedTargets(c, 4).flatMap((target): FadingPlacement[] => [
      ...(target.id === head.id
        ? [{ targetId: target.id, text: slip.text }]
        : []),
      { targetId: target.id, text: target.text },
    ]);
    await fading({ action: "step", ...ref, step: 4, placements: moves });
    await fading({
      action: "rate",
      ...ref,
      rating: "again",
      requestId: uuid(2),
    });
    const q2 = await queue(await get());
    expect(q2.items.length).toBe(c.propositions.length);
    const late = await FADING_POST(
      new Request(`${base}/api/learn/fading`, {
        method: "POST",
        headers: { origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "step",
          ...ref,
          step: 4,
          placements: moves,
        }),
      }),
    );
    expect(await code(late)).toEqual([
      409,
      "CONFLICT",
      "이 풀이는 열려 있지 않습니다.",
    ]);
    expect(await queue(await get())).toEqual(q2);
    // 같은 평가 번호의 되풀이 — 영수증으로 답하고 등록도 다시 세지 않는다.
    const again = await fading({
      action: "rate",
      ...ref,
      rating: "again",
      requestId: uuid(2),
    });
    expect(again.receipt).toMatchObject({ requestId: uuid(2) });
    expect(await queue(await get())).toEqual(q2);
  });

  it("revision 충돌 — 다른 창이 적은 대기열의 변경은 남고, 장기 평가는 한 번만 적힌다", async () => {
    const first = pickConcept();
    const second = pickConcept(1);
    await learn(first, uuid(2));
    const firstProposition = first.propositions[0]!.id;
    expect(items(await queue(await get()))[firstProposition]).toMatchObject({
      fails: 1,
    });
    const { ref, head, slip } = await toFour(second);
    const moves = erasedTargets(second, 4).flatMap(
      (target): FadingPlacement[] => [
        ...(target.id === head.id
          ? [{ targetId: target.id, text: slip.text }]
          : []),
        { targetId: target.id, text: target.text },
      ],
    );
    await fading({ action: "step", ...ref, step: 4, placements: moves });
    // 평가를 저장하려는 사이에 다른 창이 첫 개념의 줄을 바꿨다(틀림 +1).
    f.raceOnce = true;
    f.raceMutate = (payload) => {
      const next = structuredClone(payload) as {
        fading: {
          relearn: {
            items: {
              conceptId: string;
              propositionId: string;
              fails: number;
            }[];
          };
        };
      };
      const item = next.fading.relearn.items.find(
        (i) => i.conceptId === first.id && i.propositionId === firstProposition,
      )!;
      item.fails += 1;
      return next;
    };
    const rated = await fading({
      action: "rate",
      ...ref,
      rating: "again",
      requestId: uuid(3),
    });
    expect(rated.receipt).toMatchObject({ requestId: uuid(3) });
    const stored = (
      row().payload as {
        fading: {
          concepts: Record<string, { reviews: number }>;
          receipts: unknown[];
        };
      }
    ).fading;
    expect(stored.concepts[second.id]!.reviews).toBe(1);
    expect(stored.receipts).toHaveLength(2);
    const q = items(await queue(await get()));
    expect(q[firstProposition]).toMatchObject({ fails: 2 });
    expect(q[second.propositions[0]!.id]).toMatchObject({
      origin: "missed",
      fails: 1,
    });
  });

  it("쓰는 길의 문이 닫혀 있으면 본 행동은 그대로 성공하고, 이미 적힌 대기열은 글자 그대로 남는다", async () => {
    const first = pickConcept();
    await learn(first, uuid(2));
    const stored = () =>
      JSON.stringify(
        (row().payload as { fading: { relearn: unknown } }).fading.relearn,
      );
    const before = stored();
    expect(before).not.toBe(undefined);
    vi.stubEnv("MATH_FADING_RELEARN", "off");
    const second = pickConcept(1);
    const view = await learn(second, uuid(3));
    expect(view.receipt).toMatchObject({ requestId: uuid(3) });
    expect(stored()).toBe(before);
    expect(await queue(await get())).toMatchObject({
      enabled: false,
      items: [],
    });
  });

  it("🔴 서버 없이 도는 길과 같은 답이다 — miss · give-up-card · 평가의 등록까지 같은 시각이면 대기열이 글자 그대로 같다", async () => {
    const c = pickConcept();
    const clock = { now: T0 };
    let serial = 0;
    const main = createLocalFadingSource({
      concepts: [c],
      today: "2026-10-06",
      cards: true,
      traps: fadingTrapMap([c]),
      fresh: () => ({ sessionId: uuid(900 + ++serial), seed: serial }),
      now: () => clock.now,
    });
    const local = createLocalFadingRelearnSource({
      main,
      concepts: [c],
      traps: fadingTrapMap([c]),
    });
    const both = async (ms: number) => {
      at(ms);
      clock.now = ms;
      const server = await queue(await get());
      expect(await local.queue()).toEqual(server);
      return server;
    };
    const serverSide = await toFour(c);
    // 로컬도 같은 자리까지 — 씨앗은 서버의 것을 로컬에 넣는다.
    serial = serverSide.seed - 1;
    let view = await main.act({ action: "open", conceptId: c.id });
    const ref = { conceptId: c.id, sessionId: view.session!.id };
    view = await main.act({ action: "read", ...ref });
    for (const step of [2, 3] as const)
      await main.act({
        action: "step",
        ...ref,
        step,
        placements: chips(c, step, view.session!.seed, serverSide.traps),
      });
    const [p2] = c.propositions.slice(1).map((p) => p.id) as [string];
    const wrong = { targetId: serverSide.head.id, text: serverSide.slip.text };
    at(T0 + 10_000);
    clock.now = T0 + 10_000;
    await fading({ action: "miss", ...serverSide.ref, placement: wrong });
    await main.act({ action: "miss", ...ref, placement: wrong });
    await both(T0 + 15_000);
    await fading({
      action: "give-up-card",
      ...serverSide.ref,
      propositionId: p2,
      placements: [wrong],
    });
    await main.act({
      action: "give-up-card",
      ...ref,
      propositionId: p2,
      placements: [wrong],
    });
    await both(T0 + 20_000);
    const moves = erasedTargets(c, 4).flatMap((target): FadingPlacement[] =>
      target.id.startsWith(`${p2}#`)
        ? []
        : [{ targetId: target.id, text: target.text }],
    );
    await fading({
      action: "step",
      ...serverSide.ref,
      step: 4,
      placements: moves,
      gaveUp: true,
    });
    await main.act({
      action: "step",
      ...ref,
      step: 4,
      placements: moves,
      gaveUp: true,
    });
    await fading({
      action: "rate",
      ...serverSide.ref,
      rating: "again",
      requestId: uuid(2),
    });
    await main.act({
      action: "rate",
      ...ref,
      rating: "again",
      requestId: uuid(2),
    });
    const q = await both(T0 + 25_000);
    expect(q.items).toHaveLength(c.propositions.length);
    await both(T0 + 80_000);
  });
});
