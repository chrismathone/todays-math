# REPORT-01 — 오늘의 개념 ⑧ 학생 화면 네 장 + 원장님 발급 칸 (워크트리 `learn-screens-2`, 2026-09-15)

브리프: `docs/planning/tracks/briefs/todays-concept-learn-screens.md` (§6 은 main 의 사본에만 있다) · 결정 D-123 · D-124 · D-125 · D-126 · **D-127**(원장님 학생 화면 검수 답 — §1.7) · 디자인 05 §8.9(시안 1안 «작업실 그대로»)
브랜치: `chrismathone/learn-screens-2` · 기준 `071dc5fa` · 커밋 계정 `SUN <chrismathone@gmail.com>` · **푸시 안 함**

## 0. 한눈에

| 항목 | 결과 |
|---|---|
| 만든 것 | 학생 화면 네 장(`/learn/login` · `/learn/password` · `/learn` · `/learn/watch/<id>`) · 원장님 발급 칸(«수업 · 학생 관리 › 학생» 이름을 누르면 한 명씩) · 서버 고침 둘(🔴 퇴원 학생 로그인 막기 · 없는 아이디 실패 행 정리) · 목록의 «수업한 날»(`taughtOn`) · 개발용 시안 페이지 `/dev/learn-hifi` · 실물 브라우저 계측 · 변이 하네스 · 🔴 **D-127 더함**(§1.7): 첫 로그인 «나가기» · 발급 칸 «잠김 — N분 뒤 풀림» 한 줄 · 퇴원 학생 발급 API 409 |
| 공유 DB | **접속 0 · 쓰기 0** — 이 워크트리에는 `.env` 가 아예 없다. 개발 서버·빌드는 `DATABASE_URL=127.0.0.1:1`(닿지 않음). 시험은 전부 대역 |
| 스키마 · 마이그레이션 | 변경 0 · 명령 0 (`Student.eywaWithdrawnAt` 은 이미 있던 칸) |
| 새 시험 | **110건** — 새 파일 6개 81건 + 기존 파일 7개에 29건(§3.2, D-127 몫 16 · 전수 전제 1 포함). 관련 **19파일 265건 초록**(D-127 뒤 · 커밋한 상태) — 학생 계정·로그인·강의·발급·원장 그대로(`authDirectorUnchanged`)·반 관리 둘 + student-auth 전수 3파일(`studentSessionSweep` · `studentRouteAccess` · `proxyStudentGate` — page·route 파일에서 모집단을 뽑아 새 화면이 저절로 든다). 🔴 그중 `studentSessionSweep` 은 **헛돌고 있었다**(§3.6) — 고쳤고 «학생 세션이 선다» 전제 시험을 더했다 |
| 변이 | **learn-screens 43/43 빨개짐** · 살아남음 0 · 보류 0 · 판정 거부 0 (①~⑦ 31 + D-127 ⑧~⑩ 12 — 탐침 있는 것 25 · 화면/Prisma/진짜 부품 18, §3.4) · 매번 원본 md5 일치. **student-auth 29/29** — 전량 다시 돌려 28/29, 🟩 ②f 가 살아남아 **전수 시험이 헛돈 것**을 찾았고(§3.6) 고친 뒤 ②f 빨개짐(§3.5). D-127 이 고친 파일을 겨누는 student-auth 여섯 다시 — **6/6 빨개짐** |
| 실물 브라우저 계측 | **27회 전부 통과** — 360 · 400 · 768 · 1366 × 로그인 · 첫 비밀번호 · 목록 · 목록(가장 큰 데이터) · 재생 · 재생(가장 긴 제목) + 어제 수업 + 발급 칸 2폭. 계측이 **픽스처 결함 하나**를 잡았다(§4) · **D-127 뒤 첫 로그인 4폭 + 잠김 1장 다시 5회 통과**(§4.1) |
| `npx prisma generate` → `npx tsc --noEmit` | **0** (D-127 뒤 다시 — 0) |
| `npm run lint` | 이 작업의 파일 **0건**(`--max-warnings=0`, 커밋 훅도 통과 · D-127 뒤 바꾼 17파일 다시 0) · 저장소 전체(D-127 전에 잰 값 — 다시 안 쟀다) **58건(오류 3 · 경고 55)** — student-auth · admin-ui 보고와 **같은 수**, 34개 파일 전부 기존 파일이고 이 작업이 바꾼 57개 파일과 **겹침 0**(대조 스크립트). 오류 3 은 `scripts/admin/bootstrap-admin.cjs` 의 `require()` |
| `npm run lint:affordance` | **0** (처음엔 2건 — CSS 의 `cursor: pointer` 두 줄. 지웠다 §3.6 · D-127 뒤 다시 0) |
| `npm run build` | **D-127 뒤 다시 exit 0** — 컴파일 21초 · TypeScript 59초 · 정적 93/93 · 라우트 목록 같음(`build-d127.log`). 처음: **exit 0** — 컴파일 51초 · `Finished TypeScript in 61s` · 정적 93/93 · 라우트 목록에 `/learn` · `/learn/login` · `/learn/password` · `/learn/watch/[id]` · `/dev/learn-hifi` · `ƒ Proxy (Middleware)`. 경고는 기존 «`package.json#prisma` 설정은 Prisma 7 에서 없어진다» 한 줄뿐. PowerShell → `cmd /c`, `DATABASE_URL=127.0.0.1:1`(개발 서버는 먼저 껐다 — `.next` 를 같이 쓰지 않게) |
| 실물 서버 연기 시험 | **11/11 통과**(D-127 전 — D-127 은 관문을 안 고쳐 다시 돌리지 않았다) — 빌드한 앱을 `next start`(DB 닿지 않음 · 임시 비밀) + `scripts/qa/smoke-student-gate.sh`. 🔴 `/learn/login` 기대값을 **404 → 200** 으로 고쳤다(화면이 생겼다). 더해 본 것: `/learn/login` 본문에 학생 폼(«오늘의 개념 · 학생» · «원장님 로그인») · `/dev/learn-hifi` → **404**(프로덕션 가드) · 로그인 안 한 `/learn/password` → 307 `/learn/login` |
| 커밋 | `289c6cf0` 코드·시험·스크립트 · `070f214a` 픽스처 200자 · KST 자정 시험 · 변이 하네스 · `6dd25a6f` 🔴 전수 시험 헛돎 고침 · `a0f53c3e` **D-127** · `086c6c07` D-127 변이 · 이 보고서 · 캡처(가지의 맨 위 커밋) — **푸시 안 함** |

---

## 1. 만든 것

### 1.1 학생 화면 네 장 — `/learn/**` (휴대폰이 먼저, 넓은 화면은 가운데 480px 한 줄)

| 주소 | 파일 | 부르는 것 |
|---|---|---|
| `/learn/login` | `components/learn/StudentLoginForm.tsx` | `POST /api/learn/login` |
| `/learn/password` | `components/learn/StudentPasswordForm.tsx` | `POST /api/learn/password` |
| `/learn` | `components/learn/LectureList.tsx` | `GET /api/learn/lectures` |
| `/learn/watch/<id>` | `components/learn/WatchScreen.tsx` + `LecturePlayer.tsx` | `GET /api/learn/lectures/{id}` · `GET /api/learn/lectures`(다음 영상 차례) · `POST /api/learn/watch` |

- 토큰·모양은 시안 `.th` 학생 토큰(`--s-*`)과 `.s-*` 규칙 그대로(`components/learn/learn.module.css`). 레이아웃 `app/learn/layout.tsx` 가 바탕만 깐다.
- **서버 액션 0** — 학생 쪽 쓰기는 전부 `/api/learn/**`(나가기도 `POST /api/learn/logout`). `proxy.ts` · `studentRouteAccess.ts` 는 **한 줄도 안 고쳤다**(허용 목록에 이미 네 화면이 있다).
- 비밀번호 칸은 숫자 4자리 — `inputmode="numeric"` · `pattern="[0-9]*"` · `maxLength=4` · 숫자 아닌 글자는 입력에서 걷는다(`pinDigits`). `autocomplete` 는 로그인 `current-password`, 바꾸기 «받은 번호» `current-password` · 새 번호 두 칸 `new-password`.
- 🔴 첫 로그인 화면: **«선생님께 받은 번호» 칸이 맨 위**(D-126 ⑹), 새 비밀번호 · 한 번 더. 규칙 줄 `숫자 4자리 · 같은 숫자 반복·연속 숫자 안 됨 · 두 칸이 같음` — 맞으면 초록 ✓(`data-met`). 판정은 계약(`studentPasswordChangeRequestSchema` → `studentNewPinSchema`)과 그 계약이 부르는 `pinRules` — 다시 적지 않았다. 틀림·잠금은 **서버 문구 그대로**(«지금 비밀번호가 맞지 않습니다.» · «잠시 뒤 다시 시도하세요.»).
- 목록: 윗줄(«오늘의수학» · 이름 · 반 · 나가기) · «오늘의 개념» · **남색 판**(가장 최근 수업 날) · 흰 카드(지난 수업). 묶음·«오늘»은 `lib/learn/lectureGroups.ts` 한 곳 — 🔴 «오늘»은 그 날이 오늘(KST)일 때만, 요일은 달력(`formatDayWithWeekday`). 강의 칸 그림은 **종이 판서 바탕에 제목**(`LectureFrame` — 원장님 판과 같은 모양, 썸네일 안 끌어옴). 상태 알약 `새로` · `n% 봄` · `끝까지 봄`(서버가 센 %).
- 학생 화면에 **AI 고지 · 잡 ID 없음** — 받는 모양(`conceptLectureForStudentSchema`)에 칸이 없고, 네 화면 시험이 본문 전체에서 `AI|보충 강의|검수한|잡 ID` 를 찾는다.

### 1.2 재생기 — 🔴 앞으로 감기는 본 곳까지만 (D-124 ⑸)

- 규칙 **한 곳**: `lib/learn/seekGuard.ts` — `clampSeekTarget(target, { maxWatched, completed, duration })`(막대로 옮길 때) · `playbackTick({ previous, current, elapsedSeconds, rate }, state)`(재생 중 250ms 감시). 뿌리는 concept-port 의 `watchRules.clampSeek` · `SEEK_JUMP_TOLERANCE_SECONDS` 를 **부른다**.
- 🔴 `watchRules.watchTick` 을 그대로 쓰지 않은 까닭: 문턱이 1.5초로 고정이라 **2배속에서 틱이 1초 밀리면**(가려진 탭은 타이머가 1초 이상으로 늦는다) 저절로 흐른 2초를 «감았다»로 읽고 되돌린다 → 되돌림이 돌아 영상이 앞으로 안 간다. `playbackTick` 은 «흐른 시간 × 배속 + 1.5초»를 저절로 흐름으로 본다. 한 번 끝까지 본 영상은 되돌리지 않는다.
- 유튜브 **nocookie** + IFrame Player API(`components/learn/youtubePlayer.ts`) — 스크립트는 재생 화면에서 처음 붙는다. 🔴 유튜브 조작 막대를 껐다(`controls 0` · `disablekb 1` · `fs 0`) — 감기는 우리 막대(`input type=range`)뿐이라 가드가 유일한 길이다. 적재 실패(스크립트 · 재생기 준비 15초) → «영상을 불러오지 못했습니다.» + «다시 시도».
- 재생기는 `PlayerFactoryContext`(`playerAdapter.ts`)로 갈아 끼운다 — 제품은 유튜브, 시험·시안 페이지는 가짜.
- 시청 보고: 재생 중 `WATCH_REPORT_INTERVAL_MS`(15초, `seekGuard.ts` 한 곳) + 멈춤 · 끝 · `visibilitychange`(hidden) · `pagehide` · 화면을 떠날 때(keepalive). 새로 본 곳이 있을 때만 보낸다. 실패는 조용히 되돌려 다음 보고가 다시 보낸다(오류를 안 띄운다). 서버가 센 %·완료로 상태 알약과 안내 문구가 바뀐다.
- 안내 문구 셋은 시안 그대로(처음 · 보는 중 «앞으로 감기는 본 곳(1:21)까지만…» · 끝까지 본 뒤).

### 1.3 원장님 발급 칸 — `수업 · 학생 관리 › 학생` (기존 `StudentList` 안)

- 학생 이름이 **단추**가 됐다(반 목록과 같은 고름 어법 `rowSelection.ts`, `aria-pressed`). 누르면 그 학생의 «오늘의 개념 로그인» 칸이 명단 아래에 선다 — 한 명씩(D-124 ⑷). 다시 누르거나 반을 바꾸면 닫힌다.
- 칸(`components/class/StudentAccountPanel.tsx`)은 이름을 처음 누를 때 불러온다(`next/dynamic` — 계약·zod 를 반 관리 첫 화면에 싣지 않게).
- 두 상태(시안 `issue()`): **발급 전** — «계정 없음 — 학생은 이 계정으로 들어와 영상만 봅니다.» · 아이디 칸(🔴 비어서 시작 — 자동 제안 없음) · `영문·숫자·-·_ 4~20자`(계약 `STUDENT_LOGIN_ID_RULE` 에서 숫자를 읽는다) · «계정 만들기». **만든 직후** — 아이디 · 발급(`9월 15일 · 원장님`) · 마지막 로그인(`없음`) · «초기 비밀번호 — 지금 한 번만 보입니다» 상자 · «비밀번호 다시 발급» · «계정 끄기».
- 끈 계정: «계정 꺼짐 — 로그인 막힘» + «계정 켜기»(시안에 없는 상태 — 최소한). 퇴원 학생: «퇴원 — 로그인 막힘» 한 줄, 발급·다시 발급·끄기 단추가 없다(계정이 있으면 아이디·발급·마지막 로그인만).
- 서버가 거부한 학생(남의 반 403 · 없는 학생 404 · 세션 없음 401) → **칸을 안 그린다**.
- 🔴 초기 비밀번호는 칸의 React 상태에만 산다 — localStorage · sessionStorage · URL · 콘솔 어디에도 안 적는다. 다른 학생을 고르면 칸이 새로 서며(`key`) 사라진다.
- 발급 API 는 student-auth 의 `/api/students/[id]/account` · `/password` 그대로 부른다(새로 안 만들었다). 단 **GET 의 모양을 바꿨다** — §7-1.

### 1.4 서버 고침 둘

- 🔴 **퇴원 학생 로그인 막기**(D-126 ⑺) — `lib/learn/accountBlock.ts` 의 `studentAccountBlocked({ disabledAt, withdrawnAt })`(꺼짐 ∪ 퇴원) **하나**를 로그인(`verifyStudentPin` — 맞는 번호도 버린 해시에 대 보고 실패 수에 든다, 문구는 «아이디 또는 비밀번호가 맞지 않습니다.») · 학생 토큰(`studentTokenFor` — 이미 든 세션은 다음 요청에서 null + 쿠키 지움) · 비밀번호 바꾸기 라우트가 같이 부른다. 퇴원 칸은 `auth.ts` 의 **학생 갈래 한 곳**(`loadStudentAccountForToken` 의 select 에 `eywaWithdrawnAt`)과 `prismaLoginStore.ACCOUNT_LOGIN_SELECT`(→ `toLoginAccount`)가 읽는다. 원장 갈래는 한 줄도 안 바뀌었다(`authDirectorUnchanged` 9/9). 감사 기록의 까닭은 `withdrawn`.
- **없는 아이디 실패 행 정리**(리드 결정) — 없는 아이디 실패를 적을 때 `updated_at` 이 24시간 넘은 행을 **오래된 차례로 최대 100행** 함께 지운다(`STUDENT_LOGIN_MISS_CLEANUP` · `LoginStore.pruneStaleMisses`). Prisma 판은 `SELECT … ORDER BY updated_at LIMIT 100` → `DELETE … WHERE key_hash IN (…) AND updated_at < ?`(고른 사이 다시 두드려진 행은 남는다). 🔴 정리가 실패해도 로그인 응답은 그대로(삼키고 오류 이름만 남긴다) — 던지면 없는 아이디에만 500 이 나서 그 차이로 아이디 존재가 샌다.

### 1.5 목록의 «수업한 날» — 계산은 `loadStudentLectureScope` 한 곳

- `lib/learn/lectureAccess.ts` 에 `progressDatesOf(rows, student)` — 차시 → 그 학생에게 기록된 **가장 최근 날**(반 진도 ∪ 개인 진도). 열린 차시의 집합 `progressUnitIdsOf` 는 **그 열쇠**다(같은 셈 — 목록과 기록이 갈라지지 않는다). `loadStudentLectureScope` 가 `recordedAt` 을 함께 읽어 둘을 한 번에 낸다.
- 계약: `learnUnitSchema` 에 `taughtOn`(YYYY-MM-DD) 한 칸 + 목록·하나 응답에 `student`(이름 · 반 — 윗줄) 한 칸(§7-2).
- 목록 조립은 `lib/learn/learnList.ts` 의 `assembleLearnList` 한 곳 — 라우트와 개발용 시안 페이지의 픽스처가 **같이** 부른다.

### 1.6 개발용 시안 페이지 · 계측 · 하네스

- `/dev/learn-hifi` — 제품 컴포넌트 그대로 + `/api/learn/**` · `/api/students/{id}/account/**` 만 가로채 픽스처로 답한다(DB 안 읽음·안 씀). 가짜 재생기(판서 판 위에서 시간만 흐름). `?screen=login|password|list|watch|issue` · `?set=mockup|stress|empty` · `?today=` · `?lecture=l4&at=52` · `?state=before|issued|disabled|withdrawn`. 이웃 dev 페이지와 같은 가드(프로덕션은 `ENABLE_RENDER_QA=1` 일 때만).
- 픽스처 `app/dev/learn-hifi/fixture.ts` — **시드 735차시** 위에 제품과 같은 셈(`progressDatesOf` → `lectureOpenToStudent` → `assembleLearnList` → 계약 검사). `mockup` = 시안 그대로(김도윤 · 중1 A반 · 강의 7편 중 게시 5) · `stress` = 가장 긴 차시 이름(41자, 초3) · 가장 긴 강의 제목(**200자**, 계약 한계) · 강의 많은 날(6편) · 지난 수업 20일치 · 긴 반 이름.
- `scripts/qa/learn-screens-layout.mjs`(실물 계측 · 캡처 — `ONLY=password,issue-locked` 로 고른 실행만) · `scripts/qa/mutate-learn-screens.ts`(변이 43 — ①~⑦ 31 + D-127 ⑧~⑩ 12).

### 1.7 D-127 — 원장님 학생 화면 검수 답 (브리프 §6 · 2026-09-15 리드)

원장님 답 «Q1 ① · Q2 ① · Q3 ① · Q4 ① · Q5 ① · Q6 ①» — Q2 · Q3 · Q4 · Q6 은 지금 그대로. 바꾼 것 둘 + 리드 결정 하나:

- 🔴 **첫 로그인 화면 «나가기»**(Q1) — `StudentPasswordForm` 맨 위에 목록 화면과 **같은 부품** `LearnTopBar`(학생 이름·반 없이 «오늘의수학 · 나가기»). 누르면 `POST /api/learn/logout` → `/learn/login`. `proxy.ts` · `studentRouteAccess.ts` 는 한 줄도 안 고쳤다 — 관문이 이미 첫 로그인 학생에게 로그아웃을 연다(`proxyStudentGate` · `studentRouteAccess` 초록). 시험은 목록 화면의 윗줄과 **모양(클래스 · 첫 글자)을 견준다** — 같은 부품이 아니면 빨갛다.
- 🔴 **발급 칸 «잠김 — N분 뒤 풀림 · 비밀번호를 다시 발급하면 바로 풀립니다.»**(Q5) — 계정 상태(`studentAccountStatusSchema`)에 `lockedUntil`(ISO | null) **한 칸**. 화면은 `lib/class/accountLock.ts` 의 `lockMinutesLeft(lockedUntil, now)` 하나로 «지금보다 뒤인가»만 보고 **올림한 분**을 센다 — 잠금 규칙(5회 · 10분)을 화면에 다시 적지 않았다(서버의 `locked` 표지도 안 본다 — 응답이 온 뒤 잠금이 끝났을 수 있다). 끈 계정 · 퇴원 계정에는 안 보인다(그쪽 줄이 먼저). 다시 발급하면 사라진다(서버가 잠금을 비우고, 칸도 `lockedUntil: null` 로 세운다). 모양은 «계정 꺼짐 — 로그인 막힘»과 같은 줄(`.blocked`).
- 🔴 **퇴원 학생 발급 API 409**(리드 결정 — 옛 §7-3) — `POST …/account`(발급) «퇴원한 학생은 계정을 만들 수 없습니다.» · `POST …/account/password`(다시 발급) «퇴원한 학생은 비밀번호를 다시 발급할 수 없습니다.» · `PATCH …/account {disabled:false}`(켜기) «퇴원한 학생은 계정을 켤 수 없습니다.»(`STUDENT_ACCOUNT_WITHDRAWN_MESSAGES`). **끄기는 된다.** 판정은 `accountBlock.ts` 에 퇴원 쪽 `studentWithdrawn` 을 나눠 두고 `studentAccountBlocked`(로그인 · 토큰 · 비밀번호 바꾸기)와 발급 부품(`issueDeps.ts`)이 **같은 함수를 부른다** — 새 판정을 적지 않았다. 소유 판정이 먼저다(남의 반 퇴원 학생은 403 — 퇴원 여부를 흘리지 않는다). 막히면 번호를 뽑지도 · 감사 기록을 남기지도 않는다. 퇴원 표시가 풀리면(동기화) 다시 된다.
- 시안 페이지 `?state=locked`(잠금 끝이 7분 30초 뒤 → «8분»).

---

## 2. 시안과 다른 점 (까닭)

| # | 시안 1안 | 구현 | 까닭 |
|---|---|---|---|
| 1 | `9월 15일 (월)` · `9월 12일 (금)` · `9월 10일 (수)` | `(화)` · `(토)` · `(목)` | 요일은 달력이 정한다(브리프 §1.1) — 2026-09-15 는 화요일 |
| 2 | 첫 비밀번호 두 칸 · 규칙 `8자 이상 · 영문과 숫자 · 두 칸이 같음` | **세 칸**(받은 번호 맨 위) · 규칙 `숫자 4자리 · 같은 숫자 반복·연속 숫자 안 됨 · 두 칸이 같음` | D-126 ⑹ · D-125 ⑶ (브리프 지시) |
| 3 | 규칙 ✓ 셋 다 초록 | 맞은 규칙만 초록 ✓, 아직이면 회색 ✓ | 시안은 값을 채운 그림이다 — 빈 칸에 «맞음»을 보이면 거짓말 |
| 4 | 입력 칸 글자 14px | **16px** | iOS 는 16px 보다 작은 입력 칸을 누르면 화면을 확대한다 → §7-6 |
| 5 | 진행 막대(코발트) + 본 곳(검은 눈금)만 | 같은 막대 + **손잡이(12px 코발트 원)** | `input type=range` 로 만들어 끌기 · 키보드 · 스크린 리더가 된다 → §7-7 |
| 6 | `1.25×` 글자 | 배속 **단추** 1× → 1.25× → 1.5× → 2× → 1× | 브리프 «배속은 된다» |
| 7 | 재생 판에 영상 속 한 장면(수식 줄) | 판서 판에 제목만 — 실제 영상은 유튜브가 그 위를 덮는다 | 장면은 제작 도구 화풍 — 05 §8.9 표 대상 아님(admin-ui 와 같다) |
| 8 | 목록에서 고른 강의에 코발트 테두리(`.s-item.on`) | 없음 | 시안은 목록과 재생을 한 판에 나란히 그려 «지금 보는 것»을 표시했다 — 실제로는 두 쪽이다 |
| 9 | 재생 화면 제목 `p` | `h1`(모양 같음) | 그 화면의 머리 — 스크린 리더 |
| 10 | «다음 영상» 글자 | 같은 모양의 **링크** | 누르면 그 영상으로 |
| 11 | 발급 칸 머리표 «발급 전» · «만든 직후» · 맥락 줄 «수업 · 학생 관리 › 중1 A반 › 김도윤 — 기존 학생 화면 안에 새로 붙는 칸» | 머리표 자리에 **학생 이름**(같은 모양) · 맥락 줄 없음 | 머리표는 상태 이름(시안 설명), 맥락 줄은 시안 설명 글이다 |
| 12 | (없음) 발급 칸을 여는 길 | 학생 이름 **단추**(반 목록과 같은 고름 어법) — 다시 누르면 닫힘 | «한 명씩»을 채우는 최소한 → §7-9 |
| 13 | (없음) 끈 계정 · 퇴원 | «계정 꺼짐 — 로그인 막힘» + «계정 켜기» · «퇴원 — 로그인 막힘» | 브리프 지시(최소한) |
| 14 | (없음) | 시안에 없던 상태를 최소한으로: 불러오는 중 · 목록 오류 + 다시 불러오기 · «아직 볼 강의가 없습니다.» · «볼 수 없는 강의입니다.» · 로그인/바꾸기 오류 줄(서버 문구) · «나가지 못했습니다.» · 발급 칸 불러오는 중/오류 · «영상을 불러오지 못했습니다.» + 다시 시도(브리프 지정) | 기능의 자리인데 시안에 모양이 없다 → §7-10 |
| 15 | 첫 비밀번호 화면에 나가기 없음 | 🔴 **윗줄 «오늘의수학 · 나가기»**(목록과 같은 부품, 이름·반은 없음) | **D-127 Q1**(원장님 답). 그 결과 «오늘의수학»이 윗줄과 로고 두 곳에 선다 → §7-7 |
| 16 | (없음) 잠긴 계정 | 🔴 발급 칸 «잠김 — N분 뒤 풀림 · 비밀번호를 다시 발급하면 바로 풀립니다.» 한 줄(꺼짐 줄과 같은 모양) | **D-127 Q5** — 문구는 브리프 §6 그대로 |

---

## 3. 시험 · 변이

### 3.1 RED → GREEN (정직하게)

- 순수 함수(`seekGuard` · `lectureGroups`) — 시험 먼저, `Failed to resolve import`(모듈 없음) RED → 구현 → GREEN(23/23).
- 서버 ③(`progressDatesOf` · `taughtOn` · 윗줄) — 새 시험 6건 RED(기존 27 초록) → 구현 → GREEN. ⑥⑦(퇴원 · 정리) — RED 5건 + 적재 실패 1파일(`accountBlock` 없음) → GREEN. 발급 칸 서버(`withdrawn` · `issuedByViewer`) — RED 3건 → GREEN(계약 잠금 시험 1건은 칸이 늘어 **의도대로** 빨개졌고 기대값을 고쳤다).
- ⚠️ **화면 두 파일(`LearnScreens` · `StudentAccountPanel`)은 RED 를 한 번도 못 봤다** — 시험을 먼저 썼지만 첫 실행이 컴포넌트를 쓴 뒤였다. 대신 변이 ①f ①g ②a~d ③b ③d ③e ④a ⑤a~e 가 이 두 파일을 빨갛게 만든다(§3.4).
- 기준(음성 대조): 바꾸기 전 관련 11파일 147건 초록을 먼저 봤다(`scratch/learn-screens/baseline.log`).
- **D-127** — 시험을 먼저 쓰고 돌려 **RED 17건 + 모듈 없음 1파일**을 봤다(`scratch/learn-screens/d127-red.log`) → 구현 → 7파일 117건 GREEN(`d127-green.log`, 첫 로그인 관문 시험 둘 포함). 발급 칸 기존 시험 다섯도 빨갰는데, 계약(strict)이 아직 모르는 `lockedUntil` 칸을 거절해 칸이 «오류»로 선 탓이다(의도한 빨강). «끄기는 된다» · «남의 반 퇴원 학생은 403» 두 건은 처음부터 초록 — 막음이 **번지지 않는지** 지키는 시험이다(변이 ⑩d 가 이것을 빨갛게 만든다).

### 3.2 새 시험 — 110건 (D-127 전 93 + D-127 16 + 전수 전제 1)

| 파일 | 건수 | 무엇 |
|---|---|---|
| `components/LearnScreens.test.tsx` (새) | 36 | 네 화면 — 로그인 · 첫 비밀번호(받은 번호 칸 · 🔴 D-127 «나가기» — 목록 윗줄과 같은 모양 · 로그아웃 API · 로그인으로) · 목록(날짜 묶음 · 오늘/어제/KST 자정 · 20일치 · 6편 날 · 가장 긴 이름/제목 · 나가기 · 401/403) · 재생(막대 가드 · 끝까지 본 영상 · 배속 · 보고 · 실패 조용히 · 적재 실패 · 404) · AI 고지 없음 |
| `components/StudentAccountPanel.test.tsx` (새) | 15 | 두 상태 · 다시 발급 · 서버 문구 · 초기 번호가 저장소·URL·콘솔에 없음 · 다른 학생 고르면 사라짐 · 끈 계정 · 끄기 · 퇴원(계정 없음/있음) · 남의 반 403 · 🔴 D-127 잠김 넷(끝 1초 전 «1분» · 막 잠김 «10분» · 끝난 잠금 줄 없음 · 다시 발급 뒤 줄 없음 · 끈/퇴원 계정엔 없음) |
| `unit/accountLockLine.test.ts` (새 · D-127) | 4 | 잠김 N — null · 끝남 · 지금 막 끝남 → 줄 없음 · 1ms/1초 전 1분 · 60초 1분 · 60.001초 2분 · 10분 · 읽을 수 없는 시각 |
| `unit/learnSeekGuard.test.ts` (새) | 14 | 본 곳 ±1초 · 뒤로 · 끝까지 본 뒤 · 배속 · 밀린 틱 · 상수 |
| `unit/learnLectureGroups.test.ts` (새) | 9 | 날짜 묶음 · 오늘/어제 · 미래 날짜 · 같은 날 여러 차시 · KST · 상태 알약 · 다음 영상 |
| `unit/studentLoginMissCleanup.test.ts` (새) | 3 | Prisma 판 정리 — 23:59 남김 · 24:01 지움 · 100행 · 방금 적은 행 |
| `unit/studentLogin.test.ts` | +9 | 퇴원 5 · 정리 4(메모리 판) |
| `unit/learnLectureAccess.test.ts` | +3 | 가장 최근 날 · 남의 진도 날짜 안 셈 · 열쇠 = 같은 셈 |
| `api/learnRoutes.test.ts` | +5 | `taughtOn` 2 · 윗줄 1 · 퇴원 2(로그인 · 든 세션) |
| `api/studentSessionPipeline.test.ts` | +2 | 퇴원 → 다음 요청 null + 쿠키 지움 · 공급자 invalid |
| `api/studentAccountIssue.test.ts` | +8 (2 고침) | 발급 칸 모양 · `issuedByViewer` · 퇴원 `withdrawn` · 🔴 D-127: `lockedUntil`(잠김 · 안 잠김) · 퇴원 409 다섯(발급 — 계정 0 · 감사 0 · 번호 안 뽑음 / 다시 발급 · 켜기 — 번호·잠금·꺼짐 그대로 / 끄기는 된다 / 표시가 풀리면 다시 된다 / 남의 반 퇴원은 403) |
| `unit/studentAccountContract.test.ts` | +1 (1 고침) | 상태 칸 잠금에 `issuedByViewer` · `lockedUntil` · 발급 칸 모양 잠금 · 🔴 D-127 퇴원 409 문구 셋 |
| `api/studentSessionSweep.test.ts` | +1 | 🔴 ⓪ 전제 — 학생 쿠키가 정말 학생 세션으로 선다(§3.6 — 이것 없이 전수가 헛돌았다) |

### 3.3 브리프 §3 ①~⑦ ↔ 시험

| 브리프 | 시험 |
|---|---|
| ① 앞으로 감기 가드(본 곳 ±1초 · 끝까지 본 뒤 · 뒤로 · 배속) | 순수 `learnSeekGuard` 14 · 배선 `LearnScreens` «막대로 안 본 곳…» · «끝까지 본 영상은 어디든» · «배속 — 한 틱에 1.9초는 2배속이면 흐른 것, 1배속이면 감은 것» |
| ② 초기 비밀번호가 저장소·URL·콘솔에 안 남는다 | `StudentAccountPanel` «발급한 뒤 모든 자리를 뒤지고…» + 실물 계측(발급 뒤 저장소 0 · 주소에 번호 없음) · 서버 쪽은 student-auth ⑥ 그대로 |
| ③ 날짜 묶음 · «오늘»(오늘 · 어제 · 여러 날) | 순수 `learnLectureGroups` · 서버 `learnLectureAccess` 3 · `learnRoutes` 2 · 화면 «오늘 수업» · «어제» · «KST 자정» · «20일치» |
| ④ 학생 화면에 AI 고지가 없다 | `LearnScreens` 네 화면 `expectNoAiNotice` · «종이 판서 — 썸네일 없음» · 서버는 student-auth 의 `learnRoutes` 그대로 |
| ⑤ 발급 칸 두 상태 + 끈 계정 + 퇴원 · 남의 반 | `StudentAccountPanel` 11 · 서버 `studentAccountIssue` 3 |
| ⑥ 퇴원 — 로그인 거부 · 든 세션 끊김 · 문구가 틀린 번호와 같다 | `studentLogin` 5 · `learnRoutes` 2 · `studentSessionPipeline` 2 |
| ⑦ 없는 아이디 실패 행 정리 경계(23:59 남김 · 24:01 지움) | `studentLogin` 4(메모리) · `studentLoginMissCleanup` 3(Prisma 판) |
| §6 첫 로그인 «나가기» — 있다 · 로그아웃 API · 로그인으로 · 관문 그대로 | `LearnScreens` «나가기 — 목록 윗줄과 같은 자리·같은 모양» · `proxyStudentGate` · `studentRouteAccess` 초록(고치지 않음) |
| §6 잠김 줄 경계 — 끝 1초 전 «1분» · 끝난 뒤 줄 없음 · 다시 발급 뒤 줄 없음 · 끈/퇴원엔 없음 | 순수 `accountLockLine` 4 · 화면 `StudentAccountPanel` 4 · 서버 `studentAccountIssue` `lockedUntil` 2 |
| §6 퇴원 학생 발급 API 409 · 끄기는 된다 · 같은 판정 | `studentAccountIssue` 5 · 계약 문구 1 · 변이 ⑩f(판정 함수 하나를 끄면 로그인 · 발급이 같이 빨갛다) |

### 3.4 변이 — `scripts/qa/mutate-learn-screens.ts` · **43/43 빨개짐** · 살아남음 0 · 보류 0 · 판정 거부 0

D-127 뒤(`086c6c07`) **전량 다시** 돌렸다 — ㉠ 음성 대조 11파일 초록 → 43 전부 빨강 → «변이한 파일 전부 원본과 일치 ✓»(`scratch/learn-screens/mutate-learn-d127.log`). 아래 ①~⑦ 은 D-127 전 첫 실행(31/31, `mutate-learn.log`)과 같은 결과다.

판정 순서는 student-auth · concept-admin 하네스와 같다(㉠ 음성 대조 10파일 초록 → ⑴ 앵커 정확히 하나 → ⑵ 파일이 바뀌었나 → ⑶ tsx 탐침 산출물이 바뀌었나(화면·Prisma 판은 탐침 없음 — 초록이면 «보류») → ⑷ 실패한 시험 **이름**). **커밋한 상태에서** 앞에서 한 번에 돌렸다(개발 서버·계측·lint 를 다 끈 뒤 — 변이가 소스를 고쳐 쓰는 동안 다른 것이 그 파일을 읽지 않게). 앵커는 커밋 훅의 prettier 가 다듬은 코드에서 떴다. 끝나고 «변이한 파일 전부 원본과 일치 ✓» · `git status -- src` 비어 있음. 로그 `scratch/learn-screens/mutate-learn.log`.

| # | 브리프 | 변이 | 탐침 전 → 후 | 빨개진 시험(일부) |
|---|---|---|---|---|
| ①a | ① | 막대로 옮길 때 본 곳을 안 본다 | `60 → 120` | 막대로 안 본 곳을 누르면 본 곳까지만(화면) · 본 곳 ±1초(순수) |
| ①b | ① | 끝까지 본 영상도 본 곳에서 막는다 | `120 → 30` | 한 번 끝까지 본 영상은 어디든 |
| ①c | ① | 뒤로 감기를 막는다 | `5 → 60` | 뒤로 감기는 자유 · 막대(화면) |
| ①d | ① | 감시 틱이 배속을 모른다 | `advance 63 → rewind 60` | 배속 — 2배속 1초에 3초는 흐른 것(순수) · 2배속이면 한 틱 1.9초는 흐른 것(화면) |
| ①e | ① | 감시 틱이 끝까지 본 영상도 되돌린다 | `advance 120 → rewind 30` | 끝까지 본 영상은 되돌리지 않는다 |
| ①f | ① 배선 | 막대가 가드를 안 부른다 | (화면) | 막대로 안 본 곳을 누르면 본 곳까지만 |
| ①g | ① 배선 | 감시 틱에 배속을 안 넘긴다 | (화면) | 배속 — 단추 · 한 틱 1.9초 |
| ②a | ② | 초기 번호를 sessionStorage 에 적는다 | (화면) | 발급한 뒤 모든 자리를 뒤지고… |
| ②b | ② | 초기 번호를 콘솔에 남긴다 | (화면) | 같다 |
| ②c | ② | 초기 번호를 주소에 싣는다 | (화면) | 같다 |
| ②d | ② | 다른 학생을 골라도 칸이 새로 안 선다(번호가 남는다) | (화면) | 같다(돌아오면 사라져 있다) |
| ③a | ③ 서버 | 수업한 날을 가장 이른 날로 센다 | `09-12 → 09-01` | 가장 최근 날(순수) · 내 개인 진도가 더 늦으면(라우트) |
| ③b | ③ | «오늘»이 날짜를 안 본다(가장 최근이면 오늘) | `[false] → [true]` | 어제 수업이면 날짜만(순수·화면) · KST 자정(화면) |
| ③c | ③ | KST(+9시)를 뺀다 | `09-16 → 09-15` | UTC 15:00 = KST 다음날 0시 |
| ③d | ③ | 묶음을 오래된 날부터 | `09-15 → 09-10` | 오늘 수업 — 남색 판이 맨 앞 |
| ③e | ③ 배선 | 목록 화면이 오늘을 UTC 로 센다 | (화면) | KST 자정을 넘긴 새벽 — 9/15 수업은 «오늘»이 아니다 |
| ④a | ④ | 재생 화면에 «AI 보충 강의» 줄(수맥 재생기를 옮기다 딸려 온다) | (화면) | ‹ 목록 · 제목 · … (AI 고지 없음) |
| ④b | ④ | 학생에게 가는 강의 모양에 고지를 싣는다 | 칸에 `disclosure` 가 생긴다 | 라우트 여럿 — 계약(strict)이 응답을 거절 |
| ⑤a | ⑤ | 퇴원 학생에게도 발급 칸 | (화면) | 퇴원 학생 — 한 줄, 발급 칸이 안 선다 · 퇴원 계정은 단추 없음 |
| ⑤b | ⑤ | 끈 계정에도 «계정 끄기» | (화면) | 끈 계정 — «계정 켜기»(끄기 대신) |
| ⑤c | ⑤ | 남의 반 학생(403)에게도 칸 | (화면) | 남의 반 학생(서버 403) — 칸을 안 그린다 |
| ⑤d | ⑤ 서버 | 발급 칸에 퇴원 여부를 안 싣는다 | `true → false` | 퇴원한 학생 — 계정이 없어도 withdrawn |
| ⑤e | ⑤ | 아이디를 자동으로 제안한다(D-125 ⑵) | (화면) | 발급 전 — 아이디 칸은 비어서 시작 |
| ⑥a | ⑥ | 막힘 판정이 퇴원을 안 본다(D-127 뒤 앵커는 `studentWithdrawn(account)` 부름) | `true → false` | 맞는 번호도 401 · 든 세션 401 · 다음 요청 null + 쿠키 지움 |
| ⑥b | ⑥ | 학생 토큰이 퇴원을 안 넘긴다 | `null → 학생 토큰` | 든 세션 — 다음 요청 null(파이프라인·라우트) |
| ⑥c | ⑥ | 로그인 저장소가 퇴원을 안 넘긴다 | `1970… → null` | 맞는 번호도 401 — 문구가 틀린 번호와 같고 실패 수에 든다 |
| ⑦a | ⑦ | 24시간 → 23시간 | `86400000 → 82800000` | 경계 23:59 남김 · 24:01 지움(메모리 · Prisma) |
| ⑦b | ⑦ | 24시간 → 25시간 | `86400000 → 90000000` | 같다 |
| ⑦c | ⑦ | 100행 → 1000행 | `100 → 1000` | 150행이 묵었으면 100행만(메모리 · Prisma) |
| ⑦d | ⑦ | 정리를 안 부른다 | `false → true` | 경계 · 100행(메모리 · Prisma) |
| ⑦e | ⑦ | Prisma 판이 가장 새 행부터 지운다 | (Prisma) | 가장 오래된 100행만 지운다 |
| ⑧a | §6 Q1 | 첫 로그인 화면에서 나가기를 뺀다(잘못 들어온 학생이 갇힌다) | (화면) | 나가기 — 목록 윗줄과 같은 자리·같은 모양, 로그아웃 API · 로그인으로 |
| ⑨a | §6 Q5 | 끝난 잠금에도 줄이 선다(«지금보다 뒤인가»를 안 본다) | `null → 0` | 끝난 잠금은 줄이 없다(화면) · 없거나 끝났거나 지금 막 끝나면 null(순수) |
| ⑨b | §6 Q5 | 남은 분을 내림한다(끝 1초 전이 «0분 뒤 풀림») | `1 → 0` | 끝 1초 전 «1분»(화면 · 순수) · 분 경계 60.001초 → 2분 |
| ⑨c | §6 Q5 | 다시 발급한 뒤에도 잠김 줄이 남는다 | (화면) | 다시 발급하면 줄이 사라진다 |
| ⑨d | §6 Q5 | 끈 계정에도 잠김 줄(꺼짐 줄이 먼저가 아니다) | (화면) | 끈 계정 · 퇴원 계정에는 안 보인다 |
| ⑨e | §6 Q5 서버 | 상태에 잠금 끝 시각을 안 싣는다 | `"1970-01-01T00:10:00.000Z" → null` | 상태 — 있으면 비밀번호 없는 모양(`lockedUntil`) |
| ⑩a | §6 409 | 퇴원 학생에게도 발급한다 | `"withdrawn_issue" → "issued"` | 발급 409 · 계정 0 · 감사 0 · 번호 안 뽑음 · 표시가 풀리면 다시 된다 |
| ⑩b | §6 409 | 퇴원 학생의 비밀번호를 다시 발급한다 | `"withdrawn_reissue" → "reissued"` | 다시 발급 · 켜기 — 409 · 번호·잠금·꺼짐 그대로 |
| ⑩c | §6 409 | 퇴원 학생의 계정을 켠다 | `"withdrawn_enable" → "enabled"` | 같다 |
| ⑩d | §6 409 | 끄기도 막는다(막는 쪽까지 막는다) | `"disabled" → "withdrawn_enable"` | 끄기는 된다 — 퇴원 학생의 켜진 계정을 끈다 |
| ⑩e | §6 409 배선 | 진짜 부품(`issueDeps`)이 발급 규칙에 퇴원을 안 넘긴다 | (Prisma 대역) | 퇴원 학생 `withdrawn` · 발급 409 · 다시 발급·켜기 409 |
| ⑩f | §6 한 판정 | 퇴원 판정 함수(`studentWithdrawn`)가 퇴원을 모른다 | `true → false` | 발급 칸 `withdrawn` · 발급 409 · 다시 발급·켜기 409 + **로그인 쪽 9건**(`studentLogin` 5 · `learnRoutes` 2 · `studentSessionPipeline` 2 — 하네스는 이름을 셋만 찍어서 같은 변이를 걸고 로그인 시험 셋을 따로 돌려 봤다, `mutate-10f-login.log` · 원본 md5 일치) — 판정이 **한 곳**이라 한 줄을 끄면 로그인과 발급이 같이 샌다 |

**변이 목록에 넣지 않은 것(겹겹 · 못 흉내 냄)**: 비밀번호 바꾸기 라우트 자체의 막힘 확인(학생 토큰이 먼저 막는다 — §7-4) · 정리의 `DELETE … AND updated_at < ?` 경합 조건(§7-5) · `auth.ts` 의 select 에서 `eywaWithdrawnAt` 을 빼는 것(그러면 모든 학생이 막힌다 — 새지 않고 닫히는 쪽이라 «가드 꺼짐»이 아니다).

### 3.5 student-auth 하네스 — 옮긴 코드에 앵커를 맞췄다

퇴원 막기 · 발급 칸 · 날짜 셈 때문에 student-auth 의 코드가 움직였다. 하네스(`scripts/qa/mutate-student-auth.ts`)의 앵커가 옛 줄을 가리키면 ⑴ «앵커 0개»로 **판정 거부**가 날 자리라, 옮긴 코드에 맞춰 고쳤다(판정 대상 · 탐침은 그대로):

| 변이 | 옛 앵커 | 새 앵커 | 까닭 |
|---|---|---|---|
| ④a 토큰이 꺼짐을 안 본다 | `if (!row \|\| row.disabledAt !== null \|\| !row.student) return null;` | `studentAccountBlocked({ disabledAt: row.disabledAt, …` 의 `disabledAt: row.disabledAt,` → `null` | 꺼짐 ∪ 퇴원이 한 함수로 모였다 |
| ⑤ 반 소유자를 안 본다 | `return "not_owner";` | `return { failure: "not_owner" };` | 소유 판정이 퇴원 여부를 같이 돌려준다(`ownedStudent`) |
| 잠금-6 꺼진 계정도 들인다 | `account.disabledAt === null ? account.passwordHash : null` | `studentAccountBlocked(account) ? null : account.passwordHash` | 같은 함수 |
| 강의-3 남의 개인 진도도 센다 | 탐침 행에 `recordedAt` 없음 | 탐침 행에 `recordedAt: new Date(0)` | 진도 행이 날짜를 들고 온다(`progressDatesOf`) |
| (탐침 머리) `ROW.student` | `{ name }` | `{ name, eywaWithdrawnAt: null }` | 토큰이 학생의 퇴원 칸을 읽는다 — 없으면 막힘으로 읽혀(닫히는 쪽) 탐침이 헛돈다 |

**다시 돌린 결과(29 전량, 커밋한 상태에서):** 빨개짐 28/29 · 🟩 **②f 살아남음**(학생 세션에 원장 모양 `user.id` 를 싣는다 — 기존 API 가 학생에게 열린다) · 판정 거부 0 · 원본 md5 일치(`mutate-student-auth.log`). 까닭은 ②f 가 보는 단 하나의 시험 — 학생 세션 전수 — 의 대역이었다(§3.6). 고치고(`6dd25a6f`) ②f 만 다시: 🟥 **빨개짐**(학생 세션 → 기존 API 전수 · 서버 액션 전수, `mutate-auth-2f.log`). 나머지 28 은 전수 파일을 시험으로 쓰지 않으므로(하네스에서 `SWEEP` 을 쓰는 변이는 ②f 하나) 결과가 그대로다 → **29/29**.

D-127 이 `issueStudentAccount.ts` 와 계약을 고쳤으므로 그 둘을 겨누는 여섯(⑤ · ⑥a · ⑥b · 잠금-1 · 잠금-2 · 잠금-7)을 다시 돌렸다: **6/6 빨개짐** · 원본 md5 일치(`mutate-auth-d127.log`). ⑤(반 소유자를 안 본다)는 D-127 의 새 시험 «남의 반 퇴원 학생은 여전히 403 — 소유 판정이 먼저»도 빨갛게 만든다 — 소유 판정이 퇴원 판정보다 앞이라는 순서가 시험에 걸려 있다.

### 3.6 그 밖에 잡은 것

- 🔴 **student-auth 의 «학생 세션 → 기존 API 전수»가 헛돌고 있었다** — 변이 ②f(학생 세션에 원장 모양 `user.id` 를 싣는다 — 기존 API 가 학생에게 열린다)가 **살아남아서** 드러났다. 까닭: 이 작업이 학생 토큰 판정에 퇴원(`student.eywaWithdrawnAt`)을 넣었는데, 전수 시험(`studentSessionSweep.test.ts`)의 가짜 DB 가 돌려주는 계정 행에는 그 칸이 **없었다**(`student: { name }`). 판정은 닫히는 쪽이라(`undefined !== null` → 막힘) 학생 토큰이 조용히 null 이 되고, 전수는 **«로그인 안 한 요청» 대 «로그인 안 한 요청»**을 견주며 초록이었다 — 라우트 × 메서드 전부와 서버 액션 전부가. 고친 것: 대역 행에 `eywaWithdrawnAt: null` · 전수 앞에 **«⓪ 전제 — 학생 쿠키로 auth() 를 부르면 student 가 선다»** 시험(옛 대역으로 돌려 빨간 것을 봤다 — «학생 세션이 안 섰다»). 그 뒤 ②f 는 **빨개진다**(학생 세션 전수 · 서버 액션 전수 둘 다). 교훈 후보(20번 문서): **«세는 쪽이 셀 수 있는지를 먼저 센다» — 새 판정 칸을 넣으면 그 칸을 모르는 대역이 «닫히는 쪽»으로 조용히 막혀, 막힘을 보는 시험이 «막혔다»를 참으로 읽는다.** 「2026-09-05 주석이 있다고 단언한 가드가 없었다」 · 「2026-08-21 가드가 0을 내면 못 센다일 수 있다」와 같은 결이다.

- **D-30 검사가 CSS 두 줄을 잡았다** — `.item`(강의 링크)과 `.primary`(단추)에 `cursor: pointer` 를 적었는데, 검사는 «선택자 이름이 컨트롤처럼 보이는가»로 본다. 손가락은 `globals.css` 가 실제 링크·단추에 이미 준다 → 두 줄을 지웠다(다시 적지 않는다).
- **개발 서버의 «2 Issues»** — 네 화면 모두 `[auth][error] MissingSecret` 둘이었다. 이 워크트리에 `.env` 가 없어 루트 레이아웃의 `AccountActivity`(→ `auth()`)가 비밀을 못 찾은 것 — 화면 코드와 무관. 임시 무작위 `AUTH_SECRET` 으로 다시 띄워 **콘솔 오류 · 경고 0**(네 화면)을 확인했다. 계측 스크립트는 개발 서버의 알약을 숨기고 찍는다.

---

## 4. 실물 브라우저 계측 — 27회 전부 통과 + D-127 다시 5회 통과 (`scripts/qa/learn-screens-layout.mjs`)

대상 `/dev/learn-hifi`(개발 서버, `DATABASE_URL=127.0.0.1:1` · 임시 `AUTH_SECRET`). 판정: 본문 가로 넘침 ≤ 1px · 잎 글자 요소 중 가로로 잘린 것 0 · 윗줄이 화면 안 · 휴대폰 폭은 화면 전체 / 768 이상은 가운데 480px 한 줄(양옆 여백 차 ≤ 2px) · 목록은 날짜 묶음 수 · 남색 판 강의 수 · «오늘» 표시 · 가장 긴 제목 200자 안 잘림 · 가장 긴 차시 이름 3줄 안 · 재생 막대 안 넘침 · 영상 판 16:9. 가장 긴 제목·차시는 **페이지가 스스로 찾는다**(가장 긴 글자 — 손으로 안 적는다).

| 실행 | 360 | 400 | 768 | 1366 |
|---|---|---|---|---|
| 로그인 | 넘침 0 · 줄 360 | 0 · 400 | 0 · 480(가운데) | 0 · 480(가운데) |
| 첫 비밀번호(세 칸) | 0 · 360 | 0 · 400 | 0 · 480 | 0 · 480 |
| 목록 — 시안(김도윤 · 3일 · 5편) | 묶음 3 · 남색 판 1 · «오늘» ✓ | 같다 | 같다 | 같다 |
| 목록 — 가장 큰 데이터(21일 · 6편 날) | 묶음 21 · 남색 판 6 · 제목 200자 **10줄** · 차시 41자 2줄 | 200자 8줄 · 41자 2줄 | 200자 6줄 · 41자 1줄 | 200자 6줄 · 41자 1줄 |
| 목록 — 어제 수업(오늘 = 9/16) | — | «오늘» 없음 ✓ | — | — |
| 재생 — 시안(l4 · 0:52 · 본 곳 1:21) | 16:9 ✓ · 막대 넘침 0 | 같다 | 같다 | 같다 |
| 재생 — 가장 긴 제목 | 200자 7줄 | 6줄 | 5줄 | 5줄 |
| 발급 칸(발급 → 번호 → 끄기 · 퇴원) | — | 넘침 0 · 저장소 0 · 주소에 번호 없음 | — | 넘침 0 · 저장소 0 · 주소에 번호 없음 |

모든 실행에서 잘린 글자 0 · 본문 넘침 0. 200자 제목이 휴대폰에서 10줄로 서는 것은 **잘림이 아니라 줄바꿈**이다(판정은 «잘리지 않는가» — 줄 수 상한은 두지 않았다, 계약 한계가 200자다).

**계측이 잡은 결함 — 픽스처가 스스로를 속였다:** «가장 긴 강의 제목 — 계약 한계 200자를 꽉 채운다»라고 적은 픽스처가 실제로는 **192자**였다(`slice(0, 200)` 만 하고, 원문이 모자랐다). 캡처는 멀쩡해 보였고 화면 시험도 초록이었다 — 시험이 «그 제목이 다 나오는가»만 보고 «그 제목이 정말 가장 긴가»는 안 봤다. 계측의 `chars >= 200` 판정이 8회 빨갛게 잡았다. 200자로 채우자 둘째 차시의 « (이어서)» 가 붙어 206자가 되어 **계약이 픽스처를 거절**했다(시험 2건 빨강) — 그것도 고쳤다. 지금은 시험이 `LEARN_HIFI_LONGEST_TITLE` 의 길이(200)를 잠근다.

캡처(`scratch/learn-screens/`): `side-by-side-{login,password,list,watch,issue}.png`(시안 1안 휴대폰 ↔ 구현 360·400) · `{login,password,list,list-stress,watch,watch-stress}-{360,400,768,1366}.png` · `list*-full.png` · `list-yesterday-400.png` · `issue-{before,issued,disabled,withdrawn}-{400,1366}.png` · `mockup-*.png` · `layout.json` · D-127: `issue-locked-400.png` · `layout-password+issue-locked.json`

### 4.1 D-127 — 첫 로그인 · 잠김만 다시 (`ONLY=password,issue-locked`, 개발 서버 · 임시 비밀 · DB 닿지 않음)

| 실행 | 360 | 400 | 768 | 1366 |
|---|---|---|---|---|
| 첫 비밀번호 — 윗줄 «오늘의수학 · 나가기» + 세 칸 | 넘침 0 · 줄 360 · 잘림 0 · 윗줄 화면 안 | 0 · 400 | 0 · 480(가운데) | 0 · 480(가운데) |
| 발급 칸 «잠김»(`state=locked` — 끝이 7분 30초 뒤) | — | 넘침 0 · «잠김 — 8분 뒤 풀림 · 비밀번호를 다시 발급하면 바로 풀립니다.» 두 줄로 섬(잘림 0) · «비밀번호 다시 발급» → 줄 사라짐 | — | — |

- 다시 찍은 것: `side-by-side-password.png`(시안 ↔ 360 · 400) · `issue-locked-400.png`. 첫 로그인은 계측이 네 폭을 돌며 `password-{360,400,768,1366}.png` 도 **같이 새로 찍었다** — 옛 PNG 는 «나가기»가 없는 모양이라 남겨 두면 지금과 다른 화면이 커밋된다. 목록 · 재생 · 발급 칸 넷 · 로그인은 D-127 전 캡처 그대로다(바뀌지 않은 화면).
- 콘솔: 두 화면 **오류 · 경고 0**(400 · 임시 `AUTH_SECRET`) — 첫 로그인은 «나가기»까지 눌러 봤다(로그인 화면으로 간다), 잠김은 학생 이름을 눌러 칸을 세운 뒤(`scratch/learn-screens/console-probe-d127.mjs` — 커밋 안 함).

---

## 5. 관문

| 관문 | 결과 |
|---|---|
| `npx prisma generate` → `npx tsc --noEmit` | **0** (처음 돌렸을 때 3건 — 메모리 저장소의 `reserveAttempt` 가 `LockState` 형 변수에 `updatedAt` 을 넣음. 고친 뒤 0) |
| `npm run lint` | 이 작업의 파일 0 · 저장소 전체 58(오류 3 · 경고 55 — 기존, 겹침 0) |
| `npm run lint:affordance` | **0** |
| 관련 vitest (`--maxWorkers=1`) | D-127 뒤 **19파일 265건 초록**(`related-d127.log`) — `learnSeekGuard` · `learnLectureGroups` · `learnLectureAccess` · `studentLogin` · `studentLoginMissCleanup` · `studentAccountContract` · `accountLockLine` · `conceptStudentLecture` · `learnRoutes` · `studentSessionPipeline` · `studentAccountIssue` · `authDirectorUnchanged` · `LearnScreens` · `StudentAccountPanel` · `ClassManage` · `ClassManageWorkflow` + 전수 셋. (D-127 전 «16파일 239건»은 전수 둘을 포함한 목록이었다 — 지금 목록은 그 16 + `studentSessionSweep` · `conceptStudentLecture` · `accountLockLine`) |
| student-auth 전수 | `studentSessionSweep`(라우트 전수 — 학생 API 6 · 발급 2 포함 · 🔴 ⓪ 전제 더함) · `studentRouteAccess` · `proxyStudentGate`(page·route 파일에서 모집단 — 새 화면 넷 · `/dev/learn-hifi` 가 저절로 들어감) — 위 19파일 안에서 초록. 🔴 **D-127 전 «27건 초록»의 `studentSessionSweep` 은 헛돈 초록이었다**(§3.6) |
| `npm run build` | **exit 0**(§0 — D-127 뒤 다시 exit 0) |
| 실물 서버 연기 시험 | **11/11** + 더 본 것 셋(§0) |
| 실물 브라우저 계측 | **27/27**(§4) · 네 화면 콘솔 오류·경고 **0**(임시 `AUTH_SECRET`) |
| 커밋 훅(lint-staged) | 커밋마다 지났다(`eslint --fix` · `prettier --write` · 어포던스) — 앵커는 prettier 가 다듬은 코드에서 떴다 |
| 전체 관문 `npm run test` | **안 돌렸다** — §7-15 |

---

## 6. 못 본 것

1. **실제 Postgres** — 로컬 DB 가 없다(이 기계엔 Docker 없음). 퇴원 막기의 `student` 관계 select · 정리의 `ORDER BY … LIMIT` · `DELETE … IN (…) AND updated_at < ?` · D-127 의 `lockedUntil` 칸 · 퇴원 409 는 가짜 DB(`learnTestDouble`) 위에서만 돌았다. 🔴 특히 **Prisma `@updatedAt` 이 `updateMany`(잠금 `lock`)에서도 찍히는지**에 «하루 넘은 행은 잠겨 있을 수 없다»가 기대고 있다 — 실제 DB 에서 한 번 볼 것.
2. **실제 유튜브** — 가짜 영상 ID 라 IFrame API · nocookie 호스트 · `controls 0` 상태의 실물 재생 · 학교 망 차단 때의 «영상을 불러오지 못했습니다»를 실물로 못 봤다(시험·시안 페이지는 가짜 재생기). `next.config.ts` 에 CSP 가 없어 막히지는 않을 것으로 보이나 확인 안 함.
3. **실제 학생 세션으로 도는 네 화면** — 학생 토큰은 요청마다 DB 에서 계정을 다시 읽는다. DB 없이 `next start` 로는 학생 세션이 안 선다(student-auth §7-2 와 같다). 관문 · API 는 진짜 Auth.js 시험으로, 화면은 가로채기 픽스처로만 봤다.
4. **실제 휴대폰** — 폭은 Chromium 창으로만 쟀다(iOS Safari 의 입력 확대 · `playsinline` · `pagehide` keepalive 는 실물 미확인).
5. **발급 칸의 작업실 안 모양** — 캡처는 개발용 시안 페이지(옛 반 관리 명단 모양)다. 작업실(`TeachingView`)은 `.classContent` 가 단추 44px · 입력 48px 을 덮어쓴다 — 실제 로그인한 원장님 화면으로는 못 봤다.
6. **전체 관문 `npm run test`** — 돌리지 않았다(§7-15). 이 작업이 건드린 파일을 쓰는 시험(관련 19파일 — student-auth 전수 셋 포함)만 돌렸다. 공용 파일 중 이 작업이 고친 것: `studentAccount.contract.ts` · `learnTestDouble.ts` · `memoryLoginStore.ts` · `StudentList.tsx`(반 관리 — `ClassManage` 두 시험 파일은 초록) · `auth.ts`(학생 갈래 한 줄) · D-127: student-auth 가 만든 발급 규칙 `issueStudentAccount.ts` · `issueDeps.ts` · `accountRoutes.ts` · `accountBlock.ts`(퇴원 쪽을 `studentWithdrawn` 으로 나눔).

---

## 7. 리드가 정할 것

**계약 · 서버 (student-auth 가 만든 것을 바꿨다)**

1. 🔴 **`GET /api/students/{id}/account` 의 모양을 바꿨다** — `{ data: 상태 | null }` → `{ data: { withdrawn, account: 상태 | null } }`(`studentAccountPanelResponseSchema`). 발급 칸은 계정이 **없어도** 퇴원 여부를 알아야 «퇴원 — 로그인 막힘»을 그릴 수 있는데, 학생 명단(`StudentEntity`)에는 퇴원 칸이 없고 그것을 넓히면 반 관리 전체의 계약이 흔들린다. 계정 상태에 `issuedByViewer`(발급한 사람이 지금 보는 원장님인가 — 시안 «9월 15일 · 원장님»)도 더했다. `studentAccountStatusResponseSchema` 는 이제 **PATCH 전용이라 null 을 안 받는다**. student-auth 시험 1건(«상태 — 계정이 없으면 data: null»)을 새 모양으로 고쳤다.
2. **목록 · 하나 응답에 `student`(이름 · 반) 칸을 더했다** — 브리프는 «`learnUnitSchema` 에 칸 하나(`taughtOn`)»라 했지만, 윗줄의 «중1 A반»을 얻을 곳이 없었다(세션 `student` 에는 이름뿐 — 세션 모양을 넓히면 student-auth 의 토큰 잠금 시험이 흔들린다). 서버는 `loadStudentLectureScope` 가 이미 읽는 학생 행에 반을 붙여(`include: { class: true }`) 싣는다.
3. ✅ **정해졌다(D-127 · 리드)** — 퇴원 학생에게는 발급 · 다시 발급 · 켜기 API 도 409, 끄기는 된다. 만들었다(§1.7). ~~퇴원 학생에게 서버는 여전히 발급을 받는다 — 칸만 발급을 안 그린다.~~
4. **비밀번호 바꾸기 라우트의 막힘 확인(`studentAccountBlocked`)은 겹겹이다** — 학생 토큰이 먼저 막아 요청이 라우트까지 못 오므로, 라우트의 확인만 지우는 변이는 시험이 못 가른다(그래서 변이 목록에 넣지 않았다 — admin-ui §3.3 의 «겹겹»과 같다).
5. **정리의 경합 조건**(`DELETE … AND updated_at < ?` — 고른 사이 다시 두드려진 행은 남긴다)은 끼어들기를 흉내 낼 수 없어 시험이 없다. 코드 리뷰로만 지켜진다.
6. ✅ **D-128 ⑷(리드) — 합쳤다.** `src/lib/kstDate.ts` 한 곳(찾아보니 `daily-review` · `conceptFormat` 까지 네 곳이었다 — 다시 적으면 `kstDate.test.ts` 가 운다). **KST 날짜 셈이 두 곳** — `adminService.kstToday`(원장님 판 · 서버) · `lectureGroups.kstDateOf`(학생 목록 · 화면). 식은 같다(`+9시 → YYYY-MM-DD`). 원장님 쪽 파일을 안 건드리려고 합치지 않았다 — 합칠지.

**원장님께 여쭐 것 (D-07 — 모양 · 문구)** — 🔴 **D-127 로 답을 받았다**(검수 페이지 Q1~Q6 = 아래 7~12, 전부 ①). 7 · 11 은 만들었고 8 · 9 · 10 · 12 는 지금 그대로다.

7. ✅ **Q1 ① — 둔다. 만들었다(§1.7).** ~~첫 비밀번호 화면에 «나가기»가 없다~~(시안 그대로) — 다른 학생 아이디로 잘못 들어온 학생은 받은 번호를 모르면 **갇힌다**(쿠키를 지우거나 30일). 관문은 이미 나가기를 연다(`EXIT_RULES` — D-77 «잘못된 계정에 갇히면 안 된다»). 윗줄 «나가기» 한 줄을 둘지.
8. ✅ **Q2 ① — 지금 그대로.** **입력 칸 16px**(시안 14px) · **재생 막대 손잡이**(12px 코발트 원) · **배속 순환**(1 → 1.25 → 1.5 → 2) — 캡처 `side-by-side-*.png` 로 확인 요망.
9. ✅ **Q3 ① — 지금 그대로.** **발급 칸을 여는 길** — 학생 이름을 누르면 명단 아래에 칸이 선다(다시 누르면 닫힘). 시안에는 여는 길이 없다(칸 두 장만). 작업실 안에서는 이름 단추가 옅은 코발트 면으로 고른 표시가 된다(`TeachingView.module.css` 의 `aria-pressed` 규칙).
10. ✅ **Q4 ① — 지금 그대로.** **시안에 없던 상태 전부**(§2 #13·#14) — 특히 «계정 켜기»만 있는 끈 계정(다시 발급 숨김) · 퇴원 계정은 단추 없음 · 목록이 비었을 때 «아직 볼 강의가 없습니다.».
11. ✅ **Q5 ① — «잠김 — N분 뒤 풀림» 한 줄. 만들었다(§1.7).** ~~잠긴 계정 표시~~ — 연속 5회 틀려 10분 잠긴 학생도 발급 칸은 여느 계정과 같다(«비밀번호 다시 발급»이 잠금을 푼다). 원장님께 «잠김» 한 줄을 보일지.
12. ✅ **Q6 ① — 지금 그대로.** **학생 화면의 문구** — 로그인 «들어가는 중…» · 첫 비밀번호 «두 칸이 같지 않습니다.» · 재생 «볼 수 없는 강의입니다.» · «영상을 불러오지 못했습니다.»(브리프 원문은 마침표 없음 — 다른 화면과 맞춰 붙였다).

**값 · 운영**

13. 시청 보고 간격 **15초** · 감시 틱 **250ms** · 스크립트/재생기 준비 한도 **15초** — `seekGuard.ts` · `youtubePlayer.ts` 한 곳.
14. **이 워크트리에는 `.env` 가 없다** — 개발 서버가 `AUTH_SECRET` 을 못 찾아 루트 레이아웃의 `auth()` 가 오류를 찍었다(«2 Issues»). 계측·연기 시험은 임시 무작위 비밀로 돌렸다. 새 워크트리 안내에 넣을지(메모리 후보).
15. 전체 관문 `npm run test` 는 **돌리지 않았다** — 관련 19파일 265건(전수 셋 포함 · D-127 뒤)만. 이 기계가 다른 세션과 메모리를 나눠 쓰는 중이다(남은 메모리 3~4GB). 병합 검수 때 한 번 돌려 주길 바란다.
16. 캡처 PNG 를 `scratch/learn-screens/` 에 커밋했다(admin-ui 와 같은 관례). 로그(`*.log`)는 커밋하지 않았다.

**D-127 뒤 새로 정할 것**

17. ✅ **D-128 ⑴ — 원장님 17 ①: 큰 로고를 뺐다.** **첫 로그인 화면에 «오늘의수학»이 두 번** — 윗줄(목록과 같은 부품)과 그 아래 로고. 브리프 «같은 자리 · 같은 모양»을 그대로 따랐다. 로고 쪽을 줄일지(D-07 — 모양) → 캡처 `side-by-side-password.png`.
18. ✅ **D-128 ⑵ — 원장님 18 ①: 윗줄에 이름만(페이지가 세션에서 읽어 넘긴다).** **첫 로그인 윗줄에는 이름 · 반이 없다** — 반은 목록 API 가 주고(§7-2) 이 화면은 목록을 부르지 않는다. 세션에 이름은 있으니 이름만이라도 둘지.
19. ✅ **D-128 ⑶(리드) — N 이 바뀌는 순간마다 다시 센다(`lockLineNextChangeMs`), 끝나면 줄이 사라진다.** **잠김 줄은 칸이 선 때의 시각으로 센다** — 칸을 열어 둔 채 몇 분이 지나도 N 이 줄지 않고, 잠금이 끝나도 줄이 남는다(학생 이름을 다시 누르면 맞다). 매 분 다시 셀지 — 시안에 없는 움직임이라 넣지 않았다.
20. **409 문구 셋** — 발급은 브리프 원문, 다시 발급 · 켜기는 «같은 결»로 지었다(«퇴원한 학생은 비밀번호를 다시 발급할 수 없습니다.» · «퇴원한 학생은 계정을 켤 수 없습니다.»). 칸이 퇴원 학생에게 단추를 안 그리므로 원장님 눈에는 거의 안 띈다 — 칸을 연 뒤 퇴원 동기화가 돌고 단추를 누르면 오류 줄에 서버 문구 그대로 나온다.
