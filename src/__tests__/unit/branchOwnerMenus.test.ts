import { describe, expect, it, vi } from "vitest";
import {
  branchOwnerMenuItems,
  branchOwnerMenusOn,
  branchOwnerMenusUpdateSchema,
  nextOwnerDisabled,
} from "@/contracts/branchOwnerMenus.contract";
import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
import { workspaceMenuPolicy } from "@/lib/workspaceMenuPolicy";

vi.mock("server-only", () => ({}));
const branchId = "20000000-0000-4000-8000-000000000002";

describe("지점 원장 사용 메뉴 — 상한 안에서만", () => {
  it("상한이 닫은 메뉴는 열림 false · 사용 false, 원장이 끈 메뉴는 열림 true · 사용 false", () => {
    const items = branchOwnerMenuItems(["textbook"], ["bank"], branchId);
    expect(items.map((i) => i.menu)).toEqual(
      ALL_WORKSPACE_MENUS.filter((menu) => menu !== "export"),
    );
    // «시험지 · 내보내기»는 고르지 않는다 — 원장이 보낸 값에 있어도 지난 값 그대로
    expect(nextOwnerDisabled([], ["export"], ["export"])).toContain("export");
    expect(nextOwnerDisabled([], [], [])).not.toContain("export");
    expect(items.find((i) => i.menu === "textbook")).toMatchObject({
      open: false,
      on: false,
      product: "math",
    });
    expect(items.find((i) => i.menu === "bank")).toMatchObject({
      open: true,
      on: false,
    });
    expect(items.find((i) => i.menu === "library")?.label).toBe(
      "우리학원 시험지",
    );
    expect(items.find((i) => i.menu === "english-bank")).toMatchObject({
      product: "english",
      on: true,
    });
  });

  it("열리지 않은 메뉴를 켜려 하면 거절한다", () => {
    expect(nextOwnerDisabled(["textbook"], [], ["textbook"])).toBeNull();
  });

  it("닫힌 메뉴에 대한 지난 선택은 보존하고, 열린 메뉴는 고른 대로", () => {
    const next = nextOwnerDisabled(
      ["textbook", "srs"],
      ["srs"],
      ["home", "bank"],
    );
    expect(next).toContain("srs"); // 원장이 끈 채로 닫혔던 메뉴 — 다시 열려도 꺼진 채
    expect(next).not.toContain("textbook"); // 원장이 켠 채로 닫힌 메뉴 — 다시 열리면 켜진다
    expect(next).not.toContain("home");
    expect(next).toContain("studio");
    expect(branchOwnerMenusOn(["textbook", "srs"], next!)).toEqual([
      "home",
      "bank",
    ]);
    // 최고관리자가 다시 열면
    expect(branchOwnerMenusOn([], next!)).toEqual(["home", "bank", "textbook"]);
  });

  it("요청 형식은 현재 메뉴 id · 중복 없음 · 판 번호", () => {
    expect(
      branchOwnerMenusUpdateSchema.safeParse({
        menus: ["bank"],
        expectedMenuRevision: 2,
      }).success,
    ).toBe(true);
    expect(
      branchOwnerMenusUpdateSchema.safeParse({
        menus: ["english"],
        expectedMenuRevision: 2,
      }).success,
    ).toBe(false);
    expect(
      branchOwnerMenusUpdateSchema.safeParse({
        menus: ["bank", "bank"],
        expectedMenuRevision: 2,
      }).success,
    ).toBe(false);
    expect(branchOwnerMenusUpdateSchema.safeParse({ menus: [] }).success).toBe(
      false,
    );
  });

  it("지점 전원의 메뉴 = 상한 − 원장이 끈 것 → 개인 설정과 교집합(원장 본인 포함)", () => {
    const policy = workspaceMenuPolicy({
      branchId,
      disabledMenus: ["studio"],
      branch: {
        disabledMenus: ["textbook"],
        ownerDisabledMenus: ["bank"],
        menuRevision: 4,
      },
    });
    expect(policy.branchMenus).not.toContain("bank");
    expect(policy.branchMenus).not.toContain("textbook");
    expect(policy.menus).not.toContain("studio");
    expect(policy.menus).toContain("home");
    // 원장이 끈 칸이 없는 옛 읽기도 상한 그대로
    expect(
      workspaceMenuPolicy({
        branchId,
        disabledMenus: [],
        branch: { disabledMenus: [], menuRevision: 1 },
      }).menus,
    ).toEqual(ALL_WORKSPACE_MENUS);
  });
});
