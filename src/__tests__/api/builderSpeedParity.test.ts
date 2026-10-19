import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolve } from "node:path";
import type { CountSql } from "@/lib/problem/questionCountSql";
import { db } from "@/lib/db";
import {
  prismaTestDouble,
  resetPrismaTestDouble,
} from "@/mocks/prismaTestDouble";
import { MOCK_UNITS } from "@/mocks/data";
import { loadBankSourceAvailability } from "@/lib/bankSourceAvailability";
import { loadBankSourceCounts } from "@/lib/bankSourceCounts";
import {
  loadUnifiedBank,
  loadUnifiedBankBootstrap,
} from "@/lib/unifiedPreview";
import {
  loadQuestionCandidates,
  projectQuestionCandidates,
} from "@/lib/problem/questionProjection";
import { resolveUnifiedBankQuery } from "@/lib/unifiedPreview";
import {
  builderId,
  builderParams,
  seedBuilderSpeedFixture,
} from "@/__tests__/helpers/builderSpeedFixture";

const baseline = process.env.BUILDER_SPEED_BASELINE
  ? resolve(process.env.BUILDER_SPEED_BASELINE)
  : undefined;
const reads: {
  loadBankSourceAvailability: typeof loadBankSourceAvailability;
  loadBankSourceCounts: typeof loadBankSourceCounts;
  loadUnifiedBank: typeof loadUnifiedBank;
  loadUnifiedBankBootstrap: typeof loadUnifiedBankBootstrap;
  resolveUnifiedBankQuery: typeof resolveUnifiedBankQuery;
  loadQuestionCandidates: typeof loadQuestionCandidates;
  projectQuestionCandidates: typeof projectQuestionCandidates;
} = baseline
  ? {
      ...(await import(
        /* @vite-ignore */ `${baseline}/bankSourceAvailability.ts`
      )),
      ...(await import(/* @vite-ignore */ `${baseline}/bankSourceCounts.ts`)),
      ...(await import(/* @vite-ignore */ `${baseline}/unifiedPreview.ts`)),
      ...(await import(/* @vite-ignore */ `${baseline}/questionProjection.ts`)),
    }
  : {
      loadBankSourceAvailability,
      loadBankSourceCounts,
      loadUnifiedBank,
      loadUnifiedBankBootstrap,
      resolveUnifiedBankQuery,
      loadQuestionCandidates,
      projectQuestionCandidates,
    };

beforeEach(async () => {
  await seedBuilderSpeedFixture();
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
afterEach(() => vi.restoreAllMocks());

describe("builder speed: frozen pre-change counts and candidate identities", () => {
  for (const patch of [
    {},
    { difficulty: "기본" },
    { unitIds: MOCK_UNITS[0].id },
    { sourceGroup: "engine" },
    { availableFormat: "short_answer" },
    { availableFormat: "multiple_choice" },
    { availableFormat: "descriptive" },
    { reviewStatus: "pending" },
    { recent: "1" },
    { excludeIds: builderId(2) },
  ] as Record<string, string>[]) {
    it(`preserves every tally and candidate: ${JSON.stringify(patch)}`, async () => {
      const context = {
        recentProblemIds: async () => [builderId(6), builderId(10)],
      };
      const params = builderParams(patch);
      const availability = await reads.loadBankSourceAvailability(
        builderParams({ ...patch, view: "available", families: "1" }),
        context,
      );
      const listing = await reads.loadUnifiedBank(
        builderParams({ ...patch, pageSize: "100" }),
        context,
      );
      const resolved = await reads.resolveUnifiedBankQuery(params, context);
      const candidates = await reads.loadQuestionCandidates({
        AND: resolved.selection,
      });
      expect({
        availability,
        total: listing.total,
        ids: listing.problems.map((row) => [row.id, row.questionId]),
        candidates: reads
          .projectQuestionCandidates(candidates, {
            availableOnly: true,
            format: resolved.format,
          })
          .map((g: { questionId: string; members: { id: string }[] }) => [
            g.questionId,
            g.members.map((r) => r.id),
          ]),
      }).toMatchSnapshot();
    });
  }
  it("preserves global picker and bootstrap counts", async () => {
    expect({
      counts: await reads.loadBankSourceCounts(
        new URLSearchParams({ identity: "question" }),
      ),
      bootstrap: await reads.loadUnifiedBankBootstrap("question"),
    }).toMatchSnapshot();
  });
  it("aggregates counts in SQL without a full candidate or payload scan", async () => {
    const find = vi.mocked(db.problem.findMany);
    find.mockClear();
    const groups = vi.spyOn(db.problem, "groupBy");
    const raw = vi.spyOn(prismaTestDouble, "$queryRaw");
    await loadBankSourceAvailability(
      builderParams({ view: "available", families: "1" }),
    );
    expect(
      raw.mock.calls.map(([q]) => (q as CountSql).questionCountRead?.mode),
    ).toEqual([undefined, "formats", "counts"]);
    expect(groups).not.toHaveBeenCalled();
    const metadata = find.mock.calls.filter(
      ([args]) => args?.select?.answer && args?.select?.questionGroupKey,
    );
    expect(metadata).toHaveLength(0);
    expect(find.mock.calls.every(([args]) => !args?.select?.solution)).toBe(
      true,
    );
  });
  it("keeps a legacy NULL count read in three SQL round trips including fingerprint", async () => {
    resetPrismaTestDouble();
    await seedBuilderSpeedFixture(1200);
    const raw = vi.spyOn(prismaTestDouble, "$queryRaw");
    const find = vi.mocked(db.problem.findMany);
    find.mockClear();
    await loadBankSourceAvailability(
      builderParams({ view: "available", families: "1" }),
    );
    expect(
      raw.mock.calls.map(([q]) => (q as CountSql).questionCountRead?.mode),
    ).toEqual([undefined, "formats", "counts"]);
    const metadata = find.mock.calls.filter(
      ([args]) => args?.select?.answer && args?.select?.questionGroupKey,
    );
    expect(metadata).toHaveLength(0);
  });
  it("returns only the requested IDs from SQL candidate pages", async () => {
    resetPrismaTestDouble();
    await seedBuilderSpeedFixture(1200);
    const find = vi.mocked(db.problem.findMany);
    find.mockClear();
    const raw = vi.spyOn(prismaTestDouble, "$queryRaw");
    const result = await loadUnifiedBank(
      builderParams({ pageSize: "12", page: "2", excludeIds: builderId(2) }),
    );
    expect(result.problems).toHaveLength(12);
    expect(result.total).toBeGreaterThan(12);
    const pageReads = raw.mock.calls.flatMap(([q], i) =>
      (q as CountSql).questionCountRead?.mode === "page" ? [i] : [],
    );
    expect(pageReads).toHaveLength(1);
    expect(await raw.mock.results[pageReads[0]].value).toHaveLength(12);
    const pageQuestions = new Set(result.problems.map((row) => row.questionId));
    const payloadReads = find.mock.calls.flatMap(([args], index) =>
      args?.select?.answer && args?.select?.content ? [index] : [],
    );
    expect(payloadReads.length).toBeGreaterThan(0);
    for (const index of payloadReads) {
      const rows = (await find.mock.results[index].value) as {
        id: string;
        questionGroupKey: string | null;
      }[];
      expect(
        rows.every((row) =>
          pageQuestions.has(row.questionGroupKey ?? `row:${row.id}`),
        ),
      ).toBe(true);
    }
  });
  it("does not reuse another account's recent exclusions or retain counts after a bank write", async () => {
    const params = builderParams({ view: "available", recent: "1" });
    const full = await loadBankSourceAvailability(params, {
      recentProblemIds: async () => [],
    });
    const none = await loadBankSourceAvailability(params, {
      recentProblemIds: async () =>
        Array.from({ length: 240 }, (_, i) => builderId(i + 1)),
    });
    expect(full.available).toBeGreaterThan(0);
    expect(none.available).toBe(0);
    const counts = builderParams({ view: "available" });
    const before = await loadBankSourceAvailability(counts);
    for (let i = 0; i < 240; i++)
      await db.problem.update({
        where: { id: builderId(i + 1) },
        data: { directUseAllowed: false },
      });
    const after = await loadBankSourceAvailability(counts);
    expect(before.available).toBeGreaterThan(0);
    expect(after.available).toBe(0);
    expect(after.held).toBe(before.held);
  });
});
