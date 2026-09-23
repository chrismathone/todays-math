ALTER TABLE "user" ADD COLUMN "is_super_admin" BOOLEAN NOT NULL DEFAULT false;

-- 기존 최고관리자 한 명만 전체 관리 권한을 유지한다.
UPDATE "user"
SET "is_super_admin" = true, "is_admin" = true
WHERE lower("email") = 'st2000423@gmail.com' AND "deleted_at" IS NULL;
