# Grok 1차 계획 검토

검토일 2026-10-14 · Orca Run `run_00c3cdc517b2` · Task `task_e47baefa9a98` · Dispatch `ctx_a9017eee9b48`

아래는 실제 Grok 검토 메시지 `msg_8b751011bfa6`의 본문이다. 개정 전 계획에 대한 지적이므로 현재 계획과 문장·행 번호가 다를 수 있다. 뒤의 합의 기록에서 반영 여부를 정리한다.

판정: approve-with-changes. 검토 기준은 C:\Creative\testautocreator main `4040b23b3`. 파일은 수정하지 않았고, 운영 DB는 조회하지 않았다. 코드에서 읽은 사실과 추론을 구분한다.

## 총평

문제은행 P0, 브랜드 표시 변경, 결제·주문 보류는 진행할 수 있다. 연산대장은 11~17행의 사용자 확정 방향이 맞다. 다만 7행, P1 행, 수용 시나리오 5, 1B 소유권, Grok 워커 프롬프트가 그 방향을 다시 일반 문항·해설·기존 채점으로 되돌린다. 구현자가 복사하는 문장이 11~17행을 이기므로, 그 문장들을 고치기 전에는 연산 코드에 들어가지 않는다.

## 관찰 (코드)

1. 초등 `연산`은 난이도 축의 한 칸이다. `src/lib/elementary/difficulty.ts`는 소단원마다 핵심 넷(연산·기본·응용·심화하)을 채우게 한다. `src/lib/elementary/types.ts`의 정답은 생성기가 같은 숫자로 계산한다. 뽑기 함수와 검산 함수가 분리돼 있지 않다.
2. 그 칸에 도형 이름 문항이 들어 있다. `src/lib/elementary/g3.ts`의 `line121Calc`(약 2254행)는 선분·반직선·직선 이름이고, `angle122Calc`(약 2381행)는 직각 기호를 고른다. 둘 다 12934·12946행과 13615·13621행에서 tier `연산`으로 등록된다. 세로셈(`columnOp`, 약 1812행)도 같은 파일의 다른 갈래다. 등급 이름으로 거르면 도형과 연산 연습이 같이 나온다.
3. 중등 `연산`도 연산 연습 목록이 아니다. `src/lib/middle/tier.ts`의 `resolveMiddleTier`는 발문이 「식을 바꿔 쓰라」인 `기본`만 `연산`으로 내린다. 지시 낱말에 계산·전개·인수분해·풀이·유리화·나타내기가 들어 있다. `src/lib/middle/m2SystemApply.ts` 625행 `인원수의 비`는 등록 난이도가 `연산`인 문장제다.
4. 문제은행 자격은 `src/lib/problemEligibility.ts`의 `problemEligibleWhere`다. 보이는 행, `approved`, `directUseAllowed`, 정답 센티널 제외. `src/lib/bankSourceCounts.ts`는 교과서 책마다 visible `count`와 이 자격의 `open`을 이미 센다.
5. 교과서 두 슬롯 키는 `src/lib/tests/retryCandidates.ts`의 `tb-retry-v1:${id}:1|2`다. `SavedRetryPanel.tsx` 문구는 교과서 원문마다 검토 완료 변형 두 문항을 확인한다고 적혀 있다.
6. `ScopePicker.tsx` 82행은 `width={880}`, 179행은 `count === 0`이면 체크를 막는다.
7. 인쇄 정답지는 `src/components/unified/print/AnswerPage.tsx`다. `quickAnswerOnly`이면 해설 블록을 그리지 않고 제목이 「빠른 정답」이 된다. 기본 `PrintOptions.quickAnswerOnly`는 false다.
8. 검수 대기열 `src/lib/review/queues.ts`의 `nosolution`은 solution이 비면 「정답만 있고 풀이가 없다」로 올린다.
9. `prisma/schema.prisma`의 `Test.rangeEndUnitId`와 `TestProblem.problemId`는 필수다. `Problem.unitId`도 필수이고 `solution`은 선택이다. 작업실 저장은 `WorkspaceDocument.payload` JSON이다.
10. `src/lib/testResults/gradeAnswers.ts`는 선택 번호와 서술형 점수만 채점한다. `gradeMarks.ts`는 교사가 찍은 오답 문항 id를 점수로 바꾸며, 적은 답을 검산하지 않는다.
11. 표시 문자열 `오늘의수학`/`오늘의 수학`은 `UnifiedWorkspace.tsx`, `WorksheetPrint.tsx`, `WorkroomHome.tsx` 등에 있다. `오늘의 영어`는 `EnglishPaper.tsx`, `ListeningPrint.tsx`에 있다. `오늘의 기억`은 `UnifiedWorkspace.tsx` 메뉴 라벨과 `src/contracts/accountAccess.contract.ts`에 있다. 계획의 「216개」는 이번 검토에서 다시 세지 않았다.
12. 벤치마크 76행은 문제은행 차시 문항으로 연산 경로를 만들라고 적는다. 117,828과 115,383은 그 문서의 2026-10-14 화면 관찰이다. 이번 검토는 DB로 다시 세지 않았다.

## 추론

기존 장 핸들러를 연산대장 원천으로 쓰면, 도형 이름·문장제·받아올림 횟수 질문이 연산 연습으로 나온다. 같은 함수가 발문과 답을 같이 만들면 독립 검산이 아니다. 생성 문항을 `Problem`에 넣으면 단원 필수 값, 은행 수량, `nosolution` 대기열, 반 프리셋의 `연산` 비율과 섞인다. 기존 `Test` 채점에 붙이면 단원과 문항 id가 필요하고, 적은 답의 맞음은 검사되지 않는다.

## 막을 것 (계획 문장)

B1. P1 구현 범위의 「사용 허용된 기존 문항」과 Grok 프롬프트의 「해설/검산 근거」「사용 허용·검증된 문항」. 11~17행과 동시에 참이 될 수 없다.
B2. P1 완료 판단과 시나리오 5의 「기존 채점/복습 진입」, 1B의 「기존 시험지/채점 표준을 재사용」. 관찰 8~10 때문에 MVP 완료 조건으로 두면 문항이 `Problem`/`Test`로 들어간다.
B3. 시나리오 5의 「초등 한 과정과 중등 한 과정」. 과정 단위는 도형·문장제를 포함한다. 스킬 목록과 `domainSize`가 없다.
B4. 중복의 동일성 키와, 가능한 문항 수보다 요청이 클 때의 거절이 없다.

## 계획에 넣을 문장

최상위 목표 둘째 문장: 「두 번째로 전용 연산 엔진이 만든 연습지를 저장·인쇄한다. 출력은 문제지와 답만 있는 정답지다.」

P1 구현 범위: 「새 `src/lib/arithmetic/`의 명세→발문·정답. 기존 엔진 장과 문제은행 행은 원천이 아니다. 저장은 새 `WorkspaceDocument` kind. 인쇄는 문제지와 정답지만.」

P1 완료 판단: 「같은 설정과 시드는 같은 명세다. `verify`가 피연산자로 답을 다시 계산한다. 요청 수가 그 스킬의 `domainSize`를 넘으면 생성이 거절된다. 저장 후 다시 열면 같은 문제지와 정답지가 나온다. 해설 칸은 없다.」

시나리오 5: 「MVP 스킬 목록에서 수량·조건·시드를 정해 문제지와 정답지를 낸다. 목록에 없는 조합은 생성 버튼이 꺼진다. 학생 채점과 다음 회차 재연습은 이 시나리오에 넣지 않는다.」

1B 소유: 「카탈로그, 뽑기, 렌더, `verify`, 고갈 거절, 저장 payload 계약과 단위 테스트. `Problem`/`Test` 삽입, 채점 화면, `ScopePicker`는 수정하지 않는다.」

Grok 프롬프트에서 삭제할 요구: 해설/검산 근거를 문항에 넣기, 사용 허용 문항을 원천으로 쓰기, 공통 채점 어댑터를 MVP에 포함하기. 대신 지원 스킬·제외 스킬·스킬별 `domainSize`·동일성 키를 보고한다.

벤치마크 76행은 근거로 인용하지 않는다고 계획에 한 줄 추가한다. 문제은행 수량 계약은 그대로 둔다.

문제은행 쪽 추가 문장: 보유는 `count`, 출력 가능은 `open`(`problemEligibleWhere`), 검증 변형은 자격 있는 `tb-retry-v1:${id}:1|2`의 개수, 담김은 학습지 payload다. 네 수를 한 합계로 합치지 않는다. 0/2는 그 키가 없거나 자격이 없는 상태다. 유사 문항으로 빈 슬롯을 채우지 않는다. 기출 원문의 `directUseAllowed=false`는 유지한다. ScopePicker는 차시 목록으로 두고, 책/쪽/번호와 시험지 탐색은 별도 고르기다. 1C 화면 착수는 DESIGN.md의 Wire→Hi-fi 확정 다음이다. 1A 읽기 계약은 그 전에 가능하다. `width={880}`은 소스와 같고, 배포 CSS 실측 문장은 유지한다.

브랜드: 보이는 제품명만 `오늘 수학`/`오늘 영어`. `오늘의 기억`과 API·DB 키·내보낸 JSON 스키마는 유지한다. 연산 MVP와 순서를 묶지 않는다.

추가 추천 표의 연산 분석·OCR/AR, SMS·교육비·제본·경시 주문은 지금 위치에 둔다.

인쇄를 바꾸는 단계의 완료 조건에 `/dev/print-check` 항목 추가를 넣는다. 실물 출력 검수는 그 항목의 통과다.

## 결정할 것 (구현 상수)

1. 엔진은 신규 `src/lib/arithmetic/`다. 문항 원천은 이 카탈로그의 명세뿐이다. `generateElementaryProblem`, `g3.ts`~`g6.ts` 장, 중등 `def`, 난이도 `연산` 필터, 문제은행 행은 가져오지 않는다. `src/lib/elementary/math.ts`의 순수 사칙과 세로셈 표시 `columnOp`만 부품으로 쓴다.
2. MVP 스킬은 일곱이다. 한 자리 덧셈(받아올림 없음/있음), 한 자리 뺄셈(결과가 0 이상), 두 자리 세로 덧셈(받아올림 0/1/2), 두 자리 세로 뺄셈(받아내림 0/1, 피감수≥감수), 곱셈구구, 두 자리×한 자리, 나머지 0인 두 자리÷한 자리. 각 스킬은 테스트로 잠근 `domainSize`를 공개한다. 분수·소수·혼합 계산·음의 정수는 다음 단계다. 중등 한 과정은 MVP에 없다. 문장제·도형·공식 선택·「받아올림은 몇 번인가」는 카탈로그에 없다.
3. 스킬 안 난이도는 자릿수와 받아올림 횟수다. 제품 난이도 `연산|기본|응용|심화`를 이 문항에 붙이지 않는다. `Problem` 행으로 저장하지 않는다.
4. 공개 문항은 `skillId`, `prompt`, `answer`, `figureSpec|null`이다. `solution`은 없다. `verify(spec)`은 피연산자와 연산으로 답을 계산하고, 뽑기·렌더를 import하지 않는다. 시험은 시드 재현, 고정 예시의 검산, 피연산자를 바꿨을 때 답이 바뀜, 생성기가 틀린 답을 찍으면 실패, 도메인 초과 거절을 포함한다.
5. 동일성 키는 `skillId`와 순서 있는 피연산자다. 3+8과 8+3은 다른 문항이다. 같은 답의 다른 식은 허용한다. 한 장 안에서는 키가 유일하다. `domainSize`보다 요청이 크면 장 전체를 거절하고 가능 수와 요청 수를 반환한다. 반복이나 은행 문항으로 채우지 않는다. 장 사이의 미사용 제외는 MVP 밖이다.
6. 저장 kind는 `arithmetic-sheet`다. payload는 카탈로그 버전, 시드, 설정, 발문·정답·그림이다. 다시 열면 이 값이 그대로다. 인쇄는 문제 페이지와 정답 페이지만 내고, `quickAnswerOnly`를 켜며 solution을 넘기지 않는다. 화면은 Wire→Hi-fi 다음이다.
7. MVP의 끝은 생성, 독립 검산, 고갈 거절, 저장 재열기, 문제지, 정답지다. 학생 답 채점과 재연습 장, 시간·성취 분석은 후속 표에 둔다. 문제은행 P0와 브랜드 표시 변경은 별도 단계로 먼저, 또는 병렬로 간다.


