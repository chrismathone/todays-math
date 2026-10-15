# 작업실 UI 메뉴별 적용표

2026-10-08, 기본 소스 기준 `a4c0e005b`, 시험지 만들기는 같은 날 D안 실제 연결까지 갱신했다. **공통 규격은 루트 [DESIGN.md](../../DESIGN.md)**가 소유한다. 이 문서는 현재 메뉴·파일·데이터 경계와 남은 차이를 기록한다. 기존 `94051e780` 분석의 보라색 문제은행·38px 제작 버튼·3열 담기·상단 단계 배너는 이번 정렬 전의 상태이며 현재 구현으로 읽지 않는다. 이전 분석은 Git 이력에 남아 있다.

## 1. 화면과 여백의 소유자

| 역할           | 현재 소스                                                                                                                                   | 책임                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 셸             | [UnifiedWorkspace.tsx](../../src/components/unified/UnifiedWorkspace.tsx), [Workroom CSS](../../src/components/unified/Workroom.module.css) | 전역 탐색·breadcrumb·검색·계정·최대화, 외곽 여백                |
| 페이지 제목    | [WorkspacePageHeader](../../src/components/unified/WorkspacePageHeader.tsx)                                                                 | 활성 h1·설명·페이지 행동. 자식은 중복 제목을 만들지 않음        |
| 영어 작업 상태 | [EnglishStudio.tsx](../../src/components/english/EnglishStudio.tsx)                                                                         | 시험 선택, 메뉴별 PersistentView, 자료·세트 로드, 편집·대화상자 |
| 독립 듣기      | [ListeningTeacherWorkspace CSS](../../src/components/english/listening/ListeningTeacherWorkspace.module.css)                                | `.standalone`만 외곽 여백. 셸 내부 `.workspace`는 padding 0     |

현재 `.viewContent/.studioContent/.library`는 셸의 페이지 여백을 받는다. EnglishStudio와 Maker가 같은 여백을 다시 더하지 않는다. 새 메뉴를 만들 때 먼저 어느 부모에서 렌더링되는지 확인한다.

## 2. 영어 여섯 메뉴

### 오늘의 작업 — `english`

구현: [EnglishPrepView](../../src/components/english/EnglishPrepView.tsx), [EnglishPrep CSS](../../src/components/english/EnglishPrep.module.css), [EnglishExamPicker](../../src/components/english/EnglishExamPicker.tsx).

- 주 영역: 학교·시험 맥락, 시험 자료, 최근 문제 세트. 보조 영역: 날짜·실제 준비 수량·설정.
- 넓은 화면은 주 열+340px, 1250px 이하 보조 열 300px, 1050px 이하 한 열. 패널 padding 20px, 모바일 16px.
- 학교 세 개 이하는 칩, 네 개 이상은 select. 선택한 학교의 첫 시험을 고르는 기존 동작을 유지한다.
- 자료 추가·사진 읽기·출제 설정·시험 삭제는 기존 하위 작업이다. 새 최상위 메뉴로 늘리지 않는다.
- 실제 상태 수량은 섹션 이동에 쓰이며 별도의 장식 KPI나 추정 완료율을 만들지 않는다.

### 시험지 만들기 — `english-questions`

구현: [EnglishExamBuilder](../../src/components/english/EnglishExamBuilder.tsx), 공통 [ExamBuilder](../../src/components/exam-builder/ExamBuilder.tsx), [EnglishExamOutput](../../src/components/english/EnglishExamOutput.tsx).

- 확정 D안의 범위 → 문항 검토 → 공통 양식·출력이다. 저장된 세트를 범위로 사용하며 과목을 다시 선택하지 않는다.
- 제목·구성표 왼쪽 / 문항 오른쪽 50:50, 한 행에 한 문항. 가용 폭 860px 이하에서 한 열로 전환한다. 범위·문항 후보는 페이지 단위로 표시한다.
- 원본 난이도와 ‘미지정’을 구분한다. 추가·교체·삭제·되돌리기와 드래그/키보드 순서 변경을 지원한다.
- 마지막 단계는 실제 `WorksheetEditor`다. 영어 원문·보기·밑줄·정답을 native 계약으로 유지하고 출력 직전 원본 개정을 다시 확인한다. 누출 분리 묶음과 미검토 확인을 유지한다.
- 영어 작업 저장은 현재 화면의 임시 보관과 JSON 다운로드다. 수학의 계정별 클라우드 초안 기능으로 설명하지 않는다. 기존 `EnglishQuestionBank`/`EnglishBankPrint` 소스는 남아 있으나 이 메뉴의 기본 진입이 아니다.

### AI 문제 제작 — `english-maker`

구현: [EnglishMakerView](../../src/components/english/EnglishMakerView.tsx), [EnglishMaker CSS](../../src/components/english/EnglishMaker.module.css), [EnglishMakerPreview](../../src/components/english/EnglishMakerPreview.tsx).

- 현재 부모가 페이지 헤더와 시험 선택기를 그린다. Maker는 외곽 padding 0, 조건 `.85fr` + 결과 `1.15fr`, gap 24px다.
- named container 860px 이하에서 두 열을 쌓고 결과 저장판을 static으로 바꾼다. 480px 이하에서 세부 조건·행동을 재배치한다. 결과 내부 preview는 별도 700px container 분기다.
- API 제작, 외부 결과 가져오기, 원문 복원/빈칸 제작의 기존 입력 검증·자료 연결·취소·초안 저장을 유지한다.
- **현재 기능 제약:** 생성 요청의 examId로 소유 권한과 학년을 확인하며, 출제 유형 초기값도 시험 설정에서 가져온다. 저장은 `POST /api/english/exams/{id}/sets`다. 이전 선택이 없으면 EnglishStudio가 첫 시험을 자동 선택한다.
- **사용자 지적(2026-10-08):** 범용 AI 제작 메뉴에 학교·시험이 먼저 선택되어 있는 이유가 불명확하다. 생성 조건과 보관/시험 연결을 구분하는 정보 구조가 필요하다. 독립 제작을 기본으로 하고 저장 때 시험 연결을 선택하는 방안은 제품·API 변경 후보이며, 현재 지원되는 기능으로 표시하지 않는다.
- 따라서 현재의 필수 시험 선택을 공통 디자인 원칙으로 확대하지 않는다. 독립 제작을 구현할 때는 생성·소유 권한·저장·자료은행 연결·기존 세트 호환을 함께 변경해야 한다.
- 학교명 자체로 기출 경향을 분석하는 기능은 없다. 직접 생성 경로는 시험에서 학년을 가져오며, 외부 ChatGPT 요청문에는 학교명이 대상 라벨로 포함되지만 기출 분석 근거가 되는 것은 아니다. 홈의 과장된 `학교 맞춤 문제 만들기` 표현은 `AI 문제 제작`으로 정정한다.

### 내 문제 세트 — `english-library`

구현: [EnglishLibraryView](../../src/components/english/EnglishLibraryView.tsx), [EnglishEditor](../../src/components/english/EnglishEditor.tsx), [CSS](../../src/components/english/EnglishLibrary.module.css).

- 현재 조회 범위는 선택한 시험이다. 이름/상태 조건 → 실제 결과 수 → 정렬된 행 목록 → 열기다.
- 행은 `minmax(0,1fr) 100px 64px 80px 16px`. container 600px 이하에서 이름·메타·상태를 재배치하고 시각 열 제목을 숨긴다.
- 한 행은 실제 열기 버튼이다. 안에 다른 버튼을 중첩하지 않는다. 편집 모드는 EnglishStudio 내부 상태로 전환되며 독립 라우트가 아니다.
- 편집 카드 padding 24px, 좁은 viewport 16px, editor container 480px 이하에서 정답·해설을 쌓는다.
- 수학 PrivateLibrary의 전 계정 자료·사본/소유자 기능을 영어에도 있는 것처럼 설명하지 않는다. 전체 시험 통합 보관함도 현재 기능이 아니다.

### 시험지 만들기 공통 마지막 단계 — D안 실제 적용, 2026-10-08

- 범위 선택 → 문항 구성·검토 다음에는 문제 추출의 마지막 **시험지 구성** 화면을 함께 사용한다. 시안마다 간단한 출력 폼을 별도로 만들지 않는다.
- 공통 구현 기준은 `UnifiedWorkspace`의 export 단계가 사용하는 `WorksheetEditor`와 그 안의 `PrintOptionsPanel`, `WorksheetPrint`다. 기존 여섯 양식과 세부 인쇄 설정을 재사용한다.
- [5개 시안](mockups/exam-builder-common-20261008/README.txt)은 `/dev/exam-builder-output`에서 실제 컴포넌트를 재사용한다. 선택한 문항·제목·순서를 넘기고, 검토 화면으로 복귀할 때 변경을 반영한다.
- 확정된 D안은 범위 설정 → 문항 검토 → 양식 구성·출력의 세 단계 메뉴를 공유한다. 문항 구성 후 검토 단계가 활성화되며, 출력에서도 범위/검토로 돌아갈 수 있다. 단계 이동과 양식 재진입에서 제목·문항 순서·서식을 유지한다. 2026-10-15 사용자 지시에 따라 문제 추출도 같은 세 단계를 사용하고, 원본 가져오기와 잘라내기는 범위 설정의 하위 작업으로 둔다.
- 수학 `bank`는 `MathExamBuilder`, 영어 `english-questions`는 `EnglishExamBuilder`로 실제 진입을 전환했다. 수학 초안·저장·권한과 영어 native 원문·검토·resolve를 유지한다. 개발용 5개 시안은 비교 이력으로 남는다.
- 시험지 로딩은 최근 작업 메타데이터와 현재 초안만 먼저 읽고 나머지는 열 때 읽는다. 저장 전 실제 복원 완료를 기다리며 실패를 준비 완료로 처리하지 않는다. [적용·검증 기록](exam-builder-implementation-20261008.md)을 참고한다. 소스 적용과 운영 배포는 구분한다.

### 연산대장과 수학 출처 탐색 — 2026-10-14

수학의 `시험지 만들기`와 `연산대장`은 왼쪽 메뉴에서 독립적으로 연다. [ArithmeticWorkbench](../../src/components/arithmetic/ArithmeticWorkbench.tsx)는 승인된 A 구조·기존 작업실 시각안을 유지하되, 모든 시험지 제작과 같은 `1 범위 설정 → 2 문항 검토 → 3 양식 구성·출력`으로 진행한다. 학년 선택기의 `기초 연산`에서 기존 스킬군·프리셋과 세부 조건을 연다. 학년별 목록은 초2~중3에서 구현된 수·분수·소수, 문자식·방정식·인수분해, 함수, 확률과 통계, 도형의 직접 연산을 제공한다. 유형 수는 현재 카탈로그와 필터에서 계산하며, 각 학년의 모든 학습 활동을 지원한다고 표시하지 않는다. 초1의 인식·비교·작도 활동을 임의의 공식 연산으로 만들지 않는다.

유형 선택 화면은 학년·연산 영역·검색과 무작위 유형 수·담기 조작을 구분해 한 행에 배치한다. 카드는 유형 이름과 학년·학기·단원만 보여 주며, 넓은 화면에서는 네 열을 유지해 마지막 페이지의 카드가 늘어나지 않게 한다. 담은 유형 목록은 패널 안에서 스크롤하고, 행별 선택·전체 선택·선택한 유형 빼기를 제공한다. 새 생성은 회차당 최대 200문항, 최대 10회차다. 한 회차 안에서는 중복을 금지하고, 회차 사이 같은 문제의 비율은 두 회차 중 작은 문항 수의 20% 이하로 제한한다. 기존 20회차 저장본은 계속 읽는다.

2026-10-15 추가 결정: 문항 검토의 회차는 탭으로 선택하고 한 회차씩 보여 준다. 문항 체크 선택과 유형 섹션별 숫자 변경을 제공하며, 선택하지 않은 문항·회차·제목·양식은 유지한다. 중복 없이 바꿀 수 있는 식이 없으면 유지한 문항을 안내한다. 출력의 회차는 서식 위의 별도 머릿글로 두지 않고 여섯 양식 각각의 제목 띠·정보 칸 안에 표시한다. 도형의 빈 각은 물음표 없이 각 표시만 남기며, 주어진 각도 수치가 모호하면 연결선으로 바깥에 배치한다. 저장 데이터에는 검증한 SVG도 포함해 복원·출력 때 도형을 새로 생성하지 않는다.

도형 확장 통합: 문항 검토·출력에서 수치 조건과 답의 단위를 함께 보여 준다. 검토의 도형은 긴 변 280px 기준이며, 인쇄에서는 공통 지면 크기 계산을 따른다. 변의 수 등을 역산하는 문제에서 그림이 답을 드러내면 텍스트 조건만 제공한다. 새 도형은 해당 시험지에 사용한 SVG만 압축해 보관하고, 선택 재생성 시 변경된 문항과 도형 묶음을 함께 갱신한다. 기존 삼각형 81문항의 저장 형식은 그대로 읽는다. 초등 원주율은 문제에 3 또는 3.14를 명시하고, 중등 π·근호 답은 정확한 기호식으로 표시한다. 치수선 표시 수정은 실제 도형 편집기 명령과 글자·가림 처리를 사용한 별도 표시 계층이며, 저장된 원본 SVG와 문제 조건을 덮어쓰지 않는다. 통합 검증 범위와 구체적인 제외 항목은 [도형 확장 검증 기록](../reports/arithmetic-geometry-expansion-20261015.txt)과 [편집기 표시 통합 검증 기록](../reports/arithmetic-editor-integration-20261015.txt)을 따른다.

2026-10-15 추가 사용자 결정: 본문에 관계·수치·구할 값이 모두 있는 연산 유형은 그림을 생략한다. 그림이 필요한 유형은 점의 위치나 각의 대응처럼 본문에 없는 조건이 무엇인지 유형별로 검토한다. ‘겨냥도’ 안내, 반복되는 넓이·밑넓이 주석, 구할 대상 이름만 붙인 치수선은 표시하지 않는다. 이 표시 기준은 검토·출력·기존 저장본 복원에 함께 적용하며 원본 문항과 SVG 저장 형식은 보존한다.

출력은 수학 문제은행·추출 문항·연산이 공통 `WorksheetEditor`의 왼쪽 `PrintOptionsPanel`과 오른쪽 `PaperStrip` 전체 페이지 미리보기를 사용한다. 페이지를 누르면 확대하고, 출력에는 원본 크기의 문서를 한 벌만 사용한다. 단계·내보내기 버튼과 저장 안내는 인쇄에서 제외해 별도 페이지를 만들지 않는다. 연산은 답만 있는 정답지를 제공하며 해설 선택을 노출하지 않는다. 생성은 코드에서 즉시 수행하며, 저장된 문제·답과 선택한 출력 양식은 재생성 없이 복원한다. 인쇄는 물리 A4와 paper 토큰 예외를 유지한다.

`내 시험지`는 자료 종류와 `작업 중`을 구분하고 기록된 진행 단계를 표시한다. ‘이어서 작업’은 저장된 단계, 수정 아이콘은 해당 제작기의 출력 설정, 정보 아이콘은 저장된 메타데이터와 이름 수정, 삭제 아이콘은 확인 후 삭제로 이어진다. 저장 기록이 없는 단계는 완료라고 추정하지 않는다. 페이지 재방문은 빈 작업으로 시작하고 기존 자동저장과 미전송 복구 자료는 명시적으로 열 때까지 보존한다. 연산 저장은 기존 쓰기 기능 게이트를 유지한다.

문항의 `내 출제`와 유형의 `내 학습지 사용`은 개인의 실제 기록이 충분할 때만 표시한다. 같은 차시/연산 기호, 최근 30일, 횟수·기준 시각을 함께 설명한다. 화면을 여는 것으로 기록을 만들지 않는다. 자료별 출제 가능 수와 전체 보유량을 구분하며, 교과서 자료 선택기는 880px 중앙 모달과 페이지별 20행을 쓴다. 출제 불가 자료·확인 전인 수학 차시는 선택할 수 없다. [구현·검증 및 운영 전환 경계](../reports/bank-arithmetic-ui-20261014.md)를 참고한다.

연산 유형 카드와 세부 조건에는 생성 가능한 조합 수를 표시하지 않는다(2026-10-14 사용자 결정). 즉시 생성하는 유형이 저장된 문항 재고로 오해되지 않도록 실제 생성할 문항 수와 회차 수를 중심으로 표시한다. 중복 없는 조합 수와 요청 한도 검증은 엔진 내부에서 유지한다.

2026-10-15 사용자 결정: 연산은 생성·검토·양식 변경 시 자동저장하지 않는다. 마지막 양식 구성·출력 단계에서 ‘내 시험지에 저장’을 누른 완성본만 저장한다. 저장한 문항·정답·회차·양식을 재생성 없이 복원하며, 출력 단계에서 저장한 연산은 ‘작업 중’ 자동저장 목록에서 제외하고 연산 연습지 목록의 수정으로 연다. 기존 문제은행·추출 작업의 자동저장은 유지한다. 운영 저장 활성화는 사용자 요청으로 보류하며 기존 쓰기 게이트와 DB 제약은 변경하지 않는다.

### 영어듣기 — `english-listening`

구현: [ListeningStudio](../../src/components/english/listening/ListeningStudio.tsx), [ListeningTeacherWorkspace](../../src/components/english/listening/ListeningTeacherWorkspace.tsx), [CSS](../../src/components/english/listening/ListeningTeacherWorkspace.module.css).

- 공통 페이지 제목 → 듣기 자료/만들기/과제와 결과 → 선택 자료/작업. 세 영역 선택은 aria-pressed 버튼이며 ARIA tablist로 구현된 것은 아니다.
- `.split`은 `minmax(220px,.65fr) minmax(0,1.5fr)`, gap 24px. container 850px 이하에서 쌓고 목록 최대 높이를 220px로 제한한다. 상세 container 420px에서 라벨/값을 쌓는다.
- 재생기·대본·문항·과제·결과는 이 화면의 실제 기능이다. 공통화를 이유로 없애거나 Prep의 시험 선택을 추가하지 않는다.
- 저장 중 이동 제한, 수정 중 이탈 확인, 충돌·최신본 비교를 유지한다. 자료은행/과제 메뉴 권한도 그대로 적용한다.

### 자료은행 — `english-bank`

구현: [EnglishResourceBank](../../src/components/english/bank/EnglishResourceBank.tsx), [PassageBank](../../src/components/english/bank/PassageBank.tsx), [ListeningBank](../../src/components/english/bank/ListeningBank.tsx), [CSS](../../src/components/english/bank/EnglishResourceBank.module.css).

- 공통 제목 → 자료 종류 → 조건 → 목록/상세 → 사용 행동. 자료 종류는 실제 tablist/tab/tabpanel이며 방향키·Home·End 이동을 유지한다.
- 목록 `minmax(260px,.8fr)` + 상세 `minmax(0,1.5fr)`, gap 24px. resource-bank container 900px에서 상세 padding 축소, 760px에서 한 열, 420px에서 필터 한 열.
- 듣기 조건은 별도 listening-filters container 1040/680px에서 4열/2열로 재배치한다.
- 목록은 이름 있는 초점 가능한 스크롤 영역이다. 기본 최대 `min(60vh,40rem)`, 좁은 화면 18rem이며 선택 자료에도 접근할 수 있어야 한다.
- 출처·이용 조건·권리와 사용 이력은 필수 정보다. 권한 없는 듣기 탭을 숨기고 변경 중 이탈 보호를 유지한다.

## 3. 남은 구현 차이와 후속 점검

### 수학 채점 · 오답 복습 — `/tests/{id}/grade` (2026-10-11)

현재 진입은 확정·인쇄 시험지의 채점 버튼이며, 독립 채점 경로의 `AppChrome`을 유지한다. `UnifiedWorkspace`의 새 메뉴를 추가한 것은 아니다. [GradeSheet](../../src/components/test/GradeSheet.tsx)가 채점표와 저장을, [SavedRetryPanel](../../src/components/test/SavedRetryPanel.tsx)이 학생 선택·저장된 기록의 오답·원문별 변형 검토를 소유한다.

- 학생 선택은 자동으로 첫 학생을 고르지 않는다. 아직 안 봄·결시·오답 없음·채점 미완료·저장되지 않은 수정은 서로 다른 안내이며 복습 요청을 막는다. 저장 성공 후 채점표를 다시 읽어 실제 저장 기록 ID를 사용한다.
- `POST /api/tests/{id}/retry`의 조회 계획을 사용한다. 교과서 원문마다 지정 슬롯 1·2를 유지하며, 0/2·1/2와 전체 부족 수를 표시한다. 부족한 계획은 출력 단계로 넘기지 않는다. 일반 오답의 같은 갈래 묶음은 서버의 `foldedWrong`으로 따로 설명한다.
- 출력은 기존 [WorksheetEditor](../../src/components/unified/WorksheetEditor.tsx)·여섯 양식·PDF/HWPX 클라이언트를 사용한다. 기본은 풀이 공간이 있는 워크북이며 학생용 정답은 숨긴다. 이 경로에서는 문항 추가·제거·순서 변경·작업 저장을 노출하지 않아 지정 쌍을 보존한다. 출력 직전에 같은 저장 기록을 재조회해 권한 오류나 문항 변경을 차단한다.
- 복습 패널은 공유 토큰·44px 조작·760px 이하 한 열을 사용한다. 출력에서는 패널의 외곽 여백을 없애 `WorksheetEditor` 한 곳만 여백을 소유하며, 인쇄 CSS는 이 출력이 있는 경로의 셸·채점표만 제외한다.

검증은 [UI 보고서](../planning/tracks/reports/textbook-retry-ui-20261011/report.md)에 둔다. 독립 fixture의 넓은/좁은 브라우저 검증과 실계정·실DB 검증의 범위를 구분한다.

다음은 소스 감사에서 확인한 차이다. 문서 보강 과정에서 코드를 일괄 변경하지 않았으며, 결함 확정이나 접근성 통과 판정과 구분한다.

| 위치            | 현재 차이                                                                            | 다음에 해당 영역을 수정할 때                                     |
| --------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Workroom sticky | topbar 52px, sticky inset 68px; 최대화/모바일 조건별 cascade                         | 실제 겹침과 여유를 확인하고 임의 상수 복제 금지                  |
| 하단 고정       | 영어 담기 모바일 76px+safe area, 셸 bottom inset 77px; 넓은 Maker 저장판 bottom 0    | 하단 탐색과 마지막 내용 가림, 가용 폭 분기 확인                  |
| 버튼 높이       | 공통 primary/outline 일부는 fixed 44px와 nowrap                                      | 긴 라벨이 늘어날 수 있는지 확인. 규격의 최소 높이와 구분         |
| 색·타이포       | 헤더 설명 #52617a, 주 버튼 hover #274bbf, 로컬 메타/글자 값 일부 잔존                | 동일 역할의 토큰으로 정리할 때 실제 상태·대비 확인               |
| 초점·경계       | globals/Workroom #82a1ff, 문제은행 #a4b5ed 등                                        | 밝은 배경에서 충분한 시각 구분인지 확인. DESIGN의 대비 계산 참고 |
| 반경·상태       | 학습 토큰14/10, dialog18, player4, 듣기 주석의 왼쪽 선, 영어 검토 배지의 로컬 상태색 | 용도가 있는 예외와 단순 불일치를 구분해 수정                     |
| 자료은행 행     | `.rowButton`의 radius0보다 셸 `.workspace button` specificity가 높음                 | embedded/standalone 각각 최종 computed style 확인                |
| 문제은행 알림   | 결과/담은 수 live 안내와 담기 목록의 이름 있는 초점 영역은 추가 점검 대상            | 현재 동작을 전체 접근성 통과로 보고하지 않음                     |
| 보관함 맥락     | 선택기 아래 현재 시험 설명이 남아 있음                                               | 실제 중복 여부와 조회 범위 설명의 필요를 함께 검토               |
| 범용 AI 제작    | 시험에 생성·권한·저장이 묶여 있음                                                    | 학교/시험 맥락과 제작 조건을 구분하는 제품 설계 검토             |

수학 홈은 넓은 화면에서 주 열+340px(1600px 이상 360px), 최근 목록과 viewport 관련 높이 계산을 사용하는 별도 구성이다. 이를 모든 화면에 고정 높이를 걸라는 규칙으로 복제하지 않는다. 모바일 홈은 마지막 여백 24px도 따로 가진다.

## 4. 확인 방법과 기능 경계

개발 전용 `/dev/workspace-alignment#english`는 실제 UnifiedWorkspace에 자체 작성 예시 데이터를 제공한다. 다른 영어 메뉴와 수학 홈으로 이동해 비교할 수 있다. production에서는 404이며 실제 계정 API 저장·유료 생성은 이 화면의 검증 대상이 아니다.

[통합 검증 보고](english-workspace-alignment-20261008.md)에 폭별 캡처·가로 넘침·페이지 오류·담기/인쇄/최대화와 테스트 결과를 기록했다. 이번 문서 보강에서는 현행 CSS의 최종 선언, 링크, 규칙과 구현의 구분을 추가 감사했다. 수치 표를 만들었다는 사실을 모든 화면의 런타임 재검증으로 표현하지 않는다.

시각 수정에서도 보존할 계약:

- 메뉴·계정·지점의 서버 권한과 선택 범위.
- PersistentView/hidden의 입력·초안·편집 상태 보존.
- 자료은행 원본 revision, 사용 조건, 생성 자료 참조의 확인.
- 초안/검토 상태, 재시도 시 다른 시험에 저장하지 않는 보호.
- 인쇄 resolve, A4 지면, 학생용/교사용 답 노출.
- 듣기 재생·과제·결과 및 학생 탐험의 독립 흐름.

기존 디자인 이력은 [05 디자인 시스템](../planning/05-design-system.md), 공통 숫자·상태·조합 예시는 [DESIGN.md](../../DESIGN.md)를 따른다. 적용표에는 같은 토큰 표를 다시 복제하지 않는다.
