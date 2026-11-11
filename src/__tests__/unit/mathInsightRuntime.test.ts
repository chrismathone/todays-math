// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { runModelApi } from "@/lib/studio-ai/api";
import {
  createErrorLogNotes,
  runWithErrorLogNotes,
} from "@/lib/errorLog/scope";
import { createInsightAdmission } from "@/lib/math-insight/admission";
import { insightModelConfig } from "@/lib/math-insight/config";
import { maskInsightQuery } from "@/lib/math-insight/inference";
const input = {
  vendor: "gemini" as const,
  model: "gemini-3.8-flash",
  prompt: "synthetic",
  signal: new AbortController().signal,
};
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("pilot transport controls preserve existing defaults", () => {
  it("single attempt skips retry and suppresses upstream bodies", async () => {
    vi.stubEnv("GEMINI_API_KEY", "synthetic-key");
    const notes = createErrorLogNotes();
    const fetcher = vi.fn(
      async () => new Response("private-student-content", { status: 503 }),
    );
    vi.stubGlobal("fetch", fetcher);
    await expect(
      runWithErrorLogNotes(notes, () =>
        runModelApi({
          ...input,
          singleAttempt: true,
          suppressUpstreamDetails: true,
        }),
      ),
    ).rejects.toMatchObject({ status: 503 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(notes)).not.toContain("private-student-content");
  });
  it("default transport still retries and captures upstream rejection detail", async () => {
    vi.useFakeTimers();
    vi.stubEnv("GEMINI_API_KEY", "synthetic-key");
    const notes = createErrorLogNotes();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("existing-error-detail", { status: 503 }),
      )
      .mockResolvedValueOnce(
        Response.json({
          candidates: [
            { finishReason: "STOP", content: { parts: [{ text: "ok" }] } },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    const pending = runWithErrorLogNotes(notes, () => runModelApi(input));
    await vi.advanceTimersByTimeAsync(2000);
    expect(await pending).toBe("ok");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(notes)).toContain("existing-error-detail");
  });
  it("suppresses raw thrown network messages and preserves abort", async () => {
    vi.stubEnv("GEMINI_API_KEY", "synthetic-key");
    const notes = createErrorLogNotes();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("private-student-content")),
    );
    await expect(
      runWithErrorLogNotes(notes, () =>
        runModelApi({
          ...input,
          singleAttempt: true,
          suppressUpstreamDetails: true,
        }),
      ),
    ).rejects.toThrow();
    expect(JSON.stringify(notes)).not.toContain("private-student-content");
    const c = new AbortController();
    c.abort();
    await expect(
      runModelApi({ ...input, signal: c.signal, singleAttempt: true }),
    ).rejects.toBe(c.signal.reason);
  });
});
describe("feature config and bounded admission", () => {
  it("defaults to Claude Sonnet 5.5 (원장님 2026-11-11) — Gemini only by explicit rollback", () => {
    const env = { NODE_ENV: "test" as const, ANTHROPIC_API_KEY: "synthetic" };
    expect(insightModelConfig(env)).toEqual({
      vendor: "anthropic",
      model: "claude-sonnet-5-5",
    });
    // 문제 추출의 모델 변수는 이 기능을 끌고 가지 않는다
    expect(
      insightModelConfig({
        ...env,
        STUDIO_AI_ANTHROPIC_MODEL: "claude-opus-5",
      }),
    ).toEqual({ vendor: "anthropic", model: "claude-sonnet-5-5" });
    // 되돌리기: MATH_INSIGHT_VENDOR=gemini (키가 있어야 한다 — 없으면 다른 공급자로 새지 않고 null)
    expect(
      insightModelConfig({ ...env, MATH_INSIGHT_VENDOR: "gemini" }),
    ).toBeNull();
    expect(
      insightModelConfig({
        ...env,
        MATH_INSIGHT_VENDOR: "gemini",
        GEMINI_API_KEY: "synthetic",
      }),
    ).toEqual({ vendor: "gemini", model: "gemini-3.8-flash" });
  });
  it("uses only feature/allowed existing models, with no provider fallback", () => {
    const env = { NODE_ENV: "test" as const, GEMINI_API_KEY: "synthetic" };
    // 기본(Claude) 키가 없으면 Gemini 키가 있어도 그리로 가지 않는다
    expect(insightModelConfig(env)).toBeNull();
    expect(
      insightModelConfig({ ...env, MATH_INSIGHT_VENDOR: "anthropic" }),
    ).toBeNull();
    expect(
      insightModelConfig({ ...env, MATH_INSIGHT_MODEL: "unknown" }),
    ).toBeNull();
    expect(
      insightModelConfig({ ...env, MATH_INSIGHT_VENDOR: "openai" }),
    ).toBeNull();
  });
  it("bounds simultaneous requests globally and by teacher, releases once, bounds rate", () => {
    const admit = createInsightAdmission();
    const release = admit("one", 0)!;
    expect(admit("one", 1)).toBeNull();
    const others = Array.from({ length: 7 }, (_, i) => admit(`o${i}`, 0)!);
    expect(admit("overflow", 0)).toBeNull();
    release();
    release();
    expect(admit("new", 0)).toBeTypeOf("function");
    others.forEach((r) => r());
    const rate = createInsightAdmission();
    for (let i = 0; i < 6; i++) rate("same", 0)!();
    expect(rate("same", 1)).toBeNull();
    expect(rate("same", 60000)).toBeTypeOf("function");
  });
  it("masks known identity and fails closed on remaining contacts", () => {
    expect(maskInsightQuery("서연의 분수 기록", ["서연"])).toBe(
      "[대상]의 분수 기록",
    );
    for (const q of [
      "연락 010-1234-5678",
      "person@example.com",
      "d56e582b-a5af-4763-8b0a-801ecff4b5a5",
    ])
      expect(() => maskInsightQuery(q, [])).toThrow();
  });
});
