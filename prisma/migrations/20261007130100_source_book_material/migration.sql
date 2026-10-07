-- 출처 책 · 출처 자료 — 교과서 · 문제집에서 옮긴 문항의 메타데이터 (D-160, 2026-10-07).
--
-- 원장님 2026-10-07: 「출판사 학년 학기 단원 유형 등 모든 곳에 메타데이터가 있어야 문제은행을 이용하기 용이함」.
--
--   source_book      책 한 권 — 「천재교육 · 중학 수학1 · 김동재 · 2022 개정」
--     └ source_material  그 책에 딸린 자료 한 편(파일 하나) — 「형성평가 1-1-1 1회」
--         └ problem.source_material_id  그 자료에 실려 있던 문항
--
-- **더하기만 한다** — 새 표 둘 · `problem` 에 NULL 허용 칸 하나 · 색인 하나 · 외래 키 하나.
-- 기존 행은 한 줄도 UPDATE 되지 않는다(새 칸은 전부 NULL). 옛 코드는 이 칸과 표를 모른 채 그대로 돈다.
--
-- 아래 «Prisma 가 낸 것»은 `prisma migrate diff --from-schema-datamodel <앞 schema> --to-schema-datamodel
-- prisma/schema.prisma --script` 의 산출 그대로다(DB 에 닿지 않는다). 그 아래 «손으로 더한 것»은 Prisma 가
-- 모델로 못 적는 것들 — CHECK 와 Supabase 권한이다.
-- 문장의 **차례만** 손댔다: `problem` 을 만지는 넷(칸 · 색인 · 외래 키 · CHECK)을 맨 끝으로 내렸다 —
-- `problem` 에 서는 잠금이 트랜잭션 끝까지 가므로, 잠금을 쥔 시간이 짧아지게.
--
-- 🔴 배포보다 **먼저** 적용한다 — 새 코드의 Prisma 는 `problem` 을 읽을 때마다 `source_material_id` 를 부른다.
--    칸 없이 배포되면 문제은행 · 출제가 전부 500 이다(P2022).
-- 🔴 적용은 scripts/qa/apply-source-material-migration.ts 로, 드라이런 먼저.
-- 되돌리기: 같은 스크립트의 `--revert`(교과서 문항이 한 줄이라도 있으면 멈춘다).

-- ── Prisma 가 낸 것 ────────────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "source_book" (
    "id" UUID NOT NULL,
    "external_key" VARCHAR(120) NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "publisher" VARCHAR(30) NOT NULL,
    "author" VARCHAR(30),
    "title" VARCHAR(80) NOT NULL,
    "grade" VARCHAR(10) NOT NULL,
    "curriculum" VARCHAR(8) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_material" (
    "id" UUID NOT NULL,
    "external_key" VARCHAR(120) NOT NULL,
    "book_id" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "kind_raw" VARCHAR(60) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "chapter_no" SMALLINT,
    "middle_no" SMALLINT,
    "section_no" SMALLINT,
    "unit_raw" VARCHAR(120),
    "semester" SMALLINT,
    "round" VARCHAR(4),
    "level_raw" VARCHAR(20),
    "sequence" SMALLINT,
    "source_file" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_material_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "source_book_external_key_key" ON "source_book"("external_key");

-- CreateIndex
CREATE INDEX "source_book_kind_grade_publisher_idx" ON "source_book"("kind", "grade", "publisher");

-- CreateIndex
CREATE UNIQUE INDEX "source_material_external_key_key" ON "source_material"("external_key");

-- CreateIndex
CREATE INDEX "source_material_book_id_kind_idx" ON "source_material"("book_id", "kind");

-- AddForeignKey
ALTER TABLE "source_material" ADD CONSTRAINT "source_material_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "source_book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── 손으로 더한 것 ─────────────────────────────────────────────────────────────

-- 책의 갈래는 둘뿐이다. 새 갈래가 생기면 이 CHECK 를 바꾸는 마이그레이션을 쓴다(조용히 늘지 않게).
ALTER TABLE "source_book" ADD CONSTRAINT "source_book_kind_valid"
  CHECK ("kind" IN ('school_textbook', 'workbook'));

-- 교육과정은 고시 연도 네 자리다 — 「22개정」 · 「2022 개정」 같은 표기가 섞여 들어오지 않게.
ALTER TABLE "source_book" ADD CONSTRAINT "source_book_curriculum_year"
  CHECK ("curriculum" ~ '^[0-9]{4}$');

-- 빈 글자는 «없음»이 아니다 — 없으면 NULL 로 적는다.
ALTER TABLE "source_book" ADD CONSTRAINT "source_book_text_not_blank"
  CHECK (btrim("publisher") <> '' AND btrim("title") <> '' AND btrim("grade") <> ''
         AND ("author" IS NULL OR btrim("author") <> ''));

ALTER TABLE "source_material" ADD CONSTRAINT "source_material_semester_valid"
  CHECK ("semester" IS NULL OR "semester" IN (1, 2));

ALTER TABLE "source_material" ADD CONSTRAINT "source_material_round_valid"
  CHECK ("round" IS NULL OR "round" IN ('중간', '기말'));

-- 단원 번호 · 회차는 1부터다. 소단원 번호는 중단원 번호 없이 있을 수 없고, 중단원은 대단원 없이 있을 수 없다.
ALTER TABLE "source_material" ADD CONSTRAINT "source_material_numbers_valid"
  CHECK (("chapter_no" IS NULL OR "chapter_no" >= 1)
         AND ("middle_no" IS NULL OR ("middle_no" >= 1 AND "chapter_no" IS NOT NULL))
         AND ("section_no" IS NULL OR ("section_no" >= 1 AND "middle_no" IS NOT NULL))
         AND ("sequence" IS NULL OR "sequence" >= 1));

ALTER TABLE "source_material" ADD CONSTRAINT "source_material_text_not_blank"
  CHECK (btrim("kind") <> '' AND btrim("kind_raw") <> '' AND btrim("title") <> '');

-- Supabase: 브라우저 역할은 이 표들을 Data API 로 못 읽는다. 서버(Prisma)는 표 주인으로 붙는다.
ALTER TABLE "source_book" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "source_material" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "source_book", "source_material" FROM PUBLIC;
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON "source_book", "source_material" FROM %I', role_name);
    END IF;
  END LOOP;
END $$;

-- ── `problem` 을 만지는 것 — 맨 끝에(잠금을 쥔 시간이 짧게) ──────────────────────

-- AlterTable
ALTER TABLE "problem" ADD COLUMN     "source_material_id" UUID;

-- CreateIndex
CREATE INDEX "problem_source_material_id_idx" ON "problem"("source_material_id");

-- AddForeignKey
ALTER TABLE "problem" ADD CONSTRAINT "problem_source_material_id_fkey" FOREIGN KEY ("source_material_id") REFERENCES "source_material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 🔴 자료에 묶인 문항은 «교과서 · 문제집에서 온 것»이어야 한다 — 기출 · 엔진 문항에 자료가 붙으면 출처가 둘이 된다.
--    (`transformed` 는 RPM 문제집 이관본이 쓰는 값이다 — 나중에 그 책을 `workbook` 으로 등록할 수 있게 열어 둔다.)
--    글자로 견준다(`::text`) — enum 값으로 견주면, 앞 파일이 막 더한 값을 같은 트랜잭션에서 쓰는 것이 돼
--    드라이런(한 트랜잭션 · ROLLBACK)이 «unsafe use of new value»로 죽는다.
ALTER TABLE "problem" ADD CONSTRAINT "problem_source_material_matches_source"
  CHECK ("source_material_id" IS NULL OR "source"::text IN ('school_textbook', 'transformed'));
