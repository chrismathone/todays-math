import { afterEach, describe, expect, it, vi } from "vitest";
import WorkspacePage from "@/components/unified/WorkspacePage";

const mocks = vi.hoisted(() => ({ account: vi.fn(), bank: vi.fn() }));
vi.mock("@/lib/accountAccess", () => ({ getAccountAccess: mocks.account }));
vi.mock("@/lib/unifiedPreview", () => ({ loadUnifiedBank: mocks.bank }));
vi.mock("@/components/unified/UnifiedWorkspace", () => ({
  default: "workspace",
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("작업실 서버 문 전달", () => {
  it.each(["off", "read", "on", "unknown", undefined])(
    "서버의 %s 값을 prop으로 내려준다",
    async (gate) => {
      vi.stubEnv("MATH_FADING", gate);
      mocks.account.mockResolvedValue(null);
      const page = await WorkspacePage({
        user: {
          id: "teacher",
          name: "교사",
          email: "teacher@example.com",
          isAdmin: false,
        },
      });
      // 모르는 값은 꺼짐, 값이 없으면 켜짐이다(2026-10-06).
      expect(page.props.fadingGate).toBe(
        gate === "unknown" ? "off" : (gate ?? "on"),
      );
      expect(page.props.allowedMenus).toEqual([]);
      expect(mocks.bank).not.toHaveBeenCalled();
    },
  );
});
