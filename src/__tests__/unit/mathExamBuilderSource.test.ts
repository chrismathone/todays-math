import { afterEach, describe, expect, it, vi } from "vitest";
import { createMathExamBuilderSource } from "@/components/exam-builder/mathSource";
import type { StudioProblem } from "@/components/unified/types";
import { MOCK_UNITS } from "@/mocks/data";

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
