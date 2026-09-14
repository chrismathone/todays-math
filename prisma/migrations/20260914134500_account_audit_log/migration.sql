CREATE TABLE "account_audit_log" (
  "id" UUID NOT NULL,
  "user_id" UUID REFERENCES "user"("id") ON DELETE SET NULL,
  "actor_id" UUID REFERENCES "user"("id") ON DELETE SET NULL,
  "action" VARCHAR(100) NOT NULL,
  "outcome" VARCHAR(20) NOT NULL,
  "details" JSONB NOT NULL DEFAULT '{}',
  "event_id" VARCHAR(120),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "account_audit_log_event_id_key" ON "account_audit_log"("event_id");
CREATE INDEX "account_audit_log_user_id_created_at_idx" ON "account_audit_log"("user_id", "created_at");
CREATE INDEX "account_audit_log_actor_id_created_at_idx" ON "account_audit_log"("actor_id", "created_at");
ALTER TABLE "account_audit_log" ENABLE ROW LEVEL SECURITY;
