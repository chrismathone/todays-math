import type {
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
  ArithmeticV2Definition,
  ArithmeticV2Prompt,
} from "../../types";

const ZERO = BigInt(0);
const ONE = BigInt(1);
export type Rational = readonly [bigint, bigint];
export const abs = (n: bigint): bigint => (n < ZERO ? -n : n);
export function gcd(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b !== ZERO) [a, b] = [b, a % b];
  return a;
}
export function rational(n: bigint | number, d: bigint | number = 1): Rational {
  n = BigInt(n);
  d = BigInt(d);
  if (d === ZERO) throw new RangeError("Zero denominator");
  if (d < ZERO) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return [n / g, d / g];
}
export const add = (a: Rational, b: Rational): Rational =>
  rational(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
export const multiply = (a: Rational, b: Rational): Rational =>
  rational(a[0] * b[0], a[1] * b[1]);
export const divide = (a: Rational, b: Rational): Rational =>
  rational(a[0] * b[1], a[1] * b[0]);
export const negate = (a: Rational): Rational => [-a[0], a[1]];
export function fractionText([n, d]: Rational, latex = false): string {
  if (d === ONE) return String(n);
  return latex ? `${n < ZERO ? "-" : ""}\\frac{${abs(n)}}{${d}}` : `${n}/${d}`;
}
export function numericAnswer(
  value: Rational,
  kind: "integer" | "rational",
): ArithmeticV2Answer {
  return {
    kind,
    exact: kind === "integer" ? [String(value[0])] : value.map(String),
    text: fractionText(value),
    latex: fractionText(value, true),
  };
}

// Canonical decimal integer strings only; bounded before BigInt parsing.
export function readInteger(value: unknown): bigint | null {
  return typeof value === "string" &&
    value.length <= 40 &&
    /^(0|[1-9]\d*|-[1-9]\d*)$/.test(value)
    ? BigInt(value)
    : null;
}
export function readRational(n: unknown, d: unknown): Rational | null {
  const numerator = readInteger(n),
    denominator = readInteger(d);
  if (
    numerator === null ||
    denominator === null ||
    denominator <= ZERO ||
    gcd(numerator, denominator) !== ONE
  )
    return null;
  return [numerator, denominator];
}
export function readNumeric(
  answer: ArithmeticV2Answer,
  kind: "integer" | "rational",
): Rational | null {
  if (
    answer.kind !== kind ||
    answer.exact.length !== (kind === "integer" ? 1 : 2)
  )
    return null;
  const value = readRational(
    answer.exact[0],
    kind === "integer" ? "1" : answer.exact[1],
  );
  return value &&
    answer.text === fractionText(value) &&
    answer.latex === fractionText(value, true)
    ? value
    : null;
}

export const range = (low: number, high: number): number[] =>
  Array.from({ length: high - low + 1 }, (_, i) => low + i);
export const nonzero = (limit: number): number[] =>
  range(-limit, limit).filter((n) => n !== 0);
export function decode(index: number, sizes: readonly number[]): number[] {
  const result = new Array<number>(sizes.length);
  for (let i = sizes.length - 1; i >= 0; i--) {
    result[i] = index % sizes[i];
    index = Math.floor(index / sizes[i]);
  }
  return result;
}
export type Domain = {
  size: number;
  at(index: number): number[];
  contains(parameters: number[]): boolean;
};
export function cartesian(...axes: readonly number[][]): Domain {
  return {
    size: axes.reduce((n, axis) => n * axis.length, 1),
    at: (index) =>
      decode(
        index,
        axes.map((a) => a.length),
      ).map((position, i) => axes[i][position]),
    contains: (p) =>
      p.length === axes.length && p.every((n, i) => axes[i].includes(n)),
  };
}
export const math = (
  text: string,
  latex = text,
  instruction = "계산하시오.",
): ArithmeticV2Prompt => ({ layout: "math", text, latex, instruction });
export const paren = (n: number): string => (n < 0 ? `(${n})` : String(n));

type Family = Pick<
  ArithmeticV2Definition,
  "id" | "grade" | "strand" | "title" | "description" | "rankGroup"
> & {
  labels: string[];
  domain: Domain;
  prompt(parameters: number[]): ArithmeticV2Prompt;
  solve(parameters: number[]): ArithmeticV2Answer;
  check(parameters: number[], answer: ArithmeticV2Answer): boolean;
};
function promptMatches(
  actual: ArithmeticV2Prompt,
  expected: ArithmeticV2Prompt,
): boolean {
  return (
    actual.layout === "math" &&
    expected.layout === "math" &&
    Object.keys(actual).every((k) =>
      ["layout", "text", "latex", "instruction"].includes(k),
    ) &&
    actual.text === expected.text &&
    actual.latex === expected.latex &&
    actual.instruction === expected.instruction
  );
}
/** Verification shares display formatting only, never the generator or its solver. */
export function family(spec: Family): ArithmeticV2Definition {
  const { id, grade, strand, title, description, labels, domain, rankGroup } =
    spec;
  return {
    id,
    grade,
    strand,
    title,
    description,
    labels,
    rankGroup,
    domainSize: domain.size,
    problemAt(index): ArithmeticV2Candidate {
      if (!Number.isSafeInteger(index) || index < 0 || index >= domain.size)
        throw new RangeError(`${id}: invalid index`);
      const parameters = domain.at(index);
      return {
        parameters,
        prompt: spec.prompt(parameters),
        answer: spec.solve(parameters),
      };
    },
    verify(candidate): boolean {
      try {
        if (
          !candidate ||
          !Array.isArray(candidate.parameters) ||
          !candidate.parameters.every(
            (p) => Number.isSafeInteger(p) && !Object.is(p, -0),
          ) ||
          !domain.contains(candidate.parameters) ||
          !candidate.prompt ||
          !candidate.answer ||
          !Array.isArray(candidate.answer.exact) ||
          candidate.answer.exact.length > 30 ||
          !candidate.answer.exact.every(
            (x) => typeof x === "string" && x.length <= 40,
          ) ||
          !promptMatches(candidate.prompt, spec.prompt(candidate.parameters))
        )
          return false;
        return spec.check(candidate.parameters, candidate.answer);
      } catch {
        return false;
      }
    },
  };
}
