-- The full legacy corpus was first locked down with a universal trigger so no
-- request could race the quarantine operation. Now that every existing row is
-- private and detached, register those exact IDs behind the permanent wall.
-- Future, newly generated problems are not part of this legacy corpus.

CREATE TABLE "problem_outer_wall_quarantine" (
  "problem_id" UUID NOT NULL,
  "quarantined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT NOT NULL DEFAULT 'owner_requested_legacy_corpus_quarantine',

  CONSTRAINT "problem_outer_wall_quarantine_pkey" PRIMARY KEY ("problem_id"),
  CONSTRAINT "problem_outer_wall_quarantine_problem_id_fkey"
    FOREIGN KEY ("problem_id") REFERENCES "problem"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT
);

INSERT INTO "problem_outer_wall_quarantine" ("problem_id")
SELECT "id"
FROM "problem"
ON CONFLICT ("problem_id") DO NOTHING;

DROP TRIGGER IF EXISTS "problem_outer_wall" ON "problem";
DROP FUNCTION IF EXISTS "enforce_problem_outer_wall"();

ALTER TABLE "problem"
DROP CONSTRAINT IF EXISTS "problem_outer_wall_check";

CREATE OR REPLACE FUNCTION "enforce_registered_problem_outer_wall"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "problem_outer_wall_quarantine"
    WHERE "problem_id" = OLD."id"
  ) THEN
    NEW."pool" := 'private'::"problem_pool";
    NEW."direct_use_allowed" := FALSE;
    NEW."review_status" := 'rejected'::"review_status";
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "registered_problem_outer_wall"
BEFORE UPDATE ON "problem"
FOR EACH ROW
EXECUTE FUNCTION "enforce_registered_problem_outer_wall"();

CREATE OR REPLACE FUNCTION "block_problem_relation_behind_outer_wall"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "problem_outer_wall_quarantine"
    WHERE "problem_id" = NEW."problem_id"
  ) THEN
    RAISE EXCEPTION 'problem % is behind the outer-wall quarantine', NEW."problem_id"
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON TABLE "problem_outer_wall_quarantine" IS
  'Immutable registry of the owner-quarantined legacy corpus. Release only after an explicit owner request.';

COMMENT ON FUNCTION "enforce_registered_problem_outer_wall"() IS
  'Keeps every registered legacy problem private, rejected, and unavailable for direct use.';

COMMENT ON FUNCTION "block_problem_relation_behind_outer_wall"() IS
  'Blocks test and answer links for registered legacy problems while allowing a new clean corpus.';
