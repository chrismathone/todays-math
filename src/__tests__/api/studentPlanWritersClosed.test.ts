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
import { POST as PLAN } from "@/app/api/learn/math-srs/course/plan/route";
import { GET as COURSE } from "@/app/api/learn/math-srs/course/route";
import {
  GET as EXPLORER,
  POST as ACTION,
} from "@/app/api/learn/math-explorers/route";
import { POST as TEACHER_PLAN } from "@/app/api/students/[id]/math-srs/course/route";
import { POST as ADMIN_SETTINGS } from "@/app/api/admin/students/[id]/explorer-settings/route";
import {
  emptyCourseState,
  setCoursePlan,
} from "@/lib/math-srs/courseAutomation";
import { emptySrsState } from "@/lib/math-srs/serverState";
import * as store from "@/lib/math-srs/serverStore";
import {
  applyExplorerAction,
  createExplorerState,
} from "@/lib/math-explorers/engine";
import { studentGateFor } from "@/lib/studentRouteAccess";
import {
  ids,
  world,
  req,
  params,
  studentSession,
  teacherSession,
} from "../helpers/srsTeacherWorld";

const now = new Date("2026-10-21T03:00:00Z");
const planPath = "/api/learn/math-srs/course/plan";
const explorerPath = "/api/learn/math-explorers";
const plan = {
  startSectionId: "5-2-1-1",
  dailyQuestionCount: 15 as const,
  enabled: true,
  expectedRevision: 4,
};
const actionBody = (
  type: "course" | "goal",
  studentId: string = ids.studied,
) => ({
  studentId,
  expectedRevision: 4,
  requestId: randomUUID(),
  action:
    type === "course" ? { type, grade: 4 } : { type, unitId: "g4-numbers" },
});
beforeEach(() => {
  world.reset();
  world.session = studentSession();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  let explorers = createExplorerState(ids.studied, 5);
  explorers = applyExplorerAction(
    explorers,
    { type: "goal", unitId: "g5-fractions" },
    "2026-10-21",
    randomUUID(),
  ).state;
  world.rows.set(ids.studied, {
    studentId: ids.studied,
    revision: 4,
    payload: {
      ...emptySrsState(),
      explorers,
      course: setCoursePlan(emptyCourseState(), plan, now),
    },
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("student plan writers retire at the HTTP boundary", () => {
  it.each(["plan", "course", "goal"] as const)(
    "rejects a valid legacy %s request before CAS and preserves the saved record",
    async (type) => {
      const saved = structuredClone(world.rows.get(ids.studied));
      const cas = vi.spyOn(store, "changeSrsState");
      const response =
        type === "plan"
          ? await PLAN(req(planPath, "POST", plan))
          : await ACTION(req(explorerPath, "POST", actionBody(type)));
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(cas).not.toHaveBeenCalled();
      expect(world.writes).toBe(0);
      expect(world.rows.get(ids.studied)).toEqual(saved);
    },
  );
  it("removes only the retired plan endpoint from the student allowlist", () => {
    expect(studentGateFor(false, "POST", planPath).kind).toBe("forbidden");
    expect(studentGateFor(false, "POST", explorerPath).kind).toBe("allow");
    expect(
      studentGateFor(false, "POST", "/api/learn/math-srs/course").kind,
    ).toBe("allow");
  });
  it("keeps authentication, same-origin, payload and student-identity precedence", async () => {
    const cas = vi.spyOn(store, "changeSrsState");
    world.session = null;
    expect((await PLAN(req(planPath, "POST", plan))).status).toBe(401);
    expect(
      (await ACTION(req(explorerPath, "POST", actionBody("goal")))).status,
    ).toBe(401);
    world.session = teacherSession();
    expect((await PLAN(req(planPath, "POST", plan))).status).toBe(401);
    expect(
      (await ACTION(req(explorerPath, "POST", actionBody("goal")))).status,
    ).toBe(401);
    world.session = studentSession();
    for (const [path, handler, body] of [
      [planPath, PLAN, plan],
      [explorerPath, ACTION, actionBody("course")],
    ] as const) {
      const request = req(path, "POST", body);
      request.headers.set("origin", "https://evil.example");
      const response = await handler(request);
      expect(response.status).toBe(403);
      expect((await response.json()).error).toMatchObject({
        code: "FORBIDDEN",
        message: "같은 사이트에서 요청해 주세요.",
      });
    }
    expect(
      (
        await ACTION(
          req(explorerPath, "POST", {
            ...actionBody("course"),
            action: { type: "course", grade: 99 },
          }),
        )
      ).status,
    ).toBe(400);
    const mismatch = await ACTION(
      req(explorerPath, "POST", actionBody("goal", ids.fresh)),
    );
    expect(mismatch.status).toBe(409);
    expect((await mismatch.json()).error.code).toBe("CONFLICT");
    expect(cas).not.toHaveBeenCalled();
    expect(world.writes).toBe(0);
  });
  it("reads existing explicit goals and teacher plans without changing either", async () => {
    const saved = structuredClone(world.rows.get(ids.studied));
    const course = await COURSE(req("/api/learn/math-srs/course"));
    const explorer = await EXPLORER(req(explorerPath));
    expect(course.status).toBe(200);
    expect(explorer.status).toBe(200);
    expect((await course.json()).data.plan).toMatchObject({
      startSectionId: plan.startSectionId,
      dailyQuestionCount: 15,
    });
    expect((await explorer.json()).data.profile).toMatchObject({
      courseGrade: 5,
      goalUnitId: "g5-fractions",
    });
    expect(world.writes).toBe(0);
    expect(world.rows.get(ids.studied)).toEqual(saved);
  });
  it("keeps the teacher course writer and administrator explorer writer", async () => {
    world.session = teacherSession();
    expect(
      (
        await TEACHER_PLAN(
          req(`/api/students/${ids.studied}/math-srs/course`, "POST", {
            ...plan,
            dailyQuestionCount: 20,
          }),
          params(ids.studied),
        )
      ).status,
    ).toBe(200);
    world.session = teacherSession({
      isAdmin: true,
      isSuperAdmin: true,
      branchId: null,
    });
    expect(
      (
        await ADMIN_SETTINGS(
          req(
            `/api/admin/students/${ids.studied}/explorer-settings?classId=${ids.classId}`,
            "POST",
            { expectedRevision: 5, courseGrade: 4, goalUnitId: "g4-numbers" },
          ),
          params(ids.studied),
        )
      ).status,
    ).toBe(200);
    expect(world.writes).toBe(2);
  });
});
