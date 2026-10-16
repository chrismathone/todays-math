import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  loadUnifiedBank,
  loadUnifiedBankBootstrap,
  UnifiedBankQueryError,
} from "@/lib/unifiedPreview";
import { GET } from "@/app/api/dev/unified/problems/route";
import { MOCK_UNITS, USER_TEACHER_ID } from "@/mocks/data";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { provenanceBadges } from "@/lib/problem/provenance";
import {
  composeUnifiedBankProblems,
  selectUnifiedBankProblems,
} from "@/lib/unifiedBankSelection";
import {
  DIFFICULTY_LADDER,
  type DifficultyRatio,
} from "@/contracts/difficulty";
import { POST as randomBank } from "@/app/api/dev/unified/problems/random/route";
vi.mock("server-only", () => ({}));

// The shared in-memory Prisma double evaluates the real WHERE clauses. Supply
// only relation projections/counts that its existing unit delegate omits.
beforeEach(() => {
  const findUnits = db.unit.findMany.bind(db.unit);
  const findProblems = db.problem.findMany.bind(db.problem);
  vi.spyOn(db.unit, "findMany").mockImplementation((async (
    args: Parameters<typeof db.unit.findMany>[0],
  ) => {
    const units = await findUnits(args);
    if (!args?.select?._count) return units as never;
    const count = args.select._count as {
      select: { problems: { where: object } };
    };
    return (await Promise.all(
      units.map(async (unit) => ({
        ...unit,
        _count: {
          problems: await db.problem.count({
            where: { AND: [count.select.problems.where, { unitId: unit.id }] },
          }),
        },
      })),
    )) as never;
  }) as typeof db.unit.findMany);
  vi.spyOn(db.problem, "findMany").mockImplementation((async (
    args: Parameters<typeof db.problem.findMany>[0],
  ) => {
    if (!args?.select?.unit) return (await findProblems(args)) as never;
    const rows = await findProblems({
      ...args,
      select: { ...args.select, unit: false, unitId: true },
    });
    return (await Promise.all(
      rows.map(async (row) => {
        const unit = await db.unit.findUnique({ where: { id: row.unitId } });
        return {
          ...row,
          unit: {
            grade: unit!.grade,
            chapter: unit!.chapter,
            section: unit!.section,
          },
        };
      }),
    )) as never;
  }) as typeof db.problem.findMany);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
const marker = "통합조회확인";
async function plant(patch: Record<string, unknown> = {}) {
  // exam-wiring: 테스트 — 시험 대역(prismaTestDouble)에 픽스처를 심는다. 실 DB 가 아니고
  //   원본 시험지(examId·sourceFile)도 없다. `source: "past_exam"` 은 통합 조회의 필터·출처
  //   배지를 재려는 자리채움이다 — 시험마다 `patch` 로 manual·transformed 등으로 바꿔 심는다.
  return await db.problem.create({
    data: {
      userId: USER_TEACHER_ID,
      unitId: MOCK_UNITS[0].id,
      source: "past_exam",
      content: marker,
      answer: "7",
      solution: "풀이 있음",
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
      ...patch,
    } as never,
  });
}
const query = (values: Record<string, string> = {}) =>
  new URLSearchParams({ q: marker, ...values });

const tierCounts = (counts: Partial<DifficultyRatio> = {}): DifficultyRatio =>
  Object.fromEntries(
    DIFFICULTY_LADDER.map((tier) => [tier, counts[tier] ?? 0]),
  ) as DifficultyRatio;

describe("Math exam builder scoped bank access", () => {
  it("bootstraps curriculum and counts without loading rows, then pages actual candidates", async () => {
    const candidate = await plant();
    const problemRows = vi.mocked(db.problem.findMany);
    problemRows.mockClear();

    const bootstrap = await loadUnifiedBankBootstrap();
    expect(problemRows).not.toHaveBeenCalled();
    expect(bootstrap.total).toBeGreaterThan(0);
    const selectedGrade = bootstrap.grades.find(
      ({ grade }) => grade === MOCK_UNITS[0].grade,
    );
    expect(selectedGrade?.count).toBeGreaterThan(0);
    expect(bootstrap.chapters).toContain(MOCK_UNITS[0].chapter);
    expect(bootstrap.unitCounts?.[MOCK_UNITS[0].id]).toBeGreaterThan(0);
    expect(Object.keys(bootstrap.unitCounts ?? {})).toHaveLength(
      bootstrap.units?.length ?? 0,
    );
    expect(bootstrap.units?.[0]).toEqual(
      expect.objectContaining({
        id: MOCK_UNITS[0].id,
        grade: MOCK_UNITS[0].grade,
        chapter: MOCK_UNITS[0].chapter,
        section: MOCK_UNITS[0].section,
      }),
    );

    const candidates = await loadUnifiedBank(query({ pageSize: "12" }));
    expect(problemRows).toHaveBeenCalledOnce();
    expect(problemRows.mock.calls[0][0]).toMatchObject({ take: 12 });
    expect(candidates.problems.map(({ id }) => id)).toContain(candidate.id);
    expect(candidates.units).toEqual(bootstrap.units);
    expect(candidates.grades).toEqual(bootstrap.grades);
    expect(candidates.chapters).toEqual(bootstrap.chapters);
  });

  it("counts and pages exact disjoint scopes after exclusions and difficulty filtering", async () => {
    const units = [MOCK_UNITS[0], MOCK_UNITS[2]];
    const matching = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        plant({ unitId: units[index % 2].id }),
      ),
    );
    await plant({ unitId: MOCK_UNITS[1].id });
    await plant({ difficulty: "응용" });
    await plant({ reviewStatus: "pending" });
    const params = {
      unitIds: units.map((unit) => unit.id).join(","),
      excludeIds: matching[0].id,
      difficulty: "기본",
      pageSize: "2",
    };
    const first = await loadUnifiedBank(query(params));
    const second = await loadUnifiedBank(query({ ...params, page: "2" }));
    expect(first.total).toBe(4);
    expect(second.total).toBe(4);
    expect(first.problems).toHaveLength(2);
    expect(second.problems).toHaveLength(2);
    expect(
      new Set([...first.problems, ...second.problems].map((row) => row.id)),
    ).toEqual(new Set(matching.slice(1).map((row) => row.id)));
  });

  it.each([
    "unitIds=",
    "unitIds=bad",
    "ids=",
    "excludeIds=bad",
    "pageSize=0",
    "pageSize=101",
  ])("rejects invalid builder bounds without widening: %s", async (params) => {
    await expect(
      loadUnifiedBank(new URLSearchParams(params)),
    ).rejects.toBeInstanceOf(UnifiedBankQueryError);
  });

  it("resolves only requested, still eligible IDs and preserves native figure/type evidence", async () => {
    const row = await plant({
      figureUrls: ["/native.svg"],
      figureDims: [240, 180],
      figureSourceMm: [50, 40],
      choiceFigureIndex: [0],
      questionType: "서술형",
    });
    const locked = await plant({ directUseAllowed: false });
    await plant();
    const result = await loadUnifiedBank(
      new URLSearchParams({ ids: `${row.id},${locked.id}`, pageSize: "100" }),
    );
    expect(result.total).toBe(1);
    expect(result.problems[0]).toMatchObject({
      id: row.id,
      unitId: row.unitId,
      questionType: "descriptive",
      questionTypeRaw: "서술형",
      figureUrls: ["/native.svg"],
      figureDims: [240, 180],
      figureSourceMm: [50, 40],
      choiceFigureIndex: [0],
      eligible: true,
    });
  });

  it("composes all unit quotas in bounded problem reads (sheet families, pool, chosen rows) and never borrows for shortages", async () => {
    const baseline = await db.problem.findMany({
      select: { id: true },
      where: { unitId: { in: [MOCK_UNITS[0].id, MOCK_UNITS[2].id] } },
    });
    const first = await plant();
    const excluded = await plant();
    const second = await plant({
      unitId: MOCK_UNITS[2].id,
      difficulty: "응용",
    });
    await plant({ unitId: MOCK_UNITS[1].id });
    await plant({ unitId: MOCK_UNITS[2].id, pool: "private" });
    await plant({ unitId: MOCK_UNITS[2].id, reviewStatus: "pending" });
    await plant({ unitId: MOCK_UNITS[2].id, directUseAllowed: false });
    const find = vi.mocked(db.problem.findMany);
    find.mockClear();
    const result = await composeUnifiedBankProblems({
      allocations: [
        { unitId: MOCK_UNITS[0].id, count: 3 },
        { unitId: MOCK_UNITS[2].id, count: 2 },
      ],
      excludeIds: [...baseline.map((row) => row.id), excluded.id],
    });
    // D-111: one extra read for the families already on the sheet (excludeIds).
    expect(find).toHaveBeenCalledTimes(3);
    expect(result.problems.map((row) => row.id)).toEqual([first.id, second.id]);
    expect(result.allocations).toEqual([
      { unitId: MOCK_UNITS[0].id, requested: 3, available: 1, actual: 1 },
      { unitId: MOCK_UNITS[2].id, requested: 2, available: 1, actual: 1 },
    ]);
  });

  it("uses a deterministic reservoir draw within each allocation without duplicate questions", async () => {
    const baseline = await db.problem.findMany({
      select: { id: true },
      where: { unitId: MOCK_UNITS[0].id },
    });
    const rows = await Promise.all(Array.from({ length: 6 }, () => plant()));
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = await composeUnifiedBankProblems({
      allocations: [{ unitId: MOCK_UNITS[0].id, count: 2 }],
      excludeIds: baseline.map((row) => row.id),
    });
    expect(result.problems.map((row) => row.id)).toEqual([
      rows[5].id,
      rows[1].id,
    ]);
    expect(result.allocations[0]).toMatchObject({
      requested: 2,
      available: 6,
      actual: 2,
    });
  });

  it.each(
    [
      [],
      [{ unitId: MOCK_UNITS[0].id, count: 0 }],
      [{ unitId: MOCK_UNITS[0].id, count: 101 }],
      [
        { unitId: MOCK_UNITS[0].id, count: 1 },
        { unitId: MOCK_UNITS[0].id, count: 1 },
      ],
      [
        { unitId: MOCK_UNITS[0].id, count: 60 },
        { unitId: MOCK_UNITS[1].id, count: 60 },
      ],
    ].map((allocations) => ({ allocations })),
  )(
    "rejects invalid or duplicate unit allocations",
    async ({ allocations }) => {
      await expect(
        composeUnifiedBankProblems({ allocations }),
      ).rejects.toBeInstanceOf(UnifiedBankQueryError);
    },
  );
});

describe("difficulty-based selection across the shared bank", () => {
  it("selects beyond one displayed page, excludes existing questions, and reports exact-tier shortages", async () => {
    const basics = await Promise.all(Array.from({ length: 18 }, () => plant()));
    const advanced = await plant({ difficulty: "응용" });
    await plant({ difficulty: "심화상" });
    await plant({ pool: "private" });
    await plant({ reviewStatus: "pending" });
    await plant({ directUseAllowed: false });
    await plant({ answer: MISSING_ANSWER });
    const result = await selectUnifiedBankProblems({
      filters: query({ page: "9", difficulty: "연산" }).toString(),
      counts: tierCounts({ 기본: 20, 응용: 3 }),
      excludeIds: [basics[0].id],
    });
    expect(result.available).toEqual(
      tierCounts({ 기본: 17, 응용: 1, 심화상: 1 }),
    );
    expect(result.counts).toEqual(tierCounts({ 기본: 17, 응용: 1 }));
    expect(new Set(result.problems.map((p) => p.id))).toEqual(
      new Set([...basics.slice(1).map((p) => p.id), advanced.id]),
    );
    expect(result.problems.every((p) => p.eligible)).toBe(true);
    expect(result.problems[0]).toHaveProperty("questionTypeRaw", "단답형");
  });

  it("uses the same unit, source and derived-format filters as browsing", async () => {
    const matching = await plant({ source: "manual", questionType: "서술형" });
    await plant({ source: "manual", questionType: "단답형" });
    await plant({ source: "past_exam", questionType: "서술형" });
    await plant({
      source: "manual",
      questionType: "서술형",
      unitId: MOCK_UNITS[1].id,
    });
    const result = await selectUnifiedBankProblems({
      filters: query({
        source: "manual",
        format: "descriptive",
        unitFrom: MOCK_UNITS[0].id,
        unitTo: MOCK_UNITS[0].id,
      }).toString(),
      counts: tierCounts({ 기본: 10 }),
    });
    expect(result.problems.map((p) => p.id)).toEqual([matching.id]);
  });

  it("never adds inspected but ineligible questions", async () => {
    await plant({ reviewStatus: "pending" });
    const result = await selectUnifiedBankProblems({
      filters: query({ reviewStatus: "pending" }).toString(),
      counts: tierCounts({ 기본: 2 }),
    });
    expect(result.problems).toEqual([]);
    expect(result.counts).toEqual(tierCounts());
  });

  it("caps a random draw without returning duplicates", async () => {
    await Promise.all(Array.from({ length: 25 }, () => plant()));
    const result = await selectUnifiedBankProblems({
      filters: query().toString(),
      counts: tierCounts({ 기본: 5 }),
    });
    expect(result.problems).toHaveLength(5);
    expect(new Set(result.problems.map((p) => p.id)).size).toBe(5);
    expect(result.available.기본).toBe(25);
  });

  it.each([
    tierCounts(),
    tierCounts({ 기본: 101 }),
    tierCounts({ 기본: 1.5 }),
    { easy: 5 },
  ])("rejects invalid counts before querying", async (counts) => {
    await expect(selectUnifiedBankProblems({ counts })).rejects.toBeInstanceOf(
      UnifiedBankQueryError,
    );
  });

  it("returns 400 for malformed JSON and disables the development route in production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const malformed = await randomBank(
      new Request("http://localhost/api/dev/unified/problems/random", {
        method: "POST",
        body: "{",
      }),
    );
    expect(malformed.status).toBe(400);
    vi.stubEnv("NODE_ENV", "production");
    const disabled = await randomBank(
      new Request("http://localhost/api/dev/unified/problems/random", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(disabled.status).toBe(404);
  });
});

/**
 * 🔴 **출처 배지가 판정할 근거가 행에 실려 나오는가** (2026-09-14).
 *
 * 통합 화면은 `familyKey` 를 변환부에서 꺼내 쓰고 **돌려놓지 않았고**,
 * `originProblemId` 는 아예 안 뽑았다. 그래서 배지를 그리려 해도 엔진 문항이 전부
 * `[?] 미분류`가 되고 AI 변형본이 `[문] 문제집`으로 잘못 붙는데 **에러가 안 났다**
 * (`problem.contract.ts` 가 경고해 둔 그 자리).
 *
 * 그래서 「필드가 있나」가 아니라 **「배지가 제대로 서나」**를 잰다 — 값을 실어 보내도
 * 판정이 틀리면 고친 것이 아니다. 행을 고르는 데도 뜻이 있다: 엔진 문항은 `familyKey`
 * 덕에 원본 형식값이 없어도 같은 답이 나와 **변이를 못 잡는다.** 형식 축은 엔진 표지가
 * 없는 서술형으로 재야 `questionTypeRaw` 배선이 끊긴 것을 잡는다.
 */
describe("bank rows carry the evidence the origin badges judge from", () => {
  const axis = (
    row: Awaited<ReturnType<typeof loadUnifiedBank>>["problems"][number],
    want: "origin" | "format",
  ) =>
    provenanceBadges({
      ...row,
      source: row.source ?? "",
      questionType: row.questionTypeRaw,
    }).find((badge) => badge.axis === want)?.text;

  it("엔진 표지를 실어 보내 [초] 로 세운다 — 미분류로 떨어지지 않는다", async () => {
    const engine = await plant({
      source: "manual",
      familyKey: "elem:초3|1-1-1 받아올림이 없는|연산",
    });
    const rows = (await loadUnifiedBank(query())).problems;
    const row = rows.find((problem) => problem.id === engine.id)!;
    expect(row.familyKey).toBe("elem:초3|1-1-1 받아올림이 없는|연산");
    expect(axis(row, "origin")).toBe("초");
  });

  it("원본 형식을 따로 실어 보낸다 — 덮어쓴 값으로 다시 판정하면 [서]가 [?형식]이 된다", async () => {
    const written = await plant({
      source: "manual",
      familyKey: null,
      questionType: "서술형",
    });
    const rows = (await loadUnifiedBank(query())).problems;
    const row = rows.find((problem) => problem.id === written.id)!;
    expect(row.questionTypeRaw).toBe("서술형");
    expect(axis(row, "format")).toBe("서");
  });

  it("originProblemId 로 [변] AI 변형과 [문] 문제집을 가른다", async () => {
    const origin = await plant({ source: "manual" });
    const transformed = await plant({
      source: "transformed",
      originProblemId: origin.id,
    });
    const workbook = await plant({
      source: "transformed",
      originProblemId: null,
    });
    const rows = (await loadUnifiedBank(query())).problems;
    const find = (id: string) => rows.find((problem) => problem.id === id)!;
    expect(axis(find(transformed.id), "origin")).toBe("변");
    expect(axis(find(workbook.id), "origin")).toBe("문");
  });
});
describe("unified bank shares real filters without widening issuance", () => {
  it("keeps default issuance eligibility while explicit state inspection remains shared-only", async () => {
    const good = await plant();
    const locked = await plant({ directUseAllowed: false });
    const pending = await plant({ reviewStatus: "pending" });
    await plant({ pool: "private" });
    const missing = await plant({ answer: MISSING_ANSWER });
    const ordinary = await loadUnifiedBank(query());
    expect(ordinary.problems.map((p) => p.id)).toEqual([good.id]);
    expect(ordinary.problems[0]).toMatchObject({
      eligible: true,
      ineligibleReason: null,
    });
    const approved = await loadUnifiedBank(query({ reviewStatus: "approved" }));
    expect(approved.problems.map((p) => p.id).sort()).toEqual(
      [good.id, locked.id, missing.id].sort(),
    );
    expect(approved.problems.filter((p) => !p.eligible)).toHaveLength(2);
    const inspected = await loadUnifiedBank(query({ reviewStatus: "pending" }));
    expect(inspected.problems).toHaveLength(1);
    expect(inspected.problems[0]).toMatchObject({
      id: pending.id,
      eligible: false,
      ineligibleReason: "검수를 통과하지 않은 문항입니다.",
    });
  });
  it("applies source/type/material filters before totals and pagination", async () => {
    const included = await plant({
      figureSvg: "<svg/>",
      source: "manual",
      problemType: "활용",
    });
    await plant({
      source: "past_exam",
      figureUrls: ["/figure.png"],
      problemType: "활용",
    });
    await plant({
      source: "manual",
      problemType: "활용",
      figureSvg: "<svg/>",
      solution: "",
    });
    await plant({
      source: "manual",
      problemType: "활용",
      figureSvg: "<svg/>",
      answer: MISSING_ANSWER,
    });
    const result = await loadUnifiedBank(
      query({
        source: "manual",
        problemType: "활용",
        hasFigure: "true",
        hasSolution: "true",
        hasAnswer: "true",
        reviewStatus: "approved",
        page: "999",
      }),
    );
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.problems.map((p) => p.id)).toEqual([included.id]);
  });
  it("resolves reversed and open-ended unit ranges using stored order", async () => {
    const units = [...MOCK_UNITS].sort((a, b) => a.orderIndex - b.orderIndex);
    const early = await plant({ unitId: units[0].id });
    const later = await plant({ unitId: units[2].id });
    await plant({ unitId: units[4].id });
    const reversed = await loadUnifiedBank(
      query({ unitFrom: units[2].id, unitTo: units[0].id }),
    );
    expect(reversed.problems.map((p) => p.id).sort()).toEqual(
      [early.id, later.id].sort(),
    );
    const ending = await loadUnifiedBank(query({ unitTo: units[0].id }));
    expect(ending.problems.map((p) => p.id)).toEqual([early.id]);
    await expect(
      loadUnifiedBank(
        query({ unitFrom: "00000000-0000-4000-8000-000000000000" }),
      ),
    ).rejects.toBeInstanceOf(UnifiedBankQueryError);
  });
  it.each(["school", "answer", "solution"])(
    "searches %s rather than only content",
    async (field) => {
      const wanted = await plant({
        content: "관계 없는 본문",
        [field]: "needle학교",
      });
      const result = await loadUnifiedBank(
        new URLSearchParams({ q: "needle학교" }),
      );
      expect(result.problems.map((p) => p.id)).toEqual([wanted.id]);
    },
  );
  it("filters derived answer format using the same classification as the real bank", async () => {
    const short = await plant();
    await plant({
      content: marker + "\n① 가\n② 나\n③ 다\n④ 라\n⑤ 마",
      answer: "③",
    });
    const result = await loadUnifiedBank(query({ format: "short_answer" }));
    expect(result.problems.map((p) => p.id)).toEqual([short.id]);
    expect(result.problems[0].questionType).toBe("short-answer");
    expect(result.total).toBe(1);
  });
  it("paginates matched format IDs once, with a total across every page", async () => {
    for (let index = 0; index < 13; index++) await plant();
    await plant({
      content: marker + "\n① 가\n② 나\n③ 다\n④ 라\n⑤ 마",
      answer: "①",
    });
    const first = await loadUnifiedBank(query({ format: "short_answer" }));
    const second = await loadUnifiedBank(
      query({ format: "short_answer", page: "2" }),
    );
    expect(first.problems).toHaveLength(12);
    expect(second.problems).toHaveLength(1);
    expect(second.total).toBe(13);
    expect(first.problems.some((row) => row.id === second.problems[0].id)).toBe(
      false,
    );
  });
  it("does not silently drop invalid filters or permit pool overrides", async () => {
    vi.stubEnv("NODE_ENV", "development");
    for (const suffix of [
      "source=bad",
      "pool=private",
      "hasFigure=false",
      "unitFrom=bad",
      "page=-1",
    ]) {
      const response = await GET(
        new Request(`http://localhost/api/dev/unified/problems?${suffix}`),
      );
      expect(response.status).toBe(400);
    }
    vi.stubEnv("NODE_ENV", "production");
    expect(
      (await GET(new Request("http://localhost/api/dev/unified/problems")))
        .status,
    ).toBe(404);
  });
});
