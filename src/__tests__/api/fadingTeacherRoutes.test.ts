// @vitest-environment node
/**
 * «오늘의 기억» 교사 현황의 끝점 둘 — 읽기뿐이다(실제 은행의 개념으로 기록을 짓는다 · 은행 전체를 싣는다).
 *
 *   GET /api/math-srs/fading                  문지기 = `/api/math-srs/course` 와 같게
 *   GET /api/students/{id}/math-srs/fading    문지기 = `/api/students/{id}/math-srs/course` 와 같게
 *
 * «같게»는 짝 시험으로 잠근다 — 같은 세션을 옛 끝점과 새 끝점에 같이 넣어 상태 코드를 견준다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/lib/auth",
  async () => (await import("../helpers/srsTeacherWorld")).authModule,
);
vi.mock(
  "@/lib/db",
  async () => (await import("../helpers/srsTeacherWorld")).dbModule,
);
vi.mock("@/lib/errorLog/record", () => ({
  recordErrorLog: vi.fn(async () => undefined),
}));

import { GET as courseDashboard } from "@/app/api/math-srs/course/route";
import { GET as fadingDashboard } from "@/app/api/math-srs/fading/route";
import { GET as courseDetail } from "@/app/api/students/[id]/math-srs/course/route";
import {
  GET as fadingDetail,
  PUT as fadingQuota,
} from "@/app/api/students/[id]/math-srs/fading/route";
import type {
  FadingPlacement,
  StoredFading,
} from "@/contracts/fading.contract";
import {
  fadingTeacherDashboardResponseSchema,
  fadingTeacherQuotaResponseSchema,
  fadingTeacherStudentResponseSchema,
} from "@/contracts/fadingTeacher.contract";
import { fadingCatalog } from "@/lib/fading/catalog";
import { chipFits, chipTray } from "@/lib/fading/chips";
import type { FadingConcept } from "@/lib/fading/concepts";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import {
  completeFadingReading,
  completeFadingStep,
  emptyFading,
  openFadingSession,
  pickFadingConcept,
  rateFadingSession,
} from "@/lib/fading/state";
import { FADING_TEACHER_POLICY } from "@/lib/fading/teacher";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import { emptySrsState } from "@/lib/math-srs/serverState";
import { studentGateFor } from "@/lib/studentRouteAccess";
import {
  db as worldDb,
  ids,
  otherBranchAdmin,
  params,
  req,
  sameBranchAdmin,
  studentSession,
  teacherSession,
  world,
} from "../helpers/srsTeacherWorld";

const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const OTHER_BRANCH = uuid(777);
const readDashboard = (query = "") =>
  fadingDashboard(req(`/api/math-srs/fading${query}`));
const readStudent = (id: string = ids.studied, query = "") =>
  fadingDetail(req(`/api/students/${id}/math-srs/fading${query}`), params(id));
const dashboardData = async (response: Response) => {
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  return fadingTeacherDashboardResponseSchema.parse(await response.json()).data;
};
const studentData = async (response: Response) => {
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  return fadingTeacherStudentResponseSchema.parse(await response.json()).data;
};

function placements(c: FadingConcept, step: FadingStep): FadingPlacement[] {
  const tray = chipTray(c, step, { seed: 1 });
  const used = new Set<string>();
  return erasedTargets(c, step).map((target) => {
    const chip = tray.find(
      (x) => !used.has(x.id) && chipFits(c, target.id, x),
    )!;
    used.add(chip.id);
    return { targetId: target.id, chipId: chip.id };
  });
}
/** 개념 하나를 그날 처음 배워 «알맞음»으로 닫는다. */
function learn(state: StoredFading, c: FadingConcept, day: string, n: number) {
  state = openFadingSession(state, c, day, { sessionId: uuid(n), seed: 1 });
  state = completeFadingReading(state, c.id, uuid(n));
  for (const step of [2, 3, 4] as const)
    state = completeFadingStep(state, c, uuid(n), step, placements(c, step));
  return rateFadingSession(state, c, uuid(n), "good", day, uuid(900 + n));
}
/** 서연의 기록 — 9월 20일에 개념 넷을 배웠고(복습일 9월 23일), 하나는 골라만 두었다. */
function studiedRecord() {
  const [a, b, c, d, e] = fadingCatalog();
  let state = emptyFading();
  for (const [i, concept] of [a!, b!, c!, d!].entries())
    state = learn(state, concept, "2026-09-20", i + 1);
  return {
    fading: pickFadingConcept(state, e!.id, "2026-09-20"),
    learned: [a!, b!, c!, d!],
    picked: e!,
  };
}
function save(studentId: string, fading: StoredFading) {
  world.rows.set(studentId, {
    studentId,
    revision: 3,
    payload: { ...emptySrsState(), fading },
  });
}

beforeEach(() => {
  world.reset();
  world.session = teacherSession();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-05T03:00:00.000Z")); // 한국 10월 5일 낮
  vi.stubEnv("MATH_FADING", "on");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("문지기 — 옛 «SRS 현황» 끝점과 같다", () => {
  it("꺼져 있으면 두 길이 다 없다", async () => {
    vi.stubEnv("MATH_FADING", "off");
    expect((await readDashboard()).status).toBe(404);
    expect((await readStudent()).status).toBe(404);
    // 모르는 값은 꺼짐이다 — 오타가 문을 열지 않는다.
    vi.stubEnv("MATH_FADING", "true");
    expect((await readDashboard()).status).toBe(404);
    expect((await readStudent()).status).toBe(404);
  });

  it("«읽기만»(`read`)이면 두 길이 열린다 — 교사 현황은 새 칸을 쓰지 않는다", async () => {
    vi.stubEnv("MATH_FADING", "read");
    expect((await readDashboard()).status).toBe(200);
    expect((await readStudent()).status).toBe(200);
  });

  it("세션마다 반 현황의 상태 코드가 옛 끝점과 같다", async () => {
    const sessions: [string, unknown][] = [
      ["로그인 안 함", null],
      ["학생", studentSession()],
      ["메뉴가 수업뿐인 강사", teacherSession({ menus: ["teaching"] })],
      ["검수 계정", teacherSession({ role: "reviewer" })],
      ["승인 전", teacherSession({ approvalStatus: "pending" })],
      ["반 주인", teacherSession()],
      ["같은 지점 관리자", sameBranchAdmin()],
      // 원장님 2026-10-06: 지점장은 메뉴가 열려 있어야 열리고, 최고관리자는 무조건 열린다.
      ["메뉴가 꺼진 지점장", sameBranchAdmin({ menus: [] })],
      ["다른 지점 관리자", otherBranchAdmin()],
      [
        "메뉴가 꺼진 최고관리자",
        teacherSession({ isAdmin: true, isSuperAdmin: true, menus: [] }),
      ],
    ];
    const seen = new Set<number>();
    for (const [name, session] of sessions) {
      world.session = session;
      const fading = (await readDashboard()).status;
      const course = (await courseDashboard(req("/api/math-srs/course")))
        .status;
      expect(fading, name).toBe(course);
      seen.add(fading);
    }
    // 짝이 «둘 다 같은 한 값»으로 맞은 것이 아니다 — 열림 · 로그인 없음 · 권한 없음을 실제로 지났다.
    expect([...seen].sort()).toEqual([200, 401, 403]);
    world.session = teacherSession({ menus: ["teaching"] });
    expect((await readDashboard()).status).toBe(403);
    world.session = teacherSession({ role: "reviewer" });
    expect((await readDashboard()).status).toBe(403);
    world.session = teacherSession({
      isAdmin: true,
      isSuperAdmin: true,
      menus: [],
    });
    expect((await readDashboard()).status).toBe(200);
    expect((await readStudent()).status).toBe(200);
    world.session = sameBranchAdmin({ menus: [] });
    expect((await readDashboard()).status).toBe(403);
    expect((await readStudent()).status).toBe(403);
    world.session = sameBranchAdmin({ menus: ["srs"] });
    expect((await readDashboard()).status).toBe(200);
    expect((await readStudent()).status).toBe(200);
  });

  it("세션마다 학생 하나의 상태 코드가 옛 끝점과 같다", async () => {
    const cases: [string, unknown, string][] = [
      ["로그인 안 함", null, ids.studied],
      [
        "메뉴가 수업뿐인 강사",
        teacherSession({ menus: ["teaching"] }),
        ids.studied,
      ],
      ["반 주인", teacherSession(), ids.studied],
      ["메뉴가 SRS 뿐인 강사", teacherSession({ menus: ["srs"] }), ids.studied],
      ["같은 지점 관리자", sameBranchAdmin(), ids.studied],
      ["다른 지점 관리자", otherBranchAdmin(), ids.studied],
      ["퇴원한 학생", teacherSession(), ids.withdrawn],
      ["없는 학생", teacherSession(), uuid(404)],
      ["꼴이 어긋난 id", teacherSession(), "not-a-uuid"],
    ];
    const seen = new Set<number>();
    for (const [name, session, id] of cases) {
      world.session = session;
      const fading = (await readStudent(id)).status;
      const course = (
        await courseDetail(
          req(`/api/students/${id}/math-srs/course`),
          params(id),
        )
      ).status;
      expect(fading, name).toBe(course);
      seen.add(fading);
    }
    // 짝이 «둘 다 같은 한 값»으로 맞은 것이 아니다 — 여러 갈래를 실제로 지났다.
    expect([...seen].sort()).toEqual([200, 400, 401, 403, 404]);
  });

  it("쓰기는 없다 — 다른 메서드는 관문에서 막힌다", async () => {
    const post = await fadingDashboard(req("/api/math-srs/fading", "POST", {}));
    expect(post.status).toBe(403);
    expect(world.writes).toBe(0);
  });

  it("경로 규칙 — 두 길은 SRS 메뉴의 읽기다(수업 메뉴로는 안 열리고 쓰기는 학생 하나의 분량 저장 PUT 뿐이다)", () => {
    const teacher: AccountAccess = {
      id: "teacher",
      name: "교사",
      email: "teacher@example.test",
      role: "director",
      isAdmin: false,
      approvalStatus: "approved",
      menus: ["srs"],
    };
    for (const path of [
      "/api/math-srs/fading",
      `/api/students/${ids.studied}/math-srs/fading`,
    ]) {
      expect(accountRouteAllowed(teacher, "GET", path), path).toBe(true);
      // 학생 길은 규칙에 안 적으면 «수업» 메뉴로 열린다 — 그러면 SRS 메뉴만 있는 강사가 막힌다.
      expect(
        accountRouteAllowed({ ...teacher, menus: ["teaching"] }, "GET", path),
        path,
      ).toBe(false);
      expect(
        accountRouteAllowed(
          { ...teacher, isAdmin: true, isSuperAdmin: true, menus: [] },
          "GET",
          path,
        ),
        path,
      ).toBe(true);
      for (const method of ["POST", "PUT", "PATCH", "DELETE"])
        expect(
          accountRouteAllowed(teacher, method, path),
          `${method} ${path}`,
        ).toBe(method === "PUT" && path.startsWith("/api/students/"));
      expect(studentGateFor(false, "GET", path).kind).toBe("forbidden");
    }
    for (const path of [
      "/api/math-srs/fading/export",
      `/api/students/${ids.studied}/math-srs/fading/export`,
    ])
      expect(accountRouteAllowed(teacher, "GET", path), path).toBe(false);
  });
});

describe("반 현황", () => {
  it("명단의 학생마다 세는 값과 살펴볼 까닭이 온다 — 퇴원한 학생은 없다", async () => {
    const { fading } = studiedRecord();
    save(ids.studied, fading);
    const data = await dashboardData(await readDashboard());
    expect(data.today).toBe("2026-10-05");
    expect(data.policy).toBe(FADING_TEACHER_POLICY);
    expect(data.classes).toEqual([{ id: ids.classId, name: "중1 A" }]);
    expect(data.students.map((s) => [s.name, s.hasAccount])).toEqual([
      ["서연", true],
      ["민준", false],
      ["하린", true],
      ["다온", true],
    ]);
    const [studied, noAccount, fresh, newAccount] = data.students;
    expect(studied!.summary).toEqual({
      picked: 5,
      learned: 4,
      stepCounts: { 1: 1, 2: 0, 3: 0, 4: 4 },
      due: 4,
      overdue: 4,
      longestOverdueDays: 12,
      reviewedToday: 0,
      freshToday: 0,
      lastOn: "2026-09-20",
      idleDays: 15,
      streak: { current: 0, best: 1 },
      lapses: 0,
      // 추가 확인 대기열 · 최근 7일의 사실(2026-10-16) — 판정이 아니다. 이 학생은 대기열이 없고 9월 20일 뒤로 평가가 없다.
      relearn: {
        waiting: 0,
        failing: 0,
        fails: 0,
        checks: 0,
        sinceOn: null,
        today: { checks: 0, capped: false, stopped: 0 },
        capDays: 0,
      },
      recent: { days: 0, fresh: 0 },
      flags: ["overdue", "idle"],
    });
    expect(noAccount!.summary.flags).toEqual(["no-account"]);
    // 하린의 계정은 8월에 만들었다 · 다온의 계정은 한국 날짜로 10월 3일에 만들었다(이틀 전 — 아직 «시작 전»이 아니다).
    expect(fresh!.summary.flags).toEqual(["not-started"]);
    expect(newAccount!.summary.flags).toEqual([]);
    expect(studied).toMatchObject({
      id: ids.studied,
      classId: ids.classId,
      className: "중1 A",
    });
    expect(world.writes).toBe(0);
  });

  it("하루가 지나면 «시작 전»의 문턱을 넘는다 — 날짜는 한국 날짜로 센다", async () => {
    vi.setSystemTime(new Date("2026-10-05T15:00:00.000Z")); // 한국 10월 6일 0시
    const data = await dashboardData(await readDashboard());
    expect(data.today).toBe("2026-10-06");
    expect(data.students.at(-1)!.summary.flags).toEqual(["not-started"]);
  });

  it("문장도 답도 싣지 않는다", async () => {
    const { fading, learned } = studiedRecord();
    save(ids.studied, fading);
    const text = JSON.stringify(await (await readDashboard()).json());
    expect(text).not.toContain("pieces");
    expect(text).not.toContain("propositions");
    expect(text).not.toContain(learned[0]!.propositions[0]!.term);
  });

  it("다른 지점의 관리자에게는 빈 명단이다", async () => {
    save(ids.studied, studiedRecord().fading);
    world.session = otherBranchAdmin();
    const data = await dashboardData(await readDashboard());
    expect(data.classes).toEqual([]);
    expect(data.students).toEqual([]);
  });

  it("주소의 지점은 볼 수 있는 명단을 좁힐 뿐이다 — 꼴이 어긋나면 400", async () => {
    world.session = sameBranchAdmin({ branchId: null, isSuperAdmin: true });
    expect((await dashboardData(await readDashboard())).students.length).toBe(
      4,
    );
    const narrowed = await dashboardData(
      await readDashboard(`?branchId=${OTHER_BRANCH}`),
    );
    expect(narrowed.students).toEqual([]);
    expect(JSON.stringify(world.classWhere)).toContain(OTHER_BRANCH);
    expect((await readDashboard("?branchId=branch-1")).status).toBe(400);
  });

  it("기록의 꼴이 어긋난 학생이 있으면 503 이다 — 숫자를 지어내지 않는다", async () => {
    world.rows.set(ids.studied, {
      studentId: ids.studied,
      revision: 1,
      payload: { ...emptySrsState(), fading: { version: 1 } },
    });
    expect((await readDashboard()).status).toBe(503);
  });
});

describe("학생 하나", () => {
  it("숫자는 반 현황의 그 줄과 같고, 고른 개념의 이름과 상태가 묶음 표의 차례로 온다", async () => {
    const { fading, learned, picked } = studiedRecord();
    save(ids.studied, fading);
    const roster = await dashboardData(await readDashboard());
    const data = await studentData(await readStudent());
    expect(data.student).toEqual({
      id: ids.studied,
      name: "서연",
      classId: ids.classId,
      className: "중1 A",
      hasAccount: true,
    });
    expect(data.today).toBe("2026-10-05");
    expect(data.policy).toBe(FADING_TEACHER_POLICY);
    expect(data.summary).toEqual(roster.students[0]!.summary);
    expect(data.concepts.map((c) => c.id)).toEqual(
      [...learned, picked].map((c) => c.id),
    );
    expect(data.concepts[0]).toMatchObject({
      terms: learned[0]!.propositions.map((p) => p.term),
      step: 4,
      rated: true,
      reviews: 1,
      dueOn: "2026-09-23",
      daysUntil: -12,
    });
    expect(data.concepts.at(-1)).toMatchObject({
      id: picked.id,
      rated: false,
      dueOn: null,
    });
    expect(data.days).toEqual([
      { date: "2026-09-20", reviews: 4, passed: 4, fresh: 4 },
    ]);
    expect(world.writes).toBe(0);
  });

  it("문장도 답도 싣지 않는다", async () => {
    const { fading } = studiedRecord();
    save(ids.studied, fading);
    const text = JSON.stringify(await (await readStudent()).json());
    expect(text).not.toContain("pieces");
    expect(text).not.toContain("propositions");
    expect(text).not.toContain('"target"');
    expect(text).not.toContain('"text"');
  });

  it("기록이 없는 학생은 빈 숫자와 까닭만 온다", async () => {
    const data = await studentData(await readStudent(ids.fresh));
    expect(data.concepts).toEqual([]);
    expect(data.days).toEqual([]);
    expect(data.summary).toMatchObject({
      picked: 0,
      learned: 0,
      lastOn: null,
      flags: ["not-started"],
    });
    const none = await studentData(await readStudent(ids.noAccount));
    expect(none.student.hasAccount).toBe(false);
    expect(none.summary.flags).toEqual(["no-account"]);
  });

  it("꺼진 계정은 없는 것으로 친다 — 반 현황에서도 학생 하나에서도", async () => {
    // 시험 세계의 학생 줄을 이 시험 동안만 고친다 — 하린의 계정을 끈다.
    const row = (await worldDb.student.findUnique({
      where: { id: ids.fresh },
    }))!;
    row.studentAccount!.disabledAt = new Date("2026-09-01T00:00:00Z");
    try {
      const roster = await dashboardData(await readDashboard());
      const fresh = roster.students.find((s) => s.id === ids.fresh)!;
      expect(fresh.hasAccount).toBe(false);
      expect(fresh.summary.flags).toEqual(["no-account"]);
      const one = await studentData(await readStudent(ids.fresh));
      expect(one.student.hasAccount).toBe(false);
      expect(one.summary.flags).toEqual(["no-account"]);
    } finally {
      row.studentAccount!.disabledAt = null;
    }
  });

  it("주소의 지점이 학생의 지점과 다르면 404 다", async () => {
    world.session = sameBranchAdmin({ branchId: null, isSuperAdmin: true });
    expect((await readStudent(ids.studied)).status).toBe(200);
    expect(
      (await readStudent(ids.studied, `?branchId=${OTHER_BRANCH}`)).status,
    ).toBe(404);
    expect((await readStudent(ids.studied, "?branchId=branch-1")).status).toBe(
      400,
    );
  });
});

/* ───────── 하루 분량 손잡이(2026-10-17) ───────── */

describe("하루 분량 — PUT /api/students/{id}/math-srs/fading", () => {
  const put = (body: unknown, id: string = ids.studied, query = "") =>
    fadingQuota(
      req(`/api/students/${id}/math-srs/fading${query}`, "PUT", body),
      params(id),
    );

  it("강사는 보기만이다 — 상세에 «바꿀 수 없음»이 실리고, 저장은 403 이다", async () => {
    world.session = teacherSession();
    const detail = await studentData(await readStudent());
    expect(detail.quota).toEqual({
      today: { quota: null, slots: 15 },
      next: null,
      revision: 0,
      canEdit: false,
    });
    const response = await put({ quota: 10, expectedRevision: 0 });
    expect(response.status).toBe(403);
    expect(world.policies.size).toBe(0);
  });

  it("지점 원장은 바꾼다 — 다음 한국 날짜부터이고, 오늘 값은 그대로다", async () => {
    world.session = sameBranchAdmin();
    const response = await put({ quota: 10, expectedRevision: 0 });
    expect(response.status).toBe(200);
    expect(
      fadingTeacherQuotaResponseSchema.parse(await response.json()).data,
    ).toEqual({
      today: { quota: null, slots: 15 },
      next: { quota: 10, slots: 10, on: "2026-10-06" },
      revision: 1,
      canEdit: true,
    });
    expect(world.policies.get(ids.studied)).toMatchObject({
      quota: 10,
      previousQuota: null,
      revision: 1,
      updatedById: ids.sameBranchAdmin,
    });
    expect((await studentData(await readStudent())).quota!.next).toEqual({
      quota: 10,
      slots: 10,
      on: "2026-10-06",
    });
  });

  it("revision 이 다르면 409 이고 덮어쓰지 않는다", async () => {
    world.session = sameBranchAdmin();
    expect((await put({ quota: 10, expectedRevision: 0 })).status).toBe(200);
    const stale = await put({ quota: 20, expectedRevision: 0 });
    expect(stale.status).toBe(409);
    expect(
      ((await stale.json()) as { error: { code: string } }).error.code,
    ).toBe("CONFLICT");
    expect(world.policies.get(ids.studied)!.quota).toBe(10);
    expect((await put({ quota: 20, expectedRevision: 1 })).status).toBe(200);
    expect(world.policies.get(ids.studied)).toMatchObject({
      quota: 20,
      revision: 2,
    });
  });

  it("고를 수 없는 값은 400 · 다른 지점의 관리자는 닿지 않는다 · 읽기만 열린 문에서는 404", async () => {
    world.session = sameBranchAdmin();
    expect((await put({ quota: 12, expectedRevision: 0 })).status).toBe(400);
    world.session = otherBranchAdmin();
    expect((await put({ quota: 10, expectedRevision: 0 })).status).not.toBe(
      200,
    );
    world.session = sameBranchAdmin();
    vi.stubEnv("MATH_FADING", "read");
    expect((await put({ quota: 10, expectedRevision: 0 })).status).toBe(404);
    expect(world.policies.size).toBe(0);
  });

  it("최근 7일 중 3일 상한에 닿았고 남은 확인이 있으면 명단에 «분량 점검 필요»", async () => {
    const { fading, learned } = studiedRecord();
    const at = Date.parse("2026-10-05T03:00:00.000Z");
    save(ids.studied, {
      ...fading,
      relearn: {
        version: 1,
        items: [
          {
            conceptId: learned[0]!.id,
            propositionId: learned[0]!.propositions[0]!.id,
            digest: "0a0b0c0d",
            stage: "retry",
            dueAt: at + 60_000,
            origin: "missed",
            since: at,
            fails: 1,
            checks: 0,
          },
        ],
        seen: [],
        graded: [],
        day: null,
      },
    });
    world.capDays = [
      `${ids.studied}|2026-10-05`,
      `${ids.studied}|2026-10-03`,
      `${ids.studied}|2026-09-20`,
    ];
    const flagsOf = async () =>
      (await dashboardData(await readDashboard())).students.find(
        (row) => row.id === ids.studied,
      )!.summary;
    expect((await flagsOf()).flags).not.toContain("quota-check");
    world.capDays.push(`${ids.studied}|2026-09-29`);
    const summary = await flagsOf();
    expect(summary.relearn!.capDays).toBe(3);
    expect(summary.flags).toContain("quota-check");
  });
});
