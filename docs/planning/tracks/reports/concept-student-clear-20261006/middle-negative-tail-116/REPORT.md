# 중등 독립 지적 current[160–275] — 보고서 전용 완료

배정된 **116개 고유 ID**를 실제 원문·현재 B/C·모든 답·필수 기준·일반 설명·역할·원래 Claude 지적과 대조하여 읽었다. **97개 완전한 proposedRawRow**, **19개 개별 근거가 있는 유지 판정**을 작성했다. 모든 최종 정규화 후보를 20개 이하씩 다시 출력하여 직접 읽었다.

Task `task_4480d10f3756`, Dispatch `ctx_6bf34890cd2d`, reader: Codex dispatched direct reader. 이 보고서는 원래 Claude 부정 응답을 삭제하거나 pass로 바꾸지 않는다. 독립 Claude 승인, primary 적용 후 재독, 학생 효과 실험, 운영 배포 완료를 주장하지 않는다.

## 결과와 검증 범위

| 항목 | 결과 |
|---|---:|
| current 배열 인덱스 | 160–275 포함 |
| 고유 ID / 완료 판정 | 116 / 116 |
| 실제 raw 수정안 / 이유 있는 유지 | 97 / 19 |
| 입력 캡처 시 snapshot과 다른 현재 hash | 0 |
| 미처리 / 계약 / 표기 / 보존 오류 | 모두 0 |
| keep 결정과 원문 C 불일치 | 0 |
| 116개 후보끼리 blankClashes | 0 |
| 중등 3719개에 후보를 겹쳐 검사한 범위 관련 blankClashes | 0 |
| 일반 설명 최대 보이는 길이 | 121자 (상한 160자) |
| B 물음 최대 보이는 길이 | 160자 (상한 240자) |
| C 최대 빈칸 수 | 3개 (계약 1–4개) |

검증 시점에 최신 primary audit의 97개 수정 대상은 캡처 원안 그대로였고, 19개 유지 대상은 예상된 동일 원안이었다. 예상치 못한 최신 raw/normalized drift는 0개였다. 이후 primary의 적용 상태는 이 보고서의 성공 범위에 포함하지 않는다.

## 고정 입력과 개별 판정

`source-snapshot.json`은 배정 snapshot의 **원본 바이트 그대로**이다. `immutable-input.json`은 primary의 최신 audit에서 ID로 찾은 116개 raw, Root normalizeProposal로 얻은 normalized, 원천 sourceIndex, 원본 commit `13bf05dce`의 각 ConceptEntry, 전체 snapshotItem 및 원래 blind/key 응답을 캡처한다. 원천 배열 순서와 dispute 배열 인덱스는 별도 필드이다. 각 입력 파일의 byte SHA는 이 파일과 최종 `manifest-final.json`에 기록되어 있다.

Git의 core.autocrlf=true를 확인하여 이 폴더에만 `.gitattributes`의 `* -text`를 추가했다. 이를 통해 원본 CRLF snapshot과 출력 파일의 바이트가 커밋·cherry-pick·checkout에서 자동 변환되지 않는다. `manifest.json`은 이 보존 설정을 넣기 전의 초기 봉인 초안으로 보존하며, 실제 파일 SHA 검증은 `manifest-final.json`을 사용한다.

원문은 Root가 사용하는 `D:/tmp/concept-student-clear-20261006/baseline.json`의 `sourceCommit=13bf05dce`에서 가져왔다. 이 파일은 읽기만 했으며 immutable-input의 각 `original`에 원문을 그대로 보존했다. 최초 immutable-input SHA256: `2910b0acc769b9c0d774dedce427859a1e96c141a10eaa01a3b08357326e6ad9`.

`before-*.txt` 10개는 12개 이하 묶음의 실제 원문·현재 질문·답·기준·일반 설명·역할·원지적 출력이다. `manual-*.json`은 출력 독해 뒤 작성한 개별 수동 판정이다. `reviews.json`이 최종 116개 판정의 단일 인계 파일이며, 각 행에는 원안 fingerprint/hash, 입력 SHA, 실제 독해 파일·시각·reader, 변경 이유, 필요한 완전한 proposedRawRow, 후보 fingerprint/hash, 정규화 후보와 최종 재독 증거가 있다. FP는 **Root workerFingerprint('middle', raw)의 정해진 필드 순서 JS JSON hash**이며 Python 정렬 hash를 사용하지 않았다.

수정 B는 flat B와 bQuestion을, 수정 C는 cAfter/cMarkedSentence/cStudentSentence/cSlotAnswers/cAnswers/cAcceptedAnswers/cSlots와 clozeQuestion을 동기화했다. 수정 C는 원문과 같을 때만 keep, 그 밖에는 rewrite이다. cFrozenDefinition/cFrozenSentence/cFrozenAnswers는 과거 원문의 증거로 유지하며 현재 문장을 나타내는 동기화 필드로 취급하지 않는다. ID·sourceIndex·part·source fingerprint/evidence·section·level·example·role·그림 관련 필드와 미변경 형식은 보존 검증을 통과했다.

## 적용할 후보 파일

| current 범위 (끝 제외) | 최종 후보 | 실제 후보 재독 |
|---|---|---|
| 160–180 | candidates-160-180-v3.json | reread-160-180-v3.json |
| 180–200 | candidates-180-200-v2.json | reread-180-200-v2.json |
| 200–220 | candidates-200-220.json | reread-200-220.json |
| 220–240 | candidates-220-240.json | reread-220-240.json |
| 240–260 | candidates-240-260-v2.json | reread-240-260-v2.json |
| 260–276 | candidates-260-276-v3.json | reread-260-276-v3.json |

`reviews.json`의 candidateArtifact와 afterReadingEvidence가 위 버전을 정확히 지정한다. 각 재독 파일은 전체 `after-*.txt` 바이트 SHA, 후보 파일 바이트 SHA, ID별 후보 FP/hash 및 직접 재독 시각을 연결한다. 후보 출력에는 B/C의 모든 답·기준과 일반 설명이 있으며 잘린 출력은 없다.

다음 파일은 **superseded이며 적용 금지**이다. 원본 바이트를 삭제·수정하지 않고 남겼다.

- candidates-160-180.json: 165 C의 뒤 식이 빈칸 0을 다시 노출하여 v2에서 제거했다.
- candidates-160-180-v2.json: 수정 C의 기존 keep 결정을 유지한 불일치가 primary 수신 검증에서 발견되어 v3에서 rewrite로 보완했다.
- candidates-180-200.json: 같은 keep/rewrite 보완과 194 B의 내부 조건이 내심에만 적용됨을 더 명확히 하여 v2로 대체했다.
- candidates-240-260.json: 문항·후보 FP/hash는 v2와 같지만, 265의 후속 보완으로 공유 수동 입력 파일 SHA가 바뀌어 v2에서 읽기 증거를 최신 고정 바이트에 다시 연결했다.
- candidates-260-276.json: 265 일반 설명에도 0개 구매 허용 조건이 필요함을 재독에서 발견하여 v2로 대체했다.
- candidates-260-276-v2.json: 265의 보고서 이유 문구 오타를 v3에서 바로잡았다. 정규화 B/C/일반 설명은 v3와 같다.

## 주요 판정

문법 조각, 단서 없는 열린 표현, 실제 답의 노출, 범위 조건 누락, 요청하지 않은 필수 기준과 요청한 내용이 빠지는 대안, 존재하지 않는 중복 제외 근거를 수정했다. 쉬운 정식 이름·숫자·대소 및 관찰 결과 해석은 유효한 평가로 남겼다. 167의 평균 이름/계산법, 168의 좌표를 실제 위치로 해석한 이유, 186의 평행선 이름, 189의 중점 이름, 191의 정수 필요조건, 241–243의 관찰에 근거한 상관관계 이유, 251의 누적 도수 이상 조건, 254의 이미 존재하는 가운뎃값 필수 기준 등에 구체 유지 반론을 남겼다. 동일 snapshot의 key에서 이미 pass인 경우도 원래 응답 그대로 보존하고 추가 수정 필요성과 구별했다.

일반 설명은 평가용 숫자 사례로 덮어쓰지 않았다. 필요한 6개만 조건·표기를 보완했다: m3-04-03-xc19(전실수 정의역), m2-01-06-xc24(괄호 없는 혼합 연산), m2-01-08-xc8(나누는 식의 괄호와 x≠0), m2-02-05-xc8 및 m2-02-05-xc24(0개 구매 허용), m2-03-01-xc10(두 미지수 전실수 범위).

B는 m2-05-03-xc20의 잘못된 중복 제외를 복구했고, C는 m2-07-04-xc8와 m2-08-02-xc17의 과도한 제외를 복구했다. 중복 제외 이유를 명시한 관련 ID의 실제 최신 raw/normalized는 `related-exclusion-evidence.json`에 읽기 전용 증거로 보존했다. 인정 답 목록과 anyOf는 정확 문자열 자동 채점 규칙으로 해석하지 않았으며 타당한 동치 풀이를 막지 않는다.

## 재현과 남은 책임

실행은 Root private `node_modules/.bin/tsx.cmd`에 **`--tsconfig C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/tsconfig.json`**을 명시했다. `capture.ts`(초기 ID/hash 캡처와 출력), `assemble.ts`(동기화 후보 생성·계약/표기/보존 검사), `attest.ts`(실제로 읽은 출력에 대한 reader 확인), `finalize.ts`(116개 최종 증거 결합·전체 중등 충돌·최신 원안 drift 검사)가 보고서에 포함된다. 자동 스크립트는 수동 판정이나 직접 재독을 대신하지 않는다.

마지막 16개 조립 첫 시도에서 275의 C 제외 이유 문장 변경이 보존 검사에 의해 멈췄다. 이는 의도된 이유 수정이므로 제외 이유가 명시적으로 바뀐 경우만 허용하도록 검사 경계를 바로잡았고 전체 최종 검증을 통과했다. 자동 허용 범위를 운영 코드나 다른 보고서로 넓히지 않았다.

이 작업은 새 보고서 폴더만 썼고 운영 코드·primary audit/ledger·Root integration·DB·환경·Prisma·기존 초5·6 보고서는 변경하지 않았다. 추가 에이전트를 띄우거나 설치·pull/merge/push·배포를 하지 않았다. 새 폴더만 커밋하며 owncommit은 완료 메시지에서 전달한다. Root/primary가 최종 적용·적용 후 재독·독립 재검토·교재/SRS/학생지면 반영과 push·배포를 담당한다.
