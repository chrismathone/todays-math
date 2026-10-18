# 53문항류 재집계와 제한 보강 준비

2026-10-18 · Codex · 계획 SHA `50c525785cae16825d23d7bd55de81f7a779fa54cd98e8933d470a126acccc61`

**94새 내용 · 146표현을 준비했다. 공유 DB 쓰기는 0회다.** 소스는 `9a75adcce`와 UUID 사전 거부를 보강한 `26361a19a`다. 이 디렉터리의 manifest는 `review-before-backfill` 단계이며 도구가 공유 쓰기를 거부한다. root의 17행 수정 → DDL → backfill 후 **새 전체 baseline과 UUID 원장을 다시 준비하고 별도 Claude Gate 2를 승인받아야 한다.** 기존 R2/R5 wave1의 승인·108행 원장·frozen138 도구는 수정하지 않았다.

| 대상 53문항류 | 현재 읽기 | 제안 적용 후 투영 |
| --- | ---: | ---: |
| 물리 행 / 출제 가능 행 | 289 / 289 | 435 / 435 |
| 실제 pair proof 후 문항 | 169 | 263 |
| 엄격히 증명된 단답·객관 쌍 | 120 | 172 |
| 본문·조건·실제 SVG 기준 서로 다른 내용 | 169 | 263 |
| 내용 5개까지 부족 | 96 | 2 |

이는 **선택한 53문항류의 읽기/투영**이며 전체 은행·360차시 재집계나 DB 적용 결과가 아니다. 원래 audit의 초등 17 + 중등/native 36만 allowlist로 다시 계산했다. 원래 전체 비공개 snapshot의 SHA도 직접 재계산해 계획의 `daf90c9a…cbac3`와 일치했다. 현재 target 289행은 원래 snapshot과 ID·payload가 모두 같고 추가/삭제/내용 변경이 0이다. 현재 실제 before 전체 범위는 **20단원 4,801행의 모든 컬럼**이다. 근거는 `frozen-input-comparison.json`이다.

수정 대상 17행의 5문항류와 보강 53문항류의 겹침은 0이다. whole-family 정리 대상 11 raw member(결합 위임 3 + 계수 위치 8)와도 겹치지 않는다. 실제 `familyKeyVariants(unitId,key)`가 각 target에서 단독 키를 반환하는지 실행하며, `disjoint-scopes.json`에 exact 집합을 남겼다. 단원은 겹치므로 17행 수정/DDL/backfill이 끝나면 전체 단원 baseline을 다시 얼려야 한다.

| 실제 생성 계약 | 새 내용 | 표현 행 | 근거 |
| --- | ---: | ---: | --- |
| 증명된 단답·객관 형제 | 52 | 104 | core `proveQuestionPair`의 메타 7·해설·그림 6·보기 값 대응을 실제 payload로 확인 |
| 원래 단답 전용 | 4 | 4 | f33/f39의 기존 `allowMultipleChoice=false` 유지 |
| 원래 객관식 전용 | 20 | 20 | 중3 8문항류 16내용 + 초5 수직선 2문항류 4내용, 생성기의 원래 다섯 보기 그대로 |
| native 서술형 | 18 | 18 | 기존 6정의별 2→5에 필요한 3개씩, 원래 서술 계약·모범 풀이·6점 부분점수 기준 유지 |
| 합계 | 94 | 146 | 상한 96내용·174행을 채우기 위해 형식이나 새 유형을 만들지 않음 |

`mid:1-2|다면체와 회전체|51`은 2내용을 보류했다. 실제 소스는 정다면체 표의 다섯 가지 경우뿐이며 300관측에서 정확히 다섯 경우가 나왔다. Euler 공식과 면/모서리/꼭짓점 incidence 식으로 다섯 답을 별도로 계산했다. **다섯 실제 과제가 모두 그 단원에 이미 출제 가능한 상태로 존재한다.** 그중 이 family에는 셋만 있으므로 5개를 채우려면 다른 family의 기존 과제를 복제하게 된다. 숫자나 이름을 바꾼 가짜 변형을 만들지 않았다. `finite-shortfall-evidence.json`이 각 기존 ID·family·digest와 수학적 검산을 연결한다. 나머지 52문항류는 제안 후 내용 5개다.

기존/후보 중복 제거는 본문과 실제 저장 SVG·그림 배열을 포함한다. 파생 객관식의 오답 변화는 새 내용으로 세지 않는다. 원래 객관식의 조건/주장/수직선 응답 보기는 정렬한 집합을 조건으로 유지하므로 보기 순서만 바뀌어도 새 내용이 아니다. 원래 보기를 삭제해 단답형으로 바꾸지 않는다. 현재 단원의 모든 적격 문항과 새 후보끼리도 비교한다. 이름·숫자를 마스킹하거나 문장 유사도를 근거로 합치지 않는다.

결정 입력은 `manifest.json`의 53 target, 실제 기존 generator selector, seed, 선택된 externalId다. `buildVerifiedCandidates`를 같은 입력으로 다시 호출해 정확한 payload/SVG를 만들며 전체 후보를 두 번 생성해 일치시켰다. manifest의 각 내용에 예상 행 수 1/2, 원래 형식 계약과 실제 pair proof key를 적었다. 새 seed 시작은 `20261118`, 유한한 결정 탐색만 하며 부족을 명시한다. 새 문항류는 없다. 소스 SHA는 `sourceDigests`, SHA 목록의 digest와 manifest/before/prewrite SHA는 `preparation.json`이다.

원문은 공개 원장에 싣지 않는다. 전체 후보·전체 baseline과 상세 생성 입력은 이 worker의 다음 비공개 경로에 있다. 원장에는 exact UUID·externalId·digest·검산 결과만 있다.

```text
.qa-artifacts/math-question-formats-20261018/bounded-preparation/candidates-private.json
.qa-artifacts/math-question-formats-20261018/bounded-preparation/before-private.json
.qa-artifacts/math-question-formats-20261018/bounded-preparation/generation-private.json
```

146실제 표현 전부를 독립 풀이했다. 초4/native는 기존 독립 text oracle의 명시한 함수만 AST로 읽어 격리 실행하고, 중3은 기존 독립 blind solver로 실제 본문/보기를 읽는다. 생성기 facts나 정답을 풀이의 입력으로 쓰지 않는다. 초5는 **실제 SVG**의 눈금 숫자·칠한 선·끝점 채움에서 범위를 복원해 자연수를 열거하고 반올림 등을 계산했다. 중등 도형은 실제 좌표/벡터, 조합은 순열·부분집합·자연수·경로 DP 열거로 검산했다. 모든 수치 객관식에서 유효 답 하나를 확인했다. native 서술은 허용 다른 추론이 있으므로 유일한 서술 답안이라고 주장하지 않고, 요청 결과와 모범 풀이·부분점수 계약을 확인했다. 결과는 `independent-verification.json`이다.

실제 제품 `TestPrint`와 학생/교사 renderer를 Chromium에서 실행해 **19단원 146학생 문항 + 146교사 해설, A4 107페이지**를 확인했다. 원래 두 형식을 모두 검토하기 위해 146물리 행을 담은 별도 fixture이며 실시험의 형제 중복 제한을 검증한 것은 아니다. 수식·콘솔·네트워크 오류, 질문/해설/SVG 넘침은 0이다. 교사용 해설 sentinel은 학생 DOM에서 0, 교사 DOM에서 전부 확인됐다. 모든 candidate 핵심 필드가 fixture와 같음을 별도로 대조했다. 측정과 제품 source SHA는 `browser-verification.json`, 실제 PNG·PDF는 비공개 `.qa-artifacts/math-question-formats-20261018/bounded-review-paper-evidence/`에 있다.

**미결 인쇄 관측:** 기존 교사용 빠른 정답 표에서 긴 native 답안이 여러 줄로 감긴다. 잘리지는 않고 뒤쪽에 전체 교사 해설/채점 기준도 있지만 읽기 편의는 실제 종이에서 확인해야 한다. 공용 인쇄 UI는 이번 worker가 수정하지 않았다. 학생 지면 답 노출은 발견되지 않았다. 후보는 아직 DB 코드가 부여되지 않은 preview이며 실제 저장 코드와 최종 UI 흐름의 출력은 root 적용 뒤 검토한다. `/dev/print-check/items.ts`의 수정·형식 선택·보강 항목은 모두 **대기**다. 물리 프린터 출력 완료를 주장하지 않는다.

보호 도구는 `scripts/qa/bank/math-question-reinforcement.ts`와 새 `scripts/import/bounded-question-reinforcement.ts`다. 기본 `prepare`는 읽기 전용 트랜잭션이다. 공유 쓰기에는 final-after-backfill manifest, committed exact plan/source/manifest/before/UUID ledger/Claude approval, `--apply`, `ALLOW_SHARED_IMPORT=1`, `MATH_QUESTION_FORMATS_WRITER=coordinator`가 모두 필요하다. UUID는 정상 문법·버전·variant를 SQL 전에 검증한다. 기록된 source commit이 HEAD의 조상이어야 하므로 해당 source commit을 history에 merge하거나 root HEAD에서 재준비해야 한다.

실행은 problem 및 runtime FK·명시된 11 참조 열을 가진 테이블을 잠근 뒤 현재 전체 단원 범위/UUID/externalId를 읽는다. 기존 4,801행의 **모든 필드**가 baseline과 같고 새 scope 행이 exact ledger의 자신 행뿐인지 먼저 확인한다. 다른 수정·추가·소유권 충돌은 INSERT 전에 전부 거부한다. 자기 UUID만 새로 넣으며 **실제 저장된 두 행의 pair proof 후에만** group key를 설정한다. 전체 baseline·새 payload·자격·key·문항/형식 재집계를 readback한다. 반복은 0개 추가다. 역작업은 새 UUID만 대상으로 하며 새 참조가 하나라도 있으면 아무 행도 삭제/잠그지 않고 전부 중단한다. 원래 행·학생/과거 시험 참조를 바꾸지 않는다.

15전용 시험, 범위 TypeScript와 변경된 도구 lint가 통과했다. 시험에는 실제 local PostgreSQL(PGlite) INSERT→실제 pair key→재실행 0→새 참조로 역작업 중단→자기 행만 역작업, 전체 baseline 불변, malformed UUID/초기 review manifest의 사전 거부, 실제 Git commit과 Claude/source/ledger SHA 검증이 있다. PGlite로 운영 권한이나 동시 잠금을 증명했다고 주장하지 않는다. 기존 frozen138/no-existing-family 도구와 승인 R5 파일의 diff는 0이다.

root의 최종 준비 예:

```sh
node --env-file=/absolute/path/to/main/.env --import tsx scripts/qa/bank/math-question-reinforcement.ts prepare --final-after-backfill --out-dir docs/planning/tracks/reports/math-question-formats-20261018/bounded-final --private-dir .qa-artifacts/math-question-formats-20261018/bounded-final
```

이 명령은 새 원장을 만들고 덮어쓰지 않는다. final 준비는 identity DDL 컬럼과 target pair의 backfill key가 실제로 있어야 통과한다. 그 결과를 커밋한 다음 별도 Claude가 private 실물과 보호 도구를 검토하고 exact source/manifest/before/prewrite SHA를 `claude-candidate-approval.json`의 `MaintenanceApproval` 계약에 승인한다. 이후 **root만** 같은 경로로 보호 apply/재실행/verify와 최종 DB 재집계를 실행한다. 이 worker는 shared apply/revert·push·배포를 실행하지 않았다.
