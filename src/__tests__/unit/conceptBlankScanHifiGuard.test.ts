import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), load: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/app/dev/concept-blank-scan-wire/samples", () => ({
  loadWireSamples: mocks.load,
}));
vi.mock("@/app/dev/concept-blank-scan-hifi/ScanHifi", () => ({
  ScanHifi: () => null,
}));
import Page from "@/app/dev/concept-blank-scan-hifi/page";

beforeEach(() => {
  mocks.auth.mockReset();
  mocks.load.mockReset().mockResolvedValue([]);
});
afterEach(() => vi.unstubAllEnvs());

describe("사진 채점 Hi-fi는 은행을 읽기 전에 세션을 확인한다", () => {
  it.each(["production", "development", "test"])(
    "%s: QA 예외에도 익명 비공개",
    async (env) => {
      vi.stubEnv("NODE_ENV", env);
      vi.stubEnv("ENABLE_RENDER_QA", "1");
      mocks.auth.mockResolvedValue(null);
      await expect(Page()).rejects.toThrow();
      expect(mocks.load).not.toHaveBeenCalled();
    },
  );
  it.each([{ student: { id: "sample" } }, { user: { role: "reviewer" } }])(
    "학생·검토자 거절: %j",
    async (session) => {
      vi.stubEnv("NODE_ENV", "development");
      mocks.auth.mockResolvedValue(session);
      await expect(Page()).rejects.toThrow();
      expect(mocks.load).not.toHaveBeenCalled();
    },
  );
  it("원장은 네 Hi-fi 비교를 연다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.auth.mockResolvedValue({
      user: { id: "hifi-reader", role: "director" },
    });
    expect(await Page()).toBeTruthy();
    expect(mocks.load).toHaveBeenCalledOnce();
  });
});
