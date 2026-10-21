import { describe, expect, it } from "vitest";
import { gridIndexOverlay, measureGridFromGray, type MeasuredGrid } from "@/lib/figure/gridMeasure";

function lattice({ crop = false, missing = false, horizontal = true } = {}) {
  const gray = new Uint8Array(10000).fill(255);
  for (let i = 0; i <= 8; i++) {
    for (let t = 10; t <= 90; t++) {
      if (!missing || i !== 4) gray[t * 100 + (crop ? 0 : 10) + i * 10] = 40;
      if (horizontal) gray[(10 + i * 10) * 100 + t] = 40;
    }
  }
  return gray;
}

const invalidGrayCases: Array<readonly [string, () => unknown]> = [
  ["short", () => new Uint8Array(9999)], ["long", () => new Uint8Array(10001)],
  ["sparse", () => new Array(10000)], ["array-like", () => ({ length: 10000, 0: 255 })],
  ["string", () => "255"], ["undefined", () => undefined],
  ...[NaN, Infinity, -1, 256, 0.5, "255"].map((value): readonly [string, () => unknown] => [String(value), () => {
    const a: unknown[] = new Array(10000).fill(255); a[0] = value; return a;
  }]),
];

describe("bounded grid measurement is advisory only", () => {
  it("finds an explicit eight by eight lattice without changing source bytes", () => {
    const pixels = lattice(), before = pixels.slice();
    const result = measureGridFromGray(pixels, 100, 100);
    expect(result).toMatchObject({ kind: "heuristic-only", requiresReview: true,
      coordinateSpace: "analysis-pixels-x-right-y-down",
      x: { count: 8, found: 9 }, y: { count: 8, found: 9 } });
    expect(result!.x.first).toBeCloseTo(10, 10); expect(result!.x.last).toBeCloseTo(90, 10);
    expect(result!.y.first).toBeCloseTo(10, 10); expect(result!.y.last).toBeCloseTo(90, 10);
    expect(result).not.toHaveProperty("passed");
    expect(measureGridFromGray(pixels, 100, 100)).toEqual(result);
    expect(pixels).toEqual(before);
  });
  it("does not infer graph-paper meaning from a pixel-identical table", () => {
    const table = lattice();
    expect(measureGridFromGray(table, 100, 100)).toEqual(measureGridFromGray(lattice(), 100, 100));
    expect(measureGridFromGray(table, 100, 100)?.requiresReview).toBe(true);
  });
  it.each([
    ["white", () => new Uint8Array(10000).fill(255)],
    ["black", () => new Uint8Array(10000)],
    ["one direction", () => lattice({ horizontal: false })],
    ["missing line", () => lattice({ missing: true })],
    ["cropped edge", () => lattice({ crop: true })],
  ] as const)("leaves %s evidence unknown", (_name, pixels) => {
    expect(measureGridFromGray(pixels(), 100, 100)).toBeNull();
  });
  it.each([
    [0, 100], [-1, 100], [1.5, 100], [NaN, 100], [Infinity, 100],
    [1401, 100], [100, 1401], ["100", 100], [undefined, 100], [100, null],
  ])("rejects invalid/bounded dimensions %s × %s", (w, h) => {
    expect(measureGridFromGray([], w, h)).toBeNull();
  });
  it.each(invalidGrayCases)("rejects malformed gray data %s", (_name, value) => {
    expect(measureGridFromGray(value(), 100, 100)).toBeNull();
  });
});

describe("comparison-only ordinal mapping", () => {
  const grid: MeasuredGrid = { kind: "heuristic-only", requiresReview: true,
    coordinateSpace: "analysis-pixels-x-right-y-down", width: 200, height: 100,
    x: { first: 10, last: 90, cell: 10, count: 8, found: 9 },
    y: { first: 10, last: 90, cell: 10, count: 8, found: 9 } };
  it("maps through contain letterboxing and counts y upwards independently of source units", () => {
    const overlay = gridIndexOverlay(grid, 800, 400)!;
    expect(overlay.legend).toContain("원문 좌표 아님");
    expect(overlay.ticks[0]!.label).toBe("0");
    expect(overlay.ticks[0]!.x).toBeCloseTo(88.2, 10);
    expect(overlay.ticks[0]!.y).toBeCloseTo(235, 10);
    const zeroY = overlay.ticks.find((t) => t.label === "0" && t.x < 48)!;
    expect(zeroY.x).toBeCloseTo(30, 10);
    expect(zeroY.y).toBeCloseTo(610.8, 10);
    expect(overlay.ticks.every((t) => t.x > 0 && t.x < 900 && t.y > 0 && t.y < 900)).toBe(true);
  });
  it("preserves separate x/y resampling scales and immutable measurement", () => {
    const g = { ...grid, width: 300, height: 149 }, before = structuredClone(grid);
    const result = gridIndexOverlay(g, 600, 299)!;
    const y = result.ticks.find((t) => t.x < 48 && t.label === "0")!.y;
    expect(y).toBeCloseTo(48 + (804 - 299 * (804 / 600)) / 2 + 90 * (299 / 149) * (804 / 600), 10);
    expect(grid).toEqual(before);
  });
  it("bounds inconsistent or nonfinite overlay inputs instead of looping", () => {
    for (const count of [Infinity, NaN, -1, 61]) {
      expect(gridIndexOverlay({ ...grid, x: { ...grid.x, count } }, 800, 400)).toBeNull();
    }
    expect(gridIndexOverlay(grid, 16001, 400)).toBeNull();
    expect(gridIndexOverlay({ ...grid, y: { ...grid.y, last: 95 } }, 800, 400)).toBeNull();
    expect(gridIndexOverlay({ ...grid, x: { first: 10, last: 20, cell: 10, count: 1, found: 2 } }, 800, 400)).toBeNull();
    expect(gridIndexOverlay({ ...grid, coordinateSpace: "source-axis-units" } as unknown as MeasuredGrid, 800, 400)).toBeNull();
  });
});
