import "server-only";
import type { Prisma } from "@prisma/client";
import type { ManagedAccount } from "@/contracts/accountAccess.contract";
import { effectiveWorkspaceMenuPolicy } from "@/lib/workspaceMenuPolicy.server";
import { accountSyncStatus, accountSyncSelect } from "./adminAccountSync";

export const managedAccountSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isAdmin: true,
  isSuperAdmin: true,
  branchId: true,
  branchRole: true,
  branch: {
    select: {
      name: true,
      disabledMenus: true,
      ownerDisabledMenus: true,
      menuRevision: true,
    },
  },
  eywaUserId: true,
  eywaManagedAccounts: {
    select: accountSyncSelect,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  },
  approvalStatus: true,
  disabledMenus: true,
  createdAt: true,
  updatedAt: true,
  suspendedAt: true,
  deletedAt: true,
  authSource: true,
} satisfies Prisma.UserSelect;
export function managedAccount(
  user: Prisma.UserGetPayload<{ select: typeof managedAccountSelect }>,
): ManagedAccount {
  const {
    disabledMenus,
    createdAt,
    updatedAt,
    suspendedAt,
    deletedAt,
    branch,
    eywaUserId,
    eywaManagedAccounts,
    authSource,
    ...data
  } = user;
  return {
    ...data,
    authSource: authSource === "eywa" ? "eywa" : "local",
    branchAssignmentLocked: (eywaManagedAccounts ?? []).some(
      (mapping) => mapping.currentUserId === user.id,
    ),
    branchName: branch?.name ?? null,
    ...effectiveWorkspaceMenuPolicy({ ...data, disabledMenus, branch }),
    eywaSync: accountSyncStatus({ ...user, eywaUserId, eywaManagedAccounts }),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    suspendedAt: suspendedAt?.toISOString() ?? null,
    deletedAt: deletedAt?.toISOString() ?? null,
  };
}
export function pagination(url: URL, defaultSize = 25) {
  const page = Math.max(
    1,
    Math.min(100000, Number(url.searchParams.get("page")) || 1),
  );
  const pageSize = Math.max(
    1,
    Math.min(100, Number(url.searchParams.get("pageSize")) || defaultSize),
  );
  return { page: Math.floor(page), pageSize: Math.floor(pageSize) };
}
