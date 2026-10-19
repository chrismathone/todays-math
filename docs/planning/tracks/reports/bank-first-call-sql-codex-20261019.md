# 문제은행 첫 호출 — SQL 읽기 전용 실측과 로컬 mirror

2026-10-19. 기준 HEAD `5051fea68`. SQL worker 결과이며 모든 변경은 미커밋이다.

**선택: 문항 보조 인덱스 0개, 제품 SQL 변경 0개, 제품 `work_mem` 변경 0개.** 필요한 범위만 요청하는 리드/UI 구현을 뒷받침하는 실측·실제 SQL PGlite 검증·독립 시험을 남겼다. 시도한 세 SQL 구조 변경은 효과가 작거나 회귀하여 모두 원복했다. 기존 전역 목록·출처의 첫 호출 700ms와 재호출 150ms를 이 작업만으로 달성했다고 주장하지 않는다.

`questionCountSql.ts`는 기준 커밋과 바이트 동일하다(SHA-256 `e395a8a0a3790beb9a55480acc5f71d1614e2463d4bb56d41139e7bdb3fc29a1`). `questionCountProjection.ts`, `bankSourceQuestions.ts`, `bankReadFingerprint.ts`, UI, Prisma/schema/migration은 수정하지 않았다. 리드의 revision migration은 원본 작업트리에서 읽어 로컬 PGlite에만 적용했다.

## 측정 경계

- 공유 PostgreSQL 17.6에서 **RepeatableRead 거래 시작 → `SET TRANSACTION READ ONLY` → `current_setting('transaction_read_only')='on'` 확인** 후 SELECT/EXPLAIN만 실행했다. `statement_timeout=45s`, 거래 최대 600초이며 영구 설정을 바꾸지 않았다.
- 실제 설정은 `work_mem=3500kB`, `hash_mem_multiplier=2`, `max_parallel_workers_per_gather=1`이었다. 메모리 비교는 같은 거래에서 LOCAL 설정으로만 `default / 16MB / 64MB`를 바꿨다. 이 비교의 병렬 수는 이전 R2 근거와 같이 0으로 고정했고, 별도 native 측정은 운영의 1을 유지했다. 양쪽 모두 `force_custom_plan`을 사용했다.
- 시간은 **reader 하위 SQL의 실제 왕복**이다. auth·HTTP·Next 컴파일·렌더링·지문 SELECT·메타데이터 추가 읽기·거래 시작/종료는 포함하지 않는다. DB 버퍼나 연결을 비우지 않았으므로 물리적인 DB cold latency가 아니다. 캐시를 거치지 않고 매번 SQL을 실행했다.
- 문항 본문·실제 정답·비밀값을 출력하거나 파일에 보관하지 않았다. mirror의 `answer`는 기존 센티널과 같은지 여부만 보존한 빈 문자열/센티널이다. 계정·학생 표를 읽지 않았다.
- 관련 Next 로컬 data-fetching 가이드를 읽었다. 공유 `node_modules` symlink는 Git에 추가하지 않았고 `prisma generate/format`, 스테이징·커밋·푸시는 실행하지 않았다.

## 필요한 범위를 먼저 읽을 때

[native 3회 원본/현재 SQL](bank-first-call-sql-native-20261019.json). 단위 ms. **원본과 현재 SQL이 동일하므로 두 열의 차이를 코드 개선폭으로 해석하면 안 된다.** 중2는 56차시, 그 첫 단원은 8차시다.

| 하위 SQL | 원본 3회 | 현재 3회 | 현재 중앙값 |
|---|---|---|---:|
| 중2 `unit/family`만 | 259 / 280 / 280 | 257 / 252 / 276 | 257 |
| 한 단원 `unit/family`만 | 61 / 65 / 64 | 65 / 61 / 66 | 65 |
| 중2 전체 availability 축 | 484 / 465 / 470 | 463 / 464 / 467 | 464 |
| 전역 availability·family | 1889 / 1817 / 1818 | 1809 / 1811 / 1814 | 1811 |
| 기존 전역 출처·책·종류·자료 | 935 / 909 / 932 | 946 / 922 / 926 | 926 |
| 기존 전역 bootstrap 수량 | 899 / 886 / 919 | 911 / 905 / 923 | 911 |
| 기존 전역 목록 summary 집계 | 1230 / 1238 / 1240 | 1222 / 1239 / 1230 | 1230 |
| 전역 목록 1쪽 대표 ID | 832 / 828 / 834 | 827 / 836 / 831 | 831 |
| 중2 목록 5쪽 대표 ID | 178 / 190 / 187 | 179 / 186 / 189 | 186 |
| 한 자료 목록 1쪽 대표 ID | 32 / 37 / 35 | 32 / 34 / 33 | 33 |

학년만 보일 때 수량을 세지 않는 결정은 UI/리드 소유다. 선택 뒤에도 모든 facet을 읽지 않고 해당 학년·단원의 `unit/family`만 읽는 쪽의 SQL 비용이 훨씬 작다. 위 전역 집계를 scope 수량 화면의 필수 비용으로 유지할 근거는 없다.

[새 출처 범위의 별도 실측](bank-first-call-sql-source-scopes-diagnostics-20261019.json). 중2 교과서 7권, 그 자료의 첫 20개를 사용했다. root 완성 API 전체를 측정한 수치는 아니다. 본문·책 이름을 미리 읽지 않는 것과 별개로, 아래는 각 범위의 수량 SQL이다.

| 하위 SQL | 원본 3회 | 현재 3회 |
|---|---|---|
| 전역 출처 갈래만, 책/자료 숨김 | 650 / 640 / 642 | 667 / 643 / 653 |
| 선택 학년의 책·종류만 | 203 / 89 / 88 | 83 / 89 / 86 |
| 현재 20개 자료의 수량만 | 61 / 32 / 33 | 32 / 34 / 31 |

첫 책/자료 호출의 203/61ms도 숨기지 않았다. 갈래 SQL 자체는 약 650ms라 추가 네트워크·거래·지문·HTTP까지 합친 API가 700ms 이내라는 보증은 없다. 자료 페이지의 `selected` 보존·실제 metadata 정렬은 리드 구현과 최종 API 검증 대상이다.

## LOCAL work_mem 비교

[동일 스냅샷에서 각각 3회](bank-first-call-sql-live-20261019.json). 아래는 중앙값이다. 90/90 raw 결과가 순서·길이·SHA-256·Buffer 비교에서 같았다.

| 하위 SQL | 기본 3500kB | 16MB | 64MB |
|---|---:|---:|---:|
| 중2 unit/family | 263 | 233 | 233 |
| 한 단원 unit/family | 63 | 56 | 57 |
| 중2 전체 availability 축 | 472 | 355 | 357 |
| 전역 availability·family | 1805 | 2174 | 1688 |
| 기존 전역 출처 집계 | 924 | 833 | 773 |
| 기존 전역 bootstrap | 959 | 785 | 688 |
| 기존 전역 목록 summary | 1236 | 1364 | 1075 |
| 전역 대표 ID 1쪽 | 821 | 789 | 713 |

64MB는 전역 집계의 temp spill을 없앴지만 family hash aggregate 한 노드가 약 120MB를 사용했다. 기본 전역 family 계획은 temp read/write가 수천~1만 블록이고, 16MB에서는 hash 전략이 바뀌며 더 느려졌다. 범위 unit/family의 약 30ms 절약만을 위해 추가 설정 왕복과 메모리 소비를 도입하지 않았다. 공통 거래 진입점의 전역 증설은 특히 권하지 않는다.

PostgreSQL의 `work_mem`은 쿼리 전체의 메모리 상한이 아니라 sort/hash 연산별 기준이고 hash는 multiplier를 곱한다. 동시에 실행하는 요청의 총 메모리는 더 클 수 있다. [PostgreSQL 공식 문서](https://www.postgresql.org/docs/current/runtime-config-resource.html#GUC-WORK-MEM).

## 실분포 PGlite 인덱스 판단

[주 반복 측정·전체 계획](bank-first-call-sql-mirror-20261019.json), [추가 출처 범위](bank-first-call-sql-source-scopes-mirror-20261019.json), [순서 진단 포함 재현](bank-first-call-sql-mirror-diagnostics-20261019.json).

공유 READ ONLY 거래에서 problem 118,166행·unit 735행·source_material 1,992행·source_book 35행의 필요한 메타데이터를 메모리로 읽었다. **공유 연결 종료 후** 새 PGlite에 실제 UUID/enum 타입, 4개 실제 표, 기존 인덱스 26개를 재현했다. 후보는 각각 하나만 생성 → VACUUM/ANALYZE → 3회 측정 → 그 후보만 제거 → ANALYZE → 3회 재측정했다. 기존 인덱스는 제거하지 않았다.

| 후보 | 로컬 크기 | 없는 상태 → 있는 상태 3회 중앙값(ms) | 판단 |
|---|---:|---|---|
| shared `(unit_id, question_group_key)` INCLUDE `(id, actual_format, family_key)` | 21.49MiB | 중2 unit/family **62.331 → 64.227**, 출처 **245.427 → 246.564**, 1쪽 **167.652 → 169.409** | 기존 unit/question-group 계열과 겹치고 새 인덱스가 계획에서 선택되지 않음. 불채택 |
| 기존 승인·잠금·정답·공용 자격 그대로인 partial `(unit_id, question_group_key)` INCLUDE `(id, actual_format)` | 15.32MiB | bootstrap **243.076 → 243.021**, 출처 **245.251 → 244.739**, 1쪽 **169.218 → 168.214** | 0~1ms 차이이며 새 인덱스가 계획에서 선택되지 않음. 불채택 |

유/무 **모든 반복 ms**는 JSON samples에 있다. 각 계획의 heap/temp도 저장했다. 대표 수치는 다음과 같다(후보 있음 / 없음, 4MB).

| 후보·경로 | PG Execution ms | heap 경로 | temp read/write blocks |
|---|---|---|---|
| scope cover·중2 | 68.919 / 66.907 | 기존 Bitmap Heap, 각각 23,608행·4,127 exact heap blocks | 587/1182 · 587/1182 |
| scope cover·출처 | 334.348 / 323.961 | problem Seq Scan 각각 118,166행 | 5746/6593 · 5746/6593 |
| eligible cover·bootstrap | 308.663 / 310.844 | problem Seq Scan 각각 115,721행 | 4723/10228 · 4723/10228 |
| eligible cover·1쪽 | 266.648 / 258.489 | problem Seq Scan 각각 118,166행 | 4409/5147 · 4409/5147 |

새 source 갈래만/선택 학년 책/현재 자료의 계획도 후보 둘을 선택하지 않았다. 기존 인덱스의 폐기 제안도 하지 않는다. 후보가 빠져서 느려지는 경로를 입증하지 못했으므로 **문항 보조 인덱스 0개**가 결론이다.

mirror는 실제 집계·정렬·자격의 **메타데이터 분포**를 복제했다. 본문/실제 정답·유저/원본 관계 같은 쓰지 않는 칸은 NULL/대체값이고 물리적 heap·TOAST 폭은 보존하지 않았다. VACUUM의 all-visible 상태, WASM CPU·로컬 저장·비용 추정도 운영과 다르다. 인덱스의 운영 개선 ms를 이 수치에서 외삽하지 않는다. 1차 mirror와 재측정의 CPU 차이도 있어 [첫 표본](bank-first-call-sql-mirror-initial-20261019.json)을 보존했다.

## 바이트 동등성과 자연 순서의 한계

- 원본/최종 제품 SQL은 같다. 기존 10경로 native 전/후 3회 **60/60 raw 바이트 동일**, 메모리 비교 **90/90 동일**이다. 공개 API 원본 33+33개 전체 응답 대조는 리드가 최종 통합 뒤 별도로 수행한다. 이 하위 SQL 결과를 그 결과로 대신 주장하지 않는다.
- 첫 mirror는 **270/270 raw 동일**이었다. 후속 mirror는 기존 인덱스 상태의 원본/현재 비교 **120/120 동일**이지만, 후보 생성·재ANALYZE 이후 차시 범위 15개 표본이 달라져 **전체 255/270**이었다. 실패를 삭제하거나 정렬해서 통과 처리하지 않았다.
- [별도 순서 진단](bank-first-call-sql-mirror-diagnostics-20261019.json)에서 차시 범위 **27/27 수량값은 같지만 9/27에서 bucket 행 순서도 바뀌었다**. 해당 경우 firstAvailable 853개도 달랐다. 기존 인덱스 선택이 ANALYZE 전후 달라질 수 있고 `row_number() OVER ()`는 고정 순서를 지정하지 않는다. 후보를 지운 뒤에도 상태가 남아 revision DDL 자체의 효과와 구분해야 한다. 공유 DB에서 ANALYZE나 DDL을 실행한 것은 아니다.
- 새 source-groups-only의 native 반복은 raw **1/6** 일치였다. 진단 결과 수량·bucket 행 순서는 **6/6 같고 비공개 firstAvailable 두 값만** 달랐다. 실제 `loadQuestionCounts`와 동일하게 그 속성을 비열거로 둔 공개 투영 바이트는 출처 3범위 합계 **18/18 동일**이다. raw 실패 표시는 그대로 남겼다. 원본 [첫 native 표본](bank-first-call-sql-source-scopes-20261019.json)과 [진단 표본](bank-first-call-sql-source-scopes-diagnostics-20261019.json)을 모두 보존했다.
- 이 때문에 인덱스나 설정을 바꿔 모든 자연 순서까지 보증할 근거는 부족하다. 제품 reader·인덱스·설정을 그대로 두었다. 수량값 일치나 비공개 속성 진단을 공개 API 바이트 일치의 대체 증거로 쓰지 않는다.

## 폐기한 SQL 구조 변경

| 대안 | 실제 비교 | 결정 |
|---|---|---|
| 축별 독립 UNION 집계 | 4MB 전역 bootstrap **884 → 920ms**, summary **1221 → 1339ms**. 일부 범위만 소폭 개선 | [근거](bank-first-call-sql-union-trial-20261019.json), 원복 |
| LATERAL로 축을 펼친 뒤 단일 hash 집계 | 4MB 전역 family **1822 → 4549ms**, 출처 **927 → 1928ms** | [근거](bank-first-call-sql-explode-trial-20261019.json), 원복 |
| 기존 전역 출처 경로만 직접 COUNT(DISTINCT)+GROUPING SETS | default 3회 중앙 **949 → 941ms**, 16MB **847 → 920ms**, 64MB **794 → 878ms** | [근거](bank-first-call-sql-source-distinct-trial-20261019.json), 원복 |

위 대안의 결과 바이트는 각 비교에서 모두 같았지만 속도 근거가 부족했다. [초기 1회 work_mem 탐색](bank-first-call-sql-work-mem-initial-20261019.json)도 보존했으며 결론은 3회 반복을 기준으로 삼았다.

## revision singleton 로컬 비교

리드 소유 `prisma/migrations/20261019160000_bank_read_revision/migration.sql` 전체를 PGlite에서 BEGIN/COMMIT으로만 실행했다. SHA-256은 `e558cd28f21e3198bea5d10f1c25d5eb331412de1caa4d5bcc07bdcc6b42771c`이며 reader의 실제 `bankRevisionFingerprintSql` SELECT를 원본 파일에서 읽어 사용했다. 해당 파일을 이 checkout에 통합하거나 수정하지 않았다.

| 로컬 SELECT | 실제 5회 ms | 중앙값 |
|---|---|---:|
| 118k행 xmin hash | 58.572 / 57.946 / 57.980 / 58.100 / 58.056 | 58.056 |
| singleton 1행 | 0.400 / 0.101 / 0.114 / 0.094 / 0.093 | 0.101 |

singleton EXPLAIN 실행은 수 μs이고 xmin hash는 전체 표를 읽는다. 첫 mirror는 66.233 → 0.108ms 중앙값이었다. **모두 로컬 PGlite 수치이며 공유 DB에 새 표가 존재하거나 운영 요청이 이만큼 줄었다는 뜻이 아니다.** 리드가 DB 먼저 적용·catalog 확인 후 기본 off reader를 켜고 실제 API를 재측정해야 한다. 적용 명령·rollback·동시성 보장은 리드 소유 migration/도구/보고서를 따른다. 이 worker는 공유 적용을 하지 않았다.

## 검증·전달 파일

- 신규 독립 PGlite 시험: 범위·축·형식·includeFormats 108개 조합의 행 합집합과 공개 바이트/firstAvailable 비교, 18개 page 조합의 그룹 선행·나중 usable sibling·빈 쪽, READ ONLY/LOCAL 설정 원복을 확인했다.
- `vitest run` 4파일 **24시험 통과**: 신규 `bankFirstCallSql`, 기존 `problemActualFormatReader`, `questionBankProjection`, `bankReadFingerprint`.
- `node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false` 통과. 기본 4GB 실행은 메모리 부족으로 끝났고, 저장소의 8GB 관례에 맞춰 재실행해 통과했다.
- 새 TS 4파일 eslint 경고 없이 통과. `git diff --check` 통과. 제품 SQL 두 파일 diff 없음.

재실행 도구:

- [`bank-first-call-sql-live.ts`](../../../../scripts/qa/bank-first-call-sql-live.ts): 검증된 공유 READ ONLY SQL/EXPLAIN, 고정 원본 동결, 원시 바이트 비교.
- [`bank-first-call-sql-mirror.ts`](../../../../scripts/qa/bank-first-call-sql-mirror.ts): 읽기 전용 메타데이터 복제 후 공유 연결을 닫고 로컬 인덱스/revision 비교.
- [`bank-first-call-sql-support.ts`](../../../../scripts/qa/bank-first-call-sql-support.ts): 비밀값 출력 없는 환경 읽기·기준 동결·범위·계획·바이트 진단.
- [`bankFirstCallSql.test.ts`](../../../../src/__tests__/unit/bankFirstCallSql.test.ts): 독립 SQL 회귀 시험.

```sh
BANK_SQL_ROUNDS=3 BANK_SQL_WORK_MEM=default,16MB,64MB node_modules/.bin/tsx --conditions=react-server scripts/qa/bank-first-call-sql-live.ts /tmp/bank-sql-live.json
BANK_SQL_ROUNDS=3 node_modules/.bin/tsx --conditions=react-server scripts/qa/bank-first-call-sql-mirror.ts /tmp/bank-sql-mirror.json
```

`BANK_SQL_NAMES`로 특정 경로를 고르고 `BANK_SQL_NATIVE_PARALLEL=1`로 native 병렬 설정을 유지할 수 있다. raw 바이트가 다르면 live probe는 JSON을 보존한 뒤 exit 1로 엄격하게 알린다. 공개 투영/수량값 진단도 별도로 기록하며 raw 판정은 바꾸지 않는다. 환경 파일은 코드가 존재를 확인하고 내부에서 읽는다. 출력에 연결 정보는 없다.

이 보고서와 연결된 JSON 12개, QA TS 3개, 독립 시험 TS 1개가 전달 대상이다. `node_modules` symlink·실행 중 생성 후 정리한 baseline 임시 디렉터리는 전달 대상이 아니다. 리드가 최종 작업트리에 파일을 복사하고 UI/범위 API/revision과 통합한 뒤 API 전체 바이트와 실제 첫/재호출 목표를 검증해야 한다.
