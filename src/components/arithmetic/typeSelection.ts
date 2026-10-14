export type ArithmeticTypeChoice = {
  id: string;
  defaultCount: number;
  domainSize: number;
  disabled?: boolean;
};
export type ArithmeticTypeSelection = { id: string; count: number };

/** Keep defaults intact; never exceed the sheet's 100-question limit or finite domain. */
export function availableArithmeticTypes(
  candidates: readonly ArithmeticTypeChoice[],
  selected: readonly ArithmeticTypeSelection[],
  rounds: number,
) {
  if (
    !Number.isInteger(rounds) ||
    rounds < 1 ||
    rounds > 20 ||
    selected.some((item) => !Number.isInteger(item.count) || item.count < 1)
  )
    return [];
  const budget =
    Math.floor(100 / rounds) -
    selected.reduce((sum, item) => sum + item.count, 0);
  const seen = new Set(selected.map((item) => item.id));
  return candidates.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return (
      !item.disabled &&
      Number.isSafeInteger(item.domainSize) &&
      item.domainSize > 0 &&
      Number.isInteger(item.defaultCount) &&
      item.defaultCount > 0 &&
      item.defaultCount <= item.domainSize &&
      item.defaultCount <= budget
    );
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
    Math.floor(100 / rounds) -
    selected.reduce((sum, item) => sum + item.count, 0);
  const picked: ArithmeticTypeChoice[] = [];
  for (const item of pool) {
    if (picked.length >= Math.min(100, count)) break;
    if (item.defaultCount > budget) continue;
    picked.push(item);
    budget -= item.defaultCount;
  }
  return picked;
}
