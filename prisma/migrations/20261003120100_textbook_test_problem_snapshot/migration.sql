-- 교재의 문항으로 다시 출제한 시험지 — `test_problem.snapshot_id` (nullable)
-- 계획 60a508c0 · P1 계약 e94aedb8 «TestProblem nullable snapshot_id는 별도 additive migration»
--
-- 기존 표에 생기는 것은 **빈 칸 하나 · FK · 부분 색인 · 트리거 하나**다. 기존 행은 전부 NULL 로 남고,
-- 트리거는 snapshot_id 가 있는 행에만 일한다 — 확정본이 없는 시험지의 동작은 그대로다.
-- 🔴 `20261003120000_textbook_studio` 가 먼저 적용돼 있어야 한다(FK 가 그 표를 가리킨다).
-- 🔴 `schema.prisma` 의 `TestProblem.snapshotId` 가 이 칸을 읽는다 — **DB 먼저 · 코드 나중**.
--    칸 없는 DB 에 코드가 먼저 나가면 시험지를 읽는 모든 요청이 P2022 로 죽는다.

ALTER TABLE "test_problem" ADD COLUMN "snapshot_id" UUID;

ALTER TABLE "test_problem" ADD CONSTRAINT "test_problem_snapshot_id_fkey"
  FOREIGN KEY ("snapshot_id") REFERENCES "textbook_problem_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "test_problem_snapshot_id_idx" ON "test_problem"("snapshot_id") WHERE "snapshot_id" IS NOT NULL;

-- 확정본을 단 시험지 문항은 **그 확정본의 불변 정체**와 같은 문항이어야 한다.
-- 견주는 것은 지워지면 비는 `snapshot.problem_id` 가 아니라 안 바뀌는 `source_ref.problemId` 다.
-- 문항을 바꾸면서(problem_id 수정) snapshot_id 를 그대로 두면 여기서 막힌다 — 다른 문항의 정답으로 채점되지 않게.
CREATE FUNCTION "textbook_guard_test_problem_snapshot"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW."snapshot_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public."textbook_problem_snapshot" s
     WHERE s."id" = NEW."snapshot_id"
       AND s."source_system" = 'todays-math'
       AND (s."source_ref" ->> 'problemId') = NEW."problem_id"::text
  ) THEN
    RAISE EXCEPTION 'textbook: test problem % snapshot does not belong to problem %', NEW."id", NEW."problem_id" USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "test_problem_textbook_snapshot_identity" BEFORE INSERT OR UPDATE ON "test_problem"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_test_problem_snapshot"();
