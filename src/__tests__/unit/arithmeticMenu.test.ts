/**
 * «연산대장» 메뉴(원장님 2026-10-16) — 자리 · 제품 · 관리 화면의 체크 칸 · 관문 · 호환.
 *
 * 그동안 연산대장은 «시험지 만들기»(bank)에 얹혀 있어 관리 콘솔이 켜고 끌 수 없었다. 이제 다른 메뉴와 같은 길이다:
 * 세션의 `menus` = 전체 메뉴 − `disabledMenus` → 화면은 `allowedMenus` 로 거르고, 관문(`accountRouteAllowed`)이
 * `/api/arithmetic/**` 와 연산 학습지 자료 경로를 막는다. 두 목록(계정 · 지점)은 **꺼 둔 메뉴**라 기존 행에는
 * `arithmetic` 이 없다 — 모두가 지금처럼 메뉴를 가진다(마이그레이션 `20261016120000_menu_arithmetic`).
 */
import { describe, expect, it } from "vitest";

import {
  accountUpdateSchema,
  ALL_WORKSPACE_MENUS,
  isPersonalMenuSelectionRepresentable,
  WORKSPACE_MENUS,
  workspaceMenuOptionsOf,
  workspaceMenuProduct,
  workspaceMenuSchema,
  workspaceMenusFromBranchDisabled,
  workspaceMenusFromDisabled,
  workspaceMenusOf,
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
const only = (...menus: AccountAccess["menus"]): AccountAccess => ({
  ...account,
  menus,
});

const ARITHMETIC_ROUTES: [string, string][] = [
  ["GET", "/api/arithmetic/catalog"],
  ["HEAD", "/api/arithmetic/catalog"],
  ["GET", "/api/arithmetic/v2/catalog"],
  ["POST", "/api/arithmetic/generate"],
  ["POST", "/api/arithmetic/v2/generate"],
  ["POST", "/api/arithmetic/regenerate"],
  ["POST", "/api/arithmetic/v2/regenerate"],
  ["GET", "/api/library/documents"],
  ...["GET", "HEAD", "PUT", "POST", "PATCH", "DELETE"].map(
    (method): [string, string] => [method, "/api/library/documents/sheet-1"],
  ),
];

describe("메뉴 자리 · 제품", () => {
  it("«시험지 만들기» 바로 아래에 «연산대장», 수학 제품에 딸린다(옆 메뉴 순서)", () => {
    const ids = WORKSPACE_MENUS.map((m) => m.id);
    expect(ids.indexOf("arithmetic")).toBe(ids.indexOf("bank") + 1);
    expect(WORKSPACE_MENUS.find((m) => m.id === "arithmetic")?.label).toBe(
      "연산대장",
    );
    expect(workspaceMenuProduct("arithmetic")).toBe("math");
    expect(workspaceMenusOf("math")).toContain("arithmetic");
    expect(workspaceMenusOf("english")).not.toContain("arithmetic");
  });

  it("enum 과 배열의 현재 메뉴 순서가 같다(두 곳을 같이 고친다)", () => {
    expect(
      workspaceMenuSchema.options.filter((menu) => menu !== "english"),
    ).toEqual(ALL_WORKSPACE_MENUS);
    expect(workspaceMenuSchema.safeParse("arithmetic").success).toBe(true);
  });

  it("관리 화면의 수학 체크 칸에 «연산대장»이 권한 arithmetic 으로 선다", () => {
    const options = workspaceMenuOptionsOf("math", "branch-1");
    const index = options.findIndex((o) => o.permission === "arithmetic");
    expect(options[index]).toEqual({
      id: "arithmetic",
      label: "연산대장",
      permission: "arithmetic",
    });
    expect(options[index - 1]?.permission).toBe("bank");
    expect(
      workspaceMenuOptionsOf("english", null).some(
        (o) => o.permission === "arithmetic",
      ),
    ).toBe(false);
  });

  it("관리자 화면에서 메뉴를 전부 켜 저장할 수 있다(상한이 메뉴 수를 따라온다)", () => {
    const parsed = accountUpdateSchema.safeParse({
      menus: [...ALL_WORKSPACE_MENUS],
      expectedUpdatedAt: "2026-10-16T00:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.menus).toContain("arithmetic");
  });
});

describe("호환 — 꺼 둔 메뉴 목록에는 arithmetic 이 없었다", () => {
  it("아무 메뉴도 끄지 않은 계정 · 지점은 연산대장을 가진다", () => {
    expect(workspaceMenusFromDisabled([])).toContain("arithmetic");
    expect(workspaceMenusFromBranchDisabled([])).toContain("arithmetic");
  });

  it("«시험지 만들기»를 끈 지점 · 계정도 연산대장은 그대로다 — 더는 bank 에 딸리지 않는다", () => {
    expect(workspaceMenusFromDisabled(["bank"])).toContain("arithmetic");
    expect(workspaceMenusFromDisabled(["bank"])).not.toContain("bank");
    expect(workspaceMenusFromBranchDisabled(["bank"])).toContain("arithmetic");
  });

  it("«연산대장»을 끄면 그것만 빠진다", () => {
    const personal = workspaceMenusFromDisabled(["arithmetic"]);
    const branch = workspaceMenusFromBranchDisabled(["arithmetic"]);
    for (const menus of [personal, branch]) {
      expect(menus).not.toContain("arithmetic");
      expect(menus).toEqual(
        ALL_WORKSPACE_MENUS.filter((menu) => menu !== "arithmetic"),
      );
    }
  });

  it("개인 허용 목록은 연산대장이 있든 없든 그대로 저장할 수 있다", () => {
    expect(isPersonalMenuSelectionRepresentable(["arithmetic"])).toBe(true);
    expect(
      isPersonalMenuSelectionRepresentable(
        ALL_WORKSPACE_MENUS.filter((menu) => menu !== "arithmetic"),
      ),
    ).toBe(true);
    expect(isPersonalMenuSelectionRepresentable(["bank", "arithmetic"])).toBe(
      true,
    );
  });
});

describe("관문 — /api/arithmetic 과 연산 학습지 자료 경로는 «연산대장» 메뉴를 따른다", () => {
  it.each(ARITHMETIC_ROUTES)(
    "연산대장만 켠 계정은 %s %s 에 닿는다",
    (method, path) => {
      expect(accountRouteAllowed(only("arithmetic"), method, path)).toBe(true);
    },
  );

  it.each(ARITHMETIC_ROUTES)(
    "«시험지 만들기»만 켠 계정은 %s %s 를 못 연다",
    (method, path) => {
      expect(accountRouteAllowed(only("bank"), method, path)).toBe(false);
    },
  );

  it("연산대장을 끈 계정은 다른 메뉴가 다 켜져 있어도 연산 경로를 못 연다", () => {
    const limited = only(
      ...ALL_WORKSPACE_MENUS.filter((menu) => menu !== "arithmetic"),
    );
    for (const [method, path] of ARITHMETIC_ROUTES.filter(([, p]) =>
      p.startsWith("/api/arithmetic"),
    ))
      expect(accountRouteAllowed(limited, method, path)).toBe(false);
  });

  it("연산대장만 켠 계정은 시험지 만들기의 경로에 딸려 닿지 않는다", () => {
    const arithmetic = only("arithmetic");
    expect(accountRouteAllowed(arithmetic, "GET", "/api/problems")).toBe(false);
    expect(accountRouteAllowed(arithmetic, "GET", "/api/studio/problems")).toBe(
      false,
    );
    expect(
      accountRouteAllowed(arithmetic, "POST", "/api/problems/transform/adopt"),
    ).toBe(false);
    // 자료 경로는 정확한 모양만 — 다른 자료 API 는 보관함 메뉴들의 것이다.
    expect(
      accountRouteAllowed(arithmetic, "POST", "/api/library/documents"),
    ).toBe(false);
    expect(
      accountRouteAllowed(arithmetic, "GET", "/api/library/assets/a"),
    ).toBe(false);
  });

  it("승인 전 계정은 막는다", () => {
    expect(
      accountRouteAllowed(
        { ...only("arithmetic"), approvalStatus: "pending" },
        "GET",
        "/api/arithmetic/catalog",
      ),
    ).toBe(false);
  });
});
