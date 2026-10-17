import { refreshManagedBinding } from "./managedAccounts";
import { db } from "@/lib/db";
import { enrollmentActive } from "./relationPolicy";
import { buildRecentTests, type RecentTest } from "./managedStudentRecentTests";

/** Minimal existing learning summary, not a reverse results synchronization writer. `recentTests` is read-only (2026-10-17). */
export async function getEywaStudentStatus(
  bindingId: string,
  sourceStudentId: string,
) {
  let binding = await db.eywaBinding.findUnique({ where: { id: bindingId } });
  if (
    binding &&
    !binding.retiredAt &&
    (!binding.leaseExpiresAt || binding.leaseExpiresAt.getTime() <= Date.now())
  ) {
    await refreshManagedBinding(binding.id);
    binding = await db.eywaBinding.findUnique({ where: { id: bindingId } });
  }
  const empty = {
    bindingId,
    sourceStudentId,
    linked: false,
    mode:
      binding?.mode === "active" ? ("active" as const) : ("shadow" as const),
    classes: [] as { sourceClassId: string; name: string; active: boolean }[],
    tests: { assigned: 0, completed: 0 },
    recentTests: [] as RecentTest[],
    lastActivityAt: null as string | null,
  };
  if (
    !binding ||
    binding.retiredAt ||
    !binding.enabled ||
    !binding.healthy ||
    binding.mode !== "active" ||
    !binding.leaseExpiresAt ||
    binding.leaseExpiresAt.getTime() <= Date.now()
  )
    return empty;
  const student = await db.student.findFirst({
    where: {
      eywaStudentId: sourceStudentId,
      eywaBindingId: bindingId,
      branchId: binding.targetBranchId,
      isTest: false,
    },
    include: {
      enrollments: {
        where: {
          bindingId,
          class: { eywaBindingId: bindingId, branchId: binding.targetBranchId },
        },
        include: { class: true },
      },
    },
  });
  if (!student) return empty;
  const current = student.enrollments.filter(
    (e) =>
      !student.eywaWithdrawnAt &&
      enrollmentActive(e, undefined, true) &&
      e.class.active &&
      (!e.class.closedAt || e.class.closedAt.getTime() > Date.now()),
  );
  const active = current.filter((e) => !e.onHold);
  const classIds = [...new Set(active.map((e) => e.classId))];
  const tests = await db.test.findMany({
    where: {
      predictionRunId: null,
      status: { in: ["confirmed", "printed"] },
      class: { eywaBindingId: bindingId, branchId: binding.targetBranchId },
      OR: [
        { studentId: student.id },
        { studentId: null, classId: { in: classIds } },
      ],
    },
    select: {
      id: true,
      classId: true,
      testType: true,
      testDate: true,
      publicationId: true,
      rangeEndUnitId: true,
    },
  });
  const allResults = await db.testResult.findMany({
    where: { studentId: student.id, testId: { in: tests.map((t) => t.id) } },
    select: { id: true, testId: true, absent: true, score: true, takenAt: true },
  });
  const results = allResults.filter((r) => !r.absent);
  const recentTests = await buildRecentTests(tests, allResults);
  const last = results.map((r) => r.takenAt.getTime()).sort((a, b) => b - a)[0];
  return {
    ...empty,
    linked: true,
    classes: [
      ...new Map(
        student.enrollments
          .filter((e) => e.class.eywaClassId)
          .map((e) => [
            e.classId,
            {
              sourceClassId: e.class.eywaClassId!,
              name: e.class.name,
              active: current.some((a) => a.classId === e.classId),
            },
          ]),
      ).values(),
    ],
    tests: {
      assigned: tests.length,
      completed: new Set(results.map((r) => r.testId)).size,
    },
    recentTests,
    lastActivityAt: last === undefined ? null : new Date(last).toISOString(),
  };
}
