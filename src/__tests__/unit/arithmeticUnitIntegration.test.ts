// @vitest-environment node
import { describe, expect, it } from "vitest";
import katex from "katex";
import {
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
  buildArithmeticV2Sheet,
  listArithmeticV2Types,
  reopenArithmeticV2Sheet,
} from "@/lib/arithmetic-v2";
import { ELEMENTARY_COMPLETE_DEFINITIONS } from "@/lib/arithmetic-v2/families/elementaryComplete";
import { ALGEBRA_COMPLETE_DEFINITIONS } from "@/lib/arithmetic-v2/families/algebraComplete";
import { TRIGONOMETRY_COMPLETE_DEFINITIONS } from "@/lib/arithmetic-v2/families/trigonometryComplete";
import { FUNCTIONS_DATA_DEFINITIONS } from "@/lib/arithmetic-v2/families/functionsData";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";
import { regenerateArithmeticV2Items } from "@/lib/arithmeticRegeneration";
import { tokenizeMath } from "@/lib/math/segments";

const definitions = [
  ...ELEMENTARY_COMPLETE_DEFINITIONS,
  ...ALGEBRA_COMPLETE_DEFINITIONS,
  ...TRIGONOMETRY_COMPLETE_DEFINITIONS,
  ...FUNCTIONS_DATA_DEFINITIONS,
];
const versions = {
  engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
  catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
};

describe("school-unit calculation integration", () => {
  it("exposes precise school units and round-trips each new family through saved output", () => {
    const catalog = new Map(listArithmeticV2Types().map((t) => [t.id, t]));
    for (let i = 0; i < definitions.length; i += 100) {
      const batch = definitions.slice(i, i + 100);
      const sheet = buildArithmeticV2Sheet({
        ...versions,
        seed: `unit-integration-${i}`,
        rounds: [
          { allocations: batch.map((d) => ({ typeId: d.id, count: 1 })) },
        ],
      });
      const original = JSON.stringify(sheet);
      expect(reopenArithmeticV2Sheet(JSON.parse(original))).toEqual(sheet);
      const problems = arithmeticToStudioProblems(sheet);
      for (const [j, problem] of problems.entries()) {
        const definition = batch[j];
        expect(catalog.get(definition.id)?.curriculum).toEqual(
          definition.curriculum,
        );
        expect(definition.curriculum?.unit.trim()).toBeTruthy();
        expect(problem.source).toMatchObject({
          item: sheet.rounds[0].items[j],
        });
        for (const part of tokenizeMath(
          `${problem.content}\n${problem.answer}`,
        ))
          if (part.type !== "text")
            expect(() =>
              katex.renderToString(part.value, {
                throwOnError: true,
                strict: "ignore",
              }),
            ).not.toThrow();
        expect(problem.content).not.toContain("[그림1]");
      }
      expect(JSON.stringify(sheet)).toBe(original);
    }
  });

  it("keeps 200 questions within the save limit and regenerates only selected saved positions", () => {
    const allocations = definitions
      .slice(0, 100)
      .map((d) => ({ typeId: d.id, count: 1 }));
    const sheet = buildArithmeticV2Sheet({
      ...versions,
      seed: "unit-200-original",
      rounds: [{ allocations }, { allocations }],
    });
    expect(
      Buffer.byteLength(JSON.stringify({ title: "단원별 계산 연습", sheet })),
    ).toBeLessThan(256 * 1024);
    const changed = regenerateArithmeticV2Items(
      sheet,
      { round: 2, orders: [1, 50, 100] },
      "unit-200-next",
    );
    expect(changed.changedOrders).toEqual([1, 50, 100]);
    expect(changed.sheet.rounds[0]).toBe(sheet.rounds[0]);
    changed.sheet.rounds[1].items.forEach((item, i) => {
      if ([0, 49, 99].includes(i))
        expect(item.prompt).not.toEqual(sheet.rounds[1].items[i].prompt);
      else expect(item).toBe(sheet.rounds[1].items[i]);
    });
    expect(
      reopenArithmeticV2Sheet(JSON.parse(JSON.stringify(changed.sheet))),
    ).toEqual(changed.sheet);
    expect(
      arithmeticToStudioProblems(changed.sheet).map(
        (p) => p.arithmetic?.number,
      ),
    ).toEqual(Array.from({ length: 200 }, (_, i) => i + 1));
  });

  it("retains formula/table markup and Korean or percent answer units in nongeometry tasks", () => {
    const wanted = definitions.filter((d) => {
      const p = d.problemAt(0).prompt;
      return p.layout === "math" && (p.answerUnit || p.latex.includes("array"));
    });
    const sheet = buildArithmeticV2Sheet({
      ...versions,
      seed: "unit-markup",
      rounds: [
        {
          allocations: wanted
            .slice(0, 100)
            .map((d) => ({ typeId: d.id, count: 1 })),
        },
      ],
    });
    arithmeticToStudioProblems(sheet).forEach((problem, i) => {
      const prompt = sheet.rounds[0].items[i].prompt;
      if (prompt.layout !== "math") throw new Error("expected formula");
      if (
        wanted[i].strand !== "도형" &&
        prompt.latex !== `\\text{${prompt.text}}`
      )
        expect(problem.content).toContain(prompt.latex);
      if (prompt.answerUnit === "%") expect(problem.content).toContain("\\%");
      if (prompt.answerUnit && /^[가-힣]+$/.test(prompt.answerUnit))
        expect(problem.content).toContain(prompt.answerUnit);
    });
  });
});
