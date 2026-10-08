# 작업실 UI 메뉴별 적용표

2026-10-08, 소스 기준 `a4c0e005b`. **공통 규격은 루트 [DESIGN.md](../../DESIGN.md)**가 소유한다. 이 문서는 현재 메뉴·파일·데이터 경계와 남은 차이를 기록한다. 기존 `94051e780` 분석의 보라색 문제은행·38px 제작 버튼·3열 담기·상단 단계 배너는 이번 정렬 전의 상태이며 현재 구현으로 읽지 않는다. 이전 분석은 Git 이력에 남아 있다.

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

구현: [EnglishQuestionBank](../../src/components/english/EnglishQuestionBank.tsx), [CSS](../../src/components/english/EnglishQuestionBank.module.css), [EnglishBankPrint](../../src/components/english/print/EnglishBankPrint.tsx).

- 검색·조건 → 결과 수 → 목록/상세 → 접힌 담기 → 출력 순서다. 제목은 셸에서 한 번 그린다.
- `.workspace`는 목록 `minmax(260px,.75fr)` + 상세 `minmax(0,1.6fr)`, gap 16px. 담기는 영구 세 번째 열이 아니다.
- container `english-question-bank` 1000px에서 검색 전폭, 680px에서 목록/상세 한 열과 조건 2열. 좁은 목록은 최대 360px의 독립 스크롤이다.
- native details/summary로 담기를 펼친다. 요약 최소 52px, 목록 최대 `min(320px,38dvh)`. 제거·순서·선택 수를 유지한다.
- 본문 읽기 폭은 현재 최대 78ch다. 원본 개정 확인·resolve·출력 상한·지면 계약을 시각 수정으로 우회하지 않는다.

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

### 시험지 만들기 개편 시안의 공통 마지막 단계 — 사용자 결정, 2026-10-08

- 범위 선택 → 문항 구성·검토 다음에는 문제 추출의 마지막 **시험지 구성** 화면을 함께 사용한다. 시안마다 간단한 출력 폼을 별도로 만들지 않는다.
- 공통 구현 기준은 `UnifiedWorkspace`의 export 단계가 사용하는 `WorksheetEditor`와 그 안의 `PrintOptionsPanel`, `WorksheetPrint`다. 기존 여섯 양식과 세부 인쇄 설정을 재사용한다.
- [5개 시안](mockups/exam-builder-common-20261008/README.txt)은 `/dev/exam-builder-output`에서 실제 컴포넌트를 재사용한다. 선택한 문항·제목·순서를 넘기고, 검토 화면으로 복귀할 때 변경을 반영한다.
- 이는 개발용 시안 연결이다. 운영 영어 `EnglishBankPrint`나 수학 문제은행의 제작 진입 흐름을 전환한 상태는 아니며, 실제 저장·권한·문항 계약의 통합은 운영 구현 때 유지해야 한다.

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
