# 문제은행 첫 호출 — 필요한 조회와 DB revision

2026-10-19. 기준 `5051fea68f0abe6877a4a3001601846cb1d3a9a3`, 작업 브랜치 `phase/12-bank-first-call`. [지시서](../brief-bank-first-call-db-codex.md)의 마지막 «원장님 추가 지시»를 우선했다. 모든 변경은 미커밋이다.

**필요한 단계만 읽는 구현·revision DDL/적용·되돌림 도구·기본 off reader·로컬 시험·공유 READ ONLY 검증을 완료했다. 측정한 새 운영 경로 10개의 앱 캐시 없는 reader는 모두 700ms 이내다. 반복 150ms 목표는 4경로에서 미달이며, 보존한 전역 API의 최초 700ms도 미달이다. 공유 DDL을 적용하지 않았으므로 revision 활성화 뒤의 운영 수치는 미검증이다.**

## 선택한 설계

1. **화면에서 아직 쓰지 않는 전역 집계를 먼저 제거한다.** S2 최초 화면과 작업실 홈은 학년 이름만, 학년을 고르면 단원 이름만, 단원을 고르면 그 차시 목록만 읽는다. 수량은 현재 페이지의 차시와 이미 담은 차시만 요청한다. 후보·실제 표현·저장 ID 조회도 별도 `view=page`로 전역 요약을 생략한다. 기존 기본 목록·bootstrap·출처·자료 응답은 보존한다.
2. **출처도 단계별로 읽는다.** `picker-groups`는 출처 갈래 수량만, `picker-books`는 학년 목록 및 연 과목·이미 고른 책의 메타데이터만, `picker-book-counts`는 그 책들의 수량·종류만 읽는다. 자료 선택은 `materials-page`로 현재 20행과 이미 선택한 ID의 수량만 확인한다. 검색·정렬에 필요한 최소 자료 메타데이터는 기존 한국어 정렬을 보존하기 위해 읽고, 나머지 표시 필드는 현 페이지 20행만 읽는다.
3. **B안만 추가한다.** `bank_read_revision` 한 행에 판 번호, 형식 판, 미계산/다른 판의 형식 행 수를 둔다. 문항별·단원별 수량을 미리 저장하는 요약 표(C안)는 만들지 않는다.
4. **문제은행 보조 인덱스는 0개다.** 실제 분포 PGlite에서 covering/partial 후보를 개별 생성·제거하여 비교했으나 실행계획에서 선택되지 않았다. 기존 공용 집계의 `work_mem` 증설과 SQL 재구성은 작은 효과·다른 조건의 회귀 때문에 채택하지 않았다. 새 출처 갈래에는 보유 수만 계산하는 전용 SQL을 사용한다. 기존 인덱스는 삭제하지 않는다.

단계별 조회와 선택·검색·재시도 동작은 [UI 통합 보고](bank-first-demand-codex-20261019.md), 원본 집계·인덱스·폐기한 SQL 실험은 [SQL 독립 보고](bank-first-call-sql-codex-20261019.md)에 자세히 기록했다. 교과서 책 행의 자료 편수는 아직 열지 않은 자료 집계를 요구하므로 새 창에서 생략했다. 운영 `UnifiedWorkspace`는 `MathExamBuilder`를 쓰며, 옛 `BankView`·`BankSourcePicker`는 개발/비교 경로와 기존 계약을 위해 보존했다.

독립 `/problems`도 별도로 확인했다. 현재 카드의 학년이 분수 표시에 필요하므로 목록의 최대 20개 문항에 해당하는 단원 ID만 먼저 읽는다. 전체 단원 목록은 범위 선택·등록·생성을 열 때 한 번 읽고 재사용한다. 새 `/api/units?ids=…`는 명시한 ID만 DB에 질의하며, 기존 쿼리 없는 응답은 그대로다. 단원 실패는 현재 조회만 재시도하고, 폼은 단원 확인 뒤 실제 기본 단원으로 연다. 초기의 카드·담기 여부·담기 바에 필요한 조회는 유지했다. 이 마지막 보완은 worker 패치 이후 root에서 통합했다.

## DB·reader 계약

마이그레이션은 [SQL](../../../../prisma/migrations/20261019160000_bank_read_revision/migration.sql), 운영 도구는 [apply-bank-read-revision-migration.ts](../../../../scripts/db/apply-bank-read-revision-migration.ts)다. `schema.prisma`는 손으로 수정했고 format/generate를 실행하지 않았다.

- `problem`은 AFTER statement transition table로 INSERT/UPDATE/DELETE의 **바뀐 행만** 읽는다. `shared` 행이 관계된 문장에 판 번호를 한 번 올리고 미계산 형식 수의 증감을 반영한다. private→shared와 역방향도 포함하며, private끼리의 변경은 제외한다. 기존 BEFORE 정체·형식 무효화 트리거가 반영된 NEW 행을 센다.
- `unit`, `source_material`, `source_book`은 INSERT/UPDATE/DELETE/TRUNCATE 문장마다 한 번 증가한다. 관련 표의 0행 문장도 안전하게 과잉 무효화한다. `problem` TRUNCATE는 미계산 수를 0으로 만든다.
- 판·형식 카운터는 원래 쓰기와 같은 거래에서 상대 갱신한다. 실패·롤백은 둘 다 취소한다. 복수 문항을 한꺼번에 바꿔도 문항 수만큼 singleton을 갱신하지 않는다.
- singleton의 PRIMARY KEY는 단일 행 제약을 위한 필수 인덱스다. 성능 개선용 추가 인덱스로 계산하지 않으며, 한 행 조회가 PK 없이는 느려진다고 주장하지 않는다.
- 새 표는 RLS 활성화·PUBLIC/anon/authenticated 권한 회수, 두 트리거 함수도 직접 실행 권한을 회수한다. 함수는 `SECURITY DEFINER`, 고정 `search_path=pg_catalog`, 기존 표를 명시한 이름으로 접근하여 기존 제한된 SQL writer에도 새 표 권한을 요구하지 않는다.
- 초기 형식 수를 읽기 전에 네 표에 `SHARE ROW EXCLUSIVE`를 잡아 초기화와 트리거 설치 사이의 쓰기 누락을 막는다. 기존 SELECT는 계속 가능하다. 도구는 `lock_timeout=3s`, 문장 제한 60초, 거래 제한 120초·대기 상한 20초, advisory lock을 쓴다. DDL·초기 카운터·정확한 Prisma 이력이 하나의 거래이며 사후 검증 실패도 전체 롤백한다.
- [reader](../../../../src/lib/bankReadFingerprint.ts)의 `BANK_READ_REVISION`은 **정확히 `on`일 때만 새 표를 읽고, 기본은 기존 xmin 경로**다. DDL 적용 전 이 플래그를 켜지 않는다. 잘못 켜서 표/행이 없으면 오류로 닫히며, 존재하지 않는 표를 참조한 뒤 같은 거래에서 오류를 삼키지 않는다.
- 새 reader도 **매 요청 같은 RepeatableRead 스냅샷에서 DB를 읽는다.** 판 토큰을 요청 사이에 TTL로 저장하지 않는다. 기존 결과 캐시·계정 조건 제외·epoch·내부 쓰기 무효화는 유지한다. 카운터가 기록한 형식 판과 현재 classifier 판이 다르면 기존 xmin 검증으로 돌아간다. singleton은 캐시 무효화와 형식 증거이며, 단원/출처 집계 결과가 아니다.
- 책 수량은 기존 전량 xmin 검증보다 범위 읽기 자체가 빨라 기본 off 상태에서는 그대로 읽는다. 리드가 revision을 켜면 한 행을 매번 확인한 뒤 해당 과목/담은 책 결과만 재사용한다. 이때 형식 확인도 동일 counter 증거로 생략하며 출제 잠금 변경은 새 판에서 다시 계산한다. 자료 페이지는 결과를 캐시하지 않고 현재 20개+선택만 읽는다. `withBankReadClient`는 범위 해석을 같은 거래에 묶기만 하며 전량 지문이나 캐시 유효 증거를 만들지 않는다.
- 트리거 비활성화·복제 우회·외부 복원·DB 교체에서는 전 인스턴스 `BANK_COUNTS_EPOCH` 전환과 counter 재검증이 필요하다. 일반 직접 SQL·시각을 보존한 UPDATE는 정상 트리거로 잡는다. 이전 classifier 판의 카운터를 현재 판으로 바꾸려면 별도 검토된 잠금·재집계가 필요하다.

PostgreSQL의 [statement/transition trigger 규칙](https://www.postgresql.org/docs/17/sql-createtrigger.html), [RepeatableRead 규칙](https://www.postgresql.org/docs/17/transaction-iso.html)을 따랐다. 새 인덱스를 선택하지 않았으므로 거래 밖 `CREATE INDEX CONCURRENTLY` 단계도 없다.

## 실측과 정확성

### 새 운영 조회 — 공유 DB, 각 3회

[실측 JSON](bank-first-call-demand-live-20261019.json), [재현 도구](../../../../scripts/qa/measure-bank-first-call-demand-live.ts). `BANK_READ_REVISION`은 off다. 중2 첫 단원의 8차시, 해당 과목 교과서 7권, 고른 책의 현재 자료 20개와 선택 1개를 사용했다. 아래 숫자는 ms다.

| 지금 보이는 단계 | 최초 3회 | 반복 3회 | 중앙값 최초 → 반복 |
| --- | --- | --- | ---: |
| 처음 학년 이름만 | 29.2 / 26.0 / 25.7 | 26.6 / 28.1 / 25.6 | **26.0 → 26.6** |
| 고른 학년의 단원 이름 | 26.1 / 28.1 / 26.3 | 26.5 / 25.9 / 26.2 | **26.3 → 26.2** |
| 고른 단원의 차시 이름 | 27.1 / 24.8 / 28.1 | 27.4 / 29.6 / 27.1 | **27.1 → 27.4** |
| 보이는 차시 문항/갈래 수량 | 335.4 / 310.8 / 314.5 | 257.8 / 258.2 / 256.4 | **314.5 → 257.8** |
| 그 차시의 문항 1쪽 | 428.3 / 428.9 / 425.3 | 334.1 / 336.2 / 352.5 | **428.3 → 336.2** |
| 출처 갈래만 | 646.5 / 646.4 / 643.1 | 245.1 / 250.2 / 244.9 | **646.4 → 245.1** |
| 교과서 과목 이름만 | 54.6 / 51.8 / 53.8 | 56.6 / 52.6 / 50.5 | **53.8 → 52.6** |
| 현재 과목의 책 메타데이터 | 82.4 / 77.3 / 80.9 | 78.2 / 78.7 / 85.4 | **80.9 → 78.7** |
| 현재 과목의 책·종류 수량 | 250.9 / 243.3 / 249.4 | 247.0 / 247.4 / 240.8 | **249.4 → 247.0** |
| 현재 자료 20행·선택 가용성 | 115.3 / 114.6 / 113.9 | 117.7 / 112.6 / 115.5 | **114.6 → 115.5** |

최초는 각 경로 직전 프로세스 결과 캐시를 비운 호출이다. DB 버퍼·연결을 비운 물리적 cold 측정은 아니다. 세 회차 모두 검증된 READ ONLY RepeatableRead 안에서 실제 제품 reader를 호출했고 raw/model 쓰기를 proxy로도 차단했다. DB 왕복·지문 SELECT는 포함하고, 같은 스냅샷을 공유하는 하네스의 BEGIN/COMMIT·인증·HTTP·Next 컴파일·브라우저 렌더는 제외했다. 이전 바이트 대조와 같이 `force_custom_plan`, 병렬 0을 LOCAL로만 적용했다. 따라서 이 수치는 완성된 HTTP 화면 응답의 700/150ms 보증이 아니다. 다른 학년·모든 검색·선택 735차시의 최대 조합도 전수 실측한 것은 아니다.

반복 미달 4경로 중 앞의 세 경로는 약 244ms의 xmin 지문이 남는다. 책 수량은 format 진단 약 140ms와 실제 집계 약 84ms를 포함했다. 새 revision을 켜면 앞의 세 경로는 한 행 검증으로 바뀌고, 책 수량도 그 검증 뒤 결과 캐시를 재사용한다. **이는 적용 후 재측정해야 할 변경이며 이번 공유 DB의 실제 개선 수치로 제시하지 않는다.**

### 기존 응답과 새 보기의 대응

[원본 `5051fea68`와 최종 reader 전체 응답](bank-first-call-original-parity-20261019.json): 기존 11경로 × 3회에서 최종 cold **33/33**, 최종 반복 **33/33**, 합계 **66/66** Buffer 바이트가 같다. 키 정렬·정규화·필드 삭제 없이 응답 길이·SHA-256·Buffer 동등성을 비교했다. 기본 목록·전역 범위·출처·bootstrap·자료·저장 실제 ID·solver를 포함한다. 정확 ID의 필요한 1행과 solver의 실제 표현 241행은 유지하며, 일반 집계/쪽 요청의 전량 후보 전송은 0행이다.

보존한 전역 API의 최종 최초 중앙값은 전체 목록 **2,554ms**, 전체 범위·갈래 **2,075ms**, 기존 출처 **1,298ms**, bootstrap **1,196ms**, 자료 안 목록 **1,343ms**다. 이 경로들을 700ms로 만들었다고 주장하지 않는다. 운영 초기·선택 단계가 이 전역 요청을 호출하지 않도록 바꾼 것이 먼저 한 개선이다. 개발/기존 소비자의 기본 응답을 줄여서 바이트 검사를 통과시킨 것도 아니다.

새 작은 보기는 원래 없던 계약이다. 차시 수량·문항 본문/페이지·출처 갈래·자료 첫 20행/선택 가용성의 지정 필드/행은 **24/24** 바이트로 대응했다. 새 과목별 책 수량은 **6/6**에서 모든 책의 보유·출제 가능·자료 종류별 값이 일치했다. 다만 전체 스캔과 범위 스캔의 자연 순서 차이로 7권 중 6권의 `kinds` 레코드 **키 삽입 순서**가 달랐다. 새 책 보기의 raw record 바이트 일치는 **0/6**이며 JSON의 `rawRecordBytesEqual:false`를 그대로 남겼다. 종류별 값을 별도로 검사했으며, 이를 기존 API 전체 응답 바이트 통과로 대신 주장하지 않는다. 화면의 종류 차례는 기존 고정 `kinds` 목록을 따른다.

### 꼭 읽어야 하는 값만 SQL에서 계산

[학년 메타데이터 실제 SQL/EXPLAIN](bank-first-call-curriculum-metadata-20261019.json): 설치된 Prisma 6.19의 `findMany distinct`는 DB에서 `id,grade` **735행**을 받아 중복을 지웠다. 새 `GROUP BY grade`는 DB에서 **16행**만 반환하며 학년 집합은 같다. SQL 자체의 시간 차이를 과장하지 않고, 불필요한 행 전송을 없앴다.

[출처 갈래 held-only SQL 실측/EXPLAIN](bank-first-call-held-source-live-20261019.json): 기존 `source` 축 집계 **652.4 / 652.1 / 651.5ms** → 새 보유 수 전용 SQL **405.1 / 403.5 / 404.0ms**, 다섯 수량의 바이트 **3/3** 동일이다. 화면에서 쓰지 않는 출제 자격·형식·행 순번·책/자료 조인을 계산하지 않는다. 이 별도 하위 SQL 시간에는 지문·거래 시작/종료가 포함되지 않는다. 제품의 기존 공용 `questionCountSql.ts`는 원본 그대로다.

### 인덱스와 revision 추정의 한계

실분포 mirror는 118,166 problem·735 unit·1,992 material·35 book, 실제 UUID/enum과 기존 인덱스 26개를 재현했다. 공유 READ ONLY 캡처를 끝내고 연결을 닫은 뒤에만 로컬 DDL을 실행했다. 정답은 기존 센티널 여부만 보존하고 본문/실제 정답은 복사·출력·파일 저장하지 않았다.

| 후보, 로컬 크기 | 없음 → 있음 중앙값 예 | 판단 |
| --- | --- | --- |
| shared unit/question covering, 21.49MiB | 중2 수량 62.331 → 64.227ms; 1쪽 167.652 → 169.409ms | 미선택·개선 근거 없음, 제외 |
| 기존 출제 자격 partial covering, 15.32MiB | bootstrap 243.076 → 243.021ms; 출처 245.251 → 244.739ms | 미선택·0~1ms 수준 차이, 제외 |

자세한 유/무 반복·heap/temp 계획·중간 실패는 [독립 보고](bank-first-call-sql-codex-20261019.md)와 그 JSON에 보존했다. 기존 인덱스 중 이번 설계 때문에 쓸모없어졌다고 입증한 것은 없다. 삭제 제안도 없다.

같은 로컬 mirror에서 실제 revision DDL 전체 적용 뒤 xmin 해시는 **58.056ms**, singleton은 **0.101ms** 중앙값(각 5회)이었다. 첫 로컬 표본은 66.233 → 0.108ms였다. 운영 heap/TOAST 폭·visibility map·WASM CPU·저장·통신은 다르므로 이를 운영 API 감소 ms로 외삽하지 않는다. 운영의 짧은 메타데이터 SELECT가 약 26ms였다는 참고로 지문 교체만 가정하면, 반복 차시 수량은 약 40ms, 문항 페이지는 약 120ms가 될 수 있다는 **산술 추정**은 가능하다. 잠금·부하·HTTP를 포함한 실측은 아니며 150ms 달성 판정으로 쓰지 않는다.

원본 하위 SQL은 자연 순서를 명시하지 않은 부분이 있다. PGlite 재ANALYZE/후보 추가·제거 뒤 수량은 같아도 bucket 순서가 달라진 표본, 공개하지 않는 `firstAvailable`만 달라진 표본을 삭제하지 않았다. 이 역시 보조 인덱스를 넣지 않은 근거이며, 이번 기본 API 66건의 동일성 검증과 구분한다.

## 검증

- 최종 수학/공통 제작기·영어·연산·출력 회귀: **19파일 268개 통과**.
- API·형식·캐시·SQL·revision 묶음: **18파일 227개 통과**. 위 묶음과 `WorkspaceBankMetadata`, `mathExamBuilderSource` 두 파일은 중복 실행했다. 495건을 고유 시험 수로 세지 않는다.
- 독립 문제은행·형식 선택·소량 단원 API: **3파일 73개 통과**. 현재 문항 단원만 읽기·전체 목록의 명시적 열기와 재사용·실패 재시도·실제 단원 ID·분수 표시·필터/담기/등록/생성/변형 회귀를 확인했다. 소량 단원 API는 기본 응답 바이트·ID 제한/중복 제거·400·401을 확인했다. 이 API 바이트 시험은 인메모리 fixture이며 앞의 공유 DB 66건에 합산하지 않는다.
- 실제 PGlite revision 시험은 선행 실제 migration chain/정체 트리거 위에서 10개를 검증했다. 기존 SELECT/집계/쪽 바이트, 실제 운영 도구의 분리 SQL 적용, 초기 카운터, 대량 문장 1회 증가, NULL/다른 판/현재 판 형식, pool 전환, UPSERT·삭제·TRUNCATE, 관련 표, 권한/RLS, 기존 제한 writer, cache 무효화·판 불일치 fallback, 전체 실패 롤백·DDL 되돌림을 다룬다.
- 동시 요청 12개를 PGlite transaction 큐에서 실행하여 판 증가가 빠지지 않고 실제 미계산 수와 대응함을 확인했다. **PGlite는 단일 연결이므로 운영 다중 연결의 잠금 경합·deadlock·MVCC 쓰기 경쟁을 검증한 것은 아니다.**
- revision을 켠 책 수량의 결과 재사용·매 요청 판 확인·출제 잠금 변경 후 재계산은 별도 API 시험으로 검증했다. mock은 reader 계약만 확인하며 실제 트리거의 증거는 위 PGlite 시험이다.
- 전체 `npm run type-check`(8GB), 변경/신규 TS·TSX·MTS **42파일** ESLint, `git diff --check` 통과. `prisma validate`는 DB 연결 없는 형식 검사만 수행했다. `prisma generate/format`은 실행하지 않았다. 기존 builderSpeed snapshot은 갱신하지 않았다.
- [최종 DDL 드라이런](bank-first-call-revision-preflight-20261019.json)은 공유 READ ONLY `pending`, checksum `e558cd28f21e3198bea5d10f1c25d5eb331412de1caa4d5bcc07bdcc6b42771c`, 15문장·보조 인덱스 0개다. 공유 apply/데이터 쓰기는 없다.
- 실계정 HTTP·브라우저·폭별 화면 검증은 수행하지 않았다. 학생 화면·인쇄 CSS·저장 문항의 내용·순서·표현은 변경하지 않았다.

## 리드 실행 순서

이 작업에서는 **공유 DB 쓰기·apply·백필·배포·커밋·푸시를 하지 않았다.** 리드가 검토한 정확한 작업본과 운영자 환경 파일을 사용한다. 아래 `/path/to/operator.env`는 실제 환경 파일 경로로 바꾸며 파일 내용을 출력하지 않는다.

1. 현재 운영 reader가 기존 정체/형식 reader floor를 만족하는지 확인하고, 모든 인스턴스의 `BANK_READ_REVISION`을 unset 또는 `off`로 유지한다. 아래 드라이런은 READ ONLY이며 `pending`이어야 한다. 부분 설치·다른 checksum·비활성 선행 트리거는 실패한다.

   ```sh
   node_modules/.bin/tsx --env-file=/path/to/operator.env scripts/db/apply-bank-read-revision-migration.ts
   ```

2. **리드만** 동일 파일을 적용한다. 이전 운영 코드가 계속 읽고 쓸 수 있는 DB 먼저 단계다. 잠금 실패 시 설정을 늘려 강행하지 말고 쓰기 작업이 짧은 때 재시도한다.

   ```sh
   ALLOW_SHARED_IMPORT=1 node_modules/.bin/tsx --env-file=/path/to/operator.env scripts/db/apply-bank-read-revision-migration.ts --apply
   node_modules/.bin/tsx --env-file=/path/to/operator.env scripts/db/apply-bank-read-revision-migration.ts
   ```

   두 번째 명령은 `applied`·checksum/정의/권한/트리거/카운터 대응 검증 성공이어야 한다. 다시 `--apply`해도 이미 적용된 정확한 설치는 건드리지 않는다.

3. 새 코드와 분리된 배포 의존성을 준비하여 배포한다. 이 checkout의 공유 `node_modules`를 수정하거나 `git add`하지 않는다. 새 reader는 기본 off로 먼저 배포해 이전 경로와 인증·선택·출력 회귀를 확인한다.
4. DDL 드라이런이 `applied`인 것을 확인한 뒤 운영 전 인스턴스에 `BANK_READ_REVISION=on`을 설정한다. 단일 행 조회·변경 뒤 무효화·출처/차시/문항 정확성을 다시 확인한다. 그때 운영 실제 최초/반복 응답의 700/150ms를 측정한다. 이 단계의 결과는 이번 작업에서 측정할 수 없다.

## 되돌리는 법

revision reader의 가장 간단한 되돌림은 모든 인스턴스의 `BANK_READ_REVISION=off`다. 기존 xmin reader로 즉시 돌아가며, 추가 표·트리거는 남겨도 기존 코드와 호환된다. DB를 바로 삭제할 필요가 없다.

DDL까지 없애야 하면 먼저 **모든 실제 운영 인스턴스에서 reader를 끄고 진행 중 요청을 정리**한다. CLI의 로컬 `BANK_READ_REVISION=off`만으로 운영 전체 설정을 대신할 수 없다. 같은 checksum/정의가 유지된 설치에 대해서만 아래를 실행한다.

```sh
BANK_READ_REVISION=off node_modules/.bin/tsx --env-file=/path/to/operator.env scripts/db/apply-bank-read-revision-migration.ts --rollback
BANK_READ_REVISION=off ALLOW_SHARED_IMPORT=1 node_modules/.bin/tsx --env-file=/path/to/operator.env scripts/db/apply-bank-read-revision-migration.ts --rollback --apply
```

첫 명령은 읽기 전용, 둘째만 리드의 쓰기다. 자기 트리거 7개·함수 2개·표·정확한 checksum의 이력만 한 거래에서 없애고 `pending`을 검증한다. 기존 problem 열·인덱스·정체/형식 트리거·학생 기록은 대상이 아니다. 실패 시 전체 롤백한다. 과거 학생 reader floor 이전 코드로 운영을 되돌리는 명령이 아니다.

## 남긴 상태

Orca/Codex 독립 작업 2개를 수행했다. SQL 근거/시험/도구 17개와 UI/route/계약/회귀/문서 24개 파일을 이 작업트리에 명시적으로 복사하고 root 소유 DDL·reader·범위 함수와 함께 검증했다. 두 worker는 성공으로 정산·종료했고, 반환되지 않은 worker 자원은 없다. 사용한 [orca-cli skill](/Users/pss/.agents/skills/orca-cli/SKILL.md), [orchestration skill](/Users/pss/.agents/skills/orchestration/SKILL.md)을 따랐다.

`BIGSHOL/bank-first-demand`, `BIGSHOL/bank-first-sql` 두 작업트리는 미커밋 변경을 보존하고 `in-review`로 표시했다. 커밋 금지가 우선이므로 main merge를 하지 않았고, dirty/미병합 작업트리를 삭제하지 않았다. 작업 경로는 `/Users/pss/orca/workspaces/today_/bank-first-demand`, `/Users/pss/orca/workspaces/today_/bank-first-sql`이다. 리드 소유 helper를 제외한 worker 패치와 최종 통합본의 구분은 UI 보고에 있다.

현재 브랜치/HEAD는 작업 시작 때와 같다. 스테이징·커밋·푸시는 없다. 시작부터 미추적이던 지시서는 수정하지 않았다. `node_modules`는 원래 공유 심볼릭 링크이고 Git에 추가하지 않았다. 배포/리드 적용을 마쳤다는 주장 없이, 검토 가능한 코드·SQL·시험·실측·실행 순서를 남긴 상태다.
