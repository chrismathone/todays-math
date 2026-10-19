# 인쇄 정보·강조 색상 독립 읽기 전용 감사 — 2026-10-19

감사 결론: 확인한 코드에서 **이미 존재하는 지면 자리로의 입력 배선 결함은 발견하지 못했다.** 공통 시험지 정보 9개는 정통의 자체 표 또는 나머지 5개 템플릿의 공통 ExamDetails에 출력된다. 전용 필드 6개는 해당 템플릿만 사용한다. 시험 종류 미출력은 기존에 명시된 설계이며, 브리프 맨 끝의 “모든 양식에 출력”은 이를 바꾸는 새 요구다.

## 1. 범위와 기준

- 기준 소스: /Users/pss/Desktop/creative/today-print-color. 감사자의 checkout은 소스 판정에 사용하지 않았다.
- 기준 HEAD: 86fb78a678942904f9cfc5e31f79d2e3cb10f5bb.
- 브리프: [brief-print-info-color-codex.md](/Users/pss/Desktop/creative/today-print-color/docs/planning/tracks/brief-print-info-color-codex.md:25). 맨 끝 추가 지시가 앞의 일반 지시보다 우선한다.
- 현재 구현의 사실, 의도적으로 없는 구성, 새 요구를 구분했다. 모든 필드를 모든 양식에 새로 추가하는 것을 배선 수정으로 판정하지 않았다.
- 소스·테스트·CSS·PDF 연결을 정적으로 읽었다. 서버 실행, DB 접근, 브라우저 렌더, 실제 인쇄·PDF 생성, 테스트·type-check·lint 실행은 하지 않았다. 위치는 JSX 구조와 조건에 따른 위치이며 실측 좌표가 아니다.
- 추가 worker를 만들지 않았다. 소스 수정, git add, commit, push를 하지 않았다. 작성물과 증거 사본은 /tmp에만 두었다.
- 주 작업자의 종료 요청에 따라 추가 탐색을 중단하고 지금까지 확인한 내용으로 이 보고서를 확정했다.

감사 도중 기준 소스가 다른 작업으로 변경됐다. 최초 열람한 ExamDetails는 선택색을 정보 글자에 그대로 사용했다. 이후 읽은 작업 파일에는 readablePaperColor 호출이 추가됐다. **현재 작업 파일의 대비 보정 반영 상태를 최종 판정으로 사용**하며, 이를 이 감사자가 수정한 것으로 기록하지 않는다.

고정한 증거 사본은 /tmp/print-info-color-audit-evidence-20261019-t6_1f3ko이며, 2026-10-19 10:15:30 KST에 기준 소스에서 85개 파일을 복사했다. manifest.json에 원본 경로, HEAD, 당시 상태, SHA-256이 있다. 당시 소스 상태는 ExamDetails 수정 및 브리프·dev/print-color-hifi 미추적이었다. 진행 중인 dev 시안의 완성도는 이번 감사의 판정 대상이 아니다.

## 2. 정보 입력 15개 × 템플릿 6개의 실제 지면

표의 G는 첫 문제 쪽의 공통 ExamDetails 줄이다. “없음”은 해당 템플릿에 그 전용 정보의 출력 자리가 없다는 뜻이다. 시험 종류는 PrintMeta 15개에 속하지 않는 별도 입력으로 함께 표기했다.

| 입력 / 데이터 | 평가원 | 정통 | 모던 | 워크북 | 자습 | 유형 |
|---|---|---|---|---|---|---|
| 시험 종류 / tag | 독립 출력 없음 | 독립 출력 없음 | 독립 출력 없음 | 독립 출력 없음 | 독립 출력 없음 | 독립 출력 없음 |
| 제목 / title | 첫 쪽 ‘홀’ 옆 + G | 정보 표 맨 윗줄 | 학기가 비면 작은 머리글 + G; 제목으로 평가 꼬리표 판정 | 검정 단원 배너 + 매 쪽 푸터 + G | 큰 제목 + G | 유형명이 비면 배너 제목으로 대체 + G |
| 학교/기관명 / schoolName | G | ‘학교’ 값 칸 | 큰 머리글 + 매 쪽 푸터 + G | G | G | G |
| 학년 / grade | G | 정보 표 ‘학년’ 값 칸 | 머리글 + 학생 정보 ‘학년’ 값 + 푸터 + G | G | G | G |
| 과목 / subject | ‘과목 영역’ 큰 표·간소 머리글·푸터 + G | 정보 표 ‘과목’ 값 칸 | 머리글·푸터 + G | G | G | G |
| 학기 / semester | G | 과목 값에 ‘ · 학기’로 병합 | 작은 머리글 + G | G | G | G |
| 시험일 / examDate | G | ‘일시’ 값 칸 | 머리글의 날짜 + G | 우상단 ‘일자’ 값 + G | 우상단 ‘학습일’ 값 + G | G |
| 시험 시간 / examDuration | G | ‘시간’ 값 칸 | 머리글 날짜 다음 + G | G | G | G |
| 출제자 / examiner | G의 ‘출제 이름’ | 정보 표 ‘출제’ 값 칸 | G의 ‘출제 이름’ | G의 ‘출제 이름’ | G의 ‘출제 이름’ | G의 ‘출제 이름’ |
| 총점 / totalScore | G의 ‘총점 n점’ | 학생 점수 표의 ‘/n’ | 머리글 ‘n점’ + 점수 칸 ‘/n’ + G | G | G | G |
| 학원명 / academyName | 없음 | 없음 | 없음 | 상단 로고 첫 글자·학원명 + 매 쪽 푸터 | 없음 | 없음 |
| 강사명 / instructorName | 없음 | 없음 | 없음 | 우상단 ‘강의 · 이름 T’ | 없음 | 없음 |
| 오늘의 목표 / todayGoal | 없음 | 없음 | 없음 | 없음 | 큰 제목 아래 ‘오늘의 목표 · 내용’ | 없음 |
| 개념 정리 / conceptNote | 없음 | 없음 | 없음 | 없음 | 제목 아래 흰 개념 박스의 Markdown 본문 | 없음 |
| 유형명 / patternName | 없음 | 없음 | 없음 | 없음 | 없음 | 검정 PATTERN 배너의 큰 흰 글자 |
| 핵심 전략 / patternStrategy | 없음 | 없음 | 없음 | 없음 | 없음 | 배너 바로 아래 전략 행의 본문 |

### 공통 ExamDetails의 실제 동작

[ExamDetails.tsx:12](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/ExamDetails.tsx:12)는 제목·학교/기관명·학년·과목·학기·시험일·시험 시간·출제자·총점 **9개를 모두** 순서대로 모아 “ · ”로 연결한다. 출제자는 “출제 …”, 숫자 총점은 “총점 …점”으로 출력한다. 나머지 값에는 별도 필드 라벨이 없다. 시험일만 showDate 조건을 따른다. 빈 값은 filter(Boolean)으로 제외한다.

이 줄은 다음 5개 템플릿에서 각각 isFirstPage 조건으로 본문 앞에 들어간다.

| 템플릿 | G의 위치와 코드 근거 |
|---|---|
| 평가원 | 큰 영역 표·‘홀’ 안내 다음: [PyeonggaTemplate.tsx:194](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/PyeonggaTemplate.tsx:194) |
| 모던 | 학교 머리글·학생 정보·유의사항 다음: [ModernTemplate.tsx:282](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/ModernTemplate.tsx:282) |
| 워크북 | 학원 헤더·검정 단원 배너 다음: [WorkbookTemplate.tsx:274](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/WorkbookTemplate.tsx:274) |
| 자습 | 제목·목표·개념 박스 다음: [JaseupTemplate.tsx:304](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/JaseupTemplate.tsx:304) |
| 유형 | 검정 유형 배너·선택적 전략 행 다음: [YuhyungTemplate.tsx:221](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/YuhyungTemplate.tsx:221) |

정통은 ExamDetails를 쓰지 않는다. 자체 정보 표에 같은 공통 9개를 배치한다. [JeongtongTemplate.tsx:120](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/JeongtongTemplate.tsx:120), [총점 칸:257](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/JeongtongTemplate.tsx:257).

따라서 “유형에는 학교·학년·과목·학기·시험일·시간·출제자·총점이 없다”는 판정은 현재 구현과 다르다. 유형의 큰 검정 배너에는 이 정보가 없지만, 바로 아래 G에는 출력된다. 모던·워크북·자습·평가원도 자체 머리글의 생략과 지면 전체의 생략을 혼동하면 안 된다. 일부 정보와 제목이 고유 자리와 G에 중복되는 것도 현재 구현의 사실이다.

### 고유 자리와 조건

- 평가원: [영역·제목:96](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/PyeonggaTemplate.tsx:96), [푸터:208](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/PyeonggaTemplate.tsx:208).
- 정통: [학교·학년·과목·학기·일시·시간·출제:166](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/JeongtongTemplate.tsx:166).
- 모던: [학기/제목·학교·학년·과목·일시·시간·총점:121](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/ModernTemplate.tsx:121), [제목에서 중간/기말/평가 판정:175](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/ModernTemplate.tsx:175), [학생 정보:196](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/ModernTemplate.tsx:196), [푸터:310](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/ModernTemplate.tsx:310).
- 워크북: [학원·강사·일자:141](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/WorkbookTemplate.tsx:141), [단원 배너:210](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/WorkbookTemplate.tsx:210), [푸터:301](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/WorkbookTemplate.tsx:301).
- 자습: [제목·목표·학습일:171](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/JaseupTemplate.tsx:171), [개념 정리:265](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/JaseupTemplate.tsx:265).
- 유형: [유형명/제목:141](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/YuhyungTemplate.tsx:141), [전략 행:174](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/YuhyungTemplate.tsx:174).

일반 시험지는 첫 문제 쪽에 전체 정보가 나오고, 연산은 회차별 첫 쪽에 전체 정보가 다시 나온다. 연산의 이어지는 쪽에도 템플릿 고유 제목/배너와 회차는 유지하지만 G·상세 표·목표·개념·전략은 회차 첫 쪽 조건을 따른다. 이 차이는 누락 버그가 아니다. [WorksheetPrint.tsx:94](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/WorksheetPrint.tsx:94).

학생이 손으로 쓰는 빈칸도 구분해야 한다. 정통 학생 정보의 학년·반·번호·이름 칸, 모던의 반·번호·성명·감독 칸은 입력 메타를 넣는 자리가 아니다. 특히 모던의 “감독”은 출제자와 별개다. 워크북 배너의 이름/날짜 밑줄과 유형 전략 행의 이름/날짜 밑줄도 수기 기입란이다. 시험일은 위 표의 실제 날짜 자리로 출력된다. 유형에서는 전략 내용이 비면 수기 이름/날짜를 포함한 전략 행 전체가 생기지 않는다.

## 3. 패널에 보이는 정보와 값 처리

[PrintOptionsPanel.tsx:129](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/PrintOptionsPanel.tsx:129)에 따라 제목과 공통 정보 8개는 모든 템플릿에서 입력 가능하다. 학원명·강사명은 워크북, 유형명·핵심 전략은 유형, 오늘의 목표·개념 정리는 자습일 때만 보인다. 전용 필드를 다른 템플릿에서 숨기는 것은 현재 설계다. 템플릿 변경 시 보관된 값을 지우는 코드는 없으며, 사용하지 않는 템플릿에서는 출력하지 않는다.

현재 정보 칸에는 템플릿별 비활성 정책이나 “이 양식에는 찍히지 않음” 설명이 없다. 날짜 표시를 꺼도 시험일 입력 칸은 그대로 편집 가능하며, 숫자 날짜의 출력만 막는다. 입력 자체의 공통 처리 근거는 [field 함수:62](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/PrintOptionsPanel.tsx:62)다.

지면에 넘기기 전에 [WorksheetPrint.tsx:50](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/WorksheetPrint.tsx:50)가 다음 처리를 한다.

| 값 | 실제 처리 |
|---|---|
| 문자열 메타 | 앞뒤 공백 제거. 빈 문자열은 undefined로 변환 |
| 제목 | printMeta.title 대신 별도 title prop을 최종 사용. 비면 “오늘 수학 학습지” |
| 과목 | 비면 “수학” |
| 학년 | 비면 선택 문항의 학년들을 중복 제거하여 연결 |
| 시험일 | 비면 서울 기준 오늘 날짜. 날짜를 숨기려면 showDate를 꺼야 함 |
| 유형명 | 정규화 후 undefined이면 배너에서 제목으로 대체 |
| 학교·시험 시간 등 | G에는 실제 값만 출력. 고유 헤더는 각자의 undefined 대체값을 쓸 수 있음 |
| 총점 | 초기값 100. 0도 숫자로 출력. 배점 숨기기와 별개 |

제목 입력은 setTitle과 onMeta({ title })를 둘 다 호출한다. [PrintOptionsPanel.tsx:132](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/PrintOptionsPanel.tsx:132). 최종 지면의 제목 소유자가 title prop인 것은 배선 결함이 아니다.

총점 칸을 비우면 패널은 undefined를 보낸다. 일반 작업실의 setPrintMeta는 parsePrintMeta를 거치므로 기본 100으로 돌아갈 수 있다. 연산의 즉시 변경은 메타 patch를 직접 병합한다. 이것은 빈 값/기본값 처리 차이이며, 입력한 숫자가 기존 지면 자리까지 도달하지 않는 누락으로 확인된 것은 아니다. [패널:72](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/PrintOptionsPanel.tsx:72), [파서:89](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/settings.ts:89), [일반 저장소:880](/Users/pss/Desktop/creative/today-print-color/src/components/unified/draftStore.ts:880), [연산:89](/Users/pss/Desktop/creative/today-print-color/src/components/arithmetic/ArithmeticWorkflow.tsx:89).

## 4. 정보 아래의 모든 설정 입력

PrintOptions의 17개 키를 모두 확인했다. 아래는 6종 공통 배선이며, 템플릿·문항·정답지별 예외를 함께 적었다.

| 입력 / 키 | 값·선택 범위 | 실제 지면 효과와 예외 |
|---|---|---|
| 템플릿 / template | 평가원·정통·모던·워크북·자습·유형 | 6개 Template 컴포넌트 선택. 정답지는 별도 AnswerPage |
| 폰트 / fontPack | 시스템·나눔·노토·고운·Pretendard | 명조/고딕 쌍 CSS 변수. 질문·정답지에 적용, 로딩 실패 시 대체 글꼴 안내 |
| 강조 색상 / color | 기본 남색 + 8색 | §6의 범위에만 적용. 선택 시 다른 검정/회색 토큰까지 일괄 변경하지 않음 |
| 문제 배치 / columns | 1단·2단 | 본문 단 수와 측정 폭. 정답지도 적용 |
| 단 사이 구분선 / columnDivider | 2단에서만 checkbox 노출 | 2단 가운데 회색 세로선. 1단에서는 무시. 정답지에도 적용 |
| 오른쪽 풀이 공간 / solvingArea | 1단에서 off·blank·ruled·chalkboard | 1단 오른쪽 공통 풀이 면. 정답지에서는 강제로 off |
| 쪽 여백 / marginPreset | 좁게·보통·넓게 | 질문·정답지 실제 A4 안쪽 여백. 좌우 각각 12/15/22mm, 상하 값도 함께 변경 |
| 세로 배치 / layoutMode | spacing·count | 질문지 여백 패킹 또는 단별 최대 문항 수 패킹. 정답지는 spacing으로 패킹 |
| 문항 간격 / spacing | 최소4·좁게16·보통32·넓게56·최대88px | spacing에서 질문 간격. 정답지에도 저장된 spacing 사용. 기존 사용자 값은 가까운 선택지만 표시하고 누르기 전까지 보존 |
| 1단당 문항 수 / problemsPerColumn | 2·3·4 | count에서 단별 최대 수. 긴 문제는 덜 배치되거나 다음 쪽으로 이동 |
| 보기 번호 배치 / choiceLayout | 5x1·2x3·3x2·auto | 6종 모두 ProblemBody → UnifiedProblem → NativeProblem/ProblemContent에 전달. 원본 crop 이미지의 보기 배열은 바꾸지 못함 |
| 날짜 표시 / showDate | checkbox | 공통 G와 각 헤더의 실제 시험일 값 제어. 인쇄된 수기 날짜 밑줄·일자 라벨까지 없애지는 않음 |
| 문항 단원명 / showChapter | checkbox | 문항 번호 옆 topic 표시. section 우선, 없으면 chapter. 원본 이미지 속 글자는 그대로 |
| 난이도 라벨 / showDifficulty | checkbox | 문항 번호 옆 difficulty 표시 |
| 배점 숨기기 / hideScores | checkbox | 인식 가능한 문항·소문항의 배점 글자를 숨김. 총점 정보는 유지. 이미지에 포함된 배점은 유지 |
| 정답·해설지 포함 / showAnswers | checkbox | 질문지 뒤에 AnswerPage 추가 |
| 빠른 정답만 / quickAnswerOnly | 정답지 포함일 때 checkbox | 해설 생략. 연산은 answersOnly이며 true 강제, 이 checkbox를 제공하지 않음 |

근거: [패널 폰트·색:180](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/PrintOptionsPanel.tsx:180), [배치·여백·세로 배치:217](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/PrintOptionsPanel.tsx:217), [보기·표시·정답:317](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/PrintOptionsPanel.tsx:317), [타입·기본값:93](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/types.ts:93).

실제 연결 근거: [BodyContainer.tsx:80](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/BodyContainer.tsx:80), [geometry.ts:113](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/geometry.ts:113), [pack.ts:42](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/pack.ts:42), [ProblemHeader:30](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/ProblemMeta.tsx:30), [ProblemBody:38](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/ProblemBody.tsx:38), [UnifiedProblem:25](/Users/pss/Desktop/creative/today-print-color/src/components/unified/UnifiedProblem.tsx:25), [정답지 패킹 예외:161](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/useMeasuredPages.tsx:161), [글꼴 변수:50](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/useMeasuredPages.tsx:50).

워크북·자습의 1단은 공통 오른쪽 풀이 공간이 off여도 각 문항 자체에 기본 줄/모눈 풀이 칸이 있다. 공통 풀이 공간을 켜면 문항 안의 기본 칸은 생략한다. 이 고유 구성은 [워크북:32](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/WorkbookTemplate.tsx:32), [자습:34](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/JaseupTemplate.tsx:34)에 명시돼 있다.

“기본값으로 재설정”은 PrintOptions 17개만 기본값으로 되돌린다. 제목·PrintMeta·시험 종류를 지우지 않는다. 연산에서도 전역 기본 템플릿인 정통/1단으로 바뀌며 quickAnswerOnly는 연산 updateOptions에서 true로 유지한다. [패널:361](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/PrintOptionsPanel.tsx:361), [연산:82](/Users/pss/Desktop/creative/today-print-color/src/components/arithmetic/ArithmeticWorkflow.tsx:82).

## 5. 연산대장·시험지 만들기·문제 추출·PDF 배선

| 경로 | 입력 소유자와 연결 | 차이 |
|---|---|---|
| 연산대장 | GradeArithmeticWorkbench/LegacyArithmeticWorkbench → ArithmeticWorkflow → WorksheetEditor | presentation.printOptions/printMeta와 별도 title 전달. 기본 유형·2단·빠른 정답. 회차별 첫 쪽 재시작 |
| 시험지 만들기 | UnifiedWorkspace의 draft → MathExamBuilder → WorksheetEditor | 일반 draft의 모든 인쇄 설정·메타 setter 전달. 내 양식·시험 종류·추천 제목 slot 추가 |
| 문제 추출 | StudioView의 onAdd → 일반 draft 문항 → onExport로 export 화면 → WorksheetEditor | 같은 editorProps와 동일 렌더러 사용. 이 export 화면에는 위 3개 slot을 추가하지 않음 |
| 미리보기 | WorksheetEditor → WorksheetPrint → 선택한 6종 Template | 동일 options·정규화 meta로 지면 구성 |
| 인쇄 / 브라우저 PDF 저장 | 준비 확인 후 window.print() | 화면 thumbnail을 숨기고 축소되지 않은 별도 지면 DOM을 인쇄 |
| PDF 내려받기 | 같은 지면 DOM → exportPreviewPdf → POST /api/exports/pdf → buildPdf | HTML·활성 CSS를 복제. 서버가 메타 필드를 다시 골라서 템플릿을 만드는 방식이 아님 |

연산의 두 모드는 실제로 같은 ArithmeticWorkflow를 호출한다. [GradeArithmeticWorkbench.tsx:525](/Users/pss/Desktop/creative/today-print-color/src/components/arithmetic/GradeArithmeticWorkbench.tsx:525), [LegacyArithmeticWorkbench.tsx:522](/Users/pss/Desktop/creative/today-print-color/src/components/arithmetic/LegacyArithmeticWorkbench.tsx:522). [ArithmeticWorkflow.tsx:203](/Users/pss/Desktop/creative/today-print-color/src/components/arithmetic/ArithmeticWorkflow.tsx:203)가 인쇄 상태를 전부 전달하고, [기본 presentation:57](/Users/pss/Desktop/creative/today-print-color/src/contracts/arithmeticPresentation.contract.ts:57)이 유형·2단을 정한다.

일반 경로의 공통 전달 객체는 [UnifiedWorkspace.tsx:1318](/Users/pss/Desktop/creative/today-print-color/src/components/unified/UnifiedWorkspace.tsx:1318)이며, 시험지 만들기는 [MathExamBuilder.tsx:497](/Users/pss/Desktop/creative/today-print-color/src/components/exam-builder/MathExamBuilder.tsx:497), 추출 출력 전환은 [UnifiedWorkspace.tsx:1915](/Users/pss/Desktop/creative/today-print-color/src/components/unified/UnifiedWorkspace.tsx:1915), 최종 export 화면은 [2066](/Users/pss/Desktop/creative/today-print-color/src/components/unified/UnifiedWorkspace.tsx:2066)이다.

[WorksheetEditor.tsx:472](/Users/pss/Desktop/creative/today-print-color/src/components/unified/WorksheetEditor.tsx:472)는 같은 options/meta와 setter를 패널에 연결하고 [634](/Users/pss/Desktop/creative/today-print-color/src/components/unified/WorksheetEditor.tsx:634)는 그 값을 WorksheetPrint로 전달한다. 준비 상태는 문항·제목·options·meta가 같은 객체인지까지 확인하며, 변경 후 재측정 전에는 출력을 막는다. [준비·preflight:156](/Users/pss/Desktop/creative/today-print-color/src/components/unified/WorksheetEditor.tsx:156).

질문지·정답지 page.content를 미리보기와 실제 출력 DOM 양쪽에서 재사용한다. [WorksheetPrint.tsx:105](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/WorksheetPrint.tsx:105), [출력 전용 DOM:217](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/WorksheetPrint.tsx:217). PDF는 이 data-mathgen-document만 복제한다. [WorksheetEditor.tsx:251](/Users/pss/Desktop/creative/today-print-color/src/components/unified/WorksheetEditor.tsx:251), [pdfClient.ts:27](/Users/pss/Desktop/creative/today-print-color/src/lib/export/pdfClient.ts:27), [POST:69](/Users/pss/Desktop/creative/today-print-color/src/lib/export/pdfClient.ts:69).

서버는 print media, A4, 여백 0, printBackground:true로 PDF를 만든다. [PDF route:24](/Users/pss/Desktop/creative/today-print-color/src/app/api/exports/pdf/route.ts:24), [pdfDocument:74](/Users/pss/Desktop/creative/today-print-color/src/lib/export/pdfServer.ts:74), [print media:99](/Users/pss/Desktop/creative/today-print-color/src/lib/export/pdfServer.ts:99), [PDF 옵션:237](/Users/pss/Desktop/creative/today-print-color/src/lib/export/pdfServer.ts:237). [WorksheetPrint.module.css:98](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/WorksheetPrint.module.css:98)는 인쇄 색을 exact로 지정한다. 따라서 확인한 코드에는 PDF에서만 정보나 강조색을 제거하는 별도 배선이 없다. 브라우저/프린터 설정과 실제 출력 결과까지 검증한 것은 아니다.

### 시험 종류와 추가 slot

시험 종류는 별도 tag이고 PrintMeta/PrintTemplateProps/WorksheetPrint 인자에는 없다. 기존 [SheetTagPicker.tsx:7](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/SheetTagPicker.tsx:7), [안내문:45](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/SheetTagPicker.tsx:45), [sheetTag.contract.ts:3](/Users/pss/Desktop/creative/today-print-color/src/contracts/sheetTag.contract.ts:3)가 “지면에 찍지 않음, 목록에서 거르기”를 명시한다.

연산은 presentation.tag, 일반 시험지는 draft.tag에 저장하도록 배선돼 있다. [연산 slot:204](/Users/pss/Desktop/creative/today-print-color/src/components/arithmetic/ArithmeticWorkflow.tsx:204), [시험지 slot:541](/Users/pss/Desktop/creative/today-print-color/src/components/exam-builder/MathExamBuilder.tsx:541), [draft tag 변경:836](/Users/pss/Desktop/creative/today-print-color/src/components/unified/draftStore.ts:836). 선택지는 없음·일일TEST·주간TEST·단원TEST·숙제·복습·오답·입학TEST·내신대비다.

따라서 미출력은 **명시적 설계**다. 마지막 브리프는 이 설계를 변경하라고 지시한다. “없음”은 생략하고 나머지는 양식별 자리를 정해 출력하는 새 작업이며, 기존 지면 슬롯으로의 단순 입력 배선 누락으로 판정하지 않는다.

시험지 만들기의 추천 제목에는 tag 문자열이 포함될 수 있다. 사용자가 추천을 적용해 제목에 “일일TEST” 등이 들어가면 제목으로 출력된다. 이것은 tag의 독립 출력이 아니다. [suggestTitles.ts:56](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/suggestTitles.ts:56), [추천 적용:549](/Users/pss/Desktop/creative/today-print-color/src/components/exam-builder/MathExamBuilder.tsx:549).

내 양식의 양식 이름·새 이름·기본 양식 checkbox는 관리 입력으로서 지면에 직접 찍지 않는다. 내 양식은 서식 전부와 학교/과목/시간/출제자/총점/학원/강사 7개 머리 정보만 보관하며, 제목·시험일·학년·학기·목표·개념·유형명·전략·tag는 보관 대상이 아니다. [printPreset.contract.ts:4](/Users/pss/Desktop/creative/today-print-color/src/contracts/printPreset.contract.ts:4), [적용:170](/Users/pss/Desktop/creative/today-print-color/src/contracts/printPreset.contract.ts:170), [관리 입력:577](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/SavedLayouts.tsx:577). 적용/저장 같은 동작은 이 감사에서 호출하지 않았다.

## 6. 강조색이 닿는 범위와 고정 검정

공통 토큰의 검정은 주로 #0E0E10이며 순수 #000000과 구분된다. 흰 종이는 #FFFFFF, 자습 종이는 #FCFCF8, 회색 선은 ink15 #D4D4D8·ink30 #A0A0A8 등이다. [tokens.ts:9](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/tokens.ts:9).

아래 표에서 “글자”는 해당 위치의 readablePaperColor 보정 후 색을 뜻한다. 면·테두리는 별도 표기한 선택색 원본을 쓴다. G는 현재 작업 파일 기준으로 보정된 글자다.

| 템플릿 | 선택색이 도달하는 글자 | 선택색이 도달하는 선·면 | 선택색과 무관하게 고정된 주요 요소 |
|---|---|---|---|
| 평가원 | 문항 번호, G | 질문지의 큰 폼 선·면에는 사용 안 함 | 큰 과목 영역 표 테두리·분할선, ‘홀’ 테두리, 제목/과목 글자, 푸터 선, 회색 단 구분선 |
| 정통 | 문항 번호 | 질문지 정보 표에는 사용 안 함 | 정보 표 전체 검정 격자·큰 제목, 학생/점수 표, 회색 라벨 셀 배경, 유의사항 테두리, 푸터 |
| 모던 | 작은 학기/제목, 평가 꼬리표, 학생 정보 라벨, 주의 기호, 문항 번호, 쪽수, G | 머리글 아래 3px 선, 평가 꼬리표 2px 테두리, 연산 회차 구획선 | 학교 큰 글자·본문, 학생 정보 회색 외곽선/분할선, 점수 칸의 옅은 회색 면, 회색 구분선 |
| 워크북 | ‘풀이 SCRATCH’, G; 로고·번호는 선택색 면 위 흑/백 | 학원 로고 사각 면, 문항 번호 채운 박스 | **큰 단원 배너의 검정 면과 흰 제목**, 문항 카드 회색 테두리, 풀이 구분 점선·공책 줄, 학원명/강사/날짜/푸터 |
| 자습 | SELF-STUDY, 문항 번호, ‘내 정답’, 핵심 개념 정리 라벨, 오늘의 메모, 연산 회차, G | 개념 박스 외곽 1px·왼쪽 5px 선 | 큰 제목·목표/개념 본문, 따뜻한 종이 면, 개념 박스 흰 면, 모눈/정답칸/채점칸/문항 구분선 |
| 유형 | 문항 번호, ‘핵심 전략’ 라벨, PROGRESS, G | 문항 번호 외곽 박스, 하단 진도 막대의 채운 부분 | **큰 PATTERN 배너의 검정 면·흰 유형명**, 문항 수의 반투명 흰 면, 전략 본문, 회색 전략 구분선·진도 트랙, 검정 PG 쪽수 |

문항 번호 공통 구현은 [ProblemMeta.tsx:168](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/ProblemMeta.tsx:168)이다. 워크북은 선택색 채움+inkOnColor, 유형은 선택색 외곽선+보정 글자, 나머지 4개는 보정된 글자 번호를 쓴다.

템플릿별 선·면 근거는 [평가원:102](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/PyeonggaTemplate.tsx:102), [정통:16](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/JeongtongTemplate.tsx:16), [모던:107](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/ModernTemplate.tsx:107), [워크북 로고:156](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/WorkbookTemplate.tsx:156), [워크북 검정 배너:216](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/WorkbookTemplate.tsx:216), [자습 개념 박스:269](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/JaseupTemplate.tsx:269), [유형 검정 배너:101](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/YuhyungTemplate.tsx:101), [유형 진도 막대:266](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/YuhyungTemplate.tsx:266)다.

공통 오른쪽 풀이 공간도 강조색을 받지 않는다. 칠판 면 #254c40, 외곽 #b8c1bc, 공책 줄 #c2ceda 등의 고정색이다. [SolvingArea.tsx:17](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/SolvingArea.tsx:17). 본문·그림·원본 crop도 강조색을 주입해 재색칠하는 배선이 아니다. 원본 자체의 색은 유지된다.

템플릿 변경 버튼은 template만 바꾼다. 전역 기본색은 #1B2A4E이며 선택한 색을 템플릿 전환으로 자동 교체하지 않는다. TEMPLATE_DEFAULT_ACCENT 상수는 선언돼 있지만 확인한 실제 선택 경로에서 사용하지 않는다. 모던·워크북·자습·유형의 개별 accent 대체값은 options.color가 비었을 때만 쓰이며, 정상 파서는 6자리 hex 색을 요구한다. [버튼:120](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/PrintOptionsPanel.tsx:120), [기본색:144](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/types.ts:144), [색 검증:75](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/settings.ts:75).

따라서 “모든 템플릿에서 글자색만 바뀐다”는 표현은 정확하지 않다. 이미 일부 선·면도 바뀐다. 다만 유형·워크북의 가장 큰 검정 배너가 바뀌지 않아 폼 자체의 인상이 검정으로 남는 현상은 코드와 일치한다.

## 7. readableColor 규칙과 남은 예외

[readableColor.ts:5](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/readableColor.ts:5)의 규칙은 다음과 같다.

1. #RRGGBB 6자리 색을 RGB로 읽는다.
2. sRGB 채널을 선형화하고 0.2126R + 0.7152G + 0.0722B로 상대 휘도를 구한다.
3. 대비는 (밝은 휘도 + 0.05) / (어두운 휘도 + 0.05)다.
4. readablePaperColor의 기본 배경은 흰색이 아닌 따뜻한 종이 #FCFCF8이다.
5. 입력색이 배경과 4.5 이상이면 원래 색을 유지한다.
6. 미달하면 배경에서 대비가 더 높은 검정/흰색을 목표로 RGB를 섞으며 12회 이진 탐색하고 채널을 반올림한다. 현재 두 종이 배경에서는 검정 방향으로 어두워진다.
7. inkOnColor는 선택한 면 색을 바꾸지 않고 그 위 글자만 순수 검정/흰색 중 대비가 높은 쪽으로 정한다. 잘못된 foreground는 기본 ink로 대체한다.

아래 값은 소스의 계산식·12회 탐색·JS식 반올림을 독립 산술 계산으로 재현한 결과다. 렌더 또는 인쇄 측정값은 아니다.

| 선택색 | 원본 hex | 원본/따뜻한 종이 대비 | 보정된 정보 글자 | 보정 후 대비 | 같은 색 면 위 글자 |
|---|---|---:|---|---:|---|
| 기본 남색 | #1B2A4E | 13.724 | #1B2A4E | 13.724 | 흰색 |
| 사이언 | #0EA5E9 | 2.695 | #0b7cb0 | 4.513 | 검정 |
| 파랑 | #135bec | 5.466 | #135bec | 5.466 | 흰색 |
| 보라 | #8b5cf6 | 4.117 | #8457ea | 4.505 | 검정 |
| 핑크 | #ec4899 | 3.430 | #ca3e83 | 4.509 | 검정 |
| 주황 | #F97316 | 2.725 | #bd5711 | 4.502 | 검정 |
| 노랑 | #eab308 | 1.865 | #926f05 | 4.539 | 검정 |
| 초록 | #10b981 | 2.466 | #0c855d | 4.509 | 검정 |
| 회색 | #64748b | 4.627 | #64748b | 4.627 | 흰색 |

선택색 원본의 선·면과 보정된 글자색이 서로 다른 것은 이 규칙의 결과다. options.color를 덮어쓰는 것은 아니다.

현재 반영 상태와 예외:

- **ExamDetails:** 최초 읽기에는 color:options.color로 보정을 우회했다. 현재 작업 파일 [ExamDetails.tsx:31](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/ExamDetails.tsx:31)은 readablePaperColor(options.color)로 수정돼 있다. 공통 9개 필드의 내용·배치는 바뀌지 않았다.
- **정답지 번호:** [AnswerPage.tsx:55](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/AnswerPage.tsx:55)는 여전히 color:options.color를 직접 사용한다. 같은 페이지의 밑줄·회차 테두리도 선택색 원본을 쓴다. 밝은 색 번호의 4.5 보정은 적용되지 않는다. 지면 자리 누락과 별개의 대비 적용 예외다.
- **워크북 검정 배너의 작은 ‘이름/날짜’ 라벨:** 고정 mutedText #6B6B72를 사용한다. [WorkbookTemplate.tsx:261](/Users/pss/Desktop/creative/today-print-color/src/components/unified/print/templates/WorkbookTemplate.tsx:261). 검정 면 #0E0E10과 계산 대비는 약 3.647이다. 선택색 보정 함수의 적용 대상이 아니다.
- 기존 [printReadableColors.test.tsx:37](/Users/pss/Desktop/creative/today-print-color/src/__tests__/components/printReadableColors.test.tsx:37)는 helper와 6종 QuestionNumber의 대비를 검사한다. 이 감사에서 시험은 실행하지 않았으며, 이 시험을 근거로 모든 정보 글자가 보정됐다고 주장하지 않는다.

## 8. 결함과 설계, 새 요구의 판정

| 항목 | 감사 판정 |
|---|---|
| 공통 9개 정보가 특정 템플릿 지면 전체에서 사라짐 | 확인되지 않음. 정통 자체 표 또는 다른 5종의 G로 연결됨 |
| 전용 6개 정보가 다른 템플릿에 출력되지 않음 | 현재 템플릿별 미사용 설계. 새 자리를 보편적으로 추가할 배선 버그 아님 |
| 시험 종류 미출력 | 기존 명시적 설계. 마지막 추가 지시에 따라 바꿀 새 요구 |
| 유형·워크북의 검정 배너가 강조색을 따르지 않음 | 현재 고정색 설계. 폼 전체 컬러 범위 변경은 시안에서 정할 사항 |
| 원래 자리로 입력을 전달하지 않는 메타 배선 결함 | 이번 확인 범위에서 없음 |
| 공통 G가 정보 9개를 모든 5종에 추가 출력함 | 현재 사실. 앞으로 템플릿 구성을 다양화할 때 검토할 설계 대상 |
| ExamDetails 밝은 정보 글자의 대비 | 현재 작업 파일에서 보정 반영 확인 |
| AnswerPage 번호의 밝은 색 대비 | 보정 우회가 남은 별도 정보 글자 예외 |
| 미리보기와 PDF의 별도 필드 선택·색상 제거 | 확인한 연결에는 없음. 실제 출력 검증은 하지 않음 |

브리프 맨 끝 요구에 따른 후속 시안의 검토 기준은 ① 현재 구성과 제안 구성을 나란히 표시, ② 템플릿별 필드 구성 다양화, ③ 지원하지 않는 입력의 “비활성+짧은 이유”를 기본안으로 하고 숨김을 비교안으로 제시, ④ 시험 종류를 모든 양식에 양식별 위치로 출력하되 “없음”은 생략, ⑤ 선택색이 닿는 선·면 범위와 흑백 가독성 비교다. 이것은 현재 구현의 감사 사실과 구분되는 변경 요구다.

이번 감사는 보고서 작성으로 완료한다. 현재 메인 작업의 ExamDetails 대비 보정과 dev 시안 작성은 외부 진행 작업으로 구분했고, 이 감사에서 입력 배선 수정을 수행하거나 필요하다고 확정하지 않았다.


감사자 작업 트리 확인: /Users/pss/orca/workspaces/today_/print-info-audit-20261019 에서 종료 전 git status --short 출력이 비어 있음을 확인했다. 작업 트리는 깨끗하다.
