# 개념 백지(D-150) — 모든 트랙 공통 규칙

설계 SSOT: `docs/planning/26-concept-blank.md`. 먼저 읽을 것: 그 문서 · `CLAUDE.md` 절대 규칙 · `src/contracts/conceptBlank.contract.ts`.

## 워크트리 준비 (한 번)
1. `git config --local user.email chrismathone@gmail.com` · `git config --local user.name SUN`
2. `npx prisma generate` — 안 하면 tsc 가 Prisma 형 부재로 수백 개 오류.
3. `.env` 가 없다 — 시험은 모킹이라 괜찮다. dev 서버가 필요하면 임시 `AUTH_SECRET=x DATABASE_URL=postgresql://x@127.0.0.1:1/x`.
4. 공유 main 기준(`origin/main`). 트랙 가지에만 커밋한다 — **main 에 푸시하지 않는다**(리드가 검토 뒤 병합).

## 지키는 것
- **맡은 파일만** 고친다(각 브리프의 «소유»). 다른 트랙 파일은 읽기만.
- TDD — 시험 먼저(RED → GREEN). 끝에 `npx vitest run <내 시험들>` · `npm run type-check` · `npm run lint:affordance` 초록.
- 문구 D-08(간결 · 사무적, 느낌표 · 이모지 없음) · 어포던스 D-30(누르는 것에만 손가락 · hover).
- 🔴 **교재 원문을 저장소에 넣지 않는다** — 문장은 우리 말로. `npx tsx scripts/qa/concept-blank/check-leak.ts` 0건.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`(codex 는 생략 가능).

## 보고
끝나면 `docs/planning/tracks/reports/cb-<트랙>.md` 에 보고서(한 일 · 시험 결과 숫자 · 못 한 것 · 원장님께 물을 것)를 커밋하고,
`worker_done` 에 그 경로를 `--report-path` 로 넣는다.
