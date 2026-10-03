import "server-only";
import type { WorkspaceMenu } from "@/contracts/accountAccess.contract";
import { getListeningPilotAccess } from "@/lib/listeningPilot";
import {
  workspaceMenuPolicy,
  type WorkspaceMenuPolicyAccount,
} from "@/lib/workspaceMenuPolicy";

/** Fresh DB projections only; no permission cache or role-based workspace grants. */
export function effectiveWorkspaceMenuPolicy(
  account: WorkspaceMenuPolicyAccount & { id: string; isSuperAdmin?: boolean },
) {
  const policy = workspaceMenuPolicy(account);
  const pilot = getListeningPilotAccess(account);
  const unavailableMenus: WorkspaceMenu[] =
    pilot.enabled && pilot.grantedUserIds.includes(account.id)
      ? []
      : ["english-listening"];
  return {
    ...policy,
    unavailableMenus,
    menus: policy.menus.filter((menu) => !unavailableMenus.includes(menu)),
  };
}
