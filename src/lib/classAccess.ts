import type { Class, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ScopeViewer } from "@/lib/ownerScope";
import {
  getManagedClassGrants,
  refreshManagedBinding,
} from "@/lib/eywa/managedAccounts";
import {
  currentClassGrantAllows,
  kstRelationshipDay,
  membershipAllows,
  type ClassCapability,
} from "@/lib/eywa/relationPolicy";

type Client = Pick<
  Prisma.TransactionClient,
  "class" | "classMembership" | "studentEnrollment"
>;
const denied: Prisma.ClassWhereInput = { id: { in: [] } };

/** Operational resources use their frozen branch, never the creator's current branch. */
export function legacyClassInScope(
  viewer: ScopeViewer,
  cls: Pick<Class, "userId" | "branchId" | "eywaBindingId">,
): boolean {
  if (viewer.isSuperAdmin === true) return true;
  if (cls.eywaBindingId)
    return (
      viewer.isAdmin === true &&
      !!viewer.branchId &&
      viewer.branchId === cls.branchId
    );
  if (cls.branchId && viewer.branchId !== cls.branchId) return false;
  return (
    cls.userId === viewer.id ||
    (viewer.isAdmin === true &&
      !!viewer.branchId &&
      viewer.branchId === cls.branchId)
  );
}

export async function accessibleClassesWhere(
  viewer: ScopeViewer,
  capability: ClassCapability = "class:read",
  options: { client?: Client; forceRefresh?: boolean; now?: Date } = {},
): Promise<Prisma.ClassWhereInput> {
  const client = options.client ?? db;
  const now = options.now ?? new Date();
  let managed;
  try {
    managed = await getManagedClassGrants(viewer.id, {
      forceRefresh: options.forceRefresh,
    });
  } catch {
    return denied;
  }
  if (managed) {
    if (managed.leaseExpiresAt.getTime() <= now.getTime()) return denied;
    if (
      managed.branchAdminScope &&
      viewer.isAdmin === true &&
      viewer.branchId === managed.branchAdminScope.branchId
    )
      return { branchId: managed.branchAdminScope.branchId };
    const rows = await client.classMembership.findMany({
      where: {
        userId: viewer.id,
        bindingId: managed.bindingId,
        revokedAt: null,
      },
      include: { class: true },
    });
    const grants = new Map(managed.sourceClasses.map((g) => [g.id, g]));
    const ids = rows
      .filter(
        (row) =>
          row.class.eywaBindingId === managed.bindingId &&
          row.class.branchId === viewer.branchId &&
          row.class.active &&
          (!row.class.closedAt || row.class.closedAt > now) &&
          membershipAllows(row, capability, now) &&
          currentClassGrantAllows(
            grants.get(row.class.eywaClassId ?? ""),
            row.class.eywaClassId,
            row.class.permissionRevision,
            capability,
            now,
          ),
      )
      .map((row) => row.classId);
    return {
      OR: [
        { id: { in: [...new Set(ids)] } },
        ...(viewer.branchId
          ? [
              {
                userId: viewer.id,
                branchId: viewer.branchId,
                eywaBindingId: null,
              },
            ]
          : []),
      ],
    };
  }
  if (viewer.isSuperAdmin === true) return {};
  if (viewer.isAdmin === true && viewer.branchId)
    return { branchId: viewer.branchId };
  return {
    eywaBindingId: null,
    userId: viewer.id,
    OR: [
      { branchId: null },
      ...(viewer.branchId ? [{ branchId: viewer.branchId }] : []),
    ],
  };
}

export async function classAccessAllowed(
  viewer: ScopeViewer,
  cls: Class,
  capability: ClassCapability = "class:read",
  options: { client?: Client; forceRefresh?: boolean; now?: Date } = {},
): Promise<boolean> {
  const client = options.client ?? db;
  if (!cls.eywaBindingId) {
    try {
      const managed = await getManagedClassGrants(viewer.id, {
        forceRefresh: options.forceRefresh,
      });
      if (managed)
        return (
          managed.leaseExpiresAt > (options.now ?? new Date()) &&
          !!viewer.branchId &&
          cls.branchId === viewer.branchId &&
          (cls.userId === viewer.id ||
            (viewer.isAdmin === true &&
              managed.branchAdminScope?.branchId === viewer.branchId))
        );
    } catch {
      return false;
    }
    return legacyClassInScope(viewer, cls);
  }
  const scope = await accessibleClassesWhere(viewer, capability, options);
  return !!(await client.class.findFirst({
    where: { AND: [{ id: cls.id }, scope] },
    select: { id: true },
  }));
}

export function currentEnrollmentWhere(
  day = kstRelationshipDay(),
  includeOnHold = false,
): Prisma.StudentEnrollmentWhereInput {
  const date = new Date(`${day}T00:00:00Z`);
  return {
    endedAt: null,
    startsOn: { lte: date },
    ...(includeOnHold ? {} : { onHold: false }),
    OR: [
      { endsOn: null },
      { isTransferred: false, endsOn: { gte: date } },
      { isTransferred: true, endsOn: { gt: date } },
    ],
  };
}

/** A managed student's compatibility classId is never an authorization edge. */
export async function accessibleStudentsWhere(
  viewer: ScopeViewer,
  capability: ClassCapability = "student:read",
): Promise<Prisma.StudentWhereInput> {
  const scope = await accessibleClassesWhere(viewer, capability);
  return {
    OR: [
      { eywaBindingId: null, class: scope },
      {
        eywaBindingId: { not: null },
        isTest: false,
        eywaWithdrawnAt: null,
        enrollments: {
          some: {
            ...currentEnrollmentWhere(
              undefined,
              capability.endsWith(":read") || capability === "student:account",
            ),
            class: scope,
          },
        },
      },
    ],
  };
}

export function studentsInClassWhere(
  classId: string,
  includeOnHold = true,
): Prisma.StudentWhereInput {
  return {
    OR: [
      { eywaBindingId: null, classId },
      {
        eywaBindingId: { not: null },
        isTest: false,
        eywaWithdrawnAt: null,
        enrollments: {
          some: {
            classId,
            ...currentEnrollmentWhere(undefined, includeOnHold),
          },
        },
      },
    ],
  };
}

/** Student sessions keep their own policy; a teacher's departure does not disable the learner. */
export async function activeStudentClassIds(
  studentId: string,
  client: Prisma.TransactionClient = db,
): Promise<string[]> {
  const student = await client.student.findUnique({ where: { id: studentId } });
  if (!student || student.eywaWithdrawnAt || student.isTest) return [];
  if (!student.eywaBindingId) return [student.classId];
  let binding = await client.eywaBinding.findUnique({
    where: { id: student.eywaBindingId },
  });
  if (
    binding &&
    !binding.retiredAt &&
    (!binding.leaseExpiresAt || binding.leaseExpiresAt.getTime() <= Date.now())
  ) {
    try {
      await refreshManagedBinding(binding.id);
    } catch {
      return [];
    }
    binding = await client.eywaBinding.findUnique({
      where: { id: student.eywaBindingId },
    });
  }
  if (
    !binding ||
    !binding.enabled ||
    !binding.healthy ||
    binding.mode !== "active" ||
    binding.retiredAt ||
    !binding.leaseExpiresAt ||
    binding.leaseExpiresAt.getTime() <= Date.now()
  )
    return [];
  const rows = await client.studentEnrollment.findMany({
    where: {
      studentId,
      bindingId: binding.id,
      ...currentEnrollmentWhere(),
      class: {
        branchId: binding.targetBranchId,
        eywaBindingId: binding.id,
        active: true,
        OR: [{ closedAt: null }, { closedAt: { gt: new Date() } }],
      },
    },
    select: { classId: true },
  });
  return [...new Set(rows.map((e) => e.classId))];
}

function operationalRosterWhere(
  classIds: string[],
  includeOnHold: boolean,
): Prisma.StudentWhereInput {
  return {
    eywaWithdrawnAt: null,
    OR: [
      { eywaBindingId: null, classId: { in: classIds } },
      {
        eywaBindingId: { not: null },
        isTest: false,
        eywaWithdrawnAt: null,
        enrollments: {
          some: {
            classId: { in: classIds },
            ...currentEnrollmentWhere(undefined, includeOnHold),
          },
        },
      },
    ],
  };
}

/** One row per actual (class, student) enrollment, retaining the single Student identity. */
export async function loadOperationalRoster(
  classIds: string[],
  includeOnHold = false,
) {
  if (!classIds.length) return [];
  const students = await db.student.findMany({
    where: operationalRosterWhere(classIds, includeOnHold),
    include: {
      class: true,
      studentAccount: {
        select: { id: true, disabledAt: true, createdAt: true },
      },
      enrollments: {
        where: {
          classId: { in: classIds },
          ...currentEnrollmentWhere(undefined, includeOnHold),
        },
        include: { class: true },
      },
    },
  });
  return students.flatMap((student) =>
    student.eywaBindingId
      ? [
          ...new Map(
            student.enrollments.map((e) => [
              e.classId,
              {
                ...student,
                classId: e.classId,
                class: e.class,
                eywaLastReportDate: e.eywaLastReportDate,
                eywaLastReportText: e.eywaLastReportText,
              },
            ]),
          ).values(),
        ]
      : [student],
  );
}

/** Teacher status boards need identities, not every student's report text and class settings.
 * Enrollment/withdrawal/on-hold rules are shared with the full operational roster above. */
export async function loadOperationalRosterSummary(
  classes: readonly { id: string; name: string; grade?: string | null }[],
  includeOnHold = false,
) {
  const classIds = classes.map((cls) => cls.id);
  if (!classIds.length) return [];
  const classById = new Map(classes.map((cls) => [cls.id, cls]));
  const students = await db.student.findMany({
    where: operationalRosterWhere(classIds, includeOnHold),
    select: {
      id: true,
      name: true,
      classId: true,
      branchId: true,
      createdAt: true,
      eywaBindingId: true,
      eywaWithdrawnAt: true,
      studentAccount: {
        select: { id: true, disabledAt: true, createdAt: true },
      },
      enrollments: {
        where: {
          classId: { in: classIds },
          ...currentEnrollmentWhere(undefined, includeOnHold),
        },
        select: { classId: true },
      },
    },
  });
  return students.flatMap((student) => {
    const enrolledClassIds = student.eywaBindingId
      ? [...new Set(student.enrollments.map((e) => e.classId))]
      : [student.classId];
    return enrolledClassIds.map((classId) => ({
      ...student,
      classId,
      class: classById.get(classId)!,
    }));
  });
}

export async function accessibleTestsWhere(
  viewer: ScopeViewer,
  capability: ClassCapability = "test:read",
): Promise<Prisma.TestWhereInput> {
  const scope = await accessibleClassesWhere(viewer, capability);
  return {
    OR: [
      { predictionRunId: { not: null }, userId: viewer.id },
      { predictionRunId: null, class: scope },
    ],
  };
}

/** Recheck after generation and hold the class row through the operational write. */
export async function assertClassWrite(
  tx: Prisma.TransactionClient,
  viewer: ScopeViewer,
  classId: string,
  capability: ClassCapability,
): Promise<void> {
  const initial = await tx.class.findUnique({ where: { id: classId } });
  if (!initial) throw new ClassAccessDenied();
  if (!initial.eywaBindingId) {
    if (
      !(await classAccessAllowed(viewer, initial, capability, {
        client: tx,
        forceRefresh: true,
      }))
    )
      throw new ClassAccessDenied();
    return;
  }
  // Refresh before the class lock (the receiver locks binding before class).
  try {
    await getManagedClassGrants(viewer.id, { forceRefresh: true });
  } catch {
    throw new ClassAccessDenied();
  }
  await tx.$queryRaw`SELECT id FROM class WHERE id = ${classId}::uuid FOR SHARE`;
  const cls = await tx.class.findUnique({ where: { id: classId } });
  if (
    !cls ||
    !(await classAccessAllowed(viewer, cls, capability, { client: tx }))
  ) {
    throw new ClassAccessDenied();
  }
}

export class ClassAccessDenied extends Error {
  constructor() {
    super("반 접근 권한이 변경되었습니다. 다시 불러와 주세요.");
    this.name = "ClassAccessDenied";
  }
}

/** Call after assertClassWrite so manifest application cannot move the roster until commit. */
export async function assertStudentEnrollment(
  tx: Prisma.TransactionClient,
  studentId: string,
  classId: string,
  includeOnHold = false,
): Promise<void> {
  const student = await tx.student.findUnique({ where: { id: studentId } });
  if (!student || student.eywaWithdrawnAt || student.isTest)
    throw new ClassAccessDenied();
  if (!student.eywaBindingId) {
    if (student.classId !== classId) throw new ClassAccessDenied();
    return;
  }
  const enrollment = await tx.studentEnrollment.findFirst({
    where: {
      studentId,
      classId,
      bindingId: student.eywaBindingId,
      ...currentEnrollmentWhere(undefined, includeOnHold),
      class: {
        eywaBindingId: student.eywaBindingId,
        branchId: student.branchId,
      },
    },
  });
  if (!enrollment) throw new ClassAccessDenied();
}
