import "server-only";
import { db } from "@/lib/db";
import { refreshManagedBinding } from "./managedAccounts";
import { enrollmentActive, kstRelationshipDay } from "./relationPolicy";
import { controlLeaseExpiresAt, controlSchema } from "./sync-contract";

export type ManagedStudentAccess = {
  allowed: boolean;
  /** Private JWT claim; never part of the public StudentSession. */
  stamp: string | null;
};
const denied: ManagedStudentAccess = { allowed: false, stamp: null };

/** Automatic suspension is a read-time guard; it never changes disabledAt or credentials. */
export async function managedStudentAccess(
  studentId: string,
  bindingId: string | null | undefined,
  options: { forceRefresh?: boolean } = {},
): Promise<ManagedStudentAccess> {
  if (!bindingId) return { allowed: true, stamp: null };
  try {
    let binding = await db.eywaBinding.findUnique({ where: { id: bindingId } });
    if (!binding || binding.retiredAt || binding.mode !== "active")
      return denied;
    if (
      options.forceRefresh ||
      !binding.leaseExpiresAt ||
      binding.leaseExpiresAt.getTime() <= Date.now()
    ) {
      await refreshManagedBinding(bindingId);
      binding = await db.eywaBinding.findUnique({ where: { id: bindingId } });
    }
    const now = new Date();
    if (
      !binding ||
      binding.retiredAt ||
      binding.mode !== "active" ||
      !binding.enabled ||
      !binding.healthy ||
      !binding.sourceEpoch ||
      !binding.leaseExpiresAt ||
      binding.leaseExpiresAt <= now
    )
      return denied;
    const parsed = controlSchema.safeParse(binding.control);
    if (!parsed.success) return denied;
    const control = parsed.data;
    if (
      !control.enabled ||
      !control.healthy ||
      control.mode !== "active" ||
      control.bindingId !== binding.id ||
      control.tenantId !== binding.tenantId ||
      control.targetBranchId !== binding.targetBranchId ||
      control.sourceEpoch !== binding.sourceEpoch ||
      BigInt(control.tenantRevocationGeneration) !==
        binding.tenantRevocationGeneration ||
      BigInt(control.securityRevision) !== binding.securityRevision ||
      controlLeaseExpiresAt(control, now.getTime()) <= now.getTime()
    )
      return denied;

    // Re-read after refresh: withdrawal and transfer can have changed while fetching control.
    const student = await db.student.findUnique({ where: { id: studentId } });
    if (
      !student ||
      !student.eywaStudentId ||
      student.eywaBindingId !== bindingId ||
      student.branchId !== binding.targetBranchId ||
      student.isTest ||
      student.eywaWithdrawnAt ||
      student.sourceStatus === "withdrawn"
    )
      return denied;
    const enrollments = await db.studentEnrollment.findMany({
      where: {
        studentId,
        bindingId,
        endedAt: null,
        onHold: false,
        class: {
          eywaBindingId: bindingId,
          branchId: binding.targetBranchId,
          active: true,
          OR: [{ closedAt: null }, { closedAt: { gt: now } }],
        },
      },
      select: {
        startsOn: true,
        endsOn: true,
        endedAt: true,
        onHold: true,
        isTransferred: true,
      },
    });
    if (
      !enrollments.some((row) => enrollmentActive(row, kstRelationshipDay(now)))
    )
      return denied;
    return {
      allowed: true,
      // OFF increments the source tenant generation, so OFF -> ON cannot revive an old token.
      stamp: JSON.stringify([
        1,
        binding.id,
        binding.targetBranchId,
        binding.sourceEpoch,
        binding.tenantRevocationGeneration.toString(),
        student.id,
        student.eywaStudentId,
      ]),
    };
  } catch {
    // Expired leases, source/DB failures and malformed state never grant managed access.
    return denied;
  }
}
