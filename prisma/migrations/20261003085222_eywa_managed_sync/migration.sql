-- DropForeignKey
ALTER TABLE "class" DROP CONSTRAINT "class_user_id_fkey";

-- DropIndex
DROP INDEX "progress_plan_student_id_key";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "auth_source" VARCHAR(20) NOT NULL DEFAULT 'local',
ADD COLUMN     "manual_suspended_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "class" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "branch_id" UUID,
ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "eywa_binding_id" UUID,
ADD COLUMN     "permission_revision" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "student" ADD COLUMN     "branch_id" UUID,
ADD COLUMN     "eywa_binding_id" UUID,
ADD COLUMN     "is_test" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source_status" VARCHAR(40);

-- AlterTable
ALTER TABLE "progress" ADD COLUMN     "retired_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "english_exam" ADD COLUMN     "branch_id" UUID;

-- CreateTable
CREATE TABLE "eywa_binding" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "target_branch_id" UUID NOT NULL,
    "auto_provisioned_branch" BOOLEAN NOT NULL DEFAULT false,
    "archive_owner_user_id" UUID,
    "source_epoch" UUID,
    "mode" VARCHAR(10) NOT NULL DEFAULT 'shadow',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "healthy" BOOLEAN NOT NULL DEFAULT false,
    "security_revision" BIGINT NOT NULL DEFAULT 0,
    "tenant_revocation_generation" BIGINT NOT NULL DEFAULT 0,
    "content_generation" BIGINT NOT NULL DEFAULT 0,
    "validated_at" TIMESTAMP(3),
    "lease_expires_at" TIMESTAMP(3),
    "next_effective_at" TIMESTAMP(3),
    "control" JSONB NOT NULL DEFAULT '{}',
    "retired_at" TIMESTAMP(3),
    "lease_token" UUID,
    "lease_until" TIMESTAMP(3),
    "last_error" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eywa_binding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eywa_managed_account" (
    "id" UUID NOT NULL,
    "binding_id" UUID NOT NULL,
    "source_user_id" UUID NOT NULL,
    "user_id" UUID,
    "current_user_id" UUID,
    "current_source_user_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'candidate',
    "source_email" VARCHAR(255) NOT NULL,
    "source_name" VARCHAR(200) NOT NULL,
    "candidate_version" VARCHAR(64),
    "conflict_reason" VARCHAR(100),
    "block_reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_classes" JSONB NOT NULL DEFAULT '[]',
    "source_epoch" UUID,
    "security_revision" BIGINT NOT NULL DEFAULT 0,
    "account_revocation_generation" BIGINT NOT NULL DEFAULT 0,
    "tenant_revocation_generation" BIGINT NOT NULL DEFAULT 0,
    "class_list_revision" BIGINT NOT NULL DEFAULT 0,
    "lease_expires_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" UUID,
    "confirmation_method" VARCHAR(30),
    "confirmation_evidence" VARCHAR(1000),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eywa_managed_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eywa_inbox" (
    "event_id" UUID NOT NULL,
    "binding_id" UUID NOT NULL,
    "body_hash" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'received',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "retry_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_token" UUID,
    "lease_until" TIMESTAMP(3),
    "error_code" VARCHAR(100),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "eywa_inbox_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "eywa_nonce" (
    "binding_id" UUID NOT NULL,
    "nonce" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eywa_nonce_pkey" PRIMARY KEY ("binding_id","nonce")
);

-- CreateTable
CREATE TABLE "eywa_sso_use" (
    "jti" UUID NOT NULL,
    "binding_id" UUID NOT NULL,
    "source_user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eywa_sso_use_pkey" PRIMARY KEY ("jti")
);

-- CreateTable
CREATE TABLE "eywa_sso_handoff" (
    "id" VARCHAR(64) NOT NULL,
    "binding_id" UUID NOT NULL,
    "state_hash" VARCHAR(64) NOT NULL,
    "verifier_hash" VARCHAR(64) NOT NULL,
    "assertion" TEXT,
    "key_id" VARCHAR(100),
    "source_user_id" UUID,
    "source_name" VARCHAR(200),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),

    CONSTRAINT "eywa_sso_handoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_membership" (
    "id" UUID NOT NULL,
    "binding_id" UUID NOT NULL,
    "source_id" VARCHAR(300) NOT NULL,
    "class_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source_user_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "starts_on" DATE,
    "ends_on" DATE,
    "revoked_at" TIMESTAMP(3),
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "class_membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_enrollment" (
    "eywa_last_report_date" DATE,
    "eywa_last_report_text" TEXT,
    "id" UUID NOT NULL,
    "binding_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "on_hold" BOOLEAN NOT NULL DEFAULT false,
    "is_transferred" BOOLEAN NOT NULL DEFAULT false,
    "attendance_days" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "student_enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "eywa_binding_tenant_id_key" ON "eywa_binding"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "eywa_binding_target_branch_id_key" ON "eywa_binding"("target_branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "eywa_managed_account_current_user_id_key" ON "eywa_managed_account"("current_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "eywa_managed_account_current_source_user_id_key" ON "eywa_managed_account"("current_source_user_id");

-- CreateIndex
CREATE INDEX "eywa_managed_account_binding_id_source_user_id_status_idx" ON "eywa_managed_account"("binding_id", "source_user_id", "status");

-- CreateIndex
CREATE INDEX "eywa_inbox_binding_id_status_retry_at_idx" ON "eywa_inbox"("binding_id", "status", "retry_at");

-- CreateIndex
CREATE INDEX "eywa_nonce_expires_at_idx" ON "eywa_nonce"("expires_at");

-- CreateIndex
CREATE INDEX "eywa_sso_use_expires_at_idx" ON "eywa_sso_use"("expires_at");

-- CreateIndex
CREATE INDEX "eywa_sso_handoff_expires_at_idx" ON "eywa_sso_handoff"("expires_at");

-- CreateIndex
CREATE INDEX "class_membership_user_id_class_id_idx" ON "class_membership"("user_id", "class_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_membership_binding_id_source_id_key" ON "class_membership"("binding_id", "source_id");

-- CreateIndex
CREATE INDEX "student_enrollment_student_id_class_id_idx" ON "student_enrollment"("student_id", "class_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_enrollment_binding_id_source_id_key" ON "student_enrollment"("binding_id", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "progress_plan_class_id_student_id_key" ON "progress_plan"("class_id", "student_id");

-- AddForeignKey
ALTER TABLE "class" ADD CONSTRAINT "class_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eywa_managed_account" ADD CONSTRAINT "eywa_managed_account_binding_id_fkey" FOREIGN KEY ("binding_id") REFERENCES "eywa_binding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eywa_managed_account" ADD CONSTRAINT "eywa_managed_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eywa_inbox" ADD CONSTRAINT "eywa_inbox_binding_id_fkey" FOREIGN KEY ("binding_id") REFERENCES "eywa_binding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_membership" ADD CONSTRAINT "class_membership_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_membership" ADD CONSTRAINT "class_membership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollment" ADD CONSTRAINT "student_enrollment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollment" ADD CONSTRAINT "student_enrollment_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Preserve manual suspensions and freeze historical branch attribution before any transfer.
UPDATE "user" SET manual_suspended_at = suspended_at WHERE suspended_at IS NOT NULL;
UPDATE class c SET branch_id = u.branch_id FROM "user" u WHERE c.user_id = u.id AND c.branch_id IS NULL;
UPDATE student s SET branch_id = c.branch_id FROM class c WHERE s.class_id = c.id AND s.branch_id IS NULL;

ALTER TABLE eywa_binding ADD CONSTRAINT eywa_binding_mode CHECK (mode IN ('shadow','active'));
ALTER TABLE eywa_binding ADD CONSTRAINT eywa_binding_branch_fk FOREIGN KEY (target_branch_id) REFERENCES branch(id) ON DELETE RESTRICT;
ALTER TABLE eywa_binding ADD CONSTRAINT eywa_binding_archive_owner_fk FOREIGN KEY (archive_owner_user_id) REFERENCES "user"(id) ON DELETE RESTRICT;
ALTER TABLE eywa_managed_account ADD CONSTRAINT eywa_managed_status CHECK (status IN ('candidate','confirmed','conflict','ended'));
ALTER TABLE eywa_managed_account ADD CONSTRAINT eywa_managed_current CHECK (
 (status = 'confirmed' AND current_user_id = user_id AND current_source_user_id = source_user_id AND current_user_id IS NOT NULL AND current_source_user_id IS NOT NULL)
 OR (status <> 'confirmed' AND current_user_id IS NULL AND current_source_user_id IS NULL));
CREATE UNIQUE INDEX eywa_managed_live_source ON eywa_managed_account(binding_id,source_user_id) WHERE status <> 'ended';
ALTER TABLE eywa_inbox ADD CONSTRAINT eywa_inbox_status CHECK (status IN ('received','processing','applied','conflict','superseded'));
ALTER TABLE "user" ADD CONSTRAINT user_auth_source CHECK (auth_source IN ('local','eywa'));
ALTER TABLE "user" ADD CONSTRAINT user_eywa_no_password CHECK (auth_source <> 'eywa' OR password_hash IS NULL);
ALTER TABLE class_membership ADD CONSTRAINT class_membership_binding_fk FOREIGN KEY(binding_id) REFERENCES eywa_binding(id) ON DELETE RESTRICT;
ALTER TABLE student_enrollment ADD CONSTRAINT student_enrollment_binding_fk FOREIGN KEY(binding_id) REFERENCES eywa_binding(id) ON DELETE RESTRICT;
ALTER TABLE class ADD CONSTRAINT class_eywa_binding_fk FOREIGN KEY(eywa_binding_id) REFERENCES eywa_binding(id) ON DELETE RESTRICT;
ALTER TABLE student ADD CONSTRAINT student_eywa_binding_fk FOREIGN KEY(eywa_binding_id) REFERENCES eywa_binding(id) ON DELETE RESTRICT;

CREATE FUNCTION eywa_user_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog,public AS $$
DECLARE managed record;
BEGIN
 SELECT m.*, b.enabled, b.healthy, b.mode, b.retired_at, b.target_branch_id INTO managed
 FROM public.eywa_managed_account m JOIN public.eywa_binding b ON b.id=m.binding_id
 WHERE m.current_user_id=NEW.id;
 IF FOUND THEN
   IF NEW.is_super_admin OR NEW.is_admin OR NEW.branch_role IS DISTINCT FROM 'teacher'::public.branch_role OR NEW.branch_id IS DISTINCT FROM managed.target_branch_id THEN
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
 IF OLD.auth_source='eywa' AND NEW.auth_source<>'eywa' THEN RAISE EXCEPTION 'managed_auth_source_change_forbidden' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION eywa_user_guard() FROM PUBLIC;
CREATE TRIGGER eywa_user_guard BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION eywa_user_guard();

CREATE FUNCTION eywa_class_branch_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.branch_id IS NOT NULL AND NEW.branch_id IS DISTINCT FROM OLD.branch_id THEN
   RAISE EXCEPTION 'operational_branch_is_immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION eywa_class_branch_guard() FROM PUBLIC;
CREATE TRIGGER eywa_class_branch_guard BEFORE UPDATE ON class FOR EACH ROW EXECUTE FUNCTION eywa_class_branch_guard();
CREATE TRIGGER eywa_student_branch_guard BEFORE UPDATE ON student FOR EACH ROW EXECUTE FUNCTION eywa_class_branch_guard();
UPDATE english_exam e SET branch_id = u.branch_id FROM "user" u WHERE e.user_id = u.id AND e.branch_id IS NULL;
CREATE TRIGGER eywa_english_exam_branch_guard BEFORE UPDATE ON english_exam FOR EACH ROW EXECUTE FUNCTION eywa_class_branch_guard();

-- Server Prisma access only. No browser-role policy grants on integration state.
DO $$ DECLARE t text; r text; BEGIN
 FOREACH t IN ARRAY ARRAY['eywa_binding','eywa_managed_account','eywa_inbox','eywa_nonce','eywa_sso_use','eywa_sso_handoff','class_membership','student_enrollment'] LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC',t);
   FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
     IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON public.%I FROM %I',t,r); END IF;
   END LOOP;
 END LOOP;
END $$;
