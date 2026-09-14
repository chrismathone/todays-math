// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/dev-ai/figure-comparison", () => ({
  buildFigureComparisonImage: vi.fn(
    async () => "data:image/png;base64,Y29tcGFyaXNvbg==",
  ),
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/studio-ai/api", async (original) => ({
  ...(await original<typeof import("@/lib/studio-ai/api")>()),
  runModelApi: vi.fn(),
}));
vi.mock("@/lib/dev-ai/cli", () => ({
  runSubscriptionCli: vi.fn(),
  getDevAiProviderStatuses: vi.fn(),
}));
import { GET, POST } from "@/app/api/studio/ai/route";
import { POST as devPost } from "@/app/api/dev/unified/ai/route";
import { getSessionUser } from "@/lib/session";
import { auth } from "@/lib/auth";
import { runModelApi } from "@/lib/studio-ai/api";
import { runSubscriptionCli, getDevAiProviderStatuses } from "@/lib/dev-ai/cli";
import { MAX_AI_BODY_BYTES } from "@/lib/dev-ai/tasks";
import { readStudioAiBody } from "@/lib/studio-ai/http";
import { executeStudioTask } from "@/lib/studio-ai/execute";
import catalog from "../../../scripts/figure/engine-catalog.json";

const origin = "https://math.example";
const input = {
  provider: "auto",
  action: "solution",
  grade: "중1",
  content: "1+1을 계산하시오.",
};
const request = (
  body: unknown = input,
  headers: Record<string, string> = {},
  signal?: AbortSignal,
) =>
  new Request(`${origin}/api/studio/ai`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { origin, "content-type": "application/json", ...headers },
    signal,
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("AUTH_URL", origin);
  for (const name of ["GEMINI", "DEEPSEEK", "ANTHROPIC", "OPENAI"])
    vi.stubEnv(`${name}_API_KEY`, "unit-test-key");
  vi.mocked(getSessionUser).mockResolvedValue({
    id: "teacher",
    name: "teacher",
    email: "teacher@example.test",
  });
  vi.mocked(auth as () => Promise<unknown>).mockResolvedValue({
    user: { id: "teacher", role: "director" },
  });
  vi.mocked(runModelApi).mockResolvedValue(
    JSON.stringify({ answer: "2", solution: "1+1=2", warnings: [] }),
  );
});
afterEach(() => vi.unstubAllEnvs());
describe("authenticated production AI execution", () => {
  it("checks status without inference or exposing keys and enforces auth and reviewer conventions", async () => {
    const response = await GET(new Request(`${origin}/api/studio/ai`));
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toMatchObject({
      mode: "model-api",
      defaultProvider: "auto",
    });
    expect(runModelApi).not.toHaveBeenCalled();
    expect(getDevAiProviderStatuses).not.toHaveBeenCalled();
    vi.mocked(getSessionUser).mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect((await GET(new Request(origin))).status).toBe(401);
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "reviewer",
      name: "reviewer",
      email: "r@example.test",
    });
    vi.mocked(auth as () => Promise<unknown>).mockResolvedValue({
      user: { id: "reviewer", role: "reviewer" },
    });
    expect((await POST(request())).status).toBe(403);
    expect(runModelApi).not.toHaveBeenCalled();
  });
  it("rejects foreign origins, invalid providers/fields, oversized input and wrong content types before inference", async () => {
    expect(
      (await POST(request(input, { origin: "https://foreign.test" }))).status,
    ).toBe(403);
    expect(
      (await POST(request(input, { "content-type": "text/plain" }))).status,
    ).toBe(415);
    expect((await POST(request({ ...input, provider: "codex" }))).status).toBe(
      400,
    );
    expect(
      (await POST(request({ ...input, apiKey: "client-key" }))).status,
    ).toBe(400);
    expect(
      (
        await POST(
          request(input, { "content-length": String(MAX_AI_BODY_BYTES + 1) }),
        )
      ).status,
    ).toBe(400);
    expect(runModelApi).not.toHaveBeenCalled();
    expect(runSubscriptionCli).not.toHaveBeenCalled();
  });
  it("runs the shared parser through API with no production CLI fallback", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      provider: "auto",
      model: "deepseek-v4-pro",
      result: { answer: "2", solution: "1+1=2" },
    });
    expect(runModelApi).toHaveBeenCalledWith(
      expect.objectContaining({
        vendor: "deepseek",
        model: "deepseek-v4-pro",
        signal: expect.any(AbortSignal),
      }),
    );
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    expect((await POST(request())).status).toBe(503);
    expect(runSubscriptionCli).not.toHaveBeenCalled();
    expect(
      (
        await devPost(
          new Request(
            "http://localhost:3000/api/dev/unified/ai?mode=model-api",
            {
              method: "POST",
              headers: {
                origin: "http://localhost:3000",
                "content-type": "application/json",
              },
              body: JSON.stringify(input),
            },
          ),
        )
      ).status,
    ).toBe(404);
    await expect(
      executeStudioTask(
        { ...input, action: "solution", provider: "codex" },
        { mode: "subscription-cli" },
        new AbortController().signal,
      ),
    ).rejects.toThrow("서버 API");
  });
  it("permits explicit API mode on the guarded development route without CLI mode enabled", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_AI_MODE", "");
    const response = await devPost(
      new Request("http://localhost:3000/api/dev/unified/ai?mode=model-api", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify(input),
      }),
    );
    expect(response.status).toBe(200);
    expect(runSubscriptionCli).not.toHaveBeenCalled();
  });
  it("uses injected Opus/Gemini inference with the real deterministic Python figure engine", async () => {
    vi.mocked(runModelApi)
      .mockResolvedValueOnce(JSON.stringify({ spec: catalog.v2_example }))
      .mockResolvedValueOnce(JSON.stringify({ passed: true, issues: [] }));
    const response = await POST(
      request({
        provider: "auto",
        action: "figure-redraw",
        grade: "중3",
        content: "원본 도형 재작도",
        imageDataUrl: "data:image/png;base64,YWJj",
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result).toMatchObject({
      engine: "todays-math-python",
      figureReview: { passed: true },
    });
    expect(body.result.svg).toContain("<svg");
    expect(
      vi.mocked(runModelApi).mock.calls.map(([arg]) => arg.vendor),
    ).toEqual(["anthropic", "gemini"]);
    expect(runSubscriptionCli).not.toHaveBeenCalled();
  });
  it("bounds concurrent requests per user and frees admission after cancellation", async () => {
    vi.mocked(runModelApi).mockImplementation(
      ({ signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        }),
    );
    const controller = new AbortController();
    const first = POST(request(input, {}, controller.signal));
    const second = POST(request(input, {}, controller.signal));
    await vi.waitFor(() => expect(runModelApi).toHaveBeenCalledTimes(2));
    expect((await POST(request())).status).toBe(429);
    controller.abort();
    expect((await first).status).toBe(499);
    expect((await second).status).toBe(499);
    vi.mocked(runModelApi).mockResolvedValue(
      JSON.stringify({ answer: "2", solution: "1+1=2", warnings: [] }),
    );
    expect((await POST(request())).status).toBe(200);
  });
  it("bounds chunked bodies and cancels a stalled body read", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_AI_BODY_BYTES + 1));
      },
      cancel,
    });
    await expect(
      readStudioAiBody(
        new Request(origin, {
          method: "POST",
          body,
          duplex: "half",
        } as RequestInit),
      ),
    ).rejects.toThrow("large");
    expect(cancel).toHaveBeenCalled();
    const abort = new AbortController();
    const stalled = readStudioAiBody(
      new Request(origin, {
        method: "POST",
        body: new ReadableStream({}),
        duplex: "half",
      } as RequestInit),
      abort.signal,
    );
    abort.abort();
    await expect(stalled).rejects.toThrow();
  });
});
