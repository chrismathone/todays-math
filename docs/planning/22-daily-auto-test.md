# 22. 매일 자동 출제 — 진도 계획으로 (2026-09-16)

> **이 트랙의 SSOT.** 결정은 **D-129**(07 Decision Log). 여기 적은 수치·경로는 2026-09-16 에
> 두 저장소를 직접 읽어 확인한 것이다. 확인하지 않은 것은 「확인 안 함」이라고 적었다.

## 0. 결정 (D-129 요약)

원장님(2026-09-16): *「eywa_refactoring 에 보면 수학 강사 시트에 진도 시계가 있거든?
그걸 활용해서 학생 등록시 진도를 정해놓고 매일 테스트 자동화 시스템 구축 가능할까」*
· *「eywa 진도 동기화는 당장에는 하지 말자. 완전 구축 되고 나면 시도해보자」*

| 항목 | 확정 | 비고 |
|---|---|---|
| 계획을 어디서 | **오늘의수학 안에서 정한다** | eywa 에 창구를 새로 뚫지 않는다 |
| 계획 vs 실제 | **실제 진도가 이긴다** | 계획으로 그날 시험을 내되, 진도가 기록되면 그것이 정본 |
| 자동의 끝 | **초안까지** | 새벽에 학생별 초안을 세워 둔다. 확정·인쇄는 원장님 손 |
| 🔴 eywa 연계 | **이번엔 안 쓴다 — 보류** | *「완전 구축 되고 나면 시도해보자」*. 그래서 **«실제»의 출처는 원장님이 화면에서 기록하는 진도**(`/api/progress` · 「다음 소단원」)다 |
| 수업 요일 | **반 설정에서 고른다** | 지금 `Class` 에 요일 칸이 없다 — 새로 둔다. 추정하지 않는다 |
| 휴일 | **지금은 요일만 본다** | 달력을 두지 않는다. 휴일에도 초안이 서지만 안 쓰면 그만(확정·인쇄가 사람 손이라 학생에게 가지 않는다) |
| 대상 | **손 등록 학생 · 고등까지** | 계획이 우리 안에 있으니 eywa 연계 밖 학생도 된다. 고등은 eywa 차시 체계에 없어 이 길로만 가능 |
| 생성 시각 | **아침 8시(KST)** | 원장님 답. eywa 동기화(07:30)와 겹치지 않는 자리이기도 하다 |

**왜 값어치가 있나 — 「기다리지 않는 것」.** 지금 자동 출제는 **그날 진도가 기록돼야** 범위가 선다.
진도 기록이 늦으면 그날 시험은 못 낸다(참고: eywa 수업보고서는 **85.6% 가 수업 이틀 뒤 이후**에
쓰인다 — `prisma/schema.prisma:541-545`). 계획을 미리 두면 **아침에 시험지가 이미 서 있다.**

## 1. 이미 있는 것 (실측 2026-09-16)

### 1.1 오늘의수학 — 「계획까지 자동, 출제는 단추」

- **오늘의 확인테스트**: `GET /api/tests/daily-review` 가 진도·직전 시험·오늘 만든 시험을 읽어 갈래 셋으로
  나눈다(`src/lib/daily/planDailyReview.ts:4-10`) — **groups**(범위가 나온 묶음) ·
  **examOrUnread**(보고서는 있는데 진도 행이 없음 — **D-64 로 자동 제외**) · **noRange**(범위를 못 냄).
  🔴 지금은 **eywa 연계 학생(`eywaStudentId != null`)만** 읽는다(`route.ts:61`) — 이 트랙이 넓힌다.
- 범위 규칙은 제품 함수 그대로: `getCurrentProgress` → `resolveDefaultReviewRange`(끝 = 현재 진도,
  시작 = 직전 확인테스트 다음, 첫 회면 대단원 안으로 — D-63, `src/lib/generator/defaultReviewRange.ts:1-12,33-46`).
- 문항 수: `poolTotal >= neededCount` 면 `auto`, 아니면 `lacking`. `neededCount` 는 묶음 학생이 속한
  **반의 `defaultProblemCount` 최댓값**(`planDailyReview.ts:180`, 칸은 `schema.prisma:247`, 기본 8).
- **사람이 누르는 곳 평시 4곳**: 「지금 가져오기」 · 「모두 출제」 · 시험지별 확정 · 인쇄
  (`src/components/main/DailyReviewSection.tsx:466-473, 294-303`, `api/tests/[id]/confirm`·`print`).
- 진도는 **지나간 기록만**이다 — `Progress`(append-only, `schema.prisma:531-556`), 「현재 진도」는 최신 1건
  (`src/lib/progressResolver.ts:36-46`), 「다음 소단원」은 `orderIndex+1` 로 **새 행을 쓰는 것**(예약이 아니다).

### 1.2 eywa — 이번엔 안 쓴다 (조사 기록으로만 남긴다)

- **수학 강사 시트(MCS)** 는 eywa 앱 화면이다(구글 시트가 아니다) — `src/app/(shell)/mcs/page.tsx:18`.
- 🔴 **「진도 시계」 = `/mcs/progress-map` 「수학 학습 진도맵(시안)」 — 샘플 데이터다**
  (`mcs/progress-map/page.tsx:21` `buildSampleProgress()`). 단위가 **쪽(page)** 인데 **실제 DB 에 쪽수가 없다.**
  학생별 장기 로드맵(`RoadmapStep`)도 **DB 표가 없다**(하드코딩).
- 실제 DB 에 있는 둘: **계획** `math_month_goals`(`supabase/migrations/0237a_math_month_goals.sql:32` —
  `tenant_id · class_id · student_id · period_start(그 달 1일) · textbook · target_progress`, **월 단위 · 자유 문구**,
  강사 시트에서 서버 액션 upsert `features/math-sheets/server/actions.ts:76`, **행이 쌓이는지는 확인 안 함**) ·
  **실제** `lesson_reports.progress`(강사가 수업 뒤 적는 「수학 <차시>」).
- **내보내는 길은 둘뿐** — `GET /api/integrations/todays-math/roster` · `…/progress?cursor=`.
  🔴 **`math_month_goals`(목표)를 내보내는 길은 없다.** DB 도 서로 다른 Supabase 프로젝트라 직접 읽기 불가.
- → **완전 구축 뒤에 다시 본다.** 그때 필요한 것: eywa 쪽 목표 내보내기 창구 하나 + 월 목표(자유 문구)를
  날짜별 차시로 펴는 규칙.

### 1.3 없는 것 (이 트랙이 만들 것)

1. **계획 진도를 담을 칸** — 스키마 전체에 `planned`/`scheduled`/`targetUnit` 류가 0건.
2. **수업 요일** — `Class` 에 요일·시간표 칸이 없다.
3. **서버 혼자 출제하는 길** — `POST /api/tests/generate` 는 `getSessionUser()` 를 요구한다
   (`src/app/api/tests/generate/route.ts:17-18`). cron 이 부를 경로가 없다.
4. **출제를 도는 자동 장치** — cron 은 eywa 동기화 하나뿐(`vercel.json:11-16`), 그나마 이번엔 안 쓴다.

## 2. 범위

**한다:** 반·학생의 **진도 계획**(요일 · 한 수업당 차시 수 · 시작 차시 → 날짜별 예정 차시) ·
계획에서 오늘 범위를 뽑는 규칙 · **아침 8시 초안 자동 생성** · 진도가 기록되면 계획을 다시 펴는 규칙 ·
그 결과를 보는 화면.

**안 한다(이번):** 확정·인쇄 자동화 · **eywa 진도 동기화 연계**(보류) · eywa 월 목표 가져오기 ·
진도 시계 화면 이식 · 휴일 달력 · 학생에게 시험지 보내기.

## 3. 설계 초안 (리드)

- **계획 표** — 반 계획(요일 · 한 수업당 차시 수 · 시작 차시)에서 **날짜별 예정 차시**를 편다.
  개별 진도 학생(`Student.useIndividualProgress`)은 학생 계획이 반 계획을 덮는다.
- **실제가 이긴다** — 원장님이 진도를 기록하면(`/api/progress` · 「다음 소단원」) 그 차시가 정본이고,
  **남은 계획을 그 지점부터 다시 편다**(계획을 지우지 않고 「밀림/앞섬」으로 남긴다).
- **초안 생성** — 아침 8시 cron 하나. 서버 전용 경로(`CRON_SECRET`)로 기존 `generateDraftTest` 를 부른다.
  범위(D-63)·문항 수·난이도 배분은 **지금 것을 그대로** 쓴다.
- **예외 갈래는 그대로** — 문항 부족(`lacking`)·시험기간·미분류(D-64)는 자동에서 빼고 화면에 표시만.
- **중복 금지** — 같은 날 같은 학생에게 이미 시험(초안 포함)이 있으면 만들지 않는다(지금 규칙과 같다).

## 4. 단계

| # | 무엇 | 상태 |
|---|---|---|
| ① | 이 문서 · D-129 | 2026-09-16 완료 |
| ② | 계획 표 스키마 + 날짜 펴기 규칙(순수 함수) + 시험 | **2026-09-16 완료** — 워크트리 `daily-auto-test`, 보고서 `tracks/reports/daily-auto-test-backend.md`. 계획은 **규칙 한 줄**(`ProgressPlan`: 요일 · 한 수업당 차시 수 · 시작 차시 · 시작일 · 켜짐)이고 날짜별 행을 쌓지 않는다. 규칙은 순수 함수 `src/lib/daily/progressPlan.ts` 한 곳 |
| ③ | 서버 전용 출제 경로 + 아침 8시 cron + 중복 금지 | **2026-09-16 완료** — `GET /api/tests/auto-draft/cron`(`CRON_SECRET`) · `vercel.json` `0 23 * * *`(=KST 08:00) · 회차 기록 `AutoDraftRun` · 확정·인쇄는 부르지 않는다 |
| ④ | 반 설정의 요일·계획 칸, 학생별 덮어쓰기, 밀림 표시 | **D-07 시안 먼저** — 화면 두 줄(`DailyReviewSection.tsx` 의 eywa 소유자 문지기 · 「오늘 수업 보고서가 아직 없습니다」 문구)도 여기서 함께 정한다 |
| ⑤ | 자동 대상 넓히기 — 손 등록 학생·고등(지금은 eywa 연계 학생만) | **2026-09-16 완료** — `daily-review` 가 **계획 ∪ 보고서** 합집합으로 읽는다. 계획 갈래는 반 소유(`Class.userId`)로 좁히고, eywa 갈래는 지금처럼 소유자만 |
| ⑥ | (완전 구축 뒤) eywa 연계 — 진도 동기화·월 목표 가져오기 | 보류 |

**②③⑤ 병합 검수(리드, main)**: tsc 0 · 관련 42파일 중 37파일 577건 통과(빨간 4파일은 이 트랙 밖 —
2026-09-14 작업실·계정 전환 뒤 낡은 시험) · `build` 통과(새 경로 `/api/tests/auto-draft/cron`) ·
변이 하네스 `scripts/qa/mutate-daily-plan.ts` **앵커 34개 전부 하나씩** · 고른 10개 main 재확인.

**🔴 배포 순서** — `daily-review` 가 이제 `progress_plan` 을 읽는다. **표 없이 배포되면 원장님 메인의
「오늘의 확인테스트」가 500 이다.** 순서: 공유 DB 마이그레이션 적용(원장님 확인) → 푸시·배포 →
`AUTO_DRAFT_OWNER_EMAIL` 을 Vercel env 에(없으면 cron 이 503 — 일부러 그렇게 만들었다).

**④ 뒷단 — 계획 쓰기·읽기 API 병합(2026-09-16, 워크트리 `plan-api`, 보고서 `tracks/reports/daily-auto-test-plan-api.md`)** —
`PUT/GET/DELETE /api/classes/[id]/progress-plan` · `/api/students/[id]/progress-plan`(한 줄 덮어쓰기) · 이번 주 예정 **14일**
(이번 주 월요일~다음 주 일요일, 수업일과 진도 기록이 있는 날만) · `POST /api/classes` 가 계획을 같은 트랜잭션으로 받는다.
리드 검수(main): tsc 0 · 관련 40파일 666건 통과(빨간 4파일은 트랙 밖) · `build` 통과(새 경로 둘) · 변이 앵커 전수 + 묶음마다 하나 재확인.
**리드 결정(보고서 ④)**: **A** 임시 소유 헬퍼(`src/lib/daily/planOwnership.ts`)는 `admin-sees-all` 병합 때 그 헬퍼로 옮기고 지운다 ·
**B** 병합 순서는 plan-api → admin-sees-all(관리자가 남의 반에 넣은 계획이 메인·아침 초안에 보이는 것은 뒤의 병합부터) ·
**C** 학생 계획 «끄기»는 **멈춤**(반 계획으로 돌아가지 않는다) — 학생 계획 화면을 만들 때 문구를 원장님께 여쭌다 ·
**D** 반 만들기 응답에 계획을 싣는 것은 화면 트랙이 필요하면 더한다 · **E** 「저장하기 전에 결과를 본다」(B안)는
**미리보기 경로**(저장 안 함)로 한다 — 날짜 펴기 규칙을 서버 한 곳에 두고, 화면이 735차시 목록·진도 기록을 따로 받지 않게 ·
**F** 400/422 규약은 이번에 모으지 않는다 — 화면은 상태 코드로 가르지 말고 서버가 준 문구·`details` 를 그린다 ·
**G** 학생이 반을 옮기는 길이 생기면 학생 계획 `classId` 를 같이 맞춘다(지금은 그 길이 없다 — 기록만).

**D-130 관리자 범위 병합(2026-09-16, 워크트리 `admin-sees-all`, 보고서 `tracks/reports/admin-sees-all.md`)** —
판정은 `src/lib/ownerScope.ts` 한 곳(`crossesOwnerFence` = 세션 `isAdmin === true`), `ownership.ts` 404/403 헬퍼가 **뷰어**를 받는다.
넓힌 자리: 반·학생·진도·진도 계획·시험지(목록/단건/확정/인쇄/교체/채점/결과)·기본 범위·「오늘의 확인테스트」 계획 갈래·주간 지표·
작업실 개요·인쇄 지면·오늘의 개념 판·아침 자동 초안. 남의 반에 낸 시험지의 `Test.userId` 와 D-20 열쇠는 **반 소유자**다.
리드 검수(main): 충돌 1(`api/classes/route.ts` 머리말만) · tsc 0 · 관련 51파일 898건 통과 · `build` 통과 ·
**리드 결정 A 이행** — 계획 라우트 둘이 `requireOwnedClass/Student(session)` 을 부르고 `planOwnership.ts` 는 지웠다
(`mutate-plan-api` ① 을 «라우트가 세션을 그대로 넘기나» 두 방향 넷으로 — 앵커 37) · 병합으로 어긋난 `mutate-concept-admin` 앵커 둘을 옮겼다 ·
커밋한 상태에서 변이 재확인 **9/9 빨개짐**(plan-api ①a~d · concept-admin ①-표시·② · admin-scope ⑦a·c·d), 원본 일치.
**리드 결정(보고서 ④)**: **H** 장바구니→시험지는 그대로(개인 작업물, D-130 ⑶ — 관리자 반 목록에서 남의 반을 고르면 403 이 난다는 것을 알고 둔다) ·
**I** 반·학생 **지우기**도 넘는 채로 둔다(«읽고 고친다» — 관리자는 원장님 자신의 계정) · **J** 주간 지표는 전체로 센다(역할 계정도 원장님이 쓰는 것) ·
**K** 예측 문제지 배점 조정은 회차 계열 그대로(403) · **L** 오늘의 개념 판 넓힘(읽기) 유지 ·
✅ **M 학생 로그인 계정 발급도 관리자에게 연다** — 원장님 2026-09-16 *「원장이 학생 계정 발급 가능하도록 할것. 발급도 관리자에게 열고」*. D-124 규칙 1 을 «발급하는 원장의 **소유 범위**»로 읽는다(`issueStudentAccount.ts` 가 `withinOwnerScope` 를 묻는다 · 짝 시험 `studentAccountIssue` D-130 셋 · 변이 `mutate-student-auth` ⑤b) ·
**N «누구의 반» 표시**(관리자 반 목록에 역할 계정의 같은 이름 반이 섞인다)는 모양 문제라 D-07 — 원장님 *「시안 4~5개」* → Wire 5안 `docs/design/mockups/wire-d130-class-owner.html`(artifact 3TFCKjeoAsPCDJ7C41Q6uo — 실제 반 7개, A 이름 뒤 계정 이름 · B 계정별 묶기 · C «담당» 열 · D 계정 거르개 · E 겹칠 때만) — 선택 대기.

**리드 결정(2026-09-16)** — 보고서 ④ 의 D·E·G: **⑴ 중복 금지는 지금 범위 그대로**(`testType: "review"` 만 —
화면 규칙과 같은 자리를 쓴다. 넓히면 일일테스트와의 관계를 따로 정해야 한다) · **⑵ 교육과정 끝에 닿은 학생도
그대로 둔다**(`atCurriculumEnd` 로 표시만 — 735차시를 다 나간 학생이 나오면 그때 정한다) ·
**⑶ 요일은 `0=일 … 6=토`(JS 셈) 로 저장하고, 「월요일 먼저」는 화면이 옮겨 그린다**(계약·CHECK 에 박혀 있다).

## 5. 원장님께 받은 답 · 남은 것

- ✅ 수업 요일 = **반 설정에서 고른다** · 휴일 = **지금은 요일만** · 대상 = **손 등록·고등까지** ·
  생성 시각 = **아침 8시** · eywa = **보류**(2026-09-16).
- ✅ **화면 Wire 답(2026-09-16)** — 시안 `docs/design/mockups/wire-d129-daily-auto-test.html`:
  **B안**(수업 계획 카드 + 이번 주 예정) · 메인 «오늘의 확인테스트»는 **계획이 있으면 누구에게나** ·
  수업 없는 날 문구 **「오늘 수업 계획이 없습니다.」** · 밀림은 **「3일 밀림」** ·
  계획은 **반 만들 때 같이 + 이후 반 관리에서 따로도** · 자동 초안은 **메인과 시험지 목록 둘 다**에서 본다.
- ✅ **Hi-fi 답(2026-09-16, D-131)** — **2 계기판 관** · 표지 **«자동 출제»** · 메인 첫 줄 **짧게**(「오늘 초안 N장」) ·
  반 만들기의 계획 칸은 **접어 두고 연다**. 확정 기록 05 §8.10.
- ⏳ **화면 트랙** — 브리프 `tracks/briefs/daily-auto-test-screen.md`. `plan-api` · `admin-sees-all` 병합 **뒤에** 띄운다
  (화면이 그 두 트랙의 라우트와 소유 범위 위에 선다).
- 🔄 **돌고 있는 워크트리(2026-09-16)** — `admin-sees-all`(D-130 관리자 범위) · `plan-api`(계획 쓰기·읽기 API).
- ✅ **한 수업당 한 차시**(2026-09-16 원장님) — 계획의 기본값 1, 반마다 바꿀 수 있다(상한 10은 오타 울타리).
- ✅ **공유 DB 에 표 둘 적용 끝**(2026-09-16 원장님 확인, `scripts/qa/apply-progress-plan-migration.ts`) —
  드라이런 뒤 적용. `progress_plan` · `auto_draft_run` **빈 표 둘** · CHECK 5/5 · RLS 켬 ·
  부분 unique(`progress_plan_class_only_key`) · **기존 반 7행 · 학생 23행 무변경** · `migrate status` up to date.
- ⏳ **`AUTO_DRAFT_OWNER_EMAIL` 을 Vercel env 에** — 원장님 콘솔 작업이다. 없으면 cron 이 매일 503 을 낸다
  (일부러 그렇게 만들었다 — 조용한 0건보다 낫다). 넣기 전에는 초안이 서지 않는다.

## 6. 주의 (운영)

🔴 `D:\todays-math\.env` 에 **`EYWA_TRANSPORT=db` · `EYWA_DATABASE_URL`(eywa DB) · `EYWA_TENANT_ID` 가 아직 살아 있다.**
연계 계획서는 「env 를 지우고 api 로 고정」이라고 적어 두었다(`tracks/plan-eywa-link.md:197-198`).
로컬 기준이고 **Vercel 운영 env 는 확인 안 함**. eywa 연계를 보류한 동안에는 **동기화를 켜지 않는다.**
