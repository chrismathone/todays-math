# 문항 단위 은행 · 실제 형식 선택 UI 구현

2026-10-18 · UI worker `math-question-format-ui-20261018`

기준은 [승인 계획](../../math-question-formats-20261018.md), [UI 설계/43경로 지도](ui-design.md), [정체 설계](identity-design.md), [Claude 승인과 구속 조건 6개](claude-plan-review-r1.md)다. 승인 계획 SHA-256은 `50c525785cae16825d23d7bd55de81f7a779fa54cd98e8933d470a126acccc61`이다.

## 구현 결과

현재 MathExamBuilder, 별도 ProblemBank/계정 바구니, legacy BankView, workspace/bootstrap 소비자가 `identity=question` 보기를 사용한다. `countUnit:question`이 없는 새 보기 응답은 오류로 처리하며 실제 행 수를 대신 표시하지 않는다. 형식 검색은 사용 가능한 형식이라는 네이티브 option 그룹으로 구분한다. 카드의 가능 형식은 서버가 `available`로 준 실제 표현만 사용하며, 다른 수치 과제는 같은 문항류여도 별개 문항으로 남는다.

공용 BuilderDialog를 확장한 QuestionFormatPicker는 네이티브 radio로 실제 표현을 선택하고 서버에서 읽은 전체 본문/보기를 미리 보여 준다. 교체는 같은 자리의 실제 UUID·본문·정답·해설·그림을 함께 바꾸며 문항 수와 차례를 보존한다. 잠긴 형제는 사유와 함께 비활성화하고 없는 서술형 선택지를 만들지 않는다. 선택 이후 revision·정체·형식·자격이 바뀌면 기존 선택과 창을 유지한다.

Studio 선택 목록과 서버 바구니 모두 questionId로 충돌을 막는다. 담기·형식 교체·되돌리기·복원·새 편집을 다루며, 과거 중복 저장본은 자동으로 합치지 않는다. 저장 출력은 원래 실제 행과 정답을 그대로 표시하고, 출력에서 새로 편집할 때 사본을 만든 뒤 유지할 표현을 명시적으로 선택한다. 새 출력과 저장은 실제 ID 및 선택 revision을 readiness 검사에 전달한다. 과거 내용에 현재 메타데이터를 붙일 때 실제 저장 내용과 달라졌으면 덮어쓰지 않고 충돌을 표시한다.

일일 생성과 DailyReviewSection에 선택적 객관식·단답형·서술형 할당을 연결했다. 비움과 0을 구분하고, 서로 다른 학생별 `problemCount`를 같은 절대 할당으로 덮지 않는다. 생략한 basket/test/recent 옵션은 이전 기본을 보존한다. 명시한 총수·형식이 부족한 부분 결과는 검토할 수 있지만 출력·저장은 조건을 고칠 때까지 차단한다. Ctrl/Cmd+S도 같은 조건과 현재 실제 행 검사를 거친다. 서버 `search_limit`은 확정 부족으로 바꾸지 않고 입력을 유지한다. 저장 조건 v1에는 형식·배치 순서가 저장되지 않는다는 안내를 표시한다.

BankSourcePicker는 새 계약에서 합집합을 입증할 수 없는 여러 책·자료 종류의 수를 더하지 않는다. 서버의 전역 합계와 단일 집합 수는 그대로 표시하고, 겹칠 수 있는 선택 조합의 미리보기는 `미확인`과 “적용 후 목록에서 확인”으로 표시한다. 적용 뒤 목록은 서버의 정확한 문항 합집합 수를 사용한다. 임의 조합의 정확한 미리보기 수를 추가하려면 서버의 합집합 응답이 더 필요하다.

영어용 generic ExamBuilder 인터페이스는 선택적 확장으로 유지했다. 학생/SRS/인증/인쇄 renderer/전역 shell CSS는 이 UI 작업에서 변경하지 않았다. `src/app/dev/workspace-alignment`와 `dev/unified`도 새 읽기 계약으로 맞췄으며, 모의 랜덤 구성은 공유 순수 solver를 사용한다.

## 검증과 화면 증거

검증용 `/dev/question-formats`는 직접 작성한 4문항/7표현을 사용한다. 단답·객관 형제, 다른 수치의 같은 family, 실제 문자 설명 과제, 잠긴 형제, 개정 충돌, 조회 실패, 부족, 과거 중복 저장본을 포함한다. 요청은 해당 fixture 메모리에서 처리한다. 로컬 dev server의 DB URL은 접근 불가능한 로컬 주소로 설정했고 공유 DB 쓰기·배포·push를 하지 않았다. 공유 node_modules를 symlink했으며 Prisma generate를 실행하지 않았다.

브라우저 재현 명령은 `node scripts/qa/question-formats-ui-20261018.cjs http://127.0.0.1:3198`이다. [브라우저 결과 JSON](ui-qa/browser-results.json)은 320×600, 390×600, 1280×800, 1280×600에서 실제 native radio 방향키, Tab/Enter, Escape, 중첩 창 Escape, 실제 표현 전체 교체, 자리/수 보존, 닫힌 뒤 opener 포커스, 44px 최종 액션, 수평 넘침, 잠금/개정 충돌, 저장본 출력 보존과 명시적 충돌 해소를 확인한다. 추가 desktop 흐름은 객관식 4문항 요청/실제 2문항 부족의 출력 차단과 입력 보존, 조회 실패 시 선택 보존을 확인한다. page error와 네트워크 쓰기는 0건이다.

대표 화면은 [320px 키보드 최종 액션](ui-qa/picker-320x600-keyboard.png), [390px 후보 목록](ui-qa/candidates-390x600.png), [잠긴 형제](ui-qa/blocked-390x600.png), [실제 형식별 부족](ui-qa/quota-shortage-1280x600.png), [조회 실패](ui-qa/query-failure-1280x600.png), [저장본 원래 출력](ui-qa/saved-output-1280x800.png), [새 편집 충돌](ui-qa/saved-edit-conflict-1280x800.png)이다.

컴포넌트/API client 통합 검증은 23개 suite, 309/309 통과했다. QuestionFormatsUI, questionFormatApiClients, Math source, BankView 4개 suite, ProblemBank/형식 필터, GenerateSetup/경합, DailyReviewSection, useTestReview, UsageLabels, studioCart/draftStore, workspace 동작/담기/순서 복귀를 포함한다. 공용 제작기의 별도 회귀 suite는 49/49 통과했다. 마지막 선언 순서/알림 위치 조정 후 workspace 13/13과 QuestionFormatsUI 7/7을 다시 확인했다. 마지막 실행 요약은 [검증 기록](ui-qa/verification.txt)에 보존한다. 새·수정된 UI/client 파일의 scoped TypeScript 검사와 ESLint, `git diff --check`를 수행했다. 최종 전체 프로젝트 타입 검사는 core의 격리 Prisma client를 가진 coordinator가 통합 후 수행한다.

`vercel:react-best-practices` 검토에서 선택적 subject hook, 조건부/고정 순서 hook, async AbortController 취소, stale 결과 방지, 함수형 상태 갱신, 로컬 저장 메타데이터 검증, native form/radio 및 focus 복귀, 기존 토큰/대화창 재사용을 대조했다. 실제 브라우저에서 형식 교체 후 opener DOM이 바뀌어 포커스가 사라진 문제를 발견하여 question identity 기반의 안정적인 seat key로 고쳤다.

## 통합 담당에게 남기는 범위

이 보고서는 authored fixture의 UI 동작과 mock API/client 회귀 검증이다. 실제 DB backfill, 공유 DB 카탈로그 권한·트리거 확인, production 데이터/응답 성능, 교사 계정에서의 API→DB 전체 흐름은 coordinator/core의 Gate 2 검증 범위이며 이 화면 증거로 완료를 주장하지 않는다. Claude C6의 `/dev/print-check/items.ts` 항목은 content worker 소유이며 새 형식 선택·교사용 정답 노출을 **대기**로 올리는 것을 coordinator에게 요청했다. 물리 인쇄 검수가 끝났다고 주장하지 않는다.
