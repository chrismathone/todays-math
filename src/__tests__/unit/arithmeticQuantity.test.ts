// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  arithmeticPerRoundBudget,
  arithmeticQuantityIssue,
} from "@/lib/arithmetic/quantity";

describe("shared arithmetic request quantity validation", () => {
  it.each([
    [100, 1],
    [100, 2],
    [10, 20],
    [66, 3],
  ])("accepts %i items x %i rounds", (count, rounds) => {
    expect(arithmeticQuantityIssue([count], rounds)).toBeNull();
  });
  it("accepts mixed types without treating the total as the per-round count", () => {
    expect(arithmeticQuantityIssue([55, 45], 2)).toBeNull();
    expect(arithmeticPerRoundBudget(1)).toBe(100);
    expect(arithmeticPerRoundBudget(2)).toBe(100);
    expect(arithmeticPerRoundBudget(3)).toBe(66);
    expect(arithmeticPerRoundBudget(20)).toBe(10);
  });
  it.each([0, 21, 1.5, NaN, Infinity])(
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
  it("reports per-round and total limits independently", () => {
    expect(arithmeticQuantityIssue([51, 50], 1)?.code).toBe("round-limit");
    expect(arithmeticQuantityIssue([101], 1)?.code).toBe("round-limit");
    expect(arithmeticQuantityIssue([67], 3)?.code).toBe("total-limit");
    expect(arithmeticQuantityIssue([11], 20)?.code).toBe("total-limit");
  });
});
