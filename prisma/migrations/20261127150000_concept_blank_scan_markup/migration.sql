-- statement
ALTER TABLE concept_blank_scan_grade ADD CONSTRAINT cb_scan_grade_id_submission UNIQUE (id, submission_id);
-- statement
CREATE TABLE concept_blank_scan_markup (
  id uuid PRIMARY KEY,
  submission_id uuid NOT NULL,
  grade_id uuid NOT NULL,
  photo_id uuid NOT NULL,
  sequence integer NOT NULL CHECK (sequence > 0),
  action text NOT NULL CHECK (action IN ('snapshot', 'edit', 'remove', 'publish')),
  status text CHECK (status IN ('ready', 'empty', 'failed')),
  notes jsonb NOT NULL CHECK (jsonb_typeof(notes) = 'array'),
  layout jsonb,
  prompt_version text,
  requested_model text,
  teacher_id uuid REFERENCES "user"(id),
  removed_note_id uuid,
  published_at timestamptz(3),
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cb_scan_markup_grade_fk FOREIGN KEY (grade_id, submission_id) REFERENCES concept_blank_scan_grade(id, submission_id),
  CONSTRAINT cb_scan_markup_photo_fk FOREIGN KEY (photo_id, submission_id) REFERENCES concept_blank_scan_photo(id, submission_id),
  CONSTRAINT cb_scan_markup_sequence UNIQUE (grade_id, sequence),
  CHECK ((action = 'snapshot' AND sequence = 1 AND status IS NOT NULL AND teacher_id IS NULL)
    OR (action <> 'snapshot' AND status IS NULL AND teacher_id IS NOT NULL)),
  CHECK ((action = 'remove') = (removed_note_id IS NOT NULL)),
  CHECK ((action = 'publish') = (published_at IS NOT NULL))
);
-- statement
CREATE INDEX cb_scan_markup_submission ON concept_blank_scan_markup(submission_id);
-- statement
CREATE TRIGGER cb_scan_markup_immutable BEFORE UPDATE OR DELETE ON concept_blank_scan_markup
  FOR EACH ROW EXECUTE FUNCTION cb_scan_immutable();
-- statement
ALTER TABLE concept_blank_scan_markup ENABLE ROW LEVEL SECURITY;
-- statement
REVOKE ALL ON concept_blank_scan_markup FROM PUBLIC;
-- statement
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON concept_blank_scan_markup FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
