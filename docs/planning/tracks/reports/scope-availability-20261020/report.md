# 출처별 학년·단원 선택 가능 여부 — 2026-10-20

## 커밋 · 바꾼 파일

작업 가지: `chrismathone/scope-availability`. 푸시하지 않았다.

| 커밋 | 내용 · 파일 |
| --- | --- |
| `d1f322c54` | 지시서 원문을 `docs/planning/tracks/brief-scope-availability-codex.md`에 보존 |
| `4e8948734` | 서버·계약: `unifiedBankBootstrap.contract.ts`, `unifiedPreview.ts`, `bankSourceQuestions.ts`, studio/dev `problems/route.ts`, `unifiedBankCurriculum.test.ts` |
| `66c090a31` | 서버 모킹 시험의 한글 문자열 수정 및 대조 검증 |
| `317bbd30f` | 인증된 studio 라우트에서 교과서만 + 초1=0, 초3=1을 확인하는 시험 |
| `531c352f1` | `mathSource.ts`, `types.ts`, `scopeAvailability.ts`, `ScopeSequencePicker.tsx`, `ExamBuilder.tsx`, `ExamBuilder.demand.test.tsx`: 필터 전달·단추 비활성·선택 보존 |
| `4fcb8d415` | `scripts/qa/measure-scope-availability.mjs`, 1366px Chromium 캡처와 자동 검증 JSON |
| `76c9a65ee` | 자료를 많이 고른 길잡이 요청을 읽기용 POST로 전송하고 회귀 시험 추가 |

서버 하위 작업은 Orca의 `scope-availability-server` 한 세션에 한정했다. 원래 커밋 `25b0a11a5`, `50709c0b8`을 각각 이 가지의 `4e8948734`, `66c090a31`로 cherry-pick했다. 완료 후 작업자 터미널을 종료했다. main에는 아직 합치지 않았으므로 작업트리와 가지는 보존했다. 새 작업자나 작업트리는 추가하지 않는다.

## 서버 판정이 scope-counts와 같은 자리

- `src/lib/unifiedPreview.ts`의 `loadFilteredQuestionScopeCounts`: `resolveUnifiedBankQuery(params, context)` → `{ AND: [problemVisibleWhere(), ...resolved.selection] }` → `loadQuestionCounts(..., resolved.format, ..., false)`.
- 길잡이 `loadUnifiedBankCurriculum`과 차시 `src/lib/bankSourceQuestions.ts`의 `loadQuestionScopeCounts`가 모두 이 함수를 호출한다. 별도의 출제 자격 규칙을 화면이나 길잡이에 만들지 않았다.
- `src/lib/problem/questionCountProjection.ts`와 `questionCountSql.ts`의 기존 출제 자격·실제 형식 판정(`problemEligibleWhere`)을 그대로 쓴다. 출처·책·자료 종류·자료·소유 범위·최근 출제 조건도 같은 resolver를 지난다.
- 단위별 SQL 집계 한 번을 차시 메타데이터에 연결해 학년/단원 합으로 접는다. 학년·단원마다 문제 수 쿼리를 반복하지 않는다. 라벨·조건 해석·집계는 같은 RepeatableRead 트랜잭션이다. 계정별 결과를 공유하는 전역 캐시는 추가하지 않았다.
- studio GET/읽기용 POST는 기존 `authorizeStudio`와 `bankQueryContext(access.user.id)`를 유지한다. dev는 기존 개발 전용 게이트와 dev context를 유지한다.

## 계약 호환 — 옛/새 조합

| 화면 / 서버 | 동작 |
| --- | --- |
| 옛 화면 / 새 서버 | `availability=1`이 없으면 기존의 엄격한 응답 모양 그대로. 새 필드를 보내지 않는다. |
| 새 화면 / 새 서버 | 학년·단원 요청에 같은 출처 필터와 `availability=1`. 선택 필드 `gradeCounts`/`chapterCounts`를 읽는다. |
| 새 화면 / 옛 서버 | 새 조건이 HTTP 400이면 기존 메타데이터 요청으로 재시도. 수가 빠졌으면 미확인으로 표시한다. |

확인된 0은 **「 · 출제 가능 문항 없음」**, 누락된 수는 **「 · 출제 가능 수 확인 필요」**로 표시하고 둘 다 기존 availability 규칙대로 비활성화한다. 로딩 중에는 기존 대기 표시를 유지한다. 요청 실패는 기존 오류·재시도를 유지하며, 0으로 바꾸지 않는다. 문자열 기반의 기존 로컬/다른 과목 navigation 계약도 계속 받는다.

출처나 책이 바뀌면 source 객체와 경로 응답이 함께 갱신된다. 이전 source의 늦은 응답은 AbortController와 source identity 검사로 버린다. 선택한 차시가 0이 되어도 체크·선택 행·요청 의도를 보존하고, 「출제 가능 문항 없음」과 직접 빼기 단추를 남긴다. 새로 0인 차시를 고르는 것은 기존대로 막는다. 비활성 단추의 기존 CSS(`cursor: not-allowed`)를 그대로 쓴다. 새 문구나 시각 디자인을 추가하지 않았다.

## 시험 결과 · 캡처

- 화면 TDD: 새 응답 필드를 받기 전 기존 계약에서 회귀 시험 실패를 확인했다. 이후 보존 시험이 0인 선택 차시를 숨기던 기존 필터를 찾아 수정했다.
- 서버 대조 RED: 기존 구현으로 6개 opt-in 시험 실패. 실행 순서상 구현 후 과거 코드와 대조한 것이므로 구현 전 RED라고 주장하지 않는다.
- 서버 하위 작업 GREEN: `unifiedBankCurriculum.test.ts`, `unifiedBankPickerDemand.test.ts`, `unifiedBankFilters.test.ts` 총 **84/84** 통과.
- 통합 후 서버 GREEN: `unifiedBankCurriculum.test.ts` **32/32** 통과. 초1/초3 인증 라우트 사례, 기존/새 계약, 동일 필터 집계 일치, 계정 없는 최근 출제 거부, 기존 접근 게이트 포함.
- 화면·소스 GREEN: `ExamBuilder.demand.test.tsx`, `ExamBuilder.h2.test.tsx`, `ExamBuilder.test.tsx`, `mathExamBuilderSource.test.ts` **104/104** 통과. 출처/책 변경, 옛 서버 폴백, 미확인 수, 선택 차시 보존 포함.
- 추가 자료 필터 처리 후 `ExamBuilder.demand.test.tsx` **16/16** 통과. 위 104개 중 길잡이 15개를 다시 확인하고 대용량 자료 선택 시험 1개를 더한 실행이다.
- `npm run lint:affordance` 통과. 커밋 훅의 ESLint·Prettier·수정 TSX affordance 검사 통과.
- 실제 Chromium(Edge) 1366×900: [교과서만 학년 목록](1366-textbooks-grades.png). 초1=비활성·초3=활성, 전체로 변경하면 초1 재활성, 비활성 커서 `not-allowed`, 페이지 오류 0건. [자동 검증 기록](browser-checks.json). 캡처를 직접 열어 기존 모양·문구를 확인했다. 실제 컴포넌트와 예시 데이터의 검증이며 실DB의 보유 분포를 뜻하지 않는다.
- Vite 시작 전 3.13GB, 실제 Chromium 시작 직전 3.40GB 확인. Chromium은 검증 직후 종료했다.
- 전체 `npm run type-check` **통과(종료 코드 0)**. 16:08:23 시작 전 남은 메모리 3.807GB와 다른 `tsc --noEmit` 프로세스 0개를 확인했다. 끝에 한 번만 실행했으며 16:12:55에 종료를 확인했다. 중복 실행하지 않았다.

재현: `node scripts/qa/measure-scope-availability.mjs`로 실제 MathExamBuilder의 독립 fixture를 빌드하고 프로세스가 끝난 뒤 `node scripts/qa/measure-scope-availability.mjs --capture`로 캡처한다. 각 단계는 3GB 미만이면 시작 전에 종료한다. 예시 API와 실제 컴포넌트·CSS·Pretendard를 사용하며 실DB·실계정 검증을 대신하지 않는다.

자료를 많이 고른 조건은 길잡이도 URL이 3,000자를 넘으면 기존 읽기용 POST 라우트를 쓴다. 출처/자료 조건을 URL 길이 제한 때문에 잃지 않는다. 관련 회귀 시험도 통과했다.

## 환경 · 메모리 · 못 잰 것

- 실DB 쿼리 시간은 **못 쟀다**. 이 작업트리에는 `.env`가 없고 실DB에 연결하지 않았다. Docker 없이 기존 Prisma test double로 시험했다.
- `npm install`, `prisma generate`는 실행하지 않았다. 이 작업트리의 생성 전 Prisma Client 때문에 `Prisma.sql`이 없던 환경 오류를 확인한 뒤, 기존 폴더를 백업하고 `.prisma/client`만 같은 6.19.3 버전·같은 스키마의 `D:/todays-math/node_modules/.prisma/client`에 정션으로 연결했다. 공유 생성본은 변경하지 않았다.
- 메모리 예외 **1회**: 서버 하위 작업자가 마지막 과거 코드 대조 시험을 2.90GB에서 시작했다. 결과를 보고받은 뒤 추가 실행을 중단시켰고 세션을 종료했다. 이 위반은 준수한 것으로 보고하지 않는다.
- 이후 통합 검증은 명령 자체에 `freeGB < 3`이면 종료하는 조건을 두었다. 기준 미달 시 Vitest/Vite/Chromium을 띄우지 않았으며, Vite 후 2.91GB가 된 캡처도 Chromium 실행 전에 중단했다. 무거운 단계는 한 번에 하나씩 실행했다.
- 최종 캡처·추가 회귀·타입 검사는 앞 단계의 프로세스 종료 후 차례로 실행했고, 사용한 시험·브라우저·타입 검사 프로세스는 모두 종료했다. 새 작업자/작업트리를 더 만들지 말라는 리드의 추가 지시를 준수했다.
