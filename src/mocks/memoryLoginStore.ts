/**
 * 학생 로그인 저장소의 **메모리 판** — `LoginStore`(src/lib/learn/studentLogin.ts)의 원자 연산을 그대로
 * 흉내 낸다. 시험(`studentLogin.test.ts`)과 변이 탐침(`scripts/qa/mutate-student-auth.ts`)이 쓴다.
 * Prisma 판은 `src/lib/learn/prismaLoginStore.ts` 이고, 라우트 시험이 그쪽을 가짜 DB 위에서 탄다.
 *
 * ⚠️ 한 연산은 한 번에 끝난다(자바스크립트는 한 줄기라 `+= 1` 이 끼어들림 없이 끝난다) — 실제 DB 의
 *    `failed_count = failed_count + 1` 과 같은 성질이다. 그래서 동시성 시험(«스무 번 넣어도 다섯 번만
 *    대 본다»)이 이 판 위에서 뜻을 가진다.
 */
import type {
  LockSlot,
  LockState,
  LoginAccount,
  LoginStore,
} from "@/lib/learn/studentLogin";

type AccountRecord = LoginAccount & {
  loginId: string;
  lastLoginAt: Date | null;
};

export interface MemoryLoginStore extends LoginStore {
  addAccount(input: {
    id: string;
    studentId: string;
    loginId: string;
    passwordHash: string;
    mustChangePassword: boolean;
    disabledAt: Date | null;
  }): void;
  accountById(id: string): LoginAccount | null;
  accountLock(id: string): LockState;
  missKeys(): string[];
}

export function createMemoryLoginStore(): MemoryLoginStore {
  const accounts = new Map<string, AccountRecord>();
  const misses = new Map<string, LockState>();

  const stateOf = (slot: LockSlot): LockState | undefined =>
    slot.kind === "account" ? accounts.get(slot.id) : misses.get(slot.key);

  const snapshot = (a: AccountRecord): LoginAccount => ({
    id: a.id,
    studentId: a.studentId,
    passwordHash: a.passwordHash,
    mustChangePassword: a.mustChangePassword,
    disabledAt: a.disabledAt,
    failedCount: a.failedCount,
    lockedUntil: a.lockedUntil,
  });

  return {
    async findAccountByLoginId(loginId) {
      for (const a of accounts.values())
        if (a.loginId === loginId) return snapshot(a);
      return null;
    },
    async readMiss(key) {
      const m = misses.get(key);
      return m ? { ...m } : null;
    },
    async resetExpiredLock(slot, now) {
      const s = stateOf(slot);
      if (
        s &&
        s.lockedUntil !== null &&
        s.lockedUntil.getTime() <= now.getTime()
      ) {
        s.failedCount = 0;
        s.lockedUntil = null;
      }
    },
    async reserveAttempt(slot) {
      let s = stateOf(slot);
      if (!s) {
        if (slot.kind === "account") throw new Error(`계정이 없다: ${slot.id}`);
        s = { failedCount: 0, lockedUntil: null };
        misses.set(slot.key, s);
      }
      s.failedCount += 1;
      return s.failedCount;
    },
    async lock(slot, until) {
      const s = stateOf(slot);
      if (s && s.lockedUntil === null) s.lockedUntil = until;
    },
    async clearFailures(slot) {
      const s = stateOf(slot);
      if (s) {
        s.failedCount = 0;
        s.lockedUntil = null;
      }
    },
    async touchLastLogin(accountId, now) {
      const a = accounts.get(accountId);
      if (a) a.lastLoginAt = now;
    },
    addAccount(input) {
      accounts.set(input.id, {
        ...input,
        failedCount: 0,
        lockedUntil: null,
        lastLoginAt: null,
      });
    },
    accountById(id) {
      const a = accounts.get(id);
      return a ? snapshot(a) : null;
    },
    accountLock(id) {
      const a = accounts.get(id);
      if (!a) throw new Error(`계정이 없다: ${id}`);
      return { failedCount: a.failedCount, lockedUntil: a.lockedUntil };
    },
    missKeys() {
      return [...misses.keys()];
    },
  };
}
