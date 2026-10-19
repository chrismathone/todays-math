// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 월말평가 M1 — 반에 낸 시험의 문항은 **낸 그대로** 읽는다(계획서 §9.2). 은행 문항을 고쳐도 지면 · 채점 · 재시험은 낸 글이다.
 * 모든 로더가 지나는 `hydrateTestSnapshots` 가 고정본을 붙이고 `contentOf` 가 먼저 쓴다. 고정본에 문항이 없으면 은행으로 넘어가지 않고 실패한다.
 */
const m = vi.hoisted(() => ({
  tests: [] as { id: string; publicationId: string | null }[],
  publications: [] as { id: string; payload: unknown }[],
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: async () => [],
    test: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        m.tests.filter((t) => where.id.in.includes(t.id)),
    },
    examPublication: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        m.publications.filter((p) => where.id.in.includes(p.id)),
    },
  },
}));

import { hydrateTestSnapshots } from "@/lib/tests/loadSnapshotAssets";
import { contentOf } from "@/lib/tests/testProblemContent";

const id = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const bankProblem = {
  id: id(1),
  unitId: id(9),
  difficulty: "중",
  content: "은행의 지금 글",
  answer: "①",
  solution: "은행 풀이",
  questionType: "multiple-choice",
  figureUrls: [],
  figureDims: [],
  figureSourceMm: [],
  figureSvg: null,
  choiceFigureIndex: [],
};
const row = (testId: string) => ({
  testId,
  problemId: id(1),
  snapshotId: null,
  snapshot: null,
  problem: bankProblem,
});
const frozen = {
  version: 1,
  problems: [
    {
      no: 1,
      problemId: id(1),
      content: "낸 그대로의 글",
      answer: "③",
      solution: "낸 풀이",
      questionType: "short-answer",
      grade: "중2",
      chapter: "",
      section: "",
      difficulty: "중",
      problemCode: "J-1",
      figureUrls: ["https://figures/a.png"],
      figureSvg: null,
      figureDims: [40],
      figureSourceMm: [],
      choiceFigureIndex: [],
    },
  ],
  layout: { columns: 2, answers: true, printOptions: null, printMeta: null },
};

beforeEach(() => {
  m.tests = [
    { id: id(100), publicationId: id(200) },
    { id: id(101), publicationId: null },
  ];
  m.publications = [{ id: id(200), payload: frozen }];
});

describe("반에 낸 시험의 문항", () => {
  it("낸 그대로의 글 · 정답 · 해설 · 형식 · 그림 — 일반 시험은 은행 그대로", async () => {
    const [published, general] = await hydrateTestSnapshots([
      row(id(100)),
      row(id(101)),
    ]);
    expect(contentOf(published!)).toMatchObject({
      id: id(1),
      unitId: id(9),
      content: "낸 그대로의 글",
      answer: "③",
      solution: "낸 풀이",
      questionType: "short-answer",
      figureUrls: ["https://figures/a.png"],
      figureDims: [40],
    });
    expect(contentOf(general!)).toBe(bankProblem);
  });

  it("고정본에 그 문항이 없으면 은행 글로 넘어가지 않고 실패한다", async () => {
    m.publications = [{ id: id(200), payload: { ...frozen, problems: [] } }];
    await expect(hydrateTestSnapshots([row(id(100))])).rejects.toThrow(
      "고정 문항",
    );
  });
});
