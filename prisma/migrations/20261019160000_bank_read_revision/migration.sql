-- Additive, DB first. No secondary indexes or precomputed bank totals.
-- Apply in ONE transaction (guarded operator sets lock/statement/transaction limits).
-- Lock before the initial counter snapshot so an old writer cannot slip between
-- the snapshot and trigger installation. Existing readers keep working.
-- statement
LOCK TABLE public.problem, public.unit, public.source_material, public.source_book
  IN SHARE ROW EXCLUSIVE MODE;
-- statement
CREATE TABLE public.bank_read_revision (
  id smallint PRIMARY KEY DEFAULT 1,
  revision bigint NOT NULL DEFAULT 1,
  schema_version smallint NOT NULL DEFAULT 1,
  format_version varchar(96) NOT NULL,
  invalid_format_count bigint NOT NULL DEFAULT 0,
  CONSTRAINT bank_read_revision_singleton CHECK (id = 1),
  CONSTRAINT bank_read_revision_schema CHECK (schema_version = 1),
  CONSTRAINT bank_read_revision_positive CHECK (revision > 0),
  CONSTRAINT bank_read_revision_invalid CHECK (invalid_format_count >= 0)
);
-- statement
ALTER TABLE public.bank_read_revision ENABLE ROW LEVEL SECURITY;
-- statement
REVOKE ALL ON TABLE public.bank_read_revision FROM PUBLIC, anon, authenticated;
-- statement
INSERT INTO public.bank_read_revision (id, format_version, invalid_format_count)
SELECT 1, 'format-v1:1c653f6c01b41e1c9e9a78edab82a2e3373923af6d6c88aa9f21233aafa0e42a',
  count(*) FILTER (WHERE actual_format IS NULL OR actual_format_version IS DISTINCT FROM
    'format-v1:1c653f6c01b41e1c9e9a78edab82a2e3373923af6d6c88aa9f21233aafa0e42a')
FROM public.problem WHERE pool = 'shared';
-- statement
CREATE FUNCTION public.advance_problem_bank_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  expected_version text;
  new_invalid bigint := 0;
  old_invalid bigint := 0;
  touched bigint := 0;
  old_touched bigint := 0;
BEGIN
  SELECT format_version INTO STRICT expected_version
    FROM public.bank_read_revision WHERE id = 1;
  IF TG_OP = 'TRUNCATE' THEN
    UPDATE public.bank_read_revision
      SET revision = revision + 1, invalid_format_count = 0 WHERE id = 1;
    RETURN NULL;
  END IF;
  -- AFTER transition relations include the existing BEFORE invalidation triggers.
  -- Only changed rows are scanned; a 100k-row import bumps the singleton once.
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT count(*), count(*) FILTER (WHERE actual_format IS NULL
      OR actual_format_version IS DISTINCT FROM expected_version)
      INTO touched, new_invalid FROM new_rows WHERE pool = 'shared';
  END IF;
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    SELECT count(*), count(*) FILTER (WHERE actual_format IS NULL
      OR actual_format_version IS DISTINCT FROM expected_version)
      INTO old_touched, old_invalid FROM old_rows WHERE pool = 'shared';
  END IF;
  IF touched + old_touched > 0 THEN
    -- Atomic relative updates serialize concurrent writers without lost bumps.
    -- There is no SELECT-then-write of a previously read revision/counter.
    UPDATE public.bank_read_revision SET revision = revision + 1,
      invalid_format_count = invalid_format_count + new_invalid - old_invalid
      WHERE id = 1;
  END IF;
  RETURN NULL;
END;
$$;
-- statement
CREATE FUNCTION public.advance_related_bank_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  UPDATE public.bank_read_revision SET revision = revision + 1 WHERE id = 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BANK_REVISION_SINGLETON_MISSING';
  END IF;
  RETURN NULL;
END;
$$;
-- statement
REVOKE ALL ON FUNCTION public.advance_problem_bank_revision(),
  public.advance_related_bank_revision() FROM PUBLIC, anon, authenticated;
-- statement
CREATE TRIGGER problem_bank_revision_insert AFTER INSERT ON public.problem
  REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT
  EXECUTE FUNCTION public.advance_problem_bank_revision();
-- statement
CREATE TRIGGER problem_bank_revision_update AFTER UPDATE ON public.problem
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT
  EXECUTE FUNCTION public.advance_problem_bank_revision();
-- statement
CREATE TRIGGER problem_bank_revision_delete AFTER DELETE ON public.problem
  REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT
  EXECUTE FUNCTION public.advance_problem_bank_revision();
-- statement
CREATE TRIGGER problem_bank_revision_truncate AFTER TRUNCATE ON public.problem
  FOR EACH STATEMENT EXECUTE FUNCTION public.advance_problem_bank_revision();
-- statement
CREATE TRIGGER unit_bank_revision AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.unit
  FOR EACH STATEMENT EXECUTE FUNCTION public.advance_related_bank_revision();
-- statement
CREATE TRIGGER source_material_bank_revision AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.source_material
  FOR EACH STATEMENT EXECUTE FUNCTION public.advance_related_bank_revision();
-- statement
CREATE TRIGGER source_book_bank_revision AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.source_book
  FOR EACH STATEMENT EXECUTE FUNCTION public.advance_related_bank_revision();
