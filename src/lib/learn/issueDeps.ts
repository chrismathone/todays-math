/**
 * 학생 계정 발급(`issueStudentAccount.ts`)에 넣는 **진짜** 부품 — Prisma · 초기 비밀번호 · bcrypt · 감사 기록.
 *
 * 발급 역할과 소속 지점을 먼저 확인한다. 연동 학생은 현재 수강 관계로 반을 정하며,
 * 저장 직전에도 반 접근 권한과 학생·지점·수강 관계를 확인한다.
 */
import "server-only";
import type { Prisma } from "@prisma/client";
import type { ScopeViewer } from "@/lib/ownerScope";

import { recordAudit } from "@/lib/audit";
import { generateInitialPassword } from "@/lib/concept/initialPassword";
import { db } from "@/lib/db";
import { isPrismaErrorCode } from "@/lib/prismaErrors";
import { requireOwnedStudent } from "@/lib/ownership";
import {
  ClassAccessDenied,
  assertClassWrite,
  assertStudentEnrollment,
} from "@/lib/classAccess";

import { studentWithdrawn } from "./accountBlock";
import type { IssueDeps } from "./issueStudentAccount";
import { hashStudentPin } from "./pinHash";
import {
  canManageStudentAccounts,
  studentAccountBranchAllowed,
  studentAccountViewer,
} from "./studentAccountPolicy";

export function studentIssueDeps(): IssueDeps {
  let issuancePin: string | undefined;
  let permission:
    { viewer: ScopeViewer; studentId: string; classId: string } | undefined;
  const beforeWrite = async (tx: Prisma.TransactionClient) => {
    if (!permission || !canManageStudentAccounts(permission.viewer))
      throw new ClassAccessDenied();
    await assertClassWrite(
      tx,
      studentAccountViewer(permission.viewer),
      permission.classId,
      "student:account",
    );
    if (issuancePin !== undefined)
      await tx.$queryRaw`SELECT id FROM student WHERE id = ${permission.studentId}::uuid FOR SHARE`;
    const student = await tx.student.findUnique({
      where: { id: permission.studentId },
    });
    const cls = await tx.class.findUnique({
      where: { id: permission.classId },
      select: { branchId: true },
    });
    if (
      !student ||
      !cls ||
      !studentAccountBranchAllowed(permission.viewer, cls.branchId) ||
      (student.branchId != null && student.branchId !== cls.branchId) ||
      (student.classId !== permission.classId && !student.eywaBindingId) ||
      (issuancePin !== undefined && student.phoneLast4 !== issuancePin)
    )
      throw new ClassAccessDenied();
    if (student.eywaBindingId)
      await assertStudentEnrollment(
        tx,
        permission.studentId,
        permission.classId,
        issuancePin === undefined,
      );
  };
  return {
    async authorizeStudent(viewer, studentId) {
      permission = undefined;
      if (!canManageStudentAccounts(viewer)) return false;
      const owned = await requireOwnedStudent(
        studentId,
        studentAccountViewer(viewer),
        "student:account",
      );
      if (!owned.ok) return false;
      const cls = await db.class.findUnique({
        where: { id: owned.data.classId },
        select: { branchId: true },
      });
      if (
        !cls ||
        !studentAccountBranchAllowed(viewer, cls.branchId) ||
        (owned.data.branchId != null && owned.data.branchId !== cls.branchId)
      )
        return false;
      permission = { viewer, studentId, classId: owned.data.classId };
      return true;
    },
    async findStudentOwner(studentId) {
      const student = await db.student.findUnique({
        where: { id: studentId },
        include: {
          class: true,
        },
      });
      return student
        ? {
            ownerId: student.class.userId,
            ownerBranchId: student.class.branchId,
            // 🔴 로그인을 막는 판정과 같은 함수(`accountBlock.ts`) — D-127
            withdrawn: studentWithdrawn({
              withdrawnAt: student.eywaWithdrawnAt,
            }),
          }
        : null;
    },
    findAccountByStudent: (studentId) =>
      db.studentAccount.findUnique({ where: { studentId } }),
    findAccountByLoginId: (loginId) =>
      db.studentAccount.findUnique({
        where: { loginId },
        select: { id: true },
      }),
    createAccount: (data) =>
      db.$transaction(async (tx) => {
        await beforeWrite(tx);
        return tx.studentAccount.create({ data });
      }),
    updateAccount: (id, data) =>
      db.$transaction(async (tx) => {
        await beforeWrite(tx);
        return tx.studentAccount.update({ where: { id }, data });
      }),
    generatePin: () => generateInitialPassword(),
    async initialPinForStudent(studentId) {
      const student = await db.student.findUnique({
        where: { id: studentId },
        select: { phoneLast4: true },
      });
      issuancePin =
        student?.phoneLast4 && /^[0-9]{4}$/.test(student.phoneLast4)
          ? student.phoneLast4
          : undefined;
      return issuancePin ?? null;
    },
    hashPin: hashStudentPin,
    now: () => new Date(),
    audit: (entry) => recordAudit(entry),
    isUniqueViolation: (error) => isPrismaErrorCode(error, "P2002"),
  };
}
