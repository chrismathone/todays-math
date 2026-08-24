-- A quarantined problem must not leak through an already generated test or a
-- direct relation insert that bypasses the normal problem-pool queries.

LOCK TABLE "problem", "test_problem", "problem_answer" IN ACCESS EXCLUSIVE MODE;

DELETE FROM "test_problem" AS tp
USING "problem" AS p
WHERE tp."problem_id" = p."id"
  AND p."source" = 'past_exam'::"problem_source";

DELETE FROM "problem_answer" AS pa
USING "problem" AS p
WHERE pa."problem_id" = p."id"
  AND p."source" = 'past_exam'::"problem_source";

CREATE OR REPLACE FUNCTION "block_past_exam_relation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "problem"
    WHERE "id" = NEW."problem_id"
      AND "source" = 'past_exam'::"problem_source"
  ) THEN
    RAISE EXCEPTION 'past_exam problem % is behind the outer-wall quarantine', NEW."problem_id"
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "test_problem_past_exam_outer_wall" ON "test_problem";
CREATE TRIGGER "test_problem_past_exam_outer_wall"
BEFORE INSERT OR UPDATE OF "problem_id" ON "test_problem"
FOR EACH ROW
EXECUTE FUNCTION "block_past_exam_relation"();

DROP TRIGGER IF EXISTS "problem_answer_past_exam_outer_wall" ON "problem_answer";
CREATE TRIGGER "problem_answer_past_exam_outer_wall"
BEFORE INSERT OR UPDATE OF "problem_id" ON "problem_answer"
FOR EACH ROW
EXECUTE FUNCTION "block_past_exam_relation"();

COMMENT ON FUNCTION "block_past_exam_relation"() IS
  'Prevents quarantined past_exam rows from leaking through tests or submitted answers.';
