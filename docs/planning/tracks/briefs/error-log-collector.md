# 브리프 — 거절·오류 로그 수집기 (2026-09-22)

> 메인 세션(D:\todays-math)이 쓴 브리프. 이 워크트리에서 만들고, **푸시하지 않는다** — 끝나면 보고 파일을 쓰고
> 메인에 알린다. 메인이 검수·병합·배포한다(CLAUDE.md 절대 규칙 4·10).

## 1. 왜

원장님 2026-09-22:
- «사용자가 요청한 요청사항이 거절되었을때 로그를 전부 수집할 수 있도록 로그 수집기도 구성해. 모든 곳에 로그를 붙여서 오류 로그 수집해야겠어»
- «최대한 자세하게 수집해서 수집된 로그로 업그레이드 패치 가능하게»
- «추후에 관리자 화면에서 로그 수집 확인가능하게»

오늘 실제로 일어난 일: 작업실 도형 재작도가 422(`labels.val30.point conflicts with its key`), «요청대로 고치기»가 400
으로 떨어졌는데 **사유가 우리 쪽 어디에도 안 남았다.** `recordAudit`(account_audit_log)는 `ai.execute` 실패를
`{ httpStatus }` 만 남기고, 엔진 원문은 Vercel 실행 기록(`console.error`)에만 있었다 — 메인 세션의 Vercel 연결은
운영 팀(chrismathone Pro)을 못 봐서 원장님이 기록을 손으로 복사해 붙여야 했다. 400 은 요청 계약(zod) 실패인데
어느 칸이 틀렸는지도 안 남는다(`src/lib/studio-ai/handler.ts` 의 catch 가 문구 하나만 돌려준다).

## 2. 원장님이 정한 것 (2026-09-22)

| 항목 | 결정 |
|---|---|
| 저장 위치 | **새 오류 기록 표** (감사 기록 표에 섞지 않는다) |
| 수집 범위 | **전부** — 서버 거절 4xx·5xx · AI 거절 원문 · 브라우저 쪽 오류 · 요청 요약. «최대한 자세하게» |
| 원본 이미지 | AI 도형 재작도 실패 때 **크롭 이미지도 저장** (상한 2MB) |
| 보관 | **90일** — 지난 것은 매일 지운다 |
| 보는 곳 | **당장은 화면 없음** — 조회 스크립트. 관리자 화면은 나중(D-07 절차로 Wire 부터 — 이번엔 만들지 않는다) |

## 3. 만들 것

### 3.1 표 `error_log` (Prisma 모델 + 마이그레이션 **파일만**)
- 제안 칸: `id` uuid · `createdAt` · `source`(`server`|`client`) · `kind`(예: `api-rejected` 4xx · `api-error` 5xx·예외 ·
  `ai-rejected` · `client-exception` · `client-request-failed`) · `route` · `method` · `status` · `action`(작업실 AI 의
  `figure-redraw` 같은 작업 이름) · `message`(화면에 나간 문구) · `detail`(개발자용 원문 — zod 이슈 경로·엔진 사유·스택) ·
  `context` jsonb(요청 요약·AI 시도 기록 — 아래) · `image` (AI 실패 크롭, 별도 칸 또는 별도 표 — 목록 조회가 무거워지지 않게) ·
  `userId`(nullable, 사용자 삭제 시 SetNull) · `release`(`VERCEL_GIT_COMMIT_SHA`) · `requestId`(`x-vercel-id`) · `durationMs`.
- 색인: 시각 · (route, 시각) · (action, 시각).
- 🔴 **운영 DB 에 적용하지 않는다.** 마이그레이션 파일만 만들고, 적용은 메인이 원장님 확인을 받고 한다(배포 순서는 DB 먼저·코드
  나중 — 24번 문서 §6.1). 코드는 표가 없을 때도 요청을 깨지 않아야 한다(기록 실패는 삼킨다 — `recordAudit` 처럼 best effort).
- 지점 분리(D-136, 워크트리 `phase/8-tenant`, 미병합)와 겹치지 않게 지점 칸은 두지 않는다 — 사용자로 이어 붙일 수 있다.
  24번 문서 §3·§5 를 한 번 읽고 겹칠 자리가 있으면 보고에 적는다.

### 3.2 서버 — «모든 곳»
- `src/app/api/**/route.ts` **88개**의 내보낸 처리기(GET/POST/…)를 공통 틀(예: `withErrorLog`)로 감싼다. 4xx·5xx 응답과 던진 예외를
  남긴다. 응답 본문은 **복제해서** 읽는다(원래 응답을 소비하지 않는다). 본문의 `error`·`detail` 을 `message`·`detail` 로.
- 🔴 **빠뜨림을 시험이 잡게 한다** — 모든 route.ts 의 모든 내보낸 메서드가 틀을 거치는지 세는 가드 시험. 새 경로가 틀을
  빠뜨리면 빨개져야 한다(20번 교훈 «주석이 있다고 단언한 가드가 없었다» · «가드가 0을 내면 못 센다일 수 있다» — 변이로 확인:
  틀 하나를 빼면 가드가 우는지).
- 400 계약 실패는 **어느 칸이 왜** 틀렸는지(zod issues 의 path·message)를 `detail` 에. 요청 본문 전체는 싣지 않는다.
- 민감한 값은 걸러 싣는다: 비밀번호·토큰·쿠키·Authorization·세션(`src/lib/audit.ts` 의 `SECRET_KEY` 규칙 참고).
- 로그 쓰기가 느려도 응답을 붙잡지 않게(예: `after()` 또는 기다리지 않는 쓰기 — Vercel 함수 수명 안에서 끝나는지 확인).

### 3.3 AI 실패 — «업그레이드 패치 가능하게»
- 도형 재작도(`src/lib/dev-ai/figure-engine.ts` `redrawDevAiFigure`): 시도마다 ① 모델이 낸 사양 ② 엔진 거절 원문 ③ 적용한 교정
  (`repairFigureSpec` 의 note/warning) ④ 원본 대조 지적을 **시도 기록(trail)** 으로 모아, 실패 때 `FigureRedrawError` 에 실어
  로그에 남긴다. 크롭 이미지(`request.imageDataUrl`, 2MB 상한)도.
- «요청대로 고치기»(`figure-edit`) · OCR · 해설도 같은 결로 — 모델 응답을 못 읽었을 때 응답 앞부분(잘라서)을 남긴다.
- 🔴 화면에 나가는 문구는 **바꾸지 않는다**(D-08 · D-135 ⑻ «엔진 거절 풀어 쓴 문구 그대로»). 로그에만 더 싣는다.

### 3.4 브라우저
- 받는 곳: `POST /api/logs/client`(이름은 정해도 된다). 로그인 안 한 사람(랩실 `/lab` 은 로그인 없이 연다 — D-135 ⑻)도 보낼 수
  있게 하되 **양 제한**(한 사람·한 IP 당 분당 몇 건, 본문 크기 상한). 이 경로 자체는 로그를 남기지 않는다(되먹임 고리 금지).
- 보내는 쪽: 루트 레이아웃에서 `error`·`unhandledrejection` 한 번씩 · 작업실 AI 요청 실패(`src/components/unified/aiResponse.ts`
  `readAiJson` — 이미 `status`·`message`·`detail` 을 안다) · 그 밖의 `fetch("/api/…")` 실패(15개 파일 — 공통 함수로 모을 수 있으면).
  같은 오류가 한꺼번에 쏟아지면 묶어서 보낸다.

### 3.5 보관 · 읽기
- 90일 지난 행을 지우는 정기 작업 — `vercel.json` 에 cron 이 하나 있다(`/api/tests/auto-draft/cron`, 인증 방식은 그 경로를 따른다).
- 조회 스크립트(예: `scripts/logs/recent-errors.ts` — 최근 N건·경로별·작업별 묶음, 한 건의 context 전체, 이미지를 파일로 저장).
  메인 세션이 이것으로 원인을 찾는다. 사용법을 보고에 적는다.

## 4. 지켜야 할 것
- **TDD**(절대 규칙 2): RED 를 먼저 보고 GREEN. 가드 시험은 변이로 우는지 확인.
- 화면·지면을 바꾸지 않는다(관리자 화면은 이번 범위 밖).
- 메인 세션이 지금 **도형 편집기**(`src/components/unified/figure-editor/`의 곡선 손잡이)를 고치는 중이다 — 그 폴더는 건드리지 않는다.
  `figure-engine.ts`·`figure-repair.ts` 는 이 트랙이 맡는다(메인은 오늘 이미 병합한 것 외엔 안 건드린다).
- 새 결정 번호(D-xxx)는 붙이지 않는다 — 결정 문장은 보고에 쓰고, 메인이 병합 때 번호를 붙인다(번호 겹침 전례 · 메모 참고).
- 기획 문서 번호를 새로 붙이지 않는다.
- 새 워크트리: `npx prisma generate` 먼저(안 하면 tsc 779 오류). `.env` 가 없다 — 실DB·유료 API 에 닿는 시험 금지(20번 교훈 2026-09-20).
- 관문: `npm run test`(관련 묶음) · `npx tsc --noEmit` 0 · `npm run lint` · `npm run lint:affordance`.
- 커밋은 이 워크트리 가지에만. 작성자 `SUN <chrismathone@gmail.com>`(`git config --local` 로 걸 것). **푸시 금지.**

## 5. 끝나면
- 보고: 워크트리 안 `scratch/REPORT-error-log.md` — 만든 것 · 표 설계(칸별 이유) · 가드와 변이 결과 · 관문 결과 · 마이그레이션 적용
  순서 · 결정 문장 초안 · 남긴 것(관리자 화면 등) · 메인이 확인할 것.
- 메인에 «끝났다» 한 줄로 알린다.
