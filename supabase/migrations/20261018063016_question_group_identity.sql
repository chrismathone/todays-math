-- Additive only. Gate 2 approval is required before running on a shared database.
-- A non-null key may only be written by the protected backfill operator or the
-- loader after actual strict pair proof. Direct SQL does not constitute proof.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.problem ADD COLUMN question_group_key text;

-- The reviewed live catalog has direct, non-grantable INSERT/UPDATE from the
-- table owner to anon/authenticated, no PUBLIC table grant, and no RLS policy.
-- Table-wide grants would automatically expose the new proof certificate.
-- Convert ONLY those two direct write grants to the exact pre-existing columns.
-- SELECT/DELETE/other privileges, service_role, owner, RLS and policies stay as-is.
-- Unexpected grantors/grant options or inherited/PUBLIC write access abort the
-- complete migration rather than revoking anyone else's privileges.
DO $question_key_acl$
DECLARE
  role_name text;
  privilege_name text;
  old_columns text;
  table_owner oid;
  direct_grants integer;
BEGIN
  SELECT relowner INTO table_owner FROM pg_class WHERE oid='public.problem'::regclass;
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum)
    INTO old_columns FROM pg_attribute
    WHERE attrelid='public.problem'::regclass AND attnum>0 AND NOT attisdropped
      AND attname<>'question_group_key';
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    SELECT count(*) INTO direct_grants
      FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a
      WHERE c.oid='public.problem'::regclass
        AND a.grantee=role_name::regrole
        AND a.grantor=table_owner
        AND a.privilege_type IN ('INSERT','UPDATE') AND NOT a.is_grantable;
    IF direct_grants<>2 THEN
      RAISE EXCEPTION 'Question key ACL preflight changed for %; obtain a new catalog review', role_name;
    END IF;
    EXECUTE format('REVOKE INSERT, UPDATE ON TABLE public.problem FROM %I', role_name);
    EXECUTE format('GRANT INSERT (%s), UPDATE (%s) ON TABLE public.problem TO %I', old_columns,old_columns,role_name);
    FOREACH privilege_name IN ARRAY ARRAY['INSERT','UPDATE'] LOOP
      IF has_column_privilege(role_name,'public.problem','question_group_key',privilege_name) THEN
        RAISE EXCEPTION 'Question key remains writable by % via PUBLIC/inherited ACL; obtain a new catalog review',role_name;
      END IF;
      IF EXISTS(SELECT 1 FROM pg_attribute a
        WHERE a.attrelid='public.problem'::regclass AND a.attnum>0 AND NOT a.attisdropped
          AND a.attname<>'question_group_key'
          AND NOT has_column_privilege(role_name,'public.problem',a.attname,privilege_name)) THEN
        RAISE EXCEPTION 'Existing column write access changed for %',role_name;
      END IF;
    END LOOP;
  END LOOP;
END;
$question_key_acl$;
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

COMMIT;
