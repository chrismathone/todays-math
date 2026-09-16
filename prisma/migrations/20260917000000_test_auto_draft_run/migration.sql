-- ⚠️ 미적용 초안 (D-133 ⑴) — 리드가 병합 뒤 드라이런 → 적용한다(원장님 확인 받음)
--
-- 시험지가 **어느 아침 자동 회차로 섰는지** 적는 칸 — `test.auto_draft_run_id`.
-- 메인 «오늘의 확인테스트» 검수 줄의 «자동 출제» 표지가 이 칸 하나만 본다.
-- 결정: D-133 ⑴⑵ · 브리프: docs/planning/tracks/briefs/plan-screen-followup.md §1.1
-- 앞선 마이그레이션: 20260916120000_progress_plan_and_auto_draft (`auto_draft_run` 표 — 공유 DB 적용 끝 2026-09-16)
--
-- 아래는 `prisma migrate diff --from-schema-datamodel <HEAD 7ba9e13a 의 schema> --to-schema-datamodel
-- prisma/schema.prisma --script`(DB 없이 스키마끼리 — DATABASE_URL·DIRECT_URL 은 닿지 않는 127.0.0.1:1)의
-- 산출을 **그대로** 실었다. 손으로 더한 것 없음.
--
-- 🔴 **기존 행을 안 건드린다** — 칸은 NULL 허용 · 기본값 없음(지금 있는 시험지는 전부 NULL 로 남는다 = «손으로 낸 것»).
--    FK 는 SET NULL — 회차 기록을 지워도 시험지는 남고 칸만 빈다.
-- 🔴 `prisma migrate dev` · `migrate deploy` · `db push` · `migrate reset` 은 이 파일을 공유 DB 에 적용한다.
--    적용은 scripts/qa/apply-test-auto-draft-migration.ts 로 **이 마이그레이션 하나만**, 드라이런 먼저.
-- 🔴 배포보다 **먼저** 적용한다 — Prisma 는 `test` 를 읽고 쓸 때마다 이 칸을 부른다. 칸 없이 배포되면
--    출제·검수·인쇄·메인 «오늘의 확인테스트»가 전부 500 이다.

-- AlterTable
ALTER TABLE "test" ADD COLUMN     "auto_draft_run_id" UUID;

-- CreateIndex
CREATE INDEX "test_auto_draft_run_id_idx" ON "test"("auto_draft_run_id");

-- AddForeignKey
ALTER TABLE "test" ADD CONSTRAINT "test_auto_draft_run_id_fkey" FOREIGN KEY ("auto_draft_run_id") REFERENCES "auto_draft_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;
