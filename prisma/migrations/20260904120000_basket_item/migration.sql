-- 담기 바구니 (2026-09-04, 원장님 확정) — 계약: src/contracts/basket.contract.ts
--
-- 🔴 `problem_id` 는 CASCADE 다. 바구니는 «고르는 중»인 임시 목록이므로 문항이
--    사라지면 같이 사라져야 한다. RESTRICT 로 두면 문항 하나 때문에 적재 되돌리기가
--    통째로 막힌다(2026-09-04 에 98X 24행을 지울 때 겪은 자리).
CREATE TABLE "basket_item" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "problem_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "basket_item_pkey" PRIMARY KEY ("id")
);

-- 같은 문항을 두 번 담을 수 없다 — 담기는 멱등이다.
CREATE UNIQUE INDEX "basket_item_user_id_problem_id_key"
    ON "basket_item"("user_id", "problem_id");

-- 바구니를 담은 차례대로 읽는다.
CREATE INDEX "basket_item_user_id_order_index_idx"
    ON "basket_item"("user_id", "order_index");

ALTER TABLE "basket_item" ADD CONSTRAINT "basket_item_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "basket_item" ADD CONSTRAINT "basket_item_problem_id_fkey"
    FOREIGN KEY ("problem_id") REFERENCES "problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
