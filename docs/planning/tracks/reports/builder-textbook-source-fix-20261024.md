# 시험지 만들기 · 교과서 출처 읽기 오류 수정

작업일: 2026-10-24 KST. 기준 커밋: `7ee1236037cabb0a8df8410219c18e05c6ba4f79`.
작업 브랜치: `BIGSHOL/builder-textbook-source-20261024`.

## 확인한 오류와 원인의 구분

운영 `error_log`를 읽기 전용으로 조회해 2026-10-24 19:57:29 KST의
`POST /api/studio/problems/sources` 실패 한 건을 확인했다.
응답은 503, 문구는 «출처별 문항 수를 불러오지 못했습니다.», 처리 시간은
**2,211ms**, 배포 커밋은 위 기준 커밋이다. 원본 `detail`은 `null`이다.
요청 본문 길이는 45바이트이며, 출처 선택기의 최초 요청
`{"identity":"question","view":"picker-books"}`와 일치한다.
본문 자체가 기록되지 않았으므로 이 요청 종류의 식별은 호출 흐름과 길이에 따른 추론이다.

동일 코드의 **연결 획득 시간 초과 경로는 실제 DB에서 재현했다**.
Prisma 클라이언트 하나에만 `connection_limit=1`을 주고, 각 트랜잭션 첫 문장으로
`SET TRANSACTION READ ONLY`를 실행했다. 앞선 읽기가
`SELECT pg_sleep(2.4)::text`로 연결을 점유한 동안 `loadQuestionPickerBooks`를 호출했다.

| 설정 | 실제 결과 |
| --- | --- |
| 수정 전: 실행 `timeout: 30000`만 지정 | **2,003ms** 후 `PrismaClientKnownRequestError`, `P2028`, `Unable to start a transaction in the given time.` |
| 수정 후: 연결 획득 `maxWait: 10000` 추가 | **2,582ms** 후 정상 반환, 8과목, `countUnit: question`, 응답 스키마 통과 |

기존 30초 `timeout`은 트랜잭션 실행 제한이고, 연결 획득에는 기본 2초 제한이
따로 적용되고 있었다. 출처 창은 갈래·책 메타데이터·자료 종류 읽기를 함께
시작하고, 학년을 열면 책 메타데이터와 수량도 함께 읽으므로 연결 큐 대기가
짧은 조회 자체를 실패시킬 수 있었다. 운영 실패 시간과 실제 재현 결과는
이 원인에 부합한다. **당시 운영 예외가 소실되어 과거 한 건의 원인을 확정한
것은 아니다.**

## 요청과 데이터 확인

`SourcePicker.tsx`는 `getStudioEndpoints().problems + /sources`로 다음 읽기 전용
POST를 보낸다. 운영은 `/api/studio/problems/sources`, 개발 짝은
`/api/dev/unified/problems/sources`이며, 운영 라우트는 기존 `authorizeStudio`를
먼저 통과한다.

- `picker-groups`: 전역 출처별 보유 문항 수.
- `picker-books`: 최초 과목 이름, 이후 현재 과목과 이미 선택한 다른 과목의 책 메타데이터.
- `picker-book-counts`: 현재 과목과 선택한 책의 보유·출제 가능·자료 종류별 수.
- `picker-kind-counts`: 책을 선택하지 않았을 때 교과서 전체의 자료 종류별 수.
- `DemandMaterialPicker.tsx`의 `materials-page`: 선택한 책·종류의 자료 20행,
  검색·쪽 정보와 선택된 자료의 출제 가능 여부.

실DB 조회는 모두 READ ONLY로 묶었다. 현재 교과서는 **35권 / 8과목**, 교과서
보유 문항은 **12,301**이었다. 첫 갈래·책·자료 종류 응답과 아래 모든 과목의
책 수량·자료 첫 페이지 응답이 기존 Zod 계약을 통과했다. 따라서 현재 자료의
이름·학년·nullable 필드나 수량 응답의 계약 불일치는 발견하지 못했다.

| 과목 | 책 수 | 자료 수 | 첫 페이지 |
| --- | ---: | ---: | ---: |
| 중1 | 7 | 743 | 20 |
| 중2 | 7 | 542 | 20 |
| 공통수학1 | 5 | 164 | 20 |
| 공통수학2 | 4 | 162 | 20 |
| 대수 | 4 | 116 | 20 |
| 미적분1 | 3 | 136 | 20 |
| 확률과 통계 | 3 | 96 | 20 |
| 기하 | 2 | 33 | 20 |

Orca의 기존 로그인된 운영 브라우저에서도 화면 이동 없이 최초 `picker-books`
읽기만 실행했다. **HTTP 200 / 오류 로그 헤더 없음 / 동일한 8과목과 정상 응답**을
확인했다. 이 운영 읽기는 수정 코드 배포 검증이 아니라 기존 세션·운영 요청
경로의 확인이다. 사용자 선택이나 학생·시험지 기록을 쓰지 않았다.

## 변경

- `src/lib/bankSourceQuestions.ts`: 네 `picker-*` 읽기와 `materials-page`에만
  `maxWait: 10000`을 적용했다. 기존 `RepeatableRead`와 실행 제한 30초를 유지한다.
  이 저장소의 다른 서비스가 사용하는 10초 획득 대기와 같은 값이다.
- `src/lib/bankSourceRoute.ts`: 503으로 감싸기 전에 원본 예외 스택, 요청의 보기,
  오류 코드를 기존 `noteErrorLog`에 남긴다. 화면 응답은 기존의 안전한 문구 그대로다.
  기존 기록기의 비밀 값 정리·길이 제한을 통과하며 요청 본문이나 선택 ID를
  추가로 기록하지 않는다. 새 로그 쓰기 경로나 DB 테이블은 만들지 않았다.
- `src/__tests__/api/unifiedBankPickerDemand.test.ts`: 연결 획득 제한을 별도로
  모델링한 큐 회귀와, 내부 예외는 서버 메모에 남고 클라이언트에는 안전한
  503만 전달되는 회귀를 추가했다.
- `src/components/exam-builder/PickerDemand.test.tsx`: 최초 책 읽기 실패 후
  재시도해도 두 과목의 책 ID·자료 종류가 유지되고 그대로 적용되는 회귀를 추가했다.

`SourcePicker.tsx`·`DemandMaterialPicker.tsx`의 동작과 화면을 바꾸지 않았다.
계약, 문항 식별자·수량 계산·선택 범위, 권한, 캐시의 지문 확인과 기존 응답은
유지한다. 부모가 소유한 `ExamBuilder.tsx`, CSS, `types.ts`, `MathExamBuilder.tsx`,
`mathSource.ts`와 정렬 테스트는 수정하지 않았다.

## 회귀와 검증

새 연결 큐 테스트를 `maxWait`가 없는 코드로 실행하면 **예상 200 / 실제 503**으로
실패했다. 수정 코드를 복원한 뒤 통과했다. 큐 테스트는 Prisma의 획득 대기
동작을 모델링하며 실제 DB 재현과 구분한다. 자동 테스트는 기존 인메모리 DB
대역을 사용하고 실DB에 연결하지 않는다.

| 실행 | 결과 |
| --- | --- |
| `vitest run src/__tests__/api/unifiedBankPickerDemand.test.ts` | 15/15 통과 |
| `vitest run --config src/components/exam-builder/vitest.config.mts src/components/exam-builder/PickerDemand.test.tsx` | 10/10 통과 |
| `studioBankReadinessRoutes`, `unifiedBankSource`, `unifiedBankAvailability`, `unifiedBankCurriculum` | 67/67 통과 |
| `bankSource.contract`, `bankSourcePick`, `errorLogRecord`와 위 선택기 API 묶음 재실행 | 56/56 통과 |
| 변경 TS·TSX 4파일 ESLint | 통과 |
| `git diff --check` | 통과 |

독립 검증의 통과 합계는 **133개**다(15 + 10 + 67 + 41, 재실행 중복 제외).

전체 타입 검사는 현재 공유 의존성 환경에서 실패했다. 진단은 270개이며 변경
4파일의 진단은 0개다. 수정 전 기준 파일을 복원해 비교한 진단도 **270개로
완전히 동일**했다. 대표 원인은 `n3`·`@comunica/query-sparql` 등 누락,
생성된 Prisma 클라이언트의 온톨로지 모델 누락과 Playwright 타입 경로 충돌이다.
공유 `node_modules`를 설치·생성·변경하지 않았다.

확대 실행한 `errorLogRouteCoverage.test.ts`는 14개 중 12개 통과, 2개 실패했다.
기존 온톨로지 라우트 7개의 로그 wrapper 누락과 모듈 로딩의 `n3` 누락이다.
이 작업의 출처 라우트는 기존 wrapper를 유지하며, 별도 예외 보존 회귀는 통과했다.

## 범위와 남은 확인

- 실제 DB와 운영 세션은 읽기만 했다. DB·스키마·환경 파일 변경, 생성, push,
  배포는 하지 않았다. 로컬 `node_modules`는 허용된 기존 공유 디렉터리에 링크했다.
- 실DB 연결 큐 실험의 클라이언트 옵션은 해당 일회성 프로세스 안에서만 바꿨다.
  전역 풀이나 서비스의 연결 수를 바꾸지 않았다.
- 실제 화면의 PC·모바일 전체 시각 QA와 배포 후 운영 재현은 이번 검증에 포함하지
  않았다. 화면/CSS 변경은 없다.
- 10초 이상 연결이 고갈되거나 조회 자체가 실패하면 기존 503은 유지된다.
  이후에는 요청 종류·오류 코드·실제 예외가 기존 운영 로그에 남는다.
- 로컬 Orca preview와 현재 rollout의 실행 모델은 `gpt-6.1-sol`, effort는 `xhigh`다.
  로컬 Codex 설정의 `service_tier = "default"`로 Fast OFF를 확인했고 별도 모델
  턴이나 설정 변경은 하지 않았다.
