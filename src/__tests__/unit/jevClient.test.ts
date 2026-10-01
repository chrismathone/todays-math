// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  askJev,
  isJevEnabled,
  JEV_MAX_CHOICES,
  JEV_MAX_STATE_CHARS,
  JEV_TIMEOUT_MS,
  type JevChoiceQuestion,
} from "@/lib/jev/client";

vi.mock("server-only", () => ({}));

const envOf = (
  extra: Record<string, string | undefined> = {},
): NodeJS.ProcessEnv => ({
  NODE_ENV: "test",
  ...extra,
});
const env = envOf({ TYPESAFE_API_KEY: "  synthetic-typesafe-key  " });
const fetchMock = vi.fn<typeof fetch>();
const questions: Record<string, JevChoiceQuestion> = {
  op: {
    type: "choice",
    instructions: "무엇을 하라는 요청인가",
    criteria: { delete: "지운다", addLine: "선분을 더한다", none: "해당 없음" },
  },
};
const choiceAnswer = (extra: Record<string, unknown> = {}) => ({
  type: "choice",
  choice: "delete",
  probabilities: { delete: 0.97, addLine: 0.02, none: 0.01 },
  confidence: 0.94,
  ...extra,
});
const responseBody = (op: unknown = choiceAnswer()) => ({
  model: "jev-1.13.0",
  answers: { op },
  usage: { input_tokens: 10, output_tokens: 20 },
});
const ask = (extra: Partial<Parameters<typeof askJev>[0]> = {}) =>
  askJev({ state: "{}", questions, env, ...extra });

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(Response.json(responseBody()));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("빠른 길 스위치", () => {
  it.each([
    {},
    { TYPESAFE_API_KEY: "   " },
    { AI_GATEWAY_API_KEY: "gateway-only" },
    { VERCEL_OIDC_TOKEN: "oidc-only" },
    {
      AI_GATEWAY_API_KEY: "gateway",
      VERCEL_OIDC_TOKEN: "oidc",
      STUDIO_AI_JEV: "on",
    },
  ])("TypeSafe 키가 없으면 꺼진다: %j", async (extra) => {
    const disabled = envOf(extra);
    expect(isJevEnabled(disabled)).toBe(false);
    expect(await ask({ env: disabled })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("TypeSafe 키만 있으면 켜진다", () => {
    expect(isJevEnabled(env)).toBe(true);
  });

  it.each(["off", " OFF "])(
    "STUDIO_AI_JEV=%s 면 키가 있어도 끈다",
    async (switched) => {
      expect(
        await ask({ env: { ...env, STUDIO_AI_JEV: switched } }),
      ).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("Vitest는 키가 있어도 명시적으로 켜야 한다", () => {
    expect(isJevEnabled({ ...env, VITEST: "true" })).toBe(false);
    expect(
      isJevEnabled({ ...env, VITEST: "true", STUDIO_AI_JEV: " ON " }),
    ).toBe(true);
    vi.stubEnv("TYPESAFE_API_KEY", "synthetic-key");
    vi.stubEnv("STUDIO_AI_JEV", undefined);
    expect(process.env.VITEST).toBeTruthy();
    expect(isJevEnabled()).toBe(false);
  });
});

describe("TypeSafe 직접 HTTP", () => {
  it("서버 키와 jev-latest로 한 번만 POST한다", async () => {
    expect(await ask()).toEqual({ op: { choice: "delete", confidence: 0.94 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(options).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer synthetic-typesafe-key",
        "Content-Type": "application/json",
      },
      redirect: "error",
      cache: "no-store",
      signal: expect.any(AbortSignal),
    });
    // Gateway providerOptions/ZDR, 키, 이미지를 요청 본문에 싣지 않는다.
    expect(JSON.parse(options!.body as string)).toEqual({
      model: "jev-latest",
      state: "{}",
      questions,
    });
  });

  it.each([401, 429, 422, 500, 529])(
    "HTTP %i는 본문을 읽거나 재시도하지 않고 떨어진다",
    async (status) => {
      const response = new Response("private error detail", { status });
      const json = vi.spyOn(response, "json");
      fetchMock.mockResolvedValue(response);
      expect(await ask()).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(json).not.toHaveBeenCalled();
      expect(fetchMock.mock.calls[0][1]!.signal!.aborted).toBe(true);
    },
  );

  it("연결 실패는 재시도하거나 던지지 않는다", async () => {
    fetchMock.mockRejectedValue(new Error("connection failed"));
    await expect(ask()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("JSON이 아닌 응답은 떨어진다", async () => {
    fetchMock.mockResolvedValue(new Response("<html>unavailable</html>"));
    expect(await ask()).toBeNull();
  });

  it.each(["headers", "body"])(
    "%s 대기까지 1.5초로 제한하고 요청을 중단한다",
    async (phase) => {
      vi.useFakeTimers();
      if (phase === "headers") fetchMock.mockReturnValue(new Promise(() => {}));
      else {
        const response = Response.json(responseBody());
        vi.spyOn(response, "json").mockReturnValue(new Promise(() => {}));
        fetchMock.mockResolvedValue(response);
      }
      const pending = ask();
      await vi.advanceTimersByTimeAsync(JEV_TIMEOUT_MS);
      expect(await pending).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][1]!.signal!.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each(["headers", "body"])(
    "%s 대기 중 취소는 fetch가 무시해도 즉시 끝난다",
    async (phase) => {
      vi.useFakeTimers();
      if (phase === "headers") fetchMock.mockReturnValue(new Promise(() => {}));
      else {
        const response = Response.json(responseBody());
        vi.spyOn(response, "json").mockReturnValue(new Promise(() => {}));
        fetchMock.mockResolvedValue(response);
      }
      const controller = new AbortController();
      const remove = vi.spyOn(controller.signal, "removeEventListener");
      const pending = ask({ signal: controller.signal });
      await Promise.resolve();
      controller.abort();
      expect(await pending).toBeNull();
      expect(fetchMock.mock.calls[0][1]!.signal!.aborted).toBe(true);
      expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("이미 멈춘 요청은 부르지 않는다", async () => {
    expect(await ask({ signal: AbortSignal.abort() })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("취소와 함께 도착한 답을 적용하지 않는다", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(async () => {
      controller.abort();
      return Response.json(responseBody());
    });
    expect(await ask({ signal: controller.signal })).toBeNull();
  });

  it("성공 뒤 타이머와 취소 연결을 정리한다", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    expect(await ask({ signal: controller.signal })).not.toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    controller.abort();
    expect(fetchMock.mock.calls[0][1]!.signal!.aborted).toBe(false);
  });

  it("시한 뒤 늦은 실패도 처리한다", async () => {
    vi.useFakeTimers();
    let rejectCall!: (reason: Error) => void;
    fetchMock.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectCall = reject;
      }),
    );
    const pending = ask();
    await vi.advanceTimersByTimeAsync(JEV_TIMEOUT_MS);
    expect(await pending).toBeNull();
    rejectCall(new Error("late failure"));
    await vi.advanceTimersByTimeAsync(0);
  });
});

describe("Choice 계약과 보수적인 확신", () => {
  it.each([
    [0.62, 0.62],
    [0.99, 0.97],
    [0, 0],
  ])(
    "답의 confidence=%s를 선택 확률과 낮은 쪽(%s)으로 읽는다",
    async (confidence, expected) => {
      fetchMock.mockResolvedValue(
        Response.json(responseBody(choiceAnswer({ confidence }))),
      );
      expect(await ask()).toEqual({
        op: { choice: "delete", confidence: expected },
      });
    },
  );

  it.each([
    null,
    {},
    [],
    { answers: [] },
    { answers: {} },
    responseBody({ type: "score", score: 1 }),
    responseBody(choiceAnswer({ choice: "redraw" })),
    responseBody(choiceAnswer({ confidence: undefined })),
    responseBody(choiceAnswer({ confidence: null })),
    responseBody(choiceAnswer({ confidence: "0.99" })),
    responseBody(choiceAnswer({ confidence: -0.1 })),
    responseBody(choiceAnswer({ confidence: 1.1 })),
    responseBody(choiceAnswer({ probabilities: undefined })),
    responseBody(choiceAnswer({ probabilities: [0.97, 0.02, 0.01] })),
    responseBody(choiceAnswer({ probabilities: { delete: 0.97 } })),
    responseBody(
      choiceAnswer({
        probabilities: { delete: 0.97, addLine: 0.02, none: -0.01 },
      }),
    ),
    responseBody(
      choiceAnswer({
        probabilities: { delete: 0.97, addLine: "0.02", none: 0.01 },
      }),
    ),
    responseBody(
      choiceAnswer({
        probabilities: { delete: 0.97, addLine: 0.4, none: 0.01 },
      }),
    ),
    responseBody(
      choiceAnswer({ probabilities: { delete: 0.2, addLine: 0.7, none: 0.1 } }),
    ),
    responseBody(
      choiceAnswer({
        probabilities: { delete: 0.97, addLine: 0.02, none: 0.01, extra: 0 },
      }),
    ),
    // Gateway의 예전 metadata로 직접 API의 누락된 confidence를 채우지 않는다.
    {
      ...responseBody(choiceAnswer({ confidence: undefined })),
      providerMetadata: { typesafe: { confidence: { op: 1 } } },
    },
  ])("잘못되거나 불완전한 응답은 전부 버린다 (%#)", async (body) => {
    fetchMock.mockResolvedValue(Response.json(body));
    expect(await ask()).toBeNull();
  });

  it("물음 하나라도 빠지면 반쪽 답을 돌려주지 않는다", async () => {
    expect(
      await ask({ questions: { ...questions, scope: questions.op } }),
    ).toBeNull();
  });

  it("빈 물음·선택지 또는 입력 상한 초과는 호출하지 않는다", async () => {
    const many = Object.fromEntries(
      Array.from({ length: JEV_MAX_CHOICES + 1 }, (_, i) => [`c${i}`, null]),
    );
    expect(await ask({ questions: {} })).toBeNull();
    for (const criteria of [{}, many]) {
      expect(
        await ask({ questions: { op: { ...questions.op, criteria } } }),
      ).toBeNull();
    }
    expect(
      await ask({ state: "x".repeat(JEV_MAX_STATE_CHARS + 1) }),
    ).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
