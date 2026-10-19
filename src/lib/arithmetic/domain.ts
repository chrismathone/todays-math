import {
  ARITHMETIC_MAX_DOMAIN_SCAN,
  type ArithmeticRange,
  type ArithmeticSkillId,
  type ArithmeticSkillSelection,
} from "@/contracts/arithmetic.contract";
import { parseArithmeticSelection } from "@/lib/arithmetic/constraints";
import { ArithmeticEngineError } from "@/lib/arithmetic/errors";

type Pair = readonly [number, number];

/**
 * 받아올림 횟수는 생성 쪽 정의다. 검산은 이 함수를 부르지 않고 다시 센다.
 * 일의 자리 합이 10 이상이면 1, 그 올림을 더한 십의 자리 합이 10 이상이면 1.
 */
function additionCarryCount(left: number, right: number): 0 | 1 | 2 {
  const ones = (left % 10) + (right % 10);
  const carryOnes = ones >= 10 ? 1 : 0;
  const tens = Math.floor(left / 10) + Math.floor(right / 10) + carryOnes;
  const carryTens = tens >= 10 ? 1 : 0;
  return (carryOnes + carryTens) as 0 | 1 | 2;
}

/** 받아내림은 일의 자리만 센다. 결과가 음수인 쌍은 넣지 않는다. */
function subtractionBorrowCount(minuend: number, subtrahend: number): 0 | 1 | null {
  if (minuend < subtrahend) return null;
  return minuend % 10 < subtrahend % 10 ? 1 : 0;
}

/**
 * 곱셈 받아올림도 두 칸이다. 일의 자리 곱이 10 이상이면 1,
 * 그 올림을 더한 십의 자리 곱이 10 이상이면 1.
 */
function multiplicationCarryCount(multiplicand: number, multiplier: number): 0 | 1 | 2 {
  const ones = (multiplicand % 10) * multiplier;
  const carryOnes = Math.floor(ones / 10) > 0 ? 1 : 0;
  const tens = Math.floor(multiplicand / 10) * multiplier + Math.floor(ones / 10);
  const carryTens = Math.floor(tens / 10) > 0 ? 1 : 0;
  return (carryOnes + carryTens) as 0 | 1 | 2;
}

function watchScan(scanned: number): void {
  if (scanned > ARITHMETIC_MAX_DOMAIN_SCAN) {
    throw new ArithmeticEngineError("limit", {
      limit: {
        scope: "scan",
        count: scanned,
        max: ARITHMETIC_MAX_DOMAIN_SCAN,
      },
    });
  }
}

function pairsInRanges(
  left: ArithmeticRange,
  right: ArithmeticRange,
  accept: (leftValue: number, rightValue: number) => boolean,
): readonly Pair[] {
  const out: Pair[] = [];
  let scanned = 0;
  for (let leftValue = left.min; leftValue <= left.max; leftValue += 1) {
    for (let rightValue = right.min; rightValue <= right.max; rightValue += 1) {
      scanned += 1;
      watchScan(scanned);
      if (accept(leftValue, rightValue)) out.push([leftValue, rightValue]);
    }
  }
  return out;
}

export function arithmeticDomainPairs(
  selection: ArithmeticSkillSelection,
): readonly Pair[] {
  switch (selection.skillId) {
    case "one-digit-add":
      return pairsInRanges(
        selection.constraints.left,
        selection.constraints.right,
        (left, right) => {
          const sum = left + right;
          return selection.constraints.carry === "none" ? sum < 10 : sum >= 10;
        },
      );
    case "one-digit-sub":
      return pairsInRanges(
        selection.constraints.minuend,
        selection.constraints.subtrahend,
        (minuend, subtrahend) => minuend >= subtrahend,
      );
    case "two-digit-vertical-add":
      return pairsInRanges(
        selection.constraints.left,
        selection.constraints.right,
        (left, right) =>
          additionCarryCount(left, right) === selection.constraints.carryCount,
      );
    case "two-digit-vertical-sub":
      return pairsInRanges(
        selection.constraints.minuend,
        selection.constraints.subtrahend,
        (minuend, subtrahend) =>
          subtractionBorrowCount(minuend, subtrahend) ===
          selection.constraints.borrowCount,
      );
    case "times-table": {
      const out: Pair[] = [];
      let scanned = 0;
      for (const dan of selection.constraints.dans) {
        for (
          let factor = selection.constraints.multiplier.min;
          factor <= selection.constraints.multiplier.max;
          factor += 1
        ) {
          scanned += 1;
          watchScan(scanned);
          out.push([dan, factor]);
        }
      }
      return out;
    }
    case "two-digit-times-one":
      return pairsInRanges(
        selection.constraints.multiplicand,
        selection.constraints.multiplier,
        (multiplicand, multiplier) =>
          multiplicationCarryCount(multiplicand, multiplier) ===
          selection.constraints.carryCount,
      );
    case "two-digit-div-one":
      return pairsInRanges(
        selection.constraints.dividend,
        selection.constraints.divisor,
        (dividend, divisor) => divisor !== 0 && dividend % divisor === 0,
      );
    default: {
      const neverSelection: never = selection;
      void neverSelection;
      throw new ArithmeticEngineError("unsupported-skill");
    }
  }
}

export function arithmeticDomainSize(
  skillId: ArithmeticSkillId | unknown,
  constraints: unknown,
): number {
  return arithmeticDomainPairs(parseArithmeticSelection(skillId, constraints))
    .length;
}
