# 문항 형식 칸 — DB 단계 (원장님 2026-10-19 승인 «2번도 승인»)

초안: `prisma/drafts/20261018-builder-question-format.md`(읽고 따른다). 목적: 문제은행 목록 · 범위 수량 · 출처 고르기가 매번 `classifyFormat` 으로 118,166행을 전수 판정하는 것(각 ~2초)을 없앤다.
**이번 지시는 DB 단계까지만.** 순서: DB 먼저 · 코드 나중(이 저장소 규칙 · 24번 문서 §6.1). 공유 DB 에는 **아무것도 쓰지 않는다** — 적용은 리드가 검토 뒤에 한다.

## 만들 것
1. 마이그레이션 SQL `prisma/migrations/<timestamp>_problem_actual_format/migration.sql` + `schema.prisma` 칸 추가(초안의 세 칸: 형식 · 규칙 버전 · 입력 digest — 최종 이름은 기존 명명 규칙에 맞춰 정하고 보고). 형식 값 CHECK. 입력 칸이 바뀌면 세 칸을 NULL 로 되돌리는 **트리거**(구버전 앱이 써도 우회 불가). 필요한 인덱스(집계 · 쪽 자르기에 쓰일 조합 — EXPLAIN 근거).
   - 🔴 배포 순서 안전: 칸 추가 · 트리거만으로 **지금 운영 코드가 깨지지 않아야** 한다(새 칸은 NULL 허용, 기존 쿼리 영향 없음). 이것을 시험으로 증명.
   - `prisma format` 금지. `schema.prisma` 는 손으로.
2. 로컬 PGlite(기존 `builderSpeedPglite` 헬퍼 방식)에서: 마이그레이션 적용 · 트리거(입력 변경 시 무효화 · 무관한 칸 변경 시 유지) · NULL · CHECK 시험.
3. 백필 스크립트 `scripts/db/backfill-problem-actual-format.ts`: 기존 TypeScript 정본 `classifyFormat`(+ 초안이 말하는 증거)로 계산, digest 기록. **기본은 드라이런**(공유 DB 읽기만 — 몇 행이 어떤 형식으로 채워질지 · unknown 수 · 걸린 시간 추정 · 표본 대조), `ALLOW_SHARED_IMPORT=1 … --apply` 일 때만 쓴다(배치 · 재개 가능 · 실패 표시 — 18번 문서 교훈). 이번에는 **드라이런만 실행**해 결과를 보고서에 싣는다.
4. 드라이런과 별개로 «백필 결과로 센 문항 수 = 지금 코드(전수 판정)가 센 수» 를 공유 DB 읽기만으로 대조(범위 수량 · 출처별 · 형식별) — 불일치 0 이어야 적용 대상.

## 지킬 것
공유 DB 쓰기 금지 · `npx prisma migrate deploy` 금지 · `prisma generate` 는 이 작업트리 안에서만(로컬 생성 클라이언트가 main 저장소와 공유되면 하지 말고 보고 — node_modules 는 심볼릭 링크다!). 비밀값 출력 금지. 커밋 금지.
보고서 `docs/planning/tracks/reports/question-format-column-db-codex-20261019.md`: 칸 · 트리거 · 인덱스 · 운영 영향 없음 근거 · 드라이런 수치 · 대조 결과 · 리드가 칠 적용 명령(드라이런 → 적용 순서).
