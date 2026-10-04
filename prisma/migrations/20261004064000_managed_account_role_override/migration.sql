-- Superadmin-selected account type is local policy. Branch and source identity
-- are still owned by the managed binding, and source revocation still wins.
ALTER TABLE public.eywa_managed_account
  ADD COLUMN branch_role_override public.branch_role;

CREATE OR REPLACE FUNCTION eywa_user_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE managed record; effective_role public.branch_role;
BEGIN
 SELECT m.*, b.enabled, b.healthy, b.mode, b.retired_at, b.target_branch_id INTO managed
 FROM public.eywa_managed_account m JOIN public.eywa_binding b ON b.id=m.binding_id
 WHERE m.current_user_id=NEW.id;
 IF FOUND THEN
   effective_role := COALESCE(managed.branch_role_override, 'teacher'::public.branch_role);
   IF NEW.is_super_admin
      OR NEW.is_admin IS DISTINCT FROM (effective_role IN ('owner','manager'))
      OR NEW.branch_role IS DISTINCT FROM effective_role
      OR NEW.branch_id IS DISTINCT FROM managed.target_branch_id THEN
     RAISE EXCEPTION 'managed_account_privilege_or_branch_change' USING ERRCODE='23514';
   END IF;
   IF NEW.eywa_user_id IS DISTINCT FROM managed.source_user_id THEN
     RAISE EXCEPTION 'managed_account_unlink_forbidden' USING ERRCODE='23514';
   END IF;
   NEW.suspended_at := COALESCE(NEW.manual_suspended_at,
     CASE WHEN cardinality(managed.block_reasons)>0 OR NOT managed.enabled OR NOT managed.healthy OR managed.mode<>'active' OR managed.retired_at IS NOT NULL
          THEN COALESCE(OLD.suspended_at,clock_timestamp()) ELSE NULL END);
 ELSE
   IF NEW.manual_suspended_at IS NOT DISTINCT FROM OLD.manual_suspended_at AND NEW.suspended_at IS DISTINCT FROM OLD.suspended_at THEN
     NEW.manual_suspended_at := NEW.suspended_at;
   END IF;
   NEW.suspended_at := NEW.manual_suspended_at;
 END IF;
 IF OLD.auth_source='eywa' AND NEW.auth_source<>'eywa' THEN
   RAISE EXCEPTION 'managed_auth_source_change_forbidden' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION eywa_user_guard() FROM PUBLIC;
