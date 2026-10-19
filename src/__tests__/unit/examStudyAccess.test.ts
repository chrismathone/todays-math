import { describe, expect, it } from "vitest";
import {
  ALL_WORKSPACE_MENUS,
  canOutputFrom,
  type AccountAccess,
  type WorkspaceMenu,
} from "@/contracts/accountAccess.contract";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import { canUseExamStudy } from "@/lib/examStudyAccess";

const authorized = new Set<WorkspaceMenu>([
  "bank",
  "arithmetic",
  "studio",
  "library",
  "conceptBlank",
]);
const account: AccountAccess = {
  id: "practice-policy-test",
  name: "교사",
  email: "policy@example.invalid",
  role: "director",
  approvalStatus: "approved",
  isAdmin: false,
  menus: [],
};
const paths = [
  ["GET", "/exam/practice"],
  ["GET", "/api/exam/practice"],
  ["POST", "/api/exam/practice"],
  ["POST", "/api/exam/practice/resolve"],
] as const;

describe("exam-practice output menu policy", () => {
  it.each(ALL_WORKSPACE_MENUS)(
    "uses the same feature boundary for menu %s",
    (menu) => {
      const menus = [menu];
      const expected = authorized.has(menu);
      expect(canUseExamStudy(menus)).toBe(expected);
      for (const [method, path] of paths)
        expect(accountRouteAllowed({ ...account, menus }, method, path)).toBe(
          expected,
        );
    },
  );

  it("preserves textbook output without treating it as an exam-practice grant", () => {
    const menus: WorkspaceMenu[] = ["textbook"];
    expect(canOutputFrom(menus)).toBe(true);
    expect(
      accountRouteAllowed({ ...account, menus }, "POST", "/api/exports/pdf"),
    ).toBe(true);
    expect(accountRouteAllowed({ ...account, menus }, "GET", "/exam")).toBe(
      true,
    );
    expect(canUseExamStudy(menus)).toBe(false);
    expect(canUseExamStudy(["export"])).toBe(false);
    expect(canUseExamStudy([])).toBe(false);
  });

  it("keeps approval required even with a valid output menu", () => {
    for (const [method, path] of paths)
      expect(
        accountRouteAllowed(
          { ...account, approvalStatus: "pending", menus: ["bank"] },
          method,
          path,
        ),
      ).toBe(false);
  });
});
