import { describe, expect, it } from "vitest";
import { CENTER_SPECS } from "@/lib/arithmetic-v2/families/geometryTriangles/centers";
import { TRIANGLE_GEOMETRY_FIGURES } from "@/lib/arithmetic-v2/families/geometryTriangles";
import { listArithmeticV2Types } from "@/lib/arithmetic-v2";
import {
  centerAngleFigureSvg,
  centerAngleGroupInstruction,
  isCenterAngleType,
} from "@/lib/arithmetic-v2/presentation/centerAngles";
import { arithmeticFigurePresentation } from "@/lib/arithmetic-v2/presentation/figurePolicy";
import {
  arithmeticGroupFrom,
  arithmeticGroupInstruction,
} from "@/lib/arithmeticOutputLayout";
import type { StudioProblem } from "@/components/unified/types";

const centerSpecs = CENTER_SPECS.filter((spec) =>
  isCenterAngleType(`m2-${spec.key}`),
);

describe("figure-first circumcenter and incenter angles", () => {
  it("covers exactly the fourteen angle families", () => {
    expect(centerSpecs).toHaveLength(14);
    expect(centerSpecs.every((spec) => spec.unit === "°")).toBe(true);
    expect(isCenterAngleType("m2-incenter-area")).toBe(false);
    expect(isCenterAngleType("m2-circum-equal-radii")).toBe(false);
  });

  it("draws every variant with each given angle and x, leaving the saved figure unchanged", () => {
    let variants = 0;
    for (const spec of centerSpecs)
      for (const p of spec.rows) {
        const id = `gt1-m2-${spec.key}-${p.join("-")}`;
        const saved = TRIANGLE_GEOMETRY_FIGURES[id];
        const svg = centerAngleFigureSvg(id);
        expect(svg, id).toBeDefined();
        expect(svg, id).not.toBe(saved);
        const task = spec.task(p);
        for (const m of task.text.matchAll(/∠([A-Z]{3})=(\d+)°/g))
          expect(svg, id).toContain(`data-drill-label="angle-${m[1]}"`);
        expect(svg, id).toContain(
          `data-drill-label="angle-${task.target.replace("∠", "")}"`,
        );
        expect(svg, id).toMatch(/>x<\/text>/);
        // The frozen canonical SVG is still the original single-given drawing.
        expect(TRIANGLE_GEOMETRY_FIGURES[id]).toBe(saved);
        variants++;
      }
    expect(variants).toBe(159);
  });

  it("rejects identities outside the finite domains", () => {
    expect(
      centerAngleFigureSvg("gt1-m2-incenter-half-angle-41"),
    ).toBeUndefined();
    expect(centerAngleFigureSvg("gt1-m2-incenter-area-0-1")).toBeUndefined();
    expect(centerAngleFigureSvg("gm-m1-parallel-angle-1")).toBeUndefined();
  });

  it("removes per-problem prose and names the right center", () => {
    for (const type of listArithmeticV2Types().filter((t) =>
      isCenterAngleType(t.id),
    )) {
      expect(arithmeticFigurePresentation(type.example, type.id)).toEqual({
        showFigure: true,
        lines: [],
      });
      expect(centerAngleGroupInstruction(type.id)).toBe(
        type.id.includes("circum")
          ? "다음 그림에서 점 O가 △ABC의 외심일 때, ∠x의 크기를 구하세요."
          : "다음 그림에서 점 I가 △ABC의 내심일 때, ∠x의 크기를 구하세요.",
      );
    }
  });

  it("numbers the shared question by the contiguous group", () => {
    const problem = (number: number, groupKey: string, round = 1) =>
      ({
        arithmetic: {
          round,
          number,
          groupKey,
          groupTitle: groupKey,
          ...(groupKey === "c" ? { groupInstruction: "질문" } : {}),
        },
      }) as StudioProblem;
    const list = [
      problem(10, "a"),
      problem(11, "c"),
      problem(12, "c"),
      problem(13, "c"),
      problem(14, "a"),
      problem(15, "c", 2),
    ];
    expect(arithmeticGroupInstruction(arithmeticGroupFrom(list, 1))).toBe(
      "[11~13] 질문",
    );
    expect(arithmeticGroupInstruction(arithmeticGroupFrom(list, 5))).toBe(
      "[15] 질문",
    );
    expect(
      arithmeticGroupInstruction(arithmeticGroupFrom(list, 0)),
    ).toBeUndefined();
  });
});
