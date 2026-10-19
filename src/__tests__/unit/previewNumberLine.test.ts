// @vitest-environment node
/**
 * Preview cards (plan §3.4) draw exact number lines: every tick, point, range end
 * and jump sits at x(n) = left + (n - min) / (max - min) × width, never by eye
 * (D-61 · 09-figure-engine-guide §4).
 */
import { describe, expect, it } from "vitest";
import {
  NUMBER_LINE_GEOMETRY as G,
  numberLineSvg,
} from "@/lib/math-srs/preview/numberLine";

const x = (n: number, min: number, max: number) =>
  G.left + ((n - min) / (max - min)) * G.width;
const attr = (svg: string, id: string, name: string) =>
  new RegExp(`id="${id}"[^>]*\\s${name}="([^"]+)"`).exec(svg)?.[1];

describe("preview number line", () => {
  it("puts ticks, labels and a closed point where the numbers are", () => {
    const svg = numberLineSvg({
      min: 36,
      max: 46,
      labels: [36, 38, 42, 44, 45],
      points: [{ value: 44, closed: true }],
      ranges: [{ from: "left", to: 44 }],
      title: "44 이하인 수",
    });
    for (let n = 36; n <= 46; n++) expect(svg).toContain(`data-value="${n}"`);
    const tick = /data-value="44" d="M ([\d.]+) /.exec(svg)?.[1];
    expect(Number(tick)).toBeCloseTo(x(44, 36, 46), 6);
    expect(Number(attr(svg, "point-44", "cx"))).toBeCloseTo(x(44, 36, 46), 6);
    expect(attr(svg, "point-44", "fill")).toBe("#3159df");
    for (const label of [36, 38, 42, 44, 45])
      expect(svg).toMatch(
        new RegExp(`id="label-${label}" x="${x(label, 36, 46)}"`),
      );
    expect(svg).not.toContain('id="label-40"');
    expect(svg).toContain("<title>44 이하인 수</title>");
  });

  it("draws an open point as a ring and a bounded range between its ends", () => {
    const svg = numberLineSvg({
      min: 18,
      max: 28,
      labels: [20, 25],
      points: [
        { value: 20, closed: true },
        { value: 25, closed: false },
      ],
      ranges: [{ from: 20, to: 25 }],
      title: "20 이상 25 미만인 수",
    });
    expect(attr(svg, "point-25", "fill")).toBe("#ffffff");
    expect(attr(svg, "point-25", "stroke")).toBe("#3159df");
    const range = /id="range-0" d="M ([\d.]+) [\d.]+ H ([\d.]+)"/.exec(svg);
    expect(Number(range?.[1])).toBeCloseTo(x(20, 18, 28), 6);
    expect(Number(range?.[2])).toBeCloseTo(x(25, 18, 28), 6);
  });

  it("draws a rounding jump from the number to where it goes", () => {
    const svg = numberLineSvg({
      min: 230,
      max: 240,
      labels: [230, 234, 240],
      points: [{ value: 234, closed: true }],
      jumps: [{ from: 234, to: 240 }],
      title: "234를 올림하면 240",
    });
    const jump =
      /id="jump-0" d="M ([\d.]+) [\d.]+ Q [\d.]+ [\d.]+ ([\d.]+) /.exec(svg);
    expect(Number(jump?.[1])).toBeCloseTo(x(234, 230, 240), 6);
    expect(Number(jump?.[2])).toBeCloseTo(x(240, 230, 240), 6);
  });

  it("refuses a line that cannot be drawn exactly", () => {
    expect(() =>
      numberLineSvg({ min: 0, max: 100, labels: [], title: "너무 많은 눈금" }),
    ).toThrow();
    expect(() =>
      numberLineSvg({
        min: 0,
        max: 10,
        labels: [11],
        title: "범위 밖 라벨",
      }),
    ).toThrow();
  });
});
