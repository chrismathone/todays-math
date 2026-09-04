/**
 * **담기 바구니의 규칙 둘을 못 박는다** (원장님 확정 2026-09-04).
 *
 * 바구니 자체는 DB 를 물지만, **틀리면 지면이 거짓말을 하는 규칙**은 순수 함수로
 * 빼 두었다(`src/lib/basket/readBasket.ts`). 여기서 겨누는 것은 그 둘이다.
 *
 * ㉠ `countSpread` — 바가 말하는 「7개 · 심화중 3 · 응용 2」의 근원.
 * ㉡ `renumberForTest` — 바구니 번호(구멍이 있다)를 시험지 번호(1..N)로 옮기는 자리.
 *
 * ## 이 시험이 **안 보는 것** (2026-09-05 갱신)
 *
 * 라우트 네 갈래는 이제 `src/__tests__/api/basket.test.ts` 가 본다(멱등·최댓값+1·
 * 빈 바구니 422·비워짐·원자성…). 여기는 **DB 없이 서는 규칙**만 겨눈다 — 그래야
 * 「분포를 세는 규칙」과 「번호를 옮기는 규칙」이 라우트를 안 거치고도 갈린다.
 */
import { describe, expect, it } from "vitest";

import { DIFFICULTY_LADDER, type Difficulty } from "@/contracts/difficulty";
import { problemSchema } from "@/contracts/problem.contract";
import { countSpread, renumberForTest } from "@/lib/basket/readBasket";
import { MOCK_PROBLEMS } from "@/mocks/data";

describe("담기 바구니 — 난이도 분포", () => {
  it("🔴 사다리 **전 칸**을 낸다 — 손 목록이 아니라 `DIFFICULTY_LADDER` 를 돈다", () => {
    // 2026-08-25 에 갈래를 넷으로 늘렸을 때 손으로 적은 배열이 셋으로 남아 새 갈래
    // `연산` 이 통째로 빠졌다. **타입은 배열 길이를 안 센다** — 그래서 여기서 센다.
    const { spread } = countSpread([]);
    expect(Object.keys(spread).sort()).toEqual([...DIFFICULTY_LADDER].sort());
    for (const d of DIFFICULTY_LADDER) expect(spread[d]).toBe(0);
  });

  it("난이도별로 센다", () => {
    const { spread } = countSpread(["기본", "기본", "응용"] as Difficulty[]);
    expect(spread["기본"]).toBe(2);
    expect(spread["응용"]).toBe(1);
    expect(spread["심화상"]).toBe(0);
  });

  it("🔴 사다리에 **없는** 갈래가 오면 조용히 새 칸을 만들지 않고 던진다", () => {
    // `spread[d] += 1` 은 없는 키도 만들어 낸다. 그러면 「적힌 수의 합 == 담긴 수」는
    // 그대로 맞는데 **분포만 틀리고** 바는 아무 말도 안 한다.
    // (`unknown` 칸을 뗀 자리다 — 원장님 지시 2026-09-05. 아래 describe 참조.)
    expect(() => countSpread(["최상" as Difficulty])).toThrow(
      /사다리에 없는 난이도/,
    );
    // 양성 대조 — 멀쩡한 값에는 안 던진다(그래야 위 단정이 «늘 던진다»가 아니다).
    expect(() => countSpread(["기본"] as Difficulty[])).not.toThrow();
  });

  it("적힌 수의 **합이 곧 담긴 수다** — 어느 갈래가 와도", () => {
    const input = [
      "연산",
      "심화중",
      "심화상",
      "기본",
      "응용",
      "심화하",
      "기본",
    ] as Difficulty[];
    const { spread } = countSpread(input);
    const sum = DIFFICULTY_LADDER.reduce((a, d) => a + spread[d], 0);
    expect(sum).toBe(input.length);
  });
});

describe("담기 바구니 — `unknown` 칸을 **뗀 근거**", () => {
  /**
   * 🔴 처음 이 축을 넣으며 「난이도가 비어 있는 문항이 실제로 있다(기출 이관분)」고
   *    적었다. **거짓이었다.** `Problem.difficulty` 는 `20260813014714_init` 부터
   *    NOT NULL 이고 계약도 그것을 요구한다 — 그 칸은 구조적으로 늘 0 이었고,
   *    화면의 「난이도 없음 N」은 한 번도 그려질 수 없었다. 그래서 뗐다.
   *
   * **뗀 근거를 시험으로 남긴다.** 주석으로만 두면 다음 사람이 「분포에 난이도 없는
   * 문항이 빠졌다」고 보고 그 칸을 **다시 만든다.** 난이도를 nullable 로 바꾸는 날
   * 이 시험이 빨개져서 그때 다시 보게 한다.
   */
  it("🔴 계약이 난이도를 **요구한다** — 그래서 «난이도 없는 문항»은 올 수 없다", () => {
    const sample = MOCK_PROBLEMS[0]!;
    // 양성 대조 — 이것이 통과해야 아래 단정이 «스키마가 원래 다 거부한다»가 아니다.
    expect(
      problemSchema.safeParse(sample).success,
      "픽스처가 계약을 안 지킨다",
    ).toBe(true);
    expect(
      problemSchema.safeParse({ ...sample, difficulty: null }).success,
    ).toBe(false);
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
