/**
 * «개념 백지» 메뉴(D-150 · 26 §4) — 자리 · 제품 · 메뉴 권한 상한 · 관문 · 계정 권한 화면의 체크 칸.
 *
 * 메뉴 권한은 다른 메뉴와 같은 길이다: 세션의 `menus` = 전체 메뉴 − `disabledMenus`(`src/lib/auth.ts`)
 * → 화면은 `allowedMenus` 로 거르고, 관문(`accountRouteAllowed`)이 인쇄 페이지 `/concept-blank/print` 를 막는다.
 * 인쇄 페이지는 `/api` 밖이라 기본 통과인데, 이 메뉴에 묶어야 메뉴를 끈 계정이 못 연다(영어 인쇄 페이지와 같은 까닭).
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminAccounts from "@/components/admin/AdminAccounts";
import {
  accountUpdateSchema,
  ALL_WORKSPACE_MENUS,
  WORKSPACE_MENUS,
  workspaceMenuProduct,
  workspaceMenuSchema,
  type AccountAccess,
} from "@/contracts/accountAccess.contract";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import {
  accountsResponse,
  adminIdentity,
  pendingAccount,
} from "./adminFixtures";

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
  it("«오늘의 개념» 바로 아래에 «개념 백지», 수학 제품에 딸린다", () => {
    const ids = WORKSPACE_MENUS.map((m) => m.id);
    expect(ids.indexOf("conceptBlank")).toBe(ids.indexOf("concept") + 1);
    expect(WORKSPACE_MENUS.find((m) => m.id === "conceptBlank")?.label).toBe(
      "개념 백지",
    );
    expect(workspaceMenuProduct("conceptBlank")).toBe("math");
  });

  it("enum 과 배열의 현재 메뉴 순서가 같고, 이전 english 키도 읽는다", () => {
    expect(
      workspaceMenuSchema.options.filter((menu) => menu !== "english"),
    ).toEqual(ALL_WORKSPACE_MENUS);
    expect(workspaceMenuSchema.safeParse("english").success).toBe(true);
    expect(workspaceMenuSchema.safeParse("conceptBlank").success).toBe(true);
  });

  it("관리자 화면에서 메뉴를 전부 켜 저장할 수 있다(상한이 메뉴 수를 따라온다)", () => {
    const parsed = accountUpdateSchema.safeParse({
      menus: [...ALL_WORKSPACE_MENUS],
      expectedUpdatedAt: "2026-09-30T00:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
    expect(ALL_WORKSPACE_MENUS).toContain("conceptBlank");
  });
});

describe("관문 — /concept-blank 는 «개념 백지» 메뉴를 따른다", () => {
  it.each([
    "/concept-blank",
    "/concept-blank/print",
    "/concept-blank/print?s=abc&view=both",
  ])("메뉴가 켜진 계정은 %s 에 닿는다", (path) => {
    expect(accountRouteAllowed(account, "GET", path.split("?")[0]!)).toBe(true);
  });

  it("메뉴를 끈 계정은 인쇄 페이지를 막는다 — 다른 메뉴가 다 켜져 있어도", () => {
    const limited = {
      ...account,
      menus: ALL_WORKSPACE_MENUS.filter((m) => m !== "conceptBlank"),
    };
    expect(accountRouteAllowed(limited, "GET", "/concept-blank/print")).toBe(
      false,
    );
    expect(accountRouteAllowed(limited, "GET", "/concept-blank")).toBe(false);
  });

  it("«오늘의 개념»만 켠 계정도 개념 백지 인쇄는 막는다 — 두 메뉴는 따로다", () => {
    const conceptOnly = {
      ...account,
      menus: ["concept"] as AccountAccess["menus"],
    };
    expect(
      accountRouteAllowed(conceptOnly, "GET", "/concept-blank/print"),
    ).toBe(false);
    const blankOnly = {
      ...account,
      menus: ["conceptBlank"] as AccountAccess["menus"],
    };
    expect(accountRouteAllowed(blankOnly, "GET", "/concept-blank/print")).toBe(
      true,
    );
    // 개념 백지는 API 가 없다 — 오늘의 개념 API 가 딸려 열리지 않는다
    expect(accountRouteAllowed(blankOnly, "GET", "/api/concept")).toBe(false);
  });

  it("승인 전 계정은 막는다", () => {
    expect(
      accountRouteAllowed(
        { ...account, approvalStatus: "pending" },
        "GET",
        "/concept-blank/print",
      ),
    ).toBe(false);
  });

  it("비슷한 이름의 다른 경로는 이 규칙에 딸려 열리지 않는다", () => {
    const limited = {
      ...account,
      menus: ALL_WORKSPACE_MENUS.filter((m) => m !== "conceptBlank"),
    };
    // `/concept-blankx` 는 이 메뉴의 경로가 아니다 — 메뉴를 꺼도 막히지 않는다(기본 통과 그대로)
    expect(accountRouteAllowed(limited, "GET", "/concept-blankx")).toBe(true);
  });
});

describe("계정 권한 화면", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(json(accountsResponse()));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("«개념 백지» 체크 칸이 «오늘의 개념» 다음에 서고, 켜서 저장할 수 있다", async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "PATCH"
        ? json({
            data: {
              ...pendingAccount,
              menus: ["home", "bank", "conceptBlank"],
              updatedAt: "2026-09-30T10:00:00.000Z",
            },
          })
        : json(accountsResponse()),
    );
    render(<AdminAccounts identity={adminIdentity} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "김하늘 계정 검토" }),
    );
    const labels = screen
      .getAllByRole("checkbox")
      .map((box) => box.closest("label")?.textContent ?? "");
    expect(labels.indexOf("개념 백지")).toBe(labels.indexOf("오늘의 개념") + 1);
    const box = screen.getByLabelText("개념 백지");
    expect(box).not.toBeChecked();
    fireEvent.click(box);
    expect(box).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
    await screen.findByText("사용 가능한 메뉴를 저장했습니다.");
    const patch = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "PATCH",
    )!;
    expect(JSON.parse(String(patch[1]?.body)).menus).toEqual([
      "home",
      "bank",
      "conceptBlank",
    ]);
  });
});
