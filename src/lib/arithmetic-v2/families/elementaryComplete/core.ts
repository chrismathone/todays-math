import type {
  ArithmeticGrade,
  ArithmeticStrand,
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
  ArithmeticV2Definition,
  ArithmeticV2Prompt,
} from "../../types";
import {
  decimalAnswer,
  decimalText,
  fractionDisplay,
  gcd,
  grid,
  integerAnswer,
  rationalAnswer,
  type Domain,
} from "../elementary/common";
export {
  decimalAnswer,
  decimalText,
  fractionDisplay,
  gcd,
  grid,
  integerAnswer,
  rationalAnswer,
};
export type { Domain };

export const range = (a: number, b: number) =>
  Array.from({ length: b - a + 1 }, (_, i) => a + i);
export const product = (...axes: readonly number[][]): number[][] =>
  axes.reduce<number[][]>(
    (rows, axis) => rows.flatMap((row) => axis.map((n) => [...row, n])),
    [[]],
  );
/** Small parameter tuples only; never store rendered questions/answers. */
export function table(rows: number[][]): Domain {
  const keys = new Set(rows.map((p) => p.join(",")));
  if (keys.size !== rows.length)
    throw new Error("Duplicate complete-family parameters");
  return {
    size: rows.length,
    at: (i) => [...rows[i]],
    has: (p) => keys.has(p.join(",")),
  };
}
export const math = (
  text: string,
  latex: string,
  instruction: string,
  answerUnit?: string,
): ArithmeticV2Prompt => ({
  layout: "math",
  text,
  latex,
  instruction,
  ...(answerUnit ? { answerUnit } : {}),
});
export const frac = (n: number, d: number) => `\\frac{${n}}{${d}}`;
export const unit = (n: number | string, u: string) =>
  `${n}\\,\\${/^[A-Za-z]+$/.test(u) ? "mathrm" : "text"}{${u}}`;
export const blank = "\\square";
export const textMath = (
  text: string,
  instruction: string,
  answerUnit?: string,
) => math(text, `\\text{${text}}`, instruction, answerUnit);

export interface CompleteSpec {
  key: string;
  grade: ArithmeticGrade;
  semester: 1 | 2;
  unit: string;
  strand: ArithmeticStrand;
  title: string;
  description: string;
  domain: Domain;
  prompt(p: number[]): ArithmeticV2Prompt;
  calculate(p: number[]): ArithmeticV2Answer;
  /** Independent relation on a validated canonical exact value. */
  holds(p: number[], n: bigint, d: bigint): boolean;
  kind?: "integer" | "rational" | "decimal";
  display?: (
    p: number[],
    n: number,
    d: number,
  ) => { text: string; latex: string };
}
function keys(
  value: unknown,
  names: string[],
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === names.length &&
    names.every((name) => Object.hasOwn(value, name))
  );
}
function equalObject(a: unknown, b: object): boolean {
  return (
    keys(a, Object.keys(b)) &&
    Object.entries(b).every(([key, value]) => a[key] === value)
  );
}
function naturalString(s: unknown): number | null {
  if (typeof s !== "string" || !/^(?:0|[1-9]\d{0,15})$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}
export function complete(spec: CompleteSpec): ArithmeticV2Definition {
  const kind = spec.kind ?? "integer";
  return {
    id: `ec-${spec.key}-v1`,
    grade: spec.grade,
    strand: spec.strand,
    title: spec.title,
    description: spec.description,
    curriculum: { semester: spec.semester, unit: spec.unit },
    labels: ["직접 계산", spec.unit],
    rankGroup: `elementary-complete-${spec.key}`,
    domainSize: spec.domain.size,
    problemAt(index) {
      if (
        !Number.isSafeInteger(index) ||
        Object.is(index, -0) ||
        index < 0 ||
        index >= spec.domain.size
      )
        throw new RangeError(`${spec.key}: invalid index`);
      const parameters = spec.domain.at(index);
      return {
        parameters,
        prompt: spec.prompt(parameters),
        answer: spec.calculate(parameters),
      };
    },
    verify(candidate: ArithmeticV2Candidate): boolean {
      try {
        if (
          !keys(candidate, ["parameters", "prompt", "answer"]) ||
          !Array.isArray(candidate.parameters) ||
          candidate.parameters.length === 0 ||
          Object.keys(candidate.parameters).length !==
            candidate.parameters.length ||
          !candidate.parameters.every(
            (n: unknown) =>
              typeof n === "number" &&
              Number.isSafeInteger(n) &&
              !Object.is(n, -0),
          ) ||
          !spec.domain.has(candidate.parameters) ||
          !equalObject(candidate.prompt, spec.prompt(candidate.parameters)) ||
          !keys(candidate.answer, ["kind", "exact", "text", "latex"])
        )
          return false;
        const answer = candidate.answer;
        if (
          answer.kind !== kind ||
          !Array.isArray(answer.exact) ||
          answer.exact.length !== (kind === "integer" ? 1 : 2) ||
          Object.keys(answer.exact).length !== answer.exact.length
        )
          return false;
        const n = naturalString(answer.exact[0]);
        const second = kind === "integer" ? 1 : naturalString(answer.exact[1]);
        if (n === null || second === null) return false;
        if (kind === "rational" && (second < 1 || gcd(n, second) !== 1))
          return false;
        if (kind === "decimal" && (second > 4 || (second > 0 && n % 10 === 0)))
          return false;
        const d = kind === "decimal" ? 10 ** second : second;
        if (!spec.holds(candidate.parameters, BigInt(n), BigInt(d)))
          return false;
        const display =
          spec.display?.(candidate.parameters, n, d) ??
          (kind === "rational"
            ? fractionDisplay(n, d)
            : kind === "decimal"
              ? { text: decimalText(n, second), latex: decimalText(n, second) }
              : { text: String(n), latex: String(n) });
        return answer.text === display.text && answer.latex === display.latex;
      } catch {
        return false;
      }
    },
  };
}

export function representedFraction(
  n: number,
  d: number,
  mixed: boolean,
): ArithmeticV2Answer {
  return {
    ...rationalAnswer(n, d),
    ...(mixed
      ? fractionDisplay(n, d)
      : { text: `${n}/${d}`, latex: frac(n, d) }),
  };
}

/** Enforce a requested denominator/representation separately from reduced exact. */
export const fractionForm =
  (denominator: (p: number[]) => number, mixed: boolean) =>
  (p: number[], n: number, d: number) => {
    const requested = denominator(p),
      numerator = (n * requested) / d;
    return mixed
      ? fractionDisplay(numerator, requested)
      : {
          text: `${numerator}/${requested}`,
          latex: frac(numerator, requested),
        };
  };
