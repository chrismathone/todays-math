/**
 * 학생 로그인 핵심 — 아이디 정규화 → 계정 → 꺼짐 → 번호 비교, **연속 5회 실패 10분 잠금**
 * (D-124 ⑶ · D-125 ⑶ · 브리프 §2.3 · §6).
 *
 * 저장소(`LoginStore`)와 비교(`comparePin`)를 **주입받는다** — Auth.js 의 학생 Credentials 공급자
 * (`src/lib/auth.ts`)와 비밀번호 바꾸기 라우트가 Prisma 판(`prismaLoginStore.ts`)과 bcrypt 판
 * (`pinHash.ts`)을 넣고, 시험·변이 탐침은 메모리 판(`src/mocks/memoryLoginStore.ts`)을 넣는다.
 *
 * ## 규칙
 *
 * 1. 🔴 **실패는 한 가지로 말한다** — 없는 아이디·틀린 번호·꺼진 계정 모두 `invalid`. 잠금(`locked`)도
 *    **없는 아이디에 똑같이** 낸다(브리프 §6). 그래서 없는 아이디의 실패도 센다 — 계정이 없으니
 *    `student_login_miss` 에, 아이디를 **글자 그대로가 아니라 열쇠(HMAC)로** 적는다(`missKey`).
 *    학생이 번호를 아이디 칸에 적는 실수가 있다 — 그 번호가 DB·감사 기록에 평문으로 남으면 안 된다.
 * 2. 🔴 **먼저 한 칸을 잡고 그 다음에 대 본다.** 실패 수를 원자적으로 +1 하고(`reserveAttempt`),
 *    그 수가 다섯을 넘으면 대 보지도 않고 잠금이다. 「대 보고 틀리면 +1」 순서면 동시에 넣은 요청이
 *    모두 «아직 안 잠김»을 보고 대 본다 — 숫자 4자리는 1만 개뿐이라 그 틈이 곧 뚫림이다.
 * 3. 다섯째 실패에서 10분 잠근다. 잠긴 동안은 **맞는 번호도** 거부한다. 10분이 지나면 다시 다섯 번이다.
 * 4. 🔴 **성공하면 0 으로.**
 * 5. 없는 아이디·꺼진 계정도 비교를 한 번 한다(`comparePin(pin, null)` — bcrypt 판은 버린 값의 해시에
 *    대 본다). 걸리는 시간으로 아이디 존재가 새지 않게.
 */
import {
  normalizeLoginId,
  STUDENT_LOGIN_LOCK,
} from "@/contracts/studentAccount.contract";

export type LockState = { failedCount: number; lockedUntil: Date | null };

/** 잠금 수를 적는 자리 — 있는 계정이면 그 계정 행, 없는 아이디면 열쇠 행 */
export type LockSlot =
  { kind: "account"; id: string } | { kind: "miss"; key: string };

export interface LoginAccount extends LockState {
  id: string;
  studentId: string;
  passwordHash: string;
  mustChangePassword: boolean;
  disabledAt: Date | null;
}

/** 저장소 — 넷(`resetExpiredLock`·`reserveAttempt`·`lock`·`clearFailures`)은 **한 번에 끝나는** 연산이어야 한다 */
export interface LoginStore {
  findAccountByLoginId(loginId: string): Promise<LoginAccount | null>;
  readMiss(key: string): Promise<LockState | null>;
  /** 잠금이 지났으면 0 으로 되돌린다 (지나지 않았으면 아무것도 안 한다) */
  resetExpiredLock(slot: LockSlot, now: Date): Promise<void>;
  /** 실패 수를 +1 하고 새 값을 돌려준다 — 없는 아이디 행은 없으면 만든다 */
  reserveAttempt(slot: LockSlot): Promise<number>;
  /** 아직 안 잠겼으면 `until` 까지 잠근다 (먼저 잠근 쪽의 시각을 늦추지 않는다) */
  lock(slot: LockSlot, until: Date): Promise<void>;
  clearFailures(slot: LockSlot): Promise<void>;
  touchLastLogin(accountId: string, now: Date): Promise<void>;
}

export interface LoginAudit {
  action: "student_auth.login";
  outcome: "success" | "failed";
  details: Record<string, string>;
}

export interface LoginDeps {
  store: LoginStore;
  now: () => Date;
  /** 번호를 해시에 대 본다. `hash` 가 null 이면 버린 값의 해시에 대 보고 늘 false (시간 맞추기) */
  comparePin: (pin: string, hash: string | null) => Promise<boolean>;
  /** 없는 아이디의 열쇠 — 글자 그대로 적지 않는다 */
  missKey: (loginId: string) => string;
  audit: (entry: LoginAudit) => Promise<void>;
}

export type PinCheck = "ok" | "invalid" | "locked";

export type LoginOutcome =
  | { ok: true; account: LoginAccount }
  | { ok: false; reason: "invalid" | "locked" };

export function isLocked(state: LockState, now: Date): boolean {
  return (
    state.lockedUntil !== null && now.getTime() < state.lockedUntil.getTime()
  );
}

function lockExpired(state: LockState, now: Date): boolean {
  return (
    state.lockedUntil !== null && now.getTime() >= state.lockedUntil.getTime()
  );
}

/** 잠금을 지나 번호를 대 본다 — 계정·없는 아이디·비밀번호 바꾸기가 모두 이 한 길을 탄다 */
async function guardedCheck(
  slot: LockSlot,
  state: LockState,
  hash: string | null,
  pin: string,
  deps: LoginDeps,
): Promise<PinCheck> {
  const { store } = deps;
  const now = deps.now();
  if (isLocked(state, now)) {
    await deps.comparePin(pin, null);
    return "locked";
  }
  if (lockExpired(state, now)) await store.resetExpiredLock(slot, now);

  const attempt = await store.reserveAttempt(slot);
  const until = new Date(now.getTime() + STUDENT_LOGIN_LOCK.lockMs);
  if (attempt > STUDENT_LOGIN_LOCK.maxFailures) {
    await store.lock(slot, until);
    await deps.comparePin(pin, null);
    return "locked";
  }

  const ok = await deps.comparePin(pin, hash);
  if (ok && hash !== null) {
    await store.clearFailures(slot);
    return "ok";
  }
  if (attempt >= STUDENT_LOGIN_LOCK.maxFailures) {
    await store.lock(slot, until);
    return "locked";
  }
  return "invalid";
}

/**
 * 이 계정에 번호를 대 본다 — 로그인과 **비밀번호 바꾸기**(지금 번호 확인)가 같이 쓴다.
 * 🔴 꺼진 계정은 맞는 번호도 실패다. 비교는 가짜 해시에 대 보고, 실패 수는 똑같이 센다
 *    (꺼진 계정이 «없는 아이디»와 다르게 굴면 그 차이로 계정 존재가 샌다).
 */
export async function verifyStudentPin(
  account: LoginAccount,
  pin: string,
  deps: LoginDeps,
): Promise<PinCheck> {
  const hash = account.disabledAt === null ? account.passwordHash : null;
  return guardedCheck(
    { kind: "account", id: account.id },
    account,
    hash,
    pin,
    deps,
  );
}

export async function attemptStudentLogin(
  input: { loginId: string; pin: string },
  deps: LoginDeps,
): Promise<LoginOutcome> {
  const loginId = normalizeLoginId(input.loginId);
  const account = await deps.store.findAccountByLoginId(loginId);

  if (!account) {
    const key = deps.missKey(loginId);
    const state = (await deps.store.readMiss(key)) ?? {
      failedCount: 0,
      lockedUntil: null,
    };
    const result = await guardedCheck(
      { kind: "miss", key },
      state,
      null,
      input.pin,
      deps,
    );
    const reason = result === "locked" ? "locked" : "invalid";
    // 입력한 아이디는 적지 않는다(머리말 1)
    await deps.audit({
      action: "student_auth.login",
      outcome: "failed",
      details: { reason: reason === "locked" ? "locked" : "unknown_id" },
    });
    return { ok: false, reason };
  }

  const result = await verifyStudentPin(account, input.pin, deps);
  const who = { studentAccountId: account.id, studentId: account.studentId };
  if (result === "ok") {
    await deps.store.touchLastLogin(account.id, deps.now());
    await deps.audit({
      action: "student_auth.login",
      outcome: "success",
      details: who,
    });
    return { ok: true, account };
  }
  await deps.audit({
    action: "student_auth.login",
    outcome: "failed",
    details: {
      ...who,
      reason:
        result === "locked"
          ? "locked"
          : account.disabledAt !== null
            ? "disabled"
            : "invalid",
    },
  });
  return { ok: false, reason: result };
}
