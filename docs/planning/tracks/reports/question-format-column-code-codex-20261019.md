# 문항 형식 칸 — 코드 단계 결과

2026-10-19. 기준 커밋 `9d33e0cfbd4fe96a59c08d3c3bbe2d7a0ce5aab9`, 작업 브랜치 `phase/12-question-format-column`.

**저장 형식 reader·SQL 집계/페이지·NULL 지연 저장을 구현했고, 관련 시험과 실제 응답 대응을 검증했다. 성능 목표인 주요 첫 호출의 수백 ms는 달성하지 못했다.** 전체 1쪽·객관식 등은 일부 줄었지만 전체 범위 수량과 일부 메타데이터 집계에는 회귀가 남는다. 성능 개선을 완료했다고 보고하지 않는다. 변경은 미커밋 상태로 남겼다.

## 1. 공유 DB 읽기 전용 전/후 3회

[원본 측정 JSON](question-format-column-code-codex-20261019-measurements.json). 측정 종료 시각(UTC): `2026-10-19T05:13:56.034Z`. 단위 ms, 변화율은 중앙값 기준이며 **양수는 느려짐**이다.

| 경로 | 전 3회 | 후 3회 | 중앙값 전 → 후 | 변화 | 원본 바이트 일치 |
|---|---:|---:|---:|---:|---:|
| 문제은행 전체 1쪽 | 4009 / 3773 / 3731 | 3410 / 3458 / 3396 | 3773 → 3410 | -9.6% | 3/3 |
| 다른 필터 중2 5쪽 | 2093 / 2108 / 2303 | 2340 / 2358 / 2350 | 2108 → 2350 | +11.5% | 3/3 |
| 객관식 1쪽 | 3587 / 3526 / 3487 | 3325 / 3336 / 3342 | 3526 → 3336 | -5.4% | 3/3 |
| 범위 수량 전체·갈래 | 1795 / 1758 / 1837 | 3045 / 2989 / 3004 | 1795 → 3004 | +67.4% | 3/3 |
| 범위 수량 중2·기본·단답형 | 543 / 556 / 553 | 582 / 582 / 582 | 553 → 582 | +5.3% | 3/3 |
| 출처 고르기 | 1649 / 1667 / 1640 | 2007 / 1987 / 1986 | 1649 → 1987 | +20.5% | 3/3 |
| 작업실 bootstrap | 1542 / 1556 / 1578 | 1932 / 1938 / 1947 | 1556 → 1938 | +24.5% | 3/3 |
| 자료 안 목록 | 1647 / 1642 / 1669 | 2094 / 2112 / 2094 | 1647 → 2094 | +27.2% | 3/3 |
| 책의 자료 수량 | 186 / 182 / 185 | 113 / 115 / 116 | 185 → 115 | -37.6% | 3/3 |
| 저장된 실제 ID | 1644 / 1664 / 1670 | 2094 / 2083 / 2079 | 1664 → 2083 | +25.1% | 3/3 |
| 시험지 후보 선택 | 141 / 140 / 147 | 161 / 161 / 158 | 141 → 161 | +14.3% | 3/3 |

- 총 **33/33건**의 `Buffer.from(JSON.stringify(response))`가 같다. 키 정렬·문자 정규화·필드 삭제 없이 길이와 SHA-256, 실제 Buffer 동등성을 확인했다.
- 공용 풀의 기존 후보 스캔에는 118,166행이 있었다. 이번 후속 reader의 **NULL/버전/digest fallback은 모든 측정에서 0행**이었다. 정상 저장 `unknown`은 fallback으로 세지 않는다.
- 일반 목록·집계·bootstrap의 전량 후보 메타데이터 전송은 후속 구현에서 0행이다. `exact_ids`는 지정한 실제 ID 1행을 유지하고, 시험지 solver는 필요한 실제 표현 풀 241행을 유지한다. solver 후보를 질문당 하나로 줄이거나 임의로 페이지 나누지 않았다.
- 첫 호출마다 은행 앱 캐시를 비웠다. DB 버퍼와 연결은 비우지 않았다. 로그인·HTTP·Next 컴파일·브라우저 렌더는 포함하지 않은 서버 reader 시간이다.
- 각 회차의 전/후 전 경로가 **동일 RepeatableRead + 검증된 DB READ ONLY** 스냅샷에 있다. model 쓰기·raw mutation도 별도 proxy로 차단했다. SELECT와 트랜잭션/세션 설정 외 DB 작업은 실행하지 않았다.
- 기존 unordered 메타데이터 조회의 JSON 키/배열 첫 등장 순서가 실행계획·병렬 스캔에 따라 흔들리는 것을 개발 중 관찰했다. 최종 대조는 전/후 모두 `plan_cache_mode=force_custom_plan`, `max_parallel_workers_per_gather=0`으로 통제했다. **기본 실행계획의 모든 자연 스캔 순서까지 항상 바이트가 같다는 보증으로 확대하지 않는다.** 제품 코드의 DB 세션 설정을 바꾼 것은 아니다.
- 시험지 선택은 전/후 모두 동일 seed `19102026`으로 임시 난수를 재설정했다. 원래 solver·선택 후 재검사는 그대로 실행한다. 본문·정답·학생/계정 데이터·연결 정보는 측정 파일에 기록하지 않았다.

## 2. 남은 비용과 성능 판정

아래는 같은 최종 실행의 raw SELECT 왕복 합계 중앙값이다. 순수 PostgreSQL 실행 시간만을 뜻하지 않으며 model 조회·트랜잭션·직렬화 등은 별도다.

| 경로 | 현재 입력 digest 검증 SELECT | SQL 집계 SELECT | SQL 페이지 SELECT |
|---|---:|---:|---:|
| 문제은행 전체 1쪽 | 947 | 1479 | 853 |
| 범위 수량 전체·갈래 | 904 | 2084 | 0 |
| 출처 고르기 | 976 | 934 | 0 |

저장 칸이 모두 유효해도 현재 원문 digest 대응을 확인하려면 DB에서 분류 입력을 읽어 해시해야 한다. Node로 전수 본문을 보내거나 파서를 전수 호출하는 비용은 제거했지만, DB의 전역 검증과 distinct 질문 집계 비용이 남았다. 같은 트랜잭션에서 이미 확인한 범위는 재검증하지 않고, 빈 교과서 관계 키는 별도 범위로 집계해 불필요한 전역 distinct 정렬을 줄였다. 이 조치 뒤에도 위 표와 같이 목표에 미달한다.

주요 전역 경로의 수백 ms를 얻으려면 현재 공유 DB에서 실행계획과 집계/무결성 검증 구조를 추가로 검토해야 한다. 이번에는 스키마·인덱스·백필·DB 설정 영구 변경을 하지 않았다. 현재 diff를 성능 목표 달성판으로 운영에 반영했다고 주장하지 않는다.

## 3. reader와 SQL 변경

- [`actualFormat.ts`](../../../../src/lib/problem/actualFormat.ts): 백필과 같은 고정 규칙 버전, 정확한 UTF-8 입력 digest, 요청 Map과 트랜잭션에만 귀속되는 검증 범위. process 공용 신뢰 캐시가 아니다. 정본 `provenance.ts`·`questionFormat.ts`는 변경하지 않았다.
- [`actualFormatProjection.ts`](../../../../src/lib/problem/actualFormatProjection.ts), [`questionCountSql.ts`](../../../../src/lib/problem/questionCountSql.ts): 형식 허용값·버전·현재 입력 digest를 검증한다. SQL digest는 `array_to_json(text[])`의 compact JSON과 PostgreSQL 내장 SHA-256을 쓴다. NULL·버전/digest 불일치만 기존 certified-key/메타데이터/본문 판정으로 돌리고, valid unknown은 미분류로 유지한다.
- [`questionCountProjection.ts`](../../../../src/lib/problem/questionCountProjection.ts), [`bankSourceQuestions.ts`](../../../../src/lib/bankSourceQuestions.ts): `COUNT(DISTINCT question_id)`와 `GROUPING SETS`로 전체/형식/학년/단원/난이도/출처/책/종류/자료/family 합집합을 센다. 동일 facet 범위는 필요한 차원을 합쳐 한 번 읽는다. family trim·alias는 기존 `familyIdOf`로 마무리하고 NULL/공백 family의 행별 독립 용량과 질문 수 상한을 보존한다.
- [`unifiedPreview.ts`](../../../../src/lib/unifiedPreview.ts), [`/api/problems`](../../../../src/app/api/problems/route.ts): 지원되는 일반 문항 조회는 묶음 첫 위치와 가용 대표 위치를 따로 유지한 뒤 SQL에서 LIMIT/OFFSET한다. payload와 형제 revision 정보는 해당 쪽 ID 이후 읽는다. bootstrap도 SQL bucket을 쓴다.
- 같은 공개 페이지의 재호출은 기존 TTL 15초·epoch·Prisma 쓰기 무효화 정책 아래 그 쪽의 total/page/ID만 재사용한다. 본문·답·revision은 캐시하지 않는다. 최근 출제·명시 ID/제외 등 계정 또는 요청별 조회는 공용 페이지 캐시를 우회한다. 첫 호출 표에서는 매번 이 캐시도 비웠다.
- [`questionProjection.ts`](../../../../src/lib/problem/questionProjection.ts), [`formatQuery.ts`](../../../../src/lib/problem/formatQuery.ts): 시험지 후보와 기존 형식 조회도 저장값을 이용한다. 작은 최종 payload의 원문 판정과 409 재검사는 유지한다. `exact_ids`의 실제 표현 보존과 지원하지 않는 Prisma 조건의 기존 정확 경로도 유지한다.
- pool·출제 자격·검수 관문은 별도 기존 규칙이다. unknown을 단답/서술로 바꾸지 않고 NULL question 정체는 행마다 독립이다. 책·자료·형식별 수를 더해 상위 수로 대체하지 않는다. 화면 컴포넌트·CSS·문구는 변경하지 않았다.

## 4. 저장 방식 선택과 경합 처리

**읽기에서 NULL만 채우는 지연 저장**을 선택했다. 실제 INSERT 후 자동 family 부여, 다른 트리거의 questionGroupKey 제거, 여러 앱 writer의 서로 다른 Prisma 저장 형태를 각자 재구현하지 않고 DB에 최종 저장된 입력으로 계산할 수 있기 때문이다. 공유 생성 클라이언트에 새 칸이 없어서 존재하지 않는 Prisma 필드를 타입 단언으로 넘기는 방식도 피했다.

- `transaction_read_only=on`이면 UPDATE·SAVEPOINT를 아예 호출하지 않는다. 이번 공유 DB 검증은 모두 이 경우다.
- writable일 때도 **세 칸 모두 NULL인 행**만 채운다. 원문 `classifyFormat`과 기존 빠른 증거가 다르면 저장하지 않는다. 비NULL의 다른 버전이나 잘못된 digest를 reader가 덮어쓰지 않는다. 그 행은 정확 fallback을 유지하고 별도 검토된 백필 대상이다.
- 500행 이하 배치로 세 칸만 SET한다. `updated_at`은 바꾸지 않아 cache-only 채움으로 선택 revision이 달라지지 않는다. 입력 digest와 NULL triple을 UPDATE 조건에 다시 걸어 늦은 계산으로 최신 입력을 덮지 않는다.
- ID 순 잠금과 `FOR UPDATE SKIP LOCKED`를 쓰며, savepoint 안에서 optional cache fill을 수행한다. 경합/SQL 실패 시 해당 savepoint를 되돌리고 읽기를 계속한다. 실패한 거래에서 단순 catch 후 조회를 계속하는 방식은 쓰지 않는다. savepoint 복구 자체가 실패하면 실제 거래 오류를 전파한다.
- 독립 root client 호출은 짧은 별도 transaction에서 CAS로 채운다. 호출자가 준 transaction에서는 그 거래 안의 savepoint를 사용한다. 백그라운드 fire-and-forget 작업을 남기지 않는다. CAS 0행이나 cache fill 실패를 저장 성공으로 보고하지 않는다.
- 실제 다중 연결 잠금 경합을 재현했다고 주장하지 않는다. 로컬 PGlite에서 stale CAS, 실제 SQL 실패 후 savepoint 복구, 계속 가능한 읽기를 검증했다.

[`08-import-ledger.md`](../../08-import-ledger.md)와 [`schoolbook-import-20261007.md`](../../schoolbook-import-20261007.md)에 적재/갱신 뒤 승인된 절차로 `scripts/db/backfill-problem-actual-format.ts`를 다시 실행하라는 안내를 한 줄씩 추가했다. 이번에는 실행하지 않았다.

## 5. 시험과 정적 검사

- `npm run test -- …` 관련 **20파일 / 335시험 통과**, 실행 파일 누락/비정상 종료를 검사하는 저장소 gate도 통과했다. builderSpeed snapshot은 갱신하지 않았다. 전수 메타데이터 reader를 고정하던 성능 assertion만 SQL 집계/ID 페이지·페이지 캐시 목표로 바꿨다.
- `BUILDER_SPEED_MEASURE=format-column-pglite-20261019 BUILDER_SPEED_DB=pglite BUILDER_SPEED_ROWS=1200 … builderSpeedMeasure.test.ts`: **1시험 통과**, 8개 첫/재호출 측정이 생성됨. [로컬 측정 JSON](builder-speed-format-column-pglite-20261019.json). 공유 DB 성능 수치와 혼동하지 않는다.
- PGlite parity는 정상 저장 형식/unknown과 NULL·다른 버전·잘못된 digest를 섞어 실제 SQL을 실행하고 기존 reader와 맞댄다. SQL mock만 통과한 것으로 대신하지 않았다.
- 새 `problemActualFormatReader.test.ts`는 **31개 입력 벡터**의 TS/SQL/백필 digest 대응, 규칙 버전 일치, valid 행의 본문/정답 미전송, read-only 무쓰기, count/page, trigger 무효화 뒤 NULL 채움, updatedAt 유지, stale CAS, SQL 오류 뒤 읽기 복구를 확인한다. 기존 migration/backfill 시험도 통과한다.
- `npm run type-check` 통과. 공유 generated client에 실제로 `actualFormat` 세 필드가 없음을 확인했고 `prisma generate`를 하지 않았다. 기존 typed fixture의 반환 타입에 nullable 세 칸을 명시해 현재/향후 클라이언트 양쪽과 호환되게 했다.
- 변경 TypeScript 파일 **eslint 통과**, `git diff --check` 통과.

## 6. 증거·작업 상태

- [실측 스크립트](../../../../scripts/qa/measure-question-format-column-live.ts): 기존 live 측정의 READ ONLY proxy와 바이트 비교를 재사용했다. 이번 기준 reader와 변경한 의존 모듈 전체를 해당 Git SHA로 고정하여 전/후가 같은 새 helper를 공유하는 잘못된 대조를 막았다. 원본 응답/원문/연결 비밀값은 파일에 쓰지 않는다.
- [독립 읽기 전용 검토](question-format-column-code-independent-review-20261019.md): 저장소 지침에 따라 [orca-cli 스킬](/Users/pss/.agents/skills/orca-cli/SKILL.md)로 Codex 검토 worker를 병행했다. 권고 중 순서·digest·client 부재·바이트 기준·지연 저장 경합을 반영했다. 검토자가 작성한 문서의 관찰 시점과 최종 구현은 구분한다.
- 검토 worker는 파일/DB를 수정하지 않았고, clean·작업 종료 확인 후 Orca 작업 공간을 제거했다. `BIGSHOL/format-code-review` 브랜치는 기준 커밋에 보존했다. 검토에서 병합할 변경은 없으며 본 작업도 커밋 금지 지시를 따른다.
- 스테이징·커밋·푸시 없음. HEAD 불변. `node_modules`는 기존 `/Users/pss/Desktop/creative/today_/node_modules` 심볼릭 링크 그대로이며 git add하지 않았다. 스키마/마이그레이션 변경·공유 DB 데이터 쓰기·백필·Prisma generate 없음. 원래 미추적 브리프는 보존했다.
