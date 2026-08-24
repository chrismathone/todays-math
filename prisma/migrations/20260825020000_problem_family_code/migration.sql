-- ════════════════════════════════════════════════════════════════════════
-- 문항 코드 2세대 — `J30103-A01-001` (원장님 확정 2026-08-25)
-- ════════════════════════════════════════════════════════════════════════
--
-- ## 왜 바꾸나
--
-- 1세대 코드는 `J30103-4NSK` 처럼 **무작위 4자**였다. 그래서 원장님이 화면에서
-- 「$x^2+8x-1=0$ 일 때…」와 「$x^2-9x+1=0$ 일 때…」를 나란히 보시고
-- 「같은 류인데 번호가 다르다」고 하셨을 때, **그 둘이 같은 유형인지 알 방법이
-- 코드에 아예 없었다.** 숫자만 바꾼 아류가 남남처럼 보인다.
--
-- 새 코드는 자리를 셋으로 나눈다:
--
--     J30103  -  A01  -  001
--     단원       문항류    아류 번호
--
-- - **문항류** `A01`~`Z99`. 글자는 «비슷한 문항류를 한 무리로 묶는» 자리다
--   (원장님: 「혹시나 비슷한 문항류는 A01 A02 하려고 하는 의도」). 자동 부여는
--   `A01` 부터 숫자를 먼저 채우고 다 차면 `B01` 로 넘어간다 — 글자를 먼저 넘기면
--   무리마다 하나씩 흩어져 글자가 아무 뜻도 못 갖는다.
-- - **아류 번호** `001`~`999`. 숫자만 바꾼 변형이 여기 쌓인다.
--
-- ## 무엇이 «같은 문항류»인가 — DB 가 정하지 않는다
--
-- `problem.family_key` 에 **엔진이 자기 유형 정체**를 적어 넣는다:
--   중등 `mid:3-1|근호를 포함한 식의 계산|06`
--   초등 `elem:초6|2-5-1 원주와 원주율 알아보기|연산`
-- 같은 키면 같은 문항류다. 그래서 「숫자만 바꾼 변형」은 **자동으로** 한 무리에 모인다.
--
-- 키가 없는 행(사람이 손으로 넣은 것·AI 변형)은 **자기 혼자 한 무리**를 차지한다
-- (`solo:<uuid>`). 번호 형식이 한 가지로 유지되고, 나중에 「이건 저 무리」라고
-- 옮길 수 있다.
--
-- ## 옛 코드는 건드리지 않는다
--
-- 45,374건이 옛 형식을 달고 있고 `problem_code_freeze` 가 UPDATE 를 막는다 —
-- **영영 그대로**다. 그래서 CHECK 는 «옛 것 또는 새 것»을 받는다. 하나만 받게 하면
-- 그 45,374건이 통째로 제약 위반이 되어 어떤 UPDATE 도 못 하게 된다(격리 해제도).
--
-- 되돌리기:
--     DROP TRIGGER IF EXISTS "problem_code_assign" ON "problem";
--     DROP FUNCTION IF EXISTS "problem_code_assign"(), "problem_code_next"(uuid),
--                             "problem_family_code"(int), "problem_family_take"(uuid, text);
--     DROP TABLE IF EXISTS "problem_family";
--     ALTER TABLE "problem" DROP COLUMN IF EXISTS "family_key";
--   그런 다음 20260818210000 의 함수 넷을 다시 만든다.

-- ────────────────────────────────────────────────────────────────────────
-- 1. 문항류 키 컬럼
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE "problem" ADD COLUMN IF NOT EXISTS "family_key" TEXT;

COMMENT ON COLUMN "problem"."family_key" IS
  '엔진이 적는 «이 문항이 어느 유형인가». 같은 키 = 같은 문항류 = 코드의 같은 A01 자리.';

-- ────────────────────────────────────────────────────────────────────────
-- 2. 문항류 대장 — 단원마다 (키 → 코드 · 다음 아류 번호)
-- ────────────────────────────────────────────────────────────────────────
-- `next_seq` 를 여기 두는 이유: 문항 표를 세어 번호를 매기면 **동시에 두 건이
-- 들어올 때 같은 번호**를 받는다. UPDATE ... RETURNING 은 행 잠금이라 안 겹친다.
CREATE TABLE IF NOT EXISTS "problem_family" (
  "unit_id"     UUID NOT NULL,
  "family_key"  TEXT NOT NULL,
  "family_code" CHAR(3) NOT NULL,
  "next_seq"    INT NOT NULL DEFAULT 1,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "problem_family_pkey" PRIMARY KEY ("unit_id", "family_key"),
  CONSTRAINT "problem_family_code_unique" UNIQUE ("unit_id", "family_code"),
  CONSTRAINT "problem_family_code_format" CHECK ("family_code" ~ '^[A-Z][0-9]{2}$'),
  CONSTRAINT "problem_family_unit_fkey"
    FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

COMMENT ON TABLE "problem_family" IS
  '단원 안의 문항류 대장. 코드의 A01 자리가 여기서 나오고, 아류 번호도 여기서 센다.';

-- ────────────────────────────────────────────────────────────────────────
-- 3. n 번째 문항류 → `A01`
-- ────────────────────────────────────────────────────────────────────────
-- 🔴 같은 규칙이 `src/lib/problemCode.ts` 의 `familyCodeFromIndex` 에도 있다.
--    부여 시점에 «그 단원에 이미 몇 무리가 있나»를 봐야 해서 SQL 쪽이 필요하다.
--    두 벌이 갈라지지 않게 `scripts/qa/verify-problem-code-wiring.ts` 가
--    **1..2574 전량을 실제 DB 함수와 대조**한다. 한쪽만 고치면 거기서 빨개진다.
CREATE OR REPLACE FUNCTION "problem_family_code"(p_index int) RETURNS char(3)
LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE
  v_letter int;
BEGIN
  IF p_index IS NULL OR p_index < 1 THEN
    RAISE EXCEPTION '[문항류] 1 이상의 정수여야 한다: %', p_index;
  END IF;
  v_letter := (p_index - 1) / 99;
  IF v_letter > 25 THEN
    RAISE EXCEPTION '[문항류] 한 단원의 문항류가 2574 를 넘었다: %. 자리를 늘리려면 계약과 SQL 을 같이 고쳐야 한다.', p_index;
  END IF;
  -- `mod()` 를 쓴다 — `%` 연산자는 마이그레이션 러너나 RAISE 문맥에서 자리표시자로
  -- 오해될 여지가 있고, 그 오해는 **에러가 아니라 틀린 코드**로 나타난다.
  RETURN chr(65 + v_letter) || lpad((mod(p_index - 1, 99) + 1)::text, 2, '0');
END;
$fn$;

-- ────────────────────────────────────────────────────────────────────────
-- 4. 무리를 찾거나 만들고, 그 안의 다음 아류 번호를 뽑는다
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "problem_family_take"(p_unit_id uuid, p_key text)
RETURNS TABLE ("family_code" char(3), "seq" int)
LANGUAGE plpgsql VOLATILE AS $fn$
DECLARE
  v_code char(3);
  v_n    int;
  v_seq  int;
  v_tries CONSTANT int := 30;
  i int;
BEGIN
  FOR i IN 1..v_tries LOOP
    SELECT f."family_code" INTO v_code
      FROM "problem_family" f
     WHERE f."unit_id" = p_unit_id AND f."family_key" = p_key;
    EXIT WHEN v_code IS NOT NULL;

    SELECT COUNT(*) INTO v_n FROM "problem_family" f WHERE f."unit_id" = p_unit_id;
    BEGIN
      INSERT INTO "problem_family" ("unit_id", "family_key", "family_code")
      VALUES (p_unit_id, p_key, "problem_family_code"(v_n + 1));
    EXCEPTION WHEN unique_violation THEN
      -- 다른 트랜잭션이 먼저 같은 자리를 가져갔다. 다시 읽는다 —
      -- **조용히 아무 코드나 쓰지 않는다.** 겹친 코드는 다른 문항을 가리킨다.
      NULL;
    END;
  END LOOP;

  IF v_code IS NULL THEN
    RAISE EXCEPTION '[문항류] 단원 % 에서 무리 자리를 % 번 다퉜는데 못 잡았다.', p_unit_id, v_tries;
  END IF;

  -- 아류 번호는 **행 잠금**으로 뽑는다. 세어서 +1 하면 동시에 들어온 둘이 같은 번호를 받는다.
  UPDATE "problem_family" f
     SET "next_seq" = f."next_seq" + 1
   WHERE f."unit_id" = p_unit_id AND f."family_key" = p_key
  RETURNING f."next_seq" - 1 INTO v_seq;

  IF v_seq > 999 THEN
    RAISE EXCEPTION '[문항 코드] 문항류 % 의 아류가 999 를 넘었다(단원 %). 자리를 늘리려면 계약과 SQL 을 같이 고쳐야 한다.', v_code, p_unit_id;
  END IF;

  RETURN QUERY SELECT v_code, v_seq;
END;
$fn$;

-- ────────────────────────────────────────────────────────────────────────
-- 5. 코드 하나 만들기
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "problem_code_next"(p_unit_id uuid, p_family_key text)
RETURNS varchar
LANGUAGE plpgsql VOLATILE AS $fn$
DECLARE
  v_prefix text;
  v_code   char(3);
  v_seq    int;
BEGIN
  SELECT u."problem_code_prefix" INTO v_prefix FROM "unit" u WHERE u."id" = p_unit_id;
  IF v_prefix IS NULL THEN
    RAISE EXCEPTION '[문항 코드] 단원 % 에 problem_code_prefix 가 없다. 새 단원을 넣었다면 prisma/seed.ts 처럼 코드를 같이 넣어라.', p_unit_id;
  END IF;

  SELECT t."family_code", t."seq" INTO v_code, v_seq
    FROM "problem_family_take"(p_unit_id, p_family_key) t;

  RETURN v_prefix || '-' || v_code || '-' || lpad(v_seq::text, 3, '0');
END;
$fn$;

-- 옛 한-인자 판은 지운다. 남겨 두면 어떤 경로가 그것을 불러 **옛 형식**을 계속 만들고,
-- 그 사실이 아무 데도 안 드러난다(이 저장소가 되풀이한 「두 벌」 결함).
DROP FUNCTION IF EXISTS "problem_code_next"(uuid);
DROP FUNCTION IF EXISTS "problem_code_suffix"();

-- ────────────────────────────────────────────────────────────────────────
-- 6. 부여 — 모든 경로가 자동으로 받는다
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "problem_code_assign"() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE
  v_key text;
BEGIN
  -- 키가 없으면 **자기 혼자 한 무리**다. 그래야 형식이 한 가지로 유지된다.
  v_key := NULLIF(btrim(COALESCE(NEW."family_key", '')), '');
  IF v_key IS NULL THEN
    v_key := 'solo:' || gen_random_uuid()::text;
  END IF;
  NEW."family_key" := v_key;

  -- 명시된 코드는 존중한다(백필 되돌림·복원). 형식·유일성은 제약이 본다.
  IF NEW."problem_code" IS NULL THEN
    NEW."problem_code" := "problem_code_next"(NEW."unit_id", v_key);
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS "problem_code_assign" ON "problem";
CREATE TRIGGER "problem_code_assign"
  BEFORE INSERT ON "problem"
  FOR EACH ROW EXECUTE FUNCTION "problem_code_assign"();

-- ────────────────────────────────────────────────────────────────────────
-- 7. 형식 제약 — 옛 것과 새 것을 **둘 다** 받는다
-- ────────────────────────────────────────────────────────────────────────
-- ⚠️ 이 정규식은 `src/contracts/problemCode.contract.ts` 의 PROBLEM_CODE_ANY_PATTERN 을
--    **그대로 옮겨 적은 것**이고, `src/__tests__/unit/problemCode.test.ts` 가 글자까지 대조한다.
ALTER TABLE "problem" DROP CONSTRAINT IF EXISTS "problem_problem_code_format";
ALTER TABLE "problem" ADD CONSTRAINT "problem_problem_code_format"
  CHECK ("problem_code" ~ '^(?:(?:E[1-6]|J[1-3]|H(?:C1|C2|AL|M1|M2|PS|GE))[0-9]{4}-[A-Z][0-9]{2}-[0-9]{3}|(?:E[1-6]|J[1-3]|H(?:C1|C2|AL|M1|M2|PS|GE))[0-9]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4})$');

CREATE INDEX IF NOT EXISTS "problem_family_key_idx" ON "problem" ("unit_id", "family_key");
