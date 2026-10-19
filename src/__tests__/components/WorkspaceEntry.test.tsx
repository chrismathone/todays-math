import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALL_WORKSPACE_MENUS,
  WORKSPACE_OUTPUT_MENUS,
} from "@/contracts/accountAccess.contract";
vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({ auth: vi.fn(), bootstrap: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
  notFound: () => {
    throw new Error("notFound");
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
import ExamReportPage from "@/app/(main)/exam-reports/[testId]/page";

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
  it.each(WORKSPACE_OUTPUT_MENUS)(
    "opens a report from %s access without the retired export flag",
    async (source) => {
      mocks.auth.mockResolvedValue({
        user: { ...user, role: "director", menus: [source] },
      });
      const testId = "00000004-0000-4000-8000-000000000000";
      const page = await ExamReportPage({
        params: Promise.resolve({ testId }),
      });
      expect(page.type).toBe(WorkspacePage);
      expect(page.props.examReportTestId).toBe(testId);
      expect(mocks.bootstrap).not.toHaveBeenCalled();
    },
  );
  it("성적표는 같은 작업실 셸로 열며 문제은행을 미리 읽지 않는다", async () => {
    const testId = "00000004-0000-4000-8000-000000000000";
    const page = await ExamReportPage({ params: Promise.resolve({ testId }) });
    expect(page.type).toBe(WorkspacePage);
    expect(page.props.examReportTestId).toBe(testId);
    const workspace = await WorkspacePage({ user, examReportTestId: testId });
    expect(workspace.props.examReportTestId).toBe(testId);
    expect(mocks.bootstrap).not.toHaveBeenCalled();
  });
  it("성적표의 원장·출력 메뉴·id 관문은 페이지에서도 닫힌다", async () => {
    const params = Promise.resolve({
      testId: "00000004-0000-4000-8000-000000000000",
    });
    mocks.auth.mockResolvedValue(null);
    await expect(ExamReportPage({ params })).rejects.toThrow("redirect:/login");
    for (const account of [
      { ...user, role: "reviewer" },
      { ...user, role: "director", menus: [] },
      { ...user, role: "director", menus: ["export"] },
      { ...user, role: "director", menus: ["teaching"] },
    ]) {
      mocks.auth.mockResolvedValue({ user: account });
      await expect(ExamReportPage({ params })).rejects.toThrow("notFound");
    }
    mocks.auth.mockResolvedValue({ user: { ...user, role: "director" } });
    await expect(
      ExamReportPage({ params: Promise.resolve({ testId: "bad" }) }),
    ).rejects.toThrow("notFound");
  });
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
