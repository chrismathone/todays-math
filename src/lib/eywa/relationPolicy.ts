/** Deterministic relationship rules shared by import, API guards and scheduled jobs. */
import { kstDateOf } from "@/lib/kstDate";
export type ClassCapability =
  | "class:read"
  | "student:read"
  | "test:read"
  | "test:write"
  | "progress:read"
  | "progress:write"
  | "student:account"
  // Source-owned roster fields cannot be edited through a managed teacher grant.
  | "class:manage"
  | "student:manage";

type Day = string | Date;
const dayOf = (value: Day): string =>
  typeof value === "string"
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10);

export function kstRelationshipDay(now = new Date()): string {
  return kstDateOf(now);
}

export interface MembershipWindow {
  startsOn: Day | null;
  endsOn: Day | null;
  revokedAt: Date | string | null;
  role: string;
  capabilities: readonly string[];
}

export function membershipAllows(
  row: MembershipWindow,
  capability: ClassCapability,
  now = new Date(),
): boolean {
  const day = kstRelationshipDay(now);
  if (
    row.revokedAt ||
    (row.startsOn && dayOf(row.startsOn) > day) ||
    (row.endsOn && dayOf(row.endsOn) < day)
  )
    return false;
  if (!["homeroom", "slot", "delegate"].includes(row.role)) return false;
  // Delegation is read-only even if a malformed source capability list claims writes.
  if (row.role === "delegate" && !capability.endsWith(":read")) return false;
  return row.capabilities.includes(capability);
}

export interface EnrollmentWindow {
  startsOn: Day;
  endsOn: Day | null;
  onHold: boolean;
  isTransferred: boolean;
  endedAt?: Date | string | null;
}

/** Mirrors source enrollments/eligibility.ts: normal end inclusive, transfer end exclusive. */
export function enrollmentActive(
  row: EnrollmentWindow,
  day = kstRelationshipDay(),
  includeOnHold = false,
): boolean {
  if (
    row.endedAt ||
    (!includeOnHold && row.onHold) ||
    dayOf(row.startsOn) > day
  )
    return false;
  if (!row.endsOn) return true;
  return row.isTransferred ? day < dayOf(row.endsOn) : day <= dayOf(row.endsOn);
}

export interface SourceClassGrant {
  id: string;
  permissionRevision: string;
  capabilities: readonly string[];
  validUntil: string | null;
}

export function currentClassGrantAllows(
  grant: SourceClassGrant | undefined,
  sourceClassId: string | null,
  localRevision: bigint,
  capability: ClassCapability,
  now = new Date(),
): boolean {
  if (
    !grant ||
    grant.id !== sourceClassId ||
    !/^\d+$/.test(grant.permissionRevision)
  )
    return false;
  if (
    BigInt(grant.permissionRevision) !== localRevision ||
    !grant.capabilities.includes(capability)
  )
    return false;
  if (
    grant.validUntil &&
    !(new Date(grant.validUntil).getTime() > now.getTime())
  )
    return false;
  return true;
}
