import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({ auth: vi.fn(), bootstrap: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("@/lib/unifiedPreview", () => ({
  loadUnifiedBankBootstrap: mocks.bootstrap,
}));
vi.mock("@/components/landing/LandingPage", () => ({
  default: "landing-page",
}));
vi.mock("@/components/unified/UnifiedWorkspace", () => ({
  default: "workspace",
}));

import MainPage from "@/app/(main)/page";
import WorkspacePage from "@/components/unified/WorkspacePage";

const user = {
  id: "teacher-one",
  name: "김선생",
  email: "teacher@example.com",
  approvalStatus: "approved",
  menus: ALL_WORKSPACE_MENUS,
  isAdmin: false,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { ...user, role: "director" } });
});

describe("public landing and authenticated main entry", () => {
  it("renders the landing without reading question or class data for anonymous visitors", async () => {
    mocks.auth.mockResolvedValue(null);
    const page = await MainPage();
    expect(page.type).toBe("landing-page");
    expect(mocks.bootstrap).not.toHaveBeenCalled();
  });

  it("sends a signed-in teacher to the shared workspace and uses their identity", async () => {
    mocks.auth.mockResolvedValue({ user: { ...user, role: "director" } });
    const page = await MainPage();
    expect(page.type).toBe(WorkspacePage);
    expect(page.props.user).toEqual(expect.objectContaining(user));
  });

  it("retains the established reviewer destination before reading workspace data", async () => {
    mocks.auth.mockResolvedValue({ user: { ...user, role: "reviewer" } });
    await expect(MainPage()).rejects.toThrow("redirect:/review");
    expect(mocks.bootstrap).not.toHaveBeenCalled();
  });

  it("does not share the previous user's draft scope when another account opens the main", async () => {
    mocks.bootstrap.mockResolvedValue({
      total: 23,
      grades: [{ grade: "중1", count: 23 }],
      chapters: ["1학기 1. 소인수분해"],
      units: [
        {
          id: "unit-one",
          grade: "중1",
          chapter: "1학기 1. 소인수분해",
          section: "소인수분해",
          orderIndex: 1,
        },
      ],
    });
    for (const id of ["teacher-one", "teacher-two"]) {
      mocks.auth.mockResolvedValue({ user: { ...user, id, role: "director" } });
      const page = await WorkspacePage({ user: { ...user, id } });
      expect(page.props.storageScope).toBe(id);
      expect(page.props.currentUser.id).toBe(id);
      expect(page.key).toBe(id);
      expect(page.props.initialData.problems).toEqual([]);
      expect(page.props.initialData).toMatchObject({
        total: 23,
        grades: [{ grade: "중1", count: 23 }],
        chapters: ["1학기 1. 소인수분해"],
        units: [expect.objectContaining({ id: "unit-one" })],
        page: 1,
        pageSize: 12,
      });
    }
    expect(mocks.bootstrap).toHaveBeenCalledTimes(2);
  });

  it("does not fetch a disabled question bank or redirect a disabled reviewer in a loop", async () => {
    mocks.auth.mockResolvedValue({
      user: { ...user, role: "reviewer", menus: [] },
    });
    const entry = await MainPage();
    expect(entry.type).toBe(WorkspacePage);
    const page = await WorkspacePage({ user });
    expect(page.props.allowedMenus).toEqual([]);
    expect(mocks.bootstrap).not.toHaveBeenCalled();
  });

  it("keeps source editing available when the bank cannot be loaded", async () => {
    mocks.bootstrap.mockRejectedValue(new Error("database unavailable"));
    const page = await WorkspacePage({ user });
    expect(page.props.storageScope).toBe(user.id);
    expect(page.props.initialData.problems).toEqual([]);
    expect(page.props.initialData.error).toContain("문제 추출은 바로");
  });
});
