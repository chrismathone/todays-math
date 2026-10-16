import { afterEach, describe, expect, it, vi } from "vitest";
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
  it("declares only arithmetic-menu catalog/generation and document routes for arithmetic", () => {
    const bank = {
      ...account,
      menus: ["arithmetic"] as AccountAccess["menus"],
    };
    for (const [method, path] of [
      ["GET", "/api/arithmetic/catalog"],
      ["HEAD", "/api/arithmetic/catalog"],
      ["POST", "/api/arithmetic/generate"],
      ["GET", "/api/library/documents"],
      ...["GET", "HEAD", "PUT", "POST", "PATCH", "DELETE"].map((method) => [
        method,
        "/api/library/documents/sheet-1",
      ]),
    ])
      expect(accountRouteAllowed(bank, method!, path!)).toBe(true);
    for (const [method, path] of [
      ["POST", "/api/arithmetic/catalog"],
      ["GET", "/api/arithmetic/generate"],
      ["PUT", "/api/arithmetic/generate"],
      ["POST", "/api/arithmetic/unknown"],
      ["POST", "/api/library/documents"],
      ["GET", "/api/library/assets/a"],
      ["PUT", "/api/library/assets/a"],
      ["GET", "/api/library/documents/sheet-1/unknown"],
    ])
      expect(accountRouteAllowed(bank, method!, path!)).toBe(false);
    for (const menus of [
      [],
      ["library"],
      ["export"],
      ["studio"],
      // 2026-10-16 — 연산대장은 더는 «시험지 만들기»에 딸리지 않는다.
      ["bank"],
    ] as AccountAccess["menus"][])
      expect(
        accountRouteAllowed(
          { ...account, menus },
          "POST",
          "/api/arithmetic/generate",
        ),
      ).toBe(false);
    expect(
      accountRouteAllowed(
        { ...bank, approvalStatus: "pending" },
        "GET",
        "/api/arithmetic/catalog",
      ),
    ).toBe(false);
  });
  it.each(["/dev/unified", "/api/dev/unified/ai"])(
    "keeps privileged path %s admin-only",
    (path) => {
      expect(accountRouteAllowed(account, "GET", path)).toBe(false);
      expect(
        accountRouteAllowed(
          { ...account, isAdmin: true, isSuperAdmin: true },
          "GET",
          path,
        ),
      ).toBe(true);
    },
  );
  it("separates branch management from top-level administration", () => {
    const manager = { ...account, isAdmin: true };
    const superAdmin = { ...manager, isSuperAdmin: true };
    for (const path of ["/admin", "/api/admin/users", "/admin/math-srs"]) {
      expect(accountRouteAllowed(account, "GET", path)).toBe(false);
      expect(accountRouteAllowed(manager, "GET", path)).toBe(false);
      expect(accountRouteAllowed(superAdmin, "GET", path)).toBe(true);
    }
    expect(accountRouteAllowed(account, "GET", "/branch")).toBe(false);
    expect(accountRouteAllowed(manager, "GET", "/branch")).toBe(true);
    expect(accountRouteAllowed(superAdmin, "GET", "/branch")).toBe(true);
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
  it.each([false, true])(
    "keeps management reachable with zero menus, superadmin=%s",
    (isSuperAdmin) => {
      const manager = { ...account, isAdmin: true, isSuperAdmin, menus: [] };
      for (const path of [
        "/branch",
        "/api/branch/accounts",
        "/account",
        "/api/account/access",
        "/api/auth/signout",
        "/",
      ])
        expect(accountRouteAllowed(manager, "GET", path), path).toBe(true);
      for (const path of [
        "/admin/branches",
        "/api/admin/users",
        "/dev/unified",
        "/api/dev/unified/problems",
      ])
        expect(accountRouteAllowed(manager, "GET", path), path).toBe(
          isSuperAdmin,
        );
      for (const path of [
        "/api/problems",
        "/api/studio/ai",
        "/api/library/documents",
        "/api/tests",
        "/classes",
        "/api/english/exams",
        "/english/sets/set/print",
        "/concept-blank/print",
        "/api/new-feature",
      ])
        expect(accountRouteAllowed(manager, "GET", path), path).toBe(false);
      expect(accountRouteAllowed(manager, "GET", "/api/math-srs/course")).toBe(
        isSuperAdmin,
      );
    },
  );
  it("limits menu-disabled superadmin SRS access to the established management methods", () => {
    const paths = [
      ["GET", "/api/math-srs/course"],
      ["GET", "/api/students/student/math-srs/course"],
      ["POST", "/api/students/student/math-srs/course"],
      ["GET", "/api/students/student/math-srs/explorers"],
    ];
    for (const [method, path] of paths) {
      expect(
        accountRouteAllowed(
          { ...account, isAdmin: true, isSuperAdmin: true, menus: [] },
          method,
          path,
        ),
      ).toBe(true);
      expect(
        accountRouteAllowed(
          { ...account, isAdmin: true, isSuperAdmin: false, menus: [] },
          method,
          path,
        ),
      ).toBe(false);
      expect(
        accountRouteAllowed(
          {
            ...account,
            isSuperAdmin: true,
            menus: [],
            approvalStatus: "pending",
          },
          method,
          path,
        ),
      ).toBe(false);
    }
    for (const [method, path] of [
      ["POST", "/api/math-srs/course"],
      ["POST", "/api/students/student/math-srs/explorers"],
      ["DELETE", "/api/students/student/math-srs/course"],
      ["GET", "/api/math-srs/unrelated"],
    ]) {
      expect(
        accountRouteAllowed(
          { ...account, isSuperAdmin: true, menus: [] },
          method,
          path,
        ),
      ).toBe(false);
    }
  });
  /**
   * dev 빌드의 작업실 AI 는 구독 CLI 다리 `/api/dev/unified/ai` 로 간다(`studio-ai/endpoints.ts`).
   * 관리자만 열어 두면 관리자 아닌 계정의 상태판이 «연결 확인 중»에서 403 으로 멈춘다(2026-09-18 test_t 계정).
   * 운영의 `/api/studio/ai` 와 같은 기능이라 같은 메뉴(studio)로 연다 — **이 한 경로 · development 빌드만.**
   */
  describe("dev 작업실 AI 다리", () => {
    afterEach(() => vi.unstubAllEnvs());
    it("development 에서는 studio 메뉴가 있는 계정에 열린다", () => {
      vi.stubEnv("NODE_ENV", "development");
      for (const method of ["GET", "POST"])
        expect(
          accountRouteAllowed(account, method, "/api/dev/unified/ai"),
        ).toBe(true);
      expect(
        accountRouteAllowed(
          { ...account, menus: ["library"] },
          "GET",
          "/api/dev/unified/ai",
        ),
      ).toBe(false);
      expect(
        accountRouteAllowed(
          { ...account, approvalStatus: "pending" },
          "GET",
          "/api/dev/unified/ai",
        ),
      ).toBe(false);
    });
    it("development 에서도 나머지 dev 경로는 관리자만", () => {
      vi.stubEnv("NODE_ENV", "development");
      for (const path of [
        "/dev/unified",
        "/api/dev/unified/problems",
        "/api/dev/unified/overview",
        "/api/dev/unified/ai/extra",
      ])
        expect(accountRouteAllowed(account, "GET", path)).toBe(false);
    });
    it("운영 빌드에서는 관리자만 그대로", () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(accountRouteAllowed(account, "GET", "/api/dev/unified/ai")).toBe(
        false,
      );
    });
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
