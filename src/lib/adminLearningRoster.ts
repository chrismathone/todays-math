import "server-only";
import type { Prisma } from "@prisma/client";
import type {
  AdminBranchLearningStudent,
  ClassIssuanceSummary,
} from "@/contracts/adminBranchLearning.contract";
import { currentEnrollmentWhere } from "@/lib/classAccess";
import { kstRelationshipDay } from "@/lib/eywa/relationPolicy";
import {
  compareRosterNames,
  studentAccountLoginState,
} from "@/lib/adminStudentRoster";

const classSelect = {
  id: true,
  name: true,
  grade: true,
  branchId: true,
  eywaBindingId: true,
  active: true,
  closedAt: true,
} satisfies Prisma.ClassSelect;

export type AdminLearningRosterEntry = {
  student: AdminBranchLearningStudent;
  /** Current issuance roster, independent of a directory's search/login filters. */
  countedClassIds: string[];
};

/** Stored relationships only. Neither source synchronization nor account issuance runs here. */
export async function readAdminLearningRoster(
  tx: Prisma.TransactionClient,
  branchId: string | null,
  now: Date,
  classIds?: string[],
): Promise<AdminLearningRosterEntry[]> {
  const enrollmentScope: Prisma.StudentEnrollmentWhereInput = {
    ...currentEnrollmentWhere(kstRelationshipDay(now), true),
    class: {
      branchId,
      active: true,
      OR: [{ closedAt: null }, { closedAt: { gt: now } }],
      ...(classIds ? { id: { in: classIds } } : {}),
    },
  };
  const rows = await tx.student.findMany({
    where: {
      branchId,
      isTest: false,
      ...(classIds
        ? {
            OR: [
              { eywaBindingId: null, classId: { in: classIds } },
              {
                eywaBindingId: { not: null },
                enrollments: { some: enrollmentScope },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      useIndividualProgress: true,
      createdAt: true,
      updatedAt: true,
      branchId: true,
      eywaBindingId: true,
      eywaWithdrawnAt: true,
      sourceStatus: true,
      schoolLevel: true,
      schoolGrade: true,
      class: { select: classSelect },
      studentAccount: {
        select: {
          loginId: true,
          disabledAt: true,
          lockedUntil: true,
          issuedAt: true,
          lastLoginAt: true,
        },
      },
      enrollments: {
        where: enrollmentScope,
        orderBy: [{ classId: "asc" }, { onHold: "asc" }, { id: "asc" }],
        select: {
          bindingId: true,
          onHold: true,
          class: { select: classSelect },
        },
      },
    },
  });
  return rows.map((s) => {
    const withdrawn = !!s.eywaWithdrawnAt || s.sourceStatus === "withdrawn";
    const classes = new Map<
      string,
      AdminBranchLearningStudent["classes"][number]
    >();
    const grades = new Set<string>();
    const countedClassIds = new Set<string>();
    // Match the existing issuance policy: only real, currently enrolled, non-on-hold students.
    const eligible =
      !withdrawn && (s.sourceStatus === null || s.sourceStatus === "enrolled");
    if (s.eywaBindingId) {
      for (const e of s.enrollments) {
        if (
          e.bindingId !== s.eywaBindingId ||
          e.class.eywaBindingId !== s.eywaBindingId ||
          e.class.branchId !== branchId
        )
          continue;
        // A duplicated source enrollment cannot duplicate a student or hide a non-on-hold edge.
        if (!classes.has(e.class.id) || !e.onHold)
          classes.set(e.class.id, {
            id: e.class.id,
            name: e.class.name,
            membership: e.onHold ? "on-hold" : "enrolled",
          });
        if (e.class.grade) grades.add(e.class.grade);
        if (eligible && !e.onHold) countedClassIds.add(e.class.id);
      }
    } else if (
      s.class.branchId === branchId &&
      !s.class.eywaBindingId &&
      (!classIds || classIds.includes(s.class.id))
    ) {
      classes.set(s.class.id, {
        id: s.class.id,
        name: s.class.name,
        membership: "legacy",
      });
      if (s.class.grade) grades.add(s.class.grade);
      if (
        eligible &&
        s.class.active &&
        (!s.class.closedAt || s.class.closedAt > now)
      )
        countedClassIds.add(s.class.id);
    }
    const visibleClasses = [...classes.values()].sort(
      (a, b) => compareRosterNames(a.name, b.name) || a.id.localeCompare(b.id),
    );
    const login = studentAccountLoginState(s.studentAccount, now);
    return {
      countedClassIds: [...countedClassIds],
      student: {
        id: s.id,
        name: s.name,
        classId: visibleClasses[0]?.id ?? null,
        useIndividualProgress: s.useIndividualProgress,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        sourceManaged: !!s.eywaBindingId,
        withdrawn,
        grade:
          s.schoolLevel && s.schoolGrade
            ? `${s.schoolLevel}${s.schoolGrade}`
            : grades.size === 1
              ? [...grades][0]
              : null,
        login,
        account: s.studentAccount
          ? {
              loginId: s.studentAccount.loginId,
              status: login as "disabled" | "locked" | "enabled",
              issuedAt: s.studentAccount.issuedAt.toISOString(),
              lastLoginAt: s.studentAccount.lastLoginAt?.toISOString() ?? null,
            }
          : null,
        classes: visibleClasses,
      },
    };
  });
}

export function summarizeAdminLearningRoster(
  entries: AdminLearningRosterEntry[],
  classIds: string[],
) {
  const summaries = new Map<string, ClassIssuanceSummary>(
    classIds.map((id) => [id, { total: 0, issued: 0, unissued: 0 }]),
  );
  const seen = new Map<string, Set<string>>();
  for (const { student, countedClassIds } of entries) {
    for (const classId of countedClassIds) {
      const summary = summaries.get(classId);
      const ids = seen.get(classId) ?? new Set<string>();
      if (!summary || ids.has(student.id)) continue;
      ids.add(student.id);
      seen.set(classId, ids);
      summary.total++;
      if (student.account) summary.issued++;
      else summary.unissued++;
    }
  }
  return summaries;
}

export async function readAdminClassIssuanceSummaries(
  tx: Prisma.TransactionClient,
  branchId: string | null,
  classIds: string[],
  now: Date,
) {
  if (!classIds.length) return new Map<string, ClassIssuanceSummary>();
  const classScope: Prisma.ClassWhereInput = {
    id: { in: classIds },
    branchId,
    active: true,
    OR: [{ closedAt: null }, { closedAt: { gt: now } }],
  };
  const enrollmentScope: Prisma.StudentEnrollmentWhereInput = {
    ...currentEnrollmentWhere(kstRelationshipDay(now), false),
    class: classScope,
  };
  // Relationship detail rows need counts only, so no login identifiers or account dates are loaded.
  const rows = await tx.student.findMany({
    where: {
      branchId,
      isTest: false,
      eywaWithdrawnAt: null,
      AND: [
        { OR: [{ sourceStatus: null }, { sourceStatus: "enrolled" }] },
        {
          OR: [
            {
              eywaBindingId: null,
              class: { AND: [classScope, { eywaBindingId: null }] },
            },
            {
              eywaBindingId: { not: null },
              enrollments: { some: enrollmentScope },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      eywaBindingId: true,
      classId: true,
      class: { select: { branchId: true, eywaBindingId: true } },
      studentAccount: { select: { studentId: true } },
      enrollments: {
        where: enrollmentScope,
        select: {
          bindingId: true,
          classId: true,
          class: { select: { branchId: true, eywaBindingId: true } },
        },
      },
    },
  });
  const summaries = new Map<string, ClassIssuanceSummary>(
    classIds.map((id) => [id, { total: 0, issued: 0, unissued: 0 }]),
  );
  const seen = new Map<string, Set<string>>();
  for (const s of rows) {
    const ids = s.eywaBindingId
      ? s.enrollments
          .filter(
            (e) =>
              e.bindingId === s.eywaBindingId &&
              e.class.eywaBindingId === s.eywaBindingId &&
              e.class.branchId === branchId,
          )
          .map((e) => e.classId)
      : s.class.branchId === branchId && !s.class.eywaBindingId
        ? [s.classId]
        : [];
    for (const classId of ids) {
      const summary = summaries.get(classId);
      const students = seen.get(classId) ?? new Set<string>();
      if (!summary || students.has(s.id)) continue;
      students.add(s.id);
      seen.set(classId, students);
      summary.total++;
      if (s.studentAccount) summary.issued++;
      else summary.unissued++;
    }
  }
  return summaries;
}
