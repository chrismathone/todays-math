import type {
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
  ArithmeticV2Definition,
  ArithmeticV2Prompt,
} from "../../types";
import { tokenizeMath } from "../../../math/segments";

/** Only explicitly authored formula fragments receive inline delimiters. */
export const m = (tex: string | number): string => `$${tex}$`;
function fallbackLatex(text: string): string {
  return tokenizeMath(text)
    .map((part) =>
      part.type === "text"
        ? `\\text{${part.value.replace(/[\\{}%_$#&]/g, (c) => (c === "\\" ? "\\textbackslash{}" : `\\${c}`))}}`
        : part.value,
    )
    .join("");
}

export type Q = [number, number];
export type Root = { n: number; r: number; d: number };
export type Value = Q | Q[] | Root;
export type Shape = "scalar" | "line" | "quadratic";
export const gcd = (a: number, b: number): number =>
  b ? gcd(b, a % b) : Math.abs(a);
export function q(n: number, d = 1): Q {
  if (![n, d].every(Number.isSafeInteger) || !d)
    throw new Error("Invalid exact rational");
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return [n / g || 0, d / g];
}
export const add = (a: Q, b: Q): Q => q(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
export const mul = (a: Q, b: Q): Q => q(a[0] * b[0], a[1] * b[1]);
export const eq = (a: Q, b: Q): boolean => a[0] * b[1] === b[0] * a[1];
export const scalar = (v: Value): Q => v as Q;
export const coefficients = (v: Value): Q[] => v as Q[];
export const range = (lo: number, hi: number): number[] =>
  Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
export const nz = (lo: number, hi: number): number[] =>
  range(lo, hi).filter(Boolean);
export const rows = (...axes: number[][]): number[][] =>
  axes.reduce<number[][]>(
    (a, axis) => a.flatMap((p) => axis.map((n) => [...p, n])),
    [[]],
  );
export const fmt = ([n, d]: Q, tex = false): string =>
  d === 1
    ? String(n)
    : tex
      ? `${n < 0 ? "-" : ""}\\frac{${Math.abs(n)}}{${d}}`
      : `${n}/${d}`;
export function polynomial(values: readonly Q[], tex = false): string {
  const terms = values.flatMap(([n, d], i) => {
    if (!n) return [];
    const degree = values.length - 1 - i;
    const body = degree && Math.abs(n) === d ? "" : fmt(q(Math.abs(n), d), tex);
    return [
      {
        negative: n < 0,
        text:
          body +
          (degree === 2 ? (tex ? "x^{2}" : "x²") : degree === 1 ? "x" : ""),
      },
    ];
  });
  return (
    terms
      .map(
        (t, i) => `${t.negative ? (tex ? "-" : "−") : i ? "+" : ""}${t.text}`,
      )
      .join("") || "0"
  );
}
export function root(n: number, r: number, d = 1): Value {
  if (![n, r, d].every(Number.isSafeInteger) || r < 0 || d <= 0)
    throw new Error("Invalid radical");
  if (!n || !r) return q(0);
  for (let k = 2; k * k <= r; k++)
    while (r % (k * k) === 0) {
      n *= k;
      r /= k * k;
    }
  const reduced = q(n, d);
  return r === 1 ? reduced : { n: reduced[0], r, d: reduced[1] };
}
export function answer(
  value: Value,
  shape: Shape = "scalar",
): ArithmeticV2Answer {
  if (shape !== "scalar") {
    const c = (value as Q[]).map(([n, d]) => q(n, d));
    if (c.length !== (shape === "line" ? 2 : 3) || !c[0][0])
      throw new Error("Invalid polynomial degree");
    return {
      kind: "polynomial",
      exact: c.flatMap((v) => v.map(String)),
      text: `y=${polynomial(c)}`,
      latex: `y=${polynomial(c, true)}`,
    };
  }
  if (!Array.isArray(value)) {
    const normalized = root(value.n, value.r, value.d);
    if (Array.isArray(normalized)) return answer(normalized);
    const { n, r, d } = normalized;
    const term = `${Math.abs(n) === 1 ? "" : Math.abs(n)}√${r}`;
    const latex = `${Math.abs(n) === 1 ? "" : Math.abs(n)}\\sqrt{${r}}`;
    return {
      kind: "surd",
      exact: [String(n), String(r), String(d)],
      text: `${n < 0 ? "-" : ""}${term}${d === 1 ? "" : `/${d}`}`,
      latex: `${n < 0 ? "-" : ""}${d === 1 ? latex : `\\frac{${latex}}{${d}}`}`,
    };
  }
  const v = q(...(value as [number, number]));
  return {
    kind: v[1] === 1 ? "integer" : "rational",
    exact: (v[1] === 1 ? [v[0]] : v).map(String),
    text: fmt(v),
    latex: fmt(v, true),
  };
}
const same = (a: object, b: object) =>
  JSON.stringify(Object.entries(a).sort(([x], [y]) => x.localeCompare(y))) ===
  JSON.stringify(Object.entries(b).sort(([x], [y]) => x.localeCompare(y)));
function read(a: ArithmeticV2Answer, shape: Shape): Value | undefined {
  if (
    !a ||
    !Array.isArray(a.exact) ||
    a.exact.length > 6 ||
    !a.exact.every(
      (s) => typeof s === "string" && /^(0|-?[1-9]\d{0,7})$/.test(s),
    )
  )
    return;
  const ns = a.exact.map(Number);
  if (
    !ns.every(Number.isSafeInteger) ||
    ns.some((n) => Math.abs(n) > 1_000_000)
  )
    return;
  let value: Value;
  if (shape !== "scalar") {
    if (a.kind !== "polynomial" || ns.length !== (shape === "line" ? 4 : 6))
      return;
    value = Array.from({ length: ns.length / 2 }, (_, i) =>
      q(ns[2 * i], ns[2 * i + 1]),
    );
  } else if (a.kind === "integer" && ns.length === 1) value = q(ns[0]);
  else if (a.kind === "rational" && ns.length === 2) value = q(ns[0], ns[1]);
  else if (a.kind === "surd" && ns.length === 3 && ns[1] > 1 && ns[2] > 0)
    value = root(ns[0], ns[1], ns[2]);
  else return;
  return same(a, answer(value, shape)) ? value : undefined;
}
export type Spec = {
  id: string;
  grade: "중1" | "중2" | "중3";
  semester: 1 | 2;
  unit: string;
  title: string;
  strand: "함수" | "자료·확률";
  domain: number[][];
  shape?: Shape;
  view(p: number[]): { text: string; instruction: string; latex?: string };
  solve(p: number[]): Value;
  /** Independent defining relation / enumerated sample-space check. */
  check(p: number[], value: Value): boolean;
};
export function compile(
  specs: readonly Spec[],
): readonly ArithmeticV2Definition[] {
  return specs.map((s) => {
    const membership = new Set(s.domain.map((p) => p.join(",")));
    if (membership.size !== s.domain.length)
      throw new Error(`Duplicate parameters ${s.id}`);
    const prompt = (p: number[]): ArithmeticV2Prompt => {
      const view = s.view(p);
      return {
        layout: "math",
        text: view.text,
        latex: view.latex ?? fallbackLatex(view.text),
        instruction: view.instruction,
      };
    };
    return {
      id: s.id,
      grade: s.grade,
      strand: s.strand,
      title: s.title,
      curriculum: { semester: s.semester, unit: s.unit },
      description: `${s.unit} — ${s.title}의 직접 계산`,
      labels: [s.unit, "직접 계산"],
      rankGroup: s.id,
      domainSize: s.domain.length,
      problemAt(index: number): ArithmeticV2Candidate {
        if (
          !Number.isSafeInteger(index) ||
          index < 0 ||
          index >= s.domain.length
        )
          throw new RangeError(`${s.id}: invalid index`);
        const p = [...s.domain[index]];
        return {
          parameters: p,
          prompt: prompt(p),
          answer: answer(s.solve(p), s.shape),
        };
      },
      verify(candidate: ArithmeticV2Candidate): boolean {
        try {
          if (
            !candidate ||
            !Array.isArray(candidate.parameters) ||
            candidate.parameters.length > 12 ||
            !Array.from(candidate.parameters).every(
              (n) => Number.isSafeInteger(n) && !Object.is(n, -0),
            ) ||
            !membership.has(candidate.parameters.join(",")) ||
            !candidate.prompt ||
            !same(candidate.prompt, prompt(candidate.parameters))
          )
            return false;
          const parsed = read(candidate.answer, s.shape ?? "scalar");
          return parsed !== undefined && s.check(candidate.parameters, parsed);
        } catch {
          return false;
        }
      },
    };
  });
}
