-- Additive only. Gate 2 approval is required before running on a shared database.
-- A non-null key may only be written by the protected backfill operator or the
-- loader after actual strict pair proof. Direct SQL does not constitute proof.
SET lock_timeout = '3s';
SET statement_timeout = '30s';

ALTER TABLE public.problem ADD COLUMN question_group_key text;
CREATE INDEX problem_question_group_key_idx ON public.problem (question_group_key);
CREATE INDEX problem_unit_id_question_group_key_idx ON public.problem (unit_id, question_group_key);

CREATE FUNCTION public.invalidate_problem_question_group_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF ROW(OLD.unit_id, OLD.source, OLD.family_key, OLD.difficulty,
    OLD.problem_type, OLD.origin_problem_id, OLD.source_material_id,
    OLD.content, OLD.answer, OLD.solution, OLD.figure_svg, OLD.figure_urls,
    OLD.figure_dims, OLD.figure_source_mm, OLD.choice_figure_index,
    OLD.figure_source, OLD.external_id, OLD.question_type)
    IS DISTINCT FROM
    ROW(NEW.unit_id, NEW.source, NEW.family_key, NEW.difficulty,
    NEW.problem_type, NEW.origin_problem_id, NEW.source_material_id,
    NEW.content, NEW.answer, NEW.solution, NEW.figure_svg, NEW.figure_urls,
    NEW.figure_dims, NEW.figure_source_mm, NEW.choice_figure_index,
    NEW.figure_source, NEW.external_id, NEW.question_type)
  THEN
    NEW.question_group_key := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.invalidate_problem_question_group_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invalidate_problem_question_group_key() FROM anon, authenticated;
CREATE TRIGGER problem_question_group_invalidate
BEFORE UPDATE ON public.problem
FOR EACH ROW EXECUTE FUNCTION public.invalidate_problem_question_group_key();

RESET lock_timeout;
RESET statement_timeout;
