# 수학 선수학습 계획 — 실제 3자 합의 기록

2026-10-03. 사용자 지시: “철저한 계획 모드를 이용해서 계획을 세우고, 그 계획을 코덱스, 그록, 클로드와 3자 합의 도출한 다음 진행시킬 것.”

## 최종 승인

승인 문서: [plan-v03.md](./plan-v03.md)
SHA-256: `09cd2ab152621e563945dcaf0eb7270095c2e31411051a547d94953bb6948bd1`
Orca Run: `run_d1d13bf94c6c`

| 실제 검토자 | 최종 Task / Dispatch | 최종 판단 | 실제 승인 메시지 | 원문 |
|---|---|---|---|---|
| Codex | task_30e64ebf4c54 / ctx_6d79b6fef7c0 | approve | msg_51bab8fb4c15, 2026-10-02 22:23:46 UTC | [review-codex-v03-final.md](./review-codex-v03-final.md) |
| Grok | task_946b23bb943b / ctx_44196cfb43da | approve | msg_d8dd53d7afcf, 2026-10-02 22:20:14 UTC | [review-grok-v03-final.md](./review-grok-v03-final.md) |
| Claude | task_bb69396a9789 / ctx_0053975fa502 | approve | msg_46219b463cd7, 최종 v03 표결 | [review-claude-v03-final.md](./review-claude-v03-final.md) |

셋 모두 같은 최종 파일을 직접 읽고 해시를 검증해 승인했다. 원문 검토는 별도의 Orca worktree에서 실제 각 CLI가 수행했다. 최초 v01은 셋 모두 request_changes였고 합의로 처리하지 않았다. Claude의 v02 승인도 v03 승인과 구별하며 최종 합의 근거로 사용하지 않는다. worker_done의 succeeded만으로 승인 판단을 대신하지 않았다.

이 승인은 구현 시험을 통과했다는 뜻이 아니다. 200seed 공급·채점, 저장 호환, 권한/CAS, 시안 시각 합의, 두 학생 fixture의 실제 핸들러·플레이어 브라우저 검증은 필수 관문으로 남는다.

## 해결한 차이

- Codex의 선택 payload 칸, Grok의 별도 표, Claude의 읽기 계산이 갈렸다. 같은 g5-fractions 시범에서 기존 course 기록으로 계산하면 새 저장이 필요 없다는 데 셋이 동의했다.
- 약분 5-1-4-2는 자기채점 때문에 직접 진단에 부적합했다. 목표 5-2-2-1/2, 확인 5-1-5-4 → 5-1-5-3으로 수정했다.
- learn만 세던 발동은 만기 review에 막힐 수 있었다. 목표 자체의 직접 learn/review 두 완료 세션을 센다.
- 코스 하루 5문항과 미션 10문항 차이, learnedToday, due 우선이 복귀를 막았다. 같은 공통 추천을 사용하고 확인 뒤 learn 복귀를 먼저, 한도 안에서 한 번 허용한다.
- P의 일반 due를 통해 확인 상한을 우회하지 않도록 유예 중 재배정도 보류한다. 기록은 그대로이며 보류를 숙달로 표시하지 않는다.
- 새 seed/UUID만으로 새 문제를 보장하지 않는다. 실제 본문과 20seed 사전 공급을 검사하고, T까지 없으면 명시적 공급 부족을 표시한다.
- /learn의 자동 시작은 홈 추천 이유를 숨겼다. 실제 풀이 머리에 표시할 이유 한 줄을 시각 검토에 포함했다.
- 100단원 그래프 조회와 일부 범위의 자동 출제를 구별한다. 소단원 선수 간선, 성취기준 전수 감사 완료, 단원 전체 숙달을 추가하지 않는다.

## 구현 시 함께 지킬 승인 해석

- `MATH_PREREQ_CHECK=on`만 활성. **기본 꺼짐**, 공급 관문 전 켜지 않는다. 학생 API 표시 필드는 reader 먼저 호환하고 writer를 활성화한다.
- 버전값: graphSchemaVersion "1.1.0", 실제 graphContentHash, mappingVersion 1, policyVersion 1. 파생 표시 DTO에만 사용한다.
- P 만기 보류 조건에 P.lastReviewedAt ≥ 현재 plan.configuredAt를 포함한다. 계획 저장 시 configuredAt가 다시 찍히므로 이전 계획의 보류를 복구하지 않는다. 발급 유예는 별도 관찰 제한이다.
- summary.dueCount는 지금 실제로 추천할 수 있는 만기만 센다. 보류 P는 교사 근거의 heldSectionIds/holdReason과 기존 원천 섹션에 별도로 남긴다.
- 반복 본문 비교는 줄바꿈과 앞뒤 공백만 정규화한다. 의미상 유사성/문항류 다양성 검증이라고 주장하지 않는다.
- 최신 memory/progress가 보존 완료 세션보다 새것이면 old passed를 현재 상태로 재사용하지 않는다.
- 공급 검사에서 갈래별 서로 다른 본문 수도 기록한다. 공급 부족 상태는 결정적이며 재조회만으로 풀리지 않을 수 있다. 교사 화면에 사유와 같은 탐험 범위의 진도 변경/기능 해제 방법을 표시하고 실제 회복 시험을 둔다.
- 분수 단원 전체는 partial. 보류 P가 실패했다는 사실과 확인 범위를 교사에게 표시한다. 얇은 보충/잠정 정책의 효과는 운영 자료가 쌓인 뒤 보정한다.
- 정상 P 복습 뒤에도 참인 복귀 문장, 공급 부족 문구/단추, 학생 실제 이유 줄을 Wire/Hi-fi 검토에 포함한다.
- 새 교사 끝점이 필요하면 teacherGate·담당 반/소유 검사·withErrorLog를 사용한다. 기존 상세 끝점으로 충족할 수 있으면 그 경로를 확장한다.
- 현재 main 6e626f8a9는 검토 기준 뒤에 다른 트랙이 병합됐지만 해당 course/expedition/elementary/계약/화면 경로 변화가 없음을 확인했다. 다른 트랙 자료를 함께 수정하거나 커밋하지 않는다.

새 결정 MPR-20261003-01은 기존 consult-27/D-152의 자동 배정 보류만 이 시범에서 대체한다. 사용자 최신 지시로 승인된 선택에 추가 허가 절차를 넣지 않는다. global 결정 번호는 다른 트랙과 충돌하지 않게 확인 후 연결한다.

## 작업 상태

### 실제 최종 시각 합의 — 2026-10-03

네 시각 시안 중 **H1**을 세 모델이 독립적으로 선택해 승인했다. 동일 HTML blob SHA-256은 `fd9b495022a954025143062675e96b71249322fd162eaa307b9dd82ae1c39869`이다.

| 실제 검토자 | 판단 | 증거 |
|---|---|---|
| Codex | H1, approve | msg_bae85bfa868a · [hifi-codex-vote.md](./hifi-codex-vote.md) |
| Grok | H1 | msg_c1eed3e4b25a · [hifi-grok.md](./hifi-grok.md) |
| Claude | H1, approve | msg_8aeb6f0c6ef2 · [hifi-claude-vote.md](./hifi-claude-vote.md) |

실제 PC·320·390 PNG와 같은 해시의 HTML을 검토했다. `msg_5a57634294df`로 최종 합의를 전달한 뒤 제품 UI 구현을 시작했다. 구현 조건은 실제 학생 근거·공급 상태·보류 사유로 표시하고, 시범 범위 밖에 문제 공급이나 단원 전체 숙달을 표시하지 않는 것이다. 학생의 뒤로 단추는 320에서도 한 줄을 유지한다. 최종 구현과 브라우저 검사는 별도로 기록한다.

### 실제 화면 구조 합의 — 2026-10-03

네 구조 시안 중 **W2(한 열 목록에서 단원 상세 펼침)**를 세 모델이 독립적으로 선택했다. 승인한 개정 HTML SHA-256은 `8109a7ee826b9a6ed7d5b8f5bbfeb6e46b4d005a24ea8dfe0eb85537e7e04423`이다. 학생을 선택하지 않아도 기존 CourseDashboard에서 연결도를 열고, 선택된 학생의 부분 근거는 별도로 덧붙인다.

| 실제 검토자 | 판단 | 증거 |
|---|---|---|
| Codex | W2, approve structure | msg_4b671d4cde85 · [wire-codex-vote.md](./wire-codex-vote.md) |
| Grok | W2 | msg_fff76da20573 · [wire-grok-vote.md](./wire-grok-vote.md) |
| Claude | W2, approve structure | msg_2185b12f9bf8 · [wire-claude-vote.md](./wire-claude-vote.md) |

각 검토자는 실제 PC/휴대폰 PNG를 열었다. 구조 승인에는 Hi-fi 보완 조건이 있다: 확인 선수는 실제 1학기 복습 머리, 복귀는 2학기 목표 학습 머리로 표시한다. 네 소단원의 부분 근거, P 실패/보류 사유, 안전한 목표 대체 공급과 전체 공급 부족을 구별하고 관계 단원으로 이동하는 조작을 보여 준다. 하이파이 최종 승인과 제품 화면 구현은 아직 완료로 처리하지 않는다.

### 실제 문제 공급 관문 — 2026-10-03

Claude의 실행 보고 `msg_8fcb7fc5853d`, 커밋 `994ae0bdb9771ea7978df49af8e9478856afe109`: 원시 문항 2,400개와 실제 5문항 세션 800개(4,000문항)의 자동 채점·그림·보기 검사가 오류 없이 통과했다. 같은 세션 안 본문 중복이 0/2/2/1개 발견되며 실제 공급기가 이 세션을 제외한다. [공급·근거·정책 검사 기록](./impl-claude-evidence-policy.md)에 갈래별 서로 다른 본문 수와 조건을 남겼다. 운영 학생의 진단 정확도나 교육 효과를 검증한 결과로 해석하지 않는다. 기능 기본값은 꺼짐을 유지한다.

2026-10-03: 기능 계획 합의 완료. 그래프 생성·직접 근거/정책·공급 검사를 독립 Orca 작업으로 진행한다. 새 UI는 Wire 4 → 실제 3자 구조 선택 → Hi-fi 4 → 실제 3자 시각 선택 뒤 구현한다. 이 기록에 구현 완료나 교육 효과 검증을 미리 표시하지 않는다.
