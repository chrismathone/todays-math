# 보고 — 관리자는 학원 운영 데이터를 전부 본다 (D-130)

브리프: `docs/planning/tracks/briefs/admin-sees-all.md` · 결정 **D-130**(07 Decision Log)
워크트리: `chrismathone/admin-sees-all` · 2026-09-16 · **푸시하지 않았다.**
공유 DB 쓰기 없음 · 마이그레이션 없음 · eywa 코드/env/cron 안 건드림 · 화면·문구 안 건드림.

> 🔴 **병합 때 형(type)이 깨지는 자리가 일부러 있다.** `requireOwnedClass` 등 `ownership.ts` 헬퍼의
> 둘째 인자가 `userId: string` → **뷰어 객체**로 바뀌었다. 같은 시기의 `plan-api` 트랙이
> `requireOwnedClass(classId, session.id)` 로 짜 두었다면 병합 뒤 `tsc` 가 빨갛다 — **조용히 안 넓혀지는 것보다
> 크게 깨지는 편**을 골랐다(§④-1). 고치는 법은 한 글자다: `session.id` → `session`.
>
> 🔴 **배포 뒤 env 한 줄** — D-130 ⑸ 대로 자동 출제가 전 반을 돌려면 `AUTO_DRAFT_OWNER_EMAIL=st2000423@gmail.com`
> 이어야 한다. 코드는 그 계정의 `isAdmin` 을 읽을 뿐 env 는 안 건드렸다(§⑤).

---

## ① 무엇을 만들었나

### 헬퍼 — `src/lib/ownerScope.ts` (새로)

| 이름 | 모양 | 쓰는 자리 |
|---|---|---|
| `crossesOwnerFence(viewer)` | **유일한 판정** — `viewer.isAdmin === true` | 아래 넷이 전부 이것만 묻는다 · 변이 하네스가 두 방향으로 뒤집는 한 줄 |
| `ownedRowsWhere(viewer)` | 관리자 아님 `{ userId }` · 관리자 `{}` | `userId` 칸이 있는 표(반·시험지)의 목록·원자 갱신 where |
| `ownedStudentsWhere(viewer)` | 관리자 아님 `{ class: { userId } }` · 관리자 `{}` | 학생 수(작업실 개요) |
| `withinOwnerScope(viewer, ownerUserId)` | 읽어 온 행의 소유자가 범위 안인가 | `ownership.ts` 의 404/403 헬퍼 넷 |
| `personalViewer(viewer)` | `isAdmin: false` 로 고정한 뷰어 | 개인 작업물 라우트가 반 소유를 물을 때(장바구니→시험지) |

**왜 이 모양인가**

- **판정 한 곳 + 조각 넷.** 라우트는 `isAdmin` 을 직접 안 읽는다(`grep isAdmin src/app/api` 에 새로 늘어난 자리 없음).
  라우트에 남는 것은 «어느 조각을 쓰나» 뿐이라, 넓히는 자리·안 넓히는 자리가 **import 로 드러난다.**
- **where 조각은 «좁힐 때 글자 그대로 같다».** 관리자 아님의 where 가 넓히기 전과 같은 객체라(`{ userId }` ·
  `{ class: { userId } }`) 기존 모양 시험(`teachingOverview` · `studioWorkspace`)이 **한 줄도 안 고치고** 초록이다.
  관리자에게는 `{ userId: undefined }` 가 아니라 **키가 없는** `{}` 를 준다 — undefined 는 Prisma 가 «조건 없음»으로
  읽으므로 좁히는 쪽에서 새면 알아볼 수 없다(단위 시험 + 변이 ②a 가 지킨다).
- **빈 값은 넘지 않는다.** `isAdmin` 이 없거나 `"true"`·`1` 같은 참 같은 값이면 관리자가 아니다(`isEywaOwner` 와 같은 결).
- **뷰어 객체를 받는다.** `SessionUser` 에 `isAdmin: boolean`(필수)을 더했다. 세션 사용자를 손으로 만드는 자리
  (cron 소유자 `autoDraftOwner.ts`)가 이 칸을 **빠뜨리지 못하게** 형이 막는다. 값은 Auth.js jwt 콜백이
  **세션을 읽을 때마다 DB 에서 새로** 싣는 `session.user.isAdmin` 이다 — 관리자 표시를 내리면 다음 요청부터 좁혀진다.

### 🔴 판단 둘 — 시험지의 소유자, D-20 의 열쇠

1. **관리자가 남의 반에 낸 시험지의 `Test.userId` 는 그 반의 소유자다**(관리자가 아니다).
   지금까지 모든 시험지는 `Test.userId === Class.userId` 였다(출제·장바구니·예측 문제지가 전부 반 소유를 확인한 뒤
   `session.id` 로 썼다). 관리자를 적으면 그 불변식이 깨지고 — 역할 계정(test_t) 화면의 시험지 목록에서 사라지고,
   test_t 의 기본 범위가 그 확인테스트를 «직전»으로 못 센다. 반 소유자로 적으면 **관리자가 아닌 계정은 값이 그대로**다
   (반 소유를 통과했으니 반 소유자 = 나). 아침 자동 초안도 같은 길이라 각 반 소유자의 시험지로 선다.
2. **최근 14일 중복 제외(D-20)의 열쇠도 반/시험지 소유자다** — 출제(`generateDraftTest`)와 교체(`replaceTestProblem`) 둘 다.
   관리자 자신의 출제로 거르면 관리자 계정엔 시험지가 없으니 **그 반이 어제 낸 문항이 오늘 또 나간다.**

### 바꾼 자리

| 자리 | 전 | 후 |
|---|---|---|
| `src/lib/session.ts` | `{ id, email, name }` | `+ isAdmin`(boolean `true` 만) |
| `src/lib/ownership.ts` | `requireOwnedClass/Student/StudentInClass/Test(…, userId)` · `x.userId !== userId` | `(…, viewer)` · `!withinOwnerScope(viewer, x.userId)` — 404/403 갈래·순서 그대로 |
| `api/classes` GET | `where: { userId: session.id }` ×2 | `ownedRowsWhere(session)` (POST 는 그대로 — **만든 계정의 반**, D-130 ⑴) |
| `api/classes/[id]` GET·PATCH·DELETE | `requireOwnedClass(id, session.id)` | `(id, session)` |
| `api/students` POST·GET · `api/students/[id]` PATCH·DELETE | 〃 | 〃 |
| `api/progress` POST·GET · `progress/advance` · `progress/suggest` | 〃 | 〃 |
| `api/tests` GET | `userId: session.id` | `...ownedRowsWhere(session)` |
| `api/tests/[id]` GET · `results` · `results/[studentId]` | `requireOwnedTest(id, session.id)` | `(id, session)` |
| `api/tests/[id]/confirm` | 원자 조건 `userId: session.id` | `...ownedRowsWhere(session)` |
| `api/tests/[id]/print` | 원자 조건 `userId: session.id` | `...ownedRowsWhere(session)` |
| `api/tests/[id]/submit` → `lib/testResults/submitTestResult.ts` | `session.id` ×2 | `session` |
| `api/tests/[id]/problems/[seq]` → `lib/tests/replaceTestProblem.ts` | 소유·D-20 열쇠·원자 조건이 `session.id` | 소유 `session` · D-20 `owned.data.userId` · 원자 `ownedRowsWhere` |
| `api/tests/generate` → `lib/tests/generateDraftTest.ts` | 소유·D-20·`Test.userId` 가 `session.id` | 소유 `session` · D-20 과 `Test.userId` 가 `owned.data.userId`(반 소유자) |
| `api/tests/default-range` | 반·학생 소유 + 직전 확인테스트 where 둘이 `session.id` | `session` · `ownedRowsWhere(session)` |
| `api/tests/daily-review` (계획 갈래) | `class.findMany({ where: { userId: session.id } })` | `ownedRowsWhere(session)` — **eywa 갈래(`isEywaOwner`)는 그대로** |
| `api/metrics` | `userId: session.id` | `...ownedRowsWhere(session)` |
| `api/studio/overview` · `api/dev/unified/overview` | 반·학생 수·최근 반 셋이 `user.id` | `ownedRowsWhere(user)` · `ownedStudentsWhere(user)` |
| `app/(main)/tests/[id]/print/page.tsx` (인쇄 지면) | `findFirst({ id, userId: session.id })` | `{ id, ...ownedRowsWhere(session) }` — **지면 모양은 그대로** |
| `api/concept` → `lib/concept/adminService.ts` `loadConceptBoard` | `(userId, canEdit, now)` · `where: { userId }` | `(viewer, canEdit, now)` · `ownedRowsWhere(viewer)` — 읽기만 |
| `lib/tests/runAutoDraft.ts` (아침 8시) | `where: { userId: owner.id }` | `ownedRowsWhere(owner)` — 소유자가 관리자면 전 반(D-130 ⑸) |
| `lib/tests/autoDraftOwner.ts` | `select { id, email, name, deletedAt }` | `+ isAdmin` 을 실어 준다 |
| `api/basket/test` (개인 작업물) | `requireOwnedClass(…, session.id)` | `personalViewer(session)` — **동작 그대로**(관리자여도 자기 반만) |
| `scripts/qa/mutate-daily-plan.ts` | ⑥c·⑦a 앵커가 옛 where 를 물었다 | 새 where 로 옮겼다(뜻 그대로, 앵커 34개 전부 하나 ✓) |
| `src/mocks/prismaTestDouble.ts` | 계정 행에 관리자 표시 없음 | `UserRow.isAdmin` · `seedUsers()` |

---

## ② `userId: session.id` 전수 표

찾은 법: `grep` 세 번 — `userId: *(session|user|owner)…id` · `session.id|account.id|user.id|owner.id` 전부 ·
변수 이름이 다른 `where: { userId }` · `.userId !==` 까지(`src/app` · `src/lib`, 시험·목 제외). 브리프 목록 밖에서
**더 나온 자리**에 ★.

### 넓혔다 (학원 운영 데이터)

| 자리 | 무엇 | 왜 |
|---|---|---|
| `api/classes/route.ts` GET | 반 목록·수 | 반(D-130 ⑵) |
| `api/classes/[id]/route.ts` GET·PATCH·**DELETE** | 반 단건·고치기·지우기 | 반 — 쓰기에 지우기도 들었다(§④-3) |
| ★ `api/students/route.ts` POST·GET | 학생 넣기·목록 | 학생 |
| ★ `api/students/[id]/route.ts` PATCH·**DELETE** | 학생 고치기·지우기 | 학생 |
| `api/progress/route.ts` POST·GET · `advance` | 진도 기록·조회·1클릭 | 진도(쓰기가 이 결정의 목적) |
| ★ `api/progress/suggest/route.ts` | 시작점 제안 | 진도 읽기 |
| `api/tests/route.ts` | 시험지 목록 | 시험지 |
| ★ `api/tests/[id]/route.ts` · `results` · `results/[studentId]` | 시험지 단건·응시 결과 | 시험지 |
| ★ `api/tests/[id]/confirm` · `print` | 확정·인쇄 기록(원자 조건 포함) | 시험지 쓰기 |
| ★ `api/tests/[id]/submit` → `submitTestResult.ts` | 채점 입력 | 시험지·학생 쓰기 |
| ★ `api/tests/[id]/problems/[seq]` → `replaceTestProblem.ts` | 문항 교체(소유·D-20·원자) | 시험지 쓰기 |
| ★ `api/tests/generate` → `generateDraftTest.ts` | 출제(소유·D-20·`Test.userId`) | 「오늘의 확인테스트」에서 출제가 이 길이다 |
| `api/tests/default-range/route.ts` | 반·학생 소유 · 직전 확인테스트 둘 | 기본 범위 |
| `api/tests/daily-review/route.ts` | 계획 갈래의 반 | 진도 계획 · 「오늘의 확인테스트」 |
| `api/studio/overview/route.ts` · `api/dev/unified/overview/route.ts` | 반·학생 수·최근 반 | 작업실 개요 숫자 |
| ★ `api/metrics/route.ts` | 주간 인쇄 지표(메인 첫 화면) | 시험지 숫자(§④-4) |
| ★ `app/(main)/tests/[id]/print/page.tsx` | 인쇄 지면 조회 | 시험지 — 확정을 넓히고 인쇄를 안 넓히면 인쇄에서 404 |
| ★ `lib/concept/adminService.ts` `loadConceptBoard` | 오늘의 개념 판(반·진도·시청 수) | 반·학생·진도 읽기(§④-6) |
| `lib/tests/runAutoDraft.ts` · `autoDraftOwner.ts` | 아침 자동 초안 | D-130 ⑸ |

### 안 넓혔다

| 자리 | 무엇 | 왜 |
|---|---|---|
| `api/basket/route.ts` · `lib/basket/readBasket.ts` | 장바구니 담기·읽기·비우기 | 개인 작업물(D-130 ⑶) |
| `api/basket/test/route.ts` | 장바구니 → 시험지(반 소유·바구니·`Test.userId`) | 개인 작업물 라우트 — 브리프 §3 «건드리지 마라». 동작 그대로(§④-2) |
| `lib/privateWorkspace.ts` · `privateDocumentActions.ts` · `privateAssets.ts` | 작업실 문서·자료 | 개인 작업물. 남의 자료를 여는 길은 **감사 기록을 남기는 관리자 점검**(`/api/admin/users/{id}/…`)이 원래 따로 있다 — 그대로 |
| `api/predictions/route.ts` · `[id]` · `[id]/actual` · `lib/predictor/actualScoreService.ts` | 예측 회차·실제 점수 | 예측 회차(D-130 ⑶) |
| ★ `api/exam/rounds` · `[id]` → `lib/exam/loadRounds.ts` · `composeRounds.ts` | 회차 화면(반 목록을 `userId` 로 읽는다) | 예측 회차 화면 |
| ★ `api/tests/predicted` → `generatePredictedPaper.ts` | 예측 문제지 만들기(회차·반 소유) | 예측 회차 계열 |
| ★ `api/tests/[id]/scores` → `persistPredictedPaper.ts` `saveManualScores` | 배점 수동 조정 | 예측 문제지 전용(일일·확인테스트는 배점이 없다 D-28) — 회차 계열로 뒀다(§④-5) |
| `api/problems/route.ts` · `generate` · `transform` · `transform/adopt` | 문항 작성자 기록(`userId: session.id` 로 **쓴다**) | 문항 소유 D-31/D-101 — 거르는 자리가 아니다 |
| `api/problems/[id]/*` (`requireAccessibleProblem`) | 문항 단건·신고·검수 | 문항은 소유자를 원래 안 본다 |
| ★ `api/review/queue` · `app/review/page.tsx` · `lib/review/queues.ts` | 검수자 «내가 안 본 것» | 검수자 개인 기록 — 운영 데이터 아님 |
| ★ `api/students/[id]/account` · `account/password` → `lib/learn/issueStudentAccount.ts` | 학생 로그인 계정 발급·재발급·끄기·상태 | **D-124 규칙 1(원장님 확정 ⑤)** «그 학생의 반이 발급하는 원장 소유여야 한다» — 자격 증명이라 결정 충돌을 리드에게 올린다(§④-7) |
| `lib/eywa/runSync.ts` (`userId: owner.id`) | eywa 동기화가 반을 붙이는 소유자 | eywa 보류(D-129 ⑸) — 안 건드림 |
| `api/tests/daily-review` eywa 갈래(`isEywaOwner`) | 연계 학생·동기화 기록 | D-130 ⑸ 그대로 |
| `api/account/activity` · `api/admin/users/*` · `api/auth/signup` · `lib/auth.ts` · `proxy.ts` · `actions/auth.ts` | 감사 기록의 `userId`·`actorId` | 계정 자신 — 거르는 자리가 아니다 |
| `api/concept/lectures` (`actorId`) · `api/learn/*` | 강의 쓰기 행위자 · 학생 세션 | 해당 없음 |
| `app/dev/ui-wire/page.tsx` | 시안 페이지(반·시험지 40건) | 원래 소유 필터가 없는 개발 전용 — 해당 없음 |
| `api/dev/unified/teaching` | 교육과정 + `user` | 거르지 않는다. 응답 `user` 에 **`isAdmin` 칸이 새로 실린다**(자기 표시 — §⑤) |

---

## ③ 시험 · 변이

### 시험 (새로 · 고침)

| 파일 | 무엇 | 짝 |
|---|---|---|
| `src/__tests__/unit/ownerScope.test.ts` (새로, 10) | 판정 · where 조각 둘 · 소유자 판정 · 개인 뷰어 · 빈 값/참 같은 값 · undefined 누출 | 관리자 아님/관리자 나란히 |
| `src/__tests__/unit/sessionUserAdmin.test.ts` (새로, 4) | `getSessionUser` 가 boolean `true` 만 관리자로 싣는다 · 승인 전은 null | — |
| `src/__tests__/api/adminSeesAll.test.ts` (새로, 42) | **같은 픽스처·같은 뷰어(반 0개)·표시 하나만 다르게** `describe.each` | 읽기 9 · 쓰기 9 · 자동 초안 1 · 개인 작업물 2 — 각 ×2 |
| `src/__tests__/api/testPrintPageScope.test.ts` (새로, 2) | 인쇄 지면의 시험지 where | ×2 |
| `teachingOverview.test.ts` (+1) · `studioWorkspace.test.ts` (+1) | 관리자면 `where: {}`, 표시 없는 같은 계정은 옛 where 그대로 | 한 시험 안에 짝 |
| `conceptAdmin.test.ts` (+1) | 반 0개 계정 — 관리자 아님 빈 판 / 관리자 네 반 | 한 시험 안에 짝 |
| `privateAccounts.test.ts` (+1) | 관리자의 **보통 읽기**도 자기 자료로만 좁혀지고 감사 기록이 없다 | 기존 «관리자 아님» 시험과 짝 |
| 세션 모양 손으로 만든 8파일 13자리 | `isAdmin: false` 를 적었다(형이 요구) — 단언은 안 바꿨다 | — |

`adminSeesAll` 에서 짚어 둘 것:

- **«관리자 아님»은 넓히기 전 코드에서 이미 초록이었다**(RED 단계 17 실패는 전부 관리자 쪽, 23 통과가 관리자 아님·개인 작업물).
  그래서 이 절반이 «넓히기 전과 같다»의 기준선이다.
- 기본 범위는 **«직전 확인테스트 다음부터»**(`last-review`, 415)로 단언한다 — 반 소유만 넓히고 시험지 where 를 안 넓히면
  413 부터가 되어 빨개진다.
- D-20 은 «소유자가 어제 이 단원 출제 가능 문항을 **전부** 냈다 → 관리자 출제는 422 / 교체도 422» 로 잡았다.
- 자동 초안 짝은 계정 시드(`seedUsers`)에 관리자 표시가 실리는지부터 변이로 본다(⑪ — 2026-09-15 교훈).
- 개인 작업물: 남의 장바구니가 안 보인다 · **내 바구니로 남의 반 시험지는 403 이고 한 장도 안 선다** · 남의 예측 회차 403 — 짝이 **같은 답**이다.

### 관문

| 관문 | 결과 |
|---|---|
| `npx prisma generate` → `npx tsc --noEmit` | **0** |
| 새·고친 시험 7파일 | 122/122 (+ 뒤에 더한 교체 D-20·세션 4 포함 재실행 46/46) |
| `src/__tests__/api` 전체 + `WorkspaceEntry` | **46파일 790/790** |
| `vitest run` 전체(`--maxWorkers=2`) | 552파일 — **536 통과 · 13 실패 · 3 건너뜀**(시험 18,571 통과 · 13 실패). 실패 13 은 **이 변경 탓이 아니다**: 그중 12파일을 바꾸기 전 커밋 `0d1a2180`(임시 워크트리, 대조 뒤 지움)에서 돌리니 **같은 12개가 똑같이 실패**했다 — `LoginForm` 2 · `StudioView.ai` 3 · `PrintCheck` · `TeachingOverview`(컴포넌트) · `answerKeyOverflow` · `examWiringAudit` · `katexRender` · `renderParity` · `solutionWiring` · 적재 실패(`server-only`) `Main` · `MainRedirect` · `DailyReviewSection`. 나머지 1 `serverExternalPackages` 는 전체 실행에서 31초 걸려 떨어졌고 **따로 돌리면 3/3 통과**(부하 때 시간 초과) |
| `npm run lint` | 오류 3 — **전부 `scripts/admin/bootstrap-admin.cjs`**(`require()`, df1eb904 부터 있던 것, 안 건드림). 바꾼 파일에서는 경고 0 |
| `npm run lint:affordance` | 통과 |
| `npm run build` | **통과**(exit 0) — PowerShell→`cmd /c`, `DATABASE_URL` 은 닿지 않는 `127.0.0.1:1`, 임시 `AUTH_SECRET` |

### 변이 — `scripts/qa/mutate-admin-scope.ts` — **39/39 빨개짐** · 살아남음 0 · 보류 0

`npx tsx scripts/qa/mutate-admin-scope.ts` (커밋 10d2560c 위에서). 매 회차 «기준 시험 초록 → 앵커 하나 → 파일 바뀜 →
(순수 헬퍼는) 탐침 산출물 바뀜 → 실패한 시험 **이름**»을 거쳤고, 끝마다 «변이한 파일 전부 원본과 일치 ✓».

⚠️ **한 번에 다 돌지 못했다.** 배경 셸이 두 번 «메모리 부족»으로 끊겼고(다른 세션의 tsc 2.5GB · vitest 가 같이 돌았다),
끊긴 뒤의 판정은 전부 ⑷ «러너가 안 떴다»(판정 거부)였다 — 가드 판정이 아니다. 그 26개 → 12개를 **다시 돌려** 채웠다
(1차 ①a~⑥a 13 · 3차 ⑥b~⑧a 14 · 4차 ⑧b~⑨d 7(앞에서) · 5차 ⑩·⑪ 5(앞에서)). 2차는 기준 시험이 러너 사망(실패 이름 없이 종료 1)으로
멈췄고, 같은 10파일을 직접 돌리면 145/145 초록이었다.

| # | 변이 | 방향 | 빨개진 시험(대표) |
|---|---|---|---|
| ①a | 판정 `return false` | 절대 안 넘는다 | 관리자 · 반 목록/반 단건/학생 목록 … (탐침 true→false) |
| ①b | 판정 `return true` | **항상 넘는다** | **관리자 아님** · 반 목록/반 단건/학생 목록 … (false→true) |
| ①c | `Boolean(viewer.isAdmin)` | 참 같은 값 | 단위 «표시가 없으면 넘지 않는다» |
| ②a | 좁힐 때 `{ userId: undefined }` | 좁힘이 샌다 | 관리자 아님 · 반 목록/시험지 목록/오늘의 확인테스트 |
| ②b | 늘 `{ userId }` | 관리자도 좁힘 | 관리자 · 반 목록/시험지 목록/기본 범위 |
| ②c | 학생 where 늘 `{}` | 넓힘 | 스튜디오·개발 개요(관리자 아님 where) |
| ③a | 소유자 판정이 판정을 안 물음 | 좁힘 | 관리자 · 반 단건/학생 목록/진도 |
| ③b | 소유자 판정 늘 참 | 넓힘 | 관리자 아님 · 반 단건/학생 목록/진도 |
| ④ | 개인 뷰어가 관리자 표시를 넘김 | 넓힘 | 관리자 · 장바구니→남의 반 시험지 · 단위 personalViewer |
| ④b | 장바구니 시험지가 `session` 을 그대로 | 넓힘 | 관리자 · 장바구니 |
| ⑤a | 세션 `isAdmin: true` | 넓힘 | 세션 «관리자가 아니면 false» |
| ⑤b | 세션 `Boolean(...)` | 참 같은 값 | 세션 «표시가 없거나 true 가 아니면» |
| ⑥a·b·c | 404/403 헬퍼 반·학생·시험지가 옛 비교 | 좁힘 | 관리자 · 반 단건 / 학생 넣기·채점·자동 초안 / 시험지 단건·교체·확정 |
| ⑦a | 반 목록 `{}` | 넓힘 | 관리자 아님 반 목록 · 기존 `[T2.1] 본인 소유 반만` |
| ⑦b | 시험지 목록 조건 삭제 | 넓힘 | 관리자 아님 시험지 목록 |
| ⑦c·d | 계획 갈래 `{}` / `{ userId }` | 두 방향 | 관리자 아님(+기존 «남의 계정 반의 계획 학생은 안 나온다») / 관리자 |
| ⑦e | 기본 범위 직전 확인 `userId: session.id` | 좁힘 | 관리자 · 기본 범위 `last-review` |
| ⑦f·g | 주간 지표 조건 삭제 / 좁힘 | 두 방향 | 관리자 아님 / 관리자 |
| ⑦h·i | 확정·인쇄 원자 조건 좁힘 | 좁힘 | 관리자 · 바꾸고 확정하고 인쇄 |
| ⑦j·k | 인쇄 지면 좁힘 / `{ id }` 만 | 두 방향 | 인쇄 지면 관리자 / 관리자 아님 |
| ⑧a | `Test.userId = session.id` | 소유 이동 | 관리자 · 출제 «반의 소유자» · 자동 초안 |
| ⑧b·c | D-20 열쇠 `session.id` (출제·교체) | 열쇠 | 관리자 · 최근 중복 제외 둘 |
| ⑧d | 교체 원자 조건 좁힘 | 좁힘 | 관리자 · 바꾸고 확정하고 인쇄 |
| ⑨a·b | 자동 초안 반 `{ userId }` / `{}` | 두 방향 | 관리자 / 관리자 아님(+기존 «남의 계정 반에 계획이 있어도 건드리지 않는다») |
| ⑨c·d | 자동 초안 소유자 `isAdmin` false / true | 두 방향 | 관리자 / 관리자 아님 |
| ⑩a | 스튜디오 개요 좁힘 | 좁힘 | 스튜디오 D-130 |
| ⑩b | 개발 개요 학생 수 `{}` | 넓힘 | 개발 개요(관리자 아님 where 셋) |
| ⑩c·d | 개념 판 좁힘 / `{}` | 두 방향 | 개념 판 D-130 / 기존 «남의 반은 안 보인다» 둘 |
| ⑪ | **가짜 Prisma** 계정 시드가 관리자 표시를 버림 | 자가 눈멂 | 관리자 · 자동 초안 짝 |

---

## ④ 리드가 정할 것

1. **병합 순서·`plan-api` 트랙과의 접점.** `ownership.ts` 서명이 뷰어로 바뀌었다(§머리). 계획 쓰기 라우트는
   `requireOwnedClass(classId, session)` 과 `ownedRowsWhere(session)` 을 쓰면 관리자 넓히기가 저절로 따라온다.
   이 트랙이 먼저 들어가면 `plan-api` 의 «라우트 안 임시 판정»은 그대로 헬퍼로 옮기면 된다.
2. **장바구니 → 시험지를 관리자에게 넓힐까.** 지금은 브리프대로 그대로다(관리자여도 자기 반). 그런데 반 목록이 넓혀졌으니
   원장님이 장바구니에서 test_t 의 반을 **고를 수는 있고 누르면 403** 이 난다. 넓히려면 `api/basket/test/route.ts`
   의 `personalViewer(session)` → `session` 한 줄 + 시험 짝 뒤집기(바구니 자체는 여전히 자기 것).
3. **지우기까지 넘을까.** «읽고 고친다»를 쓰기 전체로 읽어 **반·학생 지우기**도 관리자에게 열었다(cascade 로 진도·시험지가 같이 지워진다).
   지우기만 막으려면 `DELETE` 두 곳에서만 `personalViewer` 를 쓰면 된다.
4. **주간 지표(메인 첫 화면 «실사용 일수»)를 전체로 셀까.** 넓혔다 — 관리자 화면에 역할 계정들의 인쇄가 합쳐진다.
   노스스타(D-09)를 «원장님 계정의 실사용»으로 보려면 되돌려야 한다(`api/metrics` 한 줄).
5. **예측 문제지.** 예측 문제지도 `Test` 행이라 관리자 시험지 목록에 보이고 확정·인쇄도 되지만, **배점 조정(`scores`)은 403** 이다
   (예측 회차 계열로 뒀다). 한쪽으로 맞출지.
6. **오늘의 개념 판을 넓혔다**(읽기만). 원장님 판에 모든 반이 나온다. 브리프 목록에는 없던 자리라 확인을 받는다.
7. 🔴 **학생 로그인 계정 발급은 안 넓혔다 — 결정 충돌.** D-124 규칙 1(원장님 확정 ⑤)이 «발급하는 원장 소유 반»을 요구하고
   D-130 은 «학생을 고친다»를 연다. 지금 원장님은 test_t 반 학생을 보고 고칠 수 있지만 **발급 칸은 403** 이다.
   넓히려면 `lib/learn/issueStudentAccount.ts` 의 `ownedStudent` 가 `withinOwnerScope` 를 묻게 하고 라우트 셋이 뷰어를 넘기면 된다
   (`mutate-student-auth.ts` 앵커 1개가 같이 움직인다). 원장님 확인이 먼저라고 보았다.
8. **화면에서 «누구의 반»이 안 보인다.** 관리자 반 목록에 역할 계정들의 반이 섞이는데 이름이 같으면 가를 수 없다
   (역할 계정끼리 «중2 심화반» 둘). 모양 문제라 D-07 — 손대지 않았다. 필요하면 시안부터.

## ⑤ 확인 못 한 것

- **실제 Postgres·실제 세션.** Docker 가 없고 공유 DB 쓰기는 금지라 인메모리 가짜와 모킹으로만 봤다. `where: {}` 로 `count`/`findMany`
  를 부르는 것은 Prisma 에서 «조건 없음»이 맞지만 실DB 로 재지 않았다. `isAdmin` 이 jwt 콜백에서 새로 실리는 것은 기존 코드(안 바꿈)를 믿었다.
- **화면.** dev 서버를 안 띄웠다 — 관리자 로그인으로 반 선택기·학생 관리·메인·오늘의 개념 판이 실제로 전부 채워지는지, 수가 많아졌을 때
  목록 모양이 버티는지(페이지 크기) 못 봤다. 반이 0개인 원장님 계정에서 각 화면이 «빈 상태» 대신 무엇을 그리는지도.
- **`AUTO_DRAFT_OWNER_EMAIL`** 의 배포 값 — env 는 안 건드렸다. 지금 값이 원장님 계정이 아니면 D-130 ⑸ 가 안 선다.
- `api/dev/unified/teaching` 응답에 `user.isAdmin` 칸이 새로 실린다(자기 표시라 누출은 아니다). 그 응답을 계약으로 검사하는 곳은 없다.
- 기존 `mutate-daily-plan.ts` 는 **앵커만** 다시 셌다(34/34) — 전량 판정은 안 돌렸다.
- 전체 vitest 의 기존 실패 12파일(§③ 관문) — 이 워크트리 환경에서 바꾸기 전부터 빨갛다. 까닭은 안 캤다(범위 밖). main 에서도 같은지는 리드 쪽에서 보는 게 빠르다.
