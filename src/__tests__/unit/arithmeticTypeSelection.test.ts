import { describe, expect, it } from "vitest";
import {
  availableArithmeticTypes,
  arithmeticTypeSelectionIssue,
  randomArithmeticTypes,
} from "@/components/arithmetic/typeSelection";
import { ARITHMETIC_MAX_ITEMS_TOTAL } from "@/contracts/arithmetic.contract";

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
    expect(picked).toHaveLength(3);
    expect(picked.every((item) => item.defaultCount === 9)).toBe(true);
    expect(
      (12 + picked.reduce((sum, item) => sum + item.defaultCount, 0)) * 3,
    ).toBeLessThanOrEqual(ARITHMETIC_MAX_ITEMS_TOTAL);
    expect(selected).toEqual([{ id: "selected", count: 12 }]);
  });
  // 98f39e8b6: every round has its own 200-item budget (up to 10 rounds).
  it("allows full rounds and separates budget limits from domain exhaustion", () => {
    const selected = [{ id: "selected", count: 191 }];
    expect(availableArithmeticTypes([choice("a")], selected, 2)).toEqual([
      choice("a"),
    ]);
    expect(
      randomArithmeticTypes(
        [choice("a"), choice("b")],
        selected,
        2,
        2,
        () => 0,
      ),
    ).toHaveLength(1);
    expect(
      arithmeticTypeSelectionIssue(choice("a"), [{ id: "b", count: 200 }], 2),
    ).toBe("limit");
    expect(arithmeticTypeSelectionIssue(choice("a", 10), [], 2)).toBe("domain");
    expect(arithmeticTypeSelectionIssue(choice("a"), [], 11)).toBe(
      "invalid-quantity",
    );
    expect(
      arithmeticTypeSelectionIssue(choice("a"), [{ id: "a", count: 9 }], 2),
    ).toBe("selected");
    expect(
      arithmeticTypeSelectionIssue({ ...choice("a"), disabled: true }, [], 2),
    ).toBe("disabled");
    expect(
      availableArithmeticTypes([choice("a")], [{ id: "b", count: 191 }], 10),
    ).toEqual([choice("a")]);
    expect(
      availableArithmeticTypes([choice("a")], [{ id: "b", count: 192 }], 10),
    ).toEqual([]);
  });
  it("terminates for exhausted filters, invalid quantities and full selections", () => {
    for (const rounds of [0, NaN, Infinity, 11, 1.5])
      expect(randomArithmeticTypes([choice("a")], [], rounds, 3)).toEqual([]);
    expect(
      randomArithmeticTypes([choice("a")], [{ id: "b", count: 200 }], 1, 3),
    ).toEqual([]);
    expect(randomArithmeticTypes([], [], 1, 100)).toEqual([]);
    expect(randomArithmeticTypes([choice("a")], [], 1, NaN)).toEqual([]);
    expect(randomArithmeticTypes([choice("a")], [], 1, 3, () => NaN)).toEqual([
      choice("a"),
    ]);
  });
});
