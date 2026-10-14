import type { ArithmeticPrompt } from "@/contracts/arithmetic.contract";
import {
  type ArithmeticSheetPayload,
  arithmeticSheetPayloadSchema,
} from "@/contracts/arithmeticSheet.contract";
import {
  ArithmeticEngineError,
  arithmeticCodeFromZod,
} from "@/lib/arithmetic/errors";
import { renderArithmeticPrompt } from "@/lib/arithmetic/render";
import { verifyArithmeticSpec } from "@/lib/arithmetic/verify";

function samePrompt(expected: ArithmeticPrompt, actual: ArithmeticPrompt): boolean {
  if (
    expected.notation !== actual.notation ||
    expected.operator !== actual.operator ||
    expected.operands[0] !== actual.operands[0] ||
    expected.operands[1] !== actual.operands[1]
  ) {
    return false;
  }
  if (expected.notation === "horizontal") {
    return actual.notation === "horizontal" && expected.expression === actual.expression;
  }
  return (
    actual.notation === "vertical" &&
    expected.rows[0] === actual.rows[0] &&
    expected.rows[1] === actual.rows[1]
  );
}

/**
 * 저장된 스냅샷을 검사해서 그대로 돌려준다.
 * 시드로 명세를 다시 고르지 않는다.
 */
export function reopenArithmeticSheet(payload: unknown): ArithmeticSheetPayload {
  const parsed = arithmeticSheetPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ArithmeticEngineError(arithmeticCodeFromZod(parsed.error));
  }
  for (const round of parsed.data.rounds) {
    for (const item of round.items) {
      const verified = verifyArithmeticSpec(item.spec);
      if (!verified.ok) throw new ArithmeticEngineError(verified.code);
      if (verified.answer !== item.answer) {
        throw new ArithmeticEngineError("answer-mismatch");
      }
      if (!samePrompt(renderArithmeticPrompt(item.spec), item.prompt)) {
        throw new ArithmeticEngineError("prompt-mismatch");
      }
      if (item.answer.includes("<") || item.answer.includes(">")) {
        throw new ArithmeticEngineError("schema");
      }
    }
  }
  return parsed.data;
}
