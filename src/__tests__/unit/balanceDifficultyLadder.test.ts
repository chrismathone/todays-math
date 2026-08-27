/**
 * 🔴 **인접 한 칸으로 못 채우면 사다리를 더 걸어간다.**
 *
 * `ADJACENT_DIFFICULTY` 는 아래·위 한 칸씩만 본다. 그러면 「연산」 자리는
 * 「기본」에서만 빌릴 수 있고, **기본도 비면 자리를 잃는다.**
 *
 * 실측: 중등 3소단원(부채꼴의 호의 길이와 넓이 · 뿔의 겉넓이와 부피 ·
 * 인수분해의 응용)이 그렇다. RPM 구조상 그 소단원은 유형이 전부 응용·심화라
 * 연산이 **원래 하나도 없다**. 유형은 10개인데 시험지가 9문항으로 얇아지고,
 * 에러가 아니라 그냥 한 자리가 빈다 — 아무도 못 본다.
 */
import { describe, expect, it } from "vitest";

import { defaultRatioFor } from "@/contracts/difficulty";
import {
  selectProblems,
  type SelectableProblem,
} from "@/lib/generator/selectProblems";

function pool(tier: string, n: number): SelectableProblem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${tier}-${i}`,
    unitId: "u1",
    difficulty: tier as never,
    problemType: "활용",
    directUseAllowed: true,
    familyKey: `mid:fixture|${tier}|${String(i).padStart(2, "0")}`,
    content: `문항 ${tier} ${i}`,
    figureUrls: [],
    figureDims: [],
  }));
}

describe("난이도 대체 — 인접 한 칸을 넘어서", () => {
  it("연산·기본이 통째로 없어도 10문항 10갈래를 채운다", () => {
    // 응용만 10갈래 — 중등 「부채꼴의 호의 길이와 넓이」의 모양이다.
    const { problems, shortfall } = selectProblems({
      pool: pool("응용", 10),
      difficultyRatio: defaultRatioFor(10),
      count: 10,
      recentProblemIds: [],
      seed: "ladder-1",
    });
    expect(shortfall, JSON.stringify(shortfall)).toEqual([]);
    expect(problems).toHaveLength(10);
    expect(new Set(problems.map((p) => p.familyKey)).size).toBe(10);
  });

  it("🔴 풀이 정말 모자라면 여전히 shortfall 을 낸다 — 대체가 없는 것을 지어내지 않는다", () => {
    const { problems, shortfall } = selectProblems({
      pool: pool("응용", 3),
      difficultyRatio: defaultRatioFor(10),
      count: 10,
      recentProblemIds: [],
      seed: "ladder-2",
    });
    expect(problems.length).toBeLessThan(10);
    expect(shortfall.length).toBeGreaterThan(0);
  });
});
