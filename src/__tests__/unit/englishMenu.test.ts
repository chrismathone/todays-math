/**
 * «오늘의 영어» 메뉴(D-148) — 자리 · 제품 파생 · 메뉴 권한 상한 · 관문 규칙.
 *
 * 메뉴 권한은 다른 메뉴와 같은 길이다: 세션의 `menus` = 전체 메뉴 − `disabledMenus`(`src/lib/auth.ts`)
 * → 화면은 `allowedMenus` 로 거르고, API 는 관문(`accountRouteAllowed`)이 막는다.
 * 영어 아래 탭 셋(학교별 내신 대비 · 문제 만들기 · 문제 보관함)은 **권한 하나**(`english`)를 본다(25 §1.2).
 * 인쇄 페이지(`/english/sets/{id}/print`)는 `/api` 밖이라 기본 통과인데, 이 메뉴에 묶어야 메뉴를 끈 계정이 못 연다.
 */
import { describe, expect, it } from "vitest";

import {
  accountUpdateSchema,
  ALL_WORKSPACE_MENUS,
  WORKSPACE_MENUS,
  WORKSPACE_PRODUCTS,
  workspaceMenuProduct,
  workspaceMenusOf,
  workspaceMenuSchema,
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

describe("메뉴 자리 · 제품", () => {
  it("«오늘의 영어»는 수학 메뉴 뒤 마지막이고 영어 제품에 딸린다", () => {
    const ids = WORKSPACE_MENUS.map((m) => m.id);
    expect(ids.at(-1)).toBe("english");
    expect(WORKSPACE_MENUS.find((m) => m.id === "english")?.label).toBe(
      "오늘의 영어",
    );
    expect(workspaceMenuProduct("english")).toBe("english");
  });

  it("제품은 둘(오늘의수학 · 오늘의영어)이고, 수학 메뉴 아홉은 그대로 수학이다", () => {
    expect(WORKSPACE_PRODUCTS.map((p) => p.id)).toEqual(["math", "english"]);
    expect(workspaceMenusOf("math")).toEqual([
      "home",
      "bank",
      "studio",
      "export",
      "library",
      "teaching",
      "concept",
      "conceptBlank",
      "srs",
    ]);
    expect(workspaceMenusOf("english")).toEqual(["english"]);
  });

  it("enum 과 배열이 같은 메뉴를 같은 순서로 안다(손으로 두 곳을 고치는 자리)", () => {
    expect(workspaceMenuSchema.options).toEqual(ALL_WORKSPACE_MENUS);
  });

  it("관리자 화면에서 메뉴를 전부 켜 저장할 수 있다(상한이 메뉴 수를 따라온다)", () => {
    const parsed = accountUpdateSchema.safeParse({
      menus: [...ALL_WORKSPACE_MENUS],
      expectedUpdatedAt: "2026-09-30T00:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
    expect(ALL_WORKSPACE_MENUS).toContain("english");
  });
});

describe("관문 — /api/english 와 /english 는 «오늘의 영어» 메뉴를 따른다", () => {
  it.each([
    "/api/english/exams",
    "/api/english/exams/0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70/materials",
    "/api/english/materials/0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70",
    "/api/english/sets/0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70",
    "/api/english/generate",
    "/english/sets/0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70/print",
  ])("메뉴가 켜진 계정은 %s 에 닿는다", (path) => {
    expect(accountRouteAllowed(account, "GET", path)).toBe(true);
    expect(accountRouteAllowed(account, "POST", path)).toBe(true);
  });

  it("메뉴를 끈 계정은 API 도 인쇄 페이지도 막는다 — 다른 메뉴가 다 켜져 있어도", () => {
    const limited = {
      ...account,
      menus: ALL_WORKSPACE_MENUS.filter((m) => m !== "english"),
    };
    expect(accountRouteAllowed(limited, "GET", "/api/english/exams")).toBe(
      false,
    );
    expect(accountRouteAllowed(limited, "PUT", "/api/english/sets/x")).toBe(
      false,
    );
    expect(accountRouteAllowed(limited, "GET", "/english/sets/x/print")).toBe(
      false,
    );
  });

  it("승인 전 계정은 막는다", () => {
    expect(
      accountRouteAllowed(
        { ...account, approvalStatus: "pending" },
        "GET",
        "/api/english/exams",
      ),
    ).toBe(false);
  });

  it("비슷한 이름의 다른 경로는 이 규칙에 딸려 열리지 않는다", () => {
    const limited = {
      ...account,
      menus: ["english"] as AccountAccess["menus"],
    };
    expect(accountRouteAllowed(limited, "GET", "/api/englishx")).toBe(false);
    expect(accountRouteAllowed(limited, "GET", "/api/classes")).toBe(false);
    expect(accountRouteAllowed(limited, "GET", "/api/concept")).toBe(false);
  });
});
