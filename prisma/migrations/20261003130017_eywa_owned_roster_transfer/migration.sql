-- Explicit teacher migration moves only that teacher's unbound local roster.
-- Ordinary branch edits and all English-exam branch edits remain forbidden.
CREATE OR REPLACE FUNCTION eywa_class_branch_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE teacher uuid; binding uuid; target uuid; origin uuid;
BEGIN
 IF OLD.branch_id IS NOT NULL AND NEW.branch_id IS DISTINCT FROM OLD.branch_id THEN
   teacher := nullif(current_setting('eywa.roster_transfer_user',true),'')::uuid;
   binding := nullif(current_setting('eywa.roster_transfer_binding',true),'')::uuid;
   origin := nullif(current_setting('eywa.roster_transfer_from',true),'')::uuid;
   SELECT b.target_branch_id INTO target
   FROM public.eywa_managed_account m
   JOIN public.eywa_binding b ON b.id=m.binding_id
   JOIN public."user" u ON u.id=m.current_user_id
   WHERE m.binding_id=binding AND m.current_user_id=teacher
     AND m.status='confirmed' AND m.ended_at IS NULL
     AND m.current_user_id=m.user_id AND m.current_source_user_id=m.source_user_id
     AND u.eywa_user_id=m.source_user_id AND u.branch_id=b.target_branch_id
     AND u.branch_role='teacher' AND NOT u.is_admin AND NOT u.is_super_admin
     AND u.deleted_at IS NULL AND u.manual_suspended_at IS NULL AND u.suspended_at IS NULL
     AND u.approval_status='approved' AND cardinality(m.block_reasons)=0
     AND b.mode='active' AND b.enabled AND b.healthy AND b.retired_at IS NULL
     AND m.lease_expires_at>(statement_timestamp() AT TIME ZONE 'UTC')
     AND b.lease_expires_at>(statement_timestamp() AT TIME ZONE 'UTC');
   IF target IS NOT NULL AND NEW.branch_id=target AND OLD.branch_id=origin
      AND TG_TABLE_NAME IN ('class','student')
      AND (to_jsonb(NEW)-'branch_id'-'updated_at') IS NOT DISTINCT FROM
          (to_jsonb(OLD)-'branch_id'-'updated_at') THEN
     IF TG_TABLE_NAME='class' THEN
       IF OLD.user_id=teacher AND OLD.eywa_binding_id IS NULL
          AND NOT EXISTS(SELECT 1 FROM public.class_membership WHERE class_id=OLD.id)
          AND NOT EXISTS(SELECT 1 FROM public.student_enrollment WHERE class_id=OLD.id)
          AND NOT EXISTS(SELECT 1 FROM public.student s WHERE s.class_id=OLD.id AND
            (s.eywa_binding_id IS NOT NULL OR s.branch_id IS DISTINCT FROM origin OR
             EXISTS(SELECT 1 FROM public.student_enrollment e WHERE e.student_id=s.id)))
       THEN RETURN NEW; END IF;
     ELSIF TG_TABLE_NAME='student' THEN
       IF OLD.eywa_binding_id IS NULL
          AND NOT EXISTS(SELECT 1 FROM public.student_enrollment WHERE student_id=OLD.id)
          AND EXISTS(SELECT 1 FROM public.class c WHERE c.id=OLD.class_id
            AND c.user_id=teacher AND c.branch_id=target AND c.eywa_binding_id IS NULL)
       THEN RETURN NEW; END IF;
     END IF;
   END IF;
   RAISE EXCEPTION 'operational_branch_is_immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION eywa_class_branch_guard() FROM PUBLIC;

CREATE OR REPLACE FUNCTION eywa_transfer_owned_roster(p_user uuid,p_binding uuid,p_from uuid)
RETURNS TABLE(classes integer,students integer,held_classes integer)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE target uuid; c record; changed integer;
BEGIN
 classes:=0; students:=0; held_classes:=0;
 SELECT b.target_branch_id INTO target
 FROM public.eywa_managed_account m
 JOIN public.eywa_binding b ON b.id=m.binding_id
 JOIN public."user" u ON u.id=m.current_user_id
 WHERE m.binding_id=p_binding AND m.current_user_id=p_user
   AND m.status='confirmed' AND m.ended_at IS NULL
   AND m.current_user_id=m.user_id AND m.current_source_user_id=m.source_user_id
   AND u.eywa_user_id=m.source_user_id AND u.branch_id=b.target_branch_id
   AND u.branch_role='teacher' AND NOT u.is_admin AND NOT u.is_super_admin
   AND u.deleted_at IS NULL AND u.manual_suspended_at IS NULL AND u.suspended_at IS NULL
   AND u.approval_status='approved' AND cardinality(m.block_reasons)=0
   AND b.mode='active' AND b.enabled AND b.healthy AND b.retired_at IS NULL
   AND m.lease_expires_at>(statement_timestamp() AT TIME ZONE 'UTC')
   AND b.lease_expires_at>(statement_timestamp() AT TIME ZONE 'UTC')
 FOR UPDATE OF u,m,b;
 IF target IS NULL THEN RAISE EXCEPTION 'managed_roster_transfer_denied' USING ERRCODE='23514'; END IF;
 IF target IS NOT DISTINCT FROM p_from THEN RETURN NEXT; RETURN; END IF;
 PERFORM set_config('eywa.roster_transfer_user',p_user::text,true);
 PERFORM set_config('eywa.roster_transfer_binding',p_binding::text,true);
 PERFORM set_config('eywa.roster_transfer_from',coalesce(p_from::text,''),true);
 FOR c IN SELECT id FROM public.class
   WHERE user_id=p_user AND eywa_binding_id IS NULL AND branch_id IS NOT DISTINCT FROM p_from
   ORDER BY id FOR UPDATE
 LOOP
   -- Lock students as well: concurrent enrollment inserts need the parent FK lock.
   PERFORM id FROM public.student WHERE class_id=c.id ORDER BY id FOR UPDATE;
   IF EXISTS(SELECT 1 FROM public.class_membership WHERE class_id=c.id)
      OR EXISTS(SELECT 1 FROM public.student_enrollment WHERE class_id=c.id)
      OR EXISTS(SELECT 1 FROM public.student s WHERE s.class_id=c.id AND
        (s.eywa_binding_id IS NOT NULL OR s.branch_id IS DISTINCT FROM p_from OR
         EXISTS(SELECT 1 FROM public.student_enrollment e WHERE e.student_id=s.id))) THEN
     held_classes:=held_classes+1;
     CONTINUE;
   END IF;
   UPDATE public.class SET branch_id=target WHERE id=c.id;
   classes:=classes+1;
   UPDATE public.student SET branch_id=target WHERE class_id=c.id;
   GET DIAGNOSTICS changed=ROW_COUNT;
   students:=students+changed;
 END LOOP;
 PERFORM set_config('eywa.roster_transfer_user','',true);
 PERFORM set_config('eywa.roster_transfer_binding','',true);
 PERFORM set_config('eywa.roster_transfer_from','',true);
 RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION eywa_transfer_owned_roster(uuid,uuid,uuid) FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
     EXECUTE format('REVOKE ALL ON FUNCTION public.eywa_transfer_owned_roster(uuid,uuid,uuid) FROM %I',r);
   END IF;
 END LOOP;
END $$;
