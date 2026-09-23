import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { managedAccount, managedAccountSelect } from "@/lib/adminAccounts";

describe("관리자 계정 응답", () => {
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
      branch: { name: "서울 지점" },
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
});
