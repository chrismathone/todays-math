import { describe, expect, it } from "vitest";
import {
  analyzeStudioPage,
  measurePageInk,
} from "@/components/unified/studioPageAnalysis";

function raster(pixels: number, value = 255) {
  const data = new Uint8ClampedArray(pixels * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = value;
    data[i + 3] = 255;
  }
  return data;
}

describe("measurePageInk", () => {
  it("measures pixels rather than RGBA channels", () => {
    const data = raster(4);
    data.set([0, 0, 0, 255], 0);
    data.set([180, 180, 180, 255], 4);
    expect(measurePageInk(data)).toBe(0.5);
    expect(measurePageInk(raster(4))).toBe(0);
    expect(measurePageInk(raster(4, 0))).toBe(1);
  });

  it("composites transparency onto white and counts colored ink", () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 0, 0, 0, 0, 128, 255, 255, 0, 255, 255, 255, 255, 255,
    ]);
    expect(measurePageInk(data)).toBe(0.5);
    expect(measurePageInk(new Uint8ClampedArray([0, 0, 0, 0]))).toBe(0);
  });

  it.each([245, 252, 254])(
    "retains even faint rendered ink at channel %i",
    (value) => {
      const data = raster(10_000);
      data.set([value, value, value, 255], 0);
      expect(measurePageInk(data)).toBe(1 / 10_000);
      expect(
        analyzeStudioPage({ inkRatio: measurePageInk(data) }),
      ).toBeUndefined();
    },
  );

  it("retains a single rendered stroke even below one pixel per million", () => {
    const data = raster(2_000_000);
    data.set([0, 0, 0, 255], 0);
    expect(measurePageInk(data)).toBe(0.0000005);
    expect(
      analyzeStudioPage({ inkRatio: measurePageInk(data) }),
    ).toBeUndefined();
  });

  it("does not turn absent or incomplete raster data into evidence of blankness", () => {
    for (const data of [
      new Uint8ClampedArray(),
      new Uint8ClampedArray([255]),
    ]) {
      expect(Number.isNaN(measurePageInk(data))).toBe(true);
      expect(
        analyzeStudioPage({ inkRatio: measurePageInk(data) }),
      ).toBeUndefined();
    }
  });
});

describe("confirmed blank pages only", () => {
  it("treats a white thumbnail as a candidate, not proof of blankness", () => {
    expect(analyzeStudioPage({ inkRatio: 0 })).toBeUndefined();
  });

  it("excludes only a white candidate with a successful white confirmation", () => {
    expect(analyzeStudioPage({ inkRatio: 0, confirmedInkRatio: 0 })).toBe(
      "빈 쪽",
    );
  });

  it.each([undefined, NaN, Infinity, -Infinity, -1, 1.1, 1 / 8_000_000])(
    "retains a candidate with unknown, invalid or nonwhite confirmation %s",
    (confirmedInkRatio) => {
      expect(
        analyzeStudioPage({ inkRatio: 0, confirmedInkRatio }),
      ).toBeUndefined();
    },
  );

  it("never overrides nonwhite thumbnail evidence with a white confirmation", () => {
    expect(
      analyzeStudioPage({ inkRatio: 1 / 2_000_000, confirmedInkRatio: 0 }),
    ).toBeUndefined();
  });

  it.each([0.0000005, 0.000001, 0.002, 0.02, 1])(
    "retains nonblank pages with ink ratio %s",
    (inkRatio) => {
      expect(analyzeStudioPage({ inkRatio })).toBeUndefined();
    },
  );

  it.each([NaN, Infinity, -Infinity, -1, 1.1])(
    "retains unknown/invalid ink measurement %s",
    (inkRatio) => {
      expect(analyzeStudioPage({ inkRatio })).toBeUndefined();
    },
  );
});
