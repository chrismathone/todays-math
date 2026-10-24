import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMathExamBuilderSource,
  type MathAvailabilityCache,
} from "@/components/exam-builder/mathSource";
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
const reply = (value: unknown, status = 200) => {
  const data = value as Record<string, unknown>;
  return Response.json(
    data && ("problems" in data || data.view === "available")
      ? { ...data, version: 2, countUnit: "question", queryKey: "fixture" }
      : value,
    { status },
  );
};
const readyId = "10000000-0000-4000-8000-000000000001";
const secondReadyId = "10000000-0000-4000-8000-000000000002";
const ready = (ids: string[]) => ({
  items: ids.map((id) => ({
    id,
    state: "eligible",
    code: null,
    reason: null,
    reviewStatus: "approved",
    unitId: unit.id,
    source: "manual",
  })),
  counts: {
    requested: ids.length,
    eligible: ids.length,
    ineligible: 0,
    missing: 0,
  },
});
const inventory = (counts: Record<string, number>) => {
  const count = Object.values(counts).reduce((a, b) => a + b, 0);
  const tally = { held: count, available: count };
  return {
    view: "available",
    version: 2,
    countUnit: "question",
    queryKey: "fixture",
    ...tally,
    facets: {
      units: Object.fromEntries(
        Object.entries(counts).map(([id, value]) => [
          id,
          { held: value, available: value },
        ]),
      ),
      unitFamilies: counts,
      difficulties: Object.fromEntries(
        DIFFICULTY_LADDER.map((tier) => [tier, tally]),
      ),
      sources: Object.fromEntries(
        ["total", "engine", "school_textbook", "past_exam", "other"].map(
          (key) => [key, tally],
        ),
      ),
      textbook: { ...tally, books: [] },
    },
  };
};
const navigationCurriculum = () =>
  reply({
    view: "curriculum",
    grades: [],
    chapters: [],
    units: MOCK_UNITS.map(({ id, grade, chapter, section, orderIndex }) => ({
      id,
      grade,
      chapter,
      section,
      orderIndex,
    })),
  });
const listRequest = {
  scopeIds: [unit.id],
  difficulty: "기본",
  query: "분수",
  page: 2,
  pageSize: 12,
  excludeIds: ["old"],
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  window.history.replaceState({}, "", "/");
});

describe("Math exam builder source", () => {
  it("shares pending inventory across family-rule changes without letting an old consumer abort the new one", async () => {
    const availabilityCache: MathAvailabilityCache = new Map();
    let finish!: (value: Response) => void;
    const fetcher = vi.fn<typeof fetch>(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const firstController = new AbortController();
    const first = createMathExamBuilderSource({
      initialUnits: MOCK_UNITS,
      availabilityCache,
      fetch: fetcher,
    });
    const pending = first.loadScopes(firstController.signal);
    firstController.abort();
    const next = createMathExamBuilderSource({
      initialUnits: MOCK_UNITS,
      availabilityCache,
      fetch: fetcher,
      distinctFamilies: false,
    });
    const second = next.loadScopes(signal);
    const counts = inventory({ [unit.id]: 6 });
    counts.facets.units[unit.id] = { held: 12, available: 12 };
    finish(reply(counts));
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect((await second)[0].count).toBe(12);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][1]?.signal).toBeUndefined();
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).families).toBe(
      "1",
    );
  });
  it("retries failed inventory and expires component-local counts after fifteen seconds", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1000);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply({ error: "다시 확인" }, 500))
      .mockResolvedValueOnce(reply(inventory({ [unit.id]: 6 })))
      .mockResolvedValueOnce(reply(inventory({ [unit.id]: 8 })));
    const source = createMathExamBuilderSource({
      initialUnits: MOCK_UNITS,
      availabilityCache: new Map(),
      fetch: fetcher,
    });
    await expect(source.loadScopes(signal)).rejects.toThrow("다시 확인");
    expect((await source.loadScopes(signal))[0].count).toBe(6);
    expect((await source.loadScopes(signal))[0].count).toBe(6);
    expect(fetcher).toHaveBeenCalledTimes(2);
    now.mockReturnValue(16001);
    expect((await source.loadScopes(signal))[0].count).toBe(8);
  });
  it("reports the recorded eligibility reason if a saved problem is no longer issuable", async () => {
    const id = "e4e83b15-0e42-4f77-9bd1-14892741964d";
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
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
    expect(fetcher.mock.calls[0][0]).toBe("/api/studio/problems/check");
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
    expect(source.initialScopes?.map((scope) => scope.id)).toEqual(
      MOCK_UNITS.map((unit) => unit.id),
    );
    expect(
      source.initialScopes?.every((scope) => scope.count === undefined),
    ).toBe(true);
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
      identity: "question",
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

  it("drops every family rule when the owner turns «같은 문항류는 1문항만» off", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(reply({ problems: [row()], total: 1, page: 2 }));
    const source = createMathExamBuilderSource({
      fetch: fetcher,
      problemsUrl: "/api/studio/problems",
      distinctFamilies: false,
    });
    await source.list(
      { ...listRequest, excludeFamiliesOf: ["sheet-1"] },
      signal,
    );
    const url = new URL(String(fetcher.mock.calls[0][0]), "https://math.test");
    expect(url.searchParams.has("excludeFamiliesOf")).toBe(false);
    expect(
      source.info({ ...row("k1"), familyKey: "mid:1|A|01" } as ReturnType<
        typeof row
      >).familyId,
    ).toBeUndefined();
    fetcher.mockResolvedValueOnce(reply({ problems: [] }));
    await source.compose([{ scopeId: MOCK_UNITS[0].id, count: 2 }], signal);
    const body = JSON.parse(String(fetcher.mock.calls[1][1]?.body));
    expect(body.distinctFamilies).toBe(false);
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
    expect(
      source.initialScopes?.every((scope) => scope.count === undefined),
    ).toBe(true);
  });

  it("reuses the ordered curriculum but confirms question capacity and maps legacy unit metadata", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        reply({ view: "available", held: 0, available: 0, facets: null }),
      );
    const source = createMathExamBuilderSource({
      initialUnits: MOCK_UNITS,
      fetch: fetcher,
    });
    expect(
      source.initialScopes?.every((scope) => scope.count === undefined),
    ).toBe(true);
    const scopes = await source.loadScopes(signal);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).identity).toBe(
      "question",
    );
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
      scopeOrder: unit.orderIndex,
      difficulty: "기본",
    });
  });

  it("carries bank availability into curriculum scopes", async () => {
    const counts = { [unit.id]: 3, [MOCK_UNITS[1].id]: 0 };
    const initial = createMathExamBuilderSource({
      initialUnits: MOCK_UNITS,
      initialUnitCounts: counts,
      initialCountUnit: "question",
      distinctFamilies: false,
    });
    expect(initial.initialScopes?.[0].count).toBe(3);
    expect(initial.initialScopes?.[1].count).toBe(0);

    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) =>
      String(url).endsWith("/sources")
        ? reply(inventory(counts))
        : reply({
            problems: [],
            units: MOCK_UNITS.map(
              ({ id, grade, chapter, section, orderIndex }) => ({
                id,
                grade,
                chapter,
                section,
                orderIndex,
              }),
            ),
            unitCounts: counts,
            total: 3,
            page: 1,
            pageSize: 12,
            grades: [{ grade: unit.grade, count: 3 }],
            chapters: [unit.chapter],
          }),
    );
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
        .mockImplementation(async () =>
          reply({ view: "available", held: 0, available: 0, facets: null }),
        );
      await createMathExamBuilderSource({
        initialUnits: MOCK_UNITS,
        fetch: fetcher,
      }).loadScopes(signal);
      expect(fetcher).toHaveBeenCalledWith(
        `${base}/problems/sources`,
        expect.objectContaining({
          signal,
          credentials: "same-origin",
          cache: "no-store",
        }),
      );
    },
  );

  it("validates old saved rows while preserving their stored content and optional fields", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(reply(ready([readyId])));
    const source = createMathExamBuilderSource({ fetch: fetcher });
    const old = { ...row(readyId), eligible: undefined };
    const result = await source.prepareOutput!([old], signal);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(result[0]).toBe(old);
    expect(result[0].eligible).toBeUndefined();
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
      identity: "question",
      view: "page",
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
      identity: "question",
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

  it("checks native rows once while preserving stored content, order and local crop identity", async () => {
    const first = row(readyId);
    const second = row(secondReadyId);
    const crop = {
      ...row("crop"),
      eligible: undefined,
      croppedImage: "blob:local",
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(reply(ready([readyId, secondReadyId])));
    const source = createMathExamBuilderSource({ fetch: fetcher });
    const result = await source.prepareOutput!([first, crop, second], signal);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(String(fetcher.mock.calls[0][0])).toContain("/check");
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
      ids: [readyId, secondReadyId],
    });
    expect(result).toEqual([first, crop, second]);
    expect(result[0]).toBe(first);
    expect(result[1]).toBe(crop);
  });

  it.each(["missing", "ineligible", "moved"])(
    "rejects a currently %s actual row before output",
    async (state) => {
      const body = ready([readyId]);
      const current = {
        ...body.items[0],
        ...(state === "moved"
          ? { unitId: MOCK_UNITS[1].id }
          : {
              state,
              code: state === "ineligible" ? "locked" : null,
              reason: state === "ineligible" ? "잠금" : null,
            }),
      };
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(reply({ ...body, items: [current] }));
      const source = createMathExamBuilderSource({ fetch: fetcher });
      await expect(
        source.prepareOutput!([row(readyId)], signal),
      ).rejects.toThrow(
        state === "moved"
          ? "단원이나 출처"
          : state === "ineligible"
            ? "출제 잠금"
            : "문항을 찾을 수 없음",
      );
    },
  );

  it("keeps legacy output closed until the saved scope is known, then checks moved units", async () => {
    let finish!: (value: Response) => void;
    const check = ready([readyId]);
    check.items[0].unitId = MOCK_UNITS[1].id;
    const fetcher = vi.fn<typeof fetch>(async (url) => {
      if (String(url).endsWith("/check")) return reply(check);
      if (String(url).endsWith("/sources"))
        return reply(inventory({ [unit.id]: 6 }));
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    const source = createMathExamBuilderSource({ fetch: fetcher });
    const { unitId: _unitId, ...saved } = row(readyId);
    expect(_unitId).toBe(unit.id);
    const pending = source.prepareOutput!([saved], signal);
    const moved = expect(pending).rejects.toThrow("단원이나 출처");
    expect(fetcher).toHaveBeenCalledWith(
      `/api/studio/problems?${new URLSearchParams({ identity: "question", view: "curriculum", grade: unit.grade, chapter: unit.chapter })}`,
      expect.objectContaining({ signal }),
    );
    expect(
      fetcher.mock.calls.some(([url]) => String(url).endsWith("/check")),
    ).toBe(false);
    finish(navigationCurriculum());
    await moved;
    await expect(source.prepareOutput!([saved], signal)).rejects.toThrow(
      "단원이나 출처",
    );
    check.items[0].unitId = unit.id;
    expect(await source.prepareOutput!([saved], signal)).toEqual([saved]);
    expect(saved).not.toHaveProperty("unitId");
  });

  it("validates a legacy saved row from a fresh source without a preceding scope read", async () => {
    const fetcher = vi.fn<typeof fetch>(async (url) =>
      String(url).endsWith("/check")
        ? reply(ready([readyId]))
        : navigationCurriculum(),
    );
    const { unitId: _unitId, ...legacy } = row(readyId);
    const saved = { ...legacy, questionId: `question:${readyId}` };
    expect(_unitId).toBe(unit.id);
    const source = createMathExamBuilderSource({ fetch: fetcher });
    expect((await source.prepareOutput!([saved], signal))[0]).toBe(saved);
    expect((await source.prepareOutput!([saved], signal))[0]).toBe(saved);
    expect(
      fetcher.mock.calls.filter(([url]) =>
        String(url).includes("view=curriculum"),
      ),
    ).toHaveLength(1);
    expect(saved).not.toHaveProperty("unitId");
  });

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
  it("summarizes the composed sheet by scope, our difficulty ladder and server-derived answer format", () => {
    const source = createMathExamBuilderSource({ initialUnits: MOCK_UNITS });
    const other = MOCK_UNITS[1];
    const items = [
      { ...row("s1"), difficulty: "기본", questionType: "multiple-choice" },
      {
        ...row("s2"),
        unitId: other.id,
        section: other.section,
        difficulty: "응용",
        questionType: "short-answer",
      },
      // A → B → A: still two scopes, not three groups
      { ...row("s3"), difficulty: "기본", questionType: "descriptive" },
      { ...row("s4"), difficulty: "연산", questionType: undefined },
    ] as StudioProblem[];
    expect(source.summarize!(items)).toBe(
      "단원 2개 · 난이도 연산 1, 기본 2, 응용 1 · 형식 객관식 1, 단답형 1, 서술형 1, 미분류 1",
    );
    expect(source.summarize!([])).toBe("");
  });

  it("adds the delivered content type and answer format to the item meta line", () => {
    const source = createMathExamBuilderSource({ initialUnits: MOCK_UNITS });
    expect(
      source.info({ ...row(), problemType: "계산", questionType: undefined })
        .detail,
    ).toBe(`${unit.grade} · ${unit.chapter} · M-001 · 계산 · 미분류`);
    expect(source.info(row()).detail).toBe(
      `${unit.grade} · ${unit.chapter} · M-001 · 서술형`,
    );
    // content type and format with the same word are not repeated
    expect(source.info({ ...row(), problemType: "서술형" }).detail).toBe(
      `${unit.grade} · ${unit.chapter} · M-001 · 서술형`,
    );
  });

  describe("구성 조건(W4) — 최근 출제 빼기 · 난이도 의도", () => {
    const availability = (count: number) => ({
      view: "available",
      version: 1,
      held: count,
      available: count,
      facets: {
        units: { [unit.id]: { held: count, available: count } },
        unitFamilies: { [unit.id]: count },
        difficulties: Object.fromEntries(
          DIFFICULTY_LADDER.map((level) => [level, { held: 0, available: 0 }]),
        ),
        sources: Object.fromEntries(
          ["total", "engine", "school_textbook", "past_exam", "other"].map(
            (key) => [key, { held: 0, available: 0 }],
          ),
        ),
        textbook: { held: 0, available: 0, books: [] },
      },
    });

    it("declares the conditions it supports on our ladder with D-20's 14 days", () => {
      const source = createMathExamBuilderSource({ initialUnits: MOCK_UNITS });
      expect(source.conditions).toEqual({
        ladder: DIFFICULTY_LADDER,
        recentDays: 14,
      });
    });

    it("asks the server to drop recent problems for counts, candidates and composition — never sends the history ids", async () => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(reply(availability(3)))
        .mockResolvedValueOnce(reply({ problems: [], total: 0, page: 1 }))
        .mockResolvedValueOnce(reply({ problems: [row()] }));
      const source = createMathExamBuilderSource({
        initialUnits: MOCK_UNITS,
        refreshAvailability: true,
        fetch: fetcher,
        problemsUrl: "/api/studio/problems",
      });
      const scopes = await source.loadScopes(signal, { excludeRecent: true });
      expect(scopes[0]).toMatchObject({ count: 3 });
      expect(
        JSON.parse(fetcher.mock.calls[0][1]!.body as string),
      ).toMatchObject({ view: "available", recent: "1" });
      await source.list(
        { ...listRequest, page: 1, excludeRecent: true },
        signal,
      );
      const url = new URL(String(fetcher.mock.calls[1][0]), "https://m.test");
      expect(url.searchParams.get("recent")).toBe("1");
      expect(url.searchParams.get("excludeIds")).toBe("old");
      await source.compose([{ scopeId: unit.id, count: 2 }], signal, {
        excludeRecent: true,
      });
      expect(JSON.parse(fetcher.mock.calls[2][1]!.body as string)).toEqual({
        identity: "question",
        recent: true,
        allocations: [{ unitId: unit.id, count: 2 }],
      });
    });

    it("leaves recent problems in when the owner turns it off", async () => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(reply(availability(5)))
        .mockResolvedValueOnce(reply({ problems: [], total: 0, page: 1 }));
      const source = createMathExamBuilderSource({
        initialUnits: MOCK_UNITS,
        refreshAvailability: true,
        fetch: fetcher,
        problemsUrl: "/api/studio/problems",
      });
      await source.loadScopes(signal, { excludeRecent: false });
      expect(
        JSON.parse(fetcher.mock.calls[0][1]!.body as string),
      ).not.toHaveProperty("recent");
      await source.list({ ...listRequest, page: 1 }, signal);
      expect(
        new URL(
          String(fetcher.mock.calls[1][0]),
          "https://m.test",
        ).searchParams.has("recent"),
      ).toBe(false);
    });

    it("sends the difficulty intent and reports a short tier without widening", async () => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
        reply({
          problems: [row()],
          difficulty: [
            { tier: "기본", requested: 1, actual: 1 },
            { tier: "심화하", requested: 2, actual: 0 },
          ],
        }),
      );
      const source = createMathExamBuilderSource({
        fetch: fetcher,
        problemsUrl: "/api/studio/problems",
      });
      const result = await source.compose(
        [{ scopeId: unit.id, count: 3 }],
        signal,
        { excludeRecent: true, difficulty: { 기본: 1, 심화하: 2, 연산: 0 } },
      );
      expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({
        identity: "question",
        recent: true,
        difficulty: { 기본: 1, 심화하: 2, 연산: 0 },
        allocations: [{ unitId: unit.id, count: 3 }],
      });
      expect(result).toEqual({
        items: [row()],
        notes: [
          "심화하 2문항 중 0문항만 구성했습니다 — 다른 난이도로 채우지 않았습니다.",
        ],
      });
    });
  });

  describe("문항 교체(W3) — 같은 문항류 층", () => {
    it("asks for the replaced problem's siblings by id, even when «같은 문항류는 1문항만» is off", async () => {
      for (const distinctFamilies of [true, false]) {
        const fetcher = vi
          .fn<typeof fetch>()
          .mockResolvedValue(reply({ problems: [], total: 0, page: 1 }));
        const source = createMathExamBuilderSource({
          fetch: fetcher,
          problemsUrl: "/api/studio/problems",
          distinctFamilies,
        });
        expect(source.compareReplace).toBe(true);
        await source.list(
          { ...listRequest, page: 1, difficulty: "", familyOf: "bank-1" },
          signal,
        );
        const url = new URL(String(fetcher.mock.calls[0][0]), "https://m.test");
        expect(url.searchParams.get("familyOf")).toBe("bank-1");
      }
    });

    it("names the answer format and origin for the compare meta line", () => {
      const source = createMathExamBuilderSource({ initialUnits: MOCK_UNITS });
      expect(
        source.info({ ...row(), source: "school_textbook" }),
      ).toMatchObject({
        format: "서술형",
        origin: "교과서",
      });
      expect(
        source.info({ ...row(), questionType: undefined, source: undefined }),
      ).toMatchObject({ format: "미분류", origin: undefined });
    });
  });
});
