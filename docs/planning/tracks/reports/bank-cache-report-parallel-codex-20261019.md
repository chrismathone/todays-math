# 문제은행 목록 캐시 · 반 전체 성적표 동시 렌더 결과

2026-10-19. 지시서: `docs/planning/tracks/brief-bank-cache-report-parallel-codex.md`.
작업 기준은 `b353aff927677b475ff167137214898879ac27c5`, 통합 위치는 `perf/bank-list-cache` 작업 공간이다.

문제은행의 공용 문항 목록에 페이지를 자르기 전 대표 ID 목록 캐시를 추가했다. 같은 조건으로 2쪽을 읽는 실측 중앙값은 **2,617.694 → 90.288ms (96.55% 감소, 약 29배)**였으며, 후보 118,166행 재조회는 0행이 됐다. 성적표의 학생별 PDF는 상수 3개까지 동시에 생성하고 Chromium 브라우저 하나를 공유한다. 화면·문구·출력 지면은 바꾸지 않았다.

## 사람별 조건과 캐시 범위

`/api/studio/problems`의 GET/POST는 매번 `authorizeStudio`를 거친 뒤 `loadUnifiedBank`를 호출한다. 인증 결과나 HTTP 응답 자체는 저장하지 않는다. `resolveUnifiedBankQuery`와 `bankQueryContext`를 확인한 결과, 현재 조회에서 계정에 따라 달라지는 조건은 **`recent=1`**이다. 로그인 계정의 시험 중 서울 날짜 기준 최근 14일에 출제한 문항을 제외하며, 해당 계정은 서버가 공급한다.

일반 문항 풀은 `problemPool.ts`와 Prisma의 `problemVisibility.ts`에서 `shared`로 제한한다. 목록에 소유자·지점별 WHERE 조건은 없다. 인증·메뉴 권한 판정은 요청마다 실행되고 캐시에 포함되지 않는다. 명시적 선택 상태를 전역에 보관하지 않도록 아래 요청도 제외했다.

| 조건 | 처리 |
|---|---|
| `recent` | 값의 유무와 관계없이 목록 캐시 우회. 계정별 최근 출제 결과를 공유하지 않음 |
| `ids` | 캐시 우회. 저장된 실제 표현 ID 및 `exact_ids` 동작 유지 |
| `excludeIds`, `excludeFamiliesOf`, `familyOf` | 캐시 우회. 기존 SQL 기반 교체 경로도 유지 |
| 일반 공용 필터 | 키에 `page`, `pageSize`를 제외한 모든 검색 매개변수를 포함 |
| 자료 선택에 따른 정렬 | `materials` 등 조회 조건이 키에 남으므로 기본 정렬과 구분 |
| `identity=question&view=bootstrap` | 기존 요약 경로 유지. 목록 캐시에 들어가지 않음 |
| 문항 보기 이외의 목록 | 기존 경로 유지 |

## 목록 구현과 무효화

`src/lib/bankReadCache.ts`에 작은 별도 목록 저장소를 두었다. 저장 값은 `{ total, ids }`이며, `ids`는 기존 `projectQuestionCandidates`가 묶고 정렬한 대표 문항 ID 전체다. 후보 행·문항 본문·정답·풀이 객체는 보관하지 않는다. `loadQuestionBank`는 이를 페이지 크기에 맞춰 자른 뒤 기존과 동일하게 실제 행, 표현별 메타데이터, 출처 정보를 읽는다. 응답의 필드 구성·순서와 페이지 보정 규칙을 유지했다.

- 목록 **최대 3개**, 전체 **대표 UUID 250,000개**를 상한으로 둔다. 기존 수량 캐시의 64개 한도와 분리했다. 상한보다 큰 단일 목록은 호출에 반환하고 보관하지 않는다.
- 같은 키의 진행 중 읽기를 합친다. 완료된 시점부터 기존과 같은 **15초 TTL**을 적용한다.
- 기존 `BANK_COUNTS_EPOCH`를 키에 넣고, `invalidateBankReadCache`가 수량·목록을 함께 비운다. 앱 Prisma의 `problem`, `unit`, `sourceBook`, `sourceMaterial` 변경 후 기존 무효화 경로가 그대로 적용된다.
- 실패 결과를 저장하지 않는다. 무효화·퇴출 후 끝난 과거 읽기가 캐시를 되살리지 않는다. 다른 서버 프로세스 및 직접 SQL 변경의 수렴은 기존 epoch/TTL 규칙을 따른다.

## 공유 DB 실측

다음 명령으로 **공유 DB 읽기만** 수행했다. 측정 스크립트는 Prisma 쓰기와 임의 raw 명령을 차단하고, 세 회차 각각 PostgreSQL `RepeatableRead` 트랜잭션에서 `SET TRANSACTION READ ONLY`와 `transaction_read_only=on`을 확인했다. 각 회차의 전/후 코드는 같은 스냅샷을 읽는다. 계정·학생 데이터나 문항 내용은 출력·증거 파일에 넣지 않았다.

```sh
npx --no-install tsx --conditions=react-server --env-file=/Users/pss/Desktop/creative/today_/.env scripts/qa/measure-bank-list-cache-live.ts
```

변경 전 독자는 Git 기준 `b353aff927677b475ff167137214898879ac27c5`의 `unifiedPreview.ts`를 임시 파일로 읽어 실행한다. 임시 파일은 종료 시 삭제한다. 전/후 각각 캐시를 비운 뒤 전체 1쪽 → 같은 조건 2쪽 → 중2 필터 5쪽 순서로 조회하며, 페이지 크기는 12다. 시간은 서버 목록 함수의 벽시계 시간이다. 인증·Next 컴파일·HTTP 전송·화면 렌더 및 바깥 읽기 전용 트랜잭션 개시 시간은 제외한다.

| 경로 | 변경 전 1 / 2 / 3회 (ms) | 변경 후 1 / 2 / 3회 (ms) | 중앙값 전 → 후 (ms) |
|---|---:|---:|---:|
| 첫 호출 · 전체 1쪽 | 4136.380 / 4041.202 / 4085.558 | 4392.432 / 4248.163 / 5272.025 | 4085.558 → 4392.432 |
| 같은 조건 · 전체 2쪽 | 2617.694 / 2431.346 / 3176.493 | 87.591 / 90.288 / 96.774 | **2617.694 → 90.288** |
| 다른 필터 · 중2 5쪽 | 2493.572 / 2552.223 / 2798.498 | 2726.169 / 2534.522 / 3012.235 | 2552.223 → 2726.169 |

| 경로 | 후보 읽기 전 → 후 (매 회차) | 모델 읽기 전 → 후 | 응답 크기 | 결과 |
|---|---:|---:|---:|---|
| 전체 1쪽 | 2회 / 233,887행 → 동일 | 8 → 8 | 181,113 bytes | 3/3 바이트 일치 |
| 전체 2쪽 | 1회 / 118,166행 → **0회 / 0행** | 5 → 2 | 159,191 bytes | 3/3 바이트 일치 |
| 중2 5쪽 | 2회 / 139,329행 → 동일 | 8 → 8 | 158,442 bytes | 3/3 바이트 일치 |

첫 호출·새 필터는 캐시 미스여서 기존 후보 전수 읽기가 남는다. 이번 표의 중앙값은 각각 7.51%, 6.82% 증가했으므로 이 경로의 속도 개선은 주장하지 않는다. 3회 로컬 측정은 운영 지연 분포나 Chromium 실성능을 증명하지 않는다. 전체 문항 수는 67,893, 중2 필터 결과는 13,603으로 전후 동일했다.

응답은 키 정렬·정규화 없이 `Buffer.from(JSON.stringify(value))` 전체 바이트를 비교했다. **전/후 9쌍 모두 일치**했다. 원시 시간·조회 수·응답 크기·SHA-256은 같은 폴더의 `bank-cache-report-parallel-codex-20261019-measurements.json`에 있다. HTTP 인증 경로 자체의 시간을 측정한 결과는 아니다.

## 성적표 동시 렌더

`src/lib/export/pdfServer.ts`의 `buildPdfBatch`가 **`PDF_BATCH_CONCURRENCY = 3`**인 작업 큐를 실행한다. 문서 준비부터 PDF 생성·페이지 닫기까지 한 작업으로 세며, 빈 자리가 생기면 다음 학생을 처리한다. 브라우저는 필요한 첫 미확정 학생에서 한 번만 실행하고, 학생마다 별도 페이지를 연다. 전원이 확정본이거나 입력이 비어 있으면 Chromium을 실행하지 않는다.

`src/lib/examReport/server.ts`는 기존 대상 선별을 유지하고 배치 결과를 원래 인덱스에 맞춰 받는다. 이후 기존 PDF-lib 합치기 루프를 순서대로 실행하므로 **학생 명단 순서와 각 학생 PDF 안의 쪽 순서**가 보존된다.

| 항목 | 동작 |
|---|---|
| 확정 학생 | 기존 저장 PDF와 지문 검증을 사용. 재렌더·재확정·업로드 없음 |
| 미확정 학생 | 기존처럼 `scope=all`일 때만 현재 내용으로 렌더 |
| `kind=class` 요약표 / 단일 확정 | 기존 단일 PDF 경로 유지 |
| 한 학생의 보관본 읽기·문서 준비·렌더 실패 | 배치 전체 거절. 새 대기 작업 중단, 실행 중 작업과 페이지 정리 후 브라우저 닫기. 부분 PDF 반환 없음 |
| PDF 파싱·합치기 실패 | 전체 인쇄 실패. 기존 확정·보관 상태 변경 없음 |
| 지면 넘침 | 기존 메시지와 HTTP 422 변환 유지 |
| 인쇄 중 원본·권한 변경 | 기존 최종 재인가·원본 지문 재확인 유지. 원본 변경 시 409 |
| 시간 제한 | 기존 PDF별 60초 유지. 만료 시 공유 브라우저를 닫고 전체 실패. 반 전체에 새 60초 제한을 두지 않음 |
| 자원 정리 중 추가 실패 | 이미 관측한 첫 오류를 유지하고 전체 실패. 생성한 페이지와 브라우저를 정리 |

`preparePage`, 외부 자원 허용 규칙, 글꼴·이미지 확인, 지면 검증, A4·가로 인쇄 옵션은 그대로 사용한다. 실제 Chromium·실제 학생 인쇄는 실행하지 않았다. 20명 실렌더 시간이나 운영 함수 시간 단축 수치는 이번 작업에서 측정하지 않았다.

## 시험 및 작업 상태

최종 통합 작업 공간에서 **14개 시험 파일 / 177개 시험 모두 통과**했다. `npm run test`의 파일 수·미처리 오류 검사까지 통과했다.

```sh
npm run test -- \
  src/__tests__/unit/bankReadCache.test.ts \
  src/__tests__/api/questionBankProjection.test.ts \
  src/__tests__/api/unifiedBankFilters.test.ts \
  src/__tests__/api/unifiedBankAvailability.test.ts \
  src/__tests__/api/unifiedBankSource.test.ts \
  src/__tests__/api/builderSpeedParity.test.ts \
  src/__tests__/api/builderSpeedPgliteParity.test.ts \
  src/__tests__/unit/pdfServerBatch.test.ts \
  src/__tests__/unit/pdfExport.test.ts \
  src/__tests__/unit/examReportServer.test.ts \
  src/__tests__/unit/examReportPaperHtml.test.ts \
  src/__tests__/api/examReportWorkspace.test.ts \
  src/__tests__/api/pdfBatchResponse.test.ts \
  src/__tests__/api/worksheetExports.test.ts
```

- 목록: 쪽 자르기 전 묶기, 페이지 크기 간 재사용, 필터별 분리, 잘못된 요청의 재검증, 계정별 최근 제외, 명시 ID·문항류 요청 우회, Prisma 쓰기·epoch 무효화, TTL·동시 읽기 합치기·상한·실패·무효화 중 진행 중 읽기를 검증했다.
- 기존 `builderSpeedParity` 고정 스냅샷과 `builderSpeedPgliteParity`의 로컬 PostgreSQL 비교를 유지했다. 32가지 필터·쪽·표현·ID 조건에서 과거 독자와의 의미 일치를 확인하고, 현재 독자의 첫/재호출 **JSON 문자열 일치** 검사를 추가했다. 이전 고정본(`27b66e0`)은 이미 객체 키 순서가 달라 의미 비교를 사용한다. 이번 작업 기준(`b353aff`)과의 원문 바이트 동일성은 위 공유 DB 9쌍에서 별도로 확인했다.
- Chromium 모킹: 최대 열린 페이지 3개, 브라우저 1회 실행, 역순 완료, 빈자리 즉시 충원, 보관본 전용 우회, 소스·실행·페이지 생성·준비·렌더 실패, 대기 작업 중단, 페이지·브라우저 정리 실패, 60초 타임아웃·타이머 정리를 검증했다.
- 성적표: 보관본과 미확정 PDF가 섞이고 학생마다 여러 쪽인 경우의 순서, 잘못된 PDF·보관본 오류·렌더 오류·지면 넘침의 전체 실패, 확정 상태 유지, 인쇄 중 원본 변경 409를 검증했다.

`npm run type-check` 통과. 변경한 TypeScript 파일 10개의 eslint 및 `git diff --check`도 통과했다. 시험의 DB는 메모리 대역/PGlite 픽스처이며 공유 DB 연결은 하지 않는다.

변경 파일은 다음과 같다.

| 범위 | 파일 |
|---|---|
| 목록 구현 | `src/lib/bankReadCache.ts`, `src/lib/unifiedPreview.ts` |
| 성적표 구현 | `src/lib/examReport/server.ts`, `src/lib/export/pdfServer.ts` |
| 목록 시험 | `src/__tests__/unit/bankReadCache.test.ts`, `src/__tests__/api/questionBankProjection.test.ts`, `src/__tests__/api/builderSpeedPgliteParity.test.ts` |
| 성적표 시험 | `src/__tests__/unit/examReportServer.test.ts`, `src/__tests__/unit/pdfServerBatch.test.ts` |
| 재현 스크립트 | `scripts/qa/measure-bank-list-cache-live.ts` |
| 결과물 | 이 보고서, `bank-cache-report-parallel-codex-20261019-measurements.json` |

Orca 병렬 작업은 목록·측정·통합을 현재 세션에서, 성적표를 Codex 작업 공간 `bank-report-parallel-20261019`에서 진행했다. 성적표 작업은 성공으로 정산됐고, 네 파일을 동일 기준 HEAD의 현재 작업 공간에 복사해 바이트 일치를 확인한 뒤 통합 검증했다. Run은 `run_bcae7af8b97f`, Task는 `task_8e323b4bb3d8`, Dispatch는 `ctx_205fc71769bc`다. 작업자 터미널은 정산 후 해제했고 회수 대기 작업은 0개다.

지시서가 커밋을 금지하므로 `main` 병합은 하지 않았다. 변경은 현재 `perf/bank-list-cache`에 **미커밋·미스테이징** 상태로 모았다. Orca 작업 공간은 아직 `main` 미병합·미커밋이므로 AGENTS의 삭제 조건에 따라 원본과 브랜치를 보존했다.

공유 DB 데이터 쓰기, 스키마 변경, `prisma generate`, 커밋·푸시는 수행하지 않았다. `node_modules`는 `/Users/pss/Desktop/creative/today_/node_modules`를 가리키는 기존 심볼릭 링크이며 스테이징하지 않았다. 지시서의 기존 미추적 파일도 보존했다.
