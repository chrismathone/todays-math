import "server-only";
import type { Prisma } from "@prisma/client";
import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
import type { BranchSummary } from "@/contracts/branchAdmin.contract";

export const branchSummarySelect = {
  id: true,
  name: true,
  createdAt: true,
  disabledMenus: true,
  ownerDisabledMenus: true,
  menuRevision: true,
  _count: { select: { users: { where: { deletedAt: null } } } },
  users: {
    where: { branchRole: "owner", deletedAt: null },
    select: { id: true, name: true, email: true, suspendedAt: true },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.BranchSelect;

export function branchSummary(
  branch: Prisma.BranchGetPayload<{ select: typeof branchSummarySelect }>,
  pendingCount: number,
): BranchSummary {
  return {
    id: branch.id,
    name: branch.name,
    createdAt: branch.createdAt.toISOString(),
    menuRevision: branch.menuRevision,
    // Exact IDs, without personal legacy-English normalization or pilot rules.
    menus: ALL_WORKSPACE_MENUS.filter(
      (menu) => !branch.disabledMenus.includes(menu),
    ),
    pendingCount,
    _count: branch._count,
    users: branch.users.map((owner) => ({
      ...owner,
      suspendedAt: owner.suspendedAt?.toISOString() ?? null,
    })),
  };
}
