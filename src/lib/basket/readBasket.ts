/**
 * **바구니를 읽는 자리 — 한 곳뿐이다.**
 *
 * 담기·빼기·비우기·조회가 전부 이것을 부른다. 규칙이 두 벌이 되면 「담고 난 뒤의
 * 분포」와 「새로고침한 뒤의 분포」가 갈릴 수 있고, 그건 바가 거짓말을 한다는 뜻이다.
 *
 * ## 🔴 분포를 서버가 세는 까닭
 *
 * 바는 「7개 · 심화중 3 · 응용 2 · 기본 2」를 말한다(Hi-fi ㉡, 원장님 확정). 화면이
 * 그것을 따로 세면 **담긴 것의 일부만 받아 온 쪽**에서 조용히 다른 수가 나온다.
 * 세는 곳과 보이는 곳이 갈리면 둘 다 눈이 먼다.
 *
 * ## 난이도가 없는 문항을 «0» 으로 뭉개지 않는다
 *
 * `difficulty` 가 비어 있는 문항이 실제로 있다(기출 이관분). 그것을 분포의 어느 칸에
 * 넣으면 그 칸이 부풀고, 아예 빼면 합이 `total` 과 안 맞는다. 그래서 **`unknown` 으로
 * 따로 센다** — 「0 은 «없음»과 «못 셈»을 안 가른다」의 같은 자리다.
 */
import { DIFFICULTY_LADDER, type Difficulty } from "@/contracts/difficulty";
import { db } from "@/lib/db";
import { serializeProblem } from "@/lib/serializers";

export type BasketData = {
  items: { orderIndex: number; problem: ReturnType<typeof serializeProblem> }[];
  spread: Record<Difficulty, number>;
  unknown: number;
  total: number;
};

/**
 * **난이도 분포를 세는 규칙 — 순수 함수다.**
 *
 * DB 를 안 물어야 시험이 이 규칙을 직접 겨눌 수 있다. 지키는 것 둘:
 *
 * ㉠ **사다리 전 칸을 $0$ 으로 채운다.** 빠뜨리면 받는 쪽이 「그 칸이 없다」와
 *    「그 칸이 0이다」를 못 가른다. 그리고 손으로 나열하지 않고
 *    `DIFFICULTY_LADDER` 를 도므로 **새 갈래가 붙으면 여기도 따라온다** —
 *    2026-08-25 에 손 목록이 셋으로 남아 새 갈래 `연산` 이 통째로 빠진 자리다.
 * ㉡ **난이도가 없는 문항을 어느 칸에도 안 넣는다.** 넣으면 그 칸이 부풀고,
 *    아예 버리면 적힌 수의 합이 「담은 문항 N개」와 안 맞아 바를 못 믿게 된다.
 *    그래서 `unknown` 으로 따로 센다.
 */
export function countSpread(difficulties: readonly (Difficulty | null)[]): {
  spread: Record<Difficulty, number>;
  unknown: number;
} {
  const spread = Object.fromEntries(
    DIFFICULTY_LADDER.map((d) => [d, 0]),
  ) as Record<Difficulty, number>;
  let unknown = 0;
  for (const d of difficulties) {
    if (d === null) unknown += 1;
    else spread[d] += 1;
  }
  return { spread, unknown };
}

/**
 * **바구니 차례 → 시험지 문항 번호.**
 *
 * 🔴 바구니의 `orderIndex` 는 **1..N 이 아니다.** 빼기가 구멍을 내고, 그 구멍을
 *    메우지 않는 것이 일부러 한 결정이다(메우면 「셋째로 담은 것」이 다른 문항을
 *    가리킨다). 시험지의 문항 번호는 1..N 이어야 하므로 **담은 차례대로 다시 센다.**
 *
 * 순수 함수인 까닭은 시험이 「구멍이 있어도 1..N 이 나오는가」를 DB 없이 물어야
 * 하기 때문이다.
 */
export function renumberForTest<T>(
  itemsInBasketOrder: readonly T[],
): { item: T; orderIndex: number }[] {
  return itemsInBasketOrder.map((item, index) => ({
    item,
    orderIndex: index + 1,
  }));
}

export async function readBasket(userId: string): Promise<BasketData> {
  const rows = await db.basketItem.findMany({
    where: { userId },
    orderBy: { orderIndex: "asc" },
    include: { problem: true },
  });

  const { spread, unknown } = countSpread(
    rows.map((row) => row.problem.difficulty as Difficulty | null),
  );

  return {
    items: rows.map((row) => ({
      orderIndex: row.orderIndex,
      problem: serializeProblem(row.problem),
    })),
    spread,
    unknown,
    total: rows.length,
  };
}
