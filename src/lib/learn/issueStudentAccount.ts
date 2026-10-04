/**
 * 원장 — 학생 계정 **발급 · 다시 발급 · 끄기/켜기 · 상태** (D-124 ⑷ · D-125 ⑵ · 브리프 §2.3).
 *
 * 저장·해시·난수·감사는 주입받는다(`issueDeps.ts` 가 진짜를, 시험·변이 탐침이 가짜를 넣는다).
 * 라우트(`/api/students/{id}/account/**`)는 세션·같은 사이트·본문 검사만 하고 여기를 부른다.
 *
 * 규칙:
 *  1. 지점 관리자·원장·관리자는 소속 지점 학생만, 최고관리자는 전체 지점 학생을 발급·관리한다.
 *     일반 강사는 원본의 student:account 권한이 있어도 발급하지 못한다(`studentAccountPolicy.ts`).
 *     `issueDeps.ts`가 현재 학생·반·지점 관계를 확인하고 저장 직전에 다시 확인한다.
 *  2. **한 명씩**(D-124 ⑷). 이미 계정이 있으면 거부 — «다시 발급»은 비밀번호만 새로.
 *  3. 기본 아이디는 학생 이름이다. 개별 발급에서 동명이인 아이디를 조정할 수 있고, 초기 비밀번호는 등록 연락처 끝 4자리다.
 *  4. 🔴 초기 비밀번호는 **해시만** 저장하고 부르는 쪽에 **한 번** 돌려준다. 감사 기록에 싣지 않는다(⑥).
 *  5. 끄기는 `disabledAt` 만 찍고 지우지 않는다(수맥 규칙). 켜면 비운다.
 *  6. 모두 `AccountAuditLog` 에 남긴다(기존 `recordAudit`) — 발급한 사람이 `userId`·`actorId` 다
 *     (계정을 발급한 지점 관리자·원장·최고관리자).
 *  7. 상태를 읽을 때 그 학생의 **퇴원 여부**를 같이 준다 — 발급 칸이 «퇴원 — 로그인 막힘»을 그린다
 *     (learn-screens 브리프 §1.3 · D-126 ⑺). 소유 판정과 같은 한 번의 조회에서 나온다.
 *  8. 🔴 **퇴원한 학생에게는 발급 · 다시 발급 · 켜기를 안 한다**(D-127 · 리드 결정) — 409. 끄기는 된다(막는 쪽이다).
 *     퇴원 판정은 `accountBlock.ts` 의 `studentWithdrawn` 하나(`issueDeps.ts` 가 부른다) — 로그인을 막는 판정과 같다.
 *     소유 판정이 먼저다 — 남의 반 학생이면 퇴원 여부와 상관없이 403(퇴원 여부를 흘리지 않는다).
 */
import {
  normalizeLoginId,
  type StudentAccountStatus,
} from "@/contracts/studentAccount.contract";

import type { ScopeViewer } from "@/lib/ownerScope";
import {
  canManageStudentAccounts,
  studentAccountBranchAllowed,
} from "./studentAccountPolicy";

import { isLocked } from "./studentLogin";

export interface IssuedAccount {
  id: string;
  studentId: string;
  loginId: string;
  passwordHash: string;
  mustChangePassword: boolean;
  /** 발급한 원장 — 그 계정이 지워지면 비워진다(SET NULL) */
  issuedById: string | null;
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
  authorizeStudent?(viewer: ScopeViewer, studentId: string): Promise<boolean>;
  /** 학생의 반 소유자와 퇴원 여부 — 학생이 없으면 null */
  findStudentOwner(studentId: string): Promise<{
    ownerId: string;
    ownerBranchId?: string | null;
    withdrawn: boolean;
  } | null>;
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
  /** Initial issuance uses the registered contact tail; null means the source needs contact data. */
  initialPinForStudent?(studentId: string): Promise<string | null>;
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
  | "no_account"
  | "missing_phone"
  /** 규칙 8 — 퇴원 학생 발급 · 다시 발급 · 켜기 (문구가 셋이라 까닭도 셋) */
  | "withdrawn_issue"
  | "withdrawn_reissue"
  | "withdrawn_enable";

export type IssueResult<T> =
  { ok: true; value: T } | { ok: false; reason: IssueFailure };

const fail = (reason: IssueFailure) => ({ ok: false as const, reason });

/** 규칙 1 — 발급 역할과 학생의 지점 범위를 확인하고 퇴원 여부를 돌려준다. */
async function ownedStudent(
  deps: IssueDeps,
  director: ScopeViewer,
  studentId: string,
): Promise<{ failure: IssueFailure } | { failure: null; withdrawn: boolean }> {
  if (!canManageStudentAccounts(director)) return { failure: "not_owner" };
  const owner = await deps.findStudentOwner(studentId);
  if (!owner) return { failure: "student_not_found" };
  if (
    !(deps.authorizeStudent
      ? await deps.authorizeStudent(director, studentId)
      : studentAccountBranchAllowed(director, owner.ownerBranchId))
  )
    return { failure: "not_owner" };
  return { failure: null, withdrawn: owner.withdrawn };
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
  input: { director: ScopeViewer; studentId: string; loginId: string },
): Promise<IssueResult<{ account: IssuedAccount; initialPassword: string }>> {
  const owned = await ownedStudent(deps, input.director, input.studentId);
  if (owned.failure) return fail(owned.failure);
  if (owned.withdrawn) return fail("withdrawn_issue");

  const loginId = normalizeLoginId(input.loginId);
  if (await deps.findAccountByStudent(input.studentId))
    return fail("account_exists");
  if (await deps.findAccountByLoginId(loginId)) return fail("login_id_taken");

  const initialPassword = deps.initialPinForStudent
    ? await deps.initialPinForStudent(input.studentId)
    : deps.generatePin();
  if (!initialPassword) return fail("missing_phone");
  const passwordHash = await deps.hashPin(initialPassword);
  let account: IssuedAccount;
  try {
    account = await deps.createAccount({
      studentId: input.studentId,
      loginId,
      passwordHash,
      issuedById: input.director.id,
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
    auditFor("student_account.issue", input.director.id, account),
  );
  return { ok: true, value: { account, initialPassword } };
}

/** 다시 발급 — 비밀번호만 새로. 첫 로그인 표시를 다시 세우고 잠금을 푼다 */
export async function reissueStudentPassword(
  deps: IssueDeps,
  input: { director: ScopeViewer; studentId: string },
): Promise<IssueResult<{ account: IssuedAccount; initialPassword: string }>> {
  const owned = await ownedStudent(deps, input.director, input.studentId);
  if (owned.failure) return fail(owned.failure);
  if (owned.withdrawn) return fail("withdrawn_reissue");
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
    auditFor("student_account.reissue", input.director.id, updated),
  );
  return { ok: true, value: { account: updated, initialPassword } };
}

/** 끄기 · 켜기 — `disabledAt` 만. 끈 계정을 다시 끄면 처음 끈 시각을 그대로 둔다 */
export async function setStudentAccountDisabled(
  deps: IssueDeps,
  input: { director: ScopeViewer; studentId: string; disabled: boolean },
): Promise<IssueResult<IssuedAccount>> {
  const owned = await ownedStudent(deps, input.director, input.studentId);
  if (owned.failure) return fail(owned.failure);
  // 규칙 8 — 켜기만 막는다. 끄기는 막는 쪽이라 퇴원이어도 된다
  if (owned.withdrawn && !input.disabled) return fail("withdrawn_enable");
  const account = await deps.findAccountByStudent(input.studentId);
  if (!account) return fail("no_account");
  const updated = await deps.updateAccount(account.id, {
    disabledAt: input.disabled ? (account.disabledAt ?? deps.now()) : null,
  });
  await deps.audit(
    auditFor(
      input.disabled ? "student_account.disable" : "student_account.enable",
      input.director.id,
      updated,
    ),
  );
  return { ok: true, value: updated };
}

/** 발급 칸이 읽는 것 — 그 학생의 계정(없으면 null)과 퇴원 여부(규칙 7) */
export async function readStudentAccount(
  deps: IssueDeps,
  input: { director: ScopeViewer; studentId: string },
): Promise<IssueResult<{ account: IssuedAccount | null; withdrawn: boolean }>> {
  const owned = await ownedStudent(deps, input.director, input.studentId);
  if (owned.failure) return fail(owned.failure);
  return {
    ok: true,
    value: {
      account: await deps.findAccountByStudent(input.studentId),
      withdrawn: owned.withdrawn,
    },
  };
}

/** 원장님 화면에 가는 상태 — 비밀번호·해시 칸이 없다. `viewerId` = 지금 보는 원장 */
export function toAccountStatus(
  account: IssuedAccount,
  now: Date,
  viewerId: string,
): StudentAccountStatus {
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  return {
    studentId: account.studentId,
    loginId: account.loginId,
    issuedAt: account.issuedAt.toISOString(),
    issuedByViewer:
      account.issuedById !== null && account.issuedById === viewerId,
    lastLoginAt: iso(account.lastLoginAt),
    passwordChangedAt: iso(account.passwordChangedAt),
    disabledAt: iso(account.disabledAt),
    mustChangePassword: account.mustChangePassword,
    locked: isLocked(account, now),
    // 발급 칸의 «잠김 — N분 뒤 풀림» — 화면이 «지금보다 뒤인가»만 본다(D-127 Q5)
    lockedUntil: iso(account.lockedUntil),
  };
}
