# 시험지 만들기 속도 — 완료 보고 · 2026-10-18

작업트리 `today-builder-speed`, 가지 `phase/12-builder-speed`. 기준 HEAD는
`27b66e0ad5ce03e71bd5909fb161bd6d2057eb2a`이며 커밋·스테이징·push를 하지 않았다.
중단 당시의 변경을 읽고 이어서 보강했다. [지시서](../brief-builder-speed-codex.md)는 변경하지 않았다.

**구현과 필수 검사는 완료했다. 네 경로의 로컬 PostgreSQL 반환 바이트는 약 76~97% 줄었다.
교체와 캐시를 쓴 출처 재조회는 빨라졌다. 첫 범위·추가·출처 조회의 로컬 계산 시간은 증가했으므로,
네 경로의 운영 응답시간이 모두 개선됐다고 판정하지 않는다.** 공유 DB와 실제 브라우저에서의
운영 재측정은 수행하지 않았다.

## 1. 최종 변경

- 초기 `initialUnits`를 기존 범위 표에 먼저 표시하고, 확인된 수가 도착하면 채운다.
  수량 확인 전에는 기존 안내와 선택 금지를 유지한다. JSX 구조·CSS·제품 문구는 바꾸지 않았다.
- 계수는 Node로 전체 문항 키·답을 가져오는 대신 DB의 `COUNT(DISTINCT …)`와
  `GROUPING SETS`로 합집합까지 센다. 본문 없이 판정할 수 있는 형식 SQL은 기존
  `questionFormatWithoutContent`의 증거 조합 결과로 생성한다. 판정 규칙을 새로 만들지 않았다.
- 본문이 필요한 행의 ID를 한 번만 모아, ID 인덱스로 최대 500행씩 읽고 기존 파서로 판정한다.
  그 결과는 매개변수 테이블 조인으로 집계에 반영한다. 같은 긴 ID 배열을 매 행에 대조하거나,
  쪽마다 형식·검색 조건으로 전량을 다시 찾지 않는다. 답과 해설은 이 집계 경로에서 전송하지 않는다.
- 후보는 범위·조건을 적용한 뒤 DB에서 문항별 첫 등장 순서와 사용 가능한 대표 표현을 정하고,
  요청한 쪽의 ID만 반환한다. 본문·형제 표현 메타데이터는 해당 쪽만 읽는다.
  정확한 저장 ID 조회와 지원하지 않는 조건은 기존 경로를 유지하며 메타데이터 읽기를 500행씩 나눈다.
- 전역 계수와 목록용 전역 요약에 프로세스 캐시를 둔다. TTL 15초, 최대 64개,
  이름 공간 `question-bank-counts-v1`, 직접 적재 시 무효화 열쇠 `BANK_COUNTS_EPOCH`.
  `invalidateBankReadCache()`도 제공한다. 앱 Prisma의 문항·책·자료·단원 쓰기는 캐시를 비운다.
- `recent`와 명시적 제외·정체 관련 요청은 공용 가용량 캐시에 넣지 않는다.
  동일 조건의 해석·집계를 요청 안에서 합치고, 화면의 최근 포함/제외 및 문항류 토글은
  이미 받은 계수를 재사용한다. 화면 캐시는 컴포넌트에 한정하며 15초 뒤 만료하고 실패를 보관하지 않는다.
- `ownerScope.ts`, `branchId`, 인증·라우트 권한은 변경하지 않았다. Raw SQL에도 공용 풀의
  바깥 경계를 명시했다. 미지원 조건은 더 넓은 SQL로 바꾸지 않고 Prisma 경로로 돌아간다.

## 2. 측정 방법과 범위

변경 전 다섯 읽기 파일은 [.builder-speed-baseline](../../../../.builder-speed-baseline/README.md)에
보존했다. import 경로를 정규화한 본문은 다섯 파일 모두 기준 HEAD와 일치한다.

측정은 12,000개 고정 문항을 기본 대역의 48개 문항에 추가한 12,048행·15단원 픽스처다.
NULL/빈 정체·문항류, 여러 표현, 출제 금지·비공개, 형식 증거와 긴 답을 포함한다.
실제 118,166행·735단원 데이터는 아니다. 생성 시각만 고정해서 revision을 재현하고,
시간 측정에는 실제 시계를 쓴다.

1→2→3→4를 한 번 실행한 뒤 같은 프로세스에서 다시 한 번 실행했다. 따라서 첫 순회에서도
3번은 2번이 만든 전역 요약 캐시를 사용한다. 표는 각 한 번의 관측값이며 중앙값·p95가 아니다.

- **PGlite:** 문항 읽기는 실제 로컬 PostgreSQL SQL 실행, 단원·책·자료의 보조 읽기는 Prisma 대역.
  로컬 표에는 실제 DB의 ID 기본키에 해당하는 고유 인덱스와 단원·정체 인덱스를 둔다.
- **모킹:** 모두 메모리 대역. SQL NULL 처리 등이 실제 PostgreSQL과 다르므로 별도 표로 기록한다.
  두 엔진 사이 수량이 같다고 주장하지 않고 각 엔진의 변경 전/후를 비교했다.
- 시간은 각 경로의 핵심 서버 읽기 함수 벽시계 시간이다. 인증·HTTP·DB 네트워크 왕복·트랜잭션
  제어 쿼리를 포함한 핸들러 전체 시간은 아니다.
- 쿼리는 계측한 모델 읽기/Raw 호출 수, 행은 **DB에서 애플리케이션에 반환한 논리 행**의 합이다.
  DB 내부 스캔 행 수를 뜻하지 않는다. 바이트는 그 반환값의 JSON UTF-8 직렬화 크기이며
  PostgreSQL 전송 프로토콜의 실제 바이트는 아니다. `responseBytes`는 제품 응답을 따로 기록한다.
- 첫 범위는 `view=available&identity=question&families=1&recent=1`, 추가는 단원 1개·12문항 쪽,
  교체는 같은 단원·기본 난이도·기존 ID 제외·10문항 쪽, 출처는 전역 `identity=question`이다.
  픽스처 구분 검색 조건도 범위·후보 경로에 포함된다. 실제 사용 조건과 차이가 있다.

지시서의 공유 DB 관측 7.3~7.8초·약 46MB는 리드가 제공한 과거 실측이다.
이번 로컬 수치와 직접 비교하거나 운영 개선 초수로 환산하지 않았다.
바이트 감소율은 표의 관측값에서 계산했으며 운영 시간에 대한 수치 추정은 하지 않았다.

## 3. 로컬 PGlite 결과

첫 순회:

| 경로 | 시간 ms 전 → 후 | 쿼리 전 → 후 | 반환 행 전 → 후 | 반환 JSON 바이트 전 → 후 | 바이트 감소 |
|---|---:|---:|---:|---:|---:|
| 범위 수량 | 132.64 → 231.50 | 6 → 9 | 11,298 → 2,714 | 4,330,279 → 868,638 | 79.9% |
| 문항 추가 | 146.81 → 285.62 | 7 → 19 | 15,975 → 4,761 | 6,239,003 → 1,500,697 | 75.9% |
| 문항 교체 | 113.34 → 44.14 | 8 → 7 | 12,370 → 447 | 4,698,117 → 146,607 | 96.9% |
| 출처 고르기 | 119.68 → 214.74 | 4 → 11 | 14,629 → 3,116 | 5,539,309 → 979,319 | 82.3% |

같은 프로세스의 재호출:

| 경로 | 시간 ms 전 → 후 | 쿼리 전 → 후 | 반환 행 전 → 후 | 반환 JSON 바이트 전 → 후 | 바이트 감소 |
|---|---:|---:|---:|---:|---:|
| 범위 수량 | 109.70 → 213.49 | 6 → 9 | 11,298 → 2,714 | 4,330,279 → 868,638 | 79.9% |
| 문항 추가 | 143.23 → 111.84 | 7 → 10 | 15,975 → 2,214 | 6,239,003 → 703,000 | 88.7% |
| 문항 교체 | 108.79 → 46.30 | 8 → 7 | 12,370 → 447 | 4,698,117 → 146,607 | 96.9% |
| 출처 고르기 | 118.83 → 0.02 | 4 → 0 | 14,629 → 0 | 5,539,309 → 0 | 100.0% |

최근 제외가 있는 1번은 계정별 결과이므로 공용 서버 캐시로 생략하지 않는다.
화면에서 이미 읽은 최근 포함/제외 수를 다시 요청하지 않는 동작은 별도 화면 시험으로 확인했다.
집계·형식 판정의 DB 계산 비용과 분할 읽기의 호출 수는 남아 있다.

원본: [변경 전](builder-speed-before-pglite.json), [변경 후](builder-speed-after-pglite.json).
변경 후 Raw 읽기는 `mode`, 개별 소요 `ms`, 반환 행·바이트도 기록한다.

## 4. 메모리 대역 결과

첫 순회:

| 경로 | 시간 ms 전 → 후 | 쿼리 전 → 후 | 반환 행 전 → 후 | 반환 JSON 바이트 전 → 후 | 바이트 감소 |
|---|---:|---:|---:|---:|---:|
| 범위 수량 | 182.55 → 269.71 | 6 → 10 | 14,555 → 3,122 | 5,517,029 → 976,234 | 82.3% |
| 문항 추가 | 145.43 → 279.00 | 7 → 19 | 15,975 → 4,776 | 6,239,003 → 1,502,120 | 75.9% |
| 문항 교체 | 135.72 → 71.43 | 8 → 7 | 12,565 → 471 | 4,761,740 → 153,003 | 96.8% |
| 출처 고르기 | 121.62 → 159.13 | 4 → 11 | 14,629 → 3,121 | 5,539,309 → 979,699 | 82.3% |

재호출:

| 경로 | 시간 ms 전 → 후 | 쿼리 전 → 후 | 반환 행 전 → 후 | 반환 JSON 바이트 전 → 후 | 바이트 감소 |
|---|---:|---:|---:|---:|---:|
| 범위 수량 | 161.76 → 293.29 | 6 → 10 | 14,555 → 3,122 | 5,517,029 → 976,234 | 82.3% |
| 문항 추가 | 139.22 → 151.01 | 7 → 10 | 15,975 → 2,213 | 6,239,003 → 702,877 | 88.7% |
| 문항 교체 | 132.47 → 81.02 | 8 → 7 | 12,565 → 471 | 4,761,740 → 153,003 | 96.8% |
| 출처 고르기 | 121.05 → 0.02 | 4 → 0 | 14,629 → 0 | 5,539,309 → 0 | 100.0% |

원본: [변경 전](builder-speed-before.json), [변경 후](builder-speed-after.json).
대역의 실행 시간을 실제 PostgreSQL의 성능으로 해석하지 않는다.

## 5. 결과 동일성과 시험

- 고정 스냅샷 11개를 변경 전 읽기로 재실행해 모두 통과했다. 변경 후도 같은 스냅샷을 통과했다.
- 두 측정 엔진 각각 첫 순회 4개·재호출 4개의 **전체 응답 SHA-256이 변경 전/후 일치**한다.
  객체 키 순서만 정규화하며 배열 순서·문항 ID·revision·수량은 제거하지 않는다.
- 별도 PGlite 시험은 1,728개 형식 증거 조합을 기존 읽기와 직접 대조한다.
  26개 필터/페이지 조합, 전역 bootstrap·출처·자료 계수, 여러 책·자료에 걸친 정체 합집합을 비교한다.
  비공개 풀 강제 요청과 SQL처럼 보이는 검색 문자열도 확인했다.
- 계정별 최근 제외가 공용 캐시를 타지 않음, 은행 쓰기·epoch·실패·TTL 무효화,
  취소된 소비자가 공유 요청을 끊지 않음, 확인 전 목록과 확인 후 선택,
  토글의 중복 요청 제거, 후보 페이지와 본문 500행 상한을 확인했다.

| 검사 | 최종 결과 |
|---|---|
| 관련 API·단위 Vitest (`--configLoader runner --maxWorkers=2`) | 22파일, 304시험 통과 |
| 공통 제작기 별도 config Vitest | 2파일, 50시험 통과 |
| `errorLogRouteCoverage` | 위 304개 중 14시험 통과 |
| `ownerScope` | 위 304개 중 16시험 통과 |
| 변경 전 스냅샷 재현 (`-t preserves`) | 11통과, 성능 관련 4개는 선택에서 제외 |
| 측정 시험 | PGlite 전/후·대역 전/후 4회 모두 통과, 응답 해시 16쌍 일치 |
| `npm run type-check` | 종료 0, 오류 0. 기존 `questionGroupKey` 2건도 이번 환경에서는 재현되지 않음 |
| 변경 TS/TSX 및 기준 코드 ESLint | 26파일, 오류·경고 0 |
| `npm run lint:affordance` | 종료 0 |
| `git diff --check` | 종료 0 |

일반 Vitest config 적재는 공유 `node_modules/.vite-temp` 쓰기가 샌드박스에서 EPERM으로 막혀
`--configLoader runner`로 실제 검사를 수행했다. 테스트 DB는 전역 대역과 로컬 PGlite뿐이다.

측정 재현:

```sh
BUILDER_SPEED_MEASURE=before-pglite BUILDER_SPEED_DB=pglite BUILDER_SPEED_BASELINE=.builder-speed-baseline npx vitest run --configLoader runner src/__tests__/api/builderSpeedMeasure.test.ts --maxWorkers=1
BUILDER_SPEED_MEASURE=after-pglite BUILDER_SPEED_DB=pglite npx vitest run --configLoader runner src/__tests__/api/builderSpeedMeasure.test.ts --maxWorkers=1
```

메모리 대역은 `BUILDER_SPEED_DB=mock`, 출력 이름은 `before` / `after`로 바꾼다.
기준 스냅샷 재현 명령은 기준 폴더 README에 있다. 공통 화면 시험은
`npx vitest run --configLoader runner --config src/components/exam-builder/vitest.config.mts --maxWorkers=2`다.

## 6. 바꾼 파일

제품 서버 코드:

- `src/lib/bankSourceQuestions.ts` — 범위·출처·자료 계수와 공용 캐시.
- `src/lib/unifiedPreview.ts` — 전역 요약 캐시, 필터별 실제 total, DB 대표 ID 쪽 조회.
- `src/lib/problem/questionProjection.ts` — 남은 후보/정확 ID 경로의 제한된 페이지 읽기.
- `src/lib/problem/questionCountSql.ts` — 닫힌 조건 컴파일, 기존 판정 기반 SQL, 집계·후보 쪽 읽기.
- `src/lib/problem/questionCountProjection.ts` — 미판정 ID·최소 본문 판정·최종 합집합 계수, Prisma 대체 경로.
- `src/lib/problem/questionCountBuckets.ts` — 대체 경로와 대역의 합집합 계수.
- `src/lib/bankReadCache.ts`, `src/lib/db.ts` — TTL·동시 요청 합치기·적재 무효화.

제품 화면 코드:

- `src/components/exam-builder/mathSource.ts` — 초기 단원, 컴포넌트 한정 요청 재사용.
- `src/components/exam-builder/MathExamBuilder.tsx` — 토글 사이 계수 캐시 공유.
- `src/components/exam-builder/ExamBuilder.tsx` — 받은 수 재사용과 재시도 세대 구분.

시험·대역:

- `src/__tests__/api/builderSpeedParity.test.ts`, `builderSpeedPgliteParity.test.ts`, `builderSpeedMeasure.test.ts`.
- `src/__tests__/api/__snapshots__/builderSpeedParity.test.ts.snap` — 중단 당시 고정 기준 보존, 내용 갱신 없음.
- `src/__tests__/api/questionBankProjection.test.ts`, `src/__tests__/unit/mathExamBuilderSource.test.ts`.
- `src/__tests__/unit/bankReadCache.test.ts`, `src/components/exam-builder/ExamBuilder.test.tsx`.
- `src/__tests__/helpers/builderSpeedFixture.ts`, `builderSpeedPglite.ts`, `src/mocks/prismaTestDouble.ts`.

그 밖에는 `.builder-speed-baseline/`의 다섯 기준 파일과 README, 네 측정 JSON,
이 보고서 및 [DB 초안](../../../../prisma/drafts/20261018-builder-question-format.md)이 있다.
기존 지시서는 untracked 상태 그대로 보존했다.

## 7. DB 초안과 남은 확인

DB 초안은 **미적용**이다. 형식·규칙 버전·입력 digest와 구버전 writer까지 포함하는 무효화,
로컬 검증·원문 대응 감사·백필 순서만 적었다. `schema.prisma`·마이그레이션·생성 클라이언트는
변경하지 않았다. 공유 DB 읽기/쓰기, `.env` 생성/복사, `prisma generate`, `prisma format`,
외부·유료 호출, 커밋·push도 수행하지 않았다.

운영 데이터의 미판정 비율, DB 실행 계획·부하, DB 네트워크 전송시간은 미확인이다.
공용 캐시는 프로세스 단위이며 다른 프로세스·직접 SQL 적재는 epoch 교체 또는 최대 15초의
수렴 시간이 필요하다. 형식 저장 칸이 승인되기 전에는 본문 판정과 집계 비용이 남는다.
실제 735개 목록의 브라우저 표시 시간·PC/모바일 시각 회귀·실계정 저장/인쇄를 측정하지 않았다.
이번 화면 검증은 기존 스타일을 사용하는 DOM 동작 시험 범위다.

프로젝트 기본 병렬 검토를 위해 Orca 스킬을 읽고 로컬 상태 연결을 시도했지만
`runtime_access_denied (EPERM)`으로 차단됐다. 권한 상승이 금지된 세션이어서
다른 작업트리나 유료 작업자를 시작하지 않고 현재 작업트리에서 완료했다.
