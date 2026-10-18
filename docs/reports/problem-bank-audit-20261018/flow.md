# 수학 문제은행 화면 → API → 출제 흐름 검토

- 기준 소스: `70ed24137711172408134a15fa695183f31fb878`.
- 측정일: 2026-10-18. DB 집계 09:39:29~09:39:30 KST, 지정 파서 사례 재조회 09:42:49 KST. DB는 해당 시점의 상태이며 Git HEAD에 고정된 데이터가 아니다.
- 범위: 탐색·필터·가용량·정답/해설 표시 경로·담기·생성/변형·사람 수정/검수·교과서 지정 슬롯·출력 준비와 실제 출력 행동.
- 산출물: 이 문서와 [flow-coverage.json](flow-coverage.json). 실행 파일·수치 로그는 `.qa-artifacts/problem-bank-flow-20261018/`에만 두었으며 커밋 대상에서 제외했다.
- 제품 코드·공유 DB 수정, 유료 AI 호출, 배포·푸시를 하지 않았다. 추가 worker를 만들지 않았다.

**확정된 운영 데이터 표시 오류 2문항, 직접 재현한 흐름 위험 6항목을 기록했다.** 우선순위는 P1 4항목·P2 3항목이며, 이번 범위에서 P0 보안 침해는 확인하지 못했다. 기존 관련 검사 42파일·732건은 통과했지만 아래 전이 공백을 모두 다루지는 않는다. “검토 완료”를 전 문항의 수학적 정답 보장으로 해석해서는 안 된다.

## 1. 검사 범위와 증거의 종류

| 종류                  | 이번에 한 일                                                                            | 수량 / 경계                                                                         |
| --------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 전수 기계 집계        | 저장된 풀·승인·직접 사용·정답 센티널·빈 칸 조건, 출처별 수량                            | 전체 117,828행, 공용 117,828행                                                      |
| 지정 슬롯 전수 집계   | 교과서 원문과 지정 externalId·부모·차시·출제 자격 대응                                  | 원문 12,301행·지정 자식 4,358행                                                     |
| 현재 코드의 경로 맵   | 운영 핵심 27 route 파일·34 method 행동, 인접 저장/설정 6파일·14행동, dev 짝 6파일·8행동 | 총 39 route 파일·56 method 행동. `flow-coverage.json`에 메서드별 목록               |
| 기존 자동 검사        | 관련 스위트만 한 번씩, `maxWorkers=2`                                                   | 36파일·612건 + 추가 파서/구성 6파일·120건 = 42파일·732건 통과                       |
| 직접 재현             | 인메모리 Prisma·컴포넌트·내보내기 대역에서 상태 전이 관측                               | 서로 다른 관측 10건. 결함이 관측됨을 단언하는 probe이므로 통과가 수정을 뜻하지 않음 |
| 실제 문항 특정 재조회 | root가 원문 재열람 후 확정해 전달한 2문항을 현행 파서에 투입                            | 2건 모두 재현. 원문을 기록하지 않고 ID·길이·해시·라벨 수만 저장                     |
| 표본 육안·실브라우저  | 이 분담에서는 실시하지 않음                                                             | worker 자체 육안 0건. root의 2건 재열람 판단과 구분                                 |

공유 DB는 Prisma interactive transaction 안에서 **첫 질의로 `SET TRANSACTION READ ONLY`**를 실행했다. 이어 `SHOW transaction_read_only = on`을 확인하고 `RepeatableRead`로 집계했다. 수치·ID·SHA-256만 저장했고 문항·교재 원문은 파일에 쓰지 않았다. 앱 서버나 실계정 API는 호출하지 않았다. API 읽기에도 감사 로그 쓰기가 따라올 수 있어, 이번 실DB 검사는 독립 읽기 전용 클라이언트로 수행했다.

`AGENTS.md`, `DESIGN.md`, `docs/design/workspace-ui-rules-20261008.md`를 읽었다. Next 코드 검토 전 설치된 Next 16.3.8의 `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, `05-server-and-client-components.md` 및 authentication의 인가/DAL 부분을 확인했다. `node_modules`만 사용자가 허용한 기존 설치 경로에 symlink했다. `.env` 값은 출력하지 않았다.

## 2. 현재 진입과 화면/API 맵

현재 `/`의 bank 메뉴는 `UnifiedWorkspace → MathExamBuilder → ExamBuilder → WorksheetEditor`다(`src/components/unified/UnifiedWorkspace.tsx:1723`). `/problems`는 여전히 `ProblemBank`를 렌더한다(`src/app/(main)/problems/page.tsx:5`). `BankView`는 `LegacyUnifiedWorkspace`에서 사용되며 현재 루트 bank 화면과 구분했다(`src/components/unified/LegacyUnifiedWorkspace.tsx:668`). 이 차이를 구분하지 않고 옛 BankView 검사를 현재 화면의 전 과정 검증으로 셈하지 않았다.

표의 **통과**는 해당 자동 검사/소스 계약의 범위다. 실계정·실HTTP 전체 인증이 통과했다는 뜻은 아니다.

| 화면 행동                              | API / 서버 연결                                                                                      | 확인 결과와 근거                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 기존 은행 목록·범위·검색·쪽 이동       | `GET /api/problems`                                                                                  | 공용 풀·단원 orderIndex 범위·검색·형식·그림/해설/정답 조건. `src/app/api/problems/route.ts:110`, `problem.test`, `problemFormatFilter.test`, `ProblemBank.test` 통과                                                                                                                                                              |
| 기존 은행 등록                         | `POST /api/problems`                                                                                 | strict 입력, manual/past_exam 제한, 형식 파생, pending 시작. `src/app/api/problems/route.ts:42`, `problem.test` 통과. 공백 정답은 F07                                                                                                                                                                                             |
| 상세·사람 수정·삭제                    | `GET/PATCH/DELETE /api/problems/{id}`                                                                | 공용 접근·사용 중 삭제 409/FK 보호 확인. 수정 revision·검수/슬롯·형식 갱신은 F03/F05/F06. `src/app/api/problems/[id]/route.ts:63`                                                                                                                                                                                                 |
| 승인·반려                              | `PATCH /api/problems/{id}/review-status`                                                             | 전용 strict 경로, status만 변경. 잠금은 별도이므로 approved라도 locked면 출제 불가. `src/app/api/problems/[id]/review-status/route.ts:42`, `BankView.filters.test` 통과. 부모 반려 전이는 F03                                                                                                                                     |
| 검수 큐·판정·신고                      | `GET /api/review/queue`, `POST /api/problems/{id}/review`, `POST /api/problems/{id}/reports`         | 판정/신고 기록, pass만 approved, defect/unsure가 자동 잠금하지 않는 기존 정책 보존. `reviewSubmit.test`, `reviewQueue.test`, `problemReport.test` 통과. defect가 자동 격리되지 않는 것을 별도 결함으로 세지 않음                                                                                                                  |
| 정답·해설 검토 / 정답지 선택           | `MathExamBuilder → ExamAnswerPanel`, `WorksheetPrint → AnswerPage`                                   | 검토는 `hasRealAnswer`로 공백/센티널을 안내하고 해설은 공통 `SolutionText`를 사용. `src/components/exam-builder/ExamAnswerPanel.tsx:23`, `src/components/unified/print/AnswerPage.tsx:58`. 기본 showAnswers=false(`src/components/unified/print/types.ts:151`), 빠른 정답은 해설 제외. 출력의 실제 학생/교사 페이지 육안은 미실시 |
| AI 생성·변형 미리보기·채택             | `POST /api/problems/generate`, `/transform`, `/transform/adopt`                                      | 후보와 적재 분리, 대표 원문 선택, 서버 그림 검증/재생성, 채택 pending·갈래 계승. `src/app/api/problems/transform/adopt/route.ts:49`, `:99`, `:140`, `:178`; `problemGenerate.test`, `problemTransform.test` 통과. 실제 모델 품질·유료 호출 미검증                                                                                 |
| 계정 담기 조회·담기·한 건 빼기·비우기  | `GET/POST/DELETE /api/basket`                                                                        | 사용자별 바구니, 담기 멱등·자격 거절·서버 분포. `src/app/api/basket/route.ts:56`, `:85`; `basket.test` 통과                                                                                                                                                                                                                       |
| 담은 것으로 시험지 생성                | `POST /api/basket/test`                                                                              | 반 쓰기/학생 소속 확인, 빈 바구니·비적격 차단, 순서 재부여. `src/app/api/basket/test/route.ts:51`, `:90`, `:105`, `:140`; 동시 변경 소비는 F04                                                                                                                                                                                    |
| 현재 은행 조건 목록·추가/교체 후보     | `GET/POST /api/studio/problems`                                                                      | 동일 resolver, 긴 차시 조건의 64KB 제한 POST 읽기. 기본은 eligible, 명시적 reviewStatus 조회는 보이되 담기 자격 별도. `src/lib/unifiedPreview.ts:129`, `src/lib/unifiedBankQueryBody.ts:7`; `unifiedBankFilters.test` 통과                                                                                                        |
| 전체 보유·조건 가용·책/자료별 수       | `GET/POST /api/studio/problems/sources`                                                              | view 없음은 전역 보유, available은 현재 조건·자격, materials는 자료별 수. `src/lib/bankSourceRoute.ts:36`, `src/lib/bankSourceAvailability.ts:139`; `unifiedBankSource.test`, `unifiedBankAvailability.test` 통과                                                                                                                 |
| 난이도 랜덤·차시 할당 구성             | `POST /api/studio/problems/random`                                                                   | 목록과 같은 필터 해석, 자격·갈래·제외·최근 출제·난이도/형식 의도. 다른 난이도/형식으로 조용히 채우지 않음. `src/lib/unifiedBankSelection.ts:271`; `examBuilderFamilyRule/Conditions/Replace.test` 통과                                                                                                                            |
| 승인 뒤 최신 담기 자격                 | `GET /api/studio/problems/{id}`                                                                      | 승인 성공만으로 eligible로 만들지 않고 최신 서버 자격을 확인. 실패하면 담기 차단·재조회. `src/components/unified/BankView.tsx:877`, `:932`; `BankView.filters.test` 통과                                                                                                                                                          |
| 현재 상태 재확인·교과서 쌍 표시        | `POST /api/studio/problems/check`, `/textbook-slots`                                                 | 각 1~100 ID·16KB, 숨은 풀은 missing, 이유 코드 보존. `src/lib/bankReadiness.ts:41`, `:110`, `:171`; `bankReadiness.test`, `studioBankReadinessRoutes.test` 통과                                                                                                                                                                   |
| 개인 사용 라벨                         | `POST /api/studio/problems/labels`                                                                   | 인가 후 읽기 응답 호출 확인(`src/app/api/studio/problems/labels/route.ts:10`). 이번 라벨 전용 스위트는 실행하지 않음                                                                                                                                                                                                              |
| 자동 출제·목록·상세                    | `POST /api/tests/generate`, `GET /api/tests`, `GET /api/tests/{id}`                                  | 동일 자격 후보·반/시험 접근 범위, 콘텐츠 읽기 공통화. `src/lib/findEligibleProblems.ts:80`, `src/app/api/tests/[id]/route.ts:31`; `test.test` 통과                                                                                                                                                                                |
| 초안 문항 교체·확정                    | `PUT /api/tests/{id}/problems/{seq}`, `POST /api/tests/{id}/confirm`                                 | 같은/인접 난이도·단원·최근 제외·다른 자리 갈래 제외, draft 조건을 쓰기 WHERE에서도 확인. `src/lib/tests/replaceTestProblem.ts:139`, `src/app/api/tests/[id]/confirm/route.ts:37`; `test.test` 통과                                                                                                                                |
| 저장 오답 → 교과서 지정 쌍 → 복습 출력 | `POST /api/tests/{id}/retry`                                                                         | 일반 유사문항으로 지정 슬롯 대체하지 않음, 부족 수 보존. `src/lib/tests/retryCandidates.ts:70`, `src/lib/generator/textbookSlots.ts:153`; `testRetry.test`, `textbookSlots.test` 통과. `SavedRetryPanel`은 실제 출력마다 재조회(`src/components/test/SavedRetryPanel.tsx:199`, `:238`)                                            |
| 현재 은행 출력 단계 진입·재개          | `mathSource.prepareOutput → GET …/problems?ids=…`, 실패 이유 `POST …/check`                          | 현재 자격·동일 차시/출처·중복·최대 100 검사 확인. `src/components/exam-builder/mathSource.ts:319`, `src/components/exam-builder/ExamBuilder.tsx:635`, `:730`; `mathExamBuilderSource.test` 통과. 단계 진입 뒤 대기는 F02                                                                                                          |
| 실제 인쇄·PDF·HWPX                     | `WorksheetEditor`, `POST /api/exports/pdf`, `/hwpx`; 기존 `POST /api/tests/{id}/print`               | 로컬 미리보기 준비·중복 실행·권한/문서 크기 검증 있음. 서버는 전달된 문서로 출력하며 은행 상태 재검증을 대신하지 않음. `src/components/unified/WorksheetEditor.tsx:181`, `:255`, `src/lib/export/request.ts:6`; F02                                                                                                               |
| 저장·복원·이름·삭제·사본               | `GET /api/library/documents`, `GET/PUT/PATCH/DELETE/POST /api/library/documents/{documentId}`        | 인접 경로 소스 맵만 점검. owner/현재 계정·종류·expectedRevision 409 확인(`src/lib/privateDocumentActions.ts:145`, `:232`, `:323`). 전용 저장 스위트와 실저장 미실행                                                                                                                                                               |
| 이름 붙인 조건·내 양식                 | `GET/POST /api/studio/exam-conditions`, `PATCH/DELETE …/{conditionId}` 및 같은 형태 `/print-presets` | bank/export 메뉴·현재 계정·본인 kind·revision 검사 소스 확인(`src/lib/examConditions.ts:58`, `:213`, `src/lib/printPresets.ts:60`, `:253`). 조건 UI 검사는 실행, 두 저장 API 전용 스위트 미실행                                                                                                                                   |
| dev 짝 6경로                           | `/api/dev/unified/problems`·sources·random·check·textbook-slots·labels                               | 목록/출처 GET·POST, 나머지 POST. development 외 404 확인(`src/app/api/dev/unified/problems/route.ts:7`). 운영 라우트의 인증 검증과 dev 응답 검증을 혼동하지 않음                                                                                                                                                                  |

권한은 `src/lib/accountRouteAccess.ts:240`의 bank 범위와 `:255`의 export 범위, `src/lib/routeAccess.ts:39`의 검수 계정 허용 목록, `src/proxy.ts:222`의 결합을 확인했다. studio handler는 `authorizeStudio`에서 세션·검수 역할·POST Origin을 검사한다(`src/lib/studio-ai/guard.ts:6`). 메뉴 제한은 proxy가 맡는 부분이 있으므로 **handler 직접 호출 검사만으로 전체 HTTP 인가를 입증할 수 없다**. 이번 `studioBankReadinessRoutes.test`의 401/403·다른 Origin·거절 전 DB 미조회, `accountRouteAccess.test`, `routeAccess.test`는 통과했다. 정상 경로로 무권한 쓰기가 가능하다는 보안 결함은 확인하지 못했다.

## 3. 전수 기계 집계 결과

실행 `FLOW-DB-1`, 원본 수치 `.qa-artifacts/problem-bank-flow-20261018/census-result.json` 및 커밋 메타데이터의 `database`.

| 저장 출처       |    보유 | 출제 가능 | 보완/해석                                                                      |
| --------------- | ------: | --------: | ------------------------------------------------------------------------------ |
| manual          | 100,974 |    99,184 | 잠긴 승인행 1,790. source 이름만으로 수학적 품질을 보증하지 않음               |
| school_textbook |  12,301 |    11,826 | 잠긴 승인행 475                                                                |
| transformed     |   4,442 |     4,363 | pending·잠김 79                                                                |
| ai_generated    |      10 |        10 | 실제 모델 결과 재검산을 수행한 수가 아님                                       |
| past_exam       |     101 |         0 | 승인되어 있어도 전부 직접 사용 잠금. “기출 101개 사용 가능”으로 표시하면 안 됨 |
| 합계            | 117,828 |   115,383 | 비적격 2,445                                                                   |

- 공용 전체에서 `answer=''` 0건, SQL `btrim(answer)=''` 0건. 출제 가능 문항의 null/빈/공백 해설 0건, null questionType 0건.
- 위 빈 칸 검사는 **정답·해설의 수학적 타당성, 그림 존재, 식/표 손실을 확인한 것이 아니다**. `btrim`도 PostgreSQL 기본 공백 판정 범위다.
- 해설 글이 있으면서 `solution_source=none`인 행은 전체 100,989건이다. 출처 기록의 의미와 과거 적재를 더 확인하지 않았으므로 이를 해설 누락/오답으로 분류하지 않았다.
- 교과서 원문 12,301개 중 2/2 2,179개, 1/2 0개, 0/2 10,122개. 지정 슬롯 4,358개는 모두 자격·차시 대응을 만족한다. 출제 불가 부모의 열린 슬롯 0개, 차시 불일치 0개, approved이면서 잠긴 지정 슬롯 0개.
- 출제 가능 교과서 원문 중 쌍이 없는 수는 9,647개다(11,826 − 2,179). 본시험 원문 사용 가능과 오답 복습 쌍 준비는 서로 다른 수치다. 슬롯을 새로 검산/육안 승인한 수로 설명하지 않는다.

## 4. 우선 보완할 출제·데이터 전이 위험

### FLOW-F01 · P1 · 실제 문항 2건의 증명 빈칸 번호가 보기로 합쳐짐

**확정 데이터 표시 오류.** root가 원문 재열람 후 “증명 안 번호와 실제 마지막 5지선다가 섞인다”고 전달한 두 건을 `FLOW-PARSER-DB-1`에서 다시 읽었다. 두 행 모두 현재 eligible이다.

| 문항 코드 / ID                                            | 현행 보기 수 | 파서가 남긴 원래 번호             | 지문 길이 → stem 길이 | content SHA-256                                                    |
| --------------------------------------------------------- | -----------: | --------------------------------- | --------------------- | ------------------------------------------------------------------ |
| `J20501-A70-001` / `d533c98e-c85b-4530-8b0a-03d50291aefb` |            9 | 1,2,3,4,1,2,3,4,5; 빈 5 하나 제거 | 508 → 230자           | `b289626af20d82f6206853902f42234007c8b24d2c01640686fb7445e770b275` |
| `J20506-A37-001` / `ac37d08a-5f7b-49ee-950b-af34e002c8e9` |           10 | 1,2,3,4,5,1,2,3,4,5               | 556 → 182자           | `91372681a21c05c7d289de1c5205b7d116825c4006298bcf8895f97a16947902` |

위치: `src/lib/problem/parseProblemContent.ts:328`은 줄머리 번호를 모두 수집한다. `:335`의 `hasEarlierBlock`은 앞에 1~4 이상의 완전 묶음이 있으면 마지막 묶음만 택하는 보정을 막는다. `:362`는 첫 마커에서 stem을 자르고 `:375`는 빈 보기만 버린다. 이 두 사례에서는 그 보호 규칙 때문에 증명 빈칸도 보기에 남는다. `:415`의 보정 경로 역시 이 둘을 구분하지 못한다.

렌더 연결: 현재 수학 `UnifiedProblem → ProblemContent`(`src/components/unified/UnifiedProblem.tsx:51`, `src/components/math/ProblemContent.tsx:121`), 기존 카드/시험 인쇄 `PaperProblemView → ProblemContent`(`src/components/print/PaperProblemView.tsx:40`), 공통 여섯 출력 양식 `ProblemBody → UnifiedProblem`(`src/components/unified/print/templates/ProblemBody.tsx:39`)이 같은 파서를 사용한다. NativeProblem의 비구조화 fallback도 같은 함수다(`src/components/unified/NativeProblem.tsx:194`). 따라서 이 오류는 수량/자격 검사로 차단되지 않고 화면·출력으로 전달된다. 실제 PDF나 브라우저 픽셀의 훼손 정도는 이 worker가 육안 측정하지 않았다.

**완료조건:** 해당 두 원문의 증명 번호·빈칸을 stem에 보존하고 실제 마지막 선택지 5개만 보기로 렌더하는 대응 검증. 화면과 인쇄에서 같은 결과를 확인할 것. 원문 저장값을 훼손하지 않고 구조를 구분해야 한다. **일괄 “보기는 5개여야 한다” 가드/앞부분 절단으로 해결하지 말 것.** root가 나머지 `choiceCountNotFive` 후보 13개는 대부분 정상 소문항/조건 번호라고 전달했으며 전체 재열람은 root 담당이다. 이번 분담은 그 13개를 오류로 확정하지 않았다.

### FLOW-F02 · P1 · 출력 단계 진입 후 실제 출력까지 은행 상태 재확인 없음

**직접 재현된 출제 위험.** `FLOW-P8-print/pdf/hwpx`는 실제 MathExamBuilder·ExamBuilder·WorksheetEditor를 연결하고 페이지 조판과 파일 생성만 대역으로 만들었다. 단계 진입 때 bank 조회 1회 후 응답 대역을 locked 상태로 바꾸고 세 출력 버튼을 각각 눌렀다. 세 경우 모두 조회 수는 **1 → 1**, 출력 함수는 **각 1회 실행**됐다.

`mathSource.prepareOutput`은 진입/재개 때 최신 행을 받는다(`src/components/exam-builder/ExamBuilder.tsx:635`, `:730`). 하지만 `UnifiedWorkspace`의 `editorProps`에 beforeOutput이 없고(`src/components/unified/UnifiedWorkspace.tsx:1210`), `MathExamBuilder`도 출력에 추가하지 않는다(`src/components/exam-builder/MathExamBuilder.tsx:459`). `WorksheetEditor`는 `beforeOutput?.()` 다음 로컬 참조/조판 준비만 확인한다(`src/components/unified/WorksheetEditor.tsx:181`). 출력 화면에서 기다리는 사이 잠금·반려·본문/정답 변경을 감지할 연결이 없다.

기존 시험 인쇄도 `FLOW-P7`에서 생성 뒤 잠근 은행 문항 1개를 페이지 데이터에 담고, print API가 200과 printed 전이를 반환했다. 위치: `src/app/(main)/tests/[id]/print/page.tsx:24`, `src/app/api/tests/[id]/print/route.ts:46`. 이 probe는 snapshot/publication이 없는 일반 은행 연결 시험을 대상으로 했으며 불변 발행본 정책까지 동일하게 바꾸라는 뜻은 아니다.

**완료조건:** 실제 인쇄/PDF/HWPX 실행 직전에도 현재 세션·권한·은행 자격 및 선택 콘텐츠 변경을 확인하고, 바뀌었으면 미리보기 갱신/재검토를 요구할 것. 단계 진입 검증과 실제 버튼 검증을 각각 테스트할 것. 기존 은행 연결 시험과 고정 snapshot/발행본의 정책을 구분할 것. SavedRetryPanel의 출력별 재조회는 이미 연결되어 있어 보존한다.

### FLOW-F03 · P1 · 사람의 원문 수정·반려가 기존 검수/지정 쌍에 전파되지 않음

**기존 보고서의 공백을 현재 HEAD에서 재현한 전이 위험.** `FLOW-P1`에서 승인 교과서 원문을 PATCH하면 200, 콘텐츠 digest 변경, 원문 approved 유지, 슬롯 **2/2 유지**를 관측했다. `FLOW-P2`에서 원문을 rejected로 바꾸면 200, 원문은 비적격이지만 자식 2개는 eligible이고 `findRetryCandidates → planRetry`가 **2개 선택·부족 0**을 반환했다.

위치: `src/app/api/problems/[id]/route.ts:88`, `src/app/api/problems/[id]/review-status/route.ts:42`는 대상 행만 변경한다. `src/lib/generator/textbookSlots.ts:14`는 런타임 원문 fingerprint를 보지 않는다고 명시한다. `src/lib/tests/retryCandidates.ts:70`은 자식의 자격을 검사한다. 과거 출제 오답을 읽는 부모 자체의 현재 자격이 지정 자식의 만료 증거를 대신하지 않는다.

기존 근거: `docs/planning/tracks/reports/bank-p0-backend-20261014/README.md`의 “남은 공백” 1번은 사람 편집 잠금을 미구현·소유자 결정 사항으로 명시했다. 이번에 새 정책을 정하거나 잠금을 적용하지 않았다. **현재 실DB의 열린 고아 슬롯은 0개**이므로 이미 다수의 낡은 쌍이 운영되고 있다고 주장하지 않는다. 과거 본문 변경 시점을 검산 당시 digest와 맞댈 저장 근거가 없어, 과거 변경 누락 수는 확인 못했다.

**완료조건:** 의미가 바뀌는 수정·단원 변경·반려에 대해 원문 검수와 지정 자식의 유효성이 어떻게 전이되어야 하는지 결정하고, 동일 트랜잭션 또는 검증된 digest로 시행할 것. 재검산 후 잠긴 쌍을 다시 여는 경로도 정의할 것. 오타 수정만으로 모두 잠글지 여부는 기존 미결 정책으로 남긴다.

### FLOW-F04 · P1 · 시험지 생성 사이에 추가된 담기가 조용히 사라짐

**제어된 인메모리 동시 순서에서 재현된 선택 데이터 유실.** `FLOW-P6`: 바구니 1개를 읽은 뒤 생성 트랜잭션 시작 직전에 다른 창의 담기 1개를 삽입했다. 결과 **201·시험지 1문항·늦게 담은 문항 미포함·바구니 잔여 0**이다. 새 문항이 시험지에도 바구니에도 남지 않았다.

위치: `src/app/api/basket/test/route.ts:70`은 트랜잭션 밖에서 목록을 캡처하고, `:162`는 그 목록으로 시험지를 쓰지만 `:171`은 userId의 모든 담기를 삭제한다. 실제 PostgreSQL 두 세션의 부하/잠금 재현은 하지 않았으며, 이 결과는 코드가 허용하는 중간 삽입 순서의 관측이다. 바구니 항목 소실이지 문제은행 원문 삭제는 아니다.

**완료조건:** 소비한 바구니 항목 집합만 지우고 그 이후 추가는 보존하거나, 계정별 소비를 직렬화해 새 항목의 포함/보존을 명확히 할 것. 중복 생성 요청과 생성 도중 추가/삭제를 각각 검증할 것. UI busy만으로 다른 탭/기기를 막았다고 판단하지 않는다.

## 5. 입력·편집 보완 항목

| ID / 우선순위 | 구분·현재 증거                                                                                                                                                                                               | 위치                                                                                                                                                             | 완료조건                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FLOW-F05 / P2 | **확정 API 동작, 동시 편집 시 내용 손실 위험.** 두 편집자가 같은 읽기 버전에서 각각 수정하는 순서를 재현한 `FLOW-P5`: PATCH 두 번 모두 200, 두 번째 값으로 대체, 충돌 409 없음. 실사용 손실 이력은 확인 못함 | `src/contracts/problem.contract.ts:105`, `src/app/api/problems/[id]/route.ts:88`. 요청에 expected revision이 없고 WHERE는 id만 사용                              | 수정·승인의 기준 revision/digest를 받고 stale 입력은 보존하면서 충돌로 처리. 공유 문항의 최신 검수 대상도 맞출 것. 내 시험지 저장의 revision 보호와 구분   |
| FLOW-F06 / P2 | **확정 형식 메타데이터 어긋남.** `FLOW-P3`: problemType을 서술형으로 수정해 200. 저장 questionType은 단답형, 같은 입력의 deriveQuestionType은 서술형, classifyFormat은 short_answer 유지                     | `src/app/api/problems/[id]/route.ts:90`, `src/lib/ai/questionType.ts:67`, `src/lib/problem/provenance.ts:247`                                                    | 내용/답/유형 수정 때 기존값과 병합한 입력으로 형식과 관련 표시 메타데이터를 재산출하거나 명시적 검토 대상으로 전환. 등록·변형 경로와 왕복 검증             |
| FLOW-F07 / P2 | **확정 입력 관문 공백, 현재 데이터 발생 0.** `FLOW-P4`: 공백 정답 등록 201 → 승인 200 → check eligible 1. 실DB 전체 공백 정답은 0                                                                            | `src/contracts/problem.contract.ts:82`의 min(1), `src/lib/missingAnswer.ts:13`의 표시 술어와 다른 `src/lib/problemEligibility.ts:40`, `:90`의 정확한 센티널 비교 | 의미 있는 답의 검증을 저장·where·클라이언트 술어에 일관되게 적용. 단순 공백과 정상 기호식 답을 구분. 한쪽 술어만 바꾸어 DB/화면 자격이 달라지지 않게 할 것 |

위 항목은 보안 취약점으로 단정한 것이 아니다. 공용 문항 수정 권한은 기존 D-101 정책으로 소유자와 무관하며(`src/lib/ownership.ts:192`), 그것 자체를 무단 접근으로 세지 않았다. 사람 수정 API의 존재와 현재 루트 화면에서 수정 폼이 보이는지를 동일시하지 않았다.

## 6. 기능·가용량 개선과 의심/미확인

| 항목                                        | 판정                                        | 근거 / 다음 체크                                                                                                                                                                             |
| ------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 교과서 오답복습 쌍 확대                     | **가용량 개선**, 원문 오류로 분류하지 않음  | 출제 가능 원문 중 9,647개가 지정 쌍 없음. 준비 상태 0/2와 복습 부족 수를 유지하고, 우선 사용 범위부터 원문 digest 대응·검산·표시 확인을 마친 쌍을 공급                                       |
| 잠긴 approved 지정 슬롯의 재개 도구         | **기존 미결 기능**, 현재 잠긴 해당 행 0     | 기존 백엔드 보고서 “남은 공백” 2번. review-status는 직접 사용 잠금을 풀지 않고, `scripts/import/textbook/qualify-reviewed.ts`는 pending 승격 경로. 전용 재검증/해제 절차는 확인 못함         |
| 형식 조건의 facets 미확인                   | **의도된 제한**, 0으로 표시하면 오류        | `src/lib/bankSourceAvailability.ts:151`은 format이면 facets:null. `mathSource`는 갈래 수 미확인을 행 수로 대체하지 않음. 관련 스위트 통과                                                    |
| Legacy ProblemBank 등록/변형 직후 필터 반영 | **소스상 의심, 컴포넌트 추가 재현 미실시**  | `src/components/problem/ProblemBank.tsx:128`의 matchesFilters는 q·hasFigure·hasSolution·hasAnswer를 보지 않으나 `:423`에서 새 행 삽입에 사용. 해당 조건 중 새 문항이 목록에 끼는지 후속 확인 |
| Legacy BankView 승인/반려 뒤 필터 이탈      | **명시된 구현 차이**, 현재 루트 bank와 구분 | `src/components/unified/BankView.tsx:924`는 다음 조회까지 필터 이탈 행을 유지한다고 명시. 최신 eligibility 재조회 보호는 있음. 상태 필터·결과 수를 즉시 맞출지 개선 검토                     |
| 나머지 choiceCountNotFive 후보 13개         | **오류 미확정**                             | root가 대부분 정상 소문항/조건 번호라고 전달. 단순 개수 초과로 자동 잠금/수정 금지. root의 후보별 재열람 결과와 합칠 것                                                                      |
| 해설/정답의 내용 타당성                     | **이번 분담에서 전수 검증 못함**            | 빈 칸 0과 승인 상태는 답의 수학적 참을 뜻하지 않는다. UI의 동일 렌더 연결·입력 관문만 확인                                                                                                   |

## 7. 설계 기준 평가

`DESIGN.md`의 §4.4 상태 구분, §5.3 범위→검토→출력, §8.3 인쇄 예외를 기준으로 소스와 관련 컴포넌트 검사를 비교했다. `Workroom.module.css`를 활성 셸로, `Workspace.module.css`를 legacy로 취급했으며 UI/CSS는 수정하지 않았다.

- **계약 유지 확인:** 현재 범위 선택은 수량 0과 미확인을 구분한다(`src/components/exam-builder/scopeAvailability.ts:4`, `src/components/exam-builder/ScopePicker.tsx:255`). 자료는 available=0이면 선택 차단(`src/components/exam-builder/MaterialPicker.tsx:67`). 구성·출력 왕복·제목·순서·되돌리기·갈래 규칙은 관련 ExamBuilder 검사 범위에서 통과했다.
- **상태 회복 확인:** BankView의 대기/실패/무결과·재시도와 필터별 선택 보존, 서버 자격을 재조회하지 못하면 담기 차단하는 검수 흐름이 관련 컴포넌트 검사에서 통과했다. 이것을 현재 루트 화면의 모든 시각 상태로 확대하지 않는다.
- **개선 필요:** DESIGN이 요구하는 원본 변경·권한 재확인은 실제 출력 실행 시점까지 이어져야 한다(F02). 사람 편집의 충돌 안내는 API 자체의 revision 보호가 먼저 필요하다(F05).
- **기존 디자인 미결 점검:** 메뉴 맵의 “결과/담은 수 live 안내·담기 목록 초점 영역”은 부분 구현이다. BankView 결과는 role=status(`src/components/unified/BankView.tsx:1777`), 선택 알림도 role=status(`:1769`)가 있으나 BankBasket의 스크롤 목록은 `ol aria-label`만 있다(`src/components/unified/BankBasket.tsx:230`). 실스크린리더·키보드 스크롤·포커스 회귀는 확인 못했다.
- **미검증:** 1920/1280/1050/768/760/390/320px, 짧은 높이·확대·사이드바 접힘/최대화의 실브라우저 시각 비교와 인쇄물 육안은 수행하지 않았다. 색 대비·전체 접근성 통과를 인증하지 않는다. 학생 앱·인쇄 지면 예외는 평가 범위 밖으로 보존했다.

## 8. 실행 기록과 기존 이슈 재현

| 실행명               | 실행과 결과                                                                                                                          | 증거                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| FLOW-SUITES-1        | manifest의 36파일만 `vitest run --maxWorkers=2 --reporter=json`; 612/612 통과, 미실행 파일 0, unhandled 0                            | `.qa-artifacts/problem-bank-flow-20261018/suite-manifest.json`, `suites-result.json`                          |
| FLOW-SUPPLEMENT-1    | 파서/보기/형식 4파일 + ExamBuilder/SavedConditions 2파일. 120/120 통과                                                               | `supplement.config.mts`, `supplement-result.json`                                                             |
| FLOW-PROBES-1        | 새 QA probe 2파일·10관측. 최초 8통과·2실패는 **테스트 대역의 기능 부족**                                                             | `probes-run-result.json`. `$transaction` Proxy의 own descriptor가 없어 spy 실패, 인메모리 test.findFirst 부재 |
| FLOW-PROBES-REPAIR-1 | QA 파일에서 실제 대역 객체에 spy, 빠진 findFirst의 관계 투영 대역만 추가. 실패한 두 건만 `-t 'FLOW-P6\|FLOW-P7'`로 재실행 → 2/2 통과 | `probes-repair-result.json`, `api-probes-repair-result.json`. 제품 수정 없음; 원래 다섯 건은 재실행 대상 제외 |
| FLOW-PROBES-OUTPUT-1 | 실제 화면 연결에서 세 출력 행동 관측, 3/3에서 잠금 후 추가 조회 없음                                                                 | `output-probes-result.json`                                                                                   |
| FLOW-DB-1            | READ ONLY=on; 전체/자격·빈 칸·지정 슬롯 집계                                                                                         | `census.ts`, `census-result.json`                                                                             |
| FLOW-PARSER-DB-1     | READ ONLY=on; 두 지정 ID의 길이·digest·파싱 수                                                                                       | `parser-cases.ts`, `parser-cases-result.json`                                                                 |

`census.ts` 실행 준비에서 tsx의 CJS top-level await 및 ESM named import 문제로 연결 전 두 번 실패했다. 로컬 실행 wrapper를 async main으로 바꾼 뒤 위 측정이 성공했다. 이 실패를 제품/DB 장애로 세지 않았다. 기존 스위트의 실패는 0건이며 전체 유닛테스트·빌드·공유 DB 쓰기 테스트를 실행하지 않았다.

기존 보고서와 현재 사실은 다음처럼 구분했다.

| 이전 기록                                                                                           | 현재 검토 결과                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-14 백엔드 보고서의 사람 편집/검수 슬롯 잠금 공백                                            | 현재도 재현(F03). 도구 refresh/hold의 잠금 보강과 사람 API를 구분                                                                                                                                                 |
| 같은 보고서의 잠긴 approved 슬롯 재개 경로 부재                                                     | 소스상 유지, 현재 데이터 해당 잠김 0. 실제 해제 작업 미실시                                                                                                                                                       |
| 같은 보고서의 가용량=목록=구성/랜덤 조건 짝                                                         | 현행 `unifiedBankAvailability.test`의 72조합×제외 유무=144조합 및 자료 필터 검사가 이번 실행에서 통과(`src/__tests__/api/unifiedBankAvailability.test.ts:357`, `:407`). 공유 DB에서 144개 API 요청을 한 것은 아님 |
| 같은 보고서의 ProblemBank 출처 선택지 교과서 실패                                                   | 현재 `SOURCE_OPTIONS`에 school_textbook 있음(`src/components/problem/labels.ts:46`), 해당 ProblemBank 스위트 통과. 옛 실패를 현재 실패로 재사용하지 않음                                                          |
| `docs/design/exam-builder-implementation-20261008.md`의 출력 직전 자격 재확인                       | 단계 진입/재개 검사는 존재·통과하지만 출력 화면 대기 뒤 버튼 실행은 F02의 별도 공백                                                                                                                               |
| `docs/planning/tracks/reports/textbook-retry-ui-20261011/report.md`의 복습 출력 전 같은 기록 재조회 | 현재 SavedRetryPanel에 연결 유지. 은행 일반 출력과 구분                                                                                                                                                           |

## 9. 보완 작업의 체크 순서

1. **출제 내용 오류:** F01의 두 ID를 우선 재현 fixture/안전한 대응 증거로 잠그고 화면·인쇄에서 증명/보기 경계를 확인. 13개 미확정 후보는 독립 판정.
2. **출력 시점:** F02의 단계 진입 후 변경·권한 회수·출력 세 종류를 각각 차단하는 완결 흐름 확인.
3. **변경 전이:** F03의 원문 수정/반려 및 재검산·재개 정책을 정하고, F05 revision과 F06 형식 갱신을 함께 검증.
4. **선택 보존:** F04의 다중 탭/기기 순서에서 새 담기 보존·중복 생성·원자적 소비 확인.
5. **입력·가용량·사용성:** F07 빈 답 관문 일치, 지정 쌍 부족 공급, legacy 필터/스크린리더 미확인 항목을 각각 검증.

이 보고서는 보완할 위치와 완료조건을 제시한다. 제품 수정·공유 DB 교정·실배포 또는 문항 100% 정답 판정은 수행하지 않았다.
