// @vitest-environment node
import { describe, expect, it } from "vitest";
import { arithmeticV2Definitions } from "@/lib/arithmetic-v2/registry";
import { buildArithmeticV2Sheet } from "@/lib/arithmetic-v2/sheet";
import { reopenArithmeticV2Sheet } from "@/lib/arithmetic-v2/reopen";
import { regenerateArithmeticV2Items } from "@/lib/arithmeticRegeneration";

describe("selective regeneration with production grade domains", () => {
  it.each(
    arithmeticV2Definitions().map(
      (definition) => [definition.id, definition.domainSize] as const,
    ),
  )("preserves and verifies %s", (typeId, domainSize) => {
    const count = Math.min(3, domainSize);
    const sheet = buildArithmeticV2Sheet({
      engineVersion: "arithmetic-engine-v2",
      catalogVersion: "arithmetic-catalog-v2",
      seed: "catalog-regeneration",
      rounds: [1, 2].map(() => ({ allocations: [{ typeId, count }] })),
    });
    const result = regenerateArithmeticV2Items(
      sheet,
      { round: 2, orders: [1] },
      "catalog-replacement",
    );
    expect(result.sheet.rounds[0]).toBe(sheet.rounds[0]);
    for (let index = 1; index < count; index += 1)
      expect(result.sheet.rounds[1].items[index]).toBe(
        sheet.rounds[1].items[index],
      );
    expect(result.changedOrders).toEqual(domainSize > count ? [1] : []);
    expect(reopenArithmeticV2Sheet(result.sheet)).toEqual(result.sheet);
  });
});
