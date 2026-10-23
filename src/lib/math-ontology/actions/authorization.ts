import "server-only";
import type { Prisma } from "@prisma/client";
import type { OntologyActionTarget } from "@/contracts/mathOntologyAction.contract";
import { legacyClassInScope } from "@/lib/classAccess";
import { controlUserSchema } from "@/lib/eywa/sync-contract";
import {
  currentClassGrantAllows,
  membershipAllows,
  enrollmentActive,
  kstRelationshipDay,
} from "@/lib/eywa/relationPolicy";
import { effectiveWorkspaceMenuPolicy } from "@/lib/workspaceMenuPolicy.server";
import {
  accountRouteAllowed,
  srsTeacherManagementRoute,
} from "@/lib/accountRouteAccess";
import { routeAccessFor } from "@/lib/routeAccess";
import { canonicalBytes, digest } from "./canonical";
import { requireOperation } from "./errors";
import { readOntologyActorInTransaction } from "./actor";

/** Identity must come from authenticated server session, never request JSON. */
export type OntologyActionActor = { id: string; sessionVersion: number };

/** No upstream synchronization or network IO. Locks keep locally checked grants
 * stable through commit. Existing pure policies own scope and capability meaning.
 */
export async function authorizeOntologyAction(
  tx: Prisma.TransactionClient,
  actor: OntologyActionActor,
  target: OntologyActionTarget,
  now: Date,
) {
  const { row, branch, managed, binding } =
    await readOntologyActorInTransaction(tx, actor, now);
  const viewer = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    branchId: row.branchId,
    branchRole: row.branchRole,
    approvalStatus: row.approvalStatus,
    isSuperAdmin: row.isSuperAdmin,
    isAdmin:
      row.isSuperAdmin ||
      (row.isAdmin &&
        !!row.branchId &&
        (row.branchRole === "owner" || row.branchRole === "manager")),
    menus: effectiveWorkspaceMenuPolicy({ ...row, branch }).menus,
  };
  const legacyPath = `/api/students/${target.studentId}/math-srs/course`;
  requireOperation(
    (viewer.menus.includes("srs") ||
      (viewer.isSuperAdmin && srsTeacherManagementRoute("POST", legacyPath))) &&
      accountRouteAllowed(viewer, "POST", legacyPath) &&
      (viewer.isAdmin ||
        viewer.isSuperAdmin ||
        routeAccessFor(viewer.role, "POST", legacyPath) !== "deny"),
    "FORBIDDEN",
  );
  await tx.$queryRaw`SELECT id FROM class WHERE id = ${target.classId}::uuid FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM student WHERE id = ${target.studentId}::uuid FOR SHARE`;
  const cls = await tx.class.findUnique({ where: { id: target.classId } });
  const student = await tx.student.findUnique({
    where: { id: target.studentId },
  });
  requireOperation(
    cls &&
      student &&
      !student.eywaWithdrawnAt &&
      !student.isTest &&
      cls.branchId === target.branchId &&
      student.branchId === target.branchId,
    "FORBIDDEN",
  );
  let grantStamp: unknown = null;
  if (!managed) requireOperation(legacyClassInScope(viewer, cls), "FORBIDDEN");
  else {
    const branchAdmin =
      viewer.isAdmin && viewer.branchId === binding!.targetBranchId;
    if (!cls.eywaBindingId)
      requireOperation(
        !!viewer.branchId &&
          cls.branchId === viewer.branchId &&
          (cls.userId === viewer.id || branchAdmin),
        "FORBIDDEN",
      );
    else {
      requireOperation(
        cls.branchId === viewer.branchId &&
          cls.active &&
          (!cls.closedAt || cls.closedAt > now),
        "FORBIDDEN",
      );
      if (!branchAdmin) {
        await tx.$queryRaw`SELECT id FROM class_membership WHERE user_id = ${actor.id}::uuid AND class_id = ${target.classId}::uuid FOR SHARE`;
        const memberships = await tx.classMembership.findMany({
          where: {
            userId: actor.id,
            classId: cls.id,
            bindingId: managed.bindingId,
            revokedAt: null,
          },
        });
        const grants = controlUserSchema.shape.classes.parse(
          managed.sourceClasses,
        );
        const sourceGrant = grants.find((g) => g.id === cls.eywaClassId);
        requireOperation(
          cls.eywaBindingId === managed.bindingId &&
            memberships.some((m) =>
              membershipAllows(m, "progress:write", now),
            ) &&
            currentClassGrantAllows(
              sourceGrant,
              cls.eywaClassId,
              cls.permissionRevision,
              "progress:write",
              now,
            ),
          "FORBIDDEN",
        );
        grantStamp = {
          sourceGrant: sourceGrant ?? null,
          memberships: memberships.map((m) => ({
            id: m.id,
            role: m.role,
            capabilities: m.capabilities,
            revokedAt: m.revokedAt?.toISOString() ?? null,
          })),
        };
      }
    }
  }
  if (!student.eywaBindingId)
    requireOperation(student.classId === cls.id, "FORBIDDEN");
  else {
    await tx.$queryRaw`SELECT id FROM student_enrollment WHERE student_id = ${student.id}::uuid AND class_id = ${cls.id}::uuid FOR SHARE`;
    const enrollments = await tx.studentEnrollment.findMany({
      where: {
        studentId: student.id,
        classId: cls.id,
        bindingId: student.eywaBindingId,
      },
    });
    requireOperation(
      student.eywaBindingId === cls.eywaBindingId &&
        enrollments.some((e) =>
          enrollmentActive(e, kstRelationshipDay(now), false),
        ),
      "FORBIDDEN",
    );
  }
  return {
    authorizationStamp: digest(
      canonicalBytes({
        actorId: actor.id,
        sessionVersion: actor.sessionVersion,
        role: viewer.role,
        isAdmin: viewer.isAdmin,
        isSuperAdmin: viewer.isSuperAdmin,
        menus: viewer.menus,
        target,
        classOwner: cls.userId,
        classBinding: cls.eywaBindingId,
        permissionRevision: String(cls.permissionRevision),
        grantStamp,
        managed: managed
          ? {
              bindingId: managed.bindingId,
              securityRevision: String(managed.securityRevision),
              sourceEpoch: managed.sourceEpoch,
              tenantRevocationGeneration: String(
                managed.tenantRevocationGeneration,
              ),
              accountRevocationGeneration: String(
                managed.accountRevocationGeneration,
              ),
            }
          : null,
      }),
    ),
  };
}
