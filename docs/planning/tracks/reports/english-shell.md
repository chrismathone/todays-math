# 트랙 english-shell 보고 — 제품 전환 C · 영어 뷰 셋 · 학교별 내신 대비 · 보관함 · 편집 (D-148, 2026-09-30)

브리프 `docs/planning/tracks/briefs/english-shell.md` · 공통 `english-common.md` · 설계 SSOT `25-english-studio.md` · 모양 05 §8.23 ·
시안 `docs/design/mockups/hifi-d148-english-switch.html` **C 안**(브라우저로 펼침 240px · 접힘 72px 둘 다 확인하고 그대로 옮김).
기준 커밋 `0150e9db6`(리드가 옮긴 것 — `1790652d7` 과 같은 내용) → 마무리 전에 리드 지시대로 `2de827cc3`(자료 상한 4MB · 오류 코드 셋)을 **fast-forward 병합**했다.

## 0. 요약

- 셸(`UnifiedWorkspace`)에 **브랜드 자리 고르기 단추**(시안 C)가 섰다 — 권한 있는 제품만, 하나뿐이면 지금 모습 그대로. 영어 뷰 셋 `english` · `english-maker` · `english-library`, 옆 메뉴는 **지금 제품의 목록만**, 파란 단추 «새 시험 등록», 캡션 «오늘의 영어», 접힘 딱지 «영», 딥링크 `/?set=<uuid>#english`.
- 영어 화면 넷 — 뿌리 `EnglishStudio`(시험 목록 한 번 · 학교 칩 + 시험 고르기 · 고른 시험 localStorage) · «학교별 내신 대비» · 편집 화면(같은 뷰 안 상태) · «문제 보관함» · 만들기 **자리표**(ai 소유). 창 넷(새 시험 등록 · 자료 추가 · 출제 설정 · 인쇄)과 확인 창 셋(자료 · 시험 · 세트 삭제).
- MSW `src/mocks/handlers/english.ts`(계약대로, 상태 없음) — base 라우트가 없어도 화면 시험이 돈다.
- 시험: 새 파일 셋 + 접근 시험 확장 **64/64** · 관련 묶음까지 **159/159** · `npm run lint` 0 오류 · `tsc` 0 · `lint:affordance` 0. 폰 폭 390 **실측**(Playwright · 장면 8) 가로 넘침 0.

## 1. 한 것

### 1.1 셸 — `src/components/unified/UnifiedWorkspace.tsx` · `Workroom.module.css` · `WorkspaceIcon.tsx`

| 자리 | 한 것 |
|---|---|
| 뷰 | `type View = WorkspaceMenu \| EnglishView`(`src/components/english/views.ts` — React 를 모르는 작은 모듈이라 셸이 정적으로 불러도 영어 묶음이 같이 실리지 않는다). `menuOf(view)`(영어 뷰 셋 → 메뉴 `english`) · `productOf(view)`(제품은 뷰에서 파생, 저장 없음) · `viewValid` 는 메뉴 + 영어 뷰 셋 |
| 옆 메뉴 목록 | `navItemsOf = { math: 수학 8, english: [학교별 내신 대비 · 문제 만들기 · 문제 보관함] }` — `availableNav` 는 **지금 제품**만. 빠른 검색(Ctrl K)은 `quickNav`(두 제품 다). 아이콘 `school` · `pen` 새로, `folder` 재사용, ▾ 는 `down` |
| 고르기 단추 | 제품이 둘 이상이면 브랜드 단추가 `aria-haspopup="listbox"` · `aria-expanded` · 이름 옆 ▾, `aria-label` «제품 고르기 — {제품 이름}». 누르면 바로 아래 `role="listbox"` «제품»(옵션은 `role="option"` 단추, 현재 제품 `aria-selected` + ✓). 고르면 그 제품 첫 뷰 — 수학 `defaultView`(지금 규칙) · 영어 `english`. 키보드 ↑↓(순환) Enter Esc · 바깥 mousedown 닫힘 · 닫히면 브랜드로 포커스 되돌림. 제품이 하나면 예전 단추 그대로(«오늘의수학 홈» / «{제품} 작업실», ▾ 없음) |
| 접힘(72px) | 마크 귀퉁이 딱지 «영»(`.productBadge` — `#3b60df` · 10px 800 · `#14243d` 2px 테두리, **접힘 + 영어일 때만** `display:grid`). 접힌 채 마크를 누르면 목록이 옆으로(`position: fixed; left: 80px; top: 18px; width: 220px` — `profilePanel` 결). **영어 제품일 때만**(`.workspace[data-product="english"]`, 검토 #1 뒤 `3a2b9603d`) `.sideHeader` 를 세로로 세워 마크(딱지 «영»)를 접기 단추 **위**에 둔다. 수학 접힘은 제품 수와 무관하게 **기준 커밋 그대로**(표지 없음 · 브랜드 숨김 · 접기 단추만 — 05 §8.23 ⑷ «수학은 지금 모습 그대로»). 수학에서 접힌 채 제품을 바꾸려면 펼친 뒤 고른다. 영어만 있는 계정도 접힘에서 마크 + 딱지가 보인다(#9) |
| 파란 단추 · 캡션 | 영어 제품이면 `s.newButton` «새 시험 등록»(`Icon plus`) → `setModal("english-exam")`, 그 아래 `s.navCaption` «오늘의 영어». 수학이면 «새 시험지 만들기» 그대로 |
| modal | `"new" \| "search" \| "help" \| "english-exam"`. 셸 `<dialog>` 는 `shellModal`(english-exam 제외)만 연다 — «새 시험 등록» 창은 영어 뷰가 제 창으로 그린다. 권한이 빠지면 닫는 효과에 `english-exam` 도 넣었다. `navigate()` 가 닫는 것은 그대로 |
| 마운트 | 개념·SRS 블록과 같은 결 — `canEnglish && (opened 에 영어 뷰가 있거나 product === "english")` 일 때 `<main hidden={product !== "english"}>` 에 `EnglishStudio`(next/dynamic) 하나. **`worksheetView` 에 넣지 않았다** — «현재 시험지» 카드·담기 바·Ctrl S 저장은 영어에서 안 뜬다 |
| 알림 줄 | 셸 알림 줄 조건을 `(worksheetView \|\| modal \|\| product === "english")` 로 넓히고, 영어 뷰에 `onNotice(message, tone)` → `setNotice(message, tone === "alert")` 를 준다(토스트 없음, `role="status"/"alert"` 그대로) |
| 딥링크 | `sync()` 가 `extraction` 처럼 `set` 을 읽는다(`/^[0-9a-f-]{36}$/i` + `can("english")`). 있으면 해시가 없어도 뷰를 `english` 로 맞추고 `openSet {id, version}` 을 영어 뷰에 넘긴다. 영어 뷰가 열고 나면 `forgetSetLink()` 가 `replaceState` 로 `set` 을 지운다(없는 세트여도 지운다 — 새로 고칠 때마다 같은 알림이 반복되지 않게). 권한 없음·모양 틀림은 무시 |
| 브레드크럼 | «작업실 › {영어 뷰 이름}» |

### 1.2 영어 화면 — `src/components/english/**`

| 파일 | 하는 일 |
|---|---|
| `views.ts` | 뷰 id 셋 · `isEnglishView` · `EnglishNotice` 타입 |
| `englishClient.ts` | `requestEnglish`(서버 문구 그대로, **상태 코드**와 422 `details.issues` 를 실은 `EnglishRequestError`) · `formatIssues` · 고른 시험 기억(`today-english-exam`, try/catch) · 표기(`formatBytes` «412 KB» · `formatChars` «490자» · `formatDay` «9월 30일» · `formatExamDate` «10월 14일 시험 예정»/«시험 날짜 미정», Date 를 안 거쳐 시간대에 안 흔들림) · `SOURCE_LABEL` · `STATUS_TONE`(초안 호박 · 검토 중 회색 · 검토 완료 코발트 옅은 면) · 파일 상한 문구는 **계약 `ENGLISH_MATERIAL_MAX_LABEL`** 하나에서 |
| `EnglishStudio.tsx` | 뿌리. `GET /api/english/exams` **한 번**, `materials[examId]` · `sets[examId]` 캐시(처음 필요할 때 한 번, «새로고침»은 강제). 고른 시험 = 기억한 id 가 목록에 있으면 그것, 없으면 첫 시험. 딥링크 효과: 세트를 읽어 `selectExam(set.examId)` → 편집 화면(읽은 세트를 씨앗으로 넘겨 두 번 읽지 않는다) → 404 면 «문제 세트를 찾을 수 없습니다.»(alert) → 어느 쪽이든 `onSetOpened()`. 빈 상태 카드 «첫 시험을 등록해 주세요». «새 시험 등록» 창(학교 이름 필수 80 · 학년 · 시험 날짜 선택 `type=date` · 시험 이름 기본 «2학기 중간고사») → POST → 그 시험 고름 + «시험을 등록했습니다.» |
| `EnglishExamPicker.tsx` | 학교 칩(`role="group"` «학교», 고른 칩 `aria-pressed` + 옅은 코발트 면·테두리) + `<select>` «시험 고르기»(`학년 · 이름`). 세 뷰가 같은 것을 그린다 |
| `EnglishPrepView.tsx` | 시안 본문 그대로 — 머리(`WorkspacePageHeader` + «새 시험 등록») · 칩 줄 · «이번 시험 준비»(세 단계는 **단추**: 자료 추가 창 · 만들기 뷰 · 보관함 뷰, 끝난 단계 코발트 원 ✓, 수는 읽어 둔 목록 길이 우선·없으면 시험 요약) · 왼쪽 **시험 자료**(파일은 `<a download href=/api/english/materials/{id}>`, 텍스트는 글자 수, 삭제 × → `ConfirmDialog`) + «자료 추가» 창(탭 둘 `role="tablist"`: 파일 업로드 multipart — **받는 쪽보다 먼저** 상한·확장자를 자른다 / 지문 직접 입력 이름+글 JSON · 각주 «PDF·이미지는 보관용입니다…») · **출제 설정**(딱지, «설정 수정» 창 → `ENGLISH_GENERATED_TYPES` 체크 → `PATCH types`, «대상 학년», «시험 삭제» → `ConfirmDialog` 에 딸린 자료·세트 수와 함께) · 오른쪽 **대비 문제 세트**(최근 4 카드: 알약 · 제목 · 출처 한 줄 · 유형 ≤3 · 문항 수 · «열기») · 큰 «학교 맞춤 문제 만들기» · «모든 문제는 강사 검토 뒤에 씁니다.» |
| `EnglishEditor.tsx` | 도구 줄 «목록» · 검토 상태 `<select>` · «인쇄»(작은 창: 학생용 · 교사용 → `/english/sets/{id}/print?view=…` `target=_blank` 링크, 검토 완료가 아니면 «아직 검토 완료하지 않은 문제입니다.») · «세트 삭제»(`ConfirmDialog`) · «저장». 본문: 세트 이름 · «{출처} · N문항 · {학교}» · 지문(세리프 `textarea`) · 문항마다 «QUESTION 01 · 유형» · 발문 · 보기 1~5(`aria-label` «N번 문제 M번 선택지») · 정답 번호 `<select>` / 서술형·원문 복원은 «정답·인정 답안» 글 · 해설·채점 기준 · 지문 속 근거. **내용을 고치면 상태 «초안»**(상태만 바꾸는 것은 편집이 아님). 저장은 보내기 전에 공용 검증기(`validateEnglishDraft`)를 지나 «N번 문항: …» 한 줄씩, `PUT` 에 `revision` 실음, 성공하면 응답 `revision` 으로 갱신(두 번째 저장이 새 값을 싣는다 — 시험으로 잠금). **409 는 상태 코드로** 판정 → 알림 줄 + «다시 불러오기»(다시 읽으면 알림이 걷힌다). 422 `ENGLISH_DRAFT_REJECTED` 의 `details.issues` 도 같은 형식으로 보인다 |
| `EnglishLibraryView.tsx` | 머리 · 칩 줄 · 이름 검색(`type=search`) · 상태 `<select>` · «새로고침» · «{학교} · {학년} · {이름}» 줄 · `<ul aria-label="문제 세트 목록">` — **행 전체가 `<button>`**(D-30) · 빈 상태 «아직 만든 문제 세트가 없습니다.» + «문제 만들기» · 거른 결과 없음 «조건에 맞는 문제 세트가 없습니다.» |
| `EnglishMakerView.tsx` | **자리표** — «문제 만들기 — 준비 중» 한 줄, props 는 공통 지시 §3 약속 그대로(`exam · materials · onSaved · onNotice`). 뿌리는 `onSaved(id)` 에 세트 목록을 다시 읽고 «학교별 내신 대비» 뷰의 편집 화면을 연다 |
| `EnglishDialog.tsx` | 작은 창 공용 — 작업실 `<dialog className={w.dialog}>` 틀·제목·«창 닫기» 그대로(`ConfirmDialog` 결: `showModal` · Esc · 배경 누르기 · 포커스 되돌림 · 작업실 뿌리로 portal) |
| `EnglishStudio.module.css` | 작업실 토큰(`--ink/--muted/--accent`) + 시안 C 값. **정정(검토 #6)**: 이 파일의 hex 42 중 `Workroom.module.css` 값 14 · 시안 C 값 24 · ConceptView/globals 값 4 — «새로 지은 색»은 없지만 «Workroom 밖 값 없음»은 아니다(시안 C 값은 원장님이 고른 것이라 D-07 위반은 아님). 새 글꼴은 싣지 않음 — `--e-serif` 는 `PAPER_FONTS.serifKR` 를 CSS 에 손으로 옮긴 것 + Georgia(검토 #7, 주석에 출처). 카드·행에 `cursor`·hover 없음, 왼쪽 색 막대 없음. 760px 아래 한 열 |

### 1.3 MSW — `src/mocks/handlers/english.ts` + `handlers/index.ts` 등록 한 줄

계약의 열 경로 전부. 상태 없음(class.ts 결) — POST/PATCH/DELETE 는 «반영됐다면 이런 모양»을 돌려주고 화면이 응답으로 자기 상태를 고친다. 픽스처: 시험 둘(침산중 중3 · 경명여중 중2) · 자료 둘(pdf 파일 · 텍스트) · 세트 둘(ChatGPT 초안 3문항 · `makeCloze` 로 만든 원문 복원 검토 완료 3문항). 표본 지문은 **우리가 지은 짧은 글**(마을 학생들의 나무 심기). 세트 픽스처가 검증기를 지나는지 시험이 잠근다. 오류 코드는 병합한 계약대로 — 검증기 거절 **422 `ENGLISH_DRAFT_REJECTED` (`details.issues`)** · revision 불일치 **409 `REVISION_MISMATCH`** · 파일 상한 **413 `PAYLOAD_TOO_LARGE`**(content-length 로 먼저, 파일 크기로 다시).

### 1.4 리드 병합(2de827cc3) 반영

- 자료 파일 상한 **4MB** — 화면·대역·시험의 문구는 전부 `ENGLISH_MATERIAL_MAX_LABEL` 에서 끌어 쓴다(«4MB 이하의 파일만 올릴 수 있습니다.» · 창 안 «4MB 이하 · pdf docx txt png jpg»). 10MB 글자는 0.
- 오류 코드 셋 위와 같이. 화면은 코드가 아니라 **상태 코드**로 판정하므로 base 가 코드를 바꿔도 화면은 안 깨진다.
- 리드가 규칙 `s` 플래그를 걷어 `tsc` 가 0 이 됐다(병합 전에는 `englishValidate.test.ts` 한 줄이 ES2017 대상에서 빨갰다).

## 2. 시험

| 명령 | 결과 |
|---|---|
| `npx vitest run src/__tests__/components/EnglishStudio.test.tsx EnglishEditor.test.tsx EnglishLibrary.test.tsx UnifiedWorkspace.access.test.tsx` | **4 files · 64 passed** |
| 위 넷 + `englishMenu` · `mockHandlers.contract` · `contracts.smoke` · `englishValidate` | **8 files · 159 passed** |
| `npm run lint` | 0 오류(경고 63 은 전부 손대지 않은 기존 파일) |
| `npx tsc --noEmit` | 0 |
| `npm run lint:affordance` | 0 |

- `UnifiedWorkspace.access.test.tsx` 에 «제품 전환 — 브랜드 자리 고르기 단추 (D-148)» 묶음 11개: 제품 목록은 권한 있는 제품만(영어 없으면 ▾·목록 없음) · 영어만 있는 계정은 목록 없이 바로 영어 탭 셋 · 영어로 넘어가면 옆 메뉴 셋 + «새 시험 등록» + 캡션, 돌아오면 수학 여덟 그대로(영어 뷰는 숨김으로 남고 다시 마운트하지 않음) · 키보드 ↑↓ Enter Esc · 바깥 클릭 · 포커스 되돌림 · `#english-maker` 직접 열기 + 빠른 검색에 두 제품 · 영어 권한 없이 `#english-library` → 첫 허용 메뉴 · `?set=` 딥링크(넘김 · 열리면 URL 에서 지움 · 해시 없어도 영어 뷰 · 모양 틀리면 안 넘김 · 권한 없으면 무시) · 접힘 딱지 «영»(영어일 때만, 마크를 누르면 목록) · 영어에서 «현재 시험지» 안 뜸 + 영어 알림이 셸 알림 줄로. **기존 수학 시험은 손대지 않았고 그대로 초록.**
- `EnglishStudio.test.tsx`(17) · `EnglishEditor.test.tsx`(8) · `EnglishLibrary.test.tsx`(5) — 브리프 §3 의 409 흐름 · 상한 초과 파일 거절 문구 · 삭제 확인 셋 · 딥링크 둘 · 빈 상태 · 오류 문구 그대로 · 새로고침 재읽기 · 행은 단추. 공용 틀 `EnglishStudio.harness.tsx`(vitest 가 수집하지 않음).
- **폰 폭 390 은 jsdom 시험에 넣지 않았다** — jsdom 은 배치를 모르므로 `scrollWidth` 가 늘 0 이라 그 단언은 **거짓 초록**이다(교훈 «값이 맞으면 시험이 다 초록이다»). 대신 개발 서버(`/dev/unified`, 포트 3117, 가짜 `DATABASE_URL` · 임시 `AUTH_SECRET`)에 영어 API 를 픽스처로 끼우고 Playwright(Chromium, 390×844 · DPR 2 · isMobile)로 **실측**했다:

| 장면(390) | doc scrollWidth | body scrollWidth | 오른쪽 경계 넘는 요소 |
|---|---|---|---|
| 학교별 내신 대비 | 390 | 390 | 0 |
| 자료 추가 창(지문 직접 입력 탭) | 390 | 390 | 0 |
| 새 시험 등록 창 | 390 | 390 | 0 |
| 문제 보관함 | 390 | 390 | 0 |
| 문제 만들기 자리표 | 390 | 390 | 0 |
| 편집 화면(초안 세트) | 390 | 390 | 0 |
| 인쇄 창 | 390 | 390 | 0 |
| 제품 목록 열림 | 390 | 390 | 0 |

  데스크톱(1280) 실측: 접힌 옆 메뉴 폭 **72px** · 딱지 `display:grid` · 10px · 800 · `rgb(59,96,223)` · 테두리 2px `rgb(20,36,61)` · 접힌 채 연 목록 `left 80 · top 18 · width 220`. 펼침·접힘 캡처는 눈으로 시안 C 와 견줬다(브랜드 «오늘의영어 ▾» · 목록 «오늘의수학 / 오늘의영어 ✓» · «새 시험 등록» · 캡션 · 탭 셋 · 본문 배치). 탐침 스크립트는 `.tmp-english-probe/phone-width.ts`(`.tmp-*/` — 추적 안 함, §5 ④). **화면 캡처는 산출물로 만들지 않았다**(브리프 §3 — 리드가 병합 뒤 main 에서).
- 파일 업로드 **성공** 경로는 MSW 로 못 돌린다 — jsdom 의 `FormData` 를 Node fetch(undici)·MSW 가 못 싣는다(탐침: 요청이 영영 안 끝나거나 500). 그 한 시험만 `fetch` 를 대역으로 갈아 «multipart 로 `file` 을 실었나»와 «응답을 목록에 더하나»를 본다. 거절 두 경로(상한 · 확장자)는 요청이 나가기 전에 자르므로 MSW 그대로.

## 3. 브리프와 다르게 했거나 내가 정한 것 (리드가 알아야 할 것)

1. **접힘 + 영어 제품일 때만 옆 메뉴 머리를 세로로**(마크 위 · 접기 단추 아래, 머리 높이 약 +48px). 시안 C 접힘에는 접기 단추가 없었지만 실제 셸은 마우스로 펼칠 길이 있어야 해서. 처음 판은 «제품 둘 이상이면»이었는데 영어 메뉴가 전 계정 기본 켜짐이라 수학 접힘까지 바뀌어(검토 #1) **영어일 때만**으로 좁혔다(`3a2b9603d`). 수학 접힘은 제품 수와 무관하게 기준 그대로.
2. «새 시험 등록» 창은 **영어 뷰가 제 창(`EnglishDialog`)으로** 그린다 — 셸 `modal === "english-exam"` 이 `newExamOpen` 으로 내려간다. 셸 `<dialog>` 는 그 값에 열리지 않는다(`shellModal`).
3. 알림은 셸 알림 줄 그대로(고정 위치 줄 — 브리프 «토스트 없음»을 «셸 결 그대로»로 읽음). 영어 뷰는 제 알림 줄을 두지 않는다. 다만 목록·세트를 **못 읽은** 오류는 그 자리에 `role="alert"` 줄 + «다시 시도/목록» 단추.
4. 편집 화면의 **유형은 읽기 전용**(바꾸면 보기 모양이 갈린다 — 유형 바꾸기는 다음 판).
5. 저장 전 **공용 검증기**를 화면에서 한 번 지난다(세 길 공통 규칙, 25 §4.4). 통과 ≠ 검토 완료 — 상태는 사용자가 고른 값 그대로 보낸다.
6. 보관함·만들기 뷰에도 **학교 칩 + 시험 고르기 줄**을 둔다(브리프 §2.1 «셋이 나눠 쓴다»를 화면으로).
7. **만들기 뷰의 머리(`WorkspacePageHeader` «문제 만들기»)와 칩 줄은 뿌리가 그린다** — ai 트랙의 `EnglishMakerView` 는 본문만 그리면 된다(머리를 또 그리면 둘이 된다). ai 가 머리를 갖고 싶으면 뿌리에서 두 줄을 빼면 된다(§5 ②).
8. 딥링크로 연 세트가 **없어도** URL 의 `set` 을 지운다(새로 고칠 때마다 같은 알림이 반복되지 않게).
9. 시험 삭제 확인 문구의 자료·세트 수는 시험 요약(`materialCount`·`setCount`)에서 — 목록이 더 새것일 수 있어 한두 개 어긋날 수 있다(삭제 여부에는 영향 없음).
10. `data-testid="product-badge"` 표지를 제품 코드에 두었다(접힘 딱지 시험용 — CSS 로 숨기는 것이라 역할·이름으로는 못 잡는다).

## 4. 못 한 것

- «문제 만들기» 화면(세 길) — ai 트랙 몫, 자리표만.
- 실제 라우트(base)와의 연결 확인 — 공통 지시대로 리드가 병합 뒤 main 에서. 화면은 MSW 대역과 상태 코드 계약만 본다.
- 인쇄 페이지 — print 트랙. 셸은 링크만 연다.
- 화면 캡처 산출물(지시대로 안 만듦).

## 5. 리드가 정할 것

1. §3 ① 접힘 머리 세로 배치 — 이대로 둘지, 접힘에서는 마크만 두고 접기 단추를 없앨지(시안 C 그대로 — 그러면 마우스로 펼칠 길이 Ctrl+\\ 뿐).
2. §3 ⑦ 만들기 뷰 머리·칩 줄의 소유(뿌리 vs ai). 지금은 뿌리.
3. 오류 코드 상수: 화면은 상태 코드로 판정하므로 무관하지만, base 라우트가 422 에 `details: { issues }` 모양을 쓰는지 확인(편집 화면이 그 모양을 읽는다 — 다른 모양이면 서버 문구만 보인다).
4. 폰 폭 실측 스크립트를 저장소에 둘지(`scripts/qa/english-phone-width.ts` 로 옮기면 `/dev/unified` + 픽스처 경로만 그대로). 지금은 `.tmp-english-probe/`(추적 안 함).
5. 자료 행의 `<a download>` — 라우트가 `Content-Disposition: attachment` 를 주므로 `download` 속성은 중복(무해). 둘 중 하나로 통일할지.

### 5.1 리드 결정 (2026-09-30, 보고서 45f90eb52 를 읽고)

| # | 결정 | 반영 |
|---|---|---|
| ① 접힘 머리 세로 배치 | **이대로 둔다** — 제품 둘 이상일 때만 · 마우스로 펼칠 길이 있어야 한다. 시안 C 접힘은 접기 단추를 안 그렸을 뿐 → **적대적 검토 뒤 리드가 뒤집음**: 영어 메뉴가 전 계정 기본 켜짐(25 §7 ④)이라 «제품 둘 이상»은 곧 «모든 계정»이었다. **영어 제품일 때만**으로 좁힌다(검토 (c) 안) | `ea39797f7` → `3a2b9603d`(§7) |
| ② 만들기 뷰 머리·칩 줄 | **뿌리(shell) 소유** 그대로. ai 트랙에 `EnglishMakerView` 에서 `WorkspacePageHeader` 와 시험 문맥 줄을 빼라고 보냈다. 뿌리는 손대지 않는다 | 코드 그대로 |
| ③ 422 모양 | base 라우트 `routeSupport.ts` 의 `draftRejected` 가 `details: { issues }` 를 준다 — 편집 화면 판정과 같다. 확인 끝 | — |
| ④ 폰 폭 실측 스크립트 | **저장소에 둔다** — `scripts/qa/english-phone-width.ts`. 조건: `src/lib/english/**` · `src/components/english/**` · `src/mocks/handlers/english.ts` 를 import 하지 않는다(울타리 ⑴ 이 `scripts/` 를 금지 뿌리로 둔다). 픽스처는 인라인(자작 지문) · 머리 주석에 실행법 한 줄 · `probe-*.ts` 와 같은 맨몸 실행 | **커밋 `faab7d945`** — import 는 `node:fs` · `node:path` · `playwright` 뿐. 산출물 `.qa-artifacts/english-phone-width/`(추적 안 함). 옮긴 뒤 다시 돌려 장면 8 전부 390 · 넘침 0 · exit 0 확인. `.tmp-english-probe/` 는 지웠다 |
| ⑤ `<a download>` + `Content-Disposition` | **그대로 둔다**(무해) | — |

## 6. 위험

- `useCallback(() => setModal(…), [setModal])` — React Compiler 린트(`preserve-manual-memoization`)가 `[]` 를 거부해 `setModal` 을 deps 에 넣었다(기존 코드 결과 다르지만 뜻은 같다).
- 셸의 `View` 타입이 넓어졌다 — `WorkroomHome.onNavigate`·`WorksheetEditor.navigate` 는 `WorkspaceMenu` 인자라 그대로 맞는다(넓은 함수에 좁은 인자).
- MSW 대역은 상태가 없어 «삭제 → 새로고침»이면 다시 나타난다(대역 특성 — 실제 라우트에서는 아니다).
- 편집 화면은 보기가 5개 미만인 세트도 5칸으로 그린다(빈 칸은 저장 때 검증기가 막는다).
- `EnglishStudio` 는 `next/dynamic` — 접근 시험은 탐침으로 갈아 끼웠다(다른 뷰와 같은 방식).
- 병합 순서: 이 트랙은 계약(`2de827cc3`)을 이미 품고 있다. base·ai·print 와 같은 파일을 만지지 않았다(공통 지시 §3 표대로). ai 가 `EnglishMakerView.tsx` 를 채우면 **ai 판을 택하고** props 약속만 맞으면 된다.

## 7. 검토 후속 (적대적 검토 «조건부 병합 가능» → 리드 후속 목록, 2026-09-30)

검토 보고서: 리드 스크래치 `review-english-shell.md` ②·③. main 은 병합하지 않았다(리드 지시 — 병합 때 `EnglishMakerView.tsx` 충돌은 ai 판).
**커밋 `3a2b9603d`**(코드·시험, amend 없음) + 이 보고서 정정.

| # | 심각도 | 한 것 | 시험 |
|---|---|---|---|
| 1 | 🔴 | 접힘 머리 세로 배치를 **영어 제품일 때만**으로 좁힘 — 표지 `data-picker` → `data-product="english"`(영어가 아니면 속성 자체가 없다), `Workroom.module.css` 두 규칙을 그 표지에 걸음. 수학 접힘은 제품 수와 무관하게 기준 커밋과 같은 DOM·클래스·높이. 접기/펼치기를 누르면 열려 있던 제품 목록도 닫는다 | `UnifiedWorkspace.access`: 수학 접힘(제품 하나 · 둘) = `data-product`·`data-picker` 없음 + 딱지 없음 / 영어 접힘 = `data-product="english"` + 마크 안 딱지 «영» + 마크 눌러 목록 |
| 2 | 🟡 | `data-picker="false"` 가 제품 하나 계정에 붙던 것 — 표지 교체로 사라짐(수학은 어떤 값도 안 붙는다) | 위 시험의 `not.toHaveAttribute("data-picker")` |
| 9 | 🟢 | 영어만 있는 계정도 접힘에서 마크 + 딱지(#1 과 함께 풀림) | «영어만 있는 계정도 접힘에서 표지와 딱지» |
| 3 | 🟡 | `DevAiStatusPanel`(수학 «AI 작업 연결» 판)을 `product === "math" && can("studio")` 로 | «AI 작업 연결 판은 수학 제품에만» — 영어로 가면 사라지고 돌아오면 다시 |
| 4 | 🟡 | 시험 구멍(변이 M11) — 편집 화면이 빈 보기 칸을 걷어낸 뒤 공용 검증기를 지나고, 걸리면 **PUT 을 보내지 않는다** | `EnglishEditor`: 1번 문항 5번 보기를 비우고 «저장» → PUT 0건 · `role=alert` «1번 문항: 보기는 5개여야 합니다 (지금 4개).» |
| 5 | 🟡 | «새 시험 등록» 창을 목록 «읽는 중»·«오류» 분기에도 그린다. 목록 없이 등록하면 `[created]` 로 ready 가 되고 목록을 다시 읽는다 — 다시 실패해도 방금 등록한 시험은 남는다(`loadExams` 가 ready 목록을 지우지 않음) | `EnglishStudio`: GET 500 → 셸 자리 단추로 창 → 등록 → 칩 «정화중학교» 고름 · 오류 줄 걷힘 |
| 8 | 🟢 | 리터럴 → 계약 상수: 지문 `ENGLISH_PASSAGE_MAX` · 자료 글 `ENGLISH_MATERIAL_CONTENT_MAX`(문구 «30,000자 이하»도 여기서). 계약이 내보내지 않는 값(세트 이름 160 · 보기 1,500 · 학교 80 · 시험 이름 100 · 자료 이름 255)은 이름 붙인 상수 + 계약의 어느 스키마 값인지 주석 | — |
| 13 | 🟢 | 제품 listbox 가 Tab 으로 초점이 밖으로 나가면 닫힌다(`onBlur` · `relatedTarget` 이 목록·브랜드 밖일 때만 — 목록 안 이동·브랜드 되돌림은 그대로) | «Tab 으로 초점이 목록 밖으로 나가면 닫힌다» |
| 6 | 🟢 | 보고서 §1.2 «새 색 없음» 정정(hex 42 = Workroom 14 · 시안 C 24 · ConceptView/globals 4) | — |
| 7 | 🟢 | `--e-serif` 주석에 출처(`PAPER_FONTS.serifKR` 손 사본 + Georgia) — 값은 그대로 | — |

기록만(고치지 않음, 리드 지시): #12 409 시험이 `code:"REVISION_MISMATCH"` 도 같이 보내 코드 판정 구현도 초록 — 상태 코드 경로는 변이 M10 이 물었다 · #14 브랜드 «오늘의영어»(계약 `WORKSPACE_PRODUCTS` 라벨) vs 캡션 «오늘의 영어»(메뉴 라벨) — 그대로 · #10 수학 bank 뷰 «떠나도 hidden 으로 남는다»는 기존 셸 구멍 · 인쇄 링크는 브리프대로(항상 + 검토 완료 아니면 경고 한 줄).

후속 뒤 관문(커밋 `3a2b9603d` 트리): `npx vitest run` EnglishStudio · EnglishEditor · EnglishLibrary · UnifiedWorkspace*(access · actions · cart · orderReset) · englishMenu — **8 files · 94 passed** · `eslint`(트랙 파일 전부) 0 · `lint:affordance` 0 · `tsc --noEmit` 0.
