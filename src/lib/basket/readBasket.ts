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
 * ## 🔴 `unknown` 칸을 **뗐다** (원장님 지시 2026-09-05)
 *
 * 처음엔 「난이도가 안 적힌 문항」을 따로 세는 칸을 두고, 그 까닭을
 * 「`difficulty` 가 비어 있는 문항이 실제로 있다(기출 이관분)」고 적었다.
 * **거짓이었다.** `Problem.difficulty` 는 `20260813014714_init` 부터 지금까지
 * **NOT NULL** 이고(그 뒤 마이그레이션은 enum 값 이름만 바꿨다), 계약
 * `problemSchema.difficulty` 도 필수다 — 그 칸은 **구조적으로 늘 0** 이었고,
 * 화면의 「난이도 없음 N」은 한 번도 그려질 수 없었다.
 *
 * 늘 0 인 칸은 「깨끗하다」와 「셀 것이 없다」를 안 가른다. 그래서 뗐다.
 * 대신 **모르는 갈래가 오면 던진다**(아래 `countSpread`) — 조용히 새 키를 만들면
 * 「적힌 수의 합 == 담긴 수」가 맞는 채로 분포만 틀린다. 난이도를 나중에
 * nullable 로 바꾸는 날, 이 함수가 **그 자리에서 멈춰** 다시 보게 한다.
 */
import { DIFFICULTY_LADDER, type Difficulty } from "@/contracts/difficulty";
import { db } from "@/lib/db";
import { serializeProblem } from "@/lib/serializers";
import type { Prisma } from "@prisma/client";
import { questionIdOf } from "@/lib/problem/questionIdentity";
import { withQuestionMetadata } from "@/lib/problem/questionQueries";

export type BasketData = {
  items: {
    orderIndex: number;
    problem: ReturnType<typeof serializeProblem>;
    questionId?: string;
    conflictProblemIds?: string[];
  }[];
  spread: Record<Difficulty, number>;
  total: number;
  countUnit?: "question";
  version?: 2;
  conflictCount?: number;
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
 * ㉡ **모르는 갈래는 조용히 안 삼킨다 — 던진다.** `spread[d] += 1` 은 없는 키도
 *    만들어 낸다. 그러면 「적힌 수의 합 == 담긴 수」는 그대로 맞는데 **분포만 틀리고**,
 *    바는 아무 말도 안 한다. 지금 그런 값은 올 수 없지만(NOT NULL + 계약),
 *    「올 수 없다」를 믿고 침묵하면 그 전제가 깨지는 날 아무도 모른다.
 */
export function countSpread(difficulties: readonly Difficulty[]): {
  spread: Record<Difficulty, number>;
} {
  const spread = Object.fromEntries(
    DIFFICULTY_LADDER.map((d) => [d, 0]),
  ) as Record<Difficulty, number>;
  for (const d of difficulties) {
    if (!(d in spread)) {
      throw new Error(
        `[바구니] 사다리에 없는 난이도: ${JSON.stringify(d)} — 조용히 새 칸을 만들지 않는다`,
      );
    }
    spread[d] += 1;
  }
  return { spread };
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

export async function readBasket(
  userId: string,
  questionView = false,
  client: Pick<Prisma.TransactionClient, "basketItem" | "problem"> = db,
): Promise<BasketData> {
  const rows = await client.basketItem.findMany({
    where: { userId },
    orderBy: { orderIndex: "asc" },
    include: { problem: true },
  });

  if (questionView) {
    const annotated = await withQuestionMetadata(
      rows.map((r) => r.problem),
      client,
    );
    const groups = new Map<
      string,
      { orderIndex: number; problem: (typeof annotated)[number]; ids: string[] }
    >();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i],
        problem = annotated[i],
        key = questionIdOf(problem);
      const group = groups.get(key);
      if (group) group.ids.push(problem.id);
      else
        groups.set(key, {
          orderIndex: row.orderIndex,
          problem,
          ids: [problem.id],
        });
    }
    const values = [...groups.entries()];
    return {
      items: values.map(([questionId, g]) => ({
        orderIndex: g.orderIndex,
        problem: {
          ...serializeProblem(g.problem),
          questionId,
          questionFormats: g.problem.questionFormats,
        },
        questionId,
        ...(g.ids.length > 1 ? { conflictProblemIds: g.ids } : {}),
      })),
      ...countSpread(
        values
          .filter(([, g]) => g.ids.length === 1)
          .map(([, g]) => g.problem.difficulty as Difficulty),
      ),
      total: groups.size,
      countUnit: "question",
      version: 2,
      conflictCount: values.filter(([, g]) => g.ids.length > 1).length,
    };
  }

  const { spread } = countSpread(
    rows.map((row) => row.problem.difficulty as Difficulty),
  );

  return {
    items: rows.map((row) => ({
      orderIndex: row.orderIndex,
      problem: serializeProblem(row.problem),
    })),
    spread,
    total: rows.length,
  };
}
