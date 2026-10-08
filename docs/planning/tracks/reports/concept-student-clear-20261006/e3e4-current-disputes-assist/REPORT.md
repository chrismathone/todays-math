# 초3·4 현재 지적의 보고서 전용 재검토

Root integration 워크트리의 최신 `e3e4/audit.json`과 `final-editorial-ledger.json`을 읽고, 원문 `13bf05dce`와 현재 지적을 대조했다. 고유 ID 80개에 대한 현재 hash 지적 80건을 개별 판단하여 완전한 수정 후보 34개와 이유 있는 유지 46개를 작성했다. 운영 적용·후보의 새 Claude 독립 승인·학생 효과 실험은 수행하지 않았으며, Root가 최종 적용과 새 검토를 결정한다.

| 집계 | 수 |
|---|---:|
| 고유 ID / 현재 hash 지적 | 80 / 80 |
| 과거 hash 제외 | 0 |
| 완전한 `proposedRawRow` 후보 | 34 |
| 이유 있는 원안 유지 | 46 |
| 미작성 | 0 |
| 계약 / 표기 / 보존 오류 | 0 / 0 / 0 |
| flat·assembled·C 슬롯 동기화 오류 | 0 |
| 초3·4 전체 후보 은행의 `blankClashes` | 0 |
| Python과 Root e3e4 fingerprint 불일치 | 0 (현재 80 + 후보 34) |
| 현재 원안 hash의 새 Claude 통과 확인 | 48 |
| Root audit·ledger byte SHA 보존 | 확인 |

원천은 `C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/e3e4/`이다. 이 보조 워크트리의 동결 초3·4 자료는 현재안으로 사용하지 않았다. 기준 문항 원문·ID·level·sourceIndex·학습 역할과 질문외 필드는 보존했고, 일반 설명은 대상이 빠진 삼각형 분류와 평면 조건이 빠진 직선 관계 두 항목에서만 보완했다. 숫자 평가 예로 일반 설명을 바꾼 항목은 없다.

처음 판단 후 Root의 `independent.ts`로 현재 원안 hash의 새 검토를 다시 읽었다. 원본 `exclusionReason`과 장부에 이미 있는 근거를 정규화된 짧은 제외 요약만으로 부실하다고 단정한 경우, 그리고 정식 이름·쉬운 비교·동일한 입력/결과의 해석이 성립하는 경우는 원안 유지로 좁혔다. 그 과정의 초회 판단과 개별 재판단 원문을 모두 `inputs/manual-decisions-01.json`부터 `-04.json`, `manual-final-overrides.json`에 보존했다. 모델 부정 답변을 pass로 바꾸지 않았으며, 유지 판정은 해당 문항의 실제 의미에 대한 Codex 판단이다.

현재 원안 hash가 새 검토를 통과했어도 아래 여덟 항목은 특정 결함을 별도로 확인했으므로 후보를 남겼다. 기존 pass는 후보 hash의 승인이 아니다.

| ID | 남은 결함과 후보의 목적 |
|---|---|
| `e4-2-2-1-xc4` | 까닭을 요청하지만 기존 필수 기준에는 결론만 있다. 이등변 정의를 만족하는 이유를 추가한다. |
| `e4-2-2-5-xc7` | 학생 문장에 분류 대상이 없다. 삼각형을 명시한다. |
| `e4-2-3-6-xc18` | 어림 방법의 답 범위가 열려 있다. 가장 가까운 자연수라는 방법과 수치를 지정한다. |
| `e4-2-4-2-xc7` | `평행하지 □`의 부정 표현 복원이다. 평행 여부 전체를 판단하게 한다. |
| `e4-2-4-3-xc7` | B의 `수선의 길이` 대안은 끝점 범위가 흐릿하다. 두 직선의 교점 사이를 명시한다. |
| `e4-2-4-3-xc24` | 부정 표현만 가린 칸이다. 수선 길이 차이에 따른 평행 여부를 판단하게 한다. |
| `e4-2-4-7-xc23` | `맞지 □`의 어미 복원이다. 반례에 따른 참·거짓 판단 전체를 숨긴다. |
| `e4-2-5-2-xc26` | `있었을 수 있다`의 활용만 숨긴 칸이다. 관측의 한계에 따른 확신 가능성 전체를 숨긴다. |

나머지 후보도 `reviews.json`에 ID별 B/C/core 판정과 이유를 남겼다. 수정 범위는 반복 단위 설명의 과도한 단정, 순서무관 세 이름의 고정 슬롯, 허용 동의 답 누락, 큰 빈칸의 불명확한 답 대상, 단위 변환의 이유 기준, 직선의 평면 조건, 그래프 기준 질문과 필수 의미의 불일치, 타일 배치의 추가 확인 대상, 잘라 옮긴 조각의 크기 보존 이유이다. B 제외 요약만 보완한 두 후보는 학생 문장을 바꾸지 않는다.

`reviews.json`이 적용용 제안의 유일한 최종 배열이다. 각 후보는 현재 원본 row의 clone이고, `candidateNormalizedHash` 및 `currentCandidateFingerprint`를 Root의 실제 함수로 계산했다. `inputs/candidate-reread-records.json`과 `inputs/printed-candidate-reread/`에는 최종 정규화된 B 물음·참고 답·모든 필수 의미, C 문장·모든 인정 답, 일반 설명을 다시 출력해 읽은 기록을 남겼다. 직접 읽기는 독립 검토나 발행 승인에 해당하지 않는다.

입력 증거는 `inputs/current-inputs.json`의 원본 raw row·원문·Root 장부·정규화 문항·현재 hash·지적 원문, 20개 단위 `inputs/reading-batches/`, 원천 byte SHA인 `inputs/source-files.json`, 지적 및 새 통과의 실제 source/result/raw/input/meta를 복사한 `inputs/independent-packets/`, 그 원천 SHA 목록인 `inputs/independent-packet-file-shas.json`에 있다. 보고서의 전체 byte SHA 목록은 `inputs/byte-sha-manifest.json`이고 `.gitattributes`로 Git의 줄바꿈 변환을 막아 원문 증거 bytes를 보존한다. Root 함수의 관련80개 ID 검토 결과와 과거 packet invalid 여부는 반환된 상태로 보존했으며 재판정하지 않았다.

검증에는 Root의 `normalizeProposal`, `workerFingerprint('e3e4')`, `conceptEntrySchema`, `verifyEditorialRow`, `bankNotationFaults`, `blankClashes`를 절대 경로로 사용했다. `coreAfter`의 null까지 포함한 여덟 필드의 정렬·UTF-8·compact Python JSON 지문을 별도로 계산해 현재 80개와 후보 34개가 Root 함수와 일치함을 확인했다. `validation.json`과 `inputs/python-fingerprint-validation.json`이 결과다.

재현은 Root의 설치된 tsx와 tsconfig를 사용한다. `helper.ts`의 `prepare`는 입력을 새로 동결하는 단계이므로 이 보고서의 입력을 보존하려면 다시 실행하지 않는다. `build`, `reread 01`부터 `03`, `finish`, `manifest`는 이 보고서 폴더에만 쓴다.

```powershell
node 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/node_modules/tsx/dist/cli.mjs' --tsconfig 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/tsconfig.json' 'C:/Users/user/orca/workspaces/todays-math/student-clear-e3e4-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/e3e4-current-disputes-assist/helper.ts' finish
python 'docs/planning/tracks/reports/concept-student-clear-20261006/e3e4-current-disputes-assist/fingerprint_check.py'
```

이 워크트리에는 `node_modules`가 없고 작업 지시가 설치를 금지하므로 `npx lint-staged`의 일반 커밋 훅은 실행하지 않았다. 보고서 전용 commit은 설치나 운영 변경 없이 생성하며, 필요한 계약·표기·지문·보존 검사는 위 Root 절대 경로로 실제 실행했다. 학생 DB·환경·Prisma·운영 코드·원래 동결 자료·두 중등 보조 자료·다른 작업자는 변경하지 않았고 pull·merge·push·배포를 수행하지 않았다.

Root는 현재 raw fingerprint와 normalized hash가 일치하는 후보만 적용하고, 적용된 후보 hash로 새 Claude 두 단계 검토를 진행해야 한다. 전체 학년 통합, 교재·복습·학생 지면 검증과 push·배포는 Root의 후속 범위다.
