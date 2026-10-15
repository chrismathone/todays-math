import type {
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
  ArithmeticV2Definition,
  ArithmeticV2Prompt,
} from "../../types";
import { answer, type Value } from "../geometryMeasure/core";
export {
  answer,
  cross,
  radical,
  range,
  rational,
} from "../geometryMeasure/core";
export type { Value } from "../geometryMeasure/core";

type Spec = {
  id: string;
  title: string;
  domain: number[][];
  prompt(p: number[]): ArithmeticV2Prompt;
  solve(p: number[]): Value;
  check(p: number[], v: Value): boolean;
  unit?: string;
};
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
export const fractions = (proper = true): number[][] =>
  Array.from({ length: 12 }, (_, i) => i + 1).flatMap((d) =>
    Array.from({ length: proper ? d - 1 : 12 }, (_, i) => i + 1)
      .filter((n) => gcd(n, d) === 1)
      .map((n) => [n, d]),
  );

/** Existing geometry normal forms: integer [n], rational [n,d], surd [n,r,d].
 * r is squarefree >1, d positive, gcd(n,d)=1. Zero is integer only.
 * Signed rationals support explicit square-value subtraction; geometry checks
 * separately require positive lengths/ratios, so squaring cannot admit -sqrt. */
export function readValue(a: ArithmeticV2Answer, unit: string): Value | null {
  if (
    !a ||
    !Array.isArray(a.exact) ||
    a.exact.length > 3 ||
    Object.keys(a).some((k) => !["kind", "exact", "text", "latex"].includes(k))
  )
    return null;
  if (
    !Array.from(a.exact).every(
      (s) =>
        typeof s === "string" &&
        s.length <= 40 &&
        /^(0|-?[1-9][0-9]*)$/.test(s),
    )
  )
    return null;
  const xs = a.exact.map(Number);
  if (!xs.every(Number.isSafeInteger)) return null;
  let n: number, d: number, r: number;
  if (a.kind === "integer" && xs.length === 1) {
    [n] = xs;
    d = r = 1;
  } else if (a.kind === "rational" && xs.length === 2) {
    [n, d] = xs;
    r = 1;
    if (d <= 1) return null;
  } else if (a.kind === "surd" && xs.length === 3) {
    [n, r, d] = xs;
    if (r <= 1 || r > 10000) return null;
  } else return null;
  if (d <= 0 || gcd(n, d) !== 1 || (n === 0 && a.kind !== "integer"))
    return null;
  for (let k = 2; k * k <= r; k++) if (r % (k * k) === 0) return null;
  const v = { n, d, r, pi: false, a: 0 },
    display = answer(v, unit);
  return a.text === display.text && a.latex === display.latex ? v : null;
}
export function define(spec: Spec): ArithmeticV2Definition {
  const keys = new Set(spec.domain.map((p) => p.join(",")));
  if (keys.size !== spec.domain.length)
    throw Error(`Duplicate parameters: ${spec.id}`);
  return {
    id: spec.id,
    grade: "중3",
    strand: "도형",
    title: spec.title,
    description: `${spec.title} 유형을 정확한 값으로 계산합니다.`,
    labels: ["삼각비", spec.title],
    rankGroup: spec.id,
    curriculum: { semester: 2, unit: "삼각비" },
    domainSize: spec.domain.length,
    problemAt(index) {
      if (
        !Number.isSafeInteger(index) ||
        index < 0 ||
        index >= spec.domain.length
      )
        throw new RangeError(spec.id);
      const parameters = [...spec.domain[index]];
      return {
        parameters,
        prompt: spec.prompt(parameters),
        answer: answer(spec.solve(parameters), spec.unit ?? ""),
      };
    },
    verify(candidate: ArithmeticV2Candidate) {
      try {
        if (
          !candidate ||
          !Array.isArray(candidate.parameters) ||
          candidate.parameters.length > 6 ||
          !Array.from(candidate.parameters).every(
            (p) => Number.isSafeInteger(p) && !Object.is(p, -0),
          ) ||
          !keys.has(candidate.parameters.join(","))
        )
          return false;
        const expected = spec.prompt(candidate.parameters),
          actual = candidate.prompt;
        if (
          !actual ||
          actual.layout !== "math" ||
          expected.layout !== "math" ||
          Object.keys(actual).length !== Object.keys(expected).length ||
          !Object.entries(expected).every(
            ([k, v]) => (actual as Record<string, unknown>)[k] === v,
          )
        )
          return false;
        const v = readValue(candidate.answer, spec.unit ?? "");
        return Boolean(v && spec.check(candidate.parameters, v));
      } catch {
        return false;
      }
    },
  };
}
/** Text is the actual geometry presentation. Each math fragment is authored;
 * latex is separately valid, complete identity math, with no dollars in text. */
export function prompt(
  text: string,
  latex: string,
  instruction: string,
  unit = "",
): ArithmeticV2Prompt {
  return { layout: "math", text, latex, instruction, answerUnit: unit };
}
export const eq = (v: Value, n: number, d = 1) =>
  v.r === 1 && BigInt(v.n) * BigInt(d) === BigInt(n) * BigInt(v.d);
export const positiveSquare = (v: Value, n: number, d = 1) =>
  v.n > 0 &&
  BigInt(v.n) * BigInt(v.n) * BigInt(v.r) * BigInt(d) ===
    BigInt(n) * BigInt(v.d) * BigInt(v.d);
export const name = (m: number) => ["\\sin", "\\cos", "\\tan"][m];
export const fraction = (n: number, d: number) =>
  d === 1 ? String(n) : `\\frac{${n}}{${d}}`;
export const cm = (n: number) => `${n}\\,\\mathrm{cm}`;
