import {
  workspaceMenusFromBranchDisabled,
  workspaceMenusFromDisabled,
  type WorkspaceMenu,
} from "@/contracts/accountAccess.contract";

export type WorkspaceMenuPolicyAccount = {
  disabledMenus: readonly string[];
  branchId?: string | null;
  branch?: {
    disabledMenus: readonly string[];
    menuRevision: number;
  } | null;
};

/** Pure personal/branch intersection. A missing assigned branch fails closed. */
export function workspaceMenuPolicy(account: WorkspaceMenuPolicyAccount): {
  configuredMenus: WorkspaceMenu[];
  branchMenus: WorkspaceMenu[] | null;
  branchMenuRevision: number | null;
  menus: WorkspaceMenu[];
} {
  const configuredMenus = workspaceMenusFromDisabled(account.disabledMenus);
  const branchMenus = account.branchId
    ? account.branch
      ? workspaceMenusFromBranchDisabled(account.branch.disabledMenus)
      : []
    : null;
  return {
    configuredMenus,
    branchMenus,
    branchMenuRevision: account.branchId
      ? account.branch?.menuRevision ?? null
      : null,
    menus: configuredMenus.filter(
      (menu) => branchMenus === null || branchMenus.includes(menu),
    ),
  };
}
