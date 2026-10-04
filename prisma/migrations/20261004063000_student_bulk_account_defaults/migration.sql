ALTER TABLE "student" ADD COLUMN "phone_last4" CHAR(4);
ALTER TABLE "student" ADD CONSTRAINT "student_phone_last4_format"
  CHECK ("phone_last4" IS NULL OR "phone_last4" ~ '^[0-9]{4}$');
ALTER TABLE "student_account" ALTER COLUMN "login_id" TYPE VARCHAR(50);
