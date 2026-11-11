// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({
  chat: vi.fn(),
  responses: vi.fn(),
  construct: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("openai", () => ({
  default: class {
    constructor(options: unknown) {
      sdk.construct(options);
    }
    chat = { completions: { create: sdk.chat } };
    responses = { create: sdk.responses };
  },
}));
import { getModelApiStatus, runModelApi } from "@/lib/studio-ai/api";
import {
  autoFigureReviewModel,
  resolveApiModel,
} from "@/lib/studio-ai/routing";

const signal = () => new AbortController().signal;
const imageDataUrl = "data:image/png;base64,YWJj";
beforeEach(() => {
  vi.clearAllMocks();
  for (const vendor of ["OPENAI", "DEEPSEEK", "GEMINI", "ANTHROPIC"])
    vi.stubEnv(`${vendor}_API_KEY`, "private-test-key");
  sdk.chat.mockResolvedValue({
    choices: [
      { finish_reason: "stop", message: { content: '{"answer":"2"}' } },
    ],
  });
  sdk.responses.mockResolvedValue({ status: "completed", output_text: "done" });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("source model API routing and compatibility", () => {
  it("routes every auto task — OCR · figures · solutions — to Claude Sonnet 5.5 (원장님 2026-11-11)", () => {
    const env = { NODE_ENV: "test" as const };
    for (const action of [
      "ocr",
      "page-ocr",
      "figures",
      "figure-redraw",
      "figure-edit",
      "solution",
    ] as const)
      expect(resolveApiModel("auto", action, env)).toEqual({
        vendor: "anthropic",
        model: "claude-sonnet-5-5",
      });
    // 다시 보는 모델도 그리는 모델과 같다
    expect(autoFigureReviewModel(env)).toEqual({
      vendor: "anthropic",
      model: "claude-sonnet-5-5",
    });
    expect(() => resolveApiModel("deepseek", "ocr", env)).toThrow("해설");
    // 되돌리기는 코드 없이 작업 무리마다 운영 환경변수 하나로
    expect(
      resolveApiModel("auto", "page-ocr", {
        ...env,
        STUDIO_AI_OCR_VENDOR: "gemini",
      }),
    ).toEqual({ vendor: "gemini", model: "gemini-3.8-flash" });
    expect(
      resolveApiModel("auto", "figure-redraw", {
        ...env,
        STUDIO_AI_FIGURE_VENDOR: "gemini",
      }),
    ).toEqual({ vendor: "gemini", model: "gemini-3.8-flash" });
    expect(
      resolveApiModel("auto", "solution", {
        ...env,
        STUDIO_AI_SOLUTION_VENDOR: "deepseek",
      }),
    ).toEqual({ vendor: "deepseek", model: "deepseek-flash" });
    // 이미지를 못 보는 DeepSeek · 목록 밖 이름은 받지 않는다
    for (const [name, bad] of [
      ["STUDIO_AI_FIGURE_VENDOR", "deepseek"],
      ["STUDIO_AI_OCR_VENDOR", "deepseek"],
      ["STUDIO_AI_FIGURE_VENDOR", "claude"],
      ["STUDIO_AI_SOLUTION_VENDOR", "auto"],
    ] as const)
      expect(
        () =>
          resolveApiModel("auto", "figure-redraw", { ...env, [name]: bad }) &&
          resolveApiModel("auto", "ocr", { ...env, [name]: bad }) &&
          resolveApiModel("auto", "solution", { ...env, [name]: bad }),
      ).toThrow("서버의 AI 모델 설정");
    expect(() =>
      resolveApiModel("openai", "ocr", {
        ...env,
        STUDIO_AI_OPENAI_MODEL: "https://evil.test",
      }),
    ).toThrow();
  });
  it("sends Sonnet 5.5 without temperature — effort medium for solutions, low otherwise", async () => {
    const fetcher = vi.fn().mockImplementation(async () =>
      Response.json({
        stop_reason: "end_turn",
        content: [
          { type: "thinking", thinking: "" },
          { type: "text", text: "done" },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    for (const [action, effort] of [
      ["solution", "medium"],
      ["page-ocr", "low"],
    ] as const) {
      fetcher.mockClear();
      await expect(
        runModelApi({
          vendor: "anthropic",
          model: "claude-sonnet-5-5",
          action,
          prompt: "p",
          signal: new AbortController().signal,
        } as never),
      ).resolves.toContain("done");
      const body = JSON.parse(fetcher.mock.calls[0][1].body);
      expect(body.model).toBe("claude-sonnet-5-5");
      expect(body.output_config.effort).toBe(effort);
      expect(body).not.toHaveProperty("temperature");
    }
  });
  it("uses Gemini 3.8 thinkingLevel without unsupported sampling or budget", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [{ thought: true, text: "hidden" }, { text: "visible" }],
            },
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    expect(
      await runModelApi({
        vendor: "gemini",
        model: "gemini-3.8-flash",
        prompt: "read",
        imageDataUrl,
        signal: signal(),
      }),
    ).toBe("visible");
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
    );
    expect(url).not.toContain("private-test-key");
    expect(JSON.parse(options.body).generationConfig).toEqual({
      maxOutputTokens: 16000,
      thinkingConfig: { thinkingLevel: "LOW" },
    });
    expect(JSON.parse(options.body).contents[0].parts[1].inlineData).toEqual({
      mimeType: "image/png",
      data: "YWJj",
    });
  });
  it("sends the caller's effort to Claude as output_config and keeps the defaults without it", async () => {
    const fetcher = vi.fn().mockImplementation(async () =>
      Response.json({
        stop_reason: "end_turn",
        content: [{ type: "text", text: "read" }],
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const bodyOf = async (model: string, effort?: "low") => {
      fetcher.mockClear();
      await runModelApi({
        vendor: "anthropic",
        model,
        prompt: "read",
        imageDataUrl,
        signal: signal(),
        ...(effort ? { effort } : {}),
      });
      return JSON.parse(fetcher.mock.calls[0][1].body);
    };
    // 오늘의 영어의 사진 읽기(D-158) — Opus 5.5 는 생각이 늘 켜져 있어 강도로 조절한다. temperature 를 같이 보내지 않는다
    const read = await bodyOf("claude-opus-5-5", "low");
    expect(read.output_config).toEqual({ effort: "low" });
    expect(read).not.toHaveProperty("temperature");
    expect(read.messages[0].content[0]).toMatchObject({
      type: "image",
      source: { media_type: "image/png", data: "YWJj" },
    });
    // 강도를 안 주면 지금 그대로 — 작업실의 호출은 바뀌지 않는다
    const opus = await bodyOf("claude-opus-5");
    expect(opus.output_config).toEqual({ effort: "medium" });
    expect(opus).not.toHaveProperty("temperature");
    const sonnet = await bodyOf("claude-sonnet-4-6");
    expect(sonnet.temperature).toBe(0);
    expect(sonnet).not.toHaveProperty("output_config");
  });
  it.each(["gpt-5.5", "gpt-5-mini", "o3", "o4-mini"])(
    "uses completion token guard for %s",
    async (model) => {
      await runModelApi({
        vendor: "openai",
        model,
        prompt: "read",
        imageDataUrl,
        signal: signal(),
      });
      const body = sdk.chat.mock.calls[0][0];
      expect(body.max_completion_tokens).toBe(16000);
      expect(body).not.toHaveProperty("temperature");
      expect(body).not.toHaveProperty("max_tokens");
    },
  );
  it("uses Responses for Pro and classic token settings for GPT-4", async () => {
    await runModelApi({
      vendor: "openai",
      model: "gpt-5.5-pro",
      prompt: "read",
      imageDataUrl,
      action: "solution",
      signal: signal(),
    });
    expect(sdk.chat).not.toHaveBeenCalled();
    expect(sdk.responses.mock.calls[0][0]).toMatchObject({
      store: false,
      max_output_tokens: 16000,
      reasoning: { effort: "low" },
    });
    await runModelApi({
      vendor: "openai",
      model: "gpt-4.1",
      prompt: "read",
      signal: signal(),
    });
    expect(sdk.chat.mock.calls[0][0]).toMatchObject({
      max_tokens: 16000,
      temperature: 0.1,
    });
  });
  it.each(["deepseek-v4-pro", "deepseek-flash"])(
    "keeps %s text-only with 16000 tokens, low effort and no nested SDK retries",
    async (model) => {
      await runModelApi({
        vendor: "deepseek",
        model,
        prompt: "solve",
        imageDataUrl,
        signal: signal(),
      });
      expect(sdk.construct).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: "https://api.deepseek.com",
          maxRetries: 0,
        }),
      );
      expect(sdk.chat.mock.calls[0][0]).toMatchObject({
        max_tokens: 16000,
        reasoning_effort: "low",
        messages: [{ role: "user", content: "solve" }],
      });
    },
  );
  it.each(["deepseek-v4-pro", "deepseek-flash"])(
    "selects %s through the server override for auto and explicit solutions",
    (model) => {
      const env = {
        NODE_ENV: "test" as const,
        STUDIO_AI_DEEPSEEK_MODEL: model,
      };
      expect(resolveApiModel("deepseek", "solution", env)).toEqual({
        vendor: "deepseek",
        model,
      });
      expect(
        resolveApiModel("auto", "solution", {
          ...env,
          STUDIO_AI_SOLUTION_VENDOR: "deepseek",
        }),
      ).toEqual({ vendor: "deepseek", model });
    },
  );
  it("recovers Responses message text and explicitly reports incomplete token output", async () => {
    sdk.responses.mockResolvedValueOnce({
      status: "completed",
      output_text: "",
      output: [
        { type: "reasoning", summary: [] },
        {
          type: "message",
          content: [{ type: "output_text", text: "fallback answer" }],
        },
      ],
    });
    expect(
      await runModelApi({
        vendor: "openai",
        model: "gpt-5.5-pro",
        prompt: "read",
        signal: signal(),
      }),
    ).toBe("fallback answer");
    sdk.responses.mockResolvedValueOnce({
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output_text: "partial",
    });
    await expect(
      runModelApi({
        vendor: "openai",
        model: "gpt-5.5-pro",
        prompt: "read",
        signal: signal(),
      }),
    ).rejects.toThrow("토큰 한도");
  });
  it("retains safe REST retry metadata and rejects authentication without retrying", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("private provider detail", {
          status: 529,
          headers: { "retry-after": "0.01" },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          candidates: [
            { finishReason: "STOP", content: { parts: [{ text: "done" }] } },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    const pending = runModelApi({
      vendor: "gemini",
      model: "gemini-3.8-flash",
      prompt: "read",
      signal: signal(),
    });
    await vi.advanceTimersByTimeAsync(9);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBe("done");
    sdk.chat.mockRejectedValueOnce({ status: 401, message: "private key" });
    await expect(
      runModelApi({
        vendor: "openai",
        model: "gpt-5.5",
        prompt: "read",
        signal: signal(),
      }),
    ).rejects.toMatchObject({ status: 401, retryable: false });
    expect(sdk.chat).toHaveBeenCalledTimes(1);
  });
  it("marks an auto route unavailable when only an unrelated key exists", () => {
    for (const vendor of ["GEMINI", "DEEPSEEK", "ANTHROPIC"])
      vi.stubEnv(`${vendor}_API_KEY`, "");
    const status = getModelApiStatus();
    expect(status.defaultProvider).toBe("openai");
    expect(
      status.providers.find((provider) => provider.id === "auto"),
    ).toMatchObject({ status: "error", image: false });
    expect(
      status.providers.find((provider) => provider.id === "openai")?.status,
    ).toBe("unverified");
  });
  it("describes the auto route from the live routing table, not a hand-written list", () => {
    // 2026-09-26 원장님 신고: 설명은 «도형 Opus 5» 인데 9-18 부터 도형 기본은 Gemini 였다
    const detail = () =>
      getModelApiStatus().providers.find((provider) => provider.id === "auto")
        ?.detail;
    expect(detail()).toBe(
      "문항 인식 Claude Sonnet 5.5 · 해설 Claude Sonnet 5.5 · 도형 Claude Sonnet 5.5 (작업별 서버 키 필요)",
    );
    vi.stubEnv("STUDIO_AI_FIGURE_VENDOR", "gemini");
    expect(detail()).toBe(
      "문항 인식 Claude Sonnet 5.5 · 해설 Claude Sonnet 5.5 · 도형 Gemini 3.8 Flash (작업별 서버 키 필요)",
    );
    vi.stubEnv("STUDIO_AI_FIGURE_VENDOR", "");
    vi.stubEnv("STUDIO_AI_OCR_VENDOR", "gemini");
    vi.stubEnv("STUDIO_AI_SOLUTION_VENDOR", "deepseek");
    vi.stubEnv("STUDIO_AI_GEMINI_MODEL", "gemini-2.5-pro");
    expect(detail()).toBe(
      "문항 인식 Gemini 2.5 Pro · 해설 DeepSeek Flash · 도형 Claude Sonnet 5.5 (작업별 서버 키 필요)",
    );
    vi.stubEnv("STUDIO_AI_FIGURE_VENDOR", "deepseek");
    expect(detail()).toBe("서버의 AI 모델 설정을 확인해 주세요.");
  });
  it("never leaks provider secrets or accepts partial output", async () => {
    sdk.chat.mockRejectedValueOnce(new Error("private-test-key raw source"));
    await expect(
      runModelApi({
        vendor: "openai",
        model: "gpt-5.5",
        prompt: "private source",
        signal: signal(),
      }),
    ).rejects.not.toThrow("private");
    sdk.chat.mockResolvedValueOnce({
      choices: [{ finish_reason: "length", message: { content: "partial" } }],
    });
    await expect(
      runModelApi({
        vendor: "openai",
        model: "gpt-5.5",
        prompt: "read",
        signal: signal(),
      }),
    ).rejects.toThrow("토큰 한도");
    expect(JSON.stringify(getModelApiStatus())).not.toContain(
      "private-test-key",
    );
  });
  it("does not contact a model when keys are missing or caller cancelled", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(
      runModelApi({
        vendor: "openai",
        model: "gpt-5.5",
        prompt: "read",
        signal: signal(),
      }),
    ).rejects.toThrow("키");
    const abort = new AbortController();
    abort.abort();
    await expect(
      runModelApi({
        vendor: "gemini",
        model: "gemini-3.8-flash",
        prompt: "read",
        signal: abort.signal,
      }),
    ).rejects.toThrow();
    expect(sdk.chat).not.toHaveBeenCalled();
  });
});
