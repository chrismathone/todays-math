import { afterEach, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { prismaTestDouble } from "@/mocks/prismaTestDouble";
import { MOCK_UNITS } from "@/mocks/data";
import {
  builderId,
  builderParams,
  seedBuilderSpeedFixture,
} from "@/__tests__/helpers/builderSpeedFixture";
import { builderSpeedPglite } from "@/__tests__/helpers/builderSpeedPglite";
import {
  loadUnifiedBank,
  loadUnifiedBankBootstrap,
} from "@/lib/unifiedPreview";
import {
  loadQuestionSourceAvailability,
  loadQuestionSourceCounts,
  loadQuestionSourceMaterials,
} from "@/lib/bankSourceQuestions";
import { loadQuestionCounts } from "@/lib/problem/questionCountProjection";
import { questionBucketsFromRows } from "@/lib/problem/questionCountBuckets";
import type {
  CountSql,
  CountBucket,
  CountDimension,
} from "@/lib/problem/questionCountSql";
import { questionPageSql } from "@/lib/problem/questionCountSql";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { unifiedBankQuerySchema } from "@/contracts/bankSource.contract";

// Frozen HEAD readers, with imports redirected only to the frozen peer files.
const prior = {
  ...(await import("../../../.builder-speed-baseline/unifiedPreview")),
  ...(await import("../../../.builder-speed-baseline/bankSourceQuestions")),
  ...(await import("../../../.builder-speed-baseline/questionProjection")),
};
afterEach(() => vi.restoreAllMocks());

it("matches the old readers on real local PostgreSQL across format evidence, facets and candidate pages", async () => {
  await seedBuilderSpeedFixture();
  const books = [builderId(90001), builderId(90002)];
  for (const [i, id] of books.entries())
    await db.sourceBook.create({
      data: {
        id,
        externalKey: `speed-book-${i}`,
        kind: "school_textbook",
        grade: MOCK_UNITS[i].grade,
        publisher: `출판사 ${i}`,
        author: null,
        title: `픽스처 ${i}`,
        curriculum: "2022",
      },
    });
  const materials = [];
  for (let i = 0; i < 4; i++)
    materials.push(
      await db.sourceMaterial.create({
        data: {
          id: builderId(91001 + i),
          bookId: books[i % 2],
          externalKey: `speed-material-${i}`,
          kind: i < 2 ? "형성 평가" : "수업 자료",
          kindRaw: "fixture",
          title: `자료 ${i}`,
          sequence: i,
          chapterNo: null,
          middleNo: null,
          sectionNo: null,
          unitRaw: null,
          semester: null,
          round: null,
          levelRaw: null,
        },
      }),
    );
  const template = (await db.problem.findMany())[0];
  const rows: Record<string, unknown>[] = [];
  for (const questionType of [null, "", "단답형", "서술형", "객관식", "기타"])
    for (const familyKey of [
      null,
      "",
      " mid:legacy ",
      "mid:engine",
      "elem:engine",
      "other",
    ])
      for (const problemType of [null, "서술형"])
        for (const key of [null, "", "q:v1:bad", "proof"])
          for (const answer of ["7", "➁", MISSING_ANSWER])
            for (const choices of [false, true]) {
              const i = rows.length;
              rows.push({
                ...template,
                id: builderId(i + 1),
                problemCode: `FIX-${String(i).padStart(8, "0")}`,
                unitId: MOCK_UNITS[i % 3].id,
                questionType,
                familyKey,
                problemType,
                answer,
                questionGroupKey:
                  key === "proof"
                    ? `q:v1:${Math.floor(i / 3)
                        .toString(16)
                        .padStart(64, "0")}`
                    : key,
                source: [
                  "manual",
                  "past_exam",
                  "school_textbook",
                  "transformed",
                ][i % 4],
                sourceMaterialId: materials[Math.floor(i / 4) % 4].id,
                difficulty: ["기초", "기본", "실력", "심화", "최상위"][i % 5],
                content: `builder-speed-fixed-fixture ${i}${choices ? "\n① 1\n② 2\n③ 3\n④ 4\n⑤ 5" : ""}`,
                solution: i % 5 === 0 ? null : "풀이",
                figureUrls: i % 7 === 0 ? ["/fixture.svg"] : [],
                reviewStatus: i % 11 === 0 ? "pending" : "approved",
                directUseAllowed: i % 13 !== 0,
                pool: i % 23 === 0 ? "private" : "shared",
              });
            }
  const units = await db.unit.findMany();
  const pg = await builderSpeedPglite(rows, units, materials);
  const rawReads: { mode: string; rows: number }[] = [];
  vi.spyOn(prismaTestDouble, "$queryRaw").mockImplementation((async (
    query: CountSql,
  ) => {
    const result = await pg.queryRaw(query);
    rawReads.push({ mode: query.questionCountRead.mode, rows: result.length });
    return result;
  }) as typeof prismaTestDouble.$queryRaw);
  vi.spyOn(db.problem, "findMany").mockImplementation(
    pg.findMany as typeof db.problem.findMany,
  );
  vi.spyOn(db.problem, "groupBy").mockImplementation(pg.groupBy as never);
  const context = {
    recentProblemIds: async () => [builderId(2), builderId(6)],
  };
  try {
    const dimensions: CountDimension[] = [
      "unit",
      "difficulty",
      "source",
      "book",
      "kind",
      "material",
      "grade",
      "family",
    ];
    const legacyRows = await prior.loadQuestionCandidates({ AND: [] });
    const expected = questionBucketsFromRows(
      legacyRows.map((row) => ({ ...row, weight: 1, rowCount: 1 })),
      dimensions,
      undefined,
      { units, materials },
    );
    const sort = (buckets: CountBucket[]) =>
      buckets
        .filter((b) => b.axis !== "format" || b.key !== "unknown")
        .sort((a, b) =>
          JSON.stringify([a.axis, a.key, a.extra]).localeCompare(
            JSON.stringify([b.axis, b.key, b.extra]),
          ),
        );
    expect(sort(await loadQuestionCounts({ AND: [] }, db, dimensions))).toEqual(
      sort(expected),
    );
    expect(
      (await loadQuestionCounts({ pool: "private" }, db)).find(
        (b) => b.axis === "all",
      )?.held,
    ).toBe(0);
    expect(
      await db.$queryRaw(
        questionPageSql(
          { pool: "private" },
          [{ id: "asc" }],
          false,
          undefined,
          0,
          12,
          new Map(),
        )!,
      ),
    ).toEqual([]);
    const patches: Record<string, string>[] = [
      {},
      { page: "2" },
      { page: "9999" },
      { q: "builder-speed-fixed-fixture' OR TRUE --" },
      { q: "builder-speed-fixed-fixture_" },
      { difficulty: "기본" },
      { unitIds: MOCK_UNITS[0].id },
      { sourceGroup: "engine" },
      { sourceGroup: "school_textbook" },
      { availableFormat: "short_answer" },
      { availableFormat: "multiple_choice" },
      { availableFormat: "descriptive" },
      { reviewStatus: "pending" },
      { recent: "1" },
      { excludeIds: builderId(2) },
      { excludeFamiliesOf: builderId(101) },
      { familyOf: builderId(101) },
      { grade: MOCK_UNITS[0].grade },
      { unitFrom: MOCK_UNITS[0].id, unitTo: MOCK_UNITS[1].id },
      { sourceGroup: "school_textbook", books: books.join(",") },
      { sourceGroup: "school_textbook", materialKinds: "형성 평가" },
      { sourceGroup: "school_textbook", materials: materials[2].id },
      { hasFigure: "true" },
      { hasSolution: "true" },
      { hasAnswer: "true" },
      { ids: `${builderId(2)},${builderId(6)}` },
      { excludeIds: builderId(2), availableFormat: "short_answer" },
      { excludeIds: builderId(2), availableFormat: "multiple_choice" },
      { excludeIds: builderId(2), availableFormat: "descriptive" },
      { excludeIds: builderId(2), page: "2" },
      { excludeIds: builderId(2), page: "9999" },
      { excludeIds: builderId(2), reviewStatus: "pending" },
    ];
    for (const patch of patches) {
      const params = builderParams({ pageSize: "12", ...patch });
      const valid = unifiedBankQuerySchema.safeParse(
        Object.fromEntries(params),
      );
      expect(
        valid.success,
        JSON.stringify({ patch, issues: valid.error?.issues }),
      ).toBe(true);
      const counts = builderParams({
        ...patch,
        view: "available",
        families: "1",
      });
      expect(
        await loadQuestionSourceAvailability(counts, context),
        JSON.stringify(patch),
      ).toEqual(await prior.loadQuestionSourceAvailability(counts, context));
      expect(
        await loadUnifiedBank(params, context),
        JSON.stringify(patch),
      ).toEqual(await prior.loadUnifiedBank(params, context));
    }
    const params = new URLSearchParams({ identity: "question" });
    expect(await loadQuestionSourceCounts(params)).toEqual(
      await prior.loadQuestionSourceCounts(params),
    );
    expect(await loadUnifiedBankBootstrap("question")).toEqual(
      await prior.loadUnifiedBankBootstrap("question"),
    );
    const materialParams = builderParams({
      books: books.join(","),
      view: "materials",
    });
    expect(await loadQuestionSourceMaterials(materialParams)).toEqual(
      await prior.loadQuestionSourceMaterials(materialParams),
    );
    // R2 restores baseline counts. Raw reads are reserved for ID-only pages.
    expect(rawReads.every((read) => read.mode === "page")).toBe(true);
    expect(
      rawReads
        .filter((read) => read.mode === "page")
        .every((read) => read.rows <= 12),
    ).toBe(true);
  } finally {
    await pg.close();
  }
}, 60000);
