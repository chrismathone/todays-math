# me-ops — 409 의 까닭 나누기 · 교사의 학습 설정 변경 기록 (서버만)

> 먼저 읽을 것: `docs/planning/27-explorers-teacher-visibility.md` §4(공백 5 · 6) · `docs/planning/10-handoff.md` 의 기억 학습 잔고(«대시보드가 모든 409 에 같은 말»).
> 가지: 워크트리는 이미 `chrismathone/me-ops`(로컬 main 에서 갈렸다) 위에 있다 — 새 가지를 만들지 않는다.

## 일 1 — 409 의 까닭을 코드로 가른다

지금 기억 학습 · 탐험 서버는 **revision 충돌**(낡은 탭 · 다른 기기)과 **임무 가드**(이미 끝난 임무 · 오늘 임무가 아님 등)를 같은 409 로 돌려주고,
화면은 어느 쪽이든 «다른 곳에서 기록이 변경…» 을 보인다.

- 서버: 409 응답의 오류 코드를 갈래별로 나눈다(기존 코드 이름 · `apiResponse` 관례를 따른다 — 새 HTTP 상태를 만들지 않는다).
  어떤 갈래가 있는지 **먼저 전수로 센다**(`src/lib/math-srs/serverStore.ts` · `serverRoutes.ts` · `courseRoutes.ts` · `courseTeacherRoutes.ts` · `src/lib/math-explorers/routes.ts`).
- 화면: 문구를 **새로 짓지 않는다.** revision 충돌은 지금 문구 그대로, 임무 가드는 그 서버 메시지를 그대로 보인다(이미 사무적인 한국어다 — D-08).
  컴포넌트에서 고치는 것은 «코드를 보고 어느 문구를 보일지 고르는 한 곳»뿐이다. 모양(배치 · 색 · 크기)은 건드리지 않는다.
- 시험: 갈래마다 코드가 맞는지(서버) · 화면이 코드를 보고 맞는 문구를 고르는지(RTL). 기존 409 시험(`mathExplorersRoutes.test.ts` · `mathSrsServer.test.ts` · `mathSrsCourseServer.test.ts`)이 그대로 초록이어야 한다.

## 일 2 — 교사의 학습 설정 변경을 남긴다

초등 «오늘의 기억» 의 학습 설정(`courseTeacherRoutes.ts` — 시작 소단원 · 하루 분량 · 자동 진행 등)은 `configuredAt` 만 남고 **누가** 바꿨는지가 없다.

- `prisma/schema.prisma` 의 `AccountAuditLog`(와 `src/lib/audit.ts`)가 이 기록을 받을 수 있는지 먼저 본다.
  **표 · 칸을 새로 만들어야 하면 하지 말고 멈춰서 보고하라**(공유 DB 마이그레이션은 원장님 승인 사항).
- 받을 수 있으면: 설정이 실제로 바뀐 쓰기마다 누가(계정) · 누구를(학생) · 무엇을(바뀐 칸의 앞뒤 — 학생 이름 · 문항은 싣지 않는다) 남긴다.
  감사 기록 실패가 설정 저장을 막지 않게(기존 `audit.ts` 의 관례대로).
- 시험: 바뀐 쓰기는 한 줄 · 안 바뀐 쓰기는 0줄 · 남의 학생은 거절되고 0줄.

## 하지 않는 것

DB 마이그레이션 · 학생 화면 · 저장 꼴(payload) 변경 · 새 문구 짓기 · 27번 문서 §3 의 «하지 않는다» 목록.

## 끝났다는 것

- 고친 파일을 무는 시험 통과(파일 이름을 적어 `--pool=threads --maxWorkers=1`) · `npx eslint` · `npx prettier --check` · `npm run lint:affordance`(컴포넌트를 고쳤으면).
- 보고서 `docs/planning/tracks/reports/me-ops.md` — 409 갈래 표(앞 · 뒤) · 감사 기록 꼴 · 못 한 것.
- 가지에 커밋(main 에 밀지 않는다) → `worker_done`.

## 공통

node_modules 는 main 을 가리키는 정션 — `npm install` · `npx prisma generate` 금지. 전체 `npm run type-check` 금지(리드가 병합 뒤).
무거운 검사 전에 `C:\Users\user\orca\cb-verify.lock` 가 있으면 기다리고, 없으면 만들고(내용: 트랙 이름) 돌린 뒤 지운다. 답과 보고서는 한국어.
