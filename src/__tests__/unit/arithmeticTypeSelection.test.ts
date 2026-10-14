import { describe, expect, it } from "vitest";
import {
  availableArithmeticTypes,
  randomArithmeticTypes,
} from "@/components/arithmetic/typeSelection";

const choice = (id: string, count = 9) => ({
  id,
  domainSize: 9,
  defaultCount: count,
});
describe("bounded arithmetic type selection", () => {
  it("excludes selected, duplicate, disabled, unavailable and nonfinite domains", () => {
    const candidates = [
      choice("a"),
      choice("b"),
      choice("b"),
      { ...choice("c"), disabled: true },
      { ...choice("d"), domainSize: 0 },
      { ...choice("e"), domainSize: Infinity },
      choice("f", 10),
    ];
    expect(
      availableArithmeticTypes(candidates, [{ id: "a", count: 3 }], 1).map(
        (item) => item.id,
      ),
    ).toEqual(["b"]);
    expect(
      randomArithmeticTypes(
        candidates,
        [{ id: "a", count: 3 }],
        1,
        100,
        () => 0,
      ).map((item) => item.id),
    ).toEqual(["b"]);
  });
  it("preserves selected counts and defaults while applying total capacity across rounds", () => {
    const selected = [{ id: "selected", count: 12 }];
    const picked = randomArithmeticTypes(
      [choice("a"), choice("b"), choice("c")],
      selected,
      3,
      3,
      () => 0.5,
    );
    expect(picked).toHaveLength(2);
    expect(picked.every((item) => item.defaultCount === 9)).toBe(true);
    expect(
      (12 + picked.reduce((sum, item) => sum + item.defaultCount, 0)) * 3,
    ).toBeLessThanOrEqual(100);
    expect(selected).toEqual([{ id: "selected", count: 12 }]);
  });
  it("terminates for exhausted filters, invalid quantities and full selections", () => {
    for (const rounds of [0, NaN, Infinity, 21, 1.5])
      expect(randomArithmeticTypes([choice("a")], [], rounds, 3)).toEqual([]);
    expect(
      randomArithmeticTypes([choice("a")], [{ id: "b", count: 100 }], 1, 3),
    ).toEqual([]);
    expect(randomArithmeticTypes([], [], 1, 100)).toEqual([]);
    expect(randomArithmeticTypes([choice("a")], [], 1, NaN)).toEqual([]);
    expect(randomArithmeticTypes([choice("a")], [], 1, 3, () => NaN)).toEqual([
      choice("a"),
    ]);
  });
});
