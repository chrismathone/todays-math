import "server-only";
import type { WorkspaceMenu } from "@/contracts/accountAccess.contract";
import { workspaceMenusFromDisabled } from "@/contracts/accountAccess.contract";

type PilotAccount = { id: string; isSuperAdmin?: boolean };

/** Service administrators can run the initial pilot; other teachers are explicitly enrolled.
 * Kept outside the English runtime so authentication never imports teacher content. */
export function getListeningPilotAccess(account: PilotAccount) {
  const grantedUserIds = (process.env.ENGLISH_LISTENING_TEACHER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (account.isSuperAdmin === true) grantedUserIds.push(account.id);
  return {
    enabled: process.env.ENGLISH_LISTENING_ENABLED !== "false",
    grantedUserIds: [...new Set(grantedUserIds)],
  };
}

export function filterListeningPilotMenus(
  account: PilotAccount,
  menus: readonly WorkspaceMenu[],
  disabledMenus: readonly string[],
): WorkspaceMenu[] {
  const pilot = getListeningPilotAccess(account);
  const allowed =
    pilot.enabled &&
    pilot.grantedUserIds.includes(account.id) &&
    workspaceMenusFromDisabled(disabledMenus).includes("english-listening");
  return menus.filter((menu) => menu !== "english-listening" || allowed);
}

export function canAccessListeningPilot(
  account: PilotAccount & { approvalStatus: string },
  disabledMenus: readonly string[],
): boolean {
  return (
    account.approvalStatus === "approved" &&
    filterListeningPilotMenus(account, ["english-listening"], disabledMenus)
      .length > 0
  );
}
