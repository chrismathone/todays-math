import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { prismaTestDouble } from "@/mocks/prismaTestDouble";
import { MOCK_UNITS } from "@/mocks/data";
import { loadBankSourceAvailability } from "@/lib/bankSourceAvailability";
import { loadBankSourceCounts } from "@/lib/bankSourceCounts";
import { loadUnifiedBank } from "@/lib/unifiedPreview";
import {
  builderId,
  builderParams,
  seedBuilderSpeedFixture,
} from "@/__tests__/helpers/builderSpeedFixture";
import { builderSpeedPglite } from "@/__tests__/helpers/builderSpeedPglite";
import type { CountSql } from "@/lib/problem/questionCountSql";

it.skipIf(!process.env.BUILDER_SPEED_MEASURE)(
  "measures four paths without any shared DB or network",
  async () => {
    const size = Number(process.env.BUILDER_SPEED_ROWS ?? 12000);
    // Revisions include updatedAt. Freeze only fixture creation, so separate
    // before/after processes have identical rows while the measurements use real time.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-18T00:00:00.000Z"));
    try {
      await seedBuilderSpeedFixture(size);
    } finally {
      vi.useRealTimers();
    }
    const fixtureProblemRows = await db.problem.count();
    const curriculumUnits = (await db.unit.findMany()).length;
    const localPg =
      process.env.BUILDER_SPEED_DB === "pglite"
        ? await builderSpeedPglite(
            (await db.problem.findMany()) as unknown as Record<
              string,
              unknown
            >[],
            (await db.unit.findMany()) as unknown as Record<string, unknown>[],
          )
        : undefined;
    const baseline = process.env.BUILDER_SPEED_BASELINE
      ? resolve(process.env.BUILDER_SPEED_BASELINE)
      : undefined;
    const availability = baseline
      ? (
          await import(
            /* @vite-ignore */ `${baseline}/bankSourceAvailability.ts`
          )
        ).loadBankSourceAvailability
      : loadBankSourceAvailability;
    const listing = baseline
      ? (await import(/* @vite-ignore */ `${baseline}/unifiedPreview.ts`))
          .loadUnifiedBank
      : loadUnifiedBank;
    const sources = baseline
      ? (await import(/* @vite-ignore */ `${baseline}/bankSourceCounts.ts`))
          .loadBankSourceCounts
      : loadBankSourceCounts;
    let reads: {
      model: string;
      operation: string;
      rows: number;
      bytes: number;
      take?: number;
      content?: boolean;
      answer?: boolean;
      ms?: number;
      mode?: string;
    }[] = [];
    const raw = db.$queryRaw.bind(db);
    vi.spyOn(prismaTestDouble, "$queryRaw").mockImplementation((async (
      query: CountSql,
    ) => {
      const start = performance.now();
      const value = (
        localPg ? await localPg.queryRaw(query) : await raw(query)
      ) as unknown[];
      const content = false;
      reads.push({
        model: "problem",
        operation: "$queryRaw",
        mode: query.questionCountRead.mode,
        ms: +(performance.now() - start).toFixed(2),
        rows: value.length,
        bytes: Buffer.byteLength(JSON.stringify(value)),
        content,
        answer: false,
        take: content ? 500 : query.questionCountRead.take,
      });
      return value;
    }) as typeof prismaTestDouble.$queryRaw);
    for (const [name, model] of Object.entries({
      problem: db.problem,
      unit: db.unit,
      sourceBook: db.sourceBook,
      sourceMaterial: db.sourceMaterial,
    })) {
      for (const op of ["findMany", "groupBy", "count"] as const) {
        if (!(op in model)) continue;
        const record = model as unknown as Record<
          string,
          (...args: unknown[]) => Promise<unknown>
        >;
        const original =
          name === "problem" && localPg
            ? (localPg[op].bind(localPg) as (
                ...args: unknown[]
              ) => Promise<unknown>)
            : record[op].bind(model);
        vi.spyOn(record, op).mockImplementation(async (...args: unknown[]) => {
          const query = args[0] as
            { select?: Record<string, unknown>; take?: number } | undefined;
          const patched =
            name === "problem" && query?.select?.unit
              ? [
                  {
                    ...query,
                    select: { ...query.select, unit: false, unitId: true },
                  },
                ]
              : args;
          let result = await original(...patched);
          if (name === "problem" && query?.select?.unit)
            result = (result as { unitId: string }[]).map((row) => ({
              ...row,
              unit: MOCK_UNITS.find((u) => u.id === row.unitId)!,
            }));
          reads.push({
            model: name,
            operation: op,
            rows: Array.isArray(result) ? result.length : 1,
            bytes: Buffer.byteLength(JSON.stringify(result)),
            take: query?.take,
            content: Boolean(query?.select?.content),
            answer: Boolean(query?.select?.answer),
          });
          return result;
        });
      }
    }
    const measures = [];
    const context = {
      recentProblemIds: async () => [builderId(2), builderId(6)],
    };
    const paths: [string, () => Promise<unknown>][] = [
      [
        "1 initial scopes",
        () =>
          availability(
            builderParams({ view: "available", families: "1", recent: "1" }),
            context,
          ),
      ],
      [
        "2 add questions",
        () =>
          listing(builderParams({ unitIds: MOCK_UNITS[0].id, pageSize: "12" })),
      ],
      [
        "3 replace questions",
        () =>
          listing(
            builderParams({
              unitIds: MOCK_UNITS[0].id,
              difficulty: "기본",
              excludeIds: builderId(2),
              pageSize: "10",
            }),
          ),
      ],
      [
        "4 source picker",
        () => sources(new URLSearchParams({ identity: "question" })),
      ],
    ];
    for (const [path, run] of [
      ...paths,
      ...paths.map(
        ([path, run]) =>
          [`${path} warm`, run] as [string, () => Promise<unknown>],
      ),
    ]) {
      reads = [];
      const start = performance.now();
      const value = await run();
      const canonical = (value: unknown): unknown =>
        Array.isArray(value)
          ? value.map(canonical)
          : value && typeof value === "object"
            ? Object.fromEntries(
                Object.entries(value)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([key, child]) => [key, canonical(child)]),
              )
            : value;
      measures.push({
        path,
        ms: +(performance.now() - start).toFixed(2),
        queries: reads.length,
        rows: reads.reduce((s, r) => s + r.rows, 0),
        bytes: reads.reduce((s, r) => s + r.bytes, 0),
        responseBytes: Buffer.byteLength(JSON.stringify(value)),
        responseSha256: createHash("sha256")
          .update(JSON.stringify(canonical(value)))
          .digest("hex"),
        reads,
      });
    }
    await localPg?.close();
    vi.restoreAllMocks();
    expect(measures).toHaveLength(8);
    writeFileSync(
      `docs/planning/tracks/reports/builder-speed-${process.env.BUILDER_SPEED_MEASURE}.json`,
      JSON.stringify(
        {
          fixtureRows: size,
          fixtureProblemRows,
          curriculumUnits,
          kind: `${localPg ? "problem reads: local PGlite PostgreSQL; other metadata: Prisma mock" : "all reads: in-memory Prisma mock"}; logical returned rows; JSON UTF-8 return bytes; excludes transaction/auth/network`,
          measures,
        },
        null,
        2,
      ) + "\n",
    );
  },
  120000,
);
