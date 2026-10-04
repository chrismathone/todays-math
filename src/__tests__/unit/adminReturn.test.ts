import { describe, expect, it } from "vitest";
import {
  accountListReturn,
  classManagerHref,
  contextParams,
  safeInternalReturn,
  shellReturn,
} from "@/lib/adminReturn";
import { saveAdminScroll, restoreAdminScroll } from "@/lib/adminScroll";
import { replaceScreenQuery } from "@/hooks/useScreenQuery";
import { vi } from "vitest";

describe("approved internal return contexts", () => {
  it.each([
    "https://evil.test/",
    "//evil.test/",
    "/%2f%2fevil.test",
    "/classes%2fmanage",
    "/admin/branches/other?q=x",
    "/admin/branches/own?returnTo=%2Fbranch",
    "/admin/branches/own?password=secret",
    "/admin/branches/own?proof=secret",
    "/admin/branches/own?token=secret",
    "/admin/branches/own?tab=foreign",
    "/admin/branches/own?page=0",
    "/admin/branches/own?tab=accounts&tab=menus",
    "/admin/branches/own#foreign",
  ])("rejects unsafe input %s", (value) => {
    expect(safeInternalReturn(value, "own")).toBeNull();
  });
  it("keeps permitted name/email searches, page, status, tab and selection in a fixed branch", () => {
    const href = accountListReturn(
      "own",
      new URLSearchParams({
        q: "김교사 teacher@example.test",
        status: "suspended",
        page: "3",
        tab: "accounts",
        selection: "user-2",
        password: "omitted",
      }),
    );
    expect(safeInternalReturn(href, "own")).not.toBeNull();
    expect(href).toContain("page=3");
    expect(href).not.toContain("password");
    expect(safeInternalReturn(href, "other")).toBeNull();
  });
  it("routes to existing managers and restores enumerated shells with selection", () => {
    const row = { classId: "class-1", id: "student-2" };
    expect(classManagerHref(row, { menus: ["srs"] }, "admin-srs")).toBeNull();
    const teacher = classManagerHref(
      row,
      { menus: ["teaching"] },
      "workspace-srs",
    )!;
    expect(teacher).toMatch(/^\/classes\/manage\?/);
    const branch = classManagerHref(
      row,
      { menus: ["teaching"], branchId: "own", branchRole: "manager" },
      "workspace-srs",
    )!;
    expect(branch).toContain("tab=classes");
    const context = contextParams(
      new URL(teacher, "https://local.test").searchParams,
    );
    expect(shellReturn(context)).toBe(
      "/?classId=class-1&studentId=student-2&teachingTab=classes#srs",
    );
    expect(
      shellReturn(
        contextParams({
          from: "https://evil.test",
          classId: "%2f",
          studentId: "student-2",
        }),
      ),
    ).toBe("/classes/manage?studentId=student-2");
  });
  it("preserves the active hash on query updates and restores scroll only on the same normalized screen", () => {
    window.history.replaceState(
      null,
      "",
      "/admin/branches/own?q=name&page=3#admin-main",
    );
    replaceScreenQuery({ status: "approved" });
    expect(window.location.hash).toBe("#admin-main");
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 450,
    });
    saveAdminScroll("/admin/branches/own?q=name&page=3", "own");
    restoreAdminScroll("/admin/branches/own?page=3&q=name", "own");
    expect(scroll).toHaveBeenCalledWith({ top: 450, behavior: "instant" });
    scroll.mockClear();
    restoreAdminScroll("/admin/branches/own?page=2&q=name", "own");
    restoreAdminScroll("/admin/branches/other?page=3&q=name", "own");
    expect(scroll).not.toHaveBeenCalled();
    scroll.mockRestore();
  });
});
