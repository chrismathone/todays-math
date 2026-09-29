-- 학원 전체 설정 표(진도판 테마 등, 2026-09-30). 새 표 하나 — 기존 표 · 행은 건드리지 않는다.
-- 적용은 scripts/qa/apply-app-setting-migration.ts. 행이 없으면 앱은 기본값(진도판은 지금 판)을 쓴다.
CREATE TABLE "app_setting" (
    "key" VARCHAR(64) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "app_setting_pkey" PRIMARY KEY ("key")
);
