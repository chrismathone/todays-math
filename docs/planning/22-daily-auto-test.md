# 22. 매일 자동 출제 — 진도 계획으로 (2026-09-16)

> **이 트랙의 SSOT.** 결정은 **D-129**(07 Decision Log). 여기 적은 수치·경로는 2026-09-16 에
> 두 저장소를 직접 읽어 확인한 것이다. 확인하지 않은 것은 「확인 안 함」이라고 적었다.

## 0. 결정 (D-129 요약)

원장님(2026-09-16): *「eywa_refactoring 에 보면 수학 강사 시트에 진도 시계가 있거든?
그걸 활용해서 학생 등록시 진도를 정해놓고 매일 테스트 자동화 시스템 구축 가능할까」*

| 항목 | 확정 | 비고 |
|---|---|---|
| 계획을 어디서 | **오늘의수학 안에서 정한다** | eywa 에 창구를 새로 뚫지 않는다. 손으로 등록한 학생·고등도 대상이 될 수 있다 |
| 계획 vs 실제 | **실제 진도가 이긴다** | 계획으로 오늘 시험을 내되, 수업보고서가 오면 그것이 정본. 다음 시험 범위는 실제에 맞춘다 |
| 자동의 끝 | **초안까지** | 새벽에 학생별 초안을 만들어 둔다. 확정·인쇄는 원장님 손 (잘못 나간 시험지가 학생에게 그대로 가지 않게) |

**왜 이 값어치가 있나 — 「기다리지 않는 것」.** 지금은 **수업보고서가 들어와야** 시험이 나간다.
그런데 보고서의 **85.6% 가 수업 이틀 뒤 이후에 쓰인다**(`prisma/schema.prisma:541-545`).
계획을 미리 두면 보고서를 기다리지 않고 그날 아침에 시험지가 서 있다.

## 1. 이미 있는 것 (실측 2026-09-16)

### 1.1 오늘의수학 — 「계획까지 자동, 출제는 단추」

- **동기화 cron 하나**: `vercel.json:11-16` → `/api/eywa-sync/cron`, `30 22 * * *` UTC = **KST 07:30**,
  `CRON_SECRET` 문지기(`src/app/api/eywa-sync/cron/route.ts:18-28`). 사람 버튼과 같은 실행부.
- **오늘의 확인테스트**: `GET /api/tests/daily-review` 가 eywa 연계 학생(`eywaStudentId != null`)의
  진도·직전 시험·오늘 만든 시험을 읽어 갈래 셋으로 나눈다(`src/lib/daily/planDailyReview.ts:4-10`) —
  **groups**(범위가 나온 묶음) · **examOrUnread**(보고서는 있는데 진도 행이 없음 — 시험기간·미분류, **D-64 로 자동 제외**) ·
  **noRange**(진도는 있는데 범위를 못 냄).
- 「오늘 수업한 학생」 판정은 진도 행이 아니라 **`eywaLastReportDate == 오늘(KST)`**(`planDailyReview.ts:113`).
- 범위 규칙은 제품 함수 그대로: `getCurrentProgress` → `resolveDefaultReviewRange`(끝 = 현재 진도,
  시작 = 직전 확인테스트 다음, 첫 회면 대단원 안으로 — D-63, `src/lib/generator/defaultReviewRange.ts:1-12,33-46`).
- 문항 수 판정: `poolTotal >= neededCount` 면 `auto`, 아니면 `lacking`. `neededCount` 는 묶음 학생이 속한
  **반의 `defaultProblemCount` 최댓값**(`planDailyReview.ts:180`, 칸은 `schema.prisma:247`, 기본 8).
- **사람이 누르는 곳 평시 4곳**: 「지금 가져오기」 · 「모두 출제」 · 시험지별 확정 · 인쇄
  (`src/components/main/DailyReviewSection.tsx:466-473, 294-303`, `api/tests/[id]/confirm`·`print`).

### 1.2 eywa — 「진도 시계」는 아직 시안이다

- **수학 강사 시트(MCS)** 는 eywa 앱 화면이다(구글 시트가 아니다) — `src/app/(shell)/mcs/page.tsx:18`,
  반 월간 진도표는 `mcs/[classId]/month/page.tsx`(축: 학생 × 수업일).
- 🔴 **진도 시계 = `/mcs/progress-map` 「수학 학습 진도맵(시안)」 — 샘플 데이터다**
  (`mcs/progress-map/page.tsx:21` `buildSampleProgress()`; 주석: *「데이터는 아직 샘플 … 실데이터 어댑터는 후속」*).
  단위가 **쪽(page)** 인데 **실제 DB 에 쪽수가 없다**. 학생별 장기 로드맵(`RoadmapStep`)도 **DB 표가 없다**(하드코딩).
- 실제로 DB 에 있는 둘:
  - **계획** `math_month_goals`(`supabase/migrations/0237a_math_month_goals.sql:32`) —
    `tenant_id · class_id · student_id · period_start(그 달 1일) · textbook · target_progress` .
    **월 단위**이고 교재·목표진도는 **자유 문구**다. 강사 시트의 칸에서 서버 액션으로 upsert
    (`features/math-sheets/server/actions.ts:76`). **지금 행이 쌓이는지는 확인 안 함.**
  - **실제** `lesson_reports.progress` — 강사가 수업 뒤 적는 「수학 <차시>」 문구
    (`features/onescreen/server/actions.ts:104`). 오늘의수학이 이미 매일 가져와 파싱한다.
- 시트 화면은 계획(`goalEndOf`)과 실제(`dayPositionOf`)를 **차시 → 글로벌 위치 정수**로 접어 같은 축에 놓는다
  (`features/math-sheets/server/month-queries.ts:244,428,433,439,445`).
  그 위치 체계(`features/progress/curriculum-position.ts`)는 **초·중만**이다(고등 제외).
- **내보내는 길은 둘뿐** — `GET /api/integrations/todays-math/roster` · `…/progress?cursor=`
  (`Authorization: Bearer $TODAYS_MATH_API_KEY`). 🔴 **`math_month_goals`(목표)를 내보내는 길은 없다.**
- **DB 가 다르다** — eywa Supabase ref `ylqviwxedsdikuslmwxf`, 오늘의수학 ref `jyaguxwuaxgdnovtulna`.
  같은 프로젝트가 아니므로 **직접 읽기는 불가**. (⚠️ 아래 §6)

### 1.3 없는 것 (이 트랙이 만들 것)

1. **계획 진도를 담을 칸** — `Progress` 는 지나간 기록만이다(append-only, `schema.prisma:531-556`).
   스키마 전체에 `planned`/`scheduled`/`targetUnit` 류가 0건.
2. **수업 요일** — `Class` 에 요일·시간표 칸이 없다(위 모델 전문 확인). 계획을 날짜로 펴려면 필요하다.
3. **서버 혼자 출제하는 길** — `POST /api/tests/generate` 는 `getSessionUser()` 를 요구한다
   (`src/app/api/tests/generate/route.ts:17-18`). cron 이 부를 경로가 없다.
4. **출제를 도는 자동 장치** — cron 은 동기화 하나뿐이다.

## 2. 범위

**한다:** 반·학생의 **진도 계획**(날짜 → 예정 차시) · 계획에서 오늘 범위를 뽑는 규칙 ·
새벽 **초안 자동 생성** · 실제 진도가 들어오면 계획을 맞추는 규칙 · 그 결과를 보는 화면 한 줄.

**안 한다(이번):** 확정·인쇄 자동화 · eywa 목표(`math_month_goals`) 가져오기 · 진도 시계 화면 이식 ·
학생에게 시험지 보내기.

## 3. 설계 초안 (리드)

- **계획 표** — 반 계획(요일·한 수업당 차시 수·시작 차시)에서 **날짜별 예정 차시**를 펴고,
  개별 진도 학생(`Student.useIndividualProgress`)은 학생 계획이 반 계획을 덮는다.
- **실제가 이긴다** — 수업보고서로 `Progress` 행이 들어오면 그 차시가 정본. 계획이 뒤처지거나 앞서면
  **남은 계획을 그 지점부터 다시 편다**(계획을 지우지 않고 「밀림/앞섬」으로 남긴다 — 나중에 시계 화면의 재료).
- **초안 생성** — 동기화(07:30) **뒤** 도는 cron 하나. 서버 전용 경로(`CRON_SECRET`)로
  기존 `generateDraftTest` 를 부른다. 범위 규칙(D-63)·문항 수·난이도 배분은 **지금 것을 그대로 쓴다**.
- **예외 갈래는 그대로** — 문항 부족(`lacking`) · 시험기간·미분류(D-64)는 자동에서 빼고 화면에 표시만.
- **중복 금지** — 같은 날 같은 학생에게 이미 시험(초안 포함)이 있으면 만들지 않는다(지금 규칙과 같다).

## 4. 단계

| # | 무엇 | 상태 |
|---|---|---|
| ① | 이 문서 · D-129 | 2026-09-16 |
| ② | 계획 표 스키마 + 날짜 펴기 규칙(순수 함수) + 시험 | 대기 — 열린 질문 1·2 |
| ③ | 서버 전용 출제 경로 + 새벽 cron | 대기 |
| ④ | 반 설정·학생 등록 화면의 계획 칸 | **D-07 시안 먼저** |
| ⑤ | 실제 들어오면 계획 다시 펴기 · 밀림 표시 | 대기 |

## 5. 원장님께 여쭐 것 (열린 질문)

1. **수업 요일을 어디서 아나** — 반 설정에 요일을 두고 고르실지, 지난 보고서에서 자동 추정할지.
2. **휴일·보강** — 공휴일·휴원일에 계획을 미룰지, 그날 시험을 건너뛸지. 보강 수업은 어떻게.
3. **대상** — 지금 자동은 eywa 연계 학생(허용 반 6개)뿐이다. 손으로 등록한 학생·고등도 넣을지.
4. **생성 시각** — 동기화(07:30) 뒤 몇 시에 만들지(예: 08:00).
5. **화면**(D-07) — 계획 칸을 반 설정에 둘지 학생 등록에 둘지, 밀림을 어디에 보일지. 시안 필요.

## 6. 주의 (운영)

🔴 `D:\todays-math\.env` 에 **`EYWA_TRANSPORT=db` · `EYWA_DATABASE_URL`(eywa DB) · `EYWA_TENANT_ID` 가 아직 살아 있다.**
연계 계획서는 「env 를 지우고 api 로 고정」이라고 적어 두었다(`tracks/plan-eywa-link.md:197-198`).
로컬 기준이고 **Vercel 운영 env 는 확인 안 함** — 확인해 맞출 것.
