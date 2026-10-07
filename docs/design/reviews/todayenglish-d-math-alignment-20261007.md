# 영어 D안과 오늘의 수학 작업실 구성 대응

작성일: 2026-10-07. 사용자가 선택한 방향은 **D 문제 탐색과 조합 + 오늘의 수학 구성 참고**다. A/B 시안을 추가 수정하는 문서가 아니다.

조사 기준: 작업 브랜치에 `git merge main`을 실행하여 `7691fa70fec9773bf14c9c3716162eec04897b7a`까지 fast-forward한 소스. 아래 **현재**는 해당 커밋의 코드에서 확인한 사실이고, **적용안**은 후속 구현을 위한 제안이다. 실제 화면 실행, API·DB 연결, 생성·출력 서비스의 운영 검증은 수행하지 않았다. 이번 변경은 이 문서 하나뿐이다.

## 1. 결론과 기준 파일

**공통 셸·메뉴의 역할 순서·버튼 규격·담기/편집/출력 흐름은 수학에 맞추고, D의 검색 결과 목록과 원문을 포함한 상세 분할은 유지한다.** 수학의 문제 카드 격자나 OCR 단계를 영어에 그대로 복제할 필요는 없다.

기준 파일을 혼동하면 다른 화면을 재현하게 된다.

| 확인한 대상 | 현재 코드의 근거 | 이번 적용 기준 |
|---|---|---|
| 실제 작업실 진입 | [WorkspacePage.tsx:1](../../../src/components/unified/WorkspacePage.tsx#L1), [WorkspacePage.tsx:38](../../../src/components/unified/WorkspacePage.tsx#L38)에서 `UnifiedWorkspace` 사용 | 기존 인증·메뉴 권한을 전달받는 작업실 안에 D 본문을 배치한다. 별도 영어 앱 셸을 중첩하지 않는다. |
| 실제 셸 스타일 | [UnifiedWorkspace.tsx:48](../../../src/components/unified/UnifiedWorkspace.tsx#L48)의 import는 **Workroom.module.css** | [Workroom.module.css:1](../../../src/components/unified/Workroom.module.css#L1)을 현재 기준으로 삼는다. |
| 요청받은 Workspace.module.css | [LegacyUnifiedWorkspace.tsx:9](../../../src/components/unified/LegacyUnifiedWorkspace.tsx#L9)에서 사용. [Workspace.module.css:1](../../../src/components/unified/Workspace.module.css#L1)은 15px 본문, [44행](../../../src/components/unified/Workspace.module.css#L44)은 248px 사이드바와 76px 상단 오프셋 | 보관된 셸의 참고 자료다. 이 수치를 현행 셸 규격으로 옮기지 않는다. |
| 선택된 D | [d-question-library.html:2030](../mockups/todayenglish-20261007/d-question-library.html#L2030)의 독립 상단 메뉴, [2071행](../mockups/todayenglish-20261007/d-question-library.html#L2071)의 필터·목록·상세·구성 영역 | D의 작업 내용은 유지하되 독립 브랜드·상단 메뉴·예시 계정 영역은 실제 공통 셸이 맡도록 한다. HTML 자체는 이번에 수정하지 않았다. |

## 2. 메뉴 순서와 작업 진입 대응

수학의 선언 순서는 **오늘의 작업 → 시험지 만들기 → 문제 추출 → 시험지·내보내기 → 내 시험지 → 교재 제작 → 수업·학생 관리 → 오늘의 개념 → 개념 백지 → 오늘의 기억·SRS**다. 근거: [UnifiedWorkspace.tsx:169](../../../src/components/unified/UnifiedWorkspace.tsx#L169).

다만 실제 사이드바는 권한으로 걸러지며, 문제 추출·시험지 만들기·내 시험지 중 하나라도 이용할 수 있으면 **시험지·내보내기 행을 숨긴다**. 내보내기만 허용된 계정에는 행이 남는다. 보관함 이름도 `libraryLabel`에 따라 달라진다. 배열 순서만 보고 열 개 메뉴가 모두 보인다고 설명하면 틀리다. 근거: [UnifiedWorkspace.tsx:311](../../../src/components/unified/UnifiedWorkspace.tsx#L311).

다음은 영어의 **역할 순서 제안**이다. 메뉴명·새 은행 식별자·권한 계약의 변경은 후속 구현에서 정해야 하며, 현재 이미 존재하는 메뉴라고 간주하지 않는다.

| 순서 | 수학의 역할 | 영어 D에 적용할 메뉴·진입 | 현행 영어와의 관계 |
|---|---|---|---|
| 1 | 오늘의 작업 | **오늘의 작업**: 학교·시험 선택, 최근 세트, 현재 구성 이어가기 | 기존 `english`의 학교별 내신 대비 맥락을 활용하는 제안. D 은행 탐색을 위해 시험 선택을 강제하지 않는다. |
| 2 | 시험지 만들기 | **시험지 만들기**: D의 문제은행 화면으로 진입. 본문 제목은 **문제은행**, 검색·상세·담기가 중심 | 문항 단위 독립 은행은 별도 설계 대상. 현재 `english-bank`를 덮어쓰지 않는다. |
| 3 | 문제 추출 | **AI 문제 제작**: 원문 선택 → 제작 조건 → 초안 검토 → 은행/구성으로 돌아오기 | 현재 `english-maker`에 대응. 메뉴명과 제작 화면 구조를 정리하되 AI 권한을 수학의 `studio` 권한으로 대신 판단하지 않는다. |
| 4 | 내 시험지 | **문제 보관함**: 저장된 시험별 세트 열기·이어가기 | 현재 `english-library` 보존. 독립 문항은행과 저장된 시험 세트를 같은 목록으로 취급하지 않는다. |
| 5 | 내 자료 진입 | **자료은행**: 읽기 원문·출처·버전·음원/대본 | 기존 `english-bank`는 이 역할이다. 이름에 bank가 있어도 새 문항은행의 저장소라는 뜻은 아니다. |
| 6 | 과목별 추가 작업 | **듣기**: 음원·대본·연결 문항을 확인하고 듣기 작업으로 이동 | 현재 `english-listening` 유지. 수학의 개념·SRS 메뉴를 대응 항목 없이 복제하지 않는다. |
| 마지막 단계 | 시험지·내보내기 | **시험지 편집**에서 구성·지면을 확인한 뒤 출력 | 기본적으로 독립 사이드바 메뉴를 추가하지 않는다. ‘담은 문제’와 ‘현재 시험지’에서 접근한다. 영어에 동일한 권한 예외가 필요한지는 별도 계약에서 결정한다. |

현행 영어 메뉴는 `학교별 내신 대비 → 문제 만들기 → 문제 보관함 → 영어듣기 → 자료은행`이다. 위 표는 이 순서를 이미 변경했다는 보고가 아니다. 근거: [UnifiedWorkspace.tsx:189](../../../src/components/unified/UnifiedWorkspace.tsx#L189).

## 3. 실제 수학 구성 → 영어 D의 구체적 대응표

| 항목 | 수학에서 확인한 구성·근거 | 영어 D에서 공통으로 맞출 것 | 영어 고유로 유지·변경할 것 |
|---|---|---|---|
| 브랜드·제품 전환 | 브랜드 자리에서 허용된 수학/영어 제품을 선택. 한 제품만 허용되면 선택 목록 없음. [UnifiedWorkspace.tsx:307](../../../src/components/unified/UnifiedWorkspace.tsx#L307), [1042행](../../../src/components/unified/UnifiedWorkspace.tsx#L1042) | 기존 제품 선택·영어 표지·사이드바 접기를 그대로 사용 | D의 `e.` 로고와 가짜 교사 계정 헤더를 중복 표시하지 않는다. |
| 셸 치수·색·활자 | 본문 14px, 설명 12px, 절 제목 18px, 화면 제목 24px; 잉크 `#172b4d`, 강조 `#3159df`, 배경 `#f4f6fa`. 사이드바 240px, 761~1050px에서 212px, 수동 접힘 72px. 데스크톱 topbar 최종 선언은 **52px**. [Workroom.module.css:1](../../../src/components/unified/Workroom.module.css#L1), [58행](../../../src/components/unified/Workroom.module.css#L58), [1070행](../../../src/components/unified/Workroom.module.css#L1070), [1433행](../../../src/components/unified/Workroom.module.css#L1433), [1584행](../../../src/components/unified/Workroom.module.css#L1584) | 공통 토큰·레이아웃을 상속. 기본 본문 여백 16px 20px, 모바일 14px 16px. D 전용 작은 컨트롤 규격을 만들지 않는다. [1636행](../../../src/components/unified/Workroom.module.css#L1636), [1648행](../../../src/components/unified/Workroom.module.css#L1648) | 영어 지문·보기의 읽기 폭과 행간은 별도 콘텐츠 스타일로 정한다. 원문과 답 근거의 강조색이 셸의 주 행동색과 경쟁하지 않게 한다. |
| 상단 공통 기능 | `작업실 > 현재 메뉴`, `문제·작업 빠르게 찾기`와 Ctrl K, 실제 `WorkspaceAccount`. [UnifiedWorkspace.tsx:1296](../../../src/components/unified/UnifiedWorkspace.tsx#L1296) | 글로벌 빠른 검색과 화면 안의 문제은행 검색을 분리. 제목·설명·우측 행동은 `WorkspacePageHeader` 규격. [WorkspacePageHeader.tsx:13](../../../src/components/unified/WorkspacePageHeader.tsx#L13) | D의 `/` 검색 안내는 실제 단축키 충돌·입력 중 동작을 확인한 뒤 결정. 독립 시안의 상단 메뉴를 그대로 삽입하지 않는다. |
| 새 작업·현재 작업 | 수학 사이드바 상단 `새 시험지 만들기`, 현재 시험지 제목·문항 수·`편집 이어가기`. [UnifiedWorkspace.tsx:1190](../../../src/components/unified/UnifiedWorkspace.tsx#L1190), [1225행](../../../src/components/unified/UnifiedWorkspace.tsx#L1225) | 새 작업 버튼과 현재 작업 요약의 위치·표현을 맞춘다. ‘새로 만들기’와 ‘현재 구성에 담기’를 구분 | 현재 영어 버튼은 `새 시험 등록`이고 듣기·자료은행에서는 숨긴다. [1176행](../../../src/components/unified/UnifiedWorkspace.tsx#L1176). 은행의 새 구성 생성과 학교 시험 등록은 별도 행동이다. 모든 영어 화면에서 시험 등록을 강제하지 않는다. |
| 홈 | 은행 바로 검색·학년 진입, PDF/이미지 가져오기, 최근 작업, 우측 현재 시험지와 이어가기. [WorkroomHome.tsx:103](../../../src/components/unified/WorkroomHome.tsx#L103), [219행](../../../src/components/unified/WorkroomHome.tsx#L219), [228행](../../../src/components/unified/WorkroomHome.tsx#L228), [322행](../../../src/components/unified/WorkroomHome.tsx#L322) | 검색 → 자료로 제작 → 최근 작업 → 현재 구성의 역할과 배치를 참고 | 검색 필드는 원문 제목·유형·문항 내용, 가져오기는 원문/음원 확보 상태. 파일 선택을 원문 추출 완료로 표시하지 않는다. 기존 수학 `BankData`·문항 수를 영어 홈에 공급하지 않는다. |
| 은행 작업 순서 | 제목은 `시험지 만들기`; `범위 설정 → 문제 선택 → 시험지 편집` 3단계. [BankView.tsx:1121](../../../src/components/unified/BankView.tsx#L1121), [1150행](../../../src/components/unified/BankView.tsx#L1150) | 영어도 ‘찾기/범위 → 담기 → 편집/출력’의 방향과 현재 단계를 명확히 한다 | D의 본문 이름 ‘문제은행’과 원문 연결 상세는 유지. 새 AI 제작을 반드시 거쳐야 은행을 사용할 수 있게 만들지 않는다. |
| 검색·기본 필터 | 상단 검색 제출/지우기, 학년·단원·단원 범위, `상세 필터`·`초기화`. [BankView.tsx:1170](../../../src/components/unified/BankView.tsx#L1170), [1206행](../../../src/components/unified/BankView.tsx#L1206), [1302행](../../../src/components/unified/BankView.tsx#L1302) | 필터 도구 위치·44px 높이·초기화·적용 조건 칩을 맞춘다. 필터 변경 시 첫 페이지로, 개별 조건 해제 후 결과 제목으로 초점을 돌리는 규칙도 참고. [939행](../../../src/components/unified/BankView.tsx#L939), [1490행](../../../src/components/unified/BankView.tsx#L1490) | 기본은 학년·문항 유형·원문/범위. ‘단원 범위’는 원문/시험 범위 선택으로 대체한다. 학교는 선택한 시험의 맥락이며, 학교 출제 경향을 분석했다는 문구를 붙이지 않는다. |
| 상세 필터·상태 | 난이도·유형·상태(기본 `출제 가능`)·출처, 그림/해설/정답 존재 여부. [BankView.tsx:1333](../../../src/components/unified/BankView.tsx#L1333), [1375행](../../../src/components/unified/BankView.tsx#L1375), [96행](../../../src/components/unified/BankView.tsx#L96) | 필터 펼침·접힘, 적용 조건, 결과 수, 빈 결과·재시도 구조 | 영어는 **초안 / 검토 중 / 검토 완료**, 원문 출처·연결 원문, 답/근거 유무를 사용. 수학의 pending/approved/rejected를 영어 상태와 일대일 변환하지 않는다. D의 다중 체크 필터는 같은 항목 OR·항목 간 AND라는 의미를 보존한다. [D:2665](../mockups/todayenglish-20261007/d-question-library.html#L2665) |
| 문항 목록·상세 | 수학은 `PROBLEM_CARD_WIDTH`로 열 수만 바꾸는 카드 격자, 상세는 모달. [BankView.tsx:46](../../../src/components/unified/BankView.tsx#L46), [190행](../../../src/components/unified/BankView.tsx#L190) | 메타 정보, 검토 상태, 담김 표시, 상세의 주 행동을 일관되게 표시. 콘텐츠의 읽기 폭을 지킨다 | **D의 압축 목록 + 선택 문항 상세 분할을 유지**한다. 이는 사용자가 선택한 D의 핵심 차이다. 영어 상세에는 문항·보기·정답·해설과 원문 근거/버전을 함께 둔다. 수학 렌더러를 영어에 억지로 적용하지 않는다. |
| 선택·담기 | 개별 `문제 담기/담기 취소`; 현재 페이지의 담기 가능한 문항만 전체 담기, 중복 제외. 상세 하단에서 담기가 맨 앞 주 행동. [BankView.tsx:196](../../../src/components/unified/BankView.tsx#L196), [563행](../../../src/components/unified/BankView.tsx#L563), [753행](../../../src/components/unified/BankView.tsx#L753), [976행](../../../src/components/unified/BankView.tsx#L976) | 담김 상태·중복 방지·불가 이유·취소 동작을 맞춘다. ‘전체’의 범위는 **현재 페이지**임을 명시 | D의 체크 선택과 `선택 문항 담기` 2단계는 유지한다. 행 제목은 상세 보기, 체크는 임시 선택, 담기는 실제 구성 추가다. 수학의 즉시 전체 담기와 혼동되지 않게 `이 페이지 전체 선택`으로 표현한다. 현재 D 근거: [2100행](../mockups/todayenglish-20261007/d-question-library.html#L2100). |
| 담은 문제 | 수학은 **오른쪽 열을 예약하지 않는 플로팅 바구니**. 펼침·전체 비우기·난이도 요약·문항 번호·시험지 편집. 번호를 누르면 미리보기·앞뒤 이동·교체·취소. [BankView.module.css:986](../../../src/components/unified/BankView.module.css#L986), [BankBasket.tsx:174](../../../src/components/unified/BankBasket.tsx#L174), [229행](../../../src/components/unified/BankBasket.tsx#L229), [95행](../../../src/components/unified/BankBasket.tsx#L95) | 제목은 **담은 문제**, 개수·순서 변경·빼기·편집 진입을 맞춘다. 모바일 하단 내비게이션 높이와 safe-area를 함께 반영 | 넓은 화면의 D 구성 트레이는 유지 가능하되 좁은 화면에서는 수학처럼 접는 패널로 전환한다. 난이도 분포 대신 **유형별 수·원문별 묶음·검토 필요 수**를 보여 준다. 유형 막대를 실제 문항 수와 무관한 장식으로 표시하지 않는다. |
| 제작·검토 헤더 | 수학 `StudioStepBar`: 원본 가져오기 → 문제&도형 잘라내기 → OCR·디지털화 → 시험지 구성. 모든 단계에서 같은 제목 띠, 단계별 도구는 둘째 줄. [StudioStepBar.tsx:66](../../../src/components/unified/StudioStepBar.tsx#L66), [StudioView.tsx:2559](../../../src/components/unified/StudioView.tsx#L2559) | 같은 위치의 단계 표시·현재 단계·주 행동·뒤로 가기. 단계마다 헤더 구조가 흔들리지 않게 한다 | 영어는 **원문 선택 → 제작 조건 → 답·근거 검토 → 시험지 구성**으로 바꾼다. OCR·도형 잘라내기를 필수 단계로 넣지 않는다. AI/규칙 제작 결과는 초안이며 사람 검토를 거친다. |
| 출력 | `WorksheetEditor`에 작업 저장, 인쇄/PDF 저장, HWPX 내보내기, PDF 내려받기. 문항 없음·지면 준비 전·출력 중에는 제한. 설정/문제 순서 탭과 실제 `WorksheetPrint`. [WorksheetEditor.tsx:197](../../../src/components/unified/WorksheetEditor.tsx#L197), [368행](../../../src/components/unified/WorksheetEditor.tsx#L368), [481행](../../../src/components/unified/WorksheetEditor.tsx#L481) | 트레이의 다음 주 행동은 **시험지 편집**. 편집 화면에서 저장과 출력 행동을 분리하고 준비 중·실패를 표시한다 | 학생용은 답 제외, 교사용은 정답·해설·근거. 영어 원문 묶음·긴 보기·서술형 답란을 별도 지면 규칙으로 다룬다. D의 학생용 2문항/쪽·교사용 1문항/쪽은 샘플 규칙이지 운영 페이지 분할 엔진이 아니다. [D:2901](../mockups/todayenglish-20261007/d-question-library.html#L2901) |

## 4. D를 공통 셸에 넣을 때의 배치안

수학은 **상단 필터 + 카드 결과 + 플로팅 바구니**이고, D는 **왼쪽 필터 + 목록/상세 + 오른쪽 구성**이다. 두 구조가 현재 같다고 기록하지 않는다. 셸까지 더하면 D의 왼쪽 필터가 두 번째 사이드바처럼 보이므로 다음 조정을 권한다.

```text
공통 사이드바 │ 작업실 경로 · 빠른 검색 · 실제 계정
              │ 문제은행 제목·설명             원문 보기 / AI 문제 제작
              │ 검색 + 학년·유형·원문 범위 + 상세 필터 / 초기화
              │ 적용 조건 칩 · 결과 수 · 정렬
              │ 문항 목록 │ 문항·원문·답/근거 상세 │ 담은 문제
              │           선택 문항 담기          │ 시험지 편집
```

아래 치수는 **후속 시안의 시작값**이며 브라우저 측정 결과가 아니다. 뷰포트 폭이 아니라 사이드바와 본문 여백을 뺀 **본문 가용폭**으로 전환한다.

| 본문 가용폭 | D 본문 배치 제안 | 공통으로 지킬 점 |
|---|---|---|
| 1,000px 이상 | 상단 필터, 목록 약 264px + 상세 가변 + 구성 약 280px. 별도 왼쪽 필터 레일은 제거 | 목록·상세를 탐색하는 동안 담은 문항과 다음 행동을 계속 볼 수 있게 한다. |
| 700~999px | 목록 약 240px + 상세 가변. 구성은 ‘담은 문제 N’ 접이 패널 | 수학처럼 바구니가 본문 열을 상시 차지하지 않게 한다. |
| 700px 미만 | 목록 → 문항 상세 화면 전환. 필터는 별도 패널, 담은 문제는 펼침 패널 | 닫기/Escape/원래 행으로 초점 복귀. 글로벌 메뉴·임시 선택 바·담은 문제 버튼이 서로 겹치지 않게 한다. |

공통 모바일 셸은 760px 이하에서 메뉴가 하단 내비게이션으로 이동한다. D의 고정 하단 구성 버튼을 그대로 붙이면 겹칠 수 있다. 수학은 `--workspace-bottom-inset: 77px`와 safe-area를 이용한다. 근거: [Workroom.module.css:1153](../../../src/components/unified/Workroom.module.css#L1153), [1384행](../../../src/components/unified/Workroom.module.css#L1384), [BankView.module.css:987](../../../src/components/unified/BankView.module.css#L987).

버튼은 공통 44px 높이·8px 반경을 사용한다. 다만 수학의 ‘담은 문제’ 런처는 52px 높이·12px 반경인 예외다. 본문 주 행동은 `AI 문제 제작`, 문항 상세에서는 `문제 담기`, 구성에서는 `시험지 편집`, 출력에서는 `인쇄 / PDF 저장`으로 **작업 영역별** 우선순위를 정한다. 근거: [Workroom.module.css:1591](../../../src/components/unified/Workroom.module.css#L1591), [BankView.module.css:1011](../../../src/components/unified/BankView.module.css#L1011).

## 5. 영어 고유 기능의 적용 경계

- **원문과 문항은행을 분리한다.** 원문 제목·출처·버전·범위를 상세에서 확인하고 연결 문항으로 돌아온다. 자료은행의 원문을 바꿨다고 기존 문항·근거를 자동으로 최신 검토 완료로 바꾸지 않는다. D의 자료은행은 자체 원문을 보고 연결 문항으로 이동하는 시안이다. [D:2802](../mockups/todayenglish-20261007/d-question-library.html#L2802).
- **AI 제작은 은행을 보충하는 진입으로 둔다.** 제목줄 `AI 문제 제작`, 빈 검색 결과 `필요한 문항 제작하기`, 구성의 `부족한 문제 제작`은 같은 제작 흐름으로 연결하는 제안이다. 원문/범위·학년·유형·문항 수를 전달하고, 취소하면 검색·선택·담은 순서를 보존한다. 자동 생성·형식 확인·교사의 답/근거 검토를 서로 다른 상태로 설명한다. 현재 D는 준비된 예시를 조합하며 실제 생성이 아니다. [D:2828](../mockups/todayenglish-20261007/d-question-library.html#L2828), [2846행](../mockups/todayenglish-20261007/d-question-library.html#L2846).
- **수학의 ‘난이도별 랜덤 추가’를 영어 AI 제작이라고 이름만 바꾸지 않는다.** 수학에는 별도 `BankRandomPanel`과 선택 가능한 기존 문항을 추가하는 동작이 있다. [BankView.tsx:1513](../../../src/components/unified/BankView.tsx#L1513). 영어의 유형별 신규 제작과 기존 은행 자동 선택은 입력·결과·검토 의무가 다르므로 별도 행동으로 설계한다.
- **듣기는 과목별 메뉴로 유지한다.** 상세의 음원 연결 여부, 대본, 문항의 연결 관계를 보여 준다. 재생 가능한 음원이 없는 상태에서 가짜 재생 진행률을 만들지 않는다. 실제 영어 듣기 뷰도 별도 권한과 마운트를 사용한다. [UnifiedWorkspace.tsx:1543](../../../src/components/unified/UnifiedWorkspace.tsx#L1543). 출력 지면의 대본·음원 안내·답 노출 범위는 학생용/교사용 규칙을 따로 정한다.
- **공통 모양과 공통 저장소를 혼동하지 않는다.** 현행 영어는 명시적으로 수학 `worksheetView`에 들어가지 않는다. [UnifiedWorkspace.tsx:330](../../../src/components/unified/UnifiedWorkspace.tsx#L330), [1509행](../../../src/components/unified/UnifiedWorkspace.tsx#L1509). 영어 선택 문항을 수학의 `selected`나 수학 초안 저장 훅에 넣는 것은 이번 정렬안에 포함되지 않는다. 저장 범위·초안 소유권·충돌 처리는 영어 계약을 확인한 뒤 결정한다.

## 6. 공통 컴포넌트·레이아웃 재사용 후보

‘바로 사용 가능’도 후속 구현 시 props·권한 확인이 필요하다는 뜻이다. 아래 어느 항목도 이번에 추출·수정·연동하지 않았다.

| 후보 | 재사용 수준 | 구체적 적용과 제외 범위 |
|---|---|---|
| `UnifiedWorkspace`, `WorkspaceAccount`, `WorkspaceIcon` | **기존 진입/셸 사용 우선** | 영어 D를 기존 영어 콘텐츠 영역으로 교체하는 방향. 제품 전환·계정·검색·현재 메뉴 표기를 재구현하지 않는다. `UnifiedWorkspace` 전체를 별도 영어 페이지 안에 중첩하는 방식은 피한다. [UnifiedWorkspace.tsx:1513](../../../src/components/unified/UnifiedWorkspace.tsx#L1513) |
| `WorkspacePageHeader` | **직접 재사용 후보** | `title`, `description`, `titleId`, 행동 슬롯으로 D 제목과 ‘원문 보기/AI 제작’ 배치. 1050px 이하 동작·인쇄 시 숨김 포함. [WorkspacePageHeader.module.css:1](../../../src/components/unified/WorkspacePageHeader.module.css#L1), [39행](../../../src/components/unified/WorkspacePageHeader.module.css#L39) |
| `Workroom.module.css` 토큰·본문 슬롯 | **상속 우선** | 활자 4단계, 44px 컨트롤, 8px 반경, 본문 여백, 포커스, 모바일 하단 inset. D CSS를 글로벌 선택자로 덮어 수학까지 바꾸지 않는다. |
| `WorkProgress` | **직접 재사용 후보** | 검색·제작·출력의 실제 대기 상태와 오류 후 재시도 주변에 사용. 예시 초안 생성에 실제 처리 진행률처럼 보이는 숫자를 붙이지 않는다. 현재 은행 사용: [BankView.tsx:1613](../../../src/components/unified/BankView.tsx#L1613) |
| `BankView`의 필터 줄·적용 조건 칩·결과 헤더 | **패턴 추출 후보** | 현재 필터 UI는 독립 범용 컴포넌트가 아니라 `BankView` 안에 있다. 외형·접기·초점·초기화 동작을 추출할 수 있으나 수학의 단원/난이도 타입·조회 함수를 공유한다고 가정하지 않는다. [BankView.tsx:1164](../../../src/components/unified/BankView.tsx#L1164) |
| `BankBasket` / `SelectedPreview` | **도메인 분리 후 추출 후보** | 열림/닫힘, 개수, 순서 변경·교체·비우기, Escape·초점 복귀를 재사용. 현재는 `StudioProblem[]`, `DIFFICULTY_LADDER`, `UnifiedProblem`에 결합되어 있어 영어 데이터를 그대로 전달할 수 없다. `renderItem`, 요약 슬롯, 행동 콜백 등의 분리 검토가 필요하다. [BankBasket.tsx:4](../../../src/components/unified/BankBasket.tsx#L4), [35행](../../../src/components/unified/BankBasket.tsx#L35), [142행](../../../src/components/unified/BankBasket.tsx#L142) |
| `StudioStepBar`와 `StudioView.module.css`의 단계 띠 | **외형·접근성 패턴 재사용 후보** | 제목·탭·우측 행동·둘째 줄 도구 배치를 참고. 단계 타입이 upload/crop/review/export로 고정되어 있으므로 영어 단계에 직접 끼워 넣지 않는다. 과목별 단계 모델을 받는 별도 어댑터/일반화 여부를 후속 검토. [StudioStepBar.tsx:11](../../../src/components/unified/StudioStepBar.tsx#L11), [StudioView.module.css:1629](../../../src/components/unified/StudioView.module.css#L1629) |
| `WorkroomHome` | **역할·배치 참고 후보** | 은행 검색, 자료 확보, 최근 작업, 현재 구성이라는 역할을 재사용. 영어 전용 집계·저장 세트·학교 맥락이 필요하므로 수학 컴포넌트 전체 재사용을 확정하지 않는다. [WorkroomHome.tsx:22](../../../src/components/unified/WorkroomHome.tsx#L22) |
| `WorksheetEditor`, `PrintOptionsPanel`, `WorksheetPrint`, 인쇄 토큰 | **출력 셸·설정 패턴/토큰부터 검토** | 제목·학원명·폰트·여백·1/2단·정답/해설 표시와 ‘지면 준비 후 출력’ 관문은 공통 후보. 원문 묶음·대본·서술형 답란은 영어 렌더러가 필요하다. HWPX/PDF 내보내기가 영어에도 이미 지원된다고 표시하지 않는다. [PrintOptionsPanel.tsx:96](../../../src/components/unified/print/PrintOptionsPanel.tsx#L96), [198행](../../../src/components/unified/print/PrintOptionsPanel.tsx#L198), [327행](../../../src/components/unified/print/PrintOptionsPanel.tsx#L327), [print/tokens.ts:29](../../../src/components/print/tokens.ts#L29) |
| `UnitRangePicker`, `UnifiedProblem`, `BankRandomPanel` | **직접 재사용 대상에서 제외** | 각각 수학 단원 범위, 수학 문항 렌더링, 수학 난이도별 기존 문항 추가에 결합. 영어 원문 범위·문항·유형별 제작에 이름만 바꿔 적용하지 않는다. |

## 7. 후속 구현 순서와 확인할 항목

1. **셸과 메뉴 정렬**: 기존 권한을 유지하는 메뉴 대응부터 확정한다. `english-bank` 자료은행과 신규 문항은행을 분리하고, 수학의 보관함·메뉴 순서·내보내기 숨김 규칙에는 변경을 주지 않는다.
2. **D 본문 배치**: 공통 제목·상단 필터를 적용하고 목록/상세 분할을 유지한다. 사이드바 펼침/접힘 모두에서 본문 가용폭에 따른 트레이 전환을 확인한다.
3. **선택과 제작 연결 계획 구체화**: 상세 선택, 체크 선택, 담은 문제를 구분한다. 검색·페이지·필터 변경이나 제작 취소 뒤에도 구성과 순서를 보존한다. 검토 중/초안의 편집용 담기와 최종 출력 가능 여부는 영어의 명시적인 규칙으로 정한다.
4. **출력 어댑터 검토**: 영어 데이터 계약을 먼저 확인하고 원문 묶음·정답·근거·대본 노출, 페이지 분할, 내보내기 지원 범위를 정한다. D HTML의 예시 미리보기를 운영 출력 엔진으로 간주하지 않는다.
5. **후속 QA**: 수학의 기존 메뉴·담기·교체·출력 회귀 없음, 영어의 검색→상세→담기→편집→출력, AI 취소·실패·재진입, 권한 없는 메뉴 차단, 모바일 하단 겹침, 키보드 초점 복귀를 확인한다. 이 문서는 해당 QA의 완료 보고가 아니다.

이번 조사로 확정할 수 있는 것은 **소스에 구현된 구성과 재사용 제약**이다. 영어 신규 문항은행의 운영 저장, AI 판단 품질, 듣기 배정, 출력 어댑터 호환성은 이 핵심 파일 조사만으로 확정할 수 없다.
