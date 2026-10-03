import type { EywaBinding, EywaManagedAccount, User } from "@prisma/client";
import {
  controlLeaseExpiresAt,
  normalizeEmail,
  normalizeName,
  sha256,
  type Control,
  type ControlUser,
} from "./sync-contract";

export class EywaAccessError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "EywaAccessError";
  }
}
export function controlOrderError(
  binding: Pick<
    EywaBinding,
    "sourceEpoch" | "securityRevision" | "tenantRevocationGeneration"
  >,
  control: Control,
) {
  if (binding.sourceEpoch && binding.sourceEpoch !== control.sourceEpoch)
    return "source_epoch_changed";
  if (
    BigInt(control.securityRevision) < binding.securityRevision ||
    BigInt(control.tenantRevocationGeneration) <
      binding.tenantRevocationGeneration
  )
    return "source_rebaseline_required";
  return null;
}
export function managedBlockReasons(
  control: Control,
  source: ControlUser | undefined,
) {
  const reasons: string[] = [];
  if (!control.enabled) reasons.push("tenant_disabled");
  if (!control.healthy) reasons.push("source_unhealthy");
  if (!source) reasons.push("source_removed");
  else if (!source.eligible)
    reasons.push(
      ...(source.blockReasons.length
        ? source.blockReasons
        : ["staff_ineligible"]),
    );
  return [...new Set(reasons)];
}
export function leaseExpiry(control: Control, started: number) {
  return new Date(controlLeaseExpiresAt(control, started));
}
export function candidateVersion(source: ControlUser, user: User) {
  return sha256(
    JSON.stringify([
      source.id,
      normalizeEmail(source.email),
      normalizeName(source.name),
      source.accountRevocationGeneration,
      user.id,
      user.email,
      user.name,
      user.updatedAt.toISOString(),
      user.branchId,
      user.eywaUserId,
      user.approvalStatus,
      user.isAdmin,
      user.isSuperAdmin,
    ]),
  );
}
export function candidateProblem(
  source: ControlUser,
  user: User,
  confirmedTransfer = false,
) {
  if (
    user.isSuperAdmin ||
    user.isAdmin ||
    user.branchRole === "owner" ||
    user.branchRole === "manager"
  )
    return "protected_account";
  if (
    user.deletedAt ||
    user.manualSuspendedAt ||
    (!confirmedTransfer && user.suspendedAt) ||
    user.approvalStatus !== "approved"
  )
    return "local_account_blocked";
  if (!confirmedTransfer && user.authSource === "eywa")
    return "identity_confirmation_required";
  // The source's unique normalized email owns the automatic teacher migration.
  // Display names (including honorifics) are not an identity gate.
  if (normalizeEmail(user.email) !== normalizeEmail(source.email))
    return "email_mismatch";
  if (!confirmedTransfer && user.eywaUserId && user.eywaUserId !== source.id)
    return "identity_conflict";
  return null;
}
export function accountUsable(
  user: Pick<
    User,
    | "deletedAt"
    | "manualSuspendedAt"
    | "approvalStatus"
    | "isSuperAdmin"
    | "isAdmin"
  >,
  account: EywaManagedAccount,
  binding: EywaBinding,
  now = Date.now(),
) {
  return (
    !user.deletedAt &&
    !user.manualSuspendedAt &&
    user.approvalStatus === "approved" &&
    !user.isSuperAdmin &&
    !user.isAdmin &&
    account.status === "confirmed" &&
    !!account.currentUserId &&
    !account.blockReasons.length &&
    !binding.retiredAt &&
    binding.mode === "active" &&
    binding.enabled &&
    binding.healthy &&
    !!account.leaseExpiresAt &&
    account.leaseExpiresAt.getTime() > now &&
    !!binding.leaseExpiresAt &&
    binding.leaseExpiresAt.getTime() > now &&
    account.sourceEpoch === binding.sourceEpoch &&
    account.tenantRevocationGeneration === binding.tenantRevocationGeneration
  );
}
