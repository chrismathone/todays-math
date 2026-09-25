// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({
  unit: vi.fn(async (query: unknown) => {
    void query;
    return { id: "unit-1" };
  }),
  problems: vi.fn(async (query: unknown) => {
    void query;
    return [
      {
        difficulty: "연산",
        content: "43 + 17을 계산하시오.",
        answer: "60",
        solution: "43 + 17 = 60",
        figureSvg: null,
        figureUrls: [],
      },
      {
        difficulty: "기본",
        content: "그림을 보고 답하시오.",
        answer: "3",
        solution: "3",
        figureSvg: null,
        figureUrls: [],
      },
      {
        difficulty: "기본",
        content: "다음을 계산하시오.",
        answer: "4",
        solution: "",
        figureSvg: null,
        figureUrls: [],
      },
      {
        difficulty: "기본",
        content: "① 2 ② 3 중 고르시오.",
        answer: "2",
        solution: "2",
        figureSvg: null,
        figureUrls: [],
      },
      {
        difficulty: "기본",
        content: "이유를 설명하시오.",
        answer: "3",
        solution: "3",
        figureSvg: null,
        figureUrls: [],
      },
    ];
  }),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: { unit: { findFirst: f.unit }, problem: { findMany: f.problems } },
}));

import { loadCourseBankCandidates } from "@/lib/math-srs/courseBank";

describe("elementary course bank selection", () => {
  it("queries approved direct-use short answers and excludes non-self-contained stems", async () => {
    const candidates = await loadCourseBankCandidates("3-1-1-1");
    expect(candidates).toEqual([
      {
        tier: "연산",
        content: "43 + 17을 계산하시오.",
        answer: "60",
        solution: "43 + 17 = 60",
      },
    ]);
    const query = f.problems.mock.calls[0]?.[0] as {
      where: { questionType: string; AND: unknown[] };
    };
    expect(query.where.questionType).toBe("단답형");
    expect(JSON.stringify(query.where.AND)).toContain("approved");
    expect(JSON.stringify(query.where.AND)).toContain("directUseAllowed");
  });
});
