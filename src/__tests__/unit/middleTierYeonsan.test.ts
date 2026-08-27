/**
 * 중등 밑단(`연산`) 판정 — **규칙 + 그 규칙이 지금 잡는 집합**을 같이 잠근다 (D-106).
 *
 * ## 왜 집합까지 적어 두나
 *
 * 판정은 발문 **모양**을 보므로, 어떤 유형의 발문이 「다음 식을 계산하시오」에서
 * 「$x=3$ 일 때 다음 식을 계산하시오」로 바뀌면 그 유형은 조용히 `기본` 으로 올라간다.
 * 규칙만 시험하면 그 순간이 안 보인다 — 규칙은 여전히 옳기 때문이다.
 * 그래서 **집합을 그대로 적어** 둔다. 바뀌면 여기가 빨개지고, 사람이 「의도한 변화인가」를
 * 한 번 본 뒤 목록을 고친다.
 *
 * ## 음성 대조군이 왜 필요한가
 *
 * 「연산을 잡는가」만 물으면 **「연산이 아닌 것을 연산이라 하는가」**는 구조적으로 안 보인다
 * (2026-08-20 「깨끗한 표본을 안 대면 지어냄이 0으로 보인다」). 그래서 아래 셋을 같이 댄다:
 *   ㉠ 지시문 하나뿐인데 **판별·선택**인 것 → 연산이 아니다
 *   ㉡ 같은 지시문인데 **응용·심화** 로 등록된 것 → 사다리를 안 옮긴다
 *   ㉢ 발문에 **상황·조건**이 있는 것 → 연산이 아니다
 */
import { describe, expect, it } from "vitest";

import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import { loneInstruction, resolveMiddleTier } from "@/lib/middle/tier";

const SEED = 20260825;

/**
 * 지금 `연산` 으로 판정되는 유형 — 873개를 전량 훑어 얻은 실측이다 (2026-08-25).
 * 근거와 고른 방법은 `src/lib/middle/tier.ts` 머리말.
 */
const YEONSAN_KEYS = [
  "1-1|문자의 사용과 식의 계산|01",
  "1-1|문자의 사용과 식의 계산|11",
  "1-1|소인수분해|03",
  "1-1|소인수분해|18",
  "1-1|일차방정식의 풀이|07",
  "1-1|일차방정식의 풀이|10",
  "1-1|정수와 유리수|16",
  "1-1|정수와 유리수의 계산|01",
  "1-1|정수와 유리수의 계산|02",
  "1-1|정수와 유리수의 계산|03",
  "1-1|정수와 유리수의 계산|12",
  "1-1|정수와 유리수의 계산|19",
  // 갈래 C 가 지은 확장 유형 둘 — 「다음을 계산하시오. ↵ $식$」 꼴이라 규칙이
  // 밑단으로 내린다. 「유리수의 곱셈」은 기존 6유형에 기본이 하나도 없어서
  // 일부러 이 모양으로 냈다(D-106 이 바라는 자리다).
  "1-1|정수와 유리수의 계산|70",
  "1-1|정수와 유리수의 계산|71",
  "2-1|다항식의 계산|01",
  "2-1|다항식의 계산|02",
  "2-1|다항식의 계산|06",
  "2-1|단항식의 계산|01",
  "2-1|단항식의 계산|03",
  "2-1|단항식의 계산|04",
  "2-1|단항식의 계산|10",
  "2-1|유리수와 순환소수|02",
  "3-1|근호를 포함한 식의 계산|01",
  "3-1|근호를 포함한 식의 계산|02",
  "3-1|근호를 포함한 식의 계산|10",
  "3-1|다항식의 곱셈|01",
  "3-1|다항식의 곱셈|03",
  "3-1|다항식의 곱셈|04",
  "3-1|다항식의 곱셈|05",
  "3-1|다항식의 인수분해|02",
  "3-1|다항식의 인수분해|03",
  "3-1|다항식의 인수분해|06",
  "3-1|다항식의 인수분해|07",
  "3-1|제곱근의 뜻과 성질|03",
  "3-1|제곱근의 뜻과 성질|06",
] as const;

describe("[D-106] 중등 밑단 — 연산 판정", () => {
  it("873유형에서 연산으로 판정되는 집합이 실측 그대로다", () => {
    const found = registeredTypes()
      .filter((t) => generateMiddleProblem(t.key, SEED).difficulty === "연산")
      .map((t) => t.key)
      .sort();
    expect(found).toEqual([...YEONSAN_KEYS].sort());
  });

  it("중등 네 갈래가 **전부** 채워진다 — 빈 갈래가 있으면 반 프리셋이 못 선다", () => {
    const count = new Map<string, number>();
    for (const t of registeredTypes()) {
      const d = generateMiddleProblem(t.key, SEED).difficulty;
      count.set(d, (count.get(d) ?? 0) + 1);
    }
    for (const tier of DIFFICULTY_LADDER) {
      expect(count.get(tier) ?? 0).toBeGreaterThan(0);
    }
    // 합이 등록 수와 같아야 한다 — 어느 갈래도 «모름» 으로 새지 않는다.
    expect([...count.values()].reduce((a, b) => a + b, 0)).toBe(
      registeredTypes().length,
    );
  });

  describe("규칙 자체 — 양성", () => {
    it("지시문 하나 + 계산 지시 + 기본 이면 연산으로 내린다", () => {
      expect(
        resolveMiddleTier("기본", "다음 식을 계산하시오.\n$3+5$", false),
      ).toBe("연산");
      expect(
        resolveMiddleTier("기본", "다음 식을 인수분해하시오.\n$x^2-1$", false),
      ).toBe("연산");
    });
  });

  describe("규칙 자체 — 음성 대조군", () => {
    it("㉠ 판별·선택 지시는 연산이 아니다", () => {
      for (const c of [
        "다음 수 중에서 소수의 개수를 구하시오.\n$2, 3, 4$",
        "다음 자료의 중앙값을 구하시오.\n$1, 2, 3$",
        "다음 보기 중 부등식인 것을 모두 고르시오.\n$x>1$",
      ]) {
        expect(resolveMiddleTier("기본", c, false)).toBe("기본");
      }
    });

    it("㉡ 같은 지시문이라도 응용·심화는 그대로 둔다 — 사다리를 옮기지 않는다", () => {
      const c = "다음 식을 계산하시오.\n$\sqrt{18}\div\sqrt{2}$";
      expect(resolveMiddleTier("응용", c, false)).toBe("응용");
      expect(resolveMiddleTier("심화", c, false)).toBe("심화");
    });

    it("㉢ 발문에 상황·조건이 있으면 연산이 아니다", () => {
      expect(
        resolveMiddleTier(
          "기본",
          "$x=2$ 일 때, 다음 식을 계산하시오.\n$3x$",
          false,
        ),
      ).toBe("기본");
      expect(
        resolveMiddleTier(
          "기본",
          "그림과 같은 삼각형에서 넓이를 계산하시오.\n$a=3$",
          true,
        ),
      ).toBe("기본");
    });

    it("㉣ 한글 문장이 둘이면 지시문 하나가 아니다", () => {
      expect(
        loneInstruction("어떤 수를 생각하였다. 다음 식을 계산하시오.\n$3+5$"),
      ).toBeNull();
    });
  });
});
