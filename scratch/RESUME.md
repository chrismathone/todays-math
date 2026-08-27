# 재개 지시

세션이 **끊겼다**(터미널이 사라짐). 네 커밋은 남아 있다. 이어서 하라.

## 먼저 할 것 (순서대로)

1. `git log --oneline main..HEAD` 로 **네가 어디까지 했는지** 확인하라.
2. `git status` 에 미커밋 수정이 있으면 **그것부터 마무리해 커밋**하라.
   (끊길 때 하던 일이다. 버리지 마라.)
3. `npx tsx scripts/qa/probe-middle-forms.ts` 로 **지금 값**을 보라.
4. `scratch/BRIEF.md` 의 표에서 **아직 통과 못 한 소단원**을 골라 이어가라.

## 그대로인 규칙

- **네 파일만** 건드린다(BRIEF.md §0). 공용(`scripts/qa/*`, `src/lib/engine/*`,
  `src/lib/generator/*`)은 건드리지 마라.
- **한 소단원을 끝낼 때마다 커밋하라.** 몰아서 하지 마라 — 또 끊길 수 있다.
- 관문: `node scripts/qa/run-tests.mjs` — 「N passed」가 아니라 **종료 코드**.
- `npx tsc --noEmit` 를 따로 돌려라(관문은 타입을 안 본다).
- **공유 DB 를 건드리지 마라.**
- 보고는 파일로: `scratch/REPORT-<갈래>-진척.md` 를 **갱신**하라.

## 착수 보고

1~3 을 마친 뒤 **지금 몇 / 130 인지, 다음에 칠 소단원 이름**을 한 문단으로 답하고 시작하라.
