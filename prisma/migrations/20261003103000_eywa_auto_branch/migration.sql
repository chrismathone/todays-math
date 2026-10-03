-- Upgrade installations/fixtures that already applied the managed-sync migration.
-- Existing bindings never become automatically owned through a backfill.
ALTER TABLE "eywa_binding"
  ADD COLUMN IF NOT EXISTS "auto_provisioned_branch" BOOLEAN NOT NULL DEFAULT false;
