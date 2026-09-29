# 트랙 english-shell — 제품 전환 · 영어 뷰 셋 · 학교별 내신 대비 · 보관함 · 편집 (D-148)

공통 지시 `english-common.md` 를 먼저. 모양은 **05 §8.23(원장님 확정)** 과 시안 `docs/design/mockups/hifi-d148-english-switch.html` **C 안**(브라우저로 열어 볼 것 — 펼침 240px · 접힘 72px 둘 다). 토큰은 작업실 그대로.

## 1. 셸 (`src/components/unified/UnifiedWorkspace.tsx` · `Workroom.module.css` · `WorkspaceIcon.tsx`)

- **제품 전환 — C 고르기 단추**: 브랜드 단추(`s.brand`)가 `aria-haspopup="listbox"` · 이름 옆 ▾. 누르면 바로 아래 제품 목록(`WORKSPACE_PRODUCTS` 중 **권한 있는 제품만** — `workspaceMenusOf(product).some(can)`). 제품이 하나뿐이면 지금 모습 그대로(▾ 없음, 목록 없음). 고르면 그 제품 첫 뷰로 `navigate`(수학 `defaultView` · 영어 `english`). 키보드: ↑↓ Enter Esc, 바깥 클릭 닫힘, 포커스 되돌림.
- **제품은 뷰에서 파생** — `productOf(view)`: `english*` 면 `english`. 저장하지 않는다.
- **접힘(72px)**: 마크 귀퉁이 **딱지 «영»**(파랑 `#3b60df` · 10px 800 · 남색 테두리 2px) — 영어일 때만. 접힌 채 마크를 누르면 목록이 옆으로(`position: fixed; left: 80px` — `profilePanel` 결).
- **뷰**: `type View = WorkspaceMenu | "english-maker" | "english-library"`; `menuOf(view)` → `english*` 는 `"english"`; `can(view)` 는 `menuOf` 로; `viewValid` 도. `navItems` 를 **제품별 목록**으로: 수학 8개는 그대로, 영어는 `[{id:"english", label:"학교별 내신 대비", short:"내신", icon:"school"}, {id:"english-maker", label:"문제 만들기", short:"만들기", icon:"pen"}, {id:"english-library", label:"문제 보관함", short:"보관함", icon:"folder"}]`. 옆 메뉴는 **지금 제품의 목록만** 그린다(`availableNav`). 빠른 검색(Ctrl K)은 두 제품 다.
- 영어 제품의 옆 메뉴: 파란 단추 **«새 시험 등록»**(`s.newButton` 그대로, `Icon plus`) → `setModal("english-exam")` · 캡션 «오늘의 영어»(`s.navCaption`) · 탭 셋. **`worksheetView`·현재 시험지 카드·담기 바는 영어에서 안 뜬다** — 마운트는 개념·SRS 블록(`can("english") && (opened.has(view) || view === …)`)과 같은 결.
- **딥링크** `/?set=<uuid>#english` — `sync()` 가 `extraction` 처럼 `set` 을 읽어(`^[0-9a-f-]{36}$`) 영어 뷰에 «이 세트를 열어라»를 넘긴다(상태 `openSetId`). 세트를 열면 URL 의 `set` 을 지운다(`replaceState`).
- 브레드크럼 «작업실 › {label}» 은 영어 뷰 이름으로.
- 아이콘 셋(`WorkspaceIcon.tsx` `paths`): `school` · `pen` · `folder`(있으면 재사용).

## 2. 영어 화면 (`src/components/english/**` — `EnglishMakerView.tsx` 는 ai 소유, 자리표만)

### 2.1 `EnglishStudio.tsx` — 영어 뷰 셋의 공통 뿌리
- 시험 목록 `GET /api/english/exams` 한 번 읽어 **학교 칩 + 시험 고르기** 상태를 셋이 나눠 쓴다(뷰마다 다시 읽지 않게 — `hidden` 마운트라 상태가 산다). 고른 시험 id 는 `localStorage`(`today-english-exam`) 에 기억(try/catch).
- 알림 줄은 셸의 `setNotice` 결(`role="status"`/`"alert"`) — 토스트 없음.

### 2.2 «학교별 내신 대비» (`view === "english"`) — 시안 본문 그대로
- 머리 `WorkspacePageHeader`(제목 «학교별 내신 대비» · 설명 «학교의 출제 흐름에 맞춰, 이번 시험을 준비하세요.» · 오른쪽 «새 시험 등록»).
- 학교 칩(고른 칩 옅은 코발트 면 + 테두리) + 시험 고르기 `<select>`(`학년 · 이름`). 시험이 하나도 없으면 빈 상태 카드 «첫 시험을 등록해 주세요» + 단추.
- «이번 시험 준비» 카드 — 세 단계(자료 등록 N개 자료 · 문제 제작 N개 세트 · 검토 및 인쇄 N개 검토 완료), 끝난 단계 코발트 원 ✓. 단계는 **단추**(자료 추가 창 · 만들기 뷰 · 보관함 뷰).
- 왼쪽: **시험 자료**(목록 행: 파일 아이콘 · 이름(내려받기 링크 `/api/english/materials/{id}`) · 크기·날짜 · 삭제(`ConfirmDialog`)) + «자료 추가» 창(탭 둘: 파일 업로드(multipart, ≤10MB, `pdf docx txt png jpg jpeg`) / 지문 직접 입력(이름 + 글)) · 각주 «PDF·이미지는 보관용입니다. 문제 제작에는 지문 텍스트를 입력해 주세요.» · **출제 설정** 카드(딱지 + «설정 수정» 창: `ENGLISH_GENERATED_TYPES` 체크 → `PATCH types`) · «대상 학년».
- 오른쪽: **대비 문제 세트**(최근 4개 카드 — 상태 알약 · 제목 · 출처 한 줄 · 유형 딱지 ≤3 · 문항 수 · 열기) · 빈 상태 · 큰 «학교 맞춤 문제 만들기 →»(`navigate("english-maker")`) · 아래 «모든 문제는 강사 검토 뒤에 씁니다.»
- «새 시험 등록» 창: 학교 이름(필수 · 80) · 학년(`ENGLISH_GRADES`) · 시험 날짜(선택, `<input type="date">`) · 시험 이름(기본 «2학기 중간고사») → `POST /api/english/exams` → 그 시험 고름.
- 시험 삭제(설정 카드 안 «시험 삭제» — `ConfirmDialog`, 딸린 자료·세트도 지워짐을 적는다).

### 2.3 편집 화면 (같은 뷰 안 상태 `editing: setId`)
- 도구 줄: «목록»(돌아감) · 검토 상태 `<select>` · «인쇄»(작은 창: 학생용 · 교사용 → `/english/sets/{id}/print?view=…` 새 탭 · 검토 완료가 아니면 «아직 검토 완료하지 않은 문제입니다.» 한 줄) · «저장»(`PUT`, `revision` 실어 보냄 · 409 면 alert 줄 + «다시 불러오기» 단추 · 성공하면 `revision` 갱신).
- 본문: 세트 이름 · 출처·문항 수·학교 한 줄 · 지문(`textarea`, 세리프) · 문항마다 «QUESTION 01 · 유형» · 발문 · 보기 1~5(`aria-label` «N번 문제 M번 선택지») · 정답 번호 / 정답·인정 답안 · 해설·채점 기준 · 지문 속 근거. 내용을 고치면 상태 «초안».
- 삭제(`ConfirmDialog`).

### 2.4 «문제 보관함» (`english-library`)
- 이 시험의 세트 전부(`GET /api/english/exams/{id}/sets`) · 이름 검색 · 상태 거르기 `<select>` · «새로고침» · 행(아이콘 · 제목 · 날짜·문항 수 · 알약 · ›) — **행은 단추**(D-30: 손가락 커서는 실제 단추에만 — 행 전체가 단추면 된다). 빈 상태 + «문제 만들기».

### 2.5 «문제 만들기» 자리표
- `src/components/english/EnglishMakerView.tsx` — 공통 지시 §3 의 props 로 «문제 만들기 — 준비 중» 한 줄만. ai 트랙이 채운다. 셸은 `onSaved(id)` 에 «학교별 내신 대비» 뷰로 가 그 세트를 편집 화면으로 연다.

## 3. MSW · 시험
- `src/mocks/handlers/english.ts`(exams · materials · sets 전부, 계약대로) + `handlers/index.ts` 등록 한 줄.
- `src/__tests__/components/UnifiedWorkspace.access.test.tsx` 에 더한다: 제품 목록은 권한 있는 제품만 · 영어로 넘어가면 옆 메뉴가 영어 탭 셋 · `#english-maker` 직접 열기 · `?set=` 딥링크 · 접힘 딱지 · 영어에서 `worksheetView` 안 뜸. 기존 수학 시험은 그대로 초록(수학 순서 시험은 `workspaceMenuProduct` 로 이미 걸러 놓았다).
- `src/__tests__/components/EnglishStudio.test.tsx` · `EnglishEditor.test.tsx` · `EnglishLibrary.test.tsx` — 폰 폭(390) 에서도 가로 넘침 없음(`scrollWidth`), 409 흐름, 10MB 초과 파일 거절 문구, 삭제 확인.
- 화면 캡처는 안 만든다(리드가 병합 뒤 main 에서).

## 4. 보고서 `docs/planning/tracks/reports/english-shell.md`
