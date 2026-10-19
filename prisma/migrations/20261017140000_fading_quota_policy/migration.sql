-- 2026-10-17 원장님 «B안, 나머지는 추천대로» → «Q2안으로 구현» — «오늘의 기억» 학생별 하루 분량 손잡이.
--
-- 표 둘을 새로 만든다. 지금 있는 표 · 행은 만지지 않는다. 🔴 DB 먼저 · 코드 나중(이 표를 읽는 코드가 나가기 전에 적용한다).
-- ⑴ fading_student_policy — 학생 하나에 한 행. 행이 없으면 서비스 기본(15칸). 바꾼 값은 다음 한국 날짜(effective_on)부터.
-- ⑵ fading_relearn_cap_day — 추가 확인이 하루 상한에 닿은 날. «분량 점검 필요»(최근 7일 중 3일)의 근거.
-- 학생을 지우면 같이 지워진다. 고를 수 있는 분량은 10 · 15 · 20 뿐이다(NULL = 서비스 기본).
-- 🔴 서버만 읽고 쓴다 — 다른 학생 기록 표(`student_srs_state`)와 같이 RLS 를 켜고 브라우저 역할(anon · authenticated)의 권한을 걷는다.
-- 문장 사이는 `-- statement` 줄로 가른다(적용 스크립트가 이 줄로 나눈다 — DO 블록 안의 «;» 때문에).

-- statement

CREATE TABLE "fading_student_policy" (
  "student_id" UUID NOT NULL,
  "quota" SMALLINT,
  "previous_quota" SMALLINT,
  "effective_on" DATE NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updated_by" UUID,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fading_student_policy_pkey" PRIMARY KEY ("student_id"),
  CONSTRAINT "fading_student_policy_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fading_student_policy_quota_check" CHECK ("quota" IS NULL OR "quota" IN (10, 15, 20)),
  CONSTRAINT "fading_student_policy_previous_quota_check" CHECK ("previous_quota" IS NULL OR "previous_quota" IN (10, 15, 20)),
  CONSTRAINT "fading_student_policy_revision_check" CHECK ("revision" >= 1)
);

-- statement

CREATE TABLE "fading_relearn_cap_day" (
  "student_id" UUID NOT NULL,
  "on" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fading_relearn_cap_day_pkey" PRIMARY KEY ("student_id", "on"),
  CONSTRAINT "fading_relearn_cap_day_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- statement
ALTER TABLE "fading_student_policy" ENABLE ROW LEVEL SECURITY;

-- statement
ALTER TABLE "fading_relearn_cap_day" ENABLE ROW LEVEL SECURITY;

-- statement
REVOKE ALL ON "fading_student_policy", "fading_relearn_cap_day" FROM PUBLIC;

-- statement
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON "fading_student_policy", "fading_relearn_cap_day" FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
