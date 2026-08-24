-- Legacy imported past-exam corpus is not trusted. Keep it behind a DB-level
-- outer wall until the owner explicitly requests a controlled release.
--
-- The application already exposes only pool='shared' problems. The trigger and
-- constraint below make it impossible for ordinary imports, review actions, or
-- ad-hoc updates to move a past_exam row back into that visible pool.

LOCK TABLE "problem" IN ACCESS EXCLUSIVE MODE;

CREATE OR REPLACE FUNCTION "enforce_past_exam_outer_wall"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."source" = 'past_exam'::"problem_source" THEN
    NEW."pool" := 'private'::"problem_pool";
    NEW."direct_use_allowed" := FALSE;
    NEW."review_status" := 'rejected'::"review_status";
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "problem_past_exam_outer_wall" ON "problem";

CREATE TRIGGER "problem_past_exam_outer_wall"
BEFORE INSERT OR UPDATE ON "problem"
FOR EACH ROW
EXECUTE FUNCTION "enforce_past_exam_outer_wall"();

UPDATE "problem"
SET
  "pool" = 'private'::"problem_pool",
  "direct_use_allowed" = FALSE,
  "review_status" = 'rejected'::"review_status"
WHERE "source" = 'past_exam'::"problem_source";

ALTER TABLE "problem"
ADD CONSTRAINT "problem_past_exam_outer_wall_check"
CHECK (
  "source" <> 'past_exam'::"problem_source"
  OR (
    "pool" = 'private'::"problem_pool"
    AND "direct_use_allowed" = FALSE
    AND "review_status" = 'rejected'::"review_status"
  )
);

COMMENT ON FUNCTION "enforce_past_exam_outer_wall"() IS
  'Hard quarantine for the untrusted legacy past_exam corpus. Remove only after an explicit owner request.';

COMMENT ON CONSTRAINT "problem_past_exam_outer_wall_check" ON "problem" IS
  'past_exam rows must remain private, rejected, and unavailable for direct use.';
