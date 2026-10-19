// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/arithmetic-v2/extraGeometry", () => {
  const candidate = (index: number) => ({
    parameters: [index + 2, 3],
    prompt: {
      layout: "math" as const,
      text: `가로 ${index + 2} cm, 세로 3 cm인 직사각형`,
      latex: `${index + 2}\\times3`,
      instruction: "직사각형의 넓이를 구하세요.",
      figureId: `test-area-${index}`,
      answerUnit: "cm²",
    },
    answer: {
      kind: "integer" as const,
      exact: [String((index + 2) * 3)],
      text: `${(index + 2) * 3} cm²`,
      latex: `${(index + 2) * 3}\\,\\mathrm{cm}^{2}`,
    },
  });
  return {
    EXTRA_GEOMETRY_DEFINITIONS: [
      {
        id: "test-area",
        grade: "초5",
        strand: "도형",
        title: "넓이",
        description: "test",
        labels: [],
        curriculum: { semester: 1, unit: "다각형의 둘레와 넓이" },
        rankGroup: "test-area",
        domainSize: 8,
        problemAt: candidate,
        verify: (value: ReturnType<typeof candidate>) =>
          Number(value.answer.exact[0]) ===
          value.parameters[0] * value.parameters[1],
      },
    ],
    EXTRA_GEOMETRY_FIGURE_MAPS: [
      Object.fromEntries(
        Array.from({ length: 8 }, (_, index) => [
          `test-area-${index}`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><desc>arithmetic-geometry-drill-v1</desc><rect x="30" y="30" width="${(index + 2) * 20}" height="60" fill="none" stroke="black"/></svg>`,
        ]),
      ),
    ],
  };
});

import { buildArithmeticV2Sheet } from "@/lib/arithmetic-v2/sheet";
import { reopenArithmeticV2Sheet } from "@/lib/arithmetic-v2/reopen";
import { arithmeticV2PromptSchema } from "@/contracts/arithmeticV2.contract";
import { regenerateArithmeticV2Items } from "@/lib/arithmeticRegeneration";
import {
  arithmeticGeometrySvg,
  arithmeticGeometryAnswerUnit,
} from "@/lib/arithmetic-v2/geometry";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";

const build = () =>
  buildArithmeticV2Sheet({
    engineVersion: "arithmetic-engine-v2",
    catalogVersion: "arithmetic-catalog-v2",
    seed: "geometry-subsets",
    rounds: [1, 2].map(() => ({
      allocations: [{ typeId: "test-area", count: 3 }],
    })),
  });

describe("saved geometry subsets across generation, regeneration and shared output", () => {
  it("reopens stored figures exactly and prints the requested area unit", () => {
    const sheet = build();
    expect(sheet.figures?.version).toBe(2);
    expect(reopenArithmeticV2Sheet(JSON.parse(JSON.stringify(sheet)))).toEqual(
      sheet,
    );
    const problems = arithmeticToStudioProblems(sheet);
    expect(problems).toHaveLength(6);
    expect(
      problems.every(
        (p) =>
          p.content.includes("\\mathrm{cm}^{2}") && !p.content.includes("circ"),
      ),
    ).toBe(true);
    for (const p of problems)
      expect(p.figureSourceMm[0]).toBeCloseTo((280 * 25.4) / 96);
    expect(problems[0].figureSvg).toContain("arithmetic-geometry-drill-v1");
    expect(problems[0].content).toContain("세로 $3\\,\\mathrm{cm}$인 직사각형");
  });

  it("replaces the selected question's packed figure and keeps other rounds/items byte-identical", () => {
    const before = build();
    const original = JSON.stringify(before);
    const result = regenerateArithmeticV2Items(
      before,
      { round: 2, orders: [2] },
      "new-area",
    );
    expect(result.changedOrders).toEqual([2]);
    expect(JSON.stringify(before)).toBe(original);
    expect(result.sheet.rounds[0]).toEqual(before.rounds[0]);
    expect(result.sheet.rounds[1].items[0]).toEqual(before.rounds[1].items[0]);
    expect(result.sheet.rounds[1].items[2]).toEqual(before.rounds[1].items[2]);
    expect(result.sheet.rounds[1].items[1].prompt).not.toEqual(
      before.rounds[1].items[1].prompt,
    );
    expect(reopenArithmeticV2Sheet(result.sheet)).toEqual(result.sheet);
    for (const item of before.rounds[0].items) {
      if (item.prompt.layout !== "math") throw new Error("expected figure");
      expect(
        arithmeticGeometrySvg(item.prompt.figureId!, result.sheet.figures!),
      ).toBe(arithmeticGeometrySvg(item.prompt.figureId!, before.figures!));
    }
  });

  it("rejects a valid pack that does not cover a question's figure", () => {
    const sheet = build();
    const other = buildArithmeticV2Sheet({
      engineVersion: "arithmetic-engine-v2",
      catalogVersion: "arithmetic-catalog-v2",
      seed: "only-one",
      rounds: [{ allocations: [{ typeId: "test-area", count: 1 }] }],
    });
    expect(() =>
      reopenArithmeticV2Sheet({ ...sheet, figures: other.figures }),
    ).toThrow();
  });

  it("keeps the original sheet and figure pack when no different question is available", () => {
    const sheet = buildArithmeticV2Sheet({
      engineVersion: "arithmetic-engine-v2",
      catalogVersion: "arithmetic-catalog-v2",
      seed: "full-area-domain",
      rounds: [{ allocations: [{ typeId: "test-area", count: 8 }] }],
    });
    const result = regenerateArithmeticV2Items(
      sheet,
      { round: 1, orders: [1] },
      "no-alternative",
    );
    expect(result.changedOrders).toEqual([]);
    expect(result.unchangedOrders).toEqual([1]);
    expect(result.sheet).toBe(sheet);
    expect(result.sheet.figures).toBe(sheet.figures);
  });

  it("keeps original angle SVG readable in a mixed old/new geometry sheet", () => {
    const sheet = buildArithmeticV2Sheet({
      engineVersion: "arithmetic-engine-v2",
      catalogVersion: "arithmetic-catalog-v2",
      seed: "mixed-geometry",
      rounds: [
        {
          allocations: [
            { typeId: "test-area", count: 2 },
            { typeId: "e4-triangle-missing-angle", count: 2 },
          ],
        },
      ],
    });
    expect(sheet.figures?.version).toBe(2);
    const reopened = reopenArithmeticV2Sheet(sheet);
    const angle = reopened.rounds[0].items[2].prompt;
    if (angle.layout !== "math" || !angle.figureId)
      throw new Error("angle figure expected");
    expect(arithmeticGeometrySvg(angle.figureId, reopened.figures!)).toContain(
      "arithmetic-angle-drill-v1",
    );
    const problems = arithmeticToStudioProblems(reopened);
    expect(problems[0].content).toContain("\\mathrm{cm}^{2}");
    expect(problems[0].figureSvg).toContain("<svg");
    // 2026-10-16: 초등 각도 is figure-first — the saved angle figure prints with
    // the unknown marked □ and the given angles stay on the figure, not in prose.
    expect(problems[2].figureSvg).toContain('aria-label="□"');
    expect(problems[2].figureSvg).toContain("arithmetic-angle-drill-v1");
    expect(problems[2].content).not.toContain("주어진 각");
  });

  it("accepts an explicit unitless answer without adding an angle suffix", () => {
    const prompt = arithmeticV2PromptSchema.parse({
      layout: "math",
      text: "비를 구하세요.",
      latex: "3:4",
      answerUnit: "",
    });
    expect(arithmeticGeometryAnswerUnit(prompt)).toBe("");
  });
});
