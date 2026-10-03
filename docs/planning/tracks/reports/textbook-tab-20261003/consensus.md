# 교재 제작 합의 원장

## 범위·행동 계획 v03

대상: `docs/planning/textbook-studio-20261003.md`, 27,328 bytes (LF), SHA-256 `60a508c008ea24abfcb8b361f3c639fbc19a80147ff404c045db9eb9cbb40702`. 계획 파일 자체는 표결 당시 문구와 바이트를 보존한다. 이 원장이 이후의 합의 상태를 기록한다.

2026-10-03 실제 Orca run `run_e9e92323ce2e`에서 다음 세 모델이 같은 해시의 범위·행동을 승인했다. 다른 모델을 Codex 하위 에이전트로 흉내 낸 표결이 아니다.

| 모델 | Task / Dispatch | 실제 메시지 | 결과 |
| --- | --- | --- | --- |
| Codex | `task_ae5047fd8a20` / `ctx_c1c71a06e762` | `msg_fead8f4b5d2b`, 05:41:49 UTC | APPROVE. exact bank entry, 개념 snapshot, 학생 응답/교사 관찰 분리, 기존 탐험 CAS/선수 범위 보존 |
| Claude | `task_0bd879e33a3f` / `ctx_b2bda39c03bc` | `msg_d5799203e13a`, 05:44:25 UTC | APPROVE. 불변 발행/같은 문제 재출제/개념 통합 일치. P1에서 구체 저장 형태·호환·정확한 선택을 고정 |
| Grok | `task_86b0243170bd` / `ctx_ecf1f36b901b` | `msg_4a3f623a907b`, 05:50:13 UTC | APPROVE. 동일 해시 확인, 보관본 유지와 exact-ID 개념백지 계약 수용 |

승인 범위는 계획이다. 제품 구현, P1 계약 정본, Hi-fi, v15 원고 이관, 실제 영상/로그인/물리 인쇄가 승인·완료된 것으로 확대하지 않는다. 계획의 v15 원본 미확보 상태는 유지한다.

## 화면 구조

`D:/tmp/textbook-tab-20261003/design/wire-review.html`과 W1–W4 PC/휴대폰 실제 브라우저 캡처를 비교했다.

- Claude `msg_428436561a35` 및 통합 v03 보고서: W3.
- Grok `msg_9f4e72093704`, 휴대폰 후속 `msg_e07830f1c71d`: W3.
- Codex `msg_5b6d31631fd2`: W3, 실제 여덟 캡처 확인.
- root: W3. 원고/계산된 미리보기 분리, 접이식 목차, 큰 펼침면 모드, 모바일 원고/미리보기 탭, 같은 개념 연결 조작을 포함한다.

Hi-fi4는 이후 실제 캡처로 별도 표결한다. 초기 일부 캡처의 아래쪽 회색 영역은 캡처 viewport 높이가 부족한 결과여서, 1600×1500 viewport의 `*-full.png`로 다시 확인했다. 최종 시안 증거에는 교정된 캡처를 사용한다.

## 남은 검토와 실행

P1 구체 계약은 `docs/planning/textbook-studio-p1-contracts-20261003.md`에서 검토한다. 현재 제품 코드·운영 DB 변경은 없다. 계약 승인 뒤 shared contract를 구현하고, 독립 Orca 트랙의 서버·조판·화면 작업을 통합한다. 완료 검증 후 main 병합·필요한 push와 조건에 맞는 worktree 정리를 한다.
