import { ArithmeticV2EngineError } from "../../errors";
import type {
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
  ArithmeticV2Definition,
  ArithmeticV2Prompt,
} from "../../types";

/** Family-local normal forms: rational n/d; surd [n,r,d] = n√r/d;
 * polynomial [a,1,n,d] = a + (n/d)π. All denominators positive,
 * coefficients reduced, r squarefree > 1; rational values never use surd.
 * Exact values are unitless; prompt blanks and answer displays carry units. */
export type Value = { n: number; d: number; r: number; pi: boolean; a: number };
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
export function value(n: number, d = 1, r = 1, pi = false, a = 0): Value {
  for (let k = 2; k * k <= r; k++)
    while (r % (k * k) === 0) {
      n *= k;
      r /= k * k;
    }
  const g = gcd(n, d);
  return { n: n / g, d: d / g, r, pi, a };
}
export const rational = (n: number, d = 1) => value(n, d);
export const radical = (n: number, r: number, d = 1) => value(n, d, r);
export const piValue = (n: number, d = 1, a = 0) => value(n, d, 1, true, a);
export function answer(v: Value, unit = ""): ArithmeticV2Answer {
  const symbol = v.pi ? "π" : v.r > 1 ? `√${v.r}` : "";
  const latexSymbol = v.pi ? "\\pi" : v.r > 1 ? `\\sqrt{${v.r}}` : "";
  const n = symbol && v.n === 1 ? "" : String(v.n);
  const term = `${n}${symbol}`,
    tex = `${n}${latexSymbol}`;
  const prefix = v.a ? `${v.a}+` : "";
  const textUnit = unit === "°" ? "°" : unit ? ` ${unit}` : "";
  const latexUnit =
    unit === "°"
      ? "^{\\circ}"
      : unit === "개"
        ? "\\,\\text{개}"
        : unit
          ? `\\,\\mathrm{cm}${unit === "cm²" ? "^{2}" : unit === "cm³" ? "^{3}" : ""}`
          : "";
  return {
    kind: v.pi
      ? "polynomial"
      : v.r > 1
        ? "surd"
        : v.d === 1
          ? "integer"
          : "rational",
    exact: (v.pi
      ? [v.a, 1, v.n, v.d]
      : v.r > 1
        ? [v.n, v.r, v.d]
        : v.d === 1
          ? [v.n]
          : [v.n, v.d]
    ).map(String),
    text: prefix + (v.d === 1 ? term : `${term}/${v.d}`) + textUnit,
    latex: prefix + (v.d === 1 ? tex : `\\frac{${tex}}{${v.d}}`) + latexUnit,
  };
}
/** Decode and validate canonical syntax without the generator's reduction routine. */
function read(a: ArithmeticV2Answer, unit: string): Value | null {
  if (
    !a ||
    !Array.isArray(a.exact) ||
    !a.exact.every((s) => typeof s === "string" && /^(0|[1-9][0-9]*)$/.test(s))
  )
    return null;
  const xs = a.exact.map(Number);
  if (!xs.every(Number.isSafeInteger)) return null;
  let v: Value;
  if (a.kind === "integer" && xs.length === 1)
    v = { n: xs[0], d: 1, r: 1, pi: false, a: 0 };
  else if (a.kind === "rational" && xs.length === 2 && xs[1] > 1)
    v = { n: xs[0], d: xs[1], r: 1, pi: false, a: 0 };
  else if (a.kind === "surd" && xs.length === 3 && xs[1] > 1)
    v = { n: xs[0], d: xs[2], r: xs[1], pi: false, a: 0 };
  else if (a.kind === "polynomial" && xs.length === 4 && xs[1] === 1)
    v = { n: xs[2], d: xs[3], r: 1, pi: true, a: xs[0] };
  else return null;
  if (v.n < 0 || (v.n === 0 && a.kind !== "integer") || v.d <= 0 || v.r > 10000)
    return null;
  for (let divisor = 2; divisor <= Math.min(v.n, v.d); divisor++)
    if (v.n % divisor === 0 && v.d % divisor === 0) return null;
  for (let divisor = 2; divisor * divisor <= v.r; divisor++)
    if (v.r % (divisor * divisor) === 0) return null;
  const canonical = answer(v, unit);
  return a.text === canonical.text && a.latex === canonical.latex ? v : null;
}
export const eq = (v: Value, numerator: number, denominator = 1) =>
  !v.pi && !v.a && v.r === 1 && v.n * denominator === numerator * v.d;
export const eqPi = (
  v: Value,
  numerator: number,
  denominator = 1,
  constant = 0,
) =>
  v.pi &&
  v.r === 1 &&
  v.a === constant &&
  v.n * denominator === numerator * v.d;
export const squared = (v: Value, numerator: number, denominator = 1) =>
  !v.pi && !v.a && v.n * v.n * v.r * denominator === numerator * v.d * v.d;
export const range = (start: number, end: number, step = 1) =>
  Array.from(
    { length: Math.floor((end - start) / step) + 1 },
    (_, i) => start + i * step,
  );
export const cross = (...lists: number[][]): number[][] =>
  lists.reduce<number[][]>(
    (rows, list) => rows.flatMap((row) => list.map((n) => [...row, n])),
    [[]],
  );
export type Presentation = {
  text: string;
  instruction: string;
  unit: string;
  svg?: () => string;
};
export type Family = {
  id: string;
  grade: "중1" | "중3";
  title: string;
  domain: number[][];
  present(p: number[]): Presentation;
  solve(p: number[]): Value;
  check(p: number[], v: Value): boolean;
};
export const figureId = (id: string, p: number[]) => `gm-${id}-${p.join("-")}`;
export function buildFamily(
  f: Family,
  figures: Record<string, string>,
): ArithmeticV2Definition {
  const parameters = new Map(f.domain.map((p) => [p.join(","), p]));
  if (parameters.size !== f.domain.length)
    throw new Error(`Duplicate domain: ${f.id}`);
  const prompt = (p: number[]): ArithmeticV2Prompt => {
    const q = f.present(p);
    return {
      layout: "math",
      text: q.text,
      latex: `\\text{${q.text} ${q.instruction}}`,
      instruction: q.instruction,
      ...(q.svg ? { figureId: figureId(f.id, p) } : {}),
      answerUnit: q.unit,
    };
  };
  for (const p of f.domain) {
    if (!f.present(p).svg) continue;
    const id = figureId(f.id, p);
    if (id.length > 64 || Object.hasOwn(figures, id))
      throw new Error(`Invalid figure id ${id}`);
    // No eager SVG construction and no unbounded SVG cache. The root packs selected slots.
    Object.defineProperty(figures, id, {
      enumerable: true,
      get: () => f.present(p).svg!(),
    });
  }
  return {
    id: f.id,
    grade: f.grade,
    strand: "도형",
    title: f.title,
    description: `${f.title}. 주어진 관계와 치수로 직접 계산합니다. π와 근호는 정확한 값으로 씁니다.`,
    labels: ["도형 연산", f.grade],
    rankGroup: f.id,
    domainSize: f.domain.length,
    problemAt(index) {
      if (!Number.isSafeInteger(index) || index < 0 || index >= f.domain.length)
        throw new ArithmeticV2EngineError("operand");
      const p = [...f.domain[index]];
      return {
        parameters: p,
        prompt: prompt(p),
        answer: answer(f.solve(p), f.present(p).unit),
      };
    },
    verify(candidate: ArithmeticV2Candidate) {
      try {
        if (
          !candidate ||
          !Array.isArray(candidate.parameters) ||
          !candidate.parameters.every(
            (n) => Number.isSafeInteger(n) && !Object.is(n, -0),
          )
        )
          return false;
        const p = parameters.get(candidate.parameters.join(","));
        if (!p || p.length !== candidate.parameters.length) return false;
        const v = read(candidate.answer, f.present(p).unit);
        if (!v || !f.check(p, v)) return false;
        const actual = candidate.prompt,
          expected = prompt(p);
        return (
          actual?.layout === "math" &&
          expected.layout === "math" &&
          Object.keys(actual).length === Object.keys(expected).length &&
          actual.text === expected.text &&
          actual.latex === expected.latex &&
          actual.instruction === expected.instruction &&
          actual.figureId === expected.figureId &&
          actual.answerUnit === expected.answerUnit
        );
      } catch {
        return false;
      }
    },
  };
}
