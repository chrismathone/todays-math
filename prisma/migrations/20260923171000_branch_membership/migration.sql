CREATE TYPE "branch_role" AS ENUM ('owner', 'manager', 'teacher');

CREATE TABLE "branch" (
  "id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "branch_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "user" ADD COLUMN "branch_id" UUID;
ALTER TABLE "user" ADD COLUMN "branch_role" "branch_role";
ALTER TABLE "user" ADD CONSTRAINT "user_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "user_branch_id_idx" ON "user"("branch_id");

INSERT INTO "branch" ("id", "name") VALUES ('00000000-0000-4000-8000-000000000101', '기본 지점');
UPDATE "user" SET "branch_id" = '00000000-0000-4000-8000-000000000101', "branch_role" = 'owner', "is_admin" = true
WHERE "email" = 'test_o@osu.com' AND "deleted_at" IS NULL;
UPDATE "user" SET "branch_id" = '00000000-0000-4000-8000-000000000101', "branch_role" = 'teacher', "is_admin" = false
WHERE "email" = 'test_t@osu.com' AND "deleted_at" IS NULL;
