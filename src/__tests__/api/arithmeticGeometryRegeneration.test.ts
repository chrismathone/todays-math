// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/accountAccess", () => ({
  authorizeAccount: vi.fn(async () => ({ account: { menus: ["bank"] } })),
}));
import { regenerateArithmeticV2 } from "@/lib/workspaceArithmeticRegenerationRoutes";
import { buildArithmeticV2Sheet } from "@/lib/arithmetic-v2/sheet";
import { reopenArithmeticV2Sheet } from "@/lib/arithmetic-v2/reopen";

describe("geometry snapshot through selective regeneration route", () => {
  it("accepts the full SVG pack and changes only the chosen question without losing figures", async () => {
    const sheet = buildArithmeticV2Sheet({
      engineVersion: "arithmetic-engine-v2",
      catalogVersion: "arithmetic-catalog-v2",
      seed: "geometry-api",
      rounds: [1, 2].map(() => ({
        allocations: [
          { typeId: "e4-triangle-missing-angle", count: 6 },
          { typeId: "e4-right-triangle-missing-angle", count: 4 },
        ],
      })),
    });
    expect(sheet.figures!.svgPack.length).toBeGreaterThan(4096);
    const response = await regenerateArithmeticV2(
      new Request("http://localhost/api/arithmetic/v2/regenerate", {
        method: "POST",
        body: JSON.stringify({
          sheet,
          seed: "replacement",
          target: { round: 2, orders: [1] },
        }),
      }),
    );
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.changedOrders).toEqual([1]);
    expect(data.sheet.figures).toEqual(sheet.figures);
    expect(data.sheet.rounds[0]).toEqual(sheet.rounds[0]);
    expect(data.sheet.rounds[1].items.slice(1)).toEqual(
      sheet.rounds[1].items.slice(1),
    );
    expect(data.sheet.rounds[1].items[0].prompt).not.toEqual(
      sheet.rounds[1].items[0].prompt,
    );
    expect(reopenArithmeticV2Sheet(data.sheet)).toEqual(data.sheet);
  });
});
