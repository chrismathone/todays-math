/**
 * «오늘의 개념» 메뉴 — 자리(D-124 ⑽) · 메뉴 권한(`disabledMenus`) · 관문 규칙.
 *
 * 메뉴 권한은 다른 메뉴와 같은 길을 탄다: 세션의 `menus` = 전체 메뉴 − `disabledMenus`
 * (`src/lib/auth.ts`) → 화면은 `allowedMenus` 로 거르고, API 는 관문(`accountRouteAllowed`)이
 * 막는다. 쓰기의 `isAdmin` 은 라우트가 따로 막는다(`conceptAdmin.test.ts` ①).
 */
import { describe, expect, it } from "vitest";

import {
  accountUpdateSchema,
  ALL_WORKSPACE_MENUS,
  WORKSPACE_MENUS,
  type AccountAccess,
} from "@/contracts/accountAccess.contract";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";

const account: AccountAccess = {
  id: "u1",
  name: "원장",
  email: "director@example.test",
  role: "director",
  isAdmin: false,
  approvalStatus: "approved",
  menus: [...ALL_WORKSPACE_MENUS],
};

describe("메뉴 자리", () => {
  it("«수업 · 학생 관리» 바로 아래에 «오늘의 개념»", () => {
    const ids = WORKSPACE_MENUS.map((m) => m.id);
    expect(ids.indexOf("concept")).toBe(ids.indexOf("teaching") + 1);
    expect(WORKSPACE_MENUS.find((m) => m.id === "concept")?.label).toBe(
      "오늘의 개념",
    );
  });

  it("관리자 화면에서 메뉴를 **전부** 켜 저장할 수 있다(손으로 적은 상한에 걸리지 않는다)", () => {
    const parsed = accountUpdateSchema.safeParse({
      menus: [...ALL_WORKSPACE_MENUS],
      expectedUpdatedAt: "2026-09-15T00:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
    expect(ALL_WORKSPACE_MENUS).toContain("concept");
  });
});

describe("관문 — /api/concept 는 «오늘의 개념» 메뉴를 따른다", () => {
  it.each([
    "/api/concept",
    "/api/concept/units",
    "/api/concept/lectures",
    "/api/concept/lectures/0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70",
  ])("메뉴가 켜진 계정은 %s 에 닿는다", (path) => {
    expect(accountRouteAllowed(account, "GET", path)).toBe(true);
    expect(accountRouteAllowed(account, "POST", path)).toBe(true);
  });

  it("메뉴를 끈 계정은 막는다 — 다른 메뉴가 켜져 있어도", () => {
    const limited = {
      ...account,
      menus: ["teaching", "home"] as AccountAccess["menus"],
    };
    expect(accountRouteAllowed(limited, "GET", "/api/concept")).toBe(false);
    expect(
      accountRouteAllowed(limited, "PATCH", "/api/concept/lectures/x"),
    ).toBe(false);
  });

  it("승인 전 계정은 막는다", () => {
    expect(
      accountRouteAllowed(
        { ...account, approvalStatus: "pending" },
        "GET",
        "/api/concept",
      ),
    ).toBe(false);
  });

  it("비슷한 이름의 다른 경로는 이 규칙에 딸려 열리지 않는다", () => {
    const limited = {
      ...account,
      menus: ["concept"] as AccountAccess["menus"],
    };
    expect(accountRouteAllowed(limited, "GET", "/api/concepts")).toBe(false);
    expect(accountRouteAllowed(limited, "GET", "/api/classes")).toBe(false);
  });
});
