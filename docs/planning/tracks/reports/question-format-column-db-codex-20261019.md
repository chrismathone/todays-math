# 문항 형식 칸 — DB 단계 완료 보고

2026-10-19. 작업 기준 HEAD: `b353aff927677b475ff167137214898879ac27c5`.

요청된 **미적용 DB 변경안·백필 도구·로컬 검증·공유 DB 읽기 전용 실측**을 작성했다. 공유 DB에는 DDL·UPDATE·이력 기록을 실행하지 않았다. 운영 reader/writer 전환, 커밋·스테이징·푸시도 하지 않았다. `node_modules`는 `/Users/pss/Desktop/creative/today_/node_modules`를 가리키는 기존 심볼릭 링크 그대로이며 `prisma generate`, `prisma format`, `prisma migrate deploy`, 생성이 포함된 `npm run build`를 실행하지 않았다.

## 1. 변경 파일과 최종 이름

| Prisma 필드 | DB 칸 | 형식·의미 |
|---|---|---|
| `actualFormat` | `actual_format` | nullable `varchar(20)`; `multiple_choice` / `short_answer` / `descriptive` / `unknown`. NULL은 미계산, unknown은 계산된 미분류 |
| `actualFormatVersion` | `actual_format_version` | nullable `varchar(96)`; 정본 분류기·파서·보기/원문자 규칙·빠른 증거 함수의 재귀적 로컬 의존 소스를 SHA-256으로 구분 |
| `actualFormatDigest` | `actual_format_digest` | nullable `char(64)`; 입력의 SHA-256 소문자 hex |

- DDL: [`20261019120000_problem_actual_format/migration.sql`](../../../../prisma/migrations/20261019120000_problem_actual_format/migration.sql). schema는 손으로 9줄 추가했다.
- [`scripts/db/problem-actual-format.ts`](../../../../scripts/db/problem-actual-format.ts): 분류·digest·버전·읽기 전용 트랜잭션 계약.
- [`scripts/db/backfill-problem-actual-format.ts`](../../../../scripts/db/backfill-problem-actual-format.ts): 기본 드라이런, 이중 쓰기 관문, 배치·원장·재개·3회 실패 표시·적용 후 전수 재독해.
- [`scripts/db/verify-problem-actual-format.ts`](../../../../scripts/db/verify-problem-actual-format.ts): 변경하지 않은 현행 reader와 별도 SQL 집계 대조, 로컬 EXPLAIN.
- [`scripts/db/apply-problem-actual-format-migration.ts`](../../../../scripts/db/apply-problem-actual-format-migration.ts): 리드용 적용 도구. 기본은 카탈로그 읽기만 하며, 적용 때만 DDL 7문장과 정확한 체크섬의 Prisma 이력을 하나의 거래로 기록한다.
- 시험: `src/__tests__/unit/problemActualFormatMigration.test.ts`, `problemActualFormatBackfill.test.ts`.

형식 값 CHECK와 별도로 **세 칸 모두 NULL 또는 세 칸 모두 유효한 값**인 CHECK를 둔다. 빈 버전·잘못된 digest·부분 저장을 거부하며 기존 행의 세 칸은 기본값 없이 모두 NULL이다. 새로운 Prisma enum을 만들지 않았다.

digest 직렬화는 UTF-8 JSON 배열 `["problem-actual-format-input-v1", content, answer, questionType ?? null, problemType ?? null, familyKey, questionGroupKey ?? null]`이다. 필드 순서·NULL을 고정하고 본문·공백·개행·문자 정규화는 하지 않는다. 판정 입력 원문을 바꾸지 않고 매번 대응시킨다. 이번 규칙 버전은 `format-v1:1c653f6c01b41e1c9e9a78edab82a2e3373923af6d6c88aa9f21233aafa0e42a`다.

## 2. 트리거와 DB 먼저 배포의 호환성

`problem_zz_actual_format_invalidate`는 `BEFORE UPDATE FOR EACH ROW`다. 본문·정답·question_type·problem_type·family_key·question_group_key를 NULL-safe하게 비교해 실제 변경이 있으면 세 칸을 함께 NULL로 만든다. 입력 변경과 오래된 캐시를 같은 UPDATE로 제출해도 무효화가 우선한다. 동일값 대입·캐시만 채우기·검수/잠금/시각 변경은 유지된다.

기존 `problem_question_group_invalidate` **뒤에** 실행하도록 이름과 시험을 고정했다. 해설·그림·단원 등의 변경으로 선행 트리거가 묶음 키를 지우는 경우도 감지한다. `UPDATE OF`로 제한하지 않았다. 키가 이미 NULL이고 분류 입력도 그대로인 해설 변경은 캐시를 유지한다. `to_jsonb(OLD/NEW)->'question_group_key'`로 키를 읽어, 별도로 배포된 Supabase 정체 DDL 이전의 Prisma 전체 이력에서도 구버전 INSERT/UPDATE가 동작한다. 실제 공유 적용 도구는 정체 칸 및 활성 정체 트리거가 없으면 중단한다.

로컬 PGlite에서 저장소의 Prisma migration 전체 사슬과 실제 Supabase 정체 DDL을 적용하고 다음을 확인했다.

- DDL 전후 기존 칸의 SELECT 결과 및 현재 `loadQuestionCandidates` 결과가 동일하다. 캐시를 채운 뒤에도 현재 reader의 결과는 동일하다.
- 새 칸을 모르는 구버전 INSERT/UPDATE가 성공한다. 기존 행·새 행의 NULL이 허용된다.
- 여섯 입력 각각의 변경, NULL↔값, 동일값, 오래된 세 칸 동시 제출, 선행 트리거의 간접 키 제거가 의도대로 동작한다.
- 허용값 CHECK·세 칸 완전성 CHECK와 기존 브라우저 역할의 새 칸 쓰기 차단을 확인했다. 기존 권한·RLS·격리/자격 규칙은 변경하지 않았다.
- 실제 백필 SQL은 세 칸만 갱신하고 `updated_at`을 보존한다. 따라서 기존 선택 revision을 백필 자체로 바꾸지 않는다.
- 적용 전 카탈로그 → 실제 DDL → 체크섬 이력 → 적용 후 카탈로그 판정을 PGlite에서 왕복 검증했다.

**호환성 주장의 범위:** 이는 기존 앱의 읽기/저장과 DDL 설치의 호환성이다. DDL 및 인덱스 생성의 잠금 대기가 0이라는 뜻은 아니다. 적용 도구는 `lock_timeout=3s`, 문장 제한 60초, 전체 거래 제한 120초를 두고 실패 시 전체를 되돌린다. 일반 `CREATE INDEX`를 거래 안에서 실행하므로 적용 중 쓰기 잠금 시간을 리드가 고려해야 한다.

기존 별도 운영 도구 두 곳은 적용 순서에 제약이 있다. `question-group-backfill.ts`의 전체 행 `to_jsonb` digest는 새 NULL 칸 추가만으로 달라지므로 **DDL 이전 manifest를 재사용하지 않는다.** `protected-question-maintenance.ts`의 `patchedRow`는 입력 변경 뒤 새 캐시 세 칸의 NULL화를 아직 expected row에 반영하지 않는다. **백필이 채워진 행의 이 수리 도구 실행은 호환성 보완 전까지 보류**한다. 현재 도구는 readback에서 멈추므로 이 제한을 운영 앱 조회 오류나 수리 성공으로 보고하지 않았다. 이번 DB 전용 범위에서는 이 기존 도구나 운영 reader/writer를 수정하지 않았다.

## 3. 공유 DB 드라이런 실측

증거: [`question-format-column-db-dry-run-20261019.json`](question-format-column-db-dry-run-20261019.json). 2026-10-19 13:28:25 KST, PostgreSQL 17.6, `pool='shared'`, **RepeatableRead + DB의 READ ONLY**. 새 세 칸은 아직 없으며 기존 입력만 읽었다. private/격리 행은 백필 대상이 아니다.

| 저장 예정 형식 | 실제 표현 행수 |
|---|---:|
| multiple_choice | 54,157 |
| short_answer | 63,630 |
| descriptive | 325 |
| unknown | 54 |
| 합계 | **118,166** |

기존 빠른 증거 함수가 결론을 내는 행은 111,791행이며 원문 정본 `classifyFormat`과의 불일치는 **0**이다. 각 형식 3행씩 총 12행을 같은 읽기 전용 스냅샷에서 다시 조회해 원문 digest·분류를 대조했고 **12/12 일치**했다. 표본에는 행 ID 해시와 입력 digest만 남겼으며 본문·정답·연결 비밀값은 출력하지 않았다.

전체 500행 keyset 스캔 및 분류·표본 재독해 실측은 **12.524초**다. 저장 대상은 모두 118,166행, 예상 쓰기 배치는 237개다. 배치당 쓰기 250ms를 **가정**하면 읽기·분류와 합쳐 71.774초다. 공유 DB 쓰기를 측정한 수치는 아니며 DDL, 원장 fsync, 잠금, 인덱스 유지, 네트워크, 재시도에 따라 달라진다. 제품의 약 2초 요청 시간과 이 전체 운영자 감사 시간을 직접 비교하지 않는다.

분류 입력 코퍼스 digest: `d4e8f07afd46292576fdc3dc2634a4f395584bac6816700af964c72d9f0342d7`.

## 4. 드라이런과 별도의 전수 수량 대조

증거: [`question-format-column-db-parity-20261019.json`](question-format-column-db-parity-20261019.json). 별도 실행의 읽기 전용 고정 스냅샷 안에서 현재 `loadQuestionCandidates`로 읽은 118,166행을 baseline으로 잡았다. 같은 원문에서 백필 예정 형식을 새로 계산하고, 그 메타데이터만 메모리 PGlite로 옮겨 별도의 SQL `COUNT(DISTINCT question_id)` 합집합 집계와 맞댔다. 현행 `questionBucketsFromRows`를 변경하지 않았다.

| 조건 | 범위·출처·형식 등 bucket 비교 키수 | 불일치 | 단원별 갈래 용량 키수 | 불일치 |
|---|---:|---:|---:|---:|
| 전체 | 19,139 | 0 | 569 | 0 |
| 객관식 선택 | 9,764 | 0 | 561 | 0 |
| 단답형 선택 | 14,128 | 0 | 562 | 0 |
| 서술형 선택 | 531 | 0 | 103 | 0 |
| 합계 | **43,562** | **0** | **1,795** | **0** |

대조 축은 전체·단원·학년·난이도·출처 그룹·자료·책·책/종류·raw family bucket·세 형식이다. 보유/가용 문항 수와 가용 실제 표현 `rowCount`를 모두 대조했다. 행별 분류 불일치도 **0**이다. unitFamilies는 정본 `familyIdOf`의 별칭·trim·빈 갈래 행별 독립 의미와 가용 문항 수 상한을 별도로 검산했다.

| 문항 합집합 | 보유 | 가용 | 가용 실제 표현 행수 |
|---|---:|---:|---:|
| 전체 | **70,368** | **67,893** | 115,678 |
| 객관식 | 54,157 | 53,819 | 53,819 |
| 단답형 | 63,630 | 61,564 | 61,564 |
| 서술형 | 325 | 295 | 295 |
| 엔진 출처 | 53,514 | 51,737 | 99,522 |
| 그 밖의 출처 | 4,452 | 4,373 | 4,373 |
| 기출 출처 | 101 | 0 | 0 |
| 교과서 출처 | 12,301 | 11,783 | 11,783 |

형제 표현이 여러 형식을 갖기 때문에 형식별 수의 합은 전체 문항 수와 다르다. NULL 정체는 `row:<id>`로 독립 보존하며, unknown은 보유에 포함하되 가용·형식 facet에서는 현행 의미를 유지한다. 출처/책/종류는 하위 수의 단순 합이 아닌 문항 합집합으로 센다. 별도 드라이런과 이번 대조의 코퍼스 digest도 같다. HTTP 캐시·최근 출제 계정별 제외 및 화면 페이지를 새 구현으로 전환한 검증은 이번 DB 단계의 범위가 아니다.

## 5. 인덱스와 EXPLAIN 근거

세 인덱스를 schema와 SQL에 같은 이름으로 추가했다.

| 인덱스 | 키 | 목적 |
|---|---|---|
| `problem_pool_actual_format_id_idx` | pool, actual_format, id | 희소 형식의 전체 후보/집계 |
| `problem_pool_unit_actual_format_code_id_idx` | pool, unit_id, actual_format, problem_code, id | 단원·형식별 범위 집계와 코드순 후보 쪽 |
| `problem_pool_material_actual_format_number_id_idx` | pool, source_material_id, actual_format, question_number, id | 자료·형식별 범위 집계와 번호순 후보 접두 |

본문·정답을 인덱스에 포함하지 않았다. `ANALYZE`한 118,166행의 실제 메타데이터 분포를 로컬 PGlite에 복제해 추가 전/후 `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`을 저장했다. **UUID/enum을 TEXT로 표현한 로컬 실험**이며 운영 환경 계획·지연시간 증명은 아니다. 전체 SQL·계획·측정값은 parity JSON에 있다.

- 희소 서술형 문항 집계는 Seq Scan에서 `problem_pool_actual_format_id_idx`의 Index Scan으로 바뀐다.
- 단원·형식별 코드순 후보 쪽은 기존 코드 인덱스+추가 정렬에서 새 단원 인덱스의 Index Only Scan으로 바뀐다.
- 자료의 실제 순서 `question_number → unit.order_index → problem_code`는 새 자료 인덱스와 unit JOIN을 사용하지만 **Incremental Sort가 남는다.** 완전 정렬 제거라고 주장하지 않는다.
- 단원/자료 `COUNT(DISTINCT COALESCE(question_group_key,'row:'||id))`에도 새 범위 인덱스가 쓰이고 distinct 정렬 비용은 남는다. 자료 집계의 한 번 측정은 인덱스 추가 후 더 느리기도 하므로 모든 집계가 빨라졌다고 주장하지 않는다.
- 흔한 형식의 ID순 첫 12개는 기존 PK를 선택한다. 기본 은행 전체의 unit JOIN 정렬·그룹 첫 등장/대표 행 선택을 이 인덱스만으로 해결했다고 주장하지 않는다.

현행 reader는 새 칸을 읽지 않으므로 이번 DB 파일 추가만으로 제품 응답시간이 줄어들지 않는다. reader/writer 전환은 실제 DB 적용·백필 검증 뒤 별도 단계다.

## 6. 백필 적용·재개·실패 처리 계약

기본 실행은 SELECT와 거래 READ ONLY 설정만 사용한다. 쓰기는 `ALLOW_SHARED_IMPORT=1`과 `--apply`가 함께 있고 `--state` 원장을 지정해야 열린다. 적용 전 드라이런·증거 대조, 실제 DDL의 체크섬/칼럼 타입/NULL/기본값/함수/트리거/인덱스/이력을 확인한다.

적용은 UUID keyset으로 읽되 짧은 거래에서 대상 ID를 정렬해 `FOR UPDATE`로 다시 읽고 정본을 재계산한다. 여섯 입력과 기존 캐시 세 칸을 UPDATE의 NULL-safe CAS로 비교하고, 세 칸만 갱신한 뒤 실제 원문·형식·digest를 다시 읽어 대조한다. strict 키가 원문 분류와 어긋나면 중단하며, 다른 규칙 버전의 비NULL 결과는 덮지 않는다.

DB 쓰기 전에 `<state>.before.jsonl`에 ID와 변경 전/후 세 칸을 fsync한다. 상태 파일도 임시 파일·fsync·rename으로 기록한다. 원장 잠금에는 PID와 시작 시각을 남긴다. 배치 실패는 행별로 분리해 최대 3회 시도하고 성공 시 실패 표시를 지운다. 입력 digest가 그대로인 3회 실패는 재시작해도 보존하며, 원문이 달라지면 새 시도 예산을 부여한다. 최종 `abandonedAfter3`를 별도 출력하고 실패/미계산이 남으면 종료 1이다.

state·잠금·before 원장의 예약 경로와 report 경로는 기존 상위 디렉터리의 심볼릭 링크까지 해석해 충돌을 거부한다. 마지막 읽기 전용 스냅샷에서 과거 실패 ID를 다시 맞대어 이미 정확히 채워진 행은 해결, 현재 shared 범위에 없는 행은 범위 제외로 기록한다. 실패 이력은 `resolvedFailures`에 이전 시도 횟수·이유와 함께 보존하며 현재 미해결 실패만 완료 관문에 넣는다. 마지막에 바뀐 미처리 입력은 새 시도 예산으로 다음 실행에 남긴다.

재개는 같은 명령·같은 state로 다시 실행한다. **커서만 이어가지 않고 처음부터 다시 훑어**, 커서 뒤에서 새로 무효화된 행·더 작은 UUID의 추가 행도 재점검한다. 이미 같은 버전·digest·형식인 행은 쓰지 않는다. 커밋 직후 상태 저장 전에 중단돼도 실제 DB 세 칸을 다시 확인하므로 멱등 재개된다. 마지막 별도 고정 스냅샷에서 모든 대상이 현재 원문에 대응하는지 확인해야 `completed=true`가 된다. 종료 직후의 미래 편집은 트리거가 다시 NULL로 만들며 향후 reader의 정확 판정 fallback 대상이다.

다른 버전 결과를 교체하거나 실패 원장을 수동 초기화하는 기능은 제공하지 않는다. 그런 상태는 리드의 별도 검토 대상이다. 충돌 없는 복구는 원장의 before/after와 현재 값·현재 입력 대응이 맞는 행에 한해 수행해야 하며, 결과 확인 없이 과거 원문이나 다른 작업자의 캐시를 덮어쓰지 않는다.

## 7. 리드 적용 명령 — 이번 세션에서는 실행하지 않음

저장소 루트에서 실행한다. 환경 파일 **경로**만 변수에 두며 비밀값을 출력하지 않는다.

```sh
FORMAT_DB_ENV=/Users/pss/Desktop/creative/today_/.env
FORMAT_DB_RUN=docs/planning/tracks/reports/question-format-column-db-lead-20261019

# 1. 전부 읽기 전용. 카탈로그 → 백필 예정값 → 별도 집계 대조를 리드가 검토한다.
node_modules/.bin/tsx --env-file="$FORMAT_DB_ENV" scripts/db/apply-problem-actual-format-migration.ts
node_modules/.bin/tsx --env-file="$FORMAT_DB_ENV" scripts/db/backfill-problem-actual-format.ts --report "$FORMAT_DB_RUN-dry-run.json"
node_modules/.bin/tsx --env-file="$FORMAT_DB_ENV" scripts/db/verify-problem-actual-format.ts --report "$FORMAT_DB_RUN-parity-before.json"

# 2. 리드 검토 후 DB 먼저. 기존 전체 행 manifest는 이 DDL 뒤에 새로 준비한다.
ALLOW_SHARED_IMPORT=1 node_modules/.bin/tsx --env-file="$FORMAT_DB_ENV" scripts/db/apply-problem-actual-format-migration.ts --apply

# 3. 설치 후 다시 드라이런·대조. 칸이 있고 아직 NULL인 상태를 확인한다.
node_modules/.bin/tsx --env-file="$FORMAT_DB_ENV" scripts/db/backfill-problem-actual-format.ts --report "$FORMAT_DB_RUN-after-ddl-dry-run.json"
node_modules/.bin/tsx --env-file="$FORMAT_DB_ENV" scripts/db/verify-problem-actual-format.ts --report "$FORMAT_DB_RUN-after-ddl-parity.json"

# 4. 수리 도구의 채워진 행 호환성 제약을 확인한 리드만 백필을 실행한다.
ALLOW_SHARED_IMPORT=1 node_modules/.bin/tsx --env-file="$FORMAT_DB_ENV" scripts/db/backfill-problem-actual-format.ts --apply --batch-size 500 --state "$FORMAT_DB_RUN-state.json" --report "$FORMAT_DB_RUN-apply.json"

# 5. 저장값/원문 대응과 별도 수량을 재검사한다. 실패하면 같은 state로 4를 재개한다.
node_modules/.bin/tsx --env-file="$FORMAT_DB_ENV" scripts/db/backfill-problem-actual-format.ts --report "$FORMAT_DB_RUN-final-dry-run.json"
node_modules/.bin/tsx --env-file="$FORMAT_DB_ENV" scripts/db/verify-problem-actual-format.ts --report "$FORMAT_DB_RUN-parity-after.json"
```

합격 조건은 DDL 이력/정의 일치, 백필 `completed=true`, 최종 `alreadyCurrent == rows`, 예정 쓰기 0, `evidenceMismatches=sampleMismatches=0`, 독립 대조의 모든 불일치 0이다. unknown은 0으로 강제하지 않는다. 설치·백필·입력 변경 직후 제품 HTTP 수를 확인할 때는 기존 `BANK_COUNTS_EPOCH` 또는 전체 프로세스의 15초 캐시 만료 계약도 지킨다. reader/writer 배포와 생성 클라이언트 갱신은 이 DB 절차 뒤의 별도 승인 범위다.

강제 종료·호스트 재시작은 `finally`를 실행하지 않아 `.lock`을 남길 수 있다. 이 경우 자동으로 잠금을 훔치지 않고 EEXIST로 중단한다. **잠금 파일을 만든 같은 호스트에서** PID와 시작 시각을 확인하고, 기존 실행이 종료됐을 때 잠금 파일만 지운 뒤 4번을 같은 state로 재개한다. 아래 복구 명령은 PID가 살아 있거나 권한 때문에 확인할 수 없으면 삭제하지 않는다. 재사용된 PID가 살아 있어도 보수적으로 거부하므로 그런 경우 리드가 프로세스 시작 시각까지 대조해야 한다. state와 before 원장은 지우지 않는다.

```sh
node -e 'const fs=require("node:fs");const p=process.argv[1];const owner=JSON.parse(fs.readFileSync(p,"utf8"));console.log(owner);try{process.kill(owner.pid,0);console.error("PID가 살아 있습니다. 잠금을 유지합니다.");process.exit(1)}catch(e){if(e.code!=="ESRCH")throw e}fs.unlinkSync(p);console.log("종료된 실행의 잠금만 정리했습니다. 같은 state로 재개하세요.")' "$FORMAT_DB_RUN-state.json.lock"
```

## 8. 검증과 독립 검토

- 새 로컬 시험 21개 통과. 실제 migration 사슬·정체 트리거·NULL/CHECK·구버전 읽기/쓰기·잠긴 재독해/CAS·멱등 재개·3회 실패·서로 다른 버전 보존·원장 경로 충돌·해소된 실패 재조정·독립 SQL 합집합을 검증했다.
- 기존 `problemProvenance`·`problemFormatFilter` 회귀 시험 86개 통과.
- 전체 `npm run type-check` 통과. 변경 파일 ESLint 통과. 임시 가짜 로컬 URL만 사용한 `prisma validate` 통과. `git diff --check` 통과.
- 공유 DB의 새 칸/제약/인덱스 0, migration pending을 읽기 전용으로 확인했다. [`preflight JSON`](question-format-column-db-preflight-20261019.json).
- Orca 별도 Codex 작업트리의 [독립 정적 검토](question-format-column-db-independent-review-20261019.md)를 반영했다. 원문·strict 증거 대조, 간접 키 무효화 순서, CAS, 전체 행 운영 도구 제약을 포함한다.
- 같은 독립 검토자의 [후속 코드 검토](question-format-column-db-code-review-20261019.md)에서 지적한 원장 경로 충돌과 해소된 실패의 완료 차단을 수정해 시험했다. 비정상 종료 잠금은 위의 명시적 확인·복구 절차로 처리한다. 검토 원문은 수정 전 스냅샷 증거로 보존했다.
- 독립 검토 작업트리는 소스 변경·커밋이 없음을 확인하고 종료·제거했다. 두 검토 산출물은 현재 작업트리에 보존했으며 `BIGSHOL/question-format-db-review-20261019` 브랜치는 보존했다.

PGlite는 단일 연결의 로컬 PostgreSQL 엔진이므로 실제 다중 연결 잠금 경합·Supabase 운영 계획/지연시간은 검증하지 않았다. 공유 DB DDL 및 백필 후 저장값은 이번 세션에서 생성하지 않았으며, 위 리드 절차에서 실제 적용 후 확인해야 한다.
