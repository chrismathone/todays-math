-- REVIEW DRAFT ONLY — NOT a migration. Not executed, including on a local DB.
-- Approval + lead review required before creating a migration/schema.prisma models.
-- Full snapshot/page/slot correspondence is validated with the v1 Zod contract in the write transaction.

CREATE TABLE concept_blank_printed_sheet (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES "user"(id), -- ownedRowsWhere owner, distinct from creator
  created_by uuid NOT NULL REFERENCES "user"(id),
  branch_id uuid REFERENCES branch(id), -- NULL is a personal owner scope, never all branches
  sheet_code text, -- not UNIQUE: code encodes selection/content, not an issued sheet identity
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  CHECK ((jsonb_typeof(snapshot) = 'object'
    AND snapshot->'version' = '1'::jsonb
    AND jsonb_typeof(snapshot->'pages') = 'array'
    AND jsonb_typeof(snapshot->'pageCount') = 'number'
    AND jsonb_typeof(snapshot->'bankFingerprint') = 'string') IS TRUE)
);
CREATE INDEX cb_printed_owner ON concept_blank_printed_sheet(user_id, created_at);
CREATE INDEX cb_printed_branch ON concept_blank_printed_sheet(branch_id, created_at);
CREATE INDEX cb_printed_code ON concept_blank_printed_sheet(sheet_code);

CREATE TABLE concept_blank_scan_submission (
  id uuid PRIMARY KEY,
  printed_sheet_id uuid NOT NULL REFERENCES concept_blank_printed_sheet(id),
  student_id uuid NOT NULL REFERENCES student(id),
  captured_student_id uuid REFERENCES student(id),
  captured_teacher_id uuid REFERENCES "user"(id),
  state text NOT NULL CHECK (state IN ('capturing','read','checking','graded','teacher-corrected')),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0), -- CAS; state + evidence in one transaction
  created_at timestamptz NOT NULL,
  graded_at timestamptz,
  CHECK (num_nonnulls(captured_student_id, captured_teacher_id) = 1),
  CHECK (captured_student_id IS NULL OR captured_student_id = student_id),
  CHECK (state NOT IN ('graded','teacher-corrected') OR graded_at IS NOT NULL)
);
CREATE INDEX cb_scan_student ON concept_blank_scan_submission(student_id, created_at);
CREATE INDEX cb_scan_sheet ON concept_blank_scan_submission(printed_sheet_id);

-- Scope is inherited through submission -> printed sheet, never an independent user-supplied branch_id.
CREATE TABLE concept_blank_scan_photo (
  id uuid PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES concept_blank_scan_submission(id),
  page_number integer NOT NULL CHECK (page_number > 0),
  version integer NOT NULL CHECK (version > 0), -- retake preserves evidence of the earlier read
  bucket text NOT NULL CHECK (length(bucket) > 0),
  object_key text NOT NULL CHECK (length(object_key) > 0), -- no public or signed URL
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  delete_requested_at timestamptz,
  deleted_at timestamptz, -- only after Storage API deletion succeeds
  CHECK (expires_at > created_at),
  UNIQUE(submission_id, page_number, version),
  UNIQUE(bucket, object_key),
  UNIQUE(id, submission_id)
);
CREATE INDEX cb_scan_photo_expiry ON concept_blank_scan_photo(expires_at) WHERE deleted_at IS NULL;

CREATE TABLE concept_blank_scan_read (
  id uuid PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES concept_blank_scan_submission(id),
  photo_id uuid NOT NULL,
  slot_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('read','uncertain','unreadable','blank')),
  text text NOT NULL,
  prompt_version text NOT NULL,
  requested_model text NOT NULL,
  created_at timestamptz NOT NULL,
  FOREIGN KEY (photo_id, submission_id) REFERENCES concept_blank_scan_photo(id, submission_id),
  CHECK (status NOT IN ('blank','unreadable') OR text = ''),
  CHECK (status <> 'read' OR length(btrim(text)) > 0),
  UNIQUE(photo_id, slot_id),
  UNIQUE(id, submission_id, slot_id)
);

CREATE TABLE concept_blank_scan_correction (
  id uuid PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES concept_blank_scan_submission(id),
  read_id uuid NOT NULL,
  slot_id text NOT NULL,
  text text NOT NULL, -- empty is an intentional blank correction
  directly_entered boolean NOT NULL CHECK (directly_entered IS TRUE),
  student_actor_id uuid REFERENCES student(id),
  teacher_actor_id uuid REFERENCES "user"(id),
  sequence integer NOT NULL CHECK (sequence > 0),
  created_at timestamptz NOT NULL,
  CHECK (num_nonnulls(student_actor_id, teacher_actor_id) = 1),
  FOREIGN KEY (read_id, submission_id, slot_id) REFERENCES concept_blank_scan_read(id, submission_id, slot_id),
  UNIQUE(submission_id, sequence)
);

-- A target can cover >1 physical slot (B ○×). Do not sum slot grades or invent point weights.
CREATE TABLE concept_blank_scan_grade (
  id uuid PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES concept_blank_scan_submission(id),
  target_id text NOT NULL,
  sequence integer NOT NULL CHECK (sequence > 0),
  label text NOT NULL CHECK (label IN ('correct','partial','incorrect','review')),
  reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 240 AND reason !~ E'[\r\n]'),
  directly_entered boolean NOT NULL,
  -- Frozen ids of the exact read/correction versions used; regrading appends, never rewrites.
  evidence jsonb NOT NULL CHECK ((jsonb_typeof(evidence) = 'object'
    AND jsonb_typeof(evidence->'readIds') = 'array'
    AND jsonb_typeof(evidence->'correctionIds') = 'array') IS TRUE),
  origin text NOT NULL CHECK (origin IN ('rule','model','teacher')),
  teacher_id uuid REFERENCES "user"(id),
  prompt_version text,
  requested_model text,
  created_at timestamptz NOT NULL,
  CHECK ((origin = 'teacher') = (teacher_id IS NOT NULL)),
  CHECK (origin <> 'model' OR (prompt_version IS NOT NULL AND requested_model IS NOT NULL)),
  UNIQUE(submission_id, target_id, sequence)
);

-- One account-wide cap shared by reading and grading; not a fresh $100 budget per student/branch.
CREATE TABLE concept_blank_scan_usage_month (
  month text PRIMARY KEY CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  spent_nano_usd bigint NOT NULL DEFAULT 0 CHECK (spent_nano_usd >= 0),
  active_call_id uuid,
  unresolved boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL
);
CREATE TABLE concept_blank_scan_usage_call (
  id uuid PRIMARY KEY,
  month text NOT NULL REFERENCES concept_blank_scan_usage_month(month),
  submission_id uuid REFERENCES concept_blank_scan_submission(id),
  operation text NOT NULL CHECK (operation IN ('read','grade')),
  model text NOT NULL,
  tariff_version text NOT NULL CHECK (tariff_version = '2026-11-03'),
  prompt_version text NOT NULL,
  input_tokens bigint CHECK (input_tokens >= 0),
  cached_input_tokens bigint CHECK (cached_input_tokens >= 0),
  cache_creation_input_tokens bigint CHECK (cache_creation_input_tokens >= 0),
  output_tokens bigint CHECK (output_tokens >= 0),
  cost_nano_usd bigint CHECK (cost_nano_usd >= 0),
  status text NOT NULL CHECK (status IN ('running','settled','unresolved')),
  started_at timestamptz NOT NULL,
  settled_at timestamptz,
  CHECK (status <> 'settled' OR
    (input_tokens IS NOT NULL AND output_tokens IS NOT NULL AND cached_input_tokens IS NOT NULL
     AND cache_creation_input_tokens IS NOT NULL AND cost_nano_usd IS NOT NULL AND settled_at IS NOT NULL))
);
CREATE UNIQUE INDEX cb_scan_one_running_call ON concept_blank_scan_usage_call(month) WHERE status = 'running';

-- No client access: this app uses Auth.js + server ownership checks, not Supabase Auth identities.
ALTER TABLE concept_blank_printed_sheet ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_blank_scan_submission ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_blank_scan_photo ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_blank_scan_read ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_blank_scan_correction ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_blank_scan_grade ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_blank_scan_usage_month ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_blank_scan_usage_call ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON concept_blank_printed_sheet, concept_blank_scan_submission, concept_blank_scan_photo,
  concept_blank_scan_read, concept_blank_scan_correction, concept_blank_scan_grade,
  concept_blank_scan_usage_month, concept_blank_scan_usage_call FROM PUBLIC, anon, authenticated;
