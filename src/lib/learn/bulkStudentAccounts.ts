import "server-only";
import type { Prisma } from "@prisma/client";
import type { ScopeViewer } from "@/lib/ownerScope";
import type {
  BulkStudentAccountResult,
  BulkStudentAccountSummary,
} from "@/contracts/bulkStudentAccount.contract";
import { studentLoginIdSchema } from "@/contracts/studentAccount.contract";
import { db } from "@/lib/db";
import { auditData } from "@/lib/audit";
import { currentEnrollmentWhere } from "@/lib/classAccess";
import { refreshManagedBinding } from "@/lib/eywa/managedAccounts";
import { kstRelationshipDay } from "@/lib/eywa/relationPolicy";
import { studentAccountBranchAllowed } from "./studentAccountPolicy";
import { hashStudentPin } from "./pinHash";

export class BulkStudentAccountError extends Error {
  constructor(
    public readonly reason:
      "not_found" | "forbidden" | "inactive" | "sync_unavailable",
  ) {
    super(reason);
    this.name = "BulkStudentAccountError";
  }
}

type RosterStudent = {
  id: string;
  name: string;
  phoneLast4: string | null;
  studentAccount: { loginId: string } | null;
};

/** A duplicate actual name is reported for individual resolution; never silently invent a suffixed ID. */
export function planBulkStudentAccounts(
  students: RosterStudent[],
  accounts: { studentId: string; loginId: string }[],
): BulkStudentAccountResult[] {
  const ids = students.map((student) =>
    studentLoginIdSchema.safeParse(student.name),
  );
  const frequency = new Map<string, number>();
  for (const id of ids)
    if (id.success) frequency.set(id.data, (frequency.get(id.data) ?? 0) + 1);
  const taken = new Map(
    accounts.map((account) => [account.loginId, account.studentId]),
  );
  return students.map((student, index) => {
    const base = { studentId: student.id, name: student.name };
    if (student.studentAccount)
      return {
        ...base,
        loginId: student.studentAccount.loginId,
        status: "existing",
      };
    const parsed = ids[index];
    if (!parsed.success)
      return { ...base, loginId: null, status: "invalid_name" };
    const loginId = parsed.data;
    if (
      frequency.get(loginId)! > 1 ||
      (taken.has(loginId) && taken.get(loginId) !== student.id)
    )
      return { ...base, loginId, status: "duplicate_name" };
    if (!student.phoneLast4 || !/^[0-9]{4}$/.test(student.phoneLast4))
      return { ...base, loginId, status: "missing_phone" };
    return { ...base, loginId, status: "ready" };
  });
}

async function loadClass(
  tx: Prisma.TransactionClient,
  viewer: ScopeViewer,
  classId: string,
  now: Date,
) {
  const cls = await tx.class.findUnique({ where: { id: classId } });
  if (!cls) throw new BulkStudentAccountError("not_found");
  if (!studentAccountBranchAllowed(viewer, cls.branchId))
    throw new BulkStudentAccountError("forbidden");
  if (!cls.active || (cls.closedAt && cls.closedAt <= now))
    throw new BulkStudentAccountError("inactive");
  if (cls.eywaBindingId) {
    const binding = await tx.eywaBinding.findUnique({
      where: { id: cls.eywaBindingId },
    });
    if (
      !binding ||
      binding.targetBranchId !== cls.branchId ||
      !binding.enabled ||
      !binding.healthy ||
      binding.mode !== "active" ||
      binding.retiredAt ||
      !binding.leaseExpiresAt ||
      binding.leaseExpiresAt <= now
    )
      throw new BulkStudentAccountError("sync_unavailable");
  }
  return cls;
}

/** Explicit branch administration authorizes the entire branch, independent of teacher-owned roster grants. */
export async function bulkStudentAccounts(
  viewer: ScopeViewer,
  classId: string,
  issue: boolean,
  onlyStudentIds?: readonly string[],
): Promise<BulkStudentAccountSummary> {
  const cls = await db.class.findUnique({ where: { id: classId } });
  if (!cls) throw new BulkStudentAccountError("not_found");
  if (!studentAccountBranchAllowed(viewer, cls.branchId))
    throw new BulkStudentAccountError("forbidden");
  if (!cls.active || (cls.closedAt && cls.closedAt <= new Date()))
    throw new BulkStudentAccountError("inactive");
  if (cls.eywaBindingId) {
    try {
      await refreshManagedBinding(cls.eywaBindingId);
    } catch {
      throw new BulkStudentAccountError("sync_unavailable");
    }
  }
  return db.$transaction(
    async (tx) => {
      // Receiver locks binding before class; follow that order and hold it until all issuance commits.
      if (cls.eywaBindingId)
        await tx.$queryRaw`SELECT id FROM eywa_binding WHERE id = ${cls.eywaBindingId}::uuid FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM class WHERE id = ${classId}::uuid FOR SHARE`;
      const now = new Date();
      const current = await loadClass(tx, viewer, classId, now);
      if (current.eywaBindingId !== cls.eywaBindingId)
        throw new BulkStudentAccountError("forbidden");
      const where: Prisma.StudentWhereInput = {
        isTest: false,
        eywaWithdrawnAt: null,
        AND: [
          { OR: [{ sourceStatus: null }, { sourceStatus: "enrolled" }] },
          { OR: [{ branchId: null }, { branchId: current.branchId }] },
          current.eywaBindingId
            ? {
                eywaBindingId: current.eywaBindingId,
                branchId: current.branchId,
                enrollments: {
                  some: {
                    classId,
                    bindingId: current.eywaBindingId,
                    ...currentEnrollmentWhere(kstRelationshipDay(now), false),
                  },
                },
              }
            : { eywaBindingId: null, classId },
        ],
      };
      const selected = onlyStudentIds ? new Set(onlyStudentIds) : null;
      const roster = (
        await tx.student.findMany({
          where,
          orderBy: [{ name: "asc" }, { id: "asc" }],
          select: {
            id: true,
            name: true,
            phoneLast4: true,
            studentAccount: { select: { loginId: true } },
          },
        })
      ).filter((student) => !selected || selected.has(student.id));
      // Also guard manual student edits while hashing; a stale phone/name must not become credentials.
      if (issue && roster.length)
        await tx.$queryRaw`SELECT id FROM student WHERE id = ANY(${roster.map((student) => student.id)}::uuid[]) ORDER BY id FOR SHARE`;
      const students = issue
        ? await tx.student.findMany({
            where: {
              AND: [where, { id: { in: roster.map((student) => student.id) } }],
            },
            orderBy: [{ name: "asc" }, { id: "asc" }],
            select: {
              id: true,
              name: true,
              phoneLast4: true,
              studentAccount: { select: { loginId: true } },
            },
          })
        : roster;
      const loginIds = students.flatMap((student) => {
        const id = studentLoginIdSchema.safeParse(student.name);
        return id.success ? [id.data] : [];
      });
      const accounts = await tx.studentAccount.findMany({
        where: { loginId: { in: loginIds } },
        select: { studentId: true, loginId: true },
      });
      const results = planBulkStudentAccounts(students, accounts);
      if (issue) {
        for (let index = 0; index < results.length; index++) {
          const result = results[index];
          if (result.status !== "ready") continue;
          const student = students[index];
          const passwordHash = await hashStudentPin(student.phoneLast4!);
          // ON CONFLICT DO NOTHING handles simultaneous same-student / same-name requests without aborting the batch.
          const created = await tx.studentAccount.createMany({
            data: [
              {
                studentId: result.studentId,
                loginId: result.loginId!,
                passwordHash,
                issuedById: viewer.id,
                mustChangePassword: true,
              },
            ],
            skipDuplicates: true,
          });
          if (created.count) result.status = "issued";
          else {
            const existing = await tx.studentAccount.findUnique({
              where: { studentId: result.studentId },
              select: { loginId: true },
            });
            result.status = existing ? "existing" : "duplicate_name";
            if (existing) result.loginId = existing.loginId;
          }
        }
      }
      const issued = results.filter(
        (student) => student.status === "issued",
      ).length;
      const existing = results.filter(
        (student) => student.status === "existing",
      ).length;
      const ready = results.filter(
        (student) => student.status === "ready",
      ).length;
      if (issued)
        await tx.accountAuditLog.create({
          data: auditData({
            actorId: viewer.id,
            action: "student_auth.bulk_issue",
            outcome: "success",
            details: {
              classId,
              issued,
              studentIds: results
                .filter((student) => student.status === "issued")
                .map((student) => student.studentId),
            },
          }),
        });
      return {
        classId,
        className: current.name,
        total: results.length,
        issued,
        existing,
        ready,
        skipped: results.length - issued - existing - ready,
        students: results,
      };
    },
    { maxWait: 10_000, timeout: 60_000 },
  );
}
