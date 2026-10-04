# 관리자 사용성 후속 — 계정·연동 구현 보고 (2026-10-04)

- 대상: [관리자 사용성 점검 후속 실행 계획](../../admin-usability-remediation-20261004.md)의 A07 · B01 · B02 · B03 · B04 · B07 · D02 · D04 · D07.
- 작업자: Grok 세션. 가지 `BIGSHOL/admin-usability-grok`.
- 구현 커밋 `876dd1bfc`. 부모는 당시 `BIGSHOL/admin-page` `ce208420a`(작업실·교재·역할 조회 타입 수정 포함, fast-forward). 계정 파일 충돌은 없었다.
- 범위: 계정 검토 폼, 에이와 관리 화면, 학생 계정 일괄 발급, 관리 수신·관계·비밀번호 정책과 그 시험. 리드 계획, SRS 목록·복귀·옆 메뉴, `AdminHeader`, `src/app/admin/eywa-sync/page.tsx`, 다른 작업자 보고서는 고치지 않았다. 운영 쓰기·push·배포·의존성 변경·migration 없음.

## 결론

아홉 항목을 구현 커밋에 넣었고, 대상 시험 9파일 94개와 전체 `tsc --noEmit`(힙 8GB)가 통과했다. 브라우저 확인과 통합 시험은 하지 않았다. 루트가 그 확인을 맡는다.

## 항목별 결과

| ID | 한 일 | 지키는 시험 |
|---|---|---|
| A07 | 통신 칸은 사건 `errorCode`의 읽기 라벨, 반영 칸은 처리 상태. 외부 사건 `errorCode` 계약은 바꾸지 않았다. 관계 충돌은 기존 `AccountAuditLog`에 `bindingId`·`snapshotId`·`eventId`·사유 «관계 충돌»·검토 ID를 남긴다. 사유가 없는 옛 기록은 «사유 미기록». 계정 확인 대기와 관계 검토는 따로 센다. 보관 담당자 지정·변경은 최고관리자만, 같은 지점의 승인·미정지·미삭제·비최고관리자 교사만. 잠금 안에서 기대 담당자와 비교하고, 감사에 변경 전후 ID를 남긴다. 이미 담당자가 있는 반은 `userId`를 갱신하지 않는다. 담당자가 없는 반만 접근이 생긴다고 화면에 적고, 원인을 고치기 전 재시도는 같은 이유로 실패한다고 적는다. | `EywaUsability.test.tsx` 1개 · `managedActivation.test.ts` 2개 · `accountUsabilityPolicy.test.ts` |
| B01 | 중지 효과(임대·세션 무효)는 그대로다. 서버가 영향 계정 수를 세고, 화면은 그 수를 확인한 뒤에만 중지한다. 취소는 아무것도 쓰지 않는다. 복구 시작은 쓰기 전에 `enabled`·건강·같은 epoch·미종료를 다시 본다. `enabled === false`는 `activation_requires_enabled`로 거절하고 트랜잭션과 스냅샷 조회를 하지 않는다. 종료된 연결은 그 검사보다 건강 거절이 먼저다. 스냅샷을 적용하지 못하면 `snapshot_not_applied`이며 모드를 바꾸지 않는다. 모드 접수는 복구 완료가 아니다. 복구는 최신 `eywa.binding_shadow` 감사에 남은, 연동 정지로만 막힌 계정만 연다. 수동 정지·삭제·종료·epoch 불일치는 열지 않는다. 다시 연 계정이 있을 때만 재로그인 안내를 보인다. 실패·원본 실패·수동 중지·삭제·종료·epoch 불일치에는 복구 완료를 보이지 않는다. retire·rebaseline은 실패 시 닫힌 채로 둔다. 감사에는 수와 식별자만 남긴다. 활성화에 `applyManagedControl`을 쓰지 않는다. | `managedActivation.test.ts` 5개 · `EywaUsability.test.tsx` 중지 취소 1개 |
| B02 | 더러워짐은 원래 이름·이메일과 현재 값의 차이다. 실행 취소·Ctrl+Z·연속 실행 취소로 원래 값이면 이동 잠금을 푼다. 처리 중에는 중복 제출과 이동을 막는다. | `AccountUsabilityForm.test.tsx` 1개 |
| B03 | 발급 성공은 뒤이은 계정 읽기보다 먼저 보존한다. 읽기 실패는 읽기만 다시 하고, 새로고침 전에는 다른 저장을 막는다. `AccountRequestError`가 아닌 예외는 결과 불명이다. 상태 0을 만들지 않고, 비밀번호를 보여 주지 않으며, POST를 자동으로 다시 보내지 않는다. 불명 뒤에는 명시적 재발급이 남는다. 성공을 안 뒤에는 읽기가 끝날 때까지 재발급을 막는다. | `AccountUsabilityForm.test.tsx` 2개 |
| B04 | 비밀번호 라우트와 화면이 `passwordReissueDecision` 하나를 쓴다. `authSource === "eywa"`는 원본 복구만 안내하고 재발급 단추를 숨긴다. 연동된 로컬 계정은 기존 최고관리자 30자 근거를 요구한다. 삭제·최고관리자 거절은 유지한다. 감사의 `recoveryEvidence`는 `decision.evidence`다. | `adminPasswordRevision.test.ts` 17개 · `accountUsabilityPolicy.test.ts` · 화면 1개 |
| B07 | 검증 실패나 통신 실패에도 근거와 선택 값은 남는다. `candidate_changed`는 후보만 다시 읽고 확인 체크만 지운다. 비밀번호 입력은 React 상태에 넣지 않고, 보낸 뒤 DOM에서 지운다. | `EywaUsability.test.tsx` 1개 · `AccountUsabilityForm.test.tsx` |
| D02 | 사건 30 · 계정 200 · 검토 10. 서버가 `total`과 현재 범위를 준다. 화면 쪽 페이지 이동은 같은 GET에 `eventsPage`·`accountsPage`·`reviewsPage`를 붙이며 `router.refresh`를 쓰지 않는다. 시각은 `kstDateTimeLabel`이고, 날짜는 기존 `kstDateOf`만 쓴다. `kstRelationshipDay`도 `kstDateOf`에 위임된 상태를 유지했다. | `kstDate.test.ts` 5개 · `EywaUsability.test.tsx` · `accountUsabilityPolicy.test.ts` |
| D04 | 연결이 없으면 «확인 후 연결 승인»을 막고, 지점 연결과 보관 담당자가 먼저라고 적는다. | `EywaUsability.test.tsx` 1개 |
| D07 | 첫 동작은 GET 미리보기다. 화면은 발급 가능·기존·제외와 사유를 보여 주고, 발급 가능만 기본 선택한다. 명시적 POST `{studentIds}`만 만든다. `[]`는 0건이며 계정을 만들지 않는다. 본문이 있는데 형식이 아니면 400이고, 본문 없는 기존 전체 발급으로 넘어가지 않는다. 빈 본문(길이 0)만 기존 전체 발급이다. 서버는 선택 ID를 현재 권한 명단과 교집합한다. 미리보기·응답·감사에 전화번호와 비밀번호를 넣지 않는다. 페이지를 열 때 발급하지 않는다. 이 항목은 일반 승인·권한 일괄 처리를 끝내지 않는다. | `BulkIssuePreview.test.tsx` 2개 · `bulkStudentAccounts.test.ts` 20개 · `accountUsabilityPolicy.test.ts` |

## 시험·타입 검사

- 실행: `npx vitest run`에 아래 9파일. **94개 통과**, exit 0 (2026-10-04, 부모 `de84f0737` 위에서 구현 워킹트리). 이후 교재 부족 수정 `ce208420a`는 이 파일들과 겹치지 않았다.
  - `src/__tests__/api/managedActivation.test.ts` (5)
  - `src/__tests__/api/adminPasswordRevision.test.ts` (17)
  - `src/__tests__/api/bulkStudentAccounts.test.ts` (20)
  - `src/__tests__/unit/accountUsabilityPolicy.test.ts` (6)
  - `src/__tests__/unit/adminAccountSerialization.test.ts` (32)
  - `src/__tests__/components/AccountUsabilityForm.test.tsx` (4)
  - `src/__tests__/components/EywaUsability.test.tsx` (3)
  - `src/__tests__/components/BulkIssuePreview.test.tsx` (2)
  - `src/__tests__/unit/kstDate.test.ts` (5)
- 타입: `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`. 구현을 올린 트리(부모 `ce208420a`)에서 **exit 0**. 그 전 한 번은 SRS 시험의 `getByRole(..., { exact: true })` 때문에 exit 2였다. 그 시험은 이 작업 파일이 아니고, 부모에 포함된 `cde93fadf`가 고친 뒤의 실행은 깨끗하다.
- 구현 커밋 직후 `BIGSHOL/admin-page` `a541c8f86`가 `876dd1bfc`를 이미 포함하고 있어 그 팁으로 fast-forward 했다. 추가분은 SRS·교재 이탈 가드와 e2e 하니스이고 계정 파일은 그대로다. 같은 타입 검사를 그 팁에서 다시 실행해 **exit 0**.
- 전체 Vitest·Playwright·브라우저 실사용은 돌리지 않았다.

## 하지 않은 것 · 한계

- **브라우저 확인을 하지 않았다.** 데스크톱·모바일에서 중지 확인, 복구 문구, 발급 대화상자, 페이지 이동을 사람이 누르는 확인은 루트 통합 확인이다.
- **통합 시험과 운영 DB를 쓰지 않았다.** 활성화·발급·비밀번호 시험은 모킹과 기존 라우트 시험이다.
- push·배포·`prisma generate`·migration·의존성 변경을 하지 않았다. `node_modules`는 리드 워크트리 정션이라 커밋하지 않았다.
- 인쇄 지면은 바꾸지 않아 `/dev/print-check` 항목은 추가하지 않았다.
- 비밀번호와 전화번호는 미리보기·감사·증거 출력에 넣지 않았다. 발급된 임시 비밀번호는 발급 성공 응답을 계정 화면에만 보여 준다.

## 고친 파일

- 정책: `src/lib/admin/accountUsability.ts` · `src/lib/kstDate.ts` · `src/lib/adminAccounts.ts` · `src/contracts/accountAccess.contract.ts`
- 서버: `src/lib/eywa/managedAdministration.ts` · `src/lib/eywa/managedReceiver.ts` · `src/lib/eywa/managedRelations.ts` · `src/lib/learn/bulkStudentAccounts.ts`
- 라우트: `src/app/api/admin/eywa-sync/route.ts` · `src/app/api/account/eywa-managed/route.ts` · `src/app/api/admin/users/[id]/password/route.ts` · `src/app/api/classes/[id]/student-accounts/route.ts`
- 화면: `src/components/account/EywaManagement.tsx` · `src/components/admin/AccountReview.tsx` · `src/components/class/BulkStudentAccountButton.tsx`
- 시험: 신규 5개, 기존 수정 3개(`bulkStudentAccounts` · `adminAccountSerialization` · `kstDate`). `adminPasswordRevision`은 수정 없이 통과
