import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { MOCK_UNITS, USER_TEACHER_ID } from "@/mocks/data";
import {
  loadUnifiedBank,
  loadUnifiedBankBootstrap,
} from "@/lib/unifiedPreview";
import { loadBankSourceAvailability } from "@/lib/bankSourceAvailability";
import {
  composeUnifiedBankProblems,
  selectUnifiedBankProblems,
} from "@/lib/unifiedBankSelection";
import { bankReadinessResponse, checkBankProblems } from "@/lib/bankReadiness";
import { expandQuestionProblemIds } from "@/lib/problem/questionQueries";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import {
  GET as devGet,
  POST as devPost,
} from "@/app/api/dev/unified/problems/route";
import { GET as devDetail } from "@/app/api/dev/unified/problems/[id]/route";
vi.mock("server-only", () => ({}));
const marker = "question-projection-fixture";
const q = (more: Record<string, string> = {}) =>
  new URLSearchParams({ identity: "question", q: marker, ...more });
const Q1 = `q:v1:${"1".repeat(64)}`,
  Q2 = `q:v1:${"2".repeat(64)}`;
async function plant(patch: Record<string, unknown> = {}) {
  return db.problem.create({
    data: {
      userId: USER_TEACHER_ID,
      unitId: MOCK_UNITS[0].id,
      source: "manual",
      content: marker,
      answer: "7",
      solution: "same",
      difficulty: "기본",
      problemType: "계산",
      questionType: "단답형",
      reviewStatus: "approved",
      directUseAllowed: true,
      pool: "shared",
      figureUrls: [],
      figureSvg: null,
      figureDims: [],
      figureSourceMm: [],
      choiceFigureIndex: [],
      ...patch,
    } as never,
  });
}
beforeEach(() => {
  const find = db.problem.findMany.bind(db.problem);
  vi.spyOn(db.problem, "findMany").mockImplementation((async (
    args: Parameters<typeof db.problem.findMany>[0],
  ) => {
    if (!args?.select?.unit) return find(args);
    const rows = await find({
      ...args,
      select: { ...args.select, unit: false, unitId: true },
    });
    return rows.map((row) => {
      const unit = MOCK_UNITS.find((u) => u.id === row.unitId)!;
      return {
        ...row,
        unit: {
          grade: unit.grade,
          chapter: unit.chapter,
          section: unit.section,
        },
      };
    });
  }) as typeof db.problem.findMany);
  vi.spyOn(db.problem, "findFirst").mockImplementation(
    (async (args) =>
      (await db.problem.findMany({ ...args, take: 1 }))[0] ??
      null) as typeof db.problem.findFirst,
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
async function pairs() {
  const sa1 = await plant({
    questionGroupKey: Q1,
    familyKey: "mid:projection|01",
  });
  const mc1 = await plant({
    questionGroupKey: Q1,
    familyKey: "mid:projection|01",
    content: `${marker}\n① 1\n② 2\n③ 3\n④ 7\n⑤ 5`,
    answer: "④",
    questionType: "객관식",
    directUseAllowed: false,
  });
  const sa2 = await plant({
    questionGroupKey: Q2,
    familyKey: "mid:projection|02",
  });
  const mc2 = await plant({
    questionGroupKey: Q2,
    familyKey: "mid:projection|02",
    content: `${marker}\n① 1\n② 2\n③ 3\n④ 7\n⑤ 5`,
    answer: "④",
    questionType: "객관식",
  });
  await plant({ source: "past_exam", questionType: null, familyKey: null });
  return { sa1, mc1, sa2, mc2 };
}
describe("question list/source/bootstrap/actual-format parity", () => {
  it("groups before pagination, exposes each actual state, and never counts unknown as descriptive", async () => {
    await pairs();
    const first = await loadUnifiedBank(q({ pageSize: "1" }));
    const second = await loadUnifiedBank(q({ pageSize: "1", page: "2" }));
    expect(first).toMatchObject({
      version: 2,
      countUnit: "question",
      total: 2,
    });
    expect(first.problems).toHaveLength(1);
    expect(second.problems).toHaveLength(1);
    expect(first.problems[0].questionId).not.toBe(
      second.problems[0].questionId,
    );
    const all = await loadUnifiedBank(q());
    const one = all.problems.find((r) => r.questionId === Q1)!;
    expect(one.questionFormats?.map((f) => [f.format, f.state])).toEqual(
      expect.arrayContaining([
        ["short_answer", "available"],
        ["multiple_choice", "blocked"],
      ]),
    );
    const counts = await loadBankSourceAvailability(
      q({ view: "available", version: "2", families: "1" }),
    );
    expect(counts).toMatchObject({
      held: 3,
      available: 2,
      countUnit: "question",
      formatAvailable: { multiple_choice: 1, short_answer: 2, descriptive: 0 },
    });
    expect(counts.facets?.units[MOCK_UNITS[0].id]).toEqual({
      held: 3,
      available: 2,
    });
  });
  it("uses actual row format filters and exact ids preserve locked representation IDs", async () => {
    const { sa1, mc1, mc2 } = await pairs();
    const mc = await loadUnifiedBank(q({ availableFormat: "multiple_choice" }));
    expect(mc.total).toBe(1);
    expect(mc.problems[0].id).toBe(mc2.id);
    expect(mc.problems[0].questionFormats).toHaveLength(2);
    const exact = await loadUnifiedBank(q({ ids: `${sa1.id},${mc1.id}` }));
    expect(new Set(exact.problems.map((r) => r.id))).toEqual(
      new Set([sa1.id, mc1.id]),
    );
    expect(exact.problems.find((r) => r.id === mc1.id)?.eligible).toBe(false);
    expect(await expandQuestionProblemIds([sa1.id])).toEqual(
      expect.arrayContaining([sa1.id, mc1.id]),
    );
  });
  it("expands recent and explicit exclusions to the whole question without excluding a family sibling question", async () => {
    const { sa1 } = await pairs();
    const context = { recentProblemIds: async () => [sa1.id] };
    const recent = await loadUnifiedBank(q({ recent: "1" }), context);
    const explicit = await loadUnifiedBank(q({ excludeIds: sa1.id }));
    expect(recent.total).toBe(1);
    expect(explicit.total).toBe(1);
    expect(recent.problems[0].questionId).toBe(Q2);
    const count = await loadBankSourceAvailability(
      q({ view: "available", version: "2", recent: "1" }),
      context,
    );
    expect(count.available).toBe(recent.total);
  });
  it("jointly composes actual formats and always keeps question uniqueness when family restriction is off", async () => {
    await pairs();
    const result = await composeUnifiedBankProblems({
      identity: "question",
      allocations: [{ unitId: MOCK_UNITS[0].id, count: 2 }],
      filters: `q=${marker}`,
      distinctFamilies: false,
      formats: { 객관식: 1, 단답형: 1 },
    });
    expect(result.status).toBe("complete");
    expect(result.countUnit).toBe("question");
    expect(new Set(result.problems.map((p) => p.questionId)).size).toBe(2);
    expect(result.formats).toEqual(
      expect.arrayContaining([
        { format: "객관식", requested: 1, actual: 1 },
        { format: "단답형", requested: 1, actual: 1 },
      ]),
    );
    const counts = Object.fromEntries(
      DIFFICULTY_LADDER.map((d) => [d, d === "기본" ? 2 : 0]),
    );
    const random = await selectUnifiedBankProblems({
      identity: "question",
      filters: `q=${marker}`,
      counts,
      formats: { 객관식: 1, 단답형: 1 },
    });
    expect(random.status).toBe("complete");
    expect(random.countUnit).toBe("question");
  });
  it("rejects stale selection revision with409 and keeps GET/POST/detail dev parity", async () => {
    await pairs();
    vi.stubEnv("NODE_ENV", "development");
    const read = await devGet(
      new Request(`http://localhost/api/dev/unified/problems?${q()}`),
    );
    const post = await devPost(
      new Request("http://localhost/api/dev/unified/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(q())),
      }),
    );
    const a = await read.json(),
      b = await post.json();
    expect(a.total).toBe(b.total);
    expect(a.countUnit).toBe("question");
    const row = a.problems[0];
    const meta = row.questionFormats.find(
      (f: { problemId: string }) => f.problemId === row.id,
    );
    const selection = {
      questionId: row.questionId,
      problemId: row.id,
      format: meta.format,
      revision: meta.revision,
    };
    const detail = await devDetail(
      new Request(
        `http://localhost/api/dev/unified/problems/${row.id}?identity=question`,
      ),
      { params: Promise.resolve({ id: row.id }) },
    );
    expect((await detail.json()).data.id).toBe(row.id);
    await db.problem.update({
      where: { id: row.id },
      data: { answer: "changed" },
    });
    const response = await bankReadinessResponse(
      new Request("http://localhost/check", {
        method: "POST",
        body: JSON.stringify({ ids: [row.id], selections: [selection] }),
      }),
      {},
      checkBankProblems,
    );
    expect(response.status).toBe(409);
    const invalid = await bankReadinessResponse(
      new Request("http://localhost/check", {
        method: "POST",
        body: JSON.stringify({ ids: [row.id], selections: [] }),
      }),
      {},
      checkBankProblems,
    );
    expect(invalid.status).toBe(400);
  });
  it("question bootstrap omits complete payload reads and uses question counts", async () => {
    await pairs();
    const find = vi.mocked(db.problem.findMany);
    find.mockClear();
    const bootstrap = await loadUnifiedBankBootstrap("question");
    expect(bootstrap.countUnit).toBe("question");
    expect(bootstrap.total).toBeGreaterThanOrEqual(2);
    expect(find.mock.calls.every(([args]) => !args?.select?.figureSvg)).toBe(
      true,
    );
  });
});
