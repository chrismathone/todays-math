/**
 * 🔴 RED → 🟢 — **진도 계획 쓰기·읽기 API** (매일 자동 출제 ④의 뒷단, D-129 · D-130).
 *
 * 구현: src/app/api/classes/[id]/progress-plan/route.ts (반 계획)
 *       src/app/api/students/[id]/progress-plan/route.ts (학생 계획)
 *       src/app/api/classes/route.ts POST (반을 만들 때 계획을 같이)
 * 대응 계약: src/contracts/dailyAutoTest.contract.ts · src/contracts/class.contract.ts
 * 브리프: docs/planning/tracks/briefs/daily-auto-test-plan-api.md
 *
 * 무엇을 잠그나
 * 1. 계약 어김(요일 빈 배열 · 7/8 · 차시 수 0/11 · 없는 차시)은 **422** — 그리고 **아무것도 안 쓴다.**
 * 2. 남의 반·학생은 **404/403**(지금 관례) — 관리자는 넘는다(D-130 ⑵). 두 쪽을 같은 픽스처로 나란히.
 * 3. 🔴 **반 계획은 반에 한 줄** — 둘째 PUT 은 **덮어쓴다**(같은 id, 행은 하나). 학생 계획은 세지 않는다.
 * 4. 학생 계획은 **개별 진도 학생만**(`useIndividualProgress`) — 아니면 422.
 * 5. 「이번 주 예정」이 실제 진도가 들어오면 그 지점부터 다시 편다(배선 — 규칙은 planSchedule.test).
 * 6. 반 만들기는 계획을 **같이** 받되, 계획 없이도 지금처럼 만들어진다. 계획이 틀리면 반도 안 생긴다.
 *
 * ## 🔴 이 시험이 못 보는 것
 * 실제 Postgres 의 부분 unique(`progress_plan_class_only_key`)·CHECK·FK 는 인메모리 가짜가 **흉내**만 낸다
 * (`prismaTestDouble.progressPlan`). 로컬 DB 가 없어(메모리 `no-docker-local-db`) 실DB 로 못 돌렸다.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "10000000-0000-4000-8000-000000000001",
    email: "teacher@todaysmath.test",
    name: "테스트 강사",
  })),
}));
// 관리자 여부(D-130) — 세션의 isAdmin. 기본은 관리자 아님.
vi.mock("@/lib/accountAccess", () => ({
  getAccountAccess: vi.fn(async () => null),
}));

import { POST as createClass } from "@/app/api/classes/route";
import {
  DELETE as deleteClassPlan,
  GET as getClassPlan,
  PATCH as patchClassPlan,
  PUT as putClassPlan,
} from "@/app/api/classes/[id]/progress-plan/route";
import {
  DELETE as deleteStudentPlan,
  GET as getStudentPlan,
  PATCH as patchStudentPlan,
  PUT as putStudentPlan,
} from "@/app/api/students/[id]/progress-plan/route";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import { classResponseSchema } from "@/contracts/class.contract";
import { errorResponseSchema } from "@/contracts/common.contract";
import {
  classProgressPlanResponseSchema,
  progressPlanResponseSchema,
  studentProgressPlanResponseSchema,
} from "@/contracts/dailyAutoTest.contract";
import { getAccountAccess } from "@/lib/accountAccess";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import {
  CLASS_A_ID,
  CLASS_OTHER_ID,
  MOCK_UNITS,
  NOT_FOUND_ID,
  STUDENT_IDS,
  USER_OTHER_ID,
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

const classUrl = (id: string, query = "") =>
  `/api/classes/${id}/progress-plan${query}`;
const studentUrl = (id: string, query = "") =>
  `/api/students/${id}/progress-plan${query}`;

const putClass = (id: string, body: unknown) =>
  putClassPlan(req(classUrl(id), "PUT", body), ctx(id));
const patchClass = (id: string, body: unknown) =>
  patchClassPlan(req(classUrl(id), "PATCH", body), ctx(id));
const getClass = (id: string, query = "") =>
  getClassPlan(req(classUrl(id, query), "GET"), ctx(id));
const delClass = (id: string) =>
  deleteClassPlan(req(classUrl(id), "DELETE"), ctx(id));

const putStudent = (id: string, body: unknown) =>
  putStudentPlan(req(studentUrl(id), "PUT", body), ctx(id));
const patchStudent = (id: string, body: unknown) =>
  patchStudentPlan(req(studentUrl(id), "PATCH", body), ctx(id));
const getStudent = (id: string, query = "") =>
  getStudentPlan(req(studentUrl(id, query), "GET"), ctx(id));
const delStudent = (id: string) =>
  deleteStudentPlan(req(studentUrl(id), "DELETE"), ctx(id));

const allPlans = () => db.progressPlan.findMany({});

const ADMIN: AccountAccess = {
  id: USER_TEACHER_ID,
  name: "테스트 강사",
  email: "teacher@todaysmath.test",
  role: "director",
  isAdmin: true,
  approvalStatus: "approved",
  menus: [],
};
const asAdmin = () => vi.mocked(getAccountAccess).mockResolvedValue(ADMIN);

/** 진도 기록이 한 줄도 없는 새 반 — 시드 반은 진도가 있어 「예정」이 흔들린다. */
async function freshClass(userId = USER_TEACHER_ID) {
  return db.class.create({
    data: {
      userId,
      name: "계획 반",
      grade: "중2",
      defaultProblemCount: 8,
      difficultyRatio: { easy: 3, mid: 4, hard: 1 },
    },
  });
}

async function individualStudent(classId: string, individual = true) {
  const s = await db.student.create({ data: { classId, name: "개별 학생" } });
  if (individual)
    await db.student.update({
      where: { id: s.id },
      data: { useIndividualProgress: true },
    });
  return s;
}

beforeEach(() => {
  resetPrismaTestDouble();
  vi.mocked(getAccountAccess).mockReset();
  vi.mocked(getAccountAccess).mockResolvedValue(null);
});
afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────
// 반 계획
// ─────────────────────────────────────────────

describe("PUT /api/classes/{id}/progress-plan — 반 계획 넣기·바꾸기", () => {
  it("처음 넣으면 201 · 반 계획(studentId null) · 차시 수·켜짐은 기본값(1 · 켬)", async () => {
    const res = await putClass(CLASS_A_ID, {
      weekdays: [2, 4],
      startUnitId: U(2).id,
      startDate: "2026-09-15",
    });
    expect(res.status).toBe(201);
    const body = progressPlanResponseSchema.parse(await res.json());
    expect(body.data).toMatchObject({
      classId: CLASS_A_ID,
      studentId: null,
      weekdays: [2, 4],
      unitsPerLesson: 1,
      startUnitId: U(2).id,
      startDate: "2026-09-15",
      active: true,
    });
  });

  it("🔴 둘째 PUT 은 **덮어쓴다** — 같은 id, 반 계획 행은 하나", async () => {
    const first = progressPlanResponseSchema.parse(
      await (await putClass(CLASS_A_ID, RULE)).json(),
    );
    const res = await putClass(CLASS_A_ID, {
      ...RULE,
      weekdays: [6],
      unitsPerLesson: 3,
    });
    expect(res.status).toBe(200);
    const second = progressPlanResponseSchema.parse(await res.json());
    expect(second.data.id).toBe(first.data.id);
    expect(second.data.weekdays).toEqual([6]);
    expect(second.data.unitsPerLesson).toBe(3);
    const rows = await db.progressPlan.findMany({
      where: { classId: CLASS_A_ID, studentId: null },
    });
    expect(rows).toHaveLength(1);
  });

  it("🔴 동시에 두 요청이 «없음»을 봤다 — unique 에 막힌 쪽은 **덮어쓴다**(200 · 한 줄)", async () => {
    const first = progressPlanResponseSchema.parse(
      await (await putClass(CLASS_A_ID, RULE)).json(),
    );
    // 둘째 요청이 첫째의 커밋 전에 찾아본 것처럼 — 찾기만 한 번 «없음»
    vi.spyOn(db.progressPlan, "findFirst").mockResolvedValueOnce(null);
    const res = await putClass(CLASS_A_ID, { ...RULE, weekdays: [2] });
    expect(res.status).toBe(200);
    const body = progressPlanResponseSchema.parse(await res.json());
    expect(body.data.id).toBe(first.data.id);
    expect(body.data.weekdays).toEqual([2]);
    expect(await allPlans()).toHaveLength(1);
  });

  it("요일은 겹침 없이 차례대로 저장한다 — 같은 규칙이 두 모양이 되지 않게", async () => {
    const body = progressPlanResponseSchema.parse(
      await (
        await putClass(CLASS_A_ID, { ...RULE, weekdays: [5, 1, 5, 3] })
      ).json(),
    );
    expect(body.data.weekdays).toEqual([1, 3, 5]);
  });

  it("같은 반에 학생 계획이 있어도 반 계획은 따로 선다 — 학생 계획은 건드리지 않는다", async () => {
    const s = await individualStudent(CLASS_A_ID);
    expect((await putStudent(s.id, RULE)).status).toBe(201);
    expect(
      (await putClass(CLASS_A_ID, { ...RULE, weekdays: [2] })).status,
    ).toBe(201);
    const rows = await allPlans();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.studentId === s.id)!.weekdays).toEqual([1, 3, 5]);
  });

  it.each([
    ["요일 빈 배열", { weekdays: [] }, "weekdays"],
    ["요일 7", { weekdays: [1, 7] }, "weekdays.1"],
    ["요일 8", { weekdays: [8] }, "weekdays.0"],
    ["요일 -1", { weekdays: [-1] }, "weekdays.0"],
    ["차시 수 0", { unitsPerLesson: 0 }, "unitsPerLesson"],
    ["차시 수 11", { unitsPerLesson: 11 }, "unitsPerLesson"],
    ["차시 수 1.5", { unitsPerLesson: 1.5 }, "unitsPerLesson"],
    ["시작일 형식", { startDate: "2026-9-7" }, "startDate"],
    ["모르는 칸", { extra: true }, "(root)"],
  ])(
    "🔴 계약 어김(%s)은 422 — 아무것도 안 쓴다",
    async (_label, over, field) => {
      const res = await putClass(CLASS_A_ID, { ...RULE, ...over });
      expect(res.status).toBe(422);
      const body = errorResponseSchema.parse(await res.json());
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(
        (body.error.details as { field: string }[]).map((d) => d.field),
      ).toContain(field);
      expect(await allPlans()).toEqual([]);
    },
  );

  it("🔴 없는 차시 id 는 422 (startUnitId) — 아무것도 안 쓴다", async () => {
    const res = await putClass(CLASS_A_ID, {
      ...RULE,
      startUnitId: NOT_FOUND_ID,
    });
    expect(res.status).toBe(422);
    const body = errorResponseSchema.parse(await res.json());
    expect(
      (body.error.details as { field: string }[]).map((d) => d.field),
    ).toEqual(["startUnitId"]);
    expect(await allPlans()).toEqual([]);
  });

  it("JSON 이 아니면 422", async () => {
    const res = await putClass(CLASS_A_ID, "{not json");
    expect(res.status).toBe(422);
  });

  it("세션이 없으면 401", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce(null);
    expect((await putClass(CLASS_A_ID, RULE)).status).toBe(401);
  });

  it("없는 반은 404 · 경로 id 가 uuid 가 아니면 400", async () => {
    expect((await putClass(NOT_FOUND_ID, RULE)).status).toBe(404);
    expect((await putClass("abc", RULE)).status).toBe(400);
  });
});

describe("반 계획 — 🔴 소유 범위 (D-130: 관리자만 넘는다)", () => {
  it("관리자가 아니면 남의 반은 403 — 읽기·넣기·고치기·지우기 모두, 아무것도 안 쓴다", async () => {
    await db.progressPlan.create({
      data: {
        ...RULE,
        startDate: new Date("2026-09-07"),
        classId: CLASS_OTHER_ID,
      },
    });
    const before = await allPlans();
    expect((await getClass(CLASS_OTHER_ID)).status).toBe(403);
    expect(
      (await putClass(CLASS_OTHER_ID, { ...RULE, weekdays: [0] })).status,
    ).toBe(403);
    expect((await patchClass(CLASS_OTHER_ID, { active: false })).status).toBe(
      403,
    );
    expect((await delClass(CLASS_OTHER_ID)).status).toBe(403);
    expect(await allPlans()).toEqual(before);
  });

  it("관리자는 남의 반 계획을 읽고 넣고 고치고 지운다", async () => {
    asAdmin();
    expect((await putClass(CLASS_OTHER_ID, RULE)).status).toBe(201);
    const got = classProgressPlanResponseSchema.parse(
      await (await getClass(CLASS_OTHER_ID)).json(),
    );
    expect(got.data.plan?.classId).toBe(CLASS_OTHER_ID);
    expect((await patchClass(CLASS_OTHER_ID, { active: false })).status).toBe(
      200,
    );
    expect((await delClass(CLASS_OTHER_ID)).status).toBe(200);
    expect(await allPlans()).toEqual([]);
  });

  it("관리자 확인은 **남의 반일 때만** 한다 — 자기 반에서는 세션을 다시 묻지 않는다", async () => {
    expect((await putClass(CLASS_A_ID, RULE)).status).toBe(201);
    expect(getAccountAccess).not.toHaveBeenCalled();
  });

  it("관리자 세션이 다른 계정의 것이면 넘지 않는다", async () => {
    vi.mocked(getAccountAccess).mockResolvedValue({
      ...ADMIN,
      id: USER_OTHER_ID,
    });
    expect((await putClass(CLASS_OTHER_ID, RULE)).status).toBe(403);
  });
});

describe("PATCH /api/classes/{id}/progress-plan — 켜기·끄기 · 일부 고치기", () => {
  beforeEach(async () => {
    expect((await putClass(CLASS_A_ID, RULE)).status).toBe(201);
  });

  it("active 만 끄면 나머지는 그대로", async () => {
    const res = await patchClass(CLASS_A_ID, { active: false });
    expect(res.status).toBe(200);
    const body = progressPlanResponseSchema.parse(await res.json());
    expect(body.data).toMatchObject({ ...RULE, active: false });
  });

  it("요일·차시 수를 고칠 수 있다", async () => {
    const body = progressPlanResponseSchema.parse(
      await (
        await patchClass(CLASS_A_ID, { weekdays: [2, 4], unitsPerLesson: 2 })
      ).json(),
    );
    expect(body.data.weekdays).toEqual([2, 4]);
    expect(body.data.unitsPerLesson).toBe(2);
  });

  it.each([
    ["빈 본문", {}],
    ["요일 빈 배열", { weekdays: [] }],
    ["차시 수 11", { unitsPerLesson: 11 }],
    ["없는 차시", { startUnitId: NOT_FOUND_ID }],
    ["모르는 칸", { studentId: STUDENT_IDS[0] }],
  ])("🔴 %s 는 422 — 계획은 그대로", async (_label, body) => {
    const before = await allPlans();
    expect((await patchClass(CLASS_A_ID, body)).status).toBe(422);
    expect(await allPlans()).toEqual(before);
  });

  it("계획이 없는 반을 고치면 404", async () => {
    const cls = await freshClass();
    expect((await patchClass(cls.id, { active: false })).status).toBe(404);
  });
});

describe("DELETE /api/classes/{id}/progress-plan — 지우면 그 반은 자동에서 빠진다", () => {
  it("반 계획만 지운다 — 같은 반 학생 계획은 남는다 · 두 번째는 404", async () => {
    const s = await individualStudent(CLASS_A_ID);
    await putStudent(s.id, RULE);
    const created = progressPlanResponseSchema.parse(
      await (await putClass(CLASS_A_ID, RULE)).json(),
    );
    const res = await delClass(CLASS_A_ID);
    expect(res.status).toBe(200);
    expect((await res.json()).data.id).toBe(created.data.id);
    const rows = await allPlans();
    expect(rows.map((r) => r.studentId)).toEqual([s.id]);
    expect((await delClass(CLASS_A_ID)).status).toBe(404);
  });
});

describe("GET /api/classes/{id}/progress-plan — 계획 · 이번 주 예정 · 학생 계획들", () => {
  it("계획이 없으면 plan·schedule 가 null", async () => {
    const cls = await freshClass();
    const body = classProgressPlanResponseSchema.parse(
      await (await getClass(cls.id, "?day=2026-09-16")).json(),
    );
    expect(body.data).toEqual({ plan: null, schedule: null, studentPlans: [] });
  });

  it("예정은 이번 주 월요일 ~ 다음 주 일요일, 수업일마다 차시 **이름**을 싣는다", async () => {
    const cls = await freshClass();
    await putClass(cls.id, RULE);
    const res = await getClass(cls.id, "?day=2026-09-16");
    expect(res.status).toBe(200);
    const { schedule } = classProgressPlanResponseSchema.parse(
      await res.json(),
    ).data;
    expect(schedule!.from).toBe("2026-09-14");
    expect(schedule!.to).toBe("2026-09-27");
    expect(schedule!.rows.map((r) => r.date)).toEqual([
      "2026-09-14",
      "2026-09-16",
      "2026-09-18",
      "2026-09-21",
      "2026-09-23",
      "2026-09-25",
    ]);
    const mon = schedule!.rows[0]!;
    expect(mon.planned).toEqual([
      {
        id: U(3).id,
        grade: U(3).grade,
        chapter: U(3).chapter,
        section: U(3).section,
      },
    ]);
    expect(mon.actual).toEqual([]);
    expect(mon.driftDays).toBe(0);
  });

  it("🔴 실제 진도가 들어오면 **그 지점부터** 다시 편다 — 반 진도로", async () => {
    const cls = await freshClass();
    await putClass(cls.id, RULE);
    const plannedOn = async (date: string) => {
      const body = classProgressPlanResponseSchema.parse(
        await (await getClass(cls.id, "?day=2026-09-16")).json(),
      );
      return body.data.schedule!.rows.find((r) => r.date === date)!;
    };
    expect((await plannedOn("2026-09-18")).planned[0]!.id).toBe(U(5).id);

    await db.progress.create({
      data: {
        classId: cls.id,
        unitId: U(2).id,
        recordedAt: new Date("2026-09-16T00:00:00Z"),
      },
    });
    const wed = await plannedOn("2026-09-16");
    expect(wed.planned[0]!.id).toBe(U(4).id);
    expect(wed.actual.map((u) => u.id)).toEqual([U(2).id]);
    expect(wed.driftDays).toBe(-5);
    expect((await plannedOn("2026-09-18")).planned[0]!.id).toBe(U(3).id);
  });

  it("반 계획의 예정은 **학생 개별 진도**를 안 본다", async () => {
    const cls = await freshClass();
    const s = await individualStudent(cls.id);
    await putClass(cls.id, RULE);
    await db.progress.create({
      data: {
        classId: cls.id,
        studentId: s.id,
        unitId: U(8).id,
        recordedAt: new Date("2026-09-14T00:00:00Z"),
      },
    });
    const body = classProgressPlanResponseSchema.parse(
      await (await getClass(cls.id, "?day=2026-09-16")).json(),
    );
    expect(body.data.schedule!.rows[1]!.planned[0]!.id).toBe(U(4).id);
  });

  it("학생 계획들을 같이 준다 — 화면이 누가 반 계획을 덮는지 안다 (반 계획은 섞지 않는다)", async () => {
    const cls = await freshClass();
    const s = await individualStudent(cls.id);
    await putStudent(s.id, { ...RULE, weekdays: [6] });
    const onlyStudent = classProgressPlanResponseSchema.parse(
      await (await getClass(cls.id, "?day=2026-09-16")).json(),
    );
    expect(onlyStudent.data.plan).toBeNull();
    expect(onlyStudent.data.schedule).toBeNull();

    await putClass(cls.id, RULE);
    const body = classProgressPlanResponseSchema.parse(
      await (await getClass(cls.id, "?day=2026-09-16")).json(),
    );
    expect(body.data.plan?.studentId).toBeNull();
    expect(
      body.data.studentPlans.map((p) => [p.studentId, p.weekdays]),
    ).toEqual([[s.id, [6]]]);
  });

  it("day 가 날짜가 아니면 422", async () => {
    expect((await getClass(CLASS_A_ID, "?day=tomorrow")).status).toBe(422);
  });
});

// ─────────────────────────────────────────────
// 학생 계획
// ─────────────────────────────────────────────

describe("/api/students/{id}/progress-plan — 🔴 개별 진도 학생만 반 계획을 덮는다", () => {
  it("개별 진도 학생에게 넣으면 201 · classId 는 그 학생의 반", async () => {
    const s = await individualStudent(CLASS_A_ID);
    const res = await putStudent(s.id, RULE);
    expect(res.status).toBe(201);
    const body = progressPlanResponseSchema.parse(await res.json());
    expect(body.data.classId).toBe(CLASS_A_ID);
    expect(body.data.studentId).toBe(s.id);
  });

  it("🔴 개별 진도가 아닌 학생에게는 422 — 아무것도 안 쓴다 (넣기·고치기 둘 다)", async () => {
    const s = await individualStudent(CLASS_A_ID, false);
    const res = await putStudent(s.id, RULE);
    expect(res.status).toBe(422);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "VALIDATION_ERROR",
    );
    expect(await allPlans()).toEqual([]);
  });

  it("개별 진도를 끈 뒤에는 고칠 수 없고, 지울 수는 있다(정리)", async () => {
    const s = await individualStudent(CLASS_A_ID);
    await putStudent(s.id, RULE);
    await db.student.update({
      where: { id: s.id },
      data: { useIndividualProgress: false },
    });
    expect((await patchStudent(s.id, { active: false })).status).toBe(422);
    expect((await delStudent(s.id)).status).toBe(200);
    expect(await allPlans()).toEqual([]);
  });

  it("둘째 PUT 은 덮어쓴다 — 학생 계획도 한 줄", async () => {
    const s = await individualStudent(CLASS_A_ID);
    const first = progressPlanResponseSchema.parse(
      await (await putStudent(s.id, RULE)).json(),
    );
    const res = await putStudent(s.id, { ...RULE, weekdays: [0] });
    expect(res.status).toBe(200);
    expect(progressPlanResponseSchema.parse(await res.json()).data.id).toBe(
      first.data.id,
    );
    expect(await allPlans()).toHaveLength(1);
  });

  it("학생 계획을 지워도 반 계획은 남는다", async () => {
    const s = await individualStudent(CLASS_A_ID);
    await putClass(CLASS_A_ID, RULE);
    await putStudent(s.id, RULE);
    expect((await delStudent(s.id)).status).toBe(200);
    expect((await allPlans()).map((r) => r.studentId)).toEqual([null]);
    expect((await delStudent(s.id)).status).toBe(404);
  });

  it("계약 어김·없는 차시는 422", async () => {
    const s = await individualStudent(CLASS_A_ID);
    expect((await putStudent(s.id, { ...RULE, weekdays: [] })).status).toBe(
      422,
    );
    expect(
      (await putStudent(s.id, { ...RULE, startUnitId: NOT_FOUND_ID })).status,
    ).toBe(422);
    expect(await allPlans()).toEqual([]);
    await putStudent(s.id, RULE);
    const before = await allPlans();
    expect((await patchStudent(s.id, { unitsPerLesson: 0 })).status).toBe(422);
    expect(
      (await patchStudent(s.id, { startUnitId: NOT_FOUND_ID })).status,
    ).toBe(422);
    expect(await allPlans()).toEqual(before);
  });

  it("없는 학생 404 · 남의 반 학생 403(관리자가 아니면) · 관리자는 넘는다", async () => {
    const other = await individualStudent(CLASS_OTHER_ID);
    expect((await putStudent(NOT_FOUND_ID, RULE)).status).toBe(404);
    expect((await getStudent(other.id)).status).toBe(403);
    expect((await putStudent(other.id, RULE)).status).toBe(403);
    expect(await allPlans()).toEqual([]);

    asAdmin();
    expect((await putStudent(other.id, RULE)).status).toBe(201);
    expect((await patchStudent(other.id, { active: false })).status).toBe(200);
    expect((await getStudent(other.id)).status).toBe(200);
    expect((await delStudent(other.id)).status).toBe(200);
  });

  it("GET — 학생 계획 · 지금 쓰이나 · 그 학생의 개별 진도로 편 예정", async () => {
    const cls = await freshClass();
    const s = await individualStudent(cls.id);
    await putStudent(s.id, RULE);
    await db.progress.create({
      data: {
        classId: cls.id,
        studentId: s.id,
        unitId: U(5).id,
        recordedAt: new Date("2026-09-14T00:00:00Z"),
      },
    });
    const body = studentProgressPlanResponseSchema.parse(
      await (await getStudent(s.id, "?day=2026-09-16")).json(),
    );
    expect(body.data.plan?.studentId).toBe(s.id);
    expect(body.data.inEffect).toBe(true);
    expect(body.data.schedule!.rows[1]!.planned[0]!.id).toBe(U(6).id);
  });

  it("GET — 개별 진도가 아니면 inEffect 거짓 · 예정 없음(반 계획이 쓰인다)", async () => {
    const s = await individualStudent(CLASS_A_ID);
    await putStudent(s.id, RULE);
    await db.student.update({
      where: { id: s.id },
      data: { useIndividualProgress: false },
    });
    const body = studentProgressPlanResponseSchema.parse(
      await (await getStudent(s.id, "?day=2026-09-16")).json(),
    );
    expect(body.data.inEffect).toBe(false);
    expect(body.data.schedule).toBeNull();
  });

  it("GET — 학생 계획이 없으면 plan·schedule 가 null", async () => {
    const s = await individualStudent(CLASS_A_ID);
    const body = studentProgressPlanResponseSchema.parse(
      await (await getStudent(s.id, "?day=2026-09-16")).json(),
    );
    expect(body.data).toEqual({ plan: null, inEffect: false, schedule: null });
  });
});

// ─────────────────────────────────────────────
// 반을 만들 때 같이
// ─────────────────────────────────────────────

describe("POST /api/classes — 반을 만들 때 계획을 **같이** 받는다", () => {
  const classBody = { name: "새 반", grade: "중2" };
  const post = (body: unknown) =>
    createClass(req("/api/classes", "POST", body));
  const classCount = async () => (await db.class.findMany({})).length;

  it("계획 없이도 지금처럼 만들어진다 — 응답 모양도 그대로", async () => {
    const res = await post(classBody);
    expect(res.status).toBe(201);
    classResponseSchema.parse(await res.json());
    expect(await allPlans()).toEqual([]);
  });

  it("계획을 같이 주면 반과 반 계획이 함께 선다 — 응답은 지금 반 모양 그대로", async () => {
    const res = await post({
      ...classBody,
      progressPlan: {
        weekdays: [1, 4],
        startUnitId: U(1).id,
        startDate: "2026-09-21",
      },
    });
    expect(res.status).toBe(201);
    const created = classResponseSchema.parse(await res.json());
    const rows = await allPlans();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      classId: created.data.id,
      studentId: null,
      weekdays: [1, 4],
      unitsPerLesson: 1,
      startUnitId: U(1).id,
      active: true,
    });
  });

  it("🔴 계획이 계약을 어기면 422 — **반도 안 만들어진다**", async () => {
    const before = await classCount();
    const res = await post({
      ...classBody,
      progressPlan: { ...RULE, weekdays: [] },
    });
    expect(res.status).toBe(422);
    const body = errorResponseSchema.parse(await res.json());
    expect(
      (body.error.details as { field: string }[]).map((d) => d.field),
    ).toContain("progressPlan.weekdays");
    expect(await classCount()).toBe(before);
    expect(await allPlans()).toEqual([]);
  });

  it("🔴 계획의 시작 차시가 없으면 422 — 반도 안 만들어진다", async () => {
    const before = await classCount();
    const res = await post({
      ...classBody,
      progressPlan: { ...RULE, startUnitId: NOT_FOUND_ID },
    });
    expect(res.status).toBe(422);
    expect(await classCount()).toBe(before);
    expect(await allPlans()).toEqual([]);
  });

  it("반 칸이 틀리면 지금처럼 400 (계획이 같이 틀려도)", async () => {
    expect((await post({ grade: "중2" })).status).toBe(400);
    expect(
      (await post({ grade: "중2", progressPlan: { weekdays: [] } })).status,
    ).toBe(400);
  });
});
