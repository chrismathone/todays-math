# «오늘의 기억» — 내부 기능 연결 계획 (A′ · Anki 1단계 · 점진 빈칸 · 단일 카드)

> **사용자 정정 반영 — 2026-10-07:** 이번 구현은 연동 없이 작동하는 SRS다. 개념 은행, 학생 인증, 독립 복습 기록과 FadingSource만으로 1~4단계와 일정·통계가 작동해야 한다. 교재·강의·진도·문제은행·영어 연결은 이후 선택적으로 켠다. 아래의 연결 표는 검토 및 후속 계획이며 현재 기능이 전부 연동됐다는 뜻이 아니다.

## 독립 운영과 추후 연동

- 기본값은 **연동 OFF**다. OFF에서는 연동 어댑터 조회·동기화·기록 변경을 호출하지 않는다. 외부 서비스 상태와 연결 자격증명은 SRS 학습의 필수 조건이 아니다.
- 신규 카드 방식의 배포 스위치(`MATH_FADING_CARDS`)와 연동 스위치는 별개다. 학생 인증·본인 기록·현재 권한 확인은 연동 OFF에서도 유지한다.
- 추후 연동 어댑터는 교재 개념의 확정 ID 매핑, 권한이 확인된 단원 강의 링크, 단원 진도·연습 링크를 선택적으로 제공한다. 어댑터가 완성되고 검증된 뒤 ON을 지원하며, 이번 화면에 작동하지 않는 ON 버튼을 넣지 않는다.
- 연동을 켜거나 꺼도 SRS의 기존 선택 개념·학습 기록·FSRS 일정은 보존한다. 강의 시청·듣기 재생·교재 설명 기록으로 일정을 자동 갱신하지 않는다.
- 이번 범위는 독립 SRS 계약과 카드 화면이다. 연결 L1~L6, 온라인 AI, 자체 듣기의 별도 일정기는 후속 작업이다.

감사 산출물의 최종 사본은 `.qa-artifacts/todays-math-capabilities/`에 보존했다. 인프라 최종 집계는 Next API 파일 201개와 Python 엔드포인트 파일 1개로 총 202파일, 명시 메서드 278+2=280개다. 교사 보고서의 203은 수집 분류가 달라 같은 API 파일 수로 사용하지 않는다. 아래의 기준 커밋은 감사 시점의 스냅샷이며, 이후 구현·배포 상태와 구분한다.

작성: Claude 작업자 · 2026-10-07 · task_bcc6feb6f44d · **읽기 전용** — 소스 · 환경 · DB · git · 의존성은 바꾸지 않았다. 쓴 것은 이 파일과 scratchpad 의 측정 스크립트뿐이다.
표기:
- **[사실]** 코드 · 감사 파일 · 은행을 직접 잰 것.
- **[판단]** 추천.
- 교육 효과는 주장하지 않는다.
🔴 이 문서에 나오는 개수(라우트 · 파일 · 행 수)는 **감사 목록을 센 수**다. 학습 지표(FSRS · 성취)와 섞지 않고, 어디서도 점수로 합치지 않는다.

---

## 0. 기준 — 무엇을 어느 시점에서 읽었나

| 층 | 커밋 | 무엇 |
|---|---|---|
| origin/main | `00e09a537` | 마지막 fetch 기준. 이 조사는 fetch 하지 않았다 |
| 교사 · 인프라 감사의 고정 HEAD | `029f7d017` | |
| 학생 감사의 최종 기준 | `ade27dfce` | main 사본 `.qa-artifacts/todays-math-capabilities/internal-student-capabilities.{md,json}` |
| **지금 로컬 main** | `ade27dfce` | `029f7d017` 위에 단일 카드 커밋 넷: `d5eaef9ef` · `eaab260e5` · `27a96aa8a` · `ade27dfce` |
| 작업 트리 | — | 루트의 화면 작업(미커밋). 이 계획은 건드리지 않는다 |

- [사실] `029f7d017..ade27dfce` 에서 바뀐 것은 **화면 9파일뿐**이다(`src/components/fading/**` 8 + 시험 1).
- [사실] 같은 구간에서 `src/lib` · `src/contracts` · `prisma` 는 0줄이다. 그래서 속 · 계약 · 저장에 관한 근거는 두 기준에서 같다.
- [사실] 로컬 main 은 origin/main 보다 커밋 10개 앞서 있다(마지막 fetch 기준). 운영에 무엇이 나가 있는지는 확인하지 않았다.

**근거 파일**

| 감사 | 파일 | 범위 · 한계 |
|---|---|---|
| 학생 | main `.qa-artifacts/todays-math-capabilities/internal-student-capabilities.md`(35KB) · `.json`(1.35MB) | 기능군 27 · 허용 규칙 53 · 페이지 13 · API 파일 27 · 경로 35. 원래 작업 트리는 정리됐다 — 처음에는 원래 사본(1.0MB · `029f7d017` + `head_now`)을 읽었고, 그다음 main 사본 MD 를 읽었다 |
| 교사 | main `.qa-artifacts/todays-math-capabilities/teacher.md`(113KB) · `teacher.json`(41MB) — 원래 작업 트리는 정리됐고 같은 파일을 main 에 옮겼다(msg_e782df4e38ef) | **교사 기능 84행**(W · B · S · P · L · C · T · E · K · R · TB · EN · EL · A · D) · API 203(교사 157) · 화면 114 |
| 인프라 · AI | main `.qa-artifacts/todays-math-capabilities/internal-infraAI.md` · `.json` | **회의용 53그룹** · Next API 201 · Python 파일 1 · 명시 메서드 총 280 · SQL 함수 44 · 모델 88. 3.3은 53그룹을 따른다 |
| Gemini | main `.qa-artifacts/gemini-reconciliation.md` · `.qa-artifacts/todays-math-capabilities/gemini-consultation.md` | 초기안의 사실 오류를 최종 대조에서 정정했다 |

인프라 최종 보고와 기계용 근거는 main에 복사했고 완료된 감사 작업 트리를 정리했다. 기능군은 53개이며 원본 코드와 현재 운영 상태를 구분한다.

세 감사 모두 정적 색인이다. 실행 · DB · 운영은 확인하지 않았다(runtime / deployment-unverified). 이 계획도 같다.

---

## 1. 전제 (확정 — 다시 묻지 않는다)

1. **4단계 = A′**.
   - 문장 틀 안의 빈칸에 핵심 답을 직접 쓴다. 칩이 없고, 수식에도 칩 예외가 없다.
   - 개념의 카드를 다 마친 뒤 기준안과 한 번 대조한다.
   - 자판 글로 알아보지 못한 답(«모름»)만 학생이 «같은 뜻 / 다름»을 고른다.
2. **1단계 = Anki 카드(새 개념)**. 앞면 «용어 · 종류» → 생각 → Space/Enter → 뒷면 → **«처음 봄 / 들어 봄 / 알고 있었음»**. 진단일 뿐이고 FSRS 를 움직이지 않는다.
3. **2 · 3단계**는 칩 그대로다. 지우는 차례는 은행 밖의 덧씌움 표가 정한다.
4. **콜드 4단계**(서 있는 단계 4에서 연 복습): 카드마다 입력란이 열리기 전에 **«모름 / 긴가민가 / 확실»** 진단을 받는다. 결과와 따로 두고 평균하지 않는다.
5. **FSRS** 는 풀이(복습일) 하나에 한 번, 4단계 대조 뒤에 `rateFadingSession` 한 곳에서만 움직인다.
   - «다시»를 고정하는 것은 객관적 틀림뿐이다.
   - «모름 → 자동 Again»은 폐기됐다(루트 정정).
6. **복습**은 1단계를 다시 거치지 않는다. «다시» 뒤에는 3단계나 2단계부터 시작해 A′ 로 간다.
7. 앞선 원문:
   - 이 작업자의 4단계 최종 합의: `scratchpad/fsrs2/final.md`
   - 사용자 결정과 구현 기준: [독립 SRS 카드 학습](fading-card-learning.md)
   - 초기 Gemini·FSRS 자문 원문: `.qa-artifacts/todays-math-capabilities/`에 보존
   - 정본: `docs/planning/srs-overhaul-20261006.md`

**지킬 것**:
- 수학 은행과 은행 인쇄를 바꾸지 않는다.
- 기존 학생 복습 기록을 보존한다.
- 학습 원천과 ID 마다 정확히 잇는다.
- AI 를 일정 · 확신의 확정값으로 쓰지 않는다.
- 폐기된 외부 듣기 원본 · 전사를 복원하지 않는다.

---

## 2. 분류의 뜻과 가르는 원칙 넷

| 분류 | 뜻 |
|---|---|
| **연결** | 새 SRS 가 **ID 로** 직접 부르거나 그쪽으로 넘긴다(데이터 · 라우트가 이어진다) |
| **지원** | SRS 를 돕지만 일정 · 확신 · 단계에는 닿지 않는다(링크 · 표시 · 읽기 · 인쇄 · 관문 · 기록) |
| **유지** | 그대로 둔다. 기록을 보존하고 새 SRS 가 고치지 않는다(옛 기능 · 다른 영역) |
| **부적합** | 새 SRS 에 잇지 않는다 — 까닭을 적는다. 억지로 학습화하지 않는다 |

**가르는 원칙**(루트 정정 msg_c56f746f2552 반영)
- **P-a 노출 ≠ 인출.**
  - 강의 시청 · 듣기 재생 · 교재 열람은 «노출»이다.
  - FSRS 를 움직이는 것은 4단계 A′ 의 인출 결과(+ 학생의 평가 한 번)뿐이다.
  - 노출은 대기열 · 일정 · 단계에 들어가지 않는다.
- **P-b 외부 원본 은퇴 ≠ 자체 콘텐츠.**
  - 외부 193회 원문 · 원음 · 대본 · 식별자 · 답 순서는 은퇴했고 되살리지 않는다(EL07 · S27).
  - 자체 제작 · 권리 확인된 듣기는 살아 있는 별도 영역이다(EL01 ~ EL06 · S16 ~ S18).
- **P-c 단원 ID ≠ 개념 매핑.**
  - `Unit.id` ↔ 소단원 열쇠(`학년::대단원::소단원`) ↔ 그 소단원의 fading 개념은 **1 : 3 ~ 6**이다([사실] 중앙값 6).
  - 단원으로 이은 것(강의 · 진도 · 시험 오답)은 «이 단원»이라고만 말하고, «이 개념»이라고 쓰지 않는다.
  - 개념 단위의 다리는 은행 문장 id(`blankItems.entryId`) 하나뿐이다.
- **P-d 이름 공간은 바꾸지 않는다.**
  - `fading conceptId` · `explorer-card` · `math-srs CONCEPT_IDS` · `textbook conceptKey` · `course-section` · `graph-unit` · `Unit.id` 는 다른 계약이다(학생 MD «학생 ID · 저장 원본» 절).
  - `studentReview.ts:42` «Other ID namespaces are never converted» 를 그대로 지킨다.

---

## 3. 완전 표 — 기능군 × 현 기능 × SRS 재사용 × 권한 × 구현 유무 × 증거

### 3.1 학생 — 학생 감사의 기능군 27(감사 id 그대로)

| # | 기능군(감사 id) | 현 기능 | SRS 재사용 · 분류 | 권한 | 구현 | 증거 |
|---|---|---|---|---|---|---|
| S1 | `entry` | `/learn` → 문이 켜져 있으면 `/learn/fading`. `?view=collection` · `?fromTextbook=` 은 옛 탐험 | **유지**. L1 이 서면 `fromTextbook` 분기만 바꾼다 | 학생 세션 · `MATH_FADING` | 구현 | `src/app/learn/page.tsx:29` |
| S2 | `account` | 발급 아이디 · 첫 비밀번호 · 잠금 · 로그아웃 | **지원**. 모든 fading 요청이 `requireStudent({active:true})` 를 탄다 | 학생 전용 | 구현 | `src/lib/learn/studentRequest.ts:29` · `src/lib/fading/routes.ts:54` |
| S3 | `fading-home` | 오늘 계획 · 밀린 복습 · 연속 · 이어 하기 | **연결**. 대기열이 A′ 풀이를 연다. 진단은 숫자로 합치지 않는다 | 학생 | 구현 | `FadingHome.tsx:55` · `src/lib/fading/numbers.ts:113` |
| S4 | `fading-catalog` | 학년 · 검색 · pick / drop / open | **연결**. L3 «진도에 있음» 표지와 L1 의 교재 진입 강조가 붙는다 | 학생 | 구현 | `FadingCatalogScreen.tsx:30` · `view.ts:203` |
| S5 | `fading-erase` | 네 단계 안내 | **연결**. 안내 문구를 새 네 단계로 바꾼다(화면 = codex) | 학생 | 구현 | `FadingEraseScreen.tsx:14` |
| S6 | `fading-session` | 정독 · 칩 · 대조 · 평가 · miss | **연결(핵심 변경)**. 1단계 Anki · A′ · 확신 · 지문(§4) | 학생 | 칩판 구현 · **A′ 미구현**(초안 가지 `BIGSHOL/srs-typed-answer` `5aa668224`) | `session.ts:129` · `actions.ts:39` · `fadingApi.contract.ts:220` |
| S7 | `fading-traps` | 검수된 45개 | **유지(2 · 3단계)**. 4단계에는 칩이 없다. A′ 에서 함정의 글을 쓴 경우는 이견 E4 | 학생 | 구현 | `trapTable.ts:12` |
| S8 | `fading-practice` | 복습일 전 로컬 풀이 · POST 없음 | **연결**. A′ · 1단계도 `createLocalFadingSource` 로 돌고 아무것도 보내지 않는다 | 학생 | 구현 | `src/lib/fading/source.ts:13` · `local.ts` |
| S9 | `fading-stats` | 7 · 28일 · 8주 · 단계별 수 | **지원**. 진단 셋은 1판에서 싣지 않는다 | 학생 | 구현 | `FadingStats.tsx:12` |
| S10 | `old-explorers` | 카드 다섯 · 도감 · 보충 · 공방 | **유지**. 기록을 보존하고, L1 뒤에만 제거한다. P-d | 학생 | 구현(옛) | `StudentMathExplorers.tsx:110` |
| S11 | `old-course` | 초등 문제 코스 · 은행 날 | **유지**. D1(새 SRS 는 개념 기억만) · 문제 기록과 섞지 않는다 | 학생 | 구현(옛) | `courseRoutes.ts:53` |
| S12 | `old-algebra` | 중1 방정식 미션 | **유지** | 학생 | 구현(옛) | `serverRoutes.ts:50` |
| S13 | `old-replay` | 지난 문제 다시 풀기 | **유지** | 학생 | 구현(옛) | `replayRoutes.ts:27` |
| S14 | `lectures-list` | 진도에 기록된 차시의 게시 강의 | **지원(L2)**. P-a · P-c — «이 단원 강의» 링크만 | 학생 · `lectureOpenToStudent` | 구현 | `lectureAccess.ts:73` |
| S15 | `lectures-player` | 재생 · 시청 기록 | **지원**. 시청은 노출이라 FSRS · 대기열에 닿지 않는다(P-a) | 학생 | 구현 | `watchReport.ts:18` |
| S16 | `listening-assigned` | 배정 · 준비 · 소리 확인 | **유지**(별도 영역 · 홈 카드 연결은 이미 있음). P-b | 학생 · 듣기 문 · 권리 | 구현 | `english/listening/runtime/students.ts:38` |
| S17 | `listening-attempt` | 응시 · 답 · 제출 · 멱등 | **유지**. 평가 · 노출 기록이고 수학 FSRS 의 입력이 아니다(P-a). 듣기를 복습화한다면 **별도 영역 일정기**를 둔다 | 학생 | 구현 | `englishListeningStudentHttp.contract.ts:33` |
| S18 | `listening-review` | 공개 뒤 대본 · 해설 · review 답 | **유지 + 지원(후속)**. 자체 콘텐츠의 복습화는 별도 일정기가 맡고, 공유 플레이어 · `release` · DTO(초기 답 / 공개 뒤 답 분리)를 재사용한다. 외부 원본은 제외(P-b) | 학생 · release 관문 | 구현 | `english/listening/release.ts:17` |
| S19 | `textbook-qr` | `/q/[slug]` → 배정 · 게시 고정본 | **연결(L1 입구)** | 학생 · 매 요청 배정 확인 | 구현 | `src/app/q/[slug]/page.tsx:27` · `textbook/studentRoutes.ts:202` |
| S20 | `textbook-blank` | 설명 글 제출 · 교사 관찰 · pending / checked / needs-review | **유지(기록)** + **연결(L1 입구 화면)**. 설명 기록을 fading 결과나 대기열로 옮기지 않는다 — 채널이 `student-text` 로 다르다 | 학생 | 구현 | `TextbookConceptActivity.tsx:189` · `textbookStudent.contract.ts:80` |
| S21 | `textbook-review` | 확인된 explorer-card → `/learn?view=collection` | **연결(L1 — 목적지 추가)** | 학생 · requestId 멱등 | 옛 목적지 구현 · 새 목적지 미구현 | `textbook/studentReview.ts:25,43,207` |
| S22 | `personal-existing` | 원천별 개인 기록 | **유지**. 통합 «내 기록»은 만들지 않는다 | 학생 | 구현 | `state.ts:115` |
| S23 | `device` | 움직임 · 효과음(옛) · 키보드 | **지원**. `useAnswerKeys` 를 재사용한다. 옛 효과음 · 움직임 설정은 옮기지 않는다 | 기기 로컬 | 구현 | `src/components/math-srs/useAnswerKeys.ts` |
| S24 | `client-errors` | 학생 오류 보고 | **지원**. 쓴 답 글은 싣지 않는다 | 학생 허용 | 구현 | `src/app/api/logs/client/route.ts:54` |
| S25 | `test-console` | 부분 초기화(새 fading 포함) | **지원**. 새 선택 칸도 «오늘의 기억(새)» 초기화에 넣는다 | 허용 시험 계정 | 시험 전용 | `testConsoleActions.ts:26` |
| S26 | `not-shipped` | 개인 덱 · 학생 독해 · 업로드 | **부적합**. 이번 «Anki»는 **은행 개념의 표시 방식**이지 학생이 저작하는 덱이 아니다 | — | 미구현 | `studentRouteAccess.ts:85` |
| S27 | `retired-originals` | 외부 원본 은퇴 · 집계 패턴만 남음 | **부적합(복원 금지)** | — | 은퇴 | `docs/listening-production/PATTERN-GUIDE.md:3` |

### 3.2 교사 · 작업실 — 교사 감사의 84행(ID 그대로, 빠짐없이)

| ID | 현 기능(요약) | SRS 재사용 · 분류 | 권한 | 구현 | 증거(교사 MD 의 행 + 확인한 함수) |
|---|---|---|---|---|---|
| W01 | 제품 전환 · 15개 메뉴 · 딥링크 | **지원**. «오늘의 기억 · SRS» 메뉴가 이 틀 안에서 열린다. 변경 없음 | 개인 메뉴 ∩ 지점 상한 | 구현 | `UnifiedWorkspace.tsx:237` · `workspaceMenuPolicy.ts:17` |
| W02 | 오늘의 작업(출제 초안 · 문서) | **부적합**. 교사 출제 작업의 상태다 | home 메뉴 | 구현 | `WorkroomHome.tsx:14` |
| B01 · B02 · B03 · B04 · B05 | 문제은행 검색 · 상세 · 카트 · 무작위 · 구형 등록 | **부적합**. D1 — 문항을 카드로 만들지 않는다. 🔴 은행은 바꾸지 않는다 | bank 메뉴 · 문항 접근 | 구현 | `BankView.tsx:102` · `/api/problems*` |
| B06 · B07 | AI 문항 생성 · 변형 · 채택 | **부적합**. AI 생성물은 SRS 의 원천이 아니다 | 로그인 · pending | 구현 | `src/lib/ai/generator.ts:84` · `/api/problems/transform` |
| B08 · B09 | 문항 신고 · 검수 콘솔 | **유지**. SRS 의 덧씌움 · 별칭 표는 문항 검수가 아니라 은행 전체 시험 · 사람 확인으로 지킨다 | 검수 계정 | 구현 | `ReviewConsole.tsx:61` |
| B10 | 결정론 수학 생성엔진 | **부적합**. 문제 생성기다(옛 코스의 원천) | 개발 | helper | `src/lib/elementary/generate.ts:55` |
| S01 · S02 · S03 · S04 | PDF · 이미지 추출 · 자르기 · OCR · AI 인식 | **부적합** | studio 메뉴 | 구현 | `StudioView.tsx:855,1936` |
| S05 · S06 · S07 | SVG 생성 · 수정(Jev 길 고르기 포함) · 그림 편집 | **부적합(학생 흐름)**. [사실] `askJev` 를 부르는 곳은 `src/lib/dev-ai/figure-edit-jev.ts:521` 하나다. «AI 도형 채점»은 없다. fading 그림 판은 은행 그림을 쓰고 이름표를 채점하지 않는다(정본 §4-7) | studio · `STUDIO_AI_JEV` | 구현 | `src/lib/jev/client.ts:111` |
| S08 | MathLive · 한글 수식 단축키 · 수식 키보드 | **지원(부분 재사용)**. `hwpMathShortcuts.ts` 의 낱말 사전(root · over · deg · neq · bot …)을 **순수 모듈로 떼어** `typedKey` 의 별칭으로 읽는다. MathLive 자체는 학생 앱에 들이지 않는다 | — | 구현 | `src/components/math/editor/hwpMathShortcuts.ts:20-60` |
| P01 · P02 · P03 | 시험지 편집 · 서식 · 조판 · 브라우저 인쇄 | **부적합**. SRS 는 시험지를 만들지 않는다 | export 메뉴 | 구현 | `WorksheetEditor.tsx` |
| P04 · P05 | 서버 PDF · HWPX | **지원(L6 을 거칠 때만)**. 🔴 학생 기록 · 진단을 파일로 내보내지 않는다 | `authorizeExport` | 구현 | `/api/exports/{pdf,hwpx}` |
| L01 | 브라우저 임시 저장 · 작업 JSON | **부적합** | 계정 분리 | 구현 | `useWorkspaceDrafts.ts:8` |
| L02 | 서버 문서(자료실) · 지점 공유 | **부적합**. 학생 SRS 의 원천이 아니다. 잇는다면 학생이 교사 문서를 받는 새 권한 체계가 든다 | 문서 소유 · `visibility` · `sharedBranchId` | 구현 | `prisma/schema.prisma:241` · `src/lib/privateWorkspace.ts` |
| C01 | 반 · 학생 | **지원**. 명단 · 소유의 원천이고 R01 이 이미 탄다 | `requireOwnedClass` | 구현 | `/api/classes` · `/api/students` |
| C02 | 학생 계정 발급 | **지원**. 학생 로그인의 원천이다. 변경 없음 | 교사 · 지점 | 구현 | `/api/students/[id]/account` |
| C03 | 반 · 학생 진도 기록 | **지원(L3)**. 진도 단원 → 목록 표지. 배정 · 자동 pick 은 하지 않는다(P-c · 정본 §4-10) | `assertClassWrite` | 구현 | `/api/progress*` · `lectureAccess.ts:65`(`progressUnitIdsOf`) |
| C04 | 진도 계획 | **유지**. 계획(미래)은 시험 초안용이다. SRS 는 «실제 진도»만 본다(22번 문서 «실제 진도가 이긴다») | `requireOwnedClass` | 구현 | `src/lib/daily/progressPlan.ts` |
| C05 | 수업 진행 카드 · 주간 지표 | **유지**. SRS 수를 이 지표에 합치지 않는다 | — | 구현 | 교사 MD C05 |
| T01 · T02 · T03 · T04 | 확인테스트 대상 · 출제 · 검수 · 자동 초안 크론 | **부적합**. 문제 시험의 흐름이다 | `requireOwnedClass` · `CRON_SECRET` | 구현 | `src/lib/daily/planDailyReview.ts` · `src/lib/tests/generateDraftTest.ts` |
| T05 | 채점표(틀린 번호 · 결시) | **지원(L4)**. `ProblemAnswer × Problem.unitId` → 단원 신호를 교사 화면에 **나란히** 보인다. FSRS 는 바꾸지 않는다 | `requireOwnedTest` · `requireOwnedStudentInClass` | 구현 | `src/lib/testResults/gradeSheet.ts` |
| T06 | 학생 답 제출 · 자동 채점 · 분석 | **지원(L4 와 같은 원천)**. 자동 채점 결과를 fading 결과로 보지 않는다 | 같음 | 구현 | `/api/tests/[id]/submit` · `results` |
| T07 | 성취도 집계 · 근거 문장 | **지원(후속)**. «오늘의 기억» 줄을 센 값으로 따로 둔다. 🔴 합치지 않는다(`collect.ts` ⑶) · 진단 셋은 넣지 않는다 | `requireOwnedStudent` | 구현 · SRS 줄 미구현 | `src/lib/achievement/collect.ts` |
| T08 | 오답 → 같은 family 다른 문항 복습지 | **유지**. 문제 단위의 오답 복습이다. 개념 SRS 와 대상이 다르다 | — | 구현 | `src/lib/generator/planRetry.ts` |
| E01 · E02 · E03 | 내신 예측 · 실측 | **부적합**. 점수 모델이 일정의 입력이 되면 안 된다 | `requireOwnedPredictionRun` | 구현(E02 는 UI 미출시) | `/api/predictions*` |
| K01 | 개념 강의 현황 | **지원(L2 의 원천)**. 시청 = 노출(P-a) | `authorizeAccount` | 구현 | `/api/concept/lectures` |
| K02 | 강의 등록 · 게시 | **지원(L2 의 원천)**. 변경 없음 | `authorizeAccount` | 구현 | `prisma/schema.prisma:523`(`ConceptLecture.unitId`) |
| K03 | 개념 백지 고르기 · 정확 항목 선택 | **지원(L6)**. 정확 구성(`EXACT_COMPOSITION_VERSION`)을 재사용한다. 🔴 은행은 바꾸지 않는다 | 작업실 | 구현 | `src/lib/concept-blank/exactPick.ts` |
| K04 | 개념 백지 학생지 · 채점표 · 인쇄 | **유지**(지면 규칙 무변경). L6 진입을 더하면 `/dev/print-check` 항목 + 실물 검수 | 작업실 | 구현 | `src/app/(main)/concept-blank/print/page.tsx` |
| R01 | 새 오늘의 기억 교사 현황 | **연결(L5)**. 진단을 **센 값만** 더한다. 문장 · 답은 싣지 않는다(§15) | `teacherGate`(= `authorizeAccount` + `routeAccessFor` + 메뉴 `srs`) · `loadSrsRoster` · `requireTeacherBranch` | 구현 · 진단 칸 미구현 | `src/lib/fading/teacherRoutes.ts:60,109` · `courseTeacherRoutes.ts:50-62` |
| R02 | 학생 앱 미리보기(저장 안 함) | **연결**. 미리보기가 같은 로컬 규칙(`createLocalFadingSource`)으로 A′ · 1단계를 돌린다 | srs 메뉴 | 구현 | `SrsWorkspaceView.tsx` · `local.ts` |
| R03 | 기존 과정 SRS 명단 · 상세 | **유지**(«기존 SRS 현황» 탭) | 같은 관문 | 구현 | `/api/math-srs/course` |
| R04 | 교육과정 그래프 · 탐험 목표 | **유지**. 선수 그래프(`graph-unit`)는 단원 단위라 개념 일정의 입력으로 쓰지 않는다(P-c · P-d) | 같은 관문 | 구현 | `src/lib/math-prerequisite/graph` |
| R05 | 진도판 테마 | **부적합**. D2 — 진도판 · 별은 옮기지 않는다 | 관리자 | 구현 | `/api/admin/journey-theme` |
| TB01 · TB02 · TB03 | 교재 저작 · 간편 교재 · 스냅샷 | **유지**. SRS 는 동결된 교재 개념만 읽는다 | 교재 라우트 관문 | 구현 | `src/lib/textbook/coreConceptBank.ts`(은행을 읽기만 함) |
| TB04 | 교재 개념 catalog · 백지 항목(`blankItems`) · 연결 확인 · 동결 | **연결(L1 의 원천)**. `blankItems[status=confirmed]` 가 fading 으로 가는 유일한 개념 단위 다리다 | 교재 관문 | 구현 | `textbookConcept.contract.ts:25-34,57,129` |
| TB05 · TB06 | 교재 발행 · 교환(엄격 JSON) | **유지**. 교환 패키지의 `blankItems` 를 그대로 보존한다 | 교재 관문 | 구현 | 교사 MD TB05 · TB06 |
| TB07 | 교재 배정 · QR | **연결(L1 입구)** | 배정 | 구현 | `/api/textbook/editions/[id]/assignments` |
| TB08 | 교사 관찰 · 학생 자유 글 · checked | **유지**. 별도 채널이다. fading 결과로 보지 않는다 | 교재 관문 | 구현 | `src/lib/textbook/studentAttempts.ts` |
| TB09 | 교재 백지 → 동결 개념 · 기존 SRS 증거 · explorer-card 복습 · 강의 연결 | **연결(L1 목적지 추가 지점)**. 기존 SRS 증거 화면에 fading 줄을 넣을지는 E5 | 교재 관문 | 구현 | `TextbookStudentEvidence.tsx` · `studentReview.ts` |
| TB10 | 교재 저작 지원(원고 검수 장부) | **부적합** | 개발 · 도구 | helper | 교사 MD TB10 |
| EN01 · EN02 · EN03 · EN04 · EN05 · EN06 | 영어 내신 · 자료 · 제작 · 검수 · 자료은행 | **부적합**. 교사 전용 영어 제품이고 영어 울타리가 있다. 학생 독해 경로가 없다 | `requireEnglishSession` · `requireOwnedEnglishExam` | 구현 | `/api/english/{exams,materials,sets,generate,passages}` |
| EL01 · EL02 · EL03 · EL04 · EL05 · EL06 | 자체 제작 듣기: 자료 · 저작 · 미디어 · 발행 · 배정 · 방송 | **유지 + 지원(후속)**. 별도 영역이라 수학 FSRS 에 넣지 않는다(P-a · P-b). 듣기 복습은 별도 일정기를 두고 공유 플레이어 · release · DTO 를 재사용한다 | 듣기 문 · 교사 id · 권리 | 구현 | `english/listening/runtime/service.ts` · `assignments.ts` |
| EL07 | 공식 외부 듣기(은퇴) | **부적합 — 복원 금지** | — | 은퇴 | `english/listening/externalSourcePolicy.ts` |
| EL08 | 신규 제작 blueprint | **유지**. 자체 제작의 근거이고 SRS 와 무관하다 | — | helper | `assessmentPatterns.ts:436` |
| A01 · A02 · A03 · A04 | 관리자 · 지점 · 계정 · 감사 | **지원**. 메뉴 `srs` · 지점 범위가 R01 을 연다. 새 하위 문은 메뉴가 아니라 서버 환경값이다 | `authorizeAccount` · `branchAccess` · `authorizePrivate` | 구현 | `/api/admin/*` · `/api/branch/*` |
| A05 | eywa 연동 · SSO | **유지**. 신원 · 재원 · 진도의 원천이다. SRS 와는 학생 id 로만 만난다 | `CRON_SECRET` · `EYWA_SSO_SECRET` | 구현 | `src/lib/eywaSso.ts` · `classAccess.ts` |
| D01 | 개발 화면 — 새 SRS 교사 갤러리 · 학생 로컬 미리보기 | **지원**. `/dev/fading` 에서 A′ · 1단계를 잰다 | 개발 | 개발 | 정본 §17 |
| D02 | 개발 · 실험 도구(인쇄 점검 포함) | **지원**. L6 이면 `/dev/print-check` 에 항목을 단다 | 개발 | 개발 | `src/app/dev/print-check/items.ts` |
| D03 | 시험용 도구판 | **지원**(S25 와 같다) | 시험 계정 | 개발 | `testConsoleActions.ts:26` |

(84 = W2 + B10 + S8 + P5 + L2 + C5 + T8 + E3 + K4 + R5 + TB10 + EN6 + EL8 + A5 + D3)

### 3.3 공통 · 인프라 · AI — 인프라 감사 MD 의 53그룹(번호 그대로, 빠짐없이)

인프라 MD(`apps-content-audit/.qa-artifacts/owned-app-inventory/internal-infraAI.md` · 기준 `029f7d017`)의 회의용 53그룹이다. 구현 상태는 그 MD 의 값이다(«구현 · 실행 미확인» = 소스 있음 · 운영 미확인).

| # | 그룹 | SRS 재사용 · 분류 | 권한 · 문 | 상태 | 근거(인프라 MD) |
|---|---|---|---|---|---|
| 1 | 교직원 로그인 · 가입 | **지원** — 교사 현황(R01)에 들어가는 전제. 변경 없음 | 승인 계정 | 구현 | `src/lib/auth.ts:122 authorize` |
| 2 | 세션 권한 갱신 · 폐기 | **지원** — 메뉴 `srs` 를 거두면 다음 조회 때 바로 반영된다 | sessionVersion | 구현 | `src/lib/auth.ts:248 jwt` · `session.ts:38` |
| 3 | 역할 · 메뉴 · 학생 관문 | **지원** — 새 학생 화면이 `/learn/fading/**` 밖에 생기면 허용 목록과 그 목록을 잠근 시험 둘을 함께 고친다 | proxy · `routeAccessFor` | 구현 | `src/proxy.ts:103` · `routeAccess.ts:148` |
| 4 | 개인 · 지점 메뉴 정책 | **지원** — 메뉴 `srs` 가 교사 현황을 연다 | 교집합 · 지점 누락은 닫힘 | 구현 | `workspaceMenuPolicy.ts:17` |
| 5 | 지점 · 반 · 학생 범위 | **지원** — L4 · L5 · L6 이 `ownedRowsWhere` · `withinOwnerScope` 를 탄다 | `ownerScope.ts` | 구현 | `ownerScope.ts:77,104` |
| 6 | 동일 출처 · API 계약 | **지원** — fading POST 는 같은 길(동일 출처 · Zod · no-store)을 탄다. 계약 SSOT 는 `src/contracts/fading*` | — | 구현 | `accountAccess.ts:28,40` |
| 7 | 내 계정 설정 · 활동 | **부적합** — SRS 와 무관 | 본인 | 구현 | `ProfileSettings.tsx:7` |
| 8 | 최고관리자 계정 관리 | **유지** | 최고관리자 | 구현 | `AdminAccounts.tsx` |
| 9 | 지점 등록 · 메뉴 · 학습 현황 | **유지(이번 반복)** — 관리 콘솔의 지점 학습 현황에 fading 의 센 값을 넣는 일은 후속 후보로 둔다 | 최고관리자 | 구현 | `adminBranchLearning.ts:39` |
| 10 | 지점 계정 · 반 · 학생 운영 | **지원** — 명단의 원천 | 지점 관리자 + 범위 | 구현 | `/api/branch/*` |
| 11 | 학생 PIN 로그인 · 세션 | **지원** — 학생 세션의 원천(5회 실패하면 10분 잠금). 변경 없음 | 학생 | 구현 | `studentLogin.ts:186` · `studentSession.ts:66` |
| 12 | 학생 계정 발급 · 재발급 | **지원** — 변경 없음 | 계정 관리 역할 | 구현 | `issueStudentAccount.ts:155` |
| 13 | 시험용 학생 도구판 | **지원** — 새 선택 칸을 «오늘의 기억(새)» 초기화에 넣는다 | 시험 계정 | 개발 · 시험 | `testConsoleServer.ts:31` |
| 14 · 15 · 16 · 17 · 18 · 19 | EYWA 기존 SSO · v2 SSO · 관리 연결 · 수신 · 계정과 관계 동기화 · 기존 명단과 진도 동기화 | **유지** — 신원 · 재원 · 진도의 원천이다. 19 의 진도는 C03 을 거쳐 L3 의 간접 원천이 된다(단원 단위 — P-c) | 서명 · nonce · `CRON_SECRET` | 구현(14 · 19 는 기존 호환) | `eywaSso.ts` · `managedSso.ts:53` · `runSync.ts:96` |
| 20 · 21 · 22 | 개인 · 지점 공유 자료 · 개인 파일 청크 · 최고관리자 자료 읽기 | **부적합**(20 · 21 — 학생 SRS 의 원천이 아니다) · **유지**(22) | 자료 owner · 공유 ACL | 구현 | `privateDocumentActions.ts:107` · `privateAssets.ts:79` |
| 23 | 브라우저 초안 · AI 큐(작업실) | **부적합** | 사용자별 | 구현 | `privateDraftStore.ts` |
| 24 | 공용 도형 제공(CDN) | **부적합** — fading 그림 판은 은행의 SVG 조각을 응답에 바로 싣는다(`fadingFigureSchema`) | 허용 asset | 구현 | `sharedFigureAssets.ts:230` |
| 25 · 26 | PDF · HWPX 내보내기 | **지원(L6 을 거칠 때만)** — 🔴 학생 기록 · 진단은 내보내지 않는다 | `authorizeExport` | 구현 | `pdfServer.ts:161` · `hwpxServer.ts:87` |
| 27 | PDF worker · 폰트 proxy | **부적합** | studio | 구현 | `studio/pdf-worker` |
| 28 · 29 · 30 | 교재 파일 · 패키지 import/export · 출판 단계 | **유지** — 교환 패키지의 `blankItems` 를 그대로 보존한다(L1 의 원천을 지킨다) | 교재 관문 | 구현 | `imports.ts:82` · `exportEdition.ts:72` · `reserve.ts:143` |
| 31 · 32 · 33 · 34 | 듣기 음원 upload · serve · Storage · Drive · 음원 검사 | **유지(별도 영역)** — 자체 듣기를 복습화한다면 serve · range 를 재사용할 후보다. 수학 SRS 는 매체를 올리지 않는다 | 듣기 문 · 서비스 키 | 구현 | `media/service.ts:264` · `storageApi.ts:61` |
| 35 | 외부 원본 듣기 폐기 울타리 | **유지 — 손대지 않는다**. 🔴 외부 원본 · 전사를 복원하지 않는다(P-b) | — | 폐기 울타리 | `externalSourcePolicy.ts:41` |
| 36 · 37 · 38 | 작업실 AI 여섯 작업 · 모델 선택 · 한도 · 재시도 · 추적 | **부적합(학생 흐름)** — 이번 반복에 학생 흐름의 AI 는 없다(루트 결정). [사실] 38 은 동시 수(프로세스 8 · 사용자 2) · 240초 · 재시도 · 오류 · 시간 기록이고, **비용 원장이 아니다** | 승인 · 메뉴 | 구현 | `studio-ai/execute.ts:16` · `routing.ts:56` · `handler.ts:23` |
| 39 | 개발 구독 CLI bridge | **부적합** | 개발 | 개발 | `dev-ai/cli.ts:261` |
| 40 | TypeSafe Jev 도형 수정 판단 | **부적합(이번 반복)** — 다음 반복 L7(은행 답만 넣는 오프라인 별칭 후보)에서 빌릴 패턴이다: Choice · `min(선택 확률, confidence)` · 실패하면 null | `TYPESAFE_API_KEY` · `STUDIO_AI_JEV` | 구현 | `jev/client.ts:111 askJev` |
| 41 · 42 | 도형 생성 · 검증 · 수정 · 서명 Python 엔진 | **부적합**(41) · **지원(L6 의 HWPX 를 쓸 때만)**(42) | 서명 HMAC | 구현 | `figure-engine.ts:126` · `mathgen-engine/transport.ts:56` |
| 43 | 수학 AI 생성 · 변형 · 채택 | **부적합** — 🔴 은행은 바꾸지 않는다. 생성물은 카드의 원천이 아니다 | 승인 · 메뉴 | 구현 | `ai/generator.ts:84` · `transformer.ts:97` |
| 44 · 45 | 영어 AI 초안 · 사진 읽기 | **부적합** — 영어 울타리 | 영어 세션 | 구현 | `english/generate.ts:113` · `readPhoto.ts:244` |
| 46 | 듣기 의미 · 스타일 판단 구성(Choice/Noul + 코드 임계값 → `ai_verified` / `needs_review`) | **부적합(학생 SRS)**. 참고할 패턴: AI 는 «검토 필요»로만 보내고 문턱은 코드가 정한다. [사실] 인프라 MD 상태 «연결 미확인» | — | 연결 미확인 | `english/listening/reconstruction.ts:376,423` |
| 47 | 결정적 생성 · 문항 선택(seeded) | **부적합** — 문항 선택기다. fading 은 자기 결정적 규칙(`src/lib/fading/random.ts` · `erasure.ts`)을 쓴다 | — | 구현 | `selectProblems.ts:115` |
| 48 | 공유 import · 식별 · 검역 | **부적합** — 은행 적재 경로. 🔴 수학 은행은 바꾸지 않는다 | 공유 DB 문턱 | 구현 | `problemFingerprint.ts:19` |
| 49 | 계정 감사 · 오류 기록 | **지원** — [사실] fading 라우트 다섯이 모두 `withErrorLog` 로 감싸져 있다. 쓴 답 글은 싣지 않는다 · SRS 진단은 감사 기록(`recordAudit`)이 아니다 | client quota | 구현 | `withErrorLog.ts:332` · `audit.ts:26` |
| 50 | 크론(자동 초안 · 오류 정리 · EYWA) | **유지** — SRS 는 크론을 두지 않는다(일정은 요청 때 계산) | `CRON_SECRET` | 구현(EYWA 크론은 Vercel 에 등록 없음) | `runAutoDraft.ts:68` · `purge.ts:16` |
| 51 | 듣기 배포 · 방송 상태 | **유지(별도 영역)** | 듣기 문 | 구현 | `listening/runtime/service.ts:193` |
| 52 | DB 모델 · 계약 · ID · revision | **연결(L0)** — `student_srs_state.payload` 의 CAS revision · strict 계약 · 선택 칸을 읽기 먼저 | — | 구현 | `common.contract.ts` · `serverStore.ts:159` · `fading.contract.ts:134` |
| 53 | 개발 화면 · 운영 도구 | **지원** — `/dev/fading` 에서 A′ · 1단계를 재고, L6 이면 `/dev/print-check` 에 항목을 단다 | `devPageVisible` | 개발 · 시험 | `devPageAccess.ts:27` |

(53 = 1 ~ 53, 하나씩 또는 묶음으로 모두 적었다.) 앞 판의 I1 ~ I14 는 이 표로 대신한다. 개념 백지 은행(I13)과 교육과정 시드(I14)는 인프라 MD 의 범위 밖(내용 · 시드 데이터)이라 아래 둘로 남긴다.

| # | 원천 | 분류 | 근거 |
|---|---|---|---|
| X1 | 개념 백지 은행 9,119 · 얼린 묶음 2,040 · 그림(코드 데이터 — DB 가 아니다) | **연결(읽기만)** — 카드 · 빈칸 · 답의 유일한 원천. 🔴 은행 · 인쇄 무변경 · 덧씌움 · 별칭은 은행 밖의 표 | `src/lib/fading/catalog.ts` · `groups/` · `src/lib/concept-blank/bank/` |
| X2 | 교육과정 시드 `CURRICULUM_UNITS` 735 · DB `Unit` | **연결(L2 · L3 · L4 의 단원 다리 — P-c)** | `concept-blank/sections.ts:34-40` · `schema.prisma:472` |

---

## 4. 연결 설계 — 원천 · ID · 소유자 · 호환 계약

| 링크 | 단위 | 원천 → 목적 | 소유자(코드) | 호환 계약 |
|---|---|---|---|---|
| L0 | — | 저장 · 응답 · 행동의 선택 칸 | 속 `ctx_d95eb6234c99`(작업 트리 `srs-card-internals` — `src/lib/fading` · `src/contracts/fading*`) · 화면 `ctx_1f5e3d63f1b0`(`srs-anki-typed-ui` — `src/components/fading/**`) | 읽기 먼저 → 쓰기 · `version` 1 고정 · 화면 strict 파싱 |
| L1 | **개념**(문장 id) | 교재 개념 → fading 개념 | 속(새 순수 함수) + 교재 쪽 `studentReview.ts`(교재 소유 세션 — 리드 지정 필요) | `textbookConcept.contract.ts` 무변경 · 새 목적지는 선택 갈래 · 옛 목적지 보존 |
| L2 | **단원** | 개념의 소단원 → `Unit.id` → 열린 강의 | 속(내용 응답에 선택 칸) + 화면(codex) | `fadingContentSchema` 에 `lecture?` — 읽기 먼저 |
| L3 | **단원** | 진도 단원 → 목록 표지 | 속(목록 응답에 선택 칸) | `fadingCatalogSchema` 에 `inProgress?` — 읽기 먼저 |
| L4 | **단원** | 시험 오답 단원 → 교사 상세 | 속(교사 읽기) + 교사 화면(D-07 Wire → Hi-fi) | `fadingTeacher.contract.ts` 에 선택 칸 · 문장 · 답 없음 |
| L5 | 개념 | 진단 수 → 교사 현황 | 속 + 교사 화면 | 같음 |
| L6 | 문장 | «다시» 개념의 문장 → 개념 백지 정확 구성 | 작업실(개념 백지 소유) + 인쇄 검수 | `conceptBlankSelectionSchema` 무변경 · print-check 항목 |
| L7 | — | 은행 답 → 별칭 후보(오프라인) | 속(별칭 표 + `typedKey`) · 배치 도구 | 별칭 표는 은행 밖 · 은행 전체 시험 |

### L0 (P0) 읽기 먼저 — 학생 기록 보존
- [사실] payload · fading · session 은 strict 다(`serverState.ts:58-70` · `fading.contract.ts:134`).
- [사실] 학생 화면은 응답 넷을 **strict 로 다시 파싱**한다(`src/components/fading/apiSource.ts:80,86,93,99`).
- 그래서 저장 칸과 응답 칸 모두 «읽는 코드가 먼저» 나가야 한다.
- **배포 1(읽기)** — 아래 칸을 받아들이고 보존만 한다(쓰지 않는다).
  - 저장: `session.{digest?, seen?, sure?, unjudged?}` · `concept.marks?`
  - 응답: `opened.lecture?` · `catalog…inProgress?` · `session.unjudged?`
  - 행동: `read.seen?` · `step.sure?` · `placement` 합집합 · `rate.judged?`
  - 시험: 옛 쓰기 길(하루 여정 · 통합 탐험)을 지나도 새 칸이 남는다.
- **배포 2(쓰기)**: 하위 문 뒤에서 쓴다.
- 옛 칸(`memories` · `missions` · `course` · `dailyJourney` · `explorers` · `expedition`)은 고치지 않는다.

### L1 교재 → 오늘의 기억 (개념 단위의 유일한 다리)
- [사실] 교재 개념에는 `blankItems: {blankSectionKey, entryKind, entryId, review{status: candidate | confirmed | rejected, reviewedBy, reviewedAt, targetHash}}[]` 가 있다.
- [사실] 은행 문장 9,119개는 모두 정확히 한 묶음에 속한다(실측). 그래서 `entryId → conceptId` 역지도가 유일하다.
- 새 순수 함수 `fadingConceptsForTextbook(concept)` 의 규칙:
  - `confirmed` 인 것만 쓴다.
  - `targetHash` 가 지금 은행 문장과 다르면 뺀다.
  - 역지도로 개념을 얻는다. 여럿이면 차례대로 둔다.
  - P-d — 다른 이름 공간은 바꾸지 않는다.
- 학생 길: `startTextbookReview` 에 «fading» 갈래를 더한다.
  - 고르지 않은 개념이면 읽기 + 연습(기록 없음)이다. 복습일이 된 고른 개념이면 풀이를 연다.
  - 옛 explorer 목적지는 옛 기록이 있는 학생에게 남긴다.
  - 교재를 «열었다»는 사실(노출)은 대기열에 넣지 않는다(P-a).
- ⚠️ 구현 전에 확인할 것: `targetHash` 의 계산(`src/lib/textbook/references.ts` · `integrity.server.ts`), 그리고 운영 DB 에 `confirmed` 가 몇 개 있는지(DB 는 읽지 않았다).

### L2 강의 링크 (단원 다리)
- [사실] 시드 단원 735개의 열쇠에 겹침이 0이다. fading 의 소단원 360개는 모두 시드에 있다.
- [사실] DB `Unit` 의 이름 셋에는 유일 제약이 **없다**.
- 그래서 **정확히 한 행일 때만** `unitId` 로 `ConceptLecture` 를 찾고, `lectureOpenToStudent` 를 지난 강의만 `opened.lecture` 로 내린다.
- 1단계 뒷면과 4단계 대조 아래에 «이 단원 강의»를 둔다. 시청은 노출이다(P-a).

### L3 진도 → 목록 표지 (단원 · 배정 아님)
- `progressUnitIdsOf` 로 얻은 단원을 소단원 열쇠로 바꿔 «진도에 있음»을 표시한다.
- 🔴 자동 pick · 배정은 하지 않는다.

### L4 시험 오답 → 교사 «틀린 단원» (단원 · 교사 화면만)
- `ProblemAnswer × Problem.unitId` → 소단원 → 그 학생이 고른 그 소단원의 개념들을 원천(시험 · 회차 · 날짜)과 함께 나란히 보인다.
- 🔴 FSRS · 단계 · 확신은 그대로다 · 성취와 합치지 않는다 · «이 개념을 틀렸다»고 쓰지 않는다.

### L5 교사 현황 진단 수
- `fadingTeacherSummary` · `fadingTeacherConcepts`(`teacher.ts:45,116`)에 센 값만 더한다.
  - 사전 확인: 처음 봄 · 들어 봄 · 알고 있었음 n
  - 콜드 확신: 확실 n · 그중 틀림 n
  - 자기 대조: 같은 뜻 · 다름 n
- 문장 · 답 · 비율 · 합성 점수는 없다.

### L6 교사 인쇄 («다시» 개념 → 개념 백지)
- 명제 id(= 은행 entry id) → 정확 구성(`exactPick.ts`)으로 개념 백지를 짠다.
- 🔴 은행 · 지면 규칙은 무변경이다 · print-check 항목 + 실물 검수 · D-07 절차를 밟는다.

### L7 오프라인 별칭 후보 (AI — 학생 데이터 없음) — 🔴 이번 반복에서 제외(루트 결정 msg_22de6de4f093)
- 루트 결정: «온라인 AI · 학생 글의 외부 전송은 이번 반복에 없다. 수학 별칭은 결정적 규칙만 쓴다.» 이번 반복의 별칭은 사람이 적은 표 + `typedKey` 규칙뿐이다. 아래는 다음 반복의 선택지로만 남긴다.
- 은행 답만 넣고 Jev Choice 로 자판 표기 후보를 고르게 한다(«select instead of generate»).
- 사람이 확인한 것만 은행 밖 별칭 표에 넣는다. `typedKey` 가 그 표를 결정적으로 읽는다.
- 은행 전체 시험이 «한 개념 안의 서로 다른 답이 같은 열쇠 0»을 지킨다.
- 공식 문서: «confidence … not validation that the answer is correct».
- 🔴 학생 화면에서 실시간 AI 를 부르지 않는다 — 이견 E1.

### 4.8 화면 · 자판 (codex 의 화면 — 속이 줄 함수)
- 입력란 밖: `useAnswerKeys` 를 그대로 쓴다(숫자 · Enter · IME 조합 · 수정키 예외).
- 입력란 안:
  - Space 는 공백, 숫자는 글자다.
  - Enter 는 이 빈칸을 내고 다음 빈칸으로 간다(조합 중이면 무시).
  - Tab 은 초점을 둔 채 «지금 빈칸»만 옮긴다. Esc 는 보통의 Tab 으로 돌려준다.
- 수식은 평범한 입력란 + 한글 수식 낱말 별칭(S08)으로 받는다.
- 늘 보이는 주제는 «대단원 · 소단원 번호 + 종류 + 문장 n/N»이다. 제목 · 용어는 속의 낱말 겹침 검사를 통과할 때만 보인다.

### 4.9 기록 · 비용
- 쓴 답 글은 열린 풀이의 `unjudged`(≤20 × 80자 · 평가로 닫히면 지움)에만 둔다.
- 학생 흐름의 AI 호출은 0이다. L7 은 오프라인 배치로 돌리고, 요청 수를 그 보고에 적는다.

---

## 5. 우선순위

| 순위 | 일 | 의존 |
|---|---|---|
| **P0** | L0 읽기 배포(저장 · 응답 · 행동의 선택 칸 · 보존 시험) | — |
| **P1** | 하위 문 뒤 쓰기 — Anki 1단계 · A′ · 콜드 확신 · `unjudged` · 풀이 지문 · 주제 검사 · 자판. `typedKey` 는 `BIGSHOL/srs-typed-answer` 에서 가져와 `\%` 등을 보강한다 | P0 |
| 독립 SRS 콘텐츠 | 더 의미 있는 빈칸·덧씌움 표. 원본 인쇄 은행과 구분해 검수한다 | P1 · 연동 불필요 |
| **후속 연동 ON** | L1 교재 다리 · L2 강의 링크 · L5 교사 진단 수 | P0 · P1 · 검증된 어댑터 · 사용자 ON |
| 후속 확장 | L3 진도 표지 · L4 오답 단원 · L6 교사 인쇄 · 성취 리포트의 별도 줄(T07) | 검증된 선택적 연동 |
| 다음 반복 | L7 오프라인 별칭 후보(AI) — 이번 반복은 루트 결정으로 제외 | 별도 결정 |
| 후속(별도 영역) | 자체 듣기의 별도 일정기(S18 · EL) — 수학 FSRS 와 따로 | 듣기 영역의 결정 |
| 끝 | 옛 탐험 제거(L1 이 선 뒤) | L1 |

---

## 6. 이견 · 열린 결정 — Gemini 와 주고받은 것 포함

Gemini 의 조정안(msg_29b9959160a8)에 대한 답을 항목별로 보냈다(msg_8a8e92e199e9). Gemini 의 배정(`ctx_42f8926fa6ca`)이 이미 끝나 있어 실행 우편함으로 보냈다.
- **루트**는 정정 1 과 2-1 ~ 2-10 에 동의했다(msg_22de6de4f093).
- **Gemini** 의 첫 배정은 정정을 받기 전에 끝났다. 새 대조 배정(`term_9331f82c…` · msg_30821a8f5d30)이 1 과 2-1 ~ 2-10 모두에 «동의»로 답했다(출처 경로 첨부).
  - 🔴 단 2-10 끝의 «Anki 1단계 직접 입력 FSRS 업데이트 방식을 수용»은 합의와 반대다. 1단계는 진단만 하고 FSRS 를 움직이지 않으며, 직접 입력은 4단계 A′ 에만 있다.
  - 이 한 줄을 정정하는 조건으로 Accept 를 보냈다(msg_2534b28c1563).
  - **Gemini 가 «2-10 정정 동의»로 답했다(msg_c01438fbc3e2).** 최종 상태: Claude · Gemini · 루트 사이에 남은 이견은 없다. 열려 있는 것은 E4 ~ E6 이고, 셋 다 합의를 막지 않는다.
- 루트 결정: 이번 반복에는 온라인 AI · 학생 글의 외부 전송이 없다. 수학 별칭은 결정적 규칙만 쓴다.
- 구현 담당(msg_e782df4e38ef): 속 = `ctx_d95eb6234c99`(`srs-card-internals`) · 화면 = `ctx_1f5e3d63f1b0`(`srs-anki-typed-ui`). 첫 커밋은 «읽기 호환만»(L0)이다.

| | 물음 | Claude | Gemini(조정안) | 상태 |
|---|---|---|---|---|
| E1 | 학생 대조 화면의 AI «검토 지원» | 1판에는 넣지 않는다. 오프라인 L7 만 둔다. P3 조언형은 조건 넷(학생이 먼저 판정 · 결과 불변 · 비용 원장 먼저 · 학생 글의 외부 전송 승인) | 첫 안: Jev 를 자기 대조 보조로 → 대조 배정: «온라인 학생 Jev 지원 지연 · 오프라인 별칭 선별 한정»에 동의 | **닫힘**(루트 결정 + Gemini 동의). 이번 반복은 L7 도 제외 |
| E2 | 백지풀이 | 교재 개념백지 화면 = L1 입구(연결). 설명 기록을 대기열로 옮기지 않는다 | 첫 안: 답안 로그로 SRS 큐에 편입 → 대조 배정: «교재 복습 로그는 FSRS 채점 대상이 아니다»에 동의 | **닫힘** |
| E3 | 강의 기록 | 링크만 둔다(노출 ≠ 인출 · 단원 단위) | 첫 안: 시청한 강의의 개념을 추천 → 대조 배정: «노출일 뿐 인출이 아니다 · FSRS 편입 없이 선택적 링크»에 동의 | **닫힘** |
| E4 | A′ 에서 함정 칩의 글을 쓴 경우 | «모름» → 자기 대조 | — | 열림 |
| E5 | 교재 SRS 증거 화면(TB09)의 fading 줄 | 1판에는 넣지 않는다 | — | 열림 |
| E6 | 교사 진단을 문장 단위로 | 센 값만(§15 유지) | — | 열림 |
| E7 | 자체 듣기 | 유지 + 지원(별도 일정기) — 루트 정정 반영 | 첫 안: 부적합 → 대조 배정: «별도 영역 · FSRS 와 직결 안 함»에 동의 | **닫힘** |
| E8 | AI 도형 채점 · 비용 공유 | 없는 기능 · 원장 없음(사실) | 첫 안: 지원 · 현행 유지 → 대조 배정: 둘 다 «없다»에 동의 | **닫힘** |
| E9 | 2-10 의 «Anki 1단계 직접 입력 FSRS 업데이트» 문구 | 1단계는 FSRS 비갱신 · 직접 입력은 4단계에만 | «2-10 정정 동의»(msg_c01438fbc3e2) | **닫힘** |

Gemini 보고서의 사실 정정(근거 경로):
- QR 은 `/q/[slug]` · `/api/learn/textbook/q/{slug}` 다.
- 백지 경로는 `/api/learn/textbook/editions/{editionId}/concepts/{conceptKey}` 다.
- 은행은 DB 가 아니라 코드 데이터다.
- 프린트와 자료실은 다른 기능이다.
- `askJev` 는 도형 편집 하나에서만 쓰인다.

---

## 7. 기술 위험

1. [사실] **열린 탭이 배포를 건너면** 화면의 strict 파싱이 새 응답 칸에서 깨진다(`apiSource.ts:80-99`). → 읽기 배포에서 화면 계약부터 넓히고, 파싱 실패는 «새로 고침» 안내로 받는다.
2. [사실] **strict 학생 기록** — 쓰는 코드가 먼저 나가면 학생 기록 전체를 못 읽는다. 되돌림의 하한이 배포 1로 옮겨 간다.
3. [사실] **DB `Unit` 이름 셋에 유일 제약이 없다**. 운영 행은 확인하지 않았다 → 한 행일 때만 잇는다.
4. **교재 `blankItems` 의 분포와 해시 계산을 확인하지 않았다.**
5. [사실] **typedKey 초안은 손질 전 은행에서 시험됐다**(12,480 → 지금 12,384). 지금 은행에서 열쇠 겹침은 0이고, 자판으로 못 쓰는 열쇠가 39개다(`\%` 대부분 · `\times` 뒤 글자 붙음 · 그리스 문자).
6. **IME 조합 키** — 크롬 · 엣지 · 사파리 · Gboard 실기 확인 전이다.
7. [사실] **늘 보이는 주제의 누출** — main 머리에서 379개념, 부분 겹침은 용어 853 · 소단원 190.
8. [사실] **4단계 앞면의 교차 누출** — 최대 2,015표적(상한값).
9. **옛 탐험이 교재 길로 아직 닿는다** — L1 전에 지우면 그 길이 끊긴다.
10. **인쇄** — L6 은 실물 검수까지 해야 끝난다.
11. [사실] **AI 비용 원장이 없다**(인프라 #38 은 동시 수 · 시한 · 오류 · 시간 기록뿐이다).
12. **D-07** — 교사 화면을 더하면(L4 · L5 · L6) Wire → Hi-fi 를 밟는다. 학생 화면은 v2 시안과 덧붙임 표(codex)를 따른다.
13. **소유자 미지정** — L1 의 교재 쪽 함수와 S08 사전 떼어 내기는 그 영역을 맡은 세션을 리드가 정해야 한다.
14. **로컬 main 의 미푸시 10커밋** — 밀기 직전에 원격과 비교한다(AGENTS).

---

## 8. Gemini 에게 검토할 구체적 안

1. **L1** — `blankItems[confirmed]` → 문장 → 묶음 역지도. 빠진 경우를 찾아 달라: 한 교재 개념이 여러 fading 개념에 걸치는 경우, 확인한 뒤 은행이 손질된 경우.
2. **L2** — DB `Unit` 에 유일 제약이 없는데 «한 행일 때만»으로 충분한가.
3. **E1** — 이번 반복은 루트가 정했다(온라인 AI 없음 · 별칭은 결정적 규칙만). 다음 반복의 물음: 실시간 조언형 Jev 를 넣는다면 조건 넷 밖에 무엇이 더 필요한가, 아니면 오프라인 L7 으로 충분한가.
4. **E2 · E3** — 교재 설명 기록과 강의 시청을 대기열에 넣지 않는 것(P-a)에 동의하는가. 동의하지 않는다면, 넣었을 때 FSRS 에 생기는 부작용에 대한 답을 달라.
5. **L0** — 화면 계약을 먼저 넓히는 두 배포 대신 하나로 합칠 길이 있는가(계약 SSOT 를 지키면서).
6. **L4** — 시험 오답 단원을 «나란히» 두는 것이 D-134 의 «합치지 않음»과 맞는가.
7. **3장 표의 빈틈** — 84 + 27 + 14 행에서 빠졌거나 잘못 분류한 것.

---

## 9. 경로

- 이 보고서: `docs/work-plans/srs-internal-integration-plan.md` (원 자문과 사용자 정정 반영)
- Gemini 에게 보낸 답: `scratchpad/plan/to-gemini-1.md`(msg_8a8e92e199e9)
- 측정: `scratchpad/plan/m1.ts`(단원 다리) · `scratchpad/fsrs2/m*.ts`(은행 · typedKey)
- 이 작업자의 4단계 최종 합의 원문: `scratchpad/fsrs2/final.md` · 중간 보고: `scratchpad/fsrs2/prelim.md`
- scratchpad = `C:/Users/user/AppData/Local/Temp/claude/C--Creative-testautocreator/6924ed51-8387-4422-928a-c30f51989943/scratchpad`
- 기존 문서:
  - `docs/work-plans/fading-card-learning.md`(최신 사용자 결정·구현 기준)
  - `.qa-artifacts/todays-math-capabilities/fading-4stage-recommendation.md`(Gemini 초기안 보존)
  - `.qa-artifacts/todays-math-capabilities/fading-fsrs-consultation.md`(초기안 보존 — 확신과 수행 결과를 분리하도록 정정)
  - `docs/planning/srs-overhaul-20261006.md`(정본)
  - `docs/planning/tracks/fading-hifi-followups.md`
  - main `.qa-artifacts/todays-math-capabilities/{internal-student-capabilities.md, gemini-consultation.md}`
