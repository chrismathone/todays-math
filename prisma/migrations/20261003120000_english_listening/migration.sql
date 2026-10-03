-- Additive pilot tables only. Run this migration alone, never unrelated pending migrations.
-- statement
CREATE TABLE "english_listening_set" (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
 branch_id uuid, revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
 document jsonb NOT NULL CHECK(jsonb_typeof(document) = 'object'),
 created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, deleted_at timestamp,
 CHECK (document->>'id' = id::text), CHECK (document->>'ownerId' = owner_id::text),
 CHECK ((document->>'branchId') IS NOT DISTINCT FROM branch_id::text)
);
-- statement
CREATE INDEX english_listening_set_owner_id_created_at_idx ON english_listening_set(owner_id,created_at);
-- statement
CREATE TABLE english_listening_publication (
 id uuid PRIMARY KEY, set_id uuid NOT NULL REFERENCES english_listening_set(id) ON DELETE RESTRICT,
 source_revision integer NOT NULL CHECK(source_revision > 0), snapshot jsonb NOT NULL,
 created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, withdrawn_at timestamp,
 UNIQUE(set_id,source_revision), CHECK(snapshot->>'id' = id::text), CHECK(snapshot->'document'->>'id' = set_id::text)
);
-- statement
CREATE TABLE english_listening_assignment (
 id uuid PRIMARY KEY, publication_id uuid NOT NULL REFERENCES english_listening_publication(id) ON DELETE RESTRICT,
 owner_id uuid NOT NULL, branch_id uuid, class_id uuid NOT NULL REFERENCES "class"(id) ON DELETE RESTRICT,
 revision integer NOT NULL DEFAULT 1 CHECK(revision > 0), snapshot jsonb NOT NULL, manual_release jsonb,
 created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, cancelled_at timestamp,
 CHECK(snapshot->>'id' = id::text), CHECK(snapshot->>'publicationId' = publication_id::text),
 CHECK(snapshot->>'ownerId' = owner_id::text), CHECK((snapshot->>'branchId') IS NOT DISTINCT FROM branch_id::text)
);
-- statement
CREATE INDEX english_listening_assignment_owner_id_created_at_idx ON english_listening_assignment(owner_id,created_at);
-- statement
CREATE TABLE english_listening_assignment_revision (
 assignment_id uuid NOT NULL REFERENCES english_listening_assignment(id) ON DELETE RESTRICT,
 revision integer NOT NULL CHECK(revision>0), snapshot jsonb NOT NULL, PRIMARY KEY(assignment_id,revision),
 CHECK(snapshot->>'id' = assignment_id::text), CHECK((snapshot->>'revision')::integer = revision)
);
-- statement
CREATE TABLE english_listening_target (
 assignment_id uuid NOT NULL REFERENCES english_listening_assignment(id) ON DELETE RESTRICT,
 student_id uuid NOT NULL REFERENCES student(id) ON DELETE RESTRICT, class_id uuid NOT NULL,
 revoked_at timestamp, PRIMARY KEY(assignment_id,student_id)
);
-- statement
CREATE INDEX english_listening_target_student_id_idx ON english_listening_target(student_id);
-- statement
CREATE TABLE english_listening_attempt (
 id uuid PRIMARY KEY, assignment_id uuid NOT NULL REFERENCES english_listening_assignment(id) ON DELETE RESTRICT,
 student_id uuid NOT NULL REFERENCES student(id) ON DELETE RESTRICT, ordinal integer NOT NULL DEFAULT 1 CHECK(ordinal>0),
 revision integer NOT NULL CHECK(revision>0), snapshot jsonb NOT NULL, UNIQUE(assignment_id,student_id,ordinal),
 FOREIGN KEY(assignment_id,student_id) REFERENCES english_listening_target(assignment_id,student_id) ON DELETE RESTRICT,
 CHECK(snapshot->>'id' = id::text), CHECK(snapshot->>'assignmentId' = assignment_id::text),
 CHECK(snapshot->>'studentId' = student_id::text), CHECK((snapshot->>'revision')::integer = revision)
);
-- statement
CREATE TABLE english_listening_receipt (
 attempt_id uuid NOT NULL REFERENCES english_listening_attempt(id) ON DELETE RESTRICT,
 key varchar(200) NOT NULL, command_hash char(64) NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),
 accepted_revision integer NOT NULL CHECK(accepted_revision>0), PRIMARY KEY(attempt_id,key)
);
-- statement
CREATE TABLE english_listening_release (
 assignment_id uuid NOT NULL REFERENCES english_listening_assignment(id) ON DELETE RESTRICT,
 student_id uuid NOT NULL, group_id uuid NOT NULL, publication_id uuid NOT NULL,
 released_at timestamp NOT NULL, reason varchar(30) NOT NULL,
 early_exposure boolean NOT NULL, PRIMARY KEY(assignment_id,student_id,group_id),
 FOREIGN KEY(assignment_id,student_id) REFERENCES english_listening_target(assignment_id,student_id) ON DELETE RESTRICT
);
-- statement
CREATE TABLE english_listening_broadcast (
 id uuid PRIMARY KEY, assignment_id uuid NOT NULL UNIQUE REFERENCES english_listening_assignment(id) ON DELETE RESTRICT,
 snapshot jsonb NOT NULL, ended_at timestamp, interrupted boolean NOT NULL DEFAULT false,
 CHECK(snapshot->>'id' = id::text), CHECK(snapshot->>'assignmentId' = assignment_id::text)
);
-- statement
CREATE TABLE english_listening_audit (
 id uuid PRIMARY KEY, resource_id uuid NOT NULL, actor_id uuid NOT NULL, kind varchar(50) NOT NULL,
 payload jsonb NOT NULL, created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- statement
CREATE INDEX english_listening_audit_resource_id_created_at_idx ON english_listening_audit(resource_id,created_at);
-- statement
CREATE TABLE english_listening_media_asset (
 "assetId" uuid PRIMARY KEY, "ownerId" uuid NOT NULL, "branchId" uuid,
 "setId" uuid NOT NULL REFERENCES english_listening_set(id) ON DELETE RESTRICT,
 revision integer NOT NULL CHECK(revision>=0), state varchar(30) NOT NULL CHECK(state IN ('uploading','ready','publish_blocked','failed','expired')),
 "uploadExpiresAt" timestamp NOT NULL, "reservedBytes" integer NOT NULL CHECK("reservedBytes">=0), record jsonb NOT NULL,
 CHECK(record->>'assetId' = "assetId"::text), CHECK(record->>'setId' = "setId"::text),
 CHECK(record->>'ownerId' = "ownerId"::text), CHECK((record->>'branchId') IS NOT DISTINCT FROM "branchId"::text)
);
-- statement
CREATE INDEX "english_listening_media_asset_ownerId_idx" ON english_listening_media_asset("ownerId");
-- statement
CREATE INDEX "english_listening_media_asset_state_uploadExpiresAt_idx" ON english_listening_media_asset(state,"uploadExpiresAt");
-- statement
CREATE TABLE english_listening_media_blob (
 key uuid PRIMARY KEY, "assetId" uuid NOT NULL REFERENCES english_listening_media_asset("assetId") ON DELETE RESTRICT,
 bytes bytea NOT NULL, "byteLength" integer NOT NULL CHECK("byteLength">0 AND "byteLength"<=1048576),
 committed boolean NOT NULL DEFAULT false, "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(octet_length(bytes)="byteLength")
);
-- statement
CREATE INDEX "english_listening_media_blob_assetId_idx" ON english_listening_media_blob("assetId");
-- statement
CREATE INDEX "english_listening_media_blob_committed_createdAt_idx" ON english_listening_media_blob(committed,"createdAt");
-- statement
CREATE FUNCTION english_listening_immutable_publication() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.set_id IS DISTINCT FROM OLD.set_id OR NEW.source_revision IS DISTINCT FROM OLD.source_revision OR NEW.id IS DISTINCT FROM OLD.id THEN
  RAISE EXCEPTION 'Listening publication content is immutable';
 END IF;
 RETURN NEW;
END $$;
-- statement
CREATE TRIGGER english_listening_publication_immutable BEFORE UPDATE ON english_listening_publication FOR EACH ROW EXECUTE FUNCTION english_listening_immutable_publication();
-- statement
DO $$
DECLARE t text; r text;
BEGIN
 FOREACH t IN ARRAY ARRAY['english_listening_set','english_listening_publication','english_listening_assignment','english_listening_assignment_revision','english_listening_target','english_listening_attempt','english_listening_receipt','english_listening_release','english_listening_broadcast','english_listening_audit','english_listening_media_asset','english_listening_media_blob'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON TABLE %I FROM PUBLIC',t);
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON TABLE %I FROM %I',t,r); END IF;
  END LOOP;
 END LOOP;
END $$;
-- statement
CREATE FUNCTION english_listening_immutable_media() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME = 'english_listening_media_blob' THEN
  IF NEW.bytes IS DISTINCT FROM OLD.bytes OR NEW."byteLength" IS DISTINCT FROM OLD."byteLength" OR NEW.key IS DISTINCT FROM OLD.key OR NEW."assetId" IS DISTINCT FROM OLD."assetId" THEN
   RAISE EXCEPTION 'Listening blob bytes and binding are immutable';
  END IF;
 ELSE
  IF OLD.state = 'ready' AND (NEW.record IS DISTINCT FROM OLD.record OR NEW.revision IS DISTINCT FROM OLD.revision OR NEW.state IS DISTINCT FROM OLD.state OR NEW."ownerId" IS DISTINCT FROM OLD."ownerId" OR NEW."branchId" IS DISTINCT FROM OLD."branchId" OR NEW."setId" IS DISTINCT FROM OLD."setId" OR NEW."assetId" IS DISTINCT FROM OLD."assetId") THEN
   RAISE EXCEPTION 'Ready listening media is immutable';
  END IF;
 END IF;
 RETURN NEW;
END $$;
-- statement
CREATE TRIGGER english_listening_blob_immutable BEFORE UPDATE ON english_listening_media_blob FOR EACH ROW EXECUTE FUNCTION english_listening_immutable_media();
-- statement
CREATE TRIGGER english_listening_ready_media_immutable BEFORE UPDATE ON english_listening_media_asset FOR EACH ROW EXECUTE FUNCTION english_listening_immutable_media();
