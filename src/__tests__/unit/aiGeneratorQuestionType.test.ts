// @vitest-environment node
/**
 * 🔴→🟢 `generateProblems` 가 **형식을 적어서** 내보낸다 (원장님 지적 2026-08-26 ③).
 *
 * 대응 구현: src/lib/ai/generator.ts · src/lib/ai/questionType.ts
 *
 * 규칙 자체는 `aiQuestionType.test.ts` 가 지킨다. 이 파일이 지키는 것은 **배선**이다 —
 * 규칙이 옳아도 생성기가 그 값을 draft 에 안 실으면 DB 에는 여전히 null 이 간다
 * (CLAUDE.md 2026-08-18 「규칙이 옳아도 배선이 한쪽만 되면 그쪽 지표만 좋아진다」).
 *
 * ⚠️ AI 호출(`fetch` → Anthropic Messages API)은 항상 모킹한다(절대 규칙 7). **실물 호출은
 *    `scripts/qa/probe-ai-generate-live.ts` 가 담당한다** — 그 축이 시험에는 없다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

// 문항 AI 는 Claude(Anthropic Messages API)다(원장님 2026-11-11) — `fetch` 를 갈아 끼운다.
vi.mock("server-only", () => ({}));

import { claudeText, stubClaudeFetch } from "../helpers/claudeMessagesMock";

import { generateProblems } from "@/lib/ai/generator";

function aiTextResponse(text: string) {
  return claudeText(text);
}

const UNIT_ID = "00000000-0000-4000-8000-0000000000aa";

beforeEach(() => {
  mockCreate.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-api-key");
  vi.stubEnv("PROBLEM_AI_VENDOR", "");
  stubClaudeFetch(mockCreate);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateProblems — draft 에 questionType 이 실린다", () => {
  it("주관식·서술형·객관식을 각각 제 갈래로 적는다", async () => {
    mockCreate.mockResolvedValueOnce(
      aiTextResponse(
        JSON.stringify([
          {
            problemType: "계산",
            content: "$2^4$의 약수의 개수를 구하시오.",
            answer: "5",
            solution: null,
          },
          {
            problemType: "서술형",
            content: "그 이유를 소인수분해를 이용하여 설명하시오.",
            answer: "2",
            solution: null,
          },
          {
            problemType: "개념",
            content: "다음 중 소수는?\n① 4\n② 6\n③ 7\n④ 8\n⑤ 9",
            answer: "③",
            solution: null,
          },
        ]),
      ),
    );

    const drafts = await generateProblems({
      unitId: UNIT_ID,
      unitLabel: "중1 1. 소인수분해 소인수분해",
      difficulty: "기본",
      count: 3,
    });

    expect(drafts.map((d) => d.questionType)).toEqual([
      "단답형",
      "서술형",
      "객관식",
    ]);
  });

  it("보기 표식이 「1.」 꼴이어도 지면 파서와 같은 눈으로 센다", async () => {
    // 손으로 `①` 만 찾는 정규식을 쓰면 이 문항이 「보기 0칸」으로 읽혀 단답형이 된다.
    // 보기를 세는 자리는 지면 파서(`parseProblemContent`) **하나**여야 한다.
    mockCreate.mockResolvedValueOnce(
      aiTextResponse(
        JSON.stringify([
          {
            problemType: "개념",
            content: "다음 중 옳은 것은?\n1. 4\n2. 6\n3. 7\n4. 8\n5. 9",
            answer: "③",
            solution: null,
          },
        ]),
      ),
    );

    const [draft] = await generateProblems({
      unitId: UNIT_ID,
      unitLabel: "중1 1. 소인수분해 소인수분해",
      difficulty: "기본",
      count: 1,
    });

    expect(draft?.questionType).toBe("객관식");
  });

  it("E2E 모의 경로(E2E_MOCK_AI=1)도 형식을 비워 두지 않는다", async () => {
    // 모의가 null 을 내면 E2E 에서만 `[?형식]` 이 되살아난다 — 실물과 같은 축을 갖게 한다.
    vi.stubEnv("E2E_MOCK_AI", "1");
    const drafts = await generateProblems({
      unitId: UNIT_ID,
      unitLabel: "중1 1. 소인수분해 소인수분해",
      difficulty: "기본",
      count: 2,
    });
    expect(mockCreate).not.toHaveBeenCalled();
    for (const draft of drafts) expect(draft.questionType).toBe("단답형");
  });
});
