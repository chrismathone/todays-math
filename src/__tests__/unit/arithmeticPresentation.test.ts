import { describe, expect, it } from "vitest";
import { defaultArithmeticPresentation } from "@/contracts/arithmeticPresentation.contract";
import { buildArithmeticSheet } from "@/lib/arithmetic/sheet";
import {
  buildArithmeticV2Sheet,
  listArithmeticV2Types,
} from "@/lib/arithmetic-v2";
import { reopenAnyArithmeticSheet } from "@/lib/arithmeticDocument";
import {
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_CATALOG_VERSION,
} from "@/contracts/arithmetic.contract";
import {
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
} from "@/contracts/arithmeticV2.contract";

const legacy = () =>
  buildArithmeticSheet({
    engineVersion: ARITHMETIC_ENGINE_VERSION,
    catalogVersion: ARITHMETIC_CATALOG_VERSION,
    seed: "presentation-v1",
    rounds: [
      {
        skills: [
          {
            skillId: "times-table",
            count: 3,
            constraints: { dans: [3], multiplier: { min: 1, max: 9 } },
          },
        ],
      },
    ],
  });
const grade = () =>
  buildArithmeticV2Sheet({
    engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
    catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
    seed: "presentation-v2",
    rounds: [
      { allocations: [{ typeId: listArithmeticV2Types()[0].id, count: 3 }] },
    ],
  });

describe.each([
  ["legacy", legacy],
  ["grade", grade],
] as const)("%s presentation compatibility", (_, build) => {
  it("keeps old snapshots exact and restores format/stage without affecting generated items", () => {
    const sheet = build();
    expect(reopenAnyArithmeticSheet(sheet)).toEqual(sheet);
    const presentation = defaultArithmeticPresentation("연산 학원");
    presentation.step = "output";
    presentation.printOptions.template = "modern";
    presentation.printOptions.columns = 1;
    presentation.printOptions.showAnswers = true;
    presentation.printMeta.instructorName = "김선생";
    const restored = reopenAnyArithmeticSheet({ ...sheet, presentation });
    expect(restored.presentation).toEqual(presentation);
    expect(restored.rounds).toEqual(sheet.rounds);
    expect(restored.seed).toEqual(sheet.seed);
  });
  it("rejects unknown/corrupt metadata and never lets presentation bypass snapshot checks", () => {
    const sheet = build();
    const presentation = defaultArithmeticPresentation();
    for (const invalid of [
      { ...presentation, version: 2 },
      { ...presentation, step: "missing" },
      { ...presentation, unknown: true },
      {
        ...presentation,
        printOptions: { ...presentation.printOptions, template: "missing" },
      },
      {
        ...presentation,
        printOptions: { ...presentation.printOptions, quickAnswerOnly: false },
      },
      {
        ...presentation,
        printOptions: { ...presentation.printOptions, unknown: true },
      },
      {
        ...presentation,
        printOptions: { ...presentation.printOptions, spacing: Infinity },
      },
      {
        ...presentation,
        printMeta: { ...presentation.printMeta, totalScore: "wrong" },
      },
      {
        ...presentation,
        printMeta: { ...presentation.printMeta, unknown: true },
      },
    ])
      expect(() =>
        reopenAnyArithmeticSheet({ ...sheet, presentation: invalid }),
      ).toThrow();
    const corrupt = structuredClone(sheet);
    if (corrupt.payloadVersion === 1)
      corrupt.rounds[0].items[0].answer = "999999";
    else corrupt.rounds[0].items[0].answer.text = "999999";
    expect(() =>
      reopenAnyArithmeticSheet({ ...corrupt, presentation }),
    ).toThrow();
  });
});
