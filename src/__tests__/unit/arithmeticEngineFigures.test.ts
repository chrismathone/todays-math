import { describe, expect, it } from "vitest";
import { getArithmeticV2Definition } from "@/lib/arithmetic-v2/registry";
import {
  arithmeticGeometryCatalogSvg,
  arithmeticGeometrySnapshotForPrompts,
  arithmeticGeometrySvg,
} from "@/lib/arithmetic-v2/geometry";
import {
  figureFirstDrawing,
  figureFirstLines,
  figureFirstSvg,
} from "@/lib/arithmetic-v2/presentation/figureFirst";
import { arithmeticEngineFigureSvg } from "@/lib/arithmetic-v2/presentation/engineFigures";
import {
  arithmeticEngineInlineSvg,
  arithmeticEngineInlineLines,
} from "@/lib/arithmetic-v2/presentation/engineFigures";

const attrs = (tag: string, name: string) =>
  Number(new RegExp(`\\b${name}="([^"]+)"`).exec(tag)?.[1]);
const lines = (svg: string) =>
  [...svg.matchAll(/<line\b[^>]+\/>/g)].map((m) => ({
    tag: m[0],
    a: [attrs(m[0], "x1"), attrs(m[0], "y1")],
    b: [attrs(m[0], "x2"), attrs(m[0], "y2")],
  }));
describe("authoritative offline arithmetic engine displays", () => {
  it("keeps the reported trapezoid dimensions, midpoint geometry and target on PQ at every domain extreme", () => {
    const d = getArithmeticV2Definition("m2-trapezoid-diagonal-midpoints");
    for (let i = 0; i < d.domainSize; i++) {
      const c = d.problemAt(i),
        p = c.prompt;
      if (p.layout !== "math") throw Error();
      const canonical = arithmeticGeometryCatalogSvg(p.figureId!);
      const svg = figureFirstDrawing(d.id, p, canonical)!;
      expect(svg).not.toContain("arithmetic-geometry-drill-v1");
      const ls = lines(svg),
        target = ls.filter((l) => attrs(l.tag, "stroke-width") === 2.6);
      expect(target).toHaveLength(1);
      const top = ls
        .filter(
          (l) =>
            Math.abs(l.a[1] - l.b[1]) < 1e-6 &&
            attrs(l.tag, "stroke-width") === 1.9,
        )
        .sort((a, b) => a.a[1] - b.a[1]);
      const [a, delta] = c.parameters;
      const AD = top[0],
        BC = top.at(-1)!;
      expect(
        Math.abs(AD.a[0] - AD.b[0]) / Math.abs(BC.a[0] - BC.b[0]),
      ).toBeCloseTo(a / (a + delta), 4);
      const PQ = target[0];
      expect(Math.abs(PQ.a[1] - (AD.a[1] + BC.a[1]) / 2)).toBeLessThanOrEqual(
        0.001,
      );
      expect(PQ.b[1]).toBeCloseTo(PQ.a[1], 5);
      expect(
        Math.abs(PQ.a[0] - PQ.b[0]) / Math.abs(BC.a[0] - BC.b[0]),
      ).toBeCloseTo(delta / 2 / (a + delta), 4);
      for (const value of [`${a} cm`, `${a + delta} cm`, "x cm"])
        expect(svg).toContain(`data-mj="${value}"`);
      expect(figureFirstLines(d.id, p)).toEqual([]);
      if (![a, a + delta].includes(delta / 2))
        expect(svg).not.toContain(`data-mj="${delta / 2} cm"`);
      expect(arithmeticGeometryCatalogSvg(p.figureId!)).toBe(canonical);
    }
  });
  it("retains every essential trapezoid side ratio instead of implying it from the shape", () => {
    const d = getArithmeticV2Definition("m2-trapezoid-parallel-section");
    expect(d.domainSize).toBe(64);
    for (let i = 0; i < d.domainSize; i++) {
      const c = d.problemAt(i);
      const [, , p, q] = c.parameters;
      expect(figureFirstLines(d.id, c.prompt)).toContain(`AE:EB=${p}:${q}`);
    }
  });
  it("rejects modified/unknown original SVG and preserves stored version-2 packs byte for byte", () => {
    const d = getArithmeticV2Definition("m2-trapezoid-diagonal-midpoints");
    const p = d.problemAt(6).prompt;
    if (p.layout !== "math") throw Error();
    const canonical = arithmeticGeometryCatalogSvg(p.figureId!);
    const pack = arithmeticGeometrySnapshotForPrompts([p])!;
    const before = JSON.stringify(pack);
    expect(
      arithmeticEngineFigureSvg(p.figureId!, canonical + " "),
    ).toBeUndefined();
    expect(
      arithmeticEngineFigureSvg("gt1-m2-unknown-1", canonical),
    ).toBeUndefined();
    expect(figureFirstSvg(d.id, p, canonical + " ")).toBeUndefined();
    expect(figureFirstSvg(d.id, p, canonical)).toBeTruthy();
    expect(JSON.stringify(pack)).toBe(before);
    expect(arithmeticGeometrySvg(p.figureId!, pack)).toBe(canonical);
  });
  it("preserves usable nominal font sizes in compound regression cases", () => {
    for (const [type, index] of [
      ["m3-trig-length-given-ratio", 197],
      ["m3-trig-side-from-area-sine", 12237],
      ["m3-trig-side-from-area-sine", 960],
      ["m3-trig-sine-from-area", 1515],
    ] as const) {
      const prompt = getArithmeticV2Definition(type).problemAt(index).prompt;
      const svg = arithmeticEngineInlineSvg(type, prompt)!;
      const box = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)!;
      const scale = 280 / Math.max(Number(box[1]), Number(box[2]));
      const texts = [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)];
      const captions = texts.filter((m) => /[가-힣]/.test(m[2]));
      expect(captions).toHaveLength(3);
      for (const m of captions)
        expect(attrs(m[1], "font-size") * scale).toBeGreaterThanOrEqual(10);
      for (const m of texts.filter((m) => !/[가-힣]/.test(m[2])))
        expect(attrs(m[1], "font-size") * scale).toBeGreaterThanOrEqual(12);
      expect(svg).toContain("긴 변은 일부만 표시");
      expect(arithmeticEngineInlineLines(type, prompt)).toEqual([]);
      if (type === "m3-trig-length-given-ratio")
        expect(figureFirstLines(type, prompt)).toContain("tan A=8");
    }
  });
  it("requires the complete Unicode public prompt for inline assets and never falls back to a clamped diagram", () => {
    const type = "m3-trig-length-given-ratio",
      prompt = getArithmeticV2Definition(type).problemAt(308).prompt;
    if (prompt.layout !== "math") throw Error();
    const svg = arithmeticEngineInlineSvg(type, prompt);
    expect(svg).toBeTruthy();
    const reordered = Object.fromEntries(
      Object.entries(prompt).reverse(),
    ) as typeof prompt;
    expect(arithmeticEngineInlineSvg(type, reordered)).toBe(svg);
    expect(
      arithmeticEngineInlineSvg(type, {
        ...prompt,
        instruction: prompt.instruction + " changed",
      }),
    ).toBeUndefined();
    const changed = { ...prompt, text: prompt.text + " changed" };
    expect(arithmeticEngineInlineSvg(type, changed)).toBeUndefined();
    expect(figureFirstDrawing(type, changed)).toBeUndefined();
    expect(figureFirstSvg(type, changed)).toBeUndefined();
  });
});
