import { describe, expect, it } from "vitest";
import {
  accountUpdateSchema,
  ALL_WORKSPACE_MENUS,
  normalizeWorkspaceMenus,
  WORKSPACE_MENUS,
  workspaceMenuProduct,
  workspaceMenusFromDisabled,
  workspaceMenusOf,
  workspaceMenuSchema,
  type AccountAccess,
  type WorkspaceMenu,
} from "@/contracts/accountAccess.contract";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";

const englishMenus: WorkspaceMenu[] = [
  "english-school",
  "english-maker",
  "english-library",
];
const account: AccountAccess = {
  id: "u1",
  name: "원장",
  email: "director@example.test",
  role: "director",
  isAdmin: false,
  approvalStatus: "approved",
  menus: ALL_WORKSPACE_MENUS,
};

describe("English menu compatibility", () => {
  it("lists five sidebar menus while retaining the legacy input enum", () => {
    expect(
      WORKSPACE_MENUS.slice(-5).map(({ id, label }) => [id, label]),
    ).toEqual([
      ["english-school", "학교별 내신 대비"],
      ["english-maker", "문제 만들기"],
      ["english-library", "문제 보관함"],
      ["english-listening", "영어듣기"],
      ["english-bank", "자료은행"],
    ]);
    expect(
      workspaceMenuSchema.options.filter((menu) => menu !== "english"),
    ).toEqual(ALL_WORKSPACE_MENUS);
    // Ten since the textbook menu («교재 제작») joined the math product on 2026-10-03;
    // export는 저장값만 유지하고 표시 메뉴에서는 빠진다(2026-10-19).
    expect(workspaceMenusOf("math")).toHaveLength(10);
    expect(workspaceMenusOf("math")).toContain("textbook");
    expect(workspaceMenusOf("math")).toContain("arithmetic");
    expect(workspaceMenusOf("english")).toEqual([
      ...englishMenus,
      "english-listening",
      "english-bank",
    ]);
    expect(workspaceMenuProduct("english")).toBe("english");
  });
  it("expands legacy allows without granting unrelated permissions", () => {
    expect(
      normalizeWorkspaceMenus(["home", "english", "english-maker", "unknown"]),
    ).toEqual(["home", ...englishMenus]);
    expect(normalizeWorkspaceMenus(["english-maker"])).toEqual([
      "english-maker",
    ]);
    expect(normalizeWorkspaceMenus([])).toEqual([]);
  });
  it("preserves legacy denials and applies new denials independently", () => {
    expect(workspaceMenusFromDisabled(["english"])).toEqual(
      ALL_WORKSPACE_MENUS.filter((menu) => !menu.startsWith("english-")),
    );
    expect(workspaceMenusFromDisabled(["english", "english-school"])).toEqual(
      ALL_WORKSPACE_MENUS.filter((menu) => !menu.startsWith("english-")),
    );
    expect(workspaceMenusFromDisabled(["english-maker"])).toEqual(
      ALL_WORKSPACE_MENUS.filter((menu) => menu !== "english-maker"),
    );
    expect(workspaceMenusFromDisabled([])).toEqual(ALL_WORKSPACE_MENUS);
  });
  it("accepts all current grants and canonicalizes old admin payloads", () => {
    const version = { expectedUpdatedAt: "2026-09-30T00:00:00.000Z" };
    expect(
      accountUpdateSchema.parse({ ...version, menus: ALL_WORKSPACE_MENUS })
        .menus,
    ).toEqual(ALL_WORKSPACE_MENUS);
    expect(
      accountUpdateSchema.parse({ ...version, menus: ["english"] }).menus,
    ).toEqual(englishMenus);
    expect(
      accountUpdateSchema.parse({
        ...version,
        menus: ["english-school", "english-library"],
      }).menus,
    ).toEqual(["english-school", "english-library"]);
    expect(
      accountUpdateSchema.safeParse({
        ...version,
        menus: ["english", "english"],
      }).success,
    ).toBe(false);
  });
});

const routes: [string, string, WorkspaceMenu[]][] = [
  ["GET", "/api/english/exams", englishMenus],
  ["POST", "/api/english/exams", ["english-school"]],
  ["PATCH", "/api/english/exams/exam", ["english-school"]],
  ["DELETE", "/api/english/exams/exam", ["english-school"]],
  [
    "GET",
    "/api/english/exams/exam/materials",
    ["english-school", "english-maker"],
  ],
  ["POST", "/api/english/exams/exam/materials", ["english-school"]],
  [
    "GET",
    "/api/english/materials/material",
    ["english-school", "english-maker"],
  ],
  ["DELETE", "/api/english/materials/material", ["english-school"]],
  // 사진 자료에서 글 읽기(D-158) — 사진이 외부 모델로 나간다. 자료를 다루는 메뉴만
  ["POST", "/api/english/materials/material/read", ["english-school"]],
  ["GET", "/api/english/exams/exam/sets", englishMenus],
  ["POST", "/api/english/exams/exam/sets", ["english-maker"]],
  ["POST", "/api/english/generate", ["english-maker"]],
  ["GET", "/api/english/sets/set", ["english-library"]],
  ["PUT", "/api/english/sets/set", ["english-library"]],
  ["DELETE", "/api/english/sets/set", ["english-library"]],
  ["GET", "/english/sets/set/print", ["english-library"]],
  ["HEAD", "/english/sets/set/print", ["english-library"]],
];
describe("English route permissions", () => {
  it("keeps the resource bank separate from legacy English grants", () => {
    const bankAccount = {
      ...account,
      menus: ["english-bank"] as WorkspaceMenu[],
    };
    for (const [method, path] of [
      ["GET", "/api/english/passages"],
      ["POST", "/api/english/passages"],
      ["POST", "/api/english/passages/import"],
      ["GET", "/api/english/passages/id"],
      ["PATCH", "/api/english/passages/id"],
      ["DELETE", "/api/english/passages/id"],
      ["GET", "/api/english/passages/id/sets"],
      ["POST", "/api/english/passages/id/rights"],
    ]) {
      expect(accountRouteAllowed(bankAccount, method!, path!)).toBe(true);
      expect(
        accountRouteAllowed({ ...account, menus: ["english"] }, method!, path!),
      ).toBe(false);
    }
    const prepare = "/api/english/passages/id/prepare";
    expect(accountRouteAllowed(bankAccount, "POST", prepare)).toBe(false);
    expect(
      accountRouteAllowed(
        { ...bankAccount, menus: ["english-bank", "english-maker"] },
        "POST",
        prepare,
      ),
    ).toBe(true);
    for (const endpoint of ["bank", "references"]) {
      const path = `/api/english/listening/${endpoint}`;
      // Since 2026-10-04 (2de110c7e) bank material work is authorized by the bank menu alone;
      // the listening menu is for assignments and does not open the bank by itself.
      expect(
        accountRouteAllowed(
          { ...account, menus: ["english-bank"] },
          "GET",
          path,
        ),
      ).toBe(true);
      expect(
        accountRouteAllowed(
          { ...account, menus: ["english-listening"] },
          "GET",
          path,
        ),
      ).toBe(false);
      expect(
        accountRouteAllowed(
          { ...account, menus: ["english-bank", "english-listening"] },
          "GET",
          path,
        ),
      ).toBe(true);
      expect(accountRouteAllowed(account, "POST", path)).toBe(false);
    }
    expect(
      accountRouteAllowed(
        bankAccount,
        "GET",
        "/api/english/passages/id/future",
      ),
    ).toBe(false);
    expect(accountRouteAllowed(bankAccount, "GET", "/api/english/exams")).toBe(
      false,
    );
  });
  it.each(routes)(
    "%s %s requires the matching grant",
    (method, path, permitted) => {
      for (const menu of englishMenus) {
        expect(
          accountRouteAllowed({ ...account, menus: [menu] }, method, path),
        ).toBe(permitted.includes(menu));
      }
      expect(
        accountRouteAllowed({ ...account, menus: ["english"] }, method, path),
      ).toBe(true);
      expect(
        accountRouteAllowed(
          { ...account, menus: workspaceMenusOf("math") },
          method,
          path,
        ),
      ).toBe(false);
      expect(
        accountRouteAllowed(
          { ...account, approvalStatus: "pending" },
          method,
          path,
        ),
      ).toBe(false);
    },
  );
  it.each([
    ["GET", "/api/english/generate"],
    ["POST", "/english/sets/set/print"],
    ["POST", "/api/english/sets/set"],
    ["GET", "/api/english/future"],
    ["GET", "/api/englishx"],
    ["GET", "/api/classes"],
  ])("does not widen legacy access to %s %s", (method, path) => {
    expect(
      accountRouteAllowed({ ...account, menus: ["english"] }, method, path),
    ).toBe(false);
  });
});
