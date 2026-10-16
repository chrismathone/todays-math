import { describe, expect, it } from "vitest";
import { getArithmeticV2Definition } from "@/lib/arithmetic-v2";
import { arithmeticGeometryCatalogSvg } from "@/lib/arithmetic-v2/geometry";
import { arithmeticGeometryLaidOutSvg } from "@/lib/arithmetic-v2/presentation";
import {
  figureFirstDrawing,
  figureFirstGroupInstruction,
  figureFirstSvg,
  isFigureFirstType,
} from "@/lib/arithmetic-v2/presentation/figureFirst";
import { ANNOTATED_FIGURE_FIRST } from "@/lib/arithmetic-v2/presentation/figureFirstAnnotated";
import { arithmeticFigurePresentation } from "@/lib/arithmetic-v2/presentation/figurePolicy";

const typeIds = Object.keys(ANNOTATED_FIGURE_FIRST);
const parse = (svg: string) =>
  new DOMParser().parseFromString(svg, "image/svg+xml");

describe("figure-first gm families annotated with x (원의 성질 · 중1 각)", () => {
  it("covers the audited families", () => {
    expect(typeIds).toHaveLength(14);
    for (const typeId of typeIds) {
      expect(isFigureFirstType(typeId), typeId).toBe(true);
      expect(figureFirstGroupInstruction(typeId), typeId).toMatch(
        /^다음 그림.*(∠x의 크기를|x의 값을) 구하세요\./,
      );
    }
    expect(isFigureFirstType("m1-polygon-sum")).toBe(false);
    expect(isFigureFirstType("m1-sector-arc")).toBe(false);
  });

  it("adds exactly one legible x to the editor layout of every variant and nothing else", () => {
    let variants = 0,
      leadersUsed = 0;
    for (const typeId of typeIds) {
      const definition = getArithmeticV2Definition(typeId);
      for (let index = 0; index < definition.domainSize; index++) {
        const { prompt } = definition.problemAt(index);
        if (prompt.layout !== "math" || !prompt.figureId)
          throw new Error(typeId);
        const id = prompt.figureId;
        const canonical = arithmeticGeometryCatalogSvg(id);
        const laidOut = arithmeticGeometryLaidOutSvg(id, canonical);
        const svg = figureFirstDrawing(typeId, prompt, canonical);
        expect(svg, id).toBeDefined();
        const marks = [
          ...svg!.matchAll(/<text data-drill-label="target"[^>]*>x<\/text>/g),
        ];
        expect(marks, id).toHaveLength(1);
        // A narrow opening gets x beside the figure with one thin leader.
        const leaders = [
          ...svg!.matchAll(/<line [^>]*data-leader="target"\/>/g),
        ];
        expect(leaders.length, id).toBeLessThanOrEqual(1);
        if (leaders.length) leadersUsed++;
        expect(
          svg!.replace(marks[0][0], "").replace(leaders[0]?.[0] ?? "", ""),
          id,
        ).toBe(laidOut);
        expect(parse(svg!).querySelector("parsererror"), id).toBeNull();
        expect(arithmeticGeometryCatalogSvg(id), id).toBe(canonical);
        const presentation = arithmeticFigurePresentation(prompt, typeId);
        expect(presentation, id).toEqual({ showFigure: true, lines: [] });
        variants++;
      }
    }
    expect(variants).toBe(234);
    // Most openings take the label directly; leaders are the exception.
    expect(leadersUsed).toBeLessThan(variants / 4);
  });

  it("typesets the x in italics and keeps the chord figure's measured curves", () => {
    const { prompt } = getArithmeticV2Definition(
      "m3-circle-chord-length",
    ).problemAt(0);
    if (prompt.layout !== "math") throw new Error();
    const display = figureFirstSvg(
      "m3-circle-chord-length",
      prompt,
      arithmeticGeometryCatalogSvg(prompt.figureId!),
    )!;
    expect(display).toContain('data-original-label="x"');
    expect(display).toContain('stroke-dasharray="5 3"');
    expect(display).toContain("arithmetic-geometry-presentation-v1");
  });
});
