import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), load: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/app/dev/concept-blank-scan-wire/samples", () => ({
  loadWireSamples: mocks.load,
}));
vi.mock("@/app/dev/concept-blank-scan-wire/ScanWire", () => ({
  ScanWire: () => null,
}));
import Page from "@/app/dev/concept-blank-scan-wire/page";

beforeEach(() => {
  mocks.auth.mockReset();
  mocks.load.mockReset().mockResolvedValue([]);
});
afterEach(() => vi.unstubAllEnvs());

describe("개념 백지 촬영 Wire · 은행을 읽기 전 로그인 가드", () => {
  it.each(["production", "development", "test"])(
    "%s: QA 예외도 로그인 없이 열지 않는다",
    async (env) => {
      vi.stubEnv("NODE_ENV", env);
      vi.stubEnv("ENABLE_RENDER_QA", "1");
      mocks.auth.mockResolvedValue(null);
      await expect(Page()).rejects.toThrow();
      expect(mocks.load).not.toHaveBeenCalled();
    },
  );
  it.each([{ student: { id: "sample" } }, { user: { role: "reviewer" } }])(
    "학생·검토자 세션은 시안의 문항을 받지 못한다: %j",
    async (session) => {
      vi.stubEnv("NODE_ENV", "development");
      mocks.auth.mockResolvedValue(session);
      await expect(Page()).rejects.toThrow();
      expect(mocks.load).not.toHaveBeenCalled();
    },
  );
  it("로그인한 원장은 production 가드 뒤에서 시안을 연다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_RENDER_QA", "");
    mocks.auth.mockResolvedValue({
      user: { id: "wire-reader", role: "director" },
    });
    expect(await Page()).toBeTruthy();
    expect(mocks.load).toHaveBeenCalledOnce();
  });
});
