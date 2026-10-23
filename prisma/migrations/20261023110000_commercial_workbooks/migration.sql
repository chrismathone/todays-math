-- Additive server-only domain. No existing grading, textbook or SRS rows are changed.
CREATE TABLE commercial_workbook_edition (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL CHECK ((jsonb_typeof(metadata) = 'object') IS TRUE),
  CHECK ((jsonb_typeof(metadata->'title') = 'string' AND length(trim(metadata->>'title')) BETWEEN 1 AND 200 AND jsonb_typeof(metadata->'edition') = 'string' AND length(trim(metadata->>'edition')) BETWEEN 1 AND 200) IS TRUE),
  revision integer NOT NULL CHECK ((revision > 0) IS TRUE), created_at timestamptz(3) NOT NULL,
  UNIQUE(id, owner_id)
);
CREATE INDEX commercial_workbook_edition_owner_id_created_at_idx ON commercial_workbook_edition(owner_id, created_at);
CREATE TABLE commercial_workbook_revision (
  edition_id uuid NOT NULL REFERENCES commercial_workbook_edition(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK ((revision > 0) IS TRUE), snapshot jsonb NOT NULL,
  PRIMARY KEY(edition_id, revision),
  CHECK ((snapshot ?& ARRAY['revision','provenance','createdAt','createdBy','exercises']) IS TRUE),
  CHECK ((jsonb_typeof(snapshot->'provenance') = 'object' AND snapshot->'provenance' ?& ARRAY['kind','description']) IS TRUE),
  CHECK ((jsonb_typeof(snapshot) = 'object' AND snapshot->>'revision' = revision::text) IS TRUE),
  CHECK ((jsonb_typeof(snapshot->'exercises') = 'array' AND jsonb_array_length(snapshot->'exercises') BETWEEN 1 AND 5000) IS TRUE)
);
CREATE TABLE commercial_workbook_assignment (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES class(id) ON DELETE RESTRICT,
  edition_id uuid NOT NULL, key_revision integer NOT NULL,
  snapshot jsonb NOT NULL, created_at timestamptz(3) NOT NULL,
  UNIQUE(id, owner_id),
  CHECK ((snapshot ?& ARRAY['id','title','classId','className','dueAt','createdAt','createdBy','edition','exercises','targets']) IS TRUE),
  FOREIGN KEY(edition_id, owner_id) REFERENCES commercial_workbook_edition(id, owner_id) ON DELETE RESTRICT,
  FOREIGN KEY(edition_id, key_revision) REFERENCES commercial_workbook_revision(edition_id, revision) ON DELETE RESTRICT,
  CHECK ((jsonb_typeof(snapshot) = 'object' AND snapshot->>'id' = id::text) IS TRUE),
  CHECK ((snapshot->>'classId' = class_id::text AND snapshot->>'createdBy' = owner_id::text) IS TRUE),
  CHECK ((snapshot->'edition'->>'id' = edition_id::text AND snapshot->'edition'->>'revision' = key_revision::text) IS TRUE),
  CHECK ((jsonb_typeof(snapshot->'targets') = 'array' AND jsonb_array_length(snapshot->'targets') BETWEEN 1 AND 100) IS TRUE),
  CHECK ((jsonb_typeof(snapshot->'exercises') = 'array' AND jsonb_array_length(snapshot->'exercises') BETWEEN 1 AND 500) IS TRUE)
);
CREATE INDEX commercial_workbook_assignment_owner_id_created_at_idx ON commercial_workbook_assignment(owner_id, created_at);
CREATE INDEX commercial_workbook_assignment_class_id_idx ON commercial_workbook_assignment(class_id);
CREATE INDEX commercial_workbook_assignment_edition_id_key_revision_idx ON commercial_workbook_assignment(edition_id, key_revision);
CREATE TABLE commercial_workbook_grade_event (
  id uuid PRIMARY KEY, assignment_id uuid NOT NULL REFERENCES commercial_workbook_assignment(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES student(id) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK ((revision > 0) IS TRUE), snapshot jsonb NOT NULL,
  UNIQUE(assignment_id, student_id, revision), UNIQUE(id, assignment_id, student_id),
  CHECK ((snapshot ?& ARRAY['id','revision','previousRevision','requestId','gradedAt','gradedBy','marks']) IS TRUE),
  CHECK ((jsonb_typeof(snapshot) = 'object' AND snapshot->>'id' = id::text AND snapshot->>'revision' = revision::text) IS TRUE),
  CHECK ((snapshot->>'previousRevision' = (revision - 1)::text) IS TRUE),
  CHECK ((jsonb_typeof(snapshot->'marks') = 'array' AND jsonb_array_length(snapshot->'marks') BETWEEN 1 AND 500) IS TRUE)
);
CREATE INDEX commercial_workbook_grade_event_student_id_idx ON commercial_workbook_grade_event(student_id);
CREATE TABLE commercial_workbook_wrong_note (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL, assignment_id uuid NOT NULL,
  student_id uuid NOT NULL, exercise_id uuid NOT NULL, event_id uuid NOT NULL,
  revision integer NOT NULL CHECK ((revision >= 0) IS TRUE), snapshot jsonb NOT NULL,
  UNIQUE(event_id, exercise_id),
  CHECK ((snapshot ?& ARRAY['id','assignmentId','assignmentTitle','studentId','studentName','exerciseId','edition','address','key','originalWrongEvent','latestMark','correctionText','status','revision','updatedAt']) IS TRUE),
  FOREIGN KEY(assignment_id, owner_id) REFERENCES commercial_workbook_assignment(id, owner_id) ON DELETE RESTRICT,
  FOREIGN KEY(event_id, assignment_id, student_id) REFERENCES commercial_workbook_grade_event(id, assignment_id, student_id) ON DELETE RESTRICT,
  CHECK ((jsonb_typeof(snapshot) = 'object' AND snapshot->>'id' = id::text AND snapshot->>'revision' = revision::text) IS TRUE),
  CHECK ((snapshot->>'assignmentId' = assignment_id::text AND snapshot->>'studentId' = student_id::text AND snapshot->>'exerciseId' = exercise_id::text) IS TRUE),
  CHECK ((snapshot->'originalWrongEvent'->>'id' = event_id::text) IS TRUE),
  CHECK ((snapshot->>'status' IN ('todo', 'done')) IS TRUE)
);
CREATE INDEX commercial_workbook_wrong_note_owner_id_student_id_idx ON commercial_workbook_wrong_note(owner_id, student_id);
CREATE INDEX commercial_workbook_wrong_note_assignment_id_idx ON commercial_workbook_wrong_note(assignment_id);
CREATE TABLE commercial_workbook_request (
  owner_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT, request_id varchar(100) NOT NULL,
  fingerprint text NOT NULL, response jsonb NOT NULL, created_at timestamptz(3) NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id, request_id), CHECK ((length(request_id) BETWEEN 8 AND 100) IS TRUE)
);

-- No browser policies: only the server connection may read keys or student records.
DO $$ DECLARE t text; r text; BEGIN
  FOREACH t IN ARRAY ARRAY['commercial_workbook_edition','commercial_workbook_revision','commercial_workbook_assignment','commercial_workbook_grade_event','commercial_workbook_wrong_note','commercial_workbook_request'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM PUBLIC', t);
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
        EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', t, r);
      END IF;
    END LOOP;
  END LOOP;
END $$;

CREATE FUNCTION commercial_workbook_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN RAISE EXCEPTION 'Commercial workbook history is immutable' USING ERRCODE = '23514'; END $$;
REVOKE ALL ON FUNCTION commercial_workbook_immutable() FROM PUBLIC;
CREATE TRIGGER commercial_workbook_revision_immutable BEFORE UPDATE OR DELETE ON commercial_workbook_revision FOR EACH ROW EXECUTE FUNCTION commercial_workbook_immutable();
CREATE TRIGGER commercial_workbook_assignment_immutable BEFORE UPDATE OR DELETE ON commercial_workbook_assignment FOR EACH ROW EXECUTE FUNCTION commercial_workbook_immutable();
CREATE TRIGGER commercial_workbook_grade_event_immutable BEFORE UPDATE OR DELETE ON commercial_workbook_grade_event FOR EACH ROW EXECUTE FUNCTION commercial_workbook_immutable();
CREATE TRIGGER commercial_workbook_request_immutable BEFORE UPDATE OR DELETE ON commercial_workbook_request FOR EACH ROW EXECUTE FUNCTION commercial_workbook_immutable();

CREATE FUNCTION commercial_workbook_note_history() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF NEW.id <> OLD.id OR NEW.owner_id <> OLD.owner_id OR NEW.assignment_id <> OLD.assignment_id OR
    NEW.student_id <> OLD.student_id OR NEW.exercise_id <> OLD.exercise_id OR NEW.event_id <> OLD.event_id OR
    NEW.revision <> OLD.revision + 1 OR
    (NEW.snapshot - ARRAY['correctionText','status','revision','updatedAt','latestMark']) IS DISTINCT FROM
    (OLD.snapshot - ARRAY['correctionText','status','revision','updatedAt','latestMark']) THEN
    RAISE EXCEPTION 'Original wrong event cannot change' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION commercial_workbook_note_history() FROM PUBLIC;
CREATE TRIGGER commercial_workbook_note_history BEFORE UPDATE ON commercial_workbook_wrong_note FOR EACH ROW EXECUTE FUNCTION commercial_workbook_note_history();

-- Guard snapshot invariants even if a future writer bypasses the application service.
CREATE FUNCTION commercial_workbook_revision_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE previous jsonb; expected integer; BEGIN
  SELECT coalesce(max(revision), 0) + 1 INTO expected FROM public.commercial_workbook_revision WHERE edition_id = NEW.edition_id;
  IF NEW.revision <> expected THEN RAISE EXCEPTION 'Key revisions must be consecutive' USING ERRCODE = '23514'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.snapshot->'exercises') e GROUP BY normalize((e->'address')::text, NFC) HAVING count(*) > 1)
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.snapshot->'exercises') e GROUP BY e->>'id' HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate workbook exercise address or ID' USING ERRCODE = '23514';
  END IF;
  IF NEW.revision > 1 THEN
    SELECT snapshot INTO previous FROM public.commercial_workbook_revision WHERE edition_id = NEW.edition_id AND revision = NEW.revision - 1;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(previous->'exercises') prior_exercise
      WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.snapshot->'exercises') current
        WHERE normalize((current->'address')::text, NFC) = normalize((prior_exercise->'address')::text, NFC) AND current->>'id' = prior_exercise->>'id')) THEN
      RAISE EXCEPTION 'Existing exercise identities must remain stable' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION commercial_workbook_revision_guard() FROM PUBLIC;
CREATE TRIGGER commercial_workbook_revision_guard BEFORE INSERT ON commercial_workbook_revision FOR EACH ROW EXECUTE FUNCTION commercial_workbook_revision_guard();

CREATE FUNCTION commercial_workbook_grade_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE assigned jsonb; expected integer; BEGIN
  SELECT snapshot INTO assigned FROM public.commercial_workbook_assignment WHERE id = NEW.assignment_id;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(assigned->'targets') t WHERE t->>'studentId' = NEW.student_id::text) THEN
    RAISE EXCEPTION 'Student is not an assignment target' USING ERRCODE = '23514';
  END IF;
  SELECT coalesce(max(revision), 0) + 1 INTO expected FROM public.commercial_workbook_grade_event WHERE assignment_id = NEW.assignment_id AND student_id = NEW.student_id;
  IF NEW.revision <> expected OR NEW.snapshot->>'gradedBy' IS DISTINCT FROM assigned->>'createdBy' THEN
    RAISE EXCEPTION 'Invalid grade revision or actor' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.snapshot->'marks') m
    WHERE m->>'mark' IS NULL OR m->>'mark' NOT IN ('correct','wrong','unattempted') OR NOT EXISTS
      (SELECT 1 FROM jsonb_array_elements(assigned->'exercises') e WHERE e->>'id' = m->>'exerciseId')) OR
    EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.snapshot->'marks') m GROUP BY m->>'exerciseId' HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Invalid or duplicate assignment mark' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION commercial_workbook_grade_guard() FROM PUBLIC;
CREATE TRIGGER commercial_workbook_grade_guard BEFORE INSERT ON commercial_workbook_grade_event FOR EACH ROW EXECUTE FUNCTION commercial_workbook_grade_guard();

CREATE FUNCTION commercial_workbook_assignment_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE revision_snapshot jsonb; metadata_snapshot jsonb; BEGIN
  SELECT r.snapshot, e.metadata INTO revision_snapshot, metadata_snapshot FROM public.commercial_workbook_revision r
    JOIN public.commercial_workbook_edition e ON e.id = r.edition_id
    WHERE r.edition_id = NEW.edition_id AND r.revision = NEW.key_revision AND e.owner_id = NEW.owner_id;
  IF NEW.snapshot->'edition'->'metadata' IS DISTINCT FROM metadata_snapshot OR
    NEW.snapshot->'edition'->'provenance' IS DISTINCT FROM revision_snapshot->'provenance' OR
    EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.snapshot->'exercises') selected_exercise
      WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(revision_snapshot->'exercises') original_exercise WHERE selected_exercise = original_exercise)) OR
    EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.snapshot->'exercises') e GROUP BY e->>'id' HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Assignment must use the exact frozen key revision' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.snapshot->'targets') t WHERE
    (t ?& ARRAY['studentId','studentName','revision','marks','history'] AND t->>'revision' = '0' AND t->'marks' = '{}'::jsonb AND t->'history' = '[]'::jsonb) IS DISTINCT FROM true OR
    NOT EXISTS (SELECT 1 FROM public.student s WHERE s.id::text = t->>'studentId')) OR
    EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.snapshot->'targets') t GROUP BY t->>'studentId' HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Invalid initial assignment targets' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION commercial_workbook_assignment_guard() FROM PUBLIC;
CREATE TRIGGER commercial_workbook_assignment_guard BEFORE INSERT ON commercial_workbook_assignment FOR EACH ROW EXECUTE FUNCTION commercial_workbook_assignment_guard();

CREATE FUNCTION commercial_workbook_note_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE event_snapshot jsonb; assigned jsonb; exercise jsonb; BEGIN
  SELECT snapshot INTO event_snapshot FROM public.commercial_workbook_grade_event WHERE id = NEW.event_id AND assignment_id = NEW.assignment_id AND student_id = NEW.student_id;
  SELECT snapshot INTO assigned FROM public.commercial_workbook_assignment WHERE id = NEW.assignment_id AND owner_id = NEW.owner_id;
  SELECT e INTO exercise FROM jsonb_array_elements(assigned->'exercises') e WHERE e->>'id' = NEW.exercise_id::text;
  IF event_snapshot IS NULL OR exercise IS NULL OR
    NOT EXISTS (SELECT 1 FROM jsonb_array_elements(event_snapshot->'marks') m WHERE m->>'exerciseId' = NEW.exercise_id::text AND m->>'mark' = 'wrong') OR
    NEW.snapshot->'originalWrongEvent' IS DISTINCT FROM jsonb_build_object('id', event_snapshot->'id', 'revision', event_snapshot->'revision', 'gradedAt', event_snapshot->'gradedAt', 'gradedBy', event_snapshot->'gradedBy') OR
    NEW.snapshot->'edition' IS DISTINCT FROM assigned->'edition' OR NEW.snapshot->'address' IS DISTINCT FROM exercise->'address' OR NEW.snapshot->'key' IS DISTINCT FROM exercise->'key' THEN
    RAISE EXCEPTION 'Wrong note must preserve its original wrong event and frozen exercise' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION commercial_workbook_note_guard() FROM PUBLIC;
CREATE TRIGGER commercial_workbook_note_guard BEFORE INSERT ON commercial_workbook_wrong_note FOR EACH ROW EXECUTE FUNCTION commercial_workbook_note_guard();
CREATE TRIGGER commercial_workbook_note_immutable_delete BEFORE DELETE ON commercial_workbook_wrong_note FOR EACH ROW EXECUTE FUNCTION commercial_workbook_immutable();
