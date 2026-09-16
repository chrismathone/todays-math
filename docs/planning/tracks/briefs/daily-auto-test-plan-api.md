# 브리프 — 진도 계획 쓰기·읽기 API (22번 ④의 뒷단)

SSOT: `docs/planning/22-daily-auto-test.md` · 결정 **D-129**(07) · 관리자 범위는 **D-130**.
**화면은 만들지 않는다** — Hi-fi 시안이 아직이다(D-07). 이 브리프는 **API 와 순수 함수까지**다.

## 1. 지금 있는 것 (2026-09-16 실측)

- 표 `progress_plan`(규칙 한 줄) · `auto_draft_run` — **공유 DB 에 적용 끝**(빈 표).
- 계약 `src/contracts/dailyAutoTest.contract.ts` — `progressPlanRuleSchema` · `progressPlanSchema` ·
  `lessonWeekdaySchema`(0=일 … 6=토) · `MAX_UNITS_PER_LESSON`.
- 규칙 순수 함수 `src/lib/daily/progressPlan.ts` — 날짜 펴기 · 실제가 이긴다 · 밀림/앞섬.
- 읽는 곳은 둘뿐 — `api/tests/daily-review`(계획 갈래) · `lib/tests/runAutoDraft.ts`(아침 8시).
- 🔴 **계획을 저장하는 API 가 없다.** 그래서 지금은 아무도 계획을 넣을 수 없다.

## 2. 만들 것

### ⑴ 계획 쓰기·읽기 라우트

- 반 계획: 반 하나에 한 줄(부분 unique `progress_plan_class_only_key` — `student_id IS NULL`).
- 학생 계획: **개별 진도 학생만**(`Student.useIndividualProgress`) 반 계획을 덮는다.
- 넣기·고치기·지우기(계획을 지우면 그 반은 자동에서 빠진다) · 켜기/끄기(`active`).
- 소유 판정은 **D-130 의 소유 범위 헬퍼**를 쓴다. ⚠️ 그 헬퍼는 다른 워크트리(`admin-sees-all`)가
  같은 시기에 만든다 — **없으면 네 라우트 안에 임시로 두고, 보고서에 «헬퍼가 오면 그리로 옮길 것»이라고 적어라.**
  같은 파일을 고치지 말고(충돌), 네 라우트 파일 안에서만 판단해라.
- 경로·모양은 네가 정하고 까닭을 보고서에 적어라(관례: `api/classes/[id]/...`).

### ⑵ 「이번 주 예정」을 주는 읽기

시안 B 가 계획 옆에 **날짜별 예정 차시**를 보여 준다(`wire-d129-daily-auto-test.html` B 탭).
그 목록을 **순수 함수**로 내고(이미 있는 날짜 펴기를 부른다) 라우트가 실어 준다 —
날짜 · 예정 차시(이름) · 실제로 나간 차시(있으면) · 밀림 일 수.
**며칠 치를 줄지**(이번 주? 다음 4회?)는 네가 정하고 보고서에 적어라.

### ⑶ 반을 만들 때 계획을 같이 받는 길

원장님 답: 「반 만들 때 같이, 이후에 따로 관리도 가능」. 반 만들기 API 가 계획을 **함께** 받게 한다
(계획 없이도 반은 만들어져야 한다 — 지금 쓰던 길이 막히면 안 된다).

## 3. 시험 (TDD — RED→GREEN)

- 계약 어김(요일 빈 배열 · 8 · 차시 수 0/11 · 없는 차시 id)은 **422**, 남의 반은 **404/403**(지금 관례대로).
- 개별 진도가 아닌 학생에게 학생 계획을 넣으면 거절한다.
- 반 계획 한 줄 규칙(같은 반에 둘째 계획을 넣으면 거절 또는 덮어쓰기 — 어느 쪽인지 정하고 시험으로 박아라).
- 「이번 주 예정」이 **실제 진도가 들어오면 그 지점부터 다시 편다**(D-129 ⑵)를 시험으로.
- 🔴 변이 하네스 `scripts/qa/mutate-plan-api.ts` — 가드마다 하나씩 꺼 빨개지는지.
  ⚠️ `rmSync` 금지(`noRmSync.test.ts`) — 임시 파일 + `unlinkSync`.
- 관문: `tsc --noEmit` 0 · 관련 시험 초록 · `npm run lint` · `npm run build`.

## 4. 하지 말 것

- **화면·시안 페이지(`/dev/**` 포함) 금지** — Hi-fi 확정 뒤 다른 트랙이 만든다.
- 공유 DB 에 쓰지 마라(표는 이미 있다 — 마이그레이션도 필요 없다).
- eywa 코드·env·cron 금지(D-129 ⑸ 보류).
- `api/tests/daily-review/route.ts` · `runAutoDraft.ts` 의 **소유 판정을 고치지 마라** — `admin-sees-all` 트랙 것이다.
  계획 읽기 모양을 바꿔야 하면 보고서에 적고 리드에게 알려라.

## 5. 보고

`docs/planning/tracks/reports/daily-auto-test-plan-api.md` 에: ① 만든 것(라우트·계약·순수 함수) ·
② 정한 것과 까닭(경로 모양 · 며칠 치 · 둘째 계획 규칙) · ③ 시험·변이 표 · ④ 리드가 정할 것 ·
⑤ 확인 못 한 것. 끝나면 리드에게 알리고 **푸시하지 마라.**

CLAUDE.md 절대 규칙을 따른다 — TDD(2) · 문구(5, D-08) · 어포던스(8, D-30).
커밋 계정은 `SUN <chrismathone@gmail.com>`.
