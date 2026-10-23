-- CreateTable
CREATE TABLE "ontology_proposal" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "branch_id" UUID,
    "action_id" VARCHAR(80) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "arguments_canonical" TEXT NOT NULL,
    "evidence_canonical" TEXT NOT NULL,
    "source_canonical" TEXT NOT NULL,
    "preview_canonical" TEXT NOT NULL,
    "binding_canonical" TEXT NOT NULL,
    "seal_hash" VARCHAR(71) NOT NULL,
    "authorization_stamp" VARCHAR(71) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ontology_proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ontology_approval" (
    "id" UUID NOT NULL,
    "proposal_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "seal_hash" VARCHAR(71) NOT NULL,
    "approved_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),

    CONSTRAINT "ontology_approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ontology_receipt" (
    "id" UUID NOT NULL,
    "proposal_id" UUID NOT NULL,
    "approval_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "result_canonical" TEXT NOT NULL,
    "result_hash" VARCHAR(71) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ontology_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ontology_audit" (
    "id" UUID NOT NULL,
    "receipt_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "event" VARCHAR(80) NOT NULL,
    "detail_canonical" TEXT NOT NULL,
    "detail_hash" VARCHAR(71) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ontology_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ontology_outbox" (
    "id" UUID NOT NULL,
    "receipt_id" UUID NOT NULL,
    "topic" VARCHAR(80) NOT NULL,
    "body_canonical" TEXT NOT NULL,
    "body_hash" VARCHAR(71) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
    "lease_generation" INTEGER NOT NULL DEFAULT 0,
    "lease_until" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL,
    "delivered_at" TIMESTAMP(3),
    "last_error_code" VARCHAR(80),

    CONSTRAINT "ontology_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ontology_feedback" (
    "id" UUID NOT NULL,
    "receipt_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "source_snapshot_id" VARCHAR(512) NOT NULL,
    "observation_canonical" TEXT NOT NULL,
    "observation_hash" VARCHAR(71) NOT NULL,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ontology_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ontology_relation_review" (
    "id" UUID NOT NULL,
    "scope_key" VARCHAR(200) NOT NULL,
    "assertion_id" TEXT NOT NULL,
    "assertion_canonical" TEXT NOT NULL,
    "assertion_hash" VARCHAR(71) NOT NULL,
    "state" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "proposed_by" UUID NOT NULL,
    "reviewer_id" UUID,
    "validation_canonical" TEXT,
    "validation_hash" VARCHAR(71),
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ontology_relation_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ontology_compile_job" (
    "id" UUID NOT NULL,
    "scope_key" VARCHAR(200) NOT NULL,
    "requested_by" UUID NOT NULL,
    "input_canonical" TEXT NOT NULL,
    "input_manifest_hash" VARCHAR(71) NOT NULL,
    "approved_review_state_hash" VARCHAR(71) NOT NULL,
    "expected_active_generation" INTEGER NOT NULL,
    "engine_lock_hash" VARCHAR(71) NOT NULL,
    "state" VARCHAR(20) NOT NULL DEFAULT 'queued',
    "lease_generation" INTEGER NOT NULL DEFAULT 0,
    "lease_until" TIMESTAMP(3),
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "result_canonical" TEXT,
    "result_hash" VARCHAR(71),
    "last_error_code" VARCHAR(80),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ontology_compile_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ontology_release" (
    "graph_version" VARCHAR(512) NOT NULL,
    "scope_key" VARCHAR(200) NOT NULL,
    "job_id" UUID NOT NULL,
    "identity_canonical" TEXT NOT NULL,
    "artifact_canonical" TEXT NOT NULL,
    "artifact_hash" VARCHAR(71) NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "ontology_release_pkey" PRIMARY KEY ("graph_version")
);

-- CreateTable
CREATE TABLE "ontology_active_graph" (
    "scope_key" VARCHAR(200) NOT NULL,
    "graph_version" VARCHAR(512),
    "generation" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ontology_active_graph_pkey" PRIMARY KEY ("scope_key")
);

-- CreateTable
CREATE TABLE "ontology_artifact_chunk" (
    "job_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "scope_key" VARCHAR(200) NOT NULL,
    "input_hash" VARCHAR(71) NOT NULL,
    "lease_generation" INTEGER NOT NULL,
    "chunk_count" INTEGER NOT NULL,
    "total_bytes" INTEGER NOT NULL,
    "gzip_hash" VARCHAR(71) NOT NULL,
    "chunk_hash" VARCHAR(71) NOT NULL,
    "bytes" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ontology_artifact_chunk_pkey" PRIMARY KEY ("job_id","lease_generation","chunk_index")
);

-- CreateTable
CREATE TABLE "ontology_source_authority_decision" (
    "id" UUID NOT NULL,
    "scope_key" VARCHAR(200) NOT NULL,
    "source_manifest_hash" VARCHAR(71) NOT NULL,
    "decision_canonical" TEXT NOT NULL,
    "decision_hash" VARCHAR(71) NOT NULL,
    "approved_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "ontology_source_authority_decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ontology_review_event" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "scope_key" VARCHAR(200) NOT NULL,
    "subject_id" VARCHAR(512) NOT NULL,
    "event" VARCHAR(80) NOT NULL,
    "detail_canonical" TEXT NOT NULL,
    "detail_hash" VARCHAR(71) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ontology_review_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ontology_evidence_snapshot" (
    "id" VARCHAR(512) NOT NULL,
    "actor_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "branch_id" UUID,
    "graph_version" VARCHAR(512) NOT NULL,
    "student_revision" INTEGER NOT NULL,
    "source_canonical" TEXT NOT NULL,
    "source_hash" VARCHAR(71) NOT NULL,
    "evidence_canonical" TEXT NOT NULL,
    "evidence_hash" VARCHAR(71) NOT NULL,
    "query_canonical" TEXT NOT NULL,
    "query_hash" VARCHAR(71) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ontology_evidence_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ontology_proposal_actor_id_student_id_created_at_idx" ON "ontology_proposal"("actor_id", "student_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ontology_approval_proposal_id_key" ON "ontology_approval"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "ontology_receipt_proposal_id_key" ON "ontology_receipt"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "ontology_receipt_approval_id_key" ON "ontology_receipt"("approval_id");

-- CreateIndex
CREATE UNIQUE INDEX "ontology_audit_receipt_id_key" ON "ontology_audit"("receipt_id");

-- CreateIndex
CREATE UNIQUE INDEX "ontology_outbox_receipt_id_key" ON "ontology_outbox"("receipt_id");

-- CreateIndex
CREATE INDEX "ontology_outbox_status_available_at_idx" ON "ontology_outbox"("status", "available_at");

-- CreateIndex
CREATE UNIQUE INDEX "ontology_feedback_receipt_id_observation_hash_key" ON "ontology_feedback"("receipt_id", "observation_hash");

-- CreateIndex
CREATE INDEX "ontology_relation_review_scope_key_state_created_at_idx" ON "ontology_relation_review"("scope_key", "state", "created_at");

-- CreateIndex
CREATE INDEX "ontology_compile_job_scope_key_state_created_at_idx" ON "ontology_compile_job"("scope_key", "state", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ontology_release_job_id_key" ON "ontology_release"("job_id");

-- CreateIndex
CREATE INDEX "ontology_release_scope_key_published_at_idx" ON "ontology_release"("scope_key", "published_at");

-- CreateIndex
CREATE INDEX "ontology_artifact_chunk_scope_key_gzip_hash_idx" ON "ontology_artifact_chunk"("scope_key", "gzip_hash");

-- CreateIndex
CREATE INDEX "ontology_source_authority_decision_scope_key_source_manifes_idx" ON "ontology_source_authority_decision"("scope_key", "source_manifest_hash");

-- CreateIndex
CREATE INDEX "ontology_review_event_scope_key_subject_id_created_at_idx" ON "ontology_review_event"("scope_key", "subject_id", "created_at");

-- CreateIndex
CREATE INDEX "ontology_evidence_snapshot_actor_id_student_id_created_at_idx" ON "ontology_evidence_snapshot"("actor_id", "student_id", "created_at");

-- AddForeignKey
ALTER TABLE "ontology_approval" ADD CONSTRAINT "ontology_approval_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "ontology_proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ontology_receipt" ADD CONSTRAINT "ontology_receipt_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "ontology_proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ontology_receipt" ADD CONSTRAINT "ontology_receipt_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "ontology_approval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ontology_audit" ADD CONSTRAINT "ontology_audit_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "ontology_receipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ontology_outbox" ADD CONSTRAINT "ontology_outbox_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "ontology_receipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ontology_feedback" ADD CONSTRAINT "ontology_feedback_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "ontology_receipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- DRAFT ONLY. No browser role may access private operation bindings.
DO $$ DECLARE t text; role_name text; BEGIN
  FOREACH t IN ARRAY ARRAY['ontology_proposal','ontology_approval','ontology_receipt','ontology_audit','ontology_outbox','ontology_feedback','ontology_relation_review','ontology_compile_job','ontology_release','ontology_active_graph'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM PUBLIC', t);
    FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', t, role_name);
      END IF;
    END LOOP;
  END LOOP;
END $$;
ALTER TABLE ontology_proposal ADD CONSTRAINT ontology_proposal_status_check CHECK(status IN ('draft','approved','executed','rejected','expired'));
ALTER TABLE ontology_proposal ADD CONSTRAINT ontology_proposal_expiry_check CHECK(expires_at > created_at);
ALTER TABLE ontology_proposal ADD CONSTRAINT ontology_proposal_action_check CHECK(action_id = 'course.plan.set/v1');
ALTER TABLE ontology_outbox ADD CONSTRAINT ontology_outbox_status_check CHECK(status IN ('queued','leased','delivered','failed'));
ALTER TABLE ontology_outbox ADD CONSTRAINT ontology_outbox_attempt_check CHECK(attempts >= 0 AND lease_generation >= 0);
ALTER TABLE ontology_relation_review ADD CONSTRAINT ontology_relation_review_state_check CHECK(state IN ('draft','validated','approved','rejected','retired'));
ALTER TABLE ontology_relation_review ADD CONSTRAINT ontology_relation_review_approval_check CHECK(state != 'approved' OR (reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL AND validation_hash IS NOT NULL));
ALTER TABLE ontology_compile_job ADD CONSTRAINT ontology_compile_job_state_check CHECK(state IN ('queued','leased','ready','published','stale','failed'));
ALTER TABLE ontology_compile_job ADD CONSTRAINT ontology_compile_job_generation_check CHECK(lease_generation >= 0 AND attempt >= 0 AND expected_active_generation >= 0);
ALTER TABLE ontology_active_graph ADD CONSTRAINT ontology_active_graph_generation_check CHECK(generation >= 0);

CREATE FUNCTION ontology_immutable_proposal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status') THEN
    RAISE EXCEPTION 'ontology immutable proposal binding';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ontology_proposal_immutable BEFORE UPDATE ON ontology_proposal FOR EACH ROW EXECUTE FUNCTION ontology_immutable_proposal();
CREATE FUNCTION ontology_immutable_record() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  RAISE EXCEPTION 'ontology immutable record';
END $$;
CREATE TRIGGER ontology_receipt_immutable BEFORE UPDATE OR DELETE ON ontology_receipt FOR EACH ROW EXECUTE FUNCTION ontology_immutable_record();
CREATE TRIGGER ontology_audit_immutable BEFORE UPDATE OR DELETE ON ontology_audit FOR EACH ROW EXECUTE FUNCTION ontology_immutable_record();
CREATE TRIGGER ontology_feedback_immutable BEFORE UPDATE OR DELETE ON ontology_feedback FOR EACH ROW EXECUTE FUNCTION ontology_immutable_record();
CREATE TRIGGER ontology_release_immutable BEFORE DELETE ON ontology_release FOR EACH ROW EXECUTE FUNCTION ontology_immutable_record();
ALTER TABLE ontology_artifact_chunk ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE ontology_artifact_chunk FROM PUBLIC;
DO $$ DECLARE r text; BEGIN FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON TABLE ontology_artifact_chunk FROM %I',r); END IF;
END LOOP; END $$;
ALTER TABLE ontology_artifact_chunk ADD CONSTRAINT ontology_chunk_bounds_check CHECK(chunk_index >= 0 AND chunk_count > 0 AND chunk_index < chunk_count AND chunk_count <= 512 AND total_bytes > 0 AND total_bytes <= 268435456 AND lease_generation > 0 AND octet_length(bytes) <= 524288);
ALTER TABLE ontology_artifact_chunk ADD CONSTRAINT ontology_chunk_job_fk FOREIGN KEY(job_id) REFERENCES ontology_compile_job(id) ON DELETE RESTRICT;
CREATE FUNCTION ontology_immutable_release() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (to_jsonb(NEW)-'revoked_at') IS DISTINCT FROM (to_jsonb(OLD)-'revoked_at') THEN RAISE EXCEPTION 'ontology immutable release'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER ontology_release_binding_immutable BEFORE UPDATE ON ontology_release FOR EACH ROW EXECUTE FUNCTION ontology_immutable_release();
DO $$ DECLARE t text; r text; BEGIN FOREACH t IN ARRAY ARRAY['ontology_source_authority_decision','ontology_review_event'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t); EXECUTE format('REVOKE ALL ON TABLE %I FROM PUBLIC',t);
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON TABLE %I FROM %I',t,r); END IF; END LOOP;
END LOOP; END $$;
CREATE TRIGGER ontology_review_event_immutable BEFORE UPDATE OR DELETE ON ontology_review_event FOR EACH ROW EXECUTE FUNCTION ontology_immutable_record();
CREATE TRIGGER ontology_source_decision_binding_immutable BEFORE UPDATE ON ontology_source_authority_decision FOR EACH ROW EXECUTE FUNCTION ontology_immutable_release();
ALTER TABLE ontology_evidence_snapshot ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE ontology_evidence_snapshot FROM PUBLIC;
DO $$ DECLARE r text; BEGIN FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON TABLE ontology_evidence_snapshot FROM %I',r); END IF;
END LOOP; END $$;
CREATE TRIGGER ontology_evidence_snapshot_immutable BEFORE UPDATE ON ontology_evidence_snapshot FOR EACH ROW EXECUTE FUNCTION ontology_immutable_record();
