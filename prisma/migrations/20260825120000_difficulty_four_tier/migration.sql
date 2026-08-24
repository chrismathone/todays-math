-- 난이도 축을 **하나로** 합친다 — D-106 (원장님 확정 2026-08-25).
--
--   연산 < 기본 < 응용 < 심화
--
-- ## 왜
--
-- 축이 둘이었다. 초등 엔진은 D-71/72 의 4단(연산·기본·응용·심화)으로 문항을 내는데
-- DB·화면은 3단(easy·mid·hard)이라, 적재기가 `연산`과 `기본`을 **둘 다 easy 로 접었다**.
-- 원장님이 문제은행 화면에서 그것을 보시고 「우리 엔진의 난이도와 통일시켜」라고 하셨다.
-- 접힌 값은 되돌릴 수 없다 — 화면에서 「이건 연산인가 기본인가」를 물을 방법이 없었다.
--
-- ## 왜 새 값을 «더하지» 않고 **이름을 바꾸나**
--
-- 값을 넷 더하면 enum 이 일곱이 되고, 그때부터 모든 화면·필터·배분이 「옛 셋은 어떻게
-- 보여 주나」를 **영영** 안고 간다. 그런데 옛 셋을 단 행은 45,374건이 전부이고 그것은
-- 통째로 **바깥벽 격리 대상**이다(실측: 전량 `pool='private'` · `review_status='rejected'` ·
-- `direct_use_allowed=false`). 앱의 읽기는 `pool='shared'` 로 좁혀져 있으므로 **화면에
-- 나올 수 없는 값**이다. 그런 값을 위해 축을 일곱으로 두는 것은 값이 아니라 짐이다.
--
-- `ALTER TYPE … RENAME VALUE` 는 **라벨만** 바꾼다 — 행을 한 줄도 UPDATE 하지 않는다.
-- 그래서 바깥벽 트리거(`enforce_registered_problem_outer_wall`, BEFORE UPDATE)가 **아예
-- 발동하지 않는다.** 45,374건을 UPDATE 로 옮기려 했으면 벽을 내려야 했고, 그 벽은
-- 원장님이 세우라고 하신 것이다.
--
-- ## 사다리를 어떻게 맞췄나
--
--   easy → 기본 · mid → 응용 · hard → 심화
--
-- **연산은 새 밑단이라 옛 행이 아무도 주장하지 않는다** — 그게 옳다. 옛 3단은
-- `mapDifficultyLabel` 이 기출의 상/중/하 라벨과 배점에서 뽑은 값이라 「순수 계산」이라는
-- 갈래를 애초에 가른 적이 없다. 없던 것을 있다고 적지 않는다.
--
-- 검산 근거(2026-08-25 실측): difficulty 를 쓰는 기본값·함수·CHECK 제약이 **하나도 없다**.
-- 색인은 `problem_unit_id_difficulty_…_idx` 하나뿐이고 라벨 변경에 영향받지 않는다.

ALTER TYPE "difficulty" RENAME VALUE 'easy' TO '기본';
ALTER TYPE "difficulty" RENAME VALUE 'mid' TO '응용';
ALTER TYPE "difficulty" RENAME VALUE 'hard' TO '심화';

-- 밑단이므로 `BEFORE '기본'` — `ORDER BY difficulty` 가 사다리 순서 그대로 나온다.
ALTER TYPE "difficulty" ADD VALUE '연산' BEFORE '기본';

-- ── 반의 난이도 배분(jsonb) ─────────────────────────────────────────────
--
-- ⚠️ **원장님이 손댄 반과 공장 기본값인 반을 가른다.**
--    실측(2026-08-25): 63개 반이 **전부** `{easy:3, mid:4, hard:1}` — 아무도 안 고쳤다.
--    그래도 규칙은 「공장 기본값일 때만 새 기본값으로 갈아 끼운다」로 쓴다. 나중에
--    원장님이 고친 반이 생긴 뒤 이 마이그레이션을 다시 읽는 사람이 「그때 내 값이
--    덮였나」를 묻지 않게 하려는 것이다.
--
-- 새 기본값은 초등 엔진의 **중위반 프리셋**(D-71: 연산15·기본40·응용30·심화15 %)을
-- 8문항에 최대잉여로 나눈 값이다 — 1.2 / 3.2 / 2.4 / 1.2 → 1 / 3 / 3 / 1 (합 8).
UPDATE "class"
   SET "difficulty_ratio" = jsonb_build_object('연산', 1, '기본', 3, '응용', 3, '심화', 1)
 WHERE "difficulty_ratio" = '{"easy":3,"mid":4,"hard":1}'::jsonb;

-- 손댄 반이 있다면 사다리만 그대로 옮기고 **연산은 0** 으로 둔다 — 원장님이 정할 값을
-- 우리가 지어내지 않는다.
UPDATE "class"
   SET "difficulty_ratio" = jsonb_build_object(
         '연산', 0,
         '기본', COALESCE(("difficulty_ratio"->>'easy')::int, 0),
         '응용', COALESCE(("difficulty_ratio"->>'mid')::int, 0),
         '심화', COALESCE(("difficulty_ratio"->>'hard')::int, 0))
 WHERE "difficulty_ratio" ? 'easy'
    OR "difficulty_ratio" ? 'mid'
    OR "difficulty_ratio" ? 'hard';

-- 분석 보고서의 난이도 분포(jsonb)도 같은 열쇠를 쓴다. 실측 0건이지만 규칙은 남긴다.
UPDATE "analysis_report"
   SET "difficulty_distribution" = jsonb_build_object(
         '연산', jsonb_build_object('correct', 0, 'total', 0),
         '기본', COALESCE("difficulty_distribution"->'easy', jsonb_build_object('correct', 0, 'total', 0)),
         '응용', COALESCE("difficulty_distribution"->'mid', jsonb_build_object('correct', 0, 'total', 0)),
         '심화', COALESCE("difficulty_distribution"->'hard', jsonb_build_object('correct', 0, 'total', 0)))
 WHERE "difficulty_distribution" ? 'easy'
    OR "difficulty_distribution" ? 'mid'
    OR "difficulty_distribution" ? 'hard';
