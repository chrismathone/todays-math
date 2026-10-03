import "server-only";
import type { Prisma } from "@prisma/client";
import type { ManagedAccount } from "@/contracts/accountAccess.contract";
import { effectiveWorkspaceMenuPolicy } from "@/lib/workspaceMenuPolicy.server";

export const managedAccountSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isAdmin: true,
  isSuperAdmin: true,
  branchId: true,
  branchRole: true,
  branch: { select: { name: true, disabledMenus: true, menuRevision: true } },
  approvalStatus: true,
  disabledMenus: true,
  createdAt: true,
  updatedAt: true,
  suspendedAt: true,
  deletedAt: true,
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
    ...data
  } = user;
  return {
    ...data,
    branchName: branch?.name ?? null,
    ...effectiveWorkspaceMenuPolicy({ ...data, disabledMenus, branch }),
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
