-- 2026-10-18 원장님 «승인» — 월말평가 성적표 확정 · PDF 보관(docs/planning/monthly-exam-plan-20261017.md §14).
--
-- ⑴ exam_report_draft — 낸 시험 한 회 × 학생 한 명의 편집 자리(원장님 문장 · 지면 설정 · 상태).
-- ⑵ exam_report_artifact — 확정한 순간의 고정본(채점 지문 · 내용 · PDF 의 저장소 경로와 지문). 고치거나 지우지 않는다.
-- PDF 바이트는 DB 에 넣지 않는다 — 앱 Supabase 프로젝트의 **비공개** 버킷에 두고 경로 · 지문 · 크기만 적는다(원장님 승인).
-- 🔴 넓히기만 한다 — 새 표 둘과 그 표의 트리거뿐. 기존 표(test · test_result)에는 칸 · 색인 · 트리거를 더하지 않는다.
--    재채점 감지는 읽을 때 현재 내용의 지문을 보관본 지문과 견주는 것으로 한다(managedExamReports.ts).
-- 🔴 서버만 읽고 쓴다 — RLS 를 켜고 브라우저 역할(anon · authenticated)의 권한을 걷는다.
-- 문장 사이는 `-- statement` 줄로 가른다(적용 스크립트가 이 줄로 나눈다).

-- statement
CREATE TABLE "exam_report_draft" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "publication_id" UUID NOT NULL,
  "test_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "branch_id" UUID,
  "teacher_note" TEXT NOT NULL DEFAULT '',
  "options" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "state" VARCHAR(12) NOT NULL DEFAULT 'draft',
  "confirmed_artifact_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exam_report_draft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exam_report_draft_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "exam_publication"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "exam_report_draft_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "test"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "exam_report_draft_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "exam_report_draft_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "exam_report_draft_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "exam_report_draft_note_check" CHECK (char_length("teacher_note") <= 1000),
  CONSTRAINT "exam_report_draft_options_check" CHECK (jsonb_typeof("options") = 'object'),
  CONSTRAINT "exam_report_draft_revision_check" CHECK ("revision" >= 1),
  CONSTRAINT "exam_report_draft_state_check" CHECK ("state" IN ('draft', 'confirmed')),
  CONSTRAINT "exam_report_draft_confirmed_check" CHECK (("state" = 'confirmed') = ("confirmed_artifact_id" IS NOT NULL))
);

-- statement
CREATE UNIQUE INDEX "exam_report_draft_publication_id_student_id_key" ON "exam_report_draft"("publication_id", "student_id");

-- statement
CREATE INDEX "exam_report_draft_test_id_idx" ON "exam_report_draft"("test_id");

-- statement
CREATE TABLE "exam_report_artifact" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "report_id" UUID NOT NULL,
  "revision" INTEGER NOT NULL,
  "source_result_id" UUID NOT NULL,
  "confirmed_by" UUID NOT NULL,
  "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "layout_version" VARCHAR(100) NOT NULL,
  "source_digest" CHAR(64) NOT NULL,
  "snapshot" JSONB NOT NULL,
  "pdf_path" VARCHAR(300) NOT NULL,
  "pdf_sha256" CHAR(64) NOT NULL,
  "pdf_size" INTEGER NOT NULL,
  CONSTRAINT "exam_report_artifact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exam_report_artifact_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "exam_report_draft"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "exam_report_artifact_source_result_id_fkey" FOREIGN KEY ("source_result_id") REFERENCES "test_result"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "exam_report_artifact_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "exam_report_artifact_revision_check" CHECK ("revision" >= 1),
  CONSTRAINT "exam_report_artifact_source_digest_check" CHECK ("source_digest" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "exam_report_artifact_pdf_sha256_check" CHECK ("pdf_sha256" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "exam_report_artifact_pdf_size_check" CHECK ("pdf_size" BETWEEN 5 AND 4000000),
  CONSTRAINT "exam_report_artifact_snapshot_check" CHECK (jsonb_typeof("snapshot") = 'object'),
  CONSTRAINT "exam_report_artifact_pdf_path_check" CHECK ("pdf_path" ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$')
);

-- statement
CREATE UNIQUE INDEX "exam_report_artifact_report_id_revision_key" ON "exam_report_artifact"("report_id", "revision");

-- statement
CREATE UNIQUE INDEX "exam_report_artifact_id_report_id_key" ON "exam_report_artifact"("id", "report_id");

-- statement
CREATE UNIQUE INDEX "exam_report_artifact_pdf_path_key" ON "exam_report_artifact"("pdf_path");

-- statement
ALTER TABLE "exam_report_draft" ADD CONSTRAINT "exam_report_draft_confirmed_artifact_fkey" FOREIGN KEY ("confirmed_artifact_id", "id") REFERENCES "exam_report_artifact"("id", "report_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- statement
-- 문장 · 지면 설정 · 원시험을 고치면 새 판 · 초안이다(확정이 풀린다). 보관본은 덮지 않는다.
CREATE FUNCTION "exam_report_draft_invalidate_on_edit"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW."teacher_note", NEW."options", NEW."test_id") IS DISTINCT FROM
     (OLD."teacher_note", OLD."options", OLD."test_id") THEN
    NEW."revision" := OLD."revision" + 1;
    NEW."state" := 'draft';
    NEW."confirmed_artifact_id" := NULL;
  END IF;
  NEW."updated_at" := CURRENT_TIMESTAMP;
  RETURN NEW;
END; $$;

-- statement
CREATE TRIGGER "exam_report_draft_edit_invalidates" BEFORE UPDATE ON "exam_report_draft"
  FOR EACH ROW EXECUTE FUNCTION "exam_report_draft_invalidate_on_edit"();

-- statement
CREATE FUNCTION "exam_report_artifact_reject_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '확정 성적표 보관본은 수정하거나 지울 수 없습니다.';
END; $$;

-- statement
CREATE TRIGGER "exam_report_artifact_immutable" BEFORE UPDATE OR DELETE ON "exam_report_artifact"
  FOR EACH ROW EXECUTE FUNCTION "exam_report_artifact_reject_mutation"();

-- statement
ALTER TABLE "exam_report_draft" ENABLE ROW LEVEL SECURITY;

-- statement
ALTER TABLE "exam_report_artifact" ENABLE ROW LEVEL SECURITY;

-- statement
REVOKE ALL ON "exam_report_draft", "exam_report_artifact" FROM PUBLIC;

-- statement
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON "exam_report_draft", "exam_report_artifact" FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
