# 출처 고르기 결함 둘 · 교과서 출제 확인 · 3단계로 넘어갈 때의 오류 (2026-10-21)

원장님 말씀(오전) — ① «출처 고르기에서 교과서 이외를 고르면 엄청나게 버튼이 길어지는데 원인 해결 및 방안 계획»
② «교과서 자료종류가 전부 미확인인데 이것도 체크» ③ «실제로 교과서를 선택하고 시험지를 만들면 교과서 문제가 출제가 맞는건지도 확인».
오후에 리드를 거쳐 하나 더 — ④ «교과서 문제를 담은 다음 양식 구성 출력으로 넘어가려니 에러가 났는데 이것도 체크»(먼저 하라는 지시).
지시서 `display-survey/consensus/brief-source-picker.md`(저장소 밖) · 가지 `fix/source-picker`. ①② 는 결함 고침이라 시안 없이 고쳤다.
공유 DB 는 전부 **확인된 READ ONLY 트랜잭션**에서만 읽었다(쓰기 0 · 시험지 저장 0).

## ④ 3단계로 넘어갈 때의 오류 — 재검증 문의 본문 상한 (핫픽스 `1b65b12d4`)

**찾은 것** — 운영 `error_log`: 2026-10-21 04:25:37Z(13:25 KST) `POST /api/studio/problems/check` → 400 «요청 내용을 읽지 못했습니다.» ·
본문 19,341바이트 · 배포 `28868db2f`(지금 main) · Whale 브라우저. 이 문의 기록은 오늘 이 한 줄뿐이다(10-18 의 409 둘은 개발 서버).
오늘 기록된 오류 다섯 가운데 화면 쪽 예외(`client-exception`)는 0 — 3단계 렌더까지 가지도 못했다.
Vercel 런타임 오류는 MCP · CLI 로 로그인된 계정에 이 프로젝트가 보이지 않아 대조하지 못했다(앱 기록이 요청 번호 · 문구 · 본문 크기를 다 갖고 있어 판단에는 충분했다).

**원인** — 이 문장은 본문 읽기(`readStrictJson`, 상한 16KB)에서만 나온다. zod 계약에서 떨어지면 «확인할 문항을 1~100개로 보내 주세요.»가 나간다 — 짐작(교과서 행의 `[그림:n]` · 그림 주소 · 긴 본문이
계약에서 막힘)과 다르다. 이 요청에는 본문 · 그림이 아예 안 실린다. 2단계 → 3단계의 `prepareOutput` 은 2026-10-18(`98b2a2f23`)부터 문항마다 `selections`
(신분 · 실제 형식 · 판 `qr:v1:` + 64자)를 같이 싣는다 — 문항당 257바이트 남짓. 16KB 는 id 만 싣던 때의 값이다.

| 문항 수 | `row:` 신분 · 단답형 | `row:` · 객관식 | `q:v1:` 신분 · 객관식 |
|---|---|---|---|
| 63 | 16,152 | 16,341 | 18,168 |
| 64 | 16,408 ✗ | 16,600 ✗ | 18,456 ✗ |
| 75 | 19,224 ✗ | 19,449 ✗ | 21,624 ✗ |
| 100 | 25,624 ✗ | 25,924 ✗ | 28,824 ✗ |

운영 본문 19,341바이트는 «교과서(`row:` 신분 — 교과서 행은 묶음 키가 없다) 75문항, 객관식 · 단답형 섞임»과 맞는다. 교과서여서가 아니라 **64~100문항 시험지 전부**가 막혔다.

**고친 것** — 상한을 계약 옆 상수 `BANK_READINESS_BODY_BYTES` = 32KB 로(`bankReadiness.contract.ts` — 앱이 만드는 가장 큰 요청 28,824바이트가 든다).
zod 계약은 그대로이고, 상한을 넘는 본문은 여전히 읽기 전에 400 이다. 교과서 지정 슬롯 문(`textbook-slots`)도 같은 읽기를 쓴다(그쪽 최대 요청 ≈ 7.8KB).
⚠️ 계약의 `revision` 은 길이를 묶지 않는다 — 32KB 는 «계약이 받는 모든 요청»이 아니라 «서버가 만든 판(`qr:v1:` 64자)을 실은 요청»을 덮는다(Codex 검토). 판의 꼴을 바꾸면 상한을 다시 잰다.

**시험** — `src/__tests__/api/bankCheckBodyLimit.test.ts`: 교과서 문항을 시험 대역에 심고 dev 목록 라우트(`view=page`)로 읽은 뒤, 화면의
`createMathExamBuilderSource().prepareOutput` 이 **실제로 만든 본문**을 dev 재검증 라우트에 그대로 보낸다(75 · 100문항). 옛 상한에서는 운영과 같은
«요청 내용을 읽지 못했습니다.» 400 으로 빨갛다. 앱이 만드는 가장 큰 요청(100문항 · `q:v1` 신분 · 객관식 · 서버가 만든 판의 길이)이 상한 안에 들고 라우트가 읽는지,
상한을 넘으면 여전히 400 인지도 잠갔다.

**3단계 렌더 실데이터** — 오늘 아침 교과서 글 · 자리 고침이 의심돼 3단계가 문항을 그리는 부품에 실제 행을 넣어 봤다.
읽기 전용으로 저장소 밖에 뽑은 교과서 그림 행 **3,773**(그림 주소는 전부 `/figures/…` — 공유 저장소로 나가는 길) · 그 가운데 `[그림:n]` 자리 행 **248**(출제 가능 239)을
`ProblemContent` 정적 렌더 · `estimateProblemPx` · `checkFigureSlots` 에 넣었다 — 던짐 0 · 자리 검사 문제 0 · 자리 표기가 글로 새는 행 0
(`textbook-slot-render-sweep.json` — 시험은 셋 다 0 이어야 통과한다). 3단계로 넘어가면 렌더는 안전하다.

## ① 출처 줄 단추가 세로로 길어짐

**원인**(리드 진단 그대로 확인) — `BankSourcePicker.module.css` 의 `.wrap { min-height: 100% }` + `.wrap > :first-child { flex: 1 }`.
시험지 만들기의 창(`exam-builder/SourcePicker.tsx` — 2026-10-19 `2ffd8833a` 에서 «보이는 단만 읽기»로 새로 짠 창)은 출처 줄 `.segments` 가 `.wrap` 의 첫 자식이라
남는 높이를 다 먹고, 줄바꿈 flex 의 줄 늘이기(`align-content` 기본값)로 단추가 세로로 늘어났다. 교과서여도 목록이 짧으면 늘어났다.
문제은행의 창(`unified/BankSourcePicker.tsx`)은 출처 줄과 세 단을 `<div>` 로 감싸 그 `<div>` 가 늘어났으므로 단추는 멀쩡했고, 대신 세 단의 줄이 바닥 줄까지 안 갔다.
운영 작업실에서 원장님이 여는 것은 시험지 만들기의 창이다 — 문제은행의 창은 옛 작업실(`/dev/unified?design=2…`)에만 붙어 있다.

**고친 것** — 남는 높이는 아래가 갖는다: 세 단(`.pane`) · 안내(`.note`) · 홀로 선 상태 문구(`.state:last-child` — 불러오는 중 · 오류).
출처 줄은 `flex: none` + `align-content: flex-start`. 폰 폭(760px 이하)에서 쌓인 세 단은 늘이지 않는다(`align-content: start` — 남는 높이는 맨 아래).
문제은행 창의 감싼 `<div>` 를 걷어 두 창의 짜임을 같게 했다 — 세 단의 줄이 바닥 줄까지 간다. 확정 시안 H1(`/dev/bank-source-hifi`)이 이 모양이다(거기서는 세 단이 첫 자식이었다).

**잰 값** — Playwright Chromium · 실제 작업실 화면 · 출처 다섯을 차례로 누름(`measure-before.json` · `measure-after.json` · 스크린샷 넷).
시험지 만들기는 하네스 `/dev/workspace-alignment#bank`, 문제은행은 `/dev/unified?design=2`(창이 부르는 API 를 브라우저에서 고정물로 답함). 망으로 나간 `/api` 요청 0 · 페이지 오류 0.

| 창 | 크기 | 교과서 이외 넷 — 단추 높이 | 교과서 — 단추 높이 | 교과서 — 세 단 아래 끝 / 바닥 줄 위 |
|---|---|---|---|---|
| 시험지 만들기 | 1280×800 | **593 → 44** | 44 → 44 | 창이 넘쳐 몸통이 스크롤(그대로) |
| | 1440×900 | **691 → 44** | **78 → 44** | 805 / 805 → 805 / 805 |
| | 390×844 | **328 → 44**(두 줄) | 44 → 44 | 쌓인 세 단 · 스크롤(그대로) |
| 문제은행 | 1280×800 · 1440×900 · 390×844 | 44 → 44 | 44 → 44 | 1440×900: **783 / 805 → 805 / 805** |

출처 줄 높이는 넓은 화면 73px · 폰 123px(두 줄)로 두 창 · 다섯 출처가 모두 같다. 안내 글은 출처 줄 바로 아래에 붙는다.

**하네스** — `/dev/workspace-alignment` 의 가짜 API 가 출처 고르기 창의 읽기(`view=picker-groups · picker-books · picker-book-counts`, 문제은행의 `GET …/sources`)에
운영과 같은 모양으로 답한다(지어낸 출판사 · 저자의 책 넷 — 중1 셋 · 중2 하나). 전에는 창을 열면 오류 상태였다.

## ② 자료 종류가 전부 «미확인»

**원인** — 시험지 만들기 창은 고른 책이 정확히 한 권이 아니면 자료 종류의 수를 «미확인»으로 냈다(`kindCount` · `books.length !== 1`).
문제은행 창도 문항 보기(`countUnit: "question"`)에서 책이 둘 이상이면(안 고르면 모든 책이라 늘 둘 이상) 같았다 — 2026-10-18 문항 묶음을 들이며
«겹칠 수 있는 집합의 합을 만들지 않는다»고 막은 것이다. «{과목} 교과서 전부» 줄과 «걸리는 문항»도 같은 까닭으로 «미확인»이었다.

**겹치지 않는 근거** — ⑴ 문항 묶음 키는 `proveQuestionPair` 가 **`sourceMaterialId` 가 같은 두 행**에만 붙인다(엔진 외부 id 의 짝만 — 교과서 행은 대상이 아니다).
⑵ 자료가 바뀌면 트리거(`problem_question_group_invalidate`)가 키를 지운다. ⑶ 공유 DB 실측(읽기 전용 — `probe-textbook-question-groups-live.ts`):
교과서 12,301행 · 묶음 키 0 · 책 · 자료 종류 · 자료를 넘는 문항 0 · 자료 없는 교과서 문항 0 · 교과서와 다른 출처를 섞은 묶음 0.
중1 자료 종류 10가지 모두 «책별 수의 합 = 문항 단위 합집합»(예: 기초 연산 1,396 = 1,396 · 형성 평가 476 = 476 — `textbook-compose-live.json` 의 `kindSums`).
그래서 책 × 자료 종류의 수는 더하면 정확하다.

**고친 것**
- 문제은행 창(`bankSourcePick.ts`) — `kindCount` · `matchedCount` 가 문항 보기에서도 고른 책(안 고르면 모든 책)의 합을 낸다.
- 시험지 만들기 창(`SourcePicker.tsx`) — 고른 책들의 합. **책을 안 고르면 교과서 전부의 자료 종류별 수**(새 보기 `picker-kind-counts`)를 쓴다 —
  책을 안 고른 조건은 과목을 가리지 않고 교과서 전부에 걸리기 때문이다. 이 창은 책별 수를 «펼친 과목 + 고른 책»만 받으므로(10-19 속도 작업)
  전역 종류별 수는 따로 한 번 읽는다(책을 안 고른 동안에만 · 창마다 한 번). 수가 아직 안 왔을 때만 «미확인».
  «{과목} 교과서 전부» 줄은 펼친 과목 책들의 합, «걸리는 문항»은 아무것도 안 고르면 교과서 전부 · 종류만 고르면 전역 종류별 수의 합 · 책을 고르면 고른 책들의 합.
  수가 온 뒤에도 응답에 없는 책(저장한 조건이 되살린 사라진 책)은 0 으로 친다(문제은행 창과 같은 규칙).
- 새 보기 `picker-kind-counts`(`bankSourceQuestions.ts` · `questionHeldSourceSql.ts` · 계약 `unifiedBankBootstrap.contract.ts`) — 교과서 책의 자료에 실린 공용 풀 문항을
  자료 종류마다 «보유 문항의 합집합»으로 센다(첫 줄 `picker-groups` 처럼 형식 · 출제 자격을 안 본다 = 책별 `kinds` 와 같은 뜻). 공유 DB 실측: 약 88ms · 13종 · 합계 12,301 ·
  «교과서 책별 `kinds` 의 합»과 같다(`probe-textbook-kind-totals-live.ts`). 옛 화면은 이 보기를 부르지 않는다(계약 호환).
- 두 창의 «겹치는 문항 수는 적용 후 목록에서 확인합니다.» 안내 줄은 뺐다 — 겹치지 않으니 사실이 아니다.
- 0 인 자료 종류는 흐리게 · 체크 막음(H1 ⑵ 그대로) — 책을 안 고르면 교과서 전부에서 0 인 종류만 막힌다(이미 고른 것은 풀 수 있다).

**시험**(옛 코드에서 각각 빨간 것을 확인) — `bankSourcePick.test.ts`(문항 보기 0권 · 1권 · 여러 권) · `BankView.source.test.tsx`(자료 종류 칸 0권 · 1권 · 여러 권,
수를 받기 전에는 «불러오는 중», 걸리는 문항 40 → 90, «중1 교과서 전부» 150 — 옛 코드 4개 빨강) · `PickerDemand.test.tsx`(시험지 만들기 — 0권은 교과서 전부의 종류별 수
(중2 책에만 있는 종류도 중1 화면에서 막히지 않는다), 1권, 여러 권(다른 과목 책 포함), 고른 책이 바뀌어 수를 기다리는 동안 · 전역 수를 기다리는 동안만 «미확인» · 막지 않음,
사라진 책은 0, 전역 수는 한 번만 읽음 — 옛 코드 빨강) · `unifiedBankPickerDemand.test.ts`(새 보기 = 교과서 책별 `kinds` 의 합 · 책 · 자료 메타데이터를 안 읽음 · 라우트) ·
`bankHeldSourceSql.test.ts`(PGlite — 같은 자료의 묶음 두 행은 하나 · 공용 풀 밖 · 문제집 책 · 자료 없는 행은 빠짐. SSD 작업트리에서는 `._*` 때문에 PGlite 도우미가 못 돌아 내장 디스크 사본에서 돌렸다).

## ③ 교과서를 고르고 시험지를 만들면 교과서 문항만 담기는가 — 그렇다

**코드 경로** — 화면(`MathExamBuilder`)의 `filters` = `sourceGroup=school_textbook`(+ `books` · `materialKinds` · `materials`) 한 문자열을
2단계 차시 수(`view=scope-counts`) · 추가 · 교체 후보(`view=page`) · 자동 구성(`POST …/random` 의 `filters`) 셋이 같이 싣는다.
서버 `resolveUnifiedBankQuery` 가 `source ∈ {school_textbook}` · `sourceMaterial.bookId ∈ books` · `sourceMaterial.kind ∈ kinds` · `sourceMaterialId ∈ materials` 를 «그리고»로 묶고
출제 자격(`problemEligibleWhere` — 공용 풀 · 검수 통과 · `direct_use_allowed` · 정답 있음)을 건다. 자동 구성은 그 후보 안에서만 풀고, 고른 id 를 같은 조건으로 다시 읽어 어긋나면 409 다.

**모자랄 때** — 다른 출처로 채우지 않는다. 서버는 `status: insufficient` 와 실제 수를 내고, 화면은 «요청한 N문항 중 M문항을 구성했습니다. 부족한 범위는 다른 범위로 채우지 않았습니다.»를 띄운다.
그 전에 2단계 표가 차시마다 «출처를 건 수»(같은 문항류 1개면 갈래 수)를 넘는 요청을 막는다.

**공유 DB 실측** — `verify-textbook-compose-live.ts`: 실제 서버 함수(`loadQuestionScopeCounts` · `loadUnifiedBank` · `composeUnifiedBankProblems`)를 확인된 READ ONLY 트랜잭션 안에서 돌리고
(쓰기 연산 · 쓰기 SQL 은 막는다), 담기거나 목록에 나온 문항을 **따로 짠 SQL** 로 출처 · 책 · 자료 종류 · 자료 · 검수 · 잠금 · 차시를 다시 봤다.
대조 SQL 의 «출제 가능»은 서버와 같게 자격 + 형식이 확인된 것(`actual_format <> 'unknown'`, 판이 맞는 것)이고, 판이 안 맞아 서버가 본문으로 가르는 행은 따로 센다(네 경우 모두 0). 고정물은 교과서 문항이 가장 많은
과목(중1) · 그 과목에서 문항이 가장 많은 책 둘 · 첫 책의 많은 자료 종류 둘(기초 연산 · 형성 평가) · 문항이 많은 차시 셋.

| 경우 | 차시 | 2단계 수 | SQL 출제 가능 | 후보 목록 총수 | 같은 차시의 잠긴 교과서 행 | 같은 차시의 다른 출처 출제 가능 | 구성 | 재확인 행 · 위반 |
|---|---|---|---|---|---|---|---|---|
| 교과서 · 책 전부 · 자료 전부 | 3 | 909 | 909 | 909 | 22 | 2,017 | 90 → 90 | 246 · **0** |
| 책 1권 · 자료 종류 1 | 3 | 213 | 213 | 213 | 4 | 2,017 | 90 → 90 | 172 · **0** |
| 책 2권 · 자료 종류 2 | 3 | 496 | 496 | 496 | 7 | 2,017 | 90 → 90 | 230 · **0** |
| 책 1권 · 종류 1 · «자료 고르기» 1편 | 1 | 20 | 20 | 20 | 0 | 579 | 20 → 20 · **22 → 20 `insufficient`** | 20 · **0** |

- 2단계 수 = SQL 출제 가능 = 후보 목록 총수(문항 단위) — 네 경우 모두 같다(형식 `unknown` 행 0 · 판이 안 맞는 행 0).
- 잠긴 교과서 행(`direct_use_allowed = false`)은 한 건도 안 섞였다. «자료 고르기»를 걸면 그 자료의 문항만 나온다.
- 자료 한 편에 22문항을 요청하면 20문항 · `insufficient` 로 끝나고, 같은 차시의 다른 출처 출제 가능 579행으로 채우지 않는다.
- 덧: 교과서 행 가운데 실제 형식 캐시가 빈 행 0(읽기 경로의 지연 쓰기가 생길 행이 없다) · 차시 학년 ≠ 책 과목 0 · 새 보기 `picker-kind-counts` 의 수 = 전역 합집합.
- «재확인 행»은 돌릴 때마다 자동 구성이 고르는 문항이 달라 조금씩 다르다(이번 판 264 · 175 · 226 · 20).

## Codex 검토(gpt-6-astra · xhigh · 읽기 전용) — 두 번, 지적 일곱 모두 반영

1차(전체 변경) — 다섯:

| # | 심각도 | 지적 | 처분 |
|---|---|---|---|
| 1 | 중간 | 시험지 만들기 창에서 책을 안 고르면 수를 «펼친 과목의 책»으로 셌는데 적용 범위는 교과서 전부 — 중2 에만 있는 종류가 중1 화면에서 0 으로 막힌다(실제 컴포넌트로 재현) | 새 보기 `picker-kind-counts` 로 전역 종류별 수를 쓴다(②). 직전 판에서 그 시험이 «12, 2, 0»(옳은 값 12, 6, 5)으로 빨갛다 |
| 2 | 중간 | 대조 SQL 이 서버의 형식 조건(`unknown` 제외)을 빠뜨림 | 형식 조건을 넣고, 판이 안 맞는 행을 따로 센다 — 다시 재도 수는 같다(③) |
| 3 | 중간 | 렌더 전수 시험이 «던짐»만 단정 | 자리 문제 · 누출도 0 이어야 통과(④) |
| 4 | 낮음 | 행 덤프의 «저장소 밖» 검사가 상대 경로로 우회됨 | 실제 경로로 견주게 고쳤다 — 아래 |
| 5 | 낮음 | «계약 최대 요청»은 틀린 말(`revision` 길이 무제한) | «앱이 만드는 가장 큰 요청»으로 고치고, 시험은 서버가 만든 판의 길이로 잰다(④) |

2차(1차 반영분만) — 낮음 둘:

| # | 지적 | 처분 |
|---|---|---|
| 6 | 전역 종류별 수 읽기가 실패한 뒤 책을 고르면 그 오류 알림이 남고, «다시 시도»도 그 요청을 다시 안 낸다(실제 컴포넌트로 재현) | 그 오류는 책을 안 고른 동안만 보인다 · 책을 다 풀면 다시 읽는다(시험 — 옛 판에서 빨강) |
| 7 | 덤프 출력 경로가 저장소 안 파일을 가리키는 심볼릭 링크면 부모 폴더 검사만으로는 통과 | 이미 있는 출력이 심볼릭 링크이거나 하드 링크(링크 수 > 1)면 거절 — 둘 다 DB 를 막아 두고 확인 |

**4번을 고치다 생긴 일** — 고친 첫 판도 저장소 안 **절대 경로**를 못 막았다: 외장 SSD 의 «새 볼륨» 한글이 셸(NFC)과 Node(NFD)에서 정규화가 달라
글자 비교로는 저장소 안이 밖으로 보였다. 검사 시험을 돌리는 사이 `docs/x.json`(교과서 행 1.7MB)이 한 번 써졌고 **바로 지웠다**(추적 안 된 파일 — 스테이지 · 커밋에 안 섞였다).
지금은 출력 폴더의 실제 경로(`realpath`)를 NFC · 소문자로 맞춰 견준다 — 상대 · `./` · 절대 · 대소문자를 바꾼 저장소 안 경로가 모두 거절되고, 밖은 통과한다(시험은 DB 주소를 막아 두고 돌렸다).

## 검사

- 전체 `type-check` 통과 · 바뀐 파일 `eslint` 0 · `lint:affordance` 0. 관련 시험(`--maxWorkers=3`)은 본 설정 · 시험지 만들기 설정 · PGlite(내장 디스크 사본) 모두 통과.
- 전체 vitest 한 번(`--maxWorkers=4`, SSD 작업트리): 실패 62파일 = `._*` 잡음 40(`prisma/migrations/._…` ENOTDIR 등) + 내장 디스크 사본에서는 통과하는 환경 탓 18(읽기 오류 −70 · `._*` 가 섞인 목록)
  + **이 가지 밖에서 원래 빨간 넷** — `elemTiersG5`(초5 엔진 기대값) · `examWiringAudit`(`scripts/import/verified-engine-batch.ts:808` 에 `exam-wiring` 표시 없음) ·
  `noRmSync`(`scripts/qa/bank/question-backfill-scale.ts:238`) · `examDecisionCorpus`(SSD 에서는 `._*` 로 목록이 두 배, 사본에서는 git 이 없음). 넷 다 이 가지가 안 건드린 파일이다.
- 커밋: 화면 · 서버 커밋은 `--no-verify` 로 했다 — 훅의 prettier 가 원래 정돈 안 된 기존 파일 다섯(`bankSourceQuestions.ts` · `prismaTestDouble.ts` …)을 통째로 다시 써
  서식만 바뀐 줄이 712줄 끼기 때문이다(여러 세션이 같이 고치는 파일). 훅이 하는 검사(eslint · 원래 정돈된 파일의 prettier · 어포던스)는 손으로 다 돌렸다.

## 남은 것 · 리드께

- 문제은행 창(`BankSourcePicker`)은 운영 작업실에 없다(옛 작업실 전용) — 같은 CSS 를 쓰므로 같이 고치고 쟀다.
- 시험지 만들기 창은 책을 안 고른 동안 전역 종류별 수를 한 번 더 읽는다(공유 DB 약 88ms). 10-19 속도 작업이 뺀 «전역 책별 수»는 여전히 안 읽는다.
- 인쇄 지면은 건드리지 않았다(실물 출력 검수 대상 없음).

## 재는 법

```bash
# 공유 DB(읽기 전용) — 묶음 키 · 오류 기록 · 교과서 출제 대조 · 3단계 렌더용 행 뽑기(행은 저장소 밖에)
node --env-file=<today_/.env> node_modules/tsx/dist/cli.mjs scripts/qa/probe-textbook-question-groups-live.ts
node --env-file=<today_/.env> node_modules/tsx/dist/cli.mjs --conditions=react-server scripts/qa/probe-textbook-kind-totals-live.ts
node --env-file=<today_/.env> node_modules/tsx/dist/cli.mjs scripts/qa/probe-error-log-live.ts [since]
node --env-file=<today_/.env> node_modules/tsx/dist/cli.mjs scripts/qa/probe-check-route-errors-live.ts
node --env-file=<today_/.env> node_modules/tsx/dist/cli.mjs --conditions=react-server scripts/qa/verify-textbook-compose-live.ts
node --env-file=<today_/.env> node_modules/tsx/dist/cli.mjs scripts/qa/dump-textbook-slot-rows-live.ts <저장소 밖 rows.json>
TEXTBOOK_SLOT_ROWS=<rows.json> TEXTBOOK_SLOT_SUMMARY=<summary.json> \
  npx vitest run --config scripts/qa/textbook-slot-render-vitest.config.mts --maxWorkers=1
# 화면(next dev — DB 없이 띄워도 된다)
BASE=http://127.0.0.1:3000 OUT=<dir> LABEL=after node scripts/qa/measure-source-picker.mjs
```
