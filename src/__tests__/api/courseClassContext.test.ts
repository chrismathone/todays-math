import { beforeEach, describe, expect, it, vi } from "vitest";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
const mocks = vi.hoisted(() => ({
  owned: vi.fn(),
  inClass: vi.fn(),
  load: vi.fn(),
  detail: vi.fn(),
  change: vi.fn(),
  dto: vi.fn(),
}));
const studentId = "10000000-0000-4000-8000-000000000001";
const classId = "20000000-0000-4000-8000-000000000002";
const account = {
  id: "teacher",
  role: "director",
  isAdmin: false,
  approvalStatus: "approved",
  menus: ["srs"],
};
vi.mock("@/lib/accountAccess", () => ({
  authorizeAccount: async () => ({ account, response: null }),
}));
vi.mock("@/lib/ownership", () => ({
  requireOwnedStudent: mocks.owned,
  requireOwnedStudentInClass: mocks.inClass,
}));
vi.mock("@/lib/math-srs/courseServer", () => ({
  loadCourseStudent: mocks.load,
  loadCourseStudentDetail: mocks.detail,
  courseRosterDto: mocks.dto,
  loadCourseDashboard: vi.fn(),
}));
vi.mock("@/lib/math-srs/serverStore", () => ({
  srsStateTable: () => ({}),
  // 교사가 쓰는 길의 «거래 안에서 다시 확인하는 표» — 라우트가 이 함수로 짓는다(2026-10-06). 이 시험은 쓰기까지 가지 않는다.
  guardedSrsStateTable: () => ({}),
  changeSrsState: mocks.change,
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
import { handleCourseTeacherStudent } from "@/lib/math-srs/courseTeacherRoutes";
const row = {
  id: studentId,
  name: "같은 연동 학생",
  classId,
  className: "두 번째 반",
  classGrade: "초6",
  hasAccount: true,
  revision: 2,
  plan: null,
  summary: {
    status: "setup",
    currentSectionId: null,
    dueCount: 0,
    todayAnswered: 0,
    todayCorrect: 0,
    todayGoal: 10,
    completedSections: 0,
    lastPracticedAt: null,
    nextReviewAt: null,
    recommendation: null,
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.owned.mockResolvedValue({ ok: true, data: { classId } });
  mocks.inClass.mockResolvedValue({ ok: true, data: { classId } });
  mocks.load.mockResolvedValue(row);
  mocks.detail.mockResolvedValue({
    student: row,
    sections: [],
    activity: [],
    recentSessions: [],
    recentAttempts: [],
  });
  mocks.change.mockResolvedValue({ revision: 3, state: {} });
  mocks.dto.mockReturnValue({ ...row, revision: 3 });
});
const request = (method: string, suffix = `?classId=${classId}`) =>
  new Request(
    `http://localhost/api/students/${studentId}/math-srs/course${suffix}`,
    {
      method,
      ...(method === "POST"
        ? {
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              startSectionId: COURSE_SECTIONS[0].id,
              dailyQuestionCount: 10,
              enabled: true,
              expectedRevision: 2,
            }),
          }
        : {}),
    },
  );
const context = () => ({ params: Promise.resolve({ id: studentId }) });
describe("course enrollment authorization", () => {
  it.each([
    ["GET", "student:read"],
    ["POST", "progress:write"],
  ])("checks the specified enrollment for %s", async (method, capability) => {
    const result = await handleCourseTeacherStudent(request(method), context());
    expect(result.status).toBe(200);
    expect(mocks.inClass).toHaveBeenCalledWith(
      studentId,
      classId,
      account,
      capability,
    );
    expect(mocks.owned).not.toHaveBeenCalled();
    expect(mocks.load).toHaveBeenCalledWith(studentId, classId);
    expect(
      (await result.json()).data[method === "GET" ? "student" : "classId"],
    ).toEqual(method === "GET" ? row : classId);
  });
  it.each(["GET", "POST"])(
    "refuses foreign enrollment before reading or saving on %s",
    async (method) => {
      mocks.inClass.mockResolvedValue({
        ok: false,
        response: Response.json(
          { error: { code: "NOT_FOUND" } },
          { status: 404 },
        ),
      });
      expect(
        (await handleCourseTeacherStudent(request(method), context())).status,
      ).toBe(404);
      expect(mocks.load).not.toHaveBeenCalled();
      expect(mocks.change).not.toHaveBeenCalled();
    },
  );
  it("rejects malformed class context and preserves the authorized no-context API", async () => {
    expect(
      (
        await handleCourseTeacherStudent(
          request("GET", "?classId=foreign/path"),
          context(),
        )
      ).status,
    ).toBe(400);
    expect(mocks.inClass).not.toHaveBeenCalled();
    expect(mocks.owned).not.toHaveBeenCalled();
    expect(
      (await handleCourseTeacherStudent(request("GET", ""), context())).status,
    ).toBe(200);
    expect(mocks.owned).toHaveBeenCalledWith(
      studentId,
      account,
      "student:read",
    );
  });
});
