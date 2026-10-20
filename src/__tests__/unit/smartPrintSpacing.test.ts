import { describe, expect, it } from "vitest";
import { packMeasured } from "@/components/unified/print/pack";
import {
  parsePrintOptions,
  SPACING_PRESETS,
} from "@/components/unified/print/settings";
import { DEFAULT_PRINT_OPTIONS } from "@/components/unified/print/types";
import { DEFAULT_PRINT_META } from "@/components/unified/print/types";
import {
  printPresetOptionsSchema,
  presetContentOf,
  presetDiffers,
} from "@/contracts/printPreset.contract";
import {
  arithmeticPresentationSchema,
  defaultArithmeticPresentation,
} from "@/contracts/arithmeticPresentation.contract";

const options = {
  ...DEFAULT_PRINT_OPTIONS,
  template: "jeongtong" as const,
  columns: 2 as const,
  smartSpacing: false,
};
const avail = { first: 812, cont: 912 };
describe("measured question whitespace", () => {
  it.each([16, 32, 56, 88])(
    "each question gets the same trailing space at minimum %i",
    (spacing) => {
      const heights = [80, 160, 90, 210, 70, 150, 200];
      for (const page of packMeasured(heights, avail, {
        ...options,
        spacing,
      })) {
        for (const [start, end] of [
          [0, page.splitIndex],
          [page.splitIndex, page.indices.length],
        ]) {
          const shares = page.whitespace!.slice(start, end);
          expect(new Set(shares).size).toBeLessThanOrEqual(1);
          expect(shares.every((value) => value >= spacing)).toBe(true);
        }
      }
    },
  );
  it("smart picks unequal counts and preserves order without adding pages", () => {
    const heights = [80, 80, 80, 80, 240, 240, 240];
    const smart = packMeasured(heights, avail, {
      ...options,
      spacing: 16,
      smartSpacing: true,
    });
    expect(smart.length).toBe(
      packMeasured(heights, avail, { ...options, spacing: 16 }).length,
    );
    expect(smart[0].splitIndex).toBe(4);
    expect(smart[0].indices.length - smart[0].splitIndex).toBe(3);
    expect(smart.flatMap((p) => p.indices)).toEqual(heights.map((_, i) => i));
    expect(
      packMeasured(heights, avail, { ...options, smartSpacing: true }),
    ).toEqual(packMeasured(heights, avail, { ...options, smartSpacing: true }));
  });
  it("caps a sparse final column while keeping its first item at the top", () => {
    expect(
      packMeasured([50], avail, { ...options, spacing: 16 })[0].whitespace,
    ).toEqual([120]);
  });
  it("handles sections, oversized questions and count mode", () => {
    const pages = packMeasured(
      [2000, 80, 80],
      avail,
      { ...options, smartSpacing: true },
      [1],
    );
    expect(pages.flatMap((p) => p.indices)).toEqual([0, 1, 2]);
    expect(pages[0].scales[0]).toBeLessThan(1);
    expect(
      packMeasured([80, 90], avail, { ...options, layoutMode: "count" })[0]
        .whitespace,
    ).toBeUndefined();
  });
  it("keeps minimum page count, order and finite shares across mixed lengths and both column counts", () => {
    for (const columns of [1, 2] as const)
      for (let seed = 1; seed <= 20; seed++) {
        const heights = Array.from(
          { length: 25 },
          (_, i) => 25 + ((i * 137 + seed * 71) % 1100),
        );
        const fixed = packMeasured(heights, avail, {
          ...options,
          columns,
          spacing: 16,
        });
        const smart = packMeasured(heights, avail, {
          ...options,
          columns,
          smartSpacing: true,
        });
        expect(smart.length).toBe(fixed.length);
        expect(smart.flatMap((p) => p.indices)).toEqual(
          heights.map((_, i) => i),
        );
        expect(
          smart
            .flatMap((p) => p.whitespace!)
            .every((v) => Number.isFinite(v) && v >= 16 - 1e-8),
        ).toBe(true);
      }
  });
  it("keeps answer-key gaps and oversized scaling unchanged", () => {
    const pages = packMeasured(
      [1800, 100],
      { first: 700, cont: 900 },
      { ...options, spacing: 32 },
      [],
      false,
    );
    expect(pages[0].scales[0] * 1800).toBeCloseTo(688);
    expect(pages.every((p) => p.whitespace === undefined)).toBe(true);
  });
});
describe("spacing storage compatibility", () => {
  it("round-trips smart in presets and arithmetic, while old forms without the field remain valid", () => {
    const old = { ...DEFAULT_PRINT_OPTIONS };
    delete old.smartSpacing;
    expect(printPresetOptionsSchema.parse(old).smartSpacing).toBeUndefined();
    expect(
      printPresetOptionsSchema.parse(DEFAULT_PRINT_OPTIONS).smartSpacing,
    ).toBe(true);
    const preset = presetContentOf(old, DEFAULT_PRINT_META);
    expect(
      presetDiffers(
        preset,
        { ...old, smartSpacing: false },
        DEFAULT_PRINT_META,
      ),
    ).toBe(false);
    expect(
      presetDiffers(preset, DEFAULT_PRINT_OPTIONS, DEFAULT_PRINT_META),
    ).toBe(true);
    const current = defaultArithmeticPresentation();
    expect(
      arithmeticPresentationSchema.parse(current).printOptions.smartSpacing,
    ).toBe(true);
    const legacyOptions = { ...current.printOptions };
    delete legacyOptions.smartSpacing;
    expect(
      arithmeticPresentationSchema.parse({
        ...current,
        printOptions: legacyOptions,
      }).printOptions.smartSpacing,
    ).toBe(false);
  });
  it("only new sheets default to smart; omitted saved fields stay off", () => {
    expect(DEFAULT_PRINT_OPTIONS.smartSpacing).toBe(true);
    expect(parsePrintOptions({}).smartSpacing).toBe(false);
    expect(parsePrintOptions(undefined).smartSpacing).toBe(false);
    expect(parsePrintOptions({ smartSpacing: true }).smartSpacing).toBe(true);
    expect(() => parsePrintOptions({ smartSpacing: "true" })).toThrow();
  });
  it("legacy 4 remains stored and selects the nearest narrow preset", () => {
    const saved = parsePrintOptions({ spacing: 4 });
    expect(saved.spacing).toBe(4);
    expect(
      SPACING_PRESETS.reduce((a, b) =>
        Math.abs(saved.spacing - b[1]) < Math.abs(saved.spacing - a[1]) ? b : a,
      ),
    ).toEqual(["좁게", 16]);
  });
});
