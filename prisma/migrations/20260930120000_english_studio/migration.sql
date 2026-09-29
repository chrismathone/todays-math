-- 오늘의 영어 — 외부지문 내신 스튜디오 표 셋 (D-148 · docs/planning/25-english-studio.md §2)
-- english_exam(학교별 내신 시험) · english_material(자료 — 파일 원본 또는 지문 글) · english_question_set(대비 문제 세트)
-- 브리프: docs/planning/tracks/briefs/english-base.md · 계약: src/contracts/english.contract.ts
--
-- 🔴 Do not run migrate dev/deploy/db push — apply with scripts/qa/apply-english-studio-migration.ts
--    (이 마이그레이션 **하나만**, 드라이런 먼저 · 리드가 main 에서 원장님께 여쭌 뒤 --apply).
--    `prisma migrate dev` · `migrate deploy` · `db push` · `migrate reset` 은 다른 트랙이 남긴 미적용
--    마이그레이션(예: 20260921120000_tenant_wall_expand)까지 같이 공유 DB 에 적용한다.
-- 🔴 **기존 표를 안 건드린다** — 새 표 셋과 그 색인·FK·CHECK·RLS 뿐. `user` 에는 칸이 늘지 않는다(관계는 english_exam 쪽 FK).
-- 🔴 순서는 DB 먼저 · 코드 나중(24번 문서 §6.1). 새 표만 더하므로 옛 코드는 이 표를 모른다 — 읽기 계약 두 단계는 불필요(25 §7).
--
-- 윗부분은 `prisma migrate diff --from-schema-datamodel <0150e9db6 의 schema> --to-schema-datamodel
-- prisma/schema.prisma --script`(DB 없이 스키마끼리 — DATABASE_URL·DIRECT_URL 은 닿지 않는 127.0.0.1:1)의
-- 산출을 **그대로** 실었다. Prisma 가 표현 못 하는 것(CHECK · RLS)은 맨 아래 «손으로 더한 것» 절에 붙였다.

-- CreateTable
CREATE TABLE "english_exam" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "school" VARCHAR(80) NOT NULL,
    "grade" VARCHAR(4) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "exam_date" DATE,
    "types" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "english_exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "english_material" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "bytes" BYTEA,
    "content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "english_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "english_question_set" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "status" VARCHAR(8) NOT NULL DEFAULT '초안',
    "source" VARCHAR(16) NOT NULL,
    "passage" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "english_question_set_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "english_exam_user_id_created_at_idx" ON "english_exam"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "english_material_exam_id_created_at_idx" ON "english_material"("exam_id", "created_at");

-- CreateIndex
CREATE INDEX "english_question_set_exam_id_updated_at_idx" ON "english_question_set"("exam_id", "updated_at");

-- AddForeignKey
ALTER TABLE "english_exam" ADD CONSTRAINT "english_exam_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "english_material" ADD CONSTRAINT "english_material_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "english_exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "english_question_set" ADD CONSTRAINT "english_question_set_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "english_exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 손으로 더한 것 (Prisma 가 표현 못 함) ────────────────────────────────

-- 값 목록은 계약과 같은 글자다(src/contracts/english.contract.ts — ENGLISH_GRADES · ENGLISH_SET_STATUSES · ENGLISH_SET_SOURCES).
-- 계약에 값을 더하면 여기도 새 마이그레이션으로 넓혀야 한다(넓히기 전에는 DB 가 그 값을 거절한다 — 조용히 통과하지 않는다).
ALTER TABLE "english_exam" ADD CONSTRAINT "english_exam_grade_check" CHECK ("grade" IN ('중1', '중2', '중3', '고1', '고2', '고3'));
ALTER TABLE "english_exam" ADD CONSTRAINT "english_exam_types_array" CHECK (jsonb_typeof("types") = 'array');

-- 자료는 파일 원본(bytes) 이거나 지문 글(content) 이다 — 둘 다 비면 «자료»가 아니다. .txt 파일은 둘 다 가진다.
ALTER TABLE "english_material" ADD CONSTRAINT "english_material_has_body" CHECK ("bytes" IS NOT NULL OR "content" IS NOT NULL);
ALTER TABLE "english_material" ADD CONSTRAINT "english_material_size_nonnegative" CHECK ("size" >= 0);

ALTER TABLE "english_question_set" ADD CONSTRAINT "english_question_set_status_check" CHECK ("status" IN ('초안', '검토 중', '검토 완료'));
ALTER TABLE "english_question_set" ADD CONSTRAINT "english_question_set_source_check" CHECK ("source" IN ('chatgpt', 'cloze', 'deepseek', 'manual'));
ALTER TABLE "english_question_set" ADD CONSTRAINT "english_question_set_questions_array" CHECK (jsonb_typeof("questions") = 'array');
ALTER TABLE "english_question_set" ADD CONSTRAINT "english_question_set_positive_revision" CHECK ("revision" >= 1);

-- 새 표는 RLS 를 켠다 — 이 저장소의 관례(2026-09-14 이후 새 표 · error_log · student_srs_state …).
-- 정책이 없으므로 Supabase 공개 API(anon)로는 못 읽는다. 앱은 Prisma(DB 직결)로 소유 범위를 걸어 읽고 쓴다.
-- 🔴 이 표에는 학원의 시험 자료 파일 원본과 문항 전문이 있다 — 공개 API 로 새면 안 된다.
ALTER TABLE "english_exam" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "english_material" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "english_question_set" ENABLE ROW LEVEL SECURITY;
