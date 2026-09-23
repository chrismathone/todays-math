-- Account-backed SRS storage. Apply this migration alone with
-- scripts/qa/apply-student-srs-migration.ts after its rollback dry run.
-- Do not run migrate dev/deploy/db push: this repository has other pending migrations.
-- No existing Student, TestResult, Problem or WorkspaceDocument rows are changed.
CREATE TABLE "student_srs_state" (
    "student_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "student_srs_state_pkey" PRIMARY KEY ("student_id"),
    CONSTRAINT "student_srs_state_positive_revision" CHECK ("revision" > 0),
    CONSTRAINT "student_srs_state_payload_object" CHECK (jsonb_typeof("payload") = 'object'),
    CONSTRAINT "student_srs_state_student_id_fkey" FOREIGN KEY ("student_id")
      REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Learning history is available only through authenticated, owner-scoped server routes.
-- Prisma connects directly; the public Supabase API must not expose this table.
ALTER TABLE "student_srs_state" ENABLE ROW LEVEL SECURITY;
