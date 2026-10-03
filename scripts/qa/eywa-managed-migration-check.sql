-- psql -v baseline_sql=/tmp/target-baseline.sql -v migration_sql=/tmp/target-migration.sql
DO $$ BEGIN IF current_database()<>'eywa_target_migration_test' THEN RAISE EXCEPTION 'fixture database required'; END IF; END $$;
BEGIN;
\i :baseline_sql
INSERT INTO branch(id,name) VALUES ('10000000-0000-4000-8000-000000000001','Historical branch');
INSERT INTO "user"(id,email,name,updated_at,branch_id,suspended_at)
VALUES ('10000000-0000-4000-8000-000000000002','migration-fixture@example.test','Migration Fixture',now(),'10000000-0000-4000-8000-000000000001','2026-09-01T00:00:00Z');
INSERT INTO class(id,user_id,name,grade,difficulty_ratio,updated_at)
VALUES ('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','Historical Class','G7','{}',now());
INSERT INTO student(id,class_id,name,updated_at)
VALUES ('10000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000003','Student Fixture',now());
INSERT INTO english_exam(id,user_id,school,grade,title,updated_at)
VALUES ('10000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000002','Fixture School','G7','Historical Exam',now());
\i :migration_sql
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM "user" WHERE id='10000000-0000-4000-8000-000000000002' AND manual_suspended_at=suspended_at AND manual_suspended_at='2026-09-01T00:00:00Z') THEN RAISE EXCEPTION 'manual suspension not preserved'; END IF;
 IF (SELECT branch_id FROM class WHERE id='10000000-0000-4000-8000-000000000003') IS DISTINCT FROM '10000000-0000-4000-8000-000000000001'::uuid THEN RAISE EXCEPTION 'class branch missing'; END IF;
 IF (SELECT branch_id FROM student WHERE id='10000000-0000-4000-8000-000000000004') IS DISTINCT FROM '10000000-0000-4000-8000-000000000001'::uuid THEN RAISE EXCEPTION 'student branch missing'; END IF;
 IF (SELECT branch_id FROM english_exam WHERE id='10000000-0000-4000-8000-000000000005') IS DISTINCT FROM '10000000-0000-4000-8000-000000000001'::uuid THEN RAISE EXCEPTION 'English branch missing'; END IF;
 BEGIN
   UPDATE class SET branch_id='10000000-0000-4000-8000-000000000099' WHERE id='10000000-0000-4000-8000-000000000003';
   RAISE EXCEPTION 'immutable class guard allowed mutation';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
DO $$ BEGIN IF to_regclass('public.eywa_binding') IS NOT NULL OR to_regclass('public.user') IS NOT NULL THEN RAISE EXCEPTION 'migration rollback failed'; END IF; END $$;
SELECT 'PASS migration backfill, branch freeze and full DDL rollback' AS result;
