-- Existing and new documents remain private until their author explicitly shares.
ALTER TABLE "workspace_document"
  ADD COLUMN "visibility" VARCHAR(20) NOT NULL DEFAULT 'private',
  ADD COLUMN "shared_branch_id" UUID;
ALTER TABLE "workspace_document" ADD CONSTRAINT "workspace_document_visibility_check"
  CHECK ((visibility = 'private' AND shared_branch_id IS NULL)
      OR (visibility = 'branch' AND shared_branch_id IS NOT NULL));
ALTER TABLE "workspace_document" ADD CONSTRAINT "workspace_document_shared_branch_id_fkey"
  FOREIGN KEY ("shared_branch_id") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "workspace_document_shared_branch_id_visibility_updated_at_idx"
  ON "workspace_document"("shared_branch_id", "visibility", "updated_at");
CREATE TABLE "workspace_document_asset" (
  "user_id" UUID NOT NULL,
  "document_id" VARCHAR(100) NOT NULL,
  "asset_id" VARCHAR(100) NOT NULL,
  CONSTRAINT "workspace_document_asset_pkey" PRIMARY KEY ("user_id", "document_id", "asset_id"),
  CONSTRAINT "workspace_document_asset_user_id_document_id_fkey"
    FOREIGN KEY ("user_id", "document_id") REFERENCES "workspace_document"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "workspace_document_asset_user_id_asset_id_fkey"
    FOREIGN KEY ("user_id", "asset_id") REFERENCES "workspace_asset"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "workspace_document_asset_user_id_asset_id_idx" ON "workspace_document_asset"("user_id", "asset_id");

-- Auth.js/Prisma endpoints enforce access; the Data API must not expose the ACL index.
ALTER TABLE "workspace_document_asset" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "workspace_document_asset" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE "workspace_document_asset" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE "workspace_document_asset" FROM authenticated';
  END IF;
END;
$$;
