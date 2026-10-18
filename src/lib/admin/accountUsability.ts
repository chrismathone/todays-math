import { z } from "zod";

/** Source control must be enabled before activation. A false value is rejected on its own. */
export function activationGate(
  binding: { retiredAt: Date | string | null; sourceEpoch: string | null },
  control: { enabled: boolean; healthy: boolean; sourceEpoch: string },
) {
  if (binding.retiredAt)
    return { ok: false as const, code: "activation_requires_healthy_binding" };
  if (!control.enabled)
    return { ok: false as const, code: "activation_requires_enabled" };
  if (!control.healthy || binding.sourceEpoch !== control.sourceEpoch)
    return { ok: false as const, code: "activation_requires_healthy_binding" };
  return { ok: true as const, code: null };
}

export function withoutBindingStop(reasons: readonly string[]) {
  return reasons.filter(
    (reason) => reason !== "binding_inactive" && reason !== "binding_retired",
  );
}

/** Only a user recorded on the integration stop, still suspended for that reason, can be restored. */
export function restorableIntegrationUser(
  user: {
    id: string;
    deletedAt: Date | string | null;
    manualSuspendedAt: Date | string | null;
    suspendedAt: Date | string | null;
  },
  stoppedIds: ReadonlySet<string>,
) {
  return (
    stoppedIds.has(user.id) &&
    !user.deletedAt &&
    !user.manualSuspendedAt &&
    Boolean(user.suspendedAt)
  );
}

export function passwordReissueDecision(
  subject: {
    deletedAt?: Date | string | null;
    isSuperAdmin?: boolean;
    authSource?: string | null;
    mapped?: boolean;
  },
  evidence?: string | null,
) {
  if (subject.deletedAt)
    return {
      allowed: false as const,
      code: "deleted" as const,
      message: "삭제된 계정의 비밀번호는 재발급하지 않습니다.",
    };
  if (subject.isSuperAdmin)
    return {
      allowed: false as const,
      code: "super_admin" as const,
      message: "최고관리자 비밀번호는 이 화면에서 재발급하지 않습니다.",
    };
  if (subject.authSource === "eywa")
    return {
      allowed: false as const,
      code: "source_auth" as const,
      message: "에이와 인증 계정은 원본 시스템에서만 비밀번호를 복구합니다.",
    };
  const text = evidence?.trim() ?? "";
  if (subject.mapped && text.length < 30)
    return {
      allowed: false as const,
      code: "evidence_required" as const,
      message: "연동된 로컬 계정은 30자 이상의 복구 근거가 필요합니다.",
    };
  return {
    allowed: true as const,
    evidence: subject.mapped ? text : null,
  };
}

export function pageWindow(
  page: number,
  pageSize: number,
  total: number,
  returned: number,
) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min(from + Math.max(0, returned) - 1, total);
  return { page: safePage, pageSize, total, from, to };
}

export function relationReviewLabel(details: unknown) {
  const record =
    details && typeof details === "object"
      ? (details as Record<string, unknown>)
      : {};
  const eventId = typeof record.eventId === "string" ? record.eventId : null;
  const reason = typeof record.reason === "string" ? record.reason : null;
  return {
    eventId,
    bindingId: typeof record.bindingId === "string" ? record.bindingId : null,
    snapshotId:
      typeof record.snapshotId === "string" ? record.snapshotId : null,
    reviewId: typeof record.reviewId === "string" ? record.reviewId : null,
    reason: reason ?? "사유 미기록",
    recorded: Boolean(eventId && reason),
  };
}

const issueBodySchema = z.strictObject({
  studentIds: z.array(z.uuid()).max(2000),
});

export function readStatusPages(url: URL) {
  const page = (name: string) => {
    const raw = url.searchParams.get(name);
    if (raw == null || raw === "") return 1;
    const value = Number(raw);
    return Number.isInteger(value) && value > 0 && value <= 100000 ? value : 1;
  };
  return {
    events: page("eventsPage"),
    accounts: page("accountsPage"),
    reviews: page("reviewsPage"),
  };
}

/** A zero-length body keeps legacy issuance. Any present body that is not a studentIds array is rejected. */
export function parseStudentIssueRequest(raw: string) {
  if (raw.length === 0) return { kind: "legacy" as const };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { kind: "malformed" as const };
  }
  const parsed = issueBodySchema.safeParse(json);
  if (!parsed.success) return { kind: "malformed" as const };
  return {
    kind: "subset" as const,
    studentIds: [...new Set(parsed.data.studentIds)],
  };
}
