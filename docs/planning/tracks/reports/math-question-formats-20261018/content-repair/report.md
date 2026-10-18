# 17행 오류 수정 준비 · 실행 전 검토 자료

2026-10-18 · Codex · 계획 SHA `50c525785cae16825d23d7bd55de81f7a779fa54cd98e8933d470a126acccc61`

다섯 문항류의 소스와 실제 저장 후보를 수정하고, 기존 ID·코드·externalId·seed·라벨·정답 위치를 보존했다. **공유 DB 쓰기는 0회**이며 별도 Claude 내용 승인과 root 실행이 남아 있다. 후보 원문과 전체 DB 원본은 비공개 `.qa-artifacts/math-question-formats-20261018/content-repair/{candidates-private,before-private}.json`에 있다. 커밋된 manifest와 before-ledger는 각 파일의 SHA와 행별 digest만 가진다.

| 대상 | 행 | 독립 확인 |
| --- | ---: | --- |
| tri221PickIso | 3 | 기존 eqTri·rightTri 자리 모두 부등변 도형으로 교체. 실제 SVG 세 변 길이로 정답 하나 확인 |
| tri222Pick | 3 | 기존 wideTri·rightTri 자리 모두 교체. 같은 좌표 검산 |
| quad242PerpCount | 4 | 원래 두 seed의 단답·객관 보기를 유지하고 실제 수선 4·5개 및 두 평행선과의 내적 0 검산 |
| quad244Pick | 3 | 직사각형을 평행쌍 0인 새 사각형으로 교체. 포함 정의에서도 정답 하나 |
| poly263Name | 4 | 모든 각도 같다는 조건을 본문과 해설에 명시. 변 수 5~8과 정다각형 이름 대조 |

기존 eqTri·rightTri·wideTri의 전역 좌표는 바꾸지 않았다. 새 세 도형은 `namedShapes`에서만 허용하며 `markedShape`의 전역 목록에는 추가하지 않았다. 조밀한 수선 그림에서는 평행 표시를 왼쪽으로 옮겨 수선·직각 표시와 겹치지 않게 했다. 좌표·변 길이·외적·내적의 행별 결과는 `coordinate-verification.json`에 있다.

읽기 전용 재검사에서 기존 공개 preflight의 17 ID와 payload SHA가 전부 일치했고 runtime catalog가 발견한 11 참조 열은 모두 0이었다. 실행 때 FK와 SQL-only 참조를 다시 발견하며, 미래 FK도 더한다. 참조 테이블과 problem 테이블을 먼저 잠그고 최신 참조를 읽은 다음 한 행이라도 참조가 생겼으면 **업데이트 전에 전부 중단**한다.

`scripts/qa/bank/math-question-repair.ts`는 기본 `prepare`이며 읽기 전용 트랜잭션을 쓴다. `apply`와 `revert`에는 `--apply`, `ALLOW_SHARED_IMPORT=1`, `MATH_QUESTION_FORMATS_WRITER=coordinator`가 모두 필요하다. 커밋된 계획·소스 digest·정확 manifest·before-ledger·Claude 승인 SHA를 검증하고 private 파일 SHA·원래 seed 재생성·독립 SVG 풀이를 다시 확인한다. 전체 행 JSON CAS와 전체 readback으로 내용 외 필드·updatedAt·ID·코드 보존을 확인한다. 재실행은 이미 맞는 17행에 0회 업데이트한다. 역작업도 정확히 자신이 바꾼 payload에서만 허용하고, 참조나 다른 수정이 생기면 중단한다. 정체가 바뀐 행의 group key는 NULL로 남기며 기존 증명 없는 키를 복원하지 않는다.

별도 승인 JSON `claude-content-approval.json`은 `MaintenanceApproval` 계약을 따른다: reviewer=`Claude`, verdict=`approved`, kind=`17-row-content-repair`, 계획 SHA, sourceCommit, `valueDigest(sourceDigests)`, manifest 파일 SHA, before-ledger 파일 SHA. **현재 이 승인 파일은 없으며 도구는 쓰기를 거부한다.** root가 DDL 또는 backfill을 먼저 실행해 전체 행 baseline이 달라졌다면 마지막 DB 상태에서 새 원장을 준비하고 그 정확 SHA를 다시 승인받는다.

검증은 9개 전용 시험(실제 Python 렌더·독립 SVG 풀이, 기존 전역 의미, 선택 전용 모양 범위, full-row 충돌/멱등/역작업, 참조 중단, 실제 PGlite SQL CAS·미래 FK discovery), 범위 TypeScript, 변경 파일 lint를 통과했다. g4.ts의 기존 unused `p` 경고 1개는 이번 변경과 무관하다. PGlite는 동시 사용자 권한/잠금의 운영 증명이 아니며 실제 실행은 root의 DB 트랜잭션·runtime catalog 검사를 따른다.

실제 `TestPrint`·학생 문제지·교사용 답지 렌더를 Chromium에서 실행했다. 17개 학생 문항·17개 교사 해설, A4 15페이지의 화면·PDF를 확인했고 수식/콘솔/네트워크 오류·질문/해설/그림 넘침이 0이었다. 각 행에 교사용 sentinel을 넣어 학생 지면 노출 0, 교사 지면 17개를 확인했다. digest와 측정은 `browser-verification.json`, 실제 PNG·PDF는 비공개 `.qa-artifacts/math-question-formats-20261018/repair-paper-evidence/`에 있다. `/dev/print-check/items.ts`의 수정·형식 선택·후속 보강 항목은 모두 **대기**다. 물리 출력 완료나 전체 은행의 수학적 인증은 주장하지 않는다.

재현:

```sh
node_modules/.bin/vitest run --config scripts/qa/bank/question-content.vitest.config.mts
node_modules/.bin/tsc --noEmit --project scripts/qa/bank/question-content.tsconfig.json
node --env-file=/absolute/path/to/main/.env --import tsx scripts/qa/bank/math-question-repair.ts verify
```

환경 값은 출력하지 않으며, `prepare`는 원장을 덮어쓰지 않는다. 실제 공유 수정·최종 DB readback·물리 인쇄는 아직 실행하지 않았다.
