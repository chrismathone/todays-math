import { describe, expect, it } from "vitest";
import { getArithmeticV2Definition } from "@/lib/arithmetic-v2";
import { arithmeticGeometryCatalogSvg } from "@/lib/arithmetic-v2/geometry";
import { TRIANGLE_GEOMETRY_FIGURES } from "@/lib/arithmetic-v2/families/geometryTriangles";
import {
  figureFirstDrawing,
  figureFirstGroupInstruction,
  figureFirstLines,
  figureFirstSvg,
  isFigureFirstType,
} from "@/lib/arithmetic-v2/presentation/figureFirst";
import { TRIANGLE_FIGURE_FIRST } from "@/lib/arithmetic-v2/presentation/figureFirstTriangles";
import { MIDDLE_FIGURE_POLICY } from "@/lib/arithmetic-v2/presentation/figurePolicyMiddle";
import { arithmeticFigurePresentation } from "@/lib/arithmetic-v2/presentation/figurePolicy";

const labels = (svg: string) =>
  [
    ...svg.matchAll(
      /<text[^>]*data-drill-label="([^"]+)"[^>]*>([^<]*)<\/text>/g,
    ),
  ].map((m) => [m[1], m[2]] as const);
const typeIds = Object.keys(TRIANGLE_FIGURE_FIRST);

describe("figure-first gt1 families (피타고라스 · 닮음 · 평행선 · 사각형 · 외심 · 무게중심)", () => {
  it("covers the audited families, each with a figure-first policy", () => {
    expect(typeIds).toHaveLength(49);
    for (const typeId of typeIds) {
      expect(isFigureFirstType(typeId), typeId).toBe(true);
      const policy = MIDDLE_FIGURE_POLICY.find((p) => p.typeId === typeId);
      expect(policy?.showFigure, typeId).toBe(true);
      expect(policy?.reason, typeId).toContain("그림 우선");
      expect(figureFirstGroupInstruction(typeId), typeId).toMatch(/^다음 그림/);
    }
    for (const typeId of [
      "m2-similarity-length-enlarge",
      "m2-centroid-area-3",
      "m2-incenter-area",
      "m2-midsegment-area-small",
    ])
      expect(isFigureFirstType(typeId), typeId).toBe(false);
  });

  it("redraws every variant with each public given and the target, leaving the canonical bytes", () => {
    let variants = 0;
    for (const typeId of typeIds) {
      const definition = getArithmeticV2Definition(typeId);
      const instruction = figureFirstGroupInstruction(typeId)!;
      const wantsX = /x의 값|∠x/.test(instruction);
      for (let index = 0; index < definition.domainSize; index++) {
        const { prompt } = definition.problemAt(index);
        if (prompt.layout !== "math" || !prompt.figureId)
          throw new Error(typeId);
        const id = prompt.figureId;
        const saved = TRIANGLE_GEOMETRY_FIGURES[id];
        const canonical = arithmeticGeometryCatalogSvg(id);
        const svg = figureFirstDrawing(typeId, prompt, canonical);
        expect(svg, id).toBeDefined();
        expect(svg, id).not.toBe(canonical);
        const found = labels(svg!);
        const lines = figureFirstLines(typeId, prompt).join(" ");
        for (const m of prompt.text.matchAll(/∠([A-Z]{3})=(\d+)°/g))
          if (m[2] !== "90")
            expect(found, id).toContainEqual([`angle-${m[1]}`, `${m[2]}°`]);
        for (const m of prompt.text.matchAll(
          /(?<![A-Z+])([A-Z]{2})(?:=([A-Z]{2}))?=(\d+) cm(?!²)/g,
        ))
          for (const key of [m[1], m[2]].filter(Boolean))
            if (!lines.includes(`${key}=`))
              expect(found, id).toContainEqual([`segment-${key}`, m[3]]);
        expect(
          found.filter(([, text]) => text === "x"),
          id,
        ).toHaveLength(wantsX ? 1 : 0);
        expect(TRIANGLE_GEOMETRY_FIGURES[id], id).toBe(saved);
        expect(arithmeticGeometryCatalogSvg(id), id).toBe(canonical);
        const presentation = arithmeticFigurePresentation(prompt, typeId);
        expect(presentation.showFigure, id).toBe(true);
        expect(presentation.lines.join(" "), id).not.toMatch(/구하세요|이다\./);
        variants++;
      }
    }
    expect(variants).toBe(1718);
  });

  it("keeps crowded diagonal givens as one line and names a whole-segment target in the instruction", () => {
    const rhombus = getArithmeticV2Definition(
      "m2-pythagoras-rhombus-side-integer",
    ).problemAt(0);
    expect(
      figureFirstLines("m2-pythagoras-rhombus-side-integer", rhombus.prompt),
    ).toEqual(["AC=6 cm, BD=8 cm"]);
    const whole = getArithmeticV2Definition(
      "m2-parallel-triangle-whole-side",
    ).problemAt(0);
    expect(
      figureFirstLines("m2-parallel-triangle-whole-side", whole.prompt),
    ).toEqual([]);
    expect(figureFirstGroupInstruction("m2-parallel-triangle-whole-side")).toBe(
      "다음 그림에서 DE∥BC일 때, AC의 길이를 구하세요.",
    );
    const area = getArithmeticV2Definition("m2-right-triangle-area").problemAt(
      0,
    );
    const svg = figureFirstDrawing(
      "m2-right-triangle-area",
      area.prompt,
      arithmeticGeometryCatalogSvg(
        (area.prompt as { figureId: string }).figureId,
      ),
    )!;
    expect(svg).not.toContain('data-drill-label="D"');
    expect(svg).not.toContain('data-segment="BD"');
  });

  it("typesets the display copy with x in italics and the presentation marker", () => {
    const { prompt } = getArithmeticV2Definition(
      "m3-pythagoras-leg-surd",
    ).problemAt(3);
    if (prompt.layout !== "math") throw new Error();
    const display = figureFirstSvg(
      "m3-pythagoras-leg-surd",
      prompt,
      arithmeticGeometryCatalogSvg(prompt.figureId!),
    )!;
    expect(display).toContain("arithmetic-geometry-presentation-v1");
    expect(display).toContain('data-original-label="x"');
    expect(figureFirstSvg("m3-pythagoras-leg-surd", prompt)).toBeUndefined();
  });
});
