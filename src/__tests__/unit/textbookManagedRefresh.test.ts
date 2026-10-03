// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({
  account: vi.fn(),
  studentGate: vi.fn(),
  student: vi.fn(),
  refreshTeacher: vi.fn(),
  refreshStudent: vi.fn(),
  query: vi.fn(),
  run: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/accountAccess", () => ({
  authorizeAccount: f.account,
  sameOriginMutation: () => true,
}));
vi.mock("@/lib/learn/studentRequest", () => ({
  requireStudent: f.studentGate,
}));
vi.mock("@/lib/math-srs/courseServer", () => ({
  loadCourseStudent: f.student,
}));
vi.mock("@/lib/textbook/server/prismaSql", () => ({
  textbookDb: {
    query: f.query,
    execute: vi.fn(),
    refreshTeacherScope: f.refreshTeacher,
    refreshStudentScope: f.refreshStudent,
  },
}));
vi.mock("@/lib/textbook/studentRead", () => ({}));
vi.mock("@/lib/textbook/studentAttempts", () => ({}));
vi.mock("@/lib/textbook/studentReview", () => ({}));
vi.mock("@/lib/textbook/studentAccess", () => ({}));

import { authorizeTextbook } from "@/lib/textbook/server/authorize";
import { studentTextbookRoute } from "@/lib/textbook/studentRoutes";

const teacherId = "11111111-1111-4111-8111-111111111111";
const studentId = "22222222-2222-4222-8222-222222222222";
const accountId = "33333333-3333-4333-8333-333333333333";
const request = (method = "GET") =>
  new Request("https://example.test/api/learn/textbook", { method });

beforeEach(() => {
  vi.resetAllMocks();
  f.account.mockResolvedValue({
    account: { id: teacherId, menus: ["textbook"], isAdmin: false },
    response: null,
  });
  f.query.mockResolvedValue([
    { name: "현재 이름", branchId: "current-branch" },
  ]);
  f.studentGate.mockResolvedValue({
    student: { studentId, accountId },
    response: null,
  });
  f.student.mockResolvedValue({
    id: studentId,
    studentAccount: { id: accountId, disabledAt: null },
  });
  f.run.mockResolvedValue(Response.json({ ok: true }));
});

describe("managed refresh occurs at the textbook request boundary", () => {
  it.each(["GET", "POST"])(
    "refreshes %s before current actor lookup or downstream work",
    async (method) => {
      const result = await authorizeTextbook(request(method));
      expect(f.refreshTeacher).toHaveBeenCalledWith(
        teacherId,
        method === "POST",
      );
      expect(f.refreshTeacher.mock.invocationCallOrder[0]).toBeLessThan(
        f.query.mock.invocationCallOrder[0]!,
      );
      expect(result).toEqual({
        actor: { id: teacherId, name: "현재 이름", branchId: "current-branch" },
        response: null,
      });
      // A retried write does not get a shortcut around current external revocations.
      await authorizeTextbook(request(method));
      expect(f.refreshTeacher).toHaveBeenCalledTimes(2);
    },
  );

  it("fails closed before actor lookup when teacher refresh cannot verify current rights", async () => {
    f.refreshTeacher.mockRejectedValue(new Error("transport unavailable"));
    const result = await authorizeTextbook(request("POST"));
    expect(result.actor).toBeNull();
    expect(result.response?.status).toBe(403);
    expect(f.query).not.toHaveBeenCalled();
    expect(result.response?.headers.get("cache-control")).toContain("no-store");
  });

  it("keeps the textbook menu check ahead of external refresh", async () => {
    f.account.mockResolvedValue({
      account: { id: teacherId, menus: [], isAdmin: false },
      response: null,
    });
    expect((await authorizeTextbook(request())).response?.status).toBe(403);
    expect(f.refreshTeacher).not.toHaveBeenCalled();
  });

  it("refreshes the session student's binding before entering student read or write services", async () => {
    expect((await studentTextbookRoute(request("POST"), f.run)).status).toBe(
      200,
    );
    expect(f.refreshStudent).toHaveBeenCalledWith(studentId);
    expect(f.refreshStudent.mock.invocationCallOrder[0]).toBeLessThan(
      f.run.mock.invocationCallOrder[0]!,
    );
    expect(f.run).toHaveBeenCalledWith(studentId);
  });

  it("does not enter student services when refresh fails or the live account changed", async () => {
    f.refreshStudent.mockRejectedValue(
      new Error("binding refresh unavailable"),
    );
    const result = await studentTextbookRoute(request("POST"), f.run);
    expect(result.status).toBe(403);
    expect(result.headers.get("cache-control")).toContain("no-store");
    expect(f.run).not.toHaveBeenCalled();
    f.refreshStudent.mockClear();
    f.student.mockResolvedValue({
      id: studentId,
      studentAccount: { id: "new-account", disabledAt: null },
    });
    expect((await studentTextbookRoute(request(), f.run)).status).toBe(401);
    expect(f.refreshStudent).not.toHaveBeenCalled();
    expect(f.run).not.toHaveBeenCalled();
  });
});
