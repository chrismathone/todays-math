# 보고 — 매일 자동 출제 뒷단 (22번 ②③⑤ · D-129)

브리프: `docs/planning/tracks/briefs/daily-auto-test-backend.md`
SSOT: `docs/planning/22-daily-auto-test.md` · 결정 **D-129**(07 Decision Log)
워크트리: `chrismathone/daily-auto-test` · 2026-09-16 · **푸시하지 않았다.**

> 🔴 **병합 순서가 있다 — 마이그레이션을 먼저 적용해야 한다.**
> `GET /api/tests/daily-review` 가 이제 `progress_plan` 을 읽는다. 공유 DB 에 표가 없는 상태로
> 배포되면 **원장님 메인 화면의 「오늘의 확인테스트」가 500 으로 죽는다.**
> 순서: ① 원장님께 여쭙기 → ② `apply-progress-plan-migration.ts` 드라이런 → ③ `--apply`
> → ④ main 병합 → ⑤ `AUTO_DRAFT_OWNER_EMAIL` 을 Vercel env 에 넣기.
> (④ 앞에 ③ 이 없으면 배포가 곧 장애다. 이 저장소의 관례대로 적용은 **리드가 main 에서** 한다.)

---

## ① 무엇을 만들었나

### 계약 (SSOT)

| 파일 | 무엇 |
|---|---|
| `src/contracts/dailyAutoTest.contract.ts` (새로) | `progressPlanRuleSchema`(요일·한 수업당 차시 수·시작 차시·시작일·켜짐) · `progressPlanSchema` · `autoDraftSkipReasonSchema`(5갈래) · `autoDraftSummarySchema` · `autoDraftRunResponseSchema` |
| `src/contracts/test.contract.ts` (고침) | `attended` 의 뜻만 주석으로 넓혔다 — 「오늘 보고서가 있는 학생」 → 「오늘 **대상이 된** 학생」. **모양은 안 바꿨다**(화면이 그대로 돈다) |

### 스키마·마이그레이션 (파일만 — 공유 DB 에 적용하지 않았다)

| 파일 | 무엇 |
|---|---|
| `prisma/schema.prisma` | `ProgressPlan` · `AutoDraftRun` 두 모델 + `Class`·`Student`·`Unit` 의 관계 칸 |
| `prisma/migrations/20260916120000_progress_plan_and_auto_draft/migration.sql` | `prisma migrate diff`(DB 없이 스키마끼리) 산출 + 「손으로 더한 것」 절 — 부분 unique 1 · CHECK 5 · RLS 2 |
| `scripts/qa/apply-progress-plan-migration.ts` | 드라이런/적용/되돌리기. `apply-student-account-migration.ts` 를 본떴다 |

### 규칙 (순수 함수)

| 파일 | 무엇 |
|---|---|
| `src/lib/daily/progressPlan.ts` (새로) | `resolveDailyPlan` — 그 날짜에 나갈 차시 · 실제가 이긴다 · 밀림/앞섬(일) · 교육과정 끝 · `pickProgressPlan` — 학생 계획이 반 계획을 덮는 조건 |
| `src/lib/daily/planDailyReview.ts` (고침) | 대상 축이 **둘**이 됐다(계획 ∪ 보고서). 적용 이력·계획을 같은 규칙으로 고른다. 계획의 **시작 차시를 진도 이력에 넣어** D-63 이 새 학생에게도 걸리게 했다 |
| `src/lib/progressResolver.ts` (고침) | `applicableProgress` 를 뽑아냈다 — 「어느 이력이 적용되나」의 판정이 **한 곳**이 되게. `getCurrentProgress` 는 그 위에 얹었다(동작 그대로) |

### 자동 회차 (③)

| 파일 | 무엇 |
|---|---|
| `src/lib/tests/autoDraftOwner.ts` (새로) | `AUTO_DRAFT_OWNER_EMAIL` → 원장 계정. 못 찾으면 `{ok:false, message}` |
| `src/lib/tests/runAutoDraft.ts` (새로) | 한 회차 — 화면과 **같은 함수**를 부른다(`planDailyReview` → `countEligibleProblems` → `generateDraftTest`) |
| `src/app/api/tests/auto-draft/cron/route.ts` (새로) | `CRON_SECRET` 문지기(없으면 503 · 틀리면 401) · `?day=` 로 지난 날 되짚기 |
| `vercel.json` (고침) | cron 한 줄 추가 — `0 23 * * *`(UTC) = **KST 08:00** |

### 대상 넓히기 (⑤)

| 파일 | 무엇 |
|---|---|
| `src/app/api/tests/daily-review/route.ts` (고침) | 계획 갈래를 더 읽는다(**계정 소유로 좁혀서**) · 반 전체 진도도 읽는다 · `useIndividualProgress` 를 넘긴다 · eywa 갈래는 소유자일 때만 |

### 시험 하네스

| 파일 | 무엇 |
|---|---|
| `src/mocks/prismaTestDouble.ts` (고침) | `progressPlan` · `autoDraftRun` · `user` 모델 추가 · 🔴 **날짜 비교 결함 수리**(아래 ⑤-가) |
| `scripts/qa/mutate-daily-plan.ts` (새로) | 변이 하네스 34개 + `--anchors`(시험 없이 앵커만 세는 모드) |

---

## ② 정한 것과 까닭

### ⑴ 계획 표는 «규칙 한 줄» — 날짜별 행을 쌓지 않는다

`progress_plan` 한 줄 = 수업 요일(여럿) · 한 수업당 차시 수 · 시작 차시 · 시작일 · 켜짐.
날짜별 행이면 요일 하나 바꿀 때 지난 행을 전부 고쳐 써야 하고, 그러면 **무엇이 계획이고 무엇이
기록인지 섞인다**(이 저장소가 여러 번 빠진 자리 — 20번 «파생물을 정본으로 읽으면»).

**반/학생 이중 구조는 `Progress` 를 그대로 본떴다** — `student_id` 가 NULL 이면 반 계획, 값이
있으면 학생 계획. 덮어쓰는 조건도 진도와 **같다**(`use_individual_progress` 가 참일 때만).
브리프는 「개별 진도 학생은 학생 계획이 반 계획을 덮는다」였고, 그 조건을 진도와 다르게 두면
「계획은 학생 것을 보는데 진도는 반 것을 보는」 반이 생긴다.

**「반 계획은 반당 하나」는 부분 unique 인덱스**가 지킨다(`WHERE student_id IS NULL`). Postgres 는
NULL 을 서로 다른 값으로 보므로 평범한 unique 로는 못 막는다. 두 줄이 들어가면 「어느 것이 이
반의 계획인가」가 조회 순서로 갈리고, 같은 날 두 번 돈 자동 출제가 **서로 다른 범위**를 낸다.

### ⑵ 「밀림/앞섬」은 «그 차시를 며칠 늦게 나갔나»로 잰다

첫 정의는 「오늘 계획이 가리키는 자리 vs 실제 자리」였는데, **계획대로 가는 반이 −2일로 읽혔다**
(진도는 지난 수업에 적히고 오늘은 아직 안 적혔기 때문). 그래서 뒤집었다 —

> `driftDays = 계획이 그 차시를 나가라던 날 − 실제로 나간 날` · 양수 앞섬 · 음수 밀림

계획대로면 정확히 0 이고, 시작 차시보다 **뒤에** 있는 반도 잴 수 있게 계획을 거꾸로도 편다
(`nthLessonDay` 의 `n ≤ 0` 가지). 「못 잰다」를 0 으로 내면 **가장 많이 밀린 반이 0일로 보인다.**

### ⑶ 회차 기록은 **새 표**(`auto_draft_run`) 하나 — 기존 것을 안 썼다

`eywa_sync_run` 은 eywa 동기화의 칸(받은 학생·반·미해결 줄)이고, 이 트랙은 eywa 를 쓰지 않는다
(D-129 ⑸ 보류). 남의 회차 표에 뜻이 다른 수를 끼워 넣으면 메인 화면의 「마지막 동기화」 스트립이
**안 돈 동기화를 돈 것으로** 읽는다.

표를 둘(run + ledger)로 나누지 않고 하나에 `skips JSONB` 로 넣었다 — 건너뛴 학생은 회차당 많아야
수십 명이고, **까닭이 회차와 떨어지면 「합계는 맞는데 목록이 빈」 회차**가 생긴다(20번 교훈
2026-09-13 «칸이 없다를 0점으로 채우면 합계가 유일한 그물이 된다»). DB CHECK 로 못을 박았다 —
`jsonb_array_length(skips) = skipped`.

건너뛴 까닭 5갈래: `already`(오늘 이미 있음) · `lacking`(문항 부족) · `no-range`(범위 못 냄) ·
`exam-or-unread`(D-64 시험기간·미분류) · `failed`(출제가 422/오류).

### ⑷ 대상은 **합집합**이다 — 계획 ∪ 보고서

브리프 ⑤ 는 「계획이 있는 학생이면 전부」이고 「`eywaLastReportDate` 로 재는 지금 셈에 기대지
말라」였다. 그 둘을 「보고서 축을 **없앤다**」로 읽지 않았다 — **계획을 아직 안 넣은 반이 그날로
화면에서 사라지면 원장님의 오늘 일이 멈춘다.** 그래서 계획 축을 **더했다**.
(계획이 하나도 없으면 이 라우트는 예전과 한 글자도 다르지 않다 — 시험으로 잠갔다.)

**D-64 는 계획보다 앞선다** — 보고서가 오늘인데 진도 행이 없으면(「내신대비」) 계획이 수업일이라
해도 `examOrUnread` 다. 보고서는 「그날 무엇을 했나」의 실측이고 계획은 예정이다.

**소유권이 갈래마다 다르다.** eywa 갈래는 계정 구분이 없어서(연계 학생은 학원 하나의 것)
`isEywaOwner` 로 통째로 막는다. 계획 갈래는 **반 소유(`Class.userId`)로 좁혔다** — 계획은 누구나
만들 수 있으므로 안 좁히면 남의 반이 섞인다.

### ⑸ 계획의 «시작 차시»가 진도 이력 노릇을 한다

D-63 은 「그 반이 실제로 나가기 시작한 데」를 **진도 이력에서** 찾는다. 계획으로 들어온 새 학생은
이력이 **한 줄도 없다** — 그대로 두면 `current-only`(한 차시짜리 범위)로 조용히 떨어진다.
그래서 범위를 낼 때 `progressUnitIds` 에 `rule.startUnitId` 를 함께 넣는다. 대단원 제한(D-63)은
그 위에 그대로 걸린다.

### ⑹ 소유자 env 는 **새로 만들었다** — `EYWA_SYNC_OWNER_EMAIL` 을 안 썼다

cron 에는 세션이 없는데 `generateDraftTest` 는 소유권·최근 출제 제외(D-20)·시험지 `user_id` 에
원장 계정을 쓴다. 브리프는 「`EYWA_SYNC_OWNER_EMAIL` 패턴을 **참고**해 한 곳에서」였고,
eywa 는 보류라 그 env 는 연계를 끄는 날 지워질 값이다 — 자동 출제가 거기 매달리면 **eywa 를 끄는
날 자동 출제가 같이 죽는다.** 그래서 `AUTO_DRAFT_OWNER_EMAIL` 하나를 새로 뒀고,
**못 찾으면 503 으로 끝낸다**(조용한 0건 금지 — `syncScope.ts` 의 결).

### ⑺ 「초안까지만」은 **없는 것으로** 지킨다

`runAutoDraft` 에는 `confirm`·`print` 를 부르는 줄이 없고, 학생에게 무엇을 보내는 길도 없다.
시험은 「만들어진 것이 전부 `draft` 이고 `printedAt` 이 null 인가」로 잠갔다.

---

## ③ 시험 · 변이

### 시험 (전부 초록 — 5파일 73개)

| 파일 | 개수 | 무엇을 잠그나 |
|---|---:|---|
| `src/__tests__/unit/progressPlan.test.ts` (새로) | 25 | 날짜 펴기(시작일 당일·요일 하나·한 수업 두 차시·교육과정 끝·계획 시작 전·꺼진 계획) · 실제가 이긴다(앞/뒤/오늘 기록/보강/목록 밖 차시) · 밀림·앞섬 네 갈래 · 학생 계획 덮어쓰기 |
| `src/__tests__/unit/planDailyReview.test.ts` (10개 더함 → 16) | 16 | 계획 대상 · 수업일 아님 · 꺼진 계획 · D-63 과 시작 차시 · 실제가 이긴다 · 학생/반 계획 · 반 진도 · D-64 우선 · 합집합 셈 · **계획이 없으면 예전 그대로** |
| `src/__tests__/api/autoDraftCron.test.ts` (새로) | 11 | 문지기 셋 · 소유자 오류 둘 · 초안 생성 · **초안까지만** · 중복 금지 · 문항 부족 · 회차 기록 · 소유 범위 |
| `src/__tests__/api/dailyReview.test.ts` (6개 더함 → 12) | 12 | 계획 학생이 나오나 · 계획 없으면 예전 그대로 · 남의 반 안 섞이나 · 소유자 아니어도 자기 계획은 보나 · `todayTests` |
| `src/__tests__/unit/progressResolver.test.ts` (그대로) | 9 | `applicableProgress` 리팩터가 동작을 안 바꿨나 |

새로 쓴 시험 **52개**(기존 21개는 그대로 초록).

### 변이 표 (`npx tsx scripts/qa/mutate-daily-plan.ts`)

<!-- MUTATION_TABLE -->

---

## ④ 리드가 정할 것

| # | 무엇 | 왜 물어보나 |
|---|---|---|
| **A** | **마이그레이션 적용 시점** — 병합 **전에** 적용해야 한다(맨 위 상자) | 안 하면 배포가 곧 원장님 메인 화면 500 이다 |
| **B** | **`AUTO_DRAFT_OWNER_EMAIL` 을 Vercel env 에** 넣기 | 없으면 cron 이 매일 503 을 낸다(의도한 소리지만, 넣기 전엔 초안이 안 선다) |
| **C** | **화면 두 줄** — `DailyReviewSection.tsx:156` 의 `if (!d.eywaOwner) return null;` 과 249줄의 「오늘 수업 보고서가 아직 없습니다」 | 뒷단은 계획 학생을 주는데 **화면이 eywa 소유자가 아니면 섹션을 안 그린다.** 문구도 이제 「보고서」가 아니라 「계획」이 축이다. 둘 다 **형태 결정(D-07)** 이라 손대지 않았다 |
| **D** | **중복 금지의 범위** — 지금은 `testType: "review"` 만 본다(지금 화면 규칙과 같다) | 같은 날 일일테스트를 이미 냈어도 확인테스트 초안이 하나 더 선다. 「그날 시험이 하나라도 있으면 건너뛴다」로 넓힐지 |
| **E** | **교육과정 끝에 닿은 학생** — 지금은 마지막 차시에 멈춰 **매일 같은 범위로 초안이 선다**(`atCurriculumEnd` 로 표시는 한다) | 건너뛸지(새 까닭 `curriculum-end`), 그대로 둘지. 735차시를 다 나간 학생은 당분간 없을 것 같아 그대로 뒀다 |
| **F** | **한 수업당 차시 수 기본값** — 22번 §5 의 ⏳ 그대로 | 계약 기본은 1, 상한 10(오타 울타리). 원장님 답이 오면 화면 기본값만 정하면 된다 |
| **G** | **요일 번호 표기** — `0=일 … 6=토`(JS `getUTCDay`)로 저장한다 | 화면이 「월=1」로 그리려면 화면에서 옮겨야 한다. 계약·CHECK 에 못 박아 뒀다 |

---

## ⑤ 확인 못 한 것 / 주의

### 가. 🔴 가짜 Prisma 가 날짜를 `===` 로 견주고 있었다 (고쳤다)

`where: { testDate: new Date(day) }` 는 `new Date(x) === new Date(x)` 가 늘 거짓이라
**가짜에서 언제나 빈 배열**이었다. 하필 그 조회가 「오늘 이미 만든 시험」(중복 출제 막기)이라
— **중복 금지를 겨누는 시험이 가드가 없어도 초록**이었다. `comparable`(시각)로 견주게 고쳤고,
변이 ⑧a 가 이 자리를 지킨다. 기존 `daily-review` 의 `todayTests` 도 이제야 실제로 시험된다.

### 나. 실 DB 로는 아무것도 못 봤다

이 기계에 Docker 가 없고 공유 DB 쓰기는 금지라 **드라이런조차 안 돌렸다.** 마이그레이션 SQL 의
문법·CHECK·부분 unique 는 **읽어서만** 확인했다. `apply-progress-plan-migration.ts` 의 확인부가
적용 직후 이름으로 전부 대조하므로, 리드의 드라이런에서 처음 실증된다.

### 다. 실제 cron 이 도는 것은 못 봤다

Vercel cron 은 배포 뒤에만 돈다. 여기서 본 것은 라우트를 함수로 직접 부른 것뿐이다.
`vercel.json` 의 `0 23 * * *` 이 KST 08:00 이라는 것도 **계산으로만** 확인했다(기존 eywa cron 이
`30 22` = KST 07:30 인 것과 같은 셈).

### 라. 문항 풀이 얇은 자리는 mock 픽스처의 사실이다

`autoDraftCron` 시험의 「3명 중 2명 초안 · 1명 `lacking`」은 **mock 문항 분포**가 그렇게 생겼기
때문이다(개별 진도 학생 s3 의 범위 421~423 이 얇다). 이 값을 시험에 박아 두어서 픽스처가
바뀌면 빨개진다 — 그건 **의도한 것**이다(한 회차에 두 갈래가 다 도는 픽스처).

### 마. 안 건드린 것

eywa 코드·env·cron · 화면(`/dev/**` 포함) · 확정·인쇄 · 기존 출제·범위 규칙(부르기만 했다).
`npm run lint` 의 빨강 3건은 `scripts/` 의 `require()` 세 줄로 **이 트랙 밖**이고 예전부터 있다
(내가 만진 16파일은 eslint 초록 — 커밋 훅의 `eslint --fix` 도 통과).

### 바. 관문

`npx tsc --noEmit` 0 · 관련 시험 5파일 73개 초록 · `npm run lint`(내 파일 초록) ·
`npm run build` — <!-- BUILD_RESULT -->
**전체 관문(148+파일, 이 기계에서 28분)은 리드가 돌린다.**
