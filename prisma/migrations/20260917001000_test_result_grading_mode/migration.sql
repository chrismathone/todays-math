-- ⚠️ 미적용 초안 (D-134 트랙 1) — 리드가 원장님 확인을 받고 드라이런 → 적용한다.
--
-- 채점 기록이 **세 상태**를 담게 한다 — `test_result` 에 `grading_mode` · `absent` 를 더하고
-- `score` · `predicted_score` 의 NOT NULL 을 푼다.
-- 결정: D-134 트랙 1 · 브리프 `docs/planning/tracks/briefs/grading-input.md` §1.1 · 근거 23 §4 ②③ · 19 §5′
-- 앞선 마이그레이션: 20260917000000_test_auto_draft_run (미적용 초안 — **이 파일과 순서 의존은 없다**,
--   서로 다른 표를 건드린다. 적용 순서는 아무래도 좋다)
--
-- 아래는 `prisma migrate diff --from-schema-datamodel <ebc0ec34 의 schema> --to-schema-datamodel
-- prisma/schema.prisma --script`(DB 없이 스키마끼리 — DATABASE_URL·DIRECT_URL 은 닿지 않는 127.0.0.1:1)의
-- 산출을 **그대로** 실었다. 손으로 더한 것 없음.
--
-- 🔴 **지금이 유일하게 싼 시점이다** — 공유 DB `test_result` 는 **0행**이다(23 §1.1, 2026-09-17 읽기 전용 집계).
--    NOT NULL 을 푸는 일은 행이 쌓인 뒤에는 잠금·되돌리기가 모두 비싸진다.
-- 🔴 **기존 행을 안 건드린다** — 새 칸 둘은 NOT NULL + 기본값이라 기존 행은 `answers` · `absent=false` 로
--    채워진다(= 지금까지의 `/submit` 뜻 그대로). NOT NULL 을 푸는 것은 **넓히는** 변경이라
--    지금 값이 있는 행은 그대로 유효하다.
-- 🔴 되돌리기는 **`score` 에 NULL 이 하나라도 있으면 안 된다** — 되돌리면 그 결시 행이 NOT NULL 을 어겨
--    ALTER 가 실패하거나, 억지로 0 을 채우면 **결시가 0점이 된다.** 적용 스크립트가 그 앞에서 멈춘다.
-- 🔴 `prisma migrate dev` · `migrate deploy` · `db push` · `migrate reset` 은 이 파일을 공유 DB 에 적용한다.
--    적용은 scripts/qa/apply-grading-mode-migration.ts 로 **이 마이그레이션 하나만**, 드라이런 먼저.
-- 🔴 배포보다 **먼저** 적용한다 — Prisma 는 `test_result` 를 읽고 쓸 때마다 `grading_mode`·`absent` 를
--    부른다. 칸 없이 배포되면 채점·결과 조회가 전부 500 이다.

-- CreateEnum
CREATE TYPE "grading_mode" AS ENUM ('marks', 'answers');

-- AlterTable
ALTER TABLE "test_result" ADD COLUMN     "absent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "grading_mode" "grading_mode" NOT NULL DEFAULT 'answers',
ALTER COLUMN "score" DROP NOT NULL,
ALTER COLUMN "predicted_score" DROP NOT NULL;
