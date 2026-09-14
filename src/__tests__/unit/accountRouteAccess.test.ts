import { describe, expect, it } from "vitest";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import {
  ALL_WORKSPACE_MENUS,
  type AccountAccess,
} from "@/contracts/accountAccess.contract";
const account: AccountAccess = {
  id: "u1",
  name: "교사",
  email: "teacher@example.test",
  isAdmin: false,
  role: "director",
  approvalStatus: "approved",
  menus: [...ALL_WORKSPACE_MENUS],
};
describe("account approval and menu route policy", () => {
  it.each([
    "/admin",
    "/api/admin/users",
    "/dev/unified",
    "/api/dev/unified/ai",
  ])("keeps privileged path %s admin-only", (path) => {
    expect(accountRouteAllowed(account, "GET", path)).toBe(false);
    expect(
      accountRouteAllowed({ ...account, isAdmin: true }, "GET", path),
    ).toBe(true);
  });
  it.each([
    "/api/library/documents",
    "/api/problems",
    "/api/studio/ai",
    "/classes",
    "/api/tests",
  ])("blocks pending accounts from %s", (path) =>
    expect(
      accountRouteAllowed(
        { ...account, approvalStatus: "pending" },
        "GET",
        path,
      ),
    ).toBe(false),
  );
  it.each([
    "/approval-pending",
    "/api/account/access",
    "/api/account/activity",
    "/api/auth/signout",
  ])("retains pending account recovery %s", (path) =>
    expect(
      accountRouteAllowed(
        { ...account, approvalStatus: "pending" },
        "GET",
        path,
      ),
    ).toBe(true),
  );
  it("blocks disabled API menus and unknown API features", () => {
    const limited = {
      ...account,
      menus: ["library"] as AccountAccess["menus"],
    };
    expect(accountRouteAllowed(limited, "GET", "/api/library/documents")).toBe(
      true,
    );
    for (const path of [
      "/api/problems",
      "/api/studio/ai",
      "/api/tests",
      "/api/new-feature",
    ])
      expect(accountRouteAllowed(limited, "GET", path)).toBe(false);
    expect(accountRouteAllowed({ ...account, menus: [] }, "GET", "/")).toBe(
      true,
    );
  });
  it("requires both bank and studio for AI problem transformations", () => {
    expect(
      accountRouteAllowed(
        { ...account, menus: ["bank"] },
        "POST",
        "/api/problems/transform/adopt",
      ),
    ).toBe(false);
    expect(
      accountRouteAllowed(
        { ...account, menus: ["bank", "studio"] },
        "POST",
        "/api/problems/transform/adopt",
      ),
    ).toBe(true);
  });
});
