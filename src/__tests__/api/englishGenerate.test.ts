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
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockCreate, mockSession, mockRequireOwned } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockSession: vi.fn(),
  mockRequireOwned: vi.fn(),
}));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function OpenAIMock() {
    return { chat: { completions: { create: mockCreate } } };
  }),
}));

vi.mock("@/lib/session", () => ({ getSessionUser: mockSession }));

vi.mock("@/lib/ownership", () => ({
  requireOwnedEnglishExam: mockRequireOwned,
}));

import { POST } from "@/app/api/english/generate/route";
import { errorResponseSchema } from "@/contracts/common.contract";
import { englishGenerateResponseSchema } from "@/contracts/english.contract";
import { forbiddenError, notFoundError } from "@/lib/apiResponse";
import { ERROR_LOG_ROUTE } from "@/lib/errorLog/withErrorLog";
import { NOT_FOUND_ID, USER_TEACHER_ID } from "@/mocks/data";

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
  }: { origin?: string; site?: string } = {},
) {
  return new NextRequest(`${ORIGIN}/api/english/generate`, {
    method: "POST",
    headers: {
      origin,
      "sec-fetch-site": site,
      "content-type": "application/json",
    },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
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
  mockSession.mockReset().mockResolvedValue(teacher);
  // 학년은 본문 어디에도 없는 값으로 — 라우트가 «중1» 을 박아 넣어도 초록이던 구멍(리드 검토 D3)
  mockRequireOwned.mockReset().mockResolvedValue({
    ok: true,
    data: { id: EXAM_ID, grade: "고3", userId: USER_TEACHER_ID },
  });
  vi.unstubAllEnvs();
  vi.stubEnv("AUTH_URL", ORIGIN);
  vi.stubEnv("DEEPSEEK_API_KEY", "test-api-key");
  // OpenAI 키가 있으면 영어는 luna 로 간다 — 이 파일은 DeepSeek 경로를 본다
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("ENGLISH_AI_VENDOR", "");
});

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
