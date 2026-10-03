-- Additive only: no updates to existing rows/tables. Menu CHECK is a separate root-owned migration.
BEGIN;
CREATE TABLE english_passage (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  branch_id uuid, title varchar(160) NOT NULL, grade varchar(4), source jsonb NOT NULL,
  text text NOT NULL, text_length integer NOT NULL CHECK (text_length BETWEEN 1 AND 30000),
  snapshot_hash varchar(64) NOT NULL CHECK (snapshot_hash ~ '^[a-f0-9]{64}$'),
  duplicate_hash varchar(64) NOT NULL CHECK (duplicate_hash ~ '^[a-f0-9]{64}$'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  text_revision integer NOT NULL DEFAULT 1 CHECK (text_revision >= 1),
  rights jsonb NOT NULL, imported_from jsonb, import_fingerprint varchar(64), archived_at timestamp(3),
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamp(3) NOT NULL,
  CONSTRAINT english_passage_grade_valid CHECK (grade IS NULL OR grade IN ('중1','중2','중3','고1','고2','고3')),
  CONSTRAINT english_passage_source_object CHECK (jsonb_typeof(source) = 'object'),
  CONSTRAINT english_passage_rights_object CHECK (jsonb_typeof(rights) = 'object'),
  CONSTRAINT english_passage_user_id_import_fingerprint_key UNIQUE (user_id, import_fingerprint)
);
CREATE INDEX english_passage_user_id_archived_at_created_at_id_idx ON english_passage(user_id, archived_at, created_at, id);
CREATE INDEX english_passage_branch_id_archived_at_created_at_id_idx ON english_passage(branch_id, archived_at, created_at, id);
CREATE INDEX english_passage_user_id_duplicate_hash_idx ON english_passage(user_id, duplicate_hash);
CREATE TABLE english_passage_revision (
  passage_id uuid NOT NULL REFERENCES english_passage(id) ON DELETE RESTRICT,
  text_revision integer NOT NULL CHECK (text_revision >= 1), text text NOT NULL,
  snapshot_hash varchar(64) NOT NULL CHECK (snapshot_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (passage_id, text_revision)
);
CREATE TABLE english_passage_use (
  set_id uuid PRIMARY KEY REFERENCES english_question_set(id) ON DELETE CASCADE,
  passage_id uuid NOT NULL, text_revision integer NOT NULL,
  snapshot_hash varchar(64) NOT NULL CHECK (snapshot_hash ~ '^[a-f0-9]{64}$'),
  text_snapshot text NOT NULL, source_snapshot jsonb NOT NULL,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (passage_id, text_revision) REFERENCES english_passage_revision(passage_id, text_revision) ON DELETE RESTRICT
);
CREATE INDEX english_passage_use_passage_id_created_at_idx ON english_passage_use(passage_id, created_at);
CREATE TABLE english_passage_receipt (
  user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT, client_key uuid NOT NULL,
  request_hash varchar(64) NOT NULL, passage_id uuid NOT NULL REFERENCES english_passage(id) ON DELETE RESTRICT,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id, client_key)
);
CREATE INDEX english_passage_receipt_passage_id_idx ON english_passage_receipt(passage_id);

CREATE FUNCTION english_bank_reject_snapshot_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'English bank snapshots are immutable'; END;
$$;
CREATE TRIGGER english_passage_revision_immutable BEFORE UPDATE OR DELETE ON english_passage_revision
  FOR EACH ROW EXECUTE FUNCTION english_bank_reject_snapshot_mutation();
CREATE TRIGGER english_passage_use_immutable BEFORE UPDATE ON english_passage_use
  FOR EACH ROW EXECUTE FUNCTION english_bank_reject_snapshot_mutation();
CREATE TRIGGER english_passage_receipt_immutable BEFORE UPDATE ON english_passage_receipt
  FOR EACH ROW EXECUTE FUNCTION english_bank_reject_snapshot_mutation();

ALTER TABLE english_passage ENABLE ROW LEVEL SECURITY;
ALTER TABLE english_passage_revision ENABLE ROW LEVEL SECURITY;
ALTER TABLE english_passage_use ENABLE ROW LEVEL SECURITY;
ALTER TABLE english_passage_receipt ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON english_passage, english_passage_revision, english_passage_use, english_passage_receipt FROM PUBLIC;
REVOKE ALL ON FUNCTION english_bank_reject_snapshot_mutation() FROM PUBLIC;
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
      EXECUTE format('REVOKE ALL ON english_passage, english_passage_revision, english_passage_use, english_passage_receipt FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON FUNCTION english_bank_reject_snapshot_mutation() FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
COMMIT;
