/**
 * **담기 바구니 — 화면이 서버와 이야기하는 자리 한 곳.**
 *
 * `ProblemBank` 가 `fetch` 를 직접 쓰면 응답 모양을 아는 곳이 늘고, 그러면 계약이
 * 바뀔 때 한쪽만 고쳐도 아무도 모른다(이 저장소가 되풀이해 데인 자리다).
 * 네 갈래(읽기·담기·빼기·비우기)가 **전부 «지운 뒤의 바구니»를 돌려받으므로**
 * 화면은 응답을 그대로 상태에 넣기만 하면 된다 — 다시 세지 않는다.
 */
import type { QuestionSelection } from "@/contracts/questionFormats.contract";
import { requireQuestionRead } from "./questionSelectionClient";
import type { BasketResponse } from "@/contracts/basket.contract";
import { DIFFICULTY_LADDER, type Difficulty } from "@/contracts/difficulty";

export type BasketState = BasketResponse["data"];

/**
 * 빈 바구니 — **한 곳에서만 짓는다.**
 *
 * 🔴 화면이 「비었다」를 손으로 지으면 그 자리가 규칙의 두 번째 벌이 된다. 실제로
 *    시험지를 만든 뒤 상태를 비울 때 **옛 `spread` 를 그대로 물려주고** 있었다 —
 *    바가 안 보이는 상태라 티가 안 났을 뿐, 「담긴 수 0인데 분포는 5」였다.
 *    그리고 갈래가 늘면 손 목록은 조용히 낡는다(D-106 에서 겪은 그 자리).
 */
export const EMPTY_BASKET: BasketState = {
  countUnit: "question",
  version: 2,
  conflictCount: 0,
  items: [],
  spread: Object.fromEntries(DIFFICULTY_LADDER.map((d) => [d, 0])) as Record<
    Difficulty,
    number
  >,
  total: 0,
};

/** 서버가 준 그대로. 화면이 분포를 다시 세지 않는다(바가 거짓말하지 않게). */
type BasketBody = { data: BasketState };

async function read(
  res: Response,
  identity?: "question",
): Promise<BasketState> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message ?? `바구니 요청 실패 (${res.status})`);
  }
  const { basketResponseSchema } = await import("@/contracts/basket.contract");
  const body = basketResponseSchema.parse(await res.json()) as BasketBody;
  if (identity === "question") requireQuestionRead(body.data);
  return body.data;
}

export async function loadBasket(identity?: "question"): Promise<BasketState> {
  return read(
    await fetch(`/api/basket${identity ? "?identity=question" : ""}`, {
      cache: "no-store",
    }),
    identity,
  );
}

export async function addToBasket(
  problemId: string,
  selection?: QuestionSelection,
): Promise<BasketState> {
  const identity = selection ? "question" : undefined;
  return read(
    await fetch("/api/basket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemId,
        ...(selection ? { identity, selection } : {}),
      }),
    }),
    identity,
  );
}

export async function removeFromBasket(
  problemId: string,
  identity?: "question",
): Promise<BasketState> {
  return read(
    await fetch(
      `/api/basket?${identity ? "identity=question&" : ""}problemId=${encodeURIComponent(problemId)}`,
      { method: "DELETE" },
    ),
    identity,
  );
}
export async function clearBasket(identity?: "question"): Promise<BasketState> {
  return read(
    await fetch(`/api/basket${identity ? "?identity=question" : ""}`, {
      method: "DELETE",
    }),
    identity,
  );
}

export async function changeBasketFormat(
  fromProblemId: string,
  selection: QuestionSelection,
): Promise<BasketState> {
  return read(
    await fetch("/api/basket", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromProblemId, selection }),
    }),
    "question",
  );
}

/** 담은 것으로 시험지 만들기 — 만들어진 시험지 id 를 돌려준다. */
export async function makeTestFromBasket(input: {
  classId: string;
  testDate: string;
  selections?: QuestionSelection[];
  recent?: boolean;
}): Promise<{ testId: string; problemCount: number }> {
  const res = await fetch("/api/basket/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      ...(input.selections !== undefined ? { identity: "question" } : {}),
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      body?.error?.message ?? `시험지를 만들지 못했습니다 (${res.status})`,
    );
  }
  return (
    (await res.json()) as { data: { testId: string; problemCount: number } }
  ).data;
}
