// @vitest-environment node
// «오늘 할 일»의 학생 라우트 — 실제 은행 · 실제 탐험의 규칙으로 HTTP 를 돈다(은행 전체를 싣는다).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({
  /** 학생의 하루 분량 행(`fading_student_policy`) — 없으면 서비스 기본. */
  policy: null as null | {
    quota: number | null;
    previousQuota: number | null;
    effectiveOn: Date;
    revision: number;
  },
  /** 상한에 닿은 날로 적힌 것(`fading_relearn_cap_day`). */
  capDays: [] as string[],
  studentId: "017c1a9b-b28a-4a5b-80b6-f1a21ccfeee2",
  classId: "7e7c388b-c264-4d39-809b-527723b8b74b",
  session: null as unknown,
  rows: new Map<
    string,
    { studentId: string; revision: number; payload: unknown }
  >(),
  writes: 0,
  reads: 0,
  disabled: false,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: async () => f.session }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, fn: unknown) => fn,
}));
vi.mock("@/lib/db", () => ({
  db: {
    fadingStudentPolicy: { findUnique: async () => f.policy },
    fadingRelearnCapDay: {
      upsert: async ({ create }: { create: { on: Date } }) => {
        const on = create.on.toISOString().slice(0, 10);
        if (!f.capDays.includes(on)) f.capDays.push(on);
        return create;
      },
    },
    student: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        name: "학생",
        classId: f.classId,
        class: { id: f.classId, name: "테스트반", grade: "초5" },
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
import { GET as DAILY } from "@/app/api/learn/fading/daily/route";
import { GET, POST } from "@/app/api/learn/fading/route";
import type { FadingPlacement } from "@/contracts/fading.contract";
import {
  fadingStateResponseSchema,
  type FadingAction,
  type FadingState,
} from "@/contracts/fadingApi.contract";
import {
  fadingDailyPlanResponseSchema,
  type FadingDailyPlan,
  type FadingDailyRecall,
} from "@/contracts/fadingDaily.contract";
import { fadingCatalog, fadingConceptMap } from "@/lib/fading/catalog";
import { chipFits, chipTray } from "@/lib/fading/chips";
import type { FadingConcept } from "@/lib/fading/concepts";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import { buildFadingDailyPlan } from "@/lib/fading/explorerDaily";
import {
  fadingDailyLearning,
  fadingDailyWorkload,
  serverFadingDailyPlan,
} from "@/lib/fading/explorerDailyServer";
import { createLocalFadingSource } from "@/lib/fading/local";
import { sectionKeyOfBridgeSection } from "@/lib/fading/prerequisites";
import { FADING_STUDENT_HEADER } from "@/lib/fading/routes";
import { emptyFading } from "@/lib/fading/state";
import { definitionCards } from "@/lib/math-explorers/definition-cards";
import { initialOwnedExplorer } from "@/lib/math-explorers/expedition";
import {
  emptyCourseState,
  setCoursePlan,
} from "@/lib/math-srs/courseAutomation";
import {
  emptySrsState,
  parseSrsState,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import { STUDENT_CHANGED_MESSAGE } from "@/lib/studentRouteAccess";

const base = "http://localhost:3000";
const path = "/api/learn/fading";
const NOW = new Date("2026-10-07T03:00:00.000Z"); // 한국 10월 7일 낮
const TODAY = "2026-10-07";
const OTHER_STUDENT = "9d2c9d0a-58f5-4b53-bb6d-3f3c1a6f0001";
const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;

const daily = (query = "", headers: Record<string, string> = {}) =>
  DAILY(new Request(`${base}${path}/daily${query}`, { headers }));
const postRaw = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request(`${base}${path}`, {
      method: "POST",
      headers: { origin: base, "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
async function plan(response: Response): Promise<FadingDailyPlan> {
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  return fadingDailyPlanResponseSchema.parse(await response.json()).data;
}
async function act(action: FadingAction): Promise<FadingState> {
  const response = await postRaw(action);
  expect(response.status).toBe(200);
  return fadingStateResponseSchema.parse(await response.json()).data;
}
const code = async (response: Response) =>
  [response.status, (await response.json()).error?.code] as const;
const stored = () =>
  parseSrsState(structuredClone(f.rows.get(f.studentId)!.payload));
const seed = (state: StoredSrsState) =>
  f.rows.set(f.studentId, {
    studentId: f.studentId,
    revision: 3,
    payload: structuredClone(parseSrsState(structuredClone(state))),
  });

/** 그 단계를 안 틀리고 채우는 «넣기»의 차례 — 화면이 하듯 받은 내용과 씨앗으로 칩을 낸다. */
function placements(
  c: FadingConcept,
  step: FadingStep,
  seedValue: number,
  traps: readonly { text: string }[],
): FadingPlacement[] {
  const tray = chipTray(c, step, { seed: seedValue, traps });
  const used = new Set<string>();
  return erasedTargets(c, step).map((target) => {
    const chip = tray.find(
      (x) => !used.has(x.id) && chipFits(c, target.id, x),
    )!;
    used.add(chip.id);
    return { targetId: target.id, chipId: chip.id };
  });
}

/** 초5 분수의 곱셈(시범 목표 소단원)이 오늘의 문제은행 날인 학생 — 그 탐험 단원의 카드 다섯 장을 다 모았다. */
function fractionStudent(): StoredSrsState {
  const blank = emptySrsState();
  const course = setCoursePlan(
    emptyCourseState(),
    {
      startSectionId: "5-2-2-1",
      dailyQuestionCount: 10,
      enabled: true,
      expectedRevision: 0,
    },
    new Date("2026-10-01T00:00:00.000Z"),
  );
  const withCourse = { ...blank, course };
  const explorers = initialOwnedExplorer(withCourse, f.studentId, NOW);
  const cards = Object.fromEntries(
    definitionCards
      .filter((card) => card.unit === "g5-fractions")
      .map((card) => [
        card.id,
        {
          level: 1,
          due: "2026-10-20",
          lastDate: "2026-10-05",
          attemptedAt: "2026-10-05",
          missed: 0,
        },
      ]),
  );
  return parseSrsState({
    ...withCourse,
    explorers: {
      ...explorers,
      profile: {
        ...explorers.profile,
        definitions: { ...explorers.profile.definitions!, runs: 1, cards },
      },
    },
  });
}

beforeEach(() => {
  f.policy = null;
  f.capDays = [];
  f.rows.clear();
  f.writes = 0;
  f.reads = 0;
  f.disabled = false;
  f.session = {
    student: { studentId: f.studentId, mustChangePassword: false },
  };
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubEnv("AUTH_URL", base);
  vi.stubEnv("MATH_FADING", "on");
  // 칩 풀이로 돈다(카드 풀이는 그 묶음의 시험이 따로 본다) — 계획은 풀이의 방식을 모른다.
  vi.stubEnv("MATH_FADING_CARDS", "off");
  vi.stubEnv("MATH_PREREQ_CHECK", "");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("문지기", () => {
  it("꺼져 있으면 없다 — 학생 기록을 읽지도 않는다", async () => {
    for (const value of ["off", "read"]) {
      vi.stubEnv("MATH_FADING", value);
      expect(await code(await daily())).toEqual([404, "NOT_FOUND"]);
    }
    expect(f.reads).toBe(0);
  });

  it("학생 세션이 없으면 401 · 첫 비밀번호를 안 바꾼 학생은 403 · 멈춘 계정은 401", async () => {
    f.session = null;
    expect(await code(await daily())).toEqual([401, "UNAUTHORIZED"]);
    // 원장 세션은 학생이 아니다.
    f.session = { user: { id: "teacher" } };
    expect(await code(await daily())).toEqual([401, "UNAUTHORIZED"]);
    f.session = {
      student: { studentId: f.studentId, mustChangePassword: true },
    };
    expect(await code(await daily())).toEqual([403, "FORBIDDEN"]);
    f.session = {
      student: { studentId: f.studentId, mustChangePassword: false },
    };
    f.disabled = true;
    expect(await code(await daily())).toEqual([401, "UNAUTHORIZED"]);
    expect(f.reads).toBe(0);
  });

  it("분량은 교사가 정한 값이다 — 주소의 ?quota= 는 읽지 않는다(2026-10-17)", async () => {
    // 행이 없으면 서비스 기본 15칸.
    expect((await plan(await daily())).quota).toMatchObject({
      total: 15,
      source: "default",
    });
    // 학생 쪽 요청이 분량을 정하지 못한다 — 잘못된 값도 400 이 아니라 무시된다.
    expect((await plan(await daily("?quota=60"))).quota.total).toBe(15);
    expect((await plan(await daily("?quota=abc"))).quota.total).toBe(15);
    // 오늘부터 먹는 학생 지정 값.
    f.policy = {
      quota: 10,
      previousQuota: null,
      effectiveOn: new Date(`${TODAY}T00:00:00.000Z`),
      revision: 1,
    };
    expect((await plan(await daily())).quota).toMatchObject({
      total: 10,
      source: "explicit",
    });
    // 내일부터 먹는 값이면 오늘은 앞의 값이다.
    f.policy = {
      quota: 10,
      previousQuota: 20,
      effectiveOn: new Date("2026-10-08T00:00:00.000Z"),
      revision: 2,
    };
    expect((await plan(await daily())).quota.total).toBe(20);
  });
});

describe("화면이 실어 보낸 학생과 로그인한 학생이 다르면 받지 않는다", () => {
  const stale = { [FADING_STUDENT_HEADER]: OTHER_STUDENT };
  const mine = () => ({ [FADING_STUDENT_HEADER]: f.studentId });

  it("머리의 이름은 교재의 학생 라우트와 같다", () => {
    expect(FADING_STUDENT_HEADER).toBe("x-student-id");
  });

  it("다섯 길 전부 409 — 기록을 읽지도 쓰지도 않는다", async () => {
    const conceptId = fadingCatalog()[0]!.id;
    const responses = [
      await daily("", stale),
      await GET(new Request(`${base}${path}`, { headers: stale })),
      await postRaw({ action: "pick", conceptId }, stale),
      await postRaw({ action: "open", conceptId }, stale),
      await postRaw({ action: "all-today", on: true }, stale),
      await CATALOG(new Request(`${base}${path}/catalog`, { headers: stale })),
      await CONCEPT(
        new Request(`${base}${path}/concepts/${conceptId}`, { headers: stale }),
        { params: Promise.resolve({ id: conceptId }) },
      ),
    ];
    for (const response of responses) {
      expect(response.status).toBe(409);
      expect(response.headers.get("Cache-Control")).toContain("no-store");
      // 내용이 바뀐 409(`CONFLICT`)와 코드를 가른다 — 화면은 다시 읽지 않고 그 화면을 내린다(D1).
      expect((await response.json()).error).toMatchObject({
        code: "STUDENT_CHANGED",
        message: STUDENT_CHANGED_MESSAGE,
      });
    }
    expect(f.reads).toBe(0);
    expect(f.writes).toBe(0);
    expect(f.rows.size).toBe(0);
  });

  it("같은 학생이면 그대로 받고, 머리가 없으면 지금까지와 같다", async () => {
    const conceptId = fadingCatalog()[0]!.id;
    await plan(await daily("", mine()));
    await plan(await daily());
    expect((await postRaw({ action: "pick", conceptId }, mine())).status).toBe(
      200,
    );
    expect(stored().fading!.concepts[conceptId]).toBeDefined();
    expect((await postRaw({ action: "drop", conceptId })).status).toBe(200);
    expect(stored().fading!.concepts[conceptId]).toBeUndefined();
  });

  it("②(`MATH_FADING_STUDENT_HEADER=required`): «오늘 할 일»도 같은 문이라 머리 없는 읽기는 기록을 읽기 전에 `STUDENT_CHANGED` 다", async () => {
    vi.stubEnv("MATH_FADING_STUDENT_HEADER", "required");
    f.reads = 0;
    const response = await daily();
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatchObject({
      code: "STUDENT_CHANGED",
      message: STUDENT_CHANGED_MESSAGE,
    });
    expect(f.reads).toBe(0);
    await plan(await daily("", mine()));
  });

  it("로그인이 없으면 머리가 맞아도 401 이다 — 머리는 로그인을 대신하지 않는다", async () => {
    f.session = null;
    expect(await code(await daily("", mine()))).toEqual([401, "UNAUTHORIZED"]);
  });
});

describe("읽기뿐이다", () => {
  it("몇 번을 읽어도 학생 기록은 그대로다 — 기록이 없는 학생에게 줄을 만들지도 않는다", async () => {
    await plan(await daily());
    await plan(await daily("?quota=30"));
    expect(f.rows.size).toBe(0);
    expect(f.writes).toBe(0);

    seed(fractionStudent());
    const before = structuredClone(f.rows.get(f.studentId));
    await plan(await daily());
    await plan(await daily("?quota=30"));
    expect(f.writes).toBe(0);
    expect(f.rows.get(f.studentId)).toEqual(before);
    // 탐험을 시작하지도, 칸을 만들지도 않았다.
    expect(stored().expedition).toBeUndefined();
    expect(stored().fading).toBeUndefined();
  });
});

describe("탐험과 이어 짓는다 — 분량 · 추천은 탐험이 낸 그대로", () => {
  it("기록이 없는 학생: 탐험의 첫 개념 날(카드 활동 15)이 통째로 들어간다", async () => {
    const got = await plan(await daily());
    expect(got.today).toBe(TODAY);
    expect(got.integration).toEqual({ expedition: true });
    const practice = got.activities.find((a) => a.kind === "practice")!;
    expect(practice).toMatchObject({
      kind: "practice",
      unit: "task",
      count: 15,
      slots: 15,
      state: "todo",
      start: "start",
      bucket: "progress",
      source: { kind: "explorers", route: "unit", selection: "expedition" },
    });
    expect(got.units.task).toEqual({ planned: 15, done: 0 });
    expect(got.units.question).toEqual({ planned: 0, done: 0 });
    expect(got.counts.total).toBeLessThanOrEqual(20);
    expect(got.quota.over).toBe(0);
    // 남은 다섯 칸에는 그 탐험 단원의 은행 소단원의 새 개념만 들어간다(같은 교육과정 열쇠로 이어진 것).
    const unit = practice.kind === "practice" ? practice.source.unitId : "";
    const concepts = fadingConceptMap();
    for (const activity of got.activities) {
      if (activity.kind !== "recall") continue;
      expect(activity.start).toBe("pick-open");
      expect(activity.prompts).toBe(
        concepts.get(activity.conceptId)!.propositions.length,
      );
      if (activity.bucket === "progress")
        expect(activity.reason.code).toBe("progress-section");
    }
    expect(unit).toBeTruthy();
  });

  it("시범 목표 소단원의 문제은행 날: 선수 개념 확인 하나 → 문제 10 → 그 소단원의 새 개념, 합계는 분량을 넘지 않는다", async () => {
    // 20칸을 고른 학생(교사가 정한 값) — 서비스 기본 15칸에서는 문제 10 뒤에 개념 묶음이 하나만 든다.
    f.policy = {
      quota: 20,
      previousQuota: null,
      effectiveOn: new Date(`${TODAY}T00:00:00.000Z`),
      revision: 1,
    };
    seed(fractionStudent());
    const got = await plan(await daily());
    const practice = got.activities.find((a) => a.kind === "practice")!;
    expect(practice).toMatchObject({
      unit: "question",
      count: 10,
      state: "todo",
      start: "start",
      source: { kind: "elementary", route: "bank", unitId: "g5-fractions" },
    });
    expect(got.units.question).toEqual({ planned: 10, done: 0 });
    expect(got.counts.total).toBeLessThanOrEqual(20);
    expect(
      got.counts.total + got.shortfall.reduce((n, s) => n + s.slots, 0),
    ).toBe(20);

    // 선수: 연결도의 간선 E56-N03 → E56-N04 — 확인된 시범 매핑의 소단원의 개념 하나.
    const target = sectionKeyOfBridgeSection("5-2-2-1")!;
    const checks = [
      sectionKeyOfBridgeSection("5-1-5-4")!,
      sectionKeyOfBridgeSection("5-1-5-3")!,
    ];
    const recalls = got.activities.filter(
      (a): a is FadingDailyRecall => a.kind === "recall",
    );
    const prerequisite = recalls.filter((a) => a.bucket === "prerequisite");
    expect(prerequisite).toHaveLength(1);
    expect(prerequisite[0]).toMatchObject({
      section: checks[0],
      start: "pick-open",
      rated: false,
      reason: { code: "prerequisite-unassessed" },
    });
    // 새 진도의 개념은 오늘의 소단원 것뿐이다.
    const progress = recalls.filter((a) => a.bucket === "progress");
    expect(progress.length).toBeGreaterThan(0);
    expect(progress.every((a) => a.section === target)).toBe(true);
    // 차례: 선수 개념 → 새 개념 → 탐험의 한 덩이.
    expect(got.activities.map((a) => a.bucket + ":" + a.kind)).toEqual([
      "prerequisite:recall",
      ...progress.map(() => "progress:recall"),
      "progress:practice",
    ]);
    expect(got.next).toBe(prerequisite[0]!.key);

    // 안내: 근거는 원천마다 따로 — 어느 원천에도 기록이 없다.
    expect(got.prerequisite!.target).toMatchObject({
      courseSectionId: "5-2-2-1",
      graphUnitId: "E56-N04",
      sectionKey: target,
    });
    const mapped = got.prerequisite!.links.find((l) => l.mapping === "exact")!;
    expect(mapped.prerequisite.sectionKeys).toEqual(checks);
    expect(mapped.evidence).toEqual({
      fading: {
        status: "unassessed",
        total: mapped.conceptIds.length,
        rated: 0,
        weak: 0,
        stale: 0,
      },
      card: { status: "unknown" },
      course: { status: "unassessed" },
    });
    expect(
      got.prerequisite!.links.find((l) => l.mapping === "unmapped"),
    ).toMatchObject({
      conceptIds: [],
      evidence: { fading: { status: "unknown", total: 0 } },
    });
  });

  it("분량이 탐험의 한 덩이보다 작으면 내지 않는다 — 줄여서 내지 않는다", async () => {
    // 고를 수 있는 분량(10 · 15 · 20)으로는 이 경계에 닿지 않는다 — 학생 라우트와 같은 함수에 분량을 넘겨 본다.
    seed(fractionStudent());
    const got = serverFadingDailyPlan({
      state: stored(),
      studentId: f.studentId,
      now: NOW,
      concepts: fadingConceptMap(),
      quota: 8,
    });
    expect(got.activities.find((a) => a.kind === "practice")).toMatchObject({
      state: "blocked",
      count: 10,
      start: "none",
      reason: { code: "over-budget" },
    });
    expect(got.units.question).toEqual({ planned: 0, done: 0 });
    expect(got.counts.total).toBeLessThanOrEqual(8);
  });
});

describe("서버의 답과 서버 없이 도는 원천의 답이 같다", () => {
  it("같은 기록 · 같은 재료면 글자 그대로 같다 — 풀이를 연 뒤에도", async () => {
    seed(fractionStudent());
    const concepts = fadingConceptMap();
    const same = async (quota?: 10 | 15 | 20) => {
      f.policy =
        quota === undefined
          ? null
          : {
              quota,
              previousQuota: null,
              effectiveOn: new Date(`${TODAY}T00:00:00.000Z`),
              revision: 1,
            };
      const state = stored();
      const learning = fadingDailyLearning(state, f.studentId, NOW, concepts);
      const materials = {
        workload: fadingDailyWorkload(state, f.studentId, NOW),
        prerequisite: learning.prerequisite,
        progressSections: learning.progressSections,
      };
      const server = await plan(await daily());
      const local = createLocalFadingSource({
        concepts: fadingCatalog(),
        today: TODAY,
        fading: state.fading ?? emptyFading(),
        daily: materials,
      });
      expect(
        await local.dailyPlan(quota === undefined ? {} : { quota }),
      ).toEqual(server);
      expect(server).toEqual(
        buildFadingDailyPlan({
          today: TODAY,
          fading: state.fading ?? emptyFading(),
          concepts,
          quota,
          ...materials,
        }),
      );
      expect(server).toEqual(
        serverFadingDailyPlan({
          state,
          studentId: f.studentId,
          now: NOW,
          concepts,
          quota,
        }),
      );
      return server;
    };
    const first = await same();
    await same(20);
    // 계획이 낸 선수 개념을 지금 있는 길로 연다.
    const next = first.activities.find((a) => a.key === first.next)!;
    expect(next.kind).toBe("recall");
    const conceptId = (next as FadingDailyRecall).conceptId;
    await act({ action: "open", conceptId });
    const opened = await same();
    expect(opened.activities[0]).toMatchObject({
      key: `recall:${conceptId}`,
      state: "active",
      start: "continue",
      bucket: "prerequisite",
    });
    expect(opened.next).toBe(`recall:${conceptId}`);
  });

  it("탐험을 읽지 않게 하면 «오늘의 기억»만으로 짓는다", () => {
    const got = serverFadingDailyPlan({
      state: fractionStudent(),
      studentId: f.studentId,
      now: NOW,
      concepts: fadingConceptMap(),
      expedition: false,
    });
    expect(got.integration).toEqual({ expedition: false });
    expect(got.prerequisite).toBeNull();
    expect(got.activities).toEqual([]);
    expect(got.status).toBe("empty");
  });
});

describe("계획의 활동을 끝까지 — 일정은 한 번, 탐험의 기록은 그대로", () => {
  it("선수 개념 하나를 열어 평가까지: 같은 평가 요청을 두 번 보내도 한 번만 적용되고, 탐험의 칸은 생기지 않는다", async () => {
    seed(fractionStudent());
    const explorersBefore = structuredClone(stored().explorers);
    const courseBefore = structuredClone(stored().course);
    const first = await plan(await daily());
    const conceptId = (
      first.activities.find((a) => a.key === first.next) as FadingDailyRecall
    ).conceptId;

    let view = await act({ action: "open", conceptId });
    const sessionId = view.session!.id;
    const content = view.opened!.concept as FadingConcept;
    const traps = view.opened!.traps;
    view = await act({ action: "read", conceptId, sessionId });
    for (let step = view.session!.step; step <= 4; step++)
      view = await act({
        action: "step",
        conceptId,
        sessionId,
        step: step as 2 | 3 | 4,
        placements: placements(
          content,
          step as FadingStep,
          view.session!.seed,
          traps,
        ),
      });
    expect(view.session!.phase).toBe("rating");
    const rate: FadingAction = {
      action: "rate",
      conceptId,
      sessionId,
      rating: "good",
      requestId: uuid(9),
    };
    const once = await act(rate);
    const afterOnce = structuredClone(f.rows.get(f.studentId));
    const twice = await act(rate);
    expect(twice.receipt).toEqual(once.receipt);
    // 두 번째 요청은 아무것도 쓰지 않았다.
    expect(f.rows.get(f.studentId)).toEqual(afterOnce);
    const state = stored();
    expect(state.fading!.concepts[conceptId]).toMatchObject({
      reviews: 1,
      reviewedOn: TODAY,
    });
    expect(state.fading!.days).toEqual([
      { date: TODAY, reviews: 1, passed: 1, fresh: 1 },
    ]);
    // 🔴 탐험 · 코스의 기록은 한 글자도 바뀌지 않았다 — 개념을 떠올렸다고 칸이나 푼 문제가 생기지 않는다.
    expect(state.explorers).toEqual(explorersBefore);
    expect(state.course).toEqual(courseBefore);
    expect(state.expedition).toBeUndefined();

    const after = await plan(await daily());
    const done = after.activities.find((a) => a.key === `recall:${conceptId}`)!;
    expect(done).toMatchObject({
      state: "done",
      bucket: "prerequisite",
      done: content.propositions.length,
      start: "none",
    });
    expect(after.units.recall.done).toBe(1);
    expect(after.units.prompt.done).toBe(content.propositions.length);
    expect(after.units.question).toEqual({ planned: 10, done: 0 });
    // 그 연결의 선수 개념은 오늘 더 내지 않는다.
    expect(
      after.activities.filter(
        (a) => a.bucket === "prerequisite" && a.state !== "done",
      ),
    ).toEqual([]);
    // 근거가 바뀐 것은 그 개념 자신의 기록뿐이다.
    const mapped = after.prerequisite!.links.find(
      (l) => l.mapping === "exact",
    )!;
    expect(mapped.evidence.fading).toMatchObject({
      status: "recent",
      rated: 1,
      weak: 0,
      stale: 0,
    });
    expect(mapped.evidence.course).toEqual({ status: "unassessed" });
  });
});
