import "server-only";
import type { WorkspaceMenu } from "@/contracts/accountAccess.contract";
import { workspaceMenusFromDisabled } from "@/contracts/accountAccess.contract";

type ListeningAccount = { id: string; isSuperAdmin?: boolean };

/** English listening is an ordinary workspace menu: administrators switch it per account and per
 * branch in the admin console, and those stored menus are the only grant. There is no enrolment
 * list — `ENGLISH_LISTENING_TEACHER_IDS` is not read. What stays here is the service-wide switch.
 * Kept outside the English runtime so authentication never imports teacher content. */
export function listeningServiceEnabled(): boolean {
  return process.env.ENGLISH_LISTENING_ENABLED !== "false";
}

/** The account no longer decides anything; the parameter stays for the existing callers. */
export function filterListeningPilotMenus(
  _account: ListeningAccount,
  menus: readonly WorkspaceMenu[],
  disabledMenus: readonly string[],
): WorkspaceMenu[] {
  const allowed =
    listeningServiceEnabled() &&
    workspaceMenusFromDisabled(disabledMenus).includes("english-listening");
  return menus.filter((menu) => menu !== "english-listening" || allowed);
}

export function canAccessListeningPilot(
  account: ListeningAccount & { approvalStatus: string },
  disabledMenus: readonly string[],
): boolean {
  return (
    account.approvalStatus === "approved" &&
    filterListeningPilotMenus(account, ["english-listening"], disabledMenus)
      .length > 0
  );
}
