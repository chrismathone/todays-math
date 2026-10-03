/**
 * 학생 로그인 저장소의 **Prisma 판** — `LoginStore`(src/lib/learn/studentLogin.ts)의 약속을 한 문장씩
 * DB 에 맡긴다. 「한 번에 끝나는 연산」은 전부 **조건부 UPDATE 한 문장**이다:
 *
 *   resetExpiredLock  UPDATE … SET failed_count = 0, locked_until = NULL WHERE id = ? AND locked_until <= now
 *   reserveAttempt    UPDATE … SET failed_count = failed_count + 1 … RETURNING failed_count
 *                     (없는 아이디는 INSERT … ON CONFLICT DO UPDATE — Prisma 의 native upsert)
 *   lock              UPDATE … SET locked_until = ? WHERE id = ? AND locked_until IS NULL
 *   clearFailures     UPDATE … SET failed_count = 0, locked_until = NULL WHERE id = ?
 *   pruneStaleMisses  SELECT key_hash … WHERE updated_at < ? ORDER BY updated_at LIMIT 100
 *                     → DELETE … WHERE key_hash IN (…) AND updated_at < ?  (고른 사이 다시 두드려진 행은 남는다)
 *
 * 읽고-셈하고-쓰기로 하면 동시에 들어온 요청이 같은 수를 읽어 **다섯 번보다 많이 대 본다**
 * (`studentLogin.ts` 머리말 2). ⚠️ 이 판의 원자성은 가짜 DB(`learnTestDouble`) 위에서만 시험했다 —
 * 실제 Postgres 에서 한 번은 돌려 봐야 한다(보고서 «못 본 것»).
 */
import type { PrismaClient } from "@prisma/client";
import { managedStudentAccess } from "@/lib/eywa/managedStudentAccess";

import type {
  LockSlot,
  LoginAccount,
  LoginStore,
} from "@/lib/learn/studentLogin";

type Db = Pick<PrismaClient, "studentAccount" | "studentLoginMiss">;

/**
 * 번호를 대 보는 데 읽는 칸 — 로그인과 비밀번호 바꾸기(`/api/learn/password`)가 같이 쓴다.
 * 퇴원 표시(`Student.eywaWithdrawnAt`)는 학생 행에 있다 — 막힘 판정(`accountBlock.ts`)이 쓴다(D-126 ⑺).
 */
export const ACCOUNT_LOGIN_SELECT = {
  id: true,
  studentId: true,
  passwordHash: true,
  mustChangePassword: true,
  disabledAt: true,
  failedCount: true,
  lockedUntil: true,
  student: { select: { eywaWithdrawnAt: true, eywaBindingId: true } },
} as const;

/** `ACCOUNT_LOGIN_SELECT` 로 읽은 행 → 로그인 핵심이 받는 모양 (로그인 · 비밀번호 바꾸기가 같이 쓴다) */
export function toLoginAccount(row: {
  id: string;
  studentId: string;
  passwordHash: string;
  mustChangePassword: boolean;
  disabledAt: Date | null;
  failedCount: number;
  lockedUntil: Date | null;
  student: { eywaWithdrawnAt: Date | null; eywaBindingId?: string | null };
}): LoginAccount {
  return {
    id: row.id,
    studentId: row.studentId,
    passwordHash: row.passwordHash,
    mustChangePassword: row.mustChangePassword,
    disabledAt: row.disabledAt,
    failedCount: row.failedCount,
    lockedUntil: row.lockedUntil,
    withdrawnAt: row.student.eywaWithdrawnAt,
  };
}

/** Password login and current-password verification share the managed access gate. */
export async function loadStudentLoginAccount(
  row: Parameters<typeof toLoginAccount>[0],
): Promise<LoginAccount> {
  const account = toLoginAccount(row);
  if (!row.student.eywaBindingId) return account;
  const access = await managedStudentAccess(
    row.studentId,
    row.student.eywaBindingId,
    {
      forceRefresh: true,
    },
  );
  return {
    ...account,
    managedAccessAllowed: access.allowed,
    managedStudentStamp: access.stamp,
  };
}

export function prismaLoginStore(db: Db): LoginStore {
  return {
    async findAccountByLoginId(loginId) {
      const row = await db.studentAccount.findUnique({
        where: { loginId },
        select: ACCOUNT_LOGIN_SELECT,
      });
      return row ? loadStudentLoginAccount(row) : null;
    },

    async readMiss(key) {
      const row = await db.studentLoginMiss.findUnique({
        where: { keyHash: key },
      });
      return row
        ? { failedCount: row.failedCount, lockedUntil: row.lockedUntil }
        : null;
    },

    async resetExpiredLock(slot: LockSlot, now: Date) {
      const data = { failedCount: 0, lockedUntil: null };
      if (slot.kind === "account")
        await db.studentAccount.updateMany({
          where: { id: slot.id, lockedUntil: { lte: now } },
          data,
        });
      else
        await db.studentLoginMiss.updateMany({
          where: { keyHash: slot.key, lockedUntil: { lte: now } },
          data,
        });
    },

    async reserveAttempt(slot: LockSlot) {
      if (slot.kind === "account") {
        const row = await db.studentAccount.update({
          where: { id: slot.id },
          data: { failedCount: { increment: 1 } },
          select: { failedCount: true },
        });
        return row.failedCount;
      }
      const row = await db.studentLoginMiss.upsert({
        where: { keyHash: slot.key },
        create: { keyHash: slot.key, failedCount: 1 },
        update: { failedCount: { increment: 1 } },
        select: { failedCount: true },
      });
      return row.failedCount;
    },

    async lock(slot: LockSlot, until: Date) {
      if (slot.kind === "account")
        await db.studentAccount.updateMany({
          where: { id: slot.id, lockedUntil: null },
          data: { lockedUntil: until },
        });
      else
        await db.studentLoginMiss.updateMany({
          where: { keyHash: slot.key, lockedUntil: null },
          data: { lockedUntil: until },
        });
    },

    async clearFailures(slot: LockSlot) {
      const data = { failedCount: 0, lockedUntil: null };
      if (slot.kind === "account")
        await db.studentAccount.update({ where: { id: slot.id }, data });
      else
        await db.studentLoginMiss.updateMany({
          where: { keyHash: slot.key },
          data,
        });
    },

    async touchLastLogin(accountId: string, now: Date) {
      await db.studentAccount.update({
        where: { id: accountId },
        data: { lastLoginAt: now },
      });
    },

    async pruneStaleMisses(olderThan: Date, maxRows: number) {
      const stale = await db.studentLoginMiss.findMany({
        where: { updatedAt: { lt: olderThan } },
        select: { keyHash: true },
        orderBy: { updatedAt: "asc" },
        take: maxRows,
      });
      if (stale.length === 0) return 0;
      // 고른 뒤 그 사이에 다시 두드려진 행은 남긴다 — 지우는 조건에도 같은 시각을 건다
      const { count } = await db.studentLoginMiss.deleteMany({
        where: {
          keyHash: { in: stale.map((r) => r.keyHash) },
          updatedAt: { lt: olderThan },
        },
      });
      return count;
    },
  };
}
