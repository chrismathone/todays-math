import { describe, expect, it } from "vitest";
import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
import { branchUpdateSchema } from "@/contracts/branchAdmin.contract";

describe("branch menu input is an exact current-menu selection", () => {
  it.each(
    [[], ALL_WORKSPACE_MENUS, ["english-listening", "english-bank"]].map(
      (menus) => ({ menus }),
    ),
  )("accepts %j without expanding English selections", ({ menus }) => {
    expect(
      branchUpdateSchema.parse({ menus, expectedMenuRevision: 1 }).menus,
    ).toEqual(menus);
  });
  it.each([
    { menus: ["english"], expectedMenuRevision: 1 },
    { menus: ["textbook"], expectedMenuRevision: 1 },
    { menus: ["unknown"], expectedMenuRevision: 1 },
    { menus: ["home", "home"], expectedMenuRevision: 1 },
    { menus: ["home"] },
    { menus: [], expectedMenuRevision: 0 },
    { menus: [], expectedMenuRevision: 1.1 },
    { menus: [], expectedMenuRevision: 1, configuredMenus: [] },
    { expectedMenuRevision: 1 },
    {},
  ])("rejects invalid input %j", (input) => {
    expect(branchUpdateSchema.safeParse(input).success).toBe(false);
  });
  it("preserves name-only updates and permits one combined save", () => {
    expect(branchUpdateSchema.parse({ name: "  Branch  " })).toEqual({
      name: "Branch",
    });
    expect(
      branchUpdateSchema.parse({
        name: "Branch",
        menus: [],
        expectedMenuRevision: 2,
      }),
    ).toEqual({ name: "Branch", menus: [], expectedMenuRevision: 2 });
  });
});
