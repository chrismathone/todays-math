import {
  ARITHMETIC_SKILL_NOTATION,
  type ArithmeticPrompt,
  type ArithmeticSpec,
} from "@/contracts/arithmetic.contract";
import { ArithmeticEngineError } from "@/lib/arithmetic/errors";

/** 발문만 만든다. 정답과 풀이는 이 결과에 없다. */
export function renderArithmeticPrompt(spec: ArithmeticSpec): ArithmeticPrompt {
  const [left, right] = spec.operands;
  const notation = ARITHMETIC_SKILL_NOTATION[spec.skillId];
  if (notation === "vertical") {
    if (spec.operator !== "+" && spec.operator !== "-") {
      throw new ArithmeticEngineError("operator");
    }
    return {
      notation: "vertical",
      operator: spec.operator,
      operands: [left, right],
      rows: [String(left), String(right)],
    };
  }
  return {
    notation: "horizontal",
    operator: spec.operator,
    operands: [left, right],
    expression: `${left}${spec.operator}${right}`,
  };
}
