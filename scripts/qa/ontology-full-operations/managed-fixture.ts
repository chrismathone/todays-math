import { randomUUID } from "node:crypto";
import { db, fixture } from "./harness";
export async function managedFixture(leaseUntil: Date) {
const f = await fixture();
    const bindingId = randomUUID(),
      sourceUserId = randomUUID(),
      sourceClassId = randomUUID(),
      epoch = randomUUID();
    const expiry = leaseUntil;
    await db.eywaBinding.create({
      data: {
        id: bindingId,
        tenantId: randomUUID(),
        targetBranchId: f.branch.id,
        sourceEpoch: epoch,
        mode: "active",
        enabled: true,
        healthy: true,
        securityRevision: BigInt(1),
        tenantRevocationGeneration: BigInt(1),
        leaseExpiresAt: expiry,
      },
    });
    await db.user.update({
      where: { id: f.actor.id },
      data: { authSource: "eywa", branchRole: "teacher", isAdmin: false },
    });
    const managed = await db.eywaManagedAccount.create({
      data: {
        bindingId,
        sourceUserId,
        userId: f.actor.id,
        currentUserId: f.actor.id,
        currentSourceUserId: sourceUserId,
        status: "confirmed",
        sourceEmail: f.user.email,
        sourceName: "Synthetic",
        sourceEpoch: epoch,
        securityRevision: BigInt(1),
        tenantRevocationGeneration: BigInt(1),
        leaseExpiresAt: expiry,
        sourceClasses: [
          {
            id: sourceClassId,
            permissionRevision: "1",
            capabilities: ["progress:write"],
            validUntil: null,
          },
        ],
      },
    });
    await db.class.update({
      where: { id: f.cls.id },
      data: {
        eywaBindingId: bindingId,
        eywaClassId: sourceClassId,
        permissionRevision: BigInt(1),
      },
    });
    await db.student.update({
      where: { id: f.student.id },
      data: { eywaBindingId: bindingId },
    });
    const membership = await db.classMembership.create({
      data: {
        bindingId,
        sourceId: "synthetic-membership",
        classId: f.cls.id,
        userId: f.actor.id,
        sourceUserId,
        role: "homeroom",
        capabilities: ["progress:write"],
      },
    });
    const enrollment = await db.studentEnrollment.create({
      data: {
        bindingId,
        sourceId: randomUUID(),
        studentId: f.student.id,
        classId: f.cls.id,
        startsOn: new Date("2026-01-01"),
      },
    });

return { ...f, bindingId, managedId: managed.id, membershipId: membership.id, enrollmentId: enrollment.id };
}
