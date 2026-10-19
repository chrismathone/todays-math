import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_FACTOR,
  ARITHMETIC_ONE_DIGIT,
  ARITHMETIC_SKILL_OPERATOR,
  ARITHMETIC_TWO_DIGIT,
  type ArithmeticSkillId,
  isArithmeticSkillId,
  arithmeticConstraintSchemaBySkill,
} from "@/contracts/arithmetic.contract";
import type { ArithmeticEngineErrorCode } from "@/lib/arithmetic/errors";

/**
 * 명세의 연산만으로 정답을 다시 계산한다.
 * 생성기가 붙인 정답 칸은 없고, 이 파일은 생성·도메인 모듈을 부르지 않는다.
 */

export type ArithmeticVerification =
  | { ok: true; answer: string }
  | {
      ok: false;
      code: Extract<
        ArithmeticEngineErrorCode,
        | "version"
        | "unsupported-skill"
        | "unsupported-constraint"
        | "constraint"
        | "operand"
        | "operator"
      >;
    };

const ANSWER_DIGITS = /^(0|[1-9][0-9]{0,2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(
  code: Exclude<ArithmeticVerification, { ok: true }>["code"],
): ArithmeticVerification {
  return { ok: false, code };
}

function integerPair(value: unknown): readonly [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [left, right] = value;
  if (typeof left !== "number" || typeof right !== "number") return null;
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) return null;
  return [left, right];
}

function inside(
  value: number,
  bounds: { min: number; max: number },
): boolean {
  return value >= bounds.min && value <= bounds.max;
}

function inRequestedRange(
  value: number,
  range: { min: number; max: number } | undefined,
): boolean {
  return range !== undefined && value >= range.min && value <= range.max;
}

function plainDigits(value: number): string | null {
  if (!Number.isSafeInteger(value) || value < 0) return null;
  const text = String(value);
  return ANSWER_DIGITS.test(text) ? text : null;
}

/** 검산 전용 받아올림. 도메인 모듈의 같은 규칙과 코드를 공유하지 않는다. */
function recomputedAdditionCarry(left: number, right: number): 0 | 1 | 2 {
  const onesSum = (left % 10) + (right % 10);
  const onesCarry = onesSum >= 10 ? 1 : 0;
  const tensSum = Math.floor(left / 10) + Math.floor(right / 10) + onesCarry;
  const tensCarry = tensSum >= 10 ? 1 : 0;
  return (onesCarry + tensCarry) as 0 | 1 | 2;
}

function recomputedBorrow(minuend: number, subtrahend: number): 0 | 1 | null {
  if (minuend < subtrahend) return null;
  return minuend % 10 < subtrahend % 10 ? 1 : 0;
}

function recomputedMultiplicationCarry(
  multiplicand: number,
  multiplier: number,
): 0 | 1 | 2 {
  const onesProduct = (multiplicand % 10) * multiplier;
  const onesCarry = Math.floor(onesProduct / 10) > 0 ? 1 : 0;
  const tensProduct =
    Math.floor(multiplicand / 10) * multiplier + Math.floor(onesProduct / 10);
  const tensCarry = Math.floor(tensProduct / 10) > 0 ? 1 : 0;
  return (onesCarry + tensCarry) as 0 | 1 | 2;
}

function rangeOf(value: unknown): { min: number; max: number } | undefined {
  if (!isRecord(value)) return undefined;
  const { min, max } = value;
  if (typeof min !== "number" || typeof max !== "number") return undefined;
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) return undefined;
  return { min, max };
}

export function verifyArithmeticSpec(spec: unknown): ArithmeticVerification {
  if (!isRecord(spec)) return fail("unsupported-skill");
  if (
    spec.engineVersion !== ARITHMETIC_ENGINE_VERSION ||
    spec.catalogVersion !== ARITHMETIC_CATALOG_VERSION
  ) {
    return fail("version");
  }
  if (!isArithmeticSkillId(spec.skillId)) return fail("unsupported-skill");
  const skillId: ArithmeticSkillId = spec.skillId;
  if (spec.operator !== ARITHMETIC_SKILL_OPERATOR[skillId]) return fail("operator");
  const operands = integerPair(spec.operands);
  if (!operands) return fail("operand");
  const parsed = arithmeticConstraintSchemaBySkill[skillId].safeParse(
    spec.constraints,
  );
  if (!parsed.success) return fail("unsupported-constraint");
  const [left, right] = operands;
  const answer = legalAnswer(skillId, parsed.data, left, right);
  if (answer === "operand") return fail("operand");
  if (answer === "constraint") return fail("constraint");
  const digits = plainDigits(answer);
  if (digits === null) return fail("constraint");
  return { ok: true, answer: digits };
}

function legalAnswer(
  skillId: ArithmeticSkillId,
  constraints: unknown,
  left: number,
  right: number,
): number | "operand" | "constraint" {
  if (!isRecord(constraints)) return "constraint";
  switch (skillId) {
    case "one-digit-add": {
      if (!inside(left, ARITHMETIC_ONE_DIGIT) || !inside(right, ARITHMETIC_ONE_DIGIT)) {
        return "operand";
      }
      if (
        !inRequestedRange(left, rangeOf(constraints.left)) ||
        !inRequestedRange(right, rangeOf(constraints.right))
      ) {
        return "constraint";
      }
      const sum = left + right;
      const carry = sum >= 10 ? "some" : "none";
      return carry === constraints.carry ? sum : "constraint";
    }
    case "one-digit-sub": {
      if (!inside(left, ARITHMETIC_ONE_DIGIT) || !inside(right, ARITHMETIC_ONE_DIGIT)) {
        return "operand";
      }
      if (
        !inRequestedRange(left, rangeOf(constraints.minuend)) ||
        !inRequestedRange(right, rangeOf(constraints.subtrahend))
      ) {
        return "constraint";
      }
      if (left < right) return "constraint";
      return left - right;
    }
    case "two-digit-vertical-add": {
      if (!inside(left, ARITHMETIC_TWO_DIGIT) || !inside(right, ARITHMETIC_TWO_DIGIT)) {
        return "operand";
      }
      if (
        !inRequestedRange(left, rangeOf(constraints.left)) ||
        !inRequestedRange(right, rangeOf(constraints.right))
      ) {
        return "constraint";
      }
      if (recomputedAdditionCarry(left, right) !== constraints.carryCount) {
        return "constraint";
      }
      return left + right;
    }
    case "two-digit-vertical-sub": {
      if (!inside(left, ARITHMETIC_TWO_DIGIT) || !inside(right, ARITHMETIC_TWO_DIGIT)) {
        return "operand";
      }
      if (
        !inRequestedRange(left, rangeOf(constraints.minuend)) ||
        !inRequestedRange(right, rangeOf(constraints.subtrahend))
      ) {
        return "constraint";
      }
      const borrow = recomputedBorrow(left, right);
      if (borrow !== constraints.borrowCount) return "constraint";
      return left - right;
    }
    case "times-table": {
      if (!inside(left, ARITHMETIC_FACTOR) || !inside(right, ARITHMETIC_FACTOR)) {
        return "operand";
      }
      const dans = Array.isArray(constraints.dans) ? constraints.dans : [];
      if (
        !dans.includes(left) ||
        !inRequestedRange(right, rangeOf(constraints.multiplier))
      ) {
        return "constraint";
      }
      return left * right;
    }
    case "two-digit-times-one": {
      if (!inside(left, ARITHMETIC_TWO_DIGIT) || !inside(right, ARITHMETIC_FACTOR)) {
        return "operand";
      }
      if (
        !inRequestedRange(left, rangeOf(constraints.multiplicand)) ||
        !inRequestedRange(right, rangeOf(constraints.multiplier))
      ) {
        return "constraint";
      }
      if (recomputedMultiplicationCarry(left, right) !== constraints.carryCount) {
        return "constraint";
      }
      return left * right;
    }
    case "two-digit-div-one": {
      if (!inside(left, ARITHMETIC_TWO_DIGIT) || !inside(right, ARITHMETIC_FACTOR)) {
        return "operand";
      }
      if (
        !inRequestedRange(left, rangeOf(constraints.dividend)) ||
        !inRequestedRange(right, rangeOf(constraints.divisor))
      ) {
        return "constraint";
      }
      if (right === 0 || left % right !== 0) return "constraint";
      const quotient = Math.trunc(left / right);
      if (quotient * right !== left) return "constraint";
      return quotient;
    }
    default: {
      const neverSkill: never = skillId;
      void neverSkill;
      return "constraint";
    }
  }
}

export function arithmeticAnswerMatches(spec: unknown, claimed: unknown): boolean {
  if (typeof claimed !== "string" || !ANSWER_DIGITS.test(claimed)) return false;
  const verified = verifyArithmeticSpec(spec);
  return verified.ok && verified.answer === claimed;
}
