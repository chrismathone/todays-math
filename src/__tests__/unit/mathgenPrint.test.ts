import { describe, expect, it } from "vitest";
import { packMeasured } from "@/components/unified/print/pack";
import {
  parsePrintMeta,
  parsePrintOptions,
} from "@/components/unified/print/settings";
import { DEFAULT_PRINT_OPTIONS } from "@/components/unified/print/types";
import {
  columnContentWidth,
  PRINT_MARGINS,
} from "@/components/unified/print/geometry";
import { A4_DIM } from "@/components/unified/print/tokens";

describe("restored Mathgen options and measured pagination", () => {
  it("matches the actual original defaults, preserving historical spacing18 rather than snapping to16", () => {
    expect(parsePrintOptions(undefined)).toEqual({
      template: "jeongtong",
      color: "#1B2A4E",
      columns: 1,
      layoutMode: "spacing",
      problemsPerColumn: 3,
      spacing: 18,
      smartSpacing: false,
      showAnswers: false,
      quickAnswerOnly: false,
      showDate: true,
      showChapter: true,
      showDifficulty: true,
      hideScores: true,
      columnDivider: false,
      choiceLayout: "auto",
      solvingArea: "off",
      fontPack: "system",
      marginPreset: "normal",
    });
    expect(
      parsePrintOptions({ spacing: 47 }, { columns: 2, answers: true }),
    ).toMatchObject({ spacing: 47, columns: 2, showAnswers: true });
  });
  it.each([
    { template: "fake" },
    { columns: 3 },
    { color: "url(https://example.com)" },
    { spacing: -1 },
    { showDate: "false" },
    { fontPack: "unknown" },
    { choiceLayout: "4x2" },
    { choiceLayout: true },
  ])("rejects malformed known formatting fields: %j", (value) => {
    expect(() => parsePrintOptions(value)).toThrow();
  });
  it.each(["5x1", "2x3", "3x2", "auto"])(
    // 보기 번호 배치는 저장·복원된다 — 원장님이 고른 값이 다음 시험지에도 남는다.
    "keeps the chosen choice layout across save and restore: %s",
    (choiceLayout) => {
      expect(parsePrintOptions({ choiceLayout })).toMatchObject({
        choiceLayout,
      });
    },
  );
  it("validates metadata without interpreting HTML", () => {
    expect(
      parsePrintMeta({
        conceptNote: "<script>example</script>",
        totalScore: 50,
      }).conceptNote,
    ).toBe("<script>example</script>");
    expect(() => parsePrintMeta({ totalScore: "100" })).toThrow();
  });
  it("uses actual A4 and the selected margins to determine both measured and rendered column widths", () => {
    expect(A4_DIM.width).toBeCloseTo((210 * 96) / 25.4);
    expect(columnContentWidth("modern", 2, "wide")).toBeCloseTo(
      (A4_DIM.width - (44 * 96) / 25.4 - 32) / 2,
    );
    expect(PRINT_MARGINS.normal).toEqual({
      top: 12,
      bottom: 12,
      left: 15,
      right: 15,
    });
  });
  it("packs in reading order, accounts for the first header and repacks when margins/spacing leave less room", () => {
    const heights = [200, 200, 200, 200, 200, 200, 200];
    const options = {
      ...DEFAULT_PRINT_OPTIONS,
      columns: 2 as const,
      spacing: 20,
      smartSpacing: false,
    };
    const pages = packMeasured(heights, { first: 460, cont: 700 }, options);
    expect(pages.map((p) => p.indices)).toEqual([
      [0, 1, 2, 3],
      [4, 5, 6],
    ]);
    expect(pages[0].splitIndex).toBe(2);
    expect(
      packMeasured(
        heights,
        { first: 450, cont: 700 },
        { ...options, spacing: 88 },
      )[0].indices,
    ).toEqual([0, 1]);
  });
  it("count mode aligns columns while reducing the count to fit the tallest question", () => {
    const options = {
      ...DEFAULT_PRINT_OPTIONS,
      columns: 2 as const,
      layoutMode: "count" as const,
      problemsPerColumn: 3,
    };
    const pages = packMeasured(
      [100, 100, 400, 100, 100, 100, 100],
      { first: 700, cont: 700 },
      options,
    );
    expect(pages[0].indices).toEqual([0, 1]);
    expect(pages.flatMap((p) => p.indices)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it.each(["spacing", "count"] as const)(
    "never drops or clips an oversized crop in %s mode",
    (layoutMode) => {
      const pages = packMeasured(
        [1800, 100],
        { first: 700, cont: 900 },
        { ...DEFAULT_PRINT_OPTIONS, layoutMode },
      );
      expect(pages.flatMap((p) => p.indices)).toEqual([0, 1]);
      expect(pages[0].scales[0] * 1800).toBeCloseTo(
        layoutMode === "spacing" ? 672 : 688,
      );
    },
  );
  it("workbook stretch mode also measures tall crops instead of blindly fitting four", () => {
    const pages = packMeasured(
      [600, 600, 100, 100],
      { first: 700, cont: 900 },
      { ...DEFAULT_PRINT_OPTIONS, template: "workbook" },
    );
    expect(pages[0].indices).toEqual([0]);
    expect(pages.flatMap((p) => p.indices)).toEqual([0, 1, 2, 3]);
  });
  it.each(["spacing", "count"] as const)(
    "%s starts each round on a fresh sheet and reserves its full header height again",
    (layoutMode) => {
      const pages = packMeasured(
        [200, 200, 200, 200, 200, 200, 200, 200],
        { first: 450, cont: 700 },
        { ...DEFAULT_PRINT_OPTIONS, columns: 1, spacing: 20, layoutMode },
        [4],
      );
      expect(pages.map((page) => page.indices)).toEqual([
        [0, 1],
        [2, 3],
        [4, 5],
        [6, 7],
      ]);
      expect(pages.flatMap((page) => page.indices)).toEqual([
        0, 1, 2, 3, 4, 5, 6, 7,
      ]);
    },
  );
  it("keeps short rounds separate even when both fit in one column", () => {
    const pages = packMeasured(
      [30, 30, 30],
      { first: 700, cont: 900 },
      { ...DEFAULT_PRINT_OPTIONS, columns: 2 },
      [2],
    );
    expect(pages.map((page) => page.indices)).toEqual([[0, 1], [2]]);
    expect(
      pages.every((page) => page.scales.every((scale) => scale === 1)),
    ).toBe(true);
  });
});
