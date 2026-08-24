-- 문항에서 소유자를 걷어낸다 (D-101, 원장님 확정 2026-08-24: 「소유자 필요없고 전체 공유」).
--
-- ⚠️ **이 마이그레이션의 진짜 목적은 «전체 공유»가 아니다 — 그건 이미 되어 있었다.**
--    적용 시점에 문항 47,014개가 **전부 `pool = 'shared'`** 라, 어느 계정으로 로그인하든
--    이미 전부 보였다. `user_id` 가 실제로 하던 일은 딱 하나 —
--
--        problem.user_id → user  ON DELETE CASCADE
--
--    **계정 행 하나를 지우면 Postgres 가 그 계정의 문항을 전부 같이 지운다.** 47,006개가
--    한 계정(구 `import@todays-math.local`)에 매달려 있었다. 앱을 안 거치고 DB 가 직접
--    하는 일이라 애플리케이션 코드로는 막을 방법이 없다.
--
--    그래서 이 마이그레이션이 하는 일은 **그 폭탄을 제거하는 것**이다.
--
-- ⚠️ **`SET NULL` 을 다시 `CASCADE` 로 되돌리지 말 것.** 되돌리는 순간 계정 삭제 한 번에
--    문항 전량이 사라지는 상태로 돌아간다.
--
-- 컬럼 자체는 **남긴다** — «누가 넣었나»를 나중에 다시 쓸 수 있고, 그때 마이그레이션이
-- 필요 없다. 지금은 전량 NULL 이고 어떤 조회·권한도 이 값을 보지 않는다
-- (`requireOwnedProblem` 은 이 시점에 이미 아무도 호출하지 않는 죽은 함수였다).

ALTER TABLE "problem" ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "problem" DROP CONSTRAINT "problem_user_id_fkey";

ALTER TABLE "problem" ADD CONSTRAINT "problem_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
