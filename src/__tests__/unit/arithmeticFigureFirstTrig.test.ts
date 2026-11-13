import { describe, expect, it } from "vitest";
import {
  getArithmeticV2Definition,
  listArithmeticV2Types,
} from "@/lib/arithmetic-v2";
import { arithmeticGeometryCatalogSvg } from "@/lib/arithmetic-v2/geometry";
import {
  figureFirstDrawing,
  figureFirstGroupInstruction,
  figureFirstLines,
  figureFirstSvg,
  isFigureFirstType,
} from "@/lib/arithmetic-v2/presentation/figureFirst";
import { arithmeticFigurePresentation } from "@/lib/arithmetic-v2/presentation/figurePolicy";
import { arithmeticGeometryLaidOutSvg } from "@/lib/arithmetic-v2/presentation";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";
import { buildArithmeticV2Sheet } from "@/lib/arithmetic-v2";
import {
  ARITHMETIC_V2_CATALOG_VERSION,
  ARITHMETIC_V2_ENGINE_VERSION,
} from "@/contracts/arithmeticV2.contract";

const prompts = (typeId: string) => {
  const definition = getArithmeticV2Definition(typeId);
  return Array.from({ length: definition.domainSize }, (_, index) => {
    const { prompt, parameters } = definition.problemAt(index);
    if (prompt.layout !== "math") throw new Error(typeId);
    return { prompt, parameters };
  });
};
const labels = (svg: string) =>
  [...svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)].map(
    (m) =>
      [
        /data-drill-label="([^"]+)"/.exec(m[1])?.[1] ?? "engine",
        /data-mj="([^"]+)"/.exec(m[1])?.[1] ?? m[2].replace(/<[^>]+>/g, ""),
      ] as const,
  );

describe("figure-first trigonometry (중3 삼각비)", () => {
  it("names exactly the trigonometry types the figure can carry", () => {
    for (const id of [
      "m3-trig-ratio",
      "m3-trig-special-length",
      "m3-trig-triangle-area",
      "m3-trig-length-given-ratio",
      "m3-trig-area-given-sine",
      "m3-trig-sine-from-area",
      "m3-trig-side-from-area-sine",
    ])
      expect(isFigureFirstType(id), id).toBe(true);
    for (const id of [
      "m3-trig-special-value",
      "m3-trig-endpoint-values",
      "m3-trig-inverse-special-angle",
      "m3-trig-complementary-ratio",
      "m3-trig-ratio-from-another",
      "m3-trig-special-squared-arithmetic",
    ])
      expect(isFigureFirstType(id), id).toBe(false);
  });

  it("redraws every special-angle length variant with the angle, the given side and x", () => {
    let count = 0;
    for (const { prompt, parameters } of prompts("m3-trig-special-length")) {
      const canonical = arithmeticGeometryCatalogSvg(prompt.figureId!);
      const svg = figureFirstDrawing(
        "m3-trig-special-length",
        prompt,
        canonical,
      );
      expect(svg, prompt.figureId).toBeDefined();
      const found = labels(svg!);
      const [t, k] = parameters;
      expect(
        found.some(([, text]) => text === `${t}°`),
        prompt.figureId,
      ).toBe(true);
      expect(
        found.some(([, text]) => text === `${k} cm`),
        prompt.figureId,
      ).toBe(true);
      expect(
        found.some(([, text]) => text === "x cm"),
        prompt.figureId,
      ).toBe(true);
      expect(arithmeticGeometryCatalogSvg(prompt.figureId!)).toBe(canonical);
      count++;
    }
    expect(count).toBe(342);
    expect(figureFirstGroupInstruction("m3-trig-special-length")).toBe(
      "다음 그림의 직각삼각형 ABC에서 x의 값을 구하세요. 근호는 간단히 하세요.",
    );
  });

  it("keeps the complete canonical figure for ratio and area drills and drops the prose", () => {
    for (const { prompt } of prompts("m3-trig-ratio").slice(0, 6)) {
      const canonical = arithmeticGeometryCatalogSvg(prompt.figureId!);
      // The editor layout of the same canonical figure, untouched.
      expect(figureFirstDrawing("m3-trig-ratio", prompt, canonical)).toBe(
        arithmeticGeometryLaidOutSvg(prompt.figureId!, canonical),
      );
      expect(arithmeticGeometryCatalogSvg(prompt.figureId!)).toBe(canonical);
      expect(figureFirstLines("m3-trig-ratio", prompt)).toEqual([
        `${/^(sin|cos|tan)/.exec(prompt.instruction!)![1]} A`,
      ]);
    }
    expect(figureFirstGroupInstruction("m3-trig-ratio")).toBe(
      "다음 그림의 직각삼각형에서 다음 삼각비의 값을 기약분수로 구하세요.",
    );
    const [{ prompt }] = prompts("m3-trig-triangle-area");
    expect(figureFirstLines("m3-trig-triangle-area", prompt)).toEqual([]);
    expect(figureFirstGroupInstruction("m3-trig-triangle-area")).toBe(
      "다음 그림의 삼각형의 넓이를 구하세요. 근호는 간단히 하세요.",
    );
  });

  it.each([
    ["m3-trig-length-given-ratio", true, 1],
    ["m3-trig-area-given-sine", false, 1],
    ["m3-trig-sine-from-area", false, 1],
    ["m3-trig-side-from-area-sine", true, 1],
  ])(
    "draws every %s problem from its prompt with the given sides%s",
    (typeId, hasX, lineCount) => {
      const all = prompts(typeId);
      for (const { prompt } of all) {
        const svg = figureFirstDrawing(typeId, prompt);
        expect(svg, prompt.latex).toBeDefined();
        const found = labels(svg!);
        const lines = figureFirstLines(typeId, prompt);
        for (const m of prompt.latex.matchAll(
          /\\mathrm\{(AB|AC|BC)\}=(\d+)\\,/g,
        ))
          expect(
            found.some(([, text]) => text === `${m[2]} cm`) ||
              lines.includes(`${m[1]}=${m[2]} cm`),
            prompt.latex,
          ).toBe(true);
        expect(
          found.some(([, text]) => text === "x cm") ||
            lines.some((line) => /^[A-Z]{2}=x cm$/.test(line)),
          prompt.latex,
        ).toBe(hasX);
        expect(lines.length, prompt.latex).toBeGreaterThanOrEqual(lineCount);
        for (const residual of lines.slice(lineCount))
          expect(residual, prompt.latex).toMatch(/^[A-Z]{2}=(?:x|\d+) cm$/);
      }
      expect(all.length).toBeGreaterThan(1000);
    },
  );

  it("presents a figure-less trig problem as figure plus one line in the shared output", () => {
    const type = listArithmeticV2Types().find(
      (t) => t.id === "m3-trig-length-given-ratio",
    )!;
    const presentation = arithmeticFigurePresentation(type.example, type.id);
    expect(presentation.showFigure).toBe(true);
    expect(presentation.lines).toHaveLength(1);
    expect(presentation.lines[0]).toMatch(/^(sin|cos|tan) A=/);
    const sheet = buildArithmeticV2Sheet({
      engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
      seed: "figure-first-trig",
      rounds: [{ allocations: [{ typeId: type.id, count: 3 }] }],
    });
    const before = structuredClone(sheet);
    const problems = arithmeticToStudioProblems(sheet);
    expect(sheet).toEqual(before);
    for (const problem of problems) {
      expect(problem.figureSvg).toContain(
        "arithmetic-geometry-presentation-v1",
      );
      expect(problem.figureSourceMm).toHaveLength(1);
      expect(problem.content).toContain("[그림1]");
      expect(problem.arithmetic?.groupInstruction).toBe(
        "다음 그림의 직각삼각형 ABC에서 x의 값을 구하세요.",
      );
    }
    const display = figureFirstSvg(type.id, type.example);
    expect(display).toMatch(/data-original-label="x"|data-mj="x cm"/);
  });
});
