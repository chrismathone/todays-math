import {
  arithmeticV2CandidateSchema,
  arithmeticV2SheetPayloadSchema,
  type ArithmeticV2SheetPayload,
} from "@/contracts/arithmeticV2.contract";
import { ArithmeticV2EngineError, arithmeticV2SchemaError } from "./errors";
import { getArithmeticV2Definition } from "./registry";

/** Validates the exact stored index/snapshot, never samples or rerolls the seed. */
export function reopenArithmeticV2Sheet(
  input: unknown,
): ArithmeticV2SheetPayload {
  const parsed = arithmeticV2SheetPayloadSchema.safeParse(input);
  if (!parsed.success) throw arithmeticV2SchemaError(parsed.error);
  for (const round of parsed.data.rounds) {
    for (const item of round.items) {
      const definition = getArithmeticV2Definition(item.typeId);
      if (item.domainIndex >= definition.domainSize)
        throw new ArithmeticV2EngineError("operand");
      const candidate = {
        parameters: item.parameters,
        prompt: item.prompt,
        answer: item.answer,
      };
      if (!definition.verify(candidate))
        throw new ArithmeticV2EngineError("verification");
      const expected = arithmeticV2CandidateSchema.parse(
        definition.problemAt(item.domainIndex),
      );
      if (
        JSON.stringify(expected.parameters) !==
        JSON.stringify(candidate.parameters)
      )
        throw new ArithmeticV2EngineError("operand");
      if (JSON.stringify(expected.prompt) !== JSON.stringify(candidate.prompt))
        throw new ArithmeticV2EngineError("prompt-mismatch");
      if (JSON.stringify(expected.answer) !== JSON.stringify(candidate.answer))
        throw new ArithmeticV2EngineError("answer-mismatch");
    }
  }
  return parsed.data;
}
