# main 의 빨간 시험 정리 (2026-10-20)

서술형 작업에서 깨끗한 main(`b553ad38f`)으로 전체 시험을 돌렸더니 25파일 · 120실패, eslint 275오류였다(기록: `docs/planning/tracks/reports/descriptive-core-20261020/baseline-tests.md` — main 에 있다). 그중 58실패는 리드가 방금 고쳤다(`e7d296280` — 행 잠금 SQL 이 `::uuid` 로 바뀐 것을 시험 대역이 몰랐다).

## 할 일
1. 최신 origin/main 에서 **전체** 시험(`npm run test` — 저장소 래퍼 그대로)을 돌려 지금 남은 실패를 전부 모은다.
2. 실패마다 원인을 가른다: (a) 제품 코드가 바뀌었는데 시험이 옛 동작을 기대(정당한 변경 — 커밋 이력 · 결정 기록으로 근거 확인) → 시험을 새 동작에 맞추되 **검증 강도를 낮추지 않는다**, (b) 제품의 진짜 결함(시험이 맞음) → 고치지 말고 보고 · 원인 커밋, (c) 시험 대역 · 픽스처 미갱신(예: 메뉴 · 권한 fixture, 인메모리 Prisma 대역) → 대역을 고친다, (d) 시간 초과 · 부하 → 별도 표시.
   - 알려진 갈래: examStudy* · exportPerMenu 의 exam/practice 403(출력 권한 규칙 `canOutputFrom` 변경 84d58378f 와 다른 세션의 exam-study 경로가 엇갈림), noRmSync(rmSync 7곳), examWiringAudit(판단불가 4곳), 렌더 · 분수 시험 등.
3. 다른 세션(problem_make — exam-study 소유)의 파일을 고쳐야 하면 최소로 · 근거를 적고.
4. eslint 275 는 이번 범위 밖 — 개수 · 규칙별 분포만 보고.
## 지킬 것
DB 쓰기 금지 · 제품 동작 변경은 (b) 로 보고만 · 커밋 금지. 보고서 `docs/planning/tracks/reports/main-red-tests-codex-20261020.md`(실패별 분류 표 · 고친 것 · 보고만 한 것).
