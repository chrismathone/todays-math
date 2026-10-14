// @vitest-environment node
import { describe, expect, it } from "vitest";
import originalSheet from "../fixtures/arithmetic-v2-original-53.json";
import {
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
  buildArithmeticV2Sheet,
  reopenArithmeticV2Sheet,
} from "@/lib/arithmetic-v2";

// Captured before adding supplemental families. Keep this fixture frozen:
// changing the catalog must never rewrite an existing sheet or seeded request.
describe("original v2 sheet compatibility after catalog expansion", () => {
  it("reopens the original 53-family snapshot without changing any field", () => {
    expect(originalSheet.rounds[0].items).toHaveLength(53);
    expect(reopenArithmeticV2Sheet(originalSheet)).toEqual(originalSheet);
  });

  it("reproduces the original prompts, parameters, indices and answers", () => {
    expect(
      buildArithmeticV2Sheet({
        engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
        catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
        seed: originalSheet.seed,
        rounds: originalSheet.rounds.map((round) => ({
          allocations: round.items.map((item) => ({
            typeId: item.typeId,
            count: 1,
          })),
        })),
      }),
    ).toEqual(originalSheet);
  });
});
