// @vitest-environment node
import { randomUUID } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock(
  "@/lib/auth",
  async () => (await import("../helpers/srsTeacherWorld")).authModule,
);
vi.mock(
  "@/lib/db",
  async () => (await import("../helpers/srsTeacherWorld")).dbModule,
);
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, handler: unknown) => handler,
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn(async () => undefined) }));
import {
  GET,
  POST,
} from "@/app/api/admin/students/[id]/explorer-settings/route";
import {
  GET as STUDENT,
  POST as STUDENT_ACTION,
} from "@/app/api/learn/math-explorers/route";
import { GET as ROSTER } from "@/app/api/math-srs/course/route";
import {
  GET as COURSE_DETAIL,
  POST as COURSE_PLAN,
} from "@/app/api/students/[id]/math-srs/course/route";
import { explorerSettingsResponseSchema } from "@/contracts/mathExplorerSettings.contract";
import {
  definitionUnits,
  definitionCards,
} from "@/lib/math-explorers/definition-cards";
import {
  applyExplorerAction,
  createExplorerState,
} from "@/lib/math-explorers/engine";
import { emptySrsState, parseSrsState } from "@/lib/math-srs/serverState";
import {
  emptyCourseState,
  setCoursePlan,
  startAutomaticCourse,
} from "@/lib/math-srs/courseAutomation";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { recordAudit } from "@/lib/audit";
import { teacherGate } from "@/lib/math-srs/courseTeacherRoutes";
import * as classAccess from "@/lib/classAccess";
import {
  ids,
  db,
  world,
  teacherSession,
  sameBranchAdmin,
  studentSession,
  params,
  req,
} from "../helpers/srsTeacherWorld";

const path = `/api/admin/students/${ids.studied}/explorer-settings`;
const now = new Date("2026-10-04T10:00:00Z");
const date = "2026-10-04";
const target = definitionUnits.find((unit) => unit.grade === 4)!;
const input = {
  expectedRevision: 0,
  courseGrade: target.grade,
  goalUnitId: target.id,
};
const read = (query = "") => GET(req(`${path}${query}`), params(ids.studied));
const save = (body: unknown = input, query = "") =>
  POST(req(`${path}${query}`, "POST", body), params(ids.studied));
const admin = () =>
  teacherSession({ isAdmin: true, isSuperAdmin: true, branchId: null });
beforeEach(() => {
  world.reset();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  world.session = admin();
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("admin explorer settings", () => {
  it("reads an unstarted student without writes then resumes with the saved target", async () => {
    const response = await read(`?classId=${ids.classId}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(
      explorerSettingsResponseSchema.parse(await response.json()).data,
    ).toMatchObject({ studentId: ids.studied, revision: 0, locked: false });
    expect(world.writes).toBe(0);
    expect((await save(input, `?classId=${ids.classId}`)).status).toBe(200);
    expect(world.writes).toBe(1);
    world.session = studentSession();
    const view = (
      await (await STUDENT(req("/api/learn/math-explorers"))).json()
    ).data;
    expect(view.profile).toMatchObject({
      courseGrade: 4,
      goalUnitId: target.id,
    });
    const started = await STUDENT_ACTION(
      req("/api/learn/math-explorers", "POST", {
        studentId: ids.studied,
        expectedRevision: view.revision,
        requestId: randomUUID(),
        action: { type: "expedition-start" },
      }),
    );
    expect(started.status).toBe(200);
    const resumed = (await started.json()).data;
    expect(resumed.session.unitId).toBe(target.id);
  });

  it("preserves cards, rewards, completed days and the configured SRS plan", async () => {
    const explorer = applyExplorerAction(
      createExplorerState(ids.studied),
      { type: "course", grade: 3 },
      date,
      randomUUID(),
    ).state;
    explorer.profile.stars = 12;
    explorer.profile.earned = 18;
    explorer.profile.level = 1;
    explorer.profile.definitions!.cards[definitionCards[0].id] = {
      level: 2,
      due: "2026-10-10",
      lastDate: date,
      attemptedAt: date,
      missed: 0,
    };
    explorer.completedDays = [
      {
        date: "2026-10-03",
        unitId: definitionUnits[0].id,
        sessionId: randomUUID(),
      },
    ];
    const state = {
      ...emptySrsState(),
      explorers: explorer,
      course: setCoursePlan(
        emptyCourseState(),
        {
          startSectionId: COURSE_SECTIONS[0].id,
          dailyQuestionCount: 10,
          enabled: true,
          expectedRevision: 0,
        },
        now,
      ),
    };
    world.rows.set(ids.studied, {
      studentId: ids.studied,
      revision: 5,
      payload: state,
    });
    expect((await save({ ...input, expectedRevision: 5 })).status).toBe(200);
    const saved = parseSrsState(world.rows.get(ids.studied)!.payload);
    expect(saved.course).toEqual(state.course);
    expect(saved.explorers!.profile.definitions!.cards).toEqual(
      explorer.profile.definitions!.cards,
    );
    expect(saved.explorers!.profile).toMatchObject({
      stars: 12,
      earned: 18,
      level: 1,
    });
    expect(saved.explorers!.completedDays).toEqual(explorer.completedDays);
    expect(saved.explorers!.profile.definitions!.history).toEqual(
      explorer.profile.definitions!.history,
    );
    expect(recordAudit).toHaveBeenCalledOnce();
    expect((await save({ ...input, expectedRevision: 6 })).status).toBe(200);
    expect(world.writes).toBe(1);
  });

  it("rejects stale revisions and active concept sessions with 409 without changing records", async () => {
    expect((await save({ ...input, expectedRevision: 9 })).status).toBe(409);
    const explorer = applyExplorerAction(
      createExplorerState(ids.studied),
      { type: "start", route: "unit", unitId: definitionUnits[0].id },
      date,
      randomUUID(),
    ).state;
    const state = { ...emptySrsState(), explorers: explorer };
    world.rows.set(ids.studied, {
      studentId: ids.studied,
      revision: 2,
      payload: state,
    });
    expect((await read()).status).toBe(200);
    expect((await (await read()).json()).data.locked).toBe(true);
    expect((await save({ ...input, expectedRevision: 2 })).status).toBe(409);
    expect(world.rows.get(ids.studied)!.payload).toEqual(state);
    expect(world.writes).toBe(0);
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it("rejects active course sessions and an active expedition", async () => {
    const planned = setCoursePlan(
      emptyCourseState(),
      {
        startSectionId: COURSE_SECTIONS[0].id,
        dailyQuestionCount: 10,
        enabled: true,
        expectedRevision: 0,
      },
      now,
    );
    const course = startAutomaticCourse(planned, now, 42, randomUUID);
    world.rows.set(ids.studied, {
      studentId: ids.studied,
      revision: 2,
      payload: { ...emptySrsState(), course },
    });
    expect((await save({ ...input, expectedRevision: 2 })).status).toBe(409);
    world.rows.clear();
    expect((await save()).status).toBe(200);
    world.session = studentSession();
    expect(
      (
        await STUDENT_ACTION(
          req("/api/learn/math-explorers", "POST", {
            studentId: ids.studied,
            expectedRevision: 1,
            requestId: randomUUID(),
            action: { type: "expedition-start" },
          }),
        )
      ).status,
    ).toBe(200);
    world.session = admin();
    expect((await save({ ...input, expectedRevision: 2 })).status).toBe(409);
  });

  it("requires superadmin and same-origin, validates grade-unit pairs and branch scope", async () => {
    for (const [session, status] of [
      [null, 401],
      [teacherSession(), 403],
      [sameBranchAdmin(), 403],
      [studentSession(), 401],
    ] as const) {
      world.session = session;
      expect((await save()).status).toBe(status);
      expect((await read()).status).toBe(status);
    }
    world.session = admin();
    expect((await save({ ...input, courseGrade: 9 })).status).toBe(400);
    expect((await save({ ...input, goalUnitId: "missing" })).status).toBe(400);
    expect((await read("?branchId=bad")).status).toBe(400);
    expect((await read(`?branchId=${randomUUID()}`)).status).toBe(404);
    const cross = new Request(`http://localhost:3000${path}`, {
      method: "POST",
      headers: {
        origin: "https://other.invalid",
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    });
    expect((await POST(cross, params(ids.studied))).status).toBe(403);
    expect(world.writes).toBe(0);
  });

  it("rechecks source write permission at persistence without altering the roster", async () => {
    const recheck = vi
      .spyOn(classAccess, "assertClassWrite")
      .mockRejectedValue(new classAccess.ClassAccessDenied());
    expect((await save()).status).toBe(403);
    expect(recheck).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isSuperAdmin: true }),
      ids.classId,
      "progress:write",
    );
    expect(world.writes).toBe(0);
  });

  it("accepts a matching branch but refuses a branch change during persistence", async () => {
    const cls = (await db.class.findUnique({ where: { id: ids.classId } }))!;
    const branchId = randomUUID();
    const canonical = (await db.student.findUnique({
      where: { id: ids.studied },
    }))!;
    vi.spyOn(db.student, "findUnique").mockResolvedValue({
      ...canonical,
      branchId,
    });
    const lookup = vi
      .spyOn(db.class, "findUnique")
      .mockResolvedValue({ ...cls, branchId });
    expect(
      (await read(`?branchId=${branchId}&classId=${ids.classId}`)).status,
    ).toBe(200);
    lookup
      .mockResolvedValueOnce({ ...cls, branchId })
      .mockResolvedValue({ ...cls, branchId: randomUUID() });
    expect((await save(input, `?branchId=${branchId}`)).status).toBe(403);
    expect(world.writes).toBe(0);
  });

  it("rejects a student's canonical branch mismatch even when the class matches", async () => {
    const branchId = randomUUID();
    const cls = (await db.class.findUnique({ where: { id: ids.classId } }))!;
    const canonical = (await db.student.findUnique({
      where: { id: ids.studied },
    }))!;
    vi.spyOn(db.class, "findUnique").mockResolvedValue({ ...cls, branchId });
    vi.spyOn(db.student, "findUnique").mockResolvedValue({
      ...canonical,
      branchId: randomUUID(),
    });
    expect(
      (await read(`?branchId=${branchId}&classId=${ids.classId}`)).status,
    ).toBe(404);
    expect(
      (await save(input, `?branchId=${branchId}&classId=${ids.classId}`))
        .status,
    ).toBe(404);
    const coursePath = `/api/students/${ids.studied}/math-srs/course?branchId=${branchId}&classId=${ids.classId}`;
    expect(
      (await COURSE_DETAIL(req(coursePath), params(ids.studied))).status,
    ).toBe(404);
    expect(
      (
        await COURSE_PLAN(
          req(coursePath, "POST", {
            startSectionId: COURSE_SECTIONS[0].id,
            dailyQuestionCount: 10,
            enabled: true,
            expectedRevision: 0,
          }),
          params(ids.studied),
        )
      ).status,
    ).toBe(404);
    expect(world.writes).toBe(0);
  });

  it("refuses a canonical student move after the scoped read and before the write", async () => {
    const branchId = randomUUID();
    const cls = (await db.class.findUnique({ where: { id: ids.classId } }))!;
    const canonical = (await db.student.findUnique({
      where: { id: ids.studied },
    }))!;
    vi.spyOn(db.class, "findUnique").mockResolvedValue({ ...cls, branchId });
    vi.spyOn(db.student, "findUnique")
      .mockResolvedValueOnce({ ...canonical, branchId })
      .mockResolvedValueOnce({ ...canonical, branchId })
      .mockResolvedValue({ ...canonical, branchId: randomUUID() });
    expect((await save(input, `?branchId=${branchId}`)).status).toBe(403);
    expect(world.writes).toBe(0);
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it("excludes students whose canonical branch differs from their roster class", async () => {
    const branchId = randomUUID();
    const canonical = (await db.student.findUnique({
      where: { id: ids.studied },
    }))!;
    vi.spyOn(db.class, "findMany").mockResolvedValue([
      { id: ids.classId, name: "지점 반" },
    ]);
    vi.spyOn(db.student, "findMany").mockResolvedValue([
      { ...canonical, branchId },
      { ...canonical, id: ids.noAccount, branchId: randomUUID() },
    ]);
    const response = await ROSTER(
      req(`/api/math-srs/course?branchId=${branchId}`),
    );
    expect(response.status).toBe(200);
    expect(
      (await response.json()).data.students.map(
        (student: { id: string }) => student.id,
      ),
    ).toEqual([ids.studied]);
    expect(world.writes).toBe(0);
  });

  it("allows a menu-disabled superadmin only on established SRS management paths", async () => {
    world.session = teacherSession({
      isAdmin: true,
      isSuperAdmin: true,
      branchId: null,
      menus: [],
    });
    for (const [method, route] of [
      ["GET", "/api/math-srs/course"],
      ["GET", `/api/students/${ids.studied}/math-srs/course`],
      ["POST", `/api/students/${ids.studied}/math-srs/course`],
      ["GET", `/api/students/${ids.studied}/math-srs/explorers`],
    ]) {
      expect(
        (
          await teacherGate(
            req(route, method, method === "POST" ? {} : undefined),
          )
        ).response,
      ).toBeNull();
    }
    for (const route of [
      "/api/classes",
      "/api/math-srs/course/unrelated",
      "/api/problems",
    ]) {
      expect((await teacherGate(req(route))).response?.status).toBe(403);
    }
    expect(
      (
        await teacherGate(
          req(`/api/students/${ids.studied}/math-srs/explorers`, "POST", {}),
        )
      ).response?.status,
    ).toBe(403);
  });

  it("narrows the dashboard and student course read/write to a supplied branch", async () => {
    world.session = teacherSession({
      isAdmin: true,
      isSuperAdmin: true,
      branchId: null,
      menus: [],
    });
    const branchId = randomUUID();
    const roster = await ROSTER(
      req(`/api/math-srs/course?branchId=${branchId}`),
    );
    expect(roster.status).toBe(200);
    expect((await roster.json()).data).toMatchObject({
      classes: [],
      students: [],
    });
    expect(world.classWhere).toEqual({ AND: [{}, { branchId }] });
    const coursePath = `/api/students/${ids.studied}/math-srs/course?branchId=${branchId}&classId=${ids.classId}`;
    expect(
      (await COURSE_DETAIL(req(coursePath), params(ids.studied))).status,
    ).toBe(404);
    expect(
      (
        await COURSE_PLAN(
          req(coursePath, "POST", {
            startSectionId: COURSE_SECTIONS[0].id,
            dailyQuestionCount: 10,
            enabled: true,
            expectedRevision: 0,
          }),
          params(ids.studied),
        )
      ).status,
    ).toBe(404);
    expect(world.writes).toBe(0);
  });
});
