import type { ScopeViewer } from "@/lib/ownerScope";

/** Login accounts require branch administration; roster access grants no issuance rights. */
export function canManageStudentAccounts(viewer: ScopeViewer): boolean {
  if (viewer.isSuperAdmin === true) return true;
  if (!viewer.branchId) return false;
  // The session refreshes this flag from the DB; a legacy teacher label cannot revoke it.
  return (
    viewer.isAdmin === true ||
    viewer.branchRole === "owner" ||
    viewer.branchRole === "manager"
  );
}

export function studentAccountBranchAllowed(
  viewer: ScopeViewer,
  branchId: string | null | undefined,
): boolean {
  return (
    canManageStudentAccounts(viewer) &&
    (viewer.isSuperAdmin === true ||
      (!!branchId && viewer.branchId === branchId))
  );
}

/** Preserve branch scoping when a manager/owner has no legacy isAdmin flag. */
export function studentAccountViewer(viewer: ScopeViewer): ScopeViewer {
  return canManageStudentAccounts(viewer)
    ? { ...viewer, isAdmin: true }
    : viewer;
}
