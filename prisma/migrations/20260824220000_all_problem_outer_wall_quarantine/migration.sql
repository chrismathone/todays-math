-- Owner decision: restart the usable problem bank from zero. Preserve every
-- legacy row for later forensic comparison, but make the entire corpus
-- unreachable from the application until an explicit owner-requested release.

LOCK TABLE "problem", "test_problem", "problem_answer" IN ACCESS EXCLUSIVE MODE;

-- No submitted answers exist at the time of this migration. Remove every
-- relation that could otherwise expose quarantined content through a test.
DELETE FROM "test_problem";
DELETE FROM "problem_answer";

DROP TRIGGER IF EXISTS "problem_past_exam_outer_wall" ON "problem";
DROP FUNCTION IF EXISTS "enforce_past_exam_outer_wall"();

ALTER TABLE "problem"
DROP CONSTRAINT IF EXISTS "problem_past_exam_outer_wall_check";

CREATE OR REPLACE FUNCTION "enforce_problem_outer_wall"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."pool" := 'private'::"problem_pool";
  NEW."direct_use_allowed" := FALSE;
  NEW."review_status" := 'rejected'::"review_status";
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "problem_outer_wall" ON "problem";
CREATE TRIGGER "problem_outer_wall"
BEFORE INSERT OR UPDATE ON "problem"
FOR EACH ROW
EXECUTE FUNCTION "enforce_problem_outer_wall"();

UPDATE "problem"
SET
  "pool" = 'private'::"problem_pool",
  "direct_use_allowed" = FALSE,
  "review_status" = 'rejected'::"review_status";

ALTER TABLE "problem"
ADD CONSTRAINT "problem_outer_wall_check"
CHECK (
  "pool" = 'private'::"problem_pool"
  AND "direct_use_allowed" = FALSE
  AND "review_status" = 'rejected'::"review_status"
);

DROP TRIGGER IF EXISTS "test_problem_past_exam_outer_wall" ON "test_problem";
DROP TRIGGER IF EXISTS "problem_answer_past_exam_outer_wall" ON "problem_answer";
DROP FUNCTION IF EXISTS "block_past_exam_relation"();

CREATE OR REPLACE FUNCTION "block_problem_relation_behind_outer_wall"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'problem relations are disabled while the problem bank is behind the outer-wall quarantine'
    USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER "test_problem_outer_wall"
BEFORE INSERT OR UPDATE ON "test_problem"
FOR EACH ROW
EXECUTE FUNCTION "block_problem_relation_behind_outer_wall"();

CREATE TRIGGER "problem_answer_outer_wall"
BEFORE INSERT OR UPDATE ON "problem_answer"
FOR EACH ROW
EXECUTE FUNCTION "block_problem_relation_behind_outer_wall"();

COMMENT ON FUNCTION "enforce_problem_outer_wall"() IS
  'Permanent application quarantine for the legacy problem corpus. Remove only after an explicit owner request.';

COMMENT ON CONSTRAINT "problem_outer_wall_check" ON "problem" IS
  'All problem rows remain private, rejected, and unavailable until the owner explicitly opens a new corpus.';

COMMENT ON FUNCTION "block_problem_relation_behind_outer_wall"() IS
  'Blocks test and answer links while every problem is behind the outer-wall quarantine.';
