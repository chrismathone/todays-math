// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { runModelApi } from "@/lib/studio-ai/api";

const schema = {
  type: "object",
  properties: { intent: { type: "string", enum: ["explain", "unknown"] } },
  required: ["intent"],
  additionalProperties: false,
};
const text = '{"intent":"explain"}';
beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "synthetic-key");
  vi.stubEnv("GEMINI_API_KEY", "synthetic-key");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const input = (vendor: "anthropic" | "gemini" | "openai", model: string) => ({
  vendor,
  model,
  prompt: "synthetic classification",
  signal: new AbortController().signal,
  singleAttempt: true,
  jsonSchema: schema,
});
describe("opt-in provider JSON schema transport", () => {
  it.each([
    ["claude-opus-5", undefined, "medium"],
    ["claude-sonnet-4-6", "low", "low"],
    ["claude-sonnet-4-6", undefined, undefined],
  ] as const)(
    "merges native Claude format with existing %s effort %s",
    async (model, effort, expectedEffort) => {
      const transport = vi.fn().mockResolvedValue(
        Response.json({
          model,
          id: "msg_synthetic",
          stop_reason: "end_turn",
          content: [{ type: "text", text }],
        }),
      );
      vi.stubGlobal("fetch", transport);
      const receipt = vi.fn();
      await expect(
        runModelApi({
          ...input("anthropic", model),
          effort,
          onReceipt: receipt,
        }),
      ).resolves.toBe(text);
      const body = JSON.parse(transport.mock.calls[0][1].body);
      expect(body.output_config).toEqual({
        ...(expectedEffort ? { effort: expectedEffort } : {}),
        format: { type: "json_schema", schema },
      });
      expect(body.temperature).toBe(expectedEffort ? undefined : 0);
      expect(receipt).toHaveBeenCalledOnce();
      expect(receipt.mock.calls[0][0]).toMatchObject({
        reportedModel: model,
        completionReason: "end_turn",
      });
      expect(transport).toHaveBeenCalledOnce();
    },
  );
  it("sends the current generateContent responseFormat without deprecated fields", async () => {
    const transport = vi.fn().mockResolvedValue(
      Response.json({
        candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }],
      }),
    );
    vi.stubGlobal("fetch", transport);
    await expect(
      runModelApi(input("gemini", "gemini-3.8-flash")),
    ).resolves.toBe(text);
    const config = JSON.parse(transport.mock.calls[0][1].body).generationConfig;
    expect(config.responseFormat).toEqual({
      text: { mimeType: "APPLICATION_JSON", schema },
    });
    expect(config).not.toHaveProperty("responseMimeType");
    expect(config).not.toHaveProperty("responseJsonSchema");
    expect(transport).toHaveBeenCalledOnce();
  });
  it("leaves existing callers' provider format untouched", async () => {
    const transport = vi.fn().mockResolvedValue(
      Response.json({
        model: "claude-sonnet-4-6",
        stop_reason: "end_turn",
        content: [{ type: "text", text: "plain answer" }],
      }),
    );
    vi.stubGlobal("fetch", transport);
    const plain = {
      ...input("anthropic", "claude-sonnet-4-6"),
      jsonSchema: undefined,
    };
    await expect(runModelApi(plain)).resolves.toBe("plain answer");
    const body = JSON.parse(transport.mock.calls[0][1].body);
    expect(body).not.toHaveProperty("output_config");
    expect(body.temperature).toBe(0);
  });
  it("rejects unsupported schema providers before credentials or network", async () => {
    const transport = vi.fn();
    vi.stubGlobal("fetch", transport);
    await expect(
      runModelApi(input("openai", "synthetic-unused")),
    ).rejects.toThrow("구조화 응답");
    expect(transport).not.toHaveBeenCalled();
  });
});
