-- ⚠️ 미적용 초안 (D-124) — 원장님 확인 전 적용 금지
--
-- 오늘의 개념 — 학생 로그인 계정(student_account) · 없는 아이디의 로그인 실패 수(student_login_miss).
-- 결정: D-124 ⑶⑷ · D-125 ⑵⑶ · 계약 SSOT: src/contracts/studentAccount.contract.ts
-- 로그인 규칙: src/lib/learn/studentLogin.ts · 브리프: docs/planning/tracks/briefs/todays-concept-student-auth.md
--
-- 윗부분은 `prisma migrate diff --from-schema-datamodel <이전 schema> --to-schema-datamodel
-- prisma/schema.prisma --script`(DB 없이 스키마끼리 — DATABASE_URL·DIRECT_URL 은 닿지 않는
-- 127.0.0.1:1)의 산출을 **그대로** 실었다. Prisma 가 표현 못 하는 것은 맨 아래 «손으로 더한 것» 절에 붙였다.
--
-- 🔴 `prisma migrate dev` · `migrate deploy` · `db push` · `migrate reset` 은 이 파일을 공유 DB 에 적용한다.
--    원장님 확인 전에는 어느 세션도 돌리지 말 것. 적용은 리드가 원장님께 여쭌 뒤
--    scripts/qa/apply-student-account-migration.ts 로 **이 마이그레이션 하나만**, 드라이런 먼저.

-- CreateTable
CREATE TABLE "student_account" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "login_id" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "issued_by_id" UUID,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password_changed_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "disabled_at" TIMESTAMP(3),
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_login_miss" (
    "key_hash" CHAR(64) NOT NULL,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_login_miss_pkey" PRIMARY KEY ("key_hash")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_account_student_id_key" ON "student_account"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_account_login_id_key" ON "student_account"("login_id");

-- AddForeignKey
ALTER TABLE "student_account" ADD CONSTRAINT "student_account_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_account" ADD CONSTRAINT "student_account_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 손으로 더한 것 (Prisma 가 표현 못 함) ────────────────────────────────

-- 아이디는 정규화된 모양으로만 들어간다 — 앱은 `normalizeLoginId`(앞뒤 공백 걷고 소문자)를 거쳐 넣는다.
-- SQL 로 대문자가 섞여 들어가면 unique 가 «Seo01» 과 «seo01» 을 둘로 보고, 로그인은 둘 다 못 찾는다.
-- 형식(영문·숫자·-·_ 4~20자)은 원장님이 바꾸실 수 있는 **정책**이라 DB 에 두지 않는다(계약 한 곳 —
-- `STUDENT_LOGIN_ID_RULE`). 여기 두는 것은 정책이 아니라 «정규화했다»는 저장 약속뿐이다.
ALTER TABLE "student_account"
  ADD CONSTRAINT "student_account_login_id_normalized"
  CHECK ("login_id" = lower(btrim("login_id")));

ALTER TABLE "student_account"
  ADD CONSTRAINT "student_account_failed_count_nonnegative"
  CHECK ("failed_count" >= 0);

ALTER TABLE "student_login_miss"
  ADD CONSTRAINT "student_login_miss_failed_count_nonnegative"
  CHECK ("failed_count" >= 0);

-- 없는 아이디의 열쇠는 64자 16진(HMAC-SHA256)만 — 입력한 아이디가 글자 그대로 들어오면 여기서 막힌다.
-- 학생이 번호를 아이디 칸에 적는 실수가 평문으로 남지 않게(브리프 §4 ⑥).
ALTER TABLE "student_login_miss"
  ADD CONSTRAINT "student_login_miss_key_is_hmac"
  CHECK ("key_hash" ~ '^[0-9a-f]{64}$');

-- 새 표는 RLS 를 켠다 — 이 저장소의 관례(account_audit_log · concept_lecture …).
-- 정책이 없으므로 Supabase 공개 API(anon)로는 못 읽는다. 앱은 Prisma(DB 직결)로 읽고 쓴다.
ALTER TABLE "student_account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_login_miss" ENABLE ROW LEVEL SECURITY;
