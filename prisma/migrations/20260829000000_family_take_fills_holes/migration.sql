-- ────────────────────────────────────────────────────────────────────────
-- `problem_family_take` 가 **구멍을 메운다** (2026-08-29)
--
-- ## 무엇이 잘못됐나
--
-- 다음 자리를 `COUNT(*) + 1` 로 정하고 있었다. 그 식은 **쓰는 자리가 1..N 으로
-- 빈틈없이 이어져 있다**고 가정한다. 무리가 하나라도 지워지면 구멍이 생기고,
-- 그때부터 그 단원은 **영원히 막힌다**:
--
--     자리 {5,6,7,8} · COUNT = 4  →  5 번을 쓰려 한다  →  이미 있다  →  unique_violation
--     재시도해도 COUNT 는 그대로 4  →  **같은 5 번을 30 번 다시 시도**  →  던진다
--
-- 재시도 고리가 「다른 트랜잭션이 먼저 가져갔다」만 상정해서, 자기 계산이
-- 틀린 경우에는 30 번을 똑같이 틀린다.
--
-- ## 어떻게 드러났나 — 되돌리기가 구멍을 판다
--
-- 2026-08-29 초등 재적재에서 실제로 났다. `load-engine-problems.ts --revert` 는
-- **문항이 하나도 안 남은 무리만** 지운다(남은 무리를 지우면 아류 번호가 겹치니
-- 그게 맞다). 그런데 옛 형식 적재본 1,751행이 자리 5~8 을 붙들고 있었고 1~4 만
-- 비워졌다. 그 결과 **112 개 단원**이 한꺼번에 막혔고, 12,762 행을 넣던 적재가
-- 6,438 행에서 죽었다.
--
-- ## 고침 — 가장 작은 빈자리를 쓴다
--
-- 무리가 N 개면 빈자리는 반드시 1..N+1 안에 있다(비둘기집). 그 범위에서 가장
-- 작은 빈자리를 고른다. 그러면 ⑴ 구멍이 메워지고 ⑵ **재시도가 뜻을 갖는다** —
-- 남이 가져간 자리는 다음 회차에서 «찬 자리»로 보이므로 그다음을 고른다.
--
-- ⚠️ 자리를 **다시 쓰는** 것이 된다. 그래도 좋은 이유: 자리를 비우는 유일한 길이
--    「그 무리의 문항이 하나도 안 남았을 때」이고, 그때는 그 코드를 달고 있던
--    문항도 DB 에 없다. 되돌리기가 「자국을 안 남긴다」고 적어 둔 것과 같은 뜻이다.
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

    -- 🔴 **가장 작은 빈자리.** `COUNT(*) + 1` 은 구멍이 있으면 영원히 같은 자리를
    --    다시 시도한다. 무리가 N 개면 빈자리는 1..N+1 안에 반드시 있다.
    SELECT MIN(g.n) INTO v_n
      FROM generate_series(
             1,
             (SELECT COUNT(*) + 1 FROM "problem_family" WHERE "unit_id" = p_unit_id)::int
           ) AS g(n)
     WHERE NOT EXISTS (
       SELECT 1 FROM "problem_family" f
        WHERE f."unit_id" = p_unit_id
          AND f."family_code" = "problem_family_code"(g.n)
     );

    BEGIN
      INSERT INTO "problem_family" ("unit_id", "family_key", "family_code")
      VALUES (p_unit_id, p_key, "problem_family_code"(v_n));
    EXCEPTION WHEN unique_violation THEN
      -- 다른 트랜잭션이 먼저 같은 자리를 가져갔다. 다시 읽는다 —
      -- **조용히 아무 코드나 쓰지 않는다.** 겹친 코드는 다른 문항을 가리킨다.
      -- 이제 다음 회차는 그 자리를 «찼다»고 보므로 **다른 자리**를 고른다.
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
