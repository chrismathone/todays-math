-- Run only against the disposable receiver fixture, after the migration. Everything rolls back.
BEGIN;
DO $$ DECLARE t text; enabled boolean; BEGIN
  IF current_database() <> 'eywa_target_test' THEN RAISE EXCEPTION 'fixture database required'; END IF;
  FOREACH t IN ARRAY ARRAY['eywa_binding','eywa_managed_account','eywa_inbox','eywa_nonce','eywa_sso_use','eywa_sso_handoff','class_membership','student_enrollment'] LOOP
    SELECT relrowsecurity INTO enabled FROM pg_class WHERE oid=('public.'||t)::regclass;
    IF NOT enabled THEN RAISE EXCEPTION 'RLS missing for %',t; END IF;
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') AND has_table_privilege('anon', 'public.'||t, 'SELECT,INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'anon grant on %',t; END IF;
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') AND has_table_privilege('authenticated', 'public.'||t, 'SELECT,INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'authenticated grant on %',t; END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='eywa_user_guard' AND tgenabled='O') THEN RAISE EXCEPTION 'user suspension guard missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='eywa_class_branch_guard' AND tgenabled='O') THEN RAISE EXCEPTION 'class branch guard missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='eywa_english_exam_branch_guard' AND tgenabled='O') THEN RAISE EXCEPTION 'English branch guard missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='class_user_id_fkey' AND confdeltype='r') THEN RAISE EXCEPTION 'archived class deletion not restricted'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS receiver RLS, grants, triggers, restrict, rollback checks' AS result;
