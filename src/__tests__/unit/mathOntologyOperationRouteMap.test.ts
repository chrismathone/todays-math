import { describe, expect, it } from "vitest";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
const teacher: AccountAccess = {
  id: "synthetic-teacher",
  name: "교사",
  email: "teacher@example.test",
  role: "director",
  isAdmin: false,
  approvalStatus: "approved",
  menus: ["srs"],
};
const admin: AccountAccess = { ...teacher, menus: [], isSuperAdmin: true };
const publisherPaths = [
  "/api/math-ontology/publish/prepare",
  "/api/math-ontology/publish/revoke/prepare",
  "/api/math-ontology/publish/revoke",
  "/api/math-ontology/relations/00000000-0000-4000-8000-000000000001/review/prepare",
  "/api/math-ontology/relations/00000000-0000-4000-8000-000000000001/retire",
];
describe("concrete operation lifecycle routes through the real account proxy policy", () => {
  it("allows current teacher history and outbox recovery without granting publisher access", () => {
    for (const [method, path] of [
      ["GET", "/api/math-ontology/history"],
      [
        "POST",
        "/api/math-ontology/receipts/00000000-0000-4000-8000-000000000001/outbox/resume",
      ],
    ]) {
      expect(accountRouteAllowed(teacher, method, path)).toBe(true);
      expect(accountRouteAllowed(admin, method, path)).toBe(true);
      expect(accountRouteAllowed({ ...teacher, menus: [] }, method, path)).toBe(
        false,
      );
    }
  });
  it.each(publisherPaths)(
    "allows only the superadmin POST publisher boundary %s",
    (path) => {
      expect(accountRouteAllowed(admin, "POST", path)).toBe(true);
      expect(accountRouteAllowed(teacher, "POST", path)).toBe(false);
    },
  );
  it("rejects wrong verbs, invented suffixes, and sibling endpoints", () => {
    for (const path of publisherPaths) {
      for (const method of ["GET", "PUT", "PATCH", "DELETE", "HEAD"])
        expect(accountRouteAllowed(admin, method, path)).toBe(false);
      expect(accountRouteAllowed(admin, "POST", path + "/extra")).toBe(false);
    }
    expect(
      accountRouteAllowed(admin, "POST", "/api/math-ontology/history"),
    ).toBe(false);
    expect(
      accountRouteAllowed(admin, "GET", "/api/math-ontology/history/other"),
    ).toBe(false);
    expect(
      accountRouteAllowed(
        admin,
        "POST",
        "/api/math-ontology/publish/arbitrary",
      ),
    ).toBe(false);
  });
});
