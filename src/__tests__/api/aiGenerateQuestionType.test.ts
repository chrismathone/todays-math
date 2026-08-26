/**
 * 🔴→🟢 `POST /api/problems/generate` 가 **형식을 DB 에 적는다** (원장님 지적 2026-08-26 ③).
 *
 * 대응 구현: src/app/api/problems/generate/route.ts
 *
 * 생성기가 draft 에 값을 실어도 라우트의 INSERT 목록에 그 컬럼이 없으면 DB 는 여전히
 * null 이다 — **에러도 경고도 안 난다.** 그 자리를 지킨다.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "10000000-0000-4000-8000-000000000001",
    email: "teacher@todaysmath.test",
    name: "테스트 강사",
  })),
}));

const { mockGenerateProblems } = vi.hoisted(() => ({
  mockGenerateProblems: vi.fn(),
}));

vi.mock("@/lib/ai/generator", () => ({
  generateProblems: mockGenerateProblems,
}));

import { POST as generateProblemsRoute } from "@/app/api/problems/generate/route";
import { classifyFormat } from "@/lib/problem/provenance";
import { MOCK_EMPTY_PROBLEM_UNIT } from "@/mocks/data";
import { prismaTestDouble } from "@/mocks/prismaTestDouble";

beforeEach(() => {
  mockGenerateProblems.mockReset();
});

function draft(overrides: Record<string, unknown>) {
  return {
    unitId: MOCK_EMPTY_PROBLEM_UNIT.id,
    difficulty: "기본",
    problemType: "계산",
    content: "생성된 문제",
    answer: "1",
    solution: null,
    source: "ai_generated",
    originProblemId: null,
    reviewStatus: "pending",
    questionType: "단답형",
    ...overrides,
  };
}

type SavedRow = {
  source: string;
  familyKey: string | null;
  originProblemId: string | null;
  figureUrls: string[] | null;
  figureSvg: string | null;
  content: string;
  answer: string;
  questionType: string | null;
  problemType: string | null;
};

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/problems/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/problems/generate — questionType 적재", () => {
  it("draft 의 questionType 을 그대로 넣고, 그 행은 [?형식] 이 아니다", async () => {
    mockGenerateProblems.mockResolvedValueOnce([
      draft({ questionType: "단답형" }),
      draft({
        problemType: "서술형",
        questionType: "서술형",
        content: "이유를 설명하시오.",
        answer: "2",
      }),
    ]);

    const res = await generateProblemsRoute(
      jsonRequest({
        unitId: MOCK_EMPTY_PROBLEM_UNIT.id,
        difficulty: "기본",
        count: 2,
      }),
    );
    expect(res.status).toBe(201);

    // 응답이 아니라 **저장된 행**을 본다 — 라우트가 컬럼을 빠뜨리면 여기서 드러난다.
    const rows = (await prismaTestDouble.problem.findMany({
      where: { source: "ai_generated" },
    })) as SavedRow[];
    const saved = rows.slice(-2);
    expect(saved.map((r) => r.questionType)).toEqual(["단답형", "서술형"]);
    for (const row of saved) {
      // 형식 판정은 그림 컬럼을 **안 본다**(`FormatInput`). 넘기면 초과 속성이라
      // tsc 가 막는다 — 좁은 입력이 옳고, 여기서 그 모양을 그대로 따른다.
      expect(classifyFormat(row)).not.toBe("unknown");
    }
  });
});
