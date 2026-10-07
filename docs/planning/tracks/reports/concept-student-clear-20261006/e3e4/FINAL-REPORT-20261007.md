# 초3·초4 개념백지 학생 문장 계획 완료

기준은 main `13bf05dce`의 2,779개 ID이다. 모든 원문 B 제목·정의와 실제 C 학생 문장을 읽었으며, 최종 B 질문·참고답·필수 의미와 C 학생 문장·정답·동의어 및 일반 설명 수정안을 다시 읽었다. 원문 ID와 순서를 보존했고 생산 코드, 개념 데이터, 학생 기록은 수정하지 않았다.

| 범위 | 항목 수 |
|---|---:|
| 초3 기본 / 추가 | 194 / 984 |
| 초4 기본 / 추가 | 145 / 1,456 |
| 최종 내용 지문과 읽기 기록 일치 | 2,779 |
| B 질문 수정 / B 형식 제외 | 2,232 / 547 |
| C 유지 / 수정 / C 형식 제외 | 982 / 1,729 / 68 |
| 일반 설명 `coreAfter` 수정 제안 | 88 |

제외는 해당 평가 형식의 제외 제안이다. 개념과 일반 설명을 삭제하지 않는다. C 평가 문장과 일반 설명을 분리했고, 거울의 위치·자르는 방향·같은 크기로 다시 나눌 수 있는 조건처럼 원문 자체에 필요한 수정은 `coreAfter`와 `coreReason`에 별도로 기록했다.

## 읽기와 검증 증거

- [audit.json](audit.json): 전체 ID별 최종 질문, 답, 목표, 이유, 제외, 정답 동의어, 일반 설명 수정 제안.
- [source-evidence.json](source-evidence.json): 원문 제목·정의·실제 C·답과 원문 지문. 기존 원문 증거 파일의 바이트도 그대로 보존했다.
- [final-editorial-ledger.json](final-editorial-ledger.json): 2,779개 실제 최종 문장 읽기 판단. 각 내용 지문과 학습 역할을 따로 대조한다.
- [final-coverage-validation.json](final-coverage-validation.json): 원문과 제안의 ID·순서·내용 지문을 전수 재계산한 결과. 현재 자체 미해결 항목은 0개이다.
- [final-normalized-proposal-hashes.json](final-normalized-proposal-hashes.json): root의 현재 `normalizeProposal`로 계산한 마감 시점 2,779개 해시. 제외 이유와 일반 설명 교정 이유까지 포함하는 독립 검토 연결값이다.
- [final-core-proposals.json](final-core-proposals.json): 일반 설명 수정 88개와 원문·이유·최종 읽기 기록.

root의 현재 B/C/core 계약으로 2,779개를 검사하여 오류 0개였다. 일반 설명 수정 88개의 계약 검사도 오류 0개이며, 표기 검사 18,527필드의 오류는 0개였다. 형식 검사는 실제 문장 읽기나 학습 효과 검증을 대신하지 않는다.

초3·초4 대표 질문과 참고답은 [README.md](README.md)에 최종 audit 값 그대로 실었다. 이전 대표 예제의 숫자와 현재 제안이 달랐던 부분도 맞췄다.

## 독립 검토 의견 처리와 남은 이견

처음 스냅샷에서 당시 제안 해시와 일치한 171건, 추가로 도착한 51건을 합해 **222개 의견을 실제 질문과 대조**했다. 응답 기록은 수정 170건, 이유를 기록한 유지 52건이다. 한 ID에 수정 전후 의견이 올 수 있으므로 이는 고유 ID 수가 아니다.

`e3e4-ctx58-independent-dispositions-*.json`에는 당시 inputHash, reviewedHash, 원래 질문 묶음, 원모델 판정, Codex의 수정 또는 유지 이유를 함께 남겼다. 실제 답 복사, 빠진 조건, 열린 답의 범위, 질문에서 요청하지 않은 필수 의미를 고쳤다. 서로 다른 양의 관계, 평형으로 무게를 읽는 의미, 사용자가 허용한 짧은 비교는 같은 낱말이 나온다는 이유만으로 제외하지 않았다.

마감은 420개 원의견이 담긴 고정 스냅샷까지이다. 그 이후 루프의 새 의견을 기다리지는 않는다. **최종 normalized hash에 여전히 연결되는 독립 검토 이견 53건**을 [unresolved-independent-disagreements.json](unresolved-independent-disagreements.json)에 별도로 남겼다. 이는 자체 수정 누락 목록과 다르며, Codex의 유지 판단으로 모델 판정을 바꾸거나 독립 승인을 만든 것이 아니다. 수정으로 해시가 바뀐 문항도 root의 최종 독립 재검토 대상이다.

[independent-raw-evidence-manifest.json](independent-raw-evidence-manifest.json)은 관련 54개 검토 묶음의 원입력·원응답 등 518파일을 가리킨다. `independent-raw-evidence/`에 원본 바이트 그대로 보관하고 SHA-256을 기록했다. 이전 작성 보조와 수정 후보 증거도 보존했다. 이 디렉터리의 `.gitattributes`는 Windows에서 증거 바이트가 줄바꿈 변환으로 달라지는 것을 막는다.

## 구현 인계

[final-example-requirements.json](final-example-requirements.json)에 그림·예시가 필요하거나 이해에 도움이 되는 105건의 메모를 모았다. 모두 필수 그림이라는 뜻은 아니다. 특히 아래 두 문항은 실제 지면에 분할 그림을 붙이거나 그림을 가리키는 표현을 먼저 고쳐야 한다.

- `e3-1-2-4-xc19` · index 534: 세로선 하나로 나눈 직사각형 그림, 작은 둘과 전체 하나를 세기.
- `e3-1-2-5-xc20` · index 560: 가로·세로로 둘씩 나눈 정사각형 그림, 작은 넷과 전체 하나를 세기.

이 결과는 **계획 제안 완료**이며 출하 승인이 아니다. root가 Claude와 계획 합의, 남은 독립 이견의 재심, 그림과 실제 지면 검토, 계약 통합, 생산 반영 및 배포를 담당한다. 본 작업에서는 설치·DB 생성·생산 편집·푸시를 하지 않았다.
