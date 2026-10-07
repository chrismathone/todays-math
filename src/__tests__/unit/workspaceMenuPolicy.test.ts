import { afterEach, describe, expect, it, vi } from "vitest";
import {
  accountUpdateSchema,
  ALL_WORKSPACE_MENUS,
  workspaceMenusFromDisabled,
} from "@/contracts/accountAccess.contract";
import { workspaceMenuPolicy } from "@/lib/workspaceMenuPolicy";
import { effectiveWorkspaceMenuPolicy } from "@/lib/workspaceMenuPolicy.server";

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllEnvs());

const branchA = {
  disabledMenus: ["bank", "english-listening"],
  menuRevision: 2,
};
const staff = {
  id: "teacher",
  branchId: "branch-a",
  disabledMenus: [],
  branch: branchA,
};

describe("effective workspace menu policy", () => {
  it("supports an exact bank/listening-only branch checklist", () => {
    vi.stubEnv("ENGLISH_LISTENING_ENABLED", "true");
    const policy = effectiveWorkspaceMenuPolicy({
      ...staff,
      branch: {
        disabledMenus: ALL_WORKSPACE_MENUS.filter(
          (menu) => menu !== "english-bank" && menu !== "english-listening",
        ),
        menuRevision: 5,
      },
    });
    expect(policy.branchMenus).toEqual(["english-listening", "english-bank"]);
    expect(policy.menus).toEqual(["english-listening", "english-bank"]);
    expect(policy.configuredMenus).toEqual(ALL_WORKSPACE_MENUS);
  });
  it.each([
    { isAdmin: true, branchRole: "owner" },
    { isAdmin: true, isSuperAdmin: true },
  ])("caps privileged staff and leaves branch B unchanged: %j", (role) => {
    const a = effectiveWorkspaceMenuPolicy({ ...staff, ...role });
    const b = effectiveWorkspaceMenuPolicy({
      ...staff,
      ...role,
      branchId: "branch-b",
      branch: { disabledMenus: [], menuRevision: 1 },
    });
    expect(a.configuredMenus).toEqual(ALL_WORKSPACE_MENUS);
    expect(a.menus).not.toContain("bank");
    expect(a.menus).not.toContain("english-listening");
    expect(b.menus).toContain("bank");
    expect(a.branchMenuRevision).toBe(2);
  });
  it("restores the saved personal policy when a branch cap is lifted", () => {
    const personal = { ...staff, disabledMenus: ["studio", "english-maker"] };
    const blocked = workspaceMenuPolicy(personal);
    const restored = workspaceMenuPolicy({
      ...personal,
      branch: { disabledMenus: [], menuRevision: 3 },
    });
    expect(blocked.menus).not.toContain("bank");
    expect(restored.menus).toContain("bank");
    expect(restored.menus).not.toContain("studio");
    expect(restored.configuredMenus).toEqual(blocked.configuredMenus);
    expect(personal.disabledMenus).toEqual(["studio", "english-maker"]);
  });
  it("keeps branch English toggles exact while preserving personal legacy denials", () => {
    const oldEnglish = ["english-school", "english-maker", "english-library"];
    const branch = workspaceMenuPolicy({
      ...staff,
      branch: { disabledMenus: oldEnglish, menuRevision: 4 },
    });
    expect(branch.menus).toContain("english-bank");
    expect(branch.menus).toContain("english-listening");
    for (const disabledMenus of [oldEnglish, ["english"]]) {
      const personal = workspaceMenuPolicy({ ...staff, disabledMenus });
      expect(personal.configuredMenus).not.toContain("english-bank");
      expect(personal.configuredMenus).not.toContain("english-listening");
    }
  });
  it("uses personal policy when unassigned and fails closed for a missing assigned relation", () => {
    const unassigned = workspaceMenuPolicy({
      disabledMenus: ["bank"],
      branchId: null,
    });
    expect(unassigned.branchMenus).toBeNull();
    expect(unassigned.branchMenuRevision).toBeNull();
    expect(unassigned.menus).toEqual(workspaceMenusFromDisabled(["bank"]));
    const missing = workspaceMenuPolicy({ ...staff, branch: null });
    expect(missing.menus).toEqual([]);
    expect(missing.branchMenus).toEqual([]);
  });
  it("lets the stored policies alone decide listening, and intersects them with the kill switch", () => {
    // The former pilot list is not read: an account it never named is treated like any other.
    vi.stubEnv("ENGLISH_LISTENING_TEACHER_IDS", "someone-else");
    vi.stubEnv("ENGLISH_LISTENING_ENABLED", "true");
    const open = { ...staff, branch: { disabledMenus: [], menuRevision: 1 } };
    const allowed = effectiveWorkspaceMenuPolicy(open);
    expect(allowed.menus).toContain("english-listening");
    expect(allowed.unavailableMenus).toEqual([]);
    const capped = effectiveWorkspaceMenuPolicy(staff);
    expect(capped.menus).not.toContain("english-listening");
    expect(capped.unavailableMenus).toEqual([]);
    expect(
      effectiveWorkspaceMenuPolicy({
        ...open,
        disabledMenus: ["english-listening"],
      }).menus,
    ).not.toContain("english-listening");
    vi.stubEnv("ENGLISH_LISTENING_ENABLED", "false");
    for (const account of [open, { ...open, isSuperAdmin: true }]) {
      const off = effectiveWorkspaceMenuPolicy(account);
      expect(off.menus).not.toContain("english-listening");
      expect(off.unavailableMenus).toEqual(["english-listening"]);
      expect(off.configuredMenus).toContain("english-listening");
    }
  });
});

describe("personal menu write compatibility", () => {
  const base = { expectedUpdatedAt: "2026-10-03T00:00:00.000Z" };
  it("accepts expected branch scope and preserves legacy English normalization", () => {
    const result = accountUpdateSchema.parse({
      ...base,
      menus: ["english"],
      expectedBranchId: null,
    });
    expect(result.menus).toEqual([
      "english-school",
      "english-maker",
      "english-library",
    ]);
    expect(result.expectedBranchId).toBeNull();
    expect(
      accountUpdateSchema.safeParse({ ...base, name: "Teacher" }).success,
    ).toBe(true);
  });
  it.each(["english-bank", "english-listening"])(
    "explicitly rejects unrepresentable %s-only personal selection",
    (menu) => {
      const result = accountUpdateSchema.safeParse({ ...base, menus: [menu] });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues[0].path).toEqual(["menus"]);
    },
  );
  it("accepts representable new menus and rejects response-only fields", () => {
    expect(
      accountUpdateSchema.safeParse({
        ...base,
        menus: ["english-maker", "english-listening", "english-bank"],
      }).success,
    ).toBe(true);
    for (const field of [
      "configuredMenus",
      "branchMenus",
      "branchMenuRevision",
      "unavailableMenus",
    ])
      expect(
        accountUpdateSchema.safeParse({ ...base, name: "Teacher", [field]: [] })
          .success,
      ).toBe(false);
  });
});
