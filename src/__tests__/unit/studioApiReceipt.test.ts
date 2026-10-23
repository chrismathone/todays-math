// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
const sdk = vi.hoisted(() => ({ chat: vi.fn(), responses: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: sdk.chat } };
    responses = { create: sdk.responses };
  },
}));
import { runModelApi } from "@/lib/studio-ai/api";
beforeEach(() => {
  vi.clearAllMocks();
  for (const vendor of ["GEMINI", "ANTHROPIC", "OPENAI"])
    vi.stubEnv(`${vendor}_API_KEY`, "synthetic-private-key");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const signal = () => new AbortController().signal;
const gemini = (extra = {}) => ({
  candidates: [
    { finishReason: "STOP", content: { parts: [{ text: "visible" }] } },
  ],
  ...extra,
});
describe("successful inference receipt from actual response fields", () => {
  it("binds returned Gemini model and text without exporting prompt or credential", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          gemini({
            modelVersion: "reported-model-version",
            responseId: "actual-response",
            usageMetadata: {
              promptTokenCount: 10,
              candidatesTokenCount: 4,
              totalTokenCount: 17,
              thoughtsTokenCount: 3,
            },
          }),
        ),
      ),
    );
    const receipt = vi.fn();
    await expect(
      runModelApi({
        vendor: "gemini",
        model: "requested-alias",
        prompt: "private-source-not-for-receipt",
        signal: signal(),
        onReceipt: receipt,
      }),
    ).resolves.toBe("visible");
    expect(receipt).toHaveBeenCalledOnce();
    expect(receipt.mock.calls[0][0]).toEqual({
      vendor: "gemini",
      requestedModel: "requested-alias",
      reportedModel: "reported-model-version",
      responseId: "actual-response",
      completionReason: "STOP",
      responseTextHash: `sha256:${createHash("sha256").update("visible").digest("hex")}`,
      usage: {
        inputTokens: 10,
        outputTokens: 4,
        totalTokens: 17,
        thinkingTokens: 3,
        cachedInputTokens: null,
        cacheCreationInputTokens: null,
      },
    });
    expect(JSON.stringify(receipt.mock.calls)).not.toMatch(
      /private-source|synthetic-private-key/,
    );
  });
  it("records Claude reported usage without inventing total or thinking tokens", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          model: "actual-claude-version",
          id: "msg_actual",
          stop_reason: "end_turn",
          content: [
            { type: "thinking", thinking: "not returned" },
            { type: "text", text: "answer" },
          ],
          usage: {
            input_tokens: 7,
            output_tokens: 9,
            cache_read_input_tokens: 20,
            cache_creation_input_tokens: 30,
          },
        }),
      ),
    );
    const receipt = vi.fn();
    expect(
      await runModelApi({
        vendor: "anthropic",
        model: "requested-claude",
        prompt: "read",
        signal: signal(),
        onReceipt: receipt,
      }),
    ).toBe("answer");
    expect(receipt.mock.calls[0][0]).toMatchObject({
      reportedModel: "actual-claude-version",
      responseId: "msg_actual",
      usage: {
        inputTokens: 7,
        outputTokens: 9,
        totalTokens: null,
        thinkingTokens: null,
        cachedInputTokens: 20,
        cacheCreationInputTokens: 30,
      },
    });
  });
  it("keeps absent model and invalid token counters unknown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          gemini({
            usageMetadata: {
              promptTokenCount: -1,
              candidatesTokenCount: "4",
              totalTokenCount: 1.5,
            },
          }),
        ),
      ),
    );
    const receipt = vi.fn();
    await runModelApi({
      vendor: "gemini",
      model: "never-report-as-actual",
      prompt: "read",
      signal: signal(),
      onReceipt: receipt,
    });
    expect(receipt.mock.calls[0][0]).toMatchObject({
      reportedModel: null,
      responseId: null,
      usage: { inputTokens: null, outputTokens: null, totalTokens: null },
    });
  });
  it("does not issue a success receipt for incomplete output", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
        ),
    );
    const receipt = vi.fn();
    await expect(
      runModelApi({
        vendor: "gemini",
        model: "requested",
        prompt: "read",
        signal: signal(),
        singleAttempt: true,
        onReceipt: receipt,
      }),
    ).rejects.toThrow("한도");
    expect(receipt).not.toHaveBeenCalled();
  });
  it("does not retry a completed provider request when its receipt consumer fails", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(async () => Response.json(gemini()));
    vi.stubGlobal("fetch", fetcher);
    await expect(
      runModelApi({
        vendor: "gemini",
        model: "requested",
        prompt: "read",
        signal: signal(),
        onReceipt() {
          throw new Error("network receipt storage failure");
        },
      }),
    ).rejects.toThrow("receipt storage");
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("keeps SDK chat and Responses metadata distinct from requested aliases", async () => {
    sdk.chat.mockResolvedValue({
      id: "chat_actual",
      model: "chat-version",
      choices: [{ finish_reason: "stop", message: { content: "chat" } }],
      usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
    });
    sdk.responses.mockResolvedValue({
      id: "response_actual",
      model: "response-version",
      status: "completed",
      output_text: "response",
      usage: {
        input_tokens: 6,
        output_tokens: 7,
        total_tokens: 13,
        output_tokens_details: { reasoning_tokens: 2 },
      },
    });
    const receipts = vi.fn();
    expect(
      await runModelApi({
        vendor: "openai",
        model: "gpt-4.1",
        prompt: "read",
        signal: signal(),
        onReceipt: receipts,
      }),
    ).toBe("chat");
    expect(
      await runModelApi({
        vendor: "openai",
        model: "gpt-5.5-pro",
        prompt: "read",
        signal: signal(),
        onReceipt: receipts,
      }),
    ).toBe("response");
    expect(receipts.mock.calls[0][0]).toMatchObject({
      reportedModel: "chat-version",
      responseId: "chat_actual",
      usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 },
    });
    expect(receipts.mock.calls[1][0]).toMatchObject({
      reportedModel: "response-version",
      responseId: "response_actual",
      usage: {
        inputTokens: 6,
        outputTokens: 7,
        totalTokens: 13,
        thinkingTokens: 2,
      },
    });
  });
});
