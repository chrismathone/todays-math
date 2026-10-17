-- 2026-10-17 원장님 «승인» — 월말평가 M1 «반에 내기»(docs/planning/monthly-exam-plan-20261017.md §9).
--
-- ⑴ 새 표 exam_publication — 반에 낸 시험지의 고정본(문항 · 배점 · 차례 · 출력 설정을 낸 그대로).
-- ⑵ test 에 빈 칸 publication_id — 반마다의 반 시험이 발행본을 가리킨다. 지금 행은 모두 NULL 이다.
-- 🔴 넓히기만 한다 — 지금 배포는 새 표 · 새 칸을 모르고 그대로 돈다. DB 먼저 · 코드 나중.
-- 🔴 서버만 읽고 쓴다 — RLS 를 켜고 브라우저 역할(anon · authenticated)의 권한을 걷는다.
-- 문장 사이는 `-- statement` 줄로 가른다(적용 스크립트가 이 줄로 나눈다).

-- statement
CREATE TABLE "exam_publication" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "branch_id" UUID,
  "document_id" VARCHAR(100) NOT NULL,
  "source_revision" INTEGER NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "exam_type" VARCHAR(20) NOT NULL DEFAULT 'monthly',
  "test_date" DATE NOT NULL,
  "payload" JSONB NOT NULL,
  "content_hash" CHAR(64) NOT NULL,
  "request_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exam_publication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exam_publication_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "exam_publication_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "exam_publication_exam_type_check" CHECK ("exam_type" IN ('monthly', 'unit', 'school', 'other')),
  CONSTRAINT "exam_publication_source_revision_check" CHECK ("source_revision" >= 1)
);

-- statement
CREATE UNIQUE INDEX "exam_publication_user_id_request_id_key" ON "exam_publication"("user_id", "request_id");

-- statement
CREATE INDEX "exam_publication_user_id_document_id_created_at_idx" ON "exam_publication"("user_id", "document_id", "created_at" DESC);

-- statement
ALTER TABLE "test" ADD COLUMN "publication_id" UUID;

-- statement
ALTER TABLE "test" ADD CONSTRAINT "test_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "exam_publication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- statement
CREATE UNIQUE INDEX "test_publication_class_key" ON "test"("publication_id", "class_id") WHERE "publication_id" IS NOT NULL;

-- statement
ALTER TABLE "exam_publication" ENABLE ROW LEVEL SECURITY;

-- statement
REVOKE ALL ON "exam_publication" FROM PUBLIC;

-- statement
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON "exam_publication" FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
