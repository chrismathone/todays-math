# 문항 형식 DB 단계 후속 독립 코드 검토

2026-10-19. 리드 작업트리: `/Users/pss/Desktop/creative/today-format-col`.

**검토 결과: 원장 보전·재개·완료 판정에 P2 결함 3건이 있다.** 검토한 스냅샷에서 분류 결과 자체, 직접·간접 입력 무효화, 입력/결과 CAS 또는 세 칸만 갱신하는 SQL의 P0/P1 결함은 발견하지 못했다. 이는 실행 검증이나 공유 DB 적용 승인을 의미하지 않는다.

대상은 `scripts/db/*.ts` 네 파일, 지정 migration SQL, `prisma/schema.prisma` diff, `problemActualFormatBackfill.test.ts`와 `problemActualFormatMigration.test.ts`다. 리드의 파일이 검토 중 변경되어, 아래 결론은 **2026-10-19 13:28:05 KST에 읽어 메모리에 고정한 소스**를 기준으로 한다. 초기에 읽은 버전에서 추가된 카탈로그 선행 검사, 기존 규칙 버전 덮어쓰기 거부, 잠금 파일 PID 기록도 이 스냅샷에 반영되어 있다.

사용자가 알려 준 검증 사실은 **공유 DB 드라이런 118,166행, 행별·bucket·family 불일치 0, 공유 DDL/백필 쓰기 미실행**이다. 이 검토자는 이를 다시 실행하거나 DB에 접속하지 않았다. 작업트리·node_modules 수정, 테스트 실행, 설치, generate, 커밋, 추가 에이전트 실행도 하지 않았다. Postgres 검토 지침은 파일로 읽었으며 그 지침에 있는 DB 실행 단계는 수행하지 않았다.

## 발견 사항

### 1. [P2] 보고서 경로가 파생 원장 경로와 같으면 되돌리기 증거를 덮어쓴다

위치: [인자 검사](/Users/pss/Desktop/creative/today-format-col/scripts/db/backfill-problem-actual-format.ts:173), [드라이런 보고서 저장](/Users/pss/Desktop/creative/today-format-col/scripts/db/backfill-problem-actual-format.ts:198), [before 원장 기록](/Users/pss/Desktop/creative/today-format-col/scripts/db/backfill-problem-actual-format.ts:229), [최종 보고서 저장](/Users/pss/Desktop/creative/today-format-col/scripts/db/backfill-problem-actual-format.ts:239).

`parseBackfillArgs`는 `reportFile === stateFile`만 거부한다. 하지만 실제 쓰기 전 원장은 `${stateFile}.before.jsonl`, 잠금은 `${stateFile}.lock`에 만든다. 예를 들어 아래 인자 조합은 현 검사에서 허용된다. **설명용 예시이며 실행하지 않았다.**

```text
--apply --state /tmp/qf-state.json --report /tmp/qf-state.json.before.jsonl
```

발생 경로:

1. `durableJson(reportFile, preflight)`가 기존 before 원장을 드라이런 JSON으로 교체한다. 재개 실행이면 과거 DB 쓰기의 before-image가 이 시점에 사라진다.
2. 백필은 같은 파일에 JSONL 원장 항목을 append한다. 일반 JSON 보고서와 JSONL 원장이 섞인다.
3. 마지막 `durableJson(reportFile, result)`가 파일을 다시 교체하여 이번 실행의 before-image도 사라진다. DB 변경은 커밋됐을 수 있지만 복구 증거는 최종 통계로 바뀐다.

`--report ${stateFile}.lock`도 허용되며, 선행 보고서 저장이 잠금 경로를 만들어 자기 자신의 `openSync(...,'wx')`를 실패시킨다. 경로 예약 누락의 다른 증상이다.

**해결안:** 클라이언트를 만들거나 첫 보고서를 쓰기 전에 state·lock·before 원장·report의 예약 경로를 함께 계산하고 상호 충돌을 거부한다. 적어도 `stateFile`, `${stateFile}.lock`, `${stateFile}.before.jsonl`과 report가 같을 수 없게 해야 한다. 기존 CLI 관문 시험에 파생 경로 충돌 사례도 포함하면 된다. DB 스키마나 제품 코드 변경은 필요하지 않다.

### 2. [P2] 비정상 종료 뒤 같은 state로 재개하면 영구 잠금 파일에 막힌다

위치: [잠금 획득·소유자 기록](/Users/pss/Desktop/creative/today-format-col/scripts/db/backfill-problem-actual-format.ts:208), [정상 경로의 잠금 해제](/Users/pss/Desktop/creative/today-format-col/scripts/db/backfill-problem-actual-format.ts:242).

잠금은 `openSync(lockFile, 'wx')`로 만들고 `finally`에서만 지운다. PID와 startedAt은 기록하지만, 기존 파일을 읽어 종료된 소유자인지 판별하거나 안전하게 복구하는 분기는 없다.

배치 일부가 커밋된 뒤 프로세스 강제 종료·기본 시그널 종료·호스트 재시작으로 `finally`가 실행되지 않으면 `.lock`이 남는다. 동일한 재개 명령은 원장과 DB 결과를 대조하기 전에 EEXIST로 종료된다. 현재의 멱등 재조회·실패 상태 보존만으로는 이 상황을 복구하지 못한다.

**해결안:** 프로세스 종료 시 자동 해제되는 잠금 방식을 쓰거나, 잠금 소유자와 프로세스 시작 식별자를 확인하는 명시적 stale-lock 복구 절차를 제공한다. 살아 있는 실행의 잠금을 무조건 지우는 방식은 피해야 한다. 도구를 바꾸지 않는다면 최소한 **기존 실행이 완전히 종료됐음을 확인 → 잠금 파일만 정리 → 같은 state·같은 규칙 버전으로 재개**하는 운영 절차를 보고서에 구체적으로 적어야 한다. PID·startedAt 기록은 이 확인의 자료이며 자동 복구 구현은 아니다.

현재 테스트는 `retryChunk`의 논리적 재시도와 멱등 갱신을 다루지만, CLI 프로세스가 종료되어 잠금 파일이 남은 뒤의 재개는 검증하지 않는다.

### 3. [P2] 해결되거나 범위에서 빠진 과거 실패가 완료 판정을 계속 막는다

위치: [3회 실패 행 제외](/Users/pss/Desktop/creative/today-format-col/scripts/db/backfill-problem-actual-format.ts:102), [shared 범위 페이지](/Users/pss/Desktop/creative/today-format-col/scripts/db/problem-actual-format.ts:87), [최종 실패 수·완료 판정](/Users/pss/Desktop/creative/today-format-col/scripts/db/backfill-problem-actual-format.ts:234).

`retryChunk`는 같은 입력 digest로 3회 실패한 ID를 write 호출 전에 제외한다. `failures`를 지우는 경로는 입력 digest가 바뀌었거나 write 호출이 성공했을 때다. 마지막 `abandonedAfter3`는 이 원장의 모든 3회 실패를 세며 최종 shared 스냅샷과 대조해 조정하지 않는다.

다음 조건에서는 실제 대상이 모두 유효해도 같은 state로 영원히 `completed=false`가 된다.

- 실패 원장에 남은 행이 이후 private로 이동하거나 삭제됐다. shared 전용 readPage에서 다시 읽히지 않아 과거 실패가 남는다.
- 실패 원장의 행이 다른 정상 실행 등으로 **같은 입력·같은 규칙의 정확한 결과**를 갖게 됐다. 재개해도 attempts=3 필터에서 제외되어 성공 표시를 지우지 못한다. 커밋 응답을 못 받은 실행의 기록과 실제 DB 상태가 어긋난 경우도 같은 재조정이 필요하다.

이때 최종 `scanBackfill`의 `rows === alreadyCurrent`와 분류 대응은 모두 참일 수 있지만, 이미 해소된 과거 기록 때문에 `BACKFILL_INCOMPLETE`를 계속 낸다. 3회 실패 후 포기하는 정책 자체가 문제인 것은 아니다. **현재 미해결 실패와 과거 실패 이력의 구분이 없는 것**이 문제다.

**해결안:** 최종 읽기 전용 스냅샷에서 실패 ID를 현재 대상 집합·현재 입력 digest·정확한 결과 묶음과 대조한다. 이미 유효한 것은 해결됨, 삭제/비공개 전환은 범위 제외로 별도 기록하고, 현재 범위의 미해결 실패만 완료 관문에 반영한다. 현재 행이 실제로 미완료인 3회 실패는 계속 보존해야 한다. 같은 입력의 재시도 제한을 무조건 없애는 해결은 필요하지 않다.

## 정적 분석에서 확인한 정상 동작

- [분류·digest](/Users/pss/Desktop/creative/today-format-col/scripts/db/problem-actual-format.ts:55): 여섯 입력을 고정 순서·명시적 NULL로 해시한다. 원문 trim이나 Unicode/개행 정규화를 하지 않는다. `classifyFact`는 원문 정본을 계산하고 빠른 증거가 다른 답을 내면 실패시킨다. 코드 의존 파일을 읽어 규칙 버전을 만드는 경로도 있다.
- [무효화](/Users/pss/Desktop/creative/today-format-col/prisma/migrations/20261019120000_problem_actual_format/migration.sql:19): 여섯 입력의 NULL-safe 비교, 세 칸 동시 초기화, `BEFORE UPDATE` 행 트리거, 기존 정체 트리거 뒤의 이름 순서를 사용한다. `to_jsonb(...)->'question_group_key'`는 해당 칸이 없는 과거 Prisma migration 체인도 허용한다. 기존 정체 트리거의 해설 변경에 따른 간접 무효화 시험도 있다.
- [저장 제약](/Users/pss/Desktop/creative/today-format-col/prisma/migrations/20261019120000_problem_actual_format/migration.sql:4): nullable 세 칸, 네 형식 CHECK, 전부 NULL 또는 완전한 세 칸이라는 CHECK가 있다. schema diff의 SQL 이름·타입·nullable과 세 인덱스 정의는 이 migration과 대응한다. DB-only 범위의 제품 reader 전환은 없다.
- [백필 SQL](/Users/pss/Desktop/creative/today-format-col/scripts/db/backfill-problem-actual-format.ts:124): 행을 ID 순서로 잠근 뒤 최신 원문을 다시 분류하고, 여섯 입력과 기존 결과 묶음을 UPDATE WHERE에서 다시 확인한다. 세 결과 칸만 SET하며 갱신 수와 원문 재분류/readback을 확인한다. 다른 규칙 해시의 기존 결과도 무조건 덮어쓰지 않는다.
- [관문](/Users/pss/Desktop/creative/today-format-col/scripts/db/backfill-problem-actual-format.ts:193): 기본 실행은 DB에서 READ ONLY를 확인한 Repeatable Read 스캔이다. apply는 환경변수와 플래그, state 경로, migration 카탈로그 검사를 요구한다. 최신 스냅샷에는 초기에 없던 카탈로그 선행 검사가 들어 있다.
- [DDL 적용 도구](/Users/pss/Desktop/creative/today-format-col/scripts/db/apply-problem-actual-format-migration.ts:75): migration 문장을 한 트랜잭션에서 실행하고 제한 시간·advisory lock·이력 기록·후검사를 둔다. 함수 본문, 칸 타입, 인덱스 정의 등의 대응도 확인한다.
- [집계 검증](/Users/pss/Desktop/creative/today-format-col/scripts/db/verify-problem-actual-format.ts:123): 같은 shared 읽기 전용 스냅샷의 현행 reader와 계산 예정값을 ID로 대응시킨다. unknown은 보유에 남고 가용에서 제외되며, NULL 정체는 행별 정체로 남는다. 각 형식과 전체에 대해 bucket과 family 용량을 대조한다. 인덱스 실험은 shared 스냅샷 종료 뒤 메모리 PGlite에서만 수행한다.

## 실행순서 제약과 검증 한계

**전체행 maintenance 도구는 이번 DB-only 변경에서 고치지 않는다.** 사용자가 지정한 범위를 그대로 따른다. 다만 칸 추가 전의 전체행 manifest는 새 칸을 포함하는 행 모양과 달라 재준비가 필요하다. 새 결과가 채워진 행에 기존 전체행 수리 도구를 실행하면, 도구가 새 트리거의 세 칸 NULL 초기화를 expected row에 반영하지 않아 readback 오류가 날 수 있다. 보고서에는 **DDL 후 기존 manifest 재사용 금지, 백필 후 해당 기존 수리 도구의 실행 금지, 별도 승인된 호환 작업 이후 재개**라는 순서를 명시해야 한다. 이를 이번 검토의 제품 코드 수정 요구나 추가 결함 건수에 넣지 않았다.

다음 한계도 남는다.

- 제공된 불일치 0은 이 검토자의 재현 결과가 아니다. 테스트 파일의 기대 동작을 읽었을 뿐 통과 여부는 확인하지 않았다.
- 검증 스크립트의 mirror는 **계산한 예정값**으로 만든다. 따라서 그 스크립트의 불일치 0 자체가 실제 저장된 세 칸의 검증을 대신하지 않는다. 백필 main의 최종 `scanBackfill`은 실제 세 칸을 비교하므로, 실제 적용 시 그 결과도 남겨야 한다.
- 현재 카탈로그 검증은 새 함수 본문·칸·인덱스 모양 등을 검사하지만, 모든 기존 트리거 함수·권한·CHECK 식의 완전한 지문 감사는 아니다. 정상 선행 DDL과 통제된 운영 경로를 전제한다. 운영 카탈로그는 이번에 읽지 않았다.
- PGlite 시험의 '스캔 후 원문 수정'은 잠금 직전 최신 원문을 쓰는지 확인하는 순차 사례다. 실제 PostgreSQL의 다중 세션 잠금 대기·교착·커밋 응답 유실·프로세스 종료를 재현한 시험은 아니다.
- SQL mirror의 ID/풀 타입과 데이터 분포, 계획 실험의 후보 쿼리는 운영의 전체 grouped 페이지 질의와 동일하지 않다. 코드가 표시한 대로 EXPLAIN은 로컬 근거이며 운영 응답시간 개선의 실측값은 아니다.
- 규칙 해시가 달라진 기존 결과는 현재 writer가 거부한다. 이는 구버전 덮어쓰기 방어이며, 향후 규칙 교체에는 별도의 승인된 재계산/초기화 절차가 필요하다. 이번 첫 백필의 분류 결함으로 판단하지 않았다.

## 검토 스냅샷 지문

아래 지문은 13:28:05 KST의 파일 바이트다. 후속 수정본에는 이 보고의 줄 번호와 결론을 그대로 적용하지 말고 해당 차이를 확인해야 한다.

```text
205c4bbaca6a1472ba1bba2d8b4d33d995b536592a9e3c204d08bfc731f1ac4c  scripts/db/problem-actual-format.ts
46b75136eabb48e35945196c621d2ce759acd166dafc510e2f3fdcc033d7d22c  scripts/db/backfill-problem-actual-format.ts
adac6213880b553935e3d874f7c542b13a6aa00a9aaba332c0f5c1ce2fae0d75  scripts/db/apply-problem-actual-format-migration.ts
53559b06decea2d9af16a6bb5b4a99260cbed41ef86ae1523d121648944439bf  scripts/db/verify-problem-actual-format.ts
794ccf77aadaf1b63292090b6419cff5d6c66aaa1f6f2f14e00e7280e876f4f9  prisma/migrations/20261019120000_problem_actual_format/migration.sql
aa55a9735f65c1271312249a1ebe7785db121cc9372ce744b4f1a616c03e14ec  prisma/schema.prisma
ae8c35d24f63a69e6860d8cecf5fbae52c5ad17af3cb33fc2dec83a4a4890489  src/__tests__/unit/problemActualFormatBackfill.test.ts
fda3e03d90e293dad4aa66fb752343c828163091fd353a35b729093ae19dc55c  src/__tests__/unit/problemActualFormatMigration.test.ts
```

## 종료 전 변경 대조

2026-10-19 13:30:17 KST에 리드의 추가 변경을 읽어 위 스냅샷과 대조했다. 백필의 스캔 시각·서버 버전 기록과 검증 보고서의 시각·로컬 타입 차이 설명이 추가되었다. 세 발견 사항의 로직은 바뀌지 않았고 결론도 같다. 위 본문의 줄 번호는 13:28:05 스냅샷 기준이다. 해당 추가 변경을 포함한 파일 지문은 다음과 같다.

```text
f4bae86771ce2efd8f67557c4fa9f0f47fc90838fd9f9e05b6dcdb77953aef84  scripts/db/backfill-problem-actual-format.ts
a54113c985011aa56ec5ae1b590d19392cc384f95bccc4a144a7251599c00b4b  scripts/db/verify-problem-actual-format.ts
```
