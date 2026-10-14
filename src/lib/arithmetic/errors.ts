import type { ZodError } from "zod";

import type { ArithmeticSkillId } from "@/contracts/arithmetic.contract";

export const ARITHMETIC_ENGINE_ERROR_CODES = [
  "version",
  "unsupported-skill",
  "unsupported-constraint",
  "invalid-seed",
  "invalid-count",
  "limit",
  "capacity",
  "schema",
  "answer-mismatch",
  "prompt-mismatch",
  "duplicate",
  "order",
  "operator",
  "operand",
  "constraint",
] as const;

export type ArithmeticEngineErrorCode =
  (typeof ARITHMETIC_ENGINE_ERROR_CODES)[number];

export type ArithmeticCapacityViolation = {
  /** 1부터 세는 회차. */
  round: number;
  /** 그 회차 안 기능 요청의 1부터 세는 차례. */
  allocation: number;
  skillId: ArithmeticSkillId;
  requested: number;
  /** `domain` 은 조건의 전체 가능 수, `overlap` 은 회차에 남은 수. */
  available: number;
  reason: "domain" | "overlap";
};

export type ArithmeticLimitDetail = {
  scope: "round" | "total" | "rounds" | "scan";
  round?: number;
  count: number;
  max: number;
};

const MESSAGES: Record<ArithmeticEngineErrorCode, string> = {
  version: "지원하지 않는 연산 엔진 또는 카탈로그 버전입니다.",
  "unsupported-skill": "지원하지 않는 연산 기능입니다.",
  "unsupported-constraint": "지원하지 않는 연산 조건입니다.",
  "invalid-seed": "시드는 출력 가능 문자 1~128자입니다.",
  "invalid-count": "문항 수는 1 이상 100 이하의 정수입니다.",
  limit: "한 회차 또는 전체 문항 수가 상한을 넘습니다.",
  capacity: "요청한 문항 수가 조건에서 만들 수 있는 수를 넘습니다.",
  schema: "연산 학습지 형식이 올바르지 않습니다.",
  "answer-mismatch": "저장된 정답이 명세와 맞지 않습니다.",
  "prompt-mismatch": "저장된 발문이 명세와 맞지 않습니다.",
  duplicate: "한 회차에 같은 연산 문항이 두 번 있습니다.",
  order: "문항 순서가 올바르지 않습니다.",
  operator: "연산자가 기능과 맞지 않습니다.",
  operand: "피연산자가 기능의 범위 밖에 있습니다.",
  constraint: "피연산자가 요청한 기능 조건을 만족하지 않습니다.",
};

function isErrorCode(value: string): value is ArithmeticEngineErrorCode {
  return (ARITHMETIC_ENGINE_ERROR_CODES as readonly string[]).includes(value);
}

export class ArithmeticEngineError extends Error {
  readonly code: ArithmeticEngineErrorCode;
  readonly violations?: readonly ArithmeticCapacityViolation[];
  readonly limit?: ArithmeticLimitDetail;

  constructor(
    code: ArithmeticEngineErrorCode,
    extra?: {
      violations?: readonly ArithmeticCapacityViolation[];
      limit?: ArithmeticLimitDetail;
    },
  ) {
    super(MESSAGES[code]);
    this.name = "ArithmeticEngineError";
    this.code = code;
    this.violations = extra?.violations;
    this.limit = extra?.limit;
  }
}

export function arithmeticCodeFromZod(error: ZodError): ArithmeticEngineErrorCode {
  const issue = error.issues[0];
  if (!issue) return "schema";
  if (issue.message.startsWith("arithmetic:")) {
    const code = issue.message.slice("arithmetic:".length);
    if (isErrorCode(code)) return code;
  }
  const path = issue.path.map(String);
  if (
    path.includes("engineVersion") ||
    path.includes("catalogVersion") ||
    path.includes("payloadVersion")
  ) {
    return "version";
  }
  if (path.includes("seed")) return "invalid-seed";
  if (path.includes("count")) return "invalid-count";
  if (path.includes("skillId")) return "unsupported-skill";
  if (path.includes("constraints")) return "unsupported-constraint";
  if (issue.code === "unrecognized_keys" && path.includes("constraints")) {
    return "unsupported-constraint";
  }
  return "schema";
}
