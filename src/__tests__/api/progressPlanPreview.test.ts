/**
 * 🔴 RED → 🟢 — **계획 미리보기 경로** `POST /api/classes/{id}/progress-plan/preview` (D-129 ④ · D-131).
 *
 * 구현: src/app/api/classes/[id]/progress-plan/preview/route.ts
 * 대응 계약: src/contracts/dailyAutoTest.contract.ts (`progressPlanPreviewResponseSchema`)
 * 브리프: docs/planning/tracks/briefs/daily-auto-test-screen.md §0 — 「저장하기 전에 결과를 본다」(시안 B)
 *
 * 무엇을 잠그나
 * 1. 🔴 **아무것도 안 쓴다** — 계획 행이 생기지도 바뀌지도 않는다.
 * 2. 🔴 **날짜 펴기는 서버 한 곳** — 같은 규칙을 저장하고 GET 으로 읽은 예정과 **똑같다**.
 *    화면이 따로 펴면 «미리보기와 저장 뒤가 다른» 카드가 된다.
 * 3. 반 진도가 있으면 그 지점부터 다시 편 예정이다(저장된 계획과 같은 규칙).
 * 4. 계약 어김·없는 차시는 422 · 세션 401 · 경로 id 400 · 없는 반 404 · 남의 반 403 — 관리자는 넘는다(D-130).
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const sessionState = vi.hoisted(() => ({ isAdmin: false }));
vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "10000000-0000-4000-8000-000000000001",
    email: "teacher@todaysmath.test",
    name: "테스트 강사",
    isAdmin: sessionState.isAdmin,
  })),
}));

import {
  GET as getClassPlan,
  PUT as putClassPlan,
} from "@/app/api/classes/[id]/progress-plan/route";
import { POST as previewClassPlan } from "@/app/api/classes/[id]/progress-plan/preview/route";
import { errorResponseSchema } from "@/contracts/common.contract";
import {
  classProgressPlanResponseSchema,
  progressPlanPreviewResponseSchema,
} from "@/contracts/dailyAutoTest.contract";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import {
  CLASS_A_ID,
  CLASS_OTHER_ID,
  MOCK_UNITS,
  NOT_FOUND_ID,
  USER_TEACHER_ID,
} from "@/mocks/data";
import { resetPrismaTestDouble } from "@/mocks/prismaTestDouble";

const U = (i: number) => MOCK_UNITS[i]!;

/** 월·수·금, 2026-09-07(월) 시작, 첫 차시부터. */
const RULE = {
  weekdays: [1, 3, 5],
  unitsPerLesson: 1,
  startUnitId: U(0).id,
  startDate: "2026-09-07",
  active: true,
};

function req(url: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body:
      body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const preview = (id: string, body: unknown, query = "?day=2026-09-16") =>
  previewClassPlan(
    req(`/api/classes/${id}/progress-plan/preview${query}`, "POST", body),
    ctx(id),
  );
const putClass = (id: string, body: unknown) =>
  putClassPlan(req(`/api/classes/${id}/progress-plan`, "PUT", body), ctx(id));
const getClass = (id: string, query = "?day=2026-09-16") =>
  getClassPlan(req(`/api/classes/${id}/progress-plan${query}`, "GET"), ctx(id));

async function freshClass(userId = USER_TEACHER_ID) {
  return db.class.create({
    data: {
      userId,
      name: "미리보기 반",
      grade: "중2",
      defaultProblemCount: 8,
      difficultyRatio: { easy: 3, mid: 4, hard: 1 },
    },
  });
}

beforeEach(() => {
  resetPrismaTestDouble();
  sessionState.isAdmin = false;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/classes/{id}/progress-plan/preview — 저장하지 않고 예정을 편다", () => {
  it("🔴 계획이 없는 반에서도 예정을 주고, **계획 행을 만들지 않는다**", async () => {
    const cls = await freshClass();
    const res = await preview(cls.id, RULE);
    expect(res.status).toBe(200);
    const body = progressPlanPreviewResponseSchema.parse(await res.json());
    expect(body.data.schedule.from).toBe("2026-09-14");
    expect(body.data.schedule.to).toBe("2026-09-27");
    expect(body.data.schedule.rows.map((r) => r.date)).toEqual([
      "2026-09-14",
      "2026-09-16",
      "2026-09-18",
      "2026-09-21",
      "2026-09-23",
      "2026-09-25",
    ]);
    expect(await db.progressPlan.findMany({})).toEqual([]);
  });

  it("🔴 저장된 계획이 있어도 **덮어쓰지 않는다** — 다른 요일로 미리 봐도 행은 그대로", async () => {
    const cls = await freshClass();
    await putClass(cls.id, RULE);
    const before = await db.progressPlan.findMany({});
    const res = await preview(cls.id, { ...RULE, weekdays: [2, 4] });
    expect(res.status).toBe(200);
    const body = progressPlanPreviewResponseSchema.parse(await res.json());
    expect(body.data.schedule.rows.map((r) => r.weekday)).toEqual([2, 4, 2, 4]);
    expect(await db.progressPlan.findMany({})).toEqual(before);
  });

  it("🔴 날짜 펴기는 서버 한 곳 — 같은 규칙을 저장하고 GET 으로 읽은 예정과 **똑같다**(반 진도 포함)", async () => {
    const cls = await freshClass();
    await db.progress.create({
      data: {
        classId: cls.id,
        unitId: U(2).id,
        recordedAt: new Date("2026-09-16T00:00:00Z"),
      },
    });
    const rule = { ...RULE, unitsPerLesson: 2 };
    const previewed = progressPlanPreviewResponseSchema.parse(
      await (await preview(cls.id, rule)).json(),
    ).data.schedule;

    await putClass(cls.id, rule);
    const saved = classProgressPlanResponseSchema.parse(
      await (await getClass(cls.id)).json(),
    ).data.schedule;

    expect(previewed).toEqual(saved);
    // 진도가 실제로 반영됐나 — 수요일 실제 차시가 실린다
    const wed = previewed.rows.find((r) => r.date === "2026-09-16")!;
    expect(wed.actual.map((u) => u.id)).toEqual([U(2).id]);
  });

  it("본문 기본값 — 차시 수·켜짐을 안 보내면 PUT 과 같은 기본(1 · 켬)으로 편다", async () => {
    const cls = await freshClass();
    const { unitsPerLesson: _u, active: _a, ...partial } = RULE;
    void _u;
    void _a;
    const res = await preview(cls.id, partial);
    expect(res.status).toBe(200);
    const { schedule } = progressPlanPreviewResponseSchema.parse(
      await res.json(),
    ).data;
    expect(schedule.rows[0]!.planned).toHaveLength(1);
  });

  it("?day= 가 없으면 오늘(KST) 주 — from 은 월요일", async () => {
    const cls = await freshClass();
    const res = await preview(cls.id, RULE, "");
    expect(res.status).toBe(200);
    const { schedule } = progressPlanPreviewResponseSchema.parse(
      await res.json(),
    ).data;
    expect(new Date(`${schedule.from}T00:00:00Z`).getUTCDay()).toBe(1);
  });

  it.each([
    ["요일 빈 배열", { ...RULE, weekdays: [] }],
    ["요일 7", { ...RULE, weekdays: [7] }],
    ["차시 수 11", { ...RULE, unitsPerLesson: 11 }],
    ["모르는 칸", { ...RULE, classId: CLASS_A_ID }],
  ])(
    "🔴 계약 어김(%s)은 422 — 서버 문구와 칸(details)을 싣는다",
    async (_, body) => {
      const cls = await freshClass();
      const res = await preview(cls.id, body);
      expect(res.status).toBe(422);
      const err = errorResponseSchema.parse(await res.json());
      expect(err.error.code).toBe("VALIDATION_ERROR");
      expect(Array.isArray(err.error.details)).toBe(true);
      expect(await db.progressPlan.findMany({})).toEqual([]);
    },
  );

  it("없는 차시는 422 (startUnitId) · ?day= 형식이 틀려도 422", async () => {
    const cls = await freshClass();
    const res = await preview(cls.id, { ...RULE, startUnitId: NOT_FOUND_ID });
    expect(res.status).toBe(422);
    const err = errorResponseSchema.parse(await res.json());
    expect(err.error.details).toEqual([
      { field: "startUnitId", message: err.error.message },
    ]);
    expect((await preview(cls.id, RULE, "?day=9월16일")).status).toBe(422);
  });

  it("세션이 없으면 401 · 경로 id 가 uuid 가 아니면 400 · 없는 반 404", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce(null);
    expect((await preview(CLASS_A_ID, RULE)).status).toBe(401);
    expect((await preview("abc", RULE)).status).toBe(400);
    expect((await preview(NOT_FOUND_ID, RULE)).status).toBe(404);
  });

  it("🔴 남의 반은 관리자가 아니면 403 — 관리자는 넘는다(D-130)", async () => {
    expect((await preview(CLASS_OTHER_ID, RULE)).status).toBe(403);
    sessionState.isAdmin = true;
    expect((await preview(CLASS_OTHER_ID, RULE)).status).toBe(200);
    expect(await db.progressPlan.findMany({})).toEqual([]);
  });
});
