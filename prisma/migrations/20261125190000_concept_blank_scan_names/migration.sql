-- Additive only. The already-applied 20261125120000 migration is immutable.
-- An unassigned page is a name capture, NOT a submission with a guessed/dummy student.
ALTER TABLE concept_blank_scan_submission
  ADD COLUMN written_name text CHECK (length(written_name) <= 120),
  ADD COLUMN written_name_status text CHECK (written_name_status IN ('read','uncertain','unreadable','blank')),
  ADD COLUMN name_match_result text CHECK (name_match_result IN ('matched','ambiguous','none','mismatch')),
  ADD COLUMN name_match_method text CHECK (name_match_method IN ('name-exact','teacher-picked','teacher-selected','student-account'));
-- statement
CREATE TABLE concept_blank_scan_name_capture (
  id uuid PRIMARY KEY,
  printed_sheet_id uuid NOT NULL REFERENCES concept_blank_printed_sheet(id),
  teacher_id uuid NOT NULL REFERENCES "user"(id),
  request_id uuid NOT NULL UNIQUE,
  photo jsonb NOT NULL CHECK (jsonb_typeof(photo)='object'),
  readings jsonb,
  read_prompt_version text,
  requested_model text,
  written_name text CHECK (length(written_name)<=120),
  written_name_status text CHECK (written_name_status IN ('read','uncertain','unreadable','blank')),
  name_match_result text CHECK (name_match_result IN ('matched','ambiguous','none','mismatch')),
  job_id uuid,
  job_started_at timestamptz(3),
  job_waiting boolean NOT NULL DEFAULT false,
  last_error text,
  submission_id uuid UNIQUE REFERENCES concept_blank_scan_submission(id),
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamptz(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + interval '7 days'),
  deleted_at timestamptz(3),
  CHECK (num_nonnulls(job_id,job_started_at) IN (0,2))
);
-- statement
CREATE INDEX cb_scan_name_capture_teacher ON concept_blank_scan_name_capture(teacher_id,printed_sheet_id,created_at);
-- statement
ALTER TABLE concept_blank_scan_name_capture ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON concept_blank_scan_name_capture FROM PUBLIC,anon,authenticated;
