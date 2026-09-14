CREATE TYPE "account_approval" AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE "user"
  ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "approval_status" "account_approval" NOT NULL DEFAULT 'approved',
  ADD COLUMN "disabled_menus" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "user" ADD CONSTRAINT "user_disabled_menus_valid"
  CHECK ("disabled_menus" <@ ARRAY['home','bank','studio','export','library','teaching']::TEXT[]);

CREATE TABLE "workspace_document" (
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "id" VARCHAR(100) NOT NULL,
  "kind" VARCHAR(20) NOT NULL CHECK ("kind" IN ('draft', 'extraction')),
  "title" VARCHAR(200) NOT NULL,
  "payload" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("user_id", "id")
);
CREATE INDEX "workspace_document_user_id_kind_updated_at_idx"
  ON "workspace_document"("user_id", "kind", "updated_at");

CREATE TABLE "workspace_asset" (
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "id" VARCHAR(100) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "bytes" BYTEA NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("user_id", "id")
);

-- Browser clients never query these tables directly. Authenticated server routes
-- use the existing database service connection and an explicit owner predicate.
ALTER TABLE "workspace_document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_asset" ENABLE ROW LEVEL SECURITY;
