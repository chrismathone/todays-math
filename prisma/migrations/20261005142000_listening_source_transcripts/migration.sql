-- Private, append-only whole-original ASR output. Existing official scripts stay in the set document.
CREATE TABLE public.english_listening_source_transcript (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES public.english_listening_set(id) ON DELETE RESTRICT,
  asset_id UUID NOT NULL REFERENCES public.english_listening_media_asset("assetId") ON DELETE RESTRICT,
  owner_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
  source_audio_sha256 TEXT NOT NULL CHECK (source_audio_sha256 ~ '^[a-f0-9]{64}$'),
  playback_sha256 TEXT NOT NULL CHECK (playback_sha256 ~ '^[a-f0-9]{64}$'),
  duration_ms INTEGER NOT NULL CHECK (duration_ms > 0),
  provider TEXT NOT NULL CHECK (provider = 'assemblyai'),
  profile TEXT NOT NULL CHECK (profile IN ('english', 'bilingual')),
  model TEXT NOT NULL,
  provider_transcript_id TEXT NOT NULL UNIQUE,
  text TEXT NOT NULL,
  display_text TEXT NOT NULL,
  words JSONB NOT NULL CHECK (jsonb_typeof(words) = 'array'),
  timing_quality JSONB NOT NULL CHECK (jsonb_typeof(timing_quality) = 'object'),
  request_config JSONB NOT NULL CHECK (jsonb_typeof(request_config) = 'object'),
  raw_response_sha256 TEXT NOT NULL CHECK (raw_response_sha256 ~ '^[a-f0-9]{64}$'),
  review_status TEXT NOT NULL CHECK (review_status = 'ai_unreviewed'),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- statement
CREATE INDEX english_listening_source_transcript_source_profile_generated_idx
  ON public.english_listening_source_transcript(set_id, asset_id, profile, generated_at DESC);
-- statement
ALTER TABLE public.english_listening_source_transcript ENABLE ROW LEVEL SECURITY;
-- statement
REVOKE ALL ON TABLE public.english_listening_source_transcript FROM PUBLIC;
-- statement
DO $$
DECLARE client_role TEXT;
BEGIN
  FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.english_listening_source_transcript FROM %I', client_role);
    END IF;
  END LOOP;
END $$;
-- No client policies or new role grants: reads go through the existing teacher runtime.
-- statement
CREATE FUNCTION public.english_listening_source_transcript_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Source transcripts are append-only; preserve previous versions';
END $$;
-- statement
REVOKE ALL ON FUNCTION public.english_listening_source_transcript_immutable() FROM PUBLIC;
-- statement
DO $$
DECLARE client_role TEXT;
BEGIN
  FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.english_listening_source_transcript_immutable() FROM %I', client_role);
    END IF;
  END LOOP;
END $$;
-- statement
CREATE TRIGGER english_listening_source_transcript_immutable
  BEFORE UPDATE OR DELETE ON public.english_listening_source_transcript
  FOR EACH ROW EXECUTE FUNCTION public.english_listening_source_transcript_immutable();
