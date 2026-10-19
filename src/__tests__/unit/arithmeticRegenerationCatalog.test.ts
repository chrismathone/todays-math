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
    // 98f39e8b6: two rounds may share at most floor(count/5) items, so tiny
    // domains get one round, and a replacement must avoid every other round.
    const shared = Math.floor(count / 5);
    const rounds = domainSize >= 2 * count - shared ? 2 : 1;
    const request = (length: number) => ({
      engineVersion: "arithmetic-engine-v2" as const,
      catalogVersion: "arithmetic-catalog-v2" as const,
      seed: "catalog-regeneration",
      rounds: Array.from({ length }, () => ({
        allocations: [{ typeId, count }],
      })),
    });
    if (rounds === 1)
      expect(() => buildArithmeticV2Sheet(request(2))).toThrow(
        expect.objectContaining({ code: "round-overlap" }),
      );
    const sheet = buildArithmeticV2Sheet(request(rounds));
    const last = rounds - 1;
    const result = regenerateArithmeticV2Items(
      sheet,
      { round: rounds, orders: [1] },
      "catalog-replacement",
    );
    if (rounds === 2) expect(result.sheet.rounds[0]).toBe(sheet.rounds[0]);
    for (let index = 1; index < count; index += 1)
      expect(result.sheet.rounds[last].items[index]).toBe(
        sheet.rounds[last].items[index],
      );
    const used = rounds === 2 ? 2 * count - shared : count;
    expect(result.changedOrders).toEqual(domainSize > used ? [1] : []);
    expect(reopenArithmeticV2Sheet(result.sheet)).toEqual(result.sheet);
  });
});
