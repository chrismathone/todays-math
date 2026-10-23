-- DRAFT ONLY: refuse rollback after durable operation/review/publication data exists.
BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM ontology_proposal) OR EXISTS(SELECT 1 FROM ontology_relation_review)
 OR EXISTS(SELECT 1 FROM ontology_compile_job) OR EXISTS(SELECT 1 FROM ontology_source_authority_decision)
 OR EXISTS(SELECT 1 FROM ontology_review_event) OR EXISTS(SELECT 1 FROM ontology_evidence_snapshot)
 OR EXISTS(SELECT 1 FROM ontology_artifact_chunk) OR EXISTS(SELECT 1 FROM ontology_feedback)
 OR EXISTS(SELECT 1 FROM ontology_outbox) OR EXISTS(SELECT 1 FROM ontology_audit)
 OR EXISTS(SELECT 1 FROM ontology_receipt) OR EXISTS(SELECT 1 FROM ontology_approval)
 OR EXISTS(SELECT 1 FROM ontology_release) OR EXISTS(SELECT 1 FROM ontology_active_graph) THEN
   RAISE EXCEPTION 'Export and reconcile ontology records; destructive rollback is not authorized';
 END IF;
END $$;
DROP TABLE ontology_evidence_snapshot;
DROP TABLE ontology_artifact_chunk;
DROP TABLE ontology_feedback;
DROP TABLE ontology_outbox;
DROP TABLE ontology_audit;
DROP TABLE ontology_receipt;
DROP TABLE ontology_approval;
DROP TABLE ontology_proposal;
DROP TABLE ontology_release;
DROP TABLE ontology_active_graph;
DROP TABLE ontology_compile_job;
DROP TABLE ontology_relation_review;
DROP TABLE ontology_source_authority_decision;
DROP TABLE ontology_review_event;
DROP FUNCTION ontology_immutable_proposal();
DROP FUNCTION ontology_immutable_record();
DROP FUNCTION ontology_immutable_release();
COMMIT;
