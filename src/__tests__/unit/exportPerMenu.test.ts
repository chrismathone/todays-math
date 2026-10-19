// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALL_WORKSPACE_MENUS,
  WORKSPACE_SELECTABLE_MENUS,
  canOutputFrom,
  countWorkspaceMenus,
  normalizeWorkspaceMenus,
  workspaceMenuInSidebar,
  workspaceMenuOptionsOf,
  workspaceMenuSchema,
  type AccountAccess,
  type WorkspaceMenu,
  type WorkspaceOutputSource,
} from "@/contracts/accountAccess.contract";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";

const sources: WorkspaceOutputSource[] = [
  "bank",
  "arithmetic",
  "studio",
  "library",
  "textbook",
  "conceptBlank",
];
const account = (menus: WorkspaceMenu[]): AccountAccess => ({
  id: "teacher",
  name: "교사",
  email: "teacher@example.test",
  role: "director",
  isAdmin: false,
  approvalStatus: "approved",
  menus,
});

describe("메뉴별 출력 계약", () => {
  it.each(sources)(
    "%s는 자기 출력과 공용 출력만 열고 export 값을 요구하지 않는다",
    (source) => {
      expect(canOutputFrom([source])).toBe(true);
      for (const requested of sources)
        expect(canOutputFrom([source, "export"], requested)).toBe(
          requested === source,
        );
    },
  );

  it("공유 DB 감사에서 export만 가진 계정은 0개 — 저장값만 보존하고 권한을 만들지 않는다", () => {
    expect(workspaceMenuSchema.parse("export")).toBe("export");
    expect(normalizeWorkspaceMenus(["export"])).toEqual(["export"]);
    expect(ALL_WORKSPACE_MENUS).toContain("export");
    for (const menus of [
      [],
      ["export"],
      ["home", "teaching", "srs", "concept"],
    ] as WorkspaceMenu[][]) {
      expect(canOutputFrom(menus)).toBe(false);
      for (const source of sources)
        expect(canOutputFrom(menus, source)).toBe(false);
    }
  });

  it("관리 선택·옆 메뉴·사용 메뉴 수에 export를 세지 않는다", () => {
    expect(WORKSPACE_SELECTABLE_MENUS.map(({ id }) => id)).not.toContain(
      "export",
    );
    for (const product of ["math", "english"] as const)
      expect(
        workspaceMenuOptionsOf(product).some(
          ({ permission }) => permission === "export",
        ),
      ).toBe(false);
    expect(workspaceMenuInSidebar("export")).toBe(false);
    expect(workspaceMenuInSidebar("bank")).toBe(true);
    expect(countWorkspaceMenus(["export"])).toBe(0);
    expect(countWorkspaceMenus(["bank", "bank", "export", "arithmetic"])).toBe(
      2,
    );
  });

  it("다른 메뉴의 전용 출력 경로는 그 메뉴 없이 열리지 않는다", () => {
    const dedicated: [WorkspaceMenu, string, string][] = [
      ["arithmetic", "POST", "/api/arithmetic/generate"],
      ["arithmetic", "POST", "/api/arithmetic/v2/generate"],
      ["textbook", "GET", "/textbook/book/print"],
      ["textbook", "POST", "/api/textbook/book/export"],
      ["conceptBlank", "GET", "/concept-blank/print"],
      ["english-library", "GET", "/english/sets/set/print"],
      ["english-listening", "GET", "/english/listening/sets/set/print"],
    ];
    for (const [required, method, route] of dedicated)
      for (const menu of [
        ...sources,
        "export",
        "english-library",
        "english-listening",
      ] as WorkspaceMenu[])
        expect(
          accountRouteAllowed(account([menu]), method, route),
          `${menu}: ${route}`,
        ).toBe(menu === required);
    expect(
      accountRouteAllowed(
        account(["arithmetic"]),
        "GET",
        "/api/library/assets/file",
      ),
    ).toBe(false);
    expect(
      accountRouteAllowed(
        account(["arithmetic"]),
        "POST",
        "/api/studio/ai/generate",
      ),
    ).toBe(false);
  });
});

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? routeFiles(full)
      : entry.name === "route.ts"
        ? [full]
        : [];
  });
}

describe("공용 출력 API 전수 관문", () => {
  const apiRoot = path.join(process.cwd(), "src/app/api");
  const routes = [
    "exports",
    "studio/print-presets",
    "tests",
    "basket",
    "exam",
    "exam-publications",
    "exam-reports",
    "predictions",
  ]
    .flatMap((base) => routeFiles(path.join(apiRoot, base)))
    .flatMap((file) => {
      const route =
        `/api/${path.relative(apiRoot, path.dirname(file)).replaceAll(path.sep, "/")}`.replace(
          /\[[^\]]+\]/g,
          "item",
        );
      const methods = [
        ...readFileSync(file, "utf8").matchAll(
          /export\s+(?:async\s+function|const|function)\s+(GET|HEAD|POST|PUT|PATCH|DELETE)\b/g,
        ),
      ].map((match) => match[1]!);
      return methods.map((method) => [method, route] as const);
    });

  it("현재 출력 라우트를 실제 파일에서 모으며 비어 있는 전수 시험을 허용하지 않는다", () => {
    expect(routes.length).toBeGreaterThan(40);
    expect(routes).toContainEqual(["POST", "/api/exports/pdf"]);
    expect(routes).toContainEqual(["GET", "/api/studio/print-presets"]);
  });

  it.each(routes)(
    "%s %s는 각 출력 메뉴에서 열리고 메뉴 없는 계정·export 단독은 거절한다",
    (method, route) => {
      for (const source of sources)
        expect(
          accountRouteAllowed(account([source]), method, route),
          source,
        ).toBe(true);
      for (const menus of [
        [],
        ["export"],
        ["home", "teaching"],
      ] as WorkspaceMenu[][])
        expect(accountRouteAllowed(account(menus), method, route)).toBe(false);
      expect(
        accountRouteAllowed(
          { ...account(sources), approvalStatus: "pending" },
          method,
          route,
        ),
      ).toBe(false);
    },
  );

  it("PDF/HWPX 외 경로나 다른 메서드를 미리 열지 않는다", () => {
    for (const route of ["/api/exports/unknown", "/api/exports/pdf/extra"])
      expect(accountRouteAllowed(account(sources), "POST", route)).toBe(false);
    expect(
      accountRouteAllowed(account(sources), "GET", "/api/exports/pdf"),
    ).toBe(false);
  });
});
