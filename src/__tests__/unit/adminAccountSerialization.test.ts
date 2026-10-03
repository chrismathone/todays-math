import { afterEach, describe, expect, it, vi } from "vitest";
import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";

vi.mock("server-only", () => ({}));

import { managedAccount, managedAccountSelect } from "@/lib/adminAccounts";
afterEach(() => vi.unstubAllEnvs());

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "김강사",
  email: "teacher@example.com",
  role: "director" as const,
  isAdmin: true,
  isSuperAdmin: true,
  branchId: "22222222-2222-4222-8222-222222222222",
  branchRole: "owner" as const,
  branch: { name: "서울 지점", disabledMenus: ["bank"], menuRevision: 3 },
  approvalStatus: "approved" as const,
  disabledMenus: ["studio"],
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-23T00:00:00.000Z"),
  suspendedAt: null,
  deletedAt: null,
};

describe("관리자 계정 응답", () => {
  it.each([null, row.branchId])(
    "serializes rollout restrictions independently of branch caps for branch %s",
    (branchId) => {
      vi.stubEnv("ENGLISH_LISTENING_TEACHER_IDS", "");
      vi.stubEnv("ENGLISH_LISTENING_ENABLED", "true");
      const account = managedAccount({
        ...row,
        isSuperAdmin: false,
        branchId,
        branch: branchId
          ? { ...row.branch, disabledMenus: ["english-listening"] }
          : null,
      });
      expect(account.unavailableMenus).toEqual(["english-listening"]);
      expect(account.configuredMenus).toContain("english-listening");
      expect(account.menus).not.toContain("english-listening");
      expect(account.branchMenus).toEqual(
        branchId
          ? ALL_WORKSPACE_MENUS.filter((menu) => menu !== "english-listening")
          : null,
      );
    },
  );
  it("does not mistake a personal listening denial for an independent rollout restriction", () => {
    vi.stubEnv("ENGLISH_LISTENING_ENABLED", "true");
    const account = managedAccount({
      ...row,
      disabledMenus: ["english-listening"],
    });
    expect(account.unavailableMenus).toEqual([]);
    expect(account.configuredMenus).not.toContain("english-listening");
    expect(account.menus).not.toContain("english-listening");
  });
  it("지점 내정보를 제공하며 비밀번호 필드는 조회하거나 직렬화하지 않는다", () => {
    expect(managedAccountSelect).not.toHaveProperty("passwordHash");
    const account = managedAccount({
      id: "11111111-1111-4111-8111-111111111111",
      name: "김강사",
      email: "teacher@example.com",
      role: "director",
      isAdmin: false,
      isSuperAdmin: false,
      branchId: "22222222-2222-4222-8222-222222222222",
      branchRole: "teacher",
      branch: { name: "서울 지점", disabledMenus: [], menuRevision: 1 },
      approvalStatus: "approved",
      disabledMenus: [],
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      updatedAt: new Date("2026-09-23T00:00:00.000Z"),
      suspendedAt: null,
      deletedAt: null,
    });
    expect(account.branchName).toBe("서울 지점");
    expect(JSON.stringify(account)).not.toMatch(/password|hash/i);
  });
  it("exposes configured policy, exact branch cap and pilot-filtered effective menus even for the highest admin", () => {
    vi.stubEnv("ENGLISH_LISTENING_ENABLED", "false");
    const account = managedAccount(row);
    expect(account.configuredMenus).toEqual(
      ALL_WORKSPACE_MENUS.filter((menu) => menu !== "studio"),
    );
    expect(account.branchMenus).toEqual(
      ALL_WORKSPACE_MENUS.filter((menu) => menu !== "bank"),
    );
    expect(account.branchMenuRevision).toBe(3);
    expect(account.menus).not.toContain("bank");
    expect(account.menus).not.toContain("studio");
    expect(account.menus).not.toContain("english-listening");
    expect(account.configuredMenus).toContain("english-listening");
  });
  it("returns null branch facts for unassigned accounts without changing personal configuration", () => {
    const account = managedAccount({ ...row, branchId: null, branch: null });
    expect(account.branchMenus).toBeNull();
    expect(account.branchMenuRevision).toBeNull();
    expect(account.menus).toContain("bank");
    expect(account.menus).not.toContain("studio");
  });
});
