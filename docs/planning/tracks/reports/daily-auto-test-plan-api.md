# 보고 — 진도 계획 쓰기·읽기 API (22번 ④의 뒷단 · D-129 · D-130)

브리프: `docs/planning/tracks/briefs/daily-auto-test-plan-api.md`
SSOT: `docs/planning/22-daily-auto-test.md` · 결정 **D-129** · 소유 범위 **D-130**(07 Decision Log)
워크트리: `chrismathone/plan-api`(`C:/Users/user/orca/workspaces/todays-math/plan-api`) · 2026-09-16 · **푸시하지 않았다.**

> 🔴 **소유 판정은 임시다.** D-130 헬퍼(`admin-sees-all`)가 이 워크트리를 만들 때 아직 없었다 —
> `src/lib/daily/planOwnership.ts` 에 두었고 **부르는 곳은 이 트랙의 라우트 둘뿐**이다.
> **헬퍼가 오면 그리로 옮기고 이 파일을 지울 것**(④-A). `src/lib/ownership.ts` · `daily-review` ·
> `runAutoDraft.ts` 는 **한 글자도 안 고쳤다.**
>
> 마이그레이션은 없다 — 표 둘은 이미 공유 DB 에 있다(22 §5). 공유 DB·eywa·화면은 건드리지 않았다.

---

## ① 만든 것

### 라우트

| 경로 | 메서드 | 무엇 |
|---|---|---|
| `/api/classes/{id}/progress-plan` (새로) | GET | 반 계획 · **이번 주 예정** · 이 반의 학생 계획들. `?day=YYYY-MM-DD`(없으면 오늘 KST) |
| | PUT | 반 계획 **넣기 201 · 덮어쓰기 200** — 반에 한 줄 |
| | PATCH | 일부 고치기 · 켜기/끄기(`{active:false}`) — 계획이 없으면 404 |
| | DELETE | 반 계획만 지운다(학생 계획은 남는다) — 없으면 404 |
| `/api/students/{id}/progress-plan` (새로) | GET | 학생 계획 · `inEffect`(지금 반 계획을 덮나) · 그 학생의 이번 주 예정 |
| | PUT · PATCH | **개별 진도 학생만**(`useIndividualProgress`) — 아니면 422 |
| | DELETE | 누구에게나(개별 진도를 끈 뒤 남은 계획 치우기) |
| `/api/classes` (고침) | POST | `progressPlan` 칸을 **같이** 받는다(없어도 지금처럼). 반+계획 **한 트랜잭션** · 응답 모양은 그대로 |

판정 순서: 세션 401 → 경로 id 형식 400 → 반/학생 404·403 → 본문 422 → (학생) 개별 진도 아님 422 → 없는 차시 422 → 계획 없음 404.

### 계약 (`src/contracts/dailyAutoTest.contract.ts` 에 더했다)

| 이름 | 무엇 |
|---|---|
| `progressPlanWriteRequestSchema` | PUT 본문 — 규칙 한 줄. `unitsPerLesson` 기본 1 · `active` 기본 켬. 반/학생은 **경로**가 정한다(본문에 id 없음) |
| `progressPlanPatchRequestSchema` | PATCH 본문 — 일부만, 빈 본문 거절 |
| `progressPlanResponseSchema` | 계획 한 줄(`progressPlanSchema` 그대로) |
| `planUnitRefSchema` · `planScheduleRowSchema` · `planScheduleSchema` | 예정 한 줄 = `date · weekday · lesson · planned[] · actual[] · driftDays · atCurriculumEnd`, 차시는 `{id, grade, chapter, section}` |
| `classProgressPlanResponseSchema` | `{ plan \| null, schedule \| null, studentPlans[] }` |
| `studentProgressPlanResponseSchema` | `{ plan \| null, inEffect, schedule \| null }` |
| `progressPlanQuerySchema` | `?day=` |
| `class.contract.ts` `classCreateRequestSchema.progressPlan` | 선택 칸 — 위 PUT 본문과 같은 스키마 |

### 순수 함수 · 저장

| 파일 | 무엇 |
|---|---|
| `src/lib/daily/planSchedule.ts` (새로) | `planScheduleWindow(day)` — 이번 주 월요일부터 14일 · `buildPlanSchedule` — 줄마다 **기존 `resolveDailyPlan` 을 그대로 부른다**. 적용 이력도 제품 함수(`applicableProgress`·`findLatestProgress`) |
| `src/lib/daily/progressPlanStore.ts` (새로) | 422 응답 · 본문 거르기 · 없는 차시 확인 · `putPlan`(한 줄 규칙 + 경합 P2002 덮어쓰기) · `patchPlan` · `loadPlanSchedule`(DB 읽고 순수 함수 부르고 차시 이름 싣기) |
| `src/lib/daily/planOwnership.ts` (새로, **임시**) | `requirePlanClass` · `requirePlanStudent` — 지금 관례(404/403) + 관리자만 넘는다(D-130 ⑵) |

### 시험 하네스

| 파일 | 무엇 |
|---|---|
| `src/mocks/prismaTestDouble.ts` (고침) | `progressPlan` 에 `findFirst`·`update`·`delete`·`orderBy` · 🔴 **DB 가 막는 것을 가짜도 막는다** — 부분 unique(반 계획 한 줄)·학생 unique → P2002 · FK 시작 차시 → P2003 · CHECK 셋. 안 막으면 라우트 가드를 지워도 초록이다 |
| `src/mocks/handlers/class.ts` (고침) | MSW 반 만들기가 `progressPlan` 을 응답에 흘리지 않게(실제 라우트와 같은 반 모양) |
| `scripts/qa/mutate-plan-api.ts` (새로) | 변이 하네스 — 가드 39개. 러너는 `mutate-daily-plan.ts` 를 옮겨 왔다 |

---

## ② 정한 것과 까닭

### ⑴ 경로 모양 — 주인 밑의 **단일 자원**

`/api/classes/{id}/progress-plan` · `/api/students/{id}/progress-plan`.
- 계획은 반에 하나 · 학생에 하나라 **계획 id 를 경로에 둘 까닭이 없다.** 화면은 반·학생 id 만 안다.
- 소유 판정이 경로의 반·학생에서 바로 선다(본문의 `classId` 와 경로가 어긋나는 조합이 생길 수 없다).
- 같은 결의 선례가 있다 — `students/{id}/account`(학생 로그인 계정, 학생에 하나).
- `/api/progress` 처럼 본문에 `classId` 를 받는 평평한 모양은 버렸다 — «이 학생이 이 반 소속인가»를 또 재야 한다.

### ⑵ 며칠 치 — **이번 주 월요일 ~ 다음 주 일요일, 14일** (`PLAN_SCHEDULE_DAYS`)

- 화면은 요일을 **월요일부터** 그린다(22 §4 리드 결정 ⑶). 일요일은 그 주의 끝이다.
- 이번 주의 지난 수업일에는 «실제»가 붙어 **밀림이 보이고**, 다음 주까지 담아야 금·토요일에 열어도 앞으로 나갈 수업이 남는다(시안 B 도 다음 주 월요일 줄을 싣는다).
- 줄은 **수업일 + 실제로 진도가 기록된 날**(보강)만 선다. 수업 없는 날은 줄이 없다 — 주 1회 반은 두 줄, 주 5회 반은 열 줄.
- 다른 주는 `?day=` 로 옮긴다. «다음 4회» 같은 회수 기준은 버렸다 — 주 1회 반이면 한 달이 넘어가 「이번 주」 카드가 아니게 된다.

### ⑶ 둘째 계획 — **덮어쓴다** (같은 id, 200)

- 계획은 기록이 아니라 **규칙**이다. 지난 규칙을 남길 까닭이 없다(실제는 `Progress` 가 남긴다, D-129 ⑵).
- 거절(409)로 두면 화면이 «있나 없나»를 먼저 물어야 하고, 두 번 누른 저장이 오류로 보인다.
- 🔴 **경합**: 두 요청이 동시에 «없음»을 보고 둘 다 만들면 DB unique 가 하나를 막는다(P2002) → 막힌 쪽이 다시 찾아 **덮어쓴다.** 조용히 두 줄이 되는 길은 없다(시험 있음).
- 반 계획을 찾을 때는 `studentId: null` 로 **학생 계획과 가른다** — 같은 반의 학생 계획은 «둘째 반 계획»으로 세지 않는다.

### ⑷ 그 밖에 정한 것

| 무엇 | 정한 것 | 까닭 |
|---|---|---|
| 422 의 범위 | 본문·`?day=` 가 계약을 어기면 **422**(JSON 이 아니어도) · 없는 차시 422 · 경로 id 형식만 지금처럼 400 | 브리프 §3. 없는 차시를 DB 에 맡기면 FK(Restrict)가 **500** 으로 터진다 |
| 반 만들기의 오류 | 반 칸이 하나라도 틀리면 **400**(지금 그대로) · 계획 칸만 틀리면 **422** · 계획이 틀리면 **반도 안 만든다** | 지금 쓰던 길(400)을 안 바꾼다. 반쪽 반이 목록에 뜨지 않게 |
| 반 만들기의 응답 | **지금 반 모양 그대로**(계획을 싣지 않는다) | `src/lib/class/classApi.ts` 가 strict 스키마로 파싱한다 — 칸을 더하면 지금 화면의 반 만들기가 깨진다. 계획은 GET 으로 읽는다(④-D) |
| 개별 진도 아닌 학생 | PUT·PATCH **422**(`field: useIndividualProgress`) · DELETE 는 받는다 | 덮지도 않는 계획을 받으면 화면엔 «학생 계획»이 보이는데 아침 초안은 반 계획으로 선다(`pickProgressPlan`) |
| 「예정」의 기준 | 그날 예정은 **그날 아침까지의** 기록으로 편다 · 밀림은 **그 날짜까지의** 기록으로 잰다 | 그날 기록까지 넣으면 `resolveDailyPlan` 이 그 기록을 기준점으로 삼아 예정 = 실제가 되고 **밀림이 목록에서 사라진다.** 아침 8시 초안이 보는 것도 그날 아침까지의 기록이다 |
| 꺼진 계획 | 예정 줄을 내지 않는다(기록된 날만 남는다) | «자동 대상이 아니다»를 목록이 그대로 말한다. 계획 자체는 GET 의 `plan` 에 있다 |
| 학생 GET | `inEffect` = 계획이 있고 개별 진도 학생 · 아니면 `schedule: null` | 덮지 않는 계획으로 편 예정은 아무도 쓰지 않는 숫자다 |
| 요일 저장 | **겹침 없이 차례대로**(`[5,1,5,3]` → `[1,3,5]`) | 같은 규칙이 두 모양으로 저장되지 않게 |
| 관리자 여부 | `getAccountAccess().isAdmin`(세션 — jwt 콜백이 **요청마다 DB 에서 다시 읽는다**) · 그 세션의 id 가 요청 계정과 같을 때만 · **남의 반일 때만** 묻는다 | 자기 반을 고치는 평소 길에 조회를 더하지 않는다. 브리프가 「네 라우트 안에서만 판단」이라 `ownership.ts` 를 안 고쳤다 |
| 브리프의 «8» | 요일 값 **7·8·-1** 을 다 422 로 시험했다 | «요일 8»로 읽었다 — 0~6 밖. 7 이 실제로 흔한 오타(월=1…일=7)라 같이 박았다 |

---

## ③ 시험 · 변이

### 시험 (TDD — RED 확인 뒤 GREEN)

| 파일 | 수 | 무엇 |
|---|---|---|
| `src/__tests__/unit/planSchedule.test.ts` (새로) | 17 | 14일 창(수·월·일요일) · 수업일만 줄 · 두 차시씩·교육과정 끝 · 시작 전 줄 없음 · 꺼진 계획 · **실제가 들어오면 그 지점부터 다시 편다**(밀림 −5 · 앞섬 +4 · 창 앞 기록 · 보강날 · 같은 날 여러 차시 · 목록 밖 차시) · 개별 진도 이력 셋 · 입력 불변 |
| `src/__tests__/api/progressPlan.test.ts` (새로) | 52 | 넣기 201/덮어쓰기 200 · **경합 P2002 덮어쓰기** · 요일 정리 · 422 표 9갈래(요일 [] · 7 · 8 · -1 · 차시 0 · 11 · 1.5 · 날짜 형식 · 모르는 칸) · 없는 차시 · JSON 아님 · 401/400/404 · **소유: 관리자 아니면 403(읽기·넣기·고치기·지우기, 아무것도 안 씀) ↔ 관리자는 넘는다 · 다른 계정의 관리자 세션은 못 넘는다 · 자기 반에선 관리자를 안 묻는다** · PATCH 켜기/끄기·422·404 · DELETE 반 계획만 · GET 예정(이름 · 반 진도로 다시 편다 · 학생 진도 안 섞음 · 학생 계획들) · 학생 계획(개별 진도만 · 끈 뒤 고치기 422/지우기 200 · 한 줄 · 403/관리자) · **반 만들기(계획 없이 그대로 · 같이 · 틀리면 422 + 반도 없음 · 반 칸 틀리면 400)** |

관련 기존 시험 — 이 트랙이 건드린 파일을 읽는 것 전부: `class` · `dailyReview` · `autoDraftCron` · `progress` ·
`progressPlan`(unit) · `planDailyReview` · `progressResolver` · `mockHandlers.contract` · `kstDate` — 새 시험 둘과 합쳐
**12파일 217건 통과**(`noRmSync` 포함 — 아래 관문).

### 변이 하네스 — `npx tsx scripts/qa/mutate-plan-api.ts`

**빨개짐 39/39 · 살아남음 0 · 보류 0 · 판정 거부 0 · 변이한 파일 전부 원본과 md5 일치** (2026-09-16, 커밋 `f960e577` 에서 전량).
음성 대조: 변이 전 대상 시험 2파일 초록. 순수 함수·계약 변이(⑥⑦)는 tsx 탐침으로 **산출물이 바뀐 것**을 먼저 확인했고, 라우트 변이(①~⑤)는 탐침 없이 **실패한 시험 이름**으로 판정했다.

| # | 변이 | 판정 | 산출물(탐침) | 빨개진 시험(첫 하나 · 수) |
|---|---|---|---|---|
| 1 | ①a 반 — 관리자가 아니어도 남의 반을 넘는다 («항상 넓힌다») | 🟥 | — | 반 계획 — 🔴 소유 범위 (D-130: 관리자만 넘는다) 관리자가 아니면 남의 반은 403 — 읽기·넣기·고치기·지우기 모두, 아무것도 안 쓴다 (2) |
| 2 | ①b 반 — 관리자도 남의 반을 못 넘는다 («넓히지 않는다») | 🟥 | — | 반 계획 — 🔴 소유 범위 (D-130: 관리자만 넘는다) 관리자는 남의 반 계획을 읽고 넣고 고치고 지운다 (1) |
| 3 | ①c 학생 — 관리자가 아니어도 남의 반 학생을 넘는다 | 🟥 | — | /api/students/{id}/progress-plan — 🔴 개별 진도 학생만 반 계획을 덮는다 없는 학생 404 · 남의 반 학생 403(관리자가 아… (1) |
| 4 | ①d 학생 — 관리자도 남의 반 학생을 못 넘는다 | 🟥 | — | /api/students/{id}/progress-plan — 🔴 개별 진도 학생만 반 계획을 덮는다 없는 학생 404 · 남의 반 학생 403(관리자가 아… (1) |
| 5 | ①e 관리자 세션이 다른 계정의 것이어도 넘는다 | 🟥 | — | 반 계획 — 🔴 소유 범위 (D-130: 관리자만 넘는다) 관리자 세션이 다른 계정의 것이면 넘지 않는다 (1) |
| 6 | ①f 자기 반에서도 관리자 여부를 먼저 묻는다(평소 길에 세션 조회가 붙는다) | 🟥 | — | 반 계획 — 🔴 소유 범위 (D-130: 관리자만 넘는다) 관리자 확인은 **남의 반일 때만** 한다 — 자기 반에서는 세션을 다시 묻지 않는다 (1) |
| 7 | ②a 없는 차시를 안 본다 (FK 가 500 으로 터진다) | 🟥 | — | PUT /api/classes/{id}/progress-plan — 반 계획 넣기·바꾸기 🔴 없는 차시 id 는 422 (startUnitId) — 아무것도… (3) |
| 8 | ②b 계약 어김이 422 가 아니라 400 | 🟥 | — | PUT /api/classes/{id}/progress-plan — 반 계획 넣기·바꾸기 🔴 계약 어김(요일 빈 배열)은 422 — 아무것도 안 쓴다 (3) |
| 9 | ②c 반 계획을 찾을 때 학생 계획과 가르지 않는다 (학생 계획을 덮어쓴다) | 🟥 | — | PUT /api/classes/{id}/progress-plan — 반 계획 넣기·바꾸기 같은 반에 학생 계획이 있어도 반 계획은 따로 선다 — 학생 계획은… (3) |
| 10 | ②d 경합에서 unique 에 막힌 쪽이 덮어쓰지 않고 터진다 | 🟥 | — | PUT /api/classes/{id}/progress-plan — 반 계획 넣기·바꾸기 🔴 동시에 두 요청이 «없음»을 봤다 — unique 에 막힌 쪽은… (1) |
| 11 | ②e 고치기가 켜짐을 안 바꾼다 | 🟥 | — | PATCH /api/classes/{id}/progress-plan — 켜기·끄기 · 일부 고치기 active 만 끄면 나머지는 그대로 (1) |
| 12 | ②f 요일을 정리하지 않는다 (같은 규칙이 두 모양) | 🟥 | — | PUT /api/classes/{id}/progress-plan — 반 계획 넣기·바꾸기 요일은 겹침 없이 차례대로 저장한다 — 같은 규칙이 두 모양이 되지 않게 (1) |
| 13 | ②g 반 계획의 예정이 학생 개별 진도를 섞는다 | 🟥 | — | GET /api/classes/{id}/progress-plan — 계획 · 이번 주 예정 · 학생 계획들 반 계획의 예정은 **학생 개별 진도**를 안 본다 (1) |
| 14 | ②h 덮어쓰기인데 201 이다 | 🟥 | — | PUT /api/classes/{id}/progress-plan — 반 계획 넣기·바꾸기 🔴 둘째 PUT 은 **덮어쓴다** — 같은 id, 반 계획 행은 하나 (2) |
| 15 | ③a 학생 PUT 이 개별 진도를 안 묻는다 | 🟥 | — | /api/students/{id}/progress-plan — 🔴 개별 진도 학생만 반 계획을 덮는다 🔴 개별 진도가 아닌 학생에게는 422 — 아무것도 안… (1) |
| 16 | ③b 학생 PATCH 가 개별 진도를 안 묻는다 | 🟥 | — | /api/students/{id}/progress-plan — 🔴 개별 진도 학생만 반 계획을 덮는다 개별 진도를 끈 뒤에는 고칠 수 없고, 지울 수는 있다… (1) |
| 17 | ③c 학생 GET 의 «지금 덮나»가 개별 진도를 안 본다 | 🟥 | — | /api/students/{id}/progress-plan — 🔴 개별 진도 학생만 반 계획을 덮는다 GET — 개별 진도가 아니면 inEffect 거짓 ·… (1) |
| 18 | ④a 반 DELETE 가 그 반의 학생 계획까지 지운다 | 🟥 | — | DELETE /api/classes/{id}/progress-plan — 지우면 그 반은 자동에서 빠진다 반 계획만 지운다 — 같은 반 학생 계획은 남는다 … (1) |
| 19 | ④b 반 GET 의 학생 계획들에 반 계획이 섞인다 | 🟥 | — | GET /api/classes/{id}/progress-plan — 계획 · 이번 주 예정 · 학생 계획들 학생 계획들을 같이 준다 — 화면이 누가 반 계획… (1) |
| 20 | ⑤a 계획 칸만 틀려도 400 | 🟥 | — | POST /api/classes — 반을 만들 때 계획을 **같이** 받는다 🔴 계획이 계약을 어기면 422 — **반도 안 만들어진다** (1) |
| 21 | ⑤b 반 칸·계획 칸이 같이 틀려도 422 | 🟥 | — | POST /api/classes — 반을 만들 때 계획을 **같이** 받는다 반 칸이 틀리면 지금처럼 400 (계획이 같이 틀려도) (1) |
| 22 | ⑤c 계획을 받아 놓고 안 넣는다 | 🟥 | — | POST /api/classes — 반을 만들 때 계획을 **같이** 받는다 계획을 같이 주면 반과 반 계획이 함께 선다 — 응답은 지금 반 모양 그대로 (1) |
| 23 | ⑤d 반 만들 때 시작 차시를 안 본다 | 🟥 | — | POST /api/classes — 반을 만들 때 계획을 **같이** 받는다 🔴 계획의 시작 차시가 없으면 422 — 반도 안 만들어진다 (1) |
| 24 | ⑥a 예정이 그날 기록을 먹는다 (아침 기준이 아니다 — 밀림이 목록에서 사라진다) | 🟥 | "2026-09-16 u5 u3 -5" → "2026-09-16 u3 u3 -5" | GET /api/classes/{id}/progress-plan — 계획 · 이번 주 예정 · 학생 계획들 🔴 실제 진도가 들어오면 **그 지점부터** 다시… (3) |
| 25 | ⑥b 실제 진도로 다시 펴지 않는다 (계획만 본다) | 🟥 | "2026-09-18 u4  -5" → "2026-09-18 u6  -5" | GET /api/classes/{id}/progress-plan — 계획 · 이번 주 예정 · 학생 계획들 🔴 실제 진도가 들어오면 **그 지점부터** 다시… (3) |
| 26 | ⑥c 수업 없는 날도 줄을 세운다 | 🟥 | 6 → 14 | GET /api/classes/{id}/progress-plan — 계획 · 이번 주 예정 · 학생 계획들 예정은 이번 주 월요일 ~ 다음 주 일요일, 수업… (3) |
| 27 | ⑥d 보강날(기록만 있는 날)을 뺀다 | 🟥 | ["2026-09-14 u4  0","2026-09-16 u5  0","2026-09-18 u6  0","2026-09-… | [planSchedule] 🔴 실제가 이긴다 — 진도가 들어오면 그 지점부터 다시 편다 (D-129 ⑵) 수업 요일이 아닌 날(보강)에 기록돼도 그 날 줄이… (1) |
| 28 | ⑥e 주가 일요일부터 | 🟥 | {"from":"2026-09-14","to":"2026-09-27"} → {"from":"2026-09-13","to"… | GET /api/classes/{id}/progress-plan — 계획 · 이번 주 예정 · 학생 계획들 예정은 이번 주 월요일 ~ 다음 주 일요일, 수업… (3) |
| 29 | ⑥f 14일이 아니라 7일 치 | 🟥 | {"from":"2026-09-14","to":"2026-09-27"} → {"from":"2026-09-14","to"… | GET /api/classes/{id}/progress-plan — 계획 · 이번 주 예정 · 학생 계획들 예정은 이번 주 월요일 ~ 다음 주 일요일, 수업… (3) |
| 30 | ⑥g 밀림을 그날 기록 전 기준으로 잰다 (기록한 날 밀림이 0) | 🟥 | "2026-09-16 u5 u3 -5" → "2026-09-16 u5 u3 0" | GET /api/classes/{id}/progress-plan — 계획 · 이번 주 예정 · 학생 계획들 🔴 실제 진도가 들어오면 **그 지점부터** 다시… (3) |
| 31 | ⑥h 개별 진도 학생인데 반 기록을 본다 | 🟥 | "2026-09-18 u7  2" → "2026-09-18 u4  -5" | [planSchedule] 적용 이력 — 개별 진도 학생은 개별 이력 (`applicableProgress`) 개별 진도 학생이면 학생 기록에서 다시 편다 (1) |
| 32 | ⑥i 같은 날 같은 차시가 두 번 실린다 | 🟥 | "2026-09-16 u5 u5 0" → "2026-09-16 u5 u5+u5 0" | [planSchedule] 🔴 실제가 이긴다 — 진도가 들어오면 그 지점부터 다시 편다 (D-129 ⑵) 같은 날 여러 차시를 기록하면 기록 순서대로 싣고,… (1) |
| 33 | ⑥j 같은 날 기록을 기록 순서로 안 싣는다 | 🟥 | "2026-09-16 u5 u5+u6 2" → "2026-09-16 u5 u6+u5 2" | [planSchedule] 🔴 실제가 이긴다 — 진도가 들어오면 그 지점부터 다시 편다 (D-129 ⑵) 같은 날 여러 차시를 기록하면 기록 순서대로 싣고,… (1) |
| 34 | ⑦a 요일 빈 배열을 받는다 | 🟥 | false → true | PUT /api/classes/{id}/progress-plan — 반 계획 넣기·바꾸기 🔴 계약 어김(요일 빈 배열)은 422 — 아무것도 안 쓴다 (3) |
| 35 | ⑦b 요일 7 을 받는다 | 🟥 | false → true | PUT /api/classes/{id}/progress-plan — 반 계획 넣기·바꾸기 🔴 계약 어김(요일 7)은 422 — 아무것도 안 쓴다 (1) |
| 36 | ⑦c 차시 수 11 을 받는다 | 🟥 | false → true | PUT /api/classes/{id}/progress-plan — 반 계획 넣기·바꾸기 🔴 계약 어김(차시 수 11)은 422 — 아무것도 안 쓴다 (2) |
| 37 | ⑦d 한 수업당 차시 수 기본값이 1 이 아니다 | 🟥 | 1 → 2 | PUT /api/classes/{id}/progress-plan — 반 계획 넣기·바꾸기 처음 넣으면 201 · 반 계획(studentId null) · 차… (2) |
| 38 | ⑦e 빈 PATCH 를 받는다 | 🟥 | false → true | PATCH /api/classes/{id}/progress-plan — 켜기·끄기 · 일부 고치기 🔴 빈 본문 는 422 — 계획은 그대로 (1) |
| 39 | ⑦f 반 만들기 계약에 계획 칸이 없다 | 🟥 | true → false | POST /api/classes — 반을 만들 때 계획을 **같이** 받는다 계획을 같이 주면 반과 반 계획이 함께 선다 — 응답은 지금 반 모양 그대로 (3) |

⚠️ 「수」는 러너가 찍는 앞 3개까지다(그보다 많이 빨개졌을 수 있다).

### 관문

| 관문 | 결과 |
|---|---|
| `npx tsc --noEmit` | **0** (`prisma generate` 뒤) |
| 관련 vitest 12파일 | **217 통과** — 새 둘(`progressPlan` 52 · `planSchedule` 17) + `class` · `dailyReview` · `autoDraftCron` · `progress` · `progressPlan`(unit) · `planDailyReview` · `progressResolver` · `mockHandlers.contract` · `kstDate` · `noRmSync` |
| `npm run lint` | 🔴 **종료 1 — 오류 3개가 전부 `scripts/admin/bootstrap-admin.cjs`**(`require()` 금지). 이 트랙이 안 건드린 파일이고 `df1eb904` 부터 있던 것이다. 이 트랙이 고친·만든 `.ts` 13개만 eslint 로 돌리면 **오류·경고 0** |
| `npm run lint:affordance` | 통과(화면을 안 만들었다) |
| `npm run build` | **통과** — 새 경로 `ƒ /api/classes/[id]/progress-plan` · `ƒ /api/students/[id]/progress-plan`. PowerShell→`cmd /c`, DB 는 닿지 않는 `127.0.0.1:1`, `AUTH_SECRET` 은 빌드용 임시값 |

---

## ④ 리드가 정할 것

**A. 임시 소유 헬퍼를 옮기는 순서.** `planOwnership.ts` 의 판정(반 소유자 또는 관리자, 관리자 세션의 id 가 요청 계정과 같을 것)을
`admin-sees-all` 의 헬퍼로 바꾸고 파일을 지운다. 부르는 곳은 두 라우트의 `guard()` 한 줄씩이다. 헬퍼 모양이 «where 절을 내주는»
꼴이면 404/403 구분(지금 관례)을 어떻게 낼지 그쪽 결정을 따른다. 변이 ①a~①f 는 헬퍼를 옮긴 뒤 앵커만 고치면 그대로 쓸 수 있다.

**B. 관리자가 남의 반에 넣은 계획이 «오늘의 확인테스트»와 아침 초안에 안 보인다 — 지금은.** 계획 API 는 관리자에게 열었지만
`daily-review` 계획 갈래와 `runAutoDraft` 는 아직 `Class.userId = session.id` 로 좁힌다(브리프가 고치지 말라고 했다).
`admin-sees-all` 이 그 둘을 넓히기 전까지, 관리자 계정(`st2000423@`)이 역할 계정 반에 넣은 계획은 **그 반 소유 계정의 화면에만** 나온다.
두 트랙의 병합 순서를 정해 주십시오(이 트랙 먼저 들어가도 깨지는 것은 없다 — 보이는 곳이 좁을 뿐이다).

**C. 꺼진 학생 계획도 반 계획을 덮는다.** `pickProgressPlan`(②에서 만든 것, 안 고쳤다)은 `active` 를 안 본다 — 개별 진도 학생의 학생 계획을
**끄면** 반 계획으로 돌아가지 않고 **그 학생이 자동에서 빠진다.** «끄기 = 멈춤»이라 맞는 쪽으로 읽었지만, 화면에서 «학생 계획 끄기»를
«반 계획 따르기»로 읽을 수도 있다. Hi-fi 에서 문구를 정할 때 같이 정해 주십시오(바꾸려면 `pickProgressPlan` 한 곳).

**D. 반 만들기 응답에 계획을 실을까.** 지금은 안 싣는다(①④ 까닭). 반 만들기 화면이 «만들고 바로 이번 주 예정»을 보여야 하면
응답에 칸을 더하면서 `classApi.ts` 의 파싱도 같이 바꿔야 한다 — 화면 트랙 몫으로 남겼다.

**E. «저장하기 전에 결과를 본다»(시안 B).** 시안 B 는 요일을 누르면 오른쪽 목록이 **저장 전에** 바뀐다. 지금 API 는 **저장된** 계획만 편다.
길은 둘 — ⑴ `planSchedule.ts` 는 서버 의존이 없어 화면이 직접 부를 수 있다(단원 목록 · 진도 기록을 화면이 따로 받아야 한다)
⑵ 미리보기 경로(`POST …/progress-plan/preview`, 저장 안 함)를 더한다. Hi-fi 에서 B 가 뽑히면 정해 주십시오.

**F. 422 규약이 경로마다 다르다.** 계획 경로는 본문 어김을 422 로 내고(브리프 §3), 반·학생·진도 경로는 지금처럼 400 이다.
반 만들기는 한 요청 안에서 칸에 따라 400/422 가 갈린다. 화면이 상태 코드로 가르지 않고 `details` 를 그리면 문제는 없다 — 규약을 하나로 모을지 정해 주십시오.

**G. 학생이 반을 옮기는 길이 생기면.** 지금은 없다(`studentUpdateRequestSchema` 에 `classId` 가 없다). 생기면 학생 계획의 `classId` 가
옛 반에 남는다 — PUT(덮어쓰기)은 학생의 지금 반으로 맞추지만 PATCH 는 안 맞춘다. 아침 초안은 `studentId` 로 계획을 찾아 학생의 지금 반과
엮으므로 당장은 해가 없고, `daily-review` 의 «계획이 있는 반» 목록에 옛 반이 남는다.

---

## ⑤ 확인 못 한 것

- **실제 Postgres.** 로컬 DB 가 없다(Docker 없음). 부분 unique `progress_plan_class_only_key` · CHECK 셋 · FK Restrict · 경합 P2002 는
  **인메모리 가짜가 흉내 낸 것**으로만 봤다. 실DB 에서 `studentId: { not: null }` · `orderBy createdAt` · 인터랙티브 트랜잭션(Supabase
  풀러)도 못 돌렸다 — 인터랙티브 트랜잭션은 다른 라우트(`basket/test` 등)가 이미 쓰는 길이다.
- 🔴 **반+계획 트랜잭션의 원자성은 가짜가 못 가른다.** 가짜의 `$transaction` 은 실패하면 **표 전체**를 되돌려서, 라우트가 `tx` 대신 `db` 로
  써도 시험이 초록이다. 처음 초안에서 실제로 `db` 로 써 놓은 것을 **코드를 읽다 잡아** `tx` 로 고쳤다 — 시험이 잡은 것이 아니다.
  게다가 앞선 확인(계약 · 없는 차시)이 계획 넣기 실패를 거의 다 막아서 이 길은 경합·DB 장애 때만 밟힌다.
- **실제 세션의 관리자 판정.** `getAccountAccess` 는 시험에서 모킹했다. 라우트 핸들러에서 부르는 선례(`authorizeAccount` → 오늘의 개념 API)는 있다.
- **화면 · E2E** — 브리프대로 안 만들었다.
- **전체 vitest** — 관련 12파일만 돌렸다(이 기계는 다른 오르카 세션과 CPU·메모리를 나눈다).
- 성능 — GET 한 번이 **전체 단원 목록 + 그 반의 진도 이력 전부**를 읽는다. `daily-review` 가 이미 같은 양(전 학생 몫)을 읽는 길이라 따로 줄이지 않았다.
