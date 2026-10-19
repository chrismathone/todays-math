# 문항 형식 칸 — 코드 2차 결과

2026-10-19. `phase/12-question-format-column`, HEAD `9d33e0cfbd4fe96a59c08d3c3bbe2d7a0ce5aab9`. 기존 1차 미커밋 변경 위에 이어서 작업했다.

**digest 재검증 제거·집계/대표 ID SQL 조정·DB 지문을 매 요청 검증하는 공용 결과 캐시·감사 도구 보완을 구현하고 검증했다. 캐시 없는 최초 호출의 700ms 목표는 미달이다.** 지문 확인 후 재사용하는 주요 경로는 244~341ms 중앙값을 기록했다. 이 수치를 최초 호출 개선으로 대신 보고하지 않는다. 변경은 미커밋 상태다.

## 1. 공유 DB 전/후 3회

[1차 작업트리 → 2차 원본 실측](question-format-column-code-r2-codex-20261019-measurements.json). 단위 ms. `cold`는 각 경로 전에 양쪽 구현의 앱 캐시를 모두 비운 호출이다. `validated`는 해당 결과를 채운 다음 요청이며 **DB 지문 SELECT를 다시 실행한 시간까지 포함**한다. 책의 자료 수량·solver는 이번 공용 결과 캐시 대상이 아니므로 재호출도 실제 읽기다.

| 경로 | 1차 cold 3회 | 2차 cold 3회 | 2차 validated 3회 | 중앙값 1차 → cold → validated |
|---|---|---|---|---|
| 문제은행 전체 1쪽 | 3576 / 3645 / 3459 | 2571 / 2547 / 2759 | 341 / 339 / 347 | 3576 → 2571 → 341 |
| 다른 필터 중2 5쪽 | 2403 / 2380 / 2384 | 1594 / 1586 / 1593 | 340 / 346 / 345 | 2384 → 1593 → 345 |
| 객관식 1쪽 | 3371 / 3428 / 3376 | 2534 / 2516 / 2522 | 352 / 339 / 339 | 3376 → 2522 → 339 |
| 범위 수량 전체·갈래 | 3095 / 3053 / 3008 | 2113 / 2081 / 2123 | 255 / 256 / 256 | 3053 → 2113 → 256 |
| 범위 수량 중2·기본·단답형 | 614 / 608 / 587 | 493 / 497 / 498 | 248 / 247 / 244 | 608 → 497 → 247 |
| 출처 고르기 | 2020 / 2012 / 2037 | 1370 / 1323 / 1358 | 244 / 244 / 245 | 2020 → 1358 → 244 |
| 작업실 bootstrap | 1963 / 1954 / 1965 | 1208 / 1212 / 1213 | 247 / 244 / 244 | 1963 → 1212 → 244 |
| 자료 안 목록 | 2155 / 2111 / 2143 | 1370 / 1353 / 1347 | 342 / 336 / 343 | 2143 → 1353 → 342 |
| 책의 자료 수량 | 129 / 119 / 126 | 115 / 117 / 114 | 117 / 110 / 118 | 126 → 115 → 117 |
| 저장된 실제 ID | 2120 / 2104 / 2116 | 1363 / 1352 / 1359 | 393 / 434 / 406 | 2116 → 1359 → 406 |
| 시험지 후보 선택 | 185 / 167 / 180 | 168 / 203 / 171 | 168 / 165 / 166 | 180 → 171 → 166 |

- 주요 목표 네 경로(범위 수량·출처·bootstrap·목록)의 cold 중앙값은 2,113 / 1,358 / 1,212 / 2,571ms다. 모두 700ms를 넘는다. validated 중앙값은 256 / 244 / 244 / 341ms로 목표 이하다.
- 1차 대비 2차 cold의 응답 **33/33**, 2차 validated의 응답 **33/33**이 실제 Buffer 바이트로 같다. 키 정렬·정규화·필드 삭제 없이 길이·SHA-256·Buffer 동등성을 확인했다. 형식 fallback은 전체 측정에서 0행이며, 일반 집계·쪽 조회의 전량 후보 메타데이터 전송도 0행이다. exact_ids는 지정한 실제 1행, solver는 필요한 실제 표현 241행을 유지한다.
- [코드 전환 전 원래 커밋과의 별도 3회 대조](question-format-column-code-r2-original-parity-20261019.json)도 **33/33** 일치했다. 그 실행에서 전체 범위 수량의 cold 중앙값은 원래 1,756 → 2차 2,051ms(+16.8%)다. **1차 회귀는 줄었지만 원래 reader 대비 이 경로의 cold 회귀는 남는다.**
- 각 회차의 전/후가 동일 RepeatableRead + 검증된 DB READ ONLY 스냅샷에 있다. raw/model 쓰기 proxy 차단도 유지했다. DB 버퍼·연결을 비운 측정은 아니며 auth·HTTP·Next 컴파일·브라우저 렌더는 제외한 서버 reader 시간이다. 서울 DB까지의 실제 왕복은 포함한다.
- unordered 메타데이터의 바이트 순서 대조를 위해 양쪽에 `force_custom_plan`, `max_parallel_workers_per_gather=0`을 같은 거래의 LOCAL 설정으로 적용했다. 제품의 영구 DB 설정은 바꾸지 않았다. solver seed는 `19102026`이다. 기본 병렬 실행계획의 모든 자연 순서까지 보증한다는 뜻은 아니다.
- 1차 소스를 변경 전 별도 디렉터리로 동결하고 바뀐 reader와 cache/helper의 import도 동결 경로로 연결했다. [파일별 SHA-256](question-format-column-code-r2-r1-baseline-20261019.json)의 manifest 해시로 대상을 식별했다. 측정 스크립트의 `FORMAT_MEASURE_BASELINE_DIR`와 `FORMAT_MEASURE_VALIDATED=1`이 이 모드다. 원래 커밋 모드도 유지했다.

## 2. READ ONLY EXPLAIN (ANALYZE, BUFFERS)

[동결한 1차 제품 SQL](question-format-column-code-r2-r1-product-explain-20261019.json), [최종 2차 제품 SQL](question-format-column-code-r2-after-explain-20261019.json), [실행 도구](../../../../scripts/qa/explain-question-format-column-live.ts). 집계/쪽 SQL은 실제 제품과 같이 NULL 검증을 통과한 거래 범위를 사용하고, bootstrap은 실제 출제 자격 범위로 맞췄다. 단위는 왕복 ms / PostgreSQL Execution Time ms다. 마지막 칸은 2차 최상위 계획의 temp read/write block 수다.

| SELECT | 1차 왕복 / PG | 2차 왕복 / PG | 2차 temp read / write |
|---|---:|---:|---:|
| missing-formats | 921.5 / 890.9 | 117.2 / 87.5 | 0 / 0 |
| availability-family | 2114.5 / 2064.9 | 1964.3 / 1917.9 | 11915 / 13047 |
| source-counts | 1018.8 / 973.8 | 1028.8 / 982.8 | 6046 / 6890 |
| bootstrap | 1071.4 / 1038.7 | 982.4 / 941.7 | 4650 / 10147 |
| page-one | 973.3 / 939.3 | 943.7 / 900.8 | 4827 / 5564 |

- R2의 정상 집계/SQL 쪽 요청에서는 형식 fallback SELECT를 별도로 호출하지 않는다. 지문에 NULL/다른 버전이 없다는 결과가 같은 거래의 증거이므로 쓰기 가능한지 묻는 SELECT도 없다. 위 missing-formats의 2차 수치는 fallback 진단 SELECT 자체의 EXPLAIN이며 정상 호출에 더해지는 비용이 아니다.
- 집계는 축별 질문 키를 먼저 묶고 `bool_or(available)`·실제 표현 행 수·첫 위치를 남긴 뒤 상위 축을 합산한다. 여러 축에서 문자열 `COUNT(DISTINCT ...)`를 반복하는 비용을 줄였다. 빈 교과서 관계를 별도 범위로 처리하는 1차 최적화는 유지했다. 여러 번 참조하는 관계 집계는 MATERIALIZED, 한 번 읽는 집계는 NOT MATERIALIZED를 사용한다.
- 쪽 SQL은 모든 질문의 `array_agg(id ORDER BY ...)`를 만드는 대신, 질문의 첫 위치와 조건에 맞는 첫 위치를 `min`으로 고르고 쪽의 ID만 결합한다. 묶음 순서와 실제 선택 표현의 순서는 분리해 유지했다. NULL 질문 키는 각 행 독립이다.
- source-counts SQL 자체는 거의 줄지 않았고 temp 파일도 남는다. 목록은 전역 summary 집계·현재 조건 total 집계·대표 ID 쪽이 함께 필요하다. 따라서 digest SELECT 제거만으로 cold 700ms를 달성하지 못했다.
- 단순 `count/max(updated_at)/NULL 수` 지문은 왕복 139.3ms(PG 110.4ms), xmin 합계까지 포함한 실험은 165.1ms(PG 137.4ms)였다. 둘 다 인덱스만 읽는 수 ms 계획이 아니었다. 실제 채택한 두 seed 행 버전 지문은 왕복 288.1ms(PG 255.9ms), temp 0이다. 일반 reader 실측의 지문 왕복은 대략 244ms였다. **지문이 수 ms라고 주장하지 않는다.**
- 공유 DB에서 기존 세 형식 인덱스와 두 무효화 트리거의 `tgenabled=O`를 읽기만으로 확인했다. 초기 탐색 EXPLAIN(`before/trust/hash/cache/inline`)은 검증 전 SQL/중간안을 비교한 자료다. 위 표는 정상 제품의 검증 범위와 조회 조건으로 다시 맞춘 최종 비교이며, 초기 탐색의 더 큰 수치를 제품 개선폭으로 쓰지 않았다.

승인 후 검토할 인덱스 후보는 shared 질문 정체·단원·형식 메타데이터를 위한 좁은 covering index와, 기존 출제 자격 조건을 그대로 담은 partial index다. `question_group_key`, `unit_id`, `actual_format`, ID/코드 순서를 중심으로, 전역 보유 수와 출제 가능 수를 분리한 SQL에서 index-only 계획이 가능한지 먼저 검증해야 한다. 큰 answer 본문을 무조건 INCLUDE하는 제안은 하지 않는다. xmin 지문은 실제 행 버전 확인을 위해 heap을 읽으므로 일반 인덱스 하나로 수 ms가 된다고 보증할 수 없다. 모든 인스턴스의 최초 요청까지 700ms를 요구한다면 공유 결과 저장소의 사전 채움 또는 DB에서 쓰기와 함께 관리되는 revision/집계 설계를 별도 승인 범위에서 검토해야 한다. **인덱스·스키마·영구 설정 변경은 실행하지 않았다.**

## 3. 지문 캐시의 정확성 범위

[`bankReadFingerprint.ts`](../../../../src/lib/bankReadFingerprint.ts)는 shared problem과 전체 unit/source_material/source_book의 `(테이블 구분, id, xmin)`을 두 seed로 해시해 XOR하고 행 수와 함께 token을 만든다. NULL 또는 현재 버전이 아닌 형식 수는 별도로 읽는다. 본문·정답·학생/계정 데이터는 지문으로 전송하지 않는다.

`updated_at` 전역 최대만 쓰지 않은 이유는 실제 raw SQL 수리/잠금 변경이 시각을 보존하고, Unit에는 updatedAt도 없기 때문이다. xmin은 행 버전을 만든 거래를 식별하고 UPDATE는 새 버전을 만든다. [PostgreSQL 시스템 열 문서](https://www.postgresql.org/docs/current/ddl-system-columns.html). 지문과 결과는 같은 RepeatableRead 거래에서 읽는다. 단원 범위 해석도 이 거래의 client를 사용하며, `/api/problems`의 쪽 키에는 해석한 실제 조건까지 넣었다. [RepeatableRead의 스냅샷 규칙](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-REPEATABLE-READ).

매 요청은 DB를 다시 검증한다. 같은 거래 안의 중첩 summary만 AsyncLocalStorage로 지문을 공유한다. 토큰을 요청 간에 TTL로 저장하지 않는다. 토큰이 같고 형식이 모두 현재 값일 때 결과만 1시간 보관한다. NULL/다른 버전이 하나라도 있으면 결과 캐시를 우회해 기존 정확 판정과 지연 저장이 계속 실행된다. 현재 버전 unknown은 정상 저장값이다. 캐시가 비어 있거나 토큰이 달라지면 동기 재계산하므로 오래된 결과를 먼저 반환하지 않는다.

캐시 범위는 공개 수량·출처/단원 메타데이터·쪽의 total/ID다. 본문·정답·revision은 다시 읽는다. recent·명시 ID·제외·family 요청의 필터 결과를 공용으로 공유하지 않는다. 기존 `BANK_COUNTS_EPOCH`, model 쓰기 즉시 무효화, entries 64개/목록 3개·250,000 ID 한도는 유지했다. 지문 밖의 기존 경로는 15초 TTL을 유지한다.

이것은 **프로세스별 Map이 DB 상태를 매번 확인하는 공용 은행 캐시**다. 다른 인스턴스의 쓰기를 발견할 수 있지만, 인스턴스 사이에 결과를 운반하는 새 분산 저장소를 만든 것은 아니다. 새 인스턴스·새 지문·처음 쓰는 필터에서는 cold 비용이 남는다. 두 seed 해시도 무충돌 증명은 아니며 XID의 장기 재사용/외부 복원·DB 교체까지 무조건 동일성을 보증하지 않는다. 그런 작업에는 모든 인스턴스의 `BANK_COUNTS_EPOCH` 전환을 유지한다. 같은 거래에서 업무 데이터를 고친 뒤 이미 읽은 지문을 계속 쓰는 용도로 이 helper를 사용하면 안 된다.

형식 무결성은 별개다. reader의 유효 조건은 `actual_format IS NOT NULL AND actual_format_version=현재 버전`이고, 원문 digest를 읽기에서 재계산하지 않는다. DB 트리거가 입력 변경 시 세 칸을 NULL로 만든다. 지문은 변경을 감지할 뿐 트리거를 우회해 남은 잘못된 비NULL 형식을 수리하지 않는다.

## 4. writer 감사·지연 저장·digest 감사

[Orca Codex 독립 읽기 전용 감사](question-format-column-code-r2-independent-audit-20261019.md)를 병행했다. 운영 problem 경로에서 대상 트리거 DISABLE/replica/COPY 복원을 실행하는 코드는 발견하지 못했다. 검색의 실제 hit는 PGlite 시험과 English listening의 다른 테이블이었다. 일반 COPY FROM은 대상 트리거를 실행한다([공식 문서](https://www.postgresql.org/docs/current/sql-copy.html)); 다만 이번 형식 트리거는 UPDATE 전용이므로 신규 적재에 실린 비NULL 트리플 자체를 검증하지는 않는다. 저장소 밖 SQL·복제 설정까지 부재를 증명한 것은 아니다.

직접 SQL의 본문·정답 수리, 질문 키 backfill, 잠금 변경, 과거 시각을 보존한 원장 복원은 실제로 있었다. 이번 xmin 지문은 보통 이런 시각 보존 쓰기도 감지한다. 적재/원문·질문 키 변경 뒤 승인된 형식 백필 안내를 [08 원장](../../08-import-ledger.md)과 [교과서 적재 문서](../../schoolbook-import-20261007.md)에 보완했다. 향후 trigger-off/replica/덤프 복원 이력이 있다면 NULL만 채우지 말고 현재 버전의 비NULL도 전체 대응을 대조하도록 명시했다. 이번에는 백필을 실행하지 않았다.

1차의 지연 저장은 유지했다. 실제로 채울 NULL triple이 있을 때만 기존 입력 digest CAS·ID 순 SKIP LOCKED·savepoint 복구로 세 칸을 채우며 updated_at은 유지한다. 빈 배치는 SAVEPOINT·UPDATE·추가 거래를 실행하지 않는다. READ ONLY에서는 채움을 시도하지 않는다. 비NULL의 다른 버전/잘못된 digest를 지연 저장이 덮지 않는다.

독립 감사에서 기존 verify 도구가 **형식 결과만 비교하고 저장 digest/버전은 비교하지 않는 누락**을 발견했다. [`verify-problem-actual-format.ts`](../../../../scripts/db/verify-problem-actual-format.ts)에 세 칸 각각의 mismatch와 합계 실패 조건을 추가했다. 형식은 같아도 원문 공백이 바뀐 stale digest를 시험에서 거절한다.

보완한 도구를 공유 DB에서 **READ ONLY**로 실제 실행했다. [전체 감사 결과](question-format-column-code-r2-verify-20261019.json): **118,166행, missing 0 · 형식 0 · 버전 0 · digest 0 · 집계/갈래 불일치 0**. 이 도구의 인덱스 실험은 공유 거래 종료 뒤 메모리 PGlite mirror에서만 수행한다. 로컬 mirror의 수치를 서울 DB 성능으로 쓰지 않았다. 원문/정답을 파일에 기록하지 않았다.

독립 보고서의 운영 수리 도구 readback 호환성 발견은 별도 남겼다. 새 무효화 트리거가 정상 동작하면서 오래된 전체행 기대값 비교와 충돌할 수 있는 조건이며, 그 운영 도구나 공유 DB를 이번에 고친/실행한 것은 아니다. 독립 보고서는 14:22 관찰본이고, 위 digest 감사 보완과 최종 시험은 그 이후 조치다.

## 5. 검증과 남긴 상태

- 관련 시험 22파일 287개와 형식/출제 관문 시험 6파일 109개, 합계 **28파일 396개 통과**. 이후 `/api/problems`의 해석 조건 캐시 키 보강 후 영향 API 시험 2파일 53개도 다시 통과했다. PGlite는 실제 SQL, NULL/다른 버전/unknown, trigger 무효화·CAS·savepoint 복구·updatedAt 보존, 다른 client의 시각 보존 SQL과 관련 테이블 갱신, 삽입/삭제/epoch/실패 재시도, 매 요청 지문 검증을 다룬다.
- `npm run type-check` 통과. 변경 TS/TSX 및 새 TS 파일 eslint 통과. `git diff --check` 통과. builderSpeed snapshot을 갱신하지 않았다.
- 화면·제품 문구·DB 스키마 변경, 공유 DB 데이터 쓰기, 백필 apply, Prisma generate, 스테이징·커밋·푸시는 없다. HEAD는 그대로다. `node_modules`는 기존 공유 심볼릭 링크이며 Git에 추가하지 않았다.
- Orca worker는 저장소/DB를 변경하지 않았다. 결과를 위 감사 문서로 보존하고 종료·clean·새 커밋 없음 및 기준이 origin/main에 포함됨을 확인한 뒤 worktree를 제거했다. `BIGSHOL/format-r2-audit` 브랜치는 보존했다. 본 작업트리는 1차+2차 미커밋 변경을 유지하므로 제거하지 않았다.
- 현재 로컬 origin/main 참조가 별도 작업으로 한 커밋 앞선 상태지만 이번 요청의 커밋 금지를 따라 merge/push하지 않았다. 향후 push 담당자는 직전에 fetch·통합·관련 재검증을 수행해야 한다.
