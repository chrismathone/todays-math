/**
 * 🟢 GREEN — Phase 3, T3.2 (AI(DeepSeek) API 래퍼 라우트).
 *
 * 단위 테스트(src/__tests__/unit/aiGenerator.test.ts)가 생성 순수 래퍼를 검증하고,
 * 이 파일은 HTTP 계층(세션·계약·영속·에러 매핑)만 검증한다.
 * AI SDK는 호출하지 않는다 — generateProblems를 모킹한다.
 *
 * 변형(/transform, /transform/adopt)은 두 단계로 갈라져 src/__tests__/api/problemTransform.test.ts 소유.
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
import { AiConfigError, AiGenerationError } from "@/lib/ai/errors";
import { AI_BUSY_MESSAGE, resetAiAdmission } from "@/lib/aiAdmission";
import { errorResponseSchema } from "@/contracts/common.contract";
import { problemGenerateResponseSchema } from "@/contracts/problem.contract";
import {
  MOCK_EMPTY_PROBLEM_UNIT,
  NOT_FOUND_ID,
  USER_TEACHER_ID,
} from "@/mocks/data";
import { prismaTestDouble } from "@/mocks/prismaTestDouble";

function jsonRequest(url: string, body?: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  mockGenerateProblems.mockReset();
});

describe("[T3.2] POST /api/problems/generate", () => {
  it("유효한 요청이면 201과 pending/ai_generated 문제를 반환한다", async () => {
    mockGenerateProblems.mockResolvedValueOnce([
      {
        unitId: MOCK_EMPTY_PROBLEM_UNIT.id,
        difficulty: "기본",
        problemType: "계산",
        content: "생성된 문제",
        answer: "1",
        solution: null,
        source: "ai_generated",
        originProblemId: null,
        reviewStatus: "pending",
      },
    ]);

    const res = await generateProblemsRoute(
      jsonRequest("http://localhost/api/problems/generate", {
        unitId: MOCK_EMPTY_PROBLEM_UNIT.id,
        difficulty: "기본",
        count: 1,
      }),
    );
    expect(res.status).toBe(201);
    const body = problemGenerateResponseSchema.parse(await res.json());
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.source).toBe("ai_generated");
    expect(body.data[0]?.reviewStatus).toBe("pending");
    expect(body.data[0]?.originProblemId).toBeNull();
  });

  it("unitId가 없으면 VALIDATION_ERROR(400)를 반환한다", async () => {
    const res = await generateProblemsRoute(
      jsonRequest("http://localhost/api/problems/generate", {
        difficulty: "기본",
      }),
    );
    expect(res.status).toBe(400);
    const body = errorResponseSchema.parse(await res.json());
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("존재하지 않는 unitId는 NOT_FOUND(404)를 반환한다", async () => {
    const res = await generateProblemsRoute(
      jsonRequest("http://localhost/api/problems/generate", {
        unitId: NOT_FOUND_ID,
        difficulty: "기본",
      }),
    );
    expect(res.status).toBe(404);
    const body = errorResponseSchema.parse(await res.json());
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("생성 실패는 AI_GENERATION_FAILED(502)로 매핑한다", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGenerateProblems.mockRejectedValueOnce(
      new AiGenerationError("ANTHROPIC_API_KEY=top-secret"),
    );

    const res = await generateProblemsRoute(
      jsonRequest("http://localhost/api/problems/generate", {
        unitId: MOCK_EMPTY_PROBLEM_UNIT.id,
        difficulty: "기본",
        count: 1,
      }),
    );
    expect(res.status).toBe(502);
    const body = errorResponseSchema.parse(await res.json());
    expect(body.error.code).toBe("AI_GENERATION_FAILED");
    expect(body.error.message).toBe("AI 문제 생성에 실패했습니다.");
    expect(JSON.stringify(body)).not.toContain("top-secret");
    log.mockRestore();
  });

  it("설정 누락(AiConfigError)은 503과 지금 공급자의 키 이름(ANTHROPIC_API_KEY)을 알려 준다", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGenerateProblems.mockRejectedValueOnce(
      new AiConfigError("ANTHROPIC_API_KEY가 설정되어 있지 않습니다."),
    );

    const res = await generateProblemsRoute(
      jsonRequest("http://localhost/api/problems/generate", {
        unitId: MOCK_EMPTY_PROBLEM_UNIT.id,
        difficulty: "기본",
        count: 1,
      }),
    );
    // AiConfigError 는 AiGenerationError 의 하위 타입 — 검사 순서가 뒤집히면 502/일반 문구가 된다
    expect(res.status).toBe(503);
    const body = errorResponseSchema.parse(await res.json());
    expect(body.error.message).toContain("ANTHROPIC_API_KEY");
    expect(body.error.message).not.toContain("DEEPSEEK");
    log.mockRestore();
  });

  it("두 번째 DB 저장이 실패하면 첫 번째 생성 문제도 롤백한다", async () => {
    mockGenerateProblems.mockResolvedValueOnce(
      ["첫 번째", "두 번째"].map((content) => ({
        unitId: MOCK_EMPTY_PROBLEM_UNIT.id,
        difficulty: "기본",
        problemType: "계산",
        content,
        answer: "1",
        solution: null,
        source: "ai_generated",
        originProblemId: null,
        reviewStatus: "pending",
      })),
    );
    const before = await prismaTestDouble.problem.count({
      where: { userId: USER_TEACHER_ID },
    });

    // 🔴 이 묶음은 이제 **한 문장**으로 저장된다(`createManyAndReturn` =
    //    `INSERT ... RETURNING`). 그래서 "두 번째 INSERT 만 실패" 라는 상태가 아예
    //    존재할 수 없다 — 예전에는 문항 수만큼 INSERT 를 돌며 트랜잭션에 기대야 했다.
    //    보장이 약해진 게 아니라 **더 강해졌다.** 검사는 그 사실에 맞춘다:
    //    (1) 저장 문장이 정확히 하나이고 묶음 전체가 그 한 번에 실려 있는가,
    //    (2) 그 문장이 실패하면 아무 행도 남지 않는가.
    //    (1) 이 없으면 나중에 누가 다시 루프로 되돌려도 (2) 만으로는 안 잡힌다.
    const createManySpy = vi
      .spyOn(prismaTestDouble.problem, "createManyAndReturn")
      .mockRejectedValueOnce(new Error("묶음 저장 실패"));

    try {
      await expect(
        generateProblemsRoute(
          jsonRequest("http://localhost/api/problems/generate", {
            unitId: MOCK_EMPTY_PROBLEM_UNIT.id,
            difficulty: "기본",
            count: 2,
          }),
        ),
      ).rejects.toThrow("묶음 저장 실패");

      expect(createManySpy).toHaveBeenCalledTimes(1);
      expect(createManySpy.mock.calls[0]![0]!.data).toHaveLength(2);
      expect(
        await prismaTestDouble.problem.count({
          where: { userId: USER_TEACHER_ID },
        }),
      ).toBe(before);
    } finally {
      createManySpy.mockRestore();
    }
  });
});

describe("🔴 한 사람이 동시에 띄우는 생성은 둘까지 (2026-10-07 검수)", () => {
  const call = () =>
    generateProblemsRoute(
      jsonRequest("http://localhost/api/problems/generate", {
        unitId: MOCK_EMPTY_PROBLEM_UNIT.id,
        difficulty: "기본",
        count: 1,
      }),
    );

  it("셋째 요청은 AI 를 부르지 않고 429 — 앞의 것이 실패로 끝나도 자리는 돌아온다", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    resetAiAdmission();
    let fail!: (error: Error) => void;
    mockGenerateProblems.mockReturnValue(
      new Promise<never>((_, reject) => {
        fail = reject;
      }),
    );

    const first = call();
    const second = call();
    await vi.waitFor(() =>
      expect(mockGenerateProblems).toHaveBeenCalledTimes(2),
    );

    const third = await call();
    expect(third.status).toBe(429);
    expect(errorResponseSchema.parse(await third.json()).error.message).toBe(
      AI_BUSY_MESSAGE,
    );
    expect(mockGenerateProblems).toHaveBeenCalledTimes(2);

    fail(new AiGenerationError("upstream"));
    expect((await first).status).toBe(502);
    expect((await second).status).toBe(502);

    mockGenerateProblems.mockRejectedValueOnce(new AiGenerationError("again"));
    expect((await call()).status).toBe(502);
    expect(mockGenerateProblems).toHaveBeenCalledTimes(3);
    log.mockRestore();
  });
});
