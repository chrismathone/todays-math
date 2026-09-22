# 보고 — 거절·오류 로그 수집기 (트랙 error-log, 2026-09-22)

> 브리프: `docs/planning/tracks/briefs/error-log-collector.md` · 가지 `chrismathone/error-log` · 기준 `f63bd388`
> **푸시하지 않았다.** 🔴 **운영 DB 에 적용하지 않았다**(드라이런도 안 돌렸다 — 워크트리에 `.env` 없음).
> 결정 번호(D-xxx)·기획 문서 번호는 붙이지 않았다 — «결정 문장 초안»에 번호 없이 적었다.
> 커밋 6개(§9 끝) · 136파일. 도형 편집기 폴더(`src/components/unified/figure-editor/`)는 건드리지 않았다.

---

## 1. 한 줄 요약

모든 API 거절(4xx)·실패(5xx·예외)와 관문의 API 403, 브라우저 오류가 새 표 `error_log` 에 한 줄씩 남는다.
작업실 AI 실패는 **시도 기록**(모델 출력·엔진 거절 원문·교정·원본 대조)과 **크롭 이미지**까지 남아, 오늘의
422(`labels.val30.point conflicts with its key`)·400 같은 것을 Vercel 기록 없이 스크립트로 되짚을 수 있다.
**화면 문구는 한 글자도 안 바뀌었다**(시험이 응답 본문을 글자까지 잠근다).

---

## 2. 만든 것

| 조각 | 파일 | 무엇 |
|---|---|---|
| 표 | `prisma/schema.prisma` · `prisma/migrations/20260922120000_error_log/` | `ErrorLog` · `ErrorLogImage` (§3) — **파일만** |
| 기록기 | `src/lib/errorLog/record.ts` · `sanitize.ts` | best effort 쓰기(5초 상한 · 표 없으면 삼킴 · FK 막히면 사용자 칸 비우고 재시도), 비밀 걸러내기, 길이 상한, 이미지 2MB |
| 요청 메모 | `src/lib/errorLog/scope.ts` · `describe.ts` | `AsyncLocalStorage` — 깊은 곳이 `noteErrorLog()` 로 남기고, **실패했을 때만** 틀이 싣는다 |
| 라우트 틀 | `src/lib/errorLog/withErrorLog.ts` | 4xx·5xx·예외 → `after()` 로 기록, 응답 본문은 복제해서 읽음, 머리 `x-error-log-id` |
| 서버 양 제한 | `src/lib/errorLog/serverQuota.ts` | 같은 «경로·상태·사람» 분당 20줄 — 넘친 수는 다음 줄 `context.suppressedBefore` 로 |
| 감싸기 | `src/app/api/**/route.ts` **89개 · 메서드 121개** | 기존 88개(120 메서드) + 새 정리 cron 1개. 받는 곳 `/api/logs/client` 하나만 예외 |
| 가드 | `src/__tests__/unit/errorLogRouteCoverage.test.ts` | 소스(AST, 메서드 단위·경로 일치) + 행동(모듈 적재 후 표지) 두 겹 (§4) |
| AI 실패 | `dev-ai/figure-engine.ts` · `figure-edit.ts` · `tasks.ts` · `studio-ai/api.ts` · `execute.ts` · `handler.ts` · `api/dev/unified/ai` | §5 |
| 사용자 | `src/lib/session.ts` · `src/lib/accountAccess.ts` | 세션을 읽을 때 사용자 id 를 메모로(라우트 63곳이 이 둘을 지난다) |
| 관문 | `src/proxy.ts` · `accountRouteAccess.ts` · `routeAccess.ts` | 관문의 API 403 도 기록 · `/api/logs/client` 통과 · 감사 기록에 안 쌓임 (§6) |
| 브라우저 | `src/lib/errorLog/clientReporter.ts` · `components/errorLog/ClientErrorLog.tsx` · `app/layout.tsx` · `components/unified/aiResponse.ts` | §7 |
| 받는 곳 | `src/app/api/logs/client/route.ts` · `src/lib/errorLog/clientQuota.ts` | 로그인 없이도 · 분당 30건/사람 · 32KB · 교차 사이트 거절 · 스스로 기록 안 함 |
| 보관 | `src/lib/errorLog/purge.ts` · `src/app/api/logs/purge/cron/route.ts` · `vercel.json` | 90일 지난 줄 삭제(이미지는 FK CASCADE), 매일 18:30 UTC(03:30 KST) |
| 조회 | `scripts/logs/recent-errors.ts` · `errorLogQuery.ts` | §8 |
| 적용 | `scripts/qa/apply-error-log-migration.ts` | 이 마이그레이션 하나만 · 드라이런 먼저 · 되돌리기 — **안 돌렸다** |
| 계약 | `src/contracts/errorLog.contract.ts` · `errorLogValues.ts` | 종류·상한·머리 이름(브라우저는 zod 없이 값만) |
| 시험 대역 | `src/mocks/errorLogTestDouble.ts` (+ `prismaTestDouble.ts` 7줄) | 따로 둔 까닭: 지점 트랙이 `prismaTestDouble.ts` 를 같이 고친다 |

---

## 3. 표 설계 — 칸별 이유

`error_log` (감사 기록 표와 섞지 않는다 — 원장님 결정)

| 칸 | 형 | 이유 |
|---|---|---|
| `id` | uuid, **기본값 없음** | 틀이 응답 **전에** id 를 정해 머리 `x-error-log-id` 에 싣는다 — 브라우저가 «서버가 이미 기록했다»를 안다. 줄 쓰기는 응답 뒤라 DB 기본값으로는 못 한다 |
| `created_at` | timestamptz(6) | 90일 정리·시각 색인. 요즘 표들과 같은 형 |
| `source` | varchar(10) | `server` · `client`. 열거형(enum) 대신 글자 — 종류가 늘어도 마이그레이션이 필요 없다(계약이 zod 로 막는다) |
| `kind` | varchar(40) | `api-rejected` · `api-error` · `ai-rejected` · `client-exception` · `client-request-failed` |
| `route` | varchar(300) | 서버는 **라우트 틀**(`/api/tests/[id]`) — 묶음 조회의 열쇠. 관문 거절은 실제 경로, 브라우저는 화면 경로(질의 문자열 뺌) |
| `method` · `status` | varchar(10) · int | 예외는 status 500. 브라우저 네트워크 끊김은 0 |
| `action` | varchar(60) | 작업실 AI 작업 이름(`figure-redraw`…) — 작업별 묶음 |
| `message` | text(코드가 1000자로 자름) | **화면에 나간 문구 그대로** |
| `detail` | text(8000자) | 개발자용 원문 — zod 경로·문구, 엔진 거절 원문, 스택, 상태 |
| `context` | jsonb(64KB로 조임) | 요청 요약(경로·질의(비밀 가림)·형식·크기·참조 화면·브라우저·params), AI 요청 요약, 시도 기록, 모델 응답 앞부분, 상류 원문, 본문 모양 |
| `user_id` | uuid null, FK **SET NULL** | 계정을 지워도 진단 기록은 남는다. uuid 가 아닌 주체(개발 다리 `local-development`)는 `context.actor` |
| `release` | varchar(64) | `VERCEL_GIT_COMMIT_SHA` — 어느 배포에서 났나. 브라우저 쪽은 화면의 배포를 `context.clientRelease` 로 따로(오래 켜 둔 탭) |
| `request_id` | varchar(200) | `x-vercel-id` — Vercel 실행 기록과 맞춰 볼 때 |
| `duration_ms` | int | 느려서 사용자가 취소(499)·시간 초과(504)한 것을 가른다 |

`error_log_image` — **별도 표**(1:1, FK **CASCADE**): 목록 조회(`findMany`)가 bytea 를 끌고 오지 않게. `mime_type` · `byte_size` · `data bytea`.
2MB 를 넘으면 싣지 않고 `context.imageSkipped = {reason, bytes}`.

색인: `created_at DESC` · `(route, created_at DESC)` · `(action, created_at DESC)` · `(user_id, created_at DESC)` — 브리프의 셋 + 사용자
(FK SET NULL 이 계정 삭제 때 이 표를 훑지 않게 · 사람별 조회). **RLS 켬**(저장소 관례 — 정책 없음 = Supabase 공개 API 로 못 읽음).

지점 칸은 없다(브리프). 24번 문서와 겹치는 자리는 §10.

---

## 4. 가드와 변이

**가드** `errorLogRouteCoverage.test.ts` — 20번 교훈 2026-09-21(«표지로 센 전수는 "그 파일이 안다"까지만»)을 따라 파일이 아니라 **메서드 하나하나**를 센다.

- ⑴ 소스(TypeScript AST): `export async function GET` · 틀 없는 `export const` · 구조분해(`export const { GET } = …`) · 다시 내보내기(`export { h as GET }` · `export *`)는 전부 빨강(«증명할 수 없는 모양»은 통과가 아니다). 틀의 첫 인자가 **그 파일의 경로**와 같아야 한다.
- ⑵ 행동: 89개 모듈을 실제로 불러 내보낸 메서드가 틀의 표지(`ERROR_LOG_ROUTE`)를 들고 있는지(약 6~8초).
- 0 방지: 파일 > 80 · 메서드 ≥ 파일 수, 메서드를 하나도 못 찾은 파일은 그 자체로 빨강.
- 예외 목록이 낡지 않았는지: `/api/logs/client` 가 실재하고 틀을 **안** 쓰는지.
- 음성 대조 9종(일부러 틀린 소스)을 시험 안에 박았다(20번 교훈 2026-08-21 «0 은 못 센다일 수 있다»).

**변이(실제 파일)** — 셋 다 두 겹이 모두 울었다:

| 변이 | ⑴ 소스 | ⑵ 행동 |
|---|---|---|
| `units/route.ts` 의 틀을 뺌(`export async function GET`) | `GET: 함수 선언을 그대로 내보낸다` | `/api/units GET — 표지 undefined` |
| 틀의 경로를 `/api/unit` 으로 | `틀의 경로가 파일과 다르다 — /api/unit ≠ /api/units` | `/api/units GET — 표지 /api/unit` |
| `basket/route.ts` 세 메서드 중 DELETE 만 뺌 | `DELETE: 함수 선언을 그대로 내보낸다` | `/api/basket DELETE — 표지 undefined` |

그 밖에 구현 뒤에 쓴 시험 하나(상류 원문)도 변이로 확인: `rest()` 의 메모 한 줄을 지우면 2개 빨강.

---

## 5. AI 실패 — «업그레이드 패치 가능하게»

모두 **요청 메모**로 남고 실패했을 때만 실린다. 응답(화면 문구·`detail`)은 그대로.

- **도형 재작도**(`figure-engine.ts`) — `context.figureTrail[]`, 시도마다: 되물은 사유(`repairPrompt`)·반박(`refusal`) · 모델 출력 앞 6천 자(사양 JSON) · 모델 note · 엔진 거절 원문(`engineErrors[]`, 교정하며 다시 그릴 때마다) · 적용한 교정(`repairs[] = {note, warning, error}`) · 교정 뒤 사양 · 원본 대조(`review`) · 결과(`outcome`: declined·rebutted·engine-rejected·engine-failed·unsafe-svg·review-unreadable·review-failed·rendered·timeout·error) · 걸린 시간. **크롭 이미지** → `error_log_image`.
  - 처음엔 브리프대로 `FigureRedrawError` 에 싣으려 했는데, 요청 메모로 바꿨다 — 그래야 422 가 아닌 실패(두 번째 시도의 상류 429·5xx, 엔진 실행 실패, 시간 초과)에서도 시도 기록이 남는다.
- **요청대로 고치기**(`figure-edit.ts`) — `context.figureEditTrail[]`(모델 출력 앞부분·되물음·못 읽은 사유) + `figureEditRequest`(요청 문장 500자·지금 그림 8KB). 크롭 이미지는 **안 싣는다**(결정은 재작도만 — §11).
- **OCR·해설**(`tasks.ts`) — 첫 응답을 못 읽으면 `context.modelResponse = {head(4천 자), length}`. `DevAiParseError.diagnostic` 에 진짜 zod 경로·문구(응답에는 안 나감 — `message` 는 기존 거름 규칙 그대로).
- **상류 API**(`api.ts`) — 전에는 실패 본문을 읽지 않고 버렸다(`body.cancel()`). 이제 REST 는 `{host, path, status, retryAfter, body 앞 2천 자}`, SDK 는 `{vendor, model, status, message}` 를 `context.upstream[]` 에(재시도마다 하나씩). 키 값이 되비쳐도 기록기가 거른다(시험 있음).
- **400 계약 실패**(`handler.ts` · dev 라우트) — `detail` 에 `경로: 문구 (code · 기대 형)` 한 줄씩, `context.requestShape` 에 본문의 **모양**(열쇠·형·크기, 열거형 값 `action`·`provider`·`grade`·`model` 만). 본문 값은 안 싣는다 — 시험이 «요청 문장이 기록에 없다»를 잠근다.
- 요청 요약(`execute.ts`) — `aiRequest`(작업·경로·공급자·학년·글자 수·이미지 바이트·그림 요소 수) · `aiRoute`(실제 모델).

---

## 6. 관문(`proxy.ts`)

- `POST /api/logs/client` 는 로그인 안 한 사람 · 메뉴 없는 원장 · 승인 대기 · 검수 계정 · 관리자 모두 지난다. 한 경로·POST 만(시험이 옆 경로를 막는다).
  - 검수 계정 허용 목록(`REVIEWER_RULES`)에 한 줄 더했고, 잠금 시험(`routeAccess.test.ts`)에 까닭과 함께 올렸다.
  - 🔴 **학생 세션은 열지 않았다** — D-124 허용 목록은 원장님 결정이라 이 트랙이 넓히지 않는다. 학생 화면의 보고는 403 을 받고 그 화면에서 멈춘다(§11 결정 대기).
- `/api/logs/` 요청은 감사 기록(`request`)에 안 쌓인다.
- 관문이 직접 낸 API 403(메뉴 없음·승인 대기·검수 전용·학생 관문)도 오류 기록에 — `context.stage = "proxy"`(학생이면 `student` = 학생 계정 id). 틀은 관문 뒤라 이 거절을 못 본다. 로그 받는 곳에 대한 거절은 기록하지 않는다(되먹임 금지).

## 7. 브라우저

- 루트 레이아웃의 `ClientErrorLog`(그리는 것 없음)가 보고기를 한 번 설치한다. **설치 안 하면 아무것도 안 보낸다** — 컴포넌트 시험이 `readAiJson` 을 불러도 네트워크 없음.
- `error` · `unhandledrejection` — «Script error.» · 확장 프로그램 · ResizeObserver · 사용자 취소는 뺀다.
- `/api/…` 요청 실패 — 15개 화면의 `fetch` 를 하나하나 고치지 않고 `window.fetch` 를 한 번 감쌌다(응답·예외는 그대로). **서버가 기록 못 한 것만**(기록 번호 머리 없음): 네트워크 끊김(상태 0) · 플랫폼이 먼저 자른 413·504 · 게이트웨이 HTML. 우리 `/api` 밖·화면(RSC) 요청은 안 본다.
- 작업실 AI — `readAiJson` 이 화면 문구(`aiFailureMessage`)와 함께 보낸다(기록 번호가 없는 거절 + **JSON 이 아닌 200**). 감싼 fetch 는 AI 거절을 건너뛰어 두 번 가지 않는다.
- 2초 묶음 · 같은 것은 count · 한 번에 10건 · 한 화면 50건 · 떠날 때 `sendBeacon` · 받는 곳이 403/404 면 멈춤 · 보고 실패는 다시 보고 안 함.

## 8. 조회 — 사용법

`.env` 가 있는 곳(main)에서, 읽기만 한다:

```bash
npx tsx scripts/logs/recent-errors.ts                                   # 최근 24시간 30건
npx tsx scripts/logs/recent-errors.ts --action figure-redraw --since 7d # 재작도 실패 일주일
npx tsx scripts/logs/recent-errors.ts --route /api/studio/ai --status 400
npx tsx scripts/logs/recent-errors.ts --kind client-request-failed --since 6h
npx tsx scripts/logs/recent-errors.ts --group route                     # 경로별 건수·마지막 시각·대표 문구·최근 id
npx tsx scripts/logs/recent-errors.ts --group action --since 30d
npx tsx scripts/logs/recent-errors.ts --id <uuid>                       # 한 건 전체 — 원문 + context JSON(시도 기록·zod 칸·모델 응답·상류 원문)
npx tsx scripts/logs/recent-errors.ts --image <uuid> --out scratch/err  # 크롭 이미지를 파일로
npx tsx scripts/logs/recent-errors.ts --json ...                        # 기계용
```

그 밖: `--source server|client` · `--user <uuid>` · `--limit N` · `--since 30m|6h|7d|2026-09-20`. 모르는 인자·틀린 값은 멈춘다.
표가 아직 없으면 «마이그레이션이 아직 적용되지 않았다»고 말한다. (실DB 로는 못 돌려 봤다 — 인자·도움말·DB 연결 실패 처리만 확인.)

---

## 9. 관문 결과

| 관문 | 결과 |
|---|---|
| `npx tsc --noEmit` | **0** (마지막 코드 기준) |
| `npm run lint` | 오류 **0** · 경고 57 — 전부 이 트랙이 안 건드린 파일(`src/lib/middle/*` 등). 이 트랙 파일은 경고도 0 |
| `npm run lint:affordance` | 통과 |
| 이 트랙의 새 시험 11파일 | **118/118** 통과 |
| **영향 시험 220파일**(라우트·관문·세션·작업실 AI·aiResponse·오류 기록을 import 하는 모든 시험) | 파일 212 통과 · **6 실패** · 2 건너뜀 / 시험 6338 통과 · **8 실패** · 3 건너뜀 — 1·2번(5개)은 기준 커밋에서도 빨강(확인), 3번(3개)은 부하 속 시간 초과 |
| 전체 `npm run test`(744파일) | 🔴 **못 끝냈다** — 아래 |
| `next build` | 🔴 **못 끝냈다** — 시스템 메모리 부족으로 하네스가 멈췄다(다시 돌리지 않았다). 빌드 때 Next 가 만드는 라우트 형 검사(`.next/types`)를 **확인하지 못했다** |

**실패 8개의 내역**

1. `proxyStudentGate.test.ts` 2개 — 🔵 **기준 커밋 `f63bd388` 에서도 같은 2개가 빨갛다**(임시 워크트리로 확인). 학생 관문 전수가 `/lab/cube-3-1`(랩실 트랙이 main 에 넣은 화면)을 예상 목록에 없다고 잡는다. 랩실 트랙 몫이라 손대지 않았다.
2. `StudioFigureEditor.aiEdit.test.tsx` 1개 · `UnifiedWorkspace.access.test.tsx` 2개 — 🔵 **기준 커밋에서도 같은 3개가 같은 사유로 빨갛다**(«expected [] to deeply equal [1,2,3]» · «button "문제은행" 없음» · «heading "보관 중인 시험지" 없음»). 혼자 돌려도 재현. 이 트랙과 무관.
3. `elemTiersG4Line`(120초) · `middleM3Func`(120초) · `middleM3Stat2`(20초) — **시간 초과**. 실제 파이썬 엔진으로 문항 그림을 그리는 시험이고, CPU 100%(다른 세션 포함 node 36개)·메모리 부족 중이었다. 이 트랙이 건드린 경로(작업실 재작도·고치기)가 아니라 `renderFigureSpec` 문항 렌더다. **기준에서 다시 재 보지는 못했다**(메모리).

**못 끝낸 것 두 가지 — 메인이 다시 돌려 주면 좋은 것**

- 전체 `npm run test`: 첫 시도는 19분쯤 끊겼고, 두 번째는 744파일을 시간당 ~200파일 속도로 돌고 있어 내가 멈추고 «영향 220파일»로 좁혔다(브리프의 «관련 묶음»). 그 뒤 이 트랙의 고아 vitest 작업자들이 CPU 를 쥐고 있던 것을 찾아 정리했다(CPU 100% → 49%).
- `next build`: tsc 는 라우트 처리기 형을 통과하지만, 빌드가 만드는 라우트 내보내기 검사는 따로다. 감싼 처리기는 매개변수·반환 형을 그대로 보존하도록 짰다(`(...args: Parameters<H>) => Promise<Awaited<ReturnType<H>>>`). **병합 전에 한 번 빌드**를 권한다.

**그 밖에 돌려 본 것**(개발 중, 각 단계 끝에): API 시험 57파일(감싸기 직후 — 실패 2개는 가드 예외 항목·학생 전수 DB 덫, 둘 다 고친 뒤 초록) · 작업실 AI 회귀 12파일 332개 · 관문·접근 8파일 148개(실패 2 = 위 1번).

**커밋**(`f63bd388` 위, 푸시 안 함)

```
ce0b4f1b 서버 쪽 양 제한 — 같은 경로·상태·사람 분당 20줄, 넘친 수는 다음 줄에
2d5e40b1 조회 스크립트 · 마이그레이션 적용 스크립트(미실행)
9d603a9e 브라우저 쪽 오류 · 관문의 API 거절 · 90일 정리
4e89c6fe AI 실패를 패치 재료로 — 도형 재작도 시도 기록·크롭 이미지, 400 의 zod 칸, 모델·상류 원문
adc7ee78 route.ts 88개 · 메서드 120개를 withErrorLog 로 감싼다 + 빠뜨림 가드
2a31a995 표·기록기·라우트 틀 withErrorLog — 거절·실패를 한 줄씩, 요청을 깨지 않게
```

---

## 10. 24번 문서(지점 분리)와 겹치는 자리

- **표**: `error_log` 는 §4.2 분류로 «계정 기록» 갈래(`AccountAuditLog` 옆)다 — 지점 칸 없음, `user_id` 로 계정의 지점에 이어 붙인다. 34 → 36 모델.
  나중 관리자 화면이 **지점 원장**에게 보이려면 `user.tenant_id` 로 걸러야 한다(§3.4 의 `isAdmin` 두 뜻 — 이 화면은 «서비스 관리자» 전용으로 시작하는 것을 권한다).
- **파일 겹침** — 지점 트랙(`phase/8-tenant`, `c49030a8` 위 미커밋) 변경 목록과 교집합 **11개**: `prisma/schema.prisma`(User 관계 한 줄 + 끝에 모델 둘) · `src/proxy.ts` · `src/lib/session.ts` · `src/lib/accountAccess.ts` · `src/mocks/prismaTestDouble.ts`(7줄) · 라우트 6개(`admin/users/[id]` · `basket/test` · `classes` · `exam/rounds` · `exam/rounds/[id]` · `tests/predicted`). 라우트는 처리기 첫 줄(`export async function` → `async function handleX`)과 파일 끝 두세 줄만 바꿨다 — 본문을 고친 쪽과는 대개 자동 병합된다. 지점 트랙이 **처리기 선언 줄**을 고쳤으면 손으로 합친다.
- **마이그레이션 순서**: `20260921120000_tenant_wall_expand`(미적용) · `20260922120000_error_log`(미적용)는 서로 다른 표라 순서 무관. 둘 다 적용 스크립트가 «이것 하나만» 적용한다.
- 관문의 거절 기록은 `rejected()` 한 함수를 거친다 — 지점 트랙이 관문에 새 403 을 더하면 그 함수로 감싸면 된다.

## 11. 남긴 것 · 원장님 결정 대기

- **관리자 화면** — 이번 범위 밖(D-07 절차 — Wire 부터). 조회 스크립트가 그 전까지의 도구.
- **학생 화면 오류** — 학생 세션은 `/api/logs/client` 를 못 쓴다(D-124 허용 목록). 열려면 `studentRouteAccess.ts` 의 `ACTIVE_RULES`·`MUST_CHANGE_RULES` 에 `POST /api/logs/client` 한 줄씩 + 잠금 시험 갱신. 원장님 결정 사항.
- **고치기·OCR 크롭 이미지** — 결정은 «도형 재작도 실패 때»만이라 안 실었다. «요청대로 고치기»도 같은 이미지가 있으면 재현이 쉬워진다 — 원하시면 `figure-edit.ts` 의 메모에 `image` 한 칸.
- **관문 거절의 `route`** 는 라우트 틀이 아니라 실제 경로다(관문은 틀을 모른다) — 묶음 조회 때 id 가 섞인다.
- **양 제한은 서버 프로세스마다**(서버리스 인스턴스가 여럿이면 전역 상한이 아니다) — 폭주를 묶는 목적.
- **Next 흐름 신호**(redirect·notFound)는 오류로 안 센다. 로그인 실패(Auth.js 는 4xx 가 아니라 되돌림)는 기록되지 않는다.
- 요청 본문은 어떤 경우에도 싣지 않는다(모양만).

## 12. 메인이 확인할 것

1. **적용 순서**(원장님 확인 뒤): ① main 에 병합 → ② `npx tsx scripts/qa/apply-error-log-migration.ts`(드라이런 — 칸·FK·색인·RLS·user 행 수 확인 후 ROLLBACK) → ③ `ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-error-log-migration.ts --apply` → ④ 배포. DB 먼저·코드 나중(24번 §6.1)을 따르되, 거꾸로 되어도 요청은 안 깨진다 — 표가 없으면 쓰기가 실패를 삼키고 서버 기록에 `[오류 기록] 남기지 못했습니다: P2021` 한 줄.
2. **`CRON_SECRET`** 이 운영에 있어야 정리 cron 이 돈다(자동 초안 cron 과 같은 값). 없으면 503 이고 표가 자란다.
3. **Vercel cron 두 개** — Pro 는 넉넉하다(Hobby 도 하루 한 번짜리 둘은 된다).
4. `after()` 는 Vercel `waitUntil` 로 함수 수명 안에서 돈다. 쓰기는 5초 상한(`ERROR_LOG_WRITE_TIMEOUT_MS`)이라 함수를 붙잡지 않는다. **실배포에서 한 번**: 일부러 400 을 하나 내고(예: 작업실 AI 에 빈 JSON) `recent-errors.ts --limit 1` 로 줄이 섰는지.
5. **`next build` 와 전체 `npm run test` 를 한 번** — 이 워크트리에서는 메모리 부족으로 끝내지 못했다(§9). 기존 빨강 5개(§9 1·2번)는 기준 커밋에서도 빨갛다.
6. 응답에 새 머리 `x-error-log-id` 가 붙는다(4xx·5xx 만). 본문은 그대로.

## 13. 결정 문장 초안 (번호는 메인이)

> **오류 기록 (2026-09-22, 원장님)** — 사용자의 요청이 거절(4xx)·실패(5xx·예외)되거나 브라우저에서 오류가 나면 새 표 `error_log` 에
> 한 줄씩 남긴다(감사 기록 표와 섞지 않는다). ⑴ 모든 `src/app/api/**/route.ts` 의 모든 메서드는 `withErrorLog("<경로>", 처리기)` 를
> 지난다 — 가드 시험이 메서드 단위로 센다(예외는 받는 곳 `/api/logs/client` 하나). ⑵ 화면 문구는 바꾸지 않는다 — 개발자용 원문·요청
> 요약·AI 시도 기록은 기록에만 싣는다. 요청 본문은 싣지 않는다(모양만). 비밀 값은 걸러 싣는다. ⑶ AI 도형 재작도 실패는 크롭 이미지(2MB
> 상한)를 별도 표에 남긴다. ⑷ 90일 보관 — 매일 지운다. ⑸ 보는 곳은 당장 조회 스크립트(`scripts/logs/recent-errors.ts`),
> 관리자 화면은 나중에 D-07 절차로. ⑹ 기록은 best effort — 표가 없거나 DB 가 느려도 요청을 깨지 않는다. ⑺ 같은 경로·상태·사람은
> 분당 20줄(넘친 수는 다음 줄에), 브라우저는 사람당 분당 30건.
