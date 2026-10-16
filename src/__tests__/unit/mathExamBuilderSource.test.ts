import { afterEach, describe, expect, it, vi } from "vitest";
import { createMathExamBuilderSource } from "@/components/exam-builder/mathSource";
import type { StudioProblem } from "@/components/unified/types";
import { MOCK_UNITS } from "@/mocks/data";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";

const signal = new AbortController().signal;
const unit = MOCK_UNITS[0];
const row = (id = "bank-1"): StudioProblem & { unitId: string } => ({
  id,
  unitId: unit.id,
  grade: unit.grade,
  chapter: unit.chapter,
  section: unit.section,
  content: "원본 문제",
  answer: "3",
  solution: "원본 풀이",
  difficulty: "기본",
  problemCode: "M-001",
  figureUrls: ["/native.svg"],
  figureSvg: null,
  figureDims: [200, 160],
  figureSourceMm: [50, 40],
  choiceFigureIndex: [0],
  questionType: "descriptive",
  eligible: true,
});
const reply = (value: unknown, status = 200) =>
  Response.json(value, { status });
const listRequest = {
  scopeIds: [unit.id],
  difficulty: "기본",
  query: "분수",
  page: 2,
  pageSize: 12,
  excludeIds: ["old"],
};
afterEach(() => {
  vi.unstubAllEnvs();
  window.history.replaceState({}, "", "/");
});

describe("Math exam builder source", () => {
  it("reports the recorded eligibility reason if a saved problem is no longer issuable", async () => {
    const id = "e4e83b15-0e42-4f77-9bd1-14892741964d";
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply({ problems: [] }))
      .mockResolvedValueOnce(
        reply({
          items: [
            {
              id,
              state: "ineligible",
              code: "locked",
              reason: "잠금",
              reviewStatus: "approved",
              unitId: null,
              source: "school_textbook",
            },
          ],
          counts: { requested: 1, eligible: 0, ineligible: 1, missing: 0 },
        }),
      );
    const source = createMathExamBuilderSource({
      fetch: fetcher,
      problemsUrl: "/api/studio/problems",
    });
    await expect(source.prepareOutput!([row(id)], signal)).rejects.toThrow(
      "M-001: 출제 잠금(사유 미기록)",
    );
    expect(fetcher.mock.calls[1][0]).toBe("/api/studio/problems/check");
  });
  it("uses the same source conditions for availability, candidate list and composition", async () => {
    const tally = { held: 30, available: 24 };
    const filters =
      "sourceGroup=school_textbook&books=30000000-0000-4000-8000-000000000001&materials=40000000-0000-4000-8000-000000000001";
    const availability = {
      view: "available",
      version: 1,
      ...tally,
      facets: {
        units: { [unit.id]: tally },
        unitFamilies: { [unit.id]: 6 },
        difficulties: Object.fromEntries(
          DIFFICULTY_LADDER.map((level) => [level, tally]),
        ),
        sources: Object.fromEntries(
          ["total", "engine", "school_textbook", "past_exam", "other"].map(
            (key) => [key, tally],
          ),
        ),
        textbook: { ...tally, books: [] },
      },
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply(availability))
      .mockResolvedValueOnce(reply({ problems: [row()], total: 24, page: 2 }))
      .mockResolvedValueOnce(reply({ problems: [row()] }));
    const source = createMathExamBuilderSource({
      initialUnits: MOCK_UNITS,
      initialUnitCounts: { [unit.id]: 999 },
      filters,
      fetch: fetcher,
      problemsUrl: "/api/studio/problems",
    });
    expect(source.initialScopes).toBeUndefined();
    const scopes = await source.loadScopes(signal);
    // D-111: the gate is the number of issuable problem families, not rows.
    expect(scopes[0]).toMatchObject({ count: 6, countUnit: "갈래" });
    expect(scopes[1]).toMatchObject({ count: 0, countUnit: "갈래" });
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toMatchObject({
      view: "available",
      families: "1",
      sourceGroup: "school_textbook",
      materials: "40000000-0000-4000-8000-000000000001",
    });
    await source.list(listRequest, signal);
    expect(
      new URL(
        String(fetcher.mock.calls[1][0]),
        "https://math.test",
      ).searchParams.get("books"),
    ).toBe("30000000-0000-4000-8000-000000000001");
    expect(
      new URL(
        String(fetcher.mock.calls[1][0]),
        "https://math.test",
      ).searchParams.get("materials"),
    ).toBe("40000000-0000-4000-8000-000000000001");
    await source.compose([{ scopeId: unit.id, count: 24 }], signal);
    expect(JSON.parse(fetcher.mock.calls[2][1]!.body as string)).toEqual({
      filters,
      allocations: [{ unitId: unit.id, count: 24 }],
    });
  });

  it("keeps the family gate unknown when the server did not count families (never falls back to rows)", async () => {
    const tally = { held: 30, available: 24 };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      reply({
        view: "available",
        version: 1,
        ...tally,
        facets: {
          units: { [unit.id]: tally },
          difficulties: Object.fromEntries(
            DIFFICULTY_LADDER.map((level) => [level, tally]),
          ),
          sources: Object.fromEntries(
            ["total", "engine", "school_textbook", "past_exam", "other"].map(
              (key) => [key, tally],
            ),
          ),
          textbook: { ...tally, books: [] },
        },
      }),
    );
    const source = createMathExamBuilderSource({
      initialUnits: MOCK_UNITS,
      refreshAvailability: true,
      fetch: fetcher,
    });
    expect((await source.loadScopes(signal))[0].count).toBeUndefined();
  });

  it("asks candidates without the families already on the sheet and names each row's family by (unit, key)", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(reply({ problems: [row()], total: 1, page: 2 }));
    const source = createMathExamBuilderSource({
      fetch: fetcher,
      problemsUrl: "/api/studio/problems",
    });
    await source.list(
      { ...listRequest, excludeFamiliesOf: ["sheet-1", "sheet-2"] },
      signal,
    );
    const url = new URL(String(fetcher.mock.calls[0][0]), "https://math.test");
    expect(url.searchParams.get("excludeFamiliesOf")).toBe("sheet-1,sheet-2");
    const keyed = { ...row("k1"), familyKey: "mid:1|A|01" };
    const sibling = { ...row("k2"), familyKey: "mid:1|A|01" };
    const otherUnit = {
      ...row("k3"),
      unitId: MOCK_UNITS[1].id,
      familyKey: "mid:1|A|01",
    };
    expect(source.info(keyed).familyId).toBe(source.info(sibling).familyId);
    expect(source.info(keyed).familyId).not.toBe(
      source.info(otherUnit).familyId,
    );
    // 키 없는 레거시는 각자 혼자
    const legacyA = { ...row("n1"), familyKey: null };
    const legacyB = { ...row("n2"), familyKey: null };
    expect(source.info(legacyA).familyId).not.toBe(
      source.info(legacyB).familyId,
    );
  });

  it("keeps uncounted facets unknown and never falls back to stale inventory on failure", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        reply({
          view: "available",
          version: 1,
          held: 30,
          available: 24,
          facets: null,
        }),
      )
      .mockResolvedValueOnce(reply({ error: "수량 확인 실패" }, 500));
    const source = createMathExamBuilderSource({
      initialUnits: MOCK_UNITS,
      initialUnitCounts: { [unit.id]: 999 },
      refreshAvailability: true,
      fetch: fetcher,
    });
    expect((await source.loadScopes(signal))[0].count).toBeUndefined();
    await expect(source.loadScopes(signal)).rejects.toThrow("수량 확인 실패");
    expect(source.initialScopes).toBeUndefined();
  });

  it("uses the initial ordered curriculum without fetching and identifies legacy rows by unit metadata", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const source = createMathExamBuilderSource({
      initialUnits: MOCK_UNITS,
      fetch: fetcher,
    });
    expect(source.initialScopes?.[0]).toEqual({
      id: unit.id,
      group: unit.grade,
      label: unit.section,
      detail: unit.chapter,
    });
    const scopes = await source.loadScopes(signal);
    expect(fetcher).not.toHaveBeenCalled();
    expect(scopes[0]).toEqual({
      id: unit.id,
      group: unit.grade,
      label: unit.section,
      detail: unit.chapter,
    });
    const legacy = { ...row(), unitId: undefined };
    expect(source.info(legacy)).toMatchObject({
      id: legacy.id,
      scopeId: unit.id,
      scopeLabel: unit.section,
      difficulty: "기본",
    });
  });

  it("carries bank availability into curriculum scopes", async () => {
    const counts = { [unit.id]: 3, [MOCK_UNITS[1].id]: 0 };
    const initial = createMathExamBuilderSource({
      initialUnits: MOCK_UNITS,
      initialUnitCounts: counts,
    });
    expect(initial.initialScopes?.[0].count).toBe(3);
    expect(initial.initialScopes?.[1].count).toBe(0);

    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(reply({ units: MOCK_UNITS, unitCounts: counts }));
    const remote = createMathExamBuilderSource({ fetch: fetcher });
    expect((await remote.loadScopes(signal))[1].count).toBe(0);
  });

  it.each([
    { environment: "production", path: "/dev/unified", base: "/api/studio" },
    { environment: "development", path: "/", base: "/api/studio" },
    {
      environment: "development",
      path: "/dev/unified",
      base: "/api/dev/unified",
    },
  ])(
    "uses existing endpoint routing for $environment $path",
    async ({ environment, path, base }) => {
      vi.stubEnv("NODE_ENV", environment);
      window.history.replaceState({}, "", path);
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(reply({ units: MOCK_UNITS }));
      await createMathExamBuilderSource({ fetch: fetcher }).loadScopes(signal);
      expect(fetcher).toHaveBeenCalledWith(
        `${base}/problems?pageSize=1`,
        expect.objectContaining({
          signal,
          credentials: "same-origin",
          cache: "no-store",
        }),
      );
    },
  );

  it("resolves old saved rows without an eligibility flag before output", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(reply({ problems: [row()] }));
    const source = createMathExamBuilderSource({ fetch: fetcher });
    const old = { ...row(), eligible: undefined };
    const result = await source.prepareOutput!([old], signal);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(result[0].eligible).toBe(true);
  });

  it("requests exact scopes and excluded IDs before pagination, passing native rows unchanged", async () => {
    const native = row();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(reply({ problems: [native], total: 14, page: 2 }));
    const source = createMathExamBuilderSource({
      fetch: fetcher,
      problemsUrl: "/api/studio/problems",
    });
    const result = await source.list(listRequest, signal);
    const url = new URL(String(fetcher.mock.calls[0][0]), "https://math.test");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      unitIds: unit.id,
      difficulty: "기본",
      q: "분수",
      page: "2",
      pageSize: "12",
      excludeIds: "old",
    });
    expect(result).toEqual({ items: [native], total: 14 });
  });

  it("never queries the full bank when no scope is selected or repeats a clamped last page", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(reply({ problems: [row()], total: 1, page: 1 }));
    const source = createMathExamBuilderSource({ fetch: fetcher });
    expect(await source.list({ ...listRequest, scopeIds: [] }, signal)).toEqual(
      { items: [], total: 0 },
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(await source.list(listRequest, signal)).toEqual({
      items: [],
      total: 1,
    });
  });

  it("composes all positive allocations with one request and returns a shortage without widening", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(reply({ problems: [row()] }));
    const source = createMathExamBuilderSource({
      fetch: fetcher,
      problemsUrl: "/api/studio/problems",
    });
    const result = await source.compose(
      [
        { scopeId: unit.id, count: 4 },
        { scopeId: MOCK_UNITS[1].id, count: 2 },
        { scopeId: MOCK_UNITS[2].id, count: 0 },
      ],
      signal,
    );
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe("/api/studio/problems/random");
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({
      allocations: [
        { unitId: unit.id, count: 4 },
        { unitId: MOCK_UNITS[1].id, count: 2 },
      ],
    });
    expect(result).toEqual([row()]);
  });

  it("posts a large scope selection without exceeding URL limits", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(reply({ problems: [], total: 0, page: 1 }));
    const source = createMathExamBuilderSource({
      fetch: fetcher,
      problemsUrl: "/api/studio/problems",
    });
    const scopeIds = Array.from(
      { length: 735 },
      (_, i) => `30000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
    await source.list({ ...listRequest, scopeIds }, signal);
    expect(fetcher.mock.calls[0][0]).toBe("/api/studio/problems");
    expect(fetcher.mock.calls[0][1]?.method).toBe("POST");
    expect(JSON.parse(fetcher.mock.calls[0][1]?.body as string).unitIds).toBe(
      scopeIds.join(","),
    );
  });

  it("refreshes bank rows in one request while preserving selection order and local crop identity", async () => {
    const crop = {
      ...row("crop"),
      eligible: undefined,
      croppedImage: "blob:local",
    };
    const latest = { ...row("first"), content: "갱신한 원문" };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(reply({ problems: [row("second"), latest] }));
    const source = createMathExamBuilderSource({ fetch: fetcher });
    const result = await source.prepareOutput!(
      [row("first"), crop, row("second")],
      signal,
    );
    expect(fetcher).toHaveBeenCalledOnce();
    const params = new URL(
      String(fetcher.mock.calls[0][0]),
      "https://math.test",
    ).searchParams;
    expect(params.get("ids")).toBe("first,second");
    expect(result.map((item) => item.id)).toEqual(["first", "crop", "second"]);
    expect(result[0].content).toBe("갱신한 원문");
    expect(result[1]).toBe(crop);
  });

  it.each([
    [],
    [{ ...row(), eligible: false }],
    [{ ...row(), unitId: MOCK_UNITS[1].id }],
  ])(
    "rejects deleted, ineligible or moved rows at output",
    async (...problems) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(reply({ problems }));
      const source = createMathExamBuilderSource({ fetch: fetcher });
      await expect(source.prepareOutput!([row()], signal)).rejects.toThrow();
    },
  );

  it("propagates authorization failures and aborts without a fallback request", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply({ error: "접근 권한 없음" }, 403))
      .mockRejectedValueOnce(new DOMException("취소", "AbortError"));
    const source = createMathExamBuilderSource({ fetch: fetcher });
    await expect(source.list(listRequest, signal)).rejects.toThrow(
      "접근 권한 없음",
    );
    await expect(source.list(listRequest, signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
