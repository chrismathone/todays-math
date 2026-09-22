// @vitest-environment node
/**
 * 상류 AI API 의 거절 원문 → 오류 기록 메모 (`src/lib/studio-ai/api.ts`).
 *
 * 전에는 실패 본문을 읽지 않고 버렸다(`body.cancel()`) — 화면에는 우리 문구만 나가야 하니 옳았지만, 그 바람에
 * «왜 거절했나»가 어디에도 안 남았다(2026-09-18 운영 502 16건). 이제 원문은 **오류 기록에만** 남는다:
 *  ⑴ REST(Gemini·Claude) — 상태·주소·Retry-After·본문 앞부분
 *  ⑵ SDK(OpenAI·DeepSeek) — 상태·오류 문구
 *  ⑶ 🔴 화면(StudioApiError 문구)은 그대로 — 원문이 새지 않는다
 *  ⑷ 🔴 키 값이 원문에 되비쳐도 기록에는 거른 값만 남는다
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({ chat: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: sdk.chat } };
    responses = { create: vi.fn() };
  },
}));
import { db } from "@/lib/db";
import { recordErrorLog } from "@/lib/errorLog/record";
import {
  createErrorLogNotes,
  runWithErrorLogNotes,
} from "@/lib/errorLog/scope";
import { runModelApi } from "@/lib/studio-ai/api";

const KEY = "gm-private-test-key-0123";
const signal = () => new AbortController().signal;
beforeEach(() => {
  vi.clearAllMocks();
  for (const vendor of ["OPENAI", "DEEPSEEK", "ANTHROPIC"])
    vi.stubEnv(`${vendor}_API_KEY`, "private-test-key-9999");
  vi.stubEnv("GEMINI_API_KEY", KEY);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("⑴ REST 거절 원문", () => {
  it("상태·주소·본문 앞부분이 메모에 — 화면 문구는 우리 것 그대로", async () => {
    const upstream = {
      error: {
        code: 400,
        message: `API key not valid (${KEY}). Please pass a valid API key.`,
        status: "INVALID_ARGUMENT",
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(upstream, { status: 400 })),
    );
    const notes = createErrorLogNotes();
    const failure = await runWithErrorLogNotes(notes, () =>
      runModelApi({
        vendor: "gemini",
        model: "gemini-3.8-flash",
        prompt: "read",
        signal: signal(),
      }).catch((error: Error) => error),
    );
    // ⑶ 화면으로 가는 문구에는 상류 원문이 없다
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe(
      "모델 API 요청에 실패했습니다. 서버의 연결 설정을 확인해 주세요.",
    );
    expect((failure as Error).message).not.toContain("API key not valid");
    const [entry] = notes.context.upstream as Record<string, unknown>[];
    expect(entry).toMatchObject({
      host: "generativelanguage.googleapis.com",
      path: "/v1beta/models/gemini-3.8-flash:generateContent",
      status: 400,
    });
    expect(entry.body).toContain("API key not valid");

    // ⑷ 기록기를 지나면 키 값은 걸러진다
    await recordErrorLog({
      source: "server",
      kind: "ai-rejected",
      context: notes.context,
    });
    const [row] = await db.errorLog.findMany();
    const text = JSON.stringify(row.context);
    expect(text).toContain("API key not valid");
    expect(text).not.toContain(KEY);
  });

  it("재시도한 실패도 하나씩 — 529 뒤 성공이면 메모에 한 건(성공한 요청은 기록되지 않는다)", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("overloaded", {
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
    const notes = createErrorLogNotes();
    const pending = runWithErrorLogNotes(notes, () =>
      runModelApi({
        vendor: "gemini",
        model: "gemini-3.8-flash",
        prompt: "read",
        signal: signal(),
      }),
    );
    await vi.advanceTimersByTimeAsync(20);
    expect(await pending).toBe("done");
    expect(notes.context.upstream).toEqual([
      expect.objectContaining({
        status: 529,
        retryAfter: "0.01",
        body: "overloaded",
      }),
    ]);
  });
});

describe("⑵ SDK 오류 원문", () => {
  it("상태·문구가 메모에 — 화면 문구는 우리 것 그대로", async () => {
    sdk.chat.mockRejectedValueOnce(
      Object.assign(new Error("400 Invalid schema for response_format"), {
        status: 400,
      }),
    );
    const notes = createErrorLogNotes();
    const failure = await runWithErrorLogNotes(notes, () =>
      runModelApi({
        vendor: "openai",
        model: "gpt-5.5",
        prompt: "read",
        signal: signal(),
      }).catch((error: Error) => error),
    );
    expect((failure as Error).message).not.toContain("Invalid schema");
    expect(notes.context.upstream).toEqual([
      expect.objectContaining({
        vendor: "openai",
        model: "gpt-5.5",
        status: 400,
        message: expect.stringContaining("Invalid schema for response_format"),
      }),
    ]);
  });
});

describe("요청 밖에서는 아무 일도 없다", () => {
  it("범위 없이 불러도 전과 같이 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 403 })),
    );
    await expect(
      runModelApi({
        vendor: "gemini",
        model: "gemini-3.8-flash",
        prompt: "read",
        signal: signal(),
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
