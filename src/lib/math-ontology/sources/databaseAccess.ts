import type { Prisma, EywaManagedAccount, EywaBinding } from "@prisma/client";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import { legacyClassInScope, currentEnrollmentWhere } from "@/lib/classAccess";
import {
  membershipAllows,
  currentClassGrantAllows,
  kstRelationshipDay,
  enrollmentActive,
} from "@/lib/eywa/relationPolicy";
import { accountUsable } from "@/lib/eywa/managedPolicy";
import { controlUserSchema } from "@/lib/eywa/sync-contract";
import { workspaceMenuPolicy } from "@/lib/workspaceMenuPolicy";
import {
  accountRouteAllowed,
  srsTeacherManagementRoute,
} from "@/lib/accountRouteAccess";
import { routeAccessFor } from "@/lib/routeAccess";
import { sourceDigest } from "./canonical";
export interface MathOntologyDatabaseReadInput {
  actor: { id: string; sessionVersion: number };
  target: { studentId: string; classId: string; branchId: string | null };
  graphVersion: string;
  now: Date;
  /** Current authorization clock, separate from immutable source observation asOf. */
  authorizationNow?: Date | (() => Date);
  observedAfter?: string;
}
export class MathOntologySourceAccessDenied extends Error {
  readonly code = "SOURCE_NOT_AVAILABLE";
  constructor() {
    super("Authorized source is not available");
  }
}
export type MathOntologySourceTransaction = Pick<
  Prisma.TransactionClient,
  | "user"
  | "eywaManagedAccount"
  | "class"
  | "student"
  | "classMembership"
  | "studentEnrollment"
  | "studentSrsState"
  | "progress"
  | "progressPlan"
  | "unit"
  | "problem"
>;
function fail(): never {
  throw new MathOntologySourceAccessDenied();
}
/** Fresh actor policy shared by scoped private reads and global native-definition evidence. */
async function authorizeSourceActor(
  tx: MathOntologySourceTransaction,
  input: Pick<MathOntologyDatabaseReadInput, "actor" | "authorizationNow">,
  dataPath: string,
) {
  const clock = typeof input.authorizationNow === "function" ? input.authorizationNow : input.authorizationNow ? () => input.authorizationNow as Date : () => new Date();
  if (!Number.isFinite(clock().getTime())) fail();
  const row = await tx.user.findUnique({
    where: { id: input.actor.id },
    select: {
      id: true,
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
    row.sessionVersion !== input.actor.sessionVersion ||
    row.deletedAt ||
    row.suspendedAt ||
    row.manualSuspendedAt ||
    row.approvalStatus !== "approved"
  )
    fail();
  const managed = await tx.eywaManagedAccount.findUnique({
    where: { currentUserId: row.id },
    select: {
      id: true,
      bindingId: true,
      currentUserId: true,
      status: true,
      blockReasons: true,
      branchRoleOverride: true,
      sourceClasses: true,
      sourceEpoch: true,
      securityRevision: true,
      accountRevocationGeneration: true,
      tenantRevocationGeneration: true,
      leaseExpiresAt: true,
      user: {
        select: {
          id: true,
          deletedAt: true,
          manualSuspendedAt: true,
          approvalStatus: true,
          isSuperAdmin: true,
          isAdmin: true,
          branchId: true,
          branchRole: true,
        },
      },
      binding: {
        select: {
          id: true,
          targetBranchId: true,
          retiredAt: true,
          mode: true,
          enabled: true,
          healthy: true,
          leaseExpiresAt: true,
          sourceEpoch: true,
          securityRevision: true,
          tenantRevocationGeneration: true,
        },
      },
    },
  });
  // accountUsable's implementation reads only this selected policy set. The broad legacy parameter types include unrelated PII; it is intentionally not queried.
  if (
    managed
      ? !managed.user ||
        managed.user.id !== row.id ||
        !accountUsable(
          managed.user,
          managed as unknown as EywaManagedAccount,
          managed.binding as unknown as EywaBinding,
          clock().getTime(),
        )
      : row.authSource === "eywa"
  )
    fail();
  const account: AccountAccess = {
    id: row.id,
    name: "",
    email: "",
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
    menus: workspaceMenuPolicy(row).menus,
  };
  if (
    !accountRouteAllowed(account, "GET", dataPath) ||
    (!account.isAdmin &&
      !account.isSuperAdmin &&
      routeAccessFor(account.role, "GET", dataPath) === "deny") ||
    (!(account.isSuperAdmin && srsTeacherManagementRoute("GET", dataPath)) &&
      !account.menus.includes("srs"))
  )
    fail();
  return { now: clock(), clock, row, managed, account };
}
/** Native authored definitions are global teacher resources; no student record is required or read. */
export async function authorizeMathOntologyNativeSourceRead(
  tx: MathOntologySourceTransaction,
  input: Pick<MathOntologyDatabaseReadInput, "actor" | "authorizationNow">,
) {
  const { account } = await authorizeSourceActor(
    tx,
    input,
    "/api/math-srs/fading",
  );
  return {
    actorId: account.id,
    scope: "global-native-authored-definition" as const,
  };
}
/** Fresh scoped projections reuse the existing policy functions. No credential/name/contact fields are queried. */
export async function authorizeMathOntologySourceRead(
  tx: MathOntologySourceTransaction,
  input: MathOntologyDatabaseReadInput,
) {
  const access = await authorizeSourceActor(
    tx,
    input,
    `/api/students/${input.target.studentId}/math-srs/insight`,
  );
  const { clock, row, managed, account } = access;
  let now = clock();
  const student = await tx.student.findUnique({
    where: { id: input.target.studentId },
    select: {
      id: true,
      classId: true,
      branchId: true,
      eywaBindingId: true,
      isTest: true,
      eywaWithdrawnAt: true,
      useIndividualProgress: true,
      updatedAt: true,
    },
  });
  const cls = await tx.class.findUnique({
    where: { id: input.target.classId },
    select: {
      id: true,
      userId: true,
      branchId: true,
      eywaBindingId: true,
      eywaClassId: true,
      permissionRevision: true,
      active: true,
      closedAt: true,
      grade: true,
    },
  });
  if (
    !student ||
    !cls ||
    student.eywaWithdrawnAt ||
    student.branchId !== input.target.branchId ||
    cls.branchId !== input.target.branchId
  )
    fail();
  let memberships: Prisma.ClassMembershipGetPayload<{
    select: {
      startsOn: true;
      endsOn: true;
      revokedAt: true;
      role: true;
      capabilities: true;
    };
  }>[] = [];
  const grants = managed
    ? controlUserSchema.shape.classes.parse(managed.sourceClasses)
    : [];
  if (!managed) {
    if (!legacyClassInScope(account, cls)) fail();
  } else {
    const branchAdmin =
      account.isAdmin && account.branchId === managed.binding.targetBranchId;
    if (!cls.eywaBindingId) {
      if (
        !account.branchId ||
        cls.branchId !== account.branchId ||
        (cls.userId !== account.id && !branchAdmin)
      )
        fail();
    } else if (branchAdmin) {
      if (cls.branchId !== account.branchId) fail();
    } else {
      memberships = await tx.classMembership.findMany({
        where: {
          userId: account.id,
          bindingId: managed.bindingId,
          revokedAt: null,
          classId: cls.id,
        },
        orderBy: { id: "asc" },
        select: {
          startsOn: true,
          endsOn: true,
          revokedAt: true,
          role: true,
          capabilities: true,
        },
      });
      now = clock();
      if (
        cls.eywaBindingId !== managed.bindingId ||
        cls.branchId !== account.branchId ||
        !cls.active ||
        (cls.closedAt && cls.closedAt <= now) ||
        !memberships.some(
          (m) =>
            membershipAllows(m, "student:read", now) &&
            currentClassGrantAllows(
              grants.find((g) => g.id === cls.eywaClassId),
              cls.eywaClassId,
              cls.permissionRevision,
              "student:read",
              now,
            ),
        )
      )
        fail();
    }
  }
  let enrollment: Prisma.StudentEnrollmentGetPayload<{
    select: {
      id: true;
      startsOn: true;
      endsOn: true;
      onHold: true;
      isTransferred: true;
      endedAt: true;
    };
  }> | null = null;
  if (student.eywaBindingId) {
    if (student.isTest || student.eywaBindingId !== cls.eywaBindingId) fail();
    now = clock();
    enrollment = await tx.studentEnrollment.findFirst({
      where: {
        studentId: student.id,
        classId: cls.id,
        bindingId: student.eywaBindingId,
        ...currentEnrollmentWhere(kstRelationshipDay(now), true),
      },
      orderBy: [{ startsOn: "desc" }, { id: "asc" }],
      select: {
        id: true,
        startsOn: true,
        endsOn: true,
        onHold: true,
        isTransferred: true,
        endedAt: true,
      },
    });
    if (!enrollment || !enrollmentActive(enrollment, kstRelationshipDay(clock()), true)) fail();
  } else if (student.classId !== cls.id) fail();
  now = clock();
  if (managed && (!managed.user || !accountUsable(managed.user, managed as unknown as EywaManagedAccount, managed.binding as unknown as EywaBinding, now.getTime()))) fail();
  if (memberships.length && (!cls.active || (cls.closedAt && cls.closedAt <= now) || !memberships.some(m => membershipAllows(m, "student:read", now) && currentClassGrantAllows(grants.find(g => g.id === cls.eywaClassId), cls.eywaClassId, cls.permissionRevision, "student:read", now)))) fail();
  const context = {
    actorId: account.id,
    sessionVersion: row.sessionVersion,
    studentId: student.id,
    classId: cls.id,
    branchId: student.branchId,
    primaryClassId: student.classId,
    classOwnerId: cls.userId,
    classBindingId: cls.eywaBindingId,
    classPermissionRevision: String(cls.permissionRevision),
  };
  const authorizationStamp = sourceDigest({
    context,
    role: account.role,
    isAdmin: account.isAdmin,
    isSuperAdmin: account.isSuperAdmin,
    menus: account.menus,
    branchRole: account.branchRole,
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
          leaseExpiresAt: managed.leaseExpiresAt?.toISOString() ?? null,
          bindingLeaseExpiresAt:
            managed.binding.leaseExpiresAt?.toISOString() ?? null,
          grant: grants.find((g) => g.id === cls.eywaClassId) ?? null,
        }
      : null,
    memberships: memberships.map((m) => ({
      ...m,
      startsOn: m.startsOn?.toISOString() ?? null,
      endsOn: m.endsOn?.toISOString() ?? null,
      revokedAt: m.revokedAt?.toISOString() ?? null,
    })),
    enrollment: enrollment
      ? {
          id: enrollment.id,
          startsOn: enrollment.startsOn.toISOString(),
          endsOn: enrollment.endsOn?.toISOString() ?? null,
          onHold: enrollment.onHold,
          isTransferred: enrollment.isTransferred,
        }
      : null,
  });
  return {
    context,
    contextHash: sourceDigest(context),
    authorizationStamp,
    student: {
      id: student.id,
      useIndividualProgress: student.useIndividualProgress,
    },
    classGrade: cls.grade,
  };
}
