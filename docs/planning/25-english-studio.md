# 25. 오늘의 영어 — 외부지문 내신 스튜디오 (D-148, 2026-09-30)

> **SSOT.** 원장님이 ChatGPT 에서 기획·제작한 «외부지문 문제생성기»(2안 «학교별 내신 대비»)를 오늘의수학 안의
> **둘째 제품 «오늘의 영어»** 로 옮긴다. 원장님 결정(§0) · 리드·codex·grok 3자 합의(§9) · 저장소 규칙을 한 곳에 적는다.
> 영어 작업(옆 메뉴 전환 · 학교별 내신 대비 · 문제 만들기 · 보관함 · 검토·편집 · 인쇄 · `english_*` 표) **시작 전 필독.**
> 원본 대화는 저장소 밖(ChatGPT 공유 링크 — 원장님 보유). 그 앱의 코드는 참고일 뿐 옮겨 적지 않는다.

## 0. 원장님 확정 (2026-09-29~30)

| # | 물음 | 확정 |
|---|---|---|
| ⑴ | 이름 | **«오늘의 영어»** (옆 메뉴 접힌 이름 «영어») |
| ⑵ | 자리 | **옆 메뉴 맨 위 브랜드 자리에 오늘의 수학 ↔ 오늘의 영어 전환**, 영어 아래 첫 탭이 «학교별 내신 대비» (원장님 캡처: 브랜드 «오늘의수학» + 접기 단추 자리) |
| ⑶ | 전환 장치 | Hi-fi 4안 중 **C «고르기 단추»** — 브랜드 자리가 곧 고르기 단추(이름 옆 ▾), 누르면 바로 아래 제품 목록(오늘의수학 · 오늘의영어 ✓). 시안 `docs/design/mockups/hifi-d148-english-switch.html` · artifact TKpE9WMKtLJft5ikLBMxmj |
| ⑷ | 접힌 옆 메뉴(72px) | **마크 귀퉁이 글자 딱지 «영»** — 영어일 때만, 수학은 지금 모습 그대로. 마크는 **같은 책 마크** |
| ⑸ | 영어 옆 메뉴 파란 단추 | **«새 시험 등록»** (수학의 «새 시험지 만들기» 자리) |
| ⑹ | 영어 아래 탭 | **셋 — 학교별 내신 대비 · 문제 만들기 · 문제 보관함** (ChatGPT 앱 옆 메뉴 그대로) |
| ⑺ | 첫 판 범위 | 화면 넷 + 자료 보관 + **만들기 세 길 전부**(ChatGPT 붙여넣기 · 원문 복원 · DeepSeek 직접 생성) |
| ⑻ | 인쇄 | 학생용·교사용 A4 두 지면, **배점 없음**(D-28 결 — 배점은 다음 판에서 따로) |
| ⑼ | 기획 문서 번호 | **25** (이 문서) |

## 1. 화면

### 1.1 셸 — 제품 전환 (작업실 셸 `UnifiedWorkspace`)

- 제품은 둘: `math`(지금 메뉴 8개) · `english`(메뉴 셋). **제품은 뷰에서 파생**한다 — 영어 뷰(`english*`)면 영어, 아니면 수학. 따로 저장하지 않는다.
- 브랜드 단추 = 고르기 단추(`aria-haspopup="listbox"`). 목록에는 **권한이 있는 제품만**(영어 메뉴가 꺼진 계정은 목록 자체가 없고 지금 모습 그대로).
- 고르면 그 제품의 **첫 뷰**로 간다 — 수학은 `defaultView`(지금 규칙), 영어는 `english`. 영어에 마지막으로 있던 뷰는 기억하지 않는다(단순).
- 영어 제품의 옆 메뉴: 파란 단추 «새 시험 등록»(⑸) → 나브 캡션 «오늘의 영어» → 탭 셋(⑹). 수학의 «현재 시험지» 카드 · 담기 바(`worksheetView`)는 **영어에서 안 뜬다** — 개념·SRS 마운트 블록과 같은 결로 붙인다(`worksheetView` 에 넣지 말 것).
- 접힘: 마크 + 딱지 «영»(⑷). 접힌 채 마크를 누르면 목록이 옆으로 뜬다(시안 C).
- 빠른 검색(Ctrl K)에는 영어 탭 셋도 같이 나온다(`availableNav` 가 한 목록이므로 그대로).

### 1.2 뷰 · 해시 · 딥링크

| 뷰 id | 해시 | 옆 메뉴 이름 | 내용 |
|---|---|---|---|
| `english` | `/#english` | 학교별 내신 대비 | 학교 칩 + 시험 고르기 · «이번 시험 준비» 세 단계 · 시험 자료 · 출제 설정 · 대비 문제 세트 · **검토·편집**(세트를 열면 같은 뷰 안에서 편집 화면으로) |
| `english-maker` | `/#english-maker` | 문제 만들기 | 세 길(§4) → 만들면 초안 세트를 저장하고 편집 화면으로 |
| `english-library` | `/#english-library` | 문제 보관함 | 이 시험의 세트 전부 · 이름 검색 · 상태 거르기 · 새로고침 |

- 메뉴 권한 id 는 **하나 `english`** (`WORKSPACE_MENUS` · `workspaceMenuSchema` 둘 다 손으로 — 파생되지 않는다). 뷰 셋은 `can("english")` 하나를 본다(`menuOf(view)`).
- 세트 딥링크 **`/?set=<uuid>#english`** — `sync()` 가 `extraction` 처럼 검색 인수를 읽어 그 세트를 연다(없으면 알림 줄 «문제 세트를 찾을 수 없습니다.»). 학교·시험 선택은 뷰 안 상태(세트를 열면 그 세트의 시험으로 맞춘다).
- 편집 화면은 라우트가 아니다 — «목록» 단추로 돌아온다. 브라우저 뒤로 가기는 뷰 단위(작업실 관례).

### 1.3 편집 화면 (검토·편집)

세트 이름 · 검토 상태(초안 · 검토 중 · 검토 완료) · 지문 · 문항마다 «QUESTION 01 · 유형» 머리 + 발문 · 보기 1~5 · 정답(번호 또는 인정 답안) · 해설/채점 기준 · 지문 속 근거 · 저장(`revision` CAS — 남이 먼저 저장했으면 «다른 곳에서 먼저 저장됐습니다. 다시 불러온 뒤 고쳐 주세요.» 409) · 인쇄(§5). 내용을 고치면 상태는 «초안»으로 내려간다(ChatGPT 앱 규칙 그대로).

### 1.4 모양

- 토큰은 **작업실 그대로**(05 §8.9 D-125 — `Workroom.module.css` · `--learn-*`). 새 색 없음. 상태 알약은 오늘의 개념과 같은 결(초안 호박 · 검토 중 회색 · 검토 완료 코발트 옅은 면). **왼쪽 색 막대 금지 · 카드·행에 손가락 커서 금지(D-30)** — ChatGPT 앱 CSS 의 전역 `cursor:pointer` 는 옮기지 않는다.
- 문구 D-08(느낌표·이모지 없음). ChatGPT 앱의 «수업의 다음 한 걸음» 류 장식 문구는 빼고 사무적으로.
- 영어 지문·보기는 지면과 화면 모두 **세리프 라틴 글꼴**(`PAPER_FONTS` 의 라틴 세리프 — 새 글꼴 싣지 않음), 발문·해설은 한글 본문 글꼴.

## 2. 자료 모델 — 새 표 셋 (`prisma/schema.prisma`)

**부류: 학원 운영 데이터**(D-130) — `english_exam.userId` FK Cascade + `ownedRowsWhere`(지점 관리자는 지점 전체 · 강사는 자기 것). 자료·세트·내려받기·인쇄 모두 **부모 시험의 범위**로 판정한다. 🔴 개인 작업물 표(`WorkspaceDocument`/`WorkspaceAsset`, `personalViewer`)에 얹지 않는다 — 계약이 `z.record` 라 엄격 검증이 빠지고 관리자가 못 본다.

| 표 | 칸 | 비고 |
|---|---|---|
| `english_exam` | id uuid · user_id → user **CASCADE** · school VarChar(80) · grade VarChar(4)(중1~고3) · title VarChar(100) · exam_date **date?** · types **jsonb** `[]`(출제 설정 — 유형 이름 배열) · created_at · updated_at | 색인 (user_id, created_at). SQL 에만: `jsonb_typeof(types)='array'` CHECK |
| `english_material` | id · exam_id → english_exam **CASCADE** · name VarChar(255) · mime_type VarChar(100) · size int · **bytes bytea?**(파일 원본 ≤10MB) · **content text?**(지문 글 ≤30,000자 — 텍스트 자료, 또는 .txt 파일의 글) · created_at | 색인 (exam_id, created_at). 파일이면 bytes, 글이면 content — 둘 다 null 금지(SQL CHECK) |
| `english_question_set` | id · exam_id → **CASCADE** · title VarChar(160) · status VarChar(8) `초안|검토 중|검토 완료`(SQL CHECK) · source VarChar(16) `chatgpt|cloze|deepseek|manual`(CHECK) · passage text · **questions jsonb**(문항 배열 — 쓰기 때 계약 strict 검증 · SQL `jsonb_typeof='array'`) · revision int 1 · created_at · updated_at | 색인 (exam_id, updated_at) |

- 세 표 모두 **`ENABLE ROW LEVEL SECURITY`**(2026-09-14 이후 새 표 규칙).
- 마이그레이션 `prisma/migrations/20260930120000_english_studio/migration.sql` + 가드 스크립트 `scripts/qa/apply-english-studio-migration.ts`(본보기 `apply-error-log-migration.ts`: 드라이런 기본 · `ALLOW_SHARED_IMPORT=1 --apply` · `--revert` · 앞조건(표 셋 없음, `user` 있음) · 칸 형·NULL·FK 동작·색인·CHECK·RLS 확인 · 기존 `user` 행 수 무변경 · `_prisma_migrations` 체크섬 한 줄). 🔴 `prisma migrate dev/deploy/db push` 금지.
- 시험 대역: `src/mocks/englishTestDouble.ts`(따로) + `composeEnglishDb(prismaTestDouble)` — 모르는 모양은 던진다.
- 문항 하나(계약 `englishQuestionSchema`): `type`(§4 유형) · `prompt` ≤12,000 · `options` string[] ≤5(각 ≤1,500) · `answer` ≤3,000 · `explanation` ≤6,000 · `evidence` ≤6,000. 규칙은 §4.4 검증기.

## 3. API · 계약 · 관문

계약 **`src/contracts/english.contract.ts`**(전부 `z.strictObject`). 라우트는 전부 `withErrorLog("<경로>", …)` · 응답 `{data, meta?}` / `{error:{code,message,details?}}` · `jsonOk` 로 응답도 parse.

| 경로 | 메서드 | 하는 일 |
|---|---|---|
| `/api/english/exams` | GET | 내 범위의 시험 목록 + 요약(자료 수 · 세트 수 · 검토 완료 수) |
| | POST | 새 시험 `{school, grade, title, examDate?}` → 201 |
| `/api/english/exams/[id]` | PATCH | `{title?, examDate?, types?}` |
| | DELETE | 시험과 딸린 자료·세트(Cascade) — 확인 창 뒤 |
| `/api/english/exams/[id]/materials` | GET | 자료 목록(bytes 없이 — `hasFile`, 텍스트는 `content`) |
| | POST | JSON `{name, content}` **또는** multipart `file`(pdf·docx·txt·png·jpg ≤10MB). 🔴 크기는 **받는 쪽이 재기 전에** `content-length` 로 먼저 자르고, 413 은 `{error}` JSON 으로 — 사유가 파서 오류로 지워진 전례(교훈 2026-09-21) |
| `/api/english/materials/[id]` | GET | 내려받기(`Content-Disposition: attachment` · `X-Content-Type-Options: nosniff`) — 소유 세션 |
| | DELETE | |
| `/api/english/exams/[id]/sets` | GET | 세트 요약 목록(id · title · status · source · 문항 수 · 유형들 · updatedAt) |
| | POST | `{title, source, passage, questions, status?}` → 검증기(§4.4) 통과해야 저장, 201 |
| `/api/english/sets/[id]` | GET | 세트 전체 |
| | PUT | `{title, status, passage, questions, revision}` — `revision` 불일치 409 `REVISION_MISMATCH` |
| | DELETE | |
| `/api/english/generate` | POST | DeepSeek 직접 생성(§4.3) — 저장하지 않고 초안을 돌려준다(클라이언트가 sets POST). `maxDuration = 300` |

- 관문 `src/lib/accountRouteAccess.ts`: **`/api/english` · `/english`(인쇄 페이지) → `any("english")`**. 🔴 `/api` 밖 경로는 기본 통과라 인쇄 페이지를 안 적으면 메뉴 꺼진 계정도 연다.
- 소유: `ownership.ts` 에 `requireOwnedEnglishExam(viewer, id)`(없으면 404 · 범위 밖 403) 하나를 더하고 자료·세트는 부모 시험으로 판정. 목록은 `ownedRowsWhere` 를 `exam.user` 로.
- 세션: `getSessionUser()` 401 · 쓰기는 같은 출처 검사(`authorizeAccount` 결).
- 서비스 공용 쓰기 없음(전부 시험 범위) — `isSuperAdmin` 구분 불필요.

## 4. 문제 만들기 세 길

### 4.1 ChatGPT 로 제작 (키 없음 — 주 경로)

원장님이 ChatGPT 구독으로 만든다(«여기(ChatGPT)에서 할 거니까»). 앱은 **두 단추**:
1. **요청문 복사** — 학교·학년·이번 시험의 출제 설정·난이도·문항 수·지문 길이·(있으면) 저장한 지문을 넣은 요청문을 만들어 클립보드로. 요청문 끝에 **답 형식**(JSON 하나 — `{title, passage, questions:[{type,prompt,options,answer,explanation,evidence}]}`)을 못 박는다. 규칙 문장은 ChatGPT 앱의 시스템 프롬프트 요지(§4.3 과 같은 규칙)를 한국어로.
2. **결과 붙여넣기** — 붙여 넣은 글에서 JSON 을 찾아(코드펜스·앞뒤 잡설 허용 — `jsonRepair` 의 `extractJson` 계열 재사용) 계약으로 읽고 **검증기(§4.4)** 를 지나면 «초안»으로 저장 → 편집 화면. 실패는 어느 문항·어느 규칙인지 한 줄씩.

### 4.2 원문 복원 (규칙 기반, AI 아님)

ChatGPT 앱의 `makeCloze` 이식: 7단어 이상 문장에서 6글자 이상 가장 긴 단어를 빈칸(`________`)으로, 첫 글자·글자 수 힌트, 정답 = 그 단어, 근거 = 그 문장, 유형 «원문 복원»(보기 없음). 최대 문항 수 3·5·10·15. 순수 함수 `src/lib/english/cloze.ts` — 서버·클라이언트 같이.

### 4.3 DeepSeek 직접 생성

- `src/lib/english/generate.ts`: `callAi`(`src/lib/ai/client.ts`) + 프롬프트 `src/lib/ai/prompts/englishExam.ts`(버전 상수 + 사유 JSDoc). 입력 `{mode: new|original|variation, topic, passage, difficulty: 기본|표준|심화, count 1~8, words 80~400, types}`(ChatGPT 앱 `aiInput` 규칙: new 는 topic 필수 · original/variation 은 passage ≥80자 · 고른 유형 수 ≤ count).
- 응답은 **객체 하나**(배열이 아니다) — `parseAiJsonArray` 대신 같은 복구 단계로 객체를 읽는 `parseAiJsonObject` 를 `jsonRepair.ts` 에 더한다(배열 함수는 손대지 않는다). `withOneRetryOnParseFailure` 그대로.
- 라우트 오류 순서: `AiCapacityError` 502 → `AiConfigError` 503 → `AiGenerationError` 502. 검증기 실패는 502 `ENGLISH_DRAFT_REJECTED` + 어느 규칙인지.
- 🔴 시험은 `vi.mock("openai")` + `vi.stubEnv` — **실호출 금지**(절대 규칙 7). 워크트리엔 `.env` 가 없어 켜진 분기는 리드가 main 에서 표본 한 번(교훈 2026-09-20).
- 요금 고지 한 줄(«생성 시 소재·지문을 AI 서버로 보냅니다.»).

### 4.4 검증기 (세 길 공통 — `src/lib/english/validate.ts`)

| 규칙 | 실패 문구(요지) |
|---|---|
| 유형은 «주제 · 내용 일치 · 어법 · 빈칸 추론 · 문장 삽입 · 서술형 · 원문 복원» 안 | 모르는 유형 |
| 서술형·원문 복원 → `options` 빈 배열, `answer` 는 글 | 서술형 형식 |
| 그 밖 → 보기 **정확히 5개**, 서로 다름(공백 정규화), `answer` ∈ "1".."5" | 선지 또는 정답 번호 |
| `evidence` 는 지문의 **연속 인용**(공백 정규화 뒤 `includes`) | 지문에서 근거를 찾지 못함 |
| 생성 요청이 있으면: 문항 수 = count · 고른 유형만 · 고른 유형 각 ≥1 · original 이면 지문 원문 유지 | 요청과 어긋남 |
| 검증 통과 ≠ 검토 완료 — 저장은 항상 **«초안»** | — |

## 5. 인쇄 — 학생용 · 교사용 A4

- 라우트 **`/english/sets/[id]/print`**(크롬 없음, 서버에서 `ownedRowsWhere` 로 읽음) · `?view=student|teacher`. 진입은 편집 화면 «인쇄» → 새 탭.
- **`A4Page` 경계·`print/tokens.ts` 의 A4 값만** 같이 쓴다. 🔴 수학 2단 폭(`PAPER_COLUMN_WIDTH`)·장당 2문항(D-28)·`.paperParity` 는 **안 쓴다** — 영어 지면은 1단이다.
- 지면: 머리 «오늘의 영어 · 학원 이름 | 학생용/교사용 · 검토 상태» · 세트 이름 · 이름·날짜 줄 · 지문(세리프, 상자) · 문항(발문 · 보기 1~5 · 서술형 답란) · 교사용에만 정답·해설·근거 상자. **배점 없음**(⑻).
- 절대 규칙 6: `src/app/dev/print-check/items.ts` 에 항목 둘(`english-student-a4` · `english-teacher-a4`) — «무엇이 보이면 불합격인가»를 적는다(제안이면 `lookFromSource:false`). 실물 출력 검수까지가 완료.
- 인쇄 페이지도 관문 `english` 메뉴(§3).

## 6. 울타리 · 시험

- **영어 울타리** `src/__tests__/unit/englishFence.test.ts`(D-141 울타리 셋과 같은 정적 검사 — 주석은 `helpers/sourceComments.ts` 로 걷는다):
  1. 문제은행·시험지·엔진·`src/lib/ai/`·`src/lib/daily/`·`src/lib/math-srs/`·`src/app/api/{problems,tests,basket,exports,studio,learn}` 뿌리에서 `src/lib/english/**`·`src/components/english/**` 로 가는 import 사슬 **0**. (영어 → `src/lib/ai/client.ts` 는 반대 방향이라 허용.)
  2. `english_exam|english_material|english_question_set|EnglishExam|EnglishMaterial|EnglishQuestionSet` 글자는 **허용 목록에만**: `prisma/schema.prisma` · 그 마이그레이션 SQL · `scripts/qa/apply-english-studio-migration.ts` · `src/lib/english/**` · `src/app/api/english/**` · `src/app/(main)/english/**` · `src/mocks/englishTestDouble.ts` · `src/__tests__/**` · `docs/**`.
  3. 🔴 quick 울타리를 그대로 베끼면 통합 셸(`UnifiedWorkspace`)까지 막힌다 — 셸·`src/components/unified/**` 는 영어 컴포넌트를 **불러도 된다**(목록에 명시).
- 그 밖 전수 시험이 요구하는 것: `errorLogRouteCoverage`(withErrorLog) · `accountRouteAccess.test.ts`(메뉴 매핑) · `UnifiedWorkspace.access.test.tsx`(nav 순서 — 영어 탭은 **제품별 목록**이라 수학 순서 시험은 그대로 초록이어야 한다) · `conceptMenu.test.ts` 류 `englishMenu.test.ts`(자리·상한·관문) · `contracts.smoke.test.ts` 에 유효/무효 표본.
- D-141 울타리와는 무관(§ 탐색 보고 — `StudentSrsState`·quick·math-srs 기록 모듈을 만지지 않는다).

## 7. 배포 순서

1. 표 셋 마이그레이션 — **리드가 main 에서 드라이런 → 원장님께 여쭌 뒤 `--apply`**(DB 먼저).
2. 코드 병합·푸시(Vercel). 새 표만 더하므로 옛 코드는 모른다 — 읽기 계약 두 단계(§0-Y.2)는 **불필요**(기존 저장 JSON 을 안 건드린다).
3. 실물 인쇄 검수(§5) → print-check «통과».
4. 새 메뉴는 **모든 기존 계정에 켜진다**(DB 는 꺼진 메뉴만 저장). 끌 계정이 있으면 관리자 화면에서.

## 8. 트랙 나누기 (오르카 워크트리 — CLAUDE.md 절대 규칙 10 · Q10 합의)

**0. 리드(main 먼저)** — 이 문서 · 05 §8.23 · 07 D-148 · 계약 `english.contract.ts` · 메뉴 id `english` + 제품 표 `WORKSPACE_PRODUCTS`(계약 · 관문 · `englishMenu.test.ts`). 울타리 시험(§6)은 **base 트랙**이 표·모듈과 함께 세운다.

| 트랙 | 워크트리 | 맡는 것 | 시험 |
|---|---|---|---|
| **english-base** | `english-base` | Prisma 모델 셋 · 마이그레이션 SQL · 적용 스크립트 · 대역 `englishTestDouble.ts` · `ownership.ts` 헬퍼 · 라우트 전부(§3, generate 제외) · 검증기(§4.4) · 원문 복원(§4.2) | `src/__tests__/api/english*.test.ts`(계약 parse) · 검증기·복원 단위 |
| **english-shell** | `english-shell` | 제품 전환(§1.1 C) · 뷰 셋 · 딥링크 · 학교별 내신 대비 · 보관함 · 편집 화면 · 만들기 화면(세 길의 **화면**) · MSW 핸들러 `src/mocks/handlers/english.ts` | `UnifiedWorkspace.access` 확장 · 컴포넌트 시험 · 폰 폭 |
| **english-ai** | `english-ai` | ChatGPT 요청문·붙여넣기 읽기(§4.1) · DeepSeek 생성(§4.3 — 프롬프트·`parseAiJsonObject`·`/api/english/generate`) | `vi.mock("openai")` 단위 · 라우트 오류 순서 |
| **english-print** | `english-print` | 인쇄 라우트·지면 둘(§5) · print-check 항목 둘 | 지면 스냅샷 · 관문 |

- 트랙 셋(shell · ai · print)은 **계약만** 보고 시작한다(base 와 병행). 셸은 MSW 로, ai 는 검증기 함수 시그니처(`validateEnglishDraft`)를 계약 파일 옆 `src/lib/english/validate.ts` 에서 — base 가 만든다. 🔴 **같은 파일을 두 트랙이 쓰지 않는다**: `validate.ts`·`cloze.ts` 는 base, `generate.ts`·`chatgpt.ts`·`prompts/englishExam.ts`·`jsonRepair.ts` 는 ai, `UnifiedWorkspace.tsx`·`components/english/**` 는 shell, `app/(main)/english/**`·`components/english/print/**`·`print-check/items.ts` 는 print. `accountRouteAccess.ts`·계약은 리드.
- 검토 중 amend 금지 · 병합은 커밋 id 로 · 트랙은 드라이런도 안 돌린다(`.env` 없음).

## 9. 3자 합의 기록 (2026-09-29, 브리프 `scratchpad/consult-english/`)

| # | 물음 | 리드 | codex | grok | 결론 |
|---|---|---|---|---|---|
| Q1 | 자리 | A 작업실 셸 메뉴 | A | A | A — 뒤에 원장님이 «브랜드 자리 전환 + 영어 아래 탭»으로 넓힘(§0 ⑵) |
| Q2 | 화면 나누기 | A 해시 뷰 | A | A | A |
| Q3 | 소유·범위 | A 운영 데이터 | A | A | A |
| Q4 | 저장 모양 | A 세트 JSON + CAS | A | A | A |
| Q5 | 만들기 v1 | C 세 길 | C | B(둘) | C — 원장님 ⑺ 확정 |
| Q6 | 파일 보관 | A | A | A | A |
| Q7 | 영어 울타리 | A | A | A | A |
| Q8 | 인쇄 | A | A | A | A |
| Q9 | 학생 화면 | B 제외 | B | B | B |
| Q10 | 트랙 | A 리드 뼈대 먼저 | A | A | A |

위험으로 받은 것(둘 다): 울타리를 베끼면 셸까지 막힘 · 표 이름 검사에 스키마·SQL·스크립트 허용 · `WorkspaceAsset` 권한 넓히지 말 것 · 인쇄 페이지 관문 명시 · 메뉴 enum 손 중복 · `worksheetView` 에 넣지 말 것 · `WorkspaceDocument.payload`(z.record) 에 넣지 말 것 · 수학 2단 폭 쓰지 말 것 · 413 사유 · 전역 `cursor:pointer`(D-30).

## 10. 남은 결정 · 다음 판

- 배점 표기(⑻ 보류) · 학생 풀이 화면(ChatGPT 3안, Q9) · PDF·DOCX·이미지 자동 읽기 · 학생 결과 기록(그때 문항 정규화 §2) · 학교별 기출 분석(ChatGPT 대화 §1 «학교별 출제 특징 등록») — 전부 다음 판, 원장님 결정 뒤.
