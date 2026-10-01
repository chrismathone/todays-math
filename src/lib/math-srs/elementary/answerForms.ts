import { parseCourseAnswerQuantity, sameCourseAnswerValue } from "./answers";
import type { CourseProblem } from "./types";

type AnswerSource = Pick<CourseProblem, "answer" | "content">;
export type RequiredForm = "irreducible" | "mixed";
export type AnswerForm =
  "ok" | "not-irreducible" | "not-mixed" | "not-applicable";

/** Only explicit final-answer instructions, never a mentioned intermediate step. */
export function requiredForm(problem: AnswerSource): RequiredForm | null {
  if (
    /통분(?:하|해)|그리시오|그려\s*보|이유를|설명하|식을\s*(?:쓰|만드)/.test(
      problem.content,
    )
  )
    return null;
  const instructions = [
    ...problem.content.matchAll(
      /(기약분수|대분수|가분수|소수|분수)(?:\s*(?:로|꼴로)(?:도)?\s*(?:고치시오|고쳐\s*(?:쓰시오|보시오)|나타내시오|쓰시오|바꾸시오)|\s*를\s*쓰시오)(?=$|[\s.!?。])/g,
    ),
  ].map((match) => match[1]);
  const forms = new Set(instructions);
  if (forms.size !== 1) return null;
  if (forms.has("기약분수")) return "irreducible";
  if (forms.has("대분수")) return "mixed";
  return null;
}

const INTEGER = /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)$/;
const FRACTION =
  /^(?:[+-]?\d+\s*\/\s*[+-]?\d+|[+-]?\\(?:dfrac|frac|tfrac)\{[+-]?\d+\}\{[+-]?\d+\})$/;
const MIXED =
  /^(?:[+-]?\d+\s+\d+\s*\/\s*\d+|[+-]?\d+\s*\\(?:dfrac|frac|tfrac)\{\d+\}\{\d+\})$/;
const abs = (value: bigint) => (value < BigInt(0) ? -value : value);

function gcd(a: bigint, b: bigint): bigint {
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return a;
}

function gradeForm(
  required: RequiredForm | null,
  actual: NonNullable<ReturnType<typeof parseCourseAnswerQuantity>>,
): AnswerForm {
  if (!required) return "not-applicable";
  if (INTEGER.test(actual.notation)) return "ok";
  const mixed = MIXED.test(actual.notation);
  if (!mixed && !FRACTION.test(actual.notation)) return "not-applicable";

  // The existing parser preserves unreduced integer fractions and mixed parts.
  // gcd(whole * denominator + numerator, denominator) = gcd(numerator, denominator).
  const numerator = abs(actual.value.numerator);
  const denominator = abs(actual.value.denominator);
  if (required === "irreducible")
    return gcd(numerator, denominator) === BigInt(1) ? "ok" : "not-irreducible";
  if (mixed || numerator < denominator || numerator % denominator === BigInt(0))
    return "ok";
  return "not-mixed";
}

/** Deliberately unwired: callers must not treat a form failure as a wrong value. */
export function gradeValueAndForm(
  problem: AnswerSource,
  input: string,
): { value: boolean; form: AnswerForm } {
  const expected = parseCourseAnswerQuantity(problem.answer);
  const actual = parseCourseAnswerQuantity(input);
  const value = sameCourseAnswerValue(expected, actual);
  if (
    !expected ||
    !actual ||
    (actual.unit && actual.unit.dimension !== expected.unit?.dimension)
  )
    return { value, form: "not-applicable" };
  return { value, form: gradeForm(requiredForm(problem), actual) };
}
