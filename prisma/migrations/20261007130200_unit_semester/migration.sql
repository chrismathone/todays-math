-- 차시의 학기 — `unit.semester` (D-160, 2026-10-07).
--
-- 원장님 2026-10-07: 「출판사 학년 학기 단원 유형 등 모든 곳에 메타데이터가 있어야 문제은행을 이용하기 용이함」.
-- 문항마다 학기를 적지 않는다 — 문항의 차시가 말한다. 그래야 기출 · 엔진 · 교과서 문항이 같은 값을 본다.
--
-- **더하기만 한다** — NULL 허용 칸 하나와 CHECK 하나. 값은 이 파일이 넣지 않는다:
--   · 새 DB — 시드(`prisma/seed.ts`)가 차시를 만들 때 같이 적는다.
--   · 이미 차시가 든 DB(공유 DB) — scripts/qa/apply-source-material-migration.ts 가 같은 규칙
--     (`src/lib/curriculum/unitSemester.ts` 의 `semesterOfUnit`)으로 채운다.
-- 규칙을 SQL 에 두 벌로 적지 않으려는 것이다(`problem_code_prefix` 와 같은 결).
--
-- NULL 은 «모른다 · 정하지 않는다»다 — 고등 선택 과목은 학교마다 듣는 학기가 다르다.
--
-- 🔴 배포보다 **먼저** 적용한다 — 새 코드의 Prisma 는 `unit` 을 읽을 때마다 `semester` 를 부른다(P2022).
-- 되돌리기: 같은 스크립트의 `--revert`.

-- AlterTable
ALTER TABLE "unit" ADD COLUMN     "semester" SMALLINT;

ALTER TABLE "unit" ADD CONSTRAINT "unit_semester_valid"
  CHECK ("semester" IS NULL OR "semester" IN (1, 2));
