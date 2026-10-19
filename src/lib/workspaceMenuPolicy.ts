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
    /** 지점 원장이 상한 안에서 끈 메뉴(2026-10-19) — 없으면 상한 그대로 */
    ownerDisabledMenus?: readonly string[];
    menuRevision: number;
  } | null;
};

/** Pure personal/branch intersection. Branch = super-admin ceiling minus the owner's choices. A missing assigned branch fails closed. */
export function workspaceMenuPolicy(account: WorkspaceMenuPolicyAccount): {
  configuredMenus: WorkspaceMenu[];
  branchMenus: WorkspaceMenu[] | null;
  branchMenuRevision: number | null;
  menus: WorkspaceMenu[];
} {
  const configuredMenus = workspaceMenusFromDisabled(account.disabledMenus);
  const branchMenus = account.branchId
    ? account.branch
      ? workspaceMenusFromBranchDisabled([
          ...account.branch.disabledMenus,
          ...(account.branch.ownerDisabledMenus ?? []),
        ])
      : []
    : null;
  return {
    configuredMenus,
    branchMenus,
    branchMenuRevision: account.branchId
      ? (account.branch?.menuRevision ?? null)
      : null,
    menus: configuredMenus.filter(
      (menu) => branchMenus === null || branchMenus.includes(menu),
    ),
  };
}
