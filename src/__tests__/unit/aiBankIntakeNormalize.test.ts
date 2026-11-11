// @vitest-environment node
/**
 * 문제은행으로 들어가는 AI 글(생성·변형)도 작업실 입구와 **같은 후보정**을 거친다
 * (2026-09-26 후보정 감사 report-paths.md K).
 *
 * 전에는 `normalizeLatex`(`\dfrac`→`\frac`) 하나뿐이라, 작업실 입구
 * (`src/lib/dev-ai/tasks.ts` → `normalizeMathgenText`)가 고치는 모양 — 산문 앞 가짜
 * 디스플레이, 닫히지 않은 `$$`, JSON 제어문자 손상 — 이 그대로 DB 에 들어갔다.
 * 화면은 렌더 때 다시 후보정하지만 DB 값은 날것이라 DB 를 읽는 다른 자리(내보내기·
 * 채점)는 다른 글을 봤다(원장님 원칙 «같은 데이터는 모든 화면에서 같은 모양»).
 *
 * ⚠️ AI 호출(`fetch` → Anthropic Messages API)은 항상 모킹한다(절대 규칙 7).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

// 문항 AI 는 Claude(Anthropic Messages API)다(원장님 2026-11-11) — `fetch` 를 갈아 끼운다.
vi.mock("server-only", () => ({}));

import { claudeText, stubClaudeFetch } from "../helpers/claudeMessagesMock";

import { generateProblems } from "@/lib/ai/generator";
import { transformProblem } from "@/lib/ai/transformer";
import {
  normalizeMathgenAnswer,
  normalizeMathgenText,
} from "@/lib/math/normalizeMathgenText";
import { MOCK_EMPTY_PROBLEM_UNIT, MOCK_PROBLEMS } from "@/mocks/data";

const R = String.raw;

function aiTextResponse(text: string) {
  return claudeText(text);
}

/** 작업실 신고 모양 — 가짜 바깥 디스플레이 · 닫히지 않은 `$$` · 제어문자 손상. */
const CAPTURED_SOLUTION =
  "구간에서 속도가 0 이상이므로, " +
  R`\displaystyle $$이동 거리= $x(b)-x(a) = -4-(-12) = 8.$` +
  "\n따라서 $$\\dfrac{1}{2} + \frac{1}{2} = 1";
const CAPTURED_CONTENT = R`넓이는 \dfrac{1}{2}\pi r^2 이고 0 \le r \le 2 이다.`;
const CAPTURED_ANSWER = R`\dfrac{1}{2},-3`;

const LEAKY = /\\displaystyle|\$\$이동|[\f\t\x08]/;

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

describe("generateProblems — 저장 전 후보정", () => {
  it("본문·정답·해설을 작업실 입구와 같은 함수로 고쳐 둔다", async () => {
    mockCreate.mockResolvedValueOnce(
      aiTextResponse(
        JSON.stringify([
          {
            problemType: "계산",
            content: CAPTURED_CONTENT,
            answer: CAPTURED_ANSWER,
            solution: CAPTURED_SOLUTION,
          },
        ]),
      ),
    );

    const [draft] = await generateProblems({
      unitId: MOCK_EMPTY_PROBLEM_UNIT.id,
      unitLabel: "중1 1. 소인수분해 소인수분해",
      difficulty: "기본",
      count: 1,
    });

    // `\dfrac`→`\frac` 는 전과 같이 먼저, 그 위에 작업실 입구 후보정.
    const text = (s: string) =>
      normalizeMathgenText(s.replace(/\\dfrac/g, R`\frac`));
    expect(draft!.content).toBe(text(CAPTURED_CONTENT));
    expect(draft!.answer).toBe(
      normalizeMathgenAnswer(CAPTURED_ANSWER.replace(/\\dfrac/g, R`\frac`)),
    );
    expect(draft!.solution).toBe(text(CAPTURED_SOLUTION));
    expect(draft!.content).toBe(
      R`넓이는 $\frac{1}{2}\pi r^2$ 이고 $0 \le r \le 2$ 이다.`,
    );
    expect(draft!.answer).toBe(R`$\frac{1}{2},-3$`);
    expect(draft!.solution).not.toMatch(LEAKY);
    expect(draft!.solution).toContain("이동 거리=");
    // 저장본은 한 번 더 돌려도 같다 — 렌더가 다시 후보정해도 모양이 안 바뀐다.
    expect(normalizeMathgenText(draft!.solution!)).toBe(draft!.solution);
  });

  it("보기 번호를 정규화한 **뒤에** 형식을 읽는다 — `\\textcircled{3}` 정답이 객관식으로 선다", async () => {
    // 정규화 전 정답(`\textcircled{3}`)에는 보기 번호 글자가 없어 단답형으로 읽힌다.
    // 판정이 보는 글과 DB·지면이 쓰는 글이 같아야 한다(CLAUDE.md 2026-08-18).
    const choices = [4, 6, 7, 8, 9]
      .map((value, at) => R`\textcircled{${at + 1}} ${value}`)
      .join("\n");
    mockCreate.mockResolvedValueOnce(
      aiTextResponse(
        JSON.stringify([
          {
            problemType: "개념",
            content: `다음 중 소수는?\n${choices}`,
            answer: R`\textcircled{3}`,
            solution: null,
          },
        ]),
      ),
    );

    const [draft] = await generateProblems({
      unitId: MOCK_EMPTY_PROBLEM_UNIT.id,
      unitLabel: "중1 1. 소인수분해 소인수분해",
      difficulty: "기본",
      count: 1,
    });

    expect(draft!.answer).toBe("③");
    expect(draft!.content).toBe("다음 중 소수는?\n① 4\n② 6\n③ 7\n④ 8\n⑤ 9");
    expect(draft!.questionType).toBe("객관식");
  });
});

describe("transformProblem — 후보에도 같은 후보정", () => {
  it("본문·정답·해설은 고치고, 원본 재현 값은 견줄 짝이라 건드리지 않는다", async () => {
    mockCreate.mockResolvedValueOnce(
      aiTextResponse(
        JSON.stringify([
          {
            content: CAPTURED_CONTENT,
            answer: CAPTURED_ANSWER,
            solution: CAPTURED_SOLUTION,
            originalAnswerRecomputed: R`\dfrac{7}{25}`,
          },
        ]),
      ),
    );

    const [candidate] = await transformProblem({
      origin: MOCK_PROBLEMS[0]!,
      count: 1,
    });

    expect(candidate!.content).toBe(
      R`넓이는 $\frac{1}{2}\pi r^2$ 이고 $0 \le r \le 2$ 이다.`,
    );
    expect(candidate!.answer).toBe(R`$\frac{1}{2},-3$`);
    expect(candidate!.solution).not.toMatch(LEAKY);
    expect(candidate!.solution).toContain("이동 거리=");
    expect(candidate!.originalAnswerRecomputed).toBe(R`\frac{7}{25}`);
  });

  it("해설이 없으면 null 그대로다", async () => {
    mockCreate.mockResolvedValueOnce(
      aiTextResponse(
        JSON.stringify([
          {
            content: "$x=1$",
            answer: "1",
            solution: null,
            originalAnswerRecomputed: "0.28",
          },
        ]),
      ),
    );
    const [candidate] = await transformProblem({
      origin: MOCK_PROBLEMS[0]!,
      count: 1,
    });
    expect(candidate!.solution).toBeNull();
  });
});
