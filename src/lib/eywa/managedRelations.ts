import type { Prisma } from "@prisma/client";
import { DEFAULT_DIFFICULTY_RATIO } from "@/contracts/difficulty";
import {
  COLLECTION_KINDS,
  type Manifest,
  type SnapshotRows,
} from "./sync-contract";
import { buildUnitIndex } from "./resolveProgress";
import {
  classGradeOf,
  lastReportOf,
  planStudentProgress,
  schoolFieldsOf,
} from "./syncPlan";
import { deriveClassProgress } from "./deriveClassProgress";
import { enrollmentActive, kstRelationshipDay } from "./relationPolicy";

const date = (value: string | null) => (value ? new Date(value) : null);
const day = (value: string) => new Date(`${value}T00:00:00Z`);
export class RelationConflict extends Error {
  constructor(code: string) {
    super(code);
    this.name = "RelationConflict";
  }
}

/** Called only inside the receiver's locked transaction, after hash/typed-page validation and account apply. */
export async function applyEywaRelations(
  tx: Prisma.TransactionClient,
  manifest: Manifest,
  rows: SnapshotRows,
) {
  const bindingId = manifest.bindingId;
  const binding = await tx.eywaBinding.findUniqueOrThrow({
    where: { id: bindingId },
  });
  if (
    binding.targetBranchId !== manifest.targetBranchId ||
    binding.tenantId !== manifest.tenantId ||
    binding.sourceEpoch !== manifest.sourceEpoch
  )
    throw new RelationConflict("relation_binding_mismatch");
  if (
    !manifest.complete ||
    COLLECTION_KINDS.some(
      (kind) =>
        rows[kind].length !== manifest.collections[kind].total ||
        new Set(rows[kind].map((row) => row.id)).size !== rows[kind].length,
    )
  )
    throw new RelationConflict("incomplete_relation_snapshot");
  if (
    binding.mode !== "active" ||
    !binding.enabled ||
    !binding.healthy ||
    !manifest.control.enabled ||
    !manifest.control.healthy
  )
    return {
      applied: false,
      classes: 0,
      students: 0,
      memberships: 0,
      enrollments: 0,
      progress: 0,
      deferredStudents: 0,
      unresolvedProgress: 0,
    };
  if (
    BigInt(manifest.securityRevision) < binding.securityRevision ||
    BigInt(manifest.contentGeneration) < binding.contentGeneration
  )
    throw new RelationConflict("stale_relation_snapshot");

  const now = new Date();
  const conflicts: { entity: string; sourceId: string; code: string }[] = [];
  const accounts = await tx.eywaManagedAccount.findMany({
    where: {
      bindingId,
      status: "confirmed",
      endedAt: null,
      currentUserId: { not: null },
    },
  });
  const users = new Map(
    accounts
      .filter(
        (a) =>
          a.currentSourceUserId === a.sourceUserId &&
          a.currentUserId === a.userId,
      )
      .map((a) => [a.sourceUserId, a.currentUserId!]),
  );
  const classMap = new Map<string, string>();
  const sourceClasses = new Map(rows.classes.map((c) => [c.id, c]));
  const sourceStudents = new Map(rows.students.map((s) => [s.id, s]));
  for (const row of rows.memberships)
    if (!sourceClasses.has(row.classId))
      throw new RelationConflict("membership_class_missing");
  for (const row of rows.enrollments)
    if (!sourceClasses.has(row.classId) || !sourceStudents.has(row.studentId))
      throw new RelationConflict("enrollment_parent_missing");

  for (const row of rows.classes) {
    if (row.subject !== "math") throw new RelationConflict("non_math_class");
    const existing = await tx.class.findUnique({
      where: { eywaClassId: row.id },
    });
    if (
      existing &&
      ((existing.eywaBindingId && existing.eywaBindingId !== bindingId) ||
        existing.branchId !== binding.targetBranchId)
    ) {
      conflicts.push({
        entity: "class",
        sourceId: row.id,
        code: "class_branch_conflict",
      });
      continue;
    }
    const owner =
      existing?.userId ??
      (row.teacherId ? users.get(row.teacherId) : null) ??
      binding.archiveOwnerUserId;
    if (!owner) {
      conflicts.push({
        entity: "class",
        sourceId: row.id,
        code: "archive_owner_required",
      });
      continue;
    }
    const grades = rows.enrollments
      .filter((e) => e.classId === row.id)
      .map((e) => sourceStudents.get(e.studentId)?.grade ?? null);
    const data = {
      name: row.name.slice(0, 100),
      grade: (
        row.grade ??
        classGradeOf(grades) ??
        existing?.grade ??
        "중1"
      ).slice(0, 10),
      eywaBindingId: bindingId,
      branchId: binding.targetBranchId,
      permissionRevision: BigInt(row.permissionRevision),
      active: row.active,
      closedAt: date(row.closedAt),
    };
    const cls = await tx.class.upsert({
      where: { eywaClassId: row.id },
      update: data,
      create: {
        ...data,
        eywaClassId: row.id,
        userId: owner,
        difficultyRatio: DEFAULT_DIFFICULTY_RATIO,
      },
    });
    classMap.set(row.id, cls.id);
  }
  await tx.class.updateMany({
    where: {
      eywaBindingId: bindingId,
      eywaClassId: { notIn: rows.classes.map((c) => c.id) },
      active: true,
    },
    data: { active: false, closedAt: now },
  });

  const appliedMembershipIds: string[] = [];
  for (const row of rows.memberships) {
    const userId = users.get(row.userId);
    if (!userId || !classMap.has(row.classId)) continue; // Unconfirmed/conflicted identities never become access edges.
    const data = {
      classId: classMap.get(row.classId)!,
      userId,
      sourceUserId: row.userId,
      role: row.role,
      startsOn: row.startsOn ? day(row.startsOn) : null,
      endsOn: row.endsOn ? day(row.endsOn) : null,
      revokedAt: date(row.revokedAt),
      capabilities: row.capabilities,
    };
    await tx.classMembership.upsert({
      where: { bindingId_sourceId: { bindingId, sourceId: row.id } },
      create: { bindingId, sourceId: row.id, ...data },
      update: data,
    });
    appliedMembershipIds.push(row.id);
  }
  await tx.classMembership.updateMany({
    where: {
      bindingId,
      sourceId: { notIn: appliedMembershipIds },
      revokedAt: null,
    },
    data: { revokedAt: now },
  });

  const studentMap = new Map<string, string>();
  let deferredStudents = 0;
  for (const row of rows.students) {
    const existing = await tx.student.findUnique({
      where: { eywaStudentId: row.id },
    });
    if (
      existing &&
      ((existing.eywaBindingId && existing.eywaBindingId !== bindingId) ||
        existing.branchId !== binding.targetBranchId)
    ) {
      conflicts.push({
        entity: "student",
        sourceId: row.id,
        code: "student_branch_conflict",
      });
      continue;
    }
    const enrollments = rows.enrollments
      .filter((e) => e.studentId === row.id && classMap.has(e.classId))
      .sort(
        (a, b) =>
          b.startsOn.localeCompare(a.startsOn) || a.id.localeCompare(b.id),
      );
    const primary =
      enrollments.find((e) =>
        enrollmentActive(e, kstRelationshipDay(now), true),
      ) ?? enrollments[0];
    const classId =
      (primary && classMap.get(primary.classId)) ?? existing?.classId;
    if (!classId) {
      deferredStudents++;
      continue;
    } // No math enrollment: retain source identity in the verified inbox, do not invent a class.
    const school = schoolFieldsOf(row.grade);
    const data = {
      name: row.name.slice(0, 50),
      classId,
      branchId: binding.targetBranchId,
      eywaBindingId: bindingId,
      sourceStatus: row.status,
      isTest: row.isTest,
      useIndividualProgress: true,
      schoolName: row.school?.slice(0, 50) ?? null,
      ...school,
      eywaWithdrawnAt:
        row.status === "withdrawn" || row.isTest
          ? (existing?.eywaWithdrawnAt ?? now)
          : null,
    };
    const student = await tx.student.upsert({
      where: { eywaStudentId: row.id },
      update: data,
      create: { ...data, eywaStudentId: row.id, useIndividualProgress: true },
    });
    studentMap.set(row.id, student.id);
  }
  await tx.student.updateMany({
    where: {
      eywaBindingId: bindingId,
      eywaStudentId: { notIn: rows.students.map((s) => s.id) },
      eywaWithdrawnAt: null,
    },
    data: { eywaWithdrawnAt: now },
  });
  const appliedEnrollmentIds: string[] = [];
  for (const row of rows.enrollments) {
    const studentId = studentMap.get(row.studentId);
    if (!studentId || !classMap.has(row.classId)) continue;
    const last = lastReportOf(
      rows.progress.filter(
        (report) =>
          report.studentId === row.studentId &&
          (report.makeupClassId ?? report.classId) === row.classId &&
          enrollmentActive(row, report.reportDate, true),
      ),
    );
    const hasUnassignedReport = rows.progress.some(
      (report) =>
        report.studentId === row.studentId &&
        !report.classId &&
        !report.makeupClassId,
    );
    const reportFields =
      !last && hasUnassignedReport
        ? {}
        : {
            eywaLastReportDate: last ? day(last.date) : null,
            eywaLastReportText: last?.text ?? null,
          };
    const data = {
      ...reportFields,
      studentId,
      classId: classMap.get(row.classId)!,
      startsOn: day(row.startsOn),
      endsOn: row.endsOn ? day(row.endsOn) : null,
      onHold: row.onHold,
      isTransferred: row.isTransferred,
      attendanceDays: row.attendanceDays,
      endedAt: null,
    };
    await tx.studentEnrollment.upsert({
      where: { bindingId_sourceId: { bindingId, sourceId: row.id } },
      create: { bindingId, sourceId: row.id, ...data },
      update: data,
    });
    appliedEnrollmentIds.push(row.id);
  }
  await tx.studentEnrollment.updateMany({
    where: {
      bindingId,
      sourceId: { notIn: appliedEnrollmentIds },
      endedAt: null,
    },
    data: { endedAt: now },
  });

  const index = buildUnitIndex(
    await tx.unit.findMany({
      select: {
        id: true,
        grade: true,
        chapter: true,
        section: true,
        orderIndex: true,
      },
    }),
  );
  const groups = new Map<string, SnapshotRows["progress"]>();
  let unresolvedProgress = 0;
  const heldReportIds = new Set<string>();
  const heldClasses = new Set<string>();
  for (const report of rows.progress) {
    const classId = report.makeupClassId ?? report.classId;
    if (
      !classId ||
      !classMap.has(classId) ||
      !studentMap.has(report.studentId)
    ) {
      unresolvedProgress++;
      heldReportIds.add(report.id);
      continue;
    }
    // Report/class identity must be supported by an actual enrollment, including ended periods.
    if (
      !rows.enrollments.some(
        (e) =>
          e.studentId === report.studentId &&
          e.classId === classId &&
          enrollmentActive(e, report.reportDate, true),
      )
    ) {
      unresolvedProgress++;
      heldReportIds.add(report.id);
      continue;
    }
    const key = `${classId}/${report.studentId}`;
    groups.set(key, [...(groups.get(key) ?? []), report]);
  }
  // A missing report can be retired only after complete enumeration. Unresolved present reports retain their prior effective history.
  await tx.progress.updateMany({
    where: {
      class: { eywaBindingId: bindingId },
      studentId: { not: null },
      eywaReportId: { not: null, notIn: rows.progress.map((r) => r.id) },
      retiredAt: null,
    },
    data: { retiredAt: now },
  });
  let progress = 0;
  for (const [key, reports] of groups) {
    const [sourceClass, sourceStudent] = key.split("/");
    const plan = planStudentProgress(index, reports);
    unresolvedProgress += plan.unresolved.length + plan.ambiguous;
    if (plan.unresolved.length || plan.ambiguous) {
      heldClasses.add(classMap.get(sourceClass)!);
      continue;
    }
    const existing = await tx.progress.findMany({
      where: { eywaReportId: { in: reports.map((r) => r.id) } },
      include: { class: true },
    });
    if (
      existing.some(
        (r) =>
          r.class.eywaBindingId !== bindingId ||
          r.classId !== classMap.get(sourceClass) ||
          r.studentId !== studentMap.get(sourceStudent),
      )
    ) {
      heldClasses.add(classMap.get(sourceClass)!);
      for (const report of reports)
        conflicts.push({
          entity: "progress",
          sourceId: report.id,
          code: "progress_identity_conflict",
        });
      continue;
    }
    await tx.progress.updateMany({
      where: {
        class: { eywaBindingId: bindingId },
        eywaReportId: { in: reports.map((r) => r.id) },
        retiredAt: null,
      },
      data: { retiredAt: now },
    });
    for (const row of plan.rows) {
      const data = {
        classId: classMap.get(sourceClass)!,
        studentId: studentMap.get(sourceStudent)!,
        recordedAt: day(row.recordedAt),
        createdAt: row.createdAt,
        retiredAt: null,
      };
      await tx.progress.upsert({
        where: {
          eywaReportId_unitId: {
            eywaReportId: row.eywaReportId,
            unitId: row.unitId,
          },
        },
        create: { ...data, eywaReportId: row.eywaReportId, unitId: row.unitId },
        update: data,
      });
      progress++;
    }
  }
  // Preserve the existing class-progress behavior, using only the current operational roster.
  // The source class UUID remains the stable derived-row identity used by the legacy importer.
  const heldRows = heldReportIds.size
    ? await tx.progress.findMany({
        where: {
          class: { eywaBindingId: bindingId },
          eywaReportId: { in: [...heldReportIds] },
        },
        select: { classId: true },
      })
    : [];
  for (const row of heldRows) heldClasses.add(row.classId);
  const currentRoster = rows.enrollments.filter(
    (e) =>
      enrollmentActive(e, kstRelationshipDay(now)) &&
      sourceStudents.get(e.studentId)?.status !== "withdrawn" &&
      !sourceStudents.get(e.studentId)?.isTest &&
      studentMap.has(e.studentId),
  );
  let derivedProgress = 0;
  for (const [sourceClassId, classId] of classMap) {
    if (heldClasses.has(classId)) continue;
    const markerRows = await tx.progress.findMany({
      where: { eywaReportId: sourceClassId },
    });
    if (
      rows.progress.some((r) => r.id === sourceClassId) ||
      markerRows.some((r) => r.classId !== classId || r.studentId !== null)
    ) {
      conflicts.push({
        entity: "progress",
        sourceId: sourceClassId,
        code: "derived_progress_identity_conflict",
      });
      continue;
    }
    const rosterIds = [
      ...new Set(
        currentRoster
          .filter((e) => e.classId === sourceClassId)
          .map((e) => studentMap.get(e.studentId)!),
      ),
    ];
    const effective = await tx.progress.findMany({
      where: {
        classId,
        studentId: { in: rosterIds },
        eywaReportId: { not: null },
        retiredAt: null,
      },
    });
    const derived =
      new Set(effective.map((r) => r.studentId)).size === rosterIds.length
        ? deriveClassProgress(
            effective.map((r) => ({
              ...r,
              studentId: r.studentId!,
              eywaReportId: r.eywaReportId!,
            })),
            new Map([[classId, sourceClassId]]),
          ).rows
        : [];
    await tx.progress.updateMany({
      where: {
        classId,
        studentId: null,
        eywaReportId: sourceClassId,
        retiredAt: null,
      },
      data: { retiredAt: now },
    });
    for (const row of derived) {
      await tx.progress.upsert({
        where: {
          eywaReportId_unitId: {
            eywaReportId: row.eywaReportId,
            unitId: row.unitId,
          },
        },
        create: { ...row, retiredAt: null },
        update: { ...row, retiredAt: null },
      });
      derivedProgress++;
    }
  }
  return {
    applied: true,
    classes: classMap.size,
    students: studentMap.size,
    memberships: appliedMembershipIds.length,
    enrollments: appliedEnrollmentIds.length,
    progress,
    deferredStudents,
    unresolvedProgress,
    derivedProgress,
    conflicts,
  };
}
