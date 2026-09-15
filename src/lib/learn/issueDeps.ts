/**
 * 학생 계정 발급(`issueStudentAccount.ts`)에 넣는 **진짜** 부품 — Prisma · 초기 비밀번호 · bcrypt · 감사 기록.
 *
 * 반 소유 조회는 기존 `requireOwnedStudent`(src/lib/ownership.ts)와 **같은 조회**다 — 학생을 반과 함께 한 번에
 * 읽고 `class.userId` 를 본다. 그 헬퍼는 응답(Response)을 돌려주는 모양이라 발급 규칙 안에서 부르지 못해
 * 조회만 같게 두었다(판정은 `issueStudentAccount.ts` 규칙 1).
 */
import "server-only";

import { recordAudit } from "@/lib/audit";
import { generateInitialPassword } from "@/lib/concept/initialPassword";
import { db } from "@/lib/db";
import { isPrismaErrorCode } from "@/lib/prismaErrors";

import { studentWithdrawn } from "./accountBlock";
import type { IssueDeps } from "./issueStudentAccount";
import { hashStudentPin } from "./pinHash";

export function studentIssueDeps(): IssueDeps {
  return {
    async findStudentOwner(studentId) {
      const student = await db.student.findUnique({
        where: { id: studentId },
        include: { class: true },
      });
      return student
        ? {
            ownerId: student.class.userId,
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
    createAccount: (data) => db.studentAccount.create({ data }),
    updateAccount: (id, data) =>
      db.studentAccount.update({ where: { id }, data }),
    generatePin: () => generateInitialPassword(),
    hashPin: hashStudentPin,
    now: () => new Date(),
    audit: (entry) => recordAudit(entry),
    isUniqueViolation: (error) => isPrismaErrorCode(error, "P2002"),
  };
}
