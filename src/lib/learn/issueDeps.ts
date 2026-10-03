/**
 * 학생 계정 발급(`issueStudentAccount.ts`)에 넣는 **진짜** 부품 — Prisma · 초기 비밀번호 · bcrypt · 감사 기록.
 *
 * 반 소유 조회는 기존 `requireOwnedStudent`(src/lib/ownership.ts)와 **같은 조회**다 — 학생을 반과 함께 한 번에
 * 읽고 `class.userId` 를 본다. 그 헬퍼는 응답(Response)을 돌려주는 모양이라 발급 규칙 안에서 부르지 못해
 * 조회만 같게 두었다(판정은 `issueStudentAccount.ts` 규칙 1).
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

export function studentIssueDeps(): IssueDeps {
  let permission:
    { viewer: ScopeViewer; studentId: string; classId: string } | undefined;
  const beforeWrite = async (tx: Prisma.TransactionClient) => {
    if (!permission) throw new ClassAccessDenied();
    await assertClassWrite(
      tx,
      permission.viewer,
      permission.classId,
      "student:account",
    );
    const student = await tx.student.findUnique({
      where: { id: permission.studentId },
    });
    if (
      !student ||
      (student.classId !== permission.classId && !student.eywaBindingId)
    )
      throw new ClassAccessDenied();
    if (student.eywaBindingId)
      await assertStudentEnrollment(
        tx,
        permission.studentId,
        permission.classId,
        true,
      );
  };
  return {
    async authorizeStudent(viewer, studentId) {
      const owned = await requireOwnedStudent(
        studentId,
        viewer,
        "student:account",
      );
      permission = owned.ok
        ? { viewer, studentId, classId: owned.data.classId }
        : undefined;
      return owned.ok;
    },
    async findStudentOwner(studentId) {
      const student = await db.student.findUnique({
        where: { id: studentId },
        include: {
          class: { include: { user: { select: { branchId: true } } } },
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
    hashPin: hashStudentPin,
    now: () => new Date(),
    audit: (entry) => recordAudit(entry),
    isUniqueViolation: (error) => isPrismaErrorCode(error, "P2002"),
  };
}
