-- ⚠️ 미적용 초안 (D-123 ⑥′) — 원장님 확인 전 적용 금지
--
-- 오늘의 개념 — 차시별 개념 강의(concept_lecture) · 학생 × 강의 시청 기록(concept_lecture_view).
-- 수맥 0009a_learning_materials · 0012a_material_disclosure_job 을 우리 구성(차시 축 · 조직 없음 ·
-- 영상 하나)으로 옮긴 것. 계약 SSOT: src/contracts/conceptLecture.contract.ts
-- 계획: docs/planning/21-todays-concept.md · 결정: D-123 · D-124
--
-- 윗부분은 `prisma migrate diff --from-schema-datamodel <이전 schema> --to-schema-datamodel
-- prisma/schema.prisma --script`(DB 없이 스키마끼리)의 산출을 **그대로** 실었다.
-- Prisma 가 표현 못 하는 것은 맨 아래 «손으로 더한 것» 절에 붙였다.
--
-- 🔴 `prisma migrate dev` · `migrate deploy` · `db push` 는 이 파일을 공유 DB 에 적용한다.
--    원장님 확인 전에는 어느 세션도 돌리지 말 것(브리프 §2.2).

-- CreateEnum
CREATE TYPE "concept_lecture_status" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "concept_lecture" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "video_url" VARCHAR(200),
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "disclosure" VARCHAR(300),
    "source_job_id" VARCHAR(120),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "concept_lecture_status" NOT NULL DEFAULT 'draft',
    "reviewed_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concept_lecture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_lecture_view" (
    "student_id" UUID NOT NULL,
    "lecture_id" UUID NOT NULL,
    "max_seconds" INTEGER NOT NULL DEFAULT 0,
    "percent" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concept_lecture_view_pkey" PRIMARY KEY ("student_id","lecture_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "concept_lecture_source_job_id_key" ON "concept_lecture"("source_job_id");

-- CreateIndex
CREATE INDEX "concept_lecture_unit_id_status_sort_order_idx" ON "concept_lecture"("unit_id", "status", "sort_order");

-- CreateIndex
CREATE INDEX "concept_lecture_view_lecture_id_idx" ON "concept_lecture_view"("lecture_id");

-- AddForeignKey
ALTER TABLE "concept_lecture" ADD CONSTRAINT "concept_lecture_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_lecture" ADD CONSTRAINT "concept_lecture_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_lecture_view" ADD CONSTRAINT "concept_lecture_view_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_lecture_view" ADD CONSTRAINT "concept_lecture_view_lecture_id_fkey" FOREIGN KEY ("lecture_id") REFERENCES "concept_lecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 손으로 더한 것 (Prisma 가 표현 못 함) ────────────────────────────────

-- source_job_id 의 «null 제외 unique»(수맥 부분 인덱스 자리)는 위 CREATE UNIQUE INDEX 가 이미 한다.
-- Postgres 의 unique 는 NULL 을 서로 다르게 본다(NULLS DISTINCT 가 기본) — 사람이 만든 강의(잡 ID
-- 없음)는 몇 편이든 들어간다. 그래서 브리프가 말한 부분 unique 를 따로 쓰지 않고 schema 의 `@unique`
-- 로 두었다(이 저장소 관례: `student.eywa_student_id` · `account_audit_log.event_id`).

-- 수맥 0009a `learning_materials_kind_payload_ck` 의 우리 판 — 종류가 영상 하나뿐이라
-- «게시면 주소 있음». 초안은 주소가 비어도 된다(호스팅 미정 — 21번 §5-3).
-- 주소 **형식**은 DB 가 아니라 계약(canonicalVideoUrlSchema)과 게시 관문이 본다(브리프 §2.2).
ALTER TABLE "concept_lecture"
  ADD CONSTRAINT "concept_lecture_published_has_video"
  CHECK ("status" <> 'published' OR "video_url" IS NOT NULL);

-- 수맥 0012a `learning_materials_disclosure_not_blank_ck` — 빈 고지는 고지가 아니다.
-- 없으면 NULL 이어야 화면이 «고지 없음»을 정직하게 말할 수 있다.
ALTER TABLE "concept_lecture"
  ADD CONSTRAINT "concept_lecture_disclosure_not_blank"
  CHECK ("disclosure" IS NULL OR btrim("disclosure") <> '');

-- ↓ 브리프 밖에 더한 것 (보고서 §3 — 빼도 앱 동작은 같다. 계약과 같은 한계를 DB 가 받친다:
--   쓰는 길이 셋(화면·CLI·SQL)이고, 수맥은 한계가 CLI 에만 있어 SQL 로는 무엇이든 들어갔다.)
-- 공백 잡 ID 는 unique 를 공백끼리 부딪치게 하고 게시 관문의 «도구가 만든 강의» 판정을 속인다.
ALTER TABLE "concept_lecture"
  ADD CONSTRAINT "concept_lecture_source_job_id_not_blank"
  CHECK ("source_job_id" IS NULL OR btrim("source_job_id") <> '');
ALTER TABLE "concept_lecture"
  ADD CONSTRAINT "concept_lecture_seconds_nonnegative"
  CHECK ("seconds" >= 0);
ALTER TABLE "concept_lecture"
  ADD CONSTRAINT "concept_lecture_sort_order_range"
  CHECK ("sort_order" BETWEEN 0 AND 999);
ALTER TABLE "concept_lecture_view"
  ADD CONSTRAINT "concept_lecture_view_percent_range"
  CHECK ("percent" BETWEEN 0 AND 100);
ALTER TABLE "concept_lecture_view"
  ADD CONSTRAINT "concept_lecture_view_max_seconds_nonnegative"
  CHECK ("max_seconds" >= 0);

-- 새 표는 RLS 를 켠다 — 이 저장소의 관례(account_audit_log · workspace_document · workspace_asset).
-- 정책이 없으므로 Supabase 공개 API(anon)로는 못 읽는다. 앱은 Prisma(DB 직결)로 읽고 쓴다.
ALTER TABLE "concept_lecture" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "concept_lecture_view" ENABLE ROW LEVEL SECURITY;
