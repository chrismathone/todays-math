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
import {
  STUDIO_AI_PLATFORM_BODY_LIMIT,
  STUDIO_AI_TOO_LARGE,
} from "@/lib/studio-ai/limits";
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
    isAdmin: false,
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
      isAdmin: false,
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
    // 16MB 를 넘는 본문은 그 전에 4.5MB 플랫폼 상한에 걸린다(트랙 39) — 413 이다
    expect(
      (
        await POST(
          request(input, { "content-length": String(MAX_AI_BODY_BYTES + 1) }),
        )
      ).status,
    ).toBe(413);
    expect(runModelApi).not.toHaveBeenCalled();
    expect(runSubscriptionCli).not.toHaveBeenCalled();
  });
  it("runs the shared parser through API with no production CLI fallback", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      provider: "auto",
      model: "deepseek-flash",
      result: { answer: "2", solution: "1+1=2" },
    });
    expect(runModelApi).toHaveBeenCalledWith(
      expect.objectContaining({
        vendor: "deepseek",
        model: "deepseek-flash",
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
  it("uses injected Gemini inference for both figure phases with the real deterministic Python figure engine", async () => {
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
    ).toEqual(["gemini", "gemini"]);
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

// 트랙 39 (2026-09-21) — 운영(Vercel)은 본문이 4.5MB 를 넘으면 우리 코드에 닿기 전에 평문 413 을 낸다.
// 로컬(next start)은 16MB 까지 받아 그 결함이 안 보였다 — 같은 문턱에서 같은 413 을 내되 사람 문구 JSON 으로.
describe("request body over the platform limit", () => {
  it("answers 413 with a readable reason before admission or inference", async () => {
    const response = await POST(
      request(input, {
        "content-length": String(STUDIO_AI_PLATFORM_BODY_LIMIT + 1),
      }),
    );
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: STUDIO_AI_TOO_LARGE });
    expect(runModelApi).not.toHaveBeenCalled();
  });
  it("keeps accepting a body at the limit", async () => {
    const response = await POST(
      request(input, {
        "content-length": String(STUDIO_AI_PLATFORM_BODY_LIMIT),
      }),
    );
    expect(response.status).not.toBe(413);
  });
});

// 원장님 2026-09-19 — 도형 다시 그리기가 왜 안 됐는지 «AI 결과를 처리하지 못했습니다»(502)에 가려졌다.
// 운영 로그에는 모델의 사유(«사각형 관계 다이어그램은 … 표현할 수 없습니다»)와 엔진 검증 사유가 있었다.
describe("figure redraw reasons reach the screen", () => {
  const figure = {
    provider: "auto",
    action: "figure-redraw",
    grade: "중3",
    content: "원본 도형 재작도",
    imageDataUrl: "data:image/png;base64,YWJj",
  };
  const generic =
    "AI 결과를 처리하지 못했습니다. 입력과 모델 설정을 확인해 주세요.";

  it("shows the model's own reason when it declines to draw", async () => {
    const note = "사진이라 기하 요소로 옮길 수 없습니다.";
    vi.mocked(runModelApi).mockResolvedValueOnce(
      JSON.stringify({ spec: null, note }),
    );
    const response = await POST(request(figure));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: `${note} 원본은 유지됩니다.`,
    });
  });

  it("clips a long reason to one line", async () => {
    vi.mocked(runModelApi).mockResolvedValueOnce(
      JSON.stringify({ spec: null, note: "가나다라마\n".repeat(160) }),
    );
    const response = await POST(request(figure));
    expect(response.status).toBe(422);
    const { error } = await response.json();
    expect(error.length).toBeLessThanOrEqual(240);
    expect(error).not.toContain("\n");
    expect(error).toMatch(/… 원본은 유지됩니다\.$/);
  });

  // 원장님 2026-09-21 — 엔진의 영어 원문이 화면에 그대로 나갔다(D-08). 화면은 한국어 한 줄, 원문은 개발자용 detail·서버 기록.
  const missingRef = {
    spec: {
      version: 2,
      points: { A: [0, 0] },
      segments: { AB: ["A", "missing"] },
    },
  };
  const engineWords =
    "도형을 그리지 못했습니다: segment 'AB' has unknown point ref 'missing'";
  it("shows the engine's reason as one Korean line when the repairs run out — its words go to detail", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(runModelApi).mockResolvedValue(JSON.stringify(missingRef));
    const response = await POST(request(figure));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "도형을 다시 그리지 못했습니다. 원본은 유지됩니다.",
      detail: engineWords,
    });
    expect(runModelApi).toHaveBeenCalledTimes(3);
    // 운영 로그(원장님이 붙여 주시는 것)에는 엔진 원문이 남는다
    expect(log).toHaveBeenCalledWith(
      "[POST /api/studio/ai] figure-redraw failed:",
      expect.stringContaining(engineWords),
    );
    log.mockRestore();
  });

  it("carries the same detail on the development route", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_AI_MODE", "subscription-cli");
    vi.mocked(runSubscriptionCli).mockResolvedValue(JSON.stringify(missingRef));
    const response = await devPost(
      new Request("http://localhost:3000/api/dev/unified/ai", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({ ...figure, provider: "codex" }),
      }),
    );
    expect(await response.json()).toEqual({
      error: "도형을 다시 그리지 못했습니다. 원본은 유지됩니다.",
      detail: engineWords,
    });
    expect(runSubscriptionCli).toHaveBeenCalledTimes(3);
  });

  // 리드 결정 2026-09-19 — 처리기의 240초는 요청 시작부터, 도형 쪽 240초는 칸을 얻은 뒤부터라 처리기가 먼저 끊어
  // 504 가 됐다(«마지막으로 그린 결과» 길이 운영에서 닿지 않았다). 도형 쪽이 처리기 끝 10초 전에 먼저 멈춘다.
  // AbortSignal.timeout 은 가짜 시계 밖이라 여기서는 옛 504 가 아니라 «240초까지 안 끝남»으로 빨갛다.
  it("returns the last render before the handler's own 240 s limit", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      vi.mocked(runModelApi).mockImplementation(async ({ prompt, signal }) => {
        if (prompt.includes("<rendered-spec-data>"))
          return JSON.stringify({ passed: false, issues: ["점 D"] });
        if (prompt.includes("<previous-spec-data>"))
          return new Promise<string>((_resolve, reject) =>
            signal.addEventListener("abort", () => reject(signal.reason), {
              once: true,
            }),
          );
        return JSON.stringify({ spec: catalog.v2_example });
      });
      const waitReal = async (done: () => boolean, limitMs: number) => {
        const started = performance.now();
        while (!done() && performance.now() - started < limitMs)
          await new Promise((resolve) => setImmediate(resolve));
      };
      const pending = POST(request(figure));
      await waitReal(
        () => vi.mocked(runModelApi).mock.calls.length >= 3,
        40_000,
      );
      let settled = false;
      void pending.then(() => (settled = true));
      await vi.advanceTimersByTimeAsync(229_000);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1_001);
      await waitReal(() => settled, 5_000);
      expect(settled).toBe(true);
      const response = await pending;
      expect(response.status).toBe(200);
      expect((await response.json()).result.warnings).toEqual([
        "도형 재작도가 오래 걸려 마지막으로 그린 결과를 사용합니다.",
      ]);
    } finally {
      vi.useRealTimers();
    }
  }, 60_000);

  it("still hides failures it did not write", async () => {
    vi.mocked(runModelApi).mockRejectedValueOnce(
      new Error("upstream body with sk-live-secret"),
    );
    const response = await POST(request(figure));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: generic });
  });
});
