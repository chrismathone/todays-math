-- Existing rows were explicitly backfilled as approved when the column was added.
-- Every future account must enter approval even if created outside the signup route.
ALTER TABLE "user" ALTER COLUMN "approval_status" SET DEFAULT 'pending';
