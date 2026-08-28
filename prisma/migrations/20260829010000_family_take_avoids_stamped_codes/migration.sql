-- ────────────────────────────────────────────────────────────────────────
-- 빈자리를 고를 때 **이미 문항에 찍힌 코드**도 피한다 (2026-08-29)
--
-- ## 앞 회차가 반만 고쳤다
--
-- 같은 날 `20260829000000_family_take_fills_holes` 로 「가장 작은 빈자리」를 고르게
-- 했다. 구멍은 메워졌는데 **바로 다음 적재가 다른 곳에서 죽었다**:
--
--     Unique constraint failed on the fields: (`problem_code`)
--
-- ## 왜 — 무리 행 없이 «코드만» 남은 자리가 있다
--
-- 실측 **448 자리**가 그렇다. 이렇게 생긴다:
--
--   ⑴ 2026-08-27 에 초등 `family_key` 를 옛 난이도 키에서 문형 키로 옮겼다
--      (`migrate-elem-family-keys.ts`, 1,751행). 문항의 `problem_code` 는
--      **안 바뀐다** — 한 번 붙은 코드는 못 바꾸는 것이 규칙이다(불변 트리거).
--   ⑵ 그래서 옛 키로 선 `problem_family` 행은 「그 키를 가진 문항이 하나도 없다」가
--      되어 **빈 무리로 보인다.**
--   ⑶ 되돌리기가 빈 무리를 치운다. 그런데 그 자리의 코드를 단 문항은 **살아 있다** —
--      `E50402-A01-003` 은 그대로인데 `(단원, A01)` 무리 행만 사라진다.
--
-- 옛 식(`COUNT(*)+1`)은 자리를 **뒤로만** 갔기에 이 구멍을 우연히 밟지 않았다.
-- 「가장 작은 빈자리」로 바꾸는 순간 정확히 그 자리를 다시 내준다.
--
-- ## 고침 — «찼다»의 뜻을 넓힌다
--
-- 자리가 찼다는 것은 **⑴ 무리 행이 있거나 ⑵ 그 코드를 단 문항이 있다**는 뜻이다.
-- 둘 다 피해서 가장 작은 빈자리를 고른다. 비둘기집도 그 합집합 크기로 센다.
--
-- ⚠️ `NOT IN` 을 안 쓴다. 옛 형식 코드(`J30103-4NSK`)는 정규식에 안 걸려 NULL 이
--    되는데, `NOT IN` 은 목록에 NULL 이 하나만 있어도 **전부 거짓**이 된다 —
--    에러가 아니라 「빈자리가 없다」는 조용한 오답이다. `NOT EXISTS` 는 안 그렇다.
--
-- ⚠️ 비싸 보이지만 **무리를 새로 만들 때만** 돈다. 이미 있는 무리는 위에서
--    `EXIT` 로 빠져나간다(문항마다가 아니라 문항류마다 한 번).
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

    -- 🔴 «찬 자리» = 무리 행이 있는 자리 **∪** 그 코드를 단 문항이 있는 자리.
    --    둘째를 빼면 448 자리에서 `problem_code` 가 부딪힌다(실측).
    WITH used AS (
      SELECT f."family_code"::text AS code
        FROM "problem_family" f
       WHERE f."unit_id" = p_unit_id
      UNION
      SELECT substring(p."problem_code" from '-([A-Z][0-9]{2})-[0-9]{3}$')
        FROM "problem" p
       WHERE p."unit_id" = p_unit_id
         AND p."problem_code" ~ '-[A-Z][0-9]{2}-[0-9]{3}$'
    )
    SELECT MIN(g.n) INTO v_n
      FROM generate_series(1, (SELECT COUNT(*) + 1 FROM used)::int) AS g(n)
     WHERE NOT EXISTS (
       SELECT 1 FROM used u WHERE u.code = "problem_family_code"(g.n)
     );

    BEGIN
      INSERT INTO "problem_family" ("unit_id", "family_key", "family_code")
      VALUES (p_unit_id, p_key, "problem_family_code"(v_n));
    EXCEPTION WHEN unique_violation THEN
      -- 다른 트랜잭션이 먼저 같은 자리를 가져갔다. 다시 읽는다 —
      -- **조용히 아무 코드나 쓰지 않는다.** 겹친 코드는 다른 문항을 가리킨다.
      -- 다음 회차는 그 자리를 «찼다»고 보므로 **다른 자리**를 고른다.
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
