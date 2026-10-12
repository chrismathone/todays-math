import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  assertSourceReferencesRetained,
  engineSourceReviewState,
  matchesEngineImportReadback,
  parseEngineSourceReferences,
  resolveEngineSourceReferences,
  type EngineProvenance,
  type OriginalSourceProblem,
} from "../../../scripts/import/engine-source-references";

const mocks = {
  unitFindMany: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
};
const client = {
  unit: { findMany: mocks.unitFindMany },
  problem: { findMany: mocks.findMany, create: mocks.create },
};

import {
  applyEnginePlan,
  buildTargetRows,
  type Target,
} from "../../../scripts/import/load-engine-problems";
import { defaultJudgeRegistry } from "@/lib/middle/judge/registry";

const ORIGINAL = "abcdef01-0000-4000-8000-000000000001";
const OTHER = "abcdef02-0000-4000-8000-000000000002";
const UNIT = "abcdef03-0000-4000-8000-000000000003";
const generated = [
  {
    externalId: "engine-mid:seeded-short",
    unitId: UNIT,
    familyKey: "mid:unit|type",
  },
  {
    externalId: "engine-mid:seeded-choice",
    unitId: UNIT,
    familyKey: "mid:unit|type",
  },
];
const reference = {
  externalId: generated[0].externalId,
  originProblemId: ORIGINAL,
};
const refs = () => parseEngineSourceReferences([reference], generated);
const original = (
  overrides: Partial<OriginalSourceProblem> = {},
): OriginalSourceProblem => ({
  id: ORIGINAL,
  unitId: UNIT,
  source: "past_exam",
  originProblemId: null,
  pool: "shared",
  ...overrides,
});
const stored = (
  overrides: Partial<EngineProvenance> = {},
): EngineProvenance => ({
  ...generated[0],
  source: "manual",
  originProblemId: ORIGINAL,
  examId: null,
  school: null,
  questionNumber: null,
  sourceMaterialId: null,
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  process.exitCode = 0;
});

describe("explicit source reference preflight", () => {
  it("leaves absent or empty mappings unlinked, including legacy duplicate generation", () => {
    for (const input of [undefined, []])
      expect(
        parseEngineSourceReferences(input, [...generated, generated[0]]).size,
      ).toBe(0);
  });

  it.each([
    null,
    {},
    "source",
    [null],
    [{ ...reference, originProblemId: "bad" }],
    [{ ...reference, externalId: "" }],
    [{ ...reference, originProblemId: 12 }],
    [{ ...reference, school: "guess" }],
  ])("rejects malformed mappings: %j", (input) => {
    expect(() => parseEngineSourceReferences(input, generated)).toThrow();
  });

  it("normalizes a valid uppercase UUID without changing the seeded externalId", () => {
    expect(
      parseEngineSourceReferences(
        [{ ...reference, originProblemId: ORIGINAL.toUpperCase() }],
        generated,
      ).get(reference.externalId),
    ).toBe(ORIGINAL);
  });

  it("rejects duplicate, conflicting, unknown and ambiguous generated IDs", () => {
    expect(() =>
      parseEngineSourceReferences([reference, reference], generated),
    ).toThrow("Duplicate sourceReferences");
    expect(() =>
      parseEngineSourceReferences(
        [reference, { ...reference, originProblemId: OTHER }],
        generated,
      ),
    ).toThrow("Conflicting sourceReferences");
    expect(() =>
      parseEngineSourceReferences(
        [{ ...reference, externalId: "not-generated" }],
        generated,
      ),
    ).toThrow("Unknown generated externalId");
    expect(() =>
      parseEngineSourceReferences([reference], [...generated, generated[0]]),
    ).toThrow("Duplicate generated externalId");
  });

  it("reads distinct originals once for multiple specified rows and never infers a sibling link", async () => {
    const read = vi.fn().mockResolvedValue([original()]);
    const references = parseEngineSourceReferences(
      generated.map((r) => ({
        externalId: r.externalId,
        originProblemId: ORIGINAL,
      })),
      generated,
    );
    await resolveEngineSourceReferences(references, generated, [], read);
    expect(read).toHaveBeenCalledExactlyOnceWith([ORIGINAL]);
    expect(refs().has(generated[1].externalId)).toBe(false);
    await resolveEngineSourceReferences(new Map(), generated, [], read);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it.each(["past_exam", "school_textbook", "transformed"])(
    "accepts an original %s in the same unit",
    async (source) => {
      await expect(
        resolveEngineSourceReferences(refs(), generated, [], async () => [
          original({ source }),
        ]),
      ).resolves.toBeUndefined();
    },
  );

  it.each(["manual", "ai_generated", "workbook"])(
    "rejects unrelated/unsupported ProblemSource %s",
    async (source) => {
      await expect(
        resolveEngineSourceReferences(refs(), generated, [], async () => [
          original({ source }),
        ]),
      ).rejects.toThrow("Unrelated source");
    },
  );

  it("rejects missing originals, transformed chains and mismatching units", async () => {
    await expect(
      resolveEngineSourceReferences(refs(), generated, [], async () => []),
    ).rejects.toThrow("does not exist");
    await expect(
      resolveEngineSourceReferences(refs(), generated, [], async () => [
        original({ source: "transformed", originProblemId: OTHER }),
      ]),
    ).rejects.toThrow("transformed chain");
    await expect(
      resolveEngineSourceReferences(refs(), generated, [], async () => [
        original({ unitId: OTHER }),
      ]),
    ).rejects.toThrow("unit differs");
  });

  it.each(["past_exam", "school_textbook", "transformed"])(
    "rejects a private %s original before attaching its metadata",
    async (source) => {
      await expect(
        resolveEngineSourceReferences(refs(), generated, [], async () => [
          original({ source, pool: "private" }),
        ]),
      ).rejects.toThrow("not shared");
    },
  );

  it.each([
    { originProblemId: null },
    { originProblemId: OTHER },
    { source: "past_exam" },
    { unitId: OTHER },
    { familyKey: "copied-source-family" },
    { examId: "real-exam" },
    { school: "real-school" },
    { questionNumber: 3 },
    { sourceMaterialId: OTHER },
  ])(
    "rejects conflicting historical provenance without updating it: %j",
    async (patch) => {
      await expect(
        resolveEngineSourceReferences(
          refs(),
          generated,
          [stored(patch)],
          async () => [original()],
        ),
      ).rejects.toThrow("historical rows are never updated");
    },
  );

  it("permits an exact provenance rerun and rejects a discarded target", async () => {
    await expect(
      resolveEngineSourceReferences(refs(), generated, [stored()], async () => [
        original(),
      ]),
    ).resolves.toBeUndefined();
    expect(() =>
      assertSourceReferencesRetained(refs(), [generated[1].externalId]),
    ).toThrow("Deduplication would discard");
    expect(() =>
      assertSourceReferencesRetained(
        refs(),
        generated.map((r) => r.externalId),
      ),
    ).not.toThrow();
  });

  it("locks new linked rows, preserving the original unlinked figure guard", () => {
    expect(engineSourceReviewState(ORIGINAL, false)).toEqual({
      reviewStatus: "pending",
      directUseAllowed: false,
    });
    expect(engineSourceReviewState(ORIGINAL, true)).toEqual({
      reviewStatus: "pending",
      directUseAllowed: false,
    });
    expect(engineSourceReviewState(null, false)).toEqual({
      reviewStatus: "approved",
      directUseAllowed: true,
    });
    expect(engineSourceReviewState(null, true)).toEqual({
      reviewStatus: "approved",
      directUseAllowed: false,
    });
  });

  it("readback detects altered origins, native identity, review gates and borrowed exam metadata", () => {
    const expected = {
      ...generated[0],
      originProblemId: ORIGINAL,
      ...engineSourceReviewState(ORIGINAL, false),
    };
    const back = {
      ...stored(),
      pool: "shared",
      ...engineSourceReviewState(ORIGINAL, false),
    };
    expect(matchesEngineImportReadback(back, expected)).toBe(true);
    for (const patch of [
      { originProblemId: null },
      { source: "transformed" },
      { familyKey: "source-family" },
      { externalId: "new-seed" },
      { unitId: OTHER },
      { pool: "private" },
      { reviewStatus: "approved" },
      { directUseAllowed: true },
      { examId: "exam" },
      { school: "school" },
      { questionNumber: 2 },
      { sourceMaterialId: OTHER },
    ])
      expect(
        matchesEngineImportReadback({ ...back, ...patch }, expected),
        JSON.stringify(patch),
      ).toBe(false);
  });
});

describe("loader integration with an entirely mocked database", () => {
  const label = `unit-test-engine-source-${randomUUID()}`;
  const planFile = path.join(tmpdir(), `${label}.json`);
  const ledgerFile = path.resolve(
    "docs/planning/tracks/reports",
    `engine-load-${label}.json`,
  );
  const target: Target = {
    engine: "judge",
    keys: [defaultJudgeRegistry().definitions()[0].key],
    variants: 2,
  };
  const seedBase = 20261009;
  const rows = buildTargetRows(target, seedBase);
  const linkedId = rows[0].externalId;
  let existing: Record<string, unknown>[];
  let originals: OriginalSourceProblem[];
  let inserted: Record<string, unknown>[];
  let duplicates: Record<string, unknown>[];
  let corruptReadback: boolean;

  function plan(withReferences = true) {
    writeFileSync(
      planFile,
      JSON.stringify({
        label,
        seedBase,
        targets: [target],
        ...(withReferences
          ? {
              sourceReferences: [
                { externalId: linkedId, originProblemId: ORIGINAL },
              ],
            }
          : {}),
      }),
    );
  }

  afterEach(() => {
    // These are the two unique test-owned files, never a directory or glob.
    if (existsSync(planFile)) unlinkSync(planFile);
    if (existsSync(ledgerFile)) unlinkSync(ledgerFile);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubEnv("ALLOW_SHARED_IMPORT", "1");
    existing = [];
    originals = [original()];
    inserted = [];
    duplicates = [];
    corruptReadback = false;
    plan();
    mocks.unitFindMany.mockResolvedValue([
      {
        id: UNIT,
        grade: rows[0].grade,
        section: rows[0].section,
        chapter: "unused",
      },
    ]);
    mocks.findMany.mockImplementation(
      async ({
        where,
        select,
      }: {
        where: Record<string, unknown>;
        select: Record<string, unknown>;
      }) => {
        if (where.externalId) return existing;
        if (where.familyKey) return duplicates;
        if (select.reviewStatus)
          return inserted.map((row) => ({
            ...row,
            ...(corruptReadback ? { originProblemId: null } : {}),
          }));
        return originals;
      },
    );
    mocks.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => {
        const id = `abcdef04-0000-4000-8000-${String(inserted.length + 1).padStart(12, "0")}`;
        inserted.push({
          examId: null,
          school: null,
          questionNumber: null,
          sourceMaterialId: null,
          ...data,
          id,
        });
        return { id };
      },
    );
  });

  it("dry-run prints the explicit origin/review gate and performs no writes", async () => {
    await applyEnginePlan(planFile, false, client);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(existsSync(ledgerFile)).toBe(false);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining(`${linkedId} → ${ORIGINAL}`),
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("pending · directUseAllowed=false"),
    );
  });

  it("writes only the requested link, preserves native fields, records the origin and verifies readback", async () => {
    await applyEnginePlan(planFile, true, client);
    expect(mocks.create).toHaveBeenCalledTimes(rows.length);
    rows.forEach((row, index) => {
      const data = mocks.create.mock.calls[index][0].data;
      expect(data).toMatchObject({
        unitId: UNIT,
        source: "manual",
        externalId: row.externalId,
        familyKey: row.familyKey,
        content: row.content,
        answer: row.answer,
        solution: row.solution,
        difficulty: row.difficulty,
        questionType: row.questionType,
        problemType: row.problemType,
        originProblemId: index === 0 ? ORIGINAL : null,
        reviewStatus: index === 0 ? "pending" : "approved",
        directUseAllowed: index !== 0,
      });
      for (const key of [
        "examId",
        "school",
        "questionNumber",
        "sourceMaterialId",
      ])
        expect(data).not.toHaveProperty(key);
    });
    const ledger = JSON.parse(readFileSync(ledgerFile, "utf-8"));
    expect(ledger.rows[0]).toMatchObject({
      externalId: linkedId,
      originProblemId: ORIGINAL,
    });
    expect(ledger.rows[1]).not.toHaveProperty("originProblemId");
    expect(mocks.findMany.mock.calls.at(-1)?.[0].select).toMatchObject({
      originProblemId: true,
      familyKey: true,
      externalId: true,
      examId: true,
      sourceMaterialId: true,
    });
    expect(process.exitCode ?? 0).toBe(0);
  });

  it("rejects an invalid original before any insert or ledger write", async () => {
    originals = [original({ unitId: OTHER })];
    await expect(applyEnginePlan(planFile, true, client)).rejects.toThrow(
      "unit differs",
    );
    expect(mocks.create).not.toHaveBeenCalled();
    expect(existsSync(ledgerFile)).toBe(false);
  });

  it("accepts a shared legacy workbook original but rejects its private-pool counterpart", async () => {
    originals = [original({ source: "transformed" })];
    await applyEnginePlan(planFile, false, client);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [ORIGINAL] } },
        select: expect.objectContaining({ pool: true, originProblemId: true }),
      }),
    );
    originals = [original({ source: "transformed", pool: "private" })];
    await expect(applyEnginePlan(planFile, true, client)).rejects.toThrow(
      "not shared",
    );
    expect(mocks.create).not.toHaveBeenCalled();
    expect(existsSync(ledgerFile)).toBe(false);
  });

  it("rejects provenance assignment to an existing historical unlinked row", async () => {
    existing = [stored({ ...rows[0], unitId: UNIT, originProblemId: null })];
    await expect(applyEnginePlan(planFile, true, client)).rejects.toThrow(
      "conflicting provenance",
    );
    expect(mocks.create).not.toHaveBeenCalled();
    expect(existsSync(ledgerFile)).toBe(false);
  });

  it("reruns matching links idempotently even after human approval", async () => {
    existing = rows.map((row, i) => ({
      ...stored({
        ...row,
        unitId: UNIT,
        originProblemId: i === 0 ? ORIGINAL : null,
      }),
      reviewStatus: "approved",
      directUseAllowed: true,
    }));
    await applyEnginePlan(planFile, true, client);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(existsSync(ledgerFile)).toBe(false);
  });

  it("does not silently ignore a referenced row dropped by DB content deduplication", async () => {
    duplicates = [
      {
        ...rows[0],
        figureSvg: null,
        problemCode: "J10101-A01-001",
        reviewStatus: "approved",
        directUseAllowed: true,
      },
    ];
    await expect(applyEnginePlan(planFile, true, client)).rejects.toThrow(
      "Deduplication would discard",
    );
    expect(mocks.create).not.toHaveBeenCalled();
    expect(existsSync(ledgerFile)).toBe(false);
  });

  it("keeps the unlinked apply behavior approved and directly usable", async () => {
    plan(false);
    await applyEnginePlan(planFile, true, client);
    expect(inserted).toHaveLength(rows.length);
    expect(
      inserted.every(
        (row) =>
          row.originProblemId === null &&
          row.reviewStatus === "approved" &&
          row.directUseAllowed === true,
      ),
    ).toBe(true);
    expect(mocks.findMany).toHaveBeenCalledTimes(3); // Existing IDs, duplicate pool, readback; no original lookup.
  });

  it("reports a failed readback when the database loses the requested link", async () => {
    corruptReadback = true;
    await applyEnginePlan(planFile, true, client);
    expect(process.exitCode).toBe(1);
    expect(existsSync(ledgerFile)).toBe(true); // The ledger retains evidence of created IDs.
  });
});
