# 브라우저 전수 점검 병목 개선 — Codex 수행 기록

2026-10-20. 작업·측정 기준 소스 `560c6a0fa0d0fcb7908e0628b86bb62e6395c505`, 최종 바탕 `8569dbeb7a754136bec8f61d2fbb60b1358fb7f0`, 작업 브랜치 `perf/browser-sweep-20261020`.
브리프: [brief-browser-sweep-perf-codex.md](../brief-browser-sweep-perf-codex.md).

## 측정 경계와 보존 조건

공유 DB는 PostgreSQL `REPEATABLE READ` + `READ ONLY` 거래에서 읽었다. 학생 SRS 학습 동작을 실행하지 않았다. DB·스키마 변경, 스테이지, 커밋, 푸시, 운영 배포는 하지 않았다. 이 작업 공간의 `node_modules`는 원래 심볼릭 링크를 유지했다.

[통합 측정 스크립트](../../../../scripts/qa/measure-sweep-20261020.ts)는 기준 커밋의 reader를 Git에서 읽어 ignored `.qa-artifacts/browser-sweep-baseline/`에 준비한다. 앱 DB 접근을 같은 읽기 전용 거래로 보내고, 같은 시각·같은 데이터에서 변경 전후 응답 전체를 메모리 안에서 비교한다. 출력에는 시간·크기·호출 수·일치 여부만 남긴다. 비밀값·개인정보·학생 기록·답안은 출력하지 않는다. 크기 계측과 응답 비교는 reader 타이머를 멈춘 다음 수행한다. 2회차는 후→전 순서로 실행해 항상 새 코드가 워밍업 이득을 받지 않게 했다.

아래 DB 수치는 인증·HTTP·서버리스 시작·Next 컴파일·모듈 최초 적재·브라우저 렌더를 제외한 **이 컴퓨터의 서버 reader 실측**이다. 브리프의 운영 Resource Timing과 직접 같은 수치로 비교하지 않는다. 한 거래의 연결 하나에서 조회하므로 기존 오늘의 개념의 다수 병렬 요청도 연결에서 직렬 실행된다. 운영 풀에서는 겹칠 수 있어 아래 89.9%를 운영 HTTP 개선율로 해석하면 안 된다. `calls`는 Prisma/SQL 어댑터 호출 수이며 Prisma가 내부에서 실행한 SQL statement 수가 아니다. 결과 크기는 조회 반환값의 UTF-8 JSON 크기로, PostgreSQL 전송 프로토콜 바이트 수가 아니다.

## 1. 교재 제작 — quick-create

문항 본문 전량 전송·JS 중복 제거를 SQL 대표행 선택과 집계로 바꿨다. 현재 버전의 non-NULL `actual_format`을 신뢰하고, NULL·구버전 대표행만 기존 분류기로 읽는다. digest는 기존 DB 무효화 트리거·별도 감사의 소유로 유지하며 읽기마다 재계산하거나 저장하지 않는다. SQL trim에는 JavaScript trim의 문자 집합을 명시했고, 본문 전체를 C collation으로 비교해 해시 충돌로 다른 본문을 합치지 않는다. 단원·난도 묶음의 첫 등장 문항만 `written`을 결정한다.

수정 파일은 [quickCreate.ts](../../../../src/lib/textbook/server/quickCreate.ts), [availability.ts](../../../../src/lib/textbook/server/quickCreate/availability.ts)다. 제작 writer는 변경하지 않았다. 실제 DB 초3~초6·중1~중3 × 학기 1/2의 14개 범위에서 전체 응답 바이트가 같았다. 상세 시험·범위별 수치는 [분담 기록](browser-sweep-parts/quick-create.md)에 있다.

통합 후 재측정, 중2 1학기:

| 회차 | 전 ms | 후 ms | 전체 응답 일치 |
|---|---:|---:|---|
| 1 | 616.857 | 272.711 | 일치 |
| 2 | 552.531 | 268.201 | 일치 |
| 3 | 613.269 | 263.503 | 일치 |
| 중앙값 | **613.269** | **268.201** | **3/3** |

중앙값 56.3% 감소. 문항 조회 결과는 매번 **14,122행 / 5,616,199B → 99행 / 11,217B**였다. 응답은 전후 11,275B이며 현재 DB에서 fallback은 0개였다. NULL·구버전·트리거 무효화 fallback은 로컬 PGlite에서 검증했다. 기존 무정렬 SELECT의 스캔 순서가 대표행을 정하던 한계는 남는다. 임의 ID 정렬로 의미를 바꾸지 않았다.

## 2. 교재 목록 — books

기존 조회는 한 번의 SQL로 이 계정에 보이는 책을 1,000개까지 읽고, 다른 사람의 초안 ID를 숨긴다. 실제 측정에서는 반환값이 3,112B였고 reader는 약 26ms였다. 본문·대용량 행·반복 DB 호출을 발견하지 못해 조회 구현을 유지했다. **개선 완료로 판정하지 않는다.** 브리프의 운영 1,325ms는 이 측정 경계에서 재현되지 않아 인증·네트워크·서버 시작 비용을 구분하는 배포 환경 재측정이 남는다.

| 회차 | 기존 ms | 동일 구현 재측정 ms | 전체 응답 일치 |
|---|---:|---:|---|
| 1 | 26.1 | 26.8 | 일치 |
| 2 | 25.1 | 25.9 | 일치 |
| 3 | 57.5 | 28.1 | 일치 |

오래된 목록을 캐시하거나 지점·계정 상태 재확인을 생략하지 않았다. 수치 차이를 성능 개선으로 주장하지 않는다.

## 3. 오늘의 기억 · SRS — course

의심했던 SRS 기록 전체 JSON보다 **학생 명단의 불필요한 필드와 관계 재조회**가 주된 비용이었다. 원래 명단 조회는 학생 보고서 본문, 반 설정, 재원 관계별 보고서와 반 전체까지 반환했다. 진단 시 명단은 558,072B, SRS 기록은 14,790B였다.

[classAccess.ts](../../../../src/lib/classAccess.ts)에 `loadOperationalRosterSummary`를 추가했다. 기존 명단과 같은 where 생성기를 사용해 퇴원·연계 테스트 학생·재원 기간·휴원 포함 규칙을 공유한다. 화면에 필요한 학생 식별·학년·계정 정보만 읽고 이미 범위 확인 후 읽은 반 정보를 재사용한다. 여러 반에 속한 연계 학생은 기존과 같은 순서로 한 반당 한 행을 유지한다. [courseServer.ts](../../../../src/lib/math-srs/courseServer.ts)는 기존 응답의 반 필드를 그대로 조립한다.

SRS 저장 payload의 전체 검증·오류 처리·기본 상태와 모든 학습 규칙은 유지했다. 다른 학습 영역을 잘라 읽거나 상태 캐시를 추가하지 않았다. 작업실과 `/admin/math-srs`가 사용하는 같은 dashboard reader에 적용된다.

| 회차 | 전 ms | 후 ms | 전체 응답 일치 |
|---|---:|---:|---|
| 1 | 311.1 | 209.0 | 일치 |
| 2 | 288.4 | 216.5 | 일치 |
| 3 | 263.5 | 203.1 | 일치 |
| 중앙값 | **288.4** | **209.0** | **3/3** |

중앙값 27.5% 감소. 전체 DB 반환값 **580,454B → 100,083B(82.8% 감소)**, 학생 명단만 보면 **558,072B → 76,276B**다. 호출 수는 5회 그대로지만 중첩된 반 관계 조회와 반환 필드를 줄였다. 운영 HTTP 재측정은 남는다.

## 4. 연산대장 — 브라우저 프로필

수정 전 Playwright + Next 로컬 dev의 익명 fixture에서 CDP CPU 프로필과 LongTask를 3회 수집했다. 카드 24개를 그리는 계산보다 **불필요한 엔진 초기화와 737개 유형 전체 예제 생성**이 주된 원인이었다. `GradeArithmeticWorkbench`·`ArithmeticGradeSelect`·`ArithmeticWorkflow → arithmeticOutput`의 import가 registry를 초기화했고, 분수 `threeTermDomain → threeTermAllowed → isProper`, 대수 `tuples`가 후보 공간을 전개했다.

목록 API가 이미 보내던 `types`를 재사용하고, 생성·저장본 검증·문항 투영은 사용할 때 import한다. 투영은 예제를 다시 생성하지 않고 원래 registry의 유형 메타데이터만 읽는다. 회차 복원 함수는 가벼운 파일로 분리하되 기존 재수출을 유지한다. CSS·문구·생성/채점·저장 계약은 바꾸지 않았다.

1685×1000 Chromium, CPU 배율 1, 매번 새 context, 한 번 예열 후 메뉴 열기를 측정했다. fixture는 실제 API·외부 HTTP를 차단하고 메모리에서 같은 전체 카탈로그와 생성 결과를 제공한다. 공유 환경 파일과 운영 DB는 사용하지 않았다.

| 회차 | 전 LongTask 최대 ms | 후 LongTask 최대 ms | 전 클릭→준비 ms | 후 클릭→준비 ms |
|---|---:|---:|---:|---:|
| 1 | 205 | 0 | 423.6 | 786.8 |
| 2 | 189 | 0 | 398.3 | 365.3 |
| 3 | 172 | 0 | 373.5 | 373.4 |

50ms 이상 LongTask는 **매회 1건 → 0건**이었다. `threeTermAllowed`의 inclusive 샘플 시간은 전 29.73 / 24.37 / 28.10ms에서 후 모두 0, `listArithmeticV2Types`는 전 35.26 / 34.56 / 29.20ms에서 후 모두 0이었다. 첫 after의 준비 시간 786.8ms도 보존했다. dev 청크·비동기 대기·polling을 포함한 준비 시간은 일괄 개선되지 않았고, 컴파일/캐시가 차이에 기여한 양을 분리 측정하지 않았다. 운영 981ms나 HTTP가 같은 비율로 줄었다고 주장하지 않는다.

출력까지 13단계의 문구·문항·답안·폼 값·정규화 DOM이 같았다. 캡처 12개 중 11개는 바이트 동일이고, 2페이지의 모서리 18픽셀만 채널 값 1/255 차이였다. 속성 순서·React 불투명 ID·빈 style만 DOM에서 정규화하며, 픽셀 비교는 같은 치수·strict DOM 일치와 최대 100픽셀/채널 1 차이만 허용한다. 출력 캡처도 동일했다. 관련 79개 시험은 전체 737개 유형의 저장 투영, 첫 생성·선택 재생성·초안 보존·수동 저장·revision 충돌·복원·writer/preview gate와 출력 중 `problemAt` 미호출을 포함한다.

통합 검사에서 추가로 드러난 `ArithmeticBasketSelection`의 초기 렌더 가정도 수정했다. 미리보기 카탈로그가 도착한 뒤 기존 담기·선택 삭제·수량/회차/생성 초안 보존 단언을 실행하도록 기다리며, 검증할 동작과 기대값은 유지한다.

[분담 기록](browser-sweep-parts/arithmetic.md)에 원인 함수와 3회 CPU 표, 변경 파일, `/tmp/arithmetic-sweep-20261020-final/`의 trace·캡처 지문, 재현 명령을 남겼다. 초기 메뉴 진입을 고친 것이며 첫 생성·저장본 복원의 CPU 지연은 별도 측정하지 않았다. 전체 작업실 셸·모바일·실물 인쇄 검수를 새로 수행한 결과도 아니다.

서버 측 catalog·labels는 별도로 **변경하지 않은 구현**을 읽기 전용 측정했다. 목록은 전체 737유형, labels는 전체 학년 첫 페이지의 24유형이다. 선택 계정의 해당 기간 자료·복사 이력은 빈 결과였으므로, 자료가 많은 계정의 labels 비용을 대표하지 않는다.

| 읽기 | 1회 기존 / 재측정 ms | 2회 | 3회 | 판정 |
|---|---:|---:|---:|---|
| catalog 함수 | 8.8 / 7.9 | 10.4 / 8.8 | 6.5 / 6.5 | 코드 유지, 개선율 주장 안 함 |
| labels reader | 84.6 / 64.0 | 66.7 / 64.1 | 63.2 / 62.4 | 코드 유지, 빈 이력 범위만 확인 |

이 프로세스에서 관련 서버 모듈 import는 별도 293.8ms였다. 함수 reader 타이머 밖의 모듈 초기화와 브리프의 860ms/425ms HTTP 시간을 섞지 않는다.

## 5. 수업 · 학생 관리 — 요청 폭포

학생·진도·수업 계획 세 요청은 원래 병렬이었다. 그 앞의 teaching 인증·단원 → 반 목록이라는 대기를 줄였다. 기존 인증·메뉴 관문을 지난 `/api/studio/teaching?classes=1`이 단원과 반 첫 페이지를 함께 시작하고, `ClassManage`가 받은 목록을 재사용한다. 반 목록 구현을 [listClasses.ts](../../../../src/lib/class/listClasses.ts)로 추출해 기존 `/api/classes`와 같은 범위·정렬·담당 표시·페이지네이션을 사용한다.

100개 초과 목록은 2페이지부터 기존 API로 이어 읽는다. 익명은 자료를 읽기 전에 거절하고, 초기 목록 실패·재시도·abort/stale 보호·계정 교체·같은 계정의 입력 보존을 유지한다. `classes=1` 없는 기존 응답은 그대로다. 처음부터 수업 진행 탭으로 들어오거나 focus 검사하는 경우에는 기존 가벼운 요청을 유지한다.

브라우저 수치는 실제 컴포넌트에 **고정 지연을 준 fixture**다. 운영 DB 지연이 아니다. 1685×1000 Chromium, teaching 810ms·classes 1000ms·students 350ms·progress 300ms·plan 400ms를 적용했고 합친 응답은 독립 작업의 최댓값 1000ms로 모델링했다. 서버 API 시험은 두 조회가 실제로 서로 기다리지 않고 시작하는지도 양방향으로 잠근다.

| 회차 | 전 화면 준비 ms | 후 화면 준비 ms | API 요청 | 최종 DOM·픽셀 |
|---|---:|---:|---|---|
| 1 | 2645.8 | 1830.0 | 5 → 4 | 일치 |
| 2 | 2626.2 | 1794.0 | 5 → 4 | 일치 |
| 3 | 2645.1 | 1804.4 | 5 → 4 | 일치 |
| 중앙값 | **2645.1** | **1804.4** | | **31.8% 감소** |

공유 DB도 같은 READ ONLY 거래에서 세 쌍을 별도 확인했다. 기존 단원 조회 뒤 첫 반 페이지를 읽는 구성과 합친 bootstrap의 전체 결과가 같았다. 두 쪽의 DB 호출은 6회, 반환값은 170,833B로 같다.

| 회차 | 이전 순차 구성 ms | 합친 서버 구성 ms | 전체 데이터 일치 |
|---|---:|---:|---|
| 1 | 288.7 | 260.9 | 일치 |
| 2 | 216.0 | 244.9 | 일치 |
| 3 | 204.5 | 213.1 | 일치 |

한 DB 연결에서는 이 독립 조회도 직렬 실행되므로 서버 reader 자체의 시간 개선은 확인되지 않았다. 이번 개선은 브라우저 요청 한 단계 제거이며 SQL 작업량 감소로 설명하지 않는다. 상세 의존성, 동적 컴포넌트 로딩, 추가 페이지 요청은 남는다. [분담 기록과 재현 명령](browser-sweep-parts/teaching.md)에 fixture의 범위·전체 타이밍·159개 관련 시험을 기록했다. 전체 작업실의 폭별 검수와 운영 HTTP 재측정은 이번 증거에 포함하지 않는다.

## 6. 오늘의 개념 — concept

반마다 최근 진도를 따로 조회하던 부분을 [latestClassProgress.ts](../../../../src/lib/concept/latestClassProgress.ts)의 한 SQL로 묶었다. 반 ID마다 기존과 같은 `recorded_at DESC, created_at DESC LIMIT 1`을 LATERAL로 적용한다. 학생 개별 진도와 retired 행을 제외하고 진도가 없는 반은 이전처럼 최신 진도 배열에 넣지 않는다. 날짜 형식·반 순서·학생 등록순·강의·시청 기록 범위·관리자 편집 표시는 유지한다.

[adminService.ts](../../../../src/lib/concept/adminService.ts)도 같은 가벼운 명단 조회를 사용한다. 실제 PostgreSQL 엔진인 PGlite 시험에서 반별 이전 쿼리와 전체 배열을 비교했다. 같은 날짜의 createdAt 순서, 퇴역·개별 진도 제외, 빈 반과 범위 밖 반을 확인했다.

| 회차 | 전 ms | 후 ms | 전체 응답 일치 |
|---|---:|---:|---|
| 1 | 2887.4 | 287.4 | 일치 |
| 2 | 2904.3 | 302.9 | 일치 |
| 3 | 2953.4 | 292.1 | 일치 |
| 중앙값 | **2904.3** | **292.1** | **3/3** |

DB 어댑터 호출 **101 → 7회**, 반환값 **712,549B → 229,644B**. 위 측정 경계에서 중앙값 89.9% 감소이며 운영 HTTP 개선율을 뜻하지 않는다.

## 재현 명령과 검증

```sh
npx tsx --conditions=react-server \
  --env-file=/Users/pss/Desktop/creative/today_/.env \
  scripts/qa/measure-sweep-20261020.ts --runs=3 \
  --output=.qa-artifacts/browser-sweep-measurements.json
```

`--only=books,course,concept`, `--only=quick-create,arithmetic-reads`, `--only=teaching-reads`, `--detail=1`로 나누거나 호출별 집계만 확인할 수 있다. 이번 표의 원시 집계는 ignored `.qa-artifacts/browser-sweep-final-root.json`, `.qa-artifacts/browser-sweep-final-extra.json`, `.qa-artifacts/browser-sweep-final-teaching.json`에 있다. teaching 서버 구성 비교는 이전 그대로 추출한 반 목록 helper와 단원 조회를 순차/병렬로 조합한다. 스크립트는 학생 학습 action이나 인증 HTTP 요청을 실행하지 않는다.

통합 상태 최종 검사:

| 검사 | 결과 |
|---|---|
| 최신 원격 반영 후 관련 Vitest, 46파일 | **697 통과 / 2 조건부 건너뜀 / 실패 0** |
| `npm run type-check` | 통과 |
| 변경 TS·TSX·JS·MJS 45파일 ESLint | 오류·경고 0 |
| `npm run lint:affordance` | 통과 |
| `git diff --check` | 통과 |
| 기본 통합 측정 명령 전체 재실행 | **7개 비교군 × 3회 = 21쌍 전체 응답 일치**, READ ONLY |
| Git index · `node_modules` | 스테이지 0, 링크 추적 없음, 원래 심볼릭 링크 유지 |

건너뛴 2개는 기존 `textbookQuickCreateIntegration`의 `TEXTBOOK_PDF_TEST=1` 조건부 실제 PDF 발행 시험이다. 출력 화면·문항 투영의 비교와 구분한다. 기본 설정의 45파일은 681개 통과했으며, 기본 include 밖에 있는 `src/components/exam-builder/ExamBuilder.h2.test.tsx`는 같은 설정의 include만 확장해 별도 실행하여 16개 통과했다. 파일 목록은 ignored `.qa-artifacts/browser-sweep-test-files-main-sync.txt`, 최신 로그는 `browser-sweep-main-sync-tests.log`, `browser-sweep-main-sync-h2-tests.log`, `browser-sweep-main-sync-typecheck.log`에 있다. 변경 파일 ESLint 로그는 `browser-sweep-final-eslint.log`이며 BasketSelection 추가 파일도 별도 검사에서 오류·경고 0개였다. 사용한 H2 시험 설정은 실행 후 `.qa-artifacts/vitest-browser-sweep.config.txt`로 보존했다.

마지막 통합 스크립트 실행 결과는 `.qa-artifacts/browser-sweep-integrated-measurements.json`에 추가 보존했다. 위 표는 앞에서 경계를 고정해 측정한 세 쌍을 그대로 기록한 것이며, 통합 재실행도 모든 비교가 일치했다. 브라우저 원본 증거의 사본은 ignored `.qa-artifacts/arithmetic-sweep-20261020/`, `.qa-artifacts/teaching-{before,after}-20261020.json`에 보존했다.

## 병렬 작업과 인계 상태

저장소 지침에 따라 Orca Codex 작업 공간 세 개에 교재 집계, 연산 프로필, 수업 요청 폭포를 나누었다. 기준 HEAD가 같은지와 현재 파일에 다른 수정이 없는지 확인하고 변경 파일을 이 작업 공간으로 복사해 통합했다. `커밋 금지`가 우선이므로 이 성능 변경을 main에 커밋·병합하거나 작업 공간을 제거하지 않는다. 미커밋 작업 공간의 파일·브랜치를 보존하고 완료한 작업자 터미널만 종료했다.

최종 확인 중 `origin/main`에 10개 커밋이 추가된 것을 발견해 fetch 후 변경 파일을 대조했다. 성능 변경 파일과 겹침이 없고 DB·SRS 저장 계약 변경도 없어, 기존 로컬 diff를 별도 보존하고 **새 커밋 없이 fast-forward**로 `8569dbeb7`을 바탕에 반영했다. 기존 빌더·개념 백지·빈 시험지 옆 카드 변경을 그대로 보존했다. 그 뒤 인접 UI 시험까지 확장한 위 697개 시험과 전체 타입 검사·affordance·diff 검사를 다시 통과했다. 본문의 성능·브라우저 전후 수치는 명시한 `560c6a0fa` 기준의 증거이며, 원격에서 추가된 화면을 새로 브라우저 전수 검수했다고 주장하지 않는다.

세 분담 작업 모두 성공으로 정리했고 작업자 터미널 3개를 해제했다. fixture 서버 포트 3184·3185도 종료를 확인했다. [orca-cli 스킬](/Users/pss/.agents/skills/orca-cli/SKILL.md), [Orca orchestration 스킬](/Users/pss/.agents/skills/orchestration/SKILL.md)을 사용했다.
