import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MainScreen } from "@/components/main/MainScreen";
import { loadMainDashboard } from "@/lib/main/loadMainDashboard";
import { MOCK_CLASS_A } from "@/mocks/data";
import type { WorkspaceMenu } from "@/contracts/accountAccess.contract";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/main/loadMainDashboard", () => ({ loadMainDashboard: vi.fn() }));
vi.mock("@/components/main/DailyReviewSection", () => ({
  DailyReviewSection: () => <section aria-label="오늘의 확인테스트" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadMainDashboard).mockResolvedValue({
    classes: [],
    tests: [],
    progressByClass: {},
    suggestByClass: {},
    units: [],
    metrics: {
      weekStart: "2026-09-07",
      weekEnd: "2026-09-13",
      printedDays: 0,
      printedCount: 0,
      unmodifiedCount: 0,
      unmodifiedRate: 0,
      avgGenerateToPrintSeconds: null,
    },
  });
});

describe("embedded MainScreen", () => {
  it.each<{ allowedMenus: WorkspaceMenu[]; output: boolean }>([
    { allowedMenus: ["arithmetic"], output: true },
    { allowedMenus: ["bank"], output: true },
    { allowedMenus: ["studio"], output: true },
    { allowedMenus: ["library"], output: true },
    { allowedMenus: [], output: false },
    { allowedMenus: ["export"], output: false },
    { allowedMenus: ["teaching"], output: false },
  ])(
    "uses source access for common output ($allowedMenus)",
    async ({ allowedMenus, output }) => {
      vi.mocked(loadMainDashboard).mockResolvedValue({
        classes: [MOCK_CLASS_A],
        tests: [],
        progressByClass: {},
        suggestByClass: {},
        units: [],
        metrics: null,
        testsStatus: output ? "ready" : "unavailable",
      });
      render(<MainScreen embedded allowedMenus={allowedMenus} />);
      await screen.findByRole("article", { name: MOCK_CLASS_A.name });
      expect(
        screen.queryByRole("region", { name: "오늘의 확인테스트" }) !== null,
      ).toBe(output);
      expect(loadMainDashboard).toHaveBeenCalledWith(
        expect.objectContaining({ allowedMenus }),
      );
    },
  );

  it("keeps the empty state in the workspace and calls onEmpty only on request", async () => {
    const onEmpty = vi.fn();
    const user = userEvent.setup();
    render(<MainScreen embedded onEmpty={onEmpty} />);
    expect(document.querySelector(".app-chrome")).toBeNull();
    await screen.findByText("첫 수업을 준비해 보세요");
    expect(replace).not.toHaveBeenCalled();
    expect(onEmpty).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "반 · 학생 관리로 이동" }),
    );
    expect(onEmpty).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".app-chrome")).toBeNull();
  });

  it("preserves the production onboarding redirect by default", async () => {
    render(<MainScreen />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding"));
  });

  it("keeps failures inside the embedded content and retries", async () => {
    vi.mocked(loadMainDashboard).mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    render(<MainScreen embedded />);
    await screen.findByRole("alert");
    expect(document.querySelector(".app-chrome")).toBeNull();
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));
    await screen.findByText("첫 수업을 준비해 보세요");
  });
});
