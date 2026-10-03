import "server-only";
import type { Prisma } from "@prisma/client";
import type { AccountSyncStatus } from "@/contracts/accountAccess.contract";

// Intentionally exclude source email/name, control payloads and error details.
export const accountSyncSelect = {
  status: true,
  currentUserId: true,
  sourceUserId: true,
  currentSourceUserId: true,
  confirmedAt: true,
  endedAt: true,
  conflictReason: true,
  blockReasons: true,
  sourceEpoch: true,
  binding: {
    select: {
      targetBranchId: true,
      mode: true,
      enabled: true,
      healthy: true,
      retiredAt: true,
      sourceEpoch: true,
    },
  },
} satisfies Prisma.EywaManagedAccountSelect;

type Mapping = Prisma.EywaManagedAccountGetPayload<{
  select: typeof accountSyncSelect;
}>;
type Account = {
  id: string;
  eywaUserId: string | null;
  branchId: string | null;
  branch: { name: string } | null;
  approvalStatus: string;
  suspendedAt: Date | null;
  deletedAt: Date | null;
  eywaManagedAccounts: Mapping[];
};

const REVIEW_REASONS: Record<string, string> = {
  protected_account:
    "관리자 계정은 자동 연결 대상이 아니므로 연결 검토가 필요합니다.",
  local_account_blocked:
    "계정의 승인·정지·삭제 상태를 확인한 뒤 연결을 검토해야 합니다.",
  identity_confirmation_required:
    "계정 본인 확인이 필요해 연결을 기다리고 있습니다.",
  email_mismatch: "계정 정보가 일치하지 않아 연결 검토가 필요합니다.",
  name_mismatch: "계정 정보가 일치하지 않아 연결 검토가 필요합니다.",
  identity_conflict: "연결할 계정을 확정하지 못해 관리자 검토가 필요합니다.",
  managed_elsewhere: "다른 지점과의 연결을 확인한 뒤 이전을 검토해야 합니다.",
  invalid_profile: "연동할 계정 정보가 올바르지 않아 확인이 필요합니다.",
};
const BLOCK_REASONS: Record<string, string> = {
  tenant_disabled: "지점의 에이와 연동이 꺼져 있습니다.",
  binding_inactive: "지점의 에이와 연동이 아직 활성화되지 않았습니다.",
  binding_retired: "지점의 에이와 연동이 종료되었습니다.",
  source_unhealthy: "에이와 연동 상태를 확인할 수 없어 연결이 중단되었습니다.",
  source_removed: "에이와에서 이 계정의 연결 대상 정보가 제거되었습니다.",
  source_rebaseline_required:
    "에이와 연결 정보가 변경되어 다시 확인해야 합니다.",
};
const unlinked = (reason: string): AccountSyncStatus => ({
  status: "unlinked",
  branchName: null,
  reason,
});

/** Rows arrive newest first; a current identity takes precedence over history. */
export function accountSyncStatus(user: Account): AccountSyncStatus {
  const mappings = user.eywaManagedAccounts ?? [];
  const current = mappings.filter((row) => row.currentUserId === user.id);
  if (current.length > 1)
    return unlinked("연결 정보가 일치하지 않아 관리자 확인이 필요합니다.");
  const mapping =
    current[0] ??
    mappings.find((row) => row.status !== "ended" && !row.endedAt) ??
    mappings[0];
  if (!mapping) return unlinked("에이와에 연결되지 않은 계정입니다.");
  if (mapping.status === "ended" || mapping.endedAt)
    return unlinked("이 계정의 에이와 연결이 종료되었습니다.");
  if (mapping.status === "candidate")
    return unlinked("에이와 계정 연결 승인을 기다리고 있습니다.");
  if (mapping.status !== "confirmed" || mapping.conflictReason)
    return unlinked(
      mapping.conflictReason &&
        Object.hasOwn(REVIEW_REASONS, mapping.conflictReason)
        ? REVIEW_REASONS[mapping.conflictReason]
        : "계정 연결에 관리자 검토가 필요합니다.",
    );
  if (
    mapping.currentUserId !== user.id ||
    !mapping.confirmedAt ||
    !mapping.currentSourceUserId ||
    mapping.currentSourceUserId !== mapping.sourceUserId ||
    mapping.sourceUserId !== user.eywaUserId
  )
    return unlinked("현재 계정의 에이와 연결을 확인하지 못했습니다.");

  const binding = mapping.binding;
  if (binding.retiredAt) return unlinked(BLOCK_REASONS.binding_retired);
  if (binding.mode !== "active")
    return unlinked(BLOCK_REASONS.binding_inactive);
  if (!binding.enabled) return unlinked(BLOCK_REASONS.tenant_disabled);
  if (!binding.healthy) return unlinked(BLOCK_REASONS.source_unhealthy);
  if (user.branchId !== binding.targetBranchId || !user.branch?.name)
    return unlinked(
      "연결된 지점과 계정 소속이 일치하지 않아 확인이 필요합니다.",
    );
  if (mapping.blockReasons.includes("source_removed"))
    return unlinked(BLOCK_REASONS.source_removed);
  if (!mapping.sourceEpoch || mapping.sourceEpoch !== binding.sourceEpoch)
    return unlinked(BLOCK_REASONS.source_rebaseline_required);
  // Expired access leases and login restrictions do not dissolve an identity.
  return {
    status: "linked",
    branchName: user.branch.name,
    reason: user.deletedAt
      ? "삭제된 계정으로 로그인할 수 없습니다."
      : user.suspendedAt
        ? "계정 로그인이 정지되어 있습니다."
        : user.approvalStatus !== "approved"
          ? "계정 승인이 필요해 로그인할 수 없습니다."
          : mapping.blockReasons.length
            ? "에이와의 계정 사용 조건을 확인해야 하므로 로그인이 제한될 수 있습니다."
            : null,
  };
}
