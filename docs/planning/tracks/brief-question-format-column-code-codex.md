# 문항 형식 칸 — 코드 단계 (DB 적용 · 백필 끝, 2026-10-19)

공유 DB 에 `problem.actual_format` / `_version` / `_digest` 가 있고 118,166행이 채워졌다(미분류 54 · 대조 불일치 0). 마이그레이션 `prisma/migrations/20261019120000_problem_actual_format` · 보고서 `docs/planning/tracks/reports/question-format-column-db-codex-20261019.md` · 백필/검증 도구 `scripts/db/*problem-actual-format*`. 트리거가 입력 변경 시 세 칸을 NULL 로 되돌린다.

## 할 일
1. **읽는 쪽 전환**: 문제은행 목록(`loadQuestionBank`) · 범위 수량(`/sources?view=available`) · 출처 고르기(`/sources`) · 시험지 만들기 후보 · 작업실 bootstrap 등 `loadQuestionCandidates` + `classifyFormat` 전수 판정을 쓰는 곳이 저장된 형식을 쓰게 한다. DB 안에서 `COUNT(DISTINCT …)` 로 집계하고 쪽을 SQL 로 자른다. 칸이 NULL · 버전 불일치 · digest 불일치인 행만 기존 정확 판정으로 되돌린다(초안의 규칙 그대로) — 그 행 수가 적어야 빨라진다.
2. **쓰는 쪽**: 문항을 만들거나 고치는 앱 경로(Prisma)에서 형식을 같이 계산해 저장한다(트리거가 비운 것을 다시 채움). 또는 읽기 때 NULL 을 만나면 그 행만 판정해 채우는 지연 저장 — 둘 중 단순하고 안전한 쪽을 고르고 근거를 적는다. 적재 스크립트(교과서 등) 뒤에는 `scripts/db/backfill-problem-actual-format.ts` 를 다시 돌리면 된다는 안내를 해당 문서(08 · schoolbook 문서)에 한 줄.
3. 응답은 **바꾸기 전과 같아야 한다** — 기존 parity 시험(builderSpeed · questionBankProjection · PGlite) + 공유 DB 읽기만으로 전/후 응답 바이트 비교(주요 경로 × 몇 조건).
4. **실측**: 공유 DB 읽기만으로 첫 호출(캐시 없이) 전/후 3회 — 문제은행 목록 p1 · 다른 필터 · 범위 수량 · 출처 고르기. 목표: 각 2초대 → 수백 ms 이하. 측정 스크립트 기존 것 재사용(`scripts/qa/measure-*-live.ts`).
5. 화면 모양 · 문구 변경 없음. DB 스키마 변경 · 공유 DB 쓰기 금지(백필 재실행 포함 — 필요하면 보고만). `prisma generate` 는 하지 말 것(공유 node_modules — 이미 main 클라이언트에 칸이 있다면 그대로 쓰고, 없으면 보고). 커밋 금지.
6. 관련 시험 · `npm run type-check` · 변경 파일 eslint 통과. 보고서 `docs/planning/tracks/reports/question-format-column-code-codex-20261019.md`(전/후 표).
