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
import { hasArithmeticEngineFigure } from "@/lib/arithmetic-v2/presentation/engineFigures";

const labels = (svg: string) =>
  [
    ...new DOMParser()
      .parseFromString(svg, "image/svg+xml")
      .querySelectorAll("text"),
  ].map(
    (el) =>
      [
        el.getAttribute("data-drill-label") ?? "engine",
        el.getAttribute("data-mj") ?? el.textContent ?? "",
      ] as const,
  );
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
        const engine = hasArithmeticEngineFigure(id);
        for (const m of prompt.text.matchAll(/∠([A-Z]{3})=(\d+)°/g))
          if (m[2] !== "90")
            expect(
              found.some(
                ([key, value]) =>
                  value === `${m[2]}°` && (engine || key === `angle-${m[1]}`),
              ),
              id,
            ).toBe(true);
        for (const m of prompt.text.matchAll(
          /(?<![A-Z+])([A-Z]{2})(?:=([A-Z]{2}))?=(\d+) cm(?!²)/g,
        ))
          for (const key of [m[1], m[2]].filter(Boolean))
            if (!lines.includes(`${key}=`))
              expect(
                found.some(([name, value]) =>
                  engine
                    ? value === `${m[3]} cm`
                    : name === `segment-${key}` && value === m[3],
                ),
                id,
              ).toBe(true);
        expect(
          found.filter(([, text]) => text === "x" || text === "x cm").length +
            (lines.match(/=x cm/g)?.length ?? 0),
          id,
        ).toBe(wantsX ? 1 : 0);
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

  it("attempts crowded diagonal dimensions, retains any refused condition and identifies a whole-segment target", () => {
    const typeId = "m2-pythagoras-rhombus-side-integer";
    const rhombus = getArithmeticV2Definition(typeId).problemAt(0);
    if (rhombus.prompt.layout !== "math") throw Error();
    const rhombusSvg = figureFirstDrawing(
      typeId,
      rhombus.prompt,
      arithmeticGeometryCatalogSvg(rhombus.prompt.figureId!),
    )!;
    const kept = figureFirstLines(typeId, rhombus.prompt).join(" ");
    for (const [key, value] of [
      ["AC", "6"],
      ["BD", "8"],
    ])
      expect(
        kept.includes(`${key}=${value} cm`) ||
          rhombusSvg.includes(`data-mj="${value} cm"`),
      ).toBe(true);
    const wholeType = "m2-parallel-triangle-whole-side";
    const whole = getArithmeticV2Definition(wholeType).problemAt(0);
    if (whole.prompt.layout !== "math") throw Error();
    const wholeSvg = figureFirstDrawing(
      wholeType,
      whole.prompt,
      arithmeticGeometryCatalogSvg(whole.prompt.figureId!),
    )!;
    expect(wholeSvg).toContain('stroke-width="2.6"');
    expect(wholeSvg).not.toContain('data-mj="x cm"');
    expect(figureFirstGroupInstruction(wholeType)).toBe(
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
    expect(svg).not.toContain('data-mj="D"');
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
    expect(display).toMatch(/data-original-label="x"|data-mj="x cm"/);
    // Italic x and roman cm are baked MathJax paths, not native font hints.
    const target = new DOMParser()
      .parseFromString(display, "image/svg+xml")
      .querySelector('g[data-label="x cm"]');
    expect(target?.querySelector("path")).toBeTruthy();
    expect(target?.querySelector("text,tspan")).toBeNull();
    expect(figureFirstSvg("m3-pythagoras-leg-surd", prompt)).toBeUndefined();
  });
});
