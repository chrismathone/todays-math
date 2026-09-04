/**
 * **담기 바구니 — 화면이 서버와 이야기하는 자리 한 곳.**
 *
 * `ProblemBank` 가 `fetch` 를 직접 쓰면 응답 모양을 아는 곳이 늘고, 그러면 계약이
 * 바뀔 때 한쪽만 고쳐도 아무도 모른다(이 저장소가 되풀이해 데인 자리다).
 * 네 갈래(읽기·담기·빼기·비우기)가 **전부 «지운 뒤의 바구니»를 돌려받으므로**
 * 화면은 응답을 그대로 상태에 넣기만 하면 된다 — 다시 세지 않는다.
 */
import type { BasketItem } from "@/contracts/basket.contract";
import type { Difficulty } from "@/contracts/difficulty";

export type BasketState = {
  items: BasketItem[];
  spread: Record<Difficulty, number>;
  unknown: number;
  total: number;
};

/** 서버가 준 그대로. 화면이 분포를 다시 세지 않는다(바가 거짓말하지 않게). */
type BasketBody = { data: BasketState };

async function read(res: Response): Promise<BasketState> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message ?? `바구니 요청 실패 (${res.status})`);
  }
  return ((await res.json()) as BasketBody).data;
}

export async function loadBasket(): Promise<BasketState> {
  return read(await fetch("/api/basket", { cache: "no-store" }));
}

export async function addToBasket(problemId: string): Promise<BasketState> {
  return read(
    await fetch("/api/basket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemId }),
    }),
  );
}

export async function removeFromBasket(
  problemId: string,
): Promise<BasketState> {
  return read(
    await fetch(`/api/basket?problemId=${encodeURIComponent(problemId)}`, {
      method: "DELETE",
    }),
  );
}

export async function clearBasket(): Promise<BasketState> {
  return read(await fetch("/api/basket", { method: "DELETE" }));
}

/** 담은 것으로 시험지 만들기 — 만들어진 시험지 id 를 돌려준다. */
export async function makeTestFromBasket(input: {
  classId: string;
  testDate: string;
}): Promise<{ testId: string; problemCount: number }> {
  const res = await fetch("/api/basket/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
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
