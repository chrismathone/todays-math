/**
 * 오늘의 영어 — 1판 경로가 2판 값을 «줄여서» 받지 않는다 (자료 개선 M0, docs/planning/english-material-upgrade-20261002.md §B).
 *
 * 🔴 붙여넣기 · 서버 AI 는 모르는 칸을 버리고 초안을 세운다(`coerceEnglishDraftShape` — 번호 · 난이도 같은 덧붙임 때문).
 * 그 길로 2판 문서나 표적이 든 문항이 들어오면 표적과 표적별 정답이 사라진 1판 세트가 저장된다.
 * 여기서 재는 것: 그 값은 **거절**되고, 평범한 1판 답은 전과 똑같이 통과한다.
 *
 * ⚠️ `openai` SDK 는 항상 `vi.mock` — 실제 AI API 를 부르지 않는다(CLAUDE.md 절대 규칙 7).
 * 표본 지문은 우리가 지은 글이다(`src/mocks/englishV2Fixtures.ts`).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreate, mockRun } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockRun: vi.fn(),
}));

// Claude 배관 — vitest 는 .env 를 읽는다. 기본 공급자(Claude)로 새어도 실호출이 나가지 않게
vi.mock("@/lib/studio-ai/api", () => ({ runModelApi: mockRun }));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function OpenAIMock() {
    return { chat: { completions: { create: mockCreate } } };
  }),
}));

import {
  buildChatgptFixRequest,
  coerceEnglishDraftShape,
  parseChatgptResult,
} from "@/lib/english/chatgpt";
import {
  EnglishDraftRejectedError,
  generateEnglishDraft,
} from "@/lib/english/generate";
import { ENGLISH_VERSION_MESSAGES } from "@/lib/english/v2/versionGate";
import { validateEnglishDraft } from "@/lib/english/validate";
import {
  englishV1LegacySet,
  englishV2TwoTargetDocument,
} from "@/mocks/englishV2Fixtures";

const request = {
  mode: "original" as const,
  topic: "",
  passage: englishV1LegacySet().passage,
  difficulty: "표준" as const,
  count: 2,
  words: 200,
  types: ["주제", "서술형"] as ("주제" | "서술형")[],
};

/** AI 가 낸 1판 답 — 세트의 지문 · 문항 그대로 */
const v1Answer = () => {
  const { title, passage, questions } = englishV1LegacySet();
  return { title, passage, questions: structuredClone(questions) };
};
const v2Targets = () => englishV2TwoTargetDocument().items[0]!.targets;
const fenced = (value: unknown) =>
  "```json\n" + JSON.stringify(value, null, 2) + "\n```";

function messagesOf(verdict: ReturnType<typeof parseChatgptResult>): string[] {
  if (verdict.ok) throw new Error("통과했다 — 거절돼야 하는 표본이다");
  return verdict.issues.map((issue) => issue.message);
}

describe("붙여넣기 — parseChatgptResult", () => {
  it("평범한 1판 답은 전과 같이 통과한다 — 덧붙은 번호 · 난이도 칸은 버린다", () => {
    const answer = v1Answer() as unknown as {
      questions: Record<string, unknown>[];
    };
    answer.questions[0]!.number = 1;
    answer.questions[0]!.difficulty = "중";
    const verdict = parseChatgptResult(fenced(answer), request);
    expect(verdict.ok).toBe(true);
    if (!verdict.ok) return;
    expect(verdict.draft.questions).toEqual(englishV1LegacySet().questions);
    expect(verdict.draft.source).toBe("chatgpt");
  });

  it("schemaVersion: 1 을 적은 1판 답도 통과한다", () => {
    const verdict = parseChatgptResult(
      fenced({ ...v1Answer(), schemaVersion: 1 }),
      request,
    );
    expect(verdict.ok).toBe(true);
  });

  it("🔴 2판 문서를 붙여 넣으면 거절한다 — 1판 초안으로 줄여 세우지 않는다", () => {
    const messages = messagesOf(
      parseChatgptResult(fenced(englishV2TwoTargetDocument())),
    );
    expect(messages).toEqual([ENGLISH_VERSION_MESSAGES.v2Payload]);
  });

  it("🔴 표적이 든 문항(판 표지 없음)도 거절한다 — 표적을 버리고 통과시키지 않는다", () => {
    const answer = v1Answer() as unknown as {
      questions: Record<string, unknown>[];
    };
    answer.questions[0]!.targets = v2Targets();
    const messages = messagesOf(parseChatgptResult(fenced(answer), request));
    expect(messages).toEqual([ENGLISH_VERSION_MESSAGES.v2Fields]);
  });

  it.each([3, "2", null])("🔴 모르는 판 %j 는 거절한다", (schemaVersion) => {
    const messages = messagesOf(
      parseChatgptResult(fenced({ ...v1Answer(), schemaVersion }), request),
    );
    expect(messages).toEqual([ENGLISH_VERSION_MESSAGES.unsupportedVersion]);
  });
});

describe("모양 받아 주기 — coerceEnglishDraftShape", () => {
  it("🔴 판 표지와 2판 칸은 버리지 않고 실어 넘긴다 — 검증기가 볼 수 있게", () => {
    const answer = { ...v1Answer(), schemaVersion: 2 } as unknown as {
      questions: Record<string, unknown>[];
    };
    answer.questions[1]!.targets = v2Targets();
    const coerced = coerceEnglishDraftShape(answer, "chatgpt") as {
      schemaVersion?: unknown;
      questions: Record<string, unknown>[];
    };
    expect(coerced.schemaVersion).toBe(2);
    expect(coerced.questions[1]!.targets).toEqual(v2Targets());
    expect(validateEnglishDraft(coerced).ok).toBe(false);
  });

  it("2판 문서의 바깥 칸(items · passages)도 실어 넘긴다", () => {
    const coerced = coerceEnglishDraftShape(
      englishV2TwoTargetDocument(),
      "chatgpt",
    ) as Record<string, unknown>;
    expect(coerced.schemaVersion).toBe(2);
    expect(coerced.items).toBeDefined();
    expect(coerced.passages).toBeDefined();
  });

  it("1판 답에서는 전과 같다 — 낯선 칸은 버리고, schemaVersion: 1 표지도 뗀다", () => {
    const answer = {
      ...v1Answer(),
      schemaVersion: 1,
      note: "x",
    } as unknown as {
      questions: Record<string, unknown>[];
    };
    answer.questions[0]!.number = 1;
    const coerced = coerceEnglishDraftShape(answer, "chatgpt") as Record<
      string,
      unknown
    >;
    expect(Object.keys(coerced).sort()).toEqual([
      "passage",
      "questions",
      "source",
      "title",
    ]);
    expect(
      Object.keys((coerced.questions as Record<string, unknown>[])[0]!).sort(),
    ).toEqual([
      "answer",
      "evidence",
      "explanation",
      "options",
      "prompt",
      "type",
    ]);
  });
});

describe("1판 초안 검증기 — validateEnglishDraft", () => {
  it("🔴 2판 값은 사유 한 줄로 거절한다 — 1판 규칙(보기 5개 …)으로 재지 않는다", () => {
    const verdict = validateEnglishDraft(englishV2TwoTargetDocument());
    expect(verdict).toEqual({
      ok: false,
      issues: [{ question: null, message: ENGLISH_VERSION_MESSAGES.v2Payload }],
    });
  });

  it("1판 초안은 전과 같이 통과한다", () => {
    const verdict = validateEnglishDraft({ ...v1Answer(), source: "chatgpt" });
    expect(verdict.ok).toBe(true);
  });
});

describe("고쳐 달라 요청문 — buildChatgptFixRequest", () => {
  it("🔴 2판 문서에는 요청문을 만들지 않는다 — ChatGPT 에게 1판으로 줄여 다시 쓰라고 시키지 않는다", () => {
    expect(
      buildChatgptFixRequest({
        request,
        pasted: fenced(englishV2TwoTargetDocument()),
      }),
    ).toBeNull();
  });

  it("1판 답이 규칙에 걸렸을 때는 전과 같이 요청문을 만든다", () => {
    const answer = v1Answer();
    answer.questions[0]!.options = answer.questions[0]!.options.slice(0, 4);
    const fix = buildChatgptFixRequest({ request, pasted: fenced(answer) });
    expect(fix).toContain("[고칠 곳]");
    expect(fix).toContain("보기는 5개여야 합니다");
  });
});

describe("서버 AI — generateEnglishDraft", () => {
  const aiText = (value: unknown) => ({
    choices: [
      { message: { content: JSON.stringify(value) }, finish_reason: "stop" },
    ],
  });
  const input = {
    ...request,
    examId: "20000000-0000-4000-8000-000000000001",
  };

  beforeEach(() => {
    mockCreate.mockReset();
    vi.unstubAllEnvs();
    vi.stubEnv("DEEPSEEK_API_KEY", "test-api-key");
    vi.stubEnv("OPENAI_API_KEY", "");
    // 거절 규칙은 공급자와 무관하다 — OpenAI 호환 대역을 쓰는 되돌리는 길(DeepSeek)로 잰다
    vi.stubEnv("ENGLISH_AI_VENDOR", "deepseek");
  });

  it("🔴 AI 가 표적이 든 답을 내면 초안으로 받지 않는다 — 고쳐 쓴 답도 같으면 거절", async () => {
    const answer = v1Answer() as unknown as {
      questions: Record<string, unknown>[];
    };
    answer.questions[0]!.targets = v2Targets();
    mockCreate.mockResolvedValue(aiText(answer));

    const error = await generateEnglishDraft(input, "중2").catch((e) => e);
    expect(error).toBeInstanceOf(EnglishDraftRejectedError);
    expect((error as EnglishDraftRejectedError).issues).toEqual([
      { question: null, message: ENGLISH_VERSION_MESSAGES.v2Fields },
    ]);
  });

  it("평범한 1판 답은 전과 같이 초안이 된다", async () => {
    mockCreate.mockResolvedValue(aiText(v1Answer()));
    const draft = await generateEnglishDraft(input, "중2");
    expect(draft.questions).toEqual(englishV1LegacySet().questions);
    expect(draft.source).toBe("deepseek");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
