# 교재 제작 복구 최종 계획 — Codex·Claude·Grok 합의 원장

2026-10-05. **상태: 3자 전원 APPROVE, 최종 계획 확정.**

합의 대상은 [최종 실행 계획 v02](textbook-v15-recovery-plan-final-20261005.md)다. 원본 파일은 승인 후 변경하지 않았다.

| 고정 항목 | 값 |
| --- | --- |
| 정본 파일 | `docs/planning/textbook-v15-recovery-plan-final-20261005.md` |
| 표결 시 절대 경로 | `C:/Users/user/orca/workspaces/testautocreator/testbook/docs/planning/textbook-v15-recovery-plan-final-20261005.md` |
| 판 | 최종 표결본 v02 |
| SHA-256 | `0ab8ac18fc033936e52a300752dd73894fbccfa52c740c0acc52c0d03cb04bb7` |
| 바이트 규약 | UTF-8 LF, CR 0, 36,425바이트, 249줄 |
| 합의 Run | `run_6759ef0e6e62` |
| Coordinator | `term_fd50e6d1-e0ee-4847-8494-44cd8f8c5216` |

## 실제 최종 표결

| 당사자 | 판정 | 증거 | Task / Dispatch | 완료 메시지·커밋 |
| --- | --- | --- | --- | --- |
| Codex (coordinator) | **APPROVE**, 조건 없음 | [Codex 표결](tracks/reports/textbook-v15-recovery-plan-final-vote-codex-20261005.md) | coordinator 직접 검토, worker Task/Dispatch 없음 | 커밋 `baacc7848`. 외부 완료 메시지를 꾸며 쓰지 않음. |
| 실제 Claude | **APPROVE**, 조건 없음 | [Claude 표결](tracks/reports/textbook-v15-recovery-plan-final-vote-claude-20261005.md) | `task_227195bc3961` / `ctx_c93b197bc9fe` | `msg_44b686daadb8`, `32d2e821e` |
| 실제 Grok | **APPROVE**, 조건 없음 | [Grok 표결](tracks/reports/textbook-v15-recovery-plan-final-vote-grok-20261005.md) | `task_65c429d1d94c` / `ctx_33fcafa21850` | `msg_8fcf17ac1e61`, `50dfe3fa10967bd91cf29687a3c648f7284ef5a9` |

세 당사자 모두 위 SHA-256을 직접 확인했다. Claude·Grok은 각자의 Orca 작업자와 별도 worktree에서 실제 제공자로 실행했고, coordinator가 그들의 의견이나 표결을 대필하지 않았다. Claude의 launcher/직접 transcript 제공자는 claude, Grok은 launcher와 실제 transcript 제공자가 grok이었다. 모델명은 각 보고서의 자체 기록을 참조하며 coordinator가 임의로 지정하지 않았다.

## 초안에서 최종안까지

초안 v01의 해시는 `939a08e782170f39572b266c8db1af462ce9e471a9545967dcdc3c92fbc3eb70`다. Codex·Claude·Grok 모두 REVISE였으며 다음 기록을 그대로 보존한다.

- [v01](textbook-v15-recovery-plan-v01-20261005.md), [Codex 독립 검토](tracks/reports/textbook-v15-recovery-plan-review-codex-20261005.md).
- [Claude 독립 검토](tracks/reports/textbook-v15-recovery-plan-review-claude-20261005.md): `task_d4808f9fea15` / `ctx_b40bc7c464d6`, 완료 `msg_445bad8ba848`, 보고서 최종 커밋 `7304d024e`.
- [Grok 독립 검토](tracks/reports/textbook-v15-recovery-plan-review-grok-20261005.md): `task_5a64b2530efa` / `ctx_a8bdc715e628`, 완료 `msg_adcb3907cba1`, 커밋 `871641a99`.

v02는 핵심 1,657개/합본 9,119개 불일치, 공급 원천 부족, 엄격 저장 계약과 편집기 왕복, 모듈 추출 선행, 객관적 지면 측정, 원본 QA/실제 자동 구성 분리, 측정 뒤 맞쪽·고정 폭 링크 한 번 채움, 원천별 내용 검수, 31지면/28구성, 실계정 DB 쓰기·구체 형태·실물 인쇄를 반영했다. 수정/조정의 이유와 관문은 최종 계획 §2 결정 대장에 있다. v01 REVISE를 APPROVE로 이름만 바꾸지 않고 새 해시를 다시 표결했다.

## 승인 범위와 실행 상태

이 합의는 **실행 계획**의 최종 확정이다. G0a/G0b/G1~G6 통과, 앱 코드 구현, DB 반영, 배포, 수학 내용 승인, 실물 인쇄 완료를 뜻하지 않는다. 최종 계획의 실행 관문은 앞으로 수행한다.

원본 디자인 복구는 기존 요청 범위다. 원본을 넘어서는 구체 형태는 §11에 따라 시안을 먼저 만들고 기존 확정/위임 근거 또는 필요한 최종 확정을 기록한다. 지금 추상적인 새 형태 승인을 사용자에게 요청하지 않았다.

세 쌍 전체 시각 검토와 12학기 조합의 표본을 구분한다. 원본 답지 기준 부재, 운영 DB 미접속, 은행 편집 기록 미확인은 각 표결의 한계에 남아 있다. Claude의 실행 참고 메모는 구현 시 확인할 근거이며, 승인된 계획 바이트나 검수 범위를 조용히 변경하는 별도 합의가 아니다.

## 문서 검증·통합·리소스

- 표결 정본의 해시/CR 0/크기/줄 수를 확인했다. 최종 계획의 로컬 링크 5개가 모두 존재했고 kind 표 31행/31고유값을 검사했다. 계획 작성 중 앱 코드·DB·원고·배포를 변경하지 않았다.
- 두 제공자의 최종 보고서를 읽고 각 커밋을 coordinator branch로 병합했다. 계획·표결·이 원장을 main에 병합하며 다른 세션의 기존 변경을 보존한다. 이 계획 작업에서는 새 운영 배포나 원격 푸시를 수행하지 않는다.
- 초기 Claude/Grok 작업자와 최종 Grok 작업자는 완료 후 release했고 transcript를 보관했다. 최종 Claude의 release 결과는 **retained / user_takeover**였다. 사용자 소유로 전환된 세션을 강제로 닫거나 그 작업 폴더를 삭제하지 않는다. clean/merged/inactive 조건을 충족한 Grok worktree만 정리하고 Git 브랜치를 보존한다.
- 전달본도 정본의 UTF-8 LF 바이트를 복사한다. Git의 CRLF checkout 표시와 승인 대상 바이트를 혼동하지 않으며 원문 SHA로 검증한다.
