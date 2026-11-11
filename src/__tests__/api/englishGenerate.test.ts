/**
 * POST /api/english/generate — DeepSeek 직접 생성 라우트 (D-148 · 25 §3 · §4.3).
 *
 * 저장하지 않고 초안만 돌려준다(클라이언트가 sets POST). 순서: 세션 401 → 같은 출처 403 → 계약 400 →
 * 시험 404/범위 밖 403 → AI. 오류 순서: AiCapacityError 502 → AiConfigError 503 → 검증기 502 → AiGenerationError 502.
 *
 * ⚠️ `openai` 는 항상 모킹(절대 규칙 7). 시험 소유 판정은 `ownership.ts` 의 `requireOwnedEnglishExam` 을 모킹한다 —
 *    그 헬퍼의 실제 판정(없음 404 · 다른 지점 403 · 최고관리자 통과)은 `englishExams.test.ts` 가 대역 DB 로 잠근다.
 *    (트랙 시절의 임시 `examLookup.ts` 는 base 병합 뒤 걷었다 — ai 검토 D7.)
 *
 * 표본 지문은 우리가 지은 짧은 글이다.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockCreate,
  mockSession,
  mockRequireOwned,
  mockCli,
  mockModels,
  mockBankReference,
  mockBankExam,
  mockRun,
} = vi.hoisted(() => ({
  mockRun: vi.fn(),
  mockCreate: vi.fn(),
  mockSession: vi.fn(),
  mockRequireOwned: vi.fn(),
  mockCli: vi.fn(),
  mockModels: vi.fn(),
  mockBankReference: vi.fn(),
  mockBankExam: vi.fn(),
}));

vi.mock("@/lib/dev-ai/cli", () => ({ runSubscriptionCli: mockCli }));
vi.mock("@/lib/dev-ai/cli-models", async (original) => ({
  ...(await original<object>()),
  readCliModelSettings: mockModels,
}));
vi.mock("@/lib/english/bank/service", async (original) => ({
  ...(await original<object>()),
  validateBankReference: mockBankReference,
  ownedBankExam: mockBankExam,
}));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function OpenAIMock() {
    return { chat: { completions: { create: mockCreate } } };
  }),
}));

// Claude 배관 — vitest 는 .env 를 읽어 진짜 키가 들어올 수 있다. 실호출 금지(절대 규칙 7)
vi.mock("@/lib/studio-ai/api", () => ({ runModelApi: mockRun }));

vi.mock("@/lib/session", () => ({ getSessionUser: mockSession }));

vi.mock("@/lib/ownership", () => ({
  requireOwnedEnglishExam: mockRequireOwned,
}));

import { POST } from "@/app/api/english/generate/route";
import { AI_BUSY_MESSAGE, resetAiAdmission } from "@/lib/aiAdmission";
import { errorResponseSchema } from "@/contracts/common.contract";
import { englishGenerateResponseSchema } from "@/contracts/english.contract";
import { forbiddenError, notFoundError } from "@/lib/apiResponse";
import { ERROR_LOG_ROUTE } from "@/lib/errorLog/withErrorLog";
import { NOT_FOUND_ID, USER_TEACHER_ID } from "@/mocks/data";
import { buildEnglishSystemPrompt } from "@/lib/ai/prompts/englishExam";
import { EnglishBankError } from "@/lib/english/bank/policy";

const ORIGIN = "http://localhost";
const EXAM_ID = "20000000-0000-4000-8000-000000000001";

const teacher = {
  menus: ["english"],
  id: USER_TEACHER_ID,
  email: "teacher@todaysmath.test",
  name: "테스트 강사",
  isAdmin: false,
  isSuperAdmin: false,
  branchId: null,
  branchRole: null,
};

const passage =
  "Sora planted beans in a paper cup on the windowsill. She measured the sprout every morning and drew a small chart. By the end of the week the chart showed that the plant grew faster on sunny days.";

const body = {
  examId: EXAM_ID,
  mode: "original",
  topic: "",
  passage,
  difficulty: "기본",
  count: 1,
  words: 120,
  types: ["내용 일치"],
};

const draft = {
  title: "창가의 콩",
  passage,
  questions: [
    {
      type: "내용 일치",
      prompt: "윗글의 내용과 일치하는 것은?",
      options: [
        "소라는 종이컵에 콩을 심었다.",
        "소라는 밤마다 싹을 쟀다.",
        "식물은 비 오는 날 더 빨리 자랐다.",
        "소라는 사진을 찍었다.",
        "콩은 정원에 심었다.",
      ],
      answer: "1",
      explanation: "첫 문장에 있습니다.",
      evidence: "Sora planted beans in a paper cup on the windowsill.",
    },
  ],
};

function aiTextResponse(text: string) {
  return { choices: [{ message: { content: text }, finish_reason: "stop" }] };
}

function request(
  payload: unknown,
  {
    origin = ORIGIN,
    site = "same-origin",
    url = ORIGIN,
    host,
    signal,
  }: {
    origin?: string | null;
    site?: string;
    url?: string;
    host?: string;
    signal?: AbortSignal;
  } = {},
) {
  return new NextRequest(`${url}/api/english/generate`, {
    method: "POST",
    headers: {
      ...(origin === null ? {} : { origin }),
      ...(host ? { host } : {}),
      "sec-fetch-site": site,
      "content-type": "application/json",
    },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
    signal,
  });
}

const call = (payload: unknown, opts?: Parameters<typeof request>[1]) =>
  (POST as unknown as (r: NextRequest) => Promise<Response>)(
    request(payload, opts),
  );

async function errorOf(response: Response) {
  return errorResponseSchema.parse(await response.json()).error;
}

beforeEach(() => {
  mockCreate.mockReset();
  mockRun.mockReset();
  mockCli.mockReset().mockResolvedValue(JSON.stringify(draft));
  mockModels.mockReset().mockResolvedValue({
    models: ["sonnet"],
    defaultModel: "sonnet",
    efforts: {},
  });
  mockBankReference.mockReset();
  mockBankExam.mockReset();
  resetAiAdmission();
  mockSession.mockReset().mockResolvedValue(teacher);
  // 학년은 본문 어디에도 없는 값으로 — 라우트가 «중1» 을 박아 넣어도 초록이던 구멍(리드 검토 D3)
  mockRequireOwned.mockReset().mockResolvedValue({
    ok: true,
    data: { id: EXAM_ID, grade: "고3", userId: USER_TEACHER_ID },
  });
  vi.unstubAllEnvs();
  vi.stubEnv("AUTH_URL", ORIGIN);
  vi.stubEnv("DEEPSEEK_API_KEY", "test-api-key");
  vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
  vi.stubEnv("OPENAI_API_KEY", "");
  // 기본은 Claude Sonnet 5.5 다(2026-11-11). 이 파일의 대부분은 문지기 · 오류 순서를 OpenAI 호환 대역으로 재므로
  // 되돌리는 길(DeepSeek)로 돌린다 — Claude 기본 경로는 아래 «기본 공급자» 묶음이 본다
  vi.stubEnv("ENGLISH_AI_VENDOR", "deepseek");
  vi.stubEnv("DEV_AI_CODEX_HOME", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/english/generate — 문지기 순서", () => {
  it("라우트 틀을 지난다 — withErrorLog 표지", () => {
    expect((POST as unknown as Record<symbol, string>)[ERROR_LOG_ROUTE]).toBe(
      "/api/english/generate",
    );
  });

  it("세션이 없으면 401 — 시험도 AI 도 안 본다", async () => {
    mockSession.mockResolvedValue(null);
    const res = await call(body);
    expect(res.status).toBe(401);
    expect((await errorOf(res)).code).toBe("UNAUTHORIZED");
    expect(mockRequireOwned).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("다른 출처의 쓰기는 403", async () => {
    const res = await call(body, {
      origin: "https://evil.example",
      site: "cross-site",
    });
    expect(res.status).toBe(403);
    expect((await errorOf(res)).code).toBe("FORBIDDEN");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("계약을 어기면 400 — 본문 없음 · 새 지문인데 소재 없음 · 모르는 유형", async () => {
    const empty = await call("not json");
    expect(empty.status).toBe(400);

    const noTopic = await call({
      ...body,
      mode: "new",
      topic: "",
      passage: "",
    });
    expect(noTopic.status).toBe(400);
    const error = await errorOf(noTopic);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(error.details)).toContain("topic");

    const unknownType = await call({ ...body, types: ["원문 복원"] });
    expect(unknownType.status).toBe(400);
    expect(mockRequireOwned).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("시험이 없으면 404 — 헬퍼의 응답을 그대로 돌려준다", async () => {
    mockRequireOwned.mockResolvedValue({
      ok: false,
      response: notFoundError("시험"),
    });
    const res = await call({ ...body, examId: NOT_FOUND_ID });
    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("NOT_FOUND");
    expect(mockRequireOwned).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER_TEACHER_ID }),
      NOT_FOUND_ID,
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("소유 범위 밖이면 403 — 판정은 requireOwnedEnglishExam 이 한다(D-130 은 englishExams.test.ts 가 잠근다)", async () => {
    mockRequireOwned.mockResolvedValue({
      ok: false,
      response: forbiddenError(),
    });
    const forbidden = await call(body);
    expect(forbidden.status).toBe(403);
    expect((await errorOf(forbidden)).code).toBe("FORBIDDEN");
    expect(mockRequireOwned).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER_TEACHER_ID }),
      EXAM_ID,
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("표의 학년이 계약 목록 밖이면 던진다(withErrorLog 가 기록하고 다시 던져 500) — 조용히 다른 학년으로 만들지 않는다", async () => {
    mockRequireOwned.mockResolvedValue({
      ok: true,
      data: { id: EXAM_ID, grade: "대학생", userId: USER_TEACHER_ID },
    });
    await expect(call(body)).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/english/generate — AI 결과와 오류 순서", () => {
  it("200 — 초안을 계약대로 돌려주고 저장하지 않는다 · 학년은 시험에서 읽어 프롬프트에 싣는다", async () => {
    mockCreate.mockResolvedValueOnce(aiTextResponse(JSON.stringify(draft)));

    const res = await call(body);

    expect(res.status).toBe(200);
    const parsed = englishGenerateResponseSchema.parse(await res.json());
    expect(parsed.data.source).toBe("deepseek");
    // 부른 모델 · 프롬프트 판 — 세트의 «만든 조건»에 실린다(키가 없는 시험 환경이라 DeepSeek)
    expect(parsed.model).toEqual({
      name: "deepseek-v4-pro",
      promptVersion: "v7",
    });
    expect(parsed.data.questions).toHaveLength(1);
    expect(mockRequireOwned).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER_TEACHER_ID }),
      EXAM_ID,
    );
    const sent = mockCreate.mock.calls[0]![0]! as {
      messages: { content: string }[];
    };
    expect(sent.messages[1]?.content).toContain("대상 학년: 고3");
    expect(sent.messages[1]?.content).not.toContain("중1");

    // 다른 시험이면 다른 학년 — 시험에서 읽은 값이 실린다
    mockRequireOwned.mockResolvedValue({
      ok: true,
      data: { id: EXAM_ID, grade: "중2", userId: USER_TEACHER_ID },
    });
    mockCreate.mockResolvedValueOnce(aiTextResponse(JSON.stringify(draft)));
    expect((await call(body)).status).toBe(200);
    const second = mockCreate.mock.calls[1]![0]! as {
      messages: { content: string }[];
    };
    expect(second.messages[1]?.content).toContain("대상 학년: 중2");
  });

  it("길이 한도 → 502 (AiGenerationError 보다 먼저)", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          finish_reason: "length",
          message: { content: "", reasoning_content: "생각만…" },
        },
      ],
    });
    const res = await call(body);
    expect(res.status).toBe(502);
    const error = await errorOf(res);
    expect(error.code).toBe("AI_GENERATION_FAILED");
    expect(error.message).toMatch(/길이 한도/);
  });

  it("키가 없으면 503 «AI 연결이 설정되지 않았습니다.» — 값은 응답에 없다", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    const res = await call(body);
    expect(res.status).toBe(503);
    const error = await errorOf(res);
    expect(error.message).toBe("AI 연결이 설정되지 않았습니다.");
    expect(JSON.stringify(error)).not.toContain("DEEPSEEK");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("검증기 실패(고쳐 쓰기 한 번 뒤에도) → 502 + details 에 문항별 사유", async () => {
    // D-151: 검증기에 걸리면 사유를 되먹여 한 번 고쳐 쓴다 — 고쳐 쓴 것도 같으면 거절
    mockCreate.mockResolvedValue(
      aiTextResponse(
        JSON.stringify({
          ...draft,
          questions: [
            {
              ...draft.questions[0],
              evidence: "invented sentence not in the passage",
            },
          ],
        }),
      ),
    );
    const res = await call(body);
    expect(res.status).toBe(502);
    const error = await errorOf(res);
    expect(error.code).toBe("ENGLISH_DRAFT_REJECTED");
    const details = error.details as {
      issues: { question: number | null; message: string }[];
    };
    expect(details.issues[0]?.question).toBe(0);
    expect(details.issues[0]?.message).toMatch(/근거/);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("두 번 다 못 읽으면 502 일반 실패 — 프롬프트 · 원문은 응답에 없다", async () => {
    mockCreate
      .mockResolvedValueOnce(aiTextResponse("JSON 아님"))
      .mockResolvedValueOnce(aiTextResponse("여전히 아님"));
    const res = await call(body);
    expect(res.status).toBe(502);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain(passage);
    expect(text).not.toContain("passage-data");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});

describe("English development subscription generation — no paid fallback", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_AI_MODE", "subscription-cli");
    vi.stubEnv("DEV_AI_PROVIDER", "claude");
    // Both paid providers are configured: any accidental fallback is observable.
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
  });

  afterEach(() => expect(mockCreate).not.toHaveBeenCalled());

  it.each(["claude", "codex"])(
    "uses %s CLI with the same prompt, grade, validator and legacy source",
    async (provider) => {
      vi.stubEnv("DEV_AI_PROVIDER", provider);
      const model = provider === "claude" ? "sonnet" : "gpt-6-sol";
      mockModels.mockResolvedValue({
        models: [model],
        defaultModel: model,
        efforts: {},
      });
      // Invalid API configuration must not even be consulted in development.
      vi.stubEnv("ENGLISH_AI_VENDOR", "invalid-api-vendor");
      const response = await call(body);
      expect(response.status).toBe(200);
      const result = englishGenerateResponseSchema.parse(await response.json());
      expect(result.model).toEqual({
        name: `${provider}-cli/${model}`,
        promptVersion: "v7",
      });
      expect(result.data.source).toBe("deepseek");
      expect(result.data.questions).toHaveLength(1);
      expect(mockCli).toHaveBeenCalledOnce();
      expect(mockCli).toHaveBeenCalledWith(
        expect.objectContaining({
          provider,
          model,
          signal: expect.any(AbortSignal),
        }),
      );
      const prompt = mockCli.mock.calls[0]![0].prompt as string;
      expect(prompt).toContain(buildEnglishSystemPrompt());
      expect(prompt).toContain("대상 학년: 고3");
      expect(prompt).toContain(passage);
    },
  );

  it("labels an unknown CLI default honestly instead of naming an API model", async () => {
    mockModels.mockResolvedValue({ models: ["sonnet"], efforts: {} });
    const result = englishGenerateResponseSchema.parse(
      await (await call(body)).json(),
    );
    expect(result.model.name).toBe("claude-cli/default");
    expect(mockCli.mock.calls[0]![0]).not.toHaveProperty("model");
  });

  it.each([
    ["DEV_AI_MODE", undefined],
    ["DEV_AI_MODE", ""],
    ["DEV_AI_MODE", "off"],
    ["DEV_AI_MODE", "model-api"],
    ["DEV_AI_PROVIDER", undefined],
    ["DEV_AI_PROVIDER", ""],
    ["DEV_AI_PROVIDER", "unknown"],
    ["DEV_AI_PROVIDER", "grok"],
    ["DEV_AI_PROVIDER", "antigravity"],
  ])("fails closed for %s=%s even with paid API keys", async (key, value) => {
    vi.stubEnv(key!, value);
    const response = await call(body);
    expect(response.status).toBe(503);
    expect((await errorOf(response)).message).toContain("구독 AI");
    expect(mockCli).not.toHaveBeenCalled();
    expect(mockModels).not.toHaveBeenCalled();
  });

  it("sanitizes model configuration failures before invoking the CLI", async () => {
    mockModels.mockRejectedValue(new Error("private-profile-path test-secret"));
    const response = await call(body);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toMatch(
      /private-profile-path|test-secret/,
    );
    expect(mockCli).not.toHaveBeenCalled();
  });

  it.each([
    "login-required",
    "timeout",
    "not-installed",
    "quota-exceeded",
    "launch-failed",
  ])(
    "returns a sanitized failure for CLI %s without retry or API fallback",
    async (reason) => {
      mockCli.mockRejectedValue(
        new Error(`${reason}: secret-token ${passage}`),
      );
      const response = await call(body);
      expect(response.status).toBe(502);
      const text = await response.text();
      expect(text).toContain("구독 CLI");
      expect(text).not.toContain("secret-token");
      expect(text).not.toContain(passage);
      expect(mockCli).toHaveBeenCalledOnce();
    },
  );

  it.each([
    { origin: null },
    { origin: "https://evil.example" },
    { site: "cross-site" },
    { url: "http://192.168.1.2:3000", origin: "http://192.168.1.2:3000" },
    { url: "https://public.example", origin: "https://public.example" },
    { host: "public.example" },
    { host: "public.example@localhost", origin: ORIGIN },
    {
      url: "http://localhost:3000",
      host: "127.0.0.1:4000",
      origin: "http://127.0.0.1:4000",
    },
    {
      url: "http://localhost:3000",
      host: "127.0.0.1:3000",
      origin: "http://localhost:3000",
    },
  ])(
    "rejects nonlocal or nonmatching origin before ownership/CLI: %j",
    async (options) => {
      const response = await call(body, options);
      expect(response.status).toBe(403);
      expect((await errorOf(response)).code).toBe("FORBIDDEN");
      expect(mockRequireOwned).not.toHaveBeenCalled();
      expect(mockModels).not.toHaveBeenCalled();
      expect(mockCli).not.toHaveBeenCalled();
    },
  );

  it.each(["localhost", "127.0.0.1", "[::1]"])(
    "accepts exact %s loopback origin after Next URL normalization",
    async (host) => {
      const response = await call(body, {
        url: "http://localhost:3000",
        host: `${host}:3000`,
        origin: `http://${host}:3000`,
      });
      expect(response.status).toBe(200);
      expect(mockCli).toHaveBeenCalledOnce();
    },
  );

  it("retains session, request-contract and exam ownership checks before CLI setup", async () => {
    mockSession.mockResolvedValueOnce(null);
    expect((await call(body)).status).toBe(401);
    expect((await call("not-json")).status).toBe(400);
    mockRequireOwned.mockResolvedValueOnce({
      ok: false,
      response: forbiddenError(),
    });
    expect((await call(body)).status).toBe(403);
    mockRequireOwned.mockResolvedValueOnce({
      ok: false,
      response: notFoundError("시험"),
    });
    expect((await call(body)).status).toBe(404);
    expect(mockModels).not.toHaveBeenCalled();
    expect(mockCli).not.toHaveBeenCalled();
  });

  it("validates bank permissions, mode and reference before any CLI setup", async () => {
    const passageRef = {
      passageId: EXAM_ID,
      textRevision: 1,
      snapshotHash: "a".repeat(64),
    };
    const bankBody = { ...body, passageRef };
    expect((await call(bankBody)).status).toBe(403);
    mockSession.mockResolvedValue({
      ...teacher,
      menus: ["english-bank", "english-maker"],
    });
    expect(
      (await call({ ...bankBody, mode: "new", topic: "plants" })).status,
    ).toBe(409);
    expect(mockBankReference).not.toHaveBeenCalled();
    mockBankReference.mockRejectedValueOnce(
      new EnglishBankError("RIGHTS_REQUIRED"),
    );
    expect((await call(bankBody)).status).toBe(409);
    expect(mockBankExam).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: teacher.id }),
      EXAM_ID,
    );
    expect(mockBankReference).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: teacher.id }),
      passageRef,
      passage,
      "api",
    );
    expect(mockModels).not.toHaveBeenCalled();
    expect(mockCli).not.toHaveBeenCalled();
    expect((await call(bankBody)).status).toBe(200);
  });

  it("uses CLI for the parse retry and pins its model for feedback refinement", async () => {
    const invalid = {
      ...draft,
      questions: [
        {
          ...draft.questions[0],
          options: draft.questions[0]!.options.slice(0, 4),
        },
      ],
    };
    mockCli
      .mockReset()
      .mockResolvedValueOnce("not-json")
      .mockResolvedValueOnce(JSON.stringify(invalid))
      .mockResolvedValueOnce(JSON.stringify(draft));
    const response = await call(body);
    expect(response.status).toBe(200);
    expect(mockModels).toHaveBeenCalledOnce();
    expect(mockCli).toHaveBeenCalledTimes(3);
    for (const [input] of mockCli.mock.calls)
      expect(input.model).toBe("sonnet");
    expect(mockCli.mock.calls[2]![0].prompt).toContain("지적된 문항만");
    expect(mockCli.mock.calls[2]![0].prompt).toContain("5개");
  });

  it("rejects changed original text after one refinement and returns validation issues", async () => {
    mockCli.mockResolvedValue(
      JSON.stringify({ ...draft, passage: `${passage} Extra sentence.` }),
    );
    const response = await call(body);
    expect(response.status).toBe(502);
    const error = await errorOf(response);
    expect(error.code).toBe("ENGLISH_DRAFT_REJECTED");
    expect(JSON.stringify(error.details)).toContain("원문 유지");
    expect(mockCli).toHaveBeenCalledTimes(2);
  });

  it("passes cancellation to the CLI and releases admission after abort", async () => {
    const controller = new AbortController();
    mockCli.mockImplementationOnce(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise((_, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new Error("private cancellation detail")),
            { once: true },
          );
        }),
    );
    const pending = call(body, { signal: controller.signal });
    await vi.waitFor(() => expect(mockCli).toHaveBeenCalledOnce());
    controller.abort();
    expect(mockCli.mock.calls[0]![0].signal.aborted).toBe(true);
    const response = await pending;
    expect(response.status).toBe(499);
    expect(await response.text()).toBe("");
    expect((await call(body)).status).toBe(200);
  });

  it("does not start the CLI for an already cancelled request", async () => {
    const controller = new AbortController();
    controller.abort();
    expect((await call(body, { signal: controller.signal })).status).toBe(499);
    expect(mockModels).not.toHaveBeenCalled();
    expect(mockCli).not.toHaveBeenCalled();
  });

  it("limits concurrent CLI generation and returns admission after failure", async () => {
    let fail!: (error: Error) => void;
    const pending = new Promise<never>((_, reject) => {
      fail = reject;
    });
    mockCli.mockReturnValue(pending);
    const first = call(body);
    const second = call(body);
    await vi.waitFor(() => expect(mockCli).toHaveBeenCalledTimes(2));
    expect((await call(body)).status).toBe(429);
    fail(new Error("CLI failure"));
    expect((await first).status).toBe(502);
    expect((await second).status).toBe(502);
    mockCli.mockResolvedValue(JSON.stringify(draft));
    expect((await call(body)).status).toBe(200);
  });
});

describe("English production generation keeps the existing API transport", () => {
  it.each(["openai", "deepseek"])(
    "uses %s and ignores enabled development CLI settings",
    async (vendor) => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("DEV_AI_MODE", "subscription-cli");
      vi.stubEnv("DEV_AI_PROVIDER", "claude");
      vi.stubEnv("ENGLISH_AI_VENDOR", vendor);
      vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
      vi.stubEnv("AUTH_URL", "https://school.example");
      mockCreate.mockResolvedValue(aiTextResponse(JSON.stringify(draft)));
      const response = await call(body, {
        url: "https://school.example",
        origin: "https://school.example",
      });
      expect(response.status).toBe(200);
      const result = englishGenerateResponseSchema.parse(await response.json());
      expect(result.model.name).toBe(
        vendor === "openai" ? "gpt-6-luna" : "deepseek-v4-pro",
      );
      expect(result.data.source).toBe("deepseek");
      expect(mockCreate).toHaveBeenCalledOnce();
      expect(mockCli).not.toHaveBeenCalled();
      expect(mockModels).not.toHaveBeenCalled();
    },
  );
});

describe("🔴 한 사람이 동시에 띄우는 생성은 둘까지 (2026-10-07 검수)", () => {
  it("셋째 요청은 모델을 부르지 않고 429 — 앞의 것이 실패로 끝나도 자리는 돌아온다", async () => {
    resetAiAdmission();
    let fail!: (error: Error) => void;
    mockCreate.mockReturnValue(
      new Promise<never>((_, reject) => {
        fail = reject;
      }),
    );

    const first = call(body);
    const second = call(body);
    await vi.waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));

    const third = await call(body);
    expect(third.status).toBe(429);
    expect((await errorOf(third)).message).toBe(AI_BUSY_MESSAGE);
    expect(mockCreate).toHaveBeenCalledTimes(2);

    fail(new Error("upstream"));
    expect((await first).status).toBe(502);
    expect((await second).status).toBe(502);

    mockCreate.mockReset().mockRejectedValue(new Error("again"));
    expect((await call(body)).status).toBe(502);
    expect(mockCreate).toHaveBeenCalled();
  });
});

describe("기본 공급자 — Claude Sonnet 5.5 (원장님 2026-11-11 «전부 sonnet 으로»)", () => {
  beforeEach(() => {
    vi.stubEnv("ENGLISH_AI_VENDOR", "");
  });

  it("200 — 작업실 배관으로 Sonnet 5.5 를 부르고 «만든 조건»에 그 이름을 싣는다", async () => {
    mockRun.mockResolvedValueOnce(JSON.stringify(draft));
    const res = await call(body);
    expect(res.status).toBe(200);
    const parsed = englishGenerateResponseSchema.parse(await res.json());
    expect(parsed.model).toEqual({
      name: "claude-sonnet-5-5",
      promptVersion: "v7",
    });
    expect(parsed.data.source).toBe("deepseek");
    expect(mockRun).toHaveBeenCalledOnce();
    const sent = mockRun.mock.calls[0]![0] as {
      vendor: string;
      model: string;
      effort: string;
      prompt: string;
    };
    expect(sent).toMatchObject({
      vendor: "anthropic",
      model: "claude-sonnet-5-5",
      effort: "medium",
    });
    expect(sent.prompt).toContain(buildEnglishSystemPrompt());
    expect(sent.prompt).toContain("대상 학년: 고3");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("출력 한도로 잘리면 502 «길이 한도»", async () => {
    const { StudioApiError } = await import("@/lib/studio-ai/errors");
    mockRun.mockRejectedValueOnce(
      new StudioApiError(
        "Claude 응답이 출력 토큰 한도로 잘렸습니다. 문항을 나누어 다시 시도해 주세요.",
      ),
    );
    const res = await call(body);
    expect(res.status).toBe(502);
    expect((await errorOf(res)).message).toMatch(/길이 한도/);
  });

  it("상류 실패는 502 일반 실패 — 상류의 문장은 응답에 없다", async () => {
    const { StudioApiError } = await import("@/lib/studio-ai/errors");
    mockRun.mockRejectedValueOnce(
      new StudioApiError("모델 API 요청에 실패했습니다.", 500, true),
    );
    const res = await call(body);
    expect(res.status).toBe(502);
    const error = await errorOf(res);
    expect(error.code).toBe("AI_GENERATION_FAILED");
    expect(error.message).toBe(
      "AI 지문·문제 생성에 실패했습니다. 다시 시도해 주세요.",
    );
  });

  it("ANTHROPIC_API_KEY 가 없으면 503 — 부르지 않고, 키 이름도 응답에 없다", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await call(body);
    expect(res.status).toBe(503);
    const error = await errorOf(res);
    expect(error.message).toBe("AI 연결이 설정되지 않았습니다.");
    expect(JSON.stringify(error)).not.toContain("ANTHROPIC");
    expect(mockRun).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
