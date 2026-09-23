import { describe, expect, it } from "vitest";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import { studentGateFor } from "@/lib/studentRouteAccess";

const teacher: AccountAccess = {
  id: "teacher",
  name: "교사",
  email: "teacher@example.test",
  role: "director",
  isAdmin: false,
  approvalStatus: "approved",
  menus: ["srs"],
};

describe("SRS feature access", () => {
  it("separates SRS data from general teaching access", () => {
    for (const path of [
      "/api/math-srs/course",
      "/api/students/student-id/math-srs/course",
    ]) {
      expect(accountRouteAllowed(teacher, "GET", path)).toBe(true);
      expect(
        accountRouteAllowed({ ...teacher, menus: ["teaching"] }, "GET", path),
      ).toBe(false);
      expect(
        accountRouteAllowed(
          { ...teacher, approvalStatus: "pending" },
          "GET",
          path,
        ),
      ).toBe(false);
      expect(studentGateFor(false, "GET", path).kind).toBe("forbidden");
    }
    expect(
      accountRouteAllowed(
        teacher,
        "POST",
        "/api/students/student-id/math-srs/course",
      ),
    ).toBe(true);
    for (const path of [
      "/api/students/student-id",
      "/api/classes",
      "/api/math-srs/course/delete",
      "/api/students/student-id/math-srs/course/export",
    ]) {
      expect(accountRouteAllowed(teacher, "GET", path)).toBe(false);
    }
    expect(
      accountRouteAllowed(
        teacher,
        "DELETE",
        "/api/students/student-id/math-srs/course",
      ),
    ).toBe(false);
    expect(accountRouteAllowed(teacher, "POST", "/api/math-srs/course")).toBe(
      false,
    );
  });
  it("reserves the full administrator page for approved admins", () => {
    expect(accountRouteAllowed(teacher, "GET", "/admin/math-srs")).toBe(false);
    expect(
      accountRouteAllowed(
        { ...teacher, isAdmin: true },
        "GET",
        "/admin/math-srs",
      ),
    ).toBe(true);
  });
  it.each([
    ["GET", "/api/learn/math-srs/course"],
    ["POST", "/api/learn/math-srs/course"],
    ["POST", "/api/learn/math-srs/course/plan"],
    ["POST", "/api/learn/math-srs/course/attempts"],
    ["POST", "/api/learn/math-srs/course/hint"],
    ["GET", "/api/learn/math-srs/course/figure"],
  ])("allows only an active student's own endpoint: %s %s", (method, path) => {
    expect(studentGateFor(false, method, path).kind).toBe("allow");
    expect(studentGateFor(true, method, path).kind).toBe("forbidden");
    expect(studentGateFor(false, "DELETE", path).kind).toBe("forbidden");
    expect(studentGateFor(false, method, `${path}/other-student`).kind).toBe(
      "forbidden",
    );
  });
});
