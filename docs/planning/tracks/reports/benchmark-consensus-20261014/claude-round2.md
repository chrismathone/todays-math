# Claude 2차 계획 검토

검토일 2026-10-14 · Orca Run `run_00c3cdc517b2` · Task `task_a0ad81474eb5` · Dispatch `ctx_16d34cae5690`

아래는 실제 검토 메시지다. 최종 개정안 4의 판정은 합의 기록을 따른다.

## msg_644d079c88c7

[Claude 2차 합의 검토 — 개정안 3 판정: approve-with-changes]
R1의 차단 6건(수량 의미 · 쪽/학평 메타데이터 · 연산 저장/채점 · 슬롯 술어 · D-07/D-159 · 롤아웃)은 모두 반영됐다. Grok 안의 «초등 7스킬군 첫 출시 · 분수/소수/정수는 확장»에 동의한다(조건 통제가 분명하고 범위가 닫힌다). 남은 실제 차단은 둘이고, 둘 다 계획 문장 한두 줄로 고칠 수 있다. [관찰]=main 4040b23b3 소스 확인.

■ 남은 차단
C1 새 문서 kind는 DB 마이그레이션이 필요하다 — 계획은 DB→코드 순서를 메뉴에만 적었다.
[관찰] workspace_document.kind에 CHECK가 있다: workspace_document_kind_check IN ('draft','extraction','conceptBlank') (prisma/migrations/20261001210000_workspace_document_concept_blank/migration.sql:9-12). 따라서 arithmetic-sheet 저장은 CHECK 변경 없이는 운영에서 실패한다.
→ 수정(«저장과 출력» 절에 추가): «새 kind는 workspace_document_kind_check 변경 마이그레이션을 동반한다. 공유 DB 적용은 원장님 승인 뒤, DB 먼저 · 코드 나중. 이 kind를 모르는 옛 코드가 목록/읽기에서 깨지지 않는지(모르는 kind 무시) 확인한다.» 이름은 기존 관례(conceptBlank — camelCase, VARCHAR(20))에 맞춘다(arithmeticSheet 등).

C2 슬롯의 «원문 fingerprint 대응» 조건은 런타임 자료가 없고, 짝 시험(2/2 ⇔ planRetry 부족 0)과 모순된다.
[관찰] Problem에 fingerprint · digest 칸이 없다. planRetry · findRetryCandidates · planTestRetry는 fingerprint를 보지 않는다. fingerprint는 적재 도구에만 있다(src/lib/import/schoolTextbook/refreshPlan.ts:60 fingerprintOf — 글이 바뀐 행을 directUseAllowed=false로 잠금, 101행). [추론] 준비 상태에만 fingerprint를 넣으면 준비 상태가 복습보다 엄격해져 짝 시험이 깨진다. 또한 그 값을 읽을 저장 위치가 없다.
→ 수정(둘 중 하나로 명시): (권장) 런타임 준비 상태 = planRetry 술어와 똑같이(externalId · source · originProblemId · unitId · 출제 자격). 원문-변형 대응은 적재/갱신 도구의 책임으로 둔다: 원문 글이 바뀌어 잠기거나 다시 검토될 때 그 원문의 tb-retry-v1 슬롯 변형도 함께 잠그거나 연결을 다시 검증한다. 1A는 지금 도구가 변형까지 잠그는지 확인해 공백으로 보고한다. (대안) 런타임 fingerprint가 꼭 필요하면 저장 칸(DB 먼저) + planRetry 변경을 같은 계약으로 묶는다 — 이번 범위는 커진다.

■ 차단 아닌 정정
- 8행 «첫 목표 … 채점 · 두 변형 복습으로 이어 가는 흐름을 완성» vs P0/P2 표: 제작기 → 채점 재진입은 P2다. 첫 목표 문장을 «P0: 찾기 · 수량 · 구성 · 저장 · 출력 + 기존 채점 경로의 두 변형 복습 보존, 제작기 학습지의 채점 재진입은 P2»로 맞춘다.
- 7스킬군의 domainSize는 일부가 작다(예: 한 단 곱셈구구는 순서 있는 피연산자로 열 몇 개). 생성 전에 화면이 가능 수를 보여 주고 단추를 막는 것을 Wire 항목에 넣는다(거절 메시지만으로 두지 않는다).
- 연산 문서는 «내 시험지» 목록 · 공유(visibility/sharedBranchId) · 문서 문항 수(problemCount) 집계에서 어떻게 보일지 1B/2단계 경계에 한 줄 적는다(문제은행 수량에 안 섞인다는 10번 시나리오는 이미 있다).

판정: approve-with-changes. C1 · C2 두 문장이 들어가면 approve.

## msg_409d3b3fc158

개정안 3.1을 읽기 전용으로 다시 확인했다. R1의 차단 여섯과 3.1의 문구 보강(공개 payload·출력에 solution 없음, 스킬별 용량 비교와 회차 전체 거절, skillId별 고정 표기)은 모두 받아들인다. Grok의 초등 7스킬군 첫 출시에도 동의한다(상세는 msg_644d079c88c7). 판정은 approve-with-changes이고 남은 실제 차단은 둘이다. C1: workspace_document.kind에 CHECK(draft·extraction·conceptBlank)가 있어서 arithmetic-sheet를 저장하려면 마이그레이션이 필요하므로, 원장님 승인 후 DB 먼저·코드 나중 순서를 계획에 적어야 한다. C2: 슬롯의 '원문 fingerprint 대응'은 Problem에 저장 칸이 없고 planRetry도 보지 않아 '2/2 ⇔ 부족 0' 짝 시험과 모순되므로, 런타임 판정은 planRetry 술어와 같게 두고 대응 검증은 적재·갱신 도구가 변형까지 잠그는 책임으로 옮기기를 권장한다. 이 두 문장이 들어가면 approve다.

