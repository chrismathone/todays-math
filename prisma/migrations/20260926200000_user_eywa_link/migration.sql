-- eywa 자동 로그인 2판(D-139 ⑹) — 계정 주인이 비밀번호로 로그인해 [연결]을 눌렀을 때만 채우는 칸 둘.
-- 기존 행은 전부 NULL 그대로다(기본값 없음 · 채우는 문장 없음). 적용은 scripts/qa/apply-eywa-link-migration.ts.
ALTER TABLE "user" ADD COLUMN "eywa_user_id" UUID;
ALTER TABLE "user" ADD COLUMN "eywa_linked_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "user_eywa_user_id_key" ON "user"("eywa_user_id");
