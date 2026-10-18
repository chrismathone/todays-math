import type { Prisma, Progress } from "@prisma/client";
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
const RELATION_BATCH_SIZE = 500;
function* batches<T>(rows: readonly T[]) {
  for (let offset = 0; offset < rows.length; offset += RELATION_BATCH_SIZE)
    yield rows.slice(offset, offset + RELATION_BATCH_SIZE);
}
function sameValue(current: unknown, desired: unknown): boolean {
  if (desired instanceof Date)
    return current instanceof Date && current.getTime() === desired.getTime();
  if (Array.isArray(desired))
    return (
      Array.isArray(current) &&
      current.length === desired.length &&
      desired.every((value, offset) => sameValue(current[offset], value))
    );
  return current === desired;
}
/** Compare only source-owned fields; local IDs, authors and unrelated fields remain intact. */
function sameFields(current: object, desired: object) {
  const values = current as Record<string, unknown>;
  return Object.entries(desired).every(([field, value]) =>
    sameValue(values[field], value),
  );
}
type ManagedProgressRow = Pick<
  Progress,
  "classId" | "studentId" | "unitId" | "recordedAt" | "createdAt"
> & { eywaReportId: string };
type ProgressChanges = {
  retireIds: string[];
  createRows: ManagedProgressRow[];
  updateRows: { id: string; row: ManagedProgressRow }[];
};
const progressChanges = (): ProgressChanges => ({
  retireIds: [],
  createRows: [],
  updateRows: [],
});
const progressIdentity = (row: Pick<Progress, "eywaReportId" | "unitId">) =>
  `${row.eywaReportId}/${row.unitId}`;

/** Identity/ownership must be checked by the caller before planning any writes. */
function reconcileProgress(
  existing: readonly Progress[],
  planned: readonly ManagedProgressRow[],
  changes: ProgressChanges,
) {
  const desired = new Map(planned.map((row) => [progressIdentity(row), row]));
  const current = new Map(existing.map((row) => [progressIdentity(row), row]));
  for (const row of existing)
    if (row.retiredAt === null && !desired.has(progressIdentity(row)))
      changes.retireIds.push(row.id);
  for (const [identity, row] of desired) {
    const old = current.get(identity);
    if (!old) changes.createRows.push(row);
    else if (
      old.retiredAt !== null ||
      old.classId !== row.classId ||
      old.studentId !== row.studentId ||
      old.recordedAt.getTime() !== row.recordedAt.getTime() ||
      old.createdAt.getTime() !== row.createdAt.getTime()
    )
      changes.updateRows.push({ id: old.id, row });
  }
}

/** Bounded bulk writes stay inside the receiver's existing atomic transaction. */
async function applyProgressChanges(
  tx: Prisma.TransactionClient,
  changes: ProgressChanges,
  now: Date,
) {
  for (const ids of batches(changes.retireIds))
    await tx.progress.updateMany({
      where: {
        id: { in: ids },
        retiredAt: null,
      },
      data: { retiredAt: now },
    });
  for (const rows of batches(changes.createRows))
    await tx.progress.createMany({
      data: rows.map((row) => ({ ...row, retiredAt: null })),
    });
  for (const { id, row } of changes.updateRows)
    await tx.progress.update({
      where: { id },
      data: { ...row, retiredAt: null },
    });
}

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
  const operationalClasses = new Set(
    rows.classes
      .filter(
        (row) =>
          row.active &&
          (!row.closedAt || Date.parse(row.closedAt) > now.getTime()),
      )
      .map((row) => row.id),
  );
  const sourceStudents = new Map(rows.students.map((s) => [s.id, s]));
  const operationalSourceStudents = new Set(
    rows.enrollments
      .filter((row) => operationalClasses.has(row.classId))
      .map((row) => row.studentId),
  );
  for (const row of rows.memberships)
    if (!sourceClasses.has(row.classId))
      throw new RelationConflict("membership_class_missing");
  for (const row of rows.enrollments)
    if (!sourceClasses.has(row.classId) || !sourceStudents.has(row.studentId))
      throw new RelationConflict("enrollment_parent_missing");

  // Include UUID collisions outside this binding so bulk reads preserve identity checks.
  const existingClasses = await tx.class.findMany({
    where: {
      OR: [
        { eywaBindingId: bindingId },
        { eywaClassId: { in: [...sourceClasses.keys()] } },
      ],
    },
  });
  const classesBySource = new Map(
    existingClasses.map((row) => [row.eywaClassId, row]),
  );
  for (const row of rows.classes) {
    if (row.subject !== "math") throw new RelationConflict("non_math_class");
    const existing = classesBySource.get(row.id);
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
    // Closed source classes are history, never new roster/progress imports.
    // Existing identities remain available for past tests and reports.
    if (!operationalClasses.has(row.id)) {
      if (existing) {
        const data = {
          active: false,
          closedAt: date(row.closedAt) ?? existing.closedAt ?? now,
        };
        if (!sameFields(existing, data))
          await tx.class.update({ where: { id: existing.id }, data });
      }
      continue;
    }
    // 담당 교사가 없는(또는 계정이 연결되지 않은) 새 반은 넘기지 않는다 — 충돌이 아니라 «아직 대상 아님»
    // (원장님 2026-10-18). 이미 넘어온 반은 그대로 둔다. 교사의 접근은 `userId`(처음 만든 사람)가 아니라
    // 에이와 담당 배정(classMembership)이 정하므로, 에이와에서 담당을 바꾸면 다음 동기화에 접근이 옮겨 간다.
    const teacherOwner = row.teacherId
      ? (users.get(row.teacherId) ?? null)
      : null;
    if (!teacherOwner && !existing) continue;
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
    const cls =
      existing && sameFields(existing, data)
        ? existing
        : await tx.class.upsert({
            where: { eywaClassId: row.id },
            update: data,
            create: {
              ...data,
              eywaClassId: row.id,
              userId: teacherOwner!,
              difficultyRatio: DEFAULT_DIFFICULTY_RATIO,
            },
          });
    classMap.set(row.id, cls.id);
  }
  const absentClasses = existingClasses.filter(
    (row) =>
      row.eywaBindingId === bindingId &&
      (sourceClasses.size === 0 ||
        (row.eywaClassId !== null && !sourceClasses.has(row.eywaClassId))) &&
      row.active,
  );
  for (const group of batches(absentClasses))
    await tx.class.updateMany({
      where: { id: { in: group.map((row) => row.id) }, active: true },
      data: { active: false, closedAt: now },
    });

  const existingMemberships = await tx.classMembership.findMany({
    where: { bindingId },
  });
  const membershipsBySource = new Map(
    existingMemberships.map((row) => [row.sourceId, row]),
  );
  const newMemberships: Prisma.ClassMembershipCreateManyInput[] = [];
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
    const existing = membershipsBySource.get(row.id);
    if (!existing)
      newMemberships.push({ bindingId, sourceId: row.id, ...data });
    else if (!sameFields(existing, data))
      await tx.classMembership.update({ where: { id: existing.id }, data });
    appliedMembershipIds.push(row.id);
  }
  for (const data of batches(newMemberships))
    await tx.classMembership.createMany({ data });
  const membershipIds = new Set(appliedMembershipIds);
  const absentMemberships = existingMemberships.filter(
    (row) => row.revokedAt === null && !membershipIds.has(row.sourceId),
  );
  for (const group of batches(absentMemberships))
    await tx.classMembership.updateMany({
      where: { id: { in: group.map((row) => row.id) }, revokedAt: null },
      data: { revokedAt: now },
    });

  const studentMap = new Map<string, string>();
  const operationalLocalClasses = new Set(classMap.values());
  const existingStudents = await tx.student.findMany({
    where: {
      OR: [
        { eywaBindingId: bindingId },
        { eywaStudentId: { in: [...sourceStudents.keys()] } },
      ],
    },
  });
  const studentsBySource = new Map(
    existingStudents.map((row) => [row.eywaStudentId, row]),
  );
  let deferredStudents = 0;
  for (const row of rows.students) {
    const existing = studentsBySource.get(row.id);
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
      (primary && classMap.get(primary.classId)) ??
      (existing && operationalLocalClasses.has(existing.classId)
        ? existing.classId
        : null);
    if (!classId) {
      deferredStudents++;
      continue;
    } // No math enrollment: retain source identity in the verified inbox, do not invent a class.
    const school = schoolFieldsOf(row.grade);
    const data = {
      name: row.name.slice(0, 50),
      ...(row.phoneLast4 !== undefined ? { phoneLast4: row.phoneLast4 } : {}),
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
    const student =
      existing && sameFields(existing, data)
        ? existing
        : await tx.student.upsert({
            where: { eywaStudentId: row.id },
            update: data,
            create: {
              ...data,
              eywaStudentId: row.id,
              useIndividualProgress: true,
            },
          });
    studentMap.set(row.id, student.id);
  }
  const absentStudents = existingStudents.filter(
    (row) =>
      row.eywaBindingId === bindingId &&
      (sourceStudents.size === 0 ||
        (row.eywaStudentId !== null &&
          (!sourceStudents.has(row.eywaStudentId) ||
            (!studentMap.has(row.eywaStudentId) &&
              !operationalSourceStudents.has(row.eywaStudentId))))) &&
      row.eywaWithdrawnAt === null,
  );
  for (const group of batches(absentStudents))
    await tx.student.updateMany({
      where: { id: { in: group.map((row) => row.id) }, eywaWithdrawnAt: null },
      data: { eywaWithdrawnAt: now },
    });
  const existingEnrollments = await tx.studentEnrollment.findMany({
    where: { bindingId },
  });
  const enrollmentsBySource = new Map(
    existingEnrollments.map((row) => [row.sourceId, row]),
  );
  const newEnrollments: Prisma.StudentEnrollmentCreateManyInput[] = [];
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
    const existing = enrollmentsBySource.get(row.id);
    if (!existing)
      newEnrollments.push({ bindingId, sourceId: row.id, ...data });
    else if (!sameFields(existing, data))
      await tx.studentEnrollment.update({ where: { id: existing.id }, data });
    appliedEnrollmentIds.push(row.id);
  }
  for (const data of batches(newEnrollments))
    await tx.studentEnrollment.createMany({ data });
  const enrollmentIds = new Set(appliedEnrollmentIds);
  const absentEnrollments = existingEnrollments.filter(
    (row) => row.endedAt === null && !enrollmentIds.has(row.sourceId),
  );
  for (const group of batches(absentEnrollments))
    await tx.studentEnrollment.updateMany({
      where: { id: { in: group.map((row) => row.id) }, endedAt: null },
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
      classId &&
      sourceClasses.has(classId) &&
      !operationalClasses.has(classId)
    )
      continue;
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
  const studentChanges = progressChanges();
  const reportIds = new Set(rows.progress.map((row) => row.id));
  const existingProgress = await tx.progress.findMany({
    where: {
      OR: [
        { class: { eywaBindingId: bindingId }, eywaReportId: { not: null } },
        { eywaReportId: { in: [...reportIds, ...sourceClasses.keys()] } },
      ],
    },
    include: { class: true },
  });
  const progressByReport = new Map<string, typeof existingProgress>();
  for (const row of existingProgress) {
    if (row.eywaReportId === null) continue;
    const group = progressByReport.get(row.eywaReportId) ?? [];
    group.push(row);
    progressByReport.set(row.eywaReportId, group);
    if (
      row.class.eywaBindingId === bindingId &&
      operationalLocalClasses.has(row.classId) &&
      row.studentId !== null &&
      row.retiredAt === null &&
      !reportIds.has(row.eywaReportId)
    )
      studentChanges.retireIds.push(row.id);
  }
  let progress = 0;
  for (const [key, reports] of groups) {
    const [sourceClass, sourceStudent] = key.split("/");
    const plan = planStudentProgress(index, reports);
    unresolvedProgress += plan.unresolved.length + plan.ambiguous;
    if (plan.unresolved.length || plan.ambiguous) {
      heldClasses.add(classMap.get(sourceClass)!);
      continue;
    }
    const existing = reports.flatMap(
      (row) => progressByReport.get(row.id) ?? [],
    );
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
    reconcileProgress(
      existing,
      plan.rows.map((row) => ({
        eywaReportId: row.eywaReportId,
        unitId: row.unitId,
        classId: classMap.get(sourceClass)!,
        studentId: studentMap.get(sourceStudent)!,
        recordedAt: day(row.recordedAt),
        createdAt: row.createdAt,
      })),
      studentChanges,
    );
    progress += plan.rows.length;
  }
  await applyProgressChanges(tx, studentChanges, now);
  // Preserve the existing class-progress behavior, using only the current operational roster.
  // The source class UUID remains the stable derived-row identity used by the legacy importer.
  for (const reportId of heldReportIds)
    for (const row of progressByReport.get(reportId) ?? [])
      if (row.class.eywaBindingId === bindingId) heldClasses.add(row.classId);
  const currentRoster = rows.enrollments.filter(
    (e) =>
      enrollmentActive(e, kstRelationshipDay(now)) &&
      sourceStudents.get(e.studentId)?.status !== "withdrawn" &&
      !sourceStudents.get(e.studentId)?.isTest &&
      studentMap.has(e.studentId),
  );
  let derivedProgress = 0;
  const derivedChanges = progressChanges();
  for (const [sourceClassId, classId] of classMap) {
    if (heldClasses.has(classId)) continue;
    const markerRows = progressByReport.get(sourceClassId) ?? [];
    if (
      reportIds.has(sourceClassId) ||
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
    reconcileProgress(markerRows, derived, derivedChanges);
    derivedProgress += derived.length;
  }
  await applyProgressChanges(tx, derivedChanges, now);
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
