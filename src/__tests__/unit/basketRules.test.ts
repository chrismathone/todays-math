/**
 * **담기 바구니의 규칙 둘을 못 박는다** (원장님 확정 2026-09-04).
 *
 * 바구니 자체는 DB 를 물지만, **틀리면 지면이 거짓말을 하는 규칙**은 순수 함수로
 * 빼 두었다(`src/lib/basket/readBasket.ts`). 여기서 겨누는 것은 그 둘이다.
 *
 * ㉠ `countSpread` — 바가 말하는 「7개 · 심화중 3 · 응용 2」의 근원.
 * ㉡ `renumberForTest` — 바구니 번호(구멍이 있다)를 시험지 번호(1..N)로 옮기는 자리.
 *
 * ## 🔴 이 시험이 **못 보는 것** — 정직하게 적는다
 *
 * API 세 갈래(`/api/basket` GET·POST·DELETE, `/api/basket/test`)는 아직 시험이
 * 없다. `prismaTestDouble` 에 `basketItem` 모델이 없고, 그것을 얹는 것은 그 파일을
 * 쓰는 다른 트랙과 부딪히는 일이라 이 회차에 안 했다. 곧 **「멱등하게 담긴다」·
 * 「빈 바구니는 422」·「시험지를 만들면 비워진다」는 지금 코드에만 있고 아무도
 * 지키지 않는다.** 다음 회차의 일감이다.
 */
import { describe, expect, it } from "vitest";

import { DIFFICULTY_LADDER, type Difficulty } from "@/contracts/difficulty";
import { countSpread, renumberForTest } from "@/lib/basket/readBasket";

describe("담기 바구니 — 난이도 분포", () => {
  it("🔴 사다리 **전 칸**을 낸다 — 손 목록이 아니라 `DIFFICULTY_LADDER` 를 돈다", () => {
    // 2026-08-25 에 갈래를 넷으로 늘렸을 때 손으로 적은 배열이 셋으로 남아 새 갈래
    // `연산` 이 통째로 빠졌다. **타입은 배열 길이를 안 센다** — 그래서 여기서 센다.
    const { spread } = countSpread([]);
    expect(Object.keys(spread).sort()).toEqual([...DIFFICULTY_LADDER].sort());
    for (const d of DIFFICULTY_LADDER) expect(spread[d]).toBe(0);
  });

  it("난이도별로 센다", () => {
    const { spread, unknown } = countSpread([
      "기본",
      "기본",
      "응용",
    ] as Difficulty[]);
    expect(spread["기본"]).toBe(2);
    expect(spread["응용"]).toBe(1);
    expect(spread["심화상"]).toBe(0);
    expect(unknown).toBe(0);
  });

  it("🔴 난이도가 **없는** 문항은 어느 칸에도 안 넣고 `unknown` 으로 따로 센다", () => {
    // 어느 칸에 넣으면 그 칸이 부풀고, 아예 버리면 적힌 수의 합이 「담은 문항 N개」와
    // 안 맞아 원장님이 바를 못 믿게 된다.
    const { spread, unknown } = countSpread([
      "응용",
      null,
      null,
    ] as (Difficulty | null)[]);
    expect(unknown).toBe(2);
    expect(spread["응용"]).toBe(1);
    const inLadder = DIFFICULTY_LADDER.reduce((a, d) => a + spread[d], 0);
    expect(inLadder).toBe(1);
  });

  it("적힌 수의 **합이 담긴 수와 같다** — 어느 갈래가 와도", () => {
    const input = [
      "연산",
      "심화중",
      null,
      "심화상",
      "기본",
      null,
      "응용",
    ] as (Difficulty | null)[];
    const { spread, unknown } = countSpread(input);
    const sum = DIFFICULTY_LADDER.reduce((a, d) => a + spread[d], 0) + unknown;
    expect(sum).toBe(input.length);
  });
});

describe("담기 바구니 — 시험지 문항 번호", () => {
  it("🔴 바구니 번호에 **구멍이 있어도** 시험지는 $1..N$ 이다", () => {
    // 빼기는 그 행만 지운다(다시 매기면 「셋째로 담은 것」이 다른 문항을 가리킨다).
    // 그래서 바구니 자리는 {2, 5, 9} 처럼 남고, 시험지는 그래도 1·2·3 이어야 한다.
    const basket = [
      { id: "b", orderIndex: 2 },
      { id: "e", orderIndex: 5 },
      { id: "i", orderIndex: 9 },
    ];
    expect(renumberForTest(basket)).toEqual([
      { item: basket[0], orderIndex: 1 },
      { item: basket[1], orderIndex: 2 },
      { item: basket[2], orderIndex: 3 },
    ]);
  });

  it("담은 **차례**를 지킨다 — 뒤섞지 않는다", () => {
    const order = renumberForTest(["가", "나", "다"]).map((r) => r.item);
    expect(order).toEqual(["가", "나", "다"]);
  });

  it("빈 바구니는 빈 목록이다 (라우트가 그 앞에서 422 로 막는다)", () => {
    expect(renumberForTest([])).toEqual([]);
  });
});
