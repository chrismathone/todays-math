import "server-only";
import { filterListeningPilotMenus } from "@/lib/listeningPilot";
import {
  workspaceMenuPolicy,
  type WorkspaceMenuPolicyAccount,
} from "@/lib/workspaceMenuPolicy";

/** Fresh DB projections only; no permission cache or role-based workspace grants. */
export function effectiveWorkspaceMenuPolicy(
  account: WorkspaceMenuPolicyAccount & { id: string; isSuperAdmin?: boolean },
) {
  const policy = workspaceMenuPolicy(account);
  return {
    ...policy,
    menus: filterListeningPilotMenus(
      account,
      policy.menus,
      account.disabledMenus,
    ),
  };
}
