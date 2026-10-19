-- Additive DB phase only. Do not deploy a new generated Prisma client before this DDL.
-- Each statement is delimited for the guarded operator, not split on PL/pgSQL semicolons.
-- statement
ALTER TABLE public.problem
  ADD COLUMN actual_format varchar(20),
  ADD COLUMN actual_format_version varchar(96),
  ADD COLUMN actual_format_digest char(64),
  ADD CONSTRAINT problem_actual_format_check CHECK (
    actual_format IS NULL OR actual_format IN
      ('multiple_choice', 'short_answer', 'descriptive', 'unknown')
  ),
  ADD CONSTRAINT problem_actual_format_complete_check CHECK (
    (actual_format IS NULL AND actual_format_version IS NULL AND actual_format_digest IS NULL)
    OR (actual_format IS NOT NULL AND actual_format_version IS NOT NULL
      AND length(actual_format_version) > 0 AND actual_format_digest IS NOT NULL
      AND actual_format_digest ~ '^[a-f0-9]{64}$')
  );
-- statement
CREATE FUNCTION public.invalidate_problem_actual_format()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF ROW(OLD.content, OLD.answer, OLD.question_type, OLD.problem_type, OLD.family_key,
         to_jsonb(OLD)->'question_group_key')
    IS DISTINCT FROM
     ROW(NEW.content, NEW.answer, NEW.question_type, NEW.problem_type, NEW.family_key,
         to_jsonb(NEW)->'question_group_key') THEN
    NEW.actual_format := NULL;
    NEW.actual_format_version := NULL;
    NEW.actual_format_digest := NULL;
  END IF;
  RETURN NEW;
END;
$$;
-- statement
REVOKE ALL ON FUNCTION public.invalidate_problem_actual_format() FROM PUBLIC;
-- statement
-- PostgreSQL orders same-event triggers by name. Run AFTER problem_question_group_invalidate,
-- including when it clears a proof because e.g. solution changed. UPDATE OF would miss that.
-- to_jsonb also permits the historical Prisma-only migration chain (before the Supabase proof DDL).
CREATE TRIGGER problem_zz_actual_format_invalidate
BEFORE UPDATE ON public.problem FOR EACH ROW
EXECUTE FUNCTION public.invalidate_problem_actual_format();
-- statement
CREATE INDEX problem_pool_actual_format_id_idx ON public.problem (pool, actual_format, id);
-- statement
CREATE INDEX problem_pool_unit_actual_format_code_id_idx
  ON public.problem (pool, unit_id, actual_format, problem_code, id);
-- statement
CREATE INDEX problem_pool_material_actual_format_number_id_idx
  ON public.problem (pool, source_material_id, actual_format, question_number, id);
