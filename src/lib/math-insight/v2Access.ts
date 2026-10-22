import "server-only";
import type { Class } from "@prisma/client";
import { forbiddenError, notFoundError } from "@/lib/apiResponse";
import { legacyClassInScope, currentEnrollmentWhere } from "@/lib/classAccess";
import {
  membershipAllows,
  currentClassGrantAllows,
} from "@/lib/eywa/relationPolicy";
import { controlUserSchema } from "@/lib/eywa/sync-contract";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import { db } from "@/lib/db";
import { effectiveWorkspaceMenuPolicy } from "@/lib/workspaceMenuPolicy.server";
import {
  accountRouteAllowed,
  srsTeacherManagementRoute,
} from "@/lib/accountRouteAccess";
import { routeAccessFor } from "@/lib/routeAccess";
import { accountUsable } from "@/lib/eywa/managedPolicy";
import { insightDigest } from "./snapshot";

/** Uncached local DB read. Mirrors auth.ts JWT projection and uses the existing menu/route policies.
 * No forced upstream refresh. Existing ownership guards re-read local memberships/enrollments.
 */
export async function freshInsightV2Access(
  request: Request,
  identity: AccountAccess,
) {
  const row = await db.user.findUnique({
    where: { id: identity.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isAdmin: true,
      isSuperAdmin: true,
      branchId: true,
      branchRole: true,
      approvalStatus: true,
      disabledMenus: true,
      sessionVersion: true,
      deletedAt: true,
      suspendedAt: true,
      manualSuspendedAt: true,
      authSource: true,
      branch: {
        select: {
          disabledMenus: true,
          ownerDisabledMenus: true,
          menuRevision: true,
        },
      },
    },
  });
  if (
    !row ||
    row.deletedAt ||
    row.suspendedAt ||
    row.manualSuspendedAt ||
    row.approvalStatus !== "approved"
  )
    return null;
  const managed = await db.eywaManagedAccount.findUnique({
    where: { currentUserId: identity.id },
    include: { binding: true, user: true },
  });
  // Fail closed on an expired local source lease; do not add a synchronization writer here.
  if (
    managed
      ? !managed.user || !accountUsable(managed.user, managed, managed.binding)
      : row.authSource === "eywa"
  )
    return null;
  const account: AccountAccess = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isAdmin:
      row.isSuperAdmin ||
      (row.isAdmin &&
        !!row.branchId &&
        (row.branchRole === "owner" || row.branchRole === "manager")),
    isSuperAdmin: row.isSuperAdmin,
    branchId: row.branchId,
    branchRole: row.branchRole,
    approvalStatus: row.approvalStatus,
    menus: effectiveWorkspaceMenuPolicy(row).menus,
  };
  const path = new URL(request.url).pathname;
  const adminTeacher =
    account.isSuperAdmin && srsTeacherManagementRoute(request.method, path);
  if (
    !accountRouteAllowed(account, request.method, path) ||
    (!account.isAdmin &&
      !account.isSuperAdmin &&
      routeAccessFor(account.role, request.method, path) === "deny") ||
    (!adminTeacher && !account.menus.includes("srs"))
  )
    return null;
  return {
    account,
    managed,
    stamp: insightDigest({
      account,
      sessionVersion: row.sessionVersion,
      // Include source-grant facts; source lease timestamp alone is not a learning change.
      managed: managed
        ? {
            bindingId: managed.bindingId,
            status: managed.status,
            blockReasons: managed.blockReasons,
            sourceEpoch: managed.sourceEpoch,
            securityRevision: String(managed.securityRevision),
            tenantRevocationGeneration: String(
              managed.tenantRevocationGeneration,
            ),
            accountRevocationGeneration: String(
              managed.accountRevocationGeneration,
            ),
            classListRevision: String(managed.classListRevision),
            sourceClasses: managed.sourceClasses,
          }
        : null,
    }),
  };
}

/** The local read-only equivalent of the established student:read ownership guard.
 * Use existing pure authorization rules and uncached local source rows. Unlike
 * getManagedClassGrants, this adapter never refreshes a source or writes on expiry.
 */
export async function freshInsightV2Student(
  studentId: string,
  scope: { classId?: string; branchId?: string },
  access: NonNullable<Awaited<ReturnType<typeof freshInsightV2Access>>>,
) {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });
  if (!student) return { response: notFoundError("학생") };
  const account = access.account;
  const managed = access.managed;
  const now = new Date();
  async function allowed(cls: Class): Promise<boolean> {
    if (!managed) return legacyClassInScope(account, cls);
    if (!accountUsable(managed.user!, managed, managed.binding, now.getTime()))
      return false;
    const branchAdmin =
      account.isAdmin && account.branchId === managed.binding.targetBranchId;
    if (!cls.eywaBindingId)
      return (
        !!account.branchId &&
        cls.branchId === account.branchId &&
        (cls.userId === account.id || !!branchAdmin)
      );
    if (branchAdmin) return cls.branchId === account.branchId;
    const grants = controlUserSchema.shape.classes.parse(managed.sourceClasses);
    const memberships = await db.classMembership.findMany({
      where: {
        userId: account.id,
        bindingId: managed.bindingId,
        revokedAt: null,
        classId: cls.id,
      },
    });
    return (
      cls.eywaBindingId === managed.bindingId &&
      cls.branchId === account.branchId &&
      cls.active &&
      (!cls.closedAt || cls.closedAt > now) &&
      memberships.some(
        (row) =>
          membershipAllows(row, "student:read", now) &&
          currentClassGrantAllows(
            grants.find((g) => g.id === cls.eywaClassId),
            cls.eywaClassId,
            cls.permissionRevision,
            "student:read",
            now,
          ),
      )
    );
  }
  let cls = student.class;
  if (scope.classId) {
    const requested = await db.class.findUnique({
      where: { id: scope.classId },
    });
    if (!requested) return { response: notFoundError("반") };
    if (!(await allowed(requested))) return { response: forbiddenError() };
    cls = requested;
    if (student.eywaBindingId) {
      const enrollment = await db.studentEnrollment.findFirst({
        where: {
          studentId,
          classId: cls.id,
          bindingId: student.eywaBindingId,
          ...currentEnrollmentWhere(undefined, true),
        },
      });
      if (
        student.isTest ||
        student.eywaWithdrawnAt ||
        !enrollment ||
        student.eywaBindingId !== cls.eywaBindingId
      )
        return { response: notFoundError("학생") };
    } else if (student.classId !== cls.id)
      return { response: notFoundError("학생") };
  } else if (student.eywaBindingId) {
    if (student.isTest || student.eywaWithdrawnAt)
      return { response: forbiddenError() };
    const enrollments = await db.studentEnrollment.findMany({
      where: {
        studentId,
        bindingId: student.eywaBindingId,
        ...currentEnrollmentWhere(undefined, true),
      },
      include: { class: true },
      orderBy: [{ startsOn: "desc" }, { id: "asc" }],
    });
    let found: Class | null = null;
    for (const enrollment of enrollments)
      if (await allowed(enrollment.class)) {
        found = enrollment.class;
        break;
      }
    if (!found) return { response: forbiddenError() };
    cls = found;
  } else if (!(await allowed(cls))) return { response: forbiddenError() };
  if (student.eywaWithdrawnAt) return { response: notFoundError("학생") };
  if (
    scope.branchId &&
    (cls.branchId !== scope.branchId || student.branchId !== scope.branchId)
  )
    return { response: notFoundError("학생") };
  return {
    response: null,
    student: { ...student, classId: cls.id, class: cls },
    context: {
      studentId: student.id,
      classId: cls.id,
      branchId: student.branchId,
      primaryClassId: student.classId,
      classOwnerId: cls.userId,
      classBranchId: cls.branchId,
      classGrade: cls.grade,
      classBindingId: cls.eywaBindingId,
      classPermissionRevision: String(cls.permissionRevision),
    },
  };
}
