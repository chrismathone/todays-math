import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { prismaTestDouble } from "@/mocks/prismaTestDouble";
import { MOCK_UNITS } from "@/mocks/data";
import {
  loadUnifiedBank,
  loadUnifiedBankCurriculum,
} from "@/lib/unifiedPreview";
import {
  unifiedBankCurriculumSchema,
  unifiedBankScopeCountsSchema,
} from "@/contracts/unifiedBankBootstrap.contract";
import { bankSourcesResponse } from "@/lib/bankSourceRoute";
import { loadQuestionScopeCounts } from "@/lib/bankSourceQuestions";
import type { CountSql } from "@/lib/problem/questionCountSql";
import {
  builderId,
  builderParams,
  seedBuilderSpeedFixture,
} from "@/__tests__/helpers/builderSpeedFixture";
import { GET as devGet } from "@/app/api/dev/unified/problems/route";
import {
  GET as studioGet,
  POST as studioPost,
} from "@/app/api/studio/problems/route";

const access = vi.hoisted(() => vi.fn());
vi.mock("@/lib/studio-ai/guard", () => ({
  authorizeStudio: access,
  STUDIO_HEADERS: { "Cache-Control": "no-store" },
}));
vi.mock("server-only", () => ({}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("selected lesson counts and metadata-free pages", () => {
  beforeEach(() => {
    // The shared test double omits this relation projection; evaluate the real
    // predicates and attach only fixture unit labels (no live DB connection).
    const find = db.problem.findMany.bind(db.problem);
    vi.spyOn(db.problem, "findMany").mockImplementation((async (
      args: Parameters<typeof db.problem.findMany>[0],
    ) => {
      if (!args?.select?.unit) return find(args);
      const rows = await find({
        ...args,
        select: { ...args.select, unit: false, unitId: true },
      });
      return rows.map((row) => ({
        ...row,
        unit: MOCK_UNITS.find((unit) => unit.id === row.unitId)!,
      }));
    }) as typeof db.problem.findMany);
  });
  it.each<Record<string, string>>([
    {},
    { sourceGroup: "engine" },
    { recent: "1" },
    { availableFormat: "multiple_choice" },
  ])(
    "keeps selected lesson counts and candidate/output identities equal to the old reader: %j",
    async (patch) => {
      await seedBuilderSpeedFixture();
      const context = {
        recentProblemIds: async () => [builderId(6), builderId(10)],
      };
      const params = builderParams({
        ...patch,
        unitIds: MOCK_UNITS[0].id,
        pageSize: "100",
      });
      const original = await loadUnifiedBank(params, context);
      const units = vi.spyOn(db.unit, "findMany");
      const raw = vi.spyOn(prismaTestDouble, "$queryRaw");
      const scope = await loadQuestionScopeCounts(
        new URLSearchParams({
          ...Object.fromEntries(params),
          view: "scope-counts",
          families: "1",
        }),
        context,
      );
      expect(unifiedBankScopeCountsSchema.parse(scope)).toEqual(scope);
      expect(scope.unitCounts[MOCK_UNITS[0].id] ?? 0).toBe(original.total);
      expect(
        Object.keys(scope.unitCounts).every((id) => id === MOCK_UNITS[0].id),
      ).toBe(true);
      expect(
        Object.values(scope.unitFamilies).every(
          (count) => count <= original.total,
        ),
      ).toBe(true);
      for (const [sql] of raw.mock.calls) {
        const read = (sql as CountSql).questionCountRead;
        if (read?.mode === "counts") {
          expect(read.dimensions).toEqual(["unit", "family"]);
          expect(JSON.stringify(read.where)).toContain(MOCK_UNITS[0].id);
        }
      }
      raw.mockClear();
      const page = await loadUnifiedBank(
        new URLSearchParams({ ...Object.fromEntries(params), view: "page" }),
        context,
      );
      const {
        grades: _grades,
        chapters: _chapters,
        units: _units,
        unitCounts: _counts,
        ...oldPage
      } = original;
      expect(page).toEqual({ ...oldPage, grades: [], chapters: [] });
      expect([_grades, _chapters, _units, _counts]).toHaveLength(4);
      expect(units).not.toHaveBeenCalled();
      expect(
        raw.mock.calls.every(([sql]) => {
          const read = (sql as CountSql).questionCountRead;
          return (
            read?.mode !== "counts" || (read.dimensions ?? []).length === 0
          );
        }),
      ).toBe(true);
    },
  );

  it("preserves exact saved representations without reading global lesson or grade metadata", async () => {
    await seedBuilderSpeedFixture();
    const params = builderParams({
      ids: [builderId(2), builderId(3)].join(","),
      pageSize: "100",
    });
    const original = await loadUnifiedBank(params);
    const units = vi.spyOn(db.unit, "findMany");
    const raw = vi.spyOn(prismaTestDouble, "$queryRaw");
    const page = await loadUnifiedBank(
      new URLSearchParams({ ...Object.fromEntries(params), view: "page" }),
    );
    expect(page.problems).toEqual(original.problems);
    expect(page.total).toBe(original.total);
    expect(page.queryMode).toBe("exact_ids");
    expect(units).not.toHaveBeenCalled();
    expect(
      raw.mock.calls.every(
        ([sql]) => (sql as CountSql).questionCountRead?.mode !== "counts",
      ),
    ).toBe(true);
  });

  it.each([
    { view: "scope-counts", unitIds: MOCK_UNITS[0].id },
    { identity: "question", view: "scope-counts" },
    { identity: "question", view: "scope-counts", unitIds: "invalid" },
    {
      identity: "question",
      view: "scope-counts",
      unitIds: MOCK_UNITS[0].id,
      version: "1",
    },
    {
      identity: "question",
      view: "scope-counts",
      unitIds: MOCK_UNITS[0].id,
      arbitrary: "1",
    },
  ])(
    "rejects an invalid scoped view without returning global inventory: %j",
    async (body) => {
      const response = await bankSourcesResponse(
        new Request("http://localhost/api/studio/problems/sources", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
        { "Cache-Control": "no-store" },
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toHaveProperty("error");
    },
  );
});

const query = (extra: Record<string, string> = {}) =>
  new URLSearchParams({
    identity: "question",
    view: "curriculum",
    ...extra,
  });

describe("S2 curriculum demand reads", () => {
  it("keeps legacy strict response shape and treats absent availability as unknown", async () => {
    const legacy = await loadUnifiedBankCurriculum(query());
    expect(Object.keys(legacy)).toEqual([
      "view",
      "grades",
      "chapters",
      "units",
    ]);
    const oldStrictSchema = unifiedBankCurriculumSchema.omit({
      gradeCounts: true,
      chapterCounts: true,
    });
    expect(oldStrictSchema.parse(legacy)).toEqual(legacy);
    expect(
      unifiedBankCurriculumSchema.parse(legacy).gradeCounts,
    ).toBeUndefined();
    expect(
      unifiedBankCurriculumSchema.parse(legacy).chapterCounts,
    ).toBeUndefined();
  });

  it.each<Record<string, string>>([
    {},
    { sourceGroup: "engine" },
    { sourceGroup: "school_textbook" },
    { recent: "1" },
    { availableFormat: "multiple_choice" },
    {
      sourceGroup: "school_textbook",
      books: "00000000-0000-4000-8000-000000000001",
      materials: "00000000-0000-4000-8000-000000000002",
      materialKinds: "기초 연산",
    },
  ])(
    "opt-in grouped counts equal scope-counts with identical filters and account: %j",
    async (filters) => {
      await seedBuilderSpeedFixture();
      const context = {
        recentProblemIds: vi.fn(async () => [builderId(6), builderId(10)]),
      };
      const allUnits = await db.unit.findMany({});
      const base = Object.fromEntries(builderParams(filters));
      const scopes = await loadQuestionScopeCounts(
        new URLSearchParams({
          ...base,
          view: "scope-counts",
          unitIds: allUnits.map((u) => u.id).join(","),
        }),
        context,
      );
      const expected = (field: "grade" | "chapter", value: string) =>
        allUnits
          .filter((u) => u[field] === value)
          .reduce((sum, u) => sum + (scopes.unitCounts[u.id] ?? 0), 0);
      const grades = await loadUnifiedBankCurriculum(
        query({ ...base, availability: "1" }),
        context,
      );
      expect(unifiedBankCurriculumSchema.parse(grades)).toEqual(grades);
      expect(grades.gradeCounts).toEqual(
        Object.fromEntries(grades.grades.map((g) => [g, expected("grade", g)])),
      );
      const grade = MOCK_UNITS[0].grade;
      const chapters = await loadUnifiedBankCurriculum(
        query({ ...base, availability: "1", grade }),
        context,
      );
      expect(chapters.chapterCounts).toEqual(
        Object.fromEntries(
          chapters.chapters.map((c) => [
            c,
            allUnits
              .filter((u) => u.grade === grade && u.chapter === c)
              .reduce((sum, u) => sum + (scopes.unitCounts[u.id] ?? 0), 0),
          ]),
        ),
      );
      if (filters.recent)
        expect(context.recentProblemIds).toHaveBeenCalledTimes(3);
    },
  );

  it("keeps empty grades and chapters in navigation with explicit zero counts", async () => {
    const legacy = await loadUnifiedBankCurriculum(query());
    const empty = await loadUnifiedBankCurriculum(
      query({ availability: "1", q: "no-scope-availability-match-20261020" }),
    );
    expect(empty.grades).toEqual(legacy.grades);
    expect(empty.gradeCounts).toEqual(
      Object.fromEntries(legacy.grades.map((g) => [g, 0])),
    );
    const grade = MOCK_UNITS[0].grade;
    const chapters = await loadUnifiedBankCurriculum(query({ grade }));
    const emptyChapters = await loadUnifiedBankCurriculum(
      query({
        grade,
        availability: "1",
        q: "no-scope-availability-match-20261020",
      }),
    );
    expect(emptyChapters.chapters).toEqual(chapters.chapters);
    expect(emptyChapters.chapterCounts).toEqual(
      Object.fromEntries(chapters.chapters.map((c) => [c, 0])),
    );
  });

  it("rejects opt-in recent filtering without authenticated context", async () => {
    await expect(
      loadUnifiedBankCurriculum(query({ availability: "1", recent: "1" })),
    ).rejects.toThrow("계정");
  });

  it("reads grade names, then chapters, then just the selected lesson metadata without any problem read or tally", async () => {
    const problemRows = vi.spyOn(db.problem, "findMany");
    const counts = vi.spyOn(db.problem, "count");
    const groups = vi.spyOn(db.problem, "groupBy");
    const raw = vi.spyOn(prismaTestDouble, "$queryRaw");
    const units = vi.spyOn(db.unit, "findMany");
    const unitGroups = vi.spyOn(db.unit, "groupBy");
    const first = await loadUnifiedBankCurriculum(query());
    expect(unifiedBankCurriculumSchema.parse(first)).toEqual(first);
    expect(first.grades.length).toBeGreaterThan(0);
    expect(first.units).toEqual([]);
    expect(first.chapters).toEqual([]);
    expect(unitGroups).toHaveBeenLastCalledWith({
      by: ["grade"],
      _min: { orderIndex: true },
      orderBy: { _min: { orderIndex: "asc" } },
    });
    expect(units).not.toHaveBeenCalled();
    const unit = MOCK_UNITS[0];
    const second = await loadUnifiedBankCurriculum(
      query({ grade: unit.grade }),
    );
    expect(second.chapters).toContain(unit.chapter);
    expect(second.units).toEqual([]);
    expect(unitGroups).toHaveBeenLastCalledWith({
      where: { grade: unit.grade },
      by: ["chapter"],
      _min: { orderIndex: true },
      orderBy: { _min: { orderIndex: "asc" } },
    });
    expect(units).not.toHaveBeenCalled();
    const third = await loadUnifiedBankCurriculum(
      query({ grade: unit.grade, chapter: unit.chapter }),
    );
    expect(third.units.length).toBeGreaterThan(0);
    expect(
      third.units.every(
        (row) => row.grade === unit.grade && row.chapter === unit.chapter,
      ),
    ).toBe(true);
    expect(third.grades).toEqual([]);
    expect(third.chapters).toEqual([]);
    expect(problemRows).not.toHaveBeenCalled();
    expect(counts).not.toHaveBeenCalled();
    expect(groups).not.toHaveBeenCalled();
    expect(raw).not.toHaveBeenCalled();
  });

  it("resolves only explicit saved lesson IDs and preserves curriculum order", async () => {
    const chosen = MOCK_UNITS.slice(0, 2);
    const result = await loadUnifiedBankCurriculum(
      query({
        unitIds: chosen
          .map((row) => row.id)
          .reverse()
          .join(","),
      }),
    );
    expect(result.units.map((row) => row.id)).toEqual(
      chosen.map((row) => row.id),
    );
    expect(Object.keys(result)).toEqual([
      "view",
      "grades",
      "chapters",
      "units",
    ]);
  });

  it.each([
    "view=curriculum",
    "identity=question&view=curriculum&availability=0",
    "identity=question&view=curriculum&availability=1&arbitrary=1",
    "identity=question&view=curriculum&availability=1&books=invalid",
    "identity=question&view=curriculum&recent=1",
    "identity=question&view=curriculum&chapter=one",
    "identity=question&view=curriculum&unitIds=invalid",
    `identity=question&view=curriculum&unitIds=${MOCK_UNITS[0].id}&grade=중1`,
    "identity=question&view=curriculum&grade=중1&grade=중2",
  ])(
    "rejects malformed or widened curriculum reads before accessing the DB: %s",
    async (params) => {
      const find = vi.spyOn(db.unit, "findMany");
      const groups = vi.spyOn(db.unit, "groupBy");
      await expect(
        loadUnifiedBankCurriculum(new URLSearchParams(params)),
      ).rejects.toThrow("검색 조건");
      expect(find).not.toHaveBeenCalled();
      expect(groups).not.toHaveBeenCalled();
    },
  );

  it("retains the production authorization and development-only gates for GET and read-only POST", async () => {
    const request = new Request(
      `http://localhost/api/studio/problems?${query()}`,
    );
    const units = vi.spyOn(db.unit, "findMany");
    const groups = vi.spyOn(db.unit, "groupBy");
    access.mockResolvedValueOnce({
      response: new Response(null, { status: 401 }),
    });
    expect((await studioGet(request)).status).toBe(401);
    expect(units).not.toHaveBeenCalled();
    expect(groups).not.toHaveBeenCalled();
    access.mockResolvedValue({
      user: { id: "10000000-0000-4000-8000-000000000001" },
    });
    const get = await studioGet(request);
    expect(get.status).toBe(200);
    expect(get.headers.get("cache-control")).toBe("no-store");
    const post = await studioPost(
      new Request("http://localhost/api/studio/problems", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(query())),
      }),
    );
    expect(await post.json()).toEqual(await get.json());
    vi.stubEnv("NODE_ENV", "production");
    expect((await devGet(request)).status).toBe(404);
    vi.stubEnv("NODE_ENV", "development");
    expect((await devGet(request)).status).toBe(200);
  });
});
