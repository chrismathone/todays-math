-- 미적용 초안. 실행 금지: 원장님 승인 → 드라이런 → DB 먼저 → 코드 나중.
-- 기존 표/칼럼의 이름은 저장소 schema.prisma 기준이다. 운영 DB에서 확인하지 않았다.
BEGIN;

CREATE UNIQUE INDEX test_report_publication_identity ON "test" ("id", "publication_id");
CREATE UNIQUE INDEX result_report_student_identity ON "test_result" ("id", "test_id", "student_id");

CREATE TABLE "exam_report_draft" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "publication_id" UUID NOT NULL REFERENCES "exam_publication" ("id") ON DELETE RESTRICT,
  "test_id" UUID NOT NULL,
  "student_id" UUID NOT NULL REFERENCES "student" ("id") ON DELETE RESTRICT,
  "user_id" UUID NOT NULL REFERENCES "user" ("id") ON DELETE RESTRICT,
  "branch_id" UUID NOT NULL REFERENCES "branch" ("id") ON DELETE RESTRICT,
  "teacher_note" TEXT NOT NULL DEFAULT '',
  -- 출력 선택은 Hi-fi 선택 후 Zod 계약과 함께 쓰기 경로에서 검증한다.
  "options" JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof("options") = 'object'),
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "state" VARCHAR(12) NOT NULL DEFAULT 'draft' CHECK ("state" IN ('draft', 'confirmed')),
  "confirmed_artifact_id" UUID,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("publication_id", "student_id"),
  UNIQUE ("id", "test_id", "student_id"),
  FOREIGN KEY ("test_id", "publication_id") REFERENCES "test" ("id", "publication_id") ON DELETE RESTRICT,
  CHECK (("state" = 'confirmed') = ("confirmed_artifact_id" IS NOT NULL))
);

CREATE TABLE "exam_report_artifact" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "report_id" UUID NOT NULL,
  "test_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "source_result_id" UUID NOT NULL,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "confirmed_by" UUID NOT NULL REFERENCES "user" ("id") ON DELETE RESTRICT,
  "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "layout_version" VARCHAR(100) NOT NULL,
  "source_digest" CHAR(64) NOT NULL CHECK ("source_digest" ~ '^[a-f0-9]{64}$'),
  "snapshot" JSONB NOT NULL CHECK (jsonb_typeof("snapshot") = 'object'),
  "pdf_bytes" BYTEA NOT NULL,
  "pdf_sha256" CHAR(64) NOT NULL CHECK ("pdf_sha256" ~ '^[a-f0-9]{64}$'),
  "pdf_size" INTEGER GENERATED ALWAYS AS (octet_length("pdf_bytes")) STORED,
  UNIQUE ("id", "report_id"),
  UNIQUE ("report_id", "revision"),
  FOREIGN KEY ("report_id", "test_id", "student_id") REFERENCES "exam_report_draft" ("id", "test_id", "student_id") ON DELETE RESTRICT,
  FOREIGN KEY ("source_result_id", "test_id", "student_id") REFERENCES "test_result" ("id", "test_id", "student_id") ON DELETE RESTRICT,
  CHECK (octet_length("pdf_bytes") BETWEEN 5 AND 4000000),
  CHECK (substring("pdf_bytes" FROM 1 FOR 5) = decode('255044462d', 'hex'))
);
ALTER TABLE "exam_report_draft" ADD CONSTRAINT "exam_report_current_artifact"
  FOREIGN KEY ("confirmed_artifact_id", "id") REFERENCES "exam_report_artifact" ("id", "report_id") ON DELETE RESTRICT;
CREATE INDEX "exam_report_branch_publication" ON "exam_report_draft" ("branch_id", "publication_id");

-- 문장·출력 선택·원시험을 고치면 새 초안이다. 보관본은 덮지 않는다.
CREATE FUNCTION "invalidate_exam_report_edit"() RETURNS trigger LANGUAGE plpgsql AS $$
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
CREATE TRIGGER "exam_report_edit_invalidates" BEFORE UPDATE ON "exam_report_draft"
  FOR EACH ROW EXECUTE FUNCTION "invalidate_exam_report_edit"();

-- 기존 채점은 create만 한다. 새 기록이 생기면 보수적으로 확정을 푼다.
CREATE FUNCTION "invalidate_exam_report_grade"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "exam_report_draft" SET "state" = 'draft', "confirmed_artifact_id" = NULL,
    "revision" = "revision" + 1
    WHERE "test_id" = NEW."test_id" AND "student_id" = NEW."student_id";
  RETURN NEW;
END; $$;
CREATE TRIGGER "exam_report_grade_invalidates" AFTER INSERT ON "test_result"
  FOR EACH ROW EXECUTE FUNCTION "invalidate_exam_report_grade"();

CREATE FUNCTION "reject_exam_report_artifact_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '확정 성적표 보관본은 수정하거나 지울 수 없습니다.';
END; $$;
CREATE TRIGGER "exam_report_artifact_immutable" BEFORE UPDATE OR DELETE ON "exam_report_artifact"
  FOR EACH ROW EXECUTE FUNCTION "reject_exam_report_artifact_mutation"();

ALTER TABLE "exam_report_draft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exam_report_artifact" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "exam_report_draft", "exam_report_artifact" FROM PUBLIC, anon, authenticated;
-- 브라우저 정책은 만들지 않는다. 서버의 기존 DB 역할로만 접근한다.
COMMIT;
