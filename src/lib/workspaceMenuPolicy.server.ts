import "server-only";
import type { WorkspaceMenu } from "@/contracts/accountAccess.contract";
import { listeningServiceEnabled } from "@/lib/listeningPilot";
import {
  workspaceMenuPolicy,
  type WorkspaceMenuPolicyAccount,
} from "@/lib/workspaceMenuPolicy";

/** Fresh DB projections only; no permission cache or role-based workspace grants.
 * `unavailableMenus` is what the service switches off for everyone — never a per-account rule. */
export function effectiveWorkspaceMenuPolicy(
  account: WorkspaceMenuPolicyAccount & { id: string; isSuperAdmin?: boolean },
) {
  const policy = workspaceMenuPolicy(account);
  const unavailableMenus: WorkspaceMenu[] = listeningServiceEnabled()
    ? []
    : ["english-listening"];
  return {
    ...policy,
    unavailableMenus,
    menus: policy.menus.filter((menu) => !unavailableMenus.includes(menu)),
  };
}
