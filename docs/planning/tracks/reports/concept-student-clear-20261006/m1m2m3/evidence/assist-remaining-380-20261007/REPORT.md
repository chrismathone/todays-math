# 중학교 잔여 380개 직접 독해 보조 결과

Task `task_b07f10debd58` / Dispatch `ctx_3565ba58418a` / terminal `term_53e7a9e3-a96d-48ce-b5b2-95d13d984931`.

직접 독해 **380개**를 완료했고, **95개 ID**에 완전한 대체 문구를 제안했다. B 수정 판정 40개, C 수정 판정 72개, 일반 설명(core) 수정 판정 39개이며 서로 중복된다. 미작성 0개, 최종 후보 계약 오류 0개, 최종 후보 표기 오류 0개, 보존 조건 오류 0개다.

이 보고서는 **Codex 직접 독해와 적용 대기 수정 제안**이다. 독립 Claude 승인, 학생 효과 실험, primary 적용 후 최종 재독, 전체 통합, 운영 반영, push를 완료했다는 뜻이 아니다. 수정 판정은 `revise`이며, 같은 ID의 변경하지 않은 형식에 있는 `adopt`는 읽은 원문 형식의 유지 판단일 뿐 대체 문구의 적용·발행 승인이 아니다. 각 수정 ID는 `pending-primary-application-and-final-reread` 상태다.

검토한 범위는 sourceIndex **2900–2999(100개), 3120–3399(280개)**뿐이다. 최대 25개씩 **16배치**로 실제 B 물음·참고 답·필수 의미, C 표시 문장·모든 인정 답, 원문 definition과 기존 coreAfter를 출력해 읽었다. 출력이 잘린 배치는 없으며, 380개 고유 ID 전부가 출력 기록에 있다. 반복문·스키마 검사·fingerprint 갱신을 독해로 세지 않았다. 그 뒤 작성한 수정안도 Root 정규화 결과를 실제 출력해 다시 읽었고 추가 수정 기록을 남겼다.

중점에서만 맞을 수 있는 조각 비 오류, 근거를 지정하지 않아 여러 합동 조건이 가능한 물음, 도형 기호를 넓이 값처럼 더하거나 나눈 표기, 숨은 꼭짓점·좌표 소속, 계수와 항의 혼동을 고쳤다. 확률 계산에서는 등가능·독립·비복원 조건과 약분 전 분자·분모를 밝혔다. 근호의 비음수 조건과 자연수 비 표현 가능 조건도 보충했다. 일반 설명의 수정은 조건·대상·정확한 수학 관계를 보충하며, 평가용 숫자 예시로 일반 설명을 바꾸지 않았다.

짧은 정식 이름·대소·값 해석을 배제하지 않았다. 기존 제외 사유가 단순한 값·계산 습관이라는 이유뿐인 B 중 3160, 3174, 3175, 3180, 3227, 3230, 3232에는 실제 판단 가능한 문항을 제안했다. 동일 형식의 다른 문항과 중복되거나 해당 단원 목표에서 제외한 형식은 개별 사유를 읽고 유지했다. `anyOf`와 인정 답은 의미 대안이며 배타적인 자동 문자열 채점 목록으로 쓰면 안 된다. 동치 식, 거꾸로 쓴 선분 이름, 정당한 다른 설명도 의미로 판단해야 한다.

primary 원천은 다른 워크트리의 `m1m2m3/audit.json`을 읽기만 했다. 원문은 immutable baseline `D:/tmp/concept-student-clear-20261006/baseline.json`(source commit `13bf05dce`)이며 원문 전체 entry·definition·SHA를 캡처했다. sourceIndex, ID, section, term, kind, level, example, givenCase, learningRole을 보존했다. 기존 raw의 그림 관계 필드도 전체 raw 캡처에 남았으며 운영 코드와 그림, primary audit/ledger, 직전 500개·초3/4 동결 자료, 학생 DB, 환경, Prisma, 설치에 손대지 않았다.

완료 대조에서 전체 audit 파일의 SHA는 변경되었으나, **예약 380개의 전체 raw 내용 SHA, `workerFingerprint('middle', row)`, 정규화 hash는 모두 캡처와 일치**했다. 이 fingerprint는 Root editorial.ts의 지정 필드 순서 JavaScript JSON이며 Python sorted JSON이 아니다. assembled B/C를 빠짐없이 보호하기 위해 raw 전체 hash와 normalized hash도 함께 대조했다. baseline 파일 SHA 역시 변하지 않았다. 정확한 최신 비교 시각과 전체 파일 SHA는 `evidence/current-comparison.json`에 있다.

| 증거 | 내용 |
| --- | --- |
| `reviews.json` | 380개 ID별 판정·이유·현재 원천 fingerprint·hash·학습 역할·읽기 시각·적용 대기 proposedPatch |
| `evidence/inputs.json` | 전체 raw, baseline entry·definition, 원문 SHA, 실제 Root 정규화 B/C·기존 core와 hash |
| `evidence/reading-batches.txt` | 16배치의 범위·시각과 380개 실제 출력 원문 |
| `evidence/manual-decisions.jsonl` | 배치별 수동 판정 원문 및 추가 수정 이력 |
| `evidence/proposal-reread.txt` | 수정 후 실제 정규화 B/C/core 출력·hash·표기 결과와 재수정 이력 |
| `evidence/validation.json` | 계약·표기·읽기 범위·보존 조건 검사, Root 도구 SHA와 재현 helper 원문 |
| `evidence/current-comparison.json` | 380개 현재 내용 대조와 전체 audit SHA 변경의 구별 |
| `evidence/manifest.json` | 다른 9파일의 정확한 바이트 SHA-256·크기; manifest 자기 hash 제외 |
| `.gitattributes` | 이 폴더 증거의 줄끝 자동변환을 끈 로컬 설정 |

검사 중 최초 3148 대안의 핵심어를 수식 안에 중첩한 오류는 수식 밖 핵심어로 고쳤다. 대안의 분수 뒤 조사 오류도 실제 문장을 다시 읽고 고쳤으며 그 이력은 수동 판정·재독 증거에 보존했다. 최종 후보는 Root `normalizeProposal` → `proposedEntry` 계약과 `bankNotationFaults` 검사에 모두 통과한다. 표기 예외를 다른 필드로 확대하지 않았다.

Root가 primary에 전달할 때는 `proposedPatch`의 assembled B/C와 동기화된 flat 필드를 함께 사용하고, 기존 frozen 원문·ID·level·학습 역할·그림 관계를 유지해야 한다. 변경하지 않은 core의 `coreAfter: null`은 원문 definition 유지이며 실제 최종 설명은 `proposedEffectiveDefinition`에 있다. 수정된 95개는 primary 적용 후 실제 최종 문구를 다시 읽고, 독립 검토와 전체 통합·운영 발행 게이트를 별도로 진행해야 한다. own 보고서만 커밋했으며 pull/merge/push는 진행하지 않는다.
