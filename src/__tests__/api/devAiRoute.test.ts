import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/dev-ai/cli", () => ({
  getDevAiProviderStatuses: vi.fn(),
  runSubscriptionCli: vi.fn(),
}));
import { GET, POST } from "@/app/api/dev/unified/ai/route";
import { getDevAiProviderStatuses, runSubscriptionCli } from "@/lib/dev-ai/cli";

const origin = "http://127.0.0.1:3000";
const input = {
  provider: "claude",
  action: "solution",
  grade: "초5",
  content: "$125 + 348$을 계산하시오.",
};
const request = (body: unknown = input, source = origin) =>
  new Request("http://localhost:3000/api/dev/unified/ai", {
    method: "POST",
    headers: {
      origin: source,
      host: "127.0.0.1:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("DEV_AI_MODE", "subscription-cli");
  vi.stubEnv("DEV_AI_PROVIDER", "claude");
});
afterEach(() => vi.unstubAllEnvs());
describe("subscription AI HTTP integration", () => {
  it("checks status without consuming inference and reports disabled mode without probing", async () => {
    vi.mocked(getDevAiProviderStatuses).mockResolvedValue([]);
    const status = await GET(new Request(origin + "/api/dev/unified/ai"));
    expect(await status.json()).toMatchObject({
      enabled: true,
      defaultProvider: "claude",
    });
    expect(status.headers.get("cache-control")).toContain("no-store");
    expect(runSubscriptionCli).not.toHaveBeenCalled();
    vi.stubEnv("DEV_AI_MODE", "");
    expect((await (await GET(new Request(origin))).json()).enabled).toBe(false);
    expect(getDevAiProviderStatuses).toHaveBeenCalledTimes(1);
  });
  it("rejects disabled, cross-origin, malformed and production requests before launching a CLI", async () => {
    expect((await POST(request(input, "https://external.test"))).status).toBe(
      403,
    );
    expect((await POST(request({ ...input, content: "" }))).status).toBe(400);
    vi.stubEnv("DEV_AI_MODE", "");
    expect((await POST(request())).status).toBe(503);
    vi.stubEnv("NODE_ENV", "production");
    expect((await POST(request())).status).toBe(404);
    expect(runSubscriptionCli).not.toHaveBeenCalled();
  });
  it("returns validated answer/solution without replacing the reviewed question", async () => {
    vi.mocked(runSubscriptionCli).mockResolvedValue(
      JSON.stringify({
        content: "rewritten",
        answer: "473",
        solution: "125 + 348 = 473",
        warnings: [],
      }),
    );
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      provider: "claude",
      action: "solution",
      result: { content: "", answer: "473" },
    });
    expect(runSubscriptionCli).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "claude",
        prompt: expect.stringContaining(input.content),
        signal: expect.any(AbortSignal),
      }),
    );
  });
  it("does not retry or switch providers on invalid model output or CLI failure", async () => {
    vi.mocked(runSubscriptionCli).mockResolvedValue("not a JSON result");
    expect((await POST(request())).status).toBe(502);
    vi.mocked(runSubscriptionCli).mockRejectedValue(
      new Error("구독 사용 한도에 도달했습니다."),
    );
    const failed = await POST(request());
    expect(failed.status).toBe(502);
    expect(await failed.json()).toMatchObject({
      error: "구독 사용 한도에 도달했습니다.",
    });
    expect(runSubscriptionCli).toHaveBeenCalledTimes(2);
    expect(
      vi
        .mocked(runSubscriptionCli)
        .mock.calls.every(([value]) => value.provider === "claude"),
    ).toBe(true);
  });
});
