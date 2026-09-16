-- ⚠️ 미적용 초안 (D-129) — 원장님 확인 전 적용 금지
--
-- 매일 자동 출제 — 진도 계획(progress_plan) · 아침 8시 자동 초안 회차 기록(auto_draft_run).
-- 결정: D-129 ⑴⑵⑶⑷ · SSOT: docs/planning/22-daily-auto-test.md · 계약: src/contracts/dailyAutoTest.contract.ts
-- 규칙(날짜 펴기·실제가 이긴다·밀림 셈): src/lib/daily/progressPlan.ts
-- 브리프: docs/planning/tracks/briefs/daily-auto-test-backend.md
--
-- 윗부분은 `prisma migrate diff --from-schema-datamodel <이전 schema> --to-schema-datamodel
-- prisma/schema.prisma --script`(DB 없이 스키마끼리 — DATABASE_URL·DIRECT_URL 은 닿지 않는
-- 127.0.0.1:1)의 산출을 **그대로** 실었다. Prisma 가 표현 못 하는 것은 맨 아래 «손으로 더한 것» 절에 붙였다.
--
-- 🔴 `prisma migrate dev` · `migrate deploy` · `db push` · `migrate reset` 은 이 파일을 공유 DB 에 적용한다.
--    원장님 확인 전에는 어느 세션도 돌리지 말 것. 적용은 리드가 원장님께 여쭌 뒤
--    scripts/qa/apply-progress-plan-migration.ts 로 **이 마이그레이션 하나만**, 드라이런 먼저.

-- CreateTable
CREATE TABLE "progress_plan" (
    "id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "student_id" UUID,
    "weekdays" SMALLINT[],
    "units_per_lesson" INTEGER NOT NULL DEFAULT 1,
    "start_unit_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_draft_run" (
    "id" UUID NOT NULL,
    "ran_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" DATE NOT NULL,
    "targets" INTEGER NOT NULL,
    "created" INTEGER NOT NULL,
    "skipped" INTEGER NOT NULL,
    "skips" JSONB NOT NULL,

    CONSTRAINT "auto_draft_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "progress_plan_student_id_key" ON "progress_plan"("student_id");

-- CreateIndex
CREATE INDEX "progress_plan_class_id_idx" ON "progress_plan"("class_id");

-- CreateIndex
CREATE INDEX "auto_draft_run_ran_at_idx" ON "auto_draft_run"("ran_at");

-- AddForeignKey
ALTER TABLE "progress_plan" ADD CONSTRAINT "progress_plan_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_plan" ADD CONSTRAINT "progress_plan_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_plan" ADD CONSTRAINT "progress_plan_start_unit_id_fkey" FOREIGN KEY ("start_unit_id") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ── 손으로 더한 것 (Prisma 가 표현 못 함) ────────────────────────────────

-- 🔴 **반 계획은 반당 하나다.** `student_id` 의 unique 는 학생 계획만 지킨다 — Postgres 는 NULL 을
-- 서로 다른 값으로 보기 때문에 반 계획(student_id IS NULL)은 몇 줄이든 들어간다. 두 줄이 들어가면
-- 「어느 것이 이 반의 계획인가」가 조회 순서로 갈리고, 그러면 같은 날 두 번 돌린 자동 출제가
-- 서로 다른 범위를 낸다. 부분 unique 인덱스로 막는다(Prisma 스키마로는 못 적는다).
CREATE UNIQUE INDEX "progress_plan_class_only_key"
  ON "progress_plan" ("class_id") WHERE "student_id" IS NULL;

-- 수업 요일이 비면 **수업일이 하나도 없는 계획**이다 — 조용히 0건을 내는 대신 넣을 때 막는다.
ALTER TABLE "progress_plan"
  ADD CONSTRAINT "progress_plan_weekdays_not_empty"
  CHECK (array_length("weekdays", 1) >= 1);

-- 요일 번호는 0=일 … 6=토 (`Date.getUTCDay()` 와 같은 번호). 범위를 벗어난 값은 영원히 안 맞는
-- 수업일이 되어 그 반만 조용히 자동에서 빠진다.
ALTER TABLE "progress_plan"
  ADD CONSTRAINT "progress_plan_weekdays_in_range"
  CHECK ("weekdays" <@ ARRAY[0,1,2,3,4,5,6]::smallint[]);

-- 한 수업당 차시 수는 1 이상. 0 이면 계획이 영원히 제자리다.
ALTER TABLE "progress_plan"
  ADD CONSTRAINT "progress_plan_units_per_lesson_positive"
  CHECK ("units_per_lesson" >= 1);

-- 회차 기록의 수는 음수가 될 수 없고, 건너뛴 수는 까닭 목록의 길이와 같다 —
-- 「합계는 맞는데 목록이 빈」 회차가 남으면 왜 빠졌는지 영영 못 센다(20번 교훈 2026-09-13).
ALTER TABLE "auto_draft_run"
  ADD CONSTRAINT "auto_draft_run_counts_nonnegative"
  CHECK ("targets" >= 0 AND "created" >= 0 AND "skipped" >= 0);

ALTER TABLE "auto_draft_run"
  ADD CONSTRAINT "auto_draft_run_skips_match"
  CHECK (jsonb_typeof("skips") = 'array' AND jsonb_array_length("skips") = "skipped");

-- 새 표는 RLS 를 켠다 — 이 저장소의 관례(account_audit_log · concept_lecture · student_account …).
-- 정책이 없으므로 Supabase 공개 API(anon)로는 못 읽는다. 앱은 Prisma(DB 직결)로 읽고 쓴다.
ALTER TABLE "progress_plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auto_draft_run" ENABLE ROW LEVEL SECURITY;
