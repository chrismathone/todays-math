// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  arithmeticPerRoundBudget,
  arithmeticQuantityIssue,
} from "@/lib/arithmetic/quantity";

describe("shared arithmetic request quantity validation", () => {
  it.each([
    [200, 1],
    [200, 2],
    [200, 10],
    [66, 3],
  ])("accepts %i items x %i rounds", (count, rounds) => {
    expect(arithmeticQuantityIssue([count], rounds)).toBeNull();
  });
  it("accepts mixed types without treating the total as the per-round count", () => {
    expect(arithmeticQuantityIssue([55, 45], 2)).toBeNull();
    expect(arithmeticPerRoundBudget(1)).toBe(200);
    expect(arithmeticPerRoundBudget(2)).toBe(200);
    expect(arithmeticPerRoundBudget(3)).toBe(200);
    expect(arithmeticPerRoundBudget(10)).toBe(200);
  });
  it.each([0, 11, 1.5, NaN, Infinity])(
    "rejects invalid rounds: %s",
    (rounds) => {
      expect(arithmeticPerRoundBudget(rounds)).toBe(0);
      expect(arithmeticQuantityIssue([1], rounds)?.code).toBe("invalid-rounds");
    },
  );
  it.each([
    [],
    [0],
    [-1],
    [1.5],
    [NaN],
    [Infinity],
    [Number.MAX_SAFE_INTEGER + 1],
  ])("rejects invalid counts: %j", (...counts) => {
    expect(arithmeticQuantityIssue(counts, 1)?.code).toBe("invalid-count");
  });
  it("enforces 200 per round independently of total", () => {
    expect(arithmeticQuantityIssue([151, 50], 1)?.code).toBe("round-limit");
    expect(arithmeticQuantityIssue([201], 1)?.code).toBe("round-limit");
    expect(arithmeticQuantityIssue([200], 10)).toBeNull();
    expect(arithmeticQuantityIssue([1], 11)?.code).toBe("invalid-rounds");
  });
});
