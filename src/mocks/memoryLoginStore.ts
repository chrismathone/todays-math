/**
 * 학생 로그인 저장소의 **메모리 판** — `LoginStore`(src/lib/learn/studentLogin.ts)의 원자 연산을 그대로
 * 흉내 낸다. 시험(`studentLogin.test.ts`)과 변이 탐침(`scripts/qa/mutate-student-auth.ts`)이 쓴다.
 * Prisma 판은 `src/lib/learn/prismaLoginStore.ts` 이고, 라우트 시험이 그쪽을 가짜 DB 위에서 탄다.
 *
 * ⚠️ 한 연산은 한 번에 끝난다(자바스크립트는 한 줄기라 `+= 1` 이 끼어들림 없이 끝난다) — 실제 DB 의
 *    `failed_count = failed_count + 1` 과 같은 성질이다. 그래서 동시성 시험(«스무 번 넣어도 다섯 번만
 *    대 본다»)이 이 판 위에서 뜻을 가진다.
 * 없는 아이디 행은 Prisma `@updatedAt` 처럼 **바뀔 때마다** `updatedAt` 을 찍는다(시계는 `now` 로 받는다) —
 * 정리(`pruneStaleMisses`, learn-screens 브리프 §1.4)의 경계 시험이 그 시각을 쓴다.
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

type MissRecord = LockState & { updatedAt: Date };

export interface MemoryLoginStore extends LoginStore {
  addAccount(input: {
    id: string;
    studentId: string;
    loginId: string;
    passwordHash: string;
    mustChangePassword: boolean;
    disabledAt: Date | null;
    /** 퇴원 시각 — 안 주면 퇴원 안 함 */
    withdrawnAt?: Date | null;
  }): void;
  accountById(id: string): LoginAccount | null;
  accountLock(id: string): LockState;
  missKeys(): string[];
  /** 없는 아이디 행을 직접 심는다 — 정리의 경계 시험용 */
  seedMiss(key: string, row: MissRecord): void;
}

export function createMemoryLoginStore(
  opts: { now?: () => Date } = {},
): MemoryLoginStore {
  const clock = opts.now ?? (() => new Date());
  const accounts = new Map<string, AccountRecord>();
  const misses = new Map<string, MissRecord>();

  const stateOf = (slot: LockSlot): LockState | undefined =>
    slot.kind === "account" ? accounts.get(slot.id) : misses.get(slot.key);
  /** Prisma `@updatedAt` 흉내 — 없는 아이디 행이 바뀌면 시각을 찍는다 */
  const touched = (slot: LockSlot) => {
    if (slot.kind !== "miss") return;
    const m = misses.get(slot.key);
    if (m) m.updatedAt = clock();
  };

  const snapshot = (a: AccountRecord): LoginAccount => ({
    id: a.id,
    studentId: a.studentId,
    passwordHash: a.passwordHash,
    mustChangePassword: a.mustChangePassword,
    disabledAt: a.disabledAt,
    withdrawnAt: a.withdrawnAt,
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
      return m
        ? { failedCount: m.failedCount, lockedUntil: m.lockedUntil }
        : null;
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
        touched(slot);
      }
    },
    async reserveAttempt(slot) {
      let s = stateOf(slot);
      if (!s) {
        if (slot.kind === "account") throw new Error(`계정이 없다: ${slot.id}`);
        const fresh: MissRecord = {
          failedCount: 0,
          lockedUntil: null,
          updatedAt: clock(),
        };
        misses.set(slot.key, fresh);
        s = fresh;
      }
      s.failedCount += 1;
      touched(slot);
      return s.failedCount;
    },
    async lock(slot, until) {
      const s = stateOf(slot);
      if (s && s.lockedUntil === null) {
        s.lockedUntil = until;
        touched(slot);
      }
    },
    async clearFailures(slot) {
      const s = stateOf(slot);
      if (s) {
        s.failedCount = 0;
        s.lockedUntil = null;
        touched(slot);
      }
    },
    async touchLastLogin(accountId, now) {
      const a = accounts.get(accountId);
      if (a) a.lastLoginAt = now;
    },
    async pruneStaleMisses(olderThan, maxRows) {
      const stale = [...misses.entries()]
        .filter(([, m]) => m.updatedAt.getTime() < olderThan.getTime())
        .sort(([, a], [, b]) => a.updatedAt.getTime() - b.updatedAt.getTime())
        .slice(0, maxRows);
      for (const [key] of stale) misses.delete(key);
      return stale.length;
    },
    addAccount(input) {
      accounts.set(input.id, {
        ...input,
        withdrawnAt: input.withdrawnAt ?? null,
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
    seedMiss(key, row) {
      misses.set(key, { ...row });
    },
  };
}
