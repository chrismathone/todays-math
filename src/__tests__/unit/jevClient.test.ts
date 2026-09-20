// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  askJev,
  isJevEnabled,
  JEV_MAX_CHOICES,
  JEV_MAX_STATE_CHARS,
  JEV_MODEL,
  JEV_TIMEOUT_MS,
  type JevChoiceQuestion,
} from "@/lib/jev/client";

/** 이 저장소의 `NodeJS.ProcessEnv` 는 NODE_ENV 를 요구한다(routing.ts 시험과 같은 결). */
const envOf = (extra: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: "test",
  ...extra,
});

vi.mock("server-only", () => ({}));
vi.mock("ai", () => ({ experimental_evaluate: vi.fn() }));
const evaluateMock = async () =>
  vi.mocked((await import("ai")).experimental_evaluate);

const questions: Record<string, JevChoiceQuestion> = {
  op: {
    type: "choice",
    instructions: "무엇을 하라는 요청인가",
    criteria: { delete: "지운다", addLine: "선분을 더한다", none: "해당 없음" },
  },
};
const answer = (choice: string, confidence: number) => ({
  answers: {
    op: { type: "choice", choice, probabilities: { [choice]: confidence } },
  },
  usage: { inputTokens: 10, outputTokens: 0, totalTokens: 10 },
  warnings: [],
  response: { timestamp: new Date(), modelId: JEV_MODEL },
});

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

describe("빠른 길 스위치", () => {
  it("키도 OIDC 도 없으면 조용히 꺼진다", () => {
    expect(isJevEnabled(envOf())).toBe(false);
    expect(isJevEnabled(envOf({ AI_GATEWAY_API_KEY: "   " }))).toBe(false);
  });

  it("게이트웨이 키나 Vercel OIDC 가 있으면 켜진다", () => {
    expect(isJevEnabled(envOf({ AI_GATEWAY_API_KEY: "key" }))).toBe(true);
    expect(isJevEnabled(envOf({ VERCEL_OIDC_TOKEN: "token" }))).toBe(true);
  });

  it("STUDIO_AI_JEV=off 면 키가 있어도 끈다 — 코드 없이 되돌린다", () => {
    expect(
      isJevEnabled(envOf({ AI_GATEWAY_API_KEY: "key", STUDIO_AI_JEV: "off" })),
    ).toBe(false);
    expect(
      isJevEnabled(envOf({ AI_GATEWAY_API_KEY: "key", STUDIO_AI_JEV: "OFF" })),
    ).toBe(false);
    expect(
      isJevEnabled(envOf({ AI_GATEWAY_API_KEY: "key", STUDIO_AI_JEV: "on" })),
    ).toBe(true);
  });
});

describe("게이트웨이 한 겹", () => {
  it("꺼져 있으면 모델을 아예 부르지 않는다", async () => {
    const evaluate = await evaluateMock();
    expect(await askJev({ state: "{}", questions, env: envOf() })).toBeNull();
    expect(evaluate).not.toHaveBeenCalled();
  });

  it("영 데이터 보존(zeroDataRetention)을 반드시 실어 보낸다", async () => {
    const evaluate = await evaluateMock();
    evaluate.mockResolvedValue(answer("delete", 0.97) as never);
    const result = await askJev({
      state: "{}",
      questions,
      env: envOf({ AI_GATEWAY_API_KEY: "key" }),
    });
    expect(result).toEqual({ op: { choice: "delete", confidence: 0.97 } });
    const call = evaluate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.model).toBe(JEV_MODEL);
    expect(call.providerOptions).toEqual({
      gateway: { zeroDataRetention: true },
    });
    // 재시도는 시한을 넘긴다 — 한 번만 묻는다
    expect(call.maxRetries).toBe(0);
  });

  it("연결이 실패해도 던지지 않고 떨어진다", async () => {
    const evaluate = await evaluateMock();
    evaluate.mockRejectedValue(new Error("gateway down"));
    await expect(
      askJev({
        state: "{}",
        questions,
        env: envOf({ AI_GATEWAY_API_KEY: "key" }),
      }),
    ).resolves.toBeNull();
  });

  it("시한을 넘기면 버린다 — 꼬리 지연이 지금보다 느려지게 두지 않는다", async () => {
    vi.useFakeTimers();
    const evaluate = await evaluateMock();
    evaluate.mockImplementation((() => new Promise(() => {})) as never);
    const pending = askJev({
      state: "{}",
      questions,
      env: envOf({ AI_GATEWAY_API_KEY: "key" }),
    });
    await vi.advanceTimersByTimeAsync(JEV_TIMEOUT_MS + 10);
    expect(await pending).toBeNull();
  });

  it("모양이 다른 응답은 떨어뜨린다", async () => {
    const evaluate = await evaluateMock();
    for (const bad of [
      null,
      {},
      { answers: {} },
      { answers: { op: { type: "score", score: 1 } } },
      // 물음에 없던 선택지
      {
        answers: {
          op: {
            type: "choice",
            choice: "redraw",
            probabilities: { redraw: 1 },
          },
        },
      },
    ]) {
      evaluate.mockResolvedValue(bad as never);
      expect(
        await askJev({
          state: "{}",
          questions,
          env: envOf({ AI_GATEWAY_API_KEY: "key" }),
        }),
      ).toBeNull();
    }
  });

  it("확률을 안 주면 확신 0 으로 읽는다 — 문턱에 걸려 떨어지도록", async () => {
    const evaluate = await evaluateMock();
    evaluate.mockResolvedValue({
      answers: { op: { type: "choice", choice: "delete" } },
      warnings: [],
    } as never);
    expect(
      await askJev({
        state: "{}",
        questions,
        env: envOf({ AI_GATEWAY_API_KEY: "key" }),
      }),
    ).toEqual({ op: { choice: "delete", confidence: 0 } });
  });

  it("선택지가 한도를 넘거나 state 가 너무 크면 부르지 않는다", async () => {
    const evaluate = await evaluateMock();
    evaluate.mockResolvedValue(answer("delete", 0.99) as never);
    const env = envOf({ AI_GATEWAY_API_KEY: "key" });
    const many = Object.fromEntries(
      Array.from({ length: JEV_MAX_CHOICES + 1 }, (_, i) => [`c${i}`, null]),
    );
    expect(
      await askJev({
        state: "{}",
        questions: {
          op: { type: "choice", instructions: "x", criteria: many },
        },
        env,
      }),
    ).toBeNull();
    expect(
      await askJev({
        state: "x".repeat(JEV_MAX_STATE_CHARS + 1),
        questions,
        env,
      }),
    ).toBeNull();
    expect(evaluate).not.toHaveBeenCalled();
  });

  it("이미 멈춘 요청은 부르지 않는다", async () => {
    const evaluate = await evaluateMock();
    const controller = new AbortController();
    controller.abort();
    expect(
      await askJev({
        state: "{}",
        questions,
        env: envOf({ AI_GATEWAY_API_KEY: "key" }),
        signal: controller.signal,
      }),
    ).toBeNull();
    expect(evaluate).not.toHaveBeenCalled();
  });
});
