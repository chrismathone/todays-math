# 작업실로 이동이 느리다 (원장님 2026-10-19)

관리 콘솔 «작업실로 이동»(`/`) 을 누르면 한참 멈춘다.

## 리드가 잰 것 (공유 DB, 읽기만)
`src/app/(main)/page.tsx` → `WorkspacePage` → `loadUnifiedBankBootstrap("question")`(`src/lib/unifiedPreview.ts:518`).
이것이 `loadQuestionCandidates` 로 출제 가능 문항 전체를 읽어 총수 · 학년 · 단원 목록을 만든다.
3회: 2,719 / 2,040 / 2,154ms · 결과 118KB (total 67,893). **화면의 첫 바이트가 이것을 다 기다린다.** `loading.tsx` 도 없다.
작업실을 열 때마다(모든 메뉴, 시험지 만들기 포함) 이 값을 다시 계산한다.

## 할 일
1. **작업실 첫 화면이 이 계산을 기다리지 않게 한다.** 문제은행 메타데이터는 문제은행 화면이 실제로 필요할 때 받거나(이미 있는 API 를 먼저 찾아 재사용), Suspense 스트리밍으로 뒤에 채운다. 어느 쪽이든 다른 메뉴는 즉시 뜬다.
2. 같은 값의 반복 계산은 main 에 막 들어간 `src/lib/bankReadCache.ts` 를 써서 줄인다(계정 · 지점별로 섞이지 않는지 확인 — 이 값이 계정에 따라 달라지는지 먼저 본다).
3. 문제은행 화면에서 메타데이터가 오는 동안의 상태는 **기존 화면에 이미 있는 불러오는 중 표시**를 쓴다. 새 모양 · 새 문구를 만들지 않는다(D-07). 새 표시가 꼭 필요하면 만들지 말고 보고서에 적는다.
4. 시험: 작업실 첫 렌더가 bootstrap 을 await 하지 않음을 잠그는 시험 · 문제은행 화면이 메타데이터를 받아 기존과 같은 값으로 그리는 시험. 관련 기존 시험 · `npm run type-check` · eslint · `npm run lint:affordance` 통과.
5. 공유 DB 에 대어 읽기만 하는 측정: 바뀌기 전/후 `/` 서버 렌더가 기다리는 시간. 실행은 `npx tsx --conditions=react-server --env-file=/Users/pss/Desktop/creative/today_/.env ...`. 쓰기 · 비밀값 출력 금지.
6. DB 스키마 · `prisma generate` · 커밋 금지. 보고서 `docs/planning/tracks/reports/workspace-entry-speed-codex-20261019.md`.
