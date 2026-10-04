-- Durable intent is written before Storage HTTP requests. No original audio bytea.
CREATE TABLE english_listening_media_storage_blob (
 key uuid PRIMARY KEY,
 "assetId" uuid NOT NULL REFERENCES english_listening_media_asset("assetId") ON DELETE RESTRICT,
 "byteLength" integer NOT NULL CHECK("byteLength">0 AND "byteLength"<=1048576),
 sha256 char(64) NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 ref jsonb,
 committed boolean NOT NULL DEFAULT false,
 deleting boolean NOT NULL DEFAULT false,
 "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(ref IS NULL OR (jsonb_typeof(ref)='object' AND ref ?& ARRAY['bucket','key','ownerId','etag','bytes','sha256','start','endExclusive'] AND jsonb_typeof(ref->'bucket')='string' AND jsonb_typeof(ref->'key')='string' AND jsonb_typeof(ref->'ownerId')='string' AND jsonb_typeof(ref->'etag')='string' AND jsonb_typeof(ref->'sha256')='string' AND jsonb_typeof(ref->'bytes')='number' AND jsonb_typeof(ref->'start')='number' AND jsonb_typeof(ref->'endExclusive')='number' AND ref->>'sha256'=sha256 AND (ref->>'bytes')::bigint="byteLength" AND (ref->>'start')::bigint=0 AND (ref->>'endExclusive')::bigint="byteLength")),
 CHECK(NOT committed OR ref IS NOT NULL)
);
-- statement
CREATE INDEX "english_listening_media_storage_blob_assetId_idx" ON english_listening_media_storage_blob("assetId");
-- statement
CREATE INDEX "english_listening_media_storage_blob_orphan_idx" ON english_listening_media_storage_blob(committed,"createdAt");
-- statement
CREATE INDEX "english_listening_media_storage_blob_object_idx" ON english_listening_media_storage_blob((ref->>'bucket'),(ref->>'key'));
-- statement
CREATE FUNCTION english_listening_immutable_storage_blob() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.key IS DISTINCT FROM OLD.key OR NEW."assetId" IS DISTINCT FROM OLD."assetId" OR NEW."byteLength" IS DISTINCT FROM OLD."byteLength" OR NEW.sha256 IS DISTINCT FROM OLD.sha256 OR (OLD.ref IS NOT NULL AND NEW.ref IS DISTINCT FROM OLD.ref) OR (OLD.committed AND NOT NEW.committed) THEN
  RAISE EXCEPTION 'Listening Storage object identity is immutable';
 END IF;
 RETURN NEW;
END $$;
-- statement
CREATE TRIGGER english_listening_storage_blob_immutable BEFORE UPDATE ON english_listening_media_storage_blob FOR EACH ROW EXECUTE FUNCTION english_listening_immutable_storage_blob();
-- statement
ALTER TABLE english_listening_media_storage_blob ENABLE ROW LEVEL SECURITY;
-- statement
REVOKE ALL ON TABLE english_listening_media_storage_blob FROM PUBLIC;
-- statement
DO $$ DECLARE r text; BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON TABLE english_listening_media_storage_blob FROM %I',r); END IF;
 END LOOP;
END $$;
