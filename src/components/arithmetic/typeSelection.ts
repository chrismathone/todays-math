import { ARITHMETIC_MAX_ITEMS_PER_ROUND } from "@/contracts/arithmetic.contract";
import { arithmeticPerRoundBudget } from "@/lib/arithmetic/quantity";

export type ArithmeticTypeChoice = {
  id: string;
  defaultCount: number;
  domainSize: number;
  disabled?: boolean;
};
export type ArithmeticTypeSelection = { id: string; count: number };

export type ArithmeticTypeSelectionIssue =
  "selected" | "disabled" | "invalid-quantity" | "domain" | "limit";

/** A request budget is not a shortage of distinct expressions in the type. */
export function arithmeticTypeSelectionIssue(
  item: ArithmeticTypeChoice,
  selected: readonly ArithmeticTypeSelection[],
  rounds: number,
): ArithmeticTypeSelectionIssue | null {
  if (selected.some((selection) => selection.id === item.id)) return "selected";
  if (item.disabled) return "disabled";
  const budget = arithmeticPerRoundBudget(rounds);
  if (
    budget === 0 ||
    selected.some(
      (selection) =>
        !Number.isSafeInteger(selection.count) || selection.count < 1,
    ) ||
    !Number.isSafeInteger(item.defaultCount) ||
    item.defaultCount < 1
  )
    return "invalid-quantity";
  if (
    !Number.isSafeInteger(item.domainSize) ||
    item.domainSize < item.defaultCount
  )
    return "domain";
  return item.defaultCount >
    budget - selected.reduce((sum, selection) => sum + selection.count, 0)
    ? "limit"
    : null;
}

/** Keep defaults intact; respect shared request limits and the per-round domain. */
export function availableArithmeticTypes(
  candidates: readonly ArithmeticTypeChoice[],
  selected: readonly ArithmeticTypeSelection[],
  rounds: number,
) {
  const seen = new Set(selected.map((item) => item.id));
  return candidates.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return arithmeticTypeSelectionIssue(item, selected, rounds) === null;
  });
}

/** Fisher-Yates over a bounded pool; no retry-until-unique loop for exhausted filters. */
export function randomArithmeticTypes(
  candidates: readonly ArithmeticTypeChoice[],
  selected: readonly ArithmeticTypeSelection[],
  rounds: number,
  count: number,
  random: () => number = Math.random,
): ArithmeticTypeChoice[] {
  if (!Number.isInteger(count) || count < 1) return [];
  const pool = availableArithmeticTypes(candidates, selected, rounds);
  for (let index = pool.length - 1; index > 0; index--) {
    const sample = random();
    const swap = Math.floor(
      Math.max(
        0,
        Math.min(0.9999999999999999, Number.isFinite(sample) ? sample : 0),
      ) *
        (index + 1),
    );
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  let budget =
    arithmeticPerRoundBudget(rounds) -
    selected.reduce((sum, item) => sum + item.count, 0);
  const picked: ArithmeticTypeChoice[] = [];
  for (const item of pool) {
    if (picked.length >= Math.min(ARITHMETIC_MAX_ITEMS_PER_ROUND, count)) break;
    if (item.defaultCount > budget) continue;
    picked.push(item);
    budget -= item.defaultCount;
  }
  return picked;
}
