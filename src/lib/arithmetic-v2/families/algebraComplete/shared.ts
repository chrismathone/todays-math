import type { ArithmeticV2Answer, ArithmeticV2Definition } from "../../types";
import { family, type Domain, range, readInteger } from "../middle/exact";
export * from "../middle/exact";

/** Explicit finite tuples, in authored loop order. No random retry/count cap. */
export function tuples(input: readonly number[][]): Domain {
  const rows = input.map((p) => [...p]);
  const keys = new Set(rows.map((p) => p.join(",")));
  if (keys.size !== rows.length) throw new Error("Duplicate domain tuple");
  return {
    size: rows.length,
    at: (i) => [...rows[i]],
    contains: (p) => keys.has(p.join(",")),
  };
}
export function filtered(
  domain: Domain,
  predicate: (p: number[]) => boolean,
): Domain {
  return tuples(
    range(0, domain.size - 1)
      .map(domain.at)
      .filter(predicate),
  );
}
type Spec = Parameters<typeof family>[0];
export function define(
  spec: Omit<Spec, "description" | "labels" | "rankGroup"> & {
    unit: string;
    description?: string;
  },
): ArithmeticV2Definition {
  const { unit, ...rest } = spec;
  const result = family({
    ...rest,
    description: rest.description ?? `${rest.title} 유형을 연습합니다.`,
    labels: [unit, rest.title],
    rankGroup: rest.id,
  });
  return {
    ...result,
    curriculum: { semester: 1, unit },
    verify: (candidate) =>
      Boolean(candidate?.answer) &&
      Object.keys(candidate.answer).every((k) =>
        ["kind", "exact", "text", "latex"].includes(k),
      ) &&
      result.verify(candidate),
  };
}

/** Small structural fields only. BigInt rational readers handle numerical values. */
export function small(
  value: unknown,
  low: number,
  high: number,
): number | null {
  const n = readInteger(value);
  return n !== null && n >= BigInt(low) && n <= BigInt(high) ? Number(n) : null;
}
export const integer = (n: number | bigint): ArithmeticV2Answer => ({
  kind: "integer",
  exact: [String(n)],
  text: String(n),
  latex: String(n),
});
export const sameDisplay = (
  a: ArithmeticV2Answer,
  text: string,
  latex = text,
) => a.text === text && a.latex === latex;
export const power = (base: string, n: number, latex = false) =>
  n === 0 ? "" : n === 1 ? base : latex ? `${base}^{${n}}` : `${base}^${n}`;

/** Integer bivariate polynomial: descending lexicographic [x degree,y degree,coefficient]. */
export type Term = readonly [number, number, number];
export function expression(terms: readonly Term[], latex = false): string {
  let output = "";
  for (const [x, y, coefficient] of terms) {
    if (!coefficient) continue;
    const variable = power("x", x, latex) + power("y", y, latex);
    const magnitude = Math.abs(coefficient);
    const body = `${variable && magnitude === 1 ? "" : magnitude}${variable}`;
    output += `${output ? (coefficient < 0 ? " - " : " + ") : coefficient < 0 ? "-" : ""}${body}`;
  }
  return output || "0";
}
export const linear = (a: number, b: number, latex = false) =>
  expression(
    [
      [1, 0, a],
      [0, 0, b],
    ],
    latex,
  );
export function polynomial(terms: readonly Term[]): ArithmeticV2Answer {
  const cleaned = terms
    .filter((t) => t[2] !== 0)
    .sort(([x, y], [u, v]) => u - x || v - y);
  return {
    kind: "polynomial",
    exact: cleaned.flatMap((t) => t.map(String)),
    text: expression(cleaned),
    latex: expression(cleaned, true),
  };
}
export function readPolynomial(a: ArithmeticV2Answer): Term[] | null {
  if (a.kind !== "polynomial" || a.exact.length % 3) return null;
  const terms: Term[] = [];
  let previous = 1000;
  for (let i = 0; i < a.exact.length; i += 3) {
    const x = small(a.exact[i], 0, 18),
      y = small(a.exact[i + 1], 0, 18),
      c = small(a.exact[i + 2], -1000000, 1000000);
    if (x === null || y === null || c === null || !c || x * 20 + y >= previous)
      return null;
    previous = x * 20 + y;
    terms.push([x, y, c]);
  }
  return sameDisplay(a, expression(terms), expression(terms, true))
    ? terms
    : null;
}
export function coefficients(terms: readonly Term[]): Map<string, bigint> {
  return new Map(
    terms.filter((t) => t[2]).map(([x, y, c]) => [`${x},${y}`, BigInt(c)]),
  );
}
export function sameCoefficients(
  actual: Map<string, bigint>,
  expected: Map<string, bigint>,
): boolean {
  for (const [key, value] of actual)
    if (value !== (expected.get(key) ?? BigInt(0))) return false;
  for (const [key, value] of expected)
    if (value !== (actual.get(key) ?? BigInt(0))) return false;
  return true;
}
/** Independent polynomial convolution, used only by verification. */
export function convolution(
  a: Map<string, bigint>,
  b: Map<string, bigint>,
): Map<string, bigint> {
  const output = new Map<string, bigint>();
  for (const [ka, va] of a)
    for (const [kb, vb] of b) {
      const [x, y] = ka.split(",").map(Number),
        [u, v] = kb.split(",").map(Number);
      const key = `${x + u},${y + v}`;
      output.set(key, (output.get(key) ?? BigInt(0)) + va * vb);
    }
  return output;
}
