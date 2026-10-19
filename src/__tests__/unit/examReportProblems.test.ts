// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  rows: [] as object[],
  payload: { version: 1, problems: [] as object[] },
  read: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    testProblem: {
      findMany: (args: unknown) => {
        m.read(args);
        return m.rows;
      },
    },
    test: { findMany: () => [{ id: "test", publicationId: "publication" }] },
    examPublication: {
      findMany: () => [{ id: "publication", payload: m.payload }],
    },
  },
}));

import { loadExamReportProblems } from "@/lib/examReport/problems";
import { contentOf } from "@/lib/tests/testProblemContent";

beforeEach(() => {
  m.read.mockClear();
  m.rows = [
    {
      testId: "test",
      problemId: "problem",
      orderIndex: 1,
      score: null,
      problem: {
        id: "problem",
        unitId: "unit",
        difficulty: "기본",
        content: "바뀐 은행 글",
      },
    },
  ];
  m.payload = {
    version: 1,
    problems: [
      {
        problemId: "problem",
        no: 1,
        content: "낸 글 그대로",
        answer: "③",
        solution: "낸 해설",
        questionType: "short-answer",
        figureUrls: [],
        figureSvg: null,
      },
    ],
  };
});

describe("성적표 문항 읽기 어댑터", () => {
  it("문항을 시험 순으로 읽고 실제 hydrateTestSnapshots → contentOf를 거친다", async () => {
    const rows = await loadExamReportProblems("test");
    expect(m.read).toHaveBeenCalledWith({
      where: { testId: "test" },
      include: { problem: { include: { unit: true } }, snapshot: true },
      orderBy: { orderIndex: "asc" },
    });
    expect(contentOf(rows[0])).toMatchObject({
      content: "낸 글 그대로",
      answer: "③",
      solution: "낸 해설",
    });
  });
  it("발행본에 문항이 없으면 은행 글로 대신 채우지 않는다", async () => {
    m.payload.problems = [];
    await expect(loadExamReportProblems("test")).rejects.toThrow();
  });
});
