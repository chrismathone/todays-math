/**
 * 🔴 학생 계정이 **막혔나** — 수동 꺼짐 ∪ 퇴원 ∪ 연동 접근 중지.
 *
 * 부르는 곳이 **이 파일 하나**를 부른다:
 *   - 로그인 · 비밀번호 바꾸기의 «지금 번호 확인» — `studentLogin.ts` 의 `verifyStudentPin`
 *   - 요청마다 다시 짓는 학생 토큰 — `studentSession.ts` 의 `studentTokenFor`
 *   - 비밀번호 바꾸기 라우트의 스스로 확인 — `src/app/api/learn/password/route.ts`
 *   - 원장님 발급 API 의 퇴원 확인(퇴원 쪽 `studentWithdrawn` 만) — `issueDeps.ts` → `issueStudentAccount.ts` (D-127)
 * 각자 적으면 한 곳만 퇴원을 보고 나머지는 들인다(예: 로그인은 막는데 이미 든 세션은 계속 산다 ·
 * 로그인은 막는데 발급 API 는 퇴원 학생에게 새 번호를 준다).
 *
 * 퇴원한 학생(`Student.eywaWithdrawnAt` — eywa 동기화가 찍는다)은 **꺼진 계정과 똑같이** 군다: 맞는 번호도
 * «아이디 또는 비밀번호가 맞지 않습니다.», 실패 수에 들고, 이미 든 세션은 다음 요청에서 끊긴다. 다르게 굴면
 * 그 차이로 계정 상태가 샌다. 되돌아와 동기화가 퇴원 표시를 풀면 다시 들어온다(계정은 지우지 않는다).
 */
export interface BlockableStudentAccount {
  /** 원장님이 끈 시각 */
  disabledAt: Date | null;
  /** 그 학생이 퇴원 처리된 시각(`Student.eywaWithdrawnAt`) */
  withdrawnAt: Date | null;
  /** A failed managed binding/license/enrollment check; separate from manual disabledAt. */
  managedAccessAllowed?: boolean;
}

/** 막힘 판정의 **퇴원 쪽** — 발급 API 도 이것을 부른다(D-127 «새 판정 금지») */
export function studentWithdrawn(student: {
  withdrawnAt: Date | null;
}): boolean {
  return student.withdrawnAt !== null;
}

export function studentAccountBlocked(
  account: BlockableStudentAccount,
): boolean {
  return (
    account.disabledAt !== null ||
    studentWithdrawn(account) ||
    account.managedAccessAllowed === false
  );
}
