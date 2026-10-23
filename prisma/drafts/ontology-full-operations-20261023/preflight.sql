-- READ ONLY review input. Does not apply DDL or read student payloads.
BEGIN READ ONLY;
SELECT current_database() AS database_name, current_user AS executor,
       current_setting('server_version') AS postgres_version,
       has_schema_privilege(current_user,'public','CREATE') AS can_create;
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;
SELECT c.relname AS existing_reserved_table, c.relrowsecurity AS rls,
       pg_total_relation_size(c.oid) AS total_bytes
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname LIKE 'ontology_%'
ORDER BY c.relname;
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'ontology_%'
ORDER BY tablename,policyname;
SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name LIKE 'ontology_%'
ORDER BY table_name,grantee,privilege_type;
COMMIT;
