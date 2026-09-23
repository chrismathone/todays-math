import type {
  AdminAccountsResponse,
  ManagedAccount,
} from "@/contracts/accountAccess.contract";

export const adminIdentity = {
  name: "관리 선생님",
  email: "admin@example.com",
};
export const pendingAccount: ManagedAccount = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "김하늘",
  email: "haneul@example.com",
  role: "director",
  isAdmin: false,
  approvalStatus: "pending",
  menus: ["home", "bank"],
  createdAt: "2026-09-10T10:00:00.000Z",
  updatedAt: "2026-09-10T10:00:00.000Z",
  suspendedAt: null,
  deletedAt: null,
};
export const approvedAccount: ManagedAccount = {
  ...pendingAccount,
  id: "22222222-2222-4222-8222-222222222222",
  name: "박지우",
  email: "jiwoo@example.com",
  approvalStatus: "approved",
  menus: ["home", "bank", "studio"],
};
export const adminAccount: ManagedAccount = {
  ...pendingAccount,
  id: "33333333-3333-4333-8333-333333333333",
  ...adminIdentity,
  isAdmin: true,
  isSuperAdmin: true,
  approvalStatus: "approved",
  menus: ["home", "bank", "studio", "export", "library", "teaching"],
};
export const rejectedAccount: ManagedAccount = {
  ...pendingAccount,
  id: "44444444-4444-4444-8444-444444444444",
  name: "이서연",
  email: "seoyeon@example.com",
  approvalStatus: "rejected",
  menus: [],
};
export function accountsResponse(
  data: ManagedAccount[] = [
    pendingAccount,
    approvedAccount,
    adminAccount,
    rejectedAccount,
  ],
  overrides: Partial<AdminAccountsResponse["meta"]> = {},
): AdminAccountsResponse {
  return {
    data,
    meta: {
      page: 1,
      pageSize: 25,
      total: data.length,
      counts: { all: 4, pending: 1, approved: 2, rejected: 1 },
      ...overrides,
    },
  };
}
