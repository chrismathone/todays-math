# REPORT-01 — 오늘의 개념 ⑥″ 학생 계정·로그인 뒷단 (워크트리 `student-auth`, 2026-09-15)

브리프: `docs/planning/tracks/briefs/todays-concept-student-auth.md` (§1~§7) · 결정 D-123 · D-124 · D-125
브랜치: `chrismathone/student-auth` · 커밋 계정 `SUN <chrismathone@gmail.com>` · **푸시 안 함**

## 0. 한눈에

| 항목 | 결과 |
|---|---|
| 만든 것 | 학생 로그인(Auth.js 공급자 `student`) · 학생 관문(proxy 학생 갈래 + 허용 목록) · 연속 5회 실패 10분 잠금 · 원장 발급 API 4(발급·상태·끄기/켜기·다시 발급) · 학생 API 6(`/api/learn/**`) · 스키마 초안(표 둘) + **미적용** 마이그레이션 + 적용기 |
| 화면 | **0** (D-07 — page·layout·component 한 줄도 없음) |
| 공유 DB | **접속 0 · 쓰기 0** — 시험은 전부 대역. 빌드·스키마 diff 는 닿지 않는 `127.0.0.1:1` 로 돌렸다 |
| 마이그레이션 명령 | 0 — `prisma migrate diff`(스키마끼리)만 |
| 새 시험 | 10파일 **117건** — 기존 관련 시험(auth·proxy·route·concept)과 함께 26파일 **306건 초록**(§6) |
| ① 원장 그대로 | 특성 시험 9건을 **바꾸기 전 코드에서 먼저 초록**으로 보고(`git diff` 빈 채), 바꾼 뒤 **한 글자도 안 고치고** 초록. 쿠키 토큰·`auth()`·`/api/auth/session` 모양을 `toStrictEqual` 로 |
| ② 전수 | 라우트 파일 70 × 내보낸 메서드 = **94쌍 전부** 통과 — 81쌍 401→401, 공개 13쌍은 학생 응답이 로그인 안 한 요청과 **글자까지 같다**(§3) · 서버 액션 1/1 · `auth()` 부르는 파일 전부 갈래 |
| ③ 관문 | page 54 · route 76 파일에서 뽑은 경로 × 메서드 6 — 학생이 지나가는 요청의 **집합**이 기대 목록과 정확히 같다(첫 로그인 학생 따로) |
| ④ ⑤ ⑥ | 초록 — 진짜 Auth.js 로 «꺼짐·지워짐 → 다음 요청 null + 쿠키 지움» / 남의 반 403 · 계정 0 / 평문 0(DB·감사·콘솔) · 응답에 한 번 |
| 변이 | **29/29 빨개짐** · 살아남음 0 · 판정 거부 0 (브리프 ①~⑥ 17 + 잠금 7 + 강의 3 + 시청 2). concept-port 변이 ⑫ 다섯도 판정을 옮긴 뒤 **5/5**. 커밋한 뒤 앞에서 묶음 여섯으로 — 묶음마다 git 원본 대조 깨끗(§5) |
| `npx prisma generate` → `npx tsc --noEmit` | **0** |
| `npm run lint` | 이 작업의 파일 **48개 0건**(`--max-warnings=0` · 커밋 훅도 통과). 저장소 전체는 **58건(오류 3 · 경고 55)** — 오류 3 은 전부 `scripts/admin/bootstrap-admin.cjs` 의 `require()`(기존 파일 — concept-port 보고와 같은 수), 경고 55 도 전부 기존·스크래치 파일. **이 작업 파일은 한 건도 없다** |
| `npm run build` | **통과** — 컴파일 30.5초 · `Finished TypeScript in 25.8s` · 정적 85/85 · 라우트 목록에 `/api/learn/**` 6 · `/api/students/[id]/account` 2 · **`ƒ Proxy (Middleware)`**(Next 16 이 `proxy.ts` 를 관문으로 읽었다). ⚠️ Git Bash 로 띄운 빌드는 세 번 떨어졌다(형 검사가 고치던 시험 파일을 읽음 1 · 메모리 부족 종료 1 · Turbopack PostCSS 워커 `0xc0000142` 2) — PowerShell→`cmd /c` 로 띄우니 통과(§6.2-8·9) |
| 실물 서버 연기 시험 | **통과 11/11** — `next start` + `scripts/qa/smoke-student-gate.sh`. 로그인 안 한 사람의 `/learn`·`/learn/password`·`/learn/watch/x` → 307 `/learn/login` · `/learn/login` 은 관문을 지남(404 — 화면 없음) · `/api/learn/lectures` 401 · 형식이 틀린 로그인 400(DB 전) · 비밀번호 바꾸기 401 · `/` 200 · `/studio` → `/login` · 원장 계정 상태 API 401 · 공급자는 `credentials`·`student` 둘(OAuth 없음). **학생 세션 갈래는 DB 가 없어 실물로 못 태웠다**(§7-2) |
| 전체 관문 `npm run test` | **아직 못 잼** — 첫 시도(`--maxWorkers=2`)는 **시스템 메모리 부족으로 강제 종료**(다른 오르카 세션들과 메모리를 나눠 씀 — 남은 메모리 2.2GB/15.8GB). 끊기기 전까지 **71파일 초록 · 실패 0**. 워커가 죽은 뒤 vitest 본체만 멈춰 남아 있어 직접 껐다. 재시도(`--maxWorkers=1`, PowerShell→cmd)가 이 보고를 커밋할 때 **돌고 있다** — 결과는 이 칸을 고쳐 다음 커밋으로 올린다. **관련 시험(26파일 306건)은 따로 초록**이다(브리프 §4 의 «관련 vitest») |

---

## 1. 바꾼 곳

### 1.1 기존 파일 8

| 파일 | 무엇 | 원장 동작 |
|---|---|---|
| `src/lib/auth.ts` | 학생 Credentials 공급자 `student` 추가 · `jwt`/`session` 콜백 **맨 앞**에 학생 갈래(원장 줄은 그대로 — `jwt` 가 매개변수 `account` 를 더 받을 뿐) · `Session.user` 를 **선택(`?`)** 으로 · `Session.student`/`JWT.student` 추가 | 무변경(① 특성 시험) |
| `src/proxy.ts` | 학생 갈래를 **맨 앞**에(허용 목록으로 끝낸다) · 로그인 안 한 사람의 `/learn/*` → `/learn/login` | 원장 갈래 줄 무변경 |
| `src/lib/routeAccess.ts` | 경로 문법 컴파일러 둘을 **내보내기만**(`compileRoutePattern`·`normalizeRoutePathname`) — 학생 관문이 같은 문법을 쓴다(두 벌 금지) | 판정 무변경 |
| `src/contracts/common.contract.ts` | 에러 코드 `TOO_MANY_ATTEMPTS`(429 — 잠금) 하나 추가 | — |
| `src/lib/concept/initialPassword.ts` | 판정 둘(`isPinFormat`·`isEasyPin`)을 `pinRules.ts` 로 **떼어 내고 다시 내보냄** — 규칙 한 글자도 안 바꿈(§2.6) | — |
| `scripts/qa/mutate-concept-port.ts` | 위 때문에 concept-port 변이 ⑫ ⑫′ ⑫″ 의 대상 파일만 `pinRules.ts` 로(+ 커밋 훅의 prettier 줄바꿈) | — |
| `prisma/schema.prisma` | 모델 `StudentAccount`·`StudentLoginMiss` + 역관계 둘(`Student.studentAccount`·`User.studentAccountsIssued`) | — |
| `vitest.config.mts` | `server.deps.inline: ["next-auth"]` — **진짜 next-auth 를 vitest 로 태우려고**(§2.1) | — |

### 1.2 새 파일 42

```
계약     src/contracts/studentAccount.contract.ts         아이디 규칙·숫자 4자리·문구·잠금 상수·요청/응답 모양(원장 계약과 따로 — 브리프 §7)
규칙     src/lib/studentRouteAccess.ts                     학생 관문 허용 목록(순수) — STUDENT_CAPABILITIES
         src/lib/learn/studentLogin.ts                     로그인 핵심 — 정규화·꺼짐·잠금(저장소 주입)
         src/lib/learn/studentSession.ts                   학생 토큰·세션 모양(user.id 없음) · StudentLoginError
         src/lib/learn/issueStudentAccount.ts              발급·다시 발급·끄기/켜기·상태(반 소유 판정 포함, 의존 주입)
         src/lib/learn/lectureAccess.ts                    강의가 이 학생에게 열렸나 — 목록·하나·기록이 같이 부르는 판정
         src/lib/learn/watchReport.ts                      시청 보고 → 기록 (서버가 %를 다시 센다)
         src/lib/concept/pinRules.ts                       isPinFormat·isEasyPin (initialPassword.ts 에서 떼어 냄)
서버부품 src/lib/learn/pinHash.ts                          bcrypt(원장과 같은 비용 10)·버린 해시·없는 아이디 HMAC 열쇠
         src/lib/learn/prismaLoginStore.ts                 잠금 원자 연산의 Prisma 판(조건부 UPDATE · native upsert)
         src/lib/learn/loginDeps.ts · issueDeps.ts         진짜 부품 묶음
         src/lib/learn/studentRequest.ts                   getStudentSession · requireStudent(학생 API 의 스스로 확인)
         src/lib/learn/studentLectures.ts                  학생 한 줄 + 진도 차시 읽기
         src/lib/learn/accountRoutes.ts                    발급 실패 갈래·다른 사이트 거부·no-store
라우트   src/app/api/students/[id]/account/route.ts        GET 상태 · POST 발급 · PATCH 끄기/켜기 (원장)
         src/app/api/students/[id]/account/password/route.ts  POST 다시 발급 (원장)
         src/app/api/learn/login · logout · password · lectures · lectures/[id] · watch  (학생 6)
스키마   prisma/migrations/20260915180000_student_account/migration.sql   ⚠️ 미적용
적용기   scripts/qa/apply-student-account-migration.ts     이 마이그레이션 하나만 · 드라이런 먼저 (돌리지 않았다)
하네스   scripts/qa/mutate-student-auth.ts                 변이 29개 · tsx/vitest 탐침
         scripts/qa/smoke-student-gate.sh                  실물 서버 연기 시험(로그인 안 한 요청)
대역     src/mocks/learnTestDouble.ts                      학생 계정·강의·시청·감사 표 대역(prismaTestDouble 과 합성 — §8-11)
         src/mocks/memoryLoginStore.ts                     잠금 저장소 메모리 판(원자 연산 흉내)
시험     src/__tests__/helpers/authRequestContext.ts       진짜 Auth.js 를 태우는 요청 맥락(next/headers·navigation 대역 + 세션 쿠키)
         src/__tests__/api/  authDirectorUnchanged 9 · studentSessionPipeline 11 · studentSessionSweep 3 · studentAccountIssue 15 · learnRoutes 20
         src/__tests__/unit/ studentAccountContract 14 · studentRouteAccess 15 · studentLogin 14 · proxyStudentGate 9 · learnLectureAccess 7
         src/__tests__/probes/ studentAuthPipeline.probe · proxyStudent.probe   변이 하네스 전용(평소엔 건너뜀)
```

---

## 2. 설계 — 브리프 §2 를 어떻게 했나

### 2.1 🔴 학생 세션은 기존 코드에게 «로그인 안 한 사람» — 찾은 함정

- **next-auth 가 세션에 한 겹을 더 씌운다.** 서버 쪽 `getSession` 이 우리 `session` 콜백의 결과를
  `{ user: args[0].user ?? args[0].token, ...session }` 으로 감싼다(`node_modules/next-auth/lib/index.js` 30행).
  콜백이 `user` 칸을 **빼기만** 하면 **토큰 통째가 `session.user` 가 된다** — 브리프가 짚은 «빈 객체로라도 만든다»보다
  한 걸음 더 나쁘다. 그래서 `studentSessionFrom` 은 `user: undefined` 를 **적어서** 돌려준다(spread 에서 이기고 JSON 에서 사라진다).
- **이 겹은 `auth` 를 모킹하면 안 보인다.** 기존 시험은 전부 `@/lib/auth` 를 통째로 모킹했는데, 까닭이 있었다 —
  next-auth 가 `next/server` 를 확장자 없이 import 해서 vitest(Node)가 진짜 next-auth 를 못 읽었다. `vitest.config.mts` 에
  `server.deps.inline: ["next-auth"]` 를 넣어 **처음으로 진짜 Auth.js 로** 시험했다(`helpers/authRequestContext.ts` 가 `next/headers`·
  `next/navigation` 만 대역으로 세운다). 20번 교훈 「AI 를 전부 모킹하면…」의 세션판이다.
- **`if (!session?.user)` 만 보는 자리 — 전수로 하나**: `src/lib/devPageAccess.ts:37`(production 에서 `/dev` 화면을 원장에게 여는 가림막).
  나머지는 전부 `session.user.id` 를 본다. 코드는 **고치지 않고** 시험으로 못 박았다(학생 세션 → false). 원장 동작 변경 금지이고,
  이 자리가 «`user: undefined` 가 빠지는 회귀»를 잡는 **유일한 그물**이기도 하다(변이 ②a·②d 가 여기서 빨개진다).
- **토큰**은 `{ student: { accountId, studentId, name, mustChangePassword } }` 한 칸 — Auth.js 가 로그인 때 채워 주는
  `sub`·`name`·`email`·`picture` 도 **물려받지 않고 새로 짓는다**. 요청마다 계정을 다시 읽어 꺼짐·지워짐이면 `null`
  → Auth.js 가 쿠키를 지운다(④). 원장 갈래(`db.user` 다시 읽기)는 한 줄도 안 탄다.
- **`Session.user` 를 타입에서도 선택(`?`)으로** 바꿨다 — 칸이 있으면 원장으로 믿는 자리가 많아서 타입이 «없을 수 있다»고
  말하게 했다. `tsc` 0 — 기존 코드는 이미 전부 `?.` 로 읽고 있었다.

### 2.2 관문 (proxy) — 허용 목록

학생 세션은 **원장 갈래보다 먼저** 허용 목록(`src/lib/studentRouteAccess.ts`)으로 끝난다 — 아래로 흘러가면 «로그인 안 한 사람»으로
읽혀 `/`·`/api/**`·공개 그림이 열린다. 학생 요청은 원장 쪽 요청 감사 기록 줄을 **하나도 안 탄다**(시험으로 확인).

```
첫 비밀번호를 바꾼 학생 (STUDENT_CAPABILITIES)          첫 로그인 학생 (STUDENT_MUST_CHANGE_CAPABILITIES)
  GET|HEAD /learn · /learn/password · /learn/watch/{id}    GET|HEAD /learn/password
  GET  /api/learn/lectures · /api/learn/lectures/{id}      POST /api/learn/password
  POST /api/learn/watch · /api/learn/password              POST /api/learn/logout
  POST /api/learn/logout                                   GET  /api/auth/session · /api/auth/csrf
  GET  /api/auth/session · /api/auth/csrf                  POST /api/auth/signout
  POST /api/auth/signout                                   GET|HEAD 브랜드 이미지 넷
  GET|HEAD /favicon.ico · /icon.svg · /apple-icon.png · /brand/**
```

- 막힌 API → 403 **JSON**. 막힌 화면 GET/HEAD → `/learn`(첫 로그인이면 `/learn/password`). 화면에 GET 이 아닌 요청 → 403
  (307 은 메서드를 들고 가서 되돌리면 POST 가 돌고 돈다).
- 로그인 안 한 사람의 `/learn/*` → `/learn/login`(D-125 ⑷). `/learn/login` 은 GET·POST 둘 다 열림(화면 트랙이 서버 액션 로그인을 쓸 수 있게).
- 🔴 **학생 화면의 서버 액션은 하나도 안 열었다** — 학생 쪽 쓰기는 전부 `/api/learn/**` 다. 화면 트랙이 서버 액션을 쓰면
  그 페이지 POST 를 허용 목록에 **적어야** 열린다(잊으면 닫힌다 — routeAccess.ts 원칙).
- 🔴 공개 그림(`/figures/**`)은 로그인 안 한 사람에게 열려 있지만 **학생에게는 닫혔다** — 학생 갈래가 맨 앞에서 허용 목록으로 끝나기 때문이다.

### 2.3 잠금 — 없는 아이디에도 **똑같이** (D-125 ⑶)

- 연속 5회 틀리면 10분 잠금(`STUDENT_LOGIN_LOCK` 한 곳). 다섯째 실패의 응답이 곧 잠금 문구다. 잠긴 동안은 맞는 번호도 거부.
  10분이 지나면 다시 다섯 번. 성공하면 0.
- 🔴 **먼저 한 칸을 잡고 그 다음에 대 본다** — 실패 수를 원자적으로 +1 하고(`reserveAttempt`), 그 수가 다섯을 넘으면 대 보지도
  않고 잠금이다. 「대 보고 틀리면 +1」 순서면 동시에 넣은 요청이 모두 «아직 안 잠김»을 보고 대 본다 — 숫자 4자리는 1만 개라
  그 틈이 곧 뚫림이다. 시험: 동시에 스무 번 넣어도 실제로 대 보는 것은 **다섯 번**.
- 🔴 **«잠금 문구도 없는 아이디에 똑같이»를 지키려면 없는 아이디의 실패도 세야 한다** — 계정 행이 없으니 표가 하나 더
  필요했다: `student_login_miss`(브리프 밖 — §8-1). 열쇠는 정규화한 아이디의 **HMAC-SHA256(AUTH_SECRET)** 이다.
  학생이 번호를 아이디 칸에 적는 실수가 있다 — 그 번호가 DB 에 평문으로 남지 않게(⑥). DB CHECK 가 64자 16진만 받는다.
- 꺼진 계정은 «없는 아이디»와 똑같이 군다 — 맞는 번호도 실패, 실패 수도 세고 잠긴다(다르게 굴면 그 차이로 계정 존재가 샌다).
  없는 아이디·꺼진 계정도 bcrypt 비교를 한 번 한다(버린 값의 해시에) — 걸리는 시간으로 새지 않게.
- 비밀번호 바꾸기의 «지금 번호 확인»도 **같은 잠금**을 탄다(`verifyStudentPin` 하나) — 세션을 가진 사람이 지금 번호를 알아내는 길을 막는다.
- 감사 기록: 성공·실패 모두 `AccountAuditLog`(`recordAudit`). `userId`·`actorId` 는 비운다 — 두 칸은 `user` 외래 키라 학생 계정을
  못 적는다. `details` 에 `studentAccountId`·`studentId`·`reason`(invalid·locked·disabled·unknown_id). **입력한 아이디·번호는 안 적는다.**

### 2.4 발급 (원장) — 한 명씩 · 반 소유 · 해시만

- `issueStudentAccount.ts` 규칙 1~6(파일 머리말). 반 소유 판정은 기존 `requireOwnedStudent` 와 **같은 조회·같은 갈래**
  (학생 없음 404 · 남의 반 403). 이미 계정 → 409 «이미 계정이 있습니다.» · 아이디 겹침 → 409 «이미 쓰는 아이디입니다.»
  (확인과 만들기 사이 경합은 P2002 를 받아 무엇이 겹쳤는지 다시 보고 같은 문구로).
- 초기 비밀번호는 `generateInitialPassword()`(concept-port) → **해시만** 저장, 응답에 **한 번**(`Cache-Control: no-store`).
  감사 기록에는 `studentId`·`studentAccountId`·`loginId` 만(원장이 적은 아이디는 비밀이 아니다).
- 다시 발급 = 비밀번호만 새로 + 첫 로그인 표시 다시 + 잠금 풀기. 이미 로그인해 있던 기기는 **다음 요청부터 비밀번호 바꾸기에
  갇힌다**(관문이 요청마다 계정을 다시 읽으므로) — 새 번호를 모르면 못 나온다. 끊는 것은 아니다(§8-6).
- 끄기는 `disabledAt` 만 찍고 지우지 않는다. 다시 끄면 처음 끈 시각 그대로. 켜면 비운다.
- 원장 전용 확인은 기존 관례(`getSessionUser()` — 승인된 원장) + 같은 사이트 확인(`sameOriginMutation`).

### 2.5 학생 API 6 — 목록과 기록이 **같은 판정 하나**

- `lectureOpenToStudent(lecture, progressUnitIds)` 한 곳 = 게시 · 주소 있음 · **진도에 있던 차시**. 목록·하나·기록 셋이 다 부른다.
  목록 조회는 차시로만 **넓게** 하고 `status` 조건을 따로 걸지 않는다(걸면 판정이 두 곳에 생긴다).
  시험: 씨앗 강의 전부에서 «목록에 있다 ⇔ 기록이 받는다»가 같은지 센다.
- «진도에 있던 차시» = 그 학생 **지금 반**의 반 진도(studentId NULL) ∪ 그 학생의 **개인 진도 행 전부**(반을 옮기기 전 것 포함).
  진도보다 앞선 차시는 물론 **건너뛴 차시도 안 열린다**(기록된 차시의 집합 — §8-5).
- 🔴 **시청 %는 서버가 다시 센다**(§7 리드 결정) — `conceptWatchReportSchema` 를 그대로 받되 `percent` 는 버리고
  `본 최대 지점 ÷ 강의 길이`로 센다. 보고된 지점은 강의 길이로 접는다(9999초 → 139초). 규칙(뒤로 안 감 · 한 번 완료면 완료)은
  `watchRules.mergeWatchRecord` 를 **부른다**.
- 학생에게 가는 모양은 `toStudentLecture` 한 곳(AI 고지·잡 ID·시청 확인 없음 — D-124 ⑹).
- 라우트가 **스스로** 학생 세션·첫 로그인을 다시 본다(`requireStudent`) — 관문 하나에만 기대면 관문이 새는 날 열린다.
- 로그인 문구: 틀림·없는 아이디·꺼짐 → 401 «아이디 또는 비밀번호가 맞지 않습니다.»(세 응답이 **글자까지 같다**) · 잠금 → 429
  «잠시 뒤 다시 시도하세요.»(없는 아이디도 같은 응답). 형식이 틀린 본문(400)·다른 사이트(403)는 번호를 대 보기 **전에** 돌려보낸다.

### 2.6 `initialPassword.ts` 를 쪼갠 까닭 — 화면 번들이 `node:crypto` 를 끌고 간다

브리프 §7 대로 학생 계약이 `isPinFormat`·`isEasyPin` 을 **부르는데**, 그 둘이 있던 `initialPassword.ts` 는 머리에서
`node:crypto` 를 import 한다. 이 계약은 학생 로그인 화면의 폼 검증이 읽을 자리라, 그대로 두면 **화면 트랙이 계약을 import 하는 순간
클라이언트 번들이 깨진다** — 지금은 화면이 없어 `npm run build` 도 못 잡는다. 판정 둘을 `pinRules.ts` 로 떼고 `initialPassword.ts` 가
다시 내보낸다(부르던 곳 무변경). concept-port 시험 9파일 초록, 변이 ⑫ 다섯은 대상 파일만 옮기고 다시 돌려 **5/5 빨개짐**(§5). 그리고
`studentAccountContract.test.ts` 가 계약의 import 를 **따라가** `node:`·내장 모듈이 없는지 잠근다(따라간 파일 수도 분모로 센다).

---

## 3. ② 전수 표 — 학생 세션 → 기존 API · 서버 액션

**모집단은 파일 목록에서 스스로** 뽑았다(`studentSessionSweep.test.ts`): `src/app/api/**/route.ts` 전부(학생 API `/api/learn/**` 만
뺐다 — 거기는 학생이 쓰라고 연 곳이고 `learnRoutes.test.ts` 가 본다) × 그 파일이 **내보낸** 메서드. **관문을 거치지 않고** 라우트를
직접 불렀다 — 관문이 새는 날에도 라우트가 스스로 막는지를 봤다. 같은 쌍을 **로그인 안 한 요청**과 **학생 세션**(진짜 Auth.js 가
복호화하는 진짜 쿠키)으로 한 번씩 불러, 로그인 안 한 요청이 401/403 이면 학생도 401/403, 아니면(공개) 학생 응답이 **상태·본문·DB 흔적까지
같아야** 통과다. 어느 라우트가 공개인지는 **손으로 적지 않았다** — 로그인 안 한 요청의 응답이 정했다. DB 는 덫이다(학생 세션을 읽는 한 줄과
감사 기록 말고는 건드리면 던진다). 부른 쌍 수 == 내보낸 메서드 수(살아남은 것을 셌다), 적재 실패 0.

**결과: 라우트 70 · 쌍 94 · 전부 통과.** 401→401 **81** · 400→400 3 · 404→404 9 · 503→503 1 (공개 13쌍 — 학생 = 로그인 안 함).

| # | 라우트 | 메서드 · 로그인 안 함 → 학생 | 판정 |
|---|---|---|---|
| 1 | `/api/account/access` | GET 401→401 | 거부 |
| 2 | `/api/account/activity` | POST 401→401 | 거부 |
| 3 | `/api/admin/users` | GET 401→401 | 거부 |
| 4 | `/api/admin/users/[id]` | GET 401→401 · PATCH 401→401 | 거부 |
| 5 | `/api/admin/users/[id]/assets/[assetId]` | GET 401→401 | 거부 |
| 6 | `/api/admin/users/[id]/audit` | GET 401→401 | 거부 |
| 7 | `/api/admin/users/[id]/documents` | GET 401→401 | 거부 |
| 8 | `/api/admin/users/[id]/documents/[documentId]` | GET 401→401 | 거부 |
| 9 | `/api/auth/[...nextauth]` | GET 400→400 · POST 400→400 | 공개 — 학생 = 로그인 안 함 |
| 10 | `/api/auth/signup` | POST 400→400 | 공개 — 학생 = 로그인 안 함 |
| 11 | `/api/basket` | GET 401→401 · POST 401→401 · DELETE 401→401 | 거부 |
| 12 | `/api/basket/test` | POST 401→401 | 거부 |
| 13 | `/api/classes` | GET 401→401 · POST 401→401 | 거부 |
| 14 | `/api/classes/[id]` | GET 401→401 · PATCH 401→401 · DELETE 401→401 | 거부 |
| 15 | `/api/dev/unified/ai` | GET 404→404 · POST 404→404 | 공개 — 학생 = 로그인 안 함 |
| 16 | `/api/dev/unified/overview` | GET 404→404 | 공개 — 학생 = 로그인 안 함 |
| 17 | `/api/dev/unified/pdf-assets/[kind]/[filename]` | GET 404→404 | 공개 — 학생 = 로그인 안 함 |
| 18 | `/api/dev/unified/pdf-worker` | GET 404→404 | 공개 — 학생 = 로그인 안 함 |
| 19 | `/api/dev/unified/problems` | GET 404→404 | 공개 — 학생 = 로그인 안 함 |
| 20 | `/api/dev/unified/teaching` | GET 404→404 | 공개 — 학생 = 로그인 안 함 |
| 21 | `/api/exam/rounds` | GET 401→401 | 거부 |
| 22 | `/api/exam/rounds/[id]` | GET 401→401 | 거부 |
| 23 | `/api/exports/hwpx` | POST 401→401 | 거부 |
| 24 | `/api/exports/pdf` | POST 401→401 | 거부 |
| 25 | `/api/eywa-sync` | POST 401→401 | 거부 |
| 26 | `/api/eywa-sync/cron` | GET 503→503 | 공개 — 학생 = 로그인 안 함 |
| 27 | `/api/library/assets/[assetId]` | GET 401→401 · PUT 401→401 | 거부 |
| 28 | `/api/library/documents` | GET 401→401 | 거부 |
| 29 | `/api/library/documents/[documentId]` | GET 401→401 · PUT 401→401 · PATCH 401→401 · DELETE 401→401 | 거부 |
| 30 | `/api/metrics` | GET 401→401 | 거부 |
| 31 | `/api/predictions` | GET 401→401 · POST 401→401 | 거부 |
| 32 | `/api/predictions/[id]` | GET 401→401 | 거부 |
| 33 | `/api/predictions/[id]/actual` | GET 401→401 · POST 401→401 | 거부 |
| 34 | `/api/problems` | GET 401→401 · POST 401→401 | 거부 |
| 35 | `/api/problems/[id]` | GET 401→401 · PATCH 401→401 · DELETE 401→401 | 거부 |
| 36 | `/api/problems/[id]/reports` | POST 401→401 | 거부 |
| 37 | `/api/problems/[id]/review` | POST 401→401 | 거부 |
| 38 | `/api/problems/[id]/review-status` | PATCH 401→401 | 거부 |
| 39 | `/api/problems/generate` | POST 401→401 | 거부 |
| 40 | `/api/problems/transform` | POST 401→401 | 거부 |
| 41 | `/api/problems/transform/adopt` | POST 401→401 | 거부 |
| 42 | `/api/progress` | GET 401→401 · POST 401→401 | 거부 |
| 43 | `/api/progress/advance` | POST 401→401 | 거부 |
| 44 | `/api/progress/suggest` | GET 401→401 | 거부 |
| 45 | `/api/review/queue` | GET 401→401 | 거부 |
| 46 | `/api/shared-figures/[kind]/[...path]` | GET 404→404 · HEAD 404→404 | 공개 — 학생 = 로그인 안 함 |
| 47 | `/api/students` | GET 401→401 · POST 401→401 | 거부 |
| 48 | `/api/students/[id]` | PATCH 401→401 · DELETE 401→401 | 거부 |
| 49 | `/api/students/[id]/account` ✚ | GET 401→401 · POST 401→401 · PATCH 401→401 | 거부 |
| 50 | `/api/students/[id]/account/password` ✚ | POST 401→401 | 거부 |
| 51 | `/api/studio/ai` | GET 401→401 · POST 401→401 | 거부 |
| 52 | `/api/studio/overview` | GET 401→401 | 거부 |
| 53 | `/api/studio/pdf-assets/[kind]/[filename]` | GET 401→401 | 거부 |
| 54 | `/api/studio/pdf-worker` | GET 401→401 | 거부 |
| 55 | `/api/studio/problems` | GET 401→401 | 거부 |
| 56 | `/api/studio/teaching` | GET 401→401 | 거부 |
| 57 | `/api/tests` | GET 401→401 | 거부 |
| 58 | `/api/tests/[id]` | GET 401→401 | 거부 |
| 59 | `/api/tests/[id]/confirm` | POST 401→401 | 거부 |
| 60 | `/api/tests/[id]/print` | POST 401→401 | 거부 |
| 61 | `/api/tests/[id]/problems/[seq]` | PUT 401→401 | 거부 |
| 62 | `/api/tests/[id]/results` | GET 401→401 | 거부 |
| 63 | `/api/tests/[id]/results/[studentId]` | GET 401→401 | 거부 |
| 64 | `/api/tests/[id]/scores` | PATCH 401→401 | 거부 |
| 65 | `/api/tests/[id]/submit` | POST 401→401 | 거부 |
| 66 | `/api/tests/daily-review` | GET 401→401 | 거부 |
| 67 | `/api/tests/default-range` | GET 401→401 | 거부 |
| 68 | `/api/tests/generate` | POST 401→401 | 거부 |
| 69 | `/api/tests/predicted` | POST 401→401 | 거부 |
| 70 | `/api/units` | GET 401→401 | 거부 |

✚ = 이번에 만든 원장 라우트(모집단이 파일에서 오므로 저절로 들어갔다).

- **서버 액션**(`"use server"` 파일을 글자로 찾음): 1파일 1액션 — `src/app/actions/auth.ts#signOutAction`. 학생 세션으로 불러도
  로그인 안 한 요청과 **결과(되돌림 주소)·DB 흔적이 같고**, 원장용 로그아웃 감사 기록이 **한 줄도 안 남는다**.
- **`auth()` 를 부르는 파일 갈래**(글자로 찾음 — 8개 이상): 라우트(위 표) · 서버 액션(위) · `src/proxy.ts`(③) · 화면
  (page/layout — 학생은 관문이 `/learn` 밖으로 못 보낸다, ③) · 진짜 학생 세션으로 시험한 도우미 5(`session.ts`·`accountAccess.ts`·
  `studio-ai/guard.ts`·`devPageAccess.ts`·`learn/studentRequest.ts`). **갈래를 못 받은 파일이 생기면 빨갛다.**
- 도우미 넷(`getSessionUser`·`getAccountAccess`·`authorizeStudio`·`devPageVisible`)은 진짜 학생 세션에서 전부 «없음/401/false»
  (`studentSessionPipeline.test.ts`) — 먼저 학생 세션이 **서 있는지** 확인한 뒤에 본다(로그인이 조용히 실패해도 넷 다 null 이라 헛돈다).

---

## 4. 스키마 초안 — 🔴 미적용

### 4.1 무엇이 들어 있나

- `prisma/schema.prisma`: `StudentAccount`(`student_account`) — 브리프 §2.2 칸 그대로 + D-125 ⑶ 의 `failedCount`·`lockedUntil` ·
  `StudentLoginMiss`(`student_login_miss`) — **브리프 밖**(§2.3, §8-1) · 역관계 둘.
- 브리프와 다른 점: ⑴ `issuedById` 를 **선택(`?`) + `ON DELETE SET NULL`** 로 — 원장 계정이 지워져도 학생 계정·발급 기록(감사)이 남게.
  브리프는 `issuedById(→ User)` 만 적었다(§8-2). ⑵ `student_login_miss` 표. ⑶ CHECK 넷(아이디 정규화 · 실패 수 ≥ 0 둘 · 열쇠 모양) · RLS 둘.
  🔴 아이디 **형식**(영문·숫자·-·_ 4~20자)은 DB 에 두지 않았다 — 원장님이 바꾸실 수 있는 정책이라 계약 한 곳에만. DB 에는 «정규화했다»는
  저장 약속(`login_id = lower(btrim(login_id))`)만.
- SQL 은 `prisma migrate diff --from-schema-datamodel <HEAD 의 schema> --to-schema-datamodel prisma/schema.prisma --script` 산출을
  **그대로** 싣고, 손으로 쓴 것은 맨 아래 «손으로 더한 것» 절에만 있다. diff 는 `DATABASE_URL`·`DIRECT_URL` 을 닿지 않는 `127.0.0.1:1` 로.
- 적용기 `scripts/qa/apply-student-account-migration.ts` — `apply-concept-lecture-migration.ts` 를 본떴다: 이 마이그레이션 **하나만** ·
  드라이런이 기본(다 해 보고 ROLLBACK) · `ALLOW_SHARED_IMPORT=1 … --apply` 둘 다 있어야 커밋 · 확인은 **읽기만**(표 둘·RLS·CHECK 이름
  넷·빈 표·기존 학생 표 행 수) · `--revert --apply` 되돌리기. **이 워크트리는 드라이런조차 돌리지 않았다**(공유 DB 에 접속하지 않았다).

### 4.2 SQL 전문 (`prisma/migrations/20260915180000_student_account/migration.sql`)

```sql
-- ⚠️ 미적용 초안 (D-124) — 원장님 확인 전 적용 금지
--
-- 오늘의 개념 — 학생 로그인 계정(student_account) · 없는 아이디의 로그인 실패 수(student_login_miss).
-- 결정: D-124 ⑶⑷ · D-125 ⑵⑶ · 계약 SSOT: src/contracts/studentAccount.contract.ts
-- 로그인 규칙: src/lib/learn/studentLogin.ts · 브리프: docs/planning/tracks/briefs/todays-concept-student-auth.md
--
-- 윗부분은 `prisma migrate diff --from-schema-datamodel <이전 schema> --to-schema-datamodel
-- prisma/schema.prisma --script`(DB 없이 스키마끼리 — DATABASE_URL·DIRECT_URL 은 닿지 않는
-- 127.0.0.1:1)의 산출을 **그대로** 실었다. Prisma 가 표현 못 하는 것은 맨 아래 «손으로 더한 것» 절에 붙였다.
--
-- 🔴 `prisma migrate dev` · `migrate deploy` · `db push` · `migrate reset` 은 이 파일을 공유 DB 에 적용한다.
--    원장님 확인 전에는 어느 세션도 돌리지 말 것. 적용은 리드가 원장님께 여쭌 뒤
--    scripts/qa/apply-student-account-migration.ts 로 **이 마이그레이션 하나만**, 드라이런 먼저.

-- CreateTable
CREATE TABLE "student_account" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "login_id" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "issued_by_id" UUID,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password_changed_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "disabled_at" TIMESTAMP(3),
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_login_miss" (
    "key_hash" CHAR(64) NOT NULL,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_login_miss_pkey" PRIMARY KEY ("key_hash")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_account_student_id_key" ON "student_account"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_account_login_id_key" ON "student_account"("login_id");

-- AddForeignKey
ALTER TABLE "student_account" ADD CONSTRAINT "student_account_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_account" ADD CONSTRAINT "student_account_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 손으로 더한 것 (Prisma 가 표현 못 함) ────────────────────────────────

-- 아이디는 정규화된 모양으로만 들어간다 — 앱은 `normalizeLoginId`(앞뒤 공백 걷고 소문자)를 거쳐 넣는다.
-- SQL 로 대문자가 섞여 들어가면 unique 가 «Seo01» 과 «seo01» 을 둘로 보고, 로그인은 둘 다 못 찾는다.
-- 형식(영문·숫자·-·_ 4~20자)은 원장님이 바꾸실 수 있는 **정책**이라 DB 에 두지 않는다(계약 한 곳 —
-- `STUDENT_LOGIN_ID_RULE`). 여기 두는 것은 정책이 아니라 «정규화했다»는 저장 약속뿐이다.
ALTER TABLE "student_account"
  ADD CONSTRAINT "student_account_login_id_normalized"
  CHECK ("login_id" = lower(btrim("login_id")));

ALTER TABLE "student_account"
  ADD CONSTRAINT "student_account_failed_count_nonnegative"
  CHECK ("failed_count" >= 0);

ALTER TABLE "student_login_miss"
  ADD CONSTRAINT "student_login_miss_failed_count_nonnegative"
  CHECK ("failed_count" >= 0);

-- 없는 아이디의 열쇠는 64자 16진(HMAC-SHA256)만 — 입력한 아이디가 글자 그대로 들어오면 여기서 막힌다.
-- 학생이 번호를 아이디 칸에 적는 실수가 평문으로 남지 않게(브리프 §4 ⑥).
ALTER TABLE "student_login_miss"
  ADD CONSTRAINT "student_login_miss_key_is_hmac"
  CHECK ("key_hash" ~ '^[0-9a-f]{64}$');

-- 새 표는 RLS 를 켠다 — 이 저장소의 관례(account_audit_log · concept_lecture …).
-- 정책이 없으므로 Supabase 공개 API(anon)로는 못 읽는다. 앱은 Prisma(DB 직결)로 읽고 쓴다.
ALTER TABLE "student_account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_login_miss" ENABLE ROW LEVEL SECURITY;
```

### 4.3 적용하면 무엇이 생기나

빈 표 둘 · unique 인덱스 둘 · 외래 키 둘 · CHECK 넷 · RLS 둘. **기존 표는 한 행·한 칸도 안 바뀐다.** 외래 키가 기존 표에 거는 효과:
학생을 지우면(반 삭제 cascade 포함) 그 학생의 계정이 같이 지워지고, 원장 계정을 지우면 발급자 칸만 비워진다. 적용 전에 앱이 이 표를
부르면 P2021(표 없음)이 난다 — 학생 로그인·발급 API 가 500 을 낸다(원장 기능은 안 부른다).

⚠️ **이 파일이 main 에 병합된 뒤 어느 세션이든 `npm run db:migrate`(= `prisma migrate dev`)나 `migrate deploy` 를 돌리면 공유 DB 에
적용된다** — concept-port 보고 §3.3 과 같은 위험이다(§8-12).

---

## 5. 변이 시험 — **29/29 빨개짐** · 살아남음 0 · 판정 거부 0

하네스: `scripts/qa/mutate-student-auth.ts`. 판정 순서는 concept-port 하네스와 같다(㉠ 음성 대조 → ⑴ 앵커 하나 → ⑵ 파일이 바뀌었나 →
⑶ **탐침 산출물이 바뀌었나** → ⑷ 실패한 시험 **이름**). 탐침은 두 가지 — 순수 모듈은 tsx 식(25개), 진짜 next-auth·proxy 를 타는 자리
(`auth.ts` 의 콜백 갈래 ②c·②d·④b · `proxy.ts` 의 학생 갈래 ③a)는 vitest 탐침 파일(`src/__tests__/probes/*.probe.test.ts`, 평소엔
건너뜀)이 파일에 적은 한 줄을 읽는다.

- **이 기계는 배경 작업을 «메모리 부족»으로 끊는다**(관문·빌드가 그렇게 끊겼다). 끊기면 `finally` 원복이 안 돌아 변이가 남으므로,
  **먼저 커밋한 뒤**(`fcc0cf11`·`33a18469`) **앞에서 묶음 여섯**으로 나눠 돌렸다 — ①②a②b②f / ②c②d④b / ③ / ④a⑤⑥ / 잠금 / 강의·시청.
  묶음마다 하네스의 md5 대조(«변이한 파일 전부 원본과 일치 ✓»)에 더해 `git status` 로 원본을 대조했다 — **여섯 번 다 깨끗**.
  (이름 조각 «강의»가 ③b 이름에도 걸려 ③b 는 두 번 돌았다 — 두 번 다 빨강. 아래 표는 한 번만 적는다.)
- concept-port 변이 **⑫ 다섯**(`isEasyPin` 셋 · 제외 규칙 · 앞자리 0 — 판정을 `pinRules.ts` 로 옮겨 앵커 경로만 바꿈)도 다시 돌려
  **5/5 빨개짐** — 옮긴 뒤에도 그대로 문다.

| 변이 | 판정 | 탐침 산출물 (변이 전 → 후) | 빨개진 시험 (앞의 둘) |
|---|---|---|---|
| ① 학생 판정을 «id 가 없으면 학생»으로 — role·id 없는 옛 원장 토큰이 학생 갈래로 샌다 | 🟥 | false → true | ① 원장 로그인 — 쿠키에 실리는 토큰 모양 · ① 원장 세션 — auth() 칸이 정확히 user·expires 둘 |
| ②a 학생 세션에서 user: undefined 를 뺀다 — next-auth 의 겹이 토큰을 user 로 씌운다 | 🟥 | ["user","expires","student"] → ["expires","student"] | auth() 는 user 없이 student 만 준다 · 기존 세션 도우미 넷이 전부 «로그인 안 함»(devPageVisible) |
| ②b 학생 토큰에 id 를 싣는다 | 🟥 | {"student":{…}} → {"id":"acc-1","student":{…}} | 쿠키의 토큰은 student 칸 하나뿐 — id·sub·이름·이메일 없음 |
| ②c jwt 콜백에서 학생 토큰 갈래를 지운다 — 학생 토큰이 원장 갈래를 탄다 | 🟥 | 학생 세션 → null (vitest 탐침) | auth() 는 user 없이 student 만 · /api/auth/session 도 같은 모양 |
| ②d session 콜백에서 학생 갈래를 지운다 — Auth.js 기본 user 가 남는다 | 🟥 | 학생 세션 → {"user":{},"expires":…} (vitest 탐침) | auth() 는 user 없이 student 만 · /api/auth/session 도 같은 모양 |
| ②f 학생 세션에 user.id(승인된 원장 모양)를 싣는다 — 기존 API 가 학생에게 열린다 | 🟥 | {"expires","student"} → {"user":{"id":"a","role":"director",…}} | **② 기존 API 전수** · **② 서버 액션 전수**(로그아웃 액션이 학생 이름으로 원장용 감사 기록을 남긴다) |
| ③a 관문에서 학생 갈래를 지운다 — 학생이 «로그인 안 한 사람» 갈래로 흘러간다 | 🟥 | GET / 307→200 · /api/problems 403→200 … (vitest 탐침) | 지나가는 것의 집합이 정확히 이것이다 · 막힌 API 는 전부 403 JSON |
| ③b 첫 로그인 표시를 무시한다 — 비밀번호를 안 바꾼 학생에게 강의가 열린다 | 🟥 | forbidden(바꾼 뒤) → allow | 첫 로그인 학생 — 지나가는 것은 바꾸기·나가기·세션·브랜드뿐 · 막힌 화면은 /learn/password 로 |
| ③c 막힌 API 에 403 대신 화면 되돌림을 준다 | 🟥 | forbidden → redirect /learn | 막힌 API 는 전부 403 JSON · 원장 API 는 전부 403 |
| ③d 재생 화면 규칙을 /learn/** 로 넓힌다 | 🟥 | redirect → allow (/learn/watch/a/b) | 지나가는 것의 집합 · 학생이 할 수 있는 것 전부(허용 목록 잠금) |
| ③e 로그인 안 한 사람의 /learn/login 을 막는다 (되돌림이 돈다) | 🟥 | allow → redirect /learn/login | /learn/login 이 아닌 학생 화면은 /learn/login 으로 · /learn/login 은 열림 |
| ④a 토큰을 지을 때 꺼짐(disabledAt)을 안 본다 | 🟥 | null → {"student":{…}} | 원장님이 계정을 끄면 다음 요청의 세션은 null 이고 쿠키를 지운다 |
| ④b 요청마다 계정을 다시 읽지 않고 토큰을 그대로 돌려준다 | 🟥 | 끈 뒤 null → 학생 세션 그대로 (vitest 탐침) | 끄면 다음 요청 null · 학생을 지우면 다음 요청 null · 첫 로그인 표시를 요청마다 다시 읽는다 |
| ⑤ 반 소유자를 안 본다 — 남의 반 학생에게도 발급한다 | 🟥 | "not_owner" → "issued" | ⑤ 남의 반 학생에게는 발급하지 않는다 — 403, 계정 0 · ⑤ 남의 반 학생은 상태·끄기·다시 발급도 403 |
| ⑥a 발급 감사 기록에 초기 비밀번호를 싣는다 | 🟥 | 감사 details 에 initial 칸이 생긴다 | ⑥ 모든 흔적을 뒤진다 · 감사 기록 — 누가 누구에게 무엇을(번호 없이) |
| ⑥b 초기 비밀번호를 해시 없이 저장한다 | 🟥 | ["h(7392)"] → ["7392"] | 발급하면 201 — 해시가 초기 번호에 맞는다 |
| ⑥c 없는 아이디를 열쇠 없이 글자 그대로 적는다 | 🟥 | 64자 16진 → "ghost-id" | DB 어디에도 번호가 평문으로 없다 · 없는 아이디는 입력한 글자 그대로 남기지 않는다 |
| 잠금-1 연속 실패 문턱을 6으로 | 🟥 | 5 → 6 | 연속 5회 틀리면 10분 잠금(계약) · 상수는 5회·10분 |
| 잠금-2 잠금 시간을 5분으로 | 🟥 | 600000 → 300000 | 같은 둘 |
| 잠금-3 성공해도 실패 수를 0 으로 안 한다 | 🟥 | 0 → 5 | 성공하면 0 — 넷 틀리고 맞힌 뒤 다시 넷 틀려도 안 잠긴다 · 비밀번호 바꾸기도 맞히면 0 |
| 잠금-4 없는 아이디는 세지도 잠그지도 않는다 (잠금 문구가 아이디 존재를 흘린다) | 🟥 | invalid×4·locked×3 → invalid×7 | 있는 아이디에 틀린 번호를 넣은 것과 결과 줄이 똑같다 · 입력한 글자를 남기지 않는다 |
| 잠금-5 다섯을 넘긴 시도도 번호를 대 본다 (동시 요청이 문턱을 넘는다) | 🟥 | 실제로 대 본 수 5 → 20 | 동시에 스무 번 넣어도 대 보는 것은 다섯 번뿐 |
| 잠금-6 꺼진 계정도 맞는 번호면 들인다 | 🟥 | false → true | 꺼진 계정은 맞는 번호도 실패 — 문구는 «틀림»과 같다 |
| 잠금-7 새 번호에 쉬운 번호를 받는다 (발급과 변경이 갈린다) | 🟥 | false → true | 쉬운 번호 · 지금과 같은 번호는 400 · 새 번호는 쉬운 번호를 받지 않는다 |
| 강의-1 진도에 있던 차시인지 안 본다 (앞선 차시·남의 학년 강의가 열린다) | 🟥 | false → true | 안 열린 강의는 있든 없든 404 · 남의 진도·앞선 차시·초안 강의는 404 이고 기록이 안 생긴다 |
| 강의-2 게시 여부를 안 본다 (초안·보관이 열린다) | 🟥 | false → true | 초안 강의는 404 · **목록에 있는 강의 ⇔ 기록이 받는 강의 — 판정 하나** |
| 강의-3 남의 개인 진도도 센다 | 🟥 | [] → ["u7"] | 내 반의 반 진도와 내 개인 진도만 |
| 시청-1 영상 길이를 넘는 지점을 접지 않는다 | 🟥 | maxSeconds 139 → 9999 | 영상 길이를 넘는 지점은 길이로 접는다 |
| 시청-2 %를 본 지점에서 세지 않는다 | 🟥 | percent 72 → 100 | 재생기가 보낸 %는 버리고 본 지점 ÷ 길이로 센다 |

로그: 스크래치의 `mutate-{A1,A2,B,C,D,E}.log` · `mutate-concept12.log` — 다시 돌리려면 `npx tsx scripts/qa/mutate-student-auth.ts [이름 조각…]`
(**커밋된 상태에서, 다른 시험·빌드와 겹치지 않게**).

---

## 6. 검증 기록

### 6.1 RED → GREEN

- **① 특성 시험을 먼저** — `authDirectorUnchanged.test.ts` 를 쓰고 **`src/lib/auth.ts`·`proxy.ts` 가 HEAD 그대로인 채로** 돌려 9/9 초록을
  봤다(`git diff --stat` 빈 출력 확인). 그 뒤 학생 갈래를 넣고 이 파일을 한 글자도 안 고친 채 다시 9/9.
- 계약 · 관문 규칙 · 로그인 핵심 · 강의 판정 · 발급 · 학생 라우트 — 시험을 먼저 쓰고 `Failed to resolve import …`(모듈 없음) RED 를 본 뒤 구현.
- 진짜 Auth.js 시험(`studentSessionPipeline.test.ts`) — RED 8건(학생 공급자가 없어 `signIn("student")` 이 로그인 화면 주소를 돌려줌) →
  `auth.ts` 수정 → GREEN. ⚠️ RED 상태에서 **3건이 헛초록**이었다(세션이 없으니 «도우미 넷이 null»·«끄면 null»이 저절로 참) — 세 시험에
  «먼저 학생 세션이 서 있는가»를 넣었다(2026-08-21 교훈 «0 은 없다가 아니라 못 셈일 수 있다»).
- ②·③ 전수 시험은 배선 **뒤에** 썼다 — 무는지는 변이 ②f(학생 세션에 user.id)·③a(관문 학생 갈래 삭제)로 확인한다(§5).
- 러너는 전부 `--maxWorkers=1`(단독 파일)·`--maxWorkers=2`(전체 관문) — 이 기계에서 다른 오르카 세션(concept-admin-ui 변이 하네스 등)이 돌고 있었다.

### 6.2 이 작업에서 난 일 (교훈 후보 — 20번 문서 반영은 리드 몫)

1. **next-auth 의 겹이 세션 모양을 바꾼다** — §2.1. `auth` 를 모킹한 시험으로는 구조적으로 못 본다. 진짜 next-auth 를 vitest 로 태우려면
   `server.deps.inline: ["next-auth"]` 가 필요했다(그래서 지금까지 아무도 못 태웠다).
2. **기존 시험이 적재 단계에서 죽었다** — `accountSession.test.ts` 는 `next-auth` 를 통째로 모킹(기본 내보내기만)하는데, 새 파일이
   `import { CredentialsSignin } from "next-auth"` 를 하자 «No "CredentialsSignin" export is defined on the mock»으로 죽었다. 같은 클래스를
   원본(`@auth/core/errors` — next-auth 가 그대로 다시 내보내는 곳)에서 가져와 기존 시험을 **안 고치고** 살렸다. «모킹이 많은 모듈에서 새 이름을
   가져오면, 그 모듈을 모킹한 시험을 전부 돌려 보라.»
3. 🔴 **내 시험이 10분 넘게 멈췄다 — 정규식 되돌이(ReDoS)** — ② 전수 시험이 «"use server" 파일»을 찾으려고 `src` 의 `.ts` 전부(1,355개)에
   겹친 반복 정규식(`^\s*(?:\/\/…\n|\/\*[\s\S]*?\*\/\s*)*["']use server["']`)을 걸었다. `src/lib/elementary/g4.ts`(841KB)에서 되돌이가
   안 끝나 워커가 CPU 295초를 잡고 **한 줄도 안 찍었다**(시간 제한 590초에 걸려서야 끝남). 진행 표시(trace)조차 안 나와 «라우트 하나가 걸렸나»를
   먼저 의심했다 — 프로세스 목록에서 워커가 CPU 를 돌리는 것을 보고서야 수집 단계라는 걸 알았다. 한 번 훑는 셈으로 바꾸자 22초. «파일 전수를
   훑는 가드에 겹친 반복 정규식을 쓰지 마라 — 이 저장소엔 800KB 짜리 TS 가 넷 있다.»
4. **변이 탐침이 무작위 id 를 찍고 있었다** — `auth-student-session` 탐침의 산출물에 시드 계정의 `randomUUID()` 가 들어 있어, 변이 전후가
   **늘 달랐다** → ⑶ «산출물이 바뀌었나»가 거짓으로 늘 참이 된다. 2026-08-21 교훈의 반대쪽 얼굴이다(늘 안 바뀌는 탐침만큼 늘 바뀌는 탐침도
   아무것도 안 잰다). id 를 고정했다.
5. **통과한 시험의 `console.log` 가 로그에 안 실렸다** — ② 표(`SWEEP_TABLE`)·진행 표시(`SWEEP_TRACE`)가 둘 다 빈손이었다. 표와 변이 탐침을
   **파일로** 받게 바꿨다(환경 변수로 경로를 준다).
6. 첫 `npm run build` 는 내가 고치던 시험 파일을 **고치는 도중에** 읽어 `Failed to type check`(TS2554 ×6)로 떨어졌다 — Next 의 빌드 형 검사는
   시험 파일까지 본다. 다 고친 뒤 `tsc` 0 을 보고 다시 빌드했다(§0).
7. 커밋 훅의 prettier 가 줄을 다시 싸면 변이 앵커가 어긋난다 — prettier 를 먼저 돌리고 앵커를 그 글자에서 떴다.
8. **배경 작업이 «메모리 부족»으로 끊겼다 — 그런데 셸만 죽었다.** 전체 관문(`--maxWorkers=2`, 71파일 초록 뒤)과 다시 빌드가
   끊겼다(남은 메모리 2.2GB·0.6GB — 다른 오르카 세션의 `next dev`·`next build`·vitest 가 같이 돌았다). 셸이 죽은 뒤에도 관문의
   vitest 본체는 **워커 없이 멈춘 채** 살아 있어, 명령줄로 내 것임을 확인하고 껐다. 변이 하네스가 이렇게 끊기면 `finally` 원복이
   안 돈다 — 그래서 **커밋한 뒤 앞에서 묶음으로** 돌렸다. 같은 날 다른 세션도 같은 것을 메모리에 적었다(`background-kill-node-survives`).
9. **Git Bash 로 띄운 `next build` 가 Turbopack PostCSS 워커를 못 띄웠다** — `node process exited before we could connect to it with
   exit code: 0xc0000142`(DLL 초기화 실패). 남은 메모리 2.8GB·5.3GB 에서 **두 번 재현**했고, 같은 코드를 PowerShell→`cmd /c` 로 띄우니
   통과했다. 코드 결함이 아니라 프로세스를 못 만든 것이다 — 같은 날 Git Bash 첫 빌드는 이 단계를 통과했으니 늘 그런 것은 아니다
   (다른 세션의 빌드가 같이 돌 때 났다). 메모리 `next-build-git-bash-0xc0000142` 에 적었다.

---

## 7. 못 본 것

1. **실제 Postgres 에서의 잠금 원자성** — `prismaLoginStore` 의 `failed_count + 1`(update increment) · 없는 아이디 native upsert
   (`INSERT … ON CONFLICT`) · 조건부 `updateMany` 는 **가짜 DB 위에서만** 시험했다. 이 기계에 Docker 가 없고(로컬 DB 불가) 공유 DB 는 금지다.
   적용 뒤 한 번은 실제 DB 에서 «동시에 스무 번 → 다섯 번만 대 봄»을 돌려 봐야 한다.
2. **실물 서버에서의 학생 갈래** — 학생 토큰은 요청마다 DB 에서 계정을 다시 읽으므로 DB 없는 `next start` 에서는 학생 세션이 서지 않는다.
   연기 시험(`smoke-student-gate.sh`)은 **로그인 안 한 요청**(관문의 `/learn` 갈래 · 라우트 401 · 공급자 목록)만 본다. 학생 로그인 →
   관문 → 비밀번호 바꾸기 → 목록의 실물 확인은 로컬 DB 가 생기거나 적용 뒤에.
3. 학생 화면 넷(D-07) — 관문은 열어 두었지만 화면 파일이 없어 404 다.
4. 마이그레이션은 어느 DB 에도 적용·드라이런하지 않았다.
5. 시청 기록의 동시 쓰기(탭 둘) — 읽고-합치고-쓰기다(§8-14).

---

## 8. 리드가 정할 것

1. **`student_login_miss` 표(브리프 밖)** — «잠금 문구도 없는 아이디에 똑같이»를 지키려면 계정 없는 아이디의 실패도 어딘가에 세야 해서 더했다.
   대안: 계정 칸(`failedCount`·`lockedUntil`)을 없애고 **모든 아이디를 이 표 하나**에서 센다(한 길이라 더 단순, 대신 브리프 §6 의 «계정에 칸»과 다르다).
   그리고 이 표는 **정리하지 않는다** — 없는 아이디를 계속 두드리면 행이 쌓인다(잠금 풀린 지 하루 지난 행을 지우는 정리를 둘지).
2. `issuedById` 를 **선택 + `SET NULL`** 로 뒀다(원장 계정이 지워져도 학생 계정·감사가 남게). 브리프는 `→ User` 만 적었다.
3. **퇴원 학생**(`eywaWithdrawnAt`) — 지금은 로그인을 막지 않고, 예전 진도의 강의도 보인다. 막을지.
4. `useIndividualProgress` — 반 진도와 개인 진도를 **스위치와 무관하게 합집합**으로 봤다(«있던 진도»라서). 개인 진도 학생에게 반 진도 차시를 뺄지.
5. «진도에 있던 차시» = **기록된 차시의 집합** — 건너뛴 차시(예: 413 → 415)의 강의는 안 열린다. «최신 진도 차례까지 전부»로 볼지.
6. **다시 발급**은 다른 기기의 세션을 **끊지 않는다** — 다음 요청부터 비밀번호 바꾸기에 갇힐 뿐이다(새 번호를 모르면 못 나온다). 끊으려면 계정에
   세션 판수(version) 칸을 둬야 한다.
7. 비밀번호 바꾸기는 **지금 번호를 요구**하고 로그인과 **같은 잠금**을 탄다 — 다섯 번 틀리면 로그인도 10분 잠긴다.
8. **다섯째 실패의 응답이 곧 잠금 문구**다(여섯째부터가 아니다). 시험이 이 선택을 적어 두었다.
9. 감사 기록 — 학생 로그인·로그아웃·비밀번호 변경은 `userId`·`actorId` 가 **비어 있다**(`user` 외래 키라 학생 계정을 못 적는다). 원장님의
   «내 활동» 화면에는 안 나온다. 발급·다시 발급·끄기·켜기는 원장 id 로 남는다.
10. **`Session.user` 를 타입에서 선택(`?`)으로** 바꿨다 — 다른 트랙이 `session.user.x` 를 `?.` 없이 쓰면 이제 `tsc` 가 막는다(의도).
11. 시험 대역 — 새 표 넷을 `prismaTestDouble.ts` 가 아니라 `src/mocks/learnTestDouble.ts` 에 따로 뒀다(concept-admin-ui 와 같은 파일을 안 고치려고).
    admin-ui 가 강의 표를 원래 대역에 얹었다면 병합 뒤 하나로 합칠지.
12. **마이그레이션 병합 시점** — 병합되면 누군가의 `npm run db:migrate` 한 번으로 공유 DB 에 적용된다(concept-port §3.3 과 같은 위험).
13. `initialPassword.ts` 를 쪼개며 **concept-port 의 파일 둘**(`initialPassword.ts` · `mutate-concept-port.ts` 앵커 경로)을 건드렸다(§2.6).
14. 시청 기록은 읽고-합치고-쓰기다 — 같은 학생이 탭 둘로 동시에 보내면 한 번의 보고가 늦게 덮을 수 있다(다음 보고가 바로잡는다).
    SQL `GREATEST` 로 옮기면 규칙(`watchRules`)이 두 곳이 된다.
15. 문구에 **마침표**를 붙였다(«아이디 또는 비밀번호가 맞지 않습니다.» · «잠시 뒤 다시 시도하세요.») — 기존 API 문구가 모두 마침표로 끝난다. 브리프는 마침표 없이 적었다.
16. 공용 계약 `common.contract.ts` 에 에러 코드 `TOO_MANY_ATTEMPTS`(429) 를 더했다.
17. 이미 들어온 학생이 `/learn/login` 에 오면 `/learn` 으로 — 학생 세션은 `/login`·`/api/auth/callback/credentials` 에 못 가므로, 한 컴퓨터에서
    원장님이 들어가려면 학생을 먼저 로그아웃해야 한다.
18. 공개 그림(`/figures/**`)은 학생 세션에 **닫혔다**(로그인 안 한 사람에게는 열림).
19. 학생 세션 수명 = Auth.js 기본(30일) — 원장과 같다. 학생은 더 짧게 할지.
20. 학생 로그아웃은 **API**(`POST /api/learn/logout`)다 — 학생 화면이 서버 액션으로 로그아웃하면 그 페이지 POST 를 허용 목록에 적어야 한다.
21. `vitest.config.mts` 의 `server.deps.inline: ["next-auth"]` 는 **전체 시험에 걸리는 설정**이다(진짜 next-auth 를 읽는 시험에만 뜻이 있다).
    첫 전체 관문은 끊기기 전까지 71파일 초록 · 실패 0 이었지만 **끝까지 못 쟀다**(§0) — 병합 검수 때 전체 관문을 한 번 돌려 주길 바란다.
