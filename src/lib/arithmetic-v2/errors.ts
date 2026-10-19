import {
  ArithmeticEngineError,
  arithmeticCodeFromZod,
  type ArithmeticLimitDetail,
} from "@/lib/arithmetic/errors";
import type { ZodError } from "zod";

export type ArithmeticV2CapacityViolation = {
  round: number;
  allocation: number;
  typeId: string;
  requested: number;
  available: number;
  reason: "domain" | "overlap";
};
export class ArithmeticV2EngineError extends Error {
  constructor(
    readonly code:
      | "version"
      | "unsupported-type"
      | "invalid-seed"
      | "invalid-count"
      | "limit"
      | "capacity"
      | "round-overlap"
      | "payload-size"
      | "schema"
      | "answer-mismatch"
      | "prompt-mismatch"
      | "duplicate"
      | "order"
      | "operand"
      | "verification",
    readonly violations?: readonly ArithmeticV2CapacityViolation[],
    readonly limit?: ArithmeticLimitDetail,
  ) {
    super(
      code === "unsupported-type"
        ? "지원하지 않는 연산 유형입니다."
        : code === "verification"
          ? "연산 문항의 독립 검산에 실패했습니다."
          : new ArithmeticEngineError(code).message,
    );
    this.name = "ArithmeticV2EngineError";
  }
}
export function arithmeticV2SchemaError(
  error: ZodError,
): ArithmeticV2EngineError {
  if (error.issues.some((issue) => issue.path.includes("typeId")))
    return new ArithmeticV2EngineError("unsupported-type");
  const code = arithmeticCodeFromZod(error);
  return new ArithmeticV2EngineError(
    code === "unsupported-skill" ||
      code === "unsupported-constraint" ||
      code === "operator" ||
      code === "constraint"
      ? "schema"
      : code,
  );
}
