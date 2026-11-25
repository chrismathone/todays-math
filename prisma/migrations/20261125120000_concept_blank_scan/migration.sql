-- cb-scan-ship: additive only. DB first, then application. NOT applied to the shared DB.
-- Existing tables/columns/CHECKs are unchanged. Auth.js ownership is checked by the server.

-- statement
CREATE TABLE concept_blank_printed_sheet (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES "user"(id),
  created_by uuid NOT NULL REFERENCES "user"(id),
  branch_id uuid REFERENCES branch(id),
  request_id uuid NOT NULL,
  sheet_code text,
  snapshot jsonb NOT NULL,
  layout jsonb NOT NULL,
  render_artifact jsonb NOT NULL,
  artifact_sha256 text NOT NULL CHECK (artifact_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, request_id),
  CHECK ((jsonb_typeof(snapshot) = 'object' AND snapshot->'version' = '1'::jsonb
    AND jsonb_typeof(snapshot->'pages') = 'array'
    AND jsonb_typeof(snapshot->'pageCount') = 'number'
    AND jsonb_typeof(snapshot->'bankFingerprint') = 'string') IS TRUE),
  CHECK ((jsonb_typeof(layout) = 'object' AND layout->'version' = '1'::jsonb
    AND jsonb_typeof(layout->'pages') = 'array') IS TRUE),
  CHECK ((jsonb_typeof(render_artifact) = 'object' AND render_artifact->'version' = '1'::jsonb) IS TRUE)
);
-- statement
CREATE INDEX cb_printed_owner ON concept_blank_printed_sheet(user_id, created_at);
-- statement
CREATE INDEX cb_printed_branch ON concept_blank_printed_sheet(branch_id, created_at);
-- statement
CREATE INDEX cb_printed_code ON concept_blank_printed_sheet(sheet_code);

-- statement
CREATE TABLE concept_blank_scan_submission (
  id uuid PRIMARY KEY,
  printed_sheet_id uuid NOT NULL REFERENCES concept_blank_printed_sheet(id),
  student_id uuid NOT NULL REFERENCES student(id),
  captured_student_id uuid REFERENCES student(id),
  captured_teacher_id uuid REFERENCES "user"(id),
  request_id uuid NOT NULL UNIQUE,
  state text NOT NULL DEFAULT 'capturing' CHECK (state IN ('capturing','read','checking','graded','teacher-corrected')),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  job_id uuid,
  job_kind text CHECK (job_kind IN ('read','grade')),
  job_started_at timestamptz(3),
  job_waiting boolean NOT NULL DEFAULT false,
  job_actor jsonb,
  last_error text,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  graded_at timestamptz(3),
  CHECK (num_nonnulls(captured_student_id, captured_teacher_id) = 1),
  CHECK (captured_student_id IS NULL OR captured_student_id = student_id),
  CHECK (num_nonnulls(job_id, job_kind, job_started_at) IN (0,3)),
  CHECK (state NOT IN ('graded','teacher-corrected') OR (graded_at IS NOT NULL AND job_id IS NULL))
);
-- statement
CREATE INDEX cb_scan_student ON concept_blank_scan_submission(student_id, created_at);
-- statement
CREATE INDEX cb_scan_sheet ON concept_blank_scan_submission(printed_sheet_id);

-- statement
CREATE TABLE concept_blank_scan_photo (
  id uuid PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES concept_blank_scan_submission(id),
  page_number integer NOT NULL CHECK (page_number > 0),
  version integer NOT NULL CHECK (version > 0),
  is_current boolean NOT NULL DEFAULT true,
  bucket text NOT NULL CHECK (length(bucket) > 0),
  object_key text NOT NULL CHECK (length(object_key) > 0),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  width integer NOT NULL CHECK (width > 0 AND width <= 10000),
  height integer NOT NULL CHECK (height > 0 AND height <= 10000),
  registration jsonb NOT NULL CHECK ((jsonb_typeof(registration) = 'object'
    AND registration->>'status' IN ('matched','uncertain')) IS TRUE),
  used_at timestamptz(3),
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamptz(3) NOT NULL,
  delete_requested_at timestamptz(3),
  deleted_at timestamptz(3),
  delete_attempts integer NOT NULL DEFAULT 0 CHECK (delete_attempts >= 0),
  delete_error text,
  CHECK (expires_at > created_at),
  UNIQUE(submission_id, page_number, version),
  UNIQUE(bucket, object_key),
  UNIQUE(id, submission_id)
);
-- statement
CREATE UNIQUE INDEX cb_scan_photo_current ON concept_blank_scan_photo(submission_id, page_number) WHERE is_current;
-- statement
CREATE INDEX cb_scan_photo_expiry ON concept_blank_scan_photo(expires_at) WHERE deleted_at IS NULL;

-- statement
CREATE TABLE concept_blank_scan_read (
  id uuid PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES concept_blank_scan_submission(id),
  photo_id uuid NOT NULL,
  slot_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('read','uncertain','unreadable','blank')),
  text text NOT NULL CHECK (length(text) <= 12000),
  prompt_version text NOT NULL,
  requested_model text NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (photo_id, submission_id) REFERENCES concept_blank_scan_photo(id, submission_id),
  CHECK (status NOT IN ('blank','unreadable') OR text = ''),
  CHECK (status <> 'read' OR length(btrim(text)) > 0),
  UNIQUE(photo_id, slot_id),
  UNIQUE(id, submission_id, slot_id)
);

-- statement
CREATE TABLE concept_blank_scan_correction (
  id uuid PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES concept_blank_scan_submission(id),
  read_id uuid NOT NULL,
  slot_id text NOT NULL,
  resolution text NOT NULL CHECK (resolution IN ('text','blank','review')),
  text text NOT NULL CHECK (length(text) <= 12000),
  directly_entered boolean NOT NULL CHECK (directly_entered IS TRUE),
  student_actor_id uuid REFERENCES student(id),
  teacher_actor_id uuid REFERENCES "user"(id),
  sequence integer NOT NULL CHECK (sequence > 0),
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (num_nonnulls(student_actor_id, teacher_actor_id) = 1),
  CHECK ((resolution = 'text' AND length(btrim(text)) > 0) OR (resolution IN ('blank','review') AND text = '')),
  FOREIGN KEY (read_id, submission_id, slot_id) REFERENCES concept_blank_scan_read(id, submission_id, slot_id),
  UNIQUE(submission_id, sequence)
);

-- statement
CREATE TABLE concept_blank_scan_grade (
  id uuid PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES concept_blank_scan_submission(id),
  target_id text NOT NULL,
  sequence integer NOT NULL CHECK (sequence > 0),
  label text NOT NULL CHECK (label IN ('correct','partial','incorrect','review')),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 240 AND reason !~ E'[\r\n]'),
  directly_entered boolean NOT NULL,
  evidence jsonb NOT NULL CHECK ((jsonb_typeof(evidence) = 'object'
    AND jsonb_typeof(evidence->'readIds') = 'array'
    AND jsonb_typeof(evidence->'correctionIds') = 'array') IS TRUE),
  origin text NOT NULL CHECK (origin IN ('rule','model','teacher')),
  teacher_id uuid REFERENCES "user"(id),
  prompt_version text,
  requested_model text,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((origin = 'teacher') = (teacher_id IS NOT NULL)),
  CHECK (origin <> 'model' OR (prompt_version IS NOT NULL AND requested_model IS NOT NULL)),
  UNIQUE(submission_id, target_id, sequence)
);

-- statement
CREATE TABLE concept_blank_scan_usage_month (
  month text PRIMARY KEY CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  spent_nano_usd bigint NOT NULL DEFAULT 0 CHECK (spent_nano_usd >= 0),
  reserved_nano_usd bigint NOT NULL DEFAULT 0 CHECK (reserved_nano_usd >= 0),
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- statement
CREATE TABLE concept_blank_scan_usage_call (
  id uuid PRIMARY KEY,
  month text NOT NULL REFERENCES concept_blank_scan_usage_month(month),
  submission_id uuid REFERENCES concept_blank_scan_submission(id),
  request_key text NOT NULL UNIQUE,
  result_key text NOT NULL,
  job_id uuid,
  bound jsonb,
  queue_order bigint GENERATED ALWAYS AS IDENTITY,
  settlement_reason text CHECK (settlement_reason IN ('reported','usage-unknown','bound-exceeded','queue-cancelled','worker-expired')),
  dispatched_at timestamptz(3),
  operation text NOT NULL CHECK (operation IN ('read','grade')),
  model text NOT NULL,
  tariff_version text NOT NULL CHECK (tariff_version = '2026-11-03'),
  prompt_version text NOT NULL,
  reserved_nano_usd bigint NOT NULL CHECK (reserved_nano_usd > 0),
  cost_nano_usd bigint CHECK (cost_nano_usd >= 0),
  receipt jsonb,
  result_text text,
  status text NOT NULL CHECK (status IN ('queued','running','settled')),
  started_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at timestamptz(3),
  CHECK (status <> 'settled' OR (cost_nano_usd IS NOT NULL AND settled_at IS NOT NULL)),
  CHECK ((status = 'settled') = (settlement_reason IS NOT NULL)),
  CHECK (settlement_reason NOT IN ('usage-unknown','worker-expired') OR (cost_nano_usd=reserved_nano_usd AND result_text IS NULL)),
  CHECK (settlement_reason <> 'queue-cancelled' OR (cost_nano_usd=0 AND result_text IS NULL)),
  CHECK (status = 'settled' OR result_text IS NULL)
);
-- statement
CREATE INDEX cb_scan_usage_queue ON concept_blank_scan_usage_call(status, queue_order);
-- statement
CREATE INDEX cb_scan_usage_result ON concept_blank_scan_usage_call(result_key) WHERE result_text IS NOT NULL;

-- Issued paper, initial readings and audit rows are append-only. Metadata deletion is a separate policy path.
-- statement
CREATE FUNCTION cb_scan_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'issued scan evidence is immutable' USING ERRCODE = '23514'; END $$;
-- statement
CREATE TRIGGER cb_scan_issued_immutable BEFORE UPDATE ON concept_blank_printed_sheet
  FOR EACH ROW EXECUTE FUNCTION cb_scan_immutable();
-- statement
CREATE TRIGGER cb_scan_read_immutable BEFORE UPDATE ON concept_blank_scan_read
  FOR EACH ROW EXECUTE FUNCTION cb_scan_immutable();
-- statement
CREATE TRIGGER cb_scan_correction_immutable BEFORE UPDATE ON concept_blank_scan_correction
  FOR EACH ROW EXECUTE FUNCTION cb_scan_immutable();
-- statement
CREATE TRIGGER cb_scan_grade_immutable BEFORE UPDATE ON concept_blank_scan_grade
  FOR EACH ROW EXECUTE FUNCTION cb_scan_immutable();

-- The same parent row lock is taken by publication and corrections. A late write cannot pass publication.
-- statement
CREATE FUNCTION cb_scan_evidence_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent concept_blank_scan_submission; snap jsonb; found_id boolean;
BEGIN
  SELECT * INTO STRICT parent FROM concept_blank_scan_submission WHERE id = NEW.submission_id FOR UPDATE;
  SELECT snapshot INTO STRICT snap FROM concept_blank_printed_sheet WHERE id = parent.printed_sheet_id;
  IF TG_TABLE_NAME = 'concept_blank_scan_grade' THEN
    SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(snap->'pages') p,
      jsonb_array_elements(p->'targets') t WHERE t->>'id' = NEW.target_id) INTO found_id;
    IF NOT found_id THEN RAISE EXCEPTION 'unknown scan target' USING ERRCODE = '23514'; END IF;
    IF NEW.origin = 'teacher' THEN
      IF parent.state NOT IN ('graded','teacher-corrected') THEN
        RAISE EXCEPTION 'teacher grade requires publication' USING ERRCODE = '23514';
      END IF;
    ELSIF parent.state IN ('graded','teacher-corrected') THEN
      RAISE EXCEPTION 'scan already published' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF parent.state IN ('graded','teacher-corrected') THEN
      RAISE EXCEPTION 'scan already published' USING ERRCODE = '23514';
    END IF;
    SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(snap->'pages') p,
      jsonb_array_elements(p->'slots') s WHERE s->>'id' = NEW.slot_id) INTO found_id;
    IF NOT found_id THEN RAISE EXCEPTION 'unknown scan slot' USING ERRCODE = '23514'; END IF;
    IF TG_TABLE_NAME = 'concept_blank_scan_read' THEN
      SELECT EXISTS(SELECT 1 FROM concept_blank_scan_photo ph, jsonb_array_elements(snap->'pages') p,
        jsonb_array_elements(p->'slots') s WHERE ph.id = NEW.photo_id AND ph.submission_id = NEW.submission_id
        AND ph.is_current AND ph.deleted_at IS NULL AND (p->>'number')::integer = ph.page_number
        AND s->>'id' = NEW.slot_id) INTO found_id;
      IF NOT found_id THEN RAISE EXCEPTION 'scan slot belongs to another photo' USING ERRCODE = '23514'; END IF;
    ELSIF TG_TABLE_NAME = 'concept_blank_scan_correction' THEN
      IF parent.state <> 'checking' OR parent.job_id IS NOT NULL THEN
        RAISE EXCEPTION 'scan input is frozen' USING ERRCODE = '23514';
      END IF;
      IF NEW.student_actor_id IS NOT NULL AND NEW.student_actor_id <> parent.student_id THEN
        RAISE EXCEPTION 'wrong scan student' USING ERRCODE = '23514';
      END IF;
      SELECT EXISTS(SELECT 1 FROM concept_blank_scan_read r JOIN concept_blank_scan_photo ph ON ph.id = r.photo_id
        WHERE r.id = NEW.read_id AND r.submission_id = NEW.submission_id AND ph.is_current) INTO found_id;
      IF NOT found_id THEN RAISE EXCEPTION 'scan photo was replaced' USING ERRCODE = '23514'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
-- statement
CREATE TRIGGER cb_scan_read_guard BEFORE INSERT ON concept_blank_scan_read
  FOR EACH ROW EXECUTE FUNCTION cb_scan_evidence_guard();
-- statement
CREATE TRIGGER cb_scan_correction_guard BEFORE INSERT ON concept_blank_scan_correction
  FOR EACH ROW EXECUTE FUNCTION cb_scan_evidence_guard();
-- statement
CREATE TRIGGER cb_scan_grade_guard BEFORE INSERT ON concept_blank_scan_grade
  FOR EACH ROW EXECUTE FUNCTION cb_scan_evidence_guard();

-- No browser policies. Never expose a service key or let student clients use these tables directly.
-- statement
ALTER TABLE concept_blank_printed_sheet ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE concept_blank_scan_submission ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE concept_blank_scan_photo ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE concept_blank_scan_read ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE concept_blank_scan_correction ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE concept_blank_scan_grade ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE concept_blank_scan_usage_month ENABLE ROW LEVEL SECURITY;
-- statement
ALTER TABLE concept_blank_scan_usage_call ENABLE ROW LEVEL SECURITY;
-- statement
REVOKE ALL ON concept_blank_printed_sheet, concept_blank_scan_submission, concept_blank_scan_photo,
  concept_blank_scan_read, concept_blank_scan_correction, concept_blank_scan_grade,
  concept_blank_scan_usage_month, concept_blank_scan_usage_call FROM PUBLIC;
-- statement
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON concept_blank_printed_sheet, concept_blank_scan_submission,
        concept_blank_scan_photo, concept_blank_scan_read, concept_blank_scan_correction,
        concept_blank_scan_grade, concept_blank_scan_usage_month, concept_blank_scan_usage_call FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
