import "server-only";
import type { Prisma } from "@prisma/client";
import {
  ALL_WORKSPACE_MENUS,
  type ManagedAccount,
} from "@/contracts/accountAccess.contract";

export const managedAccountSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isAdmin: true,
  approvalStatus: true,
  disabledMenus: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
export function managedAccount(
  user: Prisma.UserGetPayload<{ select: typeof managedAccountSelect }>,
): ManagedAccount {
  const { disabledMenus, createdAt, updatedAt, ...data } = user;
  return {
    ...data,
    menus: user.isAdmin
      ? ALL_WORKSPACE_MENUS
      : ALL_WORKSPACE_MENUS.filter((menu) => !disabledMenus.includes(menu)),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
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
