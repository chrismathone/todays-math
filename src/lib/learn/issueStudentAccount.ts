/**
 * 원장 — 학생 계정 **발급 · 다시 발급 · 끄기/켜기 · 상태** (D-124 ⑷ · D-125 ⑵ · 브리프 §2.3).
 *
 * 저장·해시·난수·감사는 주입받는다(`issueDeps.ts` 가 진짜를, 시험·변이 탐침이 가짜를 넣는다).
 * 라우트(`/api/students/{id}/account/**`)는 세션·같은 사이트·본문 검사만 하고 여기를 부른다.
 *
 * 규칙:
 *  1. 🔴 **그 학생의 반이 발급하는 원장 소유여야 한다**(`Class.userId`) — 남의 반 학생은 거부(⑤).
 *     존재하지 않으면 404, 남의 것이면 403 — 기존 `requireOwnedStudent` 와 같은 갈래·같은 조회다.
 *  2. **한 명씩**(D-124 ⑷). 이미 계정이 있으면 거부 — «다시 발급»은 비밀번호만 새로.
 *  3. 아이디는 원장님이 적은 것을 정규화해 쓴다(자동 제안 없음 — D-125 ⑵). 겹치면 «이미 쓰는 아이디입니다».
 *  4. 🔴 초기 비밀번호는 **해시만** 저장하고 부르는 쪽에 **한 번** 돌려준다. 감사 기록에 싣지 않는다(⑥).
 *  5. 끄기는 `disabledAt` 만 찍고 지우지 않는다(수맥 규칙). 켜면 비운다.
 *  6. 모두 `AccountAuditLog` 에 남긴다(기존 `recordAudit`) — 원장이 한 일이라 `userId`·`actorId` 가 원장이다.
 */
import {
  normalizeLoginId,
  type StudentAccountStatus,
} from "@/contracts/studentAccount.contract";

import { isLocked } from "./studentLogin";

export interface IssuedAccount {
  id: string;
  studentId: string;
  loginId: string;
  passwordHash: string;
  mustChangePassword: boolean;
  issuedAt: Date;
  passwordChangedAt: Date | null;
  lastLoginAt: Date | null;
  disabledAt: Date | null;
  failedCount: number;
  lockedUntil: Date | null;
}

export interface AccountAuditEntry {
  userId: string;
  actorId: string;
  action:
    | "student_account.issue"
    | "student_account.reissue"
    | "student_account.disable"
    | "student_account.enable";
  outcome: "success";
  details: { studentId: string; studentAccountId: string; loginId: string };
}

export interface IssueDeps {
  /** 학생의 반 소유자 — 학생이 없으면 null */
  findStudentOwner(studentId: string): Promise<{ ownerId: string } | null>;
  findAccountByStudent(studentId: string): Promise<IssuedAccount | null>;
  findAccountByLoginId(loginId: string): Promise<{ id: string } | null>;
  createAccount(data: {
    studentId: string;
    loginId: string;
    passwordHash: string;
    issuedById: string;
  }): Promise<IssuedAccount>;
  updateAccount(
    id: string,
    data: Partial<
      Pick<
        IssuedAccount,
        | "passwordHash"
        | "mustChangePassword"
        | "failedCount"
        | "lockedUntil"
        | "disabledAt"
      >
    >,
  ): Promise<IssuedAccount>;
  generatePin(): string;
  hashPin(pin: string): Promise<string>;
  now(): Date;
  audit(entry: AccountAuditEntry): Promise<void>;
  isUniqueViolation(error: unknown): boolean;
}

export type IssueFailure =
  | "student_not_found"
  | "not_owner"
  | "account_exists"
  | "login_id_taken"
  | "no_account";

export type IssueResult<T> =
  { ok: true; value: T } | { ok: false; reason: IssueFailure };

const fail = (reason: IssueFailure) => ({ ok: false as const, reason });

/** 규칙 1 — 이 학생이 이 원장의 반에 있나 */
async function ownershipFailure(
  deps: IssueDeps,
  directorId: string,
  studentId: string,
): Promise<IssueFailure | null> {
  const owner = await deps.findStudentOwner(studentId);
  if (!owner) return "student_not_found";
  if (owner.ownerId !== directorId) return "not_owner";
  return null;
}

function auditFor(
  action: AccountAuditEntry["action"],
  directorId: string,
  account: IssuedAccount,
): AccountAuditEntry {
  return {
    userId: directorId,
    actorId: directorId,
    action,
    outcome: "success",
    details: {
      studentId: account.studentId,
      studentAccountId: account.id,
      loginId: account.loginId,
    },
  };
}

export async function issueStudentAccount(
  deps: IssueDeps,
  input: { directorId: string; studentId: string; loginId: string },
): Promise<IssueResult<{ account: IssuedAccount; initialPassword: string }>> {
  const denied = await ownershipFailure(
    deps,
    input.directorId,
    input.studentId,
  );
  if (denied) return fail(denied);

  const loginId = normalizeLoginId(input.loginId);
  if (await deps.findAccountByStudent(input.studentId))
    return fail("account_exists");
  if (await deps.findAccountByLoginId(loginId)) return fail("login_id_taken");

  const initialPassword = deps.generatePin();
  const passwordHash = await deps.hashPin(initialPassword);
  let account: IssuedAccount;
  try {
    account = await deps.createAccount({
      studentId: input.studentId,
      loginId,
      passwordHash,
      issuedById: input.directorId,
    });
  } catch (error) {
    // 확인과 만들기 사이에 같은 학생·같은 아이디가 들어왔다 — 무엇이 겹쳤는지 다시 보고 말한다
    if (!deps.isUniqueViolation(error)) throw error;
    return fail(
      (await deps.findAccountByStudent(input.studentId))
        ? "account_exists"
        : "login_id_taken",
    );
  }
  await deps.audit(
    auditFor("student_account.issue", input.directorId, account),
  );
  return { ok: true, value: { account, initialPassword } };
}

/** 다시 발급 — 비밀번호만 새로. 첫 로그인 표시를 다시 세우고 잠금을 푼다 */
export async function reissueStudentPassword(
  deps: IssueDeps,
  input: { directorId: string; studentId: string },
): Promise<IssueResult<{ account: IssuedAccount; initialPassword: string }>> {
  const denied = await ownershipFailure(
    deps,
    input.directorId,
    input.studentId,
  );
  if (denied) return fail(denied);
  const account = await deps.findAccountByStudent(input.studentId);
  if (!account) return fail("no_account");

  const initialPassword = deps.generatePin();
  const updated = await deps.updateAccount(account.id, {
    passwordHash: await deps.hashPin(initialPassword),
    mustChangePassword: true,
    failedCount: 0,
    lockedUntil: null,
  });
  await deps.audit(
    auditFor("student_account.reissue", input.directorId, updated),
  );
  return { ok: true, value: { account: updated, initialPassword } };
}

/** 끄기 · 켜기 — `disabledAt` 만. 끈 계정을 다시 끄면 처음 끈 시각을 그대로 둔다 */
export async function setStudentAccountDisabled(
  deps: IssueDeps,
  input: { directorId: string; studentId: string; disabled: boolean },
): Promise<IssueResult<IssuedAccount>> {
  const denied = await ownershipFailure(
    deps,
    input.directorId,
    input.studentId,
  );
  if (denied) return fail(denied);
  const account = await deps.findAccountByStudent(input.studentId);
  if (!account) return fail("no_account");
  const updated = await deps.updateAccount(account.id, {
    disabledAt: input.disabled ? (account.disabledAt ?? deps.now()) : null,
  });
  await deps.audit(
    auditFor(
      input.disabled ? "student_account.disable" : "student_account.enable",
      input.directorId,
      updated,
    ),
  );
  return { ok: true, value: updated };
}

export async function readStudentAccount(
  deps: IssueDeps,
  input: { directorId: string; studentId: string },
): Promise<IssueResult<IssuedAccount | null>> {
  const denied = await ownershipFailure(
    deps,
    input.directorId,
    input.studentId,
  );
  if (denied) return fail(denied);
  return { ok: true, value: await deps.findAccountByStudent(input.studentId) };
}

/** 원장님 화면에 가는 상태 — 비밀번호·해시 칸이 없다 */
export function toAccountStatus(
  account: IssuedAccount,
  now: Date,
): StudentAccountStatus {
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  return {
    studentId: account.studentId,
    loginId: account.loginId,
    issuedAt: account.issuedAt.toISOString(),
    lastLoginAt: iso(account.lastLoginAt),
    passwordChangedAt: iso(account.passwordChangedAt),
    disabledAt: iso(account.disabledAt),
    mustChangePassword: account.mustChangePassword,
    locked: isLocked(account, now),
  };
}
