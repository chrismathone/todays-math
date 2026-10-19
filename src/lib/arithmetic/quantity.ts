import {
  ARITHMETIC_MAX_ITEMS_PER_ROUND,
  ARITHMETIC_MAX_ITEMS_TOTAL,
  ARITHMETIC_MAX_ROUNDS,
} from "@/contracts/arithmetic.contract";

/** Per-round writer budget. Distinct-task capacity is checked by selection. */
export function arithmeticPerRoundBudget(rounds: number): number {
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > ARITHMETIC_MAX_ROUNDS)
    return 0;
  return ARITHMETIC_MAX_ITEMS_PER_ROUND;
}

export type ArithmeticQuantityIssue = {
  code: "invalid-rounds" | "invalid-count" | "round-limit" | "total-limit";
  message: string;
};

/** For workbenches that repeat the same allocation counts in every round. */
export function arithmeticQuantityIssue(
  counts: readonly number[],
  rounds: number,
): ArithmeticQuantityIssue | null {
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > ARITHMETIC_MAX_ROUNDS)
    return {
      code: "invalid-rounds",
      message: `회차는 1~${ARITHMETIC_MAX_ROUNDS} 사이의 정수로 입력해 주세요.`,
    };
  if (
    counts.length === 0 ||
    counts.some((count) => !Number.isSafeInteger(count) || count < 1)
  )
    return {
      code: "invalid-count",
      message: "유형을 담고 문항 수를 1 이상의 정수로 입력해 주세요.",
    };
  const perRound = counts.reduce((sum, count) => sum + count, 0);
  if (perRound > ARITHMETIC_MAX_ITEMS_PER_ROUND)
    return {
      code: "round-limit",
      message: `한 회차에는 ${ARITHMETIC_MAX_ITEMS_PER_ROUND}문항까지 만들 수 있습니다. 회차당 문항 수를 줄여 주세요.`,
    };
  if (perRound * rounds > ARITHMETIC_MAX_ITEMS_TOTAL)
    return {
      code: "total-limit",
      message: `한 번에 총 ${ARITHMETIC_MAX_ITEMS_TOTAL}문항까지 만들 수 있습니다. 문항 수나 회차를 줄여 주세요.`,
    };
  return null;
}
