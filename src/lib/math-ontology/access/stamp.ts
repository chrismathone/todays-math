import type { Branch, EywaBinding, EywaManagedAccount } from "@prisma/client";
/** Explicit primitive projection: no names, credentials, Prisma Dates or BigInts. */
export function ontologyAuthorizationClockFields(
  branch: Branch | null,
  managed: EywaManagedAccount | null,
  binding: EywaBinding | null,
) {
  return {
    branch: branch
      ? {
          id: branch.id,
          disabledMenus: branch.disabledMenus,
          ownerDisabledMenus: branch.ownerDisabledMenus,
          menuRevision: branch.menuRevision,
        }
      : null,
    managed: managed
      ? {
          bindingId: managed.bindingId,
          status: managed.status,
          blockReasons: managed.blockReasons,
          sourceEpoch: managed.sourceEpoch,
          securityRevision: String(managed.securityRevision),
          accountRevocationGeneration: String(
            managed.accountRevocationGeneration,
          ),
          tenantRevocationGeneration: String(
            managed.tenantRevocationGeneration,
          ),
          classListRevision: String(managed.classListRevision),
          leaseExpiresAt: managed.leaseExpiresAt?.toISOString() ?? null,
          endedAt: managed.endedAt?.toISOString() ?? null,
        }
      : null,
    binding: binding
      ? {
          id: binding.id,
          enabled: binding.enabled,
          mode: binding.mode,
          sourceEpoch: binding.sourceEpoch,
          leaseExpiresAt: binding.leaseExpiresAt?.toISOString() ?? null,
          updatedAt: binding.updatedAt.toISOString(),
        }
      : null,
  };
}
